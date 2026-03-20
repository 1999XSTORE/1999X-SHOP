// ============================================================
//  Supabase Edge Function — KeyAuth Key Validator
//  Validates a user's license key against KeyAuth API
//  Secrets stay server-side, never exposed to browser
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { key, appName } = await req.json();

    if (!key) {
      return new Response(JSON.stringify({ success: false, message: 'No key provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      });
    }

    const OWNERID     = Deno.env.get('KA_LAG_OWNERID') ?? '';
    const LAG_NAME    = Deno.env.get('KA_LAG_APPID')   ?? '';
    const LAG_VERSION = Deno.env.get('KA_LAG_VERSION') ?? '1.0';
    const INT_NAME    = Deno.env.get('KA_INT_APPID')   ?? '';
    const INT_VERSION = Deno.env.get('KA_INT_VERSION') ?? '1.0';

    // Determine which app to validate against
    const name    = appName === 'internal' ? INT_NAME    : LAG_NAME;
    const version = appName === 'internal' ? INT_VERSION : LAG_VERSION;

    // Step 1: init to get session
    const initUrl = `https://keyauth.win/api/1.3/?type=init&ver=${version}&name=${encodeURIComponent(name)}&ownerid=${OWNERID}`;
    const initRes = await fetch(initUrl);
    const initData = await initRes.json();

    if (!initData.success) {
      return new Response(JSON.stringify({ success: false, message: 'App init failed: ' + initData.message }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const sessionid = initData.sessionid;

    // Step 2: validate the key
    const licenseUrl = `https://keyauth.win/api/1.3/?type=license&key=${encodeURIComponent(key)}&sessionid=${sessionid}&name=${encodeURIComponent(name)}&ownerid=${OWNERID}`;
    const licenseRes = await fetch(licenseUrl);
    const licenseData = await licenseRes.json();

    if (!licenseData.success) {
      return new Response(JSON.stringify({ success: false, message: licenseData.message ?? 'Invalid license key' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Return safe license info (no secrets)
    return new Response(JSON.stringify({
      success: true,
      message: 'License activated!',
      info: {
        username:   licenseData.info?.username   ?? '',
        subscriptions: licenseData.info?.subscriptions ?? [],
        ip:         licenseData.info?.ip         ?? '',
        hwid:       licenseData.info?.hwid        ?? '',
        createdate: licenseData.info?.createdate  ?? '',
        lastlogin:  licenseData.info?.lastlogin   ?? '',
        expiry:     licenseData.info?.subscriptions?.[0]?.expiry ?? '',
      },
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: 'Server error: ' + err }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});
