export type AppRole = 'owner' | 'admin' | 'support' | 'reseller' | 'user';

export const ROLE_ORDER: AppRole[] = ['owner', 'admin', 'support', 'reseller', 'user'];

export const ROLE_META: Record<AppRole, { label: string; shortLabel: string; color: string; glow: string; bg: string; border: string }> = {
  owner: {
    label: 'Owner',
    shortLabel: 'OWNER',
    color: '#fbbf24',
    glow: 'rgba(251,191,36,.75)',
    bg: 'rgba(251,191,36,.12)',
    border: 'rgba(251,191,36,.28)',
  },
  admin: {
    label: 'Admin',
    shortLabel: 'ADMIN',
    color: '#f87171',
    glow: 'rgba(248,113,113,.7)',
    bg: 'rgba(248,113,113,.12)',
    border: 'rgba(248,113,113,.26)',
  },
  support: {
    label: 'Support',
    shortLabel: 'SUPPORT',
    color: '#60a5fa',
    glow: 'rgba(96,165,250,.72)',
    bg: 'rgba(96,165,250,.12)',
    border: 'rgba(96,165,250,.26)',
  },
  reseller: {
    label: 'Reseller',
    shortLabel: 'RESELLER',
    color: '#34d399',
    glow: 'rgba(52,211,153,.72)',
    bg: 'rgba(52,211,153,.12)',
    border: 'rgba(52,211,153,.24)',
  },
  user: {
    label: 'User',
    shortLabel: 'USER',
    color: 'rgba(255,255,255,.7)',
    glow: 'rgba(255,255,255,.2)',
    bg: 'rgba(255,255,255,.06)',
    border: 'rgba(255,255,255,.12)',
  },
};

export function normalizeRole(role: unknown): AppRole {
  const value = String(role ?? '').toLowerCase();
  if (value === 'owner' || value === 'admin' || value === 'support' || value === 'reseller') {
    return value;
  }
  return 'user';
}

export function isOwner(role?: AppRole | null) {
  return normalizeRole(role) === 'owner';
}

export function canApprovePayments(role?: AppRole | null) {
  const normalized = normalizeRole(role);
  return normalized === 'owner' || normalized === 'admin';
}

export function canModerateChat(role?: AppRole | null) {
  const normalized = normalizeRole(role);
  return normalized === 'owner' || normalized === 'admin' || normalized === 'support';
}

export function canAccessActivity(role?: AppRole | null) {
  return normalizeRole(role) === 'owner';
}

export function canManageAnnouncements(role?: AppRole | null) {
  return normalizeRole(role) === 'owner';
}

export function getDefaultPathForRole(role?: AppRole | null) {
  const normalized = normalizeRole(role);
  if (normalized === 'support') return '/chat';
  if (normalized === 'admin') return '/wallet';
  return '/';
}

export function canAccessPath(path: string, role?: AppRole | null) {
  const normalized = normalizeRole(role);
  if (normalized === 'owner') return true;
  if (path === '/admin-activity') return false;
  if (normalized === 'admin') return path === '/chat' || path === '/wallet';
  if (normalized === 'support') return path === '/chat';
  return true;
}

export function extractMentionedRole(message: string): AppRole | null {
  const match = message.match(/(^|\s)@(owner|admin|support|reseller)\b/i);
  return match ? normalizeRole(match[2]) : null;
}
