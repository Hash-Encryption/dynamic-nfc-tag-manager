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

// Generate vCard string helper (RFC 6350 / vCard 3.0)
function generateVCard(profile = {}, title = '') {
  const name = profile.fullName || title || 'جهة اتصال NFC';
  const phone = profile.phone || profile.whatsapp || '';
  const email = profile.email || '';
  const website = profile.website || '';
  const company = profile.company || '';
  const jobTitle = profile.jobTitle || '';
  const bio = profile.bio || '';
  const address = profile.location || '';

  let vcf = [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN;CHARSET=UTF-8:${name}`,
    `N;CHARSET=UTF-8:${name};;;;`,
    jobTitle ? `TITLE;CHARSET=UTF-8:${jobTitle}` : '',
    company ? `ORG;CHARSET=UTF-8:${company}` : '',
    phone ? `TEL;TYPE=CELL,VOICE:${phone}` : '',
    email ? `EMAIL;TYPE=WORK,INTERNET:${email}` : '',
    website ? `URL:${website}` : '',
    address ? `ADR;CHARSET=UTF-8;TYPE=WORK:;;${address};;;;` : '',
    bio ? `NOTE;CHARSET=UTF-8:${bio.replace(/\n/g, '\\n')}` : '',
    'REV:' + new Date().toISOString(),
    'END:VCARD'
  ];

  return vcf.filter(line => line.length > 0).join('\r\n');
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
    const expectedSig = crypto.createHmac('sha256', SESSION_SECRET).update(`${user}:${time}`).digest('hex');
    return signature === expectedSig;
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
  return res.status(401).json({ success: false, error: 'غير مصرح لك. يرجى تسجيل الدخول أولاً' });
}

// Render PIN Code Protected Lock Screen
function renderPinLockPage(card, currentPath, errorMsg = '') {
  return `
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
      <title>مغلق برمز حماية | ${card.title}</title>
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700;800&display=swap" rel="stylesheet">
      <script src="https://cdn.tailwindcss.com"></script>
      <style>body { font-family: 'Tajawal', sans-serif; }</style>
    </head>
    <body class="bg-slate-950 text-white min-h-screen flex items-center justify-center p-4 selection:bg-indigo-500 selection:text-white">
      <div class="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div class="absolute -top-40 -start-40 w-96 h-96 bg-indigo-600/20 rounded-full blur-3xl"></div>
        <div class="absolute -bottom-40 -end-40 w-96 h-96 bg-purple-600/20 rounded-full blur-3xl"></div>
      </div>
      <div class="bg-slate-900/90 border border-slate-800 backdrop-blur-xl max-w-sm w-full p-6 sm:p-8 rounded-3xl text-center shadow-2xl">
        <div class="w-16 h-16 bg-amber-500/20 text-amber-400 border border-amber-500/30 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/10">
          <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"></path>
          </svg>
        </div>
        <span class="inline-block px-3 py-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 rounded-full text-xs font-semibold mb-2">
          رابط محمي برمز PIN
        </span>
        <h2 class="text-xl font-bold mb-1 text-white">${card.title}</h2>
        <p class="text-slate-400 text-xs mb-6">أدخل رمز الحماية السري للمتابعة إلى الوجهة</p>

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
            class="w-full text-center tracking-[1em] text-2xl font-mono py-3 bg-slate-800 border border-slate-700 text-white rounded-2xl focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
          >
          <button 
            type="submit" 
            class="w-full py-3 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white font-bold rounded-2xl transition-all shadow-lg shadow-indigo-600/30 text-sm"
          >
            فتح الرابط السري 🔓
          </button>
        </form>
        <p class="text-[11px] text-slate-500 mt-6">نظام بطاقات NFC الذكية &copy; 2026</p>
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
  const referrer = req.headers.referer || req.headers.referrer || 'NFC Tag Tap';

  // Increment scan count and log analytics
  db.recordScan(card, {
    deviceType,
    browser,
    referrer,
    ip: String(ip).split(',')[0].trim()
  });

  // 3. Action Type: Digital Business Card Profile
  if (card.actionType === 'profile') {
    return res.sendFile(path.join(__dirname, 'public', 'landing.html'));
  }

  // 4. Time-based Routing Resolution
  let targetUrl = (card.destinationUrl || '').trim();
  if (card.timeRouting && card.timeRouting.enabled) {
    // Saudi Arabia / UTC+3 standard or server local hour
    const d = new Date();
    const utcHours = d.getUTCHours();
    const ksaHour = (utcHours + 3) % 24; // KSA Local Hour
    const switchHour = Number(card.timeRouting.switchHour) || 16; // default 4:00 PM

    if (ksaHour >= 6 && ksaHour < switchHour) {
      // Morning Slot
      targetUrl = (card.timeRouting.morningUrl || targetUrl).trim();
    } else {
      // Evening Slot
      targetUrl = (card.timeRouting.eveningUrl || targetUrl).trim();
    }
  }

  // Fallback check if URL is empty
  if (!targetUrl) {
    return res.send(`
      <!DOCTYPE html>
      <html lang="ar" dir="rtl">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>تنبيه البطاقة</title>
        <link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@400;600;700&display=swap" rel="stylesheet">
        <script src="https://cdn.tailwindcss.com"></script>
        <style>body { font-family: 'Tajawal', sans-serif; }</style>
      </head>
      <body class="bg-slate-900 text-white min-h-screen flex items-center justify-center p-4">
        <div class="bg-slate-800 border border-slate-700 max-w-md w-full p-8 rounded-3xl text-center shadow-2xl">
          <div class="w-16 h-16 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"></path></svg>
          </div>
          <h2 class="text-xl font-bold mb-2">الرابط الهدف غير محدد</h2>
          <p class="text-slate-400 text-sm mb-6">هذه البطاقة نشطة ولكن لم يتم تعيين رابط التحويل الهدف لها بعد من لوحة التحكم.</p>
          <a href="/login.html" class="inline-block bg-indigo-600 hover:bg-indigo-700 text-white font-medium px-6 py-2.5 rounded-xl transition-all">لوحة التحكم</a>
        </div>
      </body>
      </html>
    `);
  }

  // Ensure scheme exists
  if (!/^https?:\/\//i.test(targetUrl) && !/^(tel|mailto|sms):/i.test(targetUrl)) {
    targetUrl = 'https://' + targetUrl;
  }

  // Ultra-fast HTTP 302 Redirect with instant HTML fallback for in-app webviews
  res.writeHead(302, {
    'Location': targetUrl,
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0'
  });

  res.end(`
    <!DOCTYPE html>
    <html lang="ar" dir="rtl">
    <head>
      <meta charset="utf-8">
      <meta http-equiv="refresh" content="0;url=${encodeURI(targetUrl)}">
      <title>جاري تحويلك...</title>
      <script>
        window.location.replace("${encodeURI(targetUrl)}");
      </script>
    </head>
    <body style="font-family: sans-serif; background: #090d16; color: #94a3b8; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; text-align: center;">
      <div>
        <div style="width: 48px; height: 48px; border: 3px solid rgba(99,102,241,0.2); border-top-color: #6366f1; border-radius: 50%; margin: 0 auto 16px; animation: spin 0.8s linear infinite;"></div>
        <p style="font-size: 1.1rem; margin-bottom: 8px; color: #f8fafc; font-weight: bold;">جاري تحويلك تلقائياً...</p>
        <p style="font-size: 0.85rem; color: #64748b;">إذا لم يتم التحويل، <a href="${encodeURI(targetUrl)}" style="color: #818cf8; text-decoration: underline;">اضغط هنا للمتابعة</a></p>
      </div>
      <style>@keyframes spin { to { transform: rotate(360deg); } }</style>
    </body>
    </html>
  `);
}

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

// Direct vCard download for profile cards
app.get(['/c/:slug/vcard', '/go/:slug/vcard'], (req, res) => {
  const { slug } = req.params;
  const card = db.getCardBySlug(slug);
  if (!card) return res.status(404).send('Card not found');

  const vcardText = generateVCard(card.profile || {}, card.title);
  const filename = encodeURIComponent((card.profile?.fullName || card.title || 'contact') + '.vcf');

  res.setHeader('Content-Type', 'text/vcard; charset=utf-8');
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"; filename*=UTF-8''${filename}`);
  return res.send(vcardText);
});

// API to get public profile data for a card
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
      actionType: card.actionType,
      isActive: card.isActive,
      profile: card.profile || {}
    }
  });
});

// ==========================================
// 2. AUTHENTICATION APIS
// ==========================================
app.post('/api/auth/login', (req, res) => {
  const { password } = req.body;
  if (!password) {
    return res.status(400).json({ success: false, error: 'كلمة المرور مطلوبة' });
  }

  const isValid = db.verifyAdmin(password);
  if (!isValid) {
    return res.status(401).json({ success: false, error: 'كلمة المرور غير صحيحة' });
  }

  const token = createAuthToken();
  res.cookie('admin_session', token, {
    httpOnly: true,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
    sameSite: 'lax'
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
  if (newPassword.length < 6) {
    return res.status(400).json({ success: false, error: 'كلمة المرور الجديدة يجب ألا تقل عن 6 خانات' });
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
    const { label, url } = req.body;
    if (!url) return res.status(400).json({ success: false, error: 'الرابط مطلوب' });
    const result = db.addSavedTarget(req.params.id, label, url);
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
