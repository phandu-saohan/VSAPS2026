-- ============================================================
-- VSAPS2026 - HIS Event Management System
-- Full Database Schema Migration
-- Run this script in Supabase SQL Editor (as postgres / service_role)
-- ============================================================

-- ============================================================
-- EXTENSIONS
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- 1. PROFILES
-- Mirrors auth.users. Created automatically via trigger.
-- ============================================================
CREATE TABLE IF NOT EXISTS public.profiles (
    id          UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    full_name   TEXT NOT NULL DEFAULT '',
    email       TEXT NOT NULL DEFAULT '',
    role        TEXT NOT NULL DEFAULT 'Tình nguyện viên'
                    CHECK (role IN ('Quản trị viên', 'Thành viên BTC', 'Tình nguyện viên', 'Nhà tài trợ')),
    avatar      TEXT,
    last_login  TIMESTAMPTZ
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Users can view all profiles"
    ON public.profiles FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can update their own profile"
    ON public.profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Service role can manage profiles"
    ON public.profiles FOR ALL USING (auth.role() = 'service_role');

-- Trigger: auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
    INSERT INTO public.profiles (id, email, full_name, role)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
        COALESCE(NEW.raw_user_meta_data->>'role', 'Tình nguyện viên')
    )
    ON CONFLICT (id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- 2. ROLE PERMISSIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.role_permissions (
    id          BIGSERIAL PRIMARY KEY,
    role        TEXT NOT NULL,
    permission  TEXT NOT NULL,
    UNIQUE(role, permission)
);

ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view role_permissions"
    ON public.role_permissions FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can manage role_permissions"
    ON public.role_permissions FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'Quản trị viên'
        )
    );

-- Seed default permissions
INSERT INTO public.role_permissions (role, permission) VALUES
-- Quản trị viên: all permissions
('Quản trị viên', 'dashboard:view'),
('Quản trị viên', 'users:view'), ('Quản trị viên', 'users:create'), ('Quản trị viên', 'users:edit'), ('Quản trị viên', 'users:delete'),
('Quản trị viên', 'speakers:view'), ('Quản trị viên', 'speakers:create'), ('Quản trị viên', 'speakers:edit'), ('Quản trị viên', 'speakers:delete'),
('Quản trị viên', 'program:view'), ('Quản trị viên', 'program:create'), ('Quản trị viên', 'program:edit'), ('Quản trị viên', 'program:delete'),
('Quản trị viên', 'sponsors:view'), ('Quản trị viên', 'sponsors:create'), ('Quản trị viên', 'sponsors:edit'), ('Quản trị viên', 'sponsors:delete'),
('Quản trị viên', 'submissions:view'), ('Quản trị viên', 'submissions:create'), ('Quản trị viên', 'submissions:edit'), ('Quản trị viên', 'submissions:delete'), ('Quản trị viên', 'submissions:approve'),
('Quản trị viên', 'finance:view'), ('Quản trị viên', 'finance:create'), ('Quản trị viên', 'finance:edit'), ('Quản trị viên', 'finance:delete'),
('Quản trị viên', 'tasks:view'), ('Quản trị viên', 'tasks:create'), ('Quản trị viên', 'tasks:edit'), ('Quản trị viên', 'tasks:delete'),
('Quản trị viên', 'documents:view'), ('Quản trị viên', 'documents:create'), ('Quản trị viên', 'documents:edit'), ('Quản trị viên', 'documents:delete'),
('Quản trị viên', 'email:send_bulk'),
('Quản trị viên', 'settings:view'), ('Quản trị viên', 'settings:edit'),
-- Thành viên BTC
('Thành viên BTC', 'dashboard:view'),
('Thành viên BTC', 'speakers:view'), ('Thành viên BTC', 'speakers:create'), ('Thành viên BTC', 'speakers:edit'), ('Thành viên BTC', 'speakers:delete'),
('Thành viên BTC', 'program:view'), ('Thành viên BTC', 'program:create'), ('Thành viên BTC', 'program:edit'), ('Thành viên BTC', 'program:delete'),
('Thành viên BTC', 'sponsors:view'), ('Thành viên BTC', 'sponsors:create'), ('Thành viên BTC', 'sponsors:edit'), ('Thành viên BTC', 'sponsors:delete'),
('Thành viên BTC', 'submissions:view'), ('Thành viên BTC', 'submissions:create'), ('Thành viên BTC', 'submissions:edit'), ('Thành viên BTC', 'submissions:delete'), ('Thành viên BTC', 'submissions:approve'),
('Thành viên BTC', 'finance:view'), ('Thành viên BTC', 'finance:create'), ('Thành viên BTC', 'finance:edit'), ('Thành viên BTC', 'finance:delete'),
('Thành viên BTC', 'tasks:view'), ('Thành viên BTC', 'tasks:create'), ('Thành viên BTC', 'tasks:edit'), ('Thành viên BTC', 'tasks:delete'),
('Thành viên BTC', 'documents:view'), ('Thành viên BTC', 'documents:create'), ('Thành viên BTC', 'documents:edit'), ('Thành viên BTC', 'documents:delete'),
-- Tình nguyện viên
('Tình nguyện viên', 'dashboard:view'),
('Tình nguyện viên', 'program:view'),
('Tình nguyện viên', 'tasks:view'),
-- Nhà tài trợ
('Nhà tài trợ', 'dashboard:view'),
('Nhà tài trợ', 'sponsors:view'), ('Nhà tài trợ', 'sponsors:create'), ('Nhà tài trợ', 'sponsors:edit')
ON CONFLICT (role, permission) DO NOTHING;

-- ============================================================
-- 3. NOTIFICATIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.notifications (
    id          BIGSERIAL PRIMARY KEY,
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    message     TEXT NOT NULL,
    link        TEXT,
    read        BOOLEAN NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own notifications"
    ON public.notifications FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own notifications"
    ON public.notifications FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Authenticated users can insert notifications"
    ON public.notifications FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE public.task_comments;
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;

-- ============================================================
-- 4. TASKS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.tasks (
    id          BIGSERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    description TEXT,
    status      TEXT NOT NULL DEFAULT 'Chờ duyệt'
                    CHECK (status IN ('Chờ duyệt', 'Đang thực hiện', 'Hoàn thành', 'Từ chối')),
    due_date    DATE,
    assignee_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view tasks"
    ON public.tasks FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can manage tasks"
    ON public.tasks FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 4.5 TASK COMMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.task_comments (
    id          BIGSERIAL PRIMARY KEY,
    task_id     BIGINT NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
    user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage task comments"
    ON public.task_comments FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 4.6 CHAT MESSAGES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.messages (
    id          BIGSERIAL PRIMARY KEY,
    sender_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    channel     TEXT NOT NULL DEFAULT 'general',
    content     TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage messages"
    ON public.messages FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 5. SPEAKERS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.speakers (
    id                  BIGSERIAL PRIMARY KEY,
    full_name           TEXT NOT NULL,
    academic_rank       TEXT NOT NULL DEFAULT '',
    email               TEXT NOT NULL,
    phone               TEXT,
    workplace           TEXT NOT NULL DEFAULT '',
    report_title_vn     TEXT NOT NULL DEFAULT '',
    report_title_en     TEXT,
    status              TEXT NOT NULL DEFAULT 'Chờ duyệt'
                            CHECK (status IN ('Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Chờ thanh toán', 'Đã thanh toán', 'Đang thực hiện', 'Hoàn thành')),
    speaker_type        TEXT NOT NULL DEFAULT 'Báo cáo viên'
                            CHECK (speaker_type IN ('Chủ tọa', 'Báo cáo viên', 'Chủ tọa/Báo cáo viên')),
    avatar_url          TEXT,
    passport_url        TEXT,
    abstract_file_url   TEXT,
    report_file_url     TEXT,
    take_care_notes     TEXT,
    cv_file_url         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.speakers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view speakers (public registration)"
    ON public.speakers FOR SELECT USING (TRUE);

CREATE POLICY "Anyone can insert speakers (public registration)"
    ON public.speakers FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can update/delete speakers"
    ON public.speakers FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete speakers"
    ON public.speakers FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- 6. PROGRAM ITEMS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.program_items (
    id                  BIGSERIAL PRIMARY KEY,
    date                DATE NOT NULL,
    time                TEXT NOT NULL,
    session             TEXT NOT NULL,
    category            TEXT CHECK (category IN ('Phẫu thuật thẩm mỹ', 'Nội khoa thẩm mỹ')),
    report_title_vn     TEXT NOT NULL,
    report_title_en     TEXT,
    speaker_id          BIGINT REFERENCES public.speakers(id) ON DELETE SET NULL
);

ALTER TABLE public.program_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view program"
    ON public.program_items FOR SELECT USING (TRUE);

CREATE POLICY "Authenticated users can manage program"
    ON public.program_items FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 7. SPONSORS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.sponsors (
    id                  BIGSERIAL PRIMARY KEY,
    name                TEXT NOT NULL,
    sponsorship_package TEXT NOT NULL DEFAULT 'Khác'
                            CHECK (sponsorship_package IN ('Kim cương', 'Vàng', 'Bạc', 'Đồng', 'Khác')),
    amount              NUMERIC NOT NULL DEFAULT 0,
    status              TEXT NOT NULL DEFAULT 'Chờ duyệt'
                            CHECK (status IN ('Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Chờ thanh toán', 'Đã thanh toán', 'Đang thực hiện', 'Hoàn thành')),
    logo_url            TEXT,
    contact_person      TEXT NOT NULL DEFAULT '',
    email               TEXT,
    phone               TEXT,
    notes               TEXT,
    location            TEXT,
    contract_status     TEXT CHECK (contract_status IN ('Chưa có', 'Chờ ký', 'Đã ký')),
    contract_url        TEXT,
    user_id             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.sponsors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage sponsors"
    ON public.sponsors FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 8. SUBMISSIONS (Đăng ký tham dự)
-- ============================================================
CREATE TABLE IF NOT EXISTS public.submissions (
    id                  BIGSERIAL PRIMARY KEY,
    full_name           TEXT NOT NULL,
    email               TEXT NOT NULL,
    phone               TEXT NOT NULL DEFAULT '',
    dob                 DATE,
    workplace           TEXT NOT NULL DEFAULT '',
    address             TEXT NOT NULL DEFAULT '',
    attendee_type       TEXT NOT NULL DEFAULT '',
    cme                 BOOLEAN NOT NULL DEFAULT FALSE,
    gala_dinner         BOOLEAN NOT NULL DEFAULT FALSE,
    payment_amount      NUMERIC NOT NULL DEFAULT 0,
    payment_image_url   TEXT,
    status              TEXT NOT NULL DEFAULT 'Chờ duyệt'
                            CHECK (status IN ('Chờ duyệt', 'Đã duyệt', 'Từ chối', 'Chờ thanh toán', 'Đã thanh toán', 'Đang thực hiện', 'Hoàn thành')),
    registration_time   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    attendance_id       TEXT NOT NULL DEFAULT gen_random_uuid()::TEXT,
    badge_url           TEXT,
    user_id             UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    checked_in          BOOLEAN NOT NULL DEFAULT FALSE,
    check_in_time       TIMESTAMPTZ
);

ALTER TABLE public.submissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can insert submissions (public form)"
    ON public.submissions FOR INSERT WITH CHECK (TRUE);

CREATE POLICY "Authenticated users can view submissions"
    ON public.submissions FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can update submissions"
    ON public.submissions FOR UPDATE USING (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete submissions"
    ON public.submissions FOR DELETE USING (auth.role() = 'authenticated');

-- ============================================================
-- 9. FINANCE TRANSACTIONS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.finance_transactions (
    id                  BIGSERIAL PRIMARY KEY,
    title               TEXT NOT NULL,
    type                TEXT NOT NULL CHECK (type IN ('Thu', 'Chi')),
    amount              NUMERIC NOT NULL DEFAULT 0,
    transaction_date    DATE NOT NULL,
    handler_id          UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    notes               TEXT,
    payment_method      TEXT NOT NULL DEFAULT 'Chuyển khoản',
    account             TEXT NOT NULL DEFAULT 'TK Hội Nghị',
    receipt_url         TEXT,
    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.finance_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage finance"
    ON public.finance_transactions FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 10. DOCUMENTS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.event_documents (
    id              BIGSERIAL PRIMARY KEY,
    name            TEXT NOT NULL,
    description     TEXT,
    type            TEXT NOT NULL DEFAULT 'Khác'
                        CHECK (type IN ('Ảnh', 'PDF', 'Video', 'Khác')),
    file_url        TEXT NOT NULL,
    thumbnail_url   TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

ALTER TABLE public.event_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage documents"
    ON public.event_documents FOR ALL USING (auth.role() = 'authenticated');

-- ============================================================
-- 11. EMAIL TEMPLATES
-- ============================================================
CREATE TABLE IF NOT EXISTS public.email_templates (
    id          BIGSERIAL PRIMARY KEY,
    name        TEXT NOT NULL,
    subject     TEXT NOT NULL,
    body        TEXT NOT NULL DEFAULT '',
    module      TEXT NOT NULL DEFAULT 'submissions'
                    CHECK (module IN ('submissions', 'speakers')),
    description TEXT
);

ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can manage email templates"
    ON public.email_templates FOR ALL USING (auth.role() = 'authenticated');

-- Seed sample templates
INSERT INTO public.email_templates (name, subject, body, module, description) VALUES
(
  'Xác nhận đăng ký',
  'Xác nhận đăng ký tham dự HSAPS 2025',
  '<p>Kính gửi {{full_name}},</p><p>Chúng tôi xác nhận đã nhận được đăng ký tham dự của bạn.</p><p>Mã đăng ký của bạn là: <strong>{{attendance_id}}</strong></p><p>Trân trọng,<br/>Ban tổ chức HSAPS 2025</p>',
  'submissions',
  'Gửi cho người đăng ký sau khi đăng ký thành công'
),
(
  'Xác nhận thanh toán',
  'Xác nhận đã nhận thanh toán - HSAPS 2025',
  '<p>Kính gửi {{full_name}},</p><p>Chúng tôi đã xác nhận thanh toán của bạn. Hẹn gặp bạn tại hội nghị!</p><p>Trân trọng,<br/>Ban tổ chức HSAPS 2025</p>',
  'submissions',
  'Gửi sau khi xác nhận thanh toán'
),
(
  'Mời báo cáo viên',
  'Thư mời tham gia HSAPS 2025',
  '<p>Kính gửi {{academic_rank}} {{full_name}},</p><p>Chúng tôi trân trọng kính mời quý vị tham gia với tư cách báo cáo viên tại Hội nghị HSAPS 2025.</p><p>Trân trọng,<br/>Ban tổ chức HSAPS 2025</p>',
  'speakers',
  'Mời báo cáo viên tham gia hội nghị'
)
ON CONFLICT DO NOTHING;

-- ============================================================
-- 12. SYSTEM SETTINGS
-- ============================================================
CREATE TABLE IF NOT EXISTS public.settings (
    id                  INT PRIMARY KEY DEFAULT 1,
    sender_name         TEXT DEFAULT '',
    sender_email        TEXT DEFAULT '',
    oa_id               TEXT DEFAULT '',
    oa_secret_key       TEXT DEFAULT '',
    access_token        TEXT DEFAULT '',
    abitstore_api_url   TEXT DEFAULT '',
    CONSTRAINT settings_single_row CHECK (id = 1)
);

ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can view settings"
    ON public.settings FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Admins can update settings"
    ON public.settings FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND role = 'Quản trị viên'
        )
    );

-- Seed default settings row
INSERT INTO public.settings (id, sender_name, sender_email)
VALUES (1, 'Ban tổ chức HSAPS 2025', '')
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- STORAGE BUCKETS
-- ============================================================
-- Run these in the Supabase Dashboard > Storage > New Bucket
-- OR via the API. The SQL below uses the storage schema directly.

INSERT INTO storage.buckets (id, name, public)
VALUES ('event_assets', 'event_assets', TRUE)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload
CREATE POLICY "Authenticated users can upload event assets"
    ON storage.objects FOR INSERT
    WITH CHECK (bucket_id = 'event_assets' AND auth.role() = 'authenticated');

-- Allow public read
CREATE POLICY "Public can read event assets"
    ON storage.objects FOR SELECT
    USING (bucket_id = 'event_assets');

-- Allow authenticated users to update/delete their uploads
CREATE POLICY "Authenticated users can update event assets"
    ON storage.objects FOR UPDATE
    USING (bucket_id = 'event_assets' AND auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can delete event assets"
    ON storage.objects FOR DELETE
    USING (bucket_id = 'event_assets' AND auth.role() = 'authenticated');

-- ============================================================
-- DONE! Now create the first admin user:
-- 1. Go to Supabase Dashboard > Authentication > Users > Add user
-- 2. Enter email + password
-- 3. Then run this query (replace the email):
--
--   UPDATE public.profiles
--   SET role = 'Quản trị viên', full_name = 'Super Admin'
--   WHERE email = 'your-admin@email.com';
-- ============================================================
