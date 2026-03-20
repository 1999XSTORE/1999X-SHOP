import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import {
  LayoutDashboard, ShoppingBag, Wallet, Key, MessageCircle,
  Headphones, Gift, Megaphone, Activity, LogOut, ChevronLeft, X, Zap
} from 'lucide-react';

const navItems = [
  { key: 'dashboard',     icon: LayoutDashboard, path: '/' },
  { key: 'products',      icon: ShoppingBag,     path: '/products' },
  { key: 'wallet',        icon: Wallet,          path: '/wallet' },
  { key: 'licenses',      icon: Key,             path: '/licenses' },
  { key: 'chat',          icon: MessageCircle,   path: '/chat' },
  { key: 'support',       icon: Headphones,      path: '/support' },
  { key: 'bonus',         icon: Gift,            path: '/bonus' },
  { key: 'announcements', icon: Megaphone,       path: '/announcements' },
  { key: 'panelStatus',   icon: Activity,        path: '/panel-status' },
];

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
  onLogout: () => void;
}

export default function Sidebar({ currentPath, onNavigate, collapsed, onToggle, mobileOpen, onMobileClose, onLogout }: SidebarProps) {
  const { t } = useTranslation();
  const { user } = useAppStore();

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onMobileClose} />
      )}
      <aside className={cn(
        'fixed top-0 left-0 h-full z-50 flex flex-col border-r border-white/5 bg-[#0d0d1a] transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-[240px]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}>
        {/* Brand */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-white/5">
          {!collapsed && (
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
              <span className="text-base font-bold text-white tracking-tight">1999X</span>
            </div>
          )}
          {collapsed && (
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-purple-500 to-violet-600 flex items-center justify-center mx-auto">
              <Zap className="w-4 h-4 text-white" />
            </div>
          )}
          {!collapsed && (
            <button onClick={onToggle} className="p-1.5 rounded-md hover:bg-white/5 transition-colors text-white/40 hidden lg:flex">
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {collapsed && (
            <button onClick={onToggle} className="absolute right-1 top-5 p-1 rounded-md hover:bg-white/5 transition-colors text-white/40 hidden lg:flex">
              <ChevronLeft className="w-3 h-3 rotate-180" />
            </button>
          )}
          <button onClick={onMobileClose} className="p-1.5 rounded-md hover:bg-white/5 transition-colors text-white/40 lg:hidden">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5 scrollbar-thin">
          {navItems.map((item) => {
            const active = currentPath === item.path;
            return (
              <button
                key={item.key}
                onClick={() => { onNavigate(item.path); onMobileClose(); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-purple-500/15 text-purple-400 border border-purple-500/20'
                    : 'text-white/50 hover:bg-white/5 hover:text-white/80',
                  collapsed && 'justify-center px-0'
                )}
              >
                <item.icon className={cn('w-[18px] h-[18px] flex-shrink-0', active ? 'text-purple-400' : '')} />
                {!collapsed && <span>{t(`nav.${item.key}`)}</span>}
              </button>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="border-t border-white/5 p-3 space-y-2">
          {user && !collapsed && (
            <div className="flex items-center gap-2 px-2 py-2 rounded-lg bg-white/3">
              {user.avatar ? (
                <img src={user.avatar} alt={user.name} className="w-8 h-8 rounded-full object-cover" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-purple-500/30 flex items-center justify-center text-xs font-bold text-purple-400">
                  {user.name.charAt(0)}
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-white/80 truncate">{user.name}</p>
                <p className="text-[10px] text-white/30 truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={onLogout}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-red-400 hover:bg-red-500/10 transition-colors',
              collapsed && 'justify-center px-0'
            )}
          >
            <LogOut className="w-4 h-4" />
            {!collapsed && <span>{t('nav.logout')}</span>}
          </button>
        </div>
      </aside>
    </>
  );
}
