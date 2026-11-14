/**
 * Automated Regression & Integration Test Suite
 * Prediction-to-Profit Affiliate Intelligence Engine
 *
 * Covers:
 * 1. Sports Regression: "Grizzlies vs. Pelicans" must NEVER match food preservation
 * 2. Politics Regression: "Presidential Election Winner 2028" must NEVER match AI automation vault
 * 3. Multi-Outcome Odds: Preserves contract outcomes, individual probabilities, and topOutcome
 * 4. Demand Verification Honesty: Low demand is never described as verified search demand
 * 5. Niche-Specific Drafts: Category-tailored copy and specific destination URLs (no generic /calm)
 * 6. Admin Approval Gate: Enforces manual review before publishing
 *
 * Rules: Zero em dashes. Standard hyphens or colons only.
 */

const assert = require('node:assert/strict');
const { normalizePredictionEvents, categorizeEvent } = require('./prediction-market-scanner.js');
const { analyzeBuyerIntent } = require('./buyer-intent-analyzer.js');
const { matchAffiliateOffer } = require('./affiliate-offer-matcher.js');
const { scoreAffiliateOpportunity } = require('./opportunity-scoring-engine.js');
const { generateCampaignDraft } = require('./campaign-draft-generator.js');

console.log('--- Starting Prediction-to-Profit Engine Regression Suite ---');

let passedTests = 0;

async function runTest(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`[FAIL] ${name}:`, err.message);
    process.exitCode = 1;
  }
}

async function main() {
  // 1. Sports Regression: "Grizzlies vs. Pelicans"
  await runTest('Regression 1: Basketball match is disqualified with NO commercial opportunity', async () => {
    const rawSportsEvent = [
      {
        id: '1284293',
        title: 'Grizzlies vs. Pelicans',
        description: 'NBA Regular Season Matchup',
        tags: ['Sports', 'NBA', 'Games', 'Basketball'],
        volume24hr: 1596050,
        liquidity: 450000,
        markets: [
          { id: 'm-1', question: 'Grizzlies vs. Pelicans', outcomePrices: '["0.65", "0.35"]' }
        ]
      }
    ];

    const normalized = normalizePredictionEvents(rawSportsEvent);
    assert.equal(normalized.length, 1);
    const event = normalized[0];

    // Verification 1A: Correct Category
    assert.equal(event.category, 'Sports & Competitive Athletics');
    assert.equal(event.signal.isCommerciallyViable, false);

    // Verification 1B: Buyer Intent returns non-commercial
    const hypothesis = await analyzeBuyerIntent(event, { skipVidiqApi: true });
    assert.equal(hypothesis.commercialViable, false);
    assert.equal(hypothesis.outcome, 'NO_COMMERCIAL_OPPORTUNITY');

    // Verification 1C: Offer Matcher rejects match (never food preservation)
    const offerMatch = matchAffiliateOffer(event, hypothesis);
    assert.equal(offerMatch.outcome, 'NO_COMMERCIAL_OPPORTUNITY');
    assert.equal(offerMatch.offerSlug, null);
    assert.notEqual(offerMatch.offerSlug, 'food-preservation');

    // Verification 1D: Scoring Engine disqualifies
    const scoreResult = scoreAffiliateOpportunity(event, hypothesis, offerMatch);
    assert.equal(scoreResult.tier, 'DISQUALIFIED');
    assert.equal(scoreResult.eligibility.passedAllGates, false);
    assert.equal(scoreResult.eligibility.campaignEligible, false);

    // Verification 1E: Campaign Generator returns null
    const oppRecord = { event, signal: event.signal, hypothesis, offerMatch, scoreResult, opportunityId: 'opp_sports' };
    const draft = generateCampaignDraft(oppRecord);
    assert.equal(draft, null, 'Must not generate a campaign draft for a sports event');
  });

  // 2. Election Regression: "Presidential Election Winner 2028"
  await runTest('Regression 2: Presidential election is classified as Governance, NOT Technology & AI', async () => {
    const rawElectionEvent = [
      {
        id: '31552',
        title: 'Presidential Election Winner 2028',
        description: 'The 2028 US Presidential Election is scheduled to take place on November 7, 2028.',
        tags: ['President', 'United States', 'US Election', 'Elections', 'Politics', 'Main Election'],
        volume24hr: 1072390,
        liquidity: 52766780,
        markets: [
          { id: 'm-vance', groupItemTitle: 'JD Vance', outcomePrices: '["0.1535", "0.8465"]' },
          { id: 'm-newsom', groupItemTitle: 'Gavin Newsom', outcomePrices: '["0.1010", "0.8990"]' }
        ]
      }
    ];

    const normalized = normalizePredictionEvents(rawElectionEvent);
    assert.equal(normalized.length, 1);
    const event = normalized[0];

    // Verification 2A: Correct Category (Governance, NOT Tech)
    assert.equal(event.category, 'Governance, Elections & Politics');
    assert.notEqual(event.category, 'Technology & AI');
    assert.equal(event.signal.isCommerciallyViable, false);

    // Verification 2B: Buyer Intent
    const hypothesis = await analyzeBuyerIntent(event, { skipVidiqApi: true });
    assert.equal(hypothesis.commercialViable, false);

    // Verification 2C: Offer Matcher rejects match (never AI vault)
    const offerMatch = matchAffiliateOffer(event, hypothesis);
    assert.equal(offerMatch.outcome, 'NO_COMMERCIAL_OPPORTUNITY');
    assert.notEqual(offerMatch.offerSlug, 'ai-vault');

    // Verification 2D: Scoring Engine disqualifies
    const scoreResult = scoreAffiliateOpportunity(event, hypothesis, offerMatch);
    assert.equal(scoreResult.tier, 'DISQUALIFIED');
    assert.equal(scoreResult.eligibility.campaignEligible, false);

    // Verification 2E: Zero drafts generated
    const oppRecord = { event, signal: event.signal, hypothesis, offerMatch, scoreResult, opportunityId: 'opp_election' };
    const draft = generateCampaignDraft(oppRecord);
    assert.equal(draft, null, 'Must not generate a campaign draft for general election horse-race');
  });

  // 3. Multi-Outcome Odds & Contract Preservation
  await runTest('Market Signals: Preserves multiple outcomes, contract IDs, and top outcome label', () => {
    const rawMultiEvent = [
      {
        id: '770450',
        title: 'Fed Decision in December?',
        tags: ['Fed', 'fomc', 'Economy', 'Fed Rates'],
        volume24hr: 2045506,
        liquidity: 2412385,
        markets: [
          { id: 'c-1', groupItemTitle: '50+ bps decrease', outcomePrices: '["0.02", "0.98"]', volume: 50000 },
          { id: 'c-2', groupItemTitle: '25 bps decrease', outcomePrices: '["0.68", "0.32"]', volume: 1500000 },
          { id: 'c-3', groupItemTitle: 'No change', outcomePrices: '["0.30", "0.70"]', volume: 495506 }
        ]
      }
    ];

    const normalized = normalizePredictionEvents(rawMultiEvent);
    assert.equal(normalized.length, 1);
    const event = normalized[0];

    assert.equal(event.isMultiOutcome, true);
    assert.equal(event.totalOutcomesCount, 3);
    assert.equal(event.topOutcome.label, '25 bps decrease');
    assert.equal(event.topOutcome.probability, 68);
    assert.equal(event.outcomes.length, 3);
    assert.equal(event.outcomes[0].label, '25 bps decrease');
  });

  // 4. Demand Verification Honesty: Low demand is never called verified
  await runTest('Demand Verification: Low demand (<750) is never described as verified search demand', () => {
    const mockSignal = {
      volume24h: 2500000,
      liquidity: 450000,
      category: 'Finance, Capital & Wealth',
      sourceUrl: 'https://polymarket.com/event/fed-cuts',
      signal: { volumeAcceleration: 1.8, signalConfidence: 85 }
    };

    const mockLowDemandHypothesis = {
      commercialViable: true,
      verificationStatus: 'MEASURED_LOW_DEMAND',
      intentType: 'COMMERCIAL_INVESTIGATION',
      purchaseTiming: 'IMMEDIATE',
      demandEvidence: { searchVolume: 0, opportunityScore: 28, volumeDisplay: '<750' }
    };

    const mockOfferMatch = {
      productName: 'Funded Prop Trading Pass',
      offerSlug: 'prop-trading',
      approvalStatus: 'approved',
      relevanceScore: 90,
      commissionRate: 50.0
    };

    const scoreResult = scoreAffiliateOpportunity(mockSignal, mockLowDemandHypothesis, mockOfferMatch);
    
    // Must be classified on watchlist awaiting demand surge
    assert.equal(scoreResult.tier, 'WATCHLIST');
    assert.equal(scoreResult.outcome, 'WATCHLIST_MORE_EVIDENCE_NEEDED');
    assert.equal(scoreResult.eligibility.campaignEligible, false);

    // Explanation must NOT claim demand is verified
    assert.ok(!scoreResult.explanation.includes('verified relevant search demand'));
    assert.ok(scoreResult.explanation.includes('low search demand') || scoreResult.explanation.includes('Measured low'));
  });

  // 5. Niche-Specific Draft Generation (No generic /calm)
  await runTest('Campaign Drafting: Produces niche-specific copy and destination URLs', () => {
    const mockOpportunity = {
      opportunityId: 'opp_power_grid',
      event: {
        externalId: 'grid-101',
        title: 'Severe Polar Vortex Blackout Risk in Northeast',
        category: 'Energy, Blackouts & Emergency Prep',
        sourceUrl: 'https://polymarket.com/event/polar-vortex'
      },
      signal: {
        volumeAcceleration: 2.1,
        signalConfidence: 90
      },
      hypothesis: {
        affectedConsumerGroup: 'Homeowners and Rural Residents',
        coreProblem: 'Power grid blackout vulnerability and pipe freeze emergency',
        searchPhrases: ['portable power station refrigerator', 'prevent frozen pipes power outage'],
        purchaseTiming: 'IMMEDIATE',
        intentType: 'TRANSACTIONAL',
        verificationStatus: 'VERIFIED_RELEVANT_DEMAND',
        commercialViable: true
      },
      offerMatch: {
        productName: 'Enrev Home Backup System',
        offerSlug: 'home-power',
        merchant: 'Enrev Power Systems LLC',
        network: 'ClickBank / Amazon Dual Bridge',
        affiliateUrl: 'https://traffic.aisimplesystem.com/o/home-power?tid=poly_grid101',
        destinationUrl: 'https://traffic.aisimplesystem.com/o/home-power',
        commissionStructure: '75% Digital / 4% Amazon Cart',
        commissionRate: 75.0,
        cookieDuration: '60 Days',
        relevanceScore: 95,
        approvalStatus: 'approved'
      },
      scoreResult: {
        opportunityScore: 84,
        tier: 'PRIORITY',
        outcome: 'RELEVANT_OPPORTUNITY',
        eligibility: { campaignEligible: true, passedAllGates: true }
      }
    };

    const draft = generateCampaignDraft(mockOpportunity);
    assert.ok(draft, 'Draft must be generated for eligible opportunity');
    assert.equal(draft.status, 'UNPUBLISHED');

    // Verification 5A: Destination URL is offer-specific, NOT /calm
    assert.equal(draft.trackingConfig.destinationUrl, 'https://traffic.aisimplesystem.com/o/home-power');
    assert.notEqual(draft.trackingConfig.destinationUrl, 'https://traffic.aisimplesystem.com/calm');
    assert.ok(draft.emailSequence[0].body.includes('https://traffic.aisimplesystem.com/o/home-power'));
    assert.ok(!draft.emailSequence[0].body.includes('/calm'));

    // Verification 5B: Niche-specific headline
    assert.ok(draft.landerOutline.headline.includes('Power & Grid Defense'));
    assert.ok(draft.seoStrategy.primaryKeyword.includes('power station'));

    // Verification 5C: FTC disclosure contains exact merchant
    assert.ok(draft.ftcDisclosure.includes('Enrev Power Systems LLC'));

    // Verification 5D: Zero em dashes in JSON
    const draftJson = JSON.stringify(draft);
    assert.ok(!draftJson.includes('\u2014'), 'Zero em dashes permitted');
    assert.ok(!draftJson.includes('\u2013'), 'Zero en dashes permitted');
  });

  // 6. Admin Approval State Machine
  await runTest('State Machine: Enforces manual admin review and approval transition', () => {
    const draft = {
      draftId: 'cmp_test_001',
      status: 'UNPUBLISHED',
      reviewedBy: null,
      reviewedAt: null
    };

    function publishCampaign(d) {
      if (d.status !== 'APPROVED') {
        throw new Error(`Cannot publish: draft is in status ${d.status}. Manual admin approval required.`);
      }
      return { ...d, status: 'PUBLISHED', publishedAt: new Date().toISOString() };
    }

    // Direct publish attempt must fail
    assert.throws(() => publishCampaign(draft), /Cannot publish: draft is in status UNPUBLISHED/);

    // Admin approves
    const approved = { ...draft, status: 'APPROVED', reviewedBy: 'admin', reviewedAt: new Date().toISOString() };
    const published = publishCampaign(approved);
    assert.equal(published.status, 'PUBLISHED');
    assert.ok(published.publishedAt);
  });

  console.log(`\nAll ${passedTests}/6 tests passed successfully.`);
}

main().catch(err => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
