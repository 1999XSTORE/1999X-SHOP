// ============================================================
//  KeyAuth — calls Supabase Edge Function (secrets are safe)
//  NO secrets here. This file is safe to be public.
// ============================================================

import { supabase } from './supabase';

export interface AppStats {
  status:      string;
  numUsers:    string;
  numKeys:     string;
  onlineUsers: string;
  version:     string;
}

export interface AllStats {
  lag:         AppStats;
  internal:    AppStats;
  totalOnline: number | null;
  totalUsers:  number | null;
}

export async function fetchAllStats(): Promise<AllStats> {
  try {
    // Calls your Supabase Edge Function — secrets never touch the browser
    const { data, error } = await supabase.functions.invoke('keyauth-stats');

    if (error || !data) {
      return fallback();
    }

    const lagOnline = parseInt(data.lag?.onlineUsers     ?? '0') || 0;
    const intOnline = parseInt(data.internal?.onlineUsers ?? '0') || 0;
    const lagUsers  = parseInt(data.lag?.numUsers         ?? '0') || 0;
    const intUsers  = parseInt(data.internal?.numUsers    ?? '0') || 0;

    return {
      lag:         data.lag,
      internal:    data.internal,
      totalOnline: data.lag.status === 'offline' && data.internal.status === 'offline'
                     ? null : lagOnline + intOnline,
      totalUsers:  data.lag.status === 'offline' && data.internal.status === 'offline'
                     ? null : lagUsers + intUsers,
    };
  } catch {
    return fallback();
  }
}

function fallback(): AllStats {
  const offline: AppStats = {
    status: 'offline', numUsers: '0',
    numKeys: '0', onlineUsers: '0', version: '—',
  };
  return { lag: offline, internal: offline, totalOnline: null, totalUsers: null };
}
