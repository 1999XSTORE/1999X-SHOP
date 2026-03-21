// ============================================================
//  PayPal Payment Capture Edge Function
//  POST body: { order_id: string, user_id: string, user_email: string, user_name: string, amount: number }
//  Required Supabase secrets:
//    PAYPAL_CLIENT_ID     — from PayPal Developer Dashboard
//    PAYPAL_CLIENT_SECRET — from PayPal Developer Dashboard
//    PAYPAL_MODE          — "sandbox" or "live"
//    SUPABASE_SERVICE_ROLE_KEY — for writing to paypal_orders table
// ============================================================

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const mode       = Deno.env.get('PAYPAL_MODE') ?? 'live';
const BASE_URL   = mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
const CLIENT_ID  = Deno.env.get('PAYPAL_CLIENT_ID')     ?? '';
const CLIENT_SEC = Deno.env.get('PAYPAL_CLIENT_SECRET') ?? '';
const SUPA_URL   = Deno.env.get('SUPABASE_URL')         ?? '';
const SUPA_KEY   = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

async function getAccessToken(): Promise<string | null> {
  try {
    const res = await fetch(`${BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${btoa(`${CLIENT_ID}:${CLIENT_SEC}`)}`,
        'Content-Type':  'application/x-www-form-urlencoded',
      },
      body: 'grant_type=client_credentials',
    });
    const data = await res.json();
    return data.access_token ?? null;
  } catch { return null; }
}

async function captureOrder(orderId: string, token: string): Promise<{ success: boolean; status?: string; amount?: number }> {
  try {
    const res = await fetch(`${BASE_URL}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
    });
    const data = await res.json();
    if (data.status === 'COMPLETED') {
      const amt = parseFloat(data.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ?? '0');
      return { success: true, status: 'COMPLETED', amount: amt };
    }
    return { success: false, status: data.status };
  } catch { return { success: false }; }
}

async function saveOrder(orderId: string, userId: string, userEmail: string, userName: string, amount: number, status: string) {
  try {
    await fetch(`${SUPA_URL}/rest/v1/paypal_orders`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SUPA_KEY}`, 'apikey': SUPA_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({ order_id: orderId, user_id: userId, user_email: userEmail, user_name: userName, amount, status }),
    });
  } catch {}
}

async function addBalanceToUser(userId: string, amount: number) {
  // Insert a pre-approved transaction so the frontend picks it up
  try {
    await fetch(`${SUPA_URL}/rest/v1/transactions`, {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${SUPA_KEY}`, 'apikey': SUPA_KEY, 'Content-Type': 'application/json', 'Prefer': 'return=minimal' },
      body: JSON.stringify({
        user_id:        userId,
        user_email:     '',
        user_name:      'PayPal Auto',
        amount,
        method:         'paypal',
        transaction_id: `PP-AUTO-${Date.now()}`,
        status:         'approved', // auto-approved because PayPal verified
      }),
    });
  } catch {}
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  const res = (d: unknown, s = 200) => new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

  try {
    const body      = await req.json();
    const orderId   = body.order_id   as string;
    const userId    = body.user_id    as string;
    const userEmail = body.user_email as string;
    const userName  = body.user_name  as string;
    const amount    = Number(body.amount ?? 0);

    if (!orderId || !userId) return res({ success: false, message: 'Missing order_id or user_id' }, 400);
    if (!CLIENT_ID || !CLIENT_SEC) return res({ success: false, message: 'PayPal not configured. Set PAYPAL_CLIENT_ID and PAYPAL_CLIENT_SECRET in Supabase secrets.' }, 500);

    const token = await getAccessToken();
    if (!token) return res({ success: false, message: 'PayPal auth failed' }, 500);

    const capture = await captureOrder(orderId, token);
    if (!capture.success) {
      await saveOrder(orderId, userId, userEmail, userName, amount, 'failed');
      return res({ success: false, message: 'PayPal capture failed: ' + capture.status });
    }

    const finalAmount = capture.amount ?? amount;
    await saveOrder(orderId, userId, userEmail, userName, finalAmount, 'captured');
    await addBalanceToUser(userId, finalAmount);

    return res({ success: true, amount: finalAmount, message: 'Payment captured and balance added' });
  } catch (e) {
    return res({ success: false, message: 'Server error: ' + String(e) }, 500);
  }
});
