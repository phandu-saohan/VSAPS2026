declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

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
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { oa_id, access_token } = await req.json().catch(() => ({}));

    const { data: settings, error: settingsError } = await supabaseAdmin
      .from("settings")
      .select("oa_id, access_token")
      .eq("id", 1)
      .single();

    const tokenToUse = access_token || settings?.access_token;
    const oaIdToUse = oa_id || settings?.oa_id;

    if (!oaIdToUse || !tokenToUse) {
      throw new Error("Vui lòng lưu OA ID và Access Token trước khi kiểm tra kết nối.");
    }

    const response = await fetch(`https://openapi.zalo.me/v2.0/oa/getoa?access_token=${encodeURIComponent(tokenToUse)}`, {
      method: "GET",
    });

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data?.error_message || data?.message || "Zalo trả về lỗi khi kiểm tra kết nối.");
    }

    return new Response(
      JSON.stringify({
        message: `Kết nối Zalo thành công cho OA ${oaIdToUse}.`,
        data,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 200 },
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 },
    );
  }
});
