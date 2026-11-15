// Mobile-First Creator Link-in-Bio Renderer (Optimized for YouTube Shorts Monetization Playbook)
// Converts raw short-form attention into owned email assets and high-commission affiliate revenue.

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const THEMES = {
  emerald: {
    accent: '#10b981',
    accentText: 'text-emerald-400',
    accentBg: 'rgba(16, 185, 129, 0.15)',
    accentBorder: 'rgba(16, 185, 129, 0.35)',
    primaryGradient: 'linear-gradient(135deg, #10b981 0%, #059669 50%, #047857 100%)',
    primaryGlow: 'rgba(16, 185, 129, 0.45)',
    orb1: 'rgba(16, 185, 129, 0.18)',
    orb2: 'rgba(6, 182, 212, 0.12)',
    badgeBg: 'rgba(16, 185, 129, 0.2)',
    badgeBorder: 'rgba(16, 185, 129, 0.4)',
    badgeText: '#6ee7b7'
  },
  gold: {
    accent: '#f59e0b',
    accentText: 'text-amber-400',
    accentBg: 'rgba(245, 158, 11, 0.15)',
    accentBorder: 'rgba(245, 158, 11, 0.35)',
    primaryGradient: 'linear-gradient(135deg, #f59e0b 0%, #d97706 50%, #b45309 100%)',
    primaryGlow: 'rgba(245, 158, 11, 0.45)',
    orb1: 'rgba(245, 158, 11, 0.2)',
    orb2: 'rgba(234, 88, 12, 0.12)',
    badgeBg: 'rgba(245, 158, 11, 0.2)',
    badgeBorder: 'rgba(245, 158, 11, 0.4)',
    badgeText: '#fde68a'
  },
  rose: {
    accent: '#f43f5e',
    accentText: 'text-rose-400',
    accentBg: 'rgba(244, 63, 94, 0.15)',
    accentBorder: 'rgba(244, 63, 94, 0.35)',
    primaryGradient: 'linear-gradient(135deg, #f43f5e 0%, #e11d48 50%, #be123c 100%)',
    primaryGlow: 'rgba(244, 63, 94, 0.45)',
    orb1: 'rgba(244, 63, 94, 0.18)',
    orb2: 'rgba(245, 158, 11, 0.12)',
    badgeBg: 'rgba(244, 63, 94, 0.2)',
    badgeBorder: 'rgba(244, 63, 94, 0.4)',
    badgeText: '#fecdd3'
  },
  purple: {
    accent: '#a855f7',
    accentText: 'text-purple-400',
    accentBg: 'rgba(168, 85, 247, 0.15)',
    accentBorder: 'rgba(168, 85, 247, 0.35)',
    primaryGradient: 'linear-gradient(135deg, #a855f7 0%, #9333ea 50%, #7e22ce 100%)',
    primaryGlow: 'rgba(168, 85, 247, 0.45)',
    orb1: 'rgba(168, 85, 247, 0.18)',
    orb2: 'rgba(59, 130, 246, 0.12)',
    badgeBg: 'rgba(168, 85, 247, 0.2)',
    badgeBorder: 'rgba(168, 85, 247, 0.4)',
    badgeText: '#e9d5ff'
  },
  cyan: {
    accent: '#06b6d4',
    accentText: 'text-cyan-400',
    accentBg: 'rgba(6, 182, 212, 0.15)',
    accentBorder: 'rgba(6, 182, 212, 0.35)',
    primaryGradient: 'linear-gradient(135deg, #06b6d4 0%, #0284c7 50%, #0369a1 100%)',
    primaryGlow: 'rgba(6, 182, 212, 0.45)',
    orb1: 'rgba(6, 182, 212, 0.2)',
    orb2: 'rgba(99, 102, 241, 0.12)',
    badgeBg: 'rgba(6, 182, 212, 0.2)',
    badgeBorder: 'rgba(6, 182, 212, 0.4)',
    badgeText: '#a5f3fc'
  }
};

function renderBioPage(bioData = {}, host = 'traffic.aisimplesystem.com', query = {}) {
  const theme = THEMES[bioData.theme] || THEMES.emerald;
  const channelName = escapeHtml(bioData.channelName || 'Official Channel');
  const handle = escapeHtml(bioData.handle || '@channel');
  const bio = escapeHtml(bioData.bio || '').replace(/\n/g, '<br/>');
  const avatarEmoji = bioData.avatarEmoji || '✨';
  const avatarGradient = bioData.avatarGradient || 'from-emerald-400 to-cyan-500';

  // Check for automatic holiday transition (e.g. after Christmas on Dec 26, 2026 or preview with ?season=evergreen)
  const isPostHoliday = Boolean(
    bioData.forcePostHoliday ||
    query.season === 'evergreen' ||
    (bioData.postHoliday && new Date() >= new Date(bioData.postHoliday.effectiveDate || '2026-12-26T00:00:00Z'))
  );

  const leadMagnet = (isPostHoliday && bioData.postHoliday?.leadMagnet)
    ? bioData.postHoliday.leadMagnet
    : (bioData.leadMagnet || null);

  const links = (isPostHoliday && Array.isArray(bioData.postHoliday?.links))
    ? bioData.postHoliday.links
    : (Array.isArray(bioData.links) ? bioData.links : []);

  // Render 3-Tier Playbook Links
  const linksHtml = links
    .map((link) => {
      const isPrimary = Boolean(link.isPrimary);
      const url = escapeHtml(link.url || '#');
      const title = escapeHtml(link.title || '');
      const subtitle = escapeHtml(link.subtitle || '');
      const badge = link.badge ? escapeHtml(link.badge) : null;
      const icon = link.icon ? escapeHtml(link.icon) : '👉';

      if (isPrimary) {
        return `
        <a href="${url}" target="_blank" rel="noopener noreferrer" 
           class="group relative block w-full p-4 sm:p-5 rounded-2xl text-left transition-all duration-300 transform active:scale-[0.98] hover:scale-[1.01] hover:-translate-y-0.5 shadow-xl"
           style="background: ${theme.primaryGradient}; box-shadow: 0 10px 25px -5px ${theme.primaryGlow}, 0 0 0 1px rgba(255,255,255,0.2) inset;">
          <div class="flex items-center justify-between gap-3">
            <div class="flex items-center gap-3.5 min-w-0">
              <span class="flex-shrink-0 text-2xl sm:text-3xl">${icon}</span>
              <div class="min-w-0">
                ${badge ? `<div class="inline-flex items-center gap-1 px-2.5 py-0.5 mb-1 rounded-full text-[10px] font-black tracking-wider uppercase bg-white/20 text-white border border-white/30 backdrop-blur-sm animate-pulse">${badge}</div>` : ''}
                <h3 class="text-base sm:text-lg font-black text-white tracking-tight leading-snug drop-shadow-sm truncate">${title}</h3>
                ${subtitle ? `<p class="text-xs sm:text-sm text-white/90 mt-0.5 font-medium leading-relaxed">${subtitle}</p>` : ''}
              </div>
            </div>
            <div class="flex-shrink-0 w-8 h-8 rounded-full bg-white/20 flex items-center justify-center text-white text-sm group-hover:translate-x-1 transition-transform">
              ➔
            </div>
          </div>
        </a>`;
      }

      return `
      <a href="${url}" target="_blank" rel="noopener noreferrer" 
         class="group relative block w-full p-4 sm:p-4.5 rounded-2xl text-left bg-slate-900/70 hover:bg-slate-800/80 border border-slate-700/60 hover:border-slate-500/80 backdrop-blur-xl transition-all duration-300 transform active:scale-[0.98] hover:scale-[1.01] hover:-translate-y-0.5 shadow-lg shadow-black/40">
        <div class="flex items-center justify-between gap-3">
          <div class="flex items-center gap-3 min-w-0">
            <span class="flex-shrink-0 text-xl sm:text-2xl">${icon}</span>
            <div class="min-w-0">
              ${badge ? `<div class="inline-flex items-center gap-1 px-2 py-0.5 mb-1 rounded-full text-[9px] font-black tracking-wider uppercase bg-slate-800 border border-slate-700 text-slate-300">${badge}</div>` : ''}
              <h4 class="text-sm sm:text-base font-bold text-white tracking-tight leading-snug truncate group-hover:text-slate-100">${title}</h4>
              ${subtitle ? `<p class="text-[11px] sm:text-xs text-slate-400 mt-0.5 font-normal leading-relaxed truncate">${subtitle}</p>` : ''}
            </div>
          </div>
          <div class="flex-shrink-0 w-6 h-6 rounded-full bg-slate-800/80 flex items-center justify-center text-slate-400 text-xs group-hover:text-white group-hover:translate-x-0.5 transition-all">
            ➔
          </div>
        </div>
      </a>`;
    })
    .join('\n');

  // Lead Magnet 1-Click Capture Box
  let leadMagnetHtml = '';
  if (leadMagnet) {
    leadMagnetHtml = `
    <!-- Playbook Lead Magnet Engine: Views -> Attention -> Click -> ASSET -> Revenue -->
    <div class="w-full mb-4 p-4 sm:p-5 rounded-2xl bg-gradient-to-b from-slate-900/95 to-slate-950/95 border border-slate-700/80 shadow-2xl relative overflow-hidden backdrop-blur-xl">
      <div class="flex items-center justify-between gap-2 mb-2">
        <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black tracking-wider uppercase bg-amber-500/20 text-amber-300 border border-amber-500/30">
          ${escapeHtml(leadMagnet.badge || '🎁 FREE INSTANT PROTOCOL')}
        </span>
        <span class="text-[11px] text-slate-400 font-semibold">100% Free • No Spam</span>
      </div>
      <h2 class="text-base sm:text-lg font-black text-white leading-snug tracking-tight mb-1">
        ${escapeHtml(leadMagnet.title)}
      </h2>
      <p class="text-xs text-slate-300 mb-3.5 leading-relaxed">
        ${escapeHtml(leadMagnet.subtitle)}
      </p>

      <form id="bioEmailForm" class="flex flex-col gap-2">
        <input type="email" id="bioEmailInput" required placeholder="Enter your email to get the free guide..." 
               class="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-700 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors shadow-inner" />
        <button type="submit" id="bioSubmitBtn"
                class="w-full py-3 rounded-xl font-black text-xs sm:text-sm uppercase tracking-wider text-white shadow-xl transition-all transform active:scale-[0.98] hover:brightness-110 flex items-center justify-center gap-2"
                style="background: ${theme.primaryGradient}; box-shadow: 0 8px 20px -4px ${theme.primaryGlow};">
          <span>${escapeHtml(leadMagnet.buttonText || 'Send Me The Free Guide ➔')}</span>
        </button>
      </form>
      <div id="bioFeedback" class="hidden mt-2.5 text-xs font-bold text-center"></div>
    </div>`;
  }

  return `<!DOCTYPE html>
<html lang="en" class="h-full bg-slate-950">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover"/>
  <title>${channelName} | Official Resource Hub</title>
  <meta name="description" content="${escapeHtml(bioData.bio || channelName)}"/>
  <meta property="og:title" content="${channelName} | Official Resource Hub"/>
  <meta property="og:description" content="${escapeHtml(bioData.bio || channelName)}"/>
  <meta property="og:type" content="website"/>
  <meta property="og:url" content="https://${host}/bio/${bioData.slug}"/>
  <meta name="theme-color" content="#020617"/>
  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      -webkit-tap-highlight-color: transparent;
    }
  </style>
</head>
<body class="min-h-full bg-slate-950 text-slate-100 flex flex-col items-center justify-between relative overflow-x-hidden p-4 sm:p-6 antialiased selection:bg-slate-700">

  <!-- Ambient Animated Glowing Orbs -->
  <div class="fixed inset-0 pointer-events-none overflow-hidden z-0">
    <div class="absolute -top-40 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full blur-[100px]" style="background: ${theme.orb1};"></div>
    <div class="absolute top-1/2 -right-20 w-80 h-80 rounded-full blur-[120px]" style="background: ${theme.orb2};"></div>
    <div class="absolute -bottom-20 -left-20 w-80 h-80 rounded-full blur-[110px]" style="background: ${theme.orb1};"></div>
  </div>

  <!-- Container -->
  <div class="w-full max-w-md mx-auto relative z-10 flex flex-col items-center pt-6 sm:pt-8 pb-8 flex-1">
    
    <!-- Profile Header -->
    <div class="flex flex-col items-center text-center mb-5">
      
      <!-- Avatar with Gradient Ring -->
      <div class="relative mb-3 group">
        <div class="w-20 h-20 sm:w-22 sm:h-22 rounded-full p-1 bg-gradient-to-tr ${avatarGradient} shadow-2xl shadow-black/80 flex items-center justify-center transform group-hover:scale-105 transition-transform duration-300">
          <div class="w-full h-full rounded-full bg-slate-950 flex items-center justify-center text-3xl sm:text-4xl shadow-inner select-none">
            ${avatarEmoji}
          </div>
        </div>
        <!-- Verified Checkmark Badge -->
        ${bioData.verified ? `
        <div class="absolute bottom-0 right-0 w-6 h-6 rounded-full bg-sky-500 text-white flex items-center justify-center border-2 border-slate-950 shadow-md" title="Verified Creator Hub">
          <svg class="w-3 h-3 fill-current" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clip-rule="evenodd"></path></svg>
        </div>` : ''}
      </div>

      <!-- Channel Name & Handle -->
      <h1 class="text-lg sm:text-xl font-black text-white tracking-tight flex items-center gap-1.5 drop-shadow-sm">
        ${channelName}
      </h1>
      <div class="mt-1 inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-slate-900/90 border border-slate-800 text-[11px] font-semibold text-slate-400">
        <span>${handle}</span>
      </div>

      <!-- Bio Description -->
      <p class="mt-2.5 text-xs text-slate-300 max-w-xs leading-relaxed font-medium">
        ${bio}
      </p>

    </div>

    <!-- 1-Click Lead Magnet Asset Box -->
    ${leadMagnetHtml}

    <!-- 3-Tier Recommended Monetization Stack -->
    <div class="w-full space-y-2.5 sm:space-y-3">
      ${linksHtml}
    </div>

    <!-- Security & Trust Badge -->
    <div class="mt-6 text-center">
      <div class="inline-flex items-center gap-1.5 text-[10px] font-medium text-slate-500">
        <svg class="w-3.5 h-3.5 text-emerald-500" viewBox="0 0 20 20" fill="currentColor">
          <path fill-rule="evenodd" d="M10 1.944A11.954 11.954 0 012.166 5C2.056 5.649 2 6.319 2 7c0 5.225 3.34 9.67 8 11.317C14.66 16.67 18 12.225 18 7c0-.682-.057-1.35-.166-2.001A11.954 11.954 0 0110 1.944zM11 14a1 1 0 11-2 0 1 1 0 012 0zm0-7a1 1 0 10-2 0v3a1 1 0 102 0V7z" clip-rule="evenodd"/>
        </svg>
        <span>Verified Official Creator Hub • Encrypted SSL Access</span>
      </div>
    </div>

  </div>

  <!-- Footer -->
  <footer class="w-full max-w-md mx-auto py-2.5 text-center relative z-10">
    <p class="text-[10px] text-slate-600 font-medium">
      © ${new Date().getFullYear()} ${channelName} • Powered by <span class="text-slate-400 font-semibold">AI Simple Systems</span>
    </p>
  </footer>

  <script>
    const form = document.getElementById('bioEmailForm');
    if (form) {
      form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const input = document.getElementById('bioEmailInput');
        const btn = document.getElementById('bioSubmitBtn');
        const feedback = document.getElementById('bioFeedback');
        const email = input.value.trim();
        if (!email || !email.includes('@')) return;

        btn.disabled = true;
        btn.innerHTML = '<span>Unlocking Your Access... ⏳</span>';

        const targetRedirect = '${escapeHtml(leadMagnet?.targetUrl || links[0]?.url || '#')}';

        try {
          const res = await fetch('/api/subscribe', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: email,
              offerSlug: '${escapeHtml(leadMagnet?.offerSlug || bioData.slug)}',
              src: 'bio_${escapeHtml(bioData.slug)}_inline'
            })
          });

          feedback.className = 'mt-2.5 text-xs font-bold text-center text-emerald-400 block';
          feedback.textContent = '✅ Guide sent to inbox! Unlocking instant access...';
          btn.innerHTML = '<span>Access Unlocked! 🚀</span>';

          setTimeout(() => {
            window.location.href = targetRedirect;
          }, 600);
        } catch (err) {
          window.location.href = targetRedirect;
        }
      });
    }
  </script>

</body>
</html>`;
}

module.exports = {
  renderBioPage,
  THEMES
};
