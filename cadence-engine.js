// Automated Multi-Angle Video Generation & Cadence Engine
// Rotates across 3 distinct direct-response angles per offer on full autopilot.

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const csClient = require('./contentstudio-client');

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

// Render Commercial MP4 via Remotion CLI
function renderAngleVideo(slug, angleId) {
  const targetMp4 = path.join(VIDEOS_DIR, `${slug}-angle-${angleId}.mp4`);
  if (fs.existsSync(targetMp4)) {
    return targetMp4;
  }

  // If angleId === 1 and master commercial exists, link or copy it
  const masterMp4 = path.join(VIDEOS_DIR, `${slug}-commercial.mp4`);
  if (angleId === 1 && fs.existsSync(masterMp4)) {
    fs.copyFileSync(masterMp4, targetMp4);
    return targetMp4;
  }

  const anglesData = loadAngles();
  const offer = anglesData[slug];
  if (!offer) throw new Error(`Offer "${slug}" not found in angles.json`);
  const angle = offer.angles.find((a) => a.angleId === angleId);
  if (!angle) throw new Error(`Angle ${angleId} not found for "${slug}"`);

  // Ensure audio and captions are generated
  const { audioFile, captionsFile } = generateAudioAndCaptions(slug, angle);

  // Measure audio duration
  const durStr = execSync(
    `ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "${audioFile}"`
  )
    .toString()
    .trim();
  const durSeconds = parseFloat(durStr) || 25;
  const frames = Math.ceil(durSeconds * 30);

  // Map to Composition ID
  let compId = 'BellverCommercial';
  if (slug === 'santa-circle') compId = 'SantaCircleCommercial';
  if (slug === 'yu-sleep') compId = 'YuSleepCommercial';

  // Temporarily swap active voiceover & captions for rendering
  let activeAudioName = 'voiceover.mp3';
  let activeCaptionsName = 'captions.json';
  if (slug === 'santa-circle') {
    activeAudioName = 'santa-voiceover.mp3';
    activeCaptionsName = 'santa-captions.json';
  } else if (slug === 'yu-sleep') {
    activeAudioName = 'yusleep-voiceover.mp3';
    activeCaptionsName = 'yusleep-captions.json';
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
  } finally {
    // Restore original active files
    if (fs.existsSync(backupAudio)) {
      fs.copyFileSync(backupAudio, activeAudioPath);
      fs.unlinkSync(backupAudio);
    }
    if (fs.existsSync(backupCaptions)) {
      fs.copyFileSync(backupCaptions, activeCaptionsPath);
      fs.unlinkSync(backupCaptions);
    }
  }

  return targetMp4;
}

// Advance to next angle and schedule to ContentStudio on full autopilot
async function advanceAndSchedule(slug) {
  const anglesData = loadAngles();
  const offer = anglesData[slug];
  if (!offer) throw new Error(`Offer "${slug}" not found in angles.json`);

  const state = loadState();
  const currentInfo = state[slug] || { currentAngleId: 1, cycle: 1 };

  // Calculate next angle (1 -> 2 -> 3 -> 1)
  let nextAngleId = currentInfo.currentAngleId + 1;
  let nextCycle = currentInfo.cycle;
  if (nextAngleId > offer.angles.length) {
    nextAngleId = 1;
    nextCycle += 1;
  }

  const angle = offer.angles.find((a) => a.angleId === nextAngleId);
  console.log(`\n🚀 [Cadence Engine] Advancing ${slug} -> Angle ${nextAngleId}: "${angle.name}" (Cycle ${nextCycle})`);

  // 1. Ensure video exists (render if needed)
  const videoPath = renderAngleVideo(slug, nextAngleId);

  // 2. Determine target channels based on offer
  const csAccounts = await csClient.getConnectedAccounts();
  const eligibleAccounts = csAccounts.filter((a) => {
    if (a.validity !== 'valid') return false;
    const name = (a.account_name || a.name || '').toLowerCase();
    if (name.includes('aurum')) return false;
    if (name === 'ken davis') return false;

    if (slug === 'santa-circle') {
      return (
        name.includes('storytime') ||
        name.includes('erica') ||
        name.includes('freebie') ||
        name.includes('everyday')
      );
    } else if (slug === 'bellver-card') {
      return (
        name.includes('walletwise') ||
        name.includes('market ranger') ||
        name.includes('marketranger')
      );
    } else if (slug === 'yu-sleep') {
      return (
        name.includes('everyday mind') ||
        name.includes('freebie') ||
        name.includes('marketing resource')
      );
    }
    return false;
  });

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

  // 4. Schedule post to ContentStudio with friendly first-comment link
  console.log(`📅 [ContentStudio] Scheduling to ${eligibleIds.length} channels for ${scheduledAt}...`);
  const schedRes = await csClient.schedulePostWithFirstComment({
    text: angle.postText,
    videoFilePath: videoPath,
    title: angle.title,
    accountIds: eligibleIds,
    scheduledAt,
    firstCommentMessage: angle.firstComment
  });

  // 5. Update state
  state[slug] = {
    currentAngleId: nextAngleId,
    cycle: nextCycle,
    lastScheduledAt: scheduledAt,
    lastPostId: schedRes.data?.id,
    lastPostUrl: schedRes.data?.post_url
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

module.exports = {
  loadAngles,
  loadState,
  saveState,
  renderAngleVideo,
  advanceAndSchedule
};
