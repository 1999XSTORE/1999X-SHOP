import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Send, Trash2, Star, Edit2, Reply, X, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const roleBadge: Record<string, { label: string; className: string }> = {
  admin:   { label: 'ADMIN',   className: 'bg-red-500/15 text-red-400 border-red-500/20' },
  support: { label: 'SUPPORT', className: 'bg-purple-500/15 text-purple-400 border-purple-500/20' },
};

interface RealtimeMsg {
  id: string;
  user_id: string;
  user_name: string;
  user_avatar: string;
  user_role: string;
  message: string;
  created_at: string;
  reply_to?: string | null;
}

export default function ChatPage() {
  const { t } = useTranslation();
  const { user } = useAppStore();
  const [messages, setMessages]     = useState<RealtimeMsg[]>([]);
  const [message, setMessage]       = useState('');
  const [editId, setEditId]         = useState<string | null>(null);
  const [editText, setEditText]     = useState('');
  const [replyTo, setReplyTo]       = useState<RealtimeMsg | null>(null);
  const [typing, setTyping]         = useState<string[]>([]);
  const [onlineCount, setOnlineCount] = useState(1);
  const bottomRef   = useRef<HTMLDivElement>(null);
  const typingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load messages & subscribe to realtime
  useEffect(() => {
    // Initial load
    supabase
      .from('chat_messages')
      .select('*')
      .order('created_at', { ascending: true })
      .limit(100)
      .then(({ data }) => { if (data) setMessages(data); });

    // Realtime subscription
    const channel = supabase
      .channel('chat_room')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'chat_messages' }, payload => {
        setMessages(prev => [...prev, payload.new as RealtimeMsg]);
      })
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'chat_messages' }, payload => {
        setMessages(prev => prev.map(m => m.id === (payload.new as RealtimeMsg).id ? payload.new as RealtimeMsg : m));
      })
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'chat_messages' }, payload => {
        setMessages(prev => prev.filter(m => m.id !== payload.old.id));
      })
      // Typing indicator via broadcast
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === user?.id) return;
        setTyping(prev => {
          if (!prev.includes(payload.userName)) return [...prev, payload.userName];
          return prev;
        });
        setTimeout(() => setTyping(prev => prev.filter(u => u !== payload.userName)), 3000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  // Auto-scroll
  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const broadcastTyping = () => {
    if (!user) return;
    supabase.channel('chat_room').send({ type: 'broadcast', event: 'typing', payload: { userId: user.id, userName: user.name } });
    if (typingTimer.current) clearTimeout(typingTimer.current);
  };

  const handleSend = async () => {
    if (!message.trim() || !user) return;
    const msg = message.trim();
    setMessage('');
    setReplyTo(null);

    const { error } = await supabase.from('chat_messages').insert({
      user_id:     user.id,
      user_name:   user.name,
      user_avatar: user.avatar || '',
      user_role:   user.role,
      message:     msg,
      reply_to:    replyTo?.id || null,
    });
    if (error) {
      toast.error('Failed to send message');
      setMessage(msg);
    }
  };

  const handleDelete = async (id: string) => {
    await supabase.from('chat_messages').delete().eq('id', id);
  };

  const handleEditSave = async () => {
    if (!editText.trim() || !editId) return;
    await supabase.from('chat_messages').update({ message: editText }).eq('id', editId);
    setEditId(null); setEditText('');
  };

  const isModRole = user?.role === 'admin' || user?.role === 'support';

  const getReplyMsg = (id: string | null) => id ? messages.find(m => m.id === id) : null;

  return (
    <div className="flex flex-col h-[calc(100vh-6rem)] w-full gap-3">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <h2 className="text-sm font-bold text-white flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          Community Chat
        </h2>
        <div className="flex items-center gap-1.5 text-[10px] text-white/30">
          <Users className="w-3 h-3" />
          {onlineCount} online
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto space-y-0.5 pr-1">
        {messages.length === 0 && (
          <div className="text-center py-12">
            <p className="text-xs text-white/20">No messages yet. Start the conversation!</p>
          </div>
        )}
        {messages.map((msg) => {
          const badge = roleBadge[msg.user_role];
          const replyMsg = getReplyMsg(msg.reply_to || null);
          const isOwn = msg.user_id === user?.id;

          return (
            <div key={msg.id} className={cn(
              'group flex gap-3 p-3 rounded-xl transition-colors hover:bg-white/3',
            )}>
              {/* Avatar */}
              {msg.user_avatar ? (
                <img src={msg.user_avatar} alt={msg.user_name} className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400 flex-shrink-0 mt-0.5">
                  {msg.user_name.charAt(0)}
                </div>
              )}

              <div className="flex-1 min-w-0">
                {/* Name + badge + time */}
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-sm font-semibold text-white">{msg.user_name}</span>
                  {badge && (
                    <span className={cn('text-[9px] font-bold px-1.5 py-0.5 rounded border', badge.className)}>
                      {badge.label}
                    </span>
                  )}
                  <span className="text-[10px] text-white/20">
                    {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                {/* Reply preview */}
                {replyMsg && (
                  <div className="mb-1.5 pl-3 border-l-2 border-white/10 text-[10px] text-white/30 truncate">
                    <span className="font-semibold text-white/50">{replyMsg.user_name}:</span> {replyMsg.message}
                  </div>
                )}

                {/* Message body */}
                {editId === msg.id ? (
                  <div className="flex gap-2">
                    <input
                      value={editText}
                      onChange={e => setEditText(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleEditSave()}
                      className="flex-1 px-3 py-1.5 rounded-lg bg-white/5 border border-white/10 text-sm text-white focus:outline-none focus:ring-1 focus:ring-purple-500/40"
                    />
                    <button onClick={handleEditSave} className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs font-semibold">Save</button>
                    <button onClick={() => setEditId(null)} className="p-1.5 rounded-lg hover:bg-white/5"><X className="w-3.5 h-3.5 text-white/30" /></button>
                  </div>
                ) : (
                  <p className="text-sm text-white/70 break-words leading-relaxed">{msg.message}</p>
                )}
              </div>

              {/* Action buttons (hover) */}
              <div className="opacity-0 group-hover:opacity-100 flex items-start gap-1 transition-opacity flex-shrink-0">
                <button onClick={() => setReplyTo(msg)} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Reply">
                  <Reply className="w-3.5 h-3.5 text-white/30 hover:text-white/60" />
                </button>
                {(isOwn || isModRole) && (
                  <>
                    <button onClick={() => { setEditId(msg.id); setEditText(msg.message); }} className="p-1.5 rounded-lg hover:bg-white/5 transition-colors" title="Edit">
                      <Edit2 className="w-3.5 h-3.5 text-white/30 hover:text-white/60" />
                    </button>
                    <button onClick={() => handleDelete(msg.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-colors" title="Delete">
                      <Trash2 className="w-3.5 h-3.5 text-white/30 hover:text-red-400" />
                    </button>
                  </>
                )}
              </div>
            </div>
          );
        })}

        {/* Typing indicator */}
        {typing.length > 0 && (
          <div className="px-3 py-2 text-[11px] text-white/30 italic">
            {typing.join(', ')} {typing.length === 1 ? 'is' : 'are'} typing...
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Reply preview bar */}
      {replyTo && (
        <div className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10">
          <Reply className="w-3.5 h-3.5 text-white/30 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <span className="text-[10px] text-white/50 font-semibold">Replying to {replyTo.user_name}: </span>
            <span className="text-[10px] text-white/30 truncate">{replyTo.message}</span>
          </div>
          <button onClick={() => setReplyTo(null)} className="p-1 rounded hover:bg-white/5">
            <X className="w-3.5 h-3.5 text-white/30" />
          </button>
        </div>
      )}

      {/* Input */}
      <div className="flex gap-2 p-3 rounded-xl border border-white/10 bg-white/3">
        <input
          value={message}
          onChange={e => { setMessage(e.target.value); broadcastTyping(); }}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={t('chat.placeholder')}
          className="flex-1 bg-transparent text-sm text-white placeholder:text-white/20 focus:outline-none"
        />
        <button
          onClick={handleSend}
          disabled={!message.trim()}
          className="p-2.5 rounded-lg text-white transition-all active:scale-[0.95] disabled:opacity-40"
          style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
