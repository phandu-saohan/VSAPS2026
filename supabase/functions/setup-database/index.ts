// Edge Function: setup-database
// Ket noi truc tiep den Postgres container ben trong Docker network
// Run: POST /setup-database voi body { secret: "setup-hsaps-2026" }

declare const Deno: { env: { get: (k: string) => string | undefined } };

const HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: HEADERS });

  try {
    const { secret } = await req.json().catch(() => ({}));
    if (secret !== "setup-hsaps-2026") {
      return new Response(JSON.stringify({ error: "Invalid secret" }), { headers: HEADERS, status: 403 });
    }

    const pgHost = Deno.env.get("POSTGRES_HOST") ?? "db";
    const pgPort = Number(Deno.env.get("POSTGRES_PORT") ?? 5432);
    const pgUser = "postgres";
    const pgPass = Deno.env.get("POSTGRES_PASSWORD") ?? "";
    const pgDb = Deno.env.get("POSTGRES_DB") ?? "postgres";

    if (!pgPass) throw new Error("POSTGRES_PASSWORD not set");

    // Connect using Deno's TCP + pg protocol
    const conn = await Deno.connectTcp(pgHost, pgPort);
    const r = { w: conn.writable.getWriter(), r: conn.readable.getReader() };
    const enc = new TextEncoder(), dec = new TextDecoder();

    // Simple Postgres startup packet
    const passwordPacket = (pwd: string, username: string, db: string) => {
      const buf = new Uint8Array(300);
      let pos = 0;
      // StartupMessage
      buf[pos++] = 0x00; buf[pos++] = 0x00;
      buf[pos++] = 0x00; buf[pos++] = 0x00;
      buf[pos++] = 0x00;
      // Protocol version
      buf[pos++] = 0x00; buf[pos++] = 0x03; buf[pos++] = 0x00; buf[pos++] = 0x00;
      // User
      const userBytes = enc.encode(`user\0${username}\0`);
      buf.set(userBytes, pos); pos += userBytes.length;
      // Database
      const dbBytes = enc.encode(`database\0${db}\0`);
      buf.set(dbBytes, pos); pos += dbBytes.length;
      buf[pos++] = 0x00;
      return buf.slice(0, pos);
    };

    await r.w.write(passwordPacket(pgPass, pgUser, pgDb));
    await r.w.ready;

    // Read auth OK
    const authBuf = await r.r.read(new Uint8Array(100));
    if (!authBuf) throw new Error("No auth response");
    const authArr = authBuf.value;
    if (authArr[0] !== 0x52 || authArr[1] !== 0x00 || authArr[2] !== 0x00 || authArr[3] !== 0x00) {
      throw new Error("Auth failed: " + JSON.stringify(Array.from(authArr.slice(0,8))));
    }

    const runQuery = async (sql: string): Promise<string> => {
      // Build PostgreSQL Simple Query protocol message
      const msg = enc.encode(sql + "\0");
      const len = new Uint8Array(4);
      const slen = msg.length + 4;
      len[0] = (slen >> 24) & 0xff;
      len[1] = (slen >> 16) & 0xff;
      len[2] = (slen >> 8) & 0xff;
      len[3] = slen & 0xff;
      await r.w.write(len);
      await r.w.write(msg);
      await r.w.flush();

      // Read response
      const resp = await r.r.read(new Uint8Array(8192));
      if (!resp) return "no response";
      const arr = resp.value;
      const tag = String.fromCharCode(arr[0]);
      if (tag === 'E') return "error: " + dec.decode(arr.slice(5));
      if (tag === 'C') return "ok";
      if (tag === 'T') return "rows returned";
      return "got tag: " + tag;
    };

    const results: string[] = [];

    // Run schema creation
    const schema = [
      `CREATE TABLE IF NOT EXISTS public.profiles (id uuid references auth.users on delete cascade primary key, full_name text not null, email text not null, role text not null default 'Thanh vien BTC', avatar text, last_login timestamptz)`,
      `CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN INSERT INTO public.profiles (id, full_name, email, role) VALUES (new.id, COALESCE(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)), new.email, COALESCE(new.raw_user_meta_data->>'role', 'Thanh vien BTC')); RETURN new; END; $$`,
      `DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users`,
      `CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user()`,
      `CREATE TABLE IF NOT EXISTS public.role_permissions (id bigserial primary key, role text NOT NULL, permission text NOT NULL, UNIQUE(role, permission))`,
      `CREATE TABLE IF NOT EXISTS public.notifications (id bigserial primary key, user_id uuid references public.profiles on delete cascade NOT NULL, message text NOT NULL, link text, read boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now())`,
      `CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON public.notifications(user_id)`,
      `CREATE INDEX IF NOT EXISTS notifications_created_at_idx ON public.notifications(created_at DESC)`,
      `CREATE TABLE IF NOT EXISTS public.submissions (id bigserial primary key, full_name text NOT NULL, email text NOT NULL, phone text, dob text, workplace text, address text, attendee_type text, cme boolean DEFAULT false, gala_dinner boolean DEFAULT false, payment_amount integer DEFAULT 0, payment_image_url text, status text DEFAULT 'Cho duyet', registration_time timestamptz DEFAULT now(), attendance_id text, badge_url text, user_id uuid references public.profiles(id) on delete set null, checked_in boolean DEFAULT false, check_in_time timestamptz)`,
      `CREATE INDEX IF NOT EXISTS submissions_attendance_id_idx ON public.submissions(attendance_id)`,
      `CREATE INDEX IF NOT EXISTS submissions_status_idx ON public.submissions(status)`,
      `CREATE INDEX IF NOT EXISTS submissions_email_idx ON public.submissions(email)`,
      `CREATE TABLE IF NOT EXISTS public.tasks (id bigserial primary key, title text NOT NULL, description text, status text DEFAULT 'Cho duyet', due_date text, assignee_id uuid references public.profiles on delete set null, created_at timestamptz DEFAULT now())`,
      `CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks(status)`,
      `CREATE INDEX IF NOT EXISTS tasks_assignee_id_idx ON public.tasks(assignee_id)`,
      `CREATE TABLE IF NOT EXISTS public.task_comments (id bigserial primary key, task_id bigint references public.tasks(id) on delete cascade NOT NULL, user_id uuid references public.profiles(id) on delete cascade NOT NULL, content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
      `CREATE INDEX IF NOT EXISTS task_comments_task_id_idx ON public.task_comments(task_id)`,
      `CREATE TABLE IF NOT EXISTS public.messages (id bigserial primary key, sender_id uuid references public.profiles(id) on delete cascade NOT NULL, channel text NOT NULL DEFAULT 'general', content text NOT NULL, created_at timestamptz NOT NULL DEFAULT now())`,
      `CREATE INDEX IF NOT EXISTS messages_channel_created_at_idx ON public.messages(channel, created_at DESC)`,
      `CREATE TABLE IF NOT EXISTS public.speakers (id bigserial primary key, full_name text NOT NULL, academic_rank text DEFAULT '', email text NOT NULL, phone text, workplace text DEFAULT '', report_title_vn text DEFAULT '', report_title_en text, status text DEFAULT 'Cho duyet', speaker_type text DEFAULT 'Bao cao vien', avatar_url text, passport_url text, abstract_file_url text, report_file_url text, take_care_notes text, cv_file_url text, created_at timestamptz DEFAULT now(), user_id uuid references public.profiles(id) on delete set null)`,
      `CREATE INDEX IF NOT EXISTS speakers_email_idx ON public.speakers(email)`,
      `CREATE INDEX IF NOT EXISTS speakers_status_idx ON public.speakers(status)`,
      `CREATE TABLE IF NOT EXISTS public.program_items (id bigserial primary key, date text NOT NULL, time text, session text, category text, report_title_vn text, report_title_en text, speaker_id bigint references public.speakers on delete set null)`,
      `CREATE INDEX IF NOT EXISTS program_items_date_idx ON public.program_items(date)`,
      `CREATE INDEX IF NOT EXISTS program_items_speaker_id_idx ON public.program_items(speaker_id)`,
      `CREATE TABLE IF NOT EXISTS public.sponsors (id bigserial primary key, name text NOT NULL, sponsorship_package text, amount integer DEFAULT 0, status text DEFAULT 'Cho duyet', logo_url text, contact_person text, email text, phone text, notes text, location text, contract_status text DEFAULT 'Chua co', contract_url text)`,
      `CREATE TABLE IF NOT EXISTS public.finance_transactions (id bigserial primary key, title text NOT NULL, type text NOT NULL, amount integer NOT NULL DEFAULT 0, transaction_date text, handler_id uuid references public.profiles on delete set null, notes text, payment_method text, account text, receipt_url text)`,
      `CREATE INDEX IF NOT EXISTS finance_handler_id_idx ON public.finance_transactions(handler_id)`,
      `CREATE INDEX IF NOT EXISTS finance_type_idx ON public.finance_transactions(type)`,
      `CREATE TABLE IF NOT EXISTS public.tasks (id bigserial primary key, title text NOT NULL, description text, status text DEFAULT 'Cho duyet', due_date text, assignee_id uuid references public.profiles on delete set null, created_at timestamptz DEFAULT now())`,
      `CREATE INDEX IF NOT EXISTS tasks_assignee_id_idx ON public.tasks(assignee_id)`,
      `CREATE INDEX IF NOT EXISTS tasks_status_idx ON public.tasks(status)`,
      `CREATE INDEX IF NOT EXISTS tasks_due_date_idx ON public.tasks(due_date)`,
      `CREATE TABLE IF NOT EXISTS public.event_documents (id bigserial primary key, name text NOT NULL, description text, type text NOT NULL, file_url text NOT NULL, thumbnail_url text, created_at timestamptz DEFAULT now())`,
      `CREATE TABLE IF NOT EXISTS public.email_templates (id bigserial primary key, name text NOT NULL, subject text NOT NULL, body text NOT NULL, module text NOT NULL CHECK (module in ('submissions','speakers')), description text)`,
      `CREATE TABLE IF NOT EXISTS public.settings (id integer PRIMARY KEY DEFAULT 1, sender_name text, sender_email text, oa_id text, oa_secret_key text, access_token text, abitstore_api_url text)`,
      `INSERT INTO public.settings (id) VALUES (1) ON CONFLICT (id) DO NOTHING`,
    ];

    for (const sql of schema) {
      const res = await runQuery(sql);
      const short = sql.replace(/\s+/g, " ").slice(0, 60);
      results.push(res === "ok" ? `OK: ${short}` : `ERR: ${short}: ${res}`);
    }

    // RLS
    const tables = ["profiles","notifications","submissions","speakers","program_items","sponsors","finance_transactions","tasks","event_documents","email_templates","settings","role_permissions"];
    for (const t of tables) {
      await runQuery(`ALTER TABLE public.${t} ENABLE ROW LEVEL SECURITY`);
      results.push(`RLS: ${t}`);
    }

    // Permissions
    const rolePerms: Record<string, string[]> = {
      "Quan tri vien": ["dashboard:view","users:view","users:create","users:edit","users:delete","speakers:view","speakers:create","speakers:edit","speakers:delete","program:view","program:create","program:edit","program:delete","sponsors:view","sponsors:create","sponsors:edit","sponsors:delete","submissions:view","submissions:create","submissions:edit","submissions:delete","submissions:approve","finance:view","finance:create","finance:edit","finance:delete","tasks:view","tasks:create","tasks:edit","tasks:delete","documents:view","documents:create","documents:edit","documents:delete","email:send_bulk","settings:view","settings:edit"],
      "Thanh vien BTC": ["dashboard:view","speakers:view","speakers:create","speakers:edit","speakers:delete","program:view","program:create","program:edit","program:delete","sponsors:view","sponsors:create","sponsors:edit","sponsors:delete","submissions:view","submissions:create","submissions:edit","submissions:delete","submissions:approve","finance:view","finance:create","finance:edit","finance:delete","tasks:view","tasks:create","tasks:edit","tasks:delete","documents:view","documents:create","documents:edit","documents:delete"],
      "Tinh nguyen vien": ["dashboard:view","program:view","tasks:view"],
      "Nhà tài trợ": ["dashboard:view","sponsors:view","sponsors:create","sponsors:edit"],
    };
    for (const [role, perms] of Object.entries(rolePerms)) {
      for (const perm of perms) {
        await runQuery(`INSERT INTO public.role_permissions (role, permission) VALUES ('${role}', '${perm}') ON CONFLICT (role, permission) DO NOTHING`);
      }
      results.push(`PERM: ${role} (${perms.length})`);
    }

    // Templates
    await runQuery(`INSERT INTO public.email_templates (name,subject,body,module,description) VALUES ('payment_confirmed','Xac nhan thanh toan','Kin gui {{ho_ten}},<br><br>Cam on ban da hoan tat thanh toan.<br><br>Ma tham du: <strong>{{id_tham_du}}</strong><br><br>Tran trong, Ban to chuc HSAPS 2025','submissions','Email xac nhan thanh toan') ON CONFLICT DO NOTHING`);
    await runQuery(`INSERT INTO public.email_templates (name,subject,body,module,description) VALUES ('registration_received','Dang ky thanh cong','Kin gui {{ho_ten}},<br><br>Chung toi da nhan duoc dang ky cua ban.<br><br>Tran trong, Ban to chuc HSAPS 2025','submissions','Email xac nhan dang ky') ON CONFLICT DO NOTHING`);
    results.push("Templates inserted");

    conn.close();
    return new Response(JSON.stringify({ success: true, steps: results }, null, 2), { headers: HEADERS });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { headers: HEADERS, status: 500 });
  }
});
