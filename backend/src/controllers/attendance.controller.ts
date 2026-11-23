import { Request, Response } from 'express';
import { db } from '../services/store';
import { AttendanceRecord, UserRole } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { AuditService } from '../services/audit.service';
import { AuthenticatedRequest } from '../middleware/auth.middleware';

type Actor = { id: string; name: string; role: UserRole; teamId?: string };

const resolveActor = (req: AuthenticatedRequest, bodyActor?: any): Actor | null => {
  const candidate = req.user || bodyActor;
  if (!candidate || !candidate.id) {
    return null;
  }
  return {
    id: String(candidate.id),
    name: String(candidate.name || 'Unknown'),
    role: candidate.role as UserRole,
    teamId: candidate.teamId,
  };
};

const parseTimeToMinutes = (value: string | null | undefined): number | null => {
  if (!value) {
    return null;
  }
  const raw = String(value).trim();
  const twelveHour = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (twelveHour) {
    let hour = Number(twelveHour[1]) % 12;
    if (twelveHour[3].toUpperCase() === 'PM') hour += 12;
    return hour * 60 + Number(twelveHour[2]);
  }
  const twentyFourHour = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (twentyFourHour) {
    return Number(twentyFourHour[1]) * 60 + Number(twentyFourHour[2]);
  }
  const parsed = new Date(raw);
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.getHours() * 60 + parsed.getMinutes();
  }
  return null;
};

export const getAttendance = (req: Request, res: Response) => {
  const { userId, teamId, date } = req.query;

  let records = [...db.attendanceRecords];
  if (userId) {
    records = records.filter((r) => r.userId === userId);
  }
  if (teamId) {
    records = records.filter((r) => r.teamId === teamId);
  }
  if (date) {
    records = records.filter((r) => r.date === date);
  }

  return successResponse(res, records);
};

export const punchIn = (req: AuthenticatedRequest, res: Response) => {
  const { userId, ipAddress } = req.body;

  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }
  if (!user.teamId) {
    return errorResponse(res, 'User has no team; punch-in rejected', 400);
  }

  const today = new Date().toISOString().split('T')[0];
  const now = new Date();
  const timeNow = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Check if open punch exists
  const existing = db.attendanceRecords.find(
    (r) => r.userId === user.id && r.date === today && !r.punchOutTime
  );

  if (existing) {
    return errorResponse(res, 'User is already punched in for today', 400);
  }

  // Calculate Late status based on system settings
  const [shiftHour, shiftMin] = db.settings.shiftStartTime.split(':').map(Number);
  const shiftStartTimeMinutes = (shiftHour || 9) * 60 + (shiftMin || 0) + db.settings.gracePeriodMinutes;
  const currentMinutes = now.getHours() * 60 + now.getMinutes();
  const isLate = currentMinutes > shiftStartTimeMinutes;

  const newRecord: AttendanceRecord = {
    id: `att-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    teamId: user.teamId,
    date: today,
    punchInTime: timeNow,
    punchOutTime: null,
    workingMinutes: 0,
    status: isLate ? 'LATE' : 'PRESENT',
    isModified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.attendanceRecords.push(newRecord);
  db.save();

  // Audit log punch in
  const currentActor = resolveActor(req, req.body.actor) || {
    id: user.id,
    name: user.name,
    role: user.role,
    teamId: user.teamId,
  };
  AuditService.log(
    'ATTENDANCE_PUNCH_IN',
    'ATTENDANCE',
    currentActor,
    `${user.name} punched in at ${timeNow} (Status: ${newRecord.status})`,
    {
      targetId: newRecord.id,
      targetType: 'ATTENDANCE',
      details: { punchInTime: timeNow, status: newRecord.status, isLate },
      ipAddress: ipAddress || '127.0.0.1',
    }
  );

  return successResponse(res, newRecord, 'Punched in successfully');
};

export const punchOut = (req: AuthenticatedRequest, res: Response) => {
  const { userId, ipAddress } = req.body;

  const user = db.users.find((u) => u.id === userId);
  const today = new Date().toISOString().split('T')[0];
  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const record = db.attendanceRecords.find(
    (r) => r.userId === userId && r.date === today && !r.punchOutTime
  );

  if (!record) {
    return errorResponse(res, 'No active punch-in found for today', 400);
  }

  const punchInMinutes = parseTimeToMinutes(record.punchInTime);
  const punchOutMinutes = parseTimeToMinutes(timeNow);
  const workingMinutes =
    punchInMinutes !== null && punchOutMinutes !== null && punchOutMinutes >= punchInMinutes
      ? punchOutMinutes - punchInMinutes
      : 0;

  record.punchOutTime = timeNow;
  record.workingMinutes = workingMinutes;
  record.updatedAt = new Date().toISOString();
  db.save();

  // Audit log punch out
  const currentActor = resolveActor(req, req.body.actor) || (user
    ? { id: user.id, name: user.name, role: user.role, teamId: user.teamId }
    : { id: record.userId, name: record.userName, role: 'BDE' as UserRole, teamId: record.teamId });
  AuditService.log(
    'ATTENDANCE_PUNCH_OUT',
    'ATTENDANCE',
    currentActor,
    `${record.userName} punched out at ${timeNow} (Duration: ${workingMinutes} mins)`,
    {
      targetId: record.id,
      targetType: 'ATTENDANCE',
      details: { punchOutTime: timeNow, workingMinutes },
      ipAddress: ipAddress || '127.0.0.1',
    }
  );

  return successResponse(res, record, 'Punched out successfully');
};

export const modifyAttendance = (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const body = req.body;
  const revisedStatus = body.revisedStatus ?? body.status;
  const revisedPunchIn = body.revisedPunchIn ?? body.punchInTime;
  const revisedPunchOut = body.revisedPunchOut ?? body.punchOutTime;
  const reason = body.reason;

  if (!reason || !String(reason).trim()) {
    return errorResponse(res, 'Mandatory audit reason is required for attendance adjustments', 400);
  }

  const record = db.attendanceRecords.find((r) => r.id === id);
  if (!record) {
    return errorResponse(res, 'Attendance record not found', 404);
  }

  const currentActor = resolveActor(req, body.actor);
  if (!currentActor) {
    return errorResponse(res, 'Actor identity is required for attendance adjustments', 401);
  }
  if (currentActor.role === 'TEAM_LEAD' && (!currentActor.teamId || record.teamId !== currentActor.teamId)) {
    return errorResponse(res, 'Team leads can only adjust attendance for their own team', 403);
  }
  if (currentActor.role !== 'TEAM_LEAD' && currentActor.role !== 'ADMIN') {
    return errorResponse(res, 'Only admins and team leads can adjust attendance', 403);
  }

  const originalStatus = record.status;
  const originalPunchIn = record.punchInTime;
  const originalPunchOut = record.punchOutTime;

  if (revisedStatus) record.status = revisedStatus;
  if (revisedPunchIn !== undefined) record.punchInTime = revisedPunchIn;
  if (revisedPunchOut !== undefined) record.punchOutTime = revisedPunchOut;

  const inMinutes = parseTimeToMinutes(record.punchInTime);
  const outMinutes = parseTimeToMinutes(record.punchOutTime);
  if (inMinutes !== null && outMinutes !== null && outMinutes >= inMinutes) {
    record.workingMinutes = outMinutes - inMinutes;
  }

  record.isModified = true;
  record.modifiedBy = currentActor.id;
  record.modifiedByName = currentActor.name;
  record.modifiedReason = reason;
  record.updatedAt = new Date().toISOString();
  db.save();

  // Immutable audit log of adjustment
  AuditService.log(
    'ATTENDANCE_MODIFIED',
    'ATTENDANCE',
    currentActor,
    `Adjusted attendance for ${record.userName} on ${record.date}. Reason: ${reason}`,
    {
      targetId: record.id,
      targetType: 'ATTENDANCE',
      details: {
        original: { status: originalStatus, punchIn: originalPunchIn, punchOut: originalPunchOut },
        revised: { status: record.status, punchIn: record.punchInTime, punchOut: record.punchOutTime },
        reason,
      },
    }
  );

  return successResponse(res, record, 'Attendance record revised with audit entry recorded');
};
