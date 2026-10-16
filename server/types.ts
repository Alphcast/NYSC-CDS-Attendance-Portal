export type UserRole = 'member' | 'officer' | 'admin';

export interface IUser {
  id: string;
  fullName: string;
  stateCode: string; // e.g. "LA/24B/1042"
  email: string;
  passwordHash?: string;
  role: UserRole;
  cdsGroup: string;
  phoneNumber?: string;
  batch?: string; // e.g. "2024 Batch B Stream 1"
  ppa?: string; // Primary Place of Assignment
  isVerified: boolean;
  registeredAt?: string;
  createdAt: string;
}

export type AttendanceStatus = 'Pending' | 'Approved' | 'Rejected';

export interface IAttendance {
  id: string;
  fullName: string;
  stateCode: string;
  cdsGroup: string;
  meetingDate: string; // YYYY-MM-DD
  meetingNumber?: number; // 1 to 100
  meetingId?: string;
  checkInTime: string; // ISO string
  status: AttendanceStatus;
  approvedBy?: {
    officerId: string;
    fullName: string;
    stateCode?: string;
    role: string;
  } | null;
  approvalTimestamp?: string | null;
  meetingNotes?: string;
  rejectionReason?: string | null;
  rejectedBy?: {
    officerId: string;
    fullName: string;
  } | null;
  rejectionTimestamp?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface IMeetingBoxRecord {
  meetingNumber: number; // 1 to 100
  attended: boolean;
  markedAt?: string;
  markedBy?: string;
  meetingDate?: string;
}

export interface IMemberAttendanceSheet {
  memberId: string;
  fullName: string;
  stateCode: string;
  cdsGroup: string;
  email: string;
  phoneNumber?: string;
  registeredAt: string;
  boxes: Record<number, IMeetingBoxRecord>; // 1 to 100
  attendedCount: number;
  totalMeetings: number; // 100
  attendancePercentage: number;
}

export interface IMeeting {
  id: string;
  title: string;
  cdsGroup: string; // "All" or specific group
  date: string; // YYYY-MM-DD
  meetingNumber?: number;
  startTime: string; // HH:mm
  endTime: string; // HH:mm
  venue: string;
  agenda?: string;
  isActive: boolean;
  createdAt: string;
}

export interface IAuditLog {
  id: string;
  action: 'CHECK_IN_SUBMITTED' | 'ATTENDANCE_APPROVED' | 'ATTENDANCE_REJECTED' | 'MEMBER_REGISTERED' | 'MEMBERS_IMPORTED_CSV' | 'MEETING_CREATED' | 'ATTENDANCE_UPDATED_ADMIN' | 'BOX_ATTENDANCE_MARKED';
  performedBy: {
    id: string;
    fullName: string;
    role: UserRole;
    stateCode?: string;
  };
  targetMember?: {
    fullName: string;
    stateCode: string;
  };
  details: string;
  meetingDate?: string;
  meetingNumber?: number;
  cdsGroup?: string;
  timestamp: string;
}

export interface INotification {
  id: string;
  userId?: string;
  stateCode: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}
