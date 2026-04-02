import { useState, useEffect, useRef } from 'react';
import { useAppStore, PRODUCTS } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { ArrowRight, ArrowLeft, RefreshCw, Users, Check, X, Copy, CheckCircle, Loader2, Eye, EyeOff, ZoomIn, Wallet, ShoppingBag, CreditCard, ExternalLink, Search, ChevronRight } from 'lucide-react';
import { safeQuery } from '@/lib/safeFetch';
import { logActivity, notifyUser } from '@/lib/activity';
import { cn } from '@/lib/utils';
import { captureReferralFromUrl, getStoredReferralEmail, normalizeReferralValue, normalizeResellerEmail, clearStoredReferralEmail, fetchResellerPaymentMethods } from '@/lib/reseller';
import type { ResellerPaymentMethods } from '@/lib/reseller';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';
import { canApprovePayments, isOwner } from '@/lib/roles';
import { getCatalogProductText, getLicenseDisplayName, getWalletPanelText, getWalletPlanLabel } from '@/lib/productText';

const SUPABASE_URL  = 'https://awjouzwzdkrevvnlenvn.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3am91end6ZGtyZXZ2bmxlbnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTg4MjEsImV4cCI6MjA5MDAzNDgyMX0._I_I-WA_8-YqDfaRzKiVgpEAhkH9faxlEIV6e766A0M';

// ── Payment Methods ──────────────────────────────────────────
const PAYMENT_METHODS = [
  { id:'binance', label:'Binance Pay', color:'#F0B90B', glow:'rgba(240,185,11,0.35)', instruction:'Open Binance → Pay → scan QR or enter Pay ID', hasQr:true, qr:'https://www.dropbox.com/scl/fi/l4tyvo8so3ktktv9n0ym0/binance-qr.jpg?rlkey=ha3kizbzg35oao01g1uynlpki&st=eboendk0&raw=1', fields:[{label:'Pay ID',value:'1104953117',note:'Binance Pay ID'}], icon:<img src="https://www.dropbox.com/scl/fi/z8i5ng71k73neobye7p96/Binance-BNB-Icon-Logo.wine-removebg-preview.png?rlkey=odrn2pwud3aeli8phl0y7ntfr&st=zhelar5g&raw=1" alt="logo" style={{ width:20, height:20, objectFit:'contain', borderRadius:4 }}/>, bgColor:'rgba(240,185,11,0.08)', borderColor:'rgba(240,185,11,0.25)' },
  { id:'paypal', label:'PayPal', color:'#009CDE', glow:'rgba(0,156,222,0.35)', instruction:'Pay with PayPal below. Your balance is credited automatically — no transaction ID needed.', hasQr:false, qr:'', fields:[{label:'PayPal.me',value:'https://paypal.me/JohanMaestre',note:''}], icon:<img src="https://www.dropbox.com/scl/fi/meqlo70ivzofuvnefh5fd/PayPal_Symbol_Alternative_1.png?rlkey=nw2xo4tsdamxtvt3krrj9lci1&st=7ki2i8em&raw=1" alt="logo" style={{ width:20, height:20, objectFit:'contain', borderRadius:4 }}/>, bgColor:'rgba(0,112,186,0.08)', borderColor:'rgba(0,112,186,0.25)' },
  { id:'bkash', label:'bKash', color:'#E2136E', glow:'rgba(226,19,110,0.35)', instruction:'Open bKash → Send Money → enter number', hasQr:true, qr:'https://www.dropbox.com/scl/fi/lxoiw6cy2mshi7hasgxgi/bkash-qr.jpg?rlkey=f9rc769ons2p1fxkrmjyunmqv&st=o0vb7xoz&raw=1', fields:[{label:'Number',value:'01760889747',note:'Send Money (not Payment)'}], icon:<img src="https://www.dropbox.com/scl/fi/3fks5moqx0e4xrq0qskzu/BKash-Icon2-Logo.wine-removebg-preview.png?rlkey=5lbby5mlh2wve6e2cif0yd5te&st=idlci7sm&raw=1" alt="logo" style={{ width:20, height:20, objectFit:'contain', borderRadius:4 }}/>, bgColor:'rgba(226,19,110,0.08)', borderColor:'rgba(226,19,110,0.25)' },
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

function localAmtValue(usd: number, methodId: string): string {
  const lc = LOCAL[methodId as keyof typeof LOCAL];
  if (!lc || lc.rate === 1) return '';
  const value = methodId === 'litecoin' ? (usd * lc.rate).toFixed(4) : Math.ceil(usd * lc.rate).toLocaleString();
  return `${lc.symbol}${value}`;
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
function PayPalButton({ amount, user, onSuccess, referralEmail }: { amount: number; user: any; onSuccess: () => void; referralEmail?: string }) {
  const SUPABASE_URL_PP  = 'https://awjouzwzdkrevvnlenvn.supabase.co';
  const SUPABASE_ANON_PP = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3am91end6ZGtyZXZ2bmxlbnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTg4MjEsImV4cCI6MjA5MDAzNDgyMX0._I_I-WA_8-YqDfaRzKiVgpEAhkH9faxlEIV6e766A0M';
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
          const { data: txRow, error: txErr } = await supabase
            .from('transactions')
            .insert({
              user_id:        user.id,
              user_email:     user.email,
              user_name:      user.name,
              amount:         finalAmount,
              method:         'paypal',
              transaction_id: orderId,
              status:         'approved',
              note:           'Auto-verified via PayPal JS SDK capture',
              referral_email: referralEmail || '',
            })
            .select('id')
            .single();

          if (!txErr && txRow?.id) {
            const { error: resellerCreditError } = await supabase.rpc('apply_reseller_credit', {
              p_transaction_id: txRow.id,
            });
            if (resellerCreditError) {
              console.error('Failed to apply reseller credit for PayPal payment:', resellerCreditError);
            }
          }

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
function TrueWalletRedeem({ user, onSuccess, expectedUsdAmount, referralEmail }: { user: any; onSuccess: () => void; expectedUsdAmount: number; referralEmail?: string }) {
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
    const { data, error } = await supabase.functions.invoke('truwallet-redeem', { body: { voucher: voucher.trim(), expectedUsdAmount, referralEmail: referralEmail || '' } });
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
  const [feePayments,setFeePayments] = useState<any[]>([]);
  const [loading,setL]         = useState(false);
  const [filter,setFilter]     = useState<'pending'|'approved'|'rejected'|'all'>('pending');
  const [search,setSearch]     = useState('');
  const [zoomImg,setZoomImg]   = useState<string|null>(null);

  const load = async () => {
    setL(true);
    let q = supabase
      .from('transactions')
      .select('id,user_id,user_email,user_name,amount,method,transaction_id,status,note,created_at,updated_at')
      .order('created_at',{ ascending:false })
      .limit(search.trim() ? 50 : filter === 'pending' ? 40 : 25);
    if (search.trim()) q = (q as any).or(`user_email.ilike.%${search.trim()}%,user_name.ilike.%${search.trim()}%,transaction_id.ilike.%${search.trim()}%`);
    else if (filter !== 'all') q = (q as any).eq('status', filter);
    const [{ data, error }, { data: feeData }] = await Promise.all([
      safeQuery(() => q),
      safeQuery(() => supabase
        .from('reseller_fee_payments')
        .select('id,user_id,user_email,amount,binance_pay_id,binance_tx_id,status,created_at,updated_at')
        .order('created_at', { ascending:false })
        .limit(30)),
    ]);
    if (!error && data) setTxns(data);
    setFeePayments(feeData ?? []);
    setL(false);
  };
  useEffect(() => {
    load();
    const ch = supabase.channel('admin-txns').on('postgres_changes',{ event:'*', schema:'public', table:'transactions' },load).subscribe();
    return () => { supabase.removeChannel(ch); };
  },[]);
  useEffect(() => { load(); }, [search, filter]);

  const approve = async (tx: any) => {
    const { error } = await safeQuery(() => supabase.from('transactions').update({ status:'approved', updated_at:new Date().toISOString() }).eq('id',tx.id));
    if (error) { toast.error('Failed: '+error.message); return; }

    const { error: resellerCreditError } = await safeQuery(() =>
      supabase.rpc('apply_reseller_credit', { p_transaction_id: tx.id })
    );
    if (resellerCreditError) {
      toast.error(`Approved, but reseller payout failed: ${resellerCreditError.message}`);
      return;
    }

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
  const approveFeePayment = async (payment: any) => {
    const { error } = await safeQuery(() => supabase.rpc('handle_reseller_fee_payment', { p_payment_id: payment.id, p_status: 'verified' }));
    if (error) { toast.error('Failed: '+error.message); return; }
    toast.success(`✅ Fee payment approved for ${payment.user_email}`);
    setFeePayments(p => p.map(fp => fp.id===payment.id ? { ...fp, status:'verified', updated_at:new Date().toISOString() } : fp));
    logActivity({
      userId: adminUser?.id ?? '',
      userEmail: adminUser?.email ?? '',
      userName: adminUser?.name ?? '',
      action: 'payment_approved',
      amount: Number(payment.amount),
      status: 'success',
      meta: { for_user: payment.user_email, method: 'reseller_fee', transaction_id: payment.binance_tx_id },
    });
    notifyUser(payment.user_id, {
      type: 'payment',
      title: `✅ Reseller Fee Approved — $${Number(payment.amount).toFixed(2)}`,
      body: 'Your reseller fee payment was approved. You can now request withdrawal if no fee is due.',
      linkPath: '/reseller',
    });
  };
  const rejectFeePayment = async (payment: any) => {
    const { error } = await safeQuery(() => supabase.rpc('handle_reseller_fee_payment', { p_payment_id: payment.id, p_status: 'rejected' }));
    if (error) { toast.error('Failed: '+error.message); return; }
    toast.success(`❌ Fee payment rejected for ${payment.user_email}`);
    setFeePayments(p => p.map(fp => fp.id===payment.id ? { ...fp, status:'rejected', updated_at:new Date().toISOString() } : fp));
    notifyUser(payment.user_id, {
      type: 'payment',
      title: `❌ Reseller Fee Rejected — $${Number(payment.amount).toFixed(2)}`,
      body: 'Your reseller fee payment was rejected. Please contact support and submit a valid Binance transaction ID.',
      linkPath: '/reseller',
    });
  };
  const filtered = filter==='all' ? txns : txns.filter(t=>t.status===filter);
  const pending  = txns.filter(t=>t.status==='pending').length;
  const appTotal = txns.filter(t=>t.status==='approved').reduce((s,t)=>s+Number(t.amount),0);
  const pendingFeePayments = feePayments.filter(fp => fp.status === 'pending');

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

      <div className="g" style={{ padding:'16px 18px' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12,flexWrap:'wrap',gap:10 }}>
          <div>
            <div style={{ fontSize:15,fontWeight:800,color:'#fff' }}>Reseller Fee Approvals</div>
            <div style={{ fontSize:12,color:'var(--muted)',marginTop:2 }}>Approve fee receipts to unlock reseller withdrawals</div>
          </div>
          <span className="badge badge-amber">{pendingFeePayments.length} pending</span>
        </div>
        {pendingFeePayments.length === 0 ? (
          <div style={{ textAlign:'center',padding:'20px 0',fontSize:13,color:'var(--muted)' }}>No pending reseller fee payments</div>
        ) : (
          <div style={{ display:'flex',flexDirection:'column',gap:10 }}>
            {pendingFeePayments.map(payment => (
              <div key={payment.id} className="g" style={{ padding:16,background:'rgba(240,185,11,.04)',borderColor:'rgba(240,185,11,.14)' }}>
                <div style={{ display:'flex',alignItems:'flex-start',justifyContent:'space-between',gap:10,marginBottom:12 }}>
                  <div>
                    <div style={{ fontSize:14,fontWeight:800,color:'#fff' }}>{payment.user_email}</div>
                    <div style={{ fontSize:11,color:'var(--muted)',marginTop:4 }}>Owner Binance ID: {payment.binance_pay_id || '1104953117'}</div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{ fontSize:22,fontWeight:900,color:'#F0B90B' }}>${Number(payment.amount).toFixed(2)}</div>
                    <div style={{ fontSize:10,color:'var(--dim)' }}>{new Date(payment.created_at).toLocaleString()}</div>
                  </div>
                </div>
                <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))',gap:8,marginBottom:12 }}>
                  <div style={{ background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 10px' }}>
                    <div className="label" style={{ marginBottom:3 }}>Binance Transaction ID</div>
                    <div style={{ fontSize:11,fontWeight:700,color:'#fff',wordBreak:'break-all' }}>{payment.binance_tx_id}</div>
                  </div>
                  <div style={{ background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:8,padding:'8px 10px' }}>
                    <div className="label" style={{ marginBottom:3 }}>Status</div>
                    <div style={{ fontSize:11,fontWeight:700,color:'#fbbf24' }}>{payment.status}</div>
                  </div>
                </div>
                <div style={{ display:'flex',gap:8 }}>
                  <button onClick={()=>approveFeePayment(payment)} className="btn btn-g btn-sm" style={{ flex:1 }}><Check size={13}/> Approve Fee</button>
                  <button onClick={()=>rejectFeePayment(payment)} className="btn btn-danger btn-sm" style={{ flex:1 }}><X size={13}/> Reject Fee</button>
                </div>
              </div>
            ))}
          </div>
        )}
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
  const { t } = useTranslation();
  const [revealed,setRevealed] = useState<Record<number,boolean>>({});
  const [copied,setCopied] = useState<Record<number,boolean>>({});
  const copyKey = (k: string, i: number) => { navigator.clipboard.writeText(k); setCopied(p=>({...p,[i]:true})); setTimeout(()=>setCopied(p=>({...p,[i]:false})),2000); };
  return (
    <div style={{ position:'fixed',inset:0,zIndex:70,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.85)',backdropFilter:'blur(14px)',padding:16 }} onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div className="g si" style={{ width:'100%',maxWidth:440,padding:'32px 28px',textAlign:'center',boxShadow:'0 0 80px rgba(16,232,152,.12),0 32px 80px rgba(0,0,0,.7)',borderColor:'rgba(16,232,152,.22)',overflowY:'auto',maxHeight:'90vh' }}>
        <div style={{ width:64,height:64,borderRadius:20,background:'rgba(16,232,152,.1)',border:'1px solid rgba(16,232,152,.2)',display:'flex',alignItems:'center',justifyContent:'center',margin:'0 auto 18px',boxShadow:'0 0 40px rgba(16,232,152,.2)' }}><CheckCircle size={32} color="var(--green)"/></div>
        <div style={{ fontSize:22,fontWeight:800,color:'#fff',marginBottom:5 }}>{t('shop.purchaseSuccess')}</div>
        <div style={{ fontSize:13,color:'var(--muted)',marginBottom:22 }}>{t('shop.keyReady')}</div>
        {data.keys.map((k,i)=>(
          <div key={i} style={{ background:'rgba(255,255,255,.03)',border:'1px solid rgba(139,92,246,.2)',borderRadius:14,padding:16,marginBottom:12,textAlign:'left' }}>
            <div style={{ fontSize:10,color:'var(--muted)',textTransform:'uppercase',letterSpacing:'.1em',marginBottom:8 }}>{getLicenseDisplayName(t, k.panelId, k.panelName)} {t('license.title').replace('Activate ', '')}</div>
            <div style={{ position:'relative',background:'rgba(255,255,255,.03)',border:'1px solid var(--border)',borderRadius:10,padding:'12px 14px',marginBottom:10,display:'flex',alignItems:'center',gap:10 }}>
              <code style={{ flex:1,fontSize:13,fontFamily:'monospace',color:'#fff',letterSpacing:'2px',filter:revealed[i]?'none':'blur(7px)',transition:'filter .4s',wordBreak:'break-all' }}>{k.key}</code>
              <button onClick={()=>setRevealed(p=>({...p,[i]:!p[i]}))} style={{ background:'rgba(255,255,255,.06)',border:'1px solid var(--border)',borderRadius:7,padding:'5px 8px',cursor:'pointer',color:'var(--muted)',flexShrink:0 }}>{revealed[i]?<EyeOff size={14}/>:<Eye size={14}/>}</button>
            </div>
            {!revealed[i]&&<div style={{ textAlign:'center',marginBottom:10 }}><span style={{ fontSize:11,color:'var(--dim)' }}>{t('common.reveal')}</span></div>}
            <button onClick={()=>copyKey(k.key,i)} className="btn btn-ghost btn-sm btn-full">{copied[i]?<><CheckCircle size={13} color="var(--green)"/> {t('common.copied')}</>:<><Copy size={13}/> {t('common.copy')}</>}</button>
            <div style={{ display:'flex',justifyContent:'space-between',marginTop:10,padding:'8px 12px',background:'rgba(255,255,255,.025)',borderRadius:8 }}>
              <div style={{ fontSize:10,color:'var(--muted)' }}>{t('common.status')}: <span style={{ color:'var(--green)',fontWeight:700 }}>{t('common.active')}</span></div>
              <div style={{ fontSize:10,color:'var(--muted)' }}>{t('wallet.expires')}: <span style={{ color:'var(--green)',fontWeight:700 }}>{new Date(k.expiresAt).toLocaleDateString()}</span></div>
            </div>
          </div>
        ))}
        <p style={{ fontSize:11,color:'var(--dim)',marginBottom:18 }}>{t('shop.keysSaved')}</p>
        <button onClick={onClose} className="btn btn-g btn-full btn-lg">{t('common.done')}</button>
      </div>
    </div>
  );
}

// ── Confirm Modal (logic unchanged) ──────────────────────────
function ConfirmModal({ product, onConfirm, onCancel }: { product: { name: string; price: number; duration: string; emoji?: string }; onConfirm: () => void; onCancel: () => void }) {
  const { t } = useTranslation();
  return (
    <div style={{ position:'fixed',inset:0,zIndex:80,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.82)',backdropFilter:'blur(14px)',padding:16 }}>
      <div className="g si" style={{ maxWidth:380,width:'100%',padding:'32px 28px',textAlign:'center',boxShadow:'0 0 80px rgba(139,92,246,.12),0 32px 80px rgba(0,0,0,.7)' }}>
        <div style={{ fontSize:40,marginBottom:16 }}>{product.emoji || '🛒'}</div>
        <div style={{ fontSize:20,fontWeight:800,color:'#fff',marginBottom:8 }}>{t('shop.confirmPurchase')}</div>
        <div style={{ fontSize:13,color:'var(--muted)',marginBottom:24 }}>{t('shop.confirmDesc')}</div>
        <div style={{ background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.08)',borderRadius:14,padding:20,marginBottom:24,textAlign:'left' }}>
          {[{l:t('wallet.product'),v:product.name},{l:t('wallet.duration'),v:product.duration}].map(r=>(
            <div key={r.l} style={{ display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:10 }}>
              <span style={{ fontSize:13,color:'var(--muted)' }}>{r.l}</span>
              <span style={{ fontSize:14,fontWeight:700,color:'#fff' }}>{r.v}</span>
            </div>
          ))}
          <div style={{ height:1,background:'var(--border)',margin:'12px 0' }}/>
          <div style={{ display:'flex',justifyContent:'space-between',alignItems:'center' }}>
            <span style={{ fontSize:14,fontWeight:700,color:'var(--muted)' }}>{t('shop.total')}</span>
            <span style={{ fontSize:28,fontWeight:900,color:'#fff',letterSpacing:'-.03em' }}>${product.price}</span>
          </div>
        </div>
        <div style={{ display:'flex',gap:10 }}>
          <button onClick={onCancel} className="btn btn-ghost" style={{ flex:1 }}>{t('common.cancel')}</button>
          <button onClick={onConfirm} className="btn btn-p" style={{ flex:2,boxShadow:'0 0 24px rgba(109,40,217,.4)' }}>{t('shop.confirmBtn')}</button>
        </div>
        <p style={{ fontSize:11,color:'var(--dim)',marginTop:12 }}>{t('shop.refundNote')}</p>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ✨ NEW PRODUCT CARDS — Glassmorphism Choice-Card Style
// ══════════════════════════════════════════════════════════════
const PANEL_GROUPS = [
  { id:'internal', name:'Internal Panel', tagline:'Maximum Performance', desc:'Advanced internal cheat with full control.', emoji:'⚡', color:'#4ade80', glow:'rgba(74,222,128,.3)', gradFrom:'rgba(20,83,45,.55)', gradTo:'rgba(5,46,22,.35)', bc:'rgba(74,222,128,.22)', features:['Aimbot & ESP','Speed & No recoil','Auto updates','OB52 Undetected'], plans:[{id:'internal-3d',label:'3 Days',price:3,days:3,keyauthPanel:'internal' as const},{id:'internal-7d',label:'7 Days',price:7,days:7,keyauthPanel:'internal' as const},{id:'internal-30d',label:'30 Days',price:15,days:30,keyauthPanel:'internal' as const}] },
  { id:'combo', name:'Combo Pack', tagline:'Best Value Bundle', desc:'Internal + Fake Lag. The full 1999X experience.', emoji:'👑', color:'#fbbf24', glow:'rgba(251,191,36,.35)', gradFrom:'rgba(92,67,0,.55)', gradTo:'rgba(45,26,0,.35)', bc:'rgba(251,191,36,.28)', features:['Everything in Internal','Everything in Fake Lag','Priority Support','Best price guaranteed'], plans:[{id:'combo-7d',label:'7 Days',price:10,days:7,keyauthPanel:'both' as const},{id:'combo-30d',label:'30 Days',price:20,days:30,keyauthPanel:'both' as const}], featured:true },
  { id:'lag', name:'Fake Lag', tagline:'Network Domination', desc:'Lag-based advantages. Confuse and conquer.', emoji:'🔷', color:'#818cf8', glow:'rgba(129,140,248,.3)', gradFrom:'rgba(30,27,75,.55)', gradTo:'rgba(15,14,46,.35)', bc:'rgba(129,140,248,.22)', features:['Lag switch control','Packet manipulation','Adjustable delay','OB52 Undetected'], plans:[{id:'lag-7d',label:'7 Days',price:5,days:7,keyauthPanel:'lag' as const},{id:'lag-30d',label:'30 Days',price:10,days:30,keyauthPanel:'lag' as const}] },
];

function PanelProductCard({ group, balance, onBuy, onAddBalance }: { group: typeof PANEL_GROUPS[number]; balance: number; onBuy: (plan: any) => void; onAddBalance: () => void }) {
  const { t } = useTranslation();
  const [sel, setSel] = useState(0);
  const plan = group.plans[sel];
  const can  = balance >= plan.price;
  const isFeatured = !!(group as any).featured;
  const basePerDay = group.plans[0].price / group.plans[0].days;
  const copy = getWalletPanelText(t, group.id);

  const cardImage = group.id === 'internal'
    ? 'https://www.dropbox.com/scl/fi/vmjmtlagavp3qnxy44vng/Internal.png?rlkey=wu9oxjcrvwh1tw685aqa7z8gm&st=xsnlein0&raw=1'
    : group.id === 'lag'
      ? 'https://www.dropbox.com/scl/fi/7gg0c6tvs1vkcyba0ofw4/Fake-Lag.png?rlkey=muslqa9erob4yq8ojoyotsgmp&st=87k0qh8e&raw=1'
      : 'https://www.dropbox.com/scl/fi/b09vgdpumapu0qrmauzf2/Combo.png?rlkey=nph0m7pxg7klstq9n5voxs0qj&st=cnlqvvws&raw=1';

  return (
    <div style={{
      position:'relative', borderRadius:24, overflow:'hidden',
      height:'100%', display:'flex', flexDirection:'column',
      background:'linear-gradient(180deg,rgba(9,10,18,.98) 0%,rgba(6,7,14,.99) 100%)',
      border:`1px solid ${group.bc}`,
      boxShadow: isFeatured
        ? `0 0 0 1px rgba(251,191,36,.12) inset, 0 32px 72px rgba(0,0,0,.65), 0 0 80px ${group.glow}`
        : `0 24px 60px rgba(0,0,0,.55), 0 0 40px ${group.glow}`,
      transition:'transform .3s cubic-bezier(.22,1,.36,1), box-shadow .3s',
    }}
      onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.transform='translateY(-6px)';}}
      onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.transform='none';}}
    >
      {/* ── Image Preview Banner ── */}
      <div style={{
        position:'relative', width:'100%', height:240, overflow:'hidden',
        background:`linear-gradient(135deg, ${group.gradFrom}, ${group.gradTo})`,
      }}>
        <img
          src={cardImage}
          alt={copy.name}
          style={{
            width:'100%', height:'100%', objectFit:'cover', objectPosition:'center top',
            display:'block', transition:'transform .5s cubic-bezier(.22,1,.36,1)',
          }}
          onMouseEnter={e=>(e.currentTarget.style.transform='scale(1.06)')}
          onMouseLeave={e=>(e.currentTarget.style.transform='scale(1)')}
        />
        {/* Bottom fade into card body */}
        <div style={{
          position:'absolute', bottom:0, left:0, right:0, height:80,
          background:'linear-gradient(to bottom, transparent, rgba(9,10,18,.98))',
          pointerEvents:'none',
        }}/>
        {/* Top glow bar */}
        <div style={{
          position:'absolute', top:0, left:0, right:0, height:3,
          background:`linear-gradient(90deg,transparent,${group.color},${isFeatured?'#e8b84b':group.color},transparent)`,
          pointerEvents:'none',
        }}/>
        {/* Featured badge */}
        {isFeatured && (
          <div style={{
            position:'absolute', top:14, right:14, zIndex:2,
            display:'flex', alignItems:'center', gap:5,
            background:'linear-gradient(135deg,#92400e,#d97706)',
            borderRadius:20, padding:'5px 13px 5px 9px',
            boxShadow:'0 4px 20px rgba(251,191,36,.5)',
          }}>
            <span style={{ fontSize:11 }}>👑</span>
            <span style={{ fontSize:9, fontWeight:900, letterSpacing:'.14em', textTransform:'uppercase', color:'#fef3c7' }}>{t('products.catalog.combo30d.badge')}</span>
          </div>
        )}
        {/* Price badge on image */}
        <div style={{
          position:'absolute', bottom:14, left:16, zIndex:2,
          display:'flex', alignItems:'baseline', gap:4,
        }}>
          <span style={{
            fontSize:42, fontWeight:900, color:'#fff', letterSpacing:'-.05em', lineHeight:1,
            textShadow:`0 0 30px ${group.glow}, 0 2px 8px rgba(0,0,0,.8)`,
          }}>${plan.price}</span>
        </div>
      </div>

      {/* ── Card Body ── */}
      <div style={{ padding:'24px 26px 28px', flex:1, display:'flex', flexDirection:'column' }}>

        {/* Name */}
        <div style={{ marginBottom:16 }}>
          <div style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:'-.02em', lineHeight:1.15 }}>{copy.name}</div>
        </div>

        {/* Plan selector — pill tabs */}
        <div style={{
          display:'grid', gridTemplateColumns:`repeat(${group.plans.length},1fr)`,
          gap:6, marginBottom:16,
          background:'rgba(255,255,255,.04)', borderRadius:13, padding:4,
          border:'1px solid rgba(255,255,255,.06)',
        }}>
          {group.plans.map((p,i)=>{
            const active = sel===i;
            const pSavePct = i>0 ? Math.round((1-p.price/p.days/basePerDay)*100) : 0;
            return (
              <button key={p.id} onClick={()=>setSel(i)} style={{
                position:'relative', padding:'14px 6px', borderRadius:10,
                border: active?`1px solid ${group.color}`:'1px solid transparent',
                background: active?`linear-gradient(135deg,rgba(255,255,255,.09),rgba(255,255,255,.04))`:'transparent',
                cursor:'pointer', fontFamily:'inherit', transition:'all .2s cubic-bezier(.22,1,.36,1)',
                boxShadow: active?`0 0 18px ${group.glow}, inset 0 1px 0 rgba(255,255,255,.1)`:'none',
                display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center',
              }}>
                {pSavePct>0 && (
                  <span style={{
                    position:'absolute', top:-8, right:-4,
                    fontSize:8, fontWeight:900, color:'#4ade80',
                    background:'rgba(74,222,128,.15)', border:'1px solid rgba(74,222,128,.25)',
                    borderRadius:99, padding:'1px 5px',
                  }}>-{pSavePct}%</span>
                )}
                <span style={{ fontSize:16, fontWeight:800, color:active?'#fff':'rgba(255,255,255,.45)', letterSpacing:'-.01em' }}>{getWalletPlanLabel(t, p.label)}</span>
              </button>
            );
          })}
        </div>

        {/* Features */}
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:'6px 10px', marginBottom:18 }}>
          {copy.features.map(f=>(
            <div key={f} style={{ display:'flex', alignItems:'center', gap:6, fontSize:11, color:'rgba(255,255,255,.5)' }}>
              <div style={{
                width:16, height:16, borderRadius:5, flexShrink:0,
                background:`rgba(255,255,255,.04)`, border:`1px solid ${group.bc}`,
                display:'flex', alignItems:'center', justifyContent:'center',
                fontSize:8, fontWeight:900, color:group.color,
              }}>✓</div>
              <span style={{ lineHeight:1.3 }}>{f}</span>
            </div>
          ))}
        </div>

        {/* CTA */}
        <div style={{ marginTop:'auto', paddingTop:8 }}>
        {can ? (
          <button onClick={()=>onBuy({
            ...plan, keyauthPanel:plan.keyauthPanel, duration:`${plan.days} days`,
            name:`${copy.name} — ${getWalletPlanLabel(t, plan.label)}`, description:copy.description,
            badgeType:isFeatured?'gold':group.id==='internal'?'green':'indigo', emoji:group.emoji,
          })} style={{
            width:'100%', padding:'15px 20px', borderRadius:14,
            border:`1px solid ${group.bc}`,
            background:`linear-gradient(135deg, ${group.gradFrom}, rgba(0,0,0,.2))`,
            cursor:'pointer', fontFamily:'inherit', fontSize:14, fontWeight:800, color:'#fff',
            display:'flex', alignItems:'center', justifyContent:'space-between',
            transition:'all .22s', boxShadow:`0 0 28px ${group.glow}`,
          }}
            onMouseEnter={e=>{
              (e.currentTarget as HTMLButtonElement).style.boxShadow=`0 0 48px ${group.glow}`;
              (e.currentTarget as HTMLButtonElement).style.borderColor=group.color;
              (e.currentTarget as HTMLButtonElement).style.background=`linear-gradient(135deg,${group.gradFrom},rgba(255,255,255,.04))`;
            }}
            onMouseLeave={e=>{
              (e.currentTarget as HTMLButtonElement).style.boxShadow=`0 0 28px ${group.glow}`;
              (e.currentTarget as HTMLButtonElement).style.borderColor=group.bc;
              (e.currentTarget as HTMLButtonElement).style.background=`linear-gradient(135deg,${group.gradFrom},rgba(0,0,0,.2))`;
            }}
          >
            <span style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:15 }}>🔑</span>
              {t('shop.purchaseKey')}
            </span>
            <div style={{
              width:32, height:32, borderRadius:10, background:group.color,
              display:'flex', alignItems:'center', justifyContent:'center',
              boxShadow:`0 0 16px ${group.glow}`,
            }}>
              <ArrowRight size={16} color="#000"/>
            </div>
          </button>
        ) : (
          <button onClick={onAddBalance} style={{
            width:'100%', padding:'15px 20px', borderRadius:14, fontSize:14, fontWeight:800,
            fontFamily:'inherit', background:'linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.02))',
            color:'#fff', border:'1px solid rgba(255,255,255,.15)', cursor:'pointer',
            display:'flex', alignItems:'center', justifyContent:'center', gap:8,
            transition:'all .2s', boxShadow:'0 4px 12px rgba(0,0,0,.2)'
          }}
            onMouseEnter={e=>{
              (e.currentTarget as HTMLButtonElement).style.background='linear-gradient(135deg,rgba(255,255,255,.12),rgba(255,255,255,.04))';
              (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,.25)';
              (e.currentTarget as HTMLButtonElement).style.transform='translateY(-1px)';
            }}
            onMouseLeave={e=>{
              (e.currentTarget as HTMLButtonElement).style.background='linear-gradient(135deg,rgba(255,255,255,.08),rgba(255,255,255,.02))';
              (e.currentTarget as HTMLButtonElement).style.borderColor='rgba(255,255,255,.15)';
              (e.currentTarget as HTMLButtonElement).style.transform='none';
            }}
          >
            <span style={{ fontSize:15 }}>💳</span>
            {t('shop.addBalanceToBuy', 'Add Balance To Buy')} <ArrowRight size={15}/>
          </button>
        )}
        </div>

      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
//  ✨ NEW ADD BALANCE UI — Bold Amount + Split Payment Flow
// ══════════════════════════════════════════════════════════════
function AddBalanceUI({ user, onSuccess, referralEmail }: { user: any; onSuccess: () => void; referralEmail?: string }) {
  const { balance } = useAppStore();
  const [step, setStep] = useState<1|2|3>(1);
  const [amount, setAmount] = useState(10);
  const [custom, setCustom] = useState('');
  const [editingAmount, setEditingAmount] = useState(false);
  const amountInputRef = useRef<HTMLInputElement>(null);
  const [methodId, setMethodId] = useState<MethodId>('binance');
  const [txnId, setTxnId] = useState('');
  const [email, setEmail] = useState(user?.email || '');
  const [submitting, setSubmitting] = useState(false);
  const [qrZoom, setQrZoom] = useState(false);
  const [resellerMethods, setResellerMethods] = useState<ResellerPaymentMethods | null>(null);
  const resellerPaused = !!(resellerMethods as any)?._paused;

  // Fetch reseller's custom payment details when ref is active
  useEffect(() => {
    if (!referralEmail) { setResellerMethods(null); return; }
    console.log('[Reseller] Fetching payment methods for:', referralEmail);
    fetchResellerPaymentMethods(supabase, referralEmail).then(m => {
      console.log('[Reseller] Payment methods result:', m);
      setResellerMethods(m ?? null);
    });
  }, [referralEmail]);

  const resellerPaused = !!(resellerMethods as any)?._paused;

  // Build effective payment methods — override with reseller's details when available
  const effectivePaymentMethods = PAYMENT_METHODS.map(m => {
    if (!resellerMethods || resellerPaused) return m;
    if (m.id === 'binance' && resellerMethods.binance_enabled && resellerMethods.binance_pay_id) {
      return { ...m, fields:[{label:'Pay ID', value:resellerMethods.binance_pay_id, note:'Binance Pay ID'}], qr:resellerMethods.binance_qr_url||m.qr };
    }
    if (m.id === 'bkash' && resellerMethods.bkash_enabled && resellerMethods.bkash_number) {
      return { ...m, fields:[{label:'Number', value:resellerMethods.bkash_number, note:'Send Money (not Payment)'}], qr:resellerMethods.bkash_qr_url||m.qr };
    }
    if (m.id === 'usdt_trc20' && resellerMethods.usdt_trc20_enabled && resellerMethods.usdt_trc20_address) {
      return { ...m, fields:[{label:'TRC20 Address', value:resellerMethods.usdt_trc20_address, note:'Tron network only'}], qr:resellerMethods.usdt_trc20_qr_url||m.qr };
    }
    if (m.id === 'usdt_bep20' && resellerMethods.usdt_bep20_enabled && resellerMethods.usdt_bep20_address) {
      return { ...m, fields:[{label:'BEP20 Address', value:resellerMethods.usdt_bep20_address, note:'BSC network only'}], qr:resellerMethods.usdt_bep20_qr_url||m.qr };
    }
    return m;
  });

  const selAmount = custom ? parseFloat(custom)||0 : amount;
  const selMethod = effectivePaymentMethods.find(m=>m.id===methodId) ?? effectivePaymentMethods[0];
  const lc = localAmt(selAmount, methodId);
  const lcValue = localAmtValue(selAmount, methodId);

  const handleSubmit = async () => {
    if (!txnId.trim()) { toast.error('Enter your transaction ID'); return; }
    if (!user) { toast.error('Please login first'); return; }
    if (selAmount <= 0) { toast.error('Select a valid amount'); return; }
    if (!email.trim()) { toast.error('Enter your email'); return; }
    setSubmitting(true);
    const { error } = await safeQuery(()=>supabase.from('transactions').insert({ user_id:user.id, user_email:email.trim(), user_name:user.name, amount:selAmount, method:methodId, transaction_id:txnId.trim(), status:'pending', referral_email:referralEmail||'' }));
    if (error) {
      if (error.message==='timeout') toast.error('Request timed out.');
      else if (error.message.includes('relation')) toast.error('Table not found. Run SQL migrations.');
      else toast.error('Failed: '+error.message);
    } else {
      toast.success('✅ Submitted! Admin will approve shortly.');
      logActivity({userId:user.id,userEmail:email.trim(),userName:user.name,action:'payment_submit',amount:selAmount,status:'success',meta:{method:methodId,txnId:txnId.trim()||'paypal-auto'}});
      setStep(1); setTxnId(''); setCustom('');
      onSuccess();
    }
    setSubmitting(false);
  };

  return (
    <>
      {/* Reseller paused banner */}
      {resellerPaused && (
        <div style={{ padding:'16px', borderRadius:14, background:'rgba(239,68,68,.08)', border:'1px solid rgba(239,68,68,.25)', marginBottom:14, display:'flex', alignItems:'center', gap:12 }}>
          <span style={{ fontSize:22, flexShrink:0 }}>🚫</span>
          <div>
            <div style={{ fontSize:13, fontWeight:700, color:'#f87171', marginBottom:3 }}>Reseller Subscription Paused</div>
            <div style={{ fontSize:11, color:'rgba(248,113,113,.6)', lineHeight:1.5 }}>This reseller's subscription has been paused. Please contact them or purchase directly from the main shop.</div>
          </div>
        </div>
      )}

      {/* Reseller shop banner */}
      {!resellerPaused && resellerMethods?.shop_name && (
        <div style={{ padding:'10px 16px', borderRadius:13, background:'rgba(139,92,246,.08)', border:'1px solid rgba(139,92,246,.18)', marginBottom:14, display:'flex', alignItems:'center', gap:10 }}>
          <span style={{ fontSize:16 }}>🏪</span>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color:'#c4b5fd' }}>{resellerMethods.shop_name}</div>
            <div style={{ fontSize:10, color:'rgba(255,255,255,.35)', marginTop:1 }}>Powered by 1999X · Authorized Reseller</div>
          </div>
        </div>
      )}
      {qrZoom && selMethod.hasQr && selMethod.qr && !selMethod.qr.startsWith('YOUR_') && (
        <QRZoomModal src={selMethod.qr} onClose={()=>setQrZoom(false)}/>
      )}

      <style>{`
        @keyframes ab-in { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:none} }
        @keyframes ab-fade { from{opacity:0} to{opacity:1} }

        /* Glass card wrapper */
        .ab-card {
          animation: ab-in .32s cubic-bezier(.22,1,.36,1) both;
          border-radius: 24px;
          background: rgba(8,9,22,0.72);
          border: 1px solid rgba(255,255,255,0.08);
          box-shadow: 0 40px 100px rgba(0,0,0,.65), 0 1px 0 rgba(255,255,255,.06) inset;
          backdrop-filter: blur(32px) saturate(1.5);
          -webkit-backdrop-filter: blur(32px) saturate(1.5);
          overflow: hidden;
        }

        /* Section block (like "Contact info", "Shipping") */
        .ab-section {
          border-radius: 18px;
          background: rgba(255,255,255,0.035);
          border: 1px solid rgba(255,255,255,0.07);
          overflow: hidden;
          transition: border-color .2s;
        }
        .ab-section:focus-within { border-color: rgba(139,92,246,.35); }
        .ab-section-title {
          font-size: 16px; font-weight: 800; color: #fff;
          letter-spacing: -.02em; padding: 18px 20px 0;
        }

        /* Field row inside section */
        .ab-field-row {
          padding: 14px 20px;
          border-bottom: 1px solid rgba(255,255,255,.05);
          display: flex; flex-direction: column; gap: 5px;
        }
        .ab-field-row:last-child { border-bottom: none; }
        .ab-field-lbl {
          font-size: 9px; font-weight: 800; letter-spacing: .2em;
          text-transform: uppercase; color: rgba(255,255,255,.3);
        }
        .ab-field-val {
          font-size: 15px; font-weight: 600; color: #fff; letter-spacing: -.01em;
          background: transparent; border: none; outline: none;
          font-family: inherit; width: 100%; padding: 0;
        }
        .ab-field-val::placeholder { color: rgba(255,255,255,.22); }
        .ab-field-val-mono { font-family: monospace; font-size: 14px; }

        /* Amount chips */
        .ab-chip {
          padding: 18px 10px; border-radius: 16px; cursor: pointer;
          border: 1px solid rgba(255,255,255,.07); background: rgba(255,255,255,.03);
          color: rgba(255,255,255,.45); font-family: inherit; font-size: 20px; font-weight: 900;
          transition: all .2s cubic-bezier(.22,1,.36,1);
          display: flex; flex-direction: column; align-items: center; gap: 3px;
        }
        .ab-chip:hover { background: rgba(255,255,255,.07); color: rgba(255,255,255,.85); transform: translateY(-2px); border-color: rgba(255,255,255,.14); }
        .ab-chip.ab-on {
          border-color: rgba(109,40,217,.7);
          background: linear-gradient(135deg,rgba(109,40,217,.18),rgba(139,92,246,.08));
          color: #ddd6fe;
          box-shadow: 0 0 28px rgba(109,40,217,.28), inset 0 1px 0 rgba(255,255,255,.08);
        }

        /* Method row */
        .ab-method {
          display: flex; align-items: center; gap: 14px;
          padding: 14px 20px; cursor: pointer; font-family: inherit;
          border-bottom: 1px solid rgba(255,255,255,.05);
          background: transparent; border-left: none; border-right: none; border-top: none;
          transition: background .15s; width: 100%; text-align: left;
        }
        .ab-method:last-child { border-bottom: none; }
        .ab-method:hover { background: rgba(255,255,255,.04); }
        .ab-method.ab-m-on { background: rgba(255,255,255,.04); border-bottom-color: rgba(255,255,255,.05); }

        /* Submit button */
        .ab-submit {
          width: 100%; padding: 17px; border-radius: 16px; border: none; cursor: pointer;
          font-family: inherit; font-size: 15px; font-weight: 800; letter-spacing: .01em;
          display: flex; align-items: center; justify-content: center; gap: 9px;
          transition: all .25s cubic-bezier(.22,1,.36,1);
          background: linear-gradient(135deg,#7c3aed,#6d28d9,#5b21b6);
          color: #fff;
          box-shadow: 0 0 36px rgba(109,40,217,.5), 0 4px 20px rgba(0,0,0,.35);
          position: relative; overflow: hidden;
        }
        .ab-submit::before { content:''; position:absolute; top:0; bottom:0; left:-80%; width:40%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.14),transparent); transition:left .45s ease; pointer-events:none; }
        .ab-submit:hover { transform: translateY(-2px); box-shadow: 0 0 52px rgba(109,40,217,.7), 0 8px 28px rgba(0,0,0,.4); }
        .ab-submit:hover::before { left:160%; }
        .ab-submit:active { transform: translateY(0) scale(.97); }
        .ab-submit:disabled { opacity:.35; cursor:not-allowed; transform:none !important; }

        /* Copy pill button */
        .ab-copy-btn {
          display: inline-flex; align-items: center; gap: 5px;
          padding: 6px 12px; border-radius: 9px; cursor: pointer; font-family: inherit;
          font-size: 11px; font-weight: 700; transition: all .15s;
          border: 1px solid var(--mc, rgba(255,255,255,.12));
          background: var(--mb, rgba(255,255,255,.05));
          color: var(--mc, rgba(255,255,255,.5));
          flex-shrink: 0;
        }
        .ab-copy-btn:hover { opacity: .85; transform: translateY(-1px); }

        @media(max-width:740px){
          .ab-split-grid{ grid-template-columns:1fr !important; }
          .ab-border-r{ border-right:none !important; border-bottom:1px solid rgba(255,255,255,.06) !important; }
        }
      `}</style>

      {/* ══ STEP 1 — Amount ══ */}
      {step===1 && (
        <div className="ab-card">
          {/* Header */}
          <div style={{ padding:'26px 30px 0', display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:9, fontWeight:800, letterSpacing:'.22em', textTransform:'uppercase', color:'rgba(255,255,255,.28)', marginBottom:4 }}>Deposit to Wallet</div>
              <div style={{ fontSize:13, color:'rgba(255,255,255,.4)', fontWeight:500 }}>Tap the amount to type a custom value</div>
            </div>
            <div style={{ display:'flex', alignItems:'center', gap:6, padding:'8px 16px', borderRadius:99, background:'rgba(255,255,255,.05)', border:'1px solid rgba(255,255,255,.09)' }}>
              <div style={{ width:7, height:7, borderRadius:'50%', background:'#4ade80', boxShadow:'0 0 8px #4ade80' }}/>
              <span style={{ fontSize:12, fontWeight:700, color:'rgba(255,255,255,.55)' }}>Balance: <span style={{ color:'#fff' }}>${balance.toFixed(2)}</span></span>
            </div>
          </div>

          {/* Big clickable amount */}
          <div style={{ textAlign:'center', padding:'28px 30px 22px', cursor:'text' }}
            onClick={()=>{ if (!editingAmount){ setEditingAmount(true); setTimeout(()=>amountInputRef.current?.focus(),30); } }}
          >
            {editingAmount ? (
              <div style={{ display:'inline-flex', alignItems:'baseline', gap:4 }}>
                <span style={{ fontSize:68, fontWeight:900, color:'rgba(255,255,255,.3)', letterSpacing:'-.06em', lineHeight:1 }}>$</span>
                <input ref={amountInputRef} type="number" value={custom}
                  onChange={e=>{ setCustom(e.target.value); setAmount(0); }}
                  onBlur={()=>{ setEditingAmount(false); if (!custom||parseFloat(custom)<=0){setCustom('');setAmount(10);} }}
                  onKeyDown={e=>{ if(e.key==='Enter'||e.key==='Escape'){setEditingAmount(false);if(!custom||parseFloat(custom)<=0){setCustom('');setAmount(10);}} }}
                  placeholder="0"
                  style={{ fontSize:68, fontWeight:900, color:'#fff', letterSpacing:'-.06em', lineHeight:1, background:'transparent', border:'none', outline:'none', fontFamily:'inherit', width:Math.max(2,(custom||'0').length+1)+'ch', minWidth:'1ch', maxWidth:'8ch', caretColor:'#8b5cf6', textShadow:'0 0 60px rgba(139,92,246,.4)' }}
                />
              </div>
            ) : (
              <div style={{ display:'inline-block', fontSize:68, fontWeight:900, color:'#fff', letterSpacing:'-.06em', lineHeight:1, textShadow:'0 0 60px rgba(109,40,217,.35)', borderBottom:'2px solid rgba(255,255,255,.07)', paddingBottom:4, transition:'border-color .2s' }}
                onMouseEnter={e=>(e.currentTarget.style.borderColor='rgba(139,92,246,.45)')}
                onMouseLeave={e=>(e.currentTarget.style.borderColor='rgba(255,255,255,.07)')}
              >
                ${selAmount>0?selAmount.toFixed(2):'0.00'}
                <span style={{ fontSize:14, color:'rgba(255,255,255,.2)', marginLeft:8, fontWeight:500 }}>✎</span>
              </div>
            )}
            {lc && !editingAmount && (
              <div style={{ marginTop:16, display:'flex', justifyContent:'center' }}>
                <div style={{ display:'flex', alignItems:'center', gap:12, flexWrap:'wrap', justifyContent:'center', padding:'14px 18px', borderRadius:18, background:'rgba(255,255,255,.04)', border:'1px solid rgba(255,255,255,.08)' }}>
                  <div>
                    <div style={{ fontSize:10, color:'rgba(255,255,255,.28)', fontWeight:800, letterSpacing:'.16em', textTransform:'uppercase', marginBottom:4 }}>Local Amount</div>
                    <div style={{ fontSize:28, color:'#fff', fontWeight:900, letterSpacing:'-.04em' }}>{lcValue}</div>
                    <div style={{ fontSize:11, color:'rgba(255,255,255,.35)', fontWeight:600 }}>{LOCAL[methodId as keyof typeof LOCAL]?.code}</div>
                  </div>
                  <button className="ab-copy-btn"
                    onClick={() => { navigator.clipboard.writeText(lcValue); toast.success('Converted amount copied'); }}>
                    <Copy size={12}/> Copy
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Chips */}
          <div style={{ padding:'0 30px 26px' }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:20 }}>
              {[5,10,15,25,50,100].map(a=>(
                <button key={a} className={`ab-chip${!custom&&amount===a?' ab-on':''}`}
                  onClick={()=>{setAmount(a);setCustom('');setEditingAmount(false);}}>
                  <span style={{ fontSize:9, fontWeight:700, opacity:.5, letterSpacing:'.1em' }}>USD</span>
                  ${a}
                </button>
              ))}
            </div>
            <button className="ab-submit" onClick={()=>selAmount>0?setStep(2):toast.error('Please select an amount')}>
              Continue to Payment <ArrowRight size={17}/>
            </button>
            <div style={{ display:'flex', justifyContent:'center', gap:20, marginTop:16 }}>
              {['🔒 Secure','⚡ Fast Credit','✓ Verified'].map(s=>(
                <span key={s} style={{ fontSize:10, color:'rgba(255,255,255,.2)', fontWeight:600 }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ STEP 2 — Method + Details ══ */}
      {step===2 && (
        <div className="ab-card">

          {/* Top bar */}
          <div style={{ padding:'18px 24px 16px', borderBottom:'1px solid rgba(255,255,255,.06)', display:'flex', alignItems:'center', gap:12 }}>
            <button onClick={()=>setStep(1)} style={{ display:'flex', alignItems:'center', gap:5, padding:'7px 14px', borderRadius:10, background:'rgba(255,255,255,.06)', border:'1px solid rgba(255,255,255,.09)', cursor:'pointer', color:'rgba(255,255,255,.55)', fontSize:12, fontFamily:'inherit', fontWeight:700, transition:'all .15s' }}
              onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.1)';(e.currentTarget as HTMLButtonElement).style.color='#fff';}}
              onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.06)';(e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,.55)';}}
            ><ArrowLeft size={13}/> Back</button>
            <div style={{ flex:1, fontSize:11, fontWeight:700, letterSpacing:'.16em', textTransform:'uppercase', color:'rgba(255,255,255,.22)' }}>Payment</div>
            <div style={{ padding:'8px 20px', borderRadius:99, background:'rgba(109,40,217,.18)', border:'1px solid rgba(139,92,246,.28)', fontSize:17, fontWeight:900, color:'#c4b5fd', letterSpacing:'-.02em' }}>${selAmount.toFixed(2)}</div>
          </div>

          {/* Two column */}
          <div className="ab-split-grid" style={{ display:'grid', gridTemplateColumns:'1fr 1.1fr' }}>

            {/* LEFT — Payment Method section (like "Payments" in photo) */}
            <div className="ab-border-r" style={{ padding:'22px 20px', borderRight:'1px solid rgba(255,255,255,.05)' }}>
              <div className="ab-section">
                <div className="ab-section-title" style={{ paddingBottom:14 }}>Payment Method</div>
                {effectivePaymentMethods.map(m=>{
                  const active = methodId===m.id;
                  return (
                    <button key={m.id} className={`ab-method${active?' ab-m-on':''}`}
                      style={{
                        borderLeft: active ? `3px solid ${m.color}` : '3px solid transparent',
                        background: active ? `linear-gradient(90deg, ${m.bgColor}, rgba(0,0,0,0))` : 'transparent',
                      } as React.CSSProperties}
                      onClick={()=>setMethodId(m.id)}>
                      {/* Icon */}
                      <div style={{ width:40, height:40, borderRadius:12, flexShrink:0, display:'flex', alignItems:'center', justifyContent:'center', background: active ? m.bgColor : 'rgba(255,255,255,.06)', border:`1px solid ${active ? m.color : 'rgba(255,255,255,.08)'}`, transition:'all .2s', boxShadow: active ? `0 0 14px ${m.glow}` : 'none' }}>
                        {m.icon}
                      </div>
                      {/* Label */}
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:14, fontWeight:700, color: active ? '#fff' : 'rgba(255,255,255,.55)', letterSpacing:'-.01em' }}>{m.label}</div>
                        {active && lc && <div style={{ fontSize:10, color:m.color, fontWeight:600, marginTop:2 }}>{lc}</div>}
                      </div>
                      {/* Dot indicator */}
                      {active && <div style={{ width:8, height:8, borderRadius:'50%', background:m.color, boxShadow:`0 0 8px ${m.color}`, flexShrink:0 }}/>}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* RIGHT — Details (like "Card information" sections in photo) */}
            <div style={{ padding:'22px 22px 24px', display:'flex', flexDirection:'column', gap:14 }}>

              {/* Order summary section */}
              <div className="ab-section">
                <div style={{ padding:'16px 20px', borderBottom:'1px solid rgba(255,255,255,.05)', display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{ width:36, height:36, borderRadius:10, background:selMethod.bgColor, border:`1px solid ${selMethod.borderColor}`, display:'flex', alignItems:'center', justifyContent:'center' }}>{selMethod.icon}</div>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:9, color:'rgba(255,255,255,.28)', fontWeight:800, letterSpacing:'.18em', textTransform:'uppercase' }}>Paying via</div>
                    <div style={{ fontSize:14, fontWeight:800, color:'#fff' }}>{selMethod.label}</div>
                  </div>
                  <div style={{ fontSize:28, fontWeight:900, color:'#fff', letterSpacing:'-.04em' }}>${selAmount.toFixed(2)}</div>
                </div>
                {lc && (
                  <div style={{ padding:'16px 20px', display:'flex', alignItems:'center', justifyContent:'space-between', gap:12, flexWrap:'wrap' }}>
                    <div>
                      <div style={{ fontSize:9, color:'rgba(255,255,255,.28)', fontWeight:800, letterSpacing:'.18em', textTransform:'uppercase', marginBottom:4 }}>Send Exactly</div>
                      <div style={{ fontSize:34, fontWeight:900, color:'#fff', letterSpacing:'-.05em' }}>{lcValue}</div>
                      <div style={{ fontSize:11, color:selMethod.color, fontWeight:700 }}>{LOCAL[methodId as keyof typeof LOCAL]?.name} • {LOCAL[methodId as keyof typeof LOCAL]?.code}</div>
                    </div>
                    <button className="ab-copy-btn" style={({'--mc':selMethod.color,'--mb':selMethod.bgColor} as React.CSSProperties)}
                      onClick={() => { navigator.clipboard.writeText(lcValue); toast.success('Converted amount copied'); }}>
                      <Copy size={12}/> Copy Amount
                    </button>
                  </div>
                )}
              </div>

              {/* QR Code */}
              {selMethod.hasQr && selMethod.qr && !selMethod.qr.startsWith('YOUR_') && (
                <div style={{ textAlign:'center', padding:'4px 0' }}>
                  <div style={{ display:'inline-block', padding:11, borderRadius:20, background:'#fff', cursor:'zoom-in', transition:'transform .2s, box-shadow .2s', boxShadow:`0 0 40px ${selMethod.glow}, 0 12px 36px rgba(0,0,0,.5)` }}
                    onClick={()=>setQrZoom(true)}
                    onMouseEnter={e=>{(e.currentTarget as HTMLDivElement).style.transform='scale(1.04)';}}
                    onMouseLeave={e=>{(e.currentTarget as HTMLDivElement).style.transform='scale(1)';}}
                  >
                    <img src={selMethod.qr} alt="QR" style={{ width:140, height:140, objectFit:'contain', borderRadius:12, display:'block' }} onError={e=>{(e.target as HTMLImageElement).style.display='none';}}/>
                  </div>
                  <div style={{ fontSize:9, color:'rgba(255,255,255,.22)', fontWeight:700, letterSpacing:'.12em', marginTop:8 }}>TAP TO ZOOM • SCAN TO PAY</div>
                </div>
              )}

              {/* Payment ID fields as section rows */}
              {selMethod.fields.length>0 && selMethod.id!=='paypal' && selMethod.id!=='truewallet' && (
                <div className="ab-section">
                  {selMethod.fields.map((f,i)=>(
                    <div key={i} style={{ padding:'14px 20px', borderBottom:i<selMethod.fields.length-1?'1px solid rgba(255,255,255,.05)':'none' }}>
                      <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:5 }}>
                        <span style={{ fontSize:9, fontWeight:800, letterSpacing:'.2em', textTransform:'uppercase', color:'rgba(255,255,255,.3)' }}>{f.label}</span>
                        {f.note && <span style={{ fontSize:9, fontWeight:800, color:selMethod.color, letterSpacing:'.08em' }}>{f.note}</span>}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <code style={{ flex:1, fontSize:17, fontFamily:'monospace', color:'#fff', fontWeight:700, letterSpacing:'.01em', wordBreak:'break-all' }}>{f.value}</code>
                        {!f.value.startsWith('http') && !f.value.startsWith('YOUR_') && (
                          <button className="ab-copy-btn" style={({'--mc':selMethod.color,'--mb':selMethod.bgColor} as React.CSSProperties)}
                            onClick={()=>{navigator.clipboard.writeText(f.value);toast.success(`${f.label} copied!`);}}>
                            <Copy size={12}/> Copy
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* PayPal */}
              {selMethod.id==='paypal' && <PayPalButton amount={selAmount} user={user} onSuccess={onSuccess} referralEmail={referralEmail}/>}

              {/* TrueWallet */}
              {selMethod.id==='truewallet' && <TrueWalletRedeem user={user} onSuccess={onSuccess} expectedUsdAmount={selAmount} referralEmail={referralEmail}/>}

              {/* Manual form fields — like "Contact info" section */}
              {selMethod.id!=='paypal' && selMethod.id!=='truewallet' && (
                <>
                  <div className="ab-section">
                    <div className="ab-section-title">Your Info</div>
                    <div className="ab-field-row">
                      <div className="ab-field-lbl">Email</div>
                      <input type="email" className="ab-field-val" placeholder="you@example.com" value={email} onChange={e=>setEmail(e.target.value)}/>
                    </div>
                    <div className="ab-field-row">
                      <div className="ab-field-lbl">Transaction ID</div>
                      <input type="text" className="ab-field-val ab-field-val-mono" placeholder="Paste TXN / reference ID…" value={txnId} onChange={e=>setTxnId(e.target.value)}/>
                    </div>
                  </div>

                  <button className="ab-submit" onClick={()=>{
                    if (!txnId.trim()){toast.error('Enter your transaction ID');return;}
                    if (!email.trim()){toast.error('Enter your email');return;}
                    setStep(3);
                  }}>
                    I've Sent Payment <ArrowRight size={16}/>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ══ STEP 3 — Confirm ══ */}
      {step===3 && (
        <div className="ab-card" style={{ padding:'36px 32px' }}>
          <button onClick={()=>setStep(2)} style={{ display:'flex', alignItems:'center', gap:6, background:'none', border:'none', cursor:'pointer', color:'rgba(255,255,255,.35)', fontSize:13, fontFamily:'inherit', marginBottom:26, padding:0, fontWeight:700, transition:'color .15s' }}
            onMouseEnter={e=>(e.currentTarget.style.color='#fff')} onMouseLeave={e=>(e.currentTarget.style.color='rgba(255,255,255,.35)')}
          ><ArrowLeft size={14}/> Back</button>

          <div style={{ fontSize:9, fontWeight:800, letterSpacing:'.22em', textTransform:'uppercase', color:'rgba(255,255,255,.25)', marginBottom:6 }}>Review Order</div>
          <div style={{ fontSize:28, fontWeight:900, color:'#fff', letterSpacing:'-.03em', marginBottom:24 }}>Confirm Submission</div>

          <div className="ab-section" style={{ marginBottom:16 }}>
            {[{l:'Method',v:selMethod.label},{l:'Amount',v:`$${selAmount.toFixed(2)}`},{l:'Email',v:email},{l:'Transaction ID',v:txnId}].map((r,i)=>(
              <div key={r.l} style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'15px 20px', borderBottom:i<3?'1px solid rgba(255,255,255,.05)':'none' }}>
                <span style={{ fontSize:10, fontWeight:800, letterSpacing:'.14em', textTransform:'uppercase', color:'rgba(255,255,255,.3)' }}>{r.l}</span>
                <span style={{ fontSize:14, fontWeight:700, color:'#fff', fontFamily:r.l==='Transaction ID'?'monospace':undefined, maxWidth:240, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{r.v}</span>
              </div>
            ))}
          </div>

          <div style={{ display:'flex', alignItems:'center', gap:10, padding:'13px 18px', borderRadius:14, background:'rgba(109,40,217,.08)', border:'1px solid rgba(139,92,246,.18)', marginBottom:22 }}>
            <span style={{ fontSize:16, flexShrink:0 }}>⚡</span>
            <p style={{ fontSize:12, color:'rgba(255,255,255,.5)', lineHeight:1.6, margin:0 }}>Admin will verify and credit <strong style={{ color:'#a78bfa' }}>${selAmount.toFixed(2)}</strong> to your balance within minutes.</p>
          </div>

          <button className="ab-submit" onClick={handleSubmit} disabled={submitting}>
            {submitting ? <><Loader2 size={18} className="animate-spin"/> Submitting…</> : <><CheckCircle size={17}/> Confirm &amp; Submit</>}
          </button>
        </div>
      )}
    </>
  );
}

//  Main WalletPage
// ══════════════════════════════════════════════════════════════
export default function WalletPage() {
  const { t } = useTranslation();
  const { balance, deductBalance, refundBalance, addLicense, licenses, user } = useAppStore();
  const [myTxns, setMyTxns] = useState<any[]>([]);
  const [activeReferral, setActiveReferral] = useState('');
  const [txnsLoad, setTxnsLoad] = useState(false);
  const [pageResellerMethods, setPageResellerMethods] = useState<ResellerPaymentMethods | null>(null);
  const [pageResellerMethods, setPageResellerMethods] = useState<ResellerPaymentMethods | null>(null);
  const [purchaseSuccess, setPurchaseSuccess] = useState<{ product: any; keys: Array<{ key: string; panelId: string; panelName: string; expiresAt: string }> } | null>(null);
  const [confirmPending, setConfirmPending] = useState<any | null>(null);
  const [activeTab, setActiveTab] = useState<'products'|'deposit'|'history'>('products');

  const isAdmin   = user?.role === 'admin';
  const isSupport = user?.role === 'support';
  const canApprove = canApprovePayments(user?.role);
  const normalizedUserEmail = normalizeResellerEmail(user?.email ?? '');
  const sortedPurchasedLicenses = [...licenses].sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime());


  const loadTxns = async () => {
    if (!user) return;
    setTxnsLoad(true);
    const { data } = await safeQuery(() =>
      supabase
        .from('transactions')
        .select('id,user_id,user_email,user_name,amount,method,transaction_id,status,note,created_at,updated_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(40)
    );
    setMyTxns(data ?? []);
    setTxnsLoad(false);
  };

  useEffect(() => {
    let cancelled = false;
    const resolveActiveReferral = async () => {
      const captured = captureReferralFromUrl(user?.email);
      const rawReferral = normalizeReferralValue(captured || getStoredReferralEmail());

      if (!rawReferral || rawReferral === normalizedUserEmail) {
        setActiveReferral('');
        return;
      }

      // Use rawReferral directly — it may be a ref code (e.g. "jackparkdum01") or email.
      // fetchResellerPaymentMethods handles both via reseller_accounts + direct user_email lookup.
      if (cancelled) return;
      setActiveReferral(rawReferral);
      console.log('[Reseller] activeReferral set to:', rawReferral);
    };
    void resolveActiveReferral();
    return () => { cancelled = true; };
  }, [normalizedUserEmail]);

  // Fetch reseller methods at page level for products tab paused check + custom pricing
  useEffect(() => {
    if (!activeReferral) { setPageResellerMethods(null); return; }
    fetchResellerPaymentMethods(supabase, activeReferral).then(m => setPageResellerMethods(m ?? null));
  }, [activeReferral]);

  useEffect(() => {
    if (!user || canApprove || isSupport) return;
    loadTxns();
    const onFocus = () => { void loadTxns(); };
    window.addEventListener('focus', onFocus);
    const ch = supabase.channel(`wallet-${user.id}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions', filter: `user_id=eq.${user.id}` }, () => loadTxns())
      .subscribe();
    return () => {
      window.removeEventListener('focus', onFocus);
      supabase.removeChannel(ch);
    };
  }, [user?.id, canApprove, isSupport]);

  const handleBuy = async (product: any) => {
    if (balance < product.price) { toast.error(t('shop.insufficientBalance')); return; }
    const deducted = deductBalance(product.price);
    if (!deducted) { toast.error(t('shop.insufficientBalance')); return; }
    const panel = product.keyauthPanel ?? 'lag';
    const days  = product.days || parseInt(product.duration)||7;
    const toGen = panel==='both' ? ['internal','lag'] : [panel];
    const generatedKeys: Array<{key:string;panelId:string;panelName:string;expiresAt:string}> = [];
    const errors: string[] = [];
    toast.loading(t('wallet.generatingKey'), { id:'keygen' });
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
          const licenseKey = p==='lag' ? result.key : result.key+'_INTERNAL';
          addLicense({ id:`purchase_${Math.random().toString(36).slice(2,10)}`, productId:panelId, productName:panelNm, key:licenseKey, keyauthUsername:result.key, hwid:'', lastLogin:new Date().toISOString(), expiresAt:expiry, status:'active', ip:'', device:'', hwidResetsUsed:0, hwidResetMonth:new Date().getMonth() });
          if (user?.id && user?.email) {
            await safeQuery(() => supabase.from('user_licenses').upsert({
              user_id: user.id,
              user_email: user.email,
              product_id: panelId,
              product_name: panelNm,
              license_key: licenseKey,
              keyauth_username: result.key,
              hwid: '',
              last_login: new Date().toISOString(),
              expires_at: expiry,
              status: 'active',
              ip: '',
              device: '',
              hwid_resets_used: 0,
              hwid_reset_month: new Date().getMonth(),
            }, { onConflict: 'user_id,license_key' }));
          }
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
      toast.error(`${t('wallet.keyGenerationFailed')} $${product.price}. ${errDetail}`, { duration: 12000 });
    }
  };

  // Admin view
  if (canApprove) return (
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
            <span style={{ display:'inline-flex',alignItems:'center',gap:5,padding:'5px 12px',borderRadius:20,background:isOwner(user?.role)?'rgba(251,191,36,.1)':'rgba(239,68,68,.1)',border:`1px solid ${isOwner(user?.role)?'rgba(251,191,36,.25)':'rgba(239,68,68,.25)'}`,fontSize:11,fontWeight:700,color:isOwner(user?.role)?'#fbbf24':'#f87171' }}>
              {isOwner(user?.role) ? '👑 Owner — Full Access' : '🛡 Admin — Payment Approvals Only'}
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
          padding: 11px 20px; border-radius: 12px; font-size: 13px; font-weight: 600;
          cursor: pointer; border: 1px solid transparent; background: transparent;
          color: rgba(255,255,255,.35); font-family: inherit;
          transition: all .25s cubic-bezier(.22,1,.36,1);
          display: flex; align-items: center; gap: 8px; white-space: nowrap;
          letter-spacing: .01em; text-align: center;
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

      <div style={{ display:'flex', flexDirection:'column', gap:20, flex:1, minHeight:0 }}>




        {/* ══ TABS ══ */}
        <div style={{ display:'flex', alignItems:'center', gap:3, padding:'4px', background:'rgba(255,255,255,.025)', borderRadius:15, border:'1px solid rgba(255,255,255,.06)', backdropFilter:'blur(12px)' }}>
          {([
            { id:'products', icon:<ShoppingBag size={13}/>, label:t('wallet.products')   },
            { id:'deposit',  icon:<Wallet      size={13}/>, label:t('wallet.addBalance') },
            { id:'history',  icon:<RefreshCw   size={13}/>, label:t('wallet.history')    },
          ] as const).map(tab=>(
            <button key={tab.id} className={`w-tab${activeTab===tab.id?' wt-on':''}`} onClick={()=>setActiveTab(tab.id)} style={{ flex:1, justifyContent:'center' }}>
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
          <div style={{ animation:'w-slide-up .4s cubic-bezier(.22,1,.36,1) both', flex:1 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:24, flexWrap:'wrap', gap:12 }}>
              <div>
                <div style={{ fontSize:22, fontWeight:900, color:'#fff', letterSpacing:'-.02em', marginBottom:4 }}>{t('wallet.choosePlan')}</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,.38)' }}>{t('wallet.choosePlanDesc')}</div>
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20, background:'rgba(16,232,152,.08)', border:'1px solid rgba(16,232,152,.2)' }}>
                  <div className="dot dot-green" style={{ width:5, height:5 }}/>
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--green)' }}>OB52 Undetected</span>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:6, padding:'6px 14px', borderRadius:20, background:'rgba(56,189,248,.07)', border:'1px solid rgba(56,189,248,.18)' }}>
                  <span style={{ fontSize:11, fontWeight:700, color:'var(--blue)' }}>{t('wallet.instantKey')}</span>
                </div>
              </div>
            </div>
                    {/* Paused reseller link error */}
              {(pageResellerMethods as any)?._paused && (
                <div style={{ padding:'28px 24px', borderRadius:20, background:'rgba(239,68,68,.07)', border:'1px solid rgba(239,68,68,.22)', textAlign:'center', margin:'8px 0' }}>
                  <div style={{ fontSize:36, marginBottom:12 }}>🚫</div>
                  <div style={{ fontSize:16, fontWeight:700, color:'#f87171', marginBottom:6 }}>Reseller Subscription Paused</div>
                  <div style={{ fontSize:13, color:'rgba(248,113,113,.6)', lineHeight:1.6 }}>This reseller's subscription has been paused or ended.<br/>Please contact them or visit the shop directly.</div>
                </div>
              )}
              {!(pageResellerMethods as any)?._paused && (
                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))', gap:18, alignItems:'stretch' }}>
                  {PANEL_GROUPS.map(group => {
                    // Apply reseller custom pricing if set
                    const rm = pageResellerMethods as any;
                    const effectiveGroup = rm ? {
                      ...group,
                      plans: group.plans.map(p => {
                        const key = `price_${p.id.replace('-','_')}` as string;
                        const customPrice = rm[key];
                        return customPrice && customPrice > 0 ? { ...p, price: customPrice } : p;
                      })
                    } : group;
                    return (
                      <PanelProductCard key={group.id} group={effectiveGroup as any} balance={balance} onBuy={(p)=>setConfirmPending(p)} onAddBalance={() => setActiveTab('deposit')}/>
                    );
                  })}
                </div>
              )}
            <div style={{ marginTop:20, display:'flex', alignItems:'center', justifyContent:'center', gap:20, flexWrap:'wrap', padding:'14px 0', borderTop:'1px solid rgba(255,255,255,.05)' }}>
              {['🔑 Key delivered instantly','🔒 Secured by KeyAuth','🔄 HWID resets included','💬 24/7 support'].map(item=>(
                <span key={item} style={{ fontSize:11, color:'rgba(255,255,255,.28)', fontWeight:500 }}>{item}</span>
              ))}
            </div>
          </div>
        )}

        {/* ══ DEPOSIT TAB ══ */}
        {activeTab==='deposit'&&(
          <div style={{ animation:'w-slide-up .4s cubic-bezier(.22,1,.36,1) both', flex:1, display:'flex', flexDirection:'column' }}>
            <AddBalanceUI user={user} onSuccess={loadTxns} referralEmail={activeReferral}/>
          </div>
        )}

        {/* ══ HISTORY TAB ══ */}
        {activeTab==='history'&&(
          <div style={{ animation:'w-slide-up .4s cubic-bezier(.22,1,.36,1) both', flex:1 }}>
            <style>{`
              @keyframes tx-in { from{opacity:0;transform:translateY(12px)} to{opacity:1;transform:none} }

              .tx-card {
                border-radius: 18px;
                border: 1px solid rgba(255,255,255,.07);
                background: rgba(255,255,255,.025);
                backdrop-filter: blur(12px);
                overflow: hidden;
                transition: border-color .2s, box-shadow .2s, transform .22s cubic-bezier(.22,1,.36,1);
                animation: tx-in .4s cubic-bezier(.22,1,.36,1) both;
              }
              .tx-card:hover { border-color:rgba(255,255,255,.12); transform:translateY(-2px); box-shadow:0 12px 40px rgba(0,0,0,.4); }
              .tx-card.tx-approved { border-color:rgba(16,232,152,.14); }
              .tx-card.tx-approved:hover { border-color:rgba(16,232,152,.28); box-shadow:0 12px 40px rgba(0,0,0,.4),0 0 28px rgba(16,232,152,.08); }
              .tx-card.tx-pending  { border-color:rgba(251,191,36,.14); }
              .tx-card.tx-pending:hover  { border-color:rgba(251,191,36,.28); box-shadow:0 12px 40px rgba(0,0,0,.4),0 0 28px rgba(251,191,36,.06); }
              .tx-card.tx-rejected { border-color:rgba(248,113,113,.14); }
              .tx-card.tx-rejected:hover { border-color:rgba(248,113,113,.28); box-shadow:0 12px 40px rgba(0,0,0,.4),0 0 28px rgba(248,113,113,.06); }

              .tx-status-approved { background:rgba(16,232,152,.1); border:1px solid rgba(16,232,152,.22); color:#10e898; }
              .tx-status-pending  { background:rgba(251,191,36,.1); border:1px solid rgba(251,191,36,.22); color:#fbbf24; }
              .tx-status-rejected { background:rgba(248,113,113,.1); border:1px solid rgba(248,113,113,.22); color:#f87171; }

              .tx-pill {
                display:inline-flex; align-items:center; gap:5px;
                padding:5px 12px; border-radius:99px; font-size:11px; font-weight:700;
                letter-spacing:.02em;
              }
              .tx-dot {
                width:6px; height:6px; border-radius:50%; flex-shrink:0;
              }
              .tx-dot-approved { background:#10e898; box-shadow:0 0 6px rgba(16,232,152,.7); }
              .tx-dot-pending  { background:#fbbf24; animation:tx-pulse 1.8s ease-in-out infinite; }
              .tx-dot-rejected { background:#f87171; }
              @keyframes tx-pulse { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.4)} }

              .tx-meta-chip {
                display:inline-flex; align-items:center; gap:5px;
                padding:3px 9px; border-radius:7px;
                background:rgba(255,255,255,.04); border:1px solid rgba(255,255,255,.07);
                font-size:10px; font-weight:600; color:rgba(255,255,255,.45);
                font-family:monospace; letter-spacing:.02em;
              }
            `}</style>

            {/* Header */}
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:18 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:800, color:'#fff', letterSpacing:'-.02em', marginBottom:3 }}>Deposit History</div>
                <div style={{ fontSize:12, color:'rgba(255,255,255,.3)' }}>
                  {myTxns.length} transaction{myTxns.length!==1?'s':''} · ${myTxns.filter(t=>t.status==='approved').reduce((s,t)=>s+Number(t.amount),0).toFixed(2)} total deposited
                </div>
              </div>
              <button onClick={loadTxns} disabled={txnsLoad}
                style={{ display:'flex',alignItems:'center',gap:6,padding:'8px 16px',borderRadius:11,background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.09)',cursor:'pointer',color:'rgba(255,255,255,.55)',fontFamily:'inherit',fontSize:12,fontWeight:600,transition:'all .18s' }}
                onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.09)';(e.currentTarget as HTMLButtonElement).style.color='#fff';}}
                onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(255,255,255,.05)';(e.currentTarget as HTMLButtonElement).style.color='rgba(255,255,255,.55)';}}>
                <RefreshCw size={12} className={txnsLoad?'animate-spin':''}/> Refresh
              </button>
            </div>

            {/* Summary strip */}
            {myTxns.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:18 }}>
                {[
                  { label:'Total Deposited', val:`$${myTxns.filter(t=>t.status==='approved').reduce((s,t)=>s+Number(t.amount),0).toFixed(2)}`, color:'#10e898', bg:'rgba(16,232,152,.07)', bc:'rgba(16,232,152,.15)' },
                  { label:'Pending', val:myTxns.filter(t=>t.status==='pending').length, color:'#fbbf24', bg:'rgba(251,191,36,.07)', bc:'rgba(251,191,36,.15)' },
                  { label:'Total Transactions', val:myTxns.length, color:'rgba(255,255,255,.7)', bg:'rgba(255,255,255,.04)', bc:'rgba(255,255,255,.09)' },
                ].map(s=>(
                  <div key={s.label} style={{ padding:'14px 16px', borderRadius:14, background:s.bg, border:`1px solid ${s.bc}` }}>
                    <div style={{ fontSize:9, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,.38)', marginBottom:5 }}>{s.label}</div>
                    <div style={{ fontSize:22, fontWeight:900, color:s.color, letterSpacing:'-.03em' }}>{s.val}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Transaction list */}
            {txnsLoad ? (
              <div style={{ display:'flex',alignItems:'center',justifyContent:'center',gap:10,padding:'56px 0',color:'rgba(255,255,255,.3)' }}>
                <Loader2 size={16} className="animate-spin"/>
                <span style={{ fontSize:13 }}>Loading transactions…</span>
              </div>
            ) : myTxns.length === 0 ? (
              <div style={{ textAlign:'center', padding:'64px 0', borderRadius:20, border:'1px dashed rgba(255,255,255,.08)', background:'rgba(255,255,255,.015)' }}>
                <div style={{ fontSize:40, marginBottom:14, opacity:.4 }}>💳</div>
                <p style={{ fontSize:15, color:'rgba(255,255,255,.35)', fontWeight:700, marginBottom:5 }}>No deposits yet</p>
                <p style={{ fontSize:12, color:'rgba(255,255,255,.18)' }}>Add balance to see your transaction history here</p>
              </div>
            ) : (
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {myTxns.map((tx, i) => {
                  const m = PAYMENT_METHODS.find(p=>p.id===tx.method);
                  const isApproved = tx.status==='approved';
                  const isPending  = tx.status==='pending';
                  const isRejected = tx.status==='rejected';
                  const statusClass = isApproved?'tx-approved':isPending?'tx-pending':'tx-rejected';
                  const accentBar = isApproved?'#10e898':isPending?'#fbbf24':'#f87171';
                  return (
                    <div key={tx.id} className={`tx-card ${statusClass}`} style={{ animationDelay:`${i*50}ms` }}>
                      {/* Left accent bar */}
                      <div style={{ position:'absolute',top:0,bottom:0,left:0,width:3,background:accentBar,opacity:.7,borderRadius:'18px 0 0 18px' }}/>

                      <div style={{ padding:'18px 20px 18px 22px' }}>
                        {/* Top row: amount + status */}
                        <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:14, gap:12 }}>
                          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                            {/* Payment method icon */}
                            <div style={{ width:44,height:44,borderRadius:13,background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.09)',display:'flex',alignItems:'center',justifyContent:'center',overflow:'hidden',flexShrink:0 }}>
                              {m?.icon ?? <span style={{ fontSize:20 }}>💳</span>}
                            </div>
                            <div>
                              <div style={{ display:'flex', alignItems:'baseline', gap:6, marginBottom:3 }}>
                                <span style={{ fontSize:24, fontWeight:900, color:'#fff', letterSpacing:'-.04em' }}>
                                  ${Number(tx.amount).toFixed(2)}
                                </span>
                                <span style={{ fontSize:12, color:'rgba(255,255,255,.4)', fontWeight:500 }}>USD</span>
                              </div>
                              <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                                <span style={{ fontSize:13, fontWeight:600, color:'rgba(255,255,255,.7)' }}>
                                  via {m?.label ?? tx.method}
                                </span>
                              </div>
                            </div>
                          </div>
                          {/* Status badge */}
                          <div className={`tx-pill tx-status-${tx.status}`} style={{ flexShrink:0 }}>
                            <div className={`tx-dot tx-dot-${tx.status}`}/>
                            {isApproved ? '✓ Approved' : isPending ? 'Pending' : '✕ Rejected'}
                          </div>
                        </div>

                        {/* Detail chips row */}
                        <div style={{ display:'flex', flexWrap:'wrap', gap:7, marginBottom:tx.transaction_id?12:0 }}>
                          <span className="tx-meta-chip">
                            📅 {new Date(tx.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric',hour:'2-digit',minute:'2-digit'})}
                          </span>
                          {tx.transaction_id && (
                            <span className="tx-meta-chip">
                              # {tx.transaction_id.slice(0,22)}{tx.transaction_id.length>22?'…':''}
                            </span>
                          )}
                          {tx.note && tx.note.includes('Auto') && (
                            <span className="tx-meta-chip" style={{ color:'rgba(56,189,248,.8)',borderColor:'rgba(56,189,248,.15)',background:'rgba(56,189,248,.06)' }}>
                              ⚡ Auto-verified
                            </span>
                          )}
                        </div>

                        {/* Full TXN ID (if exists) */}
                        {tx.transaction_id && tx.transaction_id.length > 22 && (
                          <div style={{ marginTop:10, padding:'9px 12px', borderRadius:10, background:'rgba(0,0,0,.2)', border:'1px solid rgba(255,255,255,.06)' }}>
                            <div style={{ fontSize:8, fontWeight:700, letterSpacing:'.12em', textTransform:'uppercase', color:'rgba(255,255,255,.25)', marginBottom:4 }}>Transaction ID</div>
                            <code style={{ fontSize:11, fontFamily:'monospace', color:'rgba(255,255,255,.55)', wordBreak:'break-all', lineHeight:1.5 }}>
                              {tx.transaction_id}
                            </code>
                          </div>
                        )}
                      </div>

                      {/* Bottom status bar for pending */}
                      {isPending && (
                        <div style={{ padding:'9px 22px', background:'rgba(251,191,36,.04)', borderTop:'1px solid rgba(251,191,36,.1)', display:'flex', alignItems:'center', gap:8 }}>
                          <div className="tx-dot tx-dot-pending"/>
                          <span style={{ fontSize:11, color:'rgba(251,191,36,.7)', fontWeight:600 }}>Awaiting admin approval — usually within a few minutes</span>
                        </div>
                      )}
                      {isRejected && (
                        <div style={{ padding:'9px 22px', background:'rgba(248,113,113,.04)', borderTop:'1px solid rgba(248,113,113,.1)', display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:11, color:'rgba(248,113,113,.6)', fontWeight:600 }}>Payment was rejected. Contact support if you believe this is an error.</span>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
