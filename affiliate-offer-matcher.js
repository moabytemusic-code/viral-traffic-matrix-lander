// Affiliate Offer Matching Engine
// FIRST PRIORITY: Search existing affiliate offer inventory (offers.json)
// SECOND PRIORITY: Map to verified Amazon/Walmart/ClickBank partner programs

const fs = require('fs');
const path = require('path');

const OFFERS_PATH = path.join(__dirname, 'offers.json');

// Category to existing offer mapping
const CATEGORY_OFFER_MAP = {
  'Energy & Resilience': ['home-power', 'winter-freeze', 'offgrid-water'],
  'Finance & Wealth': ['prop-trading', 'viral-traffic-matrix', 'perpetual-clicks'],
  'Technology & AI': ['ai-vault', 'viral-traffic-matrix'],
  'Health & Lifestyle': ['chronic-insomnia', 'yu-sleep', 'tinnitus-relief', 'joint-mobility', 'gut-distension', 'prostate-wakeups', 'liver-reset'],
  'Macro & Economy': ['food-preservation', 'offgrid-water', 'home-power'],
  'Governance & Society': ['offgrid-water', 'food-preservation', 'winter-freeze']
};

function matchAffiliateOffer(predictionEvent, buyerHypothesis, options = {}) {
  let existingOffers = {};
  try {
    existingOffers = JSON.parse(fs.readFileSync(OFFERS_PATH, 'utf8') || '{}');
  } catch (_) {}

  const category = predictionEvent.category || 'Macro & Economy';
  const candidateKeys = CATEGORY_OFFER_MAP[category] || ['home-power', 'chronic-insomnia'];
  
  // Find best match in candidate keys
  let matchedKey = candidateKeys[0];
  const combinedText = `${predictionEvent.title} ${buyerHypothesis.hypothesis || ''}`.toLowerCase();
  
  for (const key of candidateKeys) {
    const keyWords = key.replace(/-/g, ' ').split(' ');
    if (keyWords.some(w => combinedText.includes(w))) {
      matchedKey = key;
      break;
    }
  }

  const existingOffer = existingOffers[matchedKey];
  
  if (existingOffer) {
    // Generate verified affiliate URLs
    const affiliateUrl = existingOffer.affiliateUrl || `https://traffic.aisimplesystem.com/o/${matchedKey}`;
    const cbVendor = existingOffer.clickbankVendor || 'kmtwarrior';
    const clickbankHoplink = `https://hop.clickbank.net/?affiliate=kmtwarrior&vendor=${cbVendor}&tid=poly_${predictionEvent.externalId}`;
    const amazonSearchUrl = `https://www.amazon.com/s?k=${encodeURIComponent(matchedKey.replace(/-/g, ' '))}&tag=santa101-20`;

    return {
      matchId: `mat_${matchedKey}_${Date.now()}`,
      hypothesisId: buyerHypothesis.hypothesisId,
      offerSlug: matchedKey,
      productName: existingOffer.name || matchedKey,
      merchant: existingOffer.sponsorCode ? 'Direct Vendor Partner' : 'ClickBank / Amazon Dual Bridge',
      network: 'Multi-Network (Amazon santa101-20 + ClickBank kmtwarrior)',
      affiliateUrl: clickbankHoplink,
      secondaryUrl: amazonSearchUrl,
      commissionStructure: '75% Digital / 3% - 4% Physical + 24-hr Cart Cookie',
      commissionRate: 75.0,
      cookieDuration: '60 Days (ClickBank) / 24 Hours (Amazon Universal Cart)',
      targetAudience: buyerHypothesis.affectedConsumerGroup || 'General Consumer',
      approvalStatus: 'approved',
      sourceInventory: 'EXACT_LOCAL_INVENTORY',
      createdAt: new Date().toISOString()
    };
  }

  // Fallback to verified Amazon hardware hub
  const fallbackQuery = buyerHypothesis.searchPhrases?.[0] || 'emergency home preparedness';
  return {
    matchId: `mat_amazon_fallback_${Date.now()}`,
    hypothesisId: buyerHypothesis.hypothesisId,
    offerSlug: 'amazon-hardware-direct',
    productName: `Essential Gear: ${fallbackQuery}`,
    merchant: 'Amazon Services LLC',
    network: 'Amazon Associates',
    affiliateUrl: `https://www.amazon.com/s?k=${encodeURIComponent(fallbackQuery)}&tag=santa101-20`,
    secondaryUrl: null,
    commissionStructure: '3% - 8% Category Commission + 24-Hour Universal Cart Cookie',
    commissionRate: 4.0,
    cookieDuration: '24 Hours',
    targetAudience: buyerHypothesis.affectedConsumerGroup || 'General Consumer',
    approvalStatus: 'approved',
    sourceInventory: 'AMAZON_CURATED_FEED',
    createdAt: new Date().toISOString()
  };
}

module.exports = {
  matchAffiliateOffer,
  CATEGORY_OFFER_MAP
};
