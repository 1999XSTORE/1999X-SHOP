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
