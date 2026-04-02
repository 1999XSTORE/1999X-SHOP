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

function roundCurrency(value: number) {
  return Math.round(value * 100) / 100;
}

const TRUEWALLET_FEE_RATE = 0.03;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors });

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') ?? '';
    const serviceRole = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const authHeader = req.headers.get('Authorization') ?? '';
    const body = await req.json();
    const voucher = String(body.voucher ?? '').trim();
    const expectedUsdAmount = Number(body.expectedUsdAmount ?? 0);
    const referralEmail = String(body.referralEmail ?? '').trim().toLowerCase();

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

    const { data: settingsRows, error: settingsError } = await admin
      .from('settings')
      .select('key,value')
      .in('key', ['MY_WALLET', 'TRUEWALLET_THB_PER_USD']);

    if (settingsError || !settingsRows?.length) return json({ success: false, message: 'Payment settings are not configured' }, 500);

    const ownerWalletSetting = settingsRows.find((row) => row.key === 'MY_WALLET');
    if (!ownerWalletSetting?.value) return json({ success: false, message: 'MY_WALLET is not configured' }, 500);

    const exchangeRate = Number(settingsRows.find((row) => row.key === 'TRUEWALLET_THB_PER_USD')?.value ?? 35);
    if (!Number.isFinite(exchangeRate) || exchangeRate <= 0) {
      return json({ success: false, message: 'TRUEWALLET_THB_PER_USD must be a valid number' }, 500);
    }

    // ── If referral is active, check if the reseller has their own TrueWallet number ──
    let resolvedWalletValue = ownerWalletSetting.value;
    let resolvedReferralEmail = referralEmail; // may be email or ref code
    if (referralEmail) {
      // Resolve referral email/code → reseller email + user_id
      const { data: accRow } = await admin
        .from('reseller_accounts')
        .select('user_id, email')
        .or(`email.eq.${referralEmail},referral_code.eq.${referralEmail}`)
        .maybeSingle();

      if (accRow?.user_id) {
        // Always store the reseller's actual email so apply_reseller_credit can find them
        resolvedReferralEmail = accRow.email;

        const { data: pmRow } = await admin
          .from('reseller_payment_methods')
          .select('truewallet_enabled, truewallet_number')
          .eq('user_id', accRow.user_id)
          .maybeSingle();

        // Only override if reseller has explicitly enabled TrueWallet and set a number
        if (pmRow?.truewallet_enabled && pmRow?.truewallet_number?.trim()) {
          resolvedWalletValue = pmRow.truewallet_number.trim();
        }
      }
    }

    const walletNumber = normalizePhone(resolvedWalletValue);
    if (walletNumber.length < 10 || walletNumber.length > 15) {
      return json(
        {
          success: false,
          message: 'MY_WALLET must be a valid phone number for the topup API',
          currentValuePreview: resolvedWalletValue.slice(0, 24),
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

    const amountThb = Number(providerResponse?.amount ?? providerResponse?.data?.amount ?? 0);
    if (!Number.isFinite(amountThb) || amountThb <= 0) {
      return json(
        {
          success: false,
          message: providerResponse?.message ?? providerResponse?.error ?? 'Invalid, empty, or already-used voucher',
          providerResponse,
        },
        400,
      );
    }

    const grossAmountUsd = roundCurrency(amountThb / exchangeRate);
    const feeUsd = roundCurrency(grossAmountUsd * TRUEWALLET_FEE_RATE);
    const amountUsd = roundCurrency(grossAmountUsd - feeUsd);
    if (!Number.isFinite(amountUsd) || amountUsd <= 0) {
      return json({ success: false, message: 'Redeemed amount is too small to convert' }, 400);
    }

    const transactionId = String(
      providerResponse?.transaction_id ??
      providerResponse?.txn_id ??
      providerResponse?.id ??
      `truewallet-${voucherHash.slice(0, 16)}`
    );

    const { data: transactionRow, error: transactionError } = await admin
      .from('transactions')
      .insert({
        user_id: user.id,
        user_email: user.email ?? '',
        user_name: user.user_metadata?.name ?? user.email ?? 'User',
        amount: amountUsd,
        method: 'truewallet',
        transaction_id: transactionId,
        status: 'approved',
        referral_email: resolvedReferralEmail,
        note: `Auto-approved via TrueWallet gift link redeem (${amountThb.toFixed(2)} THB @ ${exchangeRate} THB/USD, 3% fee applied)`,
      })
      .select('id')
      .single();

    if (transactionError) {
      return json({ success: false, message: transactionError.message }, 500);
    }

    if (transactionRow?.id) {
      const { error: resellerError } = await admin.rpc('apply_reseller_credit', { p_transaction_id: transactionRow.id });
      if (resellerError) {
        return json({ success: false, message: resellerError.message }, 500);
      }
    }

    const { data: orderRow, error: orderError } = await admin
      .from('orders')
      .insert({
        user_id: user.id,
        user_email: user.email ?? '',
        voucher_hash: voucherHash,
        voucher_preview: voucher.slice(0, 24),
        wallet_number: walletNumber,
        amount: amountUsd,
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
      amount: amountUsd,
      grossAmountUsd,
      feeUsd,
      feeRate: TRUEWALLET_FEE_RATE,
      amountThb,
      exchangeRate,
      expectedUsdAmount: Number.isFinite(expectedUsdAmount) ? expectedUsdAmount : 0,
      shortfallUsd: Number.isFinite(expectedUsdAmount) && expectedUsdAmount > 0 ? roundCurrency(Math.max(0, expectedUsdAmount - amountUsd)) : 0,
      message: 'Voucher redeemed and balance added successfully',
    });
  } catch (error) {
    return json({ success: false, message: String(error) }, 500);
  }
});
