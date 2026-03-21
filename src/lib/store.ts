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
  status: 'active' | 'expired' | 'banned';
  ip: string;
  device: string;
  hwidResetsUsed: number;
  hwidResetMonth: number;
  lastHwidReset?: string;
  productType?: 'weekly' | 'monthly' | 'combo' | 'reward' | 'trial' | 'lifetime';
  boundEmail?: string;
}

export interface PurchaseRecord {
  id: string;
  productId: string;
  productName: string;
  productType: string;
  amount: number;
  key: string;
  expiresAt: string;
  purchasedAt: string;
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
  productType?: 'weekly' | 'monthly' | 'combo' | 'lifetime' | 'trial';
  durationDays?: number;
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
  claimStreak: number;
  lastClaimDay: string | null;
  transactions: Transaction[];
  licenses: License[];
  purchaseHistory: PurchaseRecord[];
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
  claimRewardBalance: () => boolean;
  claimRewardKey: () => License | null;
  addChatMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  addSupportMessage: (msg: Omit<ChatMessage, 'id' | 'timestamp'>) => void;
  deleteChatMessage: (id: string) => void;
  highlightChatMessage: (id: string) => void;
  resetHwid: (licenseId: string) => boolean;
  addLicense: (license: License) => void;
  banKey: (licenseId: string) => void;
  unbanKey: (licenseId: string) => void;
  addAnnouncement: (ann: Omit<Announcement, 'id' | 'createdAt'>) => void;
  deleteAnnouncement: (id: string) => void;
  addPurchaseRecord: (record: PurchaseRecord) => void;
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
  claimStreak: number;
  lastClaimDay: string | null;
  purchaseHistory: PurchaseRecord[];
}

function loadUserData(userId: string): UserData {
  try {
    const raw = localStorage.getItem(`1999x-user-${userId}`);
    if (raw) return JSON.parse(raw);
  } catch {}
  return { balance: 0, licenses: [], bonusPoints: 0, lastBonusClaim: null, claimStreak: 0, lastClaimDay: null, purchaseHistory: [] };
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
    name: 'Weekly Key',
    price: 4.99,
    duration: '7 days',
    description: 'Perfect for trying out. Full access for 7 days.',
    features: ['Lag Bypass', 'Auto Updates', '24/7 Support', 'HWID Binding'],
    badge: 'WEEKLY',
    badgeType: 'green',
    image: '',
    productType: 'weekly',
    durationDays: 7,
  },
  {
    id: 'p2',
    name: 'Monthly Key',
    price: 14.99,
    duration: '30 days',
    description: 'Full access for 30 days. Most popular choice.',
    features: ['Lag Bypass', 'HWID Spoofer', 'Auto Updates', 'Priority Support', 'HWID Reset'],
    badge: 'POPULAR',
    badgeType: 'gold',
    image: '',
    productType: 'monthly',
    durationDays: 30,
  },
  {
    id: 'p3',
    name: 'Combo Key',
    price: 24.99,
    duration: '30 days',
    description: 'Access to ALL products. Best value bundle.',
    features: ['ALL Products Access', 'Lag Bypass + Internal', 'HWID Spoofer', 'Lifetime Updates', 'VIP Support'],
    badge: 'BEST VALUE',
    badgeType: 'indigo',
    image: '',
    productType: 'combo',
    durationDays: 30,
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      balance: 0,
      bonusPoints: 0,
      lastBonusClaim: null,
      claimStreak: 0,
      lastClaimDay: null,
      transactions: [],
      licenses: [],
      purchaseHistory: [],
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
        const saved = loadUserData(user.id);
        set({
          user,
          isAuthenticated:  true,
          balance:          saved.balance,
          licenses:         saved.licenses,
          bonusPoints:      saved.bonusPoints,
          lastBonusClaim:   saved.lastBonusClaim,
          claimStreak:      saved.claimStreak ?? 0,
          lastClaimDay:     saved.lastClaimDay ?? null,
          purchaseHistory:  saved.purchaseHistory ?? [],
        });
      },

      logout: () => {
        const state = get();
        if (state.user?.id) {
          saveUserData(state.user.id, {
            balance:        state.balance,
            licenses:       state.licenses,
            bonusPoints:    state.bonusPoints,
            lastBonusClaim: state.lastBonusClaim,
            claimStreak:    state.claimStreak,
            lastClaimDay:   state.lastClaimDay,
            purchaseHistory: state.purchaseHistory,
          });
        }
        set({
          user:            null,
          isAuthenticated: false,
          balance:         0,
          bonusPoints:     0,
          lastBonusClaim:  null,
          claimStreak:     0,
          lastClaimDay:    null,
          transactions:    [],
          licenses:        [],
          purchaseHistory: [],
        });
      },

      addBalance: (amount) => {
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
        const durationDays = product.durationDays ?? parseInt(product.duration) ?? 7;
        const license: License = {
          id:             generateId(),
          productId:      product.id,
          productName:    product.name,
          key:            generateKey(),
          hwid:           '',
          lastLogin:      new Date().toISOString(),
          expiresAt:      product.productType === 'lifetime'
            ? '2099-12-31T23:59:59Z'
            : new Date(Date.now() + durationDays * 86400000).toISOString(),
          status:         'active',
          ip:             '',
          device:         '',
          hwidResetsUsed: 0,
          hwidResetMonth: new Date().getMonth(),
          productType:    product.productType,
          boundEmail:     state.user?.email ?? '',
        };
        const purchaseRecord: PurchaseRecord = {
          id:          license.id,
          productId:   product.id,
          productName: product.name,
          productType: product.productType ?? 'weekly',
          amount:      product.price,
          key:         license.key,
          expiresAt:   license.expiresAt,
          purchasedAt: new Date().toISOString(),
        };
        const newBalance  = state.balance - product.price;
        const newLicenses = [license, ...state.licenses];
        const newHistory  = [purchaseRecord, ...(state.purchaseHistory ?? [])];
        set({ balance: newBalance, licenses: newLicenses, purchaseHistory: newHistory });
        if (state.user?.id) {
          saveUserData(state.user.id, { balance: newBalance, licenses: newLicenses, purchaseHistory: newHistory });
        }
        return license;
      },

      claimBonus: () => {
        const state = get();
        const now = Date.now();
        if (state.lastBonusClaim && now - new Date(state.lastBonusClaim).getTime() < 86400000) return false;
        const todayStr = new Date().toDateString();
        const yesterdayStr = new Date(Date.now() - 86400000).toDateString();
        const streak = state.lastClaimDay === yesterdayStr ? (state.claimStreak ?? 0) + 1 : 1;
        const newPoints = state.bonusPoints + 10;
        const newClaim  = new Date().toISOString();
        set({ bonusPoints: newPoints, lastBonusClaim: newClaim, claimStreak: streak, lastClaimDay: todayStr });
        if (state.user?.id) {
          saveUserData(state.user.id, { bonusPoints: newPoints, lastBonusClaim: newClaim, claimStreak: streak, lastClaimDay: todayStr });
        }
        return true;
      },

      claimRewardBalance: () => {
        const state = get();
        if (state.bonusPoints < 100) return false;
        const newPoints  = state.bonusPoints - 100;
        const newBalance = state.balance + 3;
        set({ bonusPoints: newPoints, balance: newBalance });
        if (state.user?.id) {
          saveUserData(state.user.id, { bonusPoints: newPoints, balance: newBalance });
        }
        return true;
      },

      claimRewardKey: () => {
        const state = get();
        if (state.bonusPoints < 100) return null;
        const newPoints = state.bonusPoints - 100;
        const license: License = {
          id:             generateId(),
          productId:      'reward',
          productName:    '3-Day Reward Key',
          key:            generateKey(),
          hwid:           '',
          lastLogin:      new Date().toISOString(),
          expiresAt:      new Date(Date.now() + 3 * 86400000).toISOString(),
          status:         'active',
          ip:             '',
          device:         '',
          hwidResetsUsed: 0,
          hwidResetMonth: new Date().getMonth(),
          productType:    'reward',
          boundEmail:     state.user?.email ?? '',
        };
        const newLicenses = [license, ...state.licenses];
        set({ bonusPoints: newPoints, licenses: newLicenses });
        if (state.user?.id) {
          saveUserData(state.user.id, { bonusPoints: newPoints, licenses: newLicenses });
        }
        return license;
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
        if (state.user?.id) {
          saveUserData(state.user.id, { licenses: newLicenses });
        }
      },

      banKey: (licenseId) => {
        const state = get();
        const newLicenses = state.licenses.map(l =>
          l.id === licenseId ? { ...l, status: 'banned' as const } : l
        );
        set({ licenses: newLicenses });
        if (state.user?.id) saveUserData(state.user.id, { licenses: newLicenses });
      },

      unbanKey: (licenseId) => {
        const state = get();
        const newLicenses = state.licenses.map(l =>
          l.id === licenseId ? { ...l, status: 'active' as const } : l
        );
        set({ licenses: newLicenses });
        if (state.user?.id) saveUserData(state.user.id, { licenses: newLicenses });
      },

      addAnnouncement: (ann) => set((s) => ({
        announcements: [{ ...ann, id: generateId(), createdAt: new Date().toISOString() }, ...s.announcements],
      })),

      deleteAnnouncement: (id) => set((s) => ({
        announcements: s.announcements.filter(a => a.id !== id),
      })),

      addPurchaseRecord: (record) => {
        const state = get();
        const newHistory = [record, ...(state.purchaseHistory ?? [])];
        set({ purchaseHistory: newHistory });
        if (state.user?.id) saveUserData(state.user.id, { purchaseHistory: newHistory });
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
            ? { ...l, hwid: '', hwidResetsUsed: resetsUsed + 1, hwidResetMonth: currentMonth, lastHwidReset: new Date().toISOString() }
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
