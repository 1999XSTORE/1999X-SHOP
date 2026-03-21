-- Key pool table — store pre-generated keys here
-- Run this in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS public.key_pool (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  key         text NOT NULL UNIQUE,
  panel_type  text NOT NULL CHECK (panel_type IN ('lag', 'internal', 'both')),
  days        int  NOT NULL DEFAULT 7,
  status      text NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'used')),
  used_by     uuid REFERENCES auth.users(id),
  used_at     timestamptz,
  created_at  timestamptz DEFAULT now()
);

-- RLS: only service role can read/update (edge function uses service role)
ALTER TABLE public.key_pool ENABLE ROW LEVEL SECURITY;

-- No public read — only edge functions (service role) can access
CREATE POLICY "service_only" ON public.key_pool
  USING (false);

-- Index for fast lookup
CREATE INDEX IF NOT EXISTS key_pool_status_panel ON public.key_pool (panel_type, days, status);
