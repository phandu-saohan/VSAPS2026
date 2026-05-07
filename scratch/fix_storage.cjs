const { createClient } = require('@supabase/supabase-js');
const https = require('https');
const fetch = require('node-fetch');

// Use self-signed cert workaround
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const supabaseUrl = 'http://vsaps2026-pre0225supabase-64f45c-72-61-123-73.traefik.me';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJhbm9uIiwKICAgICJpc3MiOiAic3VwYWJhc2UtZGVtbyIsCiAgICAiaWF0IjogMTY0MTc2OTIwMCwKICAgICJleHAiOiAxNzk5NTM1NjAwCn0.dc_X5iR_VP_qT0zsiyj_I_OZ2T9FtRU2BBNWN8Bu4GE';

// Use service role key to manage buckets
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyAgCiAgICAicm9sZSI6ICJzZXJ2aWNlX3JvbGUiLAogICAgImlzcyI6ICJzdXBhYmFzZS1kZW1vIiwKICAgICJpYXQiOiAxNjQxNzY5MjAwLAogICAgImV4cCI6IDE3OTk1MzU2MDAKfQ.DaYlNEoUrrEn2Ig7tqibS-PHK5vgusbcbo7X4D0pe38';

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function checkAndFixBucket() {
  console.log('Checking storage buckets...');
  
  const { data: buckets, error: listError } = await supabase.storage.listBuckets();
  
  if (listError) {
    console.error('Error listing buckets:', listError.message);
    return;
  }
  
  console.log('Existing buckets:', buckets?.map(b => `${b.name} (public: ${b.public})`));
  
  const eventAssets = buckets?.find(b => b.name === 'event_assets');
  
  if (!eventAssets) {
    console.log('Bucket event_assets NOT found. Creating...');
    const { data, error } = await supabase.storage.createBucket('event_assets', {
      public: true,
      allowedMimeTypes: ['image/*', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/vnd.ms-powerpoint', 'application/vnd.openxmlformats-officedocument.presentationml.presentation'],
      fileSizeLimit: 10485760, // 10MB
    });
    if (error) {
      console.error('Failed to create bucket:', error.message);
    } else {
      console.log('Bucket created!', data);
    }
  } else {
    console.log('Bucket event_assets EXISTS. Public:', eventAssets.public);
    if (!eventAssets.public) {
      console.log('Making bucket public...');
      const { error } = await supabase.storage.updateBucket('event_assets', { public: true });
      if (error) {
        console.error('Failed to make public:', error.message);
      } else {
        console.log('Bucket is now public!');
      }
    }
  }
  
  // Now test upload with anon key
  const anonClient = createClient(supabaseUrl, supabaseKey);
  const testContent = 'hello';
  const { data: uploadData, error: uploadError } = await anonClient.storage
    .from('event_assets')
    .upload('speakers/avatar_url/test_anon.txt', testContent, { contentType: 'text/plain', upsert: true });
  
  if (uploadError) {
    console.log('\n[ANON UPLOAD TEST] FAILED:', uploadError.message);
    console.log('Storage policies may be too restrictive. Creating permissive policy...');
  } else {
    console.log('\n[ANON UPLOAD TEST] SUCCESS! Anon upload works.');
    // Clean up test file
    await supabase.storage.from('event_assets').remove(['speakers/avatar_url/test_anon.txt']);
  }
}

checkAndFixBucket().catch(console.error);
