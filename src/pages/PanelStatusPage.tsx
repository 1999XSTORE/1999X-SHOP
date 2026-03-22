import { useEffect, useState } from 'react';
import { safeFetch } from '@/lib/safeFetch';
import { useAppStore } from '@/lib/store';
import { CheckCircle, Sparkles, Wrench, RefreshCw, Users, Zap, Globe, Plus, Send, X, Megaphone } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { toast } from 'sonner';

const TYPE = {
  update:      { icon: Sparkles, c: 'var(--green)',  bg: 'rgba(16,232,152,.07)',  bc: 'rgba(16,232,152,.16)',  badge: 'badge-green',  label: 'Update' },
  maintenance: { icon: Wrench,   c: 'var(--purple)', bg: 'rgba(109,40,217,.07)', bc: 'rgba(139,92,246,.16)', badge: 'badge-purple', label: 'Maintenance' },
  feature:     { icon: Zap,      c: 'var(--blue)',   bg: 'rgba(56,189,248,.06)',  bc: 'rgba(56,189,248,.14)',  badge: 'badge-blue',   label: 'Feature' },
};

const OFFLINE = { status:'offline', numUsers:'0', numKeys:'0', onlineUsers:'0', version:'—' };
const safeNum = (v: any) => { const n=parseInt(String(v??'0')); return isNaN(n)?0:n; };
const norm = (r: any): typeof OFFLINE => {
  if (!r||r.status==='offline') return OFFLINE;
  return { status:r.status??'online', numUsers:String(safeNum(r.numUsers??r.registered??0)), numKeys:String(safeNum(r.numKeys??r.keys??0)), onlineUsers:String(safeNum(r.onlineUsers??r.numOnlineUsers??0)), version:String(r.version??'—') };
};

const ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok';

function generateId() { return Math.random().toString(36).substring(2, 10); }

export default function PanelStatusPage() {
  const { t } = useTranslation();
  const { systemStatus, announcements, user } = useAppStore();
  const isAdmin = user?.role === 'admin' || user?.role === 'support';
  const isOnline = systemStatus === 'online';
  const [lag, setLag]     = useState(OFFLINE);
  const [int, setInt]     = useState(OFFLINE);
  const [loading, setL]   = useState(false);
  const [last, setLast]   = useState(new Date());

  // Admin announcement form
  const [showForm, setShowForm]   = useState(false);
  const [annTitle, setAnnTitle]   = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annType, setAnnType]     = useState<'update'|'maintenance'|'feature'>('update');
  const [posting, setPosting]     = useState(false);

  const load = async () => {
    setL(true);
    try {
      const res = await safeFetch('https://wkjqrjafogufqeasfeev.supabase.co/functions/v1/keyauth-stats',
        { method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${ANON}`,'apikey':ANON}, body:JSON.stringify({}) }, 10000);
      if (res?.ok) { const d=await res.json(); if(d?.lag)setLag(norm(d.lag)); if(d?.internal)setInt(norm(d.internal)); }
    } catch {}
    setL(false); setLast(new Date());
  };

  useEffect(() => { load(); const i=setInterval(load,60000); return ()=>clearInterval(i); }, []);

  const totalOnline = safeNum(lag.onlineUsers) + safeNum(int.onlineUsers);
  const totalUsers  = safeNum(lag.numUsers)    + safeNum(int.numUsers);

  // Push announcement via Zustand store (persisted across sessions)
  const handlePost = () => {
    if (!annTitle.trim()) { toast.error('Enter a title'); return; }
    if (!annContent.trim()) { toast.error('Enter content'); return; }
    setPosting(true);
    // Add to store directly — announcements are stored in Zustand persist
    const { announcements: curr, ...rest } = useAppStore.getState();
    const newAnn = {
      id: generateId(),
      title: annTitle.trim(),
      content: annContent.trim(),
      createdAt: new Date().toISOString(),
      type: annType,
    };
    useAppStore.setState({ announcements: [newAnn, ...curr] });
    toast.success('📢 Announcement posted!');
    setAnnTitle(''); setAnnContent(''); setShowForm(false);
    setPosting(false);
  };

  const handleDelete = (id: string) => {
    const { announcements: curr } = useAppStore.getState();
    useAppStore.setState({ announcements: curr.filter(a => a.id !== id) });
    toast.success('Announcement deleted');
  };

  return (
    <div style={{display:'flex',flexDirection:'column',gap:16}}>

      {/* Status hero */}
      <div className="g g-hover fu" style={{padding:'20px 22px',background:isOnline?'rgba(16,232,152,.06)':'rgba(251,191,36,.06)',borderColor:isOnline?'rgba(16,232,152,.16)':'rgba(251,191,36,.16)'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between'}}>
          <div style={{display:'flex',alignItems:'center',gap:14}}>
            <div style={{width:46,height:46,borderRadius:12,background:isOnline?'rgba(16,232,152,.1)':'rgba(251,191,36,.1)',border:`1px solid ${isOnline?'rgba(16,232,152,.2)':'rgba(251,191,36,.2)'}`,display:'flex',alignItems:'center',justifyContent:'center'}}>
              <CheckCircle size={22} color={isOnline?'var(--green)':'var(--amber)'}/>
            </div>
            <div>
              <div className="label" style={{marginBottom:4}}>System Status</div>
              <div style={{fontSize:18,fontWeight:800,color:'#fff',letterSpacing:'-.01em'}}>{isOnline?'All Systems Operational':'Under Maintenance'}</div>
            </div>
          </div>
          <div style={{display:'flex',alignItems:'center',gap:7,padding:'6px 12px',borderRadius:20,background:'rgba(16,232,152,.08)',border:'1px solid rgba(16,232,152,.18)'}}>
            <div className="dot dot-green"/>
            <span style={{fontSize:11,fontWeight:700,color:'var(--green)'}}>OB52 Undetected</span>
          </div>
        </div>
      </div>

      {/* Live stats */}
      <div className="g fu" style={{padding:'20px 22px',animationDelay:'55ms'}}>
        <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18}}>
          <div style={{display:'flex',alignItems:'center',gap:8}}>
            <Users size={16} color="var(--purple)"/>
            <span style={{fontSize:15,fontWeight:700,color:'#fff'}}>Live Stats</span>
          </div>
          <button onClick={load} disabled={loading} style={{display:'flex',alignItems:'center',gap:5,fontSize:11,color:'var(--dim)',background:'none',border:'none',cursor:'pointer',padding:4,borderRadius:6,transition:'color .15s'}}
            onMouseEnter={e=>(e.currentTarget.style.color='var(--muted)')} onMouseLeave={e=>(e.currentTarget.style.color='var(--dim)')}>
            <RefreshCw size={13} className={loading?'animate-spin':''}/>{last.toLocaleTimeString()}
          </button>
        </div>

        <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12,marginBottom:18}}>
          {[{label:'Total Users',val:totalUsers,c:'var(--purple)',bg:'rgba(109,40,217,.07)',bc:'rgba(139,92,246,.16)'},{label:'Online Now',val:totalOnline,c:'var(--green)',bg:'rgba(16,232,152,.06)',bc:'rgba(16,232,152,.14)'}].map(s=>(
            <div key={s.label} className="g" style={{padding:'18px',textAlign:'center',background:s.bg,borderColor:s.bc}}>
              <div className="mono" style={{fontSize:44,fontWeight:900,color:s.c,letterSpacing:'-.04em',marginBottom:6}}>
                {loading?<span style={{animation:'blink 1s infinite',opacity:.4}}>···</span>:s.val.toLocaleString()}
              </div>
              <div className="label">{s.label}</div>
            </div>
          ))}
        </div>

        <div className="label" style={{marginBottom:10}}>Services</div>
        {['Authentication','License Server','Payment Gateway','Chat Server'].map(svc=>(
          <div key={svc} style={{display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 0',borderBottom:'1px solid var(--border)'}}>
            <div style={{display:'flex',alignItems:'center',gap:9}}>
              <Globe size={13} style={{color:'rgba(255,255,255,.2)'}}/> 
              <span style={{fontSize:13,color:'var(--muted)'}}>{svc}</span>
            </div>
            <span style={{display:'flex',alignItems:'center',gap:5,fontSize:12,fontWeight:600,color:'var(--green)'}}>
              <div className="dot dot-green" style={{width:5,height:5}}/>Online
            </span>
          </div>
        ))}
      </div>

      {/* ── Admin Announcement Panel ── */}
      {isAdmin && (
        <div className="g fu" style={{padding:'20px 22px',animationDelay:'80ms',borderColor:'rgba(139,92,246,.18)',background:'rgba(109,40,217,.04)'}}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom: showForm ? 18 : 0}}>
            <div style={{display:'flex',alignItems:'center',gap:10}}>
              <div style={{width:36,height:36,borderRadius:10,background:'rgba(139,92,246,.1)',border:'1px solid rgba(139,92,246,.2)',display:'flex',alignItems:'center',justifyContent:'center'}}>
                <Megaphone size={16} color="var(--purple)"/>
              </div>
              <div>
                <div style={{fontSize:14,fontWeight:700,color:'#fff'}}>Announcements</div>
                <div style={{fontSize:11,color:'var(--muted)'}}>Push to all users · {announcements.length} posted</div>
              </div>
            </div>
            <button onClick={()=>setShowForm(!showForm)}
              style={{display:'flex',alignItems:'center',gap:7,padding:'8px 16px',borderRadius:12,border:'1px solid rgba(139,92,246,.3)',background:showForm?'rgba(139,92,246,.18)':'rgba(139,92,246,.1)',color:'#c4b5fd',fontSize:13,fontWeight:700,cursor:'pointer',fontFamily:'inherit',transition:'all .2s'}}>
              {showForm ? <><X size={13}/>Cancel</> : <><Plus size={13}/>New Announcement</>}
            </button>
          </div>

          {showForm && (
            <div style={{display:'flex',flexDirection:'column',gap:14,padding:'18px 0 0'}}>
              {/* Type selector */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.35)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:8}}>Type</div>
                <div style={{display:'flex',gap:8}}>
                  {(['update','feature','maintenance'] as const).map(tp => {
                    const cfg = TYPE[tp];
                    const Icon = cfg.icon;
                    return (
                      <button key={tp} onClick={()=>setAnnType(tp)}
                        style={{display:'flex',alignItems:'center',gap:6,padding:'7px 14px',borderRadius:10,fontSize:12,fontWeight:700,cursor:'pointer',border:`1px solid ${annType===tp?cfg.bc:'rgba(255,255,255,.07)'}`,background:annType===tp?cfg.bg:'rgba(255,255,255,.03)',color:annType===tp?cfg.c:'var(--muted)',fontFamily:'inherit',transition:'all .15s'}}>
                        <Icon size={12}/>{cfg.label}
                      </button>
                    );
                  })}
                </div>
              </div>
              {/* Title */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.35)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:8}}>Title</div>
                <input value={annTitle} onChange={e=>setAnnTitle(e.target.value)} placeholder="e.g. OB52 Update Released"
                  style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.09)',borderRadius:10,padding:'11px 14px',color:'#fff',fontFamily:'inherit',fontSize:14,outline:'none',transition:'all .2s'}}
                  onFocus={e=>{e.target.style.borderColor='rgba(139,92,246,.4)';}} onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,.09)';}}
                />
              </div>
              {/* Content */}
              <div>
                <div style={{fontSize:11,fontWeight:700,color:'rgba(255,255,255,.35)',letterSpacing:'.08em',textTransform:'uppercase',marginBottom:8}}>Content</div>
                <textarea value={annContent} onChange={e=>setAnnContent(e.target.value)} placeholder="Announcement details..." rows={3}
                  style={{width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.09)',borderRadius:10,padding:'11px 14px',color:'#fff',fontFamily:'inherit',fontSize:13,outline:'none',resize:'vertical',transition:'all .2s',lineHeight:1.55}}
                  onFocus={e=>{e.target.style.borderColor='rgba(139,92,246,.4)';}} onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,.09)';}}
                />
              </div>
              <button onClick={handlePost} disabled={posting}
                style={{display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px 20px',borderRadius:12,background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',border:'none',color:'#fff',fontSize:14,fontWeight:800,cursor:'pointer',fontFamily:'inherit',boxShadow:'0 0 24px rgba(109,40,217,.4)',transition:'all .2s',alignSelf:'flex-start'}}>
                <Send size={14}/> Push Announcement
              </button>
            </div>
          )}
        </div>
      )}

      {/* Announcements list */}
      {announcements.length > 0 && (
        <div className="fu" style={{animationDelay:'110ms'}}>
          <div className="label" style={{color:'var(--purple)',marginBottom:10}}>Announcements</div>
          <div style={{display:'flex',flexDirection:'column',gap:8}}>
            {announcements.map((ann,i)=>{
              const cfg=TYPE[ann.type as keyof typeof TYPE]??TYPE.update;
              return (
                <div key={ann.id} className="g g-hover fu" style={{padding:'14px 16px',animationDelay:`${i*50}ms`}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:12}}>
                    <cfg.icon size={15} color={cfg.c} style={{flexShrink:0,marginTop:2}}/>
                    <div style={{flex:1}}>
                      <div style={{display:'flex',alignItems:'center',gap:8,marginBottom:4}}>
                        <span style={{fontSize:13,fontWeight:700,color:'#fff'}}>{ann.title}</span>
                        <span className={`badge ${cfg.badge}`}>{cfg.label}</span>
                      </div>
                      <p style={{fontSize:12,color:'var(--muted)',lineHeight:1.5,margin:0}}>{ann.content}</p>
                      <p style={{fontSize:10,color:'var(--dim)',marginTop:6}}>{new Date(ann.createdAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</p>
                    </div>
                    {isAdmin && (
                      <button onClick={()=>handleDelete(ann.id)}
                        style={{background:'rgba(248,113,113,.08)',border:'1px solid rgba(248,113,113,.15)',borderRadius:8,padding:'5px 8px',cursor:'pointer',color:'#f87171',flexShrink:0,transition:'all .15s'}}
                        onMouseEnter={e=>(e.currentTarget.style.background='rgba(248,113,113,.16)')}
                        onMouseLeave={e=>(e.currentTarget.style.background='rgba(248,113,113,.08)')}>
                        <X size={12}/>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {announcements.length === 0 && !isAdmin && (
        <div className="g fu" style={{padding:'40px 20px',textAlign:'center',borderStyle:'dashed',animationDelay:'110ms'}}>
          <Megaphone size={32} style={{color:'rgba(255,255,255,.08)',margin:'0 auto 12px'}}/>
          <p style={{fontSize:14,fontWeight:600,color:'var(--muted)',marginBottom:4}}>No announcements yet</p>
          <p style={{fontSize:12,color:'var(--dim)'}}>Check back later for updates</p>
        </div>
      )}
    </div>
  );
}
