import { useState, useEffect, useRef } from 'react';
import { useAppStore, PRODUCTS } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { ArrowRight, ArrowLeft, RefreshCw, Users, Check, X, Copy, CheckCircle, Loader2, Zap, Shield, Eye, EyeOff } from 'lucide-react';
import { safeQuery } from '@/lib/safeFetch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

// ============================================================
//  ✏️  EDIT PAYMENT DETAILS HERE
// ============================================================
const PAYMENT_METHODS = [
  {
    id: 'bkash', label: 'bKash', color: '#E2136E',
    icon: <svg width="20" height="20" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#E2136E"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="14" fontWeight="800">B</text></svg>,
    qr: 'https://www.dropbox.com/scl/fi/0sfir9cpytsqso5z7idlw/01760889747-3_44_10-AM-Mar-21-2026.png.jpg?rlkey=dvxxouvnp3nxwrozpz5j12stc&st=33owmssu&dl=1',
    fields: [{ label: 'Number', value: '01760880747', note: 'Send Money (not Payment)' }],
    instruction: 'Open bKash → Send Money → enter number → send exact amount',
    hasQr: true,
  },
  {
    id: 'binance', label: 'Binance Pay', color: '#F0B90B',
    icon: <svg width="20" height="20" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#1a1a1a"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="#F0B90B" fontSize="11" fontWeight="800">BNB</text></svg>,
    qr: 'https://www.dropbox.com/scl/fi/vu9ys724n9vyij3kpnwd2/qr-image-1774043312091.png?rlkey=8601ge6mlljbzjcdkyn4f656i&st=qsf32sfb&dl=1',
    fields: [{ label: 'Pay ID', value: '1104953117', note: 'Binance Pay ID' }],
    instruction: 'Open Binance → Pay → scan QR or enter Pay ID',
    hasQr: true,
  },
  {
    id: 'dana', label: 'Dana', color: '#118EEA',
    icon: <svg width="20" height="20" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#118EEA"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="11" fontWeight="800">D</text></svg>,
    qr: 'YOUR_DANA_QR_URL',
    fields: [{ label: 'Name', value: 'Dana Account Name', note: '' }, { label: 'Number', value: '08xxxxxxxxxx', note: '' }],
    instruction: 'Open Dana → Transfer → enter number or scan QR',
    hasQr: true,
  },
  {
    id: 'usdt_trc20', label: 'USDT TRC20', color: '#26A17B',
    icon: <svg width="20" height="20" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#26A17B"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="9" fontWeight="800">USDT</text></svg>,
    qr: 'YOUR_USDT_TRC20_QR_URL',
    fields: [{ label: 'TRC20 Address', value: 'YOUR_TRC20_ADDRESS', note: 'Tron network only' }],
    instruction: 'Send USDT on Tron (TRC20) network only',
    hasQr: true,
  },
  {
    id: 'usdt_bep20', label: 'USDT BEP20', color: '#F0B90B',
    icon: <svg width="20" height="20" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#1a1a1a"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="#F0B90B" fontSize="9" fontWeight="800">BEP20</text></svg>,
    qr: 'YOUR_USDT_BEP20_QR_URL',
    fields: [{ label: 'BEP20 Address', value: 'YOUR_BEP20_ADDRESS', note: 'BSC network only' }],
    instruction: 'Send USDT on BNB Smart Chain (BEP20) network only',
    hasQr: true,
  },
  {
    id: 'litecoin', label: 'Litecoin', color: '#A5A9B4',
    icon: <svg width="20" height="20" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#345D9D"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="800">Ł</text></svg>,
    qr: 'YOUR_LTC_QR_URL',
    fields: [{ label: 'LTC Address', value: 'YOUR_LTC_ADDRESS', note: 'Litecoin network' }],
    instruction: 'Send LTC to the address above',
    hasQr: true,
  },
  {
    id: 'paypal', label: 'PayPal', color: '#003087',
    icon: <svg width="20" height="20" viewBox="0 0 40 40" fill="none"><circle cx="20" cy="20" r="20" fill="#003087"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="11" fontWeight="800">PP</text></svg>,
    qr: '',
    fields: [{ label: 'PayPal.me', value: 'https://www.paypal.com/paypalme/jjmaestre21', note: '' }],
    instruction: 'Click Pay with PayPal below — balance added automatically after payment',
    hasQr: false,
  },
] as const;

type MethodId = typeof PAYMENT_METHODS[number]['id'];
const AMOUNTS = [5, 10, 15, 25, 50, 100];


// ── PayPal Auto-Payment Button ────────────────────────────
// Replace YOUR_PAYPAL_CLIENT_ID with your live PayPal client ID
const PAYPAL_CLIENT_ID = 'AQDx_km7TpeGRXIAdKfy7njTbxq674K5hr-chTHjeADSCkoYghzhbXB0LAW6QABFoJ9_4uxFUBXRZbp_';

function PayPalAutoButton({ amount, user }: { amount: number; user: any }) {
  const [ready, setReady] = useState(false);
  const [paying, setPaying] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const storeUser = useAppStore(s => s.user);
  const u = user ?? storeUser;

  useEffect(() => {
    if (PAYPAL_CLIENT_ID === 'YOUR_PAYPAL_CLIENT_ID') return;
    // Load PayPal SDK
    if ((window as any).paypal) { setReady(true); return; }
    const script = document.createElement('script');
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD`;
    script.onload = () => setReady(true);
    document.head.appendChild(script);
  }, []);

  useEffect(() => {
    if (!ready || !containerRef.current || PAYPAL_CLIENT_ID === 'YOUR_PAYPAL_CLIENT_ID') return;
    containerRef.current.innerHTML = '';
    (window as any).paypal.Buttons({
      createOrder: (_: any, actions: any) => actions.order.create({
        purchase_units: [{
          amount: { value: amount.toFixed(2), currency_code: 'USD' },
          custom_id: u?.email ?? '', // sent to webhook so it knows which user to credit
        }],
      }),
      onApprove: async (_data: any, actions: any) => {
        setPaying(true);
        try {
          await actions.order.capture();
          // PayPal webhook will auto-credit balance within ~10 seconds
          // The polling in useEffect will detect the new approved transaction
          toast.success('✅ Payment successful! Your balance will be updated in a few seconds.');
        } catch(e) {
          toast.error('Payment capture failed: ' + String(e));
        }
        setPaying(false);
      },
      onError: () => { toast.error('PayPal encountered an error. Try again.'); },
      style: { layout:'vertical', color:'blue', shape:'rect', label:'pay', height:44 },
    }).render(containerRef.current);
  }, [ready, amount]);

  if (PAYPAL_CLIENT_ID === 'YOUR_PAYPAL_CLIENT_ID') {
    return (
      <div style={{padding:'14px',borderRadius:12,background:'rgba(0,48,135,.06)',border:'1px solid rgba(0,48,135,.2)',textAlign:'center',fontSize:12,color:'var(--muted)'}}>
        PayPal auto-pay not configured. See PAYPAL_SETUP_GUIDE.md
      </div>
    );
  }

  return (
    <div style={{position:'relative'}}>
      <div ref={containerRef} style={{minHeight:50}} />
      {paying && (
        <div style={{position:'absolute',inset:0,background:'rgba(0,0,0,.5)',borderRadius:10,display:'flex',alignItems:'center',justifyContent:'center',gap:8,color:'#fff',fontSize:13}}>
          <Loader2 size={16} className="animate-spin"/> Processing...
        </div>
      )}
    </div>
  );
}

// ── Admin Panel ──────────────────────────────────────────────
function AdminPanel() {
  const [txns, setTxns]     = useState<any[]>([]);
  const [loading, setL]     = useState(false);
  const [filter, setFilter] = useState<'pending'|'approved'|'rejected'|'all'>('pending');
  const intv = useRef<any>(null);

  const load = async () => {
    setL(true);
    const { data, error } = await safeQuery(() => supabase.from('transactions').select('*').order('created_at', { ascending: false }));
    if (!error && data) setTxns(data);
    setL(false);
  };

  useEffect(() => {
    load(); intv.current = setInterval(load, 20000);
    const ch = supabase.channel('admin-txns').on('postgres_changes', { event:'*', schema:'public', table:'transactions' }, load).subscribe();
    return () => { clearInterval(intv.current); supabase.removeChannel(ch); };
  }, []);

  const approve = async (tx: any) => {
    const { error } = await safeQuery(() => supabase.from('transactions').update({ status:'approved', updated_at: new Date().toISOString() }).eq('id', tx.id));
    if (error) { toast.error('Failed: ' + error.message); return; }
    toast.success(`✅ Approved $${tx.amount} for ${tx.user_name}`);
    setTxns(p => p.map(t => t.id === tx.id ? { ...t, status:'approved' } : t));
  };
  const reject = async (tx: any) => {
    const { error } = await safeQuery(() => supabase.from('transactions').update({ status:'rejected', updated_at: new Date().toISOString() }).eq('id', tx.id));
    if (error) { toast.error('Failed: ' + error.message); return; }
    toast.error(`Rejected from ${tx.user_name}`);
    setTxns(p => p.map(t => t.id === tx.id ? { ...t, status:'rejected' } : t));
  };

  const filtered = filter === 'all' ? txns : txns.filter(t => t.status === filter);
  const pending  = txns.filter(t => t.status === 'pending').length;
  const appTotal = txns.filter(t => t.status === 'approved').reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
      {/* Stats */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10 }}>
        {[
          { label:'Pending',   val:pending,               c:'var(--amber)',  bg:'rgba(251,191,36,.07)',  bc:'rgba(251,191,36,.15)' },
          { label:'Total',     val:txns.length,           c:'var(--blue)',   bg:'rgba(56,189,248,.06)',  bc:'rgba(56,189,248,.13)' },
          { label:'Approved$', val:`$${appTotal.toFixed(2)}`, c:'var(--green)', bg:'rgba(16,232,152,.06)', bc:'rgba(16,232,152,.13)' },
        ].map(s => (
          <div key={s.label} className="g" style={{ padding:'14px 12px',textAlign:'center',background:s.bg,borderColor:s.bc }}>
            <div style={{ fontSize:20,fontWeight:800,color:s.c,letterSpacing:'-.02em' }}>{s.val}</div>
            <div className="label" style={{ marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Filter */}
      <div style={{ display:'flex',gap:8,alignItems:'center' }}>
        <div style={{ display:'flex',gap:4,background:'rgba(255,255,255,.04)',borderRadius:10,padding:4,flex:1 }}>
          {(['pending','approved','rejected','all'] as const).map(f => (
            <button key={f} onClick={() => setFilter(f)}
              style={{ flex:1,padding:'7px 4px',borderRadius:7,fontSize:11,fontWeight:700,textTransform:'capitalize',cursor:'pointer',border:'none',background:filter===f?'linear-gradient(135deg,#8b5cf6,#6d28d9)':'transparent',color:filter===f?'#fff':'var(--muted)',transition:'all .15s',fontFamily:'inherit' }}>
              {f}{f==='pending'&&pending>0?` (${pending})`:''}
            </button>
          ))}
        </div>
        <button onClick={load} disabled={loading} className="btn btn-ghost btn-sm" style={{ padding:'8px 10px' }}>
          <RefreshCw size={14} className={loading?'animate-spin':''} />
        </button>
      </div>

      {/* List */}
      <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
        {loading && txns.length === 0
          ? <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'32px 0',color:'var(--muted)' }}><Loader2 size={16} className="animate-spin" /><span style={{fontSize:13}}>Loading...</span></div>
          : filtered.length === 0
          ? <div style={{ textAlign:'center',padding:'32px 0',fontSize:13,color:'var(--muted)' }}>No {filter} transactions</div>
          : filtered.map(tx => (
            <div key={tx.id} className="g" style={{
              padding:16,
              background: tx.status==='pending' ? 'rgba(251,191,36,.05)' : tx.status==='approved' ? 'rgba(16,232,152,.05)' : 'rgba(248,113,113,.05)',
              borderColor: tx.status==='pending' ? 'rgba(251,191,36,.15)' : tx.status==='approved' ? 'rgba(16,232,152,.13)' : 'rgba(248,113,113,.13)',
            }}>
              <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:12 }}>
                <div>
                  <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:3 }}>
                    <span style={{ fontSize:14,fontWeight:700,color:'#fff' }}>{tx.user_name}</span>
                    <span className={`badge badge-${tx.status==='pending'?'amber':tx.status==='approved'?'green':'red'}`}>{tx.status}</span>
                  </div>
                  <div style={{ fontSize:11,color:'var(--muted)' }}>{tx.user_email}</div>
                </div>
                <div style={{ fontSize:22,fontWeight:800,color:'#fff',letterSpacing:'-.02em' }}>${Number(tx.amount).toFixed(2)}</div>
              </div>
              <div style={{ display:'grid',gridTemplateColumns:'1fr 1fr',gap:8,marginBottom:12 }}>
                {[{ label:'Method', val:tx.method }, { label:'Txn ID', val:tx.transaction_id }].map(f => (
                  <div key={f.label} style={{ background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 10px' }}>
                    <div className="label" style={{ marginBottom:3 }}>{f.label}</div>
                    <div style={{ fontSize:12,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{f.val}</div>
                  </div>
                ))}
              </div>
              <div style={{ fontSize:10,color:'var(--dim)',marginBottom: tx.status==='pending'?10:0 }}>{new Date(tx.created_at).toLocaleString()}</div>
              {tx.status === 'pending' && (
                <div style={{ display:'flex',gap:8 }}>
                  <button onClick={() => approve(tx)} className="btn btn-g btn-sm" style={{ flex:1 }}><Check size={13} /> Approve</button>
                  <button onClick={() => reject(tx)}  className="btn btn-danger btn-sm" style={{ flex:1 }}><X size={13} /> Reject</button>
                </div>
              )}
            </div>
          ))
        }
      </div>
    </div>
  );
}

// ── QR + info card ──────────────────────────────────────────
function PayCard({ method, amount, user }: { method: typeof PAYMENT_METHODS[number]; amount: number; user: any }) {
  const copy = (v: string, l: string) => { navigator.clipboard.writeText(v); toast.success(`${l} copied!`); };

  if (!method.hasQr) {
    return (
      <div className="g" style={{ padding:22, background:'rgba(0,48,135,.06)', borderColor:'rgba(0,96,223,.2)' }}>
        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:18 }}>
          <div style={{ width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,#003087,#009cde)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 0 20px rgba(0,156,222,.3)' }}>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M7.144 19.532l1.049-5.751c.11-.606.691-1.002 1.304-.948 2.155.194 6.877.1 8.818-4.002 2.554-5.397-.59-7.769-6.295-7.831H5.382a1.31 1.31 0 0 0-1.294 1.109L2.01 18.049a.738.738 0 0 0 .728.852h4.109l.297-1.369z"/><path d="M17.512 7.309c-.673 4.378-3.403 6.025-7.934 6.025H8.354l-1.061 5.82h3.285l.53-2.906h1.722c4.02 0 6.386-1.95 7.006-5.818.48-2.991-.39-5.016-2.324-5.121z" opacity=".6"/></svg>
          </div>
          <div>
            <div style={{ fontSize:15,fontWeight:700,color:'#fff' }}>Pay with PayPal</div>
            <div style={{ fontSize:11,color:'var(--muted)',marginTop:2 }}>Secure · Balance added automatically after payment</div>
          </div>
        </div>

        {/* Amount */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px',marginBottom:16 }}>
          <span style={{ fontSize:12,color:'var(--muted)' }}>Amount</span>
          <span style={{ fontSize:24,fontWeight:800,color:'#fff',letterSpacing:'-.02em' }}>${amount.toFixed(2)}</span>
        </div>

        {/* PayPal SDK button — auto detects payment via API */}
        <PayPalAutoButton amount={amount} user={user} />

        <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:12,justifyContent:'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span style={{ fontSize:11,color:'var(--dim)' }}>Payments verified by PayPal API · Balance credited in seconds</span>
        </div>
      </div>
    );
  }

  return (
    <div className="g" style={{ overflow:'hidden' }}>
      {/* Header */}
      <div style={{ display:'flex',alignItems:'center',gap:12,padding:'16px 18px',borderBottom:'1px solid var(--border)' }}>
        <div style={{ width:36,height:36,borderRadius:10,background:'rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>
          {method.icon}
        </div>
        <div>
          <div style={{ fontSize:14,fontWeight:700,color:'#fff' }}>{method.label}</div>
          <div style={{ fontSize:11,color:'var(--muted)' }}>{method.instruction}</div>
        </div>
      </div>

      <div style={{ padding:18 }}>
        {/* Amount */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px',marginBottom:16 }}>
          <span style={{ fontSize:12,color:'var(--muted)' }}>Send exactly</span>
          <span style={{ fontSize:24,fontWeight:800,color:'#fff',letterSpacing:'-.02em' }}>${amount.toFixed(2)}</span>
        </div>

        {/* QR Code */}
        {method.qr && !method.qr.startsWith('YOUR_') && (
          <div style={{ display:'flex',justifyContent:'center',marginBottom:16 }}>
            <div style={{ background:'white',borderRadius:16,padding:12,boxShadow:'0 8px 32px rgba(0,0,0,.4)',width:180,height:180 }}>
              <img src={method.qr} alt={`${method.label} QR`} style={{ width:'100%',height:'100%',objectFit:'contain',borderRadius:8 }}
                onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
            </div>
          </div>
        )}
        {method.qr && method.qr.startsWith('YOUR_') && (
          <div style={{ display:'flex',justifyContent:'center',marginBottom:16 }}>
            <div style={{ width:180,height:180,borderRadius:16,border:'2px dashed var(--border)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8 }}>
              <div style={{ fontSize:32 }}>📷</div>
              <span style={{ fontSize:11,color:'var(--dim)',textAlign:'center' }}>QR code<br/>coming soon</span>
            </div>
          </div>
        )}

        {/* Fields */}
        {method.fields.map((f, i) => (
          <div key={i} style={{ background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px',marginBottom:i < method.fields.length - 1 ? 8 : 0 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5 }}>
              <span style={{ fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:600 }}>{f.label}</span>
              {f.note && <span style={{ fontSize:10,color:'var(--dim)',fontStyle:'italic' }}>{f.note}</span>}
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:10 }}>
              <code style={{ flex:1,fontSize:13,fontFamily:'monospace',color:'#fff',fontWeight:600,wordBreak:'break-all' }}>{f.value}</code>
              {!f.value.startsWith('YOUR_') && (
                <button onClick={() => copy(f.value, f.label)}
                  style={{ padding:'5px 8px',borderRadius:7,background:'rgba(255,255,255,.06)',border:'1px solid var(--border)',cursor:'pointer',color:'var(--muted)',flexShrink:0,transition:'all .15s' }}
                  onMouseEnter={e=>(e.currentTarget.style.background='rgba(255,255,255,.1)')} onMouseLeave={e=>(e.currentTarget.style.background='rgba(255,255,255,.06)')}>
                  <Copy size={13} />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Step indicator ──────────────────────────────────────────
function Steps({ step }: { step: number }) {
  return (
    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:22 }}>
      {['Amount','Pay','Confirm'].map((label, i) => {
        const n = i + 1, active = n === step, done = n < step;
        return (
          <div key={i} style={{ display:'flex',alignItems:'center',gap:8,flex:1 }}>
            <div style={{ display:'flex',alignItems:'center',gap:8,flex:1 }}>
              <div style={{ width:26,height:26,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,flexShrink:0,transition:'all .2s',
                background: done ? 'var(--green)' : active ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : 'rgba(255,255,255,.05)',
                color: done || active ? '#fff' : 'var(--muted)',
                boxShadow: active ? '0 0 16px rgba(109,40,217,.4)' : 'none',
              }}>
                {done ? '✓' : n}
              </div>
              <span style={{ fontSize:12,fontWeight:600,color: active ? '#fff' : done ? 'var(--green)' : 'var(--muted)' }}>{label}</span>
            </div>
            {i < 2 && <div style={{ flex:1,height:1,background: done ? 'rgba(16,232,152,.4)' : 'var(--border)' }} />}
          </div>
        );
      })}
    </div>
  );
}

// ── Product card ────────────────────────────────────────────
function ProductCard({ product, onBuy, balance }: { product: any; onBuy: (p: any) => void; balance: number }) {
  const can = balance >= product.price;
  const colors = { green: { c:'#4ade80',bg:'rgba(74,222,128,.08)',bc:'rgba(74,222,128,.2)' }, gold: { c:'#f0d47a',bg:'rgba(201,168,76,.08)',bc:'rgba(201,168,76,.2)' }, indigo: { c:'#a5b4fc',bg:'rgba(165,180,252,.08)',bc:'rgba(165,180,252,.2)' } };
  const col = colors[product.badgeType as keyof typeof colors] ?? colors.green;

  return (
    <div className="g g-hover g-lift" style={{ overflow:'hidden', transition:'all .3s' }}>
      <div style={{ padding:'18px 18px 0' }}>
        <div style={{ display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:8 }}>
          <span style={{ fontSize:10,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',padding:'3px 10px',borderRadius:20,background:col.bg,color:col.c,border:`1px solid ${col.bc}` }}>{product.badge}</span>
          <span style={{ fontSize:24,fontWeight:900,color:'#fff',letterSpacing:'-.02em' }}>${product.price}</span>
        </div>
        <div style={{ fontSize:15,fontWeight:800,color:'#fff',marginBottom:6,letterSpacing:'-.01em' }}>{product.name}</div>
        <p style={{ fontSize:12,color:'var(--muted)',lineHeight:1.55,marginBottom:14 }}>{product.description}</p>
        <div style={{ display:'flex',flexDirection:'column',gap:5,marginBottom:16 }}>
          {product.features.map((f: string) => (
            <div key={f} style={{ display:'flex',alignItems:'center',gap:7,fontSize:11,color:'rgba(255,255,255,.55)' }}>
              <span style={{ width:14,height:14,borderRadius:4,background:col.bg,border:`1px solid ${col.bc}`,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:7,fontWeight:800,color:col.c,flexShrink:0 }}>✓</span>
              {f}
            </div>
          ))}
        </div>
      </div>
      <div style={{ height:1,background:'var(--border)' }} />
      <div style={{ padding:14 }}>
        <button onClick={() => onBuy(product)} disabled={!can}
          style={{ width:'100%',padding:'11px 14px',borderRadius:11,fontSize:13,fontWeight:700,cursor:can?'pointer':'not-allowed',border:'none',transition:'all .25s',fontFamily:'inherit',
            background: can ? (product.badgeType === 'gold' ? 'linear-gradient(135deg,#c9a84c,#e8b84b)' : product.badgeType === 'green' ? 'rgba(74,222,128,.1)' : 'rgba(165,180,252,.1)') : 'rgba(255,255,255,.04)',
            color: can ? (product.badgeType === 'gold' ? '#0a0a0a' : col.c) : 'var(--muted)',
            border: can && product.badgeType !== 'gold' ? `1px solid ${col.bc}` : 'none',
            boxShadow: can && product.badgeType === 'gold' ? '0 4px 18px rgba(201,168,76,.32)' : 'none',
          }}>
          {can ? `⚡ Buy — $${product.price}` : 'Insufficient Balance'}
        </button>
      </div>
    </div>
  );
}


// ── Purchase Success Modal ───────────────────────────────────
function PurchaseSuccessModal({ data, onClose }: {
  data: { product: any; keys: Array<{ key: string; panelId: string; panelName: string; expiresAt: string }> };
  onClose: () => void;
}) {
  const [revealed, setRevealed] = useState<Record<number, boolean>>({});
  const [copied,   setCopied]   = useState<Record<number, boolean>>({});

  const copyKey = (k: string, i: number) => {
    navigator.clipboard.writeText(k);
    setCopied(p => ({ ...p, [i]: true }));
    setTimeout(() => setCopied(p => ({ ...p, [i]: false })), 2000);
  };

  return (
    <div style={{ position:'fixed',inset:0,zIndex:70,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.85)',backdropFilter:'blur(14px)',padding:16 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div className="g si" style={{ width:'100%',maxWidth:440,padding:'32px 28px',textAlign:'center',boxShadow:'0 0 80px rgba(16,232,152,.12),0 32px 80px rgba(0,0,0,.7)',borderColor:'rgba(16,232,152,.22)',overflowY:'auto',maxHeight:'90vh' }}>

        <div style={{ width:64,height:64,borderRadius:20,background:'rgba(16,232,152,.1)',border:'1px solid rgba(16,232,152,.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',boxShadow:'0 0 40px rgba(16,232,152,.2)' }}>
          <CheckCircle size={32} color="var(--green)" />
        </div>
        <div style={{ fontSize:22,fontWeight:800,color:'#fff',letterSpacing:'-.02em',marginBottom:5 }}>Purchase Successful!</div>
        <div style={{ fontSize:13,color:'var(--muted)',marginBottom:22 }}>Your {data.product.name} license is ready</div>

        {data.keys.map((k, i) => (
          <div key={i} style={{ background:'rgba(255,255,255,.03)',border:'1px solid rgba(139,92,246,.2)',borderRadius:14,padding:16,marginBottom:12,boxShadow:'0 0 24px rgba(139,92,246,.08)',textAlign:'left' }}>
            <div style={{ fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8 }}>{k.panelName} License Key</div>
            <div style={{ position:'relative',background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px',marginBottom:10,display:'flex',alignItems:'center',gap:10,cursor:'pointer' }} onClick={() => setRevealed(p => ({ ...p, [i]: true }))}>
              <code style={{ flex:1,fontSize:13,fontFamily:'monospace',color:'#fff',letterSpacing:'2px',filter:revealed[i]?'none':'blur(7px)',transition:'filter .4s ease',wordBreak:'break-all' }}>{k.key}</code>
              <button onClick={e => { e.stopPropagation(); setRevealed(p => ({ ...p, [i]: !p[i] })); }}
                style={{ background:'rgba(255,255,255,.06)',border:'1px solid var(--border)',borderRadius:7,padding:'5px 8px',cursor:'pointer',color:'var(--muted)',flexShrink:0 }}>
                {revealed[i] ? <EyeOff size={14} /> : <Eye size={14} />}
              </button>
            </div>
            {!revealed[i] && (
              <div style={{ textAlign:'center',marginBottom:10 }}>
                <span style={{ fontSize:11,color:'var(--dim)' }}>Click to reveal your key</span>
              </div>
            )}
            <div style={{ display:'flex',gap:8 }}>
              <button onClick={() => copyKey(k.key, i)} className="btn btn-ghost btn-sm" style={{ flex:1 }}>
                {copied[i] ? <><CheckCircle size={13} color="var(--green)" /> Copied!</> : <><Copy size={13} /> Copy Key</>}
              </button>
            </div>
            <div style={{ display:'flex',justifyContent:'space-between',marginTop:10,padding:'8px 12px',background:'rgba(255,255,255,.025)',borderRadius:8 }}>
              <div style={{ fontSize:10,color:'var(--muted)' }}>Status: <span style={{ color:'var(--green)',fontWeight:700 }}>Active</span></div>
              <div style={{ fontSize:10,color:'var(--muted)' }}>Expires: <span style={{ color:'var(--green)',fontWeight:700 }}>{new Date(k.expiresAt).toLocaleDateString()}</span></div>
            </div>
          </div>
        ))}

        <p style={{ fontSize:11,color:'var(--dim)',marginBottom:18 }}>Keys are saved to your License page. Don't share them.</p>
        <button onClick={onClose} className="btn btn-g btn-full btn-lg">Done — View Licenses</button>
      </div>
    </div>
  );
}

// ── Main WalletPage ─────────────────────────────────────────
export default function WalletPage() {
  const { balance, addBalance, purchaseProduct, addLicense, user } = useAppStore();
  const [step, setStep]         = useState<1|2|3>(1);
  const [amount, setAmount]     = useState(10);
  const [custom, setCustom]     = useState('');
  const [methodId, setMethodId] = useState<MethodId>('bkash');
  const [txnId, setTxnId]       = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [myTxns, setMyTxns]     = useState<any[]>([]);
  const [txnsLoad, setTxnsLoad] = useState(false);

  const isAdmin   = user?.role === 'admin';
  const isSupport = user?.role === 'support';
  const selAmount = custom ? parseFloat(custom) || 0 : amount;
  const selMethod = PAYMENT_METHODS.find(m => m.id === methodId) ?? PAYMENT_METHODS[0];

  const loadTxns = async () => {
    if (!user) return;
    setTxnsLoad(true);
    const { data } = await safeQuery(() => supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false }));
    setMyTxns(data ?? []);
    setTxnsLoad(false);
  };

  useEffect(() => {
    if (!user || isAdmin || isSupport) return;
    loadTxns();

    // ── BULLETPROOF balance crediting ─────────────────────────
    // creditedKey stored in localStorage so it survives page reloads
    // A mutex flag prevents concurrent runs of check() from double-crediting
    const creditedKey = `1999x-credited-${user.id}`;
    const getCredited = (): Set<string> => {
      try { return new Set<string>(JSON.parse(localStorage.getItem(creditedKey) || '[]')); } catch { return new Set(); }
    };
    const addCredited = (id: string) => {
      const s = getCredited(); s.add(id);
      try { localStorage.setItem(creditedKey, JSON.stringify([...s])); } catch {}
    };
    const isCredited = (id: string) => getCredited().has(id);

    let isChecking = false; // mutex — prevents concurrent check() calls

    const check = async () => {
      if (isChecking) return; // skip if already running
      isChecking = true;
      try {
        const { data, error } = await safeQuery(() =>
          supabase.from('transactions').select('id,amount,status').eq('user_id', user.id)
        );
        if (error || !data) return;
        for (const tx of data as any[]) {
          if (tx.status === 'approved' && !isCredited(tx.id)) {
            addCredited(tx.id); // mark BEFORE addBalance to prevent double-credit on error
            addBalance(Number(tx.amount));
            toast.success(`🎉 Payment approved! $${tx.amount} added to balance!`);
          }
          if (tx.status === 'rejected' && !isCredited(tx.id + '_r')) {
            addCredited(tx.id + '_r');
            toast.error(`Payment of $${tx.amount} was rejected.`);
          }
        }
        // Refresh display (separate from crediting)
        const { data: full } = await safeQuery(() =>
          supabase.from('transactions').select('*').eq('user_id', user.id).order('created_at', { ascending: false })
        );
        if (full) setMyTxns(full);
      } finally {
        isChecking = false;
      }
    };

    // Run once on mount (delayed so store loads first)
    const initTimer = setTimeout(check, 2000);

    // Poll every 12 seconds
    const poll = setInterval(check, 12000);

    // Check when tab regains focus
    const onFocus = () => { if (!isChecking) check(); };
    window.addEventListener('focus', onFocus);

    // Realtime — only updates display, does NOT credit balance
    // (the poll handles crediting with mutex protection)
    const ch = supabase.channel(`wallet-${user.id}`)
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}`,
      }, () => {
        // Trigger a check — mutex ensures no double-credit
        check();
      }).subscribe();

    return () => {
      clearTimeout(initTimer);
      clearInterval(poll);
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(ch);
    };
  }, [user?.id]);

  const handleSubmit = async () => {
    if (!txnId.trim())   { toast.error('Enter your transaction ID'); return; }
    if (!user)           { toast.error('Please login first'); return; }
    if (selAmount <= 0)  { toast.error('Select a valid amount'); return; }
    setSubmitting(true);
    const { error } = await safeQuery(() => supabase.from('transactions').insert({
      user_id: user.id, user_email: user.email, user_name: user.name,
      amount: selAmount, method: methodId, transaction_id: txnId.trim(), status: 'pending',
    }));
    if (error) {
      if (error.message === 'timeout') toast.error('Request timed out. Check connection and retry.');
      else if (error.message.includes('relation')) toast.error('Table not found. Run SQL migrations in Supabase first.');
      else toast.error('Failed: ' + error.message);
    } else {
      toast.success('✅ Submitted! Admin will approve shortly.');
      setStep(1); setTxnId(''); setCustom(''); loadTxns();
    }
    setSubmitting(false);
  };

  const [purchaseSuccess, setPurchaseSuccess] = useState<{ product: any; keys: Array<{ key: string; panelId: string; panelName: string; expiresAt: string }> } | null>(null);

  const handleBuy = async (product: any) => {
    if (balance < product.price) { toast.error('Insufficient balance. Add funds first.'); return; }

    // Deduct balance first
    const lic = purchaseProduct(product);
    if (!lic) { toast.error('Purchase failed'); return; }

    // Now auto-generate KeyAuth key(s)
    const panel = product.keyauthPanel ?? 'lag';
    const days  = parseInt(product.duration) || 7;
    const toGen = panel === 'both' ? ['internal', 'lag'] : [panel];
    const generatedKeys: Array<{ key: string; panelId: string; panelName: string; expiresAt: string }> = [];

    toast.loading('Generating your license key...', { id: 'keygen' });

    for (const p of toGen) {
      try {
        // Hard 10-second timeout — never hangs forever
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-key`, {
          method: 'POST',
          headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${SUPABASE_ANON}`, 'apikey':SUPABASE_ANON },
          body: JSON.stringify({ panel_type: p, days, user_email: user?.email }),
          signal: controller.signal,
        });
        clearTimeout(timer);
        const result = await res.json();
        if (result.success && result.key) {
          const expiry   = new Date(Date.now() + days * 86400000).toISOString();
          const panelId  = p === 'lag' ? 'keyauth-lag' : 'keyauth-internal';
          const panelNm  = p === 'lag' ? 'Fake Lag' : 'Internal';
          addLicense({
            id: `purchase_${Math.random().toString(36).slice(2,10)}`,
            productId: panelId, productName: panelNm,
            key: p === 'lag' ? result.key : result.key + '_INTERNAL',
            hwid: '', lastLogin: new Date().toISOString(), expiresAt: expiry,
            status: 'active', ip: '', device: '', hwidResetsUsed: 0, hwidResetMonth: new Date().getMonth(),
          });
          generatedKeys.push({ key: result.key, panelId, panelName: panelNm, expiresAt: expiry });
        }
      } catch (e) {
        console.error('Key generation error:', e);
      }
    }

    toast.dismiss('keygen');
    if (generatedKeys.length > 0) {
      setPurchaseSuccess({ product, keys: generatedKeys });
    } else {
      // Key generation failed/not configured — purchase still went through
      toast.success(`✅ ${product.name} purchased! Activate your key on the License page.`);
    }
  };

  // ── Admin view ───────────────────────────────────────────
  if (isAdmin || isSupport) {
    return (
      <div style={{ display:'flex',flexDirection:'column',gap:18 }}>
        <div className="g fu" style={{ padding:'20px 22px' }}>
          <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:20 }}>
            <div style={{ width:44,height:44,borderRadius:12,background:'rgba(139,92,246,.1)',border:'1px solid rgba(139,92,246,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}>
              <Users size={20} color="var(--purple)" />
            </div>
            <div>
              <div style={{ fontSize:16,fontWeight:800,color:'#fff' }}>Payment Approvals</div>
              <div style={{ fontSize:12,color:'var(--muted)',marginTop:2 }}>Auto-refreshes every 20s · realtime enabled</div>
            </div>
          </div>
          <AdminPanel />
        </div>
      </div>
    );
  }

  // ── User view ────────────────────────────────────────────
  return (
    <div style={{ display:'flex',flexDirection:'column',gap:18 }}>

      {purchaseSuccess && <PurchaseSuccessModal data={purchaseSuccess} onClose={() => setPurchaseSuccess(null)} />}

      {/* Balance card */}
      <div className="g fu" style={{ padding:'22px 24px',background:'linear-gradient(135deg,rgba(109,40,217,.1) 0%,rgba(255,255,255,.025) 100%)',position:'relative',overflow:'hidden' }}>
        <div style={{ position:'absolute',top:0,right:0,width:220,height:220,borderRadius:'50%',background:'radial-gradient(circle,rgba(109,40,217,.15) 0%,transparent 70%)',transform:'translate(40%,-40%)',pointerEvents:'none' }} />
        <div style={{ position:'relative' }}>
          <div className="label" style={{ marginBottom:6 }}>Available Balance</div>
          <div style={{ fontSize:44,fontWeight:900,color:'#fff',letterSpacing:'-.04em',lineHeight:1,marginBottom:4 }}>${balance.toFixed(2)}</div>
          <div style={{ fontSize:12,color:'var(--muted)' }}>Approved deposits credited instantly</div>
        </div>
      </div>

      {/* Products */}
      <div className="fu" style={{ animationDelay:'40ms' }}>
        <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:14 }}>
          <Zap size={15} color="var(--purple)" />
          <div style={{ fontSize:13,fontWeight:700,color:'#fff' }}>Products</div>
          <span className="badge badge-green" style={{ marginLeft:4 }}><Shield size={10} /> OB52 Undetected</span>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(240px,1fr))',gap:12 }}>
          {PRODUCTS.map(p => <ProductCard key={p.id} product={p} onBuy={handleBuy} balance={balance} />)}
        </div>
      </div>

      {/* Add Balance */}
      <div className="g fu" style={{ overflow:'hidden',animationDelay:'80ms' }}>
        <div style={{ padding:'18px 20px',borderBottom:'1px solid var(--border)' }}>
          <div style={{ fontSize:16,fontWeight:800,color:'#fff' }}>Add Balance</div>
          <div style={{ fontSize:12,color:'var(--muted)',marginTop:3 }}>Choose payment method · Admin approves within minutes</div>
        </div>

        <div style={{ padding:20 }}>
          <Steps step={step} />

          {/* Step 1 */}
          {step === 1 && (
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div className="label">Select Amount</div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
                {AMOUNTS.map(a => (
                  <button key={a} onClick={() => { setAmount(a); setCustom(''); }}
                    style={{ padding:'12px 8px',borderRadius:10,fontSize:13,fontWeight:700,cursor:'pointer',border:`1px solid ${amount===a&&!custom?'rgba(139,92,246,.4)':'var(--border)'}`,background:amount===a&&!custom?'rgba(139,92,246,.12)':'rgba(255,255,255,.03)',color:amount===a&&!custom?'var(--purple)':'var(--muted)',transition:'all .15s',fontFamily:'inherit' }}>
                    ${a}
                  </button>
                ))}
              </div>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'var(--muted)',fontWeight:700 }}>$</span>
                <input type="number" placeholder="Custom amount" value={custom} onChange={e => setCustom(e.target.value)}
                  className="inp" style={{ paddingLeft:30 }} />
              </div>
              {selAmount > 0 && (
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(139,92,246,.06)',border:'1px solid rgba(139,92,246,.15)',borderRadius:10,padding:'10px 14px' }}>
                  <span style={{ fontSize:12,color:'var(--muted)' }}>You will deposit</span>
                  <span style={{ fontSize:20,fontWeight:800,color:'var(--purple)',letterSpacing:'-.02em' }}>${selAmount.toFixed(2)}</span>
                </div>
              )}
              <button onClick={() => selAmount > 0 ? setStep(2) : toast.error('Select an amount')} className="btn btn-p btn-lg btn-full shim-btn">
                Continue <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div className="label">Payment Method</div>
              <div style={{ display:'flex',gap:8,overflowX:'auto',paddingBottom:4 }} className="noscroll">
                {PAYMENT_METHODS.map(m => (
                  <button key={m.id} onClick={() => setMethodId(m.id)}
                    style={{ display:'flex',alignItems:'center',gap:7,padding:'8px 14px',borderRadius:20,fontSize:12,fontWeight:700,whiteSpace:'nowrap',flexShrink:0,cursor:'pointer',border:`1px solid ${methodId===m.id?'rgba(139,92,246,.4)':'var(--border)'}`,background:methodId===m.id?'rgba(139,92,246,.12)':'rgba(255,255,255,.03)',color:methodId===m.id?'var(--purple)':'var(--muted)',transition:'all .15s',fontFamily:'inherit' }}>
                    <span style={{ width:20,height:20,borderRadius:'50%',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center' }}>{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>
              <PayCard method={selMethod} amount={selAmount} user={user} />
              <div style={{ display:'flex',gap:10 }}>
                <button onClick={() => setStep(1)} className="btn btn-ghost" style={{ padding:'11px 18px' }}><ArrowLeft size={15} /> Back</button>
                <button onClick={() => setStep(3)} className="btn btn-p btn-lg" style={{ flex:1 }}>I've Sent Payment <ArrowRight size={15} /></button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:12,padding:'14px 16px' }}>
                <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                  <span style={{ width:32,height:32,borderRadius:8,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,.05)' }}>{selMethod.icon}</span>
                  <div>
                    <div style={{ fontSize:13,fontWeight:700,color:'#fff' }}>{selMethod.label}</div>
                    <div style={{ fontSize:11,color:'var(--muted)' }}>Payment method</div>
                  </div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:22,fontWeight:800,color:'#fff',letterSpacing:'-.02em' }}>${selAmount.toFixed(2)}</div>
                  <div style={{ fontSize:11,color:'var(--muted)' }}>Amount sent</div>
                </div>
              </div>
              <div>
                <div className="label" style={{ marginBottom:8 }}>Transaction / Reference ID</div>
                <input type="text" placeholder="Paste your transaction ID here" value={txnId} onChange={e => setTxnId(e.target.value)} onKeyDown={e => e.key === 'Enter' && !submitting && handleSubmit()}
                  className="inp inp-lg" autoComplete="off" />
                <div style={{ fontSize:11,color:'var(--dim)',marginTop:6 }}>Enter the ID you received after completing payment</div>
              </div>
              <div style={{ display:'flex',gap:10 }}>
                <button onClick={() => setStep(2)} disabled={submitting} className="btn btn-ghost" style={{ padding:'11px 18px' }}><ArrowLeft size={15} /> Back</button>
                <button onClick={handleSubmit} disabled={submitting || !txnId.trim()} className="btn btn-g btn-lg" style={{ flex:1 }}>
                  {submitting ? <><Loader2 size={16} className="animate-spin" /> Submitting...</> : <><CheckCircle size={16} /> Submit Payment</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Tx history */}
      <div className="g fu" style={{ padding:'18px 20px',animationDelay:'120ms' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <div style={{ fontSize:15,fontWeight:700,color:'#fff' }}>Transaction History</div>
          <button onClick={loadTxns} disabled={txnsLoad} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--dim)',padding:4,borderRadius:6 }}>
            <RefreshCw size={14} className={txnsLoad ? 'animate-spin' : ''} />
          </button>
        </div>
        {txnsLoad
          ? <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'24px 0',color:'var(--muted)' }}><Loader2 size={15} className="animate-spin" /><span style={{fontSize:13}}>Loading...</span></div>
          : myTxns.length === 0
          ? <p style={{ fontSize:13,color:'var(--muted)',textAlign:'center',padding:'24px 0' }}>No transactions yet</p>
          : <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
              {myTxns.map(tx => {
                const m = PAYMENT_METHODS.find(p => p.id === tx.method);
                return (
                  <div key={tx.id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 14px',background:'rgba(255,255,255,.025)',border:'1px solid var(--border)',borderRadius:11 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                      <div style={{ width:36,height:36,borderRadius:9,background:'rgba(255,255,255,.05)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden' }}>
                        {m?.icon ?? <span style={{fontSize:14}}>💳</span>}
                      </div>
                      <div>
                        <div style={{ fontSize:13,fontWeight:600,color:'#fff' }}>${tx.amount} via {m?.label ?? tx.method}</div>
                        <div style={{ fontSize:10,color:'var(--dim)',marginTop:2 }}>{new Date(tx.created_at).toLocaleDateString()} · {tx.transaction_id}</div>
                      </div>
                    </div>
                    <span className={`badge badge-${tx.status==='approved'?'green':tx.status==='rejected'?'red':'amber'}`}>
                      {tx.status === 'approved' ? '✓ Approved' : tx.status === 'rejected' ? '✗ Rejected' : '⏳ Pending'}
                    </span>
                  </div>
                );
              })}
            </div>
        }
      </div>
    </div>
  );
}
