import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────
//  STEP 1: Paste your Supabase credentials here
// ─────────────────────────────────────────────
const SUPABASE_URL = 'https://awjouzwzdkrevvnlenvn.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3am91end6ZGtyZXZ2bmxlbnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTg4MjEsImV4cCI6MjA5MDAzNDgyMX0._I_I-WA_8-YqDfaRzKiVgpEAhkH9faxlEIV6e766A0M';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
