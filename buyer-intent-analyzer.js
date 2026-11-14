// AI Buyer Intent Analyzer
// Answers the core question: "What might people want to buy because of this event?"
// Validates hypotheses against independent demand indicators (vidIQ MCP & Search)
// Disqualifies non-commercial events before running search queries

const vidiqClient = require('./vidiq-client');

const COMMERCIAL_TAXONOMY = {
  'Energy, Blackouts & Emergency Prep': {
    consumerGroup: 'Homeowners, Suburban Families & Rural Residents',
    coreProblem: 'Power grid blackout vulnerability, freezing weather, heating failure, and water access disruption.',
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
      coreProblem: 'None - Event does not create practical consumer purchasing demand.',
      hypothesis: `Spectators observing "${predictionEvent.title}" follow the outcome for news or entertainment without buying intent.`,
      searchPhrases: [],
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

  const hypothesisRecord = {
    hypothesisId: `hyp_${eventId}_${Date.now()}`,
    signalId: signal.signalId || `sig_${eventId}`,
    category,
    affectedConsumerGroup: taxonomy.consumerGroup,
    coreProblem: taxonomy.coreProblem,
    hypothesis: `Consumers affected by "${predictionEvent.title}" seek practical self-reliance, capital protection, or physical mitigation tools to resolve: ${taxonomy.coreProblem}`,
    searchPhrases: searchPhrases.slice(0, 4),
    primarySearchPhrase,
    purchaseTiming: taxonomy.purchaseTiming,
    intentType: taxonomy.intentType,
    commercialViable: true,
    verificationStatus: 'NOT_CHECKED',
    demandEvidence: null,
    outcome: 'PENDING_DEMAND_VERIFICATION',
    outcomeReason: null,
    createdAt: new Date().toISOString()
  };

  if (options.skipVidiqApi) {
    hypothesisRecord.verificationStatus = 'VERIFIED_RELEVANT_DEMAND';
    hypothesisRecord.demandEvidence = {
      evidenceId: `evi_${Date.now()}`,
      provider: 'vidiq_mcp_mock',
      queryPhrase: primarySearchPhrase,
      searchVolume: 12500,
      competitionScore: 32,
      opportunityScore: 78,
      geography: 'US',
      observationDate: new Date().toISOString(),
      supportingLinks: [
        { title: 'Google Trends Search', url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(primarySearchPhrase)}` }
      ]
    };
    return hypothesisRecord;
  }

  // 3. Independent Search Demand Verification via vidIQ
  try {
    const demand = await vidiqClient.researchQuery(primarySearchPhrase);
    const searchVolume = demand.searchVolume || 0;
    const oppScore = demand.opportunityScore || 0;
    const compScore = demand.competitionScore || 50;

    let verificationStatus = 'MEASURED_LOW_DEMAND';
    if (searchVolume >= 1000 && oppScore >= 45) {
      verificationStatus = 'VERIFIED_RELEVANT_DEMAND';
    } else if (searchVolume === 0 && oppScore === 0) {
      verificationStatus = 'MEASURED_LOW_DEMAND';
    }

    hypothesisRecord.verificationStatus = verificationStatus;
    hypothesisRecord.demandEvidence = {
      evidenceId: `evi_${Date.now()}`,
      provider: 'vidiq_mcp',
      queryPhrase: primarySearchPhrase,
      searchVolume,
      competitionScore: compScore,
      opportunityScore: oppScore,
      volumeDisplay: demand.volumeDisplay || (searchVolume > 0 ? searchVolume.toLocaleString() : '<750'),
      geography: 'US',
      observationDate: new Date().toISOString(),
      supportingLinks: [
        { title: 'Google Trends Search', url: `https://trends.google.com/trends/explore?q=${encodeURIComponent(primarySearchPhrase)}` }
      ]
    };
  } catch (err) {
    hypothesisRecord.verificationStatus = 'PROVIDER_UNAVAILABLE';
    hypothesisRecord.demandEvidence = {
      evidenceId: `evi_${Date.now()}`,
      provider: 'vidiq_mcp',
      queryPhrase: primarySearchPhrase,
      searchVolume: null,
      competitionScore: null,
      opportunityScore: null,
      error: err.message,
      geography: 'US',
      observationDate: new Date().toISOString()
    };
  }

  return hypothesisRecord;
}

module.exports = {
  analyzeBuyerIntent,
  COMMERCIAL_TAXONOMY
};
