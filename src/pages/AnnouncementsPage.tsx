import { useAppStore } from '@/lib/store';
import { Megaphone, Sparkles, Wrench, Zap, Bell } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const typeConfig = {
  update:      { icon: Sparkles, color: 'text-emerald-400', tag: 'tag-emerald', label: 'Update' },
  maintenance: { icon: Wrench,   color: 'text-purple-400',  tag: 'tag-purple',  label: 'Maintenance' },
  feature:     { icon: Zap,      color: 'text-blue-400',    tag: 'tag-blue',    label: 'Feature' },
};

export default function AnnouncementsPage() {
  const { t } = useTranslation();
  const { announcements } = useAppStore();

  return (
    <div className="space-y-4">
      <div className="card rounded-2xl p-5 anim-fade-up">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center card-purple">
            <Bell className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="font-bold text-white font-display">{t('announcements.title')}</h2>
            <p className="text-xs text-white/30 mt-0.5">{announcements.length} message{announcements.length !== 1 ? 's' : ''}</p>
          </div>
        </div>
      </div>

      {announcements.length === 0 ? (
        <div className="card rounded-2xl p-14 text-center anim-fade-up" style={{ borderStyle: 'dashed' }}>
          <Megaphone className="w-10 h-10 text-white/10 mx-auto mb-3" />
          <p className="font-semibold text-white/25 font-display">{t('announcements.noAnnouncements')}</p>
          <p className="text-sm text-white/15 mt-1">{t('announcements.checkBack')}</p>
        </div>
      ) : (
        <div className="space-y-3 stagger-children">
          {announcements.map((ann, i) => {
            const cfg = typeConfig[ann.type] ?? typeConfig.update;
            return (
              <div key={ann.id} className="card card-lift rounded-2xl p-5 anim-fade-up" style={{ animationDelay: `${i * 60}ms` }}>
                <div className="flex items-start gap-4">
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 card-purple">
                    <cfg.icon className={cn('w-4 h-4', cfg.color)} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <h4 className="font-semibold text-white font-display text-sm">{ann.title}</h4>
                      <span className={cn('tag flex-shrink-0', cfg.tag)}>{cfg.label}</span>
                    </div>
                    <p className="text-sm text-white/40 leading-relaxed">{ann.content}</p>
                    <p className="text-[11px] text-white/20 mt-3">
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
