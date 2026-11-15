/**
 * End-to-End HTTP Security, Lifecycle, Reference, Registration, Outbox & Analytics Verification Suite
 * Spawns server.js on isolated ephemeral ports with isolated temporary WEBINAR_DATA_DIRs.
 * Never mutates workspace state files or contacts external APIs.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3981;
const PROD_PORT = 3982;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const PROD_BASE_URL = `http://127.0.0.1:${PROD_PORT}`;
const ADMIN_TOKEN = 'e2e-admin-secret-token-777-strong-32plus-characters-ok';
const VIEWER_TOKEN = 'e2e-viewer-readonly-token-333-strong-32plus-characters';
const SESSION_SECRET = 'e2e-session-hmac-secret-555-distinct-strong-32plus-chars';

async function httpReq(urlPath, { baseUrl = BASE_URL, method = 'GET', headers = {}, body = null } = {}) {
  const opts = {
    method,
    headers: { ...headers }
  };
  if (body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${baseUrl}${urlPath}`, opts);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {}
  return { status: res.status, headers: res.headers, text, json };
}

async function waitForServer(baseUrl = BASE_URL, maxWaitMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const r = await httpReq('/health', { baseUrl });
      if (r.status === 200) return;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error(`Server at ${baseUrl} failed to start within timeout`);
}

async function runE2E() {
  console.log('=== Running End-to-End HTTP Verification Suite (10 Suites) ===\n');
  const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webinar-e2e-http-'));
  const tmpProdDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webinar-e2e-prod-'));

  const child = spawn(process.execPath, ['server.js'], {
    cwd: __dirname,
    env: {
      ...process.env,
      PORT: String(PORT),
      HOST: '127.0.0.1',
      WEBINAR_DATA_DIR: tmpDataDir,
      WEBINAR_ADMIN_TOKEN: ADMIN_TOKEN,
      WEBINAR_VIEWER_TOKEN: VIEWER_TOKEN,
      WEBINAR_SESSION_SECRET: SESSION_SECRET,
      WEBINAR_BREVO_LIVE: 'false',
      WEBINAR_DISABLE_BACKGROUND_DAEMONS: 'true'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForServer(BASE_URL);
    console.log('1. Testing Unauthenticated Admin Route Protection (401) & CORS Hardening...');
    const unauthList = await httpReq('/api/webinars', {
      headers: { Origin: 'https://evil.example.com' }
    });
    assert.strictEqual(unauthList.status, 401);
    assert.strictEqual(unauthList.headers.get('access-control-allow-origin'), null, 'Cross-origin wildcard CORS must not be present on admin routes');
    assert.strictEqual(unauthList.headers.get('referrer-policy'), 'no-referrer');

    const unauthPost = await httpReq('/api/webinars', {
      method: 'POST',
      body: { slug: 'hacked', headline: 'Hacked' }
    });
    assert.strictEqual(unauthPost.status, 401);

    const unauthStatus = await httpReq('/api/webinars/yu-sleep/status', {
      method: 'POST',
      body: { action: 'PUBLISH', actor: 'ForgedAdmin' }
    });
    assert.strictEqual(unauthStatus.status, 401);
    console.log('   [PASS] All unauthenticated management requests rejected with 401 and strict CORS headers.');

    console.log('2. Testing Role-Based Authorization (403 for Read-Only Auditor Token on Mutations)...');
    const viewerList = await httpReq('/api/webinars', {
      headers: { Authorization: `Bearer ${VIEWER_TOKEN}` }
    });
    assert.strictEqual(viewerList.status, 200);
    assert.strictEqual(viewerList.json.ok, true);

    const viewerMutate = await httpReq('/api/webinars/yu-sleep', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${VIEWER_TOKEN}` },
      body: { headline: 'Unauthorized Edit' }
    });
    assert.strictEqual(viewerMutate.status, 403);
    console.log('   [PASS] Read-only token allowed on GET (200) and blocked on PUT/POST mutations (403).');

    console.log('3. Testing Cookie Session Login, CSRF Enforcement & Forged Actor Rejection...');
    const loginRes = await httpReq('/api/admin/session', {
      method: 'POST',
      body: { token: ADMIN_TOKEN }
    });
    assert.strictEqual(loginRes.status, 200);
    const setCookie = loginRes.headers.get('set-cookie');
    assert.ok(setCookie && setCookie.includes('HttpOnly') && setCookie.includes('SameSite=Strict'));
    const cookiePair = setCookie.split(';')[0];
    const csrfToken = loginRes.json.csrfToken;

    const noCsrfMutate = await httpReq('/api/webinars/yu-sleep', {
      method: 'PUT',
      headers: { Cookie: cookiePair },
      body: { headline: 'CSRF Bypass Attempt' }
    });
    assert.strictEqual(noCsrfMutate.status, 403);

    const validCsrfStatus = await httpReq('/api/webinars/yu-sleep/status', {
      method: 'POST',
      headers: {
        Cookie: cookiePair,
        'X-CSRF-Token': csrfToken
      },
      body: { action: 'SUBMIT_FOR_REVIEW', note: 'Submitted in E2E', actor: 'FORGED_BODY_ACTOR' }
    });
    assert.strictEqual(validCsrfStatus.status, 200);
    const latestAudit = validCsrfStatus.json.webinar.auditLog.slice(-1)[0];
    assert.strictEqual(latestAudit.actor, 'admin:primary');
    assert.notStrictEqual(latestAudit.actor, 'FORGED_BODY_ACTOR');
    console.log('   [PASS] Cookie session CSRF enforced and audit actor derived from authenticated server session.');

    console.log('4. Testing Unpublished Draft Protection on Public HTML, Public API & Viewer APIs...');
    const pubHtmlDraft = await httpReq('/webinar/yu-sleep');
    assert.strictEqual(pubHtmlDraft.status, 403);

    const pubApiDraft = await httpReq('/api/public/webinars/yu-sleep');
    assert.strictEqual(pubApiDraft.status, 404);

    const forgedQa = await httpReq('/api/webinars/yu-sleep/qa', {
      method: 'POST',
      body: { question: 'How much melatonin?', isPreview: true }
    });
    assert.strictEqual(forgedQa.status, 403);

    const forgedTrack = await httpReq('/api/webinars/yu-sleep/track', {
      method: 'POST',
      body: { eventType: 'pageview', isPreview: true }
    });
    assert.strictEqual(forgedTrack.status, 403);
    console.log('   [PASS] Public HTML, Public API, and forged isPreview viewer API calls blocked on unpublished draft.');

    console.log('5. Testing Scoped Preview Link Issuance, HTML Rendering, HTTP 206 Video Range & Revocation...');
    const issuePrev = await httpReq('/api/webinars/yu-sleep/preview-links', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: { ttlMinutes: 30 }
    });
    assert.strictEqual(issuePrev.status, 201);
    const previewUrl = issuePrev.json.preview.previewUrl;
    const tokenId = issuePrev.json.preview.tokenId;

    const previewPage = await httpReq(previewUrl);
    assert.strictEqual(previewPage.status, 200);
    assert.strictEqual(previewPage.headers.get('referrer-policy'), 'no-referrer');
    assert.ok(previewPage.text.includes('0.5 mg'), 'Rendered page must show corrected 0.5 mg Vitamin B2/B6');
    assert.ok(previewPage.text.includes('38%'), 'Rendered page must show corrected 38% DV for B2');
    assert.ok(previewPage.text.includes('29%'), 'Rendered page must show corrected 29% DV for B6');
    assert.ok(previewPage.text.includes('Product FAQ Assistant'), 'Rendered page must label FAQ assistant honestly');
    assert.ok(previewPage.text.includes('history.replaceState'), 'Rendered page must strip ?preview= token from URL bar');

    const slugMatch = previewPage.text.match(/const SLUG = "([^"]+)"/);
    assert.ok(slugMatch && slugMatch[1] === 'yu-sleep', 'Preview page must embed SLUG = "yu-sleep"');
    const ctxMatch = previewPage.text.match(/const VIEWER_CONTEXT_TOKEN = "([^"]+)"/);
    assert.ok(ctxMatch && ctxMatch[1], 'Preview page must embed signed viewerContextToken');
    const previewContextToken = ctxMatch[1];

    const rangeRes = await fetch(`${BASE_URL}/videos/yusleep-presenter-prototype.mp4`, {
      headers: { Range: 'bytes=0-1023' }
    });
    assert.strictEqual(rangeRes.status, 206);
    assert.strictEqual(rangeRes.headers.get('accept-ranges'), 'bytes');

    const revokeRes = await httpReq('/api/webinars/yu-sleep/preview-links/revoke', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: { tokenId }
    });
    assert.strictEqual(revokeRes.status, 200);

    const afterRevokePage = await httpReq(previewUrl);
    assert.strictEqual(afterRevokePage.status, 403);

    const afterRevokeTrack = await httpReq('/api/webinars/yu-sleep/track', {
      method: 'POST',
      headers: { 'X-Viewer-Context': previewContextToken },
      body: { eventType: 'pageview' }
    });
    assert.strictEqual(afterRevokeTrack.status, 403);
    console.log('   [PASS] Scoped preview link rendered corrected facts, streamed HTTP 206 video, and revoked cleanly.');

    console.log('6. Testing Revision-Scoped Previews over HTTP (Draft Edit Invalidates Previous Preview Link & Context)...');
    // Issue a preview link for Draft Rev #1
    const issueRev1Prev = await httpReq('/api/webinars/yu-sleep/preview-links', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: { ttlMinutes: 30, revision: 1 }
    });
    assert.strictEqual(issueRev1Prev.status, 201);
    const rev1PreviewUrl = issueRev1Prev.json.preview.previewUrl;

    // Requesting preview for nonexistent revision #99 must fail with 409 INVALID_PREVIEW_REVISION
    const badRevPrev = await httpReq('/api/webinars/yu-sleep/preview-links', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: { ttlMinutes: 30, revision: 99 }
    });
    assert.strictEqual(badRevPrev.status, 409);
    assert.strictEqual(badRevPrev.json.code, 'INVALID_PREVIEW_REVISION');

    const rev1PageBeforeEdit = await httpReq(rev1PreviewUrl);
    assert.strictEqual(rev1PageBeforeEdit.status, 200);
    const rev1Ctx = rev1PageBeforeEdit.text.match(/const VIEWER_CONTEXT_TOKEN = "([^"]+)"/)[1];

    // Approve & Publish Rev #1 first, then edit Draft to Rev #2
    const approveRes = await httpReq('/api/webinars/yu-sleep/status', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: { action: 'APPROVE', note: 'Approve Rev 1' }
    });
    assert.strictEqual(approveRes.status, 200);

    const publishRes = await httpReq('/api/webinars/yu-sleep/status', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: { action: 'PUBLISH', note: 'Publish Rev 1' }
    });
    assert.strictEqual(publishRes.status, 200);

    // Edit Draft to Rev #2 while live
    const editRes = await httpReq('/api/webinars/yu-sleep', {
      method: 'PUT',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: {
        headline: 'UNAPPROVED DRAFT REV 2 HEADLINE',
        reference: {
          servingDetails: {
            servingSize: '99 mL (Unapproved Draft Serving)'
          }
        }
      }
    });
    assert.strictEqual(editRes.status, 200);

    // Now opening the Rev #1 preview link MUST return 409 PREVIEW_REVISION_OUTDATED with a helpful message!
    const rev1PageAfterEdit = await httpReq(rev1PreviewUrl);
    assert.strictEqual(rev1PageAfterEdit.status, 409);
    assert.ok(rev1PageAfterEdit.text.includes('Preview Link Outdated'));
    assert.ok(rev1PageAfterEdit.text.includes('PREVIEW_REVISION_OUTDATED'));

    // And the old Rev #1 viewerContextToken must also return 409 PREVIEW_REVISION_OUTDATED on viewer APIs
    const stalePrevQa = await httpReq('/api/webinars/yu-sleep/qa', {
      method: 'POST',
      headers: { 'X-Viewer-Context': rev1Ctx },
      body: { question: 'What is the serving size?' }
    });
    assert.strictEqual(stalePrevQa.status, 409);
    assert.strictEqual(stalePrevQa.json.code, 'PREVIEW_REVISION_OUTDATED');
    console.log('   [PASS] Editing draft invalidated Rev #1 preview link and viewer context with 409 PREVIEW_REVISION_OUTDATED.');

    console.log('7. Testing Live Snapshot Isolation, Session Binding & Durable Brevo Outbox over HTTP...');
    const livePubPage = await httpReq('/webinar/yu-sleep');
    assert.strictEqual(livePubPage.status, 200);
    assert.ok(livePubPage.text.includes('YuSleep: Let Us Look Beyond the Sales Pitch'));
    assert.strictEqual(livePubPage.text.includes('UNAPPROVED DRAFT REV 2 HEADLINE'), false);

    const pubCtxMatch = livePubPage.text.match(/const VIEWER_CONTEXT_TOKEN = "([^"]+)"/);
    const pubSessMatch = livePubPage.text.match(/const SESSION_ID = "([^"]+)"/);
    assert.ok(pubCtxMatch && pubCtxMatch[1]);
    assert.ok(pubSessMatch && pubSessMatch[1]);
    const pubContextToken = pubCtxMatch[1];
    const pubSessionId = pubSessMatch[1];

    // Public FAQ query uses Published Snapshot Rev #1 ('2 mL (2 full droppers)')
    const pubQa = await httpReq('/api/webinars/yu-sleep/qa', {
      method: 'POST',
      headers: { 'X-Viewer-Context': pubContextToken },
      body: { question: 'What is the serving size and how much Vitamin B2 is in it?' }
    });
    assert.strictEqual(pubQa.status, 200);
    assert.ok(pubQa.json.answer.includes('2 mL (2 full droppers)'));
    assert.ok(pubQa.json.answer.includes('0.5 mg'));
    assert.ok(pubQa.json.answer.includes('38%'));

    // Spoofed payload.sessionId on /track must be rejected with 400 SESSION_ID_MISMATCH
    const spoofedTrack = await httpReq('/api/webinars/yu-sleep/track', {
      method: 'POST',
      headers: { 'X-Viewer-Context': pubContextToken },
      body: {
        eventType: 'pageview',
        sessionId: 'spoofed_session_id_override'
      }
    });
    assert.strictEqual(spoofedTrack.status, 400);
    assert.strictEqual(spoofedTrack.json.code, 'SESSION_ID_MISMATCH');

    // Valid watch_interval bound to signed sessionId
    const pubTrack = await httpReq('/api/webinars/yu-sleep/track', {
      method: 'POST',
      headers: { 'X-Viewer-Context': pubContextToken },
      body: {
        sessionId: pubSessionId,
        eventType: 'watch_interval',
        intervalStart: 10,
        intervalEnd: 20,
        eventId: 'e2e_interval_1'
      }
    });
    assert.strictEqual(pubTrack.status, 200);
    assert.strictEqual(pubTrack.json.sessionMetrics.uniqueWatchedSeconds, 10);
    assert.strictEqual(pubTrack.json.analytics.milestones.p25, 1);

    // Public registration with marketingConsentGiven: true -> queued in durable Brevo outbox
    const pubRegConsent = await httpReq('/api/webinars/yu-sleep/register', {
      method: 'POST',
      headers: { 'X-Viewer-Context': pubContextToken },
      body: {
        email: 'e2e_outbox@example.com',
        name: 'E2E Outbox User',
        registrationRequested: true,
        marketingConsentGiven: true
      }
    });
    assert.strictEqual(pubRegConsent.status, 200);
    assert.strictEqual(pubRegConsent.json.brevoStatus, 'CONTACT_SYNC_QUEUED');
    assert.ok(pubRegConsent.json.brevoOutboxJobId);

    // Check admin Brevo outbox endpoint
    const outboxInspect1 = await httpReq('/api/webinars/yu-sleep/brevo-outbox', {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    assert.strictEqual(outboxInspect1.status, 200);
    assert.strictEqual(outboxInspect1.json.outbox.counts.queued, 1);

    // Viewer withdraws marketing consent via POST /api/webinars/yu-sleep/consent -> cancels queued outbox job
    const withdrawConsentRes = await httpReq('/api/webinars/yu-sleep/consent', {
      method: 'POST',
      headers: { 'X-Viewer-Context': pubContextToken },
      body: {
        email: 'e2e_outbox@example.com',
        marketingConsentGiven: false
      }
    });
    assert.strictEqual(withdrawConsentRes.status, 200);
    assert.strictEqual(withdrawConsentRes.json.brevoStatus, 'CONSENT_CANCELLED');
    assert.strictEqual(withdrawConsentRes.json.outboxJobStatus, 'CONSENT_CANCELLED');

    const outboxInspect2 = await httpReq('/api/webinars/yu-sleep/brevo-outbox', {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    assert.strictEqual(outboxInspect2.status, 200);
    assert.strictEqual(outboxInspect2.json.outbox.processingMode, 'DISABLED');
    assert.strictEqual(outboxInspect2.json.outbox.autoRunnerEnabled, false);
    assert.strictEqual(outboxInspect2.json.outbox.emailDeliveryMode, 'CONTACT_SYNC_ONLY_NO_EMAIL_SENT');
    assert.strictEqual(outboxInspect2.json.outbox.counts.queued, 0);
    assert.strictEqual(outboxInspect2.json.outbox.counts.consentCancelled, 1);

    const listWithHealth = await httpReq('/api/webinars', {
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` }
    });
    assert.strictEqual(listWithHealth.status, 200);
    assert.strictEqual(listWithHealth.json.storeHealth.healthy, true);
    assert.strictEqual(listWithHealth.json.webinars[0].persistenceModel.supportsSharedVolumeAcrossHosts, false);
    console.log('   [PASS] Live snapshot isolation, sessionId spoof rejection, storeHealth, and durable Brevo outbox consent cancellation verified.');

    console.log('8. Testing Concurrent Second Process Rejection (Single-Writer Lock Enforcement)...');
    // Attempt to spawn a second server.js pointing at the SAME tmpDataDir -> must fail to start with CONCURRENT_WRITER_REJECTED
    const secondChildResult = await new Promise((resolve) => {
      let stderrText = '';
      const child2 = spawn(process.execPath, ['server.js'], {
        cwd: __dirname,
        env: {
          ...process.env,
          PORT: '3989',
          HOST: '127.0.0.1',
          WEBINAR_DATA_DIR: tmpDataDir,
          WEBINAR_ADMIN_TOKEN: ADMIN_TOKEN,
          WEBINAR_SESSION_SECRET: SESSION_SECRET,
          WEBINAR_DISABLE_BACKGROUND_DAEMONS: 'true'
        },
        stdio: ['ignore', 'pipe', 'pipe']
      });
      child2.stderr.on('data', (chunk) => {
        stderrText += chunk.toString();
      });
      child2.on('exit', (code) => {
        resolve({ code, stderrText });
      });
    });
    assert.strictEqual(secondChildResult.code, 1);
    assert.ok(secondChildResult.stderrText.includes('Concurrent writer rejected'), 'Second writer process must exit with Concurrent writer rejected error');
    console.log('   [PASS] Second writer process against the same WEBINAR_DATA_DIR rejected cleanly.');

    console.log('9. Testing Production Mode Cookie Security (`Secure` Flag & Proxy Trust) over HTTP...');
    const prodChild = spawn(process.execPath, ['server.js'], {
      cwd: __dirname,
      env: {
        ...process.env,
        NODE_ENV: 'production',
        PORT: String(PROD_PORT),
        HOST: '127.0.0.1',
        WEBINAR_DATA_DIR: tmpProdDir,
        WEBINAR_ADMIN_TOKEN: ADMIN_TOKEN,
        WEBINAR_VIEWER_TOKEN: VIEWER_TOKEN,
        WEBINAR_SESSION_SECRET: SESSION_SECRET,
        WEBINAR_TRUST_PROXY: 'true',
        WEBINAR_TRUSTED_PROXY_IPS: '127.0.0.1,::1,::ffff:127.0.0.1',
        WEBINAR_BREVO_LIVE: 'false',
        WEBINAR_DISABLE_BACKGROUND_DAEMONS: 'true'
      },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    try {
      await waitForServer(PROD_BASE_URL);

      // Plain HTTP without X-Forwarded-Proto: https in production must be rejected with 403 HTTPS_REQUIRED_IN_PRODUCTION
      const plainHttpProdLogin = await httpReq('/api/admin/session', {
        baseUrl: PROD_BASE_URL,
        method: 'POST',
        body: { token: ADMIN_TOKEN }
      });
      assert.strictEqual(plainHttpProdLogin.status, 403);
      assert.strictEqual(plainHttpProdLogin.json.code, 'HTTPS_REQUIRED_IN_PRODUCTION');

      // Request from trusted proxy (127.0.0.1) with X-Forwarded-Proto: https succeeds and sets `; Secure`
      const httpsProdLogin = await httpReq('/api/admin/session', {
        baseUrl: PROD_BASE_URL,
        method: 'POST',
        headers: { 'X-Forwarded-Proto': 'https' },
        body: { token: ADMIN_TOKEN }
      });
      assert.strictEqual(httpsProdLogin.status, 200);
      const prodSetCookie = httpsProdLogin.headers.get('set-cookie');
      assert.ok(prodSetCookie && prodSetCookie.includes('; Secure'), 'Production Set-Cookie must include Secure attribute');
      assert.ok(prodSetCookie.includes('HttpOnly') && prodSetCookie.includes('SameSite=Strict'));

      // Logout in production also includes `; Secure` on the clearing cookie
      const httpsProdLogout = await httpReq('/api/admin/session', {
        baseUrl: PROD_BASE_URL,
        method: 'DELETE',
        headers: {
          Cookie: prodSetCookie.split(';')[0],
          'X-Forwarded-Proto': 'https'
        }
      });
      assert.strictEqual(httpsProdLogout.status, 200);
      const prodClearCookie = httpsProdLogout.headers.get('set-cookie');
      assert.ok(prodClearCookie && prodClearCookie.includes('Max-Age=0') && prodClearCookie.includes('; Secure'));
      console.log('   [PASS] Production cookie security (`; Secure` on login & logout and HTTPS enforcement) verified.\n');
    } finally {
      prodChild.kill('SIGTERM');
    }

    console.log('=== ALL END-TO-END HTTP VERIFICATION CHECKS PASSED 100% ===');
  } finally {
    child.kill('SIGTERM');
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
    fs.rmSync(tmpProdDir, { recursive: true, force: true });
  }
}

runE2E().catch((err) => {
  console.error('E2E TEST FAILURE:', err);
  process.exit(1);
});
