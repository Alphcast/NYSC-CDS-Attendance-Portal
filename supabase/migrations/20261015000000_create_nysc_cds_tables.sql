-- Migration: Create NYSC CDS Tables in Supabase
-- Tables: members, attendance_boxes, attendances, cds_meetings, audit_logs, notifications

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

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

CREATE INDEX IF NOT EXISTS idx_members_state_code ON public.members (UPPER(state_code));
CREATE INDEX IF NOT EXISTS idx_members_cds_group ON public.members (cds_group);

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

ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cds_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow anon read members" ON public.members FOR SELECT USING (true);
CREATE POLICY "Allow anon insert members" ON public.members FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update members" ON public.members FOR UPDATE USING (true);
CREATE POLICY "Allow anon all attendance_boxes" ON public.attendance_boxes FOR ALL USING (true);
CREATE POLICY "Allow anon all attendances" ON public.attendances FOR ALL USING (true);
CREATE POLICY "Allow anon all cds_meetings" ON public.cds_meetings FOR ALL USING (true);
CREATE POLICY "Allow anon all audit_logs" ON public.audit_logs FOR ALL USING (true);
CREATE POLICY "Allow anon all notifications" ON public.notifications FOR ALL USING (true);
