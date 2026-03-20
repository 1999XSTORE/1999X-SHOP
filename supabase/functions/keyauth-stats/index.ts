// ============================================================
//  Supabase Edge Function — KeyAuth Stats v3
//  Fetches live stats — handles all KeyAuth response formats
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getStats(ownerid: string, appName: string, version: string) {
  if (!ownerid || !appName) {
    return { status: 'offline', numUsers: '0', numKeys: '0', onlineUsers: '0', version: '—', error: 'Missing config' };
  }

  try {
    // Step 1: init
    const initParams = new URLSearchParams({ type: 'init', ver: version, name: appName, ownerid });
    const initRes  = await fetch(`https://keyauth.win/api/1.3/?${initParams.toString()}`);
    const initText = await initRes.text();
    let initData: any;
    try { initData = JSON.parse(initText); } catch { return { status: 'offline', numUsers: '0', numKeys: '0', onlineUsers: '0', version: '—', error: 'Init parse fail: ' + initText.slice(0,80) }; }

    if (!initData.success) {
      return { status: 'offline', numUsers: '0', numKeys: '0', onlineUsers: '0', version: '—', error: 'Init failed: ' + initData.message };
    }

    // Step 2: fetchstats
    const statsParams = new URLSearchParams({ type: 'fetchstats', sessionid: initData.sessionid, name: appName, ownerid });
    const statsRes  = await fetch(`https://keyauth.win/api/1.3/?${statsParams.toString()}`);
    const statsText = await statsRes.text();
    let statsData: any;
    try { statsData = JSON.parse(statsText); } catch { return { status: 'offline', numUsers: '0', numKeys: '0', onlineUsers: '0', version: '—', error: 'Stats parse fail: ' + statsText.slice(0,80) }; }

    if (!statsData.success) {
      return { status: 'offline', numUsers: '0', numKeys: '0', onlineUsers: '0', version: '—', error: 'Stats failed: ' + statsData.message };
    }

    // KeyAuth returns stats in different places depending on version
    // Try all known field locations
    const src = statsData.appinfo ?? statsData.app ?? statsData;

    const numUsers    = String(src.numUsers       ?? src.registered   ?? src.users   ?? statsData.numUsers    ?? '0');
    const numKeys     = String(src.numKeys        ?? src.keys         ?? statsData.numKeys    ?? '0');
    const onlineUsers = String(src.numOnlineUsers ?? src.onlineUsers  ?? src.online  ?? statsData.numOnlineUsers ?? statsData.online ?? '0');
    const ver         = String(src.version        ?? statsData.version ?? version);

    return {
      status:      'online',
      numUsers,
      numKeys,
      onlineUsers,
      version:     ver,
      // include raw for debugging
      _raw:        statsData,
    };
  } catch (e) {
    return { status: 'offline', numUsers: '0', numKeys: '0', onlineUsers: '0', version: '—', error: String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const SHARED    = Deno.env.get('KA_OWNERID')     ?? '';
    const LAG_OID   = Deno.env.get('KA_LAG_OWNERID') ?? SHARED;
    const LAG_APP   = Deno.env.get('KA_LAG_APPID')   ?? '';
    const LAG_VER   = Deno.env.get('KA_LAG_VERSION') ?? '1.0';
    const INT_OID   = Deno.env.get('KA_INT_OWNERID') ?? SHARED;
    const INT_APP   = Deno.env.get('KA_INT_APPID')   ?? '';
    const INT_VER   = Deno.env.get('KA_INT_VERSION') ?? '1.0';

    const [lag, internal] = await Promise.all([
      getStats(LAG_OID, LAG_APP, LAG_VER),
      getStats(INT_OID, INT_APP, INT_VER),
    ]);

    return new Response(JSON.stringify({ lag, internal }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
