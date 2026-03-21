# 🔐 Secure KeyAuth Setup Guide

Your KeyAuth secrets are stored in Supabase Secrets — 
never in your frontend code. Nobody can see them.

---

## HOW IT WORKS

Browser → Supabase Edge Function → KeyAuth API
         (your secrets live here,
          nobody can see them)

---

## STEP 1 — Add Secrets in Supabase Dashboard

Go to: supabase.com → Your Project → Edge Functions → Secrets

Add these 8 secrets one by one:

Secret Name          | Value
---------------------|-------------------------
KA_LAG_OWNERID       | your KeyAuth owner ID
KA_LAG_APPID         | your lag app ID
KA_LAG_SECRET        | your lag app secret
KA_LAG_VERSION       | 1.0
KA_INT_OWNERID       | your KeyAuth owner ID (same)
KA_INT_APPID         | your internal app ID
KA_INT_SECRET        | your internal app secret
KA_INT_VERSION       | 1.0

---

## STEP 2 — Deploy the Edge Function

Install Supabase CLI on your computer:
  npm install -g supabase

Login:
  supabase login

Link your project:
  supabase link --project-ref YOUR_PROJECT_REF

Deploy the function:
  supabase functions deploy keyauth-stats

---

## STEP 3 — Done!

Your frontend calls the Edge Function.
The Edge Function calls KeyAuth with your secrets.
Secrets never reach the browser. ✅

---

## WHERE TO FIND YOUR KEYAUTH VALUES

1. Go to keyauth.win
2. Login → Dashboard
3. Click your app
4. Copy: OwnerID, AppID, Secret
