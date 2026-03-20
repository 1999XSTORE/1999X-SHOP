// ============================================================
//  Supabase Edge Function — KeyAuth Key Validator
//  Validates key against LAG app, INTERNAL app, or BOTH
//  Secrets stay server-side, never exposed to browser
// ============================================================

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function validateKeyAuth(
  key: string,
  appName: string,
  appVersion: string,
  ownerid: string
): Promise<{ success: boolean; message?: string; info?: any }> {
  try {
    // Step 1: init session
    const initUrl = `https://keyauth.win/api/1.3/?type=init&ver=${encodeURIComponent(appVersion)}&name=${encodeURIComponent(appName)}&ownerid=${encodeURIComponent(ownerid)}`;
    const initRes  = await fetch(initUrl);
    const initData = await initRes.json();

    if (!initData.success) {
      return { success: false, message: 'App init failed: ' + (initData.message ?? 'unknown') };
    }

    const sessionid = initData.sessionid;

    // Step 2: validate key (license endpoint)
    const licUrl  = `https://keyauth.win/api/1.3/?type=license&key=${encodeURIComponent(key)}&sessionid=${encodeURIComponent(sessionid)}&name=${encodeURIComponent(appName)}&ownerid=${encodeURIComponent(ownerid)}`;
    const licRes  = await fetch(licUrl);
    const licData = await licRes.json();

    if (!licData.success) {
      return { success: false, message: licData.message ?? 'Invalid license key' };
    }

    // Extract expiry from subscriptions array
    const subs   = licData.info?.subscriptions ?? [];
    const expiry = subs[0]?.expiry ?? '';

    return {
      success: true,
      info: {
        username:   licData.info?.username   ?? '',
        ip:         licData.info?.ip         ?? '',
        hwid:       licData.info?.hwid        ?? '',
        createdate: licData.info?.createdate  ?? '',
        lastlogin:  licData.info?.lastlogin   ?? '',
        expiry,
        subscriptions: subs,
      },
    };
  } catch (e) {
    return { success: false, message: 'Network error: ' + String(e) };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { key, appName } = body;   // appName: 'lag' | 'internal' | 'both'

    if (!key) {
      return new Response(
        JSON.stringify({ success: false, message: 'No key provided' }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 400 }
      );
    }

    // ── Read secrets — note separate owner IDs for each app ──
    const LAG_OWNERID  = Deno.env.get('KA_LAG_OWNERID')  ?? Deno.env.get('KA_OWNERID') ?? '';
    const LAG_APPID    = Deno.env.get('KA_LAG_APPID')    ?? '';
    const LAG_VERSION  = Deno.env.get('KA_LAG_VERSION')  ?? '1.0';

    const INT_OWNERID  = Deno.env.get('KA_INT_OWNERID')  ?? Deno.env.get('KA_OWNERID') ?? '';
    const INT_APPID    = Deno.env.get('KA_INT_APPID')    ?? '';
    const INT_VERSION  = Deno.env.get('KA_INT_VERSION')  ?? '1.0';

    if (appName === 'lag') {
      // Validate against LAG app only
      const result = await validateKeyAuth(key, LAG_APPID, LAG_VERSION, LAG_OWNERID);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (appName === 'internal') {
      // Validate against INTERNAL app only
      const result = await validateKeyAuth(key, INT_APPID, INT_VERSION, INT_OWNERID);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // appName === 'both' — try both in parallel, return results independently
    const [lagResult, intResult] = await Promise.all([
      validateKeyAuth(key, LAG_APPID, LAG_VERSION, LAG_OWNERID),
      validateKeyAuth(key, INT_APPID, INT_VERSION, INT_OWNERID),
    ]);

    return new Response(
      JSON.stringify({
        lag:      lagResult,
        internal: intResult,
        // At least one must succeed for overall success
        anySuccess: lagResult.success || intResult.success,
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ success: false, message: 'Server error: ' + String(err) }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});
