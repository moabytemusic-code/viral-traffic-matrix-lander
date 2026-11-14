// Affiliate Offer Matching Engine
// FIRST PRIORITY: Search verified existing affiliate inventory (offers.json)
// SECOND PRIORITY: Identify specific category candidate or return NO_SUITABLE_AFFILIATE_OFFER
// Enforces zero hallucination: Unrelated events must never be forced into an inventory product.

const fs = require('fs');
const path = require('path');

const OFFERS_PATH = path.join(__dirname, 'offers.json');

const CATEGORY_CANDIDATE_MAP = {
  'Energy, Blackouts & Emergency Prep': ['home-power', 'winter-freeze', 'offgrid-water', 'food-preservation'],
  'Finance, Capital & Wealth': ['prop-trading', 'perpetual-clicks', 'viral-traffic-matrix'],
  'Health, Sleep & Wellness': ['yu-sleep', 'chronic-insomnia', 'tinnitus-relief', 'joint-mobility', 'prostate-wakeups', 'gut-distension', 'liver-reset'],
  'Technology & Productivity': ['viral-traffic-matrix', 'perpetual-clicks', 'ai-vault']
};

const OFFER_PROBLEM_TRIGGERS = {
  'prop-trading': ['fed', 'rates', 'interest rates', 'inflation', 'trading', 'crypto', 'bitcoin', 'futures', 'forex', 'capital', 'portfolio', 'hedge', 'yield', 'macro'],
  'perpetual-clicks': ['traffic', 'clicks', 'affiliate', 'online income', 'automated income', 'leads', 'passive income', 'side hustle'],
  'viral-traffic-matrix': ['giveaway', 'funnel', 'lead generation', 'list building', 'viral traffic', 'marketing automation'],
  'home-power': ['power', 'blackout', 'grid', 'battery', 'solar', 'generator', 'electricity', 'energy', 'outage', 'storm', 'deep freeze'],
  'winter-freeze': ['freeze', 'winter', 'pipes', 'burst', 'cold', 'heating', 'blizzard', 'snow'],
  'offgrid-water': ['water', 'filtration', 'well', 'drinking water', 'contamination', 'water crisis'],
  'food-preservation': ['food', 'mylar', 'food shortage', 'spoilage', 'emergency food', 'pantry'],
  'yu-sleep': ['sleep', 'insomnia', 'cortisol', '3am', 'waking up', 'wakefulness', 'circadian', 'nighttime', 'rest'],
  'chronic-insomnia': ['sleep', 'insomnia', 'fatigue', 'wakefulness', 'bedtime', 'restless'],
  'dog-anxiety': ['dog', 'barking', 'separation anxiety', 'pet', 'canine', 'puppy'],
  'tinnitus-relief': ['tinnitus', 'ears ringing', 'ringing in ears', 'auditory', 'hearing'],
  'joint-mobility': ['joint', 'knee', 'hip', 'mobility', 'arthritis', 'stiffness', 'inflammation'],
  'prostate-wakeups': ['prostate', 'urination', 'frequent urination', 'bladder', 'men health'],
  'gut-distension': ['gut', 'bloating', 'sibo', 'digestion', 'stomach'],
  'liver-reset': ['liver', 'fatty liver', 'detox', 'metabolism'],
  'eye-fatigue': ['eye', 'screen strain', 'headaches', 'blue light', 'vision'],
  'ai-vault': ['ai tools', 'ai automation', 'prompts', 'workflow automation', 'productivity vault']
};

const MERCHANT_SPECIFIC_TERMS = {
  'home-power': {
    merchant: 'Enrev Power Systems LLC',
    network: 'ClickBank / Amazon Dual Bridge',
    commissionStructure: '75% Digital One-Time / 4% Amazon Cart Cookie',
    commissionRate: 75.0,
    cookieDuration: '60 Days (ClickBank) / 24 Hours (Amazon Cart)',
    productPurpose: 'DIY residential solar and battery bank backup blueprints to survive multi-day power grid failures.'
  },
  'winter-freeze': {
    merchant: 'Home Freeze Defense Labs',
    network: 'ClickBank / Amazon Dual Bridge',
    commissionStructure: '75% Digital One-Time / 4% Amazon Cart Cookie',
    commissionRate: 75.0,
    cookieDuration: '60 Days (ClickBank) / 24 Hours (Amazon Cart)',
    productPurpose: 'Low-cost thermal insulation, pipe burst prevention, and indoor cold-weather survival protocol.'
  },
  'offgrid-water': {
    merchant: 'PureWater Field Systems',
    network: 'ClickBank / Amazon Dual Bridge',
    commissionStructure: '75% Digital One-Time / 4% Amazon Cart Cookie',
    commissionRate: 75.0,
    cookieDuration: '60 Days (ClickBank) / 24 Hours (Amazon Cart)',
    productPurpose: 'Off-grid gravitational water purification and home storage protocol for contaminated municipal systems.'
  },
  'prop-trading': {
    merchant: 'Funded Trader Academy Inc',
    network: 'Direct Vendor Partner',
    commissionStructure: '50% Front-End Challenge Pass Fee',
    commissionRate: 50.0,
    cookieDuration: '60 Days',
    productPurpose: 'Evaluation blueprints and risk-management strategies to secure funded accounts from $50K to $150K.'
  },
  'perpetual-clicks': {
    merchant: 'Perpetual Traffic Systems',
    network: 'ClickBank (Vendor hylcw0f)',
    commissionStructure: '50% Recurring Monthly Subscription',
    commissionRate: 50.0,
    cookieDuration: '60 Days',
    productPurpose: 'Automated organic click-routing network that drives continuous buyer traffic without paid ad spend.'
  },
  'viral-traffic-matrix': {
    merchant: 'Viral Traffic Matrix Desk',
    network: 'Direct Vendor Partner (Sponsor 144)',
    commissionStructure: '50% Front-End Digital Delivery',
    commissionRate: 50.0,
    cookieDuration: '60 Days',
    productPurpose: 'Complete viral giveaway lander and lead capture system with email automation integration.'
  },
  'yu-sleep': {
    merchant: 'Yu Sleep Laboratories',
    network: 'ClickBank (Vendor kmtwarrior)',
    commissionStructure: '75% Front-End + Lifetime Rebill Commission',
    commissionRate: 75.0,
    cookieDuration: '60 Days',
    productPurpose: 'Nano-synergy tart cherry and botanicals formula targeting 3 AM cortisol spikes and sleep architecture.'
  },
  'chronic-insomnia': {
    merchant: 'Sleep Science Research Desk',
    network: 'ClickBank (Vendor kmtwarrior)',
    commissionStructure: '75% Digital Masterclass',
    commissionRate: 75.0,
    cookieDuration: '60 Days',
    productPurpose: 'Cognitive and behavioral reset protocols for chronic wakefulness and sleep onset latency.'
  },
  'tinnitus-relief': {
    merchant: 'Auditory Cortex Wellness Labs',
    network: 'ClickBank (Vendor kmtwarrior)',
    commissionStructure: '75% Front-End + Rebill',
    commissionRate: 75.0,
    cookieDuration: '60 Days',
    productPurpose: 'Neuro-calming sensory protocol and nutrient support to dampen ringing and auditory hyper-sensitivity.'
  },
  'joint-mobility': {
    merchant: 'Joint Mobility Science Group',
    network: 'ClickBank (Vendor kmtwarrior)',
    commissionStructure: '75% Front-End + Rebill',
    commissionRate: 75.0,
    cookieDuration: '60 Days',
    productPurpose: 'Targeted morning mobility routine and anti-inflammatory collagen support for knee and hip stiffness.'
  },
  'ai-vault': {
    merchant: 'Automation Tools Collective',
    network: 'Direct Vendor Partner',
    commissionStructure: '50% Digital One-Time',
    commissionRate: 50.0,
    cookieDuration: '60 Days',
    productPurpose: 'Curated database of 1,000+ tested AI automation prompts, workflows, and no-code connectors.'
  }
};

function matchAffiliateOffer(predictionEvent, buyerHypothesis, options = {}) {
  // 1. Non-Commercial or Unviable Early Exit
  if (!buyerHypothesis || buyerHypothesis.commercialViable === false || buyerHypothesis.outcome === 'NO_COMMERCIAL_OPPORTUNITY') {
    return {
      matchId: null,
      offerSlug: null,
      productName: null,
      merchant: null,
      network: null,
      affiliateUrl: null,
      destinationUrl: null,
      productPurpose: null,
      intendedAudience: null,
      commissionStructure: null,
      commissionRate: 0,
      cookieDuration: null,
      relevanceScore: 0,
      approvalStatus: 'unmatched',
      sourceInventory: 'NONE',
      outcome: 'NO_COMMERCIAL_OPPORTUNITY',
      outcomeReason: buyerHypothesis.outcomeReason || 'Event has no commercial consumer purchasing demand.',
      createdAt: new Date().toISOString()
    };
  }

  // 2. Load Local Verified Inventory
  let existingOffers = {};
  try {
    existingOffers = JSON.parse(fs.readFileSync(OFFERS_PATH, 'utf8') || '{}');
  } catch (_) {}

  const category = predictionEvent.category || 'General News & Macro Indicators';
  const candidateKeys = CATEGORY_CANDIDATE_MAP[category] || [];

  if (candidateKeys.length === 0) {
    return {
      matchId: null,
      offerSlug: null,
      productName: null,
      merchant: null,
      network: null,
      affiliateUrl: null,
      destinationUrl: null,
      productPurpose: null,
      intendedAudience: null,
      commissionStructure: null,
      commissionRate: 0,
      cookieDuration: null,
      relevanceScore: 0,
      approvalStatus: 'unmatched',
      sourceInventory: 'NONE',
      outcome: 'NO_SUITABLE_AFFILIATE_OFFER',
      outcomeReason: `No inventory offers configured for category "${category}".`,
      createdAt: new Date().toISOString()
    };
  }

  // 3. Semantic Relevance Scoring
  const combinedContext = `${predictionEvent.title} ${buyerHypothesis.coreProblem || ''} ${buyerHypothesis.primarySearchPhrase || ''}`.toLowerCase();
  
  let bestMatch = null;
  let bestRelevanceScore = 0;

  for (const slug of candidateKeys) {
    const offer = existingOffers[slug];
    if (!offer) continue;

    let score = 20; // Baseline candidate category fit

    // Check slug keywords
    const slugWords = slug.split('-');
    if (slugWords.some(w => combinedContext.includes(w))) {
      score += 25;
    }

    // Check problem triggers
    const triggers = OFFER_PROBLEM_TRIGGERS[slug] || [];
    const matchedTriggers = triggers.filter(t => combinedContext.includes(t));
    if (matchedTriggers.length >= 2) {
      score += 50;
    } else if (matchedTriggers.length === 1) {
      score += 30;
    }

    // Check offer headline / purpose words
    const headline = (offer.subheadline || offer.eyebrow || offer.name || '').toLowerCase();
    const contextWords = combinedContext.split(/\s+/).filter(w => w.length > 4);
    const matchingWords = contextWords.filter(w => headline.includes(w));
    if (matchingWords.length > 0) {
      score += Math.min(20, matchingWords.length * 8);
    }

    if (score > bestRelevanceScore) {
      bestRelevanceScore = score;
      bestMatch = { slug, offer };
    }
  }

  // 4. Strict Relevance Gate
  if (!bestMatch || bestRelevanceScore < 60) {
    return {
      matchId: null,
      offerSlug: null,
      productName: null,
      merchant: null,
      network: null,
      affiliateUrl: null,
      destinationUrl: null,
      productPurpose: null,
      intendedAudience: null,
      commissionStructure: null,
      commissionRate: 0,
      cookieDuration: null,
      relevanceScore: bestRelevanceScore,
      approvalStatus: 'unmatched',
      sourceInventory: 'NONE',
      outcome: 'NO_SUITABLE_AFFILIATE_OFFER',
      outcomeReason: `Best inventory candidate scored ${bestRelevanceScore}/100, which is below the mandatory 60-point relevance threshold. Match rejected.`,
      createdAt: new Date().toISOString()
    };
  }

  // 5. Build Offer-Specific Record
  const { slug, offer } = bestMatch;
  const terms = MERCHANT_SPECIFIC_TERMS[slug] || {
    merchant: 'Verified Partner',
    network: 'ClickBank',
    commissionStructure: '50% Digital Standard',
    commissionRate: 50.0,
    cookieDuration: '60 Days',
    productPurpose: offer.subheadline || 'Targeted solution for consumers.'
  };

  const eventId = predictionEvent.externalId || 'gen';
  const trackingId = `poly_${eventId}`;
  const trackingUrl = `https://traffic.aisimplesystem.com/o/${slug}?tid=${trackingId}`;

  return {
    matchId: `mat_${slug}_${Date.now()}`,
    hypothesisId: buyerHypothesis.hypothesisId,
    offerSlug: slug,
    productName: offer.name || slug,
    merchant: terms.merchant,
    network: terms.network,
    affiliateUrl: trackingUrl,
    destinationUrl: `https://traffic.aisimplesystem.com/o/${slug}`,
    productPurpose: terms.productPurpose,
    intendedAudience: buyerHypothesis.affectedConsumerGroup || 'Target Consumer Group',
    commissionStructure: terms.commissionStructure,
    commissionRate: terms.commissionRate,
    cookieDuration: terms.cookieDuration,
    relevanceScore: Math.min(100, bestRelevanceScore),
    approvalStatus: 'approved',
    sourceInventory: 'EXACT_LOCAL_INVENTORY',
    outcome: 'RELEVANT_OFFER_MATCHED',
    outcomeReason: `Direct logical match to ${offer.name} (${bestRelevanceScore}/100 fit).`,
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  matchAffiliateOffer,
  CATEGORY_CANDIDATE_MAP,
  MERCHANT_SPECIFIC_TERMS
};
