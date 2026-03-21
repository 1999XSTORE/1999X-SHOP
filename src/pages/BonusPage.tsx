import { useAppStore } from '@/lib/store';
import { Gift, Clock, Coins, Zap, Star, Trophy } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

export default function BonusPage() {
  const { bonusPoints, lastBonusClaim, claimBonus } = useAppStore();
  const [cooldown, setCooldown] = useState('');
  const [canClaim, setCanClaim] = useState(false);
  const [claimed, setClaimed] = useState(false);

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

  const progress = (bonusPoints % 100);
  const rewardsEarned = Math.floor(bonusPoints / 100);

  const handleClaim = () => {
    if (claimBonus()) {
      setClaimed(true);
      toast.success('🎉 +10 Bonus Points claimed!');
      setTimeout(() => setClaimed(false), 2000);
    } else {
      toast.error('Already claimed today — come back tomorrow');
    }
  };

  return (
    <div className="space-y-4 w-full">

      {/* Hero card */}
      <div className="glass rounded-2xl p-8 text-center border border-amber-500/15 relative overflow-hidden animate-fade-up"
        style={{ boxShadow: '0 0 60px rgba(251,191,36,0.06)' }}>
        <div className="absolute inset-0 bg-gradient-to-b from-amber-900/10 to-transparent" />
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-48 h-24 bg-amber-500/10 blur-3xl rounded-full" />

        <div className="relative">
          {/* Icon */}
          <div className="w-20 h-20 rounded-2xl mx-auto mb-5 flex items-center justify-center relative"
            style={{ background: 'linear-gradient(135deg, rgba(251,191,36,0.15), rgba(245,158,11,0.08))', border: '1px solid rgba(251,191,36,0.2)', boxShadow: '0 0 40px rgba(251,191,36,0.15)' }}>
            <Gift className={cn('w-10 h-10 text-amber-400 transition-transform duration-300', claimed && 'scale-125')} />
          </div>

          <p className="section-label text-amber-400/60 mb-2">Daily Reward</p>
          <h2 className="text-3xl font-black text-white mb-1" style={{ fontFamily: 'Syne, sans-serif' }}>Bonus Points</h2>
          <p className="text-sm text-white/30 mb-6">Claim every day · 100 pts = exclusive reward</p>

          {/* Points display */}
          <div className="inline-flex items-center gap-3 px-6 py-4 rounded-2xl mb-6 border border-amber-500/20"
            style={{ background: 'rgba(251,191,36,0.06)' }}>
            <Coins className="w-6 h-6 text-amber-400" />
            <div className="text-left">
              <p className="text-[10px] text-amber-400/50 font-semibold uppercase tracking-wider mb-0.5">Your Points</p>
              <p className="text-4xl font-black text-amber-400" style={{ fontFamily: 'Syne, sans-serif' }}>{bonusPoints}</p>
            </div>
          </div>

          {/* Progress */}
          <div className="mb-6">
            <div className="flex justify-between mb-2">
              <span className="text-[10px] text-white/30">Progress to next reward</span>
              <span className="text-[10px] text-amber-400 font-semibold">{progress}/100</span>
            </div>
            <div className="h-2.5 rounded-full bg-white/5 overflow-hidden">
              <div className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, background: 'linear-gradient(90deg,#f59e0b,#fbbf24)', boxShadow: '0 0 12px rgba(251,191,36,0.5)' }} />
            </div>
          </div>

          {/* Claim button */}
          {canClaim ? (
            <button onClick={handleClaim}
              className={cn('w-full py-4 rounded-xl font-black text-base transition-all active:scale-[0.97] relative overflow-hidden',
                claimed ? 'text-white/60' : 'text-amber-900')}
              style={claimed ? { background: 'rgba(255,255,255,0.05)' } : {
                background: 'linear-gradient(135deg,#fbbf24,#f59e0b)',
                boxShadow: '0 0 30px rgba(251,191,36,0.4), 0 4px 20px rgba(0,0,0,0.4)',
              }}>
              {claimed ? '✓ Claimed!' : '⚡ Claim +10 Points'}
            </button>
          ) : (
            <div className="w-full py-4 rounded-xl glass border border-white/10 text-center">
              <p className="text-[10px] text-white/30 flex items-center justify-center gap-1.5 mb-1">
                <Clock className="w-3 h-3" /> Next claim in
              </p>
              <p className="text-xl font-black text-white" style={{ fontFamily: 'Syne, sans-serif' }}>{cooldown}</p>
            </div>
          )}
        </div>
      </div>

      {/* Rewards grid */}
      <div className="glass rounded-2xl p-5 border border-white/8 animate-fade-up" style={{ animationDelay: '80ms' }}>
        <div className="flex items-center gap-2 mb-4">
          <Trophy className="w-4 h-4 text-amber-400" />
          <p className="text-sm font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Redeem Rewards</p>
          <span className="ml-auto text-[10px] text-white/25">{rewardsEarned} redeemed so far</span>
        </div>
        <div className="grid grid-cols-2 gap-3 mb-4">
          {[
            { icon: Zap,  label: '3-Day Key',   pts: 100, color: 'violet', desc: 'Full access key' },
            { icon: Star, label: '$1 Balance',   pts: 100, color: 'amber',  desc: 'Wallet credit'  },
          ].map(opt => (
            <div key={opt.label} className={cn('p-4 rounded-xl border text-center transition-all',
              opt.color === 'violet' ? 'bg-violet-500/5 border-violet-500/15' : 'bg-amber-500/5 border-amber-500/15')}>
              <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center mx-auto mb-2',
                opt.color === 'violet' ? 'bg-violet-500/10' : 'bg-amber-500/10')}>
                <opt.icon className={cn('w-4 h-4', opt.color === 'violet' ? 'text-violet-400' : 'text-amber-400')} />
              </div>
              <p className="text-xs font-bold text-white mb-0.5" style={{ fontFamily: 'Syne, sans-serif' }}>{opt.label}</p>
              <p className="text-[10px] text-white/30 mb-2">{opt.desc}</p>
              <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full',
                opt.color === 'violet' ? 'bg-violet-500/10 text-violet-400' : 'bg-amber-500/10 text-amber-400')}>
                {opt.pts} pts
              </span>
            </div>
          ))}
        </div>
        <button disabled={bonusPoints < 100}
          className="w-full py-3 rounded-xl text-sm font-bold text-white transition-all active:scale-[0.97] disabled:opacity-25"
          style={bonusPoints >= 100 ? { background: 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: '0 0 20px rgba(124,58,237,0.3)' } : { background: 'rgba(255,255,255,0.04)' }}>
          {bonusPoints >= 100 ? `Redeem ${Math.floor(bonusPoints / 100) * 100} pts` : `Need ${100 - (bonusPoints % 100)} more pts`}
        </button>
      </div>
    </div>
  );
}
