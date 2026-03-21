const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const res = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const body      = await req.json();
    const pt        = (body.panel_type ?? 'internal') as 'lag' | 'internal';
    const days      = Number(body.days ?? 7);
    const sellerKey = Deno.env.get('KA_SELLER_KEY') ?? '';
    const appName   = pt === 'lag'
      ? (Deno.env.get('KA_LAG_APPNAME') ?? '')
      : (Deno.env.get('KA_INT_APPNAME') ?? '');

    if (!sellerKey) return res({ success: false, message: 'KA_SELLER_KEY not set in Supabase secrets' }, 400);
    if (!appName)   return res({ success: false, message: `KA_${pt.toUpperCase()}_APPNAME not set` }, 400);

    const url = `https://keyauth.win/api/seller/?sellerkey=${sellerKey}&type=add&expiry=${days}&mask=XXXXXX-XXXXXX-XXXXXX-XXXXXX&level=1&amount=1&format=JSON&appname=${encodeURIComponent(appName)}`;
    const resp = await fetch(url);
    const text = await resp.text();
    console.log(`[generate-key][${pt}] response: ${text}`);

    let data: any;
    try { data = JSON.parse(text); }
    catch { return res({ success: false, message: `Non-JSON response: ${text.slice(0, 300)}` }, 500); }

    if (data.success === true) {
      const key = data.key ?? data.license ?? data.keys?.[0] ?? null;
      if (key) return res({ success: true, key, days, panel_type: pt });
    }

    return res({ success: false, message: data.message ?? JSON.stringify(data) }, 500);

  } catch (e) {
    return res({ success: false, message: 'Server error: ' + String(e) }, 500);
  }
});
