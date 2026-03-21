import { useAppStore } from '@/lib/store';
import { Megaphone, Sparkles, Wrench, Zap, Bell } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeConfig = {
  update:      { icon: Sparkles, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', dot: 'bg-emerald-400', label: 'Update' },
  maintenance: { icon: Wrench,   color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  dot: 'bg-violet-400',  label: 'Maintenance' },
  feature:     { icon: Zap,      color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    dot: 'bg-blue-400',    label: 'Feature' },
};

export default function AnnouncementsPage() {
  const { announcements } = useAppStore();

  return (
    <div className="space-y-4 w-full">

      {/* Header */}
      <div className="glass rounded-2xl p-5 border border-white/8 animate-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 border border-violet-500/20 flex items-center justify-center">
            <Bell className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h2 className="text-base font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Announcements</h2>
            <p className="text-[11px] text-white/30">{announcements.length} message{announcements.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {announcements.length === 0 ? (
        <div className="glass rounded-2xl p-14 text-center border border-dashed border-white/8 animate-fade-up">
          <Megaphone className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="text-sm text-white/30 font-semibold" style={{ fontFamily: 'Syne, sans-serif' }}>No announcements yet</p>
          <p className="text-xs text-white/15 mt-1">Check back later for updates</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann, i) => {
            const cfg = typeConfig[ann.type] ?? typeConfig.update;
            return (
              <div key={ann.id} className="glass rounded-2xl p-5 border border-white/8 card-hover animate-fade-up"
                style={{ animationDelay: `${i * 70}ms` }}>
                <div className="flex items-start gap-4">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 border', cfg.bg, cfg.border)}>
                    <cfg.icon className={cn('w-4 h-4', cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="text-sm font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>{ann.title}</h4>
                      <div className="flex items-center gap-2 flex-shrink-0">
                        <span className={cn('text-[10px] font-bold px-2 py-0.5 rounded-full border', cfg.bg, cfg.color, cfg.border)}>
                          {cfg.label}
                        </span>
                      </div>
                    </div>
                    <p className="text-[12px] text-white/45 leading-relaxed">{ann.content}</p>
                    <p className="text-[10px] text-white/20 mt-3">
                      {new Date(ann.createdAt).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}
                    </p>
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
