// Universal Postiz API Client (Self-Hosted on Coolify or Postiz Cloud)
// Centralized Social Media Poster: Can be used by this project AND any of your other websites/apps.
// Allows multiple projects to schedule video shorts and posts without paid third-party subscriptions.

const fs = require('fs');
const path = require('path');

// Auto-load .env if running standalone
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  try {
    const lines = fs.readFileSync(envPath, 'utf8').split('\n');
    for (const line of lines) {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match) {
        const k = match[1];
        let v = match[2] || '';
        if (v.startsWith('"') && v.endsWith('"')) v = v.slice(1, -1);
        if (v.startsWith("'") && v.endsWith("'")) v = v.slice(1, -1);
        if (!process.env[k]) process.env[k] = v.trim();
      }
    }
  } catch {}
}

const POSTIZ_BASE_URL = (process.env.POSTIZ_BASE_URL || 'https://social.aisimplesystem.com').replace(/\/+$/, '');
const POSTIZ_API_KEY = process.env.POSTIZ_API_KEY || '';

function isConfigured() {
  return Boolean(POSTIZ_API_KEY && POSTIZ_API_KEY.length > 5);
}

// 1. Get All Connected Social Channels / Integrations
async function getConnectedAccounts() {
  if (!isConfigured()) {
    return [];
  }

  const endpoint = `${POSTIZ_BASE_URL}/api/public/v1/integrations`;
  try {
    const res = await fetch(endpoint, {
      method: 'GET',
      headers: {
        Authorization: POSTIZ_API_KEY,
        Accept: 'application/json'
      }
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Postiz integrations error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const list = Array.isArray(data) ? data : data.integrations || [];

    // Normalize format to match standard social accounts
    return list.map((item) => ({
      id: item.id,
      name: item.name || item.identifier || item.type,
      platform: item.identifier || item.type || item.provider || 'youtube',
      picture: item.picture || null,
      validity: item.disabled ? 'invalid' : 'valid',
      raw: item
    }));
  } catch (err) {
    console.error('❌ [Postiz Client] Error fetching accounts:', err.message);
    return [];
  }
}

// 2. Upload Video/Media to Postiz Storage
async function uploadMedia(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Media file does not exist at: ${filePath}`);
  }

  const endpoint = `${POSTIZ_BASE_URL}/api/public/v1/upload`;
  const fileBuffer = fs.readFileSync(filePath);
  const fileName = path.basename(filePath);
  const mimeType = fileName.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg';

  const blob = new Blob([fileBuffer], { type: mimeType });
  const formData = new FormData();
  formData.append('file', blob, fileName);

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: POSTIZ_API_KEY
    },
    body: formData
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Postiz upload failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  // Returns path or URL on Postiz storage
  return data.path || data.url || data.id;
}

// 3. Schedule Post Across Target Channels
// Supports multiple projects via projectTag (e.g. 'viral-traffic-matrix', 'project-b', etc.)
async function schedulePost({
  text,
  videoFilePath = null,
  mediaUrl = null,
  accountIds = [],
  scheduledAt, // ISO 8601 string or Date
  firstCommentMessage = '',
  projectTag = 'viral-giveaways'
}) {
  if (!isConfigured()) {
    throw new Error('POSTIZ_API_KEY is not configured in .env');
  }

  // Upload video if local file is provided
  let uploadedMediaUrl = mediaUrl;
  if (!uploadedMediaUrl && videoFilePath) {
    console.log(`📤 [Postiz] Uploading media asset: ${path.basename(videoFilePath)}...`);
    uploadedMediaUrl = await uploadMedia(videoFilePath);
    console.log(`✅ [Postiz] Media uploaded: ${uploadedMediaUrl}`);
  }

  // Fetch integrations to match platform types
  const accounts = await getConnectedAccounts();
  const selectedAccounts = accounts.filter((a) => accountIds.includes(a.id));
  const targets = selectedAccounts.length > 0 ? selectedAccounts : accounts;

  if (targets.length === 0) {
    throw new Error('No valid Postiz social channels found to post to');
  }

  const scheduleDateIso = new Date(scheduledAt || Date.now() + 3600 * 1000).toISOString();

  // Build Postiz multi-channel post array
  const postsPayload = targets.map((acc) => {
    const postValue = {
      content: text
    };

    if (uploadedMediaUrl) {
      postValue.image = [uploadedMediaUrl];
    }

    const item = {
      integration: {
        id: acc.id
      },
      value: [postValue],
      settings: {
        __type: acc.platform || 'youtube'
      }
    };

    // If first comment is provided, append as comment
    if (firstCommentMessage) {
      item.settings.firstComment = firstCommentMessage;
    }

    return item;
  });

  const payload = {
    type: 'schedule',
    date: scheduleDateIso,
    shortLink: false,
    tags: [projectTag],
    posts: postsPayload
  };

  const endpoint = `${POSTIZ_BASE_URL}/api/public/v1/posts`;
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: {
      Authorization: POSTIZ_API_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Postiz schedule error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  console.log(`🚀 [Postiz] Post successfully scheduled for ${scheduleDateIso} across ${targets.length} channels`);
  return {
    ok: true,
    scheduledAt: scheduleDateIso,
    data,
    targets: targets.map((t) => `${t.name} (${t.platform})`)
  };
}

// Peak Time Slot Calculator (12:30 PM and 5:30 PM peak slots)
function getNextOptimalSlot(offsetDays = 0) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);

  const hours = d.getHours();
  if (hours < 12) {
    d.setHours(12, 30, 0, 0);
  } else if (hours < 17) {
    d.setHours(17, 30, 0, 0);
  } else {
    d.setDate(d.getDate() + 1);
    d.setHours(12, 30, 0, 0);
  }

  return d.toISOString();
}

module.exports = {
  isConfigured,
  getConnectedAccounts,
  uploadMedia,
  schedulePost,
  getNextOptimalSlot,
  POSTIZ_BASE_URL
};
