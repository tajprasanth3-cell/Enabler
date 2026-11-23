import { apiRequest } from './apiClient';

export interface BackendAttendance {
  id: string;
  userId: string;
  userName: string;
  teamId: string;
  date: string;
  punchInTime: string | null;
  punchOutTime: string | null;
  workingMinutes: number;
  status: 'PRESENT' | 'LATE' | 'HALF_DAY' | 'ABSENT';
  isModified: boolean;
  modifiedBy?: string;
  modifiedReason?: string;
  createdAt: string;
  updatedAt: string;
}

export const attendanceService = {
  getRecords: async (params?: { date?: string; teamId?: string; userId?: string }) => {
    const query = new URLSearchParams(params as Record<string, string>).toString();
    return apiRequest<{ total: number; summary: any; records: BackendAttendance[] }>(`/attendance${query ? `?${query}` : ''}`);
  },

  punchIn: async (userId: string, userName: string, teamId: string) => {
    return apiRequest<BackendAttendance>('/attendance/punch-in', {
      method: 'POST',
      body: JSON.stringify({ userId, userName, teamId }),
    });
  },

  punchOut: async (userId: string) => {
    return apiRequest<BackendAttendance>('/attendance/punch-out', {
      method: 'POST',
      body: JSON.stringify({ userId }),
    });
  },

  modifyAttendance: async (id: string, payload: { status?: string; punchOutTime?: string; reason: string; actor?: any }) => {
    return apiRequest<BackendAttendance>(`/attendance/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload),
    });
  },
};
