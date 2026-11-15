// Privacy Policy and Terms of Service Pages
// Fully compliant with TikTok Developer Content Sharing Guidelines, Meta Platform Policies & Google API Services

function renderPrivacyPolicy(host = 'traffic.aisimplesystem.com') {
  return `<!DOCTYPE html>
<html lang="en" class="bg-slate-950 text-slate-100">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Privacy Policy | AI Simple Systems</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>
<body class="min-h-screen p-6 sm:p-12 max-w-4xl mx-auto leading-relaxed">
  <header class="mb-10 pb-6 border-b border-slate-800">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold mb-4">
      Official Legal Disclosure • Last Updated: November 2026
    </div>
    <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Privacy Policy</h1>
    <p class="text-slate-400 text-sm mt-2">AI Simple Systems & Content Publishing Suite</p>
  </header>

  <section class="space-y-8 text-slate-300 text-sm sm:text-base">
    <div>
      <h2 class="text-xl font-bold text-white mb-2">1. Overview & Scope</h2>
      <p>AI Simple Systems ("we", "us", or "our") operates content scheduling and landing infrastructure at <strong class="text-white">https://${host}</strong>. This Privacy Policy outlines how our application connects to third-party social media platforms including TikTok, YouTube, and Meta (Facebook & Instagram) via official developer APIs.</p>
    </div>

    <div>
      <h2 class="text-xl font-bold text-white mb-2">2. Information We Access via Third-Party APIs</h2>
      <p>When you connect an account (e.g. TikTok, YouTube, Meta) to our publishing system:</p>
      <ul class="list-disc list-inside mt-2 space-y-1 text-slate-300">
        <li><strong class="text-white">Profile Identifiers:</strong> Basic username, account name, and profile avatar URL solely to identify connected channels in your dashboard.</li>
        <li><strong class="text-white">OAuth Authorization Tokens:</strong> Secure access tokens stored in an encrypted database to authorize scheduling and publishing actions you initiate.</li>
        <li><strong class="text-white">Published Video Metadata:</strong> Post titles, captions, and publication statuses returned by API endpoints.</li>
      </ul>
      <p class="mt-2 text-slate-400">We do <strong>not</strong> access your private direct messages, contacts, payment details, or browsing history.</p>
    </div>

    <div>
      <h2 class="text-xl font-bold text-white mb-2">3. How Information Is Used</h2>
      <p>All data retrieved through third-party APIs is used exclusively for:</p>
      <ul class="list-disc list-inside mt-2 space-y-1 text-slate-300">
        <li>Transmitting authorized video content and captions to your designated channels.</li>
        <li>Checking upload statuses and reporting publishing confirmations.</li>
      </ul>
      <p class="mt-2">We never sell, rent, or trade your data or API tokens to any third-party marketing or advertising networks.</p>
    </div>

    <div>
      <h2 class="text-xl font-bold text-white mb-2">4. Data Storage & Security</h2>
      <p>All authentication credentials and API keys are stored in private, firewall-protected database instances encrypted at rest. Network communications strictly use Transport Layer Security (TLS 1.3 / HTTPS encryption).</p>
    </div>

    <div>
      <h2 class="text-xl font-bold text-white mb-2">5. User Data Deletion & Revocation</h2>
      <p>You can revoke access to our application at any time:</p>
      <ul class="list-disc list-inside mt-2 space-y-1 text-slate-300">
        <li><strong class="text-white">TikTok:</strong> Settings ➔ Security ➔ Manage App Permissions ➔ Revoke AI Simple Systems.</li>
        <li><strong class="text-white">Google / YouTube:</strong> Google Account Settings ➔ Security ➔ Third-party apps with account access.</li>
        <li><strong class="text-white">Meta / Facebook:</strong> Facebook Settings ➔ Business Integrations.</li>
      </ul>
      <p class="mt-2">Upon revocation, all corresponding tokens stored in our system are invalidated immediately. To request complete deletion of any stored logs, email <strong class="text-emerald-400">support@aisimplesystem.com</strong>.</p>
    </div>

    <div>
      <h2 class="text-xl font-bold text-white mb-2">6. Contact</h2>
      <p>For questions or privacy inquiries, contact: <strong class="text-white">support@aisimplesystem.com</strong>.</p>
    </div>
  </section>

  <footer class="mt-16 pt-6 border-t border-slate-800 text-xs text-slate-500 text-center">
    © ${new Date().getFullYear()} AI Simple Systems • All rights reserved.
  </footer>
</body>
</html>`;
}

function renderTermsOfService(host = 'traffic.aisimplesystem.com') {
  return `<!DOCTYPE html>
<html lang="en" class="bg-slate-950 text-slate-100">
<head>
  <meta charset="utf-8"/>
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>Terms of Service | AI Simple Systems</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>body { font-family: 'Plus Jakarta Sans', sans-serif; }</style>
</head>
<body class="min-h-screen p-6 sm:p-12 max-w-4xl mx-auto leading-relaxed">
  <header class="mb-10 pb-6 border-b border-slate-800">
    <div class="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-bold mb-4">
      Terms & Conditions • Effective: November 2026
    </div>
    <h1 class="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">Terms of Service</h1>
    <p class="text-slate-400 text-sm mt-2">AI Simple Systems Social Management & Publishing Platform</p>
  </header>

  <section class="space-y-8 text-slate-300 text-sm sm:text-base">
    <div>
      <h2 class="text-xl font-bold text-white mb-2">1. Agreement to Terms</h2>
      <p>By using the AI Simple Systems publishing software hosted at <strong class="text-white">https://${host}</strong>, you agree to comply with and be bound by these Terms of Service and all applicable platform developer terms.</p>
    </div>

    <div>
      <h2 class="text-xl font-bold text-white mb-2">2. Platform Rules & Compliance</h2>
      <p>Users must comply with the terms of service of each connected platform:</p>
      <ul class="list-disc list-inside mt-2 space-y-1 text-slate-300">
        <li>TikTok Community Guidelines & Developer Terms of Service</li>
        <li>YouTube Terms of Service & Google API Services User Data Policy</li>
        <li>Meta Platform Terms & Facebook Community Standards</li>
      </ul>
      <p class="mt-2">You agree not to publish deceptive, malicious, infringing, or abusive material through this service.</p>
    </div>

    <div>
      <h2 class="text-xl font-bold text-white mb-2">3. Content Ownership & Rights</h2>
      <p>You retain full ownership and intellectual property rights to all video media, scripts, and creative assets published through the system.</p>
    </div>

    <div>
      <h2 class="text-xl font-bold text-white mb-2">4. Service Availability & Disclaimers</h2>
      <p>Our service is provided on an "as-is" and "as-available" basis. We are not liable for any social media platform outages, policy changes, API rate limits, or account restrictions imposed by third-party platforms.</p>
    </div>

    <div>
      <h2 class="text-xl font-bold text-white mb-2">5. Contact Information</h2>
      <p>Inquiries regarding these terms may be directed to: <strong class="text-cyan-400">support@aisimplesystem.com</strong>.</p>
    </div>
  </section>

  <footer class="mt-16 pt-6 border-t border-slate-800 text-xs text-slate-500 text-center">
    © ${new Date().getFullYear()} AI Simple Systems • All rights reserved.
  </footer>
</body>
</html>`;
}

module.exports = {
  renderPrivacyPolicy,
  renderTermsOfService
};
