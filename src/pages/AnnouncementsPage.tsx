import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Sparkles, Wrench, Zap, Bell, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const TYPE_CFG = {
  update:      { Icon: Sparkles, c:'var(--green)',  bg:'rgba(16,232,152,.07)',  bc:'rgba(16,232,152,.16)',  badge:'badge-green'  },
  maintenance: { Icon: Wrench,   c:'var(--purple)', bg:'rgba(109,40,217,.07)', bc:'rgba(139,92,246,.16)', badge:'badge-purple' },
  feature:     { Icon: Zap,      c:'var(--blue)',   bg:'rgba(56,189,248,.06)',  bc:'rgba(56,189,248,.14)',  badge:'badge-blue'   },
} as const;

interface Ann { id:string; title:string; content:string; type:'update'|'maintenance'|'feature'; created_at:string; }

export default function AnnouncementsPage() {
  const { t } = useTranslation();
  const [anns,    setAnns]    = useState<Ann[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial load
    supabase.from('announcements').select('*').order('created_at', { ascending:false }).limit(50)
      .then(({ data }) => { if (data) setAnns(data as Ann[]); setLoading(false); });

    // Real-time: instant display for all users
    const ch = supabase.channel('ann-page')
      .on('postgres_changes', { event:'INSERT', schema:'public', table:'announcements' }, ({ new:r }) => {
        setAnns(prev => [r as Ann, ...prev]);
      })
      .on('postgres_changes', { event:'DELETE', schema:'public', table:'announcements' }, ({ old:r }) => {
        setAnns(prev => prev.filter(a => a.id !== (r as any).id));
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, []);

  const typeLabel = (tp: string) =>
    tp === 'update' ? t('status.update') : tp === 'maintenance' ? t('status.maintenanceType') : t('status.feature');

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
      <div className="g fu" style={{ padding:'18px 20px' }}>
        <div style={{ display:'flex', alignItems:'center', gap:12 }}>
          <div style={{ width:40,height:40,borderRadius:11,background:'rgba(109,40,217,.08)',border:'1px solid rgba(139,92,246,.16)',display:'flex',alignItems:'center',justifyContent:'center' }}>
            <Bell size={18} color="var(--purple)" />
          </div>
          <div>
            <div style={{ fontSize:16,fontWeight:700,color:'#fff' }}>{t('announcements.title')}</div>
            <div style={{ fontSize:12,color:'var(--muted)',marginTop:2 }}>{anns.length} {t(anns.length !== 1 ? 'announcements.title' : 'announcements.title')}</div>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',padding:'48px 0',gap:8,color:'var(--muted)' }}>
          <Loader2 size={16} className="animate-spin" /><span style={{ fontSize:13 }}>{t('common.loading')}</span>
        </div>
      ) : anns.length === 0 ? (
        <div className="g fu" style={{ padding:'48px 20px',textAlign:'center',borderStyle:'dashed' }}>
          <Bell size={36} style={{ color:'rgba(255,255,255,.06)',margin:'0 auto 12px' }} />
          <p style={{ fontSize:15,fontWeight:600,color:'var(--muted)',marginBottom:6 }}>{t('announcements.noAnn')}</p>
          <p style={{ fontSize:13,color:'var(--dim)' }}>{t('announcements.checkBack')}</p>
        </div>
      ) : (
        <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
          {anns.map((ann, i) => {
            const cfg = TYPE_CFG[ann.type] ?? TYPE_CFG.update;
            return (
              <div key={ann.id} className="g g-hover fu" style={{ padding:'16px 18px', animationDelay:`${i*40}ms` }}>
                <div style={{ display:'flex',alignItems:'flex-start',gap:12 }}>
                  <cfg.Icon size={15} color={cfg.c} style={{ flexShrink:0,marginTop:2 }} />
                  <div style={{ flex:1,minWidth:0 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:5,flexWrap:'wrap' }}>
                      <span style={{ fontSize:14,fontWeight:700,color:'#fff' }}>{ann.title}</span>
                      <span className={`badge ${cfg.badge}`}>{typeLabel(ann.type)}</span>
                      <span style={{ fontSize:10,color:'var(--dim)',marginLeft:'auto' }}>
                        {new Date(ann.created_at).toLocaleDateString(undefined, { month:'short',day:'numeric',year:'numeric' })}
                      </span>
                    </div>
                    <p style={{ fontSize:13,color:'var(--muted)',lineHeight:1.6,margin:0 }}>{ann.content}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
