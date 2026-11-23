import { Request, Response } from 'express';
import { db } from '../services/store';
import { AttendanceRecord } from '../types';
import { successResponse, errorResponse } from '../utils/response';

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
  const { userId } = req.body;

  const user = db.users.find((u) => u.id === userId);
  if (!user) {
    return errorResponse(res, 'User not found', 404);
  }

  const today = new Date().toISOString().split('T')[0];
  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  // Check if open punch exists
  const existing = db.attendanceRecords.find(
    (r) => r.userId === user.id && r.date === today && !r.punchOutTime
  );

  if (existing) {
    return errorResponse(res, 'User is already punched in for today', 400);
  }

  const newRecord: AttendanceRecord = {
    id: `att-${Date.now()}`,
    userId: user.id,
    userName: user.name,
    teamId: user.teamId || 'team-1',
    date: today,
    punchInTime: timeNow,
    punchOutTime: null,
    workingMinutes: 0,
    status: 'PRESENT',
    isModified: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.attendanceRecords.push(newRecord);
  return successResponse(res, newRecord, 'Punched in successfully');
};

export const punchOut = (req: Request, res: Response) => {
  const { userId } = req.body;

  const today = new Date().toISOString().split('T')[0];
  const timeNow = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const record = db.attendanceRecords.find(
    (r) => r.userId === userId && r.date === today && !r.punchOutTime
  );

  if (!record) {
    return errorResponse(res, 'No active punch-in found for today', 400);
  }

  record.punchOutTime = timeNow;
  record.workingMinutes = 480; // Standard 8 hours for demo
  record.updatedAt = new Date().toISOString();

  return successResponse(res, record, 'Punched out successfully');
};
