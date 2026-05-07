// File: supabase/functions/register-speaker-auto-confirm/index.ts

import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });

    const { email, password, full_name, formData } = await req.json();

    if (!email || !password || !full_name) {
      throw new Error("Email, password, and full name are required.");
    }

    // 1. Create user with auto-confirm
    const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // AUTO CONFIRM
      user_metadata: {
        full_name,
        role: 'Báo cáo viên'
      }
    });

    if (authError) throw authError;

    const userId = authData.user.id;

    // 2. Create speaker record linked to the new user
    const { error: speakerError } = await supabaseAdmin
      .from('speakers')
      .insert([{
        ...formData,
        user_id: userId,
        full_name,
        email,
        status: 'Chờ duyệt'
      }]);

    if (speakerError) throw speakerError;

    // 3. Notify admins
    const { data: admins } = await supabaseAdmin
      .from('profiles')
      .select('id')
      .eq('role', 'Quản trị viên');

    if (admins && admins.length > 0) {
      const notifications = admins.map(admin => ({
        user_id: admin.id,
        message: `Báo cáo viên mới đăng ký: ${full_name}`,
        link: '/speakers',
        read: false
      }));
      await supabaseAdmin.from('notifications').insert(notifications);
    }

    return new Response(
      JSON.stringify({ success: true, user: authData.user }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    console.error("Registration error:", error.message);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});
