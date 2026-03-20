# 1999X Panel — Setup Guide

## ✅ What Was Updated

### Fixes
- **Logout bug fixed** — User stays logged out after logout, no auto re-login
- **Login** — Google OAuth only (signup removed)
- **License keys** — Now validates against BOTH Lag and Internal KeyAuth apps
  - After activation: shows **1999X INTERNAL PANEL** and **1999X FAKE LAG PANEL** cards
- **HWID Reset** — Confirmation popup before reset
- **Panel Status** — Removed all dummy/fake text, removed "Lag Bypass (KeyAuth)" and "Internal (KeyAuth)" service rows, added **OB52 Undetected** badge
- **Chat** — Full Supabase realtime (all users see all messages live), typing indicator, edit, delete, reply
- **Welcome section** — Shows "Welcome back, {Google Name}"
- **Bonus button** — "Everyday 10 Points · 100 Points = 3 Day Key OR $1 Balance"
- **Products** — bKash + Binance Pay with QR code, removed PayPal dropdown
- **Dashboard** — Purchase history added, removed "Why Go Premium" and featured cards
- **Design** — Deep dark purple SaaS theme matching reference image

## 🔧 Supabase Setup

### 1. Run SQL Migration (for Realtime Chat)
Go to: **Supabase Dashboard → SQL Editor** and run the file:
```
supabase/migrations/001_chat_messages.sql
```

### 2. Enable Google Auth
Go to: **Supabase Dashboard → Authentication → Providers → Google**
- Enable Google provider
- Add your Google OAuth credentials

### 3. Edge Function Secrets
Go to: **Supabase Dashboard → Edge Functions → Secrets**
Add these secrets:
```
KA_OWNERID      = your_keyauth_ownerid
KA_LAG_APPID    = your_lag_app_name
KA_LAG_VERSION  = 1.0
KA_INT_APPID    = your_internal_app_name
KA_INT_VERSION  = 1.0
```

### 4. Deploy Edge Functions
```bash
supabase functions deploy validate-key
supabase functions deploy keyauth-stats
```

### 5. Update Payment Details
In `src/pages/ProductsPage.tsx` and `src/pages/WalletPage.tsx`:
- Change `BKASH_NUMBER` to your real bKash number
- Change `BINANCE_ADDRESS` to your real USDT TRC20 address
- Replace `BKASH_QR` with your real bKash QR image URL

## 🚀 Run Locally
```bash
npm install
npm run dev
```

## 📦 Build
```bash
npm run build
```
