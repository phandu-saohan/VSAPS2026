import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'http://127.0.0.1:54321'; // local supabase URL
// For admin tasks, we need the service role key.
// Let's check if the user is already in the database using the Postgres pool instead to bypass RLS.
import pg from 'pg';
const { Pool } = pg;

const pool = new Pool({
  connectionString: 'postgresql://postgres:postgres@127.0.0.1:54322/postgres'
});

async function makeAdmin() {
  try {
    const email = 'admin@admin.com';
    const role = 'Quản trị viên';
    
    const res = await pool.query(
      'UPDATE public.profiles SET role = $1 WHERE email = $2 RETURNING *',
      [role, email]
    );
    
    if (res.rows.length > 0) {
      console.log('Successfully updated profile:', res.rows[0]);
    } else {
      console.log('Profile not found for email:', email);
    }
  } catch (err) {
    console.error('Error updating profile:', err.message);
  } finally {
    await pool.end();
  }
}

makeAdmin();
