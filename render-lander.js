// Dynamic 8-Pillar Glassmorphic Lander Renderer for any Offer in offers.json

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderOfferLander(offer) {
  const steps = offer.steps && offer.steps.length === 3 ? offer.steps : [
    { title: 'Step 1: Instant Free Access', desc: 'Unlock your free account and dashboard in under 4 minutes.' },
    { title: 'Step 2: Plug In Your Link or Brand', desc: 'Apply the proven framework directly to your existing offer or project.' },
    { title: 'Step 3: Scale Your Traffic & Leads', desc: 'Turn every visitor into automated exposure and long-term email subscribers.' }
  ];

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
    :root {
      --bg-deep: #05060a;
      --glass-bg: linear-gradient(135deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%);
      --glass-border: rgba(255, 255, 255, 0.11);
      --glass-specular: inset 0 1px 0 0 rgba(255, 255, 255, 0.22);
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
                  linear-gradient(145deg, rgba(16, 185, 129, 0.28), rgba(99, 102, 241, 0.22));
      border: 1px solid rgba(255, 255, 255, 0.22);
      box-shadow: inset 0 2px 3px rgba(255, 255, 255, 0.35), 0 14px 24px -6px rgba(16, 185, 129, 0.35);
    }
    .cta-beam {
      position: relative;
      overflow: hidden;
      background: linear-gradient(135deg, #10b981 0%, #059669 45%, #4f46e5 100%);
      box-shadow: 0 0 35px -5px rgba(16, 185, 129, 0.55), inset 0 1px 0 0 rgba(255, 255, 255, 0.4);
      transition: all 0.25s cubic-bezier(0.16, 1, 0.3, 1);
    }
    .cta-beam:hover {
      transform: translateY(-2px) scale(1.01);
      box-shadow: 0 0 48px -2px rgba(16, 185, 129, 0.75), inset 0 1px 0 0 rgba(255, 255, 255, 0.55);
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
    .tilt-card:hover { border-color: rgba(16, 185, 129, 0.4); }
  </style>
</head>
<body class="relative min-h-screen selection:bg-emerald-500 selection:text-black">
  <div class="fixed inset-0 pointer-events-none z-0 overflow-hidden">
    <div class="absolute inset-0 cyber-grid"></div>
    <div class="absolute -top-40 left-1/4 w-[520px] h-[520px] bg-emerald-500/15 rounded-full blur-[130px]"></div>
    <div class="absolute top-1/3 -right-32 w-[460px] h-[460px] bg-indigo-500/15 rounded-full blur-[140px]"></div>
  </div>

  <!-- Navbar (navbar.gallery) -->
  <header class="fixed top-4 inset-x-0 z-50 flex justify-center px-4">
    <nav class="glass-pill rounded-full px-5 py-2.5 flex items-center justify-between gap-4 max-w-5xl w-full">
      <div class="flex items-center gap-2.5">
        <div class="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-indigo-600 flex items-center justify-center shadow-lg shadow-emerald-500/25">
          <svg class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span class="font-display font-bold text-sm sm:text-base text-white">${escapeHtml(offer.name)}</span>
        <span class="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-mono-code uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
          ${escapeHtml(offer.badge || 'Free Access')}
        </span>
      </div>
      <a href="#claim-box" class="px-4 py-1.5 rounded-full text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition">
        Unlock Access →
      </a>
    </nav>
  </header>

  <!-- Hero Section (supahero.io + cta.gallery) -->
  <main class="relative z-10 pt-32 pb-20 px-4 sm:px-6 max-w-6xl mx-auto">
    <div class="text-center max-w-3xl mx-auto space-y-6">
      <div class="inline-flex items-center gap-2.5 glass-pill px-4 py-1.5 rounded-full text-xs font-medium text-slate-200">
        <span class="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono-code text-[11px]">VERIFIED GIVEAWAY</span>
        <span>${escapeHtml(offer.eyebrow || 'Limited Partner Access')}</span>
      </div>

      <h1 class="text-4xl sm:text-6xl font-extrabold leading-[1.07] tracking-tight text-white">
        ${escapeHtml(offer.headlinePrefix || '')}
        <span class="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-indigo-400">
          ${escapeHtml(offer.headlineGradient || offer.name)}
        </span>
        ${escapeHtml(offer.headlineSuffix || '')}
      </h1>

      <p class="text-base sm:text-lg text-slate-300 max-w-2xl mx-auto leading-relaxed">
        ${escapeHtml(offer.subheadline || '')}
      </p>

      <div id="claim-box" class="glass-surface rounded-2xl p-3.5 sm:p-4 max-w-xl mx-auto border border-emerald-500/30 text-left">
        <form id="giveawayForm" class="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            id="leadEmail"
            required
            placeholder="Enter your best email to unlock instant access..."
            class="flex-1 h-13 px-4 py-3.5 rounded-xl bg-black/50 border border-white/10 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
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

    <!-- 3-Step Bento Grid (3dicons.co + glass.samasante.com + scrolltide.co) -->
    <section class="mt-20 grid md:grid-cols-3 gap-6 perspective-stage">
      ${steps
        .map(
          (s, idx) => `
      <div data-tilt-card class="tilt-card glass-surface rounded-3xl p-7 space-y-4">
        <div class="icon-3d-pedestal">
          <span class="font-mono-code font-bold text-emerald-300 text-lg">0${idx + 1}</span>
        </div>
        <div class="text-xs font-mono-code text-emerald-400">STEP 0${idx + 1}</div>
        <h3 class="text-xl font-bold text-white">${escapeHtml(s.title)}</h3>
        <p class="text-sm text-slate-300 leading-relaxed">${escapeHtml(s.desc)}</p>
      </div>`
        )
        .join('')}
    </section>
  </main>

  <!-- Instant Unlock Modal -->
  <div id="unlockModal" class="fixed inset-0 z-50 hidden items-center justify-center p-4 bg-black/80 backdrop-blur-md">
    <div class="glass-surface rounded-3xl max-w-lg w-full p-6 sm:p-8 border border-emerald-500/40 relative space-y-6">
      <button id="closeModal" class="absolute top-5 right-5 text-slate-400 hover:text-white text-sm font-mono-code">✕ ESC</button>
      <div class="space-y-2">
        <span class="px-3 py-1 rounded-full text-xs font-mono-code bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
          ACCESS UNLOCKED • CHECK YOUR INBOX
        </span>
        <h3 class="text-2xl font-bold text-white">${escapeHtml(offer.name)} Is Ready!</h3>
        <p class="text-xs sm:text-sm text-slate-300">
          We also sent a backup access link to your email. Click below to continue straight to your destination:
        </p>
      </div>
      <div class="p-5 rounded-2xl bg-white/[0.04] border border-emerald-500/40 space-y-4">
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
        <span class="w-2 h-2 rounded-full bg-emerald-400"></span>
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

    const form = document.getElementById('giveawayForm');
    const modal = document.getElementById('unlockModal');
    const closeModal = document.getElementById('closeModal');
    const submitBtn = form.querySelector('button[type="submit"]');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();
      const email = document.getElementById('leadEmail').value.trim();
      if (!email) return;
      const original = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = '<span>Unlocking...</span>';
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

    closeModal.addEventListener('click', () => {
      modal.classList.add('hidden');
      modal.classList.remove('flex');
    });
  </script>
</body>
</html>`;
}

module.exports = { renderOfferLander };
