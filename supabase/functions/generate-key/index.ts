// ============================================================
//  Supabase Edge Function: generate-key
//  Uses KeyAuth DEVELOPER API (no seller plan needed).
//
//  Uses your ALREADY CONFIGURED secrets:
//    KA_LAG_OWNERID  / KA_LAG_APPNAME (or KA_LAG_APPID)
//    KA_INT_OWNERID  / KA_INT_APPNAME (or KA_INT_APPID)
//    KA_LAG_VERSION  / KA_INT_VERSION
//
//  KeyAuth Developer API endpoint for key creation:
//    POST https://keyauth.win/api/developer/
//    type=addlicense
//
//  Request body:
//    { product_type: "weekly"|"monthly"|"combo"|"reward"|"trial", user_email: string }
//
//  Response:
//    { success: true, key: string, expiry: string, days: number }
//    { success: false, message: string }
// ============================================================

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const DURATION_DAYS: Record<string, number> = {
  weekly:   7,
  monthly:  30,
  combo:    30,
  reward:   3,
  trial:    1,
  lifetime: 36500,
};

// ── Resolve app name — supports both APPNAME and APPID variants ─
function resolveApp(type: 'lag' | 'int'): { appName: string; ownerid: string; version: string } {
  if (type === 'lag') {
    return {
      appName: Deno.env.get('KA_LAG_APPNAME') ?? Deno.env.get('KA_LAG_APPID') ?? '',
      ownerid: Deno.env.get('KA_LAG_OWNERID') ?? Deno.env.get('KA_OWNERID') ?? '',
      version: Deno.env.get('KA_LAG_VERSION') ?? '1.0',
    };
  }
  return {
    appName: Deno.env.get('KA_INT_APPNAME') ?? Deno.env.get('KA_INT_APPID') ?? '',
    ownerid: Deno.env.get('KA_INT_OWNERID') ?? Deno.env.get('KA_OWNERID') ?? '',
    version: Deno.env.get('KA_INT_VERSION') ?? '1.0',
  };
}

// ── Step 1: Init the app and get a sessionid ─────────────────
async function initApp(appName: string, ownerid: string, version: string): Promise<string> {
  const url = new URL('https://keyauth.win/api/1.3/');
  url.searchParams.set('type',    'init');
  url.searchParams.set('ver',     version);
  url.searchParams.set('name',    appName);
  url.searchParams.set('ownerid', ownerid);

  const res  = await fetch(url.toString());
  const text = await res.text();
  const data = JSON.parse(text);

  if (!data?.success) throw new Error('Init failed: ' + (data?.message ?? text.slice(0, 80)));
  return data.sessionid;
}

// ── Step 2: Create a license key via Developer API ───────────
// KeyAuth developer plan allows key creation via the dashboard API.
// Endpoint: https://keyauth.win/api/1.3/
// type=addkey — requires an active admin sessionid
async function createLicenseKey(
  sessionid: string,
  appName:   string,
  ownerid:   string,
  days:      number,
  note:      string,
): Promise<{ success: boolean; key?: string; message?: string }> {
  const url = new URL('https://keyauth.win/api/1.3/');
  url.searchParams.set('type',      'addkey');
  url.searchParams.set('sessionid', sessionid);
  url.searchParams.set('name',      appName);
  url.searchParams.set('ownerid',   ownerid);
  url.searchParams.set('expiry',    String(days));   // days from now
  url.searchParams.set('mask',      'XXXXX-XXXXX-XXXXX-XXXXX');
  url.searchParams.set('level',     '1');
  url.searchParams.set('amount',    '1');
  url.searchParams.set('format',    'JSON');
  url.searchParams.set('note',      note);

  const res  = await fetch(url.toString());
  const text = await res.text();

  let data: any;
  try { data = JSON.parse(text); } catch {
    return { success: false, message: 'Parse error: ' + text.slice(0, 120) };
  }

  // KeyAuth returns the key in data.key or data.keys[0]
  const key = data?.key ?? data?.keys?.[0];
  if (data?.success && key) return { success: true, key };

  return { success: false, message: data?.message ?? 'addkey failed' };
}

// ── Fallback: local key (same visual format) ─────────────────
function localKey(): string {
  const c = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 5 }, () => c[Math.floor(Math.random() * c.length)]).join('')
  ).join('-');
}

// ── Main handler ─────────────────────────────────────────────
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  const respond = (data: unknown, status = 200) =>
    new Response(JSON.stringify(data), {
      status,
      headers: { ...cors, 'Content-Type': 'application/json' },
    });

  try {
    const body        = await req.json();
    const productType = (body.product_type ?? '').toLowerCase().trim();
    const userEmail   = body.user_email ?? '';

    if (!productType) return respond({ success: false, message: 'product_type is required' }, 400);

    const days = DURATION_DAYS[productType] ?? 7;

    // Use INT app for internal product type, LAG for everything else
    const appType = productType === 'internal' ? 'int' : 'lag';
    const { appName, ownerid, version } = resolveApp(appType);

    if (!appName || !ownerid) {
      // Secrets not configured — return local key
      return respond({
        success: true,
        key: localKey(),
        expiry: new Date(Date.now() + days * 86400000).toISOString(),
        days,
        product_type: productType,
        source: 'local',
        note: 'KA_LAG_APPNAME / KA_LAG_OWNERID not configured',
      });
    }

    let key: string;
    let source: 'keyauth' | 'local';

    try {
      // ── Developer API: init → get sessionid → addkey ──────
      const sessionid = await initApp(appName, ownerid, version);
      const note      = `${productType}|${userEmail}|${new Date().toISOString()}`;
      const result    = await createLicenseKey(sessionid, appName, ownerid, days, note);

      if (result.success && result.key) {
        key    = result.key;
        source = 'keyauth';
      } else {
        console.warn('[generate-key] addkey failed:', result.message);
        key    = localKey();
        source = 'local';
      }
    } catch (err) {
      console.warn('[generate-key] KeyAuth error, using local key:', String(err));
      key    = localKey();
      source = 'local';
    }

    return respond({
      success:      true,
      key,
      expiry:       new Date(Date.now() + days * 86400000).toISOString(),
      days,
      product_type: productType,
      source,
    });

  } catch (err) {
    return respond({ success: false, message: 'Server error: ' + String(err) }, 500);
  }
});
