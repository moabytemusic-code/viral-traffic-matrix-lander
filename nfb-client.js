// 9 Figure Buddy MCP Client (OAuth 2.0 Refresh Token + JSON-RPC 2.0 Streamable HTTP)

let cachedAccessToken = null;
let tokenExpiresAt = 0;

async function getAccessToken() {
  const clientId = process.env.NFB_CLIENT_ID;
  const refreshToken = process.env.NFB_REFRESH_TOKEN;

  if (!clientId || !refreshToken) {
    throw new Error('NFB_CLIENT_ID or NFB_REFRESH_TOKEN not set in environment');
  }

  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }

  const body = new URLSearchParams({
    grant_type: 'refresh_token',
    client_id: clientId,
    refresh_token: refreshToken
  });

  const res = await fetch('https://9figurebuddy.com/app/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: body.toString()
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`9FigureBuddy OAuth token refresh failed (${res.status}): ${errText}`);
  }

  const data = await res.json();
  cachedAccessToken = data.access_token;
  tokenExpiresAt = Date.now() + (Number(data.expires_in || 3600) * 1000);
  if (data.refresh_token) {
    process.env.NFB_REFRESH_TOKEN = data.refresh_token;
  }
  return cachedAccessToken;
}

async function callMcpTool(name, args = {}) {
  const token = await getAccessToken();

  const res = await fetch('https://9figurebuddy.com/mcp', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      Accept: 'application/json, text/event-stream'
    },
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: Date.now(),
      method: 'tools/call',
      params: {
        name,
        arguments: args
      }
    })
  });

  const rawText = await res.text();
  if (!res.ok) {
    throw new Error(`9FigureBuddy MCP HTTP ${res.status}: ${rawText}`);
  }

  // Handle either direct JSON-RPC response or SSE stream ("data: {...}")
  let rpcPayload = null;
  if (rawText.trim().startsWith('{')) {
    rpcPayload = JSON.parse(rawText);
  } else {
    const dataLines = rawText
      .split(/\r?\n/)
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.replace(/^data:\s*/, '').trim())
      .filter(Boolean);
    for (const line of dataLines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.result || parsed.error) {
          rpcPayload = parsed;
        }
      } catch (_) {}
    }
  }

  if (!rpcPayload) {
    throw new Error(`Could not parse MCP response: ${rawText.slice(0, 300)}`);
  }
  if (rpcPayload.error) {
    throw new Error(`MCP error: ${JSON.stringify(rpcPayload.error)}`);
  }

  const textContent = (rpcPayload.result?.content || [])
    .filter((c) => c.type === 'text')
    .map((c) => c.text)
    .join('\n');

  try {
    return JSON.parse(textContent);
  } catch (_) {
    return { rawText: textContent };
  }
}

async function searchOutliers({ query, niche, tier, sort = 'velocity', page = 1 }) {
  const args = { query: query || 'viral', sort, page: Number(page || 1) };
  if (niche) args.niche = niche;
  if (tier) args.tier = tier;
  return callMcpTool('search', args);
}

async function fetchOutlierBreakdown(id) {
  return callMcpTool('fetch', { id });
}

async function listNiches() {
  return callMcpTool('list_niches', {});
}

module.exports = {
  searchOutliers,
  fetchOutlierBreakdown,
  listNiches
};
