// ============================================================
//  Supabase Edge Function — KeyAuth Stats
//  Fetches live user/online counts for both apps
//  Uses KeyAuth v1.3 API with proper session flow
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function getAppStats(ownerid: string, appName: string, version: string) {
  try {
    if (!ownerid || !appName) return null;

    // Step 1: init to get sessionid
    const initParams = new URLSearchParams({
      type: 'init',
      ver: version,
      name: appName,
      ownerid: ownerid,
    });
    const initRes  = await fetch(`https://keyauth.win/api/1.3/?${initParams}`);
    const initData = await initRes.json();

    if (!initData.success) {
      console.error('Init failed for', appName, ':', initData.message);
      return null;
    }

    const sessionid = initData.sessionid;

    // Step 2: fetch app stats via fetchstats
    const statsParams = new URLSearchParams({
      type: 'fetchstats',
      sessionid,
      name: appName,
      ownerid: ownerid,
    });
    const statsRes  = await fetch(`https://keyauth.win/api/1.3/?${statsParams}`);
    const statsData = await statsRes.json();

    if (!statsData.success) {
      console.error('Fetchstats failed for', appName, ':', statsData.message);
      return null;
    }

    // KeyAuth returns numUsers, numOnlineUsers, numKeys in the response
    const appInfo = statsData.appinfo ?? statsData;
    return {
      status:      'online',
      numUsers:    String(appInfo.numUsers       ?? appInfo.registered ?? '0'),
      numKeys:     String(appInfo.numKeys        ?? '0'),
      onlineUsers: String(appInfo.numOnlineUsers ?? appInfo.online     ?? '0'),
      version:     String(appInfo.version        ?? version),
    };
  } catch (e) {
    console.error('Error fetching stats for', appName, ':', e);
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // Support separate owner IDs per app, fallback to shared KA_OWNERID
    const LAG_OWNERID = Deno.env.get('KA_LAG_OWNERID') ?? Deno.env.get('KA_OWNERID') ?? '';
    const LAG_APPID   = Deno.env.get('KA_LAG_APPID')   ?? '';
    const LAG_VERSION = Deno.env.get('KA_LAG_VERSION')  ?? '1.0';

    const INT_OWNERID = Deno.env.get('KA_INT_OWNERID') ?? Deno.env.get('KA_OWNERID') ?? '';
    const INT_APPID   = Deno.env.get('KA_INT_APPID')   ?? '';
    const INT_VERSION = Deno.env.get('KA_INT_VERSION')  ?? '1.0';

    // Fetch both in parallel
    const [lag, internal] = await Promise.all([
      getAppStats(LAG_OWNERID, LAG_APPID, LAG_VERSION),
      getAppStats(INT_OWNERID, INT_APPID, INT_VERSION),
    ]);

    const offline = {
      status: 'offline', numUsers: '0',
      numKeys: '0', onlineUsers: '0', version: '—',
    };

    return new Response(
      JSON.stringify({ lag: lag ?? offline, internal: internal ?? offline }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
