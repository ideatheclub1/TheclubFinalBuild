// supabase.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://atqhyfedxsxttnwnyzpd.supabase.co'; // replace with your Project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF0cWh5ZmVkeHN4dHRud255enBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI2MTUyMzksImV4cCI6MjA2ODE5MTIzOX0.jyQGtuGss18LzXnCrdZmWLNlti1ejIIicTAZkbGVv70'; // replace with your anon/public key

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
