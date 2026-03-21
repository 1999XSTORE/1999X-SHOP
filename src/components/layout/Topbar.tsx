import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Bell, Wallet, Menu, X, LogOut, Globe, Zap } from 'lucide-react';
import { useState, useRef, useEffect } from 'react';
import { cn } from '@/lib/utils';

const navItems = [
  { key: 'dashboard',   path: '/',             label: 'Home' },
  { key: 'licenses',    path: '/licenses',     label: 'License' },
  { key: 'chat',        path: '/chat',         label: 'Chat' },
  { key: 'wallet',      path: '/wallet',       label: 'Shop' },
  { key: 'bonus',       path: '/bonus',        label: 'Bonus' },
  { key: 'panelStatus', path: '/panel-status', label: 'Status' },
];

const LANGUAGES = [
  { code: 'en', label: 'English',     flag: '🇬🇧' },
  { code: 'ar', label: 'العربية',    flag: '🇸🇦' },
  { code: 'bn', label: 'বাংলা',      flag: '🇧🇩' },
  { code: 'th', label: 'ไทย',        flag: '🇹🇭' },
  { code: 'vi', label: 'Tiếng Việt', flag: '🇻🇳' },
  { code: 'es', label: 'Español',    flag: '🇪🇸' },
  { code: 'pt', label: 'Português',  flag: '🇧🇷' },
  { code: 'hi', label: 'हिन्दी',     flag: '🇮🇳' },
  { code: 'fr', label: 'Français',   flag: '🇫🇷' },
  { code: 'de', label: 'Deutsch',    flag: '🇩🇪' },
  { code: 'ja', label: '日本語',     flag: '🇯🇵' },
  { code: 'ko', label: '한국어',     flag: '🇰🇷' },
  { code: 'zh', label: '中文',       flag: '🇨🇳' },
  { code: 'ru', label: 'Русский',    flag: '🇷🇺' },
  { code: 'tr', label: 'Türkçe',     flag: '🇹🇷' },
];

interface TopbarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  onLogout: () => void;
}

export default function Topbar({ currentPath, onNavigate, onLogout }: TopbarProps) {
  const { i18n } = useTranslation();
  const { balance, user } = useAppStore();
  const [mobileOpen, setMobileOpen]   = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [langOpen, setLangOpen]       = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);
  const langRef    = useRef<HTMLDivElement>(null);

  const currentLang = LANGUAGES.find(l => l.code === i18n.language) || LANGUAGES[0];

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) setProfileOpen(false);
      if (langRef.current    && !langRef.current.contains(e.target as Node))    setLangOpen(false);
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
      {/* Floating navbar wrapper — fixed, centered */}
      <div className="fixed top-4 left-0 right-0 z-50 flex justify-center px-4">
        <nav
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl border border-white/10 shadow-2xl shadow-black/40"
          style={{
            background: 'rgba(10, 10, 20, 0.65)',
            backdropFilter: 'blur(20px)',
            WebkitBackdropFilter: 'blur(20px)',
            maxWidth: '1200px',
            width: '100%',
          }}
        >
          {/* Logo */}
          <button
            onClick={() => handleNav('/')}
            className="flex items-center gap-1.5 mr-3 flex-shrink-0"
          >
            <div className="w-7 h-7 rounded-lg flex items-center justify-center"
              style={{ background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' }}>
              <Zap className="w-4 h-4 text-white" />
            </div>
            <span className="text-sm font-bold text-white hidden sm:block">1999X</span>
          </button>

          {/* Desktop nav links — centered */}
          <div className="hidden lg:flex items-center gap-0.5 flex-1 justify-center">
            {navItems.map(item => (
              <button
                key={item.key}
                onClick={() => handleNav(item.path)}
                className={cn(
                  'px-3 py-1.5 rounded-xl text-[13px] font-medium transition-all duration-200',
                  currentPath === item.path
                    ? 'text-white bg-white/10'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                )}
              >
                {item.label}
              </button>
            ))}
          </div>

          {/* Right side controls */}
          <div className="flex items-center gap-1.5 ml-auto flex-shrink-0">

            {/* Balance */}
            <button
              onClick={() => handleNav('/wallet')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-purple-500/20 bg-purple-500/10 text-xs font-semibold text-purple-300 hover:bg-purple-500/15 transition-colors"
            >
              <Wallet className="w-3 h-3" />
              ${balance.toFixed(2)}
            </button>

            {/* Language picker */}
            <div className="relative" ref={langRef}>
              <button
                onClick={() => setLangOpen(!langOpen)}
                className="p-2 rounded-xl hover:bg-white/5 transition-colors text-white/40 hover:text-white/70"
                title="Language"
              >
                <Globe className="w-4 h-4" />
              </button>
              {langOpen && (
                <div className="absolute right-0 top-full mt-2 w-44 rounded-2xl border border-white/10 shadow-2xl shadow-black/60 py-1 z-50 overflow-hidden"
                  style={{ background: 'rgba(10,10,20,0.95)', backdropFilter: 'blur(20px)' }}>
                  <div className="px-3 py-2 border-b border-white/5">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider font-semibold">Language</p>
                  </div>
                  <div className="max-h-48 overflow-y-auto">
                    {LANGUAGES.map(lang => (
                      <button
                        key={lang.code}
                        onClick={() => { i18n.changeLanguage(lang.code); setLangOpen(false); }}
                        className={cn(
                          'w-full flex items-center gap-2 px-3 py-2 text-xs transition-colors hover:bg-white/5',
                          lang.code === i18n.language ? 'text-purple-400 font-semibold' : 'text-white/60'
                        )}
                      >
                        <span>{lang.flag}</span>
                        <span>{lang.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Profile */}
            <div className="relative" ref={profileRef}>
              <button
                onClick={() => setProfileOpen(!profileOpen)}
                className="flex items-center gap-1.5 p-1 rounded-xl hover:bg-white/5 transition-colors"
              >
                <div className="relative">
                  {user?.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-7 h-7 rounded-full object-cover ring-1 ring-purple-500/30" />
                  ) : (
                    <div className="w-7 h-7 rounded-full bg-purple-500/20 flex items-center justify-center text-[10px] font-bold text-purple-400">
                      {user?.name?.charAt(0) || 'U'}
                    </div>
                  )}
                  {user?.role === 'admin' && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-red-500 border border-[#0a0a14] text-[6px] text-white flex items-center justify-center font-black">A</span>
                  )}
                  {user?.role === 'support' && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-blue-500 border border-[#0a0a14] text-[6px] text-white flex items-center justify-center font-black">S</span>
                  )}
                </div>
              </button>
              {profileOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-white/10 shadow-2xl shadow-black/60 py-1 z-50"
                  style={{ background: 'rgba(10,10,20,0.95)', backdropFilter: 'blur(20px)' }}>
                  {user && (
                    <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                      {user.avatar ? (
                        <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full" />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-purple-500/20 flex items-center justify-center text-xs font-bold text-purple-400">
                          {user.name.charAt(0)}
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-white truncate">{user.name}</p>
                        <p className="text-[10px] truncate font-semibold" style={{color: user.role === 'admin' ? '#f87171' : user.role === 'support' ? '#60a5fa' : 'rgba(255,255,255,0.3)'}}>
                          {user.role === 'admin' ? '👑 Administrator' : user.role === 'support' ? '🛡 Support Staff' : user.email}
                        </p>
                      </div>
                    </div>
                  )}
                  <button
                    onClick={() => { onLogout(); setProfileOpen(false); }}
                    className="w-full flex items-center gap-2 px-4 py-2.5 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    Sign Out
                  </button>
                </div>
              )}
            </div>

            {/* Mobile hamburger */}
            <button
              onClick={() => setMobileOpen(!mobileOpen)}
              className="p-2 rounded-xl hover:bg-white/5 transition-colors lg:hidden"
            >
              {mobileOpen
                ? <X className="w-4 h-4 text-white/60" />
                : <Menu className="w-4 h-4 text-white/60" />}
            </button>
          </div>
        </nav>
      </div>

      {/* Mobile dropdown — slides down from navbar */}
      {mobileOpen && (
        <>
          <div className="fixed inset-0 z-40 bg-black/50" onClick={() => setMobileOpen(false)} />
          <div className="fixed top-20 left-4 right-4 z-40 rounded-2xl border border-white/10 p-3 shadow-2xl shadow-black/60"
            style={{ background: 'rgba(10,10,20,0.96)', backdropFilter: 'blur(20px)' }}>

            {/* Balance on mobile */}
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-white/5">
              <span className="text-xs text-white/40">Balance</span>
              <span className="text-sm font-bold text-purple-400">${balance.toFixed(2)}</span>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              {navItems.map(item => (
                <button
                  key={item.key}
                  onClick={() => handleNav(item.path)}
                  className={cn(
                    'px-3 py-2.5 rounded-xl text-sm font-medium text-left transition-all',
                    currentPath === item.path
                      ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                      : 'text-white/50 hover:bg-white/5 hover:text-white/80'
                  )}
                >
                  {item.label}
                </button>
              ))}
            </div>

            <button
              onClick={() => { onLogout(); setMobileOpen(false); }}
              className="w-full mt-3 pt-3 border-t border-white/5 flex items-center gap-2 px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 rounded-xl transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Sign Out
            </button>
          </div>
        </>
      )}
    </>
  );
}
