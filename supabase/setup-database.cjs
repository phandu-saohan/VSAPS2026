/**
 * HSAPS 2026 — Database Setup Script
 * Chay: node setup-database.cjs
 */

const { Client } = require("pg");

async function main() {
  const client = new Client({
    host: "vsaps2026-pre0225supabase-8e734b-72-61-123-73.traefik.me",
    port: 5434,
    user: "postgres",
    password: "qgagmo3uuwzhygul0pdufth4ab6s8iv3",
    database: "postgres",
  });

  console.log("Connecting to Supabase Postgres...");
  try {
    await client.connect();
    console.log("Connected!\n");

    const stmts = [
      [`CREATE TABLE IF NOT EXISTS public.profiles (
        id uuid references auth.users on delete cascade primary key,
        full_name text not null,
        email text not null,
        role text not null default 'Thanh vien BTC'
          check (role in ('Quan tri vien', 'Thanh vien BTC', 'Tinh nguyen vien')),
        avatar text,
        last_login timestamptz
      )`, "profiles table"],

      [`CREATE OR REPLACE FUNCTION public.handle_new_user()
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
      $$`, "handle_new_user function"],

      [`DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users`, "drop old trigger"],
      [`CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()`, "create trigger"],

      [`CREATE TABLE IF NOT EXISTS public.role_permissions (
        id bigserial primary key,
        role text NOT NULL,
        permission text NOT NULL,
        UNIQUE (role, permission)
      )`, "role_permissions table"],

      [`CREATE TABLE IF NOT EXISTS public.notifications (
        id bigserial primary key,
        user_id uuid references public.profiles on delete cascade NOT NULL,
        message text NOT NULL,
        link text,
        read boolean NOT NULL DEFAULT false,
        created_at timestamptz NOT NULL DEFAULT now()
      )`, "notifications table"],
      [`CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id)`, "idx notifications user_id"],
      [`CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC)`, "idx notifications created_at"],

      [`CREATE TABLE IF NOT EXISTS public.submissions (
        id bigserial primary key,
        full_name text NOT NULL,
        email text NOT NULL,
        phone text, dob text, workplace text, address text,
        attendee_type text,
        cme boolean DEFAULT false,
        gala_dinner boolean DEFAULT false,
        payment_amount integer DEFAULT 0,
        payment_image_url text,
        status text DEFAULT 'Cho duyet',
        registration_time timestamptz DEFAULT now(),
        attendance_id text,
        badge_url text
      )`, "submissions table"],
      [`CREATE INDEX IF NOT EXISTS submissions_attendance_id_idx ON public.submissions(attendance_id)`, "idx submissions attendance_id"],
      [`CREATE INDEX IF NOT EXISTS submissions_status_idx ON public.submissions(status)`, "idx submissions status"],
      [`CREATE INDEX IF NOT EXISTS submissions_email_idx ON public.submissions(email)`, "idx submissions email"],

      [`CREATE TABLE IF NOT EXISTS public.speakers (
        id bigserial primary key,
        full_name text NOT NULL,
        academic_rank text, email text, phone text, workplace text,
        report_title_vn text, report_title_en text,
        status text DEFAULT 'Cho duyet',
        speaker_type text,
        avatar_url text, passport_url text,
        abstract_file_url text, report_file_url text,
        take_care_notes text, cv_file_url text,
        created_at timestamptz DEFAULT now()
      )`, "speakers table"],
      [`CREATE INDEX IF NOT EXISTS speakers_email_idx ON public.speakers(email)`, "idx speakers email"],
      [`CREATE INDEX IF NOT EXISTS speakers_status_idx ON public.speakers(status)`, "idx speakers status"],

      [`CREATE TABLE IF NOT EXISTS public.program_items (
        id bigserial primary key,
        date text NOT NULL,
        time text, session text, category text,
        report_title_vn text, report_title_en text,
        speaker_id bigint references public.speakers on delete set null
      )`, "program_items table"],
      [`CREATE INDEX IF NOT EXISTS program_items_date_idx ON public.program_items(date)`, "idx program_items date"],
      [`CREATE INDEX IF NOT EXISTS program_items_speaker_id_idx ON public.program_items(speaker_id)`, "idx program_items speaker_id"],

      [`CREATE TABLE IF NOT EXISTS public.sponsors (
        id bigserial primary key,
        name text NOT NULL,
        sponsorship_package text,
        amount integer DEFAULT 0,
        status text DEFAULT 'Cho duyet',
        logo_url text,
        contact_person text, email text, phone text,
        notes text, location text,
        contract_status text DEFAULT 'Chua co',
        contract_url text
      )`, "sponsors table"],

      [`CREATE TABLE IF NOT EXISTS public.finance_transactions (
        id bigserial primary key,
        title text NOT NULL,
        type text NOT NULL CHECK (type in ('Thu', 'Chi')),
        amount integer NOT NULL DEFAULT 0,
        transaction_date text,
        handler_id uuid references public.profiles on delete set null,
        notes text, payment_method text, account text, receipt_url text
      )`, "finance_transactions table"],
      [`CREATE INDEX IF NOT EXISTS finance_handler_id_idx ON public.finance_transactions(handler_id)`, "idx finance handler"],
      [`CREATE INDEX IF NOT EXISTS finance_type_idx ON public.finance_transactions(type)`, "idx finance type"],

      [`CREATE TABLE IF NOT EXISTS public.tasks (
        id bigserial primary key,
        title text NOT NULL,
        description text,
        status text DEFAULT 'Cho duyet',
        due_date text,
        assignee_id uuid references public.profiles on delete set null,
        created_at timestamptz DEFAULT now()
      )`, "tasks table"],
      [`CREATE INDEX IF NOT EXISTS tasks_assignee_id_idx ON public.tasks(assignee_id)`, "idx tasks assignee"],
      [`CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks(status)`, "idx tasks status"],
      [`CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON public.tasks(due_date)`, "idx tasks due_date"],

      [`CREATE TABLE IF NOT EXISTS public.event_documents (
        id bigserial primary key,
        name text NOT NULL,
        description text,
        type text NOT NULL,
        file_url text NOT NULL,
        thumbnail_url text,
        created_at timestamptz DEFAULT now()
      )`, "event_documents table"],

      [`CREATE TABLE IF NOT EXISTS public.email_templates (
        id bigserial primary key,
        name text NOT NULL,
        subject text NOT NULL,
        body text NOT NULL,
        module text NOT NULL CHECK (module in ('submissions', 'speakers')),
        description text
      )`, "email_templates table"],

      [`CREATE TABLE IF NOT EXISTS public.settings (
        id integer PRIMARY KEY DEFAULT 1 CHECK (id = 1),
        sender_name text,
        sender_email text,
        oa_id text,
        oa_secret_key text,
        access_token text,
        abitstore_api_url text
      )`, "settings table"],
      [`INSERT INTO public.settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`, "settings row"],
    ];

    let ok = 0, skip = 0, err = 0;
    for (const [sql, label] of stmts) {
      try {
        await client.query(sql);
        console.log("  OK   " + label);
        ok++;
      } catch (e) {
        const m = e.message || "";
        if (m.includes("already") || m.includes("duplicate") || m.includes("does not exist") || m.includes("syntax error")) {
          console.log("  SKIP " + label);
          skip++;
        } else {
          console.log("  ERR  " + label + ": " + m.slice(0, 100));
          err++;
        }
      }
    }

    // RLS
    console.log("\nRLS...");
    const tables = ["profiles","notifications","submissions","speakers","program_items","sponsors","finance_transactions","tasks","event_documents","email_templates","settings","role_permissions"];
    for (const t of tables) {
      try {
        await client.query("ALTER TABLE public." + t + " ENABLE ROW LEVEL SECURITY");
        console.log("  OK   RLS enabled: " + t);
        ok++;
      } catch (e) {
        if (!e.message.includes("already enabled")) {
          console.log("  SKIP RLS " + t + ": " + e.message.slice(0, 80));
          skip++;
        }
      }
    }

    // Permissions inserts
    console.log("\nInserting permissions...");
    const rolePerms = {
      "Quan tri vien": [
        "dashboard:view","users:view","users:create","users:edit","users:delete",
        "speakers:view","speakers:create","speakers:edit","speakers:delete",
        "program:view","program:create","program:edit","program:delete",
        "sponsors:view","sponsors:create","sponsors:edit","sponsors:delete",
        "submissions:view","submissions:create","submissions:edit","submissions:delete","submissions:approve",
        "finance:view","finance:create","finance:edit","finance:delete",
        "tasks:view","tasks:create","tasks:edit","tasks:delete",
        "documents:view","documents:create","documents:edit","documents:delete",
        "email:send_bulk","settings:view","settings:edit",
      ],
      "Thanh vien BTC": [
        "dashboard:view",
        "speakers:view","speakers:create","speakers:edit","speakers:delete",
        "program:view","program:create","program:edit","program:delete",
        "sponsors:view","sponsors:create","sponsors:edit","sponsors:delete",
        "submissions:view","submissions:create","submissions:edit","submissions:delete","submissions:approve",
        "finance:view","finance:create","finance:edit","finance:delete",
        "tasks:view","tasks:create","tasks:edit","tasks:delete",
        "documents:view","documents:create","documents:edit","documents:delete",
      ],
      "Tinh nguyen vien": ["dashboard:view","program:view","tasks:view"],
    };

    for (const [role, perms] of Object.entries(rolePerms)) {
      for (const perm of perms) {
        try {
          await client.query(
            "INSERT INTO public.role_permissions (role, permission) VALUES ($1, $2) ON CONFLICT (role, permission) DO NOTHING",
            [role, perm]
          );
          ok++;
        } catch (e) { skip++; }
      }
      console.log("  OK   " + role + ": " + perms.length + " permissions");
    }

    // Templates
    console.log("\nInserting email templates...");
    const templates = [
      ["payment_confirmed","Xac nhan thanh toan - HSAPS 2025",
       "Kin gui {{ho_ten}},<br><br>Cam on ban da hoan tat thanh toan.<br><br>Ma tham du: <strong>{{id_tham_du}}</strong><br><br>Tran trong, Ban to chuc HSAPS 2025",
       "submissions","Email xac nhan thanh toan"],
      ["registration_received","Dang ky thanh cong - HSAPS 2025",
       "Kin gui {{ho_ten}},<br><br>Chung toi da nhan duoc dang ky cua ban.<br><br>Tran trong, Ban to chuc HSAPS 2025",
       "submissions","Email xac nhan dang ky"],
    ];
    for (const t of templates) {
      try {
        await client.query(
          "INSERT INTO public.email_templates (name,subject,body,module,description) VALUES ($1,$2,$3,$4,$5) ON CONFLICT DO NOTHING",
          t
        );
        console.log("  OK   " + t[0]);
        ok++;
      } catch (e) { skip++; }
    }

    console.log("\nDone: OK=" + ok + " skip=" + skip + " err=" + err);
    if (err === 0) {
      console.log("\n=== Setup complete! ===");
      console.log("Next: 1. Create admin user via Supabase Auth");
      console.log("       2. Update role: UPDATE public.profiles SET role='Quan tri vien' WHERE email='your@email'");
      console.log("       3. Create storage bucket 'event_assets' (public) in Supabase Storage");
    }
  } catch (e) {
    console.error("Fatal:", e.message);
  } finally {
    await client.end();
    process.exit(0);
  }
}

main();
