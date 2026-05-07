declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

import { serve } from 'https://deno.land/std@0.177.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
const vapidPublicKey = Deno.env.get('VAPID_PUBLIC_KEY') ?? '';
const vapidPrivateKey = Deno.env.get('VAPID_PRIVATE_KEY') ?? '';
const vapidSubject = Deno.env.get('VAPID_SUBJECT') ?? 'mailto:admin@vsaps2026.local';

webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

const toNodeBuffer = (value: string | ArrayBuffer | null | undefined) => {
  if (!value) return null;
  if (typeof value === 'string') return Buffer.from(value, 'base64');
  return Buffer.from(value as ArrayBuffer);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    if (!supabaseUrl || !serviceRoleKey) {
      throw new Error('Thiếu SUPABASE_URL hoặc SUPABASE_SERVICE_ROLE_KEY.');
    }
    if (!vapidPublicKey || !vapidPrivateKey) {
      throw new Error('Thiếu VAPID_PUBLIC_KEY hoặc VAPID_PRIVATE_KEY.');
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
    const { userId, title, body, url } = await req.json();

    if (!userId || !title || !body) {
      throw new Error('Thiếu userId, title hoặc body.');
    }

    const { data: subscriptions, error } = await supabaseAdmin
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', userId);

    if (error) throw error;

    if (!subscriptions?.length) {
      return new Response(JSON.stringify({ message: 'Không có subscription.' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const payload = JSON.stringify({ title, body, url: url ?? '/' });
    let sent = 0;

    for (const subscriptionRow of subscriptions) {
      const subscription = subscriptionRow.subscription_json;
      const p256dh = subscriptionRow.p256dh_key ? toNodeBuffer(subscriptionRow.p256dh_key) : null;
      const auth = subscriptionRow.auth_key ? toNodeBuffer(subscriptionRow.auth_key) : null;

      const pushSubscription = {
        endpoint: subscription.endpoint,
        expirationTime: subscription.expirationTime ?? null,
        keys: {
          p256dh: p256dh ? p256dh.toString('base64') : subscription.keys?.p256dh,
          auth: auth ? auth.toString('base64') : subscription.keys?.auth,
        },
      };

      try {
        await webpush.sendNotification(pushSubscription, payload);
        sent += 1;
      } catch (pushError) {
        console.error('Push send failed:', pushError);
      }
    }

    return new Response(JSON.stringify({ sent }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Push failed' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
