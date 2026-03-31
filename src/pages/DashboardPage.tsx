import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import { Wallet, Key, Gift, Clock, TrendingUp, Zap, Copy, CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const SUPA_URL  = 'https://awjouzwzdkrevvnlenvn.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3am91end6ZGtyZXZ2bmxlbnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTg4MjEsImV4cCI6MjA5MDAzNDgyMX0._I_I-WA_8-YqDfaRzKiVgpEAhkH9faxlEIV6e766A0M';
const BONUS_COOLDOWN = 86400000;
const FREE_KEY_COOLDOWN = 172800000;
const FREE_KEY_TTL = 86400000;

interface BonusRow {
  bonus_points: number;
  last_claim_time: string | null;
}

interface FreeRow {
  lag_key: string | null;
  internal_key: string | null;
  claimed_at: string;
  expires_at: string;
}

async function fetchBonusRow(userId: string): Promise<BonusRow | null> {
  const { data, error } = await supabase
    .from('user_bonus')
    .select('bonus_points,last_claim_time')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) return null;
  return data as BonusRow | null;
}

async function upsertBonusRow(userId: string, userEmail: string, bonusPoints: number, lastClaimTime: string | null) {
  return supabase.from('user_bonus').upsert({
    user_id: userId,
    user_email: userEmail,
    bonus_points: bonusPoints,
    last_claim_time: lastClaimTime,
    updated_at: new Date().toISOString(),
  }, { onConflict: 'user_id' });
}

function Ticker({ expiresAt }: { expiresAt: string }) {
  const { t } = useTranslation();
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return <span style={{ color:'var(--red)', fontWeight:700, fontSize:13 }}>{t('common.expired')}</span>;

  const d = Math.floor(diff / 86400000);
  const h = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, '0');
  const m = String(Math.floor((diff % 3600000) / 60000)).padStart(2, '0');
  const s = String(Math.floor((diff % 60000) / 1000)).padStart(2, '0');

  return (
    <div style={{ display:'flex', alignItems:'baseline', gap:3 }} className="mono">
      {d > 0 && <><span style={{ fontSize:28, fontWeight:800, color:'#fff' }}>{d}</span><span style={{ fontSize:11, color:'var(--muted)', marginRight:4 }}>d</span></>}
      <span style={{ fontSize:28, fontWeight:800, color:'#fff' }}>{h}</span>
      <span style={{ fontSize:16, color:'var(--muted)' }}>:</span>
      <span style={{ fontSize:28, fontWeight:800, color:'#fff' }}>{m}</span>
      <span style={{ fontSize:16, color:'var(--muted)' }}>:</span>
      <span style={{ fontSize:28, fontWeight:800, color:'rgba(255,255,255,.4)' }}>{s}</span>
    </div>
  );
}

function MiniCountdown({ ms }: { ms: number }) {
  const [txt, setTxt] = useState('');

  useEffect(() => {
    const tick = () => {
      const left = ms - Date.now();
      if (left <= 0) {
        setTxt('');
        return;
      }
      const d = Math.floor(left / 86400000);
      const h = String(Math.floor((left % 86400000) / 3600000)).padStart(2, '0');
      const m = String(Math.floor((left % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
      setTxt(d > 0 ? `${d}d ${h}:${m}:${s}` : `${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [ms]);

  return <span className="mono" style={{ fontWeight:700, color:'rgba(255,255,255,.7)' }}>{txt}</span>;
}

function LicCard({ lic, accent }: { lic: any; accent: 'p' | 'b' }) {
  const key = lic.key.replace('_INTERNAL', '');
  const dLeft = Math.max(0, Math.floor((new Date(lic.expiresAt).getTime() - Date.now()) / 86400000));
  const total = Math.max(30, Math.ceil((new Date(lic.expiresAt).getTime() - new Date(lic.lastLogin).getTime()) / 86400000));
  const pct = Math.min(100, (dLeft / total) * 100);
  const isPurple = accent === 'p';
  const color = isPurple ? '#8b5cf6' : '#38bdf8';
  const glow  = isPurple ? 'rgba(139,92,246,.3)' : 'rgba(56,189,248,.3)';
  const bg    = isPurple ? 'rgba(109,40,217,.08)' : 'rgba(56,189,248,.07)';
  const bc    = isPurple ? 'rgba(139,92,246,.2)'  : 'rgba(56,189,248,.18)';
  const barBg = isPurple ? 'linear-gradient(90deg,#6d28d9,#8b5cf6)' : 'linear-gradient(90deg,#0ea5e9,#38bdf8)';

  return (
    <div className="dash-lic-card liquid-glass" style={{
      boxShadow:`0 8px 32px rgba(0,0,0,.25), 0 0 40px ${glow}`,
    }}>
      {/* Top accent bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:`linear-gradient(90deg,transparent,${color},transparent)` }} />

      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div style={{ width:8, height:8, borderRadius:'50%', background:color, boxShadow:`0 0 10px ${color}`, animation:'blink 2s infinite' }} />
          <span style={{ fontSize:13, fontWeight:700, color, letterSpacing:'.01em' }}>{lic.productName}</span>
        </div>
        <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'4px 10px', borderRadius:20, background:bg, border:`1px solid ${bc}`, fontSize:10, fontWeight:800, color, letterSpacing:'.06em', textTransform:'uppercase' }}>
          ● Active
        </span>
      </div>

      <Ticker expiresAt={lic.expiresAt} />
      <p style={{ fontSize:11, color:'rgba(255,255,255,.28)', margin:'5px 0 16px' }}>
        until {new Date(lic.expiresAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
      </p>

      {/* Progress */}
      <div style={{ height:4, borderRadius:999, background:'rgba(255,255,255,.07)', overflow:'hidden', marginBottom:14 }}>
        <div style={{ height:'100%', width:`${pct}%`, borderRadius:999, background:barBg, boxShadow:`0 0 8px ${glow}`, transition:'width .8s cubic-bezier(.22,1,.36,1)' }} />
      </div>
      <div style={{ display:'flex', justifyContent:'space-between', marginBottom:14 }}>
        <span style={{ fontSize:10, color:'rgba(255,255,255,.25)', fontWeight:600 }}>{dLeft} days left</span>
        <span style={{ fontSize:10, color:'rgba(255,255,255,.25)' }}>{Math.round(pct)}% remaining</span>
      </div>

      <code style={{ fontSize:10, fontFamily:'monospace', color:'rgba(255,255,255,.18)', wordBreak:'break-all', letterSpacing:'.05em' }}>{key}</code>
    </div>
  );
}

function FreeKeyCard() {
  const { t } = useTranslation();
  const { addLicense, user } = useAppStore();
  const [row, setRow] = useState<FreeRow | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [cooldownMs, setCooldownMs] = useState(0);
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [copied, setCopied] = useState<Record<string, boolean>>({});
  const loaded = useRef(false);

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

  useEffect(() => {
    const tick = () => {
      if (!row) {
        setCanClaim(true);
        setCooldownMs(0);
        return;
      }
      const next = new Date(row.claimed_at).getTime() + FREE_KEY_COOLDOWN;
      const left = next - Date.now();
      if (left <= 0) {
        setCanClaim(true);
        setCooldownMs(0);
      } else {
        setCanClaim(false);
        setCooldownMs(next);
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [row?.claimed_at]);

  const handleClaim = async () => {
    if (!canClaim || generating || !user) return;
    setGenerating(true);
    toast.loading('Generating your 1-day trial key...', { id:'free-trial' });

    try {
      const [lagRes, intRes] = await Promise.all([
        fetch(`${SUPA_URL}/functions/v1/generate-key`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${SUPA_ANON}`, apikey:SUPA_ANON },
          body:JSON.stringify({ panel_type:'lag', days:1, hours:0, mask:'1999X-FREE-****' }),
        }).then(r => r.json()),
        fetch(`${SUPA_URL}/functions/v1/generate-key`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${SUPA_ANON}`, apikey:SUPA_ANON },
          body:JSON.stringify({ panel_type:'internal', days:1, hours:0, mask:'1999X-FREE-****' }),
        }).then(r => r.json()),
      ]);

      const lagKey = lagRes?.success ? lagRes.key : null;
      const intKey = intRes?.success ? intRes.key : null;

      if (!lagKey && !intKey) {
        toast.dismiss('free-trial');
        toast.error(t('license.activationFailed'));
        setGenerating(false);
        return;
      }

      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + FREE_KEY_TTL).toISOString();
      const { error } = await supabase.from('free_trial_keys').upsert({
        user_id:user.id,
        user_email:user.email,
        lag_key:lagKey,
        internal_key:intKey,
        claimed_at:now,
        expires_at:expiresAt,
      }, { onConflict:'user_id' });

      if (error) {
        toast.dismiss('free-trial');
        toast.error(error.message);
        setGenerating(false);
        return;
      }

      if (lagKey) {
        addLicense({ id:`free_lag_${Date.now()}`, productId:'keyauth-lag', productName:'Fake Lag (Free 1 Day Trial)', key:lagKey, hwid:'', lastLogin:now, expiresAt, status:'active', ip:'', device:'', hwidResetsUsed:0, hwidResetMonth:new Date().getMonth() });
      }
      if (intKey) {
        addLicense({ id:`free_int_${Date.now()}`, productId:'keyauth-internal', productName:'Internal (Free 1 Day Trial)', key:`${intKey}_INTERNAL`, hwid:'', lastLogin:now, expiresAt, status:'active', ip:'', device:'', hwidResetsUsed:0, hwidResetMonth:new Date().getMonth() });
      }

      setRow({ lag_key:lagKey, internal_key:intKey, claimed_at:now, expires_at:expiresAt });
      logActivity({ userId:user.id, userEmail:user.email, userName:user.name, action:'free_key_claim', product:'Free 1-Day Trial Key', status:'success', meta:{ lag:!!lagKey, internal:!!intKey, expires:expiresAt } });
      toast.dismiss('free-trial');
      toast.success(t('dashboard.freeKeyClaimed'));
    } catch (error) {
      toast.dismiss('free-trial');
      toast.error(String(error));
    }

    setGenerating(false);
  };

  const copyKey = (key: string, id: string) => {
    navigator.clipboard.writeText(key);
    setCopied((prev) => ({ ...prev, [id]:true }));
    setTimeout(() => setCopied((prev) => ({ ...prev, [id]:false })), 2000);
    toast.success(t('common.copied'));
  };

  if (dbLoading) {
    return (
      <div className="liquid-glass" style={{ padding:'20px 24px', borderRadius:20, display:'flex', alignItems:'center', gap:10, color:'rgba(255,255,255,.4)' }}>
        <Loader2 size={14} className="animate-spin" />
        <span style={{ fontSize:13 }}>{t('common.loading')}</span>
      </div>
    );
  }

  const isActive = !!row && new Date(row.expires_at).getTime() > Date.now();
  const keyList = [
    ...(row?.internal_key ? [{ id:'int', label:'Internal Trial Key', key:row.internal_key.replace('_INTERNAL', '') }] : []),
    ...(row?.lag_key ? [{ id:'lag', label:'Fake Lag Trial Key', key:row.lag_key }] : []),
  ];

  return (
    <div className="liquid-glass" style={{ borderRadius:22, padding:'26px 26px', position:'relative',
      boxShadow:'0 32px 64px rgba(0,0,0,.3), 0 0 60px rgba(99,102,241,.08)' }}>
      {/* Top line */}
      <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,#8b5cf6 35%,#38bdf8 70%,transparent)', pointerEvents:'none' }} />
      {/* Glow orb */}
      <div style={{ position:'absolute', top:-60, right:-40, width:180, height:180, borderRadius:'50%', background:'radial-gradient(circle,rgba(99,102,241,.2) 0%,transparent 70%)', pointerEvents:'none' }} />

      <div style={{ position:'relative', display:'flex', alignItems:'flex-start', gap:16, marginBottom: isActive && keyList.length ? 20 : 0 }}>
        <div style={{ width:52, height:52, borderRadius:16, background:'rgba(99,102,241,.14)', border:'1px solid rgba(167,139,250,.3)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 28px rgba(99,102,241,.3)', flexShrink:0 }}>
          <Zap size={24} color="#c4b5fd" />
        </div>

        <div style={{ flex:1 }}>
          <div style={{ fontSize:17, fontWeight:800, color:'#fff', marginBottom:4, letterSpacing:'-.01em' }}>{t('dashboard.freeKey')}</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.45)', marginBottom:16, lineHeight:1.5 }}>{t('dashboard.freeKeyDesc')}</div>

          {/* Active status */}
          {isActive && row && (
            <div style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 12px', borderRadius:20, background:'rgba(16,232,152,.08)', border:'1px solid rgba(16,232,152,.2)', marginBottom:14, flexWrap:'wrap' }}>
              <div style={{ width:5, height:5, borderRadius:'50%', background:'var(--green)', boxShadow:'0 0 8px var(--green)' }} />
              <span style={{ fontSize:11, fontWeight:700, color:'var(--green)' }}>{t('dashboard.freeKeyActive')}</span>
              <span style={{ fontSize:11, color:'rgba(255,255,255,.35)' }}>{t('dashboard.freeKeyExpiresIn')}</span>
              <MiniCountdown ms={new Date(row.expires_at).getTime()} />
            </div>
          )}

          {row && !isActive && (
            <div style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 12px', borderRadius:20, background:'rgba(248,113,113,.06)', border:'1px solid rgba(248,113,113,.18)', marginBottom:14, fontSize:11, color:'var(--red)', fontWeight:600 }}>
              ● {t('dashboard.freeKeyExpired')}
            </div>
          )}

          {canClaim ? (
            <button onClick={handleClaim} disabled={generating} className="dash-free-btn">
              {generating
                ? <><Loader2 size={13} className="animate-spin" /> {t('dashboard.freeKeyGenerating')}</>
                : <><Zap size={14} /> {t('dashboard.freeKeyBtn')}</>}
            </button>
          ) : (
            <div style={{ display:'inline-flex', alignItems:'center', gap:6, fontSize:12, color:'rgba(255,255,255,.3)', fontWeight:600, padding:'7px 12px', borderRadius:20, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)' }}>
              <Clock size={12} /> {t('dashboard.freeKeyCooldown')} <MiniCountdown ms={cooldownMs} />
            </div>
          )}
        </div>
      </div>

      {/* Key display */}
      {isActive && keyList.length > 0 && (
        <div style={{ display:'flex', flexDirection:'column', gap:8, paddingTop:4, position:'relative' }}>
          {keyList.map((keyItem) => (
            <div key={keyItem.id} className="dash-key-row">
              <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.1em', marginBottom:7, fontWeight:700 }}>{keyItem.label}</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <code style={{ flex:1, fontSize:12, fontFamily:'monospace', color:'#fff', letterSpacing:'1px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', filter:revealed[keyItem.id] ? 'none' : 'blur(5px)', transition:'filter .3s' }}>
                  {keyItem.key}
                </code>
                <button onClick={() => setRevealed(p => ({ ...p, [keyItem.id]:!p[keyItem.id] }))} style={{ padding:'5px 8px', borderRadius:8, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', cursor:'pointer', color:'rgba(255,255,255,.5)', display:'flex', transition:'all .15s' }}>
                  {revealed[keyItem.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
                <button onClick={() => copyKey(keyItem.key, keyItem.id)} style={{ padding:'5px 8px', borderRadius:8, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', cursor:'pointer', color:copied[keyItem.id] ? 'var(--green)' : 'rgba(255,255,255,.5)', display:'flex', transition:'all .15s' }}>
                  {copied[keyItem.id] ? <CheckCircle size={12} /> : <Copy size={12} />}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { balance, licenses, transactions, user } = useAppStore();
  const [bonusPoints, setBonusPoints] = useState(0);
  const [lastBonusClaim, setLastBonusClaim] = useState<string | null>(null);
  const [bonusCooldown, setBonusCooldown] = useState('');
  const [canClaimBonus, setCanClaimBonus] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [bonusLoaded, setBonusLoaded] = useState(false);

  useEffect(() => {
    if (!user?.id) return;
    setBonusLoaded(false);
    fetchBonusRow(user.id).then((row) => {
      if (row) {
        setBonusPoints(row.bonus_points ?? 0);
        setLastBonusClaim(row.last_claim_time ?? null);
      }
      setBonusLoaded(true);
    });
  }, [user?.id]);

  useEffect(() => {
    const tick = () => {
      if (!lastBonusClaim) {
        setCanClaimBonus(true);
        setBonusCooldown('');
        return;
      }
      const diff = BONUS_COOLDOWN - (Date.now() - new Date(lastBonusClaim).getTime());
      if (diff <= 0) {
        setCanClaimBonus(true);
        setBonusCooldown('');
        return;
      }
      setCanClaimBonus(false);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setBonusCooldown(`${h}h ${m}m ${s}s`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [lastBonusClaim]);

  const handleClaimBonus = async () => {
    if (!user || !canClaimBonus || claimingBonus || !bonusLoaded) return;
    setClaimingBonus(true);
    const latest = await fetchBonusRow(user.id);
    if (latest?.last_claim_time) {
      const diff = BONUS_COOLDOWN - (Date.now() - new Date(latest.last_claim_time).getTime());
      if (diff > 0) {
        setLastBonusClaim(latest.last_claim_time);
        setCanClaimBonus(false);
        setClaimingBonus(false);
        toast.error('Already claimed recently. Please wait.');
        return;
      }
    }
    const nextPoints = (latest?.bonus_points ?? bonusPoints) + 10;
    const claimTime = new Date().toISOString();
    const { error } = await upsertBonusRow(user.id, user.email, nextPoints, claimTime);
    if (error) {
    toast.error(t('common.error'));
      setClaimingBonus(false);
      return;
    }
    setBonusPoints(nextPoints);
    setLastBonusClaim(claimTime);
    setClaimingBonus(false);
    toast.success(t('bonus.claimed'));
    logActivity({ userId:user.id, userEmail:user.email, userName:user.name, action:'bonus_claim', status:'success', meta:{ points:10, total:nextPoints } });
  };

  const active = licenses.filter((license) => new Date(license.expiresAt).getTime() > Date.now());
  const lag = active.filter((license) => license.productId === 'keyauth-lag');
  const internal = active.filter((license) => license.productId === 'keyauth-internal' || license.key.endsWith('_INTERNAL'));
  const approved = (transactions as any[]).filter((tx: any) => tx.status === 'approved').length;

  const stats = [
    { label:t('dashboard.balance'), val:`$${balance.toFixed(2)}`, icon:Wallet, c:'var(--purple)', bg:'rgba(109,40,217,.08)', bc:'rgba(139,92,246,.16)' },
    { label:t('dashboard.activeKeys'), val:active.length, icon:Key, c:'var(--green)', bg:'rgba(16,232,152,.06)', bc:'rgba(16,232,152,.14)' },
    { label:t('dashboard.approved'), val:approved, icon:TrendingUp, c:'var(--blue)', bg:'rgba(56,189,248,.06)', bc:'rgba(56,189,248,.14)' },
    { label:t('dashboard.bonusPoints'), val:bonusPoints, icon:Gift, c:'var(--amber)', bg:'rgba(251,191,36,.06)', bc:'rgba(251,191,36,.14)' },
  ];

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:20, position:'relative', zIndex:1 }}>
      <style>{`
        @keyframes dash-in  { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes dash-glow{ 0%,100%{opacity:.7} 50%{opacity:1} }
        @keyframes dash-bar  { from{width:0} to{width:var(--w)} }
        .dash-card {
          border-radius: 22px;
          animation: dash-in .4s cubic-bezier(.22,1,.36,1) both;
        }
        .dash-stat {
          border-radius: 18px; padding: 22px 20px;
          transition: all .22s cubic-bezier(.22,1,.36,1);
          animation: dash-in .4s cubic-bezier(.22,1,.36,1) both;
        }
        .dash-stat:hover {
          transform: translateY(-2px);
          box-shadow: 0 16px 40px rgba(0,0,0,.3);
        }
        .dash-prog-track {
          height: 4px; border-radius: 999px;
          background: rgba(255,255,255,.07); overflow: hidden; margin-top:14px;
        }
        .dash-prog-fill {
          height: 100%; border-radius: 999px;
          animation: dash-bar .8s cubic-bezier(.22,1,.36,1) both;
        }
        .dash-lic-card {
          border-radius: 20px; overflow: hidden; padding: 24px;
          transition: all .25s cubic-bezier(.22,1,.36,1);
          animation: dash-in .4s cubic-bezier(.22,1,.36,1) both;
          position: relative;
        }
        .dash-lic-card:hover { transform: translateY(-3px); }
        .dash-key-row {
          border-radius: 12px; padding: 12px 14px;
          background: rgba(255,255,255,.06);
          border: 1px solid rgba(255,255,255,.1);
          backdrop-filter: blur(12px);
          margin-bottom: 8px;
        }
        .dash-bonus-bar { height: 3px; border-radius: 999px; background: rgba(255,255,255,.06); overflow:hidden; margin-top:16px; }
        .dash-free-btn {
          display: inline-flex; align-items: center; gap: 8px;
          padding: 11px 20px; border-radius: 12px; border: none; cursor: pointer;
          font-family: inherit; font-size: 13px; font-weight: 700;
          background: linear-gradient(135deg,#4f46e5,#7c3aed);
          color: #fff; box-shadow: 0 0 24px rgba(99,102,241,.45);
          transition: all .22s cubic-bezier(.22,1,.36,1);
        }
        .dash-free-btn:hover { transform: translateY(-2px); box-shadow: 0 0 36px rgba(99,102,241,.65); }
        .dash-free-btn:disabled { opacity:.5; cursor:not-allowed; transform:none !important; }
      `}</style>

      {/* FLOATING PARTICLES */}
      <div className="fixed inset-0 pointer-events-none z-[-1] overflow-hidden">
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="absolute rounded-full bg-white blur-[1px]"
            style={{
              width: Math.random() * 4 + 1 + 'px',
              height: Math.random() * 4 + 1 + 'px',
              top: Math.random() * 100 + '%',
              left: Math.random() * 100 + '%',
              opacity: Math.random() * 0.4 + 0.1,
              animation: \`float-particle \${Math.random() * 30 + 15}s linear infinite\`,
              animationDelay: \`-\${Math.random() * 30}s\`
            }}
          />
        ))}
        <style>{`
          @keyframes float-particle {
            0% { transform: translateY(0vh) rotate(0deg); opacity: 0; }
            10% { opacity: 1; }
            90% { opacity: 1; }
            100% { transform: translateY(-100vh) rotate(360deg); opacity: 0; }
          }
        `}</style>
      </div>

      {/* ══ HERO WELCOME ══ */}
      <div className="dash-card liquid-glass" style={{ padding:'28px 32px', position:'relative', overflow:'hidden',
        boxShadow:'0 20px 40px rgba(0,0,0,.25)' }}>
        <div style={{ position:'absolute', top:-60, right:-60, width:220, height:220, borderRadius:'50%', background:'radial-gradient(circle,rgba(109,40,217,.2) 0%,transparent 70%)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-40, left:-20, width:160, height:160, borderRadius:'50%', background:'radial-gradient(circle,rgba(16,232,152,.1) 0%,transparent 70%)', pointerEvents:'none' }} />

        <div style={{ position:'relative', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
          <div style={{ display:'flex', alignItems:'center', gap:16 }}>
            {/* Avatar */}
            <div style={{ position:'relative', flexShrink:0 }}>
              {user?.avatar
                ? <img src={user.avatar} style={{ width:54, height:54, borderRadius:16, objectFit:'cover', border:'2px solid rgba(139,92,246,.35)', boxShadow:'0 0 24px rgba(109,40,217,.3)' }} />
                : <div style={{ width:54, height:54, borderRadius:16, background:'linear-gradient(135deg,#6d28d9,#4c1d95)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:20, fontWeight:900, color:'#fff', boxShadow:'0 0 24px rgba(109,40,217,.4)' }}>{user?.name?.charAt(0) || 'U'}</div>}
              <div style={{ position:'absolute', bottom:-3, right:-3, width:14, height:14, borderRadius:'50%', background:'#10e898', border:'2px solid rgba(8,8,18,.95)', boxShadow:'0 0 10px rgba(16,232,152,.7)' }} />
            </div>

            <div>
              <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.4)', marginBottom:5 }}>{t('dashboard.welcomeBack')}</div>
              <div style={{ fontSize:24, fontWeight:900, color:'#fff', letterSpacing:'-.02em', lineHeight:1 }}>{user?.name?.split(' ')[0] || 'User'} 👋</div>
            </div>
          </div>

          {/* Status badges */}
          <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20, background:'rgba(16,232,152,.08)', border:'1px solid rgba(16,232,152,.2)' }}>
              <div className="dot dot-green" style={{ width:5, height:5 }} />
              <span style={{ fontSize:11, fontWeight:700, color:'var(--green)' }}>{t('dashboard.undetected')}</span>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20, background:'rgba(139,92,246,.08)', border:'1px solid rgba(139,92,246,.2)' }}>
              <span style={{ fontSize:11, fontWeight:700, color:'#c4b5fd' }}>OB52 Ready</span>
            </div>
          </div>
        </div>
      </div>

      {/* ══ STATS GRID ══ */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }}>
        {stats.map((stat, i) => (
          <div key={stat.label} className="dash-stat liquid-glass" style={{ animationDelay:\`\${i * 60}ms\` }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:14 }}>
              <div style={{ width:38, height:38, borderRadius:11, background:stat.bg, border:\`1px solid \${stat.bc}\`, display:'flex', alignItems:'center', justifyContent:'center', boxShadow:\`0 0 16px \${stat.bc}\` }}>
                <stat.icon size={17} style={{ color:stat.c }} />
              </div>
              <div style={{ width:6, height:6, borderRadius:'50%', background:stat.c, boxShadow:\`0 0 8px \${stat.c}\`, animation:'dash-glow 2s ease-in-out infinite' }} />
            </div>
            <div style={{ fontSize:32, fontWeight:900, color:'#fff', letterSpacing:'-.04em', lineHeight:1, marginBottom:5 }}>{stat.val}</div>
            <div style={{ fontSize:11, fontWeight:600, color:'rgba(255,255,255,.45)', textTransform:'uppercase', letterSpacing:'.1em' }}>{stat.label}</div>
          </div>
        ))}
      </div>

      {/* ══ ACTIVE SUBSCRIPTIONS ══ */}
      {active.length > 0 ? (
        <div style={{ animationDelay:'80ms' }}>
          <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:14 }}>
            <div style={{ width:3, height:16, borderRadius:999, background:'linear-gradient(180deg,#8b5cf6,#6d28d9)' }} />
            <span style={{ fontSize:11, fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em', color:'rgba(255,255,255,.5)' }}>{t('dashboard.activeSubscriptions')}</span>
          </div>
          <div style={{ display:'grid', gap:14, gridTemplateColumns: internal.length > 0 && lag.length > 0 ? 'repeat(auto-fit,minmax(280px,1fr))' : '1fr' }}>
            {internal.map((license) => <LicCard key={license.id} lic={license} accent="b" />)}
            {lag.map((license) => <LicCard key={license.id} lic={license} accent="p" />)}
          </div>
        </div>
      ) : (
        <div className="dash-card liquid-glass" style={{ padding:'52px 24px', textAlign:'center' }}>
          <div style={{ width:56, height:56, borderRadius:16, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 16px' }}>
            <Key size={24} style={{ color:'rgba(255,255,255,.2)' }} />
          </div>
          <p style={{ fontSize:15, fontWeight:700, color:'rgba(255,255,255,.6)', marginBottom:6 }}>{t('dashboard.noLicense')}</p>
          <p style={{ fontSize:13, color:'rgba(255,255,255,.3)' }}>{t('dashboard.noLicenseDesc')}</p>
        </div>
      )}

      {/* ══ FREE KEY CARD ══ */}
      {user && <FreeKeyCard />}

      {/* ══ DAILY BONUS ══ */}
      <div className="dash-card liquid-glass-strong" style={{ padding:'22px 24px' }}>
        <div style={{ position:'absolute', top:0, left:0, right:0, height:1, borderRadius:'22px 22px 0 0', background:'linear-gradient(90deg,transparent,rgba(251,191,36,.4),transparent)', pointerEvents:'none' }} />

        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:16, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:14, flex:1 }}>
            <div style={{ width:46, height:46, borderRadius:14, background:'rgba(251,191,36,.1)', border:'1px solid rgba(251,191,36,.22)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 20px rgba(251,191,36,.15)', flexShrink:0 }}>
              <Gift size={22} color="#fbbf24" />
            </div>
            <div>
              <div style={{ fontSize:15, fontWeight:800, color:'#fff', marginBottom:3 }}>{t('dashboard.dailyBonus')}</div>
              <div style={{ fontSize:12, color:'rgba(255,255,255,.5)' }}>{t('dashboard.dailyBonusDesc')}</div>
            </div>
          </div>

          <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:8, flexShrink:0 }}>
            <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
              <span style={{ fontSize:28, fontWeight:900, color:'#fbbf24', letterSpacing:'-.03em' }}>{bonusPoints}</span>
              <span style={{ fontSize:11, color:'rgba(255,255,255,.4)', fontWeight:500 }}>{t('bonus.title')}</span>
            </div>
            {!bonusLoaded
              ? <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'rgba(255,255,255,.3)' }}>
                  <Loader2 size={11} className="animate-spin" /> Loading…
                </div>
              : canClaimBonus
              ? <button className="btn btn-sm" style={{ background:'linear-gradient(135deg,#fbbf24,#f59e0b)', color:'#3a1a00', fontWeight:800, border:'none', boxShadow:'0 0 20px rgba(245,158,11,.4)', padding:'9px 18px', borderRadius:11, fontSize:13 }}
                  onClick={handleClaimBonus} disabled={claimingBonus}>
                  {claimingBonus ? <><Loader2 size={12} className="animate-spin" /> Claiming…</> : t('dashboard.claimNow')}
                </button>
              : <div style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'rgba(255,255,255,.4)', fontWeight:600 }}>
                  <Clock size={11} style={{ color:'rgba(255,255,255,.25)' }} /> {bonusCooldown}
                </div>
            }
          </div>
        </div>

        {/* Progress bar */}
        <div className="dash-bonus-bar">
          <div style={{ height:'100%', width:`${bonusPoints % 100}%`, borderRadius:999, background:'linear-gradient(90deg,#f59e0b,#fbbf24)', boxShadow:'0 0 8px rgba(251,191,36,.5)', transition:'width .6s cubic-bezier(.22,1,.36,1)' }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:6 }}>
          <span style={{ fontSize:10, color:'rgba(255,255,255,.4)', fontWeight:600 }}>{bonusPoints % 100}/100 to next reward</span>
          <span style={{ fontSize:10, color:'rgba(255,255,255,.4)' }}>Level {Math.floor(bonusPoints / 100) + 1}</span>
        </div>
      </div>
    </div>
  );
}
