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

// Schedule a post with VIDEO + FIRST COMMENT
async function schedulePostWithFirstComment({
  text,
  videoFilePath = null,
  videoUrl = null,
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

  const payload = {
    content: {
      text: text || '',
      media: {
        images: [],
        media_ids: mediaIds
      }
    },
    accounts: accountIds,
    post_type: 'feed',
    post_video_title: title || 'Featured Commercial',
    youtube_options: {
      title: (title || text || 'Featured Commercial').slice(0, 95)
    },
    scheduling: scheduledAt
      ? {
          publish_type: 'scheduled',
          scheduled_at: scheduledAt
        }
      : {
          publish_type: 'draft' // Safe default if scheduledAt is omitted
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
  schedulePostWithFirstComment
};
