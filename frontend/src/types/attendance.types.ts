export type AttendanceStatus =
  | 'PRESENT'
  | 'LATE'
  | 'HALF_DAY'
  | 'ABSENT'
  | 'MISSING_PUNCH_OUT';

export type PunchState = 'PUNCHED_IN' | 'PUNCHED_OUT' | 'NOT_PUNCHED';

export interface AttendanceRecord {
  id: string;
  userId: string;
  userName: string;
  teamId?: string;
  date: string; // YYYY-MM-DD
  punchInTime?: string | null;
  punchOutTime?: string | null;
  workingMinutes: number;
  status: AttendanceStatus;
  earlyDeparture?: boolean;
  isModified: boolean;
  modificationReason?: string | null;
  modifiedById?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AttendanceConfig {
  workdayStartTime: string; // e.g. "09:30"
  workdayEndTime: string;   // e.g. "18:30"
  lateGracePeriodMinutes: number; // e.g. 15
  earlyExitGracePeriodMinutes: number; // e.g. 15
  halfDayThresholdHours: number; // e.g. 4.5
  fullDayThresholdHours: number; // e.g. 8.0
}
