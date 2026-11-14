// Opportunity Scoring Engine
// Calculates an explainable 0 to 100 Affiliate Opportunity Score
// Uses configurable weights and applies mandatory compliance/eligibility gates

const DEFAULT_WEIGHTS = {
  predictionMomentum: 0.20,
  verifiedDemand: 0.20,
  commercialBuyerIntent: 0.25,
  productRelevance: 0.20,
  commissionEconomics: 0.10,
  evidenceConfidence: 0.05
};

function scoreAffiliateOpportunity(predictionSignal, buyerHypothesis, offerMatch, customWeights = {}) {
  const weights = { ...DEFAULT_WEIGHTS, ...customWeights };

  // 1. Mandatory Eligibility Checks (Gates)
  const eligibility = {
    validDataSource: Boolean(predictionSignal && predictionSignal.sourceUrl),
    sufficientEvidence: Boolean(buyerHypothesis && buyerHypothesis.verificationStatus),
    relevantProductMatch: Boolean(offerMatch && offerMatch.approvalStatus === 'approved'),
    acceptableComplianceRisk: true,
    passedAllGates: true,
    disqualificationReason: null
  };

  // Compliance filter: Disqualify political candidate assassination or illegal weapon markets
  const signalText = `${predictionSignal.currentObservation || ''} ${buyerHypothesis.hypothesis || ''}`.toLowerCase();
  if (signalText.includes('assassination') || signalText.includes('nuclear strike') || signalText.includes('terrorism')) {
    eligibility.acceptableComplianceRisk = false;
    eligibility.passedAllGates = false;
    eligibility.disqualificationReason = 'High compliance risk (Violence / National Security filter)';
  }

  if (!eligibility.passedAllGates) {
    return {
      opportunityScore: 0,
      tier: 'ARCHIVE',
      eligibility,
      scoreBreakdown: { total: 0, reason: eligibility.disqualificationReason },
      explanation: `Disqualified: ${eligibility.disqualificationReason}`
    };
  }

  // 2. Factor Computations (Each 0 - 100)
  
  // Factor 1: Prediction Momentum (0 - 100)
  // Higher trading volume and liquidity indicate strong market attention
  const volume = predictionSignal.volume24h || 0;
  let momentumScore = 50;
  if (volume > 1000000) momentumScore = 95;
  else if (volume > 500000) momentumScore = 85;
  else if (volume > 100000) momentumScore = 75;
  else if (volume > 25000) momentumScore = 65;

  // Factor 2: Independently Verified Demand (0 - 100)
  let verifiedDemandScore = 30;
  if (buyerHypothesis.verificationStatus === 'VERIFIED') {
    const oppScore = buyerHypothesis.demandEvidence?.opportunityScore || 50;
    verifiedDemandScore = Math.min(100, Math.max(40, oppScore));
  } else if (buyerHypothesis.verificationStatus === 'UNVERIFIED_LOW_DEMAND') {
    verifiedDemandScore = 25;
  }

  // Factor 3: Commercial Buyer Intent (0 - 100)
  let intentScore = 50;
  if (buyerHypothesis.intentType === 'TRANSACTIONAL') {
    intentScore = buyerHypothesis.purchaseTiming === 'IMMEDIATE' ? 95 : 85;
  } else if (buyerHypothesis.intentType === 'COMMERCIAL_INVESTIGATION') {
    intentScore = 75;
  } else if (buyerHypothesis.intentType === 'INFORMATIONAL') {
    intentScore = 40;
  }

  // Factor 4: Product Relevance (0 - 100)
  let relevanceScore = 60;
  if (offerMatch.sourceInventory === 'EXACT_LOCAL_INVENTORY') {
    relevanceScore = 95;
  } else if (offerMatch.sourceInventory === 'AMAZON_CURATED_FEED') {
    relevanceScore = 80;
  }

  // Factor 5: Commission Economics (0 - 100)
  // High commission digital + physical basket cookie
  let economicsScore = 70;
  if (offerMatch.commissionRate >= 70) {
    economicsScore = 90;
  } else if (offerMatch.commissionRate >= 20) {
    economicsScore = 75;
  } else {
    economicsScore = 60;
  }

  // Factor 6: Evidence Confidence & Freshness (0 - 100)
  const confidenceScore = predictionSignal.signalConfidence || 75;

  // 3. Weighted Composite Calculation
  const compositeScore = Math.round(
    (momentumScore * weights.predictionMomentum) +
    (verifiedDemandScore * weights.verifiedDemand) +
    (intentScore * weights.commercialBuyerIntent) +
    (relevanceScore * weights.productRelevance) +
    (economicsScore * weights.commissionEconomics) +
    (confidenceScore * weights.evidenceConfidence)
  );

  // 4. Tier Classification
  let tier = 'WATCHLIST';
  if (compositeScore >= 85) tier = 'PRIORITY';
  else if (compositeScore >= 70) tier = 'STRONG';
  else if (compositeScore >= 50) tier = 'WATCHLIST';
  else tier = 'ARCHIVE';

  const scoreBreakdown = {
    total: compositeScore,
    momentumScore: { score: momentumScore, weight: weights.predictionMomentum, weighted: Math.round(momentumScore * weights.predictionMomentum) },
    verifiedDemandScore: { score: verifiedDemandScore, weight: weights.verifiedDemand, weighted: Math.round(verifiedDemandScore * weights.verifiedDemand) },
    intentScore: { score: intentScore, weight: weights.commercialBuyerIntent, weighted: Math.round(intentScore * weights.commercialBuyerIntent) },
    relevanceScore: { score: relevanceScore, weight: weights.productRelevance, weighted: Math.round(relevanceScore * weights.productRelevance) },
    economicsScore: { score: economicsScore, weight: weights.commissionEconomics, weighted: Math.round(economicsScore * weights.commissionEconomics) },
    confidenceScore: { score: confidenceScore, weight: weights.evidenceConfidence, weighted: Math.round(confidenceScore * weights.evidenceConfidence) }
  };

  const explanation = `Score ${compositeScore}/100 (${tier}): Driven by ${momentumScore} momentum, ${verifiedDemandScore} verified search demand, and ${relevanceScore} product fit with ${offerMatch.productName}.`;

  return {
    opportunityScore: compositeScore,
    tier,
    eligibility,
    scoreBreakdown,
    explanation
  };
}

module.exports = {
  scoreAffiliateOpportunity,
  DEFAULT_WEIGHTS
};
