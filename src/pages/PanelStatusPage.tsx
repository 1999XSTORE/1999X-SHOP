import { useEffect, useState } from 'react';
import { safeFetch } from '@/lib/safeFetch';
import { useAppStore } from '@/lib/store';
import { Activity, CheckCircle, Sparkles, Wrench, RefreshCw, Users, Zap, Globe } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';

const typeConfig = {
  update:      { icon: Sparkles, tag: 'tag-emerald', label: 'Update' },
  maintenance: { icon: Wrench,   tag: 'tag-purple',  label: 'Maintenance' },
  feature:     { icon: Zap,      tag: 'tag-blue',    label: 'Feature' },
};

const OFFLINE = { status: 'offline', numUsers: '0', numKeys: '0', onlineUsers: '0', version: '—' };
const safeNum = (v: any) => { const n = parseInt(String(v ?? '0')); return isNaN(n) ? 0 : n; };
const normalize = (raw: any): typeof OFFLINE => {
  if (!raw || raw.status === 'offline') return OFFLINE;
  return {
    status:      raw.status ?? 'online',
    numUsers:    String(safeNum(raw.numUsers ?? raw.registered ?? 0)),
    numKeys:     String(safeNum(raw.numKeys ?? raw.keys ?? 0)),
    onlineUsers: String(safeNum(raw.onlineUsers ?? raw.numOnlineUsers ?? 0)),
    version:     String(raw.version ?? '—'),
  };
};

export default function PanelStatusPage() {
  const { t } = useTranslation();
  const { systemStatus, lastStatusUpdate, announcements } = useAppStore();
  const isOnline = systemStatus === 'online';
  const [lag, setLag]           = useState(OFFLINE);
  const [internal, setInternal] = useState(OFFLINE);
  const [loading, setLoading]   = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadStats = async () => {
    setLoading(true);
    try {
      const res = await safeFetch(
        'https://wkjqrjafogufqeasfeev.supabase.co/functions/v1/keyauth-stats',
        { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok', 'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok' }, body: JSON.stringify({}) },
        10000
      );
      if (res?.ok) {
        const data = await res.json();
        if (data?.lag) setLag(normalize(data.lag));
        if (data?.internal) setInternal(normalize(data.internal));
      }
    } catch {}
    setLoading(false);
    setLastRefresh(new Date());
  };

  useEffect(() => { loadStats(); const i = setInterval(loadStats, 60000); return () => clearInterval(i); }, []);

  const totalOnline = safeNum(lag.onlineUsers) + safeNum(internal.onlineUsers);
  const totalUsers  = safeNum(lag.numUsers) + safeNum(internal.numUsers);

  return (
    <div className="space-y-4">

      {/* System status */}
      <div className={cn('card rounded-2xl p-6 relative overflow-hidden anim-fade-up', isOnline ? 'card-emerald' : 'card-amber')}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center', isOnline ? 'bg-emerald-500/10' : 'bg-amber-500/10')} style={{ border: `1px solid ${isOnline ? 'rgba(52,211,153,0.2)' : 'rgba(245,158,11,0.2)'}` }}>
              <CheckCircle className={cn('w-6 h-6', isOnline ? 'text-emerald-400' : 'text-amber-400')} />
            </div>
            <div>
              <p className="label mb-0.5">{t('status.title')}</p>
              <h2 className="text-xl font-bold text-white font-display">{isOnline ? t('status.allOps') : t('status.maintenance')}</h2>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl" style={{ background: 'rgba(52,211,153,0.08)', border: '1px solid rgba(52,211,153,0.15)' }}>
            <div className="dot-live" />
            <span className="text-xs font-semibold text-emerald-400">OB52</span>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="card rounded-2xl p-6 anim-fade-up" style={{ animationDelay: '55ms' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <p className="font-semibold text-white font-display text-sm">{t('status.liveStats')}</p>
          </div>
          <button onClick={loadStats} disabled={loading}
            className="flex items-center gap-1.5 text-xs text-white/25 hover:text-white/50 transition-colors disabled:opacity-40">
            <RefreshCw className={cn('w-3.5 h-3.5', loading && 'animate-spin')} />
            {lastRefresh.toLocaleTimeString()}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 mb-6">
          {[
            { label: t('status.totalUsers'), value: totalUsers,  color: 'purple' },
            { label: t('status.onlineNow'),  value: totalOnline, color: 'emerald' },
          ].map(s => (
            <div key={s.label} className={cn('card rounded-xl p-5 text-center', s.color === 'purple' ? 'card-purple' : 'card-emerald')}>
              <p className={cn('text-5xl font-bold font-display font-mono-custom tabular-nums', s.color === 'purple' ? 'text-purple-300' : 'text-emerald-300')}>
                {loading ? <span className="animate-pulse text-3xl">···</span> : s.value.toLocaleString()}
              </p>
              <p className="label mt-2">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Services */}
        <p className="label mb-3">{t('status.services')}</p>
        <div className="space-y-0">
          {['Authentication Server', 'License Server', 'Payment Gateway', 'Chat Server'].map(svc => (
            <div key={svc} className="flex items-center justify-between py-3 border-b last:border-0" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
              <div className="flex items-center gap-2.5">
                <Globe className="w-3.5 h-3.5 text-white/20" />
                <span className="text-sm text-white/45">{svc}</span>
              </div>
              <span className="flex items-center gap-1.5 text-xs font-semibold text-emerald-400">
                <div className="dot-live" style={{ width: 5, height: 5 }} /> Online
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Announcements */}
      {announcements.length > 0 && (
        <div className="anim-fade-up" style={{ animationDelay: '110ms' }}>
          <p className="label text-purple-400 mb-3">{t('status.announcements')}</p>
          <div className="space-y-2">
            {announcements.map((ann, i) => {
              const cfg = typeConfig[ann.type] ?? typeConfig.update;
              return (
                <div key={ann.id} className="card rounded-xl p-4 anim-fade-up" style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-start gap-3">
                    <cfg.icon className="w-4 h-4 text-purple-400 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <p className="text-sm font-semibold text-white font-display">{ann.title}</p>
                        <span className={cn('tag', cfg.tag)}>{cfg.label}</span>
                      </div>
                      <p className="text-xs text-white/35 leading-relaxed">{ann.content}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
