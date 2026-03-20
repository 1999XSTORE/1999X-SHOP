// ============================================================
//  Supabase Edge Function — KeyAuth Key Validator v5
//  - Validates against both apps independently
//  - One success = overall success (key belongs to one app)
//  - No hwid param sent (empty string causes rejection)
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
      message: `${label} not configured`,
      debug: { problem: 'Missing env vars', ownerid_set: !!ownerid, appName_val: appName || '(empty)' },
    };
  }

  // Step 1: Init
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
    return { success: false, message: `${label} init error`, debug: { error: String(e), raw: initRaw.slice(0, 200) } };
  }

  if (!initData?.success) {
    return {
      success: false,
      message: `${label} init failed: ${initData?.message ?? 'unknown'}`,
      debug: { initData },
    };
  }

  const sessionid = initData.sessionid;

  // Step 2: License check — no hwid param, KeyAuth assigns on first use
  let licData: any;
  let licRaw = '';
  try {
    const licUrl = new URL('https://keyauth.win/api/1.3/');
    licUrl.searchParams.set('type',      'license');
    licUrl.searchParams.set('key',       key);
    licUrl.searchParams.set('sessionid', sessionid);
    licUrl.searchParams.set('name',      appName);
    licUrl.searchParams.set('ownerid',   ownerid);
    const licRes = await fetch(licUrl.toString());
    licRaw = await licRes.text();
    licData = JSON.parse(licRaw);
  } catch (e) {
    return { success: false, message: `${label} license error`, debug: { error: String(e), raw: licRaw.slice(0, 200) } };
  }

  if (!licData?.success) {
    return {
      success: false,
      message: licData?.message ?? 'Key not found',
      debug: { keyauth_response: licData, raw: licRaw.slice(0, 400), key_len: key.length },
    };
  }

  // Extract expiry from subscriptions or direct field
  const subs   = licData.info?.subscriptions ?? [];
  const expiry = subs.length > 0 ? subs[0].expiry : (licData.info?.expiry ?? '');

  // Only block if expiry is explicitly set AND in the past
  if (expiry && expiry !== '0') {
    const expiryMs = parseInt(expiry) * 1000;
    if (!isNaN(expiryMs) && expiryMs > 0 && expiryMs < Date.now()) {
      return { success: false, message: `${label} key expired`, debug: { expiry } };
    }
  }

  return {
    success: true,
    message: 'Activated!',
    info: {
      username:   licData.info?.username   ?? '',
      ip:         licData.info?.ip         ?? '',
      hwid:       licData.info?.hwid       ?? '',
      createdate: licData.info?.createdate ?? '',
      lastlogin:  licData.info?.lastlogin  ?? '',
      expiry:     String(expiry),
      subscriptions: subs,
    },
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

    // Single app mode
    if (appName === 'lag') {
      const r = await validateKey(key, LAG_APPID, LAG_VERSION, LAG_OWNERID, 'LAG');
      return new Response(JSON.stringify(r), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (appName === 'internal') {
      const r = await validateKey(key, INT_APPID, INT_VERSION, INT_OWNERID, 'INTERNAL');
      return new Response(JSON.stringify(r), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Both mode — validate each independently, one success = good
    const lagResult = await validateKey(key, LAG_APPID, LAG_VERSION, LAG_OWNERID, 'LAG');
    const intResult = await validateKey(key, INT_APPID, INT_VERSION, INT_OWNERID, 'INTERNAL');
    const anySuccess = lagResult.success || intResult.success;

    // If neither succeeded, return the most useful error message
    let errorMessage = 'Invalid license key';
    if (!anySuccess) {
      const lagMsg = lagResult.message ?? '';
      const intMsg = intResult.message ?? '';
      // Prefer a message that isn't generic
      const genericMsgs = ['Key not found', 'Invalid license key', 'not configured'];
      const lagIsGeneric = genericMsgs.some(m => lagMsg.includes(m));
      const intIsGeneric = genericMsgs.some(m => intMsg.includes(m));
      if (!lagIsGeneric) errorMessage = lagMsg;
      else if (!intIsGeneric) errorMessage = intMsg;
      else errorMessage = `${lagMsg} | ${intMsg}`;
    }

    return new Response(
      JSON.stringify({ lag: lagResult, internal: intResult, anySuccess, message: anySuccess ? 'OK' : errorMessage }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: 'Server error: ' + String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
