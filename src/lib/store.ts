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
  method: 'bkash' | 'binance' | 'paypal';
  transactionId: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  screenshot?: string;
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
}

const generateKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const segments = Array.from({ length: 4 }, () =>
    Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  );
  return segments.join('-');
};

const generateId = () => Math.random().toString(36).substring(2, 10);

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
      // ── Start everyone at $0 balance ──
      balance: 0,
      bonusPoints: 0,
      lastBonusClaim: null,
      // ── Empty — no fake transactions ──
      transactions: [],
      // ── Empty — no fake licenses ──
      licenses: [],
      // ── Default chat messages ──
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
      // ── Edit your announcements here ──
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

      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({
        user: null,
        isAuthenticated: false,
        // Reset user-specific data on logout
        balance: 0,
        bonusPoints: 0,
        lastBonusClaim: null,
        transactions: [],
        licenses: [],
      }),
      addBalance: (amount) => set((s) => ({ balance: s.balance + amount })),
      addTransaction: (tx) => set((s) => ({
        transactions: [{ ...tx, id: generateId(), createdAt: new Date().toISOString() }, ...s.transactions]
      })),
      purchaseProduct: (product) => {
        const state = get();
        if (state.balance < product.price) return null;
        const license: License = {
          id: generateId(),
          productId: product.id,
          productName: product.name,
          key: generateKey(),
          hwid: '',
          lastLogin: new Date().toISOString(),
          expiresAt: product.duration === 'Lifetime'
            ? '2099-12-31T23:59:59Z'
            : new Date(Date.now() + parseInt(product.duration) * 86400000).toISOString(),
          status: 'active',
          ip: '',
          device: '',
          hwidResetsUsed: 0,
          hwidResetMonth: new Date().getMonth(),
        };
        set((s) => ({
          balance: s.balance - product.price,
          licenses: [license, ...s.licenses],
        }));
        return license;
      },
      claimBonus: () => {
        const state = get();
        const now = Date.now();
        if (state.lastBonusClaim && now - new Date(state.lastBonusClaim).getTime() < 86400000) return false;
        set({ bonusPoints: state.bonusPoints + 10, lastBonusClaim: new Date().toISOString() });
        return true;
      },
      addChatMessage: (msg) => set((s) => ({
        chatMessages: [...s.chatMessages, { ...msg, id: generateId(), timestamp: new Date().toISOString() }]
      })),
      addSupportMessage: (msg) => set((s) => ({
        supportMessages: [...s.supportMessages, { ...msg, id: generateId(), timestamp: new Date().toISOString() }]
      })),
      deleteChatMessage: (id) => set((s) => ({
        chatMessages: s.chatMessages.filter((m) => m.id !== id)
      })),
      highlightChatMessage: (id) => set((s) => ({
        chatMessages: s.chatMessages.map((m) => m.id === id ? { ...m, highlighted: !m.highlighted } : m)
      })),
      resetHwid: (licenseId) => {
        const state = get();
        const license = state.licenses.find((l) => l.id === licenseId);
        if (!license) return false;
        const currentMonth = new Date().getMonth();
        const resetsUsed = license.hwidResetMonth === currentMonth ? license.hwidResetsUsed : 0;
        if (resetsUsed >= 2) return false;
        set((s) => ({
          licenses: s.licenses.map((l) =>
            l.id === licenseId
              ? { ...l, hwid: 'HW-' + generateId().toUpperCase(), hwidResetsUsed: resetsUsed + 1, hwidResetMonth: currentMonth }
              : l
          )
        }));
        return true;
      },
    }),
    { name: '1999x-store' }
  )
);
