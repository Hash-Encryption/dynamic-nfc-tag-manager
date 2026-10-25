/**
 * TapLink Internationalization (i18n) Engine
 * Full Bilingual Support: Arabic (RTL) & English (LTR)
 * TapLink by MUHAB
 */

const I18N = {
  currentLang: localStorage.getItem('taplink_lang') || 'ar',

  locales: {
    ar: {
      // Brand & Metadata
      app_title: "TapLink | إدارة بطاقات NFC الذكية - شركة MUHAB",
      brand_name: "TapLink",
      brand_sub: "شركة MUHAB",
      cloud_status_connected: "🟢 متصل بالسحابة - فوري لكل الهواتف",
      cloud_status_syncing: "🟡 جاري المزامنة مع السحابة...",
      cloud_status_offline: "⚪ وضع غير متصل / ذاكرة محلية",

      // Header Actions
      search_placeholder: "ابحث بالاسم، المعرف slug، أو الرابط الهدف...",
      btn_search: "بحث سريع",
      btn_theme: "تبديل المظهر",
      btn_lock: "قفل لوحة التحكم",
      lang_switch_label: "English",
      lang_switch_tooltip: "Switch to English",

      // Top Stats Cards
      stat_total_cards: "إجمالي البطاقات",
      stat_active_cards: "البطاقات النشطة",
      stat_total_scans: "إجمالي المسحات",
      stat_top_device: "الجهاز الأكثر استخداماً",
      stat_top_card: "البطاقة الأكثر نشاطاً",
      stat_awaiting_scans: "بانتظار أول مسحة",
      stat_active_ratio: "بطاقة فعالة ومربوطة",
      stat_all_phones: "لكافة بطاقات المنظومة",
      scans_count_suffix: "مسحة",

      // Bottom Navigation
      nav_home: "الرئيسية",
      nav_cards: "بطاقاتي",
      nav_stats: "الإحصائيات",
      nav_settings: "الإعدادات",
      nav_add_quick: "إضافة بطاقة",

      // Section Headings & Filters
      section_cards_title: "البطاقات والروابط الذكية",
      section_cards_subtitle: "إدارة وتعديل الوجهات الفورية لشرائح الـ NFC",
      filter_all: "الكل",
      filter_active: "النشطة فقط",
      filter_direct: "تحويل مباشر",
      filter_profile: "ملف تعريفي",
      filter_catalog: "منيو وكتالوج",
      btn_add_card: "+ إضافة بطاقة NFC جديدة",

      // Card Item Elements
      card_brand_badge: "TapLink • MUHAB",
      card_nfc_verified: "NFC موثق",
      card_status_active: "نشطة",
      card_status_paused: "متوقفة",
      card_mode_direct: "تحويل مباشر",
      card_mode_profile: "ملف شخصي",
      card_mode_catalog: "منيو وكتالوج",
      card_pin_protected: "محمية برمز PIN",
      card_target_label: "الرابط الهدف الحالي (Destination URL):",
      card_target_placeholder: "https://maps.google.com/...",
      btn_quick_save: "حفظ",
      btn_copy_link: "نسخ الرابط",
      btn_program_nfc: "برمجة NFC",
      btn_test_sim: "تجربة",
      btn_edit: "تعديل",
      btn_duplicate: "تكرار",
      btn_delete: "حذف",
      card_last_scan: "آخر مسحة:",
      card_never_scanned: "لم تُمسح بعد",
      empty_cards_title: "لا توجد بطاقات مسجلة بعد",
      empty_cards_desc: "ابدأ بإضافة بطاقتك الأولى لتوليد رابط وبرمجته داخل شريحة الـ NFC.",
      empty_cards_btn: "+ إضافة بطاقة جديدة الآن",

      // Add / Edit Modal Drawer
      drawer_add_title: "إضافة بطاقة NFC ذكية جديدة",
      drawer_edit_title: "تعديل البطاقة الذكية",
      drawer_subtitle: "قم بتهيئة رابط الشريحة والوجهة الهدف للتحويل التلقائي",
      label_card_title: "اسم البطاقة / التسمية التوضيحية *",
      placeholder_card_title: "مثال: بطاقة تقييم جوجل، بطاقة العمل الشخصية...",
      label_card_slug: "معرّف الرابط الثابت (Slug) *",
      placeholder_card_slug: "card-myname",
      btn_random_slug: "عشوائي",
      slug_hint: "هذا الرابط يُنسخ ويُبرمج داخل الشريحة مرة واحدة فقط، ولن يتغير أبداً.",
      label_action_type: "نوع الإجراء عند مسح الشريحة *",
      action_direct_title: "تحويل مباشر لرابط خارجي",
      action_direct_desc: "يحوّل المتصفح فوراً في أجزاء من الثانية إلى خرائط جوجل، واتساب، موقع إلكتروني، إلخ.",
      action_profile_title: "صفحة ملف تعريفي رقمي (Digital vCard)",
      action_profile_desc: "يعرض صفحة شخصية فخمة مع إمكانية حفظ جهة الاتصال برقمك وإيميلك في جوال العميل بضغطة واحدة.",
      action_catalog_title: "كتالوج أعمال، منيو، وروابط تواصل",
      action_catalog_desc: "يعرض قائمة بمنتجاتك وخدماتك مع زر مباشر لتقييم جوجل 5 نجوم ونسخ كلمة سر الواي فاي.",
      label_destination_url: "الرابط الهدف (Destination URL) *",
      placeholder_destination_url: "https://maps.google.com/ أو رابط متجرك...",
      label_security_pin: "حماية برمز PIN سري (اختياري)",
      placeholder_security_pin: "اتركه فارغاً للتحويل الفوري بدون كلمة سر",
      pin_hint: "إذا تم تعيين رمز PIN، سيُطلب من العميل إدخاله قبل التحويل للرابط.",
      label_card_status: "حالة البطاقة",
      status_active_label: "نشطة (تعمل وتوجه مباشرة عند المسح)",
      status_paused_label: "متوقفة مؤقتاً (تعرض شاشة تنبيه بأنها غير متاحة)",
      btn_cancel: "إلغاء",
      btn_save_card: "حفظ وتفعيل البطاقة",

      // Web NFC & QR Programming Modal
      modal_nfc_title: "برمجة شريحة الـ NFC والـ QR",
      modal_nfc_subtitle: "انسخ هذا الرابط الثابت أو اكتبه مباشرة على الشريحة بهاتفك",
      label_fixed_url: "الرابط الثابت للبرمجة (Fixed URL):",
      btn_copy: "نسخ",
      btn_write_web_nfc: "كتابة مباشرة على الشريحة الآن (Web NFC)",
      note_web_nfc: "مدعوم مباشرة على متصفح Chrome لأجهزة الأندرويد",

      // Simulator Modal
      sim_modal_title: "محاكي فحص مسح الشريحة الذكية",
      sim_modal_subtitle: "اختبر تجربة العميل الفعلية كما تظهر على شاشة الهاتف",
      sim_tap_instruction: "مرّر شريحة الـ NFC على ظهر الهاتف الافتراضي",
      sim_btn_tap: "📡 اضغط لمحاكاة المسح الآن",
      sim_open_target: "فتح الوجهة المستهدفة",

      // Settings Tab
      settings_tab_title: "إعدادات المنظومة والمزامنة السحابية",
      settings_lang_title: "لغة واجهة النظام (Interface Language)",
      settings_lang_desc: "اختر اللغة المفضلة لعرض لوحة التحكم بالكامل",
      settings_lang_ar: "العربية (RTL) - الافتراضية",
      settings_lang_en: "English (LTR) - الإنجليزية",
      settings_pass_title: "تغيير كلمة مرور المدير (Master Password)",
      settings_pass_desc: "لحماية لوحة التحكم من أي تعديل غير مصرح به",
      label_curr_pass: "كلمة المرور الحالية",
      label_new_pass: "كلمة المرور الجديدة",
      btn_update_pass: "تحديث كلمة المرور",
      settings_cloud_title: "نقطة المزامنة السحابية (Real-Time Cloud Endpoint)",
      settings_cloud_desc: "مزامنة التعديلات سحابياً لتعمل فوراً على كل بطاقات وهواتف العملاء",
      btn_save_cloud: "حفظ إعدادات السحابة",
      settings_backup_title: "النسخ الاحتياطي واستعادة البيانات",
      btn_export_json: "تصدير نسخة احتياطية (JSON)",
      btn_import_json: "استيراد بيانات (JSON)",

      // Security Lock Screen
      lock_title: "TapLink | حماية لوحة التحكم",
      lock_sub: "المنظومة التابعة لشركة MUHAB",
      lock_prompt: "أدخل كلمة المرور للمتابعة",
      lock_placeholder: "أدخل كلمة المرور (الافتراضية: admin123)",
      lock_remember_me: "تذكرني على هذا الجهاز (Remember Me)",
      btn_unlock: "فتح لوحة التحكم 🔓",
      lock_error: "كلمة المرور غير صحيحة، حاول مجدداً",
      lock_footer: "منظومة TapLink الذكية © 2026 - شركة MUHAB",

      // Toast Notifications
      toast_copied: "تم النسخ إلى الحافظة بنجاح! 📋",
      toast_saved: "تم حفظ وتفعيل البطاقة بنجاح! ✨",
      toast_updated: "تم تحديث رابط الوجهة الهدف بنجاح! 🚀",
      toast_deleted: "تم حذف البطاقة بنجاح! 🗑️",
      toast_cloud_synced: "تمت المزامنة السحابية الفورية 🟢",
      toast_pass_changed: "تم تحديث كلمة المرور بنجاح ✓",
      toast_invalid_pass: "يرجى التأكد من صحة كلمة المرور",
      toast_nfc_writing: "قرب شريحة NFC الآن من ظهر الجوال...",
      toast_nfc_success: "تمت كتابة الرابط على شريحة NFC بنجاح! 🎉",
      toast_nfc_error: "تعذرت كتابة NFC أو تم إلغاء العملية",

      // Unregistered / Redirect Screen
      red_scanned_title: "تم مسح الشريحة الذكية 📡",
      red_redirecting: "جاري التحويل للوجهة...",
      red_pin_title: "رابط محمي برمز PIN",
      red_pin_prompt: "أدخل رمز الحماية السري للمتابعة إلى الوجهة",
      red_pin_btn: "فتح الرابط السري 🔓",
      red_not_found_badge: "بطاقة NFC جديدة تحتاج تفعيل",
      red_not_found_title: "هذه الشريحة غير مربوطة برابط بعد",
      red_slug_label: "معرف الشريحة:",
      red_assign_prompt: "إذا كنت صاحب هذه الشريحة، يمكنك تعيين رابط الوجهة الهدف فوراً:",
      red_target_label: "الرابط الهدف (Target Destination URL):",
      red_save_btn: "حفظ وتفعيل التحويل فوراً 🚀",
      red_back_dashboard: "الدخول إلى لوحة التحكم الرئيسية (TapLink)"
    },

    en: {
      // Brand & Metadata
      app_title: "TapLink | Smart NFC Tags & Dynamic Links Manager - MUHAB",
      brand_name: "TapLink",
      brand_sub: "by MUHAB",
      cloud_status_connected: "🟢 Cloud Synced - Instant on all phones",
      cloud_status_syncing: "🟡 Syncing with cloud...",
      cloud_status_offline: "⚪ Offline Mode / Local Storage",

      // Header Actions
      search_placeholder: "Search by tag name, slug, or destination URL...",
      btn_search: "Quick Search",
      btn_theme: "Toggle Theme",
      btn_lock: "Lock Dashboard",
      lang_switch_label: "العربية",
      lang_switch_tooltip: "التبديل إلى العربية",

      // Top Stats Cards
      stat_total_cards: "Total NFC Tags",
      stat_active_cards: "Active Tags",
      stat_total_scans: "Total Scans",
      stat_top_device: "Top Device",
      stat_top_card: "Top Performing Tag",
      stat_awaiting_scans: "Awaiting first tap",
      stat_active_ratio: "active & linked tags",
      stat_all_phones: "Across all system tags",
      scans_count_suffix: "scans",

      // Bottom Navigation
      nav_home: "Home",
      nav_cards: "My Tags",
      nav_stats: "Analytics",
      nav_settings: "Settings",
      nav_add_quick: "Add Tag",

      // Section Headings & Filters
      section_cards_title: "Smart Tags & Dynamic Links",
      section_cards_subtitle: "Manage and configure instant redirect destinations for your NFC chips",
      filter_all: "All",
      filter_active: "Active Only",
      filter_direct: "Direct URL",
      filter_profile: "Digital Profile",
      filter_catalog: "Menu & Catalog",
      btn_add_card: "+ Add New NFC Tag",

      // Card Item Elements
      card_brand_badge: "TapLink • MUHAB",
      card_nfc_verified: "NFC Verified",
      card_status_active: "Active",
      card_status_paused: "Paused",
      card_mode_direct: "Direct URL",
      card_mode_profile: "Digital Profile",
      card_mode_catalog: "Menu & Catalog",
      card_pin_protected: "PIN Protected",
      card_target_label: "Target Destination URL:",
      card_target_placeholder: "https://maps.google.com/...",
      btn_quick_save: "Save",
      btn_copy_link: "Copy Link",
      btn_program_nfc: "Write NFC",
      btn_test_sim: "Test",
      btn_edit: "Edit",
      btn_duplicate: "Duplicate",
      btn_delete: "Delete",
      card_last_scan: "Last Scan:",
      card_never_scanned: "Never scanned yet",
      empty_cards_title: "No NFC tags registered yet",
      empty_cards_desc: "Create your first smart tag to generate a permanent link and program your NFC chip.",
      empty_cards_btn: "+ Create First Tag Now",

      // Add / Edit Modal Drawer
      drawer_add_title: "Add New Smart NFC Tag",
      drawer_edit_title: "Edit Smart NFC Tag",
      drawer_subtitle: "Configure tag slug and target redirect destination",
      label_card_title: "Tag Name / Label *",
      placeholder_card_title: "e.g. Google Review Tag, Personal Business Card...",
      label_card_slug: "Fixed URL Identifier (Slug) *",
      placeholder_card_slug: "card-myname",
      btn_random_slug: "Random",
      slug_hint: "This permanent URL is written into the NFC chip once and never changes.",
      label_action_type: "Action Type on Tap *",
      action_direct_title: "Direct External URL Redirection",
      action_direct_desc: "Redirects customer instantly in milliseconds to Google Maps, WhatsApp, website, etc.",
      action_profile_title: "Digital Business Card Profile (vCard)",
      action_profile_desc: "Presents an executive mobile landing page allowing customers to save your contact with 1 tap.",
      action_catalog_title: "Smart Menu, Catalog & Google Reviews Hub",
      action_catalog_desc: "Displays products, services, 5-star Google review CTA, and 1-click Wi-Fi sharing.",
      label_destination_url: "Target Destination URL *",
      placeholder_destination_url: "https://maps.google.com/ or your website...",
      label_security_pin: "Security PIN Protection (Optional)",
      placeholder_security_pin: "Leave blank for instant redirect without PIN",
      pin_hint: "If a PIN is set, the customer will be prompted to enter it before redirecting.",
      label_card_status: "Tag Status",
      status_active_label: "Active (Redirects immediately on tap)",
      status_paused_label: "Temporarily Paused (Displays an inactive notice)",
      btn_cancel: "Cancel",
      btn_save_card: "Save & Activate Tag",

      // Web NFC & QR Programming Modal
      modal_nfc_title: "Program Smart NFC Tag & QR",
      modal_nfc_subtitle: "Copy this permanent link or write it directly to the chip via your phone",
      label_fixed_url: "Permanent URL to write inside NFC chip:",
      btn_copy: "Copy",
      btn_write_web_nfc: "Write Directly to NFC Chip Now (Web NFC)",
      note_web_nfc: "Supported natively on Google Chrome for Android",

      // Simulator Modal
      sim_modal_title: "Interactive NFC Tap Simulator",
      sim_modal_subtitle: "Experience exactly what customers see when tapping your physical card",
      sim_tap_instruction: "Tap the virtual NFC card against the phone",
      sim_btn_tap: "📡 Tap to Simulate NFC Scan",
      sim_open_target: "Open Destination URL",

      // Settings Tab
      settings_tab_title: "System Settings & Cloud Sync",
      settings_lang_title: "Interface Language",
      settings_lang_desc: "Choose your preferred display language for the entire dashboard",
      settings_lang_ar: "العربية (RTL) - Arabic",
      settings_lang_en: "English (LTR) - Default",
      settings_pass_title: "Admin Master Password",
      settings_pass_desc: "Protect the control dashboard from unauthorized access",
      label_curr_pass: "Current Password",
      label_new_pass: "New Password",
      btn_update_pass: "Update Password",
      settings_cloud_title: "Real-Time Cloud Sync Endpoint",
      settings_cloud_desc: "Synchronize all tag updates in real-time across all customer phones",
      btn_save_cloud: "Save Cloud Settings",
      settings_backup_title: "Backup & Restore Data",
      btn_export_json: "Export Backup (JSON)",
      btn_import_json: "Import Backup (JSON)",

      // Security Lock Screen
      lock_title: "TapLink | Admin Security Guard",
      lock_sub: "Proprietary system by MUHAB",
      lock_prompt: "Enter master password to access dashboard",
      lock_placeholder: "Enter master password (default: admin123)",
      lock_remember_me: "Remember me on this device",
      btn_unlock: "Unlock Dashboard 🔓",
      lock_error: "Incorrect password, please try again",
      lock_footer: "TapLink Smart Ecosystem © 2026 - MUHAB Corporation",

      // Toast Notifications
      toast_copied: "Copied to clipboard! 📋",
      toast_saved: "Tag saved & activated successfully! ✨",
      toast_updated: "Target destination updated successfully! 🚀",
      toast_deleted: "Tag deleted successfully! 🗑️",
      toast_cloud_synced: "Real-time cloud sync complete 🟢",
      toast_pass_changed: "Master password updated successfully! ✓",
      toast_invalid_pass: "Please verify password requirements",
      toast_nfc_writing: "Hold NFC tag near the back of your phone...",
      toast_nfc_success: "URL written to NFC tag successfully! 🎉",
      toast_nfc_error: "NFC write cancelled or not supported",

      // Unregistered / Redirect Screen
      red_scanned_title: "Smart NFC Tag Scanned 📡",
      red_redirecting: "Redirecting to destination...",
      red_pin_title: "PIN Protected Tag",
      red_pin_prompt: "Enter security PIN to continue to destination",
      red_pin_btn: "Unlock Secret Link 🔓",
      red_not_found_badge: "New NFC Tag Requires Activation",
      red_not_found_title: "This chip is not linked to a URL yet",
      red_slug_label: "Chip Identifier:",
      red_assign_prompt: "If you own this tag, you can assign its destination URL right now:",
      red_target_label: "Target Destination URL:",
      red_save_btn: "Save & Activate Redirection 🚀",
      red_back_dashboard: "Access TapLink Admin Dashboard"
    }
  },

  /**
   * Get translation for key
   */
  t(key, fallback = '') {
    const locale = this.locales[this.currentLang] || this.locales.ar;
    return locale[key] || fallback || key;
  },

  /**
   * Switch Language (ar <-> en)
   */
  setLanguage(lang) {
    if (lang !== 'ar' && lang !== 'en') lang = 'ar';
    this.currentLang = lang;
    localStorage.setItem('taplink_lang', lang);

    const isAr = (lang === 'ar');
    document.documentElement.lang = lang;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';

    // Update Page Title
    document.title = this.t('app_title');

    // Update Language Toggle Button in Header
    const langLabel = document.getElementById('currentLangLabel');
    const langBtn = document.getElementById('btnLangToggle');
    if (langLabel) {
      langLabel.textContent = isAr ? 'EN' : 'عربي';
    }
    if (langBtn) {
      langBtn.title = isAr ? 'Switch to English' : 'التبديل إلى العربية';
    }

    // Update all elements with data-i18n attribute
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const key = el.getAttribute('data-i18n');
      if (key && this.locales[lang][key]) {
        el.textContent = this.locales[lang][key];
      }
    });

    // Update all elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key && this.locales[lang][key]) {
        el.placeholder = this.locales[lang][key];
      }
    });

    // Update all elements with data-i18n-title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key && this.locales[lang][key]) {
        el.title = this.locales[lang][key];
      }
    });

    // Update radio buttons in settings if present
    const radioAr = document.getElementById('langRadioAr');
    const radioEn = document.getElementById('langRadioEn');
    if (radioAr && radioEn) {
      radioAr.checked = isAr;
      radioEn.checked = !isAr;
    }

    // Trigger re-render of dynamic cards & stats if app.js is initialized
    if (typeof renderCardsGrid === 'function') renderCardsGrid();
    if (typeof loadLocalStats === 'function') loadLocalStats();
    if (typeof renderAnalytics === 'function') renderAnalytics();

    // Dispatch global event for other components
    window.dispatchEvent(new CustomEvent('taplink:langChanged', { detail: { lang } }));
  },

  /**
   * Toggle between Arabic and English
   */
  toggleLanguage() {
    const next = this.currentLang === 'ar' ? 'en' : 'ar';
    this.setLanguage(next);
    if (typeof showToast === 'function') {
      showToast(next === 'en' ? 'Language switched to English 🌐' : 'تم تغيير اللغة إلى العربية 🌐', 'info');
    }
  },

  /**
   * Initialize i18n on DOM ready
   */
  init() {
    this.setLanguage(this.currentLang);
  }
};

// Expose globally
window.I18N = I18N;
window.t = (k, f) => I18N.t(k, f);
