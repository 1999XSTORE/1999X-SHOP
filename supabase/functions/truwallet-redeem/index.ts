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

async function sha256(input: string) {
  const bytes = new TextEncoder().encode(input);
  const hash = await crypto.subtle.digest('SHA-256', bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') ?? '';
    const body = await req.json();
    const voucher = String(body.voucher ?? '').trim();

    if (!voucher) return json({ success: false, message: 'Voucher link is required' }, 400);

    const client = createClient(supabaseUrl, anonKey, { global: { headers: { Authorization: authHeader } } });
    const { data: authData } = await client.auth.getUser();
    const user = authData.user;
    if (!user) return json({ success: false, message: 'Unauthorized' }, 401);

    const admin = createClient(supabaseUrl, serviceRole);
    const voucherHash = await sha256(voucher.toLowerCase());

    const { data: existingOrder } = await admin
      .from('orders')
      .select('id')
      .eq('voucher_hash', voucherHash)
      .maybeSingle();

    if (existingOrder) return json({ success: false, message: 'Voucher already used' }, 409);

    const { data: settingsRow, error: settingsError } = await admin
      .from('settings')
      .select('value')
      .eq('key', 'MY_WALLET')
      .maybeSingle();

    if (settingsError || !settingsRow?.value) return json({ success: false, message: 'MY_WALLET is not configured' }, 500);

    const walletNumber = settingsRow.value;
    const redeemRes = await fetch('https://apiparkxd.pro/api/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voucher, phone: walletNumber }),
    });
    const providerResponse = await redeemRes.json().catch(() => ({}));

    if (!redeemRes.ok || providerResponse?.success === false) {
      return json({ success: false, message: providerResponse?.message ?? 'Voucher redeem failed', providerResponse }, 400);
    }

    const { data: licenseRow, error: licenseError } = await admin
      .from('license_keys')
      .select('id,product_name,license_key')
      .eq('is_used', false)
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle();

    if (licenseError || !licenseRow) {
      return json({ success: false, message: 'No unused license keys available' }, 500);
    }

    const { data: orderRow, error: orderError } = await admin
      .from('orders')
      .insert({
        user_id: user.id,
        user_email: user.email ?? '',
        voucher_hash: voucherHash,
        voucher_preview: voucher.slice(0, 24),
        wallet_number: walletNumber,
        amount: Number(providerResponse?.amount ?? providerResponse?.data?.amount ?? 0),
        status: 'completed',
        license_key_id: licenseRow.id,
        license_key: licenseRow.license_key,
        provider_response: providerResponse,
      })
      .select('id')
      .single();

    if (orderError) return json({ success: false, message: orderError.message }, 500);

    await admin
      .from('license_keys')
      .update({
        is_used: true,
        used_by: user.id,
        order_id: orderRow.id,
        used_at: new Date().toISOString(),
      })
      .eq('id', licenseRow.id);

    return json({
      success: true,
      orderId: orderRow.id,
      productName: licenseRow.product_name,
      licenseKey: licenseRow.license_key,
      amount: Number(providerResponse?.amount ?? providerResponse?.data?.amount ?? 0),
    });
  } catch (error) {
    return json({ success: false, message: String(error) }, 500);
  }
});
