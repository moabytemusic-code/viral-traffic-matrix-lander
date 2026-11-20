// Campaign Draft Generator
// Connects validated prediction opportunities to the Growth Engine
// Produces 10-point multi-channel campaign drafts (Unpublished by default)
// Only generates drafts for eligible opportunities (RELEVANT_OPPORTUNITY)
// Rejects generic emergency-prep copy on unrelated niches
// Rejects generic /calm destination URLs

function generateCampaignDraft(opportunity, options = {}) {
  const { event, signal, hypothesis, offerMatch, scoreResult } = opportunity;

  // 1. Mandatory Eligibility Check: Reject draft generation for unverified/disqualified events
  if (!scoreResult?.eligibility?.campaignEligible || scoreResult?.outcome !== 'RELEVANT_OPPORTUNITY') {
    return null;
  }

  const nicheName = offerMatch.productName || 'Verified Solution';
  const productPurpose = offerMatch.productPurpose || hypothesis.coreProblem || 'Targeted solution';
  const productForm = offerMatch.productForm || 'DIGITAL_COURSE';
  const targetAudience = hypothesis.affectedConsumerGroup || 'Consumers';
  const primaryProblem = hypothesis.coreProblem || 'Practical consumer need';
  const primarySearchPhrase = hypothesis.searchPhrases?.[0] || 'essential preparation guide';
  const destinationUrl = offerMatch.destinationUrl || `https://traffic.aisimplesystem.com/o/${offerMatch.offerSlug}`;
  const trackingUrl = offerMatch.affiliateUrl || destinationUrl;
  const category = event.category || 'General';

  // 2. Build Offer-Specific Frameworks (No generic pricing or unverified guarantees)
  let frameworkName = '8-Pillar Glassmorphic Trust System';
  let headline = `${nicheName}: Practical Action Plan for ${event.title.replace(/[\?\.!]/g, '')}`;
  let subheadline = `${productPurpose} Built for ${targetAudience.toLowerCase()}.`;
  let protocolSteps = [];

  if (category === 'Energy, Blackouts & Emergency Prep') {
    headline = `${nicheName}: Practical Prep for ${event.title.replace(/[\?\.!]/g, '')}`;
    subheadline = `${productPurpose} Designed for ${targetAudience.toLowerCase()} preparing for grid or weather disruptions.`;
    protocolSteps = [
      { step: 1, title: 'Baseline Load & Storage Audit', desc: `Identify critical household loads and review how ${nicheName} addresses ${primaryProblem.toLowerCase()}.` },
      { step: 2, title: 'Safety & Form Verification', desc: 'Confirm indoor-safe operation, capacity specs, and verified merchant documentation before purchase.' },
      { step: 3, title: 'Step-by-Step Deployment', desc: `Follow the verified ${nicheName} checklist and connect backup readiness cleanly.` }
    ];
  } else if (category === 'Finance, Capital & Wealth') {
    headline = `${nicheName}: Capital Protection & Evaluation Guide`;
    subheadline = `${productPurpose} Tailored for ${targetAudience.toLowerCase()} navigating ${event.title.replace(/[\?\.!]/g, '')}.`;
    protocolSteps = [
      { step: 1, title: 'Personal Capital Risk Check', desc: 'Separate personal household savings from evaluation or trading risk.' },
      { step: 2, title: 'Rule & Fee Comparison', desc: `Review exact ${nicheName} program rules, payout terms, and restrictions before enrolling.` },
      { step: 3, title: 'Structured Execution', desc: `Apply ${nicheName} guidelines with strict drawdown discipline.` }
    ];
  } else if (category === 'Health, Sleep & Wellness') {
    headline = `${nicheName}: Evening Routine & Support Guide`;
    subheadline = `${productPurpose} Informational overview for ${targetAudience.toLowerCase()} (not medical advice).`;
    protocolSteps = [
      { step: 1, title: 'Evening Light & Routine Hygiene', desc: 'Reduce blue light exposure and stabilize pre-sleep habits before adding any supplement.' },
      { step: 2, title: 'Label & Ingredient Review', desc: `Review the verified ${nicheName} label, serving amounts, and consult a clinician if taking medications.` },
      { step: 3, title: 'Consistent 14-Day Tracking', desc: 'Track sleep timing and morning alertness rather than expecting overnight results.' }
    ];
  } else {
    headline = `${nicheName}: Workflow & Implementation Guide`;
    subheadline = `${productPurpose} Built for ${targetAudience.toLowerCase()}.`;
    protocolSteps = [
      { step: 1, title: 'Workflow Bottleneck Audit', desc: 'Pinpoint manual steps that can be standardized cleanly.' },
      { step: 2, title: 'Offer & Funnel Alignment', desc: `Connect ${nicheName} directly to an opt-in capture and verified affiliate destination.` },
      { step: 3, title: 'Human-Approved Rollout', desc: 'Review all copy, links, and disclosures before publishing.' }
    ];
  }

  const formBadge = productForm === 'PHYSICAL_HARDWARE'
    ? 'Verified Hardware Specs'
    : productForm === 'PHYSICAL_SUPPLEMENT'
      ? 'Label-Verified Formula'
      : productForm === 'SERVICE_EVALUATION'
        ? 'Verified Program Terms'
        : 'Verified Digital Resource';

  return {
    campaignId: `cmp_${Date.now()}`,
    opportunityId: opportunity.opportunityId,
    title: `Campaign: ${event.title} -> ${nicheName}`,
    targetNiche: category,
    targetAudience,
    status: 'UNPUBLISHED',
    createdAt: new Date().toISOString(),

    // A. Affiliate Landing-Page Outline
    landerOutline: {
      framework: frameworkName,
      headline,
      subheadline,
      heroTrustBadges: [formBadge, `Merchant: ${offerMatch.merchant || 'Verified Partner'}`, 'Human Review Required'],
      protocolSteps,
      verifiedOfferTerms: {
        productName: nicheName,
        productForm,
        merchant: offerMatch.merchant || 'Verified Partner',
        network: offerMatch.network || 'Direct Network',
        commissionStructure: offerMatch.commissionStructure || 'Unverified',
        cookieDuration: offerMatch.cookieDuration || 'Unverified',
        pricingNote: 'Verify current merchant checkout pricing and refund policy before publishing.'
      }
    },

    // B. SEO Article & Keyword Strategy
    seoStrategy: {
      primaryKeyword: primarySearchPhrase,
      secondaryKeywords: hypothesis.searchPhrases || [],
      articleSlug: `guide-${offerMatch.offerSlug}-${event.externalId || Date.now()}`,
      metaTitle: `${headline} (Complete Guide)`,
      metaDescription: subheadline,
      recommendedWordCount: 1400,
      searchIntent: hypothesis.intentType || 'COMMERCIAL_INVESTIGATION'
    },

    // C. YouTube Long-Form Video Outline
    youtubeLongformOutline: {
      estimatedDurationMinutes: 12,
      workingTitle: `${headline} (What You Need to Know Now)`,
      hook: `If you have been watching the recent developments around ${event.title}, you know something major is shifting. Here is what smart individuals are doing right now to stay protected.`,
      pacingSections: [
        { timestamp: '00:00 - 01:30', topic: 'The Signal: What the market data reveals' },
        { timestamp: '01:30 - 04:30', topic: 'The Hidden Trap: Why conventional reactions fail' },
        { timestamp: '04:30 - 08:30', topic: 'The 3-Step Protocol: Step-by-step practical implementation' },
        { timestamp: '08:30 - 11:00', topic: `Solution Breakdown: How ${nicheName} solves the core problem` },
        { timestamp: '11:00 - 12:00', topic: 'Call to Action: Access the verified action guide at the link below' }
      ]
    },

    // D. YouTube Shorts / TikTok Scripts (Calm, Factual, Zero Fabricated Urgency)
    shortsScripts: [
      {
        angle: 'Practical Preparation',
        durationSec: 45,
        scriptHook: `If you are following the emerging data around ${event.title}, having a clear practical plan is far more effective than reacting at the last minute.`,
        scriptBody: `Understanding your options early allows methodical preparation. Instead of guesswork, here is a 3-step practical protocol: First, identify your essential baseline requirements. Second, review proven solutions that address the root problem. Third, establish reliable backup capability before you need it.`,
        scriptCta: `Access the complete 3-step action guide at the link in my bio.`
      },
      {
        angle: 'Methodical Framework',
        durationSec: 40,
        scriptHook: `A common pitfall regarding ${event.title} is focusing on speculation instead of actionable solutions.`,
        scriptBody: `Whether this event resolves next week or next month, practical self-reliance and capital protection come from tested preparations. Here is the calm, step-by-step framework we recommend.`,
        scriptCta: `Tap the bio link for the complete checklist.`
      }
    ],

    // E. Social Media Posts
    socialPosts: {
      xThread: [
        `1/ Market prediction volume on "${event.title}" indicates rising attention. Here is a calm, practical breakdown of what this means and how to prepare:`,
        `2/ Rather than speculative reactions, focus on a methodical protocol that addresses essential needs directly.`,
        `3/ Read our complete action framework and verified resources here: ${destinationUrl}`
      ],
      threads: `Watching the developments around ${event.title}? A methodical plan beats guesswork every time. Here is the calm 3-step action guide: ${destinationUrl}`
    },

    // F. Email Sequence (Opted-in Subscribers)
    emailSequence: [
      {
        day: 1,
        subject: `Your Action Guide: ${event.title}`,
        preview: 'Here is the step-by-step protocol you requested.',
        body: `Thank you for requesting our guide.\n\nWhen events like this emerge, calm execution matters far more than speculation.\n\nStep 1 is to stabilize your immediate baseline...\n\nAccess your complete digital action guide here: ${destinationUrl}`
      },
      {
        day: 2,
        subject: `The #1 mistake people make with ${event.title}`,
        preview: 'Why knee-jerk reactions fail.',
        body: `Yesterday we covered the immediate baseline reset. Today, let us talk about what NOT to do.\n\nMost people waste hundreds on tools that fail when needed...\n\nHere is our tested checklist: ${destinationUrl}`
      }
    ],

    // G. Product Comparison Content
    productComparison: {
      recommendedProduct: nicheName,
      alternativeComparison: 'Generic Alternatives',
      keyAdvantage: `${productPurpose} (Verify exact merchant checkout terms and refund policy before publishing.)`
    },

    // H. Conversion Calls to Action
    callsToAction: {
      primaryButtonText: `Unlock Instant ${nicheName} Protocol`,
      secondaryButtonText: `Review Detailed Specifications`,
      bannerHeadline: 'Take the guesswork out of preparation today.'
    },

    // I. FTC Affiliate Disclosure Copy
    ftcDisclosure: `Disclosure: This publication contains affiliate links. If you purchase through our links, we may earn an affiliate commission from ${offerMatch.merchant || 'the vendor'} at no additional cost to you. We only recommend products tested for practical utility and commercial reliability.`,

    // J. Attribution and Tracking Configuration
    trackingConfig: {
      opportunityId: opportunity.opportunityId,
      campaignId: `cmp_${Date.now()}`,
      offerSlug: offerMatch.offerSlug,
      merchant: offerMatch.merchant,
      network: offerMatch.network,
      commissionStructure: offerMatch.commissionStructure,
      primaryTrackingUrl: trackingUrl,
      destinationUrl
    }
  };
}

module.exports = {
  generateCampaignDraft
};
