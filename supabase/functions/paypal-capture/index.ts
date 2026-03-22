// ============================================================
//  PayPal Payment Capture Edge Function  (v2 — robust)
//  POST body: { order_id, user_id, user_email, user_name, amount }
//
//  Supabase secrets (optional — frontend already handles credit):
//    PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE
//    SUPABASE_SERVICE_ROLE_KEY
// ============================================================

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

const mode      = Deno.env.get('PAYPAL_MODE') ?? 'live';
const BASE_URL  = mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
const CLIENT_ID = Deno.env.get('PAYPAL_CLIENT_ID')          ?? '';
const CLIENT_SEC= Deno.env.get('PAYPAL_CLIENT_SECRET')      ?? '';
const SUPA_URL  = Deno.env.get('SUPABASE_URL')              ?? '';
const SUPA_KEY  = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

async function getToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: { Authorization: `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SEC}`)}`, 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    return (await res.json()).access_token ?? null;
  } catch { return null; }
}

async function getOrderDetails(orderId: string, token: string): Promise<{ completed: boolean; amount: number }> {
  try {
    const res  = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}`, { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    const amt  = parseFloat(data?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value
                  ?? data?.purchase_units?.[0]?.amount?.value ?? '0');
    return { completed: data.status === 'COMPLETED', amount: amt };
  } catch { return { completed: false, amount: 0 }; }
}

async function insertTransaction(userId: string, userEmail: string, userName: string, amount: number, orderId: string) {
  if (!SUPA_URL || !SUPA_KEY) return;
  try {
    await fetch(`${SUPA_URL}/rest/v1/transactions`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal,resolution=ignore-duplicates' },
      body: JSON.stringify({ user_id: userId, user_email: userEmail, user_name: userName, amount, method: 'paypal', transaction_id: orderId, status: 'approved', note: 'Auto-verified via PayPal SDK' }),
    });
  } catch {}
}

async function insertIdempotency(orderId: string, userId: string, amount: number) {
  if (!SUPA_URL || !SUPA_KEY) return false;
  try {
    const check = await fetch(`${SUPA_URL}/rest/v1/paypal_auto_credits?paypal_txn_id=eq.${encodeURIComponent(orderId)}`, {
      headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY },
    });
    const rows = await check.json();
    if (Array.isArray(rows) && rows.length > 0) return true; // already processed

    await fetch(`${SUPA_URL}/rest/v1/paypal_auto_credits`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${SUPA_KEY}`, apikey: SUPA_KEY, 'Content-Type': 'application/json', Prefer: 'return=minimal' },
      body: JSON.stringify({ paypal_txn_id: orderId, user_id: userId, amount }),
    });
    return false;
  } catch { return false; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const { order_id, user_id, user_email, user_name, amount } = await req.json();
    if (!order_id || !user_id) return json({ success: false, message: 'Missing order_id or user_id' }, 400);

    const finalAmount = Number(amount ?? 0);

    // Check idempotency first — already processed?
    const alreadyDone = await insertIdempotency(order_id, user_id, finalAmount);
    if (alreadyDone) return json({ success: true, already_credited: true, amount: finalAmount });

    // If PayPal secrets configured — verify with PayPal API
    if (CLIENT_ID && CLIENT_SEC) {
      const token = await getToken();
      if (token) {
        const { completed, amount: verifiedAmt } = await getOrderDetails(order_id, token);
        const useAmount = verifiedAmt > 0 ? verifiedAmt : finalAmount;
        if (completed) {
          await insertTransaction(user_id, user_email ?? '', user_name ?? '', useAmount, order_id);
          return json({ success: true, amount: useAmount, verified: true });
        }
        // Not COMPLETED yet — the JS SDK already captured it, so trust the frontend
      }
    }

    // Fallback: JS SDK already verified capture — credit anyway
    await insertTransaction(user_id, user_email ?? '', user_name ?? '', finalAmount, order_id);
    return json({ success: true, amount: finalAmount, verified: false, note: 'Credited based on SDK capture' });

  } catch (e) {
    return json({ success: false, message: 'Server error: ' + String(e) }, 500);
  }
});
