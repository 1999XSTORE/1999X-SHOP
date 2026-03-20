// ============================================================
//  Supabase Edge Function — KeyAuth Key Validator
//  Validates against BOTH lag and internal apps
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function validateKeyAuth(key: string, name: string, version: string, ownerid: string) {
  try {
    // Step 1: init
    const initUrl = `https://keyauth.win/api/1.3/?type=init&ver=${version}&name=${encodeURIComponent(name)}&ownerid=${ownerid}`;
    const initRes  = await fetch(initUrl);
    const initData = await initRes.json();
    if (!initData.success) return { success: false, message: 'App init failed: ' + initData.message };

    const sessionid = initData.sessionid;

    // Step 2: validate license key
    const licUrl  = `https://keyauth.win/api/1.3/?type=license&key=${encodeURIComponent(key)}&sessionid=${sessionid}&name=${encodeURIComponent(name)}&ownerid=${ownerid}`;
    const licRes  = await fetch(licUrl);
    const licData = await licRes.json();

    if (!licData.success) return { success: false, message: licData.message ?? 'Invalid key' };

    return {
      success: true,
      info: {
        username:      licData.info?.username   ?? '',
        subscriptions: licData.info?.subscriptions ?? [],
        ip:            licData.info?.ip         ?? '',
        hwid:          licData.info?.hwid        ?? '',
        createdate:    licData.info?.createdate  ?? '',
        lastlogin:     licData.info?.lastlogin   ?? '',
        expiry:        licData.info?.subscriptions?.[0]?.expiry ?? '',
      },
    };
  } catch (e) {
    return { success: false, message: 'Network error: ' + e };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { key, appName } = await req.json();
    if (!key) {
      return new Response(JSON.stringify({ success: false, message: 'No key provided' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400,
      });
    }

    const OWNERID     = Deno.env.get('KA_OWNERID')      ?? '';
    const LAG_NAME    = Deno.env.get('KA_LAG_APPID')    ?? '';
    const LAG_VERSION = Deno.env.get('KA_LAG_VERSION')  ?? '1.0';
    const INT_NAME    = Deno.env.get('KA_INT_APPID')    ?? '';
    const INT_VERSION = Deno.env.get('KA_INT_VERSION')  ?? '1.0';

    if (appName === 'internal') {
      const result = await validateKeyAuth(key, INT_NAME, INT_VERSION, OWNERID);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Default: lag
    const result = await validateKeyAuth(key, LAG_NAME, LAG_VERSION, OWNERID);
    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (err) {
    return new Response(JSON.stringify({ success: false, message: 'Server error: ' + err }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500,
    });
  }
});
