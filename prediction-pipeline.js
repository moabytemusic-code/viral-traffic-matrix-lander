// Prediction-to-Profit Master Pipeline Orchestrator
// Connects Market Scanning -> Intent Analysis -> Demand Verification -> Offer Matching -> Opportunity Scoring -> Campaign Drafting
// Operates autonomously for scanning, while strictly requiring admin approval for public distribution

const fs = require('fs');
const path = require('path');
const { fetchLivePredictionMarkets } = require('./prediction-market-scanner');
const { analyzeBuyerIntent } = require('./buyer-intent-analyzer');
const { matchAffiliateOffer } = require('./affiliate-offer-matcher');
const { scoreAffiliateOpportunity } = require('./opportunity-scoring-engine');
const { generateCampaignDraft } = require('./campaign-draft-generator');

const STATE_FILE = path.join(__dirname, 'prediction-state.json');

async function runPredictionPipeline(options = {}) {
  const logs = [];
  const log = (msg) => {
    const entry = `[${new Date().toISOString().split('T')[1].slice(0, 8)}] ${msg}`;
    logs.push(entry);
    console.log(`🔮 [Prediction Engine] ${msg}`);
  };

  log("Starting Prediction-to-Profit Pipeline run...");
  
  // 1. Fetch live prediction markets (read-only Polymarket Gamma API)
  log("Step 1: Ingesting live prediction events from Polymarket...");
  const rawEvents = await fetchLivePredictionMarkets({ limit: options.limit || 15 });
  log(`Ingested ${rawEvents.length} normalized commercial events.`);

  const opportunities = [];
  const campaignDrafts = [];

  // 2. Process each event through the intelligence funnel
  for (const event of rawEvents.slice(0, options.processLimit || 6)) {
    log(`\nEvaluating Market: "${event.title}" (24h Vol: $${event.volume24h.toLocaleString()}, Cat: ${event.category})`);

    // A. Analyze Buyer Intent & Validate Independent Demand
    log(` -> Analyzing buyer intent hypotheses...`);
    const hypothesis = await analyzeBuyerIntent(event, { skipVerification: false });
    log(` -> Demand Verification: ${hypothesis.verificationStatus} (Query: "${hypothesis.demandEvidence?.queryPhrase || 'N/A'}", Score: ${hypothesis.demandEvidence?.opportunityScore || 0}/100)`);

    // B. Match Affiliate Offer (Priority 1: Existing Inventory, Priority 2: Amazon Direct)
    log(` -> Matching affiliate offer inventory...`);
    const offerMatch = matchAffiliateOffer(event, hypothesis);
    log(` -> Matched: "${offerMatch.productName}" via ${offerMatch.network} (Comm: ${offerMatch.commissionStructure})`);

    // C. Calculate Explainable Opportunity Score (0 - 100)
    const scoreResult = scoreAffiliateOpportunity(event.signal, hypothesis, offerMatch);
    log(` -> Opportunity Score: ${scoreResult.opportunityScore}/100 (${scoreResult.tier})`);

    const oppId = `opp_${event.externalId}_${Date.now()}`;
    const opportunityRecord = {
      opportunityId: oppId,
      event,
      signal: event.signal,
      hypothesis,
      offerMatch,
      scoreResult,
      status: 'PENDING_REVIEW',
      adminNotes: null,
      createdAt: new Date().toISOString()
    };

    opportunities.push(opportunityRecord);

    // D. Auto-generate Unpublished Campaign Draft for Qualifying Opportunities (Score >= 60)
    if (scoreResult.opportunityScore >= 60) {
      log(` ✨ Score exceeds threshold (>=60). Formulating unpublished campaign draft...`);
      const draft = generateCampaignDraft(opportunityRecord);
      campaignDrafts.push(draft);
      log(` -> Campaign draft generated: "${draft.title}" (Status: UNPUBLISHED)`);
    }
  }

  // 3. Persist State to Local Snapshot & Database
  const pipelineState = {
    lastRunAt: new Date().toISOString(),
    totalEventsIngested: rawEvents.length,
    opportunitiesEvaluated: opportunities.length,
    priorityOpportunitiesCount: opportunities.filter(o => o.scoreResult.tier === 'PRIORITY').length,
    strongOpportunitiesCount: opportunities.filter(o => o.scoreResult.tier === 'STRONG').length,
    campaignDraftsCount: campaignDrafts.length,
    opportunities,
    campaignDrafts
  };

  fs.writeFileSync(STATE_FILE, JSON.stringify(pipelineState, null, 2), 'utf8');
  log(`\n✅ Pipeline completed successfully. State saved to prediction-state.json`);
  log(`Summary: ${opportunities.length} opportunities ranked | ${campaignDrafts.length} campaign drafts prepared for admin review.`);

  return {
    state: pipelineState,
    logs
  };
}

// CLI execution support
if (require.main === module) {
  runPredictionPipeline({ limit: 12, processLimit: 5 })
    .then(() => process.exit(0))
    .catch(err => {
      console.error("Pipeline fatal error:", err);
      process.exit(1);
    });
}

module.exports = {
  runPredictionPipeline
};
