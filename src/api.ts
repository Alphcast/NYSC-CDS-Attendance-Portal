import {
  Attendance,
  AttendanceStats,
  AuditLog,
  Meeting,
  AppNotification,
  TestSummaryResponse,
  User,
  CDSAttendanceRecordsResponse,
  MemberAttendanceSheet,
  MeetingBoxRecord
} from './types';

const TOKEN_KEY = 'nysc_cds_token';
const USER_KEY = 'nysc_cds_user';

export function getStoredToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredUser(): User | null {
  const raw = localStorage.getItem(USER_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

export function setStoredSession(token: string, user: User) {
  localStorage.setItem(TOKEN_KEY, token);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearStoredSession() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const user = getStoredUser();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>)
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  if (user?.id) {
    headers['X-User-Id'] = user.id;
  }

  const res = await fetch(endpoint, {
    ...options,
    headers
  });

  const data = await res.json().catch(() => null);

  if (!res.ok) {
    const errorMsg = data?.error || `Request failed with status ${res.status}`;
    throw new Error(errorMsg);
  }

  return data as T;
}

export const api = {
  // Auth & Personas
  async getCurrentUser(): Promise<{ user: User }> {
    return request<{ user: User }>('/api/auth/me');
  },

  async getPersonas(): Promise<{ personas: User[] }> {
    return request<{ personas: User[] }>('/api/auth/personas');
  },

  async switchPersona(userId: string): Promise<{ user: User; token: string }> {
    const res = await request<{ message: string; user: User; token: string }>('/api/auth/switch-persona', {
      method: 'POST',
      body: JSON.stringify({ userId })
    });
    setStoredSession(res.token, res.user);
    return res;
  },

  async login(identifier: string): Promise<{ user: User; token: string }> {
    const res = await request<{ message: string; user: User; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ identifier })
    });
    setStoredSession(res.token, res.user);
    return res;
  },

  async register(memberData: Partial<User>): Promise<{ user: User; token: string }> {
    const res = await request<{ message: string; user: User; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify(memberData)
    });
    setStoredSession(res.token, res.user);
    return res;
  },

  async resetDemo(): Promise<{ message: string }> {
    return request<{ message: string }>('/api/auth/reset-demo', { method: 'POST' });
  },

  // CDS Registration & 100-Meeting Attendance Records
  async registerCDS(data: {
    fullName: string;
    stateCode: string;
    email?: string;
    cdsGroup: string;
    phoneNumber?: string;
    batch?: string;
    ppa?: string;
  }): Promise<{ message: string; user: User; sheet: MemberAttendanceSheet }> {
    return request<{ message: string; user: User; sheet: MemberAttendanceSheet }>('/api/attendance/register-cds', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getCDSAttendanceRecords(cdsGroup?: string, search?: string): Promise<CDSAttendanceRecordsResponse> {
    const params = new URLSearchParams();
    if (cdsGroup && cdsGroup !== 'all') params.append('cdsGroup', cdsGroup);
    if (search) params.append('search', search);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<CDSAttendanceRecordsResponse>(`/api/attendance/cds-records${query}`);
  },

  async toggleMeetingBox(
    stateCode: string,
    meetingNumber: number
  ): Promise<{ message: string; member: MemberAttendanceSheet; box: MeetingBoxRecord }> {
    return request<{ message: string; member: MemberAttendanceSheet; box: MeetingBoxRecord }>(
      '/api/attendance/toggle-box',
      {
        method: 'POST',
        body: JSON.stringify({ stateCode, meetingNumber })
      }
    );
  },

  // Attendance
  async submitCheckIn(data: {
    fullName: string;
    stateCode: string;
    cdsGroup: string;
    meetingDate: string;
    meetingId?: string;
  }): Promise<{ message: string; attendance: Attendance }> {
    return request<{ message: string; attendance: Attendance }>('/api/attendance/check-in', {
      method: 'POST',
      body: JSON.stringify(data)
    });
  },

  async getAttendances(filters?: {
    meetingDate?: string;
    cdsGroup?: string;
    status?: string;
    stateCode?: string;
    search?: string;
  }): Promise<{ attendances: Attendance[] }> {
    const params = new URLSearchParams();
    if (filters?.meetingDate) params.append('meetingDate', filters.meetingDate);
    if (filters?.cdsGroup) params.append('cdsGroup', filters.cdsGroup);
    if (filters?.status) params.append('status', filters.status);
    if (filters?.stateCode) params.append('stateCode', filters.stateCode);
    if (filters?.search) params.append('search', filters.search);

    const query = params.toString() ? `?${params.toString()}` : '';
    return request<{ attendances: Attendance[] }>(`/api/attendance${query}`);
  },

  async getStats(meetingDate?: string, cdsGroup?: string): Promise<{ stats: AttendanceStats }> {
    const params = new URLSearchParams();
    if (meetingDate) params.append('meetingDate', meetingDate);
    if (cdsGroup) params.append('cdsGroup', cdsGroup);
    const query = params.toString() ? `?${params.toString()}` : '';
    return request<{ stats: AttendanceStats }>(`/api/attendance/stats${query}`);
  },

  async approveAttendance(id: string, meetingNotes?: string): Promise<{ message: string; attendance: Attendance }> {
    return request<{ message: string; attendance: Attendance }>(`/api/attendance/${id}/approve`, {
      method: 'POST',
      body: JSON.stringify({ meetingNotes })
    });
  },

  async rejectAttendance(id: string, rejectionReason: string): Promise<{ message: string; attendance: Attendance }> {
    return request<{ message: string; attendance: Attendance }>(`/api/attendance/${id}/reject`, {
      method: 'POST',
      body: JSON.stringify({ rejectionReason })
    });
  },

  getExportCsvUrl(meetingDate?: string, cdsGroup?: string, status?: string): string {
    const params = new URLSearchParams();
    if (meetingDate && meetingDate !== 'all') params.append('meetingDate', meetingDate);
    if (cdsGroup && cdsGroup !== 'all') params.append('cdsGroup', cdsGroup);
    if (status && status !== 'all') params.append('status', status);
    return `/api/attendance/export/csv${params.toString() ? `?${params.toString()}` : ''}`;
  },

  // Meetings
  async getMeetings(): Promise<{ meetings: Meeting[] }> {
    return request<{ meetings: Meeting[] }>('/api/meetings');
  },

  async createMeeting(meetingData: Partial<Meeting>): Promise<{ message: string; meeting: Meeting }> {
    return request<{ message: string; meeting: Meeting }>('/api/meetings', {
      method: 'POST',
      body: JSON.stringify(meetingData)
    });
  },

  // Members & Roster
  async getMembers(): Promise<{ members: User[] }> {
    return request<{ members: User[] }>('/api/members');
  },

  async importMembersCsv(csvText: string): Promise<{ message: string; result: any }> {
    return request<{ message: string; result: any }>('/api/members/import-csv', {
      method: 'POST',
      body: JSON.stringify({ csvText })
    });
  },

  // Audit Logs
  async getAuditLogs(): Promise<{ logs: AuditLog[] }> {
    return request<{ logs: AuditLog[] }>('/api/audit');
  },

  // Notifications
  async getNotifications(stateCode: string): Promise<{ notifications: AppNotification[] }> {
    return request<{ notifications: AppNotification[] }>(`/api/notifications/${encodeURIComponent(stateCode)}`);
  },

  async markNotificationRead(id: string): Promise<void> {
    await request<void>(`/api/notifications/${id}/read`, { method: 'PATCH' });
  },

  // Automated System Tests
  async runSystemTests(): Promise<TestSummaryResponse> {
    return request<TestSummaryResponse>('/api/tests/run', { method: 'POST' });
  },

  // Supabase Database Connection Status
  async getSupabaseStatus(): Promise<{
    configured: boolean;
    url: string;
    projectRef: string;
    status: { connected: boolean; url: string; error?: string };
  }> {
    return request('/api/supabase/status');
  },

  async syncAllToSupabase(): Promise<{
    message: string;
    result: { membersSynced: number; boxesSynced: number; attendancesSynced: number; error?: string };
  }> {
    return request('/api/supabase/sync', { method: 'POST' });
  }
};
