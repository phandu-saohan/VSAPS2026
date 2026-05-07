// File: supabase/functions/send-email/index.ts
// Gửi email đơn lẻ qua SMTP bằng Nodemailer trong Supabase Edge Function.

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

    const { to, subject, html } = await req.json();
    if (!to || !subject || !html) {
      throw new Error("Thiếu thông tin người nhận, tiêu đề hoặc nội dung email.");
    }

    const transporter = buildTransport();
    await transporter.sendMail({
      from: `${settings.sender_name} <${settings.sender_email}>`,
      to,
      subject,
      html,
    });

    return new Response(
      JSON.stringify({ message: "Email đã được gửi thành công qua SMTP!" }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Send mail error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Gửi email thất bại." }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});