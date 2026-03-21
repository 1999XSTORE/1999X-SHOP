import { useEffect, useState } from 'react';
import { safeFetch } from '@/lib/safeFetch';
import { useAppStore } from '@/lib/store';
import { Activity, CheckCircle, AlertTriangle, Clock, Sparkles, Wrench, RefreshCw, Users, Shield, Zap, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';

const typeConfig = {
  update:      { icon: Sparkles, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'Update' },
  maintenance: { icon: Wrench,   color: 'text-violet-400',  bg: 'bg-violet-500/10',  border: 'border-violet-500/20',  label: 'Maintenance' },
  feature:     { icon: Zap,      color: 'text-blue-400',    bg: 'bg-blue-500/10',    border: 'border-blue-500/20',    label: 'Feature' },
};

const OFFLINE = { status: 'offline', numUsers: '0', numKeys: '0', onlineUsers: '0', version: '—' };

function safeNum(val: any): number {
  if (!val) return 0;
  const n = parseInt(String(val), 10);
  return isNaN(n) ? 0 : n;
}

function normalizeApp(raw: any): typeof OFFLINE {
  if (!raw || raw.status === 'offline') return OFFLINE;
  return {
    status:      raw.status      ?? 'online',
    numUsers:    String(safeNum(raw.numUsers    ?? raw.registered ?? 0)),
    numKeys:     String(safeNum(raw.numKeys     ?? raw.keys       ?? 0)),
    onlineUsers: String(safeNum(raw.onlineUsers ?? raw.numOnlineUsers ?? 0)),
    version:     String(raw.version ?? '—'),
  };
}

function StatBlock({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <div className="text-center">
      <p className="text-2xl font-black text-white" style={{ fontFamily: 'Syne, sans-serif' }}>{value}</p>
      <p className="section-label mt-0.5">{label}</p>
      {sub && <p className="text-[9px] text-white/20 mt-0.5">{sub}</p>}
    </div>
  );
}

export default function PanelStatusPage() {
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
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok',
            'apikey': 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok',
          },
          body: JSON.stringify({}),
        }, 10000
      );
      if (res && res.ok) {
        const data = await res.json();
        if (data?.lag)      setLag(normalizeApp(data.lag));
        if (data?.internal) setInternal(normalizeApp(data.internal));
      }
    } catch {}
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

  return (
    <div className="space-y-4 w-full">

      {/* System status hero */}
      <div className={cn('glass rounded-2xl p-6 border relative overflow-hidden animate-fade-up',
        isOnline ? 'border-emerald-500/20' : 'border-orange-500/20')}
        style={{ boxShadow: isOnline ? '0 0 50px rgba(52,211,153,0.06)' : '0 0 50px rgba(251,146,60,0.06)' }}>
        <div className={cn('absolute inset-0 bg-gradient-to-br opacity-30',
          isOnline ? 'from-emerald-900/20 to-transparent' : 'from-orange-900/20 to-transparent')} />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className={cn('w-12 h-12 rounded-xl flex items-center justify-center',
              isOnline ? 'bg-emerald-500/10 border border-emerald-500/20' : 'bg-orange-500/10 border border-orange-500/20')}>
              {isOnline ? <CheckCircle className="w-6 h-6 text-emerald-400" /> : <AlertTriangle className="w-6 h-6 text-orange-400" />}
            </div>
            <div>
              <p className="section-label mb-0.5">{isOnline ? 'All Systems' : 'System Status'}</p>
              <h2 className="text-lg font-black text-white" style={{ fontFamily: 'Syne, sans-serif' }}>
                {isOnline ? 'Operational' : 'Maintenance'}
              </h2>
            </div>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="status-dot" />
            <span className="text-[10px] font-bold text-emerald-400">OB52 Undetected</span>
          </div>
        </div>
      </div>

      {/* Live stats */}
      <div className="glass rounded-2xl p-5 border border-white/8 animate-fade-up" style={{ animationDelay: '60ms' }}>
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-violet-400" />
            <p className="text-sm font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>Live Stats</p>
          </div>
          <button onClick={loadStats} disabled={loading}
            className="flex items-center gap-1.5 text-[10px] text-white/30 hover:text-white/60 transition-colors disabled:opacity-40">
            <RefreshCw className={cn('w-3 h-3', loading && 'animate-spin')} />
            {lastRefresh.toLocaleTimeString()}
          </button>
        </div>

        {/* Big numbers */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="glass-purple rounded-xl p-4 text-center">
            <p className="text-5xl font-black text-violet-300 tabular-nums" style={{ fontFamily: 'Syne, sans-serif' }}>
              {loading ? <span className="animate-pulse text-4xl">···</span> : totalUsers.toLocaleString()}
            </p>
            <p className="section-label mt-1.5">Total Users</p>
          </div>
          <div className="rounded-xl p-4 text-center border border-emerald-500/20 bg-emerald-500/5">
            <p className="text-5xl font-black text-emerald-300 tabular-nums" style={{ fontFamily: 'Syne, sans-serif' }}>
              {loading ? <span className="animate-pulse text-4xl">···</span> : totalOnline.toLocaleString()}
            </p>
            <p className="section-label mt-1.5">Online Now</p>
          </div>
        </div>

        {/* Services */}
        <div className="space-y-2">
          {[
            { name: 'Authentication',  ok: true },
            { name: 'License Server',  ok: true },
            { name: 'Payment Gateway', ok: true },
            { name: 'Chat Server',     ok: true },
          ].map(svc => (
            <div key={svc.name} className="flex items-center justify-between py-2.5 border-b border-white/5 last:border-0">
              <div className="flex items-center gap-2.5">
                <Globe className="w-3.5 h-3.5 text-white/20" />
                <span className="text-xs text-white/50">{svc.name}</span>
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
        <div className="animate-fade-up" style={{ animationDelay: '120ms' }}>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-3.5 h-3.5 text-violet-400" />
            <span className="section-label text-violet-400">Announcements</span>
          </div>
          <div className="space-y-3">
            {announcements.map((ann, i) => {
              const cfg = typeConfig[ann.type] ?? typeConfig.update;
              return (
                <div key={ann.id} className="glass rounded-xl p-4 border border-white/8 animate-fade-up"
                  style={{ animationDelay: `${i * 60}ms` }}>
                  <div className="flex items-start gap-3">
                    <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border', cfg.bg, cfg.border)}>
                      <cfg.icon className={cn('w-3.5 h-3.5', cfg.color)} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-1">
                        <p className="text-xs font-bold text-white" style={{ fontFamily: 'Syne, sans-serif' }}>{ann.title}</p>
                        <span className="text-[9px] text-white/25">{new Date(ann.createdAt).toLocaleDateString()}</span>
                      </div>
                      <p className="text-[11px] text-white/40 leading-relaxed">{ann.content}</p>
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
