import { useState, useEffect, useRef } from 'react';
import { useAppStore, PRODUCTS } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { ArrowRight, ArrowLeft, RefreshCw, Users, Check, X, Copy, CheckCircle, Loader2, Eye, EyeOff, ZoomIn, Upload, Wallet, ShoppingBag, CreditCard } from 'lucide-react';
import { safeQuery } from '@/lib/safeFetch';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const SUPABASE_URL  = 'https://wkjqrjafogufqeasfeev.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok';

// ── Local currency rates (approximate, update periodically) ──
// Format: { currencyCode, symbol, rate (per 1 USD), flag, label }
const LOCAL_CURRENCY: Record<string, { code: string; symbol: string; rate: number; flag: string; label: string }> = {
  bkash:      { code: 'BDT', symbol: '৳',  rate: 110,    flag: '🇧🇩', label: 'Bangladeshi Taka' },
  dana:       { code: 'IDR', symbol: 'Rp', rate: 16350,  flag: '🇮🇩', label: 'Indonesian Rupiah' },
  usdt_trc20: { code: 'USDT', symbol: '₮', rate: 1,      flag: '💲', label: 'Tether (= USD)' },
  usdt_bep20: { code: 'USDT', symbol: '₮', rate: 1,      flag: '💲', label: 'Tether (= USD)' },
  litecoin:   { code: 'LTC',  symbol: 'Ł', rate: 0.01,   flag: '🔷', label: 'Litecoin (≈ market)' },
  binance:    { code: 'USDT', symbol: '$', rate: 1,       flag: '💲', label: 'USD equivalent' },
  paypal:     { code: 'USD',  symbol: '$', rate: 1,       flag: '🇺🇸', label: 'US Dollar' },
};

// ── Payment Methods ──────────────────────────────────────────
const PAYMENT_METHODS = [
  { id:'binance', label:'Binance Pay', color:'#F0B90B', glow:'rgba(240,185,11,0.35)', instruction:'Open Binance → Pay → scan QR or enter Pay ID', hasQr:true, qr:'https://www.dropbox.com/scl/fi/vu9ys724n9vyij3kpnwd2/qr-image-1774043312091.png?rlkey=8601ge6mlljbzjcdkyn4f656i&st=qsf32sfb&dl=1', fields:[{label:'Pay ID',value:'1104953117',note:'Binance Pay ID'}], icon:<svg width="20" height="20" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#1a1a1a"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="#F0B90B" fontSize="11" fontWeight="800">BNB</text></svg>, bgColor:'rgba(240,185,11,0.08)', borderColor:'rgba(240,185,11,0.25)' },
  { id:'paypal', label:'PayPal', color:'#009CDE', glow:'rgba(0,156,222,0.35)', instruction:'Complete payment via PayPal — balance is credited automatically after payment.', hasQr:false, qr:'', fields:[{label:'PayPal.me',value:'https://paypal.me/JohanMaestre',note:''}], icon:<svg width="20" height="20" viewBox="0 0 24 24"><path d="M7.144 19.532l1.049-5.751c.11-.606.691-1.002 1.304-.948 2.155.194 6.877.1 8.818-4.002 2.554-5.397-.59-7.769-6.295-7.831H5.382a1.31 1.31 0 0 0-1.294 1.109L2.01 18.049a.738.738 0 0 0 .728.852h4.109l.297-1.369z" fill="#009CDE"/><path d="M17.512 7.309c-.673 4.378-3.403 6.025-7.934 6.025H8.354l-1.061 5.82h3.285l.53-2.906h1.722c4.02 0 6.386-1.95 7.006-5.818.48-2.991-.39-5.016-2.324-5.121z" fill="#003087" opacity=".7"/></svg>, bgColor:'rgba(0,112,186,0.08)', borderColor:'rgba(0,112,186,0.25)' },
  { id:'bkash', label:'bKash', color:'#E2136E', glow:'rgba(226,19,110,0.35)', instruction:'Open bKash → Send Money → enter number', hasQr:true, qr:'https://www.dropbox.com/scl/fi/0sfir9cpytsqso5z7idlw/01760889747-3_44_10-AM-Mar-21-2026.png.jpg?rlkey=dvxxouvnp3nxwrozpz5j12stc&st=33owmssu&dl=1', fields:[{label:'Number',value:'01760880747',note:'Send Money (not Payment)'}], icon:<svg width="20" height="20" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#E2136E"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="14" fontWeight="800">B</text></svg>, bgColor:'rgba(226,19,110,0.08)', borderColor:'rgba(226,19,110,0.25)' },
  { id:'dana', label:'Dana', color:'#118EEA', glow:'rgba(17,142,234,0.35)', instruction:'Open Dana → Transfer → enter number or scan QR', hasQr:true, qr:'YOUR_DANA_QR_URL', fields:[{label:'Name',value:'Dana Account Name',note:''},{label:'Number',value:'08xxxxxxxxxx',note:''}], icon:<svg width="20" height="20" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#118EEA"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="14" fontWeight="800">D</text></svg>, bgColor:'rgba(17,142,234,0.08)', borderColor:'rgba(17,142,234,0.25)' },
  { id:'usdt_trc20', label:'USDT TRC20', color:'#26A17B', glow:'rgba(38,161,123,0.35)', instruction:'Send USDT on Tron (TRC20) network only', hasQr:true, qr:'YOUR_USDT_TRC20_QR_URL', fields:[{label:'TRC20 Address',value:'YOUR_TRC20_ADDRESS',note:'Tron network only'}], icon:<svg width="20" height="20" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#26A17B"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="9" fontWeight="800">USDT</text></svg>, bgColor:'rgba(38,161,123,0.08)', borderColor:'rgba(38,161,123,0.25)' },
  { id:'usdt_bep20', label:'USDT BEP20', color:'#F0B90B', glow:'rgba(240,185,11,0.3)', instruction:'Send USDT on BNB Smart Chain (BEP20) only', hasQr:true, qr:'YOUR_USDT_BEP20_QR_URL', fields:[{label:'BEP20 Address',value:'YOUR_BEP20_ADDRESS',note:'BSC network only'}], icon:<svg width="20" height="20" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#1a1a1a"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="#F0B90B" fontSize="9" fontWeight="800">BEP</text></svg>, bgColor:'rgba(240,185,11,0.07)', borderColor:'rgba(240,185,11,0.2)' },
  { id:'litecoin', label:'Litecoin', color:'#A5A9B4', glow:'rgba(165,169,180,0.3)', instruction:'Send LTC to the address above', hasQr:true, qr:'YOUR_LTC_QR_URL', fields:[{label:'LTC Address',value:'YOUR_LTC_ADDRESS',note:'Litecoin network'}], icon:<svg width="20" height="20" viewBox="0 0 40 40"><circle cx="20" cy="20" r="20" fill="#345D9D"/><text x="50%" y="56%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="13" fontWeight="800">Ł</text></svg>, bgColor:'rgba(52,93,157,0.08)', borderColor:'rgba(52,93,157,0.25)' },
] as const;

type MethodId = typeof PAYMENT_METHODS[number]['id'];
const AMOUNTS = [5, 10, 15, 25, 50, 100];

// ── QR Zoom Modal ────────────────────────────────────────────
function QRZoomModal({ src, onClose }: { src: string; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,0.92)',backdropFilter:'blur(24px)',padding:20 }}>
      <div onClick={e=>e.stopPropagation()} style={{ position:'relative',padding:10,borderRadius:22,background:'white',boxShadow:'0 0 100px rgba(139,92,246,0.5),0 32px 80px rgba(0,0,0,0.8)' }}>
        <img src={src} alt="QR Code" style={{ width:340,height:340,objectFit:'contain',borderRadius:14,display:'block' }}/>
        <button onClick={onClose} style={{ position:'absolute',top:-14,right:-14,width:32,height:32,borderRadius:'50%',background:'#ef4444',border:'2px solid rgba(0,0,0,.5)',cursor:'pointer',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800 }}>×</button>
        <p style={{ textAlign:'center',fontSize:12,color:'#666',marginTop:8,marginBottom:0 }}>Click outside to close</p>
      </div>
    </div>
  );
}

// ── PayPal Auto-Capture Button ───────────────────────────────
// Uses PayPal JS SDK to create + capture order, then calls our
// Supabase edge function which verifies with PayPal API and
// inserts an 'approved' transaction → balance auto-credited.
//
// SETUP: Set PAYPAL_CLIENT_ID in your Supabase project secrets.
// The client ID is safe to expose in the frontend (it's public).
// Your secret key stays in Supabase edge function env only.
const PAYPAL_CLIENT_ID = import.meta.env.VITE_PAYPAL_CLIENT_ID || 'YOUR_PAYPAL_CLIENT_ID';

function PayPalButton({ amount, user, onSuccess }: { amount: number; user: any; onSuccess?: () => void }) {
  const { addBalance } = useAppStore();
  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady,    setSdkReady]    = useState(false);
  const [sdkError,    setSdkError]    = useState('');
  const [processing,  setProcessing]  = useState(false);
  const [paid,        setPaid]        = useState(false);
  const [rendered,    setRendered]    = useState(false);

  // Load PayPal SDK script once
  useEffect(() => {
    if (PAYPAL_CLIENT_ID === 'YOUR_PAYPAL_CLIENT_ID') {
      setSdkError('PayPal Client ID not configured. Set VITE_PAYPAL_CLIENT_ID in .env');
      return;
    }
    const existing = document.getElementById('paypal-sdk');
    if (existing) { setSdkReady(true); return; }
    const script = document.createElement('script');
    script.id  = 'paypal-sdk';
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&intent=capture`;
    script.onload  = () => setSdkReady(true);
    script.onerror = () => setSdkError('Failed to load PayPal SDK');
    document.head.appendChild(script);
  }, []);

  // Render PayPal buttons when SDK is ready + amount changes
  useEffect(() => {
    if (!sdkReady || !containerRef.current || rendered) return;
    const win = window as any;
    if (!win.paypal) return;

    // Clear previous render
    containerRef.current.innerHTML = '';
    setRendered(true);

    win.paypal.Buttons({
      style: { layout: 'vertical', color: 'blue', shape: 'rect', label: 'pay', height: 48 },

      createOrder: (_data: any, actions: any) => {
        return actions.order.create({
          purchase_units: [{
            amount: { value: amount.toFixed(2), currency_code: 'USD' },
            description: '1999X Panel Balance',
          }],
        });
      },

      onApprove: async (_data: any, actions: any) => {
        setProcessing(true);
        try {
          // Capture client-side first (gets order ID)
          const order = await actions.order.capture();
          const orderId = order.id;
          const capturedAmount = parseFloat(
            order.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ?? String(amount)
          );

          // Call our edge function to verify + record + auto-approve
          const res = await fetch(`${SUPABASE_URL}/functions/v1/paypal-capture`, {
            method: 'POST',
            headers: {
              'Content-Type':  'application/json',
              'Authorization': `Bearer ${SUPABASE_ANON}`,
              'apikey':        SUPABASE_ANON,
            },
            body: JSON.stringify({
              order_id:   orderId,
              user_id:    user?.id    ?? '',
              user_email: user?.email ?? '',
              user_name:  user?.name  ?? '',
              amount:     capturedAmount,
            }),
          });
          const result = await res.json();

          if (result.success) {
            // Credit balance immediately in the UI
            addBalance(capturedAmount);
            setPaid(true);
            toast.success(`🎉 $${capturedAmount.toFixed(2)} added to your balance!`);
            onSuccess?.();
          } else {
            toast.error('PayPal capture failed: ' + (result.message ?? 'Unknown error'));
          }
        } catch (e) {
          toast.error('Payment error: ' + String(e));
        }
        setProcessing(false);
      },

      onError: (err: any) => {
        console.error('PayPal error:', err);
        toast.error('PayPal error. Try again.');
      },

      onCancel: () => {
        toast.info('PayPal payment cancelled.');
      },
    }).render(containerRef.current);
  }, [sdkReady, amount]);

  // Re-render when amount changes
  useEffect(() => { setRendered(false); }, [amount]);

  if (paid) {
    return (
      <div style={{ padding:'16px',borderRadius:14,background:'rgba(16,232,152,.08)',border:'1px solid rgba(16,232,152,.22)',textAlign:'center' }}>
        <CheckCircle size={28} color="var(--green)" style={{ margin:'0 auto 8px' }}/>
        <div style={{ fontSize:15,fontWeight:800,color:'#fff',marginBottom:4 }}>Payment Successful!</div>
        <div style={{ fontSize:12,color:'var(--muted)' }}>Balance has been credited automatically.</div>
      </div>
    );
  }

  if (sdkError) {
    return (
      <div style={{ padding:'14px',borderRadius:12,background:'rgba(248,113,113,.07)',border:'1px solid rgba(248,113,113,.18)',fontSize:12,color:'#f87171',textAlign:'center' }}>
        ⚠️ {sdkError}
      </div>
    );
  }

  if (processing) {
    return (
      <div style={{ padding:'16px',borderRadius:12,background:'rgba(0,112,186,.08)',border:'1px solid rgba(0,112,186,.2)',display:'flex',alignItems:'center',justifyContent:'center',gap:10 }}>
        <Loader2 size={18} className="animate-spin" style={{ color:'#009cde' }}/>
        <span style={{ fontSize:13,fontWeight:700,color:'#009cde' }}>Processing payment...</span>
      </div>
    );
  }

  return (
    <div>
      {!sdkReady && (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'14px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.07)',marginBottom:8 }}>
          <Loader2 size={14} className="animate-spin" style={{ color:'var(--muted)' }}/>
          <span style={{ fontSize:12,color:'var(--muted)' }}>Loading PayPal...</span>
        </div>
      )}
      <div ref={containerRef} style={{ minHeight: sdkReady ? 50 : 0 }}/>
      <div style={{ marginTop:10,fontSize:11,color:'var(--dim)',textAlign:'center',display:'flex',alignItems:'center',justifyContent:'center',gap:4 }}>
        <CheckCircle size={10} color="var(--green)"/>
        Auto-credited instantly after payment
      </div>
    </div>
  );
}

// ── Admin Panel (logic unchanged) ────────────────────────────
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
            <div style={{ fontSize:20,fontWeight:800,color:s.c }}>{s.val}</div>
            <div className="label" style={{ marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>
      <div style={{ display:'flex',gap:8,alignItems:'center' }}>
        <div style={{ display:'flex',gap:4,background:'rgba(255,255,255,.04)',borderRadius:10,padding:4,flex:1 }}>
          {(['pending','approved','rejected','all'] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{ flex:1,padding:'7px 4px',borderRadius:7,fontSize:11,fontWeight:700,textTransform:'capitalize',cursor:'pointer',border:'none',background:filter===f?'linear-gradient(135deg,#8b5cf6,#6d28d9)':'transparent',color:filter===f?'#fff':'var(--muted)',fontFamily:'inherit' }}>
              {f}{f==='pending'&&pending>0?` (${pending})`:''}</button>
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
              <div style={{ fontSize:22,fontWeight:800,color:'#fff' }}>${Number(tx.amount).toFixed(2)}</div>
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

// ── Purchase Success Modal (logic unchanged) ─────────────────
function PurchaseSuccessModal({ data, onClose }: { data: { product: any; keys: Array<{ key: string; panelId: string; panelName: string; expiresAt: string }> }; onClose: () => void }) {
  const [revealed,setRevealed] = useState<Record<number,boolean>>({});
  const [copied,setCopied] = useState<Record<number,boolean>>({});
  const copyKey = (k: string, i: number) => { navigator.clipboard.writeText(k); setCopied(p=>({...p,[i]:true})); setTimeout(()=>setCopied(p=>({...p,[i]:false})),2000); };
  return (
    <div style={{ position:'fixed',inset:0,zIndex:70,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.85)',backdropFilter:'blur(14px)',padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="g si" style={{ width:'100%',maxWidth:440,padding:'32px 28px',textAlign:'center',boxShadow:'0 0 80px rgba(16,232,152,.12),0 32px 80px rgba(0,0,0,.7)',borderColor:'rgba(16,232,152,.22)',overflowY:'auto',maxHeight:'90vh' }}>
        <div style={{ width:64,height:64,borderRadius:20,background:'rgba(16,232,152,.1)',border:'1px solid rgba(16,232,152,.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',boxShadow:'0 0 40px rgba(16,232,152,.2)' }}><CheckCircle size={32} color="var(--green)"/></div>
        <div style={{ fontSize:22,fontWeight:800,color:'#fff',marginBottom:5 }}>Purchase Successful!</div>
        <div style={{ fontSize:13,color:'var(--muted)',marginBottom:22 }}>Your {data.product.name} license is ready</div>
        {data.keys.map((k,i)=>(
          <div key={i} style={{ background:'rgba(255,255,255,.03)',border:'1px solid rgba(139,92,246,.2)',borderRadius:14,padding:16,marginBottom:12,textAlign:'left' }}>
            <div style={{ fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8 }}>{k.panelName} License Key</div>
            <div style={{ position:'relative',background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px',marginBottom:10,display:'flex',alignItems:'center',gap:10 }}>
              <code style={{ flex:1,fontSize:13,fontFamily:'monospace',color:'#fff',letterSpacing:'2px',filter:revealed[i]?'none':'blur(7px)',transition:'filter .4s',wordBreak:'break-all' }}>{k.key}</code>
              <button onClick={()=>setRevealed(p=>({...p,[i]:!p[i]}))} style={{ background:'rgba(255,255,255,.06)',border:'1px solid var(--border)',borderRadius:7,padding:'5px 8px',cursor:'pointer',color:'var(--muted)',flexShrink:0 }}>{revealed[i]?<EyeOff size={14}/>:<Eye size={14}/>}</button>
            </div>
            {!revealed[i]&&<div style={{ textAlign:'center',marginBottom:10 }}><span style={{ fontSize:11,color:'var(--dim)' }}>Click eye to reveal</span></div>}
            <button onClick={()=>copyKey(k.key,i)} className="btn btn-ghost btn-sm btn-full">{copied[i]?<><CheckCircle size={13} color="var(--green)"/> Copied!</>:<><Copy size={13}/> Copy Key</>}</button>
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

// ── Confirm Modal (logic unchanged) ──────────────────────────
function ConfirmModal({ product, onConfirm, onCancel }: { product: { name: string; price: number; duration: string; emoji?: string }; onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position:'fixed',inset:0,zIndex:80,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.82)',backdropFilter:'blur(14px)',padding:16 }}>
      <div className="g si" style={{ maxWidth:380,width:'100%',padding:'32px 28px',textAlign:'center',boxShadow:'0 0 80px rgba(139,92,246,.12),0 32px 80px rgba(0,0,0,.7)' }}>
        <div style={{ fontSize:40,marginBottom:16 }}>{product.emoji || '🛒'}</div>
        <div style={{ fontSize:20,fontWeight:800,color:'#fff',marginBottom:8 }}>Confirm Purchase</div>
        <div style={{ fontSize:13,color:'var(--muted)',marginBottom:24 }}>Please review your order before proceeding</div>
        <div style={{ background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:20,marginBottom:24,textAlign:'left' }}>
          {[{l:'Product',v:product.name},{l:'Duration',v:product.duration}].map(r=>(
            <div key={r.l} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
              <span style={{ fontSize:13,color:'var(--muted)' }}>{r.l}</span>
              <span style={{ fontSize:14,fontWeight:700,color:'#fff' }}>{r.v}</span>
            </div>
          ))}
          <div style={{ height:1,background:'var(--border)',margin:'12px 0' }}/>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <span style={{ fontSize:14,fontWeight:700,color:'var(--muted)' }}>Total</span>
            <span style={{ fontSize:28,fontWeight:900,color:'#fff',letterSpacing:'-.03em' }}>${product.price}</span>
          </div>
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={onCancel} className="btn btn-ghost" style={{ flex:1 }}>Cancel</button>
          <button onClick={onConfirm} className="btn btn-p" style={{ flex:2,boxShadow:'0 0 24px rgba(109,40,217,.4)' }}>✅ Confirm Purchase</button>
        </div>
        <p style={{ fontSize:11,color:'var(--dim)',marginTop:12 }}>Balance deducted immediately. Refunded if key fails.</p>
      </div>
    </div>
  );
}

// ── Panel Product Cards ───────────────────────────────────────
const PANEL_GROUPS = [
  { id:'internal', name:'Internal Panel', desc:'Advanced internal cheat features. Full control, maximum performance.', emoji:'⚡', color:'#4ade80', glow:'rgba(74,222,128,.3)', bg:'rgba(74,222,128,.06)', bc:'rgba(74,222,128,.18)', features:['Aimbot & ESP','Speed & No recoil','Auto updates','OB52 Undetected'], plans:[{id:'internal-3d',label:'3 Days',price:3,days:3,keyauthPanel:'internal' as const},{id:'internal-7d',label:'7 Days',price:7,days:7,keyauthPanel:'internal' as const},{id:'internal-30d',label:'30 Days',price:15,days:30,keyauthPanel:'internal' as const}] },
  { id:'combo', name:'Combo Package', desc:'Internal + Fake Lag together. The full 1999X experience at the best price.', emoji:'👑', color:'#f0d47a', glow:'rgba(201,168,76,.3)', bg:'rgba(201,168,76,.06)', bc:'rgba(201,168,76,.25)', features:['Everything in Internal','Everything in Fake Lag','Priority Support','Best price guaranteed'], plans:[{id:'combo-7d',label:'Weekly',price:10,days:7,keyauthPanel:'both' as const},{id:'combo-30d',label:'Monthly',price:20,days:30,keyauthPanel:'both' as const}], featured:true },
  { id:'lag', name:'Fake Lag', desc:'Network tool for lag-based advantages. Confuse enemies and dominate.', emoji:'🔷', color:'#a5b4fc', glow:'rgba(165,180,252,.3)', bg:'rgba(165,180,252,.06)', bc:'rgba(165,180,252,.18)', features:['Lag switch control','Packet manipulation','Adjustable delay','OB52 Undetected'], plans:[{id:'lag-7d',label:'Weekly',price:5,days:7,keyauthPanel:'lag' as const},{id:'lag-30d',label:'Monthly',price:10,days:30,keyauthPanel:'lag' as const}] },
];

function PanelProductCard({ group, balance, onBuy }: { group: typeof PANEL_GROUPS[number]; balance: number; onBuy: (plan: any) => void }) {
  const [sel, setSel] = useState(0);
  const plan = group.plans[sel];
  const can = balance >= plan.price;
  return (
    <div style={{ background:(group as any).featured?'linear-gradient(135deg,rgba(22,18,8,.95),rgba(30,22,4,.95))':'rgba(14,14,22,.85)', border:`1px solid ${group.bc}`, borderRadius:22, overflow:'hidden', position:'relative', transition:'transform .25s,box-shadow .25s', boxShadow:(group as any).featured?`0 0 60px ${group.glow},0 8px 32px rgba(0,0,0,.5)`:`0 0 30px rgba(0,0,0,.4)` }}
      onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.transform='translateY(-4px)';(e.currentTarget as HTMLDivElement).style.boxShadow=`0 0 80px ${group.glow},0 16px 40px rgba(0,0,0,.5)`;}}
      onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.transform='none';(e.currentTarget as HTMLDivElement).style.boxShadow=(group as any).featured?`0 0 60px ${group.glow},0 8px 32px rgba(0,0,0,.5)`:`0 0 30px rgba(0,0,0,.4)`;}}
    >
      <div style={{ height:3,background:`linear-gradient(90deg,transparent,${group.color},transparent)` }}/>
      {(group as any).featured&&<div style={{ position:'absolute',top:16,right:16,background:'linear-gradient(135deg,#c9a84c,#e8b84b)',color:'#0a0a0a',fontSize:9,fontWeight:900,letterSpacing:'.12em',textTransform:'uppercase',padding:'4px 10px',borderRadius:20 }}>BEST VALUE</div>}
      <div style={{ padding:'24px 22px' }}>
        <div style={{ display:'flex',alignItems:'center',gap:12,marginBottom:16 }}>
          <div style={{ width:48,height:48,borderRadius:14,background:group.bg,border:`1px solid ${group.bc}`,display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,flexShrink:0,boxShadow:`0 0 20px ${group.glow}` }}>{group.emoji}</div>
          <div><div style={{ fontSize:18,fontWeight:800,color:'#fff' }}>{group.name}</div><div style={{ fontSize:11,color:'var(--muted)',marginTop:2 }}>{group.desc}</div></div>
        </div>
        <div style={{ display:'flex',flexDirection:'column',gap:6,marginBottom:20 }}>
          {group.features.map(f=>(
            <div key={f} style={{ display:'flex',alignItems:'center',gap:8,fontSize:12,color:'rgba(255,255,255,.6)' }}>
              <span style={{ width:16,height:16,borderRadius:5,background:group.bg,border:`1px solid ${group.bc}`,display:'inline-flex',alignItems:'center',justifyContent:'center',fontSize:8,fontWeight:800,color:group.color,flexShrink:0 }}>✓</span>{f}
            </div>
          ))}
        </div>
        <div style={{ display:'flex',gap:6,marginBottom:18,flexWrap:'wrap' }}>
          {group.plans.map((p,i)=>(
            <button key={p.id} onClick={()=>setSel(i)} style={{ padding:'7px 14px',borderRadius:20,fontSize:12,fontWeight:700,cursor:'pointer',border:`1px solid ${sel===i?group.color:'rgba(255,255,255,.1)'}`,background:sel===i?group.bg:'rgba(255,255,255,.03)',color:sel===i?group.color:'var(--muted)',transition:'all .15s',fontFamily:'inherit',boxShadow:sel===i?`0 0 12px ${group.glow}`:'none' }}>{p.label}</button>
          ))}
        </div>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',background:'rgba(255,255,255,.04)',border:`1px solid ${group.bc}`,borderRadius:14,padding:'14px 18px',marginBottom:14 }}>
          <div><div style={{ fontSize:11,color:'var(--muted)',marginBottom:2 }}>Selected</div><div style={{ fontSize:13,fontWeight:700,color:group.color }}>{plan.label}</div></div>
          <div style={{ textAlign:'right' }}><div style={{ fontSize:32,fontWeight:900,color:'#fff',letterSpacing:'-.03em',lineHeight:1 }}>${plan.price}</div><div style={{ fontSize:10,color:'var(--muted)',marginTop:2 }}>one time</div></div>
        </div>
        <button onClick={()=>onBuy({...plan,keyauthPanel:plan.keyauthPanel,duration:`${plan.days} days`,name:`${group.name} — ${plan.label}`,description:group.desc,badgeType:(group as any).featured?'gold':group.id==='internal'?'green':'indigo',emoji:group.emoji})} disabled={!can}
          style={{ width:'100%',padding:'13px',borderRadius:12,fontSize:14,fontWeight:800,cursor:can?'pointer':'not-allowed',border:'none',transition:'all .2s',fontFamily:'inherit',background:can?((group as any).featured?'linear-gradient(135deg,#c9a84c,#e8b84b)':group.bg):'rgba(255,255,255,.04)',color:can?((group as any).featured?'#0a0a0a':group.color):'var(--muted)',border:can?`1px solid ${group.bc}`:'1px solid rgba(255,255,255,.06)',boxShadow:can?`0 0 24px ${group.glow}`:'none' }}>
          {can?`⚡ Buy ${plan.label} — $${plan.price}`:'Insufficient Balance'}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  NEW Premium Add-Balance UI
// ══════════════════════════════════════════════════════════════
function AddBalanceUI({ user, onSuccess }: { user: any; onSuccess: () => void }) {
  const { addBalance } = useAppStore();
  const [step, setStep] = useState<1|2|3>(1);
  const [amount, setAmount] = useState(10);
  const [custom, setCustom] = useState('');
  const [methodId, setMethodId] = useState<MethodId>('binance');
  const [txnId, setTxnId] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [screenshot, setScreenshot] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [qrZoom, setQrZoom] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selAmount = custom ? parseFloat(custom)||0 : amount;
  const selMethod = PAYMENT_METHODS.find(m=>m.id===methodId) ?? PAYMENT_METHODS[0];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setScreenshot(f);
    const reader = new FileReader();
    reader.onload = ev => setScreenshotPreview(ev.target?.result as string);
    reader.readAsDataURL(f);
  };

  const handleSubmit = async () => {
    if (!txnId.trim()) { toast.error('Enter your transaction ID'); return; }
    if (!user) { toast.error('Please login first'); return; }
    if (selAmount <= 0) { toast.error('Select a valid amount'); return; }
    if (!email.trim()) { toast.error('Enter your email'); return; }
    setSubmitting(true);
    const { error } = await safeQuery(() => supabase.from('transactions').insert({
      user_id:user.id, user_email:email.trim(), user_name:user.name,
      amount:selAmount, method:methodId, transaction_id:txnId.trim(), status:'pending'
    }));
    if (error) {
      if (error.message==='timeout') toast.error('Request timed out.');
      else if (error.message.includes('relation')) toast.error('Table not found. Run SQL migrations.');
      else toast.error('Failed: '+error.message);
    } else {
      toast.success('✅ Submitted! Admin will approve shortly.');
      setStep(1); setTxnId(''); setCustom(''); setScreenshot(null); setScreenshotPreview('');
      onSuccess();
    }
    setSubmitting(false);
  };

  return (
    <>
      {qrZoom && selMethod.hasQr && selMethod.qr && !selMethod.qr.startsWith('YOUR_') && (
        <QRZoomModal src={selMethod.qr} onClose={()=>setQrZoom(false)}/>
      )}
      <style>{`
        .pm-pill { transition: all 0.2s cubic-bezier(.22,1,.36,1); }
        .pm-pill:hover { transform: translateY(-2px); }
        .amt-btn { transition: all 0.18s ease; }
        .amt-btn:hover { transform: scale(1.04); }
        @keyframes slideIn { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }
        .pay-panel { animation: slideIn 0.32s cubic-bezier(.22,1,.36,1) both; }
        @media(max-width:700px){ .pay-cols{ grid-template-columns: 1fr !important; } }
      `}</style>

      {/* Step indicator bar */}
      <div style={{ display:'flex', alignItems:'center', gap:0, marginBottom:24, background:'rgba(255,255,255,.03)', borderRadius:16, padding:'6px 16px', border:'1px solid rgba(255,255,255,.06)', width:'fit-content' }}>
        {['Amount','Payment','Submit'].map((l,i)=>{
          const n=i+1, done=n<step, active=n===step;
          return (
            <div key={l} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <div style={{ display:'flex', alignItems:'center', gap:7, padding:'6px 10px', borderRadius:10, background:active?'rgba(139,92,246,.15)':'transparent', cursor:done?'pointer':'default', transition:'all .2s' }} onClick={()=>{if(done)setStep(n as 1|2|3);}}>
                <div style={{ width:22, height:22, borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, background:done?'var(--green)':active?'linear-gradient(135deg,#8b5cf6,#6d28d9)':'rgba(255,255,255,.06)', color:done||active?'#fff':'var(--muted)', boxShadow:active?'0 0 14px rgba(109,40,217,.5)':'none', transition:'all .2s', flexShrink:0 }}>{done?'✓':n}</div>
                <span style={{ fontSize:12, fontWeight:700, color:active?'#fff':done?'var(--green)':'rgba(255,255,255,.3)' }}>{l}</span>
              </div>
              {i<2&&<div style={{ width:24, height:1, background:done?'rgba(16,232,152,.4)':'rgba(255,255,255,.07)', margin:'0 2px' }}/>}
            </div>
          );
        })}
      </div>

      {/* ── STEP 1: Amount ── */}
      {step===1&&(
        <div className="pay-panel g" style={{ padding:'28px 28px 32px', borderRadius:20 }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,.35)', marginBottom:18 }}>Choose Amount to Deposit</div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16 }}>
            {AMOUNTS.map(a=>(
              <button key={a} className="amt-btn" onClick={()=>{setAmount(a);setCustom('');}}
                style={{ padding:'20px 8px', borderRadius:16, fontSize:22, fontWeight:900, cursor:'pointer', border:`2px solid ${amount===a&&!custom?'rgba(139,92,246,.6)':'rgba(255,255,255,.06)'}`, background:amount===a&&!custom?'rgba(139,92,246,.12)':'rgba(255,255,255,.025)', color:amount===a&&!custom?'#c4b5fd':'rgba(255,255,255,.45)', fontFamily:'inherit', position:'relative', boxShadow:amount===a&&!custom?'0 0 30px rgba(109,40,217,.3), inset 0 0 20px rgba(139,92,246,.05)':'none' }}>
                <span style={{ display:'block', fontSize:9, fontWeight:700, color:'rgba(255,255,255,.28)', marginBottom:3, letterSpacing:'.1em' }}>USD</span>
                ${a}
                {amount===a&&!custom&&<div style={{ position:'absolute', top:8, right:10, width:7, height:7, borderRadius:'50%', background:'#8b5cf6', boxShadow:'0 0 8px #8b5cf6', animation:'blink 1.5s infinite' }}/>}
              </button>
            ))}
          </div>
          <div style={{ position:'relative', marginBottom:20 }}>
            <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', color:'var(--muted)', fontWeight:700, fontSize:18, pointerEvents:'none' }}>$</span>
            <input type="number" placeholder="Or enter custom amount..." value={custom} onChange={e=>setCustom(e.target.value)}
              style={{ width:'100%', background:'rgba(255,255,255,.04)', border:`1px solid ${custom?'rgba(139,92,246,.4)':'rgba(255,255,255,.08)'}`, borderRadius:14, padding:'15px 18px 15px 36px', color:'#fff', fontFamily:'inherit', fontSize:16, fontWeight:700, outline:'none', transition:'all .2s' }}
              onFocus={e=>{e.target.style.borderColor='rgba(139,92,246,.5)';e.target.style.boxShadow='0 0 0 3px rgba(139,92,246,.1)';}}
              onBlur={e=>{e.target.style.borderColor=custom?'rgba(139,92,246,.35)':'rgba(255,255,255,.08)';e.target.style.boxShadow='none';}}
            />
          </div>
          {selAmount>0&&(
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderRadius:14, background:'rgba(139,92,246,.08)', border:'1px solid rgba(139,92,246,.22)', marginBottom:20 }}>
              <span style={{ fontSize:13, color:'var(--muted)' }}>You will deposit</span>
              <span style={{ fontSize:28, fontWeight:900, color:'var(--purple)', letterSpacing:'-.03em' }}>${selAmount.toFixed(2)}</span>
            </div>
          )}
          <button onClick={()=>selAmount>0?setStep(2):toast.error('Please select an amount')} className="btn btn-p btn-lg btn-full" style={{ fontSize:15, borderRadius:14, padding:'16px' }}>
            Continue to Payment Method <ArrowRight size={17}/>
          </button>
        </div>
      )}

      {/* ── STEP 2: Payment Method + Split Panel ── */}
      {step===2&&(
        <div className="pay-panel g" style={{ borderRadius:20, overflow:'hidden', padding:0 }}>
          {/* Method selector */}
          <div style={{ padding:'22px 24px 18px', borderBottom:'1px solid rgba(255,255,255,.05)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:16 }}>
              <button onClick={()=>setStep(1)} style={{ display:'flex', alignItems:'center', gap:5, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.07)', borderRadius:10, cursor:'pointer', color:'var(--muted)', fontSize:12, fontFamily:'inherit', padding:'6px 12px' }}>
                <ArrowLeft size={13}/> Back
              </button>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.3)' }}>Select Payment Method</span>
              <div style={{ marginLeft:'auto', padding:'5px 14px', borderRadius:20, background:'rgba(139,92,246,.1)', border:'1px solid rgba(139,92,246,.2)', fontSize:13, fontWeight:900, color:'var(--purple)' }}>${selAmount.toFixed(2)}</div>
            </div>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {PAYMENT_METHODS.map(m=>(
                <button key={m.id} className="pm-pill" onClick={()=>setMethodId(m.id)}
                  style={{ display:'flex', alignItems:'center', gap:7, padding:'8px 14px', borderRadius:24, fontSize:12, fontWeight:700, cursor:'pointer', border:`1.5px solid ${methodId===m.id?m.color:'rgba(255,255,255,.07)'}`, background:methodId===m.id?m.bgColor:'rgba(255,255,255,.025)', color:methodId===m.id?m.color:'rgba(255,255,255,.45)', fontFamily:'inherit', boxShadow:methodId===m.id?`0 0 18px ${m.glow}`:'none', whiteSpace:'nowrap', transition:'all .2s' }}>
                  <span style={{ width:20, height:20, borderRadius:'50%', overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{m.icon}</span>
                  {m.label}
                  {methodId===m.id&&<div style={{ width:5, height:5, borderRadius:'50%', background:m.color, marginLeft:2, boxShadow:`0 0 5px ${m.color}` }}/>}
                </button>
              ))}
            </div>
          </div>

          {/* Split: Left = QR + details, Right = Form */}
          <div className="pay-cols" style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>

            {/* LEFT */}
            <div style={{ padding:'24px', borderRight:'1px solid rgba(255,255,255,.04)', background:'rgba(0,0,0,.15)' }}>
              {/* Amount */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', background:selMethod.bgColor, border:`1px solid ${selMethod.borderColor}`, borderRadius:14, padding:'14px 18px', marginBottom:20 }}>
                <div>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.1em', textTransform:'uppercase', color:'rgba(255,255,255,.3)', marginBottom:4 }}>Send exactly</div>
                  <div style={{ fontSize:28, fontWeight:900, color:'#fff', letterSpacing:'-.03em' }}>${selAmount.toFixed(2)}</div>
                  {LOCAL_CURRENCY[selMethod.id] && LOCAL_CURRENCY[selMethod.id].rate !== 1 && (
                    <div style={{ marginTop:6, display:'flex', alignItems:'center', gap:5 }}>
                      <span style={{ fontSize:10, color:'rgba(255,255,255,.3)' }}>≈</span>
                      <span style={{ fontSize:14, fontWeight:800, color:selMethod.color, letterSpacing:'-.01em' }}>
                        {LOCAL_CURRENCY[selMethod.id].symbol}{(selAmount * LOCAL_CURRENCY[selMethod.id].rate).toLocaleString(undefined, { maximumFractionDigits: LOCAL_CURRENCY[selMethod.id].rate > 100 ? 0 : 2 })}
                      </span>
                      <span style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.35)', padding:'2px 7px', borderRadius:8, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.08)' }}>
                        {LOCAL_CURRENCY[selMethod.id].flag} {LOCAL_CURRENCY[selMethod.id].code}
                      </span>
                    </div>
                  )}
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:8, padding:'7px 13px', borderRadius:20, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)' }}>
                  <span style={{ width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center' }}>{selMethod.icon}</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'#fff' }}>{selMethod.label}</span>
                </div>
              </div>

              {/* QR Code */}
              {selMethod.hasQr && (
                <div style={{ textAlign:'center', marginBottom:20 }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,.3)', marginBottom:12 }}>Scan QR Code</div>
                  {selMethod.qr && !selMethod.qr.startsWith('YOUR_') ? (
                    <>
                      <div onClick={()=>setQrZoom(true)} style={{ display:'inline-block', cursor:'zoom-in', position:'relative', padding:10, borderRadius:20, background:'white', boxShadow:`0 0 40px ${selMethod.glow}, 0 8px 32px rgba(0,0,0,.5)`, transition:'transform .2s,box-shadow .2s' }}
                        onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.transform='scale(1.04)';}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.transform='scale(1)';}}>
                        <img src={selMethod.qr} alt="QR Code" style={{ width:170, height:170, objectFit:'contain', borderRadius:12, display:'block' }} onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
                        <div style={{ position:'absolute', bottom:12, right:12, width:26, height:26, borderRadius:'50%', background:'rgba(0,0,0,.55)', display:'flex', alignItems:'center', justifyContent:'center', backdropFilter:'blur(6px)' }}>
                          <ZoomIn size={12} color="white"/>
                        </div>
                      </div>
                      <p style={{ fontSize:11, color:'rgba(255,255,255,.28)', marginTop:10 }}>🔍 Click to zoom in</p>
                    </>
                  ) : (
                    <div style={{ width:170, height:170, borderRadius:20, border:`2px dashed ${selMethod.borderColor}`, display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', gap:10, margin:'0 auto', background:selMethod.bgColor }}>
                      <div style={{ fontSize:36 }}>📷</div>
                      <span style={{ fontSize:11, color:'var(--dim)' }}>QR coming soon</span>
                    </div>
                  )}
                </div>
              )}

              {/* Fields */}
              <div style={{ display:'flex', flexDirection:'column', gap:8, marginBottom:14 }}>
                {selMethod.fields.map((f,i)=>(
                  <div key={i} style={{ background:'rgba(255,255,255,.03)', border:`1px solid ${selMethod.borderColor}`, borderRadius:12, padding:'12px 14px' }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                      <span style={{ fontSize:10, color:'rgba(255,255,255,.32)', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:700 }}>{f.label}</span>
                      {f.note&&<span style={{ fontSize:10, color:selMethod.color, fontWeight:600 }}>{f.note}</span>}
                    </div>
                    <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                      <code style={{ flex:1, fontSize:12, fontFamily:'monospace', color:'#fff', fontWeight:700, wordBreak:'break-all' }}>{f.value}</code>
                      {!f.value.startsWith('YOUR_')&&!f.value.startsWith('http')&&(
                        <button onClick={()=>{navigator.clipboard.writeText(f.value);toast.success(`${f.label} copied!`);}} style={{ padding:'4px 8px', borderRadius:7, background:'rgba(255,255,255,.06)', border:`1px solid ${selMethod.borderColor}`, cursor:'pointer', color:'var(--muted)', flexShrink:0 }}>
                          <Copy size={12}/>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {selMethod.id==='paypal'&&<PayPalButton amount={selAmount} user={user} onSuccess={onSuccess}/>}

              <div style={{ padding:'12px 14px', borderRadius:12, background:'rgba(255,255,255,.02)', border:'1px solid rgba(255,255,255,.04)', display:'flex', gap:10, alignItems:'flex-start', marginTop: selMethod.id==='paypal'?10:0 }}>
                <span style={{ fontSize:16 }}>💡</span>
                <p style={{ fontSize:11, color:'var(--muted)', lineHeight:1.65, margin:0 }}>{selMethod.instruction}</p>
              </div>
            </div>

            {/* RIGHT: Form */}
            <div style={{ padding:'24px' }}>
              {selMethod.id === 'paypal' ? (
                /* PayPal auto-capture — no manual form needed */
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,.3)', marginBottom:4 }}>Auto Payment</div>
                  <div style={{ padding:'12px 16px', borderRadius:12, background:'rgba(16,232,152,.06)', border:'1px solid rgba(16,232,152,.15)', display:'flex', alignItems:'center', gap:10 }}>
                    <CheckCircle size={14} color="var(--green)" style={{ flexShrink:0 }}/>
                    <span style={{ fontSize:12, color:'var(--muted)', lineHeight:1.5 }}>
                      Balance is <strong style={{ color:'var(--green)' }}>credited instantly</strong> after PayPal payment — no manual step needed.
                    </span>
                  </div>
                  <div style={{ background:'rgba(139,92,246,.06)', border:'1px solid rgba(139,92,246,.16)', borderRadius:14, padding:'13px 16px', display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:36,height:36,borderRadius:10,background:selMethod.bgColor,border:`1px solid ${selMethod.borderColor}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>{selMethod.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11,color:'var(--muted)',marginBottom:1 }}>Paying via {selMethod.label}</div>
                      <div style={{ fontSize:22,fontWeight:900,color:'#fff',letterSpacing:'-.02em' }}>${selAmount.toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign:'right',fontSize:10,color:'var(--green)',fontWeight:700 }}>⚡ Instant</div>
                  </div>
                  <PayPalButton amount={selAmount} user={user} onSuccess={onSuccess}/>
                </div>
              ) : (
                /* Manual form for all other methods */
                <>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,.3)', marginBottom:18 }}>Fill Payment Details</div>

                  {/* Email */}
                  <div style={{ marginBottom:16 }}>
                    <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,.4)', letterSpacing:'.08em', marginBottom:8, textTransform:'uppercase' }}>Your Email</label>
                    <input type="email" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}
                      style={{ width:'100%', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'13px 16px', color:'#fff', fontFamily:'inherit', fontSize:14, outline:'none', transition:'all .2s' }}
                      onFocus={e=>{e.target.style.borderColor='rgba(139,92,246,.45)';e.target.style.boxShadow='0 0 0 3px rgba(139,92,246,.1)';}}
                      onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,.08)';e.target.style.boxShadow='none';}}
                    />
                  </div>

                  {/* TXN ID */}
                  <div style={{ marginBottom:16 }}>
                    <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,.4)', letterSpacing:'.08em', marginBottom:8, textTransform:'uppercase' }}>Transaction ID</label>
                    <input type="text" placeholder="Paste your TXN / reference ID..." value={txnId} onChange={e=>setTxnId(e.target.value)}
                      style={{ width:'100%', background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', borderRadius:12, padding:'13px 16px', color:'#fff', fontFamily:'monospace', fontSize:13, outline:'none', transition:'all .2s', letterSpacing:'0.5px' }}
                      onFocus={e=>{e.target.style.borderColor='rgba(139,92,246,.45)';e.target.style.boxShadow='0 0 0 3px rgba(139,92,246,.1)';}}
                      onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,.08)';e.target.style.boxShadow='none';}}
                    />
                    <p style={{ fontSize:11, color:'var(--dim)', marginTop:6 }}>From your payment receipt or confirmation</p>
                  </div>

                  {/* Screenshot */}
                  <div style={{ marginBottom:20 }}>
                    <label style={{ display:'block', fontSize:11, fontWeight:700, color:'rgba(255,255,255,.4)', letterSpacing:'.08em', marginBottom:8, textTransform:'uppercase' }}>Payment Screenshot</label>
                    <input type="file" ref={fileRef} accept="image/*" style={{ display:'none' }} onChange={handleFileChange}/>
                    {screenshotPreview ? (
                      <div style={{ position:'relative', borderRadius:14, overflow:'hidden', border:'1px solid rgba(16,232,152,.25)', cursor:'pointer' }} onClick={()=>fileRef.current?.click()}>
                        <img src={screenshotPreview} alt="Screenshot" style={{ width:'100%', maxHeight:140, objectFit:'cover', display:'block' }}/>
                        <div style={{ position:'absolute',top:8,right:8,background:'rgba(16,232,152,.15)',border:'1px solid rgba(16,232,152,.3)',borderRadius:20,padding:'3px 10px',fontSize:10,fontWeight:700,color:'var(--green)' }}>✓ Uploaded</div>
                        <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,.5)',display:'flex',alignItems:'center',justifyContent:'center',opacity:0,transition:'opacity .2s',fontSize:12,color:'#fff',fontWeight:700 }} onMouseEnter={e=>(e.currentTarget.style.opacity='1')} onMouseLeave={e=>(e.currentTarget.style.opacity='0')}>Change Screenshot</div>
                      </div>
                    ) : (
                      <div onClick={()=>fileRef.current?.click()} style={{ border:'2px dashed rgba(255,255,255,.09)', borderRadius:14, padding:'24px 16px', textAlign:'center', cursor:'pointer', transition:'all .2s', background:'rgba(255,255,255,.02)' }}
                        onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.borderColor='rgba(139,92,246,.3)';(e.currentTarget as HTMLDivElement).style.background='rgba(139,92,246,.04)';}}
                        onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.borderColor='rgba(255,255,255,.09)';(e.currentTarget as HTMLDivElement).style.background='rgba(255,255,255,.02)';}}>
                        <div style={{ width:40,height:40,borderRadius:11,background:'rgba(139,92,246,.1)',border:'1px solid rgba(139,92,246,.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 10px' }}>
                          <Upload size={18} color="var(--purple)"/>
                        </div>
                        <div style={{ fontSize:13,fontWeight:700,color:'rgba(255,255,255,.5)',marginBottom:4 }}>Upload payment proof</div>
                        <div style={{ fontSize:11,color:'var(--dim)' }}>JPG, PNG, WEBP · Click to browse</div>
                      </div>
                    )}
                  </div>

                  {/* Summary */}
                  <div style={{ background:'rgba(139,92,246,.06)', border:'1px solid rgba(139,92,246,.16)', borderRadius:14, padding:'13px 16px', marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:36,height:36,borderRadius:10,background:selMethod.bgColor,border:`1px solid ${selMethod.borderColor}`,display:'flex',alignItems:'center',justifyContent:'center',flexShrink:0 }}>{selMethod.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11,color:'var(--muted)',marginBottom:1 }}>{selMethod.label}</div>
                      <div style={{ fontSize:18,fontWeight:900,color:'#fff',letterSpacing:'-.02em' }}>${selAmount.toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign:'right',fontSize:10,color:'var(--muted)' }}>
                      <div>Pending admin</div>
                      <div style={{ color:'var(--amber)',fontWeight:700,marginTop:2 }}>~1–10 min</div>
                    </div>
                  </div>

                  <button onClick={()=>{
                    if(!txnId.trim()){toast.error('Enter your transaction ID');return;}
                    if(!email.trim()){toast.error('Enter your email');return;}
                    setStep(3);
                  }} className="btn btn-p btn-lg btn-full" style={{ borderRadius:14, fontSize:15, boxShadow:'0 0 30px rgba(109,40,217,.4)', padding:'15px' }}>
                    I've Sent Payment <ArrowRight size={16}/>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

      )}

      {/* ── STEP 3: Final Submit ── */}
      {step===3&&(
        <div className="pay-panel" style={{ maxWidth:520, margin:'0 auto' }}>
          <button onClick={()=>setStep(2)} style={{ display:'flex',alignItems:'center',gap:6,background:'none',border:'none',cursor:'pointer',color:'var(--muted)',fontSize:13,fontFamily:'inherit',marginBottom:20,padding:0 }}>
            <ArrowLeft size={14}/> Back
          </button>
          <div className="g" style={{ padding:'28px', borderRadius:20, marginBottom:16 }}>
            <div style={{ fontSize:11,fontWeight:700,color:'rgba(255,255,255,.4)',letterSpacing:'.1em',textTransform:'uppercase',marginBottom:18 }}>Review Your Submission</div>
            {[{l:'Method',v:selMethod.label},{l:'Amount',v:`$${selAmount.toFixed(2)}`},{l:'Email',v:email},{l:'Transaction ID',v:txnId}].map(r=>(
              <div key={r.l} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'11px 0',borderBottom:'1px solid rgba(255,255,255,.04)' }}>
                <span style={{ fontSize:12,color:'var(--muted)' }}>{r.l}</span>
                <span style={{ fontSize:13,fontWeight:700,color:'#fff',fontFamily:r.l==='Transaction ID'?'monospace':undefined,maxWidth:200,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }}>{r.v}</span>
              </div>
            ))}
            {screenshotPreview&&(
              <div style={{ marginTop:14 }}>
                <div style={{ fontSize:11,color:'var(--muted)',marginBottom:8 }}>Payment Screenshot</div>
                <img src={screenshotPreview} alt="Proof" style={{ width:'100%',maxHeight:110,objectFit:'cover',borderRadius:10 }}/>
              </div>
            )}
          </div>
          <div style={{ display:'flex',alignItems:'flex-start',gap:12,padding:'14px 18px',borderRadius:14,background:'rgba(251,191,36,.05)',border:'1px solid rgba(251,191,36,.14)',marginBottom:18 }}>
            <span style={{ fontSize:20 }}>⚡</span>
            <p style={{ fontSize:12,color:'var(--muted)',lineHeight:1.65,margin:0 }}>
              After submission, admin will verify and credit <strong style={{ color:'var(--green)' }}>${selAmount.toFixed(2)}</strong> to your balance within minutes.
            </p>
          </div>
          <button onClick={handleSubmit} disabled={submitting} className="btn btn-g btn-lg btn-full" style={{ borderRadius:14, fontSize:16, fontWeight:900, padding:'18px' }}>
            {submitting?<><Loader2 size={18} className="animate-spin"/> Submitting...</>:<><CheckCircle size={18}/> Confirm & Submit</>}
          </button>
        </div>
      )}
    </>
  );
}

// ══════════════════════════════════════════════════════════════
//  Main WalletPage
// ══════════════════════════════════════════════════════════════
export default function WalletPage() {
  const { t } = useTranslation();
  const { balance, deductBalance, refundBalance, addLicense, addBalance, user } = useAppStore();
  const [myTxns, setMyTxns] = useState<any[]>([]);
  const [txnsLoad, setTxnsLoad] = useState(false);
  const [purchaseSuccess, setPurchaseSuccess] = useState<{ product: any; keys: Array<{ key: string; panelId: string; panelName: string; expiresAt: string }> } | null>(null);
  const [confirmPending, setConfirmPending] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'products'|'deposit'|'history'>('products');

  const isAdmin   = user?.role === 'admin';
  const isSupport = user?.role === 'support';

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

  const handleBuy = async (product: any) => {
    if (balance < product.price) { toast.error('Insufficient balance. Add funds first.'); return; }
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
      refundBalance(product.price);
      const errDetail = errors.join(' | ');
      console.error('Key generation failed:', errDetail);
      toast.error(`❌ Key generation failed. $${product.price} refunded. Error: ${errDetail}`, { duration: 12000 });
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
    <>
      <style>{`
        .w-tab { padding:10px 18px; border-radius:12px; font-size:13px; font-weight:700; cursor:pointer; border:none; background:transparent; color:rgba(255,255,255,.38); font-family:inherit; transition:all .2s; display:flex; align-items:center; gap:8px; }
        .w-tab:hover { color:rgba(255,255,255,.75); background:rgba(255,255,255,.04); }
        .w-tab.wt-on { color:#fff; background:rgba(139,92,246,.15); border:1px solid rgba(139,92,246,.25); box-shadow:0 0 18px rgba(109,40,217,.2); }
      `}</style>

      {confirmPending&&<ConfirmModal product={{name:confirmPending.name||confirmPending.id,price:confirmPending.price,duration:`${confirmPending.days} days`,emoji:confirmPending.emoji}} onConfirm={()=>{const p=confirmPending;setConfirmPending(null);handleBuy(p);}} onCancel={()=>setConfirmPending(null)}/>}
      {purchaseSuccess&&<PurchaseSuccessModal data={purchaseSuccess} onClose={()=>setPurchaseSuccess(null)}/>}

      <div style={{ display:'flex', flexDirection:'column', gap:22 }}>

        {/* ── Hero Balance Card ── */}
        <div style={{ position:'relative', borderRadius:24, overflow:'hidden', padding:'28px 32px', background:'linear-gradient(135deg,rgba(109,40,217,.18) 0%,rgba(8,8,20,.95) 55%,rgba(16,232,152,.07) 100%)', border:'1px solid rgba(139,92,246,.2)', boxShadow:'0 0 80px rgba(109,40,217,.1),0 8px 40px rgba(0,0,0,.4)' }}>
          <div style={{ position:'absolute',top:-50,right:-50,width:180,height:180,borderRadius:'50%',background:'radial-gradient(circle,rgba(109,40,217,.28) 0%,transparent 70%)',pointerEvents:'none' }}/>
          <div style={{ position:'absolute',bottom:-40,left:20,width:140,height:140,borderRadius:'50%',background:'radial-gradient(circle,rgba(16,232,152,.1) 0%,transparent 70%)',pointerEvents:'none' }}/>
          <div style={{ position:'relative', display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:16 }}>
            <div>
              <div style={{ fontSize:11,fontWeight:700,letterSpacing:'.14em',textTransform:'uppercase',color:'rgba(255,255,255,.32)',marginBottom:10 }}>Available Balance</div>
              <div style={{ fontSize:58,fontWeight:900,color:'#fff',letterSpacing:'-.04em',lineHeight:1,textShadow:'0 0 50px rgba(139,92,246,.5)',marginBottom:10 }}>${balance.toFixed(2)}</div>
              <div style={{ display:'flex',alignItems:'center',gap:8 }}>
                <div style={{ display:'flex',alignItems:'center',gap:5,padding:'4px 12px',borderRadius:20,background:'rgba(16,232,152,.1)',border:'1px solid rgba(16,232,152,.2)' }}>
                  <div className="dot dot-green" style={{ width:5,height:5 }}/>
                  <span style={{ fontSize:11,fontWeight:700,color:'var(--green)' }}>Active Account</span>
                </div>
                <span style={{ fontSize:11,color:'var(--dim)' }}>Deposits credited on approval</span>
              </div>
            </div>
            <div style={{ display:'flex',flexDirection:'column',gap:10,alignSelf:'center' }}>
              <button onClick={()=>setActiveTab('deposit')} style={{ display:'flex',alignItems:'center',gap:8,padding:'12px 22px',borderRadius:14,background:'linear-gradient(135deg,#8b5cf6,#6d28d9)',border:'none',cursor:'pointer',color:'#fff',fontSize:14,fontWeight:800,fontFamily:'inherit',boxShadow:'0 0 28px rgba(109,40,217,.55)',transition:'all .2s',whiteSpace:'nowrap' }}
                onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.transform='translateY(-2px)';(e.currentTarget as HTMLButtonElement).style.boxShadow='0 0 40px rgba(109,40,217,.7)';}}
                onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.transform='none';(e.currentTarget as HTMLButtonElement).style.boxShadow='0 0 28px rgba(109,40,217,.55)';}}>
                <Wallet size={16}/> Add Funds
              </button>
              <button onClick={()=>setActiveTab('products')} style={{ display:'flex',alignItems:'center',gap:8,padding:'10px 22px',borderRadius:14,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.1)',cursor:'pointer',color:'rgba(255,255,255,.7)',fontSize:13,fontWeight:600,fontFamily:'inherit',transition:'all .2s',whiteSpace:'nowrap' }}
                onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.1)';}}
                onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.06)';}}>
                <ShoppingBag size={15}/> Buy Products
              </button>
            </div>
          </div>
        </div>

        {/* ── Tabs ── */}
        <div style={{ display:'flex', alignItems:'center', gap:4, padding:'5px', background:'rgba(255,255,255,.03)', borderRadius:14, border:'1px solid rgba(255,255,255,.05)', width:'fit-content' }}>
          {([
            { id:'products', icon:<ShoppingBag size={14}/>, label:'Products' },
            { id:'deposit',  icon:<Wallet size={14}/>,     label:'Add Balance' },
            { id:'history',  icon:<RefreshCw size={14}/>,  label:'History' },
          ] as const).map(tab=>(
            <button key={tab.id} className={`w-tab${activeTab===tab.id?' wt-on':''}`} onClick={()=>setActiveTab(tab.id)}>
              {tab.icon}{tab.label}
              {tab.id==='history'&&myTxns.filter(t=>t.status==='pending').length>0&&(
                <span style={{ background:'var(--amber)',color:'#000',fontSize:9,fontWeight:900,padding:'1px 6px',borderRadius:10,lineHeight:1.6 }}>{myTxns.filter(t=>t.status==='pending').length}</span>
              )}
            </button>
          ))}
        </div>

        {/* Products Tab */}
        {activeTab==='products'&&(
          <div style={{ animation:'fu .4s cubic-bezier(.16,1,.3,1) both' }}>
            <div style={{ display:'flex',alignItems:'center',gap:10,marginBottom:18 }}>
              <div style={{ fontSize:18,fontWeight:800,color:'#fff' }}>Buy Products</div>
              <div style={{ display:'flex',alignItems:'center',gap:6,padding:'4px 12px',borderRadius:20,background:'rgba(16,232,152,.08)',border:'1px solid rgba(16,232,152,.2)' }}>
                <div className="dot dot-green" style={{ width:5,height:5 }}/>
                <span style={{ fontSize:11,fontWeight:700,color:'var(--green)' }}>OB52 Undetected</span>
              </div>
            </div>
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:16 }}>
              {PANEL_GROUPS.map(group=>(
                <PanelProductCard key={group.id} group={group} balance={balance} onBuy={(p)=>setConfirmPending(p)}/>
              ))}
            </div>
          </div>
        )}

        {/* Deposit Tab */}
        {activeTab==='deposit'&&(
          <div style={{ animation:'fu .4s cubic-bezier(.16,1,.3,1) both' }}>
            <AddBalanceUI user={user} onSuccess={loadTxns}/>
          </div>
        )}

        {/* History Tab */}
        {activeTab==='history'&&(
          <div style={{ animation:'fu .4s cubic-bezier(.16,1,.3,1) both' }}>
            <div style={{ background:'rgba(255,255,255,.025)',border:'1px solid var(--border)',borderRadius:20,padding:'22px 24px' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20 }}>
                <div style={{ fontSize:16,fontWeight:700,color:'#fff' }}>Transaction History</div>
                <button onClick={loadTxns} disabled={txnsLoad} style={{ background:'none',border:'none',cursor:'pointer',color:'var(--dim)',padding:6,borderRadius:8,display:'flex',alignItems:'center',gap:5,fontSize:12,fontFamily:'inherit',transition:'color .15s' }} onMouseEnter={e=>(e.currentTarget.style.color='var(--muted)')} onMouseLeave={e=>(e.currentTarget.style.color='var(--dim)')}>
                  <RefreshCw size={13} className={txnsLoad?'animate-spin':''}/> Refresh
                </button>
              </div>
              {txnsLoad
                ? <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'32px 0',color:'var(--muted)' }}><Loader2 size={15} className="animate-spin"/><span style={{fontSize:13}}>Loading...</span></div>
                : myTxns.length===0
                ? <div style={{ textAlign:'center',padding:'48px 0' }}>
                    <div style={{ fontSize:36,marginBottom:12 }}>📭</div>
                    <p style={{ fontSize:14,color:'var(--muted)',fontWeight:600,marginBottom:4 }}>No transactions yet</p>
                    <p style={{ fontSize:12,color:'var(--dim)' }}>Add balance to see your history here</p>
                  </div>
                : <div style={{ display:'flex',flexDirection:'column',gap:8 }}>
                    {myTxns.map(tx=>{
                      const m = PAYMENT_METHODS.find(p=>p.id===tx.method);
                      const sc = tx.status==='approved'?'var(--green)':tx.status==='rejected'?'var(--red)':'var(--amber)';
                      const sbg = tx.status==='approved'?'rgba(16,232,152,.06)':tx.status==='rejected'?'rgba(248,113,113,.06)':'rgba(251,191,36,.06)';
                      const sbc = tx.status==='approved'?'rgba(16,232,152,.14)':tx.status==='rejected'?'rgba(248,113,113,.14)':'rgba(251,191,36,.14)';
                      return (
                        <div key={tx.id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'14px 16px',background:sbg,border:`1px solid ${sbc}`,borderRadius:14 }}>
                          <div style={{ display:'flex',alignItems:'center',gap:12 }}>
                            <div style={{ width:38,height:38,borderRadius:10,background:'rgba(255,255,255,.05)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0 }}>{m?.icon??<span style={{fontSize:16}}>💳</span>}</div>
                            <div>
                              <div style={{ fontSize:14,fontWeight:700,color:'#fff' }}>${tx.amount} <span style={{ fontSize:11,color:'var(--muted)',fontWeight:500 }}>via {m?.label??tx.method}</span></div>
                              <div style={{ fontSize:11,color:'var(--dim)',marginTop:2 }}>{new Date(tx.created_at).toLocaleDateString()} · <code style={{ fontFamily:'monospace',fontSize:10 }}>{tx.transaction_id}</code></div>
                            </div>
                          </div>
                          <span style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:20,background:sbg,border:`1px solid ${sbc}`,fontSize:11,fontWeight:700,color:sc,flexShrink:0 }}>
                            {tx.status==='approved'?'✓ Approved':tx.status==='rejected'?'✗ Rejected':'⏳ Pending'}
                          </span>
                        </div>
                      );
                    })}
                  </div>
              }
            </div>
          </div>
        )}
      </div>
    </>
  );
}
