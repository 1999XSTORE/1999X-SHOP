# PayPal Auto-Payment Setup Guide

## What You Need From Your PayPal Business Account

### 1. PayPal Developer Credentials
Go to: https://developer.paypal.com/dashboard/applications/live

Create a **Live** app (not Sandbox), then copy:
- **Client ID** → save as `PAYPAL_CLIENT_ID` in Supabase secrets
- **Client Secret** → save as `PAYPAL_CLIENT_SECRET` in Supabase secrets

### 2. Add These Secrets in Supabase
Go to: Supabase Dashboard → Edge Functions → Secrets → Add

```
PAYPAL_CLIENT_ID      = your_live_client_id
PAYPAL_CLIENT_SECRET  = your_live_client_secret
PAYPAL_WEBHOOK_ID     = (you'll get this in step 4)
```

### 3. Create the PayPal Webhook Edge Function
In your Supabase project, create a new Edge Function called `paypal-webhook`:

```typescript
// supabase/functions/paypal-webhook/index.ts
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
);

Deno.serve(async (req) => {
  const body = await req.json();
  
  // Only handle PAYMENT.CAPTURE.COMPLETED
  if (body.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
    return new Response('ok', { status: 200 });
  }

  const capture = body.resource;
  const amount  = parseFloat(capture.amount.value);
  const userEmail = capture.custom_id; // we pass user email as custom_id

  if (!userEmail || !amount) {
    return new Response('missing data', { status: 400 });
  }

  // Find user by email
  const { data: user } = await supabase.auth.admin.getUserByEmail(userEmail);
  if (!user?.user) return new Response('user not found', { status: 404 });

  // Insert approved transaction
  await supabase.from('transactions').insert({
    user_id:        user.user.id,
    user_email:     userEmail,
    user_name:      user.user.user_metadata?.full_name ?? userEmail,
    amount:         amount,
    method:         'paypal',
    transaction_id: capture.id,
    status:         'approved', // auto-approved since PayPal verified
  });

  return new Response('ok', { status: 200 });
});
```

Deploy it:
```bash
supabase functions deploy paypal-webhook
```

### 4. Register the Webhook in PayPal
Go to: https://developer.paypal.com/dashboard/applications/live → Your App → Webhooks

Add webhook URL:
```
https://wkjqrjafogufqeasfeev.supabase.co/functions/v1/paypal-webhook
```

Select events:
- ✅ PAYMENT.CAPTURE.COMPLETED

Copy the **Webhook ID** and add it as `PAYPAL_WEBHOOK_ID` in Supabase secrets.

### 5. Add PayPal Button in the App

In `WalletPage.tsx`, the PayPal payment method already shows a PayPal.me button.
To upgrade to a real PayPal Order button, replace `YOUR_PAYPAL_ME_URL` with a
PayPal.me link: `https://paypal.me/YOURUSERNAME`

For full auto-payment with the SDK, add this to your `index.html`:
```html
<script src="https://www.paypal.com/sdk/js?client-id=YOUR_CLIENT_ID&currency=USD"></script>
```

Then in WalletPage, render the PayPal button:
```javascript
paypal.Buttons({
  createOrder: (data, actions) => actions.order.create({
    purchase_units: [{
      amount: { value: amount.toFixed(2) },
      custom_id: user.email, // binds payment to user
    }]
  }),
  onApprove: (data, actions) => actions.order.capture().then(() => {
    toast.success('Payment sent! Balance will be added automatically.');
  }),
}).render('#paypal-button-container');
```

### 6. How It Works End-to-End
1. User clicks PayPal button → chooses amount
2. PayPal processes payment
3. PayPal sends webhook to your Supabase function
4. Function verifies + inserts approved transaction
5. User's app polls every 12s → detects approved → credits balance
6. Balance added in ~12 seconds automatically ✅

### Summary of Secrets Needed
| Secret Name | Where to Get |
|---|---|
| `PAYPAL_CLIENT_ID` | PayPal Developer Dashboard → Live App |
| `PAYPAL_CLIENT_SECRET` | PayPal Developer Dashboard → Live App |
| `PAYPAL_WEBHOOK_ID` | PayPal Developer Dashboard → Webhooks |
