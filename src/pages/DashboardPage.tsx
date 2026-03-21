import { useAppStore } from '@/lib/store';
import { Wallet, Key, Gift, Activity, Clock, Zap, TrendingUp, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

function Countdown({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return <span className="text-red-400 font-bold text-sm">Expired</span>;
  const d = Math.floor(diff / 86400000);
  const h = String(Math.floor((diff % 86400000) / 3600000)).padStart(2,'0');
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2,'0');
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2,'0');
  return (
    <div className="flex items-baseline gap-1 font-mono-custom">
      {d > 0 && <><span className="text-3xl font-bold text-white">{d}</span><span className="text-xs text-white/30 mr-1">d</span></>}
      <span className="text-3xl font-bold text-white">{h}</span><span className="text-xs text-white/25">:</span>
      <span className="text-3xl font-bold text-white">{m}</span><span className="text-xs text-white/25">:</span>
      <span className="text-3xl font-bold text-white/50">{s}</span>
    </div>
  );
}

function LicenseRow({ lic, color }: { lic: any; color: 'purple' | 'blue' }) {
  const isPurple = color === 'purple';
  const key = lic.key.replace('_INTERNAL', '');
  const daysLeft = Math.max(0, Math.floor((new Date(lic.expiresAt).getTime() - Date.now()) / 86400000));
  const totalDays = Math.max(30, Math.ceil((new Date(lic.expiresAt).getTime() - new Date(lic.lastLogin).getTime()) / 86400000));
  const pct = Math.min(100, (daysLeft / totalDays) * 100);

  return (
    <div className={cn('card rounded-2xl p-5 anim-fade-up', isPurple ? 'card-purple' : 'card-blue')}
      style={{ boxShadow: isPurple ? '0 0 40px rgba(99,50,220,0.08)' : '0 0 40px rgba(59,130,246,0.08)' }}>
      <div className="flex items-start justify-between mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className={cn('dot-live', isPurple ? '' : 'bg-blue-400')} style={isPurple ? {} : { background: '#60a5fa', boxShadow: '0 0 6px rgba(96,165,250,0.6)' }} />
            <span className={cn('label', isPurple ? 'text-purple-400' : 'text-blue-400')}>{lic.productName}</span>
          </div>
          <Countdown expiresAt={lic.expiresAt} />
        </div>
        <span className={cn('tag', isPurple ? 'tag-purple' : 'tag-blue')}>ACTIVE</span>
      </div>

      <div className="progress-bar mb-2">
        <div className="progress-fill" style={{
          width: `${pct}%`,
          background: isPurple ? 'linear-gradient(90deg,#6332dc,#a78bfa)' : 'linear-gradient(90deg,#1d4ed8,#60a5fa)',
          boxShadow: isPurple ? '0 0 10px rgba(99,50,220,0.6)' : '0 0 10px rgba(59,130,246,0.6)',
        }} />
      </div>

      <div className="flex items-center justify-between">
        <code className="font-mono-custom text-[11px] text-white/25 truncate max-w-[180px]">{key}</code>
        <span className="text-[11px] text-white/30">{daysLeft}d left</span>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { balance, licenses, transactions, bonusPoints, lastBonusClaim, claimBonus, user } = useAppStore();
  const [cooldown, setCooldown] = useState('');
  const [canClaim, setCanClaim] = useState(false);

  useEffect(() => {
    const update = () => {
      if (!lastBonusClaim) { setCanClaim(true); return; }
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
  const lagLicenses    = activeLicenses.filter(l => l.productId === 'keyauth-lag');
  const intLicenses    = activeLicenses.filter(l => l.productId === 'keyauth-internal' || l.key.endsWith('_INTERNAL'));
  const approvedCount  = (transactions as any[]).filter((t:any) => t.status === 'approved').length;

  return (
    <div className="space-y-6">

      {/* ── Hero welcome ── */}
      <div className="card rounded-3xl p-7 relative overflow-hidden anim-fade-up"
        style={{ background: 'linear-gradient(135deg, rgba(99,50,220,0.12) 0%, rgba(255,255,255,0.025) 100%)' }}>
        {/* Decorative circle */}
        <div className="absolute -right-20 -top-20 w-72 h-72 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #6332dc, transparent)' }} />
        <div className="absolute right-6 top-6 opacity-5 anim-spin-slow">
          <svg width="80" height="80" viewBox="0 0 80 80"><circle cx="40" cy="40" r="35" fill="none" stroke="white" strokeWidth="1" strokeDasharray="4 4" /></svg>
        </div>

        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            {user?.avatar
              ? <img src={user.avatar} className="w-14 h-14 rounded-2xl object-cover" style={{ border: '2px solid rgba(99,50,220,0.4)' }} />
              : <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-2xl font-bold text-white" style={{ background: 'linear-gradient(135deg,#6332dc,#4c1d95)' }}>{user?.name?.charAt(0) || 'U'}</div>
            }
            <div>
              <p className="label mb-1">{t('dashboard.welcome')}</p>
              <h1 className="text-2xl font-bold text-white font-display">{user?.name?.split(' ')[0] || 'User'} 👋</h1>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-xl" style={{ background: 'rgba(52,211,153,0.1)', border: '1px solid rgba(52,211,153,0.2)' }}>
            <div className="dot-live" />
            <span className="text-xs font-semibold text-emerald-400">OB52 Undetected</span>
          </div>
        </div>
      </div>

      {/* ── Stats ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 stagger-children">
        {[
          { label: t('dashboard.balance'),     value: `$${balance.toFixed(2)}`, icon: Wallet,      color: 'purple' },
          { label: t('dashboard.activeKeys'),  value: activeLicenses.length,    icon: Key,         color: 'blue'   },
          { label: t('dashboard.approved'),    value: approvedCount,            icon: TrendingUp,  color: 'emerald'},
          { label: t('dashboard.bonusPoints'), value: bonusPoints,              icon: Gift,        color: 'amber'  },
        ].map((s, i) => (
          <div key={s.label}
            className={cn('card card-lift rounded-2xl p-5 anim-fade-up', `card-${s.color === 'emerald' ? 'emerald' : s.color === 'amber' ? 'amber' : s.color === 'blue' ? 'blue' : 'purple'}`)}
            style={{ animationDelay: `${i * 55}ms` }}>
            <s.icon className={cn('w-5 h-5 mb-3', s.color === 'purple' ? 'text-purple-400' : s.color === 'blue' ? 'text-blue-400' : s.color === 'emerald' ? 'text-emerald-400' : 'text-amber-400')} />
            <p className="text-2xl font-bold text-white font-display">{s.value}</p>
            <p className="label mt-1">{s.label}</p>
          </div>
        ))}
      </div>

      {/* ── Active licenses ── */}
      {activeLicenses.length > 0 && (
        <div className="anim-fade-up" style={{ animationDelay: '80ms' }}>
          <p className="label text-purple-400 mb-3">{t('dashboard.activeSubscriptions')}</p>
          <div className={cn('grid gap-3', intLicenses.length > 0 && lagLicenses.length > 0 ? 'lg:grid-cols-2' : '')}>
            {intLicenses.map(l => <LicenseRow key={l.id} lic={l} color="blue" />)}
            {lagLicenses.map(l => <LicenseRow key={l.id} lic={l} color="purple" />)}
          </div>
        </div>
      )}

      {activeLicenses.length === 0 && (
        <div className="card rounded-2xl p-10 text-center anim-fade-up" style={{ borderStyle: 'dashed', animationDelay: '80ms' }}>
          <Key className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="font-semibold text-white/30 font-display">{t('dashboard.noLicense')}</p>
          <p className="text-sm text-white/15 mt-1">{t('dashboard.noLicenseDesc')}</p>
        </div>
      )}

      {/* ── Daily bonus ── */}
      <div className="card card-amber rounded-2xl p-5 anim-fade-up" style={{ animationDelay: '130ms' }}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.12)', border: '1px solid rgba(245,158,11,0.2)' }}>
              <Gift className="w-5 h-5 text-amber-400" />
            </div>
            <div>
              <p className="font-semibold text-white font-display text-sm">{t('dashboard.dailyBonus')}</p>
              <p className="text-xs text-white/30 mt-0.5">{t('dashboard.dailyBonusDesc')}</p>
            </div>
          </div>
          <div className="flex-shrink-0 ml-4 text-right">
            <p className="text-xl font-bold text-amber-400 font-display">{bonusPoints}<span className="text-xs text-white/25 font-normal ml-1">pts</span></p>
            {canClaim ? (
              <button onClick={() => { if (claimBonus()) toast.success('🎉 +10 Bonus Points!'); }}
                className="mt-1.5 btn btn-primary text-xs py-1.5 px-3" style={{ fontSize: 12 }}>
                {t('dashboard.claimNow')}
              </button>
            ) : (
              <p className="text-[10px] text-white/25 mt-1.5 flex items-center justify-end gap-1">
                <Clock className="w-3 h-3" />{cooldown}
              </p>
            )}
          </div>
        </div>
        <div className="progress-bar mt-4">
          <div className="progress-fill" style={{ width: `${bonusPoints % 100}%`, background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', boxShadow: '0 0 10px rgba(245,158,11,0.5)' }} />
        </div>
      </div>
    </div>
  );
}
