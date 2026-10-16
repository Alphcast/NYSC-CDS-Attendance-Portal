import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';

dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://fxdfoylwulrijmwzxqnd.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.SUPABASE_ANON_KEY || 'sb_publishable_P7KYI36y8T5p-S8A19WDww_opcsr0oa';

export const supabase: SupabaseClient = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: false
  }
});

export const SUPABASE_CONFIG = {
  url: supabaseUrl,
  projectRef: 'fxdfoylwulrijmwzxqnd',
  connected: true
};

/**
 * Checks Supabase connectivity and table presence
 */
export async function testSupabaseConnection(): Promise<{
  connected: boolean;
  url: string;
  tablesFound?: boolean;
  error?: string;
}> {
  try {
    // Check if 'members' table exists in Supabase
    const { data, error } = await supabase.from('members').select('id').limit(1);
    
    if (error) {
      if (error.code === 'PGRST205') {
        // Table not found in schema cache yet (SQL script needs to be run)
        return {
          connected: true,
          url: supabaseUrl,
          tablesFound: false,
          error: "Connected to Supabase, but SQL tables are not yet created. Run the provided schema in the Supabase SQL Editor."
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

/**
 * Sync a corps member to Supabase 'members' table
 */
export async function syncMemberToSupabase(member: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('members')
      .upsert({
        id: member.id,
        full_name: member.fullName,
        state_code: member.stateCode.toUpperCase(),
        email: member.email,
        role: member.role || 'member',
        cds_group: member.cdsGroup,
        phone_number: member.phoneNumber || '',
        batch: member.batch || '2024 Batch B Stream 1',
        ppa: member.ppa || '',
        is_verified: member.isVerified ?? true,
        registered_at: member.registeredAt || new Date().toISOString()
      }, { onConflict: 'state_code' });

    if (error) {
      console.warn('Supabase member sync notice (table may need creation):', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('Supabase syncMemberToSupabase error:', e.message);
    return false;
  }
}

/**
 * Sync meeting box record to Supabase 'attendance_boxes' table
 */
export async function syncBoxToSupabase(stateCode: string, meetingNumber: number, box: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('attendance_boxes')
      .upsert({
        state_code: stateCode.toUpperCase(),
        meeting_number: meetingNumber,
        attended: box.attended ?? false,
        marked_at: box.markedAt || null,
        marked_by: box.markedBy || null,
        meeting_date: box.meetingDate || null
      }, { onConflict: 'state_code,meeting_number' });

    if (error) {
      console.warn('Supabase box sync notice:', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('Supabase syncBoxToSupabase error:', e.message);
    return false;
  }
}

/**
 * Sync full attendance record to Supabase 'attendances' table
 */
export async function syncAttendanceToSupabase(att: any): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('attendances')
      .upsert({
        id: att.id,
        full_name: att.fullName,
        state_code: att.stateCode.toUpperCase(),
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
        rejection_timestamp: att.rejectionTimestamp || null
      }, { onConflict: 'state_code,meeting_date,cds_group' });

    if (error) {
      console.warn('Supabase attendance sync notice:', error.message);
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('Supabase syncAttendanceToSupabase error:', e.message);
    return false;
  }
}

/**
 * Sync all local data to Supabase
 */
export async function syncAllToSupabase(
  users: any[],
  meetingBoxes: Record<string, Record<number, any>>,
  attendances: any[]
): Promise<{ membersSynced: number; boxesSynced: number; attendancesSynced: number; error?: string }> {
  let membersSynced = 0;
  let boxesSynced = 0;
  let attendancesSynced = 0;

  try {
    // 1. Sync members
    for (const u of users) {
      const ok = await syncMemberToSupabase(u);
      if (ok) membersSynced++;
    }

    // 2. Sync boxes
    for (const [stateCode, boxes] of Object.entries(meetingBoxes)) {
      for (const [mNum, box] of Object.entries(boxes)) {
        if (box && box.attended) {
          const ok = await syncBoxToSupabase(stateCode, parseInt(mNum, 10), box);
          if (ok) boxesSynced++;
        }
      }
    }

    // 3. Sync attendances
    for (const a of attendances) {
      const ok = await syncAttendanceToSupabase(a);
      if (ok) attendancesSynced++;
    }

    return { membersSynced, boxesSynced, attendancesSynced };
  } catch (err: any) {
    return { membersSynced, boxesSynced, attendancesSynced, error: err.message };
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
  } catch (e) {
    // fallback
  }
  return `-- NYSC CDS Supabase Schema
CREATE TABLE IF NOT EXISTS public.members (
    id TEXT PRIMARY KEY,
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
