import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Gift, Clock, Coins, Zap, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function BonusPage() {
  const { t } = useTranslation();
  const { bonusPoints, lastBonusClaim, claimBonus } = useAppStore();
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

  const progress = Math.min((bonusPoints % 100) / 100 * 100, 100);

  return (
    <div className="space-y-4 w-full animate-fade-up">
      {/* Main card */}
      <div className="rounded-2xl p-8 text-center border border-white/10 bg-white/3 relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-900/15 to-transparent" />
        <div className="relative">
          <div className="w-20 h-20 rounded-2xl flex items-center justify-center mx-auto mb-5"
            style={{ background: 'linear-gradient(135deg, rgba(245,158,11,0.2), rgba(217,119,6,0.1))', boxShadow: '0 0 40px rgba(245,158,11,0.15)', border: '1px solid rgba(245,158,11,0.2)' }}>
            <Gift className="w-10 h-10 text-yellow-400" />
          </div>
          <h2 className="text-2xl font-black text-white mb-1">{t('bonus.title')}</h2>
          <p className="text-sm text-white/40 mb-6">Everyday 10 Points · 100 Points = 3 Day Key OR $1 Balance</p>

          {/* Points display */}
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl mb-6 border border-yellow-500/20"
            style={{ background: 'rgba(245,158,11,0.08)' }}>
            <Coins className="w-6 h-6 text-yellow-400" />
            <div className="text-left">
              <p className="text-[10px] text-yellow-400/60 font-semibold uppercase tracking-wider">Your Points</p>
              <p className="text-3xl font-black text-yellow-400">{bonusPoints}</p>
            </div>
          </div>

          {/* Progress to next reward */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[10px] text-white/30">Progress to reward</p>
              <p className="text-[10px] text-yellow-400 font-semibold">{bonusPoints % 100}/100 pts</p>
            </div>
            <div className="h-2 rounded-full bg-white/5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #f59e0b, #d97706)', boxShadow: '0 0 10px rgba(245,158,11,0.4)' }}
              />
            </div>
          </div>

          {canClaim ? (
            <button
              onClick={handleClaim}
              className="w-full py-4 rounded-xl font-black text-base text-white transition-all hover:opacity-90 active:scale-[0.97] relative overflow-hidden"
              style={{ background: 'linear-gradient(135deg, #f59e0b, #d97706)', boxShadow: '0 0 30px rgba(245,158,11,0.4), 0 4px 20px rgba(0,0,0,0.4)' }}
            >
              <span className="relative z-10">⚡ Claim Daily Bonus (+10 pts)</span>
            </button>
          ) : (
            <div className="w-full py-4 rounded-xl bg-white/5 border border-white/10 text-center">
              <p className="text-[10px] text-white/30 mb-1 flex items-center justify-center gap-1">
                <Clock className="w-3 h-3" /> Next claim in
              </p>
              <p className="text-lg font-bold text-white">{cooldown}</p>
            </div>
          )}
        </div>
      </div>

      {/* Convert points */}
      <div className="rounded-2xl p-5 border border-white/10 bg-white/3">
        <h3 className="text-sm font-bold text-white mb-1">{t('bonus.convert')}</h3>
        <p className="text-xs text-white/30 mb-4">100 points = 3-Day Key OR $1 wallet balance</p>

        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { icon: Zap,  label: '3-Day Key',      pts: 100, color: 'purple' },
            { icon: Star, label: '$1 Balance',      pts: 100, color: 'yellow' },
          ].map(opt => (
            <div key={opt.label}
              className={cn('p-3 rounded-xl border text-center',
                opt.color === 'purple' ? 'bg-purple-500/5 border-purple-500/15' : 'bg-yellow-500/5 border-yellow-500/15'
              )}>
              <opt.icon className={cn('w-5 h-5 mx-auto mb-1', opt.color === 'purple' ? 'text-purple-400' : 'text-yellow-400')} />
              <p className="text-xs font-bold text-white">{opt.label}</p>
              <p className={cn('text-[10px]', opt.color === 'purple' ? 'text-purple-400' : 'text-yellow-400')}>{opt.pts} pts</p>
            </div>
          ))}
        </div>

        <button disabled={bonusPoints < 100}
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.97] disabled:opacity-30"
          style={bonusPoints >= 100 ? { background: 'linear-gradient(135deg, #7c3aed, #6d28d9)' } : { background: 'rgba(255,255,255,0.05)' }}>
          Convert {Math.floor(bonusPoints / 100) * 100} pts → Reward
        </button>
      </div>
    </div>
  );
}
