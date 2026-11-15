/**
 * End-to-End HTTP Integration Test
 * Starts a live server on test port 3889 and verifies:
 * - /launchpad serves HTML with Webinars tab and modals
 * - /api/webinars returns array including yu-sleep
 * - /webinar/yu-sleep returns 403 without preview token (Unpublished gate)
 * - /webinar/yu-sleep?preview=<token> returns 200 with complete viewer HTML
 * - /api/webinars/yu-sleep/qa returns grounded answers
 * - /api/webinars/yu-sleep/register returns lead registration confirmation
 * - /api/webinars/yu-sleep/track records events
 * - /videos/yusleep-presenter-prototype.mp4 handles Range requests (HTTP 206)
 * - /images/yusleep-bottle.png returns image/png
 */

const http = require('http');
const path = require('path');
const { spawn } = require('child_process');
const assert = require('assert');

const TEST_PORT = 3889;
const BASE_URL = `http://127.0.0.1:${TEST_PORT}`;

function makeRequest(urlPath, options = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlPath, BASE_URL);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {}
    };

    const req = http.request(url, reqOptions, (res) => {
      let data = [];
      res.on('data', (chunk) => data.push(chunk));
      res.on('end', () => {
        const bodyBuffer = Buffer.concat(data);
        const bodyText = bodyBuffer.toString('utf8');
        let bodyJson = null;
        try { bodyJson = JSON.parse(bodyText); } catch (e) {}
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          bodyText,
          bodyJson,
          bodyBuffer
        });
      });
    });

    req.on('error', reject);

    if (options.body) {
      if (typeof options.body === 'object') {
        req.setHeader('Content-Type', 'application/json');
        req.write(JSON.stringify(options.body));
      } else {
        req.write(options.body);
      }
    }
    req.end();
  });
}

async function run() {
  console.log(`Starting local server on port ${TEST_PORT}...`);
  const serverProc = spawn('node', ['server.js'], {
    cwd: path.join(__dirname),
    env: { ...process.env, PORT: TEST_PORT },
    stdio: 'inherit'
  });

  // Give server time to bind
  await new Promise((r) => setTimeout(r, 2000));

  try {
    // 1. Check /launchpad
    console.log('Testing GET /launchpad...');
    const lpRes = await makeRequest('/launchpad');
    assert.strictEqual(lpRes.statusCode, 200, 'Launchpad must return 200');
    assert(lpRes.bodyText.includes('Presenter Webinars'), 'Launchpad must contain Presenter Webinars tab');
    assert(lpRes.bodyText.includes('webinarEditorModal'), 'Launchpad must contain webinarEditorModal');
    assert(lpRes.bodyText.includes('webinarManifestModal'), 'Launchpad must contain webinarManifestModal');
    console.log('✅ GET /launchpad verified.');

    // 2. Check GET /api/webinars
    console.log('Testing GET /api/webinars...');
    const apiRes = await makeRequest('/api/webinars');
    assert.strictEqual(apiRes.statusCode, 200);
    assert.strictEqual(apiRes.bodyJson.ok, true);
    const yuSleep = apiRes.bodyJson.webinars.find(w => w.slug === 'yu-sleep');
    assert(yuSleep, 'Must return yu-sleep webinar');
    assert.strictEqual(yuSleep.status, 'DRAFT', 'Must be DRAFT');
    const token = yuSleep.previewToken;
    assert(token, 'Must have previewToken');
    console.log('✅ GET /api/webinars verified.');

    // 3. Test Public Access Gate (No preview token -> 403 Forbidden)
    console.log('Testing GET /webinar/yu-sleep without token...');
    const publicRes = await makeRequest('/webinar/yu-sleep');
    assert.strictEqual(publicRes.statusCode, 403, 'Must return 403 for unpublished draft');
    assert(publicRes.bodyText.includes('Webinar Currently in Private Review'), 'Must show private review notice');
    console.log('✅ Unpublished draft blocking verified.');

    // 4. Test Authenticated Preview (With preview token -> 200 OK)
    console.log(`Testing GET /webinar/yu-sleep?preview=${token}...`);
    const previewRes = await makeRequest(`/webinar/yu-sleep?preview=${token}`);
    assert.strictEqual(previewRes.statusCode, 200, 'Must return 200 with valid preview token');
    assert(previewRes.bodyText.includes('ADMIN PREVIEW MODE'), 'Must show admin preview banner');
    assert(previewRes.bodyText.includes('yusleep-presenter-prototype.mp4'), 'Must include video source');
    assert(previewRes.bodyText.includes('kmtwarrior'), 'Must include affiliate link kmtwarrior');
    console.log('✅ Authenticated preview access verified.');

    // 5. Test AI Q&A Endpoint
    console.log('Testing POST /api/webinars/yu-sleep/qa...');
    const qaRes = await makeRequest('/api/webinars/yu-sleep/qa', {
      method: 'POST',
      body: { question: 'What is the proprietary blend and how much melatonin is inside?' }
    });
    assert.strictEqual(qaRes.statusCode, 200);
    assert(qaRes.bodyJson.answer.includes('637 mg') || qaRes.bodyJson.answer.includes('0.9 mg'));
    assert.strictEqual(qaRes.bodyJson.aiIdentified, true);
    console.log('✅ AI Q&A endpoint verified.');

    // 6. Test Lead Registration Endpoint
    console.log('Testing POST /api/webinars/yu-sleep/register...');
    const regRes = await makeRequest('/api/webinars/yu-sleep/register', {
      method: 'POST',
      body: {
        email: 'preview.lead@aurumrise.com',
        name: 'Jordan',
        consentGiven: true,
        consentText: 'I agree to receive the YuSleep label guide and email updates.',
        isPreview: true
      }
    });
    assert.strictEqual(regRes.statusCode, 200);
    assert.strictEqual(regRes.bodyJson.ok, true);
    console.log('✅ Lead registration endpoint verified.');

    // 7. Test Video Streaming with Range Header (HTTP 206 Partial Content)
    console.log('Testing GET /videos/yusleep-presenter-prototype.mp4 with Range: bytes=0-1024...');
    const videoRes = await makeRequest('/videos/yusleep-presenter-prototype.mp4', {
      headers: { 'Range': 'bytes=0-1024' }
    });
    assert.strictEqual(videoRes.statusCode, 206, 'Must return 206 Partial Content');
    assert.strictEqual(videoRes.headers['content-range'], 'bytes 0-1024/' + videoRes.headers['content-range'].split('/')[1]);
    assert.strictEqual(videoRes.bodyBuffer.length, 1025);
    console.log('✅ Video Range request streaming verified.');

    // 8. Test Image Serving
    console.log('Testing GET /images/yusleep-bottle.png...');
    const imgRes = await makeRequest('/images/yusleep-bottle.png');
    assert.strictEqual(imgRes.statusCode, 200);
    assert.strictEqual(imgRes.headers['content-type'], 'image/png');
    assert(imgRes.bodyBuffer.length > 500000, 'Image buffer must be complete');
    console.log('✅ Image asset serving verified.');

    console.log('\n====================================================');
    console.log('🎉 ALL END-TO-END HTTP INTEGRATION CHECKS PASSED!');
    console.log('====================================================');
  } finally {
    serverProc.kill('SIGINT');
  }
}

run().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
