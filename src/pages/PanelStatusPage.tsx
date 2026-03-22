import { useEffect, useState } from 'react';
import { safeFetch } from '@/lib/safeFetch';
import { supabase } from '@/lib/supabase';
import { logActivity, notifyAll } from '@/lib/activity';
import { useAppStore } from '@/lib/store';
import { CheckCircle, Sparkles, Wrench, RefreshCw, Users, Zap, Globe, Plus, Trash2, Send, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const TYPE_CFG = {
  update:      { Icon: Sparkles, c:'var(--green)',  bg:'rgba(16,232,152,.07)',  bc:'rgba(16,232,152,.16)',  badge:'badge-green'  },
  maintenance: { Icon: Wrench,   c:'var(--purple)', bg:'rgba(109,40,217,.07)', bc:'rgba(139,92,246,.16)', badge:'badge-purple' },
  feature:     { Icon: Zap,      c:'var(--blue)',   bg:'rgba(56,189,248,.06)',  bc:'rgba(56,189,248,.14)',  badge:'badge-blue'   },
} as const;

const OFFLINE  = { status:'offline', numUsers:'0', numKeys:'0', onlineUsers:'0', version:'—' };
const safeNum  = (v: any) => { const n = parseInt(String(v ?? '0')); return isNaN(n) ? 0 : n; };
const norm     = (r: any) => {
  if (!r || r.status === 'offline') return OFFLINE;
  return { status:r.status??'online', numUsers:String(safeNum(r.numUsers??r.registered??0)), numKeys:String(safeNum(r.numKeys??r.keys??0)), onlineUsers:String(safeNum(r.onlineUsers??r.numOnlineUsers??0)), version:String(r.version??'—') };
};

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok';

interface DBAnn { id:string; title:string; content:string; type:'update'|'maintenance'|'feature'; created_at:string; created_by?:string; }

export default function PanelStatusPage() {
  const { t }           = useTranslation();
  const { user, systemStatus } = useAppStore();
  const isMod           = user?.role === 'admin' || user?.role === 'support';
  const isOnline        = systemStatus === 'online';

  const [lag,     setLag]     = useState(OFFLINE);
  const [int,     setInt]     = useState(OFFLINE);
  const [loading, setL]       = useState(false);
  const [last,    setLast]    = useState(new Date());

  // Supabase announcements
  const [anns,       setAnns]       = useState<DBAnn[]>([]);
  const [annLoading, setAnnLoading] = useState(true);

  // Admin form
  const [showForm,   setShowForm]   = useState(false);
  const [fTitle,     setFTitle]     = useState('');
  const [fContent,   setFContent]   = useState('');
  const [fType,      setFType]      = useState<'update'|'maintenance'|'feature'>('update');
  const [publishing, setPublishing] = useState(false);

  // ── KeyAuth stats ─────────────────────────────────────────
  const load = async () => {
    setL(true);
    try {
      const res = await safeFetch(
        'https://wkjqrjafogufqeasfeev.supabase.co/functions/v1/keyauth-stats',
        { method:'POST', headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${ANON}`, apikey:ANON }, body:'{}' },
        10000
      );
      if (res?.ok) { const d = await res.json(); if (d?.lag) setLag(norm(d.lag)); if (d?.internal) setInt(norm(d.internal)); }
    } catch {}
    setL(false); setLast(new Date());
  };
  useEffect(() => { load(); const i = setInterval(load, 60000); return () => clearInterval(i); }, []);

  // ── Announcements: load + realtime ────────────────────────
  useEffect(() => {
    supabase.from('announcements').select('*').order('created_at', { ascending:false }).limit(30)
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

  // ── Publish ───────────────────────────────────────────────
  const handlePublish = async () => {
    if (!fTitle.trim() || !fContent.trim()) { toast.error('Fill title and content'); return; }
    setPublishing(true);
    const { error } = await supabase.from('announcements').insert({
      title: fTitle.trim(), content: fContent.trim(), type: fType, created_by: user?.email ?? '',
    });
    if (error) toast.error('Failed: ' + error.message);
    else {
      toast.success(t('status.published'));
      // Notify all users of new announcement in real-time
      notifyAll({ type:'announcement', title:`📢 ${fTitle.trim()}`, body:fContent.trim().slice(0,80), linkPath:'/panel-status' });
      if (user) logActivity({ userId:user.id, userEmail:user.email, userName:user.name, action:'announcement_posted', product:fTitle.trim(), status:'success', meta:{ type:fType } });
      setFTitle(''); setFContent(''); setFType('update'); setShowForm(false);
    }
    setPublishing(false);
  };

  // ── Delete ────────────────────────────────────────────────
  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('announcements').delete().eq('id', id);
    if (error) toast.error('Delete failed: ' + error.message);
  };

  const totalOnline = safeNum(lag.onlineUsers) + safeNum(int.onlineUsers);
  const totalUsers  = safeNum(lag.numUsers)    + safeNum(int.numUsers);

  const typeLabel = (tp: string) =>
    tp === 'update' ? t('status.update') : tp === 'maintenance' ? t('status.maintenanceType') : t('status.feature');

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

      {/* Status hero */}
      <div className="g g-hover fu" style={{ padding:'20px 22px', background:isOnline?'rgba(16,232,152,.06)':'rgba(251,191,36,.06)', borderColor:isOnline?'rgba(16,232,152,.16)':'rgba(251,191,36,.16)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{ width:46, height:46, borderRadius:12, background:isOnline?'rgba(16,232,152,.1)':'rgba(251,191,36,.1)', border:`1px solid ${isOnline?'rgba(16,232,152,.2)':'rgba(251,191,36,.2)'}`, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <CheckCircle size={22} color={isOnline?'var(--green)':'var(--amber)'} />
            </div>
            <div>
              <div className="label" style={{ marginBottom:4 }}>{t('status.systemStatus')}</div>
              <div style={{ fontSize:18, fontWeight:800, color:'#fff', letterSpacing:'-.01em' }}>{isOnline ? t('status.allOps') : t('status.maintenance')}</div>
            </div>
          </div>
          <div style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 12px', borderRadius:20, background:'rgba(16,232,152,.08)', border:'1px solid rgba(16,232,152,.18)' }}>
            <div className="dot dot-green" /><span style={{ fontSize:11, fontWeight:700, color:'var(--green)' }}>OB52 Undetected</span>
          </div>
        </div>
      </div>

      {/* Live stats */}
      <div className="g fu" style={{ padding:'20px 22px', animationDelay:'55ms' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
          <div style={{ display:'flex', alignItems:'center', gap:8 }}>
            <Users size={16} color="var(--purple)" />
            <span style={{ fontSize:15, fontWeight:700, color:'#fff' }}>{t('status.liveStats')}</span>
          </div>
          <button onClick={load} disabled={loading} style={{ display:'flex', alignItems:'center', gap:5, fontSize:11, color:'var(--dim)', background:'none', border:'none', cursor:'pointer', padding:4, borderRadius:6 }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--muted)')} onMouseLeave={e => (e.currentTarget.style.color = 'var(--dim)')}>
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} />{last.toLocaleTimeString()}
          </button>
        </div>

        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:18 }}>
          {[
            { label:t('status.totalUsers'), val:totalUsers,  c:'var(--purple)', bg:'rgba(109,40,217,.07)', bc:'rgba(139,92,246,.16)' },
            { label:t('status.onlineNow'),  val:totalOnline, c:'var(--green)',  bg:'rgba(16,232,152,.06)', bc:'rgba(16,232,152,.14)' },
          ].map(s => (
            <div key={s.label} className="g" style={{ padding:18, textAlign:'center', background:s.bg, borderColor:s.bc }}>
              <div className="mono" style={{ fontSize:44, fontWeight:900, color:s.c, letterSpacing:'-.04em', marginBottom:6 }}>
                {loading ? <span style={{ animation:'blink 1s infinite', opacity:.4 }}>···</span> : s.val.toLocaleString()}
              </div>
              <div className="label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="label" style={{ marginBottom:10 }}>{t('status.services')}</div>
        {['Authentication', 'License Server', 'Payment Gateway', 'Chat Server'].map(svc => (
          <div key={svc} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'11px 0', borderBottom:'1px solid var(--border)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:9 }}>
              <Globe size={13} style={{ color:'rgba(255,255,255,.2)' }} />
              <span style={{ fontSize:13, color:'var(--muted)' }}>{svc}</span>
            </div>
            <span style={{ display:'flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600, color:'var(--green)' }}>
              <div className="dot dot-green" style={{ width:5, height:5 }} />{t('status.online')}
            </span>
          </div>
        ))}
      </div>

      {/* ── Announcements ── */}
      <div className="fu" style={{ animationDelay:'110ms' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
          <div className="label" style={{ color:'var(--purple)' }}>{t('status.announcements')}</div>
          {isMod && (
            <button onClick={() => setShowForm(!showForm)}
              style={{ display:'flex', alignItems:'center', gap:6, padding:'7px 13px', borderRadius:10, background:showForm?'rgba(139,92,246,.18)':'rgba(139,92,246,.1)', border:'1px solid rgba(139,92,246,.25)', cursor:'pointer', color:'#c4b5fd', fontSize:12, fontWeight:700, fontFamily:'inherit', transition:'all .15s' }}>
              {showForm ? <><X size={13} /> Cancel</> : <><Plus size={13} /> {t('status.pushAnnouncement')}</>}
            </button>
          )}
        </div>

        {/* Admin push form */}
        {isMod && showForm && (
          <div className="g fu" style={{ padding:'20px 22px', marginBottom:14, borderColor:'rgba(139,92,246,.25)', background:'rgba(139,92,246,.04)' }}>
            {/* Type selector */}
            <div style={{ display:'flex', gap:7, marginBottom:12, flexWrap:'wrap' }}>
              {(['update','feature','maintenance'] as const).map(tp => {
                const cfg = TYPE_CFG[tp];
                return (
                  <button key={tp} onClick={() => setFType(tp)}
                    style={{ padding:'6px 14px', borderRadius:20, fontSize:11, fontWeight:700, cursor:'pointer', border:`1px solid ${fType===tp?cfg.c:'rgba(255,255,255,.1)'}`, background:fType===tp?cfg.bg:'rgba(255,255,255,.03)', color:fType===tp?cfg.c:'var(--muted)', fontFamily:'inherit', transition:'all .15s' }}>
                    {typeLabel(tp)}
                  </button>
                );
              })}
            </div>
            <input value={fTitle} onChange={e => setFTitle(e.target.value)} placeholder={t('status.annTitle')}
              style={{ width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, padding:'11px 14px', color:'#fff', fontFamily:'inherit', fontSize:14, outline:'none', marginBottom:10, boxSizing:'border-box' }}
              onFocus={e => { e.target.style.borderColor='rgba(139,92,246,.45)'; }} onBlur={e => { e.target.style.borderColor='rgba(255,255,255,.1)'; }}
            />
            <textarea value={fContent} onChange={e => setFContent(e.target.value)} placeholder={t('status.annContent')} rows={3}
              style={{ width:'100%', background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.1)', borderRadius:10, padding:'11px 14px', color:'#fff', fontFamily:'inherit', fontSize:14, outline:'none', resize:'vertical', marginBottom:14, boxSizing:'border-box' }}
              onFocus={e => { e.target.style.borderColor='rgba(139,92,246,.45)'; }} onBlur={e => { e.target.style.borderColor='rgba(255,255,255,.1)'; }}
            />
            <button onClick={handlePublish} disabled={publishing} className="btn btn-p btn-full">
              {publishing ? <><RefreshCw size={14} className="animate-spin" /> {t('status.publishing')}</> : <><Send size={14} /> {t('status.publish')}</>}
            </button>
          </div>
        )}

        {/* Announcements list */}
        {annLoading ? (
          <div style={{ textAlign:'center', padding:'24px 0', color:'var(--muted)', fontSize:13 }}>{t('common.loading')}</div>
        ) : anns.length === 0 ? (
          <div className="g fu" style={{ padding:'32px 20px', textAlign:'center', borderStyle:'dashed' }}>
            <p style={{ fontSize:14, fontWeight:600, color:'var(--muted)', marginBottom:4 }}>{t('status.noAnnouncements')}</p>
            <p style={{ fontSize:12, color:'var(--dim)' }}>{t('status.checkBack')}</p>
          </div>
        ) : (
          <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
            {anns.map((ann, i) => {
              const cfg = TYPE_CFG[ann.type] ?? TYPE_CFG.update;
              return (
                <div key={ann.id} className="g g-hover fu" style={{ padding:'14px 16px', animationDelay:`${i*40}ms` }}>
                  <div style={{ display:'flex', alignItems:'flex-start', gap:12 }}>
                    <cfg.Icon size={15} color={cfg.c} style={{ flexShrink:0, marginTop:2 }} />
                    <div style={{ flex:1, minWidth:0 }}>
                      <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:4, flexWrap:'wrap' }}>
                        <span style={{ fontSize:13, fontWeight:700, color:'#fff' }}>{ann.title}</span>
                        <span className={`badge ${cfg.badge}`}>{typeLabel(ann.type)}</span>
                        <span style={{ fontSize:10, color:'var(--dim)', marginLeft:'auto' }}>{new Date(ann.created_at).toLocaleDateString()}</span>
                      </div>
                      <p style={{ fontSize:12, color:'var(--muted)', lineHeight:1.55, margin:0 }}>{ann.content}</p>
                    </div>
                    {isMod && (
                      <button onClick={() => handleDelete(ann.id)}
                        style={{ padding:'5px 6px', borderRadius:7, background:'transparent', border:'none', cursor:'pointer', color:'rgba(255,255,255,.25)', flexShrink:0, display:'flex', transition:'all .15s' }}
                        onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,.1)'; e.currentTarget.style.color='#f87171'; }}
                        onMouseLeave={e => { e.currentTarget.style.background='transparent'; e.currentTarget.style.color='rgba(255,255,255,.25)'; }}>
                        <Trash2 size={13} />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
