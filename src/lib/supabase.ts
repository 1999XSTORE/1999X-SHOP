import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────
//  STEP 1: Paste your Supabase credentials here
// ─────────────────────────────────────────────
const SUPABASE_URL = 'https://wkjqrjafogufqeasfeev.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
