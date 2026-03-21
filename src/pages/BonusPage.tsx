import { useAppStore } from '@/lib/store';
import { Gift, Clock, Coins, Zap, Star } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

export default function BonusPage() {
  const { t } = useTranslation();
  const { bonusPoints, lastBonusClaim, claimBonus } = useAppStore();
  const [cooldown, setCooldown] = useState('');
  const [canClaim, setCanClaim] = useState(false);
  const [burst, setBurst] = useState(false);

  useEffect(() => {
    const run = () => {
      if (!lastBonusClaim) { setCanClaim(true); return; }
      const diff = 86400000 - (Date.now() - new Date(lastBonusClaim).getTime());
      if (diff <= 0) { setCanClaim(true); setCooldown(''); return; }
      setCanClaim(false);
      const h = Math.floor(diff/3600000), m = Math.floor((diff%3600000)/60000), s = Math.floor((diff%60000)/1000);
      setCooldown(`${h}h ${m}m ${s}s`);
    };
    run(); const i = setInterval(run, 1000); return () => clearInterval(i);
  }, [lastBonusClaim]);

  const prog = bonusPoints % 100;
  const earned = Math.floor(bonusPoints / 100);

  const claim = () => {
    if (claimBonus()) { toast.success('🎉 +10 pts!'); setBurst(true); setTimeout(() => setBurst(false), 600); }
    else toast.error('Already claimed today');
  };

  return (
    <div style={{maxWidth:440,margin:'0 auto',display:'flex',flexDirection:'column',gap:16}}>

      {/* Main card */}
      <div className="g fu" style={{padding:'40px 32px',textAlign:'center',background:'rgba(251,191,36,.06)',borderColor:'rgba(251,191,36,.16)',boxShadow:'0 0 60px rgba(245,158,11,.06)',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:300,height:120,borderRadius:'0 0 50% 50%',background:'radial-gradient(ellipse,rgba(251,191,36,.12) 0%,transparent 70%)',pointerEvents:'none'}}/>
        <div style={{position:'relative'}}>
          <div style={{width:72,height:72,borderRadius:18,background:'linear-gradient(135deg,rgba(251,191,36,.2),rgba(245,158,11,.1))',border:'1px solid rgba(251,191,36,.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',boxShadow:'0 0 30px rgba(245,158,11,.18)',transform:burst?'scale(1.18)':'scale(1)',transition:'transform .3s cubic-bezier(.34,1.56,.64,1)'}}>
            <Gift size={32} color="var(--amber)"/>
          </div>
          <div className="label" style={{color:'rgba(251,191,36,.5)',marginBottom:8}}>Daily Reward</div>
          <h2 style={{fontSize:26,fontWeight:800,color:'#fff',letterSpacing:'-.02em',margin:'0 0 6px'}}>Bonus Points</h2>
          <p style={{fontSize:13,color:'var(--muted)',margin:'0 0 24px'}}>Claim daily · 100 pts = exclusive reward</p>

          {/* Points */}
          <div style={{display:'inline-flex',alignItems:'center',gap:12,padding:'14px 24px',borderRadius:16,background:'rgba(251,191,36,.07)',border:'1px solid rgba(251,191,36,.18)',marginBottom:22}}>
            <Coins size={22} color="var(--amber)"/>
            <div style={{textAlign:'left'}}>
              <div className="label" style={{color:'rgba(251,191,36,.5)',marginBottom:2}}>Your Points</div>
              <div style={{fontSize:36,fontWeight:900,color:'var(--amber)',letterSpacing:'-.03em',lineHeight:1}}>{bonusPoints}</div>
            </div>
          </div>

          {/* Progress */}
          <div style={{marginBottom:22}}>
            <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
              <span style={{fontSize:12,color:'var(--muted)'}}>Progress to reward</span>
              <span style={{fontSize:12,color:'var(--amber)',fontWeight:600}}>{prog}/100</span>
            </div>
            <div className="prog" style={{height:6}}>
              <div className="prog-bar prog-a" style={{width:`${prog}%`}}/>
            </div>
          </div>

          {canClaim
            ? <button className="btn btn-lg btn-full" style={{background:'linear-gradient(135deg,#fbbf24,#f59e0b)',color:'#3a1a00',fontWeight:800,boxShadow:'0 0 28px rgba(245,158,11,.38)',fontSize:15}} onClick={claim}>⚡ Claim +10 Points</button>
            : <div className="g" style={{padding:'14px 20px',textAlign:'center'}}>
                <div style={{fontSize:11,color:'var(--muted)',display:'flex',alignItems:'center',justifyContent:'center',gap:5,marginBottom:4}}><Clock size={11}/>Next claim in</div>
                <div className="mono" style={{fontSize:22,fontWeight:800,color:'#fff',letterSpacing:'-.02em'}}>{cooldown}</div>
              </div>
          }
        </div>
      </div>

      {/* Redeem */}
      <div className="g fu" style={{padding:20,animationDelay:'70ms'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16}}>
          <div style={{fontSize:15,fontWeight:700,color:'#fff'}}>Redeem Rewards</div>
          <span style={{fontSize:11,color:'var(--dim)'}}>{earned} redeemed</span>
        </div>
        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
          {[{icon:Zap,label:'3-Day Key',desc:'Full access key',pts:100,c:'var(--purple)',bg:'rgba(109,40,217,.08)',bc:'rgba(139,92,246,.16)'},{icon:Star,label:'$1 Balance',desc:'Wallet credit',pts:100,c:'var(--amber)',bg:'rgba(251,191,36,.06)',bc:'rgba(251,191,36,.14)'}].map(o=>(
            <div key={o.label} className="g" style={{padding:14,textAlign:'center',background:o.bg,borderColor:o.bc}}>
              <div style={{width:34,height:34,borderRadius:9,background:o.bg,border:`1px solid ${o.bc}`,display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 8px'}}>
                <o.icon size={16} color={o.c}/>
              </div>
              <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:3}}>{o.label}</div>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:8}}>{o.desc}</div>
              <span className="badge badge-purple" style={{color:o.c,background:o.bg,borderColor:o.bc}}>{o.pts} pts</span>
            </div>
          ))}
        </div>
        <button disabled={bonusPoints < 100} className="btn btn-p btn-full" style={bonusPoints<100?{background:'rgba(255,255,255,.04)',boxShadow:'none',color:'var(--muted)',border:'1px solid var(--border)'}:{}}>
          {bonusPoints >= 100 ? `Redeem ${Math.floor(bonusPoints/100)*100} pts` : `Need ${100-prog} more pts`}
        </button>
      </div>
    </div>
  );
}
