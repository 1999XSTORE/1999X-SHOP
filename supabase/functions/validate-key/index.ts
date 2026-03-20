// ============================================================
//  KeyAuth Validator v7
//  - Tries version from env first, then falls back to "1.0"
//  - Full raw response in debug so you see exactly what KeyAuth says
//  - _v:7 stamp to confirm new version is deployed
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function tryInit(appName: string, version: string, ownerid: string) {
  const u = new URL('https://keyauth.win/api/1.3/');
  u.searchParams.set('type',    'init');
  u.searchParams.set('ver',     version);
  u.searchParams.set('name',    appName);
  u.searchParams.set('ownerid', ownerid);
  const raw = await (await fetch(u.toString())).text();
  const data = JSON.parse(raw);
  return { data, raw };
}

async function validateKey(
  key: string,
  appName: string,
  version: string,
  ownerid: string,
  label: string,
) {
  if (!ownerid || !appName) {
    return {
      success: false,
      message: `${label}: missing config — appName="${appName}" ownerid_len=${ownerid.length}`,
    };
  }

  // ── INIT — try configured version, fallback to "1.0" ────
  let initData: any;
  let initRaw = '';
  try {
    const first = await tryInit(appName, version, ownerid);
    if (!first.data?.success && version !== '1.0') {
      // retry with 1.0
      const second = await tryInit(appName, '1.0', ownerid);
      initData = second.data;
      initRaw  = second.raw;
    } else {
      initData = first.data;
      initRaw  = first.raw;
    }
  } catch (e) {
    return { success: false, message: `${label} init network error: ${String(e)}` };
  }

  if (!initData?.success) {
    return {
      success: false,
      message: `${label} init failed: ${initData?.message ?? 'unknown'}`,
      debug: { initRaw: initRaw.slice(0, 200) },
    };
  }

  // ── LICENSE CHECK ────────────────────────────────────────
  let licData: any;
  let licRaw = '';
  try {
    const u = new URL('https://keyauth.win/api/1.3/');
    u.searchParams.set('type',      'license');
    u.searchParams.set('key',       key);
    u.searchParams.set('sessionid', initData.sessionid);
    u.searchParams.set('name',      appName);
    u.searchParams.set('ownerid',   ownerid);
    licRaw = await (await fetch(u.toString())).text();
    licData = JSON.parse(licRaw);
  } catch (e) {
    return { success: false, message: `${label} license network error: ${String(e)}` };
  }

  if (!licData?.success) {
    return {
      success: false,
      message: licData?.message ?? 'Key not found',
      debug: {
        keyauth_said: licRaw.slice(0, 300),
        key_preview:  key.slice(0, 6) + '***',
        key_length:   key.length,
      },
    };
  }

  // ── EXTRACT INFO ─────────────────────────────────────────
  const subs   = licData.info?.subscriptions ?? [];
  const expiry = subs.length > 0
    ? String(subs[0].expiry ?? '0')
    : String(licData.info?.expiry ?? '0');

  if (expiry && expiry !== '0') {
    const ms = parseInt(expiry) * 1000;
    if (!isNaN(ms) && ms > 0 && ms < Date.now()) {
      return { success: false, message: `${label} key expired` };
    }
  }

  return {
    success: true,
    message: 'Activated!',
    info: {
      username:      licData.info?.username   ?? '',
      ip:            licData.info?.ip         ?? '',
      hwid:          licData.info?.hwid       ?? '',
      createdate:    licData.info?.createdate ?? '',
      lastlogin:     licData.info?.lastlogin  ?? '',
      expiry,
      subscriptions: subs,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  try {
    const { key, appName } = await req.json();

    if (!key) {
      return new Response(
        JSON.stringify({ success: false, message: 'No key provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 },
      );
    }

    const SHARED      = Deno.env.get('KA_OWNERID')      ?? '';
    const LAG_OWNERID = Deno.env.get('KA_LAG_OWNERID')  ?? SHARED;
    const LAG_APPID   = Deno.env.get('KA_LAG_APPID')    ?? '';
    const LAG_VER     = Deno.env.get('KA_LAG_VERSION')  ?? '1.0';
    const INT_OWNERID = Deno.env.get('KA_INT_OWNERID')  ?? SHARED;
    const INT_APPID   = Deno.env.get('KA_INT_APPID')    ?? '';
    const INT_VER     = Deno.env.get('KA_INT_VERSION')  ?? '1.0';

    if (appName === 'lag') {
      const r = await validateKey(key, LAG_APPID, LAG_VER, LAG_OWNERID, 'LAG');
      return new Response(JSON.stringify(r), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }
    if (appName === 'internal') {
      const r = await validateKey(key, INT_APPID, INT_VER, INT_OWNERID, 'INTERNAL');
      return new Response(JSON.stringify(r), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Both — one success is enough
    const lagResult  = await validateKey(key, LAG_APPID, LAG_VER, LAG_OWNERID, 'LAG');
    const intResult  = await validateKey(key, INT_APPID, INT_VER, INT_OWNERID, 'INTERNAL');
    const anySuccess = lagResult.success || intResult.success;

    let errMsg = 'Invalid license key';
    if (!anySuccess) {
      const skip = ['Key not found', 'Invalid license key', 'missing config', 'not configured'];
      const lagOk = !skip.some(s => lagResult.message.includes(s));
      const intOk = !skip.some(s => intResult.message.includes(s));
      errMsg = lagOk ? lagResult.message : intOk ? intResult.message : `LAG: ${lagResult.message} | INT: ${intResult.message}`;
    }

    return new Response(
      JSON.stringify({ _v: 7, lag: lagResult, internal: intResult, anySuccess, message: anySuccess ? 'OK' : errMsg }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: 'Server error: ' + String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 },
    );
  }
});
