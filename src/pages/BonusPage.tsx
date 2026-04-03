import { useAppStore } from '@/lib/store';
import { useTranslation } from 'react-i18next';
import { Gift, Clock, Coins, CheckCircle, Copy, Loader2, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import { toast } from 'sonner';

const SUPABASE_URL  = 'https://awjouzwzdkrevvnlenvn.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3am91end6ZGtyZXZ2bmxlbnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTg4MjEsImV4cCI6MjA5MDAzNDgyMX0._I_I-WA_8-YqDfaRzKiVgpEAhkH9faxlEIV6e766A0M';
const COOLDOWN_MS   = 86400000; // 24 hours

// ── Generate key via Edge Function ─────────────────────────
async function generateKey(panelType: 'lag'|'internal', days: number): Promise<{ success: boolean; key?: string; panel_type?: string; message?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token || SUPABASE_ANON;
    const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-key`, {
      method: 'POST',
      headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${token}`, 'apikey':SUPABASE_ANON },
      body: JSON.stringify({ panel_type: panelType, days }),
    });
    return await res.json();
  } catch(e) { return { success: false, message: String(e) }; }
}

// ── Supabase bonus helpers ──────────────────────────────────
interface BonusRow {
  bonus_points:    number;
  last_claim_time: string | null;
}

async function fetchBonusRow(userId: string): Promise<BonusRow | null> {
  try {
    const { data, error } = await supabase
      .from('user_bonus')
      .select('bonus_points, last_claim_time')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return null;
    return data as BonusRow | null;
  } catch { return null; }
}

async function upsertBonusRow(userId: string, userEmail: string, bonusPoints: number, lastClaimTime: string | null): Promise<boolean> {
  try {
    const { error } = await supabase.from('user_bonus').upsert({
      user_id:         userId,
      user_email:      userEmail,
      bonus_points:    bonusPoints,
      last_claim_time: lastClaimTime,
      updated_at:      new Date().toISOString(),
    }, { onConflict: 'user_id' });
    return !error;
  } catch { return false; }
}

// ── Countdown timer ─────────────────────────────────────────
function Countdown({ expiresAt }: { expiresAt: string }) {
  const [t, setT] = useState('');
  useEffect(() => {
    const up = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setT('Ready!'); return; }
      const d=Math.floor(diff/86400000), h=String(Math.floor((diff%86400000)/3600000)).padStart(2,'0'),
            m=String(Math.floor((diff%3600000)/60000)).padStart(2,'0'), s=String(Math.floor((diff%60000)/1000)).padStart(2,'0');
      setT(d>0 ? `${d}d ${h}:${m}:${s}` : `${h}:${m}:${s}`);
    };
    up(); const i=setInterval(up,1000); return ()=>clearInterval(i);
  },[expiresAt]);
  return <span style={{color:'var(--green)'}}>{t}</span>;
}

// ── Reward modal ────────────────────────────────────────────
function RewardModal({ bonusPoints, userId, userEmail, onClose, onRedeem }: {
  bonusPoints: number; userId: string; userEmail: string;
  onClose: () => void; onRedeem: (newPoints: number) => void;
}) {
  const { t } = useTranslation();
  const { addBalance, addLicense } = useAppStore();
  const [loading, setLoading]   = useState(false);
  const [success, setSuccess]   = useState<null|'balance'|'key'>(null);
  const [genKey, setGenKey]     = useState('');
  const [copied, setCopied]     = useState(false);
  const keyExpiry = new Date(Date.now() + 3 * 86400000).toISOString();

  const claimBalance = async () => {
    const newPts = bonusPoints - 100;
    addBalance(3);
    onRedeem(newPts);
    await upsertBonusRow(userId, userEmail, newPts, null);
    setSuccess('balance');
    toast.success('💰 $3 added to your balance!'); logActivity({ userId, userEmail, userName:userEmail, action:'balance_add', amount:3, status:'success', meta:{ source:'bonus_redeem' } });
  };

  const claimKey = async () => {
    setLoading(true);
    let result = await generateKey('internal', 3);
    if (!result.success) result = await generateKey('lag', 3);

    if (result.success && result.key) {
      const newPts = bonusPoints - 100;
      const k = result.key;
      const panelId   = result.panel_type === 'lag' ? 'keyauth-lag' : 'keyauth-internal';
      const panelName = result.panel_type === 'lag' ? 'Fake Lag' : 'Internal';
      addLicense({
        id: `bonus_${Math.random().toString(36).slice(2,10)}`,
        productId: panelId, productName: `${panelName} (Bonus)`,
        key: result.panel_type === 'lag' ? k : k + '_INTERNAL',
        hwid: '', lastLogin: new Date().toISOString(),
        expiresAt: keyExpiry, status: 'active',
        ip: '', device: '', hwidResetsUsed: 0, hwidResetMonth: new Date().getMonth(),
      });
      onRedeem(newPts);
      await upsertBonusRow(userId, userEmail, newPts, null);
      setGenKey(k);
      setSuccess('key');
      toast.success('🔑 3-Day license key generated!'); logActivity({ userId, userEmail, userName:userEmail, action:'key_generated', product:'3-Day Key (Bonus)', status:'success', meta:{ source:'bonus_redeem' } });
    } else {
      toast.error('Key generation failed: ' + (result.message ?? 'Unknown error'));
    }
    setLoading(false);
  };

  const copy = () => { navigator.clipboard.writeText(genKey); setCopied(true); setTimeout(()=>setCopied(false),2000); };

  return (
    <div style={{position:'fixed',inset:0,zIndex:70,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.82)',backdropFilter:'blur(14px)',padding:16}}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="g si" style={{width:'100%',maxWidth:420,padding:'32px 28px',position:'relative',boxShadow:'0 0 80px rgba(251,191,36,.12),0 32px 80px rgba(0,0,0,.7)',borderColor:'rgba(251,191,36,.2)'}}>
        <button onClick={onClose} style={{position:'absolute',top:14,right:14,background:'rgba(255,255,255,.06)',border:'1px solid var(--border)',borderRadius:8,padding:6,cursor:'pointer',color:'var(--muted)',display:'flex',alignItems:'center',justifyContent:'center'}}>
          <X size={15}/>
        </button>

        {!success && (
          <>
            <div style={{textAlign:'center',marginBottom:26}}>
              <div style={{width:60,height:60,borderRadius:18,background:'linear-gradient(135deg,rgba(251,191,36,.2),rgba(245,158,11,.1))',border:'1px solid rgba(251,191,36,.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 16px',boxShadow:'0 0 30px rgba(245,158,11,.2)'}}>
                <Gift size={28} color="var(--amber)"/>
              </div>
              <div style={{fontSize:20,fontWeight:800,color:'#fff',marginBottom:6}}>{t('bonus.chooseReward')}</div>
              <p style={{fontSize:13,color:'var(--muted)'}}>{t('bonus.redeemDesc')}</p>
            </div>

            <div style={{display:'flex',flexDirection:'column',gap:12,marginBottom:18}}>
              {/* $3 Balance option */}
              <button onClick={claimBalance}
                style={{width:'100%',padding:'18px 20px',borderRadius:14,background:'rgba(16,232,152,.08)',border:'2px solid rgba(16,232,152,.25)',cursor:'pointer',display:'flex',alignItems:'center',gap:14,transition:'all .2s',fontFamily:'inherit',textAlign:'left'}}
                onMouseEnter={e=>{e.currentTarget.style.background='rgba(16,232,152,.14)';e.currentTarget.style.borderColor='rgba(16,232,152,.4)';e.currentTarget.style.boxShadow='0 0 24px rgba(16,232,152,.15)';}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(16,232,152,.08)';e.currentTarget.style.borderColor='rgba(16,232,152,.25)';e.currentTarget.style.boxShadow='none';}}>
                <div style={{width:48,height:48,borderRadius:13,background:'rgba(16,232,152,.12)',border:'1px solid rgba(16,232,152,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:24}}>💰</div>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:'var(--green)',marginBottom:3}}>{t('bonus.getBalance')}</div>
                  <div style={{fontSize:12,color:'var(--muted)'}}>{t('bonus.getBalanceDesc')}</div>
                </div>
              </button>

              {/* Key option */}
              <button onClick={claimKey} disabled={loading}
                style={{width:'100%',padding:'18px 20px',borderRadius:14,background:'rgba(139,92,246,.08)',border:'2px solid rgba(139,92,246,.25)',cursor:loading?'not-allowed':'pointer',display:'flex',alignItems:'center',gap:14,transition:'all .2s',fontFamily:'inherit',textAlign:'left',opacity:loading?.6:1}}
                onMouseEnter={e=>{if(!loading){e.currentTarget.style.background='rgba(139,92,246,.14)';e.currentTarget.style.borderColor='rgba(139,92,246,.4)';e.currentTarget.style.boxShadow='0 0 24px rgba(109,40,217,.2)';}}}
                onMouseLeave={e=>{e.currentTarget.style.background='rgba(139,92,246,.08)';e.currentTarget.style.borderColor='rgba(139,92,246,.25)';e.currentTarget.style.boxShadow='none';}}>
                <div style={{width:48,height:48,borderRadius:13,background:'rgba(139,92,246,.12)',border:'1px solid rgba(139,92,246,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                  {loading ? <Loader2 size={22} color="var(--purple)" className="animate-spin"/> : <span style={{fontSize:24}}>🔑</span>}
                </div>
                <div>
                  <div style={{fontSize:16,fontWeight:800,color:'var(--purple)',marginBottom:3}}>{t('bonus.getKey')}</div>
                  <div style={{fontSize:12,color:'var(--muted)'}}>{t('bonus.getKeyDesc')}</div>
                </div>
              </button>
            </div>
            <p style={{fontSize:11,color:'var(--dim)',textAlign:'center'}}>{t('bonus.redeemNote')}</p>
          </>
        )}

        {success === 'balance' && (
          <div style={{textAlign:'center'}}>
            <div style={{width:64,height:64,borderRadius:20,background:'rgba(16,232,152,.1)',border:'1px solid rgba(16,232,152,.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',boxShadow:'0 0 40px rgba(16,232,152,.2)'}}>
              <CheckCircle size={32} color="var(--green)"/>
            </div>
            <div style={{fontSize:22,fontWeight:800,color:'#fff',marginBottom:6}}>{t('bonus.balanceAdded')}</div>
            <div style={{fontSize:14,color:'var(--muted)',marginBottom:24}}>{t('bonus.balanceUpdated')}</div>
            <div style={{padding:'16px',borderRadius:14,background:'rgba(16,232,152,.06)',border:'1px solid rgba(16,232,152,.15)',marginBottom:20}}>
              <div style={{fontSize:11,color:'var(--muted)',marginBottom:4}}>{t('bonus.newBalance')}</div>
              <div style={{fontSize:32,fontWeight:900,color:'var(--green)'}}>+$3.00</div>
            </div>
            <button onClick={onClose} className="btn btn-g btn-full btn-lg">{t('common.done')}</button>
          </div>
        )}

        {success === 'key' && (
          <div style={{textAlign:'center'}}>
            <div style={{width:64,height:64,borderRadius:20,background:'rgba(139,92,246,.1)',border:'1px solid rgba(139,92,246,.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',boxShadow:'0 0 40px rgba(139,92,246,.2)'}}>
              <CheckCircle size={32} color="var(--purple)"/>
            </div>
            <div style={{fontSize:22,fontWeight:800,color:'#fff',marginBottom:6}}>{t('bonus.keyGenTitle')}</div>
            <div style={{fontSize:13,color:'var(--muted)',marginBottom:20}}>{t('bonus.keyActive')}</div>
            <div style={{background:'rgba(255,255,255,.03)',border:'1px solid rgba(139,92,246,.2)',borderRadius:14,padding:'16px',marginBottom:14,boxShadow:'0 0 24px rgba(139,92,246,.1)'}}>
              <div style={{fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:10}}>{t('license.title').replace('Activate ','')}</div>
              <code style={{fontSize:13,fontFamily:'monospace',color:'#fff',letterSpacing:'2px',wordBreak:'break-all',display:'block',marginBottom:12}}>{genKey}</code>
              <button onClick={copy} className="btn btn-ghost btn-sm btn-full">
                {copied ? <><CheckCircle size={13}/> {t('common.copied')}</> : <><Copy size={13}/> {t('common.copy')}</>}
              </button>
            </div>
            <div style={{display:'flex',justifyContent:'space-between',background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:12,padding:'12px 14px',marginBottom:20}}>
              <div style={{textAlign:'left'}}>
                <div style={{fontSize:10,color:'var(--muted)',marginBottom:3}}>STATUS</div>
                <div style={{display:'flex',alignItems:'center',gap:5,fontSize:12,fontWeight:700,color:'var(--green)'}}><span className="dot dot-green" style={{width:5,height:5}}/>{t('license.active')}</div>
              </div>
              <div style={{textAlign:'right'}}>
                <div style={{fontSize:10,color:'var(--muted)',marginBottom:3}}>EXPIRES IN</div>
                <div style={{fontSize:12,fontWeight:700}}><Countdown expiresAt={keyExpiry}/></div>
              </div>
            </div>
            <button onClick={onClose} className="btn btn-p btn-full btn-lg">{t('common.done')}</button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Main BonusPage ──────────────────────────────────────────
export default function BonusPage() {
  const { t } = useTranslation();
  const { user, addBalance } = useAppStore();

  // Supabase-backed bonus state
  const [bonusPoints,    setBonusPoints]    = useState(0);
  const [lastClaimTime,  setLastClaimTime]  = useState<string | null>(null);
  const [dbLoading,      setDbLoading]      = useState(true);

  // UI state
  const [cooldown,   setCooldown]   = useState('');
  const [canClaim,   setCanClaim]   = useState(false);
  const [burst,      setBurst]      = useState(false);
  const [showModal,  setShowModal]  = useState(false);
  const [claiming,   setClaiming]   = useState(false);
  const initDone = useRef(false);

  // ── Fetch from Supabase on mount ──────────────────────────
  useEffect(() => {
    if (!user?.id || initDone.current) return;
    initDone.current = true;

    fetchBonusRow(user.id).then(row => {
      if (row) {
        setBonusPoints(row.bonus_points);
        setLastClaimTime(row.last_claim_time);
      }
      setDbLoading(false);
    });
  }, [user?.id]);

  // ── Live cooldown countdown (client-side only) ────────────
  useEffect(() => {
    const run = () => {
      if (!lastClaimTime) { setCanClaim(true); setCooldown(''); return; }
      const diff = COOLDOWN_MS - (Date.now() - new Date(lastClaimTime).getTime());
      if (diff <= 0) { setCanClaim(true); setCooldown(''); return; }
      setCanClaim(false);
      const h=Math.floor(diff/3600000), m=Math.floor((diff%3600000)/60000), s=Math.floor((diff%60000)/1000);
      setCooldown(`${h}h ${m}m ${s}s`);
    };
    run(); const i = setInterval(run, 1000); return () => clearInterval(i);
  }, [lastClaimTime]);

  const prog   = bonusPoints % 100;
  const earned = Math.floor(bonusPoints / 100);

  // ── Claim bonus ───────────────────────────────────────────
  const handleClaim = async () => {
    if (!canClaim || !user?.id || claiming) return;
    setClaiming(true);

    const now = new Date().toISOString();
    const newPts = bonusPoints + 10;

    // Optimistic update
    setBonusPoints(newPts);
    setLastClaimTime(now);
    setCanClaim(false);
    setBurst(true);
    setTimeout(() => setBurst(false), 600);
    toast.success('🎉 +10 pts!');

    // Persist to Supabase
    const ok = await upsertBonusRow(user.id, user.email, newPts, now);
    if (!ok) {
      // Rollback on failure
      setBonusPoints(bonusPoints);
      setLastClaimTime(lastClaimTime);
      toast.error('Failed to save — try again');
    }
    setClaiming(false);
  };

  // Called by RewardModal after successful redemption
  const handleRedeem = (newPts: number) => {
    setBonusPoints(newPts);
  };

  const handleOpenRedeem = () => {
    if (bonusPoints < 100) { toast.error(`Need ${100 - prog} more points`); return; }
    setShowModal(true);
  };

  if (dbLoading) {
    return (
      <div style={{display:'flex',alignItems:'center',justifyContent:'center',padding:'80px 20px',gap:10,color:'var(--muted)'}}>
        <Loader2 size={18} className="animate-spin"/>
        <span style={{fontSize:14}}>{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <>
      {showModal && user && (
        <RewardModal
          bonusPoints={bonusPoints}
          userId={user.id}
          userEmail={user.email}
          onClose={() => setShowModal(false)}
          onRedeem={handleRedeem}
        />
      )}

      <div style={{maxWidth:440,margin:'0 auto',display:'flex',flexDirection:'column',gap:16}}>

        {/* Main bonus card */}
        <div className="g fu" style={{padding:'38px 28px',textAlign:'center',background:'rgba(251,191,36,.06)',borderColor:'rgba(251,191,36,.16)',boxShadow:'0 0 60px rgba(245,158,11,.06)',position:'relative',overflow:'hidden'}}>
          <div style={{position:'absolute',top:0,left:'50%',transform:'translateX(-50%)',width:300,height:120,borderRadius:'0 0 50% 50%',background:'radial-gradient(ellipse,rgba(251,191,36,.12) 0%,transparent 70%)',pointerEvents:'none'}}/>
          <div style={{position:'relative'}}>

            {/* Gift icon */}
            <div style={{width:72,height:72,borderRadius:18,background:'linear-gradient(135deg,rgba(251,191,36,.2),rgba(245,158,11,.1))',border:'1px solid rgba(251,191,36,.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',boxShadow:'0 0 30px rgba(245,158,11,.18)',transform:burst?'scale(1.18)':'scale(1)',transition:'transform .3s cubic-bezier(.34,1.56,.64,1)'}}>
              <Gift size={32} color="var(--amber)"/>
            </div>

            <div className="label" style={{color:'rgba(251,191,36,.5)',marginBottom:8}}>{t('bonus.title')}</div>
            <h2 style={{fontSize:26,fontWeight:800,color:'#fff',letterSpacing:'-.02em',margin:'0 0 6px'}}>{t('bonus.title')}</h2>
            <p style={{fontSize:13,color:'var(--muted)',margin:'0 0 22px'}}>
              {t('bonus.subtitle')} <strong style={{color:'var(--amber)'}}>$3 {t('common.or') ?? 'or'} 3-Day Key</strong>
            </p>

            {/* Points display */}
            <div style={{display:'inline-flex',alignItems:'center',gap:12,padding:'14px 24px',borderRadius:16,background:'rgba(251,191,36,.07)',border:'1px solid rgba(251,191,36,.18)',marginBottom:20}}>
              <Coins size={22} color="var(--amber)"/>
              <div style={{textAlign:'left'}}>
                <div className="label" style={{color:'rgba(251,191,36,.5)',marginBottom:2}}>{t('bonus.yourPoints')}</div>
                <div style={{fontSize:36,fontWeight:900,color:'var(--amber)',letterSpacing:'-.03em',lineHeight:1}}>{bonusPoints}</div>
              </div>
            </div>

            {/* Progress */}
            <div style={{marginBottom:22}}>
              <div style={{display:'flex',justifyContent:'space-between',marginBottom:8}}>
                <span style={{fontSize:12,color:'var(--muted)'}}>{t('bonus.progressTo')}</span>
                <span style={{fontSize:12,color:'var(--amber)',fontWeight:600}}>{prog}/100</span>
              </div>
              <div className="prog" style={{height:7,borderRadius:4}}>
                <div className="prog-bar prog-a" style={{width:`${prog}%`}}/>
              </div>
            </div>

            {/* Claim button */}
            {canClaim
              ? <button className="btn btn-lg btn-full" onClick={handleClaim} disabled={claiming}
                  style={{background:'linear-gradient(135deg,#fbbf24,#f59e0b)',color:'#3a1a00',fontWeight:800,boxShadow:'0 0 28px rgba(245,158,11,.4),0 4px 14px rgba(0,0,0,.3)',fontSize:15,position:'relative',overflow:'hidden',border:'none'}}>
                  {claiming
                    ? <Loader2 size={17} className="animate-spin"/>
                    : <><span style={{position:'absolute',inset:0,background:'linear-gradient(90deg,transparent,rgba(255,255,255,.12),transparent)',transform:'translateX(-100%)',animation:'shim 2s infinite'}}/> ⚡ {t('bonus.claim')}</>
                  }
                </button>
              : <div className="g" style={{padding:'14px 20px',textAlign:'center'}}>
                  <div style={{fontSize:11,color:'var(--muted)',display:'flex',alignItems:'center',justifyContent:'center',gap:5,marginBottom:4}}>
                    <Clock size={11}/>{t('bonus.nextClaim')}
                  </div>
                  <div className="mono" style={{fontSize:22,fontWeight:800,color:'#fff',letterSpacing:'-.02em'}}>{cooldown}</div>
                </div>
            }
          </div>
        </div>

        {/* Redeem section */}
        <div className="g fu" style={{padding:20,animationDelay:'70ms'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:14}}>
            <div style={{fontSize:15,fontWeight:700,color:'#fff'}}>{t('bonus.redeem')}</div>
            <span style={{fontSize:11,color:'var(--dim)'}}>{earned} {t('bonus.redeemed')}</span>
          </div>

          {/* Reward previews */}
          <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:10,marginBottom:14}}>
            {[
              {icon:'💰',label:t('bonus.balance3'),  desc:t('bonus.walletCredit'),  c:'var(--green)',  bg:'rgba(16,232,152,.07)',  bc:'rgba(16,232,152,.18)'},
              {icon:'🔑',label:t('bonus.key3Day'),   desc:t('bonus.fullAccess'),    c:'var(--purple)', bg:'rgba(139,92,246,.07)', bc:'rgba(139,92,246,.18)'},
            ].map(o=>(
              <div key={o.label} className="g" style={{padding:14,textAlign:'center',background:o.bg,borderColor:o.bc,transition:'border-color .2s,box-shadow .2s'}}
                onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=o.bc.replace('.18','.4');(e.currentTarget as HTMLDivElement).style.boxShadow=`0 0 20px ${o.bg.replace('.07','.2')}`;}}
                onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor=o.bc;(e.currentTarget as HTMLDivElement).style.boxShadow='none';}}>
                <div style={{fontSize:26,marginBottom:8}}>{o.icon}</div>
                <div style={{fontSize:13,fontWeight:700,color:'#fff',marginBottom:3}}>{o.label}</div>
                <div style={{fontSize:11,color:'var(--muted)',marginBottom:8}}>{o.desc}</div>
                <span className="badge" style={{color:o.c,background:o.bg,border:`1px solid ${o.bc}`,fontSize:10,fontWeight:700}}>100 pts</span>
              </div>
            ))}
          </div>

          <button onClick={handleOpenRedeem} disabled={bonusPoints < 100}
            className="btn btn-p btn-full btn-lg"
            style={bonusPoints < 100
              ? {background:'rgba(255,255,255,.04)',boxShadow:'none',color:'var(--muted)',border:'1px solid var(--border)'}
              : {boxShadow:'0 0 24px rgba(109,40,217,.35)',border:'none'}}>
            {bonusPoints >= 100
              ? `🎁 ${t('bonus.redeemBtn')} 100 pts`
              : `Need ${100-prog} ${t('bonus.needMore')}`
            }
          </button>
        </div>
      </div>
    </>
  );
}
