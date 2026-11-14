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
  // Distinguishes growth from absolute volume. 1x acceleration or unmeasured baseline does not establish growth.
  const volume = predictionSignal.volume24h || predictionSignal.tradingVolume || 0;
  const acceleration = predictionSignal.signal?.volumeAcceleration || 1.0;
  const accelStatus = predictionSignal.signal?.accelerationStatus || 'NO_HISTORICAL_BASELINE';
  const hasProvenAcceleration = accelStatus === 'EMPIRICAL_7D_BASELINE' && acceleration > 1.05;

  let momentumScore = 15;
  if (!hasProvenAcceleration) {
    // Unmeasured or flat acceleration caps momentum at 50 max
    if (volume > 1000000) momentumScore = 50;
    else if (volume > 100000) momentumScore = 40;
    else if (volume > 25000) momentumScore = 30;
    else momentumScore = 15;
  } else {
    // Verified empirical historical acceleration
    if (volume > 1000000 && acceleration >= 2.0) momentumScore = 95;
    else if (volume > 500000 && acceleration >= 1.5) momentumScore = 85;
    else if (volume > 100000 && acceleration >= 1.2) momentumScore = 75;
    else if (volume > 25000 && acceleration >= 1.1) momentumScore = 60;
    else momentumScore = 45;
  }

  // Factor 2: Independently Verified Demand (0 - 100)
  // Unverified demand or unavailable provider scores 0. Never substitutes invented volume.
  let verifiedDemandScore = 0;
  let demandExplanation = 'Unchecked';

  if (!buyerHypothesis || buyerHypothesis.verificationStatus === 'NOT_CHECKED') {
    verifiedDemandScore = 0;
    demandExplanation = 'Search demand not checked';
  } else if (buyerHypothesis.verificationStatus === 'VERIFIED_RELEVANT_DEMAND') {
    const opp = buyerHypothesis.demandEvidence?.opportunityScore || 65;
    verifiedDemandScore = Math.min(100, Math.max(50, opp));
    const volStr = buyerHypothesis.demandEvidence?.volumeDisplay || '10,000+';
    const providerStr = buyerHypothesis.demandEvidence?.provider || 'Search Index';
    demandExplanation = `Verified relevant search demand (${volStr}/mo via ${providerStr}, score ${opp})`;
  } else if (buyerHypothesis.verificationStatus === 'MEASURED_LOW_DEMAND') {
    verifiedDemandScore = 15;
    demandExplanation = 'Measured low search demand (<750 searches/mo)';
  } else if (buyerHypothesis.verificationStatus === 'PROVIDER_UNAVAILABLE') {
    verifiedDemandScore = 0;
    demandExplanation = 'Demand provider unavailable (unverified demand)';
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

  // Mathematically auditable weighted contributions
  const wMomentum = Number((momentumScore * weights.predictionMomentum).toFixed(2));
  const wDemand = Number((verifiedDemandScore * weights.verifiedDemand).toFixed(2));
  const wIntent = Number((intentScore * weights.commercialBuyerIntent).toFixed(2));
  const wRelevance = Number((relevanceScore * weights.productRelevance).toFixed(2));
  const wEconomics = Number((economicsScore * weights.commissionEconomics).toFixed(2));
  const wConfidence = Number((confidenceScore * weights.evidenceConfidence).toFixed(2));

  const weightedSum = Number((wMomentum + wDemand + wIntent + wRelevance + wEconomics + wConfidence).toFixed(2));
  const rawComposite = Math.round(weightedSum);

  // 2. Disqualified Early Return
  if (!passedAllGates) {
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
        weightedSum,
        momentumScore: { score: momentumScore, weight: weights.predictionMomentum, weighted: Number(wMomentum.toFixed(1)) },
        verifiedDemandScore: { score: verifiedDemandScore, weight: weights.verifiedDemand, weighted: Number(wDemand.toFixed(1)) },
        intentScore: { score: intentScore, weight: weights.commercialBuyerIntent, weighted: Number(wIntent.toFixed(1)) },
        relevanceScore: { score: relevanceScore, weight: weights.productRelevance, weighted: Number(wRelevance.toFixed(1)) },
        economicsScore: { score: economicsScore, weight: weights.commissionEconomics, weighted: Number(wEconomics.toFixed(1)) },
        confidenceScore: { score: confidenceScore, weight: weights.evidenceConfidence, weighted: Number(wConfidence.toFixed(1)) }
      },
      explanation
    };
  }

  // 3. Eligible Composite Score (Auditably sums to rounded weighted total)
  const compositeScore = rawComposite;

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
      weightedSum,
      momentumScore: { score: momentumScore, weight: weights.predictionMomentum, weighted: Number(wMomentum.toFixed(1)) },
      verifiedDemandScore: { score: verifiedDemandScore, weight: weights.verifiedDemand, weighted: Number(wDemand.toFixed(1)) },
      intentScore: { score: intentScore, weight: weights.commercialBuyerIntent, weighted: Number(wIntent.toFixed(1)) },
      relevanceScore: { score: relevanceScore, weight: weights.productRelevance, weighted: Number(wRelevance.toFixed(1)) },
      economicsScore: { score: economicsScore, weight: weights.commissionEconomics, weighted: Number(wEconomics.toFixed(1)) },
      confidenceScore: { score: confidenceScore, weight: weights.evidenceConfidence, weighted: Number(wConfidence.toFixed(1)) }
    },
    explanation
  };
}

module.exports = {
  scoreAffiliateOpportunity,
  DEFAULT_WEIGHTS
};
