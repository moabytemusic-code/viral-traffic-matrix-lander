// Dynamic Multi-Archetype 8-Pillar Lander Engine (designing-web-landers skill)
// Supports 4 High-Converting Archetypes (Matrix, Split-Video, Voucher, Comparison) & 4 Palette Themes (Emerald, Cyan, Gold, Sunset)

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const THEMES = {
  emerald: {
    name: 'Emerald Matrix',
    primary: '#10b981',
    primaryClass: 'text-emerald-400',
    primaryBgClass: 'bg-emerald-500/20',
    primaryBorderClass: 'border-emerald-500/30',
    gradientText: 'from-emerald-400 via-teal-200 to-indigo-400',
    ctaGradient: 'linear-gradient(135deg, #10b981 0%, #059669 45%, #4f46e5 100%)',
    ctaGlow: 'rgba(16, 185, 129, 0.55)',
    orb1: 'bg-emerald-500/15',
    orb2: 'bg-indigo-500/15',
    badgeText: 'text-emerald-300',
    accentRing: 'focus:border-emerald-400',
    selectionBg: 'selection:bg-emerald-500'
  },
  cyan: {
    name: 'Cyber Cyan AI',
    primary: '#06b6d4',
    primaryClass: 'text-cyan-400',
    primaryBgClass: 'bg-cyan-500/20',
    primaryBorderClass: 'border-cyan-500/30',
    gradientText: 'from-cyan-400 via-sky-200 to-violet-400',
    ctaGradient: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 45%, #7c3aed 100%)',
    ctaGlow: 'rgba(6, 182, 212, 0.55)',
    orb1: 'bg-cyan-500/15',
    orb2: 'bg-violet-500/15',
    badgeText: 'text-cyan-300',
    accentRing: 'focus:border-cyan-400',
    selectionBg: 'selection:bg-cyan-500'
  },
  gold: {
    name: 'Sovereign Gold',
    primary: '#f59e0b',
    primaryClass: 'text-amber-400',
    primaryBgClass: 'bg-amber-500/20',
    primaryBorderClass: 'border-amber-500/30',
    gradientText: 'from-amber-300 via-yellow-100 to-amber-500',
    ctaGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 45%, #b45309 100%)',
    ctaGlow: 'rgba(245, 158, 11, 0.55)',
    orb1: 'bg-amber-500/15',
    orb2: 'bg-orange-500/15',
    badgeText: 'text-amber-300',
    accentRing: 'focus:border-amber-400',
    selectionBg: 'selection:bg-amber-500'
  },
  sunset: {
    name: 'Neon Sunset Viral',
    primary: '#f43f5e',
    primaryClass: 'text-rose-400',
    primaryBgClass: 'bg-rose-500/20',
    primaryBorderClass: 'border-rose-500/30',
    gradientText: 'from-rose-400 via-pink-200 to-fuchsia-400',
    ctaGradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 45%, #c026d3 100%)',
    ctaGlow: 'rgba(244, 63, 94, 0.55)',
    orb1: 'bg-rose-500/15',
    orb2: 'bg-fuchsia-500/15',
    badgeText: 'text-rose-300',
    accentRing: 'focus:border-rose-400',
    selectionBg: 'selection:bg-rose-500'
  }
};

function renderOfferLander(offer) {
  const archetype = offer.landerArchetype || 'matrix';
  const themeKey = (offer.landerTheme || 'emerald').toLowerCase();
  const theme = THEMES[themeKey] || THEMES.emerald;

  const steps = offer.steps && offer.steps.length === 3 ? offer.steps : [
    { title: 'Instant Free Access', desc: 'Unlock your free account and partner dashboard in under 4 minutes.' },
    { title: 'Plug In Your Primary Link', desc: 'Apply the proven framework directly to your existing offer or affiliate project.' },
    { title: 'Scale Traffic & Leads Automatically', desc: 'Turn every visitor into compounding viral reach and automated email subscribers.' }
  ];

  // Try to find video: 1) explicit offer.videoUrl, 2) local Remotion commercial, 3) viralForgeJob
  let videoPreviewUrl = offer.videoUrl || null;
  if (!videoPreviewUrl) {
    const candidateFiles = [
      `/videos/${offer.slug}-commercial.mp4`,
      `/videos/${offer.slug.replace(/-/g, '')}-commercial.mp4`,
      `/videos/yusleep-commercial.mp4`
    ];
    for (const c of candidateFiles) {
      if (fs.existsSync(path.join(__dirname, 'public', c))) {
        videoPreviewUrl = c;
        break;
      }
    }
  }
  if (!videoPreviewUrl && offer.viralForgeJob?.videos) {
    const vids = Object.values(offer.viralForgeJob.videos);
    const completedVid = vids.find((v) => v.videoUrl);
    if (completedVid) videoPreviewUrl = completedVid.videoUrl;
  }

  // Base head styles common to all archetypes
  const headStyles = `
    :root {
      --bg-deep: #05060a;
      --glass-bg: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
      --glass-border: rgba(255, 255, 255, 0.11);
      --glass-specular: inset 0 1px 0 0 rgba(255, 255, 255, 0.22);
      --theme-primary: ${theme.primary};
      --cta-gradient: ${theme.ctaGradient};
      --cta-glow: ${theme.ctaGlow};
    }
    body {
      background-color: var(--bg-deep);
      color: #f8fafc;
      font-family: 'Inter', sans-serif;
      overflow-x: hidden;
    }
    h1, h2, h3, .font-display {
      font-family: 'Plus Jakarta Sans', sans-serif;
      letter-spacing: -0.03em;
    }
    .font-mono-code { font-family: 'JetBrains Mono', monospace; }
    .perspective-stage { perspective: 1200px; }
    .cyber-grid {
      background-size: 48px 48px;
      background-image: 
        linear-gradient(to right, rgba(255, 255, 255, 0.035) 1px, transparent 1px),
        linear-gradient(to bottom, rgba(255, 255, 255, 0.035) 1px, transparent 1px);
      mask-image: radial-gradient(ellipse 80% 60% at 50% 25%, #000 40%, transparent 100%);
      -webkit-mask-image: radial-gradient(ellipse 80% 60% at 50% 25%, #000 40%, transparent 100%);
    }
    .glass-surface {
      background: var(--glass-bg);
      backdrop-filter: blur(20px) saturate(160%);
      -webkit-backdrop-filter: blur(20px) saturate(160%);
      border: 1px solid var(--glass-border);
      box-shadow: var(--glass-specular), 0 24px 48px -12px rgba(0, 0, 0, 0.65);
    }
    .glass-pill {
      background: linear-gradient(135deg, rgba(255, 255, 255, 0.1) 0%, rgba(255, 255, 255, 0.03) 100%);
      backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.14);
      box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.25);
    }
    .icon-3d-pedestal {
      width: 56px;
      height: 56px;
      border-radius: 16px;
      display: flex;
      align-items: center;
      justify-content: center;
      background: radial-gradient(circle at 30% 25%, rgba(255, 255, 255, 0.28), rgba(255, 255, 255, 0.03) 65%),
                  linear-gradient(145deg, rgba(255, 255, 255, 0.12), rgba(0, 0, 0, 0.4));
      border: 1px solid rgba(255, 255, 255, 0.22);
      box-shadow: inset 0 2px 3px rgba(255, 255, 255, 0.35), 0 14px 24px -6px var(--cta-glow);
    }
    .cta-beam {
      position: relative;
      overflow: hidden;
      background: var(--cta-gradient);
      box-shadow: 0 0 35px -5px var(--cta-glow), inset 0 1px 0 0 rgba(255, 255, 255, 0.4);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .cta-beam:hover {
      transform: translateY(-2px) scale(1.01);
      box-shadow: 0 0 48px -2px var(--cta-glow), inset 0 1px 0 0 rgba(255, 255, 255, 0.55);
    }
    .cta-beam::after {
      content: "";
      position: absolute;
      top: -50%;
      left: -60%;
      width: 35%;
      height: 200%;
      background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.38), transparent);
      transform: rotate(25deg);
      animation: shimmerSweep 3.2s infinite;
    }
    @keyframes shimmerSweep {
      0% { left: -60%; }
      40%, 100% { left: 140%; }
    }
    .tilt-card {
      transform-style: preserve-3d;
      transition: transform 0.18s ease-out, border-color 0.25s ease;
    }
    .tilt-card:hover { border-color: var(--theme-primary); }
    .pulse-glow {
      box-shadow: 0 0 25px 2px var(--cta-glow);
      animation: pulseGlow 2.5s infinite alternate;
    }
    @keyframes pulseGlow {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(1.02); opacity: 1; }
    }
  `;

  // Render hero & body depending on archetype
  let mainContentHtml = '';

  if (archetype === 'split-video') {
    // ARCHETYPE 2: SPLIT-SCREEN HERO WITH 9:16 SMARTPHONE VIDEO MOCKUP
    mainContentHtml = `
      <main class="relative z-10 pt-28 pb-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div class="grid lg:grid-cols-12 gap-10 items-center">
          <!-- Left Column (7 cols): High-Impact Copy & Instant Form -->
          <div class="lg:col-span-7 space-y-6 text-left">
            <div class="inline-flex items-center gap-2.5 glass-pill px-4 py-1.5 rounded-full text-xs font-medium text-slate-200">
              <span class="px-2 py-0.5 rounded-full ${theme.primaryBgClass} ${theme.badgeText} font-mono-code text-[11px]">EXCLUSIVE PREVIEW</span>
              <span>${escapeHtml(offer.eyebrow || 'Verified Partner Giveaway')}</span>
            </div>

            <h1 class="text-4xl sm:text-5xl lg:text-6xl font-extrabold leading-[1.08] tracking-tight text-white">
              ${escapeHtml(offer.headlinePrefix || '')}
              <span class="text-transparent bg-clip-text bg-gradient-to-r ${theme.gradientText}">
                ${escapeHtml(offer.headlineGradient || offer.name)}
              </span>
              ${escapeHtml(offer.headlineSuffix || '')}
            </h1>

            <p class="text-base sm:text-lg text-slate-300 leading-relaxed max-w-xl">
              ${escapeHtml(offer.subheadline || '')}
            </p>

            <div id="claim-box" class="glass-surface rounded-2xl p-4 sm:p-5 border ${theme.primaryBorderClass}">
              <form id="giveawayForm" class="flex flex-col sm:flex-row gap-3">
                <input
                  type="email"
                  id="leadEmail"
                  required
                  placeholder="Enter your email for instant unlock..."
                  class="flex-1 h-13 px-4 py-3.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white placeholder-slate-400 focus:outline-none ${theme.accentRing}"
                />
                <button
                  type="submit"
                  class="cta-beam px-6 py-3.5 rounded-xl font-display font-bold text-sm text-white flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
                >
                  <span>${escapeHtml(offer.ctaButtonText || 'Unlock Free Access')}</span>
                  <span>→</span>
                </button>
              </form>
              <div class="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-400">
                <span class="flex items-center gap-1.5"><span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span> 100% Free Instant Access</span>
                <span>✓ 4-Minute Guided Setup</span>
              </div>
            </div>

            <!-- Trust Pills Bar -->
            <div class="flex flex-wrap items-center gap-3 pt-2 text-xs text-slate-300">
              <div class="glass-pill px-3 py-1.5 rounded-xl flex items-center gap-2">
                <span class="${theme.primaryClass} font-bold">⚡ 1-Click</span> No Credit Card Required
              </div>
              <div class="glass-pill px-3 py-1.5 rounded-xl flex items-center gap-2">
                <span class="${theme.primaryClass} font-bold">🎯 Turnkey</span> Ready to Scale
              </div>
            </div>
          </div>

          <!-- Right Column (5 cols): 9:16 Smartphone Mockup with Video Preview -->
          <div class="lg:col-span-5 flex justify-center perspective-stage">
            <div data-tilt-card class="tilt-card w-[290px] sm:w-[320px] rounded-[42px] p-3.5 bg-gradient-to-b from-white/20 via-white/5 to-white/10 border border-white/20 shadow-2xl relative">
              <!-- Phone Bezel / Screen -->
              <div class="w-full aspect-[9/16] rounded-[34px] overflow-hidden bg-black/90 relative flex flex-col justify-between p-4 border border-white/10 shadow-inner">
                <!-- Top Notch & Live Indicator -->
                <div class="flex items-center justify-between z-20">
                  <span class="text-[10px] font-mono-code px-2 py-0.5 rounded-full bg-red-500/20 text-red-300 border border-red-500/30 flex items-center gap-1">
                    <span class="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse"></span> PREVIEW
                  </span>
                  <span class="text-[10px] font-mono-code text-slate-400">9:16 Short</span>
                </div>

                ${
                  videoPreviewUrl
                    ? `
                <video id="heroPreviewVideo" autoplay loop muted playsinline class="absolute inset-0 w-full h-full object-cover z-0">
                  <source src="${escapeHtml(videoPreviewUrl)}" type="video/mp4" />
                </video>
                <button type="button" onclick="const v=document.getElementById('heroPreviewVideo'); if(v){ v.muted=!v.muted; this.querySelector('span').textContent=v.muted?'🔇 Unmute':'🔊 Sound On'; }" class="absolute top-10 right-3 z-30 px-2.5 py-1 rounded-full bg-black/70 hover:bg-black/90 backdrop-blur-md border border-white/20 text-[10px] font-mono-code text-white flex items-center gap-1 cursor-pointer transition shadow-lg">
                  <span>🔇 Unmute</span>
                </button>
                <div class="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/30 z-10 pointer-events-none"></div>
                `
                    : `
                <!-- Animated Fallback Wave Mockup -->
                <div class="absolute inset-0 flex flex-col items-center justify-center gap-3 p-6 text-center z-0">
                  <div class="w-16 h-16 rounded-full bg-gradient-to-tr ${theme.gradientText} flex items-center justify-center pulse-glow shadow-lg cursor-pointer">
                    <svg class="w-7 h-7 text-white ml-1" fill="currentColor" viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>
                  </div>
                  <div class="space-y-1">
                    <div class="text-xs font-bold text-white">${escapeHtml(offer.name)}</div>
                    <div class="text-[10px] text-slate-400">Viral Short-Form Teaser</div>
                  </div>
                  <div class="flex items-end gap-1 h-6">
                    <span class="w-1 bg-white/40 rounded-full h-2 animate-bounce"></span>
                    <span class="w-1 bg-white/70 rounded-full h-5 animate-bounce [animation-delay:0.15s]"></span>
                    <span class="w-1 bg-white rounded-full h-3 animate-bounce [animation-delay:0.3s]"></span>
                    <span class="w-1 bg-white/60 rounded-full h-6 animate-bounce [animation-delay:0.45s]"></span>
                    <span class="w-1 bg-white/40 rounded-full h-2 animate-bounce [animation-delay:0.2s]"></span>
                  </div>
                </div>
                `
                }

                <!-- Bottom On-Screen Teaser Overlay -->
                <div class="relative z-20 space-y-2">
                  <div class="p-2.5 rounded-xl bg-black/60 backdrop-blur-md border border-white/10 text-[11px] text-white">
                    <span class="${theme.primaryClass} font-bold">👉 Link in Bio:</span> Claim your free access before doors close!
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- 3-Step Feature Grid -->
        <section class="mt-20 grid md:grid-cols-3 gap-6 perspective-stage">
          ${steps
            .map(
              (s, idx) => `
          <div data-tilt-card class="tilt-card glass-surface rounded-3xl p-7 space-y-4">
            <div class="icon-3d-pedestal">
              <span class="font-mono-code font-bold ${theme.primaryClass} text-lg">0${idx + 1}</span>
            </div>
            <div class="text-xs font-mono-code ${theme.primaryClass}">PHASE 0${idx + 1}</div>
            <h3 class="text-xl font-bold text-white">${escapeHtml(s.title)}</h3>
            <p class="text-sm text-slate-300 leading-relaxed">${escapeHtml(s.desc)}</p>
          </div>`
            )
            .join('')}
        </section>
      </main>
    `;
  } else if (archetype === 'voucher') {
    // ARCHETYPE 3: GAMIFIED ACCESS VOUCHER / VIRTUAL KEY GENERATOR
    mainContentHtml = `
      <main class="relative z-10 pt-28 pb-20 px-4 sm:px-6 max-w-4xl mx-auto text-center space-y-8">
        <!-- Progress Scarcity Bar -->
        <div class="glass-surface rounded-2xl p-3.5 max-w-lg mx-auto border ${theme.primaryBorderClass} space-y-2">
          <div class="flex items-center justify-between text-xs">
            <span class="font-mono-code ${theme.primaryClass} font-semibold flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              STEP 1 OF 2 • ALLOCATION RESERVED
            </span>
            <span class="font-mono-code text-slate-400" id="countdownTimer">Expires in 04:59</span>
          </div>
          <div class="w-full h-2 rounded-full bg-white/10 overflow-hidden">
            <div class="h-full rounded-full bg-gradient-to-r ${theme.gradientText} w-[88%] transition-all duration-500"></div>
          </div>
        </div>

        <div class="space-y-4">
          <h1 class="text-4xl sm:text-6xl font-extrabold leading-[1.07] tracking-tight text-white">
            ${escapeHtml(offer.headlinePrefix || 'Claim Your')}
            <span class="text-transparent bg-clip-text bg-gradient-to-r ${theme.gradientText}">
              ${escapeHtml(offer.headlineGradient || offer.name)}
            </span>
            ${escapeHtml(offer.headlineSuffix || 'Access Key')}
          </h1>
          <p class="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            ${escapeHtml(offer.subheadline || 'Enter your email below to generate your direct registration key and bypass the public waiting queue.')}
          </p>
        </div>

        <!-- The Interactive Access Voucher Card -->
        <div data-tilt-card class="tilt-card glass-surface rounded-3xl p-6 sm:p-8 max-w-xl mx-auto border ${theme.primaryBorderClass} text-left relative overflow-hidden space-y-6">
          <div class="flex items-center justify-between border-b border-white/10 pb-4">
            <div>
              <div class="text-[10px] font-mono-code uppercase text-slate-400">DIGITAL ACCESS VOUCHER</div>
              <div class="text-lg font-bold text-white">${escapeHtml(offer.name)}</div>
            </div>
            <span class="px-2.5 py-1 rounded-full text-[11px] font-mono-code bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
              100% UNLOCKED
            </span>
          </div>

          <div class="p-4 rounded-2xl bg-black/60 border border-dashed border-white/20 flex items-center justify-between">
            <div>
              <div class="text-[10px] font-mono-code text-slate-400 uppercase">OFFICIAL ACCESS KEY:</div>
              <div class="font-mono-code font-bold text-base sm:text-lg text-white tracking-widest" id="voucherKeyDisplay">VTM-8X-••••-2026</div>
            </div>
            <span class="text-[11px] font-mono-code ${theme.primaryClass}">[RESERVED]</span>
          </div>

          <form id="giveawayForm" class="space-y-3">
            <input
              type="email"
              id="leadEmail"
              required
              placeholder="Enter your email to reveal full voucher key..."
              class="w-full h-13 px-4 py-3.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white placeholder-slate-400 focus:outline-none ${theme.accentRing}"
            />
            <button
              type="submit"
              class="cta-beam w-full py-4 px-6 rounded-xl font-display font-bold text-sm text-white flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>${escapeHtml(offer.ctaButtonText || 'Reveal Key & Unlock Free Access')}</span>
              <span>→</span>
            </button>
          </form>

          <div class="flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>✓ Zero payment info required</span>
            <span>✓ Instant activation</span>
          </div>
        </div>

        <!-- Recent Activity Social Proof Ticker -->
        <div class="max-w-md mx-auto p-3 rounded-full glass-pill flex items-center justify-center gap-2 text-xs text-slate-300">
          <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span id="recentActivityText">Marcus T. from California just unlocked their free access key (2 mins ago)</span>
        </div>
      </main>
    `;
  } else if (archetype === 'comparison') {
    // ARCHETYPE 4: CONTRARIAN "OLD WAY VS NEW WAY" BENTO GRID
    mainContentHtml = `
      <main class="relative z-10 pt-28 pb-20 px-4 sm:px-6 max-w-5xl mx-auto space-y-12">
        <div class="text-center max-w-3xl mx-auto space-y-4">
          <div class="inline-flex items-center gap-2.5 glass-pill px-4 py-1.5 rounded-full text-xs font-medium text-slate-200">
            <span class="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 font-mono-code text-[11px]">CONTRARIAN BLUEPRINT</span>
            <span>${escapeHtml(offer.eyebrow || 'Stop Wasting Time On Outdated Methods')}</span>
          </div>

          <h1 class="text-4xl sm:text-6xl font-extrabold leading-[1.07] tracking-tight text-white">
            ${escapeHtml(offer.headlinePrefix || 'Why Traditional Traffic Fails & How')}
            <span class="text-transparent bg-clip-text bg-gradient-to-r ${theme.gradientText}">
              ${escapeHtml(offer.headlineGradient || offer.name)}
            </span>
            ${escapeHtml(offer.headlineSuffix || 'Solves It.')}
          </h1>

          <p class="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            ${escapeHtml(offer.subheadline || 'Compare the expensive, manual hamster wheel to an automated 8-tier viral distribution engine.')}
          </p>
        </div>

        <!-- Comparison Bento Grid (Old vs New) -->
        <div class="grid md:grid-cols-2 gap-6 perspective-stage">
          <!-- The Painful Old Way -->
          <div class="glass-surface rounded-3xl p-6 sm:p-8 border border-rose-500/20 space-y-5 bg-gradient-to-b from-rose-950/20 to-black/40">
            <div class="flex items-center justify-between">
              <span class="px-3 py-1 rounded-full text-xs font-mono-code bg-rose-500/20 text-rose-300 border border-rose-500/30">
                ❌ THE SLOW, PAINFUL ROUTE
              </span>
              <span class="text-xs text-slate-400">Outdated Marketing</span>
            </div>
            <ul class="space-y-3.5 text-sm text-slate-300">
              <li class="flex items-start gap-3">
                <span class="text-rose-400 font-bold">✕</span>
                <span>Paying $50–$200 for low-quality solo ads with bot clicks</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-rose-400 font-bold">✕</span>
                <span>Cold messaging strangers in social media DMs for hours</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-rose-400 font-bold">✕</span>
                <span>Posting affiliate links that get banned or receive 0 clicks</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="text-rose-400 font-bold">✕</span>
                <span>Building zero email list assets for long-term compounding</span>
              </li>
            </ul>
          </div>

          <!-- The Automated New Way -->
          <div class="glass-surface rounded-3xl p-6 sm:p-8 border ${theme.primaryBorderClass} space-y-5 bg-gradient-to-b from-emerald-950/20 to-black/40 shadow-xl shadow-emerald-950/30">
            <div class="flex items-center justify-between">
              <span class="px-3 py-1 rounded-full text-xs font-mono-code ${theme.primaryBgClass} ${theme.badgeText} border ${theme.primaryBorderClass}">
                ✓ THE ${escapeHtml(offer.name).toUpperCase()} SYSTEM
              </span>
              <span class="text-xs ${theme.primaryClass} font-semibold">100% Free &amp; Automated</span>
            </div>
            <ul class="space-y-3.5 text-sm text-slate-200">
              <li class="flex items-start gap-3">
                <span class="${theme.primaryClass} font-bold">✓</span>
                <span><strong>100% Free Setup</strong> — Activate your account in under 4 minutes</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="${theme.primaryClass} font-bold">✓</span>
                <span><strong>8-Tier Compounding</strong> — 1 click multiplies into 8+ exposure nodes</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="${theme.primaryClass} font-bold">✓</span>
                <span><strong>Turnkey Built-In Capture Pages</strong> — No hosting or coding needed</span>
              </li>
              <li class="flex items-start gap-3">
                <span class="${theme.primaryClass} font-bold">✓</span>
                <span><strong>Automated Follow-Up Drip</strong> — Turns leads into repeat buyers</span>
              </li>
            </ul>
          </div>
        </div>

        <!-- Inline Claim Form -->
        <div id="claim-box" class="glass-surface rounded-3xl p-6 sm:p-8 max-w-xl mx-auto border ${theme.primaryBorderClass} space-y-4">
          <div class="text-center space-y-1">
            <h3 class="text-xl font-bold text-white">Ready to Switch to the Automated Way?</h3>
            <p class="text-xs text-slate-300">Enter your email to claim your free turnkey access now:</p>
          </div>
          <form id="giveawayForm" class="flex flex-col sm:flex-row gap-3">
            <input
              type="email"
              id="leadEmail"
              required
              placeholder="Enter your best email address..."
              class="flex-1 h-13 px-4 py-3.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white placeholder-slate-400 focus:outline-none ${theme.accentRing}"
            />
            <button
              type="submit"
              class="cta-beam px-6 py-3.5 rounded-xl font-display font-bold text-sm text-white flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
            >
              <span>${escapeHtml(offer.ctaButtonText || 'Get Free Access')}</span>
              <span>→</span>
            </button>
          </form>
          <div class="flex items-center justify-between text-[11px] text-slate-400 px-1">
            <span>✓ No hidden costs</span>
            <span>✓ Instant access link</span>
          </div>
        </div>
      </main>
    `;
  } else if (archetype === 'glp-hybrid') {
    // ARCHETYPE 5: YU SLEEP OFFICIAL GUIDED LANDING PAGE (GLP) & HYBRID VSL
    mainContentHtml = `
      <main class="relative z-10 pt-28 pb-20 px-4 sm:px-6 max-w-5xl mx-auto space-y-16">
        
        <!-- GLP Hero Section -->
        <div class="text-center max-w-4xl mx-auto space-y-6">
          <div class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-purple-900/40 border border-purple-500/40 text-xs font-bold text-purple-200">
            <span class="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span>VIDEO REVEALS: CLINICAL 30-SECOND TART CHERRY TRICK</span>
          </div>

          <h1 class="text-3xl sm:text-5xl lg:text-6xl font-black leading-[1.12] tracking-tight text-white">
            Video Reveals: <span class="text-emerald-400">30-Second Cherry Trick</span> That <span class="text-emerald-400">STOPS 3 AM Wakeups</span> & Restores Deep, Restful Sleep
          </h1>

          <p class="text-lg sm:text-xl text-slate-200 font-medium max-w-2xl mx-auto">
            Most people sleep 6–7 hours straight <span class="text-emerald-400 font-bold">the very first night</span> they try it.
          </p>
        </div>

        <!-- High-Impact 16:9 Video Player Arena -->
        <div class="max-w-3xl mx-auto rounded-3xl overflow-hidden bg-black/90 border-2 border-purple-500/40 shadow-2xl shadow-purple-900/30 relative">
          <div class="relative w-full aspect-video bg-black flex items-center justify-center">
            <video id="glpVideoPlayer" autoplay loop muted playsinline class="w-full h-full object-cover">
              <source src="/videos/yusleep-commercial.mp4" type="video/mp4" />
            </video>
            
            <!-- Sound / Unmute Overlay Pill -->
            <button
              type="button"
              onclick="const v=document.getElementById('glpVideoPlayer'); if(v){ v.muted=!v.muted; this.querySelector('span').textContent=v.muted?'🔇 Tap for Sound':'🔊 Playing Sound'; }"
              class="absolute top-4 right-4 z-30 px-3.5 py-1.5 rounded-full bg-black/80 hover:bg-black/95 backdrop-blur-md border border-white/20 text-xs font-mono-code text-white flex items-center gap-1.5 cursor-pointer transition shadow-xl"
            >
              <span>🔇 Tap for Sound</span>
            </button>
          </div>
          <div class="p-4 bg-gradient-to-r from-purple-950/80 via-slate-900/80 to-purple-950/80 border-t border-white/10 flex flex-wrap items-center justify-between text-xs text-slate-300 gap-2">
            <span class="flex items-center gap-2"><span class="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span> Live Broadcast • Doctor Recommended Formula</span>
            <span class="font-bold text-emerald-400">⭐ 4.9/5 (36,000+ Verified Reviews)</span>
          </div>
        </div>

        <!-- HYBRID VIP LEAD MAGNET: INSTANT $10 COUPON + SLEEP GUIDE -->
        <div id="claim-box" class="max-w-3xl mx-auto rounded-3xl p-6 sm:p-8 bg-gradient-to-br from-purple-900/30 via-slate-900/50 to-emerald-950/30 border border-emerald-500/40 shadow-xl space-y-4">
          <div class="text-center space-y-1">
            <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold font-mono-code">
              🎁 VIP DISCOUNT CODE UNLOCK
            </div>
            <h3 class="text-xl sm:text-2xl font-bold text-white">Claim An Instant Extra $10 OFF + Free Sleep Guide</h3>
            <p class="text-xs sm:text-sm text-slate-300">Enter your email below to unlock your direct checkout coupon code & Dr. Collins' 7-Day Sleep Checklist:</p>
          </div>
          
          <form id="giveawayForm" class="flex flex-col sm:flex-row gap-3 pt-2">
            <input
              type="email"
              id="leadEmail"
              required
              placeholder="Enter your email for instant $10 coupon..."
              class="flex-1 h-13 px-4 py-3.5 rounded-xl bg-black/60 border border-white/15 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
            />
            <button
              type="submit"
              class="px-6 py-3.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 shadow-lg shadow-emerald-500/30 flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer transition"
            >
              <span>Unlock $10 Coupon</span>
              <span>→</span>
            </button>
          </form>

          <!-- Hidden Coupon Reveal after opt-in -->
          <div id="couponRevealed" class="hidden p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-center text-xs text-emerald-200 space-y-1">
            <div>🎉 <strong>Coupon Active:</strong> Use code <code class="px-2 py-0.5 rounded bg-black/50 text-emerald-400 font-mono-code font-bold">YUSLEEP10</code> at checkout for extra savings!</div>
            <div class="text-[11px] text-slate-300">Check your inbox for Dr. Collins' 7-Day Deep Sleep Blueprint.</div>
          </div>
        </div>

        <!-- 3-TIER PRICING TABLE (DIRECT CLICKBANK HOPLINKS) -->
        <div class="space-y-8">
          <div class="text-center space-y-2">
            <div class="text-xs font-bold text-purple-300 uppercase tracking-widest font-mono-code">OFFICIAL PACKAGES & SPECIAL DISCOUNTS</div>
            <h2 class="text-3xl sm:text-4xl font-extrabold text-white">Choose Your Yu Sleep Package Below</h2>
            <p class="text-sm text-slate-300">100% Risk-Free 60-Day "Sleep Like A Baby" Money-Back Guarantee</p>
          </div>

          <div class="grid md:grid-cols-3 gap-6 items-stretch">
            
            <!-- TIER 1: 1 MONTH SUPPLY -->
            <div class="rounded-3xl p-6 bg-slate-900/60 border border-white/10 flex flex-col justify-between space-y-6 hover:border-purple-500/40 transition">
              <div class="space-y-4 text-center">
                <div class="text-xs font-bold text-slate-400 uppercase font-mono-code">SAMPLE PACKAGE</div>
                <h3 class="text-2xl font-bold text-white">1 MONTH SUPPLY</h3>
                <div class="text-xs font-bold text-emerald-400">30% OFF • SAVE $30</div>
                
                <div class="py-4 border-y border-white/10">
                  <div class="text-4xl font-black text-white">$69<span class="text-base text-slate-400 font-normal"> / bottle</span></div>
                  <div class="text-xs text-slate-400 line-through mt-1">Regular Price: $99</div>
                </div>

                <ul class="text-xs text-slate-300 space-y-2.5 text-left">
                  <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> 1 Bottle (30 Day Supply)</li>
                  <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> Natural Tart Cherry Formula</li>
                  <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> 60-Day Money-Back Guarantee</li>
                  <li class="flex items-center gap-2 text-slate-500"><span class="text-slate-600">✕</span> Free Shipping</li>
                  <li class="flex items-center gap-2 text-slate-500"><span class="text-slate-600">✕</span> Dr. Collins Bonuses</li>
                </ul>
              </div>

              <a
                href="https://yusleep.pay.clickbank.net/?cbitems=1&template=1yun&exitoffer=exy1&cbfid=63843&vtid=glp&affiliate=kmtwarrior"
                target="_blank"
                class="w-full py-4 rounded-xl font-bold text-sm text-center text-white bg-slate-800 hover:bg-slate-700 border border-white/20 transition shadow-md block"
              >
                Buy 1 Bottle ($69) →
              </a>
            </div>

            <!-- TIER 2: 6 MONTH SUPPLY (CENTER / BEST VALUE / MOST POPULAR) -->
            <div class="rounded-3xl p-7 bg-gradient-to-b from-purple-950/80 via-slate-900/90 to-purple-950/80 border-2 border-emerald-400 shadow-2xl shadow-emerald-500/20 flex flex-col justify-between space-y-6 relative transform md:-translate-y-3">
              
              <!-- Ribbon Badge -->
              <div class="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 rounded-full bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 font-black text-xs uppercase tracking-wider shadow-lg">
                👑 MOST POPULAR • BEST VALUE
              </div>

              <div class="space-y-4 text-center pt-2">
                <div class="text-xs font-bold text-emerald-400 uppercase font-mono-code">TOTAL SLEEP OVERHAUL</div>
                <h3 class="text-3xl font-black text-white">6 MONTH SUPPLY</h3>
                <div class="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-extrabold">
                  60% OFF • SAVE $360
                </div>

                <div class="py-4 border-y border-purple-500/30">
                  <div class="text-5xl font-black text-white">$39<span class="text-lg text-emerald-400 font-bold"> / bottle</span></div>
                  <div class="text-xs text-slate-400 line-through mt-1">Regular Price: $594</div>
                  <div class="text-xs text-emerald-300 font-bold mt-1">Total: $234 (Only $1.30/Night)</div>
                </div>

                <ul class="text-xs text-slate-200 space-y-2.5 text-left font-medium">
                  <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> <strong>6 Bottles</strong> (180 Day Supply)</li>
                  <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> <strong>FREE US Shipping</strong> Included</li>
                  <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> <strong>2 Free Dr. Collins Bonuses ($150 Value)</strong></li>
                  <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> Deep REM Circadian Reset</li>
                  <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> 60-Day 100% Money-Back Guarantee</li>
                </ul>
              </div>

              <a
                href="https://yusleep.pay.clickbank.net/?cbitems=3&template=6yun&exitoffer=exy1&cbfid=63843&vtid=glp&affiliate=kmtwarrior"
                target="_blank"
                class="w-full py-4 rounded-xl font-black text-base text-center text-slate-950 bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-400 hover:from-emerald-300 hover:to-teal-200 transition shadow-xl shadow-emerald-500/30 block animate-pulse"
              >
                Claim 6 Months ($39/ea) →
              </a>
            </div>

            <!-- TIER 3: 3 MONTH SUPPLY -->
            <div class="rounded-3xl p-6 bg-slate-900/60 border border-white/10 flex flex-col justify-between space-y-6 hover:border-purple-500/40 transition">
              <div class="space-y-4 text-center">
                <div class="text-xs font-bold text-slate-400 uppercase font-mono-code">POPULAR PACKAGE</div>
                <h3 class="text-2xl font-bold text-white">3 MONTH SUPPLY</h3>
                <div class="text-xs font-bold text-emerald-400">40% OFF • SAVE $120</div>

                <div class="py-4 border-y border-white/10">
                  <div class="text-4xl font-black text-white">$59<span class="text-base text-slate-400 font-normal"> / bottle</span></div>
                  <div class="text-xs text-slate-400 line-through mt-1">Regular Price: $297</div>
                </div>

                <ul class="text-xs text-slate-300 space-y-2.5 text-left">
                  <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> 3 Bottles (90 Day Supply)</li>
                  <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> <strong>2 Free Dr. Collins Bonuses</strong></li>
                  <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> Calms Night Cortisol Spikes</li>
                  <li class="flex items-center gap-2"><span class="text-emerald-400 font-bold">✓</span> 60-Day Money-Back Guarantee</li>
                  <li class="flex items-center gap-2 text-slate-500"><span class="text-slate-600">✕</span> Free Shipping</li>
                </ul>
              </div>

              <a
                href="https://yusleep.pay.clickbank.net/?cbitems=2&template=3yun&exitoffer=exy1&cbfid=63843&vtid=glp&affiliate=kmtwarrior"
                target="_blank"
                class="w-full py-4 rounded-xl font-bold text-sm text-center text-white bg-purple-900/80 hover:bg-purple-800 border border-purple-500/30 transition shadow-md block"
              >
                Buy 3 Bottles ($59/ea) →
              </a>
            </div>

          </div>
        </div>

        <!-- DR. COLLINS 2 FREE BONUSES ($150 VALUE) -->
        <div class="rounded-3xl p-8 bg-purple-950/40 border border-purple-500/30 space-y-8">
          <div class="text-center space-y-2">
            <span class="text-xs font-bold text-emerald-400 font-mono-code uppercase">INCLUDED 100% FREE WITH 3 & 6 MONTH PACKAGES</span>
            <h2 class="text-2xl sm:text-3xl font-extrabold text-white">Get Dr. Collins' Amazing Bonuses ($150 Value Free)</h2>
          </div>

          <div class="grid md:grid-cols-2 gap-6">
            <div class="p-6 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <div class="text-2xl font-bold text-purple-300">📖 Bonus #1: 11 Soothing Bedtime Stories</div>
              <div class="text-xs font-mono-code text-emerald-400 font-bold">$79 VALUE • FREE TODAY</div>
              <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Soothing narrations specifically written to quiet racing thoughts and ease your nervous system into restorative stage-4 sleep. Just press play, close your eyes, and let the stress of the day fade away.
              </p>
            </div>

            <div class="p-6 rounded-2xl bg-black/40 border border-white/10 space-y-3">
              <div class="text-2xl font-bold text-purple-300">🧠 Bonus #2: Younger & Happier While You Sleep</div>
              <div class="text-xs font-mono-code text-emerald-400 font-bold">$79 VALUE • FREE TODAY</div>
              <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Science-backed nightly rituals that reprogram your subconscious mind while resting. Gently releases emotional tension, balances morning hormones, and helps you wake up refreshed and smiling.
              </p>
            </div>
          </div>
        </div>

        <!-- THE 10-INGREDIENT NANO-SYNERGY SCIENCE -->
        <div class="space-y-6">
          <div class="text-center space-y-2">
            <div class="text-xs font-bold text-emerald-400 font-mono-code uppercase">CLINICALLY STUDIED INGREDIENTS</div>
            <h2 class="text-2xl sm:text-3xl font-extrabold text-white">Inside Each Serving of Yu Sleep</h2>
            <p class="text-xs sm:text-sm text-slate-300 max-w-xl mx-auto">Non-GMO • Gluten-Free • Doctor Formulated • Zero Habit-Forming Additives</p>
          </div>

          <div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div class="p-5 rounded-2xl bg-slate-900/50 border border-white/10 space-y-2">
              <div class="text-base font-bold text-emerald-400">🍒 Montmorency Tart Cherry</div>
              <p class="text-xs text-slate-300 leading-relaxed">Rich in natural phytomelatonin. Clinically proven to regulate your sleep-wake cycle and extend total restorative sleep time without morning grogginess.</p>
            </div>

            <div class="p-5 rounded-2xl bg-slate-900/50 border border-white/10 space-y-2">
              <div class="text-base font-bold text-emerald-400">🛡️ GABA (Cortisol Reducer)</div>
              <p class="text-xs text-slate-300 leading-relaxed">Known as nature's gentle sedative. Lowers nighttime cortisol spikes that jolt you awake at 3 AM with racing thoughts.</p>
            </div>

            <div class="p-5 rounded-2xl bg-slate-900/50 border border-white/10 space-y-2">
              <div class="text-base font-bold text-emerald-400">✨ 5-HTP (Serotonin Precursor)</div>
              <p class="text-xs text-slate-300 leading-relaxed">Crosses the blood-brain barrier to produce serotonin, elevating mood, reducing nighttime anxiety, and supporting deep REM sleep.</p>
            </div>

            <div class="p-5 rounded-2xl bg-slate-900/50 border border-white/10 space-y-2">
              <div class="text-base font-bold text-emerald-400">🌿 L-Theanine</div>
              <p class="text-xs text-slate-300 leading-relaxed">Stimulates calming alpha brain waves to quiet overactive mental chatter and smooth the transition into delta sleep.</p>
            </div>

            <div class="p-5 rounded-2xl bg-slate-900/50 border border-white/10 space-y-2">
              <div class="text-base font-bold text-emerald-400">⚡ Vitamin B6 & B2 Complex</div>
              <p class="text-xs text-slate-300 leading-relaxed">Essential enzymatic co-factors that help your body synthesize natural melatonin and maintain steady neurological calm.</p>
            </div>

            <div class="p-5 rounded-2xl bg-slate-900/50 border border-white/10 space-y-2">
              <div class="text-base font-bold text-emerald-400">🔬 Nano-Synergy Delivery</div>
              <p class="text-xs text-slate-300 leading-relaxed">Micronized formulation ensures maximum cellular absorption within 20 minutes of your evening ritual.</p>
            </div>
          </div>
        </div>

        <!-- VERIFIED SOCIAL PROOF / FACEBOOK-STYLE FEED (36,000+ REVIEWS) -->
        <div class="space-y-6">
          <div class="text-center space-y-2">
            <div class="text-xs font-bold text-emerald-400 font-mono-code uppercase">REAL RESULTS FROM REAL SLEEPERS</div>
            <h2 class="text-2xl sm:text-3xl font-extrabold text-white">Based On 36,000+ Verified Customer Reviews</h2>
          </div>

          <div class="space-y-4 max-w-3xl mx-auto">
            
            <div class="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-purple-600 flex items-center justify-center font-bold text-white">BW</div>
                  <div>
                    <div class="text-sm font-bold text-white">Brenda Wilson</div>
                    <div class="text-[11px] text-slate-400">Verified Buyer • 6-Month Supply</div>
                  </div>
                </div>
                <div class="text-amber-400 text-xs">★★★★★</div>
              </div>
              <p class="text-xs sm:text-sm text-slate-200 leading-relaxed">
                "I haven't slept through the night in over 4 years. Every single night around 3:15 AM I would snap wide awake. The very first night I drank Yu Sleep, I slept all the way until my 6:30 AM alarm. No grogginess at all. This stuff is a miracle."
              </p>
            </div>

            <div class="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-teal-600 flex items-center justify-center font-bold text-white">DC</div>
                  <div>
                    <div class="text-sm font-bold text-white">Darlene Cooper</div>
                    <div class="text-[11px] text-slate-400">Verified Buyer • 3-Month Supply</div>
                  </div>
                </div>
                <div class="text-amber-400 text-xs">★★★★★</div>
              </div>
              <p class="text-xs sm:text-sm text-slate-200 leading-relaxed">
                "Synthetic melatonin always gave me weird dreams and made me feel like a zombie the next morning. Tart Cherry + GABA is on a whole different level. My brain just turns off peacefully."
              </p>
            </div>

            <div class="p-4 sm:p-5 rounded-2xl bg-slate-900/60 border border-white/10 space-y-2">
              <div class="flex items-center justify-between">
                <div class="flex items-center gap-3">
                  <div class="w-10 h-10 rounded-full bg-indigo-600 flex items-center justify-center font-bold text-white">RH</div>
                  <div>
                    <div class="text-sm font-bold text-white">Robert Harris</div>
                    <div class="text-[11px] text-slate-400">Verified Buyer • 6-Month Supply</div>
                  </div>
                </div>
                <div class="text-amber-400 text-xs">★★★★★</div>
              </div>
              <p class="text-xs sm:text-sm text-slate-200 leading-relaxed">
                "Got the 6-bottle bundle to save the $360. Best purchase of the year. My wife says I don't toss and turn anymore, and my afternoon energy crash is completely gone."
              </p>
            </div>

          </div>
        </div>

        <!-- 60-DAY MONEY-BACK GUARANTEE -->
        <div class="rounded-3xl p-8 bg-gradient-to-r from-emerald-950/40 via-slate-900/80 to-purple-950/40 border border-emerald-500/30 flex flex-col sm:flex-row items-center gap-6 text-center sm:text-left">
          <div class="w-24 h-24 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-4xl shrink-0">
            🛡️
          </div>
          <div class="space-y-2">
            <h3 class="text-xl sm:text-2xl font-bold text-white">100% "Sleep Like A Baby" 60-Day Money-Back Guarantee</h3>
            <p class="text-xs sm:text-sm text-slate-300 leading-relaxed">
              If you don't sleep deeply through the night, wake up refreshed with zero brain fog, and love your results, simply send the bottles back at any time in the next 60 days for a prompt, 100% refund. No questions asked.
            </p>
          </div>
        </div>

        <!-- FINAL BOTTOM CTA BAR -->
        <div class="text-center space-y-4 pt-6">
          <h2 class="text-2xl sm:text-3xl font-extrabold text-white">Ready For Deep, Restful Sleep Tonight?</h2>
          <div class="flex flex-wrap justify-center gap-4">
            <a
              href="https://yusleep.pay.clickbank.net/?cbitems=3&template=6yun&exitoffer=exy1&cbfid=63843&vtid=glp&affiliate=kmtwarrior"
              target="_blank"
              class="px-8 py-4 rounded-xl font-black text-base text-slate-950 bg-gradient-to-r from-emerald-400 to-teal-300 hover:from-emerald-300 hover:to-teal-200 shadow-xl shadow-emerald-500/30 cursor-pointer transition"
            >
              Claim Best Value Package ($39/ea) →
            </a>
          </div>
          <div class="text-[11px] text-slate-400">
            ClickBank is the retailer of products on this site. 60-Day Unconditional Guarantee.
          </div>
        </div>

      </main>
    `;
  } else {
    // DEFAULT ARCHETYPE 1: SPECULAR CYBER GRID (Hero + Multiplier + 3-Step Bento)
    mainContentHtml = `
      <main class="relative z-10 pt-32 pb-20 px-4 sm:px-6 max-w-6xl mx-auto">
        <div class="text-center max-w-3xl mx-auto space-y-6">
          <div class="inline-flex items-center gap-2.5 glass-pill px-4 py-1.5 rounded-full text-xs font-medium text-slate-200">
            <span class="px-2 py-0.5 rounded-full ${theme.primaryBgClass} ${theme.badgeText} font-mono-code text-[11px]">VERIFIED GIVEAWAY</span>
            <span>${escapeHtml(offer.eyebrow || 'Limited Partner Access')}</span>
          </div>

          <h1 class="text-4xl sm:text-6xl font-extrabold leading-[1.07] tracking-tight text-white">
            ${escapeHtml(offer.headlinePrefix || '')}
            <span class="text-transparent bg-clip-text bg-gradient-to-r ${theme.gradientText}">
              ${escapeHtml(offer.headlineGradient || offer.name)}
            </span>
            ${escapeHtml(offer.headlineSuffix || '')}
          </h1>

          <p class="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
            ${escapeHtml(offer.subheadline || '')}
          </p>

          <div id="claim-box" class="glass-surface rounded-2xl p-3.5 sm:p-4 max-w-xl mx-auto border ${theme.primaryBorderClass} text-left">
            <form id="giveawayForm" class="flex flex-col sm:flex-row gap-3">
              <input
                type="email"
                id="leadEmail"
                required
                placeholder="Enter your best email to unlock instant access..."
                class="flex-1 h-13 px-4 py-3.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white placeholder-slate-400 focus:outline-none ${theme.accentRing}"
              />
              <button
                type="submit"
                class="cta-beam px-6 py-3.5 rounded-xl font-display font-bold text-sm text-white flex items-center justify-center gap-2 whitespace-nowrap cursor-pointer"
              >
                <span>${escapeHtml(offer.ctaButtonText || 'Unlock Free Access')}</span>
                <span>→</span>
              </button>
            </form>
            <div class="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-400">
              <span>✓ 100% Free Registration</span>
              <span>✓ Instant Email &amp; Dashboard Delivery</span>
            </div>
          </div>
        </div>

        <!-- 3-Step Bento Grid -->
        <section class="mt-20 grid md:grid-cols-3 gap-6 perspective-stage">
          ${steps
            .map(
              (s, idx) => `
          <div data-tilt-card class="tilt-card glass-surface rounded-3xl p-7 space-y-4">
            <div class="icon-3d-pedestal">
              <span class="font-mono-code font-bold ${theme.primaryClass} text-lg">0${idx + 1}</span>
            </div>
            <div class="text-xs font-mono-code ${theme.primaryClass}">STEP 0${idx + 1}</div>
            <h3 class="text-xl font-bold text-white">${escapeHtml(s.title)}</h3>
            <p class="text-sm text-slate-300 leading-relaxed">${escapeHtml(s.desc)}</p>
          </div>`
            )
            .join('')}
        </section>
      </main>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(offer.name)} — ${escapeHtml(offer.badge || 'Free Instant Access')}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Plus+Jakarta+Sans:wght@700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    ${headStyles}
  </style>
</head>
<body class="relative min-h-screen ${theme.selectionBg} selection:text-black">
  <!-- Dynamic Atmospheric Glow Orbs (scrolltide.co + glass.samasante.com) -->
  <div class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    <div class="absolute inset-0 cyber-grid"></div>
    <div class="absolute -top-40 left-1/4 w-[520px] h-[520px] ${theme.orb1} rounded-full blur-[130px]"></div>
    <div class="absolute top-1/3 -right-32 w-[460px] h-[460px] ${theme.orb2} rounded-full blur-[140px]"></div>
  </div>

  <!-- Navbar (navbar.gallery) -->
  <header class="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
    <nav class="glass-pill rounded-full px-5 py-2.5 flex items-center justify-between gap-4 max-w-5xl w-full">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br ${theme.gradientText} flex items-center justify-center shadow-lg shadow-black/40">
          <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span class="font-display font-bold text-sm sm:text-base text-white">${escapeHtml(offer.name)}</span>
        <span class="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono-code uppercase px-2.5 py-0.5 rounded-full ${theme.primaryBgClass} ${theme.badgeText} border ${theme.primaryBorderClass}">
          <span class="w-1.5 h-1.5 rounded-full ${theme.primaryClass.replace('text-', 'bg-')} animate-ping"></span>
          ${escapeHtml(offer.badge || 'Free Access')}
        </span>
      </div>
      <a href="#claim-box" class="px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition">
        Unlock Access →
      </a>
    </nav>
  </header>

  ${mainContentHtml}

  <!-- Instant Unlock Modal -->
  <div id="unlockModal" class="fixed inset-0 z-50 hidden items-center justify-center p-4 bg-black/80 backdrop-blur-md">
    <div class="glass-surface rounded-3xl max-w-lg w-full p-6 sm:p-8 border ${theme.primaryBorderClass} relative space-y-6">
      <button id="closeModal" class="absolute top-5 right-5 text-slate-400 hover:text-white text-sm font-mono-code cursor-pointer">✕ ESC</button>
      <div class="space-y-2">
        <span class="px-3 py-1 rounded-full text-xs font-mono-code ${theme.primaryBgClass} ${theme.badgeText} border ${theme.primaryBorderClass}">
          ACCESS UNLOCKED • CHECK YOUR INBOX
        </span>
        <h3 class="text-2xl font-bold text-white">${escapeHtml(offer.name)} Is Ready!</h3>
        <p class="text-xs sm:text-sm text-slate-300">
          We also dispatched your direct access link to your email inbox. Click below to continue straight to your activated destination:
        </p>
      </div>
      <div class="p-5 rounded-2xl bg-white/[0.04] border ${theme.primaryBorderClass} space-y-4">
        <a
          id="offerAffiliateLink"
          href="${escapeHtml(offer.affiliateUrl)}"
          target="_blank"
          rel="noopener noreferrer"
          class="cta-beam w-full py-4 px-5 rounded-xl font-display font-bold text-sm text-white flex items-center justify-center gap-2"
        >
          <span>Continue to ${escapeHtml(offer.name)} Now</span>
          <span>↗</span>
        </a>
      </div>
    </div>
  </div>

  <!-- Editorial Footer (footer.design) -->
  <footer class="relative z-10 border-t border-white/10 mt-16 pt-10 pb-8 px-4 sm:px-6 overflow-hidden">
    <div class="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 pb-8 text-xs text-slate-500">
      <div class="flex items-center gap-2">
        <span class="w-2 h-2 rounded-full ${theme.primaryClass.replace('text-', 'bg-')}"></span>
        <span class="font-mono-code text-slate-300">All Routing &amp; Delivery Nodes Operational</span>
      </div>
      <div>Independent Partner Funnel • Powered by AI Simple System</div>
    </div>
    <div class="select-none pointer-events-none text-center">
      <div class="font-display font-extrabold text-[9vw] leading-none tracking-tighter text-white/[0.03] uppercase">
        ${escapeHtml(offer.name)}
      </div>
    </div>
  </footer>

  <script>
    // 3D Card Tilt Interaction (scrolltide.co)
    document.querySelectorAll('[data-tilt-card]').forEach((card) => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        card.style.transform = \`perspective(1000px) rotateY(\${x * 8}deg) rotateX(\${-y * 8}deg) translateZ(4px)\`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = 'perspective(1000px) rotateY(0deg) rotateX(0deg) translateZ(0)';
      });
    });

    // Form Submission & Instant Unlock Modal
    const form = document.getElementById('giveawayForm');
    const modal = document.getElementById('unlockModal');
    const closeModal = document.getElementById('closeModal');
    const submitBtn = form?.querySelector('button[type="submit"]');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = document.getElementById('leadEmail').value.trim();
        if (!email) return;
        const original = submitBtn.innerHTML;
        submitBtn.disabled = true;
        submitBtn.innerHTML = '<span>Unlocking...</span>';

        // For voucher archetype, dynamically reveal the key
        const voucherKeyDisplay = document.getElementById('voucherKeyDisplay');
        if (voucherKeyDisplay) {
          const randHex = Math.random().toString(36).substring(2, 6).toUpperCase();
          voucherKeyDisplay.textContent = 'VTM-8X-' + randHex + '-2026';
        }

        try {
          await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              offerSlug: ${JSON.stringify(offer.slug)},
              sponsorCode: ${JSON.stringify(offer.sponsorCode || '144')}
            })
          });
        } catch (_) {}
        submitBtn.disabled = false;
        submitBtn.innerHTML = original;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
      });
    }

    if (closeModal) {
      closeModal.addEventListener('click', () => {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
      });
    }

    // Optional Countdown Timer for Voucher Archetype
    const timerEl = document.getElementById('countdownTimer');
    if (timerEl) {
      let secondsLeft = 299;
      setInterval(() => {
        if (secondsLeft > 0) {
          secondsLeft--;
          const m = String(Math.floor(secondsLeft / 60)).padStart(2, '0');
          const s = String(secondsLeft % 60).padStart(2, '0');
          timerEl.textContent = 'Expires in ' + m + ':' + s;
        }
      }, 1000);
    }

    // Optional Random Activity Ticker for Voucher Archetype
    const activityEl = document.getElementById('recentActivityText');
    if (activityEl) {
      const names = ['Jordan K. from Texas', 'Elena R. from New York', 'David M. from Florida', 'Chris P. from London', 'Aisha B. from Toronto'];
      let actIdx = 0;
      setInterval(() => {
        actIdx = (actIdx + 1) % names.length;
        activityEl.textContent = names[actIdx] + ' just unlocked their free access key (' + (Math.floor(Math.random() * 4) + 1) + ' mins ago)';
      }, 4500);
    }
  </script>
</body>
</html>`;
}

module.exports = { renderOfferLander, THEMES };
