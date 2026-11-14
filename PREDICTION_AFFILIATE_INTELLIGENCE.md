# Prediction-to-Profit Affiliate Intelligence Engine
## Production Architecture Specification and Operating Manual

This engine connects public prediction-market intelligence with real-world consumer demand, matching emerging buyer intent to verified affiliate inventory and automatically generating multi-channel campaign drafts for administrative approval.

---

### Core Business Objective

```
Prediction Signals (Polymarket / Kalshi)
      ↓
Demand Validation (vidIQ / Search Volume)
      ↓
Buyer Intent Analysis (Problems, Groups, Timing)
      ↓
Affiliate Offer Discovery (Verified Inventory First)
      ↓
Opportunity Ranking (0 - 100 Multi-Factor Score)
      ↓
Campaign Generation (10-Point Multi-Channel Drafts)
      ↓
Admin Approval Gate (Zero Auto-Publishing)
      ↓
Content Distribution (Postiz Omnichannel Queue)
      ↓
Conversion Tracking & Revenue Optimization
```

---

### Key Modules and File Architecture

1. **Prediction Market Scanner** (`prediction-market-scanner.js`)
   - Read-only public market intelligence from Polymarket Gamma API (`https://gamma-api.polymarket.com/events`).
   - Normalizes volume, liquidity, probability estimates, tags, and category classifications.
   - Filters out non-commercial noise (such as esports and video game brackets).
   - Generates normalized signal records with data freshness and confidence scores.
   - Strictly read-only: No trading, deposits, order execution, or wallet signing.

2. **AI Buyer Intent Analyzer** (`buyer-intent-analyzer.js`)
   - Answers the core question: "What might people want to buy because of this event?"
   - Identifies affected consumer groups, core emotional problems, and purchase timing (Immediate, Upcoming, Seasonal, Speculative).
   - Queries independent demand indicators via vidIQ MCP client for search volume and competition scores.
   - Marks opportunities as `VERIFIED` or `UNVERIFIED_LOW_DEMAND` with empirical evidence.

3. **Affiliate Offer Matcher** (`affiliate-offer-matcher.js`)
   - First Priority: Searches verified local affiliate inventory (`offers.json`), leveraging existing relationships:
     - ClickBank (`kmtwarrior` vendor and affiliate hoplinks)
     - Digistore24 (`marketranger1`)
     - Amazon Associates (`santa101-20` universal 24-hour cart cookie)
   - Second Priority: Fallbacks to Amazon Hardware and Preparedness Hubs.
   - Enforces strict compliance: Never hallucinates merchant programs, commission rates, or affiliate links.

4. **Opportunity Scoring Engine** (`opportunity-scoring-engine.js`)
   - Computes an explainable 0 to 100 Affiliate Opportunity Score.
   - Configurable factor weights:
     - Prediction Momentum: 20%
     - Verified Search Demand: 20%
     - Commercial Buyer Intent: 25%
     - Affiliate Product Relevance: 20%
     - Commission Economics: 10%
     - Evidence Confidence: 5%
   - Mandatory compliance and eligibility gates:
     - Disqualifies unapproved offers or zero-evidence items.
     - Classifies scores into actionable tiers: Priority (85-100), Strong (70-84), Watchlist (50-69), Archive (below 50).

5. **Campaign Draft Generator** (`campaign-draft-generator.js`)
   - Generates complete 10-point multi-channel campaign drafts:
     - A: Landing page outline (8-pillar glassmorphic trust system)
     - B: SEO article and keyword strategy (1,400 words target)
     - C: YouTube long-form video outline (12-minute structured pacing)
     - D: 2x YouTube Shorts / TikTok scripts (Problem interrupt and mistake avoidance)
     - E: Social media posts (X thread and Threads copy)
     - F: Email sequences (Day 1 action guide and Day 2 mistake breakdown)
     - G: Product comparison content
     - H: Conversion calls to action
     - I: Mandatory FTC affiliate disclosure copy
     - J: Attribution tracking configuration (SubID tags)
   - Drafts are created in `UNPUBLISHED` state, requiring explicit admin approval.

6. **Master Pipeline Orchestrator** (`prediction-pipeline.js`)
   - Coordinates the scanner, analyzer, matcher, scorer, and draft generator in an autonomous batch sequence.
   - Persists state to local JSON (`prediction-state.json`) and syncs to PostgreSQL database (`sync-to-postgres.js`).

7. **Server API & Admin Interface** (`server.js` and `launchpad.html`)
   - `GET /api/prediction/state`: Exposes real-time signals, ranked opportunities, and draft queue.
   - `POST /api/prediction/scan`: Triggers an on-demand market scan.
   - `POST /api/prediction/review`: Processes admin approval or rejection of drafts.
   - Admin UI in Launchpad: Live KPI metrics cards, tabbed opportunity table, campaign draft viewer, and config sliders.

---

### Database Schema (`demand_engine` on PostgreSQL)

The engine stores all intelligence in 8 relational tables:
- `prediction_source`: Registered intelligence providers (Polymarket, Kalshi).
- `prediction_event`: Ingested prediction events, dates, probabilities, and volumes.
- `prediction_signal`: Normalized signal records with confidence and change metrics.
- `buyer_intent_hypothesis`: Target consumer groups, core problems, and intent classification.
- `demand_evidence`: Empirical search volume and competition indicators.
- `affiliate_offer_match`: Matched offer details, commission rates, and tracking URLs.
- `affiliate_opportunity`: Computed 0-100 scores, tier ratings, and gate evaluations.
- `campaign_draft`: 10-point multi-channel campaign drafts with approval state.

---

### Compliance and Guardrails

1. **FTC Disclosure Requirement:**
   Every generated landing page, video, email, and social post contains clear affiliate disclosure stating that a commission may be earned if the reader makes a purchase.

2. **Admin Approval Gate:**
   No campaign draft can be published automatically. Drafts remain in `UNPUBLISHED` status until an administrator reviews the content and clicks `Approve`.

3. **Zero Hallucination Policy:**
   Only pre-verified affiliate programs from `offers.json` and verified Amazon Associates tags are used. New merchants enter a pending review queue.

4. **Zero Trading Activity:**
   All market data is gathered through read-only public endpoints. The engine has no wallet connections, private keys, or trading capabilities.
