// ============================================================
//  Supabase Edge Function — KeyAuth Key Validator v3
//  Fixed: removed empty hwid (causes rejection), key sent as-is
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function validateKey(
  key: string,
  appName: string,
  version: string,
  ownerid: string,
  label: string,
): Promise<{ success: boolean; message: string; info?: any; debug?: any }> {

  if (!ownerid || !appName) {
    return {
      success: false,
      message: `${label} secrets not configured (missing ownerid or appName)`,
      debug: { ownerid: !!ownerid, appName: !!appName },
    };
  }

  try {
    // Step 1: Init app to get sessionid
    const initUrl = new URL('https://keyauth.win/api/1.3/');
    initUrl.searchParams.set('type',    'init');
    initUrl.searchParams.set('ver',     version);
    initUrl.searchParams.set('name',    appName);
    initUrl.searchParams.set('ownerid', ownerid);

    const initRes  = await fetch(initUrl.toString(), { method: 'GET' });
    const initText = await initRes.text();
    let initData: any;
    try { initData = JSON.parse(initText); } catch {
      return { success: false, message: `${label} init parse error: ${initText.slice(0, 200)}` };
    }

    if (!initData.success) {
      return {
        success: false,
        message: `${label} app init failed: ${initData.message ?? 'unknown'}`,
        debug: { initData },
      };
    }

    const sessionid = initData.sessionid;

    // Step 2: License login — DO NOT send hwid param at all.
    // Sending hwid='' causes KeyAuth to reject with "Key validation failed".
    // Omitting it lets KeyAuth auto-assign HWID on first use.
    const licUrl = new URL('https://keyauth.win/api/1.3/');
    licUrl.searchParams.set('type',      'license');
    licUrl.searchParams.set('key',       key);
    licUrl.searchParams.set('sessionid', sessionid);
    licUrl.searchParams.set('name',      appName);
    licUrl.searchParams.set('ownerid',   ownerid);

    const licRes  = await fetch(licUrl.toString(), { method: 'GET' });
    const licText = await licRes.text();
    let licData: any;
    try { licData = JSON.parse(licText); } catch {
      return { success: false, message: `${label} license parse error: ${licText.slice(0, 200)}` };
    }

    if (!licData.success) {
      return {
        success: false,
        message: licData.message ?? 'Invalid license key',
        debug: { licData },
      };
    }

    // Extract subscription info
    const subs   = licData.info?.subscriptions ?? [];
    const expiry = subs.length > 0 ? subs[0].expiry : (licData.info?.expiry ?? '');

    if (expiry) {
      const expiryMs = parseInt(expiry) * 1000;
      if (expiryMs < Date.now()) {
        return {
          success: false,
          message: `${label} key is expired`,
          debug: { expiry, now: Date.now() },
        };
      }
    }

    return {
      success: true,
      message: 'License activated!',
      info: {
        username:      licData.info?.username   ?? '',
        ip:            licData.info?.ip         ?? '',
        hwid:          licData.info?.hwid       ?? '',
        createdate:    licData.info?.createdate ?? '',
        lastlogin:     licData.info?.lastlogin  ?? '',
        expiry:        String(expiry),
        subscriptions: subs,
      },
      debug: { label, success: true },
    };

  } catch (e) {
    return {
      success: false,
      message: `${label} network error: ${String(e)}`,
      debug: { error: String(e) },
    };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { key, appName } = body;

    if (!key) {
      return new Response(
        JSON.stringify({ success: false, message: 'No key provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    const SHARED_OWNERID = Deno.env.get('KA_OWNERID') ?? '';

    const LAG_OWNERID = Deno.env.get('KA_LAG_OWNERID') ?? SHARED_OWNERID;
    const LAG_APPID   = Deno.env.get('KA_LAG_APPID')   ?? '';
    const LAG_VERSION = Deno.env.get('KA_LAG_VERSION')  ?? '1.0';

    const INT_OWNERID = Deno.env.get('KA_INT_OWNERID') ?? SHARED_OWNERID;
    const INT_APPID   = Deno.env.get('KA_INT_APPID')   ?? '';
    const INT_VERSION = Deno.env.get('KA_INT_VERSION')  ?? '1.0';

    if (appName === 'lag') {
      const result = await validateKey(key, LAG_APPID, LAG_VERSION, LAG_OWNERID, 'LAG');
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (appName === 'internal') {
      const result = await validateKey(key, INT_APPID, INT_VERSION, INT_OWNERID, 'INTERNAL');
      return new Response(JSON.stringify(result), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Both — run sequentially to avoid KeyAuth rate limiting
    const lagResult = await validateKey(key, LAG_APPID, LAG_VERSION, LAG_OWNERID, 'LAG');
    const intResult = await validateKey(key, INT_APPID, INT_VERSION, INT_OWNERID, 'INTERNAL');

    const anySuccess = lagResult.success || intResult.success;

    return new Response(
      JSON.stringify({
        lag:      lagResult,
        internal: intResult,
        anySuccess,
        message: anySuccess ? 'OK' : (lagResult.message !== 'Invalid license key' ? lagResult.message : intResult.message),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: 'Server error: ' + String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
