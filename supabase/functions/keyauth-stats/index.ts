// ============================================================
//  Supabase Edge Function — KeyAuth Stats Proxy
//  Uses KeyAuth fetchStats API to get live user/online counts
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function fetchStats(ownerid: string, appName: string, version: string) {
  try {
    // Step 1: init to get session
    const initUrl = `https://keyauth.win/api/1.3/?type=init&ver=${encodeURIComponent(version)}&name=${encodeURIComponent(appName)}&ownerid=${encodeURIComponent(ownerid)}`;
    const initRes  = await fetch(initUrl);
    const initData = await initRes.json();

    if (!initData.success) return null;

    const sessionid = initData.sessionid;

    // Step 2: fetch app stats using fetchstats endpoint
    const statsUrl  = `https://keyauth.win/api/1.3/?type=fetchstats&sessionid=${encodeURIComponent(sessionid)}&name=${encodeURIComponent(appName)}&ownerid=${encodeURIComponent(ownerid)}`;
    const statsRes  = await fetch(statsUrl);
    const statsData = await statsRes.json();

    if (!statsData.success) return null;

    return {
      status:      'online',
      numUsers:    String(statsData.numUsers    ?? statsData.app?.numUsers    ?? '0'),
      numKeys:     String(statsData.numKeys     ?? statsData.app?.numKeys     ?? '0'),
      onlineUsers: String(statsData.numOnlineUsers ?? statsData.app?.numOnlineUsers ?? '0'),
      version:     String(statsData.version     ?? statsData.app?.version     ?? version),
    };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const LAG_OWNERID = Deno.env.get('KA_LAG_OWNERID') ?? Deno.env.get('KA_OWNERID') ?? '';
    const LAG_APPID   = Deno.env.get('KA_LAG_APPID')   ?? '';
    const LAG_VERSION = Deno.env.get('KA_LAG_VERSION')  ?? '1.0';

    const INT_OWNERID = Deno.env.get('KA_INT_OWNERID') ?? Deno.env.get('KA_OWNERID') ?? '';
    const INT_APPID   = Deno.env.get('KA_INT_APPID')   ?? '';
    const INT_VERSION = Deno.env.get('KA_INT_VERSION')  ?? '1.0';

    const [lag, internal] = await Promise.all([
      fetchStats(LAG_OWNERID, LAG_APPID, LAG_VERSION),
      fetchStats(INT_OWNERID, INT_APPID, INT_VERSION),
    ]);

    const offline = { status: 'offline', numUsers: '0', numKeys: '0', onlineUsers: '0', version: '—' };

    const response = {
      lag:      lag      ?? offline,
      internal: internal ?? offline,
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: 'Internal server error: ' + String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
