const REFERRAL_KEY = '1999x-referral-email';

export function normalizeResellerEmail(input: string) {
  return input.trim().toLowerCase();
}

export function normalizeReferralValue(input: string) {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return '';
  return trimmed.includes('@') ? normalizeResellerEmail(trimmed) : sanitizeReferralCode(trimmed);
}

export function sanitizeReferralCode(input: string) {
  return input.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '').slice(0, 32);
}

export function storeReferralEmail(email: string) {
  const clean = normalizeReferralValue(email);
  if (!clean) return '';
  try {
    localStorage.setItem(REFERRAL_KEY, clean);
  } catch {}
  return clean;
}

export function getStoredReferralEmail() {
  try {
    return normalizeReferralValue(localStorage.getItem(REFERRAL_KEY) ?? '');
  } catch {
    return '';
  }
}

export function clearStoredReferralEmail() {
  try {
    localStorage.removeItem(REFERRAL_KEY);
  } catch {}
}

export function captureReferralFromUrl(currentUserEmail?: string) {
  try {
    const params = new URLSearchParams(window.location.search);
    const ref = normalizeReferralValue(params.get('ref') ?? '');
    const currentUser = normalizeResellerEmail(currentUserEmail ?? '');
    if (!ref || (currentUser && ref === currentUser)) return getStoredReferralEmail();
    return storeReferralEmail(ref);
  } catch {
    return getStoredReferralEmail();
  }
}

export function buildReferralLink(email: string) {
  const clean = normalizeReferralValue(email);
  if (!clean || typeof window === 'undefined') return '';
  return `${window.location.origin}/pay?ref=${encodeURIComponent(clean)}`;
}

// ── Reseller payment method helpers ─────────────────────────
export interface ResellerPaymentMethods {
  id?: string;
  user_id?: string;
  user_email?: string;
  shop_name?: string;
  binance_enabled?: boolean;
  binance_pay_id?: string;
  binance_qr_url?: string;
  bkash_enabled?: boolean;
  bkash_number?: string;
  bkash_qr_url?: string;
  usdt_trc20_enabled?: boolean;
  usdt_trc20_address?: string;
  usdt_trc20_qr_url?: string;
  usdt_bep20_enabled?: boolean;
  usdt_bep20_address?: string;
  usdt_bep20_qr_url?: string;
  truewallet_enabled?: boolean;
  truewallet_number?: string;
  referral_code?: string;
  _paused?: boolean;
  // Custom panel pricing
  price_internal_3d?: number;
  price_internal_7d?: number;
  price_internal_30d?: number;
  price_combo_7d?: number;
  price_combo_30d?: number;
  price_lag_7d?: number;
  price_lag_30d?: number;
}

export async function fetchResellerPaymentMethods(
  supabase: any,
  referralEmailOrCode: string
): Promise<ResellerPaymentMethods | null> {
  if (!referralEmailOrCode) return null;
  const val = referralEmailOrCode.trim().toLowerCase();
  const isEmail = val.includes('@');

  // Strategy 1: look up by referral_code directly in reseller_payment_methods
  if (!isEmail) {
    const { data: byCode } = await supabase
      .from('reseller_payment_methods')
      .select('*')
      .eq('referral_code', val)
      .maybeSingle();
    if (byCode) {
      // Check subscription status
      const { data: subRow } = await supabase
        .from('reseller_subscriptions')
        .select('status')
        .eq('user_id', byCode.user_id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (subRow?.status === 'paused') return { _paused: true } as ResellerPaymentMethods;
      console.log('[Reseller] Found via referral_code:', val);
      return byCode;
    }
  }

  // Strategy 2: look up by user_email directly
  if (isEmail) {
    const { data: byEmail } = await supabase
      .from('reseller_payment_methods')
      .select('*')
      .eq('user_email', val)
      .maybeSingle();
    if (byEmail) {
      console.log('[Reseller] Found via user_email:', val);
      return byEmail;
    }
  }

  // Strategy 3: resolve via reseller_accounts (fallback)
  const { data: accRow } = await supabase
    .from('reseller_accounts')
    .select('user_id')
    .eq(isEmail ? 'email' : 'referral_code', val)
    .maybeSingle();

  if (!accRow?.user_id) {
    console.log('[Reseller] Not found for:', val);
    return null;
  }

  // Check subscription status — if paused, block the ref link
  const { data: subRow } = await supabase
    .from('reseller_subscriptions')
    .select('status')
    .eq('user_id', accRow.user_id)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (subRow?.status === 'paused') {
    return { _paused: true } as ResellerPaymentMethods;
  }

  const { data } = await supabase
    .from('reseller_payment_methods')
    .select('*')
    .eq('user_id', accRow.user_id)
    .maybeSingle();

  return data ?? null;
}
