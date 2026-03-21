# 🚀 1999X Panel — Upgrade Guide (v10)

This document explains every new feature added and how to wire them up.

---

## ✅ What's New

### 🎁 Reward System ($3 upgrade)
- All `$1` references changed to **`$3`** throughout i18n
- Bonus page shows streak counter + glow claim button
- **Reward Modal** pops up when 100 pts are earned with 2 options:
  - `💰 Get $3 Balance` → instantly adds $3 to wallet
  - `🔑 Get 3-Day Key` → generates a bound license key + shows it in a glass card

### 🛒 Smart Product Key Delivery
- 3 products: **Weekly (7d)**, **Monthly (30d)**, **Combo (30d, all access)**
- After purchase: `PurchaseSuccessModal` shows immediately with:
  - The generated key (copy button)
  - Live countdown timer
  - Bound email + Active status badge
- Keys are automatically bound to the buyer's Google email

### 🔑 KeyAuth Auto Key Generation
- New edge function: `supabase/functions/generate-key/index.ts`
- Uses **KeyAuth Seller API** to generate real keys
- Falls back to local key if KeyAuth is not configured
- Maps product type → correct duration automatically

### 🔐 HWID Security
- Every key stores `boundEmail` (Google email from login)
- `LicenseCard` shows: HWID, Device, Last Login, Bound Email
- HWID Reset: 2 resets/month, cooldown tracked
- Banned keys show red status and block HWID reset

### 🧩 New Components
| File | Purpose |
|------|---------|
| `RewardModal.tsx` | Glassmorphism popup for reward choice |
| `PurchaseSuccessModal.tsx` | Post-purchase key display with countdown |
| `BonusPage.tsx` | Full bonus page with streak + glow button |
| `LicenseCard.tsx` | Rich key card with HWID, countdown, reset |
| `LicensesPage.tsx` | All licenses view with activate input |
| `AdminPanel.tsx` | Announcements, key viewer, ban/unban, generate |
| `PurchaseHistoryPage.tsx` | Full purchase log with key copy |

### 📊 Database (New Migration)
Run `supabase/migrations/005_licenses_and_purchases.sql` in your Supabase SQL editor.

Creates:
- `user_licenses` — stores all keys with HWID, expiry, bound_email, status
- `purchase_history` — full purchase log per user
- `user_balances` — optional balance sync to DB

### 🛠️ Admin Panel
New `AdminPanel.tsx` component gives admins:
- Post/delete announcements (pushed to all users)
- View all keys in system (ban/unban/copy)
- View all purchase records
- Manually generate keys and deliver to account

---

## 🔧 Setup Steps

### 1. Run the new Supabase migration
```sql
-- In Supabase Dashboard → SQL Editor → New Query
-- Copy and run: supabase/migrations/005_licenses_and_purchases.sql
```

### 2. Deploy the new edge function
```bash
supabase functions deploy generate-key
```

### 3. Set KeyAuth secrets (for real key generation)
In Supabase Dashboard → Edge Functions → Secrets:
```
KA_SELLER_KEY    = your-keyauth-seller-key
KA_LAG_APPNAME   = YourLagAppName
KA_LAG_OWNERID   = your-lag-ownerid
KA_LAG_VERSION   = 1.0
KA_INT_APPNAME   = YourInternalAppName
KA_INT_OWNERID   = your-int-ownerid
KA_INT_VERSION   = 1.0
```

> **Note:** If `KA_SELLER_KEY` is not set, the system falls back to generating local keys (same format, not registered in KeyAuth).

### 4. Wire new components into your router/pages

Add these imports and routes to your existing routing setup:

```tsx
import BonusPage           from '@/components/BonusPage';
import LicensesPage        from '@/components/LicensesPage';
import AdminPanel          from '@/components/AdminPanel';
import PurchaseHistoryPage from '@/components/PurchaseHistoryPage';

// In your router:
// /bonus       → <BonusPage />
// /licenses    → <LicensesPage />
// /admin       → <AdminPanel /> (gate to admin role)
// /purchases   → <PurchaseHistoryPage />
```

### 5. Protect the admin route
```tsx
// Only show AdminPanel if user.role === 'admin'
{user?.role === 'admin' && <AdminPanel />}
```

---

## 🗂️ Store Changes (store.ts)

### New state fields
| Field | Type | Purpose |
|-------|------|---------|
| `claimStreak` | `number` | Daily claim streak counter |
| `lastClaimDay` | `string\|null` | Date string of last claim day |
| `purchaseHistory` | `PurchaseRecord[]` | Full purchase log |

### New actions
| Action | Returns | Purpose |
|--------|---------|---------|
| `claimRewardBalance()` | `boolean` | Deduct 100pts, add $3 to wallet |
| `claimRewardKey()` | `License\|null` | Deduct 100pts, generate 3-day key |
| `banKey(id)` | `void` | Set license status to 'banned' |
| `unbanKey(id)` | `void` | Restore license to 'active' |
| `addAnnouncement(ann)` | `void` | Add announcement |
| `deleteAnnouncement(id)` | `void` | Remove announcement |
| `addPurchaseRecord(r)` | `void` | Save purchase to history |

### Updated License interface
```ts
interface License {
  // ... existing fields ...
  productType?: 'weekly' | 'monthly' | 'combo' | 'reward' | 'trial' | 'lifetime';
  boundEmail?: string;     // Google email bound on purchase
  lastHwidReset?: string;  // ISO timestamp of last HWID reset
  status: 'active' | 'expired' | 'banned'; // Added 'banned'
}
```

### Updated Product interface
```ts
interface Product {
  // ... existing fields ...
  productType?: 'weekly' | 'monthly' | 'combo' | 'lifetime' | 'trial';
  durationDays?: number;  // Explicit day count for key generation
}
```

---

## 📦 New Products (store.ts)

| ID | Name | Price | Duration | Type |
|----|------|-------|----------|------|
| p1 | Weekly Key | $4.99 | 7 days | weekly |
| p2 | Monthly Key | $14.99 | 30 days | monthly |
| p3 | Combo Key | $24.99 | 30 days | combo |

To customize, edit `PRODUCTS` array in `src/lib/store.ts`.

---

## 🎨 No CSS Changes Needed

All new components use inline styles with your existing CSS variables (`--purple`, `--green`, `--blue`, etc.) and existing Tailwind classes. Drop them in and they match your design system automatically.

---

## 🐛 Troubleshooting

**Q: Reward modal doesn't open**
→ Make sure `bonusPoints >= 100` before calling `setRewardOpen(true)` in BonusPage

**Q: Key countdown shows wrong time**
→ Check that `expiresAt` is stored as a valid ISO timestamp string

**Q: Admin panel shows no keys**
→ `licenses` in store comes from the current user's localStorage. For a global view, wire `AdminPanel` to read from Supabase `user_licenses` table using the service key.

**Q: KeyAuth key generation returns local key**
→ Set `KA_SELLER_KEY` in Supabase edge function secrets. Without it, local keys are generated as fallback.

**Q: HWID reset not working**
→ Max 2 resets per month. Check `hwidResetsUsed` and `hwidResetMonth` on the license object.
