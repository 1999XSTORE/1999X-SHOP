import { useState } from 'react';
import { useAppStore } from '@/lib/store';
import { toast } from 'sonner';
import { Megaphone, Key, ShoppingBag, Shield, Plus, Trash2, Ban, CheckCircle, Copy } from 'lucide-react';

type AdminTab = 'announcements' | 'keys' | 'purchases' | 'generate';

const generateKey = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  return Array.from({ length: 4 }, () =>
    Array.from({ length: 5 }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
  ).join('-');
};

export default function AdminPanel() {
  const { announcements, licenses, purchaseHistory, addAnnouncement, deleteAnnouncement, banKey, unbanKey, addLicense, user } = useAppStore();
  const [tab, setTab] = useState<AdminTab>('announcements');
  const [annTitle, setAnnTitle] = useState('');
  const [annContent, setAnnContent] = useState('');
  const [annType, setAnnType] = useState<'update' | 'maintenance' | 'feature'>('update');
  const [genKey, setGenKey] = useState('');
  const [copied, setCopied] = useState('');

  const tabs = [
    { id: 'announcements' as AdminTab, label: 'Announcements', icon: Megaphone },
    { id: 'keys' as AdminTab, label: 'Keys', icon: Key },
    { id: 'purchases' as AdminTab, label: 'Purchases', icon: ShoppingBag },
    { id: 'generate' as AdminTab, label: 'Generate Key', icon: Plus },
  ];

  const handleAddAnnouncement = () => {
    if (!annTitle.trim() || !annContent.trim()) { toast.error('Title and content required.'); return; }
    addAnnouncement({ title: annTitle.trim(), content: annContent.trim(), type: annType });
    setAnnTitle(''); setAnnContent('');
    toast.success('Announcement posted!');
  };

  const handleGenerateKey = () => {
    const key = generateKey();
    setGenKey(key);
  };

  const handleDeliverKey = () => {
    if (!genKey) return;
    const id = Math.random().toString(36).substring(2, 10);
    addLicense({
      id,
      productId: 'admin-gen',
      productName: 'Admin Generated Key',
      key: genKey,
      hwid: '',
      lastLogin: new Date().toISOString(),
      expiresAt: new Date(Date.now() + 30 * 86400000).toISOString(),
      status: 'active',
      ip: '',
      device: '',
      hwidResetsUsed: 0,
      hwidResetMonth: new Date().getMonth(),
      productType: 'monthly',
      boundEmail: user?.email ?? '',
    });
    toast.success('Key delivered to your account!');
    setGenKey('');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(id);
    setTimeout(() => setCopied(''), 2000);
  };

  const formatDate = (d: string) => new Date(d).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-1">
          <Shield className="w-6 h-6" style={{ color: '#8b5cf6' }} />
          <h1 className="text-2xl font-black" style={{ color: 'rgba(255,255,255,0.95)' }}>Admin Panel</h1>
        </div>
        <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>Manage announcements, keys, and purchases</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 flex-wrap">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all"
            style={{
              background: tab === id ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)',
              border: `1px solid ${tab === id ? 'rgba(139,92,246,0.35)' : 'rgba(255,255,255,0.08)'}`,
              color: tab === id ? '#a78bfa' : 'rgba(255,255,255,0.4)',
            }}
          >
            <Icon size={14} />
            {label}
          </button>
        ))}
      </div>

      {/* ANNOUNCEMENTS */}
      {tab === 'announcements' && (
        <div className="space-y-4">
          {/* Create */}
          <div className="rounded-2xl p-5" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <h3 className="font-bold mb-4 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Post Announcement</h3>
            <div className="space-y-3">
              <input
                value={annTitle}
                onChange={e => setAnnTitle(e.target.value)}
                placeholder="Title..."
                className="w-full px-4 py-3 rounded-xl text-sm outline-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}
              />
              <textarea
                value={annContent}
                onChange={e => setAnnContent(e.target.value)}
                placeholder="Content..."
                rows={3}
                className="w-full px-4 py-3 rounded-xl text-sm outline-none resize-none"
                style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'rgba(255,255,255,0.85)' }}
              />
              <div className="flex gap-2">
                {(['update','maintenance','feature'] as const).map(t => (
                  <button key={t} onClick={() => setAnnType(t)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all"
                    style={{ background: annType === t ? 'rgba(139,92,246,0.15)' : 'rgba(255,255,255,0.04)', border: `1px solid ${annType === t ? 'rgba(139,92,246,0.3)' : 'rgba(255,255,255,0.08)'}`, color: annType === t ? '#a78bfa' : 'rgba(255,255,255,0.4)' }}>
                    {t}
                  </button>
                ))}
              </div>
              <button onClick={handleAddAnnouncement} className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold transition-all" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}>
                <Megaphone size={14} /> Post to All Users
              </button>
            </div>
          </div>

          {/* List */}
          <div className="space-y-2">
            {announcements.map(a => (
              <div key={a.id} className="flex items-start justify-between gap-4 p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-xs px-2 py-0.5 rounded-full capitalize font-semibold" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa', border: '1px solid rgba(139,92,246,0.2)' }}>{a.type}</span>
                    <span className="font-semibold text-sm truncate" style={{ color: 'rgba(255,255,255,0.8)' }}>{a.title}</span>
                  </div>
                  <p className="text-xs" style={{ color: 'rgba(255,255,255,0.4)' }}>{a.content}</p>
                </div>
                <button onClick={() => deleteAnnouncement(a.id)} className="p-1.5 rounded-lg hover:bg-red-500/10 transition-all flex-shrink-0" style={{ color: 'rgba(248,113,113,0.6)' }}>
                  <Trash2 size={13} />
                </button>
              </div>
            ))}
            {announcements.length === 0 && <p className="text-center py-8 text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>No announcements yet.</p>}
          </div>
        </div>
      )}

      {/* KEYS */}
      {tab === 'keys' && (
        <div className="space-y-2">
          {licenses.length === 0 && <p className="text-center py-12 text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>No keys in the system.</p>}
          {licenses.map(l => (
            <div key={l.id} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: `1px solid ${l.status === 'banned' ? 'rgba(248,113,113,0.2)' : l.status === 'active' ? 'rgba(16,232,152,0.12)' : 'rgba(255,255,255,0.07)'}` }}>
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${l.status === 'active' ? 'text-green-400' : l.status === 'banned' ? 'text-red-400' : 'text-yellow-400'}`} style={{ background: l.status === 'active' ? 'rgba(16,232,152,0.1)' : l.status === 'banned' ? 'rgba(248,113,113,0.1)' : 'rgba(251,191,36,0.1)', border: `1px solid ${l.status === 'active' ? 'rgba(16,232,152,0.2)' : l.status === 'banned' ? 'rgba(248,113,113,0.2)' : 'rgba(251,191,36,0.2)'}` }}>
                      {l.status}
                    </span>
                    <span className="text-xs font-bold truncate" style={{ color: 'rgba(255,255,255,0.7)' }}>{l.productName}</span>
                    {l.productType && <span className="text-[10px] px-1.5 py-0.5 rounded-md capitalize" style={{ background: 'rgba(139,92,246,0.1)', color: '#a78bfa' }}>{l.productType}</span>}
                  </div>
                  <div className="font-mono text-xs mb-1" style={{ color: '#c4b5fd' }}>{l.key}</div>
                  <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    {l.boundEmail && <span>📧 {l.boundEmail} · </span>}
                    Expires: {formatDate(l.expiresAt)}
                    {l.hwid && <span> · HWID: {l.hwid.substring(0,10)}...</span>}
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <button onClick={() => copyToClipboard(l.key, l.id)} className="p-1.5 rounded-lg transition-all" style={{ background: 'rgba(139,92,246,0.08)', color: copied === l.id ? '#10e898' : '#a78bfa' }}>
                    {copied === l.id ? <CheckCircle size={13} /> : <Copy size={13} />}
                  </button>
                  {l.status === 'banned' ? (
                    <button onClick={() => { unbanKey(l.id); toast.success('Key unbanned.'); }} className="p-1.5 rounded-lg transition-all" style={{ background: 'rgba(16,232,152,0.08)', color: '#10e898' }}>
                      <CheckCircle size={13} />
                    </button>
                  ) : (
                    <button onClick={() => { banKey(l.id); toast.success('Key banned.'); }} className="p-1.5 rounded-lg transition-all" style={{ background: 'rgba(248,113,113,0.08)', color: '#f87171' }}>
                      <Ban size={13} />
                    </button>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* PURCHASES */}
      {tab === 'purchases' && (
        <div className="space-y-2">
          {(purchaseHistory ?? []).length === 0 && <p className="text-center py-12 text-sm" style={{ color: 'rgba(255,255,255,0.25)' }}>No purchases yet.</p>}
          {(purchaseHistory ?? []).map(p => (
            <div key={p.id} className="p-4 rounded-xl" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.07)' }}>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-semibold text-sm" style={{ color: 'rgba(255,255,255,0.8)' }}>{p.productName}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md capitalize" style={{ background: 'rgba(16,232,152,0.08)', color: '#10e898', border: '1px solid rgba(16,232,152,0.15)' }}>{p.productType}</span>
                  </div>
                  <div className="font-mono text-xs mb-1" style={{ color: '#c4b5fd' }}>{p.key}</div>
                  <div className="text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
                    Purchased: {formatDate(p.purchasedAt)} · Expires: {formatDate(p.expiresAt)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-lg" style={{ color: '#10e898' }}>${p.amount}</div>
                  <button onClick={() => copyToClipboard(p.key, 'ph-' + p.id)} className="text-[10px] mt-1 flex items-center gap-1 justify-end transition-all" style={{ color: copied === 'ph-' + p.id ? '#10e898' : 'rgba(255,255,255,0.3)' }}>
                    {copied === 'ph-' + p.id ? <><CheckCircle size={10} /> Copied</> : <><Copy size={10} /> Copy Key</>}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* GENERATE KEY */}
      {tab === 'generate' && (
        <div className="rounded-2xl p-6" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)' }}>
          <h3 className="font-bold mb-2 text-sm" style={{ color: 'rgba(255,255,255,0.7)' }}>Manually Generate Key</h3>
          <p className="text-xs mb-5" style={{ color: 'rgba(255,255,255,0.35)' }}>Generate a key and optionally deliver it to your account.</p>

          <button onClick={handleGenerateKey} className="w-full flex items-center justify-center gap-2 py-4 rounded-xl font-bold text-sm transition-all mb-4" style={{ background: 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(109,40,217,0.12))', border: '1px solid rgba(139,92,246,0.35)', color: '#a78bfa' }}>
            <Plus size={16} /> Generate New Key
          </button>

          {genKey && (
            <div className="space-y-3">
              <div className="p-4 rounded-xl" style={{ background: 'rgba(139,92,246,0.07)', border: '1px solid rgba(139,92,246,0.25)' }}>
                <div className="text-xs mb-2 uppercase tracking-widest" style={{ color: 'rgba(255,255,255,0.35)' }}>Generated Key</div>
                <div className="font-mono font-bold text-xl" style={{ color: '#c4b5fd', letterSpacing: '0.08em' }}>{genKey}</div>
              </div>
              <div className="flex gap-2">
                <button onClick={() => copyToClipboard(genKey, 'gen')} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all" style={{ background: 'rgba(16,232,152,0.08)', border: '1px solid rgba(16,232,152,0.2)', color: copied === 'gen' ? '#10e898' : '#6ee7b7' }}>
                  {copied === 'gen' ? <><CheckCircle size={14} /> Copied!</> : <><Copy size={14} /> Copy</>}
                </button>
                <button onClick={handleDeliverKey} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-bold transition-all" style={{ background: 'rgba(139,92,246,0.12)', border: '1px solid rgba(139,92,246,0.3)', color: '#a78bfa' }}>
                  <Key size={14} /> Deliver to Account
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
