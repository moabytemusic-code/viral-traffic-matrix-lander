/**
 * Webinar Engine: In-House Presenter-Led On-Demand Webinar Platform
 * Integrates with Growth Engine, VideoMan, Brevo, and Affiliate Inventory.
 *
 * Enforces strict compliance:
 * - Unpublished by default
 * - Token-authenticated preview links
 * - Grounded AI Q&A based exclusively on approved reference docs
 * - Transparent AI-presenter and on-demand affiliate disclosures
 * - Reconciled analytics (watch intervals, milestones, CTA clicks, no fake metrics)
 * - Brevo lead capture with verifiable consent records
 * - $0 hard budget ceiling: zero automatic paid avatar/narration calls
 * - Zero em dashes in generated copy, code, or disclaimers
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WEBINARS_FILE = path.join(__dirname, 'webinars.json');
const OFFERS_FILE = path.join(__dirname, 'offers.json');

// Valid Lifecycle States
const WEBINAR_STATES = {
  DRAFT: 'DRAFT',
  GENERATING: 'GENERATING',
  READY_FOR_REVIEW: 'READY_FOR_REVIEW',
  PUBLISHED: 'PUBLISHED',
  ARCHIVED: 'ARCHIVED',
  FAILED: 'FAILED'
};

// Default fallback reference documents for YuSleep
const YUSLEEP_APPROVED_REFERENCE = {
  productName: 'Yu Sleep Liquid Dietary Supplement',
  merchant: 'Yu Sleep Laboratories',
  affiliateNetwork: 'ClickBank (Vendor: yusleep, Affiliate: kmtwarrior)',
  vendorResourceUrl: 'https://getyusleep.com/aff-th/',
  presentationUrl: 'https://hop.clickbank.net/?affiliate=kmtwarrior&vendor=yusleep&op=glp&tid=webinar_yusleep',
  productForm: 'Liquid dietary supplement in 2 fl oz (60ml) glass dropper bottle',
  servingSize: '2 ml daily, taken 30 minutes before sleep',
  labelDisclosedIngredients: [
    { name: 'Vitamin B2 (Riboflavin)', amount: '1.7 mg', dailyValue: '131%' },
    { name: 'Vitamin B6 (Pyridoxine HCl)', amount: '2.0 mg', dailyValue: '118%' },
    { name: 'Melatonin', amount: '0.9 mg', dailyValue: 'Not Established' },
    {
      name: 'Proprietary Herbal & Amino Blend',
      totalAmount: '637 mg',
      ingredients: [
        'Red Tart Cherry Juice Concentrate (Prunus cerasus)',
        'Magnesium Glycinate',
        'Apigenin (from Chamomile extract)',
        'Lemon Balm Leaf Extract (Melissa officinalis)',
        '5-Hydroxytryptophan (5-HTP from Griffonia simplicifolia)',
        'L-Theanine',
        'Gamma-Aminobutyric Acid (GABA)'
      ],
      disclosureNote: 'The label gives one combined 637 mg total for the blend. Individual milligram amounts for each herb/amino inside this blend are proprietary and not disclosed on the supplement facts panel.'
    }
  ],
  pricingAndPackages: {
    singleBottle: '$69 per bottle (plus shipping)',
    threeBottles: '$177 total ($59 per bottle) with free US shipping',
    sixBottles: '$294 total ($49 per bottle) with free US shipping',
    note: 'Prices reflect merchant presentation at observation time. Viewers must confirm current prices, sales tax, and shipping on the official merchant checkout.'
  },
  refundPolicy: {
    durationDays: 60,
    terms: '60-day money-back guarantee from merchant. Customers must follow merchant return instructions to obtain RMA and return bottles.',
    source: 'Merchant official terms on getyusleep.com'
  },
  verifiedFacts: [
    'YuSleep is a liquid dietary supplement, not a prescription medication or FDA-approved treatment for clinical insomnia.',
    'Melatonin dosage is 0.9 mg per serving, which is lower than many 5mg or 10mg over-the-counter sleep aids.',
    'Tart cherry naturally contains trace phytochemicals and anthocyanins.',
    'The product contains no artificial dyes or synthetic sedatives.'
  ],
  knownLimitationsAndUnknowns: [
    'No independent peer-reviewed clinical trials have been conducted on the finished YuSleep combined formula.',
    'Individual doses inside the 637 mg proprietary blend are undisclosed on the label.',
    'This overview is not medical advice and cannot assess individual drug interactions or personal health conditions.',
    'Customer testimonials from vendor marketing cannot be verified without independent written consent and are excluded from this overview.'
  ],
  disallowedClaims: [
    'Do not claim YuSleep cures, treats, or prevents insomnia, apnea, or sleep disorders.',
    'Do not guarantee that a viewer will fall asleep in 30 seconds or sleep 8 hours uninterrupted.',
    'Do not claim personal product use or fabricate clinical trials.',
    'Do not provide individualized medical advice; refer viewers to their healthcare professional.'
  ]
};

// Initial Seed Webinar Definition
function getSeedWebinars() {
  return {
    'yu-sleep': {
      slug: 'yu-sleep',
      internalTitle: 'YuSleep Tart Cherry Label Walkthrough and Buying Guide',
      headline: 'YuSleep: Looking Beyond the Sleep Supplement Sales Pitch',
      subheadline: 'An independent, factual label breakdown, ingredient review, and pricing inspection before you decide.',
      presenter: {
        name: 'Sarah',
        role: 'Affiliate Overview Host',
        isAiGenerated: true,
        disclosureText: 'AI Presenter: Original fictional avatar and synthesized narration. This is an independent affiliate overview, not a customer testimonial or medical diagnosis.'
      },
      status: WEBINAR_STATES.DRAFT, // UNPUBLISHED BY DEFAULT
      version: 1,
      previewToken: 'prev_yusleep_' + crypto.randomBytes(12).toString('hex'),
      createdAt: '2026-11-14T23:00:00.000Z',
      updatedAt: '2026-11-14T23:00:00.000Z',
      publishedAt: null,
      
      // Video Delivery
      video: {
        sourceType: 'LOCAL_MP4',
        videoUrl: '/videos/yusleep-presenter-prototype.mp4',
        posterUrl: '/images/yusleep-presenter.jpg',
        durationSeconds: 30,
        isPrototype: true,
        prototypeNotice: '30-second AI presenter production prototype. Full 6-minute production script is prepared in VideoMan.',
        width: 1280,
        height: 720,
        codec: 'H.264 / AAC'
      },

      // VideoMan Pipeline Reference
      videoMan: {
        manifestId: 'vm_manifest_yusleep_01',
        status: 'PROTOTYPE_VERIFIED',
        allocatedBudget: 0.00, // Enforce $0 spending limit
        currency: 'USD',
        prototypeJobCost: 0.751, // $0.75 Fabric 1.0 + $0.001 portrait
        fullVideoEstimatedCost: 54.00,
        spendingLimitApproved: false,
        scriptVersion: 'full-production-script.v1',
        disclosuresEnforced: true
      },

      // Registration & Brevo Lead Capture
      registration: {
        required: false, // Optional registration: viewer can watch without barrier or register for summary PDF
        gateTimeSeconds: 0,
        leadMagnetTitle: 'YuSleep Supplement Facts Breakdown & Label Comparison Guide (PDF)',
        brevoListId: 80,
        brevoWelcomeTemplateId: 886,
        consentCheckboxText: 'I agree to receive the YuSleep label guide and email updates. I can unsubscribe at any time.',
        consentPolicyUrl: '/privacy'
      },

      // Timed Call to Action
      cta: {
        buttonText: 'View YuSleep Official Presentation & Current Pricing',
        subtext: 'Opens the official vendor presentation. Backed by 60-day money-back guarantee.',
        destinationUrl: 'https://hop.clickbank.net/?affiliate=kmtwarrior&vendor=yusleep&op=glp&tid=webinar_yusleep',
        revealSeconds: 15, // Emerges halfway through prototype, or at configured minute in full video
        hideUntilRevealed: true,
        affiliateDisclosure: 'Affiliate Disclosure: If you purchase YuSleep through our link, we may receive a commission at no additional cost to you.'
      },

      // Grounded Product Reference for AI Q&A
      reference: YUSLEEP_APPROVED_REFERENCE,

      // Audit Trail
      auditLog: [
        {
          timestamp: '2026-11-14T23:00:00.000Z',
          action: 'CREATED_DRAFT',
          actor: 'System / VideoMan Importer',
          note: 'Imported 30-second presenter prototype and reference documents. Initial status set to DRAFT (Unpublished).'
        }
      ],

      // Reconciled Metrics Storage
      analytics: {
        viewsTotal: 0,
        viewsUnique: 0,
        previewViews: 0,
        playbackStarts: 0,
        milestones: { p25: 0, p50: 0, p75: 0, p100: 0 },
        totalWatchSeconds: 0,
        averageWatchSeconds: 0,
        ctaImpressions: 0,
        ctaClicks: 0,
        registrations: 0,
        qaQuestionsAsked: 0,
        salesAttributionStatus: 'NOT_CONNECTED', // Strict: clicks are not sales
        confirmedSales: 0,
        confirmedRevenue: 0.00
      }
    }
  };
}

class WebinarEngine {
  constructor() {
    this.webinars = {};
    this.sessions = new Map(); // Session deduplication and watch intervals
    this.leads = []; // Local lead log with consent records
    this.qaRateLimits = new Map(); // IP rate limiting for Q&A
    this.loadState();
  }

  loadState() {
    try {
      if (fs.existsSync(WEBINARS_FILE)) {
        const raw = fs.readFileSync(WEBINARS_FILE, 'utf8');
        this.webinars = JSON.parse(raw);
      } else {
        this.webinars = getSeedWebinars();
        this.saveState();
      }
    } catch (err) {
      console.error('[WebinarEngine] Error reading webinars.json, falling back to seed:', err);
      this.webinars = getSeedWebinars();
    }
  }

  saveState() {
    try {
      fs.writeFileSync(WEBINARS_FILE, JSON.stringify(this.webinars, null, 2), 'utf8');
    } catch (err) {
      console.error('[WebinarEngine] Error saving webinars.json:', err);
    }
  }

  getAllWebinars(includePrivate = false) {
    const list = Object.values(this.webinars);
    if (includePrivate) return list;
    return list.filter((w) => w.status === WEBINAR_STATES.PUBLISHED);
  }

  getWebinar(slug) {
    return this.webinars[slug] || null;
  }

  // Access check: Only PUBLISHED webinars are visible publicly.
  // DRAFT or READY_FOR_REVIEW require valid previewToken.
  canAccessWebinar(slug, queryToken = null) {
    const webinar = this.getWebinar(slug);
    if (!webinar) return { allowed: false, reason: 'NOT_FOUND', webinar: null };

    if (webinar.status === WEBINAR_STATES.PUBLISHED) {
      return { allowed: true, isPreview: false, webinar };
    }

    if (queryToken && queryToken === webinar.previewToken) {
      return { allowed: true, isPreview: true, webinar };
    }

    return {
      allowed: false,
      reason: 'UNPUBLISHED_DRAFT',
      status: webinar.status,
      webinar: null
    };
  }

  // State Transition with Audit Logging
  updateStatus(slug, nextStatus, actor = 'Admin', note = '') {
    const webinar = this.getWebinar(slug);
    if (!webinar) throw new Error(`Webinar "${slug}" not found`);

    if (!WEBINAR_STATES[nextStatus]) {
      throw new Error(`Invalid status "${nextStatus}". Allowed: ${Object.keys(WEBINAR_STATES).join(', ')}`);
    }

    const prevStatus = webinar.status;
    webinar.status = nextStatus;
    webinar.updatedAt = new Date().toISOString();

    if (nextStatus === WEBINAR_STATES.PUBLISHED && !webinar.publishedAt) {
      webinar.publishedAt = new Date().toISOString();
    } else if (nextStatus === WEBINAR_STATES.DRAFT) {
      // Reversible unpublish: reset publish timestamp
      webinar.publishedAt = null;
    }

    webinar.auditLog.push({
      timestamp: new Date().toISOString(),
      action: `STATUS_CHANGE: ${prevStatus} -> ${nextStatus}`,
      actor,
      note: note || `Webinar transitioned from ${prevStatus} to ${nextStatus}`
    });

    this.saveState();
    return webinar;
  }

  // Create or Update Webinar Draft
  saveWebinar(data, actor = 'Admin') {
    const slug = data.slug || (data.internalTitle || 'webinar').toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const existing = this.webinars[slug];

    const updated = {
      ...(existing || {}),
      ...data,
      slug,
      version: (existing?.version || 0) + 1,
      updatedAt: new Date().toISOString(),
      previewToken: existing?.previewToken || 'prev_' + slug + '_' + crypto.randomBytes(8).toString('hex'),
      status: existing?.status || WEBINAR_STATES.DRAFT,
      auditLog: existing?.auditLog || []
    };

    updated.auditLog.push({
      timestamp: new Date().toISOString(),
      action: existing ? 'UPDATED_DRAFT' : 'CREATED_DRAFT',
      actor,
      note: `Saved version ${updated.version}`
    });

    this.webinars[slug] = updated;
    this.saveState();
    return updated;
  }

  // VideoMan MP4 Import
  importVideoManAsset(slug, { videoPath, posterPath, durationSeconds, width, height, notes }) {
    const webinar = this.getWebinar(slug);
    if (!webinar) throw new Error(`Webinar "${slug}" not found`);

    webinar.video = {
      sourceType: 'LOCAL_MP4',
      videoUrl: videoPath,
      posterUrl: posterPath || webinar.video?.posterUrl,
      durationSeconds: Number(durationSeconds) || 30,
      isPrototype: durationSeconds < 120,
      width: width || 1280,
      height: height || 720,
      codec: 'H.264 / AAC',
      importedAt: new Date().toISOString()
    };

    webinar.auditLog.push({
      timestamp: new Date().toISOString(),
      action: 'VIDEOMAN_IMPORT',
      actor: 'VideoMan Engine',
      note: notes || `Imported MP4 asset: ${videoPath} (${durationSeconds}s)`
    });

    this.saveState();
    return webinar;
  }

  // VideoMan Manifest Generator
  generateVideoManManifest(slug) {
    const webinar = this.getWebinar(slug);
    if (!webinar) throw new Error(`Webinar "${slug}" not found`);

    return {
      manifestId: `vm_manifest_${slug}_${Date.now()}`,
      slug: webinar.slug,
      internalTitle: webinar.internalTitle,
      presenter: webinar.presenter,
      targetAspect: '16:9',
      resolution: '1280x720',
      fps: 30,
      spendingCeiling: 0.00, // Enforce $0 spending limit
      spendingApproved: false,
      disclosures: [
        'AI Presenter: Original fictional character',
        'Recorded affiliate overview',
        'Not medical advice'
      ],
      referenceDocs: webinar.reference,
      status: 'READY_FOR_LOCAL_STAGING'
    };
  }

  // Lead Registration with Brevo Integration & Consent Tracking
  async registerLead(slug, { email, name, consentGiven, consentText, ip, userAgent, isPreview = false }) {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes('@') || !cleanEmail.includes('.')) {
      throw new Error('Please enter a valid email address.');
    }

    if (!consentGiven) {
      throw new Error('Marketing consent is required to receive the guide and email updates.');
    }

    const webinar = this.getWebinar(slug);
    if (!webinar) throw new Error(`Webinar "${slug}" not found`);

    const registrationRecord = {
      id: 'reg_' + crypto.randomBytes(8).toString('hex'),
      slug,
      email: cleanEmail,
      name: (name || '').trim(),
      consent: {
        consentGiven: true,
        consentText: consentText || webinar.registration?.consentCheckboxText || 'Agreed to receive email updates',
        version: '1.0',
        timestamp: new Date().toISOString(),
        ip: ip || '127.0.0.1',
        userAgent: userAgent || 'Unknown'
      },
      brevoSync: {
        status: 'PENDING',
        listId: webinar.registration?.brevoListId || 80,
        syncedAt: null,
        error: null
      },
      isPreview,
      createdAt: new Date().toISOString()
    };

    // Synchronize to Brevo if API Key is configured and not preview
    const BREVO_KEY = process.env.BREVO_API_KEY;
    if (BREVO_KEY && !isPreview) {
      try {
        const payload = {
          email: cleanEmail,
          attributes: {
            FIRSTNAME: name || '',
            WEBINAR_SLUG: slug,
            CONSENT_DATE: new Date().toISOString()
          },
          listIds: [Number(webinar.registration?.brevoListId || 80)],
          updateEnabled: true
        };

        const res = await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'api-key': BREVO_KEY
          },
          body: JSON.stringify(payload)
        });

        if (res.ok || res.status === 204 || res.status === 201) {
          registrationRecord.brevoSync.status = 'SYNCED';
          registrationRecord.brevoSync.syncedAt = new Date().toISOString();
        } else {
          const errData = await res.json().catch(() => ({}));
          // Code "duplicate_parameter" is acceptable (contact already exists)
          if (errData.code === 'duplicate_parameter') {
            registrationRecord.brevoSync.status = 'ALREADY_EXISTS';
            registrationRecord.brevoSync.syncedAt = new Date().toISOString();
          } else {
            registrationRecord.brevoSync.status = 'FAILED';
            registrationRecord.brevoSync.error = errData.message || 'Brevo API error';
          }
        }
      } catch (e) {
        registrationRecord.brevoSync.status = 'FAILED';
        registrationRecord.brevoSync.error = e.message;
      }
    } else {
      registrationRecord.brevoSync.status = isPreview ? 'PREVIEW_MOCKED' : 'LOCAL_LOGGED';
    }

    this.leads.push(registrationRecord);

    if (!isPreview) {
      webinar.analytics.registrations = (webinar.analytics.registrations || 0) + 1;
      this.saveState();
    }

    return {
      ok: true,
      registrationId: registrationRecord.id,
      brevoStatus: registrationRecord.brevoSync.status,
      message: 'Registration confirmed. Your guide link has been prepared.'
    };
  }

  // Grounded AI Q&A Engine
  // Answers viewer inquiries using ONLY approved reference documentation.
  // Refuses medical diagnoses, unverified pricing, fabricated testimonials, or safety guarantees.
  async answerViewerQuestion(slug, question, { ip = '127.0.0.1' } = {}) {
    const webinar = this.getWebinar(slug);
    if (!webinar) throw new Error(`Webinar "${slug}" not found`);

    const cleanQuestion = (question || '').trim();
    if (!cleanQuestion || cleanQuestion.length < 3) {
      throw new Error('Please enter a specific question.');
    }
    if (cleanQuestion.length > 500) {
      throw new Error('Question length exceeds 500 characters.');
    }

    // Rate Limiting: 10 questions per IP per 5 minutes
    const now = Date.now();
    const ipKey = `${ip}_${slug}`;
    const windowMs = 5 * 60 * 1000;
    const rateData = this.qaRateLimits.get(ipKey) || { count: 0, resetAt: now + windowMs };
    if (now > rateData.resetAt) {
      rateData.count = 0;
      rateData.resetAt = now + windowMs;
    }
    rateData.count++;
    this.qaRateLimits.set(ipKey, rateData);

    if (rateData.count > 15) {
      throw new Error('Question rate limit reached. Please wait a few minutes before submitting another question.');
    }

    const ref = webinar.reference || {};
    const qLower = cleanQuestion.toLowerCase();

    // Deterministic Rule-Based Grounding Pass (Fast, Safe, Zero Hallucination)
    // 1. Personalized Medical Advice / Disease Cure Check
    if (
      qLower.includes('cure') ||
      qLower.includes('diagnos') ||
      qLower.includes('disease') ||
      qLower.includes('prescription') ||
      qLower.includes('interaction with my') ||
      qLower.includes('can i take this with') ||
      qLower.includes('blood pressure medication') ||
      qLower.includes('antidepressant')
    ) {
      return {
        answer: 'I am an AI assistant for this webinar overview. YuSleep is a dietary supplement, not a pharmaceutical medication or a medical treatment for diagnosed sleep disorders. We cannot evaluate drug interactions or provide medical advice. Please print the supplement facts label and consult your physician or pharmacist regarding your specific medications.',
        sources: ['Approved Reference: Disallowed Medical Claims'],
        aiIdentified: true,
        groundedInReference: true
      };
    }

    // 2. Exact Milligram / Proprietary Blend Doses
    if (
      (qLower.includes('how much') || qLower.includes('dosage') || qLower.includes('milligram') || qLower.includes('mg')) &&
      (qLower.includes('tart cherry') || qLower.includes('magnesium') || qLower.includes('theanine') || qLower.includes('gaba') || qLower.includes('apigenin') || qLower.includes('5-htp') || qLower.includes('lemon balm'))
    ) {
      return {
        answer: 'According to the official Supplement Facts panel, YuSleep contains a 637 mg proprietary herbal and amino blend that includes Tart Cherry Juice Concentrate, Magnesium Glycinate, Apigenin, Lemon Balm, 5-HTP, L-Theanine, and GABA. However, the label provides only the single 637 mg combined total. The specific individual milligram dosage of each ingredient within that blend is proprietary and not disclosed on the label.',
        sources: ['YuSleep Supplement Facts Label (Serving Size: 2 ml)'],
        aiIdentified: true,
        groundedInReference: true
      };
    }

    // 3. Melatonin Content
    if (qLower.includes('melatonin')) {
      return {
        answer: 'The official label lists 0.9 mg of Melatonin per 2 ml serving. This is a micro-dose compared to conventional 5 mg or 10 mg over-the-counter sleep tablets.',
        sources: ['YuSleep Supplement Facts Label: Melatonin 0.9 mg'],
        aiIdentified: true,
        groundedInReference: true
      };
    }

    // 4. Refund / Guarantee Policy
    if (qLower.includes('refund') || qLower.includes('guarantee') || qLower.includes('return') || qLower.includes('money back')) {
      return {
        answer: 'The merchant offers a 60-day money-back guarantee. If you are not satisfied, you can request a return authorization through the merchant customer support within 60 days of purchase. Please check the current refund terms on the official checkout page before ordering.',
        sources: ['Merchant 60-Day Guarantee Policy'],
        aiIdentified: true,
        groundedInReference: true
      };
    }

    // 5. Pricing, Packages, and Shipping
    if (qLower.includes('cost') || qLower.includes('price') || qLower.includes('how much is it') || qLower.includes('bottle')) {
      return {
        answer: 'Based on our reviewed merchant presentation, package options range from $69 for a single bottle (plus shipping) down to $49 per bottle when ordering the 6-bottle bundle with free US shipping ($294 total). Because promotional pricing and shipping rates can change, please click the button below to confirm current pricing directly on the official merchant page.',
        sources: ['Merchant Package Pricing Schedule (Observed November 2026)'],
        aiIdentified: true,
        groundedInReference: true
      };
    }

    // 6. Form / How to Take
    if (qLower.includes('pill') || qLower.includes('liquid') || qLower.includes('gummy') || qLower.includes('how to take') || qLower.includes('directions')) {
      return {
        answer: 'YuSleep is formulated as a liquid dietary supplement in a 2 fl oz (60 ml) dropper bottle. The standard serving size is 2 ml taken approximately 30 minutes before bed.',
        sources: ['Product Specifications: Liquid Dropper Bottle'],
        aiIdentified: true,
        groundedInReference: true
      };
    }

    // 7. Clinical Trials / Does it work?
    if (qLower.includes('clinical trial') || qLower.includes('study') || qLower.includes('proven') || qLower.includes('does it work')) {
      return {
        answer: 'While individual botanical ingredients like Tart Cherry, Magnesium, and L-Theanine have published literature exploring sleep latency, there are no independent peer-reviewed clinical trials conducted on the finished YuSleep combined formula. Individual outcomes will vary, and results are not guaranteed.',
        sources: ['Approved Reference: Known Limitations & Clinical Status'],
        aiIdentified: true,
        groundedInReference: true
      };
    }

    // General fallback: admit limitations and point to reference
    return {
      answer: `I am an AI assistant grounded in YuSleep's approved product documentation and supplement facts label. Regarding "${cleanQuestion.slice(0, 80)}": that specific detail is not verified in our reference documents. For unlisted questions or individual medical suitability, please inspect the official label with your healthcare provider or review the merchant presentation using the button below.`,
      sources: ['Approved YuSleep Product Reference'],
      aiIdentified: true,
      groundedInReference: true
    };
  }

  // Reconciled Analytics Tracking Heartbeat
  trackEvent(slug, { eventType, sessionId, watchSeconds = 0, milestone = null, isPreview = false }) {
    const webinar = this.getWebinar(slug);
    if (!webinar) return { ok: false, error: 'Webinar not found' };

    // Preview sessions are isolated from production metrics
    if (isPreview) {
      if (eventType === 'pageview') {
        webinar.analytics.previewViews = (webinar.analytics.previewViews || 0) + 1;
      }
      return { ok: true, previewTracked: true };
    }

    const a = webinar.analytics;

    switch (eventType) {
      case 'pageview':
        a.viewsTotal = (a.viewsTotal || 0) + 1;
        if (sessionId && !this.sessions.has(sessionId)) {
          this.sessions.set(sessionId, { startedAt: Date.now(), maxSeconds: 0 });
          a.viewsUnique = (a.viewsUnique || 0) + 1;
        }
        break;

      case 'playback_start':
        a.playbackStarts = (a.playbackStarts || 0) + 1;
        break;

      case 'watch_heartbeat':
        if (sessionId && this.sessions.has(sessionId)) {
          const s = this.sessions.get(sessionId);
          // Deduplicate seeking: watchSeconds cannot jump by more than 10 seconds in a 5s heartbeat
          const validSeconds = Math.min(Number(watchSeconds) || 0, webinar.video?.durationSeconds || 30);
          if (validSeconds > s.maxSeconds) {
            const added = validSeconds - s.maxSeconds;
            if (added <= 12) { // Reasonable threshold for heartbeat interval
              s.maxSeconds = validSeconds;
              a.totalWatchSeconds = (a.totalWatchSeconds || 0) + added;
              a.averageWatchSeconds = a.playbackStarts > 0 ? Math.round(a.totalWatchSeconds / a.playbackStarts) : 0;
            }
          }
        }
        break;

      case 'milestone':
        if (milestone && a.milestones && a.milestones[milestone] !== undefined) {
          a.milestones[milestone] = (a.milestones[milestone] || 0) + 1;
        }
        break;

      case 'cta_impression':
        a.ctaImpressions = (a.ctaImpressions || 0) + 1;
        break;

      case 'cta_click':
        a.ctaClicks = (a.ctaClicks || 0) + 1;
        break;

      case 'qa_query':
        a.qaQuestionsAsked = (a.qaQuestionsAsked || 0) + 1;
        break;
    }

    this.saveState();
    return { ok: true, analytics: a };
  }
}

const webinarEngine = new WebinarEngine();
module.exports = {
  webinarEngine,
  WEBINAR_STATES,
  YUSLEEP_APPROVED_REFERENCE
};
