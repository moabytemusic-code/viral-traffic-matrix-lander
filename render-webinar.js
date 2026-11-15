/**
 * Webinar Viewer Page Renderer
 * Generates modern, accessible, high-converting on-demand webinar viewing pages.
 *
 * Features:
 * - On-Demand Presentation labeling (zero fake live counters)
 * - AI Presenter disclosure badge
 * - Accessible HTML5 Video Player with smooth buffering and Range support
 * - Timed Call-to-Action with verifiable watch progress enforcement
 * - Grounded AI Q&A drawer with citation references
 * - Optional Brevo lead capture modal with explicit consent checkbox
 * - Transparent affiliate and medical disclosures
 * - Zero em dashes in markup or copy
 */

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderWebinarViewer(webinar, { isPreview = false } = {}) {
  const p = webinar.presenter || {};
  const v = webinar.video || {};
  const c = webinar.cta || {};
  const reg = webinar.registration || {};
  const ref = webinar.reference || {};

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(webinar.headline || webinar.internalTitle)} - On-Demand Affiliate Overview</title>
  <meta name="description" content="${escapeHtml(webinar.subheadline)}">
  <script src="https://cdn.tailwindcss.com"></script>
  <script>
    tailwind.config = {
      darkMode: 'class',
      theme: {
        extend: {
          colors: {
            brand: { 50: '#eef2ff', 500: '#6366f1', 600: '#4f46e5', 700: '#4338ca' }
          }
        }
      }
    };
  </script>
  <style>
    .glass-surface {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .video-container {
      position: relative;
      padding-bottom: 56.25%; /* 16:9 aspect ratio */
      height: 0;
      overflow: hidden;
      border-radius: 1rem;
      background: #000;
    }
    .video-container video {
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      object-fit: contain;
    }
  </style>
</head>
<body class="bg-slate-950 text-slate-100 min-h-screen flex flex-col antialiased selection:bg-indigo-500 selection:text-white">

  ${isPreview ? `
  <!-- Admin Preview Notification Banner -->
  <aside aria-label="Preview notice" class="bg-gradient-to-r from-amber-600 via-amber-700 to-orange-700 text-amber-50 text-xs font-mono font-semibold py-2 px-4 text-center sticky top-0 z-50 shadow-md flex items-center justify-center gap-2">
    <span class="inline-block w-2 h-2 rounded-full bg-amber-300 animate-pulse"></span>
    <span>ADMIN PREVIEW MODE: Viewing unreleased draft (Status: ${escapeHtml(webinar.status)}). Viewer activity in this mode is excluded from production analytics.</span>
  </aside>
  ` : ''}

  <!-- Header -->
  <header class="border-b border-white/5 bg-slate-900/60 backdrop-blur-md sticky ${isPreview ? 'top-8' : 'top-0'} z-40">
    <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
      <div class="flex items-center gap-3">
        <span class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-base shadow-lg shadow-indigo-500/20">W</span>
        <div>
          <span class="font-bold text-sm tracking-wide text-white block">Independent Product Review</span>
          <span class="text-[11px] text-slate-400 font-mono">On-Demand Educational Overview</span>
        </div>
      </div>
      <div class="flex items-center gap-3">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
          Recorded Session
        </span>
        <button id="openLeadModalBtn" type="button" class="hidden sm:inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition">
          <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
          Get Free Label PDF
        </button>
      </div>
    </div>
  </header>

  <!-- Main Content Layout -->
  <main class="flex-1 max-w-6xl mx-auto px-4 py-6 sm:py-10 w-full space-y-8">

    <!-- Title & Presenter Header -->
    <section class="space-y-3 text-center sm:text-left max-w-4xl">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
        <span>Factual Verification Series</span>
        <span>•</span>
        <span>No Prescriptions Needed</span>
      </div>
      <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
        ${escapeHtml(webinar.headline || webinar.internalTitle)}
      </h1>
      <p class="text-sm sm:text-base text-slate-400 leading-relaxed">
        ${escapeHtml(webinar.subheadline)}
      </p>

      <!-- Presenter Transparency Card -->
      <div class="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-400">
        <div class="flex items-center gap-2 bg-slate-900/80 px-3 py-1.5 rounded-xl border border-white/5">
          <img src="${escapeHtml(v.posterUrl || '/images/yusleep-presenter.jpg')}" alt="Presenter Avatar" class="w-6 h-6 rounded-full object-cover border border-white/10">
          <span>Presenter: <strong class="text-slate-200">${escapeHtml(p.name || 'Sarah')}</strong></span>
        </div>
        ${p.isAiGenerated ? `
        <div class="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-purple-500/10 text-purple-300 border border-purple-500/20">
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z"/></svg>
          <span>AI Presenter: Original Character</span>
        </div>
        ` : ''}
        <div class="text-slate-500 text-[11px]">
          Duration: ${Math.round((v.durationSeconds || 30) / 60) > 0 ? Math.round((v.durationSeconds || 30) / 60) + 'm' : (v.durationSeconds || 30) + 's'} · Independent Affiliate Analysis
        </div>
      </div>
    </section>

    <!-- Video Player Section -->
    <section class="space-y-4">
      <div class="video-container shadow-2xl border border-white/10 group">
        <video id="webinarVideo" controls preload="metadata" poster="${escapeHtml(v.posterUrl || '/images/yusleep-presenter.jpg')}">
          <source src="${escapeHtml(v.videoUrl)}" type="video/mp4">
          Your browser does not support the video tag.
        </video>
      </div>

      ${v.isPrototype ? `
      <!-- Prototype Notice -->
      <div class="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-start gap-2.5">
        <svg class="w-4 h-4 text-amber-400 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
        <div>
          <strong class="font-semibold block text-amber-200">Demonstration Prototype (30 Seconds)</strong>
          <span>${escapeHtml(v.prototypeNotice || 'This video demonstrates the conversational presenter delivery, pacing, and label walkthrough style. The full 6-minute production script is prepared in VideoMan.')}</span>
        </div>
      </div>
      ` : ''}
    </section>

    <!-- Timed Call to Action Area -->
    <section id="ctaContainer" class="${c.hideUntilRevealed ? 'hidden' : ''} transition-all duration-700 ease-out">
      <div class="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/60 via-slate-900/90 to-purple-950/50 border-2 border-indigo-500/40 shadow-2xl space-y-4 text-center">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          <span>Official Presentation Reference</span>
        </div>
        <h2 class="text-xl sm:text-2xl font-bold text-white max-w-xl mx-auto">
          Ready to verify the official package details and current bottle pricing?
        </h2>
        <p class="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
          ${escapeHtml(c.subtext || 'View current bundle discounts and 60-day guarantee terms directly on the merchant presentation.')}
        </p>
        <div>
          <a id="ctaAffiliateLink" href="${escapeHtml(c.destinationUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-base shadow-xl shadow-indigo-600/30 transition transform hover:-translate-y-0.5 focus:ring-4 focus:ring-indigo-500/40">
            <span>${escapeHtml(c.buttonText || 'Open Official YuSleep Presentation')}</span>
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3"/></svg>
          </a>
        </div>
        <p class="text-[11px] text-slate-500 max-w-md mx-auto pt-1">
          ${escapeHtml(c.affiliateDisclosure || 'Affiliate Disclosure: We may receive a commission if you order through our link. This does not alter the price you pay.')}
        </p>
      </div>
    </section>

    <!-- Side-by-Side: Grounded AI Q&A and Verified Label Facts -->
    <div class="grid lg:grid-cols-2 gap-8 items-start">

      <!-- AI Q&A Panel -->
      <section class="glass-surface p-6 rounded-3xl space-y-4">
        <div class="flex items-center justify-between border-b border-white/5 pb-3">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg bg-purple-600/30 text-purple-400 flex items-center justify-center text-xs font-bold">AI</span>
            <h2 class="font-bold text-sm text-white">Ask an Ingredient or Policy Question</h2>
          </div>
          <span class="text-[10px] text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded">Grounded in Label Data</span>
        </div>

        <p class="text-xs text-slate-400">
          Have a question about what is on the Supplement Facts label, how the blend is formulated, or how merchant returns work? Ask below.
        </p>

        <!-- Suggested Question Pills -->
        <div class="flex flex-wrap gap-1.5 pt-1">
          <button type="button" onclick="setQuickQuestion('What ingredients are in the 637mg blend?')" class="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition">
            What is in the 637mg blend?
          </button>
          <button type="button" onclick="setQuickQuestion('How much melatonin does it contain?')" class="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition">
            How much melatonin?
          </button>
          <button type="button" onclick="setQuickQuestion('What is the 60-day refund policy?')" class="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition">
            What is the return policy?
          </button>
          <button type="button" onclick="setQuickQuestion('Are there clinical trials on this formula?')" class="text-[11px] px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition">
            Are there clinical trials?
          </button>
        </div>

        <!-- Chat Stream -->
        <div id="qaChatHistory" class="space-y-3 min-h-[140px] max-h-[300px] overflow-y-auto p-3 rounded-2xl bg-black/40 border border-white/5 text-xs text-slate-300">
          <div class="p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <span class="font-bold text-purple-300 text-[11px] block">AI Assistant (Sarah):</span>
            <p>Welcome! I can answer factual questions about YuSleep's Supplement Facts panel, disclosed dosages, and merchant terms. I cannot provide personalized medical diagnosis or drug interaction advice.</p>
          </div>
        </div>

        <!-- Question Input Form -->
        <form id="qaForm" class="space-y-2" onsubmit="submitQuestion(event)">
          <div class="flex gap-2">
            <input id="qaInput" type="text" placeholder="e.g. Is the tart cherry dosage disclosed separately?" class="flex-1 px-3 py-2.5 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" maxlength="400" required>
            <button id="qaSubmitBtn" type="submit" class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition flex items-center justify-center">
              <span>Ask</span>
            </button>
          </div>
          <span class="text-[10px] text-slate-500 block">Not medical advice. Grounded solely in verified label and merchant disclosures.</span>
        </form>
      </section>

      <!-- Verified Label Facts & Disclosures -->
      <section class="glass-surface p-6 rounded-3xl space-y-4">
        <div class="flex items-center justify-between border-b border-white/5 pb-3">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-lg bg-emerald-600/30 text-emerald-400 flex items-center justify-center text-xs font-bold">✓</span>
            <h2 class="font-bold text-sm text-white">Disclosed Supplement Facts</h2>
          </div>
          <span class="text-[10px] text-slate-400 font-mono">Serving: 2 ml (Liquid)</span>
        </div>

        <div class="space-y-2.5 text-xs">
          <div class="flex justify-between items-center py-1.5 border-b border-white/5">
            <span class="text-slate-300">Vitamin B2 (Riboflavin)</span>
            <span class="font-mono text-slate-100">1.7 mg (131% DV)</span>
          </div>
          <div class="flex justify-between items-center py-1.5 border-b border-white/5">
            <span class="text-slate-300">Vitamin B6 (Pyridoxine HCl)</span>
            <span class="font-mono text-slate-100">2.0 mg (118% DV)</span>
          </div>
          <div class="flex justify-between items-center py-1.5 border-b border-white/5">
            <span class="text-slate-300">Melatonin</span>
            <span class="font-mono text-slate-100">0.9 mg</span>
          </div>
          <div class="p-3 rounded-xl bg-black/40 border border-white/5 space-y-1.5">
            <div class="flex justify-between items-center">
              <span class="font-bold text-slate-200">Proprietary Herbal & Amino Blend</span>
              <span class="font-mono text-indigo-300 font-bold">637 mg Total</span>
            </div>
            <p class="text-[11px] text-slate-400 leading-relaxed">
              Contains: Red Tart Cherry Juice Concentrate, Magnesium Glycinate, Apigenin, Lemon Balm Leaf Extract, 5-HTP, L-Theanine, and GABA.
            </p>
            <p class="text-[10px] text-amber-400/90 italic">
              Notice: The manufacturer provides one 637 mg aggregate total for the blend. Individual ingredient milligrams are not listed on the label panel.
            </p>
          </div>
        </div>

        <div class="pt-2">
          <button type="button" onclick="openLeadModal()" class="w-full py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition flex items-center justify-center gap-2">
            <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"/></svg>
            <span>Download High-Resolution Label Facts PDF</span>
          </button>
        </div>
      </section>

    </div>

  </main>

  <!-- Lead Capture Modal / Drawer -->
  <div id="leadModal" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm hidden items-center justify-center p-4">
    <div class="glass-surface p-6 sm:p-8 rounded-3xl max-w-md w-full space-y-5 border border-white/15 shadow-2xl relative">
      <button type="button" onclick="closeLeadModal()" class="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold">✕</button>
      
      <div class="space-y-1.5 text-center">
        <span class="text-xs font-mono font-bold text-indigo-400">FREE REFERENCE DOCUMENT</span>
        <h3 class="text-lg font-bold text-white">Get the YuSleep Label Breakdown PDF</h3>
        <p class="text-xs text-slate-400 leading-relaxed">
          Includes high-resolution label scans, proprietary blend breakdown, and questions to ask your doctor.
        </p>
      </div>

      <form id="leadForm" onsubmit="submitLead(event)" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1" for="leadName">First Name (Optional)</label>
          <input type="text" id="leadName" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" placeholder="e.g. Alex">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1" for="leadEmail">Email Address</label>
          <input type="email" id="leadEmail" required class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" placeholder="you@example.com">
        </div>

        <!-- Verifiable Marketing Consent Checkbox -->
        <div class="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/5 text-[11px] text-slate-300 leading-normal">
          <input type="checkbox" id="leadConsent" required class="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500">
          <label for="leadConsent" class="cursor-pointer">
            ${escapeHtml(reg.consentCheckboxText || 'I agree to receive the YuSleep label guide and email updates. I can unsubscribe at any time.')}
            <a href="/privacy" target="_blank" class="text-indigo-400 underline ml-1">Privacy Policy</a>.
          </label>
        </div>

        <button type="submit" id="leadSubmitBtn" class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition">
          Send Me the Free PDF Guide
        </button>

        <p id="leadStatusMsg" class="text-center text-xs hidden"></p>
      </form>
    </div>
  </div>

  <!-- Footer Disclosures -->
  <footer class="border-t border-white/5 bg-slate-950 py-10 text-xs text-slate-500 space-y-4">
    <div class="max-w-6xl mx-auto px-4 space-y-4">
      <div class="space-y-2 border-b border-white/5 pb-4">
        <h4 class="font-bold text-slate-400 text-xs uppercase tracking-wider">Regulatory & Affiliate Transparency Disclosures</h4>
        <p class="leading-relaxed">
          <strong>Affiliate Disclosure:</strong> This webinar overview is produced by an independent affiliate marketer. If you purchase YuSleep through our link, we may earn a sales commission from the merchant at no additional cost to you. This analysis is independently prepared and is not sponsored, paid for, or endorsed by Yu Sleep Laboratories.
        </p>
        <p class="leading-relaxed">
          <strong>FDA Disclaimer:</strong> Statements made on this page have not been evaluated by the Food and Drug Administration. YuSleep is a dietary supplement and is not intended to diagnose, treat, cure, or prevent any medical disease or clinical condition. Consult your qualified physician before taking any supplement.
        </p>
        <p class="leading-relaxed">
          <strong>AI Disclosure:</strong> The presenter featured in this video is an original fictional AI character with synthesized narration created for educational clarity. It does not represent a licensed physician or a personal testimonial of product usage.
        </p>
      </div>

      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-600 text-[11px]">
        <span>© 2026 Independent Consumer Health Reviews. All Rights Reserved.</span>
        <div class="flex items-center gap-4">
          <a href="/privacy" class="hover:text-slate-400 underline">Privacy Policy</a>
          <a href="/terms" class="hover:text-slate-400 underline">Terms of Service</a>
          <a href="${escapeHtml(ref.presentationUrl || 'https://getyusleep.com/aff-th/')}" target="_blank" rel="noopener noreferrer" class="hover:text-slate-400 underline">Merchant Terms & Refund Policy</a>
        </div>
      </div>
    </div>
  </footer>

  <!-- Viewer Script: Tracking, CTA Reveal, Brevo Registration, AI Q&A -->
  <script>
    const SLUG = ${JSON.stringify(webinar.slug)};
    const IS_PREVIEW = ${JSON.stringify(isPreview)};
    const CTA_REVEAL_SECONDS = ${JSON.stringify(c.revealSeconds || 15)};
    const SESSION_ID = 'sess_' + Math.random().toString(36).substring(2, 12) + '_' + Date.now();

    const video = document.getElementById('webinarVideo');
    const ctaContainer = document.getElementById('ctaContainer');
    const ctaLink = document.getElementById('ctaAffiliateLink');
    let hasPlayed = false;
    let ctaRevealed = false;
    let milestoneTracked = { p25: false, p50: false, p75: false, p100: false };

    // 1. Initial Pageview Tracking
    sendTrackingEvent('pageview');

    // 2. Video Player Event Listeners
    video.addEventListener('play', () => {
      if (!hasPlayed) {
        hasPlayed = true;
        sendTrackingEvent('playback_start');
      }
    });

    video.addEventListener('timeupdate', () => {
      const cur = video.currentTime;
      const dur = video.duration || ${JSON.stringify(v.durationSeconds || 30)};

      // Reveal CTA when actual currentTime reaches trigger threshold
      if (cur >= CTA_REVEAL_SECONDS && !ctaRevealed) {
        ctaRevealed = true;
        ctaContainer.classList.remove('hidden');
        sendTrackingEvent('cta_impression');
      }

      // Track Percentage Milestones
      if (dur > 0) {
        const pct = (cur / dur) * 100;
        if (pct >= 25 && !milestoneTracked.p25) { milestoneTracked.p25 = true; sendTrackingEvent('milestone', { milestone: 'p25' }); }
        if (pct >= 50 && !milestoneTracked.p50) { milestoneTracked.p50 = true; sendTrackingEvent('milestone', { milestone: 'p50' }); }
        if (pct >= 75 && !milestoneTracked.p75) { milestoneTracked.p75 = true; sendTrackingEvent('milestone', { milestone: 'p75' }); }
        if (pct >= 98 && !milestoneTracked.p100) { milestoneTracked.p100 = true; sendTrackingEvent('milestone', { milestone: 'p100' }); }
      }
    });

    // Heartbeat every 5 seconds while video is playing
    setInterval(() => {
      if (!video.paused && !video.ended) {
        sendTrackingEvent('watch_heartbeat', { watchSeconds: video.currentTime });
      }
    }, 5000);

    // Track CTA Click
    ctaLink.addEventListener('click', () => {
      sendTrackingEvent('cta_click');
    });

    function sendTrackingEvent(eventType, extra = {}) {
      const payload = {
        eventType,
        sessionId: SESSION_ID,
        isPreview: IS_PREVIEW,
        ...extra
      };
      try {
        fetch('/api/webinars/' + encodeURIComponent(SLUG) + '/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload)
        }).catch(() => {});
      } catch (e) {}
    }

    // 3. AI Q&A Interactive Handler
    function setQuickQuestion(q) {
      const input = document.getElementById('qaInput');
      input.value = q;
      document.getElementById('qaForm').dispatchEvent(new Event('submit', { cancelable: true }));
    }

    async function submitQuestion(e) {
      e.preventDefault();
      const input = document.getElementById('qaInput');
      const q = input.value.trim();
      if (!q) return;

      const history = document.getElementById('qaChatHistory');
      const submitBtn = document.getElementById('qaSubmitBtn');

      // Append User Message
      const userBubble = document.createElement('div');
      userBubble.className = 'p-2 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-200 text-right';
      userBubble.textContent = q;
      history.appendChild(userBubble);
      input.value = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Thinking...';
      history.scrollTop = history.scrollHeight;

      // Track Question
      sendTrackingEvent('qa_query');

      try {
        const res = await fetch('/api/webinars/' + encodeURIComponent(SLUG) + '/qa', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ question: q })
        });
        const data = await res.json();

        const aiBubble = document.createElement('div');
        aiBubble.className = 'p-2.5 rounded-xl bg-white/5 border border-white/5 space-y-1';
        aiBubble.innerHTML = '<span class="font-bold text-purple-300 text-[11px] block">AI Assistant:</span>' +
          '<p class="leading-relaxed">' + escapeHtml(data.answer) + '</p>' +
          (data.sources && data.sources.length ? '<span class="text-[10px] text-slate-500 block pt-1">Source: ' + escapeHtml(data.sources.join(', ')) + '</span>' : '');
        history.appendChild(aiBubble);
      } catch (err) {
        const errBubble = document.createElement('div');
        errBubble.className = 'p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300';
        errBubble.textContent = 'Unable to reach AI assistant. Please check your connection and try again.';
        history.appendChild(errBubble);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Ask';
        history.scrollTop = history.scrollHeight;
      }
    }

    // 4. Lead Capture Modal Handling
    const leadModal = document.getElementById('leadModal');
    const openLeadBtn = document.getElementById('openLeadModalBtn');
    if (openLeadBtn) openLeadBtn.addEventListener('click', openLeadModal);

    function openLeadModal() {
      leadModal.classList.remove('hidden');
      leadModal.classList.add('flex');
    }

    function closeLeadModal() {
      leadModal.classList.add('hidden');
      leadModal.classList.remove('flex');
    }

    async function submitLead(e) {
      e.preventDefault();
      const email = document.getElementById('leadEmail').value.trim();
      const name = document.getElementById('leadName').value.trim();
      const consent = document.getElementById('leadConsent').checked;
      const statusMsg = document.getElementById('leadStatusMsg');
      const submitBtn = document.getElementById('leadSubmitBtn');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Preparing Guide...';
      statusMsg.className = 'text-center text-xs block text-slate-400';
      statusMsg.textContent = 'Synchronizing consent record...';

      try {
        const res = await fetch('/api/webinars/' + encodeURIComponent(SLUG) + '/register', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            email,
            name,
            consentGiven: consent,
            consentText: document.getElementById('leadConsent').parentNode.textContent.trim(),
            isPreview: IS_PREVIEW
          })
        });
        const data = await res.json();
        if (data.ok) {
          statusMsg.className = 'text-center text-xs block text-emerald-400 font-bold';
          statusMsg.textContent = 'Success! Guide access link has been generated.';
          setTimeout(() => {
            closeLeadModal();
            statusMsg.classList.add('hidden');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Send Me the Free PDF Guide';
          }, 2000);
        } else {
          statusMsg.className = 'text-center text-xs block text-red-400';
          statusMsg.textContent = data.error || 'Registration failed. Please try again.';
          submitBtn.disabled = false;
          submitBtn.textContent = 'Send Me the Free PDF Guide';
        }
      } catch (err) {
        statusMsg.className = 'text-center text-xs block text-red-400';
        statusMsg.textContent = 'Network error. Please try again.';
        submitBtn.disabled = false;
        submitBtn.textContent = 'Send Me the Free PDF Guide';
      }
    }

    function escapeHtml(str) {
      if (!str) return '';
      return String(str)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
    }
  </script>
</body>
</html>`;
}

module.exports = {
  renderWebinarViewer
};
