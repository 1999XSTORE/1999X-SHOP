import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Bell, Wallet, Menu, X, ChevronDown, LogOut } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { key: 'dashboard', path: '/' },
  { key: 'products', path: '/products' },
  { key: 'licenses', path: '/licenses' },
  { key: 'chat', path: '/chat' },
  { key: 'support', path: '/support' },
  { key: 'panelStatus', path: '/panel-status' },
];

interface TopbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
}

export default function Topbar({ currentPath, onNavigate }: TopbarProps) {
  const { t } = useTranslation();
  const { balance, announcements, logout, user } = useAppStore();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleNav = (path: string) => {
    onNavigate(path);
    setMobileOpen(false);
  };

  return (
    <>
      <header className="topbar-glow sticky top-0 z-50 h-14 flex items-center justify-between px-4 lg:px-8">
        {/* Left: Brand + Nav */}
        <div className="flex items-center gap-6">
          <button onClick={() => handleNav('/')} className="flex items-center gap-1.5 mr-2">
            <span className="text-lg font-bold text-gradient-gold tracking-tight">1999X</span>
          </button>

          {/* Desktop nav */}
          <nav className="hidden lg:flex items-center gap-1">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => handleNav(item.path)}
                className={cn(
                  'px-3 py-1.5 rounded-lg text-[13px] font-medium transition-all duration-200 active:scale-[0.97]',
                  currentPath === item.path
                    ? 'text-primary bg-primary/8'
                    : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                )}
              >
                {t(`nav.${item.key}`)}
              </button>
            ))}
          </nav>
        </div>

        {/* Right */}
        <div className="flex items-center gap-2">
          {/* Balance pill */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full glass-surface text-xs font-semibold">
            <Wallet className="w-3 h-3 text-primary" />
            <span className="text-primary">${balance.toFixed(2)}</span>
          </div>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg hover:bg-secondary transition-colors">
            <Bell className="w-4 h-4 text-muted-foreground" />
            {announcements.length > 0 && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-primary" />
            )}
          </button>

          {/* Profile dropdown */}
          <div className="relative" ref={profileRef}>
            <button
              onClick={() => setProfileOpen(!profileOpen)}
              className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-secondary transition-colors"
            >
              <div className="w-7 h-7 rounded-full bg-primary/20 flex items-center justify-center text-[10px] font-bold text-primary">
                {user?.name.charAt(0) || 'U'}
              </div>
              <ChevronDown className={cn('w-3 h-3 text-muted-foreground transition-transform hidden sm:block', profileOpen && 'rotate-180')} />
            </button>
            {profileOpen && (
              <div className="absolute right-0 mt-2 w-48 rounded-xl glass-surface shadow-2xl shadow-black/40 py-1 z-50">
                {user && (
                  <div className="px-3 py-2 border-b border-border">
                    <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                  </div>
                )}
                <button
                  onClick={() => { logout(); setProfileOpen(false); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  {t('nav.logout')}
                </button>
              </div>
            )}
          </div>

          {/* Mobile hamburger */}
          <button onClick={() => setMobileOpen(!mobileOpen)} className="p-2 rounded-lg hover:bg-secondary transition-colors lg:hidden">
            {mobileOpen ? <X className="w-5 h-5 text-muted-foreground" /> : <Menu className="w-5 h-5 text-muted-foreground" />}
          </button>
        </div>
      </header>

      {/* Mobile nav dropdown */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 bg-black/50 z-40 lg:hidden" onClick={() => setMobileOpen(false)} />
          <div className="fixed top-14 left-0 right-0 z-40 glass-surface border-b border-border shadow-2xl shadow-black/40 lg:hidden">
            <nav className="p-3 space-y-1">
              {navItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => handleNav(item.path)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 rounded-lg text-sm font-medium transition-all',
                    currentPath === item.path
                      ? 'text-primary bg-primary/8'
                      : 'text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}
                >
                  {t(`nav.${item.key}`)}
                </button>
              ))}
            </nav>
          </div>
        </>
      )}
    </>
  );
}
