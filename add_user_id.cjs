const { Client } = require('pg');
const client = new Client({
  host: 'vsaps2026-pre0225supabase-64f45c-72-61-123-73.traefik.me',
  port: 5434,
  user: 'postgres',
  password: 'qgagmo3uuwzhygul0pdufth4ab6s8iv3',
  database: 'postgres',
  connectionTimeoutMillis: 5000,
});

async function run() {
  try {
    await client.connect();
    console.log('Connected to DB');
  } catch(e) {
    console.error('Connection error:', e);
    process.exit(1);
  }
  
  try {
    await client.query('ALTER TABLE public.submissions ADD COLUMN user_id uuid references public.profiles(id) on delete set null');
    console.log('Added user_id column to submissions');
  } catch (e) {
    console.log('Error adding user_id to submissions (might already exist): ' + e.message);
  }
  
  try {
    await client.query("NOTIFY pgrst, 'reload schema'");
    console.log('Reloaded schema cache');
  } catch (e) {
    console.log('Error reloading schema cache: ' + e.message);
  }
  await client.end();
}
run();
