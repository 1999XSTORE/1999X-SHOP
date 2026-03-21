import { useEffect } from 'react';

export default function StorePage() {
  useEffect(() => {
    // Inject DM Sans font
    const font = document.createElement('link');
    font.rel = 'stylesheet';
    font.href = 'https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap';
    document.head.appendChild(font);

    // Inject sell.app styles
    const sellCss = document.createElement('link');
    sellCss.rel = 'stylesheet';
    sellCss.href = 'https://cdn.sell.app/embed/style.css';
    document.head.appendChild(sellCss);

    // Inject sell.app script
    const script = document.createElement('script');
    script.src = 'https://cdn.sell.app/embed/script.js';
    script.type = 'module';
    script.async = true;
    document.head.appendChild(script);

    return () => {
      document.head.removeChild(font);
      document.head.removeChild(sellCss);
      if (document.head.contains(script)) document.head.removeChild(script);
    };
  }, []);

  return (
    <div>

      <style>{`
/* ── DASHBOARD (shared with chat page) ── */
#s99-dash{font-family:'DM Sans',sans-serif;color:#fff;width:100%;position:relative;padding:0 0 20px;box-sizing:border-box;margin:0;}
#s99-dash .d-orb{position:absolute;border-radius:50%;pointer-events:none;filter:blur(60px);z-index:0;animation:d-orbFloat linear infinite}
@keyframes d-orbFloat{0%,100%{transform:translate(0,0) scale(1)}30%{transform:translate(20px,-18px) scale(1.06)}60%{transform:translate(-12px,22px) scale(0.96)}80%{transform:translate(16px,8px) scale(1.03)}}
#s99-dash .d-spark{position:absolute;pointer-events:none;width:4px;height:4px;border-radius:50%;background:#fff;opacity:0;animation:d-sparkAnim ease-in-out infinite;z-index:0}
@keyframes d-sparkAnim{0%,100%{opacity:0;transform:scale(0) rotate(0deg)}50%{opacity:0.55;transform:scale(1) rotate(180deg)}}
#s99-dash .d-header{text-align:center;margin-bottom:0;position:relative;z-index:2;}
#s99-dash .d-brand{font-size:clamp(42px,8vw,86px);font-weight:700;letter-spacing:-3px;line-height:1;margin-bottom:10px;background:linear-gradient(160deg,#fff5d6 0%,#f5c842 28%,#e8882a 58%,#c0391b 100%);-webkit-background-clip:text;-webkit-text-fill-color:transparent;background-clip:text;white-space:nowrap;display:inline-block;padding-right:8px;clip-path:inset(0 100% 0 0);animation:d-type-smooth 1.6s cubic-bezier(0.22,1,0.36,1) 0.3s forwards,d-type-loop 11.6s cubic-bezier(0.22,1,0.36,1) 11.9s infinite;}
@keyframes d-type-smooth{from{clip-path:inset(0 100% 0 0);}to{clip-path:inset(0 -8px 0 0);}}
@keyframes d-type-loop{0%{clip-path:inset(0 100% 0 0);}13%{clip-path:inset(0 -8px 0 0);}85%{clip-path:inset(0 -8px 0 0);}100%{clip-path:inset(0 -8px 0 0);}}
#s99-dash .d-tagline{font-size:12px;font-weight:400;color:rgba(255,255,255,0.22);letter-spacing:4px;text-transform:uppercase;margin-bottom:32px;display:block;opacity:0;transform:translateY(10px);animation:d-tag-in 0.7s cubic-bezier(.22,1,.36,1) 1.6s forwards;}
@keyframes d-tag-in{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:translateY(0);}}
#s99-dash .d-tagline span{display:inline-block;opacity:0;animation:d-letter-in 0.35s cubic-bezier(.22,1,.36,1) forwards;}
@keyframes d-letter-in{from{opacity:0;transform:translateY(6px);}to{opacity:1;transform:translateY(0);}}

.s99-wrap{font-family:'DM Sans',sans-serif;width:100%;max-width:1100px;margin:0 auto;padding:0 0 48px;box-sizing:border-box;background:transparent;position:relative;overflow:visible;}
.s99-mesh{position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);width:900px;height:500px;pointer-events:none;z-index:0;background:radial-gradient(ellipse 60% 60% at 20% 50%,rgba(74,222,128,0.06) 0%,transparent 70%),radial-gradient(ellipse 60% 60% at 80% 50%,rgba(165,180,252,0.06) 0%,transparent 70%),radial-gradient(ellipse 50% 70% at 50% 50%,rgba(201,168,76,0.07) 0%,transparent 65%);filter:blur(32px);animation:s99mesh 8s ease-in-out infinite alternate;}
@keyframes s99mesh{from{opacity:0.7;transform:translate(-50%,-50%) scale(1);}to{opacity:1;transform:translate(-50%,-50%) scale(1.06);}}
.s99-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;position:relative;z-index:2;align-items:start;}
@keyframes s99float1{0%,100%{transform:translateY(0px)}50%{transform:translateY(-12px)}}
@keyframes s99float2{0%,100%{transform:translateY(0px)}50%{transform:translateY(-10px)}}
@keyframes s99float3{0%,100%{transform:translateY(0px)}50%{transform:translateY(-14px)}}
.s99-card{background:rgba(18,18,20,0.92);border:1px solid rgba(255,255,255,0.09);border-radius:20px;overflow:hidden;box-shadow:0 8px 32px rgba(0,0,0,0.45),0 2px 8px rgba(0,0,0,0.3),inset 0 1px 0 rgba(255,255,255,0.06);transition:box-shadow 0.35s,border-color 0.3s;will-change:transform;transform:translateZ(0);}
.s99-card:nth-child(1){animation:s99float1 6s cubic-bezier(0.45,0.05,0.55,0.95) infinite;}
.s99-card:nth-child(2){animation:s99float2 7s cubic-bezier(0.45,0.05,0.55,0.95) 0.8s infinite;margin-top:-14px;}
.s99-card:nth-child(3){animation:s99float3 5.5s cubic-bezier(0.45,0.05,0.55,0.95) 1.6s infinite;}
.s99-card:hover{box-shadow:0 24px 60px rgba(0,0,0,0.6),0 4px 16px rgba(0,0,0,0.4),inset 0 1px 0 rgba(255,255,255,0.1);border-color:rgba(255,255,255,0.16);animation-play-state:paused;}
.s99-card.s99-feat{border-color:rgba(201,168,76,0.35);background:rgba(22,18,8,0.82);box-shadow:0 8px 32px rgba(0,0,0,0.5),0 0 40px rgba(201,168,76,0.08),inset 0 1px 0 rgba(201,168,76,0.12);}
.s99-card.s99-feat:hover{border-color:rgba(201,168,76,0.55);box-shadow:0 24px 60px rgba(0,0,0,0.65),0 0 60px rgba(201,168,76,0.12),inset 0 1px 0 rgba(201,168,76,0.15);}
.s99-card::before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.12),transparent);pointer-events:none;z-index:5;}
.s99-card.s99-feat::before{background:linear-gradient(90deg,transparent,rgba(201,168,76,0.5),transparent);}
.s99-photo{position:relative;width:100%;height:170px;overflow:hidden;background:#0d0d0d;}
.s99-photo img{width:100%;height:100%;object-fit:cover;object-position:center center;display:block;transition:transform 0.5s cubic-bezier(.22,1,.36,1),filter 0.4s;filter:brightness(0.88) saturate(1.1);}
.s99-card:hover .s99-photo img{transform:scale(1.05);filter:brightness(0.96) saturate(1.2);}
.s99-photo::after{content:'';position:absolute;bottom:0;left:0;right:0;height:80px;background:linear-gradient(to bottom,transparent,rgba(18,18,20,0.95));pointer-events:none;z-index:1;}
.s99-card.s99-feat .s99-photo::after{background:linear-gradient(to bottom,transparent,rgba(22,18,8,0.95));}
.s99-badge{position:absolute;top:10px;left:10px;z-index:3;display:inline-flex;align-items:center;gap:5px;font-size:9px;font-weight:700;letter-spacing:1.8px;text-transform:uppercase;padding:4px 10px;border-radius:20px;backdrop-filter:blur(12px);-webkit-backdrop-filter:blur(12px);}
.s99-bdot{width:5px;height:5px;border-radius:50%;animation:s99dot 2s ease-in-out infinite;display:inline-block;}
@keyframes s99dot{0%,100%{opacity:1}50%{opacity:0.3}}
.bg-g{background:rgba(5,15,5,0.8);color:#4ade80;border:1px solid rgba(74,222,128,0.38);}
.bg-g .s99-bdot{background:#4ade80;box-shadow:0 0 6px #4ade80;}
.bg-au{background:rgba(18,14,2,0.85);color:#f0d47a;border:1px solid rgba(201,168,76,0.45);}
.bg-au .s99-bdot{background:#f0d47a;box-shadow:0 0 6px #f0d47a;}
.bg-i{background:rgba(5,5,20,0.8);color:#a5b4fc;border:1px solid rgba(165,180,252,0.32);}
.bg-i .s99-bdot{background:#a5b4fc;box-shadow:0 0 6px #a5b4fc;}
.s99-body{padding:18px 18px 20px;position:relative;}
.s99-name{font-size:16px;font-weight:700;color:#fff;margin-bottom:6px;letter-spacing:-0.2px;}
.s99-desc{font-size:11.5px;color:rgba(255,255,255,0.42);line-height:1.65;margin-bottom:15px;}
.s99-feats{list-style:none;margin-bottom:16px;display:flex;flex-direction:column;gap:6px;}
.s99-feats li{display:flex;align-items:center;gap:7px;font-size:11px;font-weight:500;color:rgba(255,255,255,0.58);}
.s99-tick{width:14px;height:14px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:7px;font-weight:800;flex-shrink:0;}
.tk-g{background:rgba(74,222,128,0.12);color:#4ade80;}
.tk-au{background:rgba(201,168,76,0.12);color:#f0d47a;}
.tk-i{background:rgba(165,180,252,0.12);color:#a5b4fc;}
.s99-div{height:1px;background:rgba(255,255,255,0.07);margin-bottom:14px;}
.s99-price-row{display:flex;align-items:baseline;gap:5px;margin-bottom:14px;}
.s99-from{font-size:10px;font-weight:500;color:rgba(255,255,255,0.2);text-transform:uppercase;letter-spacing:1px;}
.s99-price{font-size:26px;font-weight:800;letter-spacing:-1px;line-height:1;}
.p-g{color:#4ade80;}.p-au{color:#f0d47a;}.p-i{color:#a5b4fc;}
.s99-per{font-size:11px;color:rgba(255,255,255,0.2);font-weight:400;}
.s99-btn-wrap button,.s99-btn-wrap [data-sell-store]{all:unset !important;display:flex !important;align-items:center !important;justify-content:center !important;gap:6px !important;width:100% !important;padding:12px 14px !important;border-radius:12px !important;font-family:'DM Sans',sans-serif !important;font-size:13px !important;font-weight:700 !important;cursor:pointer !important;box-sizing:border-box !important;transition:all 0.25s cubic-bezier(.22,1,.36,1) !important;text-align:center !important;}
.s99-g button,.s99-g [data-sell-store]{background:rgba(74,222,128,0.1) !important;border:1px solid rgba(74,222,128,0.3) !important;color:#4ade80 !important;}
.s99-g button:hover,.s99-g [data-sell-store]:hover{background:rgba(74,222,128,0.18) !important;transform:translateY(-2px) !important;box-shadow:0 8px 22px rgba(74,222,128,0.18) !important;}
.s99-au button,.s99-au [data-sell-store]{background:linear-gradient(135deg,#c9a84c,#e8b84b) !important;color:#0a0a0a !important;box-shadow:0 4px 18px rgba(201,168,76,0.32) !important;}
.s99-au button:hover,.s99-au [data-sell-store]:hover{transform:translateY(-2px) !important;box-shadow:0 10px 28px rgba(201,168,76,0.46) !important;filter:brightness(1.07) !important;}
.s99-i button,.s99-i [data-sell-store]{background:rgba(165,180,252,0.1) !important;border:1px solid rgba(165,180,252,0.28) !important;color:#a5b4fc !important;}
.s99-i button:hover,.s99-i [data-sell-store]:hover{background:rgba(165,180,252,0.18) !important;transform:translateY(-2px) !important;box-shadow:0 8px 22px rgba(165,180,252,0.16) !important;}
.s99-trust{display:flex;align-items:center;justify-content:center;gap:20px;margin-top:40px;flex-wrap:wrap;position:relative;z-index:2;}
.s99-trust span{font-size:11px;font-weight:500;color:rgba(255,255,255,0.22);}
.s99-tsep{width:1px;height:12px;background:rgba(255,255,255,0.08);}
@media(max-width:780px){.s99-grid{grid-template-columns:1fr;max-width:360px;margin:0 auto;}.s99-card:nth-child(2){margin-top:0;}}
@media(max-width:420px){.s99-photo{height:145px;}}
      `}</style>

      <div className="s99-wrap">
        <div className="s99-mesh" />

        {/* Header */}
        <div id="s99-dash">
          <div className="d-orb" style={{width:260,height:260,background:'rgba(74,222,128,0.07)',top:-40,left:-60,animationDuration:'18s'}} />
          <div className="d-orb" style={{width:220,height:220,background:'rgba(201,168,76,0.06)',bottom:0,right:-50,animationDuration:'22s',animationDelay:'-9s'}} />
          <div className="d-orb" style={{width:180,height:180,background:'rgba(88,101,242,0.05)',top:'40%',left:'55%',animationDuration:'26s',animationDelay:'-14s'}} />
          <div className="d-spark" style={{top:'18%',left:'10%',animationDuration:'3.4s'}} />
          <div className="d-spark" style={{top:'70%',left:'90%',animationDuration:'4.2s',animationDelay:'1.3s',width:3,height:3}} />
          <div className="d-spark" style={{top:'85%',left:'28%',animationDuration:'5.1s',animationDelay:'2.6s',width:5,height:5}} />
          <div className="d-spark" style={{top:'30%',left:'78%',animationDuration:'3.9s',animationDelay:'0.9s'}} />
          <div className="d-header">
            <div className="d-brand">1999X SHOP</div>
            <div className="d-tagline">
              {'Free Fire Internal'.split('').map((ch, i) => (
                <span key={i} style={{animationDelay:`${1.5 + i * 0.08}s`}}>{ch === ' ' ? '\u00a0' : ch}</span>
              ))}
            </div>
          </div>
        </div>

        {/* Cards */}
        <div className="s99-grid">
          {/* Internal */}
          <div className="s99-card" style={{position:'relative'}}>
            <div className="s99-photo">
              <img src="https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&q=80" alt="Internal Panel"/>
              <div className="s99-badge bg-g"><span className="s99-bdot"/>Internal</div>
            </div>
            <div className="s99-body">
              <div className="s99-name">Internal Panel</div>
              <div className="s99-desc">Advanced internal cheat features. Full control, maximum performance.</div>
              <ul className="s99-feats">
                <li><span className="s99-tick tk-g">✓</span>Aimbot &amp; ESP</li>
                <li><span className="s99-tick tk-g">✓</span>Speed &amp; No recoil</li>
                <li><span className="s99-tick tk-g">✓</span>Auto updates</li>
                <li><span className="s99-tick tk-g">✓</span>Stable &amp; Undetected OB52</li>
              </ul>
              <div className="s99-div"/>
              <div className="s99-price-row">
                <span className="s99-from">from</span>
                <span className="s99-price p-g">$6.99</span>
                <span className="s99-per">/ key</span>
              </div>
              <div className="s99-btn-wrap s99-g">
                <button data-sell-store="65837" data-sell-product="316554" data-sell-theme="dark" data-sell-darkmode="true">⚡ Buy Internal</button>
              </div>
            </div>
          </div>

          {/* Combo — Featured */}
          <div className="s99-card s99-feat" style={{position:'relative'}}>
            <div className="s99-photo">
              <img src="https://images.unsplash.com/photo-1538481199705-c710c4e965fc?w=800&q=80" alt="Combo Package"/>
              <div className="s99-badge bg-au"><span className="s99-bdot"/>Best Value</div>
            </div>
            <div className="s99-body">
              <div className="s99-name">Combo Package</div>
              <div className="s99-desc">Internal + Fake Lag together. The full 1999X experience at the best price.</div>
              <ul className="s99-feats">
                <li><span className="s99-tick tk-au">✓</span>Everything in Internal</li>
                <li><span className="s99-tick tk-au">✓</span>Everything in Fake Lag</li>
                <li><span className="s99-tick tk-au">✓</span>Priority support</li>
                <li><span className="s99-tick tk-au">✓</span>Best price guaranteed</li>
              </ul>
              <div className="s99-div"/>
              <div className="s99-price-row">
                <span className="s99-from">from</span>
                <span className="s99-price p-au">$9.99</span>
                <span className="s99-per">/ bundle</span>
              </div>
              <div className="s99-btn-wrap s99-au">
                <button data-sell-store="65837" data-sell-product="318847" data-sell-theme="dark" data-sell-darkmode="true">👑 Buy Combo</button>
              </div>
            </div>
          </div>

          {/* Fake Lag */}
          <div className="s99-card" style={{position:'relative'}}>
            <div className="s99-photo">
              <img src="https://images.unsplash.com/photo-1493711662062-fa541adb3fc8?w=800&q=80" alt="Fake Lag"/>
              <div className="s99-badge bg-i"><span className="s99-bdot"/>Fake Lag</div>
            </div>
            <div className="s99-body">
              <div className="s99-name">Fake Lag</div>
              <div className="s99-desc">Network tool for lag-based advantages. Confuse enemies and dominate every fight.</div>
              <ul className="s99-feats">
                <li><span className="s99-tick tk-i">✓</span>Lag switch control</li>
                <li><span className="s99-tick tk-i">✓</span>Packet manipulation</li>
                <li><span className="s99-tick tk-i">✓</span>Adjustable delay</li>
                <li><span className="s99-tick tk-i">✓</span>Stable · Undetected OB52</li>
              </ul>
              <div className="s99-div"/>
              <div className="s99-price-row">
                <span className="s99-from">from</span>
                <span className="s99-price p-i">$4.99</span>
                <span className="s99-per">/ key</span>
              </div>
              <div className="s99-btn-wrap s99-i">
                <button data-sell-store="65837" data-sell-product="316546" data-sell-theme="dark" data-sell-darkmode="true">⚡ Buy Fake Lag</button>
              </div>
            </div>
          </div>
        </div>

        {/* Trust bar */}
        <div className="s99-trust">
          <span>🔒 Secure checkout</span><div className="s99-tsep"/>
          <span>⚡ Instant delivery</span><div className="s99-tsep"/>
          <span>🛡 Undetected OB52</span><div className="s99-tsep"/>
          <span>👥 2,000+ customers</span><div className="s99-tsep"/>
          <span>💬 24/7 support</span>
        </div>
      </div>

    </div>
  );
}
