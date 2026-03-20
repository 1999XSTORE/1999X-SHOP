import { useAppStore } from '@/lib/store';
import { Megaphone, Sparkles, Wrench, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeConfig = {
  update:      { icon: Sparkles,      color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  maintenance: { icon: Wrench,        color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
  feature:     { icon: AlertTriangle, color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
};

export default function AnnouncementsPage() {
  const { announcements } = useAppStore();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      <div className="flex items-center gap-2 mb-5">
        <Megaphone className="w-5 h-5 text-purple-400" />
        <h2 className="text-base font-bold text-white">Announcements</h2>
      </div>

      {announcements.length === 0 ? (
        <div className="rounded-2xl p-12 text-center border border-white/5 bg-white/2">
          <Megaphone className="w-8 h-8 text-white/10 mx-auto mb-3" />
          <p className="text-xs text-white/30">No announcements yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {announcements.map((ann, i) => {
            const cfg = typeConfig[ann.type];
            return (
              <div
                key={ann.id}
                className="rounded-2xl p-5 border border-white/10 bg-white/3 animate-fade-up"
                style={{ animationDelay: `${i * 80}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0', cfg.bg)}>
                    <cfg.icon className={cn('w-4 h-4', cfg.color)} />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1.5">
                      <h4 className="text-sm font-bold text-white">{ann.title}</h4>
                      <span className="text-[10px] text-white/30">{new Date(ann.createdAt).toLocaleDateString()}</span>
                    </div>
                    <p className="text-xs text-white/50 leading-relaxed">{ann.content}</p>
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
