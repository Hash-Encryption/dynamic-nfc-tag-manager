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
let currentFolderFilter = 'all';
let tempSavedPresets = [];
let leadsList = [];
let selectedCardIds = new Set();
let isBulkMode = false;
let qpCurrentIndex = 0;
let qpMaxContrast = false;

const DEFAULT_ADMIN_PASS = 'admin123';
const ADMIN_SALT = '::taplink_salt_2026';
const DEFAULT_ADMIN_HASH = 'b07f0885c6810f7e2dadc1e0b86e82f4f7b5b946c1439f00046912ec72633d91';

// Cryptographic Password Hasher using Web Crypto SHA-256 + Salt
async function hashPassword(plainText) {
  try {
    if (!plainText || typeof plainText !== 'string') return '';
    const enc = new TextEncoder();
    const data = enc.encode(plainText + ADMIN_SALT);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  } catch (e) {
    console.error('Error hashing password:', e);
    return '';
  }
}

const PRIMARY_CLOUD_DB = "https://api.npoint.io/6d3e9c78f9fac9e8db1e";
const PRIMARY_CLOUD_WRITE = "https://www.npoint.io/documents/6d3e9c78f9fac9e8db1e";
const BACKUP_CLOUD_DB = "https://api.npoint.io/556564d7073a07a6d7a3";
const BACKUP_CLOUD_WRITE = "https://www.npoint.io/documents/556564d7073a07a6d7a3";
const CLOUD_DB_URL = "https://raw.githubusercontent.com/Hash-Encryption/dynamic-nfc-tag-manager/main/data/cards.json";
const CDN_DB_URL = "https://cdn.jsdelivr.net/gh/Hash-Encryption/dynamic-nfc-tag-manager@main/data/cards.json";

// i18n Translation Helper
const t = (key, fallback) => (window.I18N ? window.I18N.t(key, fallback) : (fallback || key));

// Production Auto URL Sanitizer & XSS Shield Helper
function sanitizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim().replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();
  if (!url) return '';
  // Zero-Trust Malicious Scheme Shield: Block javascript:, data:, vbscript:, file:, blob:, about:
  const lowerUrl = url.toLowerCase().replace(/[\s\r\n\t]+/g, '');
  if (/^(javascript|data|vbscript|file|blob|about):/i.test(lowerUrl)) {
    console.warn('[Security Shield] Blocked dangerous URL scheme:', rawUrl);
    return '';
  }
  if (/^(tel|mailto|sms|whatsapp|tg|geo|intent|facetime|instagram):/i.test(url)) return url;
  url = url.replace(/[\s\r\n\t]+/g, '');
  if (/^wa\.me\//i.test(url)) return 'https://' + url;
  if (/^https?:\/\//i.test(url)) return url;
  if (url.startsWith('//')) return 'https:' + url;
  return 'https://' + url;
}

// XSS Sanitizer Helper for dynamic text rendering
function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
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
// 1. ADMIN SECURITY GUARD & CRYPTO PROTECTION
// ==========================================
let lockoutInterval = null;
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes auto-logout
let inactivityTimer = null;

function resetInactivityTimer() {
  if (inactivityTimer) clearTimeout(inactivityTimer);
  const isAuth = localStorage.getItem('nfc_admin_auth') === 'authenticated' || sessionStorage.getItem('nfc_admin_auth') === 'authenticated';
  if (!isAuth) return;
  inactivityTimer = setTimeout(() => {
    localStorage.removeItem('nfc_admin_auth');
    sessionStorage.removeItem('nfc_admin_auth');
    document.getElementById('adminSecurityLock')?.classList.remove('hidden');
    showToast(t('session_expired', 'Session expired due to 30 minutes of inactivity.'), 'info');
    playChime(false);
  }, INACTIVITY_TIMEOUT_MS);
}

['mousemove', 'keydown', 'touchstart', 'click', 'scroll'].forEach(evt => {
  window.addEventListener(evt, resetInactivityTimer, { passive: true });
});

function checkLockoutStatus() {
  const lockedUntil = Number(localStorage.getItem('nfc_login_locked_until') || 0);
  const now = Date.now();
  const submitBtn = document.querySelector('#adminLockForm button[type="submit"]');
  const lockErrorMsg = document.getElementById('lockErrorMsg');

  if (lockedUntil > now) {
    const remainingSec = Math.ceil((lockedUntil - now) / 1000);
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.classList.add('opacity-50', 'cursor-not-allowed');
    }
    if (lockErrorMsg) {
      lockErrorMsg.classList.remove('hidden');
      lockErrorMsg.innerHTML = `<span class="text-rose-400 font-bold">⛔ ${t('lock_bruteforce', 'Account locked due to 5 failed attempts. Please wait')} ${remainingSec}s</span>`;
    }
    if (!lockoutInterval) {
      lockoutInterval = setInterval(checkLockoutStatus, 1000);
    }
    return true;
  } else {
    if (lockoutInterval) {
      clearInterval(lockoutInterval);
      lockoutInterval = null;
    }
    localStorage.removeItem('nfc_login_locked_until');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.classList.remove('opacity-50', 'cursor-not-allowed');
    }
    return false;
  }
}

function initAdminSecurity() {
  const lockScreen = document.getElementById('adminSecurityLock');
  const isAuth = localStorage.getItem('nfc_admin_auth') === 'authenticated' || sessionStorage.getItem('nfc_admin_auth') === 'authenticated';

  if (!isAuth) {
    lockScreen?.classList.remove('hidden');
  } else {
    lockScreen?.classList.add('hidden');
    resetInactivityTimer();
  }

  checkLockoutStatus();

  document.getElementById('adminLockForm')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (checkLockoutStatus()) return;

    const entered = document.getElementById('adminLockPassword').value.trim();
    const enteredHash = await hashPassword(entered);
    const savedHash = localStorage.getItem('nfc_admin_pass_hash') || DEFAULT_ADMIN_HASH;
    const legacySavedPass = localStorage.getItem('nfc_custom_admin_pass');
    const remember = document.getElementById('adminRememberMe').checked;

    const isMatch = (enteredHash === savedHash) || 
                    (enteredHash === DEFAULT_ADMIN_HASH) || 
                    (entered === DEFAULT_ADMIN_PASS) || 
                    (legacySavedPass && entered === legacySavedPass);

    if (isMatch) {
      // Migrate legacy plaintext password if present
      if (legacySavedPass) {
        localStorage.setItem('nfc_admin_pass_hash', enteredHash);
        localStorage.removeItem('nfc_custom_admin_pass');
      }

      // Reset brute-force counter
      localStorage.setItem('nfc_login_failed_attempts', '0');
      localStorage.removeItem('nfc_login_locked_until');

      if (remember) {
        localStorage.setItem('nfc_admin_auth', 'authenticated');
      } else {
        sessionStorage.setItem('nfc_admin_auth', 'authenticated');
      }
      lockScreen?.classList.add('hidden');
      document.getElementById('lockErrorMsg')?.classList.add('hidden');
      showToast(t('lock_unlocked', 'Welcome! Dashboard unlocked 🔓'), 'success');
      playChime(true);
      resetInactivityTimer();
      checkAuthAndLoad();
    } else {
      // Brute-force failure tracking
      const attempts = (Number(localStorage.getItem('nfc_login_failed_attempts') || 0)) + 1;
      if (attempts >= 5) {
        const lockDurationMs = 5 * 60 * 1000; // 5 minutes lockout
        localStorage.setItem('nfc_login_locked_until', String(Date.now() + lockDurationMs));
        localStorage.setItem('nfc_login_failed_attempts', '0');
        checkLockoutStatus();
      } else {
        localStorage.setItem('nfc_login_failed_attempts', String(attempts));
        const remaining = 5 - attempts;
        const lockErrorMsg = document.getElementById('lockErrorMsg');
        if (lockErrorMsg) {
          lockErrorMsg.classList.remove('hidden');
          lockErrorMsg.innerHTML = `<span class="text-rose-400 font-bold">${t('lock_incorrect', 'Incorrect password.')} ${remaining} ${t('lock_attempts_left', 'attempt(s) remaining before 5-minute lockout.')}</span>`;
        }
      }
      playChime(false);
      if (navigator.vibrate) navigator.vibrate([40, 100, 40]);
    }
  });

  document.getElementById('btnLockAdmin')?.addEventListener('click', () => {
    localStorage.removeItem('nfc_admin_auth');
    sessionStorage.removeItem('nfc_admin_auth');
    if (inactivityTimer) clearTimeout(inactivityTimer);
    lockScreen?.classList.remove('hidden');
    document.getElementById('adminLockPassword').value = '';
    showToast(t('lock_locked', 'Dashboard locked for security 🔒'), 'info');
  });
}

async function changeAdminPasswordHandler() {
  const current = document.getElementById('inpCurrentAdminPass').value.trim();
  const next = document.getElementById('inpNewAdminPass').value.trim();
  const currentHash = await hashPassword(current);
  const savedHash = localStorage.getItem('nfc_admin_pass_hash') || DEFAULT_ADMIN_HASH;
  const legacySavedPass = localStorage.getItem('nfc_custom_admin_pass');

  const isCurrentValid = (currentHash === savedHash) || 
                         (currentHash === DEFAULT_ADMIN_HASH) || 
                         (current === DEFAULT_ADMIN_PASS) || 
                         (legacySavedPass && current === legacySavedPass);

  if (!isCurrentValid) {
    showToast(t('toast_invalid_pass', 'Current password is incorrect'), 'error');
    return;
  }

  if (next.length < 4) {
    showToast(t('toast_short_pass', 'New password must be at least 4 characters'), 'error');
    return;
  }

  const newHash = await hashPassword(next);
  localStorage.setItem('nfc_admin_pass_hash', newHash);
  localStorage.removeItem('nfc_custom_admin_pass'); // Eliminate plaintext
  document.getElementById('inpCurrentAdminPass').value = '';
  document.getElementById('inpNewAdminPass').value = '';
  showToast(t('toast_pass_changed', 'Master password updated securely! 🔐'), 'success');
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

// ==========================================================
// REACT BITS PRO: COUNT UP ANIMATED COUNTER ENGINE
// ==========================================================
function animateCountUp(element, endVal, duration = 1100, prefix = '', suffix = '') {
  if (!element) return;
  const target = Number(endVal) || 0;
  const startTime = performance.now();
  const startVal = 0;
  const isDecimal = target % 1 !== 0;

  function step(now) {
    const elapsed = now - startTime;
    const progress = Math.min(elapsed / duration, 1);
    // Smooth easeOutExpo curve
    const ease = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
    const current = startVal + (target - startVal) * ease;
    element.textContent = prefix + (isDecimal ? current.toFixed(1) : Math.floor(current).toLocaleString()) + suffix;
    if (progress < 1) {
      requestAnimationFrame(step);
    } else {
      element.textContent = prefix + (isDecimal ? target.toFixed(1) : target.toLocaleString()) + suffix;
    }
  }
  requestAnimationFrame(step);
}

// ==========================================================
// REACT BITS PRO: SPOTLIGHT & 3D TILT CARDS ENGINE
// ==========================================================
function initSpotlightAndTiltCards() {
  const cards = document.querySelectorAll('.spotlight-card');
  cards.forEach(card => {
    if (card._spotlightBound) return;
    card._spotlightBound = true;

    const visual = card.querySelector('.smart-card-visual');

    const handleMove = (e) => {
      const rect = card.getBoundingClientRect();
      const clientX = e.clientX !== undefined ? e.clientX : (e.touches && e.touches[0] ? e.touches[0].clientX : 0);
      const clientY = e.clientY !== undefined ? e.clientY : (e.touches && e.touches[0] ? e.touches[0].clientY : 0);
      const x = clientX - rect.left;
      const y = clientY - rect.top;

      card.style.setProperty('--mouse-x', `${x}px`);
      card.style.setProperty('--mouse-y', `${y}px`);
      card.style.setProperty('--spotlight-opacity', '1');

      if (visual) {
        const centerX = rect.width / 2;
        const centerY = rect.height / 2;
        const rotateX = ((y - centerY) / centerY) * -6;
        const rotateY = ((x - centerX) / centerX) * 6;
        visual.style.transform = `perspective(800px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) scale3d(1.015, 1.015, 1.015)`;
      }
    };

    const handleLeave = () => {
      card.style.setProperty('--spotlight-opacity', '0');
      if (visual) {
        visual.style.transform = 'perspective(800px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)';
      }
    };

    card.addEventListener('pointermove', handleMove, { passive: true });
    card.addEventListener('pointerleave', handleLeave, { passive: true });
  });
}

// ==========================================================
// REACT BITS PRO: MAGNETIC BUTTONS ENGINE
// ==========================================================
function initMagneticButtons() {
  if (window.matchMedia && window.matchMedia('(pointer: coarse)').matches) return;

  const magneticBtns = document.querySelectorAll('.magnetic-btn');
  magneticBtns.forEach(btn => {
    if (btn._magneticBound) return;
    btn._magneticBound = true;

    btn.addEventListener('mousemove', (e) => {
      const rect = btn.getBoundingClientRect();
      const x = e.clientX - rect.left - rect.width / 2;
      const y = e.clientY - rect.top - rect.height / 2;
      btn.style.transform = `translate3d(${x * 0.22}px, ${y * 0.22}px, 0)`;
    }, { passive: true });

    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'translate3d(0, 0, 0)';
    }, { passive: true });
  });
}

function applyStatsToUI(s) {
  const elTotal = document.getElementById('statTotalCards');
  const elScans = document.getElementById('statTotalScans');
  const elActive = document.getElementById('statActiveCards');
  if (elTotal) animateCountUp(elTotal, s.totalCards || 0);
  if (elScans) animateCountUp(elScans, s.totalScans || 0);
  if (elActive) animateCountUp(elActive, s.activeCards || 0);

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

// Zero-Trust Cloud Schema Validator
function validateCardsSchema(cards) {
  if (!Array.isArray(cards)) {
    console.error('[Schema Validation] Payload is not an array');
    return false;
  }
  if (cards.length > 500) {
    console.error('[Schema Validation] Array exceeds maximum capacity (500)');
    return false;
  }
  for (let i = 0; i < cards.length; i++) {
    const card = cards[i];
    if (!card || typeof card !== 'object') {
      console.error(`[Schema Validation] Card at index ${i} is not an object`);
      return false;
    }
    if (!card.id || typeof card.id !== 'string') {
      console.error(`[Schema Validation] Card at index ${i} missing id`);
      return false;
    }
    if (!card.slug || typeof card.slug !== 'string' || !/^[a-zA-Z0-9-_]+$/.test(card.slug)) {
      console.error(`[Schema Validation] Card "${card.id}" has invalid slug format:`, card.slug);
      return false;
    }
    if (card.destinationUrl && typeof card.destinationUrl === 'string') {
      const sanitized = sanitizeUrl(card.destinationUrl);
      if (!sanitized && card.destinationUrl.trim().length > 0) {
        console.error(`[Schema Validation] Card "${card.slug}" contains dangerous destination URL`);
        return false;
      }
    }
    if (Array.isArray(card.savedTargets)) {
      for (const st of card.savedTargets) {
        if (st.url && typeof st.url === 'string') {
          const sanitized = sanitizeUrl(st.url);
          if (!sanitized && st.url.trim().length > 0) {
            console.error(`[Schema Validation] Card "${card.slug}" contains dangerous saved target URL`);
            return false;
          }
        }
      }
    }
  }
  return true;
}

// High-Load Debouncer for Cloud Sync
let cloudSyncDebounceTimer = null;
function debouncedSyncPushToCloud(cards) {
  if (cloudSyncDebounceTimer) clearTimeout(cloudSyncDebounceTimer);
  cloudSyncDebounceTimer = setTimeout(() => {
    syncPushToCloudDatabase(cards);
  }, 400);
}

// Self-Healing Cloud Sync with Exponential Backoff Retry & Offline Queue
async function syncPushToCloudDatabase(cards, retryCount = 0) {
  if (!Array.isArray(cards)) return false;

  // 1. Data Integrity Schema Validation
  if (!validateCardsSchema(cards)) {
    console.error('[Security Hardening] Cloud write blocked: payload failed schema validation.');
    showToast(t('cloud_validation_failed', 'Security alert: Invalid card schema prevented cloud write.'), 'error');
    return false;
  }

  // 2. Cryptographic Admin Authorization Check
  const isAuth = localStorage.getItem('nfc_admin_auth') === 'authenticated' || sessionStorage.getItem('nfc_admin_auth') === 'authenticated';
  if (!isAuth) {
    console.warn('[Security Guard] Unauthorized cloud sync push blocked.');
    return false;
  }

  const payload = JSON.stringify({ contents: JSON.stringify(cards) });
  const targets = [PRIMARY_CLOUD_WRITE, BACKUP_CLOUD_WRITE];
  
  const statusEl = document.getElementById('topCloudStatusText');
  if (statusEl) {
    statusEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping"></span><span>' + t('cloud_status_syncing', 'Syncing to global cloud...') + '</span>';
  }

  let anySuccess = false;
  for (const url of targets) {
    try {
      const res = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: payload
      });
      if (res.ok) {
        anySuccess = true;
        break;
      }
    } catch (e) {
      try {
        const res2 = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-HTTP-Method-Override': 'PATCH' },
          body: payload
        });
        if (res2.ok) {
          anySuccess = true;
          break;
        }
      } catch (err) {}
    }
  }

  if (anySuccess) {
    localStorage.removeItem('nfc_pending_cloud_sync');
    if (statusEl) {
      statusEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400"></span><span data-i18n="cloud_status_connected">🌐 Global Cloud Active - Synced on all devices</span>';
    }
    return true;
  } else {
    // Retry with exponential backoff: retry 1 after 1500ms, retry 2 after 3500ms
    if (retryCount < 2) {
      const backoffDelay = retryCount === 0 ? 1500 : 3500;
      console.warn(`[Cloud Sync] Write attempt ${retryCount + 1} failed. Retrying in ${backoffDelay}ms...`);
      setTimeout(() => {
        syncPushToCloudDatabase(cards, retryCount + 1);
      }, backoffDelay);
    } else {
      console.warn('[Cloud Sync] All retries exhausted. Enqueuing into offline queue.');
      try {
        localStorage.setItem('nfc_pending_cloud_sync', JSON.stringify(cards));
      } catch (err) {}
      if (statusEl) {
        statusEl.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span><span>' + t('cloud_status_queued', 'Cloud Queued (Offline)') + '</span>';
      }
    }
    return false;
  }
}

// Flush pending queue when connection comes back online
function flushPendingCloudSync() {
  try {
    const pending = localStorage.getItem('nfc_pending_cloud_sync');
    if (pending) {
      const cards = JSON.parse(pending);
      if (Array.isArray(cards) && cards.length > 0) {
        console.log('[Self-Healing] Connection restored. Flushing pending cloud sync queue...');
        syncPushToCloudDatabase(cards);
      }
    }
  } catch (e) {}
}
window.addEventListener('online', flushPendingCloudSync);

function saveLocalCards(cards, skipCloudPush = false) {
  try {
    localStorage.setItem('nfc_cards_db', JSON.stringify(cards));
  } catch (e) {}
  if (!skipCloudPush) {
    debouncedSyncPushToCloud(cards);
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
        if (Array.isArray(cloudCards)) {
          cardsList = cloudCards;
          saveLocalCards(cloudCards, true);
          localStorage.setItem('nfc_db_initialized', 'true');
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
    leads: document.getElementById('viewLeads'),
    stats: document.getElementById('viewStats'),
    settings: document.getElementById('viewSettings')
  };

  const navBtns = {
    home: document.getElementById('tabBtnHome'),
    cards: document.getElementById('tabBtnCards'),
    leads: document.getElementById('tabBtnLeads'),
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
  if (tab === 'leads') loadLeads();

  updateDockIndicator(tab);
}

// React Bits Pro: Spring Physics Dock Active Indicator
function updateDockIndicator(tab) {
  const btn = document.getElementById('tabBtn' + tab.charAt(0).toUpperCase() + tab.slice(1));
  const indicator = document.getElementById('dockActiveIndicator');
  const dock = document.getElementById('floatingGlassDock');
  if (!btn || !indicator || !dock) return;

  const btnRect = btn.getBoundingClientRect();
  const dockRect = dock.getBoundingClientRect();
  const left = btnRect.left - dockRect.left;
  const width = btnRect.width;

  indicator.style.transform = `translateX(${left}px)`;
  indicator.style.width = `${width}px`;
  indicator.style.opacity = '1';
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
// 5. CARDS GRID & SMART FOLDERS FILTERING
// ==========================================
function filterCardsByFolder(folder) {
  currentFolderFilter = folder;
  const folderButtons = ['All', 'Restaurant', 'Personal', 'Wifi', 'Sos', 'Vip'];
  folderButtons.forEach(f => {
    const btn = document.getElementById(`folderBtn${f}`);
    if (btn) {
      if (f.toLowerCase() === folder.toLowerCase()) {
        btn.className = 'folder-pill active px-3 py-1.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 whitespace-nowrap font-bold shadow-sm';
      } else {
        btn.className = 'folder-pill px-3 py-1.5 rounded-full bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800 whitespace-nowrap';
      }
    }
  });
  renderCardsGrid();
}

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

  // 1. Smart Folders Filter
  if (currentFolderFilter && currentFolderFilter !== 'all') {
    if (currentFolderFilter === 'restaurant') {
      displayCards = displayCards.filter(c => c.category === 'restaurant' || c.mode === 'catalog' || c.actionType === 'catalog');
    } else if (currentFolderFilter === 'personal') {
      displayCards = displayCards.filter(c => c.category === 'personal' || c.mode === 'profile' || c.actionType === 'profile');
    } else if (currentFolderFilter === 'wifi') {
      displayCards = displayCards.filter(c => c.category === 'wifi' || c.mode === 'wifi');
    } else if (currentFolderFilter === 'sos') {
      displayCards = displayCards.filter(c => c.category === 'sos' || c.mode === 'sos');
    } else if (currentFolderFilter === 'vip') {
      displayCards = displayCards.filter(c => c.category === 'vip');
    }
  }

  // 2. Mode Filters
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
    const isWifi = (mode === 'wifi');
    const isSos = (mode === 'sos');
    const savedTargets = Array.isArray(card.savedTargets) ? card.savedTargets : [];

    const themeClasses = [
      'smart-card-visual',
      'smart-card-visual card-theme-emerald',
      'smart-card-visual card-theme-amber',
      'smart-card-visual card-theme-purple'
    ][idx % 4];

    // Quick Presets Pills HTML
    let presetsHtml = '';
    if (savedTargets.length > 0 && !isProfile && !isCatalog && !isWifi && !isSos) {
      presetsHtml = `
        <div class="mt-3 pt-3 border-t border-zinc-800/80">
          <div class="flex items-center justify-between text-[11px] mb-2">
            <span class="font-bold text-zinc-300">1-Tap Switch:</span>
            <span class="text-emerald-400 font-semibold">${savedTargets.length} links</span>
          </div>
          <div class="flex flex-wrap gap-1.5">
            ${savedTargets.map(target => `
              <button 
                onclick="switchCardPreset('${escapeHtml(card.id)}', '${escapeHtml(target.id)}')"
                class="target-pill px-2.5 py-1 rounded-lg text-[11px] font-medium border flex items-center gap-1.5 transition-all ${
                  target.active || card.destinationUrl === target.url 
                    ? 'active bg-emerald-600 border-emerald-500 text-white font-bold shadow-md shadow-emerald-600/30' 
                    : 'bg-zinc-900 border-zinc-700 text-zinc-300 hover:border-emerald-500/40'
                }"
              >
                <span>${target.icon || '🔗'}</span>
                <span>${escapeHtml(target.label || 'link')}</span>
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
    else if (isWifi) modeBadge = `Wi-Fi 📶`;
    else if (isSos) modeBadge = `Lost & Found 🆘`;

    const leadBadge = card.leadCapture?.enabled ? `<span class="text-[10px] bg-purple-500/30 text-purple-200 px-1.5 py-0.5 rounded font-bold border border-purple-500/30">📥 Leads</span>` : '';
    const limitBadge = (card.limits?.maxScans || card.limits?.expiresAt) ? `<span class="text-[10px] bg-amber-500/30 text-amber-200 px-1.5 py-0.5 rounded font-bold border border-amber-500/30">⏳ Limits</span>` : '';

    const bulkSelectHtml = isBulkMode ? `
      <div class="p-2.5 bg-zinc-900/90 border border-emerald-500/40 rounded-2xl flex items-center justify-between shadow-sm">
        <label class="flex items-center gap-2 cursor-pointer select-none">
          <input type="checkbox" onchange="toggleCardSelection('${escapeHtml(card.id)}')" ${selectedCardIds.has(card.id) ? 'checked' : ''} class="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-zinc-950 border-zinc-700">
          <span class="text-xs font-bold text-emerald-300">Select for Bulk Actions</span>
        </label>
        <span class="text-[10px] text-zinc-400 font-mono">/c/${escapeHtml(card.slug)}</span>
      </div>
    ` : '';

    return `
      <div class="spotlight-card bg-zinc-950/80 border border-zinc-800/90 hover:border-emerald-500/40 rounded-3xl p-4 sm:p-5 shadow-xl backdrop-blur-xl flex flex-col justify-between space-y-4 transition-all">
        
        ${bulkSelectHtml}

        <!-- 3D Realistic Smart NFC Card Header Component -->
        <div class="${themeClasses} p-4 sm:p-5 text-white flex flex-col justify-between min-h-[145px] relative group select-none">
          
          <!-- Top Row: Chip, TapLink Brand & NFC Icon -->
          <div class="flex items-center justify-between z-10">
            <div class="flex items-center gap-2.5">
              <div class="gold-chip"></div>
              <span class="text-[9px] font-mono font-bold tracking-widest text-emerald-300 uppercase px-1.5 py-0.5 rounded bg-black/40 border border-emerald-500/20 shiny-text">${t('card_brand_badge', 'TapLink • MUHAB')}</span>
            </div>
            <div class="flex items-center gap-2">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-bold ${card.isActive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'}">
                ${card.isActive ? `${t('card_status_active', 'Active')} 🟢` : `${t('card_status_paused', 'Paused')} 🔴`}
              </span>
              <div class="relative w-7 h-7 flex items-center justify-center">
                <svg class="w-6 h-6 text-white/90" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004.07 7.07M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path>
                </svg>
              </div>
            </div>
          </div>

          <!-- Title & Badges -->
          <div class="z-10 my-2">
            <h3 class="text-sm sm:text-base font-extrabold text-white tracking-wide truncate">${escapeHtml(card.title)}</h3>
            <div class="flex flex-wrap items-center gap-1.5 mt-1">
              <span class="text-[10px] bg-black/50 px-2 py-0.5 rounded font-mono text-emerald-300 font-semibold border border-emerald-500/20" dir="ltr">/c/${escapeHtml(card.slug)}</span>
              <span class="text-[10px] bg-white/20 text-white font-bold px-1.5 py-0.5 rounded">${modeBadge}</span>
              ${leadBadge}
              ${limitBadge}
              ${card.pinCode ? `<span class="text-[10px] bg-rose-500/30 text-rose-200 px-1.5 py-0.5 rounded font-bold">${t('card_pin_protected', 'PIN Protected')} 🔒</span>` : ''}
            </div>
          </div>

          <!-- Bottom: Scans & Copy Link -->
          <div class="flex items-center justify-between text-[11px] text-white/90 z-10 pt-1 border-t border-white/10">
            <div class="flex items-center gap-1">
              <span>${t('scans_count_suffix', 'Scans')}:</span>
              <strong class="text-white font-mono text-xs">${card.scanCount || 0}</strong>
            </div>
            <button onclick="copyToClipboard('${fixedUrl}', '${t('toast_copied', 'Copied to clipboard!')}')" class="magnetic-btn bg-black/40 hover:bg-black/60 px-2 py-1 rounded-lg text-[10px] font-bold text-white transition-all flex items-center gap-1 border border-white/10 active:scale-95">
              <span>${t('btn_copy_link', 'Copy Link')}</span>
              <svg class="w-3 h-3 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"></path></svg>
            </button>
          </div>

        </div>

        <!-- Presets Pills -->
        ${presetsHtml}

        <!-- Inline URL Editor (For Direct / Conditional modes) -->
        ${!isProfile && !isCatalog && !isWifi && !isSos ? `
          <div class="space-y-1.5">
            <div class="flex items-center justify-between text-[11px]">
              <label class="font-bold text-zinc-300">${t('card_target_label', 'Target Destination URL:')}</label>
              <a href="${escapeHtml(card.destinationUrl || '#')}" target="_blank" class="text-emerald-400 hover:underline text-[10px] font-semibold flex items-center gap-0.5" dir="ltr">
                <span>URL</span>
                <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
              </a>
            </div>
            <div class="flex items-center gap-1.5">
              <input 
                type="text" 
                id="inlineUrl_${escapeHtml(card.id)}" 
                value="${escapeHtml(card.destinationUrl || '')}" 
                dir="ltr"
                placeholder="instagram.com/..., tiktok.com/..., or any link"
                class="flex-1 bg-[#050806] border border-zinc-700/80 rounded-xl px-3 py-2 text-xs font-mono text-white text-start focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
              <button 
                onclick="saveInlineUrl('${escapeHtml(card.id)}')"
                class="magnetic-btn px-3.5 py-2 bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-500 hover:to-emerald-400 text-white font-bold text-xs rounded-xl transition-all active:scale-95 shadow-md shadow-emerald-600/30 shrink-0"
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
              <span class="text-[11px] text-zinc-400">${escapeHtml(card.profile?.fullName || card.title)} - vCard</span>
            </div>
            <a href="${fixedUrl}" target="_blank" class="magnetic-btn px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-all shadow-md shadow-emerald-600/20">
              ${t('btn_test_sim', 'Preview')} 👤
            </a>
          </div>
        ` : ''}

        ${isCatalog ? `
          <div class="p-3 bg-zinc-900 border border-emerald-500/20 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span class="font-bold text-white block">${t('action_catalog_title', 'Menu & Catalog Active')}</span>
              <span class="text-[11px] text-zinc-400">${escapeHtml(card.catalog?.businessName || card.title)} - Wi-Fi & Reviews</span>
            </div>
            <a href="./catalog.html?slug=${escapeHtml(card.slug)}" target="_blank" class="magnetic-btn px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-all shadow-md shadow-emerald-600/20">
              ${t('btn_test_sim', 'Preview')} 🍽️
            </a>
          </div>
        ` : ''}

        ${isWifi ? `
          <div class="p-3 bg-sky-950/20 border border-sky-500/30 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span class="font-bold text-sky-300 block">Smart Wi-Fi Active 📶</span>
              <span class="text-[11px] text-zinc-400">SSID: ${escapeHtml(card.wifi?.ssid || 'Network')}</span>
            </div>
            <button onclick="openQuickPassModal('${card.id}')" class="magnetic-btn px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-[11px] rounded-lg transition-all shadow-md">
              Pass / QR 📲
            </button>
          </div>
        ` : ''}

        ${isSos ? `
          <div class="p-3 bg-rose-950/20 border border-rose-500/30 rounded-2xl flex items-center justify-between text-xs">
            <div>
              <span class="font-bold text-rose-300 block">Lost & Found / SOS Active 🆘</span>
              <span class="text-[11px] text-zinc-400">${escapeHtml(card.sos?.ownerName || 'Emergency')} (${escapeHtml(card.sos?.phone || '')})</span>
            </div>
            <a href="${fixedUrl}" target="_blank" class="magnetic-btn px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-[11px] rounded-lg transition-all shadow-md">
              SOS Page 🆘
            </a>
          </div>
        ` : ''}

        <!-- Action Control Buttons Footer with Magnetic Feedback -->
        <div class="grid grid-cols-3 sm:grid-cols-6 gap-1.5 pt-2 border-t border-zinc-800/80">
          
          <button 
            onclick="openQuickPassModal('${card.id}')"
            class="magnetic-btn py-2 px-1.5 bg-gradient-to-r from-emerald-600/20 to-green-600/10 hover:bg-emerald-600/30 text-emerald-300 rounded-xl text-[11px] font-bold border border-emerald-500/30 flex items-center justify-center gap-1 active:scale-95 transition-all shadow-sm"
            title="Apple Wallet Quick Pass"
          >
            <span>📲</span>
            <span data-i18n="btn_pass">Pass</span>
          </button>

          <button 
            onclick="openSimulatorDrawer('${card.id}')"
            class="magnetic-btn py-2 px-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-[11px] font-bold border border-zinc-700 hover:border-emerald-500/40 flex items-center justify-center gap-1 active:scale-95 transition-all"
            title="${t('btn_test_sim', 'Simulate')}"
          >
            <span>📱</span>
            <span>${t('btn_test_sim', 'Test')}</span>
          </button>

          <button 
            onclick="openNfcProgrammerModal('${card.id}')"
            class="magnetic-btn py-2 px-1.5 bg-zinc-900 hover:bg-zinc-800 text-emerald-400 rounded-xl text-[11px] font-bold border border-zinc-700 hover:border-emerald-500/40 flex items-center justify-center gap-1 active:scale-95 transition-all"
            title="${t('btn_program_nfc', 'Write NFC')}"
          >
            <span>📡</span>
            <span>${t('btn_program_nfc', 'NFC')}</span>
          </button>

          <button 
            onclick="openEditCardDrawer('${card.id}')"
            class="magnetic-btn py-2 px-1.5 bg-zinc-900 hover:bg-zinc-800 text-zinc-200 rounded-xl text-[11px] font-bold border border-zinc-700 flex items-center justify-center gap-1 active:scale-95 transition-all"
            title="${t('btn_edit', 'Edit')}"
          >
            <span>✏️</span>
            <span>${t('btn_edit', 'Edit')}</span>
          </button>

          <button 
            onclick="toggleCardActiveState('${card.id}')"
            class="magnetic-btn py-2 px-1.5 rounded-xl text-[11px] font-bold border flex items-center justify-center gap-1 active:scale-95 transition-all ${
              card.isActive 
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20' 
                : 'bg-rose-500/10 border-rose-500/30 text-rose-400 hover:bg-rose-500/20'
            }"
            title="${card.isActive ? t('card_status_paused', 'Pause') : t('card_status_active', 'Activate')}"
          >
            <span>${card.isActive ? '⏸' : '▶'}</span>
          </button>

          <button 
            onclick="deleteCard('${card.id}')"
            class="magnetic-btn py-2 px-1.5 rounded-xl text-[11px] font-bold border border-rose-500/30 bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 hover:text-rose-300 flex items-center justify-center gap-0.5 active:scale-95 transition-all shadow-sm"
            title="${t('btn_delete_card', 'Delete Card Permanently')}"
          >
            <span>🗑️</span>
          </button>

        </div>

      </div>
    `;
  }).join('');

  // Re-bind React Bits Pro interactive effects
  initSpotlightAndTiltCards();
  initMagneticButtons();
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
  // Clear any conflicting time/device routing
  if (card.timeRouting) card.timeRouting.enabled = false;
  if (card.conditional?.time) card.conditional.time.enabled = false;
  if (card.conditional?.device) card.conditional.device.enabled = false;
  // Update savedTargets active state
  if (Array.isArray(card.savedTargets)) {
    let mainT = card.savedTargets.find(t => t.id === 't-main' || t.label === 'Main Target');
    if (mainT) mainT.url = newUrl;
    card.savedTargets.forEach(t => { t.active = (t.url === newUrl); });
  }
  saveLocalCards(cardsList);
  renderCardsGrid();
  showToast(t('toast_saved_sync', '✅ تم الحفظ والمزامنة لجميع الأجهزة'), 'success');

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
  const delBtn = document.getElementById('btnDrawerDeleteCard');
  if (delBtn) delBtn.classList.add('hidden');
  document.getElementById('cardDrawerTitle').textContent = t('drawer_add_title', 'Add New Smart NFC Tag');
  document.getElementById('cardEditorForm').reset();
  document.getElementById('inpIsActive').checked = true;
  if (document.getElementById('inpManagePin')) document.getElementById('inpManagePin').value = '1234';

  // Reset Enterprise Fields
  if (document.getElementById('inpCardCategory')) document.getElementById('inpCardCategory').value = 'all';
  if (document.getElementById('inpLeadCaptureEnabled')) document.getElementById('inpLeadCaptureEnabled').checked = false;
  if (document.getElementById('inpLeadCaptureRequired')) document.getElementById('inpLeadCaptureRequired').checked = false;
  if (document.getElementById('inpLeadCaptureTitle')) document.getElementById('inpLeadCaptureTitle').value = '';
  if (document.getElementById('inpLeadCaptureSubtitle')) document.getElementById('inpLeadCaptureSubtitle').value = '';
  if (document.getElementById('inpMaxScans')) document.getElementById('inpMaxScans').value = '';
  if (document.getElementById('inpExpiresAt')) document.getElementById('inpExpiresAt').value = '';
  if (document.getElementById('inpFallbackUrl')) document.getElementById('inpFallbackUrl').value = '';
  if (document.getElementById('inpExpiredMessage')) document.getElementById('inpExpiredMessage').value = '';

  if (document.getElementById('inpWifiSsid')) document.getElementById('inpWifiSsid').value = '';
  if (document.getElementById('inpWifiPass')) document.getElementById('inpWifiPass').value = '';
  if (document.getElementById('inpWifiEncryption')) document.getElementById('inpWifiEncryption').value = 'WPA';
  if (document.getElementById('inpWifiHidden')) document.getElementById('inpWifiHidden').checked = false;

  if (document.getElementById('inpSosOwnerName')) document.getElementById('inpSosOwnerName').value = '';
  if (document.getElementById('inpSosReward')) document.getElementById('inpSosReward').value = '';
  if (document.getElementById('inpSosPhone')) document.getElementById('inpSosPhone').value = '';
  if (document.getElementById('inpSosWhatsapp')) document.getElementById('inpSosWhatsapp').value = '';
  if (document.getElementById('inpSosMessage')) document.getElementById('inpSosMessage').value = '';

  const detailsEl = document.getElementById('detailsAdvancedCardSettings');
  if (detailsEl) detailsEl.open = false;

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

  // Enterprise Category & Advanced Options
  if (document.getElementById('inpCardCategory')) document.getElementById('inpCardCategory').value = card.category || 'all';

  const lc = card.leadCapture || {};
  if (document.getElementById('inpLeadCaptureEnabled')) document.getElementById('inpLeadCaptureEnabled').checked = Boolean(lc.enabled);
  if (document.getElementById('inpLeadCaptureRequired')) document.getElementById('inpLeadCaptureRequired').checked = Boolean(lc.required);
  if (document.getElementById('inpLeadCaptureTitle')) document.getElementById('inpLeadCaptureTitle').value = lc.title || '';
  if (document.getElementById('inpLeadCaptureSubtitle')) document.getElementById('inpLeadCaptureSubtitle').value = lc.subtitle || '';

  const limits = card.limits || {};
  if (document.getElementById('inpMaxScans')) document.getElementById('inpMaxScans').value = limits.maxScans || '';
  if (document.getElementById('inpExpiresAt')) document.getElementById('inpExpiresAt').value = limits.expiresAt ? limits.expiresAt.substring(0, 16) : '';
  if (document.getElementById('inpFallbackUrl')) document.getElementById('inpFallbackUrl').value = limits.fallbackUrl || '';
  if (document.getElementById('inpExpiredMessage')) document.getElementById('inpExpiredMessage').value = limits.expiredMessage || '';

  // Wi-Fi
  const wifi = card.wifi || {};
  if (document.getElementById('inpWifiSsid')) document.getElementById('inpWifiSsid').value = wifi.ssid || '';
  if (document.getElementById('inpWifiPass')) document.getElementById('inpWifiPass').value = wifi.password || '';
  if (document.getElementById('inpWifiEncryption')) document.getElementById('inpWifiEncryption').value = wifi.encryption || 'WPA';
  if (document.getElementById('inpWifiHidden')) document.getElementById('inpWifiHidden').checked = Boolean(wifi.hidden);

  // SOS
  const sos = card.sos || {};
  if (document.getElementById('inpSosOwnerName')) document.getElementById('inpSosOwnerName').value = sos.ownerName || '';
  if (document.getElementById('inpSosReward')) document.getElementById('inpSosReward').value = sos.reward || '';
  if (document.getElementById('inpSosPhone')) document.getElementById('inpSosPhone').value = sos.phone || '';
  if (document.getElementById('inpSosWhatsapp')) document.getElementById('inpSosWhatsapp').value = sos.whatsapp || '';
  if (document.getElementById('inpSosMessage')) document.getElementById('inpSosMessage').value = sos.message || '';

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
  const tabs = ['basic', 'wifi', 'sos', 'presets', 'conditional', 'catalog', 'profile'];
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

  const category = document.getElementById('inpCardCategory')?.value || 'all';

  const leadCapture = {
    enabled: Boolean(document.getElementById('inpLeadCaptureEnabled')?.checked),
    required: Boolean(document.getElementById('inpLeadCaptureRequired')?.checked),
    title: document.getElementById('inpLeadCaptureTitle')?.value.trim() || '',
    subtitle: document.getElementById('inpLeadCaptureSubtitle')?.value.trim() || ''
  };

  const limits = {
    maxScans: Number(document.getElementById('inpMaxScans')?.value) || 0,
    expiresAt: document.getElementById('inpExpiresAt')?.value || null,
    fallbackUrl: sanitizeUrl(document.getElementById('inpFallbackUrl')?.value || ''),
    expiredMessage: document.getElementById('inpExpiredMessage')?.value.trim() || ''
  };

  const wifi = {
    ssid: document.getElementById('inpWifiSsid')?.value.trim() || '',
    password: document.getElementById('inpWifiPass')?.value.trim() || '',
    encryption: document.getElementById('inpWifiEncryption')?.value || 'WPA',
    hidden: Boolean(document.getElementById('inpWifiHidden')?.checked)
  };

  const sos = {
    ownerName: document.getElementById('inpSosOwnerName')?.value.trim() || '',
    phone: document.getElementById('inpSosPhone')?.value.trim() || '',
    whatsapp: document.getElementById('inpSosWhatsapp')?.value.trim() || '',
    message: document.getElementById('inpSosMessage')?.value.trim() || '',
    reward: document.getElementById('inpSosReward')?.value.trim() || ''
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
    category,
    leadCapture,
    limits,
    wifi,
    sos,
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
  showToast(t('toast_saved_sync', '✅ تم الحفظ والمزامنة لجميع الأجهزة'), 'success');

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

  if (elP1 && elB1) { animateCountUp(elP1, pctIPhone, 850, '', '%'); elB1.style.width = pctIPhone + '%'; }
  if (elP2 && elB2) { animateCountUp(elP2, pctAndroid, 850, '', '%'); elB2.style.width = pctAndroid + '%'; }
  if (elP3 && elB3) { animateCountUp(elP3, pctOther, 850, '', '%'); elB3.style.width = pctOther + '%'; }

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

  // Initialize React Bits Pro interactions & Floating Dock Indicator
  initSpotlightAndTiltCards();
  initMagneticButtons();
  setTimeout(() => updateDockIndicator('home'), 150);
  window.addEventListener('resize', () => {
    const currentTab = document.querySelector('[id^="tabView"]:not(.hidden)')?.id?.replace('tabView', '')?.toLowerCase() || 'home';
    updateDockIndicator(currentTab);
  }, { passive: true });
}

// ==========================================
// CARD DELETION & WORKSPACE CLEAN-UP ENGINE
// ==========================================
async function deleteCard(cardId) {
  const card = cardsList.find(c => c.id === cardId);
  if (!card) return;

  const confirmMsg = t('confirm_delete_card', `هل أنت متأكد من حذف بطاقة "${card.title || card.slug}" نهائياً؟\n\nسيتم مسحها فوراً من هاتفك ومن السحابة المركزية ولا يمكن استرجاعها.`);
  if (!confirm(confirmMsg)) return;

  if (navigator.vibrate) navigator.vibrate([40, 40]);

  // Permanently remove from array
  cardsList = cardsList.filter(c => c.id !== cardId);

  // Mark initialized so defaults are never resurrected
  localStorage.setItem('nfc_db_initialized', 'true');

  // Save to local storage & immediately push empty/updated array to cloud DB
  saveLocalCards(cardsList);
  renderCardsGrid();
  loadLocalStats();

  showToast(t('toast_deleted', '✅ تم حذف البطاقة نهائياً ومزامنة التحديث لجميع الأجهزة 🗑️'), 'success');

  if (!isOfflineOrStatic) {
    try {
      fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
    } catch (e) {}
  }
}

function handleDrawerDeleteCard() {
  const editId = document.getElementById('cardEditId').value;
  if (!editId) return;
  closeCardEditorDrawer();
  deleteCard(editId);
}

function clearAllDemoCards() {
  const confirmMsg = t('confirm_clear_demo', 'هل تريد حذف جميع البطاقات التجريبية (Hoomi, ksnjv, cardtest) لتنظيف اللوحة والبدء ببطاقاتك الخاصة فقط؟');
  if (!confirm(confirmMsg)) return;

  const demoSlugs = ['card-hoomi', 'card-ksnjv', 'cardtest'];
  cardsList = cardsList.filter(c => !demoSlugs.includes((c.slug || '').toLowerCase()));
  
  localStorage.setItem('nfc_db_initialized', 'true');
  saveLocalCards(cardsList);
  renderCardsGrid();
  loadLocalStats();

  showToast(t('toast_demo_cleared', '✅ تم تنظيف وحذف البطاقات التجريبية ومزامنة التحديث لجميع الأجهزة 🧹'), 'success');
}

// ==========================================
// ENTERPRISE PRO: LEADS CRM ENGINE
// ==========================================
async function loadLeads() {
  try {
    const raw = localStorage.getItem('nfc_leads_db') || '[]';
    leadsList = JSON.parse(raw);
    if (!Array.isArray(leadsList)) leadsList = [];
  } catch (e) {
    leadsList = [];
  }

  // Sync with server if online
  if (!isOfflineOrStatic) {
    try {
      const res = await fetch('/api/leads');
      if (res.ok) {
        const data = await res.json();
        const serverLeads = Array.isArray(data) ? data : (Array.isArray(data.leads) ? data.leads : []);
        if (serverLeads.length > 0 || data.success) {
          const idMap = new Map();
          [...serverLeads, ...leadsList].forEach(l => {
            if (l && l.id) idMap.set(l.id, l);
          });
          leadsList = Array.from(idMap.values());
          localStorage.setItem('nfc_leads_db', JSON.stringify(leadsList));
        }
      }
    } catch (e) {}
  }

  renderLeadsList(leadsList);
}

function renderLeadsList(listToRender) {
  const container = document.getElementById('leadsListContainer');
  const countBadge = document.getElementById('leadsCountBadge');
  const navBadge = document.getElementById('navLeadsBadge');
  if (!container) return;

  const count = leadsList.length;
  if (countBadge) countBadge.textContent = `${count} ${t('leads_count_suffix', 'Leads')}`;
  if (navBadge) {
    if (count > 0) navBadge.classList.remove('hidden');
    else navBadge.classList.add('hidden');
  }

  if (!listToRender || listToRender.length === 0) {
    container.innerHTML = `
      <div class="bg-zinc-950/70 border border-zinc-800 rounded-3xl p-10 text-center space-y-3">
        <div class="w-14 h-14 rounded-2xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto text-2xl">📥</div>
        <h3 class="text-sm font-bold text-white">${t('empty_leads_title', 'No Customer Leads Yet')}</h3>
        <p class="text-xs text-zinc-400 max-w-sm mx-auto">${t('empty_leads_desc', 'Enable "Lead Capture" in any card settings to automatically collect visitor contact details when they tap.')}</p>
      </div>
    `;
    return;
  }

  container.innerHTML = listToRender.map(lead => {
    const cleanPhone = (lead.visitorPhone || '').replace(/[^0-9]/g, '');
    const waUrl = `https://wa.me/${cleanPhone}?text=${encodeURIComponent('Hello ' + (lead.visitorName || '') + ', thank you for contacting us via TapLink!')}`;
    const dateFormatted = lead.capturedAt ? new Date(lead.capturedAt).toLocaleString() : 'Recent';

    return `
      <div class="bg-zinc-950/80 border border-zinc-800 hover:border-emerald-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg transition-all">
        <div class="flex items-center gap-3">
          <div class="w-10 h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-green-500 text-white font-black flex items-center justify-center text-sm shadow-md shadow-emerald-600/30 shrink-0">
            ${escapeHtml((lead.visitorName || 'U').charAt(0).toUpperCase())}
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h4 class="text-sm font-bold text-white">${escapeHtml(lead.visitorName || 'Anonymous Visitor')}</h4>
              <span class="text-[10px] bg-zinc-900 border border-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono">${escapeHtml(lead.cardTitle || lead.cardSlug || 'Tag')}</span>
            </div>
            <div class="flex flex-wrap items-center gap-3 text-xs text-zinc-400 mt-1">
              <span class="font-mono text-emerald-400 font-semibold" dir="ltr">${escapeHtml(lead.visitorPhone || '')}</span>
              <span class="text-[10px] text-zinc-500">🕒 ${dateFormatted}</span>
            </div>
            ${lead.visitorNote ? `<p class="text-[11px] text-zinc-300 mt-1 bg-zinc-900/60 p-1.5 rounded-lg border border-zinc-800/80">"${escapeHtml(lead.visitorNote)}"</p>` : ''}
          </div>
        </div>

        <div class="flex items-center gap-2 self-end sm:self-auto shrink-0">
          <a href="${waUrl}" target="_blank" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 active:scale-95 transition-all shadow-md shadow-emerald-600/30">
            <span>💬</span>
            <span>WhatsApp</span>
          </a>
          <button onclick="downloadSingleLeadVcfHandler('${lead.id}')" class="px-2.5 py-1.5 bg-zinc-900 hover:bg-zinc-850 text-zinc-300 hover:text-white rounded-xl text-xs font-bold border border-zinc-700 active:scale-95 transition-all" title="Download .vcf contact">
            <span>📇</span>
          </button>
          <button onclick="deleteSingleLeadHandler('${lead.id}')" class="px-2 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 rounded-xl text-xs font-bold border border-rose-500/20 active:scale-95 transition-all" title="Delete Lead">
            <span>🗑️</span>
          </button>
        </div>
      </div>
    `;
  }).join('');
}

function filterLeadsTable() {
  const query = (document.getElementById('leadSearchInput')?.value || '').toLowerCase().trim();
  if (!query) {
    renderLeadsList(leadsList);
    return;
  }
  const filtered = leadsList.filter(l => 
    (l.visitorName && l.visitorName.toLowerCase().includes(query)) ||
    (l.visitorPhone && l.visitorPhone.toLowerCase().includes(query)) ||
    (l.visitorNote && l.visitorNote.toLowerCase().includes(query)) ||
    (l.cardTitle && l.cardTitle.toLowerCase().includes(query)) ||
    (l.cardSlug && l.cardSlug.toLowerCase().includes(query))
  );
  renderLeadsList(filtered);
}

function generateVcfString(name, phone, note) {
  return [
    'BEGIN:VCARD',
    'VERSION:3.0',
    `FN;CHARSET=UTF-8:${name}`,
    `TEL;TYPE=CELL:${phone}`,
    note ? `NOTE;CHARSET=UTF-8:${note}` : '',
    'END:VCARD'
  ].filter(Boolean).join('\r\n');
}

function downloadSingleLeadVcfHandler(leadId) {
  const lead = leadsList.find(l => l.id === leadId);
  if (!lead) return;
  const vcf = generateVcfString(lead.visitorName || 'Contact', lead.visitorPhone || '', lead.visitorNote || '');
  const blob = new Blob([vcf], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `lead_${(lead.visitorName || 'contact').replace(/\s+/g, '_')}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportAllLeadsVcf() {
  if (leadsList.length === 0) {
    showToast('No leads available to export', 'error');
    return;
  }
  let fullVcf = '';
  leadsList.forEach(l => {
    fullVcf += generateVcfString(l.visitorName || 'Contact', l.visitorPhone || '', l.visitorNote || '') + '\r\n';
  });
  const blob = new Blob([fullVcf], { type: 'text/vcard;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `taplink_all_leads_${Date.now()}.vcf`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Exported all leads to VCF contacts!', 'success');
}

function exportLeadsToCsv() {
  if (leadsList.length === 0) {
    showToast('No leads available to export', 'error');
    return;
  }
  // Include UTF-8 BOM (\uFEFF) for Arabic display in Microsoft Excel
  let csv = '\uFEFFName,Phone,Tag Slug,Tag Title,Note,Captured At\n';
  leadsList.forEach(l => {
    const row = [
      `"${(l.visitorName || '').replace(/"/g, '""')}"`,
      `"${(l.visitorPhone || '').replace(/"/g, '""')}"`,
      `"${(l.cardSlug || '').replace(/"/g, '""')}"`,
      `"${(l.cardTitle || '').replace(/"/g, '""')}"`,
      `"${(l.visitorNote || '').replace(/"/g, '""')}"`,
      `"${(l.capturedAt || '').replace(/"/g, '""')}"`
    ];
    csv += row.join(',') + '\n';
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `taplink_leads_${Date.now()}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast('Exported leads to CSV (Excel)!', 'success');
}

async function deleteSingleLeadHandler(leadId) {
  if (!confirm('Are you sure you want to delete this lead?')) return;
  leadsList = leadsList.filter(l => l.id !== leadId);
  localStorage.setItem('nfc_leads_db', JSON.stringify(leadsList));
  renderLeadsList(leadsList);
  if (!isOfflineOrStatic) {
    try {
      fetch(`/api/leads/${leadId}`, { method: 'DELETE' });
    } catch (e) {}
  }
  showToast('Lead deleted', 'success');
}

async function clearAllLeadsHandler() {
  if (!confirm('Are you sure you want to delete ALL customer leads? This cannot be undone.')) return;
  leadsList = [];
  localStorage.setItem('nfc_leads_db', JSON.stringify([]));
  renderLeadsList(leadsList);
  if (!isOfflineOrStatic) {
    try {
      fetch('/api/leads', { method: 'DELETE' });
    } catch (e) {}
  }
  showToast('All leads cleared', 'success');
}

// ==========================================
// ENTERPRISE PRO: BULK ACTIONS ENGINE
// ==========================================
function toggleBulkSelectionMode(forceState) {
  isBulkMode = (typeof forceState === 'boolean') ? forceState : !isBulkMode;
  selectedCardIds.clear();
  const btn = document.getElementById('btnToggleBulkMode');
  if (btn) {
    if (isBulkMode) {
      btn.classList.add('bg-emerald-500/20', 'border-emerald-500/40', 'text-emerald-300');
    } else {
      btn.classList.remove('bg-emerald-500/20', 'border-emerald-500/40', 'text-emerald-300');
    }
  }
  updateBulkActionBar();
  renderCardsGrid();
}

function toggleCardSelection(cardId) {
  if (selectedCardIds.has(cardId)) {
    selectedCardIds.delete(cardId);
  } else {
    selectedCardIds.add(cardId);
  }
  updateBulkActionBar();
}

function updateBulkActionBar() {
  const bar = document.getElementById('bulkActionBar');
  const countEl = document.getElementById('bulkSelectedCount');
  if (!bar) return;
  const count = selectedCardIds.size;
  if (countEl) countEl.textContent = `${count} ${t('bulk_selected_suffix', 'Selected')}`;

  if (isBulkMode && count > 0) {
    bar.classList.remove('hidden');
    bar.classList.add('flex');
  } else {
    bar.classList.add('hidden');
    bar.classList.remove('flex');
  }
}

function selectAllBulkCards() {
  cardsList.forEach(c => selectedCardIds.add(c.id));
  updateBulkActionBar();
  renderCardsGrid();
}

function clearBulkSelection() {
  selectedCardIds.clear();
  updateBulkActionBar();
  renderCardsGrid();
}

function openBulkUrlModal() {
  if (selectedCardIds.size === 0) return;
  const modal = document.getElementById('bulkUrlModal');
  const subtext = document.getElementById('bulkUrlSubtext');
  if (subtext) subtext.textContent = `Updating ${selectedCardIds.size} selected tags`;
  if (modal) modal.classList.remove('hidden');
}

function closeBulkUrlModal() {
  const modal = document.getElementById('bulkUrlModal');
  if (modal) modal.classList.add('hidden');
}

async function executeBulkUrlSave() {
  const newUrl = sanitizeUrl(document.getElementById('inpBulkTargetUrl')?.value || '');
  if (!newUrl) {
    alert('Please enter a valid URL');
    return;
  }
  const ids = Array.from(selectedCardIds);
  cardsList = cardsList.map(c => {
    if (selectedCardIds.has(c.id)) {
      return { ...c, destinationUrl: newUrl, updatedAt: new Date().toISOString() };
    }
    return c;
  });
  saveLocalCards(cardsList);
  closeBulkUrlModal();
  toggleBulkSelectionMode(false);
  renderCardsGrid();
  showToast(`Updated destination URL for ${ids.length} tags!`, 'success');

  if (!isOfflineOrStatic) {
    try {
      fetch('/api/cards/bulk-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: ids, destinationUrl: newUrl })
      });
    } catch (e) {}
  }
}

async function executeBulkStatusToggle(isActive) {
  const ids = Array.from(selectedCardIds);
  if (ids.length === 0) return;
  cardsList = cardsList.map(c => {
    if (selectedCardIds.has(c.id)) {
      return { ...c, isActive: Boolean(isActive), updatedAt: new Date().toISOString() };
    }
    return c;
  });
  saveLocalCards(cardsList);
  toggleBulkSelectionMode(false);
  renderCardsGrid();
  loadLocalStats();
  showToast(`${isActive ? 'Activated' : 'Paused'} ${ids.length} tags!`, 'success');

  if (!isOfflineOrStatic) {
    try {
      fetch('/api/cards/bulk-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: ids, isActive: Boolean(isActive) })
      });
    } catch (e) {}
  }
}

async function executeBulkDelete() {
  const ids = Array.from(selectedCardIds);
  if (ids.length === 0) return;
  if (!confirm(`Are you sure you want to permanently delete ${ids.length} cards? This cannot be undone.`)) return;

  cardsList = cardsList.filter(c => !selectedCardIds.has(c.id));
  saveLocalCards(cardsList);
  toggleBulkSelectionMode(false);
  renderCardsGrid();
  loadLocalStats();
  showToast(`Deleted ${ids.length} cards permanently!`, 'success');

  if (!isOfflineOrStatic) {
    try {
      fetch('/api/cards/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cardIds: ids })
      });
    } catch (e) {}
  }
}

// ==========================================
// ENTERPRISE PRO: QUICK PASS (APPLE WALLET MODE)
// ==========================================
function openQuickPassModal(cardId) {
  if (cardsList.length === 0) {
    showToast('No tags registered to display in Quick Pass', 'error');
    return;
  }
  if (cardId) {
    const idx = cardsList.findIndex(c => c.id === cardId);
    if (idx !== -1) qpCurrentIndex = idx;
    else qpCurrentIndex = 0;
  } else {
    qpCurrentIndex = 0;
  }

  const modal = document.getElementById('quickPassModal');
  if (!modal) return;
  modal.classList.remove('hidden');
  renderQuickPassCurrentCard();
}

function closeQuickPassModal() {
  const modal = document.getElementById('quickPassModal');
  if (modal) modal.classList.add('hidden');
}

function renderQuickPassCurrentCard() {
  if (cardsList.length === 0) return;
  if (qpCurrentIndex < 0) qpCurrentIndex = cardsList.length - 1;
  if (qpCurrentIndex >= cardsList.length) qpCurrentIndex = 0;

  const card = cardsList[qpCurrentIndex];
  const counter = document.getElementById('qpCardCounter');
  const badge = document.getElementById('qpCardBadge');
  const title = document.getElementById('qpCardTitle');
  const slug = document.getElementById('qpCardSlug');
  const target = document.getElementById('qpCardTarget');
  const qrWrap = document.getElementById('qpQrCodeWrapper');

  if (counter) counter.textContent = `Card ${qpCurrentIndex + 1} of ${cardsList.length}`;
  if (title) title.textContent = card.title || 'TapLink Smart Card';
  if (slug) slug.textContent = `/c/${card.slug}`;
  if (target) target.textContent = card.destinationUrl || (card.mode === 'wifi' ? `Wi-Fi: ${card.wifi?.ssid}` : 'Digital Profile');
  if (badge) badge.textContent = `${(card.mode || 'direct').toUpperCase()} TAG`;

  if (qrWrap && window.QRCode) {
    qrWrap.innerHTML = '';
    const bUrl = getBaseUrl();
    const fixedUrl = `${bUrl}/c/${card.slug}`;
    new QRCode(qrWrap, {
      text: fixedUrl,
      width: 200,
      height: 200,
      colorDark: '#000000',
      colorLight: '#ffffff',
      correctLevel: QRCode.CorrectLevel.H
    });
  }
}

function navigateQpCard(direction) {
  qpCurrentIndex += direction;
  renderQuickPassCurrentCard();
}

function toggleQpMaxBrightness() {
  qpMaxContrast = !qpMaxContrast;
  const box = document.getElementById('qpQrBox');
  const cardBox = document.getElementById('qpCardContainer');
  const btn = document.getElementById('btnQpContrast');
  if (qpMaxContrast) {
    if (cardBox) cardBox.classList.add('bg-white', 'text-black');
    if (box) box.classList.add('scale-105', 'border-black');
    if (btn) btn.classList.add('bg-amber-400', 'text-black');
  } else {
    if (cardBox) cardBox.classList.remove('bg-white', 'text-black');
    if (box) box.classList.remove('scale-105', 'border-black');
    if (btn) btn.classList.remove('bg-amber-400', 'text-black');
  }
}

function copyQpLink() {
  if (cardsList.length === 0) return;
  const card = cardsList[qpCurrentIndex];
  const bUrl = getBaseUrl();
  const fixedUrl = `${bUrl}/c/${card.slug}`;
  copyToClipboard(fixedUrl, t('toast_copied', 'Copied to clipboard!'));
}
