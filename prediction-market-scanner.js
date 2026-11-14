// Prediction Market Scanner
// Ingests real-time prediction market intelligence from Polymarket Gamma API
// Read-only public market data (No trading, no order execution, no wallet)
// Preserves complete market contracts, multiple outcomes, timestamps, and volume acceleration

const POLYMARKET_GAMMA_URL = 'https://gamma-api.polymarket.com/events';

// Category classification rules using exact word boundaries and tag sets
const SPORTS_TAGS = new Set([
  'sports', 'nba', 'nfl', 'games', 'basketball', 'esports', 'football',
  'soccer', 'tennis', 'baseball', 'ufc', 'mma', 'premier league',
  'champions league', 'nhl', 'dota 2', 'league of legends', 'counter-strike'
]);
const SPORTS_REGEX = /\b(vs\.?|spread|moneyline|over\/under|points|game \d+|playoffs|winner - game|nba|nfl|mlb|nhl|atp|wta|premier league)\b/i;

const ENTERTAINMENT_TAGS = new Set(['oscars', 'grammys', 'box office', 'celebrity', 'entertainment', 'movies', 'music']);
const ENTERTAINMENT_REGEX = /\b(oscars?|grammys?|emmys?|box office|movie|album|actor|actress|billboard)\b/i;

const GOVERNANCE_TAGS = new Set([
  'elections', 'politics', 'us election', 'world elections', 'president',
  'primaries', 'congress', 'senate', 'french election', '2028 election',
  'main election', 'french elections', 'global elections'
]);
const GOVERNANCE_REGEX = /\b(election|presidential|president|nominee|nomination|congress|senate|governor|white house|vance|trump|newsom|democrat|republican|parliament|prime minister)\b/i;

const FINANCE_REGEX = /\b(fed|fomc|rates?|interest rate|inflation|cpi|recession|bitcoin|btc|eth|crypto|treasury|yield|stock|s&p|nasdaq|economy|tariffs?|debt|dollar|banking|liquidity|bond)\b/i;
const ENERGY_REGEX = /\b(winter|blizzard|deep freeze|freeze|blackout|power outage|power grid|electricity|oil|gas|hurricane|wildfire|disaster|emergency|off.?grid|generator)\b/i;
const HEALTH_REGEX = /\b(fda|medical|drug|pharma|health|disease|outbreak|virus|vaccine|cdc|nih|world health organization|insomnia|cortisol|sleep|epidemic|hospital)\b/i;
const TECH_TAGS = new Set(['tech', 'big tech', 'ai', 'artificial intelligence', 'nvidia', 'nvda', 'technology']);
const TECH_REGEX = /\b(artificial intelligence|ai agents?|openai|anthropic|nvidia|nvda|gpu|quantum|robotics|software|developer|automation|llm|deep learning|semiconductor|chips?|tech|ceo of)\b/i;

async function fetchLivePredictionMarkets(options = {}) {
  const limit = options.limit || 40;
  const order = options.order || 'volume24hr';
  const ascending = options.ascending || false;
  
  const url = `${POLYMARKET_GAMMA_URL}?closed=false&limit=${limit}&order=${order}&ascending=${ascending}`;
  
  let retries = 2;
  let lastError = null;

  while (retries >= 0) {
    try {
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PredictionToProfitEngine/2.0; +https://aisimplesystem.com)',
          'Accept': 'application/json'
        },
        signal: AbortSignal.timeout(10000)
      });

      if (!res.ok) {
        throw new Error(`Polymarket API error status ${res.status}: ${res.statusText}`);
      }

      const rawEvents = await res.json();
      return normalizePredictionEvents(rawEvents);
    } catch (err) {
      lastError = err;
      retries--;
      if (retries >= 0) {
        await new Promise(r => setTimeout(r, 1000));
      }
    }
  }

  throw new Error(`Failed to fetch Polymarket events after retries: ${lastError.message}`);
}

function categorizeEvent(title, description, tags = []) {
  const lowerTitle = (title || '').toLowerCase();
  const lowerDesc = (description || '').toLowerCase();
  const combinedText = `${lowerTitle} ${lowerDesc}`;
  const lowerTags = tags.map(t => String(t).toLowerCase());

  // 1. Sports & Athletics Filter (Mandatory Non-Commercial Detection)
  const hasSportsTag = lowerTags.some(t => SPORTS_TAGS.has(t));
  if (hasSportsTag || SPORTS_REGEX.test(title)) {
    return {
      category: 'Sports & Competitive Athletics',
      isCommerciallyViable: false,
      nonCommercialReason: 'Competitive sports or athletic match without direct consumer purchasing problem or affiliate product fit.'
    };
  }

  // 2. Pure Entertainment / Trivia Filter
  const hasEntTag = lowerTags.some(t => ENTERTAINMENT_TAGS.has(t));
  if (hasEntTag || ENTERTAINMENT_REGEX.test(title)) {
    return {
      category: 'Culture, Media & Entertainment',
      isCommerciallyViable: false,
      nonCommercialReason: 'Pop culture or celebrity speculation with no consumer problem to solve.'
    };
  }

  // 3. Governance & Political Elections
  const hasGovTag = lowerTags.some(t => GOVERNANCE_TAGS.has(t));
  if (hasGovTag || GOVERNANCE_REGEX.test(title)) {
    return {
      category: 'Governance, Elections & Politics',
      isCommerciallyViable: false,
      nonCommercialReason: 'General political race or election polling speculation produces spectator curiosity, not verifiable consumer product purchasing intent.'
    };
  }

  // 4. Energy & Emergency Resilience (High Buyer Intent)
  if (ENERGY_REGEX.test(combinedText)) {
    return {
      category: 'Energy, Blackouts & Emergency Prep',
      isCommerciallyViable: true,
      nonCommercialReason: null
    };
  }

  // 5. Finance, Capital & Wealth (High Buyer Intent)
  if (FINANCE_REGEX.test(combinedText)) {
    return {
      category: 'Finance, Capital & Wealth',
      isCommerciallyViable: true,
      nonCommercialReason: null
    };
  }

  // 6. Health & Wellness (High Buyer Intent)
  if (HEALTH_REGEX.test(combinedText)) {
    return {
      category: 'Health, Sleep & Wellness',
      isCommerciallyViable: true,
      nonCommercialReason: null
    };
  }

  // 7. Technology & Productivity (High Buyer Intent)
  const hasTechTag = lowerTags.some(t => TECH_TAGS.has(t));
  if (hasTechTag || TECH_REGEX.test(combinedText)) {
    return {
      category: 'Technology & Productivity',
      isCommerciallyViable: true,
      nonCommercialReason: null
    };
  }

  // Default Fallback
  return {
    category: 'General News & Macro Indicators',
    isCommerciallyViable: false,
    nonCommercialReason: 'General macro event without confirmed practical consumer purchasing solution in inventory.'
  };
}

function normalizePredictionEvents(events = []) {
  const normalized = [];

  for (const e of events) {
    if (!e || !e.id || !e.title) continue;

    // Extract tags
    const tags = Array.isArray(e.tags) 
      ? e.tags.map(t => (typeof t === 'string' ? t : t.label || t.slug || '')).filter(Boolean)
      : [];

    const volume24h = Math.round(parseFloat(e.volume24hr || e.volume || 0));
    const volume1wk = Math.round(parseFloat(e.volume1wk || 0));
    const liquidity = Math.round(parseFloat(e.liquidity || 0));

    // Parse multi-outcome contracts
    const outcomes = [];
    const rawMarkets = Array.isArray(e.markets) ? e.markets : [];
    
    for (const m of rawMarkets) {
      if (!m) continue;
      let outcomeLabel = m.groupItemTitle || m.question || 'Standard Option';
      let price = 0.50;
      let prob = 50;

      if (m.outcomePrices) {
        try {
          const prices = JSON.parse(m.outcomePrices);
          if (Array.isArray(prices) && prices.length > 0) {
            price = parseFloat(prices[0]) || 0;
            prob = Math.round(price * 100);
          }
        } catch (_) {}
      }

      outcomes.push({
        outcomeId: String(m.id || m.conditionId || outcomes.length + 1),
        label: outcomeLabel.trim(),
        probability: prob,
        price: Number(price.toFixed(4)),
        volume: Math.round(parseFloat(m.volume || 0))
      });
    }

    // Sort outcomes by probability descending
    outcomes.sort((a, b) => b.probability - a.probability);

    const isMultiOutcome = rawMarkets.length > 1 || outcomes.length > 2;
    const topOutcome = outcomes[0] || { label: 'Yes', probability: 50, price: 0.50 };
    const primaryProbability = topOutcome.probability;

    // Categorize event with word boundary protection
    const catResult = categorizeEvent(e.title, e.description, tags);

    // Empirical Volume Acceleration against 7-Day Daily Baseline
    // Daily baseline = volume1wk / 7. Acceleration = volume24h / daily baseline.
    let volumeAcceleration = 1.0;
    let accelerationStatus = 'NO_HISTORICAL_BASELINE';
    let accelerationDisplay = '1.0x (Baseline Unmeasured)';
    let baselineDaily = 0;

    if (volume1wk > 0) {
      baselineDaily = Math.round(volume1wk / 7);
      if (baselineDaily > 0) {
        const factor = Number((volume24h / baselineDaily).toFixed(2));
        volumeAcceleration = Math.max(0.01, factor);
        accelerationStatus = 'EMPIRICAL_7D_BASELINE';
        accelerationDisplay = `${volumeAcceleration.toFixed(2)}x (7-day baseline: $${baselineDaily.toLocaleString()}/day)`;
      }
    }

    // Determine signal confidence based on liquidity depth and live observation
    let signalConfidence = 50;
    if (volume24h > 1000000 && liquidity > 500000) signalConfidence = 95;
    else if (volume24h > 250000 && liquidity > 100000) signalConfidence = 85;
    else if (volume24h > 50000) signalConfidence = 70;

    const observationTime = new Date().toISOString();
    const sourceUrl = `https://polymarket.com/event/${e.slug || e.id}`;

    normalized.push({
      eventId: `poly_${e.id}`,
      source: 'polymarket',
      provider: 'polymarket',
      externalId: String(e.id),
      slug: e.slug || String(e.id),
      title: e.title.trim(),
      description: (e.description || e.title).trim(),
      category: catResult.category,
      tags,
      volume24h,
      volume1wk,
      liquidity,
      marketStatus: e.closed ? 'closed' : 'open',
      probability: primaryProbability,
      outcomes: outcomes.slice(0, 6),
      topOutcome,
      isMultiOutcome,
      totalOutcomesCount: rawMarkets.length,
      resolutionDate: e.endDate || e.resolutionDate || null,
      sourceUrl,
      observationTime,
      firstSeenTime: e.createdAt || observationTime,
      historicalComparison: {
        volume24h,
        volume1wk,
        baselineDaily,
        accelerationFactor: volumeAcceleration,
        accelerationStatus,
        accelerationDisplay
      },
      signal: {
        signalId: `sig_${e.id}_${Date.now()}`,
        category: catResult.category,
        currentObservation: isMultiOutcome
          ? `Leading outcome: "${topOutcome.label}" at ${topOutcome.probability}% (${rawMarkets.length} total options, $${volume24h.toLocaleString()} 24h vol).`
          : `Market probability stands at ${primaryProbability}%, with 24-hour trading volume of $${volume24h.toLocaleString()}.`,
        probability: primaryProbability,
        probabilityChange24h: 0,
        volumeAcceleration,
        accelerationStatus,
        accelerationDisplay,
        signalConfidence,
        dataFreshness: 'LIVE_STREAM',
        isCommerciallyViable: catResult.isCommerciallyViable,
        nonCommercialReason: catResult.nonCommercialReason,
        firstDetectedAt: observationTime,
        lastUpdatedAt: observationTime
      }
    });
  }

  return normalized;
}

module.exports = {
  fetchLivePredictionMarkets,
  normalizePredictionEvents,
  categorizeEvent
};
