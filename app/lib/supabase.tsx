// supabase.js
import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://jbcxrqyzyuhhmolsxtrx.supabase.co'; // Updated Project URL
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImpiY3hycXl6eXVoaG1vbHN4dHJ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM4MjY5MDcsImV4cCI6MjA2OTQwMjkwN30.3RMmCW1IYW1UJz-MLns2Qf_xHCTvdhmlan-Plet-K8g';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
