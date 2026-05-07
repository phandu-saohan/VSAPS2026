-- ============================================================
-- HSAPS 2026 — Database Schema
-- Chạy file này trong Supabase Dashboard > SQL Editor
-- ============================================================

-- 1. PROFILES (users table)
create table if not exists public.profiles (
  id uuid references auth.users on delete cascade primary key,
  full_name text not null,
  email text not null,
  role text not null default 'Thành viên BTC'
    check (role in ('Quản trị viên', 'Thành viên BTC', 'Tình nguyện viên', 'Báo cáo viên', 'Đại biểu')),
  avatar text,
  last_login timestamptz
);

-- Auto-create profile on user signup
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, full_name, email, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'role', 'Thành viên BTC')
  );
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 2. ROLE PERMISSIONS
create table if not exists public.role_permissions (
  id bigint generated always as identity primary key,
  role text not null,
  permission text not null,
  unique (role, permission)
);

-- Default permissions
insert into public.role_permissions (role, permission) values
-- Quản trị viên: all permissions
('Quản trị viên', 'dashboard:view'),
('Quản trị viên', 'users:view'),('Quản trị viên', 'users:create'),('Quản trị viên', 'users:edit'),('Quản trị viên', 'users:delete'),
('Quản trị viên', 'speakers:view'),('Quản trị viên', 'speakers:create'),('Quản trị viên', 'speakers:edit'),('Quản trị viên', 'speakers:delete'),
('Quản trị viên', 'program:view'),('Quản trị viên', 'program:create'),('Quản trị viên', 'program:edit'),('Quản trị viên', 'program:delete'),
('Quản trị viên', 'sponsors:view'),('Quản trị viên', 'sponsors:create'),('Quản trị viên', 'sponsors:edit'),('Quản trị viên', 'sponsors:delete'),
('Quản trị viên', 'submissions:view'),('Quản trị viên', 'submissions:create'),('Quản trị viên', 'submissions:edit'),('Quản trị viên', 'submissions:delete'),('Quản trị viên', 'submissions:approve'),
('Quản trị viên', 'finance:view'),('Quản trị viên', 'finance:create'),('Quản trị viên', 'finance:edit'),('Quản trị viên', 'finance:delete'),
('Quản trị viên', 'tasks:view'),('Quản trị viên', 'tasks:create'),('Quản trị viên', 'tasks:edit'),('Quản trị viên', 'tasks:delete'),
('Quản trị viên', 'documents:view'),('Quản trị viên', 'documents:create'),('Quản trị viên', 'documents:edit'),('Quản trị viên', 'documents:delete'),
('Quản trị viên', 'email:send_bulk'),
('Quản trị viên', 'settings:view'),('Quản trị viên', 'settings:edit'),
-- Thành viên BTC
('Thành viên BTC', 'dashboard:view'),
('Thành viên BTC', 'speakers:view'),('Thành viên BTC', 'speakers:create'),('Thành viên BTC', 'speakers:edit'),('Thành viên BTC', 'speakers:delete'),
('Thành viên BTC', 'program:view'),('Thành viên BTC', 'program:create'),('Thành viên BTC', 'program:edit'),('Thành viên BTC', 'program:delete'),
('Thành viên BTC', 'sponsors:view'),('Thành viên BTC', 'sponsors:create'),('Thành viên BTC', 'sponsors:edit'),('Thành viên BTC', 'sponsors:delete'),
('Thành viên BTC', 'submissions:view'),('Thành viên BTC', 'submissions:create'),('Thành viên BTC', 'submissions:edit'),('Thành viên BTC', 'submissions:delete'),('Thành viên BTC', 'submissions:approve'),
('Thành viên BTC', 'finance:view'),('Thành viên BTC', 'finance:create'),('Thành viên BTC', 'finance:edit'),('Thành viên BTC', 'finance:delete'),
('Thành viên BTC', 'tasks:view'),('Thành viên BTC', 'tasks:create'),('Thành viên BTC', 'tasks:edit'),('Thành viên BTC', 'tasks:delete'),
('Thành viên BTC', 'documents:view'),('Thành viên BTC', 'documents:create'),('Thành viên BTC', 'documents:edit'),('Thành viên BTC', 'documents:delete'),
-- Tình nguyện viên
('Tình nguyện viên', 'dashboard:view'),
('Tình nguyện viên', 'program:view'),
('Tình nguyện viên', 'tasks:view')
on conflict (role, permission) do nothing;

-- 3. NOTIFICATIONS
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles on delete cascade not null,
  message text not null,
  link text,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists notifications_user_id_idx on public.notifications(user_id);
create index if not exists notifications_created_at_idx on public.notifications(created_at desc);

-- 4. SUBMISSIONS
create table if not exists public.submissions (
  id bigint generated always as identity primary key,
  full_name text not null,
  email text not null,
  phone text,
  dob text,
  workplace text,
  address text,
  attendee_type text,
  cme boolean default false,
  gala_dinner boolean default false,
  payment_amount integer default 0,
  payment_image_url text,
  status text default 'Chờ duyệt',
  registration_time timestamptz default now(),
  attendance_id text,
  badge_url text
);

create index if not exists submissions_attendance_id_idx on public.submissions(attendance_id);
create index if not exists submissions_status_idx on public.submissions(status);
create index if not exists submissions_email_idx on public.submissions(email);

-- 5. SPEAKERS
create table if not exists public.speakers (
  id bigint generated always as identity primary key,
  full_name text not null,
  academic_rank text,
  email text,
  phone text,
  workplace text,
  report_title_vn text,
  report_title_en text,
  status text default 'Chờ duyệt',
  speaker_type text,
  avatar_url text,
  passport_url text,
  abstract_file_url text,
  report_file_url text,
  take_care_notes text,
  cv_file_url text,
  user_id uuid references auth.users on delete set null,
  created_at timestamptz default now()
);

create index if not exists speakers_email_idx on public.speakers(email);
create index if not exists speakers_status_idx on public.speakers(status);
create index if not exists speakers_user_id_idx on public.speakers(user_id);

-- 6. PROGRAM ITEMS
create table if not exists public.program_items (
  id bigint generated always as identity primary key,
  date text not null,
  time text,
  session text,
  category text,
  report_title_vn text,
  report_title_en text,
  speaker_id bigint references public.speakers on delete set null
);

create index if not exists program_items_date_idx on public.program_items(date);
create index if not exists program_items_speaker_id_idx on public.program_items(speaker_id);

-- 7. SPONSORS
create table if not exists public.sponsors (
  id bigint generated always as identity primary key,
  name text not null,
  sponsorship_package text,
  amount integer default 0,
  status text default 'Chờ duyệt',
  logo_url text,
  contact_person text,
  email text,
  phone text,
  notes text,
  location text,
  contract_status text default 'Chưa có',
  contract_url text
);

-- 8. FINANCE TRANSACTIONS
create table if not exists public.finance_transactions (
  id bigint generated always as identity primary key,
  title text not null,
  type text not null check (type in ('Thu', 'Chi')),
  amount integer not null default 0,
  transaction_date text,
  handler_id uuid references public.profiles on delete set null,
  notes text,
  payment_method text,
  account text,
  receipt_url text
);

create index if not exists finance_handler_id_idx on public.finance_transactions(handler_id);
create index if not exists finance_type_idx on public.finance_transactions(type);

-- 9. TASKS
create table if not exists public.tasks (
  id bigint generated always as identity primary key,
  title text not null,
  description text,
  status text default 'Chờ duyệt',
  due_date text,
  assignee_id uuid references public.profiles on delete set null,
  created_at timestamptz default now()
);

create index if not exists tasks_assignee_id_idx on public.tasks(assignee_id);
create index if not exists tasks_status_idx on public.tasks(status);
create index if not exists tasks_due_date_idx on public.tasks(due_date);

-- 10. EVENT DOCUMENTS
create table if not exists public.event_documents (
  id bigint generated always as identity primary key,
  name text not null,
  description text,
  type text not null,
  file_url text not null,
  thumbnail_url text,
  created_at timestamptz default now()
);

-- 11. EMAIL TEMPLATES
create table if not exists public.email_templates (
  id bigint generated always as identity primary key,
  name text not null,
  subject text not null,
  body text not null,
  module text not null check (module in ('submissions', 'speakers')),
  description text
);

-- Default email templates
insert into public.email_templates (name, subject, body, module, description) values
  ('payment_confirmed', 'Xác nhận thanh toán thành công - HSAPS 2025', 'Kính gửi {{ho_ten}},

Cảm ơn bạn đã hoàn tất thanh toán cho sự kiện HSAPS 2025.

Mã tham dự của bạn là: {{id_tham_du}}

Chúng tôi sẽ liên hệ sớm với thông tin chi tiết.

Trân trọng,
Ban tổ chức HSAPS 2025', 'submissions', 'Email xác nhận thanh toán'),
  ('registration_received', 'Đăng ký thành công - HSAPS 2025', 'Kính gửi {{ho_ten}},

Chúng tôi đã nhận được đăng ký của bạn và sẽ xem xét trong thời gian sớm nhất.

Mã tham dự của bạn sẽ được gửi sau khi đăng ký được duyệt.

Trân trọng,
Ban tổ chức HSAPS 2025', 'submissions', 'Email xác nhận đăng ký')
on conflict do nothing;

-- 12. SETTINGS
create table if not exists public.settings (
  id integer primary key default 1 check (id = 1),
  sender_name text,
  sender_email text,
  smtp_host text,
  smtp_port text,
  smtp_user text,
  smtp_password text,
  smtp_secure boolean default false,
  oa_id text,
  oa_secret_key text,
  access_token text,
  abitstore_api_url text
);

insert into public.settings (id) values (1) on conflict (id) do nothing;

-- Backfill SMTP columns for databases that already had the settings table
alter table public.settings
  add column if not exists smtp_host text;
alter table public.settings
  add column if not exists smtp_port text;
alter table public.settings
  add column if not exists smtp_user text;
alter table public.settings
  add column if not exists smtp_password text;
alter table public.settings
  add column if not exists smtp_secure boolean default false;

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Enable RLS
alter table public.profiles enable row level security;
alter table public.notifications enable row level security;
alter table public.submissions enable row level security;
alter table public.speakers enable row level security;
alter table public.program_items enable row level security;
alter table public.sponsors enable row level security;
alter table public.finance_transactions enable row level security;
alter table public.tasks enable row level security;
alter table public.event_documents enable row level security;
alter table public.email_templates enable row level security;
alter table public.settings enable row level security;
alter table public.role_permissions enable row level security;

-- Profiles: users can read their own profile; admins can read all
create policy "Users read own profile" on public.profiles for select using (auth.uid() = id);
create policy "Admins read all profiles" on public.profiles for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Quản trị viên')
);
create policy "Users update own profile" on public.profiles for update using (auth.uid() = id);
create policy "Admins insert profiles" on public.profiles for insert with check (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Quản trị viên')
);
create policy "Admins delete profiles" on public.profiles for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Quản trị viên')
);

-- Notifications: users can CRUD their own notifications
create policy "Users read own notifications" on public.notifications for select using (auth.uid() = user_id);
create policy "Users insert own notifications" on public.notifications for insert with check (auth.uid() = user_id);
create policy "Users update own notifications" on public.notifications for update using (auth.uid() = user_id);
create policy "Users delete own notifications" on public.notifications for delete using (auth.uid() = user_id);

-- Submissions: authenticated users can read all; admins/BTC can insert/update
create policy "Authenticated users read submissions" on public.submissions for select using (auth.role() = 'authenticated');
create policy "Authenticated can insert submissions" on public.submissions for insert with check (auth.role() = 'authenticated');
create policy "Admins/BTC update submissions" on public.submissions for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Quản trị viên', 'Thành viên BTC'))
);
create policy "Admins delete submissions" on public.submissions for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Quản trị viên')
);

-- Speakers
create policy "Authenticated read speakers" on public.speakers for select using (auth.role() = 'authenticated');
create policy "Admins/BTC manage speakers" on public.speakers for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Quản trị viên', 'Thành viên BTC'))
);

-- Program items
create policy "Authenticated read program" on public.program_items for select using (auth.role() = 'authenticated');
create policy "Admins/BTC manage program" on public.program_items for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Quản trị viên', 'Thành viên BTC'))
);

-- Sponsors
create policy "Authenticated read sponsors" on public.sponsors for select using (auth.role() = 'authenticated');
create policy "Admins/BTC manage sponsors" on public.sponsors for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Quản trị viên', 'Thành viên BTC'))
);

-- Finance
create policy "Authenticated read finance" on public.finance_transactions for select using (auth.role() = 'authenticated');
create policy "Admins/BTC manage finance" on public.finance_transactions for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Quản trị viên', 'Thành viên BTC'))
);

-- Tasks
create policy "Authenticated read tasks" on public.tasks for select using (auth.role() = 'authenticated');
create policy "Authenticated create tasks" on public.tasks for insert with check (auth.role() = 'authenticated');
create policy "Admins/BTC manage tasks" on public.tasks for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Quản trị viên', 'Thành viên BTC'))
);
create policy "Admins/BTC delete tasks" on public.tasks for delete using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Quản trị viên', 'Thành viên BTC'))
);

-- Event documents
create policy "Authenticated read documents" on public.event_documents for select using (auth.role() = 'authenticated');
create policy "Admins/BTC manage documents" on public.event_documents for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('Quản trị viên', 'Thành viên BTC'))
);

-- Email templates
create policy "Authenticated read templates" on public.email_templates for select using (auth.role() = 'authenticated');
create policy "Admins manage templates" on public.email_templates for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Quản trị viên')
);

-- Settings
create policy "Admins read settings" on public.settings for select using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Quản trị viên')
);
create policy "Admins update settings" on public.settings for update using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Quản trị viên')
);

-- Role permissions
create policy "Authenticated read role_permissions" on public.role_permissions for select using (auth.role() = 'authenticated');
create policy "Admins manage role_permissions" on public.role_permissions for all using (
  exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'Quản trị viên')
);

-- ============================================================
-- STORAGE — tạo bucket event_assets
-- ============================================================
-- Chạy trong Supabase > Storage > New bucket:
-- Name: event_assets
-- Public: ✓ (checked)
-- Allowed MIME types: image/*, application/pdf, video/*

-- ============================================================
-- Done! Bây giờ bạn có thể:
-- 1. Tạo user admin đầu tiên qua Supabase Dashboard > Authentication
-- 2. Set role = 'Quản trị viên' cho user đó
-- 3. Deploy frontend với SUPABASE_URL mới
-- ============================================================
