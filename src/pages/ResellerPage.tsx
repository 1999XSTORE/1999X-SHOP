import { useState, useEffect, useRef } from 'react';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { safeQuery } from '@/lib/safeFetch';
import { logActivity } from '@/lib/activity';
import { buildReferralLink, sanitizeReferralCode, normalizeResellerEmail, captureReferralFromUrl, getStoredReferralEmail, normalizeReferralValue, clearStoredReferralEmail } from '@/lib/reseller';
import { Copy, CheckCircle, Loader2, ArrowRight, TrendingUp, DollarSign, Link2, ChevronDown, Wallet, Users, BarChart3, ExternalLink, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

const SUPABASE_URL  = 'https://awjouzwzdkrevvnlenvn.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3am91end6ZGtyZXZ2bmxlbnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTg4MjEsImV4cCI6MjA5MDAzNDgyMX0._I_I-WA_8-YqDfaRzKiVgpEAhkH9faxlEIV6e766A0M';
const OWNER_BINANCE_PAY_ID = '1104953117';

const HERO_IMAGE = 'https://www.dropbox.com/scl/fi/gshxatzs1yojn8ix697v6/image-removebg-preview-1.png?rlkey=q8419he741co7pfhgp9mtxeiq&st=8g6cthpy&raw=1';

const PLANS = [
  {
    id: 'monthly',
    label: 'Monthly',
    price: 50,
    duration: 30,
    tag: 'STARTER',
    tagColor: '#8b5cf6',
    features: ['Internal Panel Access', 'Fake Lag Access', '10% fee per sale', 'Referral dashboard', 'Custom referral link'],
    feeRate: 0.10,
    displayFee: '10% fee per sale',
  },
  {
    id: '3month',
    label: '3 Months',
    price: 100,
    duration: 90,
    tag: 'BEST VALUE',
    tagColor: '#f59e0b',
    features: ['Internal Panel Access', 'Fake Lag Access', 'No fees on sales', 'Priority support', 'Custom referral link'],
    feeRate: 0.01, // internal only, never shown
    displayFee: 'No fee on sales',
  },
] as const;

type PlanId = typeof PLANS[number]['id'];

interface Subscription {
  id: string;
  plan: PlanId;
  price: number;
  fee_rate: number;
  status: string;
  started_at: string;
  expires_at: string;
}

function roundMoney(n: number) { return Math.round(n * 100) / 100; }

function FeePaymentModal({ dueAmount, userId, userEmail, onClose, onSuccess }: {
  dueAmount: number; userId: string; userEmail: string;
  onClose: () => void; onSuccess: () => void;
}) {
  const [amount, setAmount] = useState(dueAmount.toFixed(2));
  const [binanceTxId, setBinanceTxId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const amt = roundMoney(Number(amount));
    if (!amt || amt <= 0) { toast.error('Enter a valid fee amount'); return; }
    if (!binanceTxId.trim()) { toast.error('Enter Binance transaction ID'); return; }

    setLoading(true);
    const { error } = await safeQuery(() =>
      supabase.rpc('submit_reseller_fee_payment', {
        p_user_id: userId,
        p_email: userEmail,
        p_amount: amt,
        p_binance_pay_id: OWNER_BINANCE_PAY_ID,
        p_binance_tx_id: binanceTxId.trim(),
      })
    );
    setLoading(false);

    if (error) { toast.error(error.message || 'Fee payment submission failed'); return; }

    await supabase.from('activity_logs').insert({
      user_id: userId,
      user_email: userEmail,
      user_name: userEmail,
      action_type: 'reseller_fee_payment',
      product: 'Reseller Fee Payment',
      amount: amt,
      meta: { binance_id: OWNER_BINANCE_PAY_ID, binance_tx_id: binanceTxId.trim() },
      status: 'success',
    }).maybeSingle();

    toast.success('Fee payment submitted. Admin approval is required before withdrawal unlocks.');
    onSuccess();
    onClose();
  };

  return (
    <div style={{ position:'fixed',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.85)',backdropFilter:'blur(16px)',padding:20 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:'100%',maxWidth:420,borderRadius:24,background:'rgba(8,9,22,.96)',border:'1px solid rgba(255,255,255,.1)',boxShadow:'0 32px 80px rgba(0,0,0,.7)',padding:'32px 28px',backdropFilter:'blur(32px)' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24 }}>
          <div>
            <div style={{ fontSize:11,fontWeight:800,letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(255,255,255,.3)',marginBottom:4 }}>Binance Fee Payment</div>
            <div style={{ fontSize:22,fontWeight:900,color:'#fff',letterSpacing:'-.02em' }}>Submit Fee Payment</div>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',cursor:'pointer',color:'rgba(255,255,255,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700 }}>×</button>
        </div>

        <div style={{ padding:'14px 18px',borderRadius:14,background:'rgba(251,191,36,.07)',border:'1px solid rgba(251,191,36,.18)',marginBottom:20 }}>
          <div style={{ fontSize:9,fontWeight:800,letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(251,191,36,.65)',marginBottom:4 }}>Fee Due</div>
          <div style={{ fontSize:28,fontWeight:900,color:'#fbbf24',letterSpacing:'-.04em' }}>${dueAmount.toFixed(2)}</div>
        </div>

        <div style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:12,background:'rgba(240,185,11,.06)',border:'1px solid rgba(240,185,11,.18)',marginBottom:16 }}>
          <span style={{ fontSize:14,flexShrink:0 }}>🟡</span>
          <span style={{ fontSize:12,color:'rgba(255,255,255,.5)' }}>Send the reseller fee to the owner <strong style={{ color:'#F0B90B' }}>Binance Pay ID</strong>, then submit only your transaction ID below.</span>
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:9,fontWeight:800,letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(255,255,255,.3)',marginBottom:8 }}>Owner Binance Pay ID</div>
          <div style={{ width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:13,padding:'14px 16px',color:'#F0B90B',fontFamily:'inherit',fontSize:16,fontWeight:900,boxSizing:'border-box' }}>
            {OWNER_BINANCE_PAY_ID}
          </div>
        </div>

        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:9,fontWeight:800,letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(255,255,255,.3)',marginBottom:8 }}>Binance Transaction ID</div>
          <input type="text" placeholder="Paste Binance transaction/reference ID..." value={binanceTxId} onChange={e=>setBinanceTxId(e.target.value)}
            style={{ width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:13,padding:'14px 16px',color:'#fff',fontFamily:'inherit',fontSize:14,outline:'none',boxSizing:'border-box' }}
          />
        </div>

        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:9,fontWeight:800,letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(255,255,255,.3)',marginBottom:8 }}>Amount (USD)</div>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute',left:16,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,.3)',fontWeight:700,fontSize:16,pointerEvents:'none' }}>$</span>
            <input type="number" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)}
              min={0.01} max={dueAmount}
              style={{ width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:13,padding:'14px 16px 14px 32px',color:'#fff',fontFamily:'inherit',fontSize:16,fontWeight:700,outline:'none',boxSizing:'border-box' }}
            />
          </div>
        </div>

        <button onClick={handleSubmit} disabled={loading} style={{ width:'100%',padding:'16px',borderRadius:14,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:15,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',gap:9,background:'linear-gradient(135deg,#f59e0b,#d97706)',color:'#fff',boxShadow:'0 0 32px rgba(217,119,6,.35)',transition:'all .2s',opacity:loading?0.5:1 }}>
          {loading ? <><Loader2 size={18} className="animate-spin"/> Submitting...</> : <><DollarSign size={17}/> Submit Fee Payment</>}
        </button>
      </div>
    </div>
  );
}

// ── Withdraw Modal ────────────────────────────────────────────
function WithdrawModal({ balance, userId, userEmail, onClose, onSuccess }: {
  balance: number; userId: string; userEmail: string;
  onClose: () => void; onSuccess: () => void;
}) {
  const [amount, setAmount] = useState('');
  const [binanceId, setBinanceId] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    const amt = roundMoney(Number(amount));
    if (!amt || amt < 20) { toast.error('Minimum withdrawal is $20'); return; }
    if (amt > balance) { toast.error(`Cannot exceed available balance ($${balance.toFixed(2)})`); return; }
    if (!binanceId.trim()) { toast.error('Enter your Binance Pay ID'); return; }

    setLoading(true);
    const { error } = await safeQuery(() =>
      supabase.rpc('request_reseller_withdrawal', {
        p_user_id: userId,
        p_email:   userEmail,
        p_amount:  amt,
      })
    );
    setLoading(false);

    if (error) { toast.error(error.message || 'Withdrawal failed'); return; }

    // Save binance ID in meta
    await supabase.from('activity_logs').insert({
      user_id:    userId,
      user_email: userEmail,
      user_name:  userEmail,
      action_type: 'withdrawal_request',
      meta: { binance_id: binanceId.trim(), amount: amt },
      status: 'success',
    }).maybeSingle();

    toast.success(`Withdrawal request of $${amt.toFixed(2)} submitted!`);
    onSuccess();
    onClose();
  };

  return (
    <div style={{ position:'fixed',inset:0,zIndex:100,display:'flex',alignItems:'center',justifyContent:'center',background:'rgba(0,0,0,.85)',backdropFilter:'blur(16px)',padding:20 }}
      onClick={e=>e.target===e.currentTarget&&onClose()}>
      <div style={{ width:'100%',maxWidth:420,borderRadius:24,background:'rgba(8,9,22,.96)',border:'1px solid rgba(255,255,255,.1)',boxShadow:'0 32px 80px rgba(0,0,0,.7)',padding:'32px 28px',backdropFilter:'blur(32px)' }}>
        <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:24 }}>
          <div>
            <div style={{ fontSize:11,fontWeight:800,letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(255,255,255,.3)',marginBottom:4 }}>Withdrawal</div>
            <div style={{ fontSize:22,fontWeight:900,color:'#fff',letterSpacing:'-.02em' }}>Request Payout</div>
          </div>
          <button onClick={onClose} style={{ width:32,height:32,borderRadius:'50%',background:'rgba(255,255,255,.08)',border:'1px solid rgba(255,255,255,.1)',cursor:'pointer',color:'rgba(255,255,255,.5)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:16,fontWeight:700 }}>×</button>
        </div>

        {/* Balance */}
        <div style={{ padding:'14px 18px',borderRadius:14,background:'rgba(16,232,152,.07)',border:'1px solid rgba(16,232,152,.18)',marginBottom:20 }}>
          <div style={{ fontSize:9,fontWeight:800,letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(16,232,152,.6)',marginBottom:4 }}>Available Balance</div>
          <div style={{ fontSize:28,fontWeight:900,color:'#10e898',letterSpacing:'-.04em' }}>${balance.toFixed(2)}</div>
        </div>

        {/* Binance only notice */}
        <div style={{ display:'flex',alignItems:'center',gap:10,padding:'10px 14px',borderRadius:12,background:'rgba(240,185,11,.06)',border:'1px solid rgba(240,185,11,.18)',marginBottom:16 }}>
          <span style={{ fontSize:14,flexShrink:0 }}>🟡</span>
          <span style={{ fontSize:12,color:'rgba(255,255,255,.5)' }}>Payouts via <strong style={{ color:'#F0B90B' }}>Binance Pay</strong> only. Minimum $20.</span>
        </div>

        {/* Binance Pay ID */}
        <div style={{ marginBottom:12 }}>
          <div style={{ fontSize:9,fontWeight:800,letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(255,255,255,.3)',marginBottom:8 }}>Binance Pay ID</div>
          <input type="text" placeholder="Enter your Binance Pay ID…" value={binanceId} onChange={e=>setBinanceId(e.target.value)}
            style={{ width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:13,padding:'14px 16px',color:'#fff',fontFamily:'inherit',fontSize:14,outline:'none',boxSizing:'border-box' }}
            onFocus={e=>(e.target.style.borderColor='rgba(240,185,11,.5)')}
            onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,.1)')}
          />
        </div>

        {/* Amount */}
        <div style={{ marginBottom:20 }}>
          <div style={{ fontSize:9,fontWeight:800,letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(255,255,255,.3)',marginBottom:8 }}>Amount (USD)</div>
          <div style={{ position:'relative' }}>
            <span style={{ position:'absolute',left:16,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,.3)',fontWeight:700,fontSize:16,pointerEvents:'none' }}>$</span>
            <input type="number" placeholder="0.00" value={amount} onChange={e=>setAmount(e.target.value)}
              min={20} max={balance}
              style={{ width:'100%',background:'rgba(255,255,255,.05)',border:'1px solid rgba(255,255,255,.1)',borderRadius:13,padding:'14px 16px 14px 32px',color:'#fff',fontFamily:'inherit',fontSize:16,fontWeight:700,outline:'none',boxSizing:'border-box' }}
              onFocus={e=>(e.target.style.borderColor='rgba(139,92,246,.5)')}
              onBlur={e=>(e.target.style.borderColor='rgba(255,255,255,.1)')}
            />
          </div>
          <div style={{ fontSize:11,color:'rgba(255,255,255,.3)',marginTop:5 }}>Min $20 · Max ${balance.toFixed(2)}</div>
        </div>

        <button onClick={handleSubmit} disabled={loading} style={{ width:'100%',padding:'16px',borderRadius:14,border:'none',cursor:'pointer',fontFamily:'inherit',fontSize:15,fontWeight:800,display:'flex',alignItems:'center',justifyContent:'center',gap:9,background:'linear-gradient(135deg,#7c3aed,#6d28d9)',color:'#fff',boxShadow:'0 0 32px rgba(109,40,217,.45)',transition:'all .2s',opacity:loading?0.5:1 }}>
          {loading ? <><Loader2 size={18} className="animate-spin"/> Processing…</> : <><DollarSign size={17}/> Request Withdrawal</>}
        </button>
      </div>
    </div>
  );
}

// ══════════════════════════════════════════════════════════════
export default function ResellerPage() {
  const { user, balance, deductBalance, refundBalance, setUserRole } = useAppStore();

  // Subscription state
  const [sub, setSub] = useState<Subscription | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [selectedPlan, setSelectedPlan] = useState<PlanId>('monthly');
  const [planOpen, setPlanOpen] = useState(false);
  const [purchasing, setPurchasing] = useState(false);

  // Reseller dashboard state
  const [resellerWallet, setResellerWallet] = useState<any>(null);
  const [resellerTxns, setResellerTxns] = useState<any[]>([]);
  const [withdrawReqs, setWithdrawReqs] = useState<any[]>([]);
  const [feePayments, setFeePayments] = useState<any[]>([]);
  const [feeDue, setFeeDue] = useState(0);
  const [referralCode, setReferralCode] = useState('');
  const [referralInput, setReferralInput] = useState('');
  const [savingCode, setSavingCode] = useState(false);
  const [showWithdraw, setShowWithdraw] = useState(false);
  const [showFeePayment, setShowFeePayment] = useState(false);
  const [dashLoading, setDashLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const planDropRef = useRef<HTMLDivElement>(null);
  const selectedPlanData = PLANS.find(p => p.id === selectedPlan)!;

  // ── Load subscription ────────────────────────────────────────
  const loadSubscription = async () => {
    if (!user?.id) { setSubLoading(false); return; }
    setSubLoading(true);
    const { data } = await safeQuery(() =>
      supabase.from('reseller_subscriptions')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'active')
        .gte('expires_at', new Date().toISOString())
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
    );
    setSub(data as Subscription | null);
    if (user?.role === 'user' || user?.role === 'reseller') {
      setUserRole(data ? 'reseller' : 'user');
    }
    setSubLoading(false);
  };

  // ── Load dashboard data ──────────────────────────────────────
  const loadDashboard = async () => {
    if (!user?.id || !user.email) return;
    setDashLoading(true);

    const [{ data: walletData }, { data: txnData }, { data: wdData }, { data: feePaymentData }, { data: feeDueData }] = await Promise.all([
      safeQuery(() => supabase.from('reseller_wallets').select('user_id,email,balance,total_earned,updated_at').eq('user_id', user.id).maybeSingle()),
      safeQuery(() => supabase.from('reseller_transactions').select('id,amount,fee,net_amount,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(50)),
      safeQuery(() => supabase.from('withdrawal_requests').select('id,amount,status,created_at').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)),
      safeQuery(() => supabase.from('reseller_fee_payments').select('id,amount,status,created_at,binance_tx_id').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10)),
      safeQuery(() => supabase.rpc('get_reseller_fee_due', { p_user_id: user.id, p_email: user.email })),
    ]);

    // Load referral code from reseller_accounts
    const { data: accData } = await safeQuery(() =>
      supabase.from('reseller_accounts')
        .select('email,referral_code')
        .eq('email', user.email.toLowerCase())
        .maybeSingle()
    );

    const code = accData?.referral_code || sanitizeReferralCode(user.email.split('@')[0] || '');
    setResellerWallet(walletData ?? null);
    setResellerTxns(txnData ?? []);
    setWithdrawReqs(wdData ?? []);
    setFeePayments(feePaymentData ?? []);
    setFeeDue(Number(feeDueData ?? 0));
    setReferralCode(code);
    setReferralInput(code);
    setDashLoading(false);
  };

  useEffect(() => {
    loadSubscription();
  }, [user?.id]);

  useEffect(() => {
    if (!user?.id) return;
    const interval = window.setInterval(() => { void loadSubscription(); }, 30000);
    const onFocus = () => { void loadSubscription(); };
    window.addEventListener('focus', onFocus);
    return () => {
      window.clearInterval(interval);
      window.removeEventListener('focus', onFocus);
    };
  }, [user?.id]);

  useEffect(() => {
    if (sub) loadDashboard();
  }, [sub, user?.id]);

  // Close plan dropdown on outside click
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (planDropRef.current && !planDropRef.current.contains(e.target as Node)) setPlanOpen(false);
    };
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  // ── Purchase subscription ────────────────────────────────────
  const handlePurchase = async () => {
    if (!user?.id || !user.email) { toast.error('Please log in first'); return; }
    const plan = PLANS.find(p => p.id === selectedPlan)!;

    if (balance < plan.price) {
      toast.error(`Insufficient balance. You need $${plan.price} but have $${balance.toFixed(2)}. Please add funds from Shop.`);
      return;
    }

    setPurchasing(true);
    const deducted = deductBalance(plan.price);
    if (!deducted) { toast.error('Balance deduction failed'); setPurchasing(false); return; }

    const expiresAt = new Date(Date.now() + plan.duration * 86400000).toISOString();

    const { data: subId, error } = await safeQuery(() =>
      supabase.rpc('subscribe_as_reseller', {
        p_user_id:    user.id,
        p_email:      user.email,
        p_plan:       plan.id,
        p_price:      plan.price,
        p_fee_rate:   plan.feeRate,
        p_expires_at: expiresAt,
      })
    );

    if (error || !subId) {
      refundBalance(plan.price);
      toast.error(error?.message || 'Purchase failed. Balance refunded.');
      setPurchasing(false);
      return;
    }

    logActivity({
      userId:    user.id,
      userEmail: user.email,
      userName:  user.name,
      action:    'purchase',
      product:   `Reseller ${plan.label}`,
      amount:    plan.price,
      status:    'success',
    });

    toast.success(`🎉 Reseller subscription activated!`);
    if (user.role === 'user' || user.role === 'reseller') setUserRole('reseller');
    await loadSubscription();
    setPurchasing(false);
  };

  // ── Save referral code ───────────────────────────────────────
  const saveReferralCode = async () => {
    const cleanCode = sanitizeReferralCode(referralInput);
    if (cleanCode.length < 3) { toast.error('Code must be at least 3 characters'); return; }
    setSavingCode(true);
    const { data, error } = await safeQuery(() =>
      supabase.rpc('set_reseller_referral_code', { p_code: cleanCode })
    );
    setSavingCode(false);
    if (error) { toast.error(error.message); return; }
    const next = sanitizeReferralCode((data as any)?.referral_code || cleanCode);
    setReferralCode(next);
    setReferralInput(next);
    toast.success('Referral code updated!');
  };

  const referralLink = referralCode ? buildReferralLink(referralCode) : '';

  const copyLink = () => {
    if (!referralLink) return;
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    toast.success('Referral link copied!');
  };

  // ── Stats ────────────────────────────────────────────────────
  const totalEarnings = resellerTxns.reduce((s, t) => s + Number(t.net_amount ?? 0), 0);
  const totalFees     = resellerTxns.reduce((s, t) => s + Number(t.fee ?? 0), 0);
  const walletBalance = Number(resellerWallet?.balance ?? 0);
  const allTimeEarned = Number(resellerWallet?.total_earned ?? 0);
  const submittedFeeTotal = feePayments
    .filter(p => p.status === 'verified')
    .reduce((s, p) => s + Number(p.amount ?? 0), 0);

  const planConfig = sub ? PLANS.find(p => p.id === sub.plan) : null;
  const daysLeft = sub ? Math.max(0, Math.ceil((new Date(sub.expires_at).getTime() - Date.now()) / 86400000)) : 0;

  // ════════════════════════════════════════════════════════════
  return (
    <>
      <style>{`
        @keyframes rs-in { from{opacity:0;transform:translateY(16px)} to{opacity:1;transform:none} }
        @keyframes rs-glow { 0%,100%{opacity:.6} 50%{opacity:1} }
        @keyframes rs-shine { 0%{left:-100%;opacity:0} 20%{opacity:1} 100%{left:200%;opacity:0} }

        .rs-page { animation: rs-in .4s cubic-bezier(.22,1,.36,1) both; }

        /* Stat card */
        .rs-stat {
          border-radius: 20px; padding: 22px 22px;
          background: rgba(10,11,28,.72);
          border: 1px solid rgba(255,255,255,.08);
          backdrop-filter: blur(28px) saturate(1.4);
          box-shadow: 0 4px 24px rgba(0,0,0,.35), 0 1px 0 rgba(255,255,255,.05) inset;
          transition: all .2s cubic-bezier(.22,1,.36,1);
          position: relative; overflow: hidden;
        }
        .rs-stat:hover { border-color: rgba(255,255,255,.13); transform: translateY(-2px); box-shadow: 0 12px 36px rgba(0,0,0,.45); }

        /* Plan selector */
        .rs-plan-btn {
          width: 100%; padding: 16px 20px; border-radius: 16px;
          background: rgba(255,255,255,.04); border: 1.5px solid rgba(255,255,255,.09);
          display: flex; align-items: center; justify-content: space-between;
          cursor: pointer; font-family: inherit; color: #fff; transition: all .2s;
        }
        .rs-plan-btn:hover { background: rgba(255,255,255,.07); border-color: rgba(255,255,255,.15); }
        .rs-plan-option {
          width: 100%; padding: 14px 18px; display: flex; align-items: center; gap:14px;
          background: transparent; border: none; cursor: pointer; font-family: inherit;
          text-align: left; transition: background .15s;
          border-bottom: 1px solid rgba(255,255,255,.05);
        }
        .rs-plan-option:last-child { border-bottom: none; }
        .rs-plan-option:hover { background: rgba(255,255,255,.05); }

        /* Purchase button */
        .rs-buy-btn {
          width: 100%; padding: 17px; border-radius: 16px; border: none; cursor: pointer;
          font-family: inherit; font-size: 16px; font-weight: 800;
          background: linear-gradient(135deg,#7c3aed,#6d28d9,#5b21b6);
          color: #fff; display: flex; align-items: center; justify-content: center; gap: 10px;
          box-shadow: 0 0 40px rgba(109,40,217,.5), 0 4px 20px rgba(0,0,0,.35);
          transition: all .25s cubic-bezier(.22,1,.36,1);
          position: relative; overflow: hidden; letter-spacing: .01em;
        }
        .rs-buy-btn::before { content:''; position:absolute; top:0; bottom:0; left:-80%; width:40%; background:linear-gradient(90deg,transparent,rgba(255,255,255,.15),transparent); transition:left .45s ease; pointer-events:none; }
        .rs-buy-btn:hover { transform: translateY(-2px); box-shadow: 0 0 56px rgba(109,40,217,.7), 0 8px 28px rgba(0,0,0,.4); }
        .rs-buy-btn:hover::before { left:160%; }
        .rs-buy-btn:active { transform: scale(.97); }
        .rs-buy-btn:disabled { opacity:.4; cursor:not-allowed; transform:none !important; }

        /* Glass input */
        .rs-input {
          width: 100%; background: rgba(255,255,255,.05); border: 1px solid rgba(255,255,255,.09);
          border-radius: 13px; padding: 14px 16px; color: #fff; font-family: inherit;
          font-size: 14px; outline: none; transition: all .2s; box-sizing: border-box;
        }
        .rs-input:focus { border-color: rgba(139,92,246,.5); box-shadow: 0 0 0 3px rgba(139,92,246,.1); background: rgba(139,92,246,.04); }
        .rs-input::placeholder { color: rgba(255,255,255,.22); }

        /* Referral link box */
        .rs-link-box {
          flex: 1; padding: 14px 16px; border-radius: 13px;
          background: rgba(255,255,255,.04); border: 1px solid rgba(255,255,255,.08);
          font-size: 13px; color: rgba(255,255,255,.7);
          word-break: break-all; font-family: monospace; line-height: 1.4;
        }

        /* Copy button */
        .rs-copy-btn {
          display: flex; align-items: center; gap:7px; padding: 13px 20px;
          border-radius: 13px; border: 1px solid rgba(139,92,246,.3);
          background: rgba(139,92,246,.1); cursor: pointer; font-family: inherit;
          font-size: 13px; font-weight: 700; color: #c4b5fd;
          transition: all .2s; flex-shrink: 0; white-space: nowrap;
        }
        .rs-copy-btn:hover { background: rgba(139,92,246,.18); box-shadow: 0 0 20px rgba(109,40,217,.3); }

        /* Withdraw button */
        .rs-withdraw-btn {
          display: flex; align-items: center; gap:8px; padding: 13px 24px;
          border-radius: 13px; border: 1px solid rgba(16,232,152,.3);
          background: rgba(16,232,152,.08); cursor: pointer; font-family: inherit;
          font-size: 14px; font-weight: 700; color: #10e898;
          transition: all .2s; white-space: nowrap;
        }
        .rs-withdraw-btn:hover { background: rgba(16,232,152,.14); box-shadow: 0 0 24px rgba(16,232,152,.25); }
        .rs-withdraw-btn:disabled { opacity:.4; cursor:not-allowed; }

        .rs-subscribe-grid { display:grid; grid-template-columns:1fr 1fr; gap:24px; align-items:start; }
        .rs-sales-grid { display:grid; grid-template-columns:1fr 1fr; gap:16px; }
        .rs-panel { border-radius:22px; background:rgba(8,9,22,.78); border:1px solid rgba(255,255,255,.08); backdrop-filter:blur(28px); box-shadow:0 8px 32px rgba(0,0,0,.35); }
        .rs-hero-card { border-radius:28px; overflow:hidden; background:linear-gradient(160deg,rgba(30,16,100,.9),rgba(10,8,40,.95)); border:1px solid rgba(139,92,246,.22); box-shadow:0 32px 80px rgba(0,0,0,.6), 0 0 80px rgba(109,40,217,.15); padding:40px 36px; display:flex; flex-direction:column; align-items:center; justify-content:center; min-height:480px; position:relative; backdrop-filter:blur(24px); }
        .rs-plan-card { border-radius:24px; background:rgba(8,9,22,.82); border:1px solid rgba(255,255,255,.09); backdrop-filter:blur(28px); padding:32px 28px; box-shadow:0 20px 60px rgba(0,0,0,.5); display:flex; flex-direction:column; gap:20px; }

        @media(max-width:768px) { .rs-stats-grid { grid-template-columns: 1fr 1fr !important; } }
        @media(max-width:480px) { .rs-stats-grid { grid-template-columns: 1fr !important; } }
        @media(max-width:900px) {
          .rs-subscribe-grid,
          .rs-sales-grid { grid-template-columns:1fr; }
        }
        @media(max-width:640px) {
          .rs-page { padding-bottom:24px !important; }
          .rs-hero-card { min-height:auto; padding:24px 18px; border-radius:22px; }
          .rs-plan-card,
          .rs-panel { border-radius:18px; }
          .rs-plan-card { padding:20px 16px; gap:16px; }
          .rs-stat { padding:16px 14px; border-radius:16px; }
          .rs-plan-btn { padding:12px 14px; border-radius:14px; }
          .rs-plan-option { padding:12px 14px; gap:10px; }
          .rs-buy-btn,
          .rs-copy-btn,
          .rs-withdraw-btn { width:100%; justify-content:center; }
          .rs-copy-btn,
          .rs-withdraw-btn { padding:12px 14px; font-size:12px; }
          .rs-link-box,
          .rs-input { padding-top:12px; padding-bottom:12px; font-size:12px; }
          .rs-sales-grid .rs-panel { padding:18px 14px !important; }
        }
      `}</style>

      <div className="rs-page" style={{ maxWidth:900, margin:'0 auto', paddingBottom:48 }}>

        {/* ── Page Header ── */}
        <div style={{ marginBottom:32 }}>
          <div style={{ fontSize:9, fontWeight:800, letterSpacing:'.22em', textTransform:'uppercase', color:'rgba(255,255,255,.3)', marginBottom:6 }}>Partner Program</div>
          <h1 style={{ fontSize:34, fontWeight:900, color:'#fff', letterSpacing:'-.03em', margin:0, marginBottom:8 }}>Reseller Hub</h1>
          <p style={{ fontSize:14, color:'rgba(255,255,255,.4)', margin:0, maxWidth:500 }}>
            Earn by sharing your referral link. Every sale through your link earns you commission.
          </p>
        </div>

        {subLoading ? (
          <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:10, padding:'80px 0', color:'rgba(255,255,255,.3)' }}>
            <Loader2 size={20} className="animate-spin"/>
            <span style={{ fontSize:14 }}>Loading…</span>
          </div>
        ) : !sub ? (

          /* ══════════════════════════════════════════════════
             NOT SUBSCRIBED — Subscription Card
          ══════════════════════════════════════════════════ */
          <div className="rs-subscribe-grid">

            {/* Left — Image + branding */}
            <div className="rs-hero-card">
              {/* Glow */}
              <div style={{ position:'absolute', top:'30%', left:'50%', transform:'translate(-50%,-50%)', width:280, height:280, borderRadius:'50%', background:'radial-gradient(circle,rgba(109,40,217,.25) 0%,transparent 70%)', pointerEvents:'none' }}/>
              {/* Top accent */}
              <div style={{ position:'absolute', top:0, left:0, right:0, height:2, background:'linear-gradient(90deg,transparent,#8b5cf6,transparent)' }}/>

              <img
                src={HERO_IMAGE}
                alt="Reseller"
                style={{ width:200, height:200, objectFit:'contain', position:'relative', zIndex:1, filter:'drop-shadow(0 0 40px rgba(139,92,246,.5))' }}
                onError={e=>{(e.target as HTMLImageElement).style.display='none';}}
              />

              <div style={{ textAlign:'center', marginTop:24, position:'relative', zIndex:1 }}>
                <div style={{ fontSize:11, fontWeight:800, letterSpacing:'.2em', textTransform:'uppercase', color:'rgba(139,92,246,.7)', marginBottom:8 }}>1999X Partner</div>
                <div style={{ fontSize:26, fontWeight:900, color:'#fff', letterSpacing:'-.03em', marginBottom:8 }}>Reseller Subscription</div>
                <div style={{ fontSize:13, color:'rgba(255,255,255,.4)', lineHeight:1.6 }}>Earn commissions on every sale made through your unique referral link.</div>
              </div>

              {/* Feature pills */}
              <div style={{ display:'flex', flexWrap:'wrap', gap:8, justifyContent:'center', marginTop:20, position:'relative', zIndex:1 }}>
                {['Referral Dashboard','Custom Link','Instant Payouts','Binance Withdrawal'].map(f => (
                  <span key={f} style={{ padding:'5px 12px', borderRadius:20, background:'rgba(139,92,246,.12)', border:'1px solid rgba(139,92,246,.22)', fontSize:11, fontWeight:600, color:'#c4b5fd' }}>{f}</span>
                ))}
              </div>
            </div>

            {/* Right — Plan selector + purchase */}
            <div className="rs-plan-card">

              <div>
                <div style={{ fontSize:11, fontWeight:800, letterSpacing:'.18em', textTransform:'uppercase', color:'rgba(255,255,255,.3)', marginBottom:6 }}>Select Plan</div>
                <div style={{ fontSize:22, fontWeight:900, color:'#fff', letterSpacing:'-.02em' }}>Choose Your Tier</div>
              </div>

              {/* Plan dropdown */}
              <div style={{ position:'relative' }} ref={planDropRef}>
                <button className="rs-plan-btn" onClick={()=>setPlanOpen(!planOpen)}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ width:38, height:38, borderRadius:11, background:`rgba(${selectedPlanData.id==='monthly'?'139,92,246':'245,158,11'},.15)`, border:`1px solid rgba(${selectedPlanData.id==='monthly'?'139,92,246':'245,158,11'},.3)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>
                      {selectedPlanData.id==='monthly' ? '🚀' : '👑'}
                    </div>
                    <div style={{ textAlign:'left' }}>
                      <div style={{ fontSize:15, fontWeight:800, color:'#fff' }}>{selectedPlanData.label} — ${selectedPlanData.price}</div>
                      <div style={{ fontSize:11, color:'rgba(255,255,255,.4)' }}>{selectedPlanData.displayFee}</div>
                    </div>
                  </div>
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <span style={{ fontSize:9, fontWeight:900, letterSpacing:'.12em', textTransform:'uppercase', padding:'3px 9px', borderRadius:20, background:`rgba(${selectedPlanData.id==='monthly'?'139,92,246':'245,158,11'},.15)`, color: selectedPlanData.id==='monthly'?'#a78bfa':'#fbbf24', border:`1px solid rgba(${selectedPlanData.id==='monthly'?'139,92,246':'245,158,11'},.25)` }}>{selectedPlanData.tag}</span>
                    <ChevronDown size={16} color="rgba(255,255,255,.4)" style={{ transform:planOpen?'rotate(180deg)':'none', transition:'transform .2s' }}/>
                  </div>
                </button>

                {planOpen && (
                  <div style={{ position:'absolute', top:'calc(100% + 8px)', left:0, right:0, zIndex:50, borderRadius:16, background:'rgba(8,9,22,.97)', border:'1px solid rgba(255,255,255,.1)', boxShadow:'0 20px 60px rgba(0,0,0,.7)', overflow:'hidden', backdropFilter:'blur(28px)' }}>
                    {PLANS.map(p => (
                      <button key={p.id} className="rs-plan-option" onClick={()=>{ setSelectedPlan(p.id); setPlanOpen(false); }}>
                        <div style={{ width:38, height:38, borderRadius:11, background:`rgba(${p.id==='monthly'?'139,92,246':'245,158,11'},.15)`, border:`1px solid rgba(${p.id==='monthly'?'139,92,246':'245,158,11'},.28)`, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, flexShrink:0 }}>
                          {p.id==='monthly' ? '🚀' : '👑'}
                        </div>
                        <div style={{ flex:1, textAlign:'left' }}>
                          <div style={{ fontSize:14, fontWeight:700, color:'#fff', marginBottom:2 }}>{p.label} <span style={{ color:'rgba(255,255,255,.4)', fontWeight:500 }}>— ${p.price}</span></div>
                          <div style={{ fontSize:11, color:'rgba(255,255,255,.35)' }}>{p.displayFee} · {p.duration}d access</div>
                        </div>
                        <span style={{ fontSize:9, fontWeight:900, letterSpacing:'.1em', textTransform:'uppercase', padding:'3px 8px', borderRadius:20, background:`rgba(${p.id==='monthly'?'139,92,246':'245,158,11'},.15)`, color:p.id==='monthly'?'#a78bfa':'#fbbf24', border:`1px solid rgba(${p.id==='monthly'?'139,92,246':'245,158,11'},.25)` }}>{p.tag}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Features list */}
              <div style={{ borderRadius:16, background:'rgba(255,255,255,.03)', border:'1px solid rgba(255,255,255,.07)', padding:'16px 18px', display:'flex', flexDirection:'column', gap:10 }}>
                {selectedPlanData.features.map(f => (
                  <div key={f} style={{ display:'flex', alignItems:'center', gap:10, fontSize:13, color:'rgba(255,255,255,.65)' }}>
                    <div style={{ width:18, height:18, borderRadius:6, background:'rgba(16,232,152,.1)', border:'1px solid rgba(16,232,152,.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
                      <span style={{ fontSize:9, color:'#10e898', fontWeight:900 }}>✓</span>
                    </div>
                    {f}
                  </div>
                ))}
              </div>

              {/* Balance check */}
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', padding:'12px 16px', borderRadius:13, background: balance>=selectedPlanData.price?'rgba(16,232,152,.07)':'rgba(248,113,113,.07)', border:`1px solid ${balance>=selectedPlanData.price?'rgba(16,232,152,.18)':'rgba(248,113,113,.18)'}` }}>
                <span style={{ fontSize:12, color:'rgba(255,255,255,.45)' }}>Your balance</span>
                <span style={{ fontSize:16, fontWeight:900, color: balance>=selectedPlanData.price?'#10e898':'#f87171' }}>${balance.toFixed(2)}</span>
              </div>

              {balance < selectedPlanData.price && (
                <div style={{ fontSize:12, color:'rgba(248,113,113,.8)', textAlign:'center', padding:'8px 12px', borderRadius:10, background:'rgba(248,113,113,.07)', border:'1px solid rgba(248,113,113,.15)' }}>
                  Need ${(selectedPlanData.price - balance).toFixed(2)} more — add balance from <strong style={{ color:'#f87171' }}>Shop → Add Balance</strong>
                </div>
              )}

              {/* Buy button */}
              <button className="rs-buy-btn" onClick={handlePurchase} disabled={purchasing || balance < selectedPlanData.price}>
                {purchasing
                  ? <><Loader2 size={18} className="animate-spin"/> Activating…</>
                  : <><Wallet size={18}/> Subscribe for ${selectedPlanData.price}</>
                }
              </button>

              <p style={{ fontSize:11, color:'rgba(255,255,255,.22)', textAlign:'center', margin:0 }}>
                Balance deducted immediately. Access starts instantly.
              </p>
            </div>
          </div>

        ) : (

          /* ══════════════════════════════════════════════════
             SUBSCRIBED — Dashboard
          ══════════════════════════════════════════════════ */
          <div style={{ display:'flex', flexDirection:'column', gap:24 }}>

            {/* Active plan banner */}
            <div style={{ borderRadius:22, background:'linear-gradient(135deg,rgba(20,10,80,.9),rgba(10,6,40,.9))', border:'1px solid rgba(139,92,246,.22)', padding:'22px 26px', display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:14, boxShadow:'0 8px 40px rgba(109,40,217,.15)', backdropFilter:'blur(24px)', position:'relative', overflow:'hidden' }}>
              <div style={{ position:'absolute',top:0,left:0,right:0,height:2,background:'linear-gradient(90deg,transparent,#8b5cf6,#a78bfa,transparent)' }}/>
              <div style={{ display:'flex', alignItems:'center', gap:14 }}>
                <div style={{ width:46,height:46,borderRadius:14,background:'rgba(139,92,246,.18)',border:'1px solid rgba(139,92,246,.3)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:22,boxShadow:'0 0 20px rgba(109,40,217,.3)' }}>
                  {planConfig?.id==='monthly'?'🚀':'👑'}
                </div>
                <div>
                  <div style={{ fontSize:9,fontWeight:800,letterSpacing:'.2em',textTransform:'uppercase',color:'rgba(139,92,246,.7)',marginBottom:3 }}>Active Subscription</div>
                  <div style={{ fontSize:18,fontWeight:900,color:'#fff' }}>Reseller {planConfig?.label} Plan</div>
                </div>
              </div>
              <div style={{ display:'flex',alignItems:'center',gap:10,flexWrap:'wrap' }}>
                <div style={{ padding:'8px 16px',borderRadius:99,background:'rgba(16,232,152,.1)',border:'1px solid rgba(16,232,152,.22)',fontSize:12,fontWeight:700,color:'#10e898' }}>
                  ● {daysLeft} days left
                </div>
                <div style={{ padding:'8px 16px',borderRadius:99,background:'rgba(139,92,246,.1)',border:'1px solid rgba(139,92,246,.22)',fontSize:12,fontWeight:700,color:'#a78bfa' }}>
                  {planConfig?.displayFee}
                </div>
              </div>
            </div>

            {/* ── Stats row ── */}
            <div className="rs-stats-grid" style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
              {[
                { label:'Reseller Balance', value:`$${walletBalance.toFixed(2)}`, color:'#10e898', bg:'rgba(16,232,152,.08)', border:'rgba(16,232,152,.18)', icon:<DollarSign size={18}/> },
                { label:'Total Earned', value:`$${allTimeEarned.toFixed(2)}`, color:'#818cf8', bg:'rgba(129,140,248,.08)', border:'rgba(129,140,248,.18)', icon:<TrendingUp size={18}/> },
                { label:'Total Sales', value:resellerTxns.length, color:'#38bdf8', bg:'rgba(56,189,248,.08)', border:'rgba(56,189,248,.18)', icon:<Users size={18}/> },
                { label:'Total Fees', value:`$${totalFees.toFixed(2)}`, color:'#fbbf24', bg:'rgba(251,191,36,.08)', border:'rgba(251,191,36,.18)', icon:<BarChart3 size={18}/> },
              ].map(s => (
                <div key={s.label} className="rs-stat" style={{ border:`1px solid ${s.border}`, background:`linear-gradient(160deg,${s.bg},rgba(8,9,22,.6))` }}>
                  <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:12 }}>
                    <div style={{ width:34,height:34,borderRadius:10,background:s.bg,border:`1px solid ${s.border}`,display:'flex',alignItems:'center',justifyContent:'center',color:s.color }}>{s.icon}</div>
                  </div>
                  <div style={{ fontSize:24,fontWeight:900,color:s.color,letterSpacing:'-.03em',marginBottom:4 }}>{s.value}</div>
                  <div style={{ fontSize:10,fontWeight:700,color:'rgba(255,255,255,.3)',textTransform:'uppercase',letterSpacing:'.12em' }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* ── Referral URL + Withdraw ── */}
            <div className="rs-panel" style={{ padding:'26px 24px' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:18,flexWrap:'wrap',gap:12 }}>
                <div>
                  <div style={{ fontSize:9,fontWeight:800,letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(255,255,255,.3)',marginBottom:4 }}>Your Referral</div>
                  <div style={{ fontSize:17,fontWeight:800,color:'#fff' }}>Share your link and earn</div>
                </div>
                <button className="rs-withdraw-btn" onClick={()=>setShowWithdraw(true)} disabled={walletBalance<20 || feeDue>0}>
                  <DollarSign size={16}/> Withdraw {feeDue > 0 ? '(pay fee first)' : walletBalance < 20 ? '(min $20)' : `$${walletBalance.toFixed(2)}`}
                </button>
              </div>

              {/* Referral URL */}
              <div style={{ display:'flex',gap:10,alignItems:'stretch',marginBottom:16,flexWrap:'wrap' }}>
                <div className="rs-link-box">{referralLink || 'Loading…'}</div>
                <button className="rs-copy-btn" onClick={copyLink}>
                  {copied ? <><CheckCircle size={14}/> Copied!</> : <><Copy size={14}/> Copy Link</>}
                </button>
              </div>

              {/* Custom code */}
              <div style={{ display:'flex',gap:10,alignItems:'center',flexWrap:'wrap' }}>
                <div style={{ position:'relative', flex:1, minWidth:220 }}>
                  <Link2 size={14} style={{ position:'absolute',left:14,top:'50%',transform:'translateY(-50%)',color:'rgba(255,255,255,.3)',pointerEvents:'none' }}/>
                  <input
                    className="rs-input"
                    placeholder="Custom referral code (min 3 chars)"
                    value={referralInput}
                    onChange={e=>setReferralInput(sanitizeReferralCode(e.target.value))}
                    style={{ paddingLeft:38 }}
                  />
                </div>
                <button onClick={saveReferralCode} disabled={savingCode||sanitizeReferralCode(referralInput).length<3}
                  style={{ padding:'14px 22px',borderRadius:13,border:'1px solid rgba(139,92,246,.3)',background:'rgba(139,92,246,.1)',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700,color:'#c4b5fd',transition:'all .2s',opacity:savingCode||sanitizeReferralCode(referralInput).length<3?0.5:1,whiteSpace:'nowrap' }}
                  onMouseEnter={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(139,92,246,.18)';}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLButtonElement).style.background='rgba(139,92,246,.1)';}}
                >
                  {savingCode ? <><Loader2 size={14} className="animate-spin"/> Saving…</> : <>Save Code</>}
                </button>
              </div>
              <p style={{ fontSize:11,color:'rgba(255,255,255,.22)',marginTop:8,marginBottom:0 }}>3–32 chars, letters/numbers/underscore/dash only</p>
            </div>

            <div className="rs-panel" style={{ padding:'22px 20px' }}>
              <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16,gap:12,flexWrap:'wrap' }}>
                <div>
                  <div style={{ fontSize:9,fontWeight:800,letterSpacing:'.18em',textTransform:'uppercase',color:'rgba(255,255,255,.3)',marginBottom:4 }}>Reseller Fee</div>
                  <div style={{ fontSize:17,fontWeight:800,color:'#fff' }}>Binance fee clearance</div>
                </div>
                <button
                  onClick={()=>setShowFeePayment(true)}
                  disabled={feeDue <= 0}
                  style={{ padding:'12px 18px',borderRadius:13,border:'1px solid rgba(251,191,36,.28)',background:'rgba(251,191,36,.1)',cursor:'pointer',fontFamily:'inherit',fontSize:13,fontWeight:700,color:'#fbbf24',opacity:feeDue<=0?0.5:1,whiteSpace:'nowrap' }}
                >
                  Pay Fee via Binance
                </button>
              </div>

              <div style={{ display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))',gap:10 }}>
                <div style={{ padding:'12px 14px',borderRadius:14,background:'rgba(251,191,36,.07)',border:'1px solid rgba(251,191,36,.18)' }}>
                  <div style={{ fontSize:10,fontWeight:800,letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(251,191,36,.65)',marginBottom:6 }}>Fee Due</div>
                  <div style={{ fontSize:24,fontWeight:900,color:'#fbbf24' }}>${feeDue.toFixed(2)}</div>
                </div>
                <div style={{ padding:'12px 14px',borderRadius:14,background:'rgba(139,92,246,.07)',border:'1px solid rgba(139,92,246,.18)' }}>
                  <div style={{ fontSize:10,fontWeight:800,letterSpacing:'.12em',textTransform:'uppercase',color:'rgba(167,139,250,.65)',marginBottom:6 }}>Approved Fee</div>
                  <div style={{ fontSize:24,fontWeight:900,color:'#c4b5fd' }}>${submittedFeeTotal.toFixed(2)}</div>
                </div>
              </div>
              <p style={{ fontSize:12,color:'rgba(255,255,255,.42)',margin:'12px 0 0' }}>
                Withdrawals stay locked while fee due is above $0. Submit the Binance transaction ID after paying the owner Binance ID, then wait for admin approval.
              </p>
            </div>

            {/* ── Recent Sales & Withdrawals ── */}
            <div className="rs-sales-grid">

              {/* Sales */}
              <div className="rs-panel" style={{ padding:'22px 20px' }}>
                <div style={{ display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:16 }}>
                  <div style={{ fontSize:14,fontWeight:800,color:'#fff' }}>Recent Sales</div>
                  <button onClick={loadDashboard} disabled={dashLoading} style={{ background:'rgba(255,255,255,.06)',border:'1px solid rgba(255,255,255,.09)',borderRadius:8,padding:'5px 8px',cursor:'pointer',color:'rgba(255,255,255,.4)',display:'flex',alignItems:'center' }}><RefreshCw size={12} className={dashLoading?'animate-spin':''}/></button>
                </div>
                {resellerTxns.length === 0 ? (
                  <div style={{ textAlign:'center',padding:'24px 0',color:'rgba(255,255,255,.25)',fontSize:13 }}>No sales yet — share your link!</div>
                ) : (
                  <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                    {resellerTxns.slice(0,6).map(t => (
                      <div key={t.id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)' }}>
                        <div>
                          <div style={{ fontSize:13,fontWeight:700,color:'#fff' }}>${Number(t.amount).toFixed(2)}</div>
                          <div style={{ fontSize:10,color:'rgba(255,255,255,.3)' }}>{new Date(t.created_at).toLocaleDateString()}</div>
                        </div>
                        <div style={{ textAlign:'right' }}>
                          <div style={{ fontSize:13,fontWeight:700,color:'#10e898' }}>+${Number(t.net_amount).toFixed(2)}</div>
                          <div style={{ fontSize:10,color:'rgba(255,255,255,.3)' }}>earned</div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Withdrawals */}
              <div className="rs-panel" style={{ padding:'22px 20px' }}>
                <div style={{ fontSize:14,fontWeight:800,color:'#fff',marginBottom:16 }}>Withdrawal History</div>
                {withdrawReqs.length === 0 ? (
                  <div style={{ textAlign:'center',padding:'24px 0',color:'rgba(255,255,255,.25)',fontSize:13 }}>No withdrawals yet</div>
                ) : (
                  <div style={{ display:'flex',flexDirection:'column',gap:6 }}>
                    {withdrawReqs.slice(0,6).map(r => (
                      <div key={r.id} style={{ display:'flex',alignItems:'center',justifyContent:'space-between',padding:'10px 14px',borderRadius:12,background:'rgba(255,255,255,.03)',border:'1px solid rgba(255,255,255,.06)' }}>
                        <div>
                          <div style={{ fontSize:13,fontWeight:700,color:'#fff' }}>${Number(r.amount).toFixed(2)}</div>
                          <div style={{ fontSize:10,color:'rgba(255,255,255,.3)' }}>{new Date(r.created_at).toLocaleDateString()}</div>
                        </div>
                        <span style={{ padding:'4px 10px',borderRadius:99,fontSize:10,fontWeight:800,background:r.status==='approved'?'rgba(16,232,152,.1)':r.status==='rejected'?'rgba(248,113,113,.1)':'rgba(251,191,36,.1)',border:`1px solid ${r.status==='approved'?'rgba(16,232,152,.25)':r.status==='rejected'?'rgba(248,113,113,.25)':'rgba(251,191,36,.25)'}`,color:r.status==='approved'?'#10e898':r.status==='rejected'?'#f87171':'#fbbf24',textTransform:'uppercase',letterSpacing:'.06em' }}>
                          {r.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Withdraw modal */}
      {showWithdraw && (
        <WithdrawModal
          balance={walletBalance}
          userId={user?.id ?? ''}
          userEmail={user?.email ?? ''}
          onClose={()=>setShowWithdraw(false)}
          onSuccess={loadDashboard}
        />
      )}
      {showFeePayment && (
        <FeePaymentModal
          dueAmount={feeDue}
          userId={user?.id ?? ''}
          userEmail={user?.email ?? ''}
          onClose={()=>setShowFeePayment(false)}
          onSuccess={loadDashboard}
        />
      )}
    </>
  );
}
