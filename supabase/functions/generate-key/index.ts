// ============================================================
//  generate-key — KeyAuth Seller API
//  Supports: days (integer) and hours (0 = use expiry_hours)
//  For 1-hour keys: pass { days: 0, hours: 1, mask: '...' }
// ============================================================
const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const body = await req.json();
    const pt    = (body.panel_type ?? 'internal') as 'lag' | 'internal';
    const days  = Number(body.days ?? 7);
    const hours = Number(body.hours ?? 0);
    const mask  = (body.mask ?? '1999X*******').trim();

    // Each panel has its own seller key and app name
    const sellerKey = pt === 'lag'
      ? (Deno.env.get('KA_LAG_SELLER_KEY') ?? Deno.env.get('KA_SELLER_KEY') ?? '')
      : (Deno.env.get('KA_INT_SELLER_KEY') ?? Deno.env.get('KA_SELLER_KEY') ?? '');

    const appName = pt === 'lag'
      ? (Deno.env.get('KA_LAG_APPNAME') ?? '')
      : (Deno.env.get('KA_INT_APPNAME') ?? '');

    console.log(`[generate-key] panel=${pt} days=${days} hours=${hours} app="${appName}"`);

    if (!sellerKey) return json({ success: false, message: `Seller key not set for ${pt}` }, 400);
    if (!appName)   return json({ success: false, message: `App name not set for ${pt}` }, 400);

    // KeyAuth expiry: for < 1 day, use expiry in minutes
    // KeyAuth seller API: expiry param is in DAYS for add, but we can use "expiry" in minutes via type=addtime
    // We use type=add with expiry in days; for hours we use fractional or pass as minutes via a custom approach.
    // KeyAuth v1 seller API accepts "expiry" as number of days (float supported).
    // 1 hour = 1/24 days ≈ 0.041667 — use this for sub-day keys.
    let expiryParam: string;
    if (hours > 0 && days === 0) {
      // Sub-day key: express as fraction of a day
      expiryParam = (hours / 24).toFixed(6);
    } else {
      expiryParam = String(days);
    }

    const url = [
      'https://keyauth.win/api/seller/',
      `?sellerkey=${encodeURIComponent(sellerKey)}`,
      `&type=add`,
      `&expiry=${expiryParam}`,
      `&mask=${encodeURIComponent(mask)}`,
      `&level=1`,
      `&amount=1`,
      `&format=text`,
      `&appname=${encodeURIComponent(appName)}`,
    ].join('');

    const resp = await fetch(url);
    const raw  = (await resp.text()).trim();
    console.log(`[${pt}][${days}d/${hours}h] response: "${raw}"`);

    const isError = (
      raw.length === 0 ||
      raw.toLowerCase().startsWith('error') ||
      raw.toLowerCase().includes('invalid') ||
      raw.toLowerCase().includes('failed') ||
      raw.includes('<html') ||
      raw.startsWith('{')
    );

    if (!isError) {
      return json({ success: true, key: raw, days, hours, panel_type: pt });
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed.success === true) {
        const key = parsed.key ?? parsed.license ?? parsed.keys?.[0] ?? null;
        if (key) return json({ success: true, key, days, hours, panel_type: pt });
      }
      return json({ success: false, message: parsed.message ?? raw }, 500);
    } catch {
      return json({ success: false, message: raw || 'Empty response' }, 500);
    }

  } catch (e) {
    return json({ success: false, message: 'Server error: ' + String(e) }, 500);
  }
});
