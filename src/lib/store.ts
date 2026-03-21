import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface User {
  id: string;
  email: string;
  name: string;
  avatar: string;
  role: 'user' | 'admin' | 'support';
}

export interface Transaction {
  id: string;
  amount: number;
  method: string;
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
}

export interface License {
  id: string;
  productId: string;
  productName: string;
  key: string;
  hwid: string;
  lastLogin: string;
  expiresAt: string;
  status: 'active' | 'expired';
  ip: string;
  device: string;
  hwidResetsUsed: number;
  hwidResetMonth: number;
}

export interface Product {
  id: string;
  name: string;
  price: number;
  duration: string;
  description: string;
  features: string[];
  badge: string;
  badgeType: 'green' | 'gold' | 'indigo';
  image: string;
  keyauthPanel?: 'lag' | 'internal' | 'both'; // which KeyAuth app to generate key for
}

export interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: 'user' | 'admin' | 'support';
  message: string;
  timestamp: string;
  highlighted?: boolean;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  createdAt: string;
  type: 'update' | 'maintenance' | 'feature';
}

interface AppState {
  user: User | null;
  balance: number;
  bonusPoints: number;
  lastBonusClaim: string | null;
  transactions: Transaction[];
  licenses: License[];
  chatMessages: ChatMessage[];
  supportMessages: ChatMessage[];
  announcements: Announcement[];
  systemStatus: 'online' | 'maintenance';
  lastStatusUpdate: string;
  isAuthenticated: boolean;

  login: (user: User) => void;
  logout: () => void;
  addBalance: (amount: number) => void;
  addTransaction: (tx: Omit<Transaction, 'id' | 'createdAt'>) => void;
  purchaseProduct: (product: Product) => License | null;
  claimBonus: () => boolean;
  redeemPoints: (pts: number) => boolean;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  addSupportMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  deleteChatMessage: (id: string) => void;
  highlightChatMessage: (id: string) => void;
  resetHwid: (licenseId: string) => boolean;
  addLicense: (license: License) => void;
}

const generateKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = Array.from({ length: 4 }, () =>
    Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  );
  return segments.join('-');
};

const generateId = () => Math.random().toString(36).substring(2, 10);

// ── Per-user data storage ─────────────────────────────────────
// Stores balance + licenses under a key specific to each user ID.
// This means data NEVER gets wiped on logout — it's always there
// waiting when the user logs back in.

interface UserData {
  balance: number;
  licenses: License[];
  bonusPoints: number;
  lastBonusClaim: string | null;
}

function loadUserData(userId: string): UserData {
  try {
    const raw = localStorage.getItem(`1999x-user-${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { balance: 0, licenses: [], bonusPoints: 0, lastBonusClaim: null };
}

function saveUserData(userId: string, data: Partial<UserData>) {
  try {
    const existing = loadUserData(userId);
    localStorage.setItem(`1999x-user-${userId}`, JSON.stringify({ ...existing, ...data }));
  } catch {}
}

// ─────────────────────────────────────────────
//  ✏️  EDIT YOUR PRODUCTS HERE
// ─────────────────────────────────────────────
export const PRODUCTS: Product[] = [
  // ── Internal Panel ──────────────────────
  {
    id: 'internal-3d',
    name: 'Internal — 3 Days',
    price: 3,
    duration: '3 days',
    description: 'Try the Internal panel. Full features for 3 days.',
    features: ['Aimbot & ESP', 'Speed & No recoil', 'Auto updates', 'OB52 Undetected'],
    badge: 'TRIAL',
    badgeType: 'green',
    image: '',
    keyauthPanel: 'internal' as const,
  },
  {
    id: 'internal-7d',
    name: 'Internal — 7 Days',
    price: 7,
    duration: '7 days',
    description: 'Weekly Internal panel access. Great value.',
    features: ['Aimbot & ESP', 'Speed & No recoil', 'Auto updates', 'Priority Support'],
    badge: 'WEEKLY',
    badgeType: 'green',
    image: '',
    keyauthPanel: 'internal' as const,
  },
  {
    id: 'internal-30d',
    name: 'Internal — 30 Days',
    price: 15,
    duration: '30 days',
    description: 'Monthly Internal panel. Best per-day value.',
    features: ['Aimbot & ESP', 'Speed & No recoil', 'HWID Spoofer', 'VIP Support'],
    badge: 'POPULAR',
    badgeType: 'gold',
    image: '',
    keyauthPanel: 'internal' as const,
  },
  // ── Combo ────────────────────────────────
  {
    id: 'combo-7d',
    name: 'Combo — Weekly',
    price: 10,
    duration: '7 days',
    description: 'Internal + Fake Lag together. Full 1999X experience.',
    features: ['Everything in Internal', 'Everything in Fake Lag', 'Priority Support', 'Best price guaranteed'],
    badge: 'COMBO',
    badgeType: 'gold',
    image: '',
    keyauthPanel: 'both' as const,
  },
  {
    id: 'combo-30d',
    name: 'Combo — Monthly',
    price: 20,
    duration: '30 days',
    description: 'Monthly combo deal. Internal + Fake Lag at best price.',
    features: ['Everything in Internal', 'Everything in Fake Lag', 'Priority Support', 'Best price guaranteed'],
    badge: 'BEST VALUE',
    badgeType: 'indigo',
    image: '',
    keyauthPanel: 'both' as const,
  },
  // ── Fake Lag ─────────────────────────────
  {
    id: 'lag-7d',
    name: 'Fake Lag — Weekly',
    price: 5,
    duration: '7 days',
    description: 'Weekly Fake Lag access. Dominate with network control.',
    features: ['Lag switch control', 'Packet manipulation', 'Adjustable delay', 'OB52 Undetected'],
    badge: 'WEEKLY',
    badgeType: 'green',
    image: '',
    keyauthPanel: 'lag' as const,
  },
  {
    id: 'lag-30d',
    name: 'Fake Lag — Monthly',
    price: 10,
    duration: '30 days',
    description: 'Monthly Fake Lag access. Best value for serious players.',
    features: ['Lag switch control', 'Packet manipulation', 'Adjustable delay', 'OB52 Undetected'],
    badge: 'MONTHLY',
    badgeType: 'indigo',
    image: '',
    keyauthPanel: 'lag' as const,
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      balance: 0,
      bonusPoints: 0,
      lastBonusClaim: null,
      transactions: [],
      licenses: [],
      chatMessages: [
        {
          id: 'c1',
          userId: 'admin1',
          userName: 'Admin',
          userAvatar: '',
          userRole: 'admin',
          message: 'Welcome to 1999X! 🎉 Need help? Contact support.',
          timestamp: new Date().toISOString(),
        },
      ],
      supportMessages: [
        {
          id: 's1',
          userId: 'sup1',
          userName: 'Support Team',
          userAvatar: '',
          userRole: 'support',
          message: 'Hello! How can we help you today?',
          timestamp: new Date().toISOString(),
        },
      ],
      announcements: [
        {
          id: 'a1',
          title: 'Welcome to 1999X Panel',
          content: 'Our new panel is live! Purchase a key and start using our software today.',
          createdAt: new Date().toISOString(),
          type: 'update',
        },
      ],
      systemStatus: 'online',
      lastStatusUpdate: new Date().toISOString(),
      isAuthenticated: false,

      login: (user) => {
        // Always load this user's saved data — works after logout, refresh, or new device
        const saved = loadUserData(user.id);
        set({
          user,
          isAuthenticated:  true,
          balance:          saved.balance,
          licenses:         saved.licenses,
          bonusPoints:      saved.bonusPoints,
          lastBonusClaim:   saved.lastBonusClaim,
        });
      },

      logout: () => {
        // Save current data before clearing the screen
        const state = get();
        if (state.user?.id) {
          saveUserData(state.user.id, {
            balance:        state.balance,
            licenses:       state.licenses,
            bonusPoints:    state.bonusPoints,
            lastBonusClaim: state.lastBonusClaim,
          });
        }
        // Only clear identity — NOT the saved data in localStorage
        set({
          user:            null,
          isAuthenticated: false,
          balance:         0,
          bonusPoints:     0,
          lastBonusClaim:  null,
          transactions:    [],
          licenses:        [],
        });
      },

      addBalance: (amount) => {
        if (amount <= 0) return; // never add zero or negative
        const state = get();
        const newBalance = state.balance + amount;
        set({ balance: newBalance });
        if (state.user?.id) {
          saveUserData(state.user.id, { balance: newBalance });
        }
      },

      addTransaction: (tx) => set((s) => ({
        transactions: [{ ...tx, id: generateId(), createdAt: new Date().toISOString() }, ...s.transactions],
      })),

      purchaseProduct: (product) => {
        const state = get();
        if (state.balance < product.price) return null;
        const license: License = {
          id:             generateId(),
          productId:      product.id,
          productName:    product.name,
          key:            generateKey(),
          hwid:           '',
          lastLogin:      new Date().toISOString(),
          expiresAt:      product.duration === 'Lifetime'
            ? '2099-12-31T23:59:59Z'
            : new Date(Date.now() + parseInt(product.duration) * 86400000).toISOString(),
          status:         'active',
          ip:             '',
          device:         '',
          hwidResetsUsed: 0,
          hwidResetMonth: new Date().getMonth(),
        };
        const newBalance  = state.balance - product.price;
        const newLicenses = [license, ...state.licenses];
        set({ balance: newBalance, licenses: newLicenses });
        // Save immediately
        if (state.user?.id) {
          saveUserData(state.user.id, { balance: newBalance, licenses: newLicenses });
        }
        return license;
      },

      claimBonus: () => {
        const state = get();
        const now = Date.now();
        if (state.lastBonusClaim && now - new Date(state.lastBonusClaim).getTime() < 86400000) return false;
        const newPoints = state.bonusPoints + 10;
        const newClaim  = new Date().toISOString();
        set({ bonusPoints: newPoints, lastBonusClaim: newClaim });
        if (state.user?.id) {
          saveUserData(state.user.id, { bonusPoints: newPoints, lastBonusClaim: newClaim });
        }
        return true;
      },
      redeemPoints: (pts: number) => {
        const state = get();
        if (state.bonusPoints < pts) return false;
        const newPoints = state.bonusPoints - pts;
        set({ bonusPoints: newPoints });
        if (state.user?.id) {
          saveUserData(state.user.id, { bonusPoints: newPoints });
        }
        return true;
      },

      addChatMessage: (msg) => set((s) => ({
        chatMessages: [...s.chatMessages, { ...msg, id: generateId(), timestamp: new Date().toISOString() }],
      })),

      addSupportMessage: (msg) => set((s) => ({
        supportMessages: [...s.supportMessages, { ...msg, id: generateId(), timestamp: new Date().toISOString() }],
      })),

      deleteChatMessage: (id) => set((s) => ({
        chatMessages: s.chatMessages.filter((m) => m.id !== id),
      })),

      highlightChatMessage: (id) => set((s) => ({
        chatMessages: s.chatMessages.map((m) => m.id === id ? { ...m, highlighted: !m.highlighted } : m),
      })),

      addLicense: (license) => {
        const state = get();
        const newLicenses = [license, ...state.licenses.filter(l => l.key !== license.key)];
        set({ licenses: newLicenses });
        // Save immediately — key is now permanently saved
        if (state.user?.id) {
          saveUserData(state.user.id, { licenses: newLicenses });
        }
      },

      resetHwid: (licenseId) => {
        const state = get();
        const license = state.licenses.find((l) => l.id === licenseId);
        if (!license) return false;
        const currentMonth = new Date().getMonth();
        const resetsUsed   = license.hwidResetMonth === currentMonth ? license.hwidResetsUsed : 0;
        if (resetsUsed >= 2) return false;
        const newLicenses = state.licenses.map((l) =>
          l.id === licenseId
            ? { ...l, hwid: 'HW-' + generateId().toUpperCase(), hwidResetsUsed: resetsUsed + 1, hwidResetMonth: currentMonth }
            : l
        );
        set({ licenses: newLicenses });
        if (state.user?.id) {
          saveUserData(state.user.id, { licenses: newLicenses });
        }
        return true;
      },
    }),
    {
      name: '1999x-store',
      // Only persist non-user-specific data via Zustand persist
      // User data (balance, licenses) is handled by loadUserData/saveUserData
      partialize: (state) => ({
        chatMessages:    state.chatMessages,
        supportMessages: state.supportMessages,
        announcements:   state.announcements,
        systemStatus:    state.systemStatus,
        lastStatusUpdate: state.lastStatusUpdate,
      }),
    }
  )
);
