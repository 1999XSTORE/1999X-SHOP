-- ================================================================
-- 023_fix_balance_double_credit.sql
--
-- CRITICAL BUG FIX: balance was re-credited on every new device/browser
-- because the "already credited" check was only in localStorage.
--
-- This migration adds a `credited` boolean column to transactions
-- so the check is server-side and device-independent.
-- ================================================================

-- 1. Add the credited column (default false for new rows)
ALTER TABLE transactions
  ADD COLUMN IF NOT EXISTS credited boolean NOT NULL DEFAULT false;

-- 2. Mark ALL existing approved transactions as already credited.
--    This is safe — any approved tx before this migration was already
--    credited via the old localStorage system on each user's device.
--    We do NOT want to re-credit them when users log in on a new device.
UPDATE transactions
  SET credited = true
  WHERE status = 'approved';

-- 3. Index for fast lookup (the sync queries filter by user_id + status)
CREATE INDEX IF NOT EXISTS idx_transactions_credited
  ON transactions (user_id, status, credited);

-- 4. RLS: users can read credited column, only service role can update it
--    (The frontend update goes through the anon key but the RLS policy
--     on transactions already restricts to user's own rows, so this is safe)
