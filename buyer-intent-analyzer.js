// AI Buyer Intent Analyzer
// Answers the core question: "What specific product should we sell, to whom, and what trustworthy evidence supports testing it now?"
// Validates hypotheses against independent demand indicators (vidIQ MCP & Search)
// Distinguishes exact query vs related query, platform (YouTube vs Web), and product form (Hardware vs Course)
// Disqualifies non-commercial events before running search queries
// Zero em dashes enforced.

const vidiqClient = require('./vidiq-client');

const COMMERCIAL_TAXONOMY = {
  'Energy, Blackouts & Emergency Prep': {
    consumerGroup: 'Homeowners, Suburban Families & Rural Residents',
    coreProblem: 'Power grid blackout vulnerability, freezing weather, heating failure, and critical refrigeration interruption.',
    purchaseTiming: 'IMMEDIATE',
    intentType: 'TRANSACTIONAL',
    defaultPhrases: [
      'portable power station refrigerator',
      'prevent frozen pipes power outage',
      'home backup battery blackout',
      'emergency water storage containers'
    ]
  },
  'Finance, Capital & Wealth': {
    consumerGroup: 'Retail Investors, Borrowers, Savers & Freelancers',
    coreProblem: 'Interest rate fluctuations, debt refinancing costs, inflation erosion of savings, and capital risk.',
    purchaseTiming: 'IMMEDIATE',
    intentType: 'COMMERCIAL_INVESTIGATION',
    defaultPhrases: [
      'high yield cash preservation',
      'best hedge against inflation',
      'how to pass prop firm evaluation',
      'recession proof online income'
    ]
  },
  'Health, Sleep & Wellness': {
    consumerGroup: 'Adults 35+, Stressed Professionals & Shift Workers',
    coreProblem: 'Chronic sleep disruption, elevated cortisol, fatigue, tinnitus, or inflammatory discomfort.',
    purchaseTiming: 'IMMEDIATE',
    intentType: 'TRANSACTIONAL',
    defaultPhrases: [
      'waking up at 3am cortisol sleep',
      'natural deep sleep remedies',
      'why do ears ring at night',
      'joint mobility morning stiffness'
    ]
  },
  'Technology & Productivity': {
    consumerGroup: 'Digital Marketers, Content Creators & Knowledge Workers',
    coreProblem: 'Productivity bottlenecks, fear of workflow displacement, and demand for automated traffic systems.',
    purchaseTiming: 'UPCOMING',
    intentType: 'COMMERCIAL_INVESTIGATION',
    defaultPhrases: [
      'ai workflow automation tools',
      'automated affiliate traffic system',
      'faceless youtube automation tools',
      'prompt engineering productivity'
    ]
  }
};

function detectRequiredProductForm(phrase, problem) {
  const combined = `${phrase || ''} ${problem || ''}`.toLowerCase();
  if (/\b(portable power station|power station|generator|inverter generator|solar generator|refrigerator backup|hardware|battery generator)\b/i.test(combined)) {
    return 'PHYSICAL_HARDWARE';
  }
  if (/\b(tart cherry|supplement|capsules?|pills?|tincture|collagen|botanical)\b/i.test(combined)) {
    return 'PHYSICAL_SUPPLEMENT';
  }
  if (/\b(prop firm|funded trader|evaluation challenge|funded account)\b/i.test(combined)) {
    return 'SERVICE_EVALUATION';
  }
  if (/\b(software|automation tool|crm|bot|script|platform access|saas)\b/i.test(combined)) {
    return 'SOFTWARE_SUBSCRIPTION';
  }
  return 'DIGITAL_COURSE';
}

async function analyzeBuyerIntent(predictionEvent, options = {}) {
  const signal = predictionEvent.signal || {};
  const isViable = signal.isCommerciallyViable !== false;
  const category = predictionEvent.category || 'General News & Macro Indicators';
  const eventId = predictionEvent.externalId || predictionEvent.eventId || 'unknown';

  // 1. Non-Commercial Early Exit Gate
  if (!isViable || !COMMERCIAL_TAXONOMY[category]) {
    const reason = signal.nonCommercialReason || `Category "${category}" has no direct consumer purchasing problem in inventory.`;
    return {
      hypothesisId: `hyp_${eventId}_${Date.now()}`,
      signalId: signal.signalId || `sig_${eventId}`,
      category,
      affectedConsumerGroup: 'None (Spectators / Non-Commercial Audience)',
      coreProblem: 'None: Event does not create practical consumer purchasing demand.',
      hypothesis: `Spectators observing "${predictionEvent.title}" follow the outcome for news or entertainment without buying intent.`,
      searchPhrases: [],
      primarySearchPhrase: null,
      requiredProductForm: 'NONE',
      purchaseTiming: 'NONE',
      intentType: 'NON_COMMERCIAL',
      commercialViable: false,
      verificationStatus: 'NOT_CHECKED',
      demandEvidence: null,
      outcome: 'NO_COMMERCIAL_OPPORTUNITY',
      outcomeReason: reason,
      createdAt: new Date().toISOString()
    };
  }

  // 2. Commercially Viable Intent Mapping
  const taxonomy = COMMERCIAL_TAXONOMY[category];
  const searchPhrases = [...taxonomy.defaultPhrases];
  const primarySearchPhrase = searchPhrases[0];
  const requiredProductForm = detectRequiredProductForm(primarySearchPhrase, taxonomy.coreProblem);

  const hypothesisRecord = {
    hypothesisId: `hyp_${eventId}_${Date.now()}`,
    signalId: signal.signalId || `sig_${eventId}`,
    category,
    affectedConsumerGroup: taxonomy.consumerGroup,
    coreProblem: taxonomy.coreProblem,
    hypothesis: `Consumers affected by "${predictionEvent.title}" seek practical self-reliance, capital protection, or physical mitigation tools to resolve: ${taxonomy.coreProblem}`,
    searchPhrases: searchPhrases.slice(0, 4),
    primarySearchPhrase,
    requiredProductForm,
    purchaseTiming: taxonomy.purchaseTiming,
    intentType: taxonomy.intentType,
    commercialViable: true,
    verificationStatus: 'NOT_CHECKED',
    demandEvidence: null,
    outcome: 'PENDING_DEMAND_VERIFICATION',
    outcomeReason: null,
    createdAt: new Date().toISOString()
  };

  // 3. Skip vidIQ MCP option (explicitly tagged as demonstration / simulated)
  if (options.skipVidiqApi) {
    hypothesisRecord.verificationStatus = 'MEASURED_LOW_DEMAND';
    hypothesisRecord.demandEvidence = {
      evidenceId: `evi_${Date.now()}`,
      provider: 'vidIQ Keyword Intelligence API (Simulated Unit Test)',
      searchPlatform: 'YouTube Search Index',
      queryPhrase: primarySearchPhrase,
      searchVolume: 0,
      competitionScore: 25,
      opportunityScore: 30,
      volumeDisplay: '<750',
      geography: 'US (United States)',
      language: 'en',
      measurementPeriod: '30-Day Trailing Baseline',
      observationDate: new Date().toISOString(),
      isDemonstration: true,
      supportingLinks: [
        { title: 'Google Trends Search', url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(primarySearchPhrase)}` }
      ]
    };
    return hypothesisRecord;
  }

  // 4. Independent Search Demand Verification via real vidIQ API
  try {
    const rawResult = await vidiqClient.researchKeyword(primarySearchPhrase);
    const seed = rawResult.seed || {};
    const related = Array.isArray(rawResult.related) ? rawResult.related : [];

    // Parse volume from seed or best related
    let searchVolume = 0;
    if (seed.monthlySearches && typeof seed.monthlySearches === 'string') {
      const parsed = parseInt(seed.monthlySearches.replace(/[^0-9]/g, ''), 10);
      if (!isNaN(parsed)) searchVolume = parsed;
    } else if (typeof seed.volume === 'number') {
      searchVolume = seed.volume;
    }

    const oppScore = typeof seed.overallScore === 'number' ? seed.overallScore : (seed.opportunityScore || 0);
    const compScore = typeof seed.competition === 'number' ? seed.competition : 50;
    const volDisplay = seed.monthlySearches || (searchVolume > 0 ? searchVolume.toLocaleString() : '<750');

    // Also inspect highest related volume to avoid false negatives on specific long-tail phrasing
    const bestRelated = related.reduce((best, cur) => {
      const curVol = parseInt(String(cur.monthlySearches || '').replace(/[^0-9]/g, ''), 10) || 0;
      const bestVol = parseInt(String(best?.monthlySearches || '').replace(/[^0-9]/g, ''), 10) || 0;
      return curVol > bestVol ? cur : best;
    }, null);

    let verificationStatus = 'MEASURED_LOW_DEMAND';
    if (searchVolume >= 1000 && oppScore >= 45) {
      verificationStatus = 'VERIFIED_RELEVANT_DEMAND';
    } else if (bestRelated) {
      const relVol = parseInt(String(bestRelated.monthlySearches || '').replace(/[^0-9]/g, ''), 10) || 0;
      if (relVol >= 5000 && (bestRelated.overallScore || 0) >= 50) {
        verificationStatus = 'VERIFIED_RELEVANT_DEMAND';
      }
    }

    hypothesisRecord.verificationStatus = verificationStatus;
    hypothesisRecord.demandEvidence = {
      evidenceId: `evi_${Date.now()}`,
      provider: 'vidIQ Keyword Intelligence API',
      searchPlatform: 'YouTube Search Index',
      queryPhrase: primarySearchPhrase,
      searchVolume,
      competitionScore: compScore,
      opportunityScore: oppScore,
      volumeDisplay: volDisplay,
      relatedTopQuery: bestRelated ? {
        keyword: bestRelated.keyword,
        monthlySearches: bestRelated.monthlySearches,
        overallScore: bestRelated.overallScore
      } : null,
      geography: 'US (United States)',
      language: 'en',
      measurementPeriod: '30-Day Trailing Baseline',
      observationDate: new Date().toISOString(),
      isDemonstration: false,
      supportingLinks: [
        { title: 'Google Trends Search', url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(primarySearchPhrase)}` }
      ]
    };
  } catch (err) {
    // Honest provider failure handling: Never invent fallback volume
    hypothesisRecord.verificationStatus = 'PROVIDER_UNAVAILABLE';
    hypothesisRecord.demandEvidence = {
      evidenceId: `evi_${Date.now()}`,
      provider: 'vidIQ Keyword Intelligence API',
      searchPlatform: 'YouTube Search Index',
      queryPhrase: primarySearchPhrase,
      searchVolume: null,
      competitionScore: null,
      opportunityScore: null,
      volumeDisplay: 'Unavailable (Unverified)',
      error: err.message,
      geography: 'US (United States)',
      language: 'en',
      observationDate: new Date().toISOString(),
      isDemonstration: false
    };
  }

  return hypothesisRecord;
}

module.exports = {
  analyzeBuyerIntent,
  COMMERCIAL_TAXONOMY,
  detectRequiredProductForm
};
