import { useAppStore } from '@/lib/store';
import { Gift, Clock, Coins, Zap, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

export default function BonusPage() {
  const { t } = useTranslation();
  const { bonusPoints, lastBonusClaim, claimBonus } = useAppStore();
  const [cooldown, setCooldown] = useState('');
  const [canClaim, setCanClaim] = useState(false);
  const [pulse, setPulse] = useState(false);

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

  const progress = bonusPoints % 100;
  const rewardsEarned = Math.floor(bonusPoints / 100);

  const handleClaim = () => {
    if (claimBonus()) {
      toast.success('🎉 +10 Bonus Points!');
      setPulse(true);
      setTimeout(() => setPulse(false), 600);
    } else {
      toast.error('Already claimed today');
    }
  };

  return (
    <div className="space-y-4 max-w-lg mx-auto">

      {/* Main card */}
      <div className="card card-amber rounded-3xl p-8 text-center relative overflow-hidden anim-fade-up"
        style={{ boxShadow: '0 0 80px rgba(245,158,11,0.08)' }}>
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(245,158,11,0.1) 0%, transparent 70%)' }} />

        <div className="relative">
          <div className={cn('w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5 transition-transform duration-300', pulse && 'scale-110')}
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))', border: '1px solid rgba(245,158,11,0.25)', boxShadow: '0 0 40px rgba(245,158,11,0.2)' }}>
            <Gift className="w-10 h-10 text-amber-400" />
          </div>

          <p className="label text-amber-400/60 mb-2">{t('bonus.subtitle')}</p>
          <h2 className="text-3xl font-bold text-white font-display mb-6">{t('bonus.title')}</h2>

          {/* Points */}
          <div className="inline-flex items-center gap-3 px-6 py-3.5 rounded-2xl mb-6"
            style={{ background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Coins className="w-6 h-6 text-amber-400" />
            <div className="text-left">
              <p className="label text-amber-400/50 mb-0.5">{t('bonus.yourPoints')}</p>
              <p className="text-4xl font-bold text-amber-400 font-display">{bonusPoints}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="label">{t('bonus.progressLabel')}</span>
              <span className="text-xs text-amber-400 font-semibold">{progress}/100</span>
            </div>
            <div className="progress-bar" style={{ height: 6 }}>
              <div className="progress-fill" style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', boxShadow: '0 0 12px rgba(245,158,11,0.6)' }} />
            </div>
          </div>

          {/* Claim */}
          {canClaim ? (
            <button onClick={handleClaim}
              className="btn btn-primary w-full text-amber-900 font-bold"
              style={{ background: 'linear-gradient(135deg,#fbbf24,#f59e0b)', boxShadow: '0 0 30px rgba(245,158,11,0.4)' }}>
              {t('bonus.claim')}
            </button>
          ) : (
            <div className="card rounded-xl py-4 px-5 text-center">
              <p className="label flex items-center justify-center gap-1.5 mb-1"><Clock className="w-3 h-3" />{t('bonus.nextClaim')}</p>
              <p className="text-xl font-bold text-white font-display font-mono-custom">{cooldown}</p>
            </div>
          )}
        </div>
      </div>

      {/* Redeem card */}
      <div className="card rounded-2xl p-5 anim-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-white font-display text-sm">{t('bonus.redeem')}</p>
          <span className="label">{rewardsEarned} {t('bonus.redeemed')}</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { icon: Zap,  label: t('bonus.key3Day'),  pts: 100, desc: t('bonus.fullAccess'),    color: 'purple' },
            { icon: Star, label: t('bonus.balance1'), pts: 100, desc: t('bonus.walletCredit'),  color: 'amber'  },
          ].map(opt => (
            <div key={opt.label}
              className={cn('card rounded-xl p-4 text-center', opt.color === 'purple' ? 'card-purple' : 'card-amber')}>
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2', opt.color === 'purple' ? 'bg-purple-500/10' : 'bg-amber-500/10')}>
                <opt.icon className={cn('w-4 h-4', opt.color === 'purple' ? 'text-purple-400' : 'text-amber-400')} />
              </div>
              <p className="text-sm font-semibold text-white font-display mb-0.5">{opt.label}</p>
              <p className="text-[11px] text-white/30 mb-2">{opt.desc}</p>
              <span className={cn('tag', opt.color === 'purple' ? 'tag-purple' : 'tag-amber')}>{opt.pts} pts</span>
            </div>
          ))}
        </div>
        <button disabled={bonusPoints < 100}
          className="btn btn-primary w-full disabled:opacity-25"
          style={bonusPoints >= 100 ? {} : { background: 'rgba(255,255,255,0.05)', boxShadow: 'none', color: 'rgba(255,255,255,0.3)' }}>
          {bonusPoints >= 100
            ? `${t('bonus.redeemBtn').replace('pts', '')} ${Math.floor(bonusPoints / 100) * 100} pts`
            : `${100 - progress} ${t('bonus.needMore')}`}
        </button>
      </div>
    </div>
  );
}
