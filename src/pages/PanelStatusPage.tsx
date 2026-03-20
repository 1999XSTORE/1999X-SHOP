import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Activity, CheckCircle, AlertTriangle, Clock, Megaphone, Sparkles, Wrench, RefreshCw, Users, Shield, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const typeConfig = {
  update:      { icon: Sparkles,      color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  maintenance: { icon: Wrench,        color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
  feature:     { icon: AlertTriangle, color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
};

interface AppStats {
  status: string;
  numUsers: string;
  numKeys: string;
  onlineUsers: string;
  version: string;
}

interface KAStats {
  lag: AppStats;
  internal: AppStats;
}

const OFFLINE: AppStats = { status: 'offline', numUsers: '0', numKeys: '0', onlineUsers: '0', version: '—' };

export default function PanelStatusPage() {
  const { systemStatus, lastStatusUpdate, announcements } = useAppStore();
  const isOnline = systemStatus === 'online';
  const [stats, setStats]       = useState<KAStats | null>(null);
  const [loading, setLoading]   = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadStats = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('keyauth-stats');
      if (!error && data) {
        setStats(data as KAStats);
      } else {
        setStats({ lag: OFFLINE, internal: OFFLINE });
      }
    } catch {
      setStats({ lag: OFFLINE, internal: OFFLINE });
    }
    setLoading(false);
    setLastRefresh(new Date());
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const lag      = stats?.lag      ?? OFFLINE;
  const internal = stats?.internal ?? OFFLINE;

  const totalOnline = loading ? null
    : (parseInt(lag.onlineUsers) || 0) + (parseInt(internal.onlineUsers) || 0);
  const totalUsers  = loading ? null
    : (parseInt(lag.numUsers)    || 0) + (parseInt(internal.numUsers)    || 0);

  const fmt = (n: number | null) => n !== null ? n.toLocaleString() : '—';
  const fmtStr = (s: string) => parseInt(s) > 0 ? parseInt(s).toLocaleString() : (loading ? '···' : s);

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
        <h2 className="text-lg font-bold text-white mb-2">
          {isOnline ? 'All Systems Operational' : 'Maintenance Mode'}
        </h2>

        {/* OB52 Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-emerald-400">OB52 Undetected</span>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>

        <p className="text-[10px] text-white/30 flex items-center justify-center gap-1">
          <Clock className="w-3 h-3" /> Last updated: {new Date(lastStatusUpdate).toLocaleString()}
        </p>
      </div>

      {/* Live Stats — Total */}
      <div className="rounded-2xl p-5 border border-white/10 bg-white/3 animate-fade-up" style={{ animationDelay: '60ms' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Live KeyAuth Stats</h3>
          </div>
          <button onClick={loadStats} disabled={loading}
            className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors disabled:opacity-50">
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
            {lastRefresh.toLocaleTimeString()}
          </button>
        </div>

        {/* Big total numbers */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl p-4 text-center bg-purple-500/10 border border-purple-500/20">
            <p className="text-3xl font-black text-purple-400">
              {loading ? <span className="animate-pulse text-2xl">···</span> : fmt(totalUsers)}
            </p>
            <p className="text-[10px] text-white/40 mt-1 font-semibold uppercase tracking-wider">Total Users</p>
          </div>
          <div className="rounded-xl p-4 text-center bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-3xl font-black text-emerald-400">
              {loading ? <span className="animate-pulse text-2xl">···</span> : fmt(totalOnline)}
            </p>
            <p className="text-[10px] text-white/40 mt-1 font-semibold uppercase tracking-wider">Online Now</p>
          </div>
        </div>

        {/* Per-app breakdown */}
        <div className="grid grid-cols-2 gap-3">
          {[
            { label: 'Fake Lag Panel',  data: lag,      color: 'purple' },
            { label: 'Internal Panel',  data: internal, color: 'blue'   },
          ].map(({ label, data, color }) => (
            <div key={label} className={cn('rounded-xl p-3 border',
              color === 'purple' ? 'bg-purple-500/5 border-purple-500/15' : 'bg-blue-500/5 border-blue-500/15'
            )}>
              <div className="flex items-center justify-between mb-2">
                <p className={cn('text-xs font-semibold', color === 'purple' ? 'text-purple-300' : 'text-blue-300')}>{label}</p>
                <span className={cn('text-[10px] font-bold flex items-center gap-1',
                  data.status === 'online' ? 'text-emerald-400' : 'text-red-400')}>
                  <span className={cn('w-1.5 h-1.5 rounded-full',
                    data.status === 'online' ? 'bg-emerald-400 animate-pulse' : 'bg-red-400')} />
                  {loading ? '···' : data.status}
                </span>
              </div>
              <div className="space-y-1">
                <div className="flex justify-between">
                  <span className="text-[10px] text-white/30">Online</span>
                  <span className="text-[10px] font-bold text-white">{loading ? '···' : fmtStr(data.onlineUsers)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-white/30">Total</span>
                  <span className="text-[10px] font-bold text-white">{loading ? '···' : fmtStr(data.numUsers)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-[10px] text-white/30">Version</span>
                  <span className="text-[10px] font-bold text-white">{loading ? '···' : data.version}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Services */}
      <div className="rounded-2xl p-5 border border-white/10 bg-white/3 animate-fade-up" style={{ animationDelay: '120ms' }}>
        <h3 className="text-sm font-bold text-white mb-3">Services</h3>
        <div className="space-y-1">
          {[
            'Authentication Server',
            'License Server',
            'Payment Gateway',
            'Chat Server',
          ].map(svc => (
            <div key={svc} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2">
                <Activity className="w-3.5 h-3.5 text-white/20" />
                <span className="text-xs font-medium text-white/60">{svc}</span>
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
      {announcements.length > 0 && (
        <div className="animate-fade-up" style={{ animationDelay: '200ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <Megaphone className="w-4 h-4 text-purple-400" />
            <h3 className="text-sm font-bold text-white">Announcements</h3>
          </div>
          <div className="space-y-3">
            {announcements.map((ann, i) => {
              const cfg = typeConfig[ann.type];
              return (
                <div key={ann.id} className="rounded-xl p-4 border border-white/10 bg-white/3 animate-fade-up"
                  style={{ animationDelay: `${(i + 3) * 80}ms` }}>
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
        </div>
      )}
    </div>
  );
}
