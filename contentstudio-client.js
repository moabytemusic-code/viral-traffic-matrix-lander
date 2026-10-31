// ContentStudio API Client (api.contentstudio.io)
// Supports multi-platform video publishing AND automated First-Comment with your live affiliate link!

const CS_API_BASE = 'https://api.contentstudio.io/api/v1';

async function csFetch(endpoint, method = 'GET', body = null) {
  const apiKey = process.env.CONTENTSTUDIO_API_KEY || 'cs_e7d60a07ff5d742d9c175e56c36f0a674faeac4567d0c01d3e473512db695dbb';
  const headers = {
    'X-API-Key': apiKey,
    Accept: 'application/json'
  };
  if (body) {
    headers['Content-Type'] = 'application/json';
  }

  const res = await fetch(`${CS_API_BASE}${endpoint}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null
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

// Schedule a post with VIDEO + FIRST COMMENT
async function schedulePostWithFirstComment({
  text,
  videoUrl,
  accountIds,
  scheduledAt, // 'YYYY-MM-DD HH:mm:ss'
  firstCommentMessage, // e.g. "👉 Grab free access here: https://traffic.aisimplesystem.com"
  firstCommentAccountIds = null // array of account IDs where first comment is allowed
}) {
  const wsId = await getWorkspaceId();

  const payload = {
    content: {
      text: text || '',
      media: {
        videos: [videoUrl]
      }
    },
    accounts: accountIds,
    post_type: 'feed',
    scheduling: scheduledAt
      ? {
          publish_type: 'scheduled',
          scheduled_at: scheduledAt
        }
      : {
          publish_type: 'now'
        }
  };

  // If a first comment message is provided, attach it for supported accounts
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
  schedulePostWithFirstComment
};
