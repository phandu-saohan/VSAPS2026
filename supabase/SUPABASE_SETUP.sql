-- ============================================================
-- HSAPS 2026 — Database Setup (Paste toan bo vao Supabase SQL Editor)
-- ============================================================

-- Chu y: Chuong trinh chi ho tro bang PostgreSQL co charset UTF8.
-- Neu gap loi ky tu, copy tung phan nho hon hoac thay doi.
-- ============================================================


-- =============================================
-- 1. PROFILES TABLE
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null,
  role text not null default 'Thanh vien BTC'
    check (role in ('Quan tri vien', 'Thanh vien BTC', 'Tinh nguyen vien')),
  avatar text,
  last_login timestamptz
);

-- ============================================================
-- 2. AUTO-CREATE PROFILE ON SIGNUP
-- ============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    new.id,
    COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    COALESCE(new.raw_user_meta_data->>'role', 'Thanh vien BTC')
  );
  RETURN new;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();


-- =============================================
-- 3. ROLE PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
  id bigserial primary key,
  role text NOT NULL,
  permission text NOT NULL,
  UNIQUE(role, permission)
);

-- =============================================
-- 4. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
  id bigserial primary key,
  user_id uuid references public.profiles on delete cascade NOT NULL,
  message text NOT NULL,
  link text,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id);
CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC);

-- =============================================
-- 5. SUBMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.submissions (
  id bigserial primary key,
  full_name text NOT NULL,
  email text NOT NULL,
  phone text,
  dob text,
  workplace text,
  address text,
  attendee_type text,
  cme boolean DEFAULT false,
  gala_dinner boolean DEFAULT false,
  payment_amount integer DEFAULT 0,
  payment_image_url text,
  status text DEFAULT 'Cho duyet',
  registration_time timestamptz DEFAULT now(),
  attendance_id text,
  badge_url text
);
CREATE INDEX IF NOT EXISTS submissions_attendance_id_idx ON public.submissions(attendance_id);
CREATE INDEX IF NOT EXISTS submissions_status_idx ON public.submissions(status);
CREATE INDEX IF NOT EXISTS submissions_email_idx ON public.submissions(email);

-- =============================================
-- 6. SPEAKERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.speakers (
  id bigserial primary key,
  full_name text NOT NULL,
  academic_rank text,
  email text,
  phone text,
  workplace text,
  report_title_vn text,
  report_title_en text,
  status text DEFAULT 'Cho duyet',
  speaker_type text,
  avatar_url text,
  passport_url text,
  abstract_file_url text,
  report_file_url text,
  take_care_notes text,
  cv_file_url text,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS speakers_email_idx ON public.speakers(email);
CREATE INDEX IF NOT EXISTS speakers_status_idx ON public.speakers(status);

-- =============================================
-- 7. PROGRAM ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.program_items (
  id bigserial primary key,
  date text NOT NULL,
  time text,
  session text,
  category text,
  report_title_vn text,
  report_title_en text,
  speaker_id bigint references public.speakers on delete set null
);
CREATE INDEX IF NOT EXISTS program_items_date_idx ON public.program_items(date);
CREATE INDEX IF NOT EXISTS program_items_speaker_id_idx ON public.program_items(speaker_id);

-- =============================================
-- 8. SPONSORS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sponsors (
  id bigserial primary key,
  name text NOT NULL,
  sponsorship_package text,
  amount integer DEFAULT 0,
  status text DEFAULT 'Cho duyet',
  logo_url text,
  contact_person text,
  email text,
  phone text,
  notes text,
  location text,
  contract_status text DEFAULT 'Chua co',
  contract_url text
);

-- =============================================
-- 9. FINANCE TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.finance_transactions (
  id bigserial primary key,
  title text NOT NULL,
  type text NOT NULL check (type in ('Thu', 'Chi')),
  amount integer NOT NULL DEFAULT 0,
  transaction_date text,
  handler_id uuid references public.profiles on delete set null,
  notes text,
  payment_method text,
  account text,
  receipt_url text
);
CREATE INDEX IF NOT EXISTS finance_handler_id_idx ON public.finance_transactions(handler_id);
CREATE INDEX IF NOT EXISTS finance_type_idx ON public.finance_transactions(type);

-- =============================================
-- 10. TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
  id bigserial primary key,
  title text NOT NULL,
  description text,
  status text DEFAULT 'Cho duyet',
  due_date text,
  assignee_id uuid references public.profiles on delete set null,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS tasks_assignee_id_idx ON public.tasks(assignee_id);
CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks(status);
CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON public.tasks(due_date);

-- =============================================
-- 11. EVENT DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_documents (
  id bigserial primary key,
  name text NOT NULL,
  description text,
  type text NOT NULL,
  file_url text NOT NULL,
  thumbnail_url text,
  created_at timestamptz DEFAULT now()
);

-- =============================================
-- 12. EMAIL TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_templates (
  id bigserial primary key,
  name text NOT NULL,
  subject text NOT NULL,
  body text NOT NULL,
  module text NOT NULL check (module in ('submissions', 'speakers')),
  description text
);

-- =============================================
-- 13. SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.settings (
  id integer PRIMARY KEY DEFAULT 1 check (id = 1),
  sender_name text,
  sender_email text,
  oa_id text,
  oa_secret_key text,
  access_token text,
  abitstore_api_url text
);
INSERT INTO public.settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- 14. ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.program_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.event_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Profiles policies
DROP POLICY IF EXISTS "Users read own profile" ON public.profiles;
CREATE POLICY "Users read own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins read all profiles" ON public.profiles;
CREATE POLICY "Admins read all profiles" ON public.profiles FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Quan tri vien')
);

DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
CREATE POLICY "Users update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

DROP POLICY IF EXISTS "Admins insert profiles" ON public.profiles;
CREATE POLICY "Admins insert profiles" ON public.profiles FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Quan tri vien')
);

-- Notifications
DROP POLICY IF EXISTS "Users manage own notifications" ON public.notifications;
CREATE POLICY "Users manage own notifications" ON public.notifications FOR ALL USING (auth.uid() = user_id);

-- Submissions
DROP POLICY IF EXISTS "Authenticated read submissions" ON public.submissions;
CREATE POLICY "Authenticated read submissions" ON public.submissions FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated insert submissions" ON public.submissions;
CREATE POLICY "Authenticated insert submissions" ON public.submissions FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins/BTC manage submissions" ON public.submissions;
CREATE POLICY "Admins/BTC manage submissions" ON public.submissions FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Quan tri vien', 'Thanh vien BTC'))
);

DROP POLICY IF EXISTS "Admins delete submissions" ON public.submissions;
CREATE POLICY "Admins delete submissions" ON public.submissions FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Quan tri vien')
);

-- Speakers
DROP POLICY IF EXISTS "Authenticated read speakers" ON public.speakers;
CREATE POLICY "Authenticated read speakers" ON public.speakers FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins/BTC manage speakers" ON public.speakers;
CREATE POLICY "Admins/BTC manage speakers" ON public.speakers FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Quan tri vien', 'Thanh vien BTC'))
);

-- Program
DROP POLICY IF EXISTS "Authenticated read program" ON public.program_items;
CREATE POLICY "Authenticated read program" ON public.program_items FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins/BTC manage program" ON public.program_items;
CREATE POLICY "Admins/BTC manage program" ON public.program_items FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Quan tri vien', 'Thanh vien BTC'))
);

-- Sponsors
DROP POLICY IF EXISTS "Authenticated read sponsors" ON public.sponsors;
CREATE POLICY "Authenticated read sponsors" ON public.sponsors FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins/BTC manage sponsors" ON public.sponsors;
CREATE POLICY "Admins/BTC manage sponsors" ON public.sponsors FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Quan tri vien', 'Thanh vien BTC'))
);

-- Finance
DROP POLICY IF EXISTS "Authenticated read finance" ON public.finance_transactions;
CREATE POLICY "Authenticated read finance" ON public.finance_transactions FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins/BTC manage finance" ON public.finance_transactions;
CREATE POLICY "Admins/BTC manage finance" ON public.finance_transactions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Quan tri vien', 'Thanh vien BTC'))
);

-- Tasks
DROP POLICY IF EXISTS "Authenticated read tasks" ON public.tasks;
CREATE POLICY "Authenticated read tasks" ON public.tasks FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Authenticated create tasks" ON public.tasks;
CREATE POLICY "Authenticated create tasks" ON public.tasks FOR INSERT WITH CHECK (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins/BTC manage tasks" ON public.tasks;
CREATE POLICY "Admins/BTC manage tasks" ON public.tasks FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Quan tri vien', 'Thanh vien BTC'))
);

DROP POLICY IF EXISTS "Admins/BTC delete tasks" ON public.tasks;
CREATE POLICY "Admins/BTC delete tasks" ON public.tasks FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Quan tri vien', 'Thanh vien BTC'))
);

-- Documents
DROP POLICY IF EXISTS "Authenticated read documents" ON public.event_documents;
CREATE POLICY "Authenticated read documents" ON public.event_documents FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins/BTC manage documents" ON public.event_documents;
CREATE POLICY "Admins/BTC manage documents" ON public.event_documents FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('Quan tri vien', 'Thanh vien BTC'))
);

-- Email templates
DROP POLICY IF EXISTS "Authenticated read templates" ON public.email_templates;
CREATE POLICY "Authenticated read templates" ON public.email_templates FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins manage templates" ON public.email_templates;
CREATE POLICY "Admins manage templates" ON public.email_templates FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Quan tri vien')
);

-- Settings
DROP POLICY IF EXISTS "Admins read settings" ON public.settings;
CREATE POLICY "Admins read settings" ON public.settings FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Quan tri vien')
);

DROP POLICY IF EXISTS "Admins update settings" ON public.settings;
CREATE POLICY "Admins update settings" ON public.settings FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Quan tri vien')
);

-- Role permissions
DROP POLICY IF EXISTS "Authenticated read role_permissions" ON public.role_permissions;
CREATE POLICY "Authenticated read role_permissions" ON public.role_permissions FOR SELECT USING (auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Admins manage role_permissions" ON public.role_permissions;
CREATE POLICY "Admins manage role_permissions" ON public.role_permissions FOR ALL USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'Quan tri vien')
);


-- ============================================================
-- 15. INSERT DEFAULT PERMISSIONS
-- ============================================================

-- Quan tri vien
INSERT INTO public.role_permissions (role, permission) VALUES
('Quan tri vien','dashboard:view'),
('Quan tri vien','users:view'),
('Quan tri vien','users:create'),
('Quan tri vien','users:edit'),
('Quan tri vien','users:delete'),
('Quan tri vien','speakers:view'),
('Quan tri vien','speakers:create'),
('Quan tri vien','speakers:edit'),
('Quan tri vien','speakers:delete'),
('Quan tri vien','program:view'),
('Quan tri vien','program:create'),
('Quan tri vien','program:edit'),
('Quan tri vien','program:delete'),
('Quan tri vien','sponsors:view'),
('Quan tri vien','sponsors:create'),
('Quan tri vien','sponsors:edit'),
('Quan tri vien','sponsors:delete'),
('Quan tri vien','submissions:view'),
('Quan tri vien','submissions:create'),
('Quan tri vien','submissions:edit'),
('Quan tri vien','submissions:delete'),
('Quan tri vien','submissions:approve'),
('Quan tri vien','finance:view'),
('Quan tri vien','finance:create'),
('Quan tri vien','finance:edit'),
('Quan tri vien','finance:delete'),
('Quan tri vien','tasks:view'),
('Quan tri vien','tasks:create'),
('Quan tri vien','tasks:edit'),
('Quan tri vien','tasks:delete'),
('Quan tri vien','documents:view'),
('Quan tri vien','documents:create'),
('Quan tri vien','documents:edit'),
('Quan tri vien','documents:delete'),
('Quan tri vien','email:send_bulk'),
('Quan tri vien','settings:view'),
('Quan tri vien','settings:edit')
ON CONFLICT (role, permission) DO NOTHING;

-- Thanh vien BTC
INSERT INTO public.role_permissions (role, permission) VALUES
('Thanh vien BTC','dashboard:view'),
('Thanh vien BTC','speakers:view'),
('Thanh vien BTC','speakers:create'),
('Thanh vien BTC','speakers:edit'),
('Thanh vien BTC','speakers:delete'),
('Thanh vien BTC','program:view'),
('Thanh vien BTC','program:create'),
('Thanh vien BTC','program:edit'),
('Thanh vien BTC','program:delete'),
('Thanh vien BTC','sponsors:view'),
('Thanh vien BTC','sponsors:create'),
('Thanh vien BTC','sponsors:edit'),
('Thanh vien BTC','sponsors:delete'),
('Thanh vien BTC','submissions:view'),
('Thanh vien BTC','submissions:create'),
('Thanh vien BTC','submissions:edit'),
('Thanh vien BTC','submissions:delete'),
('Thanh vien BTC','submissions:approve'),
('Thanh vien BTC','finance:view'),
('Thanh vien BTC','finance:create'),
('Thanh vien BTC','finance:edit'),
('Thanh vien BTC','finance:delete'),
('Thanh vien BTC','tasks:view'),
('Thanh vien BTC','tasks:create'),
('Thanh vien BTC','tasks:edit'),
('Thanh vien BTC','tasks:delete'),
('Thanh vien BTC','documents:view'),
('Thanh vien BTC','documents:create'),
('Thanh vien BTC','documents:edit'),
('Thanh vien BTC','documents:delete')
ON CONFLICT (role, permission) DO NOTHING;

-- Tinh nguyen vien
INSERT INTO public.role_permissions (role, permission) VALUES
('Tinh nguyen vien','dashboard:view'),
('Tinh nguyen vien','program:view'),
('Tinh nguyen vien','tasks:view')
ON CONFLICT (role, permission) DO NOTHING;


-- ============================================================
-- 16. INSERT EMAIL TEMPLATES
-- ============================================================
INSERT INTO public.email_templates (name, subject, body, module, description) VALUES
('payment_confirmed', 'Xac nhan thanh toan - HSAPS 2025',
'Kin gui {{ho_ten}},<br><br>Cam on ban da hoan tat thanh toan cho su kien HSAPS 2025.<br><br>Ma tham du cua ban la: <strong>{{id_tham_du}}</strong><br><br>Chung toi se lien he som nhat.<br><br>Tran trong,<br>Ban to chuc HSAPS 2025',
'submissions', 'Email xac nhan thanh toan'),
('registration_received', 'Dang ky thanh cong - HSAPS 2025',
'Kin gui {{ho_ten}},<br><br>Chung toi da nhan duoc dang ky cua ban va se xem xet trong thoi gian som nhat.<br><br>Ma tham du se duoc gui sau khi duoc duyet.<br><br>Tran trong,<br>Ban to chuc HSAPS 2025',
'submissions', 'Email xac nhan dang ky')
ON CONFLICT DO NOTHING;


-- ============================================================
-- DONE!
-- Tiep theo:
--  1. Tao Storage bucket "event_assets" (public) trong Supabase > Storage
--  2. Tao user admin trong Authentication, roi chay:
--     UPDATE public.profiles SET role='Quan tri vien' WHERE email='admin@email.com';
-- ============================================================
