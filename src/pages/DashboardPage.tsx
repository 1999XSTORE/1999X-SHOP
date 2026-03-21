import { useAppStore } from '@/lib/store';
import { Wallet, Key, Gift, Clock, Zap, TrendingUp, ArrowRight } from 'lucide-react';
import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

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
    </div>
  );
}
