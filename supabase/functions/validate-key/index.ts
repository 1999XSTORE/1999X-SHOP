// ============================================================
//  KeyAuth Validator — Multi-App Profile Edition
//  Each panel_type maps to its own isolated credentials.
//  The edge function NEVER mixes credentials between apps.
//
//  Required Supabase secrets:
//    KA_LAG_APPNAME   — Fake Lag app name (exact, case-sensitive)
//    KA_LAG_OWNERID   — Fake Lag owner ID
//    KA_LAG_VERSION   — Fake Lag app version (e.g. "1.0")
//
//    KA_INT_APPNAME   — Internal app name (exact, case-sensitive)
//    KA_INT_OWNERID   — Internal owner ID
//    KA_INT_VERSION   — Internal app version (e.g. "1.0")
//
//  Request body: { key: string, panel_type: "lag" | "internal" }
// ============================================================

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// ── Application profile — all credentials for one KeyAuth app ──
interface AppProfile {
  appName:  string;
  ownerid:  string;
  version:  string;
  label:    string;
}

// ── Load profile from env — completely isolated per app ─────────
function loadProfile(panelType: 'lag' | 'internal'): AppProfile {
  if (panelType === 'lag') {
    return {
      appName: Deno.env.get('KA_LAG_APPNAME')  ?? '',
      ownerid: Deno.env.get('KA_LAG_OWNERID')  ?? '',
      version: Deno.env.get('KA_LAG_VERSION')  ?? '1.0',
      label:   'Fake Lag',
    };
  }
  return {
    appName: Deno.env.get('KA_INT_APPNAME')  ?? '',
    ownerid: Deno.env.get('KA_INT_OWNERID')  ?? '',
    version: Deno.env.get('KA_INT_VERSION')  ?? '1.0',
    label:   'Internal',
  };
}

// ── Validate a key against one specific app profile ─────────────
async function validateAgainstProfile(key: string, profile: AppProfile) {
  const { appName, ownerid, version, label } = profile;

  // Guard — profile must be fully configured
  if (!appName || !ownerid) {
    return {
      success: false,
      message: `${label} app is not configured. Set KA_${label === 'Fake Lag' ? 'LAG' : 'INT'}_APPNAME and KA_${label === 'Fake Lag' ? 'LAG' : 'INT'}_OWNERID in Supabase secrets.`,
    };
  }

  // ── Step 1: Init this specific app — get a fresh sessionid ────
  let initData: any;
  try {
    const url = new URL('https://keyauth.win/api/1.3/');
    url.searchParams.set('type',    'init');
    url.searchParams.set('ver',     version);
    url.searchParams.set('name',    appName);
    url.searchParams.set('ownerid', ownerid);
    const text = await (await fetch(url.toString())).text();
    initData = JSON.parse(text);
  } catch (e) {
    return { success: false, message: `${label}: init request failed — ${String(e)}` };
  }

  if (!initData?.success) {
    return { success: false, message: `${label}: ${initData?.message ?? 'Init failed'}` };
  }

  // ── Step 2: License check using THIS app's sessionid only ──────
  let licData: any;
  try {
    const url = new URL('https://keyauth.win/api/1.3/');
    url.searchParams.set('type',      'license');
    url.searchParams.set('key',       key);
    url.searchParams.set('sessionid', initData.sessionid);
    url.searchParams.set('name',      appName);
    url.searchParams.set('ownerid',   ownerid);
    // Do NOT send hwid — empty string causes rejection on some configs
    const text = await (await fetch(url.toString())).text();
    licData = JSON.parse(text);
  } catch (e) {
    return { success: false, message: `${label}: license request failed — ${String(e)}` };
  }

  if (!licData?.success) {
    return { success: false, message: licData?.message ?? 'Invalid key' };
  }

  // ── Extract subscription & expiry ──────────────────────────────
  const subs   = licData.info?.subscriptions ?? [];
  const expiry = String(subs[0]?.expiry ?? licData.info?.expiry ?? '0');

  return {
    success: true,
    message: 'Activated!',
    info: {
      username:      licData.info?.username   ?? '',
      ip:            licData.info?.ip         ?? '',
      hwid:          licData.info?.hwid       ?? '',
      lastlogin:     licData.info?.lastlogin  ?? '',
      createdate:    licData.info?.createdate ?? '',
      expiry,
      subscriptions: subs,
    },
  };
}

// ── Main handler ───────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const respond = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  try {
    const body = await req.json();
    const key        = (body.key        ?? '').trim();
    const panelType  = (body.panel_type ?? body.appName ?? '').trim().toLowerCase();

    if (!key) return respond({ success: false, message: 'No key provided' }, 400);

    // ── Single panel mode: validate against ONLY the requested app ─
    if (panelType === 'lag') {
      const profile = loadProfile('lag');
      const result  = await validateAgainstProfile(key, profile);
      return respond(result);
    }

    if (panelType === 'internal') {
      const profile = loadProfile('internal');
      const result  = await validateAgainstProfile(key, profile);
      return respond(result);
    }

    // ── Both mode: validate each app independently in parallel ─────
    // Each uses its OWN credentials — zero cross-contamination
    const [lagResult, intResult] = await Promise.all([
      validateAgainstProfile(key, loadProfile('lag')),
      validateAgainstProfile(key, loadProfile('internal')),
    ]);

    return respond({
      lag:        lagResult,
      internal:   intResult,
      anySuccess: lagResult.success || intResult.success,
    });

  } catch (err) {
    return respond({ success: false, message: 'Server error: ' + String(err) }, 500);
  }
});
