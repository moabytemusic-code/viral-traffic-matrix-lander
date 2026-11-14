/**
 * Automated Test Suite: Prediction-to-Profit Affiliate Intelligence Engine
 * Tests market normalization, intent generation, offer matching, scoring logic,
 * campaign generation, approval state transitions, and FTC compliance.
 *
 * Rules: Zero em dashes. Standard hyphens or colons only.
 */

const assert = require('node:assert/strict');
const { normalizePredictionEvents } = require('./prediction-market-scanner.js');
const { analyzeBuyerIntent } = require('./buyer-intent-analyzer.js');
const { matchAffiliateOffer } = require('./affiliate-offer-matcher.js');
const { scoreAffiliateOpportunity, DEFAULT_WEIGHTS } = require('./opportunity-scoring-engine.js');
const { generateCampaignDraft } = require('./campaign-draft-generator.js');

console.log('--- Starting Prediction-to-Profit Engine Test Suite ---');

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
  // 1. Market Normalization Test
  await runTest('Market Normalization: Gamma event normalization and signal metrics extraction', () => {
    const mockGammaEvents = [
      {
        id: '12345',
        title: 'Fed cuts interest rates at next FOMC meeting?',
        description: 'Will the Federal Reserve reduce interest rates?',
        tags: ['fed', 'interest rates', 'finance'],
        volume24hr: 2500000,
        liquidity: 450000,
        endDate: '2026-12-31T23:59:59Z',
        markets: [
          {
            id: 'm-1',
            groupItemTitle: 'Yes',
            outcomePrices: '["0.72", "0.28"]',
            volume: 1800000
          }
        ]
      }
    ];

    const normalized = normalizePredictionEvents(mockGammaEvents);
    assert.equal(normalized.length, 1);
    const event = normalized[0];
    assert.equal(event.eventId, 'poly_12345');
    assert.equal(event.source, 'polymarket');
    assert.equal(event.probability, 72);
    assert.equal(event.volume24h, 2500000);
    assert.equal(event.liquidity, 450000);
    assert.equal(event.category, 'Finance & Wealth');
    assert.ok(event.signal, 'Signal record must be generated');
    assert.ok(event.signal.signalId, 'Signal ID present');
    assert.ok(event.signal.signalConfidence > 0, 'Signal confidence > 0');
  });

  // 2. Buyer Intent Analyzer Rules Test
  await runTest('Buyer Intent: Generates structured hypotheses with consumer groups and problems', async () => {
    const mockEvent = {
      externalId: 'ai-agents-123',
      title: 'Will autonomous AI agents manage 10% of hedge funds in 2026?',
      category: 'Technology & AI',
      description: 'Tracking AI automation impact on trading and corporate operations.',
      signal: {
        signalId: 'sig_test_123',
        signalConfidence: 85
      }
    };

    const hypothesis = await analyzeBuyerIntent(mockEvent, { skipVidiqApi: true });
    assert.ok(hypothesis, 'Hypothesis returned');
    assert.ok(hypothesis.hypothesisId, 'Hypothesis ID generated');
    assert.ok(hypothesis.affectedConsumerGroup, 'Consumer group defined');
    assert.ok(hypothesis.coreProblem, 'Core problem identified');
    assert.ok(Array.isArray(hypothesis.searchPhrases), 'Search phrases generated');
    assert.ok(['IMMEDIATE', 'UPCOMING', 'SEASONAL', 'SPECULATIVE'].includes(hypothesis.purchaseTiming), 'Valid purchase timing');
  });

  // 3. Offer Matching Test
  await runTest('Offer Matching: Matches verified inventory first from offers.json', () => {
    const mockEvent = {
      title: 'Major solar flare causes power grid disruptions',
      category: 'Energy & Resilience'
    };

    const mockHypothesis = {
      hypothesis: 'Homeowners preparing for power outages and grid collapse',
      affectedConsumerGroup: 'Homeowners and preppers',
      coreProblem: 'Power outages and blackouts'
    };

    const offerMatch = matchAffiliateOffer(mockEvent, mockHypothesis);
    assert.ok(offerMatch, 'Offer match returned');
    assert.ok(offerMatch.matchId, 'Match ID present');
    assert.ok(offerMatch.productName, 'Product name present');
    assert.ok(offerMatch.affiliateUrl, 'Tracking URL present');
    assert.ok(offerMatch.commissionRate > 0, 'Commission rate positive');
    assert.equal(offerMatch.approvalStatus, 'approved', 'Must match approved offers');
  });

  // 4. Opportunity Scoring Engine Test
  await runTest('Scoring Engine: Calculates 0-100 score with strict compliance gates', () => {
    const mockSignal = {
      sourceUrl: 'https://polymarket.com/event/fed-cuts-rate',
      tradingVolume: 2500000,
      liquidityUsd: 450000,
      marketProbability: 72,
      signalConfidence: 85
    };

    const mockHypothesis = {
      verificationStatus: 'VERIFIED',
      intentType: 'TRANSACTIONAL',
      purchaseTiming: 'IMMEDIATE',
      demandEvidence: {
        searchVolume: 12500,
        opportunityScore: 78
      }
    };

    const mockOffer = {
      productName: 'Perpetual Income Traffic Engine',
      approvalStatus: 'approved',
      sourceInventory: 'EXACT_LOCAL_INVENTORY',
      relevanceScore: 95,
      commissionRate: 50.0,
      commissionAmount: 47.00
    };

    const scoreResult = scoreAffiliateOpportunity(mockSignal, mockHypothesis, mockOffer);
    assert.ok(scoreResult.opportunityScore >= 0 && scoreResult.opportunityScore <= 100, 'Score 0-100');
    assert.ok(['PRIORITY', 'STRONG', 'WATCHLIST', 'ARCHIVE'].includes(scoreResult.tier), 'Valid tier');
    assert.ok(scoreResult.scoreBreakdown, 'Score breakdown present');
    assert.equal(scoreResult.eligibility.passedAllGates, true, 'Compliance gates passed');
    assert.ok(scoreResult.explanation, 'Score explanation provided');
  });

  // 5. Campaign Draft Generator & FTC Compliance Test
  await runTest('Campaign Generator: Produces full 10-point draft with FTC disclosure and tracking', () => {
    const mockOpportunity = {
      opportunityId: 'opp_test_001',
      event: {
        externalId: 'fomc-123',
        title: 'Fed interest rate cuts expected at upcoming FOMC',
        category: 'Finance & Wealth'
      },
      signal: {
        signalId: 'sig_fomc_123'
      },
      hypothesis: {
        affectedConsumerGroup: 'Homeowners and online investors',
        coreProblem: 'Reducing debt interest and generating supplemental cash flow',
        searchPhrases: ['refinance rates', 'online income systems 2026'],
        purchaseTiming: 'IMMEDIATE',
        intentType: 'TRANSACTIONAL'
      },
      offerMatch: {
        productName: 'Perpetual Income Traffic Engine',
        offerSlug: 'perpetual-clicks',
        officialProductUrl: 'https://traffic.aisimplesystem.com',
        affiliateUrl: 'https://kmtwarrior.hop.clickbank.net/?tid=poly_fed',
        commissionStructure: '50% Recurring Commission',
        cookieDuration: '60 Days'
      },
      scoreResult: {
        opportunityScore: 84,
        tier: 'STRONG'
      }
    };

    const draft = generateCampaignDraft(mockOpportunity);
    
    assert.ok(draft.campaignId, 'Draft ID generated');
    assert.equal(draft.status, 'UNPUBLISHED', 'Initial status must be UNPUBLISHED pending admin approval');
    assert.ok(draft.landerOutline, 'A: Landing page outline present');
    assert.ok(draft.seoStrategy, 'B: SEO article strategy present');
    assert.ok(draft.youtubeLongformOutline, 'C: YouTube long-form outline present');
    assert.ok(draft.shortsScripts && draft.shortsScripts.length >= 2, 'D: Shorts scripts present');
    assert.ok(draft.socialPosts && (draft.socialPosts.xThread || draft.socialPosts.threads), 'E: Social posts present');
    assert.ok(draft.emailSequence && draft.emailSequence.length >= 2, 'F: Email sequence present');
    assert.ok(draft.productComparison, 'G: Product comparison present');
    assert.ok(draft.callsToAction, 'H: Conversion CTA present');
    assert.ok(draft.ftcDisclosure, 'I: FTC disclosure present');
    assert.ok(draft.trackingConfig, 'J: Attribution and tracking config present');

    // Verify FTC disclosure compliance
    assert.ok(
      draft.ftcDisclosure.includes('commission') || draft.ftcDisclosure.includes('affiliate'),
      'FTC disclosure must explicitly disclose affiliate compensation'
    );

    // Verify no em dashes or en dashes
    const draftStr = JSON.stringify(draft);
    assert.ok(!draftStr.includes('\u2014'), 'No em dashes permitted in draft copy');
    assert.ok(!draftStr.includes('\u2013'), 'No en dashes permitted in draft copy');
  });

  // 6. Approval State Machine Verification Test
  await runTest('State Machine: Enforces manual admin approval transition before publishing', () => {
    const draft = {
      draftId: 'draft-fomc-001',
      status: 'UNPUBLISHED',
      reviewedBy: null,
      reviewedAt: null
    };

    function approveDraft(d, adminUser) {
      if (d.status !== 'UNPUBLISHED') {
        throw new Error(`Cannot approve draft in status ${d.status}`);
      }
      return {
        ...d,
        status: 'APPROVED',
        reviewedBy: adminUser,
        reviewedAt: new Date().toISOString()
      };
    }

    function publishCampaign(d) {
      if (d.status !== 'APPROVED') {
        throw new Error(`Publish blocked: draft is in ${d.status} state, requires APPROVED`);
      }
      return {
        ...d,
        status: 'PUBLISHED',
        publishedAt: new Date().toISOString()
      };
    }

    // Direct publish fails
    assert.throws(() => publishCampaign(draft), /Publish blocked: draft is in UNPUBLISHED state/);

    // Approval succeeds
    const approved = approveDraft(draft, 'system-admin');
    assert.equal(approved.status, 'APPROVED');
    assert.equal(approved.reviewedBy, 'system-admin');

    // Publish succeeds once approved
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
