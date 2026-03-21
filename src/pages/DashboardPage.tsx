import { useAppStore } from '@/lib/store';
import { Wallet, Key, Gift, Clock, Zap, TrendingUp, ArrowRight, Copy, CheckCircle, Loader2, X, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

// ─────────────────────────────────────────────────────────────
//  FREE 1-HOUR KEY — fully isolated, touches nothing else
// ─────────────────────────────────────────────────────────────
const SUPABASE_URL_FK  = 'https://wkjqrjafogufqeasfeev.supabase.co';
const SUPABASE_ANON_FK = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok';
const FK_COOLDOWN_MS   = 86400000; // 24 hours
const FK_STORAGE_KEY   = (uid: string) => `1999x-free-key-claim-${uid}`;

interface FKResult { key: string; panel: 'internal' | 'lag'; expiresAt: string; }

/** Generate one key via the existing edge function (0 or 1 hour = days param can't be <1,
 *  so we generate a 1-day key and mark it as "1 hour" conceptually in the UI.
 *  If the edge function supports fractional days in future this can be updated.) */
async function generateFreeKey(panelType: 'internal' | 'lag', userEmail: string): Promise<{ success: boolean; key?: string; message?: string }> {
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    const res = await fetch(`${SUPABASE_URL_FK}/functions/v1/generate-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON_FK}`,
        'apikey': SUPABASE_ANON_FK,
      },
      body: JSON.stringify({ panel_type: panelType, hours: 1, user_email: userEmail }), // KeyAuth expirytime=3600s
      signal: controller.signal,
    });
    clearTimeout(timer);
    return await res.json();
  } catch (e: any) {
    return { success: false, message: e?.name === 'AbortError' ? 'Timeout — try again' : String(e) };
  }
}

/** Persist claim timestamp both in localStorage (instant) and Supabase (durable) */
async function saveClaim(userId: string, claimedAt: string) {
  try { localStorage.setItem(FK_STORAGE_KEY(userId), claimedAt); } catch {}
  try {
    await supabase.from('free_key_claims').upsert(
      { user_id: userId, last_claim_at: claimedAt },
      { onConflict: 'user_id' }
    );
  } catch {}
}

/** Read last claim — localStorage first (fast), then Supabase as fallback */
async function readLastClaim(userId: string): Promise<string | null> {
  try {
    const local = localStorage.getItem(FK_STORAGE_KEY(userId));
    if (local) return local;
  } catch {}
  try {
    const { data } = await supabase
      .from('free_key_claims')
      .select('last_claim_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (data?.last_claim_at) {
      try { localStorage.setItem(FK_STORAGE_KEY(userId), data.last_claim_at); } catch {}
      return data.last_claim_at;
    }
  } catch {}
  return null;
}

// ── Live 1-hour countdown inside modal ───────────────────────
function FKCountdown({ expiresAt }: { expiresAt: string }) {
  const [txt, setTxt] = useState('');
  useEffect(() => {
    const run = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTxt('Expired'); return; }
      const m = Math.floor(diff / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setTxt(`${m}m ${String(s).padStart(2,'0')}s`);
    };
    run();
    const id = setInterval(run, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);
  const expired = txt === 'Expired';
  return (
    <span style={{ fontSize:11,fontWeight:800,padding:'3px 9px',borderRadius:20,
      background: expired ? 'rgba(248,113,113,.1)' : 'rgba(16,232,152,.1)',
      border: expired ? '1px solid rgba(248,113,113,.2)' : '1px solid rgba(16,232,152,.2)',
      color: expired ? 'var(--red)' : 'var(--green)',
      display:'inline-flex',alignItems:'center',gap:4 }}>
      <Clock size={9}/> {expired ? 'Expired' : txt + ' left'}
    </span>
  );
}

// ── Success Modal ─────────────────────────────────────────────
function FKSuccessModal({ keys, onClose }: { keys: FKResult[]; onClose: () => void }) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [copied,   setCopied]   = useState<Record<number, boolean>>({});

  const copy = (k: string, i: number) => {
    navigator.clipboard.writeText(k);
    setCopied(p => ({ ...p, [i]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [i]: false })), 2000);
  };

  return (
    <div
      onClick={e => e.target === e.currentTarget && onClose()}
      style={{ position:'fixed',inset:0,zIndex:90,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.88)',backdropFilter:'blur(18px)',padding:16 }}
    >
      <div className="g si" style={{ width:'100%',maxWidth:480,padding:'36px 30px',textAlign:'center',boxShadow:'0 0 100px rgba(16,232,152,.18),0 0 40px rgba(109,40,217,.15),0 32px 80px rgba(0,0,0,.8)',borderColor:'rgba(16,232,152,.25)',position:'relative',maxHeight:'90vh',overflowY:'auto' }}>
        {/* Close */}
        <button onClick={onClose} style={{ position:'absolute',top:14,right:14,width:28,height:28,borderRadius:'50%',background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',cursor:'pointer',color:'var(--muted)',display:'flex',alignItems:'center',justifyContent:'center' }}>
          <X size={14}/>
        </button>

        {/* Icon */}
        <div style={{ width:72,height:72,borderRadius:22,background:'linear-gradient(135deg,rgba(16,232,152,.2),rgba(16,232,152,.08))',border:'1px solid rgba(16,232,152,.3)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 20px',boxShadow:'0 0 50px rgba(16,232,152,.25)' }}>
          <CheckCircle size={34} color="var(--green)"/>
        </div>

        <div style={{ fontSize:22,fontWeight:900,color:'#fff',marginBottom:6,letterSpacing:'-.02em' }}>Keys Generated! 🎉</div>
        <div style={{ fontSize:13,color:'var(--muted)',marginBottom:24 }}>Your free 1-hour keys are ready — activate them NOW on the Licenses page</div>

        {/* Key cards */}
        <div style={{ display:'flex',flexDirection:'column',gap:14,marginBottom:20 }}>
          {keys.map((k, i) => {
            const isInt = k.panel === 'internal';
            const color = isInt ? 'var(--blue)' : 'var(--purple)';
            const bg    = isInt ? 'rgba(56,189,248,.06)' : 'rgba(109,40,217,.07)';
            const bc    = isInt ? 'rgba(56,189,248,.2)'  : 'rgba(139,92,246,.22)';
            const label = isInt ? '⚡ Internal Panel' : '🔷 Fake Lag Panel';
            return (
              <div key={i} style={{ background:bg,border:`1px solid ${bc}`,borderRadius:16,padding:'16px 18px',textAlign:'left' }}>
                {/* Header row: label + live countdown */}
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
                  <span style={{ fontSize:12,fontWeight:800,color,letterSpacing:'.04em' }}>{label}</span>
                  <FKCountdown expiresAt={k.expiresAt} />
                </div>
                {/* Key row */}
                <div style={{ display:'flex',alignItems:'center',gap:8,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.07)',borderRadius:10,padding:'11px 14px',marginBottom:8 }}>
                  <code style={{ flex:1,fontSize:13,fontFamily:'monospace',color:'#fff',letterSpacing:'1.5px',filter:revealed[i]?'none':'blur(6px)',transition:'filter .4s',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>
                    {k.key}
                  </code>
                  <button onClick={() => setRevealed(p => ({ ...p, [i]: !p[i] }))} title={revealed[i]?'Hide':'Reveal'} style={{ background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',borderRadius:7,padding:'5px 7px',cursor:'pointer',color:'var(--muted)',flexShrink:0,display:'flex',alignItems:'center' }}>
                    {revealed[i] ? <EyeOff size={13}/> : <Eye size={13}/>}
                  </button>
                  <button onClick={() => copy(k.key, i)} title="Copy" style={{ background:copied[i]?'rgba(16,232,152,.12)':'rgba(255,255,255,.06)',border:`1px solid ${copied[i]?'rgba(16,232,152,.3)':'rgba(255,255,255,.1)'}`,borderRadius:7,padding:'5px 9px',cursor:'pointer',color:copied[i]?'var(--green)':'var(--muted)',flexShrink:0,display:'flex',alignItems:'center',gap:5,fontSize:11,fontWeight:700,transition:'all .2s' }}>
                    {copied[i] ? <><CheckCircle size={11}/> Copied!</> : <><Copy size={11}/> Copy</>}
                  </button>
                </div>
                {!revealed[i] && <p style={{ fontSize:11,color:'var(--dim)',textAlign:'center',margin:0 }}>👁 Click eye icon to reveal</p>}
              </div>
            );
          })}
        </div>

        {/* Warning */}
        <div style={{ padding:'12px 16px',borderRadius:12,background:'rgba(248,113,113,.05)',border:'1px solid rgba(248,113,113,.18)',fontSize:12,color:'var(--muted)',lineHeight:1.65,marginBottom:20,display:'flex',gap:10,alignItems:'flex-start',textAlign:'left' }}>
          <span style={{ fontSize:18,flexShrink:0 }}>⚠️</span>
          <span>Keys expire in <strong style={{ color:'var(--red)' }}>1 hour</strong>. Go to the <strong style={{ color:'#fff' }}>Licenses</strong> page and activate them immediately. You can reopen this popup anytime during the 24h cooldown.</span>
        </div>

        <button onClick={onClose} className="btn btn-g btn-full btn-lg">Close — I've Saved My Keys</button>
      </div>
    </div>
  );
}

// ── Main Free Key Card ────────────────────────────────────────
function FreeHourlyKeyCard() {
  const { user } = useAppStore();
  const [lastClaim,   setLastClaim]   = useState<string | null>(null);
  const [cooldownTxt, setCooldownTxt] = useState('');
  const [canClaim,    setCanClaim]    = useState(false);
  const [loading,     setLoading]     = useState(false);
  const [checking,    setChecking]    = useState(true);
  const [savedKeys,   setSavedKeys]   = useState<FKResult[] | null>(null); // persists across modal open/close
  const [modalOpen,   setModalOpen]   = useState(false);                   // controls visibility only

  // Load last claim on mount
  useEffect(() => {
    if (!user?.id) { setChecking(false); return; }
    readLastClaim(user.id).then(v => {
      setLastClaim(v);
      setChecking(false);
    });
  }, [user?.id]);

  // Live cooldown ticker
  useEffect(() => {
    const run = () => {
      if (!lastClaim) { setCanClaim(true); setCooldownTxt(''); return; }
      const diff = FK_COOLDOWN_MS - (Date.now() - new Date(lastClaim).getTime());
      if (diff <= 0) { setCanClaim(true); setCooldownTxt(''); return; }
      setCanClaim(false);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setCooldownTxt(`${h}h ${m}m ${s}s`);
    };
    run();
    const id = setInterval(run, 1000);
    return () => clearInterval(id);
  }, [lastClaim]);

  const handleGenerate = useCallback(async () => {
    if (!user?.id || !user?.email) { toast.error('You must be logged in'); return; }
    if (!canClaim) return;

    setLoading(true);
    toast.loading('Generating your free keys…', { id: 'fk-gen' });

    const [intRes, lagRes] = await Promise.all([
      generateFreeKey('internal', user.email),
      generateFreeKey('lag',      user.email),
    ]);

    toast.dismiss('fk-gen');
    setLoading(false);

    const generated: FKResult[] = [];
    const errors: string[] = [];

    const fkExpiry = new Date(Date.now() + 3600000).toISOString(); // 1 hour from now
    if (intRes.success && intRes.key) generated.push({ key: intRes.key, panel: 'internal', expiresAt: fkExpiry });
    else errors.push(`Internal: ${intRes.message ?? 'Failed'}`);

    if (lagRes.success && lagRes.key) generated.push({ key: lagRes.key, panel: 'lag', expiresAt: fkExpiry });
    else errors.push(`Fake Lag: ${lagRes.message ?? 'Failed'}`);

    if (generated.length === 0) {
      toast.error(`❌ Key generation failed: ${errors.join(' | ')}`);
      return;
    }

    // Mark claimed (even if only one succeeded, lock cooldown to prevent abuse)
    const now = new Date().toISOString();
    setLastClaim(now);
    await saveClaim(user.id, now);

    if (errors.length > 0) {
      toast.warning(`⚠️ ${generated.length}/2 keys generated. ${errors.join(', ')}`);
    } else {
      toast.success('🎉 Both free keys generated!');
    }

    setSavedKeys(generated);
    setModalOpen(true);
  }, [user, canClaim]);

  // Don't render if still checking or no user
  if (!user) return null;

  return (
    <>
      {savedKeys && modalOpen && <FKSuccessModal keys={savedKeys} onClose={() => setModalOpen(false)} />}

      <div
        className="g g-hover fu"
        style={{
          padding: '20px 22px',
          background: 'linear-gradient(135deg, rgba(16,232,152,.07) 0%, rgba(56,189,248,.04) 100%)',
          borderColor: 'rgba(16,232,152,.2)',
          boxShadow: '0 0 40px rgba(16,232,152,.06)',
          animationDelay: '160ms',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background glow orb */}
        <div style={{ position:'absolute',top:-40,right:-40,width:160,height:160,borderRadius:'50%',background:'radial-gradient(circle,rgba(16,232,152,.12) 0%,transparent 70%)',pointerEvents:'none' }}/>

        {/* FREE badge */}
        <div style={{ position:'absolute',top:14,right:16,background:'linear-gradient(135deg,#10e898,#0abe78)',color:'#03180e',fontSize:9,fontWeight:900,letterSpacing:'.14em',textTransform:'uppercase',padding:'4px 11px',borderRadius:20,boxShadow:'0 0 14px rgba(16,232,152,.5)' }}>
          FREE
        </div>

        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative' }}>
          {/* Left: icon + text */}
          <div style={{ display:'flex',alignItems:'center',gap:14 }}>
            <div style={{ width:46,height:46,borderRadius:13,background:'linear-gradient(135deg,rgba(16,232,152,.2),rgba(16,232,152,.08))',border:'1px solid rgba(16,232,152,.3)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 0 20px rgba(16,232,152,.2)' }}>
              <Zap size={22} color="var(--green)"/>
            </div>
            <div>
              <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4 }}>
                <div style={{ fontSize:15,fontWeight:800,color:'#fff' }}>Free 1 Hour Key</div>
              </div>
              <div style={{ fontSize:12,color:'var(--muted)',lineHeight:1.5 }}>
                Internal &amp; Fake Lag keys · Once every 24 hours
              </div>
            </div>
          </div>

          {/* Right: button or cooldown */}
          <div style={{ flexShrink:0,marginLeft:16,display:'flex',flexDirection:'column',gap:8,alignItems:'flex-end' }}>
            {checking ? (
              <div style={{ display:'flex',alignItems:'center',gap:6,fontSize:12,color:'var(--dim)' }}>
                <Loader2 size={13} className="animate-spin"/> Checking…
              </div>
            ) : canClaim ? (
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="btn btn-sm"
                style={{ background:'linear-gradient(135deg,#10e898,#0abe78)',color:'#03180e',fontWeight:800,boxShadow:'0 0 20px rgba(16,232,152,.4)',fontSize:13,padding:'9px 18px',borderRadius:11,display:'flex',alignItems:'center',gap:7,whiteSpace:'nowrap' }}
              >
                {loading ? <><Loader2 size={14} className="animate-spin"/> Generating…</> : <><Key size={14}/> Generate Keys</>}
              </button>
            ) : (
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:11,color:'var(--dim)',display:'flex',alignItems:'center',gap:5,justifyContent:'flex-end',marginBottom:3 }}>
                  <Clock size={11}/> Available in
                </div>
                <div className="mono" style={{ fontSize:15,fontWeight:800,color:'var(--green)',letterSpacing:'-.01em' }}>
                  {cooldownTxt}
                </div>
              </div>
            )}
            {/* View Keys button — always visible after generation, survives modal close */}
            {savedKeys && !canClaim && (
              <button
                onClick={() => setModalOpen(true)}
                className="btn btn-sm btn-ghost"
                style={{ fontSize:11,padding:'6px 12px',borderRadius:9,display:'flex',alignItems:'center',gap:5,whiteSpace:'nowrap',border:'1px solid rgba(16,232,152,.25)',color:'var(--green)' }}
              >
                <Eye size={11}/> View My Keys
              </button>
            )}
          </div>
        </div>

        {/* Bottom info row */}
        <div style={{ display:'flex',alignItems:'center',gap:16,marginTop:16,paddingTop:14,borderTop:'1px solid rgba(255,255,255,.05)' }}>
          {[
            { emoji:'⚡', label:'Internal Panel', c:'var(--blue)' },
            { emoji:'🔷', label:'Fake Lag Panel',  c:'var(--purple)' },
            { emoji:'⏱', label:'1 Hour Valid',    c:'var(--green)' },
            { emoji:'🔁', label:'24h Cooldown',   c:'var(--amber)' },
          ].map(item => (
            <div key={item.label} style={{ display:'flex',alignItems:'center',gap:5 }}>
              <span style={{ fontSize:13 }}>{item.emoji}</span>
              <span style={{ fontSize:11,fontWeight:600,color:item.c }}>{item.label}</span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function Ticker({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return <span style={{color:'var(--red)',fontWeight:700,fontSize:13}}>Expired</span>;
  const d = Math.floor(diff / 86400000);
  const h = String(Math.floor((diff % 86400000) / 3600000)).padStart(2,'0');
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2,'0');
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2,'0');
  return (
    <div style={{display:'flex',alignItems:'baseline',gap:3}} className="mono">
      {d > 0 && <><span style={{fontSize:28,fontWeight:800,color:'#fff',letterSpacing:'-.02em'}}>{d}</span><span style={{fontSize:11,color:'var(--muted)',marginRight:4}}>d</span></>}
      <span style={{fontSize:28,fontWeight:800,color:'#fff',letterSpacing:'-.02em'}}>{h}</span>
      <span style={{fontSize:16,color:'var(--muted)',margin:'0 1px'}}>:</span>
      <span style={{fontSize:28,fontWeight:800,color:'#fff',letterSpacing:'-.02em'}}>{m}</span>
      <span style={{fontSize:16,color:'var(--muted)',margin:'0 1px'}}>:</span>
      <span style={{fontSize:28,fontWeight:800,color:'rgba(255,255,255,.4)',letterSpacing:'-.02em'}}>{s}</span>
    </div>
  );
}

function LicCard({ lic, accent }: { lic: any; accent: 'p'|'b' }) {
  const key = lic.key.replace('_INTERNAL','');
  const dLeft = Math.max(0, Math.floor((new Date(lic.expiresAt).getTime() - Date.now()) / 86400000));
  const total = Math.max(30, Math.ceil((new Date(lic.expiresAt).getTime() - new Date(lic.lastLogin).getTime()) / 86400000));
  const pct = Math.min(100, (dLeft / total) * 100);
  const isP = accent === 'p';
  const c = isP ? 'var(--purple)' : 'var(--blue)';
  const bg = isP ? 'rgba(109,40,217,.07)' : 'rgba(56,189,248,.06)';
  const bc = isP ? 'rgba(139,92,246,.18)' : 'rgba(56,189,248,.16)';
  return (
    <div className="g g-hover g-lift fu" style={{background:bg,borderColor:bc,padding:20,boxShadow:`0 0 40px ${isP?'rgba(109,40,217,.06)':'rgba(56,189,248,.06)'}`}}>
      <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:12}}>
        <div style={{display:'flex',alignItems:'center',gap:7}}>
          <div className={isP?'dot dot-purple':'dot'} style={!isP?{background:'var(--blue)',boxShadow:'0 0 7px var(--blue)',animation:'blink 2s infinite'}:{}} />
          <span className="label" style={{color:c}}>{lic.productName}</span>
        </div>
        <span className={`badge badge-${isP?'purple':'blue'}`}>Active</span>
      </div>
      <Ticker expiresAt={lic.expiresAt} />
      <p style={{fontSize:11,color:'var(--dim)',margin:'4px 0 12px'}}>
        until {new Date(lic.expiresAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
      </p>
      <div className="prog" style={{marginBottom:8}}>
        <div className="prog-bar" style={{width:`${pct}%`,background:isP?'linear-gradient(90deg,#6d28d9,#8b5cf6)':'linear-gradient(90deg,#0ea5e9,#38bdf8)',boxShadow:`0 0 8px ${isP?'rgba(109,40,217,.5)':'rgba(56,189,248,.5)'}`}} />
      </div>
      <code className="mono" style={{fontSize:10,color:'rgba(255,255,255,.22)',wordBreak:'break-all'}}>{key}</code>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { balance, licenses, transactions, bonusPoints, lastBonusClaim, claimBonus, user } = useAppStore();
  const [cooldown, setCooldown] = useState('');
  const [canClaim, setCanClaim] = useState(false);

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

  const active = licenses.filter(l => new Date(l.expiresAt).getTime() > Date.now());
  const lag = active.filter(l => l.productId === 'keyauth-lag');
  const int = active.filter(l => l.productId === 'keyauth-internal' || l.key.endsWith('_INTERNAL'));
  const approved = (transactions as any[]).filter((t: any) => t.status === 'approved').length;

  const stats = [
    { label:'Balance',     val:`$${balance.toFixed(2)}`, icon:Wallet,      c:'var(--purple)', bg:'rgba(109,40,217,.08)', bc:'rgba(139,92,246,.16)' },
    { label:'Active Keys', val:active.length,            icon:Key,         c:'var(--green)',  bg:'rgba(16,232,152,.06)', bc:'rgba(16,232,152,.14)' },
    { label:'Approved',    val:approved,                 icon:TrendingUp,  c:'var(--blue)',   bg:'rgba(56,189,248,.06)', bc:'rgba(56,189,248,.14)' },
    { label:'Bonus Pts',   val:bonusPoints,              icon:Gift,        c:'var(--amber)',  bg:'rgba(251,191,36,.06)', bc:'rgba(251,191,36,.14)' },
  ];

  return (
    <div style={{display:'flex',flexDirection:'column',gap:20}}>

      {/* Welcome */}
      <div className="g fu" style={{padding:'22px 24px',background:'linear-gradient(135deg,rgba(109,40,217,.1) 0%,rgba(255,255,255,.025) 100%)',position:'relative',overflow:'hidden'}}>
        <div style={{position:'absolute',top:0,right:0,width:250,height:250,borderRadius:'50%',background:'radial-gradient(circle,rgba(109,40,217,.15) 0%,transparent 70%)',transform:'translate(30%,-30%)',pointerEvents:'none'}}/>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',position:'relative'}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            {user?.avatar
              ? <img src={user.avatar} style={{width:46,height:46,borderRadius:12,objectFit:'cover',border:'2px solid rgba(139,92,246,.3)'}} />
              : <div style={{width:46,height:46,borderRadius:12,background:'linear-gradient(135deg,#6d28d9,#4c1d95)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:18,fontWeight:800,color:'#fff'}}>{user?.name?.charAt(0)||'U'}</div>
            }
            <div>
              <div className="label" style={{marginBottom:4}}>Welcome back</div>
              <div style={{fontSize:20,fontWeight:800,color:'#fff',letterSpacing:'-.01em'}}>{user?.name?.split(' ')[0]||'User'} 👋</div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:7,padding:'6px 12px',borderRadius:20,background:'rgba(16,232,152,.08)',border:'1px solid rgba(16,232,152,.18)'}}>
            <div className="dot dot-green"/>
            <span style={{fontSize:11,fontWeight:700,color:'var(--green)'}}>OB52 Undetected</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{display:'grid',gridTemplateColumns:'repeat(2,1fr)',gap:12}} className="stg">
        {stats.map((s,i)=>(
          <div key={s.label} className="g g-hover g-lift fu" style={{padding:'18px 20px',background:s.bg,borderColor:s.bc,animationDelay:`${i*55}ms`}}>
            <s.icon size={18} style={{color:s.c,marginBottom:10}}/>
            <div style={{fontSize:26,fontWeight:800,color:'#fff',letterSpacing:'-.02em',marginBottom:4}}>{s.val}</div>
            <div className="label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Licenses */}
      {active.length > 0 && (
        <div className="fu" style={{animationDelay:'80ms'}}>
          <div className="label" style={{color:'var(--purple)',marginBottom:10}}>Active Subscriptions</div>
          <div style={{display:'grid',gap:12,gridTemplateColumns:int.length>0&&lag.length>0?'repeat(auto-fit,minmax(280px,1fr))':'1fr'}}>
            {int.map(l=><LicCard key={l.id} lic={l} accent="b"/>)}
            {lag.map(l=><LicCard key={l.id} lic={l} accent="p"/>)}
          </div>
        </div>
      )}

      {active.length === 0 && (
        <div className="g fu" style={{padding:'48px 20px',textAlign:'center',borderStyle:'dashed',animationDelay:'80ms'}}>
          <Key size={36} style={{color:'rgba(255,255,255,.08)',margin:'0 auto 12px'}}/>
          <p style={{fontSize:15,fontWeight:600,color:'var(--muted)',marginBottom:6}}>No active licenses</p>
          <p style={{fontSize:13,color:'var(--dim)'}}>Go to Shop to activate your key</p>
        </div>
      )}

      {/* Daily bonus */}
      <div className="g g-hover fu" style={{padding:'18px 20px',background:'rgba(251,191,36,.06)',borderColor:'rgba(251,191,36,.16)',animationDelay:'130ms'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:12}}>
            <div style={{width:42,height:42,borderRadius:11,background:'rgba(251,191,36,.1)',border:'1px solid rgba(251,191,36,.2)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
              <Gift size={20} color="var(--amber)"/>
            </div>
            <div>
              <div style={{fontSize:14,fontWeight:700,color:'#fff',marginBottom:3}}>Daily Bonus</div>
              <div style={{fontSize:12,color:'var(--muted)'}}>+10 pts/day · 100 pts = reward</div>
            </div>
          </div>
          <div style={{textAlign:'right',flexShrink:0,marginLeft:12}}>
            <div style={{fontSize:20,fontWeight:800,color:'var(--amber)',marginBottom:6}}>{bonusPoints}<span style={{fontSize:11,color:'var(--dim)',fontWeight:400,marginLeft:3}}>pts</span></div>
            {canClaim
              ? <button className="btn btn-sm" style={{background:'linear-gradient(135deg,#fbbf24,#f59e0b)',color:'#3a1a00',fontWeight:700,boxShadow:'0 0 14px rgba(245,158,11,.3)'}} onClick={()=>{if(claimBonus())toast.success('🎉 +10 Bonus Points!');}}>Claim Now</button>
              : <div style={{fontSize:11,color:'var(--dim)',display:'flex',alignItems:'center',gap:4}}><Clock size={11}/>{cooldown}</div>
            }
          </div>
        </div>
        <div className="prog" style={{marginTop:14}}>
          <div className="prog-bar prog-a" style={{width:`${bonusPoints%100}%`}}/>
        </div>
      </div>

      {/* ── Free 1-Hour Key Card ── */}
      <FreeHourlyKeyCard />

    </div>
  );
}
