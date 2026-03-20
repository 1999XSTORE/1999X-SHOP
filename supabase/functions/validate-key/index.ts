const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

async function validateKey(key: string, appName: string, version: string, ownerid: string) {
  if (!ownerid || !appName) {
    return { success: false, message: `App not configured: appName="${appName}"` };
  }

  // Step 1: Init — get sessionid
  const initUrl = `https://keyauth.win/api/1.3/?type=init&ver=${version}&name=${encodeURIComponent(appName)}&ownerid=${encodeURIComponent(ownerid)}`;
  const initText = await (await fetch(initUrl)).text();
  let init: any;
  try { init = JSON.parse(initText); } catch { return { success: false, message: 'Init parse error: ' + initText.slice(0, 80) }; }
  if (!init.success) return { success: false, message: 'Init failed: ' + (init.message ?? 'unknown') };

  // Step 2: License — validate key (no hwid param)
  const licUrl = `https://keyauth.win/api/1.3/?type=license&key=${encodeURIComponent(key)}&sessionid=${init.sessionid}&name=${encodeURIComponent(appName)}&ownerid=${encodeURIComponent(ownerid)}`;
  const licText = await (await fetch(licUrl)).text();
  let lic: any;
  try { lic = JSON.parse(licText); } catch { return { success: false, message: 'License parse error: ' + licText.slice(0, 80) }; }
  if (!lic.success) return { success: false, message: lic.message ?? 'Invalid key' };

  const subs   = lic.info?.subscriptions ?? [];
  const expiry = subs[0]?.expiry ?? lic.info?.expiry ?? '0';

  return {
    success: true,
    message: 'Activated!',
    info: {
      username:      lic.info?.username   ?? '',
      ip:            lic.info?.ip         ?? '',
      hwid:          lic.info?.hwid       ?? '',
      lastlogin:     lic.info?.lastlogin  ?? '',
      createdate:    lic.info?.createdate ?? '',
      expiry:        String(expiry),
      subscriptions: subs,
    },
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });
  const json = (data: any, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });

  try {
    const { key, appName } = await req.json();
    if (!key) return json({ success: false, message: 'No key provided' }, 400);

    const SHARED = Deno.env.get('KA_OWNERID') ?? '';
    const LAG_OID = Deno.env.get('KA_LAG_OWNERID') ?? SHARED;
    const LAG_APP = Deno.env.get('KA_LAG_APPID')   ?? '';
    const LAG_VER = Deno.env.get('KA_LAG_VERSION')  ?? '1.0';
    const INT_OID = Deno.env.get('KA_INT_OWNERID') ?? SHARED;
    const INT_APP = Deno.env.get('KA_INT_APPID')   ?? '';
    const INT_VER = Deno.env.get('KA_INT_VERSION')  ?? '1.0';

    if (appName === 'lag')      return json(await validateKey(key, LAG_APP, LAG_VER, LAG_OID));
    if (appName === 'internal') return json(await validateKey(key, INT_APP, INT_VER, INT_OID));

    // both
    const [lag, internal] = await Promise.all([
      validateKey(key, LAG_APP, LAG_VER, LAG_OID),
      validateKey(key, INT_APP, INT_VER, INT_OID),
    ]);
    return json({ lag, internal, anySuccess: lag.success || internal.success });

  } catch (e) {
    return json({ success: false, message: 'Server error: ' + String(e) }, 500);
  }
});
