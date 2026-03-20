import { useTranslation } from 'react-i18next';
import { useAppStore, PRODUCTS } from '@/lib/store';
import { Wallet, Key, ShoppingBag, Gift, ArrowRight, Zap, Shield, Clock, Coins, Users, MessageCircle, Activity, Star, ChevronRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { balance, licenses, transactions, bonusPoints, lastBonusClaim, claimBonus, user } = useAppStore();
  const activeKeys = licenses.filter(l => l.status === 'active').length;
  const [cooldown, setCooldown] = useState('');
  const [canClaim, setCanClaim] = useState(false);

  useEffect(() => {
    const update = () => {
      if (!lastBonusClaim) { setCanClaim(true); setCooldown(''); return; }
      const diff = 86400000 - (Date.now() - new Date(lastBonusClaim).getTime());
      if (diff <= 0) { setCanClaim(true); setCooldown(''); return; }
      setCanClaim(false);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCooldown(`${h}h ${m}m ${s}s`);
    };
    update();
    const i = setInterval(update, 1000);
    return () => clearInterval(i);
  }, [lastBonusClaim]);

  const handleClaim = () => {
    if (claimBonus()) toast.success('🎉 +10 Bonus Points!');
    else toast.error('Already claimed today');
  };

  const stats = [
    { label: t('dashboard.balance'),       value: `$${balance.toFixed(2)}`, icon: Wallet,   color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
    { label: t('dashboard.activeKeys'),    value: activeKeys,                icon: Key,      color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: t('dashboard.totalPurchases'),value: transactions.filter(t => t.status === 'approved').length, icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: t('dashboard.bonusPoints'),   value: bonusPoints,               icon: Coins,    color: 'text-yellow-400', bg: 'bg-yellow-500/10', border: 'border-yellow-500/20' },
  ];

  // Purchase history from transactions
  const purchaseHistory = transactions.slice(0, 5);

  return (
    <div className="space-y-6">
      {/* Welcome Banner */}
      <div className="rounded-2xl p-6 border border-white/10 bg-gradient-to-br from-purple-900/30 via-white/2 to-violet-900/20 relative overflow-hidden animate-fade-up">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-purple-600/15 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-violet-600/10 to-transparent rounded-full translate-y-1/2 -translate-x-1/2" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-1">
            {user?.avatar ? (
              <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full ring-2 ring-purple-500/30" />
            ) : (
              <div className="w-10 h-10 rounded-full bg-purple-500/20 flex items-center justify-center text-sm font-bold text-purple-400">
                {user?.name?.charAt(0) || 'U'}
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-white">Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋</h1>
              <p className="text-xs text-white/40">Here's your account overview</p>
            </div>
          </div>

          {/* OB52 badge */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 mt-4">
            <Shield className="w-3.5 h-3.5 text-emerald-400" />
            <span className="text-xs font-bold text-emerald-400">OB52 Undetected</span>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={cn('rounded-xl p-4 border bg-white/3 animate-fade-up', stat.border)}
            style={{ animationDelay: `${i * 80}ms` }}
          >
            <div className="flex items-center justify-between mb-3">
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center', stat.bg)}>
                <stat.icon className={cn('w-4 h-4', stat.color)} />
              </div>
            </div>
            <p className="text-2xl font-bold text-white">{stat.value}</p>
            <p className="text-[10px] text-white/40 mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Daily Bonus */}
      <div className="rounded-2xl p-5 border border-white/10 bg-white/3 animate-fade-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-yellow-500/10 border border-yellow-500/20 flex items-center justify-center">
              <Gift className="w-6 h-6 text-yellow-400" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Daily Bonus</h3>
              <p className="text-[11px] text-white/40">Everyday 10 Points · 100 Points = 3 Day Key OR $1 Balance</p>
            </div>
          </div>
          <div className="text-right">
            <p className="text-lg font-bold text-yellow-400">{bonusPoints} <span className="text-xs text-white/30">pts</span></p>
            {canClaim ? (
              <button
                onClick={handleClaim}
                className="mt-1 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 15px rgba(245,158,11,0.3)' }}
              >
                Claim +10 pts
              </button>
            ) : (
              <div className="mt-1 flex items-center gap-1 text-[10px] text-white/30">
                <Clock className="w-3 h-3" />
                {cooldown}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Products',  icon: ShoppingBag,  color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', path: '/products' },
          { label: 'Chat',      icon: MessageCircle, color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20',   path: '/chat' },
          { label: 'License',   icon: Key,           color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', path: '/licenses' },
          { label: 'Status',    icon: Activity,      color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20', path: '/panel-status' },
        ].map((link, i) => (
          <div
            key={link.label}
            className={cn('rounded-xl p-4 text-center border bg-white/3 hover:bg-white/5 transition-all cursor-pointer active:scale-[0.97] animate-fade-up group', link.border)}
            style={{ animationDelay: `${(i + 5) * 60}ms` }}
          >
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2', link.bg)}>
              <link.icon className={cn('w-5 h-5', link.color)} />
            </div>
            <p className="text-[11px] font-semibold text-white/60 group-hover:text-white/80 transition-colors">{link.label}</p>
            <ChevronRight className="w-3 h-3 text-white/20 mx-auto mt-1 group-hover:text-white/40 transition-colors" />
          </div>
        ))}
      </div>

      {/* Purchase History */}
      <div className="rounded-2xl p-5 border border-white/10 bg-white/3 animate-fade-up" style={{ animationDelay: '360ms' }}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Purchase History</h3>
          <span className="text-[10px] text-white/30">{transactions.length} transactions</span>
        </div>
        {purchaseHistory.length === 0 ? (
          <div className="text-center py-6">
            <ShoppingBag className="w-8 h-8 text-white/10 mx-auto mb-2" />
            <p className="text-xs text-white/30">No purchases yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {purchaseHistory.map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm">
                    {tx.method === 'bkash' ? '📱' : tx.method === 'binance' ? '₿' : '💳'}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white/80">${tx.amount} via {tx.method}</p>
                    <p className="text-[10px] text-white/30">ID: {tx.transactionId}</p>
                  </div>
                </div>
                <span className={cn('text-[10px] font-semibold px-2 py-1 rounded-full',
                  tx.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                  tx.status === 'rejected' ? 'bg-red-500/10 text-red-400' :
                  'bg-yellow-500/10 text-yellow-400'
                )}>
                  {tx.status}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
