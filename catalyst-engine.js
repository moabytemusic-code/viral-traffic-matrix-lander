// Problem-First Niche Catalyst Engine
// The foundational intelligence layer that transforms raw human pain points
// into fully deployed affiliate ecosystems (Cluster Articles, Interactive Tools,
// Amazon Hardware Picks, ClickBank Masterclasses, and 30-Day Email Sequences).

const fs = require('fs');
const path = require('path');

const AFFILIATES_PATH = path.join(__dirname, 'affiliates.json');
const OFFERS_PATH = path.join(__dirname, 'offers.json');
const ARTICLES_PATH = path.join(__dirname, 'articles.json');

// Pre-Engineered Problem Catalysts based on validated demand and high-converting offers
const NICHE_CATALYSTS = {
  "blackout_power": {
    id: "blackout_power",
    title: "Blackout Food & Medical Power Resilience",
    badge: "⚡ GRID COLLAPSE",
    icon: "⚡",
    acuteProblem: "Extreme weather heatwaves & wildfire shutoffs knock out power. Refrigerator warms past 40°F in 4 hours, spoiling $800+ of food and life-saving insulin. Gas generators are too loud, require stabilized fuel, and produce deadly carbon monoxide.",
    costOfInaction: "$800 to $1,500 in spoiled food, ruined medication, and medical emergencies during multi-day brownouts.",
    targetPersona: "Suburban homeowners, families with young children, elderly CPAP users, and apartment renters where gas engines are prohibited.",
    trojanHorseLeadMagnet: {
      type: "Interactive Calculator + 1-Page Schematic PDF",
      headline: "DIY Emergency Power Backup Under $200",
      cta: "Calculate Your Blackout Run-Time (Free PDF Blueprint)"
    },
    monetization: {
      amazonHardware: [
        { name: "12V 100Ah LiFePO4 Lithium Battery", query: "12v 100ah lifepo4 battery with bms", price: "~$140 - $180" },
        { name: "1000W Pure Sine Wave Power Inverter", query: "pure sine wave power inverter 1000w 12v lcd", price: "~$49 - $65" },
        { name: "150A Inline ANL Fuse Block", query: "150a anl fuse block copper", price: "~$9 - $14" },
        { name: "4 AWG Pure Copper Battery Cables", query: "4 awg battery inverter cables pure copper", price: "~$14 - $19" }
      ],
      clickbank: {
        vendor: "enrev",
        productName: "The Backyard Revolution & 3D Solar Blueprint",
        commission: "75%",
        tid: "catalyst_power"
      },
      digistore: null
    },
    clusterPlan: [
      { slug: "diy-home-power-blackout", role: "Pillar", title: "How to Build an Emergency Home Power Backup System Under $200" },
      { slug: "solar-panel-sizing-100ah-lifepo4", role: "Spoke A", title: "How Many Solar Panels to Charge a 100Ah LiFePO4 Battery?" },
      { slug: "emergency-refrigerator-power-backup", role: "Spoke B", title: "How to Keep Your Refrigerator Cold During a Power Outage (Without Gas)" }
    ],
    videoHook: "If your power goes out tonight, your refrigerator hits the FDA food danger zone in exactly 4 hours. Here is the $195 silent lithium fix.",
    emailDripAngles: [
      { day: 0, subject: "Your Emergency Wiring Schematic & Sizing PDF", angle: "Instant value delivery" },
      { day: 2, subject: "The $2,000 refrigerator trap (Don't make this inverter mistake)", angle: "Pure sine vs modified sine" },
      { day: 5, subject: "How 42,000 families cut power bills by 65% with 3D solar cells", angle: "Backyard Revolution masterclass" }
    ]
  },

  "offgrid_water": {
    id: "offgrid_water",
    title: "Emergency Drinking Water & Off-Grid Sanitation",
    badge: "💧 WATER CRISIS",
    icon: "💧",
    acuteProblem: "Municipal water mains burst, boil water advisories are declared, or electric well pumps fail. A household runs out of drinkable water in 48 hours, causing immediate dehydration panic and sanitation collapse.",
    costOfInaction: "Severe illness from waterborne bacterial pathogens (E. coli, Giardia) or dependence on empty grocery store shelves.",
    targetPersona: "Rural well-dependent homeowners, suburban preppers, and families preparing for municipal utility failures.",
    trojanHorseLeadMagnet: {
      type: "Printable 10-Point Water Independence Checklist (PDF)",
      headline: "The Emergency Gravity Water Filtration & Storage Protocol",
      cta: "Download The Off-Grid Clean Water Guide"
    },
    monetization: {
      amazonHardware: [
        { name: "Gravity Fed Water Filter System (Stainless Steel)", query: "gravity fed water filter system stainless steel countertop", price: "~$89 - $149" },
        { name: "12V DC RV Diaphragm Water Transfer Pump", query: "12v dc water diaphragm pump self priming", price: "~$29 - $45" },
        { name: "5-Gallon Heavy Duty Stackable Water Containers", query: "stackable water storage containers 5 gallon bpa free", price: "~$24 - $38" },
        { name: "Water Purification Tablets (Chlorine Dioxide)", query: "potable aqua chlorine dioxide water purification tablets", price: "~$11 - $16" }
      ],
      clickbank: {
        vendor: "watersb",
        productName: "The Water Smart Box & Rainwater Harvesting System",
        commission: "75%",
        tid: "catalyst_water"
      },
      digistore: {
        productId: "441221",
        name: "Off-Grid Water Independence Blueprint"
      }
    },
    clusterPlan: [
      { slug: "emergency-water-storage-blackout", role: "Pillar", title: "How to Secure 60+ Gallons of Drinkable Water When the Grid Goes Down" },
      { slug: "diy-gravity-water-filtration-system", role: "Spoke A", title: "Best DIY Gravity Water Filters: Removing 99.9% of Bacteria Under $50" },
      { slug: "how-to-run-well-pump-without-grid", role: "Spoke B", title: "How to Power a 1/2 HP Submersible Well Pump on Solar Battery Power" }
    ],
    videoHook: "You can survive 3 weeks without food, but only 3 days without water. When the grid fails, tap pressure dies in under 12 hours.",
    emailDripAngles: [
      { day: 0, subject: "Your Off-Grid Water Protocol & Purification Guide", angle: "Instant water checklist delivery" },
      { day: 3, subject: "Why boiling water isn't enough (The heavy metal trap)", angle: "Gravity filtration mechanics" },
      { day: 7, subject: "How to generate 60 gallons of pure water every single day", angle: "Water Smart Box presentation" }
    ]
  },

  "dog_anxiety": {
    id: "dog_anxiety",
    title: "High-Anxiety Dog Behavior & Storm Phobia",
    badge: "🐕 PET ANXIETY",
    icon: "🐕",
    acuteProblem: "Dogs barking incessantly at the doorbell, destructive chewing on furniture, aggressive lunging on walks, and terrifying panic during thunder or fireworks. Frustrated owners face complaints, strained relationships, and vet medication bills.",
    costOfInaction: "Eviction threats from landlords, destructive home damage ($1,000+), dog bite liability, or giving the pet up to a shelter.",
    targetPersona: "Dedicated dog owners, apartment dwellers with noise restrictions, rescue dog adopters, and families with hyperactive breeds.",
    trojanHorseLeadMagnet: {
      type: "Interactive Dog Brain Games Checklist + Calming Audio Protocol",
      headline: "The 5-Minute Brain Game That Stops Destructive Barking",
      cta: "Get The Free Canine Mental Stimulation Guide"
    },
    monetization: {
      amazonHardware: [
        { name: "Dog Puzzle Toy Mental Stimulation Level 2", query: "dog puzzle toys interactive mental stimulation", price: "~$16 - $24" },
        { name: "Calming Compression Wrap Anti-Anxiety Vest", query: "dog anxiety wrap thunder vest compression", price: "~$29 - $42" },
        { name: "Lick Mat with Suction Cups for Grooming & Storms", query: "dog lick mat with suction cups silicone", price: "~$9 - $15" },
        { name: "All-Natural Hemp Calming Chews for Dogs", query: "dog calming chews all natural hemp anxiety relief", price: "~$22 - $32" }
      ],
      clickbank: {
        vendor: "brainydogs",
        productName: "Brain Training for Dogs (Adrienne Farricelli CPDT-KA)",
        commission: "75%",
        tid: "catalyst_dog"
      },
      digistore: null
    },
    clusterPlan: [
      { slug: "stop-dog-barking-mental-enrichment", role: "Pillar", title: "How to Eliminate Problem Barking & Anxiety Using 5-Minute Brain Games" },
      { slug: "dog-storm-phobia-calming-protocol", role: "Spoke A", title: "What to Do When Your Dog Panics During Thunderstorms & Fireworks" },
      { slug: "best-mental-stimulation-toys-high-energy-dogs", role: "Spoke B", title: "Tested: The Top 5 Mental Stimulation Toys for Bored Hyper Dogs" }
    ],
    videoHook: "A tired dog isn't a relaxed dog—a mentally stimulated dog is. Here's why 10 minutes of brain training beats a 2-hour walk.",
    emailDripAngles: [
      { day: 0, subject: "The 5-Minute Brain Game Protocol (Your Free Dog Guide)", angle: "Instant mental stimulation guide" },
      { day: 3, subject: "Why physical exercise makes hyperactive dogs worse", angle: "Mental exhaustion vs physical arousal" },
      { day: 6, subject: "Adrienne's secret: The simple game that cured aggression", angle: "Brain Training for Dogs masterclass" }
    ]
  },

  "winter_freeze": {
    id: "winter_freeze",
    title: "Emergency Winter Heating & Frozen Pipe Defense",
    badge: "❄️ WINTER FREEZE",
    icon: "❄️",
    acuteProblem: "Sub-zero polar vortex storms shatter electrical grids. Home furnaces shut down because blowers need electricity. Within 18 hours, indoor temperatures drop below freezing, water pipes burst, and thousands of dollars in water damage ensue.",
    costOfInaction: "$15,000 to $30,000 in burst pipe water damage, black mold remediation, and hypothermia danger for children and elderly.",
    targetPersona: "Homeowners in cold climates or southern states with uninsulated plumbing (e.g. Texas, Midwest, Northeast).",
    trojanHorseLeadMagnet: {
      type: "Printable Sub-Zero Home Winterization Emergency Protocol (PDF)",
      headline: "How to Heat a Room Without Electricity & Prevent Frozen Pipes",
      cta: "Download The Free Winter Survival Guide"
    },
    monetization: {
      amazonHardware: [
        { name: "Indoor-Safe Portable Propane Radiant Heater (Mr. Heater Buddy)", query: "mr heater buddy indoor safe portable propane heater", price: "~$79 - $119" },
        { name: "Digital Carbon Monoxide Detector with Battery Backup", query: "digital carbon monoxide detector with battery readout", price: "~$19 - $28" },
        { name: "Thermal Window Insulation Shrink Film Kit", query: "thermal window insulation kit plastic shrink wrap", price: "~$14 - $22" },
        { name: "12V Heated Electric Blanket for Lithium Power Banks", query: "12v heated electric blanket low wattage for car rv camping", price: "~$24 - $36" }
      ],
      clickbank: {
        vendor: "enrev",
        productName: "The Backyard Revolution & Off-Grid Energy System",
        commission: "75%",
        tid: "catalyst_winter"
      },
      digistore: null
    },
    clusterPlan: [
      { slug: "how-to-stay-warm-power-outage-winter", role: "Pillar", title: "How to Heat Your Home During a Winter Power Outage (Indoor Safe)" },
      { slug: "prevent-frozen-pipes-blackout", role: "Spoke A", title: "How to Protect Water Pipes from Freezing and Bursting When Power Dies" },
      { slug: "best-indoor-safe-heaters-power-outage", role: "Spoke B", title: "Mr. Heater Buddy vs Electric 12V: The Safest Blackout Heaters Ranked" }
    ],
    videoHook: "When the grid collapses in January, your home temperature hits freezing in under 18 hours. Here is the indoor-safe heating secret.",
    emailDripAngles: [
      { day: 0, subject: "Your Winter Blackout Survival Blueprint (Instant PDF)", angle: "Winter freeze protocol" },
      { day: 2, subject: "The 3-foot micro-room secret to staying 70°F in a freezing house", angle: "Emergency shelter within a shelter" },
      { day: 5, subject: "Never let your furnace die: The 12V blower motor hack", angle: "Backyard Revolution energy system" }
    ]
  },

  "chronic_insomnia": {
    id: "chronic_insomnia",
    title: "Chronic 3:00 AM Wakeups & Deep Sleep Restoration",
    badge: "🌙 SLEEP RECOVERY",
    icon: "🌙",
    acuteProblem: "Falling asleep exhausted, only to bolt awake at 3:15 AM with a pounding heart and spiraling racing thoughts. Sleepless nights lead to daytime brain fog, caffeine crashes, high cortisol, and impaired career performance.",
    costOfInaction: "Chronic health decline, elevated blood pressure, severe daytime exhaustion, and dependency on addictive pharmaceuticals.",
    targetPersona: "High-stress working professionals, entrepreneurs, peri-menopausal women, and shift workers suffering from fragmented sleep.",
    trojanHorseLeadMagnet: {
      type: "Interactive Circadian Sleep Audit + 10-3-2-1 Bedtime Routine PDF",
      headline: "The 3:00 AM Cortisol Reset: How to Sleep 7+ Hours Uninterrupted",
      cta: "Take The Free Sleep Architecture Audit"
    },
    monetization: {
      amazonHardware: [
        { name: "100% Blackout Contoured 3D Eye Mask (Zero Eye Pressure)", query: "3d contoured sleep mask zero eye pressure blackout", price: "~$14 - $22" },
        { name: "Red Light Night Reading Lamp (No Blue Spectrum)", query: "amber red light reading book light no blue light", price: "~$12 - $18" },
        { name: "Magnesium Glycinate Complex 400mg Pure", query: "magnesium glycinate 400mg high absorption sleep", price: "~$19 - $27" },
        { name: "Dohm White Noise Machine with Real Fan Sound", query: "dohm classic natural sound machine white noise", price: "~$39 - $49" }
      ],
      clickbank: {
        vendor: "yusleep",
        productName: "Yu Sleep Natural Deep REM Sleep Restorer",
        commission: "70%",
        tid: "catalyst_sleep"
      },
      digistore: null
    },
    clusterPlan: [
      { slug: "why-do-i-wake-up-at-3am", role: "Pillar", title: "Why You Wake Up at 3 AM Every Night (And How to Fix Cortisol Spikes)" },
      { slug: "natural-alternatives-to-melatonin", role: "Spoke A", title: "Why Melatonin Causes Groggy Mornings: The 4 Non-Habit-Forming Alternatives" },
      { slug: "blackout-sleep-environment-protocol", role: "Spoke B", title: "The Dark Room Protocol: Optimizing Temperature and Lux for Deep REM Sleep" }
    ],
    videoHook: "If you wake up every night between 2:30 and 3:30 AM with your mind racing, your liver is dumping cortisol. Here is the 60-second fix.",
    emailDripAngles: [
      { day: 0, subject: "Your 3:00 AM Cortisol Reset Protocol (Instant Download)", angle: "Sleep architecture guide" },
      { day: 3, subject: "The melatonin lie: Why high doses ruin deep sleep", angle: "Receptor desensitization breakdown" },
      { day: 7, subject: "How natural botanical adaptogens restore 8-hour deep sleep", angle: "Yu Sleep clinical review" }
    ]
  },

  "financial_hedging": {
    id: "financial_hedging",
    title: "Inflation Defense & Funded Trading Independence",
    badge: "📈 WEALTH HEDGING",
    icon: "📈",
    acuteProblem: "Sticky grocery/gas inflation erodes savings. A single W2 paycheck feels increasingly vulnerable to corporate layoffs. Working people want a second stream of income from financial markets but cannot afford to risk their life savings.",
    costOfInaction: "Slow wealth erosion, living paycheck to paycheck, and the constant fear of sudden downsizing without a financial safety net.",
    targetPersona: "Professionals seeking side income, aspiring financial traders, and individuals who want capital access without risking personal cash.",
    trojanHorseLeadMagnet: {
      type: "Free 15-Page Prop Firm Evaluation Cheat Sheet & Risk Calculator (PDF)",
      headline: "How to Trade Up to $200,000 in Capital Without Risking Personal Savings",
      cta: "Get The Free Funded Trading Roadmap"
    },
    monetization: {
      amazonHardware: [
        { name: "Dual Portable Laptop Screen Extender (Triple Monitor)", query: "portable dual monitor laptop screen extender 14 inch", price: "~$149 - $219" },
        { name: "Technical Analysis of the Financial Markets by John Murphy", query: "technical analysis of the financial markets john murphy book", price: "~$24 - $38" },
        { name: "Mechanical Ergonomic Keyboard with Macro Keys", query: "ergonomic mechanical keyboard macro keys for trading", price: "~$69 - $99" }
      ],
      clickbank: null,
      digistore: null,
      idevaffiliate: {
        sponsorCode: "144",
        productName: "5DF Partners / Funded Trader Matrix",
        affiliateUrl: "https://5dfpartners.idevaffiliate.com/144.html"
      }
    },
    clusterPlan: [
      { slug: "how-prop-trading-firms-work", role: "Pillar", title: "How Prop Trading Firms Work: Trade $100K in Firm Capital (Keep 80% Profit)" },
      { slug: "risk-management-rules-pass-evaluation", role: "Spoke A", title: "The 1% Risk Rule: How Disciplined Traders Pass Evaluations Without Blowing Accounts" },
      { slug: "best-trading-setup-minimalist-desk", role: "Spoke B", title: "The Minimalist 2-Screen Trading Desk Setup Under $300" }
    ],
    videoHook: "Never risk your family's savings in the market. Here is how modern traders get evaluated for $100,000 in firm capital.",
    emailDripAngles: [
      { day: 0, subject: "Your Funded Trader Evaluation Cheat Sheet (Instant PDF)", angle: "Risk model cheat sheet" },
      { day: 3, subject: "The 1% drawdown math: Why 90% of traders fail evaluations", angle: "Math of capital preservation" },
      { day: 7, subject: "Step-by-step: How to access up to $200,000 in trading capital", angle: "5DF Partner matrix invitation" }
    ]
  }
};

// Helper: Retrieve all registered Problem Catalysts
function getCatalysts() {
  return NICHE_CATALYSTS;
}

// Helper: Retrieve a single catalyst by id
function getCatalyst(id) {
  return NICHE_CATALYSTS[id] || null;
}

// Helper: Custom AI problem analyzer (Takes any free-form problem statement and generates the catalyst structure)
function analyzeCustomProblem(rawProblemText) {
  const clean = rawProblemText.trim();
  const slug = clean.toLowerCase().replace(/[^a-z0-9]+/g, '-').slice(0, 30);
  
  return {
    id: `custom_${slug}`,
    title: `Solution for: ${clean.slice(0, 40)}...`,
    badge: "🎯 CUSTOM CATALYST",
    icon: "🎯",
    acuteProblem: clean,
    costOfInaction: "Continued daily frustration, financial loss, and wasted time trying ineffective band-aid solutions.",
    targetPersona: "People actively searching for a reliable, step-by-step resolution to this specific pain point.",
    trojanHorseLeadMagnet: {
      type: "Free Step-by-Step Diagnostic Protocol & Action Sheet (PDF)",
      headline: `The Complete Protocol: How to Solve ${clean.slice(0, 35)}`,
      cta: "Download The Free Protocol PDF"
    },
    monetization: {
      amazonHardware: [
        { name: "Verified Essential Tool Kit", query: `${clean.slice(0, 20)} tool kit`, price: "~$25 - $45" },
        { name: "Diagnostic / Measurement Tester", query: `${clean.slice(0, 20)} tester monitor`, price: "~$19 - $35" }
      ],
      clickbank: {
        vendor: "enrev",
        productName: "Recommended Digital Masterclass",
        commission: "75%",
        tid: `custom_${slug}`
      }
    },
    clusterPlan: [
      { slug: `guide-${slug}`, role: "Pillar", title: `How to Solve ${clean.slice(0, 50)} (Complete Blueprint)` },
      { slug: `mistakes-${slug}`, role: "Spoke A", title: `The 3 Biggest Mistakes People Make When Trying to Fix This` },
      { slug: `tools-${slug}`, role: "Spoke B", title: `The Best Tools & Equipment for Lasting Results` }
    ],
    videoHook: `Tired of dealing with this issue? Here is the field-tested protocol that fixes it once and for all.`,
    emailDripAngles: [
      { day: 0, subject: `Your Free Action Protocol & Checklist`, angle: "Instant download" },
      { day: 3, subject: `The #1 mistake that makes this problem worse`, angle: "Agitation & education" },
      { day: 7, subject: `The complete step-by-step masterclass walkthrough`, angle: "Commercial offer" }
    ]
  };
}

module.exports = {
  NICHE_CATALYSTS,
  getCatalysts,
  getCatalyst,
  analyzeCustomProblem
};
