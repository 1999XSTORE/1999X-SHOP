// KeyAuth Seller API — auto-generates keys
// Receives: panel_type (lag|internal), days (3|7|30)
// For combo purchases, called TWICE — once for 'internal', once for 'lag'
// Both calls use the SAME days value from the plan purchased

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

    // panel_type: 'lag' or 'internal'
    const pt   = (body.panel_type ?? 'internal') as 'lag' | 'internal';

    // days: actual subscription length — 3, 7, or 30
    // This comes directly from the plan the user selected
    const days = Number(body.days ?? 7);

    const sellerKey = Deno.env.get('KA_SELLER_KEY') ?? '';

    // Each panel type uses its own KeyAuth app
    const appName = pt === 'lag'
      ? (Deno.env.get('KA_LAG_APPNAME') ?? '')
      : (Deno.env.get('KA_INT_APPNAME') ?? '');

    console.log(`[generate-key] panel=${pt} days=${days} app="${appName}"`);

    if (!sellerKey) return json({ success: false, message: 'KA_SELLER_KEY not set in Supabase secrets' }, 400);
    if (!appName)   return json({ success: false, message: `KA_${pt.toUpperCase()}_APPNAME not set in Supabase secrets` }, 400);

    // Call KeyAuth seller API
    // expiry=days tells KeyAuth how many days the key is valid for
    // format=text returns the key as a plain string (most reliable)
    const url = [
      'https://keyauth.win/api/seller/',
      `?sellerkey=${encodeURIComponent(sellerKey)}`,
      `&type=add`,
      `&expiry=${days}`,
      `&mask=XXXXXX-XXXXXX-XXXXXX-XXXXXX`,
      `&level=1`,
      `&amount=1`,
      `&format=text`,
      `&appname=${encodeURIComponent(appName)}`,
    ].join('');

    const resp  = await fetch(url);
    const raw   = (await resp.text()).trim();
    console.log(`[generate-key][${pt}][${days}d] KeyAuth response: "${raw}"`);

    // text format: success = key string directly (e.g. "A1B2C3-D4E5F6-...")
    //              failure = error message (e.g. "Invalid seller key")
    const isError = (
      raw.length === 0 ||
      raw.toLowerCase().startsWith('error') ||
      raw.toLowerCase().includes('invalid') ||
      raw.toLowerCase().includes('failed') ||
      raw.toLowerCase().includes('not found') ||
      raw.includes('<html') ||
      raw.includes('{')
    );

    if (!isError) {
      // This is the actual key
      return json({ success: true, key: raw, days, panel_type: pt });
    }

    // Try JSON parse in case format=text didn't work and it returned JSON
    try {
      const parsed = JSON.parse(raw);
      if (parsed.success === true) {
        const key = parsed.key ?? parsed.license ?? parsed.keys?.[0] ?? null;
        if (key) return json({ success: true, key, days, panel_type: pt });
      }
      return json({ success: false, message: parsed.message ?? raw }, 500);
    } catch {
      return json({ success: false, message: raw || 'Empty response from KeyAuth' }, 500);
    }

  } catch (e) {
    console.error('[generate-key] error:', e);
    return json({ success: false, message: 'Server error: ' + String(e) }, 500);
  }
});
