/**
 * Comprehensive Isolated Unit & Integration Tests for Hardened WebinarEngine (v2)
 * Uses temporary directories (fs.mkdtempSync) so tests never mutate workspace files
 * or make external network calls.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { WebinarEngine, WEBINAR_STATES, getYuSleepApprovedReference } = require('./webinar-engine');

async function runTests() {
  console.log('=== Running Hardened WebinarEngine Test Suite ===\n');

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'webinar-engine-test-'));
  const ADMIN_TOKEN = 'test-admin-secret-token-999';
  const VIEWER_TOKEN = 'test-viewer-readonly-token-111';
  const SESSION_SECRET = 'test-hmac-session-secret-key-222';

  try {
    const engine = new WebinarEngine({
      dataDir: tmpRoot,
      adminToken: ADMIN_TOKEN,
      viewerToken: VIEWER_TOKEN,
      sessionSecret: SESSION_SECRET,
      brevoLiveEnabled: false
    });

    // ---------------------------------------------------------
    // 1. Admin Auth & Role / Permission Enforcement + CSRF
    // ---------------------------------------------------------
    console.log('1. Testing Admin Authentication, Role Authorization & CSRF...');
    const unauthRes = engine.authenticateAdminRequest({ method: 'GET', headers: {} }, 'webinar:read');
    assert.strictEqual(unauthRes.authenticated, false);
    assert.strictEqual(unauthRes.authorized, false);
    assert.strictEqual(unauthRes.statusCode, 401);

    const viewerReadRes = engine.authenticateAdminRequest(
      { method: 'GET', headers: { authorization: `Bearer ${VIEWER_TOKEN}` } },
      'webinar:read'
    );
    assert.strictEqual(viewerReadRes.authenticated, true);
    assert.strictEqual(viewerReadRes.authorized, true);
    assert.strictEqual(viewerReadRes.role, 'auditor_readonly');

    const viewerWriteRes = engine.authenticateAdminRequest(
      { method: 'POST', headers: { authorization: `Bearer ${VIEWER_TOKEN}` } },
      'webinar:write'
    );
    assert.strictEqual(viewerWriteRes.authenticated, true);
    assert.strictEqual(viewerWriteRes.authorized, false);
    assert.strictEqual(viewerWriteRes.statusCode, 403);

    const adminWriteRes = engine.authenticateAdminRequest(
      { method: 'POST', headers: { authorization: `Bearer ${ADMIN_TOKEN}` } },
      'webinar:publish'
    );
    assert.strictEqual(adminWriteRes.authenticated, true);
    assert.strictEqual(adminWriteRes.authorized, true);
    assert.strictEqual(adminWriteRes.role, 'admin');
    assert.strictEqual(adminWriteRes.actorId, 'admin:primary');

    // Cookie session + CSRF enforcement
    const sess = engine.createAdminSession(ADMIN_TOKEN);
    assert.ok(sess && sess.sessionId && sess.csrfToken);

    const cookieNoCsrf = engine.authenticateAdminRequest(
      {
        method: 'POST',
        headers: { cookie: `webinar_admin_session=${sess.sessionId}` }
      },
      'webinar:write'
    );
    assert.strictEqual(cookieNoCsrf.authorized, false);
    assert.strictEqual(cookieNoCsrf.statusCode, 403);

    const cookieCrossOrigin = engine.authenticateAdminRequest(
      {
        method: 'POST',
        headers: {
          cookie: `webinar_admin_session=${sess.sessionId}`,
          'x-csrf-token': sess.csrfToken,
          host: 'traffic.aisimplesystem.com',
          origin: 'https://evil.example.com'
        }
      },
      'webinar:write'
    );
    assert.strictEqual(cookieCrossOrigin.authorized, false);
    assert.strictEqual(cookieCrossOrigin.statusCode, 403);

    const cookieValid = engine.authenticateAdminRequest(
      {
        method: 'POST',
        headers: {
          cookie: `webinar_admin_session=${sess.sessionId}`,
          'x-csrf-token': sess.csrfToken,
          host: 'traffic.aisimplesystem.com',
          origin: 'https://traffic.aisimplesystem.com'
        }
      },
      'webinar:write'
    );
    assert.strictEqual(cookieValid.authenticated, true);
    assert.strictEqual(cookieValid.authorized, true);
    assert.strictEqual(cookieValid.actorId, 'admin:primary');
    console.log('   [PASS] Admin auth (401), viewer role check (403), and cookie CSRF protection verified.');

    // ---------------------------------------------------------
    // 2. Corrected YuSleep Supplement Facts Reference Ground Truth
    // ---------------------------------------------------------
    console.log('2. Testing Corrected YuSleep Supplement Facts Reference...');
    const ref = getYuSleepApprovedReference();
    const b2 = ref.labelDisclosedIngredients.find(f => f.name.includes('B2'));
    const b6 = ref.labelDisclosedIngredients.find(f => f.name.includes('B6'));
    const mel = ref.labelDisclosedIngredients.find(f => f.name.includes('Melatonin'));
    const blend = ref.labelDisclosedIngredients.find(f => f.name.includes('Proprietary Blend'));

    assert.strictEqual(b2.amount, '0.5 mg');
    assert.strictEqual(b2.dailyValue, '38%');
    assert.strictEqual(b6.amount, '0.5 mg');
    assert.strictEqual(b6.dailyValue, '29%');
    assert.strictEqual(mel.amount, '0.9 mg');
    assert.strictEqual(blend.amount, '637 mg');
    assert.ok(ref.manufacturer.entity.includes("For Women's Health LLC"));
    assert.ok(ref.clinicalEvidence.statement.includes('We have not verified independent clinical evidence for the finished formula.'));
    assert.strictEqual(ref.pricingAndPackages.verificationStatus, 'UNVERIFIED_REQUIRES_CURRENT_MERCHANT_CHECK');
    assert.strictEqual(ref.refundPolicy.verificationStatus, 'UNVERIFIED_REQUIRES_CURRENT_MERCHANT_CHECK');
    console.log('   [PASS] YuSleep label amounts (0.5 mg B2/38%, 0.5 mg B6/29%, 0.9 mg melatonin, 637 mg blend) verified.');

    // ---------------------------------------------------------
    // 3. Draft Access Blocked Publicly & Scoped Expiring Revocable Previews
    // ---------------------------------------------------------
    console.log('3. Testing Public Draft Block & Scoped Expiring Revocable Previews...');
    const noTokenAccess = engine.resolveViewerPageAccess('yu-sleep', null);
    assert.strictEqual(noTokenAccess.allowed, false);
    assert.strictEqual(noTokenAccess.statusCode, 403);

    const wrongTokenAccess = engine.resolveViewerPageAccess('yu-sleep', 'wrong_token_xyz');
    assert.strictEqual(wrongTokenAccess.allowed, false);

    // Create a second draft webinar to test cross-slug scoping
    await engine.saveWebinar({
      slug: 'other-webinar',
      internalTitle: 'Second Test Webinar',
      headline: 'Second Webinar Draft Headline'
    }, 'admin:test');

    const preview1 = await engine.createPreviewLink('yu-sleep', { ttlSeconds: 1800 }, 'admin:test');
    assert.ok(preview1.previewToken && preview1.previewToken.startsWith('prev_'));

    // Valid token works for yu-sleep
    const validPreviewAccess = engine.resolveViewerPageAccess('yu-sleep', preview1.previewToken);
    assert.strictEqual(validPreviewAccess.allowed, true);
    assert.strictEqual(validPreviewAccess.isPreview, true);
    assert.strictEqual(validPreviewAccess.mode, 'preview');
    assert.ok(validPreviewAccess.viewerContextToken);

    // Token for yu-sleep MUST NOT work for other-webinar (scope enforcement)
    const crossSlugAccess = engine.resolveViewerPageAccess('other-webinar', preview1.previewToken);
    assert.strictEqual(crossSlugAccess.allowed, false);

    // Public serialization must never include previewLinks or draft when unpublished
    const rawWebinar = engine.getWebinar('yu-sleep');
    assert.strictEqual(engine.serializeForPublic(rawWebinar), null);

    // Admin serialization must never include raw previewToken
    const adminSerialized = engine.getWebinarForAdmin('yu-sleep');
    const serializedJson = JSON.stringify(adminSerialized);
    assert.strictEqual(serializedJson.includes(preview1.previewToken), false, 'Admin GET response must not leak raw preview token');

    // Viewer API (/track, /register, /qa) with client-forged isPreview:true but NO valid viewerContextToken must fail on draft
    await assert.rejects(
      async () => {
        await engine.trackEvent('yu-sleep', { eventType: 'pageview', isPreview: true, sessionId: 'forged_sess' }, { viewerContextToken: '' });
      },
      (err) => err.statusCode === 403
    );

    await assert.rejects(
      async () => {
        await engine.answerViewerQuestion('yu-sleep', 'How much melatonin?', { viewerContextToken: '' });
      },
      (err) => err.statusCode === 403
    );

    // Revoking preview link immediately blocks page access and invalidates previously issued viewerContextToken
    await engine.revokePreviewLink('yu-sleep', { tokenId: preview1.tokenId }, 'admin:test');
    const revokedAccess = engine.resolveViewerPageAccess('yu-sleep', preview1.previewToken);
    assert.strictEqual(revokedAccess.allowed, false);

    await assert.rejects(
      async () => {
        await engine.trackEvent('yu-sleep', { eventType: 'pageview' }, {
          viewerContextToken: validPreviewAccess.viewerContextToken
        });
      },
      (err) => err.statusCode === 403
    );

    // Expired preview link is rejected
    const previewShort = await engine.createPreviewLink('yu-sleep', { ttlSeconds: 120 }, 'admin:test');
    const wRecord = engine.getWebinar('yu-sleep');
    const shortLinkEntry = wRecord.previewLinks.find(pl => pl.tokenId === previewShort.tokenId);
    shortLinkEntry.expiresAt = new Date(Date.now() - 10000).toISOString();
    const expiredAccess = engine.resolveViewerPageAccess('yu-sleep', previewShort.previewToken);
    assert.strictEqual(expiredAccess.allowed, false);
    console.log('   [PASS] Scoped, expiring, revocable preview tokens and viewerContextToken verification passed.');

    // ---------------------------------------------------------
    // 4. Draft vs. Published Snapshot Isolation & Revision Approval Gate
    // ---------------------------------------------------------
    console.log('4. Testing Draft vs. Published Snapshot Separation & Revision Approval...');
    // Publishing without approval must fail
    await assert.rejects(
      async () => {
        await engine.transitionWebinarState('yu-sleep', { action: 'PUBLISH' }, 'admin:test');
      },
      (err) => err.statusCode === 409 && err.message.includes('Approval is required')
    );

    // Approve current draft revision (#1)
    await engine.transitionWebinarState('yu-sleep', { action: 'APPROVE', note: 'Approved rev 1' }, 'admin:test');
    let wAfterApprove = engine.getWebinar('yu-sleep');
    assert.strictEqual(wAfterApprove.status, WEBINAR_STATES.APPROVED);
    assert.strictEqual(wAfterApprove.approval.approvedRevision, 1);

    // Publish approved revision #1
    await engine.transitionWebinarState('yu-sleep', { action: 'PUBLISH', note: 'Publishing rev 1' }, 'admin:test');
    let wPublished = engine.getWebinar('yu-sleep');
    assert.strictEqual(wPublished.status, WEBINAR_STATES.PUBLISHED);
    assert.strictEqual(wPublished.publishedSnapshot.revision, 1);
    const liveHeadlineRev1 = wPublished.publishedSnapshot.headline;

    // Public serialization now returns published fields without previewLinks or draft
    const pubSerialized = engine.serializeForPublic(wPublished);
    assert.ok(pubSerialized);
    assert.strictEqual(pubSerialized.headline, liveHeadlineRev1);
    assert.strictEqual(pubSerialized.previewLinks, undefined);
    assert.strictEqual(pubSerialized.draft, undefined);
    assert.strictEqual(pubSerialized.auditLog, undefined);

    // Edit the webinar while it is PUBLISHED -> updates draft to Rev #2, does NOT mutate publishedSnapshot Rev #1
    await engine.saveWebinar({
      slug: 'yu-sleep',
      headline: 'DRAFT REVISION 2 UNAPPROVED HEADLINE',
      reference: {
        servingDetails: {
          servingSize: '4 mL (Experimental Draft Dose)'
        }
      }
    }, 'admin:editor');

    const wAfterEdit = engine.getWebinar('yu-sleep');
    assert.strictEqual(wAfterEdit.status, WEBINAR_STATES.PUBLISHED);
    assert.strictEqual(wAfterEdit.draft.revision, 2);
    assert.strictEqual(wAfterEdit.draft.headline, 'DRAFT REVISION 2 UNAPPROVED HEADLINE');
    assert.strictEqual(wAfterEdit.publishedSnapshot.revision, 1);
    assert.strictEqual(wAfterEdit.publishedSnapshot.headline, liveHeadlineRev1);
    assert.strictEqual(wAfterEdit.approval.approvedRevision, null, 'Editing draft must invalidate prior approval');

    // Public viewer sees Published Snapshot Rev #1 (not Draft Rev #2)
    const pubViewer = engine.resolveViewerPageAccess('yu-sleep', null);
    assert.strictEqual(pubViewer.allowed, true);
    assert.strictEqual(pubViewer.isPreview, false);
    assert.strictEqual(pubViewer.snapshot.headline, liveHeadlineRev1);
    assert.strictEqual(pubViewer.snapshot.reference.servingDetails.servingSize, '2 mL (2 full droppers)');

    // Preview viewer with valid preview token sees Draft Rev #2
    const previewRev2 = await engine.createPreviewLink('yu-sleep', { ttlSeconds: 1800 }, 'admin:editor');
    const prevViewer = engine.resolveViewerPageAccess('yu-sleep', previewRev2.previewToken);
    assert.strictEqual(prevViewer.allowed, true);
    assert.strictEqual(prevViewer.isPreview, true);
    assert.strictEqual(prevViewer.snapshot.headline, 'DRAFT REVISION 2 UNAPPROVED HEADLINE');
    assert.strictEqual(prevViewer.snapshot.reference.servingDetails.servingSize, '4 mL (Experimental Draft Dose)');

    // Publishing Draft Rev #2 without approving Rev #2 first must fail
    await assert.rejects(
      async () => {
        await engine.transitionWebinarState('yu-sleep', { action: 'PUBLISH' }, 'admin:editor');
      },
      (err) => err.statusCode === 409 && err.message.includes('Approval is required')
    );
    console.log('   [PASS] Draft vs. Published snapshot isolation and revision approval gate verified.');

    // ---------------------------------------------------------
    // 5. Reference-Driven FAQ Assistant (Dynamic Reference Updates, Multi-Part, Medical Refusal)
    // ---------------------------------------------------------
    console.log('5. Testing Reference-Driven FAQ Assistant...');
    // Public viewer asks about serving size -> gets Published Snapshot Rev #1 ('2 mL (2 full droppers)')
    const qaPublicServing = await engine.answerViewerQuestion('yu-sleep', 'What is the serving size?', {
      viewerContextToken: pubViewer.viewerContextToken,
      ip: '10.0.0.1'
    });
    assert.ok(qaPublicServing.answer.includes('2 mL (2 full droppers)'));
    assert.strictEqual(qaPublicServing.llmEnabled, false);

    // Preview viewer asks about serving size -> gets Draft Rev #2 ('4 mL (Experimental Draft Dose)')
    const qaPreviewServing = await engine.answerViewerQuestion('yu-sleep', 'What is the serving size?', {
      viewerContextToken: prevViewer.viewerContextToken,
      ip: '10.0.0.2'
    });
    assert.ok(qaPreviewServing.answer.includes('4 mL (Experimental Draft Dose)'));

    // Multi-part question: Vitamin B6 + Refund Policy
    const qaMulti = await engine.answerViewerQuestion(
      'yu-sleep',
      'How much Vitamin B6 is in each serving and what is the refund policy?',
      { viewerContextToken: pubViewer.viewerContextToken, ip: '10.0.0.3' }
    );
    assert.ok(qaMulti.answer.includes('0.5 mg'));
    assert.ok(qaMulti.answer.includes('29%'));
    assert.ok(qaMulti.answer.includes('not verified in this static reference'));

    // Clinical evidence question
    const qaClinical = await engine.answerViewerQuestion(
      'yu-sleep',
      'Is this clinically proven in clinical trials?',
      { viewerContextToken: pubViewer.viewerContextToken, ip: '10.0.0.4' }
    );
    assert.ok(qaClinical.answer.includes('We have not verified independent clinical evidence for the finished formula.'));

    // Medical advice / contraindication refusal
    const qaMedical = await engine.answerViewerQuestion(
      'yu-sleep',
      'Can I take this while pregnant or with my prescription antidepressant medication?',
      { viewerContextToken: pubViewer.viewerContextToken, ip: '10.0.0.5' }
    );
    assert.ok(qaMedical.answer.includes('qualified physician or pharmacist'));
    console.log('   [PASS] Reference-driven FAQ dynamic updates, multi-part answers, and medical guardrails verified.');

    // ---------------------------------------------------------
    // 6. Lead Persistence, Separate Consent, Idempotency & Honest Status
    // ---------------------------------------------------------
    console.log('6. Testing Lead Registration Persistence, Consent Separation & Brevo Handling...');
    // Registration WITHOUT optional marketing consent
    const regNoConsent = await engine.registerLead('yu-sleep', {
      email: 'viewer1@example.com',
      name: 'Alice',
      registrationRequested: true,
      marketingConsentGiven: false
    }, {
      viewerContextToken: pubViewer.viewerContextToken,
      ip: '10.0.1.1'
    });
    assert.strictEqual(regNoConsent.ok, true);
    assert.strictEqual(regNoConsent.brevoStatus, 'NOT_APPLICABLE_NO_MARKETING_CONSENT');
    assert.strictEqual(regNoConsent.isDuplicate, false);
    assert.strictEqual(regNoConsent.guideDeliveryStatus, 'NO_GUIDE_ASSET_CONFIGURED');
    assert.strictEqual(JSON.stringify(regNoConsent).toLowerCase().includes('pdf'), false);

    // Duplicate registration for same email + slug + mode is idempotent (does not double-count analytics)
    const prodLeadsBefore = engine.getWebinar('yu-sleep').analytics.production.registrations;
    const regDup = await engine.registerLead('yu-sleep', {
      email: 'viewer1@example.com',
      name: 'Alice',
      registrationRequested: true,
      marketingConsentGiven: false
    }, {
      viewerContextToken: pubViewer.viewerContextToken,
      ip: '10.0.1.1'
    });
    assert.strictEqual(regDup.isDuplicate, true);
    assert.strictEqual(engine.getWebinar('yu-sleep').analytics.production.registrations, prodLeadsBefore);

    // Preview registration never syncs to live Brevo and increments preview analytics only
    const regPreview = await engine.registerLead('yu-sleep', {
      email: 'reviewer@example.com',
      name: 'Bob',
      registrationRequested: true,
      marketingConsentGiven: true
    }, {
      viewerContextToken: prevViewer.viewerContextToken,
      ip: '10.0.1.2'
    });
    assert.strictEqual(regPreview.isPreview, true);
    assert.strictEqual(regPreview.brevoStatus, 'PREVIEW_SIMULATED');
    assert.strictEqual(engine.getWebinar('yu-sleep').analytics.preview.registrations, 1);
    assert.strictEqual(engine.getWebinar('yu-sleep').analytics.production.registrations, 1);

    // Verify server-authoritative consent text is stored (ignoring any client-supplied consentText)
    const storedRegs = engine.getRegistrationsForWebinar('yu-sleep');
    assert.strictEqual(storedRegs.length, 2);
    assert.ok(storedRegs[0].consent.marketingConsentText.includes('Optional: I agree to receive email updates'));
    console.log('   [PASS] Lead persistence, consent separation, idempotency, and zero fake PDF claims verified.');

    // ---------------------------------------------------------
    // 7. Interval-Based Watch Analytics (Forward Seek + Playback, Replay, Milestones)
    // ---------------------------------------------------------
    console.log('7. Testing Interval-Based Watch Analytics (Seek, Replay, Milestones)...');
    // Session 1: User seeks forward to 15s, then legitimately watches from 15s to 23s (8 unique seconds on a 30s video = 26.6% -> p25 reached!)
    await engine.trackEvent('yu-sleep', {
      eventType: 'pageview'
    }, { viewerContextToken: pubViewer.viewerContextToken });

    await engine.trackEvent('yu-sleep', {
      eventType: 'playback_start'
    }, { viewerContextToken: pubViewer.viewerContextToken });

    await engine.trackEvent('yu-sleep', {
      eventType: 'seek',
      currentTime: 15
    }, { viewerContextToken: pubViewer.viewerContextToken });

    const trackAfterSeek = await engine.trackEvent('yu-sleep', {
      eventType: 'watch_interval',
      intervalStart: 15,
      intervalEnd: 23,
      eventId: 'evt_seek_play_1'
    }, { viewerContextToken: pubViewer.viewerContextToken });

    assert.strictEqual(trackAfterSeek.deduplicated, false);
    assert.strictEqual(trackAfterSeek.sessionMetrics.uniqueWatchedSeconds, 8);
    assert.strictEqual(trackAfterSeek.sessionMetrics.totalPlaybackSeconds, 8);

    let prodMetrics = engine.getWebinar('yu-sleep').analytics.production;
    assert.strictEqual(prodMetrics.milestones.p25, 1, '8s of 30s (26.7%) after forward seek must credit p25');
    assert.strictEqual(prodMetrics.milestones.p50, 0, 'Jumping to 15s without watching 15s of content must NOT credit p50');

    // Duplicate eventId is ignored
    const dupEvent = await engine.trackEvent('yu-sleep', {
      eventType: 'watch_interval',
      intervalStart: 15,
      intervalEnd: 23,
      eventId: 'evt_seek_play_1'
    }, { viewerContextToken: pubViewer.viewerContextToken });
    assert.strictEqual(dupEvent.deduplicated, true);

    // Backward seek and replay of 15s-23s: increases totalPlaybackSeconds to 16, keeps uniqueWatchedSeconds at 8
    const replayEvent = await engine.trackEvent('yu-sleep', {
      eventType: 'watch_interval',
      intervalStart: 15,
      intervalEnd: 23,
      eventId: 'evt_replay_1'
    }, { viewerContextToken: pubViewer.viewerContextToken });
    assert.strictEqual(replayEvent.sessionMetrics.uniqueWatchedSeconds, 8);
    assert.strictEqual(replayEvent.sessionMetrics.totalPlaybackSeconds, 16);

    // Watch remaining intervals: 0s-15s and 23s-30s -> total uniqueWatchedSeconds = 30s (100% -> p50, p75, p100 credited)
    await engine.trackEvent('yu-sleep', {
      eventType: 'watch_interval',
      intervalStart: 0,
      intervalEnd: 15,
      eventId: 'evt_first_half'
    }, { viewerContextToken: pubViewer.viewerContextToken });

    const fullWatch = await engine.trackEvent('yu-sleep', {
      eventType: 'watch_interval',
      intervalStart: 23,
      intervalEnd: 30,
      eventId: 'evt_final_slice'
    }, { viewerContextToken: pubViewer.viewerContextToken });

    assert.strictEqual(fullWatch.sessionMetrics.uniqueWatchedSeconds, 30);
    prodMetrics = engine.getWebinar('yu-sleep').analytics.production;
    assert.strictEqual(prodMetrics.milestones.p50, 1);
    assert.strictEqual(prodMetrics.milestones.p75, 1);
    assert.strictEqual(prodMetrics.milestones.p100, 1);

    // Hidden tab events are recorded in backgroundIgnoredSeconds, not uniqueWatchedSeconds
    await engine.trackEvent('yu-sleep', {
      eventType: 'watch_interval',
      intervalStart: 0,
      intervalEnd: 5,
      visibilityState: 'hidden',
      eventId: 'evt_hidden_1'
    }, { viewerContextToken: pubViewer.viewerContextToken });

    prodMetrics = engine.getWebinar('yu-sleep').analytics.production;
    assert.strictEqual(prodMetrics.backgroundIgnoredSeconds, 5);
    console.log('   [PASS] Interval-based watch analytics (forward seek + play, replay, milestones, hidden tab) verified.');

    // ---------------------------------------------------------
    // 8. Corrupt State Protection & Atomic Persistence Rollback
    // ---------------------------------------------------------
    console.log('8. Testing Corrupt State File Protection & Write Failure Rollback...');
    const corruptDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webinar-corrupt-test-'));
    fs.writeFileSync(path.join(corruptDir, 'webinars.json'), '{corrupt_json:', 'utf8');
    assert.throws(
      () => {
        new WebinarEngine({ dataDir: corruptDir, adminToken: ADMIN_TOKEN });
      },
      (err) => err.message.includes('Corrupt webinars state file')
    );
    // Verify corrupt file was NOT overwritten with default seed
    assert.strictEqual(fs.readFileSync(path.join(corruptDir, 'webinars.json'), 'utf8'), '{corrupt_json:');
    fs.rmSync(corruptDir, { recursive: true, force: true });

    // Simulated write failure rolls back in-memory state
    engine._simulateWriteFailure = true;
    await assert.rejects(
      async () => {
        await engine.saveWebinar({ slug: 'yu-sleep', headline: 'SHOULD ROLL BACK' }, 'admin:test');
      },
      (err) => err.message.includes('SIMULATED_PERSISTENCE_WRITE_FAILURE')
    );
    engine._simulateWriteFailure = false;
    assert.strictEqual(engine.getWebinar('yu-sleep').draft.headline, 'DRAFT REVISION 2 UNAPPROVED HEADLINE');
    console.log('   [PASS] Corrupt state file protection and atomic rollback verified.');

    // ---------------------------------------------------------
    // 9. Reversible Unpublish
    // ---------------------------------------------------------
    console.log('9. Testing Reversible Unpublish...');
    await engine.transitionWebinarState('yu-sleep', { action: 'UNPUBLISH', note: 'Taking offline for test' }, 'admin:test');
    const afterUnpub = engine.resolveViewerPageAccess('yu-sleep', null);
    assert.strictEqual(afterUnpub.allowed, false);
    assert.strictEqual(afterUnpub.statusCode, 403);
    console.log('   [PASS] Reversible unpublish verified.\n');

    console.log('=== ALL 9 UNIT & INTEGRATION TEST SUITES PASSED 100% ===');
  } finally {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
