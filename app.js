/**
 * Dynamic NFC Tag Manager - Universal Frontend Engine
 * Hybrid Architecture: Works both with Node.js Express Backend AND Static GitHub Pages (LocalStorage fallback)
 * Full Mobile-First Responsive UI & Fast Touch Interactions
 */

// Application State
let cardsList = [];
let baseUrl = window.location.origin + window.location.pathname.replace(/\/index\.html$/, '').replace(/\/$/, '');
let currentActiveCardForQr = null;
let currentActiveCardForNfc = null;
let isOfflineOrStatic = false; // Set to true if running on GitHub Pages / static host

// Default seed data for offline / GitHub Pages demo mode
const SEED_CARDS = [
  {
    id: 'card-sample-1',
    title: 'بطاقة تقييم جوجل ماب - المتجر الرئيسي',
    slug: 'review-store',
    actionType: 'direct',
    destinationUrl: 'https://maps.google.com/?q=Riyadh+Saudi+Arabia',
    isActive: true,
    createdAt: new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    scanCount: 142,
    lastScannedAt: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    profile: null
  },
  {
    id: 'card-sample-2',
    title: 'بطاقة الأعمال الذكية - مدير التطوير',
    slug: 'ahmed-profile',
    actionType: 'profile',
    destinationUrl: '',
    isActive: true,
    createdAt: new Date(Date.now() - 14 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    scanCount: 89,
    lastScannedAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
    profile: {
      fullName: 'م. أحمد خالد الشهري',
      jobTitle: 'مدير تطوير الأعمال والتقنية',
      company: 'شركة الآفاق الذكية للتقنية',
      bio: 'متخصص في حلول التحول الرقمي وإنترنت الأشياء (IoT) والأنظمة السحابية المتكاملة.',
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
      phone: '+966551234567',
      whatsapp: '+966551234567',
      email: 'ahmed.khalid@example.com',
      website: 'https://example.com',
      location: 'الرياض، المملكة العربية السعودية',
      socials: {
        twitter: 'https://x.com',
        linkedin: 'https://linkedin.com',
        instagram: 'https://instagram.com'
      },
      customLinks: [
        { title: 'كتالوج الخدمات والعروض 2026', url: 'https://example.com/catalog', icon: 'file' },
        { title: 'احجز موعد استشارة تقنية', url: 'https://calendly.com', icon: 'calendar' }
      ]
    }
  },
  {
    id: 'card-sample-3',
    title: 'منيو المطعم الرقمي - الفرع الجديد',
    slug: 'menu-cafe',
    actionType: 'direct',
    destinationUrl: 'https://example.com/menu.pdf',
    isActive: false,
    createdAt: new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString(),
    updatedAt: new Date().toISOString(),
    scanCount: 310,
    lastScannedAt: new Date(Date.now() - 48 * 3600 * 1000).toISOString(),
    profile: null
  }
];

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  checkAuthAndLoad();
  setupEventListeners();
});

// ==========================================
// 1. AUTH & DATA LOADING (WITH AUTO FALLBACK)
// ==========================================
async function checkAuthAndLoad() {
  try {
    const res = await fetch('/api/auth/check');
    if (!res.ok && res.status !== 401) {
      throw new Error('Static environment detected');
    }

    const data = await res.json();
    if (!data.authenticated) {
      if (window.location.hostname.includes('github.io')) {
        enableStaticStorageMode();
      } else {
        window.location.href = '/login.html';
        return;
      }
    }

    await Promise.all([loadStats(), loadCards()]);
  } catch (err) {
    console.info('Switching to LocalStorage offline/static engine for GitHub Pages preview.');
    enableStaticStorageMode();
  }
}

function enableStaticStorageMode() {
  isOfflineOrStatic = true;
  if (!localStorage.getItem('nfc_cards_db')) {
    localStorage.setItem('nfc_cards_db', JSON.stringify(SEED_CARDS));
  }
  loadLocalStats();
  loadLocalCards();
  showToast('يعمل التطبيق الآن في وضع المعاينة المباشر السريع 📱', 'info');
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
    topCard: topCard ? { title: topCard.title, scanCount: topCard.scanCount || 0 } : null
  });
}

function applyStatsToUI(s) {
  document.getElementById('statTotalCards').textContent = s.totalCards;
  document.getElementById('statTotalScans').textContent = s.totalScans;
  document.getElementById('statActiveCards').textContent = s.activeCards;

  if (s.topCard) {
    document.getElementById('statTopCardTitle').textContent = s.topCard.title;
    document.getElementById('statTopCardScans').textContent = `${s.topCard.scanCount} مسحة`;
  } else {
    document.getElementById('statTopCardTitle').textContent = 'لا توجد بيانات بعد';
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
    return raw ? JSON.parse(raw) : SEED_CARDS;
  } catch (e) {
    return SEED_CARDS;
  }
}

function saveLocalCards(cards) {
  localStorage.setItem('nfc_cards_db', JSON.stringify(cards));
}

// ==========================================
// 2. RENDERING CARDS (MOBILE OPTIMIZED)
// ==========================================
function renderCards() {
  const grid = document.getElementById('cardsGrid');
  const empty = document.getElementById('cardsEmptyState');
  const search = (document.getElementById('searchInput').value || '').trim().toLowerCase();
  const filter = document.getElementById('statusFilter').value;

  grid.innerHTML = '';

  const filtered = cardsList.filter(card => {
    const matchSearch = 
      card.title.toLowerCase().includes(search) ||
      card.slug.toLowerCase().includes(search) ||
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
  el.className = `bg-slate-900/85 border ${card.isActive ? 'border-slate-800' : 'border-amber-500/25 bg-amber-950/10'} rounded-3xl p-4 sm:p-6 shadow-xl transition-all glow-on-hover flex flex-col justify-between relative overflow-hidden`;

  let fullFixedUrl = card.fixedUrl;
  if (!fullFixedUrl) {
    if (isOfflineOrStatic) {
      fullFixedUrl = `${baseUrl}/landing.html?slug=${card.slug}`;
    } else {
      fullFixedUrl = `${baseUrl}/c/${card.slug}`;
    }
  }

  const relativeTime = getArabicRelativeTime(card.lastScannedAt);

  el.innerHTML = `
    <div>
      <!-- Top Row: Status badge & Toggle & Type -->
      <div class="flex items-center justify-between gap-2 mb-3">
        <div class="flex items-center gap-1.5 sm:gap-2">
          <span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold ${
            card.isActive 
              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' 
              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
          }">
            <span class="w-1.5 h-1.5 rounded-full ${card.isActive ? 'bg-emerald-400 status-active-pulse' : 'bg-amber-400'}"></span>
            ${card.isActive ? 'نشطة' : 'متوقفة مؤقتاً'}
          </span>

          <span class="text-[10px] px-2 py-0.5 rounded-md font-medium ${
            card.actionType === 'profile' 
              ? 'bg-purple-500/10 text-purple-300 border border-purple-500/20' 
              : 'bg-indigo-500/10 text-indigo-300 border border-indigo-500/20'
          }">
            ${card.actionType === 'profile' ? 'ملف شخصي' : 'تحويل مباشر'}
          </span>
        </div>

        <!-- Quick Toggle Active Switch -->
        <button onclick="toggleCardStatus('${card.id}')" title="${card.isActive ? 'تعطيل البطاقة مؤقتاً' : 'تفعيل البطاقة'}" class="p-1 rounded-lg text-slate-400 hover:text-white transition-colors">
          <div class="w-8 h-4.5 bg-slate-800 border border-slate-700 rounded-full relative ${card.isActive ? 'bg-emerald-600/30 border-emerald-500/50' : ''}">
            <div class="w-3.5 h-3.5 rounded-full transition-transform ${card.isActive ? 'bg-emerald-400 -translate-x-3.5 rtl:translate-x-3.5' : 'bg-slate-400 translate-x-0'} top-0.5 relative"></div>
          </div>
        </button>
      </div>

      <!-- Card Title & Permanent Link -->
      <h3 class="text-base font-bold text-white mb-1.5 leading-snug truncate" title="${card.title}">${card.title}</h3>
      
      <div class="flex items-center gap-2 bg-slate-800/70 border border-slate-750 p-2 sm:p-2.5 rounded-xl mb-3.5 font-mono text-[11px] sm:text-xs text-indigo-300">
        <span class="text-slate-400 text-[10px] shrink-0 select-none">رابط NFC:</span>
        <a href="${fullFixedUrl}" target="_blank" class="truncate hover:underline text-indigo-300 flex-1" title="معاينة الرابط">${fullFixedUrl}</a>
      </div>

      <!-- Inline Quick Destination URL Editor -->
      ${card.actionType === 'direct' ? `
        <div class="mb-3.5 bg-slate-800/40 p-2.5 sm:p-3 rounded-2xl border border-slate-750">
          <label class="block text-[11px] font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
            <span>الرابط الهدف الحالي (Destination URL):</span>
            <span class="text-[10px] text-indigo-400">تعديل فوري</span>
          </label>
          <div class="flex items-center gap-2">
            <input 
              type="url" 
              id="inlineUrl-${card.id}" 
              value="${card.destinationUrl || ''}" 
              placeholder="https://..." 
              class="w-full bg-slate-800 border border-slate-700 text-white text-xs rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
            <button 
              onclick="saveQuickUrl('${card.id}')" 
              id="btnSaveQuick-${card.id}" 
              title="حفظ الرابط الجديد فوراً"
              class="px-3.5 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:scale-95 text-white text-xs font-semibold rounded-xl transition-all shrink-0 flex items-center gap-1 min-h-[38px]"
            >
              <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path></svg>
              <span>حفظ</span>
            </button>
          </div>
        </div>
      ` : `
        <div class="mb-3.5 bg-purple-950/20 border border-purple-500/20 p-2.5 sm:p-3 rounded-2xl flex items-center justify-between text-xs">
          <div class="flex items-center gap-2 text-purple-300 truncate">
            <svg class="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path></svg>
            <span class="truncate">الملف: ${card.profile?.fullName || 'غير محدد'}</span>
          </div>
          <a href="${fullFixedUrl}" target="_blank" class="text-[11px] text-purple-400 hover:underline shrink-0 font-medium">معاينة</a>
        </div>
      `}

      <!-- Scan Statistics summary for this card -->
      <div class="flex items-center justify-between text-xs py-2 px-3 bg-slate-800/40 rounded-xl mb-3.5 border border-slate-800">
        <div class="flex items-center gap-1.5 text-slate-300">
          <svg class="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"></path><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"></path></svg>
          <span class="font-bold text-white">${card.scanCount || 0}</span>
          <span class="text-slate-400 text-[11px]">مسحة</span>
        </div>
        <div class="text-[11px] text-slate-400">
          ${card.lastScannedAt ? `آخر مسح: ${relativeTime}` : 'لم تمسح بعد'}
        </div>
      </div>
    </div>

    <!-- Action Buttons Row -->
    <div class="pt-3.5 border-t border-slate-800/80 space-y-2">
      <div class="grid grid-cols-3 gap-2">
        <button 
          onclick="copyFixedUrl('${fullFixedUrl}')" 
          class="py-2.5 px-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1 active:scale-95"
          title="نسخ الرابط الدائم لوضعه في الشريحة"
        >
          <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3"></path></svg>
          <span>نسخ الرابط</span>
        </button>

        <button 
          onclick="openQrModal('${card.id}')" 
          class="py-2.5 px-2 bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-medium rounded-xl border border-slate-700 transition-all flex items-center justify-center gap-1 active:scale-95"
          title="توليد وتحميل رمز QR للبطاقة"
        >
          <svg class="w-3.5 h-3.5 text-sky-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z"></path></svg>
          <span>رمز QR</span>
        </button>

        <button 
          onclick="openNfcWriterModal('${card.id}')" 
          class="py-2.5 px-2 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 text-xs font-medium rounded-xl border border-indigo-500/30 transition-all flex items-center justify-center gap-1 active:scale-95"
          title="برمجة شريحة الـ NFC مباشرة عبر الهاتف"
        >
          <svg class="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 008 11a4 4 0 118 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0015.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 004.07 7.07M16 12a4 4 0 11-8 0 4 4 0 018 0z"></path></svg>
          <span>برمجة NFC</span>
        </button>
      </div>

      <div class="flex items-center justify-between pt-1">
        <button 
          onclick="openAnalyticsModal('${card.id}')" 
          class="text-xs text-slate-400 hover:text-indigo-400 flex items-center gap-1 transition-colors py-1"
        >
          <svg class="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z"></path></svg>
          <span>سجل المسح</span>
        </button>

        <div class="flex items-center gap-3">
          <button 
            onclick="editCardModal('${card.id}')" 
            class="text-xs text-slate-400 hover:text-white transition-colors py-1"
          >
            تعديل شامل
          </button>
          <button 
            onclick="confirmDeleteCard('${card.id}', '${card.title.replace(/'/g, "\\'")}')" 
            class="text-xs text-red-400 hover:text-red-300 transition-colors py-1"
          >
            حذف
          </button>
        </div>
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
    showToast('يرجى إدخال الرابط الهدف', 'error');
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
      showToast('تم تحديث الرابط الهدف فوراً بنجاح! ⚡', 'success');
      btn.innerHTML = originalContent;
      btn.disabled = false;
    }, 200);
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
  if (navigator.vibrate) navigator.vibrate(50);
  try {
    await navigator.clipboard.writeText(url);
    showToast('تم نسخ الرابط الثابت بنجاح! ضعه الآن في تطبيق الـ NFC 📋', 'success');
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

  let fullUrl = card.fixedUrl;
  if (!fullUrl) {
    if (isOfflineOrStatic) {
      fullUrl = `${baseUrl}/landing.html?slug=${card.slug}`;
    } else {
      fullUrl = `${baseUrl}/c/${card.slug}`;
    }
  }

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
  const win = window.open('', '_blank');
  win.document.write(`
    <html dir="rtl">
    <head><title>طباعة رمز الاستجابة السريعة</title></head>
    <body style="text-align: center; font-family: sans-serif; padding: 40px;">
      <h2>${currentActiveCardForQr ? currentActiveCardForQr.title : 'رمز QR'}</h2>
      <img src="${imgUrl}" style="width: 250px; height: 250px; margin: 20px auto; border: 1px solid #ccc; padding: 10px; border-radius: 12px;">
      <p style="font-size: 14px; color: #666;">${currentActiveCardForQr ? (currentActiveCardForQr.fixedUrl || currentActiveCardForQr.slug) : ''}</p>
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
    const urlToWrite = currentActiveCardForNfc.fixedUrl || `${baseUrl}/c/${currentActiveCardForNfc.slug}`;

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
    document.getElementById('statDeviceIphone').textContent = Math.round(card.scanCount * 0.65) || 0;
    document.getElementById('statDeviceAndroid').textContent = Math.round(card.scanCount * 0.3) || 0;
    document.getElementById('statDeviceOther').textContent = Math.round(card.scanCount * 0.05) || 0;
    tableBody.innerHTML = `
      <tr class="hover:bg-slate-800/50 transition-colors">
        <td class="py-2.5 px-3">منذ 15 دقيقة</td>
        <td class="py-2.5 px-3 font-medium text-white">iPhone 15 Pro</td>
        <td class="py-2.5 px-3 text-slate-400">Safari Mobile</td>
      </tr>
      <tr class="hover:bg-slate-800/50 transition-colors">
        <td class="py-2.5 px-3">منذ 40 دقيقة</td>
        <td class="py-2.5 px-3 font-medium text-white">Samsung Galaxy S24</td>
        <td class="py-2.5 px-3 text-slate-400">Chrome Mobile</td>
      </tr>
    `;
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
  if (!confirm(`هل أنت متأكد من رغبتك في حذف البطاقة "${title}"؟\nلن تتمكن من استرجاعها وستتوقف الشريحة المربوطة بها.`)) {
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
      window.location.href = '/login.html';
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
  if (!dateString) return 'لم يمسح بعد';
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
