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
  const startedAt = new Date().toISOString();
  const runId = `run_${Date.now()}`;
  const logs = [];
  const log = (msg) => {
    const entry = `[${new Date().toISOString().split('T')[1].slice(0, 8)}] ${msg}`;
    logs.push(entry);
    console.log(`🔮 [Prediction Engine] ${msg}`);
  };

  log(`Starting Prediction-to-Profit Pipeline (${runId})...`);

  // Load existing state to preserve manual admin decisions across runs
  let existingOpportunities = new Map();
  if (fs.existsSync(STATE_FILE)) {
    try {
      const prevState = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
      if (Array.isArray(prevState.opportunities)) {
        for (const opp of prevState.opportunities) {
          const extId = String(opp.event?.externalId || '');
          // Strictly reject legacy demonstration fixtures or mock IDs
          if (extId && !extId.includes('winter_storm') && !extId.includes('drought') && !extId.includes('mock')) {
            existingOpportunities.set(extId, opp);
          }
        }
      }
    } catch (_) {}
  }
  
  // 1. Fetch live prediction markets (read-only Polymarket Gamma API)
  log('Step 1: Ingesting live prediction events from Polymarket Gamma API...');
  let rawEvents = [];
  let polymarketStatus = 'HEALTHY';
  try {
    rawEvents = await fetchLivePredictionMarkets({ limit: options.limit || 20 });
    log(`Ingested ${rawEvents.length} normalized market events.`);
  } catch (err) {
    polymarketStatus = `ERROR: ${err.message}`;
    log(`Polymarket API error: ${err.message}`);
    throw err;
  }

  const opportunities = [];
  const campaignDrafts = [];
  const processedTitles = new Set();
  const processedIds = new Set();
  const nowMs = Date.now();

  // 2. Process each event through the strict evidence chain
  const processLimit = options.processLimit || 10;
  for (const event of rawEvents) {
    if (opportunities.length >= processLimit) break;

    const normTitle = String(event.title || '').trim().toLowerCase().replace(/\s+/g, ' ');
    const extId = String(event.externalId || event.eventId || '');
    if (processedIds.has(extId) || (normTitle && processedTitles.has(normTitle))) {
      log(`Skipped duplicate event: "${event.title}"`);
      continue;
    }
    if (event.marketStatus === 'closed') {
      log(`Skipped closed event: "${event.title}"`);
      continue;
    }
    if (event.resolutionDate) {
      const resMs = Date.parse(event.resolutionDate);
      if (Number.isFinite(resMs) && resMs < nowMs) {
        log(`Skipped expired event (ended ${event.resolutionDate}): "${event.title}"`);
        continue;
      }
    }
    processedIds.add(extId);
    if (normTitle) processedTitles.add(normTitle);
    log(`\nEvaluating: "${event.title}"`);
    log(` -> Category: ${event.category} | 24h Vol: $${event.volume24h.toLocaleString()} | Top Outcome: ${event.topOutcome?.label} (${event.topOutcome?.probability}%)`);

    // A. Analyze Buyer Intent & Validate Independent Demand
    const hypothesis = await analyzeBuyerIntent(event, { skipVidiqApi: options.skipVidiqApi || false });
    log(` -> Commercial Viability: ${hypothesis.commercialViable ? 'YES' : 'NO'}`);
    log(` -> Demand Status: ${hypothesis.verificationStatus} (Query: "${hypothesis.demandEvidence?.queryPhrase || 'N/A'}", Score: ${hypothesis.demandEvidence?.opportunityScore ?? 'N/A'})`);

    // B. Match Affiliate Offer (Strict Semantic Relevance)
    const offerMatch = matchAffiliateOffer(event, hypothesis);
    if (offerMatch.approvalStatus === 'approved') {
      log(` -> Matched Offer: "${offerMatch.productName}" via ${offerMatch.network} (Relevance: ${offerMatch.relevanceScore}/100)`);
    } else {
      log(` -> Offer Match: NONE (${offerMatch.outcomeReason})`);
    }

    // C. Calculate Auditable Opportunity Score (0 - 100)
    const scoreResult = scoreAffiliateOpportunity(event, hypothesis, offerMatch);
    log(` -> Score: ${scoreResult.opportunityScore}/100 (${scoreResult.tier}) | Outcome: ${scoreResult.outcome}`);

    // Preserve prior admin review if previously decided
    const prev = existingOpportunities.get(event.externalId);
    let status = prev?.status || 'PENDING_REVIEW';
    let adminNotes = prev?.adminNotes || null;
    let reviewedAt = prev?.reviewedAt || null;

    const oppId = prev?.opportunityId || `opp_${event.externalId}_${Date.now()}`;
    const opportunityRecord = {
      opportunityId: oppId,
      event,
      signal: event.signal,
      hypothesis,
      offerMatch,
      scoreResult,
      status,
      adminNotes,
      reviewedAt,
      createdAt: prev?.createdAt || new Date().toISOString(),
      lastEvaluatedAt: new Date().toISOString()
    };

    opportunities.push(opportunityRecord);

    // D. Auto-generate Unpublished Campaign Draft ONLY for Eligible Opportunities
    if (scoreResult.eligibility.campaignEligible && scoreResult.outcome === 'RELEVANT_OPPORTUNITY') {
      log(` ✨ Opportunity is eligible for campaigns. Generating 10-point multi-channel draft...`);
      const draft = generateCampaignDraft(opportunityRecord);
      if (draft) {
        campaignDrafts.push(draft);
        log(` -> Campaign draft generated: "${draft.title}" (Status: UNPUBLISHED)`);
      }
    } else {
      log(` 🛑 Draft skipped: ${scoreResult.explanation}`);
    }
  }

  // 3. Persist State Snapshot
  const completedAt = new Date().toISOString();
  const eligibleCount = opportunities.filter(o => o.scoreResult.eligibility.campaignEligible).length;
  const watchlistCount = opportunities.filter(o => o.scoreResult.tier === 'WATCHLIST').length;
  const disqualifiedCount = opportunities.filter(o => o.scoreResult.tier === 'DISQUALIFIED').length;

  const pipelineState = {
    runId,
    startedAt,
    completedAt,
    lastRunAt: completedAt,
    providerHealth: {
      polymarket: polymarketStatus,
      vidiq: options.skipVidiqApi ? 'MOCKED_IN_TEST' : 'ACTIVE'
    },
    totalEventsIngested: rawEvents.length,
    opportunitiesEvaluated: opportunities.length,
    eligibleOpportunitiesCount: eligibleCount,
    watchlistCount,
    disqualifiedCount,
    campaignDraftsCount: campaignDrafts.length,
    opportunities,
    campaignDrafts
  };

  fs.writeFileSync(STATE_FILE, JSON.stringify(pipelineState, null, 2), 'utf8');
  log(`\n✅ Pipeline run completed. State saved to prediction-state.json`);
  log(`Summary: ${opportunities.length} evaluated | ${eligibleCount} eligible | ${watchlistCount} watchlist | ${disqualifiedCount} disqualified | ${campaignDrafts.length} drafts`);

  return {
    state: pipelineState,
    logs
  };
}

// CLI execution support
if (require.main === module) {
  runPredictionPipeline({ limit: 15, processLimit: 8 })
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Pipeline fatal error:', err);
      process.exit(1);
    });
}

module.exports = {
  runPredictionPipeline
};
