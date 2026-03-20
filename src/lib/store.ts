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

const DEMO_PRODUCTS: Product[] = [
  {
    id: 'p1', name: 'Starter Pack', price: 4.99, duration: '30 days',
    description: 'Perfect for beginners. Get access to basic features and start your journey.',
    features: ['Anti-Cheat Bypass', 'Auto Updates', 'Basic Aimbot', '24/7 Support'],
    badge: 'ACTIVE', badgeType: 'green',
    image: ''
  },
  {
    id: 'p2', name: 'Premium Pack', price: 14.99, duration: '30 days',
    description: 'Unlock the full power. All features enabled with priority support.',
    features: ['All Starter Features', 'ESP & Wallhack', 'Speed Hack', 'Priority Support', 'HWID Spoofer'],
    badge: 'POPULAR', badgeType: 'gold',
    image: ''
  },
  {
    id: 'p3', name: 'Lifetime Pack', price: 39.99, duration: 'Lifetime',
    description: 'One-time purchase. Lifetime access to every current and future feature.',
    features: ['All Premium Features', 'Lifetime Updates', 'Custom Scripts', 'VIP Discord', 'Dedicated Support'],
    badge: 'BEST VALUE', badgeType: 'indigo',
    image: ''
  },
];

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      user: null,
      balance: 25.00,
      bonusPoints: 120,
      lastBonusClaim: null,
      transactions: [
        { id: '1', amount: 10, method: 'bkash', transactionId: 'TXN123456', status: 'approved', createdAt: '2025-03-18T10:30:00Z' },
        { id: '2', amount: 15, method: 'paypal', transactionId: 'PAY789012', status: 'pending', createdAt: '2025-03-19T14:20:00Z' },
      ],
      licenses: [
        {
          id: 'l1', productId: 'p1', productName: 'Starter Pack',
          key: 'S99X-ABCD-EFGH-1234', hwid: 'HW-9F3A2B1C',
          lastLogin: '2025-03-20T08:15:00Z', expiresAt: '2025-04-19T08:15:00Z',
          status: 'active', ip: '192.168.1.42', device: 'Windows 11 PC',
          hwidResetsUsed: 0, hwidResetMonth: 3,
        }
      ],
      chatMessages: [
        { id: 'c1', userId: 'admin1', userName: 'Admin', userAvatar: '', userRole: 'admin', message: 'Welcome to the community! 🎉', timestamp: '2025-03-20T06:00:00Z' },
        { id: 'c2', userId: 'u2', userName: 'Alex', userAvatar: '', userRole: 'user', message: 'Hey everyone! Just got my key, works perfectly!', timestamp: '2025-03-20T06:15:00Z' },
        { id: 'c3', userId: 'sup1', userName: 'Support Team', userAvatar: '', userRole: 'support', message: 'Glad to hear! Let us know if you need anything.', timestamp: '2025-03-20T06:20:00Z' },
      ],
      supportMessages: [
        { id: 's1', userId: 'sup1', userName: 'Support Team', userAvatar: '', userRole: 'support', message: 'Hello! How can we help you today?', timestamp: '2025-03-20T06:00:00Z' },
      ],
      announcements: [
        { id: 'a1', title: 'v2.5 Update Released', content: 'New anti-detection engine and improved ESP system. All keys updated automatically.', createdAt: '2025-03-19T12:00:00Z', type: 'update' },
        { id: 'a2', title: 'Scheduled Maintenance', content: 'Brief maintenance window on March 22 from 2-4 AM UTC.', createdAt: '2025-03-18T09:00:00Z', type: 'maintenance' },
      ],
      systemStatus: 'online',
      lastStatusUpdate: '2025-03-20T08:00:00Z',
      isAuthenticated: false,

      login: (user) => set({ user, isAuthenticated: true }),
      logout: () => set({ user: null, isAuthenticated: false }),
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
          hwid: 'HW-' + generateId().toUpperCase(),
          lastLogin: new Date().toISOString(),
          expiresAt: product.duration === 'Lifetime'
            ? '2099-12-31T23:59:59Z'
            : new Date(Date.now() + 30 * 86400000).toISOString(),
          status: 'active',
          ip: '192.168.' + Math.floor(Math.random() * 255) + '.' + Math.floor(Math.random() * 255),
          device: 'Windows 11 PC',
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

export const PRODUCTS = DEMO_PRODUCTS;
