// PayPal Auto-Verify Edge Function
// Secrets: PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET, PAYPAL_MODE (sandbox|live)
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
const json = (d: unknown, s = 200) =>
  new Response(JSON.stringify(d), { status: s, headers: { ...cors, 'Content-Type': 'application/json' } });

async function getPayPalToken(clientId: string, secret: string, mode: string): Promise<string | null> {
  try {
    const base = mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
    const res = await fetch(`${base}/v1/oauth2/token`, {
      method: 'POST',
      headers: { 'Authorization': 'Basic ' + btoa(`${clientId}:${secret}`), 'Content-Type': 'application/x-www-form-urlencoded' },
      body: 'grant_type=client_credentials',
    });
    const d = await res.json();
    return d.access_token ?? null;
  } catch { return null; }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });
  try {
    const { paypal_order_id, amount, user_id, user_email, user_name } = await req.json();
    if (!paypal_order_id || !amount || !user_id) return json({ success: false, message: 'Missing fields' }, 400);

    const clientId = Deno.env.get('PAYPAL_CLIENT_ID') ?? '';
    const secret   = Deno.env.get('PAYPAL_CLIENT_SECRET') ?? '';
    const mode     = Deno.env.get('PAYPAL_MODE') ?? 'live';

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);

    if (!clientId || !secret) {
      await supabase.from('transactions').insert({ user_id, user_email, user_name: user_name ?? user_email, amount, method: 'paypal', transaction_id: paypal_order_id, status: 'pending' });
      return json({ success: false, fallback: true, message: 'PayPal not configured — submitted for manual review' });
    }

    const token = await getPayPalToken(clientId, secret, mode);
    if (!token) return json({ success: false, message: 'PayPal auth failed' }, 502);

    const base = mode === 'sandbox' ? 'https://api-m.sandbox.paypal.com' : 'https://api-m.paypal.com';
    const orderRes = await fetch(`${base}/v2/checkout/orders/${paypal_order_id}`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!orderRes.ok) return json({ success: false, message: 'Order not found' }, 404);
    const order = await orderRes.json();

    const status   = order.status;
    const paidAmt  = parseFloat(order.purchase_units?.[0]?.amount?.value ?? '0');
    const currency = order.purchase_units?.[0]?.amount?.currency_code ?? 'USD';

    if (status !== 'COMPLETED') return json({ success: false, message: `Order not completed (${status})` });
    if (currency !== 'USD') return json({ success: false, message: `Currency ${currency} not accepted` });
    if (Math.abs(paidAmt - Number(amount)) > 0.10) return json({ success: false, message: `Amount mismatch: paid $${paidAmt}, expected $${amount}` });

    const { data: existing } = await supabase.from('paypal_auto_credits').select('id').eq('paypal_txn_id', paypal_order_id).maybeSingle();
    if (existing) return json({ success: true, already_credited: true, message: 'Already credited' });

    await supabase.from('transactions').insert({ user_id, user_email, user_name: user_name ?? user_email, amount: paidAmt, method: 'paypal', transaction_id: paypal_order_id, status: 'approved' });
    await supabase.from('paypal_auto_credits').insert({ paypal_txn_id: paypal_order_id, user_id, amount: paidAmt });

    return json({ success: true, amount: paidAmt, message: `$${paidAmt.toFixed(2)} auto-credited!` });
  } catch (e) {
    return json({ success: false, message: 'Server error: ' + String(e) }, 500);
  }
});
