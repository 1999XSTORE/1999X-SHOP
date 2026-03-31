import { useAppStore } from '@/lib/store';
import { supabase } from '@/lib/supabase';
import { logActivity } from '@/lib/activity';
import { Download, Sparkles, Wand2, BookOpen, ArrowRight, Twitter, Linkedin, Instagram, Menu, Plus } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { useTranslation } from 'react-i18next';

const SUPA_URL  = 'https://awjouzwzdkrevvnlenvn.supabase.co';
const SUPA_ANON = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImF3am91end6ZGtyZXZ2bmxlbnZuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ0NTg4MjEsImV4cCI6MjA5MDAzNDgyMX0._I_I-WA_8-YqDfaRzKiVgpEAhkH9faxlEIV6e766A0M';
const FREE_KEY_COOLDOWN = 172800000;
const FREE_KEY_TTL = 86400000;
const BONUS_COOLDOWN = 86400000;

export default function DashboardPage() {
  const { t } = useTranslation();
  const { balance, licenses, transactions, user, addLicense } = useAppStore();
  
  const [generating, setGenerating] = useState(false);
  const [canClaim, setCanClaim] = useState(false);
  
  // Fake "Bloom" background video logic
  useEffect(() => {
    // Hide global background glow from original design
    const appBody = document.querySelector('body');
    if (appBody) {
      appBody.style.background = '#000';
      const root = document.getElementById('root');
      if (root) root.style.zIndex = '10';
    }
    return () => {
      if (appBody) appBody.style.background = '';
    };
  }, []);

  const handleClaim = async () => {
    if (generating || !user) return;
    setGenerating(true);
    toast.loading('Generating your free trial...', { id:'free-trial' });

    try {
      const [lagRes, intRes] = await Promise.all([
        fetch(`${SUPA_URL}/functions/v1/generate-key`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${SUPA_ANON}`, apikey:SUPA_ANON },
          body:JSON.stringify({ panel_type:'lag', days:1, hours:0, mask:'1999X-FREE-****' }),
        }).then(r => r.json()),
        fetch(`${SUPA_URL}/functions/v1/generate-key`, {
          method:'POST',
          headers:{ 'Content-Type':'application/json', Authorization:`Bearer ${SUPA_ANON}`, apikey:SUPA_ANON },
          body:JSON.stringify({ panel_type:'internal', days:1, hours:0, mask:'1999X-FREE-****' }),
        }).then(r => r.json()),
      ]);

      const lagKey = lagRes?.success ? lagRes.key : null;
      const intKey = intRes?.success ? intRes.key : null;

      if (!lagKey && !intKey) {
        toast.dismiss('free-trial');
        toast.error(t('license.activationFailed'));
        setGenerating(false);
        return;
      }

      const now = new Date().toISOString();
      const expiresAt = new Date(Date.now() + FREE_KEY_TTL).toISOString();
      const { error } = await supabase.from('free_trial_keys').upsert({
        user_id:user.id,
        user_email:user.email,
        lag_key:lagKey,
        internal_key:intKey,
        claimed_at:now,
        expires_at:expiresAt,
      }, { onConflict:'user_id' });

      if (error) {
        toast.dismiss('free-trial');
        toast.error(error.message);
        setGenerating(false);
        return;
      }

      if (lagKey) addLicense({ id:`free_lag_${Date.now()}`, productId:'keyauth-lag', productName:'Fake Lag (Free 1 Day Trial)', key:lagKey, hwid:'', lastLogin:now, expiresAt, status:'active', ip:'', device:'', hwidResetsUsed:0, hwidResetMonth:new Date().getMonth() });
      if (intKey) addLicense({ id:`free_int_${Date.now()}`, productId:'keyauth-internal', productName:'Internal (Free 1 Day Trial)', key:`${intKey}_INTERNAL`, hwid:'', lastLogin:now, expiresAt, status:'active', ip:'', device:'', hwidResetsUsed:0, hwidResetMonth:new Date().getMonth() });

      toast.dismiss('free-trial');
      toast.success(t('dashboard.freeKeyClaimed'));
    } catch (error) {
      toast.dismiss('free-trial');
      toast.error(String(error));
    }
    setGenerating(false);
  };

  const activeCount = licenses.filter((l) => new Date(l.expiresAt).getTime() > Date.now()).length;

  return (
    <div className="fixed inset-0 z-50 flex flex-col lg:flex-row min-h-screen text-white overflow-hidden bg-black font-['Poppins']">
      
      {/* FULL-SCREEN VIDEO BACKGROUND */}
      <video 
        autoPlay loop muted playsInline
        className="absolute inset-0 w-full h-full object-cover z-0 opacity-80 mix-blend-screen"
        src="https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260315_073750_51473149-4350-4920-ae24-c8214286f323.mp4"
      />

      {/* LEFT PANEL */}
      <div className="relative z-10 w-full lg:w-[52%] h-full p-4 lg:p-6 flex flex-col">
        {/* Liquid Glass Overlay */}
        <div className="absolute inset-4 lg:inset-6 rounded-3xl liquid-glass-strong z-[-1]"></div>

        {/* Nav Header */}
        <div className="flex items-center justify-between px-6 pt-6">
          <div className="flex items-center gap-3">
            <img src="https://www.dropbox.com/scl/fi/uv2artcam1x5w1afg7ecc/1999XX-Png.png?rlkey=b1a3nx3wav2jnd7ooce0qmhfp&st=n25kfxvg&raw=1" alt="Logo" className="w-8 h-8 rounded-full" />
            <span className="font-semibold text-2xl tracking-tighter text-white">1999X</span>
          </div>
          <button className="liquid-glass px-4 py-2 rounded-full flex items-center gap-2 hover:scale-105 transition-transform active:scale-95">
            <span className="text-sm font-medium">Menu</span>
            <Menu size={16} />
          </button>
        </div>

        {/* Center Hero */}
        <div className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <img src="https://www.dropbox.com/scl/fi/uv2artcam1x5w1afg7ecc/1999XX-Png.png?rlkey=b1a3nx3wav2jnd7ooce0qmhfp&st=n25kfxvg&raw=1" alt="Hero Logo" className="w-20 h-20 mb-8 rounded-full shadow-2xl" />
          
          <h1 className="text-6xl lg:text-7xl font-medium tracking-[-0.05em] text-white leading-tight max-w-2xl mb-10">
            Innovating the <em className="font-['Source_Serif_4'] italic text-white/80 font-normal">spirit</em> of 1999X AI
          </h1>

          <button 
            onClick={handleClaim}
            className="liquid-glass-strong rounded-full pl-6 pr-2 py-2 flex items-center gap-4 hover:scale-105 transition-transform active:scale-95 mb-14"
          >
            <span className="font-semibold">{generating ? 'Generating...' : 'Explore Now'}</span>
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center">
              <Download size={16} />
            </div>
          </button>

          <div className="flex items-center justify-center flex-wrap gap-3">
            <div className="liquid-glass px-5 py-2.5 rounded-full text-xs text-white/80">Artistic Gallery</div>
            <div className="liquid-glass px-5 py-2.5 rounded-full text-xs text-white/80">AI Generation</div>
            <div className="liquid-glass px-5 py-2.5 rounded-full text-xs text-white/80">3D Structures</div>
          </div>
        </div>

        {/* Bottom Quote */}
        <div className="pb-8 text-center flex flex-col items-center">
          <div className="text-[10px] tracking-[0.2em] uppercase text-white/50 mb-3 font-semibold">VISIONARY DESIGN</div>
          <p className="text-xl mb-4 font-['Source_Serif_4'] italic text-white/90">
            "We imagined a <span className="font-sans not-italic font-medium text-white">realm</span> with no ending."
          </p>
          <div className="flex items-center gap-4 text-white/40">
            <div className="w-8 h-[1px] bg-white/20"></div>
            <span className="text-[10px] tracking-widest font-semibold text-white/50">MARCUS AURELIO</span>
            <div className="w-8 h-[1px] bg-white/20"></div>
          </div>
        </div>
      </div>

      {/* RIGHT PANEL (Desktop Only) */}
      <div className="relative z-10 hidden lg:flex w-[48%] h-full flex-col p-6 pl-0">
        
        {/* Top Controls */}
        <div className="flex items-center justify-end gap-3 mb-10">
          <div className="liquid-glass rounded-full flex items-center p-1.5 gap-1 shadow-lg">
            <a href="#" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white hover:text-white/80"><Twitter size={15} /></a>
            <a href="#" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white hover:text-white/80"><Linkedin size={15} /></a>
            <a href="#" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-white/10 transition-colors text-white hover:text-white/80"><Instagram size={15} /></a>
            <div className="w-9 h-9 flex items-center justify-center rounded-full bg-white/10 ml-1">
              <ArrowRight size={15} />
            </div>
          </div>
          
          <button className="liquid-glass w-12 h-12 rounded-full flex items-center justify-center hover:scale-105 transition-transform">
            <Sparkles size={18} />
          </button>
        </div>

        {/* Ecosystem Card */}
        <div className="liquid-glass w-64 rounded-3xl p-6 self-start hover:scale-105 transition-transform cursor-pointer shadow-xl mb-auto">
          <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-4">
            <Sparkles size={18} className="text-white/80" />
          </div>
          <h3 className="font-semibold text-lg mb-1.5">Enter our ecosystem</h3>
          <p className="text-xs text-white/60 leading-relaxed">Join a community of thousands pushing the boundaries of what is possible.</p>
        </div>

        {/* Bottom Features Container */}
        <div className="liquid-glass rounded-[2.5rem] p-6 flex flex-col gap-4 mt-auto">
          
          <div className="flex items-center gap-4">
            <div className="liquid-glass flex-1 rounded-3xl p-5 hover:scale-105 transition-transform cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-4">
                <Wand2 size={18} className="text-white/80" />
              </div>
              <h4 className="font-semibold text-sm mb-1">Processing</h4>
              <p className="text-[11px] text-white/50">{activeCount} active threads running</p>
            </div>
            
            <div className="liquid-glass flex-1 rounded-3xl p-5 hover:scale-105 transition-transform cursor-pointer">
              <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mb-4">
                <BookOpen size={18} className="text-white/80" />
              </div>
              <h4 className="font-semibold text-sm mb-1">Growth Archive</h4>
              <p className="text-[11px] text-white/50">Stored balance: ${balance.toFixed(2)}</p>
            </div>
          </div>

          <div className="liquid-glass w-full rounded-3xl p-4 flex items-center gap-4 hover:scale-[1.02] transition-transform cursor-pointer">
            <img 
              src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=1400&q=80" 
              alt="Preview" 
              className="w-24 h-16 rounded-xl object-cover filter brightness-75 mix-blend-luminosity"
            />
            <div className="flex-1">
              <h4 className="font-semibold text-sm mb-1">Advanced Plant Sculpting</h4>
              <p className="text-xs text-white/50">Discover new 3D manipulation techniques for organic shapes.</p>
            </div>
            <button className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center mr-2 hover:bg-white/20 transition-colors">
              <Plus size={18} />
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}
