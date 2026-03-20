import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import {
  LayoutDashboard, ShoppingBag, Wallet, Key, MessageCircle,
  Headphones, Gift, Megaphone, Activity, Globe, LogOut, ChevronLeft, X
} from 'lucide-react';

const navItems = [
  { key: 'dashboard', icon: LayoutDashboard, path: '/' },
  { key: 'products', icon: ShoppingBag, path: '/products' },
  { key: 'wallet', icon: Wallet, path: '/wallet' },
  { key: 'licenses', icon: Key, path: '/licenses' },
  { key: 'chat', icon: MessageCircle, path: '/chat' },
  { key: 'support', icon: Headphones, path: '/support' },
  { key: 'bonus', icon: Gift, path: '/bonus' },
  { key: 'announcements', icon: Megaphone, path: '/announcements' },
  { key: 'status', icon: Activity, path: '/status' },
];

interface SidebarProps {
  currentPath: string;
  onNavigate: (path: string) => void;
  collapsed: boolean;
  onToggle: () => void;
  mobileOpen: boolean;
  onMobileClose: () => void;
}

export default function Sidebar({ currentPath, onNavigate, collapsed, onToggle, mobileOpen, onMobileClose }: SidebarProps) {
  const { t } = useTranslation();
  const { logout, user } = useAppStore();

  return (
    <>
      {mobileOpen && (
        <div className="fixed inset-0 bg-black/60 z-40 lg:hidden" onClick={onMobileClose} />
      )}
      <aside className={cn(
        'fixed top-0 left-0 h-full z-50 flex flex-col border-r border-border bg-sidebar transition-all duration-300',
        collapsed ? 'w-[68px]' : 'w-[240px]',
        mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
      )}>
        {/* Brand */}
        <div className="flex items-center justify-between px-4 h-16 border-b border-border">
          {!collapsed && (
            <span className="text-lg font-bold text-gradient-gold tracking-tight">1999X</span>
          )}
          <button onClick={onToggle} className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground hidden lg:flex">
            <ChevronLeft className={cn('w-4 h-4 transition-transform', collapsed && 'rotate-180')} />
          </button>
          <button onClick={onMobileClose} className="p-1.5 rounded-md hover:bg-secondary transition-colors text-muted-foreground lg:hidden">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1 scrollbar-thin">
          {navItems.map((item) => {
            const active = currentPath === item.path;
            return (
              <button
                key={item.key}
                onClick={() => { onNavigate(item.path); onMobileClose(); }}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-200',
                  active
                    ? 'bg-primary/10 text-primary'
                    : 'text-sidebar-foreground hover:bg-secondary hover:text-foreground',
                  collapsed && 'justify-center px-0'
                )}
              >
                <item.icon className="w-[18px] h-[18px] flex-shrink-0" />
                {!collapsed && <span>{t(`nav.${item.key}`)}</span>}
              </button>
            );
          })}
        </nav>

        {/* User / Logout */}
        <div className="border-t border-border p-3 space-y-2">
          {user && !collapsed && (
            <div className="flex items-center gap-2 px-2">
              <div className="w-8 h-8 rounded-full bg-primary/20 flex items-center justify-center text-xs font-bold text-primary">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-medium text-foreground truncate">{user.name}</p>
                <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
          )}
          <button
            onClick={logout}
            className={cn(
              'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-destructive hover:bg-destructive/10 transition-colors',
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
