// ============================================================
//  Supabase Edge Function — KeyAuth Stats Proxy
//  Your secrets stay here on the server. Frontend never sees them.
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // ── Read secrets from Supabase Secrets (never exposed to frontend) ──
    const LAG_OWNERID  = Deno.env.get('KA_LAG_OWNERID')   ?? '';
    const LAG_APPID    = Deno.env.get('KA_LAG_APPID')     ?? '';
    const LAG_SECRET   = Deno.env.get('KA_LAG_SECRET')    ?? '';
    const LAG_VERSION  = Deno.env.get('KA_LAG_VERSION')   ?? '1.0';

    const INT_OWNERID  = Deno.env.get('KA_INT_OWNERID')   ?? '';
    const INT_APPID    = Deno.env.get('KA_INT_APPID')     ?? '';
    const INT_SECRET   = Deno.env.get('KA_INT_SECRET')    ?? '';
    const INT_VERSION  = Deno.env.get('KA_INT_VERSION')   ?? '1.0';

    // ── Fetch stats from KeyAuth for both apps ──
    const fetchStats = async (ownerid: string, appid: string, version: string) => {
      try {
        const url = `https://keyauth.win/api/1.3/?type=fetchstats&ownerid=${ownerid}&appid=${appid}&version=${version}`;
        const res = await fetch(url);
        if (!res.ok) return null;
        const data = await res.json();
        return data.success ? data : null;
      } catch {
        return null;
      }
    };

    const [lag, internal] = await Promise.all([
      fetchStats(LAG_OWNERID, LAG_APPID, LAG_VERSION),
      fetchStats(INT_OWNERID, INT_APPID, INT_VERSION),
    ]);

    // ── Return ONLY the safe public data (no secrets ever returned) ──
    const response = {
      lag: lag ? {
        status:      'online',
        numUsers:    lag.numUsers        ?? '0',
        numKeys:     lag.numKeys         ?? '0',
        onlineUsers: lag.numOnlineUsers  ?? '0',
        version:     lag.version         ?? '1.0',
      } : { status: 'offline', numUsers: '0', numKeys: '0', onlineUsers: '0', version: '—' },

      internal: internal ? {
        status:      'online',
        numUsers:    internal.numUsers       ?? '0',
        numKeys:     internal.numKeys        ?? '0',
        onlineUsers: internal.numOnlineUsers ?? '0',
        version:     internal.version        ?? '1.0',
      } : { status: 'offline', numUsers: '0', numKeys: '0', onlineUsers: '0', version: '—' },
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
