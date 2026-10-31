// vidIQ MCP Client (mcp.vidiq.com)

const VIDIQ_MCP_URL = 'https://mcp.vidiq.com/mcp';

async function callVidiqMcpTool(name, args = {}) {
  const token = process.env.VIDIQ_API_KEY || 'vidiq_y0c5TZwqZBG7eSSbIpPZHR6QADzB2OlTPwjLVMq6';

  const res = await fetch(VIDIQ_MCP_URL, {
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
    throw new Error(`vidIQ MCP HTTP ${res.status}: ${rawText}`);
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
    throw new Error(`Could not parse vidIQ response: ${rawText.slice(0, 200)}`);
  }
  if (rpcPayload.error) {
    throw new Error(`vidIQ error: ${JSON.stringify(rpcPayload.error)}`);
  }

  return rpcPayload.result;
}

// Research keywords using vidIQ MCP
async function researchKeyword(keyword) {
  const result = await callVidiqMcpTool('vidiq_keyword_research', { keyword });
  const meta = result?._meta?.widgetData || {};
  const seed = meta.seedKeyword || {};
  const related = Array.isArray(meta.relatedKeywords) ? meta.relatedKeywords : [];

  return {
    seed: {
      keyword: seed.keyword || keyword,
      volume: Math.round(seed.volume || 0),
      competition: Math.round(seed.competition || 0),
      overallScore: Math.round(seed.overall || 0),
      monthlySearches: seed.monthlySearchesDisplay || seed.estimatedMonthlySearch || '0'
    },
    related: related.slice(0, 8).map((k) => ({
      keyword: k.keyword,
      volume: Math.round(k.volume || 0),
      competition: Math.round(k.competition || 0),
      overallScore: Math.round(k.overall || 0),
      monthlySearches: k.monthlySearchesDisplay || k.estimatedMonthlySearch || '0'
    }))
  };
}

module.exports = {
  researchKeyword,
  callVidiqMcpTool
};
