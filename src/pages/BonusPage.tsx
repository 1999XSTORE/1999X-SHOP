import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Gift, Clock, Coins } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

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
    if (claimBonus()) toast.success('+10 Bonus Points!');
    else toast.error('Already claimed today');
  };

  return (
    <div className="max-w-md mx-auto space-y-4 animate-fade-up">
      <div className="glass-surface rounded-xl p-8 text-center">
        <div className="w-16 h-16 rounded-2xl bg-primary/15 flex items-center justify-center mx-auto mb-4">
          <Gift className="w-8 h-8 text-primary" />
        </div>
        <h2 className="text-xl font-bold text-foreground mb-1">{t('bonus.title')}</h2>
        <p className="text-xs text-muted-foreground mb-6">Claim your daily bonus points!</p>

        <div className="glass-surface rounded-xl p-4 mb-6 inline-flex items-center gap-3">
          <Coins className="w-5 h-5 text-primary" />
          <div className="text-left">
            <p className="text-[10px] text-muted-foreground">{t('bonus.points')}</p>
            <p className="text-2xl font-bold text-primary">{bonusPoints}</p>
          </div>
        </div>

        {canClaim ? (
          <button onClick={handleClaim}
            className="w-full py-3 rounded-xl bg-primary text-primary-foreground font-bold text-sm transition-all hover:opacity-90 active:scale-[0.97]">
            {t('bonus.claim')} (+10 pts)
          </button>
        ) : (
          <div className="w-full py-3 rounded-xl bg-secondary text-center">
            <p className="text-[10px] text-muted-foreground mb-0.5 flex items-center justify-center gap-1">
              <Clock className="w-3 h-3" /> {t('bonus.nextClaim')}
            </p>
            <p className="text-sm font-bold text-foreground">{cooldown}</p>
          </div>
        )}
      </div>

      <div className="glass-surface rounded-xl p-5">
        <h3 className="text-sm font-bold text-foreground mb-2">{t('bonus.convert')}</h3>
        <p className="text-xs text-muted-foreground mb-3">100 points = $1 discount on next purchase</p>
        <button disabled={bonusPoints < 100}
          className="w-full py-2.5 rounded-xl bg-secondary text-sm font-semibold text-secondary-foreground hover:bg-secondary/80 disabled:opacity-40 transition-all active:scale-[0.97]">
          Convert {Math.floor(bonusPoints / 100) * 100} pts → ${Math.floor(bonusPoints / 100)}
        </button>
      </div>
    </div>
  );
}
