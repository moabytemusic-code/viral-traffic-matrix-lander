// Automated Multi-Angle Video Generation & Cadence Engine
// Rotates across 3 distinct direct-response angles per offer on full autopilot.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const csClient = require('./contentstudio-client');
const postizClient = require('./postiz-client');

const ANGLES_FILE = fs.existsSync(path.join(__dirname, 'angles.json'))
  ? path.join(__dirname, 'angles.json')
  : path.join(__dirname, '..', 'remotion_studio', 'angles.json');
const STATE_FILE = path.join(__dirname, 'cadence-state.json');
const PYTHON_PATH = '/Users/kd5000/Documents/Codex/2026-10-18/referenced-chatgpt-conversation-this-is-an-4/MoneyPrinterTurbo/.venv/bin/python';
const REMOTION_DIR = path.join(__dirname, '..', 'remotion_studio');
const VIDEOS_DIR = path.join(__dirname, 'public', 'videos');

function loadAngles() {
  if (!fs.existsSync(ANGLES_FILE)) return {};
  try {
    return JSON.parse(fs.readFileSync(ANGLES_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    return {
      'santa-circle': { currentAngleId: 1, cycle: 1, lastScheduledAt: '2026-11-03 12:30:00' },
      'bellver-card': { currentAngleId: 1, cycle: 1, lastScheduledAt: '2026-11-03 17:30:00' },
      'yu-sleep': { currentAngleId: 1, cycle: 1, lastScheduledAt: '2026-11-04 12:30:00' }
    };
  }
  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch {
    return {};
  }
}

function saveState(state) {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// Generate Neural Voiceover & Word-level Captions via Edge TTS
function generateAudioAndCaptions(slug, angle) {
  const audioFile = path.join(REMOTION_DIR, 'public', `${slug}-angle-${angle.angleId}-voiceover.mp3`);
  const captionsFile = path.join(REMOTION_DIR, 'public', `${slug}-angle-${angle.angleId}-captions.json`);

  if (fs.existsSync(audioFile) && fs.existsSync(captionsFile)) {
    return { audioFile, captionsFile };
  }

  console.log(`🎙️ [Edge TTS] Synthesizing AvaNeural voiceover for ${slug} (Angle ${angle.angleId})...`);
  const escapedScript = angle.script.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
  const pyCode = `import asyncio
import json
import edge_tts

async def gen():
    comm = edge_tts.Communicate("""${escapedScript}""", 'en-US-AvaNeural', rate='+3%', boundary='WordBoundary')
    words = []
    with open("${audioFile}", "wb") as f:
        async for chunk in comm.stream():
            if chunk['type'] == 'audio':
                f.write(chunk['data'])
            elif chunk['type'] == 'WordBoundary':
                words.append({
                    'text': chunk['text'],
                    'start': chunk['offset'] / 1e7,
                    'end': (chunk['offset'] + chunk['duration']) / 1e7
                })
    with open("${captionsFile}", "w") as f:
        json.dump(words, f, indent=2)

asyncio.run(gen())
`;

  const tempPy = path.join(REMOTION_DIR, 'temp_tts.py');
  fs.writeFileSync(tempPy, pyCode, 'utf8');
  try {
    execSync(`"${PYTHON_PATH}" "${tempPy}"`, { stdio: 'inherit' });
  } finally {
    if (fs.existsSync(tempPy)) fs.unlinkSync(tempPy);
  }

  return { audioFile, captionsFile };
}

// Render Commercial MP4 via Remotion CLI or graceful category fallback
function renderAngleVideo(slug, angleId) {
  const targetMp4 = path.join(VIDEOS_DIR, `${slug}-angle-${angleId}.mp4`);
  if (fs.existsSync(targetMp4)) {
    return targetMp4;
  }

  // 1. Check if exact slug master commercial exists
  const masterCandidates = [
    path.join(VIDEOS_DIR, `${slug}-commercial.mp4`),
    path.join(VIDEOS_DIR, `${slug.replace(/-/g, '')}-commercial.mp4`)
  ];
  for (const mc of masterCandidates) {
    if (fs.existsSync(mc)) {
      try {
        fs.copyFileSync(mc, targetMp4);
        return targetMp4;
      } catch {}
      return mc;
    }
  }

  // 2. Map category fallback commercials
  const categoryFallbacks = {
    'offgrid-water': 'power-commercial.mp4',
    'blackout-power': 'home-power-commercial.mp4',
    'freeze-defense': 'power-commercial.mp4',
    'dog-enrichment': 'dog-enrichment-commercial.mp4',
    'prop-trading': 'prop-trading-commercial.mp4',
    'yu-sleep': 'yusleep-commercial.mp4',
    'bellver-card': 'bellver-commercial.mp4',
    'santa-circle': 'santa-circle-commercial.mp4'
  };

  const catFallback = categoryFallbacks[slug];
  if (catFallback && fs.existsSync(path.join(VIDEOS_DIR, catFallback))) {
    const fallbackPath = path.join(VIDEOS_DIR, catFallback);
    try {
      fs.copyFileSync(fallbackPath, targetMp4);
      return targetMp4;
    } catch {
      return fallbackPath;
    }
  }

  // 3. Attempt local Remotion render if environment is capable
  const hasRemotion = fs.existsSync(REMOTION_DIR) && fs.existsSync(PYTHON_PATH);
  if (hasRemotion) {
    try {
      const anglesData = loadAngles();
      const offer = anglesData[slug];
      if (offer) {
        const angle = offer.angles.find((a) => a.angleId === angleId);
        if (angle) {
          const { audioFile, captionsFile } = generateAudioAndCaptions(slug, angle);
          const durStr = execSync(
            `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFile}"`
          ).toString().trim();
          const durSeconds = parseFloat(durStr) || 25;
          const frames = Math.ceil(durSeconds * 30);

          let compId = 'BellverCommercial';
          if (slug === 'santa-circle') compId = 'SantaCircleCommercial';
          if (slug === 'yu-sleep') compId = 'YuSleepCommercial';
          if (slug === 'dog-enrichment') compId = 'DogCommercial';

          let activeAudioName = 'voiceover.mp3';
          let activeCaptionsName = 'captions.json';
          if (slug === 'santa-circle') {
            activeAudioName = 'santa-voiceover.mp3';
            activeCaptionsName = 'santa-captions.json';
          } else if (slug === 'yu-sleep') {
            activeAudioName = 'yusleep-voiceover.mp3';
            activeCaptionsName = 'yusleep-captions.json';
          } else if (slug === 'dog-enrichment') {
            activeAudioName = 'dogs-voiceover.mp3';
            activeCaptionsName = 'dogs-captions.json';
          }

          const backupAudio = path.join(REMOTION_DIR, 'public', `${activeAudioName}.bak`);
          const backupCaptions = path.join(REMOTION_DIR, 'public', `${activeCaptionsName}.bak`);
          const activeAudioPath = path.join(REMOTION_DIR, 'public', activeAudioName);
          const activeCaptionsPath = path.join(REMOTION_DIR, 'public', activeCaptionsName);

          if (fs.existsSync(activeAudioPath)) fs.copyFileSync(activeAudioPath, backupAudio);
          if (fs.existsSync(activeCaptionsPath)) fs.copyFileSync(activeCaptionsPath, backupCaptions);

          try {
            fs.copyFileSync(audioFile, activeAudioPath);
            fs.copyFileSync(captionsFile, activeCaptionsPath);
            console.log(`🎬 [Remotion CLI] Rendering ${slug} (Angle ${angleId}) at 1080x1920 (${frames} frames)...`);
            execSync(
              `npx remotion render src/index.ts ${compId} "${targetMp4}" --frames=0-${frames - 1} --concurrency=4`,
              { cwd: REMOTION_DIR, stdio: 'inherit' }
            );
            return targetMp4;
          } finally {
            if (fs.existsSync(backupAudio)) {
              fs.copyFileSync(backupAudio, activeAudioPath);
              fs.unlinkSync(backupAudio);
            }
            if (fs.existsSync(backupCaptions)) {
              fs.copyFileSync(backupCaptions, activeCaptionsPath);
              fs.unlinkSync(backupCaptions);
            }
          }
        }
      }
    } catch (renderErr) {
      console.warn(`⚠️ [Cadence Engine] Remotion render skipped for ${slug}:`, renderErr.message);
    }
  }

  // 4. Universal fallback: pick any valid mp4 in VIDEOS_DIR
  try {
    const files = fs.readdirSync(VIDEOS_DIR).filter(f => f.endsWith('.mp4'));
    if (files.length > 0) {
      return path.join(VIDEOS_DIR, files[0]);
    }
  } catch {}

  throw new Error(`No video asset found for ${slug} Angle ${angleId}`);
}

// Dynamic account matching across all 28 ContentStudio profiles
function getEligibleAccountsForOffer(csAccounts, slug) {
  const s = slug.toLowerCase();

  const eligible = csAccounts.filter((a) => {
    if (a.validity !== 'valid') return false;
    const name = (a.account_name || a.name || '').toLowerCase();
    if (name.includes('aurum')) return false;
    if (name === 'ken davis') return false;

    // Dog / Pet
    if (s.includes('dog')) {
      return name.includes('dog') || name.includes('enrichment') || name.includes('freebie');
    }
    // Holiday / Santa
    if (s.includes('santa')) {
      return name.includes('storytime') || name.includes('erica') || name.includes('freebie') || name.includes('everyday');
    }
    // Finance / Trading / Cards
    if (s.includes('card') || s.includes('bellver') || s.includes('trad') || s.includes('financ')) {
      return name.includes('walletwise') || name.includes('market') || name.includes('profit') || name.includes('signal');
    }
    // Sleep / Health / Mind
    if (s.includes('sleep')) {
      return name.includes('everyday mind') || name.includes('freebie') || name.includes('marketing resource') || name.includes('profit');
    }
    // Power / Water / Freeze / Resilience / Home
    if (s.includes('power') || s.includes('water') || s.includes('freeze') || s.includes('blackout')) {
      return name.includes('signal') || name.includes('freebie') || name.includes('trafficpros') || name.includes('practical') || name.includes('resource') || name.includes('lead');
    }

    // Default fallback
    return name.includes('freebie') || name.includes('signal') || name.includes('lead') || name.includes('resource') || name.includes('trafficpros');
  });

  // If specific filters yielded 0, return all non-aurum valid accounts
  if (eligible.length === 0) {
    return csAccounts.filter((a) => {
      if (a.validity !== 'valid') return false;
      const name = (a.account_name || a.name || '').toLowerCase();
      return !name.includes('aurum') && name !== 'ken davis';
    });
  }

  return eligible;
}

// Advance to next angle and schedule to ContentStudio on full autopilot
async function advanceAndSchedule(slug) {
  const anglesData = loadAngles();
  const offer = anglesData[slug];
  if (!offer) throw new Error(`Offer "${slug}" not found in angles.json`);

  const state = loadState();
  const currentInfo = state[slug] || { currentAngleId: 0, cycle: 1 };

  // Calculate next angle (1 -> 2 -> 3 -> 1)
  let nextAngleId = (currentInfo.currentAngleId || 0) + 1;
  let nextCycle = currentInfo.cycle || 1;
  if (nextAngleId > offer.angles.length) {
    nextAngleId = 1;
    nextCycle += 1;
  }

  const angle = offer.angles.find((a) => a.angleId === nextAngleId);
  console.log(`\n🚀 [Cadence Engine] Advancing ${slug} -> Angle ${nextAngleId}: "${angle.name}" (Cycle ${nextCycle})`);

  // 1. Ensure video exists (render or use category fallback)
  const videoPath = renderAngleVideo(slug, nextAngleId);

  // 2. Determine target channels based on offer
  const csAccounts = await csClient.getConnectedAccounts();
  const eligibleAccounts = getEligibleAccountsForOffer(csAccounts, slug);
  const eligibleIds = eligibleAccounts.map((a) => a.id);
  if (eligibleIds.length === 0) {
    throw new Error(`No eligible ContentStudio channels found for ${slug}`);
  }

  // 3. Calculate next optimal peak time slot (spaced 48 hours after last post)
  let offsetDays = 0;
  if (currentInfo.lastScheduledAt) {
    const lastDate = new Date(currentInfo.lastScheduledAt);
    const now = new Date();
    if (lastDate > now) {
      const diffMs = lastDate.getTime() - now.getTime();
      const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      offsetDays = diffDays + 2;
    }
  }
  const scheduledAt = csClient.getNextOptimalSlot(offsetDays);

  // 4. Schedule post via Postiz (if configured) or fallback to ContentStudio
  let schedRes = null;
  let providerName = 'ContentStudio';

  if (postizClient.isConfigured()) {
    try {
      console.log(`📅 [Postiz] Scheduling via self-hosted Postiz for ${scheduledAt}...`);
      schedRes = await postizClient.schedulePost({
        text: angle.postText,
        videoFilePath: videoPath,
        title: angle.title,
        scheduledAt,
        firstCommentMessage: angle.firstComment,
        projectTag: slug
      });
      providerName = 'Postiz';
    } catch (postizErr) {
      console.warn(`⚠️ [Cadence Engine] Postiz attempt note: ${postizErr.message} (Using ContentStudio fallback)`);
    }
  }

  if (!schedRes) {
    console.log(`📅 [ContentStudio] Scheduling to ${eligibleIds.length} channels for ${scheduledAt}...`);
    schedRes = await csClient.schedulePostWithFirstComment({
      text: angle.postText,
      videoFilePath: videoPath,
      title: angle.title,
      accountIds: eligibleIds,
      scheduledAt,
      firstCommentMessage: angle.firstComment
    });
  }

  // 5. Update state
  state[slug] = {
    currentAngleId: nextAngleId,
    cycle: nextCycle,
    lastScheduledAt: scheduledAt,
    lastPostId: schedRes.data?.id,
    lastPostUrl: schedRes.data?.post_url || (providerName === 'Postiz' ? `${postizClient.POSTIZ_BASE_URL}` : null),
    provider: providerName,
    angleTitle: angle.title
  };
  saveState(state);

  return {
    ok: true,
    slug,
    angleId: nextAngleId,
    angleTitle: angle.title,
    cycle: nextCycle,
    scheduledAt,
    channels: eligibleAccounts.map((a) => `${a.account_name} (${a.platform || a.type})`),
    postUrl: schedRes.data?.post_url
  };
}

// Automatically advance the next queued offer in rotation
async function advanceNextQueuedOffer() {
  const anglesData = loadAngles();
  const slugs = Object.keys(anglesData);
  if (slugs.length === 0) return { ok: false, message: 'No offers registered in angles.json' };

  const state = loadState();

  // Find offer with the oldest lastScheduledAt (or never scheduled)
  let candidateSlug = slugs[0];
  let oldestTime = Infinity;

  for (const s of slugs) {
    const info = state[s];
    if (!info || !info.lastScheduledAt) {
      candidateSlug = s;
      break;
    }
    const t = new Date(info.lastScheduledAt).getTime();
    if (t < oldestTime) {
      oldestTime = t;
      candidateSlug = s;
    }
  }

  console.log(`🎯 [Cadence Engine] Next in line for video angle advance: "${candidateSlug}"`);
  return await advanceAndSchedule(candidateSlug);
}

module.exports = {
  loadAngles,
  loadState,
  saveState,
  renderAngleVideo,
  advanceAndSchedule,
  advanceNextQueuedOffer
};
