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
    const pt   = (body.panel_type ?? 'internal') as 'lag' | 'internal';

    // ── Duration logic ──────────────────────────────────────────
    // Callers can pass either:
    //   { hours: 1 }   → use KeyAuth expirytime in seconds (for sub-day keys)
    //   { days: N }    → use KeyAuth expiry in whole days (existing behaviour)
    // hours takes priority when present.
    const hours = body.hours !== undefined ? Number(body.hours) : null;
    const days  = hours !== null ? null : Number(body.days ?? 7);

    // Each panel has its own seller key and app name
    const sellerKey = pt === 'lag'
      ? (Deno.env.get('KA_LAG_SELLER_KEY') ?? Deno.env.get('KA_SELLER_KEY') ?? '')
      : (Deno.env.get('KA_INT_SELLER_KEY') ?? Deno.env.get('KA_SELLER_KEY') ?? '');

    const appName = pt === 'lag'
      ? (Deno.env.get('KA_LAG_APPNAME') ?? '')
      : (Deno.env.get('KA_INT_APPNAME') ?? '');

    console.log(`[generate-key] panel=${pt} hours=${hours} days=${days} app="${appName}"`);

    if (!sellerKey) return json({ success: false, message: `Seller key not set for ${pt}` }, 400);
    if (!appName)   return json({ success: false, message: `App name not set for ${pt}` }, 400);

    // ── Build KeyAuth seller API URL ────────────────────────────
    // For hour-based keys:  &expiry=0&expirytime=<seconds>
    // For day-based keys:   &expiry=<whole_days>
    let expiryParam: string;
    if (hours !== null) {
      const seconds = Math.round(hours * 3600);
      expiryParam = `&expiry=0&expirytime=${seconds}`;
    } else {
      expiryParam = `&expiry=${days}`;
    }

    const url = [
      'https://keyauth.win/api/seller/',
      `?sellerkey=${encodeURIComponent(sellerKey)}`,
      `&type=add`,
      expiryParam,
      `&mask=1999X*******`,
      `&level=1`,
      `&amount=1`,
      `&format=text`,
      `&appname=${encodeURIComponent(appName)}`,
    ].join('');

    const resp = await fetch(url);
    const raw  = (await resp.text()).trim();
    console.log(`[${pt}][${hours !== null ? hours + 'h' : days + 'd'}] response: "${raw}"`);

    const isError = (
      raw.length === 0 ||
      raw.toLowerCase().startsWith('error') ||
      raw.toLowerCase().includes('invalid') ||
      raw.toLowerCase().includes('failed') ||
      raw.includes('<html') ||
      raw.startsWith('{')
    );

    if (!isError) {
      return json({ success: true, key: raw, hours, days, panel_type: pt });
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed.success === true) {
        const key = parsed.key ?? parsed.license ?? parsed.keys?.[0] ?? null;
        if (key) return json({ success: true, key, hours, days, panel_type: pt });
      }
      return json({ success: false, message: parsed.message ?? raw }, 500);
    } catch {
      return json({ success: false, message: raw || 'Empty response' }, 500);
    }

  } catch (e) {
    return json({ success: false, message: 'Server error: ' + String(e) }, 500);
  }
});
