// ============================================================
//  generate-key — KeyAuth Seller API
//  SERVER-SIDE balance check + atomic deduction before key gen
// ============================================================
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

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
    const supabaseUrl  = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey      = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRole  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader   = req.headers.get('Authorization') ?? '';

    const body      = await req.json();
    const pt        = (body.panel_type ?? 'internal') as 'lag' | 'internal';
    const days      = Number(body.days ?? 7);
    const hours     = Number(body.hours ?? 0);
    const mask      = (body.mask ?? '1999X*******').trim();
    const price     = Number(body.price ?? 0);      // client passes price
    const isFree    = body.is_free === true;        // free trial — skip balance check

    // ── Authenticate the user ──────────────────────────────
    const client = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    });
    const { data: authData } = await client.auth.getUser();
    const user = authData?.user;
    if (!user) return json({ success: false, message: 'Unauthorized' }, 401);

    // ── Pre-generation ──────────────────────────────────────


    // ── Generate key from KeyAuth ──────────────────────────
    const sellerKey = pt === 'lag'
      ? (Deno.env.get('KA_LAG_SELLER_KEY') ?? Deno.env.get('KA_SELLER_KEY') ?? '')
      : (Deno.env.get('KA_INT_SELLER_KEY') ?? Deno.env.get('KA_SELLER_KEY') ?? '');

    const appName = pt === 'lag'
      ? (Deno.env.get('KA_LAG_APPNAME') ?? '')
      : (Deno.env.get('KA_INT_APPNAME') ?? '');

    console.log(`[generate-key] user=${user.email} panel=${pt} days=${days} price=${price} free=${isFree}`);

    if (!sellerKey) return json({ success: false, message: `Seller key not set for ${pt}` }, 400);
    if (!appName)   return json({ success: false, message: `App name not set for ${pt}` }, 400);

    let expiryParam: string;
    if (hours > 0 && days === 0) {
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
    console.log(`[${pt}][${days}d/${hours}h] KeyAuth response: "${raw}"`);

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

    // Key generation failed — refund the balance if we deducted
    if (!isFree && price > 0) {
      const admin = createClient(supabaseUrl, serviceRole);
      await admin.rpc('refund_user_balance', { p_user_id: user.id, p_amount: price });
      console.log(`[generate-key] Refunded $${price} to user ${user.id} after keygen failure`);
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
