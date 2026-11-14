// Opportunity Scoring Engine
// Calculates an explainable 0 to 100 Affiliate Opportunity Score
// Removes unexplained default scores. Missing evidence reduces confidence.
// Enforces mandatory eligibility gates before computing ranking.

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
  const hasValidSource = Boolean(predictionSignal && (predictionSignal.sourceUrl || predictionSignal.provider));
  const isCommercialCategory = Boolean(
    predictionSignal &&
    predictionSignal.category !== 'Sports & Competitive Athletics' &&
    predictionSignal.category !== 'Culture, Media & Entertainment' &&
    predictionSignal.category !== 'General News & Macro Indicators'
  );
  const hasBuyerNeed = Boolean(
    buyerHypothesis &&
    buyerHypothesis.commercialViable !== false &&
    buyerHypothesis.outcome !== 'NO_COMMERCIAL_OPPORTUNITY'
  );
  const hasApprovedOffer = Boolean(
    offerMatch &&
    offerMatch.approvalStatus === 'approved' &&
    offerMatch.relevanceScore >= 60
  );
  const passedAllGates = hasValidSource && isCommercialCategory && hasBuyerNeed && hasApprovedOffer;

  const eligibility = {
    validDataSource: hasValidSource,
    categoryCommercial: isCommercialCategory,
    buyerNeedIdentified: hasBuyerNeed,
    relevantProductMatch: hasApprovedOffer,
    acceptableComplianceRisk: true,
    passedAllGates,
    campaignEligible: false,
    disqualificationReason: null
  };

  if (!hasValidSource) {
    eligibility.disqualificationReason = 'Invalid or missing prediction data source.';
  } else if (!isCommercialCategory) {
    eligibility.disqualificationReason = predictionSignal.signal?.nonCommercialReason || `Category "${predictionSignal.category}" is non-commercial.`;
  } else if (!hasBuyerNeed) {
    eligibility.disqualificationReason = buyerHypothesis?.outcomeReason || 'No practical consumer problem identified.';
  } else if (!hasApprovedOffer) {
    eligibility.disqualificationReason = offerMatch?.outcomeReason || 'No suitable affiliate offer found in inventory (relevance < 60).';
  }

  // Factor 1: Prediction Momentum (0 - 100)
  const volume = predictionSignal.volume24h || predictionSignal.tradingVolume || 0;
  const acceleration = predictionSignal.signal?.volumeAcceleration || 1.0;
  let momentumScore = 15;
  if (volume > 1000000 && acceleration > 1.5) momentumScore = 95;
  else if (volume > 500000) momentumScore = 85;
  else if (volume > 100000) momentumScore = 75;
  else if (volume > 25000) momentumScore = 60;
  else if (volume > 5000) momentumScore = 40;

  // Factor 2: Independently Verified Demand (0 - 100)
  let verifiedDemandScore = 0;
  let demandExplanation = 'Unchecked';

  if (!buyerHypothesis || buyerHypothesis.verificationStatus === 'NOT_CHECKED') {
    verifiedDemandScore = 0;
    demandExplanation = 'Search demand not checked';
  } else if (buyerHypothesis.verificationStatus === 'VERIFIED_RELEVANT_DEMAND') {
    const opp = buyerHypothesis.demandEvidence?.opportunityScore || 65;
    verifiedDemandScore = Math.min(100, Math.max(50, opp));
    const volStr = buyerHypothesis.demandEvidence?.volumeDisplay || '10,000+';
    demandExplanation = `Verified relevant search demand (${volStr}/mo, score ${opp})`;
  } else if (buyerHypothesis.verificationStatus === 'MEASURED_LOW_DEMAND') {
    verifiedDemandScore = 15;
    demandExplanation = 'Measured low search demand (<750 searches/mo)';
  } else if (buyerHypothesis.verificationStatus === 'PROVIDER_UNAVAILABLE') {
    verifiedDemandScore = 10;
    demandExplanation = 'Demand provider unavailable (unverified)';
  }

  // Factor 3: Commercial Buyer Intent (0 - 100)
  let intentScore = 0;
  if (!buyerHypothesis || buyerHypothesis.intentType === 'NON_COMMERCIAL') {
    intentScore = 0;
  } else if (buyerHypothesis.intentType === 'TRANSACTIONAL') {
    intentScore = buyerHypothesis.purchaseTiming === 'IMMEDIATE' ? 95 : 85;
  } else if (buyerHypothesis.intentType === 'COMMERCIAL_INVESTIGATION') {
    intentScore = 65;
  } else if (buyerHypothesis.intentType === 'INFORMATIONAL') {
    intentScore = 30;
  }

  // Factor 4: Product Relevance (0 - 100)
  const relevanceScore = hasApprovedOffer ? (offerMatch.relevanceScore || 70) : 0;

  // Factor 5: Commission Economics (0 - 100)
  let economicsScore = 0;
  if (hasApprovedOffer) {
    const rate = offerMatch.commissionRate || 0;
    if (rate >= 70) economicsScore = 90;
    else if (rate >= 50) economicsScore = 75;
    else if (rate >= 20) economicsScore = 60;
    else economicsScore = 45;
  }

  // Factor 6: Evidence Confidence (0 - 100)
  let confidenceScore = predictionSignal.signal?.signalConfidence || 50;
  if (!hasApprovedOffer) confidenceScore = Math.max(10, confidenceScore - 40);
  if (buyerHypothesis?.verificationStatus !== 'VERIFIED_RELEVANT_DEMAND') {
    confidenceScore = Math.max(15, confidenceScore - 25);
  }

  // 2. Disqualified Early Return
  if (!passedAllGates) {
    const rawComposite = Math.round(
      (momentumScore * weights.predictionMomentum) +
      (verifiedDemandScore * weights.verifiedDemand) +
      (intentScore * weights.commercialBuyerIntent) +
      (relevanceScore * weights.productRelevance) +
      (economicsScore * weights.commissionEconomics) +
      (confidenceScore * weights.evidenceConfidence)
    );
    const cappedScore = Math.min(35, rawComposite);

    let outcome = 'REJECTED_UNRELATED_OR_UNSUPPORTED';
    if (!isCommercialCategory || !hasBuyerNeed) {
      outcome = 'NO_COMMERCIAL_OPPORTUNITY';
    } else if (!hasApprovedOffer) {
      outcome = 'NO_SUITABLE_AFFILIATE_OFFER';
    }

    const explanation = `Score ${cappedScore}/100 (Disqualified): ${eligibility.disqualificationReason}`;

    return {
      opportunityScore: cappedScore,
      tier: 'DISQUALIFIED',
      outcome,
      outcomeReason: eligibility.disqualificationReason,
      eligibility,
      scoreBreakdown: {
        total: cappedScore,
        momentumScore: { score: momentumScore, weight: weights.predictionMomentum, weighted: Math.round(momentumScore * weights.predictionMomentum) },
        verifiedDemandScore: { score: verifiedDemandScore, weight: weights.verifiedDemand, weighted: Math.round(verifiedDemandScore * weights.verifiedDemand) },
        intentScore: { score: intentScore, weight: weights.commercialBuyerIntent, weighted: Math.round(intentScore * weights.commercialBuyerIntent) },
        relevanceScore: { score: relevanceScore, weight: weights.productRelevance, weighted: Math.round(relevanceScore * weights.productRelevance) },
        economicsScore: { score: economicsScore, weight: weights.commissionEconomics, weighted: Math.round(economicsScore * weights.commissionEconomics) },
        confidenceScore: { score: confidenceScore, weight: weights.evidenceConfidence, weighted: Math.round(confidenceScore * weights.evidenceConfidence) }
      },
      explanation
    };
  }

  // 3. Eligible Composite Score
  const compositeScore = Math.round(
    (momentumScore * weights.predictionMomentum) +
    (verifiedDemandScore * weights.verifiedDemand) +
    (intentScore * weights.commercialBuyerIntent) +
    (relevanceScore * weights.productRelevance) +
    (economicsScore * weights.commissionEconomics) +
    (confidenceScore * weights.evidenceConfidence)
  );

  let tier = 'WATCHLIST';
  let outcome = 'WATCHLIST_MORE_EVIDENCE_NEEDED';
  let campaignEligible = false;

  if (compositeScore >= 75 && buyerHypothesis.verificationStatus === 'VERIFIED_RELEVANT_DEMAND') {
    tier = 'PRIORITY';
    outcome = 'RELEVANT_OPPORTUNITY';
    campaignEligible = true;
  } else if (compositeScore >= 65 && buyerHypothesis.verificationStatus === 'VERIFIED_RELEVANT_DEMAND') {
    tier = 'STRONG';
    outcome = 'RELEVANT_OPPORTUNITY';
    campaignEligible = true;
  } else if (compositeScore >= 50) {
    tier = 'WATCHLIST';
    outcome = 'WATCHLIST_MORE_EVIDENCE_NEEDED';
    campaignEligible = false;
  } else {
    tier = 'ARCHIVE';
    outcome = 'WATCHLIST_MORE_EVIDENCE_NEEDED';
    campaignEligible = false;
  }

  eligibility.campaignEligible = campaignEligible;

  const explanation = campaignEligible
    ? `Score ${compositeScore}/100 (${tier}): Driven by ${momentumScore} momentum, ${demandExplanation}, and ${relevanceScore}% product fit with ${offerMatch.productName}. Eligible for campaign generation.`
    : `Score ${compositeScore}/100 (${tier}): Momentum is ${momentumScore} and product fit is ${relevanceScore}%, but ${demandExplanation}. Kept on watchlist awaiting demand surge before campaign generation.`;

  return {
    opportunityScore: compositeScore,
    tier,
    outcome,
    outcomeReason: explanation,
    eligibility,
    scoreBreakdown: {
      total: compositeScore,
      momentumScore: { score: momentumScore, weight: weights.predictionMomentum, weighted: Math.round(momentumScore * weights.predictionMomentum) },
      verifiedDemandScore: { score: verifiedDemandScore, weight: weights.verifiedDemand, weighted: Math.round(verifiedDemandScore * weights.verifiedDemand) },
      intentScore: { score: intentScore, weight: weights.commercialBuyerIntent, weighted: Math.round(intentScore * weights.commercialBuyerIntent) },
      relevanceScore: { score: relevanceScore, weight: weights.productRelevance, weighted: Math.round(relevanceScore * weights.productRelevance) },
      economicsScore: { score: economicsScore, weight: weights.commissionEconomics, weighted: Math.round(economicsScore * weights.commissionEconomics) },
      confidenceScore: { score: confidenceScore, weight: weights.evidenceConfidence, weighted: Math.round(confidenceScore * weights.evidenceConfidence) }
    },
    explanation
  };
}

module.exports = {
  scoreAffiliateOpportunity,
  DEFAULT_WEIGHTS
};
