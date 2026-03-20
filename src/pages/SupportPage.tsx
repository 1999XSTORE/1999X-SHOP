import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Send, Headphones } from 'lucide-react';

export default function SupportPage() {
  const { t } = useTranslation();
  const { supportMessages, addSupportMessage, user } = useAppStore();
  const [message, setMessage] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [supportMessages]);

  const handleSend = () => {
    if (!message.trim() || !user) return;
    addSupportMessage({
      userId: user.id, userName: user.name, userAvatar: user.avatar,
      userRole: user.role, message: message.trim(),
    });
    setMessage('');
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] max-w-2xl mx-auto animate-fade-up">
      <div className="glass-surface rounded-xl p-4 mb-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary/15 flex items-center justify-center">
          <Headphones className="w-5 h-5 text-primary" />
        </div>
        <div>
          <p className="text-sm font-bold text-foreground">{t('support.title')}</p>
          <p className="text-[10px] text-muted-foreground">{t('support.tagSupport')}</p>
        </div>
        <span className="ml-auto flex items-center gap-1.5 text-[10px] font-semibold text-emerald">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald animate-pulse" /> Online
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2 pr-1 scrollbar-thin">
        {supportMessages.map((msg) => {
          const isMe = msg.userId === user?.id;
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[75%] p-3 rounded-xl text-sm ${
                isMe ? 'bg-primary/15 text-foreground rounded-br-sm' : 'glass-surface rounded-bl-sm'
              }`}>
                <p className="text-[10px] font-semibold text-muted-foreground mb-1">{msg.userName}</p>
                <p className="text-secondary-foreground">{msg.message}</p>
                <p className="text-[9px] text-muted-foreground mt-1 text-right">
                  {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>

      <div className="glass-surface rounded-xl p-3 mt-3 flex gap-2">
        <input
          value={message} onChange={e => setMessage(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSend()}
          placeholder="Type your message..."
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
