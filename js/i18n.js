/**
 * TapLink Internationalization (i18n) Engine
 * Full Bilingual Support: English (LTR - Default) & Arabic (RTL)
 * TapLink by MUHAB
 */

const I18N = {
  // Default to English as requested, or load user preference
  currentLang: localStorage.getItem('taplink_lang') || 'en',

  locales: {
    en: {
      // Brand & Metadata
      app_title: "TapLink | Smart NFC Tags & Dynamic Links Manager - MUHAB",
      brand_name: "TapLink",
      brand_sub: "by MUHAB",
      cloud_status_connected: "🟢 Cloud Synced - Real-time on all devices",
      cloud_status_syncing: "🟡 Syncing with cloud...",
      cloud_status_offline: "⚪ Offline Mode / Local Storage",

      // Header Actions
      search_placeholder: "Search by tag name, slug, or destination URL...",
      btn_search: "Quick Search",
      btn_theme: "Toggle Theme",
      btn_lock: "Lock Dashboard",
      lang_switch_label: "عربي",
      lang_switch_tooltip: "التبديل إلى العربية",

      // Hero Banner
      hero_badge: "TapLink Smart Ecosystem • MUHAB",
      hero_title: "All-in-One NFC Cards & Dynamic Routing Manager",
      hero_desc: "Instantly configure and redirect physical NFC chips with 4 intelligent modes: Direct URL, Digital vCard Profile, Business Catalog & Menu, and Conditional Smart Routing.",
      hero_btn_cards: "Manage Cards & Fast Redirect",
      hero_btn_add: "+ Add New Smart Tag",

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
      scans_today: "today",

      // Navigation Tabs
      nav_home: "Overview",
      nav_cards: "My Cards",
      nav_analytics: "Analytics",
      nav_settings: "Settings",
      nav_add_quick: "Add Card",

      // Section Headings & Filters
      section_cards_title: "Smart Cards & Dynamic Links",
      section_cards_subtitle: "Manage and configure instant redirect destinations for your physical NFC chips",
      filter_all: "All Cards",
      filter_active: "Active Only",
      filter_direct: "Direct URL",
      filter_profile: "Digital Profile",
      filter_catalog: "Menu & Catalog",
      filter_conditional: "Smart Routing",
      btn_add_card: "+ Add New NFC Tag",

      // Card Item Elements
      card_brand_badge: "TapLink • MUHAB",
      card_nfc_verified: "NFC Verified",
      card_status_active: "Active",
      card_status_paused: "Paused",
      card_mode_direct: "Direct URL",
      card_mode_profile: "Digital Profile",
      card_mode_catalog: "Menu & Catalog",
      card_mode_conditional: "Smart Routing",
      card_pin_protected: "PIN Protected",
      card_target_label: "Target Destination URL:",
      card_target_placeholder: "https://maps.google.com/...",
      btn_quick_save: "Save",
      btn_copy_link: "Copy Link",
      btn_program_nfc: "Write NFC",
      btn_test_sim: "Simulate",
      btn_edit: "Edit",
      btn_duplicate: "Duplicate",
      btn_delete: "Delete",
      btn_activate: "Activate",
      btn_pause: "Pause",
      card_last_scan: "Last Scan:",
      card_never_scanned: "Never scanned yet",
      empty_cards_title: "No NFC Tags Registered Yet",
      empty_cards_desc: "Create your first smart tag to generate a permanent link and program your NFC chip.",
      empty_cards_btn: "+ Create First Tag Now",

      // Add / Edit Modal Drawer
      drawer_add_title: "Add New Smart NFC Tag",
      drawer_edit_title: "Edit Smart NFC Tag",
      drawer_subtitle: "Configure tag slug and target redirect destination",
      label_card_title: "Tag Name / Label *",
      placeholder_card_title: "e.g. Google Review Tag, Personal Business Card...",
      label_card_slug: "Permanent URL Identifier (Slug) *",
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
      action_conditional_title: "Conditional Routing (Device & Time Rules)",
      action_conditional_desc: "Directs iPhone vs. Android users to different links, or switches URL based on time of day.",
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
      label_qr_color: "QR Color:",
      label_qr_bg: "Background:",
      btn_download_qr: "Download High-Res QR Code (PNG)",
      label_fixed_url: "Permanent URL to write inside NFC chip (Fixed URL):",
      btn_copy: "Copy",
      btn_write_web_nfc: "Write Directly to NFC Chip Now (Web NFC)",
      note_web_nfc: "Supported natively on Google Chrome for Android",

      // Simulator Modal
      sim_modal_title: "Interactive NFC Tap Simulator",
      sim_modal_subtitle: "Experience exactly what customers see when tapping your physical card",
      sim_tap_instruction: "Tap the virtual NFC card against the phone",
      sim_btn_tap: "📡 Tap to Simulate NFC Scan",
      sim_open_target: "Open Destination URL",
      sim_current_target: "Target Destination:",

      // Analytics Tab
      analytics_tab_title: "Real-Time Scan Analytics & Insights",
      analytics_tab_subtitle: "Track physical card interactions, top performing tags, devices, and visitor browsers",
      stat_scans_chart_title: "Scan Activity (Last 7 Days)",
      stat_devices_chart_title: "Device Distribution",
      stat_browsers_chart_title: "Browser Types",
      recent_scans_title: "Live Scan Activity Log",
      th_card: "Tag / Card",
      th_device: "Device",
      th_browser: "Browser",
      th_time: "Time",
      th_ip: "IP Address",
      th_referrer: "Source",
      no_scans_logged: "No scans logged yet. Scan an NFC tag to view live data.",
      btn_export_analytics: "Export Analytics (CSV)",

      // Settings Tab
      settings_tab_title: "System Settings & Cloud Sync",
      settings_lang_title: "Interface Language",
      settings_lang_desc: "Choose your preferred display language for the entire dashboard",
      settings_lang_en: "English (LTR) - Default",
      settings_lang_ar: "العربية (RTL) - Arabic",
      settings_pass_title: "Admin Master Password",
      settings_pass_desc: "Protect the control dashboard from unauthorized access",
      label_curr_pass: "Current Password",
      label_new_pass: "New Password",
      btn_update_pass: "Update Password",
      settings_cloud_title: "Real-Time Cloud Sync Endpoint",
      settings_cloud_desc: "Synchronize all tag updates in real-time across all customer phones",
      label_cloud_endpoint: "Cloud Storage REST Endpoint (Optional JSON URL)",
      placeholder_cloud_endpoint: "https://your-api.com/cards.json",
      btn_save_cloud: "Save Cloud Settings",
      settings_backup_title: "Backup & Restore Data",
      settings_backup_desc: "Download all tag configurations as a JSON file or restore a previous backup",
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
      toast_short_pass: "Password must be at least 4 characters",
      toast_nfc_writing: "Hold NFC tag near the back of your phone...",
      toast_nfc_success: "URL written to NFC tag successfully! 🎉",
      toast_nfc_error: "NFC write cancelled or not supported on this device",
      toast_nfc_unsupported: "Web NFC is not supported on this browser. Please use Chrome on Android.",
      toast_enter_url: "Please enter a destination URL first",

      // Unregistered / Redirect Screen
      red_scanned_title: "Smart NFC Tag Scanned 📡",
      red_redirecting: "Redirecting to destination...",
      red_pin_title: "PIN Protected Tag",
      red_pin_prompt: "Enter security PIN to continue to destination",
      red_pin_btn: "Unlock Secret Link 🔓",
      red_pin_invalid: "Incorrect PIN code. Please try again.",
      red_not_found_badge: "New NFC Tag Requires Activation",
      red_not_found_title: "This chip is not linked to a URL yet",
      red_slug_label: "Chip Identifier:",
      red_assign_prompt: "If you own this tag, you can assign its destination URL right now:",
      red_target_label: "Target Destination URL:",
      red_save_btn: "Save & Activate Redirection 🚀",
      red_back_dashboard: "Access TapLink Admin Dashboard",

      // Inactive Screen
      inactive_badge: "Tag Status: Inactive",
      inactive_title: "This NFC Tag is Currently Paused",
      inactive_desc: "This link has been temporarily disabled by its owner. Redirection is currently unavailable.",
      inactive_owner_q: "Are you the owner of this card?",
      inactive_owner_hint: "You can reactivate this card anytime from the admin dashboard by clicking 'Activate'.",
      inactive_btn_retry: "Retry & Refresh",
      inactive_btn_login: "Login to Admin Dashboard",

      // Catalog Page
      catalog_open_badge: "Open Now for Service",
      catalog_verified_badge: "📡 TapLink • Verified NFC Tag",
      catalog_rate_google: "⭐ Rate Us 5-Stars on Google",
      catalog_rate_desc: "Takes 5 seconds to support our business on Google Maps",
      catalog_wifi_title: "📶 Connect to Guest Wi-Fi",
      catalog_wifi_desc: "Tap to copy Wi-Fi password or connect instantly",
      catalog_browse_menu: "📋 Browse Menu & Catalog",
      catalog_call_btn: "Call Front Desk",
      catalog_whatsapp_btn: "WhatsApp Orders",
      catalog_maps_btn: "Google Maps Location",
      catalog_wifi_modal_title: "Guest Wi-Fi Connection",
      catalog_wifi_modal_sub: "Connect easily without typing complex passwords",
      catalog_wifi_network: "Network Name (SSID):",
      catalog_wifi_pass: "Password:",
      catalog_wifi_copy: "Copy Wi-Fi Password",
      catalog_wifi_copied: "Password Copied!",

      // Digital Profile Landing Page
      landing_verified: "TapLink • NFC Verified",
      landing_save_contact: "Save Contact to Phone (.vcf)",
      landing_save_desc: "Adds name, phone, email, and company directly to your contacts",
      landing_call: "Call",
      landing_whatsapp: "WhatsApp",
      landing_email: "Email",
      landing_website: "Website",
      landing_socials: "Social Media Channels",
      landing_featured_links: "Featured Links & Services",
      landing_qr_title: "QR Code for Card",
      landing_qr_subtitle: "Scan to open digital profile immediately",
      landing_copy_card_link: "Copy Profile Link",
      landing_link_copied: "Profile link copied to clipboard!",

      // Card Quick Edit & Print QR additions
      label_manage_pin: "4. Card Quick Management PIN (/c/:slug/edit)",
      placeholder_manage_pin: "1234",
      manage_pin_hint: "Allows changing this card's destination from a standalone mobile page (/c/:slug/edit) without accessing the dashboard.",
      btn_qr_print_png: "Ultra HD (2000px PNG)",
      btn_qr_vector_svg: "Vector (Print SVG)",
      btn_download_qr_std: "Standard Digital QR (Web/PNG)",
      btn_quick_page: "Standalone PIN Quick Editor",
      btn_quick_page_short: "PIN Edit",
      toast_qr_print_downloaded: "Downloaded 2000px Ultra HD QR Code (Print-Ready)! 🖨️",
      toast_qr_svg_downloaded: "Downloaded Vector SVG (Laser & PVC card ready)! 📐"
    },

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

      // Hero Banner
      hero_badge: "منظومة TapLink الذكية • شركة MUHAB",
      hero_title: "إدارة شاملة لبطاقات NFC والروابط الديناميكية",
      hero_desc: "تحكم فوري من هاتفك في بطاقات NFC مع 4 أوضاع ذكية (تحويل مباشر، كرت شخصي رقمي، منيو الأعمال، والتوجيه المشروط).",
      hero_btn_cards: "عرض البطاقات والتبديل السريع",
      hero_btn_add: "+ إضافة بطاقة جديدة",

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
      scans_today: "اليوم",

      // Navigation Tabs
      nav_home: "الرئيسية",
      nav_cards: "بطاقاتي",
      nav_analytics: "الإحصائيات",
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
      filter_conditional: "توجيه مشروط",
      btn_add_card: "+ إضافة بطاقة NFC جديدة",

      // Card Item Elements
      card_brand_badge: "TapLink • MUHAB",
      card_nfc_verified: "NFC موثق",
      card_status_active: "نشطة",
      card_status_paused: "متوقفة",
      card_mode_direct: "تحويل مباشر",
      card_mode_profile: "ملف شخصي",
      card_mode_catalog: "منيو وكتالوج",
      card_mode_conditional: "توجيه ذكي",
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
      btn_activate: "تفعيل",
      btn_pause: "إيقاف",
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
      action_conditional_title: "توجيه مشروط (قواعد الجهاز والوقت)",
      action_conditional_desc: "يوجه أجهزة الآيفون لرابط مختلف عن الأندرويد، أو يبدل الرابط حسب توقيت اليوم صباحاً ومساءً.",
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
      label_qr_color: "لون الرمز:",
      label_qr_bg: "الخلفية:",
      btn_download_qr: "تحميل رمز QR عالي الدقة (PNG)",
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
      sim_current_target: "الرابط المستهدف:",

      // Analytics Tab
      analytics_tab_title: "إحصائيات المسح والمشاهدات المباشرة",
      analytics_tab_subtitle: "تتبع تفاعل الزوار مع بطاقاتك، الأجهزة الأكثر استخداماً، والمتصفحات",
      stat_scans_chart_title: "نشاط المسح (آخر 7 أيام)",
      stat_devices_chart_title: "توزيع الأجهزة",
      stat_browsers_chart_title: "المتصفحات المستخدمة",
      recent_scans_title: "سجل المسحات اللحظي",
      th_card: "البطاقة",
      th_device: "الجهاز",
      th_browser: "المتصفح",
      th_time: "الوقت",
      th_ip: "عنوان IP",
      th_referrer: "المصدر",
      no_scans_logged: "لم يتم تسجيل أي مسحة بعد. قم بمسح بطاقة لتظهر هنا.",
      btn_export_analytics: "تصدير السجل (CSV)",

      // Settings Tab
      settings_tab_title: "إعدادات المنظومة والمزامنة السحابية",
      settings_lang_title: "لغة واجهة النظام (Interface Language)",
      settings_lang_desc: "اختر اللغة المفضلة لعرض لوحة التحكم بالكامل",
      settings_lang_en: "English (LTR) - الإنجليزية",
      settings_lang_ar: "العربية (RTL) - الافتراضية",
      settings_pass_title: "تغيير كلمة مرور المدير (Master Password)",
      settings_pass_desc: "لحماية لوحة التحكم من أي تعديل غير مصرح به",
      label_curr_pass: "كلمة المرور الحالية",
      label_new_pass: "كلمة المرور الجديدة",
      btn_update_pass: "تحديث كلمة المرور",
      settings_cloud_title: "نقطة المزامنة السحابية (Real-Time Cloud Endpoint)",
      settings_cloud_desc: "مزامنة التعديلات سحابياً لتعمل فوراً على كل بطاقات وهواتف العملاء",
      label_cloud_endpoint: "رابط نقطة السحابة (Optional JSON URL):",
      placeholder_cloud_endpoint: "https://your-api.com/cards.json",
      btn_save_cloud: "حفظ إعدادات السحابة",
      settings_backup_title: "النسخ الاحتياطي واستعادة البيانات",
      settings_backup_desc: "تنزيل نسخة احتياطية لكافة البطاقات كملف JSON أو استعادة نسخة سابقة",
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
      toast_short_pass: "يجب ألا تقل كلمة المرور عن 4 خانات",
      toast_nfc_writing: "قرب شريحة NFC الآن من ظهر الجوال...",
      toast_nfc_success: "تمت كتابة الرابط على شريحة NFC بنجاح! 🎉",
      toast_nfc_error: "تعذرت كتابة NFC أو تم إلغاء العملية",
      toast_nfc_unsupported: "خاصية Web NFC غير مدعومة في هذا المتصفح. استخدم متصفح كروم على أندرويد.",
      toast_enter_url: "يرجى كتابة الرابط الهدف أولاً",

      // Unregistered / Redirect Screen
      red_scanned_title: "تم مسح الشريحة الذكية 📡",
      red_redirecting: "جاري التحويل للوجهة...",
      red_pin_title: "رابط محمي برمز PIN",
      red_pin_prompt: "أدخل رمز الحماية السري للمتابعة إلى الوجهة",
      red_pin_btn: "فتح الرابط السري 🔓",
      red_pin_invalid: "رمز PIN غير صحيح، حاول مجدداً",
      red_not_found_badge: "بطاقة NFC جديدة تحتاج تفعيل",
      red_not_found_title: "هذه الشريحة غير مربوطة برابط بعد",
      red_slug_label: "معرف الشريحة:",
      red_assign_prompt: "إذا كنت صاحب هذه الشريحة، يمكنك تعيين رابط الوجهة الهدف فوراً:",
      red_target_label: "الرابط الهدف (Target Destination URL):",
      red_save_btn: "حفظ وتفعيل التحويل فوراً 🚀",
      red_back_dashboard: "الدخول إلى لوحة التحكم الرئيسية (TapLink)",

      // Inactive Screen
      inactive_badge: "حالة الشريحة: غير نشطة",
      inactive_title: "هذه البطاقة متوقفة حالياً",
      inactive_desc: "تم إيقاف تفعيل هذا الرابط مؤقتاً من قبل صاحب البطاقة. لا يمكن تحويلك أو عرض البيانات في الوقت الحالي.",
      inactive_owner_q: "هل أنت صاحب هذه البطاقة؟",
      inactive_owner_hint: "يمكنك إعادة تفعيل البطاقة فوراً من لوحة التحكم بالضغط على زر 'تفعيل'.",
      inactive_btn_retry: "إعادة المحاولة والتحديث",
      inactive_btn_login: "تسجيل الدخول للوحة التحكم",

      // Catalog Page
      catalog_open_badge: "مفتوح الآن للخدمة",
      catalog_verified_badge: "📡 TapLink • شريحة NFC موثقة",
      catalog_rate_google: "⭐ قيّمنا بـ 5 نجوم على خرائط جوجل",
      catalog_rate_desc: "يستغرق الأمر 5 ثوانٍ فقط لدعمنا على Google Maps",
      catalog_wifi_title: "📶 الاتصال بشبكة الواي فاي للضيوف",
      catalog_wifi_desc: "اضغط لنسخ كلمة المرور والاتصال فوراً",
      catalog_browse_menu: "📋 تصفح المنيو وقائمة الطلبات",
      catalog_call_btn: "اتصال بالاستقبال",
      catalog_whatsapp_btn: "طلب عبر الواتساب",
      catalog_maps_btn: "موقعنا على الخريطة",
      catalog_wifi_modal_title: "الاتصال بشبكة الواي فاي",
      catalog_wifi_modal_sub: "اتصل بكل سهولة بدون الحاجة لكتابة كلمات سر معقدة",
      catalog_wifi_network: "اسم الشبكة (SSID):",
      catalog_wifi_pass: "كلمة المرور:",
      catalog_wifi_copy: "نسخ كلمة مرور الواي فاي",
      catalog_wifi_copied: "تم نسخ كلمة السر!",

      // Digital Profile Landing Page
      landing_verified: "TapLink • NFC موثق",
      landing_save_contact: "حفظ جهة الاتصال في الهاتف (.vcf)",
      landing_save_desc: "يضيف الاسم والرقم والبريد والشركة مباشرة لجهات اتصال جوالك",
      landing_call: "اتصال",
      landing_whatsapp: "واتساب",
      landing_email: "إيميل",
      landing_website: "موقعي",
      landing_socials: "قنوات التواصل الاجتماعي",
      landing_featured_links: "روابط وخدمات مميزة",
      landing_qr_title: "رمز QR للبطاقة",
      landing_qr_subtitle: "امسح الكود لفتح البطاقة مباشرة",
      landing_copy_card_link: "نسخ رابط الملف الشخصي",
      landing_link_copied: "تم نسخ الرابط للحافظة!",

      // Card Quick Edit & Print QR additions
      label_manage_pin: "4. رمز PIN السريع لإدارة البطاقة (/c/:slug/edit)",
      placeholder_manage_pin: "1234",
      manage_pin_hint: "يتيح تعديل الرابط الهدف لهذه البطاقة عبر صفحة مخصصة للجوال (/c/:slug/edit) دون الحاجة للدخول إلى لوحة التحكم الرئيسية.",
      btn_qr_print_png: "فائق الدقة (2000px PNG)",
      btn_qr_vector_svg: "متجه للطباعة (Vector SVG)",
      btn_download_qr_std: "رمز QR رقمي قياسي (ويب)",
      btn_quick_page: "لوحة التعديل السريع برمز PIN",
      btn_quick_page_short: "تعديل بالـ PIN",
      toast_qr_print_downloaded: "تم تنزيل رمز QR فائق الدقة 2000 بكسل جاهز للطباعة! 🖨️",
      toast_qr_svg_downloaded: "تم تنزيل ملف SVG المتجهي للطباعة البلاستيكية والليزر! 📐"
    }
  },

  /**
   * Get translation for key with fallback
   */
  t(key, fallback = '') {
    const active = this.currentLang;
    const locale = this.locales[active] || this.locales.en;
    if (locale[key]) return locale[key];
    if (this.locales.en && this.locales.en[key]) return this.locales.en[key];
    if (this.locales.ar && this.locales.ar[key]) return this.locales.ar[key];
    return fallback || key;
  },

  /**
   * Switch Language (en <-> ar)
   */
  setLanguage(lang) {
    if (lang !== 'ar' && lang !== 'en') lang = 'en';
    this.currentLang = lang;
    localStorage.setItem('taplink_lang', lang);

    const isAr = (lang === 'ar');
    document.documentElement.lang = lang;
    document.documentElement.dir = isAr ? 'rtl' : 'ltr';

    // Update Page Title
    const currentTitle = document.title;
    if (currentTitle.includes('TapLink') || currentTitle.includes('إدارة')) {
      document.title = this.t('app_title');
    }

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
      if (key && this.locales[lang] && this.locales[lang][key]) {
        el.textContent = this.locales[lang][key];
      }
    });

    // Update all elements with data-i18n-html attribute (for icons or rich text)
    document.querySelectorAll('[data-i18n-html]').forEach(el => {
      const key = el.getAttribute('data-i18n-html');
      if (key && this.locales[lang] && this.locales[lang][key]) {
        el.innerHTML = this.locales[lang][key];
      }
    });

    // Update all elements with data-i18n-placeholder attribute
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const key = el.getAttribute('data-i18n-placeholder');
      if (key && this.locales[lang] && this.locales[lang][key]) {
        el.placeholder = this.locales[lang][key];
      }
    });

    // Update all elements with data-i18n-title attribute
    document.querySelectorAll('[data-i18n-title]').forEach(el => {
      const key = el.getAttribute('data-i18n-title');
      if (key && this.locales[lang] && this.locales[lang][key]) {
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
   * Toggle between English and Arabic
   */
  toggleLanguage() {
    const next = this.currentLang === 'en' ? 'ar' : 'en';
    this.setLanguage(next);
    if (typeof showToast === 'function') {
      showToast(next === 'en' ? 'Switched to English 🌐' : 'تم التبديل إلى العربية 🌐', 'info');
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

// Auto-init on script load if DOM is already parsed, or wait for DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => I18N.init());
} else {
  I18N.init();
}
