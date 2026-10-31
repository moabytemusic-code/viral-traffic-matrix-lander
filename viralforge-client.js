// ViralForge AI Direct REST API Client + Background Render Monitor & Auto-Scheduler

const VF_API_BASE = 'https://backend.viralforgeai.io/api';

// Designated Social Channel Presets (Verified from /api/fetch-social-accounts)
const CHANNEL_PRESETS = {
  marketing: [
    { id: 139, name: 'Marketing Resource Network - Done For You Services', type: 'facebook', status: 1, username: null, platformName: 'Facebook' },
    { id: 138, name: 'Marketing Insider Secrets', type: 'facebook', status: 1, username: null, platformName: 'Facebook' },
    { id: 137, name: 'TrafficPros', type: 'facebook', status: 1, username: null, platformName: 'Facebook' },
    { id: 136, name: 'The Freebie Channel', type: 'facebook', status: 1, username: null, platformName: 'Facebook' },
    { id: 134, name: 'AI Profit Lab', type: 'facebook', status: 1, username: null, platformName: 'Facebook' },
    { id: 143, name: 'AI Profit Lab ', type: 'youtube', status: 1, username: 'AI Profit Lab ', platformName: 'YouTube' },
    { id: 147, name: 'marketranger', type: 'twitter', status: 1, username: 'marketranger', platformName: 'X / Twitter' },
    { id: 149, name: 'WalletWise Crypto', type: 'tiktok', status: 1, username: 'WalletWise Crypto', platformName: 'TikTok' },
    { id: 150, name: 'silverside107', type: 'threads', status: 1, username: 'silverside107', platformName: 'Threads' }
  ],
  finance: [
    { id: 140, name: 'The 60x Daily', type: 'youtube', status: 1, username: 'The 60x Daily', platformName: 'YouTube' },
    { id: 143, name: 'AI Profit Lab ', type: 'youtube', status: 1, username: 'AI Profit Lab ', platformName: 'YouTube' },
    { id: 149, name: 'WalletWise Crypto', type: 'tiktok', status: 1, username: 'WalletWise Crypto', platformName: 'TikTok' },
    { id: 147, name: 'marketranger', type: 'twitter', status: 1, username: 'marketranger', platformName: 'X / Twitter' },
    { id: 150, name: 'silverside107', type: 'threads', status: 1, username: 'silverside107', platformName: 'Threads' },
    { id: 134, name: 'AI Profit Lab', type: 'facebook', status: 1, username: null, platformName: 'Facebook' }
  ],
  parenting: [
    { id: 141, name: 'Storytime with Ms. Erica', type: 'youtube', status: 1, username: 'Storytime with Ms. Erica', platformName: 'YouTube' },
    { id: 135, name: 'Everyday Mind Explained', type: 'facebook', status: 1, username: null, platformName: 'Facebook' },
    { id: 146, name: '@brendadixonthevessel1', type: 'instagram', status: 1, username: '@brendadixonthevessel1', platformName: 'Instagram' },
    { id: 153, name: 'moabytemusic', type: 'pinterest', status: 1, username: 'moabytemusic', platformName: 'Pinterest' }
  ]
};

function resolvePresetAccounts(presetLabel = '') {
  const lower = presetLabel.toLowerCase();
  if (lower.includes('parenting') || lower.includes('storytime')) return CHANNEL_PRESETS.parenting;
  if (lower.includes('finance') || lower.includes('crypto')) return CHANNEL_PRESETS.finance;
  return CHANNEL_PRESETS.marketing;
}

async function vfPost(endpoint, payload = {}) {
  const token = process.env.VIRALFORGE_TOKEN;
  if (!token) {
    throw new Error('VIRALFORGE_TOKEN is not configured in environment variables');
  }

  const res = await fetch(`${VF_API_BASE}/${endpoint.replace(/^\//, '')}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      auth: token,
      'x-access-token': token
    },
    body: JSON.stringify(payload)
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === false) {
    throw new Error(data.message || `ViralForge API error (${res.status}) on ${endpoint}`);
  }
  return data.data !== undefined ? data.data : data;
}

// Build 3 distinct SwapEngine variant briefs for an offer + optional 9FigureBuddy Outlier DNA
function buildThreeVariantBriefs(offer, outlierBreakdown) {
  const rawDna = outlierBreakdown?.rawText || '';
  const hookHint = rawDna
    ? `Mirror this proven viral outlier hook rhythm: ${rawDna.slice(0, 320).replace(/\s+/g, ' ')}...`
    : 'Use a high-retention pattern-interrupt hook in the first 3 seconds.';

  const baseFacts = `Promote ${offer.name}: ${offer.headlinePrefix || ''} ${offer.headlineGradient || ''} ${offer.headlineSuffix || ''}. ${offer.subheadline || ''}. End with clear spoken and on-screen CTA: Grab your free access via the link in my bio (traffic.aisimplesystem.com/o/${offer.slug}).`;

  return [
    `Open with a 'Secret Free Website / Tool That Feels Illegal to Know' curiosity hook. ${hookHint} ${baseFacts}`,
    `Open by calling out the #1 frustration people face before discovering ${offer.name}, then reveal the 4-minute free setup. ${baseFacts}`,
    `Open with a contrarian 'Stop Wasting Time & Money the Old Way' hook and demonstrate how ${offer.name} works automatically. ${baseFacts}`
  ];
}

// Start a SwapEngine project run on Blueprint #464 (or custom blueprintId)
async function startSwapEngineRun(offer, outlierBreakdown, variantCount = 2, blueprintId = '464') {
  const allBriefs = buildThreeVariantBriefs(offer, outlierBreakdown);
  const variants = allBriefs.slice(0, Math.max(1, Math.min(3, Number(variantCount) || 2)));

  const data = await vfPost('projects/run', {
    blueprintId: String(blueprintId),
    name: `${offer.name} - Auto Campaign`,
    variants,
    aspectRatio: '9:16',
    images: []
  });

  return {
    projectId: data.projectId,
    blueprintId: String(blueprintId),
    variantsCount: variants.length,
    variants
  };
}

// Check current status of a ViralForge project run
async function getProjectRunStatus(projectId) {
  return vfPost('projects/run-status', {
    projectId: String(projectId),
    videoId: null,
    after: 0
  });
}

// Format date as "YYYY-MM-DD 11:00:00" for Day +offsetDays
function getScheduleDateString(offsetDays = 1) {
  const d = new Date(Date.now() + offsetDays * 24 * 3600 * 1000);
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(d.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd} 11:00:00`;
}

// Schedule a single rendered video across the offer's designated social channels
async function scheduleRenderedVideo({ videoId, projectId, contentName, scheduleDate, channelPreset }) {
  const socialAccount = resolvePresetAccounts(channelPreset);
  const result = await vfPost('schedule-individual-content', {
    contentId: Number(videoId),
    projectId: Number(projectId),
    contentName: contentName || `Campaign Video #${videoId}`,
    scheduleType: 'manual-schedule',
    scheduleDate,
    frequency: 'once',
    timeZone: 'America/New_York',
    type: 'video-content',
    socialAccount
  });
  return {
    scheduled: true,
    videoId,
    scheduleDate,
    channelCount: socialAccount.length,
    result
  };
}

module.exports = {
  startSwapEngineRun,
  getProjectRunStatus,
  scheduleRenderedVideo,
  getScheduleDateString,
  resolvePresetAccounts
};
