import { useState, useEffect } from 'react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Zap, Gift, Flame, Star, Clock } from 'lucide-react';
import RewardModal from './RewardModal';

function useNextClaim(lastBonusClaim: string | null) {
  const calc = () => {
    if (!lastBonusClaim) return null;
    const next = new Date(lastBonusClaim).getTime() + 86400000;
    const diff = next - Date.now();
    if (diff <= 0) return null;
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    return `${String(h).padStart(2,'0')}:${String(m).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
  };
  const [t, setT] = useState(calc);
  useEffect(() => {
    const id = setInterval(() => setT(calc()), 1000);
    return () => clearInterval(id);
  }, [lastBonusClaim]);
  return t;
}

export default function BonusPage() {
  const { bonusPoints, lastBonusClaim, claimBonus, claimStreak } = useAppStore();
  const [claiming, setClaiming] = useState(false);
  const [rewardOpen, setRewardOpen] = useState(false);
  const nextClaim = useNextClaim(lastBonusClaim);

  const canClaim = !nextClaim;
  const progress = Math.min((bonusPoints % 100) / 100, 1);
  const canRedeem = bonusPoints >= 100;

  const handleClaim = async () => {
    if (!canClaim || claiming) return;
    setClaiming(true);
    await new Promise(r => setTimeout(r, 700));
    const ok = claimBonus();
    setClaiming(false);
    if (ok) {
      toast.success('+10 points claimed! 🎉');
    } else {
      toast.error('Already claimed today. Come back tomorrow!');
    }
  };

  return (
    <div className="max-w-xl mx-auto px-4 py-8 space-y-6">
      <RewardModal open={rewardOpen} onClose={() => setRewardOpen(false)} />

      {/* Header */}
      <div className="text-center mb-2">
        <h1 className="text-3xl font-black mb-2" style={{ color: 'rgba(255,255,255,0.95)' }}>Bonus Points</h1>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Claim every day · 100 pts = $3 reward</p>
      </div>

      {/* Points + Streak */}
      <div className="grid grid-cols-2 gap-3">
        {/* Points card */}
        <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(139,92,246,0.08)', border: '1px solid rgba(139,92,246,0.22)', boxShadow: '0 0 30px rgba(109,40,217,0.08)' }}>
          <Star className="w-5 h-5 mx-auto mb-2" style={{ color: '#a78bfa' }} />
          <div className="text-4xl font-black mb-1" style={{ color: '#a78bfa' }}>{bonusPoints}</div>
          <div className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>Your Points</div>
        </div>
        {/* Streak card */}
        <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(251,191,36,0.07)', border: '1px solid rgba(251,191,36,0.2)' }}>
          <Flame className="w-5 h-5 mx-auto mb-2" style={{ color: '#fbbf24' }} />
          <div className="text-4xl font-black mb-1" style={{ color: '#fbbf24' }}>{claimStreak ?? 0}</div>
          <div className="text-xs uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>Day Streak</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold" style={{ color: 'rgba(255,255,255,0.6)' }}>Progress to reward</span>
          <span className="text-sm font-bold" style={{ color: canRedeem ? '#10e898' : '#a78bfa' }}>{Math.min(bonusPoints, 100)} / 100 pts</span>
        </div>
        <div className="h-3 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.07)' }}>
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(bonusPoints, 100)}%`,
              background: canRedeem
                ? 'linear-gradient(90deg, #10e898, #34d399)'
                : 'linear-gradient(90deg, #6d28d9, #8b5cf6, #a78bfa)',
              boxShadow: canRedeem ? '0 0 12px rgba(16,232,152,0.5)' : '0 0 12px rgba(109,40,217,0.5)',
            }}
          />
        </div>
        {bonusPoints < 100 && (
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.3)' }}>{100 - Math.min(bonusPoints, 100)} more pts to redeem</p>
        )}
      </div>

      {/* Claim button */}
      <div className="relative">
        {canClaim && (
          <>
            {/* Outer glow ring animation */}
            <div className="absolute inset-0 rounded-2xl animate-ping opacity-20 pointer-events-none" style={{ background: 'linear-gradient(135deg, #8b5cf6, #10e898)', borderRadius: 16 }} />
            <div className="absolute -inset-1 rounded-2xl opacity-30 blur-lg pointer-events-none" style={{ background: 'linear-gradient(135deg, #8b5cf6, #10e898)' }} />
          </>
        )}
        <button
          onClick={handleClaim}
          disabled={!canClaim || claiming}
          className="relative w-full flex items-center justify-center gap-3 py-5 rounded-2xl font-black text-lg transition-all duration-300 overflow-hidden"
          style={{
            background: canClaim
              ? 'linear-gradient(135deg, #6d28d9, #8b5cf6, #a78bfa)'
              : 'rgba(255,255,255,0.04)',
            border: canClaim
              ? '1px solid rgba(139,92,246,0.5)'
              : '1px solid rgba(255,255,255,0.08)',
            color: canClaim ? '#fff' : 'rgba(255,255,255,0.25)',
            boxShadow: canClaim ? '0 8px 32px rgba(109,40,217,0.4), 0 0 60px rgba(139,92,246,0.15)' : 'none',
            transform: canClaim ? undefined : 'none',
            cursor: canClaim ? 'pointer' : 'not-allowed',
          }}
        >
          {claiming ? (
            <div className="w-6 h-6 rounded-full border-2 border-white/30 border-t-white animate-spin" />
          ) : canClaim ? (
            <>
              <Zap className="w-6 h-6" fill="currentColor" />
              Claim +10 Points
            </>
          ) : (
            <>
              <Clock className="w-5 h-5" />
              Next claim in {nextClaim}
            </>
          )}
        </button>
      </div>

      {/* Redeem section */}
      <div className="rounded-2xl p-6" style={{ background: 'rgba(16,232,152,0.05)', border: `1px solid ${canRedeem ? 'rgba(16,232,152,0.3)' : 'rgba(255,255,255,0.07)'}`, transition: 'border-color 0.3s' }}>
        <div className="flex items-start gap-4 mb-5">
          <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 text-2xl" style={{ background: 'rgba(16,232,152,0.1)', border: '1px solid rgba(16,232,152,0.2)' }}>
            🎁
          </div>
          <div>
            <h3 className="font-bold text-base mb-1" style={{ color: 'rgba(255,255,255,0.85)' }}>Redeem Rewards</h3>
            <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {canRedeem
                ? 'You have enough points! Choose: $3 balance or a 3-day key.'
                : `${100 - Math.min(bonusPoints, 100)} more points needed to redeem.`}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(16,232,152,0.06)', border: '1px solid rgba(16,232,152,0.15)' }}>
            <div className="text-xl mb-1">💰</div>
            <div className="text-sm font-bold" style={{ color: '#10e898' }}>$3 Balance</div>
            <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Wallet credit</div>
          </div>
          <div className="rounded-xl p-3 text-center" style={{ background: 'rgba(139,92,246,0.06)', border: '1px solid rgba(139,92,246,0.15)' }}>
            <div className="text-xl mb-1">🔑</div>
            <div className="text-sm font-bold" style={{ color: '#a78bfa' }}>3-Day Key</div>
            <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.35)' }}>Full access</div>
          </div>
        </div>

        <button
          onClick={() => canRedeem && setRewardOpen(true)}
          disabled={!canRedeem}
          className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl font-bold text-sm transition-all"
          style={{
            background: canRedeem ? 'linear-gradient(135deg, rgba(16,232,152,0.2), rgba(16,232,152,0.1))' : 'rgba(255,255,255,0.03)',
            border: `1px solid ${canRedeem ? 'rgba(16,232,152,0.4)' : 'rgba(255,255,255,0.07)'}`,
            color: canRedeem ? '#10e898' : 'rgba(255,255,255,0.2)',
            cursor: canRedeem ? 'pointer' : 'not-allowed',
          }}
        >
          <Gift size={15} />
          {canRedeem ? 'Redeem 100 Points' : `${100 - Math.min(bonusPoints, 100)} pts needed`}
        </button>
      </div>
    </div>
  );
}
