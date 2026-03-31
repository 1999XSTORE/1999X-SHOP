import { useState, useRef, useEffect, useCallback } from 'react';
import { useAppStore } from '@/lib/store';
import { Trash2, Edit2, Reply, X, Crown, Shield, Copy, Smile, Hash, Lock, Users, Handshake, Headset } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { logActivity, notifyAll, notifyUser, sendNotificationEmail } from '@/lib/activity';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';
import { canModerateChat, extractMentionedRole, normalizeRole, ROLE_META, ROLE_ORDER, type AppRole } from '@/lib/roles';

// ── Types ────────────────────────────────────────────────────
interface Msg {
  id: string;
  user_id: string;
  user_email?: string;
  user_name: string;
  user_avatar: string;
  user_role: string;
  message: string;
  created_at: string;
  reply_to?: string | null;
  is_private?: boolean;
  private_target_user_id?: string | null;
  target_role?: AppRole | null;
  image_url?: string | null;
}

function canSeeMessage(msg: Msg, currentUserId: string, currentRole: AppRole) {
  if (currentRole === 'owner') return true;
  if (msg.user_id === currentUserId) return true;
  if (msg.is_private) return msg.private_target_user_id === currentUserId;
  if (msg.target_role) return currentRole === msg.target_role;
  return true;
}

// ── Helpers ──────────────────────────────────────────────────
function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 5)  return 'now';
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return new Date(dateStr).toLocaleDateString();
}

function Avatar({ src, name, size = 34, role }: { src?: string; name: string; size?: number; role?: string }) {
  const colors: Record<string, string> = {
    owner:   'linear-gradient(135deg,#f59e0b,#d97706)',
    admin:   'linear-gradient(135deg,#ef4444,#b91c1c)',
    support: 'linear-gradient(135deg,#3b82f6,#1d4ed8)',
    reseller:'linear-gradient(135deg,#10b981,#059669)',
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
  const normalized = normalizeRole(role);
  if (normalized === 'user') return null;
  const meta = ROLE_META[normalized];
  const Icon = normalized === 'owner' ? Crown : normalized === 'admin' ? Shield : normalized === 'support' ? Headset : Handshake;
  return (
    <span style={{ display:'inline-flex',alignItems:'center',gap:3,fontSize:8,fontWeight:900,padding:'2px 7px',borderRadius:20,background:meta.bg,color:meta.color,border:`1px solid ${meta.border}`,letterSpacing:'.06em',boxShadow:`0 0 12px ${meta.glow}` }}>
      <Icon size={7}/> {meta.shortLabel}
    </span>
  );
}

const REACTIONS = ['👍','❤️','🔥','😂','😮','😢'];

// ── Message Component ────────────────────────────────────────
function Message({ msg, isOwn, isMod, currentUserId, currentUserRole, onReply, onDelete, onEdit, allMsgs, compact }: {
  msg: Msg; isOwn: boolean; isMod: boolean; currentUserId: string; currentUserRole: AppRole;
  onReply: (m: Msg) => void; onDelete: (id: string) => void; onEdit: (m: Msg) => void;
  allMsgs: Msg[]; compact?: boolean;
}) {
  const { t } = useTranslation();
  const [hovered,   setHovered]   = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const replyMsg = msg.reply_to ? allMsgs.find(m => m.id === msg.reply_to) : null;
  const msgRole = normalizeRole(msg.user_role);

  const isPrivate = !!msg.is_private;
  const canSeePrivate = canSeeMessage(msg, currentUserId, currentUserRole);
  if ((isPrivate || msg.target_role) && !canSeePrivate) return null;

  const roleMeta = ROLE_META[msgRole];
  const displayMessage = msg.image_url && msg.message === 'Image' ? '' : msg.message;

  const msgBg = isPrivate || msg.target_role ? roleMeta.bg : hovered ? 'rgba(255,255,255,.02)' : 'transparent';
  const msgBorder = isPrivate || msg.target_role ? `1px solid ${roleMeta.border}` : 'none';

  const copy = () => { navigator.clipboard.writeText(msg.message); toast.success(t('common.copied')); };
  const addReaction = (emoji: string) => {
    setReactions(prev => {
      const users = prev[emoji] ?? [];
      const hasIt = users.includes(currentUserId);
      return { ...prev, [emoji]: hasIt ? users.filter(u=>u!==currentUserId) : [...users, currentUserId] };
    });
    setShowEmoji(false);
  };

  const avatarSize = compact ? 28 : 34;

  return (
    <div
      style={{ display:'flex', gap:compact?8:10, padding:compact?'6px 10px':'8px 12px', borderRadius:12, transition:'background .12s', background:msgBg, border:msgBorder, position:'relative', marginBottom:1 }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => { setHovered(false); setShowEmoji(false); }}>

      <Avatar src={msg.user_avatar} name={msg.user_name} role={msg.user_role} size={avatarSize}/>

      <div style={{ flex:1, minWidth:0 }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:2, flexWrap:'wrap' }}>
          <span style={{ fontSize:compact?12:13, fontWeight:700, color:msgRole === 'user' ? '#fff' : roleMeta.color, lineHeight:1.2, textShadow:msgRole === 'user' ? 'none' : `0 0 12px ${roleMeta.glow}` }}>
            {msg.user_name}
          </span>
          <RoleBadge role={msg.user_role}/>
          {msg.target_role && (
            <span style={{ display:'inline-flex',alignItems:'center',gap:2,fontSize:8,fontWeight:800,padding:'2px 6px',borderRadius:20,background:ROLE_META[msg.target_role].bg,color:ROLE_META[msg.target_role].color,border:`1px solid ${ROLE_META[msg.target_role].border}`,boxShadow:`0 0 10px ${ROLE_META[msg.target_role].glow}` }}>
              <Lock size={7}/> @{msg.target_role}
            </span>
          )}
          {isPrivate && (
            <span style={{ display:'inline-flex',alignItems:'center',gap:2,fontSize:8,fontWeight:700,padding:'2px 5px',borderRadius:20,background:'rgba(139,92,246,.1)',color:'var(--purple)',border:'1px solid rgba(139,92,246,.2)' }}>
              <Lock size={7}/> {t('chat.privateSupport')}
            </span>
          )}
          <span style={{ fontSize:9, color:'rgba(255,255,255,.22)', marginLeft:'auto' }}>{timeAgo(msg.created_at)}</span>
        </div>

        {/* Reply preview */}
        {replyMsg && (
          <div style={{ display:'flex', alignItems:'center', gap:5, marginBottom:4, padding:'4px 8px', borderRadius:6, background:'rgba(255,255,255,.04)', borderLeft:'2px solid rgba(255,255,255,.15)' }}>
            <span style={{ fontSize:10, color:'rgba(255,255,255,.4)', fontWeight:600 }}>{replyMsg.user_name}:</span>
            <span style={{ fontSize:10, color:'rgba(255,255,255,.3)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{replyMsg.message === 'Image' ? 'Image' : replyMsg.message}</span>
          </div>
        )}

        {/* Text */}
        {displayMessage && (
          <p style={{ fontSize:compact?13:13.5, color:'rgba(255,255,255,.82)', lineHeight:1.5, wordBreak:'break-word', whiteSpace:'pre-wrap', margin:0 }}>
            {displayMessage.split(/(@owner|@admin|@support|@reseller)/gi).map((part, i) =>
              /^@(owner|admin|support|reseller)$/i.test(part)
                ? <span key={i} style={{ color:'var(--purple)',fontWeight:700,background:'rgba(139,92,246,.1)',padding:'1px 4px',borderRadius:4 }}>{part}</span>
                : part
            )}
          </p>
        )}

        {/* Reactions */}
        {Object.entries(reactions).filter(([,u])=>u.length>0).length>0 && (
          <div style={{ display:'flex', gap:4, marginTop:5, flexWrap:'wrap' }}>
            {Object.entries(reactions).filter(([,u])=>u.length>0).map(([emoji,users])=>(
              <button key={emoji} onClick={()=>addReaction(emoji)}
                style={{ display:'flex',alignItems:'center',gap:3,padding:'2px 7px',borderRadius:20,background:users.includes(currentUserId)?'rgba(139,92,246,.15)':'rgba(255,255,255,.05)',border:users.includes(currentUserId)?'1px solid rgba(139,92,246,.3)':'1px solid rgba(255,255,255,.08)',cursor:'pointer',fontSize:11,color:'#fff',fontFamily:'inherit' }}>
                {emoji}<span style={{ fontSize:10,color:'rgba(255,255,255,.5)' }}>{users.length}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Hover actions */}
      {hovered && (
        <div style={{ position:'absolute',top:-13,right:8,display:'flex',gap:2,background:'rgba(15,15,28,.97)',border:'1px solid rgba(255,255,255,.1)',borderRadius:9,padding:'3px 5px',boxShadow:'0 4px 20px rgba(0,0,0,.5)',zIndex:10 }}>
          <div style={{ position:'relative' }}>
            <button onClick={()=>setShowEmoji(!showEmoji)} style={{ padding:'4px 6px',borderRadius:6,background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,.5)',display:'flex',alignItems:'center' }} onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,.07)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}><Smile size={13}/></button>
            {showEmoji && (
              <div style={{ position:'absolute',bottom:'110%',right:0,background:'rgba(15,15,28,.98)',border:'1px solid rgba(255,255,255,.1)',borderRadius:10,padding:6,display:'flex',gap:4,boxShadow:'0 8px 32px rgba(0,0,0,.6)',zIndex:20 }}>
                {REACTIONS.map(e=>(
                  <button key={e} onClick={()=>addReaction(e)} style={{ fontSize:16,padding:'2px 4px',borderRadius:6,background:'transparent',border:'none',cursor:'pointer',transition:'transform .1s' }} onMouseEnter={e2=>(e2.currentTarget.style.transform='scale(1.3)')} onMouseLeave={e2=>(e2.currentTarget.style.transform='scale(1)')}>{e}</button>
                ))}
              </div>
            )}
          </div>
          <button onClick={()=>onReply(msg)} style={{ padding:'4px 6px',borderRadius:6,background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,.5)',display:'flex',alignItems:'center' }} onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,.07)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}><Reply size={13}/></button>
          <button onClick={copy} style={{ padding:'4px 6px',borderRadius:6,background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,.5)',display:'flex',alignItems:'center' }} onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,.07)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}><Copy size={13}/></button>
          {isOwn && <button onClick={()=>onEdit(msg)} style={{ padding:'4px 6px',borderRadius:6,background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,.5)',display:'flex',alignItems:'center' }} onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,.07)')} onMouseLeave={e=>(e.currentTarget.style.background='transparent')}><Edit2 size={13}/></button>}
          {(isOwn||isMod) && <button onClick={()=>onDelete(msg.id)} style={{ padding:'4px 6px',borderRadius:6,background:'transparent',border:'none',cursor:'pointer',color:'rgba(255,255,255,.5)',display:'flex',alignItems:'center' }} onMouseEnter={e=>{e.currentTarget.style.background='rgba(239,68,68,.12)';e.currentTarget.style.color='#f87171';}} onMouseLeave={e=>{e.currentTarget.style.background='transparent';e.currentTarget.style.color='rgba(255,255,255,.5)';}}><Trash2 size={13}/></button>}
        </div>
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <span style={{ display:'inline-flex',gap:3,alignItems:'center' }}>
      {[0,1,2].map(i=>(
        <span key={i} style={{ width:4,height:4,borderRadius:'50%',background:'rgba(255,255,255,.4)',animation:`typingDot 1.2s ease-in-out ${i*0.2}s infinite` }}/>
      ))}
    </span>
  );
}

// ── Main ChatPage ─────────────────────────────────────────────
export default function ChatPage() {
  const { user, onlineUsers } = useAppStore();
  const { t } = useTranslation();
  const currentRole = normalizeRole(user?.role);
  const [messages,    setMessages]    = useState<Msg[]>([]);
  const [input,       setInput]       = useState('');
  const [editId,      setEditId]      = useState<string|null>(null);
  const [editText,    setEditText]    = useState('');
  const [replyTo,     setReplyTo]     = useState<Msg|null>(null);
  const [typingUsers, setTypingUsers] = useState<Record<string,string>>({});
  const [showSidebar, setShowSidebar] = useState(false); // collapsed by default on mobile
  const [loading,     setLoading]     = useState(true);
  const [isMobile,    setIsMobile]    = useState(window.innerWidth < 768);

  const bottomRef   = useRef<HTMLDivElement>(null);
  const inputRef    = useRef<HTMLTextAreaElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout>|null>(null);
  const lastSent    = useRef(0);
  const channelRef  = useRef<any>(null);

  const isMod = canModerateChat(currentRole);
  const isMentionMessage = useCallback((txt: string) => extractMentionedRole(txt) !== null, []);
  const shouldCreatePrivateReply = useCallback((parent: Msg | null) => {
    if (!user || !parent) return false;
    if (parent.is_private) return true;
    return canModerateChat(currentRole) && normalizeRole(parent.user_role) === 'user' && isMentionMessage(parent.message);
  }, [currentRole, isMentionMessage, user]);
  const getPrivateTargetId = useCallback((parent: Msg | null) => {
    if (!parent) return null;
    return parent.private_target_user_id ?? parent.user_id ?? null;
  }, []);
  const filterVisibleMessages = useCallback((rows: Msg[]) => {
    if (!user?.id) return [];
    return rows.filter((row) => canSeeMessage(row, user.id, currentRole));
  }, [currentRole, user?.id]);

  const readFileAsDataUrl = (file: File) => new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Failed to read image'));
    reader.readAsDataURL(file);
  });

  // Responsive detection
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth < 768;
      setIsMobile(mobile);
      if (!mobile) setShowSidebar(true); // auto-show on desktop
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    supabase.from('chat_messages').select('*').order('created_at',{ascending:true}).limit(100)
      .then(({data}) => { if(data) setMessages(filterVisibleMessages(data as Msg[])); setLoading(false); });
  }, [filterVisibleMessages, user?.id]);

  useEffect(() => {
    if (!user) return;
    const ch = supabase.channel('chat_v2',{config:{presence:{key:user.id}}});

    ch.on('postgres_changes',{event:'INSERT',schema:'public',table:'chat_messages'},({new:m})=>{
      const next = m as Msg;
      if (!canSeeMessage(next, user.id, currentRole)) return;
      setMessages(p=>{ if(p.find(x=>x.id===next.id)) return p; return [...p,next]; });
    })
    .on('postgres_changes',{event:'UPDATE',schema:'public',table:'chat_messages'},({new:m})=>{
      const next = m as Msg;
      if (!canSeeMessage(next, user.id, currentRole)) {
        setMessages(p => p.filter(x => x.id !== next.id));
        return;
      }
      setMessages(p=>{
        const existing = p.find(x => x.id === next.id);
        if (!existing) return [...p, next];
        return p.map(x=>x.id===next.id?next:x);
      });
    })
    .on('postgres_changes',{event:'DELETE',schema:'public',table:'chat_messages'},({old:m})=>{
      // Guard: REPLICA IDENTITY FULL ensures id is present; always filter only the targeted id
      const deletedId = (m as any)?.id;
      if (deletedId) setMessages(p => p.filter(x => x.id !== deletedId));
    })
    .on('broadcast',{event:'typing'},({payload})=>{
      if(payload.userId===user.id) return;
      setTypingUsers(p=>({...p,[payload.userId]:payload.userName}));
      if(typingTimer.current) clearTimeout(typingTimer.current);
      typingTimer.current=setTimeout(()=>{
        setTypingUsers(p=>{const n={...p};delete n[payload.userId];return n;});
      },3000);
    });

    ch.subscribe();
    channelRef.current=ch;
    return ()=>{ supabase.removeChannel(ch); };
  }, [currentRole, user?.id]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({behavior:'smooth'});
  }, [messages,typingUsers]);

  const broadcastTyping = useCallback(()=>{
    if(!user||!channelRef.current) return;
    channelRef.current.send({type:'broadcast',event:'typing',payload:{userId:user.id,userName:user.name}});
  },[user?.id]);

  const handleSend = useCallback(async()=>{
    const txt=input.trim();
    if(!txt||!user) return;
    if(Date.now()-lastSent.current<1000){toast.error(t('common.tryAgain'));return;}
    lastSent.current=Date.now();
    const targetRole = replyTo?.target_role ?? extractMentionedRole(txt);
    const isPrivate = !targetRole && shouldCreatePrivateReply(replyTo);
    const privateTargetId = isPrivate ? getPrivateTargetId(replyTo) : null;
    setInput('');setReplyTo(null);
    if (inputRef.current) { inputRef.current.style.height='auto'; }
    const tempId=`temp_${Date.now()}`;
    const optimistic:Msg={id:tempId,user_id:user.id,user_email:user.email,user_name:user.name,user_avatar:user.avatar||'',user_role:currentRole,message:txt,created_at:new Date().toISOString(),reply_to:replyTo?.id||null,is_private:isPrivate,private_target_user_id:privateTargetId,target_role:targetRole};
    setMessages(p=>[...p,optimistic]);
    const {data,error}=await supabase.from('chat_messages').insert({user_id:user.id,user_email:user.email,user_name:user.name,user_avatar:user.avatar||'',user_role:currentRole,message:txt,reply_to:replyTo?.id||null,is_private:isPrivate,private_target_user_id:privateTargetId,target_role:targetRole}).select().single();
    if(error){toast.error(error.message || t('common.error'));setMessages(p=>p.filter(m=>m.id!==tempId));setInput(txt);}
    else if(data){
      setMessages(p=>p.map(m=>m.id===tempId?data:m));
      if(isPrivate && replyTo && privateTargetId && replyTo.user_email){
        notifyUser(privateTargetId, { type:'chat', title:`Private reply from ${user.name}`, body:txt.slice(0,80), linkPath:'/chat' });
        sendNotificationEmail({ to:[replyTo.user_email], subject:`Private reply from ${user.name}`, html:`<p>${user.name} replied to your support thread.</p><p><strong>Message:</strong> ${txt}</p>` });
        logActivity({ userId:user.id, userEmail:user.email, userName:user.name, action:'private_reply', status:'success', meta:{ preview:txt.slice(0,60), target_user_id:privateTargetId } });
      }
      // Log activity (skip private messages to avoid spamming logs)
      if(!isPrivate && user) logActivity({ userId:user.id, userEmail:user.email, userName:user.name, action:'message_sent', status:'success', meta:{ preview:txt.slice(0,40), target_role:targetRole } });
      // Notify all users of new chat message (small badge increment)
      if(!isPrivate && !targetRole) notifyAll({ type:'chat', title:`New chat from ${user?.name?.split(' ')[0]}: ${txt.slice(0,50)}`, body:'', linkPath:'/chat' });
    }
  },[currentRole, input, user, replyTo, shouldCreatePrivateReply, getPrivateTargetId, t]);

  const handleDelete = async (id: string) => {
    // Optimistic: remove immediately from local state, realtime confirms for other users
    setMessages(p => p.filter(x => x.id !== id));
    const { error } = await supabase.from('chat_messages').delete().eq('id', id);
    if (error) {
      // Rollback on failure — reload messages
      toast.error(t('common.error'));
      supabase.from('chat_messages').select('*').order('created_at',{ascending:true}).limit(100)
        .then(({data}) => { if (data) setMessages(filterVisibleMessages(data as Msg[])); });
    }
  };
  const handleEditSave=async()=>{
    if(!editText.trim()||!editId) return;
    await supabase.from('chat_messages').update({message:editText}).eq('id',editId);
    setEditId(null);setEditText('');
  };

  const roleOrder:Record<string,number> = Object.fromEntries(ROLE_ORDER.map((role, index) => [role, index]));
  const sortedOnline=[...onlineUsers].sort((a,b)=>(roleOrder[a.userRole]??2)-(roleOrder[b.userRole]??2));
  const typingList=Object.values(typingUsers);
  const isPrivateInput=extractMentionedRole(input) !== null;

  return (
    <>
      <style>{`
        @keyframes typingDot{0%,60%,100%{transform:translateY(0);opacity:.4}30%{transform:translateY(-4px);opacity:1}}
        @keyframes msgIn{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
        .chat-msg-in{animation:msgIn .18s ease-out;}
        .chat-scroll::-webkit-scrollbar{width:3px;}
        .chat-scroll::-webkit-scrollbar-track{background:transparent;}
        .chat-scroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.07);border-radius:4px;}
        .chat-scroll::-webkit-scrollbar-thumb:hover{background:rgba(255,255,255,.14);}
        .chat-input{resize:none;background:transparent;border:none;outline:none;color:#fff;font-family:inherit;font-size:14px;width:100%;max-height:100px;line-height:1.5;}
        .chat-input::placeholder{color:rgba(255,255,255,.22);}
        .chat-send-btn{
          font-family:inherit;
          font-size:13px;
          font-weight:800;
          background:linear-gradient(135deg,#8b5cf6,#6d28d9);
          color:white;
          padding:.72em 1.05em;
          display:flex;
          align-items:center;
          border:none;
          border-radius:16px;
          overflow:hidden;
          transition:all .2s;
          cursor:pointer;
          box-shadow:0 0 24px rgba(109,40,217,.35);
          flex-shrink:0;
          min-width:104px;
          justify-content:center;
        }
        .chat-send-btn .chat-send-label{
          display:block;
          margin-left:.35em;
          transition:all .3s ease-in-out;
          white-space:nowrap;
        }
        .chat-send-btn .chat-send-icon{
          display:flex;
          align-items:center;
          justify-content:center;
          transform-origin:center center;
          transition:transform .3s ease-in-out;
        }
        .chat-send-btn:hover .chat-send-icon-wrap{
          animation:fly-1 .6s ease-in-out infinite alternate;
        }
        .chat-send-btn:hover .chat-send-icon{
          transform:translateX(1.05em) rotate(45deg) scale(1.08);
        }
        .chat-send-btn:hover .chat-send-label{
          transform:translateX(4.4em);
        }
        .chat-send-btn:active{
          transform:scale(.95);
        }
        .chat-send-btn:disabled{
          cursor:not-allowed;
          opacity:.38;
          box-shadow:none;
        }
        .chat-send-btn:disabled:hover .chat-send-icon-wrap{
          animation:none;
        }
        .chat-send-btn:disabled:hover .chat-send-icon,
        .chat-send-btn:disabled:hover .chat-send-label{
          transform:none;
        }
        @keyframes fly-1{
          from{transform:translateY(.1em);}
          to{transform:translateY(-.1em);}
        }
        @media(max-width:767px){
          .chat-sidebar-panel{display:none!important;}
          .chat-sidebar-panel.visible{display:flex!important;}
        }
      `}</style>

      <div style={{ display:'flex', flex:1, minHeight:0, gap:8, overflow:'hidden' }}>

        {/* ── Main chat area ── */}
        <div style={{ flex:1, display:'flex', flexDirection:'column', minWidth:0, background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)', borderRadius:isMobile?16:20, overflow:'hidden' }}>

          {/* Header */}
          <div style={{ display:'flex', alignItems:'center', gap:8, padding:isMobile?'10px 12px':'12px 16px', borderBottom:'1px solid rgba(255,255,255,.06)', background:'rgba(255,255,255,.02)', flexShrink:0 }}>
            <div style={{ width:28,height:28,borderRadius:8,background:'rgba(139,92,246,.12)',border:'1px solid rgba(139,92,246,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
              <Hash size={14} color="var(--purple)"/>
            </div>
            <div style={{ flex:1,minWidth:0 }}>
              <div style={{ fontSize:isMobile?13:14, fontWeight:800, color:'#fff', lineHeight:1.2 }}>{t('chat.title')}</div>
              <div style={{ fontSize:10, color:'var(--muted)' }}>{sortedOnline.length} online · Live</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
              <div className="dot dot-green" style={{ width:5,height:5 }}/>
              <span style={{ fontSize:11, color:'var(--green)', fontWeight:600 }}>{sortedOnline.length}</span>
              <button onClick={()=>setShowSidebar(!showSidebar)}
                style={{ padding:'5px 9px', borderRadius:8, background:'rgba(255,255,255,.05)', border:'1px solid var(--border)', cursor:'pointer', fontSize:10, color:'var(--muted)', fontFamily:'inherit', display:'flex', alignItems:'center', gap:4 }}>
                <Users size={11}/>{isMobile?(showSidebar?'Hide':'Show'):(showSidebar?'Hide':'Members')}
              </button>
            </div>
          </div>

          {/* Messages */}
          <div className="chat-scroll" style={{ flex:1, overflowY:'auto', padding:isMobile?'8px 4px':'10px 4px' }}>
            {loading && (
              <div style={{ display:'flex',alignItems:'center',justifyContent:'center',padding:'40px 0',color:'var(--muted)',fontSize:13 }}>
                {t('common.loading')}
              </div>
            )}
            {!loading && messages.length===0 && (
              <div style={{ textAlign:'center',padding:'50px 20px' }}>
                <div style={{ fontSize:28,marginBottom:10 }}>👋</div>
                <div style={{ fontSize:14,fontWeight:600,color:'rgba(255,255,255,.4)',marginBottom:5 }}>{t('chat.noMessages')}</div>
                <div style={{ fontSize:12,color:'var(--dim)' }}>{t('chat.beFirst')}</div>
              </div>
            )}
            {messages.map(msg=>(
              <div key={msg.id} className="chat-msg-in">
                {editId===msg.id ? (
                  <div style={{ display:'flex',gap:7,padding:'6px 10px',alignItems:'center' }}>
                    <Avatar src={msg.user_avatar} name={msg.user_name} role={msg.user_role} size={28}/>
                    <input value={editText} onChange={e=>setEditText(e.target.value)}
                      onKeyDown={e=>{if(e.key==='Enter')handleEditSave();if(e.key==='Escape'){setEditId(null);setEditText('');}}}
                      style={{ flex:1,padding:'7px 11px',borderRadius:9,background:'rgba(255,255,255,.06)',border:'1px solid rgba(139,92,246,.3)',color:'#fff',fontFamily:'inherit',fontSize:13,outline:'none' }}
                      autoFocus/>
                    <button onClick={handleEditSave} className="btn btn-p btn-sm" style={{fontSize:11}}>{t('common.save')}</button>
                    <button onClick={()=>{setEditId(null);setEditText('');}} style={{ padding:5,borderRadius:7,background:'rgba(255,255,255,.05)',border:'1px solid var(--border)',cursor:'pointer',color:'var(--muted)',display:'flex' }}><X size={12}/></button>
                  </div>
                ) : (
                  <Message
                    msg={msg} isOwn={msg.user_id===user?.id} isMod={isMod}
                    currentUserId={user?.id??''}
                    currentUserRole={currentRole}
                    onReply={setReplyTo} onDelete={handleDelete}
                    onEdit={m=>{setEditId(m.id);setEditText(m.message);}}
                    allMsgs={messages} compact={isMobile}
                  />
                )}
              </div>
            ))}

            {typingList.length>0 && (
              <div style={{ display:'flex',alignItems:'center',gap:8,padding:'6px 12px',color:'rgba(255,255,255,.35)',fontSize:11 }}>
                <TypingDots/>
                <span>
                  {typingList.slice(0,2).join(', ')}{typingList.length>2?` +${typingList.length-2} more`:''} {typingList.length===1?'is':'are'} typing...
                </span>
              </div>
            )}
            <div ref={bottomRef}/>
          </div>

          {/* Reply bar */}
          {replyTo && (
            <div style={{ display:'flex',alignItems:'center',gap:8,padding:'7px 12px',borderTop:'1px solid rgba(255,255,255,.06)',background:'rgba(139,92,246,.05)',flexShrink:0 }}>
              <Reply size={11} color="var(--purple)"/>
              <div style={{ flex:1,minWidth:0 }}>
                <span style={{ fontSize:10,color:'var(--purple)',fontWeight:700 }}>→ {replyTo.user_name}: </span>
                <span style={{ fontSize:10,color:'var(--muted)',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{replyTo.message}</span>
              </div>
              <button onClick={()=>setReplyTo(null)} style={{ padding:3,borderRadius:5,background:'none',border:'none',cursor:'pointer',color:'var(--dim)',display:'flex' }}><X size={11}/></button>
            </div>
          )}

          {/* Input area */}
          <div style={{ padding:isMobile?'8px 10px 10px':'10px 12px 12px', borderTop:'1px solid rgba(255,255,255,.06)', flexShrink:0, background:'rgba(255,255,255,.01)' }}>

            {/* Private mention hints */}
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:7, flexWrap:'wrap' }}>
              <span style={{ fontSize:9,color:'rgba(255,255,255,.18)',fontWeight:500 }}>Tip:</span>
              {[
                {tag:'@owner',label:'Owner',c:'#fbbf24',bg:'rgba(251,191,36,.08)',bc:'rgba(251,191,36,.18)'},
                {tag:'@admin',label:'Admin',c:'rgba(248,113,113,.9)',bg:'rgba(239,68,68,.08)',bc:'rgba(239,68,68,.18)'},
                {tag:'@support',label:'Support',c:'rgba(96,165,250,.9)',bg:'rgba(59,130,246,.08)',bc:'rgba(59,130,246,.18)'},
                {tag:'@reseller',label:'Reseller',c:'rgba(52,211,153,.95)',bg:'rgba(52,211,153,.08)',bc:'rgba(52,211,153,.18)'},
              ].map(({tag,label,c,bg,bc})=>(
                <button key={tag} onClick={()=>{setInput(p=>p?p+' '+tag+' ':tag+' ');inputRef.current?.focus();}}
                  style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:20,background:bg,border:`1px solid ${bc}`,cursor:'pointer',fontFamily:'inherit',transition:'opacity .15s' }}
                  onMouseEnter={e=>(e.currentTarget.style.opacity='.75')} onMouseLeave={e=>(e.currentTarget.style.opacity='1')}>
                  <Lock size={8} color={c}/>
                  <span style={{ fontSize:9,fontWeight:700,color:c }}>{tag}</span>
                  <span style={{ fontSize:8,color:'rgba(255,255,255,.25)' }}>{label}</span>
                </button>
              ))}
            </div>

            {/* Input row */}
            <form onSubmit={e=>{e.preventDefault(); void handleSend();}} style={{ display:'flex', gap:8, alignItems:'flex-end', background:isPrivateInput?'rgba(139,92,246,.06)':'rgba(255,255,255,.04)', border:isPrivateInput?'1px solid rgba(139,92,246,.22)':'1px solid rgba(255,255,255,.07)', borderRadius:12, padding:'8px 10px', transition:'all .2s', boxShadow:isPrivateInput?'0 0 16px rgba(139,92,246,.08)':'none' }}>
              <Avatar src={user?.avatar} name={user?.name||'?'} role={user?.role} size={26}/>
                <div style={{ flex:1, minWidth:0 }}>
                {replyTo && shouldCreatePrivateReply(replyTo) && (
                  <div style={{ display:'flex',alignItems:'center',gap:4,marginBottom:4 }}>
                    <Lock size={9} color="var(--purple)"/>
                    <span style={{ fontSize:9,fontWeight:700,color:'var(--purple)' }}>Private — Support Team only</span>
                  </div>
                )}
                {!replyTo && isPrivateInput && (
                  <div style={{ display:'flex',alignItems:'center',gap:4,marginBottom:4 }}>
                    <span style={{ fontSize:9,fontWeight:700,color:'var(--muted)' }}>Role mentions are only visible to that role and the owner.</span>
                  </div>
                )}
                <textarea
                  ref={inputRef}
                  className="chat-input"
                  value={input}
                  rows={1}
                  enterKeyHint="send"
                  onChange={e=>{
                    setInput(e.target.value);
                    broadcastTyping();
                    e.target.style.height='auto';
                    e.target.style.height=Math.min(e.target.scrollHeight,100)+'px';
                  }}
                  onKeyDown={e=>{
                    if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();handleSend();}
                  }}
                  placeholder={user?t('chat.placeholder'):'Login to chat...'}
                  disabled={!user}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim()||!user}
                className="chat-send-btn"
                style={isPrivateInput ? { background:'linear-gradient(135deg,#7c3aed,#6d28d9)' } : undefined}
              >
                <div className="chat-send-icon-wrap">
                  <div className="chat-send-icon">
                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="currentColor">
                      <path fill="none" d="M0 0h24v24H0z"></path>
                      <path d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"></path>
                    </svg>
                  </div>
                </div>
                <span className="chat-send-label">Send</span>
              </button>
            </form>
          </div>
        </div>

        {/* ── Online Users Sidebar ── */}
        {showSidebar && (
          <div className={`chat-sidebar-panel ${showSidebar ? 'visible' : ''}`}
            style={{ width:isMobile?'min(180px,42vw)':200, display:'flex', flexDirection:'column', background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.06)', borderRadius:isMobile?16:20, overflow:'hidden', flexShrink:0 }}>
            <div style={{ padding:'10px 12px', borderBottom:'1px solid rgba(255,255,255,.06)', flexShrink:0 }}>
              <div style={{ fontSize:10,fontWeight:700,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.1em' }}>
                Online — {sortedOnline.length}
              </div>
            </div>
            <div className="chat-scroll" style={{ flex:1,overflowY:'auto',padding:'8px' }}>
              {(['owner','admin','support','reseller','user'] as const).map(role=>{
                const group=sortedOnline.filter(u=>(u.userRole||'user')===role);
                if(!group.length) return null;
                const roleLabel=role==='user'?'Members':ROLE_META[role].label;
                const roleColor=ROLE_META[role].color;
                return (
                  <div key={role} style={{ marginBottom:12 }}>
                    <div style={{ fontSize:9,fontWeight:700,color:roleColor,textTransform:'uppercase',letterSpacing:'.1em',padding:'0 5px',marginBottom:5 }}>
                      {roleLabel} — {group.length}
                    </div>
                    {group.map(u=>(
                      <div key={u.userId} style={{ display:'flex',alignItems:'center',gap:7,padding:'5px 6px',borderRadius:8,marginBottom:2,transition:'background .12s',cursor:'default' }}
                        onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,.04)')}
                        onMouseLeave={e=>(e.currentTarget.style.background='transparent')}>
                        <div style={{ position:'relative',flexShrink:0 }}>
                          <Avatar src={u.userAvatar} name={u.userName} role={u.userRole} size={isMobile?24:28}/>
                          <div style={{ position:'absolute',bottom:0,right:0,width:7,height:7,borderRadius:'50%',background:'var(--green)',border:'2px solid var(--bg)',boxShadow:'0 0 5px var(--green)' }}/>
                        </div>
                        <div style={{ flex:1,minWidth:0 }}>
                          <div style={{ fontSize:11,fontWeight:600,color:role==='user'?'rgba(255,255,255,.72)':roleColor,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                            {u.userName}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}
              {sortedOnline.length===0 && (
                <div style={{ textAlign:'center',padding:'16px 0',fontSize:11,color:'var(--dim)' }}>No one online</div>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
