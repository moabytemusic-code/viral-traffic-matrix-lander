/**
 * Webinar Engine: In-House Presenter-Led On-Demand Webinar Platform
 *
 * Security, Integrity & Compliance Architecture:
 * 1. Server-side admin authentication & role-based authorization (401 / 403) + CSRF protection.
 * 2. Scoped, expiring, revocable preview links (stored as SHA-256 hashes) + HMAC-signed viewer context tokens.
 * 3. Strict separation of mutable draft revisions and immutable published snapshots.
 * 4. Verified product reference facts with source asset, observation date, product version, and limitation metadata.
 * 5. Reference-driven Product FAQ Assistant (non-AI, dynamically reading active snapshot reference data).
 * 6. Durable atomic persistence (temp-file + fsync + rename + async mutex) for webinars, sessions, and leads.
 * 7. Interval-based watch analytics (accurate across forward/backward seeks, replays, pauses, and refreshes).
 * 8. Zero em dashes in code, copy, or responses.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WEBINAR_STATES = Object.freeze({
  DRAFT: 'DRAFT',
  GENERATING: 'GENERATING',
  READY_FOR_REVIEW: 'READY_FOR_REVIEW',
  APPROVED: 'APPROVED',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
  FAILED: 'FAILED'
});

const SERVER_CONSENT_CONFIG = Object.freeze({
  version: '2026-11-14.v2',
  registrationDisclosure: 'Save my webinar registration and reference summary request.',
  marketingConsentText: 'Optional: I agree to receive email updates and product analysis notices. I can unsubscribe at any time.',
  retentionDays: 90,
  privacyPolicyUrl: '/privacy'
});

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function hashToken(raw) {
  return crypto.createHash('sha256').update(String(raw)).digest('hex');
}

function timingSafeEqualStr(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string') return false;
  const bufA = Buffer.from(a, 'utf8');
  const bufB = Buffer.from(b, 'utf8');
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}

/**
 * Corrected YuSleep Product Reference
 * Verified directly against supplied label artwork:
 * /Users/kd5000/Documents/Codex/2026-11-14/referenced-chatgpt-conversation-this-is-an/outputs/yusleep-production/assets/yusleep-supplement-facts.jpg
 */
function getYuSleepApprovedReference() {
  return {
    productName: 'YU SLEEP - Advanced Sleep Support Formula (Dietary Supplement)',
    productVersion: 'Supplied Affiliate Label Artwork (2 fl. oz. / 60 ml bottle, UPC 7 42259 22192 7)',
    observedAt: '2026-11-14',
    primarySourceAsset: '/images/yusleep-supplement-facts.jpg',
    vendorResourceUrl: 'https://getyusleep.com/aff-th/',
    presentationUrl: 'https://hop.clickbank.net/?affiliate=kmtwarrior&vendor=yusleep&op=glp&tid=webinar_yusleep',
    affiliateNetwork: 'ClickBank (Vendor ID: yusleep, Affiliate ID: kmtwarrior)',

    manufacturer: {
      entity: "For Women's Health LLC",
      address: '19C TROLLEYSQ, Wilmington, DE, 19801',
      websitePrintedOnLabel: 'www.getyusleep.com',
      upc: '7 42259 22192 7',
      source: 'assets/yusleep-supplement-facts.jpg (Supplied label artwork)',
      observedAt: '2026-11-14',
      productVersion: 'Supplied Affiliate Label Artwork (2 fl. oz. / 60 ml)',
      verificationStatus: 'VERIFIED_FROM_SUPPLIED_LABEL_ARTWORK',
      limitation: 'Reflects the entity printed on the supplied label artwork. Verify the current seller and fulfillment entity on the official merchant checkout page before ordering.'
    },

    servingDetails: {
      productForm: 'Liquid dietary supplement',
      containerSize: '2 fl. oz. (60 ml)',
      servingSize: '2 mL (2 full droppers)',
      servingsPerContainer: 'Approx. 30',
      directionsAndTiming: 'Specific timing or usage directions (such as how many minutes before bed to take a serving) are not printed on the supplied Supplement Facts artwork panel. Check the physical bottle label or current merchant instructions before use.',
      source: 'assets/yusleep-supplement-facts.jpg (Supplied label artwork)',
      observedAt: '2026-11-14',
      productVersion: 'Supplied Affiliate Label Artwork (2 fl. oz. / 60 ml)',
      verificationStatus: 'VERIFIED_FROM_SUPPLIED_LABEL_ARTWORK',
      limitation: 'Artwork verification only; confirm that the currently sold bottle label matches before use.'
    },

    labelDisclosedIngredients: [
      {
        id: 'vitamin_b2',
        name: 'Vitamin B2',
        chemicalForm: 'Riboflavin 5-phosphate',
        amount: '0.5 mg',
        dailyValue: '38%',
        source: 'assets/yusleep-supplement-facts.jpg (Supplied label artwork)',
        observedAt: '2026-11-14',
        productVersion: 'Supplied Affiliate Label Artwork (2 fl. oz. / 60 ml)',
        verificationStatus: 'VERIFIED_FROM_SUPPLIED_LABEL_ARTWORK',
        limitation: 'Per 2 mL serving on supplied label artwork. Confirm current label version before purchase.'
      },
      {
        id: 'vitamin_b6',
        name: 'Vitamin B6',
        chemicalForm: 'Pyridoxal 5 Phosphate',
        amount: '0.5 mg',
        dailyValue: '29%',
        source: 'assets/yusleep-supplement-facts.jpg (Supplied label artwork)',
        observedAt: '2026-11-14',
        productVersion: 'Supplied Affiliate Label Artwork (2 fl. oz. / 60 ml)',
        verificationStatus: 'VERIFIED_FROM_SUPPLIED_LABEL_ARTWORK',
        limitation: 'Per 2 mL serving on supplied label artwork. Confirm current label version before purchase.'
      },
      {
        id: 'melatonin',
        name: 'Melatonin',
        chemicalForm: 'Melatonin',
        amount: '0.9 mg',
        dailyValue: 'Daily Value not established (*)',
        source: 'assets/yusleep-supplement-facts.jpg (Supplied label artwork)',
        observedAt: '2026-11-14',
        productVersion: 'Supplied Affiliate Label Artwork (2 fl. oz. / 60 ml)',
        verificationStatus: 'VERIFIED_FROM_SUPPLIED_LABEL_ARTWORK',
        limitation: 'Daily Value is not established. Consult a healthcare professional before using melatonin.'
      },
      {
        id: 'proprietary_blend',
        name: 'Proprietary Blend',
        chemicalForm: 'Combined botanical and amino blend',
        amount: '637 mg',
        totalAmount: '637 mg',
        dailyValue: 'Daily Value not established (*)',
        ingredients: [
          'Red Tart Cherry Juice Concentrate',
          'Magnesium Glycinate',
          'Apigenin',
          'Lemon Balm Extract',
          '5-HTP (Griffonia seed extract)',
          'L-Theanine',
          'GABA'
        ],
        disclosureNote: 'The supplied label gives one combined 637 mg total for the Proprietary Blend. It does not disclose the individual milligram amount of each ingredient inside the blend.',
        source: 'assets/yusleep-supplement-facts.jpg (Supplied label artwork)',
        observedAt: '2026-11-14',
        productVersion: 'Supplied Affiliate Label Artwork (2 fl. oz. / 60 ml)',
        verificationStatus: 'VERIFIED_FROM_SUPPLIED_LABEL_ARTWORK',
        limitation: 'Individual ingredient doses inside the 637 mg proprietary blend cannot be determined from the label.'
      }
    ],

    otherIngredients: {
      list: [
        'Distilled Water',
        'Glycerin',
        'Medium Invert Syrup',
        'Citric Acid (to preserve freshness)',
        'Erythritol',
        'Sodium Citrate Dihydrate (to preserve freshness)',
        'Natural Flavors',
        'Gum Arabic',
        'Xanthan Gum',
        'Magnesium Glycinate',
        'Apigenin',
        'Lemon Balm Extract',
        'Potassium Sorbate (to preserve freshness)'
      ],
      source: 'assets/yusleep-supplement-facts.jpg (Supplied label artwork)',
      observedAt: '2026-11-14',
      productVersion: 'Supplied Affiliate Label Artwork (2 fl. oz. / 60 ml)',
      verificationStatus: 'VERIFIED_FROM_SUPPLIED_LABEL_ARTWORK',
      limitation: 'Note that Magnesium Glycinate, Apigenin, and Lemon Balm Extract appear in both the Proprietary Blend and the Other Ingredients line as printed on the supplied artwork. Confirm the current bottle label before purchasing.'
    },

    clinicalEvidence: {
      statement: 'We have not verified independent clinical evidence for the finished formula. Studies or general literature about individual ingredients do not establish the clinical results or safety of this specific combined formula.',
      source: 'full-production-script.json (Approved Webinar Script)',
      observedAt: '2026-11-14',
      productVersion: 'Supplied Affiliate Label Artwork (2 fl. oz. / 60 ml)',
      verificationStatus: 'NOT_ESTABLISHED',
      limitation: 'An ingredient list alone does not prove finished-product efficacy or individual sleep outcomes.'
    },

    pricingAndPackages: {
      summary: 'Current package prices, per-bottle prices, total charges, shipping fees, taxes, and whether an order is one-time or recurring are not verified in this static reference and can change at any time.',
      instructions: 'Review the live merchant presentation and official checkout page before ordering to confirm the exact package total, number of bottles, shipping charges, and billing terms.',
      source: 'full-production-script.json & https://getyusleep.com/aff-th/',
      observedAt: '2026-11-14',
      productVersion: 'Current Merchant Checkout (Live Verification Required)',
      verificationStatus: 'UNVERIFIED_REQUIRES_CURRENT_MERCHANT_CHECK',
      limitation: 'Do not rely on static or historical price estimates; always verify live checkout totals before payment.'
    },

    refundPolicy: {
      headlineClaim: 'Merchant promotional materials reference a 60-day guarantee headline.',
      terms: 'Specific return deadlines, return shipping costs, RMA requirements, and conditions for opened or empty bottles are not verified in this static reference and can change. Open and read the current refund policy on the official merchant page before ordering.',
      source: 'full-production-script.json & https://getyusleep.com/aff-th/',
      observedAt: '2026-11-14',
      productVersion: 'Current Merchant Refund Policy (Live Verification Required)',
      verificationStatus: 'UNVERIFIED_REQUIRES_CURRENT_MERCHANT_CHECK',
      limitation: 'Headline guarantee statements do not replace the merchant full written refund terms.'
    },

    disallowedClaims: [
      'Do not claim YuSleep diagnoses, treats, cures, or prevents insomnia or any medical sleep disorder.',
      'Do not guarantee specific sleep latency, sleep duration, or absence of side effects.',
      'Do not invent personal product use, customer testimonials, clinical trials, or physician endorsements.',
      'Do not provide individualized medical or drug-interaction advice; advise viewers to take the current label to a qualified healthcare professional.'
    ]
  };
}

function createEmptyAnalyticsBucket() {
  return {
    visitsTotal: 0,
    uniqueSessions: 0,
    playbackStarts: 0,
    uniqueWatchedSeconds: 0,
    totalPlaybackSeconds: 0,
    averageUniqueWatchSeconds: 0,
    completedSessions: 0,
    milestones: { p25: 0, p50: 0, p75: 0, p100: 0 },
    ctaImpressions: 0,
    ctaClicks: 0,
    registrationAttempts: 0,
    registrations: 0,
    faqQuestionsAsked: 0,
    faqFallbacks: 0,
    seekEvents: 0,
    backgroundIgnoredSeconds: 0
  };
}

function getSeedDraftContent() {
  return {
    revision: 1,
    updatedAt: '2026-11-14T23:00:00.000Z',
    updatedBy: 'system:seed',
    internalTitle: 'YuSleep Tart Cherry Label Walkthrough and Buying Guide',
    headline: 'YuSleep: Let Us Look Beyond the Sales Pitch',
    subheadline: 'An independent, recorded affiliate overview examining the supplied Supplement Facts label, what is disclosed vs. undisclosed, and what to check on the merchant page before deciding.',
    presenter: {
      name: 'Sarah',
      role: 'Recorded Affiliate Overview Presenter',
      isAiGenerated: true,
      disclosureText: 'AI presenter · Recorded affiliate overview. Original fictional AI character and synthesized narration; not a customer testimonial or healthcare professional.'
    },
    video: {
      sourceType: 'LOCAL_MP4',
      videoUrl: '/videos/yusleep-presenter-prototype.mp4',
      posterUrl: '/images/yusleep-presenter.jpg',
      durationSeconds: 30,
      isPrototype: true,
      prototypeNotice: '30-second AI-presenter production prototype (1280x720 H.264/AAC). This is a production test of the opening section, not the full 7-section webinar.',
      width: 1280,
      height: 720,
      codec: 'H.264 / AAC'
    },
    videoMan: {
      manifestId: 'vm_manifest_yusleep_v1',
      status: 'PROTOTYPE_VERIFIED',
      allocatedBudget: 0.00,
      currency: 'USD',
      prototypeJobCost: 0.751,
      fullVideoEstimatedCostRange: '$54.00 - $72.00 (if continuous 720p avatar) or local Remotion B-roll assembly ($0 external render fee)',
      spendingLimitApproved: false,
      scriptVersion: 'full-production-script.v1',
      disclosuresEnforced: true,
      llmAdapter: {
        enabled: false,
        provider: null,
        reason: 'Disabled until provider configuration, data handling, cost limits, and testing are approved.'
      }
    },
    registration: {
      enabled: true,
      required: false,
      headline: 'Save Webinar Reference Notes & Optional Updates',
      description: 'Register your email to record your interest in this product overview. Marketing emails are optional and require separate consent below.',
      brevoListId: 80,
      consentVersion: SERVER_CONSENT_CONFIG.version,
      registrationDisclosure: SERVER_CONSENT_CONFIG.registrationDisclosure,
      marketingConsentText: SERVER_CONSENT_CONFIG.marketingConsentText,
      privacyPolicyUrl: SERVER_CONSENT_CONFIG.privacyPolicyUrl
    },
    cta: {
      buttonText: 'Review Merchant Presentation & Current Terms',
      subtext: 'Opens the merchant presentation via our ClickBank affiliate link. Check current package totals, shipping, and refund terms before ordering.',
      destinationUrl: 'https://hop.clickbank.net/?affiliate=kmtwarrior&vendor=yusleep&op=glp&tid=webinar_yusleep',
      revealSeconds: 15,
      hideUntilRevealed: true,
      affiliateDisclosure: 'Affiliate Disclosure: If you purchase through our link, we may earn a commission at no additional cost to you.'
    },
    reference: getYuSleepApprovedReference()
  };
}

function getSeedWebinars() {
  const draft = getSeedDraftContent();
  return {
    'yu-sleep': {
      slug: 'yu-sleep',
      status: WEBINAR_STATES.DRAFT,
      createdAt: '2026-11-14T23:00:00.000Z',
      updatedAt: '2026-11-14T23:00:00.000Z',
      publishedAt: null,
      hasUnpublishedDraftChanges: true,
      draft,
      approval: {
        approvedRevision: null,
        approvedAt: null,
        approvedBy: null,
        note: null
      },
      publishedSnapshot: null,
      versionHistory: [],
      previewLinks: [],
      auditLog: [
        {
          timestamp: '2026-11-14T23:00:00.000Z',
          action: 'CREATED_DRAFT',
          actor: 'system:seed',
          revision: 1,
          note: 'Initialized unpublished YuSleep draft (revision 1) with 30-second prototype and verified label artwork reference.'
        }
      ],
      analytics: {
        production: createEmptyAnalyticsBucket(),
        preview: createEmptyAnalyticsBucket(),
        salesAttributionStatus: 'NOT_CONNECTED',
        confirmedSales: 0,
        confirmedRevenueUsd: 0.00,
        pendingCommissionsUsd: 0.00,
        refundedCommissionsUsd: 0.00
      }
    }
  };
}

/**
 * Merge overlapping or adjacent intervals [[s1, e1], [s2, e2], ...]
 */
function mergeIntervals(intervals) {
  if (!Array.isArray(intervals) || intervals.length === 0) return [];
  const valid = intervals
    .filter((iv) => Array.isArray(iv) && iv.length === 2 && Number.isFinite(iv[0]) && Number.isFinite(iv[1]) && iv[1] > iv[0])
    .map((iv) => [Math.max(0, Number(iv[0])), Number(iv[1])])
    .sort((a, b) => a[0] - b[0]);

  if (valid.length === 0) return [];
  const merged = [valid[0]];
  for (let i = 1; i < valid.length; i++) {
    const prev = merged[merged.length - 1];
    const curr = valid[i];
    if (curr[0] <= prev[1] + 0.05) {
      prev[1] = Math.max(prev[1], curr[1]);
    } else {
      merged.push(curr);
    }
  }
  return merged.map(([s, e]) => [Number(s.toFixed(2)), Number(e.toFixed(2))]);
}

function sumIntervals(intervals) {
  const merged = mergeIntervals(intervals);
  let total = 0;
  for (const [s, e] of merged) {
    total += (e - s);
  }
  return Number(total.toFixed(2));
}

class WebinarEngine {
  constructor(options = {}) {
    this.dataDir = options.dataDir || process.env.WEBINAR_DATA_DIR || __dirname;
    this.webinarsFile = options.webinarsFile || path.join(this.dataDir, 'webinars.json');
    this.registrationsFile = options.registrationsFile || path.join(this.dataDir, 'webinar-registrations.json');
    this.sessionsFile = options.sessionsFile || path.join(this.dataDir, 'webinar-sessions.json');

    this.autoSeed = options.autoSeed !== undefined ? Boolean(options.autoSeed) : true;
    this.adminToken = options.adminToken !== undefined ? options.adminToken : (process.env.WEBINAR_ADMIN_TOKEN || process.env.ADMIN_API_TOKEN || '');
    this.viewerToken = options.viewerToken !== undefined ? options.viewerToken : (process.env.WEBINAR_VIEWER_TOKEN || '');
    this.sessionSecret = options.sessionSecret || process.env.WEBINAR_SESSION_SECRET || crypto.createHash('sha256').update(`webinar_secret_${this.dataDir}_${this.adminToken || 'local'}`).digest('hex');

    // Brevo Live Adapter Control: Disabled by default in development/test to prevent contacting live Brevo
    this.brevoLiveEnabled = options.brevoLiveEnabled !== undefined
      ? Boolean(options.brevoLiveEnabled)
      : (process.env.WEBINAR_BREVO_LIVE === 'true');
    this.brevoApiKey = options.brevoApiKey !== undefined ? options.brevoApiKey : (process.env.BREVO_API_KEY || '');
    this.brevoTransport = options.brevoTransport || null; // Injectable for testing retries/timeouts/failures

    // Retention & Bounds
    this.maxSessions = options.maxSessions || 2000;
    this.maxRateLimitEntries = options.maxRateLimitEntries || 1000;
    this.maxEventsPerSession = options.maxEventsPerSession || 500;
    this.sessionTtlMs = options.sessionTtlMs || (7 * 24 * 60 * 60 * 1000);

    // State
    this.webinars = {};
    this.registrations = [];
    this.sessions = {};
    this.adminSessions = new Map();
    this.qaRateLimits = new Map();
    this.corruptStateError = null;

    // Async mutex queue for concurrency-safe persistence
    this._writeQueue = Promise.resolve();
    this._simulateWriteFailure = false;

    this.loadState();
  }

  /**
   * Concurrency-safe write lock
   */
  withWriteLock(fn) {
    const next = this._writeQueue.then(() => fn());
    this._writeQueue = next.catch(() => {});
    return next;
  }

  /**
   * Atomic file write: write to temp file, fsync, and rename
   */
  _atomicWriteJsonSync(filePath, data) {
    if (this._simulateWriteFailure) {
      throw new Error('SIMULATED_PERSISTENCE_WRITE_FAILURE');
    }
    const dir = path.dirname(filePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const tmpFile = `${filePath}.${process.pid}.${Date.now()}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    const serialized = JSON.stringify(data, null, 2);
    const fd = fs.openSync(tmpFile, 'w', 0o600);
    try {
      fs.writeFileSync(fd, serialized, 'utf8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fs.renameSync(tmpFile, filePath);
  }

  /**
   * Normalize legacy webinars.json records (if migrating from v1 flat structure) into v2 draft/publishedSnapshot structure
   */
  _normalizeWebinarRecord(slug, raw) {
    if (!raw || typeof raw !== 'object') {
      throw new Error(`Invalid webinar record for slug "${slug}"`);
    }
    // Already v2 structure
    if (raw.draft && typeof raw.draft === 'object') {
      // Ensure analytics buckets exist
      if (!raw.analytics || !raw.analytics.production) {
        raw.analytics = {
          production: createEmptyAnalyticsBucket(),
          preview: createEmptyAnalyticsBucket(),
          salesAttributionStatus: raw.analytics?.salesAttributionStatus || 'NOT_CONNECTED',
          confirmedSales: raw.analytics?.confirmedSales || 0,
          confirmedRevenueUsd: raw.analytics?.confirmedRevenueUsd || 0,
          pendingCommissionsUsd: 0,
          refundedCommissionsUsd: 0
        };
      }
      if (!Array.isArray(raw.previewLinks)) raw.previewLinks = [];
      if (!Array.isArray(raw.versionHistory)) raw.versionHistory = [];
      if (!Array.isArray(raw.auditLog)) raw.auditLog = [];
      if (!raw.approval) {
        raw.approval = { approvedRevision: null, approvedAt: null, approvedBy: null, note: null };
      }
      // If migrating ayu-sleep record that had old inaccurate B2/B6 values, upgrade reference to verified artwork
      if (slug === 'yu-sleep' && raw.draft.reference) {
        const b2 = (raw.draft.reference.labelDisclosedIngredients || []).find((i) => i.name && i.name.includes('B2'));
        if (!b2 || b2.amount === '1.7 mg' || !raw.draft.reference.manufacturer) {
          raw.draft.reference = getYuSleepApprovedReference();
        }
      }
      return raw;
    }

    // Migrate v1 flat record to v2
    const seedDraft = getSeedDraftContent();
    const migratedDraft = {
      revision: Number(raw.version) || 1,
      updatedAt: raw.updatedAt || new Date().toISOString(),
      updatedBy: 'system:migration',
      internalTitle: raw.internalTitle || seedDraft.internalTitle,
      headline: raw.headline || seedDraft.headline,
      subheadline: raw.subheadline || seedDraft.subheadline,
      presenter: raw.presenter || seedDraft.presenter,
      video: raw.video || seedDraft.video,
      videoMan: raw.videoMan || seedDraft.videoMan,
      registration: {
        ...seedDraft.registration,
        ...(raw.registration || {}),
        consentVersion: SERVER_CONSENT_CONFIG.version,
        marketingConsentText: SERVER_CONSENT_CONFIG.marketingConsentText
      },
      cta: raw.cta || seedDraft.cta,
      reference: slug === 'yu-sleep' ? getYuSleepApprovedReference() : (raw.reference || seedDraft.reference)
    };

    return {
      slug,
      status: raw.status === WEBINAR_STATES.PUBLISHED ? WEBINAR_STATES.DRAFT : (raw.status || WEBINAR_STATES.DRAFT),
      createdAt: raw.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      publishedAt: null,
      hasUnpublishedDraftChanges: true,
      draft: migratedDraft,
      approval: {
        approvedRevision: null,
        approvedAt: null,
        approvedBy: null,
        note: null
      },
      publishedSnapshot: null,
      versionHistory: [],
      previewLinks: [],
      auditLog: Array.isArray(raw.auditLog) ? raw.auditLog : [],
      analytics: {
        production: createEmptyAnalyticsBucket(),
        preview: createEmptyAnalyticsBucket(),
        salesAttributionStatus: 'NOT_CONNECTED',
        confirmedSales: 0,
        confirmedRevenueUsd: 0.00,
        pendingCommissionsUsd: 0.00,
        refundedCommissionsUsd: 0.00
      }
    };
  }

  /**
   * Load state from disk.
   * CRITICAL: Never silently reset corrupt state files to seed data!
   */
  loadState() {
    this.corruptStateError = null;

    // 1. Webinars file
    if (fs.existsSync(this.webinarsFile)) {
      try {
        const rawText = fs.readFileSync(this.webinarsFile, 'utf8');
        const parsed = JSON.parse(rawText);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
          throw new Error('Root of webinars.json must be a JSON object map');
        }
        const normalized = {};
        for (const [slug, rec] of Object.entries(parsed)) {
          normalized[slug] = this._normalizeWebinarRecord(slug, rec);
        }
        this.webinars = normalized;
      } catch (err) {
        this.corruptStateError = new Error(`[WebinarEngine] Corrupt webinars state file at ${this.webinarsFile}: ${err.message}`);
        throw this.corruptStateError;
      }
    } else if (this.autoSeed) {
      this.webinars = getSeedWebinars();
      this._atomicWriteJsonSync(this.webinarsFile, this.webinars);
    } else {
      this.webinars = {};
    }

    // 2. Registrations file
    if (fs.existsSync(this.registrationsFile)) {
      try {
        const rawRegs = JSON.parse(fs.readFileSync(this.registrationsFile, 'utf8'));
        if (!Array.isArray(rawRegs)) {
          throw new Error('Root of webinar-registrations.json must be an array');
        }
        this.registrations = rawRegs;
      } catch (err) {
        this.corruptStateError = new Error(`[WebinarEngine] Corrupt registrations file at ${this.registrationsFile}: ${err.message}`);
        throw this.corruptStateError;
      }
    } else {
      this.registrations = [];
      if (this.autoSeed) {
        this._atomicWriteJsonSync(this.registrationsFile, this.registrations);
      }
    }

    // 3. Sessions file
    if (fs.existsSync(this.sessionsFile)) {
      try {
        const rawSessions = JSON.parse(fs.readFileSync(this.sessionsFile, 'utf8'));
        if (!rawSessions || typeof rawSessions !== 'object' || Array.isArray(rawSessions)) {
          throw new Error('Root of webinar-sessions.json must be a JSON object');
        }
        this.sessions = rawSessions;
      } catch (err) {
        this.corruptStateError = new Error(`[WebinarEngine] Corrupt sessions file at ${this.sessionsFile}: ${err.message}`);
        throw this.corruptStateError;
      }
    } else {
      this.sessions = {};
      if (this.autoSeed) {
        this._atomicWriteJsonSync(this.sessionsFile, this.sessions);
      }
    }
  }

  _ensureHealthyState() {
    if (this.corruptStateError) {
      throw this.corruptStateError;
    }
  }

  saveWebinarsSync() {
    this._ensureHealthyState();
    this._atomicWriteJsonSync(this.webinarsFile, this.webinars);
  }

  saveRegistrationsSync() {
    this._ensureHealthyState();
    this._atomicWriteJsonSync(this.registrationsFile, this.registrations);
  }

  saveSessionsSync() {
    this._ensureHealthyState();
    this._pruneSessions();
    this._atomicWriteJsonSync(this.sessionsFile, this.sessions);
  }

  _pruneSessions() {
    const keys = Object.keys(this.sessions);
    const now = Date.now();
    for (const k of keys) {
      const s = this.sessions[k];
      if (!s || (now - (s.updatedAtMs || s.startedAtMs || 0)) > this.sessionTtlMs) {
        delete this.sessions[k];
      }
    }
    const remainingKeys = Object.keys(this.sessions);
    if (remainingKeys.length > this.maxSessions) {
      remainingKeys
        .sort((a, b) => (this.sessions[a].updatedAtMs || 0) - (this.sessions[b].updatedAtMs || 0))
        .slice(0, remainingKeys.length - this.maxSessions)
        .forEach((k) => delete this.sessions[k]);
    }
  }

  // =========================================================================
  // 1. ADMIN AUTHENTICATION, AUTHORIZATION & CSRF PROTECTION
  // =========================================================================

  createAdminSession(suppliedToken) {
    this._ensureHealthyState();
    if (!this.adminToken) {
      const err = new Error('Admin authentication is not configured on this server (WEBINAR_ADMIN_TOKEN missing).');
      err.statusCode = 503;
      throw err;
    }
    if (!suppliedToken || typeof suppliedToken !== 'string') {
      const err = new Error('Admin token is required.');
      err.statusCode = 401;
      throw err;
    }

    let role = null;
    let actorId = null;
    let permissions = [];

    if (timingSafeEqualStr(suppliedToken.trim(), this.adminToken)) {
      role = 'admin';
      actorId = 'admin:primary';
      permissions = ['webinar:read', 'webinar:write', 'webinar:approve', 'webinar:publish', 'webinar:preview'];
    } else if (this.viewerToken && timingSafeEqualStr(suppliedToken.trim(), this.viewerToken)) {
      role = 'auditor_readonly';
      actorId = 'auditor:readonly';
      permissions = ['webinar:read'];
    } else {
      const err = new Error('Invalid administrator credentials.');
      err.statusCode = 401;
      throw err;
    }

    const sessionId = 'adm_sess_' + crypto.randomBytes(24).toString('hex');
    const csrfToken = 'csrf_' + crypto.randomBytes(24).toString('hex');
    const expiresAt = Date.now() + (12 * 60 * 60 * 1000); // 12 hours

    this.adminSessions.set(sessionId, {
      sessionId,
      actorId,
      role,
      permissions,
      csrfToken,
      createdAt: new Date().toISOString(),
      expiresAt
    });

    return {
      sessionId,
      actorId,
      role,
      permissions,
      csrfToken,
      expiresAt: new Date(expiresAt).toISOString()
    };
  }

  revokeAdminSession(sessionId) {
    if (sessionId) {
      this.adminSessions.delete(sessionId);
    }
  }

  /**
   * Authenticate and authorize an incoming HTTP request or direct call
   */
  authenticateAdminRequest(req, requiredPermission = 'webinar:read') {
    if (!this.adminToken) {
      return {
        authenticated: false,
        authorized: false,
        statusCode: 503,
        error: 'Webinar administrator authentication is not configured (set WEBINAR_ADMIN_TOKEN).'
      };
    }

    const headers = req?.headers || {};
    const method = (req?.method || 'GET').toUpperCase();
    const isMutating = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method);

    // 1. Check Bearer token or X-Admin-Token header
    let bearerToken = null;
    if (headers.authorization && headers.authorization.startsWith('Bearer ')) {
      bearerToken = headers.authorization.slice(7).trim();
    } else if (headers['x-admin-token']) {
      bearerToken = String(headers['x-admin-token']).trim();
    }

    if (bearerToken) {
      if (timingSafeEqualStr(bearerToken, this.adminToken)) {
        const permissions = ['webinar:read', 'webinar:write', 'webinar:approve', 'webinar:publish', 'webinar:preview'];
        if (requiredPermission && !permissions.includes(requiredPermission)) {
          return { authenticated: true, authorized: false, statusCode: 403, error: `Missing permission: ${requiredPermission}` };
        }
        return {
          authenticated: true,
          authorized: true,
          statusCode: 200,
          authMethod: 'token',
          actorId: 'admin:primary',
          role: 'admin',
          permissions
        };
      }
      if (this.viewerToken && timingSafeEqualStr(bearerToken, this.viewerToken)) {
        const permissions = ['webinar:read'];
        if (requiredPermission && !permissions.includes(requiredPermission)) {
          return {
            authenticated: true,
            authorized: false,
            statusCode: 403,
            actorId: 'auditor:readonly',
            role: 'auditor_readonly',
            error: `Insufficient permissions: role "auditor_readonly" lacks "${requiredPermission}".`
          };
        }
        return {
          authenticated: true,
          authorized: true,
          statusCode: 200,
          authMethod: 'token',
          actorId: 'auditor:readonly',
          role: 'auditor_readonly',
          permissions
        };
      }
      return {
        authenticated: false,
        authorized: false,
        statusCode: 401,
        error: 'Invalid bearer or admin token.'
      };
    }

    // 2. Check HttpOnly cookie session
    const cookieHeader = headers.cookie || '';
    const cookies = {};
    cookieHeader.split(';').forEach((pair) => {
      const idx = pair.indexOf('=');
      if (idx > -1) {
        const k = pair.slice(0, idx).trim();
        const v = pair.slice(idx + 1).trim();
        cookies[k] = decodeURIComponent(v);
      }
    });

    const sessionId = cookies.webinar_admin_session;
    if (sessionId && this.adminSessions.has(sessionId)) {
      const sess = this.adminSessions.get(sessionId);
      if (Date.now() > sess.expiresAt) {
        this.adminSessions.delete(sessionId);
        return { authenticated: false, authorized: false, statusCode: 401, error: 'Admin session expired.' };
      }

      // Enforce CSRF protection on all state-changing cookie-authenticated requests
      if (isMutating) {
        const suppliedCsrf = headers['x-csrf-token'] ? String(headers['x-csrf-token']).trim() : '';
        if (!suppliedCsrf || !timingSafeEqualStr(suppliedCsrf, sess.csrfToken)) {
          return {
            authenticated: true,
            authorized: false,
            statusCode: 403,
            error: 'CSRF token missing or invalid for cookie-authenticated mutation.'
          };
        }

        // Verify Origin or Referer matches Host if present
        const host = headers.host;
        const origin = headers.origin;
        if (origin && host) {
          try {
            const originHost = new URL(origin).host;
            if (originHost !== host) {
              return {
                authenticated: true,
                authorized: false,
                statusCode: 403,
                error: 'Cross-origin mutation rejected by CSRF origin check.'
              };
            }
          } catch (e) {
            return { authenticated: true, authorized: false, statusCode: 403, error: 'Malformed Origin header.' };
          }
        }
      }

      if (requiredPermission && !sess.permissions.includes(requiredPermission)) {
        return {
          authenticated: true,
          authorized: false,
          statusCode: 403,
          actorId: sess.actorId,
          role: sess.role,
          error: `Insufficient permissions: role "${sess.role}" lacks "${requiredPermission}".`
        };
      }

      return {
        authenticated: true,
        authorized: true,
        statusCode: 200,
        authMethod: 'cookie',
        actorId: sess.actorId,
        role: sess.role,
        permissions: sess.permissions,
        csrfToken: sess.csrfToken
      };
    }

    return {
      authenticated: false,
      authorized: false,
      statusCode: 401,
      error: 'Authentication required. Provide Authorization: Bearer <token> or sign in as administrator.'
    };
  }

  // =========================================================================
  // 2. SERIALIZATION: PUBLIC VS ADMIN VIEWS (NEVER LEAK RAW PREVIEW TOKENS)
  // =========================================================================

  /**
   * Sanitize webinar record for Admin responses (excludes raw token hashes, provides safe metadata)
   */
  serializeForAdmin(webinar) {
    if (!webinar) return null;
    const cloned = deepClone(webinar);
    cloned.previewLinks = (cloned.previewLinks || []).map((link) => ({
      tokenId: link.tokenId,
      slug: link.slug,
      revision: link.revision,
      createdAt: link.createdAt,
      expiresAt: link.expiresAt,
      createdBy: link.createdBy,
      revokedAt: link.revokedAt,
      revokedBy: link.revokedBy,
      isExpired: Date.now() >= Date.parse(link.expiresAt),
      isActive: !link.revokedAt && Date.now() < Date.parse(link.expiresAt)
    }));
    return cloned;
  }

  /**
   * Serialize ONLY intended public fields from the published snapshot
   */
  serializeForPublic(webinar) {
    if (!webinar || webinar.status !== WEBINAR_STATES.PUBLISHED || !webinar.publishedSnapshot) {
      return null;
    }
    const snap = webinar.publishedSnapshot;
    return {
      slug: webinar.slug,
      status: WEBINAR_STATES.PUBLISHED,
      revision: snap.revision,
      publishedAt: snap.publishedAt,
      headline: snap.headline,
      subheadline: snap.subheadline,
      presenter: snap.presenter,
      video: snap.video,
      registration: {
        enabled: snap.registration?.enabled !== false,
        required: Boolean(snap.registration?.required),
        headline: snap.registration?.headline,
        description: snap.registration?.description,
        consentVersion: SERVER_CONSENT_CONFIG.version,
        registrationDisclosure: SERVER_CONSENT_CONFIG.registrationDisclosure,
        marketingConsentText: SERVER_CONSENT_CONFIG.marketingConsentText,
        privacyPolicyUrl: SERVER_CONSENT_CONFIG.privacyPolicyUrl
      },
      cta: snap.cta,
      reference: snap.reference
    };
  }

  getAllWebinarsForAdmin() {
    this._ensureHealthyState();
    return Object.values(this.webinars).map((w) => this.serializeForAdmin(w));
  }

  getPublicWebinars() {
    this._ensureHealthyState();
    return Object.values(this.webinars)
      .filter((w) => w.status === WEBINAR_STATES.PUBLISHED && w.publishedSnapshot)
      .map((w) => this.serializeForPublic(w));
  }

  getWebinar(slug) {
    this._ensureHealthyState();
    return this.webinars[slug] || null;
  }

  getWebinarForAdmin(slug) {
    const w = this.getWebinar(slug);
    return w ? this.serializeForAdmin(w) : null;
  }

  // =========================================================================
  // 3. SCOPED, EXPIRING, REVOCABLE PREVIEW LINKS & VIEWER CONTEXT TOKENS
  // =========================================================================

  /**
   * Create a scoped, expiring preview token for a webinar draft
   */
  async createPreviewLink(slug, { ttlSeconds = 3600, revision = null } = {}, actorId = 'admin:primary') {
    return this.withWriteLock(async () => {
      this._ensureHealthyState();
      const webinar = this.webinars[slug];
      if (!webinar) {
        const err = new Error(`Webinar "${slug}" not found`);
        err.statusCode = 404;
        throw err;
      }

      const prevState = deepClone(webinar);
      const boundedTtl = Math.min(Math.max(Number(ttlSeconds) || 3600, 60), 7 * 24 * 3600);
      const targetRevision = revision ? Number(revision) : webinar.draft.revision;

      const rawToken = `prev_${slug}_${crypto.randomBytes(20).toString('hex')}`;
      const tokenId = `plk_${crypto.randomBytes(8).toString('hex')}`;
      const tokenHash = hashToken(rawToken);
      const now = Date.now();
      const expiresAt = new Date(now + boundedTtl * 1000).toISOString();

      const linkRecord = {
        tokenId,
        slug,
        revision: targetRevision,
        tokenHash,
        createdAt: new Date(now).toISOString(),
        expiresAt,
        createdBy: actorId,
        revokedAt: null,
        revokedBy: null
      };

      webinar.previewLinks.push(linkRecord);
      webinar.auditLog.push({
        timestamp: new Date(now).toISOString(),
        action: 'PREVIEW_LINK_ISSUED',
        actor: actorId,
        revision: targetRevision,
        note: `Issued scoped preview link ${tokenId} expiring at ${expiresAt}`
      });

      try {
        this.saveWebinarsSync();
      } catch (err) {
        this.webinars[slug] = prevState;
        throw err;
      }

      return {
        tokenId,
        slug,
        revision: targetRevision,
        previewToken: rawToken,
        previewUrl: `/webinar/${encodeURIComponent(slug)}?preview=${encodeURIComponent(rawToken)}`,
        expiresAt
      };
    });
  }

  /**
   * Revoke a specific preview link (or all active preview links if tokenId is 'ALL')
   */
  async revokePreviewLink(slug, { tokenId }, actorId = 'admin:primary') {
    return this.withWriteLock(async () => {
      this._ensureHealthyState();
      const webinar = this.webinars[slug];
      if (!webinar) {
        const err = new Error(`Webinar "${slug}" not found`);
        err.statusCode = 404;
        throw err;
      }

      const prevState = deepClone(webinar);
      const nowIso = new Date().toISOString();
      let revokedCount = 0;

      for (const link of webinar.previewLinks) {
        if (!link.revokedAt && (tokenId === 'ALL' || link.tokenId === tokenId)) {
          link.revokedAt = nowIso;
          link.revokedBy = actorId;
          revokedCount++;
        }
      }

      if (revokedCount === 0) {
        const err = new Error(`Active preview link "${tokenId}" not found for webinar "${slug}"`);
        err.statusCode = 404;
        throw err;
      }

      webinar.auditLog.push({
        timestamp: nowIso,
        action: 'PREVIEW_LINK_REVOKED',
        actor: actorId,
        revision: webinar.draft.revision,
        note: `Revoked ${revokedCount} preview link(s) (${tokenId})`
      });

      try {
        this.saveWebinarsSync();
      } catch (err) {
        this.webinars[slug] = prevState;
        throw err;
      }

      return { ok: true, revokedCount, tokenId };
    });
  }

  /**
   * Validate a raw preview token against non-revoked, non-expired previewLinks for slug
   */
  validatePreviewToken(slug, rawToken) {
    this._ensureHealthyState();
    const webinar = this.webinars[slug];
    if (!webinar) return { valid: false, reason: 'NOT_FOUND' };
    if (!rawToken || typeof rawToken !== 'string') return { valid: false, reason: 'MISSING_TOKEN' };

    const candidateHash = hashToken(rawToken);
    const link = (webinar.previewLinks || []).find((l) => timingSafeEqualStr(l.tokenHash, candidateHash));
    if (!link) return { valid: false, reason: 'INVALID_PREVIEW_TOKEN' };
    if (link.slug !== slug) return { valid: false, reason: 'SCOPE_MISMATCH' };
    if (link.revokedAt) return { valid: false, reason: 'PREVIEW_TOKEN_REVOKED', tokenId: link.tokenId };
    if (Date.now() >= Date.parse(link.expiresAt)) return { valid: false, reason: 'PREVIEW_TOKEN_EXPIRED', tokenId: link.tokenId };

    return {
      valid: true,
      tokenId: link.tokenId,
      revision: webinar.draft.revision,
      expiresAt: link.expiresAt
    };
  }

  /**
   * Issue an HMAC-signed viewer context token so viewer API calls (/track, /register, /qa)
   * are cryptographically bound to the server-verified mode (preview vs public) and webinar slug.
   */
  issueViewerContextToken({ slug, mode, tokenId = null, revision = 1, sessionId = null, ttlSeconds = 7200 }) {
    const nowSec = Math.floor(Date.now() / 1000);
    const payload = {
      slug,
      mode: mode === 'preview' ? 'preview' : 'public',
      tokenId: tokenId || null,
      revision: Number(revision) || 1,
      sessionId: sessionId || ('vsess_' + crypto.randomBytes(12).toString('hex')),
      iat: nowSec,
      exp: nowSec + Math.min(Math.max(Number(ttlSeconds) || 7200, 60), 86400)
    };
    const payloadB64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
    const sig = crypto.createHmac('sha256', this.sessionSecret).update(payloadB64).digest('base64url');
    return `${payloadB64}.${sig}`;
  }

  /**
   * Verify a viewer context token and return the authoritative snapshot and preview classification
   */
  verifyViewerContext(slug, contextToken) {
    this._ensureHealthyState();
    const webinar = this.webinars[slug];
    if (!webinar) {
      return { valid: false, statusCode: 404, reason: 'WEBINAR_NOT_FOUND' };
    }

    if (!contextToken || typeof contextToken !== 'string' || !contextToken.includes('.')) {
      return {
        valid: false,
        statusCode: 403,
        reason: 'MISSING_OR_MALFORMED_VIEWER_CONTEXT'
      };
    }

    const parts = contextToken.split('.');
    if (parts.length !== 2) {
      return { valid: false, statusCode: 403, reason: 'INVALID_VIEWER_CONTEXT_FORMAT' };
    }

    const [payloadB64, suppliedSig] = parts;
    const expectedSig = crypto.createHmac('sha256', this.sessionSecret).update(payloadB64).digest('base64url');
    if (!timingSafeEqualStr(suppliedSig, expectedSig)) {
      return { valid: false, statusCode: 403, reason: 'INVALID_VIEWER_CONTEXT_SIGNATURE' };
    }

    let payload;
    try {
      payload = JSON.parse(Buffer.from(payloadB64, 'base64url').toString('utf8'));
    } catch (e) {
      return { valid: false, statusCode: 403, reason: 'CORRUPT_VIEWER_CONTEXT_PAYLOAD' };
    }

    const nowSec = Math.floor(Date.now() / 1000);
    if (!payload.exp || nowSec >= payload.exp) {
      return { valid: false, statusCode: 403, reason: 'VIEWER_CONTEXT_EXPIRED' };
    }

    if (payload.slug !== slug) {
      return { valid: false, statusCode: 403, reason: 'VIEWER_CONTEXT_SLUG_MISMATCH' };
    }

    if (payload.mode === 'preview') {
      // Verify the underlying preview link is still active (not revoked or expired)
      const link = (webinar.previewLinks || []).find((l) => l.tokenId === payload.tokenId);
      if (!link) {
        return { valid: false, statusCode: 403, reason: 'PREVIEW_LINK_NOT_FOUND' };
      }
      if (link.revokedAt) {
        return { valid: false, statusCode: 403, reason: 'PREVIEW_LINK_REVOKED' };
      }
      if (Date.now() >= Date.parse(link.expiresAt)) {
        return { valid: false, statusCode: 403, reason: 'PREVIEW_LINK_EXPIRED' };
      }

      return {
        valid: true,
        statusCode: 200,
        isPreview: true,
        mode: 'preview',
        tokenId: link.tokenId,
        sessionId: payload.sessionId,
        revision: webinar.draft.revision,
        snapshot: webinar.draft,
        webinar
      };
    }

    if (payload.mode === 'public') {
      if (webinar.status !== WEBINAR_STATES.PUBLISHED || !webinar.publishedSnapshot) {
        return {
          valid: false,
          statusCode: 403,
          reason: 'WEBINAR_NOT_PUBLISHED'
        };
      }
      return {
        valid: true,
        statusCode: 200,
        isPreview: false,
        mode: 'public',
        tokenId: null,
        sessionId: payload.sessionId,
        revision: webinar.publishedSnapshot.revision,
        snapshot: webinar.publishedSnapshot,
        webinar
      };
    }

    return { valid: false, statusCode: 403, reason: 'UNKNOWN_VIEWER_CONTEXT_MODE' };
  }

  /**
   * Resolve page access for GET /webinar/:slug
   */
  resolveViewerPageAccess(slug, rawPreviewToken = null) {
    this._ensureHealthyState();
    const webinar = this.webinars[slug];
    if (!webinar) {
      return { allowed: false, statusCode: 404, reason: 'NOT_FOUND', webinar: null };
    }

    // 1. If a preview token is supplied in the query string, validate it strictly
    if (rawPreviewToken !== null && rawPreviewToken !== undefined && rawPreviewToken !== '') {
      const check = this.validatePreviewToken(slug, rawPreviewToken);
      if (!check.valid) {
        return {
          allowed: false,
          statusCode: 403,
          reason: check.reason,
          status: webinar.status,
          webinar: null
        };
      }
      const sessionId = `vsess_${crypto.randomBytes(12).toString('hex')}`;
      const remainingSec = Math.max(60, Math.floor((Date.parse(check.expiresAt) - Date.now()) / 1000));
      const viewerContextToken = this.issueViewerContextToken({
        slug,
        mode: 'preview',
        tokenId: check.tokenId,
        revision: webinar.draft.revision,
        sessionId,
        ttlSeconds: remainingSec
      });

      return {
        allowed: true,
        statusCode: 200,
        slug,
        isPreview: true,
        mode: 'preview',
        tokenId: check.tokenId,
        expiresAt: check.expiresAt,
        sessionId,
        viewerContextToken,
        revision: webinar.draft.revision,
        snapshot: deepClone(webinar.draft),
        webinarStatus: webinar.status
      };
    }

    // 2. Public access requires PUBLISHED status and a valid publishedSnapshot
    if (webinar.status === WEBINAR_STATES.PUBLISHED && webinar.publishedSnapshot) {
      const sessionId = `vsess_${crypto.randomBytes(12).toString('hex')}`;
      const viewerContextToken = this.issueViewerContextToken({
        slug,
        mode: 'public',
        tokenId: null,
        revision: webinar.publishedSnapshot.revision,
        sessionId,
        ttlSeconds: 14400
      });

      return {
        allowed: true,
        statusCode: 200,
        slug,
        isPreview: false,
        mode: 'public',
        tokenId: null,
        sessionId,
        viewerContextToken,
        revision: webinar.publishedSnapshot.revision,
        snapshot: deepClone(webinar.publishedSnapshot),
        webinarStatus: webinar.status
      };
    }

    return {
      allowed: false,
      statusCode: 403,
      reason: 'UNPUBLISHED_DRAFT',
      status: webinar.status,
      webinar: null
    };
  }

  // =========================================================================
  // 4. DRAFT & PUBLISHED SNAPSHOT SEPARATION & LIFECYCLE STATE MACHINE
  // =========================================================================

  /**
   * Save or update a webinar draft.
   * - Never overwrites publishedSnapshot!
   * - Increments draft.revision.
   * - Invalidates any prior approval so edited drafts must be re-approved before publishing.
   */
  async saveWebinar(data, actorId = 'admin:primary') {
    return this.withWriteLock(async () => {
      this._ensureHealthyState();
      if (!data || typeof data !== 'object') {
        const err = new Error('Webinar payload must be a JSON object.');
        err.statusCode = 400;
        throw err;
      }

      const rawSlug = data.slug || data.internalTitle || '';
      const slug = String(rawSlug).toLowerCase().trim().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
      if (!slug || slug.length < 2) {
        const err = new Error('A valid URL slug (at least 2 alphanumeric characters) is required.');
        err.statusCode = 400;
        throw err;
      }

      const existing = this.webinars[slug];
      const prevBackup = existing ? deepClone(existing) : null;
      const nowIso = new Date().toISOString();
      const seedDraft = getSeedDraftContent();

      const prevDraft = existing ? existing.draft : seedDraft;
      const nextRevision = existing ? (Number(prevDraft.revision) || 1) + 1 : 1;

      // Merge reference carefully so sub-fields remain structured
      const nextReference = {
        ...deepClone(prevDraft.reference || seedDraft.reference),
        ...(data.reference || {})
      };
      if (data.reference?.refundPolicy) {
        nextReference.refundPolicy = {
          ...(prevDraft.reference?.refundPolicy || {}),
          ...data.reference.refundPolicy
        };
      }
      if (data.reference?.pricingAndPackages) {
        nextReference.pricingAndPackages = {
          ...(prevDraft.reference?.pricingAndPackages || {}),
          ...data.reference.pricingAndPackages
        };
      }
      if (data.reference?.servingDetails) {
        nextReference.servingDetails = {
          ...(prevDraft.reference?.servingDetails || {}),
          ...data.reference.servingDetails
        };
      }
      if (data.reference?.manufacturer) {
        nextReference.manufacturer = {
          ...(prevDraft.reference?.manufacturer || {}),
          ...data.reference.manufacturer
        };
      }
      if (data.reference?.clinicalEvidence) {
        nextReference.clinicalEvidence = {
          ...(prevDraft.reference?.clinicalEvidence || {}),
          ...data.reference.clinicalEvidence
        };
      }
      if (Array.isArray(data.reference?.labelDisclosedIngredients)) {
        nextReference.labelDisclosedIngredients = deepClone(data.reference.labelDisclosedIngredients);
      }

      const nextDraft = {
        revision: nextRevision,
        updatedAt: nowIso,
        updatedBy: actorId,
        internalTitle: data.internalTitle !== undefined ? String(data.internalTitle).trim() : prevDraft.internalTitle,
        headline: data.headline !== undefined ? String(data.headline).trim() : prevDraft.headline,
        subheadline: data.subheadline !== undefined ? String(data.subheadline).trim() : prevDraft.subheadline,
        presenter: {
          ...deepClone(prevDraft.presenter),
          ...(data.presenter || {})
        },
        video: {
          ...deepClone(prevDraft.video),
          ...(data.video || {})
        },
        videoMan: {
          ...deepClone(prevDraft.videoMan),
          ...(data.videoMan || {}),
          allocatedBudget: 0.00,
          spendingLimitApproved: false
        },
        registration: {
          ...deepClone(prevDraft.registration),
          ...(data.registration || {}),
          consentVersion: SERVER_CONSENT_CONFIG.version,
          registrationDisclosure: SERVER_CONSENT_CONFIG.registrationDisclosure,
          marketingConsentText: SERVER_CONSENT_CONFIG.marketingConsentText,
          privacyPolicyUrl: SERVER_CONSENT_CONFIG.privacyPolicyUrl
        },
        cta: {
          ...deepClone(prevDraft.cta),
          ...(data.cta || {})
        },
        reference: nextReference
      };

      const wasApproved = Boolean(existing?.approval?.approvedRevision);
      const hasLivePublished = Boolean(existing?.publishedSnapshot && existing.status === WEBINAR_STATES.PUBLISHED);

      const nextRecord = existing ? {
        ...existing,
        updatedAt: nowIso,
        hasUnpublishedDraftChanges: true,
        // If already PUBLISHED, keep status PUBLISHED so public snapshot continues serving uninterrupted!
        // Otherwise, editing resets status to DRAFT because any prior review/approval is invalidated.
        status: hasLivePublished ? WEBINAR_STATES.PUBLISHED : WEBINAR_STATES.DRAFT,
        draft: nextDraft,
        approval: {
          approvedRevision: null,
          approvedAt: null,
          approvedBy: null,
          note: wasApproved ? `Approval of revision ${existing.approval.approvedRevision} invalidated by edit in revision ${nextRevision}` : null
        }
      } : {
        slug,
        status: WEBINAR_STATES.DRAFT,
        createdAt: nowIso,
        updatedAt: nowIso,
        publishedAt: null,
        hasUnpublishedDraftChanges: true,
        draft: nextDraft,
        approval: {
          approvedRevision: null,
          approvedAt: null,
          approvedBy: null,
          note: null
        },
        publishedSnapshot: null,
        versionHistory: [],
        previewLinks: [],
        auditLog: [],
        analytics: {
          production: createEmptyAnalyticsBucket(),
          preview: createEmptyAnalyticsBucket(),
          salesAttributionStatus: 'NOT_CONNECTED',
          confirmedSales: 0,
          confirmedRevenueUsd: 0.00,
          pendingCommissionsUsd: 0.00,
          refundedCommissionsUsd: 0.00
        }
      };

      nextRecord.auditLog.push({
        timestamp: nowIso,
        action: existing ? 'UPDATED_DRAFT' : 'CREATED_DRAFT',
        actor: actorId,
        revision: nextRevision,
        note: wasApproved
          ? `Saved draft revision ${nextRevision} (invalidated previous approval of revision ${existing.approval.approvedRevision})`
          : `Saved draft revision ${nextRevision}`
      });

      this.webinars[slug] = nextRecord;
      try {
        this.saveWebinarsSync();
      } catch (err) {
        if (prevBackup) {
          this.webinars[slug] = prevBackup;
        } else {
          delete this.webinars[slug];
        }
        throw err;
      }

      return this.serializeForAdmin(nextRecord);
    });
  }

  /**
   * Transition webinar lifecycle state with strict server-side rules
   * Actions supported:
   * - SUBMIT_FOR_REVIEW (or status: 'READY_FOR_REVIEW')
   * - APPROVE (or status: 'APPROVED')
   * - PUBLISH (or status: 'PUBLISHED') -> requires draft.revision === approval.approvedRevision!
   * - UNPUBLISH (or status: 'DRAFT') -> reversible unpublish
   * - ARCHIVE (or status: 'ARCHIVED')
   */
  async transitionWebinarState(slug, { action, status, revision, note = '' } = {}, actorId = 'admin:primary') {
    return this.withWriteLock(async () => {
      this._ensureHealthyState();
      const webinar = this.webinars[slug];
      if (!webinar) {
        const err = new Error(`Webinar "${slug}" not found`);
        err.statusCode = 404;
        throw err;
      }

      const prevBackup = deepClone(webinar);
      const nowIso = new Date().toISOString();
      const targetAction = (action || status || '').toUpperCase().trim();
      const currentDraftRev = webinar.draft.revision;

      // If caller specified a revision, verify it matches current draft revision
      if (revision !== undefined && revision !== null && Number(revision) !== currentDraftRev) {
        const err = new Error(`Revision mismatch: requested revision ${revision}, but current draft is at revision ${currentDraftRev}.`);
        err.statusCode = 409;
        throw err;
      }

      if (targetAction === 'SUBMIT_FOR_REVIEW' || targetAction === WEBINAR_STATES.READY_FOR_REVIEW) {
        if (webinar.status !== WEBINAR_STATES.PUBLISHED) {
          webinar.status = WEBINAR_STATES.READY_FOR_REVIEW;
        }
        webinar.updatedAt = nowIso;
        webinar.auditLog.push({
          timestamp: nowIso,
          action: 'SUBMITTED_FOR_REVIEW',
          actor: actorId,
          revision: currentDraftRev,
          note: note || `Draft revision ${currentDraftRev} submitted for human review.`
        });
      } else if (targetAction === 'APPROVE' || targetAction === WEBINAR_STATES.APPROVED) {
        webinar.approval = {
          approvedRevision: currentDraftRev,
          approvedAt: nowIso,
          approvedBy: actorId,
          note: note || `Approved draft revision ${currentDraftRev}.`
        };
        if (webinar.status !== WEBINAR_STATES.PUBLISHED) {
          webinar.status = WEBINAR_STATES.APPROVED;
        }
        webinar.updatedAt = nowIso;
        webinar.auditLog.push({
          timestamp: nowIso,
          action: 'APPROVED_REVISION',
          actor: actorId,
          revision: currentDraftRev,
          note: note || `Approved draft revision ${currentDraftRev} for publication.`
        });
      } else if (targetAction === 'PUBLISH' || targetAction === WEBINAR_STATES.PUBLISHED) {
        // Strict server-side check: Cannot publish unless the exact current draft revision is approved!
        if (!webinar.approval || webinar.approval.approvedRevision !== currentDraftRev) {
          const err = new Error(
            `Cannot publish unapproved draft revision ${currentDraftRev}. Approval is required for revision ${currentDraftRev} before publishing (currently approved revision: ${webinar.approval?.approvedRevision || 'none'}).`
          );
          err.statusCode = 409;
          throw err;
        }

        const snapshot = deepClone(webinar.draft);
        snapshot.publishedAt = nowIso;
        snapshot.publishedBy = actorId;
        snapshot.approvedBy = webinar.approval.approvedBy;
        snapshot.approvedAt = webinar.approval.approvedAt;

        webinar.publishedSnapshot = snapshot;
        webinar.status = WEBINAR_STATES.PUBLISHED;
        webinar.publishedAt = nowIso;
        webinar.updatedAt = nowIso;
        webinar.hasUnpublishedDraftChanges = false;

        webinar.versionHistory.push({
          revision: currentDraftRev,
          publishedAt: nowIso,
          publishedBy: actorId,
          approvedBy: webinar.approval.approvedBy,
          headline: snapshot.headline
        });

        webinar.auditLog.push({
          timestamp: nowIso,
          action: 'PUBLISHED_REVISION',
          actor: actorId,
          revision: currentDraftRev,
          note: note || `Promoted approved revision ${currentDraftRev} to live published snapshot.`
        });
      } else if (targetAction === 'UNPUBLISH' || targetAction === WEBINAR_STATES.DRAFT) {
        const prevPublishedRev = webinar.publishedSnapshot?.revision || null;
        webinar.publishedSnapshot = null;
        webinar.status = webinar.approval?.approvedRevision === currentDraftRev
          ? WEBINAR_STATES.APPROVED
          : WEBINAR_STATES.DRAFT;
        webinar.publishedAt = null;
        webinar.updatedAt = nowIso;
        webinar.hasUnpublishedDraftChanges = true;

        webinar.auditLog.push({
          timestamp: nowIso,
          action: 'UNPUBLISHED',
          actor: actorId,
          revision: currentDraftRev,
          note: note || `Unpublished webinar (removed live snapshot revision ${prevPublishedRev || 'n/a'}).`
        });
      } else if (targetAction === 'ARCHIVE' || targetAction === WEBINAR_STATES.ARCHIVED) {
        webinar.publishedSnapshot = null;
        webinar.status = WEBINAR_STATES.ARCHIVED;
        webinar.publishedAt = null;
        webinar.updatedAt = nowIso;

        webinar.auditLog.push({
          timestamp: nowIso,
          action: 'ARCHIVED',
          actor: actorId,
          revision: currentDraftRev,
          note: note || 'Archived webinar and disabled public viewing.'
        });
      } else {
        const err = new Error(`Unsupported state transition "${targetAction}". Allowed: SUBMIT_FOR_REVIEW, APPROVE, PUBLISH, UNPUBLISH, ARCHIVE.`);
        err.statusCode = 400;
        throw err;
      }

      try {
        this.saveWebinarsSync();
      } catch (err) {
        this.webinars[slug] = prevBackup;
        throw err;
      }

      return this.serializeForAdmin(webinar);
    });
  }

  /**
   * Import local MP4 asset into draft (updates draft revision & invalidates prior approval)
   */
  async importVideoManAsset(slug, { videoPath, posterPath, durationSeconds, width, height, notes } = {}, actorId = 'admin:primary') {
    const webinar = this.getWebinar(slug);
    if (!webinar) {
      const err = new Error(`Webinar "${slug}" not found`);
      err.statusCode = 404;
      throw err;
    }

    const cleanVideoPath = String(videoPath || '').trim();
    if (!cleanVideoPath.startsWith('/videos/') || cleanVideoPath.includes('..')) {
      const err = new Error('Video path must be a local path inside /videos/ (e.g. /videos/example.mp4).');
      err.statusCode = 400;
      throw err;
    }

    const dur = Number(durationSeconds) || 30;
    const updated = await this.saveWebinar({
      slug,
      video: {
        sourceType: 'LOCAL_MP4',
        videoUrl: cleanVideoPath,
        posterUrl: posterPath || webinar.draft.video?.posterUrl || '/images/yusleep-presenter.jpg',
        durationSeconds: dur,
        isPrototype: dur < 120,
        width: Number(width) || 1280,
        height: Number(height) || 720,
        codec: 'H.264 / AAC',
        importedAt: new Date().toISOString(),
        importNotes: notes || null
      }
    }, actorId);

    return updated;
  }

  generateVideoManManifest(slug, actorId = 'admin:primary') {
    this._ensureHealthyState();
    const webinar = this.webinars[slug];
    if (!webinar) {
      const err = new Error(`Webinar "${slug}" not found`);
      err.statusCode = 404;
      throw err;
    }
    const d = webinar.draft;
    return {
      manifestId: `vm_manifest_${slug}_rev${d.revision}`,
      slug: webinar.slug,
      draftRevision: d.revision,
      generatedBy: actorId,
      generatedAt: new Date().toISOString(),
      internalTitle: d.internalTitle,
      presenter: d.presenter,
      targetAspect: '16:9',
      resolution: '1280x720',
      fps: 30,
      spendingCeilingUsd: 0.00,
      spendingApproved: false,
      socialDistributionEnabled: false,
      disclosures: [
        'AI presenter · Recorded affiliate overview',
        'Independent affiliate presentation; commission may be earned on purchases',
        'Not medical advice or personal product experience'
      ],
      referenceProductVersion: d.reference?.productVersion,
      status: 'READY_FOR_LOCAL_STAGING'
    };
  }

  // =========================================================================
  // 5. REFERENCE-DRIVEN PRODUCT FAQ ASSISTANT (NON-AI, READS ACTIVE SNAPSHOT)
  // =========================================================================

  _checkFaqRateLimit(ipKey) {
    const now = Date.now();
    const windowMs = 5 * 60 * 1000;

    // Prune expired entries first
    if (this.qaRateLimits.size >= this.maxRateLimitEntries) {
      for (const [k, v] of this.qaRateLimits.entries()) {
        if (now > v.resetAt) this.qaRateLimits.delete(k);
      }
      if (this.qaRateLimits.size >= this.maxRateLimitEntries) {
        const oldestKey = this.qaRateLimits.keys().next().value;
        if (oldestKey) this.qaRateLimits.delete(oldestKey);
      }
    }

    const entry = this.qaRateLimits.get(ipKey) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }
    entry.count += 1;
    this.qaRateLimits.set(ipKey, entry);

    if (entry.count > 20) {
      const err = new Error('Rate limit exceeded for FAQ queries. Please wait a few minutes before submitting another question.');
      err.statusCode = 429;
      throw err;
    }
  }

  /**
   * Answer viewer question using ONLY the active snapshot's approved reference data.
   * Requires a valid viewerContextToken so draft references cannot be queried without preview authorization,
   * and published viewers always query the publishedSnapshot reference.
   */
  async answerViewerQuestion(slug, question, { viewerContextToken, ip = '127.0.0.1' } = {}) {
    this._ensureHealthyState();
    const ctx = this.verifyViewerContext(slug, viewerContextToken);
    if (!ctx.valid) {
      const err = new Error(`Unauthorized FAQ access: ${ctx.reason}`);
      err.statusCode = ctx.statusCode || 403;
      throw err;
    }

    const cleanQuestion = String(question || '').trim();
    if (cleanQuestion.length < 3) {
      const err = new Error('Please enter a question of at least 3 characters.');
      err.statusCode = 400;
      throw err;
    }
    if (cleanQuestion.length > 400) {
      const err = new Error('Question length cannot exceed 400 characters.');
      err.statusCode = 400;
      throw err;
    }

    this._checkFaqRateLimit(`${ip}_${slug}`);

    const snapshot = ctx.snapshot;
    const ref = snapshot.reference || {};
    const qLower = cleanQuestion.toLowerCase();

    const answerBlocks = [];
    const citations = [];
    const addCitation = (title, item) => {
      if (!item) return;
      const source = item.source || ref.primarySourceAsset || 'Approved Product Reference';
      const observedAt = item.observedAt || ref.observedAt || '2026-11-14';
      const verificationStatus = item.verificationStatus || 'REFERENCED';
      const limitation = item.limitation || null;
      if (!citations.some((c) => c.title === title && c.source === source)) {
        citations.push({ title, source, observedAt, verificationStatus, limitation });
      }
    };

    // 1. Prompt-Injection / Ignore-Reference Guardrail
    if (
      qLower.includes('ignore previous') ||
      qLower.includes('ignore the reference') ||
      qLower.includes('pretend you') ||
      qLower.includes('system prompt') ||
      qLower.includes('invent a testimonial') ||
      qLower.includes('fabricate')
    ) {
      await this._incrementFaqMetric(slug, ctx.isPreview, true);
      return {
        ok: true,
        assistantType: 'REFERENCE_FAQ_ASSISTANT',
        assistantLabel: 'Product FAQ Assistant (Driven by Approved Reference Data)',
        llmEnabled: false,
        referenceRevision: ctx.revision,
        productVersion: ref.productVersion || 'Supplied Label Reference',
        matchedReference: false,
        answer: 'This Product FAQ Assistant only reports entries from the approved product reference for this webinar revision. It cannot ignore reference constraints, invent testimonials, or generate unverified claims.',
        citations: [
          {
            title: 'Reference Scope Guardrail',
            source: ref.primarySourceAsset || 'Approved Webinar Reference',
            observedAt: ref.observedAt || '2026-11-14',
            verificationStatus: 'ENFORCED_GUARDRAIL',
            limitation: 'Only approved reference fields can be returned.'
          }
        ]
      };
    }

    // 2. Medical Advice / Drug Interactions / Disease Treatment Guardrail
    const isMedicalQuery = /\b(cure|cures|diagnos\w*|disease|insomnia disorder|sleep apnea|prescription|medication|meds|blood pressure|antidepressant|ssri|pregnant|pregnancy|nursing|child|children|safe for me|interact\w*|side effect\w*)\b/i.test(qLower);
    if (isMedicalQuery) {
      answerBlocks.push(
        `${ref.productName || 'This product'} is sold as a dietary supplement, not a prescription drug or medical treatment for any diagnosed sleep condition. This FAQ Assistant cannot evaluate medical suitability, side effects, or medication interactions for your personal circumstances. Please take the current Supplement Facts label to a qualified physician or pharmacist before deciding.`
      );
      addCitation('Medical & Supplement Scope Notice', {
        source: ref.clinicalEvidence?.source || ref.primarySourceAsset,
        observedAt: ref.observedAt,
        verificationStatus: 'SAFETY_POLICY',
        limitation: 'Not individualized medical advice.'
      });
    }

    // 3. Dynamic Ingredient & Supplement Facts Lookup (reads directly from ref.labelDisclosedIngredients & ref.otherIngredients)
    const ingredientsList = Array.isArray(ref.labelDisclosedIngredients) ? ref.labelDisclosedIngredients : [];
    const matchedIngredients = [];

    for (const ing of ingredientsList) {
      const nameLower = (ing.name || '').toLowerCase();
      const formLower = (ing.chemicalForm || '').toLowerCase();
      const subIngs = Array.isArray(ing.ingredients) ? ing.ingredients.map((s) => s.toLowerCase()) : [];

      const matchedDirect = (nameLower && qLower.includes(nameLower)) ||
        (formLower && qLower.includes(formLower)) ||
        (nameLower.includes('vitamin b2') && /\b(b2|riboflavin)\b/i.test(qLower)) ||
        (nameLower.includes('vitamin b6') && /\b(b6|pyridoxal|pyridoxine)\b/i.test(qLower)) ||
        (nameLower.includes('melatonin') && /\bmelatonin\b/i.test(qLower)) ||
        (nameLower.includes('proprietary') && /\b(blend|637|tart cherry|cherry|magnesium|apigenin|lemon balm|5-htp|htp|griffonia|theanine|gaba)\b/i.test(qLower)) ||
        subIngs.some((sub) => {
          const baseToken = sub.split('(')[0].trim();
          return baseToken && qLower.includes(baseToken);
        });

      if (matchedDirect) {
        matchedIngredients.push(ing);
      }
    }

    const isGeneralIngredientQuery = /\b(ingredient\w*|supplement facts|what is in|what's in|whats in|label|formula|dosage|dose\w*|milligram\w*|mg|amount\w*|contain\w*)\b/i.test(qLower);

    if (matchedIngredients.length > 0) {
      for (const ing of matchedIngredients) {
        if (Array.isArray(ing.ingredients) && ing.ingredients.length > 0) {
          answerBlocks.push(
            `${ing.name} (${ing.totalAmount || ing.amount}, ${ing.dailyValue || 'DV not established'}): Contains ${ing.ingredients.join(', ')}. ${ing.disclosureNote || ''} ${ing.limitation ? `Limitation: ${ing.limitation}` : ''}`.trim()
          );
        } else {
          answerBlocks.push(
            `${ing.name}${ing.chemicalForm && ing.chemicalForm !== ing.name ? ` (as ${ing.chemicalForm})` : ''}: ${ing.amount} per serving (${ing.dailyValue || 'DV not established'}). ${ing.limitation || ''}`.trim()
          );
        }
        addCitation(`Supplement Facts: ${ing.name}`, ing);
      }
    } else if (isGeneralIngredientQuery) {
      // Summarize all disclosed ingredients from active reference
      const summaries = ingredientsList.map((ing) => {
        if (Array.isArray(ing.ingredients) && ing.ingredients.length > 0) {
          return `${ing.name}: ${ing.totalAmount || ing.amount} combined (${ing.ingredients.join(', ')}; individual ingredient amounts inside the blend are not disclosed on the label)`;
        }
        return `${ing.name}${ing.chemicalForm && ing.chemicalForm !== ing.name ? ` (${ing.chemicalForm})` : ''}: ${ing.amount} (${ing.dailyValue})`;
      });
      if (summaries.length > 0) {
        answerBlocks.push(
          `According to the referenced Supplement Facts panel (${ref.productVersion || 'supplied label artwork'}, serving size ${ref.servingDetails?.servingSize || '2 mL'}): ${summaries.join('; ')}.`
        );
        addCitation('Supplement Facts Panel', ingredientsList[0]);
      }
      if (ref.otherIngredients && Array.isArray(ref.otherIngredients.list)) {
        answerBlocks.push(
          `Other ingredients listed on the supplied artwork: ${ref.otherIngredients.list.join(', ')}. ${ref.otherIngredients.limitation || ''}`.trim()
        );
        addCitation('Other Ingredients Panel', ref.otherIngredients);
      }
    }

    if (/\b(other ingredient\w*|inactive|sweetener\w*|erythritol|preservative\w*|sorbate|citric acid|glycerin)\b/i.test(qLower) && ref.otherIngredients) {
      const otherText = `Other ingredients printed on the supplied label artwork: ${(ref.otherIngredients.list || []).join(', ')}. ${ref.otherIngredients.limitation || ''}`.trim();
      if (!answerBlocks.includes(otherText)) {
        answerBlocks.push(otherText);
        addCitation('Other Ingredients Panel', ref.otherIngredients);
      }
    }

    // 4. Serving Size, Container Size & Directions Lookup
    if (/\b(serving\w*|dropper\w*|2\s*ml|60\s*ml|bottle size|how to take|when to take|directions|how many drops|liquid|pill\w*|capsule\w*)\b/i.test(qLower) && ref.servingDetails) {
      const sd = ref.servingDetails;
      answerBlocks.push(
        `Product form and serving details (${ref.productVersion || 'supplied label'}): ${sd.productForm || 'Liquid supplement'}, container size ${sd.containerSize || '2 fl. oz. (60 ml)'}, serving size ${sd.servingSize || '2 mL (2 full droppers)'}, servings per bottle: ${sd.servingsPerContainer || 'Approx. 30'}. ${sd.directionsAndTiming || ''}`.trim()
      );
      addCitation('Serving & Container Details', sd);
    }

    // 5. Manufacturer / Company Lookup
    if (/\b(who makes|manufacturer|manufactured|company|where is it made|wilmington|women's health|seller|merchant|vendor)\b/i.test(qLower) && ref.manufacturer) {
      const m = ref.manufacturer;
      answerBlocks.push(
        `The supplied label artwork states: Manufactured for ${m.entity}, ${m.address} (website printed on label: ${m.websitePrintedOnLabel}, UPC: ${m.upc}). ${m.limitation || ''}`.trim()
      );
      addCitation('Label Manufacturer Statement', m);
    }

    // 6. Clinical Evidence / Studies / Efficacy Lookup
    if (/\b(clinical\w*|trial\w*|stud(y|ies)|proven|proof|evidence|does it work|effective|efficacy|guarantee\w* result\w*)\b/i.test(qLower) && ref.clinicalEvidence) {
      const ce = ref.clinicalEvidence;
      answerBlocks.push(
        `${ce.statement} ${ce.limitation || ''}`.trim()
      );
      addCitation('Clinical Evidence Status', ce);
    }

    // 7. Pricing, Packages, Shipping & Billing Terms Lookup
    if (/\b(price\w*|pricing|cost\w*|how much does it cost|package\w*|bundle\w*|shipping|subscription|recurring|auto-ship|autoship|billing|charge\w*|discount\w*)\b/i.test(qLower) && ref.pricingAndPackages) {
      const pp = ref.pricingAndPackages;
      answerBlocks.push(
        `Pricing and billing status (${pp.verificationStatus}): ${pp.summary} ${pp.instructions || ''}`.trim()
      );
      addCitation('Pricing & Checkout Verification Notice', pp);
    }

    // 8. Refund / Guarantee / Return Policy Lookup
    if (/\b(refund\w*|return\w*|money back|money-back|60-day|60 day|guarantee|policy|rma)\b/i.test(qLower) && ref.refundPolicy) {
      const rp = ref.refundPolicy;
      answerBlocks.push(
        `Refund policy status (${rp.verificationStatus}): ${rp.headlineClaim ? rp.headlineClaim + ' ' : ''}${rp.terms}`.trim()
      );
      addCitation('Refund Policy Verification Notice', rp);
    }

    // 9. Honest Unknown Fallback (never echo raw user question unsafely)
    const matchedReference = answerBlocks.length > 0;
    if (!matchedReference) {
      answerBlocks.push(
        `That information is not established in our approved reference data for ${ref.productName || 'this webinar'} (${ref.productVersion || 'current revision'}). This FAQ Assistant only reports verified label fields and documented limitations. Please check the current merchant page or consult a qualified healthcare professional before deciding.`
      );
      addCitation('Unverified / Unknown Topic Fallback', {
        source: ref.primarySourceAsset || 'Approved Product Reference',
        observedAt: ref.observedAt || '2026-11-14',
        verificationStatus: 'UNKNOWN_IN_REFERENCE',
        limitation: 'Information not present in the approved reference dataset.'
      });
    }

    await this._incrementFaqMetric(slug, ctx.isPreview, !matchedReference);

    return {
      ok: true,
      assistantType: 'REFERENCE_FAQ_ASSISTANT',
      assistantLabel: 'Product FAQ Assistant (Driven by Approved Reference Data)',
      llmEnabled: false,
      referenceRevision: ctx.revision,
      productVersion: ref.productVersion || 'Supplied Label Reference',
      matchedReference,
      answer: answerBlocks.join('\n\n'),
      citations
    };
  }

  async _incrementFaqMetric(slug, isPreview, isFallback) {
    return this.withWriteLock(async () => {
      const webinar = this.webinars[slug];
      if (!webinar) return;
      const bucket = isPreview ? webinar.analytics.preview : webinar.analytics.production;
      bucket.faqQuestionsAsked = (bucket.faqQuestionsAsked || 0) + 1;
      if (isFallback) {
        bucket.faqFallbacks = (bucket.faqFallbacks || 0) + 1;
      }
      this.saveWebinarsSync();
    });
  }

  // =========================================================================
  // 6 & 7. PERSISTENT LEAD CAPTURE, SERVER-AUTHORITATIVE CONSENT & BREVO SYNC
  // =========================================================================

  /**
   * Register viewer lead with server-authoritative consent wording, durable persistence,
   * idempotent handling, and honest Brevo synchronization status.
   * Never claims a nonexistent PDF guide was delivered!
   */
  async registerLead(slug, payload = {}, { viewerContextToken, ip = '127.0.0.1', userAgent = 'Unknown' } = {}) {
    this._ensureHealthyState();
    const ctx = this.verifyViewerContext(slug, viewerContextToken);
    if (!ctx.valid) {
      const err = new Error(`Unauthorized registration request: ${ctx.reason}`);
      err.statusCode = ctx.statusCode || 403;
      throw err;
    }

    const cleanEmail = String(payload.email || '').trim().toLowerCase();
    if (!cleanEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail) || cleanEmail.length > 254) {
      const err = new Error('Please provide a valid email address.');
      err.statusCode = 400;
      throw err;
    }

    const cleanName = String(payload.name || '').trim().slice(0, 120);
    // Separate webinar registration request from optional marketing consent
    const registrationRequested = payload.registrationRequested !== false;
    if (!registrationRequested) {
      const err = new Error('Please confirm that you want to save your registration request.');
      err.statusCode = 400;
      throw err;
    }

    const marketingConsentGiven = Boolean(payload.marketingConsentGiven);
    const isPreview = ctx.isPreview; // Strictly server-verified!
    const snapshot = ctx.snapshot;
    const brevoListId = Number(snapshot.registration?.brevoListId || 80);

    const idempotencyKey = `${slug}:${isPreview ? 'preview' : 'prod'}:${cleanEmail}`;
    const nowIso = new Date().toISOString();
    const retentionExpiresAt = new Date(Date.now() + SERVER_CONSENT_CONFIG.retentionDays * 86400 * 1000).toISOString();
    const ipHash = crypto.createHash('sha256').update(`${ip}_${this.sessionSecret}`).digest('hex').slice(0, 24);

    // Step 1: Persist registration record atomically under write lock
    const { record, isDuplicate } = await this.withWriteLock(async () => {
      this._ensureHealthyState();
      const webinar = this.webinars[slug];
      const bucket = isPreview ? webinar.analytics.preview : webinar.analytics.production;
      bucket.registrationAttempts = (bucket.registrationAttempts || 0) + 1;

      let existing = this.registrations.find((r) => r.idempotencyKey === idempotencyKey);
      let duplicate = false;

      if (existing) {
        duplicate = true;
        existing.updatedAt = nowIso;
        existing.name = cleanName || existing.name;
        existing.webinarRevision = ctx.revision;
        // Update consent decision with authoritative server wording
        existing.consent = {
          registrationRequested: true,
          registrationDisclosureText: SERVER_CONSENT_CONFIG.registrationDisclosure,
          marketingConsentGiven,
          marketingConsentText: SERVER_CONSENT_CONFIG.marketingConsentText,
          consentVersion: SERVER_CONSENT_CONFIG.version,
          timestamp: nowIso,
          source: `webinar:${slug}:rev${ctx.revision}`
        };
      } else {
        existing = {
          registrationId: 'reg_' + crypto.randomBytes(12).toString('hex'),
          idempotencyKey,
          slug,
          webinarRevision: ctx.revision,
          isPreview,
          email: cleanEmail,
          name: cleanName,
          consent: {
            registrationRequested: true,
            registrationDisclosureText: SERVER_CONSENT_CONFIG.registrationDisclosure,
            marketingConsentGiven,
            marketingConsentText: SERVER_CONSENT_CONFIG.marketingConsentText,
            consentVersion: SERVER_CONSENT_CONFIG.version,
            timestamp: nowIso,
            source: `webinar:${slug}:rev${ctx.revision}`
          },
          sourceMetadata: {
            sessionId: ctx.sessionId,
            ipHash,
            userAgentSummary: String(userAgent || 'Unknown').slice(0, 160),
            retentionPolicyDays: SERVER_CONSENT_CONFIG.retentionDays,
            retentionExpiresAt
          },
          brevoSync: {
            status: isPreview
              ? 'PREVIEW_SIMULATED'
              : (marketingConsentGiven ? 'CONTACT_SYNC_QUEUED' : 'NOT_APPLICABLE_NO_MARKETING_CONSENT'),
            listId: marketingConsentGiven ? brevoListId : null,
            attempts: 0,
            lastAttemptAt: null,
            syncedAt: null,
            providerResponseId: null,
            lastError: null
          },
          createdAt: nowIso,
          updatedAt: nowIso
        };
        this.registrations.push(existing);
        bucket.registrations = (bucket.registrations || 0) + 1;
      }

      this.saveRegistrationsSync();
      this.saveWebinarsSync();

      return { record: deepClone(existing), isDuplicate: duplicate };
    });

    // Step 2: Execute Brevo contact synchronization if applicable
    let finalRecord = record;
    if (isPreview) {
      finalRecord = await this._updateRegistrationBrevoState(record.registrationId, {
        status: 'PREVIEW_SIMULATED',
        lastError: null
      });
    } else if (!marketingConsentGiven) {
      finalRecord = await this._updateRegistrationBrevoState(record.registrationId, {
        status: 'NOT_APPLICABLE_NO_MARKETING_CONSENT',
        listId: null,
        lastError: null
      });
    } else if (finalRecord.brevoSync.status !== 'CONTACT_SYNCHRONIZED') {
      finalRecord = await this._syncRegistrationToBrevoWithRetry(finalRecord);
    }

    return {
      ok: true,
      registrationId: finalRecord.registrationId,
      isDuplicate,
      isPreview: finalRecord.isPreview,
      webinarRevision: finalRecord.webinarRevision,
      requestSaved: true,
      marketingConsentGiven: finalRecord.consent.marketingConsentGiven,
      consentVersion: finalRecord.consent.consentVersion,
      brevoStatus: finalRecord.brevoSync.status,
      brevoAttempts: finalRecord.brevoSync.attempts,
      brevoError: finalRecord.brevoSync.lastError,
      guideDeliveryStatus: 'NO_GUIDE_ASSET_CONFIGURED',
      message: this._formatRegistrationMessage(finalRecord)
    };
  }

  _formatRegistrationMessage(record) {
    const st = record.brevoSync.status;
    if (record.isPreview || st === 'PREVIEW_SIMULATED') {
      return 'Registration saved locally in preview simulation mode. No contact was sent to Brevo and no email was dispatched.';
    }
    if (!record.consent.marketingConsentGiven || st === 'NOT_APPLICABLE_NO_MARKETING_CONSENT') {
      return 'Registration saved without marketing email opt-in. Your email was not added to a marketing list.';
    }
    if (st === 'CONTACT_SYNCHRONIZED') {
      return 'Registration saved and contact synchronized to Brevo list. (Note: Contact list assignment does not confirm email inbox delivery).';
    }
    if (st === 'CONTACT_SYNC_QUEUED') {
      return 'Registration saved locally. Brevo contact synchronization is queued (live Brevo adapter is disabled in this environment).';
    }
    return `Registration saved locally, but Brevo contact synchronization failed: ${record.brevoSync.lastError || 'Provider unavailable'}.`;
  }

  async _updateRegistrationBrevoState(registrationId, patch) {
    return this.withWriteLock(async () => {
      const reg = this.registrations.find((r) => r.registrationId === registrationId);
      if (!reg) return null;
      reg.brevoSync = {
        ...reg.brevoSync,
        ...patch
      };
      reg.updatedAt = new Date().toISOString();
      this.saveRegistrationsSync();
      return deepClone(reg);
    });
  }

  async _syncRegistrationToBrevoWithRetry(regRecord) {
    // Do not call live Brevo unless explicitly enabled and configured (or using injected test transport)
    if (!this.brevoTransport && (!this.brevoLiveEnabled || !this.brevoApiKey)) {
      return this._updateRegistrationBrevoState(regRecord.registrationId, {
        status: 'CONTACT_SYNC_QUEUED',
        lastError: 'Live Brevo synchronization is disabled in this environment.'
      });
    }

    const maxAttempts = 3;
    let attempt = 0;
    let lastError = null;

    while (attempt < maxAttempts) {
      attempt += 1;
      const attemptAt = new Date().toISOString();
      try {
        const payload = {
          email: regRecord.email,
          attributes: {
            FIRSTNAME: regRecord.name || '',
            WEBINAR_SLUG: regRecord.slug,
            WEBINAR_REVISION: String(regRecord.webinarRevision),
            CONSENT_VERSION: regRecord.consent.consentVersion,
            CONSENT_TIMESTAMP: regRecord.consent.timestamp
          },
          listIds: [Number(regRecord.brevoSync.listId || 80)],
          updateEnabled: true
        };

        let response;
        if (this.brevoTransport) {
          response = await this.brevoTransport(payload, { attempt });
        } else {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4000);
          try {
            const res = await fetch('https://api.brevo.com/v3/contacts', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'api-key': this.brevoApiKey
              },
              body: JSON.stringify(payload),
              signal: controller.signal
            });
            const bodyText = await res.text();
            let bodyJson = {};
            try { bodyJson = JSON.parse(bodyText); } catch (e) {}
            response = {
              ok: res.ok,
              status: res.status,
              body: bodyJson
            };
          } finally {
            clearTimeout(timer);
          }
        }

        if (response.ok && (response.status === 201 || response.status === 204 || response.status === 200)) {
          return this._updateRegistrationBrevoState(regRecord.registrationId, {
            status: 'CONTACT_SYNCHRONIZED',
            attempts: (regRecord.brevoSync.attempts || 0) + attempt,
            lastAttemptAt: attemptAt,
            syncedAt: attemptAt,
            providerResponseId: response.body?.id ? String(response.body.id) : `http_${response.status}`,
            lastError: null
          });
        }

        // Do NOT treat duplicate_parameter as proof of list assignment!
        lastError = response.body?.message || `Brevo HTTP ${response.status}`;
        // If 4xx client error (except 429 rate limit), do not retry
        if (response.status >= 400 && response.status < 500 && response.status !== 429) {
          break;
        }
      } catch (err) {
        lastError = err.name === 'AbortError' ? 'Brevo API request timed out' : err.message;
      }

      if (attempt < maxAttempts) {
        await new Promise((r) => setTimeout(r, 50 * attempt));
      }
    }

    return this._updateRegistrationBrevoState(regRecord.registrationId, {
      status: 'FAILED',
      attempts: (regRecord.brevoSync.attempts || 0) + attempt,
      lastAttemptAt: new Date().toISOString(),
      lastError: lastError || 'Brevo synchronization failed after bounded retries'
    });
  }

  getRegistrationsForWebinar(slug) {
    this._ensureHealthyState();
    return this.registrations.filter((r) => r.slug === slug).map((r) => deepClone(r));
  }

  // =========================================================================
  // 8. INTERVAL-BASED VIEWING ANALYTICS (SEEK, REPLAY, COMPLETION & DEDUPLICATION)
  // =========================================================================

  /**
   * Track viewer telemetry using server-verified viewerContextToken and watched intervals.
   * - Never trusts client-supplied `isPreview` flag.
   * - Scopes sessions by `${slug}:${mode}:${sessionId}`.
   * - Deduplicates repeated `eventId`s.
   * - Tracks watched intervals `[startSec, endSec]` so forward seeks do not block subsequent legitimate viewing,
   *   skipped segments are never counted, and backward seeks / replays increment `totalPlaybackSeconds` while
   *   keeping `uniqueWatchedSeconds` accurate.
   * - Computes milestones (`p25`, `p50`, `p75`, `p100`) server-side from actual `uniqueWatchedSeconds / durationSeconds`.
   */
  async trackEvent(slug, payload = {}, { viewerContextToken, userAgent = '' } = {}) {
    this._ensureHealthyState();
    const ctx = this.verifyViewerContext(slug, viewerContextToken);
    if (!ctx.valid) {
      const err = new Error(`Unauthorized analytics event: ${ctx.reason}`);
      err.statusCode = ctx.statusCode || 403;
      throw err;
    }

    // Filter obvious bots/spiders
    if (/bot|crawler|spider|headlesschrome\/0/i.test(String(userAgent))) {
      return { ok: true, ignoredBot: true };
    }

    const eventType = String(payload.eventType || '').trim();
    const allowedEvents = ['pageview', 'playback_start', 'watch_interval', 'pause', 'resume', 'seek', 'cta_impression', 'cta_click'];
    if (!allowedEvents.includes(eventType)) {
      const err = new Error(`Unsupported eventType "${eventType}".`);
      err.statusCode = 400;
      throw err;
    }

    const rawSessionId = String(payload.sessionId || ctx.sessionId || 'default').slice(0, 80);
    const scopedSessionKey = `${slug}:${ctx.mode}:${rawSessionId}`;
    const eventId = payload.eventId ? String(payload.eventId).slice(0, 100) : null;
    const durationSeconds = Math.max(1, Number(ctx.snapshot.video?.durationSeconds) || 30);

    return this.withWriteLock(async () => {
      this._ensureHealthyState();
      const webinar = this.webinars[slug];
      const bucket = ctx.isPreview ? webinar.analytics.preview : webinar.analytics.production;
      const nowMs = Date.now();

      let session = this.sessions[scopedSessionKey];
      if (!session) {
        session = {
          scopedSessionKey,
          slug,
          mode: ctx.mode,
          isPreview: ctx.isPreview,
          revision: ctx.revision,
          startedAtMs: nowMs,
          updatedAtMs: nowMs,
          hasStartedPlayback: false,
          hasCtaImpression: false,
          watchedIntervals: [],
          uniqueWatchedSeconds: 0,
          totalPlaybackSeconds: 0,
          milestonesReached: { p25: false, p50: false, p75: false, p100: false },
          processedEventIds: []
        };
        this.sessions[scopedSessionKey] = session;
        bucket.uniqueSessions = (bucket.uniqueSessions || 0) + 1;
      }

      // Idempotency check: ignore duplicate eventId
      if (eventId) {
        if (session.processedEventIds.includes(eventId)) {
          return {
            ok: true,
            deduplicated: true,
            isPreview: ctx.isPreview,
            sessionMetrics: {
              uniqueWatchedSeconds: session.uniqueWatchedSeconds,
              totalPlaybackSeconds: session.totalPlaybackSeconds,
              milestonesReached: session.milestonesReached
            }
          };
        }
        session.processedEventIds.push(eventId);
        if (session.processedEventIds.length > this.maxEventsPerSession) {
          session.processedEventIds.shift();
        }
      }

      session.updatedAtMs = nowMs;

      if (eventType === 'pageview') {
        bucket.visitsTotal = (bucket.visitsTotal || 0) + 1;
      } else if (eventType === 'playback_start') {
        if (!session.hasStartedPlayback) {
          session.hasStartedPlayback = true;
          bucket.playbackStarts = (bucket.playbackStarts || 0) + 1;
        }
      } else if (eventType === 'seek') {
        bucket.seekEvents = (bucket.seekEvents || 0) + 1;
      } else if (eventType === 'watch_interval') {
        const rawStart = Number(payload.intervalStart);
        const rawEnd = Number(payload.intervalEnd);
        const playbackRate = Math.min(Math.max(Number(payload.playbackRate) || 1.0, 0.25), 2.0);
        const elapsedWallMs = payload.elapsedWallMs !== undefined ? Number(payload.elapsedWallMs) : null;
        const visibilityState = String(payload.visibilityState || 'visible');

        if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd) || rawEnd <= rawStart || rawStart < 0) {
          const err = new Error('Invalid watch_interval bounds: intervalStart and intervalEnd must satisfy 0 <= start < end.');
          err.statusCode = 400;
          throw err;
        }

        const clampedStart = Math.min(Math.max(0, rawStart), durationSeconds);
        const clampedEnd = Math.min(Math.max(0, rawEnd), durationSeconds);
        const segmentDuration = Number((clampedEnd - clampedStart).toFixed(2));

        // Reject implausibly large single-interval jumps (> 15s in one report)
        if (segmentDuration <= 0 || segmentDuration > 15) {
          const err = new Error(`Rejected watch_interval of length ${segmentDuration}s (exceeds 15s single-interval bound).`);
          err.statusCode = 400;
          throw err;
        }

        // If elapsedWallMs is provided, verify the media delta is physically plausible given playbackRate
        if (elapsedWallMs !== null && Number.isFinite(elapsedWallMs)) {
          const maxPossibleMediaSec = ((elapsedWallMs / 1000) * playbackRate) + 1.75;
          if (segmentDuration > maxPossibleMediaSec) {
            const err = new Error(`Rejected watch_interval: media delta ${segmentDuration}s exceeds elapsed wall time allowance.`);
            err.statusCode = 400;
            throw err;
          }
        }

        // Policy for hidden tabs: do not count hidden-tab background playback as active watched content
        if (visibilityState === 'hidden') {
          bucket.backgroundIgnoredSeconds = Number(((bucket.backgroundIgnoredSeconds || 0) + segmentDuration).toFixed(2));
        } else {
          if (!session.hasStartedPlayback) {
            session.hasStartedPlayback = true;
            bucket.playbackStarts = (bucket.playbackStarts || 0) + 1;
          }

          const prevUnique = session.uniqueWatchedSeconds || 0;
          session.watchedIntervals = mergeIntervals([...session.watchedIntervals, [clampedStart, clampedEnd]]);
          const newUnique = Math.min(durationSeconds, sumIntervals(session.watchedIntervals));
          const addedUnique = Math.max(0, Number((newUnique - prevUnique).toFixed(2)));

          session.uniqueWatchedSeconds = newUnique;
          session.totalPlaybackSeconds = Number(((session.totalPlaybackSeconds || 0) + segmentDuration).toFixed(2));

          bucket.uniqueWatchedSeconds = Number(((bucket.uniqueWatchedSeconds || 0) + addedUnique).toFixed(2));
          bucket.totalPlaybackSeconds = Number(((bucket.totalPlaybackSeconds || 0) + segmentDuration).toFixed(2));
          bucket.averageUniqueWatchSeconds = bucket.playbackStarts > 0
            ? Number((bucket.uniqueWatchedSeconds / bucket.playbackStarts).toFixed(1))
            : 0;

          // Compute completion milestones from actual unique content coverage
          const coverageRatio = newUnique / durationSeconds;
          if (coverageRatio >= 0.25 && !session.milestonesReached.p25) {
            session.milestonesReached.p25 = true;
            bucket.milestones.p25 = (bucket.milestones.p25 || 0) + 1;
          }
          if (coverageRatio >= 0.50 && !session.milestonesReached.p50) {
            session.milestonesReached.p50 = true;
            bucket.milestones.p50 = (bucket.milestones.p50 || 0) + 1;
          }
          if (coverageRatio >= 0.75 && !session.milestonesReached.p75) {
            session.milestonesReached.p75 = true;
            bucket.milestones.p75 = (bucket.milestones.p75 || 0) + 1;
          }
          if (coverageRatio >= 0.95 && !session.milestonesReached.p100) {
            session.milestonesReached.p100 = true;
            bucket.milestones.p100 = (bucket.milestones.p100 || 0) + 1;
            bucket.completedSessions = (bucket.completedSessions || 0) + 1;
          }
        }
      } else if (eventType === 'cta_impression') {
        if (!session.hasCtaImpression) {
          session.hasCtaImpression = true;
          bucket.ctaImpressions = (bucket.ctaImpressions || 0) + 1;
        }
      } else if (eventType === 'cta_click') {
        bucket.ctaClicks = (bucket.ctaClicks || 0) + 1;
      }

      this.saveSessionsSync();
      this.saveWebinarsSync();

      return {
        ok: true,
        deduplicated: false,
        isPreview: ctx.isPreview,
        mode: ctx.mode,
        sessionMetrics: {
          uniqueWatchedSeconds: session.uniqueWatchedSeconds,
          totalPlaybackSeconds: session.totalPlaybackSeconds,
          watchedIntervals: session.watchedIntervals,
          milestonesReached: session.milestonesReached
        },
        analytics: deepClone(bucket)
      };
    });
  }
}

const webinarEngine = new WebinarEngine();

module.exports = {
  WebinarEngine,
  webinarEngine,
  WEBINAR_STATES,
  SERVER_CONSENT_CONFIG,
  getYuSleepApprovedReference,
  mergeIntervals,
  sumIntervals
};
