import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Send, Trash2, Edit2, Reply, X, Crown, Shield, Copy, Smile, Hash, Lock, Lock } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

// ── Types ────────────────────────────────────────────────────
interface Msg {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  user_role: string;
  message: string;
  created_at: string;
  reply_to?: string | null;
  is_private?: boolean;
}

interface OnlineUser {
  userId: string;
  userName: string;
  userAvatar: string;
  userRole: string;
}

// ── Helpers ──────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5)  return 'Just now';
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(dateStr).toLocaleDateString();
}

function Avatar({ src, name, size = 36, role }: { src?: string; name: string; size?: number; role?: string }) {
  const colors: Record<string, string> = {
    admin:   'linear-gradient(135deg,#ef4444,#b91c1c)',
    support: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
    user:    'linear-gradient(135deg,#8b5cf6,#6d28d9)',
  };
  const bg = colors[role ?? 'user'] ?? colors.user;

  if (src) return (
    <img src={src} alt={name} style={{ width:size, height:size, borderRadius:'50%', objectFit:'cover', flexShrink:0 }}
      onError={e => { (e.target as HTMLImageElement).style.display='none'; }} />
  );
  return (
    <div style={{ width:size, height:size, borderRadius:'50%', background:bg, display:'flex', alignItems:'center', justifyContent:'center', fontSize:size*0.38, fontWeight:800, color:'#fff', flexShrink:0 }}>
      {(name || '?').charAt(0).toUpperCase()}
    </div>
  );
}

function RoleBadge({ role }: { role: string }) {
  if (role === 'admin') return (
    <span style={{ display:'inline-flex',alignItems:'center',gap:3,fontSize:9,fontWeight:800,padding:'2px 7px',borderRadius:20,background:'rgba(239,68,68,.12)',color:'#f87171',border:'1px solid rgba(239,68,68,.25)',letterSpacing:'.05em' }}>
      <Crown size={8} /> ADMIN
    </span>
  );
  if (role === 'support') return (
    <span style={{ display:'inline-flex',alignItems:'center',gap:3,fontSize:9,fontWeight:800,padding:'2px 7px',borderRadius:20,background:'rgba(59,130,246,.12)',color:'#60a5fa',border:'1px solid rgba(59,130,246,.25)',letterSpacing:'.05em' }}>
      <Shield size={8} /> SUPPORT
    </span>
  );
  return null;
}

const REACTIONS = ['👍','❤️','🔥','😂','😮','😢'];

// ── Message Component ────────────────────────────────────────
function Message({ msg, isOwn, isMod, currentUserId, currentUserRole, onReply, onDelete, onEdit, allMsgs }: {
  msg: Msg; isOwn: boolean; isMod: boolean;
  currentUserId: string; currentUserRole: string;
  onReply: (m: Msg) => void; onDelete: (id: string) => void; onEdit: (m: Msg) => void;
  allMsgs: Msg[];
}) {
  const [hovered,   setHovered]   = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const replyMsg = msg.reply_to ? allMsgs.find(m => m.id === msg.reply_to) : null;

  // Private message visibility
  const isPrivate = msg.is_private || msg.message.includes('@admin') || msg.message.includes('@support');
  const canSeePrivate = isMod || msg.user_id === currentUserId;
  if (isPrivate && !canSeePrivate) return null;

  const isAdminMsg  = msg.user_role === 'admin';
  const isSupportMsg = msg.user_role === 'support';

  const msgBg = isPrivate
    ? 'rgba(139,92,246,.08)'
    : isAdminMsg
    ? 'rgba(239,68,68,.04)'
    : isSupportMsg
    ? 'rgba(59,130,246,.04)'
    : hovered ? 'rgba(255,255,255,.025)' : 'transparent';

  const msgBorder = isPrivate ? '1px solid rgba(139,92,246,.2)' : 'none';
  const msgGlow   = isAdminMsg ? '0 0 20px rgba(239,68,68,.06)' : isSupportMsg ? '0 0 20px rgba(59,130,246,.06)' : 'none';

  const copy = () => { navigator.clipboard.writeText(msg.message); toast.success('Copied!'); };

  const addReaction = (emoji: string) => {
    setReactions(prev => {
      const users = prev[emoji] ?? [];
      const hasIt = users.includes(currentUserId);
      return { ...prev, [emoji]: hasIt ? users.filter(u => u !== currentUserId) : [...users, currentUserId] };
    });
    setShowEmoji(false);
  };

  return (
    <div
      style={{ display:'flex',gap:12,padding:'8px 14px',borderRadius:14,transition:'background .15s',background:msgBg,border:msgBorder,boxShadow:msgGlow,position:'relative',marginBottom:2 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowEmoji(false); }}>

      <Avatar src={msg.user_avatar} name={msg.user_name} role={msg.user_role} />

      <div style={{ flex:1,minWidth:0 }}>
        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',gap:7,marginBottom:3,flexWrap:'wrap' }}>
          <span style={{ fontSize:14,fontWeight:700,color:isAdminMsg?'#f87171':isSupportMsg?'#60a5fa':'#fff' }}>
            {msg.user_name}
          </span>
          <RoleBadge role={msg.user_role} />
          {isPrivate && (
            <span style={{ display:'inline-flex',alignItems:'center',gap:3,fontSize:9,fontWeight:700,padding:'2px 7px',borderRadius:20,background:'rgba(139,92,246,.1)',color:'var(--purple)',border:'1px solid rgba(139,92,246,.2)' }}>
              <Lock size={8}/> Support Only
            </span>
          )}
          <span style={{ fontSize:10,color:'rgba(255,255,255,.25)' }}>{timeAgo(msg.created_at)}</span>
        </div>

        {/* Reply preview */}
        {replyMsg && (
          <div style={{ display:'flex',alignItems:'center',gap:6,marginBottom:5,padding:'5px 10px',borderRadius:8,background:'rgba(255,255,255,.04)',borderLeft:'2px solid rgba(255,255,255,.15)' }}>
            <Avatar src={replyMsg.user_avatar} name={replyMsg.user_name} size={16} />
            <span style={{ fontSize:11,color:'rgba(255,255,255,.4)',fontWeight:600 }}>{replyMsg.user_name}:</span>
            <span style={{ fontSize:11,color:'rgba(255,255,255,.3)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{replyMsg.message}</span>
          </div>
        )}

        {/* Message text */}
        <p style={{ fontSize:14,color:'rgba(255,255,255,.82)',lineHeight:1.55,wordBreak:'break-word',whiteSpace:'pre-wrap' }}>
          {msg.message.split(/(@admin|@support)/g).map((part, i) =>
            part === '@admin' || part === '@support'
              ? <span key={i} style={{ color:'var(--purple)',fontWeight:700,background:'rgba(139,92,246,.1)',padding:'1px 4px',borderRadius:4 }}>{part}</span>
              : part
          )}
        </p>

        {/* Reactions */}
        {Object.entries(reactions).filter(([,u]) => u.length > 0).length > 0 && (
          <div style={{ display:'flex',gap:5,marginTop:6,flexWrap:'wrap' }}>
            {Object.entries(reactions).filter(([,u]) => u.length > 0).map(([emoji, users]) => (
              <button key={emoji} onClick={() => addReaction(emoji)}
                style={{ display:'flex',alignItems:'center',gap:4,padding:'3px 8px',borderRadius:20,background:users.includes(currentUserId)?'rgba(139,92,246,.15)':'rgba(255,255,255,.05)',border:users.includes(currentUserId)?'1px solid rgba(139,92,246,.3)':'1px solid rgba(255,255,255,.08)',cursor:'pointer',fontSize:12,color:'#fff',fontFamily:'inherit' }}>
                {emoji} <span style={{ fontSize:11,color:'rgba(255,255,255,.5)' }}>{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {hovered && (
        <div style={{ position:'absolute',top:-14,right:12,display:'flex',gap:3,background:'rgba(20,20,30,.95)',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,padding:'4px 6px',boxShadow:'0 4px 20px rgba(0,0,0,.5)',zIndex:10 }}>
          {/* Emoji react */}
          <div style={{ position:'relative' }}>
            <button onClick={() => setShowEmoji(!showEmoji)} title="React"
              style={{ padding:'5px 7px',borderRadius:7,background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,.5)',display:'flex',alignItems:'center',transition:'all .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,.08)')}
              onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
              <Smile size={14}/>
            </button>
            {showEmoji && (
              <div style={{ position:'absolute',bottom:'110%',right:0,background:'rgba(20,20,30,.98)',border:'1px solid rgba(255,255,255,.1)',borderRadius:12,padding:8,display:'flex',gap:5,boxShadow:'0 8px 32px rgba(0,0,0,.6)',zIndex:20 }}>
                {REACTIONS.map(e => (
                  <button key={e} onClick={() => addReaction(e)}
                    style={{ fontSize:18,padding:'3px 5px',borderRadius:8,background:'transparent',border:'none',cursor:'pointer',transition:'transform .1s' }}
                    onMouseEnter={e2 => (e2.currentTarget.style.transform='scale(1.3)')}
                    onMouseLeave={e2 => (e2.currentTarget.style.transform='scale(1)')}>
                    {e}
                  </button>
                ))}
              </div>
            )}
          </div>
          {/* Reply */}
          <button onClick={() => onReply(msg)} title="Reply"
            style={{ padding:'5px 7px',borderRadius:7,background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,.5)',display:'flex',alignItems:'center',transition:'all .15s' }}
            onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,.08)')}
            onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
            <Reply size={14}/>
          </button>
          {/* Copy */}
          <button onClick={copy} title="Copy"
            style={{ padding:'5px 7px',borderRadius:7,background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,.5)',display:'flex',alignItems:'center',transition:'all .15s' }}
            onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,.08)')}
            onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
            <Copy size={14}/>
          </button>
          {/* Edit (own messages) */}
          {isOwn && (
            <button onClick={() => onEdit(msg)} title="Edit"
              style={{ padding:'5px 7px',borderRadius:7,background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,.5)',display:'flex',alignItems:'center',transition:'all .15s' }}
              onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,.08)')}
              onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
              <Edit2 size={14}/>
            </button>
          )}
          {/* Delete (own or mod) */}
          {(isOwn || isMod) && (
            <button onClick={() => onDelete(msg.id)} title="Delete"
              style={{ padding:'5px 7px',borderRadius:7,background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,.5)',display:'flex',alignItems:'center',transition:'all .15s' }}
              onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,.12)'; e.currentTarget.style.color='#f87171'; }}
              onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,.5)'; }}>
              <Trash2 size={14}/>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

// ── Typing dots animation ────────────────────────────────────
function TypingDots() {
  return (
    <span style={{ display:'inline-flex',gap:3,alignItems:'center' }}>
      {[0,1,2].map(i => (
        <span key={i} style={{ width:4,height:4,borderRadius:'50%',background:'rgba(255,255,255,.4)',animation:`typingDot 1.2s ease-in-out ${i*0.2}s infinite` }}/>
      ))}
    </span>
  );
}

// ── Main ChatPage ─────────────────────────────────────────────
export default function ChatPage() {
  const { user } = useAppStore();
  const [messages,     setMessages]     = useState<Msg[]>([]);
  const [input,        setInput]        = useState('');
  const [editId,       setEditId]       = useState<string | null>(null);
  const [editText,     setEditText]     = useState('');
  const [replyTo,      setReplyTo]      = useState<Msg | null>(null);
  const [typingUsers,  setTypingUsers]  = useState<Record<string, string>>({});
  const [onlineUsers,  setOnlineUsers]  = useState<OnlineUser[]>([]);
  const [showSidebar,  setShowSidebar]  = useState(true);
  const [loading,      setLoading]      = useState(true);

  const bottomRef    = useRef<HTMLDivElement>(null);
  const inputRef     = useRef<HTMLTextAreaElement>(null);
  const typingTimer  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSent     = useRef(0);
  const channelRef   = useRef<any>(null);

  const isMod = user?.role === 'admin' || user?.role === 'support';

  // ── Load messages ──────────────────────────────────────────
  useEffect(() => {
    supabase.from('chat_messages').select('*').order('created_at', { ascending: true }).limit(100)
      .then(({ data }) => { if (data) setMessages(data); setLoading(false); });
  }, []);

  // ── Realtime subscription ──────────────────────────────────
  useEffect(() => {
    if (!user) return;

    const ch = supabase.channel('chat_v2', { config: { presence: { key: user.id } } });

    // Messages
    ch.on('postgres_changes', { event:'INSERT', schema:'public', table:'chat_messages' }, ({ new: m }) => {
      setMessages(p => {
        if (p.find(x => x.id === (m as Msg).id)) return p;
        return [...p, m as Msg];
      });
    })
    .on('postgres_changes', { event:'UPDATE', schema:'public', table:'chat_messages' }, ({ new: m }) => {
      setMessages(p => p.map(x => x.id === (m as Msg).id ? m as Msg : x));
    })
    .on('postgres_changes', { event:'DELETE', schema:'public', table:'chat_messages' }, ({ old: m }) => {
      // Only filter if we have a valid id from the DELETE event
      // (requires Replica Identity FULL on chat_messages table, else old.id may be present)
      const deletedId = (m as any)?.id;
      if (deletedId) {
        setMessages(p => p.filter(x => x.id !== deletedId));
      }
    })

    // Typing broadcast
    .on('broadcast', { event:'typing' }, ({ payload }) => {
      if (payload.userId === user.id) return;
      setTypingUsers(p => ({ ...p, [payload.userId]: payload.userName }));
      if (typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current = setTimeout(() => {
        setTypingUsers(p => { const n = { ...p }; delete n[payload.userId]; return n; });
      }, 3000);
    })

    // Presence — online users
    .on('presence', { event:'sync' }, () => {
      const state = ch.presenceState();
      const users: OnlineUser[] = Object.values(state).flatMap((s: any) => s).map((s: any) => ({
        userId:     s.userId,
        userName:   s.userName,
        userAvatar: s.userAvatar || '',
        userRole:   s.userRole || 'user',
      }));
      setOnlineUsers(users);
    });

    ch.subscribe(async (status) => {
      if (status === 'SUBSCRIBED') {
        await ch.track({
          userId:     user.id,
          userName:   user.name,
          userAvatar: user.avatar || '',
          userRole:   user.role || 'user',
        });
      }
    });

    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [user?.id]);

  // ── Auto-scroll ────────────────────────────────────────────
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingUsers]);

  // ── Typing broadcast ───────────────────────────────────────
  const broadcastTyping = useCallback(() => {
    if (!user || !channelRef.current) return;
    channelRef.current.send({ type:'broadcast', event:'typing', payload:{ userId:user.id, userName:user.name } });
  }, [user?.id]);

  // ── Send message ───────────────────────────────────────────
  const handleSend = useCallback(async () => {
    const txt = input.trim();
    if (!txt || !user) return;

    // Rate limit: 1 message per second
    if (Date.now() - lastSent.current < 1000) { toast.error('Slow down!'); return; }
    lastSent.current = Date.now();

    const isPrivate = txt.includes('@admin') || txt.includes('@support');

    setInput('');
    setReplyTo(null);

    // Optimistic UI — add immediately
    const tempId = `temp_${Date.now()}`;
    const optimistic: Msg = {
      id:          tempId,
      user_id:     user.id,
      user_name:   user.name,
      user_avatar: user.avatar || '',
      user_role:   user.role || 'user',
      message:     txt,
      created_at:  new Date().toISOString(),
      reply_to:    replyTo?.id || null,
      is_private:  isPrivate,
    };
    setMessages(p => [...p, optimistic]);

    const { data, error } = await supabase.from('chat_messages').insert({
      user_id:     user.id,
      user_name:   user.name,
      user_avatar: user.avatar || '',
      user_role:   user.role || 'user',
      message:     txt,
      reply_to:    replyTo?.id || null,
      is_private:  isPrivate,
    }).select().single();

    if (error) {
      toast.error('Failed to send');
      setMessages(p => p.filter(m => m.id !== tempId));
      setInput(txt);
    } else if (data) {
      // Replace optimistic with real
      setMessages(p => p.map(m => m.id === tempId ? data : m));
    }
  }, [input, user, replyTo]);

  const handleDelete = async (id: string) => {
    // Immediately remove from local state so admin sees remaining messages
    setMessages(p => p.filter(m => m.id !== id));
    await supabase.from('chat_messages').delete().eq('id', id);
  };
  const handleEditSave = async () => {
    if (!editText.trim() || !editId) return;
    await supabase.from('chat_messages').update({ message: editText }).eq('id', editId);
    setEditId(null); setEditText('');
  };

  // Sort online users: admin → support → user
  const roleOrder: Record<string, number> = { admin:0, support:1, user:2 };
  const sortedOnline = [...onlineUsers].sort((a, b) => (roleOrder[a.userRole]??2) - (roleOrder[b.userRole]??2));
  const typingList = Object.values(typingUsers);

  return (
    <>
      <style>{`
        @keyframes typingDot { 0%,60%,100%{transform:translateY(0);opacity:.4} 30%{transform:translateY(-4px);opacity:1} }
        @keyframes msgIn { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        .chat-msg-in { animation: msgIn .2s ease-out; }
        .chat-scroll::-webkit-scrollbar { width:4px; }
        .chat-scroll::-webkit-scrollbar-track { background:transparent; }
        .chat-scroll::-webkit-scrollbar-thumb { background:rgba(255,255,255,.08); border-radius:4px; }
        .chat-scroll::-webkit-scrollbar-thumb:hover { background:rgba(255,255,255,.15); }
        .chat-input { resize:none; background:transparent; border:none; outline:none; color:#fff; font-family:inherit; font-size:14px; width:100%; max-height:120px; line-height:1.5; }
        .chat-input::placeholder { color:rgba(255,255,255,.25); }
      `}</style>

      <div style={{ display:'flex', flex:1, minHeight:0, gap:12, overflow:'hidden' }}>

        {/* ── Main chat area ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)', borderRadius:20, overflow:'hidden' }}>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,.06)', background:'rgba(255,255,255,.02)', flexShrink:0 }}>
            <div style={{ width:32,height:32,borderRadius:10,background:'rgba(139,92,246,.12)',border:'1px solid rgba(139,92,246,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Hash size={16} color="var(--purple)"/>
            </div>
            <div>
              <div style={{ fontSize:15,fontWeight:800,color:'#fff' }}>Community Chat</div>
              <div style={{ fontSize:11,color:'var(--muted)' }}>{sortedOnline.length} online · Real-time</div>
            </div>
            <div style={{ marginLeft:'auto', display:'flex', alignItems:'center', gap:8 }}>
              <div className="dot dot-green" style={{ width:6,height:6 }}/>
              <span style={{ fontSize:12, color:'var(--green)', fontWeight:600 }}>{sortedOnline.length} online</span>
              <button onClick={() => setShowSidebar(!showSidebar)}
                style={{ padding:'6px 12px', borderRadius:9, background:'rgba(255,255,255,.05)', border:'1px solid var(--border)', cursor:'pointer', fontSize:11, color:'var(--muted)', fontFamily:'inherit' }}>
                {showSidebar ? 'Hide' : 'Members'}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-scroll" style={{ flex:1, overflowY:'auto', padding:'12px 4px' }}>
            {loading && (
              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'40px 0', color:'var(--muted)', fontSize:13 }}>
                Loading messages...
              </div>
            )}
            {!loading && messages.length === 0 && (
              <div style={{ textAlign:'center', padding:'60px 20px' }}>
                <div style={{ fontSize:32, marginBottom:12 }}>👋</div>
                <div style={{ fontSize:15, fontWeight:600, color:'rgba(255,255,255,.4)', marginBottom:6 }}>No messages yet</div>
                <div style={{ fontSize:13, color:'var(--dim)' }}>Be the first to say something!</div>
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className="chat-msg-in">
                {editId === msg.id ? (
                  <div style={{ display:'flex',gap:8,padding:'8px 14px',alignItems:'center' }}>
                    <Avatar src={msg.user_avatar} name={msg.user_name} role={msg.user_role} size={32}/>
                    <input value={editText} onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => { if(e.key==='Enter') handleEditSave(); if(e.key==='Escape'){setEditId(null);setEditText('');} }}
                      style={{ flex:1,padding:'8px 12px',borderRadius:10,background:'rgba(255,255,255,.06)',border:'1px solid rgba(139,92,246,.3)',color:'#fff',fontFamily:'inherit',fontSize:14,outline:'none' }}
                      autoFocus/>
                    <button onClick={handleEditSave} className="btn btn-p btn-sm">Save</button>
                    <button onClick={() => { setEditId(null); setEditText(''); }}
                      style={{ padding:'6px',borderRadius:8,background:'rgba(255,255,255,.05)',border:'1px solid var(--border)',cursor:'pointer',color:'var(--muted)',display:'flex' }}>
                      <X size={14}/>
                    </button>
                  </div>
                ) : (
                  <Message
                    msg={msg} isOwn={msg.user_id === user?.id} isMod={isMod}
                    currentUserId={user?.id ?? ''} currentUserRole={user?.role ?? 'user'}
                    onReply={setReplyTo} onDelete={handleDelete}
                    onEdit={m => { setEditId(m.id); setEditText(m.message); }}
                    allMsgs={messages}
                  />
                )}
              </div>
            ))}

            {/* Typing indicator */}
            {typingList.length > 0 && (
              <div style={{ display:'flex', alignItems:'center', gap:10, padding:'8px 14px', color:'rgba(255,255,255,.4)', fontSize:12 }}>
                <TypingDots/>
                <span>
                  {typingList.slice(0,2).join(', ')}
                  {typingList.length > 2 ? ` +${typingList.length-2} more` : ''}
                  {' '}{typingList.length === 1 ? 'is' : 'are'} typing...
                </span>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Reply bar */}
          {replyTo && (
            <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 18px', borderTop:'1px solid rgba(255,255,255,.06)', background:'rgba(139,92,246,.05)', flexShrink:0 }}>
              <Reply size={13} color="var(--purple)"/>
              <div style={{ flex:1, minWidth:0 }}>
                <span style={{ fontSize:11, color:'var(--purple)', fontWeight:700 }}>Replying to {replyTo.user_name}: </span>
                <span style={{ fontSize:11, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{replyTo.message}</span>
              </div>
              <button onClick={() => setReplyTo(null)} style={{ padding:4, borderRadius:6, background:'none', border:'none', cursor:'pointer', color:'var(--dim)', display:'flex' }}>
                <X size={13}/>
              </button>
            </div>
          )}

          {/* Input */}
          <div style={{ padding:'10px 14px 12px', borderTop:'1px solid rgba(255,255,255,.06)', flexShrink:0, background:'rgba(255,255,255,.01)' }}>

            {/* Private mention hint */}
            <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, flexWrap:'wrap' }}>
              <span style={{ fontSize:10, color:'rgba(255,255,255,.2)', fontWeight:500 }}>Tip:</span>
              {[
                { tag:'@support', label:'Private to Support', c:'rgba(96,165,250,.9)', bg:'rgba(59,130,246,.1)', bc:'rgba(59,130,246,.2)' },
                { tag:'@admin',   label:'Private to Admin',   c:'rgba(248,113,113,.9)', bg:'rgba(239,68,68,.1)',  bc:'rgba(239,68,68,.2)'  },
              ].map(({ tag, label, c, bg, bc }) => (
                <button key={tag} onClick={() => { setInput(p => p ? p + ' ' + tag + ' ' : tag + ' '); inputRef.current?.focus(); }}
                  style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'3px 9px', borderRadius:20, background:bg, border:`1px solid ${bc}`, cursor:'pointer', fontFamily:'inherit', transition:'all .15s' }}
                  onMouseEnter={e => (e.currentTarget.style.opacity='0.8')}
                  onMouseLeave={e => (e.currentTarget.style.opacity='1')}>
                  <Lock size={9} color={c}/>
                  <span style={{ fontSize:10, fontWeight:700, color:c }}>{tag}</span>
                  <span style={{ fontSize:9, color:'rgba(255,255,255,.3)' }}>{label}</span>
                </button>
              ))}
            </div>

            {/* Input row */}
            <div style={{ display:'flex', gap:12, alignItems:'flex-end', background: input.includes('@admin')||input.includes('@support') ? 'rgba(139,92,246,.06)' : 'rgba(255,255,255,.04)', border: input.includes('@admin')||input.includes('@support') ? '1px solid rgba(139,92,246,.25)' : '1px solid rgba(255,255,255,.08)', borderRadius:14, padding:'10px 14px', transition:'all .2s', boxShadow: input.includes('@admin')||input.includes('@support') ? '0 0 20px rgba(139,92,246,.1)' : 'none' }}>
              <Avatar src={user?.avatar} name={user?.name || '?'} role={user?.role} size={30}/>
              <div style={{ flex:1, minWidth:0 }}>
                {/* Private indicator when typing @mention */}
                {(input.includes('@admin') || input.includes('@support')) && (
                  <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:5 }}>
                    <Lock size={10} color="var(--purple)"/>
                    <span style={{ fontSize:10, fontWeight:700, color:'var(--purple)' }}>Private message — only visible to Support Team</span>
                  </div>
                )}
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  value={input}
                  rows={1}
                  onChange={e => {
                    setInput(e.target.value);
                    broadcastTyping();
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px';
                  }}
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
                  }}
                  placeholder={user ? 'Message #community · use @support or @admin for private' : 'Login to chat...'}
                  disabled={!user}
                />
              </div>
              <button onClick={handleSend} disabled={!input.trim() || !user}
                style={{ padding:'8px 10px', borderRadius:10, border:'none', cursor:input.trim()&&user?'pointer':'not-allowed', background:input.trim()&&user ? (input.includes('@admin')||input.includes('@support') ? 'linear-gradient(135deg,#7c3aed,#6d28d9)' : 'linear-gradient(135deg,#8b5cf6,#6d28d9)') : 'rgba(255,255,255,.05)', color:'#fff', display:'flex', alignItems:'center', flexShrink:0, transition:'all .15s', opacity:input.trim()&&user?1:0.4, boxShadow:input.trim()&&user?'0 0 20px rgba(109,40,217,.4)':'none' }}>
                <Send size={15}/>
              </button>
            </div>
          </div>
        </div>

        {/* ── Online Users Sidebar ── */}
        {showSidebar && (
          <div style={{ width:220, display:'flex', flexDirection:'column', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)', borderRadius:20, overflow:'hidden', flexShrink:0 }}>
            <div style={{ padding:'14px 16px', borderBottom:'1px solid rgba(255,255,255,.06)', flexShrink:0 }}>
              <div style={{ fontSize:11, fontWeight:700, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:2 }}>
                Online — {sortedOnline.length}
              </div>
            </div>
            <div className="chat-scroll" style={{ flex:1, overflowY:'auto', padding:'10px 10px' }}>

              {/* Group by role */}
              {(['admin','support','user'] as const).map(role => {
                const group = sortedOnline.filter(u => (u.userRole || 'user') === role);
                if (!group.length) return null;
                const roleLabel = role === 'admin' ? 'Admin' : role === 'support' ? 'Support' : 'Members';
                const roleColor = role === 'admin' ? '#f87171' : role === 'support' ? '#60a5fa' : 'var(--muted)';
                return (
                  <div key={role} style={{ marginBottom:14 }}>
                    <div style={{ fontSize:10, fontWeight:700, color:roleColor, textTransform:'uppercase', letterSpacing:'.1em', padding:'0 6px', marginBottom:6 }}>
                      {roleLabel} — {group.length}
                    </div>
                    {group.map(u => (
                      <div key={u.userId} style={{ display:'flex', alignItems:'center', gap:9, padding:'6px 8px', borderRadius:10, marginBottom:2, transition:'background .15s', cursor:'default' }}
                        onMouseEnter={e => (e.currentTarget.style.background='rgba(255,255,255,.04)')}
                        onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
                        <div style={{ position:'relative', flexShrink:0 }}>
                          <Avatar src={u.userAvatar} name={u.userName} role={u.userRole} size={30}/>
                          <div style={{ position:'absolute', bottom:0, right:0, width:9, height:9, borderRadius:'50%', background:'var(--green)', border:'2px solid var(--bg)', boxShadow:'0 0 6px var(--green)' }}/>
                        </div>
                        <div style={{ flex:1, minWidth:0 }}>
                          <div style={{ fontSize:12, fontWeight:600, color:role==='admin'?'#f87171':role==='support'?'#60a5fa':'rgba(255,255,255,.75)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                            {u.userName}
                          </div>
                          {(role === 'admin' || role === 'support') && (
                            <div style={{ fontSize:10, color:roleColor, opacity:.7 }}>{roleLabel}</div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              {sortedOnline.length === 0 && (
                <div style={{ textAlign:'center', padding:'20px 0', fontSize:12, color:'var(--dim)' }}>No one online</div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
