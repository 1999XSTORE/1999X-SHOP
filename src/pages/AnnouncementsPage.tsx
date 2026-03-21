import { useAppStore } from '@/lib/store';
import { Megaphone, Sparkles, Wrench, Zap, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const TYPE = {
  update:      { icon: Sparkles, c: 'var(--green)',  bg: 'rgba(16,232,152,.07)',  bc: 'rgba(16,232,152,.16)',  badge: 'badge-green',  label: 'Update' },
  maintenance: { icon: Wrench,   c: 'var(--purple)', bg: 'rgba(109,40,217,.07)', bc: 'rgba(139,92,246,.16)', badge: 'badge-purple', label: 'Maintenance' },
  feature:     { icon: Zap,      c: 'var(--blue)',   bg: 'rgba(56,189,248,.06)',  bc: 'rgba(56,189,248,.14)',  badge: 'badge-blue',   label: 'Feature' },
};

export default function AnnouncementsPage() {
  const { t } = useTranslation();
  const { announcements } = useAppStore();

  return (
    <div style={{display:'flex',flexDirection:'column',gap:14}}>
      <div className="g fu" style={{padding:'18px 20px'}}>
        <div style={{display:'flex',alignItems:'center',gap:12}}>
          <div style={{width:40,height:40,borderRadius:11,background:'rgba(109,40,217,.08)',border:'1px solid rgba(139,92,246,.16)',display:'flex',alignItems:'center',justifyContent:'center'}}>
            <Bell size={18} color="var(--purple)"/>
          </div>
          <div>
            <div style={{fontSize:16,fontWeight:700,color:'#fff'}}>Announcements</div>
            <div style={{fontSize:12,color:'var(--muted)',marginTop:2}}>{announcements.length} message{announcements.length!==1?'s':''}</div>
          </div>
        </div>
      </div>

      {announcements.length === 0
        ? <div className="g fu" style={{padding:'60px 20px',textAlign:'center',borderStyle:'dashed',animationDelay:'60ms'}}>
            <Megaphone size={36} style={{color:'rgba(255,255,255,.08)',margin:'0 auto 12px'}}/>
            <p style={{fontSize:15,fontWeight:600,color:'var(--muted)',marginBottom:5}}>No announcements yet</p>
            <p style={{fontSize:13,color:'var(--dim)'}}>Check back later for updates</p>
          </div>
        : <div style={{display:'flex',flexDirection:'column',gap:10}} className="stg">
            {announcements.map((ann, i) => {
              const cfg = TYPE[ann.type] ?? TYPE.update;
              return (
                <div key={ann.id} className="g g-hover fu" style={{padding:'18px 20px',animationDelay:`${i*60}ms`}}>
                  <div style={{display:'flex',alignItems:'flex-start',gap:14}}>
                    <div style={{width:36,height:36,borderRadius:10,background:cfg.bg,border:`1px solid ${cfg.bc}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0}}>
                      <cfg.icon size={16} color={cfg.c}/>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:10,marginBottom:6}}>
                        <div style={{fontSize:14,fontWeight:700,color:'#fff'}}>{ann.title}</div>
                        <span className={`badge ${cfg.badge}`} style={{flexShrink:0}}>{cfg.label}</span>
                      </div>
                      <p style={{fontSize:13,color:'var(--muted)',lineHeight:1.55,margin:0}}>{ann.content}</p>
                      <p style={{fontSize:11,color:'var(--dim)',marginTop:10}}>
                        {new Date(ann.createdAt).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric'})}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
      }
    </div>
  );
}
