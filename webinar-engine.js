/**
 * Webinar Engine: In-House Presenter-Led On-Demand Webinar Platform
 *
 * Security, Integrity & Compliance Architecture:
 * 1. Server-side admin authentication & role-based authorization (401 / 403) + CSRF protection + HTTPS-only production cookies.
 * 2. Revision-scoped, expiring, revocable preview links (stored as SHA-256 hashes) + HMAC-signed viewer context tokens.
 * 3. Strict separation of mutable draft revisions and immutable published snapshots (never silently substitutes newer revisions).
 * 4. Verified product reference facts with source asset, observation date, product version, and limitation metadata.
 * 5. Reference-driven Product FAQ Assistant (non-AI, dynamically reading active snapshot reference data).
 * 6. Single-writer cross-process lock + multi-file write-ahead rollback journal for crash-safe atomic persistence.
 * 7. Durable Brevo contact synchronization outbox with worker locking, consent-withdrawal cancellation, and bounded backoff retries.
 * 8. Interval-based watch analytics strictly bound to the signed viewerContextToken sessionId.
 * 9. Zero em dashes in code, copy, or responses.
 */

const fs = require('fs');
const os = require('os');
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
  version: '2026-11-15.v3',
  registrationDisclosure: 'Save my webinar registration and reference summary request.',
  marketingConsentText: 'Optional: I agree to receive email updates and product analysis notices. I can unsubscribe at any time.',
  retentionDays: 90,
  privacyPolicyUrl: '/privacy'
});

// Tracks active single-writer locks within the current Node process by resolved lockfile path
const ACTIVE_PROCESS_LOCKS = new Map();

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
    backgroundIgnoredSeconds: 0,
    telemetryTrustLevel: 'CLIENT_REPORTED_BOUND_TO_SIGNED_SESSION',
    sessionRefreshPolicy: 'NEW_SIGNED_SESSION_ON_PAGE_LOAD'
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
        refundedCommissionsUsd: 0.00,
        telemetryTrustLevel: 'CLIENT_REPORTED_BOUND_TO_SIGNED_SESSION',
        sessionRefreshPolicy: 'NEW_SIGNED_SESSION_ON_PAGE_LOAD'
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
    this.instanceId = `weng_${crypto.randomBytes(8).toString('hex')}`;
    this.dataDir = options.dataDir || process.env.WEBINAR_DATA_DIR || __dirname;
    this.webinarsFile = options.webinarsFile || path.join(this.dataDir, 'webinars.json');
    this.registrationsFile = options.registrationsFile || path.join(this.dataDir, 'webinar-registrations.json');
    this.sessionsFile = options.sessionsFile || path.join(this.dataDir, 'webinar-sessions.json');
    this.outboxFile = options.outboxFile || path.join(this.dataDir, 'webinar-brevo-outbox.json');
    this.journalFile = options.journalFile || path.join(this.dataDir, 'webinar-tx-journal.json');
    this.lockFile = options.lockFile || path.join(this.dataDir, 'webinar-store.lock');
    this.readOnly = Boolean(options.readOnly);

    // Environment & Proxy Security Configuration
    this.nodeEnv = String(options.nodeEnv || process.env.NODE_ENV || 'development').toLowerCase().trim();
    this.isProduction = this.nodeEnv === 'production';
    this.trustProxy = options.trustProxy !== undefined
      ? Boolean(options.trustProxy)
      : (process.env.WEBINAR_TRUST_PROXY === 'true');
    const rawTrustedProxies = options.trustedProxyIps !== undefined
      ? options.trustedProxyIps
      : (process.env.WEBINAR_TRUSTED_PROXY_IPS || '127.0.0.1,::1,::ffff:127.0.0.1');
    this.trustedProxyIps = new Set(
      (Array.isArray(rawTrustedProxies) ? rawTrustedProxies : String(rawTrustedProxies).split(','))
        .map((s) => String(s).trim())
        .filter(Boolean)
    );

    this.autoSeed = options.autoSeed !== undefined ? Boolean(options.autoSeed) : true;
    this.adminToken = options.adminToken !== undefined ? options.adminToken : (process.env.WEBINAR_ADMIN_TOKEN || process.env.ADMIN_API_TOKEN || '');
    this.viewerToken = options.viewerToken !== undefined ? options.viewerToken : (process.env.WEBINAR_VIEWER_TOKEN || '');
    this._explicitSessionSecret = options.sessionSecret !== undefined ? options.sessionSecret : (process.env.WEBINAR_SESSION_SECRET || '');
    this.sessionSecret = this._explicitSessionSecret || crypto.createHash('sha256').update(`webinar_secret_${this.dataDir}_${this.adminToken || 'local'}`).digest('hex');

    // Brevo Live Adapter & Durable Outbox Control: Disabled by default in development/test to prevent contacting live Brevo
    this.brevoLiveEnabled = options.brevoLiveEnabled !== undefined
      ? Boolean(options.brevoLiveEnabled)
      : (process.env.WEBINAR_BREVO_LIVE === 'true');
    this.brevoApiKey = options.brevoApiKey !== undefined ? options.brevoApiKey : (process.env.BREVO_API_KEY || '');
    this.brevoTransport = options.brevoTransport || null; // Injectable for testing retries/timeouts/failures
    this.outboxMaxAttempts = options.outboxMaxAttempts || 3;
    this.outboxBaseBackoffMs = options.outboxBaseBackoffMs !== undefined ? Number(options.outboxBaseBackoffMs) : 5000;
    this.outboxLockTtlMs = options.outboxLockTtlMs !== undefined ? Number(options.outboxLockTtlMs) : 30000;
    this.outboxRequestTimeoutMs = options.outboxRequestTimeoutMs !== undefined ? Number(options.outboxRequestTimeoutMs) : 4000;

    // Retention & Abuse Bounds
    this.maxSessions = options.maxSessions || 2000;
    this.maxRateLimitEntries = options.maxRateLimitEntries || 1000;
    this.maxEventsPerSession = options.maxEventsPerSession || 500;
    this.maxTrackCallsPerMinute = options.maxTrackCallsPerMinute || 180;
    this.sessionTtlMs = options.sessionTtlMs || (7 * 24 * 60 * 60 * 1000);

    // State
    this.webinars = {};
    this.registrations = [];
    this.sessions = {};
    this.brevoOutbox = [];
    this.adminSessions = new Map();
    this.qaRateLimits = new Map();
    this.trackRateLimits = new Map();
    this.corruptStateError = null;
    this.lastJournalRecovery = null;
    this.lastStaleLockRecovery = null;
    this._closed = false;

    // Async mutex queue for concurrency-safe persistence
    this._writeQueue = Promise.resolve();
    this._simulateWriteFailure = false;
    this._failOnWriteIndex = null;
    this._failOnFileKey = null;
    this._simulateActiveLockPid = options.simulateActiveLockPid || null;

    // Validate production security requirements before acquiring lock or loading state
    this.validateProductionConfig();

    // Acquire exclusive single-writer lock on dataDir
    if (!this.readOnly) {
      this._acquireSingleWriterLock();
    }

    try {
      this.loadState();
    } catch (initErr) {
      this.close();
      throw initErr;
    }

    this._exitHandler = () => {
      try {
        this.close();
      } catch (_) {}
    };
    process.once('exit', this._exitHandler);
  }

  /**
   * Validate production secrets & security requirements
   */
  validateProductionConfig() {
    if (!this.isProduction) return;

    const weakTokenPattern = /^(changeme|default|admin|secret|password|test|123456|token|admin-token|session-secret)$/i;
    const cleanAdmin = String(this.adminToken || '').trim();
    const cleanSecret = String(this._explicitSessionSecret || '').trim();

    if (!cleanAdmin || cleanAdmin.length < 32 || weakTokenPattern.test(cleanAdmin)) {
      const err = new Error(
        'Production security configuration invalid: WEBINAR_ADMIN_TOKEN must be explicitly configured with a strong secret of at least 32 characters.'
      );
      err.code = 'PRODUCTION_CONFIG_INVALID';
      err.statusCode = 500;
      throw err;
    }

    if (!cleanSecret || cleanSecret.length < 32 || weakTokenPattern.test(cleanSecret) || cleanSecret === cleanAdmin) {
      const err = new Error(
        'Production security configuration invalid: WEBINAR_SESSION_SECRET must be explicitly configured with a distinct strong secret of at least 32 characters.'
      );
      err.code = 'PRODUCTION_CONFIG_INVALID';
      err.statusCode = 500;
      throw err;
    }
  }

  /**
   * Check whether a process PID is alive on this host
   */
  _isPidAlive(pid) {
    const numPid = Number(pid);
    if (!Number.isInteger(numPid) || numPid <= 0) return false;
    if (this._simulateActiveLockPid && numPid === Number(this._simulateActiveLockPid)) {
      return true;
    }
    try {
      process.kill(numPid, 0);
      return true;
    } catch (err) {
      return err && err.code === 'EPERM';
    }
  }

  /**
   * Enforce Single-Writer Persistence Model via cross-process and in-process lockfile
   */
  _acquireSingleWriterLock() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    const resolvedLockPath = path.resolve(this.lockFile);

    if (ACTIVE_PROCESS_LOCKS.has(resolvedLockPath)) {
      const holderId = ACTIVE_PROCESS_LOCKS.get(resolvedLockPath);
      const err = new Error(
        `Concurrent writer rejected: WebinarEngine instance "${holderId}" in PID ${process.pid} already holds the single-writer lock on ${this.dataDir}. This JSON persistence store requires a single-writer deployment or an external transactional database.`
      );
      err.code = 'CONCURRENT_WRITER_REJECTED';
      err.statusCode = 503;
      throw err;
    }

    const lockPayload = {
      instanceId: this.instanceId,
      pid: process.pid,
      hostname: os.hostname(),
      dataDir: this.dataDir,
      persistenceModel: 'SINGLE_WRITER_JSON_STORE_WITH_JOURNAL',
      acquiredAt: new Date().toISOString()
    };

    const writeLockExclusive = () => {
      const fd = fs.openSync(this.lockFile, 'wx', 0o600);
      try {
        fs.writeFileSync(fd, JSON.stringify(lockPayload, null, 2), 'utf8');
        fs.fsyncSync(fd);
      } finally {
        fs.closeSync(fd);
      }
      ACTIVE_PROCESS_LOCKS.set(resolvedLockPath, this.instanceId);
    };

    try {
      writeLockExclusive();
    } catch (err) {
      if (err.code !== 'EEXIST') {
        throw err;
      }

      // Lockfile exists: inspect whether the holder is still alive or stale from a crashed process
      let existingLock = null;
      try {
        existingLock = JSON.parse(fs.readFileSync(this.lockFile, 'utf8'));
      } catch (_) {}

      const existingPid = existingLock?.pid ? Number(existingLock.pid) : null;
      const sameHost = !existingLock?.hostname || existingLock.hostname === os.hostname();
      const pidAlive = existingPid && sameHost ? this._isPidAlive(existingPid) : false;

      if (pidAlive && existingPid !== process.pid) {
        const lockErr = new Error(
          `Concurrent writer rejected: PID ${existingPid} (instance ${existingLock.instanceId || 'unknown'}) already holds the active single-writer lock at ${this.lockFile}. Do not run multiple writer replicas against the same JSON data directory.`
        );
        lockErr.code = 'CONCURRENT_WRITER_REJECTED';
        lockErr.statusCode = 503;
        throw lockErr;
      }

      // Stale lock left behind by a dead/crashed process: reclaim safely
      this.lastStaleLockRecovery = {
        recoveredAt: new Date().toISOString(),
        stalePid: existingPid,
        staleInstanceId: existingLock?.instanceId || null,
        staleAcquiredAt: existingLock?.acquiredAt || null
      };
      try {
        fs.unlinkSync(this.lockFile);
      } catch (_) {}
      writeLockExclusive();
    }
  }

  /**
   * Release the single-writer lock cleanly
   */
  close() {
    if (this._closed) return;
    this._closed = true;
    const resolvedLockPath = path.resolve(this.lockFile);
    if (ACTIVE_PROCESS_LOCKS.get(resolvedLockPath) === this.instanceId) {
      ACTIVE_PROCESS_LOCKS.delete(resolvedLockPath);
    }
    try {
      if (fs.existsSync(this.lockFile)) {
        const current = JSON.parse(fs.readFileSync(this.lockFile, 'utf8'));
        if (current && current.instanceId === this.instanceId) {
          fs.unlinkSync(this.lockFile);
        }
      }
    } catch (_) {}
    if (this._exitHandler) {
      process.removeListener('exit', this._exitHandler);
      this._exitHandler = null;
    }
  }

  /**
   * Describe the active persistence deployment model and lock status
   */
  getPersistenceModelInfo() {
    return {
      model: 'SINGLE_WRITER_JSON_STORE_WITH_JOURNAL',
      supportsHorizontalMultiWriter: false,
      horizontalScalingRequirement: 'Requires single-writer deployment topology for JSON files or migration to PostgreSQL/Redis before running multiple writer replicas.',
      instanceId: this.instanceId,
      pid: process.pid,
      dataDir: this.dataDir,
      lockFile: this.lockFile,
      journalFile: this.journalFile,
      outboxFile: this.outboxFile,
      lastJournalRecovery: this.lastJournalRecovery,
      lastStaleLockRecovery: this.lastStaleLockRecovery
    };
  }

  /**
   * Configure fault injection for testing single-file and multi-file transactional rollback
   */
  configureWriteFaultInjection({ failAll = false, failOnWriteIndex = null, failOnFileKey = null } = {}) {
    this._simulateWriteFailure = Boolean(failAll);
    this._failOnWriteIndex = failOnWriteIndex !== null && failOnWriteIndex !== undefined ? Number(failOnWriteIndex) : null;
    this._failOnFileKey = failOnFileKey || null;
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
   * Low-level atomic file write: write to temp file, fsync, and rename
   */
  _rawAtomicWriteJsonSync(filePath, data) {
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
   * Check whether a simulated write failure should fire for the given file write step
   */
  _checkFaultInjection(writeIndex = 0, fileKey = null) {
    if (this._simulateWriteFailure) {
      const err = new Error('SIMULATED_PERSISTENCE_WRITE_FAILURE');
      err.code = 'PERSISTENCE_WRITE_FAILED';
      err.statusCode = 500;
      throw err;
    }
    if (this._failOnWriteIndex !== null && this._failOnWriteIndex !== undefined && Number(this._failOnWriteIndex) === writeIndex) {
      const err = new Error(`SIMULATED_PERSISTENCE_WRITE_FAILURE_AT_INDEX_${writeIndex}_${fileKey || 'UNKNOWN'}`);
      err.code = 'PERSISTENCE_WRITE_FAILED';
      err.statusCode = 500;
      throw err;
    }
    if (this._failOnFileKey && fileKey && this._failOnFileKey === fileKey) {
      const err = new Error(`SIMULATED_PERSISTENCE_WRITE_FAILURE_FOR_${fileKey}`);
      err.code = 'PERSISTENCE_WRITE_FAILED';
      err.statusCode = 500;
      throw err;
    }
  }

  _atomicWriteJsonSync(filePath, data, writeIndex = 0, fileKey = null) {
    this._checkFaultInjection(writeIndex, fileKey);
    this._rawAtomicWriteJsonSync(filePath, data);
  }

  /**
   * Recover any uncommitted multi-file transaction journal left behind by an interrupted write or crash
   */
  _recoverTransactionJournalSync() {
    if (!fs.existsSync(this.journalFile)) return;
    let journal = null;
    try {
      journal = JSON.parse(fs.readFileSync(this.journalFile, 'utf8'));
    } catch (err) {
      // Corrupt journal file itself means no target file write was started yet; remove corrupt journal
      try { fs.unlinkSync(this.journalFile); } catch (_) {}
      return;
    }

    if (journal && Array.isArray(journal.files)) {
      const restoredKeys = [];
      for (const entry of journal.files) {
        if (!entry || !entry.filePath) continue;
        if (entry.existedBefore && entry.beforeData !== undefined) {
          this._rawAtomicWriteJsonSync(entry.filePath, entry.beforeData);
          restoredKeys.push(entry.key || path.basename(entry.filePath));
        } else if (!entry.existedBefore && fs.existsSync(entry.filePath)) {
          try { fs.unlinkSync(entry.filePath); } catch (_) {}
          restoredKeys.push(entry.key || path.basename(entry.filePath));
        }
      }
      this.lastJournalRecovery = {
        recoveredAt: new Date().toISOString(),
        txId: journal.txId || 'unknown',
        filesRestored: restoredKeys
      };
    }

    try {
      if (fs.existsSync(this.journalFile)) {
        fs.unlinkSync(this.journalFile);
      }
    } catch (_) {}
  }

  /**
   * Execute an atomic, recoverable transaction across in-memory state and one or more JSON files on disk.
   * - Clones working state before running `mutatorFn(workingState, markTouched)`.
   * - Validates all inputs before committing.
   * - Writes a rollback journal (`webinar-tx-journal.json`) before modifying target files.
   * - If any target file write fails (including the 2nd or 3rd file in a multi-file write),
   *   restores all touched disk files from the journal and leaves `this.*` in-memory state untouched.
   */
  async _commitTransaction(mutatorFn) {
    return this.withWriteLock(async () => {
      this._ensureHealthyState();
      if (this._closed) {
        const err = new Error('WebinarEngine instance is closed.');
        err.statusCode = 503;
        throw err;
      }

      const workingState = {
        webinars: deepClone(this.webinars),
        registrations: deepClone(this.registrations),
        sessions: deepClone(this.sessions),
        brevoOutbox: deepClone(this.brevoOutbox)
      };

      const touchedKeys = new Set();
      const markTouched = (...keys) => {
        for (const k of keys) {
          if (k) touchedKeys.add(k);
        }
      };

      const outcome = await mutatorFn(workingState, markTouched);

      if (touchedKeys.size === 0) {
        return outcome;
      }

      if (touchedKeys.has('sessions')) {
        this._pruneSessionsMap(workingState.sessions);
      }

      const orderedKeys = ['registrations', 'sessions', 'brevoOutbox', 'webinars'].filter((k) => touchedKeys.has(k));
      const targetDescriptor = {
        registrations: {
          filePath: this.registrationsFile,
          beforeData: this.registrations,
          afterData: workingState.registrations
        },
        sessions: {
          filePath: this.sessionsFile,
          beforeData: this.sessions,
          afterData: workingState.sessions
        },
        brevoOutbox: {
          filePath: this.outboxFile,
          beforeData: this.brevoOutbox,
          afterData: workingState.brevoOutbox
        },
        webinars: {
          filePath: this.webinarsFile,
          beforeData: this.webinars,
          afterData: workingState.webinars
        }
      };

      const journalPayload = {
        txId: `tx_${crypto.randomBytes(8).toString('hex')}`,
        startedAt: new Date().toISOString(),
        status: 'COMMITTING',
        files: orderedKeys.map((k) => ({
          key: k,
          filePath: targetDescriptor[k].filePath,
          existedBefore: fs.existsSync(targetDescriptor[k].filePath),
          beforeData: deepClone(targetDescriptor[k].beforeData)
        }))
      };

      // 1. Persist rollback journal before touching any target file
      this._rawAtomicWriteJsonSync(this.journalFile, journalPayload);

      // 2. Write each touched file in order; roll back disk and abort memory swap if any step fails
      try {
        for (let i = 0; i < orderedKeys.length; i++) {
          const key = orderedKeys[i];
          const desc = targetDescriptor[key];
          this._atomicWriteJsonSync(desc.filePath, desc.afterData, i, key);
        }
      } catch (writeErr) {
        for (const backup of journalPayload.files) {
          try {
            if (backup.existedBefore) {
              this._rawAtomicWriteJsonSync(backup.filePath, backup.beforeData);
            } else if (fs.existsSync(backup.filePath)) {
              fs.unlinkSync(backup.filePath);
            }
          } catch (_) {}
        }
        try {
          if (fs.existsSync(this.journalFile)) {
            fs.unlinkSync(this.journalFile);
          }
        } catch (_) {}
        throw writeErr;
      }

      // 3. Remove journal and swap committed working state into memory
      try {
        if (fs.existsSync(this.journalFile)) {
          fs.unlinkSync(this.journalFile);
        }
      } catch (_) {}

      if (touchedKeys.has('webinars')) this.webinars = workingState.webinars;
      if (touchedKeys.has('registrations')) this.registrations = workingState.registrations;
      if (touchedKeys.has('sessions')) this.sessions = workingState.sessions;
      if (touchedKeys.has('brevoOutbox')) this.brevoOutbox = workingState.brevoOutbox;

      return outcome;
    });
  }

  /**
   * Normalize legacy webinars.json records (if migrating from v1 flat structure) into v2 draft/publishedSnapshot structure
   */
  _normalizeWebinarRecord(slug, raw) {
    if (!raw || typeof raw !== 'object') {
      throw new Error(`Invalid webinar record for slug "${slug}"`);
    }
    if (raw.draft && typeof raw.draft === 'object') {
      if (!raw.analytics || !raw.analytics.production) {
        raw.analytics = {
          production: createEmptyAnalyticsBucket(),
          preview: createEmptyAnalyticsBucket(),
          salesAttributionStatus: raw.analytics?.salesAttributionStatus || 'NOT_CONNECTED',
          confirmedSales: raw.analytics?.confirmedSales || 0,
          confirmedRevenueUsd: raw.analytics?.confirmedRevenueUsd || 0,
          pendingCommissionsUsd: 0,
          refundedCommissionsUsd: 0,
          telemetryTrustLevel: 'CLIENT_REPORTED_BOUND_TO_SIGNED_SESSION',
          sessionRefreshPolicy: 'NEW_SIGNED_SESSION_ON_PAGE_LOAD'
        };
      } else {
        raw.analytics.telemetryTrustLevel = 'CLIENT_REPORTED_BOUND_TO_SIGNED_SESSION';
        raw.analytics.sessionRefreshPolicy = 'NEW_SIGNED_SESSION_ON_PAGE_LOAD';
      }
      if (!Array.isArray(raw.previewLinks)) raw.previewLinks = [];
      if (!Array.isArray(raw.versionHistory)) raw.versionHistory = [];
      if (!Array.isArray(raw.auditLog)) raw.auditLog = [];
      if (!raw.approval) {
        raw.approval = { approvedRevision: null, approvedAt: null, approvedBy: null, note: null };
      }
      if (slug === 'yu-sleep' && raw.draft.reference) {
        const b2 = (raw.draft.reference.labelDisclosedIngredients || []).find((i) => i.name && i.name.includes('B2'));
        if (!b2 || b2.amount === '1.7 mg' || !raw.draft.reference.manufacturer) {
          raw.draft.reference = getYuSleepApprovedReference();
        }
      }
      return raw;
    }

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
        refundedCommissionsUsd: 0.00,
        telemetryTrustLevel: 'CLIENT_REPORTED_BOUND_TO_SIGNED_SESSION',
        sessionRefreshPolicy: 'NEW_SIGNED_SESSION_ON_PAGE_LOAD'
      }
    };
  }

  /**
   * Load state from disk.
   * CRITICAL:
   * 1. Recover any uncommitted multi-file transaction journal first.
   * 2. Never silently reset corrupt state files to seed data!
   */
  loadState() {
    this.corruptStateError = null;

    if (!this.readOnly) {
      this._recoverTransactionJournalSync();
    }

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
      if (!this.readOnly) {
        this._rawAtomicWriteJsonSync(this.webinarsFile, this.webinars);
      }
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
      if (this.autoSeed && !this.readOnly) {
        this._rawAtomicWriteJsonSync(this.registrationsFile, this.registrations);
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
      if (this.autoSeed && !this.readOnly) {
        this._rawAtomicWriteJsonSync(this.sessionsFile, this.sessions);
      }
    }

    // 4. Durable Brevo Outbox file
    if (fs.existsSync(this.outboxFile)) {
      try {
        const rawOutbox = JSON.parse(fs.readFileSync(this.outboxFile, 'utf8'));
        if (!Array.isArray(rawOutbox)) {
          throw new Error('Root of webinar-brevo-outbox.json must be an array');
        }
        this.brevoOutbox = rawOutbox;
      } catch (err) {
        this.corruptStateError = new Error(`[WebinarEngine] Corrupt Brevo outbox file at ${this.outboxFile}: ${err.message}`);
        throw this.corruptStateError;
      }
    } else {
      this.brevoOutbox = [];
      if (this.autoSeed && !this.readOnly) {
        this._rawAtomicWriteJsonSync(this.outboxFile, this.brevoOutbox);
      }
    }
  }

  _ensureHealthyState() {
    if (this.corruptStateError) {
      throw this.corruptStateError;
    }
  }

  _pruneSessionsMap(sessionsMap) {
    const keys = Object.keys(sessionsMap);
    const now = Date.now();
    for (const k of keys) {
      const s = sessionsMap[k];
      if (!s || (now - (s.updatedAtMs || s.startedAtMs || 0)) > this.sessionTtlMs) {
        delete sessionsMap[k];
      }
    }
    const remainingKeys = Object.keys(sessionsMap);
    if (remainingKeys.length > this.maxSessions) {
      remainingKeys
        .sort((a, b) => (sessionsMap[a].updatedAtMs || 0) - (sessionsMap[b].updatedAtMs || 0))
        .slice(0, remainingKeys.length - this.maxSessions)
        .forEach((k) => delete sessionsMap[k]);
    }
  }

  // =========================================================================
  // 1. ADMIN AUTHENTICATION, AUTHORIZATION, CSRF & HTTPS COOKIE SECURITY
  // =========================================================================

  /**
   * Determine whether an incoming HTTP request is encrypted over HTTPS
   * Only trusts X-Forwarded-Proto: https when this.trustProxy === true AND the connection comes from a trusted proxy IP.
   */
  isRequestSecure(req) {
    if (!req) return false;
    if (req.socket && req.socket.encrypted === true) return true;
    if (req.connection && req.connection.encrypted === true) return true;

    if (this.trustProxy === true) {
      const remoteIp = String(req.socket?.remoteAddress || req.connection?.remoteAddress || '').trim();
      if (this.trustedProxyIps.has('*') || this.trustedProxyIps.has(remoteIp)) {
        const forwardedProto = String(req.headers?.['x-forwarded-proto'] || '')
          .split(',')[0]
          .trim()
          .toLowerCase();
        if (forwardedProto === 'https') {
          return true;
        }
      }
    }
    return false;
  }

  /**
   * Build the Set-Cookie header for setting or clearing webinar_admin_session.
   * - In production: requires HTTPS to issue a non-empty session cookie and ALWAYS sets `; Secure` on both login and logout.
   * - In development/test: sets `; Secure` when accessed over HTTPS, and allows HTTP on localhost when not in production.
   */
  buildAdminSessionCookie(sessionId, { maxAgeSeconds = 43200, req = null } = {}) {
    const isHttps = this.isRequestSecure(req);
    const maxAge = Math.max(0, Number(maxAgeSeconds) || 0);

    if (this.isProduction && maxAge > 0 && !isHttps) {
      const err = new Error(
        'HTTPS is required to create an administrator session cookie in production. Connect via HTTPS or configure WEBINAR_TRUST_PROXY=true behind a verified TLS reverse proxy.'
      );
      err.code = 'HTTPS_REQUIRED_IN_PRODUCTION';
      err.statusCode = 403;
      throw err;
    }

    const encodedVal = maxAge > 0 && sessionId ? encodeURIComponent(sessionId) : '';
    const parts = [
      `webinar_admin_session=${encodedVal}`,
      'HttpOnly',
      'SameSite=Strict',
      'Path=/',
      `Max-Age=${maxAge}`
    ];

    if (this.isProduction || isHttps) {
      parts.push('Secure');
    }

    return parts.join('; ');
  }

  createAdminSession(suppliedToken, req = null) {
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

    if (req && this.isProduction && !this.isRequestSecure(req)) {
      const err = new Error('HTTPS is required to establish an administrator session in production.');
      err.code = 'HTTPS_REQUIRED_IN_PRODUCTION';
      err.statusCode = 403;
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
    const maxAgeSeconds = 12 * 60 * 60; // 12 hours
    const expiresAt = Date.now() + (maxAgeSeconds * 1000);
    const cookieHeader = this.buildAdminSessionCookie(sessionId, { maxAgeSeconds, req });

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
      cookieHeader,
      expiresAt: new Date(expiresAt).toISOString()
    };
  }

  revokeAdminSession(sessionId, req = null) {
    if (sessionId) {
      this.adminSessions.delete(sessionId);
    }
    return {
      ok: true,
      cookieHeader: this.buildAdminSessionCookie('', { maxAgeSeconds: 0, req })
    };
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
   * Sanitize webinar record for Admin responses (excludes raw token hashes, provides safe metadata & outbox summary)
   */
  serializeForAdmin(webinar) {
    if (!webinar) return null;
    const cloned = deepClone(webinar);
    const currentDraftRev = Number(cloned.draft?.revision) || 1;
    cloned.previewLinks = (cloned.previewLinks || []).map((link) => {
      const isOutdatedRevision = Number(link.revision) !== currentDraftRev;
      const isExpired = Date.now() >= Date.parse(link.expiresAt);
      const isRevoked = Boolean(link.revokedAt);
      return {
        tokenId: link.tokenId,
        slug: link.slug,
        revision: link.revision,
        createdAt: link.createdAt,
        expiresAt: link.expiresAt,
        createdBy: link.createdBy,
        revokedAt: link.revokedAt,
        revokedBy: link.revokedBy,
        revokedReason: link.revokedReason || (isOutdatedRevision ? 'SUPERSEDED_BY_DRAFT_EDIT' : null),
        supersededByRevision: link.supersededByRevision || (isOutdatedRevision ? currentDraftRev : null),
        isOutdatedRevision,
        isExpired,
        isActive: !isRevoked && !isExpired && !isOutdatedRevision
      };
    });
    cloned.brevoOutbox = this.getBrevoOutboxSummary(cloned.slug);
    cloned.persistenceModel = this.getPersistenceModelInfo();
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
  // 3. REVISION-SCOPED, EXPIRING, REVOCABLE PREVIEW LINKS & VIEWER CONTEXTS
  // =========================================================================

  /**
   * Create a revision-scoped, expiring preview token for the current webinar draft revision.
   * Rejects nonexistent or non-current requested revisions.
   */
  async createPreviewLink(slug, { ttlSeconds = 3600, revision = null } = {}, actorId = 'admin:primary') {
    return this._commitTransaction(async (workingState, markTouched) => {
      const webinar = workingState.webinars[slug];
      if (!webinar) {
        const err = new Error(`Webinar "${slug}" not found`);
        err.statusCode = 404;
        err.code = 'WEBINAR_NOT_FOUND';
        throw err;
      }

      const currentDraftRev = Number(webinar.draft.revision) || 1;
      if (revision !== null && revision !== undefined && revision !== '') {
        const requestedRev = Number(revision);
        if (!Number.isInteger(requestedRev) || requestedRev < 1 || requestedRev !== currentDraftRev) {
          const err = new Error(
            `Cannot issue preview link for revision #${revision}; current draft for "${slug}" is at revision #${currentDraftRev}.`
          );
          err.statusCode = 409;
          err.code = 'INVALID_PREVIEW_REVISION';
          throw err;
        }
      }

      const boundedTtl = Math.min(Math.max(Number(ttlSeconds) || 3600, 60), 7 * 24 * 3600);
      const targetRevision = currentDraftRev;

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
        revokedBy: null,
        revokedReason: null,
        supersededByRevision: null
      };

      webinar.previewLinks.push(linkRecord);
      webinar.auditLog.push({
        timestamp: new Date(now).toISOString(),
        action: 'PREVIEW_LINK_ISSUED',
        actor: actorId,
        revision: targetRevision,
        note: `Issued revision-scoped preview link ${tokenId} for draft revision #${targetRevision} expiring at ${expiresAt}`
      });

      markTouched('webinars');

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
    return this._commitTransaction(async (workingState, markTouched) => {
      const webinar = workingState.webinars[slug];
      if (!webinar) {
        const err = new Error(`Webinar "${slug}" not found`);
        err.statusCode = 404;
        throw err;
      }

      const nowIso = new Date().toISOString();
      let revokedCount = 0;

      for (const link of webinar.previewLinks) {
        if (!link.revokedAt && (tokenId === 'ALL' || link.tokenId === tokenId)) {
          link.revokedAt = nowIso;
          link.revokedBy = actorId;
          link.revokedReason = 'EXPLICITLY_REVOKED_BY_ADMIN';
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

      markTouched('webinars');
      return { ok: true, revokedCount, tokenId };
    });
  }

  /**
   * Validate a raw preview token against non-revoked, non-expired, revision-matching previewLinks for slug.
   * Never silently substitutes a newer draft revision!
   */
  validatePreviewToken(slug, rawToken) {
    this._ensureHealthyState();
    const webinar = this.webinars[slug];
    if (!webinar) return { valid: false, statusCode: 404, reason: 'NOT_FOUND' };
    if (!rawToken || typeof rawToken !== 'string') return { valid: false, statusCode: 403, reason: 'MISSING_TOKEN' };

    const candidateHash = hashToken(rawToken);
    const link = (webinar.previewLinks || []).find((l) => timingSafeEqualStr(l.tokenHash, candidateHash));
    if (!link) return { valid: false, statusCode: 403, reason: 'INVALID_PREVIEW_TOKEN' };
    if (link.slug !== slug) return { valid: false, statusCode: 403, reason: 'SCOPE_MISMATCH' };

    const currentDraftRev = Number(webinar.draft.revision) || 1;
    const linkRev = Number(link.revision) || 1;

    // If the draft was edited after this preview link was issued, report PREVIEW_REVISION_OUTDATED (409)
    if (linkRev !== currentDraftRev || link.revokedReason === 'SUPERSEDED_BY_DRAFT_EDIT') {
      return {
        valid: false,
        statusCode: 409,
        reason: 'PREVIEW_REVISION_OUTDATED',
        tokenId: link.tokenId,
        linkRevision: linkRev,
        currentRevision: currentDraftRev,
        message: `This preview link was issued for Draft Revision #${linkRev}, which has been superseded by Draft Revision #${currentDraftRev}. Issue a new preview link for Revision #${currentDraftRev}.`
      };
    }

    if (link.revokedAt) {
      return {
        valid: false,
        statusCode: 403,
        reason: 'PREVIEW_TOKEN_REVOKED',
        tokenId: link.tokenId,
        linkRevision: linkRev,
        currentRevision: currentDraftRev,
        message: `Preview link ${link.tokenId} has been revoked by an administrator.`
      };
    }

    if (Date.now() >= Date.parse(link.expiresAt)) {
      return {
        valid: false,
        statusCode: 403,
        reason: 'PREVIEW_TOKEN_EXPIRED',
        tokenId: link.tokenId,
        linkRevision: linkRev,
        currentRevision: currentDraftRev,
        expiresAt: link.expiresAt,
        message: `Preview link ${link.tokenId} expired at ${link.expiresAt}.`
      };
    }

    return {
      valid: true,
      statusCode: 200,
      tokenId: link.tokenId,
      revision: linkRev,
      expiresAt: link.expiresAt
    };
  }

  /**
   * Issue an HMAC-signed viewer context token so viewer API calls (/track, /register, /qa, /consent)
   * are cryptographically bound to the server-verified mode (preview vs public), revision, and sessionId.
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
   * Verify a viewer context token and return the authoritative snapshot and preview classification.
   * Enforces:
   * - Preview mode: link.revision === payload.revision === webinar.draft.revision, plus link not revoked/expired.
   * - Public mode: payload.revision === webinar.publishedSnapshot.revision (requires refresh if a newer revision was published).
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

    if (!payload.sessionId || typeof payload.sessionId !== 'string') {
      return { valid: false, statusCode: 403, reason: 'MISSING_VIEWER_CONTEXT_SESSION_ID' };
    }

    if (payload.mode === 'preview') {
      const link = (webinar.previewLinks || []).find((l) => l.tokenId === payload.tokenId);
      if (!link) {
        return { valid: false, statusCode: 403, reason: 'PREVIEW_LINK_NOT_FOUND' };
      }

      const currentDraftRev = Number(webinar.draft.revision) || 1;
      const linkRev = Number(link.revision) || 1;
      const contextRev = Number(payload.revision) || 1;

      if (
        linkRev !== currentDraftRev ||
        contextRev !== linkRev ||
        contextRev !== currentDraftRev ||
        link.revokedReason === 'SUPERSEDED_BY_DRAFT_EDIT'
      ) {
        return {
          valid: false,
          statusCode: 409,
          reason: 'PREVIEW_REVISION_OUTDATED',
          issuedRevision: contextRev,
          linkRevision: linkRev,
          currentRevision: currentDraftRev,
          message: `Preview session for Draft Revision #${contextRev} is outdated because the draft was edited to Revision #${currentDraftRev}. Issue a new preview link for Revision #${currentDraftRev}.`
        };
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
        revision: currentDraftRev,
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

      const publishedRev = Number(webinar.publishedSnapshot.revision) || 1;
      const contextRev = Number(payload.revision) || 1;
      if (contextRev !== publishedRev) {
        return {
          valid: false,
          statusCode: 409,
          reason: 'PUBLIC_REVISION_OUTDATED_REFRESH_REQUIRED',
          issuedRevision: contextRev,
          currentRevision: publishedRev,
          message: `A newer published revision (Revision #${publishedRev}) is now live. Please refresh the page to continue.`
        };
      }

      return {
        valid: true,
        statusCode: 200,
        isPreview: false,
        mode: 'public',
        tokenId: null,
        sessionId: payload.sessionId,
        revision: publishedRev,
        snapshot: webinar.publishedSnapshot,
        webinar
      };
    }

    return { valid: false, statusCode: 403, reason: 'UNKNOWN_VIEWER_CONTEXT_MODE' };
  }

  /**
   * Resolve page access for GET /webinar/:slug
   * Every page load issues a fresh signed sessionId bound inside viewerContextToken.
   */
  resolveViewerPageAccess(slug, rawPreviewToken = null) {
    this._ensureHealthyState();
    const webinar = this.webinars[slug];
    if (!webinar) {
      return { allowed: false, statusCode: 404, reason: 'NOT_FOUND', webinar: null };
    }

    // 1. If a preview token is supplied in the query string, validate it strictly including revision match
    if (rawPreviewToken !== null && rawPreviewToken !== undefined && rawPreviewToken !== '') {
      const check = this.validatePreviewToken(slug, rawPreviewToken);
      if (!check.valid) {
        return {
          allowed: false,
          statusCode: check.statusCode || 403,
          reason: check.reason,
          linkRevision: check.linkRevision || null,
          currentRevision: check.currentRevision || webinar.draft.revision,
          message: check.message || `Preview access denied (${check.reason}).`,
          status: webinar.status,
          webinar: null
        };
      }

      const currentDraftRev = Number(webinar.draft.revision) || 1;
      if (Number(check.revision) !== currentDraftRev) {
        return {
          allowed: false,
          statusCode: 409,
          reason: 'PREVIEW_REVISION_OUTDATED',
          linkRevision: check.revision,
          currentRevision: currentDraftRev,
          message: `This preview link was issued for Draft Revision #${check.revision}, which was superseded by Draft Revision #${currentDraftRev}.`,
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
        revision: currentDraftRev,
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
        revision: currentDraftRev,
        snapshot: deepClone(webinar.draft),
        webinarStatus: webinar.status
      };
    }

    // 2. Public access requires PUBLISHED status and a valid publishedSnapshot
    if (webinar.status === WEBINAR_STATES.PUBLISHED && webinar.publishedSnapshot) {
      const publishedRev = Number(webinar.publishedSnapshot.revision) || 1;
      const sessionId = `vsess_${crypto.randomBytes(12).toString('hex')}`;
      const viewerContextToken = this.issueViewerContextToken({
        slug,
        mode: 'public',
        tokenId: null,
        revision: publishedRev,
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
        revision: publishedRev,
        snapshot: deepClone(webinar.publishedSnapshot),
        webinarStatus: webinar.status
      };
    }

    return {
      allowed: false,
      statusCode: 403,
      reason: 'UNPUBLISHED_DRAFT',
      message: 'This webinar is currently in private draft review and is not publicly published.',
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
   * - Invalidates all previewLinks from earlier draft revisions so old preview links cannot open the new revision.
   */
  async saveWebinar(data, actorId = 'admin:primary') {
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

    const savedRecord = await this._commitTransaction(async (workingState, markTouched) => {
      const existing = workingState.webinars[slug];
      const nowIso = new Date().toISOString();
      const seedDraft = getSeedDraftContent();

      const prevDraft = existing ? existing.draft : seedDraft;
      const nextRevision = existing ? (Number(prevDraft.revision) || 1) + 1 : 1;

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

      // Invalidate all active preview links from prior draft revisions so old preview tokens cannot resolve to nextRevision
      let invalidatedPreviewsCount = 0;
      const updatedPreviewLinks = existing && Array.isArray(existing.previewLinks)
        ? existing.previewLinks.map((pl) => {
            if (!pl.revokedAt && Number(pl.revision) !== nextRevision) {
              invalidatedPreviewsCount += 1;
              return {
                ...pl,
                revokedAt: nowIso,
                revokedBy: actorId,
                revokedReason: 'SUPERSEDED_BY_DRAFT_EDIT',
                supersededByRevision: nextRevision
              };
            }
            return pl;
          })
        : [];

      const nextRecord = existing ? {
        ...existing,
        updatedAt: nowIso,
        hasUnpublishedDraftChanges: true,
        status: hasLivePublished ? WEBINAR_STATES.PUBLISHED : WEBINAR_STATES.DRAFT,
        draft: nextDraft,
        previewLinks: updatedPreviewLinks,
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
          refundedCommissionsUsd: 0.00,
          telemetryTrustLevel: 'CLIENT_REPORTED_BOUND_TO_SIGNED_SESSION',
          sessionRefreshPolicy: 'NEW_SIGNED_SESSION_ON_PAGE_LOAD'
        }
      };

      const noteParts = [`Saved draft revision ${nextRevision}`];
      if (wasApproved) {
        noteParts.push(`invalidated previous approval of revision ${existing.approval.approvedRevision}`);
      }
      if (invalidatedPreviewsCount > 0) {
        noteParts.push(`superseded ${invalidatedPreviewsCount} preview link(s) from earlier revision`);
      }

      nextRecord.auditLog.push({
        timestamp: nowIso,
        action: existing ? 'UPDATED_DRAFT' : 'CREATED_DRAFT',
        actor: actorId,
        revision: nextRevision,
        note: noteParts.join('; ')
      });

      workingState.webinars[slug] = nextRecord;
      markTouched('webinars');
      return nextRecord;
    });

    return this.serializeForAdmin(savedRecord);
  }

  /**
   * Transition webinar lifecycle state with strict server-side rules
   */
  async transitionWebinarState(slug, { action, status, revision, note = '' } = {}, actorId = 'admin:primary') {
    const updatedRecord = await this._commitTransaction(async (workingState, markTouched) => {
      const webinar = workingState.webinars[slug];
      if (!webinar) {
        const err = new Error(`Webinar "${slug}" not found`);
        err.statusCode = 404;
        throw err;
      }

      const nowIso = new Date().toISOString();
      const targetAction = (action || status || '').toUpperCase().trim();
      const currentDraftRev = webinar.draft.revision;

      if (revision !== undefined && revision !== null && Number(revision) !== currentDraftRev) {
        const err = new Error(`Revision mismatch: requested revision ${revision}, but current draft is at revision ${currentDraftRev}.`);
        err.statusCode = 409;
        err.code = 'REVISION_MISMATCH';
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
        if (!webinar.approval || webinar.approval.approvedRevision !== currentDraftRev) {
          const err = new Error(
            `Cannot publish unapproved draft revision ${currentDraftRev}. Approval is required for revision ${currentDraftRev} before publishing (currently approved revision: ${webinar.approval?.approvedRevision || 'none'}).`
          );
          err.statusCode = 409;
          err.code = 'APPROVAL_REQUIRED';
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

      markTouched('webinars');
      return webinar;
    });

    return this.serializeForAdmin(updatedRecord);
  }

  /**
   * Import local MP4 asset into draft (updates draft revision & invalidates prior approval and old previews)
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
      err.code = 'FAQ_RATE_LIMIT_EXCEEDED';
      throw err;
    }
  }

  /**
   * Answer viewer question using ONLY the active snapshot's approved reference data.
   */
  async answerViewerQuestion(slug, question, { viewerContextToken, ip = '127.0.0.1' } = {}) {
    this._ensureHealthyState();
    const ctx = this.verifyViewerContext(slug, viewerContextToken);
    if (!ctx.valid) {
      const err = new Error(ctx.message || `Unauthorized FAQ access: ${ctx.reason}`);
      err.statusCode = ctx.statusCode || 403;
      err.code = ctx.reason;
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

    // 3. Dynamic Ingredient & Supplement Facts Lookup
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

    // 9. Honest Unknown Fallback
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
    return this._commitTransaction(async (workingState, markTouched) => {
      const webinar = workingState.webinars[slug];
      if (!webinar) return;
      const bucket = isPreview ? webinar.analytics.preview : webinar.analytics.production;
      bucket.faqQuestionsAsked = (bucket.faqQuestionsAsked || 0) + 1;
      if (isFallback) {
        bucket.faqFallbacks = (bucket.faqFallbacks || 0) + 1;
      }
      markTouched('webinars');
    });
  }

  // =========================================================================
  // 6 & 7. PERSISTENT LEAD CAPTURE, SERVER-AUTHORITATIVE CONSENT & DURABLE BREVO OUTBOX
  // =========================================================================

  /**
   * Register viewer lead with server-authoritative consent wording, durable multi-file transactional persistence,
   * and durable Brevo outbox queuing (never blocks on external network calls during registration).
   */
  async registerLead(slug, payload = {}, { viewerContextToken, ip = '127.0.0.1', userAgent = 'Unknown' } = {}) {
    this._ensureHealthyState();
    const ctx = this.verifyViewerContext(slug, viewerContextToken);
    if (!ctx.valid) {
      const err = new Error(ctx.message || `Unauthorized registration attempt: ${ctx.reason}`);
      err.statusCode = ctx.statusCode || 403;
      err.code = ctx.reason;
      throw err;
    }

    const cleanEmail = String(payload.email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!cleanEmail || cleanEmail.length > 254 || !emailRegex.test(cleanEmail)) {
      const err = new Error('Please enter a valid email address.');
      err.statusCode = 400;
      err.code = 'INVALID_EMAIL';
      throw err;
    }

    const cleanName = String(payload.name || '').trim().slice(0, 120);
    const registrationRequested = payload.registrationRequested !== undefined ? Boolean(payload.registrationRequested) : true;
    if (!registrationRequested) {
      const err = new Error('Please confirm that you want to save your webinar registration.');
      err.statusCode = 400;
      err.code = 'REGISTRATION_CONFIRMATION_REQUIRED';
      throw err;
    }

    const marketingConsentGiven = Boolean(payload.marketingConsentGiven);
    const isPreview = ctx.isPreview;
    const snapshot = ctx.snapshot;
    const brevoListId = Number(snapshot.registration?.brevoListId || 80);

    const idempotencyKey = `${slug}:${isPreview ? 'preview' : 'prod'}:${cleanEmail}`;
    const outboxKey = `brevo_sync:${slug}:${cleanEmail}`;
    const nowIso = new Date().toISOString();
    const retentionExpiresAt = new Date(Date.now() + SERVER_CONSENT_CONFIG.retentionDays * 86400 * 1000).toISOString();
    const ipHash = crypto.createHash('sha256').update(`${ip}_${this.sessionSecret}`).digest('hex').slice(0, 24);

    const { record, isDuplicate, outboxJob } = await this._commitTransaction(async (workingState, markTouched) => {
      const webinar = workingState.webinars[slug];
      const bucket = isPreview ? webinar.analytics.preview : webinar.analytics.production;
      bucket.registrationAttempts = (bucket.registrationAttempts || 0) + 1;

      let existing = workingState.registrations.find((r) => r.idempotencyKey === idempotencyKey);
      let duplicate = false;

      const authoritativeConsent = {
        registrationRequested: true,
        registrationDisclosureText: SERVER_CONSENT_CONFIG.registrationDisclosure,
        marketingConsentGiven,
        marketingConsentText: SERVER_CONSENT_CONFIG.marketingConsentText,
        consentVersion: SERVER_CONSENT_CONFIG.version,
        timestamp: nowIso,
        source: `webinar:${slug}:rev${ctx.revision}`
      };

      if (existing) {
        duplicate = true;
        existing.updatedAt = nowIso;
        existing.name = cleanName || existing.name;
        existing.webinarRevision = ctx.revision;
        existing.consent = authoritativeConsent;
      } else {
        existing = {
          registrationId: 'reg_' + crypto.randomBytes(12).toString('hex'),
          idempotencyKey,
          slug,
          webinarRevision: ctx.revision,
          isPreview,
          email: cleanEmail,
          name: cleanName,
          consent: authoritativeConsent,
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
            outboxJobId: null,
            attempts: 0,
            lastAttemptAt: null,
            syncedAt: null,
            providerResponseId: null,
            lastError: null,
            emailDeliveryStatus: 'NOT_CONFIGURED_CONTACT_SYNC_ONLY'
          },
          createdAt: nowIso,
          updatedAt: nowIso
        };
        workingState.registrations.push(existing);
        bucket.registrations = (bucket.registrations || 0) + 1;
      }

      // Durable Outbox Management inside the same atomic transaction
      let activeOutboxJob = null;
      if (isPreview) {
        existing.brevoSync.status = 'PREVIEW_SIMULATED';
        existing.brevoSync.lastError = null;
      } else {
        let job = workingState.brevoOutbox.find((j) => j.idempotencyKey === outboxKey);
        if (!marketingConsentGiven) {
          // If a pending outbox job exists for this contact, cancel it because marketing consent is false/withdrawn
          if (job && (job.status === 'QUEUED' || job.status === 'RETRY_SCHEDULED')) {
            job.status = 'CONSENT_CANCELLED';
            job.cancelledAt = nowIso;
            job.updatedAt = nowIso;
            job.lockedBy = null;
            job.lockedAt = null;
            job.lockExpiresAt = null;
            job.lastError = 'Cancelled prior to Brevo synchronization because marketing consent was withdrawn.';
            activeOutboxJob = deepClone(job);
            existing.brevoSync.status = 'CONSENT_CANCELLED';
            existing.brevoSync.listId = null;
            existing.brevoSync.outboxJobId = job.jobId;
            markTouched('brevoOutbox');
          } else {
            existing.brevoSync.status = existing.brevoSync.status === 'CONSENT_CANCELLED'
              ? 'CONSENT_CANCELLED'
              : 'NOT_APPLICABLE_NO_MARKETING_CONSENT';
            existing.brevoSync.listId = null;
          }
        } else {
          // Marketing consent was given on a public registration: enqueue or re-queue in durable outbox
          if (job && job.status === 'SYNCHRONIZED' && existing.brevoSync.status === 'CONTACT_SYNCHRONIZED') {
            activeOutboxJob = deepClone(job);
          } else {
            if (job) {
              job.status = 'QUEUED';
              job.registrationId = existing.registrationId;
              job.name = cleanName || job.name;
              job.revision = ctx.revision;
              job.listId = brevoListId;
              job.consentVersion = SERVER_CONSENT_CONFIG.version;
              job.consentTimestamp = nowIso;
              job.attempts = 0;
              job.maxAttempts = this.outboxMaxAttempts;
              job.nextAttemptAt = nowIso;
              job.updatedAt = nowIso;
              job.cancelledAt = null;
              job.lockedBy = null;
              job.lockedAt = null;
              job.lockExpiresAt = null;
              job.lastError = null;
            } else {
              job = {
                jobId: 'brevo_job_' + crypto.randomBytes(10).toString('hex'),
                idempotencyKey: outboxKey,
                registrationId: existing.registrationId,
                slug,
                email: cleanEmail,
                name: cleanName,
                revision: ctx.revision,
                listId: brevoListId,
                consentVersion: SERVER_CONSENT_CONFIG.version,
                consentTimestamp: nowIso,
                status: 'QUEUED',
                attempts: 0,
                maxAttempts: this.outboxMaxAttempts,
                createdAt: nowIso,
                updatedAt: nowIso,
                nextAttemptAt: nowIso,
                lockedBy: null,
                lockedAt: null,
                lockExpiresAt: null,
                synchronizedAt: null,
                cancelledAt: null,
                lastHttpStatus: null,
                providerResponseId: null,
                lastError: null,
                attemptHistory: []
              };
              workingState.brevoOutbox.push(job);
            }
            existing.brevoSync.status = 'CONTACT_SYNC_QUEUED';
            existing.brevoSync.listId = brevoListId;
            existing.brevoSync.outboxJobId = job.jobId;
            existing.brevoSync.lastError = null;
            activeOutboxJob = deepClone(job);
            markTouched('brevoOutbox');
          }
        }
      }

      markTouched('registrations', 'webinars');
      return {
        record: deepClone(existing),
        isDuplicate: duplicate,
        outboxJob: activeOutboxJob
      };
    });

    return {
      ok: true,
      registrationId: record.registrationId,
      isDuplicate,
      isPreview: record.isPreview,
      webinarRevision: record.webinarRevision,
      requestSaved: true,
      marketingConsentGiven: record.consent.marketingConsentGiven,
      consentVersion: record.consent.consentVersion,
      brevoStatus: record.brevoSync.status,
      brevoOutboxJobId: outboxJob ? outboxJob.jobId : record.brevoSync.outboxJobId || null,
      brevoAttempts: record.brevoSync.attempts,
      brevoError: record.brevoSync.lastError,
      emailDeliveryStatus: 'NOT_CONFIGURED_CONTACT_SYNC_ONLY',
      guideDeliveryStatus: 'NO_GUIDE_ASSET_CONFIGURED',
      message: this._formatRegistrationMessage(record)
    };
  }

  /**
   * Update or withdraw marketing consent for an existing registration and cancel any queued Brevo outbox job
   */
  async updateRegistrationConsent(slug, { email, marketingConsentGiven } = {}, { viewerContextToken = null, isAdmin = false, actorId = null } = {}) {
    this._ensureHealthyState();
    let isPreview = false;
    let revision = 1;

    if (!isAdmin) {
      const ctx = this.verifyViewerContext(slug, viewerContextToken);
      if (!ctx.valid) {
        const err = new Error(ctx.message || `Unauthorized consent update: ${ctx.reason}`);
        err.statusCode = ctx.statusCode || 403;
        err.code = ctx.reason;
        throw err;
      }
      isPreview = ctx.isPreview;
      revision = ctx.revision;
    } else {
      const w = this.webinars[slug];
      if (!w) {
        const err = new Error(`Webinar "${slug}" not found`);
        err.statusCode = 404;
        throw err;
      }
      revision = w.publishedSnapshot?.revision || w.draft?.revision || 1;
    }

    const cleanEmail = String(email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@')) {
      const err = new Error('A valid email address is required to update consent preferences.');
      err.statusCode = 400;
      throw err;
    }

    const nextConsentBool = Boolean(marketingConsentGiven);
    const idempotencyKey = `${slug}:${isPreview ? 'preview' : 'prod'}:${cleanEmail}`;
    const outboxKey = `brevo_sync:${slug}:${cleanEmail}`;
    const nowIso = new Date().toISOString();

    return this._commitTransaction(async (workingState, markTouched) => {
      const reg = workingState.registrations.find((r) => r.idempotencyKey === idempotencyKey);
      if (!reg) {
        const err = new Error(`Registration for "${cleanEmail}" on webinar "${slug}" not found.`);
        err.statusCode = 404;
        err.code = 'REGISTRATION_NOT_FOUND';
        throw err;
      }

      reg.updatedAt = nowIso;
      reg.consent = {
        ...reg.consent,
        marketingConsentGiven: nextConsentBool,
        marketingConsentText: SERVER_CONSENT_CONFIG.marketingConsentText,
        consentVersion: SERVER_CONSENT_CONFIG.version,
        timestamp: nowIso,
        updatedBy: actorId || (isPreview ? 'viewer:preview' : 'viewer:public')
      };

      const job = workingState.brevoOutbox.find((j) => j.idempotencyKey === outboxKey);
      if (!nextConsentBool) {
        if (job && (job.status === 'QUEUED' || job.status === 'RETRY_SCHEDULED')) {
          job.status = 'CONSENT_CANCELLED';
          job.cancelledAt = nowIso;
          job.updatedAt = nowIso;
          job.lockedBy = null;
          job.lockedAt = null;
          job.lockExpiresAt = null;
          job.lastError = 'Cancelled because marketing consent was withdrawn before synchronization.';
          markTouched('brevoOutbox');
        }
        reg.brevoSync.status = 'CONSENT_CANCELLED';
        reg.brevoSync.listId = null;
      } else if (!isPreview) {
        const webinar = workingState.webinars[slug];
        const listId = Number((webinar?.publishedSnapshot || webinar?.draft)?.registration?.brevoListId || 80);
        if (job) {
          job.status = 'QUEUED';
          job.attempts = 0;
          job.nextAttemptAt = nowIso;
          job.cancelledAt = null;
          job.updatedAt = nowIso;
          job.lastError = null;
          reg.brevoSync.outboxJobId = job.jobId;
        } else {
          const newJob = {
            jobId: 'brevo_job_' + crypto.randomBytes(10).toString('hex'),
            idempotencyKey: outboxKey,
            registrationId: reg.registrationId,
            slug,
            email: cleanEmail,
            name: reg.name || '',
            revision,
            listId,
            consentVersion: SERVER_CONSENT_CONFIG.version,
            consentTimestamp: nowIso,
            status: 'QUEUED',
            attempts: 0,
            maxAttempts: this.outboxMaxAttempts,
            createdAt: nowIso,
            updatedAt: nowIso,
            nextAttemptAt: nowIso,
            lockedBy: null,
            lockedAt: null,
            lockExpiresAt: null,
            synchronizedAt: null,
            cancelledAt: null,
            lastHttpStatus: null,
            providerResponseId: null,
            lastError: null,
            attemptHistory: []
          };
          workingState.brevoOutbox.push(newJob);
          reg.brevoSync.outboxJobId = newJob.jobId;
        }
        reg.brevoSync.status = 'CONTACT_SYNC_QUEUED';
        reg.brevoSync.listId = listId;
        markTouched('brevoOutbox');
      }

      markTouched('registrations');
      return {
        ok: true,
        registrationId: reg.registrationId,
        email: reg.email,
        marketingConsentGiven: reg.consent.marketingConsentGiven,
        brevoStatus: reg.brevoSync.status,
        outboxJobStatus: job ? job.status : null
      };
    });
  }

  _formatRegistrationMessage(record) {
    const st = record.brevoSync.status;
    if (record.isPreview || st === 'PREVIEW_SIMULATED') {
      return 'Registration saved locally in preview simulation mode. No contact was sent to Brevo and no email was dispatched.';
    }
    if (st === 'CONSENT_CANCELLED') {
      return 'Registration updated: marketing consent was withdrawn and pending Brevo contact synchronization was cancelled.';
    }
    if (!record.consent.marketingConsentGiven || st === 'NOT_APPLICABLE_NO_MARKETING_CONSENT') {
      return 'Registration saved without marketing email opt-in. Your email was not added to a marketing list.';
    }
    if (st === 'CONTACT_SYNCHRONIZED') {
      return 'Registration saved and contact synchronized to Brevo list. (Note: Contact list synchronization does not send or confirm transactional email delivery).';
    }
    if (st === 'CONTACT_SYNC_QUEUED' || st === 'RETRY_SCHEDULED') {
      return 'Registration saved locally and queued in the durable Brevo contact synchronization outbox (no email has been sent).';
    }
    return `Registration saved locally, but Brevo contact synchronization failed: ${record.brevoSync.lastError || 'Provider unavailable'}.`;
  }

  /**
   * Process pending jobs in the durable Brevo Outbox.
   * - Rechecks current registration consent before dispatching; cancels job if consent was withdrawn.
   * - Acquires crash-safe per-job worker locks (`PROCESSING`, `lockedBy`, `lockExpiresAt`) and recovers expired locks from crashed workers.
   * - Leaves jobs `QUEUED` without network calls when `brevoLiveEnabled === false` and no `brevoTransport` is configured.
   * - Executes bounded retries with timeout and exponential backoff (`nextAttemptAt`), recording full `attemptHistory`.
   */
  async processBrevoOutbox({ workerId = `worker_${process.pid}`, nowMs = Date.now(), batchSize = 10 } = {}) {
    this._ensureHealthyState();
    const canDispatch = Boolean(this.brevoTransport || (this.brevoLiveEnabled && this.brevoApiKey));
    const nowIso = new Date(nowMs).toISOString();

    // Step 1: Transactionally verify consent, cancel withdrawn jobs, and lock eligible jobs for this worker
    const { claimedJobs, cancelledJobIds, skippedDisabledCount } = await this._commitTransaction(async (workingState, markTouched) => {
      const claimed = [];
      const cancelled = [];
      let skippedDisabled = 0;

      for (const job of workingState.brevoOutbox) {
        if (claimed.length >= batchSize) break;

        const isQueuedOrReadyRetry =
          job.status === 'QUEUED' ||
          (job.status === 'RETRY_SCHEDULED' && (!job.nextAttemptAt || Date.parse(job.nextAttemptAt) <= nowMs));

        const isStaleLocked =
          job.status === 'PROCESSING' &&
          job.lockExpiresAt &&
          Date.parse(job.lockExpiresAt) <= nowMs;

        if (!isQueuedOrReadyRetry && !isStaleLocked) {
          continue;
        }

        // Look up current registration record to verify consent was not withdrawn before processing
        const reg = workingState.registrations.find(
          (r) => r.registrationId === job.registrationId || (r.slug === job.slug && r.email === job.email && !r.isPreview)
        );

        if (!reg || !reg.consent || reg.consent.marketingConsentGiven !== true) {
          job.status = 'CONSENT_CANCELLED';
          job.cancelledAt = nowIso;
          job.updatedAt = nowIso;
          job.lockedBy = null;
          job.lockedAt = null;
          job.lockExpiresAt = null;
          job.lastError = 'Cancelled by outbox processor because marketing consent was withdrawn prior to dispatch.';
          if (reg) {
            reg.brevoSync.status = 'CONSENT_CANCELLED';
            reg.brevoSync.listId = null;
            reg.updatedAt = nowIso;
            markTouched('registrations');
          }
          cancelled.push(job.jobId);
          markTouched('brevoOutbox');
          continue;
        }

        // If external live Brevo is disabled and no test transport is injected, keep job safely QUEUED
        if (!canDispatch) {
          skippedDisabled += 1;
          continue;
        }

        if (isStaleLocked) {
          job.attemptHistory = Array.isArray(job.attemptHistory) ? job.attemptHistory : [];
          job.attemptHistory.push({
            attemptNumber: job.attempts,
            timestamp: nowIso,
            status: 'STALE_LOCK_RECOVERED',
            previousWorker: job.lockedBy,
            note: `Reclaimed expired lock from ${job.lockedBy} (expired at ${job.lockExpiresAt})`
          });
        }

        job.status = 'PROCESSING';
        job.lockedBy = workerId;
        job.lockedAt = nowIso;
        job.lockExpiresAt = new Date(nowMs + this.outboxLockTtlMs).toISOString();
        job.updatedAt = nowIso;

        claimed.push(deepClone(job));
        markTouched('brevoOutbox');
      }

      return {
        claimedJobs: claimed,
        cancelledJobIds: cancelled,
        skippedDisabledCount: skippedDisabled
      };
    });

    const processedResults = [];

    // Step 2: Execute transport for each claimed job and persist outcome transactionally
    for (const claimedJob of claimedJobs) {
      const startMs = Date.now();
      let transportOutcome = {
        ok: false,
        status: 0,
        providerResponseId: null,
        error: null
      };

      try {
        const currentReg = this.registrations.find(
          (r) => r.registrationId === claimedJob.registrationId || (r.slug === claimedJob.slug && r.email === claimedJob.email && !r.isPreview)
        );
        if (!currentReg || !currentReg.consent || currentReg.consent.marketingConsentGiven !== true) {
          transportOutcome = {
            ok: false,
            consentCancelled: true,
            status: 0,
            error: 'Marketing consent withdrawn prior to transport invocation.'
          };
        } else {
          const payload = {
            email: claimedJob.email,
            attributes: {
              FIRSTNAME: claimedJob.name || '',
              WEBINAR_SLUG: claimedJob.slug,
              WEBINAR_REVISION: String(claimedJob.revision),
              CONSENT_VERSION: claimedJob.consentVersion,
              CONSENT_TIMESTAMP: claimedJob.consentTimestamp
            },
            listIds: [Number(claimedJob.listId || 80)],
            updateEnabled: true
          };

          const attemptNumber = (Number(claimedJob.attempts) || 0) + 1;
          const response = await this._invokeBrevoTransportWithTimeout(payload, {
            attempt: attemptNumber,
            jobId: claimedJob.jobId,
            workerId
          });

          const httpStatus = Number(response?.status) || 0;
          const isSuccess = Boolean(response?.ok && (httpStatus === 200 || httpStatus === 201 || httpStatus === 204));
          transportOutcome = {
            ok: isSuccess,
            status: httpStatus,
            providerResponseId: isSuccess
              ? (response.body?.id ? String(response.body.id) : `http_${httpStatus}`)
              : null,
            error: isSuccess ? null : (response?.body?.message || response?.error || `Brevo HTTP ${httpStatus}`)
          };
        }
      } catch (err) {
        transportOutcome = {
          ok: false,
          status: err.statusCode || 0,
          providerResponseId: null,
          error: err.name === 'AbortError' || err.code === 'ETIMEDOUT'
            ? `Brevo request timed out after ${this.outboxRequestTimeoutMs}ms`
            : err.message
        };
      }

      const durationMs = Math.max(1, Date.now() - startMs);
      const finishIso = new Date(nowMs + durationMs).toISOString();

      // Step 3: Commit job attempt result and update registration record atomically
      const jobResult = await this._commitTransaction(async (workingState, markTouched) => {
        const job = workingState.brevoOutbox.find((j) => j.jobId === claimedJob.jobId);
        if (!job) return null;

        // Verify this worker still owns the lock (or job was not already finalized by another recovery)
        if (job.status === 'SYNCHRONIZED' || job.status === 'CONSENT_CANCELLED') {
          return deepClone(job);
        }

        const reg = workingState.registrations.find(
          (r) => r.registrationId === job.registrationId || (r.slug === job.slug && r.email === job.email && !r.isPreview)
        );

        // If consent was withdrawn while in-flight, mark CONSENT_CANCELLED
        if (transportOutcome.consentCancelled || !reg || !reg.consent || reg.consent.marketingConsentGiven !== true) {
          job.status = 'CONSENT_CANCELLED';
          job.cancelledAt = finishIso;
          job.updatedAt = finishIso;
          job.lockedBy = null;
          job.lockedAt = null;
          job.lockExpiresAt = null;
          job.lastError = 'Cancelled because marketing consent was withdrawn.';
          if (reg) {
            reg.brevoSync.status = 'CONSENT_CANCELLED';
            reg.brevoSync.listId = null;
            reg.updatedAt = finishIso;
            markTouched('registrations');
          }
          markTouched('brevoOutbox');
          return deepClone(job);
        }

        job.attempts = (Number(job.attempts) || 0) + 1;
        job.updatedAt = finishIso;
        job.lockedBy = null;
        job.lockedAt = null;
        job.lockExpiresAt = null;
        job.lastHttpStatus = transportOutcome.status;

        if (!Array.isArray(job.attemptHistory)) job.attemptHistory = [];
        job.attemptHistory.push({
          attemptNumber: job.attempts,
          workerId,
          timestamp: finishIso,
          durationMs,
          status: transportOutcome.ok ? 'SYNCHRONIZED' : 'ERROR',
          httpStatus: transportOutcome.status,
          error: transportOutcome.error || null
        });

        const webinar = workingState.webinars[job.slug];

        if (transportOutcome.ok) {
          job.status = 'SYNCHRONIZED';
          job.synchronizedAt = finishIso;
          job.nextAttemptAt = null;
          job.providerResponseId = transportOutcome.providerResponseId;
          job.lastError = null;

          reg.brevoSync = {
            ...reg.brevoSync,
            status: 'CONTACT_SYNCHRONIZED',
            outboxJobId: job.jobId,
            attempts: job.attempts,
            lastAttemptAt: finishIso,
            syncedAt: finishIso,
            providerResponseId: transportOutcome.providerResponseId,
            lastError: null,
            emailDeliveryStatus: 'NOT_CONFIGURED_CONTACT_SYNC_ONLY'
          };
          reg.updatedAt = finishIso;

          if (webinar) {
            webinar.auditLog.push({
              timestamp: finishIso,
              action: 'BREVO_CONTACT_SYNCHRONIZED',
              actor: workerId,
              revision: job.revision,
              note: `Synchronized contact ${job.email} to Brevo list #${job.listId} on attempt #${job.attempts} (contact sync only; no email dispatched).`
            });
            markTouched('webinars');
          }
        } else {
          job.lastError = transportOutcome.error || 'Brevo contact synchronization failed';
          const isPermanentClientError =
            transportOutcome.status >= 400 &&
            transportOutcome.status < 500 &&
            transportOutcome.status !== 429;
          const retriesRemaining = job.attempts < (Number(job.maxAttempts) || this.outboxMaxAttempts);

          if (retriesRemaining && !isPermanentClientError) {
            const backoffDelayMs = this.outboxBaseBackoffMs * Math.pow(2, Math.max(0, job.attempts - 1));
            job.status = 'RETRY_SCHEDULED';
            job.nextAttemptAt = new Date(nowMs + backoffDelayMs).toISOString();

            reg.brevoSync = {
              ...reg.brevoSync,
              status: 'RETRY_SCHEDULED',
              outboxJobId: job.jobId,
              attempts: job.attempts,
              lastAttemptAt: finishIso,
              lastError: job.lastError
            };
            reg.updatedAt = finishIso;
          } else {
            job.status = 'FAILED';
            job.nextAttemptAt = null;

            reg.brevoSync = {
              ...reg.brevoSync,
              status: 'FAILED',
              outboxJobId: job.jobId,
              attempts: job.attempts,
              lastAttemptAt: finishIso,
              lastError: job.lastError
            };
            reg.updatedAt = finishIso;

            if (webinar) {
              webinar.auditLog.push({
                timestamp: finishIso,
                action: 'BREVO_CONTACT_SYNC_FAILED',
                actor: workerId,
                revision: job.revision,
                note: `Brevo contact sync failed after ${job.attempts} attempt(s) for ${job.email}: ${job.lastError}`
              });
              markTouched('webinars');
            }
          }
        }

        markTouched('brevoOutbox', 'registrations');
        return deepClone(job);
      });

      if (jobResult) {
        processedResults.push(jobResult);
      }
    }

    return {
      ok: true,
      workerId,
      liveSyncEnabled: canDispatch,
      emailDeliveryMode: 'CONTACT_SYNC_ONLY_NO_EMAIL_SENT',
      processedCount: processedResults.length,
      cancelledCount: cancelledJobIds.length,
      skippedDisabledCount,
      processedJobs: processedResults,
      cancelledJobIds,
      summary: this.getBrevoOutboxSummary()
    };
  }

  async _invokeBrevoTransportWithTimeout(payload, meta) {
    const timeoutMs = Math.max(50, Number(this.outboxRequestTimeoutMs) || 4000);
    if (this.brevoTransport) {
      let timer = null;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => {
          const err = new Error(`Brevo transport timed out after ${timeoutMs}ms`);
          err.code = 'ETIMEDOUT';
          reject(err);
        }, timeoutMs);
      });
      try {
        return await Promise.race([
          Promise.resolve(this.brevoTransport(payload, meta)),
          timeoutPromise
        ]);
      } finally {
        if (timer) clearTimeout(timer);
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
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
      try { bodyJson = JSON.parse(bodyText); } catch (_) {}
      return {
        ok: res.ok,
        status: res.status,
        body: bodyJson
      };
    } finally {
      clearTimeout(timer);
    }
  }

  /**
   * Return durable Brevo outbox summary and job states for admin visibility
   */
  getBrevoOutboxSummary(slug = null) {
    this._ensureHealthyState();
    const jobs = (this.brevoOutbox || [])
      .filter((j) => !slug || j.slug === slug)
      .map((j) => deepClone(j));

    const counts = {
      total: jobs.length,
      queued: 0,
      processing: 0,
      retryScheduled: 0,
      synchronized: 0,
      failed: 0,
      consentCancelled: 0
    };

    for (const j of jobs) {
      if (j.status === 'QUEUED') counts.queued += 1;
      else if (j.status === 'PROCESSING') counts.processing += 1;
      else if (j.status === 'RETRY_SCHEDULED') counts.retryScheduled += 1;
      else if (j.status === 'SYNCHRONIZED') counts.synchronized += 1;
      else if (j.status === 'FAILED') counts.failed += 1;
      else if (j.status === 'CONSENT_CANCELLED') counts.consentCancelled += 1;
    }

    return {
      liveSyncEnabled: Boolean(this.brevoLiveEnabled && this.brevoApiKey),
      emailDeliveryMode: 'CONTACT_SYNC_ONLY_NO_EMAIL_SENT',
      counts,
      jobs
    };
  }

  getRegistrationsForWebinar(slug) {
    this._ensureHealthyState();
    return this.registrations.filter((r) => r.slug === slug).map((r) => deepClone(r));
  }

  // =========================================================================
  // 8. INTERVAL-BASED VIEWING ANALYTICS BOUND TO SIGNED VIEWER SESSION
  // =========================================================================

  _checkTrackRateLimit(rateKey) {
    const now = Date.now();
    const windowMs = 60 * 1000;

    if (this.trackRateLimits.size >= this.maxRateLimitEntries) {
      for (const [k, v] of this.trackRateLimits.entries()) {
        if (now > v.resetAt) this.trackRateLimits.delete(k);
      }
      if (this.trackRateLimits.size >= this.maxRateLimitEntries) {
        const oldestKey = this.trackRateLimits.keys().next().value;
        if (oldestKey) this.trackRateLimits.delete(oldestKey);
      }
    }

    const entry = this.trackRateLimits.get(rateKey) || { count: 0, resetAt: now + windowMs };
    if (now > entry.resetAt) {
      entry.count = 0;
      entry.resetAt = now + windowMs;
    }
    entry.count += 1;
    this.trackRateLimits.set(rateKey, entry);

    if (entry.count > this.maxTrackCallsPerMinute) {
      const err = new Error('Analytics event rate limit exceeded for this session.');
      err.statusCode = 429;
      err.code = 'TRACK_RATE_LIMIT_EXCEEDED';
      throw err;
    }
  }

  /**
   * Track viewer telemetry using server-verified viewerContextToken and watched intervals.
   * - Strictly binds to `ctx.sessionId` from the HMAC-signed `viewerContextToken`.
   * - Rejects any request where `payload.sessionId` does not match `ctx.sessionId` (`400 SESSION_ID_MISMATCH`).
   * - Scopes sessions by `${slug}:${ctx.mode}:rev${ctx.revision}:${ctx.sessionId}`.
   * - Validates and deduplicates `eventId`s.
   * - Commits session and webinar analytics atomically via `_commitTransaction`.
   */
  async trackEvent(slug, payload = {}, { viewerContextToken, userAgent = '', ip = '127.0.0.1' } = {}) {
    this._ensureHealthyState();
    const ctx = this.verifyViewerContext(slug, viewerContextToken);
    if (!ctx.valid) {
      const err = new Error(ctx.message || `Unauthorized analytics event: ${ctx.reason}`);
      err.statusCode = ctx.statusCode || 403;
      err.code = ctx.reason;
      throw err;
    }

    // Filter obvious bots/spiders
    if (/bot|crawler|spider|headlesschrome\/0/i.test(String(userAgent))) {
      return { ok: true, ignoredBot: true };
    }

    // Strictly bind to the signed viewerContextToken sessionId; reject any mismatched payload.sessionId
    if (
      payload.sessionId !== undefined &&
      payload.sessionId !== null &&
      String(payload.sessionId) !== ctx.sessionId
    ) {
      const err = new Error(
        `Session ID mismatch: payload.sessionId ("${payload.sessionId}") cannot override the signed viewerContextToken sessionId ("${ctx.sessionId}").`
      );
      err.statusCode = 400;
      err.code = 'SESSION_ID_MISMATCH';
      throw err;
    }

    const eventType = String(payload.eventType || '').trim();
    const allowedEvents = ['pageview', 'playback_start', 'watch_interval', 'pause', 'resume', 'seek', 'cta_impression', 'cta_click'];
    if (!allowedEvents.includes(eventType)) {
      const err = new Error(`Unsupported eventType "${eventType}".`);
      err.statusCode = 400;
      err.code = 'UNSUPPORTED_EVENT_TYPE';
      throw err;
    }

    let eventId = null;
    if (payload.eventId !== undefined && payload.eventId !== null && payload.eventId !== '') {
      const rawEventId = String(payload.eventId).trim();
      if (rawEventId.length > 120 || !/^[a-zA-Z0-9_.:-]+$/.test(rawEventId)) {
        const err = new Error('Invalid eventId format (must be 1-120 alphanumeric/._:- characters).');
        err.statusCode = 400;
        err.code = 'INVALID_EVENT_ID';
        throw err;
      }
      eventId = rawEventId;
    } else if (eventType === 'watch_interval') {
      const err = new Error('watch_interval events require a unique eventId for idempotency.');
      err.statusCode = 400;
      err.code = 'INVALID_EVENT_ID';
      throw err;
    }

    const authoritativeSessionId = ctx.sessionId;
    this._checkTrackRateLimit(`${ip}_${authoritativeSessionId}`);

    const scopedSessionKey = `${slug}:${ctx.mode}:rev${ctx.revision}:${authoritativeSessionId}`;
    const durationSeconds = Math.max(1, Number(ctx.snapshot.video?.durationSeconds) || 30);

    // Pre-validate watch_interval bounds BEFORE entering transaction so invalid intervals never mutate state
    let validatedInterval = null;
    if (eventType === 'watch_interval') {
      const rawStart = Number(payload.intervalStart);
      const rawEnd = Number(payload.intervalEnd);
      const playbackRate = Math.min(Math.max(Number(payload.playbackRate) || 1.0, 0.25), 2.0);
      const elapsedWallMs = payload.elapsedWallMs !== undefined ? Number(payload.elapsedWallMs) : null;
      const visibilityState = String(payload.visibilityState || 'visible');

      if (!Number.isFinite(rawStart) || !Number.isFinite(rawEnd) || rawEnd <= rawStart || rawStart < 0) {
        const err = new Error('Invalid watch_interval bounds: intervalStart and intervalEnd must satisfy 0 <= start < end.');
        err.statusCode = 400;
        err.code = 'INVALID_WATCH_INTERVAL';
        throw err;
      }

      const clampedStart = Math.min(Math.max(0, rawStart), durationSeconds);
      const clampedEnd = Math.min(Math.max(0, rawEnd), durationSeconds);
      const segmentDuration = Number((clampedEnd - clampedStart).toFixed(2));

      if (segmentDuration <= 0 || segmentDuration > 15) {
        const err = new Error(`Rejected watch_interval of length ${segmentDuration}s (exceeds 15s single-interval bound).`);
        err.statusCode = 400;
        err.code = 'WATCH_INTERVAL_OUT_OF_BOUNDS';
        throw err;
      }

      if (elapsedWallMs !== null && Number.isFinite(elapsedWallMs)) {
        const maxPossibleMediaSec = ((elapsedWallMs / 1000) * playbackRate) + 1.75;
        if (segmentDuration > maxPossibleMediaSec) {
          const err = new Error(`Rejected watch_interval: media delta ${segmentDuration}s exceeds elapsed wall time allowance.`);
          err.statusCode = 400;
          err.code = 'WATCH_INTERVAL_WALL_TIME_MISMATCH';
          throw err;
        }
      }

      validatedInterval = {
        clampedStart,
        clampedEnd,
        segmentDuration,
        visibilityState
      };
    }

    return this._commitTransaction(async (workingState, markTouched) => {
      const webinar = workingState.webinars[slug];
      const bucket = ctx.isPreview ? webinar.analytics.preview : webinar.analytics.production;
      const nowMs = Date.now();

      let session = workingState.sessions[scopedSessionKey];

      // Idempotency check: if session already processed this eventId, return without touching files
      if (session && eventId && session.processedEventIds.includes(eventId)) {
        return {
          ok: true,
          deduplicated: true,
          isPreview: ctx.isPreview,
          mode: ctx.mode,
          revision: ctx.revision,
          sessionId: authoritativeSessionId,
          scopedSessionKey,
          telemetryTrustLevel: 'CLIENT_REPORTED_BOUND_TO_SIGNED_SESSION',
          sessionMetrics: {
            uniqueWatchedSeconds: session.uniqueWatchedSeconds,
            totalPlaybackSeconds: session.totalPlaybackSeconds,
            watchedIntervals: session.watchedIntervals,
            milestonesReached: session.milestonesReached
          }
        };
      }

      if (!session) {
        session = {
          scopedSessionKey,
          sessionId: authoritativeSessionId,
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
        workingState.sessions[scopedSessionKey] = session;
        bucket.uniqueSessions = (bucket.uniqueSessions || 0) + 1;
      }

      if (eventId) {
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
      } else if (eventType === 'watch_interval' && validatedInterval) {
        const { clampedStart, clampedEnd, segmentDuration, visibilityState } = validatedInterval;

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

      markTouched('sessions', 'webinars');

      return {
        ok: true,
        deduplicated: false,
        isPreview: ctx.isPreview,
        mode: ctx.mode,
        revision: ctx.revision,
        sessionId: authoritativeSessionId,
        scopedSessionKey,
        telemetryTrustLevel: 'CLIENT_REPORTED_BOUND_TO_SIGNED_SESSION',
        sessionRefreshPolicy: 'NEW_SIGNED_SESSION_ON_PAGE_LOAD',
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

let _defaultEngineInstance = null;
function getDefaultWebinarEngine() {
  if (!_defaultEngineInstance || _defaultEngineInstance._closed) {
    _defaultEngineInstance = new WebinarEngine();
  }
  return _defaultEngineInstance;
}

const webinarEngine = new Proxy({}, {
  get(_target, prop) {
    const inst = getDefaultWebinarEngine();
    const val = inst[prop];
    return typeof val === 'function' ? val.bind(inst) : val;
  },
  set(_target, prop, value) {
    const inst = getDefaultWebinarEngine();
    inst[prop] = value;
    return true;
  }
});

module.exports = {
  WebinarEngine,
  webinarEngine,
  getDefaultWebinarEngine,
  WEBINAR_STATES,
  SERVER_CONSENT_CONFIG,
  getYuSleepApprovedReference,
  mergeIntervals,
  sumIntervals
};
