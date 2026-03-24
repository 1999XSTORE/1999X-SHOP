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

function normalizePhone(input: string) {
  return input.replace(/[^\d]/g, '');
}

function isTrueWalletVoucherLink(input: string) {
  return /^https?:\/\/gift\.truemoney\.com\/campaign\/\?v=[A-Za-z0-9]+$/i.test(input.trim());
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
    if (!isTrueWalletVoucherLink(voucher)) {
      return json({ success: false, message: 'Invalid TrueMoney gift link format' }, 400);
    }

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

    const walletNumber = normalizePhone(settingsRow.value);
    if (walletNumber.length < 10 || walletNumber.length > 15) {
      return json(
        {
          success: false,
          message: 'MY_WALLET must be a valid phone number for the topup API',
          currentValuePreview: settingsRow.value.slice(0, 24),
        },
        500,
      );
    }

    const redeemRes = await fetch('https://apiparkxd.pro/api/topup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ voucher, phone: walletNumber }),
    });
    const providerResponse = await redeemRes.json().catch(() => ({}));

    if (!redeemRes.ok || providerResponse?.success === false) {
      return json({ success: false, message: providerResponse?.message ?? 'Voucher redeem failed', providerResponse }, 400);
    }

    const amount = Number(providerResponse?.amount ?? providerResponse?.data?.amount ?? 0);
    if (!Number.isFinite(amount) || amount <= 0) {
      return json(
        {
          success: false,
          message: providerResponse?.message ?? providerResponse?.error ?? 'Invalid, empty, or already-used voucher',
          providerResponse,
        },
        400,
      );
    }

    const transactionId = String(
      providerResponse?.transaction_id ??
      providerResponse?.txn_id ??
      providerResponse?.id ??
      `truewallet-${voucherHash.slice(0, 16)}`
    );

    const { error: transactionError } = await admin
      .from('transactions')
      .insert({
        user_id: user.id,
        user_email: user.email ?? '',
        user_name: user.user_metadata?.name ?? user.email ?? 'User',
        amount,
        method: 'truewallet',
        transaction_id: transactionId,
        status: 'approved',
        note: 'Auto-approved via TrueWallet gift link redeem',
      });

    if (transactionError) {
      return json({ success: false, message: transactionError.message }, 500);
    }

    const { data: orderRow, error: orderError } = await admin
      .from('orders')
      .insert({
        user_id: user.id,
        user_email: user.email ?? '',
        voucher_hash: voucherHash,
        voucher_preview: voucher.slice(0, 24),
        wallet_number: walletNumber,
        amount,
        status: 'completed',
        provider_response: providerResponse,
      })
      .select('id')
      .single();

    if (orderError) return json({ success: false, message: orderError.message }, 500);

    return json({
      success: true,
      orderId: orderRow.id,
      transactionId,
      amount,
      message: 'Voucher redeemed and balance added successfully',
    });
  } catch (error) {
    return json({ success: false, message: String(error) }, 500);
  }
});
