const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const CARDS_SEED_FILE = path.join(DATA_DIR, 'cards.json');
const PUBLIC_CARDS_FILE = path.join(__dirname, 'public', 'data', 'cards.json');

// Production Auto URL Sanitizer Helper
function sanitizeUrl(rawUrl) {
  if (!rawUrl || typeof rawUrl !== 'string') return '';
  let url = rawUrl.trim();

  // Strip zero-width, non-breaking, and invisible characters
  url = url.replace(/[\u200B-\u200D\uFEFF\u00A0]/g, '').trim();
  if (!url) return '';

  // Zero-Trust Malicious Scheme Shield: Block javascript:, data:, vbscript:, file:, blob:, about:
  const lowerUrl = url.toLowerCase().replace(/[\s\r\n\t]+/g, '');
  if (/^(javascript|data|vbscript|file|blob|about):/i.test(lowerUrl)) {
    console.warn('[Security Shield] Blocked dangerous URL scheme:', rawUrl);
    return '';
  }

  // Check special protocols: tel, mailto, sms, whatsapp, tg, geo, intent, facetime, instagram
  if (/^(tel|mailto|sms|whatsapp|tg|geo|intent|facetime|instagram):/i.test(url)) {
    return url;
  }

  // Remove internal stray spaces or line breaks often caused by copy-pasting
  url = url.replace(/[\s\r\n\t]+/g, '');

  // wa.me shorthand
  if (/^wa\.me\//i.test(url)) {
    return 'https://' + url;
  }

  // If starts with http:// or https://
  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  // If protocol-relative (//example.com)
  if (url.startsWith('//')) {
    return 'https:' + url;
  }

  // Prepend https://
  return 'https://' + url;
}

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial real card loaded from data/cards.json
let seedCards = [];
try {
  if (fs.existsSync(CARDS_SEED_FILE)) {
    const rawCards = fs.readFileSync(CARDS_SEED_FILE, 'utf8');
    seedCards = JSON.parse(rawCards);
  }
} catch (e) {
  console.warn('Could not read cards.json:', e);
}

const initialData = {
  admin: {
    username: 'admin',
    // Default password is 'admin123'
    passwordHash: crypto.createHash('sha256').update('admin123').digest('hex'),
    createdAt: new Date().toISOString()
  },
  settings: {
    siteTitle: 'TapLink - شركة MUHAB',
    baseUrl: '',
    theme: 'dark'
  },
  cards: seedCards,
  scans: [] // 100% Real scans only, zero fake data
};

class Database {
  constructor() {
    this.load();
  }

  load() {
    try {
      if (!fs.existsSync(DB_FILE)) {
        this.data = JSON.parse(JSON.stringify(initialData));
        this.save();
      } else {
        const raw = fs.readFileSync(DB_FILE, 'utf8');
        this.data = JSON.parse(raw);
        // Ensure defaults
        if (!this.data.cards || this.data.cards.length === 0) {
          this.data.cards = seedCards;
        }
        if (Array.isArray(this.data.cards)) {
          this.data.cards.forEach(c => {
            if (!c.managePin) c.managePin = '1234';
            if (c.destinationUrl) c.destinationUrl = sanitizeUrl(c.destinationUrl);
          });
        }
        if (!this.data.scans) this.data.scans = [];
        if (!this.data.admin) this.data.admin = initialData.admin;
        if (!this.data.settings) this.data.settings = initialData.settings;
      }
    } catch (err) {
      console.error('Error loading DB, initializing default data:', err);
      this.data = JSON.parse(JSON.stringify(initialData));
      this.save();
    }
  }

  save() {
    try {
      const tempFile = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempFile, JSON.stringify(this.data, null, 2), 'utf8');
      fs.renameSync(tempFile, DB_FILE);

      // Keep data/cards.json and public/data/cards.json in sync as well
      try {
        fs.writeFileSync(CARDS_SEED_FILE, JSON.stringify(this.data.cards, null, 2), 'utf8');
        if (fs.existsSync(path.dirname(PUBLIC_CARDS_FILE))) {
          fs.writeFileSync(PUBLIC_CARDS_FILE, JSON.stringify(this.data.cards, null, 2), 'utf8');
        }
      } catch (errCards) {
        console.warn('Failed syncing data/cards.json:', errCards);
      }

      return true;
    } catch (err) {
      console.error('Error saving DB:', err);
      return false;
    }
  }

  // --- Auth & Admin Methods ---
  verifyAdmin(password) {
    const hash = crypto.createHash('sha256').update(password).digest('hex');
    return hash === this.data.admin.passwordHash;
  }

  updateAdminPassword(newPassword) {
    this.data.admin.passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex');
    this.data.admin.updatedAt = new Date().toISOString();
    return this.save();
  }

  // --- Card CRUD Operations ---
  getAllCards(search = '') {
    let cards = [...this.data.cards];
    if (search) {
      const term = search.toLowerCase();
      cards = cards.filter(c => 
        (c.title && c.title.toLowerCase().includes(term)) ||
        (c.slug && c.slug.toLowerCase().includes(term)) ||
        (c.destinationUrl && c.destinationUrl.toLowerCase().includes(term))
      );
    }
    return cards.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
  }

  getCardById(id) {
    return this.data.cards.find(c => c.id === id);
  }

  getCardBySlug(slug) {
    if (!slug) return null;
    return this.data.cards.find(c => c.slug.toLowerCase() === slug.toLowerCase());
  }

  createCard(cardData) {
    const cleanSlug = (cardData.slug || '').trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
    if (!cleanSlug) {
      throw new Error('المعرف الفريد (Slug) مطلوب ويجب أن يحتوي على أحرف إنجليزية وأرقام فقط');
    }

    if (this.getCardBySlug(cleanSlug)) {
      throw new Error('هذا المعرف الفريد (Slug) مستخدم بالفعل لبطاقة أخرى. اختر معرفاً مختلفاً');
    }

    const cleanDestUrl = sanitizeUrl(cardData.destinationUrl);
    const savedTargets = Array.isArray(cardData.savedTargets) ? cardData.savedTargets : [];
    if (cleanDestUrl && savedTargets.length === 0) {
      savedTargets.push({
        id: 't-' + crypto.randomUUID().slice(0, 6),
        label: 'الرابط الأساسي',
        url: cleanDestUrl,
        active: true,
        icon: '🔗'
      });
    }

    const mode = cardData.mode || (cardData.actionType === 'profile' ? 'profile' : (cardData.actionType === 'catalog' ? 'catalog' : 'direct'));

    const newCard = {
      id: 'card-' + crypto.randomUUID().slice(0, 8),
      title: (cardData.title || 'بطاقة NFC ذكية').trim(),
      slug: cleanSlug,
      mode: mode,
      actionType: mode,
      destinationUrl: cleanDestUrl,
      isActive: cardData.isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scanCount: 0,
      lastScannedAt: null,
      pinCode: (cardData.pinCode || '').trim(),
      managePin: (cardData.managePin !== undefined && String(cardData.managePin).trim().length > 0 ? String(cardData.managePin).trim() : '1234'),
      savedTargets: savedTargets.map(st => ({ ...st, url: sanitizeUrl(st.url) })),
      timeRouting: {
        enabled: Boolean(cardData.timeRouting?.enabled),
        morningUrl: sanitizeUrl(cardData.timeRouting?.morningUrl || ''),
        morningLabel: (cardData.timeRouting?.morningLabel || 'فترة الصباح').trim(),
        eveningUrl: sanitizeUrl(cardData.timeRouting?.eveningUrl || ''),
        eveningLabel: (cardData.timeRouting?.eveningLabel || 'فترة المساء').trim(),
        switchHour: Number(cardData.timeRouting?.switchHour) || 16
      },
      conditional: cardData.conditional || null,
      profile: mode === 'profile' ? (cardData.profile || {}) : null,
      catalog: mode === 'catalog' ? (cardData.catalog || {}) : null
    };

    this.data.cards.push(newCard);
    this.save();
    return newCard;
  }

  updateCard(id, updateData) {
    const index = this.data.cards.findIndex(c => c.id === id);
    if (index === -1) {
      throw new Error('البطاقة غير موجودة');
    }

    const currentCard = this.data.cards[index];

    if (updateData.slug && updateData.slug.toLowerCase() !== currentCard.slug.toLowerCase()) {
      const cleanSlug = updateData.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      const existing = this.getCardBySlug(cleanSlug);
      if (existing && existing.id !== id) {
        throw new Error('هذا المعرف الفريد (Slug) مستخدم بالفعل لبطاقة أخرى');
      }
      currentCard.slug = cleanSlug;
    }

    if (updateData.title !== undefined) currentCard.title = updateData.title.trim();
    if (updateData.mode !== undefined) {
      currentCard.mode = updateData.mode;
      currentCard.actionType = updateData.mode;
    } else if (updateData.actionType !== undefined) {
      currentCard.mode = updateData.actionType;
      currentCard.actionType = updateData.actionType;
    }
    if (updateData.destinationUrl !== undefined) currentCard.destinationUrl = sanitizeUrl(updateData.destinationUrl);
    if (updateData.isActive !== undefined) currentCard.isActive = Boolean(updateData.isActive);
    if (updateData.pinCode !== undefined) currentCard.pinCode = String(updateData.pinCode || '').trim();
    if (updateData.managePin !== undefined) currentCard.managePin = String(updateData.managePin || '').trim();
    if (updateData.timeRouting !== undefined) {
      currentCard.timeRouting = {
        enabled: Boolean(updateData.timeRouting?.enabled),
        morningUrl: sanitizeUrl(updateData.timeRouting?.morningUrl || ''),
        morningLabel: (updateData.timeRouting?.morningLabel || 'فترة الصباح').trim(),
        eveningUrl: sanitizeUrl(updateData.timeRouting?.eveningUrl || ''),
        eveningLabel: (updateData.timeRouting?.eveningLabel || 'فترة المساء').trim(),
        switchHour: Number(updateData.timeRouting?.switchHour) || 16
      };
    }
    if (updateData.conditional !== undefined) currentCard.conditional = updateData.conditional;
    if (updateData.savedTargets !== undefined && Array.isArray(updateData.savedTargets)) {
      currentCard.savedTargets = updateData.savedTargets.map(st => ({ ...st, url: sanitizeUrl(st.url) }));
    }
    if (updateData.profile !== undefined) currentCard.profile = updateData.profile;
    if (updateData.catalog !== undefined) currentCard.catalog = updateData.catalog;

    currentCard.updatedAt = new Date().toISOString();
    this.save();
    return currentCard;
  }

  quickUpdateUrl(id, destinationUrl) {
    const card = this.getCardById(id);
    if (!card) throw new Error('البطاقة غير موجودة');
    const cleanUrl = sanitizeUrl(destinationUrl);
    card.destinationUrl = cleanUrl;
    if (Array.isArray(card.savedTargets)) {
      const active = card.savedTargets.find(t => t.active);
      if (active) active.url = cleanUrl;
    }
    card.updatedAt = new Date().toISOString();
    this.save();
    return card;
  }

  verifyManagePin(slug, enteredPin) {
    const card = this.getCardBySlug(slug);
    if (!card) return false;
    const expectedPin = String(card.managePin || '1234').trim();
    return String(enteredPin || '').trim() === expectedPin;
  }

  updateDestinationByManagePin(slug, enteredPin, newDestinationUrl) {
    const card = this.getCardBySlug(slug);
    if (!card) throw new Error('البطاقة غير موجودة');

    const isValid = this.verifyManagePin(slug, enteredPin);
    if (!isValid) {
      throw new Error('رمز PIN الخاص بإدارة هذه البطاقة غير صحيح');
    }

    const cleanUrl = sanitizeUrl(newDestinationUrl);
    if (!cleanUrl) {
      throw new Error('الرابط الهدف مطلوب');
    }

    card.destinationUrl = cleanUrl;
    if (Array.isArray(card.savedTargets)) {
      const active = card.savedTargets.find(t => t.active);
      if (active) active.url = cleanUrl;
    }
    card.updatedAt = new Date().toISOString();
    this.save();
    return card;
  }

  switchTarget(cardId, targetId) {
    const card = this.getCardById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');
    if (!Array.isArray(card.savedTargets)) card.savedTargets = [];

    const target = card.savedTargets.find(t => t.id === targetId);
    if (!target) throw new Error('الرابط المحدد غير موجود في قائمة الروابط المحفوظة');

    card.savedTargets.forEach(t => {
      t.active = (t.id === targetId);
    });
    card.destinationUrl = target.url;
    card.updatedAt = new Date().toISOString();
    this.save();
    return { card, activeTarget: target };
  }

  addSavedTarget(cardId, label, url, icon = '🔗') {
    const card = this.getCardById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');
    if (!Array.isArray(card.savedTargets)) card.savedTargets = [];

    const newTarget = {
      id: 't-' + crypto.randomUUID().slice(0, 6),
      label: (label || 'رابط إضافي').trim(),
      url: sanitizeUrl(url),
      active: false,
      icon: icon
    };
    card.savedTargets.push(newTarget);
    card.updatedAt = new Date().toISOString();
    this.save();
    return { card, newTarget };
  }

  removeSavedTarget(cardId, targetId) {
    const card = this.getCardById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');
    if (!Array.isArray(card.savedTargets)) return card;

    card.savedTargets = card.savedTargets.filter(t => t.id !== targetId);
    card.updatedAt = new Date().toISOString();
    this.save();
    return card;
  }

  toggleCardStatus(id) {
    const card = this.getCardById(id);
    if (!card) throw new Error('البطاقة غير موجودة');
    card.isActive = !card.isActive;
    card.updatedAt = new Date().toISOString();
    this.save();
    return card;
  }

  deleteCard(id) {
    const index = this.data.cards.findIndex(c => c.id === id);
    if (index === -1) throw new Error('البطاقة غير موجودة');
    
    const deleted = this.data.cards.splice(index, 1)[0];
    this.data.scans = this.data.scans.filter(s => s.cardId !== id);
    this.save();
    return deleted;
  }

  // --- Real Scan Engine & Analytics ---
  recordScan(card, reqDetails = {}) {
    card.scanCount = (card.scanCount || 0) + 1;
    card.lastScannedAt = new Date().toISOString();

    const scanRecord = {
      id: 'scan-' + crypto.randomUUID().slice(0, 8),
      cardId: card.id,
      slug: card.slug,
      timestamp: card.lastScannedAt,
      deviceType: reqDetails.deviceType || 'Unknown',
      browser: reqDetails.browser || 'Unknown',
      referrer: reqDetails.referrer || 'Direct / NFC',
      ip: reqDetails.ip || 'Unknown'
    };

    this.data.scans.unshift(scanRecord);
    if (this.data.scans.length > 2000) {
      this.data.scans = this.data.scans.slice(0, 2000);
    }

    this.save();
    return scanRecord;
  }

  getDashboardStats() {
    const totalCards = this.data.cards.length;
    const activeCards = this.data.cards.filter(c => c.isActive).length;
    const inactiveCards = totalCards - activeCards;
    const totalScans = this.data.cards.reduce((sum, c) => sum + (c.scanCount || 0), 0);

    // Most active card (only if it has real scans)
    let topCard = null;
    if (totalCards > 0) {
      const sorted = [...this.data.cards].sort((a, b) => (b.scanCount || 0) - (a.scanCount || 0));
      if (sorted[0] && (sorted[0].scanCount || 0) > 0) {
        topCard = sorted[0];
      }
    }

    // Device breakdown from actual real scans
    const devices = {
      iPhone: 0,
      Android: 0,
      iPad: 0,
      Windows: 0,
      Mac: 0,
      Other: 0
    };

    this.data.scans.forEach(scan => {
      const dev = scan.deviceType;
      if (devices[dev] !== undefined) {
        devices[dev]++;
      } else {
        devices.Other++;
      }
    });

    const recentScans = this.data.scans.slice(0, 15).map(s => {
      const card = this.getCardById(s.cardId);
      return {
        ...s,
        cardTitle: card ? card.title : s.slug
      };
    });

    return {
      totalCards,
      activeCards,
      inactiveCards,
      totalScans,
      topCard: topCard ? {
        id: topCard.id,
        title: topCard.title,
        slug: topCard.slug,
        scanCount: topCard.scanCount || 0
      } : null,
      deviceStats: devices,
      recentScans
    };
  }

  getCardStats(cardId) {
    const card = this.getCardById(cardId);
    if (!card) return null;

    const cardScans = this.data.scans.filter(s => s.cardId === cardId);
    const devices = {};
    cardScans.forEach(s => {
      devices[s.deviceType] = (devices[s.deviceType] || 0) + 1;
    });

    return {
      cardId: card.id,
      title: card.title,
      slug: card.slug,
      scanCount: card.scanCount || 0,
      lastScannedAt: card.lastScannedAt,
      devices,
      recentScans: cardScans.slice(0, 20)
    };
  }

  // Backup & Restore
  exportBackup() {
    return {
      version: '3.0',
      exportedAt: new Date().toISOString(),
      cards: this.data.cards,
      scans: this.data.scans,
      settings: this.data.settings
    };
  }

  importBackup(backupData) {
    if (!backupData || !Array.isArray(backupData.cards)) {
      throw new Error('ملف النسخة الاحتياطية غير صالح أو تالف');
    }
    this.data.cards = backupData.cards;
    if (Array.isArray(backupData.scans)) {
      this.data.scans = backupData.scans;
    }
    if (backupData.settings) {
      this.data.settings = { ...this.data.settings, ...backupData.settings };
    }
    this.save();
    return {
      cardsCount: this.data.cards.length,
      scansCount: this.data.scans.length
    };
  }
}

const dbInstance = new Database();
dbInstance.sanitizeUrl = sanitizeUrl;
module.exports = dbInstance;
