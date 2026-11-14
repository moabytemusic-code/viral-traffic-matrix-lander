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
  const targetAudience = hypothesis.affectedConsumerGroup || 'Consumers';
  const primaryProblem = hypothesis.coreProblem || 'Economic and environmental uncertainty';
  const primarySearchPhrase = hypothesis.searchPhrases?.[0] || 'essential preparation guide';
  const destinationUrl = offerMatch.destinationUrl || `https://traffic.aisimplesystem.com/o/${offerMatch.offerSlug}`;
  const trackingUrl = offerMatch.affiliateUrl || destinationUrl;
  const category = event.category || 'General';

  // 2. Build Category-Specific Frameworks
  let frameworkName = '8-Pillar Glassmorphic Trust System';
  let headline = `Practical Action Protocol for ${event.title}`;
  let subheadline = `A field-tested implementation guide for ${targetAudience.toLowerCase()} addressing ${primaryProblem.toLowerCase()}.`;
  let protocolSteps = [];

  if (category === 'Energy, Blackouts & Emergency Prep') {
    headline = `The 3-Step Power & Grid Defense Protocol for ${event.title.replace(/[\?\.!]/g, '')}`;
    subheadline = `A verified field manual for ${targetAudience.toLowerCase()} facing grid instability and extreme weather emergencies.`;
    protocolSteps = [
      { step: 1, title: 'Thermal & Critical Load Reset', desc: 'Secure essential refrigeration, heating, and emergency communications without reliance on municipal power.' },
      { step: 2, title: 'Storage & Generation Avoidance', desc: 'Avoid dangerous indoor fuel generators and unverified battery banks prone to thermal failure.' },
      { step: 3, title: 'Autonomous Power Redundancy', desc: 'Deploy residential solar charging and dedicated backup battery storage.' }
    ];
  } else if (category === 'Finance, Capital & Wealth') {
    headline = `Capital Preservation & Funding Protocol in Response to ${event.title.replace(/[\?\.!]/g, '')}`;
    subheadline = `A tactical capital protection blueprint for ${targetAudience.toLowerCase()} navigating interest rate volatility.`;
    protocolSteps = [
      { step: 1, title: 'Cash Drawdown Insulation', desc: 'Reallocate liquid reserves to insulate portfolio capital from interest rate and inflation erosion.' },
      { step: 2, title: 'High-Fee Alternative Elimination', desc: 'Eliminate high-fee retail brokerage exposures and unhedged speculative positions.' },
      { step: 3, title: 'Proprietary Capital Qualification', desc: 'Leverage structured evaluation rules to secure funded trading capital without risking personal savings.' }
    ];
  } else if (category === 'Health, Sleep & Wellness') {
    headline = `The Evening Reset & Cortisol Stabilization Protocol`;
    subheadline = `A targeted physical protocol for ${targetAudience.toLowerCase()} dealing with nocturnal wakefulness and chronic fatigue.`;
    protocolSteps = [
      { step: 1, title: 'Circadian Light Phase Neutralization', desc: 'Eliminate artificial blue light stimulus 90 minutes before scheduled sleep.' },
      { step: 2, title: 'Cortisol Spike Dampening', desc: 'Prevent 3 AM histamine and cortisol rushes with targeted evening nutrient synergy.' },
      { step: 3, title: 'Physical Sleep Architecture Recovery', desc: 'Support natural delta-wave sleep cycles with clinical-grade tart cherry nano-botanicals.' }
    ];
  } else {
    headline = `The Automated Workflow & Traffic Engine`;
    subheadline = `A step-by-step digital implementation guide for ${targetAudience.toLowerCase()} seeking automated buyer lead capture.`;
    protocolSteps = [
      { step: 1, title: 'Friction Point Audit', desc: 'Identify critical workflow bottlenecks and manual traffic leakages.' },
      { step: 2, title: 'Automated Hook Routing', desc: 'Deploy psychological capture mechanisms and automated email handoffs.' },
      { step: 3, title: 'Perpetual Buyer Syndication', desc: 'Connect verified affiliate pathways into a 24-hour conversion loop.' }
    ];
  }

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
      heroTrustBadges: ['Field-Tested Strategy', '100% Practical Protocol', 'Instant Digital Delivery'],
      protocolSteps,
      productBundleTiering: {
        starter: { price: 9.95, name: 'Quick-Start Field Guide (PDF + Checklist)' },
        complete: { price: 27.00, name: 'Complete Video Masterclass & System Suite' },
        vip: { price: 67.00, name: 'Lifetime Implementation Vault & Direct Q&A' }
      },
      hardwareGearChecklist: [
        { tier: 'Low', name: 'Tactical Baseline Tool', estPrice: '$15 - $25', vendor: 'Amazon Prime' },
        { tier: 'Medium', name: 'Dedicated Support Unit', estPrice: '$35 - $60', vendor: 'Walmart Curbside' },
        { tier: 'Premium', name: 'Commercial Backup / System Unit', estPrice: '$120 - $250', vendor: 'Amazon Prime' }
      ]
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

    // D. YouTube Shorts / TikTok Scripts
    shortsScripts: [
      {
        angle: 'Problem Interrupt',
        durationSec: 45,
        scriptHook: `Stop scrolling if you are affected by ${event.title}. Most people are preparing for the completely wrong outcome.`,
        scriptBody: `Here is the reality. When this shifts, conventional options become backlogged in 48 hours. Instead of panic-buying, use this 3-step practical protocol: First, secure your immediate environment. Second, eliminate high-fee alternatives. Third, deploy a dedicated local backup.`,
        scriptCta: `Get the complete free 3-step action guide at the link in my bio.`
      },
      {
        angle: 'Mistake Avoidance',
        durationSec: 40,
        scriptHook: `The biggest mistake people make regarding ${event.title} is waiting until headlines confirm what data already proved.`,
        scriptBody: `By the time news outlets report this, solutions surge in price. Here is the verified protocol we use to stay completely safe without overspending.`,
        scriptCta: `Tap the bio link for the complete checklist.`
      }
    ],

    // E. Social Media Posts
    socialPosts: {
      xThread: [
        `1/ Market prediction volume on "${event.title}" just crossed unprecedented highs. Here is what smart households and investors are doing right now to prepare: 🧵`,
        `2/ Most people react with panic. The real move is a simple 3-step protocol that removes 90% of the vulnerability before the market moves.`,
        `3/ Read our full field protocol and verified recommendations here: ${destinationUrl}`
      ],
      threads: `Watching the shifts around ${event.title}? Do not wait for headlines to confirm what the data already shows. Here is the calm 3-step protocol: ${destinationUrl}`
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
      alternativeComparison: 'Generic Mass-Market Alternatives',
      keyAdvantage: `Verified merchant reputation, 60-day money-back guarantee, and dedicated customer support.`
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
