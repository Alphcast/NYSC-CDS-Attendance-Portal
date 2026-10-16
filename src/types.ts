export type UserRole = 'member' | 'officer' | 'admin';

export interface User {
  id: string;
  fullName: string;
  stateCode: string;
  email: string;
  role: UserRole;
  cdsGroup: string;
  phoneNumber?: string;
  batch?: string;
  ppa?: string;
  isVerified?: boolean;
  registeredAt?: string;
}

export type AttendanceStatus = 'Pending' | 'Approved' | 'Rejected';

export interface Attendance {
  id: string;
  fullName: string;
  stateCode: string;
  cdsGroup: string;
  meetingDate: string;
  meetingNumber?: number;
  meetingId?: string;
  checkInTime: string;
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

export interface MeetingBoxRecord {
  meetingNumber: number; // 1 to 100
  attended: boolean;
  markedAt?: string;
  markedBy?: string;
  meetingDate?: string;
}

export interface MemberAttendanceSheet {
  memberId: string;
  fullName: string;
  stateCode: string;
  cdsGroup: string;
  email: string;
  phoneNumber?: string;
  registeredAt: string;
  boxes: Record<number, MeetingBoxRecord>;
  attendedCount: number;
  totalMeetings: number; // 100
  attendancePercentage: number;
}

export interface CDSAttendanceRecordsResponse {
  groups: Record<string, MemberAttendanceSheet[]>;
  allMembers: MemberAttendanceSheet[];
  totalRegistered: number;
  totalPresentBoxes: number;
}

export interface Meeting {
  id: string;
  title: string;
  cdsGroup: string;
  date: string;
  meetingNumber?: number;
  startTime: string;
  endTime: string;
  venue: string;
  agenda?: string;
  isActive: boolean;
}

export interface AttendanceStats {
  totalMembers: number;
  totalRequests: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  attendancePercentage: number;
  meetingDate: string;
  cdsGroup: string;
}

export interface AuditLog {
  id: string;
  action: string;
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

export interface AppNotification {
  id: string;
  stateCode: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  isRead: boolean;
  createdAt: string;
}

export interface TestResultItem {
  name: string;
  category: string;
  passed: boolean;
  message: string;
  durationMs: number;
  details?: any;
}

export interface TestSummaryResponse {
  summary: {
    total: number;
    passed: number;
    failed: number;
    allPassed: boolean;
  };
  results: TestResultItem[];
}
