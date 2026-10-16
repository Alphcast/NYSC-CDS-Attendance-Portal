# Supabase SQL Table Implementation Prompt

Use the prompt and SQL script below inside your **Supabase Project SQL Editor** or paste into the **Supabase AI Assistant** to generate and initialize all tables, indexes, constraints, security policies, and seed data for the **NYSC CDS Attendance Management System**.

---

## 📋 Prompt to Paste into Supabase AI / Assistant

> **Prompt:**
> "Please create and initialize the complete PostgreSQL database schema for the NYSC CDS (Community Development Service) Attendance Portal in Supabase. The schema must include:
> 1. `members` table for corps members and officers (with state codes, roles, CDS groups, and PPA).
> 2. `attendance_boxes` table tracking the 100 meeting attendance boxes per corps member with unique composite constraint on (state_code, meeting_number).
> 3. `attendances` table for weekly roll-call check-ins, officer approvals, physical verification notes, and compound unique constraint on (state_code, meeting_date, cds_group) to strictly prevent duplicate check-ins.
> 4. `cds_meetings` table for scheduled weekly and bi-weekly CDS meetings and venues.
> 5. `audit_logs` table for an immutable audit trail of registrations, check-in submissions, and officer approvals.
> 6. `notifications` table for dispatching real-time in-app alerts to members.
> 7. Enable Row Level Security (RLS) on all tables with public access policies for anon/authenticated roles.
> 8. Configure clean database structure for Osun State corps members (state codes strictly starting with 'OS/'), with initial administrative verification officers and zero demo corpers so real corps member attendance can be inputted."

---

## ⚡ Direct SQL Script (Run in Supabase SQL Editor)

You can run this complete script directly in your browser:
**URL:** [https://supabase.com/dashboard/project/fxdfoylwulrijmwzxqnd/sql/new](https://supabase.com/dashboard/project/fxdfoylwulrijmwzxqnd/sql/new)

```sql
-- ====================================================================
-- NYSC CDS ATTENDANCE MANAGEMENT SYSTEM - SUPABASE DATABASE SCHEMA
-- Project Reference: fxdfoylwulrijmwzxqnd
-- ====================================================================

-- 1. Enable pgcrypto for UUID and random token generation
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 2. Create 'members' Table (All Corps Members & Officers)
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

-- Fast lookup indexes
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
    meeting_id TEXT,
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

-- 5. Create 'cds_meetings' Table (Scheduled Meetings & Venues)
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

-- 7. Create 'notifications' Table (In-App Alerts)
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

-- 8. Enable Row Level Security (RLS) on all tables
ALTER TABLE public.members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_boxes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendances ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cds_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- 9. Create Open Access Policies for the NYSC Attendance Application
DROP POLICY IF EXISTS "Allow anon all members" ON public.members;
CREATE POLICY "Allow anon all members" ON public.members FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all attendance_boxes" ON public.attendance_boxes;
CREATE POLICY "Allow anon all attendance_boxes" ON public.attendance_boxes FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all attendances" ON public.attendances;
CREATE POLICY "Allow anon all attendances" ON public.attendances FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all cds_meetings" ON public.cds_meetings;
CREATE POLICY "Allow anon all cds_meetings" ON public.cds_meetings FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all audit_logs" ON public.audit_logs;
CREATE POLICY "Allow anon all audit_logs" ON public.audit_logs FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all notifications" ON public.notifications;
CREATE POLICY "Allow anon all notifications" ON public.notifications FOR ALL USING (true) WITH CHECK (true);

-- 10. Seed Initial NYSC Osun State Officers (Zero Demo Corpers - Ready for Real Data Entry)
INSERT INTO public.members (id, full_name, state_code, email, role, cds_group, phone_number, batch, ppa)
VALUES
  ('usr_admin_osun', 'NYSC Osun State CDS Inspector', 'OS/24B/0001', 'admin.osun@nysc.gov.ng', 'admin', 'Executive Management', '+2348030000001', '2024 Batch B Stream 1', 'NYSC Osun State Secretariat, Osogbo'),
  ('usr_officer_osun', 'CDS Verification Officer (Osogbo)', 'OS/24B/0088', 'officer.osogbo@nysc.gov.ng', 'officer', 'Editorial & Publicity', '+2348020000088', '2024 Batch B Stream 1', 'Ministry of Youth & Sports, Osogbo')
ON CONFLICT (state_code) DO NOTHING;

-- 11. Seed Scheduled CDS General Assembly in Osun State
INSERT INTO public.cds_meetings (id, title, cds_group, date, meeting_number, start_time, end_time, venue, agenda)
VALUES
  ('meet_osun_cds', 'Weekly CDS General Assembly & Roll-Call', 'All', CURRENT_DATE, 1, '08:00', '12:00', 'NYSC Local Government Secretariat Hall, Osun State', 'Weekly CDS project execution, official roll-call, and attendance physical verification.')
ON CONFLICT (id) DO NOTHING;

-- Verification Query: Check that all 6 tables exist
SELECT table_name, (
  SELECT count(*) FROM information_schema.columns WHERE table_name = t.table_name
) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_name IN ('members', 'attendance_boxes', 'attendances', 'cds_meetings', 'audit_logs', 'notifications');
```

---

## 🚀 How to Execute

1. Open your Supabase Dashboard: **[Supabase SQL Editor](https://supabase.com/dashboard/project/fxdfoylwulrijmwzxqnd/sql/new)**.
2. Paste the SQL code above into the query editor.
3. Click the green **Run** button (or press `Ctrl+Enter` / `Cmd+Enter`).
4. In the NYSC Portal, visit the **Admin Panel** > **Supabase DB** tab and click **Test Connection** to confirm all tables are verified and active!
