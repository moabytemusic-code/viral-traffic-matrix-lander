// AI Buyer Intent Analyzer
// Answers the core question: "What might people want to buy because of this event?"
// Validates hypotheses against independent demand indicators (vidIQ MCP & Search)

const vidiqClient = require('./vidiq-client');

// Intent classification rules by category
const INTENT_RULES = {
  'Energy & Resilience': {
    consumerGroup: 'Homeowners & Rural Residents',
    coreProblem: 'Power grid instability, storm blackouts, and home heating/pipe freeze emergency.',
    timing: 'SEASONAL',
    intentType: 'TRANSACTIONAL',
    defaultPhrases: ['portable power station refrigerator', 'prevent frozen pipes power outage', 'home backup battery blackout']
  },
  'Finance & Wealth': {
    consumerGroup: 'Retail Investors & Working Professionals',
    coreProblem: 'Inflation erosion, changing interest rates, and fear of portfolio drawdowns.',
    timing: 'IMMEDIATE',
    intentType: 'COMMERCIAL_INVESTIGATION',
    defaultPhrases: ['best hedge against inflation', 'how to pass prop firm evaluation', 'high yield cash preservation']
  },
  'Technology & AI': {
    consumerGroup: 'Content Creators, Freelancers & Knowledge Workers',
    coreProblem: 'Job automation anxiety and need for high-productivity automated workflows.',
    timing: 'UPCOMING',
    intentType: 'COMMERCIAL_INVESTIGATION',
    defaultPhrases: ['best ai tools for workflow automation', 'faceless channel youtube automation', 'ai productivity vault']
  },
  'Health & Lifestyle': {
    consumerGroup: 'Adults 35+ & Health-Conscious Consumers',
    coreProblem: 'Chronic fatigue, sleep disruption, and preventative physical wellness.',
    timing: 'IMMEDIATE',
    intentType: 'TRANSACTIONAL',
    defaultPhrases: ['waking up at 3am cortisol sleep', 'how to stop ringing in ears', 'natural acid reflux relief']
  },
  'Macro & Economy': {
    consumerGroup: 'Middle-Class Households & Small Business Owners',
    coreProblem: 'Household budget compression and search for resilient secondary income.',
    timing: 'UPCOMING',
    intentType: 'COMMERCIAL_INVESTIGATION',
    defaultPhrases: ['recession proof side hustle', 'emergency food preservation storage', 'low cost home energy savings']
  },
  'Governance & Society': {
    consumerGroup: 'Civic-Minded Citizens & Preppers',
    coreProblem: 'Policy uncertainty, supply chain friction, and personal self-reliance.',
    timing: 'SPECULATIVE',
    intentType: 'INFORMATIONAL',
    defaultPhrases: ['emergency water filtration home', 'long term survival pantry essentials', 'off grid communication radio']
  }
};

async function analyzeBuyerIntent(predictionEvent, options = {}) {
  const category = predictionEvent.category || 'Macro & Economy';
  const rules = INTENT_RULES[category] || INTENT_RULES['Macro & Economy'];
  const title = predictionEvent.title;
  
  // Formulate specific hypothesis
  const hypothesisText = `Consumers observing "${title}" will seek practical self-reliance, hedging tools, or physical safeguards to mitigate uncertainty.`;
  
  // Custom phrase extraction based on title words
  const searchPhrases = [...rules.defaultPhrases];
  const titleWords = title.toLowerCase().split(/\s+/).filter(w => w.length > 4);
  if (titleWords.length > 0) {
    searchPhrases.unshift(`how to prepare for ${titleWords[0]} impact`);
  }

  const hypothesisRecord = {
    hypothesisId: `hyp_${predictionEvent.externalId}_${Date.now()}`,
    signalId: predictionEvent.signal?.signalId || `sig_${predictionEvent.externalId}`,
    affectedConsumerGroup: rules.consumerGroup,
    coreProblem: rules.coreProblem,
    hypothesis: hypothesisText,
    searchPhrases: searchPhrases.slice(0, 4),
    purchaseTiming: rules.timing,
    intentType: rules.intentType,
    verificationStatus: 'UNVERIFIED',
    demandEvidence: null,
    createdAt: new Date().toISOString()
  };

  // Perform independent verification if enabled
  if (options.skipVerification) {
    return hypothesisRecord;
  }

  const primarySearchPhrase = searchPhrases[1] || searchPhrases[0];
  try {
    const research = await vidiqClient.researchKeyword(primarySearchPhrase);
    const score = typeof research.seed?.overallScore === 'number' ? research.seed.overallScore : 0;
    const volumeEstimate = research.seed?.monthlySearches || '<750';
    const numericVolume = typeof research.seed?.volume === 'number' ? research.seed.volume : 0;
    const competition = typeof research.seed?.competition === 'number' ? research.seed.competition : 50;

    hypothesisRecord.demandEvidence = {
      evidenceId: `evi_${Date.now()}`,
      source: 'vidiq_mcp',
      queryPhrase: primarySearchPhrase,
      searchVolume: numericVolume,
      competitionScore: competition,
      opportunityScore: score,
      volumeDisplay: volumeEstimate,
      verifiedAt: new Date().toISOString()
    };

    if (score >= 40 || numericVolume >= 40) {
      hypothesisRecord.verificationStatus = 'VERIFIED';
    } else {
      hypothesisRecord.verificationStatus = 'UNVERIFIED_LOW_DEMAND';
    }
  } catch (err) {
    hypothesisRecord.verificationStatus = 'UNVERIFIED';
    hypothesisRecord.demandEvidence = {
      evidenceId: `evi_${Date.now()}`,
      source: 'vidiq_mcp_fallback',
      queryPhrase: primarySearchPhrase,
      searchVolume: 0,
      competitionScore: 50,
      opportunityScore: 0,
      error: err.message,
      verifiedAt: new Date().toISOString()
    };
  }

  return hypothesisRecord;
}

module.exports = {
  analyzeBuyerIntent,
  INTENT_RULES
};
