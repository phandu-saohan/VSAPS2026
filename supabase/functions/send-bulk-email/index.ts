// File: supabase/functions/send-bulk-email/index.ts
// Gửi email hàng loạt qua SMTP bằng cách lặp từng người nhận.

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient, SupabaseClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Recipient = {
  email: string;
  name?: string;
};

const BATCH_SIZE = 10;
const CONCURRENCY = 3;

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const checkPermissions = async (req: Request, supabaseClient: SupabaseClient): Promise<void> => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) throw new Error("Missing auth header.");

  const { data: { user } } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));
  if (!user) throw new Error("Invalid JWT.");

  const { data: profile, error } = await supabaseClient
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (error || !profile) throw new Error("Could not retrieve user profile.");
  if (profile.role === "Quản trị viên") return;

  const { data: permissions, error: permError } = await supabaseClient
    .from("role_permissions")
    .select("permission")
    .eq("role", profile.role)
    .eq("permission", "email:send_bulk");

  if (permError || !permissions || permissions.length === 0) {
    throw new Error("User does not have 'email:send_bulk' permission.");
  }
};

const buildTransport = () => {
  const host = Deno.env.get("SMTP_HOST");
  const port = Number(Deno.env.get("SMTP_PORT") || 587);
  const user = Deno.env.get("SMTP_USER");
  const pass = Deno.env.get("SMTP_PASSWORD");
  const secure = (Deno.env.get("SMTP_SECURE") || "false").toLowerCase() === "true";

  if (!host || !user || !pass) {
    throw new Error("Thiếu cấu hình SMTP. Cần SMTP_HOST, SMTP_PORT, SMTP_USER và SMTP_PASSWORD.");
  }

  return nodemailer.createTransport({ host, port, secure, auth: { user, pass } });
};

const sendBatch = async (
  transporter: ReturnType<typeof nodemailer.createTransport>,
  fromAddress: string,
  recipients: Recipient[],
  subject: string,
  html: string,
) => {
  const jobs = recipients.map(async (recipient) => {
    const personalizedHtml = html
      .replace(/{{name}}/g, recipient.name || "")
      .replace(/{{email}}/g, recipient.email);

    await transporter.sendMail({
      from: fromAddress,
      to: recipient.email,
      subject,
      html: personalizedHtml,
    });

    return recipient.email;
  });

  return Promise.allSettled(jobs);
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Thiếu các biến môi trường cần thiết (SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY).");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    await checkPermissions(req, supabaseAdmin);

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("settings")
      .select("sender_name, sender_email")
      .eq("id", 1)
      .single();

    if (settingsError || !settings?.sender_email || !settings?.sender_name) {
      throw new Error("Tên và email người gửi chưa được cấu hình trong Cài đặt.");
    }

    const { recipients, subject, html } = await req.json();
    if (!Array.isArray(recipients) || recipients.length === 0 || !subject || !html) {
      throw new Error("Thiếu các trường bắt buộc: recipients (mảng), subject, html.");
    }

    const transporter = buildTransport();
    const fromAddress = `${settings.sender_name} <${settings.sender_email}>`;
    let successfulSends = 0;
    const allErrors: string[] = [];

    for (let i = 0; i < recipients.length; i += BATCH_SIZE) {
      const batch = recipients.slice(i, i + BATCH_SIZE) as Recipient[];
      const results = await sendBatch(transporter, fromAddress, batch, subject, html);

      results.forEach((result, index) => {
        if (result.status === "fulfilled") {
          successfulSends += 1;
          return;
        }
        const recipient = batch[index];
        const reason = result.reason instanceof Error ? result.reason.message : String(result.reason);
        allErrors.push(`${recipient.email}: ${reason}`);
      });

      if (i + BATCH_SIZE < recipients.length) {
        await sleep(200);
      }
    }

    if (allErrors.length > 0) {
      throw new Error(`Hoàn thành với lỗi. Đã gửi: ${successfulSends}/${recipients.length}. Lỗi: ${allErrors.join(", ")}`);
    }

    return new Response(JSON.stringify({ message: `Đã gửi thành công ${successfulSends} email qua SMTP.` }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Gửi email thất bại.";
    console.error("Bulk mail error:", message);
    const isPermissionError = message.includes("permission") || message.includes("JWT");
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: isPermissionError ? 403 : 500,
    });
  }
});
