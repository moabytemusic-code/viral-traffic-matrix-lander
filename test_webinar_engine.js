/**
 * Comprehensive Isolated Unit & Integration Tests for Hardened WebinarEngine (v3)
 * Uses temporary directories (fs.mkdtempSync) so tests never mutate workspace files
 * or make external network calls.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { WebinarEngine, WEBINAR_STATES, getYuSleepApprovedReference } = require('./webinar-engine');

async function runTests() {
  console.log('=== Running Hardened WebinarEngine Test Suite (15 Suites) ===\n');

  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'webinar-engine-test-'));
  const ADMIN_TOKEN = 'test-admin-secret-token-999-strong-enough-for-all-checks';
  const VIEWER_TOKEN = 'test-viewer-readonly-token-111-strong-enough-for-checks';
  const SESSION_SECRET = 'test-hmac-session-secret-key-222-distinct-and-32-plus-chars';

  let engine = null;

  try {
    engine = new WebinarEngine({
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
    const b2 = ref.labelDisclosedIngredients.find((f) => f.name.includes('B2'));
    const b6 = ref.labelDisclosedIngredients.find((f) => f.name.includes('B6'));
    const mel = ref.labelDisclosedIngredients.find((f) => f.name.includes('Melatonin'));
    const blend = ref.labelDisclosedIngredients.find((f) => f.name.includes('Proprietary Blend'));

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
        await engine.trackEvent('yu-sleep', { eventType: 'pageview', isPreview: true }, { viewerContextToken: '' });
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
    const shortLinkEntry = wRecord.previewLinks.find((pl) => pl.tokenId === previewShort.tokenId);
    shortLinkEntry.expiresAt = new Date(Date.now() - 10000).toISOString();
    const expiredAccess = engine.resolveViewerPageAccess('yu-sleep', previewShort.previewToken);
    assert.strictEqual(expiredAccess.allowed, false);
    console.log('   [PASS] Scoped, expiring, revocable preview tokens and viewerContextToken verification passed.');

    // ---------------------------------------------------------
    // 4. Draft vs. Published Snapshot Isolation & Revision Approval Gate
    // ---------------------------------------------------------
    console.log('4. Testing Draft vs. Published Snapshot Separation & Revision Approval...');
    await assert.rejects(
      async () => {
        await engine.transitionWebinarState('yu-sleep', { action: 'PUBLISH' }, 'admin:test');
      },
      (err) => err.statusCode === 409 && err.message.includes('Approval is required')
    );

    // Approve current draft revision (#1)
    await engine.transitionWebinarState('yu-sleep', { action: 'APPROVE', note: 'Approved rev 1' }, 'admin:test');
    const wAfterApprove = engine.getWebinar('yu-sleep');
    assert.strictEqual(wAfterApprove.status, WEBINAR_STATES.APPROVED);
    assert.strictEqual(wAfterApprove.approval.approvedRevision, 1);

    // Publish approved revision #1
    await engine.transitionWebinarState('yu-sleep', { action: 'PUBLISH', note: 'Publishing rev 1' }, 'admin:test');
    const wPublished = engine.getWebinar('yu-sleep');
    assert.strictEqual(wPublished.status, WEBINAR_STATES.PUBLISHED);
    assert.strictEqual(wPublished.publishedSnapshot.revision, 1);
    const liveHeadlineRev1 = wPublished.publishedSnapshot.headline;

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
    const qaPublicServing = await engine.answerViewerQuestion('yu-sleep', 'What is the serving size?', {
      viewerContextToken: pubViewer.viewerContextToken,
      ip: '10.0.0.1'
    });
    assert.ok(qaPublicServing.answer.includes('2 mL (2 full droppers)'));
    assert.strictEqual(qaPublicServing.llmEnabled, false);

    const qaPreviewServing = await engine.answerViewerQuestion('yu-sleep', 'What is the serving size?', {
      viewerContextToken: prevViewer.viewerContextToken,
      ip: '10.0.0.2'
    });
    assert.ok(qaPreviewServing.answer.includes('4 mL (Experimental Draft Dose)'));

    const qaMulti = await engine.answerViewerQuestion(
      'yu-sleep',
      'How much Vitamin B6 is in each serving and what is the refund policy?',
      { viewerContextToken: pubViewer.viewerContextToken, ip: '10.0.0.3' }
    );
    assert.ok(qaMulti.answer.includes('0.5 mg'));
    assert.ok(qaMulti.answer.includes('29%'));
    assert.ok(qaMulti.answer.includes('not verified in this static reference'));

    const qaClinical = await engine.answerViewerQuestion(
      'yu-sleep',
      'Is this clinically proven in clinical trials?',
      { viewerContextToken: pubViewer.viewerContextToken, ip: '10.0.0.4' }
    );
    assert.ok(qaClinical.answer.includes('We have not verified independent clinical evidence for the finished formula.'));

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

    const storedRegs = engine.getRegistrationsForWebinar('yu-sleep');
    assert.strictEqual(storedRegs.length, 2);
    assert.ok(storedRegs[0].consent.marketingConsentText.includes('Optional: I agree to receive email updates'));
    console.log('   [PASS] Lead persistence, consent separation, idempotency, and zero fake PDF claims verified.');

    // ---------------------------------------------------------
    // 7. Interval-Based Watch Analytics (Forward Seek + Playback, Replay, Milestones)
    // ---------------------------------------------------------
    console.log('7. Testing Interval-Based Watch Analytics (Seek, Replay, Milestones)...');
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

    const dupEvent = await engine.trackEvent('yu-sleep', {
      eventType: 'watch_interval',
      intervalStart: 15,
      intervalEnd: 23,
      eventId: 'evt_seek_play_1'
    }, { viewerContextToken: pubViewer.viewerContextToken });
    assert.strictEqual(dupEvent.deduplicated, true);

    const replayEvent = await engine.trackEvent('yu-sleep', {
      eventType: 'watch_interval',
      intervalStart: 15,
      intervalEnd: 23,
      eventId: 'evt_replay_1'
    }, { viewerContextToken: pubViewer.viewerContextToken });
    assert.strictEqual(replayEvent.sessionMetrics.uniqueWatchedSeconds, 8);
    assert.strictEqual(replayEvent.sessionMetrics.totalPlaybackSeconds, 16);

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
    assert.strictEqual(fs.readFileSync(path.join(corruptDir, 'webinars.json'), 'utf8'), '{corrupt_json:');
    fs.rmSync(corruptDir, { recursive: true, force: true });

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
    console.log('   [PASS] Reversible unpublish verified.');

    // ---------------------------------------------------------
    // 10. Revision-Scoped Previews & Public Viewer Context Revision Enforcement
    // ---------------------------------------------------------
    console.log('10. Testing Revision-Scoped Previews & Public Snapshot Revision Enforcement...');
    // Current yu-sleep draft is at Revision #2
    assert.strictEqual(engine.getWebinar('yu-sleep').draft.revision, 2);

    // Reject preview issuance for nonexistent or outdated revision
    await assert.rejects(
      async () => {
        await engine.createPreviewLink('yu-sleep', { ttlSeconds: 600, revision: 99 }, 'admin:test');
      },
      (err) => err.statusCode === 409 && err.code === 'INVALID_PREVIEW_REVISION'
    );
    await assert.rejects(
      async () => {
        await engine.createPreviewLink('yu-sleep', { ttlSeconds: 600, revision: 1 }, 'admin:test');
      },
      (err) => err.statusCode === 409 && err.code === 'INVALID_PREVIEW_REVISION'
    );

    // Issue preview link for Draft Rev #2 and open page access
    const linkRev2 = await engine.createPreviewLink('yu-sleep', { ttlSeconds: 1800, revision: 2 }, 'admin:test');
    assert.strictEqual(linkRev2.revision, 2);
    const accessRev2 = engine.resolveViewerPageAccess('yu-sleep', linkRev2.previewToken);
    assert.strictEqual(accessRev2.allowed, true);
    assert.strictEqual(accessRev2.revision, 2);

    // Edit draft to Revision #3 -> must invalidate linkRev2 and accessRev2.viewerContextToken!
    await engine.saveWebinar({
      slug: 'yu-sleep',
      headline: 'DRAFT REVISION 3 HEADLINE'
    }, 'admin:editor');
    assert.strictEqual(engine.getWebinar('yu-sleep').draft.revision, 3);

    // Rev-2 preview link must NOT open Rev-3
    const accessRev2AfterEdit = engine.resolveViewerPageAccess('yu-sleep', linkRev2.previewToken);
    assert.strictEqual(accessRev2AfterEdit.allowed, false);
    assert.strictEqual(accessRev2AfterEdit.statusCode, 409);
    assert.strictEqual(accessRev2AfterEdit.reason, 'PREVIEW_REVISION_OUTDATED');
    assert.strictEqual(accessRev2AfterEdit.linkRevision, 2);
    assert.strictEqual(accessRev2AfterEdit.currentRevision, 3);

    // Previously issued Rev-2 viewerContextToken must also fail on verifyViewerContext & viewer APIs
    const ctxCheckRev2 = engine.verifyViewerContext('yu-sleep', accessRev2.viewerContextToken);
    assert.strictEqual(ctxCheckRev2.valid, false);
    assert.strictEqual(ctxCheckRev2.statusCode, 409);
    assert.strictEqual(ctxCheckRev2.reason, 'PREVIEW_REVISION_OUTDATED');

    await assert.rejects(
      async () => {
        await engine.trackEvent('yu-sleep', { eventType: 'pageview' }, { viewerContextToken: accessRev2.viewerContextToken });
      },
      (err) => err.statusCode === 409 && err.code === 'PREVIEW_REVISION_OUTDATED'
    );
    await assert.rejects(
      async () => {
        await engine.answerViewerQuestion('yu-sleep', 'What is the serving size?', { viewerContextToken: accessRev2.viewerContextToken });
      },
      (err) => err.statusCode === 409 && err.code === 'PREVIEW_REVISION_OUTDATED'
    );
    await assert.rejects(
      async () => {
        await engine.registerLead('yu-sleep', { email: 'stale@example.com', registrationRequested: true }, { viewerContextToken: accessRev2.viewerContextToken });
      },
      (err) => err.statusCode === 409 && err.code === 'PREVIEW_REVISION_OUTDATED'
    );

    // Public viewer context revision enforcement when a new revision is published
    await engine.transitionWebinarState('yu-sleep', { action: 'APPROVE', revision: 3 }, 'admin:test');
    await engine.transitionWebinarState('yu-sleep', { action: 'PUBLISH', revision: 3 }, 'admin:test');
    const pubAccessRev3 = engine.resolveViewerPageAccess('yu-sleep', null);
    assert.strictEqual(pubAccessRev3.allowed, true);
    assert.strictEqual(pubAccessRev3.revision, 3);

    // Now edit to Rev #4, approve Rev #4, and publish Rev #4
    await engine.saveWebinar({ slug: 'yu-sleep', headline: 'PUBLISHED REVISION 4 HEADLINE' }, 'admin:test');
    await engine.transitionWebinarState('yu-sleep', { action: 'APPROVE', revision: 4 }, 'admin:test');
    await engine.transitionWebinarState('yu-sleep', { action: 'PUBLISH', revision: 4 }, 'admin:test');

    // Old public viewerContextToken (Rev #3) must require refresh (409 PUBLIC_REVISION_OUTDATED_REFRESH_REQUIRED) rather than silently switching to Rev #4
    const stalePubCtx = engine.verifyViewerContext('yu-sleep', pubAccessRev3.viewerContextToken);
    assert.strictEqual(stalePubCtx.valid, false);
    assert.strictEqual(stalePubCtx.statusCode, 409);
    assert.strictEqual(stalePubCtx.reason, 'PUBLIC_REVISION_OUTDATED_REFRESH_REQUIRED');
    console.log('   [PASS] Revision-scoped previews and public viewer context revision checks verified.');

    // ---------------------------------------------------------
    // 11. Multi-File Transactional Rollback & Crash Journal Recovery
    // ---------------------------------------------------------
    console.log('11. Testing Multi-File Transactional Rollback (1st & 2nd File Failures) & Journal Recovery...');
    const pubAccessRev4 = engine.resolveViewerPageAccess('yu-sleep', null);
    assert.strictEqual(pubAccessRev4.allowed, true);
    assert.strictEqual(pubAccessRev4.revision, 4);

    const snapshotAllState = () => ({
      memWebinars: JSON.stringify(engine.webinars),
      memRegs: JSON.stringify(engine.registrations),
      memSessions: JSON.stringify(engine.sessions),
      memOutbox: JSON.stringify(engine.brevoOutbox),
      diskWebinars: fs.readFileSync(engine.webinarsFile, 'utf8'),
      diskRegs: fs.readFileSync(engine.registrationsFile, 'utf8'),
      diskSessions: fs.readFileSync(engine.sessionsFile, 'utf8'),
      diskOutbox: fs.readFileSync(engine.outboxFile, 'utf8')
    });

    const assertStateUnchanged = (before, label) => {
      const after = snapshotAllState();
      assert.strictEqual(after.memWebinars, before.memWebinars, `${label}: in-memory webinars mutated`);
      assert.strictEqual(after.memRegs, before.memRegs, `${label}: in-memory registrations mutated`);
      assert.strictEqual(after.memSessions, before.memSessions, `${label}: in-memory sessions mutated`);
      assert.strictEqual(after.memOutbox, before.memOutbox, `${label}: in-memory brevoOutbox mutated`);
      assert.strictEqual(after.diskWebinars, before.diskWebinars, `${label}: disk webinars.json mutated`);
      assert.strictEqual(after.diskRegs, before.diskRegs, `${label}: disk webinar-registrations.json mutated`);
      assert.strictEqual(after.diskSessions, before.diskSessions, `${label}: disk webinar-sessions.json mutated`);
      assert.strictEqual(after.diskOutbox, before.diskOutbox, `${label}: disk webinar-brevo-outbox.json mutated`);
      assert.strictEqual(fs.existsSync(engine.journalFile), false, `${label}: journal file not cleaned up`);
    };

    // A. registerLead failing on 1st file write (index 0: registrations) AND 2nd file write (index 1: brevoOutbox) AND 3rd file write (index 2: webinars)
    for (const failIdx of [0, 1, 2]) {
      const before = snapshotAllState();
      engine.configureWriteFaultInjection({ failOnWriteIndex: failIdx });
      await assert.rejects(
        async () => {
          await engine.registerLead('yu-sleep', {
            email: `tx_fail_${failIdx}@example.com`,
            name: 'Tx Rollback',
            registrationRequested: true,
            marketingConsentGiven: true
          }, { viewerContextToken: pubAccessRev4.viewerContextToken });
        },
        (err) => err.code === 'PERSISTENCE_WRITE_FAILED'
      );
      engine.configureWriteFaultInjection({});
      assertStateUnchanged(before, `registerLead failOnWriteIndex=${failIdx}`);
    }

    // B. trackEvent failing on 1st file write (index 0: sessions) AND 2nd file write (index 1: webinars)
    for (const failIdx of [0, 1]) {
      const before = snapshotAllState();
      engine.configureWriteFaultInjection({ failOnWriteIndex: failIdx });
      await assert.rejects(
        async () => {
          await engine.trackEvent('yu-sleep', {
            eventType: 'watch_interval',
            intervalStart: 0,
            intervalEnd: 5,
            eventId: `tx_track_fail_${failIdx}`
          }, { viewerContextToken: pubAccessRev4.viewerContextToken });
        },
        (err) => err.code === 'PERSISTENCE_WRITE_FAILED'
      );
      engine.configureWriteFaultInjection({});
      assertStateUnchanged(before, `trackEvent failOnWriteIndex=${failIdx}`);
    }

    // C. answerViewerQuestion (_incrementFaqMetric) failing on write
    {
      const before = snapshotAllState();
      engine.configureWriteFaultInjection({ failOnWriteIndex: 0 });
      await assert.rejects(
        async () => {
          await engine.answerViewerQuestion('yu-sleep', 'How much melatonin is in a serving?', {
            viewerContextToken: pubAccessRev4.viewerContextToken,
            ip: '10.9.9.1'
          });
        },
        (err) => err.code === 'PERSISTENCE_WRITE_FAILED'
      );
      engine.configureWriteFaultInjection({});
      assertStateUnchanged(before, 'answerViewerQuestion failOnWriteIndex=0');
    }

    // D. Simulated process crash mid-commit: leftover webinar-tx-journal.json is recovered on restart
    {
      const beforeCrash = snapshotAllState();
      engine.close();

      // Simulate partial write to webinar-registrations.json with uncommitted journal on disk
      const fakeJournal = {
        txId: 'tx_simulated_crash_99',
        startedAt: new Date().toISOString(),
        status: 'COMMITTING',
        files: [
          {
            key: 'registrations',
            filePath: path.join(tmpRoot, 'webinar-registrations.json'),
            existedBefore: true,
            beforeData: JSON.parse(beforeCrash.diskRegs)
          },
          {
            key: 'webinars',
            filePath: path.join(tmpRoot, 'webinars.json'),
            existedBefore: true,
            beforeData: JSON.parse(beforeCrash.diskWebinars)
          }
        ]
      };
      fs.writeFileSync(path.join(tmpRoot, 'webinar-tx-journal.json'), JSON.stringify(fakeJournal, null, 2), 'utf8');
      fs.writeFileSync(path.join(tmpRoot, 'webinar-registrations.json'), JSON.stringify([{ corruptedPartialCommit: true }]), 'utf8');

      engine = new WebinarEngine({
        dataDir: tmpRoot,
        adminToken: ADMIN_TOKEN,
        viewerToken: VIEWER_TOKEN,
        sessionSecret: SESSION_SECRET,
        brevoLiveEnabled: false
      });

      assert.ok(engine.lastJournalRecovery, 'Engine startup must record journal recovery');
      assert.strictEqual(engine.lastJournalRecovery.txId, 'tx_simulated_crash_99');
      assert.strictEqual(fs.existsSync(engine.journalFile), false);
      assert.strictEqual(fs.readFileSync(engine.registrationsFile, 'utf8'), beforeCrash.diskRegs);
    }
    console.log('   [PASS] Multi-file write rollback at every boundary and startup crash journal recovery verified.');

    // ---------------------------------------------------------
    // 12. Signed Session Binding & Abuse Resistance in Analytics
    // ---------------------------------------------------------
    console.log('12. Testing Signed Session Binding & Abuse Resistance in Analytics...');
    // Attempting to override ctx.sessionId via payload.sessionId must fail with 400 SESSION_ID_MISMATCH
    await assert.rejects(
      async () => {
        await engine.trackEvent('yu-sleep', {
          eventType: 'pageview',
          sessionId: 'spoofed_session_override_123'
        }, { viewerContextToken: pubAccessRev4.viewerContextToken });
      },
      (err) => err.statusCode === 400 && err.code === 'SESSION_ID_MISMATCH'
    );

    // Cross-webinar token reuse must fail with 403 VIEWER_CONTEXT_SLUG_MISMATCH
    await assert.rejects(
      async () => {
        await engine.trackEvent('other-webinar', {
          eventType: 'pageview'
        }, { viewerContextToken: pubAccessRev4.viewerContextToken });
      },
      (err) => err.statusCode === 403 && err.code === 'VIEWER_CONTEXT_SLUG_MISMATCH'
    );

    // Invalid eventId format or missing eventId on watch_interval must fail with 400 INVALID_EVENT_ID
    await assert.rejects(
      async () => {
        await engine.trackEvent('yu-sleep', {
          eventType: 'watch_interval',
          intervalStart: 0,
          intervalEnd: 5
        }, { viewerContextToken: pubAccessRev4.viewerContextToken });
      },
      (err) => err.statusCode === 400 && err.code === 'INVALID_EVENT_ID'
    );

    await assert.rejects(
      async () => {
        await engine.trackEvent('yu-sleep', {
          eventType: 'pageview',
          eventId: 'invalid spaces in event id!'
        }, { viewerContextToken: pubAccessRev4.viewerContextToken });
      },
      (err) => err.statusCode === 400 && err.code === 'INVALID_EVENT_ID'
    );

    // Valid matching sessionId works and scopes session key to slug + mode + revision + signed sessionId
    const validSessionTrack = await engine.trackEvent('yu-sleep', {
      eventType: 'pageview',
      sessionId: pubAccessRev4.sessionId,
      eventId: 'valid_pv_1'
    }, { viewerContextToken: pubAccessRev4.viewerContextToken });
    assert.strictEqual(validSessionTrack.sessionId, pubAccessRev4.sessionId);
    assert.strictEqual(validSessionTrack.scopedSessionKey, `yu-sleep:public:rev4:${pubAccessRev4.sessionId}`);
    assert.strictEqual(validSessionTrack.telemetryTrustLevel, 'CLIENT_REPORTED_BOUND_TO_SIGNED_SESSION');

    // Page refresh creates a distinct signed sessionId
    const refreshedAccess = engine.resolveViewerPageAccess('yu-sleep', null);
    assert.notStrictEqual(refreshedAccess.sessionId, pubAccessRev4.sessionId);
    console.log('   [PASS] Signed sessionId binding, spoof rejection, eventId validation, and refresh scoping verified.');

    // ---------------------------------------------------------
    // 13. Durable Brevo Outbox Queue, Consent Withdrawal, Retries, Backoff & Locking
    // ---------------------------------------------------------
    console.log('13. Testing Durable Brevo Outbox Queue, Consent Withdrawal, Retries & Worker Locking...');
    // 13a. Register lead with marketing consent -> queued in durable outbox
    const regQueued = await engine.registerLead('yu-sleep', {
      email: 'outbox_user1@example.com',
      name: 'Outbox User 1',
      registrationRequested: true,
      marketingConsentGiven: true
    }, { viewerContextToken: pubAccessRev4.viewerContextToken });
    assert.strictEqual(regQueued.brevoStatus, 'CONTACT_SYNC_QUEUED');
    assert.ok(regQueued.brevoOutboxJobId);

    let outboxSummary = engine.getBrevoOutboxSummary('yu-sleep');
    assert.strictEqual(outboxSummary.counts.queued, 1);

    // 13b. When brevoLiveEnabled is false and no transport is injected, processBrevoOutbox leaves job QUEUED
    const noLivePass = await engine.processBrevoOutbox({ workerId: 'worker_idle' });
    assert.strictEqual(noLivePass.liveSyncEnabled, false);
    assert.strictEqual(noLivePass.processedCount, 0);
    assert.strictEqual(noLivePass.skippedDisabledCount, 1);
    assert.strictEqual(engine.getBrevoOutboxSummary('yu-sleep').counts.queued, 1);

    // 13c. Withdraw consent before processing -> cancels queued outbox job and prevents dispatch
    const consentCancelRes = await engine.updateRegistrationConsent('yu-sleep', {
      email: 'outbox_user1@example.com',
      marketingConsentGiven: false
    }, { viewerContextToken: pubAccessRev4.viewerContextToken });
    assert.strictEqual(consentCancelRes.brevoStatus, 'CONSENT_CANCELLED');
    assert.strictEqual(consentCancelRes.outboxJobStatus, 'CONSENT_CANCELLED');
    assert.strictEqual(engine.getBrevoOutboxSummary('yu-sleep').counts.queued, 0);
    assert.strictEqual(engine.getBrevoOutboxSummary('yu-sleep').counts.consentCancelled, 1);

    // 13d. Register second lead with consent, test transient failures + backoff + success on attempt 3
    await engine.registerLead('yu-sleep', {
      email: 'retry_success@example.com',
      name: 'Retry Winner',
      registrationRequested: true,
      marketingConsentGiven: true
    }, { viewerContextToken: pubAccessRev4.viewerContextToken });

    let transportCalls = 0;
    engine.brevoTransport = async (payload, meta) => {
      transportCalls += 1;
      if (meta.attempt === 1) {
        return { ok: false, status: 503, body: { message: 'Service Temporarily Unavailable' } };
      }
      if (meta.attempt === 2) {
        return { ok: false, status: 429, body: { message: 'Rate limited' } };
      }
      return { ok: true, status: 201, body: { id: 98765 } };
    };

    const baseNow = Date.now();
    // Attempt 1 -> fails with 503, transitions to RETRY_SCHEDULED with backoff (5000ms)
    const pass1 = await engine.processBrevoOutbox({ workerId: 'worker_1', nowMs: baseNow });
    assert.strictEqual(pass1.processedCount, 1);
    assert.strictEqual(pass1.processedJobs[0].status, 'RETRY_SCHEDULED');
    assert.strictEqual(pass1.processedJobs[0].attempts, 1);

    // Running immediately before nextAttemptAt (baseNow + 1000ms) skips the job because backoff has not elapsed
    const passEarly = await engine.processBrevoOutbox({ workerId: 'worker_1', nowMs: baseNow + 1000 });
    assert.strictEqual(passEarly.processedCount, 0);

    // Attempt 2 at baseNow + 6000ms -> fails with 429, schedules retry 3 with 10000ms backoff
    const pass2 = await engine.processBrevoOutbox({ workerId: 'worker_1', nowMs: baseNow + 6000 });
    assert.strictEqual(pass2.processedCount, 1);
    assert.strictEqual(pass2.processedJobs[0].status, 'RETRY_SCHEDULED');
    assert.strictEqual(pass2.processedJobs[0].attempts, 2);

    // Attempt 3 at baseNow + 20000ms -> succeeds with 201, transitions to SYNCHRONIZED!
    const pass3 = await engine.processBrevoOutbox({ workerId: 'worker_1', nowMs: baseNow + 20000 });
    assert.strictEqual(pass3.processedCount, 1);
    assert.strictEqual(pass3.processedJobs[0].status, 'SYNCHRONIZED');
    assert.strictEqual(pass3.processedJobs[0].attempts, 3);
    assert.strictEqual(pass3.processedJobs[0].attemptHistory.length, 3);
    assert.strictEqual(transportCalls, 3);

    const syncedReg = engine.getRegistrationsForWebinar('yu-sleep').find((r) => r.email === 'retry_success@example.com');
    assert.strictEqual(syncedReg.brevoSync.status, 'CONTACT_SYNCHRONIZED');
    assert.strictEqual(syncedReg.brevoSync.providerResponseId, '98765');

    // 13e. Terminal failure after exhausting maxAttempts & stale worker lock crash recovery
    await engine.registerLead('yu-sleep', {
      email: 'terminal_fail@example.com',
      name: 'Terminal Fail',
      registrationRequested: true,
      marketingConsentGiven: true
    }, { viewerContextToken: pubAccessRev4.viewerContextToken });

    // Simulate a crashed worker leaving the job in PROCESSING with an expired lock
    const failJob = engine.brevoOutbox.find((j) => j.email === 'terminal_fail@example.com');
    failJob.status = 'PROCESSING';
    failJob.lockedBy = 'crashed_worker_dead';
    failJob.lockExpiresAt = new Date(baseNow - 60000).toISOString();

    engine.brevoTransport = async () => ({ ok: false, status: 500, body: { message: 'Upstream Down' } });
    await engine.processBrevoOutbox({ workerId: 'worker_recovery', nowMs: baseNow });
    await engine.processBrevoOutbox({ workerId: 'worker_recovery', nowMs: baseNow + 10000 });
    const finalFailPass = await engine.processBrevoOutbox({ workerId: 'worker_recovery', nowMs: baseNow + 30000 });
    assert.strictEqual(finalFailPass.processedJobs[0].status, 'FAILED');
    assert.strictEqual(finalFailPass.processedJobs[0].attempts, 3);
    assert.ok(finalFailPass.processedJobs[0].attemptHistory.some((h) => h.status === 'STALE_LOCK_RECOVERED'));

    const failedReg = engine.getRegistrationsForWebinar('yu-sleep').find((r) => r.email === 'terminal_fail@example.com');
    assert.strictEqual(failedReg.brevoSync.status, 'FAILED');
    engine.brevoTransport = null;
    console.log('   [PASS] Durable Brevo outbox queuing, consent withdrawal cancellation, backoff retries, and stale lock recovery verified.');

    // ---------------------------------------------------------
    // 14. Production vs. Development Cookie Security & Proxy Trust Validation
    // ---------------------------------------------------------
    console.log('14. Testing Production Cookie Security (`Secure` Flag), Secret Validation & Proxy Trust...');
    const prodDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webinar-prod-cookie-'));
    try {
      // Weak admin token in production must fail startup validation
      assert.throws(
        () => {
          new WebinarEngine({
            dataDir: prodDir,
            nodeEnv: 'production',
            adminToken: 'short-token',
            sessionSecret: SESSION_SECRET
          });
        },
        (err) => err.code === 'PRODUCTION_CONFIG_INVALID'
      );

      // Missing explicit sessionSecret in production must fail startup validation
      assert.throws(
        () => {
          new WebinarEngine({
            dataDir: prodDir,
            nodeEnv: 'production',
            adminToken: ADMIN_TOKEN,
            sessionSecret: ''
          });
        },
        (err) => err.code === 'PRODUCTION_CONFIG_INVALID'
      );

      // Valid production configuration with trustProxy: false
      const prodEngineNoProxy = new WebinarEngine({
        dataDir: prodDir,
        nodeEnv: 'production',
        trustProxy: false,
        adminToken: ADMIN_TOKEN,
        sessionSecret: SESSION_SECRET
      });

      // Plain HTTP request in production is rejected with 403 HTTPS_REQUIRED_IN_PRODUCTION
      assert.throws(
        () => {
          prodEngineNoProxy.createAdminSession(ADMIN_TOKEN, {
            headers: {},
            socket: { encrypted: false, remoteAddress: '127.0.0.1' }
          });
        },
        (err) => err.statusCode === 403 && err.code === 'HTTPS_REQUIRED_IN_PRODUCTION'
      );

      // Forged X-Forwarded-Proto: https when trustProxy is false MUST be ignored and rejected!
      assert.throws(
        () => {
          prodEngineNoProxy.createAdminSession(ADMIN_TOKEN, {
            headers: { 'x-forwarded-proto': 'https' },
            socket: { encrypted: false, remoteAddress: '127.0.0.1' }
          });
        },
        (err) => err.statusCode === 403 && err.code === 'HTTPS_REQUIRED_IN_PRODUCTION'
      );

      // Direct TLS socket (encrypted: true) succeeds and sets Secure flag
      const tlsSession = prodEngineNoProxy.createAdminSession(ADMIN_TOKEN, {
        headers: {},
        socket: { encrypted: true, remoteAddress: '203.0.113.5' }
      });
      assert.ok(tlsSession.cookieHeader.includes('; Secure'));
      assert.ok(tlsSession.cookieHeader.includes('HttpOnly'));
      assert.ok(tlsSession.cookieHeader.includes('SameSite=Strict'));

      // Clearing cookie in production also includes Secure flag
      const clearedCookie = prodEngineNoProxy.revokeAdminSession(tlsSession.sessionId, {
        headers: {},
        socket: { encrypted: true }
      });
      assert.ok(clearedCookie.cookieHeader.includes('Max-Age=0'));
      assert.ok(clearedCookie.cookieHeader.includes('; Secure'));
      prodEngineNoProxy.close();

      // Valid production configuration with trustProxy: true and trustedProxyIps: ['127.0.0.1']
      const prodEngineProxy = new WebinarEngine({
        dataDir: prodDir,
        nodeEnv: 'production',
        trustProxy: true,
        trustedProxyIps: ['127.0.0.1'],
        adminToken: ADMIN_TOKEN,
        sessionSecret: SESSION_SECRET
      });

      // Untrusted remote IP sending X-Forwarded-Proto: https is rejected
      assert.throws(
        () => {
          prodEngineProxy.createAdminSession(ADMIN_TOKEN, {
            headers: { 'x-forwarded-proto': 'https' },
            socket: { encrypted: false, remoteAddress: '198.51.100.77' }
          });
        },
        (err) => err.statusCode === 403 && err.code === 'HTTPS_REQUIRED_IN_PRODUCTION'
      );

      // Trusted proxy IP (127.0.0.1) sending X-Forwarded-Proto: https succeeds with Secure cookie
      const proxySession = prodEngineProxy.createAdminSession(ADMIN_TOKEN, {
        headers: { 'x-forwarded-proto': 'https' },
        socket: { encrypted: false, remoteAddress: '127.0.0.1' }
      });
      assert.ok(proxySession.cookieHeader.includes('; Secure'));
      prodEngineProxy.close();
    } finally {
      fs.rmSync(prodDir, { recursive: true, force: true });
    }
    console.log('   [PASS] Production HTTPS-only cookies, secret validation, and trusted proxy checks verified.');

    // ---------------------------------------------------------
    // 15. Single-Writer Lock Enforcement & Stale Lock Crash Recovery
    // ---------------------------------------------------------
    console.log('15. Testing Single-Writer Lock Enforcement & Stale Lock Recovery...');
    // Attempting to start a second writer on tmpRoot while `engine` holds the lock must fail with 503 CONCURRENT_WRITER_REJECTED
    assert.throws(
      () => {
        new WebinarEngine({
          dataDir: tmpRoot,
          adminToken: ADMIN_TOKEN,
          sessionSecret: SESSION_SECRET
        });
      },
      (err) => err.statusCode === 503 && err.code === 'CONCURRENT_WRITER_REJECTED'
    );

    // Close primary engine and test cross-process lock detection & stale dead-PID recovery
    engine.close();

    // Simulate active foreign PID lock
    fs.writeFileSync(path.join(tmpRoot, 'webinar-store.lock'), JSON.stringify({
      instanceId: 'weng_foreign_active',
      pid: 424242,
      hostname: os.hostname(),
      acquiredAt: new Date().toISOString()
    }), 'utf8');

    assert.throws(
      () => {
        new WebinarEngine({
          dataDir: tmpRoot,
          adminToken: ADMIN_TOKEN,
          sessionSecret: SESSION_SECRET,
          simulateActiveLockPid: 424242
        });
      },
      (err) => err.statusCode === 503 && err.code === 'CONCURRENT_WRITER_REJECTED'
    );

    // Now without simulateActiveLockPid, PID 99999999 is dead -> engine reclaims stale lock cleanly
    fs.writeFileSync(path.join(tmpRoot, 'webinar-store.lock'), JSON.stringify({
      instanceId: 'weng_crashed_dead',
      pid: 99999999,
      hostname: os.hostname(),
      acquiredAt: new Date(Date.now() - 120000).toISOString()
    }), 'utf8');

    engine = new WebinarEngine({
      dataDir: tmpRoot,
      adminToken: ADMIN_TOKEN,
      sessionSecret: SESSION_SECRET
    });
    assert.ok(engine.lastStaleLockRecovery, 'Dead PID lock must be reclaimed and recorded');
    assert.strictEqual(engine.lastStaleLockRecovery.stalePid, 99999999);
    assert.strictEqual(engine.getPersistenceModelInfo().supportsHorizontalMultiWriter, false);
    console.log('   [PASS] Single-writer lock enforcement and dead-PID stale lock recovery verified.\n');

    console.log('=== ALL 15 UNIT & INTEGRATION TEST SUITES PASSED 100% ===');
  } finally {
    if (engine) {
      engine.close();
    }
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  }
}

runTests().catch((err) => {
  console.error('TEST FAILURE:', err);
  process.exit(1);
});
