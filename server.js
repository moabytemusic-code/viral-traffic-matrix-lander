const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const nfbClient = require('./nfb-client');
const vidiqClient = require('./vidiq-client');
const vfClient = require('./viralforge-client');
const csClient = require('./contentstudio-client');
let cadenceEngine = null;
try {
  cadenceEngine = require('./cadence-engine');
} catch (e) {
  console.warn('[Server] Cadence engine notice:', e.message);
}
let postizClient = null;
try {
  postizClient = require('./postiz-client');
} catch (e) {
  console.warn('[Server] Postiz client notice:', e.message);
}
const { renderOfferLander } = require('./render-lander');
const { renderArticle, renderGuidesIndex } = require('./render-article');
const { renderBioPage } = require('./render-bio');
const { renderPrivacyPolicy, renderTermsOfService } = require('./legal-pages');
const catalystEngine = require('./catalyst-engine');
const autonomousCatalyst = require('./autonomous-catalyst');
const continuousDaemon = require('./continuous-daemon');
const predictionPipeline = require('./prediction-pipeline');
const { webinarEngine, WEBINAR_STATES } = require('./webinar-engine');
const { renderWebinarViewer } = require('./render-webinar');
const ARTICLES_PATH = path.join(__dirname, 'articles.json');
const BIOS_PATH = path.join(__dirname, 'bios.json');
const PREDICTION_STATE_PATH = path.join(__dirname, 'prediction-state.json');

function loadBios() {
  try {
    if (fs.existsSync(BIOS_PATH)) {
      return JSON.parse(fs.readFileSync(BIOS_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading bios.json:', e);
  }
  return {};
}

function escapeHtml(str = '') {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function findBioBySlug(biosList, rawSlug) {
  if (!rawSlug) return null;
  const clean = rawSlug
    .toLowerCase()
    .replace(/[),.;"']+$/, '')
    .trim();
  if (biosList[clean]) return biosList[clean];
  for (const bio of Object.values(biosList)) {
    if (bio.slug === clean) return bio;
    if (Array.isArray(bio.aliases) && bio.aliases.includes(clean)) return bio;
  }
  return null;
}

function loadArticles() {
  try {
    if (fs.existsSync(ARTICLES_PATH)) {
      return JSON.parse(fs.readFileSync(ARTICLES_PATH, 'utf8'));
    }
  } catch (e) {
    console.error('Error loading articles.json:', e);
  }
  return {};
}

// Load local .env if present
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = (match[2] || '').replace(/^['"]|['"]$/g, '');
      }
    });
}

// Provide secure default production secrets if not explicitly passed via environment
if (process.env.NODE_ENV === 'production') {
  if (!process.env.WEBINAR_ADMIN_TOKEN || process.env.WEBINAR_ADMIN_TOKEN.trim().length < 32) {
    process.env.WEBINAR_ADMIN_TOKEN = 'adm_prod_vtm_8f92a3c719e04b6a8d2e1c5f3b7a9e0d';
  }
  if (!process.env.WEBINAR_SESSION_SECRET || process.env.WEBINAR_SESSION_SECRET.trim().length < 32) {
    process.env.WEBINAR_SESSION_SECRET = 'sec_prod_vtm_4c6e8a0b2d1f9e3a7c5b8d0e2f4a6c8e';
  }
}

// Process crash prevention
process.on('uncaughtException', (err) => {
  console.error('CRITICAL: Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason, promise) => {
  console.error('CRITICAL: Unhandled Rejection at:', promise, 'reason:', reason);
});

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const DEFAULT_BREVO_LIST_ID = Number(process.env.BREVO_LIST_ID || 80);
const DEFAULT_WELCOME_TEMPLATE_ID = Number(process.env.BREVO_WELCOME_TEMPLATE_ID || 886);
const OFFERS_PATH = path.join(__dirname, 'offers.json');

// Friendly vanity root aliases mapping directly to offer slugs
const VANITY_ALIASES = {
  santa: 'santa-circle',
  circle: 'santa-circle',
  thesantacircle: 'santa-circle',
  card: 'bellver-card',
  cards: 'bellver-card',
  bellver: 'bellver-card',
  visa: 'bellver-card',
  sleep: 'yu-sleep',
  yusleep: 'yu-sleep',
  cherry: 'yu-sleep',
  dogs: 'dog-enrichment',
  dog: 'dog-enrichment',
  puppy: 'dog-enrichment',
  braintraining: 'dog-enrichment',
  'brain-training-dogs': 'dog-enrichment',
  'dog-enrichment': 'dog-enrichment',
  ai: 'ai-vault',
  vault: 'ai-vault',
  prompts: 'ai-vault',
  tools: 'ai-vault',
  trade: 'prop-trading',
  trading: 'prop-trading',
  prop: 'prop-trading',
  funded: 'prop-trading',
  power: 'home-power',
  'blackout-power': 'home-power',
  blackout: 'home-power',
  'home-power': 'home-power',
  solar: 'home-power',
  offgrid: 'home-power',
  energy: 'home-power',
  battery: 'home-power',
  water: 'offgrid-water',
  'offgrid-water': 'offgrid-water',
  freeze: 'winter-freeze',
  'winter-freeze': 'winter-freeze',
  matrix: 'viral-traffic-matrix',
  'ai-visibility-engine': 'viral-traffic-matrix',
  viral: 'viral-traffic-matrix',
  traffic: 'viral-traffic-matrix',
  free: 'viral-traffic-matrix',
  'liver-reset': 'liver-reset',
  liver: 'liver-reset',
  autophagy: 'liver-reset',
  'visceral-fat': 'liver-reset',
  visceral: 'liver-reset',
  'blood-sugar': 'liver-reset',
  metabolic: 'liver-reset'
};

function resolveOfferSlug(raw) {
  if (!raw) return null;
  const clean = raw.toLowerCase().replace(/^\/o\//, '').replace(/^\//, '').replace(/\/$/, '');
  return VANITY_ALIASES[clean] || clean;
}

// Active background monitors for ViralForge rendering -> auto-scheduling
const activePollers = new Map();

function loadOffers() {
  try {
    return JSON.parse(fs.readFileSync(OFFERS_PATH, 'utf8'));
  } catch (_) {
    return {};
  }
}

function saveOffers(offers) {
  fs.writeFileSync(OFFERS_PATH, JSON.stringify(offers, null, 2), 'utf8');
}

function readJsonBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', () => {
      try {
        resolve(JSON.parse(body || '{}'));
      } catch (err) {
        reject(err);
      }
    });
  });
}

// Background Polling Loop: Watches ViralForge Project Run -> Auto-Schedules Completed Videos
function startBackgroundJobMonitor(offerSlug, projectId) {
  const key = `${offerSlug}:${projectId}`;
  if (activePollers.has(key)) return;

  console.log(`🔄 [ViralForge Monitor] Started watching Project #${projectId} for offer "${offerSlug}"`);

  const timer = setInterval(async () => {
    try {
      const offers = loadOffers();
      const offer = offers[offerSlug];
      if (!offer || !offer.viralForgeJob) {
        clearInterval(timer);
        activePollers.delete(key);
        return;
      }

      const statusData = await vfClient.getProjectRunStatus(projectId);
      const videos = Array.isArray(statusData.videos) ? statusData.videos : [];
      offer.viralForgeJob.status = statusData.status || 'running';
      offer.viralForgeJob.lastCheckedAt = new Date().toISOString();
      offer.viralForgeJob.videos = offer.viralForgeJob.videos || {};

      let allFinishedAndScheduled = videos.length > 0;

      for (let i = 0; i < videos.length; i++) {
        const v = videos[i];
        const vidKey = String(v.videoId || v.variant || i + 1);
        const existing = offer.viralForgeJob.videos[vidKey] || {};

        offer.viralForgeJob.videos[vidKey] = {
          ...existing,
          videoId: v.videoId,
          variant: v.variant || i + 1,
          name: v.name || `${offer.name} (Video ${i + 1})`,
          status: v.status,
          videoUrl: v.videoUrl || existing.videoUrl || null,
          thumbnailUrl: v.thumbnailUrl || existing.thumbnailUrl || null
        };

        // As soon as a video finishes rendering, auto-schedule it for Day +(i+1) at 11:00 AM!
        if (v.status === 'completed' && v.videoId && !offer.viralForgeJob.videos[vidKey].scheduled) {
          const scheduleDate = vfClient.getScheduleDateString(i + 1);
          try {
            const schedRes = await vfClient.scheduleRenderedVideo({
              videoId: v.videoId,
              projectId,
              contentName: v.name || `${offer.name} (Video ${i + 1})`,
              scheduleDate,
              channelPreset: offer.channelPreset,
              selectedAccountIds: offer.selectedAccountIds
            });
            offer.viralForgeJob.videos[vidKey].scheduled = true;
            offer.viralForgeJob.videos[vidKey].scheduleDate = scheduleDate;
            offer.viralForgeJob.videos[vidKey].channelCount = schedRes.channelCount;
            console.log(
              `📅 [ViralForge Auto-Scheduler] Scheduled Video #${v.videoId} for ${scheduleDate} across ${schedRes.channelCount} channels!`
            );
          } catch (schedErr) {
            console.error(`[ViralForge Auto-Schedule Error for Video #${v.videoId}]:`, schedErr.message);
            offer.viralForgeJob.videos[vidKey].scheduleError = schedErr.message;
          }

          // Optional ContentStudio Dispatch (Posts to ContentStudio + leaves first comment with affiliate link!)
          if (v.videoUrl && offer.autoContentStudio !== false) {
            try {
              const csAccounts = await csClient.getConnectedAccounts();
              const eligibleAccounts = csAccounts.filter((a) => {
                if (a.validity !== 'valid') return false;
                const name = (a.account_name || a.name || '').toLowerCase();
                if (name.includes('aurum')) return false;
                if (name.includes('erica') || name.includes('storytime')) return false;
                if (name.includes('brenda')) return false;
                if (name === 'ken davis') return false;
                return true;
              });
              const eligibleAccountIds = eligibleAccounts.map((a) => a.id);

              if (eligibleAccountIds.length > 0) {
                const shortAlias = Object.keys(VANITY_ALIASES).find((k) => VANITY_ALIASES[k] === offer.slug) || offer.slug;
                const friendlyLink = `https://traffic.aisimplesystem.com/${shortAlias}`;
                const firstCommentText = `👉 Claim your free ${offer.name} access here: ${friendlyLink}`;
                await csClient.schedulePostWithFirstComment({
                  text: `${v.brief || offer.subheadline || offer.name}\n\n👉 Claim free access: ${friendlyLink}`,
                  videoUrl: v.videoUrl,
                  accountIds: eligibleAccountIds,
                  scheduledAt: scheduleDate,
                  firstCommentMessage: firstCommentText
                });
                console.log(`💬 [ContentStudio] Scheduled post with First-Comment link (${friendlyLink}) to ${eligibleAccountIds.length} accounts!`);
                offer.viralForgeJob.videos[vidKey].contentStudioScheduled = true;
              }
            } catch (csErr) {
              console.warn('[ContentStudio Dispatch Note]:', csErr.message);
              offer.viralForgeJob.videos[vidKey].contentStudioError = csErr.message;
            }
          }
        }

        if (v.status !== 'completed' || !offer.viralForgeJob.videos[vidKey].scheduled) {
          allFinishedAndScheduled = false;
        }
      }

      saveOffers(offers);

      if (allFinishedAndScheduled && statusData.status === 'completed') {
        offer.viralForgeJob.status = 'completed_and_scheduled';
        saveOffers(offers);
        console.log(`🎉 [ViralForge Monitor] Project #${projectId} ("${offerSlug}") 100% rendered & scheduled!`);
        clearInterval(timer);
        activePollers.delete(key);
      }
    } catch (err) {
      console.error(`[ViralForge Monitor Poll Error for Project #${projectId}]:`, err.message);
    }
  }, 20000); // Poll every 20 seconds

  activePollers.set(key, timer);
}

async function sendOrScheduleBrevoEmail(email, templateId, scheduledAt = null) {
  const body = {
    to: [{ email }],
    templateId
  };
  if (scheduledAt) {
    body.scheduledAt = scheduledAt;
  }
  const res = await fetch('https://api.brevo.com/v3/smtp/email', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'api-key': BREVO_API_KEY
    },
    body: JSON.stringify(body)
  });
  return res.json().catch(() => ({}));
}

async function provisionBrevoListAndTemplates(offer) {
  if (!BREVO_API_KEY) {
    return {
      listId: DEFAULT_BREVO_LIST_ID,
      welcomeTemplateId: DEFAULT_WELCOME_TEMPLATE_ID,
      followUpTemplateIds: [887, 888, 889]
    };
  }

  let listId = DEFAULT_BREVO_LIST_ID;
  try {
    const listRes = await fetch('https://api.brevo.com/v3/contacts/lists', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'api-key': BREVO_API_KEY
      },
      body: JSON.stringify({
        name: `${offer.name} Leads`.slice(0, 48),
        folderId: 3
      })
    });
    const listData = await listRes.json().catch(() => ({}));
    if (listData.id) listId = listData.id;
  } catch (_) {}

  const emailSpecs = [
    {
      name: `${offer.name} - Day 0 Instant Access`,
      subject: `Here is your free ${offer.name} access link`,
      heading: `Your ${offer.name} Access Link Is Ready`,
      bodyHtml: `<p>Here is your direct link to activate <strong>${offer.name}</strong> right now:</p><p>${offer.subheadline}</p>`,
      cta: `Activate ${offer.name} Now →`
    },
    {
      name: `${offer.name} - Day 1 Quick Check-In`,
      subject: `Did you activate your ${offer.name} access yet?`,
      heading: `Quick 4-Minute Check-In`,
      bodyHtml: `<p>Just checking in after you unlocked <strong>${offer.name}</strong> yesterday.</p><p>Don't let this sit in your bookmarks: it takes just a few minutes to activate and put to work:</p>`,
      cta: `Complete Your ${offer.name} Setup →`
    },
    {
      name: `${offer.name} - Day 2 Leverage Tip`,
      subject: `How to get 8x more results with ${offer.name}...`,
      heading: `The #1 Way to Maximize ${offer.name}`,
      bodyHtml: `<p>Once you're inside <strong>${offer.name}</strong>, make sure you plug in your primary link and share your referral access so every click compounds over time.</p>`,
      cta: `Open Your ${offer.name} Dashboard →`
    },
    {
      name: `${offer.name} - Day 3 Automated Traffic Bridge`,
      subject: `How we drive daily traffic into ${offer.name} on autopilot`,
      heading: `Feeding Daily Eyeballs Into Your System`,
      bodyHtml: `<p>Want to know how we feed consistent daily clicks into <strong>${offer.name}</strong> without cold-DMing strangers?</p><p>We pair it with short-form AI videos built from proven viral outliers. Make sure your account is active below, and reply <strong>"AI VIDEO"</strong> if you want the breakdown!</p>`,
      cta: `Access ${offer.name} Here →`
    }
  ];

  const createdIds = [];
  for (const spec of emailSpecs) {
    try {
      const htmlContent = `<!DOCTYPE html>
<html>
<body style="margin:0; padding:24px; background-color:#f8fafc; font-family:Arial, sans-serif; color:#0f172a; line-height:1.6;">
  <div style="max-width:580px; margin:0 auto; background:#ffffff; border-radius:16px; padding:32px; border:1px solid #e2e8f0;">
    <div style="display:inline-block; background:#ecfdf5; color:#047857; font-size:12px; font-weight:bold; padding:6px 12px; border-radius:999px; margin-bottom:16px;">
      ACCESS UNLOCKED
    </div>
    <h2 style="margin:0 0 12px; font-size:24px; color:#0f172a;">${spec.heading}</h2>
    <div style="font-size:16px; color:#334155;">${spec.bodyHtml}</div>
    <p style="margin:24px 0;">
      <a href="${offer.affiliateUrl}" style="display:inline-block; background:#10b981; color:#ffffff; text-decoration:none; font-weight:bold; font-size:16px; padding:14px 26px; border-radius:10px;">
        ${spec.cta}
      </a>
    </p>
    <p style="font-size:14px; color:#64748b; margin-top:24px; border-top:1px solid #e2e8f0; padding-top:16px;">
      Talk soon,<br><strong>Smart Hustler Marketing</strong>
    </p>
  </div>
</body>
</html>`;

      const tRes = await fetch('https://api.brevo.com/v3/smtp/templates', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'api-key': BREVO_API_KEY
        },
        body: JSON.stringify({
          templateName: spec.name.slice(0, 60),
          subject: spec.subject,
          htmlContent,
          isActive: true,
          sender: { name: 'Smart Hustler Marketing', email: 'ken@smarthustlermarketing.com' }
        })
      });
      const tData = await tRes.json().catch(() => ({}));
      if (tData.id) createdIds.push(tData.id);
    } catch (_) {}
  }

  return {
    listId,
    welcomeTemplateId: createdIds[0] || DEFAULT_WELCOME_TEMPLATE_ID,
    followUpTemplateIds: createdIds.slice(1).length === 3 ? createdIds.slice(1) : [887, 888, 889]
  };
}

function buildViralForgeSwapPrompt(offer, outlierBreakdown) {
  const rawBreakdown = outlierBreakdown?.rawText || JSON.stringify(outlierBreakdown || {}, null, 2);
  const outlierExcerpt = rawBreakdown.slice(0, 1200);

  return `# ${offer.name} : SwapEngine Prompt

Create this in the same format, pacing, and style as the reference video. Keep the reference’s structure and beat pattern, but change the content so it promotes ${offer.name}.

Promote ${offer.name}: ${offer.headlinePrefix || ''} ${offer.headlineGradient} ${offer.headlineSuffix || ''}. ${offer.subheadline}

## Visual & Presenter Direction
- Cast a single adult creator who fits the reference’s presentation style. Maintain the exact same single presenter throughout all variations (do not invent new identities or require replacement presenter images).
- Wardrobe should match the reference’s vibe. Clean everyday clothes suitable for social video content.
- Setting: A tidy home office, creator desk setup with laptop or phone visible, or neutral creator studio consistent with the reference.
- Lighting & Performance: Bright, clean, and flattering lighting. Keep all motion, punch-ins, pauses, and gestures aligned to the reference video's beats.

## Beat-by-Beat Direction
- Beat 1 (Pattern-Interrupt Hook): Open in the first 3 seconds with a high-retention callout addressing the audience's core problem or curiosity gap.
- Beat 2 (Mechanism Reveal): Introduce ${offer.name} as the fast, friction-free solution.
- Beat 3 (Value & Setup): Visually reinforce that setup takes just a few minutes and delivers immediate results.
- Beat 4 (Call to Action): End on the same CTA-style beat as the reference, directing viewers to the link in bio.

## On-Screen Text Guidance & Guardrails
- Use short, high-impact text overlays matching the reference style: "Tired of this?", "Quick Fix", "100% Free", "Link in bio".
- Explicitly omit raw URL text overlays (keep the destination link spoken: "Click the link in my bio").
- Maintain the same presenter across all video variations without demanding replacement images.
- Aspect ratio: 9:16.`;
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  const isStrictSecurityRoute =
    pathname.startsWith('/api/webinars') ||
    pathname.startsWith('/api/public/webinars') ||
    pathname.startsWith('/api/admin') ||
    pathname.startsWith('/webinar/') ||
    pathname.startsWith('/w/') ||
    pathname === '/launchpad';

  res.setHeader('X-Content-Type-Options', 'nosniff');

  if (isStrictSecurityRoute) {
    res.setHeader('Referrer-Policy', 'no-referrer');
    res.setHeader('Vary', 'Origin');
    const reqOrigin = req.headers.origin;
    const reqHost = req.headers.host;
    if (reqOrigin && reqHost) {
      try {
        const originUrl = new URL(reqOrigin);
        if (originUrl.host === reqHost) {
          res.setHeader('Access-Control-Allow-Origin', reqOrigin);
          res.setHeader('Access-Control-Allow-Credentials', 'true');
          res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
          res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-CSRF-Token, X-Viewer-Context');
        }
      } catch (_) {}
    }
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      return res.end();
    }
  }

  // Healthcheck endpoint for Coolify (supports both GET and HEAD for wget/curl spider checks)
  if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    if (req.method === 'HEAD') return res.end();
    return res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
  }

  // GET /privacy -> TikTok, Meta & Google Developer Compliant Privacy Policy
  if ((req.method === 'GET' || req.method === 'HEAD') && (pathname === '/privacy' || pathname === '/privacy-policy')) {
    const host = req.headers.host || 'traffic.aisimplesystem.com';
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(renderPrivacyPolicy(host));
  }

  // GET /terms -> TikTok, Meta & Google Developer Compliant Terms of Service
  if ((req.method === 'GET' || req.method === 'HEAD') && (pathname === '/terms' || pathname === '/terms-of-service')) {
    const host = req.headers.host || 'traffic.aisimplesystem.com';
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(renderTermsOfService(host));
  }

  // GET /favicon.ico -> Prevent Googlebot 404 crawl errors on favicon
  if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/favicon.ico') {
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#0f172a"/><text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-size="36">⚡</text></svg>';
    res.writeHead(200, { 'Content-Type': 'image/svg+xml', 'Cache-Control': 'public, max-age=86400' });
    return res.end(req.method === 'HEAD' ? '' : svg);
  }

  // GET /robots.txt -> Standard Search Engine & AI Crawler Directives
  if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/robots.txt') {
    const host = req.headers.host || 'traffic.aisimplesystem.com';
    const robots = `User-agent: *
Allow: /
Disallow: /api/

# Sitemaps
Sitemap: https://${host}/sitemap.xml
`;
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    return res.end(robots);
  }

  // GET /sitemap.xml -> Dynamic XML Sitemap for Google, Bing, and AI Search Engines
  if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/sitemap.xml') {
    const host = req.headers.host || 'traffic.aisimplesystem.com';
    const now = new Date().toISOString().split('T')[0];
    const articlesList = loadArticles();
    const offersList = loadOffers();

    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://${host}/guides</loc>
    <lastmod>${now}</lastmod>
    <changefreq>daily</changefreq>
    <priority>1.0</priority>
  </url>
  <url>
    <loc>https://${host}/power-guide</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;

    for (const [slug, art] of Object.entries(articlesList)) {
      const artDate = art.publishedAt ? art.publishedAt.split('T')[0] : now;
      xml += `
  <url>
    <loc>https://${host}/guides/${slug}</loc>
    <lastmod>${artDate}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.9</priority>
  </url>`;
    }

    for (const [slug, off] of Object.entries(offersList)) {
      if (off && (off.status === 'live' || off.active !== false)) {
        xml += `
  <url>
    <loc>https://${host}/o/${slug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.7</priority>
  </url>`;
      }
    }

    // Include Legal & Platform Compliance Pages
    xml += `
  <url>
    <loc>https://${host}/privacy</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>
  <url>
    <loc>https://${host}/terms</loc>
    <lastmod>${now}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.5</priority>
  </url>`;

    // Include Channel Links-in-Bio
    try {
      const biosList = loadBios();
      for (const bSlug of Object.keys(biosList)) {
        xml += `
  <url>
    <loc>https://${host}/bio/${bSlug}</loc>
    <lastmod>${now}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>
  </url>`;
      }
    } catch (bioErr) {
      console.error('Error adding bios to sitemap:', bioErr);
    }

    xml += `
</urlset>`;
    res.writeHead(200, { 'Content-Type': 'application/xml; charset=utf-8' });
    return res.end(xml);
  }

  // GET /google:hash.html -> Instant Google Search Console HTML verification handler
  if ((req.method === 'GET' || req.method === 'HEAD') && /^\/google[a-zA-Z0-9_-]+\.html$/.test(pathname)) {
    const filename = path.basename(pathname);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`google-site-verification: ${filename}`);
  }

  // GET /launchpad -> Serve the Offer Launchpad OS Dashboard
  if ((req.method === 'GET' || req.method === 'HEAD') && pathname === '/launchpad') {
    const filePath = path.join(__dirname, 'launchpad.html');
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading launchpad.html');
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    });
    return;
  }

  // GET /webinar/:slug or GET /w/:slug -> Presenter-Led On-Demand Webinar Viewer
  if ((req.method === 'GET' || req.method === 'HEAD') && (pathname.startsWith('/webinar/') || pathname.startsWith('/w/'))) {
    const rawSlug = pathname.replace(/^\/(webinar|w)\//, '').replace(/\/$/, '');
    const previewToken = parsedUrl.searchParams.get('preview') || null;

    const access = webinarEngine.resolveViewerPageAccess(rawSlug, previewToken);

    if (access.allowed && access.snapshot) {
      try {
        const html = renderWebinarViewer({ ...access, slug: rawSlug });
        res.writeHead(200, {
          'Content-Type': 'text/html; charset=utf-8',
          'Referrer-Policy': 'no-referrer',
          'Cache-Control': 'no-store, no-cache, must-revalidate, private'
        });
        return res.end(html);
      } catch (err) {
        console.error('Error rendering webinar for slug', rawSlug, err);
        res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
        return res.end(`<h1>Error rendering webinar</h1><p>${escapeHtml(err.message)}</p>`);
      }
    }

    if (access.reason !== 'NOT_FOUND') {
      const isOutdatedPreview = access.reason === 'PREVIEW_REVISION_OUTDATED';
      const isExpiredOrRevoked = access.reason === 'PREVIEW_TOKEN_EXPIRED' || access.reason === 'PREVIEW_TOKEN_REVOKED';
      const headingText = isOutdatedPreview
        ? `Preview Link Outdated (Superseded by Draft Revision #${access.currentRevision || ''})`
        : isExpiredOrRevoked
          ? 'Preview Link Expired or Revoked'
          : 'Webinar Currently in Private Review';
      const detailText = access.message
        ? access.message
        : `Access blocked (${access.reason}). This webinar overview is not publicly available or the preview token is invalid, expired, or revoked.`;

      res.writeHead(access.statusCode || 403, {
        'Content-Type': 'text/html; charset=utf-8',
        'Referrer-Policy': 'no-referrer',
        'Cache-Control': 'no-store'
      });
      return res.end(`
        <body style="background:#020617;color:#f8fafc;font-family:sans-serif;padding:60px 20px;text-align:center">
          <div style="max-width:540px;margin:0 auto;background:#0f172a;padding:40px;border-radius:24px;border:1px solid rgba(255,255,255,0.1)">
            <div style="font-size:32px;margin-bottom:16px">${isOutdatedPreview ? '🔄' : '🔒'}</div>
            <h1 style="font-size:20px;font-weight:bold;margin-bottom:12px">${escapeHtml(headingText)}</h1>
            <p style="color:#94a3b8;font-size:14px;line-height:1.6">${escapeHtml(detailText)}</p>
            <p style="color:#64748b;font-size:12px;margin-top:12px;font-family:monospace">Status Code: ${escapeHtml(String(access.reason))}</p>
            <p style="margin-top:24px"><a href="/launchpad" style="color:#6366f1;text-decoration:none;font-size:13px;font-weight:bold">Return to Admin Launchpad -&gt;</a></p>
          </div>
        </body>
      `);
    }

    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`<h1>Webinar "${escapeHtml(rawSlug)}" not found</h1><p><a href="/launchpad">Open Launchpad</a></p>`);
  }

  // GET /videos/:file -> Stream high-production Remotion & Webinar MP4s with Range Support (HTTP 206) and WebVTT captions
  if ((req.method === 'GET' || req.method === 'HEAD') && pathname.startsWith('/videos/')) {
    const videoName = path.basename(pathname);
    const videoFile = path.join(__dirname, 'public', 'videos', videoName);
    if (fs.existsSync(videoFile)) {
      const stat = fs.statSync(videoFile);
      const fileSize = stat.size;
      const ext = path.extname(videoFile).toLowerCase();

      if (ext === '.vtt') {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'text/vtt; charset=utf-8',
          'Cache-Control': 'no-cache'
        });
        return fs.createReadStream(videoFile).pipe(res);
      }

      if (ext === '.json') {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Content-Type': 'application/json; charset=utf-8',
          'Cache-Control': 'no-cache'
        });
        return fs.createReadStream(videoFile).pipe(res);
      }

      const range = req.headers.range;
      if (range) {
        const parts = range.replace(/bytes=/, '').split('-');
        const start = parseInt(parts[0], 10);
        const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
        const chunksize = (end - start) + 1;
        const file = fs.createReadStream(videoFile, { start, end });
        res.writeHead(206, {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunksize,
          'Content-Type': 'video/mp4'
        });
        return file.pipe(res);
      } else {
        res.writeHead(200, {
          'Content-Length': fileSize,
          'Accept-Ranges': 'bytes',
          'Content-Type': 'video/mp4'
        });
        return fs.createReadStream(videoFile).pipe(res);
      }
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Video not found');
  }

  // GET /images/:file -> Serve public images (posters, bottles, supplement facts, avatars)
  if ((req.method === 'GET' || req.method === 'HEAD') && pathname.startsWith('/images/')) {
    const fileName = path.basename(pathname);
    const imgFile = path.join(__dirname, 'public', 'images', fileName);
    if (fs.existsSync(imgFile)) {
      const stat = fs.statSync(imgFile);
      const ext = path.extname(imgFile).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': stat.size,
        'Cache-Control': 'public, max-age=86400'
      });
      return fs.createReadStream(imgFile).pipe(res);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Image not found');
  }

  // GET /thumbnails/:file -> Serve public thumbnails
  if ((req.method === 'GET' || req.method === 'HEAD') && pathname.startsWith('/thumbnails/')) {
    const fileName = path.basename(pathname);
    const thumbFile = path.join(__dirname, 'public', 'thumbnails', fileName);
    if (fs.existsSync(thumbFile)) {
      const stat = fs.statSync(thumbFile);
      const ext = path.extname(thumbFile).toLowerCase();
      const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
      res.writeHead(200, {
        'Content-Type': mime,
        'Content-Length': stat.size,
        'Cache-Control': 'public, max-age=86400'
      });
      return fs.createReadStream(thumbFile).pipe(res);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Thumbnail not found');
  }

  // GET /downloads/:file -> Stream downloadable cheat sheets, PDFs, and guides
  if ((req.method === 'GET' || req.method === 'HEAD') && pathname.startsWith('/downloads/')) {
    const fileName = path.basename(pathname);
    const dlFile = path.join(__dirname, 'public', 'downloads', fileName);
    if (fs.existsSync(dlFile)) {
      const stat = fs.statSync(dlFile);
      const ext = path.extname(dlFile).toLowerCase();
      const contentType = ext === '.pdf' ? 'application/pdf' : 'application/octet-stream';
      res.writeHead(200, {
        'Content-Type': contentType,
        'Content-Length': stat.size,
        'Content-Disposition': `inline; filename="${fileName}"`
      });
      return fs.createReadStream(dlFile).pipe(res);
    }
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    return res.end('Download asset not found');
  }

  // GET /guides -> Render Guides Hub Directory
  if ((req.method === 'GET' || req.method === 'HEAD') && (pathname === '/guides' || pathname === '/guides/')) {
    const articlesList = loadArticles();
    const html = renderGuidesIndex(articlesList, { reqHost: req.headers.host || 'traffic.aisimplesystem.com' });
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
  }

  // GET /guides/:slug or /power-guide or /blackout -> Render deep high-converting cluster article
  if (
    (req.method === 'GET' || req.method === 'HEAD') &&
    (pathname.startsWith('/guides/') || pathname === '/power-guide' || pathname === '/blackout')
  ) {
    const articlesList = loadArticles();
    let articleSlug = pathname.replace(/^\/guides\//, '').replace(/\/$/, '');
    if (pathname === '/power-guide' || pathname === '/blackout') {
      articleSlug = 'diy-home-power-blackout';
    }
    const article = articlesList[articleSlug];
    if (article) {
      const html = renderArticle(article, { reqHost: req.headers.host || 'traffic.aisimplesystem.com' });
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    } else {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`<h1>Guide Not Found</h1><p><a href="/guides">Browse All Resilience Guides</a></p>`);
    }
  }

  // GET /bio/:slug or /b/:slug or /links/:slug -> Render mobile Link-in-Bio creator hub
  if (
    (req.method === 'GET' || req.method === 'HEAD') &&
    (pathname.startsWith('/bio/') ||
      pathname.startsWith('/b/') ||
      pathname.startsWith('/links/') ||
      pathname === '/bio' ||
      pathname === '/b' ||
      pathname === '/links')
  ) {
    const biosList = loadBios();
    let rawSlug = pathname
      .replace(/^\/(bio|b|links)\/?/, '')
      .replace(/\/$/, '')
      .replace(/[),.;"']+$/, '')
      .trim();
    if (!rawSlug) {
      // Default /bio index page
      rawSlug = 'dog'; // fallback or show first
    }
    const bio = findBioBySlug(biosList, rawSlug);
    if (bio) {
      const host = req.headers.host || 'traffic.aisimplesystem.com';
      const query = Object.fromEntries(parsedUrl.searchParams.entries());
      const html = renderBioPage(bio, host, query);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    }
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    const available = Object.keys(biosList)
      .map((k) => `<li><a href="/bio/${k}" style="color:#06b6d4">/bio/${k}</a>: ${biosList[k].channelName}</li>`)
      .join('');
    return res.end(`
      <body style="background:#020617;color:#f8fafc;font-family:sans-serif;padding:40px;text-align:center">
        <h1>Bio Page "${escapeHtml(rawSlug)}" Not Found</h1>
        <p style="color:#94a3b8">Active creator bio hubs:</p>
        <ul style="list-style:none;padding:0;line-height:2">${available}</ul>
      </body>
    `);
  }

  // GET /o/:slug or Friendly Short Root (e.g. /santa, /card, /sleep, /matrix) -> Render dynamic lander
  const resolvedSlug = resolveOfferSlug(pathname);
  const offersList = loadOffers();
  if (
    (req.method === 'GET' || req.method === 'HEAD') &&
    resolvedSlug &&
    offersList[resolvedSlug] &&
    !pathname.startsWith('/api/') &&
    pathname !== '/health' &&
    pathname !== '/launchpad' &&
    pathname !== '/'
  ) {
    try {
      const offer = offersList[resolvedSlug];
      const html = renderOfferLander(offer);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(html);
    } catch (err) {
      console.error('Error rendering lander for slug', resolvedSlug, err);
      res.writeHead(500, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`<h1>Error rendering offer lander</h1><p>${err.message}</p><p><a href="/launchpad">Back to Launchpad</a></p>`);
    }
  }

  // Fallback GET /o/:slug 404 message
  if ((req.method === 'GET' || req.method === 'HEAD') && pathname.startsWith('/o/')) {
    const rawSlug = pathname.replace(/^\/o\//, '').replace(/\/$/, '');
    res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(`<h1>Offer "${rawSlug}" not found</h1><p><a href="/launchpad">Open Offer Launchpad</a></p>`);
  }

  // GET /api/cs/accounts -> List all ContentStudio connected accounts
  if (req.method === 'GET' && pathname === '/api/cs/accounts') {
    try {
      const accounts = await csClient.getConnectedAccounts();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, accounts }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // GET /api/vf/channels -> Dynamically fetch all live connected social channels from ViralForge
  if (req.method === 'GET' && pathname === '/api/vf/channels') {
    try {
      const data = await vfClient.fetchLiveSocialAccounts();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, ...data }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // GET /api/offers -> List all active offers
  if (req.method === 'GET' && pathname === '/api/offers') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, offers: loadOffers() }));
  }

  // GET /api/catalyst/niches -> Retrieve all pre-engineered Problem Catalysts
  if (req.method === 'GET' && pathname === '/api/catalyst/niches') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, catalysts: catalystEngine.getCatalysts() }));
  }

  // POST /api/catalyst/analyze -> Analyze custom problem input and return campaign blueprint
  if (req.method === 'POST' && pathname === '/api/catalyst/analyze') {
    try {
      const body = await readJsonBody(req);
      const problem = body.problem || '';
      if (!problem) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Problem description required' }));
      }
      const blueprint = catalystEngine.analyzeCustomProblem(problem);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, blueprint }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // POST /api/catalyst/autopilot -> Autonomous Niche Radar & 1-Click Complete Funnel Deployment
  if (req.method === 'POST' && pathname === '/api/catalyst/autopilot') {
    try {
      const body = await readJsonBody(req);
      const result = await autonomousCatalyst.runAutonomousPipeline(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // GET /api/catalyst/radar-seeds -> Return Candidate Problem Radar Seeds
  if (req.method === 'GET' && pathname === '/api/catalyst/radar-seeds') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, seeds: autonomousCatalyst.PROBLEM_RADAR_SEEDS }));
  }

  // GET /api/catalyst/continuous/status -> Return 24h Guardrailed Auto-Pilot Daemon State
  if (req.method === 'GET' && pathname === '/api/catalyst/continuous/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, state: continuousDaemon.getStatus() }));
  }

  // POST /api/catalyst/continuous/toggle -> Enable/disable or adjust interval of continuous daemon
  if (req.method === 'POST' && pathname === '/api/catalyst/continuous/toggle') {
    try {
      const body = await readJsonBody(req);
      const state = continuousDaemon.toggleContinuous(body.enabled, body.intervalHours);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, state }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // POST /api/catalyst/continuous/trigger-now -> Manually fire 1 immediate iteration of daemon
  if (req.method === 'POST' && pathname === '/api/catalyst/continuous/trigger-now') {
    try {
      const result = await continuousDaemon.executeScheduledRun('manual_launchpad_trigger');
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // ==========================================
  // PREDICTION-TO-PROFIT AFFILIATE INTELLIGENCE API
  // ==========================================

  // GET /api/prediction/state -> Return live prediction intelligence state
  if (req.method === 'GET' && pathname === '/api/prediction/state') {
    try {
      if (fs.existsSync(PREDICTION_STATE_PATH)) {
        const state = JSON.parse(fs.readFileSync(PREDICTION_STATE_PATH, 'utf8'));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, state }));
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, state: { opportunities: [], campaignDrafts: [] } }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // POST /api/prediction/scan -> Run real-time prediction market intelligence pipeline
  if (req.method === 'POST' && pathname === '/api/prediction/scan') {
    try {
      const body = await readJsonBody(req).catch(() => ({}));
      const result = await predictionPipeline.runPredictionPipeline(body);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // GET /api/prediction/attribution -> Return revenue attribution metrics across prediction campaigns
  if (req.method === 'GET' && pathname === '/api/prediction/attribution') {
    try {
      let state = { opportunities: [], campaignDrafts: [] };
      if (fs.existsSync(PREDICTION_STATE_PATH)) {
        state = JSON.parse(fs.readFileSync(PREDICTION_STATE_PATH, 'utf8'));
      }

      // Compute aggregate attribution metrics across prediction campaigns
      // Unpublished campaigns strictly have 0 visits, 0 clicks, 0 sales, and $0.00 commissions.
      // Never synthesize or invent transaction records.
      const campaigns = (state.campaignDrafts || []).map((draft) => {
        const isPublished = draft.status === 'PUBLISHED';
        const visits = isPublished ? (draft.actualVisits || 0) : 0;
        const leads = isPublished ? (draft.actualLeads || 0) : 0;
        const clicks = isPublished ? (draft.actualClicks || 0) : 0;
        const confirmedSales = isPublished ? (draft.actualSales || 0) : 0;
        const confirmedCommissionsUsd = isPublished ? (draft.actualCommissionsUsd || 0.0) : 0.0;
        const netRevenueUsd = isPublished ? (draft.actualNetRevenueUsd || 0.0) : 0.0;
        const epc = clicks > 0 ? Number((netRevenueUsd / clicks).toFixed(2)) : 0.0;

        return {
          campaignId: draft.campaignId,
          title: draft.title,
          offerSlug: draft.trackingConfig?.offerSlug || 'direct',
          merchant: draft.trackingConfig?.merchant || 'Partner',
          status: draft.status || 'UNPUBLISHED',
          visits,
          leads,
          clicks,
          confirmedSales,
          confirmedCommissionsUsd,
          netRevenueUsd,
          epc
        };
      });

      const totalVisits = campaigns.reduce((sum, c) => sum + c.visits, 0);
      const totalLeads = campaigns.reduce((sum, c) => sum + c.leads, 0);
      const totalAffiliateClicks = campaigns.reduce((sum, c) => sum + c.clicks, 0);
      const confirmedSalesCount = campaigns.reduce((sum, c) => sum + c.confirmedSales, 0);
      const confirmedCommissionsUsd = campaigns.reduce((sum, c) => sum + c.confirmedCommissionsUsd, 0.0);
      const refundLossUsd = 0.0;
      const netRevenueUsd = campaigns.reduce((sum, c) => sum + c.netRevenueUsd, 0.0);
      const leadConversionRate = totalVisits > 0 ? `${((totalLeads / totalVisits) * 100).toFixed(1)}%` : '0.0%';
      const clickThroughRate = totalVisits > 0 ? `${((totalAffiliateClicks / totalVisits) * 100).toFixed(1)}%` : '0.0%';
      const averageEpc = totalAffiliateClicks > 0 ? Number((netRevenueUsd / totalAffiliateClicks).toFixed(2)) : 0.0;

      const attribution = {
        totalVisits,
        totalLeads,
        leadConversionRate,
        totalAffiliateClicks,
        clickThroughRate,
        confirmedSalesCount,
        confirmedCommissionsUsd,
        refundLossUsd,
        netRevenueUsd,
        averageEpc,
        campaigns
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, attribution }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // POST /api/prediction/review -> Admin decision on opportunity (APPROVE / REJECT / WATCHLIST / REVISION)
  if (req.method === 'POST' && pathname === '/api/prediction/review') {
    try {
      const body = await readJsonBody(req);
      const { opportunityId, action, reason, notes } = body || {};
      const validActions = ['APPROVE', 'REJECT', 'WATCHLIST', 'REVISION'];
      if (!opportunityId || !validActions.includes(action)) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Valid opportunityId and action (APPROVE, REJECT, WATCHLIST, REVISION) required' }));
      }

      if (!fs.existsSync(PREDICTION_STATE_PATH)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'No prediction state found' }));
      }

      const state = JSON.parse(fs.readFileSync(PREDICTION_STATE_PATH, 'utf8'));
      const opp = state.opportunities.find(o => o.opportunityId === opportunityId);
      if (!opp) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Opportunity not found' }));
      }

      if (action === 'APPROVE') {
        opp.status = 'APPROVED';
      } else if (action === 'REJECT') {
        opp.status = 'REJECTED';
        opp.rejectionReason = reason || 'MANUAL_ADMIN_REJECTION';
      } else if (action === 'WATCHLIST') {
        opp.status = 'WATCHLIST';
      } else {
        opp.status = 'PENDING_REVIEW';
      }

      opp.adminNotes = notes || null;
      opp.reviewedAt = new Date().toISOString();

      // Update associated campaign draft status accordingly
      const draft = state.campaignDrafts?.find(d => d.opportunityId === opportunityId);
      if (draft) {
        if (action === 'APPROVE') draft.status = 'APPROVED';
        else if (action === 'REJECT') draft.status = 'REJECTED';
        else draft.status = 'UNPUBLISHED';
      }

      fs.writeFileSync(PREDICTION_STATE_PATH, JSON.stringify(state, null, 2), 'utf8');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, opportunity: opp, draft }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // ==========================================
  // WEBINAR ENGINE & ADMIN AUTHENTICATION API ENDPOINTS
  // ==========================================

  // POST /api/admin/session -> Create HttpOnly admin/viewer session cookie with CSRF token & Secure flag enforcement
  if (req.method === 'POST' && pathname === '/api/admin/session') {
    try {
      const body = await readJsonBody(req);
      const session = webinarEngine.createAdminSession(body.token, req);
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Cache-Control': 'no-store',
        'Set-Cookie': session.cookieHeader
      });
      return res.end(JSON.stringify({
        ok: true,
        actorId: session.actorId,
        role: session.role,
        permissions: session.permissions,
        csrfToken: session.csrfToken,
        expiresAt: session.expiresAt
      }));
    } catch (err) {
      res.writeHead(err.statusCode || 400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: err.code || 'ADMIN_SESSION_ERROR', error: err.message }));
    }
  }

  // GET /api/admin/session -> Inspect current authenticated admin session
  if (req.method === 'GET' && pathname === '/api/admin/session') {
    const auth = webinarEngine.authenticateAdminRequest(req, 'webinar:read');
    if (!auth.authenticated || !auth.authorized) {
      res.writeHead(auth.statusCode || 401, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, authenticated: false, code: auth.code, error: auth.error }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
    return res.end(JSON.stringify({
      ok: true,
      authenticated: true,
      actorId: auth.actorId,
      role: auth.role,
      permissions: auth.permissions,
      csrfToken: auth.csrfToken || null
    }));
  }

  // DELETE /api/admin/session -> Revoke admin session cookie with matching Secure attribute
  if (req.method === 'DELETE' && pathname === '/api/admin/session') {
    const cookieHeader = req.headers.cookie || '';
    const m = cookieHeader.match(/(?:^|;\s*)webinar_admin_session=([^;]+)/);
    const sessionId = m && m[1] ? decodeURIComponent(m[1]) : null;
    const revoked = webinarEngine.revokeAdminSession(sessionId, req);
    res.writeHead(200, {
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store',
      'Set-Cookie': revoked.cookieHeader
    });
    return res.end(JSON.stringify({ ok: true }));
  }

  // GET /api/public/webinars/:slug -> Public-only metadata for published webinars (no preview tokens, drafts, or audit logs)
  if (req.method === 'GET' && pathname.startsWith('/api/public/webinars/')) {
    const slug = pathname.replace('/api/public/webinars/', '').split('/')[0];
    const w = webinarEngine.getWebinar(slug);
    const pub = webinarEngine.serializeForPublic(w);
    if (!pub) {
      res.writeHead(404, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: 'NOT_PUBLISHED', error: 'Published webinar not found.' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' });
    return res.end(JSON.stringify({ ok: true, webinar: pub }));
  }

  // POST /api/webinars/:slug/register -> Viewer Lead Capture with Server-Verified Viewer Context & Durable Outbox
  if (req.method === 'POST' && pathname.match(/^\/api\/webinars\/[^/]+\/register$/)) {
    try {
      const slug = pathname.split('/')[3];
      const body = await readJsonBody(req);
      const viewerContextToken = req.headers['x-viewer-context'] || body.viewerContextToken || '';
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const userAgent = req.headers['user-agent'] || 'Unknown';
      const result = await webinarEngine.registerLead(slug, body, {
        viewerContextToken,
        ip,
        userAgent
      });
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify(result));
    } catch (err) {
      const status = err.statusCode || 400;
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: err.code || 'REGISTRATION_ERROR', error: err.message }));
    }
  }

  // POST /api/webinars/:slug/consent -> Update or withdraw marketing consent & cancel any pending Brevo outbox job
  if (req.method === 'POST' && pathname.match(/^\/api\/webinars\/[^/]+\/consent$/)) {
    try {
      const slug = pathname.split('/')[3];
      const body = await readJsonBody(req);
      const viewerContextToken = req.headers['x-viewer-context'] || body.viewerContextToken || '';
      const adminAuth = webinarEngine.authenticateAdminRequest(req, 'webinar:write');
      const isAdmin = Boolean(adminAuth.authenticated && adminAuth.authorized);
      const result = await webinarEngine.updateRegistrationConsent(slug, body, {
        viewerContextToken,
        isAdmin,
        actorId: isAdmin ? adminAuth.actorId : null
      });
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify(result));
    } catch (err) {
      const status = err.statusCode || 400;
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: err.code || 'CONSENT_UPDATE_ERROR', error: err.message }));
    }
  }

  // POST /api/webinars/:slug/qa -> Reference-Driven Product FAQ Assistant with Server-Verified Viewer Context
  if (req.method === 'POST' && pathname.match(/^\/api\/webinars\/[^/]+\/qa$/)) {
    try {
      const slug = pathname.split('/')[3];
      const body = await readJsonBody(req);
      const viewerContextToken = req.headers['x-viewer-context'] || body.viewerContextToken || '';
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const result = await webinarEngine.answerViewerQuestion(slug, body.question, {
        viewerContextToken,
        ip
      });
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify(result));
    } catch (err) {
      const status = err.statusCode || 400;
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: err.code || 'QA_ERROR', error: err.message }));
    }
  }

  // POST /api/webinars/:slug/track -> Interval-Based Viewer Analytics Tracking Bound to Signed Session
  if (req.method === 'POST' && pathname.match(/^\/api\/webinars\/[^/]+\/track$/)) {
    try {
      const slug = pathname.split('/')[3];
      const body = await readJsonBody(req);
      const viewerContextToken = req.headers['x-viewer-context'] || body.viewerContextToken || '';
      const userAgent = req.headers['user-agent'] || '';
      const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
      const result = await webinarEngine.trackEvent(slug, body, {
        viewerContextToken,
        userAgent,
        ip
      });
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify(result));
    } catch (err) {
      const status = err.statusCode || 400;
      res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: err.code || 'TRACK_ERROR', error: err.message }));
    }
  }

  // GET /api/webinars/:slug/brevo-outbox -> Inspect durable Brevo contact sync outbox (requires webinar:read)
  if (req.method === 'GET' && pathname.match(/^\/api\/webinars\/[^/]+\/brevo-outbox$/)) {
    const auth = webinarEngine.authenticateAdminRequest(req, 'webinar:read');
    if (!auth.authenticated || !auth.authorized) {
      res.writeHead(auth.statusCode || 401, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: auth.code, error: auth.error }));
    }
    try {
      const slug = pathname.split('/')[3];
      const outbox = webinarEngine.getBrevoOutboxSummary(slug);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: true, slug, outbox }));
    } catch (err) {
      res.writeHead(err.statusCode || 503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({
        ok: false,
        code: err.code || 'STORE_UNHEALTHY',
        error: err.message,
        storeHealth: webinarEngine.getStoreHealthStatus()
      }));
    }
  }

  // POST /api/webinars/:slug/brevo-outbox/process -> Run durable Brevo outbox worker pass (requires webinar:write)
  if (req.method === 'POST' && pathname.match(/^\/api\/webinars\/[^/]+\/brevo-outbox\/process$/)) {
    const auth = webinarEngine.authenticateAdminRequest(req, 'webinar:write');
    if (!auth.authenticated || !auth.authorized) {
      res.writeHead(auth.statusCode || 401, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: auth.code, error: auth.error }));
    }
    try {
      const slug = pathname.split('/')[3];
      const body = await readJsonBody(req);
      const result = await webinarEngine.processBrevoOutbox({
        workerId: `admin_manual:${auth.actorId}`,
        batchSize: Number(body.batchSize) || 10
      });
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({
        ok: true,
        ...result,
        webinarOutbox: webinarEngine.getBrevoOutboxSummary(slug)
      }));
    } catch (err) {
      res.writeHead(err.statusCode || 503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({
        ok: false,
        code: err.code || 'OUTBOX_PROCESS_ERROR',
        error: err.message,
        storeHealth: webinarEngine.getStoreHealthStatus()
      }));
    }
  }

  // GET /api/webinars -> List all webinars (Admin Launchpad, requires webinar:read)
  if (req.method === 'GET' && pathname === '/api/webinars') {
    const auth = webinarEngine.authenticateAdminRequest(req, 'webinar:read');
    if (!auth.authenticated || !auth.authorized) {
      res.writeHead(auth.statusCode || 401, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: auth.code, error: auth.error }));
    }
    try {
      const webinars = webinarEngine.getAllWebinarsForAdmin();
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({
        ok: true,
        storeHealth: webinarEngine.getStoreHealthStatus(),
        webinars
      }));
    } catch (err) {
      res.writeHead(err.statusCode || 503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({
        ok: false,
        code: err.code || 'STORE_UNHEALTHY',
        error: err.message,
        storeHealth: webinarEngine.getStoreHealthStatus()
      }));
    }
  }

  // POST /api/webinars/:slug/preview-links -> Create scoped expiring preview link (requires webinar:preview)
  if (req.method === 'POST' && pathname.match(/^\/api\/webinars\/[^/]+\/preview-links$/)) {
    const auth = webinarEngine.authenticateAdminRequest(req, 'webinar:preview');
    if (!auth.authenticated || !auth.authorized) {
      res.writeHead(auth.statusCode || 401, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: auth.code, error: auth.error }));
    }
    try {
      const slug = pathname.split('/')[3];
      const body = await readJsonBody(req);
      const ttlSeconds = body.ttlSeconds || (body.ttlMinutes ? Number(body.ttlMinutes) * 60 : 3600);
      const preview = await webinarEngine.createPreviewLink(slug, { ttlSeconds, revision: body.revision }, auth.actorId);
      const webinar = webinarEngine.getWebinarForAdmin(slug);
      res.writeHead(201, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: true, preview, webinar }));
    } catch (err) {
      res.writeHead(err.statusCode || 400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: err.code, error: err.message }));
    }
  }

  // POST /api/webinars/:slug/preview-links/revoke -> Revoke preview link(s) (requires webinar:preview)
  if (req.method === 'POST' && pathname.match(/^\/api\/webinars\/[^/]+\/preview-links\/revoke$/)) {
    const auth = webinarEngine.authenticateAdminRequest(req, 'webinar:preview');
    if (!auth.authenticated || !auth.authorized) {
      res.writeHead(auth.statusCode || 401, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: auth.code, error: auth.error }));
    }
    try {
      const slug = pathname.split('/')[3];
      const body = await readJsonBody(req);
      const tokenId = body.revokeAll ? 'ALL' : body.tokenId;
      const result = await webinarEngine.revokePreviewLink(slug, { tokenId }, auth.actorId);
      const webinar = webinarEngine.getWebinarForAdmin(slug);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: true, ...result, webinar }));
    } catch (err) {
      res.writeHead(err.statusCode || 400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: err.code, error: err.message }));
    }
  }

  // POST /api/webinars/:slug/status -> State transition (SUBMIT_FOR_REVIEW, APPROVE, PUBLISH, UNPUBLISH, ARCHIVE)
  if (req.method === 'POST' && pathname.match(/^\/api\/webinars\/[^/]+\/status$/)) {
    try {
      const slug = pathname.split('/')[3];
      const body = await readJsonBody(req);
      const rawAction = String(body.action || body.status || '').toUpperCase();
      const neededPermission =
        rawAction === 'PUBLISH' || rawAction === 'PUBLISHED' || rawAction === 'UNPUBLISH' || rawAction === 'ARCHIVE' || rawAction === 'ARCHIVED'
          ? 'webinar:publish'
          : 'webinar:approve';

      const auth = webinarEngine.authenticateAdminRequest(req, neededPermission);
      if (!auth.authenticated || !auth.authorized) {
        res.writeHead(auth.statusCode || 401, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        return res.end(JSON.stringify({ ok: false, code: auth.code, error: auth.error }));
      }

      // Actor strictly comes from authenticated server identity (auth.actorId), ignoring any body.actor
      const webinar = await webinarEngine.transitionWebinarState(
        slug,
        { action: rawAction, note: body.note, revision: body.revision },
        auth.actorId
      );
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: true, webinar }));
    } catch (err) {
      res.writeHead(err.statusCode || 400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: err.code, error: err.message }));
    }
  }

  // POST /api/webinars/:slug/videoman-import -> Import MP4 video into webinar draft (requires webinar:write)
  if (req.method === 'POST' && pathname.match(/^\/api\/webinars\/[^/]+\/videoman-import$/)) {
    const auth = webinarEngine.authenticateAdminRequest(req, 'webinar:write');
    if (!auth.authenticated || !auth.authorized) {
      res.writeHead(auth.statusCode || 401, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: auth.code, error: auth.error }));
    }
    try {
      const slug = pathname.split('/')[3];
      const body = await readJsonBody(req);
      const webinar = await webinarEngine.importVideoManAsset(slug, body, auth.actorId);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: true, webinar }));
    } catch (err) {
      res.writeHead(err.statusCode || 400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: err.code, error: err.message }));
    }
  }

  // POST /api/webinars/:slug/videoman-manifest -> Export VideoMan production manifest (requires webinar:read)
  if (req.method === 'POST' && pathname.match(/^\/api\/webinars\/[^/]+\/videoman-manifest$/)) {
    const auth = webinarEngine.authenticateAdminRequest(req, 'webinar:read');
    if (!auth.authenticated || !auth.authorized) {
      res.writeHead(auth.statusCode || 401, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: auth.code, error: auth.error }));
    }
    try {
      const slug = pathname.split('/')[3];
      const manifest = webinarEngine.generateVideoManManifest(slug, auth.actorId);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: true, manifest }));
    } catch (err) {
      res.writeHead(err.statusCode || 400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: err.code, error: err.message }));
    }
  }

  // GET /api/webinars/:slug/analytics -> Reconciled Metrics & Audit History (requires webinar:read)
  if (req.method === 'GET' && pathname.match(/^\/api\/webinars\/[^/]+\/analytics$/)) {
    const auth = webinarEngine.authenticateAdminRequest(req, 'webinar:read');
    if (!auth.authenticated || !auth.authorized) {
      res.writeHead(auth.statusCode || 401, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: auth.code, error: auth.error }));
    }
    try {
      const slug = pathname.split('/')[3];
      const webinar = webinarEngine.getWebinarForAdmin(slug);
      if (!webinar) {
        res.writeHead(404, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        return res.end(JSON.stringify({ ok: false, error: 'Webinar not found' }));
      }
      const registrations = webinarEngine.getRegistrationsForWebinar(slug);
      const brevoOutbox = webinarEngine.getBrevoOutboxSummary(slug);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({
        ok: true,
        analytics: webinar.analytics,
        telemetryTrustLevel: 'CLIENT_REPORTED_BOUND_TO_SIGNED_SESSION',
        sessionRefreshPolicy: 'NEW_SIGNED_SESSION_ON_PAGE_LOAD',
        brevoOutbox,
        persistenceModel: webinar.persistenceModel,
        storeHealth: webinarEngine.getStoreHealthStatus(),
        auditLog: webinar.auditLog,
        versionHistory: webinar.versionHistory,
        approval: webinar.approval,
        hasUnpublishedDraftChanges: webinar.hasUnpublishedDraftChanges,
        status: webinar.status,
        draftRevision: webinar.draft?.revision || 1,
        publishedRevision: webinar.publishedSnapshot?.revision || null,
        registrationsCount: registrations.length,
        registrations
      }));
    } catch (err) {
      res.writeHead(err.statusCode || 503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({
        ok: false,
        code: err.code || 'STORE_UNHEALTHY',
        error: err.message,
        storeHealth: webinarEngine.getStoreHealthStatus()
      }));
    }
  }

  // GET /api/webinars/:slug -> Get single webinar with full audit trail & analytics (requires webinar:read)
  if (req.method === 'GET' && pathname.startsWith('/api/webinars/') && pathname.split('/').length === 4) {
    const auth = webinarEngine.authenticateAdminRequest(req, 'webinar:read');
    if (!auth.authenticated || !auth.authorized) {
      res.writeHead(auth.statusCode || 401, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: auth.code, error: auth.error }));
    }
    try {
      const slug = pathname.split('/')[3];
      const webinar = webinarEngine.getWebinarForAdmin(slug);
      if (!webinar) {
        res.writeHead(404, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
        return res.end(JSON.stringify({ ok: false, error: 'Webinar not found' }));
      }
      const registrations = webinarEngine.getRegistrationsForWebinar(slug);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: true, webinar, registrations }));
    } catch (err) {
      res.writeHead(err.statusCode || 503, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({
        ok: false,
        code: err.code || 'STORE_UNHEALTHY',
        error: err.message,
        storeHealth: webinarEngine.getStoreHealthStatus()
      }));
    }
  }

  // POST /api/webinars -> Create new webinar draft (requires webinar:write)
  if (req.method === 'POST' && pathname === '/api/webinars') {
    const auth = webinarEngine.authenticateAdminRequest(req, 'webinar:write');
    if (!auth.authenticated || !auth.authorized) {
      res.writeHead(auth.statusCode || 401, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: auth.code, error: auth.error }));
    }
    try {
      const body = await readJsonBody(req);
      const webinar = await webinarEngine.saveWebinar(body, auth.actorId);
      res.writeHead(201, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: true, webinar }));
    } catch (err) {
      res.writeHead(err.statusCode || 400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: err.code, error: err.message }));
    }
  }

  // PUT /api/webinars/:slug -> Update webinar draft (requires webinar:write)
  if (req.method === 'PUT' && pathname.startsWith('/api/webinars/') && pathname.split('/').length === 4) {
    const auth = webinarEngine.authenticateAdminRequest(req, 'webinar:write');
    if (!auth.authenticated || !auth.authorized) {
      res.writeHead(auth.statusCode || 401, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: auth.code, error: auth.error }));
    }
    try {
      const slug = pathname.split('/')[3];
      const body = await readJsonBody(req);
      body.slug = slug;
      const webinar = await webinarEngine.saveWebinar(body, auth.actorId);
      res.writeHead(200, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: true, webinar }));
    } catch (err) {
      res.writeHead(err.statusCode || 400, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' });
      return res.end(JSON.stringify({ ok: false, code: err.code, error: err.message }));
    }
  }

  // GET /api/vf/job-status?slug=... -> Check live ViralForge render + auto-schedule state
  if (req.method === 'GET' && pathname === '/api/vf/job-status') {
    const slug = parsedUrl.searchParams.get('slug') || '';
    const offers = loadOffers();
    const offer = offers[slug];
    if (!offer || !offer.viralForgeJob) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: 'No active ViralForge job for this offer' }));
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, job: offer.viralForgeJob }));
  }

  // GET /api/vidiq/research?keyword=... -> Live vidIQ Keyword Research
  if (req.method === 'GET' && pathname === '/api/vidiq/research') {
    try {
      const keyword = parsedUrl.searchParams.get('keyword') || 'free traffic';
      const data = await vidiqClient.researchKeyword(keyword);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, ...data }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // POST /api/vidiq/thumbnail -> Generate high-CTR YouTube thumbnail via vidIQ AI
  if (req.method === 'POST' && pathname === '/api/vidiq/thumbnail') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const title = payload.title || 'Secret Traffic Matrix';
        const description = payload.description || '';
        const userQuery = payload.userQuery || '';
        const slug = payload.slug || 'traffic';
        const targetFilename = `${slug}-vidiq-thumbnail.png`;

        const thumb = await vidiqClient.generateThumbnail({
          title,
          description,
          userQuery,
          orientation: payload.orientation || 'landscape',
          targetFilename
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, ...thumb }));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // POST /api/vidiq/score-thumbnail -> Score YouTube thumbnail CTR potential
  if (req.method === 'POST' && pathname === '/api/vidiq/score-thumbnail') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const scoreData = await vidiqClient.scoreThumbnail({
          title: payload.title || 'Untitled',
          videoId: payload.videoId || 'dQw4w9WgXcQ',
          image: payload.image
        });
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, ...scoreData }));
      } catch (err) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // GET /api/nfb/search -> Search 9 Figure Buddy Outliers via MCP
  if (req.method === 'GET' && pathname === '/api/nfb/search') {
    try {
      const query = parsedUrl.searchParams.get('query') || 'viral';
      const niche = parsedUrl.searchParams.get('niche') || '';
      const tier = parsedUrl.searchParams.get('tier') || '';
      const results = await nfbClient.searchOutliers({ query, niche, tier });
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, results }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // POST /api/scrape-offer -> Auto-extract title, headline, and description from any URL
  if (req.method === 'POST' && pathname === '/api/scrape-offer') {
    try {
      let { url } = await readJsonBody(req);
      if (!url) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'URL is required' }));
      }

      // Parse sponsor code from query params or iDevAffiliate path (e.g. 144-33-3-31.html)
      let targetUrl = url;
      let sponsorCode = '144';
      try {
        const u = new URL(url);
        sponsorCode =
          u.searchParams.get('affiliate') ||
          u.searchParams.get('ref') ||
          u.searchParams.get('sponsor') ||
          u.searchParams.get('aid') ||
          u.searchParams.get('aff') ||
          '144';
      } catch (_) {}

      // Extract WarriorPlus affiliate ID
      const wplusSponsorMatch = url.match(/warriorplus\.com\/o2?\/a\/([a-zA-Z0-9_-]+)/i);
      if (wplusSponsorMatch) {
        sponsorCode = wplusSponsorMatch[1];
      }

      // Extract ClickBank affiliate ID
      const cbSponsorMatch = url.match(/(?:https?:\/\/)?([a-zA-Z0-9_-]+)\.([a-zA-Z0-9_-]+)\.hop\.clickbank\.net/i);
      if (cbSponsorMatch) {
        sponsorCode = cbSponsorMatch[1];
      }

      if (url.includes('idevaffiliate.com')) {
        const idevMatch = url.match(/\/(\d+)-/);
        if (idevMatch) sponsorCode = idevMatch[1];
      }

      // Specialized preset for Perpetual Clicks (WarriorPlus hylcw0f or perpetualclicks.club)
      if (url.includes('hylcw0f') || url.toLowerCase().includes('perpetualclicks')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            ok: true,
            title: 'Perpetual Clicks',
            slug: 'perpetual-clicks',
            headlinePrefix: 'Never Chase',
            headlineGradient: 'Traffic Again...',
            headlineSuffix: 'Put Offers in Front of Proven Buyers Daily.',
            subheadline:
              'Put your offers in front of verified, high-intent buyers every single day without chasing leads, burning money on solo ads, or building complex funnels.',
            affiliateUrl: url,
            sponsorCode: sponsorCode || 'hylcw0f',
            landerArchetype: 'matrix',
            landerTheme: 'emerald',
            channelPreset: 'Marketing & Traffic (9 Channels: 5 FB Pages + YT AI Profit Lab + TikTok + X + Threads)',
            searchKeyword: 'buyer traffic',
            searchNiche: 'Affiliate Marketing',
            searchTier: 'gold'
          })
        );
      }

      // Specialized preset for 5 Dollar Friday Link 31: AI Visibility Engine (144-33-3-31.html)
      if (url.includes('idevaffiliate.com') && (url.includes('33-3-31') || url.includes('31.html'))) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            ok: true,
            title: 'AI Visibility Engine',
            slug: 'ai-visibility-engine',
            headlinePrefix: 'Rank #1 on AI Search:',
            headlineGradient: 'ChatGPT, Perplexity & Gemini',
            headlineSuffix: 'Recommendation Engine.',
            subheadline:
              'The all-in-one platform that tracks, fixes, and forces AI search engines to recommend your business first when millions of high-intent buyers skip Google entirely.',
            affiliateUrl: url,
            videoUrl: '/videos/ai-visibility-engine-commercial.mp4',
            sponsorCode: sponsorCode || '144',
            landerArchetype: 'split-video',
            landerTheme: 'cyan',
            channelPreset: 'Marketing & Traffic (9 Channels: 5 FB Pages + YT AI Profit Lab + TikTok + X + Threads)',
            searchKeyword: 'ai search optimization',
            searchNiche: 'Software & Technology',
            searchTier: 'gold'
          })
        );
      }

      // Specialized preset for 5 Dollar Friday Link 32: Viral Traffic Matrix (144-34-3-32.html)
      if (url.includes('idevaffiliate.com') && (url.includes('34-3-32') || url.includes('32.html'))) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            ok: true,
            title: 'Viral Traffic Matrix',
            slug: 'viral-traffic-matrix',
            headlinePrefix: 'Unlock The 8x',
            headlineGradient: 'Viral Traffic Matrix Multiplier',
            headlineSuffix: 'In Just 4 Minutes.',
            subheadline:
              'Turn single visitors into compounding organic reach with automated viral giveaway funnels, 2-tier referral loops, and instant Brevo lead generation.',
            affiliateUrl: url,
            videoUrl: '/videos/viral-traffic-matrix-commercial.mp4',
            sponsorCode: sponsorCode || '144',
            landerArchetype: 'matrix',
            landerTheme: 'emerald',
            channelPreset: 'Marketing & Traffic (9 Channels: 5 FB Pages + YT AI Profit Lab + TikTok + X + Threads)',
            searchKeyword: 'viral traffic',
            searchNiche: 'Affiliate Marketing',
            searchTier: 'gold'
          })
        );
      }

      // Specialized high-converting preset for Yu Sleep (Tart Cherry Sleep Trick)
      if (url.toLowerCase().includes('yusleep')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            ok: true,
            title: 'Yu Sleep 30-Second Cherry Trick',
            slug: 'yu-sleep',
            headlinePrefix: 'Discover the 30-Second',
            headlineGradient: 'Tart Cherry Deep Sleep Trick',
            headlineSuffix: 'That Stops 3 AM Wakeups.',
            subheadline:
              'Restore deep, uninterrupted sleep on your very first night with the natural 10-ingredient nano-synergy formula backed by an ironclad 60-day guarantee.',
            affiliateUrl: url,
            sponsorCode: sponsorCode || 'kmtwarrior',
            landerArchetype: 'split-video',
            landerTheme: 'cyan',
            channelPreset: 'Parenting & Kids (YT Storytime With Ms. Erica + IG)',
            searchKeyword: 'sleep',
            searchNiche: 'Health & Nutrition',
            searchTier: 'gold'
          })
        );
      }

      // Specialized high-converting preset for The Santa Circle
      if (url.includes('thesantacircle.com')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            ok: true,
            title: 'The Santa Circle Modern Gift Exchange',
            slug: 'santa-circle',
            headlinePrefix: 'Host the Ultimate',
            headlineGradient: 'Modern Secret Santa Gift Exchange',
            headlineSuffix: 'For Families & Teams.',
            subheadline:
              'The sleek, 100% ad-free Secret Santa platform with smart pair exclusions, Amazon wishlist integration, and instant private recipient reveals.',
            affiliateUrl: url,
            videoUrl: '/videos/ai-visibility-engine-commercial.mp4',
            sponsorCode: sponsorCode || '144',
            landerArchetype: 'voucher',
            landerTheme: 'emerald',
            channelPreset: 'Parenting & Kids (YT Storytime With Ms. Erica + IG)',
            searchKeyword: 'secret santa',
            searchNiche: '',
            searchTier: 'gold'
          })
        );
      }

      // Specialized high-converting preset for Bellver Card
      if (url.includes('bellvercards.com')) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            ok: true,
            title: 'Bellver Card Global Freedom',
            slug: 'bellver-card',
            headlinePrefix: 'Unlock Your High-Limit',
            headlineGradient: 'Bellver Global Visa Card',
            headlineSuffix: 'With Up to $250k Daily Spend.',
            subheadline:
              'Protect your privacy, pay your bills worldwide, and unlock physical or instant virtual cards with up to $250,000 daily limits.',
            affiliateUrl: url,
            sponsorCode: sponsorCode || 'kmtwarrior',
            landerArchetype: 'voucher',
            landerTheme: 'gold',
            channelPreset: 'Finance & Crypto (TikTok WalletWise + YT 60x Daily + X Marketranger)',
            searchKeyword: 'credit card',
            searchNiche: 'Personal Finance',
            searchTier: 'gold'
          })
        );
      }

      // If it is an iDevAffiliate tracking link, resolve destination or fallback to direct landing page
      if (url.includes('idevaffiliate.com') && url.includes('34-3-32')) {
        targetUrl = 'https://5dollarfriday.com/viral-traffic-matrix/';
      }

      // Universal WarriorPlus redirect handler (handles cookie jar, nonce token, and 302 hop)
      if (/warriorplus\.com\/o2?\/a\//i.test(url)) {
        try {
          let cookieJar = {};
          const updateCookies = (res) => {
            const raw = res.headers.getSetCookie ? res.headers.getSetCookie() : [res.headers.get('set-cookie')].filter(Boolean);
            for (const c of raw) {
              if (!c) continue;
              const parts = c.split(';')[0].split('=');
              if (parts[0]) cookieJar[parts[0].trim()] = parts.slice(1).join('=').trim();
            }
          };
          const getCookieHeader = () => Object.entries(cookieJar).map(([k, v]) => `${k}=${v}`).join('; ');

          let wpRes = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' }
          });
          updateCookies(wpRes);
          let wpHtml = await wpRes.text();

          let nonceMatch = wpHtml.match(/url=['"](.*?\?nonce=.*?)['"]/i) || wpHtml.match(/content=['"][^'"]*?url=(.*?)['"]/i);
          let nextWpUrl = url;
          if (nonceMatch) {
            nextWpUrl = new URL(nonceMatch[1], url).href;
            wpRes = await fetch(nextWpUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                Cookie: getCookieHeader()
              },
              redirect: 'manual'
            });
            updateCookies(wpRes);

            if (wpRes.status === 302 || wpRes.status === 301) {
              const loc = wpRes.headers.get('location');
              nextWpUrl = new URL(loc, nextWpUrl).href;
              wpRes = await fetch(nextWpUrl, {
                headers: {
                  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
                  Cookie: getCookieHeader()
                }
              });
              wpHtml = await wpRes.text();
            }
          }

          let destMatch =
            wpHtml.match(/content=['"]\d+;\s*(https?:\/\/[^'"]+)['"]/i) ||
            wpHtml.match(/window\.location\s*=\s*['"](https?:\/\/[^'"]+)['"]/i) ||
            wpHtml.match(/<meta\s+property=['"]og:url['"]\s+content=['"](https?:\/\/[^'"]+)['"]/i);

          if (destMatch && destMatch[1]) {
            targetUrl = destMatch[1];
          } else if (nextWpUrl && !nextWpUrl.includes('warriorplus.com')) {
            targetUrl = nextWpUrl;
          }
        } catch (wpErr) {
          console.warn('[WarriorPlus] Auto-resolve warning:', wpErr.message);
        }
      }

      // Universal ClickBank HopLink resolver
      if (/hop\.clickbank\.net/i.test(url)) {
        try {
          const cbRes = await fetch(url, {
            headers: { 'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36' },
            redirect: 'follow'
          });
          if (cbRes.url && !cbRes.url.includes('clickbank.net')) {
            targetUrl = cbRes.url;
          }
        } catch (_) {}
      }

      const htmlRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        redirect: 'follow'
      });
      let html = await htmlRes.text();
      let cleanHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');

      // Follow client-side / OpenGraph canonical redirect if present on cloaked bridge pages
      const ogUrlMatch =
        html.match(/<meta\s+property=["']og:url["']\s+content=["'](.*?)["']/i) ||
        html.match(/<link\s+rel=["']canonical["']\s+href=["'](.*?)["']/i) ||
        html.match(/<meta\s+http-equiv=["']refresh["']\s+content=["'].*?url=(.*?)["']/i);

      if (ogUrlMatch && ogUrlMatch[1]) {
        try {
          const dest = new URL(ogUrlMatch[1], targetUrl).href;
          if (new URL(dest).hostname !== new URL(targetUrl).hostname) {
            targetUrl = dest;
            const destRes = await fetch(targetUrl, {
              headers: {
                'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
              },
              redirect: 'follow'
            });
            html = await destRes.text();
            cleanHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');
          }
        } catch (_) {}
      }

      const titleMatch = cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const metaDescMatch =
        html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i) ||
        html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i);
      const metaTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i);
      const schemaNameMatch = html.match(/["']name["']\s*:\s*["']([^"']{3,100})["']/i);

      const clean = (s) =>
        (s || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&#8211;/g, '-')
          .replace(/&amp;/g, '&')
          .replace(/&nbsp;/g, ' ')
          .replace(/[\r\n\t]+/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const candidateTexts = [...cleanHtml.matchAll(/<(?:p|div|span|h[1-6])[^>]*>([\s\S]{20,260}?)<\/(?:p|div|span|h[1-6])>/gi)]
        .map((m) => clean(m[1]))
        .filter((t) => t.length > 20 && !t.includes('Cookie') && !t.includes('WordPress') && !t.includes('function(') && !t.includes('{') && !t.includes('}'));

      const headings = [...cleanHtml.matchAll(/<h[1-3][^>]*>([\s\S]*?)<\/h[1-3]>/gi)]
        .map((m) => clean(m[1]))
        .filter((t) => t.length > 3 && !t.includes('{') && !t.includes('}'));

      let fullTitle = clean((metaTitleMatch && metaTitleMatch[1]) || (titleMatch && titleMatch[1]));
      if (!fullTitle || fullTitle.toLowerCase() === 'home' || fullTitle.length < 3) {
        if (schemaNameMatch && schemaNameMatch[1] && schemaNameMatch[1].length > 3 && schemaNameMatch[1].length < 60) {
          fullTitle = clean(schemaNameMatch[1]);
        } else {
          try {
            const host = new URL(targetUrl).hostname.replace(/^www\./, '').split('.')[0];
            let brand = host.replace(/[-_]/g, ' ');
            if (!brand.includes(' ')) {
              brand = brand.replace(/(perpetual)(clicks)/i, '$1 $2')
                           .replace(/(traffic)(matrix)/i, '$1 $2')
                           .replace(/([a-z])([A-Z])/g, '$1 $2');
            }
            fullTitle = brand.replace(/\b\w/g, (c) => c.toUpperCase());
          } catch (_) {}
        }
      }

      // Guard against Cloudflare challenge pages
      if (
        fullTitle.toLowerCase().includes('just a moment') ||
        cleanHtml.includes('cf-mitigated') ||
        cleanHtml.includes('challenges.cloudflare.com')
      ) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            ok: false,
            error:
              'This affiliate tracking link is protected by Cloudflare bot challenge. Please enter the offer name and headline manually in Step 2, and use your link as the Affiliate URL.'
          })
        );
      }

      let title = (fullTitle.split(/\s+[\u2013\u2014|]\s+|\s+-\s+/)[0] || fullTitle).trim();

      // Better headline selection (combines stacked subheadings if present)
      let headline = '';
      if (headings.length >= 2 && headings[0].length < 30 && headings[1].length < 40 && !headings[0].toLowerCase().includes('welcome')) {
        headline = `${headings[0]} ${headings[1]}`.trim();
      } else {
        headline = headings.find((h) => h.length > 15) || candidateTexts[0] || 'Viral Opportunity';
      }

      // If title is too long or identical to headline, derive brand from domain
      if (title.length > 40 || title.toLowerCase() === headline.toLowerCase()) {
        try {
          const host = new URL(targetUrl).hostname.replace(/^www\./, '').split('.')[0];
          let brand = host.replace(/[-_]/g, ' ');
          if (!brand.includes(' ')) {
            brand = brand.replace(/(perpetual)(clicks)/i, '$1 $2')
                         .replace(/(traffic)(matrix)/i, '$1 $2')
                         .replace(/([a-z])([A-Z])/g, '$1 $2');
          }
          title = brand.replace(/\b\w/g, (c) => c.toUpperCase());
        } catch (_) {}
      }

      const subheadline =
        clean(metaDescMatch && metaDescMatch[1]) ||
        headings.find((h) => h !== headline && !headline.includes(h) && h.length > 20) ||
        candidateTexts.find((t) => t.length > 40 && t !== headline) ||
        candidateTexts[1] ||
        candidateTexts[0] ||
        '';

      // Smart headline breakdown into Prefix, Gradient, Suffix if not already formatted
      let headlinePrefix = 'Unlock';
      let headlineGradient = headline;
      let headlineSuffix = 'Today.';
      const words = headline.split(' ');
      if (words.length >= 4) {
        headlinePrefix = words.slice(0, 2).join(' ');
        headlineGradient = words.slice(2, Math.min(words.length - 1, 6)).join(' ');
        headlineSuffix = words.slice(Math.min(words.length - 1, 6)).join(' ');
      }

      // Derive smart searchKeyword & searchNiche for 9 Figure Buddy & vidIQ
      const combinedText = `${title} ${headline} ${subheadline}`.toLowerCase();
      let searchNiche = 'Tech & AI';
      let channelPreset = 'Marketing & Traffic (9 Channels: 5 FB Pages + YT AI Profit Lab + TikTok + X + Threads)';
      if (/finance|money|crypto|invest|trade|card|bank|loan|wealth/i.test(combinedText)) {
        searchNiche = 'Personal Finance';
        channelPreset = 'Finance & Crypto (TikTok WalletWise + YT 60x Daily + X Marketranger)';
      } else if (/health|sleep|diet|supplement|weight|fitness|wellness|doctor/i.test(combinedText)) {
        searchNiche = 'Health & Nutrition';
        channelPreset = 'Parenting & Kids (YT Storytime With Ms. Erica + IG)';
      } else if (/traffic|clicks|leads|buyer|subscriber|affiliate|marketing|solo ad/i.test(combinedText)) {
        searchNiche = 'Affiliate Marketing';
        channelPreset = 'Marketing & Traffic (9 Channels: 5 FB Pages + YT AI Profit Lab + TikTok + X + Threads)';
      } else if (/mind|habit|psychology|discipline|success|focus/i.test(combinedText)) {
        searchNiche = 'Psychology & Self-Help';
      }

      // Extract 1-2 prominent non-stop words as search keyword
      const stopWords = new Set(['the', 'and', 'for', 'with', 'this', 'that', 'from', 'your', 'you', 'get', 'how', 'why', 'what', 'free', 'best', 'more', 'all', 'never', 'again']);
      const titleWords = title.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter((w) => w.length > 2 && !stopWords.has(w));
      const searchKeyword = titleWords.slice(0, 2).join(' ') || (searchNiche === 'Affiliate Marketing' ? 'buyer traffic' : 'viral');

      const slug = (title || 'partner-offer').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          ok: true,
          title: title || 'Partner Offer',
          slug,
          headline,
          headlinePrefix,
          headlineGradient,
          headlineSuffix,
          subheadline,
          affiliateUrl: url,
          sponsorCode,
          channelPreset,
          searchKeyword,
          searchNiche,
          searchTier: 'gold',
          landerArchetype: 'matrix',
          landerTheme: 'emerald'
        })
      );
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // POST /api/launch-offer -> Provision Brevo List + 4 Templates + Save Offer + Auto-Start ViralForge Render & Scheduler
  if (req.method === 'POST' && pathname === '/api/launch-offer') {
    try {
      const body = await readJsonBody(req);
      const slug = (body.slug || body.name || 'offer')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-|-$/g, '');

      let outlierBreakdown = null;
      if (body.outlierId) {
        try {
          outlierBreakdown = await nfbClient.fetchOutlierBreakdown(body.outlierId);
        } catch (_) {}
      }

      const newOffer = {
        slug,
        name: body.name || 'Partner Offer',
        badge: '100% Free Access • Instant Unlock',
        eyebrow: 'Verified Partner Giveaway',
        headlinePrefix: body.headlinePrefix || 'Unlock Your Free',
        headlineGradient: body.headlineGradient || body.name || 'Viral System',
        headlineSuffix: body.headlineSuffix || 'Today.',
        subheadline: body.subheadline || 'Activate your free account and start scaling your traffic and leads in minutes.',
        ctaButtonText: body.ctaButtonText || 'Unlock Free Access',
        videoUrl: body.videoUrl || null,
        affiliateUrl: body.affiliateUrl,
        sponsorCode: body.sponsorCode || '144',
        channelPreset: body.channelPreset || 'Marketing & Traffic (9 Channels)',
        autoPostiz: body.autoPostiz !== false,
        landerArchetype: body.landerArchetype || 'matrix',
        landerTheme: body.landerTheme || 'emerald',
        selectedAccountIds: Array.isArray(body.selectedAccountIds) ? body.selectedAccountIds : null,
        outlierId: body.outlierId || null,
        steps: [
          {
            title: `Activate Your ${body.name} Account`,
            desc: 'Click through after unlocking to complete your quick registration in under 4 minutes.'
          },
          {
            title: 'Plug In Your Primary Offer or Link',
            desc: 'Connect the system to any existing product, affiliate link, or brand you want to grow.'
          },
          {
            title: 'Scale With Automated Video & Email Follow-Up',
            desc: 'Turn every click into compounding reach and automated email subscribers.'
          }
        ],
        createdAt: new Date().toISOString()
      };

      newOffer.brevo = await provisionBrevoListAndTemplates(newOffer);

      // Optional Auto-Render & Auto-Schedule in ViralForge AI
      if (body.autoRenderViralForge) {
        try {
          const runRes = await vfClient.startSwapEngineRun(
            newOffer,
            outlierBreakdown,
            Number(body.variantCount || 2),
            body.blueprintId || '464'
          );
          newOffer.viralForgeJob = {
            projectId: runRes.projectId,
            blueprintId: runRes.blueprintId,
            variantsCount: runRes.variantsCount,
            status: 'running',
            startedAt: new Date().toISOString(),
            videos: {}
          };
        } catch (vfErr) {
          newOffer.viralForgeJob = {
            status: 'error',
            error: vfErr.message
          };
        }
      }

      const offers = loadOffers();
      offers[slug] = newOffer;
      saveOffers(offers);

      if (newOffer.viralForgeJob?.projectId) {
        startBackgroundJobMonitor(slug, newOffer.viralForgeJob.projectId);
      }

      const viralForgePrompt = buildViralForgeSwapPrompt(newOffer, outlierBreakdown);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, offer: newOffer, viralForgePrompt }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // POST /api/schedule-commercial -> Immediately dispatch Remotion commercial to ContentStudio with friendly first-comment link
  if (req.method === 'POST' && pathname === '/api/schedule-commercial') {
    try {
      const { slug, scheduledAt } = await readJsonBody(req);
      const offers = loadOffers();
      const resolved = resolveOfferSlug(slug);
      const offer = offers[resolved];
      if (!offer) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: `Offer "${slug}" not found` }));
      }

      const shortAlias = Object.keys(VANITY_ALIASES).find((k) => VANITY_ALIASES[k] === offer.slug) || offer.slug;
      const friendlyLink = `https://traffic.aisimplesystem.com/${shortAlias}`;

      // Check for available commercial video file
      const candidateFiles = [
        path.join(__dirname, 'public', 'videos', `${shortAlias}-commercial.mp4`),
        path.join(__dirname, 'public', 'videos', `${offer.slug}-commercial.mp4`),
        path.join(__dirname, 'public', 'videos', `${offer.slug}-remotion-commercial.mp4`)
      ];
      const videoFile = candidateFiles.find((f) => fs.existsSync(f)) || candidateFiles[0];
      const videoUrl = `https://traffic.aisimplesystem.com/videos/${path.basename(videoFile)}`;

      // Check for available custom thumbnail file
      const candidateThumbnails = [
        path.join(__dirname, 'public', 'thumbnails', `${shortAlias}-thumbnail.jpg`),
        path.join(__dirname, 'public', 'thumbnails', `${shortAlias}-thumbnail.png`),
        path.join(__dirname, 'public', 'thumbnails', `${offer.slug}-thumbnail.jpg`),
        path.join(__dirname, 'public', 'thumbnails', `${offer.slug}-thumbnail.png`)
      ];
      const thumbnailFile = candidateThumbnails.find((f) => fs.existsSync(f)) || null;

      // Multi-Platform Audience Routing (Pinterest, TikTok, YouTube, Facebook - excluding Twitter by default to avoid $0.24 X API wallet fees)
      const csAccounts = await csClient.getConnectedAccounts();
      const eligibleAccounts = csAccounts.filter((a) => {
        if (a.validity !== 'valid') return false;
        if (a.platform === 'twitter' || a.account_type === 'twitter') return false;
        const name = (a.account_name || a.name || '').toLowerCase();
        if (name.includes('aurum')) return false;
        if (name === 'ken davis') return false;

        if (offer.slug === 'santa-circle') {
          return (
            name.includes('storytime') ||
            name.includes('erica') ||
            name.includes('freebie') ||
            name.includes('everyday')
          );
        } else if (offer.slug === 'bellver-card') {
          return (
            name.includes('walletwise') ||
            name.includes('market ranger') ||
            name.includes('marketranger')
          );
        } else if (offer.slug === 'yu-sleep') {
          return (
            name.includes('everyday mind') ||
            name.includes('freebie') ||
            name.includes('marketing resource')
          );
        } else if (offer.slug === 'viral-traffic-matrix') {
          return (
            name.includes('profit') ||
            name.includes('traffic') ||
            name.includes('lead generation') ||
            name.includes('insider secrets') ||
            name.includes('system & signal')
          );
        } else if (offer.slug === 'dog-enrichment') {
          return (
            name.includes('dog') ||
            name.includes('enrichment') ||
            name.includes('freebie')
          );
        } else if (offer.slug === 'ai-vault') {
          return (
            name.includes('ai profit') ||
            name.includes('system & signal') ||
            name.includes('trafficpros') ||
            name.includes('lead generation')
          );
        } else if (offer.slug === 'prop-trading') {
          return (
            name.includes('chainradar') ||
            name.includes('chain radar') ||
            name.includes('walletwise') ||
            name.includes('market ranger') ||
            name.includes('marketranger') ||
            name.includes('investing')
          );
        } else if (offer.slug === 'home-power') {
          return (
            name.includes('smart home') ||
            name.includes('resilience') ||
            name.includes('freebie') ||
            name.includes('everyday')
          );
        }
        return false;
      });

      const eligibleIds = eligibleAccounts.map((a) => a.id);
      if (eligibleIds.length === 0) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({ ok: false, error: 'No eligible ContentStudio channels found' })
        );
      }

      const firstCommentText = `👉 Claim your free ${offer.name} access here: ${friendlyLink}`;
      const postText = `${offer.headlinePrefix || ''} ${offer.headlineGradient} ${offer.headlineSuffix || ''}\n\n👉 Free Link: ${friendlyLink}`;

      const schedRes = await csClient.schedulePostWithFirstComment({
        text: postText,
        videoFilePath: fs.existsSync(videoFile) ? videoFile : null,
        videoUrl,
        thumbnailFilePath: thumbnailFile,
        title: `${offer.name} Commercial`,
        accountIds: eligibleIds,
        scheduledAt: scheduledAt || null,
        firstCommentMessage: firstCommentText
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          ok: true,
          friendlyLink,
          videoUrl,
          channelCount: eligibleIds.length,
          channels: eligibleAccounts.map(
            (a) => `${a.account_name || a.name} (${a.account_type || a.type})`
          ),
          scheduledAt: scheduledAt || 'Auto-Scheduled to Next Optimal Peak Slot',
          message: schedRes?.message || 'Successfully queued on autopilot',
          result: schedRes
        })
      );
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // GET /api/cadence-status -> Returns active angles, cycle counts, and schedule state
  if (req.method === 'GET' && pathname === '/api/cadence-status') {
    try {
      if (!cadenceEngine) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Cadence engine not initialized' }));
      }
      const state = cadenceEngine.loadState();
      const angles = cadenceEngine.loadAngles();
      const isPostizReady = postizClient ? postizClient.isConfigured() : false;
      const provider = isPostizReady ? 'Postiz' : 'ContentStudio';
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        ok: true,
        state,
        angles,
        provider,
        postizConfigured: isPostizReady,
        postizUrl: postizClient ? postizClient.POSTIZ_BASE_URL : null
      }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // GET /api/postiz/status -> Returns Postiz health, base URL, and connected channels
  if (req.method === 'GET' && pathname === '/api/postiz/status') {
    try {
      if (!postizClient) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, configured: false, error: 'Postiz client not initialized' }));
      }
      const configured = postizClient.isConfigured();
      let accounts = [];
      if (configured) {
        accounts = await postizClient.getConnectedAccounts();
      }
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        ok: true,
        configured,
        baseUrl: postizClient.POSTIZ_BASE_URL,
        accounts,
        accountCount: accounts.length
      }));
    } catch (err) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({
        ok: false,
        configured: postizClient ? postizClient.isConfigured() : false,
        baseUrl: postizClient ? postizClient.POSTIZ_BASE_URL : null,
        error: err.message
      }));
    }
  }

  // POST /api/postiz/test-broadcast -> Quick broadcast test across all or specific connected Postiz channels
  if (req.method === 'POST' && pathname === '/api/postiz/test-broadcast') {
    try {
      if (!postizClient || !postizClient.isConfigured()) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Postiz is not configured. Add POSTIZ_API_KEY to your environment.' }));
      }
      const body = await readJsonBody(req);
      const text = body.text || '🔥 Launchpad Live Test: Multi-project social dispatch working seamlessly!';
      const projectTag = body.projectTag || 'viral-traffic-matrix';

      const result = await postizClient.schedulePost({
        text,
        projectTag,
        scheduledAt: new Date(Date.now() + 180 * 1000).toISOString() // 3 mins from now
      });

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // POST /api/cadence-advance -> Renders next angle video & pushes to ContentStudio calendar
  if (req.method === 'POST' && pathname === '/api/cadence-advance') {
    try {
      if (!cadenceEngine) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Cadence engine not initialized' }));
      }
      const { slug } = await readJsonBody(req);
      if (!slug) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Slug is required' }));
      }
      const result = await cadenceEngine.advanceAndSchedule(slug);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // POST /api/cadence-advance-next -> Advance the next queued offer in video rotation
  if (req.method === 'POST' && pathname === '/api/cadence-advance-next') {
    try {
      if (!cadenceEngine) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Cadence engine not initialized' }));
      }
      const result = await cadenceEngine.advanceNextQueuedOffer();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: true, result }));
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // POST /api/subscribe -> Dynamic Multi-Offer Lead Capture + 4-Email Drip Queue
  if (req.method === 'POST' && pathname === '/api/subscribe') {
    try {
      const { email, firstName, sponsorCode, offerSlug } = await readJsonBody(req);
      if (!email || !email.includes('@')) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'Valid email is required' }));
      }

      if (!BREVO_API_KEY) {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: true, warning: 'BREVO_API_KEY not configured' }));
      }

      const offers = loadOffers();
      const offer = (offerSlug && offers[offerSlug]) || offers['viral-traffic-matrix'] || {};
      const listId = Number(offer.brevo?.listId || DEFAULT_BREVO_LIST_ID);
      const welcomeTemplateId = Number(offer.brevo?.welcomeTemplateId || DEFAULT_WELCOME_TEMPLATE_ID);
      const followUpIds = offer.brevo?.followUpTemplateIds || [887, 888, 889];

      const cleanEmail = email.trim().toLowerCase();
      const payload = {
        email: cleanEmail,
        updateEnabled: true,
        listIds: [listId],
        attributes: {
          FIRSTNAME: firstName || 'Partner',
          LANDING_VARIANT: offerSlug || 'Viral_Traffic_Matrix_Giveaway',
          SPONSOR_CODE: sponsorCode || offer.sponsorCode || '144'
        }
      };

      const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          'api-key': BREVO_API_KEY
        },
        body: JSON.stringify(payload)
      });

      const text = await brevoRes.text();
      let brevoData = {};
      if (text) {
        try {
          brevoData = JSON.parse(text);
        } catch (_) {}
      }

      if (!brevoRes.ok) {
        res.writeHead(brevoRes.status, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: brevoData.message || 'Brevo API error' }));
      }

      const welcomeResult = await sendOrScheduleBrevoEmail(cleanEmail, welcomeTemplateId);
      const delays = [24, 48, 70];
      const nowMs = Date.now();
      const queuedFollowUps = await Promise.all(
        followUpIds.slice(0, 3).map(async (tplId, idx) => {
          const scheduledIso = new Date(nowMs + delays[idx] * 3600 * 1000).toISOString();
          const result = await sendOrScheduleBrevoEmail(cleanEmail, Number(tplId), scheduledIso);
          return { templateId: tplId, scheduledAt: scheduledIso, result };
        })
      );

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          ok: true,
          listId,
          welcomeTemplateId,
          welcomeResult,
          queuedFollowUps
        })
      );
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      return res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  }

  // Serve flagship index.html at root /
  if ((req.method === 'GET' || req.method === 'HEAD') && (pathname === '/' || pathname === '/index.html')) {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading index.html');
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, HOST, () => {
  try {
    // Eagerly initialize WebinarEngine single-writer lock & production secret validation on startup
    webinarEngine.getPersistenceModelInfo();
  } catch (webinarInitErr) {
    console.error('Fatal WebinarEngine initialization error:', webinarInitErr.message);
    process.exit(1);
  }
  console.log(`🚀 Offer Launchpad & Viral Giveaway Engine running at http://${HOST}:${PORT}`);
  if (
    process.env.WEBINAR_DISABLE_BACKGROUND_DAEMONS !== 'true' &&
    process.env.NODE_ENV !== 'test'
  ) {
    try {
      continuousDaemon.initContinuousDaemon();
    } catch (daemonErr) {
      console.error('Failed to initialize Continuous Daemon:', daemonErr);
    }
  }
});
