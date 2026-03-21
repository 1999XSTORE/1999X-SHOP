import { useAppStore } from '@/lib/store';
import { Gift, Clock, Coins, Zap, Star, CheckCircle, Copy, Loader2, X } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';

const SUPABASE_URL  = 'https://wkjqrjafogufqeasfeev.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok';

// ── Generate a key from KeyAuth via edge function ──────────
async function generateKey(panelType: 'lag'|'internal', days: number): Promise<{ success: boolean; key?: string; message?: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-key`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${SUPABASE_ANON}`, 'apikey':SUPABASE_ANON },
      body: JSON.stringify({ panel_type: panelType, days }),
    });
    return await res.json();
  } catch(e) { return { success: false, message: String(e) }; }
}

// ── Countdown timer component ─────────────────────────────
function Countdown({ expiresAt }: { expiresAt: string }) {
  const [t, setT] = useState('');
  useEffect(() => {
    const up = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setT('Expired'); return; }
      const d=Math.floor(diff/86400000), h=String(Math.floor((diff%86400000)/3600000)).padStart(2,'0'),
            m=String(Math.floor((diff%3600000)/60000)).padStart(2,'0'), s=String(Math.floor((diff%60000)/1000)).padStart(2,'0');
      setT(d>0 ? `${d}d ${h}:${m}:${s}` : `${h}:${m}:${s}`);
    };
    up(); const i=setInterval(up,1000); return ()=>clearInterval(i);
  },[expiresAt]);
  return <span style={{color:'var(--green)'}}>{t}</span>;
}

// ── Reward choice modal ────────────────────────────────────
function RewardModal({ onClose }: { onClose: () => void }) {
  const { addBalance, addLicense, user, redeemPoints } = useAppStore();
  const [loading, setLoading]     = useState(false);
  const [success, setSuccess]     = useState<null|'balance'|'key'>(null);
  const [genKey, setGenKey]       = useState('');
  const [copied, setCopied]       = useState(false);
  const keyExpiry = new Date(Date.now() + 3 * 86400000).toISOString();

  const claimBalance = () => {
    redeemPoints(100); // deduct 100 pts
    addBalance(3);     // add $3 to wallet
    setSuccess('balance');
    toast.success('💰 $3 added to your balance!');
  };

  const claimKey = async () => {
    if (!user) { toast.error('Login required'); return; }
    setLoading(true);
    // Try Internal first, then Fake Lag
    let result = await generateKey('internal', 3);
    if (!result.success) result = await generateKey('lag', 3);

    if (result.success && result.key) {
      redeemPoints(100); // deduct 100 pts before giving key
      const k = result.key;
      const panelId   = result.panel_type === 'lag' ? 'keyauth-lag' : 'keyauth-internal';
      const panelName = result.panel_type === 'lag' ? 'Fake Lag' : 'Internal';
      addLicense({
        id:             `bonus_${Math.random().toString(36).slice(2,10)}`,
        productId:      panelId,
        productName:    `${panelName} (Bonus)`,
        key:            result.panel_type === 'lag' ? k : k + '_INTERNAL',
        hwid:           '',
        lastLogin:      new Date().toISOString(),
        expiresAt:      keyExpiry,
        status:         'active',
        ip:             '',
        device:         '',
        hwidResetsUsed: 0,
        hwidResetMonth: new Date().getMonth(),
      });
      setGenKey(k);
      setSuccess('key');
      toast.success('🔑 3-Day license key generated!');
    } else {
      toast.error('Key generation failed: ' + (result.message ?? 'Unknown error'));
    }
    setLoading(false);
  };

  const copy = () => { navigator.clipboard.writeText(genKey); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  return (
    <div style={{position:'fixed',inset:0,zIndex:70,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.82)',backdropFilter:'blur(14px)',padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="g si" style={{width:'100%',maxWidth:420,padding:'32px 28px',position:'relative',boxShadow:'0 0 80px rgba(251,191,36,.12), 0 32px 80px rgba(0,0,0,.7)',borderColor:'rgba(251,191,36,.2)'}}>

        {/* Close */}
        <button onClick={onClose} style={{position:'absolute',top:14,right:14,background:'rgba(255,255,255,.06)',border:'1px solid var(--border)',borderRadius:8,padding:6,cursor:'pointer',color:'var(--muted)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <X size={15}/>
        </button>

        {!success && (
          <>
            {/* Header */}
            <div style={{textAlign:'center',marginBottom:26}}>
              <div style={{width:60,height:60,borderRadius:18,background:'linear-gradient(135deg,rgba(251,191,36,.2),rgba(245,158,11,.1))',border:'1px solid rgba(251,191,36,.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',boxShadow:'0 0 30px rgba(245,158,11,.2)'}}>
                <Gift size={28} color="var(--amber)"/>
              </div>
              <div style={{fontSize:20,fontWeight:800,color:'#fff',marginBottom:6}}>Choose Your Reward</div>
              <p style={{fontSize:13,color:'var(--muted)'}}>100 points redeemed · Pick your reward</p>
            </div>

            {/* Options */}
            <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:18}}>
              <button onClick={claimBalance}
                style={{width:'100%',padding:'18px 20px',borderRadius:14,background:'rgba(16,232,152,.08)',border:'2px solid rgba(16,232,152,.25)',cursor:'pointer',display:'flex',alignItems:'center',gap:14,transition:'all .2s',fontFamily:'inherit',textAlign:'left'}}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(16,232,152,.14)';e.currentTarget.style.borderColor='rgba(16,232,152,.4)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(16,232,152,.08)';e.currentTarget.style.borderColor='rgba(16,232,152,.25)';}}>
                <div style={{width:48,height:48,borderRadius:13,background:'rgba(16,232,152,.12)',border:'1px solid rgba(16,232,152,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:24}}>💰</div>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:'var(--green)',marginBottom:3}}>Get $3 Balance</div>
                  <div style={{fontSize:12,color:'var(--muted)'}}>Added to your wallet instantly</div>
                </div>
              </button>

              <button onClick={claimKey} disabled={loading}
                style={{width:'100%',padding:'18px 20px',borderRadius:14,background:'rgba(139,92,246,.08)',border:'2px solid rgba(139,92,246,.25)',cursor:loading?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:14,transition:'all .2s',fontFamily:'inherit',textAlign:'left',opacity:loading?.6:1}}
                onMouseEnter={e=>{if(!loading){e.currentTarget.style.background='rgba(139,92,246,.14)';e.currentTarget.style.borderColor='rgba(139,92,246,.4)';} }}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(139,92,246,.08)';e.currentTarget.style.borderColor='rgba(139,92,246,.25)';}}>
                <div style={{width:48,height:48,borderRadius:13,background:'rgba(139,92,246,.12)',border:'1px solid rgba(139,92,246,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:loading?undefined:24}}>
                  {loading ? <Loader2 size={22} color="var(--purple)" className="animate-spin"/> : '🔑'}
                </div>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:'var(--purple)',marginBottom:3}}>Get 3-Day License Key</div>
                  <div style={{fontSize:12,color:'var(--muted)'}}>Auto-generated · Added to your licenses</div>
                </div>
              </button>
            </div>

            <p style={{fontSize:11,color:'var(--dim)',textAlign:'center'}}>This reward will deduct 100 pts from your balance</p>
          </>
        )}

        {/* Success — balance */}
        {success === 'balance' && (
          <div style={{textAlign:'center'}}>
            <div style={{width:64,height:64,borderRadius:20,background:'rgba(16,232,152,.1)',border:'1px solid rgba(16,232,152,.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',boxShadow:'0 0 40px rgba(16,232,152,.2)'}}>
              <CheckCircle size={32} color="var(--green)"/>
            </div>
            <div style={{fontSize:22,fontWeight:800,color:'#fff',marginBottom:6}}>$3 Added!</div>
            <div style={{fontSize:14,color:'var(--muted)',marginBottom:24}}>Balance updated in your wallet</div>
            <div style={{padding:'16px',borderRadius:14,background:'rgba(16,232,152,.06)',border:'1px solid rgba(16,232,152,.15)',marginBottom:20}}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>NEW BALANCE</div>
              <div style={{fontSize:32,fontWeight:900,color:'var(--green)'}}>+$3.00</div>
            </div>
            <button onClick={onClose} className="btn btn-g btn-full btn-lg">Done</button>
          </div>
        )}

        {/* Success — key */}
        {success === 'key' && (
          <div style={{textAlign:'center'}}>
            <div style={{width:64,height:64,borderRadius:20,background:'rgba(139,92,246,.1)',border:'1px solid rgba(139,92,246,.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',boxShadow:'0 0 40px rgba(139,92,246,.2)'}}>
              <CheckCircle size={32} color="var(--purple)"/>
            </div>
            <div style={{fontSize:22,fontWeight:800,color:'#fff',marginBottom:6}}>Key Generated!</div>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:20}}>Your 3-day license is active</div>

            {/* Key card */}
            <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(139,92,246,.2)',borderRadius:14,padding:'16px',marginBottom:14,boxShadow:'0 0 24px rgba(139,92,246,.1)'}}>
              <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10}}>License Key</div>
              <code style={{fontSize:13,fontFamily:'monospace',color:'#fff',letterSpacing:'2px',wordBreak:'break-all',display:'block',marginBottom:12}}>{genKey}</code>
              <button onClick={copy} className="btn btn-ghost btn-sm btn-full">
                {copied ? <><CheckCircle size={13}/> Copied!</> : <><Copy size={13}/> Copy Key</>}
              </button>
            </div>

            <div style={{display:'flex',justifyContent:'space-between',background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:12,padding:'12px 14px',marginBottom:20}}>
              <div style={{textAlign:'left'}}>
                <div style={{fontSize:10,color:'var(--muted)',marginBottom:3}}>STATUS</div>
                <div style={{display:'flex',alignItems:'center',gap:5,fontSize:12,fontWeight:700,color:'var(--green)'}}><span className="dot dot-green" style={{width:5,height:5}}/>Active</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:10,color:'var(--muted)',marginBottom:3}}>EXPIRES IN</div>
                <div style={{fontSize:12,fontWeight:700}}><Countdown expiresAt={keyExpiry}/></div>
              </div>
            </div>
            <button onClick={onClose} className="btn btn-p btn-full btn-lg">Done</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main BonusPage ─────────────────────────────────────────
export default function BonusPage() {
  const { bonusPoints, lastBonusClaim, claimBonus } = useAppStore();
  const [cooldown, setCooldown] = useState('');
  const [canClaim, setCanClaim] = useState(false);
  const [burst, setBurst]       = useState(false);
  const [showModal, setShowModal] = useState(false);

  useEffect(() => {
    const run = () => {
      if (!lastBonusClaim) { setCanClaim(true); return; }
      const diff = 86400000 - (Date.now() - new Date(lastBonusClaim).getTime());
      if (diff <= 0) { setCanClaim(true); setCooldown(''); return; }
      setCanClaim(false);
      const h=Math.floor(diff/3600000), m=Math.floor((diff%3600000)/60000), s=Math.floor((diff%60000)/1000);
      setCooldown(`${h}h ${m}m ${s}s`);
    };
    run(); const i=setInterval(run,1000); return ()=>clearInterval(i);
  },[lastBonusClaim]);

  const prog   = bonusPoints % 100;
  const earned = Math.floor(bonusPoints / 100);

  const handleClaim = () => {
    if (claimBonus()) { toast.success('🎉 +10 pts!'); setBurst(true); setTimeout(()=>setBurst(false),600); }
    else toast.error('Already claimed today');
  };

  const handleRedeem = () => {
    if (bonusPoints < 100) { toast.error(`Need ${100-prog} more points`); return; }
    setShowModal(true);
  };

  return (
    <>
      {showModal && <RewardModal onClose={() => setShowModal(false)} />}

      <div style={{maxWidth:440,margin:'0 auto',display:'flex',flexDirection:'column',gap:16}}>

        {/* Main card */}
        <div className="g fu" style={{padding:'38px 30px',textAlign:'center',background:'rgba(251,191,36,.06)',borderColor:'rgba(251,191,36,.16)',boxShadow:'0 0 60px rgba(245,158,11,.06)',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:300,height:120,borderRadius:'0 0 50% 50%',background:'radial-gradient(ellipse,rgba(251,191,36,.12) 0%,transparent 70%)',pointerEvents:'none'}}/>
          <div style={{position:'relative'}}>
            {/* Icon */}
            <div style={{width:72,height:72,borderRadius:18,background:'linear-gradient(135deg,rgba(251,191,36,.2),rgba(245,158,11,.1))',border:'1px solid rgba(251,191,36,.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',boxShadow:'0 0 30px rgba(245,158,11,.18)',transform:burst?'scale(1.18)':'scale(1)',transition:'transform .3s cubic-bezier(.34,1.56,.64,1)'}}>
              <Gift size={32} color="var(--amber)"/>
            </div>
            <div className="label" style={{color:'rgba(251,191,36,.5)',marginBottom:8}}>Daily Reward</div>
            <h2 style={{fontSize:26,fontWeight:800,color:'#fff',letterSpacing:'-.02em',margin:'0 0 6px'}}>Bonus Points</h2>
            <p style={{fontSize:13,color:'var(--muted)',margin:'0 0 22px'}}>Claim daily · 100 pts = <strong style={{color:'var(--amber)'}}>$3 or 3-Day Key</strong></p>

            {/* Points display */}
            <div style={{display:'inline-flex',alignItems:'center',gap:12,padding:'14px 24px',borderRadius:16,background:'rgba(251,191,36,.07)',border:'1px solid rgba(251,191,36,.18)',marginBottom:20}}>
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
              <div className="prog" style={{height:7,borderRadius:4}}>
                <div className="prog-bar prog-a" style={{width:`${prog}%`}}/>
              </div>
            </div>

            {/* Claim button */}
            {canClaim
              ? <button className="btn btn-lg btn-full" onClick={handleClaim}
                  style={{background:'linear-gradient(135deg,#fbbf24,#f59e0b)',color:'#3a1a00',fontWeight:800,boxShadow:'0 0 28px rgba(245,158,11,.4), 0 4px 14px rgba(0,0,0,.3)',fontSize:15,position:'relative',overflow:'hidden'}}>
                  <span style={{position:'absolute',inset:0,background:'linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)',transform:'translateX(-100%)',animation:'shim 2s infinite'}}/>
                  ⚡ Claim +10 Points
                </button>
              : <div className="g" style={{padding:'14px 20px',textAlign:'center'}}>
                  <div style={{fontSize:11,color:'var(--muted)',display:'flex',alignItems:'center',justifyContent:'center',gap:5,marginBottom:4}}><Clock size={11}/>Next claim in</div>
                  <div className="mono" style={{fontSize:22,fontWeight:800,color:'#fff',letterSpacing:'-.02em'}}>{cooldown}</div>
                </div>
            }
          </div>
        </div>

        {/* Redeem section */}
        <div className="g fu" style={{padding:20,animationDelay:'70ms'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <div style={{fontSize:15,fontWeight:700,color:'#fff'}}>Redeem Rewards</div>
            <span style={{fontSize:11,color:'var(--dim)'}}>{earned} redeemed</span>
          </div>

          {/* Reward preview cards */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            {[
              {icon:'💰',label:'$3 Balance',   desc:'Instant +$3 wallet credit',  c:'var(--green)',  bg:'rgba(16,232,152,.07)', bc:'rgba(16,232,152,.18)'},
              {icon:'🔑',label:'3-Day Key',     desc:'Auto-generated license', c:'var(--purple)', bg:'rgba(139,92,246,.07)', bc:'rgba(139,92,246,.18)'},
            ].map(o=>(
              <div key={o.label} className="g" style={{padding:14,textAlign:'center',background:o.bg,borderColor:o.bc}}>
                <div style={{fontSize:26,marginBottom:8}}>{o.icon}</div>
                <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:3}}>{o.label}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:8}}>{o.desc}</div>
                <span className="badge" style={{color:o.c,background:o.bg,border:`1px solid ${o.bc}`,fontSize:10,fontWeight:700}}>100 pts</span>
              </div>
            ))}
          </div>

          <button onClick={handleRedeem} disabled={bonusPoints<100}
            className="btn btn-p btn-full btn-lg"
            style={bonusPoints<100?{background:'rgba(255,255,255,.04)',boxShadow:'none',color:'var(--muted)',border:'1px solid var(--border)'}:{boxShadow:'0 0 24px rgba(109,40,217,.35)'}}>
            {bonusPoints >= 100 ? '🎁 Redeem 100 Points' : `Need ${100-prog} more pts`}
          </button>
        </div>
      </div>
    </>
  );
}
