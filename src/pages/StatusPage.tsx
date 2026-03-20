import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Activity, CheckCircle, AlertTriangle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function StatusPage() {
  const { t } = useTranslation();
  const { systemStatus, lastStatusUpdate } = useAppStore();
  const isOnline = systemStatus === 'online';

  const services = [
    { name: 'Authentication Server', status: 'online' },
    { name: 'License Server', status: 'online' },
    { name: 'Payment Gateway', status: 'online' },
    { name: 'Chat Server', status: 'online' },
    { name: 'Update Server', status: isOnline ? 'online' : 'maintenance' },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-4 animate-fade-up">
      <div className="glass-surface rounded-xl p-6 text-center">
        <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4',
          isOnline ? 'bg-emerald/15' : 'bg-primary/15'
        )}>
          {isOnline ? <CheckCircle className="w-8 h-8 text-emerald" /> : <AlertTriangle className="w-8 h-8 text-primary" />}
        </div>
        <h2 className="text-xl font-bold text-foreground mb-1">
          {isOnline ? t('status.online') : t('status.maintenance')}
        </h2>
        <p className="text-xs text-muted-foreground flex items-center justify-center gap-1">
          <Clock className="w-3 h-3" /> {t('status.lastUpdate')}: {new Date(lastStatusUpdate).toLocaleString()}
        </p>
      </div>

      <div className="glass-surface rounded-xl p-5">
        <h3 className="text-sm font-bold text-foreground mb-3">Services</h3>
        <div className="space-y-2">
          {services.map(svc => (
            <div key={svc.name} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">{svc.name}</span>
              </div>
              <span className={cn('flex items-center gap-1 text-[10px] font-semibold',
                svc.status === 'online' ? 'text-emerald' : 'text-primary'
              )}>
                <span className={cn('w-1.5 h-1.5 rounded-full',
                  svc.status === 'online' ? 'bg-emerald animate-pulse' : 'bg-primary animate-pulse'
                )} />
                {svc.status === 'online' ? 'Operational' : 'Maintenance'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
