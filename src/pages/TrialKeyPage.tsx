import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { Clock, Key, Copy, Eye, EyeOff, CheckCircle, Loader2, Shield, Zap, RefreshCw, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_URL  = 'https://wkjqrjafogufqeasfeev.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok';

const TRIAL_DURATION_MS = 60 * 60 * 1000; // 1 hour

interface TrialRecord {
  lag_key: string;
  internal_key: string;
  expires_at: string;
  generated_at: string;
}

// Generate key via existing Supabase edge function
async function generateTrialKey(panelType: 'lag' | 'internal'): Promise<{ success: boolean; key?: string; message?: string }> {
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_ANON}`,
        'apikey': SUPABASE_ANON,
      },
      body: JSON.stringify({ panel_type: panelType, days: 1 }),
    });
    return await res.json();
  } catch (e) {
    return { success: false, message: String(e) };
  }
}

// Fetch trial record from DB (enforces one-per-UID server-side via UNIQUE constraint)
async function fetchTrialRecord(userId: string): Promise<TrialRecord | null> {
  try {
    const { data, error } = await supabase
      .from('trial_keys')
      .select('lag_key, internal_key, expires_at, generated_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error || !data) return null;
    return data as TrialRecord;
  } catch { return null; }
}

// Store trial record — UNIQUE(user_id) in DB makes this idempotent
async function storeTrialRecord(userId: string, userEmail: string, record: TrialRecord): Promise<boolean> {
  try {
    const { error } = await supabase.from('trial_keys').insert({
      user_id:      userId,
      user_email:   userEmail,
      lag_key:      record.lag_key,
      internal_key: record.internal_key,
      expires_at:   record.expires_at,
      generated_at: record.generated_at,
    });
    return !error;
  } catch { return false; }
}

// ── Countdown component ───────────────────────────────────────
function Countdown({ expiresAt, onExpire }: { expiresAt: string; onExpire: () => void }) {
  const [remaining, setRemaining] = useState(0);
  const [pct, setPct]             = useState(100);
  const firedRef                  = useRef(false);

  useEffect(() => {
    const expMs = new Date(expiresAt).getTime();
    const tick = () => {
      const left = expMs - Date.now();
      if (left <= 0) {
        setRemaining(0); setPct(0);
        if (!firedRef.current) { firedRef.current = true; onExpire(); }
        return;
      }
      setRemaining(left);
      setPct(Math.max(0, (left / TRIAL_DURATION_MS) * 100));
    };
    tick();
    const i = setInterval(tick, 1000);
    return () => clearInterval(i);
  }, [expiresAt]);

  const h = Math.floor(remaining / 3600000);
  const m = Math.floor((remaining % 3600000) / 60000);
  const s = Math.floor((remaining % 60000) / 1000);
  const isLow = remaining > 0 && remaining < 10 * 60 * 1000;

  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        padding: '7px 18px', borderRadius: 40,
        background: isLow ? 'rgba(248,113,113,.1)' : remaining > 0 ? 'rgba(16,232,152,.08)' : 'rgba(248,113,113,.1)',
        border: `1px solid ${isLow || remaining <= 0 ? 'rgba(248,113,113,.25)' : 'rgba(16,232,152,.22)'}`,
        marginBottom: 16,
      }}>
        <Clock size={12} color={isLow || remaining <= 0 ? 'var(--red)' : 'var(--green)'} />
        <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '.06em',
          color: isLow || remaining <= 0 ? 'var(--red)' : 'var(--green)' }}>
          {remaining > 0 ? 'TRIAL ACTIVE' : 'TRIAL EXPIRED'}
        </span>
      </div>

      {/* Large timer */}
      <div style={{ fontSize: 56, fontWeight: 900, color: '#fff', letterSpacing: '-.03em', lineHeight: 1, marginBottom: 6, fontFamily: 'monospace' }}>
        <span style={{ color: isLow ? 'var(--red)' : '#fff' }}>{String(h).padStart(2,'0')}</span>
        <span style={{ color: 'rgba(255,255,255,.25)', margin: '0 3px' }}>:</span>
        <span style={{ color: isLow ? 'var(--red)' : '#fff' }}>{String(m).padStart(2,'0')}</span>
        <span style={{ color: 'rgba(255,255,255,.25)', margin: '0 3px' }}>:</span>
        <span style={{ color: 'rgba(255,255,255,.35)' }}>{String(s).padStart(2,'0')}</span>
      </div>
      <div style={{ fontSize: 10, color: 'var(--dim)', marginBottom: 18, letterSpacing: '.08em', textTransform: 'uppercase' }}>
        Hours · Minutes · Seconds
      </div>

      {/* Progress bar */}
      <div style={{ height: 5, borderRadius: 5, background: 'rgba(255,255,255,.06)', overflow: 'hidden', marginBottom: 6 }}>
        <div style={{
          height: '100%', borderRadius: 5,
          background: isLow
            ? 'linear-gradient(90deg,#ef4444,#f87171)'
            : 'linear-gradient(90deg,#6d28d9,#10e898)',
          width: `${pct}%`,
          transition: 'width 1s linear',
          boxShadow: isLow ? '0 0 8px rgba(248,113,113,.5)' : '0 0 8px rgba(16,232,152,.4)',
        }} />
      </div>
      <div style={{ fontSize: 10, color: 'var(--dim)' }}>{Math.round(pct)}% remaining</div>
    </div>
  );
}

// ── Single key card ───────────────────────────────────────────
function KeyCard({ label, keyVal, accent, icon }: {
  label: string; keyVal: string; accent: string; icon: string;
}) {
  const [revealed, setRevealed] = useState(false);
  const [copied,   setCopied]   = useState(false);

  const copy = () => {
    navigator.clipboard.writeText(keyVal);
    setCopied(true);
    toast.success(`${label} key copied!`);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{
      background: 'rgba(255,255,255,.03)',
      border: `1px solid rgba(255,255,255,.09)`,
      borderRadius: 16, padding: '18px 20px',
    }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:12 }}>
        <span style={{ fontSize:18 }}>{icon}</span>
        <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{label}</span>
        <span style={{
          marginLeft:'auto', fontSize:9, fontWeight:800, padding:'3px 9px', borderRadius:20,
          background:`${accent}18`, border:`1px solid ${accent}40`, color:accent, letterSpacing:'.08em',
          textTransform:'uppercase',
        }}>1H TRIAL</span>
      </div>

      <div style={{
        position:'relative', background:'rgba(0,0,0,.3)',
        border:'1px solid rgba(255,255,255,.07)', borderRadius:10,
        padding:'13px 44px 13px 14px', marginBottom:10,
      }}>
        <code style={{
          fontSize:13, fontFamily:'monospace', color:'#fff', letterSpacing:'1.5px',
          filter: revealed ? 'none' : 'blur(6px)', transition:'filter .4s ease',
          wordBreak:'break-all', userSelect: revealed ? 'text' : 'none',
          display:'block',
        }}>
          {keyVal || 'KEY-NOT-AVAILABLE'}
        </code>
        <button onClick={() => setRevealed(r => !r)} style={{
          position:'absolute', right:8, top:'50%', transform:'translateY(-50%)',
          background:'rgba(255,255,255,.07)', border:'1px solid rgba(255,255,255,.1)',
          borderRadius:8, padding:'5px 7px', cursor:'pointer', color:'var(--muted)',
          display:'flex', alignItems:'center',
        }}>
          {revealed ? <EyeOff size={13}/> : <Eye size={13}/>}
        </button>
      </div>

      {!revealed && (
        <p style={{ fontSize:11, color:'var(--dim)', textAlign:'center', margin:'0 0 10px' }}>
          Click 👁 to reveal key
        </p>
      )}

      <button onClick={copy} style={{
        width:'100%', padding:'10px', borderRadius:10, fontSize:13, fontWeight:700,
        cursor:'pointer', border:`1px solid ${accent}35`,
        background: copied ? `${accent}18` : 'rgba(255,255,255,.04)',
        color: copied ? accent : 'var(--muted)', fontFamily:'inherit',
        transition:'all .2s', display:'flex', alignItems:'center', justifyContent:'center', gap:7,
      }}>
        {copied ? <><CheckCircle size={13} color={accent}/> Copied!</> : <><Copy size={13}/> Copy Key</>}
      </button>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────
export default function TrialKeyPage() {
  const { user, addLicense } = useAppStore();
  const [trial,     setTrial]     = useState<TrialRecord | null>(null);
  const [loading,   setLoading]   = useState(true);
  const [generating,setGenerating]= useState(false);
  const [expired,   setExpired]   = useState(false);
  const [checked,   setChecked]   = useState(false);

  // Load trial from server on mount
  useEffect(() => {
    if (!user) { setLoading(false); return; }
    fetchTrialRecord(user.id).then(record => {
      if (record) {
        setTrial(record);
        setExpired(new Date(record.expires_at).getTime() < Date.now());
      }
      setChecked(true);
      setLoading(false);
    });
  }, [user?.id]);

  const handleGenerate = async () => {
    if (!user || generating) return;
    setGenerating(true);
    toast.loading('Generating your 1-hour trial keys...', { id: 'trial-gen' });

    try {
      // Generate both panels in parallel
      const [lagRes, intRes] = await Promise.all([
        generateTrialKey('lag'),
        generateTrialKey('internal'),
      ]);

      if (!lagRes.success && !intRes.success) {
        toast.dismiss('trial-gen');
        toast.error('Key generation failed: ' + (lagRes.message || intRes.message));
        setGenerating(false);
        return;
      }

      const expiresAt    = new Date(Date.now() + TRIAL_DURATION_MS).toISOString();
      const generatedAt  = new Date().toISOString();
      const record: TrialRecord = {
        lag_key:      lagRes.success && lagRes.key ? lagRes.key : '',
        internal_key: intRes.success && intRes.key ? intRes.key : '',
        expires_at:   expiresAt,
        generated_at: generatedAt,
      };

      // Store server-side (UNIQUE user_id blocks second generation)
      const stored = await storeTrialRecord(user.id, user.email, record);
      if (!stored) {
        // Check if user already had a trial (race condition)
        const existing = await fetchTrialRecord(user.id);
        if (existing) {
          setTrial(existing);
          setExpired(new Date(existing.expires_at).getTime() < Date.now());
          toast.dismiss('trial-gen');
          toast.info('You already have a trial record.');
          setGenerating(false);
          return;
        }
        toast.dismiss('trial-gen');
        toast.error('Failed to save trial. Please try again.');
        setGenerating(false);
        return;
      }

      // Add to local license store so it appears on Licenses page
      if (record.lag_key) {
        addLicense({
          id: `trial_lag_${Math.random().toString(36).slice(2,10)}`,
          productId: 'keyauth-lag', productName: 'Fake Lag (1h Trial)',
          key: record.lag_key, hwid: '', lastLogin: generatedAt,
          expiresAt, status: 'active', ip: '', device: '',
          hwidResetsUsed: 0, hwidResetMonth: new Date().getMonth(),
        });
      }
      if (record.internal_key) {
        addLicense({
          id: `trial_int_${Math.random().toString(36).slice(2,10)}`,
          productId: 'keyauth-internal', productName: 'Internal (1h Trial)',
          key: record.internal_key + '_INTERNAL', hwid: '', lastLogin: generatedAt,
          expiresAt, status: 'active', ip: '', device: '',
          hwidResetsUsed: 0, hwidResetMonth: new Date().getMonth(),
        });
      }

      setTrial(record);
      setExpired(false);
      toast.dismiss('trial-gen');
      toast.success('🎉 1-hour trial keys generated! Both panels ready.');
    } catch (e) {
      toast.dismiss('trial-gen');
      toast.error('Error: ' + String(e));
    }
    setGenerating(false);
  };

  const hasUsed    = trial !== null;
  const isExpired  = trial ? (expired || new Date(trial.expires_at).getTime() < Date.now()) : false;

  // ── Loading ──
  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', padding:'80px 20px', gap:12, flexDirection:'column' }}>
        <Loader2 size={22} className="animate-spin" style={{ color:'var(--purple)' }}/>
        <span style={{ fontSize:13, color:'var(--muted)' }}>Checking trial eligibility...</span>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, maxWidth:640, margin:'0 auto' }}>
      <style>{`
        @keyframes trialPulse { 0%,100%{box-shadow:0 0 0 0 rgba(139,92,246,.3);} 60%{box-shadow:0 0 0 14px rgba(139,92,246,0);} }
        .trial-pulse { animation: trialPulse 2.5s ease-in-out infinite; }
      `}</style>

      {/* ── Header card ── */}
      <div className="g fu" style={{
        padding:'26px 28px 22px',
        background:'linear-gradient(135deg,rgba(109,40,217,.12) 0%,rgba(16,232,152,.04) 100%)',
        borderColor:'rgba(139,92,246,.22)', position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:-50, right:-40, width:180, height:180, borderRadius:'50%',
          background:'radial-gradient(circle,rgba(109,40,217,.2) 0%,transparent 70%)', pointerEvents:'none' }}/>
        <div style={{ display:'flex', alignItems:'flex-start', gap:16, position:'relative' }}>
          <div style={{ width:52, height:52, borderRadius:16,
            background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0,
            boxShadow:'0 0 28px rgba(109,40,217,.5)' }}>
            <Zap size={26} color="#fff"/>
          </div>
          <div style={{ flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:6 }}>
              <h2 style={{ fontSize:21, fontWeight:900, color:'#fff', margin:0, letterSpacing:'-.02em' }}>
                Free 1-Hour Trial
              </h2>
              <span style={{ fontSize:9, fontWeight:800, padding:'3px 9px', borderRadius:20,
                background:'rgba(16,232,152,.12)', border:'1px solid rgba(16,232,152,.28)',
                color:'var(--green)', letterSpacing:'.08em', textTransform:'uppercase' }}>ONE-TIME</span>
            </div>
            <p style={{ fontSize:13, color:'var(--muted)', margin:0, lineHeight:1.6 }}>
              Get <strong style={{ color:'#fff' }}>both Internal &amp; Fake Lag</strong> keys free for 1 hour.
              One trial per Gmail — server-verified, no duplicates possible.
            </p>
          </div>
        </div>

        <div style={{ display:'flex', flexWrap:'wrap', gap:8, marginTop:16, position:'relative' }}>
          {[{e:'⚡',t:'Both Panels'},{e:'🔒',t:'Gmail Bound'},{e:'🛡️',t:'OB52 Ready'},{e:'⏱️',t:'60 Min Access'},{e:'🔑',t:'KeyAuth Verified'}].map(b=>(
            <span key={b.t} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11,
              color:'var(--muted)', background:'rgba(255,255,255,.05)',
              border:'1px solid rgba(255,255,255,.08)', padding:'4px 11px', borderRadius:20 }}>
              {b.e} {b.t}
            </span>
          ))}
        </div>
      </div>

      {/* ── Never used — generate button ── */}
      {!hasUsed && checked && (
        <div className="g" style={{
          padding:'40px 28px', textAlign:'center',
          borderColor:'rgba(139,92,246,.18)', background:'rgba(109,40,217,.04)',
        }}>
          <div style={{ width:76, height:76, borderRadius:24,
            background:'linear-gradient(135deg,rgba(109,40,217,.18),rgba(16,232,152,.06))',
            border:'1px solid rgba(139,92,246,.28)',
            display:'flex', alignItems:'center', justifyContent:'center',
            margin:'0 auto 22px', boxShadow:'0 0 40px rgba(109,40,217,.22)' }}>
            <Key size={34} color="var(--purple)"/>
          </div>

          <div style={{ fontSize:21, fontWeight:800, color:'#fff', marginBottom:10 }}>
            Try 1999X Free for 1 Hour
          </div>
          <p style={{ fontSize:13, color:'var(--muted)', marginBottom:30, lineHeight:1.65, maxWidth:360, margin:'0 auto 30px' }}>
            Instantly generate a <strong style={{ color:'#fff' }}>free 1-hour trial</strong> for both the
            Internal panel and Fake Lag — no payment needed.<br/>
            <span style={{ fontSize:11, color:'var(--dim)' }}>One trial per Gmail account, enforced server-side.</span>
          </p>

          <button
            onClick={handleGenerate}
            disabled={generating}
            className="trial-pulse"
            style={{
              display:'inline-flex', alignItems:'center', justifyContent:'center', gap:10,
              padding:'16px 44px', borderRadius:16,
              background: generating ? 'rgba(139,92,246,.3)' : 'linear-gradient(135deg,#8b5cf6,#6d28d9)',
              border:'none', color:'#fff', fontSize:16, fontWeight:800,
              cursor: generating ? 'not-allowed' : 'pointer', fontFamily:'inherit',
              boxShadow: generating ? 'none' : '0 0 40px rgba(109,40,217,.55), 0 8px 24px rgba(0,0,0,.3)',
              transition:'all .25s', opacity: generating ? .7 : 1,
            }}
            onMouseEnter={e=>{ if(!generating)(e.currentTarget as HTMLButtonElement).style.transform='translateY(-2px)'; }}
            onMouseLeave={e=>{ (e.currentTarget as HTMLButtonElement).style.transform='none'; }}
          >
            {generating
              ? <><Loader2 size={18} className="animate-spin"/> Generating Keys...</>
              : <><Zap size={18}/> Get Free 1-Hour Trial</>
            }
          </button>

          <div style={{ marginTop:22, display:'flex', alignItems:'center', justifyContent:'center', gap:18 }}>
            {[{I:Shield,t:'Server verified'},{I:Key,t:'Instant delivery'},{I:RefreshCw,t:'Both panels'}].map(({I,t})=>(
              <span key={t} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--dim)' }}>
                <I size={11}/> {t}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Has trial — show timer + keys ── */}
      {hasUsed && trial && (
        <div className="g" style={{
          padding:'28px',
          borderColor: isExpired ? 'rgba(248,113,113,.2)' : 'rgba(139,92,246,.22)',
          background: isExpired ? 'rgba(248,113,113,.03)' : 'rgba(109,40,217,.04)',
        }}>
          {!isExpired ? (
            <>
              <Countdown expiresAt={trial.expires_at} onExpire={() => setExpired(true)} />

              <div style={{ display:'flex', flexDirection:'column', gap:12, marginTop:24 }}>
                {trial.internal_key && (
                  <KeyCard label="Internal Panel" keyVal={trial.internal_key} accent="#4ade80" icon="⚡"/>
                )}
                {trial.lag_key && (
                  <KeyCard label="Fake Lag Panel" keyVal={trial.lag_key} accent="#a5b4fc" icon="🔷"/>
                )}
                {!trial.internal_key && !trial.lag_key && (
                  <div style={{ padding:'16px', textAlign:'center', borderRadius:12, background:'rgba(248,113,113,.06)', border:'1px solid rgba(248,113,113,.15)', color:'#f87171', fontSize:13 }}>
                    No keys were generated. Please contact support.
                  </div>
                )}
              </div>
            </>
          ) : (
            /* Expired state */
            <div style={{ textAlign:'center', padding:'12px 0' }}>
              <div style={{ width:60, height:60, borderRadius:'50%',
                background:'rgba(248,113,113,.1)', border:'1px solid rgba(248,113,113,.22)',
                display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px',
                boxShadow:'0 0 30px rgba(248,113,113,.15)' }}>
                <Clock size={28} color="var(--red)"/>
              </div>
              <div style={{ fontSize:20, fontWeight:800, color:'var(--red)', marginBottom:8 }}>Trial Expired</div>
              <p style={{ fontSize:13, color:'var(--muted)', maxWidth:320, margin:'0 auto' }}>
                Your 1-hour trial has ended. Purchase a full license below to continue.
              </p>
            </div>
          )}

          {/* Metadata */}
          <div style={{ marginTop:20, padding:'10px 14px', borderRadius:10,
            background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.05)',
            display:'flex', alignItems:'center', gap:9 }}>
            <Shield size={13} color="var(--dim)" style={{ flexShrink:0 }}/>
            <span style={{ fontSize:11, color:'var(--dim)', lineHeight:1.5 }}>
              Generated: {new Date(trial.generated_at).toLocaleString()} &nbsp;·&nbsp;
              Expires: {new Date(trial.expires_at).toLocaleString()}
            </span>
          </div>
        </div>
      )}

      {/* ── One-time warning ── */}
      {hasUsed && (
        <div style={{ padding:'13px 16px', borderRadius:14,
          background:'rgba(251,191,36,.05)', border:'1px solid rgba(251,191,36,.14)',
          display:'flex', alignItems:'flex-start', gap:10 }}>
          <AlertCircle size={15} color="var(--amber)" style={{ flexShrink:0, marginTop:1 }}/>
          <span style={{ fontSize:12, color:'var(--muted)', lineHeight:1.55 }}>
            <strong style={{ color:'var(--amber)' }}>One-time trial only.</strong> This Gmail account
            has already used its free trial. Purchase a subscription from{' '}
            <strong style={{ color:'#fff' }}>Shop</strong> to keep playing.
          </span>
        </div>
      )}

      {/* ── Purchase CTA ── */}
      {(isExpired || hasUsed) && (
        <div className="g" style={{
          padding:'22px 24px',
          background:'linear-gradient(135deg,rgba(16,232,152,.06),rgba(109,40,217,.04))',
          borderColor:'rgba(16,232,152,.16)',
          display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:14,
        }}>
          <div>
            <div style={{ fontSize:15, fontWeight:800, color:'#fff', marginBottom:4 }}>Ready for full access?</div>
            <div style={{ fontSize:12, color:'var(--muted)' }}>Plans from $3 · Instant key delivery · No waiting</div>
          </div>
          <button
            onClick={() => window.dispatchEvent(new CustomEvent('navigate', { detail: '/store' }))}
            style={{
              display:'flex', alignItems:'center', gap:8, padding:'12px 22px', borderRadius:12,
              background:'linear-gradient(135deg,#10e898,#059669)', border:'none',
              color:'#fff', fontSize:14, fontWeight:800, cursor:'pointer', fontFamily:'inherit',
              boxShadow:'0 0 24px rgba(16,232,152,.3)', transition:'all .2s',
            }}
            onMouseEnter={e=>(e.currentTarget.style.transform='translateY(-1px)')}
            onMouseLeave={e=>(e.currentTarget.style.transform='none')}
          >
            <Zap size={15}/> Buy Full License
          </button>
        </div>
      )}
    </div>
  );
}
