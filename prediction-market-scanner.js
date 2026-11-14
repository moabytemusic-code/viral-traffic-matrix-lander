// Prediction Market Scanner
// Ingests real-time prediction market intelligence from Polymarket Gamma API
// Read-only public market data (No trading, no order execution, no wallet)

const POLYMARKET_GAMMA_URL = 'https://gamma-api.polymarket.com/events';

// Commercial relevance categories to prioritize
const RELEVANT_TOPICS = [
  'economy', 'fed', 'interest rates', 'inflation', 'tech', 'ai', 'nvidia',
  'apple', 'energy', 'oil', 'climate', 'winter', 'storm', 'crypto', 'bitcoin',
  'lifestyle', 'health', 'food', 'travel', 'elections', 'policy', 'spending'
];

async function fetchLivePredictionMarkets(options = {}) {
  const limit = options.limit || 40;
  const order = options.order || 'volume24hr';
  const ascending = options.ascending || false;
  
  const url = `${POLYMARKET_GAMMA_URL}?closed=false&limit=${limit}&order=${order}&ascending=${ascending}`;
  
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PredictionToProfitEngine/1.0; +https://aisimplesystem.com)',
      'Accept': 'application/json'
    }
  });

  if (!res.ok) {
    throw new Error(`Polymarket API responded with status ${res.status}: ${res.statusText}`);
  }

  const rawEvents = await res.json();
  return normalizePredictionEvents(rawEvents);
}

function normalizePredictionEvents(events = []) {
  const normalized = [];

  for (const e of events) {
    if (!e || !e.id || !e.title) continue;

    // Filter out purely non-commercial esports/game matches
    const titleLower = e.title.toLowerCase();
    const isEsportsMatch = titleLower.includes('dota 2:') || titleLower.includes('lol:') || titleLower.includes('(bo3)') || titleLower.includes('(bo5)');
    if (isEsportsMatch) continue;

    // Extract tags
    const tags = Array.isArray(e.tags) 
      ? e.tags.map(t => (typeof t === 'string' ? t : t.label || t.slug || '')).filter(Boolean)
      : [];

    // Primary market metrics
    const primaryMarket = Array.isArray(e.markets) && e.markets[0] ? e.markets[0] : null;
    let probability = 50;
    if (primaryMarket && primaryMarket.outcomePrices) {
      try {
        const prices = JSON.parse(primaryMarket.outcomePrices);
        if (Array.isArray(prices) && prices.length > 0) {
          probability = Math.round(parseFloat(prices[0]) * 100);
        }
      } catch (_) {}
    }

    const volume24h = Math.round(parseFloat(e.volume24hr || e.volume || 0));
    const liquidity = Math.round(parseFloat(e.liquidity || 0));
    
    // Categorize event
    let category = 'Macro & Economy';
    const combinedText = `${e.title} ${e.description || ''} ${tags.join(' ')}`.toLowerCase();
    
    if (combinedText.includes('winter') || combinedText.includes('storm') || combinedText.includes('freeze') || combinedText.includes('energy') || combinedText.includes('power') || combinedText.includes('oil')) {
      category = 'Energy & Resilience';
    } else if (combinedText.includes('tech') || combinedText.includes('ai') || combinedText.includes('nvidia') || combinedText.includes('apple') || combinedText.includes('software')) {
      category = 'Technology & AI';
    } else if (combinedText.includes('crypto') || combinedText.includes('bitcoin') || combinedText.includes('btc') || combinedText.includes('fed') || combinedText.includes('rates') || combinedText.includes('inflation')) {
      category = 'Finance & Wealth';
    } else if (combinedText.includes('health') || combinedText.includes('fda') || combinedText.includes('medical') || combinedText.includes('food') || combinedText.includes('virus')) {
      category = 'Health & Lifestyle';
    } else if (combinedText.includes('election') || combinedText.includes('president') || combinedText.includes('policy') || combinedText.includes('congress')) {
      category = 'Governance & Society';
    }

    // Determine signal confidence based on volume and liquidity
    let signalConfidence = 60;
    if (volume24h > 1000000) signalConfidence = 95;
    else if (volume24h > 250000) signalConfidence = 85;
    else if (volume24h > 50000) signalConfidence = 75;

    normalized.push({
      eventId: `poly_${e.id}`,
      source: 'polymarket',
      externalId: String(e.id),
      title: e.title.trim(),
      description: (e.description || e.title).trim(),
      category,
      tags,
      volume24h,
      liquidity,
      marketStatus: e.closed ? 'closed' : 'open',
      probability,
      resolutionDate: e.endDate || e.resolutionDate || null,
      sourceUrl: `https://polymarket.com/event/${e.slug || e.id}`,
      signal: {
        signalId: `sig_${e.id}_${Date.now()}`,
        category,
        currentObservation: `Market probability stands at ${probability}%, with 24-hour trading volume of $${volume24h.toLocaleString()}.`,
        probability,
        probabilityChange24h: 0,
        volumeAcceleration: volume24h > 500000 ? 1.8 : 1.2,
        signalConfidence,
        dataFreshness: 'live',
        firstDetectedAt: new Date().toISOString(),
        lastUpdatedAt: new Date().toISOString()
      }
    });
  }

  return normalized;
}

module.exports = {
  fetchLivePredictionMarkets,
  normalizePredictionEvents
};
