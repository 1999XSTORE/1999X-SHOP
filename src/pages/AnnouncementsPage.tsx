import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Megaphone, Wrench, Sparkles, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeConfig = {
  update: { icon: Sparkles, color: 'text-emerald', bg: 'bg-emerald/10' },
  maintenance: { icon: Wrench, color: 'text-primary', bg: 'bg-primary/10' },
  feature: { icon: AlertTriangle, color: 'text-indigo', bg: 'bg-indigo/10' },
};

export default function AnnouncementsPage() {
  const { t } = useTranslation();
  const { announcements } = useAppStore();

  return (
    <div className="max-w-2xl mx-auto space-y-4">
      {announcements.length === 0 ? (
        <div className="glass-surface rounded-xl p-12 text-center animate-fade-up">
          <Megaphone className="w-10 h-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">{t('announcements.noAnnouncements')}</p>
        </div>
      ) : (
        announcements.map((ann, i) => {
          const cfg = typeConfig[ann.type];
          return (
            <div key={ann.id} className="glass-surface rounded-xl p-5 animate-fade-up" style={{ animationDelay: `${i * 80}ms` }}>
              <div className="flex items-start gap-3">
                <div className={cn('w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
                  <cfg.icon className={cn('w-4 h-4', cfg.color)} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-sm font-bold text-foreground">{ann.title}</h3>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(ann.createdAt).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-xs text-secondary-foreground leading-relaxed">{ann.content}</p>
                </div>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
