import { useEffect, useState } from 'react';
import { useAppStore } from '@/lib/store';
import { Activity, CheckCircle, AlertTriangle, Clock, Megaphone, Sparkles, Wrench, RefreshCw, Users, Shield } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeConfig = {
  update:      { icon: Sparkles,      color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
  maintenance: { icon: Wrench,        color: 'text-purple-400',  bg: 'bg-purple-500/10'  },
  feature:     { icon: AlertTriangle, color: 'text-blue-400',    bg: 'bg-blue-500/10'    },
};

const OFFLINE = { status: 'offline', numUsers: '0', numKeys: '0', onlineUsers: '0', version: '—' };

// Safely parse any number-like value from the response
function safeNum(val: any): number {
  if (val === null || val === undefined) return 0;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? 0 : n;
}

// Normalize a single app stat block — handle any field name KeyAuth might return
function normalizeApp(raw: any): typeof OFFLINE {
  if (!raw || raw.status === 'offline') return OFFLINE;
  return {
    status:      raw.status      ?? 'online',
    numUsers:    String(safeNum(raw.numUsers    ?? raw.registered ?? raw.users     ?? 0)),
    numKeys:     String(safeNum(raw.numKeys     ?? raw.keys       ?? 0)),
    onlineUsers: String(safeNum(raw.onlineUsers ?? raw.numOnlineUsers ?? raw.online ?? 0)),
    version:     String(raw.version ?? '—'),
  };
}

export default function PanelStatusPage() {
  const { systemStatus, lastStatusUpdate, announcements } = useAppStore();
  const isOnline = systemStatus === 'online';

  const [lag,      setLag]      = useState(OFFLINE);
  const [internal, setInternal] = useState(OFFLINE);
  const [loading,  setLoading]  = useState(true);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const loadStats = async () => {
    setLoading(true);
    try {
      // Use direct fetch so it works regardless of auth state
      const res = await fetch(
        'https://wkjqrjafogufqeasfeev.supabase.co/functions/v1/keyauth-stats',
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok',
          },
          body: JSON.stringify({}),
        }
      );

      if (!res.ok) {
        setLoading(false);
        setLastRefresh(new Date());
        return;
      }

      const data = await res.json();

      if (!data?.lag && !data?.internal) {
        setLoading(false);
        setLastRefresh(new Date());
        return;
      }

      setLag(normalizeApp(data.lag));
      setInternal(normalizeApp(data.internal));

    } catch (e) {
    }

    setLoading(false);
    setLastRefresh(new Date());
  };

  useEffect(() => {
    loadStats();
    const interval = setInterval(loadStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const totalOnline = safeNum(lag.onlineUsers) + safeNum(internal.onlineUsers);
  const totalUsers  = safeNum(lag.numUsers)    + safeNum(internal.numUsers);

  const fmt = (n: number) => n > 0 ? n.toLocaleString() : (loading ? '···' : '0');

  return (
    <div className="space-y-6 w-full">

      {/* System Status */}
      <div className="rounded-2xl p-6 text-center border border-white/10 bg-white/3 animate-fade-up">
        <div className={cn('w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4',
          isOnline ? 'bg-emerald-500/15' : 'bg-orange-500/15')}>
          {isOnline
            ? <CheckCircle className="w-8 h-8 text-emerald-400" />
            : <AlertTriangle className="w-8 h-8 text-orange-400" />}
        </div>
        <h2 className="text-lg font-bold text-white mb-3">
          {isOnline ? 'All Systems Operational' : 'Maintenance Mode'}
        </h2>
        <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-500/10 border border-emerald-500/20 mb-3">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span className="text-sm font-bold text-emerald-400">OB52 Undetected</span>
          <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        </div>
        <p className="text-[10px] text-white/30 flex items-center justify-center gap-1">
          <Clock className="w-3 h-3" /> Last updated: {new Date(lastStatusUpdate).toLocaleString()}
        </p>
      </div>

      {/* Live Stats */}
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

        {/* Big totals */}
        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="rounded-xl p-5 text-center bg-purple-500/10 border border-purple-500/20">
            <p className="text-4xl font-black text-purple-400 tabular-nums">
              {loading ? <span className="animate-pulse text-3xl">···</span> : totalUsers.toLocaleString()}
            </p>
            <p className="text-[10px] text-white/40 mt-1.5 font-semibold uppercase tracking-wider">Total Users</p>
          </div>
          <div className="rounded-xl p-5 text-center bg-emerald-500/10 border border-emerald-500/20">
            <p className="text-4xl font-black text-emerald-400 tabular-nums">
              {loading ? <span className="animate-pulse text-3xl">···</span> : totalOnline.toLocaleString()}
            </p>
            <p className="text-[10px] text-white/40 mt-1.5 font-semibold uppercase tracking-wider">Online Now</p>
          </div>
        </div>




      </div>

      {/* Services */}
      <div className="rounded-2xl p-5 border border-white/10 bg-white/3 animate-fade-up" style={{ animationDelay: '120ms' }}>
        <h3 className="text-sm font-bold text-white mb-3">Services</h3>
        <div className="space-y-1">
          {['Authentication Server', 'License Server', 'Payment Gateway', 'Chat Server'].map(svc => (
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
                <div key={ann.id} className="rounded-xl p-4 border border-white/10 bg-white/3">
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

// needed for megaphone icon
function Megaphone({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m3 11 18-5v12L3 14v-3z"/><path d="M11.6 16.8a3 3 0 1 1-5.8-1.6"/>
    </svg>
  );
}
