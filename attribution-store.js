/**
 * Privacy-Safe First-Party Attribution Store
 * Captures deduped visits, opt-ins, and outbound affiliate clicks without storing raw emails, IPs, or user-agents.
 * Confirmed commissions and refunds are accepted ONLY via authenticated provider postbacks or explicit admin reconciliation.
 * Never infers sales or revenue from clicks.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DEFAULT_STATE_PATH = process.env.ATTRIBUTION_DATA_PATH || path.join(__dirname, 'attribution-state.json');
const MAX_DEDUPE_ENTRIES = 10000;

function createDefaultState() {
  return {
    version: 1,
    updatedAt: null,
    reconciliationMode: 'UNCONFIGURED',
    byOffer: {},
    byCampaign: {},
    dedupeKeys: [],
    reconciledTxIds: []
  };
}

function createEmptyBucket(key, meta = {}) {
  return {
    key,
    offerSlug: meta.offerSlug || key,
    campaignId: meta.campaignId || null,
    visits: 0,
    optIns: 0,
    affiliateClicks: 0,
    confirmedSales: 0,
    confirmedCommissionsUsd: 0.0,
    refundsCount: 0,
    refundsUsd: 0.0,
    lastEventAt: null,
    lastReconciledAt: null
  };
}

class AttributionStore {
  constructor(options = {}) {
    this.statePath = options.statePath || DEFAULT_STATE_PATH;
    this.salt = options.salt || process.env.ATTRIBUTION_HASH_SALT || process.env.WEBINAR_SESSION_SECRET || 'vtm_first_party_attr_v1';
    this.state = this._load();
  }

  _load() {
    try {
      if (fs.existsSync(this.statePath)) {
        const parsed = JSON.parse(fs.readFileSync(this.statePath, 'utf8'));
        if (parsed && typeof parsed === 'object') {
          return {
            ...createDefaultState(),
            ...parsed,
            byOffer: parsed.byOffer && typeof parsed.byOffer === 'object' ? parsed.byOffer : {},
            byCampaign: parsed.byCampaign && typeof parsed.byCampaign === 'object' ? parsed.byCampaign : {},
            dedupeKeys: Array.isArray(parsed.dedupeKeys) ? parsed.dedupeKeys : [],
            reconciledTxIds: Array.isArray(parsed.reconciledTxIds) ? parsed.reconciledTxIds : []
          };
        }
      }
    } catch (err) {
      console.error('[AttributionStore] Failed to load state, starting fresh in-memory:', err.message);
    }
    return createDefaultState();
  }

  _save() {
    this.state.updatedAt = new Date().toISOString();
    const dir = path.dirname(this.statePath);
    fs.mkdirSync(dir, { recursive: true });
    const tmpPath = `${this.statePath}.${process.pid}.${Date.now()}.tmp`;
    fs.writeFileSync(tmpPath, JSON.stringify(this.state, null, 2), 'utf8');
    fs.renameSync(tmpPath, this.statePath);
  }

  hashToken(rawValue) {
    return crypto
      .createHash('sha256')
      .update(`${this.salt}|${String(rawValue || '')}`)
      .digest('hex')
      .slice(0, 24);
  }

  _makeDedupeKey(eventType, offerSlug, campaignId, actorToken, dayBucket) {
    return this.hashToken(
      `${eventType}|${offerSlug || 'none'}|${campaignId || 'none'}|${actorToken || 'anon'}|${dayBucket}`
    );
  }

  _recordDedupeKey(dedupeKey) {
    if (this.state.dedupeKeys.includes(dedupeKey)) {
      return false;
    }
    this.state.dedupeKeys.push(dedupeKey);
    if (this.state.dedupeKeys.length > MAX_DEDUPE_ENTRIES) {
      this.state.dedupeKeys = this.state.dedupeKeys.slice(-MAX_DEDUPE_ENTRIES);
    }
    return true;
  }

  _ensureBuckets(offerSlug, campaignId) {
    const cleanOffer = String(offerSlug || '').trim();
    const cleanCampaign = campaignId ? String(campaignId).trim() : null;
    if (cleanOffer && !this.state.byOffer[cleanOffer]) {
      this.state.byOffer[cleanOffer] = createEmptyBucket(cleanOffer, { offerSlug: cleanOffer });
    }
    if (cleanCampaign && !this.state.byCampaign[cleanCampaign]) {
      this.state.byCampaign[cleanCampaign] = createEmptyBucket(cleanCampaign, {
        offerSlug: cleanOffer || null,
        campaignId: cleanCampaign
      });
    }
    return {
      offerBucket: cleanOffer ? this.state.byOffer[cleanOffer] : null,
      campaignBucket: cleanCampaign ? this.state.byCampaign[cleanCampaign] : null
    };
  }

  /**
   * Record a deduped first-party event ('visit' | 'opt_in' | 'click').
   * actorDiscriminator should be an opaque cookie ID, hashed email, or hashed IP+UA (never stored raw).
   */
  recordFirstPartyEvent({ eventType, offerSlug, campaignId = null, actorDiscriminator }) {
    const allowedTypes = new Set(['visit', 'opt_in', 'click']);
    if (!allowedTypes.has(eventType)) {
      throw new Error(`Invalid attribution eventType: ${eventType}`);
    }
    if (!offerSlug || typeof offerSlug !== 'string') {
      throw new Error('offerSlug is required for attribution event');
    }

    const dayBucket = new Date().toISOString().slice(0, 10);
    const actorHash = this.hashToken(actorDiscriminator || 'anonymous');
    const dedupeKey = this._makeDedupeKey(eventType, offerSlug, campaignId, actorHash, dayBucket);

    if (!this._recordDedupeKey(dedupeKey)) {
      return { recorded: false, deduped: true };
    }

    const { offerBucket, campaignBucket } = this._ensureBuckets(offerSlug, campaignId);
    const nowIso = new Date().toISOString();
    const field = eventType === 'visit' ? 'visits' : eventType === 'opt_in' ? 'optIns' : 'affiliateClicks';

    if (offerBucket) {
      offerBucket[field] += 1;
      offerBucket.lastEventAt = nowIso;
    }
    if (campaignBucket) {
      campaignBucket[field] += 1;
      campaignBucket.lastEventAt = nowIso;
    }

    this._save();
    return { recorded: true, deduped: false, eventType, offerSlug, campaignId };
  }

  /**
   * Record a confirmed commission or refund from an authenticated provider postback or explicit admin import.
   * Deduplicates strictly by transactionId so repeated callbacks never double-count revenue.
   */
  recordConfirmedReconciliation({
    transactionId,
    eventKind = 'SALE', // 'SALE' | 'REFUND' | 'CHARGEBACK'
    offerSlug,
    campaignId = null,
    amountUsd = 0,
    source = 'ADMIN_IMPORT'
  }) {
    const cleanTx = String(transactionId || '').trim();
    if (!cleanTx) {
      throw new Error('transactionId is required for confirmed commission/refund reconciliation');
    }
    const txDedupe = this.hashToken(`tx|${cleanTx}|${String(eventKind).toUpperCase()}`);
    if (this.state.reconciledTxIds.includes(txDedupe)) {
      return { recorded: false, deduped: true, transactionId: cleanTx };
    }

    const cleanAmount = Math.max(0, Number(amountUsd) || 0);
    const normalizedKind = String(eventKind || 'SALE').toUpperCase();
    const { offerBucket, campaignBucket } = this._ensureBuckets(offerSlug || 'direct', campaignId);
    const nowIso = new Date().toISOString();

    const applyTo = (bucket) => {
      if (!bucket) return;
      if (normalizedKind === 'REFUND' || normalizedKind === 'CHARGEBACK') {
        bucket.refundsCount += 1;
        bucket.refundsUsd = Number((bucket.refundsUsd + cleanAmount).toFixed(2));
      } else {
        bucket.confirmedSales += 1;
        bucket.confirmedCommissionsUsd = Number((bucket.confirmedCommissionsUsd + cleanAmount).toFixed(2));
      }
      bucket.lastReconciledAt = nowIso;
    };

    applyTo(offerBucket);
    applyTo(campaignBucket);

    this.state.reconciledTxIds.push(txDedupe);
    if (this.state.reconciledTxIds.length > MAX_DEDUPE_ENTRIES) {
      this.state.reconciledTxIds = this.state.reconciledTxIds.slice(-MAX_DEDUPE_ENTRIES);
    }
    this.state.reconciliationMode = source;
    this._save();

    return {
      recorded: true,
      deduped: false,
      transactionId: cleanTx,
      eventKind: normalizedKind,
      amountUsd: cleanAmount,
      source
    };
  }

  getSnapshot() {
    return {
      updatedAt: this.state.updatedAt,
      reconciliationMode: this.state.reconciliationMode,
      byOffer: this.state.byOffer,
      byCampaign: this.state.byCampaign
    };
  }
}

const attributionStore = new AttributionStore();

module.exports = {
  AttributionStore,
  attributionStore
};
