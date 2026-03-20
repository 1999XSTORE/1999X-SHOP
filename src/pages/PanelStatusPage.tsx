import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '@/lib/store';
import { Activity, CheckCircle, AlertTriangle, Clock, Megaphone, Sparkles, Wrench, RefreshCw, Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchAllStats } from '@/lib/keyauth';

const typeConfig = {
  update:      { icon: Sparkles,      color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  maintenance: { icon: Wrench,        color: 'text-purple-400',  bg: 'bg-purple-500/10' },
  feature:     { icon: AlertTriangle, color: 'text-blue-400',    bg: 'bg-blue-500/10'   },
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

  // Only show real services, remove dummy ones
  const services = [
    { name: 'Authentication Server', status: 'online' },
    { name: 'License Server',        status: 'online' },
    { name: 'Payment Gateway',       status: 'online' },
    { name: 'Chat Server',           status: 'online' },
  ];

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* System Status */}
      <div className="rounded-2xl p-6 text-center border border-white/10 bg-white/3 animate-fade-up">
        <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4',
          isOnline ? 'bg-emerald-500/15' : 'bg-orange-500/15')}>
          {isOnline
            ? <CheckCircle className="w-8 h-8 text-emerald-400" />
            : <AlertTriangle className="w-8 h-8 text-orange-400" />}
        </div>
        <h2 className="text-lg font-bold text-white mb-1">
          {isOnline ? 'All Systems Operational' : t('status.maintenance')}
        </h2>

        {/* OB52 Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mt-3 mb-2">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-emerald-400">OB52 Undetected</span>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        <p className="text-[10px] text-white/30 flex items-center justify-center gap-1 mt-3">
          <Clock className="w-3 h-3" /> {t('status.lastUpdate')}: {new Date(lastStatusUpdate).toLocaleString()}
        </p>
      </div>

      {/* KeyAuth Live Stats */}
      <div className="rounded-2xl p-5 border border-white/10 bg-white/3 animate-fade-up" style={{ animationDelay: '60ms' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Live Stats</h3>
          </div>
          <button onClick={loadStats} disabled={kaLoading}
            className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors disabled:opacity-50">
            <RefreshCw className={cn('w-3 h-3', kaLoading && 'animate-spin')} />
            {lastRefresh.toLocaleTimeString()}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Total Users',   value: fmt(ka?.totalUsers  ?? null), color: 'text-purple-400', bg: 'bg-purple-500/10' },
            { label: 'Online Users',  value: fmt(ka?.totalOnline ?? null), color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          ].map(stat => (
            <div key={stat.label} className={cn('rounded-xl p-4 text-center border border-white/5', stat.bg)}>
              <p className={cn('text-2xl font-bold', stat.color)}>
                {kaLoading ? <span className="animate-pulse">···</span> : stat.value}
              </p>
              <p className="text-[10px] text-white/40 mt-1">{stat.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Services */}
      <div className="rounded-2xl p-5 border border-white/10 bg-white/3 animate-fade-up" style={{ animationDelay: '120ms' }}>
        <h3 className="text-sm font-bold text-white mb-3">Services</h3>
        <div className="space-y-2">
          {services.map(svc => (
            <div key={svc.name} className="flex items-center justify-between py-3 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-white/30" />
                <span className="text-xs font-medium text-white/70">{svc.name}</span>
              </div>
              <span className="flex items-center gap-1.5 text-[10px] font-semibold text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Operational
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Announcements */}
      <div className="animate-fade-up" style={{ animationDelay: '200ms' }}>
        <div className="flex items-center gap-2 mb-3">
          <Megaphone className="w-4 h-4 text-purple-400" />
          <h3 className="text-sm font-bold text-white">{t('announcements.title')}</h3>
        </div>
        {announcements.length === 0 ? (
          <div className="rounded-2xl p-8 text-center border border-white/5 bg-white/2">
            <p className="text-xs text-white/30">{t('announcements.noAnnouncements')}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {announcements.map((ann, i) => {
              const cfg = typeConfig[ann.type];
              return (
                <div key={ann.id} className="rounded-xl p-4 border border-white/10 bg-white/3 animate-fade-up" style={{ animationDelay: `${(i + 3) * 80}ms` }}>
                  <div className="flex items-start gap-3">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0', cfg.bg)}>
                      <cfg.icon className={cn('w-3.5 h-3.5', cfg.color)} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-white">{ann.title}</h4>
                        <span className="text-[10px] text-white/30">{new Date(ann.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[11px] text-white/50 leading-relaxed">{ann.content}</p>
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
