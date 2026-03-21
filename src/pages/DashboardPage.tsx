import { useAppStore, PRODUCTS } from '@/lib/store';
import { Wallet, Key, Gift, Shield, Coins, Activity, Clock, Zap, TrendingUp, Users, ArrowUpRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

function LiveCountdown({ expiresAt }: { expiresAt: string }) {
  const [t, setT] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setT(Date.now()), 1000); return () => clearInterval(i); }, []);
  const diff = new Date(expiresAt).getTime() - t;
  if (diff <= 0) return <span className="text-red-400 font-bold">Expired</span>;
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return (
    <div className="flex items-baseline gap-1.5">
      {d > 0 && <><span className="text-2xl font-black text-white" style={{ fontFamily: 'Syne, sans-serif' }}>{d}</span><span className="text-xs text-white/30">d</span></>}
      <span className="text-2xl font-black text-white" style={{ fontFamily: 'Syne, sans-serif' }}>{String(h).padStart(2,'0')}</span><span className="text-xs text-white/30">h</span>
      <span className="text-2xl font-black text-white" style={{ fontFamily: 'Syne, sans-serif' }}>{String(m).padStart(2,'0')}</span><span className="text-xs text-white/30">m</span>
      <span className="text-2xl font-black text-white/60" style={{ fontFamily: 'Syne, sans-serif' }}>{String(s).padStart(2,'0')}</span><span className="text-xs text-white/20">s</span>
    </div>
  );
}

function LicenseCard({ lic, accent }: { lic: any; accent: 'violet' | 'blue' }) {
  const isViolet = accent === 'violet';
  const displayKey = lic.key.replace('_INTERNAL', '');
  const daysLeft = Math.max(0, Math.floor((new Date(lic.expiresAt).getTime() - Date.now()) / 86400000));
  const totalDays = Math.max(30, Math.ceil((new Date(lic.expiresAt).getTime() - new Date(lic.lastLogin).getTime()) / 86400000));
  const pct = Math.min(100, (daysLeft / totalDays) * 100);

  return (
    <div className={cn(
      'glass rounded-2xl p-5 relative overflow-hidden card-hover animate-fade-up',
      isViolet ? 'border-violet-500/20' : 'border-blue-500/20'
    )} style={{ boxShadow: isViolet ? '0 0 60px rgba(124,58,237,0.07)' : '0 0 60px rgba(59,130,246,0.07)' }}>
      {/* Background glow */}
      <div className={cn('absolute -top-16 -right-16 w-48 h-48 rounded-full blur-3xl opacity-15',
        isViolet ? 'bg-violet-600' : 'bg-blue-600')} />

      <div className="relative">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className={cn('w-1.5 h-1.5 rounded-full animate-pulse', isViolet ? 'bg-violet-400' : 'bg-blue-400')} />
            <span className={cn('section-label', isViolet ? 'text-violet-400' : 'text-blue-400')}>
              {lic.productName}
            </span>
          </div>
          <span className={cn('text-[10px] font-bold px-2.5 py-1 rounded-full border',
            isViolet ? 'bg-violet-500/10 text-violet-400 border-violet-500/20' : 'bg-blue-500/10 text-blue-400 border-blue-500/20')}>
            ACTIVE
          </span>
        </div>

        {/* Countdown */}
        <LiveCountdown expiresAt={lic.expiresAt} />
        <p className="text-[11px] text-white/25 mt-1 mb-4">
          until {new Date(lic.expiresAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
        </p>

        {/* Progress bar */}
        <div className="h-1 rounded-full bg-white/5 overflow-hidden mb-3">
          <div className="h-full rounded-full transition-all duration-1000"
            style={{
              width: `${pct}%`,
              background: isViolet ? 'linear-gradient(90deg,#7c3aed,#a78bfa)' : 'linear-gradient(90deg,#1d4ed8,#60a5fa)',
              boxShadow: isViolet ? '0 0 8px rgba(124,58,237,0.6)' : '0 0 8px rgba(59,130,246,0.6)',
            }} />
        </div>

        {/* Key */}
        <code className={cn('text-[10px] font-mono px-2.5 py-1.5 rounded-lg border block truncate',
          isViolet ? 'bg-violet-500/8 border-violet-500/15 text-violet-300/70' : 'bg-blue-500/8 border-blue-500/15 text-blue-300/70')}>
          {displayKey}
        </code>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { balance, licenses, transactions, bonusPoints, lastBonusClaim, claimBonus, user } = useAppStore();
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

  const activeLicenses = licenses.filter(l => new Date(l.expiresAt).getTime() > Date.now());
  const lagLicenses = activeLicenses.filter(l => l.productId === 'keyauth-lag');
  const intLicenses = activeLicenses.filter(l => l.productId === 'keyauth-internal' || l.key.endsWith('_INTERNAL'));

  return (
    <div className="space-y-5">

      {/* Welcome hero */}
      <div className="glass rounded-2xl p-6 relative overflow-hidden animate-fade-up">
        <div className="absolute inset-0 bg-gradient-to-br from-violet-900/20 via-transparent to-transparent" />
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full blur-3xl opacity-10 bg-violet-600" style={{ transform: 'translate(30%,-30%)' }} />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            {user?.avatar
              ? <img src={user.avatar} alt="" className="w-12 h-12 rounded-xl ring-2 ring-violet-500/30 object-cover" />
              : <div className="w-12 h-12 rounded-xl bg-violet-500/20 flex items-center justify-center text-lg font-bold text-violet-300" style={{ fontFamily: 'Syne, sans-serif' }}>{user?.name?.charAt(0) || 'U'}</div>
            }
            <div>
              <p className="section-label mb-0.5">Welcome back</p>
              <h1 className="text-xl font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                {user?.name?.split(' ')[0] || 'User'} 👋
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="status-dot" />
            <span className="text-[10px] font-bold text-emerald-400">OB52 LIVE</span>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger">
        {[
          { label: 'Balance',     value: `$${balance.toFixed(2)}`, icon: Wallet,  color: 'text-violet-400', glow: 'rgba(124,58,237,0.2)',  bg: 'bg-violet-500/8', border: 'border-violet-500/15' },
          { label: 'Active Keys', value: activeLicenses.length,    icon: Key,     color: 'text-emerald-400',glow: 'rgba(52,211,153,0.2)',  bg: 'bg-emerald-500/8',border: 'border-emerald-500/15' },
          { label: 'Approved',    value: transactions.filter((t:any) => t.status === 'approved').length, icon: TrendingUp, color: 'text-blue-400', glow: 'rgba(59,130,246,0.2)', bg: 'bg-blue-500/8', border: 'border-blue-500/15' },
          { label: 'Bonus Pts',   value: bonusPoints,              icon: Coins,   color: 'text-amber-400',  glow: 'rgba(251,191,36,0.2)',  bg: 'bg-amber-500/8',  border: 'border-amber-500/15'  },
        ].map((s, i) => (
          <div key={s.label} className={cn('glass rounded-2xl p-4 border card-hover animate-fade-up', s.border)}
            style={{ animationDelay: `${i * 60}ms`, boxShadow: `0 0 30px ${s.glow}` }}>
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mb-3', s.bg)}>
              <s.icon className={cn('w-4 h-4', s.color)} />
            </div>
            <p className="text-2xl font-black text-white" style={{ fontFamily: 'Syne, sans-serif' }}>{s.value}</p>
            <p className="section-label mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Active licenses */}
      {(lagLicenses.length > 0 || intLicenses.length > 0) && (
        <div className="animate-fade-up" style={{ animationDelay: '80ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5 text-violet-400" />
            <span className="section-label text-violet-400">Active Subscriptions</span>
          </div>
          <div className={cn('grid gap-3', lagLicenses.length > 0 && intLicenses.length > 0 ? 'lg:grid-cols-2' : '')}>
            {intLicenses.map(l => <LicenseCard key={l.id} lic={l} accent="blue" />)}
            {lagLicenses.map(l => <LicenseCard key={l.id} lic={l} accent="violet" />)}
          </div>
        </div>
      )}

      {/* No license state */}
      {activeLicenses.length === 0 && (
        <div className="glass rounded-2xl p-8 text-center border-dashed border-white/10 animate-fade-up" style={{ animationDelay: '100ms' }}>
          <div className="w-14 h-14 rounded-2xl bg-violet-500/10 flex items-center justify-center mx-auto mb-4">
            <Key className="w-7 h-7 text-violet-400/40" />
          </div>
          <p className="font-semibold text-white/40 text-sm mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>No active licenses</p>
          <p className="text-xs text-white/20">Go to Shop to activate your key</p>
        </div>
      )}

      {/* Daily bonus */}
      <div className="glass rounded-2xl p-5 border border-amber-500/15 animate-fade-up" style={{ animationDelay: '140ms', boxShadow: '0 0 40px rgba(251,191,36,0.05)' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center flex-shrink-0">
              <Gift className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="text-sm font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Daily Bonus</p>
              <p className="text-[11px] text-white/30">+10 pts daily · 100 pts = reward</p>
            </div>
          </div>
          <div className="text-right flex-shrink-0 ml-4">
            <p className="text-lg font-black text-amber-400" style={{ fontFamily: 'Syne, sans-serif' }}>{bonusPoints}<span className="text-xs text-white/30 font-normal ml-1">pts</span></p>
            {canClaim ? (
              <button onClick={() => { if (claimBonus()) toast.success('🎉 +10 Bonus Points!'); }}
                className="mt-1 px-3 py-1.5 rounded-lg text-[11px] font-bold text-amber-900 transition-all active:scale-95"
                style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', boxShadow: '0 0 15px rgba(251,191,36,0.3)' }}>
                Claim Now
              </button>
            ) : (
              <p className="text-[10px] text-white/25 mt-1.5 flex items-center justify-end gap-1">
                <Clock className="w-3 h-3" />{cooldown}
              </p>
            )}
          </div>
        </div>
        {/* Points bar */}
        <div className="mt-4 h-1 rounded-full bg-white/5 overflow-hidden">
          <div className="h-full rounded-full transition-all duration-700"
            style={{ width: `${(bonusPoints % 100)}%`, background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', boxShadow: '0 0 8px rgba(251,191,36,0.5)' }} />
        </div>
        <div className="flex justify-between mt-1">
          <span className="text-[9px] text-white/20">{bonusPoints % 100}/100 to next reward</span>
          <span className="text-[9px] text-amber-400/60">{Math.floor(bonusPoints / 100)} rewards earned</span>
        </div>
      </div>

      {/* Quick links */}
      <div className="grid grid-cols-4 gap-2 stagger animate-fade-up" style={{ animationDelay: '180ms' }}>
        {[
          { label: 'Shop',    icon: Wallet,   color: 'text-violet-400', bg: 'bg-violet-500/8',  border: 'border-violet-500/15' },
          { label: 'License', icon: Key,      color: 'text-emerald-400',bg: 'bg-emerald-500/8', border: 'border-emerald-500/15' },
          { label: 'Status',  icon: Activity, color: 'text-blue-400',   bg: 'bg-blue-500/8',    border: 'border-blue-500/15' },
          { label: 'Bonus',   icon: Gift,     color: 'text-amber-400',  bg: 'bg-amber-500/8',   border: 'border-amber-500/15' },
        ].map((l, i) => (
          <div key={l.label} className={cn('glass rounded-xl p-3 text-center border card-hover cursor-pointer', l.border)}
            style={{ animationDelay: `${i * 40}ms` }}>
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center mx-auto mb-2', l.bg)}>
              <l.icon className={cn('w-4 h-4', l.color)} />
            </div>
            <p className="text-[10px] font-semibold text-white/50" style={{ fontFamily: 'Syne, sans-serif' }}>{l.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
