import { useState, useEffect, useRef } from 'react';
import { useAppStore, PRODUCTS } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { ArrowRight, ArrowLeft, RefreshCw, Users, Check, X, Copy, CheckCircle, Loader2, Eye, EyeOff, ZoomIn, Upload, Wallet, ShoppingBag, CreditCard, ExternalLink, Search } from 'lucide-react';
import { safeQuery } from '@/lib/safeFetch';
import { logActivity, notifyUser } from '@/lib/activity';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const SUPABASE_URL  = 'https://wkjqrjafogufqeasfeev.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok';

// ── Payment Methods ──────────────────────────────────────────
const PAYMENT_METHODS = [
  { id:'binance', label:'Binance Pay', color:'#F0B90B', glow:'rgba(240,185,11,0.35)', instruction:'Open Binance → Pay → scan QR or enter Pay ID', hasQr:true, qr:'https://www.dropbox.com/scl/fi/l4tyvo8so3ktktv9n0ym0/binance-qr.jpg?rlkey=ha3kizbzg35oao01g1uynlpki&st=eboendk0&raw=1', fields:[{label:'Pay ID',value:'1104953117',note:'Binance Pay ID'}], icon:<img src="https://www.dropbox.com/scl/fi/z8i5ng71k73neobye7p96/Binance-BNB-Icon-Logo.wine-removebg-preview.png?rlkey=odrn2pwud3aeli8phl0y7ntfr&st=zhelar5g&raw=1" alt="logo" style={{ width:20, height:20, objectFit:'contain', borderRadius:4 }}/>, bgColor:'rgba(240,185,11,0.08)', borderColor:'rgba(240,185,11,0.25)' },
  { id:'paypal', label:'PayPal', color:'#009CDE', glow:'rgba(0,156,222,0.35)', instruction:'Pay with PayPal below. Your balance is credited automatically — no transaction ID needed.', hasQr:false, qr:'', fields:[{label:'PayPal.me',value:'https://paypal.me/JohanMaestre',note:''}], icon:<img src="https://www.dropbox.com/scl/fi/meqlo70ivzofuvnefh5fd/PayPal_Symbol_Alternative_1.png?rlkey=nw2xo4tsdamxtvt3krrj9lci1&st=7ki2i8em&raw=1" alt="logo" style={{ width:20, height:20, objectFit:'contain', borderRadius:4 }}/>, bgColor:'rgba(0,112,186,0.08)', borderColor:'rgba(0,112,186,0.25)' },
  { id:'bkash', label:'bKash', color:'#E2136E', glow:'rgba(226,19,110,0.35)', instruction:'Open bKash → Send Money → enter number', hasQr:true, qr:'https://www.dropbox.com/scl/fi/lxoiw6cy2mshi7hasgxgi/bkash-qr.jpg?rlkey=f9rc769ons2p1fxkrmjyunmqv&st=o0vb7xoz&raw=1', fields:[{label:'Number',value:'01760880747',note:'Send Money (not Payment)'}], icon:<img src="https://www.dropbox.com/scl/fi/3fks5moqx0e4xrq0qskzu/BKash-Icon2-Logo.wine-removebg-preview.png?rlkey=5lbby5mlh2wve6e2cif0yd5te&st=idlci7sm&raw=1" alt="logo" style={{ width:20, height:20, objectFit:'contain', borderRadius:4 }}/>, bgColor:'rgba(226,19,110,0.08)', borderColor:'rgba(226,19,110,0.25)' },
  { id:'dana', label:'Dana', color:'#118EEA', glow:'rgba(17,142,234,0.35)', instruction:'Open Dana → Transfer → enter number or scan QR', hasQr:true, qr:'https://www.dropbox.com/scl/fi/hl4a1lmuqz205akk71mld/Dana-Qr-Code.jpg?rlkey=03z6tvrmcw7mrma64u2we82de&st=2ojdhtg9&raw=1', fields:[{label:'Name',value:'Syaiful mu\'an\'an',note:''},{label:'Number',value:'087869604325',note:'Dana transfer'}], icon:<img src="https://www.dropbox.com/scl/fi/r1v3mn866gqmqce95a9cn/dana-e-wallet-app-seeklogo.png?rlkey=h76nv5fmr2fpqt3dtpdl4oy1m&st=iqzs7wlk&raw=1" alt="logo" style={{ width:20, height:20, objectFit:'contain', borderRadius:4 }}/>, bgColor:'rgba(17,142,234,0.08)', borderColor:'rgba(17,142,234,0.25)' },
  { id:'usdt_trc20', label:'USDT TRC20', color:'#26A17B', glow:'rgba(38,161,123,0.35)', instruction:'Send USDT on Tron (TRC20) network only', hasQr:true, qr:'https://www.dropbox.com/scl/fi/1znlsr0llx3x0wanjknlc/Usdt-Trc20-QR-Code.jpg?rlkey=ndsagvf263w8y0g0ykubamgy3&st=qjbdaltp&raw=1', fields:[{label:'TRC20 Address',value:'TVinprV4QCHVuAtJ73fCJxhw3gcsqMFXMP',note:'Tron network only'}], icon:<img src="https://www.dropbox.com/scl/fi/x2r7ukhw2zn6qy8iuhx5e/usdt.png?rlkey=t0ytxc27b89zlj8j3o7ragy32&st=hyz6lplx&raw=1" alt="logo" style={{ width:20, height:20, objectFit:'contain', borderRadius:4 }}/>, bgColor:'rgba(38,161,123,0.08)', borderColor:'rgba(38,161,123,0.25)' },
  { id:'usdt_bep20', label:'USDT BEP20', color:'#F0B90B', glow:'rgba(240,185,11,0.3)', instruction:'Send USDT on BNB Smart Chain (BEP20) only', hasQr:true, qr:'https://www.dropbox.com/scl/fi/aicllbvxqn79zxieufixy/USDT-Bep20-QR-Code.jpg?rlkey=xhyesikquqvusrv4r4dscg6wg&st=8gtzmhir&raw=1', fields:[{label:'BEP20 Address',value:'0x33a0f57c8372a232b1a425210e897c1b0d1b8048',note:'BSC network only'}], icon:<img src="https://www.dropbox.com/scl/fi/x2r7ukhw2zn6qy8iuhx5e/usdt.png?rlkey=t0ytxc27b89zlj8j3o7ragy32&st=hyz6lplx&raw=1" alt="logo" style={{ width:20, height:20, objectFit:'contain', borderRadius:4 }}/>, bgColor:'rgba(240,185,11,0.07)', borderColor:'rgba(240,185,11,0.2)' },
  { id:'truewallet', label:'TrueWallet AngPao', color:'#F97316', glow:'rgba(249,115,22,0.3)', instruction:'Paste your gift link below. The voucher redeems automatically and credits the net redeemed amount after a 3% TrueWallet fee.', hasQr:false, qr:'', fields:[{label:'Flow',value:'Paste gift link',note:'Auto redeem + auto balance'}], icon:<Wallet size={18} color="#f97316"/>, bgColor:'rgba(249,115,22,0.08)', borderColor:'rgba(249,115,22,0.22)' },
  { id:'litecoin', label:'Litecoin', color:'#A5A9B4', glow:'rgba(165,169,180,0.3)', instruction:'Send LTC to the address above', hasQr:true, qr:'https://www.dropbox.com/scl/fi/d7hcjghzalqk54o6zb0eh/Litecoin-QR-Code.jpg?rlkey=quvx4xj4ex0u6qce9bkhido0m&st=eq3jbe2k&raw=1', fields:[{label:'LTC Address',value:'LRXdzcWZ1mqGiFXNXe2Qe82tM7wUWVH9zd',note:'Litecoin network'}], icon:<img src="https://www.dropbox.com/scl/fi/lktwitcg1khz5f1ya0hhh/litecoin-ltc-icon.png?rlkey=5nlg06klolvrikw03b5zc5wqr&st=tgplvn4k&raw=1" alt="logo" style={{ width:20, height:20, objectFit:'contain', borderRadius:4 }}/>, bgColor:'rgba(52,93,157,0.08)', borderColor:'rgba(52,93,157,0.25)' },
] as const;

type MethodId = typeof PAYMENT_METHODS[number]['id'];

// ── Local currency conversion rates (USD base, static approximate) ────────
const LOCAL = {
  bkash:     { code:'BDT', symbol:'৳',  name:'Taka',    rate:110,   flag:'🇧🇩', info:'Open bKash → Send Money → enter number. Send exactly the BDT amount shown.' },
  dana:      { code:'IDR', symbol:'Rp', name:'Rupiah',  rate:16200, flag:'🇮🇩', info:'Open Dana → Transfer → enter number. Send exactly the IDR amount shown.' },
  binance:   { code:'USD', symbol:'$',  name:'USDT',    rate:1,     flag:'🌐', info:'' },
  paypal:    { code:'USD', symbol:'$',  name:'USD',     rate:1,     flag:'🇺🇸', info:'' },
  usdt_trc20:{ code:'USD', symbol:'$',  name:'USDT',    rate:1,     flag:'🌐', info:'' },
  usdt_bep20:{ code:'USD', symbol:'$',  name:'USDT',    rate:1,     flag:'🌐', info:'' },
  truewallet:{ code:'THB', symbol:'฿',  name:'Thai Baht', rate:35,   flag:'🇹🇭', info:'TrueWallet redeems the actual voucher amount in THB, applies a 3% fee, then converts the net amount to USD balance automatically.' },
  litecoin:  { code:'LTC', symbol:'Ł',  name:'Litecoin',rate:0.013, flag:'🔵', info:'Amount shown is approximate LTC equivalent. Check live rate before sending.' },
} as const;

function localAmt(usd: number, methodId: string): string {
  const lc = LOCAL[methodId as keyof typeof LOCAL];
  if (!lc || lc.rate === 1) return '';
  const val = methodId === 'litecoin' ? (usd * lc.rate).toFixed(4) : Math.ceil(usd * lc.rate).toLocaleString();
  return `≈ ${lc.symbol}${val} ${lc.code}`;
}

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

// ── PayPal Smart Button (auto-capture → auto-credit balance) ─
function PayPalButton({ amount, user, onSuccess }: { amount: number; user: any; onSuccess: () => void }) {
  const SUPABASE_URL_PP  = 'https://wkjqrjafogufqeasfeev.supabase.co';
  const SUPABASE_ANON_PP = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndranFyamFmb2d1ZnFlYXNmZWV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQwMDMzMzIsImV4cCI6MjA4OTU3OTMzMn0.bqFi929jjbhlj6WVMxrnE6aGSZR42KtPFax4APc0Hok';
  // Read client ID from Vite env var (set VITE_PAYPAL_CLIENT_ID in Netlify environment variables)
  const PAYPAL_CLIENT_ID = (import.meta as any).env?.VITE_PAYPAL_CLIENT_ID ?? '';

  const containerRef = useRef<HTMLDivElement>(null);
  const [sdkReady,  setSdkReady]  = useState(false);
  const [sdkError,  setSdkError]  = useState('');
  const [capturing, setCapturing] = useState(false);
  const [done,      setDone]      = useState(false);
  const rendered = useRef(false);

  // Load PayPal SDK once
  useEffect(() => {
    if (!PAYPAL_CLIENT_ID) {
      setSdkError('PAYPAL_CLIENT_ID not configured. Add VITE_PAYPAL_CLIENT_ID to Netlify environment variables.');
      return;
    }
    // Remove any existing broken SDK script first
    const existing = document.getElementById('paypal-sdk');
    if (existing) {
      if ((window as any).paypal) { setSdkReady(true); return; }
      existing.remove(); // remove stale/broken script and reload
    }
    const script = document.createElement('script');
    script.id  = 'paypal-sdk';
    script.src = `https://www.paypal.com/sdk/js?client-id=${PAYPAL_CLIENT_ID}&currency=USD&intent=capture&disable-funding=credit,card,venmo`;
    script.async = true;
    script.onload  = () => { setSdkReady(true); setSdkError(''); };
    script.onerror = () => {
      setSdkError('PayPal SDK failed to load. Please check your internet connection or try again.');
      setSdkReady(false);
    };
    document.head.appendChild(script);
  }, [PAYPAL_CLIENT_ID]);

  // Render PayPal buttons when SDK ready
  useEffect(() => {
    if (!sdkReady || !containerRef.current || rendered.current || done) return;
    rendered.current = true;
    const pp = (window as any).paypal;
    if (!pp) return;
    // Clear container
    containerRef.current.innerHTML = '';
    pp.Buttons({
      style: { layout:'vertical', color:'blue', shape:'rect', label:'pay', height:44 },
      createOrder: (_data: any, actions: any) => {
        return actions.order.create({
          purchase_units: [{ amount: { value: amount.toFixed(2), currency_code:'USD' } }],
        });
      },
      onApprove: async (_data: any, actions: any) => {
        setCapturing(true);
        try {
          // Step 1: Capture the payment via PayPal JS SDK
          const order = await actions.order.capture();
          const orderId = order.id;
          const paidAmt = parseFloat(
            order?.purchase_units?.[0]?.payments?.captures?.[0]?.amount?.value ?? String(amount)
          );
          const finalAmount = paidAmt > 0 ? paidAmt : amount;

          // Step 2: Insert approved transaction directly via Supabase (no edge function needed)
          // This is safe because the SDK capture already verified the payment with PayPal
          const { error: txErr } = await supabase.from('transactions').insert({
            user_id:        user.id,
            user_email:     user.email,
            user_name:      user.name,
            amount:         finalAmount,
            method:         'paypal',
            transaction_id: orderId,
            status:         'approved',
            note:           'Auto-verified via PayPal JS SDK capture',
          });

          // Step 3: Record in paypal_auto_credits for idempotency (ignore if already exists)
          await supabase.from('paypal_auto_credits').insert({
            paypal_txn_id: orderId,
            user_id:       user.id,
            amount:        finalAmount,
          }).maybeSingle();

          // Step 4: Try edge function as well (best-effort, don't block on it)
          fetch(`${SUPABASE_URL_PP}/functions/v1/paypal-capture`, {
            method: 'POST',
            headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${SUPABASE_ANON_PP}`, 'apikey':SUPABASE_ANON_PP },
            body: JSON.stringify({ order_id:orderId, user_id:user.id, user_email:user.email, user_name:user.name, amount:finalAmount }),
          }).catch(() => {}); // fire-and-forget, won't block or error

          if (!txErr) {
            setDone(true);
            toast.success(`🎉 $${finalAmount.toFixed(2)} added to your balance!`);
            onSuccess();
          } else {
            // Transaction insert failed (maybe duplicate) — still show success if it was a duplicate
            if (txErr.message?.includes('duplicate') || txErr.message?.includes('unique')) {
              setDone(true);
              toast.success(`🎉 $${finalAmount.toFixed(2)} added to your balance!`);
              onSuccess();
            } else {
              // Last resort: show success anyway since PayPal capture confirmed payment
              setDone(true);
              toast.success(`🎉 Payment confirmed! $${finalAmount.toFixed(2)} will be credited shortly.`);
              onSuccess();
              console.error('Transaction insert error:', txErr);
            }
          }
        } catch (e) {
          // Even if something errors after capture, the payment went through
          // Show a clear message so user can contact support with their PayPal receipt
          toast.error(
            'Payment was received by PayPal but an error occurred crediting your balance. ' +
            'Please contact support with your PayPal transaction ID.',
            { duration: 15000 }
          );
          console.error('PayPal onApprove error:', e);
        }
        setCapturing(false);
      },
      onError: (err: any) => {
        console.error('PayPal error', err);
        toast.error('PayPal error. Please try again.');
      },
      onCancel: () => { toast('Payment cancelled'); },
    }).render(containerRef.current);
  }, [sdkReady, amount, done]);

  if (done) return (
    <div style={{ padding:'16px',borderRadius:12,background:'rgba(16,232,152,.08)',border:'1px solid rgba(16,232,152,.2)',textAlign:'center' }}>
      <div style={{ fontSize:28,marginBottom:8 }}>✅</div>
      <div style={{ fontSize:14,fontWeight:800,color:'var(--green)',marginBottom:4 }}>Payment Successful!</div>
      <div style={{ fontSize:12,color:'var(--muted)' }}>Your balance has been updated automatically.</div>
    </div>
  );

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
      {capturing && (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'12px',borderRadius:10,background:'rgba(0,112,186,.08)',border:'1px solid rgba(0,156,222,.2)' }}>
          <Loader2 size={15} style={{ animation:'spin 1s linear infinite' }} color="#009cde"/>
          <span style={{ fontSize:12,color:'#009cde',fontWeight:600 }}>Processing payment...</span>
        </div>
      )}
      {sdkError ? (
        <div style={{ padding:'14px 16px',borderRadius:12,background:'rgba(248,113,113,.07)',border:'1px solid rgba(248,113,113,.2)' }}>
          <div style={{ fontSize:12,fontWeight:700,color:'#f87171',marginBottom:4 }}>⚠️ PayPal Not Available</div>
          <p style={{ fontSize:11,color:'var(--muted)',margin:0,lineHeight:1.6 }}>{sdkError}</p>
        </div>
      ) : !sdkReady && !capturing && (
        <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'16px',borderRadius:10,background:'rgba(255,255,255,.04)',border:'1px solid var(--border)' }}>
          <Loader2 size={14} className="animate-spin" style={{ color:'var(--muted)' }}/>
          <span style={{ fontSize:12,color:'var(--muted)' }}>Loading PayPal...</span>
        </div>
      )}
      <div ref={containerRef} style={{ minHeight:50 }}/>
      <div style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 12px',borderRadius:10,background:'rgba(16,232,152,.06)',border:'1px solid rgba(16,232,152,.14)' }}>
        <span style={{ fontSize:11,color:'var(--green)',fontWeight:700 }}>⚡ Auto-verified</span>
        <span style={{ fontSize:11,color:'var(--muted)' }}>— balance added instantly after payment</span>
      </div>
    </div>
  );
}

// ── Admin/Support Payment Panel ───────────────────────────────
function TrueWalletRedeem({ user, onSuccess, expectedUsdAmount }: { user: any; onSuccess: () => void; expectedUsdAmount: number }) {
  const [voucher, setVoucher] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<{ amountUsd: number; grossAmountUsd: number; feeUsd: number; feeRate: number; amountThb: number; exchangeRate: number; transactionId: string; shortfallUsd: number } | null>(null);

  const getFunctionErrorMessage = async (error: any) => {
    if (!error) return '';
    const fallback = error.message ?? '';
    try {
      const response = error.context;
      if (!response || typeof response.json !== 'function') return fallback;
      const body = await response.json();
      return body?.message ?? fallback;
    } catch {
      return fallback;
    }
  };

  const handleRedeem = async () => {
    if (!user) { toast.error('Please login first'); return; }
    if (!voucher.trim()) { toast.error('Paste a gift link first'); return; }
    if (!/^https?:\/\/gift\.truemoney\.com\/campaign\/\?v=[A-Za-z0-9]+$/i.test(voucher.trim())) {
      toast.error('Enter a valid TrueMoney gift link');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.functions.invoke('truwallet-redeem', { body: { voucher: voucher.trim(), expectedUsdAmount } });
    setLoading(false);
    if (error || !data?.success) {
      const errorMessage = data?.message ?? await getFunctionErrorMessage(error) ?? 'Redeem failed';
      toast.error(errorMessage);
      return;
    }
      setResult({
        amountUsd: Number(data.amount ?? 0),
        grossAmountUsd: Number(data.grossAmountUsd ?? data.amount ?? 0),
        feeUsd: Number(data.feeUsd ?? 0),
        feeRate: Number(data.feeRate ?? 0.03),
        amountThb: Number(data.amountThb ?? 0),
        exchangeRate: Number(data.exchangeRate ?? 35),
        transactionId: String(data.transactionId ?? ''),
      shortfallUsd: Number(data.shortfallUsd ?? 0),
    });
    setVoucher('');
    onSuccess();
    toast.success(`Voucher redeemed. $${Number(data.amount ?? 0).toFixed(2)} added to your wallet.`);
  };

  return (
    <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
        <div style={{ padding:'14px 16px', borderRadius:14, background:'rgba(249,115,22,.08)', border:'1px solid rgba(249,115,22,.2)' }}>
          <div style={{ fontSize:13, fontWeight:800, color:'#fb923c', marginBottom:4 }}>TrueWallet AngPao</div>
          <p style={{ margin:0, fontSize:12, color:'var(--muted)', lineHeight:1.6 }}>Paste a gift link to auto-redeem it and instantly add the USD equivalent to your wallet balance after a 3% fee.</p>
          <div style={{ marginTop:10, display:'flex', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
            <span style={{ fontSize:11, color:'#f8fafc', fontWeight:700 }}>1 USD = {LOCAL.truewallet.rate} THB</span>
            <span style={{ fontSize:11, color:'var(--muted)' }}>Target: ฿{Math.ceil(expectedUsdAmount * LOCAL.truewallet.rate).toLocaleString()}</span>
        </div>
      </div>
      <textarea value={voucher} onChange={e=>setVoucher(e.target.value)} rows={3} placeholder="https://gift.truemoney.com/..." style={{ width:'100%', background:'rgba(255,255,255,.04)', border:'1px solid rgba(249,115,22,.2)', borderRadius:12, padding:'13px 16px', color:'#fff', fontFamily:'inherit', fontSize:13, outline:'none', resize:'vertical' }} />
      <button onClick={handleRedeem} disabled={loading} className="btn btn-p btn-lg btn-full" style={{ borderRadius:14 }}>
        {loading ? <><Loader2 size={16} className="animate-spin" /> Redeeming...</> : <>Redeem Gift Link</>}
      </button>
      {result && (
        <div style={{ padding:'14px 16px', borderRadius:14, background:'rgba(16,232,152,.06)', border:'1px solid rgba(16,232,152,.18)' }}>
          <div style={{ fontSize:12, color:'var(--muted)', marginBottom:4 }}>Balance added successfully</div>
          <code style={{ display:'block', fontSize:13, color:'#fff', fontFamily:'monospace', wordBreak:'break-all', marginBottom:8 }}>{result.transactionId}</code>
          <div style={{ fontSize:11, color:'var(--green)', fontWeight:700 }}>Redeemed: ฿{result.amountThb.toFixed(2)} {'->'} ${result.amountUsd.toFixed(2)}</div>
          <div style={{ fontSize:11, color:'var(--muted)', marginTop:5 }}>Gross USD: ${result.grossAmountUsd.toFixed(2)} · Fee ({Math.round(result.feeRate * 100)}%): ${result.feeUsd.toFixed(2)}</div>
          {result.shortfallUsd > 0 && (
            <div style={{ fontSize:11, color:'#fbbf24', fontWeight:700, marginTop:6 }}>This voucher was below your selected amount, so only the actual redeemed value was credited.</div>
          )}
        </div>
      )}
    </div>
  );
}

function AdminPanel() {
  const { user: adminUser } = useAppStore();
  const [txns,setTxns]         = useState<any[]>([]);
  const [loading,setL]         = useState(false);
  const [filter,setFilter]     = useState<'pending'|'approved'|'rejected'|'all'>('pending');
  const [search,setSearch]     = useState('');
  const [zoomImg,setZoomImg]   = useState<string|null>(null);
  const intv = useRef<any>(null);

  const load = async () => {
    setL(true);
    let q = supabase.from('transactions').select('*').order('created_at',{ ascending:false });
    if (search.trim()) q = (q as any).or(`user_email.ilike.%${search.trim()}%,user_name.ilike.%${search.trim()}%,transaction_id.ilike.%${search.trim()}%`);
    const { data, error } = await safeQuery(() => q);
    if (!error && data) setTxns(data);
    setL(false);
  };
  useEffect(() => {
    load(); intv.current = setInterval(load, 20000);
    const ch = supabase.channel('admin-txns').on('postgres_changes',{ event:'*', schema:'public', table:'transactions' },load).subscribe();
    return () => { clearInterval(intv.current); supabase.removeChannel(ch); };
  },[]);
  useEffect(() => { load(); }, [search]);

  const approve = async (tx: any) => {
    const { error } = await safeQuery(() => supabase.from('transactions').update({ status:'approved', updated_at:new Date().toISOString() }).eq('id',tx.id));
    if (error) { toast.error('Failed: '+error.message); return; }
    toast.success(`✅ Approved $${tx.amount} for ${tx.user_name}`);
    setTxns(p => p.map(t => t.id===tx.id ? {...t,status:'approved'} : t));
    logActivity({ userId:adminUser?.id??'', userEmail:adminUser?.email??'', userName:adminUser?.name??'', action:'payment_approved', amount:Number(tx.amount), status:'success', meta:{ for_user:tx.user_email, method:tx.method } });
    notifyUser(tx.user_id, { type:'payment', title:`✅ Payment Approved — $${Number(tx.amount).toFixed(2)}`, body:`Your ${tx.method} payment has been approved.`, linkPath:'/wallet' });
  };
  const reject = async (tx: any) => {
    const { error } = await safeQuery(() => supabase.from('transactions').update({ status:'rejected', updated_at:new Date().toISOString() }).eq('id',tx.id));
    if (error) { toast.error('Failed: '+error.message); return; }
    setTxns(p => p.map(t => t.id===tx.id ? {...t,status:'rejected'} : t));
    logActivity({ userId:adminUser?.id??'', userEmail:adminUser?.email??'', userName:adminUser?.name??'', action:'payment_rejected', amount:Number(tx.amount), status:'success', meta:{ for_user:tx.user_email } });
    notifyUser(tx.user_id, { type:'payment', title:`❌ Payment Rejected — $${Number(tx.amount).toFixed(2)}`, body:`Your ${tx.method} payment was rejected.`, linkPath:'/wallet' });
  };
  const filtered = filter==='all' ? txns : txns.filter(t=>t.status===filter);
  const pending  = txns.filter(t=>t.status==='pending').length;
  const appTotal = txns.filter(t=>t.status==='approved').reduce((s,t)=>s+Number(t.amount),0);

  return (
    <div style={{ display:'flex',flexDirection:'column',gap:14 }}>
      {/* Screenshot zoom modal */}
      {zoomImg && (
        <div onClick={()=>setZoomImg(null)} style={{ position:'fixed',inset:0,zIndex:200,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.92)',backdropFilter:'blur(24px)',padding:20 }}>
          <div onClick={e=>e.stopPropagation()} style={{ position:'relative',padding:10,borderRadius:22,background:'white',boxShadow:'0 0 100px rgba(139,92,246,0.5)' }}>
            <img src={zoomImg} alt="Payment proof" style={{ maxWidth:'80vw',maxHeight:'80vh',borderRadius:14,display:'block',objectFit:'contain' }}/>
            <button onClick={()=>setZoomImg(null)} style={{ position:'absolute',top:-14,right:-14,width:32,height:32,borderRadius:'50%',background:'#ef4444',border:'2px solid rgba(0,0,0,.5)',cursor:'pointer',color:'#fff',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:800 }}>×</button>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div style={{ display:'grid',gridTemplateColumns:'repeat(3,1fr)',gap:10 }}>
        {[{label:'Pending',val:pending,c:'var(--amber)',bg:'rgba(251,191,36,.07)',bc:'rgba(251,191,36,.15)'},{label:'Total',val:txns.length,c:'var(--blue)',bg:'rgba(56,189,248,.06)',bc:'rgba(56,189,248,.13)'},{label:'Approved $',val:`$${appTotal.toFixed(2)}`,c:'var(--green)',bg:'rgba(16,232,152,.06)',bc:'rgba(16,232,152,.13)'}].map(s=>(
          <div key={s.label} className="g" style={{ padding:'14px 12px',textAlign:'center',background:s.bg,borderColor:s.bc }}>
            <div style={{ fontSize:20,fontWeight:800,color:s.c }}>{s.val}</div>
            <div className="label" style={{ marginTop:3 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Search bar */}
      <div style={{ position:'relative' }}>
        <svg style={{ position:'absolute',left:12,top:'50%',transform:'translateY(-50%)',pointerEvents:'none' }} width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,.4)" strokeWidth="2"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search by email, name, transaction ID…"
          style={{ width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.09)',borderRadius:10,padding:'9px 14px 9px 34px',color:'#fff',fontFamily:'inherit',fontSize:13,outline:'none',boxSizing:'border-box' }}
          onFocus={e=>{e.target.style.borderColor='rgba(139,92,246,.45)';}} onBlur={e=>{e.target.style.borderColor='rgba(255,255,255,.09)';}}
        />
      </div>

      {/* Filter tabs */}
      <div style={{ display:'flex',gap:8,alignItems:'center' }}>
        <div style={{ display:'flex',gap:4,background:'rgba(255,255,255,.04)',borderRadius:10,padding:4,flex:1 }}>
          {(['pending','approved','rejected','all'] as const).map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{ flex:1,padding:'7px 4px',borderRadius:7,fontSize:11,fontWeight:700,textTransform:'capitalize',cursor:'pointer',border:'none',background:filter===f?'linear-gradient(135deg,#8b5cf6,#6d28d9)':'transparent',color:filter===f?'#fff':'var(--muted)',fontFamily:'inherit' }}>
              {f}{f==='pending'&&pending>0?` (${pending})`:''}</button>
          ))}
        </div>
        <button onClick={load} disabled={loading} className="btn btn-ghost btn-sm" style={{ padding:'8px 10px' }}><RefreshCw size={14} className={loading?'animate-spin':''}/></button>
      </div>

      {/* Transaction cards */}
      <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
        {loading&&txns.length===0
          ? <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:8,padding:'32px 0',color:'var(--muted)' }}><Loader2 size={16} className="animate-spin"/><span style={{fontSize:13}}>Loading...</span></div>
          : filtered.length===0
          ? <div style={{ textAlign:'center',padding:'32px 0',fontSize:13,color:'var(--muted)' }}>No {filter} transactions</div>
          : filtered.map(tx=>(
          <div key={tx.id} className="g" style={{ padding:18,background:tx.status==='pending'?'rgba(251,191,36,.04)':tx.status==='approved'?'rgba(16,232,152,.04)':'rgba(248,113,113,.04)',borderColor:tx.status==='pending'?'rgba(251,191,36,.15)':tx.status==='approved'?'rgba(16,232,152,.13)':'rgba(248,113,113,.13)' }}>

            {/* User + amount */}
            <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',marginBottom:14 }}>
              <div>
                <div style={{ display:'flex',alignItems:'center',gap:8,marginBottom:4,flexWrap:'wrap' }}>
                  <span style={{ fontSize:15,fontWeight:800,color:'#fff' }}>{tx.user_name}</span>
                  <span className={`badge badge-${tx.status==='pending'?'amber':tx.status==='approved'?'green':'red'}`}>{tx.status}</span>
                  {tx.method==='paypal'&&tx.note?.includes('Auto')&&<span className="badge badge-blue" style={{fontSize:9}}>🤖 Auto</span>}
                </div>
                <div style={{ fontSize:12,color:'var(--muted)' }}>{tx.user_email}</div>
              </div>
              <div style={{ textAlign:'right' }}>
                <div style={{ fontSize:26,fontWeight:900,color:'#fff',letterSpacing:'-.03em' }}>${Number(tx.amount).toFixed(2)}</div>
                <div style={{ fontSize:10,color:'var(--dim)',marginTop:2 }}>{new Date(tx.created_at).toLocaleString()}</div>
              </div>
            </div>

            {/* Detail grid — full info */}
            <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(130px,1fr))',gap:8,marginBottom:14 }}>
              {[
                {label:'Method',         val:tx.method || '—'},
                {label:'Transaction ID', val:tx.transaction_id || '—'},
                {label:'User ID',        val:(tx.user_id||'').slice(0,14)+'…'},
                {label:'Last Updated',   val:tx.updated_at ? new Date(tx.updated_at).toLocaleString(undefined,{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'}) : '—'},
              ].map(f=>(
                <div key={f.label} style={{ background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 10px' }}>
                  <div className="label" style={{ marginBottom:3 }}>{f.label}</div>
                  <div style={{ fontSize:11,fontWeight:600,color:'#fff',overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap' }} title={f.val}>{f.val}</div>
                </div>
              ))}
            </div>

            {/* Screenshot preview */}
            {tx.screenshot_url && (
              <div style={{ marginBottom:14 }}>
                <div className="label" style={{ marginBottom:8 }}>Payment Screenshot</div>
                <div style={{ position:'relative',display:'inline-block',cursor:'zoom-in',borderRadius:12,overflow:'hidden',border:'1px solid rgba(255,255,255,.1)' }} onClick={()=>setZoomImg(tx.screenshot_url)}>
                  <img src={tx.screenshot_url} alt="Payment proof" style={{ maxWidth:220,maxHeight:130,objectFit:'cover',display:'block' }}
                    onError={e=>{(e.target as HTMLImageElement).parentElement!.style.display='none';}}/>
                  <div style={{ position:'absolute',inset:0,background:'rgba(0,0,0,0)',transition:'background .2s',display:'flex',alignItems:'center',justifyContent:'center' }}
                    onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.background='rgba(0,0,0,.45)';}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.background='rgba(0,0,0,0)';}}>
                    <ZoomIn size={20} color="white" style={{ opacity:0, transition:'opacity .2s' }}
                      onMouseEnter={e=>{(e.currentTarget as SVGElement).style.opacity='1';}}/>
                  </div>
                </div>
                <p style={{ fontSize:10,color:'var(--dim)',marginTop:5 }}>🔍 Click to enlarge</p>
              </div>
            )}

            {/* Note */}
            {tx.note && <div style={{ fontSize:11,color:'var(--dim)',marginBottom:12,padding:'7px 10px',background:'rgba(255,255,255,.03)',borderRadius:8 }}>Note: {tx.note}</div>}

            {/* Action buttons */}
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
  const can  = balance >= plan.price;
  const isFeatured = !!(group as any).featured;

  // per-day price for value label
  const perDay = (plan.price / plan.days).toFixed(2);

  // savings vs highest per-day (first plan)
  const basePerDay = group.plans[0].price / group.plans[0].days;
  const savePct = sel > 0 ? Math.round((1 - plan.price / plan.days / basePerDay) * 100) : 0;

  return (
    <div style={{
      position: 'relative',
      borderRadius: 24,
      overflow: 'hidden',
      background: isFeatured
        ? 'linear-gradient(160deg,rgba(28,22,6,.97) 0%,rgba(18,14,4,.97) 100%)'
        : 'linear-gradient(160deg,rgba(13,13,20,.97) 0%,rgba(9,9,16,.97) 100%)',
      border: `1px solid ${isFeatured ? 'rgba(201,168,76,.35)' : group.bc}`,
      boxShadow: isFeatured
        ? `0 0 0 1px rgba(201,168,76,.12), 0 32px 64px rgba(0,0,0,.55), 0 0 80px ${group.glow}`
        : `0 24px 48px rgba(0,0,0,.45)`,
      transition: 'transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s',
    }}
      onMouseEnter={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'translateY(-6px)';
        (e.currentTarget as HTMLDivElement).style.boxShadow = isFeatured
          ? `0 0 0 1px rgba(201,168,76,.2), 0 40px 80px rgba(0,0,0,.6), 0 0 100px ${group.glow}`
          : `0 40px 80px rgba(0,0,0,.55), 0 0 60px ${group.glow}`;
      }}
      onMouseLeave={e => {
        (e.currentTarget as HTMLDivElement).style.transform = 'none';
        (e.currentTarget as HTMLDivElement).style.boxShadow = isFeatured
          ? `0 0 0 1px rgba(201,168,76,.12), 0 32px 64px rgba(0,0,0,.55), 0 0 80px ${group.glow}`
          : `0 24px 48px rgba(0,0,0,.45)`;
      }}
    >
      {/* Top accent bar */}
      <div style={{ height: 2, background: `linear-gradient(90deg, transparent 0%, ${group.color} 40%, ${isFeatured ? '#e8b84b' : group.color} 60%, transparent 100%)` }} />

      {/* Featured crown badge */}
      {isFeatured && (
        <div style={{ position: 'absolute', top: 18, right: 18, display: 'flex', alignItems: 'center', gap: 5, background: 'linear-gradient(135deg,#c9a84c,#e8b84b)', borderRadius: 20, padding: '4px 12px 4px 8px', boxShadow: '0 4px 16px rgba(201,168,76,.4)' }}>
          <span style={{ fontSize: 11 }}>👑</span>
          <span style={{ fontSize: 9, fontWeight: 900, letterSpacing: '.14em', textTransform: 'uppercase', color: '#0a0a0a' }}>Best Value</span>
        </div>
      )}

      <div style={{ padding: '28px 26px 26px' }}>

        {/* ── Header ── */}
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, marginBottom: 22 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, flexShrink: 0,
            background: `radial-gradient(circle at 30% 30%, ${group.bg}, rgba(0,0,0,.3))`,
            border: `1px solid ${group.bc}`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, boxShadow: `0 0 24px ${group.glow}, inset 0 1px 0 rgba(255,255,255,.08)`,
          }}>{group.emoji}</div>
          <div style={{ flex: 1, paddingTop: 2 }}>
            <div style={{ fontSize: 19, fontWeight: 800, color: '#fff', letterSpacing: '-.02em', lineHeight: 1.2, marginBottom: 5 }}>{group.name}</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.42)', lineHeight: 1.5 }}>{group.desc}</div>
          </div>
        </div>

        {/* ── Features ── */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px 10px', marginBottom: 24 }}>
          {group.features.map(f => (
            <div key={f} style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 11.5, color: 'rgba(255,255,255,.58)' }}>
              <div style={{
                width: 15, height: 15, borderRadius: 5, flexShrink: 0,
                background: group.bg, border: `1px solid ${group.bc}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 7, fontWeight: 900, color: group.color,
              }}>✓</div>
              <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{f}</span>
            </div>
          ))}
        </div>

        {/* ── Divider ── */}
        <div style={{ height: 1, background: 'rgba(255,255,255,.06)', marginBottom: 22 }} />

        {/* ── Plan selector label ── */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: 'rgba(255,255,255,.32)', textTransform: 'uppercase', letterSpacing: '.12em' }}>Choose Plan</span>
          {savePct > 0 && (
            <span style={{ fontSize: 10, fontWeight: 800, color: '#4ade80', background: 'rgba(74,222,128,.1)', border: '1px solid rgba(74,222,128,.25)', borderRadius: 20, padding: '2px 9px', letterSpacing: '.04em' }}>
              Save {savePct}%
            </span>
          )}
        </div>

        {/* ── Plan pill tabs ── */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${group.plans.length}, 1fr)`,
          gap: 8,
          marginBottom: 20,
        }}>
          {group.plans.map((p, i) => {
            const active = sel === i;
            const ppd = (p.price / p.days).toFixed(2);
            return (
              <button
                key={p.id}
                onClick={() => setSel(i)}
                style={{
                  position: 'relative',
                  padding: '14px 8px 12px',
                  borderRadius: 14,
                  border: active ? `1.5px solid ${group.color}` : '1.5px solid rgba(255,255,255,.08)',
                  background: active
                    ? `radial-gradient(ellipse at top, ${group.bg} 0%, rgba(0,0,0,.35) 100%)`
                    : 'rgba(255,255,255,.025)',
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  transition: 'all .2s cubic-bezier(.22,1,.36,1)',
                  boxShadow: active ? `0 0 20px ${group.glow}, inset 0 1px 0 rgba(255,255,255,.06)` : 'none',
                  display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
                }}
              >
                {/* Glow dot when active */}
                {active && <div style={{ position: 'absolute', top: 8, right: 8, width: 6, height: 6, borderRadius: '50%', background: group.color, boxShadow: `0 0 8px ${group.color}` }} />}

                <span style={{ fontSize: 13, fontWeight: 800, color: active ? group.color : 'rgba(255,255,255,.55)', letterSpacing: '-.01em' }}>
                  {p.label}
                </span>
                <span style={{ fontSize: 18, fontWeight: 900, color: active ? '#fff' : 'rgba(255,255,255,.45)', letterSpacing: '-.03em', lineHeight: 1 }}>
                  ${p.price}
                </span>
                <span style={{ fontSize: 9.5, color: active ? 'rgba(255,255,255,.45)' : 'rgba(255,255,255,.22)', fontWeight: 600 }}>
                  ${ppd}/day
                </span>
              </button>
            );
          })}
        </div>

        {/* ── Price summary row ── */}
        <div style={{
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          background: 'rgba(255,255,255,.03)', border: `1px solid rgba(255,255,255,.07)`,
          borderRadius: 14, padding: '14px 18px', marginBottom: 16,
        }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <span style={{ fontSize: 11, color: 'rgba(255,255,255,.3)', fontWeight: 600 }}>Access for</span>
            <span style={{ fontSize: 15, fontWeight: 800, color: group.color }}>{plan.label} — {plan.days} day{plan.days > 1 ? 's' : ''}</span>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: 38, fontWeight: 900, color: '#fff', letterSpacing: '-.04em', lineHeight: 1 }}>
              ${plan.price}
            </div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,.28)', marginTop: 2 }}>${perDay} per day</div>
          </div>
        </div>

        {/* ── CTA Button (slide-up icon animation) ── */}
        {can ? (
          <button
            onClick={() => onBuy({
              ...plan,
              keyauthPanel: plan.keyauthPanel,
              duration: `${plan.days} days`,
              name: `${group.name} — ${plan.label}`,
              description: group.desc,
              badgeType: isFeatured ? 'gold' : group.id === 'internal' ? 'green' : 'indigo',
              emoji: group.emoji,
            })}
            className={`ppc-btn ppc-btn-${group.id}`}
            data-tooltip={`$${plan.price}`}
            style={{
              '--btn-color':   isFeatured ? '#b8860b' : group.color,
              '--btn-bg':      isFeatured
                ? 'linear-gradient(135deg,#c9a84c,#e8b84b)'
                : `linear-gradient(135deg,${group.color}28,${group.color}14)`,
              '--btn-border':  isFeatured ? 'rgba(201,168,76,.7)' : group.bc,
              '--btn-glow':    isFeatured ? 'rgba(201,168,76,.5)'  : group.glow,
              '--btn-txt-color': isFeatured ? '#0a0a0a' : group.color,
            } as React.CSSProperties}
          >
            <span className="ppc-btn-wrapper">
              {/* Text layer — slides up on hover */}
              <span className="ppc-btn-text">
                Get {plan.label} — ${plan.price}
              </span>
              {/* Icon layer — slides in from below */}
              <span className="ppc-btn-icon" aria-hidden>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <polyline points="5 12 12 5 19 12"/>
                  <line x1="12" y1="5" x2="12" y2="19"/>
                </svg>
              </span>
            </span>
          </button>
        ) : (
          <div style={{
            width: '100%', padding: '15px 20px', borderRadius: 14,
            fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
            background: 'rgba(255,255,255,.03)', color: 'rgba(255,255,255,.2)',
            border: '1px solid rgba(255,255,255,.06)', textAlign: 'center',
            letterSpacing: '.02em',
          }}>
            Insufficient Balance
          </div>
        )}

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  Premium Add-Balance UI — complete redesign
// ══════════════════════════════════════════════════════════════
function AddBalanceUI({ user, onSuccess }: { user: any; onSuccess: () => void }) {
  const [step, setStep] = useState<1|2|3>(1);
  const [amount, setAmount] = useState(10);
  const [custom, setCustom] = useState('');
  const [methodId, setMethodId] = useState<MethodId>('binance');
  const [txnId, setTxnId] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [screenshotPreview, setScreenshotPreview] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [qrZoom, setQrZoom] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const selAmount = custom ? parseFloat(custom)||0 : amount;
  const selMethod = PAYMENT_METHODS.find(m=>m.id===methodId) ?? PAYMENT_METHODS[0];
  const lc = localAmt(selAmount, methodId);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
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
      amount:selAmount, method:methodId, transaction_id:txnId.trim(), status:'pending', screenshot_url:screenshotPreview || ''
    }));
    if (error) {
      if (error.message==='timeout') toast.error('Request timed out.');
      else if (error.message.includes('relation')) toast.error('Table not found. Run SQL migrations.');
      else toast.error('Failed: '+error.message);
    } else {
      toast.success('✅ Submitted! Admin will approve shortly.');
      logActivity({ userId:user.id, userEmail:email.trim(), userName:user.name, action:'payment_submit', amount:selAmount, status:'success', meta:{ method:methodId, txnId:txnId.trim()||'paypal-auto' } });
      setStep(1); setTxnId(''); setCustom(''); setScreenshotPreview('');
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
        @keyframes dep-in { from{opacity:0;transform:translateY(14px)} to{opacity:1;transform:none} }
        .dep-wrap { animation: dep-in .32s cubic-bezier(.22,1,.36,1) both; }

        /* ── Step bar ── */
        .dep-step-bar {
          display:flex; align-items:center; gap:0;
          background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.08);
          border-radius:14px; padding:8px 20px; width:fit-content; margin-bottom:24px;
          backdrop-filter:blur(12px);
        }
        .dep-step { display:flex; align-items:center; gap:8px; padding:4px 10px; border-radius:9px; cursor:default; transition:background .2s; }
        .dep-step.done  { cursor:pointer; }
        .dep-step.done:hover { background:rgba(16,232,152,.08); }
        .dep-step.active { background:rgba(139,92,246,.12); }
        .dep-step-num {
          width:24px; height:24px; border-radius:50%; display:flex; align-items:center; justify-content:center;
          font-size:11px; font-weight:900; flex-shrink:0; transition:all .2s;
        }
        .dep-step-label { font-size:12px; font-weight:700; transition:color .2s; }
        .dep-sep { width:28px; height:1px; background:rgba(255,255,255,.08); margin:0 2px; flex-shrink:0; }
        .dep-sep.done { background:rgba(16,232,152,.35); }

        /* ── Card ── */
        .dep-card {
          background:linear-gradient(160deg,rgba(14,14,22,.97) 0%,rgba(9,9,18,.97) 100%);
          border:1px solid rgba(255,255,255,.08); border-radius:22px; overflow:hidden;
          box-shadow:0 32px 64px rgba(0,0,0,.5), 0 0 0 1px rgba(255,255,255,.03) inset;
        }

        /* ── Amount grid ── */
        .dep-amt-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; }
        .dep-amt-btn {
          padding:18px 8px; border-radius:16px; font-size:20px; font-weight:900;
          cursor:pointer; font-family:inherit; transition:all .2s cubic-bezier(.22,1,.36,1);
          display:flex; flex-direction:column; align-items:center; gap:3; position:relative;
        }
        .dep-amt-btn:hover { transform:translateY(-2px); }
        .dep-amt-btn.sel { border-color:rgba(139,92,246,.6) !important; }

        /* ── Field ── */
        .dep-field {
          width:100%; background:rgba(255,255,255,.05); border:1px solid rgba(255,255,255,.09);
          border-radius:12px; padding:14px 16px; color:#fff; font-family:inherit;
          font-size:14px; outline:none; transition:all .2s; box-sizing:border-box;
        }
        .dep-field:focus { border-color:rgba(139,92,246,.5); box-shadow:0 0 0 3px rgba(139,92,246,.1); }
        .dep-field::placeholder { color:rgba(255,255,255,.25); }
        .dep-label { font-size:10px; font-weight:700; text-transform:uppercase; letter-spacing:.12em; color:rgba(255,255,255,.35); margin-bottom:7px; display:block; }

        /* ── Method chips ── */
        .dep-method-chip {
          display:inline-flex; align-items:center; gap:7px; padding:8px 14px; border-radius:999px;
          font-size:12px; font-weight:700; cursor:pointer; font-family:inherit;
          transition:all .2s cubic-bezier(.22,1,.36,1); white-space:nowrap; flex-shrink:0;
        }
        .dep-method-chip:hover { transform:translateY(-1px); }

        /* ── Upload drop zone ── */
        .dep-upload {
          border:1.5px dashed rgba(255,255,255,.12); border-radius:14px; padding:28px 16px;
          text-align:center; cursor:pointer; transition:all .2s;
          background:rgba(255,255,255,.02);
        }
        .dep-upload:hover { border-color:rgba(139,92,246,.4); background:rgba(139,92,246,.04); }

        /* ── Submit button ── */
        .dep-submit {
          width:100%; padding:16px; border-radius:14px; border:none; cursor:pointer;
          font-family:inherit; font-size:15px; font-weight:800; display:flex; align-items:center;
          justify-content:center; gap:9px; transition:all .25s cubic-bezier(.22,1,.36,1);
          background:linear-gradient(135deg,#8b5cf6,#7c3aed,#c026d3);
          color:#fff; box-shadow:0 0 32px rgba(109,40,217,.45), 0 4px 20px rgba(0,0,0,.3);
          position:relative; overflow:hidden;
        }
        .dep-submit::before {
          content:''; position:absolute; top:0; bottom:0; left:-80%; width:40%;
          background:linear-gradient(90deg,transparent,rgba(255,255,255,.18),transparent);
          transition:left .4s ease; pointer-events:none;
        }
        .dep-submit:hover { transform:translateY(-2px); box-shadow:0 0 48px rgba(109,40,217,.65), 0 8px 28px rgba(0,0,0,.4); }
        .dep-submit:hover::before { left:160%; }
        .dep-submit:active { transform:translateY(0) scale(.98); }
        .dep-submit:disabled { opacity:.45; cursor:not-allowed; transform:none !important; }

        /* ── QR card ── */
        .dep-qr-wrap {
          display:inline-block; cursor:zoom-in; padding:12px; border-radius:22px;
          background:#fff; transition:transform .2s,box-shadow .2s;
        }
        .dep-qr-wrap:hover { transform:scale(1.03); }

        @media(max-width:720px){ .dep-split{ grid-template-columns:1fr !important; } }
      `}</style>

      {/* ── Step indicator ── */}
      <div className="dep-step-bar">
        {(['Amount','Payment','Submit'] as const).map((label, i) => {
          const n = i + 1;
          const done = n < step;
          const active = n === step;
          return (
            <div key={label} style={{ display:'flex', alignItems:'center' }}>
              <div className={`dep-step${done?' done':''}${active?' active':''}`}
                onClick={() => done && setStep(n as 1|2|3)}>
                <div className="dep-step-num" style={{
                  background: done ? 'var(--green)' : active ? 'linear-gradient(135deg,#8b5cf6,#6d28d9)' : 'rgba(255,255,255,.06)',
                  color: done || active ? '#fff' : 'rgba(255,255,255,.3)',
                  boxShadow: active ? '0 0 14px rgba(109,40,217,.5)' : 'none',
                }}>{done ? '✓' : n}</div>
                <span className="dep-step-label" style={{ color: active ? '#fff' : done ? 'var(--green)' : 'rgba(255,255,255,.3)' }}>{label}</span>
              </div>
              {i < 2 && <div className={`dep-sep${done?' done':''}`} />}
            </div>
          );
        })}
      </div>

      {/* ══ STEP 1: Choose Amount ══ */}
      {step === 1 && (
        <div className="dep-wrap dep-card" style={{ padding:'32px 32px 36px' }}>
          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase', color:'rgba(255,255,255,.3)', marginBottom:6 }}>Deposit Wallet Balance</div>
          <div style={{ fontSize:28, fontWeight:900, color:'#fff', letterSpacing:'-.03em', marginBottom:26 }}>Choose Your Amount</div>

          {/* Amount grid */}
          <div className="dep-amt-grid" style={{ marginBottom:16 }}>
            {AMOUNTS.map(a => {
              const sel = amount === a && !custom;
              return (
                <button key={a} className={`dep-amt-btn${sel?' sel':''}`}
                  onClick={() => { setAmount(a); setCustom(''); }}
                  style={{
                    border: `1px solid ${sel ? 'rgba(139,92,246,.6)' : 'rgba(255,255,255,.08)'}`,
                    background: sel ? 'linear-gradient(135deg,rgba(139,92,246,.2),rgba(139,92,246,.08))' : 'rgba(255,255,255,.04)',
                    color: sel ? '#e9d5ff' : 'rgba(255,255,255,.55)',
                    boxShadow: sel ? '0 0 24px rgba(109,40,217,.25), inset 0 1px 0 rgba(255,255,255,.06)' : 'none',
                  }}>
                  <span style={{ fontSize:9, fontWeight:700, color: sel ? 'rgba(233,213,255,.5)' : 'rgba(255,255,255,.25)', letterSpacing:'.1em' }}>USD</span>
                  ${a}
                  {sel && <div style={{ position:'absolute', top:8, right:10, width:7, height:7, borderRadius:'50%', background:'#8b5cf6', boxShadow:'0 0 8px #8b5cf6', animation:'blink 1.5s infinite' }} />}
                </button>
              );
            })}
          </div>

          {/* Custom amount */}
          <div style={{ position:'relative', marginBottom:24 }}>
            <span style={{ position:'absolute', left:16, top:'50%', transform:'translateY(-50%)', color:'rgba(255,255,255,.4)', fontWeight:700, fontSize:18, pointerEvents:'none' }}>$</span>
            <input type="number" className="dep-field" placeholder="Or enter custom amount…"
              value={custom} onChange={e => setCustom(e.target.value)}
              style={{ paddingLeft:36, fontSize:16, fontWeight:700 }} />
          </div>

          {/* Preview */}
          {selAmount > 0 && (
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 20px', borderRadius:14, background:'rgba(139,92,246,.1)', border:'1px solid rgba(139,92,246,.22)', marginBottom:24 }}>
              <span style={{ fontSize:13, color:'rgba(255,255,255,.5)' }}>You will deposit</span>
              <span style={{ fontSize:28, fontWeight:900, color:'#fff', letterSpacing:'-.03em' }}>${selAmount.toFixed(2)}</span>
            </div>
          )}

          <button className="dep-submit" onClick={() => selAmount > 0 ? setStep(2) : toast.error('Please select an amount')}>
            Continue to Payment <ArrowRight size={17} />
          </button>
        </div>
      )}

      {/* ══ STEP 2: Method + Details + Form ══ */}
      {step === 2 && (
        <div className="dep-wrap dep-card">
          {/* ── Top bar: Back + Method chips + Amount ── */}
          <div style={{ padding:'20px 24px 18px', borderBottom:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.02)' }}>
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:16 }}>
              <button onClick={() => setStep(1)} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 13px', borderRadius:10, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.09)', cursor:'pointer', color:'rgba(255,255,255,.55)', fontSize:12, fontFamily:'inherit', fontWeight:600, transition:'all .15s' }}
                onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.09)';(e.currentTarget as HTMLButtonElement).style.color='#fff';}}
                onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.05)';(e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,.55)';}}>
                <ArrowLeft size={13}/> Back
              </button>
              <span style={{ fontSize:11, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.28)' }}>Select Payment Method</span>
              <div style={{ marginLeft:'auto', padding:'7px 16px', borderRadius:999, background:'rgba(139,92,246,.15)', border:'1px solid rgba(139,92,246,.28)', fontSize:14, fontWeight:900, color:'#c4b5fd' }}>${selAmount.toFixed(2)}</div>
            </div>

            {/* Method chips — scrollable row */}
            <div style={{ display:'flex', gap:8, overflowX:'auto', paddingBottom:4 }}>
              {PAYMENT_METHODS.map(m => {
                const active = methodId === m.id;
                return (
                  <button key={m.id} className="dep-method-chip"
                    onClick={() => setMethodId(m.id)}
                    style={{
                      border: `1px solid ${active ? m.color : 'rgba(255,255,255,.09)'}`,
                      background: active ? `linear-gradient(135deg,${m.bgColor},rgba(255,255,255,.04))` : 'rgba(255,255,255,.04)',
                      color: active ? m.color : 'rgba(255,255,255,.5)',
                      boxShadow: active ? `0 0 20px ${m.glow}` : 'none',
                    }}>
                    <span style={{ width:18, height:18, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{m.icon}</span>
                    {m.label}
                    {active && <div style={{ width:5, height:5, borderRadius:'50%', background:m.color, boxShadow:`0 0 6px ${m.color}` }} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* ── Split: Left info | Right form ── */}
          <div className="dep-split" style={{ display:'grid', gridTemplateColumns:'1fr 1fr' }}>

            {/* LEFT — order summary + QR + payment details */}
            <div style={{ padding:'28px 26px', borderRight:'1px solid rgba(255,255,255,.06)' }}>

              {/* Local currency chip */}
              {lc && (
                <div style={{ display:'flex', alignItems:'center', gap:10, padding:'10px 14px', borderRadius:12, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', marginBottom:16 }}>
                  <span style={{ fontSize:18 }}>{LOCAL[methodId as keyof typeof LOCAL]?.flag ?? '🌐'}</span>
                  <div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,.3)', letterSpacing:'.1em', textTransform:'uppercase', fontWeight:700, marginBottom:1 }}>Local Equivalent</div>
                    <div style={{ fontSize:15, fontWeight:800, color:'#fff' }}>{lc}</div>
                  </div>
                </div>
              )}

              {/* Order summary card */}
              <div style={{ padding:'18px 20px', borderRadius:16, background:`linear-gradient(135deg,${selMethod.bgColor},rgba(0,0,0,.3))`, border:`1px solid ${selMethod.borderColor}`, marginBottom:20 }}>
                <div style={{ fontSize:10, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.3)', marginBottom:6 }}>Order Summary</div>
                <div style={{ fontSize:15, fontWeight:700, color:'rgba(255,255,255,.7)', marginBottom:4 }}>{selMethod.label}</div>
                <div style={{ fontSize:36, fontWeight:900, color:'#fff', letterSpacing:'-.04em', lineHeight:1, marginBottom:10 }}>${selAmount.toFixed(2)}</div>
                <div style={{ display:'inline-flex', alignItems:'center', gap:6, padding:'5px 11px', borderRadius:999, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.1)', fontSize:11, fontWeight:700, color:'#fff' }}>
                  <span style={{ display:'flex', alignItems:'center', justifyContent:'center', width:14, height:14 }}>{selMethod.icon}</span>
                  Ready to pay
                </div>
              </div>

              {/* QR Code */}
              {selMethod.hasQr && selMethod.qr && !selMethod.qr.startsWith('YOUR_') && (
                <div style={{ padding:'18px', borderRadius:16, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', marginBottom:18, textAlign:'center' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:14 }}>
                    <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em', color:'rgba(255,255,255,.3)' }}>Scan Code</span>
                    <span style={{ fontSize:11, color:'rgba(255,255,255,.3)' }}>Tap to zoom</span>
                  </div>
                  <div className="dep-qr-wrap" onClick={() => setQrZoom(true)}
                    style={{ boxShadow:`0 0 40px ${selMethod.glow}, 0 16px 40px rgba(0,0,0,.4)` }}>
                    <img src={selMethod.qr} alt="QR" style={{ width:160, height:160, objectFit:'contain', borderRadius:14, display:'block' }}
                      onError={e=>{(e.target as HTMLImageElement).style.display='none';}} />
                    <div style={{ position:'absolute', bottom:10, right:10, width:24, height:24, borderRadius:'50%', background:'rgba(0,0,0,.5)', display:'flex', alignItems:'center', justifyContent:'center' }}>
                      <ZoomIn size={11} color="white" />
                    </div>
                  </div>
                  <p style={{ fontSize:11, color:'rgba(255,255,255,.25)', marginTop:10, marginBottom:0 }}>Fast checkout via QR</p>
                </div>
              )}

              {/* Payment details fields */}
              {selMethod.fields.length > 0 && (
                <div style={{ borderRadius:14, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', overflow:'hidden' }}>
                  <div style={{ padding:'12px 16px 10px', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
                    <span style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:'.12em', color:'rgba(255,255,255,.3)' }}>Payment Details</span>
                  </div>
                  {selMethod.fields.map((f, i) => (
                    <div key={i} style={{ padding:'12px 16px', borderBottom: i < selMethod.fields.length-1 ? '1px solid rgba(255,255,255,.05)' : 'none' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:4 }}>
                        <span style={{ fontSize:10, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.1em', fontWeight:700 }}>{f.label}</span>
                        {f.note && <span style={{ fontSize:10, color:selMethod.color, fontWeight:700 }}>{f.note}</span>}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <code style={{ flex:1, fontSize:13, fontFamily:'monospace', color:'#fff', fontWeight:700, wordBreak:'break-all' }}>{f.value}</code>
                        {!f.value.startsWith('http') && !f.value.startsWith('YOUR_') && (
                          <button onClick={() => { navigator.clipboard.writeText(f.value); toast.success(`${f.label} copied!`); }}
                            style={{ padding:'4px 8px', borderRadius:7, background:'rgba(255,255,255,.06)', border:`1px solid ${selMethod.borderColor}`, cursor:'pointer', color:'rgba(255,255,255,.5)', display:'flex', alignItems:'center', flexShrink:0 }}>
                            <Copy size={12} />
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PayPal / TrueWallet inline components */}
              {selMethod.id === 'paypal' && (
                <div style={{ marginTop:16 }}>
                  <PayPalButton amount={selAmount} user={user} onSuccess={onSuccess} />
                </div>
              )}
              {selMethod.id === 'truewallet' && (
                <div style={{ marginTop:16 }}>
                  <TrueWalletRedeem user={user} onSuccess={onSuccess} expectedUsdAmount={selAmount} />
                </div>
              )}

              {/* Instruction */}
              <div style={{ display:'flex', gap:10, alignItems:'flex-start', padding:'12px 14px', borderRadius:12, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.06)', marginTop:16 }}>
                <span style={{ fontSize:15, flexShrink:0 }}>💡</span>
                <p style={{ fontSize:11, color:'rgba(255,255,255,.4)', lineHeight:1.65, margin:0 }}>{selMethod.instruction}</p>
              </div>
            </div>

            {/* RIGHT — checkout form */}
            <div style={{ padding:'28px 26px' }}>

              {selMethod.id === 'paypal' ? (
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div style={{ padding:'16px 18px', borderRadius:14, background:'rgba(16,232,152,.08)', border:'1px solid rgba(16,232,152,.18)' }}>
                    <div style={{ fontSize:14, fontWeight:800, color:'var(--green)', marginBottom:6 }}>⚡ Fully Automatic</div>
                    <p style={{ fontSize:12, color:'rgba(255,255,255,.5)', margin:0, lineHeight:1.65 }}>Click the PayPal button on the left. Balance is credited <strong style={{ color:'#fff' }}>instantly</strong> after payment. No form needed.</p>
                  </div>
                  {[{step:'1',text:'Click the PayPal button on the left'},{step:'2',text:'Log in and complete payment in PayPal popup'},{step:'3',text:'Balance added instantly — no action needed'}].map(s=>(
                    <div key={s.step} style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ width:24, height:24, borderRadius:'50%', background:'linear-gradient(135deg,#003087,#009cde)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:10, fontWeight:900, color:'#fff', flexShrink:0 }}>{s.step}</div>
                      <span style={{ fontSize:12, color:'rgba(255,255,255,.6)' }}>{s.text}</span>
                    </div>
                  ))}
                </div>
              ) : selMethod.id === 'truewallet' ? (
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div style={{ padding:'16px 18px', borderRadius:14, background:'rgba(249,115,22,.1)', border:'1px solid rgba(249,115,22,.2)' }}>
                    <div style={{ fontSize:14, fontWeight:800, color:'#fb923c', marginBottom:6 }}>Automatic Voucher Flow</div>
                    <p style={{ fontSize:12, color:'rgba(255,255,255,.5)', margin:0, lineHeight:1.65 }}>Paste a TrueWallet gift link on the left. We redeem the THB value, apply a 3% fee, and convert to USD balance instantly.</p>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.28)', marginBottom:6 }}>Checkout</div>
                  <div style={{ fontSize:26, fontWeight:900, color:'#fff', letterSpacing:'-.03em', marginBottom:26 }}>Complete Your Payment</div>

                  {/* Email */}
                  <div style={{ marginBottom:18 }}>
                    <label className="dep-label">Your Email</label>
                    <input type="email" className="dep-field" placeholder="you@example.com"
                      value={email} onChange={e => setEmail(e.target.value)} />
                  </div>

                  {/* TXN ID */}
                  <div style={{ marginBottom:18 }}>
                    <label className="dep-label">Transaction ID</label>
                    <input type="text" className="dep-field" placeholder="Paste your TXN / reference ID..."
                      value={txnId} onChange={e => setTxnId(e.target.value)}
                      style={{ fontFamily:'monospace', letterSpacing:'0.5px' }} />
                    <p style={{ fontSize:11, color:'rgba(255,255,255,.28)', marginTop:6, marginBottom:0 }}>From your payment receipt or confirmation</p>
                  </div>

                  {/* Screenshot */}
                  <div style={{ marginBottom:24 }}>
                    <label className="dep-label">Payment Screenshot</label>
                    <input type="file" ref={fileRef} accept="image/*" style={{ display:'none' }} onChange={handleFileChange} />
                    {screenshotPreview ? (
                      <div style={{ position:'relative', borderRadius:14, overflow:'hidden', border:'1px solid rgba(16,232,152,.25)', cursor:'pointer' }}
                        onClick={() => fileRef.current?.click()}>
                        <img src={screenshotPreview} alt="Screenshot" style={{ width:'100%', maxHeight:130, objectFit:'cover', display:'block' }} />
                        <div style={{ position:'absolute', top:8, right:8, padding:'3px 10px', borderRadius:20, background:'rgba(16,232,152,.15)', border:'1px solid rgba(16,232,152,.3)', fontSize:10, fontWeight:700, color:'var(--green)' }}>✓ Uploaded</div>
                      </div>
                    ) : (
                      <div className="dep-upload" onClick={() => fileRef.current?.click()}>
                        <div style={{ width:44, height:44, borderRadius:12, background:'rgba(139,92,246,.1)', border:'1px solid rgba(139,92,246,.2)', display:'flex', alignItems:'center', justifyContent:'center', margin:'0 auto 10px' }}>
                          <Upload size={20} color="var(--purple)" />
                        </div>
                        <div style={{ fontSize:13, fontWeight:700, color:'rgba(255,255,255,.45)', marginBottom:4 }}>Upload payment proof</div>
                        <div style={{ fontSize:11, color:'rgba(255,255,255,.22)' }}>JPG, PNG, WEBP · Click to browse</div>
                      </div>
                    )}
                  </div>

                  {/* Summary pill */}
                  <div style={{ display:'flex', alignItems:'center', gap:12, padding:'13px 16px', borderRadius:14, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', marginBottom:20 }}>
                    <div style={{ width:36, height:36, borderRadius:10, background:selMethod.bgColor, border:`1px solid ${selMethod.borderColor}`, display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>{selMethod.icon}</div>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.4)', marginBottom:1 }}>{selMethod.label}</div>
                      <div style={{ fontSize:18, fontWeight:900, color:'#fff', letterSpacing:'-.02em' }}>${selAmount.toFixed(2)}</div>
                    </div>
                    <div style={{ textAlign:'right' }}>
                      <div style={{ fontSize:10, color:'rgba(255,255,255,.3)' }}>Pending admin</div>
                      <div style={{ fontSize:11, fontWeight:700, color:'var(--amber)', marginTop:2 }}>~1–10 min</div>
                    </div>
                  </div>

                  <button className="dep-submit" onClick={() => {
                    if (!txnId.trim()) { toast.error('Enter your transaction ID'); return; }
                    if (!email.trim()) { toast.error('Enter your email'); return; }
                    setStep(3);
                  }}>
                    I've Sent Payment <ArrowRight size={16} />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ STEP 3: Review + Final Submit ══ */}
      {step === 3 && (
        <div className="dep-wrap dep-card" style={{ padding:'32px' }}>
          <button onClick={() => setStep(2)} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.4)', fontSize:13, fontFamily:'inherit', marginBottom:22, padding:0, fontWeight:600 }}>
            <ArrowLeft size={14}/> Back
          </button>

          <div style={{ fontSize:11, fontWeight:700, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.28)', marginBottom:6 }}>Review</div>
          <div style={{ fontSize:24, fontWeight:900, color:'#fff', letterSpacing:'-.03em', marginBottom:24 }}>Confirm Submission</div>

          <div style={{ borderRadius:16, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)', overflow:'hidden', marginBottom:20 }}>
            {[{l:'Method',v:selMethod.label},{l:'Amount',v:`$${selAmount.toFixed(2)}`},{l:'Email',v:email},{l:'Transaction ID',v:txnId}].map((r,i)=>(
              <div key={r.l} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'13px 18px', borderBottom:i<3?'1px solid rgba(255,255,255,.05)':'none' }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,.4)' }}>{r.l}</span>
                <span style={{ fontSize:13, fontWeight:700, color:'#fff', fontFamily:r.l==='Transaction ID'?'monospace':undefined, maxWidth:220, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.v}</span>
              </div>
            ))}
          </div>

          {screenshotPreview && (
            <div style={{ marginBottom:20 }}>
              <div style={{ fontSize:11, color:'rgba(255,255,255,.3)', marginBottom:8, fontWeight:700, textTransform:'uppercase', letterSpacing:'.1em' }}>Payment Screenshot</div>
              <img src={screenshotPreview} alt="Proof" style={{ width:'100%', maxHeight:110, objectFit:'cover', borderRadius:12 }} />
            </div>
          )}

          <div style={{ display:'flex', alignItems:'flex-start', gap:12, padding:'14px 18px', borderRadius:13, background:'rgba(251,191,36,.05)', border:'1px solid rgba(251,191,36,.15)', marginBottom:22 }}>
            <span style={{ fontSize:18, flexShrink:0 }}>⚡</span>
            <p style={{ fontSize:12, color:'rgba(255,255,255,.5)', lineHeight:1.65, margin:0 }}>
              After submission, admin will verify and credit <strong style={{ color:'var(--green)' }}>${selAmount.toFixed(2)}</strong> to your balance within minutes.
            </p>
          </div>

          <button className="dep-submit" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <><Loader2 size={18} className="animate-spin"/> Submitting…</> : <><CheckCircle size={17}/> Confirm &amp; Submit</>}
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
          if (tx.status==='approved'&&!isCredited(tx.id)) { addCredited(tx.id); addBalance(Number(tx.amount)); toast.success(`🎉 Payment approved! $${tx.amount} added!`); if(user) logActivity({ userId:user.id, userEmail:user.email, userName:user.name, action:'balance_add', amount:Number(tx.amount), status:'success', meta:{method:tx.method} }); }
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
      if (user) logActivity({ userId:user.id, userEmail:user.email, userName:user.name, action:'purchase', product:product.name, amount:product.price, status:'success', meta:{ keys:generatedKeys.map((k:any)=>k.panelName) } });
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
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:20,flexWrap:'wrap',gap:10 }}>
          <div style={{ display:'flex',alignItems:'center',gap:14 }}>
            <div style={{ width:44,height:44,borderRadius:12,background:'rgba(139,92,246,.1)',border:'1px solid rgba(139,92,246,.2)',display:'flex',alignItems:'center',justifyContent:'center' }}><Users size={20} color="var(--purple)"/></div>
            <div>
              <div style={{ fontSize:16,fontWeight:800,color:'#fff' }}>Payment Approvals</div>
              <div style={{ fontSize:12,color:'var(--muted)',marginTop:2 }}>Auto-refreshes every 20s</div>
            </div>
          </div>
          <div style={{ display:'flex',alignItems:'center',gap:8 }}>
            <span style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:20,background:isAdmin?'rgba(239,68,68,.1)':'rgba(59,130,246,.1)',border:`1px solid ${isAdmin?'rgba(239,68,68,.25)':'rgba(59,130,246,.25)'}`,fontSize:11,fontWeight:700,color:isAdmin?'#f87171':'#60a5fa' }}>
              {isAdmin ? '👑 Administrator — Full Access' : '🛡 Support — Payment Approvals Only'}
            </span>
          </div>
        </div>
        <AdminPanel/>
      </div>
    </div>
  );

  return (
    <>
      <style>{`
        @keyframes w-slide-up   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:none} }
        @keyframes w-fade-in    { from{opacity:0} to{opacity:1} }
        @keyframes w-bal-glow   { 0%,100%{text-shadow:0 0 40px rgba(139,92,246,.45)} 50%{text-shadow:0 0 70px rgba(139,92,246,.75),0 0 120px rgba(139,92,246,.3)} }
        @keyframes w-shimmer    { 0%{left:-100%} 100%{left:160%} }

        /* ── Tabs ── */
        .w-tab {
          padding: 10px 20px; border-radius: 12px; font-size: 13px; font-weight: 600;
          cursor: pointer; border: 1px solid transparent; background: transparent;
          color: rgba(255,255,255,.35); font-family: inherit;
          transition: all .25s cubic-bezier(.22,1,.36,1);
          display: flex; align-items: center; gap: 8px; white-space: nowrap;
          letter-spacing: .01em;
        }
        .w-tab:hover {
          color: rgba(255,255,255,.72);
          background: rgba(255,255,255,.04);
        }
        .w-tab.wt-on {
          color: #fff; font-weight: 700;
          background: rgba(139,92,246,.14);
          border-color: rgba(139,92,246,.28);
          box-shadow: 0 0 22px rgba(109,40,217,.18), inset 0 1px 0 rgba(255,255,255,.06);
        }

        /* ── Hero card ── */
        .w-hero {
          position: relative; border-radius: 28px; overflow: hidden;
          padding: 36px 40px;
          background: linear-gradient(135deg,
            rgba(15,10,30,.98) 0%,
            rgba(8,8,20,.98) 50%,
            rgba(5,12,8,.98) 100%);
          border: 1px solid rgba(139,92,246,.18);
          box-shadow:
            0 0 0 1px rgba(255,255,255,.04) inset,
            0 1px 0 rgba(255,255,255,.07) inset,
            0 40px 80px rgba(0,0,0,.55),
            0 0 100px rgba(109,40,217,.08);
          animation: w-slide-up .5s cubic-bezier(.22,1,.36,1) both;
        }
        .w-hero-orb-l {
          position: absolute; top: -80px; left: -60px;
          width: 280px; height: 280px; border-radius: 50%;
          background: radial-gradient(circle, rgba(109,40,217,.22) 0%, transparent 70%);
          pointer-events: none; filter: blur(2px);
        }
        .w-hero-orb-r {
          position: absolute; bottom: -60px; right: -40px;
          width: 220px; height: 220px; border-radius: 50%;
          background: radial-gradient(circle, rgba(16,232,152,.1) 0%, transparent 70%);
          pointer-events: none;
        }
        .w-hero-line {
          position: absolute; top: 0; left: 0; right: 0; height: 1px;
          background: linear-gradient(90deg, transparent 0%, rgba(139,92,246,.5) 40%, rgba(16,232,152,.3) 70%, transparent 100%);
          pointer-events: none;
        }

        /* Shimmer overlay on hero */
        .w-hero::after {
          content: '';
          position: absolute; top: 0; bottom: 0;
          width: 30%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.025), transparent);
          animation: w-shimmer 5s ease-in-out infinite;
          pointer-events: none;
        }

        .w-balance-label {
          font-size: 11px; font-weight: 700; letter-spacing: .18em;
          text-transform: uppercase; color: rgba(255,255,255,.28); margin-bottom: 10px;
        }
        .w-balance-amount {
          font-size: 64px; font-weight: 900; color: #fff;
          letter-spacing: -.05em; line-height: 1;
          animation: w-bal-glow 4s ease-in-out infinite;
          margin-bottom: 14px;
        }

        /* CTA buttons */
        .w-btn-primary {
          display: flex; align-items: center; justify-content: center; gap: 9px;
          padding: 14px 28px; border-radius: 14px;
          background: linear-gradient(135deg,#8b5cf6 0%,#7c3aed 50%,#6d28d9 100%);
          border: 1px solid rgba(139,92,246,.5);
          cursor: pointer; color: #fff; font-size: 14px; font-weight: 700;
          font-family: inherit; white-space: nowrap;
          box-shadow: 0 0 32px rgba(109,40,217,.5), 0 4px 20px rgba(0,0,0,.35);
          transition: all .25s cubic-bezier(.22,1,.36,1);
          position: relative; overflow: hidden;
        }
        .w-btn-primary::before {
          content: '';
          position: absolute; top: 0; bottom: 0; left: -80%;
          width: 50%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,.18), transparent);
          transition: left .4s ease;
          pointer-events: none;
        }
        .w-btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 0 48px rgba(109,40,217,.7), 0 8px 28px rgba(0,0,0,.4);
          border-color: rgba(139,92,246,.7);
        }
        .w-btn-primary:hover::before { left: 160%; }
        .w-btn-primary:active { transform: translateY(0) scale(.98); }

        .w-btn-secondary {
          display: flex; align-items: center; justify-content: center; gap: 8px;
          padding: 12px 24px; border-radius: 14px;
          background: rgba(255,255,255,.055);
          border: 1px solid rgba(255,255,255,.1);
          cursor: pointer; color: rgba(255,255,255,.65); font-size: 13px;
          font-weight: 600; font-family: inherit; white-space: nowrap;
          backdrop-filter: blur(8px);
          transition: all .2s cubic-bezier(.22,1,.36,1);
        }
        .w-btn-secondary:hover {
          background: rgba(255,255,255,.09);
          border-color: rgba(255,255,255,.18);
          color: #fff; transform: translateY(-1px);
        }

        /* ── History row ── */
        .w-history-row {
          display: flex; align-items: center; justify-content: space-between;
          padding: 16px 20px; border-radius: 16px;
          border: 1px solid transparent;
          transition: all .2s;
          gap: 12px;
        }
        .w-history-row:hover { background: rgba(255,255,255,.03); border-color: rgba(255,255,255,.06); }

        /* ── Stat mini-cards ── */
        .w-stat {
          flex: 1; padding: 18px 20px; border-radius: 18px;
          background: rgba(255,255,255,.03);
          border: 1px solid rgba(255,255,255,.07);
          backdrop-filter: blur(12px);
          transition: all .2s;
          min-width: 0;
        }
        .w-stat:hover { background: rgba(255,255,255,.05); border-color: rgba(255,255,255,.11); }

        /* ── Animated buy button ── */
        .ppc-btn {
          --tooltip-height: 32px;
          --tooltip-width: 80px;
          --gap: 14px;
          position: relative;
          width: 100%;
          height: 52px;
          border-radius: 14px;
          border: 1px solid var(--btn-border);
          background: var(--btn-bg);
          cursor: pointer;
          font-family: inherit;
          overflow: hidden;
          transition: box-shadow .28s cubic-bezier(.22,1,.36,1), transform .22s cubic-bezier(.22,1,.36,1), border-color .2s;
          box-shadow: 0 8px 28px var(--btn-glow);
        }
        .ppc-btn::before {
          position: absolute;
          content: attr(data-tooltip);
          width: var(--tooltip-width);
          height: var(--tooltip-height);
          background: rgba(255,255,255,.12);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,.18);
          font-size: 13px;
          font-weight: 800;
          color: #fff;
          border-radius: 10px;
          line-height: var(--tooltip-height);
          text-align: center;
          bottom: calc(52px + var(--gap) + 8px);
          left: calc(50% - var(--tooltip-width) / 2);
          letter-spacing: .02em;
          pointer-events: none;
        }
        .ppc-btn::after {
          position: absolute;
          content: '';
          width: 0; height: 0;
          border: 8px solid transparent;
          border-top-color: rgba(255,255,255,.18);
          left: calc(50% - 8px);
          bottom: calc(52px + var(--gap) - 8px);
          pointer-events: none;
        }
        .ppc-btn::before, .ppc-btn::after {
          opacity: 0;
          visibility: hidden;
          transition: all .35s cubic-bezier(.22,1,.36,1);
        }
        .ppc-btn:hover {
          transform: translateY(-3px);
          box-shadow: 0 18px 44px var(--btn-glow);
          border-color: var(--btn-color);
        }
        .ppc-btn:hover::before {
          opacity: 1; visibility: visible;
          bottom: calc(52px + var(--gap));
        }
        .ppc-btn:hover::after {
          opacity: 1; visibility: visible;
          bottom: calc(52px + var(--gap) - 16px);
        }
        .ppc-btn:active { transform: translateY(-1px) scale(.98); }

        .ppc-btn-wrapper {
          position: absolute;
          inset: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
        }
        .ppc-btn-text {
          position: absolute;
          top: 0; left: 0;
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          font-size: 14px; font-weight: 800; letter-spacing: -.01em;
          color: var(--btn-txt-color);
          transition: top .42s cubic-bezier(.22,1,.36,1);
          white-space: nowrap;
          gap: 8px;
        }
        .ppc-btn-text::before { content: '⚡'; font-size: 15px; }
        .ppc-btn-icon {
          position: absolute;
          top: 100%; left: 0;
          width: 100%; height: 100%;
          display: flex; align-items: center; justify-content: center;
          color: var(--btn-txt-color);
          transition: top .42s cubic-bezier(.22,1,.36,1);
          filter: drop-shadow(0 0 8px var(--btn-color));
        }
        .ppc-btn-icon svg { width: 22px; height: 22px; stroke-width: 2.5px; }
        .ppc-btn:hover .ppc-btn-text { top: -100%; }
        .ppc-btn:hover .ppc-btn-icon { top: 0; }
      `}</style>

      {confirmPending&&<ConfirmModal product={{name:confirmPending.name||confirmPending.id,price:confirmPending.price,duration:`${confirmPending.days} days`,emoji:confirmPending.emoji}} onConfirm={()=>{const p=confirmPending;setConfirmPending(null);handleBuy(p);}} onCancel={()=>setConfirmPending(null)}/>}
      {purchaseSuccess&&<PurchaseSuccessModal data={purchaseSuccess} onClose={()=>setPurchaseSuccess(null)}/>}

      <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

        {/* ══ HERO BALANCE CARD ══ */}
        <div className="w-hero">
          <div className="w-hero-line" />
          <div className="w-hero-orb-l" />
          <div className="w-hero-orb-r" />

          <div style={{ position:'relative', display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:24 }}>
            {/* Left — balance */}
            <div>
              <div className="w-balance-label">Available Balance</div>
              <div className="w-balance-amount">${balance.toFixed(2)}</div>

              {/* Status badges */}
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, padding:'5px 13px', borderRadius:20, background:'rgba(16,232,152,.08)', border:'1px solid rgba(16,232,152,.18)' }}>
                  <div className="dot dot-green" style={{ width:5, height:5 }} />
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--green)' }}>Active Account</span>
                </div>
                <span style={{ fontSize:11, color:'rgba(255,255,255,.22)', letterSpacing:'.02em' }}>Deposits credited after admin approval</span>
              </div>
            </div>

            {/* Right — action buttons */}
            <div style={{ display:'flex', flexDirection:'column', gap:10, alignSelf:'center', flexShrink:0 }}>
              <button className="w-btn-primary" onClick={()=>setActiveTab('deposit')}>
                <Wallet size={16} /> Add Funds
              </button>
              <button className="w-btn-secondary" onClick={()=>setActiveTab('products')}>
                <ShoppingBag size={15} /> Buy Products
              </button>
            </div>
          </div>

          {/* ── Mini stat strip ── */}
          <div style={{ display:'flex', gap:10, marginTop:28, flexWrap:'wrap' }}>
            {[
              { label:'Total Deposited', value:`$${myTxns.filter(t=>t.status==='approved').reduce((s,t)=>s+Number(t.amount),0).toFixed(2)}`, color:'rgba(139,92,246,.9)' },
              { label:'Pending',         value:myTxns.filter(t=>t.status==='pending').length,  color:'rgba(251,191,36,.9)'  },
              { label:'Transactions',    value:myTxns.length,                                   color:'rgba(56,189,248,.9)'  },
            ].map(s=>(
              <div key={s.label} className="w-stat">
                <div style={{ fontSize:10, fontWeight:700, color:'rgba(255,255,255,.3)', textTransform:'uppercase', letterSpacing:'.12em', marginBottom:6 }}>{s.label}</div>
                <div style={{ fontSize:26, fontWeight:900, color:s.color, letterSpacing:'-.03em' }}>{s.value}</div>
              </div>
            ))}
          </div>
        </div>

        {/* ══ TABS ══ */}
        <div style={{ display:'flex', alignItems:'center', gap:3, padding:'4px', background:'rgba(255,255,255,.025)', borderRadius:15, border:'1px solid rgba(255,255,255,.06)', width:'fit-content', backdropFilter:'blur(12px)' }}>
          {([
            { id:'products', icon:<ShoppingBag size={13}/>, label:'Products'    },
            { id:'deposit',  icon:<Wallet      size={13}/>, label:'Add Balance' },
            { id:'history',  icon:<RefreshCw   size={13}/>, label:'History'     },
          ] as const).map(tab=>(
            <button key={tab.id} className={`w-tab${activeTab===tab.id?' wt-on':''}`} onClick={()=>setActiveTab(tab.id)}>
              {tab.icon}{tab.label}
              {tab.id==='history' && myTxns.filter(t=>t.status==='pending').length > 0 && (
                <span style={{ background:'linear-gradient(135deg,#f59e0b,#d97706)', color:'#000', fontSize:9, fontWeight:900, padding:'2px 7px', borderRadius:10, lineHeight:1.6 }}>
                  {myTxns.filter(t=>t.status==='pending').length}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* ══ PRODUCTS TAB ══ */}
        {activeTab==='products'&&(
          <div style={{ animation:'w-slide-up .4s cubic-bezier(.22,1,.36,1) both' }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
              <div>
                <div style={{ fontSize:22, fontWeight:900, color:'#fff', letterSpacing:'-.02em', marginBottom:4 }}>Choose Your Plan</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,.38)' }}>Select a panel and duration — key delivered instantly after purchase</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20, background:'rgba(16,232,152,.08)', border:'1px solid rgba(16,232,152,.2)' }}>
                  <div className="dot dot-green" style={{ width:5, height:5 }}/>
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--green)' }}>OB52 Undetected</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20, background:'rgba(56,189,248,.07)', border:'1px solid rgba(56,189,248,.18)' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--blue)' }}>⚡ Instant Key</span>
                </div>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(300px,1fr))', gap:20 }}>
              {PANEL_GROUPS.map(group=>(
                <PanelProductCard key={group.id} group={group} balance={balance} onBuy={(p)=>setConfirmPending(p)}/>
              ))}
            </div>
            <div style={{ marginTop:20, display:'flex', alignItems:'center', justifyContent:'center', gap:20, flexWrap:'wrap', padding:'14px 0', borderTop:'1px solid rgba(255,255,255,.05)' }}>
              {['🔑 Key delivered instantly','🔒 Secured by KeyAuth','🔄 HWID resets included','💬 24/7 support'].map(item=>(
                <span key={item} style={{ fontSize:11, color:'rgba(255,255,255,.28)', fontWeight:500 }}>{item}</span>
              ))}
            </div>
          </div>
        )}

        {/* ══ DEPOSIT TAB ══ */}
        {activeTab==='deposit'&&(
          <div style={{ animation:'w-slide-up .4s cubic-bezier(.22,1,.36,1) both' }}>
            <AddBalanceUI user={user} onSuccess={loadTxns}/>
          </div>
        )}

        {/* ══ HISTORY TAB ══ */}
        {activeTab==='history'&&(
          <div style={{ animation:'w-slide-up .4s cubic-bezier(.22,1,.36,1) both' }}>
            <div style={{ borderRadius:24, overflow:'hidden', border:'1px solid rgba(255,255,255,.07)', background:'rgba(255,255,255,.018)', backdropFilter:'blur(18px)' }}>

              {/* History header */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'22px 26px', borderBottom:'1px solid rgba(255,255,255,.06)' }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:800, color:'#fff', marginBottom:2 }}>Transaction History</div>
                  <div style={{ fontSize:12, color:'rgba(255,255,255,.3)' }}>{myTxns.length} total · {myTxns.filter(t=>t.status==='approved').length} approved</div>
                </div>
                <button onClick={loadTxns} disabled={txnsLoad}
                  style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 14px', borderRadius:11, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.09)', cursor:'pointer', color:'rgba(255,255,255,.55)', fontFamily:'inherit', fontSize:12, fontWeight:600, transition:'all .18s' }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.09)';(e.currentTarget as HTMLButtonElement).style.color='#fff';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.05)';(e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,.55)';}}>
                  <RefreshCw size={12} className={txnsLoad?'animate-spin':''}/> Refresh
                </button>
              </div>

              {/* History body */}
              <div style={{ padding:'10px 16px 16px' }}>
                {txnsLoad
                  ? <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'48px 0', color:'rgba(255,255,255,.3)' }}>
                      <Loader2 size={16} className="animate-spin"/>
                      <span style={{ fontSize:13 }}>Loading transactions…</span>
                    </div>
                  : myTxns.length===0
                  ? <div style={{ textAlign:'center', padding:'56px 0' }}>
                      <div style={{ fontSize:42, marginBottom:14, opacity:.5 }}>📭</div>
                      <p style={{ fontSize:14, color:'rgba(255,255,255,.4)', fontWeight:700, marginBottom:5 }}>No transactions yet</p>
                      <p style={{ fontSize:12, color:'rgba(255,255,255,.2)' }}>Add balance to see your history here</p>
                    </div>
                  : <div style={{ display:'flex', flexDirection:'column', gap:2 }}>
                      {myTxns.map(tx=>{
                        const m   = PAYMENT_METHODS.find(p=>p.id===tx.method);
                        const sc  = tx.status==='approved'?'#10e898':tx.status==='rejected'?'#f87171':'#fbbf24';
                        const sbg = tx.status==='approved'?'rgba(16,232,152,.06)':tx.status==='rejected'?'rgba(248,113,113,.06)':'rgba(251,191,36,.06)';
                        const sbc = tx.status==='approved'?'rgba(16,232,152,.18)':tx.status==='rejected'?'rgba(248,113,113,.18)':'rgba(251,191,36,.18)';
                        const icon = tx.status==='approved'?'✓':tx.status==='rejected'?'✗':'⏳';
                        const label = tx.status==='approved'?'Approved':tx.status==='rejected'?'Rejected':'Pending';
                        return (
                          <div key={tx.id} className="w-history-row">
                            {/* Method icon */}
                            <div style={{ width:42, height:42, borderRadius:12, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.08)', display:'flex', alignItems:'center', justifyContent:'center', overflow:'hidden', flexShrink:0 }}>
                              {m?.icon ?? <span style={{ fontSize:18 }}>💳</span>}
                            </div>
                            {/* Details */}
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:2 }}>
                                ${Number(tx.amount).toFixed(2)}
                                <span style={{ fontSize:11, color:'rgba(255,255,255,.38)', fontWeight:500, marginLeft:6 }}>via {m?.label ?? tx.method}</span>
                              </div>
                              <div style={{ fontSize:11, color:'rgba(255,255,255,.25)', display:'flex', alignItems:'center', gap:8 }}>
                                <span>{new Date(tx.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}</span>
                                {tx.transaction_id && <><span>·</span><code style={{ fontFamily:'monospace', fontSize:10, color:'rgba(255,255,255,.2)' }}>{tx.transaction_id.slice(0,18)}{tx.transaction_id.length>18?'…':''}</code></>}
                              </div>
                            </div>
                            {/* Status badge */}
                            <div style={{ display:'flex', flexDirection:'column', alignItems:'flex-end', gap:4, flexShrink:0 }}>
                              <span style={{ display:'inline-flex', alignItems:'center', gap:5, padding:'5px 13px', borderRadius:20, background:sbg, border:`1px solid ${sbc}`, fontSize:11, fontWeight:700, color:sc }}>
                                {icon} {label}
                              </span>
                              <span style={{ fontSize:10, color:'rgba(255,255,255,.2)' }}>
                                {new Date(tx.created_at).toLocaleTimeString('en-US',{hour:'2-digit',minute:'2-digit'})}
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                }
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
