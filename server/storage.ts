import fs from 'fs';
import path from 'path';
import mongoose from 'mongoose';
import {
  IAttendance,
  IAuditLog,
  IMeeting,
  IMeetingBoxRecord,
  IMemberAttendanceSheet,
  INotification,
  IUser
} from './types.js';
import {
  AttendanceModel,
  AuditLogModel,
  MeetingModel,
  NotificationModel,
  UserModel
} from './models/index.js';
import {
  syncMemberToSupabase,
  syncBoxToSupabase,
  syncAttendanceToSupabase,
  syncAllToSupabase
} from './supabase.js';

const DATA_DIR = path.resolve(process.cwd(), 'data');
const STORAGE_FILE = path.join(DATA_DIR, 'storage.json');

interface DatabaseStore {
  users: IUser[];
  attendances: IAttendance[];
  meetings: IMeeting[];
  auditLogs: IAuditLog[];
  notifications: INotification[];
  meetingBoxes: Record<string, Record<number, IMeetingBoxRecord>>; // key: stateCode
}

// Initial Seed Data with realistic Nigerian NYSC details
const INITIAL_USERS: IUser[] = [
  {
    id: 'usr_admin_1',
    fullName: 'Capt. Olusegun Adeyemi',
    stateCode: 'LA/24B/0001',
    email: 'admin@nysc.gov.ng',
    role: 'admin',
    cdsGroup: 'Executive Management',
    phoneNumber: '+2348031234567',
    batch: '2024 Batch B Stream 1',
    ppa: 'NYSC Lagos State Secretariat, Surulere',
    isVerified: true,
    registeredAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString()
  },
  {
    id: 'usr_officer_1',
    fullName: 'Fatima Aminu Bello',
    stateCode: 'LA/24B/0188',
    email: 'officer.fatima@nysc.gov.ng',
    role: 'officer',
    cdsGroup: 'Editorial & Publicity',
    phoneNumber: '+2348029876543',
    batch: '2024 Batch B Stream 1',
    ppa: 'Lagos State Ministry of Information, Alausa',
    isVerified: true,
    registeredAt: new Date(Date.now() - 28 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString()
  },
  {
    id: 'usr_officer_2',
    fullName: 'Chukwuma David Okonkwo',
    stateCode: 'LA/24B/0412',
    email: 'officer.chukwuma@nysc.gov.ng',
    role: 'officer',
    cdsGroup: 'ICT & Digital Skills',
    phoneNumber: '+2348055551234',
    batch: '2024 Batch B Stream 1',
    ppa: 'Lagos State Science & Tech Board',
    isVerified: true,
    registeredAt: new Date(Date.now() - 28 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 28 * 86400000).toISOString()
  },
  {
    id: 'usr_member_1',
    fullName: 'Ibrahim Oladepo Adeleke',
    stateCode: 'LA/24B/1042',
    email: 'ibrahim.ade@nysc.gov.ng',
    role: 'member',
    cdsGroup: 'Editorial & Publicity',
    phoneNumber: '+2348140001122',
    batch: '2024 Batch B Stream 1',
    ppa: 'Surulere Local Government Secondary School',
    isVerified: true,
    registeredAt: new Date(Date.now() - 25 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString()
  },
  {
    id: 'usr_member_2',
    fullName: 'Ngozi Blessing Eze',
    stateCode: 'LA/24B/1205',
    email: 'ngozi.eze@nysc.gov.ng',
    role: 'member',
    cdsGroup: 'Editorial & Publicity',
    phoneNumber: '+2348139998877',
    batch: '2024 Batch B Stream 1',
    ppa: 'Federal High Court, Ikoyi',
    isVerified: true,
    registeredAt: new Date(Date.now() - 24 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 24 * 86400000).toISOString()
  },
  {
    id: 'usr_member_3',
    fullName: 'Ayomide Victor Babatunde',
    stateCode: 'LA/24B/1589',
    email: 'ayomide.v@nysc.gov.ng',
    role: 'member',
    cdsGroup: 'ICT & Digital Skills',
    phoneNumber: '+2348071122334',
    batch: '2024 Batch B Stream 1',
    ppa: 'Union Bank of Nigeria, Marina',
    isVerified: true,
    registeredAt: new Date(Date.now() - 23 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 23 * 86400000).toISOString()
  },
  {
    id: 'usr_member_4',
    fullName: 'Zainab Mohammed Danjuma',
    stateCode: 'LA/24B/2011',
    email: 'zainab.d@nysc.gov.ng',
    role: 'member',
    cdsGroup: 'FRSC Road Safety',
    phoneNumber: '+2348098877665',
    batch: '2024 Batch B Stream 1',
    ppa: 'Federal Ministry of Works, TBS',
    isVerified: true,
    registeredAt: new Date(Date.now() - 22 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 22 * 86400000).toISOString()
  },
  {
    id: 'usr_member_5',
    fullName: 'Tariere Ebimobowei',
    stateCode: 'LA/24B/2344',
    email: 'tariere.e@nysc.gov.ng',
    role: 'member',
    cdsGroup: 'Medical & Health',
    phoneNumber: '+2348165544332',
    batch: '2024 Batch B Stream 1',
    ppa: 'General Hospital, Gbagada',
    isVerified: true,
    registeredAt: new Date(Date.now() - 21 * 86400000).toISOString(),
    createdAt: new Date(Date.now() - 21 * 86400000).toISOString()
  }
];

const TODAY_DATE = new Date().toISOString().split('T')[0];
const LAST_WEEK_DATE = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

const INITIAL_MEETINGS: IMeeting[] = [
  {
    id: 'meet_today_ep',
    title: 'Weekly Community Development Service - Editorial & Community Press',
    cdsGroup: 'Editorial & Publicity',
    date: TODAY_DATE,
    meetingNumber: 1,
    startTime: '08:00',
    endTime: '12:00',
    venue: 'Surulere Local Government Council Hall, Lagos',
    agenda: 'Quarterly CDS Magazine compilation, school outreach press release review, and attendance verification.',
    isActive: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  },
  {
    id: 'meet_today_ict',
    title: 'Bi-Weekly Tech & Youth Digital Literacy Outreach',
    cdsGroup: 'ICT & Digital Skills',
    date: TODAY_DATE,
    meetingNumber: 1,
    startTime: '08:30',
    endTime: '12:30',
    venue: 'Public Library ICT Hub, Yaba, Lagos',
    agenda: 'Coding for secondary schools progress report & workshop preparation.',
    isActive: true,
    createdAt: new Date(Date.now() - 2 * 86400000).toISOString()
  }
];

const INITIAL_ATTENDANCES: IAttendance[] = [
  {
    id: 'att_approved_1',
    fullName: 'Ngozi Blessing Eze',
    stateCode: 'LA/24B/1205',
    cdsGroup: 'Editorial & Publicity',
    meetingDate: TODAY_DATE,
    meetingNumber: 1,
    meetingId: 'meet_today_ep',
    checkInTime: new Date(Date.now() - 90 * 60000).toISOString(),
    status: 'Approved',
    approvedBy: {
      officerId: 'usr_officer_1',
      fullName: 'Fatima Aminu Bello',
      stateCode: 'LA/24B/0188',
      role: 'officer'
    },
    approvalTimestamp: new Date(Date.now() - 30 * 60000).toISOString(),
    meetingNotes: 'Verified present in uniform at Surulere LG Hall.',
    rejectionReason: null,
    createdAt: new Date(Date.now() - 90 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 30 * 60000).toISOString()
  },
  {
    id: 'att_pending_1',
    fullName: 'Ibrahim Oladepo Adeleke',
    stateCode: 'LA/24B/1042',
    cdsGroup: 'Editorial & Publicity',
    meetingDate: TODAY_DATE,
    meetingNumber: 1,
    meetingId: 'meet_today_ep',
    checkInTime: new Date(Date.now() - 45 * 60000).toISOString(),
    status: 'Pending',
    approvedBy: null,
    approvalTimestamp: null,
    rejectionReason: null,
    createdAt: new Date(Date.now() - 45 * 60000).toISOString(),
    updatedAt: new Date(Date.now() - 45 * 60000).toISOString()
  }
];

// Seed 100-boxes for members
const INITIAL_MEETING_BOXES: Record<string, Record<number, IMeetingBoxRecord>> = {
  'LA/24B/1205': {
    1: { meetingNumber: 1, attended: true, markedAt: TODAY_DATE, markedBy: 'Fatima Aminu Bello (Officer)' },
    2: { meetingNumber: 2, attended: true, markedAt: LAST_WEEK_DATE, markedBy: 'Fatima Aminu Bello (Officer)' },
    3: { meetingNumber: 3, attended: true, markedAt: '2026-10-01', markedBy: 'Fatima Aminu Bello (Officer)' }
  },
  'LA/24B/1042': {
    1: { meetingNumber: 1, attended: true, markedAt: LAST_WEEK_DATE, markedBy: 'Fatima Aminu Bello (Officer)' },
    2: { meetingNumber: 2, attended: false }
  },
  'LA/24B/1589': {
    1: { meetingNumber: 1, attended: true, markedAt: TODAY_DATE, markedBy: 'Chukwuma David Okonkwo (Officer)' }
  },
  'LA/24B/2011': {
    1: { meetingNumber: 1, attended: true, markedAt: TODAY_DATE, markedBy: 'Capt. Olusegun Adeyemi (Admin)' }
  },
  'LA/24B/2344': {
    1: { meetingNumber: 1, attended: true, markedAt: TODAY_DATE, markedBy: 'Capt. Olusegun Adeyemi (Admin)' }
  }
};

const INITIAL_AUDIT_LOGS: IAuditLog[] = [
  {
    id: 'audit_init_1',
    action: 'MEMBER_REGISTERED',
    performedBy: {
      id: 'usr_admin_1',
      fullName: 'Capt. Olusegun Adeyemi',
      role: 'admin',
      stateCode: 'LA/24B/0001'
    },
    targetMember: {
      fullName: 'Ibrahim Oladepo Adeleke',
      stateCode: 'LA/24B/1042'
    },
    details: 'Registered corps member into "Editorial & Publicity" CDS Group and generated 100-meeting attendance record.',
    cdsGroup: 'Editorial & Publicity',
    timestamp: new Date(Date.now() - 25 * 86400000).toISOString()
  }
];

const INITIAL_NOTIFICATIONS: INotification[] = [
  {
    id: 'notif_init_1',
    stateCode: 'LA/24B/1042',
    title: 'CDS Group Registration Confirmed',
    message: 'You have been successfully registered for the Editorial & Publicity CDS group. Your 100-meeting attendance card is active.',
    type: 'success',
    isRead: true,
    createdAt: new Date(Date.now() - 25 * 86400000).toISOString()
  }
];

class StorageEngine {
  private store: DatabaseStore = {
    users: [],
    attendances: [],
    meetings: [],
    auditLogs: [],
    notifications: [],
    meetingBoxes: {}
  };

  private isMongoConnected = false;

  constructor() {
    this.init();
  }

  private init() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }

      if (fs.existsSync(STORAGE_FILE)) {
        const raw = fs.readFileSync(STORAGE_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        this.store = {
          users: parsed.users || INITIAL_USERS,
          attendances: parsed.attendances || INITIAL_ATTENDANCES,
          meetings: parsed.meetings || INITIAL_MEETINGS,
          auditLogs: parsed.auditLogs || INITIAL_AUDIT_LOGS,
          notifications: parsed.notifications || INITIAL_NOTIFICATIONS,
          meetingBoxes: parsed.meetingBoxes || INITIAL_MEETING_BOXES
        };
      } else {
        this.store = {
          users: INITIAL_USERS,
          attendances: INITIAL_ATTENDANCES,
          meetings: INITIAL_MEETINGS,
          auditLogs: INITIAL_AUDIT_LOGS,
          notifications: INITIAL_NOTIFICATIONS,
          meetingBoxes: INITIAL_MEETING_BOXES
        };
        this.persist();
      }
    } catch (err) {
      console.warn('Storage file initialization fallback to memory:', err);
      this.store = {
        users: INITIAL_USERS,
        attendances: INITIAL_ATTENDANCES,
        meetings: INITIAL_MEETINGS,
        auditLogs: INITIAL_AUDIT_LOGS,
        notifications: INITIAL_NOTIFICATIONS,
        meetingBoxes: INITIAL_MEETING_BOXES
      };
    }
  }

  public setMongoConnected(status: boolean) {
    this.isMongoConnected = status;
  }

  public isMongoDB(): boolean {
    return this.isMongoConnected;
  }

  private persist() {
    try {
      if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
      }
      fs.writeFileSync(STORAGE_FILE, JSON.stringify(this.store, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error persisting database:', err);
    }
  }

  // --- Users & Members Registration ---
  public async getUsers(): Promise<IUser[]> {
    return [...this.store.users];
  }

  public async findUserByEmail(email: string): Promise<IUser | undefined> {
    return this.store.users.find(u => u.email.toLowerCase() === email.toLowerCase());
  }

  public async findUserByStateCode(stateCode: string): Promise<IUser | undefined> {
    const clean = stateCode.trim().toUpperCase();
    return this.store.users.find(u => u.stateCode.trim().toUpperCase() === clean);
  }

  public async findUserById(id: string): Promise<IUser | undefined> {
    return this.store.users.find(u => u.id === id);
  }

  /**
   * Register a Corps Member for their chosen CDS Group
   * Automatically creates attendance record with 100 boxes in their chosen CDS group
   */
  public async registerCorpsMember(data: {
    fullName: string;
    stateCode: string;
    email: string;
    cdsGroup: string;
    phoneNumber?: string;
    batch?: string;
    ppa?: string;
    actor?: { id: string; fullName: string; role: string };
  }): Promise<{ user: IUser; sheet: IMemberAttendanceSheet }> {
    const cleanStateCode = data.stateCode.trim().toUpperCase();
    const cleanEmail = data.email.trim().toLowerCase();
    const cleanGroup = data.cdsGroup.trim();

    // Check if member already registered
    const existing = await this.findUserByStateCode(cleanStateCode);
    if (existing) {
      // Update their CDS group if changed
      existing.cdsGroup = cleanGroup;
      existing.fullName = data.fullName.trim();
      if (data.phoneNumber) existing.phoneNumber = data.phoneNumber.trim();
      if (data.ppa) existing.ppa = data.ppa.trim();

      // Ensure boxes record exists
      if (!this.store.meetingBoxes[cleanStateCode]) {
        this.store.meetingBoxes[cleanStateCode] = {};
      }
      this.persist();

      const sheet = await this.getMemberAttendanceSheet(cleanStateCode);
      return { user: existing, sheet: sheet! };
    }

    const newUser: IUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fullName: data.fullName.trim(),
      stateCode: cleanStateCode,
      email: cleanEmail,
      role: 'member',
      cdsGroup: cleanGroup,
      phoneNumber: data.phoneNumber?.trim() || '',
      batch: data.batch?.trim() || '2024 Batch B',
      ppa: data.ppa?.trim() || '',
      isVerified: true,
      registeredAt: new Date().toISOString(),
      createdAt: new Date().toISOString()
    };

    // Add to users roster
    this.store.users.push(newUser);

    // Initialize 100 meeting boxes for this member
    if (!this.store.meetingBoxes[cleanStateCode]) {
      this.store.meetingBoxes[cleanStateCode] = {};
    }

    // Auto record in attendance table as registered
    const initialAttendance: IAttendance = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fullName: newUser.fullName,
      stateCode: cleanStateCode,
      cdsGroup: cleanGroup,
      meetingDate: new Date().toISOString().split('T')[0],
      meetingNumber: 1,
      checkInTime: new Date().toISOString(),
      status: 'Pending',
      approvedBy: null,
      approvalTimestamp: null,
      meetingNotes: `Corps member registered into CDS Group: ${cleanGroup}`,
      rejectionReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    this.store.attendances.unshift(initialAttendance);

    // Send automated notification
    await this.createNotification({
      stateCode: cleanStateCode,
      title: `Registered for CDS Group: ${cleanGroup}`,
      message: `Congratulations ${newUser.fullName}! Your CDS registration is complete. Your 100-meeting attendance record has been generated under ${cleanGroup}.`,
      type: 'success'
    });

    // Record in immutable audit trail
    await this.createAuditLog({
      action: 'MEMBER_REGISTERED',
      performedBy: {
        id: data.actor?.id || newUser.id,
        fullName: data.actor?.fullName || newUser.fullName,
        role: (data.actor?.role as any) || 'member',
        stateCode: cleanStateCode
      },
      targetMember: {
        fullName: newUser.fullName,
        stateCode: cleanStateCode
      },
      details: `Corps member ${newUser.fullName} (${cleanStateCode}) registered into CDS Group: "${cleanGroup}". Generated 100-meeting attendance record.`,
      cdsGroup: cleanGroup
    });

    this.persist();

    // Mirror to Supabase 'members' table asynchronously
    syncMemberToSupabase(newUser).catch(() => {});

    const sheet = await this.getMemberAttendanceSheet(cleanStateCode);
    return { user: newUser, sheet: sheet! };
  }

  public async createUser(userData: Omit<IUser, 'id' | 'createdAt'>): Promise<IUser> {
    const res = await this.registerCorpsMember({
      fullName: userData.fullName,
      stateCode: userData.stateCode,
      email: userData.email,
      cdsGroup: userData.cdsGroup,
      phoneNumber: userData.phoneNumber,
      batch: userData.batch,
      ppa: userData.ppa
    });
    return res.user;
  }

  public async bulkAddMembers(members: Array<Omit<IUser, 'id' | 'createdAt'>>): Promise<{ added: number; skipped: number; errors: string[] }> {
    let added = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const mem of members) {
      try {
        const cleanCode = mem.stateCode.trim().toUpperCase();
        const existing = this.store.users.find(u => u.stateCode.trim().toUpperCase() === cleanCode);
        if (existing) {
          skipped++;
          continue;
        }

        await this.registerCorpsMember({
          fullName: mem.fullName,
          stateCode: cleanCode,
          email: mem.email,
          cdsGroup: mem.cdsGroup,
          phoneNumber: mem.phoneNumber,
          batch: mem.batch,
          ppa: mem.ppa
        });
        added++;
      } catch (err: any) {
        skipped++;
        errors.push(`${mem.stateCode}: ${err.message}`);
      }
    }

    return { added, skipped, errors };
  }

  // --- 100-Meeting Attendance Sheet Records (Grouped by CDS Group) ---
  public async getMemberAttendanceSheet(stateCode: string): Promise<IMemberAttendanceSheet | null> {
    const cleanCode = stateCode.trim().toUpperCase();
    const user = await this.findUserByStateCode(cleanCode);
    if (!user) return null;

    const memberBoxes = this.store.meetingBoxes[cleanCode] || {};
    let attendedCount = 0;

    // Build 1..100 map
    const boxes: Record<number, IMeetingBoxRecord> = {};
    for (let i = 1; i <= 100; i++) {
      if (memberBoxes[i] && memberBoxes[i].attended) {
        boxes[i] = memberBoxes[i];
        attendedCount++;
      } else {
        boxes[i] = {
          meetingNumber: i,
          attended: false
        };
      }
    }

    return {
      memberId: user.id,
      fullName: user.fullName,
      stateCode: cleanCode,
      cdsGroup: user.cdsGroup,
      email: user.email,
      phoneNumber: user.phoneNumber,
      registeredAt: user.registeredAt || user.createdAt,
      boxes,
      attendedCount,
      totalMeetings: 100,
      attendancePercentage: Math.round((attendedCount / 100) * 100)
    };
  }

  /**
   * Get all registered members grouped by their chosen CDS Groups
   * with their 100 meeting attendance boxes in front of every name
   */
  public async getCDSAttendanceRecords(cdsGroup?: string, search?: string): Promise<{
    groups: Record<string, IMemberAttendanceSheet[]>;
    allMembers: IMemberAttendanceSheet[];
    totalRegistered: number;
    totalPresentBoxes: number;
  }> {
    // Only registered members with roles 'member' (or all users)
    let members = [...this.store.users].filter(u => u.role === 'member' || u.role === 'officer');

    // Sort according to registration date/order
    members.sort((a, b) => new Date(a.registeredAt || a.createdAt).getTime() - new Date(b.registeredAt || b.createdAt).getTime());

    if (search && search.trim()) {
      const q = search.trim().toLowerCase();
      members = members.filter(m =>
        m.fullName.toLowerCase().includes(q) ||
        m.stateCode.toLowerCase().includes(q) ||
        m.cdsGroup.toLowerCase().includes(q)
      );
    }

    if (cdsGroup && cdsGroup !== 'all') {
      members = members.filter(m => m.cdsGroup.toLowerCase() === cdsGroup.toLowerCase());
    }

    const sheets: IMemberAttendanceSheet[] = [];
    let totalPresentBoxes = 0;

    for (const mem of members) {
      const cleanCode = mem.stateCode.trim().toUpperCase();
      const memberBoxes = this.store.meetingBoxes[cleanCode] || {};
      let attendedCount = 0;

      const boxes: Record<number, IMeetingBoxRecord> = {};
      for (let i = 1; i <= 100; i++) {
        if (memberBoxes[i] && memberBoxes[i].attended) {
          boxes[i] = memberBoxes[i];
          attendedCount++;
          totalPresentBoxes++;
        } else {
          boxes[i] = {
            meetingNumber: i,
            attended: false
          };
        }
      }

      sheets.push({
        memberId: mem.id,
        fullName: mem.fullName,
        stateCode: cleanCode,
        cdsGroup: mem.cdsGroup,
        email: mem.email,
        phoneNumber: mem.phoneNumber,
        registeredAt: mem.registeredAt || mem.createdAt,
        boxes,
        attendedCount,
        totalMeetings: 100,
        attendancePercentage: Math.round((attendedCount / 100) * 100)
      });
    }

    // Split into each CDS group
    const groups: Record<string, IMemberAttendanceSheet[]> = {};
    for (const sheet of sheets) {
      const g = sheet.cdsGroup || 'General';
      if (!groups[g]) {
        groups[g] = [];
      }
      groups[g].push(sheet);
    }

    return {
      groups,
      allMembers: sheets,
      totalRegistered: sheets.length,
      totalPresentBoxes
    };
  }

  /**
   * Toggle / Mark attendance for meeting box (1 to 100) in front of member's name
   */
  public async toggleMeetingBox(
    stateCode: string,
    meetingNumber: number,
    actor: { id: string; fullName: string; role: string; stateCode?: string }
  ): Promise<{ member: IMemberAttendanceSheet; box: IMeetingBoxRecord }> {
    if (meetingNumber < 1 || meetingNumber > 100) {
      throw new Error('Meeting number must be between 1 and 100.');
    }

    const cleanCode = stateCode.trim().toUpperCase();
    const user = await this.findUserByStateCode(cleanCode);
    if (!user) {
      throw new Error(`Corps member with state code "${cleanCode}" not found.`);
    }

    if (!this.store.meetingBoxes[cleanCode]) {
      this.store.meetingBoxes[cleanCode] = {};
    }

    const currentBox = this.store.meetingBoxes[cleanCode][meetingNumber];
    const willBeAttended = !currentBox?.attended;
    const now = new Date().toISOString();

    const updatedBox: IMeetingBoxRecord = {
      meetingNumber,
      attended: willBeAttended,
      markedAt: willBeAttended ? now : undefined,
      markedBy: willBeAttended ? `${actor.fullName} (${actor.role})` : undefined,
      meetingDate: willBeAttended ? now.split('T')[0] : undefined
    };

    this.store.meetingBoxes[cleanCode][meetingNumber] = updatedBox;

    // Record in audit log
    await this.createAuditLog({
      action: 'BOX_ATTENDANCE_MARKED',
      performedBy: {
        id: actor.id,
        fullName: actor.fullName,
        role: actor.role as any,
        stateCode: actor.stateCode
      },
      targetMember: {
        fullName: user.fullName,
        stateCode: cleanCode
      },
      details: willBeAttended
        ? `Marked present for CDS Meeting #${meetingNumber} for ${user.fullName} (${cleanCode}) in ${user.cdsGroup}.`
        : `Removed attendance mark for CDS Meeting #${meetingNumber} for ${user.fullName} (${cleanCode}).`,
      meetingNumber,
      meetingDate: now.split('T')[0],
      cdsGroup: user.cdsGroup
    });

    // Notify corps member
    if (willBeAttended) {
      await this.createNotification({
        stateCode: cleanCode,
        title: `Meeting #${meetingNumber} Marked Present!`,
        message: `${actor.fullName} marked you as present for CDS Meeting #${meetingNumber} in ${user.cdsGroup}.`,
        type: 'success'
      });
    }

    this.persist();

    // Mirror to Supabase 'attendance_boxes' table asynchronously
    syncBoxToSupabase(cleanCode, meetingNumber, updatedBox).catch(() => {});

    const sheet = (await this.getMemberAttendanceSheet(cleanCode))!;
    return {
      member: sheet,
      box: updatedBox
    };
  }

  // --- Attendances list ---
  public async getAttendances(filters?: {
    meetingDate?: string;
    cdsGroup?: string;
    status?: string;
    stateCode?: string;
    search?: string;
  }): Promise<IAttendance[]> {
    let list = [...this.store.attendances];

    if (filters?.meetingDate && filters.meetingDate !== 'all') {
      list = list.filter(a => a.meetingDate === filters.meetingDate);
    }

    if (filters?.cdsGroup && filters.cdsGroup !== 'all') {
      list = list.filter(a => a.cdsGroup.toLowerCase() === filters.cdsGroup?.toLowerCase());
    }

    if (filters?.status && filters.status !== 'all') {
      list = list.filter(a => a.status.toLowerCase() === filters.status?.toLowerCase());
    }

    if (filters?.stateCode) {
      const code = filters.stateCode.trim().toUpperCase();
      list = list.filter(a => a.stateCode.trim().toUpperCase() === code);
    }

    if (filters?.search) {
      const q = filters.search.trim().toLowerCase();
      list = list.filter(a =>
        a.fullName.toLowerCase().includes(q) ||
        a.stateCode.toLowerCase().includes(q) ||
        a.cdsGroup.toLowerCase().includes(q)
      );
    }

    return list.sort((a, b) => new Date(b.checkInTime).getTime() - new Date(a.checkInTime).getTime());
  }

  public async findAttendanceById(id: string): Promise<IAttendance | undefined> {
    return this.store.attendances.find(a => a.id === id);
  }

  public async checkIn(data: {
    fullName: string;
    stateCode: string;
    cdsGroup: string;
    meetingDate: string;
    meetingId?: string;
  }): Promise<IAttendance> {
    const cleanStateCode = data.stateCode.trim().toUpperCase();
    const cleanDate = data.meetingDate.trim();
    const cleanGroup = data.cdsGroup.trim();

    const duplicate = this.store.attendances.find(a =>
      a.stateCode.trim().toUpperCase() === cleanStateCode &&
      a.meetingDate === cleanDate &&
      a.cdsGroup.toLowerCase() === cleanGroup.toLowerCase()
    );

    if (duplicate) {
      throw new Error(
        `Duplicate check-in rejected: Corps member with State Code "${cleanStateCode}" has already submitted attendance for the "${cleanGroup}" meeting on ${cleanDate}. Current status is: ${duplicate.status}.`
      );
    }

    const newAttendance: IAttendance = {
      id: `att_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      fullName: data.fullName.trim(),
      stateCode: cleanStateCode,
      cdsGroup: cleanGroup,
      meetingDate: cleanDate,
      meetingNumber: 1,
      meetingId: data.meetingId,
      checkInTime: new Date().toISOString(),
      status: 'Pending',
      approvedBy: null,
      approvalTimestamp: null,
      meetingNotes: '',
      rejectionReason: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.store.attendances.unshift(newAttendance);
    this.persist();

    return newAttendance;
  }

  public async approveAttendance(
    attendanceId: string,
    officer: { id: string; fullName: string; role: string; stateCode?: string },
    meetingNotes?: string
  ): Promise<IAttendance> {
    const item = this.store.attendances.find(a => a.id === attendanceId);
    if (!item) {
      throw new Error(`Attendance record not found (ID: ${attendanceId})`);
    }

    const now = new Date().toISOString();
    item.status = 'Approved';
    item.approvedBy = {
      officerId: officer.id,
      fullName: officer.fullName,
      role: officer.role,
      stateCode: officer.stateCode
    };
    item.approvalTimestamp = now;
    item.meetingNotes = meetingNotes || 'Physical presence verified by attendance officer.';
    item.rejectionReason = null;
    item.rejectedBy = null;
    item.rejectionTimestamp = null;
    item.updatedAt = now;

    // Also mark meeting box 1 in member's 100 boxes
    const cleanCode = item.stateCode.trim().toUpperCase();
    if (!this.store.meetingBoxes[cleanCode]) {
      this.store.meetingBoxes[cleanCode] = {};
    }
    const meetingNum = item.meetingNumber || 1;
    this.store.meetingBoxes[cleanCode][meetingNum] = {
      meetingNumber: meetingNum,
      attended: true,
      markedAt: now,
      markedBy: `${officer.fullName} (${officer.role})`,
      meetingDate: item.meetingDate
    };

    // Record audit log
    await this.createAuditLog({
      action: 'ATTENDANCE_APPROVED',
      performedBy: {
        id: officer.id,
        fullName: officer.fullName,
        role: officer.role as any,
        stateCode: officer.stateCode
      },
      targetMember: {
        fullName: item.fullName,
        stateCode: item.stateCode
      },
      details: `Officer verified physical presence and approved attendance for ${item.fullName} (${item.stateCode}) on ${item.meetingDate}.`,
      meetingDate: item.meetingDate,
      cdsGroup: item.cdsGroup
    });

    this.persist();

    // Mirror to Supabase 'attendances' table asynchronously
    syncAttendanceToSupabase(item).catch(() => {});

    return item;
  }

  public async rejectAttendance(
    attendanceId: string,
    officer: { id: string; fullName: string; role: string; stateCode?: string },
    rejectionReason: string
  ): Promise<IAttendance> {
    const item = this.store.attendances.find(a => a.id === attendanceId);
    if (!item) {
      throw new Error(`Attendance record not found (ID: ${attendanceId})`);
    }

    const now = new Date().toISOString();
    item.status = 'Rejected';
    item.rejectionReason = rejectionReason.trim();
    item.rejectedBy = {
      officerId: officer.id,
      fullName: officer.fullName
    };
    item.rejectionTimestamp = now;
    item.approvedBy = null;
    item.approvalTimestamp = null;
    item.updatedAt = now;

    this.persist();
    return item;
  }

  // --- Meetings ---
  public async getMeetings(): Promise<IMeeting[]> {
    return [...this.store.meetings].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  public async createMeeting(meetingData: Omit<IMeeting, 'id' | 'createdAt'>, actor: IUser): Promise<IMeeting> {
    const newMeeting: IMeeting = {
      ...meetingData,
      id: `meet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      createdAt: new Date().toISOString()
    };
    this.store.meetings.unshift(newMeeting);
    this.persist();
    return newMeeting;
  }

  // --- Stats ---
  public async getAttendanceStats(meetingDate?: string, cdsGroup?: string) {
    let attendances = [...this.store.attendances];
    let users = [...this.store.users].filter(u => u.role === 'member');

    if (cdsGroup && cdsGroup !== 'all') {
      attendances = attendances.filter(a => a.cdsGroup.toLowerCase() === cdsGroup.toLowerCase());
      users = users.filter(u => u.cdsGroup.toLowerCase() === cdsGroup.toLowerCase());
    }

    if (meetingDate && meetingDate !== 'all') {
      attendances = attendances.filter(a => a.meetingDate === meetingDate);
    }

    const totalMembers = users.length;
    const totalRequests = attendances.length;
    const pendingCount = attendances.filter(a => a.status === 'Pending').length;
    const approvedCount = attendances.filter(a => a.status === 'Approved').length;
    const rejectedCount = attendances.filter(a => a.status === 'Rejected').length;

    const attendancePercentage = totalMembers > 0
      ? Math.min(100, Math.round((approvedCount / totalMembers) * 100))
      : totalRequests > 0
        ? Math.round((approvedCount / totalRequests) * 100)
        : 0;

    return {
      totalMembers,
      totalRequests,
      pendingCount,
      approvedCount,
      rejectedCount,
      attendancePercentage,
      meetingDate: meetingDate || 'All Meetings',
      cdsGroup: cdsGroup || 'All Groups'
    };
  }

  // --- Audit Logs ---
  public async getAuditLogs(): Promise<IAuditLog[]> {
    return [...this.store.auditLogs].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  public async createAuditLog(log: Omit<IAuditLog, 'id' | 'timestamp'>): Promise<IAuditLog> {
    const newLog: IAuditLog = {
      ...log,
      id: `audit_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString()
    };
    this.store.auditLogs.unshift(newLog);
    if (this.store.auditLogs.length > 500) {
      this.store.auditLogs = this.store.auditLogs.slice(0, 500);
    }
    this.persist();
    return newLog;
  }

  // --- Notifications ---
  public async getNotifications(stateCode: string): Promise<INotification[]> {
    const clean = stateCode.trim().toUpperCase();
    return this.store.notifications
      .filter(n => n.stateCode.trim().toUpperCase() === clean)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  public async markNotificationRead(id: string): Promise<void> {
    const notif = this.store.notifications.find(n => n.id === id);
    if (notif) {
      notif.isRead = true;
      this.persist();
    }
  }

  public async createNotification(notif: Omit<INotification, 'id' | 'isRead' | 'createdAt'>): Promise<INotification> {
    const newNotif: INotification = {
      ...notif,
      id: `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      isRead: false,
      createdAt: new Date().toISOString()
    };
    this.store.notifications.unshift(newNotif);
    this.persist();
    return newNotif;
  }

  public async syncWithSupabase() {
    return await syncAllToSupabase(this.store.users, this.store.meetingBoxes, this.store.attendances);
  }

  public resetDemoData() {
    this.store = {
      users: INITIAL_USERS,
      attendances: INITIAL_ATTENDANCES,
      meetings: INITIAL_MEETINGS,
      auditLogs: INITIAL_AUDIT_LOGS,
      notifications: INITIAL_NOTIFICATIONS,
      meetingBoxes: INITIAL_MEETING_BOXES
    };
    this.persist();
  }
}

export const storage = new StorageEngine();
