import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';

interface BadgeCounts {
  chat: number;
  announcements: number;
}

/**
 * Tracks real-time unread counts for Chat & Announcements.
 *
 * - Chat badge:         increments on every new INSERT into `chat_messages`
 *                        (excluding the current user's own messages).
 * - Announcement badge: increments on every new INSERT into `announcements`.
 *
 * Calling `clearChat()` or `clearAnnouncements()` resets the respective
 * counter — intended to be fired when the user navigates to that page.
 */
export function useNavBadges() {
  const { user } = useAppStore();
  const [counts, setCounts] = useState<BadgeCounts>({ chat: 0, announcements: 0 });

  // Track the last known chat/announcement ID so we only count truly new ones
  const initializedChat = useRef(false);
  const initializedAnns = useRef(false);

  // ── Real-time subscriptions ────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const ch = supabase.channel('nav-badges')
      // Chat messages — count inserts from OTHER users
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        ({ new: row }) => {
          if (!initializedChat.current) { initializedChat.current = true; return; }
          // Don't badge the user's own messages
          if (row && (row as any).user_id !== user.id) {
            setCounts(prev => ({ ...prev, chat: prev.chat + 1 }));
          }
        }
      )
      // Announcements — count all new inserts
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'announcements' },
        () => {
          if (!initializedAnns.current) { initializedAnns.current = true; return; }
          setCounts(prev => ({ ...prev, announcements: prev.announcements + 1 }));
        }
      )
      .subscribe();

    // Mark as initialized after a short delay (skip the initial load burst)
    const t = setTimeout(() => {
      initializedChat.current = true;
      initializedAnns.current = true;
    }, 2000);

    return () => {
      clearTimeout(t);
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  const clearChat = useCallback(() => setCounts(p => ({ ...p, chat: 0 })), []);
  const clearAnnouncements = useCallback(() => setCounts(p => ({ ...p, announcements: 0 })), []);

  return { counts, clearChat, clearAnnouncements };
}
