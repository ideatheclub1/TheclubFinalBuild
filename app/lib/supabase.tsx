// supabase.js
import { createClient } from '@supabase/supabase-js';

export const SUPABASE_URL = 'https://jbcxrqyzyuhhmolsxtrx.supabase.co'; // Updated Project URL
export const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiY3hycXl6eXVoaG1vbHN4dHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjY5MDcsImV4cCI6MjA2OTQwMjkwN30.3RMmCW1IYW1UJz-MLns2Qf_xHCTvdhmlan-Plet-K8g';

// Create Supabase client with minimal, stable configuration
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  },
  realtime: {
    params: {
      eventsPerSecond: 5
    }
  },
  global: {
    headers: {
      'x-client-info': 'the-club-app@1.0.0'
    }
  }
});

// Test connection on initialization with timeout
const connectionTest = Promise.race([
  supabase.from('user_profiles').select('id').limit(1),
  new Promise((_, reject) => 
    setTimeout(() => reject(new Error('Initialization test timeout')), 3000)
  )
]);

connectionTest.then(({ data, error }: any) => {
  if (error) {
    console.error('❌ Supabase connection test failed:', error);
  } else {
    console.log('✅ Supabase connection test successful:', data?.length, 'records found');
  }
}).catch(err => {
  console.error('❌ Supabase connection test error:', err.message);
});
