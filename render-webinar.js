/**
 * Webinar Viewer Page Renderer
 * Renders the presenter-led on-demand webinar page from an immutable snapshot
 * (either the approved publishedSnapshot for public viewers, or the current draft snapshot
 * for server-verified preview sessions).
 *
 * Security & Honesty Guarantees:
 * - Meta referrer="no-referrer" and history.replaceState to prevent preview token leakage.
 * - Uses server-issued HMAC viewerContextToken for /track, /register, and /qa.
 * - Dynamically renders Supplement Facts, manufacturer, pricing status, and limitations from snapshot.reference.
 * - Honestly labels the Q&A box as "Product FAQ Assistant (Driven by Approved Reference Data)".
 * - Separates registration from optional marketing consent; never promises a nonexistent PDF guide.
 * - Interval-based playback telemetry; seeking forward does not fabricate watch time or unlock timed CTA early.
 * - Zero em dashes in markup or copy.
 */

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderWebinarViewer(accessContext) {
  const {
    slug,
    isPreview = false,
    mode = 'public',
    revision = 1,
    sessionId = '',
    viewerContextToken = '',
    expiresAt = null,
    webinarStatus = 'DRAFT',
    snapshot = {}
  } = accessContext;

  const p = snapshot.presenter || {};
  const v = snapshot.video || {};
  const c = snapshot.cta || {};
  const reg = snapshot.registration || {};
  const ref = snapshot.reference || {};
  const mfg = ref.manufacturer || {};
  const sd = ref.servingDetails || {};
  const ingredients = Array.isArray(ref.labelDisclosedIngredients) ? ref.labelDisclosedIngredients : [];
  const otherIngs = ref.otherIngredients || {};
  const clinical = ref.clinicalEvidence || {};
  const pricing = ref.pricingAndPackages || {};
  const refund = ref.refundPolicy || {};

  // Append non-PII attribution tracking parameter to approved destination URL
  let trackedDestinationUrl = c.destinationUrl || 'https://hop.clickbank.net/?affiliate=kmtwarrior&vendor=yusleep&op=glp&tid=webinar_yusleep';
  try {
    const u = new URL(trackedDestinationUrl);
    u.searchParams.set('tid', `webinar_${slug.replace(/[^a-z0-9]/gi, '')}_r${revision}`);
    trackedDestinationUrl = u.toString();
  } catch (e) {}

  return `<!DOCTYPE html>
<html lang="en" class="dark">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="referrer" content="no-referrer">
  <meta name="robots" content="${isPreview ? 'noindex, nofollow' : 'index, follow'}">
  <title>${escapeHtml(snapshot.headline || snapshot.internalTitle)} - Recorded Affiliate Overview</title>
  <meta name="description" content="${escapeHtml(snapshot.subheadline)}">
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    .glass-surface {
      background: rgba(15, 23, 42, 0.78);
      backdrop-filter: blur(12px);
      border: 1px solid rgba(255, 255, 255, 0.09);
    }
    .video-container {
      position: relative;
      padding-bottom: 56.25%;
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
  <!-- Server-Verified Admin Preview Banner -->
  <aside id="previewBanner" aria-label="Private preview notice" class="bg-gradient-to-r from-amber-700 via-amber-800 to-orange-800 text-amber-50 text-xs font-mono font-semibold py-2.5 px-4 text-center sticky top-0 z-50 shadow-md flex flex-wrap items-center justify-center gap-2">
    <span class="inline-block w-2 h-2 rounded-full bg-amber-300 animate-pulse"></span>
    <span>PRIVATE PREVIEW MODE (Webinar Status: ${escapeHtml(webinarStatus)} · Draft Revision #${escapeHtml(revision)}${expiresAt ? ` · Link Expires: ${escapeHtml(expiresAt)}` : ''})</span>
    <span class="text-amber-200/90">· Preview activity is isolated from production analytics and live Brevo lists.</span>
  </aside>
  ` : ''}

  <!-- Top Header -->
  <header class="border-b border-white/10 bg-slate-900/70 backdrop-blur-md sticky ${isPreview ? 'top-9' : 'top-0'} z-40">
    <div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-3">
      <div class="flex items-center gap-3">
        <span class="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center font-black text-white text-sm shadow-lg shadow-indigo-500/20">W</span>
        <div>
          <span class="font-bold text-sm tracking-wide text-white block">Recorded Affiliate Overview</span>
          <span class="text-[11px] text-slate-400 font-mono">On-Demand Presentation · Revision #${escapeHtml(revision)}</span>
        </div>
      </div>
      <div class="flex items-center gap-2 sm:gap-3">
        <span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-400"></span>
          On-Demand Recording
        </span>
        <button id="openLeadModalBtn" type="button" class="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold border border-white/10 transition focus:outline-none focus:ring-2 focus:ring-indigo-500">
          <span>Register for Updates</span>
        </button>
      </div>
    </div>
  </header>

  <!-- Main Content -->
  <main class="flex-1 max-w-6xl mx-auto px-4 py-6 sm:py-10 w-full space-y-8">

    <!-- Headline & Presenter Disclosure Header -->
    <section class="space-y-3 max-w-4xl">
      <div class="flex flex-wrap items-center gap-2 text-xs">
        <span class="px-3 py-1 rounded-full font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
          Recorded On-Demand Presentation
        </span>
        <span class="px-3 py-1 rounded-full font-semibold bg-amber-500/10 text-amber-300 border border-amber-500/20">
          Affiliate Commission Disclosure Applies
        </span>
      </div>

      <h1 class="text-2xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
        ${escapeHtml(snapshot.headline || snapshot.internalTitle)}
      </h1>
      <p class="text-sm sm:text-base text-slate-300 leading-relaxed">
        ${escapeHtml(snapshot.subheadline)}
      </p>

      <!-- Presenter & AI Disclosure Card -->
      <div class="pt-2 flex flex-wrap items-center gap-3 text-xs text-slate-300">
        <div class="flex items-center gap-2 bg-slate-900/90 px-3 py-1.5 rounded-xl border border-white/10">
          <img src="${escapeHtml(v.posterUrl || '/images/yusleep-presenter.jpg')}" alt="Presenter ${escapeHtml(p.name || 'Sarah')}" class="w-6 h-6 rounded-full object-cover border border-white/10">
          <span>Presenter: <strong class="text-white">${escapeHtml(p.name || 'Sarah')}</strong> (${escapeHtml(p.role || 'Affiliate Overview Presenter')})</span>
        </div>
        ${p.isAiGenerated ? `
        <div class="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/15 text-purple-200 border border-purple-500/30 font-medium">
          <span>AI Presenter · Recorded Affiliate Overview</span>
        </div>
        ` : ''}
      </div>
      ${p.disclosureText ? `
      <p class="text-xs text-slate-400 bg-slate-900/50 p-3 rounded-xl border border-white/5">
        ${escapeHtml(p.disclosureText)}
      </p>
      ` : ''}
    </section>

    <!-- Video Player Section -->
    <section class="space-y-3" aria-label="On-demand video presentation">
      <div class="video-container shadow-2xl border border-white/10">
        <video id="webinarVideo" controls preload="metadata" playsinline poster="${escapeHtml(v.posterUrl || '/images/yusleep-presenter.jpg')}">
          <source src="${escapeHtml(v.videoUrl)}" type="video/mp4">
          Your browser does not support HTML5 video playback.
        </video>
      </div>

      <!-- Player Status & Watch Progress Bar -->
      <div class="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono bg-slate-900/60 px-4 py-2.5 rounded-xl border border-white/5">
        <div class="flex items-center gap-3">
          <span>Player State: <strong id="playerStateText" class="text-slate-200">Ready (On-Demand)</strong></span>
          <span>·</span>
          <span>Verified Watch Time: <strong id="watchedTimeCounter" class="text-indigo-300">0.0s</strong> / ${Number(v.durationSeconds) || 30}s</span>
        </div>
        <div id="ctaCountdownStatus" class="text-slate-400">
          ${c.hideUntilRevealed
            ? `Offer link unlocks after ${Number(c.revealSeconds) || 15}s of actual watched playback`
            : 'Offer link active below'}
        </div>
      </div>

      ${v.isPrototype ? `
      <!-- Prototype Status Notice -->
      <div class="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 space-y-1">
        <strong class="font-bold block text-amber-100">30-Second Production Prototype Notice</strong>
        <p>${escapeHtml(v.prototypeNotice || 'This video is a 30-second production prototype of the opening segment, not the complete full-length webinar.')}</p>
      </div>
      ` : ''}
    </section>

    <!-- Timed Call to Action Section -->
    <section id="ctaContainer" class="${c.hideUntilRevealed ? 'hidden' : ''} transition-all duration-500" aria-live="polite">
      <div class="p-6 sm:p-8 rounded-3xl bg-gradient-to-br from-indigo-950/70 via-slate-900/95 to-purple-950/60 border-2 border-indigo-500/40 shadow-2xl space-y-4 text-center">
        <div class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
          <span>Merchant Presentation Link</span>
        </div>
        <h2 class="text-xl sm:text-2xl font-bold text-white max-w-xl mx-auto">
          Inspect the Current Label, Package Totals, and Written Terms on the Merchant Page
        </h2>
        <p class="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
          ${escapeHtml(c.subtext || 'Review current pricing, shipping charges, and refund conditions before making any purchase decision.')}
        </p>
        <div>
          <a id="ctaAffiliateLink" href="${escapeHtml(trackedDestinationUrl)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-gradient-to-r from-indigo-600 via-indigo-500 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-sm sm:text-base shadow-xl shadow-indigo-600/30 transition focus:outline-none focus:ring-4 focus:ring-indigo-500/40">
            <span>${escapeHtml(c.buttonText || 'Review Merchant Presentation & Current Terms')}</span>
            <span aria-hidden="true">&rarr;</span>
          </a>
        </div>
        <p class="text-[11px] text-slate-400 max-w-md mx-auto pt-1">
          ${escapeHtml(c.affiliateDisclosure || 'Affiliate Disclosure: If you purchase through our link, we may earn a commission at no additional cost to you.')}
        </p>
      </div>
    </section>

    <!-- Two-Column Grid: Reference-Driven Product FAQ & Supplied Label Facts -->
    <div class="grid lg:grid-cols-2 gap-8 items-start">

      <!-- Column 1: Reference-Driven Product FAQ Assistant -->
      <section class="glass-surface p-6 rounded-3xl space-y-4" aria-label="Product FAQ Assistant">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div class="flex items-center gap-2">
            <span class="px-2 py-0.5 rounded bg-indigo-600/30 text-indigo-300 text-xs font-mono font-bold border border-indigo-500/30">FAQ</span>
            <h2 class="font-bold text-sm text-white">Product FAQ Assistant (Reference-Driven)</h2>
          </div>
          <span class="text-[10px] text-slate-400 font-mono bg-white/5 px-2 py-0.5 rounded">Non-AI · Reference Rev #${escapeHtml(revision)}</span>
        </div>

        <p class="text-xs text-slate-300 leading-relaxed">
          This assistant looks up verified entries from our approved reference dataset for <strong>${escapeHtml(ref.productVersion || 'the supplied label artwork')}</strong>. It does not use an autonomous generative language model and cannot provide medical advice.
        </p>

        <!-- Starter Question Buttons -->
        <div class="flex flex-wrap gap-1.5 pt-1">
          <button type="button" onclick="askPresetQuestion('What are the Vitamin B2, Vitamin B6, and Melatonin amounts on the label?')" class="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition">
            Vitamin B2, B6 &amp; Melatonin amounts?
          </button>
          <button type="button" onclick="askPresetQuestion('What is inside the 637 mg proprietary blend?')" class="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition">
            What is in the 637 mg blend?
          </button>
          <button type="button" onclick="askPresetQuestion('Are there independent clinical trials on this finished formula?')" class="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition">
            Clinical evidence status?
          </button>
          <button type="button" onclick="askPresetQuestion('What are the package prices and refund terms?')" class="text-[11px] px-2.5 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition">
            Prices &amp; refund policy?
          </button>
        </div>

        <!-- FAQ Conversation Log -->
        <div id="qaChatHistory" class="space-y-3 min-h-[160px] max-h-[340px] overflow-y-auto p-3.5 rounded-2xl bg-black/50 border border-white/10 text-xs text-slate-200">
          <div class="p-3 rounded-xl bg-white/5 border border-white/5 space-y-1">
            <span class="font-bold text-indigo-300 text-[11px] block">Product FAQ Assistant (Reference Rev #${escapeHtml(revision)}):</span>
            <p>Ask about the supplied Supplement Facts panel (Vitamin B2, Vitamin B6, Melatonin, the 637 mg Proprietary Blend, or Other Ingredients), serving size, manufacturer details, or what to check regarding current pricing and refund policies.</p>
          </div>
        </div>

        <!-- Question Input Form -->
        <form id="qaForm" class="space-y-2" onsubmit="submitQuestion(event)">
          <div class="flex gap-2">
            <label for="qaInput" class="sr-only">Ask a product reference question</label>
            <input id="qaInput" type="text" placeholder="Ask about label ingredients, amounts, or policies..." class="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500" maxlength="400" required>
            <button id="qaSubmitBtn" type="submit" class="px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-xs transition">
              Lookup
            </button>
          </div>
          <span class="text-[10px] text-slate-400 block">
            Answers are retrieved strictly from the versioned product reference. Not medical or pharmacological advice.
          </span>
        </form>
      </section>

      <!-- Column 2: Supplied Supplement Facts & Provenance -->
      <section class="glass-surface p-6 rounded-3xl space-y-4" aria-label="Supplied Supplement Facts">
        <div class="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-3">
          <div>
            <h2 class="font-bold text-sm text-white">Supplied Supplement Facts Panel</h2>
            <span class="text-[10px] text-slate-400 font-mono block">Version: ${escapeHtml(ref.productVersion || 'Supplied Label Artwork')} · Observed: ${escapeHtml(ref.observedAt || '2026-11-14')}</span>
          </div>
          <a href="${escapeHtml(ref.primarySourceAsset || '/images/yusleep-supplement-facts.jpg')}" target="_blank" rel="noopener noreferrer" class="text-[11px] font-mono text-indigo-300 hover:text-indigo-200 underline">
            Inspect Supplied Artwork
          </a>
        </div>

        <div class="text-xs text-slate-300 space-y-1 bg-black/30 p-3 rounded-xl border border-white/5">
          <div><strong>Serving Size:</strong> ${escapeHtml(sd.servingSize || '2 mL (2 full droppers)')}</div>
          <div><strong>Servings Per Bottle:</strong> ${escapeHtml(sd.servingsPerContainer || 'Approx. 30')} (${escapeHtml(sd.containerSize || '2 fl. oz. / 60 ml')})</div>
          <div class="text-[11px] text-amber-300/90 pt-1">${escapeHtml(sd.directionsAndTiming || '')}</div>
        </div>

        <!-- Disclosed Nutrients List -->
        <div class="space-y-2 text-xs">
          ${ingredients.map((ing) => {
            if (Array.isArray(ing.ingredients) && ing.ingredients.length > 0) {
              return `
              <div class="p-3 rounded-xl bg-black/40 border border-white/10 space-y-1.5">
                <div class="flex justify-between items-center">
                  <span class="font-bold text-slate-100">${escapeHtml(ing.name)}</span>
                  <span class="font-mono text-indigo-300 font-bold">${escapeHtml(ing.totalAmount || ing.amount)} (${escapeHtml(ing.dailyValue || '*')})</span>
                </div>
                <p class="text-[11px] text-slate-300 leading-relaxed">
                  <strong>Listed Blend Ingredients:</strong> ${escapeHtml(ing.ingredients.join(', '))}
                </p>
                <p class="text-[11px] text-amber-300/90">
                  ${escapeHtml(ing.disclosureNote || '')}
                </p>
                <span class="text-[10px] text-slate-500 font-mono block">
                  Source: ${escapeHtml(ing.source)} · Status: ${escapeHtml(ing.verificationStatus)}
                </span>
              </div>
              `;
            }
            return `
            <div class="flex justify-between items-start py-2 border-b border-white/10 gap-2">
              <div>
                <span class="text-slate-200 font-medium">${escapeHtml(ing.name)}</span>
                ${ing.chemicalForm ? `<span class="text-slate-400 text-[11px]"> (${escapeHtml(ing.chemicalForm)})</span>` : ''}
                <span class="block text-[10px] text-slate-500 font-mono">Source: ${escapeHtml(ing.source)}</span>
              </div>
              <span class="font-mono text-slate-100 shrink-0">${escapeHtml(ing.amount)} (${escapeHtml(ing.dailyValue)})</span>
            </div>
            `;
          }).join('')}
        </div>

        ${Array.isArray(otherIngs.list) && otherIngs.list.length > 0 ? `
        <div class="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-slate-300 space-y-1">
          <div><strong>Other Ingredients (as printed on supplied artwork):</strong> ${escapeHtml(otherIngs.list.join(', '))}</div>
          ${otherIngs.limitation ? `<div class="text-amber-300/90 text-[10px]">${escapeHtml(otherIngs.limitation)}</div>` : ''}
        </div>
        ` : ''}

        <div class="p-3 rounded-xl bg-black/30 border border-white/5 text-[11px] text-slate-300 space-y-1">
          <div><strong>Manufactured For (on label):</strong> ${escapeHtml(mfg.entity || "For Women's Health LLC")}, ${escapeHtml(mfg.address || '19C TROLLEYSQ, Wilmington, DE, 19801')} (${escapeHtml(mfg.websitePrintedOnLabel || 'www.getyusleep.com')})</div>
          <div><strong>Clinical Evidence Status:</strong> ${escapeHtml(clinical.statement || 'We have not verified independent clinical evidence for the finished formula.')}</div>
          <div><strong>Pricing &amp; Refund Status:</strong> ${escapeHtml(pricing.verificationStatus || 'UNVERIFIED_REQUIRES_CURRENT_MERCHANT_CHECK')} - ${escapeHtml(pricing.summary || '')}</div>
        </div>
      </section>

    </div>

  </main>

  <!-- Registration & Optional Marketing Consent Modal -->
  <div id="leadModal" role="dialog" aria-modal="true" aria-labelledby="leadModalTitle" class="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm hidden items-center justify-center p-4">
    <div class="glass-surface p-6 sm:p-8 rounded-3xl max-w-md w-full space-y-5 border border-white/15 shadow-2xl relative">
      <button type="button" onclick="closeLeadModal()" aria-label="Close registration modal" class="absolute top-4 right-4 text-slate-400 hover:text-white text-lg font-bold">✕</button>

      <div class="space-y-1.5">
        <span class="text-xs font-mono font-bold text-indigo-400 uppercase">Webinar Registration</span>
        <h3 id="leadModalTitle" class="text-lg font-bold text-white">${escapeHtml(reg.headline || 'Save Webinar Reference Notes & Optional Updates')}</h3>
        <p class="text-xs text-slate-300 leading-relaxed">
          ${escapeHtml(reg.description || 'Register your email for this product overview. Marketing emails are optional and separate from webinar registration.')}
        </p>
      </div>

      <form id="leadForm" onsubmit="submitLead(event)" class="space-y-4">
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1" for="leadName">First Name (Optional)</label>
          <input type="text" id="leadName" class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" placeholder="e.g. Alex" maxlength="100">
        </div>
        <div>
          <label class="block text-xs font-semibold text-slate-300 mb-1" for="leadEmail">Email Address (Required)</label>
          <input type="email" id="leadEmail" required class="w-full px-3 py-2 rounded-xl bg-slate-900 border border-white/15 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500" placeholder="you@example.com" maxlength="254">
        </div>

        <!-- Choice 1: Webinar Registration Request -->
        <div class="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-200 leading-normal">
          <input type="checkbox" id="leadRegistrationRequested" checked required class="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500">
          <label for="leadRegistrationRequested" class="cursor-pointer">
            ${escapeHtml(reg.registrationDisclosure || 'Save my webinar registration and reference summary request.')}
          </label>
        </div>

        <!-- Choice 2: Separate Optional Marketing Consent -->
        <div class="flex items-start gap-2.5 p-3 rounded-xl bg-white/5 border border-white/10 text-[11px] text-slate-300 leading-normal">
          <input type="checkbox" id="leadMarketingConsent" class="mt-0.5 rounded border-slate-700 text-indigo-600 focus:ring-indigo-500">
          <label for="leadMarketingConsent" class="cursor-pointer">
            ${escapeHtml(reg.marketingConsentText || 'Optional: I agree to receive email updates and product analysis notices. I can unsubscribe at any time.')}
            <a href="${escapeHtml(reg.privacyPolicyUrl || '/privacy')}" target="_blank" rel="noopener noreferrer" class="text-indigo-400 underline ml-1">Privacy Policy</a> (Consent Version: ${escapeHtml(reg.consentVersion || '2026-11-14.v2')}).
          </label>
        </div>

        <button type="submit" id="leadSubmitBtn" class="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs shadow-lg shadow-indigo-600/30 transition">
          Save Registration Preferences
        </button>

        <div id="leadStatusBox" class="p-3 rounded-xl text-xs hidden space-y-1"></div>
      </form>
    </div>
  </div>

  <!-- Footer Disclosures -->
  <footer class="border-t border-white/10 bg-slate-950 py-10 text-xs text-slate-400 space-y-4">
    <div class="max-w-6xl mx-auto px-4 space-y-4">
      <div class="space-y-2 border-b border-white/10 pb-4">
        <h4 class="font-bold text-slate-300 text-xs uppercase tracking-wider">Affiliate, Dietary Supplement &amp; AI Presenter Disclosures</h4>
        <p class="leading-relaxed">
          <strong>Affiliate Disclosure:</strong> This recorded overview is published by an independent affiliate. If you purchase through our affiliate link, we may earn a commission at no extra cost to you.
        </p>
        <p class="leading-relaxed">
          <strong>Dietary Supplement Disclaimer:</strong> Statements regarding dietary supplements have not been evaluated by the Food and Drug Administration. This product is not intended to diagnose, treat, cure, or prevent any disease. Ingredient studies do not establish the clinical efficacy of the finished combined product. Consult a physician or pharmacist before taking any supplement.
        </p>
        <p class="leading-relaxed">
          <strong>AI Presenter &amp; FAQ Disclosure:</strong> The presenter in this video is an original fictional AI character with synthesized voice narration. The Product FAQ Assistant retrieves entries from our versioned reference dataset and does not provide medical advice.
        </p>
      </div>

      <div class="flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
        <span>&copy; 2026 Independent Product Overview. All Rights Reserved.</span>
        <div class="flex items-center gap-4">
          <a href="/privacy" rel="noopener noreferrer" class="hover:text-slate-300 underline">Privacy Policy</a>
          <a href="/terms" rel="noopener noreferrer" class="hover:text-slate-300 underline">Terms of Service</a>
          <a href="${escapeHtml(trackedDestinationUrl)}" target="_blank" rel="noopener noreferrer" class="hover:text-slate-300 underline">Merchant Presentation &amp; Official Terms</a>
        </div>
      </div>
    </div>
  </footer>

  <!-- Client Telemetry, Timed CTA & FAQ Script -->
  <script>
    const SLUG = ${JSON.stringify(slug)};
    const VIEWER_CONTEXT_TOKEN = ${JSON.stringify(viewerContextToken)};
    const SESSION_ID = ${JSON.stringify(sessionId)};
    const VIDEO_DURATION_SEC = ${JSON.stringify(Number(v.durationSeconds) || 30)};
    const CTA_REVEAL_SECONDS = ${JSON.stringify(Number(c.revealSeconds) || 15)};
    const HIDE_CTA_UNTIL_REVEALED = ${JSON.stringify(Boolean(c.hideUntilRevealed))};

    // Strip any ?preview=... query token from the address bar immediately so it cannot be leaked or shoulder-surfed
    if (window.location.search && window.location.search.includes('preview=')) {
      try {
        const cleanUrl = window.location.pathname;
        window.history.replaceState({}, document.title, cleanUrl);
      } catch (e) {}
    }

    const video = document.getElementById('webinarVideo');
    const ctaContainer = document.getElementById('ctaContainer');
    const ctaLink = document.getElementById('ctaAffiliateLink');
    const playerStateText = document.getElementById('playerStateText');
    const watchedTimeCounter = document.getElementById('watchedTimeCounter');
    const ctaCountdownStatus = document.getElementById('ctaCountdownStatus');

    let eventCounter = 0;
    let ctaRevealed = !HIDE_CTA_UNTIL_REVEALED;
    let verifiedUniqueWatchedSec = 0;

    // Interval tracking state
    let isPlaying = false;
    let segmentMediaStart = null;
    let segmentWallStartMs = null;

    function nextEventId(prefix) {
      eventCounter += 1;
      return prefix + '_' + SESSION_ID + '_' + eventCounter + '_' + Date.now();
    }

    async function sendTrackingEvent(eventType, extra = {}) {
      const payload = {
        eventId: nextEventId(eventType),
        sessionId: SESSION_ID,
        eventType,
        visibilityState: document.visibilityState || 'visible',
        ...extra
      };
      try {
        const res = await fetch('/api/webinars/' + encodeURIComponent(SLUG) + '/track', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Viewer-Context': VIEWER_CONTEXT_TOKEN
          },
          body: JSON.stringify(payload)
        });
        const data = await res.json();
        if (data && data.ok && data.sessionMetrics) {
          verifiedUniqueWatchedSec = Number(data.sessionMetrics.uniqueWatchedSeconds) || 0;
          updateWatchUi();
        }
      } catch (e) {}
    }

    function updateWatchUi() {
      if (watchedTimeCounter) {
        watchedTimeCounter.textContent = verifiedUniqueWatchedSec.toFixed(1) + 's';
      }
      if (!ctaRevealed && verifiedUniqueWatchedSec >= CTA_REVEAL_SECONDS) {
        ctaRevealed = true;
        ctaContainer.classList.remove('hidden');
        if (ctaCountdownStatus) {
          ctaCountdownStatus.textContent = 'Offer link unlocked below';
        }
        sendTrackingEvent('cta_impression');
      } else if (!ctaRevealed && ctaCountdownStatus) {
        const rem = Math.max(0, CTA_REVEAL_SECONDS - verifiedUniqueWatchedSec).toFixed(1);
        ctaCountdownStatus.textContent = 'Watch ' + rem + 's more to unlock offer link';
      }
    }

    function flushActiveWatchSegment(currentMediaPos) {
      if (segmentMediaStart === null || segmentWallStartMs === null) return;
      const start = segmentMediaStart;
      const end = Number(currentMediaPos);
      const elapsedWallMs = Date.now() - segmentWallStartMs;
      const rate = video.playbackRate || 1.0;

      // Reset segment start to current position
      segmentMediaStart = end;
      segmentWallStartMs = Date.now();

      const delta = end - start;
      // Only send valid forward playback segments (between 0.25s and 12s) that match wall time
      if (delta >= 0.25 && delta <= 12 && elapsedWallMs >= 150) {
        const maxPlausible = ((elapsedWallMs / 1000) * rate) + 1.5;
        if (delta <= maxPlausible) {
          sendTrackingEvent('watch_interval', {
            intervalStart: Number(start.toFixed(2)),
            intervalEnd: Number(end.toFixed(2)),
            elapsedWallMs,
            playbackRate: rate
          });
        }
      }
    }

    // 1. Record initial pageview
    sendTrackingEvent('pageview');

    // 2. Video player lifecycle events
    video.addEventListener('play', () => {
      isPlaying = true;
      segmentMediaStart = video.currentTime;
      segmentWallStartMs = Date.now();
      if (playerStateText) playerStateText.textContent = 'Playing';
      sendTrackingEvent('playback_start');
    });

    video.addEventListener('waiting', () => {
      if (playerStateText) playerStateText.textContent = 'Buffering...';
    });

    video.addEventListener('playing', () => {
      isPlaying = true;
      if (segmentMediaStart === null) {
        segmentMediaStart = video.currentTime;
        segmentWallStartMs = Date.now();
      }
      if (playerStateText) playerStateText.textContent = 'Playing';
    });

    video.addEventListener('pause', () => {
      if (isPlaying) {
        flushActiveWatchSegment(video.currentTime);
      }
      isPlaying = false;
      segmentMediaStart = null;
      segmentWallStartMs = null;
      if (playerStateText && !video.ended) playerStateText.textContent = 'Paused';
    });

    video.addEventListener('seeking', () => {
      // Do NOT count the seek jump as a watched interval; reset segment anchor on seeked
      segmentMediaStart = null;
      segmentWallStartMs = null;
    });

    video.addEventListener('seeked', () => {
      sendTrackingEvent('seek', { currentTime: Number(video.currentTime.toFixed(2)) });
      if (!video.paused) {
        segmentMediaStart = video.currentTime;
        segmentWallStartMs = Date.now();
      }
    });

    video.addEventListener('ratechange', () => {
      if (isPlaying) {
        flushActiveWatchSegment(video.currentTime);
      }
    });

    video.addEventListener('ended', () => {
      if (isPlaying) {
        flushActiveWatchSegment(video.duration || VIDEO_DURATION_SEC);
      }
      isPlaying = false;
      segmentMediaStart = null;
      segmentWallStartMs = null;
      if (playerStateText) playerStateText.textContent = 'Completed';
    });

    video.addEventListener('error', () => {
      if (playerStateText) playerStateText.textContent = 'Video Unavailable / Error';
    });

    // Periodic 2.5-second interval flush while actively playing
    setInterval(() => {
      if (isPlaying && !video.paused && !video.ended && segmentMediaStart !== null) {
        flushActiveWatchSegment(video.currentTime);
      }
    }, 2500);

    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden' && isPlaying) {
        flushActiveWatchSegment(video.currentTime);
        segmentMediaStart = null;
        segmentWallStartMs = null;
      } else if (document.visibilityState === 'visible' && !video.paused && !video.ended) {
        segmentMediaStart = video.currentTime;
        segmentWallStartMs = Date.now();
      }
    });

    if (ctaLink) {
      ctaLink.addEventListener('click', () => {
        sendTrackingEvent('cta_click');
      });
    }

    // 3. Product FAQ Assistant (Reference-Driven, Safe DOM Building)
    function askPresetQuestion(q) {
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

      const userBubble = document.createElement('div');
      userBubble.className = 'p-2.5 rounded-xl bg-indigo-600/20 border border-indigo-500/30 text-indigo-100 text-right';
      userBubble.textContent = q;
      history.appendChild(userBubble);

      input.value = '';
      submitBtn.disabled = true;
      submitBtn.textContent = 'Checking...';
      history.scrollTop = history.scrollHeight;

      try {
        const res = await fetch('/api/webinars/' + encodeURIComponent(SLUG) + '/qa', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Viewer-Context': VIEWER_CONTEXT_TOKEN
          },
          body: JSON.stringify({ question: q })
        });
        const data = await res.json();

        const replyBubble = document.createElement('div');
        replyBubble.className = 'p-3 rounded-xl bg-white/5 border border-white/10 space-y-1.5';

        const headerSpan = document.createElement('span');
        headerSpan.className = 'font-bold text-indigo-300 text-[11px] block';
        headerSpan.textContent = (data.assistantLabel || 'Product FAQ Assistant') + ' (Rev #' + (data.referenceRevision || '') + '):';
        replyBubble.appendChild(headerSpan);

        const bodyP = document.createElement('p');
        bodyP.className = 'leading-relaxed whitespace-pre-line';
        bodyP.textContent = data.ok ? data.answer : (data.error || 'Unable to retrieve reference answer.');
        replyBubble.appendChild(bodyP);

        if (data.ok && Array.isArray(data.citations) && data.citations.length > 0) {
          const citeBox = document.createElement('div');
          citeBox.className = 'text-[10px] text-slate-400 font-mono pt-1 border-t border-white/5 space-y-0.5';
          data.citations.forEach((cit) => {
            const line = document.createElement('div');
            line.textContent = 'Source: ' + cit.title + ' (' + cit.source + ', observed ' + cit.observedAt + ', status: ' + cit.verificationStatus + ')';
            citeBox.appendChild(line);
          });
          replyBubble.appendChild(citeBox);
        }

        history.appendChild(replyBubble);
      } catch (err) {
        const errBubble = document.createElement('div');
        errBubble.className = 'p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-300';
        errBubble.textContent = 'Network error while querying reference assistant.';
        history.appendChild(errBubble);
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Lookup';
        history.scrollTop = history.scrollHeight;
      }
    }

    // 4. Registration Modal
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
      const registrationRequested = document.getElementById('leadRegistrationRequested').checked;
      const marketingConsentGiven = document.getElementById('leadMarketingConsent').checked;
      const statusBox = document.getElementById('leadStatusBox');
      const submitBtn = document.getElementById('leadSubmitBtn');

      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving Registration...';
      statusBox.className = 'p-3 rounded-xl text-xs block bg-white/5 text-slate-300 border border-white/10';
      statusBox.textContent = 'Recording registration and consent preferences...';

      try {
        const res = await fetch('/api/webinars/' + encodeURIComponent(SLUG) + '/register', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Viewer-Context': VIEWER_CONTEXT_TOKEN
          },
          body: JSON.stringify({
            email,
            name,
            registrationRequested,
            marketingConsentGiven
          })
        });
        const data = await res.json();
        if (res.ok && data.ok) {
          const isWarn = data.brevoStatus === 'FAILED' || data.brevoStatus === 'CONTACT_SYNC_QUEUED';
          statusBox.className = isWarn
            ? 'p-3 rounded-xl text-xs block bg-amber-500/10 text-amber-200 border border-amber-500/30 space-y-1'
            : 'p-3 rounded-xl text-xs block bg-emerald-500/10 text-emerald-200 border border-emerald-500/30 space-y-1';
          statusBox.textContent = '';

          const msgP = document.createElement('div');
          msgP.className = 'font-semibold';
          msgP.textContent = data.message;
          statusBox.appendChild(msgP);

          const metaP = document.createElement('div');
          metaP.className = 'text-[10px] font-mono opacity-85';
          metaP.textContent = 'Status: ' + data.brevoStatus + ' · Consent Version: ' + data.consentVersion;
          statusBox.appendChild(metaP);
        } else {
          statusBox.className = 'p-3 rounded-xl text-xs block bg-red-500/10 text-red-300 border border-red-500/30';
          statusBox.textContent = data.error || 'Registration failed.';
        }
      } catch (err) {
        statusBox.className = 'p-3 rounded-xl text-xs block bg-red-500/10 text-red-300 border border-red-500/30';
        statusBox.textContent = 'Network error while saving registration.';
      } finally {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save Registration Preferences';
      }
    }
  </script>
</body>
</html>`;
}

module.exports = {
  renderWebinarViewer
};
