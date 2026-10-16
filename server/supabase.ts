import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import {
  IAttendance,
  IAuditLog,
  IMeeting,
  IMeetingBoxRecord,
  INotification,
  IUser
} from './types.js';

dotenv.config();

const supabaseUrl =
  process.env.SUPABASE_URL ||
  process.env.NEXT_PUBLIC_SUPABASE_URL ||
  process.env.VITE_SUPABASE_URL ||
  'https://fxdfoylwulrijmwzxqnd.supabase.co';

// On the server, prioritize service_role secret for full administrative database operations
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZGZveWx3dWxyaWptd3p4cW5kIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5MjA5NzI4OSwiZXhwIjoyMTA3NjczMjg5fQ.SCqOMUIuZINeoQXq4ueKca4iNr99ond6k7ICz3MKlXk';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

export const SUPABASE_CONFIG = {
  url: supabaseUrl,
  projectRef: 'fxdfoylwulrijmwzxqnd',
  anonKey: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZ4ZGZveWx3dWxyaWptd3p4cW5kIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwOTcyODksImV4cCI6MjEwNzY3MzI4OX0.Iwxw2U0k1qTGjHxR3U-yocJxCV7P2gLiPdz4fW-rWKk',
  connected: true
};

/**
 * Checks Supabase connectivity and whether database tables exist
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  url: string;
  tablesFound?: boolean;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.from('members').select('id').limit(1);

    if (error) {
      if (error.code === 'PGRST205') {
        return {
          connected: true,
          url: supabaseUrl,
          tablesFound: false,
          error: 'Connected to Supabase, but SQL tables are not yet created. Run schema in Supabase SQL Editor.'
        };
      }
      return {
        connected: true,
        url: supabaseUrl,
        tablesFound: false,
        error: error.message
      };
    }

    return {
      connected: true,
      url: supabaseUrl,
      tablesFound: true
    };
  } catch (err: any) {
    return {
      connected: false,
      url: supabaseUrl,
      error: err.message
    };
  }
}

// ==========================================
// 1. MEMBERS / USERS TABLE
// ==========================================

export async function fetchMembersFromSupabase(): Promise<IUser[] | null> {
  try {
    const { data, error } = await supabase
      .from('members')
      .select('*')
      .order('registered_at', { ascending: true });

    if (error) {
      console.warn('Supabase fetchMembers error:', error.message);
      return null;
    }

    return (data || []).map(row => ({
      id: row.id,
      fullName: row.full_name,
      stateCode: row.state_code,
      email: row.email,
      role: row.role || 'member',
      cdsGroup: row.cds_group,
      phoneNumber: row.phone_number || '',
      batch: row.batch || '2024 Batch B Stream 1',
      ppa: row.ppa || '',
      isVerified: row.is_verified ?? true,
      registeredAt: row.registered_at || row.created_at,
      createdAt: row.created_at || new Date().toISOString()
    }));
  } catch (err: any) {
    console.warn('Supabase fetchMembers exception:', err.message);
    return null;
  }
}

export async function syncMemberToSupabase(member: IUser): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('members')
      .upsert({
        id: member.id,
        full_name: member.fullName,
        state_code: member.stateCode.trim().toUpperCase(),
        email: member.email.trim().toLowerCase(),
        role: member.role || 'member',
        cds_group: member.cdsGroup,
        phone_number: member.phoneNumber || '',
        batch: member.batch || '2024 Batch B Stream 1',
        ppa: member.ppa || '',
        is_verified: member.isVerified ?? true,
        registered_at: member.registeredAt || new Date().toISOString(),
        updated_at: new Date().toISOString()
      }, { onConflict: 'state_code' });

    if (error) {
      console.warn('Supabase member sync error:', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('Supabase syncMemberToSupabase exception:', e.message);
    return false;
  }
}

// ==========================================
// 2. ATTENDANCE BOXES (100 BOXES PER MEMBER)
// ==========================================

export async function fetchBoxesFromSupabase(): Promise<Record<string, Record<number, IMeetingBoxRecord>> | null> {
  try {
    const { data, error } = await supabase
      .from('attendance_boxes')
      .select('*');

    if (error) {
      console.warn('Supabase fetchBoxes error:', error.message);
      return null;
    }

    const boxesMap: Record<string, Record<number, IMeetingBoxRecord>> = {};
    for (const row of data || []) {
      const code = (row.state_code || '').trim().toUpperCase();
      if (!boxesMap[code]) {
        boxesMap[code] = {};
      }
      boxesMap[code][row.meeting_number] = {
        meetingNumber: row.meeting_number,
        attended: row.attended ?? false,
        markedAt: row.marked_at || undefined,
        markedBy: row.marked_by || undefined,
        meetingDate: row.meeting_date || undefined
      };
    }
    return boxesMap;
  } catch (err: any) {
    console.warn('Supabase fetchBoxes exception:', err.message);
    return null;
  }
}

export async function syncBoxToSupabase(
  stateCode: string,
  meetingNumber: number,
  box: IMeetingBoxRecord
): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('attendance_boxes')
      .upsert({
        state_code: stateCode.trim().toUpperCase(),
        meeting_number: meetingNumber,
        attended: box.attended ?? false,
        marked_at: box.markedAt || null,
        marked_by: box.markedBy || null,
        meeting_date: box.meetingDate || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'state_code,meeting_number' });

    if (error) {
      console.warn('Supabase box sync notice:', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('Supabase syncBoxToSupabase exception:', e.message);
    return false;
  }
}

// ==========================================
// 3. ATTENDANCES TABLE (CHECK-IN & APPROVALS)
// ==========================================

export async function fetchAttendancesFromSupabase(): Promise<IAttendance[] | null> {
  try {
    const { data, error } = await supabase
      .from('attendances')
      .select('*')
      .order('check_in_time', { ascending: false });

    if (error) {
      console.warn('Supabase fetchAttendances error:', error.message);
      return null;
    }

    return (data || []).map(row => ({
      id: row.id,
      fullName: row.full_name,
      stateCode: row.state_code,
      cdsGroup: row.cds_group,
      meetingDate: row.meeting_date,
      meetingNumber: row.meeting_number || 1,
      meetingId: row.meeting_id || undefined,
      checkInTime: row.check_in_time,
      status: row.status,
      approvedBy: row.approved_by,
      approvalTimestamp: row.approval_timestamp,
      meetingNotes: row.meeting_notes || '',
      rejectionReason: row.rejection_reason || null,
      rejectedBy: row.rejected_by || null,
      rejectionTimestamp: row.rejection_timestamp || null,
      createdAt: row.created_at || row.check_in_time,
      updatedAt: row.updated_at || row.check_in_time
    }));
  } catch (err: any) {
    console.warn('Supabase fetchAttendances exception:', err.message);
    return null;
  }
}

export async function syncAttendanceToSupabase(att: IAttendance): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('attendances')
      .upsert({
        id: att.id,
        full_name: att.fullName,
        state_code: att.stateCode.trim().toUpperCase(),
        cds_group: att.cdsGroup,
        meeting_date: att.meetingDate,
        meeting_number: att.meetingNumber || 1,
        check_in_time: att.checkInTime,
        status: att.status,
        approved_by: att.approvedBy || null,
        approval_timestamp: att.approvalTimestamp || null,
        meeting_notes: att.meetingNotes || '',
        rejection_reason: att.rejectionReason || null,
        rejected_by: att.rejectedBy || null,
        rejection_timestamp: att.rejectionTimestamp || null,
        updated_at: new Date().toISOString()
      }, { onConflict: 'state_code,meeting_date,cds_group' });

    if (error) {
      console.warn('Supabase attendance sync notice:', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('Supabase syncAttendanceToSupabase exception:', e.message);
    return false;
  }
}

// ==========================================
// 4. CDS MEETINGS TABLE
// ==========================================

export async function fetchMeetingsFromSupabase(): Promise<IMeeting[] | null> {
  try {
    const { data, error } = await supabase
      .from('cds_meetings')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.warn('Supabase fetchMeetings error:', error.message);
      return null;
    }

    return (data || []).map(row => ({
      id: row.id,
      title: row.title,
      cdsGroup: row.cds_group,
      date: row.date,
      meetingNumber: row.meeting_number || 1,
      startTime: row.start_time?.slice(0, 5) || '08:00',
      endTime: row.end_time?.slice(0, 5) || '12:00',
      venue: row.venue,
      agenda: row.agenda || '',
      isActive: row.is_active ?? true,
      createdAt: row.created_at || new Date().toISOString()
    }));
  } catch (err: any) {
    console.warn('Supabase fetchMeetings exception:', err.message);
    return null;
  }
}

export async function syncMeetingToSupabase(meeting: IMeeting): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('cds_meetings')
      .upsert({
        id: meeting.id,
        title: meeting.title,
        cds_group: meeting.cdsGroup,
        date: meeting.date,
        meeting_number: meeting.meetingNumber || 1,
        start_time: meeting.startTime,
        end_time: meeting.endTime,
        venue: meeting.venue,
        agenda: meeting.agenda || '',
        is_active: meeting.isActive ?? true,
        created_at: meeting.createdAt || new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase meeting sync notice:', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('Supabase syncMeetingToSupabase exception:', e.message);
    return false;
  }
}

// ==========================================
// 5. AUDIT LOGS TABLE
// ==========================================

export async function fetchAuditLogsFromSupabase(limit = 200): Promise<IAuditLog[] | null> {
  try {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (error) {
      console.warn('Supabase fetchAuditLogs error:', error.message);
      return null;
    }

    return (data || []).map(row => ({
      id: row.id,
      action: row.action,
      performedBy: row.performed_by,
      targetMember: row.target_member,
      details: row.details,
      meetingDate: row.meeting_date,
      meetingNumber: row.meeting_number,
      cdsGroup: row.cds_group,
      timestamp: row.timestamp
    }));
  } catch (err: any) {
    console.warn('Supabase fetchAuditLogs exception:', err.message);
    return null;
  }
}

export async function syncAuditLogToSupabase(log: IAuditLog): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('audit_logs')
      .upsert({
        id: log.id,
        action: log.action,
        performed_by: log.performedBy,
        target_member: log.targetMember || null,
        details: log.details,
        meeting_date: log.meetingDate || null,
        meeting_number: log.meetingNumber || null,
        cds_group: log.cdsGroup || null,
        timestamp: log.timestamp || new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase auditLog sync notice:', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('Supabase syncAuditLogToSupabase exception:', e.message);
    return false;
  }
}

// ==========================================
// 6. NOTIFICATIONS TABLE
// ==========================================

export async function fetchNotificationsFromSupabase(stateCode: string): Promise<INotification[] | null> {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('state_code', stateCode.trim().toUpperCase())
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Supabase fetchNotifications error:', error.message);
      return null;
    }

    return (data || []).map(row => ({
      id: row.id,
      userId: row.user_id,
      stateCode: row.state_code,
      title: row.title,
      message: row.message,
      type: row.type || 'info',
      isRead: row.is_read ?? false,
      createdAt: row.created_at
    }));
  } catch (err: any) {
    console.warn('Supabase fetchNotifications exception:', err.message);
    return null;
  }
}

export async function syncNotificationToSupabase(notif: INotification): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .upsert({
        id: notif.id,
        user_id: notif.userId || null,
        state_code: notif.stateCode.trim().toUpperCase(),
        title: notif.title,
        message: notif.message,
        type: notif.type,
        is_read: notif.isRead,
        created_at: notif.createdAt || new Date().toISOString()
      }, { onConflict: 'id' });

    if (error) {
      console.warn('Supabase notification sync notice:', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('Supabase syncNotificationToSupabase exception:', e.message);
    return false;
  }
}

export async function markNotificationReadInSupabase(id: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('id', id);

    if (error) return false;
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// FULL SYNC UTILITIES
// ==========================================

/**
 * Sync all local data into Supabase tables
 */
export async function syncAllToSupabase(
  users: IUser[],
  meetingBoxes: Record<string, Record<number, IMeetingBoxRecord>>,
  attendances: IAttendance[],
  meetings: IMeeting[] = [],
  auditLogs: IAuditLog[] = []
): Promise<{
  membersSynced: number;
  boxesSynced: number;
  attendancesSynced: number;
  meetingsSynced: number;
  auditLogsSynced: number;
  error?: string;
}> {
  let membersSynced = 0;
  let boxesSynced = 0;
  let attendancesSynced = 0;
  let meetingsSynced = 0;
  let auditLogsSynced = 0;

  try {
    for (const u of users) {
      const ok = await syncMemberToSupabase(u);
      if (ok) membersSynced++;
    }

    for (const [stateCode, boxes] of Object.entries(meetingBoxes)) {
      for (const [mNum, box] of Object.entries(boxes)) {
        if (box && box.attended) {
          const ok = await syncBoxToSupabase(stateCode, parseInt(mNum, 10), box);
          if (ok) boxesSynced++;
        }
      }
    }

    for (const a of attendances) {
      const ok = await syncAttendanceToSupabase(a);
      if (ok) attendancesSynced++;
    }

    for (const m of meetings) {
      const ok = await syncMeetingToSupabase(m);
      if (ok) meetingsSynced++;
    }

    for (const log of auditLogs.slice(0, 100)) {
      const ok = await syncAuditLogToSupabase(log);
      if (ok) auditLogsSynced++;
    }

    return { membersSynced, boxesSynced, attendancesSynced, meetingsSynced, auditLogsSynced };
  } catch (err: any) {
    return {
      membersSynced,
      boxesSynced,
      attendancesSynced,
      meetingsSynced,
      auditLogsSynced,
      error: err.message
    };
  }
}

/**
 * Return raw SQL schema content for easy copying
 */
export function getSupabaseSchemaSQL(): string {
  try {
    const schemaPath = path.resolve(process.cwd(), 'supabase', 'schema.sql');
    if (fs.existsSync(schemaPath)) {
      return fs.readFileSync(schemaPath, 'utf-8');
    }
  } catch {
    // fallback below
  }
  return `-- NYSC CDS Supabase Schema
CREATE TABLE IF NOT EXISTS public.members (
    id TEXT PRIMARY KEY DEFAULT 'usr_' || gen_random_uuid()::text,
    full_name TEXT NOT NULL,
    state_code TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member',
    cds_group TEXT NOT NULL,
    phone_number TEXT,
    batch TEXT,
    ppa TEXT,
    registered_at TIMESTAMPTZ DEFAULT NOW()
);`;
}
