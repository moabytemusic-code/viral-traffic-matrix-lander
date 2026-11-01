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

  // Try to find a rendered video MP4 if available from ViralForge job
  let videoPreviewUrl = null;
  if (offer.viralForgeJob?.videos) {
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
                <video autoplay loop muted playsinline class="absolute inset-0 w-full h-full object-cover z-0">
                  <source src="${escapeHtml(videoPreviewUrl)}" type="video/mp4" />
                </video>
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
