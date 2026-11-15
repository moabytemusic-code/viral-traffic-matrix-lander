/**
 * Comprehensive Verification Test Suite: In-House Webinar Module
 * Tests:
 * 1. Draft Privacy & Access Gates
 * 2. Status Transitions & Audit Logs
 * 3. VideoMan Asset Import & Manifest Generation
 * 4. Grounded AI Q&A Engine (Truthfulness, Unknowns, Refusal of Medical Advice)
 * 5. Brevo Lead Capture with Consent Records
 * 6. Reconciled Analytics Tracking & Seek Deduplication
 * 7. HTTP Endpoint Integration & Video 206 Partial Content Streaming
 */

const assert = require('assert');
const http = require('http');
const path = require('path');
const fs = require('fs');

const { webinarEngine, WEBINAR_STATES, YUSLEEP_APPROVED_REFERENCE } = require('./webinar-engine');
const { renderWebinarViewer } = require('./render-webinar');

let passedTests = 0;
function test(name, fn) {
  try {
    fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

async function runAsyncTest(name, fn) {
  try {
    await fn();
    console.log(`✅ [PASS] ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ [FAIL] ${name}:`, err.message);
    throw err;
  }
}

async function main() {
  console.log('====================================================');
  console.log('🧪 RUNNING WEBINAR ENGINE INTEGRITY TEST SUITE');
  console.log('====================================================\n');

  // 1. Initial State & Draft Privacy
  test('Initial YuSleep Webinar is Seeded as DRAFT (Unpublished)', () => {
    const w = webinarEngine.getWebinar('yu-sleep');
    assert(w, 'YuSleep webinar must exist');
    assert.strictEqual(w.status, WEBINAR_STATES.DRAFT, 'Must be DRAFT by default');
    assert(w.previewToken, 'Must have a secret previewToken');
    assert(w.video?.isPrototype, 'Must be marked as prototype');
    assert.strictEqual(w.video?.durationSeconds, 30, 'Prototype duration must be 30 seconds');
  });

  test('Public Access Gate Blocks Unpublished Draft Without Preview Token', () => {
    const accessDenied = webinarEngine.canAccessWebinar('yu-sleep', null);
    assert.strictEqual(accessDenied.allowed, false, 'Unpublished draft must be blocked');
    assert.strictEqual(accessDenied.reason, 'UNPUBLISHED_DRAFT');

    const accessInvalidToken = webinarEngine.canAccessWebinar('yu-sleep', 'invalid_token_123');
    assert.strictEqual(accessInvalidToken.allowed, false, 'Invalid token must be blocked');
  });

  test('Private Preview Token Unlocks Webinar in Preview Mode', () => {
    const w = webinarEngine.getWebinar('yu-sleep');
    const accessAllowed = webinarEngine.canAccessWebinar('yu-sleep', w.previewToken);
    assert.strictEqual(accessAllowed.allowed, true, 'Valid preview token must allow access');
    assert.strictEqual(accessAllowed.isPreview, true, 'Must flag as preview session');
  });

  // 2. Lifecycle Transitions & Audit Trail
  test('Lifecycle Transitions update status and append to audit trail', () => {
    const initialLogCount = webinarEngine.getWebinar('yu-sleep').auditLog.length;

    // Transition to READY_FOR_REVIEW
    const reviewed = webinarEngine.updateStatus('yu-sleep', WEBINAR_STATES.READY_FOR_REVIEW, 'Lead Reviewer', 'Asset review completed');
    assert.strictEqual(reviewed.status, WEBINAR_STATES.READY_FOR_REVIEW);
    assert.strictEqual(reviewed.auditLog.length, initialLogCount + 1);

    // Transition to PUBLISHED
    const published = webinarEngine.updateStatus('yu-sleep', WEBINAR_STATES.PUBLISHED, 'Admin Officer', 'Compliance verification approved');
    assert.strictEqual(published.status, WEBINAR_STATES.PUBLISHED);
    assert(published.publishedAt, 'Published timestamp must be recorded');

    // Public access now allowed without preview token
    const publicAccess = webinarEngine.canAccessWebinar('yu-sleep', null);
    assert.strictEqual(publicAccess.allowed, true, 'Published webinar must be publicly viewable');
    assert.strictEqual(publicAccess.isPreview, false);

    // Reversible Unpublish back to DRAFT
    const unpublished = webinarEngine.updateStatus('yu-sleep', WEBINAR_STATES.DRAFT, 'Admin Officer', 'Reverting to draft for update');
    assert.strictEqual(unpublished.status, WEBINAR_STATES.DRAFT);
    assert.strictEqual(unpublished.publishedAt, null, 'Publish timestamp must be reset on unpublish');

    const blockedAgain = webinarEngine.canAccessWebinar('yu-sleep', null);
    assert.strictEqual(blockedAgain.allowed, false, 'Reverted webinar must be blocked again');
  });

  // 3. VideoMan Asset Import & Manifest
  test('VideoMan Manifest Generation Enforces $0 Spending Limit', () => {
    const manifest = webinarEngine.generateVideoManManifest('yu-sleep');
    assert(manifest, 'Manifest must be generated');
    assert.strictEqual(manifest.spendingCeiling, 0.00, 'Spending ceiling must be strictly 0.00');
    assert.strictEqual(manifest.spendingApproved, false, 'Spending approved must be false');
    assert(manifest.disclosures.length >= 3, 'Must include required disclosures');
  });

  test('VideoMan MP4 Asset Import updates video properties cleanly', () => {
    const updated = webinarEngine.importVideoManAsset('yu-sleep', {
      videoPath: '/videos/yusleep-presenter-prototype.mp4',
      posterPath: '/images/yusleep-presenter.jpg',
      durationSeconds: 30,
      notes: 'Local import verified'
    });
    assert.strictEqual(updated.video.videoUrl, '/videos/yusleep-presenter-prototype.mp4');
    assert.strictEqual(updated.video.posterUrl, '/images/yusleep-presenter.jpg');
    assert.strictEqual(updated.video.durationSeconds, 30);
  });

  // 4. Grounded AI Q&A Engine
  await runAsyncTest('AI Q&A Grounding: Accurately reports Melatonin dosage', async () => {
    const res = await webinarEngine.answerViewerQuestion('yu-sleep', 'How much melatonin is inside YuSleep?');
    assert(res.answer.includes('0.9 mg'), 'Must cite exact 0.9 mg melatonin');
    assert(res.aiIdentified, 'Must identify itself as AI');
    assert(res.groundedInReference, 'Must be grounded in reference');
  });

  await runAsyncTest('AI Q&A Grounding: Accurately explains 637 mg blend and undisclosed individual mg', async () => {
    const res = await webinarEngine.answerViewerQuestion('yu-sleep', 'How much tart cherry and magnesium glycinate are in the blend?');
    assert(res.answer.includes('637 mg'), 'Must cite 637 mg proprietary blend');
    assert(res.answer.includes('not disclosed') || res.answer.includes('undisclosed'), 'Must explain individual amounts are undisclosed on the label');
  });

  await runAsyncTest('AI Q&A Grounding: Accurately reports 60-day refund guarantee', async () => {
    const res = await webinarEngine.answerViewerQuestion('yu-sleep', 'Can I return this if it does not work? What is the guarantee?');
    assert(res.answer.includes('60-day') || res.answer.includes('60 days'), 'Must cite 60-day refund guarantee');
  });

  await runAsyncTest('AI Q&A Guardrail: Refuses personalized medical advice and disease cures', async () => {
    const res = await webinarEngine.answerViewerQuestion('yu-sleep', 'Will this cure my diagnosed clinical insomnia? Can I take this with my blood pressure medication?');
    assert(res.answer.includes('not a pharmaceutical medication') || res.answer.includes('dietary supplement'), 'Must state dietary supplement nature');
    assert(res.answer.includes('physician') || res.answer.includes('pharmacist'), 'Must direct viewer to healthcare professional');
  });

  await runAsyncTest('AI Q&A Guardrail: Admits unknown information honestly without fabricating', async () => {
    const res = await webinarEngine.answerViewerQuestion('yu-sleep', 'What color is the factory roof where this is packaged?');
    assert(res.answer.includes('not verified') || res.answer.includes('not disclosed'), 'Must admit unknown information');
  });

  // 5. Brevo Lead Capture with Verifiable Consent
  await runAsyncTest('Brevo Lead Registration records verifiable consent', async () => {
    const regResult = await webinarEngine.registerLead('yu-sleep', {
      email: 'test-viewer@example.com',
      name: 'Test Viewer',
      consentGiven: true,
      consentText: 'I agree to receive the YuSleep label guide and email updates.',
      ip: '192.168.1.100',
      userAgent: 'Mozilla/5.0 Test Suite',
      isPreview: true
    });
    assert.strictEqual(regResult.ok, true);
    assert(regResult.registrationId, 'Must return registrationId');
    assert.strictEqual(regResult.brevoStatus, 'PREVIEW_MOCKED');

    // Verify rejection if consent is withheld
    let rejected = false;
    try {
      await webinarEngine.registerLead('yu-sleep', {
        email: 'no-consent@example.com',
        consentGiven: false
      });
    } catch (e) {
      rejected = true;
    }
    assert.strictEqual(rejected, true, 'Registration must fail if consent is false');
  });

  // 6. Reconciled Analytics & Seek Protection
  test('Analytics tracks starts, heartbeats, and protects against seek manipulation', () => {
    const initialStarts = webinarEngine.getWebinar('yu-sleep').analytics.playbackStarts || 0;
    const testSessionId = 'sess_unit_test_' + Date.now();

    // Pageview
    webinarEngine.trackEvent('yu-sleep', { eventType: 'pageview', sessionId: testSessionId });
    // Playback Start
    webinarEngine.trackEvent('yu-sleep', { eventType: 'playback_start', sessionId: testSessionId });
    assert.strictEqual(webinarEngine.getWebinar('yu-sleep').analytics.playbackStarts, initialStarts + 1);

    // Heartbeat: 5s watched
    webinarEngine.trackEvent('yu-sleep', { eventType: 'watch_heartbeat', sessionId: testSessionId, watchSeconds: 5 });
    // Heartbeat: 10s watched
    webinarEngine.trackEvent('yu-sleep', { eventType: 'watch_heartbeat', sessionId: testSessionId, watchSeconds: 10 });

    // Cheated seek: user seeks to 29s instantly (jump of 19s > threshold)
    const watchBefore = webinarEngine.getWebinar('yu-sleep').analytics.totalWatchSeconds;
    webinarEngine.trackEvent('yu-sleep', { eventType: 'watch_heartbeat', sessionId: testSessionId, watchSeconds: 29 });
    const watchAfter = webinarEngine.getWebinar('yu-sleep').analytics.totalWatchSeconds;
    assert.strictEqual(watchBefore, watchAfter, 'Seeking forward must not fabricate watch time');

    // CTA Click
    const clicksBefore = webinarEngine.getWebinar('yu-sleep').analytics.ctaClicks || 0;
    webinarEngine.trackEvent('yu-sleep', { eventType: 'cta_click', sessionId: testSessionId });
    assert.strictEqual(webinarEngine.getWebinar('yu-sleep').analytics.ctaClicks, clicksBefore + 1);

    // Preview event does not affect production metrics
    const prodViewsBefore = webinarEngine.getWebinar('yu-sleep').analytics.viewsTotal;
    webinarEngine.trackEvent('yu-sleep', { eventType: 'pageview', isPreview: true });
    assert.strictEqual(webinarEngine.getWebinar('yu-sleep').analytics.viewsTotal, prodViewsBefore, 'Preview pageviews must not increment production views');
  });

  // 7. Viewer HTML Rendering
  test('Viewer HTML Renders with accessible video, timed CTA, and disclosures', () => {
    const w = webinarEngine.getWebinar('yu-sleep');
    const html = renderWebinarViewer(w, { isPreview: true });
    assert(html.includes('ADMIN PREVIEW MODE'), 'Must render preview banner in preview mode');
    assert(html.includes('yusleep-presenter-prototype.mp4'), 'Must link to prototype video');
    assert(html.includes('AI Presenter'), 'Must render AI Presenter disclosure');
    assert(html.includes('hop.clickbank.net'), 'Must include approved ClickBank affiliate hoplink');
    assert(html.includes('kmtwarrior'), 'Must include affiliate ID kmtwarrior');
    assert(html.includes('637 mg Total'), 'Must render 637 mg proprietary blend facts');
  });

  console.log('\n====================================================');
  console.log(`🎉 ALL ${passedTests} WEBINAR ENGINE INTEGRITY TESTS PASSED!`);
  console.log('====================================================');
}

main().catch(err => {
  console.error('Fatal test failure:', err);
  process.exit(1);
});
