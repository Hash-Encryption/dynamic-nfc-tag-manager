require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const path = require('path');
const crypto = require('crypto');
const db = require('./db');

const app = express();
const PORT = process.env.PORT || 3000;
const SESSION_SECRET = process.env.SESSION_SECRET || 'nfc-dynamic-manager-secret-key-2026';

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(cookieParser(SESSION_SECRET));

// Enforce HTTPS in Production environments behind SSL/TLS proxies
app.use((req, res, next) => {
  const isHttps = req.secure || req.headers['x-forwarded-proto'] === 'https';
  if (!isHttps && process.env.NODE_ENV === 'production') {
    return res.redirect(301, `https://${req.headers.host}${req.url}`);
  }
  next();
});

// Zero-Trust Security Headers Middleware (A+ Security Hardening)
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Permissions-Policy', 'geolocation=(self), microphone=(), camera=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.tailwindcss.com https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.jsdelivr.net https://api.npoint.io https://www.npoint.io https://raw.githubusercontent.com data: blob:; img-src 'self' data: blob: https:; font-src 'self' https://fonts.gstatic.com data:;"
  );
  next();
});

// --- In-Memory Zero-Trust Rate Limiters ---
const scanRateLimit = new Map();       // Key: IP_slug -> timestamp
const loginAttempts = new Map();       // Key: IP -> { count, firstAttempt, lockedUntil }
const pinAttempts = new Map();         // Key: IP_slug -> { count, firstAttempt, lockedUntil }
const leadSubmissions = new Map();     // Key: IP -> timestamps[]

// Periodic garbage collection for rate limiters (Every 5 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, timestamp] of scanRateLimit.entries()) {
    if (now - timestamp > 60000) scanRateLimit.delete(key);
  }
  for (const [key, rec] of loginAttempts.entries()) {
    if (rec.lockedUntil && now > rec.lockedUntil + 15 * 60 * 1000) loginAttempts.delete(key);
    else if (!rec.lockedUntil && now - rec.firstAttempt > 15 * 60 * 1000) loginAttempts.delete(key);
  }
  for (const [key, rec] of pinAttempts.entries()) {
    if (rec.lockedUntil && now > rec.lockedUntil + 10 * 60 * 1000) pinAttempts.delete(key);
    else if (!rec.lockedUntil && now - rec.firstAttempt > 10 * 60 * 1000) pinAttempts.delete(key);
  }
  for (const [key, times] of leadSubmissions.entries()) {
    const active = times.filter(t => now - t < 10 * 60 * 1000);
    if (active.length === 0) leadSubmissions.delete(key);
    else leadSubmissions.set(key, active);
  }
}, 5 * 60 * 1000);

// CSRF Origin & Referer Shield Middleware for Mutation Requests
function csrfShield(req, res, next) {
  if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) return next();
  const origin = req.headers.origin || req.headers.referer;
  if (origin) {
    try {
      const originHost = new URL(origin).host;
      const host = req.headers.host;
      if (originHost && host && originHost !== host) {
        console.warn(`[Security Alert] CSRF Blocked: origin ${originHost} does not match host ${host}`);
        return res.status(403).json({ success: false, error: 'Cross-Origin Request Blocked (CSRF Shield)' });
      }
    } catch (e) {
      return res.status(403).json({ success: false, error: 'Malformed Origin Header' });
    }
  }
  next();
}
app.use('/api', csrfShield);

// Static files
app.use(express.static(path.join(__dirname, 'public')));

// Helper to detect device and browser from User-Agent
function parseUserAgent(ua = '') {
  ua = ua.toLowerCase();
  let deviceType = 'Desktop';
  if (/iphone/i.test(ua)) deviceType = 'iPhone';
  else if (/ipad/i.test(ua)) deviceType = 'iPad';
  else if (/android/i.test(ua)) deviceType = 'Android';
  else if (/macintosh/i.test(ua)) deviceType = 'Mac';
  else if (/windows/i.test(ua)) deviceType = 'Windows';
  else if (/linux/i.test(ua)) deviceType = 'Linux';

  let browser = 'Unknown Browser';
  if (/samsungbrowser/i.test(ua)) browser = 'Samsung Internet';
  else if (/chrome|crios/i.test(ua)) browser = 'Chrome';
  else if (/safari/i.test(ua) && !/chrome/i.test(ua)) browser = 'Safari';
  else if (/firefox|fxios/i.test(ua)) browser = 'Firefox';
  else if (/edg/i.test(ua)) browser = 'Edge';

  return { deviceType, browser };
}

// Generate vCard string helper (RFC 6350 / vCard 3.0) with UTF-8 BOM & Arabic support
function generateVCard(profile = {}, title = '') {
  const fullName = (profile.fullName || title || 'جهة اتصال NFC').trim();
  const nameParts = fullName.split(/\s+/);
  const firstName = nameParts[0] || fullName;
  const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';

  const phone = (profile.phone || profile.whatsapp || '').trim();
  const email = (profile.email || '').trim();
  const website = (profile.website || '').trim();
  const company = (profile.company || '').trim();
  const jobTitle = (profile.jobTitle || '').trim();
  const bio = (profile.bio || '').trim();
  const address = (profile.location || '').trim();

  const cleanBio = bio.replace(/\r\n/g, '\\n').replace(/\n/g, '\\n');
  const cleanAddress = address.replace(/\r\n/g, ' ').replace(/\n/g, ' ');

  let vcf = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    'PRODID:-//TapLink//NFC Smart Card//EN',
    `N;CHARSET=UTF-8:${lastName};${firstName};;;`,
    `FN;CHARSET=UTF-8:${fullName}`,
    jobTitle ? `TITLE;CHARSET=UTF-8:${jobTitle}` : '',
    company ? `ORG;CHARSET=UTF-8:${company}` : '',
    phone ? `TEL;TYPE=CELL,VOICE:${phone}` : '',
    email ? `EMAIL;TYPE=WORK,INTERNET:${email}` : '',
    website ? `URL:${website}` : '',
    cleanAddress ? `ADR;CHARSET=UTF-8;TYPE=WORK:;;${cleanAddress};;;;` : '',
    cleanBio ? `NOTE;CHARSET=UTF-8:${cleanBio}` : '',
    'REV:' + new Date().toISOString(),
    'END:VCARD'
  ];

  // Prepend \uFEFF (UTF-8 Byte Order Mark) for 100% Arabic decoding on iOS, Android, macOS & Windows
  return '\uFEFF' + vcf.filter(line => line.length > 0).join('\r\n') + '\r\n';
}

// Simple signed session helper
function createAuthToken() {
  const payload = 'admin:' + Date.now();
  const signature = crypto.createHmac('sha256', SESSION_SECRET).update(payload).digest('hex');
  return Buffer.from(`${payload}:${signature}`).toString('base64');
}

function verifyAuthToken(token) {
  if (!token) return false;
  try {
    const raw = Buffer.from(token, 'base64').toString('utf8');
    const [user, time, signature] = raw.split(':');
    if (user !== 'admin') return false;

    // Check expiration: 7 days max validity
    const tokenTime = parseInt(time, 10);
    if (isNaN(tokenTime) || Date.now() - tokenTime > 7 * 24 * 60 * 60 * 1000) {
      return false;
    }

    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(`${user}:${time}`).digest('hex');
    if (!signature || signature.length !== expectedSig.length) return false;
    return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig));
  } catch (e) {
    return false;
  }
}

// Auth Middleware for protected API routes
function requireAuth(req, res, next) {
  const token = req.cookies.admin_session || req.headers.authorization?.replace('Bearer ', '');
  if (verifyAuthToken(token)) {
    return next();
  }
  return res.status(401).json({ success: false, error: 'Unauthorized. Please sign in to the dashboard first.' });
}

// Render PIN Code Protected Lock Screen
function renderPinLockPage(card, currentPath, errorMsg = '') {
  return `
    <!DOCTYPE html>
    <html lang="en" dir="ltr">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>PIN Protected Link | ${card.title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800&family=Tajawal:wght@400;600;700;800&display=swap" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>body { font-family: 'Inter', 'Tajawal', sans-serif; }</style>
    </head>
    <body class="bg-[#050706] text-white min-h-screen flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-black">
      <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div class="absolute -top-40 -start-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-40 -end-40 w-96 h-96 bg-emerald-900/20 rounded-full blur-3xl"></div>
      </div>
      <div class="bg-zinc-950/90 border border-emerald-500/20 backdrop-blur-xl max-w-sm w-full p-6 sm:p-8 rounded-3xl text-center shadow-2xl">
        <div class="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/10">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
        </div>
        <span class="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold mb-2">
          PIN Protected Link
        </span>
        <h2 class="text-xl font-bold mb-1 text-white">${card.title}</h2>
        <p class="text-zinc-400 text-xs mb-6">Enter security PIN code to proceed to destination</p>

        ${errorMsg ? `<div class="bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs py-2 px-3 rounded-xl mb-4">${errorMsg}</div>` : ''}

        <form method="POST" action="${currentPath}/verify-pin" class="space-y-4">
          <input 
            type="password" 
            name="pin" 
            inputmode="numeric" 
            pattern="[0-9]*" 
            maxlength="8" 
            required 
            autofocus 
            placeholder="••••" 
            class="w-full text-center tracking-[1em] text-2xl font-mono py-3 bg-zinc-900 border border-zinc-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-zinc-500"
          >
          <button 
            type="submit" 
            class="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-95 text-white font-bold rounded-2xl transition-all shadow-lg shadow-emerald-600/30 text-sm"
          >
            Unlock Secret Link 🔓
          </button>
        </form>
        <p class="text-[11px] text-zinc-500 mt-6">TapLink Smart NFC Ecosystem &copy; 2026 • by MUHAB</p>
      </div>
    </body>
    </html>
  `;
}

// Render Smart Wi-Fi Tag Page
function renderWifiPage(card) {
  const wifi = card.wifi || {};
  const ssid = wifi.ssid || card.title || 'TapLink-WiFi';
  const pass = wifi.password || '';
  const enc = wifi.encryption || 'WPA';
  const qrData = `WIFI:S:${ssid};T:${enc};P:${pass};;`;

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>شبكة واي فاي الذكية | ${card.title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;800;900&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com"></script>
      <script src="/js/qrcode.min.js"></script>
      <style>body { font-family: 'Tajawal', 'Inter', sans-serif; }</style>
    </head>
    <body class="bg-[#050706] text-white min-h-screen flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-black">
      <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div class="absolute -top-40 -start-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-40 -end-40 w-96 h-96 bg-emerald-900/20 rounded-full blur-3xl"></div>
      </div>
      <div class="bg-zinc-950/90 border border-emerald-500/20 backdrop-blur-xl max-w-sm w-full p-6 sm:p-8 rounded-3xl text-center shadow-2xl space-y-4">
        <div class="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8.111 16.404a5.5 5.5 0 017.778 0M12 20h.01m-7.08-7.071c3.904-3.905 10.236-3.905 14.141 0M1.394 9.393c5.857-5.857 15.355-5.857 21.213 0"></path></svg>
        </div>
        <span class="inline-block px-3 py-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 rounded-full text-xs font-semibold">
          اتصال واي فاي ذكي • Smart Wi-Fi
        </span>
        <h2 class="text-xl font-extrabold text-white">${card.title}</h2>
        
        <div class="bg-zinc-900/90 border border-zinc-800 rounded-2xl p-4 text-start space-y-3">
          <div>
            <span class="text-[11px] text-zinc-400 block font-medium">اسم الشبكة (SSID)</span>
            <div class="text-base font-bold text-white font-mono flex items-center justify-between">
              <span>${ssid}</span>
              <span class="text-[10px] text-emerald-400 border border-emerald-500/30 px-1.5 py-0.5 rounded font-sans">${enc}</span>
            </div>
          </div>
          ${pass ? `
          <div>
            <span class="text-[11px] text-zinc-400 block font-medium">كلمة المرور</span>
            <div class="flex items-center justify-between gap-2 mt-1">
              <span class="font-mono text-sm text-emerald-300 font-bold tracking-wider" id="wifiPassText">${pass}</span>
              <button onclick="copyWifiPass()" id="btnCopyPass" class="px-3 py-1.5 bg-emerald-600/30 hover:bg-emerald-600/50 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/30 active:scale-95 transition-all flex items-center gap-1">
                <span>نسخ</span>
                <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
              </button>
            </div>
          </div>
          ` : '<p class="text-xs text-emerald-400 font-semibold">الشبكة مفتوحة بدون كلمة مرور</p>'}
        </div>

        <div class="bg-white p-3 rounded-2xl w-48 h-48 mx-auto flex items-center justify-center shadow-lg" id="wifiQrContainer">
        </div>
        <p class="text-[11px] text-zinc-400">امسح الرمز بكاميرا الهاتف للاتصال بالشبكة تلقائياً 📲</p>
        <p class="text-[10px] text-zinc-500 pt-2">TapLink Smart NFC &copy; 2026 • by MUHAB</p>
      </div>

      <script>
        function copyWifiPass() {
          navigator.clipboard.writeText('${pass}').then(() => {
            const btn = document.getElementById('btnCopyPass');
            btn.textContent = 'تم النسخ ✓';
            setTimeout(() => { btn.textContent = 'نسخ'; }, 2000);
          });
        }
        if (window.QRCode) {
          new QRCode(document.getElementById('wifiQrContainer'), {
            text: '${qrData}',
            width: 170,
            height: 170,
            colorDark: '#000000',
            colorLight: '#ffffff',
            correctLevel: QRCode.CorrectLevel.M
          });
        }
      </script>
    </body>
    </html>
  `;
}

// Render Lost & Found / SOS Emergency Page
function renderSosPage(card) {
  const sos = card.sos || {};
  const ownerName = sos.ownerName || card.title || 'صاحب الغرض';
  const phone = sos.phone || '';
  const whatsapp = sos.whatsapp || phone || '';
  const cleanPhone = phone.replace(/[^0-9+]/g, '');
  const cleanWa = whatsapp.replace(/[^0-9]/g, '');
  const message = sos.message || 'إذا عثرت على هذا الغرض، أرجو التواصل معي فوراً شاكراً ومقدراً أمانتك وحسن صنيعك.';
  const reward = sos.rewardText || '';

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>طوارئ ومفقودات | ${card.title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;800;900&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>body { font-family: 'Tajawal', 'Inter', sans-serif; }</style>
    </head>
    <body class="bg-[#050706] text-white min-h-screen flex items-center justify-center p-4 selection:bg-rose-500 selection:text-white">
      <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div class="absolute -top-40 -start-40 w-96 h-96 bg-rose-600/20 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-40 -end-40 w-96 h-96 bg-amber-600/20 rounded-full blur-3xl"></div>
      </div>
      <div class="bg-zinc-950/90 border border-rose-500/30 backdrop-blur-xl max-w-sm w-full p-6 sm:p-8 rounded-3xl text-center shadow-2xl space-y-4">
        <div class="w-16 h-16 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-rose-500/20 animate-pulse">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
        </div>
        <span class="inline-block px-3 py-1 bg-rose-500/10 text-rose-300 border border-rose-500/30 rounded-full text-xs font-bold">
          🆘 بطاقة مفقودات وطوارئ • SOS Tag
        </span>
        <h2 class="text-xl font-black text-white">${card.title}</h2>
        <p class="text-xs text-zinc-300 bg-zinc-900/90 border border-zinc-800 p-3.5 rounded-2xl text-start leading-relaxed">
          ${message}
        </p>
        ${reward ? `
          <div class="p-2.5 bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-xl flex items-center justify-center gap-1.5">
            <span>🎁</span><span>مكافأة مجزية: ${reward}</span>
          </div>
        ` : ''}

        <div class="space-y-2.5 pt-2">
          ${cleanPhone ? `
          <a href="tel:${cleanPhone}" class="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-95 text-white font-extrabold rounded-2xl transition-all shadow-lg shadow-emerald-600/30 text-xs flex items-center justify-center gap-2">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"></path></svg>
            <span>اتصال هاتفي فوري بالمالك (${ownerName})</span>
          </a>
          ` : ''}

          <button onclick="sendLocationWhatsApp()" id="btnSendLocation" class="w-full py-3.5 bg-zinc-900 hover:bg-zinc-850 active:scale-95 text-emerald-400 border border-emerald-500/40 font-extrabold rounded-2xl transition-all text-xs flex items-center justify-center gap-2">
            <span>📍 إرسال موقع العثور على البطاقة عبر واتساب</span>
          </button>
        </div>

        <p class="text-[10px] text-zinc-500 pt-2">TapLink Smart NFC &copy; 2026 • by MUHAB</p>
      </div>

      <script>
        function sendLocationWhatsApp() {
          const btn = document.getElementById('btnSendLocation');
          btn.innerHTML = '<span>جاري جلب إحداثيات الموقع... ⏳</span>';

          const openWa = (mapUrl) => {
            const text = encodeURIComponent('السلام عليكم، لقد عثرت على غرضك المرتبط ببطاقة NFC [${card.title}].\\n\\n' + (mapUrl ? 'موقعي الحالي هو: ' + mapUrl : 'أرجو التواصل للتنسيق لتسليمك الغرض.'));
            window.location.href = 'https://wa.me/${cleanWa}?text=' + text;
          };

          if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
              (pos) => {
                const lat = pos.coords.latitude;
                const lng = pos.coords.longitude;
                const mapUrl = 'https://maps.google.com/?q=' + lat + ',' + lng;
                openWa(mapUrl);
              },
              (err) => {
                openWa('');
              },
              { timeout: 7000 }
            );
          } else {
            openWa('');
          }
        }
      </script>
    </body>
    </html>
  `;
}

// Render Lead Capture Form Page
function renderLeadCapturePage(card, nextUrl) {
  const lc = card.leadCapture || {};
  const title = lc.title || 'تواصل معي • Connect With Me';
  const sub = lc.subtitle || 'سجل بياناتك للتواصل السريع وتبادل البطاقات الرقمية';
  const isRequired = Boolean(lc.required);

  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>${title} | ${card.title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;800;900&family=Inter:wght@400;600;700;800&display=swap" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>body { font-family: 'Tajawal', 'Inter', sans-serif; }</style>
    </head>
    <body class="bg-[#050706] text-white min-h-screen flex items-center justify-center p-4 selection:bg-emerald-500 selection:text-black">
      <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div class="absolute -top-40 -start-40 w-96 h-96 bg-emerald-600/20 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-40 -end-40 w-96 h-96 bg-emerald-900/20 rounded-full blur-3xl"></div>
      </div>
      <div class="bg-zinc-950/90 border border-emerald-500/20 backdrop-blur-xl max-w-sm w-full p-6 sm:p-8 rounded-3xl text-center shadow-2xl space-y-4">
        <div class="w-16 h-16 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/10">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"></path></svg>
        </div>
        <h2 class="text-xl font-extrabold text-white">${title}</h2>
        <p class="text-xs text-zinc-400">${sub}</p>

        <form id="leadForm" class="space-y-3 pt-2 text-start">
          <div>
            <label class="block text-[11px] font-bold text-zinc-300 mb-1">الاسم الكريم *</label>
            <input type="text" id="leadName" required placeholder="مثال: محمد العمري" class="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500">
          </div>
          <div>
            <label class="block text-[11px] font-bold text-zinc-300 mb-1">رقم الجوال / واتساب *</label>
            <input type="tel" id="leadPhone" required dir="ltr" placeholder="+966 50 000 0000" class="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500 text-start">
          </div>
          <div>
            <label class="block text-[11px] font-bold text-zinc-300 mb-1">ملاحظة أو استفسار (اختياري)</label>
            <input type="text" id="leadNote" placeholder="اكتب ملاحظتك هنا..." class="w-full bg-zinc-900 border border-zinc-700 text-white rounded-xl px-3.5 py-2.5 text-xs focus:outline-none focus:ring-2 focus:ring-emerald-500">
          </div>

          <div class="space-y-2 pt-2">
            <button type="submit" id="btnSubmitLead" class="w-full py-3 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 active:scale-95 text-white font-extrabold rounded-2xl transition-all shadow-lg shadow-emerald-600/30 text-xs">
              أرسل وتابع 🚀
            </button>
            ${!isRequired ? `
            <a href="${nextUrl}?captured=1" class="block w-full text-center py-2 text-[11px] text-zinc-400 hover:text-white font-medium">
              تخطي والمتابعة مباشرة ➔
            </a>
            ` : ''}
          </div>
        </form>
        <p class="text-[10px] text-zinc-500 pt-2">TapLink Smart CRM &copy; 2026 • by MUHAB</p>
      </div>

      <script>
        document.getElementById('leadForm').addEventListener('submit', async (e) => {
          e.preventDefault();
          const btn = document.getElementById('btnSubmitLead');
          btn.textContent = 'جاري الإرسال...';
          btn.disabled = true;

          const lead = {
            cardId: '${card.id}',
            cardTitle: '${card.title}',
            cardSlug: '${card.slug}',
            name: document.getElementById('leadName').value.trim(),
            phone: document.getElementById('leadPhone').value.trim(),
            note: document.getElementById('leadNote').value.trim()
          };

          try {
            await fetch('/api/leads', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(lead)
            });
            try {
              const raw = localStorage.getItem('nfc_leads_db') || '[]';
              const list = JSON.parse(raw);
              list.unshift({ ...lead, id: 'lead-' + Date.now(), timestamp: new Date().toISOString() });
              localStorage.setItem('nfc_leads_db', JSON.stringify(list));
            } catch(e) {}
          } catch(err) {}

          btn.textContent = 'تم الإرسال بنجاح ✓';
          setTimeout(() => {
            window.location.replace('${nextUrl}?captured=1');
          }, 400);
        });
      </script>
    </body>
    </html>
  `;
}

// Render Offer Expired / Scan Limit Reached Page
function renderExpiredPage(card, msg = '') {
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl" class="dark">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>انتهت الصلاحية | ${card.title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;800;900&display=swap" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>body { font-family: 'Tajawal', sans-serif; }</style>
    </head>
    <body class="bg-[#050706] text-white min-h-screen flex items-center justify-center p-4 selection:bg-amber-500 selection:text-black">
      <div class="bg-zinc-950/90 border border-amber-500/20 backdrop-blur-xl max-w-sm w-full p-6 sm:p-8 rounded-3xl text-center shadow-2xl space-y-4">
        <div class="w-16 h-16 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-amber-500/10">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>
        </div>
        <span class="inline-block px-3 py-1 bg-amber-500/10 text-amber-300 border border-amber-500/20 rounded-full text-xs font-semibold">
          العرض غير متاح حالياً
        </span>
        <h2 class="text-xl font-bold text-white">${card.title}</h2>
        <p class="text-xs text-zinc-400 leading-relaxed">${msg || 'انتهت صلاحية هذه البطاقة أو تم استنفاد الحد الأقصى للمسحات المتاحة.'}</p>
        <p class="text-[10px] text-zinc-500 pt-3">TapLink Smart Ecosystem &copy; 2026 • by MUHAB</p>
      </div>
    </body>
    </html>
  `;
}

// ==========================================
// 1. THE REDIRECT ENGINE (محرك التحويل الذكي)
// Paths: /c/:slug and /go/:slug
// ==========================================
function handleDynamicRedirect(req, res, slug) {
  // If static logo is requested under /c/ or /go/
  if (slug === 'logo.webp' || slug.endsWith('.webp') || slug.endsWith('.png') || slug.endsWith('.ico')) {
    return res.sendFile(path.join(__dirname, 'public', 'logo.webp'));
  }

  const card = db.getCardBySlug(slug);

  // If card doesn't exist
  if (!card) {
    return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));
  }

  // If card is inactive (متوقفة مؤقتاً)
  if (!card.isActive) {
    return res.status(403).sendFile(path.join(__dirname, 'public', 'inactive.html'));
  }

  // 1. PIN Lock Protection Check
  if (card.pinCode && card.pinCode.trim().length > 0) {
    const enteredPin = req.query.pin || req.cookies[`pin_${card.slug}`];
    if (enteredPin !== card.pinCode.trim()) {
      const err = req.query.err ? 'رمز PIN غير صحيح، حاول مجدداً' : '';
      return res.send(renderPinLockPage(card, `/go/${slug}`, err));
    }
  }

  // 2. Parse client device and browser
  const ua = req.headers['user-agent'] || '';
  const { deviceType, browser } = parseUserAgent(ua);
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
  const clientIp = String(ip).split(',')[0].trim();
  const referrer = req.headers.referer || req.headers.referrer || 'NFC Tag Tap';

  // Anti-Spam Scan Protection: Throttle to at most 1 scan every 10 seconds per IP per card
  const scanKey = `${clientIp}_${card.slug}`;
  const now = Date.now();
  const lastScan = scanRateLimit.get(scanKey) || 0;
  if (now - lastScan > 10000) {
    scanRateLimit.set(scanKey, now);
    db.recordScan(card, {
      deviceType,
      browser,
      referrer,
      ip: clientIp
    });
  }

  const mode = card.mode || (card.actionType === 'profile' ? 'profile' : (card.actionType === 'catalog' ? 'catalog' : 'direct'));

  // 3. Expiration Date Check
  if (card.limits?.expiresAt) {
    const expDate = new Date(card.limits.expiresAt);
    if (!isNaN(expDate.getTime()) && expDate < new Date()) {
      if (card.limits.fallbackUrl) {
        return res.redirect(302, db.sanitizeUrl(card.limits.fallbackUrl) || '/');
      }
      return res.status(410).send(renderExpiredPage(card, card.limits.expiredMessage || 'انتهت صلاحية العرض أو البطاقة الحالية.'));
    }
  }

  // 4. Max Scans Limit Check
  if (card.limits?.maxScans && Number(card.limits.maxScans) > 0) {
    if ((card.scanCount || 0) >= Number(card.limits.maxScans)) {
      if (card.limits.fallbackUrl) {
        return res.redirect(302, db.sanitizeUrl(card.limits.fallbackUrl) || '/');
      }
      return res.status(410).send(renderExpiredPage(card, 'تم استنفاد الحد الأقصى لمسحات هذه البطاقة.'));
    }
  }

  // 5. Lead Capture Intercept Check
  const isCaptured = req.query.captured === '1' || req.cookies[`lead_${card.slug}`];
  if (card.leadCapture?.enabled && !isCaptured) {
    return res.send(renderLeadCapturePage(card, `/go/${slug}`));
  }

  // 6. Smart Wi-Fi Tag Mode
  if (mode === 'wifi') {
    return res.send(renderWifiPage(card));
  }

  // 7. Lost & Found / SOS Emergency Mode
  if (mode === 'sos') {
    return res.send(renderSosPage(card));
  }

  // 8. Digital Business Card Profile
  if (mode === 'profile') {
    return res.sendFile(path.join(__dirname, 'public', 'landing.html'));
  }

  // 4. MODE 3: Smart Mini-Menu / Links Hub
  if (mode === 'catalog') {
    return res.sendFile(path.join(__dirname, 'public', 'catalog.html'));
  }

  // 5. MODE 4 / Conditional Routing (Device & Time)
  let targetUrl = (card.destinationUrl || '').trim();

  // Device-based routing
  if (card.conditional?.device?.enabled) {
    if (deviceType === 'iPhone' || deviceType === 'iPad') {
      if (card.conditional.device.iosUrl) targetUrl = card.conditional.device.iosUrl.trim();
    } else if (deviceType === 'Android') {
      if (card.conditional.device.androidUrl) targetUrl = card.conditional.device.androidUrl.trim();
    } else if (card.conditional.device.defaultUrl) {
      targetUrl = card.conditional.device.defaultUrl.trim();
    }
  }

  // Time-based routing
  const tr = card.timeRouting || card.conditional?.time;
  if (tr && tr.enabled) {
    const d = new Date();
    const utcHours = d.getUTCHours();
    const ksaHour = (utcHours + 3) % 24; // KSA Local Hour
    const switchHour = Number(tr.switchHour) || 16; // default 4:00 PM

    if (ksaHour >= 6 && ksaHour < switchHour) {
      targetUrl = (tr.morningUrl || targetUrl).trim();
    } else {
      targetUrl = (tr.eveningUrl || targetUrl).trim();
    }
  }

  // Fallback check if URL is empty
  if (!targetUrl) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="en" dir="ltr">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Destination URL Not Configured</title>
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>body { font-family: 'Inter', sans-serif; }</style>
      </head>
      <body class="bg-[#050706] text-white min-h-screen flex items-center justify-center p-4">
        <div class="bg-zinc-950 border border-zinc-800 max-w-md w-full p-8 rounded-3xl text-center shadow-2xl">
          <div class="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h2 class="text-xl font-bold mb-2">Target Destination Not Configured</h2>
          <p class="text-zinc-400 text-sm mb-6">This NFC card is active, but its target destination URL has not been assigned yet in the dashboard.</p>
          <a href="/login.html" class="inline-block bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-medium px-6 py-2.5 rounded-xl transition-all">Open Dashboard</a>
        </div>
      </body>
      </html>
    `);
  }

  // Ensure URL is clean and safe (Zero-Trust Validation)
  const cleanTargetUrl = db.sanitizeUrl(targetUrl);
  if (!cleanTargetUrl) {
    return res.status(400).send('Invalid or dangerous destination URL.');
  }
  targetUrl = cleanTargetUrl;

  // Ultra-fast HTTP 302 Redirect with instant HTML fallback for in-app webviews
  res.writeHead(302, {
    'Location': targetUrl,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  res.end(`
    <!DOCTYPE html>
    <html lang="en" dir="ltr">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <meta http-equiv="refresh" content="0;url=${encodeURI(targetUrl)}">
      <title>Redirecting... | TapLink</title>
      <link rel="icon" type="image/webp" href="/logo.webp">
      <script>
        window.location.replace("${encodeURI(targetUrl)}");
      </script>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
          background: #050706;
          color: #e4e4e7;
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 1.5rem;
          text-align: center;
        }
        .card-box {
          background: rgba(9, 9, 11, 0.95);
          border: 1px solid rgba(16, 185, 129, 0.25);
          border-radius: 1.5rem;
          padding: 2rem 1.5rem;
          max-width: 360px;
          width: 100%;
          box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.7), 0 0 40px rgba(16, 185, 129, 0.15);
        }
        .logo-img {
          width: 120px;
          height: auto;
          margin: 0 auto 0.75rem auto;
          display: block;
          filter: drop-shadow(0 10px 25px rgba(16, 185, 129, 0.35));
        }
        .badge {
          display: inline-flex;
          align-items: center;
          gap: 0.35rem;
          padding: 0.2rem 0.75rem;
          border-radius: 9999px;
          background: rgba(16, 185, 129, 0.15);
          color: #6ee7b7;
          border: 1px solid rgba(16, 185, 129, 0.3);
          font-size: 10px;
          font-weight: 700;
          margin-bottom: 0.75rem;
          letter-spacing: 0.5px;
        }
        .title {
          font-size: 1.1rem;
          font-weight: 800;
          color: #ffffff;
          margin-bottom: 0.25rem;
        }
        .subtitle {
          font-size: 0.8rem;
          color: #34d399;
          font-family: monospace;
          margin-bottom: 1.25rem;
        }
        .spinner {
          width: 32px;
          height: 32px;
          border: 3px solid rgba(16, 185, 129, 0.2);
          border-top-color: #10b981;
          border-radius: 50%;
          margin: 0 auto 1rem auto;
          animation: spin 0.8s linear infinite;
        }
        .manual-link {
          font-size: 0.75rem;
          color: #71717a;
        }
        .manual-link a {
          color: #10b981;
          text-decoration: underline;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
      </style>
    </head>
    <body>
      <div class="card-box">
        <img 
          src="/logo.webp" 
          alt="TapLink • MUHAB" 
          class="logo-img" 
          width="120" 
          height="67"
          onerror="this.onerror=null; this.src='./logo.webp';"
        >
        <div class="badge">
          <span>TapLink • MUHAB</span>
        </div>
        <h2 class="title">Smart NFC Tag Scanned 📡</h2>
        <p class="subtitle">Redirecting to destination...</p>
        <div class="spinner"></div>
        <p class="manual-link">If you are not redirected automatically, <a href="${encodeURI(targetUrl)}">click here to continue</a></p>
      </div>
    </body>
    </html>
  `);
}

// ==========================================
// CARD QUICK-EDIT ROUTES (/c/:slug/edit & /go/:slug/edit)
// ==========================================
app.get(['/c/:slug/edit', '/go/:slug/edit'], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'edit.html'));
});

// Verify Management PIN for a specific card with Anti-Brute-Force Shield
app.post(['/api/cards/:slug/quick-edit-auth'], (req, res) => {
  const { slug } = req.params;
  const { pin } = req.body;
  const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
  const pinKey = `${clientIp}_${slug}`;
  const now = Date.now();
  const rec = pinAttempts.get(pinKey) || { count: 0, firstAttempt: now, lockedUntil: 0 };

  if (rec.lockedUntil && now < rec.lockedUntil) {
    const waitMin = Math.ceil((rec.lockedUntil - now) / 60000);
    return res.status(429).json({
      success: false,
      error: `تم إيقاف محاولات إدخال الرمز مؤقتاً لحماية البطاقة. يرجى الانتظار ${waitMin} دقيقة.`
    });
  }

  const card = db.getCardBySlug(slug);
  if (!card) {
    return res.status(404).json({ success: false, error: 'البطاقة غير موجودة / Card not found' });
  }

  const isValid = db.verifyManagePin(slug, pin);
  if (!isValid) {
    rec.count += 1;
    if (rec.count >= 5) {
      rec.lockedUntil = now + 10 * 60 * 1000;
      pinAttempts.set(pinKey, rec);
      return res.status(429).json({
        success: false,
        error: 'تم تجاوز الحد الأقصى للمحاولات (5 محاولات). تم قفل البطاقة لمدة 10 دقائق لحمايتها.'
      });
    }
    pinAttempts.set(pinKey, rec);
    const left = 5 - rec.count;
    return res.status(401).json({
      success: false,
      error: `رمز PIN الخاص بإدارة هذه البطاقة غير صحيح. يتبقى لديك ${left} محاولة.`
    });
  }

  // Clear lockout on success
  pinAttempts.delete(pinKey);

  res.json({
    success: true,
    card: {
      id: card.id,
      slug: card.slug,
      title: card.title,
      destinationUrl: card.destinationUrl,
      mode: card.mode,
      isActive: card.isActive,
      savedTargets: card.savedTargets || []
    }
  });
});

// Update Destination URL using Card Management PIN with Anti-Brute-Force Shield
app.post(['/api/cards/:slug/quick-edit-update'], (req, res) => {
  const { slug } = req.params;
  const { pin, destinationUrl } = req.body;
  const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
  const pinKey = `${clientIp}_${slug}`;
  const now = Date.now();
  const rec = pinAttempts.get(pinKey) || { count: 0, firstAttempt: now, lockedUntil: 0 };

  if (rec.lockedUntil && now < rec.lockedUntil) {
    const waitMin = Math.ceil((rec.lockedUntil - now) / 60000);
    return res.status(429).json({
      success: false,
      error: `تم إيقاف محاولات إدخال الرمز مؤقتاً لحماية البطاقة. يرجى الانتظار ${waitMin} دقيقة.`
    });
  }

  const card = db.getCardBySlug(slug);
  if (!card) {
    return res.status(404).json({ success: false, error: 'البطاقة غير موجودة / Card not found' });
  }

  try {
    const updated = db.updateDestinationByManagePin(slug, pin, destinationUrl);
    pinAttempts.delete(pinKey);
    res.json({
      success: true,
      message: 'تم تحديث رابط البطاقة فوراً / Card destination updated successfully',
      destinationUrl: updated.destinationUrl,
      card: {
        id: updated.id,
        slug: updated.slug,
        title: updated.title,
        destinationUrl: updated.destinationUrl
      }
    });
  } catch (err) {
    rec.count += 1;
    if (rec.count >= 5) {
      rec.lockedUntil = now + 10 * 60 * 1000;
      pinAttempts.set(pinKey, rec);
      return res.status(429).json({
        success: false,
        error: 'تم تجاوز الحد الأقصى للمحاولات الخاطئة. تم قفل التعديل لمدة 10 دقائق.'
      });
    }
    pinAttempts.set(pinKey, rec);
    res.status(400).json({ success: false, error: err.message });
  }
});

// Static Logo Resolution Routes (Root, /c/, /go/, and nested)
app.get([
  '/logo.webp',
  '/c/logo.webp',
  '/go/logo.webp',
  '/c/:slug/logo.webp',
  '/go/:slug/logo.webp'
], (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'logo.webp'));
});

// Redirect Routes: /c/:slug and /go/:slug
app.get('/c/:slug', (req, res) => handleDynamicRedirect(req, res, req.params.slug));
app.get('/go/:slug', (req, res) => handleDynamicRedirect(req, res, req.params.slug));

// Verify PIN POST route
app.post(['/c/:slug/verify-pin', '/go/:slug/verify-pin'], (req, res) => {
  const { slug } = req.params;
  const { pin } = req.body;
  const card = db.getCardBySlug(slug);

  if (!card) return res.status(404).sendFile(path.join(__dirname, 'public', '404.html'));

  if (pin && String(pin).trim() === String(card.pinCode).trim()) {
    res.cookie(`pin_${card.slug}`, pin.trim(), { maxAge: 60 * 60 * 1000, httpOnly: true });
    return res.redirect(`/go/${slug}?pin=${encodeURIComponent(pin.trim())}`);
  }

  // Failed PIN
  return res.redirect(`/go/${slug}?err=1`);
});

// Direct vCard download for profile cards (UTF-8 BOM + RFC 6266/5987)
app.get(['/c/:slug/vcard', '/go/:slug/vcard'], (req, res) => {
  const { slug } = req.params;
  const card = db.getCardBySlug(slug);
  if (!card) return res.status(404).send('Card not found');

  const vcardText = generateVCard(card.profile || {}, card.title);
  const rawName = (card.profile?.fullName || card.title || 'contact').replace(/[\/\\?%*:|"<>]/g, '_');
  const asciiFallback = 'contact.vcf';
  const utf8Filename = encodeURIComponent(rawName) + '.vcf';

  res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${asciiFallback}"; filename*=UTF-8''${utf8Filename}`);
  return res.send(vcardText);
});

// API to get public profile/catalog data for a card
app.get('/api/public/card/:slug', (req, res) => {
  const { slug } = req.params;
  const card = db.getCardBySlug(slug);
  if (!card) {
    return res.status(404).json({ success: false, error: 'البطاقة غير موجودة' });
  }

  res.json({
    success: true,
    card: {
      title: card.title,
      slug: card.slug,
      mode: card.mode,
      actionType: card.actionType,
      isActive: card.isActive,
      profile: card.profile || {},
      catalog: card.catalog || {}
    }
  });
});

// ==========================================
// 2. AUTHENTICATION APIS
// ==========================================
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
  const now = Date.now();
  const rec = loginAttempts.get(clientIp) || { count: 0, firstAttempt: now, lockedUntil: 0 };

  if (rec.lockedUntil && now < rec.lockedUntil) {
    const remainingMin = Math.ceil((rec.lockedUntil - now) / 60000);
    return res.status(429).json({
      success: false,
      error: `تم حظر المحاولات مؤقتاً بسبب تكرار المحاولات الخاطئة. يرجى الانتظار ${remainingMin} دقيقة.`
    });
  }

  if (!password) {
    return res.status(400).json({ success: false, error: 'كلمة المرور مطلوبة' });
  }

  const isValid = db.verifyAdmin(password);
  if (!isValid) {
    rec.count += 1;
    if (rec.count >= 5) {
      rec.lockedUntil = now + 15 * 60 * 1000;
      loginAttempts.set(clientIp, rec);
      return res.status(429).json({
        success: false,
        error: 'تم تجاوز الحد الأقصى للمحاولات (5 محاولات). تم إيقاف الدخول لمدة 15 دقيقة لحماية اللوحة.'
      });
    }
    loginAttempts.set(clientIp, rec);
    const left = 5 - rec.count;
    return res.status(401).json({
      success: false,
      error: `كلمة المرور غير صحيحة. يتبقى لديك ${left} محاولات.`
    });
  }

  // Clear failed attempts on successful login
  loginAttempts.delete(clientIp);

  const token = createAuthToken();
  res.cookie('admin_session', token, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production'
  });

  res.json({
    success: true,
    token,
    message: 'تم تسجيل الدخول بنجاح'
  });
});

app.get('/api/auth/check', (req, res) => {
  const token = req.cookies.admin_session || req.headers.authorization?.replace('Bearer ', '');
  const authenticated = verifyAuthToken(token);
  res.json({ success: true, authenticated });
});

app.post('/api/auth/logout', (req, res) => {
  res.clearCookie('admin_session');
  res.json({ success: true, message: 'تم تسجيل الخروج بنجاح' });
});

app.post('/api/auth/change-password', requireAuth, (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ success: false, error: 'يرجى تقديم كلمة المرور الحالية والجديدة' });
  }
  if (!db.verifyAdmin(currentPassword)) {
    return res.status(401).json({ success: false, error: 'كلمة المرور الحالية غير صحيحة' });
  }
  if (newPassword.length < 4) {
    return res.status(400).json({ success: false, error: 'كلمة المرور الجديدة يجب ألا تقل عن 4 خانات' });
  }

  db.updateAdminPassword(newPassword);
  res.json({ success: true, message: 'تم تحديث كلمة المرور بنجاح' });
});

// ==========================================
// 3. DASHBOARD STATS API
// ==========================================
app.get('/api/stats', requireAuth, (req, res) => {
  const stats = db.getDashboardStats();
  res.json({ success: true, stats });
});

// ==========================================
// 4. CARDS CRUD & SMART FEATURES APIS
// ==========================================
app.get('/api/cards', requireAuth, (req, res) => {
  const search = req.query.search || '';
  const cards = db.getAllCards(search);

  const host = req.get('host');
  const protocol = req.protocol;
  const baseUrl = `${protocol}://${host}`;

  const cardsWithUrl = cards.map(c => ({
    ...c,
    fixedUrl: `${baseUrl}/go/${c.slug}`,
    legacyUrl: `${baseUrl}/c/${c.slug}`
  }));

  res.json({ success: true, cards: cardsWithUrl, baseUrl });
});

app.post('/api/cards', requireAuth, (req, res) => {
  try {
    const newCard = db.createCard(req.body);
    const host = req.get('host');
    const protocol = req.protocol;
    newCard.fixedUrl = `${protocol}://${host}/go/${newCard.slug}`;
    newCard.legacyUrl = `${protocol}://${host}/c/${newCard.slug}`;
    res.status(201).json({ success: true, card: newCard, message: 'تم إنشاء بطاقة NFC بنجاح' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/cards/:id', requireAuth, (req, res) => {
  const card = db.getCardById(req.params.id);
  if (!card) return res.status(404).json({ success: false, error: 'البطاقة غير موجودة' });
  
  const host = req.get('host');
  const protocol = req.protocol;
  card.fixedUrl = `${protocol}://${host}/go/${card.slug}`;
  card.legacyUrl = `${protocol}://${host}/c/${card.slug}`;

  res.json({ success: true, card });
});

app.put('/api/cards/:id', requireAuth, (req, res) => {
  try {
    const updated = db.updateCard(req.params.id, req.body);
    res.json({ success: true, card: updated, message: 'تم حفظ تعديلات البطاقة بنجاح' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Quick 1-click update for destination URL
app.patch('/api/cards/:id/quick-url', requireAuth, (req, res) => {
  try {
    const { destinationUrl } = req.body;
    if (destinationUrl === undefined) {
      return res.status(400).json({ success: false, error: 'الرابط مطلوب' });
    }
    const updated = db.quickUpdateUrl(req.params.id, destinationUrl);
    res.json({ success: true, card: updated, message: 'تم تحديث الرابط الهدف فوراً' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Quick Target Switcher: switch active target pill
app.post('/api/cards/:id/switch-target', requireAuth, (req, res) => {
  try {
    const { targetId } = req.body;
    if (!targetId) return res.status(400).json({ success: false, error: 'معرف الرابط مطلوب' });
    const result = db.switchTarget(req.params.id, targetId);
    res.json({ success: true, card: result.card, activeTarget: result.activeTarget, message: `تم تفعيل الرابط: ${result.activeTarget.label}` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Add saved target
app.post('/api/cards/:id/targets', requireAuth, (req, res) => {
  try {
    const { label, url, icon } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'الرابط مطلوب' });
    const result = db.addSavedTarget(req.params.id, label, url, icon);
    res.json({ success: true, card: result.card, newTarget: result.newTarget, message: 'تمت إضافة الرابط لقائمة المحفوظات' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Remove saved target
app.delete('/api/cards/:id/targets/:targetId', requireAuth, (req, res) => {
  try {
    const updated = db.removeSavedTarget(req.params.id, req.params.targetId);
    res.json({ success: true, card: updated, message: 'تم حذف الرابط من المحفوظات' });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Toggle active/inactive
app.patch('/api/cards/:id/toggle-status', requireAuth, (req, res) => {
  try {
    const updated = db.toggleCardStatus(req.params.id);
    res.json({ 
      success: true, 
      card: updated, 
      message: updated.isActive ? 'تم تفعيل البطاقة' : 'تم تعطيل البطاقة مؤقتاً' 
    });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/cards/:id', requireAuth, (req, res) => {
  try {
    const deleted = db.deleteCard(req.params.id);
    res.json({ success: true, message: `تم حذف البطاقة "${deleted.title}" بنجاح` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.get('/api/cards/:id/stats', requireAuth, (req, res) => {
  const stats = db.getCardStats(req.params.id);
  if (!stats) return res.status(404).json({ success: false, error: 'البطاقة غير موجودة' });
  res.json({ success: true, stats });
});

// Backup & Restore APIs
app.get('/api/backup/export', requireAuth, (req, res) => {
  const backup = db.exportBackup();
  res.setHeader('Content-Type', 'application/json');
  res.setHeader('Content-Disposition', `attachment; filename="nfc-backup-${Date.now()}.json"`);
  res.send(JSON.stringify(backup, null, 2));
});

app.post('/api/backup/import', requireAuth, (req, res) => {
  try {
    const result = db.importBackup(req.body);
    res.json({ success: true, message: `تم استعادة النسخة الاحتياطية بنجاح (${result.cardsCount} بطاقة)`, ...result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// --- Leads CRM API Endpoints ---
// Protected: Only authenticated administrators can view visitor leads data
app.get('/api/leads', requireAuth, (req, res) => {
  const leads = db.getAllLeads();
  res.json({ success: true, count: leads.length, leads });
});

// Public Lead Capture Submission (Protected with Anti-Spam Rate Limiting)
app.post('/api/leads', (req, res) => {
  const clientIp = String(req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1').split(',')[0].trim();
  const now = Date.now();
  const times = (leadSubmissions.get(clientIp) || []).filter(t => now - t < 10 * 60 * 1000);

  if (times.length >= 10) {
    return res.status(429).json({
      success: false,
      error: 'تم تجاوز الحد الأقصى لإرسال البيانات. يرجى الانتظار بضع دقائق.'
    });
  }

  times.push(now);
  leadSubmissions.set(clientIp, times);

  try {
    const lead = db.addLead(req.body);
    const slugCookie = String(req.body.cardSlug || 'tag').replace(/[^a-zA-Z0-9-_]/g, '');
    res.cookie(`lead_${slugCookie}`, '1', {
      maxAge: 24 * 60 * 60 * 1000,
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production'
    });
    res.json({ success: true, lead });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.delete('/api/leads/:id', requireAuth, (req, res) => {
  const success = db.deleteLead(req.params.id);
  res.json({ success });
});

app.delete('/api/leads', requireAuth, (req, res) => {
  db.clearLeads();
  res.json({ success: true, message: 'تم مسح سجل العملاء بالكامل' });
});

// --- Bulk Cards Operations ---
app.post('/api/cards/bulk-url', requireAuth, (req, res) => {
  try {
    const { cardIds, destinationUrl } = req.body;
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return res.status(400).json({ success: false, error: 'يرجى تحديد بطاقة واحدة على الأقل' });
    }
    const updatedCount = db.bulkUpdateDestinationUrl(cardIds, destinationUrl);
    res.json({ success: true, updatedCount, message: `تم تحديث الرابط لـ ${updatedCount} بطاقة بنجاح` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/cards/bulk-status', requireAuth, (req, res) => {
  try {
    const { cardIds, isActive } = req.body;
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return res.status(400).json({ success: false, error: 'يرجى تحديد بطاقة واحدة على الأقل' });
    }
    const updatedCount = db.bulkUpdateStatus(cardIds, isActive);
    res.json({ success: true, updatedCount, message: `تم تحديث حالة ${updatedCount} بطاقة بنجاح` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

app.post('/api/cards/bulk-delete', requireAuth, (req, res) => {
  try {
    const { cardIds } = req.body;
    if (!Array.isArray(cardIds) || cardIds.length === 0) {
      return res.status(400).json({ success: false, error: 'يرجى تحديد بطاقة واحدة على الأقل' });
    }
    const deletedCount = db.bulkDeleteCards(cardIds);
    res.json({ success: true, deletedCount, message: `تم حذف ${deletedCount} بطاقة نهائياً` });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// Fallback to index.html for root or SPA
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Restart or listen
const serverInstance = app.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`🚀 خادم إدارة بطاقات NFC يعمل بنجاح!`);
  console.log(`📡 الرابط المحلي: http://localhost:${PORT}`);
  console.log(`⚙️  لوحة التحكم:  http://localhost:${PORT}/index.html`);
  console.log(`🔑 كلمة المرور الافتراضية: admin123`);
  console.log(`=================================================`);
});
