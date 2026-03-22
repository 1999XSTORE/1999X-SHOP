-- ============================================================
--  Trial Key Records
--  One trial per Gmail UID — server-enforced
-- ============================================================

CREATE TABLE IF NOT EXISTS public.trial_keys (
  id         uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id    uuid NOT NULL REFERENCES auth.users(id) UNIQUE,
  user_email text NOT NULL,
  lag_key    text NOT NULL DEFAULT '',
  internal_key text NOT NULL DEFAULT '',
  expires_at timestamptz NOT NULL,
  generated_at timestamptz DEFAULT now()
);

ALTER TABLE public.trial_keys ENABLE ROW LEVEL SECURITY;

-- Users can only read their own trial record
CREATE POLICY "users_own_trial" ON public.trial_keys
  FOR SELECT USING (auth.uid() = user_id);

-- Users can insert (but UNIQUE on user_id means only one row ever)
CREATE POLICY "users_insert_trial" ON public.trial_keys
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- No updates — trial is immutable once generated
CREATE INDEX IF NOT EXISTS trial_keys_user ON public.trial_keys (user_id);
