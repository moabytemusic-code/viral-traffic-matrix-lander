// Database Synchronizer for Prediction Intelligence
// Ingests prediction-state.json into PostgreSQL demand_engine

const fs = require('fs');
const path = require('path');

const STATE_FILE = path.join(__dirname, 'prediction-state.json');

function generateSqlInserts() {
  if (!fs.existsSync(STATE_FILE)) {
    throw new Error('prediction-state.json not found. Run pipeline first.');
  }

  const state = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  const sqlStatements = [];

  sqlStatements.push('BEGIN;');

  for (const opp of state.opportunities) {
    const e = opp.event;
    const s = opp.signal;
    const h = opp.hypothesis;
    const m = opp.offerMatch;
    const scr = opp.scoreResult;

    // 1. Prediction Event
    const cleanDesc = (e.description || '').replace(/'/g, "''");
    const cleanTitle = (e.title || '').replace(/'/g, "''");
    const safeTags = Array.isArray(e.tags) && e.tags.length > 0
      ? `ARRAY[${e.tags.map(t => `'${String(t).replace(/'/g, "''")}'`).join(',')}]::text[]`
      : 'ARRAY[]::text[]';
    sqlStatements.push(`
      INSERT INTO prediction_event (id, source_id, external_id, title, description, category, tags, volume_24h, liquidity, market_status, source_url)
      VALUES ('${e.eventId}', 'polymarket', '${e.externalId}', '${cleanTitle}', '${cleanDesc}', '${e.category}', ${safeTags}, ${e.volume24h || 0}, ${e.liquidity || 0}, '${e.marketStatus || 'open'}', '${e.sourceUrl}')
      ON CONFLICT (id) DO UPDATE SET volume_24h = EXCLUDED.volume_24h, updated_at = now();
    `);

    // 2. Prediction Signal
    const cleanObs = (s.currentObservation || '').replace(/'/g, "''");
    sqlStatements.push(`
      INSERT INTO prediction_signal (id, event_id, category, current_observation, probability, volume_acceleration, signal_confidence, data_freshness)
      VALUES ('${s.signalId}', '${e.eventId}', '${s.category}', '${cleanObs}', ${s.probability || 0}, ${s.volumeAcceleration || 1.0}, ${s.signalConfidence || 50}, '${s.dataFreshness || 'LIVE_STREAM'}')
      ON CONFLICT (id) DO UPDATE SET last_updated_at = now();
    `);

    // 3. Buyer Intent Hypothesis
    const cleanHyp = (h.hypothesis || '').replace(/'/g, "''");
    const cleanProb = (h.coreProblem || '').replace(/'/g, "''");
    const cleanGroup = (h.affectedConsumerGroup || '').replace(/'/g, "''");
    const safePhrases = Array.isArray(h.searchPhrases) && h.searchPhrases.length > 0
      ? `ARRAY[${h.searchPhrases.map(p => `'${String(p).replace(/'/g, "''")}'`).join(',')}]::text[]`
      : 'ARRAY[]::text[]';
    sqlStatements.push(`
      INSERT INTO buyer_intent_hypothesis (id, signal_id, affected_consumer_group, core_problem, hypothesis, search_phrases, purchase_timing, intent_type, verification_status)
      VALUES ('${h.hypothesisId}', '${s.signalId}', '${cleanGroup}', '${cleanProb}', '${cleanHyp}', ${safePhrases}, '${h.purchaseTiming || 'NONE'}', '${h.intentType || 'NON_COMMERCIAL'}', '${h.verificationStatus || 'NOT_CHECKED'}')
      ON CONFLICT (id) DO NOTHING;
    `);

    // 4. Demand Evidence
    if (h.demandEvidence && h.demandEvidence.evidenceId) {
      const evi = h.demandEvidence;
      const cleanPhrase = (evi.queryPhrase || '').replace(/'/g, "''");
      sqlStatements.push(`
        INSERT INTO demand_evidence (id, hypothesis_id, source, query_phrase, search_volume, competition_score, opportunity_score, raw_data)
        VALUES ('${evi.evidenceId}', '${h.hypothesisId}', '${evi.provider || 'vidiq_mcp'}', '${cleanPhrase}', ${evi.searchVolume || 0}, ${evi.competitionScore || 0}, ${evi.opportunityScore || 0}, '${JSON.stringify(evi).replace(/'/g, "''")}'::jsonb)
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    // 5. Affiliate Offer Match (Only if match exists)
    let matchIdVal = 'NULL';
    if (m && m.matchId) {
      matchIdVal = `'${m.matchId}'`;
      const cleanProd = (m.productName || '').replace(/'/g, "''");
      const cleanMerch = (m.merchant || '').replace(/'/g, "''");
      const cleanNet = (m.network || '').replace(/'/g, "''");
      const cleanAff = (m.affiliateUrl || '').replace(/'/g, "''");
      const cleanComm = (m.commissionStructure || '').replace(/'/g, "''");
      const cleanCookie = (m.cookieDuration || '').replace(/'/g, "''");
      sqlStatements.push(`
        INSERT INTO affiliate_offer_match (id, hypothesis_id, offer_slug, product_name, merchant, network, affiliate_url, commission_structure, commission_rate, cookie_duration, target_audience, approval_status)
        VALUES ('${m.matchId}', '${h.hypothesisId}', '${m.offerSlug}', '${cleanProd}', '${cleanMerch}', '${cleanNet}', '${cleanAff}', '${cleanComm}', ${m.commissionRate || 0}, '${cleanCookie}', '${cleanGroup}', '${m.approvalStatus || 'approved'}')
        ON CONFLICT (id) DO NOTHING;
      `);
    }

    // 6. Affiliate Opportunity
    const cleanOutcomeReason = (scr.outcomeReason || scr.explanation || '').replace(/'/g, "''");
    sqlStatements.push(`
      INSERT INTO affiliate_opportunity (id, signal_id, hypothesis_id, offer_match_id, score, tier, score_breakdown, status, outcome, outcome_reason)
      VALUES ('${opp.opportunityId}', '${s.signalId}', '${h.hypothesisId}', ${matchIdVal}, ${scr.opportunityScore || 0}, '${scr.tier}', '${JSON.stringify(scr.scoreBreakdown).replace(/'/g, "''")}'::jsonb, '${opp.status || 'PENDING_REVIEW'}', '${scr.outcome || 'PENDING'}', '${cleanOutcomeReason}')
      ON CONFLICT (id) DO UPDATE SET score = EXCLUDED.score, tier = EXCLUDED.tier, outcome = EXCLUDED.outcome, outcome_reason = EXCLUDED.outcome_reason;
    `);
  }

  // 7. Campaign Drafts
  if (Array.isArray(state.campaignDrafts)) {
    for (const draft of state.campaignDrafts) {
      if (!draft || !draft.campaignId) continue;
      const cleanTitle = (draft.title || '').replace(/'/g, "''");
      const cleanFtc = (draft.ftcDisclosure || '').replace(/'/g, "''");
      sqlStatements.push(`
        INSERT INTO campaign_draft (id, opportunity_id, title, target_niche, lander_outline, seo_strategy, youtube_longform_outline, shorts_scripts, social_posts, email_sequence, ftc_disclosure, tracking_config, status)
        VALUES (
          '${draft.campaignId}',
          '${draft.opportunityId}',
          '${cleanTitle}',
          '${draft.targetNiche}',
          '${JSON.stringify(draft.landerOutline).replace(/'/g, "''")}'::jsonb,
          '${JSON.stringify(draft.seoStrategy).replace(/'/g, "''")}'::jsonb,
          '${JSON.stringify(draft.youtubeLongformOutline).replace(/'/g, "''")}'::jsonb,
          '${JSON.stringify(draft.shortsScripts).replace(/'/g, "''")}'::jsonb,
          '${JSON.stringify(draft.socialPosts).replace(/'/g, "''")}'::jsonb,
          '${JSON.stringify(draft.emailSequence).replace(/'/g, "''")}'::jsonb,
          '${cleanFtc}',
          '${JSON.stringify(draft.trackingConfig).replace(/'/g, "''")}'::jsonb,
          '${draft.status}'
        )
        ON CONFLICT (id) DO NOTHING;
      `);
    }
  }

  sqlStatements.push('COMMIT;');
  return sqlStatements.join('\n');
}

module.exports = {
  generateSqlInserts
};
