import { createClient } from '@supabase/supabase-js';

// ─────────────────────────────────────────────
//  STEP 1: Paste your Supabase credentials here
// ─────────────────────────────────────────────
const SUPABASE_URL = 'YOUR_SUPABASE_URL';        // e.g. https://xxxx.supabase.co
const SUPABASE_ANON_KEY = 'YOUR_SUPABASE_ANON_KEY'; // long key from Supabase dashboard

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
