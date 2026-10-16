-- ====================================================================
-- NYSC CDS ATTENDANCE MANAGEMENT SYSTEM - SUPABASE DATABASE SCHEMA
-- Project Reference: fxdfoylwulrijmwzxqnd
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/fxdfoylwulrijmwzxqnd/sql/new
-- ====================================================================

-- 1. Enable pgcrypto for UUID generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create 'members' Table (All Corps Members Information)
CREATE TABLE IF NOT EXISTS public.members (
    id TEXT PRIMARY KEY DEFAULT 'usr_' || gen_random_uuid()::text,
    full_name TEXT NOT NULL,
    state_code TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('member', 'officer', 'admin')),
    cds_group TEXT NOT NULL,
    phone_number TEXT DEFAULT '',
    batch TEXT DEFAULT '2024 Batch B Stream 1',
    ppa TEXT DEFAULT '',
    is_verified BOOLEAN DEFAULT TRUE,
    registered_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast lookup by state code and CDS group
CREATE INDEX IF NOT EXISTS idx_members_state_code ON public.members (UPPER(state_code));
CREATE INDEX IF NOT EXISTS idx_members_cds_group ON public.members (cds_group);

-- 3. Create 'attendance_boxes' Table (100 Meeting Attendance Boxes per Member)
CREATE TABLE IF NOT EXISTS public.attendance_boxes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    state_code TEXT NOT NULL REFERENCES public.members(state_code) ON DELETE CASCADE,
    meeting_number INT NOT NULL CHECK (meeting_number BETWEEN 1 AND 100),
    attended BOOLEAN NOT NULL DEFAULT FALSE,
    marked_at TIMESTAMPTZ,
    marked_by TEXT,
    meeting_date DATE DEFAULT CURRENT_DATE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(state_code, meeting_number)
);

CREATE INDEX IF NOT EXISTS idx_attendance_boxes_state_code ON public.attendance_boxes (state_code);
CREATE INDEX IF NOT EXISTS idx_attendance_boxes_meeting_num ON public.attendance_boxes (meeting_number);

-- 4. Create 'attendances' Table (Roll-call check-ins, approvals & rejections)
CREATE TABLE IF NOT EXISTS public.attendances (
    id TEXT PRIMARY KEY DEFAULT 'att_' || gen_random_uuid()::text,
    full_name TEXT NOT NULL,
    state_code TEXT NOT NULL REFERENCES public.members(state_code) ON DELETE CASCADE,
    cds_group TEXT NOT NULL,
    meeting_date DATE NOT NULL DEFAULT CURRENT_DATE,
    meeting_number INT DEFAULT 1 CHECK (meeting_number BETWEEN 1 AND 100),
    check_in_time TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Approved', 'Rejected')),
    approved_by JSONB,
    approval_timestamp TIMESTAMPTZ,
    meeting_notes TEXT DEFAULT '',
    rejection_reason TEXT,
    rejected_by JSONB,
    rejection_timestamp TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(state_code, meeting_date, cds_group)
);

CREATE INDEX IF NOT EXISTS idx_attendances_state_date ON public.attendances (state_code, meeting_date);
CREATE INDEX IF NOT EXISTS idx_attendances_status ON public.attendances (status);

-- 5. Create 'cds_meetings' Table
CREATE TABLE IF NOT EXISTS public.cds_meetings (
    id TEXT PRIMARY KEY DEFAULT 'meet_' || gen_random_uuid()::text,
    title TEXT NOT NULL,
    cds_group TEXT NOT NULL DEFAULT 'All',
    date DATE NOT NULL,
    meeting_number INT DEFAULT 1,
    start_time TIME DEFAULT '08:00',
    end_time TIME DEFAULT '12:00',
    venue TEXT NOT NULL,
    agenda TEXT DEFAULT '',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Create 'audit_logs' Table (Immutable Audit Trail)
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT 'audit_' || gen_random_uuid()::text,
    action TEXT NOT NULL,
    performed_by JSONB NOT NULL,
    target_member JSONB,
    details TEXT NOT NULL,
    meeting_date DATE,
    meeting_number INT,
    cds_group TEXT,
    timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 7. Create 'notifications' Table
CREATE TABLE IF NOT EXISTS public.notifications (
    id TEXT PRIMARY KEY DEFAULT 'notif_' || gen_random_uuid()::text,
    user_id TEXT,
    state_code TEXT NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Enable Row Level Security (RLS) and Grant Public / Authenticated Access
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cds_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Allow full access to anon and authenticated roles for this NYSC attendance app
DROP POLICY IF EXISTS "Allow anon read members" ON public.members;
CREATE POLICY "Allow anon read members" ON public.members FOR SELECT USING (true);
DROP POLICY IF EXISTS "Allow anon insert members" ON public.members;
CREATE POLICY "Allow anon insert members" ON public.members FOR INSERT WITH CHECK (true);
DROP POLICY IF EXISTS "Allow anon update members" ON public.members;
CREATE POLICY "Allow anon update members" ON public.members FOR UPDATE USING (true);

DROP POLICY IF EXISTS "Allow anon all attendance_boxes" ON public.attendance_boxes;
CREATE POLICY "Allow anon all attendance_boxes" ON public.attendance_boxes FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anon all attendances" ON public.attendances;
CREATE POLICY "Allow anon all attendances" ON public.attendances FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anon all cds_meetings" ON public.cds_meetings;
CREATE POLICY "Allow anon all cds_meetings" ON public.cds_meetings FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anon all audit_logs" ON public.audit_logs;
CREATE POLICY "Allow anon all audit_logs" ON public.audit_logs FOR ALL USING (true);

DROP POLICY IF EXISTS "Allow anon all notifications" ON public.notifications;
CREATE POLICY "Allow anon all notifications" ON public.notifications FOR ALL USING (true);

-- 9. Insert Initial Admin & Verification Officers for Osun State (Zero Demo Corpers)
INSERT INTO public.members (id, full_name, state_code, email, role, cds_group, phone_number, batch, ppa)
VALUES
  ('usr_admin_osun', 'NYSC Osun State CDS Inspector', 'OS/24B/0001', 'admin.osun@nysc.gov.ng', 'admin', 'Executive Management', '+2348030000001', '2024 Batch B Stream 1', 'NYSC Osun State Secretariat, Osogbo'),
  ('usr_officer_osun', 'CDS Verification Officer (Osogbo)', 'OS/24B/0088', 'officer.osogbo@nysc.gov.ng', 'officer', 'Editorial & Publicity', '+2348020000088', '2024 Batch B Stream 1', 'Ministry of Youth & Sports, Osogbo')
ON CONFLICT (state_code) DO NOTHING;

-- 10. Seed Scheduled CDS General Assembly in Osun State
INSERT INTO public.cds_meetings (id, title, cds_group, date, meeting_number, start_time, end_time, venue, agenda)
VALUES
  ('meet_osun_cds', 'Weekly CDS General Assembly & Roll-Call', 'All', CURRENT_DATE, 1, '08:00', '12:00', 'NYSC Local Government Secretariat Hall, Osun State', 'Weekly CDS project execution, official roll-call, and attendance physical verification.')
ON CONFLICT (id) DO NOTHING;
