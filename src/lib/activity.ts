// ── Activity Logger ───────────────────────────────────────────
// Logs all important user actions to public.activity_logs
// Also creates notifications for relevant events.

import { supabase } from './supabase';

export type ActionType =
  | 'login'
  | 'register'
  | 'logout'
  | 'bonus_claim'
  | 'key_generated'
  | 'purchase'
  | 'payment_submit'
  | 'payment_approved'
  | 'payment_rejected'
  | 'balance_add'
  | 'balance_deduct'
  | 'hwid_reset'
  | 'free_key_claim'
  | 'announcement_posted'
  | 'message_sent';

interface LogParams {
  userId:    string;
  userEmail: string;
  userName:  string;
  action:    ActionType;
  product?:  string;
  amount?:   number;
  status?:   'success' | 'failed';
  meta?:     Record<string, unknown>;
}

export async function logActivity(p: LogParams): Promise<void> {
  try {
    await supabase.from('activity_logs').insert({
      user_id:    p.userId,
      user_email: p.userEmail,
      user_name:  p.userName,
      action_type: p.action,
      product:    p.product ?? '',
      amount:     p.amount ?? null,
      status:     p.status ?? 'success',
      meta:       p.meta ?? {},
    });
  } catch {
    // Never let logging crash the app
  }
}

// Broadcast a notification to all users (type: announcement | system | payment)
export async function notifyAll(opts: {
  type:      'announcement' | 'chat' | 'system' | 'payment';
  title:     string;
  body?:     string;
  linkPath?: string;
}): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      user_id:   'all',
      type:      opts.type,
      title:     opts.title,
      body:      opts.body ?? '',
      link_path: opts.linkPath ?? '/',
    });
  } catch {}
}

// Notify a specific user
export async function notifyUser(userId: string, opts: {
  type:      'announcement' | 'chat' | 'system' | 'payment';
  title:     string;
  body?:     string;
  linkPath?: string;
}): Promise<void> {
  try {
    await supabase.from('notifications').insert({
      user_id:   userId,
      type:      opts.type,
      title:     opts.title,
      body:      opts.body ?? '',
      link_path: opts.linkPath ?? '/',
    });
  } catch {}
}
