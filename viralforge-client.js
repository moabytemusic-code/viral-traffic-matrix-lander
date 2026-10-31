// ViralForge AI Direct REST API Client + Live Channel Discovery + Background Render Monitor & Auto-Scheduler

const VF_API_BASE = 'https://backend.viralforgeai.io/api';

// Fallback Channel Presets (used if custom channel IDs are not explicitly passed)
const CHANNEL_PRESETS = {
  marketing: [139, 138, 137, 136, 134, 143, 147, 149, 150],
  finance: [140, 143, 149, 147, 150, 134],
  parenting: [141, 135, 146, 153]
};

const PLATFORM_LABELS = {
  facebook: 'Facebook',
  youtube: 'YouTube',
  twitter: 'X / Twitter',
  tiktok: 'TikTok',
  threads: 'Threads',
  instagram: 'Instagram',
  pinterest: 'Pinterest',
  linkedin: 'LinkedIn'
};

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

// Dynamically fetch all connected social accounts from ViralForge AI (/api/fetch-social-accounts)
async function fetchLiveSocialAccounts() {
  const raw = await vfPost('fetch-social-accounts', {});
  const grouped = raw?.data || raw || {};
  const accounts = [];

  for (const [platformKey, list] of Object.entries(grouped)) {
    if (!Array.isArray(list)) continue;
    for (const acc of list) {
      if (!acc || !acc.id) continue;
      accounts.push({
        id: Number(acc.id),
        name: acc.name || acc.username || `${platformKey} #${acc.id}`,
        type: acc.type || platformKey,
        status: acc.status ?? 1,
        username: acc.username || null,
        created: acc.created || new Date().toISOString(),
        platformName: PLATFORM_LABELS[acc.type || platformKey] || platformKey
      });
    }
  }

  return {
    accounts,
    presets: CHANNEL_PRESETS
  };
}

// Resolve full socialAccount objects from live ViralForge accounts (picking up any newly added channels!)
async function resolveTargetSocialAccounts({ selectedAccountIds, channelPreset }) {
  const { accounts } = await fetchLiveSocialAccounts();

  if (Array.isArray(selectedAccountIds) && selectedAccountIds.length > 0) {
    const idSet = new Set(selectedAccountIds.map(Number));
    const matched = accounts.filter((a) => idSet.has(Number(a.id)));
    if (matched.length > 0) return matched;
  }

  const lower = (channelPreset || '').toLowerCase();
  let presetIds = CHANNEL_PRESETS.marketing;
  if (lower.includes('parenting') || lower.includes('storytime')) {
    presetIds = CHANNEL_PRESETS.parenting;
  } else if (lower.includes('finance') || lower.includes('crypto')) {
    presetIds = CHANNEL_PRESETS.finance;
  } else if (lower.includes('all')) {
    return accounts.filter((a) => !a.name.toLowerCase().includes('aurum'));
  }

  const presetSet = new Set(presetIds);
  return accounts.filter((a) => presetSet.has(Number(a.id)));
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
async function scheduleRenderedVideo({ videoId, projectId, contentName, scheduleDate, channelPreset, selectedAccountIds }) {
  const socialAccount = await resolveTargetSocialAccounts({ selectedAccountIds, channelPreset });
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
    channels: socialAccount.map((a) => `${a.platformName}: ${a.name}`),
    result
  };
}

module.exports = {
  fetchLiveSocialAccounts,
  resolveTargetSocialAccounts,
  startSwapEngineRun,
  getProjectRunStatus,
  scheduleRenderedVideo,
  getScheduleDateString
};
