// Checks if a key is already bound to a different Gmail
// Uses service role to bypass RLS — only returns blocked:true/false, never exposes emails
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { key, user_email } = await req.json();
    if (!key || !user_email) {
      return new Response(JSON.stringify({ blocked: false }), { headers: { ...cors, 'Content-Type': 'application/json' } });
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { data, error } = await supabase
      .from('key_bindings')
      .select('user_email')
      .eq('key', key)
      .maybeSingle();

    if (error || !data) {
      // No binding found — key is free to use
      return new Response(JSON.stringify({ blocked: false }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Key is bound — check if it's the same user
    if (data.user_email === user_email) {
      // Same Gmail — allow (re-activation after logout etc.)
      return new Response(JSON.stringify({ blocked: false, existing_email: data.user_email }), {
        headers: { ...cors, 'Content-Type': 'application/json' },
      });
    }

    // Different Gmail — block
    return new Response(JSON.stringify({ blocked: true }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  } catch (e) {
    return new Response(JSON.stringify({ blocked: false, error: String(e) }), {
      headers: { ...cors, 'Content-Type': 'application/json' },
    });
  }
});
