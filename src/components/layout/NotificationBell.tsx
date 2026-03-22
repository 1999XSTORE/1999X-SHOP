import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { Bell, X, CheckCheck, Megaphone, MessageCircle, Zap, CreditCard } from 'lucide-react';

interface Notif {
  id:         string;
  user_id:    string;
  type:       'announcement' | 'chat' | 'system' | 'payment';
  title:      string;
  body:       string;
  link_path:  string;
  is_read:    boolean;
  created_at: string;
}

const TYPE_ICON: Record<string, any> = {
  announcement: Megaphone,
  chat:         MessageCircle,
  system:       Zap,
  payment:      CreditCard,
};
const TYPE_COLOR: Record<string, string> = {
  announcement: 'var(--purple)',
  chat:         'var(--blue)',
  system:       'var(--amber)',
  payment:      'var(--green)',
};

interface Props {
  onNavigate: (path: string) => void;
}

export default function NotificationBell({ onNavigate }: Props) {
  const { user } = useAppStore();
  const [notifs,   setNotifs]   = useState<Notif[]>([]);
  const [open,     setOpen]     = useState(false);
  const ref        = useRef<HTMLDivElement>(null);

  const unread = notifs.filter(n => !n.is_read).length;

  // ── Load + subscribe ────────────────────────────────────────
  useEffect(() => {
    if (!user) return;

    // Initial load (own + broadcast)
    supabase.from('notifications')
      .select('*')
      .or(`user_id.eq.${user.id},user_id.eq.all`)
      .order('created_at', { ascending: false })
      .limit(40)
      .then(({ data }) => { if (data) setNotifs(data as Notif[]); });

    // Realtime
    const ch = supabase.channel(`notifs-${user.id}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.all`,
      }, ({ new: r }) => {
        setNotifs(p => [r as Notif, ...p]);
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'notifications',
        filter: `user_id=eq.${user.id}`,
      }, ({ new: r }) => {
        setNotifs(p => [r as Notif, ...p]);
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // Close on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Mark all read ───────────────────────────────────────────
  const markAllRead = async () => {
    if (!user) return;
    // For 'all' type notifications we track read state locally + in DB
    const unreadIds = notifs.filter(n => !n.is_read).map(n => n.id);
    if (unreadIds.length === 0) return;
    setNotifs(p => p.map(n => ({ ...n, is_read: true })));
    await supabase.from('notifications')
      .update({ is_read: true })
      .in('id', unreadIds);
  };

  // ── Mark single read + navigate ─────────────────────────────
  const handleClick = async (n: Notif) => {
    if (!n.is_read) {
      setNotifs(p => p.map(x => x.id === n.id ? { ...x, is_read: true } : x));
      await supabase.from('notifications').update({ is_read: true }).eq('id', n.id);
    }
    setOpen(false);
    if (n.link_path) onNavigate(n.link_path);
  };

  const timeAgo = (s: string) => {
    const d = Date.now() - new Date(s).getTime();
    if (d < 60000) return 'just now';
    if (d < 3600000) return `${Math.floor(d/60000)}m ago`;
    if (d < 86400000) return `${Math.floor(d/3600000)}h ago`;
    return new Date(s).toLocaleDateString();
  };

  return (
    <div style={{ position:'relative' }} ref={ref}>
      {/* Bell button */}
      <button
        onClick={() => { setOpen(!open); if (!open && unread > 0) markAllRead(); }}
        style={{ position:'relative', padding:'7px 9px', borderRadius:13, border:'none', cursor:'pointer', background:open?'rgba(255,255,255,.08)':'rgba(255,255,255,.04)', color:'rgba(255,255,255,.55)', display:'flex', alignItems:'center', justifyContent:'center', transition:'all .15s', flexShrink:0 }}
        onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.08)'; (e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,.85)'; }}
        onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background=open?'rgba(255,255,255,.08)':'rgba(255,255,255,.04)'; (e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,.55)'; }}>
        <Bell size={14} />
        {unread > 0 && (
          <span style={{
            position:'absolute', top:3, right:3,
            minWidth:14, height:14, borderRadius:7, padding:'0 3px',
            background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',
            border:'2px solid var(--bg)',
            display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:8, fontWeight:900, color:'#fff', lineHeight:1,
            boxShadow:'0 0 8px rgba(109,40,217,.6)',
            animation:'blink 2s ease-in-out infinite',
          }}>
            {unread > 9 ? '9+' : unread}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div style={{
          position:'absolute', right:0, top:'calc(100% + 10px)',
          width:340, maxWidth:'calc(100vw - 20px)',
          background:'rgba(10,10,22,.97)', backdropFilter:'blur(24px)',
          border:'1px solid rgba(255,255,255,.1)', borderRadius:20,
          boxShadow:'0 20px 60px rgba(0,0,0,.7)', zIndex:60, overflow:'hidden',
        }}>
          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,.07)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <Bell size={14} color="var(--purple)" />
              <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>Notifications</span>
              {unread > 0 && (
                <span style={{ background:'rgba(139,92,246,.2)', border:'1px solid rgba(139,92,246,.3)', color:'#c4b5fd', fontSize:10, fontWeight:700, padding:'1px 7px', borderRadius:20 }}>{unread} new</span>
              )}
            </div>
            <div style={{ display:'flex', gap:6 }}>
              {unread > 0 && (
                <button onClick={markAllRead} style={{ display:'flex',alignItems:'center',gap:4,fontSize:10,color:'var(--muted)',background:'none',border:'none',cursor:'pointer',padding:'3px 7px',borderRadius:7,transition:'color .15s' }}
                  onMouseEnter={e => { e.currentTarget.style.color='#fff'; }} onMouseLeave={e => { e.currentTarget.style.color='var(--muted)'; }}>
                  <CheckCheck size={11} /> Mark all read
                </button>
              )}
              <button onClick={() => setOpen(false)} style={{ padding:'3px 5px',borderRadius:7,background:'none',border:'none',cursor:'pointer',color:'var(--dim)',display:'flex' }}><X size={12} /></button>
            </div>
          </div>

          {/* List */}
          <div style={{ maxHeight:360, overflowY:'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding:'32px 16px', textAlign:'center' }}>
                <Bell size={24} style={{ color:'rgba(255,255,255,.08)', margin:'0 auto 10px' }} />
                <p style={{ fontSize:13, color:'var(--muted)' }}>No notifications yet</p>
              </div>
            ) : notifs.map(n => {
              const Icon = TYPE_ICON[n.type] ?? Bell;
              const color = TYPE_COLOR[n.type] ?? 'var(--muted)';
              return (
                <button key={n.id} onClick={() => handleClick(n)}
                  style={{ width:'100%', display:'flex', alignItems:'flex-start', gap:10, padding:'11px 16px', background:n.is_read?'transparent':'rgba(139,92,246,.04)', border:'none', cursor:'pointer', textAlign:'left', borderBottom:'1px solid rgba(255,255,255,.04)', transition:'background .12s', fontFamily:'inherit' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.04)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLButtonElement).style.background=n.is_read?'transparent':'rgba(139,92,246,.04)'; }}>
                  <div style={{ width:28,height:28,borderRadius:8,background:`${color}15`,border:`1px solid ${color}25`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,marginTop:1 }}>
                    <Icon size={13} color={color} />
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontSize:12,fontWeight:n.is_read?500:700,color:n.is_read?'rgba(255,255,255,.6)':'#fff',marginBottom:2,lineHeight:1.3 }}>{n.title}</div>
                    {n.body && <div style={{ fontSize:11,color:'var(--dim)',lineHeight:1.4,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{n.body}</div>}
                    <div style={{ fontSize:10,color:'var(--dim)',marginTop:3 }}>{timeAgo(n.created_at)}</div>
                  </div>
                  {!n.is_read && (
                    <div style={{ width:7,height:7,borderRadius:'50%',background:'var(--purple)',boxShadow:'0 0 6px var(--purple)',flexShrink:0,marginTop:6 }} />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
