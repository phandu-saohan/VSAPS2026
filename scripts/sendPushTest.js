import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const userId = process.env.PUSH_TEST_USER_ID;
const title = process.env.PUSH_TEST_TITLE || 'VSAPS 2026';
const body = process.env.PUSH_TEST_BODY || 'Đây là thông báo test từ backend.';
const url = process.env.PUSH_TEST_URL || '/#/notifications';

if (!supabaseUrl || !serviceRoleKey || !userId) {
  throw new Error('Thiếu SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY hoặc PUSH_TEST_USER_ID.');
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function main() {
  const { data, error } = await supabase.functions.invoke('send-push-notification', {
    body: { userId, title, body, url },
  });

  if (error) {
    console.error(error);
    process.exit(1);
  }

  console.log(data);
}

main();
