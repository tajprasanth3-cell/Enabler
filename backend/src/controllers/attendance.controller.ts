import { Request, Response } from 'express';
import { db } from '../services/store';
import { AttendanceRecord, UserRole } from '../types';
import { successResponse, errorResponse } from '../utils/response';
import { AuditService } from '../services/audit.service';

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

export const punchIn = (req: Request, res: Response) => {
  const { userId, ipAddress, actor } = req.body;

  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return errorResponse(res, 'User not found', 404);
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
    teamId: user.teamId || 'team-1',
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

  // Audit log punch in
  const currentActor = actor || { id: user.id, name: user.name, role: user.role };
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

export const punchOut = (req: Request, res: Response) => {
  const { userId, ipAddress, actor } = req.body;

  const user = db.users.find((u) => u.id === userId);
  const today = new Date().toISOString().split('T')[0];
  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const record = db.attendanceRecords.find(
    (r) => r.userId === userId && r.date === today && !r.punchOutTime
  );

  if (!record) {
    return errorResponse(res, 'No active punch-in found for today', 400);
  }

  record.punchOutTime = timeNow;
  record.workingMinutes = 480; // Standard shift hours
  record.updatedAt = new Date().toISOString();

  // Audit log punch out
  const currentActor = actor || (user ? { id: user.id, name: user.name, role: user.role } : { id: userId, name: record.userName, role: 'BDE' as UserRole });
  AuditService.log(
    'ATTENDANCE_PUNCH_OUT',
    'ATTENDANCE',
    currentActor,
    `${record.userName} punched out at ${timeNow} (Duration: 8 hrs)`,
    {
      targetId: record.id,
      targetType: 'ATTENDANCE',
      details: { punchOutTime: timeNow, workingMinutes: 480 },
      ipAddress: ipAddress || '127.0.0.1',
    }
  );

  return successResponse(res, record, 'Punched out successfully');
};

export const modifyAttendance = (req: Request, res: Response) => {
  const { id } = req.params;
  const { revisedStatus, revisedPunchIn, revisedPunchOut, reason, actor } = req.body;

  if (!reason || !reason.trim()) {
    return errorResponse(res, 'Mandatory audit reason is required for attendance adjustments', 400);
  }

  const record = db.attendanceRecords.find((r) => r.id === id);
  if (!record) {
    return errorResponse(res, 'Attendance record not found', 404);
  }

  const currentActor = actor || { id: 'usr-1', name: 'Vikram Sharma', role: 'ADMIN' as UserRole };
  const originalStatus = record.status;
  const originalPunchIn = record.punchInTime;
  const originalPunchOut = record.punchOutTime;

  if (revisedStatus) record.status = revisedStatus;
  if (revisedPunchIn !== undefined) record.punchInTime = revisedPunchIn;
  if (revisedPunchOut !== undefined) record.punchOutTime = revisedPunchOut;
  record.isModified = true;
  record.modifiedBy = currentActor.id;
  record.modifiedByName = currentActor.name;
  record.modifiedReason = reason;
  record.updatedAt = new Date().toISOString();

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
