import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAppStore } from '@/lib/store';
import { RefreshCw, Search, Trash2, AlertTriangle, X, Activity, Filter, ChevronDown } from 'lucide-react';
import { toast } from 'sonner';

// ── Types ─────────────────────────────────────────────────────
interface Log {
  id:          string;
  user_id:     string;
  user_email:  string;
  user_name:   string;
  action_type: string;
  product:     string;
  amount:      number | null;
  status:      'success' | 'failed';
  meta:        Record<string, unknown>;
  created_at:  string;
}

// ── Action config ─────────────────────────────────────────────
const ACTION_CFG: Record<string, { label: string; color: string; bg: string; emoji: string }> = {
  login:              { label: 'Login',           color: 'var(--green)',  bg: 'rgba(16,232,152,.08)',  emoji: '🔐' },
  logout:             { label: 'Logout',          color: 'rgba(255,255,255,.4)', bg: 'rgba(255,255,255,.04)', emoji: '👋' },
  register:           { label: 'Register',        color: '#818cf8',       bg: 'rgba(99,102,241,.09)', emoji: '✨' },
  bonus_claim:        { label: 'Bonus Claimed',   color: 'var(--amber)',  bg: 'rgba(251,191,36,.08)', emoji: '🎁' },
  free_key_claim:     { label: 'Free Key',        color: '#a78bfa',       bg: 'rgba(139,92,246,.08)', emoji: '🗝️' },
  key_generated:      { label: 'Key Generated',  color: 'var(--green)',  bg: 'rgba(16,232,152,.08)', emoji: '🔑' },
  purchase:           { label: 'Purchase',        color: '#34d399',       bg: 'rgba(52,211,153,.08)', emoji: '🛒' },
  payment_submit:     { label: 'Payment Submit',  color: 'var(--amber)',  bg: 'rgba(251,191,36,.08)', emoji: '💳' },
  payment_approved:   { label: 'Payment ✓',       color: 'var(--green)',  bg: 'rgba(16,232,152,.08)', emoji: '✅' },
  payment_rejected:   { label: 'Payment ✗',       color: 'var(--red)',    bg: 'rgba(248,113,113,.08)',emoji: '❌' },
  balance_add:        { label: 'Balance Added',   color: 'var(--green)',  bg: 'rgba(16,232,152,.08)', emoji: '💰' },
  balance_deduct:     { label: 'Balance Deducted',color: '#f87171',       bg: 'rgba(248,113,113,.07)',emoji: '💸' },
  hwid_reset:         { label: 'HWID Reset',      color: 'var(--blue)',   bg: 'rgba(56,189,248,.08)', emoji: '🔄' },
  announcement_posted:{ label: 'Announcement',    color: 'var(--purple)', bg: 'rgba(139,92,246,.09)', emoji: '📢' },
  message_sent:       { label: 'Message',         color: 'rgba(255,255,255,.35)', bg: 'rgba(255,255,255,.03)', emoji: '💬' },
};

// Only show important activities
const IMPORTANT_ACTIONS = [
  'hwid_reset',
  'payment_rejected',
  'purchase',
  'payment_approved',
  'payment_submit',
  'balance_add',
  'balance_deduct',
  'free_key_claim',
  'key_generated',
];

const ALL_ACTIONS = IMPORTANT_ACTIONS;

// ── Confirm reset modal ────────────────────────────────────────
function ConfirmReset({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.82)',backdropFilter:'blur(14px)',padding:20 }}>
      <div className="g si" style={{ maxWidth:400,width:'100%',padding:'32px 28px',textAlign:'center',boxShadow:'0 0 80px rgba(239,68,68,.15),0 32px 80px rgba(0,0,0,.7)',borderColor:'rgba(239,68,68,.2)' }}>
        <div style={{ width:60,height:60,borderRadius:18,background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.25)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',boxShadow:'0 0 30px rgba(239,68,68,.2)' }}>
          <AlertTriangle size={28} color="#f87171" />
        </div>
        <div style={{ fontSize:20,fontWeight:800,color:'#fff',marginBottom:8 }}>Reset All Activity?</div>
        <p style={{ fontSize:13,color:'var(--muted)',marginBottom:24,lineHeight:1.6 }}>
          This will permanently delete <strong style={{ color:'#f87171' }}>all activity logs</strong>. This action cannot be undone.
        </p>
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={onCancel} className="btn btn-ghost" style={{ flex:1 }}>Cancel</button>
          <button onClick={onConfirm} className="btn btn-danger" style={{ flex:1,background:'linear-gradient(135deg,#dc2626,#b91c1c)',border:'none',boxShadow:'0 0 20px rgba(220,38,38,.35)' }}>
            <Trash2 size={14} /> Yes, Delete All
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main AdminActivityPage ─────────────────────────────────────
export default function AdminActivityPage() {
  const { user } = useAppStore();
  const isAdmin = user?.role === 'admin';

  const [logs,         setLogs]         = useState<Log[]>([]);
  const [loading,      setLoading]      = useState(true);
  const [total,        setTotal]        = useState(0);
  const [page,         setPage]         = useState(0);
  const PAGE_SIZE = 50;

  // Filters
  const [search,       setSearch]       = useState('');
  const [actionFilter, setActionFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFrom,     setDateFrom]     = useState('');
  const [dateTo,       setDateTo]       = useState('');
  const [showFilters,  setShowFilters]  = useState(false);

  const [showReset,    setShowReset]    = useState(false);
  const [resetting,    setResetting]    = useState(false);

  const channelRef = useRef<any>(null);

  // ── Load logs ────────────────────────────────────────────────
  const load = async (pg = 0) => {
    setLoading(true);
    let q = supabase
      .from('activity_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(pg * PAGE_SIZE, pg * PAGE_SIZE + PAGE_SIZE - 1);

    if (search.trim())    q = q.or(`user_email.ilike.%${search.trim()}%,user_name.ilike.%${search.trim()}%,product.ilike.%${search.trim()}%`);
    if (actionFilter)     q = q.eq('action_type', actionFilter);
    else                  q = q.in('action_type', IMPORTANT_ACTIONS);
    if (statusFilter)     q = q.eq('status', statusFilter);
    if (dateFrom)         q = q.gte('created_at', dateFrom);
    if (dateTo)           q = q.lte('created_at', dateTo + 'T23:59:59');

    const { data, count, error } = await q;
    if (!error) { setLogs(data ?? []); setTotal(count ?? 0); }
    setLoading(false);
  };

  useEffect(() => { if (isAdmin) load(0); }, [isAdmin, search, actionFilter, statusFilter, dateFrom, dateTo]);

  // ── Realtime new logs ────────────────────────────────────────
  useEffect(() => {
    if (!isAdmin) return;
    const ch = supabase.channel('activity-realtime')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'activity_logs' }, ({ new: row }) => {
        setLogs(prev => [row as Log, ...prev.slice(0, PAGE_SIZE - 1)]);
        setTotal(t => t + 1);
      })
      .subscribe();
    channelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [isAdmin]);

  // ── Reset all ────────────────────────────────────────────────
  const handleReset = async () => {
    setResetting(true);
    const { error } = await supabase.from('activity_logs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
    if (error) { toast.error('Reset failed: ' + error.message); }
    else { setLogs([]); setTotal(0); toast.success('All activity logs cleared.'); }
    setResetting(false);
    setShowReset(false);
  };

  if (!isAdmin) {
    return (
      <div className="g fu" style={{ padding:'48px 20px', textAlign:'center' }}>
        <AlertTriangle size={36} style={{ color:'var(--red)', margin:'0 auto 12px' }} />
        <p style={{ fontSize:15, fontWeight:700, color:'#fff' }}>Admin Only</p>
        <p style={{ fontSize:13, color:'var(--muted)' }}>You don't have permission to view this page.</p>
      </div>
    );
  }

  const activeFilters = [actionFilter, statusFilter, dateFrom, dateTo].filter(Boolean).length;

  return (
    <>
      {showReset && <ConfirmReset onConfirm={handleReset} onCancel={() => setShowReset(false)} />}

      <div style={{ display:'flex', flexDirection:'column', gap:16 }}>

        {/* Header */}
        <div className="g fu" style={{ padding:'18px 22px', background:'linear-gradient(135deg,rgba(239,68,68,.07),rgba(255,255,255,.025))' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <div style={{ width:44,height:44,borderRadius:12,background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
                <Activity size={20} color="#f87171" />
              </div>
              <div>
                <div style={{ fontSize:16, fontWeight:800, color:'#fff' }}>Activity History</div>
                <div style={{ fontSize:12, color:'var(--muted)', marginTop:2 }}>
                  {total.toLocaleString()} total events · real-time
                </div>
              </div>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button onClick={() => load(page)} disabled={loading} className="btn btn-ghost btn-sm">
                <RefreshCw size={13} className={loading ? 'animate-spin' : ''} /> Refresh
              </button>
              <button onClick={() => setShowReset(true)} disabled={resetting}
                style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:10,background:'rgba(239,68,68,.1)',border:'1px solid rgba(239,68,68,.22)',cursor:'pointer',color:'#f87171',fontSize:12,fontWeight:700,fontFamily:'inherit',transition:'all .15s' }}
                onMouseEnter={e => { e.currentTarget.style.background='rgba(239,68,68,.18)'; }}
                onMouseLeave={e => { e.currentTarget.style.background='rgba(239,68,68,.1)'; }}>
                <Trash2 size={13} /> Reset All
              </button>
            </div>
          </div>
        </div>

        {/* Search + Filters */}
        <div className="g" style={{ padding:'14px 16px' }}>
          <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
            {/* Search */}
            <div style={{ position:'relative', flex:1, minWidth:200 }}>
              <Search size={13} style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',color:'var(--muted)',pointerEvents:'none' }} />
              <input
                value={search} onChange={e => { setSearch(e.target.value); setPage(0); }}
                placeholder="Search by email, name, product…"
                style={{ width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.09)',borderRadius:10,padding:'9px 14px 9px 34px',color:'#fff',fontFamily:'inherit',fontSize:13,outline:'none',boxSizing:'border-box' }}
                onFocus={e => { e.target.style.borderColor='rgba(139,92,246,.45)'; }}
                onBlur={e => { e.target.style.borderColor='rgba(255,255,255,.09)'; }}
              />
            </div>

            {/* Filter toggle */}
            <button onClick={() => setShowFilters(!showFilters)}
              style={{ display:'flex',alignItems:'center',gap:6,padding:'9px 14px',borderRadius:10,background:showFilters||activeFilters>0?'rgba(139,92,246,.15)':'rgba(255,255,255,.05)',border:`1px solid ${activeFilters>0?'rgba(139,92,246,.35)':'rgba(255,255,255,.09)'}`,cursor:'pointer',color:activeFilters>0?'#c4b5fd':'var(--muted)',fontSize:12,fontWeight:700,fontFamily:'inherit',transition:'all .15s',whiteSpace:'nowrap' }}>
              <Filter size={13} />
              Filters {activeFilters > 0 && <span style={{ background:'var(--purple)',color:'#fff',borderRadius:'50%',width:16,height:16,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:9,fontWeight:900 }}>{activeFilters}</span>}
              <ChevronDown size={12} style={{ transform:showFilters?'rotate(180deg)':'none',transition:'transform .2s' }} />
            </button>
          </div>

          {/* Filter row */}
          {showFilters && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(160px,1fr))', gap:8, marginTop:12, paddingTop:12, borderTop:'1px solid rgba(255,255,255,.06)' }}>
              {/* Action type */}
              <div>
                <label style={{ fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',display:'block',marginBottom:5 }}>Action Type</label>
                <select value={actionFilter} onChange={e => { setActionFilter(e.target.value); setPage(0); }}
                  style={{ width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.09)',borderRadius:8,padding:'8px 10px',color:'#fff',fontFamily:'inherit',fontSize:12,outline:'none' }}>
                  <option value="">All actions</option>
                  {ALL_ACTIONS.map(a => <option key={a} value={a}>{ACTION_CFG[a]?.label ?? a}</option>)}
                </select>
              </div>

              {/* Status */}
              <div>
                <label style={{ fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',display:'block',marginBottom:5 }}>Status</label>
                <select value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setPage(0); }}
                  style={{ width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.09)',borderRadius:8,padding:'8px 10px',color:'#fff',fontFamily:'inherit',fontSize:12,outline:'none' }}>
                  <option value="">All statuses</option>
                  <option value="success">Success</option>
                  <option value="failed">Failed</option>
                </select>
              </div>

              {/* Date from */}
              <div>
                <label style={{ fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',display:'block',marginBottom:5 }}>From Date</label>
                <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(0); }}
                  style={{ width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.09)',borderRadius:8,padding:'8px 10px',color:'#fff',fontFamily:'inherit',fontSize:12,outline:'none',colorScheme:'dark' }} />
              </div>

              {/* Date to */}
              <div>
                <label style={{ fontSize:10,color:'var(--muted)',fontWeight:700,textTransform:'uppercase',letterSpacing:'.08em',display:'block',marginBottom:5 }}>To Date</label>
                <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(0); }}
                  style={{ width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.09)',borderRadius:8,padding:'8px 10px',color:'#fff',fontFamily:'inherit',fontSize:12,outline:'none',colorScheme:'dark' }} />
              </div>

              {/* Clear filters */}
              {activeFilters > 0 && (
                <div style={{ display:'flex', alignItems:'flex-end' }}>
                  <button onClick={() => { setActionFilter(''); setStatusFilter(''); setDateFrom(''); setDateTo(''); setPage(0); }}
                    style={{ width:'100%',padding:'8px 10px',borderRadius:8,background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.09)',cursor:'pointer',color:'var(--muted)',fontSize:12,fontFamily:'inherit',display:'flex',alignItems:'center',justifyContent:'center',gap:5,transition:'all .15s' }}
                    onMouseEnter={e => { e.currentTarget.style.color='#fff'; }}
                    onMouseLeave={e => { e.currentTarget.style.color='var(--muted)'; }}>
                    <X size={12} /> Clear Filters
                  </button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats bar */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(120px,1fr))', gap:8 }}>
          {[
            { label:'Total',   val:total,                                         c:'var(--purple)', bg:'rgba(109,40,217,.08)', bc:'rgba(139,92,246,.16)' },
            { label:'Today',   val:logs.filter(l => l.created_at.startsWith(new Date().toISOString().slice(0,10))).length, c:'var(--blue)', bg:'rgba(56,189,248,.07)', bc:'rgba(56,189,248,.14)' },
            { label:'Success', val:logs.filter(l => l.status==='success').length, c:'var(--green)', bg:'rgba(16,232,152,.07)', bc:'rgba(16,232,152,.14)' },
            { label:'Failed',  val:logs.filter(l => l.status==='failed').length,  c:'var(--red)',   bg:'rgba(248,113,113,.07)',bc:'rgba(248,113,113,.14)' },
          ].map(s => (
            <div key={s.label} className="g" style={{ padding:'14px 16px', textAlign:'center', background:s.bg, borderColor:s.bc }}>
              <div style={{ fontSize:22, fontWeight:800, color:s.c, letterSpacing:'-.02em' }}>{s.val.toLocaleString()}</div>
              <div className="label" style={{ marginTop:4 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Log table */}
        <div className="g" style={{ padding:0, overflow:'hidden' }}>
          {/* Table header */}
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr 1fr 0.8fr 0.7fr 0.8fr', gap:8, padding:'12px 18px', borderBottom:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.02)' }}>
            {['User', 'Action', 'Product / Detail', 'Amount', 'Status', 'Time'].map(h => (
              <div key={h} style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.35)', textTransform:'uppercase', letterSpacing:'.1em' }}>{h}</div>
            ))}
          </div>

          {/* Rows */}
          <div style={{ maxHeight:600, overflowY:'auto' }}>
            {loading ? (
              <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'48px 0',color:'var(--muted)' }}>
                <RefreshCw size={16} className="animate-spin" /><span style={{ fontSize:13 }}>Loading…</span>
              </div>
            ) : logs.length === 0 ? (
              <div style={{ textAlign:'center', padding:'48px 0' }}>
                <Activity size={32} style={{ color:'rgba(255,255,255,.06)', margin:'0 auto 12px' }} />
                <p style={{ fontSize:14, fontWeight:600, color:'var(--muted)' }}>No activity logs yet</p>
                <p style={{ fontSize:12, color:'var(--dim)' }}>Actions will appear here in real-time</p>
              </div>
            ) : logs.map((log, i) => {
              const cfg = ACTION_CFG[log.action_type] ?? { label:log.action_type, color:'var(--muted)', bg:'rgba(255,255,255,.03)', emoji:'•' };
              const meta = log.meta as any;
              const detail = log.product || meta?.method || meta?.key?.slice(0,12) || '';
              return (
                <div key={log.id}
                  style={{ display:'grid', gridTemplateColumns:'1fr 1.2fr 1fr 0.8fr 0.7fr 0.8fr', gap:8, padding:'11px 18px', borderBottom:'1px solid rgba(255,255,255,.04)', transition:'background .12s' }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,.025)'; }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.background='transparent'; }}>

                  {/* User */}
                  <div style={{ minWidth:0 }}>
                    <div style={{ fontSize:12, fontWeight:600, color:'#fff', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.user_name}</div>
                    <div style={{ fontSize:10, color:'var(--dim)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{log.user_email}</div>
                  </div>

                  {/* Action */}
                  <div style={{ display:'flex', alignItems:'center', gap:7 }}>
                    <span style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'3px 9px',borderRadius:20,background:cfg.bg,border:`1px solid ${cfg.color}22`,fontSize:11,fontWeight:700,color:cfg.color,whiteSpace:'nowrap' }}>
                      {cfg.emoji} {cfg.label}
                    </span>
                  </div>

                  {/* Detail */}
                  <div style={{ fontSize:11, color:'var(--muted)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap', display:'flex', alignItems:'center' }}>
                    {detail || <span style={{ color:'var(--dim)' }}>—</span>}
                  </div>

                  {/* Amount */}
                  <div style={{ fontSize:12, fontWeight:700, color:log.amount ? (log.action_type.includes('deduct') ? '#f87171' : 'var(--green)') : 'var(--dim)', display:'flex', alignItems:'center' }}>
                    {log.amount != null ? `${log.action_type.includes('deduct') ? '-' : ''}$${Number(log.amount).toFixed(2)}` : '—'}
                  </div>

                  {/* Status */}
                  <div style={{ display:'flex', alignItems:'center' }}>
                    <span style={{ display:'inline-flex',alignItems:'center',gap:4,padding:'2px 8px',borderRadius:20,background:log.status==='success'?'rgba(16,232,152,.08)':'rgba(248,113,113,.08)',border:`1px solid ${log.status==='success'?'rgba(16,232,152,.18)':'rgba(248,113,113,.18)'}`,fontSize:10,fontWeight:700,color:log.status==='success'?'var(--green)':'var(--red)' }}>
                      {log.status === 'success' ? '✓' : '✗'} {log.status}
                    </span>
                  </div>

                  {/* Time */}
                  <div style={{ fontSize:10, color:'var(--dim)', display:'flex', alignItems:'center', whiteSpace:'nowrap' }}>
                    {new Date(log.created_at).toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {total > PAGE_SIZE && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 18px', borderTop:'1px solid rgba(255,255,255,.07)' }}>
              <span style={{ fontSize:12, color:'var(--muted)' }}>
                Showing {page * PAGE_SIZE + 1}–{Math.min((page+1)*PAGE_SIZE, total)} of {total.toLocaleString()}
              </span>
              <div style={{ display:'flex', gap:6 }}>
                <button onClick={() => { setPage(p => p-1); load(page-1); }} disabled={page===0} className="btn btn-ghost btn-sm">← Prev</button>
                <button onClick={() => { setPage(p => p+1); load(page+1); }} disabled={(page+1)*PAGE_SIZE >= total} className="btn btn-ghost btn-sm">Next →</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}
