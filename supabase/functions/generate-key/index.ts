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
    const days = Number(body.days ?? 7);

    // Each panel has its own seller key and app name
    const sellerKey = pt === 'lag'
      ? (Deno.env.get('KA_LAG_SELLER_KEY') ?? Deno.env.get('KA_SELLER_KEY') ?? '')
      : (Deno.env.get('KA_INT_SELLER_KEY') ?? Deno.env.get('KA_SELLER_KEY') ?? '');

    const appName = pt === 'lag'
      ? (Deno.env.get('KA_LAG_APPNAME') ?? '')
      : (Deno.env.get('KA_INT_APPNAME') ?? '');

    console.log(`[generate-key] panel=${pt} days=${days} app="${appName}"`);

    if (!sellerKey) return json({ success: false, message: `Seller key not set for ${pt}` }, 400);
    if (!appName)   return json({ success: false, message: `App name not set for ${pt}` }, 400);

    const url = [
      'https://keyauth.win/api/seller/',
      `?sellerkey=${encodeURIComponent(sellerKey)}`,
      `&type=add`,
      `&expiry=${days}`,
      `&mask=1999X*******`,
      `&level=1`,
      `&amount=1`,
      `&format=text`,
      `&appname=${encodeURIComponent(appName)}`,
    ].join('');

    const resp = await fetch(url);
    const raw  = (await resp.text()).trim();
    console.log(`[${pt}][${days}d] response: "${raw}"`);

    const isError = (
      raw.length === 0 ||
      raw.toLowerCase().startsWith('error') ||
      raw.toLowerCase().includes('invalid') ||
      raw.toLowerCase().includes('failed') ||
      raw.includes('<html') ||
      raw.startsWith('{')
    );

    if (!isError) {
      return json({ success: true, key: raw, days, panel_type: pt });
    }

    try {
      const parsed = JSON.parse(raw);
      if (parsed.success === true) {
        const key = parsed.key ?? parsed.license ?? parsed.keys?.[0] ?? null;
        if (key) return json({ success: true, key, days, panel_type: pt });
      }
      return json({ success: false, message: parsed.message ?? raw }, 500);
    } catch {
      return json({ success: false, message: raw || 'Empty response' }, 500);
    }

  } catch (e) {
    return json({ success: false, message: 'Server error: ' + String(e) }, 500);
  }
});
