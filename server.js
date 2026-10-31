const http = require('http');
const fs = require('fs');
const path = require('path');

// Load local .env if present (zero external dependencies)
const envPath = path.join(__dirname, '.env');
if (fs.existsSync(envPath)) {
  fs.readFileSync(envPath, 'utf8')
    .split(/\r?\n/)
    .forEach((line) => {
      const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
      if (match && !process.env[match[1]]) {
        process.env[match[1]] = (match[2] || '').replace(/^['"]|['"]$/g, '');
      }
    });
}

const PORT = Number(process.env.PORT || 3000);
const HOST = process.env.HOST || '0.0.0.0';
const BREVO_API_KEY = process.env.BREVO_API_KEY || '';
const BREVO_LIST_ID = Number(process.env.BREVO_LIST_ID || 80); // List #80: Viral Traffic Matrix Giveaways
const BREVO_WELCOME_TEMPLATE_ID = Number(process.env.BREVO_WELCOME_TEMPLATE_ID || 886); // Template #886: Viral Traffic Matrix Welcome

const server = http.createServer(async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Healthcheck endpoint for Coolify
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', uptime: process.uptime() }));
  }

  // POST /api/subscribe -> Push lead into Brevo List #80 + Send Welcome Email #886
  if (req.method === 'POST' && req.url === '/api/subscribe') {
    let body = '';
    req.on('data', (chunk) => {
      body += chunk.toString();
    });
    req.on('end', async () => {
      try {
        const { email, firstName, sponsorCode } = JSON.parse(body || '{}');
        if (!email || !email.includes('@')) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: 'Valid email is required' }));
        }

        if (!BREVO_API_KEY) {
          console.warn('[Brevo Warning] BREVO_API_KEY is not set in environment variables');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: true, warning: 'BREVO_API_KEY not configured' }));
        }

        const cleanEmail = email.trim().toLowerCase();
        const payload = {
          email: cleanEmail,
          updateEnabled: true,
          listIds: [BREVO_LIST_ID],
          attributes: {
            FIRSTNAME: firstName || 'Partner',
            LANDING_VARIANT: 'Viral_Traffic_Matrix_Giveaway',
            SPONSOR_CODE: sponsorCode || '144'
          }
        };

        const brevoRes = await fetch('https://api.brevo.com/v3/contacts', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'api-key': BREVO_API_KEY
          },
          body: JSON.stringify(payload)
        });

        let brevoData = {};
        const text = await brevoRes.text();
        if (text) {
          try {
            brevoData = JSON.parse(text);
          } catch (_) {}
        }

        if (!brevoRes.ok) {
          console.error('[Brevo Contact Error]', brevoRes.status, brevoData);
          res.writeHead(brevoRes.status, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: brevoData.message || 'Brevo API error' }));
        }

        // Send Instant Welcome Email (Template #886) with 144-34-3-32.html link
        const emailRes = await fetch('https://api.brevo.com/v3/smtp/email', {
          method: 'POST',
          headers: {
            Accept: 'application/json',
            'Content-Type': 'application/json',
            'api-key': BREVO_API_KEY
          },
          body: JSON.stringify({
            to: [{ email: cleanEmail }],
            templateId: BREVO_WELCOME_TEMPLATE_ID
          })
        });

        const emailJson = await emailRes.json().catch(() => ({}));
        console.log(
          `✅ Lead added to List #${BREVO_LIST_ID} & Welcome Email #${BREVO_WELCOME_TEMPLATE_ID} sent to ${cleanEmail}`,
          emailJson
        );

        res.writeHead(200, { 'Content-Type': 'application/json' });
        return res.end(
          JSON.stringify({
            ok: true,
            listId: BREVO_LIST_ID,
            templateId: BREVO_WELCOME_TEMPLATE_ID,
            data: brevoData
          })
        );
      } catch (err) {
        console.error('[Subscribe Handler Error]', err.message);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // Serve index.html
  if ((req.method === 'GET' || req.method === 'HEAD') && (req.url === '/' || req.url.startsWith('/?') || req.url.startsWith('/index.html'))) {
    const filePath = path.join(__dirname, 'index.html');
    fs.readFile(filePath, 'utf8', (err, content) => {
      if (err) {
        res.writeHead(500);
        return res.end('Error loading index.html');
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    });
    return;
  }

  res.writeHead(404);
  res.end('Not found');
});

server.listen(PORT, HOST, () => {
  console.log(`🚀 Viral Giveaway Lander running at http://${HOST}:${PORT}`);
});
