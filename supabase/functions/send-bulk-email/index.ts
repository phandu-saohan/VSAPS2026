// File: supabase/functions/send-bulk-email/index.ts
// Gửi email hàng loạt qua SMTP bằng Nodemailer trong Supabase Edge Function.

declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import nodemailer from "npm:nodemailer@6.9.16";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

type Recipient = {
  email: string;
  name?: string;
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

  return nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
  });
};

const validateRecipient = (recipient: Recipient) => {
  if (!recipient?.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipient.email)) {
    throw new Error(`Email không hợp lệ: ${recipient?.email || "(trống)"}`);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("settings")
      .select("sender_name, sender_email")
      .eq("id", 1)
      .single();

    if (settingsError || !settings?.sender_email || !settings?.sender_name) {
      throw new Error("Thông tin 'Tên người gửi' và 'Email người gửi' chưa được cấu hình trong Cài đặt Email.");
    }

    const { recipients, subject, html } = await req.json();
    if (!Array.isArray(recipients) || recipients.length === 0 || !subject || !html) {
      throw new Error("Thiếu danh sách người nhận, tiêu đề hoặc nội dung email.");
    }

    const transporter = buildTransport();
    const results: Array<{ email: string; success: boolean; error?: string }> = [];

    for (const recipient of recipients as Recipient[]) {
      validateRecipient(recipient);

      try {
        await transporter.sendMail({
          from: `${settings.sender_name} <${settings.sender_email}>`,
          to: recipient.email,
          subject,
          html: html
            .replace(/{{name}}/g, recipient.name || "")
            .replace(/{{email}}/g, recipient.email),
        });
        results.push({ email: recipient.email, success: true });
      } catch (error) {
        results.push({
          email: recipient.email,
          success: false,
          error: error instanceof Error ? error.message : "Gửi thất bại.",
        });
      }
    }

    const failedCount = results.filter((item) => !item.success).length;
    return new Response(
      JSON.stringify({
        message: `Đã xử lý ${results.length} email.`,
        failedCount,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: failedCount > 0 ? 207 : 200,
      },
    );
  } catch (error) {
    console.error("Bulk send mail error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Gửi email thất bại." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});