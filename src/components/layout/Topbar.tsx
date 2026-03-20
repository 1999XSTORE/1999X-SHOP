import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Bell, Wallet, Menu, LogOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { key: 'dashboard',   path: '/' },
  { key: 'products',    path: '/products' },
  { key: 'licenses',    path: '/licenses' },
  { key: 'chat',        path: '/chat' },
  { key: 'panelStatus', path: '/panel-status' },
];

interface TopbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onMobileMenu: () => void;
  onLogout: () => void;
}

export default function Topbar({ currentPath, onNavigate, onMobileMenu, onLogout }: TopbarProps) {
  const { t } = useTranslation();
  const { balance, announcements, user } = useAppStore();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <header className="sticky top-0 z-40 h-14 flex items-center justify-between px-4 lg:px-6 border-b border-white/5 bg-[#0d0d1a]/80 backdrop-blur-xl">
      {/* Left */}
      <div className="flex items-center gap-4">
        <button onClick={onMobileMenu} className="p-2 rounded-lg hover:bg-white/5 transition-colors lg:hidden">
          <Menu className="w-5 h-5 text-white/60" />
        </button>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-1">
          {navItems.map(item => (
            <button
              key={item.key}
              onClick={() => onNavigate(item.path)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200',
                currentPath === item.path
                  ? 'text-purple-400 bg-purple-500/10'
                  : 'text-white/40 hover:text-white/80 hover:bg-white/5'
              )}
            >
              {t(`nav.${item.key}`)}
            </button>
          ))}
        </nav>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2">
        {/* Balance */}
        <div
          onClick={() => onNavigate('/wallet')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-purple-500/20 bg-purple-500/10 text-xs font-semibold cursor-pointer hover:bg-purple-500/15 transition-colors"
        >
          <Wallet className="w-3 h-3 text-purple-400" />
          <span className="text-purple-300">${balance.toFixed(2)}</span>
        </div>

        {/* Notifications */}
        <button className="relative p-2 rounded-lg hover:bg-white/5 transition-colors">
          <Bell className="w-4 h-4 text-white/40" />
          {announcements.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-purple-500" />
          )}
        </button>

        {/* Profile */}
        <div className="relative" ref={profileRef}>
          <button
            onClick={() => setProfileOpen(!profileOpen)}
            className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
          >
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover ring-1 ring-purple-500/30" />
            ) : (
              <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] font-bold text-purple-400">
                {user?.name.charAt(0) || 'U'}
              </div>
            )}
          </button>
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-52 rounded-xl border border-white/10 bg-[#0f0f1f]/95 backdrop-blur shadow-2xl shadow-black/60 py-1 z-50">
              {user && (
                <div className="px-3 py-3 border-b border-white/5">
                  <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                  <p className="text-[10px] text-white/30 truncate">{user.email}</p>
                </div>
              )}
              <button
                onClick={() => { onLogout(); setProfileOpen(false); }}
                className="w-full flex items-center gap-2 px-3 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                {t('nav.logout')}
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
