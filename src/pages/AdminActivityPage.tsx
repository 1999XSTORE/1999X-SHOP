import { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { Activity, AlertTriangle, RefreshCw, Search } from 'lucide-react';
import { canAccessActivity } from '@/lib/roles';

interface Log {
  id: string;
  user_id: string;
  user_email: string;
  user_name: string;
  action_type: string;
  product: string;
  amount: number | null;
  status: 'success' | 'failed';
  meta: Record<string, unknown>;
  created_at: string;
}

const IMPORTANT_ACTIONS = [
  'hwid_reset',
  'purchase',
  'purchase_failed',
  'login_failed',
  'account_banned',
  'account_unbanned',
  'key_expired',
  'free_key_claim',
] as const;

const ACTION_META: Record<string, { label: string; color: string; bg: string }> = {
  hwid_reset:       { label: 'HWID Reset',          color: 'var(--green)', bg: 'rgba(16,232,152,.08)' },
  purchase:         { label: 'Successful Purchase', color: 'var(--green)', bg: 'rgba(16,232,152,.08)' },
  purchase_failed:  { label: 'Failed Purchase',     color: 'var(--red)',   bg: 'rgba(248,113,113,.08)' },
  login_failed:     { label: 'Failed Login',        color: 'var(--red)',   bg: 'rgba(248,113,113,.08)' },
  account_banned:   { label: 'Account Banned',      color: 'var(--red)',   bg: 'rgba(248,113,113,.08)' },
  account_unbanned: { label: 'Account Unbanned',    color: 'var(--green)', bg: 'rgba(16,232,152,.08)' },
  key_expired:      { label: 'Key Expired',         color: 'var(--amber)', bg: 'rgba(251,191,36,.08)' },
  free_key_claim:   { label: 'Free Key Claimed',    color: 'var(--amber)', bg: 'rgba(251,191,36,.08)' },
};

function getDetail(log: Log) {
  const meta = log.meta as Record<string, unknown>;
  return (
    log.product ||
    String(meta?.method ?? '') ||
    String(meta?.for_user ?? '') ||
    String(meta?.txnId ?? '') ||
    '—'
  );
}

export default function AdminActivityPage() {
  const { user } = useAppStore();
  const isAdmin = canAccessActivity(user?.role);
  const [logs, setLogs] = useState<Log[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('');

  const load = async () => {
    setLoading(true);
    let q = supabase
      .from('activity_logs')
      .select('*')
      .in('action_type', [...IMPORTANT_ACTIONS])
      .order('created_at', { ascending: false })
      .limit(100);

    if (search.trim()) {
      q = q.or(`user_email.ilike.%${search.trim()}%,user_name.ilike.%${search.trim()}%,product.ilike.%${search.trim()}%`);
    }
    if (actionFilter) {
      q = q.eq('action_type', actionFilter);
    }

    const { data } = await q;
    setLogs((data as Log[]) ?? []);
    setLoading(false);
  };

  useEffect(() => {
    if (!isAdmin) return;
    load();
  }, [isAdmin, search, actionFilter]);

  useEffect(() => {
    if (!isAdmin) return;
    const ch = supabase.channel('important-activity')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, ({ new: row }) => {
        const next = row as Log;
        if (!IMPORTANT_ACTIONS.includes(next.action_type as typeof IMPORTANT_ACTIONS[number])) return;
        setLogs(prev => [next, ...prev].slice(0, 100));
      })
      .subscribe();

    return () => { supabase.removeChannel(ch); };
  }, [isAdmin]);

  const stats = useMemo(() => ({
    total: logs.length,
    success: logs.filter(log => ['purchase', 'hwid_reset', 'account_unbanned'].includes(log.action_type)).length,
    failed: logs.filter(log => ['purchase_failed', 'login_failed', 'account_banned'].includes(log.action_type)).length,
    warnings: logs.filter(log => ['key_expired', 'free_key_claim'].includes(log.action_type)).length,
  }), [logs]);

  if (!isAdmin) {
    return (
      <div className="g fu" style={{ padding:'48px 20px', textAlign:'center' }}>
        <AlertTriangle size={36} style={{ color:'var(--red)', margin:'0 auto 12px' }} />
        <p style={{ fontSize:15, fontWeight:700, color:'#fff' }}>Admin Only</p>
        <p style={{ fontSize:13, color:'var(--muted)' }}>You don't have permission to view this page.</p>
      </div>
    );
  }

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
      <div className="g fu" style={{ padding:'18px 22px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{ width:44,height:44,borderRadius:12,background:'rgba(251,191,36,.1)',border:'1px solid rgba(251,191,36,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Activity size={20} color="var(--amber)" />
            </div>
            <div>
              <div style={{ fontSize:16, fontWeight:800, color:'#fff' }}>Important Activity</div>
              <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>Only major account, login, purchase, and key events</div>
            </div>
          </div>
          <button onClick={load} disabled={loading} className="btn btn-ghost btn-sm">
            <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
          </button>
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:8 }}>
        {[
          { label:'Important', val:stats.total, color:'var(--purple)', bg:'rgba(139,92,246,.08)' },
          { label:'Success', val:stats.success, color:'var(--green)', bg:'rgba(16,232,152,.08)' },
          { label:'Failures', val:stats.failed, color:'var(--red)', bg:'rgba(248,113,113,.08)' },
          { label:'Warnings', val:stats.warnings, color:'var(--amber)', bg:'rgba(251,191,36,.08)' },
        ].map(card => (
          <div key={card.label} className="g" style={{ padding:'14px 16px', background:card.bg, borderColor:'rgba(255,255,255,.06)' }}>
            <div style={{ fontSize:24, fontWeight:900, color:card.color }}>{card.val}</div>
            <div style={{ fontSize:11, color:'rgba(255,255,255,.38)', textTransform:'uppercase', letterSpacing:'.12em', marginTop:4 }}>{card.label}</div>
          </div>
        ))}
      </div>

      <div className="g" style={{ padding:'14px 16px' }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
          <div style={{ position:'relative', flex:1, minWidth:220 }}>
            <Search size={13} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--muted)',pointerEvents:'none' }} />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by user or detail..."
              style={{ width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.09)',borderRadius:10,padding:'9px 14px 9px 34px',color:'#fff',fontFamily:'inherit',fontSize:13,outline:'none',boxSizing:'border-box' }}
            />
          </div>
          <select
            value={actionFilter}
            onChange={e => setActionFilter(e.target.value)}
            style={{ minWidth:220,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.09)',borderRadius:10,padding:'9px 12px',color:'#fff',fontFamily:'inherit',fontSize:12,outline:'none' }}
          >
            <option value="">All important actions</option>
            {IMPORTANT_ACTIONS.map(action => (
              <option key={action} value={action}>{ACTION_META[action].label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="g" style={{ padding:0, overflow:'hidden' }}>
        <div style={{ display:'grid', gridTemplateColumns:'1.1fr 1fr 1.4fr 0.9fr', gap:8, padding:'12px 18px', borderBottom:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.02)' }}>
          {['User', 'Action', 'Detail', 'Time'].map(label => (
            <div key={label} style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.1em' }}>{label}</div>
          ))}
        </div>

        <div style={{ maxHeight:640, overflowY:'auto' }}>
          {loading ? (
            <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'48px 0',color:'var(--muted)' }}>
              <RefreshCw size={16} className="animate-spin" /><span style={{ fontSize:13 }}>Loading...</span>
            </div>
          ) : logs.length === 0 ? (
            <div style={{ textAlign:'center', padding:'48px 0' }}>
              <Activity size={32} style={{ color:'rgba(255,255,255,.06)', margin:'0 auto 12px' }} />
              <p style={{ fontSize:14, fontWeight:600, color:'var(--muted)' }}>No important activity yet</p>
              <p style={{ fontSize:12, color:'var(--dim)' }}>Only major events appear here</p>
            </div>
          ) : logs.map(log => {
            const meta = ACTION_META[log.action_type] ?? { label: log.action_type, color: 'var(--muted)', bg: 'rgba(255,255,255,.03)' };
            return (
              <div key={log.id} style={{ display:'grid', gridTemplateColumns:'1.1fr 1fr 1.4fr 0.9fr', gap:8, padding:'13px 18px', borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                <div style={{ minWidth:0 }}>
                  <div style={{ fontSize:13, fontWeight:700, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.user_name || 'Unknown User'}</div>
                  <div style={{ fontSize:11, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.user_email}</div>
                </div>
                <div style={{ display:'flex', alignItems:'center' }}>
                  <span style={{ display:'inline-flex',alignItems:'center',padding:'4px 10px',borderRadius:999,background:meta.bg,border:`1px solid ${meta.color}22`,fontSize:11,fontWeight:800,color:meta.color }}>
                    {meta.label}
                  </span>
                </div>
                <div style={{ display:'flex', alignItems:'center', fontSize:12, color:'rgba(255,255,255,.72)' }}>
                  {getDetail(log)}
                </div>
                <div style={{ display:'flex', alignItems:'center', fontSize:12, color:'var(--muted)' }}>
                  {new Date(log.created_at).toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
