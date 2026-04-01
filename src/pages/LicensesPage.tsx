import { logActivity } from '@/lib/activity';
import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { useTranslation } from 'react-i18next';
import { Key, Copy, RefreshCw, Globe, Clock, Shield, CheckCircle, Loader2, AlertCircle, Eye, EyeOff, AlertTriangle, Download, Play, Zap } from 'lucide-react';
import { toast } from 'sonner';
import { useEffect, useState, useRef } from 'react';
import type { License } from '@/lib/store';

const SUPABASE_URL = 'https://awjouzwzdkrevvnlenvn.supabase.co';
const SUPABASE_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3am91end6ZGtyZXZ2bmxlbnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTg4MjEsImV4cCI6MjA5MDAzNDgyMX0._I_I-WA_8-YqDfaRzKiVgpEAhkH9faxlEIV6e766A0M';
const FF_IMAGE = 'https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1400&q=80';
const DOWNLOAD_URL = 'https://www.asuswebstorage.com/navigate/a/#/s/4E1D05A81552402C8D05FCE0E61402A64';
const TUTORIAL_URL = 'https://youtu.be/vwUYk589SzU';

async function validatePanel(key: string, panelType: 'lag' | 'internal') {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/validate-key`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}`, 'apikey': SUPABASE_ANON },
      signal: controller.signal,
      body: JSON.stringify({ key, panel_type: panelType }),
    });
    const data = await res.json();
    if (typeof data.success === 'boolean') return { success: data.success, message: data.message ?? '', info: data.info ?? null };
    const nested = data[panelType === 'lag' ? 'lag' : 'internal'];
    if (nested && typeof nested.success === 'boolean') return { success: nested.success, message: nested.message ?? '', info: nested.info ?? null };
    return { success: false, message: 'Unexpected response', info: null };
  } catch (e: any) { return { success: false, message: e?.name === 'AbortError' ? 'Validation timed out.' : `Network error: ${String(e)}`, info: null }; }
  finally { clearTimeout(timeout); }
}

function toISO(unixSec: any): string {
  const ms = parseInt(String(unixSec ?? '0')) * 1000;
  return ms > 100000 ? new Date(ms).toISOString() : new Date(Date.now() + 30 * 86400000).toISOString();
}
function getExpiry(info: any): string {
  return toISO(info?.subscriptions?.[0]?.expiry ?? info?.expiry ?? '0');
}

interface UserLicenseRow {
  id: string; user_id: string; user_email: string;
  product_id: string; product_name: string; license_key: string;
  keyauth_username?: string | null; hwid?: string | null; last_login?: string | null;
  expires_at: string; status?: 'active' | 'expired' | null;
  ip?: string | null; device?: string | null;
  hwid_resets_used?: number | null; hwid_reset_month?: number | null;
  created_at?: string; updated_at?: string;
}

function isLicenseExpired(expiresAt?: string | null) {
  return new Date(expiresAt ?? 0).getTime() <= Date.now();
}

function mapDbLicense(row: UserLicenseRow): License {
  return {
    id: row.id, productId: row.product_id, productName: row.product_name,
    key: row.license_key, keyauthUsername: row.keyauth_username ?? '',
    hwid: row.hwid ?? '', lastLogin: row.last_login ?? '', expiresAt: row.expires_at,
    status: isLicenseExpired(row.expires_at) ? 'expired' : 'active',
    ip: row.ip ?? '', device: row.device ?? '',
    hwidResetsUsed: Number(row.hwid_resets_used ?? 0),
    hwidResetMonth: Number(row.hwid_reset_month ?? new Date().getMonth()),
  };
}

function toDbLicenseRow(license: License, user: { id: string; email: string }): Omit<UserLicenseRow, 'id'> {
  return {
    user_id: user.id, user_email: user.email, product_id: license.productId,
    product_name: license.productName, license_key: license.key,
    keyauth_username: license.keyauthUsername ?? '', hwid: license.hwid ?? '',
    last_login: license.lastLogin || null, expires_at: license.expiresAt,
    status: isLicenseExpired(license.expiresAt) ? 'expired' : 'active',
    ip: license.ip ?? '', device: license.device ?? '',
    hwid_resets_used: Number(license.hwidResetsUsed ?? 0),
    hwid_reset_month: Number(license.hwidResetMonth ?? new Date().getMonth()),
  };
}

/* ── Countdown ── */
function ExpiryCountdown({ expiresAt }: { expiresAt: string }) {
  const { t: tr } = useTranslation();
  const [txt, setTxt] = useState('');
  useEffect(() => {
    const up = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) { setTxt('Expired'); return; }
      const d = Math.floor(diff / 86400000), h = Math.floor((diff % 86400000) / 3600000),
        m = Math.floor((diff % 3600000) / 60000), s = Math.floor((diff % 60000) / 1000);
      setTxt(d > 0 ? `${d}d ${h}h ${m}m` : `${h}h ${m}m ${s}s`);
    };
    up(); const i = setInterval(up, 1000); return () => clearInterval(i);
  }, [expiresAt]);
  const expired = txt === 'Expired';
  return <span style={{ color: expired ? '#f87171' : '#4ade80', fontFamily: 'monospace', fontWeight: 700 }}>{txt || '…'}</span>;
}

/* ── HWID Modal ── */
function HwidModal({ onConfirm, onCancel }: { onConfirm: () => void; onCancel: () => void }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.82)', backdropFilter: 'blur(20px)', padding: 16 }}>
      <div style={{ width: '100%', maxWidth: 360, borderRadius: 24, background: 'rgba(14,12,28,.98)', border: '1px solid rgba(245,158,11,.22)', boxShadow: '0 0 60px rgba(0,0,0,.8)', padding: '28px 26px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
          <div style={{ width: 42, height: 42, borderRadius: 13, background: 'rgba(245,158,11,.1)', border: '1px solid rgba(245,158,11,.22)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <AlertCircle size={20} color="#fbbf24" />
          </div>
          <div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#fff' }}>Reset HWID?</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,.4)' }}>This cannot be undone</div>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'rgba(255,255,255,.45)', marginBottom: 22, lineHeight: 1.6 }}>Your hardware ID will be cleared. You'll be able to log in from a new device. Limit: 2 resets/month.</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onCancel} style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer', color: 'rgba(255,255,255,.55)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600, transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.1)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.06)'; }}>Cancel</button>
          <button onClick={onConfirm} style={{ flex: 1, padding: '11px', borderRadius: 12, background: 'rgba(239,68,68,.14)', border: '1px solid rgba(239,68,68,.28)', cursor: 'pointer', color: '#f87171', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, transition: 'all .15s' }}
            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,.24)'; }}
            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239,68,68,.14)'; }}>Reset HWID</button>
        </div>
      </div>
    </div>
  );
}

/* ── Success Modal ── */
function SuccessCard({ productName, licKey, onDismiss }: { productName: string; licKey: string; onDismiss: () => void }) {
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);
  const displayKey = (licKey || '').replace('_INTERNAL', '');
  const copy = () => { navigator.clipboard.writeText(displayKey); setCopied(true); setTimeout(() => setCopied(false), 2000); };
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 60, display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'rgba(0,0,0,.88)', backdropFilter: 'blur(24px)', padding: 16 }}
      onClick={e => e.target === e.currentTarget && onDismiss()}>
      <div style={{ width: '100%', maxWidth: 440, borderRadius: 28, background: 'rgba(8,20,10,.98)', border: '1px solid rgba(34,197,94,.2)', boxShadow: '0 0 80px rgba(34,197,94,.12),0 32px 80px rgba(0,0,0,.8)', padding: '36px 30px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: -60, left: '50%', transform: 'translateX(-50%)', width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle,rgba(34,197,94,.12) 0%,transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ width: 60, height: 60, borderRadius: 18, background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 18px', boxShadow: '0 0 32px rgba(34,197,94,.18)' }}>
          <CheckCircle size={28} color="#4ade80" />
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', marginBottom: 5 }}>Activated!</div>
        <div style={{ fontSize: 13, color: 'rgba(255,255,255,.4)', marginBottom: 26 }}>{productName} is now ready</div>
        <div style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.08)', borderRadius: 16, padding: '16px', marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: 'rgba(255,255,255,.3)', textTransform: 'uppercase', letterSpacing: '.12em', marginBottom: 10 }}>License Key</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <code style={{ flex: 1, fontSize: 13, fontFamily: 'monospace', color: '#fff', filter: revealed ? 'none' : 'blur(8px)', transition: 'filter .4s', wordBreak: 'break-all', textAlign: 'center' }}>{displayKey || 'KEY-NOT-AVAILABLE'}</code>
            <button onClick={() => setRevealed(!revealed)} style={{ background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 8, padding: '7px 9px', cursor: 'pointer', color: 'rgba(255,255,255,.5)', flexShrink: 0 }}>
              {revealed ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 10, marginBottom: 16 }}>
          <button onClick={copy} style={{ flex: 1, padding: '12px', borderRadius: 13, background: 'rgba(34,197,94,.1)', border: '1px solid rgba(34,197,94,.22)', cursor: 'pointer', color: '#4ade80', fontFamily: 'inherit', fontSize: 13, fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 7 }}>
            {copied ? <><CheckCircle size={13} />Copied!</> : <><Copy size={13} />Copy Key</>}
          </button>
          <button onClick={onDismiss} style={{ flex: 1, padding: '12px', borderRadius: 13, background: 'rgba(255,255,255,.06)', border: '1px solid rgba(255,255,255,.1)', cursor: 'pointer', color: 'rgba(255,255,255,.55)', fontFamily: 'inherit', fontSize: 13, fontWeight: 600 }}>Done</button>
        </div>
        <p style={{ fontSize: 11, color: 'rgba(255,255,255,.25)' }}>Keys are saved to your Licenses tab</p>
      </div>
    </div>
  );
}

const handleActivateRef = { current: null as (() => void) | null };

/* ── BIG LICENSE CARD ── FitSpark bento style ── */
function LicenseCard({ lic, onCopy, onReset, variant }: {
  lic: any; onCopy: (k: string) => void; onReset: (l: any) => void; variant: 'internal' | 'lag';
}) {
  const [keyVisible, setKeyVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const rawKey = lic?.key ?? '';
  const displayKey = rawKey.endsWith('_INTERNAL') ? rawKey.replace('_INTERNAL', '') : rawKey;
  const expiresAt = lic?.expiresAt ?? new Date(Date.now() + 30 * 86400000).toISOString();
  const daysLeft = Math.max(0, Math.floor((new Date(expiresAt).getTime() - Date.now()) / 86400000));
  const isExpired = new Date(expiresAt).getTime() < Date.now();
  const resetsLeft = 2 - (lic?.hwidResetsUsed ?? 0);

  const isInternal = variant === 'internal';
  const accent = isInternal ? '#818cf8' : '#a78bfa';
  const accentBg = isInternal ? 'rgba(129,140,248,' : 'rgba(167,139,250,';
  const gradFrom = isInternal ? 'rgba(30,27,75,.6)' : 'rgba(60,30,85,.55)';

  const copy = () => { onCopy(displayKey); setCopied(true); setTimeout(() => setCopied(false), 1800); };

  const progressPct = isExpired ? 0 : Math.min(100, (daysLeft / 30) * 100);

  return (
    <div style={{
      position: 'relative', borderRadius: 28, overflow: 'hidden',
      background: `linear-gradient(145deg,${gradFrom},rgba(8,6,20,.95))`,
      border: `1px solid ${accentBg}.2)`,
      boxShadow: `0 0 0 1px rgba(255,255,255,.04) inset, 0 24px 60px rgba(0,0,0,.55), 0 0 50px ${accentBg}.08)`,
      animation: 'lc-in .6s cubic-bezier(.22,1,.36,1) both',
    }}>
      {/* Top glow line */}
      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg,transparent,${accent},${accentBg}.5) transparent)`, pointerEvents: 'none' }} />
      {/* BG orb */}
      <div style={{ position: 'absolute', top: -40, right: -30, width: 180, height: 180, borderRadius: '50%', background: `radial-gradient(circle,${accentBg}.12) 0%,transparent 65%)`, pointerEvents: 'none' }} />

      {/* ── TOP: name + status ── */}
      <div style={{ padding: '22px 22px 0', position: 'relative', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: isExpired ? '#f87171' : '#4ade80', boxShadow: `0 0 ${isExpired ? '6px #f87171' : '10px rgba(74,222,128,.7)'}`, animation: isExpired ? 'none' : 'lc-live 2s ease-in-out infinite' }} />
            <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: '.16em', textTransform: 'uppercase', color: isExpired ? '#f87171' : '#4ade80' }}>
              {isExpired ? 'Expired' : 'Active'}
            </span>
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#fff', letterSpacing: '-.02em' }}>{lic?.productName ?? (isInternal ? 'Internal Panel' : 'Fake Lag Panel')}</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.35)', marginTop: 3 }}>KeyAuth · Bound to account</div>
        </div>
        <div style={{ width: 48, height: 48, borderRadius: 16, background: `${accentBg}.12)`, border: `1px solid ${accentBg}.22)`, display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: `0 0 20px ${accentBg}.14)`, flexShrink: 0 }}>
          {isInternal ? <Shield size={22} color={accent} /> : <Zap size={22} color={accent} />}
        </div>
      </div>

      {/* ── EXPIRY COUNTDOWN — big ── */}
      <div style={{ padding: '18px 22px 0', position: 'relative' }}>
        <div style={{ padding: '16px 18px', borderRadius: 18, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: 'rgba(255,255,255,.35)' }}>Time Remaining</div>
            <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.25)' }}>{daysLeft}d left</div>
          </div>
          <div style={{ fontSize: 32, fontWeight: 700, lineHeight: 1, marginBottom: 12 }}>
            <ExpiryCountdown expiresAt={expiresAt} />
          </div>
          {/* Progress bar */}
          <div style={{ height: 4, borderRadius: 99, background: 'rgba(255,255,255,.07)', overflow: 'hidden' }}>
            <div style={{ height: '100%', width: `${progressPct}%`, borderRadius: 99, background: isExpired ? '#ef4444' : `linear-gradient(90deg,${accentBg}.6),${accent})`, boxShadow: isExpired ? 'none' : `0 0 10px ${accentBg}.5)`, transition: 'width .8s cubic-bezier(.22,1,.36,1)' }} />
          </div>
        </div>
      </div>

      {/* ── KEY ── */}
      <div style={{ padding: '14px 22px 0', position: 'relative' }}>
        <div style={{ padding: '12px 14px', borderRadius: 14, background: 'rgba(0,0,0,.25)', border: '1px solid rgba(255,255,255,.06)', display: 'flex', alignItems: 'center', gap: 10 }}>
          <code style={{ flex: 1, fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,.7)', letterSpacing: keyVisible ? '2px' : '0', filter: keyVisible ? 'none' : 'blur(7px)', transition: 'all .35s', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {displayKey || '(no key)'}
          </code>
          <button onClick={() => setKeyVisible(!keyVisible)} style={{ padding: '6px 8px', borderRadius: 8, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)', cursor: 'pointer', color: 'rgba(255,255,255,.4)', flexShrink: 0, transition: 'all .15s' }}>
            {keyVisible ? <EyeOff size={13} /> : <Eye size={13} />}
          </button>
          <button onClick={copy} style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '6px 11px', borderRadius: 8, background: copied ? `${accentBg}.12)` : 'rgba(255,255,255,.05)', border: `1px solid ${copied ? accentBg + '.25)' : 'rgba(255,255,255,.09)'}`, cursor: 'pointer', color: copied ? accent : 'rgba(255,255,255,.5)', fontSize: 11, fontWeight: 600, flexShrink: 0, transition: 'all .18s' }}>
            {copied ? <><CheckCircle size={11} />Copied</> : <><Copy size={11} />Copy</>}
          </button>
        </div>
      </div>

      {/* ── META GRID ── */}
      <div style={{ padding: '14px 22px 0', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, position: 'relative' }}>
        {[
          { icon: Shield, label: 'HWID', val: lic?.hwid || 'Not bound' },
          { icon: Globe, label: 'IP', val: lic?.ip || 'Unknown' },
          { icon: Clock, label: 'Last Login', val: lic?.lastLogin ? new Date(lic.lastLogin).toLocaleDateString() : '—' },
          { icon: Key, label: 'Product', val: isInternal ? 'Internal' : 'Fake Lag' },
        ].map(({ icon: Icon, label, val }) => (
          <div key={label} style={{ padding: '10px 12px', borderRadius: 13, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.055)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginBottom: 4 }}>
              <Icon size={9} color="rgba(255,255,255,.3)" />
              <span style={{ fontSize: 9, fontWeight: 600, letterSpacing: '.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,.3)' }}>{label}</span>
            </div>
            <div style={{ fontSize: 11, fontWeight: 600, color: 'rgba(255,255,255,.65)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{val}</div>
          </div>
        ))}
      </div>

      {/* ── HWID RESET ── */}
      <div style={{ padding: '14px 22px 22px', position: 'relative' }}>
        <button onClick={() => onReset(lic)}
          style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '10px 14px', borderRadius: 13, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.08)', cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600, color: 'rgba(255,255,255,.5)', transition: 'all .18s', width: '100%' }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.08)'; e.currentTarget.style.color = '#fff'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; e.currentTarget.style.color = 'rgba(255,255,255,.5)'; }}>
          <RefreshCw size={13} />
          Reset HWID
          <span style={{ marginLeft: 'auto', fontSize: 10, color: 'rgba(255,255,255,.3)', fontWeight: 500 }}>{resetsLeft} reset{resetsLeft !== 1 ? 's' : ''} remaining</span>
        </button>
      </div>
    </div>
  );
}

/* ── DOWNLOAD SECTION ── */
function DownloadSection() {
  return (
    <div style={{ borderRadius: 28, overflow: 'hidden', position: 'relative', border: '1px solid rgba(255,255,255,.07)', animation: 'lc-in .6s .2s cubic-bezier(.22,1,.36,1) both' }}>
      <div style={{ position: 'relative', height: 200, overflow: 'hidden' }}>
        <img src={FF_IMAGE} alt="Free Fire" style={{ width: '100%', height: '100%', objectFit: 'cover', objectPosition: 'center', filter: 'brightness(.7)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to right,rgba(0,0,0,.9) 0%,rgba(0,0,0,.4) 60%,transparent 100%)' }} />
        <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top,rgba(8,6,20,1) 0%,transparent 55%)' }} />
        {/* OB52 badge */}
        <div style={{ position: 'absolute', top: 16, left: 18, display: 'flex', alignItems: 'center', gap: 6, padding: '5px 13px', borderRadius: 99, background: 'rgba(34,197,94,.12)', border: '1px solid rgba(34,197,94,.25)' }}>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#4ade80', boxShadow: '0 0 8px #4ade80' }} />
          <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '.14em', textTransform: 'uppercase', color: '#4ade80' }}>OB52 Undetected</span>
        </div>
        <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, padding: '20px 22px' }}>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#fff', letterSpacing: '-.02em', marginBottom: 4 }}>1999X Panel Ready</div>
          <div style={{ fontSize: 12, color: 'rgba(255,255,255,.45)' }}>Your license is active — download and watch the setup guide.</div>
        </div>
      </div>
      <div style={{ padding: '18px 20px', background: 'rgba(255,255,255,.02)', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        {[
          { href: DOWNLOAD_URL, icon: <Download size={17} />, label: 'Panel Download', color: '#a78bfa', bg: 'rgba(167,139,250,.1)', bc: 'rgba(167,139,250,.22)' },
          { href: TUTORIAL_URL, icon: <Play size={17} />, label: 'Watch Tutorial', color: '#818cf8', bg: 'rgba(129,140,248,.1)', bc: 'rgba(129,140,248,.22)' },
        ].map(btn => (
          <a key={btn.label} href={btn.href} target="_blank" rel="noopener noreferrer"
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: '13px', borderRadius: 14, background: btn.bg, border: `1px solid ${btn.bc}`, color: btn.color, fontSize: 13, fontWeight: 700, textDecoration: 'none', transition: 'all .2s' }}
            onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.filter = 'brightness(1.2)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.filter = 'none'; }}>
            {btn.icon} {btn.label}
          </a>
        ))}
      </div>
    </div>
  );
}

/* ── EXPIRED HISTORY ── */
function ExpiredHistory({ intExpired, lagExpired }: { intExpired: any[]; lagExpired: any[] }) {
  const [show, setShow] = useState(false);
  const all = [...intExpired, ...lagExpired].sort((a, b) => new Date(b?.expiresAt ?? 0).getTime() - new Date(a?.expiresAt ?? 0).getTime());
  return (
    <div style={{ animation: 'lc-in .5s .1s cubic-bezier(.22,1,.36,1) both' }}>
      <button onClick={() => setShow(!show)}
        style={{ display: 'flex', alignItems: 'center', gap: 12, width: '100%', padding: '14px 18px', borderRadius: 18, background: 'rgba(255,255,255,.025)', border: '1px solid rgba(255,255,255,.07)', cursor: 'pointer', fontFamily: 'inherit', transition: 'all .18s' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,.04)'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,.025)'; }}>
        <div style={{ width: 34, height: 34, borderRadius: 11, background: 'rgba(248,113,113,.08)', border: '1px solid rgba(248,113,113,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <Clock size={15} color="#f87171" />
        </div>
        <div style={{ flex: 1, textAlign: 'left' }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.6)' }}>Expired Licenses</div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,.28)', marginTop: 1 }}>{all.length} expired key{all.length !== 1 ? 's' : ''} in history</div>
        </div>
        <span style={{ fontSize: 10, fontWeight: 600, padding: '4px 11px', borderRadius: 99, background: 'rgba(255,255,255,.05)', border: '1px solid rgba(255,255,255,.09)', color: 'rgba(255,255,255,.4)' }}>{show ? 'Hide' : 'Show'}</span>
      </button>
      {show && (
        <div style={{ marginTop: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
          {all.map((l: any) => {
            const rawKey = l?.key ?? ''; const displayKey = rawKey.endsWith('_INTERNAL') ? rawKey.replace('_INTERNAL', '') : rawKey;
            const isInt = rawKey.endsWith('_INTERNAL') || l?.productId === 'keyauth-internal';
            const expiredOn = l?.expiresAt ? new Date(l.expiresAt).toLocaleDateString() : 'Unknown';
            return (
              <div key={l?.id || Math.random()} style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '13px 16px', borderRadius: 14, background: 'rgba(239,68,68,.04)', border: '1px solid rgba(239,68,68,.1)', opacity: .7 }}>
                <div style={{ width: 34, height: 34, borderRadius: 10, background: 'rgba(239,68,68,.08)', border: '1px solid rgba(239,68,68,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                  <Key size={14} color="#f87171" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontSize: 12, fontWeight: 700, color: 'rgba(255,255,255,.5)' }}>{isInt ? 'Internal' : 'Fake Lag'}</span>
                    <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 7px', borderRadius: 99, background: 'rgba(239,68,68,.1)', border: '1px solid rgba(239,68,68,.2)', color: '#f87171', letterSpacing: '.06em', textTransform: 'uppercase' }}>Expired</span>
                  </div>
                  <code style={{ fontSize: 11, fontFamily: 'monospace', color: 'rgba(255,255,255,.3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{displayKey || '(no key)'}</code>
                  <div style={{ fontSize: 10, color: 'rgba(255,255,255,.2)', marginTop: 2 }}>Expired: {expiredOn}</div>
                </div>
                <button onClick={() => { navigator.clipboard.writeText(displayKey); toast.success('Copied!'); }}
                  style={{ padding: '6px 10px', borderRadius: 9, background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.07)', cursor: 'pointer', color: 'rgba(255,255,255,.3)', flexShrink: 0 }}>
                  <Copy size={12} />
                </button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════ */
export default function LicensesPage() {
  const { t } = useTranslation();
  const rawStore = useAppStore();
  const licenses = rawStore?.licenses ?? [];
  const setLicenses = rawStore?.setLicenses ?? (() => { });
  const updateLicense = rawStore?.updateLicense ?? (() => { });
  const user = rawStore?.user ?? null;

  const [keyValue, setKeyValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [hwidTarget, setHwidTarget] = useState<any | null>(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successKey, setSuccessKey] = useState<{ productName: string; key: string } | null>(null);

  const trimmedKey = (keyValue || '').trim();
  const isReady = trimmedKey.length >= 1;
  const copyKey = (k: string) => { try { navigator.clipboard.writeText(k); toast.success('Copied!'); } catch { } };

  const getFunctionErrorMessage = async (error: any) => {
    if (!error) return '';
    const fallback = error.message ?? '';
    try { const body = await error.context?.json?.(); return body?.message ?? fallback; } catch { return fallback; }
  };

  useEffect(() => {
    if (!user?.id) { setLicenses([]); return; }
    let alive = true;
    const syncLicenses = async () => {
      const nowIso = new Date().toISOString();
      await supabase.from('user_licenses').update({ status: 'expired' }).eq('user_id', user.id).lt('expires_at', nowIso).neq('status', 'expired');
      let rows: UserLicenseRow[] = [];
      const { data, error } = await supabase.from('user_licenses').select('*').eq('user_id', user.id).order('created_at', { ascending: false });
      if (!error && data) rows = data as UserLicenseRow[];
      if (!rows.length && licenses.length > 0) {
        const seedRows = licenses.map(l => toDbLicenseRow(l, { id: user.id, email: user.email }));
        const { data: seededRows, error: seedError } = await supabase.from('user_licenses').upsert(seedRows, { onConflict: 'user_id,license_key' }).select('*');
        if (!seedError && seededRows) rows = seededRows as UserLicenseRow[];
      }
      const { data: freeTrialData } = await supabase.from('free_trial_keys').select('lag_key,internal_key,claimed_at,expires_at').eq('user_id', user.id).maybeSingle();
      if (freeTrialData && new Date(freeTrialData.expires_at).getTime() > Date.now()) {
        const freeRows: any[] = []; const existingKeys = new Set(rows.map(r => r.license_key));
        if (freeTrialData.lag_key && !existingKeys.has(freeTrialData.lag_key))
          freeRows.push({ user_id: user.id, user_email: user.email, product_id: 'keyauth-lag', product_name: 'Fake Lag (Free Trial)', license_key: freeTrialData.lag_key, keyauth_username: freeTrialData.lag_key, hwid: '', last_login: freeTrialData.claimed_at, expires_at: freeTrialData.expires_at, status: 'active', ip: '', device: '', hwid_resets_used: 0, hwid_reset_month: new Date().getMonth() });
        if (freeTrialData.internal_key && !existingKeys.has(freeTrialData.internal_key + '_INTERNAL'))
          freeRows.push({ user_id: user.id, user_email: user.email, product_id: 'keyauth-internal', product_name: 'Internal (Free Trial)', license_key: freeTrialData.internal_key + '_INTERNAL', keyauth_username: freeTrialData.internal_key, hwid: '', last_login: freeTrialData.claimed_at, expires_at: freeTrialData.expires_at, status: 'active', ip: '', device: '', hwid_resets_used: 0, hwid_reset_month: new Date().getMonth() });
        if (freeRows.length > 0) {
          const { data: savedFreeRows } = await supabase.from('user_licenses').upsert(freeRows, { onConflict: 'user_id,license_key' }).select('*');
          if (savedFreeRows) { const savedKeys = new Set(savedFreeRows.map((r: any) => r.license_key)); rows = [...rows.filter(r => !savedKeys.has(r.license_key)), ...(savedFreeRows as UserLicenseRow[])]; }
        }
      }
      if (!alive) return;
      setLicenses(rows.map(mapDbLicense).sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime()));
    };
    syncLicenses();
    const ch = supabase.channel(`ul_${user.id}`).on('postgres_changes', { event: '*', schema: 'public', table: 'user_licenses', filter: `user_id=eq.${user.id}` }, () => syncLicenses()).subscribe();
    return () => { alive = false; supabase.removeChannel(ch); };
  }, [user?.id]);

  const confirmResetHwid = async () => {
    if (!hwidTarget) return;
    const currentMonth = new Date().getMonth();
    const resetsUsed = hwidTarget.hwidResetMonth === currentMonth ? Number(hwidTarget.hwidResetsUsed ?? 0) : 0;
    if (resetsUsed >= 2) { toast.error('Reset limit reached (2/month)'); setHwidTarget(null); return; }
    const panelType = hwidTarget.productId === 'keyauth-lag' ? 'lag' : 'internal';
    const username = String(hwidTarget.keyauthUsername ?? '').trim() || String(hwidTarget.key ?? '').replace('_INTERNAL', '');
    if (!username) { toast.error('Missing KeyAuth username'); setHwidTarget(null); return; }
    const { data, error } = await supabase.functions.invoke('reset-hwid', { body: { username, panel_type: panelType } });
    if (error || !data?.success) { toast.error(data?.message ?? await getFunctionErrorMessage(error) ?? 'HWID reset failed'); setHwidTarget(null); return; }
    const { error: syncError } = await supabase.from('user_licenses').update({ hwid: '', hwid_resets_used: resetsUsed + 1, hwid_reset_month: currentMonth }).eq('id', hwidTarget.id).eq('user_id', user?.id ?? '');
    if (syncError) { toast.error('Sync failed'); } else {
      updateLicense(hwidTarget.id, { hwid: '', hwidResetsUsed: resetsUsed + 1, hwidResetMonth: currentMonth });
      toast.success('HWID reset!');
      if (user) logActivity({ userId: user.id, userEmail: user.email, userName: user.name, action: 'hwid_reset', product: hwidTarget.productName, status: 'success' });
    }
    setHwidTarget(null);
  };

  const handleActivate = async () => {
    if (!isReady) { toast.error('Enter a license key'); return; }
    if (!user) { toast.error('Please login first'); return; }
    setErrorMsg(''); setLoading(true);
    try {
      const alreadyLag = licenses.some((l: any) => l?.productId === 'keyauth-lag' && l?.key === trimmedKey);
      const alreadyInt = licenses.some((l: any) => l?.productId === 'keyauth-internal' && l?.key === trimmedKey + '_INTERNAL');
      if (alreadyLag && alreadyInt) { toast.error('Already activated'); return; }
      let existingBinding: any = null;
      try {
        const r = await fetch(`${SUPABASE_URL}/functions/v1/check-key-binding`, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${SUPABASE_ANON}`, 'apikey': SUPABASE_ANON }, body: JSON.stringify({ key: trimmedKey, user_email: user.email }) });
        const d = await r.json();
        if (d.blocked) { setErrorMsg('❌ This key is already bound to another account.'); toast.error('Key bound to another account'); return; }
        if (d.existing_email) existingBinding = { user_email: d.existing_email };
      } catch { }
      const [lagResult, intResult] = await Promise.all([
        alreadyLag ? { success: false, message: 'skip', info: null } : validatePanel(trimmedKey, 'lag'),
        alreadyInt ? { success: false, message: 'skip', info: null } : validatePanel(trimmedKey, 'internal'),
      ]);
      const lagOk = lagResult.success === true, intOk = intResult.success === true;
      if (!lagOk && !intOk) { const noise = ['Invalid license key', 'Invalid key', 'Key not found', 'skip', 'Connection error', 'Unexpected']; const useful = [lagResult.message, intResult.message].find(m => m && !noise.some(n => m.includes(n))); setErrorMsg(useful || 'Invalid license key'); toast.error('Activation failed'); return; }
      let lastKey = '', lastName = ''; const activatedLicenses: License[] = [];
      const panelType = lagOk && intOk ? 'both' : lagOk ? 'lag' : 'internal';
      if (lagOk) { const lic = { id: `lag_${Math.random().toString(36).slice(2, 10)}`, productId: 'keyauth-lag', productName: 'Fake Lag', key: trimmedKey, keyauthUsername: lagResult.info?.username ?? trimmedKey, hwid: lagResult.info?.hwid ?? '', lastLogin: toISO(lagResult.info?.lastlogin), expiresAt: getExpiry(lagResult.info), status: 'active' as const, ip: lagResult.info?.ip ?? '', device: '', hwidResetsUsed: 0, hwidResetMonth: new Date().getMonth() }; activatedLicenses.push(lic); lastKey = trimmedKey; lastName = 'Fake Lag'; }
      if (intOk) { const lic = { id: `int_${Math.random().toString(36).slice(2, 10)}`, productId: 'keyauth-internal', productName: 'Internal', key: trimmedKey + '_INTERNAL', keyauthUsername: intResult.info?.username ?? trimmedKey, hwid: intResult.info?.hwid ?? '', lastLogin: toISO(intResult.info?.lastlogin), expiresAt: getExpiry(intResult.info), status: 'active' as const, ip: intResult.info?.ip ?? '', device: '', hwidResetsUsed: 0, hwidResetMonth: new Date().getMonth() }; activatedLicenses.push(lic); lastKey = trimmedKey + '_INTERNAL'; lastName = 'Internal'; }
      if (activatedLicenses.length) {
        const payload = activatedLicenses.map(l => toDbLicenseRow(l, { id: user.id, email: user.email }));
        const { data: savedRows, error: saveError } = await supabase.from('user_licenses').upsert(payload, { onConflict: 'user_id,license_key' }).select('*');
        if (saveError) throw new Error(saveError.message || 'Failed to save');
        const saved = ((savedRows ?? []) as UserLicenseRow[]).map(mapDbLicense);
        setLicenses([...saved, ...licenses.filter(e => !saved.some(s => s.key === e.key))].sort((a, b) => new Date(b.expiresAt).getTime() - new Date(a.expiresAt).getTime()));
      }
      if (!existingBinding) { const { error: bindErr } = await supabase.from('key_bindings').insert({ key: trimmedKey, user_id: user.id, user_email: user.email, panel_type: panelType }); if (bindErr) console.warn('Bind save failed:', bindErr.message); }
      const count = (lagOk ? 1 : 0) + (intOk ? 1 : 0);
      if (count === 2) toast.success('🎉 Both panels activated!'); else if (count === 1) toast.success(`✅ ${lastName} activated!`);
      if (lastKey) setSuccessKey({ productName: lagOk && intOk ? 'Fake Lag + Internal' : lastName, key: lastKey });
      setKeyValue(''); setErrorMsg('');
    } catch (e) { setErrorMsg(`Error: ${String(e)}`); toast.error('Something went wrong'); }
    finally { setLoading(false); }
  };

  handleActivateRef.current = handleActivate;

  const isExpiredLic = (l: any) => isLicenseExpired(l?.expiresAt);
  const lagActive = licenses.filter((l: any) => l?.productId === 'keyauth-lag' && !isExpiredLic(l));
  const lagExpired = licenses.filter((l: any) => l?.productId === 'keyauth-lag' && isExpiredLic(l));
  const intActive = licenses.filter((l: any) => (l?.productId === 'keyauth-internal' || l?.key?.endsWith?.('_INTERNAL')) && !isExpiredLic(l));
  const intExpired = licenses.filter((l: any) => (l?.productId === 'keyauth-internal' || l?.key?.endsWith?.('_INTERNAL')) && isExpiredLic(l));
  const hasActive = lagActive.length > 0 || intActive.length > 0;
  const hasExpired = lagExpired.length > 0 || intExpired.length > 0;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 18, fontFamily: "'Inter',system-ui,sans-serif" }}>
      <style>{`
        @keyframes lc-in  { from{opacity:0;transform:translateY(22px)} to{opacity:1;transform:none} }
        @keyframes lc-live { 0%,100%{box-shadow:0 0 0 0 rgba(74,222,128,.5)} 60%{box-shadow:0 0 0 5px rgba(74,222,128,0)} }
        @keyframes lc-spin { to{transform:rotate(360deg)} }
        .lic-input::placeholder { color: rgba(255, 255, 255, 0.55); opacity: 1; }
      `}</style>

      {hwidTarget && <HwidModal onConfirm={confirmResetHwid} onCancel={() => setHwidTarget(null)} />}
      {successKey && <SuccessCard productName={successKey.productName} licKey={successKey.key} onDismiss={() => setSuccessKey(null)} />}

      {/* ── PAGE HEADER ── */}
      <div style={{ animation: 'lc-in .5s both' }}>
        <div style={{ fontSize: 'clamp(26px,4vw,36px)', fontWeight: 700, color: '#fff', letterSpacing: '-.03em', marginBottom: 4 }}>
          Active Your License Key
        </div>
      </div>

      {/* ── ACTIVATE BOX ── */}
      <div style={{ borderRadius: 24, background: 'rgba(255,255,255,.028)', border: '1px solid rgba(255,255,255,.08)', padding: '24px', animation: 'lc-in .5s .12s both', backdropFilter: 'blur(20px)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 1, background: 'linear-gradient(90deg,transparent,rgba(167,139,250,.3),rgba(255,255,255,.12),rgba(167,139,250,.3),transparent)', pointerEvents: 'none' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 20 }}>
          <div style={{ width: 44, height: 44, borderRadius: 14, background: 'rgba(139,92,246,.12)', border: '1px solid rgba(139,92,246,.24)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 0 18px rgba(109,40,217,.2)', flexShrink: 0 }}>
            <Key size={20} color="#a78bfa" />
          </div>
          <div>
            <div style={{ fontSize: 16, fontWeight: 700, color: '#fff', letterSpacing: '-.01em' }}>Activate License Key</div>
            <div style={{ fontSize: 12, color: 'rgba(255,255,255,.35)', marginTop: 2 }}>Enter your KeyAuth key to unlock your panel access</div>
          </div>
        </div>
        <div style={{ position: 'relative', marginBottom: 12 }}>
          <Key size={14} style={{ position: 'absolute', left: 14, top: '50%', transform: 'translateY(-50%)', color: 'rgba(255,255,255,.3)', pointerEvents: 'none' }} />
          <input className="lic-input" value={keyValue} onChange={e => setKeyValue(e.target.value)}
            placeholder="1999X-XXXX-XXXX"
            onKeyDown={e => { if (e.key === 'Enter') handleActivateRef.current?.(); }}
            style={{ width: '100%', background: 'rgba(0,0,0,.3)', border: '1px solid rgba(255,255,255,.1)', borderRadius: 14, padding: '14px 14px 14px 40px', color: '#fff', fontSize: 14, fontFamily: 'monospace', letterSpacing: '2px', outline: 'none', boxSizing: 'border-box', transition: 'border-color .2s' }}
            onFocus={e => { e.currentTarget.style.borderColor = 'rgba(167,139,250,.35)'; }}
            onBlur={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,.1)'; }}
          />
        </div>
        <button onClick={handleActivate} disabled={loading || !isReady}
          style={{ width: '100%', padding: '14px', borderRadius: 14, border: 'none', cursor: loading || !isReady ? 'not-allowed' : 'pointer', fontFamily: 'inherit', fontSize: 14, fontWeight: 700, color: loading || !isReady ? 'rgba(255,255,255,.3)' : '#fff', background: loading || !isReady ? 'rgba(255,255,255,.06)' : 'linear-gradient(135deg,#7c3aed,#6d28d9)', boxShadow: loading || !isReady ? 'none' : '0 0 28px rgba(109,40,217,.4),0 4px 14px rgba(0,0,0,.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all .22s', border_: loading || !isReady ? '1px solid rgba(255,255,255,.09)' : 'none' } as any}>
          {loading ? <><Loader2 size={16} style={{ animation: 'lc-spin 1s linear infinite' }} />Validating…</> : <><Key size={16} />Activate License Key</>}
        </button>
        {errorMsg && (
          <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 14, background: 'rgba(239,68,68,.07)', border: '1px solid rgba(239,68,68,.2)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 5 }}>
              <AlertTriangle size={13} color="#f87171" />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#f87171' }}>Activation Failed</span>
            </div>
            <p style={{ fontSize: 12, color: 'rgba(248,113,113,.7)', lineHeight: 1.5, wordBreak: 'break-word', margin: 0 }}>{errorMsg}</p>
          </div>
        )}
      </div>

      {/* ── LICENSE CARDS ── */}
      {(intActive.length > 0 || lagActive.length > 0) && (
        <div style={{ animation: 'lc-in .5s .18s both' }}>
          {intActive.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.4)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 12 }}>
                1999X Internal Panel
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {intActive.map((l: any) => <LicenseCard key={l?.id || Math.random()} lic={l} onCopy={copyKey} onReset={setHwidTarget} variant="internal" />)}
              </div>
            </div>
          )}
          {lagActive.length > 0 && (
            <div style={{ marginBottom: 24 }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: 'rgba(255,255,255,.4)', letterSpacing: '.12em', textTransform: 'uppercase', marginBottom: 12 }}>
                1999X Fake Lag Panel
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                {lagActive.map((l: any) => <LicenseCard key={l?.id || Math.random()} lic={l} onCopy={copyKey} onReset={setHwidTarget} variant="lag" />)}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── DOWNLOAD ── */}
      {hasActive && <DownloadSection />}

      {/* ── EMPTY STATE ── */}
      {!hasActive && (
        <div style={{ padding: '60px 20px', textAlign: 'center', borderRadius: 24, background: 'rgba(255,255,255,.02)', border: '1px dashed rgba(255,255,255,.08)', animation: 'lc-in .5s .24s both' }}>
          <div style={{ width: 64, height: 64, borderRadius: 20, background: 'rgba(139,92,246,.08)', border: '1px solid rgba(139,92,246,.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 32px rgba(109,40,217,.08)' }}>
            <Key size={28} color="rgba(139,92,246,.4)" />
          </div>
          <div style={{ fontSize: 15, fontWeight: 600, color: 'rgba(255,255,255,.4)', marginBottom: 5 }}>No active licenses</div>
          <div style={{ fontSize: 13, color: 'rgba(255,255,255,.22)' }}>Paste your license key above to get started</div>
        </div>
      )}

      {/* ── EXPIRED HISTORY ── */}
      {hasExpired && <ExpiredHistory intExpired={intExpired} lagExpired={lagExpired} />}
    </div>
  );
}
