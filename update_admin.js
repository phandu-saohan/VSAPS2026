import { createClient } from '@supabase/supabase-js';

const supabase = createClient('http://vsaps2026-pre0225supabase-8e734b-72-61-123-73.traefik.me', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE');

async function makeAdmin() {
  const { data: { user }, error: signInError } = await supabase.auth.signInWithPassword({
    email: 'admin@admin.com',
    password: 'password123',
  });
  
  if (signInError) {
      console.log('Login failed, trying to sign up...');
      const { data, error } = await supabase.auth.signUp({
          email: 'admin@admin.com',
          password: 'password123',
          options: {
              data: {
                  full_name: 'Admin'
              }
          }
      });
      if(error) {
          console.error('Error signing up:', error.message);
      } else {
          console.log('Signup success:', data.user?.id);
      }
  } else {
      console.log('Logged in successfully', user.id);
  }

  // We cannot bypass RLS without the service_role key to update the profile directly.
  // We'll write a SQL script that the user can execute on their Supabase dashboard.
}

makeAdmin();
