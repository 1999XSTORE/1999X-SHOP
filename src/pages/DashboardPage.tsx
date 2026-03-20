import { useTranslation } from 'react-i18next';
import { useAppStore, PRODUCTS } from '@/lib/store';
import { Wallet, Key, ShoppingBag, Gift, Shield, Coins, Users, MessageCircle, Activity, ChevronRight, Clock, AlertTriangle, Zap } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

// Days left ring component
function DaysLeftRing({ daysLeft, total, color }: { daysLeft: number; total: number; color: string }) {
  const pct     = Math.min(100, (daysLeft / total) * 100);
  const radius  = 54;
  const circ    = 2 * Math.PI * radius;
  const offset  = circ - (pct / 100) * circ;
  const urgent  = daysLeft <= 3;
  const warning = daysLeft <= 7 && daysLeft > 3;

  return (
    <div className="relative flex items-center justify-center" style={{ width: 130, height: 130 }}>
      <svg width="130" height="130" style={{ transform: 'rotate(-90deg)' }}>
        {/* Track */}
        <circle cx="65" cy="65" r={radius} fill="none" stroke="rgba(255,255,255,0.06)" strokeWidth="8" />
        {/* Progress */}
        <circle
          cx="65" cy="65" r={radius} fill="none"
          stroke={urgent ? '#f87171' : warning ? '#fb923c' : color}
          strokeWidth="8" strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 1s ease', filter: `drop-shadow(0 0 6px ${urgent ? '#f87171' : warning ? '#fb923c' : color})` }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <p className={cn('text-3xl font-black', urgent ? 'text-red-400' : warning ? 'text-orange-400' : 'text-white')}>{daysLeft}</p>
        <p className="text-[9px] text-white/40 uppercase tracking-wider font-semibold">days left</p>
      </div>
    </div>
  );
}

// License countdown card
function LicenseCountdownCard({ lic, accentColor }: { lic: any; accentColor: 'purple' | 'blue' }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const i = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(i);
  }, []);

  const expiryMs  = new Date(lic.expiresAt).getTime();
  const diff      = expiryMs - now;
  const daysLeft  = Math.max(0, Math.floor(diff / 86400000));
  const hoursLeft = Math.floor((diff % 86400000) / 3600000);
  const minsLeft  = Math.floor((diff % 3600000) / 60000);
  const secsLeft  = Math.floor((diff % 60000) / 1000);
  const isExpired = diff <= 0;
  const isPurple  = accentColor === 'purple';

  // Estimate total days (assume 30-day or lifetime)
  const createdMs  = new Date(lic.lastLogin).getTime();
  const totalDays  = Math.max(30, Math.ceil((expiryMs - createdMs) / 86400000));

  const color = isPurple ? '#a78bfa' : '#60a5fa';
  const displayKey = lic.key.replace('_INTERNAL', '');

  return (
    <div className={cn(
      'rounded-2xl p-6 border bg-white/3 relative overflow-hidden',
      isPurple ? 'border-purple-500/20' : 'border-blue-500/20'
    )}
      style={{ boxShadow: isPurple ? '0 0 40px rgba(124,58,237,0.1)' : '0 0 40px rgba(59,130,246,0.1)' }}
    >
      {/* Glow blob */}
      <div className={cn('absolute top-0 right-0 w-40 h-40 rounded-full blur-3xl opacity-20',
        isPurple ? 'bg-purple-600' : 'bg-blue-600')}
        style={{ transform: 'translate(30%,-30%)' }} />

      <div className="relative flex items-center gap-6">
        {/* Ring */}
        {isExpired ? (
          <div className="w-[130px] h-[130px] rounded-full border-8 border-red-500/20 flex items-center justify-center flex-shrink-0">
            <AlertTriangle className="w-10 h-10 text-red-400" />
          </div>
        ) : (
          <div className="flex-shrink-0">
            <DaysLeftRing daysLeft={daysLeft} total={totalDays} color={color} />
          </div>
        )}

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <div className={cn('w-2 h-2 rounded-full', isExpired ? 'bg-red-400' : isPurple ? 'bg-purple-400 animate-pulse' : 'bg-blue-400 animate-pulse')} />
            <span className={cn('text-xs font-bold uppercase tracking-wider', isPurple ? 'text-purple-400' : 'text-blue-400')}>
              {lic.productName}
            </span>
          </div>

          {isExpired ? (
            <p className="text-xl font-black text-red-400 mb-2">Expired</p>
          ) : (
            <>
              {/* Big countdown */}
              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-4xl font-black text-white">{daysLeft}</span>
                <span className="text-sm text-white/40 font-semibold">days</span>
                <span className="text-xl font-bold text-white/60">{String(hoursLeft).padStart(2,'0')}:{String(minsLeft).padStart(2,'0')}:{String(secsLeft).padStart(2,'0')}</span>
              </div>
              <p className="text-[11px] text-white/30 mb-3">
                Expires {new Date(lic.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </p>
            </>
          )}

          {/* Key preview */}
          <code className={cn('text-[11px] font-mono px-2.5 py-1 rounded-lg border',
            isPurple ? 'bg-purple-500/10 border-purple-500/20 text-purple-300' : 'bg-blue-500/10 border-blue-500/20 text-blue-300')}>
            {displayKey.slice(0, 5)}···{displayKey.slice(-5)}
          </code>
        </div>
      </div>

      {/* Status bar */}
      {!isExpired && (
        <div className="mt-4 pt-4 border-t border-white/5">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-[10px] text-white/30">Subscription remaining</span>
            <span className={cn('text-[10px] font-bold', isPurple ? 'text-purple-400' : 'text-blue-400')}>{Math.round((daysLeft / totalDays) * 100)}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-white/5 overflow-hidden">
            <div className="h-full rounded-full transition-all duration-1000"
              style={{
                width: `${Math.round((daysLeft / totalDays) * 100)}%`,
                background: isPurple
                  ? 'linear-gradient(90deg,#7c3aed,#a78bfa)'
                  : 'linear-gradient(90deg,#1d4ed8,#60a5fa)',
                boxShadow: isPurple ? '0 0 8px rgba(124,58,237,0.5)' : '0 0 8px rgba(59,130,246,0.5)',
              }} />
          </div>
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { balance, licenses, transactions, bonusPoints, lastBonusClaim, claimBonus, user } = useAppStore();
  const activeKeys  = licenses.filter(l => l.status === 'active').length;
  const [cooldown, setCooldown] = useState('');
  const [canClaim, setCanClaim] = useState(false);

  useEffect(() => {
    const update = () => {
      if (!lastBonusClaim) { setCanClaim(true); setCooldown(''); return; }
      const diff = 86400000 - (Date.now() - new Date(lastBonusClaim).getTime());
      if (diff <= 0) { setCanClaim(true); setCooldown(''); return; }
      setCanClaim(false);
      const h = Math.floor(diff / 3600000), m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
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

  // Only active, non-expired licenses
  const activeLicenses = licenses.filter(l => {
    const expires = new Date(l.expiresAt).getTime();
    return expires > Date.now();
  });

  const lagLicenses = activeLicenses.filter(l => l.productId === 'keyauth-lag' || (l.productId === 'keyauth' && !l.key.endsWith('_INTERNAL')));
  const intLicenses = activeLicenses.filter(l => l.productId === 'keyauth-internal' || l.key.endsWith('_INTERNAL'));

  const stats = [
    { label: t('dashboard.balance'),        value: `$${balance.toFixed(2)}`, icon: Wallet,   color: 'text-purple-400',  bg: 'bg-purple-500/10',  border: 'border-purple-500/20' },
    { label: t('dashboard.activeKeys'),     value: activeKeys,               icon: Key,      color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
    { label: t('dashboard.totalPurchases'), value: transactions.filter(t => t.status === 'approved').length, icon: ShoppingBag, color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
    { label: t('dashboard.bonusPoints'),    value: bonusPoints,              icon: Coins,    color: 'text-yellow-400',  bg: 'bg-yellow-500/10',  border: 'border-yellow-500/20' },
  ];

  return (
    <div className="space-y-6">

      {/* Welcome */}
      <div className="rounded-2xl p-6 border border-white/10 bg-gradient-to-br from-purple-900/30 via-white/2 to-violet-900/20 relative overflow-hidden animate-fade-up">
        <div className="absolute top-0 right-0 w-48 h-48 bg-gradient-to-bl from-purple-600/15 to-transparent rounded-full -translate-y-1/2 translate-x-1/2" />
        <div className="relative flex items-center gap-3">
          {user?.avatar ? (
            <img src={user.avatar} alt={user.name} className="w-12 h-12 rounded-full ring-2 ring-purple-500/30" />
          ) : (
            <div className="w-12 h-12 rounded-full bg-purple-500/20 flex items-center justify-center text-lg font-bold text-purple-400">{user?.name?.charAt(0) || 'U'}</div>
          )}
          <div>
            <h1 className="text-xl font-bold text-white">Welcome back, {user?.name?.split(' ')[0] || 'User'} 👋</h1>
            <div className="flex items-center gap-2 mt-1">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <Shield className="w-3 h-3 text-emerald-400" />
                <span className="text-[10px] font-bold text-emerald-400">OB52 Undetected</span>
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ── Active Subscription Days Left — big modern display ── */}
      {(lagLicenses.length > 0 || intLicenses.length > 0) && (
        <div className="space-y-4 animate-fade-up" style={{ animationDelay: '80ms' }}>
          <div className="flex items-center gap-2 px-1">
            <Zap className="w-4 h-4 text-purple-400" />
            <h2 className="text-sm font-bold text-white">Active Subscriptions</h2>
            <span className="text-[10px] text-white/30 ml-auto">Live countdown</span>
          </div>
          <div className={cn('grid gap-4', (lagLicenses.length > 0 && intLicenses.length > 0) ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1')}>
            {intLicenses.map(lic => (
              <LicenseCountdownCard key={lic.id} lic={lic} accentColor="blue" />
            ))}
            {lagLicenses.map(lic => (
              <LicenseCountdownCard key={lic.id} lic={lic} accentColor="purple" />
            ))}
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((stat, i) => (
          <div key={stat.label} className={cn('rounded-xl p-4 border bg-white/3 animate-fade-up', stat.border)} style={{ animationDelay: `${i * 80}ms` }}>
            <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mb-3', stat.bg)}>
              <stat.icon className={cn('w-4 h-4', stat.color)} />
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
              <button onClick={handleClaim}
                className="mt-1 px-4 py-2 rounded-lg text-xs font-bold text-white transition-all active:scale-[0.97]"
                style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 15px rgba(245,158,11,0.3)' }}>
                Claim +10 pts
              </button>
            ) : (
              <div className="mt-1 flex items-center gap-1 text-[10px] text-white/30 justify-end">
                <Clock className="w-3 h-3" /> {cooldown}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick nav */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Products',  icon: ShoppingBag,   color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
          { label: 'Chat',      icon: MessageCircle, color: 'text-blue-400',   bg: 'bg-blue-500/10',   border: 'border-blue-500/20'   },
          { label: 'License',   icon: Key,           color: 'text-emerald-400',bg: 'bg-emerald-500/10',border: 'border-emerald-500/20' },
          { label: 'Status',    icon: Activity,      color: 'text-orange-400', bg: 'bg-orange-500/10', border: 'border-orange-500/20'  },
        ].map((link, i) => (
          <div key={link.label} className={cn('rounded-xl p-4 text-center border bg-white/3 hover:bg-white/5 transition-all cursor-pointer active:scale-[0.97] group', link.border)}
            style={{ animationDelay: `${(i + 5) * 60}ms` }}>
            <div className={cn('w-10 h-10 rounded-lg flex items-center justify-center mx-auto mb-2', link.bg)}>
              <link.icon className={cn('w-5 h-5', link.color)} />
            </div>
            <p className="text-[11px] font-semibold text-white/60 group-hover:text-white/80 transition-colors">{link.label}</p>
            <ChevronRight className="w-3 h-3 text-white/20 mx-auto mt-1" />
          </div>
        ))}
      </div>

      {/* Purchase History */}
      <div className="rounded-2xl p-5 border border-white/10 bg-white/3 animate-fade-up">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-bold text-white">Purchase History</h3>
          <span className="text-[10px] text-white/30">{transactions.length} transactions</span>
        </div>
        {transactions.length === 0 ? (
          <div className="text-center py-6">
            <ShoppingBag className="w-8 h-8 text-white/10 mx-auto mb-2" />
            <p className="text-xs text-white/30">No purchases yet</p>
          </div>
        ) : (
          <div className="space-y-2">
            {transactions.slice(0, 5).map(tx => (
              <div key={tx.id} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center text-sm">
                    {tx.method === 'bkash' ? '📱' : '₿'}
                  </div>
                  <div>
                    <p className="text-xs font-medium text-white/80">${tx.amount} via {tx.method}</p>
                    <p className="text-[10px] text-white/30">ID: {tx.transactionId}</p>
                  </div>
                </div>
                <span className={cn('text-[10px] font-semibold px-2.5 py-1 rounded-full',
                  tx.status === 'approved' ? 'bg-emerald-500/10 text-emerald-400' :
                  tx.status === 'rejected' ? 'bg-red-500/10 text-red-400' : 'bg-yellow-500/10 text-yellow-400')}>
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
