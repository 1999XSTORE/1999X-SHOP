import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Send, Trash2, Star, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const roleBadge = {
  admin: { label: 'ADMIN', className: 'bg-destructive/15 text-destructive border-destructive/30' },
  support: { label: 'SUPPORT', className: 'bg-primary/15 text-primary border-primary/30' },
  user: null,
};

export default function ChatPage() {
  const { t } = useTranslation();
  const { chatMessages, addChatMessage, deleteChatMessage, highlightChatMessage, user } = useAppStore();
  const [message, setMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [chatMessages]);

  const handleSend = () => {
    if (!message.trim() || !user) return;
    addChatMessage({
      userId: user.id, userName: user.name, userAvatar: user.avatar,
      userRole: user.role, message: message.trim(),
    });
    setMessage('');
  };

  const isModRole = user?.role === 'admin' || user?.role === 'support';

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-3xl mx-auto animate-fade-up">
      <div className="flex-1 overflow-y-auto space-y-1 pr-1 scrollbar-thin">
        {chatMessages.map((msg) => {
          const badge = roleBadge[msg.userRole];
          return (
            <div key={msg.id} className={cn(
              'group flex gap-3 p-3 rounded-lg transition-colors hover:bg-secondary/50',
              msg.highlighted && 'bg-primary/5 border-l-2 border-primary'
            )}>
              <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-xs font-bold text-foreground flex-shrink-0">
                {msg.userName.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-foreground">{msg.userName}</span>
                  {badge && (
                    <span className={cn('text-[8px] font-bold px-1.5 py-0.5 rounded border', badge.className)}>
                      {badge.label}
                    </span>
                  )}
                  <span className="text-[10px] text-muted-foreground">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-secondary-foreground break-words">{msg.message}</p>
              </div>
              {isModRole && (
                <div className="opacity-0 group-hover:opacity-100 flex items-start gap-1 transition-opacity">
                  <button onClick={() => highlightChatMessage(msg.id)} className="p-1 rounded hover:bg-muted transition-colors">
                    <Star className="w-3 h-3 text-primary" />
                  </button>
                  <button onClick={() => deleteChatMessage(msg.id)} className="p-1 rounded hover:bg-destructive/10 transition-colors">
                    <Trash2 className="w-3 h-3 text-destructive" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="glass-surface rounded-xl p-3 mt-3 flex gap-2">
        <input
          value={message} onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder={t('chat.placeholder')}
          className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground focus:outline-none"
        />
        <button onClick={handleSend}
          className="p-2.5 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-all active:scale-[0.95]">
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
