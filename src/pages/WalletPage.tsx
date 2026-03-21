import { useState, useEffect, useRef } from 'react';
import { useAppStore, PRODUCTS } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { ArrowRight, ArrowLeft, RefreshCw, Users, Check, X, Copy, CheckCircle, Loader2, Eye, EyeOff } from 'lucide-react';
import { safeQuery } from '@/lib/safeFetch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const SUPABASE_URL  = 'https://wkjqrjafogufqeasfeev.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok';

// ✏️ EDIT PAYMENT DETAILS
const PAYMENT_METHODS = [
  { id:'bkash',     label:'bKash',      color:'#E2136E', instruction:'Open bKash → Send Money → enter number', hasQr:true,  qr:'https://www.dropbox.com/scl/fi/0sfir9cpytsqso5z7idlw/01760889747-3_44_10-AM-Mar-21-2026.png.jpg?rlkey=dvxxouvnp3nxwrozpz5j12stc&st=33owmssu&dl=1', fields:[{ label:'Number', value:'01760880747', note:'Send Money (not Payment)' }],
    icon:<svg width="20" height="20" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#E2136E"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="14" fontWeight="800">B</text></svg> },
  { id:'binance',   label:'Binance Pay', color:'#F0B90B', instruction:'Open Binance → Pay → scan QR or enter Pay ID', hasQr:true, qr:'https://www.dropbox.com/scl/fi/vu9ys724n9vyij3kpnwd2/qr-image-1774043312091.png?rlkey=8601ge6mlljbzjcdkyn4f656i&st=qsf32sfb&dl=1', fields:[{ label:'Pay ID', value:'1104953117', note:'Binance Pay ID' }],
    icon:<svg width="20" height="20" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#1a1a1a"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="#F0B90B" fontSize="11" fontWeight="800">BNB</text></svg> },
  { id:'dana',      label:'Dana',        color:'#118EEA', instruction:'Open Dana → Transfer → enter number or scan QR', hasQr:true, qr:'YOUR_DANA_QR_URL', fields:[{ label:'Name', value:'Dana Account Name', note:'' },{ label:'Number', value:'08xxxxxxxxxx', note:'' }],
    icon:<svg width="20" height="20" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#118EEA"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="14" fontWeight="800">D</text></svg> },
  { id:'usdt_trc20',label:'USDT TRC20',  color:'#26A17B', instruction:'Send USDT on Tron (TRC20) network only', hasQr:true, qr:'YOUR_USDT_TRC20_QR_URL', fields:[{ label:'TRC20 Address', value:'YOUR_TRC20_ADDRESS', note:'Tron network only' }],
    icon:<svg width="20" height="20" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#26A17B"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="9" fontWeight="800">USDT</text></svg> },
  { id:'usdt_bep20',label:'USDT BEP20',  color:'#F0B90B', instruction:'Send USDT on BNB Smart Chain (BEP20) only', hasQr:true, qr:'YOUR_USDT_BEP20_QR_URL', fields:[{ label:'BEP20 Address', value:'YOUR_BEP20_ADDRESS', note:'BSC network only' }],
    icon:<svg width="20" height="20" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#1a1a1a"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="#F0B90B" fontSize="9" fontWeight="800">BEP</text></svg> },
  { id:'litecoin',  label:'Litecoin',    color:'#A5A9B4', instruction:'Send LTC to the address above', hasQr:true, qr:'YOUR_LTC_QR_URL', fields:[{ label:'LTC Address', value:'YOUR_LTC_ADDRESS', note:'Litecoin network' }],
    icon:<svg width="20" height="20" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#345D9D"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="800">Ł</text></svg> },
  { id:'paypal',    label:'PayPal',      color:'#003087', instruction:'Pay with PayPal — balance added automatically', hasQr:false, qr:'', fields:[{ label:'PayPal', value:'https://paypal.me/JohanMaestre', note:'' }],
    icon:<svg width="20" height="20" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#003087"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="10" fontWeight="800">PP</text></svg> },
] as const;

type MethodId = typeof PAYMENT_METHODS[number]['id'];
const AMOUNTS = [5, 10, 15, 25, 50, 100];
const PAYPAL_CLIENT_ID = 'AQDx_km7TpeGRXIAdKfy7njTbxq674K5hr-chTHjeADSCkoYghzhbXB0LAW6QABFoJ9_4uxFUBXRZbp_';

// ── PayPal Direct Pay Button ─────────────────────────────────
// Uses PayPal.me direct link — 100% reliable, no SDK needed
// After paying, user submits transaction ID manually OR
// the paypal-webhook auto-credits via API
function PayPalButton({ amount, user }: { amount: number; user: any }) {
  const storeUser = useAppStore(s => s.user);
  const u         = user ?? storeUser;
  const [clicked, setClicked] = useState(false);

  // Build PayPal.me link with amount
  const paypalLink = `https://www.paypal.com/paypalme/JohanMaestre/${amount.toFixed(2)}USD`;

  const handleClick = () => {
    setClicked(true);
    window.open(paypalLink, '_blank', 'noopener,noreferrer');
    // Reset after 8s so button is clickable again
    setTimeout(() => setClicked(false), 8000);
  };

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
      {/* Main PayPal button */}
      <button onClick={handleClick}
        style={{ width:'100%',padding:'15px 20px',borderRadius:12,border:'none',cursor:'pointer',fontFamily:'inherit',fontWeight:800,fontSize:15,display:'flex',alignItems:'center',justifyContent:'center',gap:10,transition:'all .2s',
          background:'linear-gradient(135deg,#0070ba,#1546a0)',
          color:'#fff',
          boxShadow:'0 4px 20px rgba(0,112,186,.4)',
        }}
        onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.transform='translateY(-2px)';(e.currentTarget as HTMLButtonElement).style.boxShadow='0 8px 28px rgba(0,112,186,.5)';}}
        onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.transform='none';(e.currentTarget as HTMLButtonElement).style.boxShadow='0 4px 20px rgba(0,112,186,.4)';}}>
        {/* PayPal logo SVG */}
        <svg width="20" height="20" viewBox="0 0 24 24" fill="white">
          <path d="M7.144 19.532l1.049-5.751c.11-.606.691-1.002 1.304-.948 2.155.194 6.877.1 8.818-4.002 2.554-5.397-.59-7.769-6.295-7.831H5.382a1.31 1.31 0 0 0-1.294 1.109L2.01 18.049a.738.738 0 0 0 .728.852h4.109l.297-1.369z"/>
          <path d="M17.512 7.309c-.673 4.378-3.403 6.025-7.934 6.025H8.354l-1.061 5.82h3.285l.53-2.906h1.722c4.02 0 6.386-1.95 7.006-5.818.48-2.991-.39-5.016-2.324-5.121z" opacity=".7"/>
        </svg>
        Pay ${amount.toFixed(2)} with PayPal
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
      </button>

      {/* After clicked — show instruction */}
      {clicked && (
        <div style={{ padding:'14px 16px',borderRadius:12,background:'rgba(251,191,36,.07)',border:'1px solid rgba(251,191,36,.2)',display:'flex',gap:12,alignItems:'flex-start' }}>
          <div style={{ width:32,height:32,borderRadius:9,background:'rgba(251,191,36,.15)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,fontSize:16 }}>📋</div>
          <div>
            <div style={{ fontSize:12,fontWeight:800,color:'var(--amber)',marginBottom:5 }}>PayPal opened — complete these steps:</div>
            <div style={{ display:'flex',flexDirection:'column',gap:4 }}>
              {[
                "1. Log in to PayPal and complete the payment",
                "2. Copy the Transaction ID from PayPal receipt",
                "3. Come back here and click I've Sent Payment",
                "4. Paste the Transaction ID and Submit"
              ].map((step,i) => (
                <div key={i} style={{ fontSize:11,color:'var(--muted)',display:'flex',gap:7,alignItems:'flex-start' }}>
                  <span style={{ color:'var(--green)',fontWeight:700,flexShrink:0 }}>✓</span>{step}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Admin Panel ──────────────────────────────────────────────
function AdminPanel() {
  const [txns,setTxns] = useState<any[]>([]);
  const [loading,setL] = useState(false);
  const [filter,setFilter] = useState<'pending'|'approved'|'rejected'|'all'>('pending');
  const intv = useRef<any>(null);
  const load = async () => {
    setL(true);
    const { data, error } = await safeQuery(() => supabase.from('transactions').select('*').order('created_at',{ ascending:false }));
    if (!error && data) setTxns(data);
    setL(false);
  };
  useEffect(() => {
    load(); intv.current = setInterval(load, 20000);
    const ch = supabase.channel('admin-txns').on('postgres_changes',{ event:'*', schema:'public', table:'transactions' },load).subscribe();
    return () => { clearInterval(intv.current); supabase.removeChannel(ch); };
  },[]);
  const approve = async (tx: any) => {
    const { error } = await safeQuery(() => supabase.from('transactions').update({ status:'approved', updated_at:new Date().toISOString() }).eq('id',tx.id));
    if (error) { toast.error('Failed: '+error.message); return; }
    toast.success(`✅ Approved $${tx.amount} for ${tx.user_name}`);
    setTxns(p => p.map(t => t.id===tx.id ? {...t,status:'approved'} : t));
  };
  const reject = async (tx: any) => {
    const { error } = await safeQuery(() => supabase.from('transactions').update({ status:'rejected', updated_at:new Date().toISOString() }).eq('id',tx.id));
    if (error) { toast.error('Failed: '+error.message); return; }
    setTxns(p => p.map(t => t.id===tx.id ? {...t,status:'rejected'} : t));
  };
  const filtered = filter==='all' ? txns : txns.filter(t=>t.status===filter);
  const pending  = txns.filter(t=>t.status==='pending').length;
  const appTotal = txns.filter(t=>t.status==='approved').reduce((s,t)=>s+Number(t.amount),0);
  return (
    <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10 }}>
        {[{label:'Pending',val:pending,c:'var(--amber)',bg:'rgba(251,191,36,.07)',bc:'rgba(251,191,36,.15)'},{label:'Total',val:txns.length,c:'var(--blue)',bg:'rgba(56,189,248,.06)',bc:'rgba(56,189,248,.13)'},{label:'Approved $',val:`$${appTotal.toFixed(2)}`,c:'var(--green)',bg:'rgba(16,232,152,.06)',bc:'rgba(16,232,152,.13)'}].map(s=>(
          <div key={s.label} className="g" style={{ padding:'14px 12px',textAlign:'center',background:s.bg,borderColor:s.bc }}>
            <div style={{ fontSize:20,fontWeight:800,color:s.c,letterSpacing:'-.02em' }}>{s.val}</div>
            <div className="label" style={{ marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex',gap:8,alignItems:'center' }}>
        <div style={{ display:'flex',gap:4,background:'rgba(255,255,255,.04)',borderRadius:10,padding:4,flex:1 }}>
          {(['pending','approved','rejected','all'] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{ flex:1,padding:'7px 4px',borderRadius:7,fontSize:11,fontWeight:700,textTransform:'capitalize',cursor:'pointer',border:'none',background:filter===f?'linear-gradient(135deg,#8b5cf6,#6d28d9)':'transparent',color:filter===f?'#fff':'var(--muted)',fontFamily:'inherit' }}>
              {f}{f==='pending'&&pending>0?` (${pending})`:''}
            </button>
          ))}
        </div>
        <button onClick={load} disabled={loading} className="btn btn-ghost btn-sm" style={{ padding:'8px 10px' }}><RefreshCw size={14} className={loading?'animate-spin':''}/></button>
      </div>
      <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
        {loading&&txns.length===0 ? <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'32px 0',color:'var(--muted)' }}><Loader2 size={16} className="animate-spin"/><span style={{fontSize:13}}>Loading...</span></div>
        : filtered.length===0 ? <div style={{ textAlign:'center',padding:'32px 0',fontSize:13,color:'var(--muted)' }}>No {filter} transactions</div>
        : filtered.map(tx=>(
          <div key={tx.id} className="g" style={{ padding:16,background:tx.status==='pending'?'rgba(251,191,36,.05)':tx.status==='approved'?'rgba(16,232,152,.05)':'rgba(248,113,113,.05)',borderColor:tx.status==='pending'?'rgba(251,191,36,.15)':tx.status==='approved'?'rgba(16,232,152,.13)':'rgba(248,113,113,.13)' }}>
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
              {[{label:'Method',val:tx.method},{label:'Txn ID',val:tx.transaction_id}].map(f=>(
                <div key={f.label} style={{ background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 10px' }}>
                  <div className="label" style={{ marginBottom:3 }}>{f.label}</div>
                  <div style={{ fontSize:12,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{f.val}</div>
                </div>
              ))}
            </div>
            <div style={{ fontSize:10,color:'var(--dim)',marginBottom:tx.status==='pending'?10:0 }}>{new Date(tx.created_at).toLocaleString()}</div>
            {tx.status==='pending'&&(
              <div style={{ display:'flex',gap:8 }}>
                <button onClick={()=>approve(tx)} className="btn btn-g btn-sm" style={{ flex:1 }}><Check size={13}/> Approve</button>
                <button onClick={()=>reject(tx)} className="btn btn-danger btn-sm" style={{ flex:1 }}><X size={13}/> Reject</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Payment method card ──────────────────────────────────────
function PayCard({ method, amount, user }: { method: typeof PAYMENT_METHODS[number]; amount: number; user: any }) {
  const copy = (v: string, l: string) => { navigator.clipboard.writeText(v); toast.success(`${l} copied!`); };
  if (!method.hasQr) return (
    <div style={{ background:'rgba(0,48,135,.07)',border:'1px solid rgba(0,96,223,.2)',borderRadius:16,overflow:'hidden' }}>
      <div style={{ display:'flex',alignItems:'center',gap:12,padding:'16px 18px',borderBottom:'1px solid rgba(255,255,255,.06)' }}>
        <div style={{ width:44,height:44,borderRadius:12,background:'linear-gradient(135deg,#003087,#009cde)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0,boxShadow:'0 0 20px rgba(0,156,222,.3)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="white"><path d="M7.144 19.532l1.049-5.751c.11-.606.691-1.002 1.304-.948 2.155.194 6.877.1 8.818-4.002 2.554-5.397-.59-7.769-6.295-7.831H5.382a1.31 1.31 0 0 0-1.294 1.109L2.01 18.049a.738.738 0 0 0 .728.852h4.109l.297-1.369z"/><path d="M17.512 7.309c-.673 4.378-3.403 6.025-7.934 6.025H8.354l-1.061 5.82h3.285l.53-2.906h1.722c4.02 0 6.386-1.95 7.006-5.818.48-2.991-.39-5.016-2.324-5.121z" opacity=".6"/></svg>
        </div>
        <div>
          <div style={{ fontSize:15,fontWeight:700,color:'#fff' }}>Pay with PayPal</div>
          <div style={{ fontSize:11,color:'var(--muted)',marginTop:2 }}>Secure · Balance added automatically</div>
        </div>
      </div>
      <div style={{ padding:18 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px',marginBottom:14 }}>
          <span style={{ fontSize:12,color:'var(--muted)' }}>Amount</span>
          <span style={{ fontSize:26,fontWeight:900,color:'#fff',letterSpacing:'-.03em' }}>${amount.toFixed(2)}</span>
        </div>
        <PayPalButton amount={amount} user={user} />
        <div style={{ display:'flex',alignItems:'center',gap:6,marginTop:10,justifyContent:'center' }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="var(--green)" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          <span style={{ fontSize:11,color:'var(--dim)' }}>Verified by PayPal API · Auto credited</span>
        </div>
      </div>
    </div>
  );
  return (
    <div style={{ background:'rgba(255,255,255,.025)',border:'1px solid var(--border)',borderRadius:16,overflow:'hidden' }}>
      <div style={{ display:'flex',alignItems:'center',gap:12,padding:'14px 18px',borderBottom:'1px solid var(--border)' }}>
        <div style={{ width:36,height:36,borderRadius:10,background:'rgba(255,255,255,.06)',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>{method.icon}</div>
        <div>
          <div style={{ fontSize:14,fontWeight:700,color:'#fff' }}>{method.label}</div>
          <div style={{ fontSize:11,color:'var(--muted)' }}>{method.instruction}</div>
        </div>
      </div>
      <div style={{ padding:18 }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 16px',marginBottom:14 }}>
          <span style={{ fontSize:12,color:'var(--muted)' }}>Send exactly</span>
          <span style={{ fontSize:26,fontWeight:900,color:'#fff',letterSpacing:'-.03em' }}>${amount.toFixed(2)}</span>
        </div>
        {method.qr && !method.qr.startsWith('YOUR_') && (
          <div style={{ display:'flex',justifyContent:'center',marginBottom:14 }}>
            <div style={{ background:'white',borderRadius:16,padding:12,boxShadow:'0 8px 32px rgba(0,0,0,.5)',width:180,height:180 }}>
              <img src={method.qr} alt="QR" style={{ width:'100%',height:'100%',objectFit:'contain',borderRadius:8 }} onError={e=>{(e.target as HTMLImageElement).style.display='none';}} />
            </div>
          </div>
        )}
        {method.qr && method.qr.startsWith('YOUR_') && (
          <div style={{ display:'flex',justifyContent:'center',marginBottom:14 }}>
            <div style={{ width:180,height:180,borderRadius:16,border:'2px dashed var(--border)',display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center',gap:8 }}>
              <div style={{ fontSize:32 }}>📷</div>
              <span style={{ fontSize:11,color:'var(--dim)',textAlign:'center' }}>QR coming soon</span>
            </div>
          </div>
        )}
        {method.fields.map((f,i) => (
          <div key={i} style={{ background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px',marginBottom:i<method.fields.length-1?8:0 }}>
            <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:5 }}>
              <span style={{ fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.08em',fontWeight:600 }}>{f.label}</span>
              {f.note && <span style={{ fontSize:10,color:'var(--dim)',fontStyle:'italic' }}>{f.note}</span>}
            </div>
            <div style={{ display:'flex',alignItems:'center',gap:10 }}>
              <code style={{ flex:1,fontSize:13,fontFamily:'monospace',color:'#fff',fontWeight:600,wordBreak:'break-all' }}>{f.value}</code>
              {!f.value.startsWith('YOUR_') && (
                <button onClick={()=>copy(f.value,f.label)} style={{ padding:'5px 8px',borderRadius:7,background:'rgba(255,255,255,.06)',border:'1px solid var(--border)',cursor:'pointer',color:'var(--muted)',flexShrink:0 }}>
                  <Copy size={13}/>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Steps ────────────────────────────────────────────────────
function Steps({ step }: { step: number }) {
  const labels = ['Amount','Pay','Confirm'];
  return (
    <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:24 }}>
      {labels.map((label,i) => {
        const n=i+1, active=n===step, done=n<step;
        return (
          <div key={i} style={{ display:'flex',alignItems:'center',gap:8,flex:1 }}>
            <div style={{ display:'flex',alignItems:'center',gap:7,flex:1 }}>
              <div style={{ width:27,height:27,borderRadius:'50%',display:'flex',alignItems:'center',justifyContent:'center',fontSize:11,fontWeight:800,flexShrink:0,background:done?'var(--green)':active?'linear-gradient(135deg,#8b5cf6,#6d28d9)':'rgba(255,255,255,.05)',color:done||active?'#fff':'var(--muted)',boxShadow:active?'0 0 16px rgba(109,40,217,.5)':'none',transition:'all .2s' }}>
                {done?'✓':n}
              </div>
              <span style={{ fontSize:12,fontWeight:600,color:active?'#fff':done?'var(--green)':'var(--muted)' }}>{label}</span>
            </div>
            {i<2&&<div style={{ flex:1,height:1,background:done?'rgba(16,232,152,.4)':'var(--border)' }}/>}
          </div>
        );
      })}
    </div>
  );
}

// ── Purchase Success Modal ───────────────────────────────────
function PurchaseSuccessModal({ data, onClose }: { data: { product: any; keys: Array<{ key: string; panelId: string; panelName: string; expiresAt: string }> }; onClose: () => void }) {
  const [revealed,setRevealed] = useState<Record<number,boolean>>({});
  const [copied,setCopied]     = useState<Record<number,boolean>>({});
  const copyKey = (k: string, i: number) => { navigator.clipboard.writeText(k); setCopied(p=>({...p,[i]:true})); setTimeout(()=>setCopied(p=>({...p,[i]:false})),2000); };
  return (
    <div style={{ position:'fixed',inset:0,zIndex:70,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.85)',backdropFilter:'blur(14px)',padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="g si" style={{ width:'100%',maxWidth:440,padding:'32px 28px',textAlign:'center',boxShadow:'0 0 80px rgba(16,232,152,.12),0 32px 80px rgba(0,0,0,.7)',borderColor:'rgba(16,232,152,.22)',overflowY:'auto',maxHeight:'90vh' }}>
        <div style={{ width:64,height:64,borderRadius:20,background:'rgba(16,232,152,.1)',border:'1px solid rgba(16,232,152,.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',boxShadow:'0 0 40px rgba(16,232,152,.2)' }}>
          <CheckCircle size={32} color="var(--green)"/>
        </div>
        <div style={{ fontSize:22,fontWeight:800,color:'#fff',marginBottom:5 }}>Purchase Successful!</div>
        <div style={{ fontSize:13,color:'var(--muted)',marginBottom:22 }}>Your {data.product.name} license is ready</div>
        {data.keys.map((k,i)=>(
          <div key={i} style={{ background:'rgba(255,255,255,.03)',border:'1px solid rgba(139,92,246,.2)',borderRadius:14,padding:16,marginBottom:12,textAlign:'left' }}>
            <div style={{ fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8 }}>{k.panelName} License Key</div>
            <div style={{ position:'relative',background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px',marginBottom:10,display:'flex',alignItems:'center',gap:10 }}>
              <code style={{ flex:1,fontSize:13,fontFamily:'monospace',color:'#fff',letterSpacing:'2px',filter:revealed[i]?'none':'blur(7px)',transition:'filter .4s',wordBreak:'break-all' }}>{k.key}</code>
              <button onClick={()=>setRevealed(p=>({...p,[i]:!p[i]}))} style={{ background:'rgba(255,255,255,.06)',border:'1px solid var(--border)',borderRadius:7,padding:'5px 8px',cursor:'pointer',color:'var(--muted)',flexShrink:0 }}>
                {revealed[i]?<EyeOff size={14}/>:<Eye size={14}/>}
              </button>
            </div>
            {!revealed[i]&&<div style={{ textAlign:'center',marginBottom:10 }}><span style={{ fontSize:11,color:'var(--dim)' }}>Click eye to reveal</span></div>}
            <button onClick={()=>copyKey(k.key,i)} className="btn btn-ghost btn-sm btn-full">
              {copied[i]?<><CheckCircle size={13} color="var(--green)"/> Copied!</>:<><Copy size={13}/> Copy Key</>}
            </button>
            <div style={{ display:'flex',justifyContent:'space-between',marginTop:10,padding:'8px 12px',background:'rgba(255,255,255,.025)',borderRadius:8 }}>
              <div style={{ fontSize:10,color:'var(--muted)' }}>Status: <span style={{ color:'var(--green)',fontWeight:700 }}>Active</span></div>
              <div style={{ fontSize:10,color:'var(--muted)' }}>Expires: <span style={{ color:'var(--green)',fontWeight:700 }}>{new Date(k.expiresAt).toLocaleDateString()}</span></div>
            </div>
          </div>
        ))}
        <p style={{ fontSize:11,color:'var(--dim)',marginBottom:18 }}>Keys saved to License page. Don't share them.</p>
        <button onClick={onClose} className="btn btn-g btn-full btn-lg">Done</button>
      </div>
    </div>
  );
}


// ── Confirm Purchase Modal ────────────────────────────────────
function ConfirmModal({ product, onConfirm, onCancel }: {
  product: { name: string; price: number; duration: string; emoji?: string };
  onConfirm: () => void;
  onCancel:  () => void;
}) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:80,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.82)',backdropFilter:'blur(14px)',padding:16 }}>
      <div className="g si" style={{ maxWidth:380,width:'100%',padding:'32px 28px',textAlign:'center',boxShadow:'0 0 80px rgba(139,92,246,.12),0 32px 80px rgba(0,0,0,.7)' }}>
        <div style={{ fontSize:40,marginBottom:16 }}>{product.emoji || '🛒'}</div>
        <div style={{ fontSize:20,fontWeight:800,color:'#fff',marginBottom:8 }}>Confirm Purchase</div>
        <div style={{ fontSize:13,color:'var(--muted)',marginBottom:24 }}>Please review your order before proceeding</div>

        <div style={{ background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:20,marginBottom:24,textAlign:'left' }}>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
            <span style={{ fontSize:13,color:'var(--muted)' }}>Product</span>
            <span style={{ fontSize:14,fontWeight:700,color:'#fff' }}>{product.name}</span>
          </div>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
            <span style={{ fontSize:13,color:'var(--muted)' }}>Duration</span>
            <span style={{ fontSize:14,fontWeight:700,color:'#fff' }}>{product.duration}</span>
          </div>
          <div style={{ height:1,background:'var(--border)',margin:'12px 0' }} />
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <span style={{ fontSize:14,fontWeight:700,color:'var(--muted)' }}>Total</span>
            <span style={{ fontSize:28,fontWeight:900,color:'#fff',letterSpacing:'-.03em' }}>${product.price}</span>
          </div>
        </div>

        <div style={{ display:'flex',gap:10 }}>
          <button onClick={onCancel} className="btn btn-ghost" style={{ flex:1 }}>Cancel</button>
          <button onClick={onConfirm} className="btn btn-p" style={{ flex:2,boxShadow:'0 0 24px rgba(109,40,217,.4)' }}>
            ✅ Confirm Purchase
          </button>
        </div>
        <p style={{ fontSize:11,color:'var(--dim)',marginTop:12 }}>Balance will be deducted immediately. Refunded if key generation fails.</p>
      </div>
    </div>
  );
}

// ── NEW: Product Section with panel grouping ──────────────────
const PANEL_GROUPS = [
  {
    id:    'internal',
    name:  'Internal Panel',
    desc:  'Advanced internal cheat features. Full control, maximum performance.',
    emoji: '⚡',
    color: '#4ade80',
    glow:  'rgba(74,222,128,.3)',
    bg:    'rgba(74,222,128,.06)',
    bc:    'rgba(74,222,128,.18)',
    features: ['Aimbot & ESP', 'Speed & No recoil', 'Auto updates', 'OB52 Undetected'],
    plans: [
      { id:'internal-3d',  label:'3 Days', price:3,  days:3,  keyauthPanel:'internal' as const },
      { id:'internal-7d',  label:'7 Days', price:7,  days:7,  keyauthPanel:'internal' as const },
      { id:'internal-30d', label:'30 Days',price:15, days:30, keyauthPanel:'internal' as const },
    ],
  },
  {
    id:    'combo',
    name:  'Combo Package',
    desc:  'Internal + Fake Lag together. The full 1999X experience at the best price.',
    emoji: '👑',
    color: '#f0d47a',
    glow:  'rgba(201,168,76,.3)',
    bg:    'rgba(201,168,76,.06)',
    bc:    'rgba(201,168,76,.25)',
    features: ['Everything in Internal', 'Everything in Fake Lag', 'Priority Support', 'Best price guaranteed'],
    plans: [
      { id:'combo-7d',  label:'Weekly',  price:10, days:7,  keyauthPanel:'both' as const },
      { id:'combo-30d', label:'Monthly', price:20, days:30, keyauthPanel:'both' as const },
    ],
    featured: true,
  },
  {
    id:    'lag',
    name:  'Fake Lag',
    desc:  'Network tool for lag-based advantages. Confuse enemies and dominate.',
    emoji: '🔷',
    color: '#a5b4fc',
    glow:  'rgba(165,180,252,.3)',
    bg:    'rgba(165,180,252,.06)',
    bc:    'rgba(165,180,252,.18)',
    features: ['Lag switch control', 'Packet manipulation', 'Adjustable delay', 'OB52 Undetected'],
    plans: [
      { id:'lag-7d',  label:'Weekly',  price:5,  days:7,  keyauthPanel:'lag' as const },
      { id:'lag-30d', label:'Monthly', price:10, days:30, keyauthPanel:'lag' as const },
    ],
  },
];

function PanelProductCard({ group, balance, onBuy }: { group: typeof PANEL_GROUPS[number]; balance: number; onBuy: (plan: any) => void }) {
  const [selectedPlan, setSelectedPlan] = useState(0);
  const plan = group.plans[selectedPlan];
  const can  = balance >= plan.price;

  return (
    <div style={{
      background: group.featured ? `linear-gradient(135deg, rgba(22,18,8,.95) 0%, rgba(30,22,4,.95) 100%)` : 'rgba(14,14,22,.85)',
      border: `1px solid ${group.bc}`,
      borderRadius: 22,
      overflow: 'hidden',
      position: 'relative',
      transition: 'transform .25s, box-shadow .25s',
      boxShadow: group.featured ? `0 0 60px ${group.glow}, 0 8px 32px rgba(0,0,0,.5)` : `0 0 30px rgba(0,0,0,.4)`,
    }}
    onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-4px)'; (e.currentTarget as HTMLDivElement).style.boxShadow = `0 0 80px ${group.glow}, 0 16px 40px rgba(0,0,0,.5)`; }}
    onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.transform = 'none'; (e.currentTarget as HTMLDivElement).style.boxShadow = group.featured ? `0 0 60px ${group.glow}, 0 8px 32px rgba(0,0,0,.5)` : `0 0 30px rgba(0,0,0,.4)`; }}>

      {/* Glow top bar */}
      <div style={{ height:3, background:`linear-gradient(90deg, transparent, ${group.color}, transparent)` }} />

      {/* Featured badge */}
      {group.featured && (
        <div style={{ position:'absolute',top:16,right:16,background:`linear-gradient(135deg,#c9a84c,#e8b84b)`,color:'#0a0a0a',fontSize:9,fontWeight:900,letterSpacing:'.12em',textTransform:'uppercase',padding:'4px 10px',borderRadius:20 }}>
          BEST VALUE
        </div>
      )}

      <div style={{ padding:'24px 22px' }}>
        {/* Header */}
        <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:16 }}>
          <div style={{ width:48,height:48,borderRadius:14,background:group.bg,border:`1px solid ${group.bc}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0,boxShadow:`0 0 20px ${group.glow}` }}>
            {group.emoji}
          </div>
          <div>
            <div style={{ fontSize:18,fontWeight:800,color:'#fff',letterSpacing:'-.01em' }}>{group.name}</div>
            <div style={{ fontSize:11,color:'var(--muted)',marginTop:2 }}>{group.desc}</div>
          </div>
        </div>

        {/* Features */}
        <div style={{ display:'flex',flexDirection:'column',gap:6,marginBottom:20 }}>
          {group.features.map(f => (
            <div key={f} style={{ display:'flex',alignItems:'center',gap:8,fontSize:12,color:'rgba(255,255,255,.6)' }}>
              <span style={{ width:16,height:16,borderRadius:5,background:group.bg,border:`1px solid ${group.bc}`,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:800,color:group.color,flexShrink:0 }}>✓</span>
              {f}
            </div>
          ))}
        </div>

        {/* Plan selector pills */}
        <div style={{ display:'flex',gap:6,marginBottom:18,flexWrap:'wrap' }}>
          {group.plans.map((p, i) => (
            <button key={p.id} onClick={() => setSelectedPlan(i)}
              style={{ padding:'7px 14px',borderRadius:20,fontSize:12,fontWeight:700,cursor:'pointer',border:`1px solid ${selectedPlan===i ? group.color : 'rgba(255,255,255,.1)'}`,background:selectedPlan===i ? group.bg : 'rgba(255,255,255,.03)',color:selectedPlan===i ? group.color : 'var(--muted)',transition:'all .15s',fontFamily:'inherit',boxShadow:selectedPlan===i ? `0 0 12px ${group.glow}` : 'none' }}>
              {p.label}
            </button>
          ))}
        </div>

        {/* Price + Buy */}
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,.04)',border:`1px solid ${group.bc}`,borderRadius:14,padding:'14px 18px',marginBottom:14 }}>
          <div>
            <div style={{ fontSize:11,color:'var(--muted)',marginBottom:2 }}>Selected plan</div>
            <div style={{ fontSize:13,fontWeight:700,color:group.color }}>{plan.label}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:32,fontWeight:900,color:'#fff',letterSpacing:'-.03em',lineHeight:1 }}>${plan.price}</div>
            <div style={{ fontSize:10,color:'var(--muted)',marginTop:2 }}>one time</div>
          </div>
        </div>

        <button onClick={() => onBuy({ ...plan, keyauthPanel: plan.keyauthPanel, duration: `${plan.days} days`, name: `${group.name} — ${plan.label}`, description: group.desc, badgeType: group.featured ? 'gold' : group.id === 'internal' ? 'green' : 'indigo', emoji: group.emoji })}
          disabled={!can}
          style={{ width:'100%',padding:'13px',borderRadius:12,fontSize:14,fontWeight:800,cursor:can?'pointer':'not-allowed',border:'none',transition:'all .2s',fontFamily:'inherit',letterSpacing:'-.01em',
            background: can ? (group.featured ? 'linear-gradient(135deg,#c9a84c,#e8b84b)' : group.bg) : 'rgba(255,255,255,.04)',
            color: can ? (group.featured ? '#0a0a0a' : group.color) : 'var(--muted)',
            border: can ? `1px solid ${group.bc}` : '1px solid rgba(255,255,255,.06)',
            boxShadow: can ? `0 0 24px ${group.glow}` : 'none',
          }}>
          {can ? `⚡ Buy ${plan.label} — $${plan.price}` : 'Insufficient Balance'}
        </button>
      </div>
    </div>
  );
}

// ── Main WalletPage ─────────────────────────────────────────
export default function WalletPage() {
  const { t } = useTranslation();
  const { balance, addBalance, purchaseProduct, deductBalance, refundBalance, addLicense, user } = useAppStore();
  const [step, setStep]         = useState<1|2|3>(1);
  const [amount, setAmount]     = useState(10);
  const [custom, setCustom]     = useState('');
  const [methodId, setMethodId] = useState<MethodId>('bkash');
  const [txnId, setTxnId]       = useState('');
  const [submitting,setSubmitting] = useState(false);
  const [myTxns, setMyTxns]     = useState<any[]>([]);
  const [txnsLoad,setTxnsLoad]  = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<{ product: any; keys: Array<{ key: string; panelId: string; panelName: string; expiresAt: string }> } | null>(null);
  const [confirmPending, setConfirmPending]   = useState<any | null>(null);

  const isAdmin   = user?.role === 'admin';
  const isSupport = user?.role === 'support';
  const selAmount = custom ? parseFloat(custom)||0 : amount;
  const selMethod = PAYMENT_METHODS.find(m=>m.id===methodId) ?? PAYMENT_METHODS[0];

  const loadTxns = async () => {
    if (!user) return;
    setTxnsLoad(true);
    const { data } = await safeQuery(() => supabase.from('transactions').select('*').eq('user_id',user.id).order('created_at',{ascending:false}));
    setMyTxns(data ?? []);
    setTxnsLoad(false);
  };

  useEffect(() => {
    if (!user||isAdmin||isSupport) return;
    loadTxns();
    const creditedKey = `1999x-credited-${user.id}`;
    const getCredited = (): Set<string> => { try { return new Set<string>(JSON.parse(localStorage.getItem(creditedKey)||'[]')); } catch { return new Set(); } };
    const addCredited = (id: string) => { const s=getCredited(); s.add(id); try { localStorage.setItem(creditedKey,JSON.stringify([...s])); } catch {} };
    const isCredited  = (id: string) => getCredited().has(id);
    let isChecking = false;
    const check = async () => {
      if (isChecking) return;
      isChecking = true;
      try {
        const { data, error } = await safeQuery(() => supabase.from('transactions').select('id,amount,status').eq('user_id',user.id));
        if (error||!data) return;
        for (const tx of data as any[]) {
          if (tx.status==='approved'&&!isCredited(tx.id)) { addCredited(tx.id); addBalance(Number(tx.amount)); toast.success(`🎉 Payment approved! $${tx.amount} added!`); }
          if (tx.status==='rejected'&&!isCredited(tx.id+'_r')) { addCredited(tx.id+'_r'); toast.error(`Payment of $${tx.amount} was rejected.`); }
        }
        const { data:full } = await safeQuery(() => supabase.from('transactions').select('*').eq('user_id',user.id).order('created_at',{ascending:false}));
        if (full) setMyTxns(full);
      } finally { isChecking=false; }
    };
    const initTimer = setTimeout(check,2000);
    const poll = setInterval(check,12000);
    const onFocus = () => { if (!isChecking) check(); };
    window.addEventListener('focus',onFocus);
    const ch = supabase.channel(`wallet-${user.id}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'transactions',filter:`user_id=eq.${user.id}`},()=>check()).subscribe();
    return () => { clearTimeout(initTimer); clearInterval(poll); window.removeEventListener('focus',onFocus); supabase.removeChannel(ch); };
  },[user?.id]);

  const handleSubmit = async () => {
    if (!txnId.trim()) { toast.error('Enter your transaction ID'); return; }
    if (!user)         { toast.error('Please login first'); return; }
    if (selAmount<=0)  { toast.error('Select a valid amount'); return; }
    setSubmitting(true);
    const { error } = await safeQuery(() => supabase.from('transactions').insert({ user_id:user.id, user_email:user.email, user_name:user.name, amount:selAmount, method:methodId, transaction_id:txnId.trim(), status:'pending' }));
    if (error) {
      if (error.message==='timeout') toast.error('Request timed out.');
      else if (error.message.includes('relation')) toast.error('Table not found. Run SQL migrations.');
      else toast.error('Failed: '+error.message);
    } else {
      toast.success('✅ Submitted! Admin will approve shortly.');
      setStep(1); setTxnId(''); setCustom(''); loadTxns();
    }
    setSubmitting(false);
  };

  const handleBuy = async (product: any) => {
    if (balance < product.price) { toast.error('Insufficient balance. Add funds first.'); return; }

    // Step 1: Deduct balance ONLY — no license created yet
    const deducted = deductBalance(product.price);
    if (!deducted) { toast.error('Insufficient balance'); return; }
    const panel = product.keyauthPanel ?? 'lag';
    const days  = product.days || parseInt(product.duration)||7;
    const toGen = panel==='both' ? ['internal','lag'] : [panel];
    const generatedKeys: Array<{key:string;panelId:string;panelName:string;expiresAt:string}> = [];
    const errors: string[] = [];
    toast.loading('Generating your license key...', { id:'keygen' });
    for (const p of toGen) {
      try {
        const controller = new AbortController();
        const timer = setTimeout(()=>controller.abort(),15000);
        let result: any = null;
        try {
          const res = await fetch(`${SUPABASE_URL}/functions/v1/generate-key`,{ method:'POST', headers:{'Content-Type':'application/json','Authorization':`Bearer ${SUPABASE_ANON}`,'apikey':SUPABASE_ANON}, body:JSON.stringify({panel_type:p,days,user_email:user?.email}), signal:controller.signal });
          clearTimeout(timer);
          result = await res.json();
        } catch (e: any) { clearTimeout(timer); errors.push(`${p}: ${e?.name==='AbortError'?'Timeout':'Network error'}`); continue; }
        if (result?.success&&result?.key) {
          const expiry  = new Date(Date.now()+days*86400000).toISOString();
          const panelId = p==='lag'?'keyauth-lag':'keyauth-internal';
          const panelNm = p==='lag'?'Fake Lag':'Internal';
          addLicense({ id:`purchase_${Math.random().toString(36).slice(2,10)}`, productId:panelId, productName:panelNm, key:p==='lag'?result.key:result.key+'_INTERNAL', hwid:'', lastLogin:new Date().toISOString(), expiresAt:expiry, status:'active', ip:'', device:'', hwidResetsUsed:0, hwidResetMonth:new Date().getMonth() });
          generatedKeys.push({ key:result.key, panelId, panelName:panelNm, expiresAt:expiry });
        } else { errors.push(`${p}: ${result?.message??'Unknown error'}`); }
      } catch(e) { errors.push(`${p}: ${String(e)}`); }
    }
    toast.dismiss('keygen');
    if (generatedKeys.length > 0) {
      setPurchaseSuccess({ product, keys: generatedKeys });
    } else {
      // REFUND — key generation failed, give money back
      refundBalance(product.price);
      const errDetail = errors.join(' | ');
      console.error('Key generation failed:', errDetail);
      toast.error(
        `❌ Key generation failed. Your $${product.price} has been refunded. Error: ${errDetail}`,
        { duration: 12000 }
      );
    }
  };

  // Admin view
  if (isAdmin||isSupport) return (
    <div style={{ display:'flex',flexDirection:'column',gap:18 }}>
      <div className="g fu" style={{ padding:'20px 22px' }}>
        <div style={{ display:'flex',alignItems:'center',gap:14,marginBottom:20 }}>
          <div style={{ width:44,height:44,borderRadius:12,background:'rgba(139,92,246,.1)',border:'1px solid rgba(139,92,246,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}><Users size={20} color="var(--purple)"/></div>
          <div><div style={{ fontSize:16,fontWeight:800,color:'#fff' }}>Payment Approvals</div><div style={{ fontSize:12,color:'var(--muted)',marginTop:2 }}>Auto-refreshes every 20s</div></div>
        </div>
        <AdminPanel/>
      </div>
    </div>
  );

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:22 }}>
      {confirmPending && (
        <ConfirmModal
          product={{ name: confirmPending.name || confirmPending.id, price: confirmPending.price, duration: `${confirmPending.days} days`, emoji: confirmPending.emoji }}
          onConfirm={() => { const p = confirmPending; setConfirmPending(null); handleBuy(p); }}
          onCancel={() => setConfirmPending(null)}
        />
      )}
      {purchaseSuccess && <PurchaseSuccessModal data={purchaseSuccess} onClose={()=>setPurchaseSuccess(null)}/>}

      {/* ── Balance Card ── */}
      <div style={{ position:'relative',borderRadius:22,padding:'26px 28px',overflow:'hidden',background:'linear-gradient(135deg,rgba(109,40,217,.15) 0%,rgba(8,8,16,.9) 60%)',border:'1px solid rgba(139,92,246,.2)',boxShadow:'0 0 60px rgba(109,40,217,.12)' }}>
        <div style={{ position:'absolute',top:0,right:0,width:300,height:300,borderRadius:'50%',background:'radial-gradient(circle,rgba(109,40,217,.2) 0%,transparent 70%)',transform:'translate(30%,-30%)',pointerEvents:'none' }}/>
        <div style={{ position:'absolute',bottom:0,left:0,width:200,height:200,borderRadius:'50%',background:'radial-gradient(circle,rgba(16,232,152,.08) 0%,transparent 70%)',transform:'translate(-30%,30%)',pointerEvents:'none' }}/>
        <div style={{ position:'relative' }}>
          <div style={{ fontSize:11,fontWeight:600,letterSpacing:'.1em',textTransform:'uppercase',color:'rgba(255,255,255,.4)',marginBottom:8 }}>Available Balance</div>
          <div style={{ fontSize:52,fontWeight:900,color:'#fff',letterSpacing:'-.04em',lineHeight:1,marginBottom:6,textShadow:'0 0 40px rgba(139,92,246,.4)' }}>${balance.toFixed(2)}</div>
          <div style={{ fontSize:12,color:'rgba(255,255,255,.35)' }}>Approved deposits credited instantly</div>
        </div>
      </div>

      {/* ── Products ── */}
      <div>
        <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:18 }}>
          <div style={{ fontSize:18,fontWeight:800,color:'#fff',letterSpacing:'-.01em' }}>Products</div>
          <div style={{ display:'flex',alignItems:'center',gap:6,padding:'4px 12px',borderRadius:20,background:'rgba(16,232,152,.08)',border:'1px solid rgba(16,232,152,.2)' }}>
            <div className="dot dot-green" style={{ width:5,height:5 }}/>
            <span style={{ fontSize:11,fontWeight:700,color:'var(--green)' }}>OB52 Undetected</span>
          </div>
        </div>
        <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16 }}>
          {PANEL_GROUPS.map(group => (
            <PanelProductCard key={group.id} group={group} balance={balance} onBuy={(p) => setConfirmPending(p)}/>
          ))}
        </div>
      </div>

      {/* ── Add Balance ── */}
      <div style={{ background:'rgba(255,255,255,.025)',border:'1px solid var(--border)',borderRadius:22,overflow:'hidden' }}>
        {/* Header */}
        <div style={{ padding:'20px 24px',borderBottom:'1px solid var(--border)',background:'rgba(255,255,255,.015)' }}>
          <div style={{ fontSize:18,fontWeight:800,color:'#fff',marginBottom:4 }}>Add Balance</div>
          <div style={{ fontSize:12,color:'var(--muted)' }}>Choose payment method · Admin approves within minutes</div>
        </div>

        <div style={{ padding:24 }}>
          <Steps step={step}/>

          {/* Step 1 — Amount */}
          {step===1&&(
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div style={{ fontSize:11,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--muted)' }}>Select Amount</div>
              <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:8 }}>
                {AMOUNTS.map(a=>(
                  <button key={a} onClick={()=>{setAmount(a);setCustom('');}}
                    style={{ padding:'14px 8px',borderRadius:12,fontSize:15,fontWeight:700,cursor:'pointer',border:`1px solid ${amount===a&&!custom?'rgba(139,92,246,.5)':'rgba(255,255,255,.07)'}`,background:amount===a&&!custom?'rgba(139,92,246,.12)':'rgba(255,255,255,.03)',color:amount===a&&!custom?'var(--purple)':'var(--muted)',transition:'all .15s',fontFamily:'inherit',boxShadow:amount===a&&!custom?'0 0 20px rgba(109,40,217,.25)':'none' }}>
                    ${a}
                  </button>
                ))}
              </div>
              <div style={{ position:'relative' }}>
                <span style={{ position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'var(--muted)',fontWeight:700,fontSize:16 }}>$</span>
                <input type="number" placeholder="Custom amount" value={custom} onChange={e=>setCustom(e.target.value)}
                  style={{ width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',borderRadius:12,padding:'13px 16px 13px 32px',color:'#fff',fontFamily:'inherit',fontSize:15,outline:'none',transition:'border-color .15s,box-shadow .15s' }}
                  onFocus={e=>{e.target.style.borderColor='rgba(139,92,246,.5)';e.target.style.boxShadow='0 0 0 3px rgba(139,92,246,.1)';}}
                  onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none';}} />
              </div>
              {selAmount>0&&(
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 16px',borderRadius:12,background:'rgba(139,92,246,.07)',border:'1px solid rgba(139,92,246,.18)' }}>
                  <span style={{ fontSize:13,color:'var(--muted)' }}>You will deposit</span>
                  <span style={{ fontSize:22,fontWeight:800,color:'var(--purple)',letterSpacing:'-.02em' }}>${selAmount.toFixed(2)}</span>
                </div>
              )}
              <button onClick={()=>selAmount>0?setStep(2):toast.error('Select an amount')} className="btn btn-p btn-lg btn-full shim-btn">
                Continue <ArrowRight size={16}/>
              </button>
            </div>
          )}

          {/* Step 2 — Method */}
          {step===2&&(
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div style={{ fontSize:11,fontWeight:700,letterSpacing:'.1em',textTransform:'uppercase',color:'var(--muted)' }}>Payment Method</div>
              <div style={{ display:'flex',gap:8,overflowX:'auto',paddingBottom:4 }} className="noscroll">
                {PAYMENT_METHODS.map(m=>(
                  <button key={m.id} onClick={()=>setMethodId(m.id)}
                    style={{ display:'flex',alignItems:'center',gap:8,padding:'9px 16px',borderRadius:20,fontSize:12,fontWeight:700,whiteSpace:'nowrap',flexShrink:0,cursor:'pointer',border:`1px solid ${methodId===m.id?'rgba(139,92,246,.5)':'rgba(255,255,255,.08)'}`,background:methodId===m.id?'rgba(139,92,246,.12)':'rgba(255,255,255,.03)',color:methodId===m.id?'var(--purple)':'var(--muted)',transition:'all .15s',fontFamily:'inherit',boxShadow:methodId===m.id?'0 0 16px rgba(109,40,217,.3)':'none' }}>
                    <span style={{ width:20,height:20,borderRadius:'50%',overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>{m.icon}</span>
                    {m.label}
                  </button>
                ))}
              </div>
              <PayCard method={selMethod} amount={selAmount} user={user}/>
              <div style={{ display:'flex',gap:10 }}>
                <button onClick={()=>setStep(1)} className="btn btn-ghost" style={{ padding:'11px 18px' }}><ArrowLeft size={15}/> Back</button>
                <button onClick={()=>setStep(3)} className="btn btn-p btn-lg" style={{ flex:1 }}>I&apos;ve Sent Payment <ArrowRight size={15}/></button>
              </div>
            </div>
          )}

          {/* Step 3 — Confirm */}
          {step===3&&(
            <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:14,padding:'16px 18px' }}>
                <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                  <span style={{ width:36,height:36,borderRadius:9,overflow:'hidden',display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(255,255,255,.05)',flexShrink:0 }}>{selMethod.icon}</span>
                  <div><div style={{ fontSize:14,fontWeight:700,color:'#fff' }}>{selMethod.label}</div><div style={{ fontSize:11,color:'var(--muted)' }}>Payment method</div></div>
                </div>
                <div style={{ textAlign:'right' }}>
                  <div style={{ fontSize:26,fontWeight:900,color:'#fff',letterSpacing:'-.03em' }}>${selAmount.toFixed(2)}</div>
                  <div style={{ fontSize:11,color:'var(--muted)' }}>Amount sent</div>
                </div>
              </div>
              <div>
                <div style={{ fontSize:11,fontWeight:700,letterSpacing:'.08em',textTransform:'uppercase',color:'var(--muted)',marginBottom:8 }}>Transaction / Reference ID</div>
                <input type="text" placeholder="Paste your transaction ID here" value={txnId} onChange={e=>setTxnId(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!submitting&&handleSubmit()}
                  style={{ width:'100%',background:'rgba(255,255,255,.04)',border:'1px solid var(--border)',borderRadius:12,padding:'13px 16px',color:'#fff',fontFamily:'inherit',fontSize:14,outline:'none',transition:'border-color .15s,box-shadow .15s' }}
                  onFocus={e=>{e.target.style.borderColor='rgba(139,92,246,.5)';e.target.style.boxShadow='0 0 0 3px rgba(139,92,246,.1)';}}
                  onBlur={e=>{e.target.style.borderColor='var(--border)';e.target.style.boxShadow='none';}} autoComplete="off" />
                <div style={{ fontSize:11,color:'var(--dim)',marginTop:6 }}>Enter the ID you received after completing payment</div>
              </div>
              <div style={{ display:'flex',gap:10 }}>
                <button onClick={()=>setStep(2)} disabled={submitting} className="btn btn-ghost" style={{ padding:'11px 18px' }}><ArrowLeft size={15}/> Back</button>
                <button onClick={handleSubmit} disabled={submitting||!txnId.trim()} className="btn btn-g btn-lg" style={{ flex:1 }}>
                  {submitting?<><Loader2 size={16} className="animate-spin"/> Submitting...</>:<><CheckCircle size={16}/> Submit Payment</>}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Transaction History ── */}
      <div style={{ background:'rgba(255,255,255,.025)',border:'1px solid var(--border)',borderRadius:18,padding:'20px 22px' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
          <div style={{ fontSize:16,fontWeight:700,color:'#fff' }}>Transaction History</div>
          <button onClick={loadTxns} disabled={txnsLoad} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--dim)',padding:4,borderRadius:6 }}>
            <RefreshCw size={14} className={txnsLoad?'animate-spin':''}/>
          </button>
        </div>
        {txnsLoad
          ? <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'24px 0',color:'var(--muted)' }}><Loader2 size={15} className="animate-spin"/><span style={{fontSize:13}}>Loading...</span></div>
          : myTxns.length===0
          ? <p style={{ fontSize:13,color:'var(--muted)',textAlign:'center',padding:'24px 0' }}>No transactions yet</p>
          : <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
              {myTxns.map(tx=>{
                const m = PAYMENT_METHODS.find(p=>p.id===tx.method);
                return (
                  <div key={tx.id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'12px 14px',background:'rgba(255,255,255,.025)',border:'1px solid var(--border)',borderRadius:12 }}>
                    <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                      <div style={{ width:36,height:36,borderRadius:9,background:'rgba(255,255,255,.05)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0 }}>
                        {m?.icon??<span style={{fontSize:14}}>💳</span>}
                      </div>
                      <div>
                        <div style={{ fontSize:13,fontWeight:600,color:'#fff' }}>${tx.amount} via {m?.label??tx.method}</div>
                        <div style={{ fontSize:10,color:'var(--dim)',marginTop:2 }}>{new Date(tx.created_at).toLocaleDateString()} · {tx.transaction_id}</div>
                      </div>
                    </div>
                    <span className={`badge badge-${tx.status==='approved'?'green':tx.status==='rejected'?'red':'amber'}`}>
                      {tx.status==='approved'?'✓ Approved':tx.status==='rejected'?'✗ Rejected':'⏳ Pending'}
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
