import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Send, Headphones, ExternalLink } from 'lucide-react';

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
    <div className="max-w-2xl mx-auto space-y-4">
      {/* Discord link */}
      <a
        href="https://discord.gg/your-server"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-3 p-4 rounded-xl border border-indigo-500/20 bg-indigo-500/5 hover:bg-indigo-500/10 transition-colors animate-fade-up"
      >
        <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
          <svg className="w-5 h-5 text-indigo-400" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057c.003.024.012.047.031.064a19.9 19.9 0 0 0 5.993 3.032.077.077 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.032.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z"/>
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-bold text-white">Join Discord Server</p>
          <p className="text-[11px] text-white/30">Get instant support from our team</p>
        </div>
        <ExternalLink className="w-4 h-4 text-white/20" />
      </a>

      {/* Chat */}
      <div className="flex flex-col h-[calc(100vh-16rem)] rounded-2xl border border-white/10 bg-white/3 overflow-hidden animate-fade-up">
        <div className="p-4 border-b border-white/5 flex items-center gap-2">
          <Headphones className="w-4 h-4 text-purple-400" />
          <h2 className="text-sm font-bold text-white">Support Chat</h2>
          <span className="ml-auto text-[10px] text-white/30">Avg response: &lt;1hr</span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {supportMessages.map(msg => (
            <div key={msg.id} className="flex gap-3">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400 flex-shrink-0">
                {msg.userName.charAt(0)}
              </div>
              <div>
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-semibold text-white">{msg.userName}</span>
                  <span className="text-[10px] text-white/20">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <p className="text-sm text-white/60 break-words">{msg.message}</p>
              </div>
            </div>
          ))}
          <div ref={bottomRef} />
        </div>

        <div className="flex gap-2 p-3 border-t border-white/5">
          <input
            value={message}
            onChange={e => setMessage(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleSend()}
            placeholder="Type your message..."
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
    </div>
  );
}
