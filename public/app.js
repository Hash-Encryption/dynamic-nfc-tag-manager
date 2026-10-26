/**
 * TapLink NFC Tag & Dynamic Routing Engine - v3.5 PRO
 * Full English-First Bilingual Support (English LTR Default / Arabic RTL)
 * TapLink by MUHAB
 */

// Application Global State
let cardsList = [];
let scansList = [];
let currentActiveCardForQr = null;
let currentActiveCardForSim = null;
let isOfflineOrStatic = false;
let currentEditorSubTab = 'basic';
let currentFilterMode = 'all';
let tempSavedPresets = [];

const DEFAULT_ADMIN_PASS = 'admin123';
const PRIMARY_CLOUD_DB = "https://api.npoint.io/6d3e9c78f9fac9e8db1e";
const PRIMARY_CLOUD_WRITE = "https://www.npoint.io/documents/6d3e9c78f9fac9e8db1e";
const BACKUP_CLOUD_DB = "https://api.npoint.io/556564d7073a07a6d7a3";
const BACKUP_CLOUD_WRITE = "https://www.npoint.io/documents/556564d7073a07a6d7a3";
const CLOUD_DB_URL = "https://raw.githubusercontent.com/Hash-Encryption/dynamic-nfc-tag-manager/main/data/cards.json";
const CDN_DB_URL = "https://cdn.jsdelivr.net/gh/Hash-Encryption/dynamic-nfc-tag-manager@main/data/cards.json";

// i18n Translation Helper
const t = (key, fallback) => (window.I18N ? window.I18N.t(key, fallback) : (fallback || key));

// Production Auto URL Sanitizer Helper
function sanitizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();
  url = url.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();
  if (!url) return '';
  if (/^(tel|mailto|sms|whatsapp|tg|geo):/i.test(url)) return url;
  url = url.replace(/[\s\r\n\t]+/g, '');
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return 'https:' + url;
  return 'https://' + url;
}

// Calculate base URL cleanly (Default Base: '/')
function getBaseUrl() {
  if (window.APP_CONFIG && window.APP_CONFIG.baseUrl) {
    return window.APP_CONFIG.baseUrl.replace(/\/$/, '');
  }
  const origin = window.location.origin;
  
  if (window.location.hostname.endsWith('github.io') && window.location.pathname.startsWith('/dynamic-nfc-tag-manager')) {
    return `${origin}/dynamic-nfc-tag-manager`;
  }
  return origin;
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
  if (window.__IS_CARD_REDIRECT) return; // Skip dashboard logic on instant NFC redirect!
  if (window.I18N) window.I18N.init();
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
  const isAuth = localStorage.getItem('nfc_admin_auth') === 'authenticated' || sessionStorage.getItem('nfc_admin_auth') === 'authenticated';

  if (!isAuth) {
    lockScreen?.classList.remove('hidden');
  } else {
    lockScreen?.classList.add('hidden');
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
      lockScreen?.classList.add('hidden');
      document.getElementById('lockErrorMsg')?.classList.add('hidden');
      showToast(t('lock_unlocked', 'Welcome! Dashboard unlocked 🔓'), 'success');
      playChime(true);
      checkAuthAndLoad();
    } else {
      document.getElementById('lockErrorMsg')?.classList.remove('hidden');
      playChime(false);
      if (navigator.vibrate) navigator.vibrate([40, 100, 40]);
    }
  });

  document.getElementById('btnLockAdmin')?.addEventListener('click', () => {
    localStorage.removeItem('nfc_admin_auth');
    sessionStorage.removeItem('nfc_admin_auth');
    lockScreen?.classList.remove('hidden');
    document.getElementById('adminLockPassword').value = '';
    showToast(t('lock_locked', 'Dashboard locked for security 🔒'), 'info');
  });
}

function changeAdminPasswordHandler() {
  const current = document.getElementById('inpCurrentAdminPass').value.trim();
  const next = document.getElementById('inpNewAdminPass').value.trim();
  const savedPass = localStorage.getItem('nfc_custom_admin_pass') || DEFAULT_ADMIN_PASS;

  if (current !== savedPass && current !== DEFAULT_ADMIN_PASS) {
    showToast(t('toast_invalid_pass', 'Current password is incorrect'), 'error');
    return;
  }

  if (next.length < 4) {
    showToast(t('toast_short_pass', 'New password must be at least 4 characters'), 'error');
    return;
  }

  localStorage.setItem('nfc_custom_admin_pass', next);
  document.getElementById('inpCurrentAdminPass').value = '';
  document.getElementById('inpNewAdminPass').value = '';
  showToast(t('toast_pass_changed', 'Master password updated successfully! ✓'), 'success');
}

// ==========================================
// 2. DATA LOADING & REAL-TIME CLOUD SYNC
// ==========================================
async function checkAuthAndLoad() {
  const isAuth = localStorage.getItem('nfc_admin_auth') === 'authenticated' || sessionStorage.getItem('nfc_admin_auth') === 'authenticated';
  const lockScreen = document.getElementById('adminSecurityLock');

  // Strict Admin Protection: Always require login password
  if (!isAuth) {
    lockScreen?.classList.remove('hidden');
    return;
  }

  lockScreen?.classList.add('hidden');

  const isStatic = window.location.hostname.includes('github.io') || window.location.hostname.includes('vercel.app') || window.location.protocol === 'file:';
  if (isStatic) {
    enableStaticStorageMode();
    return;
  }

  try {
    const res = await fetch('/api/auth/check');
    if (!res.ok && res.status !== 401) {
      enableStaticStorageMode();
      return;
    }

    const data = await res.json();
    if (!data.authenticated) {
      lockScreen?.classList.remove('hidden');
      return;
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
  const elTotal = document.getElementById('statTotalCards');
  const elScans = document.getElementById('statTotalScans');
  const elActive = document.getElementById('statActiveCards');
  if (elTotal) elTotal.textContent = s.totalCards || 0;
  if (elScans) elScans.textContent = s.totalScans || 0;
  if (elActive) elActive.textContent = s.activeCards || 0;

  const topCardTitle = document.getElementById('statTopCardTitle');
  const topCardScans = document.getElementById('statTopCardScans');
  if (topCardTitle && topCardScans) {
    if (s.topCard && (s.topCard.scanCount || 0) > 0) {
      topCardTitle.textContent = s.topCard.title;
      topCardScans.textContent = `${s.topCard.scanCount || 0} ${t('scans_count_suffix', 'scans')}`;
    } else {
      topCardTitle.textContent = '-';
      topCardScans.textContent = '-';
    }
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
      if (devLabel) devLabel.textContent = `${t('stat_top_device', 'Top Device')} (${maxCount} ${t('scans_count_suffix', 'scans')})`;
    } else {
      devEl.textContent = '-';
      if (devLabel) devLabel.textContent = t('stat_awaiting_scans', 'Awaiting first tap');
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
      managePin: "1234",
      savedTargets: []
    },
    {
      id: "card-cardtest",
      slug: "cardtest",
      title: "Google Reviews Smart Card - cardtest",
      actionType: "direct",
      mode: "direct",
      destinationUrl: "https://maps.google.com",
      isActive: true,
      scanCount: 0,
      createdAt: "2026-10-26T14:00:00.000Z",
      managePin: "1234",
      savedTargets: [
        {
          id: "t-google",
          label: "Google Reviews 5-Star",
          url: "https://maps.google.com",
          active: true,
          icon: "⭐"
        }
      ]
    }
  ];
}

// Asynchronous Real-Time Cloud Synchronization
async function syncPushToCloudDatabase(cards) {
  if (!Array.isArray(cards)) return;
  const payload = JSON.stringify({ contents: JSON.stringify(cards) });
  const targets = [PRIMARY_CLOUD_WRITE, BACKUP_CLOUD_WRITE];
  
  const statusEl = document.getElementById('topCloudStatusText');
  if (statusEl) {
    statusEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span><span>' + t('cloud_status_syncing', 'Syncing to global cloud...') + '</span>';
  }

  const promises = targets.map(async (url) => {
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      });
      return res.ok;
    } catch (e) {
      try {
        const res2 = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-HTTP-Method-Override': 'PATCH' },
          body: payload
        });
        return res2.ok;
      } catch (err) {
        return false;
      }
    }
  });

  try {
    const results = await Promise.allSettled(promises);
    const anySuccess = results.some(r => r.status === 'fulfilled' && r.value === true);
    if (anySuccess && statusEl) {
      statusEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 pulse-active"></span><span data-i18n="cloud_status_connected">🌐 Global Cloud Active - Synced on all devices</span>';
    }
  } catch (e) {}
}

function saveLocalCards(cards, skipCloudPush = false) {
  try {
    localStorage.setItem('nfc_cards_db', JSON.stringify(cards));
  } catch (e) {}
  if (!skipCloudPush) {
    syncPushToCloudDatabase(cards);
  }
}

async function syncWithCloudDatabase(showNotification = false) {
  const customUrl = localStorage.getItem('nfc_custom_cloud_url') || '';
  let repoBase = '';
  if (window.location.pathname.includes('/dynamic-nfc-tag-manager')) {
    repoBase = '/dynamic-nfc-tag-manager';
  }
  const endpoints = [
    `${PRIMARY_CLOUD_DB}?t=${Date.now()}`,
    `${BACKUP_CLOUD_DB}?t=${Date.now()}`,
    `${repoBase}/data/cards.json?_nocache=${Date.now()}`,
    `${CLOUD_DB_URL}?_nocache=${Date.now()}`,
    `${CDN_DB_URL}?_nocache=${Date.now()}`
  ];
  if (customUrl) endpoints.unshift(customUrl);

  for (const url of endpoints) {
    try {
      const res = await fetch(url);
      if (res.ok) {
        const cloudCards = await res.json();
        if (Array.isArray(cloudCards) && cloudCards.length > 0) {
          cardsList = cloudCards;
          saveLocalCards(cloudCards, true); // Save locally without echoing back to cloud
          renderCardsGrid();
          loadLocalStats();
          if (showNotification) showToast(t('toast_cloud_synced', 'Real-time global cloud sync complete 🟢'), 'success');
          return;
        }
      }
    } catch (e) {}
  }

  cardsList = getLocalCards();
  if (showNotification) showToast(t('cloud_status_offline', 'Updated from local offline storage'), 'info');
}

function saveCustomCloudEndpoint() {
  const inp = document.getElementById('inpCustomCloudEndpoint');
  const val = (inp?.value || '').trim();
  if (val) {
    localStorage.setItem('nfc_custom_cloud_url', val);
    showToast('Custom cloud endpoint saved successfully ☁️', 'success');
    syncWithCloudDatabase(true);
  } else {
    localStorage.removeItem('nfc_custom_cloud_url');
    showToast('Restored default cloud settings', 'info');
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
  if (tab === 'cards') renderCardsGrid();
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
  if (!container || !inner || !msgEl || !iconEl) return;

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
    inner.classList.add('bg-zinc-900/90', 'border-emerald-500/30', 'text-white');
  }

  container.classList.remove('hidden');

  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    container.classList.add('hidden');
  }, 3200);
}

// ==========================================
// 5. CARDS GRID & FILTERING
// ==========================================
function filterCardsByMode(mode) {
  currentFilterMode = mode;
  const filterButtons = ['All', 'Active', 'Direct', 'Profile', 'Catalog'];
  filterButtons.forEach(f => {
    const btn = document.getElementById(`filterBtn${f}`);
    if (btn) {
      if (f.toLowerCase() === mode.toLowerCase()) {
        btn.className = 'px-3.5 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap font-bold';
      } else {
        btn.className = 'px-3.5 py-1.5 rounded-full bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 whitespace-nowrap';
      }
    }
  });
  renderCardsGrid();
}

function renderCardsGrid() {
  const container = document.getElementById('cardsGridContainer');
  if (!container) return;

  let displayCards = [...cardsList];
  if (currentFilterMode === 'active') {
    displayCards = displayCards.filter(c => c.isActive);
  } else if (currentFilterMode === 'direct') {
    displayCards = displayCards.filter(c => (!c.mode || c.mode === 'direct') && c.actionType !== 'profile' && c.actionType !== 'catalog');
  } else if (currentFilterMode === 'profile') {
    displayCards = displayCards.filter(c => c.mode === 'profile' || c.actionType === 'profile');
  } else if (currentFilterMode === 'catalog') {
    displayCards = displayCards.filter(c => c.mode === 'catalog' || c.actionType === 'catalog');
  }

  if (!displayCards || displayCards.length === 0) {
    container.innerHTML = `
      <div class="col-span-full bg-zinc-950/70 border border-zinc-800 rounded-3xl p-10 text-center space-y-3">
        <div class="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto text-2xl">💳</div>
        <h3 class="text-sm font-bold text-white">${t('empty_cards_title', 'No NFC Tags Registered Yet')}</h3>
        <p class="text-xs text-zinc-400 max-w-sm mx-auto">${t('empty_cards_desc', 'Create your first smart tag to generate a permanent link and program your NFC chip.')}</p>
        <button onclick="openAddCardDrawer()" class="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/30 active:scale-95 transition-all">
          ${t('empty_cards_btn', '+ Create First Tag Now')}
        </button>
      </div>
    `;
    return;
  }

  const bUrl = getBaseUrl();

  container.innerHTML = displayCards.map((card, idx) => {
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
        <div class="mt-3 pt-3 border-t border-zinc-800/80">
          <div class="flex items-center justify-between text-[11px] mb-2">
            <span class="font-bold text-zinc-300">1-Tap Switch:</span>
            <span class="text-emerald-400 font-semibold">${savedTargets.length} links</span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${savedTargets.map(target => `
              <button 
                onclick="switchCardPreset('${card.id}', '${target.id}')"
                class="target-pill px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                  target.active || card.destinationUrl === target.url 
                    ? 'active bg-emerald-600 border-emerald-500 text-white font-bold shadow-md shadow-emerald-600/30' 
                    : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-emerald-500/40'
                }"
              >
                <span>${target.icon || '🔗'}</span>
                <span>${target.label || 'link'}</span>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    // Mode Badge Text
    let modeBadge = `${t('card_mode_direct', 'Direct URL')} 🚀`;
    if (isProfile) modeBadge = `${t('card_mode_profile', 'Digital Profile')} 👤`;
    else if (isCatalog) modeBadge = `${t('card_mode_catalog', 'Menu & Catalog')} 🍽️`;
    else if (isConditional) modeBadge = `${t('card_mode_conditional', 'Smart Routing')} 🔀`;

    return `
      <div class="bg-zinc-950/80 border border-zinc-800 hover:border-emerald-500/30 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-4 transition-all">
        
        <!-- 3D Realistic Smart NFC Card Header Component -->
        <div class="${themeClasses} p-4 sm:p-5 text-white flex flex-col justify-between min-h-[145px] relative">
          
          <!-- Top Row: Chip, TapLink Brand & NFC Icon -->
          <div class="flex items-center justify-between z-10">
            <div class="flex items-center gap-2.5">
              <div class="gold-chip"></div>
              <span class="text-[9px] font-mono font-bold tracking-widest text-emerald-300 uppercase px-1.5 py-0.5 rounded bg-black/40 border border-emerald-500/20">${t('card_brand_badge', 'TapLink • MUHAB')}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${card.isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}">
                ${card.isActive ? `${t('card_status_active', 'Active')} 🟢` : `${t('card_status_paused', 'Paused')} 🔴`}
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
              ${card.pinCode ? `<span class="text-[10px] bg-rose-500/30 text-rose-200 px-1.5 py-0.5 rounded font-bold">${t('card_pin_protected', 'PIN Protected')} 🔒</span>` : ''}
            </div>
          </div>

          <!-- Bottom: Scans & Copy Link -->
          <div class="flex items-center justify-between text-[11px] text-white/90 z-10 pt-1 border-t border-white/10">
            <div class="flex items-center gap-1">
              <span>${t('scans_count_suffix', 'Scans')}:</span>
              <strong class="text-white font-mono text-xs">${card.scanCount || 0}</strong>
            </div>
            <button onclick="copyToClipboard('${fixedUrl}', '${t('toast_copied', 'Copied to clipboard!')}')" class="bg-black/40 hover:bg-black/60 px-2 py-1 rounded-lg text-[10px] font-bold text-white transition-all flex items-center gap-1 border border-white/10 active:scale-95">
              <span>${t('btn_copy_link', 'Copy Link')}</span>
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
              <label class="font-bold text-zinc-300">${t('card_target_label', 'Target Destination URL:')}</label>
              <a href="${card.destinationUrl || '#'}" target="_blank" class="text-emerald-400 hover:underline text-[10px] font-semibold flex items-center gap-0.5" dir="ltr">
                <span>URL</span>
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
              </a>
            </div>
            <div class="flex items-center gap-1.5">
              <input 
                type="url" 
                id="inlineUrl_${card.id}" 
                value="${card.destinationUrl || ''}" 
                dir="ltr"
                placeholder="https://maps.google.com/..."
                class="flex-1 bg-[#050806] border border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-mono text-white text-start focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
              <button 
                onclick="saveInlineUrl('${card.id}')"
                class="px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs rounded-xl transition-all active:scale-95 shadow-md shadow-emerald-600/30 shrink-0"
                title="${t('btn_quick_save', 'Save')}"
              >
                ${t('btn_quick_save', 'Save')} ✓
              </button>
            </div>
          </div>
        ` : ''}

        ${isProfile ? `
          <div class="p-3 bg-emerald-950/20 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span class="font-bold text-emerald-300 block">${t('action_profile_title', 'Digital Profile Active')}</span>
              <span class="text-[11px] text-zinc-400">${card.profile?.fullName || card.title} - vCard</span>
            </div>
            <a href="${fixedUrl}" target="_blank" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-all shadow-md shadow-emerald-600/20">
              ${t('btn_test_sim', 'Preview')} 👤
            </a>
          </div>
        ` : ''}

        ${isCatalog ? `
          <div class="p-3 bg-zinc-900 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span class="font-bold text-white block">${t('action_catalog_title', 'Menu & Catalog Active')}</span>
              <span class="text-[11px] text-zinc-400">${card.catalog?.businessName || card.title} - Wi-Fi & Reviews</span>
            </div>
            <a href="./catalog.html?slug=${card.slug}" target="_blank" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-all shadow-md shadow-emerald-600/20">
              ${t('btn_test_sim', 'Preview')} 🍽️
            </a>
          </div>
        ` : ''}

        <!-- Action Control Buttons Footer -->
        <div class="grid grid-cols-4 gap-2 pt-2 border-t border-zinc-800/80">
          
          <button 
            onclick="openSimulatorDrawer('${card.id}')"
            class="py-2 px-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-[11px] font-bold border border-zinc-700 hover:border-emerald-500/40 flex items-center justify-center gap-1 active:scale-95 transition-all"
            title="${t('btn_test_sim', 'Simulate')}"
          >
            <span>📱</span>
            <span>${t('btn_test_sim', 'Test')}</span>
          </button>

          <button 
            onclick="openNfcProgrammerModal('${card.id}')"
            class="py-2 px-2 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 rounded-xl text-[11px] font-bold border border-zinc-700 hover:border-emerald-500/40 flex items-center justify-center gap-1 active:scale-95 transition-all"
            title="${t('btn_program_nfc', 'Write NFC')}"
          >
            <span>📡</span>
            <span>${t('btn_program_nfc', 'NFC')}</span>
          </button>

          <button 
            onclick="openEditCardDrawer('${card.id}')"
            class="py-2 px-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl text-[11px] font-bold border border-zinc-700 flex items-center justify-center gap-1 active:scale-95 transition-all"
            title="${t('btn_edit', 'Edit')}"
          >
            <span>✏️</span>
            <span>${t('btn_edit', 'Edit')}</span>
          </button>

          <a 
            href="/c/${card.slug}/edit" 
            target="_blank"
            class="py-2 px-2 bg-zinc-900 hover:bg-zinc-800 text-amber-300 rounded-xl text-[11px] font-bold border border-zinc-700 hover:border-amber-500/40 flex items-center justify-center gap-1 active:scale-95 transition-all"
            title="${t('btn_quick_page', 'Standalone PIN Quick Editor')}"
          >
            <span>🔑</span>
            <span>${t('btn_quick_page_short', 'PIN')}</span>
          </a>

          <button 
            onclick="toggleCardActiveState('${card.id}')"
            class="py-2 px-2 rounded-xl text-[11px] font-bold border flex items-center justify-center gap-1 active:scale-95 transition-all ${
              card.isActive 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
            }"
            title="${card.isActive ? t('card_status_paused', 'Pause') : t('card_status_active', 'Activate')}"
          >
            <span>${card.isActive ? '⏸' : '▶'}</span>
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
  showToast(`Switched destination to: ${target.label} 🚀`, 'success');

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

  let newUrl = sanitizeUrl(input.value);
  if (!newUrl) {
    showToast(t('toast_enter_url', 'Please enter a target destination URL'), 'error');
    input.focus();
    return;
  }
  input.value = newUrl;

  const card = cardsList.find(c => c.id === cardId);
  if (!card) return;

  card.destinationUrl = newUrl;
  card.updatedAt = new Date().toISOString();
  saveLocalCards(cardsList);
  renderCardsGrid();
  showToast(t('toast_updated', 'Target destination updated successfully! 🚀'), 'success');

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
  showToast(card.isActive ? 'Tag activated 🟢' : 'Tag paused 🔴', 'info');

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
  document.getElementById('cardDrawerTitle').textContent = t('drawer_add_title', 'Add New Smart NFC Tag');
  document.getElementById('cardEditorForm').reset();
  document.getElementById('inpIsActive').checked = true;
  if (document.getElementById('inpManagePin')) document.getElementById('inpManagePin').value = '1234';
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
  document.getElementById('cardDrawerTitle').textContent = `${t('drawer_edit_title', 'Edit Smart NFC Tag')}: ${card.title}`;
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
  if (document.getElementById('inpManagePin')) document.getElementById('inpManagePin').value = card.managePin || '1234';

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
        btn?.classList.add('text-emerald-400', 'border-b-2', 'border-emerald-500');
        btn?.classList.remove('text-zinc-400');
      } else {
        el.classList.add('hidden');
        btn?.classList.remove('text-emerald-400', 'border-b-2', 'border-emerald-500');
        btn?.classList.add('text-zinc-400');
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
    showToast(t('toast_enter_url', 'Please enter a URL first'), 'error');
    urlInp.focus();
    return;
  }

  if (!/^https?:\/\//i.test(url) && !/^(tel|mailto):/i.test(url)) url = 'https://' + url;

  tempSavedPresets.push({
    id: 't-' + Date.now().toString(36),
    label: label || 'Preset Link',
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
    container.innerHTML = `<div class="text-[11px] text-zinc-500 text-center py-2">No saved presets yet. Add frequently used URLs above.</div>`;
    return;
  }

  container.innerHTML = tempSavedPresets.map(t => `
    <div class="flex items-center justify-between p-2.5 bg-zinc-900 rounded-xl border border-zinc-700 text-xs">
      <div class="flex items-center gap-2 truncate me-2">
        <span>${t.icon || '🔗'}</span>
        <div class="truncate">
          <span class="font-bold text-white block truncate">${t.label}</span>
          <span class="text-[10px] text-zinc-400 font-mono truncate block" dir="ltr">${t.url}</span>
        </div>
      </div>
      <button type="button" onclick="removeTempPreset('${t.id}')" class="text-rose-400 hover:text-rose-300 px-2 py-1 bg-rose-500/10 rounded-lg text-[10px] font-bold">
        ✕
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
  let destinationUrl = sanitizeUrl(document.getElementById('inpDestinationUrl').value);
  const isActive = document.getElementById('inpIsActive').checked;
  const pinCode = document.getElementById('inpPinCode').value.trim();
  const managePin = document.getElementById('inpManagePin') ? (document.getElementById('inpManagePin').value.trim() || '1234') : '1234';

  const conditional = {
    type: mode === 'conditional' ? (pinCode ? 'pin' : (document.getElementById('inpDeviceRoutingEnabled').checked ? 'device' : 'time')) : 'none',
    time: {
      enabled: document.getElementById('inpTimeRoutingEnabled').checked,
      morningUrl: sanitizeUrl(document.getElementById('inpMorningUrl').value),
      eveningUrl: sanitizeUrl(document.getElementById('inpEveningUrl').value),
      switchHour: Number(document.getElementById('inpSwitchHour').value) || 16
    },
    device: {
      enabled: document.getElementById('inpDeviceRoutingEnabled').checked,
      iosUrl: sanitizeUrl(document.getElementById('inpIosUrl').value),
      androidUrl: sanitizeUrl(document.getElementById('inpAndroidUrl').value),
      defaultUrl: destinationUrl
    }
  };

  const catalog = {
    businessName: document.getElementById('inpCatBusinessName').value.trim() || title,
    tagline: document.getElementById('inpCatTagline').value.trim(),
    wifiSsid: document.getElementById('inpCatWifiSsid').value.trim(),
    wifiPassword: document.getElementById('inpCatWifiPass').value.trim(),
    googleReviewUrl: sanitizeUrl(document.getElementById('inpCatGoogleReview').value) || destinationUrl,
    whatsappPhone: document.getElementById('inpProfWhatsapp')?.value.trim() || '',
    callPhone: document.getElementById('inpProfPhone')?.value.trim() || ''
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
      label: 'Main Target',
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
    managePin,
    conditional,
    timeRouting: conditional.time,
    savedTargets: tempSavedPresets.map(st => ({ ...st, url: sanitizeUrl(st.url) })),
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
  showToast(t('toast_saved', 'Tag saved & activated successfully! ✨'), 'success');

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
        btn?.classList.add('text-emerald-400', 'border-b-2', 'border-emerald-500');
        btn?.classList.remove('text-zinc-400');
      } else {
        el.classList.add('hidden');
        btn?.classList.remove('text-emerald-400', 'border-b-2', 'border-emerald-500');
        btn?.classList.add('text-zinc-400');
      }
    }
  });
}

function applyGeneratedLink(type) {
  const inpDest = document.getElementById('inpDestinationUrl');
  if (!inpDest) return;

  if (type === 'wa') {
    let phone = (document.getElementById('genWaPhone').value || '').replace(/[^0-9]/g, '');
    const msg = (document.getElementById('genWaMsg').value || 'Hello').trim();
    if (!phone) {
      showToast('Please enter a phone number', 'error');
      return;
    }
    if (phone.startsWith('05')) phone = '966' + phone.slice(1);
    const link = `https://wa.me/${phone}?text=${encodeURIComponent(msg)}`;
    inpDest.value = link;
    showToast('WhatsApp link generated successfully ✓', 'success');
  } else if (type === 'maps') {
    const q = (document.getElementById('genMapsQuery').value || 'Business Location').trim();
    const link = `https://maps.google.com/?q=${encodeURIComponent(q)}`;
    inpDest.value = link;
    showToast('Google Review link generated successfully ✓', 'success');
  } else if (type === 'tel') {
    const phone = (document.getElementById('genCallNumber').value || '').trim();
    if (!phone) {
      showToast('Please enter a phone number', 'error');
      return;
    }
    inpDest.value = `tel:${phone}`;
    showToast('Direct call link generated successfully ✓', 'success');
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
      <div class="w-12 h-12 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center text-xl shadow-lg">🔒</div>
      <h4 class="text-sm font-bold text-white">${card.title}</h4>
      <p class="text-[11px] text-zinc-400">${t('red_pin_prompt', 'Enter security PIN to continue to destination')}</p>
      
      <div class="space-y-2 w-full max-w-[200px]">
        <input type="password" id="simPinInput" maxlength="6" placeholder="••••" class="w-full text-center tracking-widest text-lg font-mono py-2 bg-zinc-800 border border-zinc-700 text-white rounded-xl">
        <button onclick="verifySimPin('${card.pinCode}')" class="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow">
          ${t('red_pin_btn', 'Unlock Secret Link 🔓')}
        </button>
      </div>
    `;
  } else if (mode === 'profile') {
    // MODE 2: Digital Business Card
    const p = card.profile || {};
    const avatar = p.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
    container.innerHTML = `
      <div class="w-20 h-20 rounded-full p-1 bg-gradient-to-tr from-emerald-500 to-green-500 shadow-xl overflow-hidden mx-auto">
        <img src="${avatar}" class="w-full h-full object-cover rounded-full" alt="avatar">
      </div>
      <div>
        <h4 class="text-base font-black text-white">${p.fullName || card.title}</h4>
        <p class="text-xs text-emerald-400 font-semibold">${p.jobTitle || 'Executive'}</p>
        <p class="text-[11px] text-zinc-400">${p.company || ''}</p>
      </div>
      <p class="text-[11px] text-zinc-300 max-w-[240px] leading-relaxed">${p.bio || 'Welcome to my digital NFC business card.'}</p>
      
      <div class="w-full max-w-[220px] space-y-2 pt-2">
        <a href="${fixedUrl}/vcard" download class="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold shadow flex items-center justify-center gap-1.5">
          <span>💾 ${t('landing_save_contact', 'Save Contact (.vcf)')}</span>
        </a>
        <a href="./landing.html?slug=${card.slug}" target="_blank" class="w-full py-2 bg-zinc-800 text-zinc-200 rounded-xl text-xs font-medium border border-zinc-700 flex items-center justify-center gap-1">
          <span>Full Profile Preview</span>
        </a>
      </div>
    `;
  } else if (mode === 'catalog') {
    // MODE 3: Smart Catalog / Links Hub
    const cat = card.catalog || {};
    container.innerHTML = `
      <div class="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-2xl flex items-center justify-center text-2xl shadow-lg mx-auto">🍽️</div>
      <div>
        <h4 class="text-sm font-black text-white">${cat.businessName || card.title}</h4>
        ${cat.tagline ? `<p class="text-[11px] text-zinc-300">${cat.tagline}</p>` : ''}
      </div>
      
      <div class="w-full max-w-[220px] space-y-2 pt-1 text-xs">
        ${cat.wifiPassword ? `
        <div class="p-2.5 bg-zinc-800/90 rounded-xl border border-zinc-700 flex items-center justify-between">
          <span class="text-zinc-300">📶 Wi-Fi:</span>
          <span class="font-mono font-bold text-emerald-300">${cat.wifiPassword}</span>
        </div>` : ''}
        <a href="${cat.googleReviewUrl || card.destinationUrl || '#'}" target="_blank" class="block w-full py-2 bg-gradient-to-r from-emerald-600 to-green-500 text-black font-black rounded-xl shadow">
          ⭐⭐⭐⭐⭐ Rate on Google
        </a>
        <a href="./catalog.html?slug=${card.slug}" target="_blank" class="block w-full py-2 bg-zinc-800 text-zinc-200 rounded-xl border border-zinc-700">
          Open Digital Catalog 📱
        </a>
      </div>
    `;
  } else {
    // MODE 1: Direct Redirect or Conditional Routing
    let target = card.destinationUrl;
    let slotLabel = '';

    const tr = card.timeRouting || card.conditional?.time;
    if (tr && tr.enabled) {
      const ksaHour = (new Date().getUTCHours() + 3) % 24;
      const isMorning = (ksaHour >= 6 && ksaHour < (tr.switchHour || 16));
      target = isMorning ? (tr.morningUrl || target) : (tr.eveningUrl || target);
      slotLabel = isMorning ? '🌅 Morning Schedule Active' : '🌙 Evening Schedule Active';
    }

    if (card.conditional?.device?.enabled) {
      slotLabel = '📱 Device OS Routing Active';
    }

    container.innerHTML = `
      <div class="relative w-16 h-16 flex items-center justify-center mx-auto">
        <div class="absolute inset-0 bg-emerald-500/20 rounded-full animate-ping"></div>
        <div class="w-12 h-12 bg-emerald-600 text-white rounded-2xl flex items-center justify-center text-xl shadow-lg shadow-emerald-600/40">📡</div>
      </div>
      <div>
        <h4 class="text-sm font-bold text-white mb-1">${t('red_scanned_title', 'Smart NFC Tag Scanned 📡')}</h4>
        <span class="text-[10px] text-emerald-400 font-semibold bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full">Instant redirect in milliseconds</span>
      </div>
      ${slotLabel ? `<div class="text-[11px] font-bold text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">${slotLabel}</div>` : ''}
      <div class="text-[11px] text-zinc-400 font-mono bg-zinc-800/80 p-2.5 rounded-xl max-w-[240px] truncate" dir="ltr">
        ${target || 'https://maps.google.com'}
      </div>
      <div class="w-full max-w-[200px] pt-1">
        <a href="${target || '#'}" target="_blank" class="block w-full py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-600/30">
          ${t('sim_open_target', 'Open Destination URL')} 🚀
        </a>
      </div>
    `;
  }

  document.getElementById('drawerSimulator').classList.add('active');
}

function verifySimPin(correctPin) {
  const inp = document.getElementById('simPinInput');
  if (inp && inp.value.trim() === String(correctPin).trim()) {
    showToast('PIN verified! Unlocked 🔓', 'success');
    currentActiveCardForSim.pinCode = '';
    openSimulatorDrawer(currentActiveCardForSim.id);
  } else {
    showToast(t('red_pin_invalid', 'Incorrect PIN code!'), 'error');
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

  document.getElementById('nfcModalCardTitle').textContent = `${t('modal_nfc_title', 'Program NFC Tag')}: ${card.title}`;
  document.getElementById('inpModalFixedUrl').value = fixedUrl;

  renderCustomQrCode(fixedUrl, '#050806', '#ffffff');

  const note = document.getElementById('webNfcSupportNote');
  if ('NDEFReader' in window) {
    note.textContent = 'Your browser natively supports Web NFC! Click write and hold the tag near your device.';
    note.className = 'text-[11px] text-emerald-400 font-bold mt-1.5';
  } else {
    note.textContent = 'Web NFC is supported on Google Chrome for Android. On iPhone, copy this URL and write with NFC Tools.';
    note.className = 'text-[10px] text-zinc-400 mt-1.5';
  }

  document.getElementById('drawerNfcProgrammer').classList.add('active');
}

let currentQrInstance = null;

function renderCustomQrCode(text, darkColor, lightColor) {
  const qrWrapper = document.getElementById('nfcQrCodeWrapper');
  if (!qrWrapper) return;
  qrWrapper.innerHTML = '';
  try {
    currentQrInstance = new QRCode(qrWrapper, {
      text: text,
      width: 170,
      height: 170,
      colorDark: darkColor || '#050806',
      colorLight: lightColor || '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  } catch (e) {
    currentQrInstance = null;
  }
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

// Generate High-Resolution Canvas for 300 DPI Print Manufacturing (2000x2000px)
function generateHighResQrCanvas(qrInstance, size = 2000, marginModules = 4, darkColor = '#050806', lightColor = '#ffffff') {
  const model = qrInstance?._oQRCode;
  if (!model) return null;
  const count = model.getModuleCount();
  const totalModules = count + marginModules * 2;
  const moduleSize = size / totalModules;

  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');
  ctx.imageSmoothingEnabled = false;

  // Crisp background
  ctx.fillStyle = lightColor;
  ctx.fillRect(0, 0, size, size);

  // High contrast dark modules
  ctx.fillStyle = darkColor;
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (model.isDark(r, c)) {
        const x = Math.round((c + marginModules) * moduleSize);
        const y = Math.round((r + marginModules) * moduleSize);
        const w = Math.ceil((c + marginModules + 1) * moduleSize) - x;
        const h = Math.ceil((r + marginModules + 1) * moduleSize) - y;
        ctx.fillRect(x, y, w, h);
      }
    }
  }
  return canvas;
}

// Generate Pure Vector SVG for Laser Engraving & Plastic PVC Cards
function generateQrSvgString(qrInstance, marginModules = 4, darkColor = '#050806', lightColor = '#ffffff') {
  const model = qrInstance?._oQRCode;
  if (!model) return null;
  const count = model.getModuleCount();
  const totalModules = count + marginModules * 2;

  let pathData = '';
  for (let r = 0; r < count; r++) {
    for (let c = 0; c < count; c++) {
      if (model.isDark(r, c)) {
        const x = c + marginModules;
        const y = r + marginModules;
        pathData += `M${x},${y}h1v1h-1z `;
      }
    }
  }

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${totalModules} ${totalModules}" shape-rendering="crispEdges">
  <rect width="${totalModules}" height="${totalModules}" fill="${lightColor}"/>
  <path d="${pathData.trim()}" fill="${darkColor}"/>
</svg>`;
}

// Web NFC Writer (Android Chrome NDEFReader)
document.getElementById('btnDirectWebNfcWrite')?.addEventListener('click', async () => {
  if (!('NDEFReader' in window)) {
    alert('Web NFC direct writing is supported on Google Chrome for Android.\n\nFor iPhone users: tap "Copy" and open the free NFC Tools app to write the tag in 1 tap.');
    return;
  }

  const fixedUrl = document.getElementById('inpModalFixedUrl').value;
  try {
    const ndef = new NDEFReader();
    await ndef.scan();
    showToast(t('toast_nfc_writing', 'Ready to write! Hold NFC tag near the back of your phone 📡'), 'info');

    await ndef.write({
      records: [{ recordType: 'url', data: fixedUrl }]
    });

    playChime(true);
    if (navigator.vibrate) navigator.vibrate([50, 100, 50]);
    showToast(t('toast_nfc_success', 'URL written to NFC tag successfully! 🎉'), 'success');
  } catch (error) {
    playChime(false);
    showToast(t('toast_nfc_error', 'NFC write error: ') + (error.message || 'try again'), 'error');
  }
});

document.getElementById('btnCopyModalUrl')?.addEventListener('click', () => {
  const url = document.getElementById('inpModalFixedUrl').value;
  copyToClipboard(url, t('toast_copied', 'Copied permanent URL to clipboard! 📋'));
});

// Download Print-Ready 2000px Ultra HD PNG (300 DPI)
document.getElementById('btnDownloadQrPrintPng')?.addEventListener('click', () => {
  const dark = document.getElementById('qrColorDark')?.value || '#050806';
  const light = document.getElementById('qrColorLight')?.value || '#ffffff';
  const canvas = generateHighResQrCanvas(currentQrInstance, 2000, 4, dark, light);
  
  if (canvas) {
    const a = document.createElement('a');
    a.href = canvas.toDataURL('image/png');
    a.download = `nfc-qr-${currentActiveCardForQr?.slug || 'tag'}-print-2000px.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    playChime(true);
    showToast(t('toast_qr_print_downloaded', 'Downloaded 2000px Ultra HD QR Code (Print-Ready)! 🖨️'), 'success');
  } else {
    // Fallback to standard canvas
    document.getElementById('btnDownloadQr')?.click();
  }
});

// Download Resolution-Independent Vector SVG (Laser & PVC card printing)
document.getElementById('btnDownloadQrVectorSvg')?.addEventListener('click', () => {
  const dark = document.getElementById('qrColorDark')?.value || '#050806';
  const light = document.getElementById('qrColorLight')?.value || '#ffffff';
  const svgString = generateQrSvgString(currentQrInstance, 4, dark, light);

  if (svgString) {
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `nfc-qr-${currentActiveCardForQr?.slug || 'tag'}-vector.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    playChime(true);
    showToast(t('toast_qr_svg_downloaded', 'Downloaded Vector SVG (Laser & PVC card ready)! 📐'), 'success');
  }
});

// Standard Web QR Download
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
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    playChime(true);
    showToast(t('toast_qr_downloaded', 'Downloaded standard QR code ✓'), 'success');
  }
});

// ==========================================
// 10. RECENT ACTIVITY & ANALYTICS
// ==========================================
function renderRecentActivity(scans) {
  const container = document.getElementById('homeRecentScansList');
  if (!container) return;

  if (!scans || scans.length === 0) {
    container.innerHTML = `<div class="text-center py-5 text-zinc-500 text-xs">${t('no_scans_logged', 'No scans logged yet. Scan an NFC tag to view live data.')}</div>`;
    return;
  }

  container.innerHTML = scans.slice(0, 5).map(s => {
    const timeFormatted = s.timestamp ? new Date(s.timestamp).toLocaleTimeString() : 'Just now';
    const isIos = (s.deviceType || '').toLowerCase().includes('iphone') || (s.deviceType || '').toLowerCase().includes('ipad');

    return `
      <div class="flex items-center justify-between p-2.5 bg-zinc-950/70 rounded-xl border border-zinc-800 text-xs">
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-lg ${isIos ? 'bg-emerald-500/10 text-emerald-400' : 'bg-emerald-500/10 text-emerald-400'} flex items-center justify-center font-bold text-sm">
            ${isIos ? '' : '🤖'}
          </div>
          <div>
            <span class="font-bold text-white block">${s.cardTitle || s.slug}</span>
            <span class="text-[10px] text-zinc-400">${s.deviceType || 'Mobile'} • ${s.browser || 'Browser'}</span>
          </div>
        </div>
        <div class="text-end">
          <span class="text-[10px] text-emerald-300 font-mono block">${timeFormatted}</span>
          <span class="text-[9px] text-emerald-400 font-semibold">Redirected ✓</span>
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
      tbody.innerHTML = `<tr><td colspan="3" class="py-6 text-center text-zinc-500">${t('no_scans_logged', 'No scans logged yet')}</td></tr>`;
    } else {
      tbody.innerHTML = scans.map(s => `
        <tr class="hover:bg-zinc-800/30">
          <td class="py-2.5 font-bold text-white">${s.cardTitle || s.slug}</td>
          <td class="py-2.5 text-zinc-300 font-mono text-[11px]">${s.deviceType} (${s.browser})</td>
          <td class="py-2.5 text-zinc-400 text-[11px] font-mono">${s.timestamp ? new Date(s.timestamp).toLocaleDateString() : 'Just now'}</td>
        </tr>
      `).join('');
    }
  }

  const topList = document.getElementById('analyticsTopCardsList');
  if (topList) {
    if (!cardsList || cardsList.length === 0) {
      topList.innerHTML = `<div class="p-4 text-center text-zinc-500 text-xs">${t('empty_cards_title', 'No NFC tags registered yet')}</div>`;
    } else {
      const sorted = [...cardsList].sort((a, b) => (b.scanCount || 0) - (a.scanCount || 0));
      topList.innerHTML = sorted.slice(0, 4).map((c, i) => `
        <div class="flex items-center justify-between p-2.5 bg-zinc-950/70 rounded-xl border border-zinc-800 text-xs">
          <div class="flex items-center gap-2">
            <span class="w-6 h-6 rounded-full bg-emerald-500/10 text-emerald-400 font-black flex items-center justify-center text-xs">#${i + 1}</span>
            <span class="font-bold text-white">${c.title}</span>
          </div>
          <span class="font-mono font-bold text-emerald-300">${c.scanCount || 0} ${t('scans_count_suffix', 'scans')}</span>
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
    version: '3.5',
    exportedAt: new Date().toISOString(),
    cards: cardsList,
    settings: { siteTitle: 'TapLink by MUHAB', theme: 'dark' }
  };

  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `taplink-nfc-backup-${new Date().toISOString().split('T')[0]}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast(t('toast_saved', 'Backup JSON exported successfully 💾'), 'success');
}

function importJsonBackup(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = async (e) => {
    try {
      const data = JSON.parse(e.target.result);
      if (!data || !Array.isArray(data.cards)) {
        throw new Error('Invalid backup file');
      }

      cardsList = data.cards;
      saveLocalCards(cardsList);

      renderCardsGrid();
      loadLocalStats();
      showToast(`Backup restored successfully (${cardsList.length} cards) ✓`, 'success');
    } catch (err) {
      showToast('Error: Invalid backup JSON file', 'error');
    }
  };
  reader.readAsText(file);
}

// ==========================================
// 12. UTILITIES
// ==========================================
function copyToClipboard(text, successMsg = 'Copied to clipboard! 📋') {
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
  document.getElementById('btnLangToggle')?.addEventListener('click', () => {
    if (window.I18N) window.I18N.toggleLanguage();
  });

  document.getElementById('btnThemeToggle')?.addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('nfc_theme', isDark ? 'dark' : 'light');
    showToast(isDark ? 'Dark theme enabled 🌙' : 'Light theme enabled ☀️', 'info');
  });

  document.getElementById('btnQuickSearchToggle')?.addEventListener('click', () => {
    const s = document.getElementById('searchBarSection');
    s?.classList.toggle('hidden');
    if (s && !s.classList.contains('hidden')) {
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
      container.innerHTML = `<div class="col-span-full py-8 text-center text-zinc-500 text-xs">No cards matching: "${query}"</div>`;
    } else {
      const orig = cardsList;
      cardsList = filtered;
      renderCardsGrid();
      cardsList = orig;
    }
  });
}
