// Universal Postiz API Client (Self-Hosted on Coolify or Postiz Cloud)
// Centralized Social Media Poster: Can be used by this project AND any of your other websites/apps.
// Allows multiple projects to schedule video shorts and posts without paid third-party subscriptions.

const fs = require('fs');
const path = require('path');

// Auto-load .env if running standalone or from subdirs
const envCandidates = [
  path.join(__dirname, '.env'),
  path.join(__dirname, '..', '.env'),
  path.join(process.cwd(), '.env')
];

for (const envPath of envCandidates) {
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
  const mimeType = fileName.endsWith('.mp4') ? 'video/mp4' : (fileName.endsWith('.png') ? 'image/png' : 'image/jpeg');

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
  // Returns { id, path, name, status }
  return {
    id: data.id,
    path: data.path,
    name: data.name,
    status: data.status
  };
}

// 3. Schedule Post Across Target Channels
// Supports multiple projects via projectTag (e.g. 'viral-traffic-matrix', 'the-santa-circle', etc.)
async function schedulePost({
  title = '',
  text,
  videoFilePath = null,
  thumbnailFilePath = null,
  media = null,
  accountIds = [],
  scheduledAt, // ISO 8601 string or Date
  firstCommentMessage = '',
  projectTag = 'viral-giveaways',
  youtubeTags = [],
  postNow = false
}) {
  if (!isConfigured()) {
    throw new Error('POSTIZ_API_KEY is not configured in .env');
  }

  // Upload video if local file is provided
  let uploadedMedia = media;
  if (!uploadedMedia && videoFilePath) {
    console.log(`📤 [Postiz] Uploading media asset: ${path.basename(videoFilePath)}...`);
    uploadedMedia = await uploadMedia(videoFilePath);
    console.log(`✅ [Postiz] Media uploaded: ${uploadedMedia.id} -> ${uploadedMedia.path}`);
  }

  // Upload custom thumbnail if provided
  let uploadedThumbnail = null;
  if (thumbnailFilePath && fs.existsSync(thumbnailFilePath)) {
    console.log(`🖼️ [Postiz] Uploading custom thumbnail: ${path.basename(thumbnailFilePath)}...`);
    uploadedThumbnail = await uploadMedia(thumbnailFilePath);
    console.log(`✅ [Postiz] Thumbnail uploaded: ${uploadedThumbnail.id} -> ${uploadedThumbnail.path}`);
  }

  // Fetch integrations to match platform types
  const accounts = await getConnectedAccounts();

  // Strict Niche Isolation Guardrail: Explicit account IDs are strictly mandatory
  // NEVER default or fall back to all connected accounts under any circumstances!
  if (!Array.isArray(accountIds) || accountIds.length === 0) {
    throw new Error('[Postiz Security Guardrail] accountIds parameter is required. Broadcasting to all channels is strictly prohibited to prevent cross-niche contamination.');
  }

  const selectedAccounts = accounts.filter((a) => accountIds.includes(a.id));
  if (selectedAccounts.length === 0) {
    throw new Error(`[Postiz Security Guardrail] None of the requested account IDs (${accountIds.join(', ')}) were found in connected integrations. Scheduling aborted to protect channel integrity.`);
  }

  const targets = selectedAccounts;

  const scheduleDateIso = new Date(scheduledAt || Date.now() + 3600 * 1000).toISOString();
  const cleanTitle = (title || text.slice(0, 60)).replace(/[\r\n]+/g, ' ').trim();

  // Format YouTube tags if provided (vidIQ keywords or topic tags)
  let formattedYtTags = [];
  if (Array.isArray(youtubeTags) && youtubeTags.length > 0) {
    let totalLen = 0;
    for (const tag of youtubeTags) {
      const label = typeof tag === 'string' ? tag : (tag.label || tag.value || '');
      if (label && (totalLen + label.length + 2) < 450) {
        formattedYtTags.push({ value: label, label: label });
        totalLen += label.length + 2;
      }
    }
  }

  // Build Postiz multi-channel post array
  const postsPayload = targets.map((acc) => {
    const postValue = {
      content: text
    };

    if (uploadedMedia && uploadedMedia.id && uploadedMedia.path) {
      postValue.image = [
        {
          id: uploadedMedia.id,
          path: uploadedMedia.path
        }
      ];
    }

    let settings = {
      __type: acc.platform
    };

    if (acc.platform === 'youtube') {
      settings = {
        __type: 'youtube',
        title: cleanTitle.slice(0, 95),
        type: 'public',
        selfDeclaredMadeForKids: 'no'
      };
      if (formattedYtTags.length > 0) {
        settings.tags = formattedYtTags;
      }
      if (uploadedThumbnail && uploadedThumbnail.id && uploadedThumbnail.path) {
        settings.thumbnail = {
          id: uploadedThumbnail.id,
          path: uploadedThumbnail.path
        };
      }
    } else if (acc.platform === 'tiktok' || acc.platform === 'tiktok-business') {
      settings = {
        __type: acc.platform,
        title: cleanTitle.slice(0, 85),
        content_posting_method: 'UPLOAD',
        privacy_level: 'SELF_ONLY',
        duet: false,
        stitch: false,
        comment: true,
        autoAddMusic: 'no',
        brand_content_toggle: false,
        brand_organic_toggle: false
      };
    } else if (acc.platform === 'facebook') {
      settings = {
        __type: 'facebook',
        post_type: 'post',
        title: cleanTitle.slice(0, 95)
      };
    } else if (acc.platform === 'instagram') {
      settings = {
        __type: 'instagram',
        post_type: 'post'
      };
    }

    const item = {
      integration: {
        id: acc.id
      },
      value: [postValue],
      settings
    };

    if (firstCommentMessage) {
      item.settings.firstComment = firstCommentMessage;
    }

    return item;
  });

  const payload = {
    type: postNow ? 'now' : 'schedule',
    date: postNow ? new Date().toISOString() : scheduleDateIso,
    shortLink: false,
    tags: [{ value: projectTag, label: projectTag }],
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
