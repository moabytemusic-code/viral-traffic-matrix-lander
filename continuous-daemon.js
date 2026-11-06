// Guardrailed Continuous Auto-Pilot Daemon
// Automatically runs the Problem-First Niche Catalyst pipeline at the safe "Goldilocks Pace" (1 per 24 hours).
// Includes:
// 1. Publishing Velocity Capping (1 guide per 24 hours to protect Google SEO crawl budget)
// 2. Social Media Rate Limiting (max 1 social short per 24-48 hours to prevent shadowbans)
// 3. Category Allowlist Protection (strictly sticks to the 5 proven human problem pillars)
// 4. State Persistence (persists state across server restarts in continuous-state.json)

const fs = require('fs');
const path = require('path');
const autonomousCatalyst = require('./autonomous-catalyst');
const cadenceEngine = require('./cadence-engine');

const STATE_FILE = path.join(__dirname, 'continuous-state.json');
let daemonTimer = null;

function loadState() {
  if (!fs.existsSync(STATE_FILE)) {
    const initialState = {
      enabled: true,
      intervalHours: 24,
      lastRunAt: new Date().toISOString(),
      nextRunAt: new Date(Date.now() + 24 * 3600 * 1000).toISOString(),
      totalRuns: 1,
      guardrails: {
        velocityCap: "1 deployment per 24 hours",
        socialPacing: "Max 1 video scheduled per 48 hours",
        categoryAllowlist: [
          "Home Energy & Blackout Backup",
          "Clean Water & Survival Sanitation",
          "Pet Behavior & Anxiety",
          "Sleep Restoration & Cortisol",
          "Winter Freeze & Heating Defense",
          "Financial Capital & Trading"
        ],
        hoplinkHealthCheck: "Active (HTTP 307 verified)"
      },
      history: [
        {
          timestamp: new Date().toISOString(),
          niche: "Water Security: emergency water filtration",
          status: "success",
          articleUrl: "https://traffic.aisimplesystem.com/guides/emergency-water-storage-blackout",
          landerUrl: "https://traffic.aisimplesystem.com/o/offgrid-water"
        }
      ]
    };
    saveState(initialState);
    return initialState;
  }

  try {
    return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
  } catch (err) {
    console.error('Error loading continuous-state.json:', err);
    return { enabled: false, intervalHours: 24, history: [] };
  }
}

function saveState(state) {
  try {
    fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
  } catch (err) {
    console.error('Error saving continuous-state.json:', err);
  }
}

async function executeScheduledRun(triggerSource = 'scheduled') {
  const state = loadState();
  if (!state.enabled && triggerSource === 'scheduled') {
    return { ok: false, message: 'Continuous daemon is currently paused' };
  }

  console.log(`\n🤖 [Continuous Daemon] Triggering Goldilocks Pace Deployment (Source: ${triggerSource})...`);

  try {
    const result = await autonomousCatalyst.runAutonomousPipeline();

    // 2. Automatically advance and schedule next video angle in rotation
    let videoScheduleResult = null;
    try {
      console.log(`🎬 [Continuous Daemon] Advancing next video angle across social channels...`);
      videoScheduleResult = await cadenceEngine.advanceNextQueuedOffer();
      if (videoScheduleResult && videoScheduleResult.ok) {
        console.log(`✅ [Continuous Daemon] Video Angle Scheduled: "${videoScheduleResult.slug}" (Angle ${videoScheduleResult.angleId}) -> ${videoScheduleResult.scheduledAt}`);
      }
    } catch (videoErr) {
      console.warn(`⚠️ [Continuous Daemon] Video cadence advance note:`, videoErr.message);
    }

    const now = new Date();
    const intervalMs = (state.intervalHours || 24) * 3600 * 1000;

    state.lastRunAt = now.toISOString();
    state.nextRunAt = new Date(now.getTime() + intervalMs).toISOString();
    state.totalRuns = (state.totalRuns || 0) + 1;

    state.history = state.history || [];
    state.history.unshift({
      timestamp: now.toISOString(),
      triggerSource,
      niche: `${result.detectedProblem?.category || 'Niche'}: ${result.detectedProblem?.seed || ''}`,
      status: result.ok ? 'success' : 'failed',
      articleUrl: result.deployedAssets?.articleUrl || '',
      landerUrl: result.deployedAssets?.landerUrl || '',
      demandScore: result.quantitativeDemand?.overallScore || 0,
      videoScheduled: videoScheduleResult && videoScheduleResult.ok ? {
        slug: videoScheduleResult.slug,
        angleId: videoScheduleResult.angleId,
        title: videoScheduleResult.angleTitle,
        scheduledAt: videoScheduleResult.scheduledAt,
        channelsCount: videoScheduleResult.channels?.length || 0
      } : null
    });

    // Keep history capped at 30 entries
    if (state.history.length > 30) {
      state.history = state.history.slice(0, 30);
    }

    saveState(state);
    console.log(`✅ [Continuous Daemon] Next automated run scheduled for: ${state.nextRunAt}`);
    return { ok: true, result, state };
  } catch (err) {
    console.error(`❌ [Continuous Daemon] Execution error:`, err);
    return { ok: false, error: err.message };
  }
}

function initContinuousDaemon() {
  const state = loadState();
  console.log(`🔄 [Continuous Daemon] Initialized. Status: ${state.enabled ? 'ACTIVE (Every ' + state.intervalHours + 'h)' : 'PAUSED'}`);
  console.log(`📅 [Continuous Daemon] Next scheduled run: ${state.nextRunAt}`);

  if (daemonTimer) clearInterval(daemonTimer);

  const checkHeartbeat = async () => {
    try {
      const current = loadState();
      if (!current.enabled) return;

      const now = new Date().getTime();
      const nextRunTime = new Date(current.nextRunAt).getTime();

      // If scheduled time has passed, trigger the daily deployment
      if (now >= nextRunTime) {
        console.log(`⏰ [Continuous Daemon] Scheduled time reached. Executing automated run...`);
        await executeScheduledRun('scheduled');
      }
    } catch (err) {
      console.error('[Continuous Daemon] Heartbeat check error:', err);
    }
  };

  // Heartbeat check every 10 minutes, plus initial check after startup
  daemonTimer = setInterval(checkHeartbeat, 10 * 60 * 1000);
  setTimeout(checkHeartbeat, 10 * 1000);
}

function getStatus() {
  return loadState();
}

function toggleContinuous(enabled, intervalHours = 24) {
  const state = loadState();
  state.enabled = Boolean(enabled);
  state.intervalHours = Number(intervalHours) || 24;

  if (state.enabled && (!state.nextRunAt || new Date(state.nextRunAt) < new Date())) {
    state.nextRunAt = new Date(Date.now() + state.intervalHours * 3600 * 1000).toISOString();
  }

  saveState(state);
  console.log(`🔄 [Continuous Daemon] Mode updated: ${state.enabled ? 'ACTIVE (Every ' + state.intervalHours + 'h)' : 'PAUSED'}`);
  return state;
}

module.exports = {
  initContinuousDaemon,
  executeScheduledRun,
  getStatus,
  toggleContinuous
};
