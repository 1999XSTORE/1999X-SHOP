import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import { Wallet, Key, Gift, Clock, TrendingUp, Zap, Copy, CheckCircle, Eye, EyeOff, Loader2, Sparkles, ChevronRight, ChevronLeft, Download, Crown, Activity } from 'lucide-react';
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

function MiniCountdown({ ms }: { ms: number }) {
  const [txt, setTxt] = useState('');

  useEffect(() => {
    const tick = () => {
      const left = ms - Date.now();
      if (left <= 0) {
        setTxt('00:00:00');
        return;
      }
      const h = String(Math.floor(left / 3600000)).padStart(2, '0');
      const m = String(Math.floor((left % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
      setTxt(`${h}:${m}:${s}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [ms]);

  return <span className="font-mono font-medium opacity-80 tracking-wider">{txt}</span>;
}

function LicenseCarouselCard({ lic }: { lic: any }) {
  const key = lic.key.replace('_INTERNAL', '');
  const dLeft = Math.max(0, Math.floor((new Date(lic.expiresAt).getTime() - Date.now()) / 86400000));
  const total = Math.max(30, Math.ceil((new Date(lic.expiresAt).getTime() - new Date(lic.lastLogin).getTime()) / 86400000));
  const pct = Math.min(100, (dLeft / total) * 100);

  return (
    <div className="snap-start shrink-0 w-[280px] md:w-[320px] h-[400px] rounded-[2rem] bg-slate-900/60 backdrop-blur-2xl border border-white/5 overflow-hidden relative group flex flex-col shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-2">
      {/* Background artwork placeholder / Glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-cyan-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-500 z-0"/>
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px] rounded-full z-0 pointer-events-none"/>
      
      <div className="p-6 relative z-10 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10">
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399] animate-pulse"/>
            <span className="text-[10px] font-semibold text-white/70 uppercase tracking-widest">Active</span>
          </div>
          <Crown size={18} className="text-white/20 group-hover:text-indigo-400 transition-colors" />
        </div>

        <div className="mt-auto mb-6">
          <h3 className="text-2xl font-bold text-white tracking-tight leading-none mb-2">{lic.productName}</h3>
          <p className="text-sm text-slate-400 leading-relaxed max-w-[200px]">Empowering your gameplay with cutting edge telemetry.</p>
        </div>

        <div className="mb-6 space-y-2">
          <div className="flex justify-between text-xs font-semibold text-slate-400 tracking-wider">
            <span>{dLeft} DAYS REMAINING</span>
            <span className="text-indigo-400">{Math.round(pct)}%</span>
          </div>
          <div className="h-1.5 w-full bg-slate-800 rounded-full overflow-hidden flex">
            <div className="h-full bg-gradient-to-r from-cyan-500 to-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-slate-950/50 border border-white/5 font-mono text-xs text-slate-300 text-center truncate tracking-widest select-all">
          {key}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { balance, licenses, transactions, user, addLicense } = useAppStore();
  
  // Free Key State
  const [row, setRow] = useState<FreeRow | null>(null);
  const [dbLoading, setDbLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  const [fkCooldownMs, setFkCooldownMs] = useState(0);
  const loaded = useRef(false);

  // Bonus State
  const [bonusPoints, setBonusPoints] = useState(0);
  const [lastBonusClaim, setLastBonusClaim] = useState<string | null>(null);
  const [bonusCooldown, setBonusCooldown] = useState('');
  const [canClaimBonus, setCanClaimBonus] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [bonusLoaded, setBonusLoaded] = useState(false);

  // Load Bonus
  useEffect(() => {
    if (!user?.id) return;
    setBonusLoaded(false);
    fetchBonusRow(user.id).then((r) => {
      if (r) {
        setBonusPoints(r.bonus_points ?? 0);
        setLastBonusClaim(r.last_claim_time ?? null);
      }
      setBonusLoaded(true);
    });
  }, [user?.id]);

  // Load Free Key
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

  // Free Key Ticker
  useEffect(() => {
    const tick = () => {
      if (!row) { setCanClaim(true); setFkCooldownMs(0); return; }
      const next = new Date(row.claimed_at).getTime() + FREE_KEY_COOLDOWN;
      if (next - Date.now() <= 0) { setCanClaim(true); setFkCooldownMs(0); }
      else { setCanClaim(false); setFkCooldownMs(next); }
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [row?.claimed_at]);

  // Bonus Ticker
  useEffect(() => {
    const tick = () => {
      if (!lastBonusClaim) { setCanClaimBonus(true); setBonusCooldown(''); return; }
      const diff = BONUS_COOLDOWN - (Date.now() - new Date(lastBonusClaim).getTime());
      if (diff <= 0) { setCanClaimBonus(true); setBonusCooldown(''); return; }
      setCanClaimBonus(false);
      const h = Math.floor(diff / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setBonusCooldown(`${h}h ${m}m ${s}s`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [lastBonusClaim]);

  const handleClaimBonus = async () => {
    if (!user || !canClaimBonus || claimingBonus || !bonusLoaded) return;
    setClaimingBonus(true);
    const latest = await fetchBonusRow(user.id);
    if (latest?.last_claim_time) {
      if (BONUS_COOLDOWN - (Date.now() - new Date(latest.last_claim_time).getTime()) > 0) {
        setLastBonusClaim(latest.last_claim_time); setCanClaimBonus(false); setClaimingBonus(false); toast.error('Already claimed recently.'); return;
      }
    }
    const nextPoints = (latest?.bonus_points ?? bonusPoints) + 10;
    const claimTime = new Date().toISOString();
    const { error } = await upsertBonusRow(user.id, user.email, nextPoints, claimTime);
    if (error) { toast.error(t('common.error')); setClaimingBonus(false); return; }
    
    setBonusPoints(nextPoints); setLastBonusClaim(claimTime); setClaimingBonus(false);
    toast.success(t('bonus.claimed'));
    logActivity({ userId:user.id, userEmail:user.email, userName:user.name, action:'bonus_claim', status:'success', meta:{ points:10, total:nextPoints } });
  };

  const handleClaimFreeKey = async () => {
    if (!canClaim || generating || !user) return;
    setGenerating(true);
    toast.loading('Initializing environment...', { id:'free-trial' });

    try {
      const [lagRes, intRes] = await Promise.all([
        fetch(`${SUPA_URL}/functions/v1/generate-key`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${SUPA_ANON}`, apikey:SUPA_ANON }, body:JSON.stringify({ panel_type:'lag', days:1, hours:0, mask:'1999X-FREE-****' }) }).then(r => r.json()),
        fetch(`${SUPA_URL}/functions/v1/generate-key`, { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${SUPA_ANON}`, apikey:SUPA_ANON }, body:JSON.stringify({ panel_type:'internal', days:1, hours:0, mask:'1999X-FREE-****' }) }).then(r => r.json()),
      ]);

      const lagKey = lagRes?.success ? lagRes.key : null;
      const intKey = intRes?.success ? intRes.key : null;

      if (!lagKey && !intKey) { toast.dismiss('free-trial'); toast.error(t('license.activationFailed')); setGenerating(false); return; }

      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + FREE_KEY_TTL).toISOString();
      const { error } = await supabase.from('free_trial_keys').upsert({ user_id:user.id, user_email:user.email, lag_key:lagKey, internal_key:intKey, claimed_at:now, expires_at:expiresAt }, { onConflict:'user_id' });

      if (error) { toast.dismiss('free-trial'); toast.error(error.message); setGenerating(false); return; }

      if (lagKey) addLicense({ id:`free_lag_${Date.now()}`, productId:'keyauth-lag', productName:'Fake Lag (Free 1 Day Trial)', key:lagKey, hwid:'', lastLogin:now, expiresAt, status:'active', ip:'', device:'', hwidResetsUsed:0, hwidResetMonth:new Date().getMonth() });
      if (intKey) addLicense({ id:`free_int_${Date.now()}`, productId:'keyauth-internal', productName:'Internal (Free 1 Day Trial)', key:`${intKey}_INTERNAL`, hwid:'', lastLogin:now, expiresAt, status:'active', ip:'', device:'', hwidResetsUsed:0, hwidResetMonth:new Date().getMonth() });

      setRow({ lag_key:lagKey, internal_key:intKey, claimed_at:now, expires_at:expiresAt });
      toast.dismiss('free-trial'); toast.success('Trial Environment Provisioned');
    } catch (error) { toast.dismiss('free-trial'); toast.error(String(error)); }
    setGenerating(false);
  };

  const copyKey = (val: string) => {
    navigator.clipboard.writeText(val);
    toast.success('Copied to clipboard');
  };

  const active = licenses.filter((license) => new Date(license.expiresAt).getTime() > Date.now());
  const approved = (transactions as any[]).filter((tx: any) => tx.status === 'approved').length;

  const stats = [
    { label: 'Balance', val: `$${balance.toFixed(2)}`, icon: Wallet, color: 'text-indigo-400', shadow: 'shadow-indigo-500/20', hover: 'group-hover:shadow-[0_0_40px_rgba(99,102,241,0.3)]' },
    { label: 'Active Keys', val: active.length, icon: Key, color: 'text-emerald-400', shadow: 'shadow-emerald-500/20', hover: 'group-hover:shadow-[0_0_40px_rgba(16,232,152,0.3)]' },
    { label: 'Purchases', val: approved, icon: TrendingUp, color: 'text-cyan-400', shadow: 'shadow-cyan-500/20', hover: 'group-hover:shadow-[0_0_40px_rgba(34,211,238,0.3)]' },
    { label: 'Rewards', val: bonusPoints, icon: Gift, color: 'text-amber-400', shadow: 'shadow-amber-500/20', hover: 'group-hover:shadow-[0_0_40px_rgba(251,191,36,0.3)]' },
  ];

  const scrollRef = useRef<HTMLDivElement>(null);
  const isFreeKeyActive = !!row && new Date(row.expires_at).getTime() > Date.now();

  return (
    <div className="relative min-h-screen text-slate-200 overflow-x-hidden pt-8 pb-32">
      
      {/* GLOBAL BACKGROUND - Extreme Dark Grid & Big Glows */}
      <div className="fixed inset-0 z-[-1] pointer-events-none bg-[#03050a] flex items-center justify-center">
        {/* Technical Grid Overlay */}
        <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:60px_60px]"></div>
        
        {/* Massive Space Glows (Image 1 Style) */}
        <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[70vw] h-[70vw] rounded-full bg-blue-900/10 blur-[150px]"></div>
        <div className="absolute bottom-[-30%] left-[-10%] w-[50vw] h-[50vw] rounded-full bg-indigo-900/10 blur-[130px]"></div>
        <div className="absolute top-[20%] right-[-20%] w-[60vw] h-[60vw] rounded-full bg-cyan-900/5 blur-[120px]"></div>
        
        {/* Deep vignette */}
        <div className="absolute inset-0 bg-gradient-to-t from-[#03050a]/80 via-transparent to-[#03050a]/80"></div>
      </div>

      {/* 1. SaaS HERO SECTION */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center px-6 mt-12 mb-20 animate-in fade-in slide-in-from-bottom-8 duration-1000">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/5 border border-white/10 text-[11px] font-semibold tracking-widest text-white/50 mb-8 backdrop-blur-md uppercase shadow-xl transition-transform hover:scale-105">
          <Sparkles size={14} className="text-cyan-400" />
          <span>Performance Benchmarks Active</span>
        </div>
        
        <h1 className="text-5xl md:text-7xl lg:text-[5.5rem] font-bold text-white tracking-tighter leading-[1.05] max-w-5xl">
          The #1 AI agent <br className="hidden md:block"/>
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-slate-200 via-cyan-200 to-indigo-300 font-light italic opacity-90">for undetectable logic</span>
        </h1>
        
        <p className="mt-8 text-lg text-slate-400 max-w-2xl font-light leading-relaxed">
          Welcome back, <span className="text-white font-medium">{user?.name}</span>. Streamline your presence with our intuitive, scalable 1999X platform.
        </p>
        
        <div className="mt-12">
          {canClaim ? (
            <button 
              onClick={handleClaimFreeKey} disabled={generating}
              className="group relative inline-flex items-center gap-3 px-8 py-4 rounded-full bg-white text-black font-semibold tracking-wide hover:scale-105 active:scale-95 transition-all shadow-[0_0_40px_rgba(255,255,255,0.3)] disabled:opacity-50"
            >
              {generating ? <Loader2 size={18} className="animate-spin"/> : <Zap size={18}/>}
              <span>{generating ? 'Initializing...' : 'Start free trial'}</span>
            </button>
          ) : (
            <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-white/5 border border-white/10 text-sm font-medium text-white/60">
              <Clock size={16}/> Trial Cooldown: <MiniCountdown ms={fkCooldownMs} />
            </div>
          )}
        </div>
      </div>

      {/* 2. CIRCULAR STATS HUB (Image 1 Bottom Row) */}
      <div className="relative z-10 w-full max-w-5xl mx-auto mb-32 px-6">
        {/* Subtle bridge line */}
        <div className="hidden md:block absolute top-10 left-12 right-12 h-[1px] bg-gradient-to-r from-transparent via-white/10 to-transparent -z-10"></div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8 md:gap-4 relative">
          {stats.map((stat, i) => (
            <div key={i} className="group flex flex-col items-center gap-5 cursor-pointer transition-transform hover:-translate-y-2 animate-in fade-in zoom-in-95 duration-700" style={{ animationDelay: `${i * 100}ms` }}>
              <div className={`w-20 h-20 rounded-full bg-slate-900/40 backdrop-blur-2xl border border-white/5 flex items-center justify-center transition-all duration-300 shadow-2xl ${stat.hover}`}>
                <stat.icon size={26} className={stat.color} />
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white mb-0.5">{stat.val}</div>
                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.2em]">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. ACTIVE SUBSCRIPTIONS CAROUSEL (Image 2 style) */}
      {active.length > 0 && (
        <div className="relative z-10 w-full max-w-7xl mx-auto mb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-200">
          <div className="flex items-end justify-between px-6 mb-8">
            <div>
              <h2 className="text-2xl font-semibold tracking-tight text-white mb-1">Active Environments</h2>
              <p className="text-sm text-slate-400">Manage and monitor your deployed instances.</p>
            </div>
            <div className="hidden md:flex gap-2">
              <button onClick={() => scrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors backdrop-blur-sm"><ChevronLeft size={18}/></button>
              <button onClick={() => scrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors backdrop-blur-sm"><ChevronRight size={18}/></button>
            </div>
          </div>
          
          <div ref={scrollRef} className="flex overflow-x-auto gap-6 px-6 snap-x pb-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
            {active.map(lic => <LicenseCarouselCard key={lic.id} lic={lic} />)}
          </div>
        </div>
      )}

      {/* 4. BOTTOM GLASS PANELS (Image 3 Tech / Clean Cards) */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-8 mb-20">
        
        {/* FREE KEY ACTIVE / HISTORY (Left Pane) */}
        <div className="rounded-[2rem] bg-slate-900/30 backdrop-blur-2xl border border-emerald-500/10 p-8 flex flex-col hover:border-emerald-500/30 transition-colors shadow-2xl">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <Activity size={24} className="text-emerald-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Experiment Bot AI</h3>
              <p className="text-sm text-slate-400">Risk-free trial environments.</p>
            </div>
          </div>

          {!dbLoading && isFreeKeyActive ? (
             <div className="flex-1 flex flex-col gap-4">
               <div className="inline-flex items-center gap-3 px-4 py-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold w-fit">
                 <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"/> Online
                 <div className="opacity-50 ml-2">Expires in <MiniCountdown ms={new Date(row!.expires_at).getTime()} /></div>
               </div>
               
               <div className="grid gap-3 mt-auto">
                 {row!.lag_key && (
                   <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5 flex items-center justify-between group">
                     <div className="font-mono text-xs text-slate-300">LAG TIER</div>
                     <button onClick={() => copyKey(row!.lag_key!)} className="p-2 rounded-md bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"><Copy size={14}/></button>
                   </div>
                 )}
                 {row!.internal_key && (
                   <div className="p-4 rounded-xl bg-slate-950/50 border border-white/5 flex items-center justify-between group">
                     <div className="font-mono text-xs text-slate-300">INTERNAL TIER</div>
                     <button onClick={() => copyKey(row!.internal_key!)} className="p-2 rounded-md bg-white/5 hover:bg-white/10 text-white/50 hover:text-white transition-colors"><Copy size={14}/></button>
                   </div>
                 )}
               </div>
             </div>
          ) : (
             <div className="flex-1 flex flex-col justify-center items-center text-center py-10 opacity-60">
                <BoxIcon />
                <p className="text-sm mt-4 font-medium uppercase tracking-widest text-slate-500">No active process</p>
             </div>
          )}
        </div>

        {/* DAILY BONUS REWARD (Right Pane) */}
        <div className="rounded-[2rem] bg-slate-900/30 backdrop-blur-2xl border border-amber-500/10 p-8 flex flex-col hover:border-amber-500/30 transition-colors shadow-2xl overflow-hidden relative group">
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-amber-500/10 transition-colors"/>
          
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 flex items-center justify-center border border-amber-500/20">
              <Gift size={24} className="text-amber-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">Growth Archive</h3>
              <p className="text-sm text-slate-400">Daily interaction rewards tracking.</p>
            </div>
          </div>

          <div className="flex items-baseline gap-3 mb-10">
            <span className="text-6xl font-bold text-white tracking-tighter">{bonusPoints}</span>
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest">Points Yielded</span>
          </div>

          <div className="mt-auto">
            <div className="h-2 w-full bg-slate-900 rounded-full overflow-hidden mb-4">
              <div className="h-full bg-gradient-to-r from-amber-600 to-yellow-400 shadow-[0_0_15px_#fbbf24] rounded-full transition-all duration-1000" style={{ width: `${bonusPoints % 100}%` }} />
            </div>
            
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 tracking-wider mb-6">
              <span>{Math.max(0, 100 - (bonusPoints % 100))} POINTS NEXT</span>
              <span>LEVEL {Math.floor(bonusPoints / 100) + 1}</span>
            </div>

            {bonusLoaded && canClaimBonus ? (
              <button onClick={handleClaimBonus} disabled={claimingBonus} className="w-full py-4 rounded-xl bg-white/10 hover:bg-white/15 border border-white/5 font-semibold text-white tracking-wide transition-colors flex justify-center items-center gap-2">
                {claimingBonus ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                Mine Rewards
              </button>
            ) : (
              <button disabled className="w-full py-4 rounded-xl bg-slate-900/50 border border-white/5 font-semibold text-slate-500 tracking-wide flex justify-center items-center gap-2 cursor-not-allowed">
                <Clock size={16} /> <MiniCountdown ms={new Date(lastBonusClaim!).getTime() + BONUS_COOLDOWN} />
              </button>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}

function BoxIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" className="opacity-20">
      <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
      <polyline points="3.29 7 12 12 20.71 7"></polyline>
      <line x1="12" y1="22" x2="12" y2="12"></line>
    </svg>
  );
}
