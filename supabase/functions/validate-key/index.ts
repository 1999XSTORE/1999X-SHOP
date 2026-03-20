// ============================================================
//  Supabase Edge Function — KeyAuth Key Validator v4
//  Full debug logging — shows exact KeyAuth raw responses
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
      message: `${label} secrets not configured`,
      debug: {
        problem: 'Missing env vars',
        ownerid_set: !!ownerid,
        appName_set: !!appName,
        ownerid_len: ownerid.length,
        appName_val: appName || '(empty)',
      },
    };
  }

  // ── Step 1: Init ──────────────────────────────────────────
  let initData: any;
  let initRaw = '';
  try {
    const initUrl = new URL('https://keyauth.win/api/1.3/');
    initUrl.searchParams.set('type',    'init');
    initUrl.searchParams.set('ver',     version);
    initUrl.searchParams.set('name',    appName);
    initUrl.searchParams.set('ownerid', ownerid);

    const initRes = await fetch(initUrl.toString());
    initRaw = await initRes.text();
    initData = JSON.parse(initRaw);
  } catch (e) {
    return {
      success: false,
      message: `${label} init failed`,
      debug: { step: 'init', error: String(e), raw: initRaw.slice(0, 300) },
    };
  }

  if (!initData?.success) {
    return {
      success: false,
      message: `${label} init: ${initData?.message ?? 'unknown error'}`,
      debug: { step: 'init', initData },
    };
  }

  const sessionid = initData.sessionid;

  // ── Step 2: License ───────────────────────────────────────
  // KeyAuth requires the key in its original format (with dashes).
  // DO NOT send hwid param — empty string causes rejection.
  let licData: any;
  let licRaw = '';
  let licUrlStr = '';
  try {
    const licUrl = new URL('https://keyauth.win/api/1.3/');
    licUrl.searchParams.set('type',      'license');
    licUrl.searchParams.set('key',       key);
    licUrl.searchParams.set('sessionid', sessionid);
    licUrl.searchParams.set('name',      appName);
    licUrl.searchParams.set('ownerid',   ownerid);
    licUrlStr = licUrl.toString();

    const licRes = await fetch(licUrlStr);
    licRaw = await licRes.text();
    licData = JSON.parse(licRaw);
  } catch (e) {
    return {
      success: false,
      message: `${label} license call failed`,
      debug: { step: 'license', error: String(e), raw: licRaw.slice(0, 300) },
    };
  }

  if (!licData?.success) {
    return {
      success: false,
      message: licData?.message ?? 'Invalid license key',
      debug: {
        step: 'license',
        keyauth_response: licData,
        raw_response: licRaw.slice(0, 500),
        key_length: key.length,
        key_preview: key.slice(0, 4) + '****',
      },
    };
  }

  // ── Extract subscription info ─────────────────────────────
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
    const LAG_OWNERID    = Deno.env.get('KA_LAG_OWNERID') ?? SHARED_OWNERID;
    const LAG_APPID      = Deno.env.get('KA_LAG_APPID')   ?? '';
    const LAG_VERSION    = Deno.env.get('KA_LAG_VERSION')  ?? '1.0';
    const INT_OWNERID    = Deno.env.get('KA_INT_OWNERID') ?? SHARED_OWNERID;
    const INT_APPID      = Deno.env.get('KA_INT_APPID')   ?? '';
    const INT_VERSION    = Deno.env.get('KA_INT_VERSION')  ?? '1.0';

    if (appName === 'lag') {
      const r = await validateKey(key, LAG_APPID, LAG_VERSION, LAG_OWNERID, 'LAG');
      return new Response(JSON.stringify(r), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (appName === 'internal') {
      const r = await validateKey(key, INT_APPID, INT_VERSION, INT_OWNERID, 'INTERNAL');
      return new Response(JSON.stringify(r), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

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
