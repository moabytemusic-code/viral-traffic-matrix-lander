// High-Quality Technical & Affiliate-Powered Article Renderer
// Renders responsive, fast-loading, SEO-optimized cluster articles with embedded video, Amazon hardware cards, ClickBank CTAs, and Brevo lead capture.

function renderArticle(article, options = {}) {
  const reqHost = options.reqHost || 'traffic.aisimplesystem.com';
  const amazonTag = article.amazonTag || 'santa101-20';

  const amazonSearchUrl = (query) =>
    `https://www.amazon.com/s?k=${encodeURIComponent(query)}&tag=${encodeURIComponent(amazonTag)}`;

  return `<!DOCTYPE html>
<html lang="en" class="dark scroll-smooth">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${article.title} | Smart Home Resilience</title>
  <meta name="description" content="${article.subtitle}">
  
  <!-- OpenGraph / Social Meta -->
  <meta property="og:title" content="${article.title}">
  <meta property="og:description" content="${article.subtitle}">
  <meta property="og:type" content="article">
  <meta property="og:image" content="https://${reqHost}${article.thumbnailUrl}">
  <meta property="og:url" content="https://${reqHost}/guides/${article.slug}">
  <meta name="twitter:card" content="summary_large_image">

  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap" rel="stylesheet">

  <style>
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #030712;
      color: #e2e8f0;
      line-height: 1.75;
    }
    .font-mono-code { font-family: 'JetBrains Mono', monospace; }
    .glass-surface {
      background: rgba(15, 23, 42, 0.75);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255, 255, 255, 0.08);
    }
    .prose-custom h2 {
      font-size: 1.75rem;
      font-weight: 800;
      color: #f8fafc;
      margin-top: 2.5rem;
      margin-bottom: 1rem;
      letter-spacing: -0.02em;
      border-bottom: 1px solid rgba(255, 255, 255, 0.08);
      padding-bottom: 0.5rem;
    }
    .prose-custom h3 {
      font-size: 1.35rem;
      font-weight: 700;
      color: #fef08a;
      margin-top: 1.75rem;
      margin-bottom: 0.75rem;
    }
    .prose-custom p {
      margin-bottom: 1.25rem;
      color: #cbd5e1;
      font-size: 1.05rem;
    }
    .prose-custom ul, .prose-custom ol {
      margin-bottom: 1.5rem;
      padding-left: 1.5rem;
      color: #cbd5e1;
    }
    .prose-custom li {
      margin-bottom: 0.5rem;
    }
    .callout-box {
      border-left: 4px solid #f59e0b;
      background: rgba(245, 158, 11, 0.08);
      padding: 1.25rem 1.5rem;
      border-radius: 0 1rem 1rem 0;
      margin: 2rem 0;
    }
    .hardware-card {
      transition: all 0.2s ease;
    }
    .hardware-card:hover {
      border-color: rgba(245, 158, 11, 0.5);
      transform: translateY(-2px);
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.5);
    }
  </style>

  <!-- Structured Data JSON-LD for Google & AI Search Engines -->
  <script type="application/ld+json">
  {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    "headline": "${article.title}",
    "description": "${article.subtitle}",
    "image": "https://${reqHost}${article.thumbnailUrl}",
    "datePublished": "${article.publishedAt}",
    "author": {
      "@type": "Person",
      "name": "${article.author.name}",
      "url": "${article.author.channelUrl}"
    },
    "publisher": {
      "@type": "Organization",
      "name": "Smart Home Resilience",
      "logo": {
        "@type": "ImageObject",
        "url": "https://${reqHost}/thumbnails/power-thumbnail.jpg"
      }
    }
  }
  </script>
</head>
<body class="selection:bg-amber-500 selection:text-black">

  <!-- Top Progress Bar -->
  <div id="read-progress" class="fixed top-0 left-0 h-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-emerald-400 z-50 transition-all duration-75" style="width: 0%"></div>

  <!-- Navigation Bar -->
  <header class="sticky top-0 z-40 glass-surface border-b border-white/10">
    <div class="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
      <a href="/" class="flex items-center gap-3">
        <span class="w-8 h-8 rounded-lg bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-black font-black text-sm shadow-lg shadow-amber-500/30">⚡</span>
        <span class="font-bold text-white tracking-tight text-sm sm:text-base">Smart Home Resilience</span>
      </a>
      <div class="flex items-center gap-3">
        <a href="/guides" class="text-xs sm:text-sm text-slate-300 hover:text-white transition">All Guides</a>
        <a href="/power" class="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold text-xs sm:text-sm hover:bg-amber-500/30 transition">
          ⚡ Sizing Blueprint
        </a>
      </div>
    </div>
  </header>

  <main class="max-w-4xl mx-auto px-4 sm:px-6 py-10 sm:py-16">
    <!-- Category & Metadata Header -->
    <div class="mb-8">
      <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-mono-code font-bold tracking-wider mb-4">
        <span>⚡</span> ${article.categoryBadge}
      </div>
      <h1 class="text-3xl sm:text-4xl md:text-5xl font-black text-white tracking-tight leading-[1.15] mb-5">
        ${article.title}
      </h1>
      <p class="text-lg sm:text-xl text-slate-300 leading-relaxed font-normal mb-6">
        ${article.subtitle}
      </p>

      <!-- Author Bio Pill -->
      <div class="flex flex-wrap items-center gap-4 py-4 border-y border-white/10 text-xs sm:text-sm text-slate-400">
        <div class="flex items-center gap-2">
          <span class="w-7 h-7 rounded-full bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-300 font-bold">🛠️</span>
          <span class="text-slate-200 font-semibold">${article.author.name}</span>
        </div>
        <span>•</span>
        <span>⏱️ ${article.readTime}</span>
        <span>•</span>
        <span>Verified Engineering Protocol</span>
      </div>
    </div>

    <!-- Embedded High-Converting Remotion 9:16 Video Player Card -->
    <div class="glass-surface rounded-2xl p-4 sm:p-6 mb-12 border border-amber-500/30 bg-gradient-to-b from-amber-500/5 to-transparent">
      <div class="flex flex-col md:flex-row items-center gap-6">
        <div class="relative w-full max-w-[260px] aspect-[9/16] rounded-xl overflow-hidden shadow-2xl border border-white/10 bg-black flex-shrink-0">
          <video
            id="article-video"
            src="${article.videoUrl}"
            poster="${article.thumbnailUrl}"
            playsinline
            loop
            muted
            autoplay
            class="w-full h-full object-cover"
          ></video>
          <button
            id="unmute-btn"
            class="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-full bg-black/85 text-amber-300 border border-amber-500/50 text-[11px] font-bold tracking-wider uppercase backdrop-blur-md flex items-center gap-1.5 shadow-lg"
          >
            <span>🔇</span> Tap for Sound
          </button>
        </div>
        <div class="flex-1 text-center md:text-left">
          <span class="px-2.5 py-1 rounded-md bg-amber-500/20 text-amber-300 text-xs font-mono-code font-bold">FEATURED VIDEO BLUEPRINT</span>
          <h3 class="text-xl sm:text-2xl font-black text-white mt-2 mb-2">Watch: The 60-Second Off-Grid Power Sizing Secret</h3>
          <p class="text-sm text-slate-300 mb-4 leading-relaxed">
            See how a compact 12V LiFePO4 battery paired with an inline ANL fuse powers a 120V household compressor without tripping the breaker.
          </p>
          <div class="flex flex-wrap items-center gap-3 justify-center md:justify-start">
            <a
              href="${article.clickbankUrl}"
              target="_blank"
              rel="noopener noreferrer"
              class="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-xs sm:text-sm shadow-lg shadow-amber-500/25 hover:brightness-110 transition flex items-center gap-2"
            >
              <span>⚡</span> Get Complete Video Course (75% Off)
            </a>
            <a
              href="#hardware-list"
              class="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-xs sm:text-sm font-semibold transition"
            >
              Jump to Parts List ↓
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Article Body Content -->
    <article class="prose-custom max-w-none">
      
      <h2>1. The Reality of Modern Grid Fragility</h2>
      <p>
        Across North America and Europe, the residential electric grid is operating under higher thermal stress and aging infrastructure than at any point in modern history. Extreme weather events, wildfire preventive shutoffs (PSPS), and summer heatwaves routinely trigger brownouts. Yet millions of homeowners remain completely unprepared—relying solely on grocery store ice bags or noisy, expensive gas generators that require fresh stabilized fuel.
      </p>
      <p>
        Commercial rooftop solar systems cost upwards of <strong>$25,000 to $40,000</strong>. Worse, standard grid-tied solar panels shut down automatically during an outage for safety lineman protocols, leaving homeowners literally in the dark despite having panels on their roof.
      </p>
      <p>
        The solution is not high-voltage rooftop contracting. The solution is a <strong>modular, localized, 12-volt low-voltage energy storage system</strong> that can be assembled on a workbench in under 45 minutes for less than $200.
      </p>

      <div class="callout-box">
        <p class="font-bold text-amber-300 mb-1">⚡ Engineering Rule #1: The Starting Wattage Trap</p>
        <p class="text-sm text-slate-200 mb-0">
          A modern Energy Star refrigerator only consumes <strong>120 to 180 running watts</strong>. However, the induction compressor motor draws a sudden instantaneous surge of <strong>600 to 1,000 starting watts</strong> for approximately 1.5 seconds when kicking on. Sizing your inverter for running watts alone will trip the circuit every single time.
        </p>
      </div>

      <h2>2. Calculating Your Emergency Blackout Power Budget</h2>
      <p>
        To size your battery bank accurately without overspending, calculate your daily watt-hour (Wh) demand using the standard electrical formula:
      </p>
      <div class="p-4 rounded-xl bg-black/60 border border-white/10 font-mono-code text-sm text-amber-300 mb-6">
        Daily Watt-Hours (Wh) = Operating Watts × Hours Used Per Day
      </div>
      <p>
        Here is a realistic emergency blackout load schedule for an average household:
      </p>
      <div class="overflow-x-auto mb-8">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-white/10 text-slate-400 font-mono-code text-xs uppercase">
              <th class="py-3 px-4">Essential Appliance</th>
              <th class="py-3 px-4">Surge (Watts)</th>
              <th class="py-3 px-4">Running (Watts)</th>
              <th class="py-3 px-4">Hours / Day</th>
              <th class="py-3 px-4">Daily Wh</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-slate-300">
            <tr>
              <td class="py-3 px-4 font-semibold text-white">Full-Size Refrigerator (Cycle)</td>
              <td class="py-3 px-4">800W</td>
              <td class="py-3 px-4">150W</td>
              <td class="py-3 px-4">6 hrs (duty cycle)</td>
              <td class="py-3 px-4 text-emerald-400 font-bold">900 Wh</td>
            </tr>
            <tr>
              <td class="py-3 px-4 font-semibold text-white">Medical CPAP Machine (No heat)</td>
              <td class="py-3 px-4">60W</td>
              <td class="py-3 px-4">40W</td>
              <td class="py-3 px-4">8 hrs</td>
              <td class="py-3 px-4 text-emerald-400 font-bold">320 Wh</td>
            </tr>
            <tr>
              <td class="py-3 px-4 font-semibold text-white">Wi-Fi Router & Modem</td>
              <td class="py-3 px-4">25W</td>
              <td class="py-3 px-4">20W</td>
              <td class="py-3 px-4">12 hrs</td>
              <td class="py-3 px-4 text-emerald-400 font-bold">240 Wh</td>
            </tr>
            <tr>
              <td class="py-3 px-4 font-semibold text-white">Emergency LED Room Lights (x2)</td>
              <td class="py-3 px-4">18W</td>
              <td class="py-3 px-4">18W</td>
              <td class="py-3 px-4">6 hrs</td>
              <td class="py-3 px-4 text-emerald-400 font-bold">108 Wh</td>
            </tr>
            <tr>
              <td class="py-3 px-4 font-semibold text-white">Smartphones & Radios (x2)</td>
              <td class="py-3 px-4">25W</td>
              <td class="py-3 px-4">25W</td>
              <td class="py-3 px-4">3 hrs</td>
              <td class="py-3 px-4 text-emerald-400 font-bold">75 Wh</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        <strong>Total Emergency Baseline Requirement: ~1,200 to 1,600 Watt-Hours (Wh) per 24-hour cycle.</strong>
      </p>

      <h2>3. Battery Chemistry Face-Off: LiFePO4 vs. Lead-Acid AGM</h2>
      <p>
        For decades, DIY builders relied on heavy lead-acid or AGM marine batteries. In 2026, building an emergency power box with lead-acid is an expensive mistake:
      </p>
      <div class="overflow-x-auto mb-8">
        <table class="w-full text-left border-collapse text-sm">
          <thead>
            <tr class="border-b border-white/10 text-slate-400 font-mono-code text-xs uppercase">
              <th class="py-3 px-4">Metric</th>
              <th class="py-3 px-4 text-amber-300 font-bold">Lithium Iron Phosphate (LiFePO4)</th>
              <th class="py-3 px-4 text-slate-400">Traditional Lead-Acid / AGM</th>
            </tr>
          </thead>
          <tbody class="divide-y divide-white/5 text-slate-300">
            <tr>
              <td class="py-3 px-4 font-semibold text-white">Usable Capacity (DoD)</td>
              <td class="py-3 px-4 text-emerald-400 font-bold">100% (No degradation risk)</td>
              <td class="py-3 px-4 text-rose-400">Only 50% (Discharging below 50% ruins cells)</td>
            </tr>
            <tr>
              <td class="py-3 px-4 font-semibold text-white">Cycle Lifespan</td>
              <td class="py-3 px-4 text-emerald-400 font-bold">4,000 - 6,000+ Full Cycles (10+ Years)</td>
              <td class="py-3 px-4 text-rose-400">300 - 500 Cycles (Fails after 2-3 years)</td>
            </tr>
            <tr>
              <td class="py-3 px-4 font-semibold text-white">Weight per 100Ah</td>
              <td class="py-3 px-4 text-emerald-400 font-bold">~22 lbs (Ultra-portable)</td>
              <td class="py-3 px-4 text-rose-400">~65 lbs (Extremely heavy)</td>
            </tr>
            <tr>
              <td class="py-3 px-4 font-semibold text-white">Safety & Thermal Runaway</td>
              <td class="py-3 px-4 text-emerald-400 font-bold">Chemical stability; zero fire/toxic gas hazard</td>
              <td class="py-3 px-4 text-rose-400">Emits toxic off-gassing hydrogen when charging</td>
            </tr>
          </tbody>
        </table>
      </div>
      <p>
        A single <strong>12V 100Ah LiFePO4 battery</strong> provides 1,280 watt-hours of usable energy in a package that weighs just 22 pounds and can sit safely in your hallway closet without toxic fumes.
      </p>

      <h2>4. Pure Sine Wave vs. Modified Sine Wave</h2>
      <p>
        When shopping for a 12V inverter, you will see $25 &ldquo;Modified Sine Wave&rdquo; models alongside $50 &ldquo;Pure Sine Wave&rdquo; units. <strong>Never purchase a modified sine wave inverter for home emergency backup.</strong>
      </p>
      <p>
        Modified sine wave inverters output electricity in choppy, blocky square waves. While fine for an incandescent work light, this harmonic distortion generates intense internal heat in AC compressor motors, CPAP power supplies, and variable-speed fan motors—frequently causing irreversible motor burnout within hours. A <strong>Pure Sine Wave Inverter</strong> replicates clean utility-grade AC grid electricity with zero electrical noise.
      </p>

      <!-- ClickBank Masterclass Feature Box -->
      <div class="my-10 p-6 sm:p-8 rounded-2xl glass-surface border-2 border-amber-500/50 bg-gradient-to-br from-amber-500/10 via-yellow-500/5 to-transparent shadow-2xl">
        <div class="flex items-center gap-2 text-amber-300 font-mono-code text-xs font-bold uppercase mb-2">
          <span>📚</span> Recommended Masterclass Blueprint
        </div>
        <h3 class="text-2xl sm:text-3xl font-black text-white mb-3">
          The Energy Revolution & Backyard Solar Blueprint
        </h3>
        <p class="text-slate-300 text-sm sm:text-base leading-relaxed mb-6">
          If you want the complete, comprehensive video walkthrough with full 3D diagrams, parts sourcing shortcuts, and wiring step-by-steps tested by over 42,000 self-reliant homeowners, watch the official briefing below:
        </p>
        <div class="flex flex-col sm:flex-row items-center gap-4">
          <a
            href="${article.clickbankUrl}"
            target="_blank"
            rel="noopener noreferrer"
            class="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-sm tracking-wide text-center shadow-lg shadow-amber-500/30 hover:brightness-110 transition"
          >
            👉 Watch The Complete Step-by-Step Video Blueprint (75% Off)
          </a>
          <span class="text-xs text-slate-400">Backed by 60-Day 100% Money-Back Guarantee</span>
        </div>
      </div>

      <h2 id="hardware-list">5. Verified Amazon Hardware Components List</h2>
      <p>
        All hardware components needed for this modular build can be sourced directly on Amazon for under $200 total. Every item below has been vetted for gauge safety and BMS compatibility:
      </p>

      <!-- Curated Amazon Hardware Cards Grid -->
      <div class="grid grid-cols-1 md:grid-cols-2 gap-4 my-8 not-prose">
        ${article.hardwareComponents
          .map(
            (comp) => `
          <div class="hardware-card glass-surface p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
            <div>
              <div class="flex items-center justify-between gap-2 mb-2">
                <span class="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 font-mono-code text-[11px] font-bold">HARDWARE PART</span>
                <span class="text-xs font-mono-code text-slate-400">${comp.priceEstimate}</span>
              </div>
              <h4 class="text-base font-bold text-white mb-2 leading-snug">${comp.name}</h4>
              <p class="text-xs text-slate-300 leading-relaxed mb-4">${comp.description}</p>
            </div>
            <a
              href="${amazonSearchUrl(comp.searchQuery)}"
              target="_blank"
              rel="noopener noreferrer"
              class="w-full py-2.5 px-4 rounded-xl bg-white/10 hover:bg-amber-500 hover:text-black text-white text-xs font-bold transition flex items-center justify-center gap-2 border border-white/10"
            >
              <span>🛒</span> View Rated Options on Amazon →
            </a>
          </div>
        `
          )
          .join('')}
      </div>

      <h2>6. The 4-Step Assembly Blueprint</h2>
      <ol>
        <li>
          <strong>Position in Ventilated Safety Enclosure:</strong> Place your 12V LiFePO4 battery inside a heavy-duty plastic battery box or rubberized toolbox. Secure the battery so terminals cannot shift.
        </li>
        <li>
          <strong>Install the Positive ANL Fuse Block:</strong> Mount the 100A–150A ANL fuse block directly onto or within 6 inches of the battery's positive (+) terminal post. This ensures that any accidental short circuit immediately blows the cheap sacrificial fuse instead of overheating the wiring.
        </li>
        <li>
          <strong>Connect Inverter Cables (Observe Polarity):</strong> Connect the negative (black) 4 AWG copper cable from the battery negative (-) terminal to the inverter negative (-) lug. Next, connect the positive (red) 4 AWG copper cable from the fuse output to the inverter positive (+) lug. Tighten all nuts firmly with a wrench to eliminate high-resistance heat points.
        </li>
        <li>
          <strong>Power Up & Load Test:</strong> Flip the inverter switch ON. The digital display will show clean 120V AC output with zero audible noise. Plug in a heavy-duty 14 AWG extension cord leading to your refrigerator or essential power strip.
        </li>
      </ol>

      <!-- Brevo Email Lead Magnet Capture Form -->
      <div id="lead-box" class="my-12 p-6 sm:p-8 rounded-2xl glass-surface border border-emerald-500/40 bg-gradient-to-br from-emerald-500/10 to-transparent">
        <div class="flex items-center gap-2 text-emerald-400 font-mono-code text-xs font-bold uppercase mb-2">
          <span>📥</span> Free Instant Download
        </div>
        <h3 class="text-2xl font-black text-white mb-2">
          Get The Printable 1-Page Emergency Wiring Schematic & Appliance Sizing Sheet (PDF)
        </h3>
        <p class="text-sm text-slate-300 mb-5 leading-relaxed">
          Drop your email below to instantly receive the high-resolution printable wiring diagram, torque specifications, and blackout checklist directly to your inbox.
        </p>
        <form id="guide-subscribe-form" class="flex flex-col sm:flex-row gap-3">
          <input
            type="email"
            id="guide-email"
            placeholder="Enter your best email address..."
            required
            class="flex-1 h-12 px-4 rounded-xl bg-black/60 border border-white/15 text-sm text-white placeholder-slate-400 focus:outline-none focus:border-emerald-400"
          >
          <button
            type="submit"
            id="guide-submit-btn"
            class="h-12 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black font-black text-sm transition shadow-lg shadow-emerald-500/20 whitespace-nowrap"
          >
            Send Me The Free Blueprint PDF →
          </button>
        </form>
        <div id="guide-form-status" class="mt-3 text-xs font-semibold hidden"></div>
      </div>

      <h2>7. Frequently Asked Questions</h2>
      <h3>Can this system be charged with portable solar panels?</h3>
      <p>
        Yes. By connecting an inexpensive 20A MPPT or PWM solar charge controller between a 100W–200W solar panel and your battery terminals, the battery bank automatically recharges during daylight hours, creating a perpetual off-grid loop.
      </p>

      <h3>How long will a 100Ah battery keep my refrigerator cold?</h3>
      <p>
        A modern refrigerator drawing 150W running with a 33% duty cycle (running 20 minutes per hour) consumes roughly 50 watt-hours per hour. A 1,280Wh LiFePO4 battery safely powers the refrigerator for approximately <strong>22 to 26 hours</strong> on a single charge without any solar input.
      </p>

      <h3>Is it safe to keep this battery indoors?</h3>
      <p>
        Yes. Unlike automotive flooded lead-acid batteries that release explosive hydrogen gas while charging, LiFePO4 (Lithium Iron Phosphate) cells do not off-gas and feature a built-in Battery Management System (BMS) that automatically shuts off the unit if overcharged, over-discharged, or short-circuited.
      </p>

      <div class="mt-12 pt-8 border-t border-white/10 text-center">
        <a
          href="${article.clickbankUrl}"
          target="_blank"
          rel="noopener noreferrer"
          class="inline-flex items-center gap-2 px-8 py-4 rounded-xl bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-base shadow-xl shadow-amber-500/25 hover:brightness-110 transition"
        >
          <span>⚡</span> Unlock The Full Video Course & Schematics (Backyard Revolution)
        </a>
        <p class="text-xs text-slate-400 mt-3">
          Affiliate Disclosure: This guide contains affiliate links. When you purchase through our links, we may earn a small commission at zero additional cost to you.
        </p>
      </div>

    </article>
  </main>

  <footer class="border-t border-white/10 py-10 mt-20 text-center text-xs text-slate-500">
    <div class="max-w-6xl mx-auto px-4">
      <p class="mb-2">© 2026 Smart Home Resilience. All rights reserved.</p>
      <p>Educational engineering and self-reliance reference only. Follow all local building and electrical safety codes.</p>
    </div>
  </footer>

  <script>
    // Reading Progress Indicator
    window.addEventListener('scroll', () => {
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      const progress = docHeight > 0 ? (window.scrollY / docHeight) * 100 : 0;
      document.getElementById('read-progress').style.width = progress + '%';
    });

    // Video Unmute / Mute Button
    const video = document.getElementById('article-video');
    const unmuteBtn = document.getElementById('unmute-btn');
    if (video && unmuteBtn) {
      unmuteBtn.addEventListener('click', () => {
        video.muted = !video.muted;
        unmuteBtn.innerHTML = video.muted ? '<span>🔇</span> Tap for Sound' : '<span>🔊</span> Sound Active';
      });
    }

    // Brevo Lead Capture Submission
    const form = document.getElementById('guide-subscribe-form');
    const emailInput = document.getElementById('guide-email');
    const btn = document.getElementById('guide-submit-btn');
    const status = document.getElementById('guide-form-status');

    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const email = emailInput.value.trim();
        if (!email) return;

        btn.disabled = true;
        btn.innerText = 'Delivering PDF...';

        try {
          const res = await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email,
              offerSlug: '${article.offerSlug}',
              sponsorCode: 'kmtwarrior'
            })
          });
          const data = await res.json();
          status.classList.remove('hidden');

          if (data.ok) {
            status.className = 'mt-3 text-xs font-semibold text-emerald-400';
            status.innerText = '✅ Success! Blueprint PDF sent to your inbox. Forwarding to video masterclass...';
            setTimeout(() => {
              window.open('${article.clickbankUrl}', '_blank');
            }, 1200);
          } else {
            status.className = 'mt-3 text-xs font-semibold text-amber-300';
            status.innerText = 'Notice: ' + (data.message || 'Already registered! Opening masterclass...');
            setTimeout(() => {
              window.open('${article.clickbankUrl}', '_blank');
            }, 1200);
          }
        } catch (err) {
          status.classList.remove('hidden');
          status.className = 'mt-3 text-xs font-semibold text-amber-300';
          status.innerText = 'Opening blueprint...';
          window.open('${article.clickbankUrl}', '_blank');
        } finally {
          btn.disabled = false;
          btn.innerText = 'Send Me The Free Blueprint PDF →';
        }
      });
    }
  </script>
</body>
</html>`;
}

module.exports = { renderArticle };
