import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import { Wallet, Key, Gift, Clock, TrendingUp, Zap, Copy, CheckCircle, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const SUPA_URL  = 'https://wkjqrjafogufqeasfeev.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok';
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
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const diff = new Date(expiresAt).getTime() - now;
  if (diff <= 0) return <span style={{ color:'var(--red)', fontWeight:700, fontSize:13 }}>Expired</span>;

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
  const color = isPurple ? 'var(--purple)' : 'var(--blue)';
  const bg = isPurple ? 'rgba(109,40,217,.07)' : 'rgba(56,189,248,.06)';
  const bc = isPurple ? 'rgba(139,92,246,.18)' : 'rgba(56,189,248,.16)';

  return (
    <div className="g g-hover g-lift fu" style={{ background:bg, borderColor:bc, padding:20 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
        <div style={{ display:'flex', alignItems:'center', gap:7 }}>
          <div className={isPurple ? 'dot dot-purple' : 'dot'} style={!isPurple ? { background:'var(--blue)', boxShadow:'0 0 7px var(--blue)', animation:'blink 2s infinite' } : {}} />
          <span className="label" style={{ color }}>{lic.productName}</span>
        </div>
        <span className={`badge badge-${isPurple ? 'purple' : 'blue'}`}>Active</span>
      </div>
      <Ticker expiresAt={lic.expiresAt} />
      <p style={{ fontSize:11, color:'var(--dim)', margin:'4px 0 12px' }}>
        until {new Date(lic.expiresAt).toLocaleDateString('en-US', { month:'short', day:'numeric', year:'numeric' })}
      </p>
      <div className="prog" style={{ marginBottom:8 }}>
        <div className="prog-bar" style={{ width:`${pct}%`, background:isPurple ? 'linear-gradient(90deg,#6d28d9,#8b5cf6)' : 'linear-gradient(90deg,#0ea5e9,#38bdf8)' }} />
      </div>
      <code className="mono" style={{ fontSize:10, color:'rgba(255,255,255,.22)', wordBreak:'break-all' }}>{key}</code>
    </div>
  );
}

function FreeKeyCard() {
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
        toast.error('Key generation failed');
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
      toast.success('Free 1-day trial claimed');
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
    toast.success('Copied');
  };

  if (dbLoading) {
    return (
      <div className="g fu" style={{ padding:'18px 22px', background:'rgba(99,102,241,.05)', borderColor:'rgba(99,102,241,.18)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:8, color:'var(--muted)' }}>
          <Loader2 size={14} className="animate-spin" />
          <span style={{ fontSize:13 }}>Loading trial card...</span>
        </div>
      </div>
    );
  }

  const isActive = !!row && new Date(row.expires_at).getTime() > Date.now();
  const keyList = [
    ...(row?.internal_key ? [{ id:'int', label:'Internal Trial Key', key:row.internal_key.replace('_INTERNAL', '') }] : []),
    ...(row?.lag_key ? [{ id:'lag', label:'Fake Lag Trial Key', key:row.lag_key }] : []),
  ];

  return (
    <div className="g fu" style={{ padding:'28px 30px', background:'linear-gradient(135deg,rgba(255,255,255,.14),rgba(109,40,217,.12) 48%,rgba(56,189,248,.08))', borderColor:'rgba(167,139,250,.28)', boxShadow:'0 0 0 1px rgba(255,255,255,.08) inset, 0 20px 70px rgba(109,40,217,.18), 0 0 90px rgba(56,189,248,.08)', position:'relative', overflow:'hidden', backdropFilter:'blur(22px)' }}>
      <div style={{ position:'absolute', inset:-80, background:'radial-gradient(circle at top left, rgba(139,92,246,.2), transparent 40%), radial-gradient(circle at bottom right, rgba(56,189,248,.18), transparent 38%)', pointerEvents:'none' }} />
      <div style={{ position:'relative', display:'flex', alignItems:'flex-start', gap:18, marginBottom:isActive && keyList.length ? 18 : 0 }}>
        <div style={{ width:58, height:58, borderRadius:18, background:'rgba(99,102,241,.16)', border:'1px solid rgba(167,139,250,.36)', display:'flex', alignItems:'center', justifyContent:'center', boxShadow:'0 0 30px rgba(99,102,241,.22)' }}>
          <Zap size={26} color="#c4b5fd" />
        </div>
        <div style={{ flex:1 }}>
          <div style={{ fontSize:18, fontWeight:800, color:'#fff', marginBottom:5 }}>Free 1 Day Trial Key</div>
          <div style={{ fontSize:12, color:'rgba(255,255,255,.72)', marginBottom:14 }}>Glassmorphism trial card with a 48-hour cooldown that stays saved on your account.</div>

          {isActive && row && (
            <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:12, flexWrap:'wrap' }}>
              <div className="dot dot-green" style={{ width:5, height:5 }} />
              <span style={{ fontSize:11, fontWeight:700, color:'var(--green)' }}>Trial active</span>
              <span style={{ fontSize:11, color:'var(--muted)' }}>Expires in</span>
              <MiniCountdown ms={new Date(row.expires_at).getTime()} />
            </div>
          )}

          {row && !isActive && (
            <div style={{ fontSize:11, color:'var(--dim)', display:'flex', alignItems:'center', gap:5, marginBottom:12 }}>
              <span style={{ color:'var(--red)', fontSize:8 }}>•</span>
              Trial expired
            </div>
          )}

          {canClaim ? (
            <button onClick={handleClaim} disabled={generating} className="btn btn-sm" style={{ background:'linear-gradient(135deg,#4f46e5,#7c3aed)', color:'#fff', border:'none', fontWeight:800, gap:6, boxShadow:'0 0 24px rgba(99,102,241,.45)', padding:'11px 16px' }}>
              {generating ? <><Loader2 size={13} className="animate-spin" /> Generating...</> : <><Zap size={13} /> Claim Free 1 Day Trial</>}
            </button>
          ) : (
            <div style={{ fontSize:11, color:'var(--dim)', display:'flex', alignItems:'center', gap:5 }}>
              <Clock size={11} />
              Next free claim in <MiniCountdown ms={cooldownMs} />
            </div>
          )}
        </div>
      </div>

      {isActive && keyList.length > 0 && (
        <div style={{ position:'relative', display:'flex', flexDirection:'column', gap:8, paddingTop:4 }}>
          {keyList.map((keyItem) => (
            <div key={keyItem.id} style={{ background:'rgba(255,255,255,.08)', border:'1px solid rgba(255,255,255,.12)', borderRadius:12, padding:'12px 14px', backdropFilter:'blur(14px)' }}>
              <div style={{ fontSize:10, color:'var(--muted)', textTransform:'uppercase', letterSpacing:'.08em', marginBottom:6 }}>{keyItem.label}</div>
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <code style={{ flex:1, fontSize:12, fontFamily:'monospace', color:'#fff', letterSpacing:'1px', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', filter:revealed[keyItem.id] ? 'none' : 'blur(5px)', transition:'filter .3s' }}>
                  {keyItem.key}
                </code>
                <button onClick={() => setRevealed((prev) => ({ ...prev, [keyItem.id]:!prev[keyItem.id] }))} style={{ padding:'4px 7px', borderRadius:7, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.09)', cursor:'pointer', color:'var(--muted)', display:'flex' }}>
                  {revealed[keyItem.id] ? <EyeOff size={12} /> : <Eye size={12} />}
                </button>
                <button onClick={() => copyKey(keyItem.key, keyItem.id)} style={{ padding:'4px 7px', borderRadius:7, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.09)', cursor:'pointer', color:copied[keyItem.id] ? 'var(--green)' : 'var(--muted)', display:'flex' }}>
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

  useEffect(() => {
    if (!user?.id) return;
    fetchBonusRow(user.id).then((row) => {
      if (!row) return;
      setBonusPoints(row.bonus_points ?? 0);
      setLastBonusClaim(row.last_claim_time ?? null);
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
    if (!user || !canClaimBonus || claimingBonus) return;
    setClaimingBonus(true);
    const latest = await fetchBonusRow(user.id);
    const nextPoints = (latest?.bonus_points ?? bonusPoints) + 10;
    const claimTime = new Date().toISOString();
    const { error } = await upsertBonusRow(user.id, user.email, nextPoints, claimTime);
    if (error) {
      toast.error('Failed to save bonus points');
      setClaimingBonus(false);
      return;
    }
    setBonusPoints(nextPoints);
    setLastBonusClaim(claimTime);
    setClaimingBonus(false);
    toast.success('Bonus updated: +10 points');
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
    <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
      <div className="g fu" style={{ padding:'22px 24px', background:'linear-gradient(135deg,rgba(109,40,217,.1) 0%,rgba(255,255,255,.025) 100%)', position:'relative', overflow:'hidden' }}>
        <div style={{ position:'absolute', top:0, right:0, width:250, height:250, borderRadius:'50%', background:'radial-gradient(circle,rgba(109,40,217,.15) 0%,transparent 70%)', transform:'translate(30%,-30%)', pointerEvents:'none' }} />
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', position:'relative', flexWrap:'wrap', gap:12 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            {user?.avatar
              ? <img src={user.avatar} style={{ width:46, height:46, borderRadius:12, objectFit:'cover', border:'2px solid rgba(139,92,246,.3)' }} />
              : <div style={{ width:46, height:46, borderRadius:12, background:'linear-gradient(135deg,#6d28d9,#4c1d95)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18, fontWeight:800, color:'#fff' }}>{user?.name?.charAt(0) || 'U'}</div>}
            <div>
              <div className="label" style={{ marginBottom:4 }}>{t('dashboard.welcomeBack')}</div>
              <div style={{ fontSize:20, fontWeight:800, color:'#fff' }}>{user?.name?.split(' ')[0] || 'User'} hello</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 12px', borderRadius:20, background:'rgba(16,232,152,.08)', border:'1px solid rgba(16,232,152,.18)' }}>
            <div className="dot dot-green" />
            <span style={{ fontSize:11, fontWeight:700, color:'var(--green)' }}>{t('dashboard.undetected')}</span>
          </div>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:12 }} className="stg">
        {stats.map((stat, index) => (
          <div key={stat.label} className="g g-hover g-lift fu" style={{ padding:'18px 20px', background:stat.bg, borderColor:stat.bc, animationDelay:`${index * 55}ms` }}>
            <stat.icon size={18} style={{ color:stat.c, marginBottom:10 }} />
            <div style={{ fontSize:26, fontWeight:800, color:'#fff', marginBottom:4 }}>{stat.val}</div>
            <div className="label">{stat.label}</div>
          </div>
        ))}
      </div>

      {active.length > 0 ? (
        <div className="fu" style={{ animationDelay:'80ms' }}>
          <div className="label" style={{ color:'var(--purple)', marginBottom:10 }}>{t('dashboard.activeSubscriptions')}</div>
          <div style={{ display:'grid', gap:12, gridTemplateColumns:internal.length > 0 && lag.length > 0 ? 'repeat(auto-fit,minmax(280px,1fr))' : '1fr' }}>
            {internal.map((license) => <LicCard key={license.id} lic={license} accent="b" />)}
            {lag.map((license) => <LicCard key={license.id} lic={license} accent="p" />)}
          </div>
        </div>
      ) : (
        <div className="g fu" style={{ padding:'48px 20px', textAlign:'center', borderStyle:'dashed', animationDelay:'80ms' }}>
          <Key size={36} style={{ color:'rgba(255,255,255,.08)', margin:'0 auto 12px' }} />
          <p style={{ fontSize:15, fontWeight:600, color:'var(--muted)', marginBottom:6 }}>{t('dashboard.noLicense')}</p>
          <p style={{ fontSize:13, color:'var(--dim)' }}>{t('dashboard.noLicenseDesc')}</p>
        </div>
      )}

      {user && <FreeKeyCard />}

      <div className="g g-hover fu" style={{ padding:'18px 20px', background:'rgba(251,191,36,.06)', borderColor:'rgba(251,191,36,.16)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:42, height:42, borderRadius:11, background:'rgba(251,191,36,.1)', border:'1px solid rgba(251,191,36,.2)', display:'flex', alignItems:'center', justifyContent:'center' }}>
              <Gift size={20} color="var(--amber)" />
            </div>
            <div>
              <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:3 }}>{t('dashboard.dailyBonus')}</div>
              <div style={{ fontSize:12, color:'var(--muted)' }}>Always synced when you open the page and kept after refresh.</div>
            </div>
          </div>
          <div style={{ textAlign:'right', flexShrink:0, marginLeft:12 }}>
            <div style={{ fontSize:20, fontWeight:800, color:'var(--amber)', marginBottom:6 }}>{bonusPoints}<span style={{ fontSize:11, color:'var(--dim)', fontWeight:400, marginLeft:3 }}>pts</span></div>
            {canClaimBonus
              ? <button className="btn btn-sm" style={{ background:'linear-gradient(135deg,#fbbf24,#f59e0b)', color:'#3a1a00', fontWeight:700, boxShadow:'0 0 14px rgba(245,158,11,.3)', border:'none' }} onClick={handleClaimBonus} disabled={claimingBonus}>{claimingBonus ? <><Loader2 size={12} className="animate-spin" /> Saving...</> : t('dashboard.claimNow')}</button>
              : <div style={{ fontSize:11, color:'var(--dim)', display:'flex', alignItems:'center', gap:4 }}><Clock size={11} />{bonusCooldown}</div>
            }
          </div>
        </div>
        <div className="prog" style={{ marginTop:14 }}>
          <div className="prog-bar prog-a" style={{ width:`${bonusPoints % 100}%` }} />
        </div>
      </div>
    </div>
  );
}
