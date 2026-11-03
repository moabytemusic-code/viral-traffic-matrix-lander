// ContentStudio API Client (api.contentstudio.io)
// Supports multi-platform video publishing AND automated First-Comment with your live friendly affiliate link!

const fs = require('fs');
const path = require('path');

const CS_API_BASE = 'https://api.contentstudio.io/api/v1';

async function csFetch(endpoint, method = 'GET', body = null) {
  const apiKey =
    process.env.CONTENTSTUDIO_API_KEY ||
    'cs_e7d60a07ff5d742d9c175e56c36f0a674faeac4567d0c01d3e473512db695dbb';
  const headers = {
    'X-API-Key': apiKey,
    Accept: 'application/json'
  };
  if (body && !(body instanceof FormData)) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${CS_API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? (body instanceof FormData ? body : JSON.stringify(body)) : null
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === false) {
    throw new Error(data.message || `ContentStudio API Error (${res.status}) on ${endpoint}`);
  }
  return data;
}

// Get workspace ID (cached or fetched)
let cachedWsId = process.env.CONTENTSTUDIO_WORKSPACE_ID || '5c6018992df1b11c356cb5c8';

async function getWorkspaceId() {
  if (cachedWsId) return cachedWsId;
  const res = await csFetch('/workspaces');
  const ws = res.data?.[0];
  if (!ws) throw new Error('No ContentStudio workspace found');
  cachedWsId = ws.id || ws._id;
  return cachedWsId;
}

// Fetch all connected social accounts
async function getConnectedAccounts() {
  const wsId = await getWorkspaceId();
  const res = await csFetch(`/workspaces/${wsId}/accounts?per_page=50`);
  return Array.isArray(res.data) ? res.data : [];
}

function getNextOptimalSlot(offsetDays = 0, preferredHour = null) {
  const now = new Date();
  const nyTimeStr = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const nyDate = new Date(nyTimeStr);

  const year = nyDate.getFullYear();
  const month = nyDate.getMonth();
  const date = nyDate.getDate();
  const hour = nyDate.getHours();
  const minute = nyDate.getMinutes();

  let targetDate = new Date(year, month, date);
  let targetHour = preferredHour !== null ? preferredHour : 12;
  let targetMinute = preferredHour !== null ? 0 : 30;

  if (preferredHour === null) {
    if (hour < 12) {
      targetHour = 12;
      targetMinute = 30;
    } else if (hour < 17) {
      targetHour = 17;
      targetMinute = 30;
    } else if (hour < 19 || (hour === 19 && minute <= 30)) {
      targetHour = 20;
      targetMinute = 0;
    } else {
      targetDate.setDate(targetDate.getDate() + 1);
      targetHour = 12;
      targetMinute = 30;
    }
  }

  if (offsetDays > 0) {
    targetDate.setDate(targetDate.getDate() + offsetDays);
  }

  const y = targetDate.getFullYear();
  const m = String(targetDate.getMonth() + 1).padStart(2, "0");
  const d = String(targetDate.getDate()).padStart(2, "0");
  const h = String(targetHour).padStart(2, "0");
  const min = String(targetMinute).padStart(2, "0");

  return `${y}-${m}-${d} ${h}:${min}:00`;
}

// Upload local video MP4 to ContentStudio Media Library
async function uploadMediaFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Media file not found on disk: ${filePath}`);
  }
  const wsId = await getWorkspaceId();
  const fileName = path.basename(filePath);
  const fileBuf = fs.readFileSync(filePath);
  const blob = new Blob([fileBuf], { type: 'video/mp4' });

  const form = new FormData();
  form.append('file', blob, fileName);

  const res = await csFetch(`/workspaces/${wsId}/media`, 'POST', form);
  if (!res.data || !res.data.id) {
    throw new Error(res.message || 'Failed to upload media to ContentStudio');
  }
  return res.data;
}

// Schedule a post with VIDEO + FIRST COMMENT + OPTIONAL CUSTOM THUMBNAIL
async function schedulePostWithFirstComment({
  text,
  videoFilePath = null,
  videoUrl = null,
  thumbnailFilePath = null,
  thumbnailUrl = null,
  title = null,
  accountIds,
  scheduledAt, // 'YYYY-MM-DD HH:mm:ss'
  firstCommentMessage, // e.g. "👉 Grab free access here: https://traffic.aisimplesystem.com/sleep"
  firstCommentAccountIds = null
}) {
  const wsId = await getWorkspaceId();

  let mediaIds = [];
  if (videoFilePath && fs.existsSync(videoFilePath)) {
    console.log(`📤 [ContentStudio] Uploading video to Media Library: ${path.basename(videoFilePath)}...`);
    const uploaded = await uploadMediaFile(videoFilePath);
    mediaIds = [uploaded.id];
    console.log(`✅ [ContentStudio] Uploaded successfully (Media ID: ${uploaded.id})`);
  }

  let finalThumbUrl = null;
  if (thumbnailFilePath && fs.existsSync(thumbnailFilePath)) {
    console.log(`📤 [ContentStudio] Uploading custom thumbnail: ${path.basename(thumbnailFilePath)}...`);
    const uploadedThumb = await uploadMediaFile(thumbnailFilePath);
    finalThumbUrl = uploadedThumb.url;
    console.log(`✅ [ContentStudio] Uploaded thumbnail: ${finalThumbUrl}`);
  } else if (thumbnailUrl) {
    finalThumbUrl = thumbnailUrl;
  }

  const mediaObj = {
    images: [],
    media_ids: mediaIds
  };
  if (finalThumbUrl) {
    mediaObj.video_thumbnail = finalThumbUrl;
  }

  const payload = {
    content: {
      text: text || '',
      media: mediaObj
    },
    accounts: accountIds,
    post_type: 'feed',
    post_video_title: title || 'Featured Commercial',
    youtube_options: {
      title: (title || text || 'Featured Commercial').slice(0, 95)
    },
    scheduling:
      scheduledAt === 'now'
        ? { publish_type: 'now' }
        : scheduledAt === 'draft'
        ? { publish_type: 'draft' }
        : scheduledAt
        ? { publish_type: 'scheduled', scheduled_at: scheduledAt }
        : {
            publish_type: 'scheduled',
            scheduled_at: getNextOptimalSlot()
          }
  };

  // If firstCommentMessage is provided, attach it
  if (firstCommentMessage) {
    payload.first_comment = {
      message: firstCommentMessage,
      accounts: firstCommentAccountIds || accountIds
    };
  }

  const result = await csFetch(`/workspaces/${wsId}/posts`, 'POST', payload);
  return result;
}

module.exports = {
  getWorkspaceId,
  getConnectedAccounts,
  uploadMediaFile,
  getNextOptimalSlot,
  schedulePostWithFirstComment
};
