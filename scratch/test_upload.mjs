import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const supabaseUrl = 'https://vsaps2026-pre0225supabase-64f45c-72-61-123-73.traefik.me';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE'; // Extracted from error logs previously
const supabase = createClient(supabaseUrl, supabaseKey);

async function testUpload() {
  const fileContent = 'test';
  const { data, error } = await supabase.storage.from('event_assets').upload('speakers/avatar_url/test.txt', fileContent, { contentType: 'text/plain' });
  console.log('Upload result:', data, error);
}

testUpload();
