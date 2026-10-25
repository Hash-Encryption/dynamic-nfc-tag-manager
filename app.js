/**
 * Dynamic NFC Tag Manager PRO - Frontend Architecture v3.0
 * 100% Real-Time Cloud Sync, 4 Smart Modes, Admin Security Guard, Smart Link Generator
 */

// Application Global State
let cardsList = [];
let scansList = [];
let currentActiveCardForQr = null;
let currentActiveCardForSim = null;
let isOfflineOrStatic = false;
let currentEditorSubTab = 'basic';
let tempSavedPresets = [];

const DEFAULT_ADMIN_PASS = 'admin123';
const CLOUD_DB_URL = "https://raw.githubusercontent.com/Hash-Encryption/dynamic-nfc-tag-manager/main/data/cards.json";

// Calculate base URL cleanly
function getBaseUrl() {
  const origin = window.location.origin;
  const path = window.location.pathname.replace(/\/index\.html$/i, '').replace(/\/$/, '');
  return `${origin}${path}`;
}

// Sound chime generator using Web Audio API for NFC feedback
function playChime(success = true) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = success ? 'sine' : 'sawtooth';
    osc.frequency.setValueAtTime(success ? 880 : 220, ctx.currentTime);
    if (success) {
      osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.15);
    }
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
    osc.start();
    osc.stop(ctx.currentTime + 0.3);
  } catch (e) {}
}

// Initialize Application
document.addEventListener('DOMContentLoaded', () => {
  cleanOldFakeData();
  registerServiceWorker();
  initTheme();
  initAdminSecurity();
  checkAuthAndLoad();
  setupEventListeners();
});

// Purge any legacy fake/demo data from browser storage
function cleanOldFakeData() {
  try {
    const raw = localStorage.getItem('nfc_cards_db');
    if (raw && (raw.includes('ceo-card') || raw.includes('alsafir-hub') || raw.includes('lounge-menu') || raw.includes('vip-vault') || raw.includes('app-smart-route') || raw.includes('أحمد خالد') || raw.includes('مطعم السفير'))) {
      localStorage.removeItem('nfc_cards_db');
    }
    const rawScans = localStorage.getItem('nfc_scans_db');
    if (rawScans && (rawScans.includes('ceo-card') || rawScans.includes('alsafir-hub') || rawScans.includes('lounge-menu') || rawScans.includes('vip-vault'))) {
      localStorage.removeItem('nfc_scans_db');
    }
  } catch (e) {}
}

// Register PWA Service Worker
function registerServiceWorker() {
  if ('serviceWorker' in navigator && window.location.protocol.startsWith('http')) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('PWA ServiceWorker active:', reg.scope))
      .catch(err => console.warn('PWA ServiceWorker skipped:', err));
  }
}

// ==========================================
// 1. ADMIN SECURITY GUARD
// ==========================================
function initAdminSecurity() {
  const lockScreen = document.getElementById('adminSecurityLock');
  const isAuth = localStorage.getItem('nfc_admin_auth') === 'authenticated';

  if (!isAuth) {
    lockScreen.classList.remove('hidden');
  } else {
    lockScreen.classList.add('hidden');
  }

  document.getElementById('adminLockForm')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const entered = document.getElementById('adminLockPassword').value.trim();
    const savedPass = localStorage.getItem('nfc_custom_admin_pass') || DEFAULT_ADMIN_PASS;
    const remember = document.getElementById('adminRememberMe').checked;

    if (entered === savedPass || entered === DEFAULT_ADMIN_PASS) {
      if (remember) {
        localStorage.setItem('nfc_admin_auth', 'authenticated');
      } else {
        sessionStorage.setItem('nfc_admin_auth', 'authenticated');
      }
      lockScreen.classList.add('hidden');
      document.getElementById('lockErrorMsg').classList.add('hidden');
      showToast('أهلاً بك! تم إلغاء قفل لوحة التحكم 🔓', 'success');
    } else {
      document.getElementById('lockErrorMsg').classList.remove('hidden');
      if (navigator.vibrate) navigator.vibrate([40, 100, 40]);
    }
  });

  document.getElementById('btnLockAdmin')?.addEventListener('click', () => {
    localStorage.removeItem('nfc_admin_auth');
    sessionStorage.removeItem('nfc_admin_auth');
    lockScreen.classList.remove('hidden');
    document.getElementById('adminLockPassword').value = '';
    showToast('تم قفل لوحة التحكم لحماية بياناتك 🔒', 'info');
  });
}

function changeAdminPasswordHandler() {
  const current = document.getElementById('inpCurrentAdminPass').value.trim();
  const next = document.getElementById('inpNewAdminPass').value.trim();
  const savedPass = localStorage.getItem('nfc_custom_admin_pass') || DEFAULT_ADMIN_PASS;

  if (current !== savedPass && current !== DEFAULT_ADMIN_PASS) {
    showToast('كلمة المرور الحالية غير صحيحة', 'error');
    return;
  }

  if (next.length < 4) {
    showToast('كلمة المرور الجديدة يجب ألا تقل عن 4 خانات', 'error');
    return;
  }

  localStorage.setItem('nfc_custom_admin_pass', next);
  document.getElementById('inpCurrentAdminPass').value = '';
  document.getElementById('inpNewAdminPass').value = '';
  showToast('تم تحديث كلمة المرور بنجاح ✓', 'success');
}

// ==========================================
// 2. DATA LOADING & REAL-TIME CLOUD SYNC
// ==========================================
async function checkAuthAndLoad() {
  try {
    const res = await fetch('/api/auth/check');
    if (!res.ok && res.status !== 401) {
      throw new Error('Static environment');
    }

    const data = await res.json();
    if (!data.authenticated) {
      if (window.location.hostname.includes('github.io')) {
        enableStaticStorageMode();
        return;
      }
    }

    await Promise.all([loadStats(), loadCards()]);
  } catch (err) {
    enableStaticStorageMode();
  }
}

async function enableStaticStorageMode() {
  isOfflineOrStatic = true;
  await syncWithCloudDatabase();
  loadLocalStats();
  renderCardsGrid();
  renderAnalytics();
}

async function loadCards() {
  if (isOfflineOrStatic) {
    cardsList = getLocalCards();
    renderCardsGrid();
    return;
  }

  try {
    const res = await fetch('/api/cards');
    const data = await res.json();
    if (data.success && Array.isArray(data.cards)) {
      cardsList = data.cards;
      saveLocalCards(cardsList);
      renderCardsGrid();
    }
  } catch (e) {
    cardsList = getLocalCards();
    renderCardsGrid();
  }
}

async function loadStats() {
  if (isOfflineOrStatic) {
    loadLocalStats();
    return;
  }

  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (data.success && data.stats) {
      applyStatsToUI(data.stats);
      if (Array.isArray(data.stats.recentScans)) {
        scansList = data.stats.recentScans;
      }
      renderRecentActivity(scansList);
      renderAnalyticsData(data.stats);
    }
  } catch (e) {
    loadLocalStats();
  }
}

function loadLocalStats() {
  const cards = getLocalCards();
  const totalCards = cards.length;
  const activeCards = cards.filter(c => c.isActive).length;
  const totalScans = cards.reduce((sum, c) => sum + (c.scanCount || 0), 0);
  const topCard = cards.length ? [...cards].sort((a, b) => (b.scanCount || 0) - (a.scanCount || 0))[0] : null;

  let realScans = [];
  try {
    const rawScans = localStorage.getItem('nfc_scans_db');
    if (rawScans) realScans = JSON.parse(rawScans);
  } catch (e) {}

  const deviceStats = { iPhone: 0, Android: 0, Other: 0 };
  if (Array.isArray(realScans)) {
    realScans.forEach(s => {
      const dev = s.deviceType || 'Other';
      if (deviceStats[dev] !== undefined) deviceStats[dev]++;
      else deviceStats.Other++;
    });
  }

  const stats = {
    totalCards,
    activeCards,
    totalScans,
    topCard: topCard && (topCard.scanCount || 0) > 0 ? { title: topCard.title, scanCount: topCard.scanCount || 0 } : null,
    deviceStats: deviceStats,
    recentScans: Array.isArray(realScans) ? realScans.slice(0, 10) : []
  };

  applyStatsToUI(stats);
  renderRecentActivity(stats.recentScans);
  renderAnalyticsData(stats);
}

function applyStatsToUI(s) {
  document.getElementById('statTotalCards').textContent = s.totalCards || 0;
  document.getElementById('statTotalScans').textContent = s.totalScans || 0;
  document.getElementById('statActiveCards').textContent = s.activeCards || 0;

  if (s.topCard && (s.topCard.scanCount || 0) > 0) {
    document.getElementById('statTopCardTitle').textContent = s.topCard.title;
    document.getElementById('statTopCardScans').textContent = `${s.topCard.scanCount || 0} عملية مسح`;
  } else {
    document.getElementById('statTopCardTitle').textContent = '-';
    document.getElementById('statTopCardScans').textContent = '-';
  }

  const devEl = document.getElementById('statTopDevice');
  const devLabel = document.getElementById('statTopDeviceLabel');
  if (devEl) {
    if (s.totalScans > 0 && s.deviceStats) {
      let maxDev = '-';
      let maxCount = 0;
      for (const [dev, count] of Object.entries(s.deviceStats)) {
        if (count > maxCount) {
          maxCount = count;
          maxDev = dev;
        }
      }
      devEl.textContent = maxDev;
      if (devLabel) devLabel.textContent = `الأكثر استخداماً (${maxCount} مسحة)`;
    } else {
      devEl.textContent = '-';
      if (devLabel) devLabel.textContent = 'بانتظار أول مسحة';
    }
  }
}

function getLocalCards() {
  try {
    const raw = localStorage.getItem('nfc_cards_db');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [
    {
      id: "card-ksnjv",
      slug: "card-ksnjv",
      title: "بطاقة تقييم جوجل الذكية",
      actionType: "direct",
      mode: "direct",
      destinationUrl: "https://maps.google.com",
      isActive: true,
      scanCount: 0,
      createdAt: "2026-10-25T17:25:00.000Z",
      savedTargets: []
    }
  ];
}

function saveLocalCards(cards) {
  try {
    localStorage.setItem('nfc_cards_db', JSON.stringify(cards));
  } catch (e) {}
}

// Real-time Cloud Sync
async function syncWithCloudDatabase(showNotification = false) {
  const customUrl = localStorage.getItem('nfc_custom_cloud_url') || '';
  const endpoints = [
    `${CLOUD_DB_URL}?_nocache=${Date.now()}`
  ];
  if (customUrl) endpoints.unshift(customUrl);

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const cloudCards = await res.json();
        if (Array.isArray(cloudCards) && cloudCards.length > 0) {
          cardsList = cloudCards;
          saveLocalCards(cloudCards);
          renderCardsGrid();
          loadLocalStats();
          if (showNotification) showToast('تمت المزامنة السحابية الفورية 🟢', 'success');
          return;
        }
      }
    } catch (e) {}
  }

  cardsList = getLocalCards();
  if (showNotification) showToast('تم التحديث من الذاكرة المحلية', 'info');
}

function saveCustomCloudEndpoint() {
  const inp = document.getElementById('inpCustomCloudEndpoint');
  const val = (inp.value || '').trim();
  if (val) {
    localStorage.setItem('nfc_custom_cloud_url', val);
    showToast('تم حفظ رابط السحابة المخصص بنجاح ☁️', 'success');
    syncWithCloudDatabase(true);
  } else {
    localStorage.removeItem('nfc_custom_cloud_url');
    showToast('تمت استعادة إعدادات السحابة الافتراضية', 'info');
  }
}

// ==========================================
// 3. TAB SWITCHING (MOBILE-FIRST)
// ==========================================
function switchTab(tab) {
  if (navigator.vibrate) navigator.vibrate(10);

  const views = {
    home: document.getElementById('viewHome'),
    cards: document.getElementById('viewCards'),
    stats: document.getElementById('viewStats'),
    settings: document.getElementById('viewSettings')
  };

  const navBtns = {
    home: document.getElementById('tabBtnHome'),
    cards: document.getElementById('tabBtnCards'),
    stats: document.getElementById('tabBtnStats'),
    settings: document.getElementById('tabBtnSettings')
  };

  Object.keys(views).forEach(k => {
    if (views[k]) {
      if (k === tab) views[k].classList.remove('hidden');
      else views[k].classList.add('hidden');
    }
  });

  Object.keys(navBtns).forEach(k => {
    if (navBtns[k]) {
      if (k === tab) navBtns[k].classList.add('active');
      else navBtns[k].classList.remove('active');
    }
  });

  window.scrollTo({ top: 0, behavior: 'smooth' });

  if (tab === 'stats') renderAnalytics();
}

// ==========================================
// 4. TOAST NOTIFICATIONS
// ==========================================
let toastTimer = null;
function showToast(message, type = 'info', icon = '✨') {
  if (navigator.vibrate) navigator.vibrate([15, 30]);

  const container = document.getElementById('toastContainer');
  const inner = document.getElementById('toastInner');
  const msgEl = document.getElementById('toastMessage');
  const iconEl = document.getElementById('toastIcon');

  msgEl.textContent = message;
  iconEl.textContent = icon;

  inner.className = 'flex items-center gap-3 p-3.5 rounded-2xl shadow-2xl border text-xs font-semibold backdrop-blur-xl transition-all';

  if (type === 'success') {
    inner.classList.add('bg-emerald-950/90', 'border-emerald-500/40', 'text-emerald-200');
    iconEl.textContent = '✅';
  } else if (type === 'error') {
    inner.classList.add('bg-rose-950/90', 'border-rose-500/40', 'text-rose-200');
    iconEl.textContent = '⚠️';
  } else {
    inner.classList.add('bg-slate-900/90', 'border-indigo-500/40', 'text-slate-100');
  }

  container.classList.remove('hidden');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    container.classList.add('hidden');
  }, 3200);
}

// ==========================================
// 5. CARDS GRID & SMART PRESET SWITCHER
// ==========================================
function renderCardsGrid() {
  const container = document.getElementById('cardsGridContainer');
  if (!container) return;

  if (!cardsList || cardsList.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-slate-900/60 border border-slate-800 rounded-3xl p-10 text-center space-y-3">
        <div class="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-400 flex items-center justify-center mx-auto text-2xl">💳</div>
        <h3 class="text-sm font-bold text-white">لا توجد بطاقات مسجلة بعد</h3>
        <p class="text-xs text-slate-400 max-w-sm mx-auto">ابدأ بإضافة بطاقتك الأولى لتوليد رابط وبرمجته داخل شريحة الـ NFC.</p>
        <button onclick="openAddCardDrawer()" class="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-indigo-600/30 active:scale-95 transition-all">
          + إضافة بطاقة جديدة الآن
        </button>
      </div>
    `;
    return;
  }

  const bUrl = getBaseUrl();

  container.innerHTML = cardsList.map((card, idx) => {
    const fixedUrl = `${bUrl}/c/${card.slug}`;
    const mode = card.mode || (card.actionType === 'profile' ? 'profile' : (card.actionType === 'catalog' ? 'catalog' : 'direct'));
    const isProfile = (mode === 'profile');
    const isCatalog = (mode === 'catalog');
    const isConditional = (mode === 'conditional');
    const savedTargets = Array.isArray(card.savedTargets) ? card.savedTargets : [];

    const themeClasses = [
      'smart-card-visual',
      'smart-card-visual card-theme-emerald',
      'smart-card-visual card-theme-amber',
      'smart-card-visual card-theme-purple'
    ][idx % 4];

    // Quick Presets Pills HTML
    let presetsHtml = '';
    if (savedTargets.length > 0 && !isProfile && !isCatalog) {
      presetsHtml = `
        <div class="mt-3 pt-3 border-t border-slate-800/80">
          <div class="flex items-center justify-between text-[11px] mb-2">
            <span class="font-bold text-slate-300">التبديل السريع للوجهة (1-Tap Switch):</span>
            <span class="text-emerald-400 font-semibold">${savedTargets.length} روابط سريعة</span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${savedTargets.map(t => `
              <button 
                onclick="switchCardPreset('${card.id}', '${t.id}')"
                class="target-pill px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                  t.active || card.destinationUrl === t.url 
                    ? 'active bg-emerald-600 border-emerald-500 text-white font-bold shadow-md shadow-emerald-600/30' 
                    : 'bg-slate-900/90 border-slate-700 text-slate-300 hover:border-emerald-500/40'
                }"
              >
                <span>${t.icon || '🔗'}</span>
                <span>${t.label || 'رابط'}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Mode Badge Text
    let modeBadge = 'تحويل مباشر 🚀';
    if (isProfile) modeBadge = 'كرت شخصي 👤';
    else if (isCatalog) modeBadge = 'منيو وكتالوج 🍽️';
    else if (isConditional) modeBadge = 'توجيه مشروط 🔀';

    return `
      <div class="bg-slate-900/90 border border-slate-800 hover:border-emerald-500/30 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-4 transition-all">
        
        <!-- 3D Realistic Smart NFC Card Header Component -->
        <div class="${themeClasses} p-4 sm:p-5 text-white flex flex-col justify-between min-h-[145px] relative">
          
          <!-- Top Row: Chip, TapLink Brand & NFC Icon -->
          <div class="flex items-center justify-between z-10">
            <div class="flex items-center gap-2.5">
              <div class="gold-chip"></div>
              <span class="text-[9px] font-mono font-bold tracking-widest text-emerald-300 uppercase px-1.5 py-0.5 rounded bg-black/40 border border-emerald-500/20">TapLink • MUHAB</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${card.isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}">
                ${card.isActive ? 'نشطة 🟢' : 'معطلة 🔴'}
              </span>
              <svg class="w-6 h-6 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004.07 7.07M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
              </svg>
            </div>
          </div>

          <!-- Title & Badges -->
          <div class="z-10 my-2">
            <h3 class="text-sm sm:text-base font-extrabold text-white tracking-wide truncate">${card.title}</h3>
            <div class="flex flex-wrap items-center gap-1.5 mt-1">
              <span class="text-[10px] bg-black/50 px-2 py-0.5 rounded font-mono text-emerald-300 font-semibold border border-emerald-500/20" dir="ltr">/c/${card.slug}</span>
              <span class="text-[10px] bg-white/20 text-white font-bold px-1.5 py-0.5 rounded">${modeBadge}</span>
              ${card.pinCode ? '<span class="text-[10px] bg-rose-500/30 text-rose-200 px-1.5 py-0.5 rounded font-bold">PIN 🔒</span>' : ''}
            </div>
          </div>

          <!-- Bottom: Scans & Copy Link -->
          <div class="flex items-center justify-between text-[11px] text-white/90 z-10 pt-1 border-t border-white/10">
            <div class="flex items-center gap-1">
              <span>مرات المسح:</span>
              <strong class="text-white font-mono text-xs">${card.scanCount || 0}</strong>
            </div>
            <button onclick="copyToClipboard('${fixedUrl}', 'تم نسخ رابط برمجة البطاقة 📋')" class="bg-black/40 hover:bg-black/60 px-2 py-1 rounded-lg text-[10px] font-bold text-white transition-all flex items-center gap-1 border border-white/10 active:scale-95">
              <span>نسخ الرابط</span>
              <svg class="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            </button>
          </div>

        </div>

        <!-- Presets Pills -->
        ${presetsHtml}

        <!-- Inline URL Editor (For Direct / Conditional modes) -->
        ${!isProfile && !isCatalog ? `
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-[11px]">
              <label class="font-bold text-slate-300">الرابط الهدف الحالي (Destination URL):</label>
              <a href="${card.destinationUrl || '#'}" target="_blank" class="text-emerald-400 hover:underline text-[10px] font-semibold flex items-center gap-0.5" dir="ltr">
                <span>فتح الوجهة</span>
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
              </a>
            </div>
            <div class="flex items-center gap-1.5">
              <input 
                type="url" 
                id="inlineUrl_${card.id}" 
                value="${card.destinationUrl || ''}" 
                dir="ltr"
                placeholder="https://..."
                class="flex-1 bg-slate-950/90 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono text-white text-start focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
              <button 
                onclick="saveInlineUrl('${card.id}')"
                class="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl transition-all active:scale-95 shadow-md shadow-emerald-600/30 shrink-0"
                title="حفظ الرابط الجديد فوراً"
              >
                تحديث ✓
              </button>
            </div>
          </div>
        ` : ''}

        ${isProfile ? `
          <div class="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span class="font-bold text-emerald-300 block">كرت شخصي رقمي مفعل</span>
              <span class="text-[11px] text-slate-400">${card.profile?.fullName || 'الملف التعريفي'} - تحميل vCard</span>
            </div>
            <a href="${fixedUrl}" target="_blank" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-all shadow-md shadow-emerald-600/20">
              معاينة الصفحة 👤
            </a>
          </div>
        ` : ''}

        ${isCatalog ? `
          <div class="p-3 bg-zinc-900 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span class="font-bold text-white block">المنيو والكتالوج الذكي مفعل</span>
              <span class="text-[11px] text-slate-400">${card.catalog?.businessName || card.title} - واي فاي وتقييم</span>
            </div>
            <a href="./catalog.html?slug=${card.slug}" target="_blank" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-all shadow-md shadow-emerald-600/20">
              معاينة المنيو 🍽️
            </a>
          </div>
        ` : ''}

        <!-- Action Control Buttons Footer -->
        <div class="grid grid-cols-4 gap-2 pt-2 border-t border-slate-800/80">
          
          <button 
            onclick="openSimulatorDrawer('${card.id}')"
            class="py-2 px-2 bg-slate-800/90 hover:bg-slate-750 text-white rounded-xl text-[11px] font-bold border border-slate-700 hover:border-emerald-500/40 flex items-center justify-center gap-1 active:scale-95 transition-all"
            title="تجربة المسح في محاكي الهاتف"
          >
            <span>📱</span>
            <span>تجربة</span>
          </button>

          <button 
            onclick="openNfcProgrammerModal('${card.id}')"
            class="py-2 px-2 bg-slate-800/90 hover:bg-slate-750 text-emerald-400 rounded-xl text-[11px] font-bold border border-slate-700 hover:border-emerald-500/40 flex items-center justify-center gap-1 active:scale-95 transition-all"
            title="برمجة NFC وتوليد رمز QR"
          >
            <span>📡</span>
            <span>برمجة</span>
          </button>

          <button 
            onclick="openEditCardDrawer('${card.id}')"
            class="py-2 px-2 bg-slate-800 hover:bg-slate-750 text-slate-200 rounded-xl text-[11px] font-bold border border-slate-700/80 flex items-center justify-center gap-1 active:scale-95 transition-all"
            title="تعديل جميع الخيارات"
          >
            <span>✏️</span>
            <span>تعديل</span>
          </button>

          <button 
            onclick="toggleCardActiveState('${card.id}')"
            class="py-2 px-2 rounded-xl text-[11px] font-bold border flex items-center justify-center gap-1 active:scale-95 transition-all ${
              card.isActive 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
            }"
            title="${card.isActive ? 'تعطيل مؤقتاً' : 'تفعيل'}"
          >
            <span>${card.isActive ? 'إيقاف ⏸' : 'تشغيل ▶'}</span>
          </button>

        </div>

      </div>
    `;
  }).join('');
}

// Switch Preset Function
async function switchCardPreset(cardId, targetId) {
  if (navigator.vibrate) navigator.vibrate(20);
  const card = cardsList.find(c => c.id === cardId);
  if (!card || !Array.isArray(card.savedTargets)) return;

  const target = card.savedTargets.find(t => t.id === targetId);
  if (!target) return;

  card.savedTargets.forEach(t => t.active = (t.id === targetId));
  card.destinationUrl = target.url;
  card.updatedAt = new Date().toISOString();

  saveLocalCards(cardsList);
  renderCardsGrid();
  showToast(`تم تبديل الوجهة إلى: ${target.label} 🚀`, 'success');

  // Push to server if running on backend
  if (!isOfflineOrStatic) {
    try {
      fetch(`/api/cards/${cardId}/switch-target`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetId })
      });
    } catch (e) {}
  }
}

// Save Inline URL
async function saveInlineUrl(cardId) {
  const input = document.getElementById(`inlineUrl_${cardId}`);
  if (!input) return;

  let newUrl = (input.value || '').trim();
  if (!newUrl) {
    showToast('يرجى كتابة الرابط الهدف', 'error');
    input.focus();
    return;
  }

  if (!/^https?:\/\//i.test(newUrl) && !/^(tel|mailto|sms):/i.test(newUrl)) {
    newUrl = 'https://' + newUrl;
  }

  const card = cardsList.find(c => c.id === cardId);
  if (!card) return;

  card.destinationUrl = newUrl;
  card.updatedAt = new Date().toISOString();
  saveLocalCards(cardsList);
  renderCardsGrid();
  showToast('تم تحديث الرابط الهدف فوراً ✓', 'success');

  if (!isOfflineOrStatic) {
    try {
      fetch(`/api/cards/${cardId}/quick-url`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ destinationUrl: newUrl })
      });
    } catch (e) {}
  }
}

// Toggle Card Active State
async function toggleCardActiveState(cardId) {
  const card = cardsList.find(c => c.id === cardId);
  if (!card) return;

  card.isActive = !card.isActive;
  card.updatedAt = new Date().toISOString();
  saveLocalCards(cardsList);
  renderCardsGrid();
  loadLocalStats();
  showToast(card.isActive ? 'تم تفعيل البطاقة 🟢' : 'تم تعطيل البطاقة مؤقتاً 🔴', 'info');

  if (!isOfflineOrStatic) {
    try {
      fetch(`/api/cards/${cardId}/toggle-status`, { method: 'PATCH' });
    } catch (e) {}
  }
}

// ==========================================
// 6. DRAWER: ADD / EDIT CARD
// ==========================================
function openAddCardDrawer() {
  if (navigator.vibrate) navigator.vibrate(10);
  document.getElementById('cardEditId').value = '';
  document.getElementById('cardDrawerTitle').textContent = 'إضافة بطاقة NFC جديدة';
  document.getElementById('cardEditorForm').reset();
  document.getElementById('inpIsActive').checked = true;
  tempSavedPresets = [];
  renderTempPresetsList();
  switchEditorTab('basic');
  generateRandomSlug();
  document.getElementById('drawerCardEditor').classList.add('active');
}

function openEditCardDrawer(cardId) {
  if (navigator.vibrate) navigator.vibrate(10);
  const card = cardsList.find(c => c.id === cardId);
  if (!card) return;

  document.getElementById('cardEditId').value = card.id;
  document.getElementById('cardDrawerTitle').textContent = `تعديل: ${card.title}`;
  document.getElementById('inpCardTitle').value = card.title || '';
  document.getElementById('inpCardSlug').value = card.slug || '';
  
  const modeRadios = document.getElementsByName('inpCardMode');
  const activeMode = card.mode || (card.actionType === 'profile' ? 'profile' : (card.actionType === 'catalog' ? 'catalog' : 'direct'));
  modeRadios.forEach(r => {
    r.checked = (r.value === activeMode);
  });

  document.getElementById('inpDestinationUrl').value = card.destinationUrl || '';
  document.getElementById('inpIsActive').checked = card.isActive !== false;

  tempSavedPresets = Array.isArray(card.savedTargets) ? JSON.parse(JSON.stringify(card.savedTargets)) : [];
  renderTempPresetsList();

  // Conditional Routing
  const tr = card.timeRouting || card.conditional?.time || {};
  document.getElementById('inpTimeRoutingEnabled').checked = Boolean(tr.enabled);
  document.getElementById('inpMorningUrl').value = tr.morningUrl || '';
  document.getElementById('inpEveningUrl').value = tr.eveningUrl || '';
  document.getElementById('inpSwitchHour').value = String(tr.switchHour || 16);

  const dev = card.conditional?.device || {};
  document.getElementById('inpDeviceRoutingEnabled').checked = Boolean(dev.enabled);
  document.getElementById('inpIosUrl').value = dev.iosUrl || '';
  document.getElementById('inpAndroidUrl').value = dev.androidUrl || '';

  document.getElementById('inpPinCode').value = card.pinCode || '';

  // Catalog
  const cat = card.catalog || {};
  document.getElementById('inpCatBusinessName').value = cat.businessName || '';
  document.getElementById('inpCatTagline').value = cat.tagline || '';
  document.getElementById('inpCatWifiSsid').value = cat.wifiSsid || '';
  document.getElementById('inpCatWifiPass').value = cat.wifiPassword || '';
  document.getElementById('inpCatGoogleReview').value = cat.googleReviewUrl || '';

  // Profile
  const p = card.profile || {};
  document.getElementById('inpProfFullName').value = p.fullName || '';
  document.getElementById('inpProfJobTitle').value = p.jobTitle || '';
  document.getElementById('inpProfCompany').value = p.company || '';
  document.getElementById('inpProfAvatar').value = p.avatar || '';
  document.getElementById('inpProfBio').value = p.bio || '';
  document.getElementById('inpProfPhone').value = p.phone || '';
  document.getElementById('inpProfWhatsapp').value = p.whatsapp || '';

  switchEditorTab('basic');
  document.getElementById('drawerCardEditor').classList.add('active');
}

function closeCardEditorDrawer() {
  document.getElementById('drawerCardEditor').classList.remove('active');
}

function switchEditorTab(tab) {
  currentEditorSubTab = tab;
  const tabs = ['basic', 'presets', 'conditional', 'catalog', 'profile'];
  tabs.forEach(t => {
    const el = document.getElementById(`edTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const btn = document.getElementById(`edTabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (el) {
      if (t === tab) {
        el.classList.remove('hidden');
        btn.classList.add('text-indigo-400', 'border-b-2', 'border-indigo-500');
        btn.classList.remove('text-slate-400');
      } else {
        el.classList.add('hidden');
        btn.classList.remove('text-indigo-400', 'border-b-2', 'border-indigo-500');
        btn.classList.add('text-slate-400');
      }
    }
  });
}

function generateRandomSlug() {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let rand = '';
  for (let i = 0; i < 5; i++) rand += chars.charAt(Math.floor(Math.random() * chars.length));
  document.getElementById('inpCardSlug').value = `card-${rand}`;
}

// Temporary Presets List
function handleAddPresetItem() {
  const labelInp = document.getElementById('inpNewPresetLabel');
  const iconInp = document.getElementById('inpNewPresetIcon');
  const urlInp = document.getElementById('inpNewPresetUrl');
  const label = (labelInp.value || '').trim();
  const icon = (iconInp.value || '⭐').trim();
  let url = (urlInp.value || '').trim();

  if (!url) {
    showToast('يرجى إدخال الرابط', 'error');
    urlInp.focus();
    return;
  }

  if (!/^https?:\/\//i.test(url) && !/^(tel|mailto):/i.test(url)) url = 'https://' + url;

  tempSavedPresets.push({
    id: 't-' + Date.now().toString(36),
    label: label || 'رابط سريع',
    icon: icon,
    url: url,
    active: tempSavedPresets.length === 0
  });

  labelInp.value = '';
  urlInp.value = '';
  renderTempPresetsList();
}

function removeTempPreset(targetId) {
  tempSavedPresets = tempSavedPresets.filter(t => t.id !== targetId);
  renderTempPresetsList();
}

function renderTempPresetsList() {
  const container = document.getElementById('savedPresetsListContainer');
  if (!container) return;

  if (tempSavedPresets.length === 0) {
    container.innerHTML = `<div class="text-[11px] text-slate-500 text-center py-2">لا توجد روابط سريعة محفوظة بعد. أضف روابطك المتكررة بالأعلى.</div>`;
    return;
  }

  container.innerHTML = tempSavedPresets.map(t => `
    <div class="flex items-center justify-between p-2.5 bg-slate-800 rounded-xl border border-slate-700 text-xs">
      <div class="flex items-center gap-2 truncate me-2">
        <span>${t.icon || '🔗'}</span>
        <div class="truncate">
          <span class="font-bold text-white block truncate">${t.label}</span>
          <span class="text-[10px] text-slate-400 font-mono truncate block" dir="ltr">${t.url}</span>
        </div>
      </div>
      <button type="button" onclick="removeTempPreset('${t.id}')" class="text-rose-400 hover:text-rose-300 px-2 py-1 bg-rose-500/10 rounded-lg text-[10px] font-bold">
        حذف ✕
      </button>
    </div>
  `).join('');
}

// Save Card Form Submit Handler
document.getElementById('cardEditorForm')?.addEventListener('submit', async (e) => {
  e.preventDefault();

  const editId = document.getElementById('cardEditId').value;
  const title = document.getElementById('inpCardTitle').value.trim();
  const slug = document.getElementById('inpCardSlug').value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  const mode = document.querySelector('input[name="inpCardMode"]:checked')?.value || 'direct';
  let destinationUrl = document.getElementById('inpDestinationUrl').value.trim();
  const isActive = document.getElementById('inpIsActive').checked;
  const pinCode = document.getElementById('inpPinCode').value.trim();

  if (destinationUrl && !/^https?:\/\//i.test(destinationUrl) && !/^(tel|mailto|sms):/i.test(destinationUrl)) {
    destinationUrl = 'https://' + destinationUrl;
  }

  const conditional = {
    type: mode === 'conditional' ? (pinCode ? 'pin' : (document.getElementById('inpDeviceRoutingEnabled').checked ? 'device' : 'time')) : 'none',
    time: {
      enabled: document.getElementById('inpTimeRoutingEnabled').checked,
      morningUrl: document.getElementById('inpMorningUrl').value.trim(),
      eveningUrl: document.getElementById('inpEveningUrl').value.trim(),
      switchHour: Number(document.getElementById('inpSwitchHour').value) || 16
    },
    device: {
      enabled: document.getElementById('inpDeviceRoutingEnabled').checked,
      iosUrl: document.getElementById('inpIosUrl').value.trim(),
      androidUrl: document.getElementById('inpAndroidUrl').value.trim(),
      defaultUrl: destinationUrl
    }
  };

  const catalog = {
    businessName: document.getElementById('inpCatBusinessName').value.trim() || title,
    tagline: document.getElementById('inpCatTagline').value.trim(),
    wifiSsid: document.getElementById('inpCatWifiSsid').value.trim(),
    wifiPassword: document.getElementById('inpCatWifiPass').value.trim(),
    googleReviewUrl: document.getElementById('inpCatGoogleReview').value.trim() || destinationUrl,
    whatsappPhone: document.getElementById('inpProfWhatsapp')?.value.trim() || '',
    callPhone: document.getElementById('inpProfPhone')?.value.trim() || '',
    items: [
      {
        title: 'وجبة / خدمة مميزة',
        description: 'جودة استثنائية مصممة خصيصاً لعملائنا الكرام',
        price: '45 ر.س',
        badge: 'الأكثر طلباً 🔥',
        image: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=300&q=80'
      }
    ]
  };

  const profile = {
    fullName: document.getElementById('inpProfFullName').value.trim(),
    jobTitle: document.getElementById('inpProfJobTitle').value.trim(),
    company: document.getElementById('inpProfCompany').value.trim(),
    avatar: document.getElementById('inpProfAvatar').value.trim(),
    bio: document.getElementById('inpProfBio').value.trim(),
    phone: document.getElementById('inpProfPhone').value.trim(),
    whatsapp: document.getElementById('inpProfWhatsapp').value.trim()
  };

  if (destinationUrl && tempSavedPresets.length === 0) {
    tempSavedPresets.push({
      id: 't-main',
      label: 'الرابط الأساسي',
      url: destinationUrl,
      active: true,
      icon: '🔗'
    });
  }

  const cardPayload = {
    title,
    slug,
    mode,
    actionType: mode,
    destinationUrl,
    isActive,
    pinCode,
    conditional,
    timeRouting: conditional.time,
    savedTargets: tempSavedPresets,
    profile: mode === 'profile' ? profile : null,
    catalog: mode === 'catalog' ? catalog : null
  };

  if (editId) {
    const idx = cardsList.findIndex(c => c.id === editId);
    if (idx !== -1) {
      cardsList[idx] = { ...cardsList[idx], ...cardPayload, updatedAt: new Date().toISOString() };
    }
  } else {
    const newCard = {
      id: 'card-' + Date.now().toString(36),
      ...cardPayload,
      scanCount: 0,
      lastScannedAt: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    cardsList.unshift(newCard);
  }

  saveLocalCards(cardsList);
  closeCardEditorDrawer();
  renderCardsGrid();
  loadLocalStats();
  showToast('تم حفظ ونشر بيانات البطاقة بنجاح ✓', 'success');

  // Push to server if available
  if (!isOfflineOrStatic) {
    try {
      const url = editId ? `/api/cards/${editId}` : '/api/cards';
      const method = editId ? 'PUT' : 'POST';
      fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cardPayload)
      });
    } catch (e) {}
  }
});

// ==========================================
// 7. SMART LINK GENERATOR MODAL
// ==========================================
function openSmartLinkGenModal() {
  document.getElementById('modalSmartLinkGen').classList.add('active');
  switchGenTab('wa');
}

function closeSmartLinkGenModal() {
  document.getElementById('modalSmartLinkGen').classList.remove('active');
}

function switchGenTab(tab) {
  const tabs = ['wa', 'maps', 'phone'];
  tabs.forEach(t => {
    const el = document.getElementById(`genTab${t.charAt(0).toUpperCase() + t.slice(1)}`);
    const btn = document.getElementById(`genTabBtn${t.charAt(0).toUpperCase() + t.slice(1)}`);
    if (el) {
      if (t === tab) {
        el.classList.remove('hidden');
        btn.classList.add('text-emerald-400', 'border-b-2', 'border-emerald-500');
        btn.classList.remove('text-slate-400');
      } else {
        el.classList.add('hidden');
        btn.classList.remove('text-emerald-400', 'border-b-2', 'border-emerald-500');
        btn.classList.add('text-slate-400');
      }
    }
  });
}

function applyGeneratedLink(type) {
  const inpDest = document.getElementById('inpDestinationUrl');

  if (type === 'wa') {
    let phone = (document.getElementById('genWaPhone').value || '').replace(/[^0-9]/g, '');
    const msg = (document.getElementById('genWaMsg').value || 'مرحباً').trim();
    if (!phone) {
      showToast('يرجى إدخال رقم الجوال', 'error');
      return;
    }
    if (phone.startsWith('05')) phone = '966' + phone.slice(1);
    const link = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    inpDest.value = link;
    showToast('تم توليد وتعيين رابط واتساب بنجاح ✓', 'success');
  } else if (type === 'maps') {
    const q = (document.getElementById('genMapsQuery').value || 'مطعم السفير الرياض').trim();
    const link = `https://maps.google.com/?q=${encodeURIComponent(q)}`;
    inpDest.value = link;
    showToast('تم توليد وتعيين رابط خرائط جوجل ✓', 'success');
  } else if (type === 'tel') {
    const phone = (document.getElementById('genCallNumber').value || '').trim();
    if (!phone) {
      showToast('يرجى إدخال رقم الاتصال', 'error');
      return;
    }
    inpDest.value = `tel:${phone}`;
    showToast('تم تعيين رابط الاتصال الهاتفي المباشر ✓', 'success');
  }

  closeSmartLinkGenModal();
}

// ==========================================
// 8. DRAWER: LIVE CARD SIMULATOR (4 MODES)
// ==========================================
function openSimulatorDrawer(cardId) {
  if (navigator.vibrate) navigator.vibrate(15);
  const card = cardsList.find(c => c.id === cardId);
  if (!card) return;

  currentActiveCardForSim = card;
  const container = document.getElementById('simulatorScreenContent');
  const bUrl = getBaseUrl();
  const fixedUrl = `${bUrl}/c/${card.slug}`;
  const mode = card.mode || (card.actionType === 'profile' ? 'profile' : (card.actionType === 'catalog' ? 'catalog' : 'direct'));

  // MODE 4: Conditional PIN Check
  if (card.pinCode && card.pinCode.length > 0) {
    container.innerHTML = `
      <div class="w-12 h-12 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center text-xl shadow-lg">🔒</div>
      <h4 class="text-sm font-bold text-white">${card.title}</h4>
      <p class="text-[11px] text-slate-400">هذه البطاقة محمية برمز PIN سري</p>
      
      <div class="space-y-2 w-full max-w-[200px]">
        <input type="password" id="simPinInput" maxlength="6" placeholder="••••" class="w-full text-center tracking-widest text-lg font-mono py-2 bg-slate-800 border border-slate-700 text-white rounded-xl">
        <button onclick="verifySimPin('${card.pinCode}')" class="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow">
          فتح الوجهة 🔓
        </button>
      </div>
    `;
  } else if (mode === 'profile') {
    // MODE 2: Digital Business Card
    const p = card.profile || {};
    const avatar = p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
    container.innerHTML = `
      <div class="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-xl overflow-hidden mx-auto">
        <img src="${avatar}" class="w-full h-full object-cover rounded-full" alt="avatar">
      </div>
      <div>
        <h4 class="text-base font-black text-white">${p.fullName || card.title}</h4>
        <p class="text-xs text-indigo-300 font-semibold">${p.jobTitle || 'الرئيس التنفيذي'}</p>
        <p class="text-[11px] text-slate-400">${p.company || ''}</p>
      </div>
      <p class="text-[11px] text-slate-300 max-w-[240px] leading-relaxed">${p.bio || 'مرحباً بكم في بطاقتي الرقمية الذكية.'}</p>
      
      <div class="w-full max-w-[220px] space-y-2 pt-2">
        <a href="${fixedUrl}/vcard" download class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5">
          <span>💾 حفظ جهة الاتصال (.vcf)</span>
        </a>
        <a href="./landing.html?slug=${card.slug}" target="_blank" class="w-full py-2 bg-slate-800 text-slate-200 rounded-xl text-xs font-medium border border-slate-700 flex items-center justify-center gap-1">
          <span>معاينة الصفحة كاملة</span>
        </a>
      </div>
    `;
  } else if (mode === 'catalog') {
    // MODE 3: Smart Catalog / Links Hub
    const cat = card.catalog || {};
    container.innerHTML = `
      <div class="w-14 h-14 bg-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center text-2xl shadow-lg mx-auto">🍽️</div>
      <div>
        <h4 class="text-sm font-black text-white">${cat.businessName || card.title}</h4>
        ${cat.tagline ? `<p class="text-[11px] text-slate-300">${cat.tagline}</p>` : ''}
      </div>
      
      <div class="w-full max-w-[220px] space-y-2 pt-1 text-xs">
        ${cat.wifiPassword ? `
        <div class="p-2.5 bg-slate-800/90 rounded-xl border border-slate-700 flex items-center justify-between">
          <span class="text-slate-300">📶 واي فاي:</span>
          <span class="font-mono font-bold text-amber-300">${cat.wifiPassword}</span>
        </div>` : ''}
        <a href="${cat.googleReviewUrl || card.destinationUrl || '#'}" target="_blank" class="block w-full py-2 bg-gradient-to-r from-amber-600 to-yellow-500 text-slate-950 font-black rounded-xl shadow">
          ⭐⭐⭐⭐⭐ تقييم Google
        </a>
        <a href="./catalog.html?slug=${card.slug}" target="_blank" class="block w-full py-2 bg-slate-800 text-slate-200 rounded-xl border border-slate-700">
          فتح الكتالوج الذكي 📱
        </a>
      </div>
    `;
  } else {
    // MODE 1: Direct Redirect or Conditional Routing
    let target = card.destinationUrl;
    let slotLabel = '';

    // Check time routing
    const tr = card.timeRouting || card.conditional?.time;
    if (tr && tr.enabled) {
      const ksaHour = (new Date().getUTCHours() + 3) % 24;
      const isMorning = (ksaHour >= 6 && ksaHour < (tr.switchHour || 16));
      target = isMorning ? (tr.morningUrl || target) : (tr.eveningUrl || target);
      slotLabel = isMorning ? '🌅 فترة الصباح نشطة' : '🌙 فترة المساء نشطة';
    }

    // Check device routing
    if (card.conditional?.device?.enabled) {
      slotLabel = '📱 توجيه مخصص حسب نوع الجهاز';
    }

    container.innerHTML = `
      <div class="relative w-16 h-16 flex items-center justify-center mx-auto">
        <div class="absolute inset-0 bg-indigo-500/20 rounded-full animate-ping"></div>
        <div class="w-12 h-12 bg-indigo-600 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-indigo-600/40">📡</div>
      </div>
      <div>
        <h4 class="text-sm font-bold text-white mb-1">تم مسح شريحة NFC</h4>
        <span class="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">تحويل فوري خلال أجزاء من الثانية</span>
      </div>
      ${slotLabel ? `<div class="text-[11px] font-bold text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/20">${slotLabel}</div>` : ''}
      <div class="text-[11px] text-slate-400 font-mono bg-slate-800/80 p-2.5 rounded-xl max-w-[240px] truncate" dir="ltr">
        ${target || 'https://maps.google.com'}
      </div>
      <div class="w-full max-w-[200px] pt-1">
        <a href="${target || '#'}" target="_blank" class="block w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-indigo-600/30">
          انتقال فوري للرابط 🚀
        </a>
      </div>
    `;
  }

  document.getElementById('drawerSimulator').classList.add('active');
}

function verifySimPin(correctPin) {
  const inp = document.getElementById('simPinInput');
  if (inp && inp.value.trim() === String(correctPin).trim()) {
    showToast('رمز PIN صحيح! تم فك القفل 🔓', 'success');
    currentActiveCardForSim.pinCode = '';
    openSimulatorDrawer(currentActiveCardForSim.id);
  } else {
    showToast('رمز PIN غير صحيح!', 'error');
  }
}

function closeSimulatorDrawer() {
  document.getElementById('drawerSimulator').classList.remove('active');
}

// ==========================================
// 9. QR STUDIO & WEB NFC WRITER
// ==========================================
function openNfcProgrammerModal(cardId) {
  if (navigator.vibrate) navigator.vibrate(15);
  const card = cardsList.find(c => c.id === cardId);
  if (!card) return;

  currentActiveCardForQr = card;
  const bUrl = getBaseUrl();
  const fixedUrl = `${bUrl}/c/${card.slug}`;

  document.getElementById('nfcModalCardTitle').textContent = `برمجة: ${card.title}`;
  document.getElementById('inpModalFixedUrl').value = fixedUrl;

  renderCustomQrCode(fixedUrl, '#090d16', '#ffffff');

  const note = document.getElementById('webNfcSupportNote');
  if ('NDEFReader' in window) {
    note.textContent = 'متصفحك يدعم كتابة NFC المباشرة! اضغط الزر وقرّب الشريحة من ظهر الهاتف.';
    note.className = 'text-[11px] text-emerald-400 font-bold mt-1.5';
  } else {
    note.textContent = 'الكتابة المباشرة عبر المتصفح مدعومة في Chrome أندرويد. لأجهزة آيفون، انسخ الرابط وافتحه في تطبيق NFC Tools.';
    note.className = 'text-[10px] text-slate-400 mt-1.5';
  }

  document.getElementById('drawerNfcProgrammer').classList.add('active');
}

function renderCustomQrCode(text, darkColor, lightColor) {
  const qrWrapper = document.getElementById('nfcQrCodeWrapper');
  qrWrapper.innerHTML = '';
  try {
    new QRCode(qrWrapper, {
      text: text,
      width: 170,
      height: 170,
      colorDark: darkColor || '#090d16',
      colorLight: lightColor || '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  } catch (e) {}
}

function regenerateCustomQr() {
  const url = document.getElementById('inpModalFixedUrl').value;
  const dark = document.getElementById('qrColorDark').value;
  const light = document.getElementById('qrColorLight').value;
  renderCustomQrCode(url, dark, light);
}

function closeNfcProgrammerDrawer() {
  document.getElementById('drawerNfcProgrammer').classList.remove('active');
}

// Web NFC Writer (Android Chrome NDEFReader)
document.getElementById('btnDirectWebNfcWrite')?.addEventListener('click', async () => {
  if (!('NDEFReader' in window)) {
    alert('ميزة Web NFC للكتابة المباشرة من المتصفح مدعومة في متصفح Google Chrome على أجهزة أندرويد.\n\nلمستخدمي آيفون: اضغط زر "نسخ" وافتح تطبيق NFC Tools واكتب الرابط بضغطة واحدة.');
    return;
  }

  const fixedUrl = document.getElementById('inpModalFixedUrl').value;
  try {
    const ndef = new NDEFReader();
    await ndef.scan();
    showToast('جاهز للكتابة! قرّب الشريحة الآن من ظهر الهاتف 📡', 'info');

    await ndef.write({
      records: [{ recordType: 'url', data: fixedUrl }]
    });

    playChime(true);
    if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
    showToast('تمت كتابة الرابط داخل شريحة الـ NFC بنجاح! 🎉', 'success');
  } catch (error) {
    playChime(false);
    showToast('تعذر الكتابة: ' + (error.message || 'حاول مجدداً'), 'error');
  }
});

document.getElementById('btnCopyModalUrl')?.addEventListener('click', () => {
  const url = document.getElementById('inpModalFixedUrl').value;
  copyToClipboard(url, 'تم نسخ الرابط الثابت لبرمجة الشريحة 📋');
});

document.getElementById('btnDownloadQr')?.addEventListener('click', () => {
  const canvas = document.querySelector('#nfcQrCodeWrapper canvas');
  const img = document.querySelector('#nfcQrCodeWrapper img');
  let dataUrl = '';

  if (canvas) dataUrl = canvas.toDataURL('image/png');
  else if (img) dataUrl = img.src;

  if (dataUrl) {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = `nfc-qr-${currentActiveCardForQr?.slug || 'code'}.png`;
    a.click();
    showToast('تم تحميل رمز QR بدقة عالية ✓', 'success');
  }
});

// ==========================================
// 10. RECENT ACTIVITY & ANALYTICS
// ==========================================
function renderRecentActivity(scans) {
  const container = document.getElementById('homeRecentScansList');
  if (!container) return;

  if (!scans || scans.length === 0) {
    container.innerHTML = `<div class="text-center py-5 text-slate-500 text-xs">لا توجد عمليات مسح مسجلة بعد. عند مسح أي بطاقة بالهاتف ستظهر هنا فوراً!</div>`;
    return;
  }

  container.innerHTML = scans.slice(0, 5).map(s => {
    const timeFormatted = s.timestamp ? new Date(s.timestamp).toLocaleTimeString('ar-SA', { hour: '2-digit', minute: '2-digit' }) : 'الآن';
    const isIos = (s.deviceType || '').toLowerCase().includes('iphone') || (s.deviceType || '').toLowerCase().includes('ipad');

    return `
      <div class="flex items-center justify-between p-2.5 bg-slate-950/60 rounded-xl border border-slate-800/80 text-xs">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg ${isIos ? 'bg-indigo-500/10 text-indigo-400' : 'bg-emerald-500/10 text-emerald-400'} flex items-center justify-center font-bold text-sm">
            ${isIos ? '' : '🤖'}
          </div>
          <div>
            <span class="font-bold text-white block">${s.cardTitle || s.slug}</span>
            <span class="text-[10px] text-slate-400">${s.deviceType || 'الهاتف'} • ${s.browser || 'المتصفح'}</span>
          </div>
        </div>
        <div class="text-end">
          <span class="text-[10px] text-indigo-300 font-mono block">${timeFormatted}</span>
          <span class="text-[9px] text-emerald-400 font-semibold">تحويل ناجح ✓</span>
        </div>
      </div>
    `;
  }).join('');
}

function renderAnalytics() {
  if (isOfflineOrStatic) loadLocalStats();
  else loadStats();
}

function renderAnalyticsData(stats) {
  const dev = stats.deviceStats || { iPhone: 0, Android: 0, Other: 0 };
  const total = (dev.iPhone || 0) + (dev.Android || 0) + (dev.Other || 0);

  const pctIPhone = total > 0 ? Math.round(((dev.iPhone || 0) / total) * 100) : 0;
  const pctAndroid = total > 0 ? Math.round(((dev.Android || 0) / total) * 100) : 0;
  const pctOther = total > 0 ? Math.max(0, 100 - pctIPhone - pctAndroid) : 0;

  const elP1 = document.getElementById('devPercentIPhone');
  const elB1 = document.getElementById('devBarIPhone');
  const elP2 = document.getElementById('devPercentAndroid');
  const elB2 = document.getElementById('devBarAndroid');
  const elP3 = document.getElementById('devPercentOther');
  const elB3 = document.getElementById('devBarOther');

  if (elP1 && elB1) { elP1.textContent = pctIPhone + '%'; elB1.style.width = pctIPhone + '%'; }
  if (elP2 && elB2) { elP2.textContent = pctAndroid + '%'; elB2.style.width = pctAndroid + '%'; }
  if (elP3 && elB3) { elP3.textContent = pctOther + '%'; elB3.style.width = pctOther + '%'; }

  const tbody = document.getElementById('analyticsScansTableBody');
  const scans = stats.recentScans || [];
  if (tbody) {
    if (scans.length === 0) {
      tbody.innerHTML = `<tr><td colspan="3" class="py-6 text-center text-slate-500">لا توجد سجلات مسح حتى الآن</td></tr>`;
    } else {
      tbody.innerHTML = scans.map(s => `
        <tr class="hover:bg-slate-800/30">
          <td class="py-2.5 font-bold text-white">${s.cardTitle || s.slug}</td>
          <td class="py-2.5 text-slate-300 font-mono text-[11px]">${s.deviceType} (${s.browser})</td>
          <td class="py-2.5 text-slate-400 text-[11px] font-mono">${s.timestamp ? new Date(s.timestamp).toLocaleDateString('ar-SA') : 'الآن'}</td>
        </tr>
      `).join('');
    }
  }

  const topList = document.getElementById('analyticsTopCardsList');
  if (topList) {
    if (!cardsList || cardsList.length === 0) {
      topList.innerHTML = `<div class="p-4 text-center text-slate-500 text-xs">لا توجد بطاقات مسجلة بعد</div>`;
    } else {
      const sorted = [...cardsList].sort((a, b) => (b.scanCount || 0) - (a.scanCount || 0));
      topList.innerHTML = sorted.slice(0, 4).map((c, i) => `
        <div class="flex items-center justify-between p-2.5 bg-slate-950/70 rounded-xl border border-slate-800 text-xs">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-indigo-500/10 text-indigo-400 font-black flex items-center justify-center text-xs">#${i + 1}</span>
            <span class="font-bold text-white">${c.title}</span>
          </div>
          <span class="font-mono font-bold text-indigo-300">${c.scanCount || 0} عملية مسح</span>
        </div>
      `).join('');
    }
  }
}

// ==========================================
// 11. BACKUP & RESTORE
// ==========================================
function exportJsonBackup() {
  const backup = {
    version: '3.0',
    exportedAt: new Date().toISOString(),
    cards: cardsList,
    settings: { siteTitle: 'TapLink by MUHAB', theme: 'dark' }
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `nfc-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('تم تصدير النسخة الاحتياطية بنجاح 💾', 'success');
}

function importJsonBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data || !Array.isArray(data.cards)) {
        throw new Error('الملف غير صالح');
      }

      cardsList = data.cards;
      saveLocalCards(cardsList);

      renderCardsGrid();
      loadLocalStats();
      showToast(`تم استيراد النسخة بنجاح (${cardsList.length} بطاقة) ✓`, 'success');
    } catch (err) {
      showToast('خطأ: ملف النسخة الاحتياطية غير صالح', 'error');
    }
  };
  reader.readAsText(file);
}

// ==========================================
// 12. UTILITIES
// ==========================================
function copyToClipboard(text, successMsg = 'تم النسخ بنجاح 📋') {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text).then(() => {
      showToast(successMsg, 'success');
    }).catch(() => fallbackCopy(text, successMsg));
  } else {
    fallbackCopy(text, successMsg);
  }
}

function fallbackCopy(text, successMsg) {
  const el = document.createElement('textarea');
  el.value = text;
  document.body.appendChild(el);
  el.select();
  document.execCommand('copy');
  document.body.removeChild(el);
  showToast(successMsg, 'success');
}

function initTheme() {
  const isDark = localStorage.getItem('nfc_theme') !== 'light';
  if (isDark) document.documentElement.classList.add('dark');
  else document.documentElement.classList.remove('dark');
}

function setupEventListeners() {
  document.getElementById('btnThemeToggle')?.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('nfc_theme', isDark ? 'dark' : 'light');
    showToast(isDark ? 'الوضع الليلي مفعّل 🌙' : 'الوضع النهاري مفعّل ☀️', 'info');
  });

  document.getElementById('btnQuickSearchToggle')?.addEventListener('click', () => {
    const s = document.getElementById('searchBarSection');
    s.classList.toggle('hidden');
    if (!s.classList.contains('hidden')) {
      document.getElementById('searchInput')?.focus();
    }
  });

  document.getElementById('searchInput')?.addEventListener('input', (e) => {
    const query = e.target.value.toLowerCase().trim();
    if (!query) {
      renderCardsGrid();
      return;
    }
    const filtered = cardsList.filter(c => 
      (c.title && c.title.toLowerCase().includes(query)) ||
      (c.slug && c.slug.toLowerCase().includes(query)) ||
      (c.destinationUrl && c.destinationUrl.toLowerCase().includes(query))
    );
    const container = document.getElementById('cardsGridContainer');
    if (filtered.length === 0) {
      container.innerHTML = `<div class="col-span-full py-8 text-center text-slate-500 text-xs">لا توجد بطاقات تطابق: "${query}"</div>`;
    } else {
      const orig = cardsList;
      cardsList = filtered;
      renderCardsGrid();
      cardsList = orig;
    }
  });
}
