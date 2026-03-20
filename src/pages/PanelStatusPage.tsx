import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Activity, CheckCircle, AlertTriangle, Clock, Megaphone, Sparkles, Wrench, RefreshCw, Users } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchAllStats } from '@/lib/keyauth';

const typeConfig = {
  update:      { icon: Sparkles,      color: 'text-emerald', bg: 'bg-emerald/10' },
  maintenance: { icon: Wrench,        color: 'text-primary',  bg: 'bg-primary/10' },
  feature:     { icon: AlertTriangle, color: 'text-indigo',   bg: 'bg-indigo/10'  },
};

interface KAState {
  lag:      { online: number|null; total: number|null; version: string; status: string };
  internal: { online: number|null; total: number|null; version: string; status: string };
  totalOnline: number|null;
  totalUsers:  number|null;
}

export default function PanelStatusPage() {
  const { t } = useTranslation();
  const { systemStatus, lastStatusUpdate, announcements } = useAppStore();
  const isOnline = systemStatus === 'online';
  const [ka, setKa] = useState<KAState | null>(null);
  const [kaLoading, setKaLoading] = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadStats = async () => {
    setKaLoading(true);
    const stats = await fetchAllStats();
    setKa(stats);
    setKaLoading(false);
    setLastRefresh(new Date());
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const fmt = (n: number | null) => n !== null ? n.toLocaleString() : '—';

  const services = [
    { name: 'Authentication Server', status: 'online' },
    { name: 'License Server',        status: 'online' },
    { name: 'Payment Gateway',       status: 'online' },
    { name: 'Chat Server',           status: 'online' },
    { name: 'Lag Bypass (KeyAuth)',   status: ka?.lag.status      ?? 'loading' },
    { name: 'Internal (KeyAuth)',     status: ka?.internal.status ?? 'loading' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* System Status */}
      <div className="glass-surface rounded-xl p-6 text-center animate-fade-up">
        <div className={cn('w-14 h-14 rounded-2xl flex items-center justify-center mx-auto mb-3',
          isOnline ? 'bg-emerald/15' : 'bg-primary/15')}>
          {isOnline
            ? <CheckCircle className="w-7 h-7 text-emerald" />
            : <AlertTriangle className="w-7 h-7 text-primary" />}
        </div>
        <h2 className="text-lg font-bold text-foreground mb-1">
          {isOnline ? t('status.online') : t('status.maintenance')}
        </h2>
        <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1">
          <Clock className="w-3 h-3" /> {t('status.lastUpdate')}: {new Date(lastStatusUpdate).toLocaleString()}
        </p>
      </div>

      {/* KeyAuth Live Stats */}
      <div className="glass-surface rounded-xl p-5 animate-fade-up" style={{ animationDelay: '60ms' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-primary" />
            <h3 className="text-sm font-bold text-foreground">Live KeyAuth Stats</h3>
          </div>
          <button onClick={loadStats} disabled={kaLoading}
            className="flex items-center gap-1.5 text-[10px] text-muted-foreground hover:text-foreground transition-colors disabled:opacity-50">
            <RefreshCw className={cn('w-3 h-3', kaLoading && 'animate-spin')} />
            {lastRefresh.toLocaleTimeString()}
          </button>
        </div>

        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: 'Lag Online',      value: fmt(ka?.lag.online ?? null),      color: 'text-emerald' },
            { label: 'Internal Online', value: fmt(ka?.internal.online ?? null), color: 'text-primary' },
            { label: 'Total Online',    value: fmt(ka?.totalOnline ?? null),      color: 'text-foreground' },
          ].map(stat => (
            <div key={stat.label} className="bg-secondary rounded-xl p-3 text-center">
              <p className={cn('text-lg font-bold', stat.color)}>
                {kaLoading ? '...' : stat.value}
              </p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Lag',      data: ka?.lag      },
            { label: 'Internal', data: ka?.internal },
          ].map(({ label, data }) => (
            <div key={label} className="bg-secondary rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-semibold text-foreground">{label}</p>
                <span className={cn('text-[10px] font-bold flex items-center gap-1',
                  data?.status === 'online' ? 'text-emerald' : 'text-destructive')}>
                  <span className={cn('w-1.5 h-1.5 rounded-full',
                    data?.status === 'online' ? 'bg-emerald animate-pulse' : 'bg-destructive')} />
                  {kaLoading ? 'loading...' : data?.status ?? '—'}
                </span>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Total users: {kaLoading ? '...' : fmt(data?.total ?? null)}
              </p>
              <p className="text-[10px] text-muted-foreground">
                Version: {kaLoading ? '...' : (data?.version ?? '—')}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Services */}
      <div className="glass-surface rounded-xl p-5 animate-fade-up" style={{ animationDelay: '120ms' }}>
        <h3 className="text-sm font-bold text-foreground mb-3">Services</h3>
        <div className="space-y-2">
          {services.map(svc => (
            <div key={svc.name} className="flex items-center justify-between py-2.5 border-b border-border last:border-0">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-muted-foreground" />
                <span className="text-xs font-medium text-foreground">{svc.name}</span>
              </div>
              <span className={cn('flex items-center gap-1 text-[10px] font-semibold',
                svc.status === 'online'  ? 'text-emerald' :
                svc.status === 'loading' ? 'text-muted-foreground' : 'text-destructive')}>
                <span className={cn('w-1.5 h-1.5 rounded-full',
                  svc.status === 'online'  ? 'bg-emerald animate-pulse' :
                  svc.status === 'loading' ? 'bg-muted-foreground animate-pulse' : 'bg-destructive')} />
                {svc.status === 'online' ? 'Operational' : svc.status === 'loading' ? 'Loading...' : 'Offline'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Announcements */}
      <div className="animate-fade-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center gap-2 mb-3">
          <Megaphone className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-bold text-foreground">{t('announcements.title')}</h3>
        </div>
        {announcements.length === 0 ? (
          <div className="glass-surface rounded-xl p-8 text-center">
            <p className="text-xs text-muted-foreground">{t('announcements.noAnnouncements')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann, i) => {
              const cfg = typeConfig[ann.type];
              return (
                <div key={ann.id} className="glass-surface rounded-xl p-4 animate-fade-up" style={{ animationDelay: `${(i + 3) * 80}ms` }}>
                  <div className="flex items-start gap-3">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
                      <cfg.icon className={cn('w-3.5 h-3.5', cfg.color)} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-foreground">{ann.title}</h4>
                        <span className="text-[10px] text-muted-foreground">{new Date(ann.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[11px] text-secondary-foreground leading-relaxed">{ann.content}</p>
                    </div>
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
