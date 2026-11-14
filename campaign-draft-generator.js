// Campaign Draft Generator
// Connects validated prediction opportunities to the Growth Engine
// Produces 10-point multi-channel campaign drafts (Unpublished by default)
// Zero em dashes in all copywriting

function generateCampaignDraft(opportunity, options = {}) {
  const { event, signal, hypothesis, offerMatch, scoreResult } = opportunity;
  const nicheName = offerMatch.productName || 'Smart Solution';
  const targetAudience = hypothesis.affectedConsumerGroup || 'Consumers';
  const primaryProblem = hypothesis.coreProblem || 'Unexpected disruption';
  const primarySearchPhrase = hypothesis.searchPhrases?.[0] || 'emergency solutions';

  return {
    campaignId: `cmp_${Date.now()}`,
    opportunityId: opportunity.opportunityId,
    title: `Campaign: ${event.title} -> ${nicheName}`,
    targetNiche: event.category || 'General',
    targetAudience,
    status: 'UNPUBLISHED',
    createdAt: new Date().toISOString(),

    // A. Affiliate Landing-Page Outline
    landerOutline: {
      framework: '8-Pillar Glassmorphic Trust System',
      headline: `The 3-Step Field Protocol to Handle ${event.title.replace(/[\?\.!]/g, '')}`,
      subheadline: `A verified, practical guide for ${targetAudience.toLowerCase()} facing ${primaryProblem.toLowerCase()}.`,
      heroTrustBadges: ['Field-Tested Protocol', '100% Non-Punitive', 'Instant Relief'],
      protocolSteps: [
        { step: 1, title: 'Immediate Physical / Tactical Reset', desc: 'Eliminate acute stress without relying on fragile external networks.' },
        { step: 2, title: 'Critical Avoidance (What NOT To Do)', desc: 'Avoid panicked knee-jerk spending that worsens the underlying problem.' },
        { step: 3, title: 'Spatial / Environmental Stabilization', desc: 'Secure your living space or finances with proven baseline tools.' }
      ],
      productBundleTiering: {
        starter: { price: 9.95, name: 'Quick-Start Action Guide (PDF + Checklist)' },
        complete: { price: 27.00, name: 'Complete Video Masterclass & Resource Suite' },
        vip: { price: 67.00, name: 'Lifetime VIP Vault & Direct Expert Q&A' }
      },
      hardwareGearChecklist: [
        { tier: 'Low', name: 'Tactical Entry Tool', estPrice: '$15 - $22', vendor: 'Amazon Prime' },
        { tier: 'Medium', name: 'Body / Environmental Support Unit', estPrice: '$35 - $50', vendor: 'Walmart Curbside' },
        { tier: 'Premium', name: 'Commercial Backup / Haven System', estPrice: '$110 - $180', vendor: 'Amazon Prime' }
      ]
    },

    // B. SEO Article & Keyword Strategy
    seoStrategy: {
      primaryKeyword: primarySearchPhrase,
      secondaryKeywords: hypothesis.searchPhrases || [],
      articleSlug: `guide-${event.externalId}`,
      metaTitle: `How to Prepare for ${event.title}: 3-Step Field Guide`,
      metaDescription: `Essential preparation protocol for ${targetAudience.toLowerCase()}. Step-by-step physical checklist and verified gear recommendations.`,
      recommendedWordCount: 1400,
      searchIntent: hypothesis.intentType || 'COMMERCIAL_INVESTIGATION'
    },

    // C. YouTube Long-Form Video Outline
    youtubeLongformOutline: {
      estimatedDurationMinutes: 12,
      workingTitle: `The Truth About ${event.title} (And How to Protect Yourself Now)`,
      hook: 'If you are paying attention to recent market signals, you know something major is shifting. Here is what they are not telling you.',
      pacingSections: [
        { timestamp: '00:00 - 01:30', topic: 'The Signal: What just happened in the market' },
        { timestamp: '01:30 - 04:45', topic: 'The Hidden Trap: Why 90% of people react the wrong way' },
        { timestamp: '04:45 - 08:30', topic: 'The 3-Step Protocol: Exactly what to do in your home right now' },
        { timestamp: '08:30 - 11:00', topic: 'Hardware Breakdown: Essential gear vs useless junk' },
        { timestamp: '11:00 - 12:00', topic: 'Call to Action: Download the field checklist in the pinned link' }
      ]
    },

    // D. YouTube Shorts / TikTok Scripts
    shortsScripts: [
      {
        angle: 'Urgent Problem Interrupt',
        durationSec: 45,
        scriptHook: `Stop scrolling if you are watching ${event.title}. Most people are preparing for the completely wrong thing.`,
        scriptBody: `Here is the reality. When this occurs, conventional solutions become backlogged in 48 hours. Instead of panic-buying, use this 3-step physical protocol: First, secure your immediate space. Second, do not touch high-fee alternatives. Third, deploy a dedicated local backup.`,
        scriptCta: `Get the full free 3-step action guide at the link in my bio.`
      },
      {
        angle: 'Mistake Avoidance',
        durationSec: 40,
        scriptHook: `The biggest mistake people make regarding ${event.title} is waiting until headlines confirm it.`,
        scriptBody: `By the time news outlets report this, prices surge 300%. Here are three simple tools you can order right now for under $30 that keep you completely safe.`,
        scriptCta: `Tap the bio link for the complete checklist.`
      }
    ],

    // E. Social Media Posts
    socialPosts: {
      xThread: [
        `1/ Market prediction volume on "${event.title}" just crossed unprecedented highs. Here is what smart households are doing right now to prepare: 🧵`,
        `2/ Most people react with panic. The real move is a simple 3-step sensory and physical protocol that removes 90% of the vulnerability.`,
        `3/ Read our full field protocol and verified gear checklist here: https://traffic.aisimplesystem.com/protocol`
      ],
      threads: `Watching the shifts around ${event.title}? Do not wait for headlines to confirm what the data already shows. Here is the calm 3-step protocol: https://traffic.aisimplesystem.com/protocol`
    },

    // F. Email Sequences (4-Day Nurture Drip)
    emailSequence: [
      {
        day: 1,
        subject: `Your Field Action Guide: ${event.title}`,
        preview: 'Here is the 3-step protocol you requested.',
        body: `Thank you for requesting our emergency guide.\n\nWhen events like this emerge, speed and calm execution matter more than speculation.\n\nStep 1 is to stabilize your immediate environment...\n\nAccess your complete digital action guide here: https://traffic.aisimplesystem.com/calm`
      },
      {
        day: 2,
        subject: `The #1 mistake people make with ${event.title}`,
        preview: 'Why knee-jerk buying fails.',
        body: `Yesterday we covered the immediate physical reset. Today, let us talk about what NOT to do.\n\nMost people waste hundreds on tools that fail when needed...\n\nHere is our tested gear checklist: https://traffic.aisimplesystem.com/protocol`
      }
    ],

    // G. Product Comparison Content
    productComparison: {
      recommendedProduct: offerMatch.productName,
      alternativeComparison: 'Generic Amazon Knockoffs',
      keyAdvantage: 'Commercial build quality, verified returns under 3%, and same-day delivery.'
    },

    // H. Conversion Calls to Action
    callsToAction: {
      primaryButtonText: `Unlock Instant ${nicheName} Toolkit ($9.95)`,
      secondaryButtonText: 'Check Amazon Same-Day Stock',
      bannerHeadline: 'Take the guesswork out of preparation today.'
    },

    // I. FTC-Compliant Affiliate Disclosure Copy
    ftcDisclosure: `Disclosure: This publication contains affiliate links. If you purchase through our links, we may earn an affiliate commission at no additional cost to you. We only recommend products tested for reliability and commercial performance.`,

    // J. Attribution and Tracking Configuration
    trackingConfig: {
      opportunityId: opportunity.opportunityId,
      campaignId: `cmp_${Date.now()}`,
      amazonTag: 'santa101-20',
      clickbankAffiliate: 'kmtwarrior',
      digistoreAffiliate: 'marketranger1',
      primaryTrackingUrl: `https://traffic.aisimplesystem.com/o/${offerMatch.offerSlug}?src=poly_campaign`
    }
  };
}

module.exports = {
  generateCampaignDraft
};
