/**
 * 30-DAY RUNWAY QUEUE FOR THE 7 EMPTY CHANNELS
 * Populates 10 multi-angle drops spaced every 3 days across all 7 channels (70+ total scheduled drops)
 * Applied with vidIQ high-CTR titles, First-3-Lines conversion links, tags, and pinned comments.
 */

const fs = require('fs');
const path = require('path');
const postiz = require('./postiz-client');

const VIDEOS_DIR = path.join(__dirname, 'public', 'videos');
const THUMBS_DIR = path.join(__dirname, 'public', 'thumbnails');

async function main() {
  console.log('🚀 [30-Day Campaign Deployer] Queueing 70+ drops across the 7 empty channels...\n');

  const baseTime = Date.now();
  const getSlot = (dayOffset, utcHour, utcMinute = 30) => {
    const d = new Date(baseTime + dayOffset * 24 * 3600 * 1000);
    d.setUTCHours(utcHour, utcMinute, 0, 0);
    return d.toISOString();
  };

  const CHANNELS = [
    // 1. Practical Dog Enrichment (YouTube)
    {
      name: 'Practical Dog Enrichment',
      accounts: ['cmw5occae000bmy7aqrhmr880'],
      utcHour: 17,
      drops: [
        {
          day: 1,
          video: 'dog-enrichment-commercial.mp4',
          thumb: 'dogs-thumbnail.jpg',
          title: 'Why Your Dog Destroys Your Shoes (It Isn’t Bad Behavior) 🐶⚠️ #Shorts',
          text: 'Destructive chewing is almost always sensory boredom, not spite. Here is the 10-minute canine enrichment protocol that calms high-energy dogs instantly.\n\n🎁 FREE RESOURCE:\nGet the Free Canine Boredom Buster Checklist:\n👉 https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral\n\n#dogenrichment #dogtraining #boredomdogs #caninebehavior #dogcare',
          comment: '🐶 Download the Free Canine Boredom Buster Checklist (Master Guide) here: https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral_pinned 👇 What is your dog\'s favorite game?',
          tags: ['dog enrichment', 'dog training', 'hyper dog calming', 'canine enrichment games', 'mental stimulation dogs']
        },
        {
          day: 4,
          video: 'dogs-commercial.mp4',
          thumb: 'dogs-thumbnail.jpg',
          title: 'Why 2-Hour Walks Actually Make Dog Anxiety Worse 🐕🧠 #Shorts',
          text: 'Physical exhaustion spikes cortisol if their brain is ignored. 15 minutes of scentwork burns more mental energy than 2 hours of running.\n\n🎁 FREE RESOURCE:\nFree Brain Games & Scentwork Guide:\n👉 https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral\n\n#dogtraining #anxiousdog #scentwork #dogbehavior #caninementalstimulation',
          comment: '🐕 Grab the Free Brain Games & Scentwork Guide here: https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral_pinned 👇 Does your dog pant after long walks?',
          tags: ['anxious dog fix', 'scentwork games', 'mental enrichment for dogs', 'dog anxiety protocol', 'puppy training']
        },
        {
          day: 7,
          video: 'dog-enrichment-commercial.mp4',
          thumb: 'dogs-thumbnail.jpg',
          title: 'The 10-Minute Lick-Mat Protocol For Calm Dogs 🐾🥩 #Shorts',
          text: 'Repetitive licking releases endorphins that down-regulate stress hormones in canines. Here is the frozen enrichment recipe to try tonight.\n\n🎁 FREE RESOURCE:\nGet 12 DIY Canine Enrichment Recipes:\n👉 https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral\n\n#lickmat #doghacks #calmdog #caninenutrition #dogtreats',
          comment: '🐾 Download the 12 DIY Canine Enrichment Recipes free: https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral_pinned 👇 What is your dog\'s favorite treat?',
          tags: ['lick mat recipes', 'calming hyper dogs', 'dog mental games', 'dog treats diy', 'enrichment feeder']
        },
        {
          day: 10,
          video: 'dogs-commercial.mp4',
          thumb: 'dogs-thumbnail.jpg',
          title: '3 Warning Signs Your Dog Is Dangerously Under-Stimulated 🐶🔍 #Shorts',
          text: 'Pacing, excessive licking of paws, and phantom barking are cry-for-help symptoms of sensory starvation. Here is how to fix it in 24 hours.\n\n🎁 FREE RESOURCE:\nGet the Sensory Enrichment Protocol:\n👉 https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral\n\n#doghealth #dogbehaviorist #enrichmenttips #dogmom #dogdad',
          comment: '🐶 Get the Sensory Enrichment Protocol free: https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral_pinned 👇 Have you noticed any of these signs?',
          tags: ['under stimulated dog', 'dog boredom signs', 'canine mental health', 'dog behavior training', 'enrichment protocol']
        },
        {
          day: 13,
          video: 'dog-enrichment-commercial.mp4',
          thumb: 'dogs-thumbnail.jpg',
          title: 'Ditch The Food Bowl: The Scatter Feeding Method 🥣🚫 #Shorts',
          text: 'Dogs are designed to forage. Gulping food from a bowl takes 45 seconds and leaves them mentally unfulfilled. Scatter feeding changes everything.\n\n🎁 FREE RESOURCE:\nDownload the Full Foraging & Enrichment Blueprint:\n👉 https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral\n\n#scatterfeeding #foragingdogs #dogenrichment #dogfeeding #doglife',
          comment: '🥣 Grab your Free Foraging & Enrichment Blueprint: https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral_pinned 👇 Have you tried scatter feeding yet?',
          tags: ['scatter feeding dogs', 'foraging games dogs', 'slow feeding dogs', 'ditch the bowl', 'canine foraging']
        },
        {
          day: 16,
          video: 'dogs-commercial.mp4',
          thumb: 'dogs-thumbnail.jpg',
          title: 'Why Sniffing Every Tree On Walks Is Critical For Dogs 🌳👃 #Shorts',
          text: 'Pulling your dog away from sniffs is like someone ripping a book out of your hands mid-sentence. Sniffing drops heart rate and relieves stress.\n\n🎁 FREE RESOURCE:\nGet the Decompression Walk Checklist:\n👉 https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral\n\n#decompressionwalks #sniffaris #dogwalking #dogwellbeing #canineenrichment',
          comment: '🌳 Download the Free Decompression Walk Checklist: https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral_pinned 👇 How long does your dog spend sniffing?',
          tags: ['decompression walk dog', 'sniffari for dogs', 'calming dog walks', 'canine wellness', 'dog walking tips']
        },
        {
          day: 19,
          video: 'dog-enrichment-commercial.mp4',
          thumb: 'dogs-thumbnail.jpg',
          title: 'The Cardboard Box Shredding Protocol (100% Safe) 📦🐶 #Shorts',
          text: 'Destruction is a natural predatory motor pattern. Providing structured, safe shredding outlets stops them from targeting your furniture.\n\n🎁 FREE RESOURCE:\nGet 10 Zero-Dollar DIY Enrichment Hacks:\n👉 https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral\n\n#diydogtoys #enrichmenthacks #canineneeds #dogtrainingadvice #puppycare',
          comment: '📦 Grab the 10 Zero-Dollar DIY Enrichment Hacks guide: https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral_pinned 👇 Does your dog love tearing cardboard?',
          tags: ['diy dog enrichment', 'cardboard shredding dog', 'canine natural behaviors', 'destructive dog fix', 'dog toys free']
        },
        {
          day: 22,
          video: 'dogs-commercial.mp4',
          thumb: 'dogs-thumbnail.jpg',
          title: 'How To Stop Jumping When Guests Walk Through The Door 🚪🐕 #Shorts',
          text: 'Yelling "Down!" rewards jumping with attention. Throwing high-value scatter treats on the rug grounds their paws before excitement boils over.\n\n🎁 FREE RESOURCE:\nDownload the Door Greeting Training Matrix:\n👉 https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral\n\n#dogjumping #doorgreeting #dogtraining101 #puppytrainingtips #caninetraining',
          comment: '🚪 Get the Door Greeting Training Matrix free: https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral_pinned 👇 How do you handle door greetings?',
          tags: ['stop dog jumping', 'door manners dog', 'calm greeting training', 'positive reinforcement', 'dog training basics']
        },
        {
          day: 25,
          video: 'dog-enrichment-commercial.mp4',
          thumb: 'dogs-thumbnail.jpg',
          title: 'The Frozen Kong Recipe That Lasts 45 Minutes 🥩❄️ #Shorts',
          text: 'Most owners pack peanut butter at the bottom and leave the rest hollow. Here is the multi-layered freezing formula that keeps dogs busy for an hour.\n\n🎁 FREE RESOURCE:\nGet the Master Kong Filler Cheat Sheet:\n👉 https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral\n\n#kongrecipes #frozenkong #enrichmenttoy #dogenrichment #dogchew',
          comment: '🥩 Grab your Free Master Kong Filler Cheat Sheet: https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral_pinned 👇 What do you fill your Kongs with?',
          tags: ['frozen kong recipe', 'long lasting dog chew', 'mental stimulation dogs', 'puppy teething hack', 'kong toys']
        },
        {
          day: 28,
          video: 'dogs-commercial.mp4',
          thumb: 'dogs-thumbnail.jpg',
          title: 'Why A Tired Dog Isn’t Always A Good Dog 🐶😴 #Shorts',
          text: 'Over-exercising an anxious dog simply creates an athletic dog with high endurance and the same anxiety. Mental peace requires brain workouts.\n\n🎁 FREE RESOURCE:\nDownload the Canine Nervous System Reset Guide:\n👉 https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral\n\n#tiredisnotgood #dogenrichment #caninementalhealth #balanceddog #dogparent',
          comment: '🐶 Download the Canine Nervous System Reset Guide free: https://traffic.aisimplesystem.com/bio/dogs?src=yt_viral_pinned 👇 Agree or disagree?',
          tags: ['overtired dog', 'canine mental workouts', 'calming high drive dogs', 'enrichment over exercise', 'dog training philosophy']
        }
      ]
    },

    // 2. The Santa Circle (Facebook)
    {
      name: 'The Santa Circle',
      accounts: ['cmw71gk7t005fmy7aoh8gemxt'],
      utcHour: 18,
      drops: [
        {
          day: 2,
          video: 'santa-circle-commercial.mp4',
          thumb: 'santa-circle-vidiq-thumbnail.png',
          title: 'The Magical Christmas Tradition Your Kids Will Cherish Forever 🎅🎄',
          text: 'Watch their eyes light up when Santa mentions their best friend, pet, and biggest accomplishment this year by name!\n\n🎁 FREE PREVIEW:\nSee how the personalized Santa Circle experience works:\n👉 https://traffic.aisimplesystem.com/bio/santa?src=fb_viral\n\n#christmasmagic #santaclaus #personalizedsanta #christmastraditions #familyholiday',
          comment: '🎅 Watch the magic unfold! Preview your personalized Santa message here: https://traffic.aisimplesystem.com/bio/santa?src=fb_viral_pinned',
          tags: ['personalized santa letter', 'santa video message', 'christmas traditions kids', 'holiday family magic', 'santa circle']
        },
        {
          day: 5,
          video: 'santa-circle-angle-2.mp4',
          thumb: 'santa-circle-vidiq-thumbnail.png',
          title: 'How To Make Christmas Feel Truly Magical This Year ✨🎁',
          text: 'Between busy schedules and screens, holiday wonder gets lost. Here is the 1 tradition families are adopting to bring genuine childhood awe back.\n\n🎁 FREE PREVIEW:\n👉 https://traffic.aisimplesystem.com/bio/santa?src=fb_viral\n\n#holidaywonder #christmasmemories #santavideo #childhoodmagic #christmas2026',
          comment: '✨ Create unforgettable holiday wonder: https://traffic.aisimplesystem.com/bio/santa?src=fb_viral_pinned',
          tags: ['christmas memories kids', 'santa surprise', 'magical holiday gift', 'santa circle video']
        },
        {
          day: 8,
          video: 'santa-circle-commercial.mp4',
          thumb: 'santa-circle-vidiq-thumbnail.png',
          title: 'Santa Knows Their Name, Their Pet, and Their Best Friend 🎅⭐',
          text: 'Nothing beats the look of pure shock on a child\'s face when Santa Claus speaks directly to them from the North Pole.\n\n🎁 PREVIEW NOW:\n👉 https://traffic.aisimplesystem.com/bio/santa?src=fb_viral\n\n#northpole #santacall #christmasmagic #holidaytraditions',
          comment: '⭐ Personalize your North Pole experience here: https://traffic.aisimplesystem.com/bio/santa?src=fb_viral_pinned',
          tags: ['north pole video', 'santa message for kids', 'custom santa video']
        },
        {
          day: 11,
          video: 'santa-circle-angle-2.mp4',
          thumb: 'santa-circle-vidiq-thumbnail.png',
          title: 'Skip The Long Mall Lines: Bring Santa Directly Home 🎄🏠',
          text: 'No waiting 2 hours in a noisy mall line. Get a broadcast-quality personalized greeting straight to your living room.\n\n🎁 ACCESS HERE:\n👉 https://traffic.aisimplesystem.com/bio/santa?src=fb_viral\n\n#nomalllines #santahome #holidayconvenience #christmascheer',
          comment: '🎄 Bring Santa to your living room: https://traffic.aisimplesystem.com/bio/santa?src=fb_viral_pinned',
          tags: ['santa greeting', 'virtual santa visit', 'holiday magic kids']
        },
        {
          day: 14,
          video: 'santa-circle-commercial.mp4',
          thumb: 'santa-circle-vidiq-thumbnail.png',
          title: 'The Secret To A Stress-Free Holiday Season For Parents 🎁💡',
          text: 'Give your children a moment they will talk about for years. Capture the pure innocence of Christmas morning with a keepsake from Santa.\n\n🎁 LEARN MORE:\n👉 https://traffic.aisimplesystem.com/bio/santa?src=fb_viral\n\n#holidayparenting #keepsakememories #santagreeting #christmasfamily',
          comment: '💡 Preview the keepsake video message: https://traffic.aisimplesystem.com/bio/santa?src=fb_viral_pinned',
          tags: ['santa keepsake', 'christmas video letter', 'holiday memories']
        },
        {
          day: 17,
          video: 'santa-circle-angle-2.mp4',
          thumb: 'santa-circle-vidiq-thumbnail.png',
          title: 'A North Pole Message They Will Watch Again and Again 📜🎅',
          text: 'Crafted with genuine warmth, holiday spirit, and personal details that make your little ones feel truly special.\n\n🎁 CREATE YOURS:\n👉 https://traffic.aisimplesystem.com/bio/santa?src=fb_viral\n\n#santawatch #northpoleletter #childhoodmemories',
          comment: '📜 Start your North Pole message here: https://traffic.aisimplesystem.com/bio/santa?src=fb_viral_pinned',
          tags: ['north pole message', 'personalized santa video', 'holiday traditions']
        },
        {
          day: 20,
          video: 'santa-circle-commercial.mp4',
          thumb: 'santa-circle-vidiq-thumbnail.png',
          title: 'Why Grandparents Are Loving This Christmas Surprise 👵🎁',
          text: 'Send the ultimate holiday delight to grandchildren across the country with a heartfelt personalized greeting from Santa Claus.\n\n🎁 SEND A SURPRISE:\n👉 https://traffic.aisimplesystem.com/bio/santa?src=fb_viral\n\n#grandparentgift #familyconnection #christmascheer',
          comment: '👵 Delight your grandkids from afar: https://traffic.aisimplesystem.com/bio/santa?src=fb_viral_pinned',
          tags: ['grandparent holiday gift', 'santa surprise', 'personalized christmas gift']
        },
        {
          day: 23,
          video: 'santa-circle-angle-2.mp4',
          thumb: 'santa-circle-vidiq-thumbnail.png',
          title: 'The Holiday Tradition Families Keep Returning To 🌟🎄',
          text: 'Every year brings new milestones, new lessons learned, and new accomplishments to celebrate with Santa.\n\n🎁 PREVIEW NOW:\n👉 https://traffic.aisimplesystem.com/bio/santa?src=fb_viral\n\n#familytraditions #christmastime #santacircle',
          comment: '🌟 Check out this year\'s new themes: https://traffic.aisimplesystem.com/bio/santa?src=fb_viral_pinned',
          tags: ['christmas tradition', 'holiday celebration', 'santa circle']
        },
        {
          day: 26,
          video: 'santa-circle-commercial.mp4',
          thumb: 'santa-circle-vidiq-thumbnail.png',
          title: 'Christmas Eve Excitement Reaches A Whole New Level 🎅⭐',
          text: 'Nothing builds anticipation for Christmas morning quite like hearing Santa confirm they made the Good List.\n\n🎁 GET READY:\n👉 https://traffic.aisimplesystem.com/bio/santa?src=fb_viral\n\n#goodlist #christmaseve #santascoming',
          comment: '⭐ Make the Good List official: https://traffic.aisimplesystem.com/bio/santa?src=fb_viral_pinned',
          tags: ['nice list certificate', 'santa video good list', 'holiday excitement']
        },
        {
          day: 29,
          video: 'santa-circle-angle-2.mp4',
          thumb: 'santa-circle-vidiq-thumbnail.png',
          title: 'Give The Gift Of Unforgettable Wonder This Season 🎁✨',
          text: 'Toys get outgrown, but the magical memory of Santa knowing who they are lasts a lifetime.\n\n🎁 CREATE YOURS:\n👉 https://traffic.aisimplesystem.com/bio/santa?src=fb_viral\n\n#magicofchristmas #santaclaus #unforgettablegift',
          comment: '✨ Create your magic here: https://traffic.aisimplesystem.com/bio/santa?src=fb_viral_pinned',
          tags: ['christmas keepsake', 'magical santa gift', 'holiday memories kids']
        }
      ]
    },

    // 3. The Freebie Channel (Facebook + Instagram)
    {
      name: 'The Freebie Channel',
      accounts: ['cmw5m2ev30007o87ex24h2fbf', 'cmw5o3smq0007my7axycmo1tf'],
      utcHour: 19,
      drops: [
        {
          day: 3,
          video: 'viral-traffic-matrix-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'Top 3 High-Value Business Tools You Can Claim 100% Free This Week 🎁💻',
          text: 'Stop overpaying for recurring subscriptions. Here is how to legally claim 100% free passes to top AI productivity and traffic software.\n\n🎁 FREE VAULT ACCESS:\n👉 https://traffic.aisimplesystem.com/bio/freebies?src=social_viral\n\n#freebies #freetools #aitools #freeresources #techhacks',
          comment: '🎁 Unlock the 100% Free Software & Tool Vault here: https://traffic.aisimplesystem.com/bio/freebies?src=social_viral_pinned',
          tags: ['free software tools', 'free marketing tools', 'freebie alerts', 'ai tools free', 'saas deals']
        },
        {
          day: 6,
          video: 'perpetual-clicks-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'Stop Paying For Monthly Subscriptions: The Free Software Protocol ⚡🔓',
          text: 'Huge companies offer hidden free developer tiers and giveaway passes. We compile the best ones every week.\n\n🎁 GRAB FREE PASSES:\n👉 https://traffic.aisimplesystem.com/bio/freebies?src=social_viral\n\n#freeaccess #softwarehacks #productivitytools #freedeals',
          comment: '⚡ Get this week\'s curated freebie list: https://traffic.aisimplesystem.com/bio/freebies?src=social_viral_pinned',
          tags: ['free productivity apps', 'free subscriptions', 'tech freebies']
        },
        {
          day: 9,
          video: 'ai-vault-commercial.mp4',
          thumb: 'ai-vault-thumbnail.jpg',
          title: 'How To Get Premium Cloud & AI Tools Without Spending A Dime ☁️💡',
          text: 'Discover the verified giveaways and community access passes that give you instant enterprise tool power for zero dollars.\n\n🎁 UNLOCK NOW:\n👉 https://traffic.aisimplesystem.com/bio/freebies?src=social_viral\n\n#cloudtools #aitools2026 #freebievault #digitalnomad',
          comment: '💡 Instant access to the freebie directory: https://traffic.aisimplesystem.com/bio/freebies?src=social_viral_pinned',
          tags: ['cloud credits free', 'ai tools giveaway', 'freebie channel']
        },
        {
          day: 12,
          video: 'viral-traffic-matrix-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'The Hidden Freebie Vault 99% Of Creators Never Check 📂✨',
          text: 'From high-res graphic templates to automation engines, check out what just dropped in our free vault.\n\n🎁 DOWNLOAD HERE:\n👉 https://traffic.aisimplesystem.com/bio/freebies?src=social_viral\n\n#creatorfreebies #designtemplates #freeassets #freetraffic',
          comment: '📂 Download your free creator pack: https://traffic.aisimplesystem.com/bio/freebies?src=social_viral_pinned',
          tags: ['free creator assets', 'free graphics', 'creator tools free']
        },
        {
          day: 15,
          video: 'perpetual-clicks-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: '3 Secret Websites For Legitimate Free Digital Assets 🌐🎯',
          text: 'Bookmark these resources to save hundreds on stock footage, audio tracks, and automation tools every month.\n\n🎁 FULL DIRECTORY:\n👉 https://traffic.aisimplesystem.com/bio/freebies?src=social_viral\n\n#secretwebsites #freetools #digitalassets #budgethacks',
          comment: '🎯 Full list of secret websites: https://traffic.aisimplesystem.com/bio/freebies?src=social_viral_pinned',
          tags: ['free stock footage', 'free audio library', 'freebie directory']
        },
        {
          day: 18,
          video: 'ai-vault-commercial.mp4',
          thumb: 'ai-vault-thumbnail.jpg',
          title: 'How Solo Entrepreneurs Build Tech Stacks For $0 / Month 💻🛠️',
          text: 'You don\'t need a $5,000 monthly software budget to run an online business. Here is the completely free tech stack roadmap.\n\n🎁 GET THE ROADMAP:\n👉 https://traffic.aisimplesystem.com/bio/freebies?src=social_viral\n\n#zerodollarstack #bootstrapping #solopreneur #freeapps',
          comment: '🛠️ Get the $0 tech stack guide free: https://traffic.aisimplesystem.com/bio/freebies?src=social_viral_pinned',
          tags: ['free tech stack', 'bootstrapping tools', 'free business apps']
        },
        {
          day: 21,
          video: 'viral-traffic-matrix-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'This Week’s Top Verified Software Giveaways Are Live 🎁🚀',
          text: 'Verified by our team so you don\'t waste time with broken promo codes or spam offers. Grab them before they expire.\n\n🎁 CLAIM NOW:\n👉 https://traffic.aisimplesystem.com/bio/freebies?src=social_viral\n\n#weeklyfreebies #softwaredeals #freebies2026 #techgiveaway',
          comment: '🚀 Claim this week\'s verified giveaways: https://traffic.aisimplesystem.com/bio/freebies?src=social_viral_pinned',
          tags: ['verified giveaways', 'tech discounts', 'free promo codes']
        },
        {
          day: 24,
          video: 'perpetual-clicks-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'Why You Should Never Pay For These 5 Common Tools 🚫💸',
          text: 'Open-source and free community alternatives have completely surpassed their paid corporate counterparts. Here is the list.\n\n🎁 ACCESS THE LIST:\n👉 https://traffic.aisimplesystem.com/bio/freebies?src=social_viral\n\n#opensource #freetools #savemoney #budgettech',
          comment: '💸 See the 5 free alternatives: https://traffic.aisimplesystem.com/bio/freebies?src=social_viral_pinned',
          tags: ['open source alternatives', 'free software list', 'tech savings']
        },
        {
          day: 27,
          video: 'ai-vault-commercial.mp4',
          thumb: 'ai-vault-thumbnail.jpg',
          title: 'How To Get Free Beta Access To New AI Breakthroughs 🤖⚡',
          text: 'Leading AI research labs offer free beta seats before public launches. Here is where to sign up before waitlists close.\n\n🎁 GET ACCESS:\n👉 https://traffic.aisimplesystem.com/bio/freebies?src=social_viral\n\n#aibeta #earlyaccess #aitools #techbeta',
          comment: '⚡ Get early AI beta access passes: https://traffic.aisimplesystem.com/bio/freebies?src=social_viral_pinned',
          tags: ['ai beta tester', 'free ai tools', 'ai early access']
        },
        {
          day: 30,
          video: 'viral-traffic-matrix-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'The Ultimate Freebie Master Roundup For The Month 🏆🎁',
          text: 'Every single top tool, template, and free giveaway pass we curated this month in one easy master dashboard.\n\n🎁 ACCESS THE MASTER DASHBOARD:\n👉 https://traffic.aisimplesystem.com/bio/freebies?src=social_viral\n\n#monthlyroundup #freebies #bestdeals #freetools',
          comment: '🏆 Open the master freebie dashboard: https://traffic.aisimplesystem.com/bio/freebies?src=social_viral_pinned',
          tags: ['freebie master list', 'best free apps', 'free software roundup']
        }
      ]
    },

    // 4. ChainRadar (YouTube)
    {
      name: 'ChainRadar',
      accounts: ['cmw5g6u8g0009qs758c7o321d'],
      utcHour: 16,
      drops: [
        {
          day: 1,
          video: 'prop-trading-commercial.mp4',
          thumb: 'trade-thumbnail.jpg',
          title: 'How Prop Firms Fund $100k Accounts (Without Your Savings) 📈📊 #Shorts',
          text: 'Trading small retail accounts forces emotional over-leveraging. Here is how institutional prop capital evaluates and funds disciplined traders.\n\n🎁 FREE PROTOCOL:\nGet the Prop Firm Evaluation Blueprint:\n👉 https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto\n\n#proptrading #fundedaccount #cryptotrading #tradingpsychology #forextrading',
          comment: '📈 Download the Free Prop Firm Evaluation Blueprint: https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto_pinned 👇 What pair do you trade most?',
          tags: ['prop trading firm', 'funded trader protocol', 'crypto risk management', 'trading psychology', 'forex prop firm']
        },
        {
          day: 4,
          video: 'matrix-commercial.mp4',
          thumb: 'trade-thumbnail.jpg',
          title: 'The 1 Liquidity Trap That Liquidates 90% of Retail Crypto Traders 🚨📉 #Shorts',
          text: 'Market makers hunt stop-losses right above equal highs. Here is how to identify institutional order blocks before the sweep.\n\n🎁 FREE CHEAT SHEET:\nGet the Order Block & Liquidity Cheat Sheet:\n👉 https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto\n\n#liquiditypool #marketmaker #cryptocharts #bitcoinanalysis #technicalanalysis',
          comment: '🚨 Grab the Order Block & Liquidity Cheat Sheet free: https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto_pinned',
          tags: ['liquidity sweep crypto', 'order block trading', 'bitcoin market structure', 'crypto trading strategy', 'smart money concepts']
        },
        {
          day: 7,
          video: 'prop-trading-commercial.mp4',
          thumb: 'trade-thumbnail.jpg',
          title: 'Why Risk-to-Reward Ratio Is The Only Number That Matters ⚖️📊 #Shorts',
          text: 'You can win only 40% of your trades and still generate massive portfolio growth if your R:R is dialed into 1:3. Here is the math.\n\n🎁 FREE MATRIX:\nDownload the Trading Risk Management Matrix:\n👉 https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto\n\n#risktoreward #tradingmath #tradingstrategy #capitalpreservation #traderlifestyle',
          comment: '⚖️ Get the Risk Management Matrix free: https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto_pinned',
          tags: ['risk to reward trading', 'trading mathematics', 'crypto portfolio sizing', 'funded account rules', 'risk management']
        },
        {
          day: 10,
          video: 'matrix-commercial.mp4',
          thumb: 'trade-thumbnail.jpg',
          title: 'How To Spot Institutional Accumulation Before A Breakout 🐋🪙 #Shorts',
          text: 'Volume divergence during quiet sideways ranges signals smart money absorbing supply. Here is the on-chain signal to track.\n\n🎁 FREE GUIDE:\nDownload the Whale Accumulation Tracker Protocol:\n👉 https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto\n\n#onchainanalysis #cryptowhales #bitcoinaccumulation #altcoins #cryptoalpha',
          comment: '🐋 Grab the Whale Accumulation Protocol: https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto_pinned',
          tags: ['on chain data crypto', 'whale tracking bitcoin', 'crypto accumulation phase', 'altcoin breakout', 'chainradar']
        },
        {
          day: 13,
          video: 'prop-trading-commercial.mp4',
          thumb: 'trade-thumbnail.jpg',
          title: 'The 3 Rules For Passing Prop Firm Evaluations On Your 1st Try 🏆📈 #Shorts',
          text: 'Most traders fail on daily drawdown limits, not overall profit targets. Here is the position sizing strategy that keeps drawdown below 2%.\n\n🎁 FREE GUIDE:\nGet the Drawdown Defense Blueprint:\n👉 https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto\n\n#proptradingrules #fundedtrader #positionmanagement #tradingdiscipline',
          comment: '🏆 Download the Drawdown Defense Blueprint: https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto_pinned',
          tags: ['prop firm challenge tips', 'drawdown management', 'funded trader rules', 'crypto prop trading']
        },
        {
          day: 16,
          video: 'matrix-commercial.mp4',
          thumb: 'trade-thumbnail.jpg',
          title: 'Why You Must Stop Trading Breakouts In Low-Volume Sessions 🚫⏰ #Shorts',
          text: 'Trading breakouts during session transitions is the easiest way to get chopped up. Trade the London and New York opens instead.\n\n🎁 FREE CALENDAR:\nDownload the Global Session Volume Cheat Sheet:\n👉 https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto\n\n#tradingsessions #londonopen #newyorkopen #cryptotradinghours',
          comment: '⏰ Grab the Session Volume Cheat Sheet: https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto_pinned',
          tags: ['trading session hours', 'forex market hours', 'crypto volatility timing']
        },
        {
          day: 19,
          video: 'prop-trading-commercial.mp4',
          thumb: 'trade-thumbnail.jpg',
          title: 'The Psychology Of A Winning Trade: Eliminating FOMO 🧠🧘 #Shorts',
          text: 'When green candles pump, retail panics and buys the top. Professional capital waits patiently for retests of key demand zones.\n\n🎁 FREE GUIDE:\nGet the Trader Psychology Reset Framework:\n👉 https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto\n\n#tradingpsychology #emotionalcontrol #fomo #zenoftrading',
          comment: '🧘 Download the Trader Psychology Reset Framework: https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto_pinned',
          tags: ['trading mindset', 'overcome fomo trading', 'professional trading psychology']
        },
        {
          day: 22,
          video: 'matrix-commercial.mp4',
          thumb: 'trade-thumbnail.jpg',
          title: 'How To Backtest Your Edge In 30 Minutes Using Replay Mode ⏪📊 #Shorts',
          text: 'Never risk capital on an untested strategy. Here is the step-by-step 100-trade backtesting protocol that builds bulletproof conviction.\n\n🎁 FREE SPREADSHEET:\nDownload the Master Trade Journal & Backtesting Sheet:\n👉 https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto\n\n#backtesting #tradejournal #tradingedge #marketstructure',
          comment: '📊 Get the Trade Journal & Backtesting Sheet: https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto_pinned',
          tags: ['backtesting strategy', 'trading edge verification', 'trade journal template']
        },
        {
          day: 25,
          video: 'prop-trading-commercial.mp4',
          thumb: 'trade-thumbnail.jpg',
          title: 'What Happens When You Trade Capital You Cannot Afford To Lose ⚠️📉 #Shorts',
          text: 'Scared money never wins because stress forces premature exits. Institutional funding detaches emotion from execution.\n\n🎁 FREE GUIDE:\nGet the Capital Scaling Roadmap:\n👉 https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto\n\n#scaredmoney #tradingcapital #proptradingblueprint #riskmitigation',
          comment: '⚠️ Download the Capital Scaling Roadmap: https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto_pinned',
          tags: ['capital preservation trading', 'prop trading leverage', 'risk management trading']
        },
        {
          day: 28,
          video: 'matrix-commercial.mp4',
          thumb: 'trade-thumbnail.jpg',
          title: 'The Complete Crypto Market Cycle Blueprint (2026 Edition) 🔄🌐 #Shorts',
          text: 'From smart money accumulation and public markup to distribution and capitulation. Here is where we are in the cycle right now.\n\n🎁 FREE REPORT:\nDownload the 2026 Crypto Market Cycle Report:\n👉 https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto\n\n#marketcycles #bitcoinhalving #crypto2026 #cryptostrategy',
          comment: '🌐 Download the 2026 Market Cycle Report: https://traffic.aisimplesystem.com/bio/perpetual?src=yt_crypto_pinned',
          tags: ['crypto market cycles', 'bitcoin macro analysis', 'chainradar crypto']
        }
      ]
    },

    // 5. EsportGuide (YouTube)
    {
      name: 'EsportGuide',
      accounts: ['cmw5obiao0009my7ai84h2xi1'],
      utcHour: 15,
      drops: [
        {
          day: 2,
          video: 'matrix-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'The 1 Latency Tweak Pro Players Use For Zero Input Lag 🎮⚡ #Shorts',
          text: 'Hardware latency isn\'t just about your monitor. Here is the Windows DPC latency and polling rate tweak that delivers instant mouse response.\n\n🎁 FREE GUIDE:\nDownload the Zero-Latency Competitive Gaming Optimization Guide:\n👉 https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports\n\n#esports #gamingoptimization #inputlag #pcgaming #reactiontime',
          comment: '⚡ Get the Zero-Latency Competitive Gaming Guide: https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports_pinned',
          tags: ['zero input lag', 'gaming latency fix', 'competitive gaming tweaks', 'esports performance', 'esportguide']
        },
        {
          day: 5,
          video: 'ai-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'Why Your Refresh Rate Isn’t Why You’re Missing Shots 🎯🖥️ #Shorts',
          text: 'Going from 240Hz to 360Hz gives diminishing returns if your frame pacing is stuttering. Here is how to lock frame times flat.\n\n🎁 FREE BLUEPRINT:\nDownload the Frame Pacing & FPS Lock Blueprint:\n👉 https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports\n\n#refreshrate #frametimes #pcoptimization #aimtraining #fpsgames',
          comment: '🎯 Grab your Free Frame Pacing Blueprint: https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports_pinned',
          tags: ['frame pacing gaming', 'monitor refresh rate comparison', 'competitive aim training']
        },
        {
          day: 8,
          video: 'matrix-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'Neuro-Focus Protocols: How Elite Gamers Maintain Peak Reaction Speed 🧠⚡ #Shorts',
          text: 'Energy drinks cause sugar crashes and hand jitters. Professional esports teams use hydration electrolytes and cognitive nootropics instead.\n\n🎁 FREE PROTOCOL:\nGet the Competitive Gamer Nutrition & Reaction Protocol:\n👉 https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports\n\n#esportsnutrition #reactiontime #gamerfocus #gamingnootropics',
          comment: '🧠 Download the Reaction Speed & Focus Protocol free: https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports_pinned',
          tags: ['gamer reaction time', 'esports focus protocol', 'competitive gaming energy']
        },
        {
          day: 11,
          video: 'ai-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'The Mouse Grip Mistake That Is Damaging Your Flick Accuracy 🖱️🎯 #Shorts',
          text: 'Switching between palm and claw grip mid-game destroys muscle memory. Here is how to find your natural biometric grip style.\n\n🎁 FREE GUIDE:\nDownload the Aim & Grip Consistency Checklist:\n👉 https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports\n\n#aimtraining #mousegrip #flickshots #fpsaim',
          comment: '🖱️ Get the Aim & Grip Consistency Checklist: https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports_pinned',
          tags: ['mouse grip guide', 'fps aim training', 'competitive shooter tips']
        },
        {
          day: 14,
          video: 'matrix-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'Audio Equalizer Hacks: Hear Enemy Footsteps Before They Round The Corner 🎧🔊 #Shorts',
          text: 'Bass-heavy gaming headsets drown out subtle footstep frequencies. Here is the custom EQ curve that isolates footsteps in any shooter.\n\n🎁 FREE PRESETS:\nDownload the Competitive Footstep EQ Profiles:\n👉 https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports\n\n#gamingaudio #footstepsound #equalizerprofile #competitivegaming',
          comment: '🎧 Download the Free Footstep EQ Profiles: https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports_pinned',
          tags: ['footstep eq guide', 'gaming audio tweaks', 'competitive sound settings']
        },
        {
          day: 17,
          video: 'ai-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'Why Warming Up In Real Matches Destroys Your Ranked MMR 📉🛡️ #Shorts',
          text: 'Never jump into competitive lobbies cold. A 10-minute targeted tracking and micro-adjustment routine protects your ranking.\n\n🎁 FREE ROUTINE:\nGet the 10-Minute Pro Aim Warm-Up Routine:\n👉 https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports\n\n#rankedgrind #aimwarmup #competitivemindset #mmrboost',
          comment: '🛡️ Grab the 10-Minute Aim Warm-Up Routine: https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports_pinned',
          tags: ['aim warmup routine', 'ranked mmr climb', 'esports aim training']
        },
        {
          day: 20,
          video: 'matrix-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'Monitor Distance & Eye Ergonomics: Prevent Eye Fatigue In Long Sessions 👁️🖥️ #Shorts',
          text: 'Sitting too close strains eye convergence and slows visual scan speed. Here is the ergonomic setup for peak visual acuity.\n\n🎁 FREE GUIDE:\nDownload the Pro Gamer Ergonomic & Setup Guide:\n👉 https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports\n\n#gamingergonomics #eyehealth #gamerlife #pcsetup',
          comment: '👁️ Get the Pro Gamer Ergonomic Setup Guide: https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports_pinned',
          tags: ['gaming ergonomics', 'desk setup competitive', 'eye strain prevention gaming']
        },
        {
          day: 23,
          video: 'ai-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'The V-Sync Trap: Why You Should Never Enable Triple Buffering 🚫🕹️ #Shorts',
          text: 'Triple buffering fixes screen tearing by adding 2 full frames of input delay. Here is how G-Sync + Frame Rate Limiter solves it cleanly.\n\n🎁 FREE GUIDE:\nDownload the Definitive Display Sync Guide:\n👉 https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports\n\n#vsync #gsync #tearingfix #pcgamingtips',
          comment: '🕹️ Download the Display Sync Guide free: https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports_pinned',
          tags: ['gsync setup guide', 'vsync input lag fix', 'pc performance guide']
        },
        {
          day: 26,
          video: 'matrix-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'How To Handle Tilt & Reset Mental State After Bad Matches 🧘🎮 #Shorts',
          text: 'Queuing while frustrated is a guaranteed loss streak. Here is the 2-minute physiological sigh protocol pro players use between games.\n\n🎁 FREE PROTOCOL:\nDownload the Gamer Tilt-Proof Mental Protocol:\n👉 https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports\n\n#tiltproof #gamingmindset #competitivefocus #gamerhealth',
          comment: '🧘 Get the Tilt-Proof Mental Protocol free: https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports_pinned',
          tags: ['overcome tilt gaming', 'competitive mindset esports', 'focus control gaming']
        },
        {
          day: 29,
          video: 'ai-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'The Complete Competitive PC Optimization Checklist (2026 Edition) 🏆⚡ #Shorts',
          text: 'Every background process, power plan setting, and GPU driver tweak compiled into one definitive master checklist.\n\n🎁 DOWNLOAD MASTER CHECKLIST:\n👉 https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports\n\n#pcrestoration #competitivegaming #esportstweaks #gamingperformance',
          comment: '🏆 Download the Master PC Optimization Checklist: https://traffic.aisimplesystem.com/bio/gaming?src=yt_esports_pinned',
          tags: ['pc optimization 2026', 'gaming fps boost', 'esportguide master checklist']
        }
      ]
    },

    // 6. AURUM RISE UNIVERSITY (YouTube)
    {
      name: 'AURUM RISE UNIVERSITY',
      accounts: ['cmw5g5lug0005qs75jo1zebfi'],
      utcHour: 14,
      drops: [
        {
          day: 1,
          video: 'ai-vault-commercial.mp4',
          thumb: 'ai-vault-thumbnail.jpg',
          title: 'Why Multi-Agent Systems Make Single AI Chatbots Obsolete 🤖🚀 #Shorts',
          text: 'Single chatbots forget context and hit token limits. Autonomous multi-agent swarms collaborate, inspect, and execute complex workflows without humans.\n\n🎁 FREE MASTERCLASS:\nAccess the Autonomous AI Agent Architecture Masterclass:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=yt_aru\n\n#aiagents #autonomousai #multiagentsystem #futureofwork #artificialintelligence',
          comment: '🤖 Get the Autonomous AI Agent Masterclass free: https://traffic.aisimplesystem.com/bio/portal?src=yt_aru_pinned 👇 Have you built an AI agent yet?',
          tags: ['ai agents 2026', 'multi agent systems', 'autonomous workflows', 'ai university', 'aurum rise university']
        },
        {
          day: 4,
          video: 'ai-commercial.mp4',
          thumb: 'ai-vault-thumbnail.jpg',
          title: 'How Autonomous Workflows Replace 40 Hours of Busywork In 1 Hour ⚡💻 #Shorts',
          text: 'Manual data entry, scheduling, research, and formatting can all be orchestrated via model context protocols. Here is the operational blueprint.\n\n🎁 FREE BLUEPRINT:\nDownload the Enterprise Autonomous Workflow Blueprint:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=yt_aru\n\n#automation #productivityhacks #operations #mcp #worksmart',
          comment: '⚡ Grab the Autonomous Workflow Blueprint: https://traffic.aisimplesystem.com/bio/portal?src=yt_aru_pinned',
          tags: ['ai workflow automation', 'mcp tools', 'enterprise ai blueprints', 'business automation']
        },
        {
          day: 7,
          video: 'ai-vault-commercial.mp4',
          thumb: 'ai-vault-thumbnail.jpg',
          title: 'The 3 AI Skills That Actually Pay In 2026 (Beyond Prompting) 🎓📊 #Shorts',
          text: 'Prompt engineering was 2023. Today the real value is in Agent Architecture, Tool Integration Protocols, and Automated Evaluation Systems.\n\n🎁 FREE CURRICULUM:\nDownload the 2026 AI Architecture Curriculum Guide:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=yt_aru\n\n#aiskills #careergrowth #techcareers #futureproof',
          comment: '🎓 Download the 2026 AI Architecture Curriculum: https://traffic.aisimplesystem.com/bio/portal?src=yt_aru_pinned',
          tags: ['ai career path', 'agentic engineering', 'ai skills 2026', 'tech education']
        },
        {
          day: 10,
          video: 'ai-commercial.mp4',
          thumb: 'ai-vault-thumbnail.jpg',
          title: 'What Is Model Context Protocol (MCP) And Why Does It Matter? 🌐🔗 #Shorts',
          text: 'MCP connects AI brains directly to real-world software, databases, and APIs. Here is why it is the TCP/IP of the AI era.\n\n🎁 FREE GUIDE:\nDownload the Developer\'s Guide to MCP Integration:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=yt_aru\n\n#mcp #modelcontextprotocol #softwaredevelopment #apiintegration',
          comment: '🔗 Download the Developer\'s Guide to MCP: https://traffic.aisimplesystem.com/bio/portal?src=yt_aru_pinned',
          tags: ['model context protocol', 'mcp developer guide', 'ai integration protocols']
        },
        {
          day: 13,
          video: 'ai-vault-commercial.mp4',
          thumb: 'ai-vault-thumbnail.jpg',
          title: 'How To Build A Self-Healing Automated Content Engine 🛠️⚙️ #Shorts',
          text: 'When API keys rotate or networks stall, standard scripts crash. A self-healing supervisor daemon checks health and auto-recovers drops.\n\n🎁 FREE BLUEPRINT:\nGet the Self-Healing Infrastructure Blueprint:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=yt_aru\n\n#devops #automationengineering #selfhealingcode #systemdesign',
          comment: '⚙️ Grab the Self-Healing Infrastructure Blueprint: https://traffic.aisimplesystem.com/bio/portal?src=yt_aru_pinned',
          tags: ['automated content engine', 'self healing systems', 'ai infrastructure']
        },
        {
          day: 16,
          video: 'ai-commercial.mp4',
          thumb: 'ai-vault-thumbnail.jpg',
          title: 'The Token Optimization Framework: Cut API Costs By 70% 📉💡 #Shorts',
          text: 'Stuffing massive documentation into prompt contexts drains token budgets fast. Here is how vector chunking and progressive disclosure save thousands.\n\n🎁 FREE SPREADSHEET:\nDownload the AI Cost Optimization Framework:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=yt_aru\n\n#costoptimization #llmcosts #tokenbudget #aiarchitecture',
          comment: '💡 Download the AI Cost Optimization Framework: https://traffic.aisimplesystem.com/bio/portal?src=yt_aru_pinned',
          tags: ['reduce llm costs', 'token optimization', 'ai cost management']
        },
        {
          day: 19,
          video: 'ai-vault-commercial.mp4',
          thumb: 'ai-vault-thumbnail.jpg',
          title: 'Why Edge Computing Is Taking Over Local AI Inference 💻⚡ #Shorts',
          text: 'Running heavy models in centralized clouds creates latency and privacy risks. Apple Silicon and edge chips are the future of private agents.\n\n🎁 FREE REPORT:\nDownload the Local AI Hardware Evaluation Report:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=yt_aru\n\n#localai #edgecomputing #applesilicon #privatellm',
          comment: '⚡ Get the Local AI Hardware Evaluation Report: https://traffic.aisimplesystem.com/bio/portal?src=yt_aru_pinned',
          tags: ['local ai inference', 'apple silicon ai', 'private agent computing']
        },
        {
          day: 22,
          video: 'ai-commercial.mp4',
          thumb: 'ai-vault-thumbnail.jpg',
          title: 'How To Build An Autonomous Research Agent In 15 Minutes 🔍🤖 #Shorts',
          text: 'Scraping web data, summarizing PDFs, and outputting formatted reports completely hands-free. Here is the architecture stack.\n\n🎁 FREE CODE TEMPLATE:\nDownload the Autonomous Research Agent Template:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=yt_aru\n\n#researchagent #pythonai #agenticrag #datascience',
          comment: '🔍 Download the Research Agent Code Template: https://traffic.aisimplesystem.com/bio/portal?src=yt_aru_pinned',
          tags: ['research agent python', 'automated research', 'ai rag workflows']
        },
        {
          day: 25,
          video: 'ai-vault-commercial.mp4',
          thumb: 'ai-vault-thumbnail.jpg',
          title: 'The Difference Between AI Automation and True Agentic Autonomy 🧠⚖️ #Shorts',
          text: 'Automation follows static if/then rules. True agentic systems observe feedback, handle unexpected errors, and self-correct.\n\n🎁 FREE GUIDE:\nDownload the Agentic Autonomy Spectrum Guide:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=yt_aru\n\n#agenticai #aiethics #automationvsagent #systemsthinking',
          comment: '⚖️ Get the Agentic Autonomy Spectrum Guide: https://traffic.aisimplesystem.com/bio/portal?src=yt_aru_pinned',
          tags: ['agentic autonomy', 'autonomous systems design', 'ai thought leadership']
        },
        {
          day: 28,
          video: 'ai-commercial.mp4',
          thumb: 'ai-vault-thumbnail.jpg',
          title: 'The 2026 Autonomous Enterprise Roadmap (Full Keynote Summary) 🏆🌐 #Shorts',
          text: 'A complete bird\'s-eye view of how modern companies transition from human bottlenecks to agent-assisted compounding machines.\n\n🎁 DOWNLOAD FULL SUMMARY:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=yt_aru\n\n#autonomousenterprise #futurebusiness #scalingwithai #aurumrise',
          comment: '🏆 Download the 2026 Autonomous Enterprise Roadmap: https://traffic.aisimplesystem.com/bio/portal?src=yt_aru_pinned',
          tags: ['autonomous enterprise', 'ai scaling roadmap', 'aurum rise university']
        }
      ]
    },

    // 7. Ken Davis (Instagram + Facebook)
    {
      name: 'Ken Davis',
      accounts: ['cmw951vs10065my7awkxf4hw4', 'cmw5m39yb0009o87eietgclp0'],
      utcHour: 13,
      drops: [
        {
          day: 2,
          video: 'ai-visibility-engine-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'The Hardest Lesson I Learned Building Autonomous Systems 💡🛠️',
          text: 'When we first started building automated systems, we thought software was the bottleneck. It never is. The real bottleneck is clarity of architecture.\n\nWhen your system has clean guardrails, execution becomes effortless.\n\n🎁 Explore the frameworks we use:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis\n\n#foundersmindset #systembuilding #entrepreneurship #leverage #leadership',
          comment: '💡 Explore the operational frameworks we build: https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis_pinned',
          tags: ['founder insights', 'systems thinking', 'entrepreneurial leverage']
        },
        {
          day: 5,
          video: 'viral-traffic-matrix-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'Why Complexity Is The Silent Killer Of High-Growth Businesses 📈⚖️',
          text: 'Every unnecessary step in your pipeline is a potential point of failure. The best architectures do more with fewer moving parts.\n\nBuild simple. Automate deeply. Let machines handle the repetition.\n\n🎁 Free system design blueprints:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis\n\n#simplicity #businessarchitecture #scalability #focus',
          comment: '⚖️ Grab our system design blueprints: https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis_pinned',
          tags: ['business simplicity', 'scaling systems', 'operations leadership']
        },
        {
          day: 8,
          video: 'ai-visibility-engine-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'How To Build Distribution That Runs While You Sleep 🌙⚙️',
          text: 'If your business only moves forward when you are actively typing, you don\'t own a business; you own a high-stress job.\n\nBuild systems that publish, nurture, and deliver on autopilot.\n\n🎁 See how our distribution engine works:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis\n\n#passiveincome #automateddistribution #digitalinfrastructure #businessgrowth',
          comment: '⚙️ See how our distribution engine runs: https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis_pinned',
          tags: ['automated distribution', 'digital leverage', 'founder lifestyle']
        },
        {
          day: 11,
          video: 'viral-traffic-matrix-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'The Difference Between Being Busy and Building Real Equity 🏗️📊',
          text: 'Busywork feels productive because it fills the calendar. But equity only compounds when you create assets that outlast your day.\n\nAsk yourself every morning: "Am I doing a task, or am I building a machine?"\n\n🎁 Free Entrepreneurial Asset Roadmap:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis\n\n#assetbuilding #realwealth #focusonwhatmatters #entrepreneur',
          comment: '🏗️ Download the Entrepreneurial Asset Roadmap: https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis_pinned',
          tags: ['asset creation', 'compounding equity', 'strategic focus']
        },
        {
          day: 14,
          video: 'ai-visibility-engine-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'Why The Solo Operator Era Has Arrived 🚀💻',
          text: 'Five years ago, running a multi-channel network required an agency of 20 people. Today, a single focused founder with autonomous agents can outperform that agency.\n\nLeverage is the great equalizer.\n\n🎁 Explore our multi-agent stack:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis\n\n#solofounder #aioperators #futureofbusiness #agencymodel',
          comment: '🚀 Explore the autonomous founder stack: https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis_pinned',
          tags: ['solo operator', 'ai leverage', 'future of work']
        },
        {
          day: 17,
          video: 'viral-traffic-matrix-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'The Discipline Of Goldilocks Pacing ⏳🎯',
          text: 'Most people sprint for 2 weeks, burn out, and quit for 3 months. Compounding requires showing up at a steady, unstoppable pace day after day.\n\nDon\'t rush the algorithm. Feed it consistently.\n\n🎁 Free Consistency Framework:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis\n\n#consistency #longtermthinking #discipline #habits',
          comment: '🎯 Grab the Consistency Framework free: https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis_pinned',
          tags: ['consistent growth', 'long term strategy', 'habits of success']
        },
        {
          day: 20,
          video: 'ai-visibility-engine-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'Your Energy Is Your Most Valuable Asset: Protect It 🛡️⚡',
          text: 'Guard your focus ruthlessly. Delegate repetitive administrative tasks to software so your mind stays free for high-level creative direction.\n\nSoftware doesn\'t get tired.\n\n🎁 See our operational automation setup:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis\n\n#energyprotection #highperformance #mentalclarity #focus',
          comment: '⚡ Learn how we protect founder energy: https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis_pinned',
          tags: ['energy management', 'founder focus', 'high performance habits']
        },
        {
          day: 23,
          video: 'viral-traffic-matrix-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'Why Iteration Beats Perfection Every Single Time 🔄💡',
          text: 'The best products and campaigns are never born perfect; they are shaped by real-world feedback in the wild.\n\nLaunch fast, listen closely, and refine relentlessly.\n\n🎁 Free Rapid Prototyping Blueprint:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis\n\n#rapiditeration #buildinpublic #feedbackloops #leanstartup',
          comment: '💡 Download the Rapid Prototyping Blueprint: https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis_pinned',
          tags: ['iteration over perfection', 'lean methodology', 'growth mindset']
        },
        {
          day: 26,
          video: 'ai-visibility-engine-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'The Compounding Value Of Autonomous Infrastructure 🏛️📈',
          text: 'Code you write today that runs autonomously tomorrow continues paying dividends for years.\n\nInvest in infrastructure that works for you 24 hours a day, 7 days a week.\n\n🎁 See our full blueprint:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis\n\n#autonomousinfrastructure #dividends #businessassets #scaling',
          comment: '📈 See the autonomous infrastructure blueprint: https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis_pinned',
          tags: ['autonomous systems', 'infrastructure investment', 'compounding assets']
        },
        {
          day: 29,
          video: 'viral-traffic-matrix-commercial.mp4',
          thumb: 'matrix-thumbnail.png',
          title: 'A Vision For The Next Decade Of Creative Leverage 🌐✨',
          text: 'We are living through the greatest explosion of individual creative power in human history. Build fearlessly, automate thoughtfully, and create lasting value.\n\n🎁 Connect with our university community:\n👉 https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis\n\n#creativeleverage #futurevision #aurumrise #inspiration',
          comment: '✨ Connect with our community here: https://traffic.aisimplesystem.com/bio/portal?src=social_kendavis_pinned',
          tags: ['creative leverage', 'future vision', 'ken davis']
        }
      ]
    }
  ];

  let totalScheduled = 0;

  const connectedAccounts = await postiz.getConnectedAccounts();
  const connectedIds = new Set(connectedAccounts.map(a => a.id));

  for (const ch of CHANNELS) {
    const validAccounts = ch.accounts.filter(id => connectedIds.has(id));
    if (validAccounts.length === 0) {
      console.warn(`⚠️ [Channel Integrity Guardrail] Channel "${ch.name}" has no connected accounts in Postiz (${ch.accounts.join(', ')} not found). Skipping to prevent misrouting.`);
      continue;
    }

    console.log(`\n=============================================================`);
    console.log(`📦 [Channel] ${ch.name} (Active Accounts: ${validAccounts.join(', ')})`);
    console.log(`=============================================================`);

    for (let i = 0; i < ch.drops.length; i++) {
      const drop = ch.drops[i];
      const videoPath = path.join(VIDEOS_DIR, drop.video);
      const thumbPath = path.join(THUMBS_DIR, drop.thumb);

      if (!fs.existsSync(videoPath)) {
        console.warn(`⚠️ Video file missing: ${videoPath}, skipping...`);
        continue;
      }

      const scheduledSlot = getSlot(drop.day, ch.utcHour);
      console.log(`[${i + 1}/${ch.drops.length}] Scheduling: "${drop.title.slice(0, 45)}..." on ${scheduledSlot.slice(0, 10)}`);

      try {
        const res = await postiz.schedulePost({
          title: drop.title,
          text: drop.text,
          videoFilePath: videoPath,
          thumbnailFilePath: fs.existsSync(thumbPath) ? thumbPath : undefined,
          accountIds: validAccounts,
          scheduledAt: scheduledSlot,
          firstCommentMessage: drop.comment,
          youtubeTags: drop.tags,
          projectTag: ch.name.toLowerCase().replace(/[^a-z0-9]/g, '-')
        });

        totalScheduled++;
        console.log(`   ✅ Success! Targets:`, res.targets);
      } catch (err) {
        console.error(`   ❌ Failed to schedule:`, err.message);
      }
    }
  }

  console.log(`\n🎉 30-DAY CAMPAIGN DEPLOYMENT COMPLETE! Total drops scheduled: ${totalScheduled}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
