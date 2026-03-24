const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });

function getSellerKey(panelType: 'lag' | 'internal') {
  return panelType === 'lag'
    ? (Deno.env.get('KA_LAG_SELLER_KEY') ?? Deno.env.get('KA_SELLER_KEY') ?? '')
    : (Deno.env.get('KA_INT_SELLER_KEY') ?? Deno.env.get('KA_SELLER_KEY') ?? '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const body = await req.json();
    const username = String(body.username ?? '').trim();
    const panelType = String(body.panel_type ?? '').trim().toLowerCase() === 'lag' ? 'lag' : 'internal';

    if (!username) return json({ success: false, message: 'KeyAuth username is required' }, 400);

    const sellerKey = getSellerKey(panelType);
    if (!sellerKey) {
      return json({ success: false, message: `Seller key not configured for ${panelType}` }, 500);
    }

    const url = new URL('https://keyauth.win/api/seller/');
    url.searchParams.set('sellerkey', sellerKey);
    url.searchParams.set('type', 'resetuser');
    url.searchParams.set('user', username);

    const response = await fetch(url.toString(), { method: 'GET' });
    const text = await response.text();

    try {
      const parsed = JSON.parse(text);
      if (response.ok && parsed?.success === true) {
        return json({ success: true, message: parsed.message ?? 'HWID reset successfully' });
      }
      return json({ success: false, message: parsed?.message ?? text ?? 'HWID reset failed' }, response.ok ? 400 : response.status);
    } catch {
      return json({ success: false, message: text || 'Unexpected seller API response' }, 500);
    }
  } catch (error) {
    return json({ success: false, message: String(error) }, 500);
  }
});
