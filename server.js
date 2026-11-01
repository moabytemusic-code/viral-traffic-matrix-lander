const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const nfbClient = require('./nfb-client');
const vidiqClient = require('./vidiq-client');
const vfClient = require('./viralforge-client');
const csClient = require('./contentstudio-client');
const { renderOfferLander } = require('./render-lander');

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

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const DEFAULT_BREVO_LIST_ID = Number(process.env.BREVO_LIST_ID || 80);
const DEFAULT_WELCOME_TEMPLATE_ID = Number(process.env.BREVO_WELCOME_TEMPLATE_ID || 886);
const OFFERS_PATH = path.join(__dirname, 'offers.json');

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
                const firstCommentText = `👉 Claim your free ${offer.name} access here: https://traffic.aisimplesystem.com/o/${offer.slug}`;
                await csClient.schedulePostWithFirstComment({
                  text: `${v.brief || offer.subheadline || offer.name}\n\n👉 Claim free access: https://traffic.aisimplesystem.com/o/${offer.slug}`,
                  videoUrl: v.videoUrl,
                  accountIds: eligibleAccountIds,
                  scheduledAt: scheduleDate,
                  firstCommentMessage: firstCommentText
                });
                console.log(`💬 [ContentStudio] Scheduled post with First-Comment link to ${eligibleAccountIds.length} accounts!`);
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
      bodyHtml: `<p>Just checking in after you unlocked <strong>${offer.name}</strong> yesterday.</p><p>Don't let this sit in your bookmarks—it takes just a few minutes to activate and put to work:</p>`,
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

  return `# ${offer.name} — 3-Variation ViralForge AI SwapEngine Prompt
# Designated Channels: ${offer.channelPreset}
# Lander Bio-Link URL: https://traffic.aisimplesystem.com/o/${offer.slug}

Create 3 distinct short-form vertical (9:16) video hook variations promoting ${offer.name}.
Core Value Proposition: ${offer.headlinePrefix || ''} ${offer.headlineGradient} ${offer.headlineSuffix || ''} — ${offer.subheadline}

## 3 Hook Variations to Generate:
1. **Variation 1 (Curiosity / Open Loop Hook):** Open with a bold curiosity gap modeled after proven viral outlier DNA ("Here's a secret tool/system that feels illegal to know if you...").
2. **Variation 2 (Pain / Problem Callout Hook):** Call out the #1 frustration the audience faces right in the first 3 seconds, then reveal ${offer.name} as the fast, friction-free fix.
3. **Variation 3 (Contrarian / Cost-Saving Hook):** Challenge the old, expensive, or slow way of doing things and show how ${offer.name} gets them there in minutes.

## Proven 9 Figure Buddy Outlier DNA Reference:
${outlierExcerpt ? outlierExcerpt : 'Use a fast-paced talking-head explainer with 3 stacked curiosity markers in the first 10 seconds, a clear mechanism reveal in the middle, and a direct CTA at the end.'}

## Call To Action (Final Beat):
"Grab your free ${offer.name} access via the link in my bio (traffic.aisimplesystem.com/o/${offer.slug})."`;
}

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  const parsedUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = parsedUrl.pathname;

  // Healthcheck endpoint for Coolify
  if (req.method === 'GET' && pathname === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
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

  // GET /o/:slug -> Render dynamic 8-Pillar Glass Lander for any configured offer
  if ((req.method === 'GET' || req.method === 'HEAD') && pathname.startsWith('/o/')) {
    const slug = pathname.replace(/^\/o\//, '').replace(/\/$/, '');
    const offers = loadOffers();
    const offer = offers[slug];
    if (!offer) {
      res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
      return res.end(`<h1>Offer "${slug}" not found</h1><p><a href="/launchpad">Open Offer Launchpad</a></p>`);
    }
    const html = renderOfferLander(offer);
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    return res.end(html);
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

      let targetUrl = url;
      let sponsorCode = '144';
      try {
        const u = new URL(url);
        sponsorCode =
          u.searchParams.get('ref') ||
          u.searchParams.get('sponsor') ||
          u.searchParams.get('aid') ||
          u.searchParams.get('aff') ||
          '144';
      } catch (_) {}

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
            sponsorCode: sponsorCode || '144',
            landerArchetype: 'voucher',
            landerTheme: 'emerald',
            channelPreset: 'Parenting & Kids (YT Storytime With Ms. Erica + IG)'
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
            channelPreset: 'Finance & Crypto (TikTok WalletWise + YT 60x Daily + X Marketranger)'
          })
        );
      }

      // If it is an iDevAffiliate tracking link, resolve destination or fallback to direct landing page
      if (url.includes('idevaffiliate.com') && url.includes('34-3-32')) {
        targetUrl = 'https://5dollarfriday.com/viral-traffic-matrix/';
      }

      const htmlRes = await fetch(targetUrl, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
        },
        redirect: 'follow'
      });
      const html = await htmlRes.text();
      const cleanHtml = html.replace(/<script[\s\S]*?<\/script>/gi, '').replace(/<style[\s\S]*?<\/style>/gi, '');

      const titleMatch = cleanHtml.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
      const metaDescMatch =
        html.match(/<meta\s+name=["']description["']\s+content=["'](.*?)["']/i) ||
        html.match(/<meta\s+property=["']og:description["']\s+content=["'](.*?)["']/i);
      const metaTitleMatch = html.match(/<meta\s+property=["']og:title["']\s+content=["'](.*?)["']/i);

      const clean = (s) =>
        (s || '')
          .replace(/<[^>]+>/g, ' ')
          .replace(/&#8211;/g, '-')
          .replace(/&amp;/g, '&')
          .replace(/&nbsp;/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const candidateTexts = [...cleanHtml.matchAll(/<(?:p|div|span|h[1-6])[^>]*>([\s\S]{25,260}?)<\/(?:p|div|span|h[1-6])>/gi)]
        .map((m) => clean(m[1]))
        .filter((t) => t.length > 25 && !t.includes('Cookie') && !t.includes('WordPress') && !t.includes('function('));

      const title = clean((metaTitleMatch && metaTitleMatch[1]) || (titleMatch && titleMatch[1]))
        .split(/[–|-]/)[0]
        .trim();
      const headline = candidateTexts[0] || candidateTexts[1] || 'Viral Opportunity';
      const subheadline =
        clean(metaDescMatch && metaDescMatch[1]) ||
        candidateTexts.find((t) => t.length > 50 && t !== headline) ||
        candidateTexts[1] ||
        candidateTexts[0] ||
        '';

      res.writeHead(200, { 'Content-Type': 'application/json' });
      return res.end(
        JSON.stringify({
          ok: true,
          title: title || 'Viral Traffic Matrix',
          headline,
          subheadline,
          affiliateUrl: url,
          sponsorCode
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
        affiliateUrl: body.affiliateUrl,
        sponsorCode: body.sponsorCode || '144',
        channelPreset: body.channelPreset || 'Marketing & Traffic (9 Channels)',
        autoContentStudio: body.autoContentStudio !== false,
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
  console.log(`🚀 Offer Launchpad & Viral Giveaway Engine running at http://${HOST}:${PORT}`);
});
