/**
 * End-to-End HTTP Security, Lifecycle, Reference, Registration & Analytics Verification Suite
 * Spawns server.js on an isolated ephemeral port with an isolated temporary WEBINAR_DATA_DIR.
 * Never mutates workspace state files or contacts external APIs.
 */

const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawn } = require('child_process');

const PORT = 3981;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const ADMIN_TOKEN = 'e2e-admin-secret-token-777';
const VIEWER_TOKEN = 'e2e-viewer-readonly-token-333';
const SESSION_SECRET = 'e2e-session-hmac-secret-555';

async function httpReq(urlPath, { method = 'GET', headers = {}, body = null } = {}) {
  const opts = {
    method,
    headers: { ...headers }
  };
  if (body !== null) {
    opts.headers['Content-Type'] = 'application/json';
    opts.body = JSON.stringify(body);
  }
  const res = await fetch(`${BASE_URL}${urlPath}`, opts);
  const text = await res.text();
  let json = null;
  try {
    json = JSON.parse(text);
  } catch (_) {}
  return { status: res.status, headers: res.headers, text, json };
}

async function waitForServer(maxWaitMs = 8000) {
  const start = Date.now();
  while (Date.now() - start < maxWaitMs) {
    try {
      const r = await httpReq('/health');
      if (r.status === 200) return;
    } catch (_) {}
    await new Promise((r) => setTimeout(r, 150));
  }
  throw new Error('Server failed to start within timeout');
}

async function runE2E() {
  console.log('=== Running End-to-End HTTP Verification Suite ===\n');
  const tmpDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'webinar-e2e-http-'));

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
      WEBINAR_BREVO_LIVE: 'false'
    },
    stdio: ['ignore', 'pipe', 'pipe']
  });

  try {
    await waitForServer();
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

    // Cookie mutation without X-CSRF-Token must fail with 403
    const noCsrfMutate = await httpReq('/api/webinars/yu-sleep', {
      method: 'PUT',
      headers: { Cookie: cookiePair },
      body: { headline: 'CSRF Bypass Attempt' }
    });
    assert.strictEqual(noCsrfMutate.status, 403);

    // Cookie mutation with valid X-CSRF-Token succeeds and ignores forged body.actor
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

    // Viewer APIs with forged isPreview:true must return 403 when draft is unpublished and no valid viewerContextToken is supplied
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

    // Extract viewerContextToken and SLUG embedded in preview page
    const slugMatch = previewPage.text.match(/const SLUG = "([^"]+)"/);
    assert.ok(slugMatch && slugMatch[1] === 'yu-sleep', 'Preview page must embed SLUG = "yu-sleep"');
    const ctxMatch = previewPage.text.match(/const VIEWER_CONTEXT_TOKEN = "([^"]+)"/);
    assert.ok(ctxMatch && ctxMatch[1], 'Preview page must embed signed viewerContextToken');
    const previewContextToken = ctxMatch[1];

    // Verify HTTP 206 Range streaming for the local prototype MP4
    const rangeRes = await fetch(`${BASE_URL}/videos/yusleep-presenter-prototype.mp4`, {
      headers: { Range: 'bytes=0-1023' }
    });
    assert.strictEqual(rangeRes.status, 206);
    assert.strictEqual(rangeRes.headers.get('accept-ranges'), 'bytes');

    // Revoke preview link and verify immediate rejection
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

    console.log('6. Testing Approval, Publish, Live Snapshot Isolation Across Draft Edits & Viewer APIs...');
    // Approve Rev #1
    const approveRes = await httpReq('/api/webinars/yu-sleep/status', {
      method: 'POST',
      headers: { Authorization: `Bearer ${ADMIN_TOKEN}` },
      body: { action: 'APPROVE', note: 'Approve Rev 1' }
    });
    assert.strictEqual(approveRes.status, 200);

    // Publish Rev #1
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

    // Public viewer page must still show Published Rev #1 headline and '2 mL (2 full droppers)'
    const livePubPage = await httpReq('/webinar/yu-sleep');
    assert.strictEqual(livePubPage.status, 200);
    assert.ok(livePubPage.text.includes('YuSleep: Let Us Look Beyond the Sales Pitch'));
    assert.strictEqual(livePubPage.text.includes('UNAPPROVED DRAFT REV 2 HEADLINE'), false);

    const pubCtxMatch = livePubPage.text.match(/const VIEWER_CONTEXT_TOKEN = "([^"]+)"/);
    assert.ok(pubCtxMatch && pubCtxMatch[1]);
    const pubContextToken = pubCtxMatch[1];

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

    // Public registration + watch interval tracking
    const pubReg = await httpReq('/api/webinars/yu-sleep/register', {
      method: 'POST',
      headers: { 'X-Viewer-Context': pubContextToken },
      body: {
        email: 'e2e_viewer@example.com',
        name: 'E2E Viewer',
        registrationRequested: true,
        marketingConsentGiven: false
      }
    });
    assert.strictEqual(pubReg.status, 200);
    assert.strictEqual(pubReg.json.brevoStatus, 'NOT_APPLICABLE_NO_MARKETING_CONSENT');

    const pubTrack = await httpReq('/api/webinars/yu-sleep/track', {
      method: 'POST',
      headers: { 'X-Viewer-Context': pubContextToken },
      body: {
        eventType: 'watch_interval',
        intervalStart: 10,
        intervalEnd: 20,
        eventId: 'e2e_interval_1'
      }
    });
    assert.strictEqual(pubTrack.status, 200);
    assert.strictEqual(pubTrack.json.sessionMetrics.uniqueWatchedSeconds, 10);
    assert.strictEqual(pubTrack.json.analytics.milestones.p25, 1);

    // Public metadata endpoint excludes previewLinks, draft, and auditLog
    const pubMeta = await httpReq('/api/public/webinars/yu-sleep');
    assert.strictEqual(pubMeta.status, 200);
    assert.strictEqual(pubMeta.json.webinar.previewLinks, undefined);
    assert.strictEqual(pubMeta.json.webinar.draft, undefined);
    assert.strictEqual(pubMeta.json.webinar.auditLog, undefined);
    console.log('   [PASS] Live published snapshot isolated from draft edits; FAQ, registration, and interval tracking verified.\n');

    console.log('=== ALL END-TO-END HTTP VERIFICATION CHECKS PASSED 100% ===');
  } finally {
    child.kill('SIGTERM');
    fs.rmSync(tmpDataDir, { recursive: true, force: true });
  }
}

runE2E().catch((err) => {
  console.error('E2E TEST FAILURE:', err);
  process.exit(1);
});
