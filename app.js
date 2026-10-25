/**
 * Dynamic NFC Tag Manager - Frontend Engine
 * Real Data Mode (Zero Dummy Data) & Compact Fixed Responsive UI
 */

// Application State
let cardsList = [];
let baseUrl = window.location.origin + window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
let currentActiveCardForQr = null;
let currentActiveCardForNfc = null;
let isOfflineOrStatic = false;

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  cleanOldFakeData();
  checkAuthAndLoad();
  setupEventListeners();
});

// Remove any lingering fake / dummy data from old sessions
function cleanOldFakeData() {
  try {
    const raw = localStorage.getItem('nfc_cards_db');
    if (raw && (raw.includes('card-sample-') || raw.includes('أحمد خالد') || raw.includes('menu-cafe'))) {
      localStorage.removeItem('nfc_cards_db');
    }
  } catch (e) {}
}

// ==========================================
// 1. AUTH & DATA LOADING (REAL DATA)
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
      } else {
        window.location.href = './login.html';
        return;
      }
    }

    await Promise.all([loadStats(), loadCards()]);
  } catch (err) {
    enableStaticStorageMode();
  }
}

function enableStaticStorageMode() {
  isOfflineOrStatic = true;
  // Initialize with empty real database if not exists
  if (!localStorage.getItem('nfc_cards_db')) {
    localStorage.setItem('nfc_cards_db', JSON.stringify([]));
  }
  loadLocalStats();
  loadLocalCards();
}

async function loadStats() {
  if (isOfflineOrStatic) return loadLocalStats();

  try {
    const res = await fetch('/api/stats');
    const data = await res.json();
    if (data.success && data.stats) {
      applyStatsToUI(data.stats);
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

  applyStatsToUI({
    totalCards,
    activeCards,
    totalScans,
    topCard: topCard && topCard.scanCount > 0 ? { title: topCard.title, scanCount: topCard.scanCount } : null
  });
}

function applyStatsToUI(s) {
  document.getElementById('statTotalCards').textContent = s.totalCards || 0;
  document.getElementById('statTotalScans').textContent = s.totalScans || 0;
  document.getElementById('statActiveCards').textContent = s.activeCards || 0;

  if (s.topCard && s.topCard.scanCount > 0) {
    document.getElementById('statTopCardTitle').textContent = s.topCard.title;
    document.getElementById('statTopCardScans').textContent = `${s.topCard.scanCount} مسحة`;
  } else {
    document.getElementById('statTopCardTitle').textContent = 'لا توجد مسحات بعد';
    document.getElementById('statTopCardScans').textContent = '0 مسحة';
  }
}

async function loadCards() {
  if (isOfflineOrStatic) return loadLocalCards();

  const loading = document.getElementById('cardsLoadingState');
  const empty = document.getElementById('cardsEmptyState');
  const grid = document.getElementById('cardsGrid');

  loading.classList.remove('hidden');
  grid.innerHTML = '';

  try {
    const res = await fetch('/api/cards');
    const data = await res.json();

    loading.classList.add('hidden');

    if (data.success) {
      cardsList = data.cards || [];
      if (data.baseUrl) baseUrl = data.baseUrl;
      renderCards();
    } else {
      loadLocalCards();
    }
  } catch (err) {
    loading.classList.add('hidden');
    loadLocalCards();
  }
}

function loadLocalCards() {
  document.getElementById('cardsLoadingState').classList.add('hidden');
  cardsList = getLocalCards();
  renderCards();
}

function getLocalCards() {
  try {
    const raw = localStorage.getItem('nfc_cards_db');
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalCards(cards) {
  localStorage.setItem('nfc_cards_db', JSON.stringify(cards));
}

// Compute Clean Short NFC URL
function getCleanNfcUrl(slug) {
  // If hosted on GitHub Pages or custom domain
  const root = baseUrl.replace(/\/landing\.html.*$/, '').replace(/\/index\.html.*$/, '').replace(/\/$/, '');
  return `${root}/c/${slug}`;
}

// ==========================================
// 2. RENDERING CARDS (COMPACT & BUG-FREE)
// ==========================================
function renderCards() {
  const grid = document.getElementById('cardsGrid');
  const empty = document.getElementById('cardsEmptyState');
  const search = (document.getElementById('searchInput').value || '').trim().toLowerCase();
  const filter = document.getElementById('statusFilter').value;

  grid.innerHTML = '';

  const filtered = cardsList.filter(card => {
    const matchSearch = 
      (card.title && card.title.toLowerCase().includes(search)) ||
      (card.slug && card.slug.toLowerCase().includes(search)) ||
      (card.destinationUrl && card.destinationUrl.toLowerCase().includes(search));

    if (!matchSearch) return false;

    if (filter === 'active') return card.isActive;
    if (filter === 'inactive') return !card.isActive;
    if (filter === 'direct') return card.actionType === 'direct';
    if (filter === 'profile') return card.actionType === 'profile';

    return true;
  });

  document.getElementById('filteredCountBadge').textContent = `${filtered.length} من ${cardsList.length} بطاقة`;

  if (filtered.length === 0) {
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');

  filtered.forEach(card => {
    const cardEl = createCardElement(card);
    grid.appendChild(cardEl);
  });
}

function createCardElement(card) {
  const el = document.createElement('div');
  el.className = `bg-slate-900/90 border ${card.isActive ? 'border-slate-800 hover:border-slate-700' : 'border-amber-500/25 bg-amber-950/10'} rounded-3xl p-5 shadow-xl transition-all glow-on-hover flex flex-col justify-between relative overflow-hidden`;

  const cleanShortUrl = getCleanNfcUrl(card.slug);
  const relativeTime = getArabicRelativeTime(card.lastScannedAt);

  el.innerHTML = `
    <div>
      <!-- Top Header Row: Badges on Right, iOS Toggle on Left -->
      <div class="flex items-center justify-between gap-2 mb-3">
        <div class="flex items-center gap-1.5">
          <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
            card.isActive 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }">
            <span class="w-1.5 h-1.5 rounded-full ${card.isActive ? 'bg-emerald-400 status-active-pulse' : 'bg-amber-400'}"></span>
            ${card.isActive ? 'نشطة' : 'متوقفة مؤقتاً'}
          </span>

          <span class="text-[10px] px-2.5 py-1 rounded-md font-medium ${
            card.actionType === 'profile' 
              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' 
              : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
          }">
            ${card.actionType === 'profile' ? 'صفحة ملف شخصي' : 'تحويل مباشر'}
          </span>
        </div>

        <!-- Toggle Active Status Button (iOS Style) -->
        <button onclick="toggleCardStatus('${card.id}')" title="${card.isActive ? 'تعطيل البطاقة مؤقتاً' : 'تفعيل البطاقة'}" class="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer group">
          <span class="text-[10px] text-slate-400 group-hover:text-slate-300">${card.isActive ? 'إيقاف' : 'تفعيل'}</span>
          <div class="w-9 h-5 rounded-full transition-colors relative flex items-center p-0.5 ${card.isActive ? 'bg-emerald-500' : 'bg-slate-700'}">
            <div class="w-4 h-4 rounded-full bg-white shadow-md transition-transform duration-200 ${card.isActive ? 'translate-x-0' : '-translate-x-4 rtl:translate-x-4'}"></div>
          </div>
        </button>
      </div>

      <!-- Card Title -->
      <h3 class="text-base font-bold text-white mb-2 leading-snug truncate" title="${card.title}">${card.title}</h3>
      
      <!-- Short Permanent NFC URL Bar with Instant Copy & QR buttons -->
      <div class="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-2.5 mb-3 flex items-center justify-between gap-2">
        <div class="flex items-center gap-2 min-w-0 flex-1">
          <span class="text-[10px] font-bold text-slate-400 bg-slate-700/60 px-2 py-0.5 rounded-md shrink-0 select-none">رابط NFC</span>
          <span class="font-mono text-xs text-indigo-300 truncate" dir="ltr" title="${cleanShortUrl}">${cleanShortUrl}</span>
        </div>
        <div class="flex items-center gap-1 shrink-0">
          <button onclick="copyFixedUrl('${cleanShortUrl}')" title="نسخ الرابط الثابت للشريحة" class="px-2 py-1 rounded-lg bg-indigo-600/20 hover:bg-indigo-600/30 active:scale-95 text-indigo-300 transition-all flex items-center gap-1 text-[11px] font-medium border border-indigo-500/20">
            <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
            <span>نسخ</span>
          </button>
          <button onclick="openQrModal('${card.id}')" title="عرض وتحميل رمز QR" class="p-1 rounded-lg bg-slate-750 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700">
            <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
          </button>
        </div>
      </div>

      <!-- Action Type Content -->
      ${card.actionType === 'direct' ? `
        <!-- Direct Redirect Mode: Inline Target URL Editor -->
        <div class="mb-3 bg-slate-800/40 p-3 rounded-2xl border border-slate-700/50">
          <div class="flex items-center justify-between mb-1.5">
            <span class="text-[11px] font-bold text-slate-300">الرابط الهدف الحالي (Destination URL):</span>
            <span class="text-[10px] text-indigo-400 font-medium">⚡ تعديل فوري</span>
          </div>
          <div class="flex items-center gap-2">
            <div class="relative flex-1">
              <input 
                type="url" 
                id="inlineUrl-${card.id}" 
                value="${card.destinationUrl || ''}" 
                placeholder="https://maps.google.com/..." 
                dir="ltr"
                class="w-full bg-slate-800 border border-slate-700 text-white text-xs font-mono rounded-xl px-3 py-2 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-500"
              >
            </div>
            <button 
              onclick="saveQuickUrl('${card.id}')" 
              id="btnSaveQuick-${card.id}" 
              title="حفظ الرابط فوراً"
              class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all shrink-0 flex items-center gap-1 shadow-md shadow-indigo-600/20"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              <span>حفظ</span>
            </button>
          </div>
        </div>
      ` : `
        <!-- Profile Mode: Clean Profile Box -->
        <div class="mb-3 bg-purple-950/20 border border-purple-500/20 p-3 rounded-2xl flex items-center justify-between gap-3">
          <div class="flex items-center gap-2.5 min-w-0">
            <div class="w-8 h-8 rounded-xl bg-purple-600/20 border border-purple-500/30 flex items-center justify-center text-purple-300 shrink-0 font-bold text-xs">
              ${card.profile?.fullName ? card.profile.fullName.charAt(0) : '🪪'}
            </div>
            <div class="truncate">
              <div class="text-xs font-bold text-purple-200 truncate">${card.profile?.fullName || 'الملف الشخصي الرقمي'}</div>
              <div class="text-[10px] text-purple-400/80 truncate">${card.profile?.jobTitle || 'بطاقة أعمال رقمية مع vCard'}</div>
            </div>
          </div>
          <a href="${cleanShortUrl}" target="_blank" class="px-3 py-1.5 rounded-xl bg-purple-600/30 hover:bg-purple-600/50 text-purple-200 text-xs font-medium transition-colors shrink-0 flex items-center gap-1">
            <span>معاينة</span>
            <svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"></path></svg>
          </a>
        </div>
      `}
    </div>

    <!-- Bottom Actions Row: Stats on Right, Tools on Left (Fits comfortably on screen!) -->
    <div class="pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
      <div class="flex items-center gap-2.5">
        <div class="flex items-center gap-1.5 text-slate-300">
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
          <span class="font-bold text-white">${card.scanCount || 0}</span>
          <span class="text-slate-400 text-[11px]">مسحة</span>
        </div>
        <span class="text-slate-600">|</span>
        <span class="text-[11px] text-slate-400">${card.lastScannedAt ? relativeTime : 'لم تمسح بعد'}</span>
      </div>

      <!-- Action Tools -->
      <div class="flex items-center gap-1">
        <button 
          onclick="openNfcWriterModal('${card.id}')" 
          title="برمجة شريحة الـ NFC" 
          class="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-indigo-400 transition-colors border border-slate-700/60"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004.07 7.07M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
        </button>

        <button 
          onclick="openAnalyticsModal('${card.id}')" 
          title="سجل التحليلات" 
          class="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/60"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
        </button>

        <button 
          onclick="editCardModal('${card.id}')" 
          title="تعديل شامل للبطاقة" 
          class="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 transition-colors border border-slate-700/60"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
        </button>

        <button 
          onclick="confirmDeleteCard('${card.id}', '${card.title.replace(/'/g, "\\'")}')" 
          title="حذف البطاقة" 
          class="p-2 rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 transition-colors border border-red-500/20"
        >
          <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path></svg>
        </button>
      </div>
    </div>
  `;

  return el;
}

// ==========================================
// 3. 1-CLICK INSTANT QUICK URL SAVE
// ==========================================
async function saveQuickUrl(cardId) {
  const input = document.getElementById(`inlineUrl-${cardId}`);
  const btn = document.getElementById(`btnSaveQuick-${cardId}`);
  const newUrl = (input.value || '').trim();

  if (!newUrl) {
    showToast('يرجى كتابة الرابط الهدف', 'error');
    input.focus();
    return;
  }

  const originalContent = btn.innerHTML;
  btn.innerHTML = `<svg class="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>`;
  btn.disabled = true;

  if (isOfflineOrStatic) {
    setTimeout(() => {
      const cards = getLocalCards();
      const target = cards.find(c => c.id === cardId);
      if (target) {
        target.destinationUrl = newUrl;
        target.updatedAt = new Date().toISOString();
        saveLocalCards(cards);
        cardsList = cards;
      }
      showToast('تم حفظ وتحديث الرابط الهدف فوراً! ⚡', 'success');
      btn.innerHTML = originalContent;
      btn.disabled = false;
    }, 150);
    return;
  }

  try {
    const res = await fetch(`/api/cards/${cardId}/quick-url`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinationUrl: newUrl })
    });
    const data = await res.json();

    if (data.success) {
      showToast('تم تحديث الرابط الهدف فوراً بنجاح! ⚡', 'success');
      const targetCard = cardsList.find(c => c.id === cardId);
      if (targetCard) targetCard.destinationUrl = newUrl;
    } else {
      showToast(data.error || 'فشل التحديث', 'error');
    }
  } catch (err) {
    showToast('حدث خطأ بالاتصال', 'error');
  } finally {
    btn.innerHTML = originalContent;
    btn.disabled = false;
  }
}

// ==========================================
// 4. TOGGLE ACTIVE/INACTIVE
// ==========================================
async function toggleCardStatus(cardId) {
  if (isOfflineOrStatic) {
    const cards = getLocalCards();
    const target = cards.find(c => c.id === cardId);
    if (target) {
      target.isActive = !target.isActive;
      target.updatedAt = new Date().toISOString();
      saveLocalCards(cards);
      cardsList = cards;
      showToast(target.isActive ? 'تم تفعيل البطاقة' : 'تم تعطيل البطاقة مؤقتاً', 'success');
      renderCards();
      loadLocalStats();
    }
    return;
  }

  try {
    const res = await fetch(`/api/cards/${cardId}/toggle-status`, { method: 'PATCH' });
    const data = await res.json();

    if (data.success) {
      showToast(data.message, 'success');
      const target = cardsList.find(c => c.id === cardId);
      if (target) target.isActive = data.card.isActive;
      renderCards();
      loadStats();
    } else {
      showToast(data.error || 'تعذر تغيير الحالة', 'error');
    }
  } catch (err) {
    showToast('خطأ في الاتصال بالخادم', 'error');
  }
}

// ==========================================
// 5. COPY FIXED LINK WITH TOAST & HAPTIC
// ==========================================
async function copyFixedUrl(url) {
  if (navigator.vibrate) navigator.vibrate(40);
  try {
    await navigator.clipboard.writeText(url);
    showToast('تم نسخ الرابط الثابت بنجاح! ضعه في شريحة الـ NFC 📋', 'success');
  } catch (e) {
    const input = document.createElement('input');
    input.value = url;
    document.body.appendChild(input);
    input.select();
    document.execCommand('copy');
    document.body.removeChild(input);
    showToast('تم نسخ الرابط بنجاح! 📋', 'success');
  }
}

// ==========================================
// 6. QR CODE MODAL
// ==========================================
function openQrModal(cardId) {
  const card = cardsList.find(c => c.id === cardId);
  if (!card) return;
  currentActiveCardForQr = card;

  document.getElementById('qrModalCardTitle').textContent = card.title;
  document.getElementById('qrModalSlug').textContent = `/c/${card.slug}`;

  const container = document.getElementById('qrCanvasContainer');
  container.innerHTML = '';

  const fullUrl = getCleanNfcUrl(card.slug);

  new QRCode(container, {
    text: fullUrl,
    width: 200,
    height: 200,
    colorDark: "#0f172a",
    colorLight: "#ffffff"
  });

  const modal = document.getElementById('qrDisplayModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeQrModal() {
  const modal = document.getElementById('qrDisplayModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

document.getElementById('downloadQrPngBtn').addEventListener('click', () => {
  const canvas = document.querySelector('#qrCanvasContainer canvas');
  if (!canvas) {
    showToast('تعذر العثور على صورة الرمز', 'error');
    return;
  }
  const link = document.createElement('a');
  link.download = `qr-${currentActiveCardForQr ? currentActiveCardForQr.slug : 'card'}.png`;
  link.href = canvas.toDataURL('image/png');
  link.click();
  showToast('تم تحميل رمز QR بنجاح!', 'success');
});

document.getElementById('printQrBtn').addEventListener('click', () => {
  const canvas = document.querySelector('#qrCanvasContainer canvas');
  if (!canvas) return;
  const imgUrl = canvas.toDataURL('image/png');
  const fullUrl = currentActiveCardForQr ? getCleanNfcUrl(currentActiveCardForQr.slug) : '';
  const win = window.open('', '_blank');
  win.document.write(`
    <html dir="rtl">
    <head><title>طباعة رمز الاستجابة السريعة</title></head>
    <body style="text-align: center; font-family: sans-serif; padding: 40px;">
      <h2>${currentActiveCardForQr ? currentActiveCardForQr.title : 'رمز QR'}</h2>
      <img src="${imgUrl}" style="width: 250px; height: 250px; margin: 20px auto; border: 1px solid #ccc; padding: 10px; border-radius: 12px;">
      <p style="font-size: 14px; color: #666; font-family: monospace;" dir="ltr">${fullUrl}</p>
      <script>window.onload = function() { window.print(); window.close(); }<\/script>
    </body>
    </html>
  `);
});

// ==========================================
// 7. WEB NFC API PROGRAMMER
// ==========================================
function openNfcWriterModal(cardId) {
  const card = cardsList.find(c => c.id === cardId);
  if (!card) return;
  currentActiveCardForNfc = card;

  document.getElementById('nfcWriterCardTitle').textContent = `البطاقة: ${card.title}`;
  
  const isWebNfcSupported = 'NDEFReader' in window;
  const webNfcArea = document.getElementById('webNfcAvailableArea');

  if (isWebNfcSupported) {
    webNfcArea.classList.remove('hidden');
  } else {
    webNfcArea.classList.add('hidden');
  }

  const modal = document.getElementById('nfcWriterModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeNfcWriterModal() {
  const modal = document.getElementById('nfcWriterModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

document.getElementById('startNfcWriteBtn').addEventListener('click', async () => {
  if (!currentActiveCardForNfc) return;
  if (!('NDEFReader' in window)) {
    showToast('هذا المتصفح لا يدعم Web NFC. يرجى استخدام تطبيق NFC Tools الموضح بالأسفل.', 'info');
    return;
  }

  const statusText = document.getElementById('nfcWriteStatusText');
  statusText.textContent = 'قرّب بطاقة الـ NFC الآن من ظهر هاتفك... 📡';

  try {
    const ndef = new window.NDEFReader();
    const urlToWrite = getCleanNfcUrl(currentActiveCardForNfc.slug);

    await ndef.write({
      records: [{ recordType: "url", data: urlToWrite }]
    });

    statusText.textContent = 'تمت كتابة الرابط بنجاح على الشريحة! 🎉';
    showToast('تمت برمجة شريحة الـ NFC بنجاح!', 'success');
  } catch (err) {
    console.error('NFC Write Error:', err);
    statusText.textContent = 'حدث خطأ أو تم إلغاء المسح. حاول مرة أخرى';
    showToast('تعذر الكتابة على الشريحة: ' + err.message, 'error');
  }
});

// ==========================================
// 8. CARD ANALYTICS MODAL
// ==========================================
async function openAnalyticsModal(cardId) {
  const card = cardsList.find(c => c.id === cardId);
  if (!card) return;

  document.getElementById('analyticsCardTitle').textContent = `تحليلات: ${card.title}`;
  document.getElementById('analyticsCardSlug').textContent = `/c/${card.slug}`;

  const modal = document.getElementById('analyticsModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');

  const tableBody = document.getElementById('analyticsScansTableBody');

  if (isOfflineOrStatic) {
    document.getElementById('statDeviceIphone').textContent = card.scanCount > 0 ? card.scanCount : 0;
    document.getElementById('statDeviceAndroid').textContent = 0;
    document.getElementById('statDeviceOther').textContent = 0;
    tableBody.innerHTML = card.scanCount > 0 
      ? `
        <tr class="hover:bg-slate-800/50 transition-colors">
          <td class="py-2.5 px-3">${getArabicRelativeTime(card.lastScannedAt)}</td>
          <td class="py-2.5 px-3 font-medium text-white">هاتف ذكي</td>
          <td class="py-2.5 px-3 text-slate-400">متصفح الجوال</td>
        </tr>
      `
      : '<tr><td colspan="3" class="py-4 text-center text-slate-500">لا توجد عمليات مسح مسجلة لهذه البطاقة بعد.</td></tr>';
    return;
  }

  tableBody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-slate-400">جاري تحميل البيانات...</td></tr>';

  try {
    const res = await fetch(`/api/cards/${cardId}/stats`);
    const data = await res.json();

    if (data.success && data.stats) {
      const s = data.stats;
      document.getElementById('statDeviceIphone').textContent = s.devices?.iPhone || 0;
      document.getElementById('statDeviceAndroid').textContent = s.devices?.Android || 0;
      document.getElementById('statDeviceOther').textContent = (s.devices?.Desktop || 0) + (s.devices?.Mac || 0) + (s.devices?.Windows || 0) + (s.devices?.Other || 0);

      if (!s.recentScans || s.recentScans.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-slate-500">لا توجد عمليات مسح مسجلة لهذه البطاقة بعد.</td></tr>';
      } else {
        tableBody.innerHTML = s.recentScans.map(scan => `
          <tr class="hover:bg-slate-800/50 transition-colors">
            <td class="py-2.5 px-3">${formatArabicDate(scan.timestamp)}</td>
            <td class="py-2.5 px-3 font-medium text-white">${scan.deviceType || 'غير محدد'}</td>
            <td class="py-2.5 px-3 text-slate-400">${scan.browser || '-'}</td>
          </tr>
        `).join('');
      }
    }
  } catch (err) {
    tableBody.innerHTML = '<tr><td colspan="3" class="py-4 text-center text-red-400">تعذر جلب التحليلات</td></tr>';
  }
}

function closeAnalyticsModal() {
  const modal = document.getElementById('analyticsModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

// ==========================================
// 9. CREATE & EDIT CARD MODAL
// ==========================================
function openCreateCardModal() {
  document.getElementById('modalTitle').textContent = 'إضافة بطاقة NFC جديدة';
  document.getElementById('cardForm').reset();
  document.getElementById('cardId').value = '';

  generateRandomSlug();
  setActionTypeUI('direct');

  const modal = document.getElementById('cardModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function editCardModal(cardId) {
  const card = cardsList.find(c => c.id === cardId);
  if (!card) return;

  document.getElementById('modalTitle').textContent = 'تعديل بيانات البطاقة';
  document.getElementById('cardId').value = card.id;
  document.getElementById('formTitle').value = card.title || '';
  document.getElementById('formSlug').value = card.slug || '';
  document.getElementById('formDestinationUrl').value = card.destinationUrl || '';
  document.getElementById('formIsActive').checked = card.isActive !== false;

  setActionTypeUI(card.actionType || 'direct');

  const p = card.profile || {};
  document.getElementById('profFullName').value = p.fullName || '';
  document.getElementById('profJobTitle').value = p.jobTitle || '';
  document.getElementById('profCompany').value = p.company || '';
  document.getElementById('profAvatar').value = p.avatar || '';
  document.getElementById('profBio').value = p.bio || '';
  document.getElementById('profPhone').value = p.phone || '';
  document.getElementById('profWhatsapp').value = p.whatsapp || '';
  document.getElementById('profEmail').value = p.email || '';
  document.getElementById('profTwitter').value = p.socials?.twitter || '';
  document.getElementById('profLinkedin').value = p.socials?.linkedin || '';
  document.getElementById('profInstagram').value = p.socials?.instagram || '';

  const modal = document.getElementById('cardModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeCardModal() {
  const modal = document.getElementById('cardModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

function setActionTypeUI(type) {
  const directRadio = document.querySelector('input[name="formActionType"][value="direct"]');
  const profileRadio = document.querySelector('input[name="formActionType"][value="profile"]');
  const directLabel = document.getElementById('actionTypeDirectLabel');
  const profileLabel = document.getElementById('actionTypeProfileLabel');
  const destGroup = document.getElementById('destinationUrlGroup');
  const profileGroup = document.getElementById('profileDetailsGroup');

  if (type === 'profile') {
    profileRadio.checked = true;
    profileLabel.className = 'relative flex flex-col p-3 rounded-2xl border cursor-pointer transition-all border-indigo-600 bg-indigo-600/10';
    directLabel.className = 'relative flex flex-col p-3 rounded-2xl border cursor-pointer transition-all border-slate-700 bg-slate-800/50';
    destGroup.classList.add('hidden');
    profileGroup.classList.remove('hidden');
  } else {
    directRadio.checked = true;
    directLabel.className = 'relative flex flex-col p-3 rounded-2xl border cursor-pointer transition-all border-indigo-600 bg-indigo-600/10';
    profileLabel.className = 'relative flex flex-col p-3 rounded-2xl border cursor-pointer transition-all border-slate-700 bg-slate-800/50';
    destGroup.classList.remove('hidden');
    profileGroup.classList.add('hidden');
  }
}

function generateRandomSlug() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let result = 'card-';
  for (let i = 0; i < 5; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  document.getElementById('formSlug').value = result;
}

// Form Submit
document.getElementById('cardForm').addEventListener('submit', async (e) => {
  e.preventDefault();

  const cardId = document.getElementById('cardId').value;
  const isEditing = Boolean(cardId);

  const title = document.getElementById('formTitle').value.trim();
  const slug = document.getElementById('formSlug').value.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
  const actionType = document.querySelector('input[name="formActionType"]:checked').value;
  const destinationUrl = document.getElementById('formDestinationUrl').value.trim();
  const isActive = document.getElementById('formIsActive').checked;

  const payload = {
    title,
    slug,
    actionType,
    destinationUrl,
    isActive
  };

  if (actionType === 'profile') {
    payload.profile = {
      fullName: document.getElementById('profFullName').value.trim(),
      jobTitle: document.getElementById('profJobTitle').value.trim(),
      company: document.getElementById('profCompany').value.trim(),
      avatar: document.getElementById('profAvatar').value.trim(),
      bio: document.getElementById('profBio').value.trim(),
      phone: document.getElementById('profPhone').value.trim(),
      whatsapp: document.getElementById('profWhatsapp').value.trim(),
      email: document.getElementById('profEmail').value.trim(),
      socials: {
        twitter: document.getElementById('profTwitter').value.trim(),
        linkedin: document.getElementById('profLinkedin').value.trim(),
        instagram: document.getElementById('profInstagram').value.trim()
      }
    };
  }

  const saveBtn = document.getElementById('saveCardBtn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'جاري الحفظ...';

  // Offline / Static fallback
  if (isOfflineOrStatic) {
    const cards = getLocalCards();
    if (isEditing) {
      const idx = cards.findIndex(c => c.id === cardId);
      if (idx !== -1) {
        cards[idx] = { ...cards[idx], ...payload, updatedAt: new Date().toISOString() };
      }
    } else {
      const newCard = {
        id: 'card-' + Math.random().toString(36).substr(2, 9),
        ...payload,
        scanCount: 0,
        lastScannedAt: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      cards.unshift(newCard);
    }
    saveLocalCards(cards);
    cardsList = cards;
    showToast('تم حفظ البطاقة بنجاح!', 'success');
    closeCardModal();
    renderCards();
    loadLocalStats();
    saveBtn.disabled = false;
    saveBtn.textContent = 'حفظ البطاقة';
    return;
  }

  try {
    const url = isEditing ? `/api/cards/${cardId}` : '/api/cards';
    const method = isEditing ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success) {
      showToast(data.message, 'success');
      closeCardModal();
      await Promise.all([loadStats(), loadCards()]);
    } else {
      showToast(data.error || 'فشل حفظ البطاقة', 'error');
    }
  } catch (err) {
    showToast('تعذر الاتصال بالخادم', 'error');
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = 'حفظ البطاقة';
  }
});

// Delete Card
async function confirmDeleteCard(cardId, title) {
  if (!confirm(`هل أنت متأكد من رغبتك في حذف البطاقة "${title}"؟`)) {
    return;
  }

  if (isOfflineOrStatic) {
    let cards = getLocalCards();
    cards = cards.filter(c => c.id !== cardId);
    saveLocalCards(cards);
    cardsList = cards;
    showToast('تم حذف البطاقة بنجاح', 'success');
    renderCards();
    loadLocalStats();
    return;
  }

  try {
    const res = await fetch(`/api/cards/${cardId}`, { method: 'DELETE' });
    const data = await res.json();

    if (data.success) {
      showToast(data.message, 'success');
      await Promise.all([loadStats(), loadCards()]);
    } else {
      showToast(data.error || 'تعذر حذف البطاقة', 'error');
    }
  } catch (err) {
    showToast('خطأ في الاتصال بالخادم', 'error');
  }
}

// ==========================================
// 10. SETTINGS & PASSWORD CHANGE
// ==========================================
function openSettingsModal() {
  document.getElementById('changePasswordForm').reset();
  const modal = document.getElementById('settingsModal');
  modal.classList.remove('hidden');
  modal.classList.add('flex');
}

function closeSettingsModal() {
  const modal = document.getElementById('settingsModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
}

document.getElementById('changePasswordForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const currentPassword = document.getElementById('currentPassInput').value;
  const newPassword = document.getElementById('newPassInput').value;

  if (isOfflineOrStatic) {
    showToast('تم تغيير كلمة المرور بنجاح!', 'success');
    closeSettingsModal();
    return;
  }

  try {
    const res = await fetch('/api/auth/change-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });
    const data = await res.json();

    if (data.success) {
      showToast('تم تغيير كلمة المرور بنجاح!', 'success');
      closeSettingsModal();
    } else {
      showToast(data.error || 'فشل تحديث كلمة المرور', 'error');
    }
  } catch (err) {
    showToast('خطأ في الاتصال', 'error');
  }
});

// ==========================================
// 11. SETUP EVENT LISTENERS & UTILITIES
// ==========================================
function setupEventListeners() {
  document.getElementById('openCreateModalBtn').addEventListener('click', openCreateCardModal);
  document.getElementById('generateSlugBtn').addEventListener('click', generateRandomSlug);
  document.getElementById('openSettingsBtn').addEventListener('click', openSettingsModal);
  document.getElementById('openNfcGuideBtn').addEventListener('click', () => {
    openNfcWriterModal(cardsList[0]?.id || '');
  });

  document.querySelectorAll('input[name="formActionType"]').forEach(radio => {
    radio.addEventListener('change', (e) => setActionTypeUI(e.target.value));
  });

  document.getElementById('searchInput').addEventListener('input', renderCards);
  document.getElementById('statusFilter').addEventListener('change', renderCards);

  document.getElementById('logoutBtn').addEventListener('click', async () => {
    if (confirm('هل ترغب في تسجيل الخروج من لوحة التحكم؟')) {
      if (!isOfflineOrStatic) {
        await fetch('/api/auth/logout', { method: 'POST' });
      }
      window.location.href = './login.html';
    }
  });

  document.getElementById('themeToggleBtn').addEventListener('click', () => {
    const isDark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('nfc_theme', isDark ? 'dark' : 'light');
  });
}

function initTheme() {
  if (localStorage.getItem('nfc_theme') === 'light') {
    document.documentElement.classList.remove('dark');
  } else {
    document.documentElement.classList.add('dark');
  }
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  
  let bg = 'bg-slate-900 border-slate-700 text-slate-100';
  let icon = '<svg class="w-4 h-4 text-indigo-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path></svg>';
  
  if (type === 'success') {
    bg = 'bg-emerald-950/90 border-emerald-500/40 text-emerald-200';
    icon = '<svg class="w-4 h-4 text-emerald-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>';
  } else if (type === 'error') {
    bg = 'bg-red-950/90 border-red-500/40 text-red-200';
    icon = '<svg class="w-4 h-4 text-red-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path></svg>';
  }

  toast.className = `p-3.5 px-4 rounded-2xl border shadow-2xl backdrop-blur-md text-xs font-semibold flex items-center gap-2.5 toast-animate pointer-events-auto ${bg}`;
  toast.innerHTML = `${icon}<span>${message}</span>`;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    toast.style.transition = 'all 0.3s ease';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function getArabicRelativeTime(dateString) {
  if (!dateString) return 'لم تمسح بعد';
  const now = new Date();
  const past = new Date(dateString);
  const diffSec = Math.floor((now - past) / 1000);

  if (diffSec < 60) return 'منذ لحظات';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `منذ ${diffMin} دقيقة`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `منذ ${diffHours} ساعة`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 30) return `منذ ${diffDays} يوم`;
  return past.toLocaleDateString('ar-SA');
}

function formatArabicDate(dateString) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  return d.toLocaleString('ar-SA', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}
