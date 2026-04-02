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
}

export async function fetchResellerPaymentMethods(
  supabase: any,
  referralEmailOrCode: string
): Promise<ResellerPaymentMethods | null> {
  if (!referralEmailOrCode) return null;
  const val = referralEmailOrCode.trim().toLowerCase();
  const isEmail = val.includes('@');

  // Strategy 1: look up directly by user_email in reseller_payment_methods
  if (isEmail) {
    const { data: direct } = await supabase
      .from('reseller_payment_methods')
      .select('*')
      .eq('user_email', val)
      .maybeSingle();
    if (direct) return direct;
  }

  // Strategy 2: resolve via reseller_accounts (email or ref code → user_id)
  const { data: accRow } = await supabase
    .from('reseller_accounts')
    .select('user_id')
    .or(isEmail
      ? `email.eq.${val}`
      : `referral_code.eq.${val}`)
    .maybeSingle();

  const userId = accRow?.user_id ?? null;
  if (!userId) return null;

  const { data } = await supabase
    .from('reseller_payment_methods')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  return data ?? null;
}
