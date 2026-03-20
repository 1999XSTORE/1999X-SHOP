import { useTranslation } from 'react-i18next';
import { useAppStore, PRODUCTS } from '@/lib/store';
import { Wallet, Key, ShoppingBag, Gift, TrendingUp, ArrowRight, Zap, Shield, Clock, Star, Coins, Users } from 'lucide-react';
import ProductCard from '@/components/ProductCard';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function DashboardPage() {
  const { t } = useTranslation();
  const { balance, licenses, transactions, bonusPoints, lastBonusClaim, claimBonus } = useAppStore();
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
    if (claimBonus()) toast.success('+10 Bonus Points!');
    else toast.error('Already claimed today');
  };

  const stats = [
    { label: t('dashboard.balance'), value: `$${balance.toFixed(2)}`, icon: Wallet, color: 'text-primary', bg: 'bg-primary/10' },
    { label: t('dashboard.activeKeys'), value: activeKeys, icon: Key, color: 'text-emerald', bg: 'bg-emerald/10' },
    { label: t('dashboard.totalPurchases'), value: transactions.filter(t => t.status === 'approved').length, icon: ShoppingBag, color: 'text-indigo', bg: 'bg-indigo/10' },
    { label: t('dashboard.bonusPoints'), value: bonusPoints, icon: Coins, color: 'text-primary', bg: 'bg-primary/10' },
  ];

  return (
    <div className="space-y-6">
      {/* Welcome banner */}
      <div className="glass-surface rounded-2xl p-6 relative overflow-hidden animate-fade-up">
        <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/8 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        <h1 className="text-xl font-bold text-foreground mb-1">Welcome back! 👋</h1>
        <p className="text-xs text-muted-foreground mb-4">Here's an overview of your account.</p>

        {/* Daily Bonus inline */}
        <div className="flex items-center gap-3 p-3 rounded-xl bg-secondary/60 border border-border max-w-sm">
          <div className="w-10 h-10 rounded-xl bg-primary/15 flex items-center justify-center flex-shrink-0">
            <Gift className="w-5 h-5 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-[10px] text-muted-foreground font-medium">Daily Bonus</p>
            {canClaim ? (
              <button onClick={handleClaim} className="text-xs font-bold text-primary hover:underline">
                Claim +10 pts →
              </button>
            ) : (
              <p className="text-xs font-semibold text-foreground">{cooldown}</p>
            )}
          </div>
          <div className="text-right flex-shrink-0">
            <p className="text-sm font-bold text-primary">{bonusPoints}</p>
            <p className="text-[9px] text-muted-foreground">pts</p>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <div key={stat.label} className="glass-surface rounded-xl p-4 animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
            <div className="flex items-center justify-between mb-2">
              <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center', stat.bg)}>
                <stat.icon className={cn('w-4 h-4', stat.color)} />
              </div>
              <TrendingUp className="w-3 h-3 text-emerald opacity-50" />
            </div>
            <p className="text-2xl font-bold text-foreground">{stat.value}</p>
            <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Why upgrade section - attract free users */}
      <div className="glass-surface rounded-2xl p-5 animate-fade-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center gap-2 mb-4">
          <Zap className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-bold text-foreground">Why Go Premium?</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            { icon: Shield, title: 'Undetected', desc: 'Advanced anti-cheat bypass updated daily', color: 'text-emerald', bg: 'bg-emerald/8' },
            { icon: Zap, title: 'Instant Delivery', desc: 'Get your license key within seconds', color: 'text-primary', bg: 'bg-primary/8' },
            { icon: Users, title: 'VIP Community', desc: 'Access exclusive channels and support', color: 'text-indigo', bg: 'bg-indigo/8' },
          ].map((f, i) => (
            <div key={f.title} className={cn('p-4 rounded-xl border border-border', f.bg)} >
              <f.icon className={cn('w-5 h-5 mb-2', f.color)} />
              <h3 className="text-xs font-bold text-foreground mb-1">{f.title}</h3>
              <p className="text-[10px] text-muted-foreground leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Featured product CTA */}
      <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent glass-surface rounded-2xl p-5 flex items-center justify-between animate-fade-up" style={{ animationDelay: '300ms' }}>
        <div>
          <div className="flex items-center gap-1.5 mb-1">
            <Star className="w-3.5 h-3.5 text-primary fill-primary" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-wider">Featured</span>
          </div>
          <h3 className="text-sm font-bold text-foreground mb-0.5">Premium Pack — $14.99</h3>
          <p className="text-[10px] text-muted-foreground">All features unlocked. Priority support included.</p>
        </div>
        <button className="px-4 py-2.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold flex items-center gap-1.5 hover:opacity-90 transition-all active:scale-[0.97] flex-shrink-0">
          Get Now <ArrowRight className="w-3 h-3" />
        </button>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Browse Products', icon: ShoppingBag, color: 'text-primary' },
          { label: 'My Licenses', icon: Key, color: 'text-emerald' },
          { label: 'Add Balance', icon: Wallet, color: 'text-indigo' },
          { label: 'Community', icon: Users, color: 'text-primary' },
        ].map((link, i) => (
          <div key={link.label} className="glass-surface rounded-xl p-4 text-center hover:bg-secondary/40 transition-all cursor-pointer active:scale-[0.97] animate-fade-up" style={{ animationDelay: `${(i + 5) * 60}ms` }}>
            <link.icon className={cn('w-5 h-5 mx-auto mb-2', link.color)} />
            <p className="text-[10px] font-semibold text-foreground">{link.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
