const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');
const CARDS_SEED_FILE = path.join(DATA_DIR, 'cards.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed cards loaded from data/cards.json if available
let seedCards = [];
try {
  if (fs.existsSync(CARDS_SEED_FILE)) {
    const rawCards = fs.readFileSync(CARDS_SEED_FILE, 'utf8');
    seedCards = JSON.parse(rawCards);
  }
} catch (e) {
  console.warn('Could not read seed cards.json:', e);
}

// Generate realistic scan records for demo analytics
function generateSeedScans(cards) {
  const scans = [];
  const devices = ['iPhone', 'iPhone', 'Android', 'Android', 'iPhone', 'iPad', 'Windows', 'Android'];
  const browsers = ['Safari', 'Chrome', 'Samsung Internet', 'Safari', 'Chrome'];
  const now = Date.now();

  cards.forEach(card => {
    const count = card.scanCount || 5;
    for (let i = 0; i < Math.min(count, 30); i++) {
      const minutesAgo = Math.floor(Math.random() * 60 * 24 * 7); // within last 7 days
      const scanTime = new Date(now - minutesAgo * 60 * 1000).toISOString();
      scans.push({
        id: 'scan-' + crypto.randomUUID().slice(0, 8),
        cardId: card.id,
        slug: card.slug,
        timestamp: scanTime,
        deviceType: devices[Math.floor(Math.random() * devices.length)],
        browser: browsers[Math.floor(Math.random() * browsers.length)],
        referrer: 'NFC Tag Tap',
        ip: '192.168.1.' + Math.floor(Math.random() * 200 + 10)
      });
    }
  });

  return scans.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
}

const initialData = {
  admin: {
    username: 'admin',
    // Default password is 'admin123'
    passwordHash: crypto.createHash('sha256').update('admin123').digest('hex'),
    createdAt: new Date().toISOString()
  },
  settings: {
    siteTitle: 'Dynamic NFC Tag Manager PRO',
    baseUrl: '',
    theme: 'dark'
  },
  cards: seedCards,
  scans: generateSeedScans(seedCards)
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
        if (!this.data.cards || this.data.cards.length < seedCards.length) {
          this.data.cards = seedCards;
          this.data.scans = generateSeedScans(seedCards);
          this.save();
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

      // Keep data/cards.json in sync as well
      try {
        fs.writeFileSync(CARDS_SEED_FILE, JSON.stringify(this.data.cards, null, 2), 'utf8');
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

    const savedTargets = Array.isArray(cardData.savedTargets) ? cardData.savedTargets : [];
    if (cardData.destinationUrl && savedTargets.length === 0) {
      savedTargets.push({
        id: 't-' + crypto.randomUUID().slice(0, 6),
        label: 'الرابط الأساسي',
        url: cardData.destinationUrl.trim(),
        active: true,
        icon: '🔗'
      });
    }

    const mode = cardData.mode || (cardData.actionType === 'profile' ? 'profile' : 'direct');

    const newCard = {
      id: 'card-' + crypto.randomUUID().slice(0, 8),
      title: (cardData.title || 'بطاقة NFC ذكية').trim(),
      slug: cleanSlug,
      mode: mode,
      actionType: mode, // backward compatibility
      destinationUrl: (cardData.destinationUrl || '').trim(),
      isActive: cardData.isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scanCount: 0,
      lastScannedAt: null,
      pinCode: (cardData.pinCode || '').trim(),
      savedTargets: savedTargets,
      timeRouting: {
        enabled: Boolean(cardData.timeRouting?.enabled),
        morningUrl: (cardData.timeRouting?.morningUrl || '').trim(),
        morningLabel: (cardData.timeRouting?.morningLabel || 'فترة الصباح').trim(),
        eveningUrl: (cardData.timeRouting?.eveningUrl || '').trim(),
        eveningLabel: (cardData.timeRouting?.eveningLabel || 'فترة المساء').trim(),
        switchHour: Number(cardData.timeRouting?.switchHour) || 16
      },
      conditional: cardData.conditional || {
        type: cardData.timeRouting?.enabled ? 'time' : (cardData.pinCode ? 'pin' : 'none'),
        time: cardData.timeRouting || {},
        device: cardData.conditional?.device || {}
      },
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

    // Check slug collision
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
    if (updateData.destinationUrl !== undefined) currentCard.destinationUrl = updateData.destinationUrl.trim();
    if (updateData.isActive !== undefined) currentCard.isActive = Boolean(updateData.isActive);
    if (updateData.pinCode !== undefined) currentCard.pinCode = String(updateData.pinCode || '').trim();
    if (updateData.timeRouting !== undefined) {
      currentCard.timeRouting = {
        enabled: Boolean(updateData.timeRouting?.enabled),
        morningUrl: (updateData.timeRouting?.morningUrl || '').trim(),
        morningLabel: (updateData.timeRouting?.morningLabel || 'فترة الصباح').trim(),
        eveningUrl: (updateData.timeRouting?.eveningUrl || '').trim(),
        eveningLabel: (updateData.timeRouting?.eveningLabel || 'فترة المساء').trim(),
        switchHour: Number(updateData.timeRouting?.switchHour) || 16
      };
    }
    if (updateData.conditional !== undefined) {
      currentCard.conditional = updateData.conditional;
    }
    if (updateData.savedTargets !== undefined && Array.isArray(updateData.savedTargets)) {
      currentCard.savedTargets = updateData.savedTargets;
    }
    if (updateData.profile !== undefined) currentCard.profile = updateData.profile;
    if (updateData.catalog !== undefined) currentCard.catalog = updateData.catalog;

    currentCard.updatedAt = new Date().toISOString();
    this.save();
    return currentCard;
  }

  // Quick 1-click update for destination URL
  quickUpdateUrl(id, destinationUrl) {
    const card = this.getCardById(id);
    if (!card) throw new Error('البطاقة غير موجودة');
    card.destinationUrl = destinationUrl.trim();
    card.updatedAt = new Date().toISOString();
    this.save();
    return card;
  }

  // Switch active target from saved targets
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

  // Add a new saved target
  addSavedTarget(cardId, label, url, icon = '🔗') {
    const card = this.getCardById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');
    if (!Array.isArray(card.savedTargets)) card.savedTargets = [];

    const newTarget = {
      id: 't-' + crypto.randomUUID().slice(0, 6),
      label: (label || 'رابط إضافي').trim(),
      url: (url || '').trim(),
      active: false,
      icon: icon
    };
    card.savedTargets.push(newTarget);
    card.updatedAt = new Date().toISOString();
    this.save();
    return { card, newTarget };
  }

  // Remove a saved target
  removeSavedTarget(cardId, targetId) {
    const card = this.getCardById(cardId);
    if (!card) throw new Error('البطاقة غير موجودة');
    if (!Array.isArray(card.savedTargets)) return card;

    card.savedTargets = card.savedTargets.filter(t => t.id !== targetId);
    card.updatedAt = new Date().toISOString();
    this.save();
    return card;
  }

  // Quick toggle active status
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

  // --- Scan Engine & Analytics ---
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

    // Most active card
    let topCard = null;
    if (totalCards > 0) {
      topCard = [...this.data.cards].sort((a, b) => (b.scanCount || 0) - (a.scanCount || 0))[0];
    }

    // Device breakdown
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

    // Scans in last 7 days breakdown
    const dailyScans = {};
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split('T')[0];
      dailyScans[key] = 0;
    }

    this.data.scans.forEach(scan => {
      const scanDate = scan.timestamp ? scan.timestamp.split('T')[0] : '';
      if (dailyScans[scanDate] !== undefined) {
        dailyScans[scanDate]++;
      }
    });

    // Recent 15 scans
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
      dailyScans,
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

module.exports = new Database();
