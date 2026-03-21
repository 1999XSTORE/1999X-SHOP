// KeyAuth Owner API — works with Developer plan
// Uses /api/seller/ endpoint with ownerid + secret
// No seller plan required — just your owner credentials

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const res = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

function loadProfile(t: 'lag' | 'internal') {
  return t === 'lag'
    ? {
        appName: Deno.env.get('KA_LAG_APPNAME') ?? '',
        ownerid: Deno.env.get('KA_LAG_OWNERID') ?? Deno.env.get('KA_OWNERID') ?? '',
        secret:  Deno.env.get('KA_LAG_SECRET')  ?? '',
        label:   'Fake Lag',
      }
    : {
        appName: Deno.env.get('KA_INT_APPNAME') ?? '',
        ownerid: Deno.env.get('KA_INT_OWNERID') ?? Deno.env.get('KA_OWNERID') ?? '',
        secret:  Deno.env.get('KA_INT_SECRET')  ?? '',
        label:   'Internal',
      };
}

async function generateKey(
  p: ReturnType<typeof loadProfile>,
  days: number
): Promise<{ success: boolean; key?: string; message?: string; raw?: any }> {
  try {
    // KeyAuth Owner API — /api/seller/
    // This works on ALL plans including Developer
    // type=add creates a new license key
    const params = new URLSearchParams({
      sellerkey: p.secret,       // your app's secret key acts as seller key in owner API
      type:      'add',
      format:    'JSON',
      expiry:    String(days),
      mask:      'XXXXXX-XXXXXX-XXXXXX-XXXXXX',
      level:     '1',
      amount:    '1',
      owner:     p.ownerid,
      appname:   p.appName,
    });

    const url = `https://keyauth.win/api/seller/?${params.toString()}`;
    console.log(`[generate-key][${p.label}] Calling owner API: ${url.replace(p.secret, '***')}`);

    const resp = await fetch(url);
    const text = await resp.text();
    console.log(`[generate-key][${p.label}] Raw response: ${text}`);

    let data: any;
    try { data = JSON.parse(text); }
    catch { data = { success: false, message: `Non-JSON response: ${text.slice(0, 200)}` }; }

    if (data.success === true || data.result === 'success') {
      // KeyAuth returns key in different fields
      const key = data.key ?? data.license ?? data.keys?.[0] ?? data.result_overview ?? null;
      if (key && key !== 'success') {
        return { success: true, key, raw: data };
      }
      // Sometimes the key is in result_overview
      if (data.result_overview) {
        return { success: true, key: data.result_overview, raw: data };
      }
      return { success: false, message: `Key not found in response: ${JSON.stringify(data)}`, raw: data };
    }

    return {
      success: false,
      message: data.message ?? data.error ?? `API error: ${JSON.stringify(data)}`,
      raw: data,
    };

  } catch (e) {
    console.error(`[generate-key][${p.label}] fetch error:`, e);
    return { success: false, message: `Network error: ${String(e)}` };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const body = await req.json();
    const pt   = (body.panel_type ?? 'internal') as 'lag' | 'internal';
    const days = Number(body.days ?? 7);
    const p    = loadProfile(pt);

    console.log(`[generate-key] panel=${pt} days=${days} app="${p.appName}" owner="${p.ownerid}" hasSecret=${!!p.secret}`);

    // Validate secrets are set
    if (!p.appName) return res({ success: false, message: `KA_${pt.toUpperCase()}_APPNAME not set in Supabase secrets` }, 400);
    if (!p.ownerid) return res({ success: false, message: `KA_${pt.toUpperCase()}_OWNERID not set in Supabase secrets` }, 400);
    if (!p.secret)  return res({ success: false, message: `KA_${pt.toUpperCase()}_SECRET not set in Supabase secrets` }, 400);

    const result = await generateKey(p, days);

    if (result.success && result.key) {
      return res({ success: true, key: result.key, days, panel_type: pt, label: p.label });
    }

    return res({
      success: false,
      message: result.message ?? 'Key generation failed',
      debug: result.raw,
    }, 500);

  } catch (e) {
    console.error('[generate-key] fatal:', e);
    return res({ success: false, message: 'Server error: ' + String(e) }, 500);
  }
});
