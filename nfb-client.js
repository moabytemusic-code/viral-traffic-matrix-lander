const crypto = require('crypto');

// 9 Figure Buddy MCP Client (Self-Healing OAuth 2.0 PKCE + Refresh Token + JSON-RPC 2.0 Streamable HTTP)

let cachedAccessToken = null;
let cachedRefreshToken = null;
let tokenExpiresAt = 0;

function base64UrlEncode(buffer) {
  return buffer
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/g, '');
}

async function mintFreshTokenViaSessionCookie(clientId, sessionCookie) {
  const codeVerifier = base64UrlEncode(crypto.randomBytes(32));
  const codeChallenge = base64UrlEncode(crypto.createHash('sha256').update(codeVerifier).digest());
  const redirectUri = 'https://9figurebuddy.com/app/connect';
  const state = base64UrlEncode(crypto.randomBytes(12));

  const authBody = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'outliers',
    state,
    code_challenge: codeChallenge,
    code_challenge_method: 'S256',
    resource: 'https://9figurebuddy.com/mcp',
    decision: 'allow'
  });

  const authRes = await fetch('https://9figurebuddy.com/app/oauth/authorize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      Cookie: sessionCookie.includes('=') ? sessionCookie : `nfb_s=${sessionCookie}`
    },
    body: authBody.toString(),
    redirect: 'manual'
  });

  const location = authRes.headers.get('location') || '';
  const codeMatch = location.match(/[?&]code=([^&]+)/);
  if (!codeMatch) {
    throw new Error(`PKCE authorize did not return code (status ${authRes.status}, location: ${location})`);
  }

  const code = decodeURIComponent(codeMatch[1]);
  const tokenBody = new URLSearchParams({
    grant_type: 'authorization_code',
    client_id: clientId,
    code,
    redirect_uri: redirectUri,
    code_verifier: codeVerifier,
    resource: 'https://9figurebuddy.com/mcp'
  });

  const tokenRes = await fetch('https://9figurebuddy.com/app/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: tokenBody.toString()
  });

  if (!tokenRes.ok) {
    const errText = await tokenRes.text();
    throw new Error(`PKCE token exchange failed (${tokenRes.status}): ${errText}`);
  }

  return tokenRes.json();
}

async function getAccessToken() {
  const clientId = process.env.NFB_CLIENT_ID || 'nfbc_VXym-uVMkdotsbEMVDMpamBL';
  const refreshToken = cachedRefreshToken || process.env.NFB_REFRESH_TOKEN;
  const sessionCookie = process.env.NFB_SESSION_COOKIE;

  if (cachedAccessToken && Date.now() < tokenExpiresAt - 60000) {
    return cachedAccessToken;
  }

  // 1. Try refresh_token first if available
  if (refreshToken) {
    try {
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

      if (res.ok) {
        const data = await res.json();
        cachedAccessToken = data.access_token;
        cachedRefreshToken = data.refresh_token || refreshToken;
        tokenExpiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
        return cachedAccessToken;
      }
    } catch (_) {}
  }

  // 2. Self-healing fallback: Mint fresh token pair via NFB_SESSION_COOKIE
  if (sessionCookie) {
    const data = await mintFreshTokenViaSessionCookie(clientId, sessionCookie);
    cachedAccessToken = data.access_token;
    cachedRefreshToken = data.refresh_token;
    tokenExpiresAt = Date.now() + Number(data.expires_in || 3600) * 1000;
    return cachedAccessToken;
  }

  throw new Error('9FigureBuddy OAuth token expired and NFB_SESSION_COOKIE is not configured');
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
