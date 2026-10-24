const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const DATA_DIR = path.join(__dirname, 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Initial seed data if DB doesn't exist
const initialData = {
  admin: {
    username: 'admin',
    // Default password is 'admin123'
    passwordHash: crypto.createHash('sha256').update('admin123').digest('hex'),
    createdAt: new Date().toISOString()
  },
  settings: {
    siteTitle: 'Dynamic NFC Tag Manager',
    baseUrl: '', // If empty, will auto-detect from request host
    theme: 'system'
  },
  cards: [
    {
      id: 'card-sample-1',
      title: 'بطاقة تقييم جوجل ماب - المتجر الرئيسي',
      slug: 'review-store',
      actionType: 'direct', // 'direct' or 'profile'
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
          instagram: 'https://instagram.com',
          tiktok: '',
          snapchat: ''
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
  ],
  scans: [
    {
      id: 'scan-1',
      cardId: 'card-sample-1',
      slug: 'review-store',
      timestamp: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
      deviceType: 'iPhone',
      browser: 'Mobile Safari',
      ip: '127.0.0.1'
    },
    {
      id: 'scan-2',
      cardId: 'card-sample-1',
      slug: 'review-store',
      timestamp: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
      deviceType: 'Android',
      browser: 'Chrome Mobile',
      ip: '127.0.0.1'
    },
    {
      id: 'scan-3',
      cardId: 'card-sample-2',
      slug: 'ahmed-profile',
      timestamp: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      deviceType: 'iPhone',
      browser: 'Mobile Safari',
      ip: '127.0.0.1'
    }
  ]
};

// Safe JSON DB loader and saver
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
        if (!this.data.cards) this.data.cards = [];
        if (!this.data.scans) this.data.scans = [];
        if (!this.data.admin) this.data.admin = initialData.admin;
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
    // Sort newest first
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

    const newCard = {
      id: 'card-' + crypto.randomUUID().slice(0, 8),
      title: (cardData.title || 'بطاقة NFC ذكية').trim(),
      slug: cleanSlug,
      actionType: cardData.actionType === 'profile' ? 'profile' : 'direct',
      destinationUrl: (cardData.destinationUrl || '').trim(),
      isActive: cardData.isActive !== false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      scanCount: 0,
      lastScannedAt: null,
      profile: cardData.actionType === 'profile' ? (cardData.profile || {}) : null
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

    // Check slug collision if changing slug
    if (updateData.slug && updateData.slug.toLowerCase() !== currentCard.slug.toLowerCase()) {
      const cleanSlug = updateData.slug.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '-');
      const existing = this.getCardBySlug(cleanSlug);
      if (existing && existing.id !== id) {
        throw new Error('هذا المعرف الفريد (Slug) مستخدم بالفعل لبطاقة أخرى');
      }
      currentCard.slug = cleanSlug;
    }

    if (updateData.title !== undefined) currentCard.title = updateData.title.trim();
    if (updateData.actionType !== undefined) currentCard.actionType = updateData.actionType;
    if (updateData.destinationUrl !== undefined) currentCard.destinationUrl = updateData.destinationUrl.trim();
    if (updateData.isActive !== undefined) currentCard.isActive = Boolean(updateData.isActive);
    if (updateData.profile !== undefined) currentCard.profile = updateData.profile;

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
    
    // Remove card and its scan logs
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

    // Store up to last 1000 scan events for stats
    this.data.scans.unshift(scanRecord);
    if (this.data.scans.length > 1000) {
      this.data.scans = this.data.scans.slice(0, 1000);
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

    // Recent 10 scans
    const recentScans = this.data.scans.slice(0, 10).map(s => {
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
    
    // Device breakdown for this card
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
}

module.exports = new Database();
