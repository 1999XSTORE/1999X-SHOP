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
  {
    id: 'p1',
    name: 'Lag Bypass 1 Day',
    price: 1.99,
    duration: '1 day',
    description: 'Perfect for trying out. Full lag bypass for 1 day.',
    features: ['Lag Bypass', 'Auto Updates', '24/7 Support'],
    badge: 'TRIAL',
    badgeType: 'green',
    image: '',
  },
  {
    id: 'p2',
    name: 'Lag Bypass 30 Days',
    price: 9.99,
    duration: '30 days',
    description: 'Full access for 30 days. Most popular choice.',
    features: ['Lag Bypass', 'HWID Spoofer', 'Auto Updates', 'Priority Support'],
    badge: 'POPULAR',
    badgeType: 'gold',
    image: '',
  },
  {
    id: 'p3',
    name: 'Lag Bypass Lifetime',
    price: 49.99,
    duration: 'Lifetime',
    description: 'One-time purchase. Never pay again.',
    features: ['Lag Bypass', 'HWID Spoofer', 'Lifetime Updates', 'VIP Support', 'All Future Features'],
    badge: 'BEST VALUE',
    badgeType: 'indigo',
    image: '',
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
        const state = get();
        const newBalance = state.balance + amount;
        set({ balance: newBalance });
        // Save immediately — don't wait for logout
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
