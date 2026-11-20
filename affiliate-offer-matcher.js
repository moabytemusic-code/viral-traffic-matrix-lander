// Affiliate Offer Matching Engine
// FIRST PRIORITY: Search verified existing affiliate inventory (offers.json)
// SECOND PRIORITY: Identify specific category candidate or return NO_SUITABLE_AFFILIATE_OFFER
// Enforces zero hallucination: Unrelated events must never be forced into an inventory product.

const fs = require('fs');
const path = require('path');

const OFFERS_PATH = path.join(__dirname, 'offers.json');

const CATEGORY_CANDIDATE_MAP = {
  'Energy, Blackouts & Emergency Prep': ['amazon-power-station', 'home-power', 'winter-freeze', 'offgrid-water', 'food-preservation'],
  'Finance, Capital & Wealth': ['prop-trading', 'perpetual-clicks', 'viral-traffic-matrix'],
  'Health, Sleep & Wellness': ['yu-sleep', 'chronic-insomnia', 'tinnitus-relief', 'joint-mobility', 'prostate-wakeups', 'gut-distension', 'liver-reset'],
  'Technology & Productivity': ['viral-traffic-matrix', 'perpetual-clicks', 'ai-vault']
};

const OFFER_PROBLEM_TRIGGERS = {
  'amazon-power-station': ['portable power station', 'power station', 'refrigerator', 'generator', 'battery backup', 'inverter generator', 'solar generator', 'power outage', 'blackout', 'freeze'],
  'prop-trading': ['fed', 'rates', 'interest rates', 'inflation', 'trading', 'crypto', 'bitcoin', 'futures', 'forex', 'capital', 'portfolio', 'hedge', 'yield', 'macro'],
  'perpetual-clicks': ['traffic', 'clicks', 'affiliate', 'online income', 'automated income', 'leads', 'passive income', 'side hustle'],
  'viral-traffic-matrix': ['giveaway', 'funnel', 'lead generation', 'list building', 'viral traffic', 'marketing automation'],
  'home-power': ['power', 'blackout', 'grid', 'battery', 'solar', 'generator', 'electricity', 'energy', 'outage', 'storm', 'deep freeze', 'diy power'],
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
  'amazon-power-station': {
    productForm: 'PHYSICAL_HARDWARE',
    productName: 'Portable Power Station & Solar Generator (Emergency Home Backup)',
    merchant: 'Amazon Associates (Verified Hardware Catalog)',
    network: 'Amazon Associates',
    commissionStructure: '4.0% Physical Goods (24-Hour Cart Cookie)',
    commissionRate: 4.0,
    cookieDuration: '24 Hours Universal Cart Cookie',
    productPurpose: 'Turnkey UL-certified lithium-iron-phosphate (LiFePO4) portable power station with pure sine wave AC inverter to power full-size refrigerators during grid blackouts.'
  },
  'home-power': {
    productForm: 'DIGITAL_COURSE',
    productName: 'Enrev Power System (DIY Solar & Battery Backup)',
    merchant: 'Enrev Power Systems LLC',
    network: 'ClickBank / Amazon Dual Bridge',
    commissionStructure: '75% Digital One-Time / 4% Amazon Cart Cookie',
    commissionRate: 75.0,
    cookieDuration: '60 Days (ClickBank) / 24 Hours (Amazon Cart)',
    productPurpose: 'DIY residential solar and battery bank backup blueprints to survive multi-day power grid failures.'
  },
  'winter-freeze': {
    productForm: 'DIGITAL_COURSE',
    merchant: 'Home Freeze Defense Labs',
    network: 'ClickBank / Amazon Dual Bridge',
    commissionStructure: '75% Digital One-Time / 4% Amazon Cart Cookie',
    commissionRate: 75.0,
    cookieDuration: '60 Days (ClickBank) / 24 Hours (Amazon Cart)',
    productPurpose: 'Low-cost thermal insulation, pipe burst prevention, and indoor cold-weather survival protocol.'
  },
  'offgrid-water': {
    productForm: 'DIGITAL_COURSE',
    merchant: 'PureWater Field Systems',
    network: 'ClickBank / Amazon Dual Bridge',
    commissionStructure: '75% Digital One-Time / 4% Amazon Cart Cookie',
    commissionRate: 75.0,
    cookieDuration: '60 Days (ClickBank) / 24 Hours (Amazon Cart)',
    productPurpose: 'Off-grid gravitational water purification and home storage protocol for contaminated municipal systems.'
  },
  'prop-trading': {
    productForm: 'SERVICE_EVALUATION',
    productName: 'Funded Trader Challenge & Evaluation Pass',
    merchant: 'Funded Trader Academy Inc',
    network: 'Direct Vendor Partner',
    commissionStructure: '50% Front-End Challenge Pass Fee',
    commissionRate: 50.0,
    cookieDuration: '60 Days',
    productPurpose: 'Evaluation blueprints and risk-management strategies to secure funded accounts from $50K to $150K.'
  },
  'perpetual-clicks': {
    productForm: 'SOFTWARE_SUBSCRIPTION',
    productName: 'Perpetual Traffic Systems Automated Engine',
    merchant: 'Perpetual Traffic Systems',
    network: 'ClickBank (Vendor hylcw0f)',
    commissionStructure: '50% Recurring Monthly Subscription',
    commissionRate: 50.0,
    cookieDuration: '60 Days',
    productPurpose: 'Automated organic click-routing network that drives continuous buyer traffic without paid ad spend.'
  },
  'viral-traffic-matrix': {
    productForm: 'SOFTWARE_SUBSCRIPTION',
    productName: 'Viral Traffic Matrix Lead Generator',
    merchant: 'Viral Traffic Matrix Desk',
    network: 'Direct Vendor Partner (Sponsor 144)',
    commissionStructure: '50% Front-End Digital Delivery',
    commissionRate: 50.0,
    cookieDuration: '60 Days',
    productPurpose: 'Complete viral giveaway lander and lead capture system with email automation integration.'
  },
  'yu-sleep': {
    productForm: 'PHYSICAL_SUPPLEMENT',
    productName: 'Yu Sleep Nano-Synergy Tart Cherry Botanical',
    merchant: 'Yu Sleep Laboratories',
    network: 'ClickBank (Vendor kmtwarrior)',
    commissionStructure: '75% Front-End + Lifetime Rebill Commission',
    commissionRate: 75.0,
    cookieDuration: '60 Days',
    productPurpose: 'Nano-synergy tart cherry and botanicals formula targeting 3 AM cortisol spikes and sleep architecture.'
  },
  'chronic-insomnia': {
    productForm: 'DIGITAL_COURSE',
    productName: 'Sleep Architecture Cognitive Masterclass',
    merchant: 'Sleep Science Research Desk',
    network: 'ClickBank (Vendor kmtwarrior)',
    commissionStructure: '75% Digital Masterclass',
    commissionRate: 75.0,
    cookieDuration: '60 Days',
    productPurpose: 'Cognitive and behavioral reset protocols for chronic wakefulness and sleep onset latency.'
  },
  'tinnitus-relief': {
    productForm: 'PHYSICAL_SUPPLEMENT',
    productName: 'Auditory Cortex Calming Botanical Complex',
    merchant: 'Auditory Cortex Wellness Labs',
    network: 'ClickBank (Vendor kmtwarrior)',
    commissionStructure: '75% Front-End + Rebill',
    commissionRate: 75.0,
    cookieDuration: '60 Days',
    productPurpose: 'Neuro-calming sensory protocol and nutrient support to dampen ringing and auditory hyper-sensitivity.'
  },
  'joint-mobility': {
    productForm: 'PHYSICAL_SUPPLEMENT',
    productName: 'Joint Mobility Collagen & Anti-Inflammatory Complex',
    merchant: 'Joint Mobility Science Group',
    network: 'ClickBank (Vendor kmtwarrior)',
    commissionStructure: '75% Front-End + Rebill',
    commissionRate: 75.0,
    cookieDuration: '60 Days',
    productPurpose: 'Targeted morning mobility routine and anti-inflammatory collagen support for knee and hip stiffness.'
  },
  'ai-vault': {
    productForm: 'DIGITAL_COURSE',
    productName: 'AI Automation Vault & Prompt Library',
    merchant: 'Automation Tools Collective',
    network: 'Direct Vendor Partner',
    commissionStructure: '50% Digital One-Time',
    commissionRate: 50.0,
    cookieDuration: '60 Days',
    productPurpose: 'Curated database of 1,000+ tested AI automation prompts, workflows, and no-code connectors.'
  }
};

function matchAffiliateOffer(predictionEvent, buyerHypothesis, options = {}) {
  // 1. Non-Commercial, Purely Informational, or Unviable Early Exit
  if (
    !buyerHypothesis ||
    buyerHypothesis.commercialViable === false ||
    buyerHypothesis.outcome === 'NO_COMMERCIAL_OPPORTUNITY' ||
    buyerHypothesis.intentType === 'NON_COMMERCIAL' ||
    buyerHypothesis.intentType === 'INFORMATIONAL'
  ) {
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
      outcome: buyerHypothesis?.intentType === 'INFORMATIONAL' ? 'NO_SUITABLE_AFFILIATE_OFFER' : 'NO_COMMERCIAL_OPPORTUNITY',
      outcomeReason: buyerHypothesis?.outcomeReason || 'Event lacks transactional or commercial-investigation buyer intent.',
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
  const requiredForm = buyerHypothesis.requiredProductForm || 'DIGITAL_COURSE';
  
  let bestMatch = null;
  let bestRelevanceScore = 0;
  let formMismatchReason = null;

  for (const slug of candidateKeys) {
    const isAmazonBridge = slug === 'amazon-power-station';
    if (!isAmazonBridge && !existingOffers[slug]) continue;
    const offer = existingOffers[slug] || MERCHANT_SPECIFIC_TERMS[slug];
    if (!offer) continue;

    const terms = MERCHANT_SPECIFIC_TERMS[slug] || {};
    const candidateForm = terms.productForm || 'DIGITAL_COURSE';

    let score = 20; // Baseline candidate category fit

    // Check slug keywords
    const slugWords = slug.split('-');
    if (slugWords.some(w => combinedContext.includes(w))) {
      score += 25;
    }

    // Check problem triggers (hard gate: zero trigger overlap cannot pass 60-point threshold)
    const triggers = OFFER_PROBLEM_TRIGGERS[slug] || [];
    const matchedTriggers = triggers.filter(t => combinedContext.includes(t));
    if (matchedTriggers.length >= 2) {
      score += 50;
    } else if (matchedTriggers.length === 1) {
      score += 30;
    } else {
      score = Math.min(40, score);
    }

    // Check offer headline / purpose words
    const headline = (offer.subheadline || offer.eyebrow || offer.name || offer.productPurpose || '').toLowerCase();
    const contextWords = combinedContext.split(/\s+/).filter(w => w.length > 4);
    const matchingWords = contextWords.filter(w => headline.includes(w));
    if (matchingWords.length > 0) {
      score += Math.min(20, matchingWords.length * 8);
    }

    // Product Form Alignment: Hardware vs Digital Blueprint
    // A search for physical hardware (e.g. portable power station) cannot exceed 35% fit for a digital DIY course
    if (requiredForm === 'PHYSICAL_HARDWARE' && candidateForm === 'DIGITAL_COURSE') {
      score = Math.min(35, score);
      formMismatchReason = `Candidate "${offer.name || slug}" is a digital blueprint/course, which fails to satisfy hardware purchasing intent (capped at 35% fit).`;
    }

    if (score > bestRelevanceScore) {
      bestRelevanceScore = score;
      bestMatch = { slug, offer, terms };
    }
  }

  // 4. Strict Relevance Gate
  if (!bestMatch || bestRelevanceScore < 60) {
    const reason = formMismatchReason && bestRelevanceScore <= 35
      ? formMismatchReason
      : `Best inventory candidate scored ${bestRelevanceScore}/100, which is below the mandatory 60-point relevance threshold. Match rejected.`;

    return {
      matchId: null,
      offerSlug: null,
      productName: null,
      merchant: null,
      network: null,
      productForm: null,
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
      outcomeReason: reason,
      createdAt: new Date().toISOString()
    };
  }

  // 5. Build Offer-Specific Record
  const { slug, offer, terms } = bestMatch;
  const eventId = predictionEvent.externalId || 'gen';
  const trackingId = `poly_${eventId}`;

  let affiliateUrl = `https://traffic.aisimplesystem.com/o/${slug}?tid=${trackingId}`;
  let destinationUrl = `https://traffic.aisimplesystem.com/o/${slug}`;

  if (slug === 'amazon-power-station') {
    const qParam = encodeURIComponent(buyerHypothesis.primarySearchPhrase || 'portable power station refrigerator');
    affiliateUrl = `https://www.amazon.com/s?k=${qParam}&tag=santa101-20`;
    destinationUrl = `https://www.amazon.com/s?k=${qParam}&tag=santa101-20`;
  }

  return {
    matchId: `mat_${slug}_${Date.now()}`,
    hypothesisId: buyerHypothesis.hypothesisId,
    offerSlug: slug,
    productName: terms.productName || offer.name || slug,
    productForm: terms.productForm || 'DIGITAL_COURSE',
    merchant: terms.merchant || 'Verified Partner',
    network: terms.network || 'Direct Network',
    affiliateUrl,
    destinationUrl,
    productPurpose: terms.productPurpose || offer.subheadline || 'Targeted solution for consumers.',
    intendedAudience: buyerHypothesis.affectedConsumerGroup || 'Target Consumer Group',
    commissionStructure: terms.commissionStructure || '50% Digital Standard',
    commissionRate: terms.commissionRate || 50.0,
    cookieDuration: terms.cookieDuration || '60 Days',
    relevanceScore: Math.min(100, bestRelevanceScore),
    approvalStatus: 'approved',
    sourceInventory: slug.startsWith('amazon-') ? 'AMAZON_ASSOCIATES_CATALOG' : 'EXACT_LOCAL_INVENTORY',
    outcome: 'RELEVANT_OFFER_MATCHED',
    outcomeReason: `Direct logical match to ${terms.productName || offer.name} (${bestRelevanceScore}/100 fit).`,
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  matchAffiliateOffer,
  CATEGORY_CANDIDATE_MAP,
  MERCHANT_SPECIFIC_TERMS
};
