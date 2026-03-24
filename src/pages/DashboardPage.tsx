import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import { Wallet, Key, Gift, Clock, TrendingUp, Zap, Copy, CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const SUPA_URL  = 'https://wkjqrjafogufqeasfeev.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok';
const COOLDOWN  = 86400000;   // 24 h between claims
const KEY_TTL   = 3600000;    // 1 h key validity (tracked in Supabase, not KeyAuth)

// ── Countdown ticker ──────────────────────────────────────────
function Ticker({ expiresAt }: { expiresAt: string }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const i = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(i); }, []);
  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return <span style={{ color:'var(--red)', fontWeight:700, fontSize:13 }}>Expired</span>;
  const d = Math.floor(diff / 86400000);
  const h = String(Math.floor((diff % 86400000) / 3600000)).padStart(2,'0');
  const m = String(Math.floor((diff % 3600000)  / 60000)).padStart(2,'0');
  const s = String(Math.floor((diff % 60000)    / 1000)).padStart(2,'0');
  return (
    <div style={{ display:'flex', alignItems:'baseline', gap:3 }} className="mono">
      {d > 0 && <><span style={{ fontSize:28, fontWeight:800, color:'#fff', letterSpacing:'-.02em' }}>{d}</span><span style={{ fontSize:11, color:'var(--muted)', marginRight:4 }}>d</span></>}
      <span style={{ fontSize:28, fontWeight:800, color:'#fff', letterSpacing:'-.02em' }}>{h}</span>
      <span style={{ fontSize:16, color:'var(--muted)', margin:'0 1px' }}>:</span>
      <span style={{ fontSize:28, fontWeight:800, color:'#fff', letterSpacing:'-.02em' }}>{m}</span>
      <span style={{ fontSize:16, color:'var(--muted)', margin:'0 1px' }}>:</span>
      <span style={{ fontSize:28, fontWeight:800, color:'rgba(255,255,255,.4)', letterSpacing:'-.02em' }}>{s}</span>
    </div>
  );
}

function MiniCountdown({ ms }: { ms: number }) {
  const [txt, setTxt] = useState('');
  useEffect(() => {
    const up = () => {
      const r = ms - Date.now();
      if (r <= 0) { setTxt(''); return; }
      const h = Math.floor(r / 3600000);
      const m = String(Math.floor((r % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((r % 60000) / 1000)).padStart(2, '0');
      setTxt(h > 0 ? `${h}h ${m}m ${s}s` : `${m}m ${s}s`);
    };
    up();
    const i = setInterval(up, 1000);
    return () => clearInterval(i);
  }, [ms]);
  return <span className="mono" style={{ fontWeight:700, color:'rgba(255,255,255,.55)' }}>{txt}</span>;
}

function LicCard({ lic, accent }: { lic: any; accent: 'p'|'b' }) {
  const key   = lic.key.replace('_INTERNAL', '');
  const dLeft = Math.max(0, Math.floor((new Date(lic.expiresAt).getTime() - Date.now()) / 86400000));
  const total = Math.max(30, Math.ceil((new Date(lic.expiresAt).getTime() - new Date(lic.lastLogin).getTime()) / 86400000));
  const pct   = Math.min(100, (dLeft / total) * 100);
  const isP   = accent === 'p';
  const c  = isP ? 'var(--purple)' : 'var(--blue)';
  const bg = isP ? 'rgba(109,40,217,.07)' : 'rgba(56,189,248,.06)';
  const bc = isP ? 'rgba(139,92,246,.18)' : 'rgba(56,189,248,.16)';
  return (
    <div className="g g-hover g-lift fu" style={{ background:bg, borderColor:bc, padding:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <div className={isP ? 'dot dot-purple' : 'dot'} style={!isP ? { background:'var(--blue)', boxShadow:'0 0 7px var(--blue)', animation:'blink 2s infinite' } : {}} />
          <span className="label" style={{ color:c }}>{lic.productName}</span>
        </div>
        <span className={`badge badge-${isP ? 'purple' : 'blue'}`}>Active</span>
      </div>
      <Ticker expiresAt={lic.expiresAt} />
      <p style={{ fontSize:11, color:'var(--dim)', margin:'4px 0 12px' }}>
        until {new Date(lic.expiresAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
      </p>
      <div className="prog" style={{ marginBottom:8 }}>
        <div className="prog-bar" style={{ width:`${pct}%`, background:isP?'linear-gradient(90deg,#6d28d9,#8b5cf6)':'linear-gradient(90deg,#0ea5e9,#38bdf8)', boxShadow:`0 0 8px ${isP?'rgba(109,40,217,.5)':'rgba(56,189,248,.5)'}` }} />
      </div>
      <code className="mono" style={{ fontSize:10, color:'rgba(255,255,255,.22)', wordBreak:'break-all' }}>{key}</code>
    </div>
  );
}

// ── Free 1-Hour Key Card ──────────────────────────────────────
interface FreeRow {
  lag_key:      string | null;
  internal_key: string | null;
  claimed_at:   string;
  expires_at:   string;
}

function FreeKeyCard() {
  const { t } = useTranslation();
  const { user, addLicense } = useAppStore();
  const [row,        setRow]        = useState<FreeRow | null>(null);
  const [dbLoading,  setDbLoading]  = useState(true);
  const [generating, setGenerating] = useState(false);
  const [canClaim,   setCanClaim]   = useState(false);
  const [cooldownMs, setCooldownMs] = useState(0);   // absolute ms until next claim
  const [revealed,   setRevealed]   = useState<Record<string, boolean>>({});
  const [copied,     setCopied]     = useState<Record<string, boolean>>({});
  const loaded = useRef(false);

  // ── load once ──────────────────────────────────────────────
  useEffect(() => {
    if (!user || loaded.current) return;
    loaded.current = true;
    supabase.from('free_trial_keys')
      .select('lag_key,internal_key,claimed_at,expires_at')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        setRow(data as FreeRow | null);
        setDbLoading(false);
      });
  }, [user?.id]);

  // ── cooldown ticker ────────────────────────────────────────
  useEffect(() => {
    const tick = () => {
      if (!row) { setCanClaim(true); setCooldownMs(0); return; }
      const next = new Date(row.claimed_at).getTime() + COOLDOWN;
      const left = next - Date.now();
      if (left <= 0) { setCanClaim(true); setCooldownMs(0); }
      else           { setCanClaim(false); setCooldownMs(next); }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [row?.claimed_at]);

  // ── claim ──────────────────────────────────────────────────
  const handleClaim = async () => {
    if (!canClaim || generating || !user) return;
    setGenerating(true);
    toast.loading(t('dashboard.freeKeyGenerating'), { id: 'fk' });

    try {
      // Call the existing generate-key edge function with hours:1 for BOTH panels
      const [lagRes, intRes] = await Promise.all([
        fetch(`${SUPA_URL}/functions/v1/generate-key`, {
          method: 'POST',
          headers: { 'Content-Type':'application/json', Authorization:`Bearer ${SUPA_ANON}`, apikey:SUPA_ANON },
          body: JSON.stringify({ panel_type:'lag',      hours:1, days:0, mask:'1999X-FREE-****' }),
        }).then(r => r.json()),
        fetch(`${SUPA_URL}/functions/v1/generate-key`, {
          method: 'POST',
          headers: { 'Content-Type':'application/json', Authorization:`Bearer ${SUPA_ANON}`, apikey:SUPA_ANON },
          body: JSON.stringify({ panel_type:'internal', hours:1, days:0, mask:'1999X-FREE-****' }),
        }).then(r => r.json()),
      ]);

      const lagKey = lagRes?.success ? lagRes.key : null;
      const intKey = intRes?.success ? intRes.key : null;

      if (!lagKey && !intKey) {
        toast.dismiss('fk');
        toast.error('Key generation failed — try again later.');
        setGenerating(false);
        return;
      }

      const now       = new Date().toISOString();
      const expiresAt = new Date(Date.now() + KEY_TTL).toISOString();

      // Upsert into Supabase free_trial_keys
      const { error } = await supabase.from('free_trial_keys').upsert({
        user_id:      user.id,
        user_email:   user.email,
        lag_key:      lagKey,
        internal_key: intKey,
        claimed_at:   now,
        expires_at:   expiresAt,
      }, { onConflict: 'user_id' });

      if (error) {
        toast.dismiss('fk');
        toast.error('Save failed: ' + error.message);
        setGenerating(false);
        return;
      }

      // Add to local license store so Licenses page shows them
      if (lagKey) addLicense({
        id: `free_lag_${Date.now()}`, productId:'keyauth-lag',      productName: t('dashboard.freeKeyLag'),
        key: lagKey, hwid:'', lastLogin:now, expiresAt, status:'active', ip:'', device:'', hwidResetsUsed:0, hwidResetMonth:new Date().getMonth(),
      });
      if (intKey) addLicense({
        id: `free_int_${Date.now()}`, productId:'keyauth-internal', productName: t('dashboard.freeKeyInternal'),
        key: intKey + '_INTERNAL', hwid:'', lastLogin:now, expiresAt, status:'active', ip:'', device:'', hwidResetsUsed:0, hwidResetMonth:new Date().getMonth(),
      });

      setRow({ lag_key:lagKey, internal_key:intKey, claimed_at:now, expires_at:expiresAt });
      logActivity({ userId:user.id, userEmail:user.email, userName:user.name, action:'free_key_claim', product:'Free 1-Hour Key', status:'success', meta:{ lag:!!lagKey, internal:!!intKey, expires:expiresAt } });
      toast.dismiss('fk');
      toast.success('🎉 ' + t('dashboard.freeKeyClaimed'));
    } catch (e) {
      toast.dismiss('fk');
      toast.error(String(e));
    }
    setGenerating(false);
  };

  const copyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopied(p => ({ ...p, [id]:true }));
    setTimeout(() => setCopied(p => ({ ...p, [id]:false })), 2000);
    toast.success(t('common.copied'));
  };

  if (dbLoading) return (
    <div className="g fu" style={{ padding:'16px 20px', background:'rgba(99,102,241,.05)', borderColor:'rgba(99,102,241,.18)', animationDelay:'150ms' }}>
      <div style={{ display:'flex', alignItems:'center', gap:8, color:'var(--muted)' }}>
        <Loader2 size={14} className="animate-spin" />
        <span style={{ fontSize:13 }}>{t('common.loading')}</span>
      </div>
    </div>
  );

  const isActive  = row && new Date(row.expires_at).getTime() > Date.now();
  const keyList: Array<{ id:string; label:string; key:string }> = [
    ...(row?.internal_key ? [{ id:'int', label:t('dashboard.freeKeyInternal'), key:row.internal_key.replace('_INTERNAL','') }] : []),
    ...(row?.lag_key      ? [{ id:'lag', label:t('dashboard.freeKeyLag'),      key:row.lag_key }] : []),
  ];

  return (
    <div className="g g-hover fu" style={{ padding:'28px 28px', background:'linear-gradient(135deg,rgba(99,102,241,.1),rgba(139,92,246,.06),rgba(56,189,248,.04))', borderColor:'rgba(99,102,241,.3)', boxShadow:'0 0 60px rgba(99,102,241,.15), 0 0 120px rgba(139,92,246,.05)', animationDelay:'150ms', backdropFilter:'blur(16px)', WebkitBackdropFilter:'blur(16px)', borderRadius:22 }}>
      {/* Header */}
      <div style={{ display:'flex', alignItems:'flex-start', gap:14, marginBottom: isActive && keyList.length > 0 ? 14 : 0 }}>
        <div style={{ width:56, height:56, borderRadius:16, background:'linear-gradient(135deg,rgba(99,102,241,.2),rgba(139,92,246,.15))', border:'1px solid rgba(99,102,241,.35)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, boxShadow:'0 0 30px rgba(99,102,241,.3)' }}>
          <Zap size={26} color="#818cf8" />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:3 }}>{t('dashboard.freeKey')}</div>
          <div style={{ fontSize:11, color:'var(--muted)', marginBottom:12 }}>{t('dashboard.freeKeyOnePerDay')}</div>

          {/* Active key info */}
          {isActive && (
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:10, flexWrap:'wrap' }}>
              <div className="dot dot-green" style={{ width:5, height:5 }} />
              <span style={{ fontSize:11, fontWeight:700, color:'var(--green)' }}>{t('dashboard.freeKeyActive')}</span>
              <span style={{ fontSize:11, color:'var(--dim)' }}>·</span>
              <span style={{ fontSize:11, color:'var(--muted)' }}>{t('dashboard.freeKeyExpiresIn')}:</span>
              <MiniCountdown ms={new Date(row!.expires_at).getTime()} />
            </div>
          )}

          {/* Expired */}
          {row && !isActive && (
            <div style={{ fontSize:11, color:'var(--dim)', display:'flex', alignItems:'center', gap:5, marginBottom:10 }}>
              <span style={{ color:'var(--red)', fontSize:8 }}>●</span>
              {t('dashboard.freeKeyExpired')}
            </div>
          )}

          {/* Claim / Cooldown button */}
          {canClaim ? (
            <button onClick={handleClaim} disabled={generating} className="btn btn-sm"
              style={{ background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', fontWeight:700, gap:6, boxShadow:'0 0 18px rgba(99,102,241,.4)' }}>
              {generating
                ? <><Loader2 size={13} className="animate-spin" />{t('dashboard.freeKeyGenerating')}</>
                : <><Zap size={13} />{t('dashboard.freeKeyBtn')}</>}
            </button>
          ) : (
            <div style={{ fontSize:11, color:'var(--dim)', display:'flex', alignItems:'center', gap:5 }}>
              <Clock size={11} />
              {t('dashboard.freeKeyCooldown')}: <MiniCountdown ms={cooldownMs} />
            </div>
          )}
        </div>
      </div>

      {/* Key display */}
      {isActive && keyList.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8, paddingTop:4 }}>
          {keyList.map(k => (
            <div key={k.id} style={{ background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:10, padding:'10px 14px' }}>
              <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>{k.label}</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <code style={{ flex:1, fontSize:12, fontFamily:'monospace', color:'#fff', letterSpacing:'1px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', filter:revealed[k.id]?'none':'blur(5px)', transition:'filter .3s' }}>
                  {k.key}
                </code>
                <button onClick={() => setRevealed(p => ({ ...p, [k.id]:!p[k.id] }))}
                  style={{ padding:'4px 7px', borderRadius:7, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.09)', cursor:'pointer', color:'var(--muted)', flexShrink:0, display:'flex' }}>
                  {revealed[k.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
                <button onClick={() => copyKey(k.key, k.id)}
                  style={{ padding:'4px 7px', borderRadius:7, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.09)', cursor:'pointer', color:copied[k.id]?'var(--green)':'var(--muted)', flexShrink:0, display:'flex', transition:'color .15s' }}>
                  {copied[k.id] ? <CheckCircle size={12} /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          ))}
          {!revealed.int && !revealed.lag && (
            <p style={{ fontSize:10, color:'var(--dim)', margin:0 }}>👁 {t('dashboard.freeKeyReveal')}</p>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main DashboardPage ────────────────────────────────────────
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

  const active   = licenses.filter(l => new Date(l.expiresAt).getTime() > Date.now());
  const lag      = active.filter(l => l.productId === 'keyauth-lag');
  const int      = active.filter(l => l.productId === 'keyauth-internal' || l.key.endsWith('_INTERNAL'));
  const approved = (transactions as any[]).filter((t: any) => t.status === 'approved').length;

  const stats = [
    { label:t('dashboard.balance'),     val:`$${balance.toFixed(2)}`, icon:Wallet,     c:'var(--purple)', bg:'rgba(109,40,217,.08)', bc:'rgba(139,92,246,.16)' },
    { label:t('dashboard.activeKeys'),  val:active.length,            icon:Key,        c:'var(--green)',  bg:'rgba(16,232,152,.06)', bc:'rgba(16,232,152,.14)' },
    { label:t('dashboard.approved'),    val:approved,                 icon:TrendingUp, c:'var(--blue)',   bg:'rgba(56,189,248,.06)', bc:'rgba(56,189,248,.14)' },
    { label:t('dashboard.bonusPoints'), val:bonusPoints,              icon:Gift,       c:'var(--amber)',  bg:'rgba(251,191,36,.06)', bc:'rgba(251,191,36,.14)' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>

      {/* Welcome */}
      <div className="g fu" style={{ padding:'22px 24px', background:'linear-gradient(135deg,rgba(109,40,217,.1) 0%,rgba(255,255,255,.025) 100%)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, right:0, width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle,rgba(109,40,217,.15) 0%,transparent 70%)', transform:'translate(30%,-30%)', pointerEvents:'none' }} />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            {user?.avatar
              ? <img src={user.avatar} style={{ width:46, height:46, borderRadius:12, objectFit:'cover', border:'2px solid rgba(139,92,246,.3)' }} />
              : <div style={{ width:46, height:46, borderRadius:12, background:'linear-gradient(135deg,#6d28d9,#4c1d95)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:'#fff' }}>{user?.name?.charAt(0)||'U'}</div>
            }
            <div>
              <div className="label" style={{ marginBottom:4 }}>{t('dashboard.welcomeBack')}</div>
              <div style={{ fontSize:20, fontWeight:800, color:'#fff', letterSpacing:'-.01em' }}>{user?.name?.split(' ')[0]||'User'} 👋</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 12px', borderRadius:20, background:'rgba(16,232,152,.08)', border:'1px solid rgba(16,232,152,.18)' }}>
            <div className="dot dot-green" />
            <span style={{ fontSize:11, fontWeight:700, color:'var(--green)' }}>{t('dashboard.undetected')}</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }} className="stg">
        {stats.map((s, i) => (
          <div key={s.label} className="g g-hover g-lift fu" style={{ padding:'18px 20px', background:s.bg, borderColor:s.bc, animationDelay:`${i*55}ms` }}>
            <s.icon size={18} style={{ color:s.c, marginBottom:10 }} />
            <div style={{ fontSize:26, fontWeight:800, color:'#fff', letterSpacing:'-.02em', marginBottom:4 }}>{s.val}</div>
            <div className="label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Active licenses */}
      {active.length > 0 && (
        <div className="fu" style={{ animationDelay:'80ms' }}>
          <div className="label" style={{ color:'var(--purple)', marginBottom:10 }}>{t('dashboard.activeSubscriptions')}</div>
          <div style={{ display:'grid', gap:12, gridTemplateColumns:int.length>0&&lag.length>0?'repeat(auto-fit,minmax(280px,1fr))':'1fr' }}>
            {int.map(l => <LicCard key={l.id} lic={l} accent="b" />)}
            {lag.map(l => <LicCard key={l.id} lic={l} accent="p" />)}
          </div>
        </div>
      )}

      {active.length === 0 && (
        <div className="g fu" style={{ padding:'48px 20px', textAlign:'center', borderStyle:'dashed', animationDelay:'80ms' }}>
          <Key size={36} style={{ color:'rgba(255,255,255,.08)', margin:'0 auto 12px' }} />
          <p style={{ fontSize:15, fontWeight:600, color:'var(--muted)', marginBottom:6 }}>{t('dashboard.noLicense')}</p>
          <p style={{ fontSize:13, color:'var(--dim)' }}>{t('dashboard.noLicenseDesc')}</p>
        </div>
      )}

      {/* ── FREE 1-HOUR KEY CARD (after license section) ── */}
      {user && <FreeKeyCard />}

      {/* Daily bonus card removed — bonus total still shown in stats above */}
    </div>
  );
}
