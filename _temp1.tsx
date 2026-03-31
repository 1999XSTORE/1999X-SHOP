import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { logActivity, notifyAll, sendNotificationEmail } from '@/lib/activity';
import { Wallet, Key, Gift, Clock, TrendingUp, Zap, Copy, CheckCircle, Loader2, Sparkles, ChevronRight, ChevronLeft, Download, Crown, Activity, Wrench, RefreshCw, Users, Globe, Plus, Trash2, Send, X } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { canManageAnnouncements } from '@/lib/roles';
import { safeFetch } from '@/lib/safeFetch';

const SUPA_URL  = 'https://awjouzwzdkrevvnlenvn.supabase.co';
const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3am91end6ZGtyZXZ2bmxlbnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTg4MjEsImV4cCI6MjA5MDAzNDgyMX0._I_I-WA_8-YqDfaRzKiVgpEAhkH9faxlEIV6e766A0M';

const BONUS_COOLDOWN = 86400000;

interface BonusRow {
  bonus_points: number;
  last_claim_time: string | null;
}
interface DBAnn { id:string; title:string; content:string; type:'update'|'maintenance'|'feature'; created_at:string; created_by?:string; }

const TYPE_CFG = {
  update:      { Icon: Sparkles, c:'text-emerald-400',  bg:'bg-emerald-500/10',  bc:'border-emerald-500/20', badge:'bg-emerald-500/20 text-emerald-400'  },
  maintenance: { Icon: Wrench,   c:'text-indigo-400',   bg:'bg-indigo-500/10',   bc:'border-indigo-500/20',  badge:'bg-indigo-500/20 text-indigo-400' },
  feature:     { Icon: Zap,      c:'text-cyan-400',     bg:'bg-cyan-500/10',     bc:'border-cyan-500/20',    badge:'bg-cyan-500/20 text-cyan-400'   },
} as const;

const OFFLINE  = { status:'offline', numUsers:'0', numKeys:'0', onlineUsers:'0', version:'ΓÇö' };
const safeNum  = (v: any) => { const n = parseInt(String(v ?? '0')); return isNaN(n) ? 0 : n; };
const norm     = (r: any) => { if (!r || r.status === 'offline') return OFFLINE; return { status:r.status??'online', numUsers:String(safeNum(r.numUsers??r.registered??0)), numKeys:String(safeNum(r.numKeys??r.keys??0)), onlineUsers:String(safeNum(r.onlineUsers??r.numOnlineUsers??0)), version:String(r.version??'ΓÇö') }; };

async function fetchBonusRow(userId: string): Promise<BonusRow | null> {
  const { data, error } = await supabase.from('user_bonus').select('bonus_points,last_claim_time').eq('user_id', userId).maybeSingle();
  if (error) return null; return data as BonusRow | null;
}

async function upsertBonusRow(userId: string, userEmail: string, bonusPoints: number, lastClaimTime: string | null) {
  return supabase.from('user_bonus').upsert({ user_id: userId, user_email: userEmail, bonus_points: bonusPoints, last_claim_time: lastClaimTime, updated_at: new Date().toISOString() }, { onConflict: 'user_id' });
}

function MiniCountdown({ ms }: { ms: number }) {
  const [txt, setTxt] = useState('');
  useEffect(() => {
    const tick = () => {
      const left = ms - Date.now();
      if (left <= 0) { setTxt('00:00:00'); return; }
      const h = String(Math.floor(left / 3600000)).padStart(2, '0');
      const m = String(Math.floor((left % 3600000) / 60000)).padStart(2, '0');
      const s = String(Math.floor((left % 60000) / 1000)).padStart(2, '0');
      setTxt(`${h}:${m}:${s}`);
    };
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [ms]);
  return <span className="font-mono font-medium tracking-wider">{txt}</span>;
}

function LicenseCarouselCard({ lic }: { lic: any }) {
  const key = lic.key.replace('_INTERNAL', '');
  const dLeft = Math.max(0, Math.floor((new Date(lic.expiresAt).getTime() - Date.now()) / 86400000));
  const total = Math.max(30, Math.ceil((new Date(lic.expiresAt).getTime() - new Date(lic.lastLogin).getTime()) / 86400000));
  const pct = Math.min(100, (dLeft / total) * 100);

  return (
    <div className="snap-start shrink-0 w-[280px] md:w-[320px] h-[400px] rounded-[2rem] bg-[#110822]/60 backdrop-blur-2xl border border-white/5 overflow-hidden relative group flex flex-col shadow-[0_20px_40px_rgba(0,0,0,0.5)] transition-transform hover:-translate-y-2">
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-purple-500/10 opacity-50 group-hover:opacity-100 transition-opacity duration-500 z-0"/>
      <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 blur-[50px] rounded-full z-0 pointer-events-none"/>
      
      <div className="p-6 relative z-10 flex-1 flex flex-col">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 shadow-inner">
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
          <div className="h-1.5 w-full bg-black/40 rounded-full overflow-hidden flex inset-shadow-sm">
            <div className="h-full bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full" style={{ width: `${pct}%` }} />
          </div>
        </div>

        <div className="p-3 rounded-xl bg-black/40 border border-white/5 font-mono text-xs text-slate-300 text-center truncate tracking-widest select-all shadow-inner">
          {key}
        </div>
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const { balance, licenses, transactions, user, systemStatus } = useAppStore();
  
  const isMod = canManageAnnouncements(user?.role);
  const isSystemOnline = systemStatus === 'online';

  // State: Bonus
  const [bonusPoints, setBonusPoints] = useState(0);
  const [lastBonusClaim, setLastBonusClaim] = useState<string | null>(null);
  const [bonusCooldown, setBonusCooldown] = useState('');
  const [canClaimBonus, setCanClaimBonus] = useState(false);
  const [claimingBonus, setClaimingBonus] = useState(false);
  const [bonusLoaded, setBonusLoaded] = useState(false);

  // State: Status Page (Live Stats)
  const [lag, setLag] = useState(OFFLINE);
  const [int, setInt] = useState(OFFLINE);
  const [statsLoading, setStatsLoading] = useState(false);
  const [lastStatsUpdate, setLastStatsUpdate] = useState(new Date());

  // State: Status Page (Announcements)
  const [anns, setAnns] = useState<DBAnn[]>([]);
  const [annLoading, setAnnLoading] = useState(true);
  
  // State: Status Page (Admin Form)
  const [showForm, setShowForm] = useState(false);
  const [fTitle, setFTitle] = useState('');
  const [fContent, setFContent] = useState('');
  const [fType, setFType] = useState<'update'|'maintenance'|'feature'>('update');
  const [publishing, setPublishing] = useState(false);

  // Load Bonus
  useEffect(() => {
    if (!user?.id) return;
    setBonusLoaded(false);
    fetchBonusRow(user.id).then((r) => {
      if (r) { setBonusPoints(r.bonus_points ?? 0); setLastBonusClaim(r.last_claim_time ?? null); }
      setBonusLoaded(true);
    });
  }, [user?.id]);

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

  // Live Stats Loader
  const loadKeyAuthStats = async () => {
    setStatsLoading(true);
    try {
      const res = await safeFetch('https://awjouzwzdkrevvnlenvn.supabase.co/functions/v1/keyauth-stats', { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${ANON}`, apikey:ANON }, body:'{}' }, 10000);
      if (res?.ok) { const d = await res.json(); if (d?.lag) setLag(norm(d.lag)); if (d?.internal) setInt(norm(d.internal)); }
    } catch {}
    setStatsLoading(false); setLastStatsUpdate(new Date());
  };

  useEffect(() => {
    loadKeyAuthStats();
    const i = setInterval(loadKeyAuthStats, 60000);
    return () => clearInterval(i);
  }, []);

  // Announcements Loader & Realtime
  useEffect(() => {
    supabase.from('announcements').select('*').order('created_at', { ascending:false }).limit(10)
      .then(({ data }) => { if (data) setAnns(data as DBAnn[]); setAnnLoading(false); });

    const ch = supabase.channel('status-anns')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'announcements' }, ({ new: r }) => {
        setAnns(prev => [r as DBAnn, ...prev]);
      })
      .on('postgres_changes', { event:'DELETE', schema:'public', table:'announcements' }, ({ old: r }) => {
        setAnns(prev => prev.filter(a => a.id !== (r as any).id));
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

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

  const handlePublishAnn = async () => {
    if (!fTitle.trim() || !fContent.trim()) { toast.error('Fill title and content'); return; }
    setPublishing(true);
    const { error } = await supabase.from('announcements').insert({ title: fTitle.trim(), content: fContent.trim(), type: fType, created_by: user?.email ?? '' });
    if (error) toast.error('Failed: ' + error.message);
    else {
      toast.success(t('status.published'));
      notifyAll({ type:'announcement', title:`≡ƒôó ${fTitle.trim()}`, body:fContent.trim().slice(0,80), linkPath:'/' });
      sendNotificationEmail({ mode:'broadcast', subject:fTitle.trim(), html:`<h2>${fTitle.trim()}</h2><p>${fContent.trim()}</p>` });
      if (user) logActivity({ userId:user.id, userEmail:user.email, userName:user.name, action:'announcement_posted', product:fTitle.trim(), status:'success', meta:{ type:fType } });
      setFTitle(''); setFContent(''); setFType('update'); setShowForm(false);
    }
    setPublishing(false);
  };

  const handleDeleteAnn = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) toast.error('Delete failed: ' + error.message);
  };

  const active = licenses.filter((license) => new Date(license.expiresAt).getTime() > Date.now());
  const approved = (transactions as any[]).filter((tx: any) => tx.status === 'approved').length;

  const totalOnline = safeNum(lag.onlineUsers) + safeNum(int.onlineUsers);
  const totalUsers  = safeNum(lag.numUsers)    + safeNum(int.numUsers);
  const typeLabel = (tp: string) => tp === 'update' ? t('status.update') : tp === 'maintenance' ? t('status.maintenanceType') : t('status.feature');

  const stats = [
    { label: t('dashboard.balance'), val: `$${balance.toFixed(2)}`, icon: Wallet, color: 'text-indigo-400', shadow: 'shadow-indigo-500/20', hover: 'hover:shadow-[0_0_40px_rgba(99,102,241,0.3)] hover:border-indigo-400/30' },
    { label: t('dashboard.activeKeys'), val: active.length, icon: Key, color: 'text-emerald-400', shadow: 'shadow-emerald-500/20', hover: 'hover:shadow-[0_0_40px_rgba(16,232,152,0.3)] hover:border-emerald-400/30' },
    { label: t('dashboard.approved'), val: approved, icon: TrendingUp, color: 'text-cyan-400', shadow: 'shadow-cyan-500/20', hover: 'hover:shadow-[0_0_40px_rgba(34,211,238,0.3)] hover:border-cyan-400/30' },
    { label: t('dashboard.bonusPoints'), val: bonusPoints, icon: Gift, color: 'text-fuchsia-400', shadow: 'shadow-fuchsia-500/20', hover: 'hover:shadow-[0_0_40px_rgba(217,70,239,0.3)] hover:border-fuchsia-400/30' },
  ];

  const scrollRef = useRef<HTMLDivElement>(null);

  return (
    <div className="relative min-h-screen text-slate-200 overflow-x-hidden pt-12 pb-32 font-sans selection:bg-indigo-500/30">
      
      {/* CLYPTO BACKGROUND - Deep Indigo, Purple, Spatial Glass Overlay */}
      <div className="fixed inset-0 z-[-1] pointer-events-none bg-[#0a0518]">
        <div className="absolute inset-0 z-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
        
        {/* Massive Space Glows */}
        <div className="absolute top-[-10%] right-[-10%] w-[60vw] h-[60vw] rounded-full bg-indigo-600/15 blur-[160px] mix-blend-screen animate-pulse duration-[8000ms]"></div>
        <div className="absolute top-[40%] left-[-20%] w-[50vw] h-[50vw] rounded-full bg-fuchsia-600/10 blur-[140px] mix-blend-screen animate-pulse duration-[10000ms]"></div>
        <div className="absolute bottom-[-20%] right-[10%] w-[40vw] h-[40vw] rounded-full bg-blue-600/10 blur-[130px] mix-blend-screen"></div>
        
        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0518]/90 via-transparent to-[#0a0518]/60"></div>
      </div>

      <div className="max-w-7xl mx-auto px-6 space-y-16 relative z-10">
        
        {/* 1. HUGE WELCOME HERO (Side-aligned) */}
        <div className="flex flex-col gap-1.5 animate-in fade-in slide-in-from-left-8 duration-1000">
          <h1 className="text-5xl md:text-7xl font-bold text-white tracking-tighter mix-blend-overlay opacity-90">Welcome back,</h1>
          <h1 className="text-6xl md:text-[5.5rem] font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-300 via-fuchsia-300 to-indigo-300 leading-none">
            {user?.name?.split(' ')[0] || 'User'}
          </h1>
        </div>

        {/* 2. THE TOP CONTENT WIDGETS (Stats & Announcements) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-8 duration-700 delay-100">
          
          {/* System Control / Live Stats (Left 1 Col) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 rounded-[2rem] bg-indigo-950/20 backdrop-blur-2xl border border-white/5 flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.5)] shadow-inner">
              <div className="flex items-center gap-4 mb-6">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center border ${isSystemOnline ? 'bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_20px_rgba(16,232,152,0.15)]' : 'bg-amber-500/10 border-amber-500/20 shadow-[0_0_20px_rgba(251,191,36,0.15)]'}`}>
                  <CheckCircle size={28} className={isSystemOnline ? 'text-emerald-400' : 'text-amber-400'} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white tracking-tight">{isSystemOnline ? t('status.allOps') : t('status.maintenance')}</h3>
                  <div className="flex items-center gap-2 mt-1 px-3 py-1 rounded-full bg-white/5 border border-white/10 w-fit">
                    <div className={`w-1.5 h-1.5 rounded-full ${isSystemOnline ? 'bg-emerald-400' : 'bg-amber-400'} animate-pulse`}/>
                    <span className="text-[10px] font-semibold text-white/70 uppercase tracking-widest">{t('status.systemStatus')}</span>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between mb-4 mt-2">
                <span className="text-sm font-semibold text-white/50">{t('status.liveStats')}</span>
                <button onClick={loadKeyAuthStats} disabled={statsLoading} className="text-white/30 hover:text-white/70 transition-colors">
                  <RefreshCw size={14} className={statsLoading ? 'animate-spin text-white' : ''} />
                </button>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 shadow-inner text-center">
                  <div className="text-3xl font-bold text-indigo-400 mb-1">{statsLoading ? <span className="opacity-50">...</span> : totalUsers.toLocaleString()}</div>
                  <div className="text-[10px] uppercase font-semibold tracking-widest text-slate-500">{t('status.totalUsers')}</div>
                </div>
                <div className="p-4 rounded-xl bg-black/40 border border-white/5 shadow-inner text-center">
                  <div className="text-3xl font-bold text-emerald-400 mb-1">{statsLoading ? <span className="opacity-50">...</span> : totalOnline.toLocaleString()}</div>
                  <div className="text-[10px] uppercase font-semibold tracking-widest text-slate-500">{t('status.onlineNow')}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Announcements (Right 2 Cols) */}
          <div className="lg:col-span-2 p-6 rounded-[2rem] bg-[#110822]/40 backdrop-blur-2xl border border-white/5 flex flex-col shadow-[0_10px_40px_rgba(0,0,0,0.5)] shadow-inner">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-bold text-white tracking-tight flex items-center gap-2">
                <Sparkles size={18} className="text-fuchsia-400" /> {t('status.announcements')}
              </h2>
              {isMod && (
                <button onClick={() => setShowForm(!showForm)} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/20 text-fuchsia-300 text-xs font-semibold hover:bg-fuchsia-500/20 transition-colors">
                  {showForm ? <><X size={14} /> Cancel</> : <><Plus size={14} /> New</>}
                </button>
              )}
            </div>

            {isMod && showForm && (
              <div className="p-5 rounded-2xl bg-fuchsia-950/20 border border-fuchsia-500/20 mb-6 shadow-inner space-y-4">
                <div className="flex gap-2 flex-wrap">
                  {(['update','feature','maintenance'] as const).map(tp => {
                    const cfg = TYPE_CFG[tp];
                    return (
                      <button key={tp} onClick={() => setFType(tp)} className={`px-4 py-1.5 rounded-full text-[11px] font-bold uppercase tracking-wider border transition-colors ${fType === tp ? `${cfg.bg} ${cfg.c} border-${cfg.c.split('-')[1]}-500/30` : 'bg-white/5 border-transparent text-white/50 hover:bg-white/10'}`}>
                        {typeLabel(tp)}
                      </button>
                    );
                  })}
                </div>
                <input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder={t('status.annTitle')} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-fuchsia-500/50 outline-none shadow-inner transition-colors" />
                <textarea value={fContent} onChange={e => setFContent(e.target.value)} placeholder={t('status.annContent')} rows={3} className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:border-fuchsia-500/50 outline-none shadow-inner resize-y transition-colors" />
                <button onClick={handlePublishAnn} disabled={publishing} className="w-full py-3 rounded-xl bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-semibold transition-colors flex justify-center items-center gap-2 shadow-[0_0_20px_rgba(217,70,239,0.3)]">
                  {publishing ? <><Loader2 size={16} className="animate-spin" /> {t('status.publishing')}</> : <><Send size={16} /> {t('status.publish')}</>}
                </button>
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2 pb-2 space-y-4 max-h-[300px] [scrollbar-color:rgba(255,255,255,0.1)_transparent] [scrollbar-width:thin]">
              {annLoading ? (
                <div className="py-12 text-center text-white/40 text-sm">{t('common.loading')}</div>
              ) : anns.length === 0 ? (
                <div className="py-12 text-center border border-dashed border-white/10 rounded-2xl mx-2">
                  <p className="text-white/50 font-medium">{t('status.noAnnouncements')}</p>
                </div>
              ) : (
                anns.map((ann) => {
                  const cfg = TYPE_CFG[ann.type] ?? TYPE_CFG.update;
                  return (
                    <div key={ann.id} className="p-4 rounded-2xl bg-black/20 border border-white/5 hover:bg-white/5 transition-colors group relative shadow-inner">
                      <div className="flex gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${cfg.bg}`}>
                          <cfg.Icon size={18} className={cfg.c} />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                            <span className="text-sm font-bold text-white">{ann.title}</span>
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-wider ${cfg.badge}`}>{typeLabel(ann.type)}</span>
                            <span className="text-[10px] text-white/30 ml-auto">{new Date(ann.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-sm text-slate-400 leading-relaxed">{ann.content}</p>
                        </div>
                        {isMod && (
                          <button onClick={() => handleDeleteAnn(ann.id)} className="absolute top-4 right-4 p-2 rounded-lg bg-red-500/10 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Trash2 size={14} />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* 3. FOUR DASHBOARD STATS (Premium Glass Floating Style) */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 animate-in fade-in zoom-in-95 duration-1000 delay-200">
          {stats.map((stat, i) => (
            <div key={i} className={`group flex items-center gap-5 p-5 rounded-[1.5rem] bg-indigo-950/20 backdrop-blur-2xl border border-white/5 shadow-inner transition-all duration-300 cursor-default ${stat.hover}`}>
              <div className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/40 flex items-center justify-center shrink-0 border border-white/5 shadow-inner">
                <stat.icon size={20} className={stat.color} />
              </div>
              <div className="min-w-0">
                <div className="text-2xl md:text-3xl font-bold text-white tracking-tight mb-0.5 truncate">{stat.val}</div>
                <div className="text-[10px] md:text-xs font-semibold text-slate-400 uppercase tracking-widest truncate">{stat.label}</div>
              </div>
            </div>
          ))}
        </div>

        {/* 4. ACTIVE SUBSCRIPTIONS CAROUSEL */}
        {active.length > 0 && (
          <div className="w-full animate-in fade-in slide-in-from-bottom-8 duration-1000 delay-300">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-2xl font-bold tracking-tight text-white">{t('dashboard.activeSubscriptions')}</h2>
              <div className="hidden md:flex gap-2">
                <button onClick={() => scrollRef.current?.scrollBy({ left: -320, behavior: 'smooth' })} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors backdrop-blur-sm shadow-inner"><ChevronLeft size={18}/></button>
                <button onClick={() => scrollRef.current?.scrollBy({ left: 320, behavior: 'smooth' })} className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/50 hover:bg-white/10 hover:text-white transition-colors backdrop-blur-sm shadow-inner"><ChevronRight size={18}/></button>
              </div>
            </div>
            
            <div ref={scrollRef} className="flex overflow-x-auto gap-6 snap-x pb-8 [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden">
              {active.map(lic => <LicenseCarouselCard key={lic.id} lic={lic} />)}
            </div>
          </div>
        )}

        {/* 5. DAILY BONUS BLOCK */}
        <div className="w-full md:w-[60%] lg:w-[45%] rounded-[2rem] bg-[#110822]/40 backdrop-blur-2xl border border-fuchsia-500/10 p-8 flex flex-col hover:border-fuchsia-500/30 transition-colors shadow-[0_20px_50px_rgba(0,0,0,0.5)] shadow-inner relative group animate-in fade-in zoom-in-95 duration-1000 delay-300">
          <div className="absolute top-0 right-0 w-64 h-64 bg-fuchsia-500/5 blur-[80px] rounded-full pointer-events-none group-hover:bg-fuchsia-500/10 transition-colors"/>
          
          <div className="flex items-center gap-4 mb-10">
            <div className="w-14 h-14 rounded-2xl bg-fuchsia-500/10 flex items-center justify-center border border-fuchsia-500/20 shadow-inner">
              <Gift size={28} className="text-fuchsia-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white tracking-tight">{t('dashboard.dailyBonus')}</h3>
              <p className="text-sm text-slate-400">{t('dashboard.dailyBonusDesc')}</p>
            </div>
          </div>

          <div className="flex items-baseline gap-3 mb-10 mt-auto">
            <span className="text-[4rem] font-bold text-white tracking-tighter leading-none">{bonusPoints}</span>
            <span className="text-sm font-semibold text-slate-500 uppercase tracking-widest">{t('bonus.title')}</span>
          </div>

          <div>
            <div className="h-2 w-full bg-black/40 shadow-inner rounded-full overflow-hidden mb-4 border border-white/5">
              <div className="h-full bg-gradient-to-r from-indigo-500 via-purple-500 to-fuchsia-500 shadow-[0_0_15px_rgba(217,70,239,0.5)] rounded-full transition-all duration-1000" style={{ width: `${bonusPoints % 100}%` }} />
            </div>
            
            <div className="flex items-center justify-between text-xs font-semibold text-slate-400 tracking-wider mb-8">
              <span>{Math.max(0, 100 - (bonusPoints % 100))} POINTS NEXT</span>
              <span className="text-fuchsia-400">LEVEL {Math.floor(bonusPoints / 100) + 1}</span>
            </div>

            {bonusLoaded && canClaimBonus ? (
              <button onClick={handleClaimBonus} disabled={claimingBonus} className="w-full py-4 rounded-xl bg-gradient-to-r from-indigo-600 to-fuchsia-600 hover:from-indigo-500 hover:to-fuchsia-500 font-bold text-white tracking-wide transition-all shadow-[0_0_20px_rgba(217,70,239,0.3)] hover:shadow-[0_0_30px_rgba(217,70,239,0.5)] flex justify-center items-center gap-2">
                {claimingBonus ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                {t('dashboard.claimNow')}
              </button>
            ) : (
              <button disabled className="w-full py-4 rounded-xl bg-black/40 border border-white/5 shadow-inner font-semibold text-slate-500 tracking-wide flex justify-center items-center gap-2 cursor-not-allowed">
                <Clock size={16} /> <MiniCountdown ms={new Date(lastBonusClaim!).getTime() + BONUS_COOLDOWN} />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
