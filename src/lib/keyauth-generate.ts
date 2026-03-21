// ============================================================
//  keyauth-generate.ts
//  Calls the Supabase `generate-key` edge function.
//  Uses your already-configured KA_* secrets on the server.
//  The browser never touches KeyAuth directly.
// ============================================================

import { supabase } from './supabase';

export interface GeneratedKey {
  key:          string;
  expiry:       string;   // ISO timestamp
  days:         number;
  product_type: string;
  source:       'keyauth' | 'local';
}

/**
 * Generate a license key for a product type.
 * product_type: "weekly" | "monthly" | "combo" | "reward" | "trial"
 */
export async function generateKey(
  productType: string,
  userEmail:   string
): Promise<GeneratedKey> {
  const { data, error } = await supabase.functions.invoke('generate-key', {
    body: {
      product_type: productType,
      user_email:   userEmail,
    },
  });

  if (error) throw new Error('Edge function error: ' + error.message);
  if (!data?.success) throw new Error(data?.message ?? 'Key generation failed');

  return {
    key:          data.key,
    expiry:       data.expiry,
    days:         data.days,
    product_type: data.product_type,
    source:       data.source,
  };
}
