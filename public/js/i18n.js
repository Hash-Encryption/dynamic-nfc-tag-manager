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
      red_not_found_badge: "Smart Tag Currently Inactive",
      red_not_found_title: "This Smart Tag is Currently Inactive",
      red_not_found_desc: "Please contact the card administrator or service desk to activate this tag.",
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
      toast_qr_svg_downloaded: "Downloaded Vector SVG (Laser & PVC card ready)! 📐",

      // Enterprise Pro Edition - Leads CRM
      nav_leads: "Leads CRM",
      section_leads_title: "Visitor Leads & CRM",
      section_leads_subtitle: "Customer contacts captured automatically upon tapping your smart cards",
      btn_export_csv: "Export to Excel (CSV) 📊",
      btn_export_vcf: "Download Contacts (.vcf) 📇",
      btn_clear_leads: "Clear Leads 🗑️",
      leads_empty_title: "No Customer Leads Captured Yet",
      leads_empty_desc: "Enable 'Visitor Lead Capture' inside any card's advanced settings to start collecting contact info automatically.",
      col_lead_name: "Visitor Name",
      col_lead_phone: "Phone / WhatsApp",
      col_lead_card: "Source Tag",
      col_lead_time: "Time",
      col_lead_note: "Note",
      col_lead_actions: "Direct Actions",

      // Enterprise Pro Edition - New Smart Modes
      card_mode_wifi: "Smart Wi-Fi 📶",
      card_mode_sos: "Lost & Found / SOS 🆘",
      action_wifi_title: "5. Smart Wi-Fi Tag 📶",
      action_wifi_desc: "Allows guests to connect to Wi-Fi with 1-tap password copy or camera auto-connect QR.",
      action_sos_title: "6. Lost & Found / SOS Emergency 🆘",
      action_sos_desc: "Emergency tag for luggage, keys, pets, or kids with 1-tap call and WhatsApp GPS location sharing.",

      // Smart Folders & Filters
      folder_all: "All Tags",
      folder_restaurant: "🍽️ Menus",
      folder_personal: "👤 Personal",
      folder_wifi: "📶 Wi-Fi",
      folder_sos: "🆘 SOS / Lost",
      folder_vip: "⭐ VIP",

      // Bulk Actions
      btn_bulk_mode: "Bulk Actions ☑️",
      btn_bulk_cancel: "Cancel ✕",
      btn_bulk_update_url: "Bulk URL 🔗",
      btn_bulk_activate: "Activate 🟢",
      btn_bulk_pause: "Pause ⏸️",
      btn_bulk_delete: "Delete 🗑️",
      bulk_selected_count: "Selected Tags",

      // Quick Pass Show Mode
      btn_quick_pass: "Quick Pass 📲",
      quick_pass_title: "Apple Wallet Quick Pass",
      quick_pass_sub: "Present this high-contrast QR code directly to customers from your phone screen",
      quick_pass_brightness: "Max Contrast Mode",
      qp_title: "Apple Wallet Quick Pass",
      qp_max_contrast: "Max Contrast",
      qp_copy_link: "Copy Direct Pass Link",
      nav_stats: "Analytics",

      // Advanced options & rules
      adv_accordion_title: "Advanced Rules & Settings",
      label_category: "Smart Tag Folder",
      folder_opt_all: "📁 General (All Tags)",
      folder_opt_restaurant: "🍽️ Menus & Dining",
      folder_opt_personal: "👤 Business & Digital vCards",
      folder_opt_wifi: "📶 Guest Wi-Fi Access",
      folder_opt_sos: "🆘 Lost & Found / Emergency",
      folder_opt_vip: "⭐ VIP & Exclusive Access",

      // Lead capture settings
      label_lead_capture_enable: "Visitor Lead Capture",
      desc_lead_capture: "Prompts visitors for contact details before redirecting",
      label_lead_capture_req: "Require contact information to proceed",
      placeholder_lead_title: "Title: Leave your contact details",
      placeholder_lead_sub: "Description: We will reach out shortly",

      // Limits & expiration
      label_limits_title: "Limits & Expiration Rules",
      desc_limits: "Set an expiry date or maximum number of taps allowed",
      label_max_scans: "Maximum Allowed Taps (0 = Unlimited)",
      placeholder_max_scans: "0 = Unlimited",
      label_expires_at: "Expiration Date & Time",
      placeholder_fallback_url: "Fallback URL when expired (e.g. https://example.com/expired)",
      placeholder_expired_msg: "Custom message when expired (optional)",

      // Security PIN & Standalone quick edit
      label_pins_title: "Security PINs & Quick Edit",
      desc_pins: "Protect tag with a PIN or edit target URL from mobile without logging in",
      placeholder_pin_code: "e.g. 2026",
      placeholder_manage_pin: "1234",

      // Wi-Fi Drawer labels
      wifi_label_ssid: "Wi-Fi Network Name (SSID) *",
      wifi_label_pass: "Wi-Fi Password *",
      wifi_label_enc: "Security Encryption",
      wifi_label_hidden: "Hidden Network (SSID is hidden)",

      // SOS Drawer labels
      sos_label_owner: "Owner / Pet / Item Name *",
      sos_label_phone: "Emergency Phone Number *",
      sos_label_whatsapp: "WhatsApp Number (For GPS Location)",
      sos_label_reward: "Reward / Compensation Notice",
      sos_label_msg: "Emergency Medical / Recovery Instructions",

      // Visitor Lead Capture Client Modal
      lc_visitor_title: "Contact & Information Request",
      lc_visitor_subtitle: "Leave your contact details to continue immediately",
      lc_name: "Full Name *",
      lc_name_placeholder: "e.g. John Doe",
      lc_phone: "Mobile / WhatsApp Number *",
      lc_phone_placeholder: "+1 234 567 8900",
      lc_note: "Note or Inquiry (Optional)",
      lc_note_placeholder: "Business inquiry, booking request, etc.",
      lc_btn_submit: "Submit & Continue 🚀",
      lc_btn_skip: "Skip",

      // Bulk Actions & Modals
      bulk_url_title: "Update Destination for Selected Tags",
      bulk_new_url_label: "New Target Destination URL",
      bulk_selected_suffix: "Selected",

      // Account cleanup & Demo Tags
      settings_cleanup_title: "Workspace Clean-up & Demo Tags",
      settings_cleanup_desc: "Permanently remove default demo tags and start with a fresh workspace",
      btn_clear_demo: "Delete Demo Tags",

      // Dynamic Toast & Confirmations
      toast_saved_sync: "Saved & synced in real-time across all devices! 🟢",
      toast_demo_cleared: "Demo tags removed and workspace refreshed! 🧹",
      confirm_delete_card: "Are you sure you want to permanently delete this tag?\n\nIt will be immediately erased from your device and central cloud database.",
      confirm_clear_demo: "Do you want to permanently delete all default demo tags (Hoomi, ksnjv, cardtest)? Your custom tags will remain safe.",
      btn_delete_card: "Delete Tag Permanently",
      empty_leads_title: "No Customer Leads Captured Yet",
      empty_leads_desc: "Enable 'Visitor Lead Capture' in any card settings to automatically collect visitor contact details.",
      leads_count_suffix: "Leads",
      cloud_status_queued: "Offline (Saved locally, queued for sync)",
      cloud_validation_failed: "Invalid cloud data format. Please verify endpoint.",
      lock_attempts_left: "attempts remaining before security lockout",
      lock_bruteforce: "Too many failed attempts. Locked for 15 minutes.",
      lock_incorrect: "Incorrect master password. Please try again.",
      lock_locked: "System Locked: Try again in",
      lock_unlocked: "Unlocked successfully! Welcome back ✨",
      session_expired: "Session expired due to 30 minutes of inactivity.",
      toast_qr_downloaded: "Downloaded Standard PNG QR Code! 🖼️",

      // Drawer Sub-Tabs
      ed_tab_basic: "Basic & Mode",
      ed_tab_wifi: "Smart Wi-Fi 📶",
      ed_tab_sos: "Lost & Found 🆘",
      ed_tab_presets: "Saved Targets",
      ed_tab_conditional: "Smart Routing",
      ed_tab_catalog: "Menu & Catalog",
      ed_tab_profile: "Digital Profile",

      // Smart Link Generator Modal
      linkgen_title: "Smart Link Generator (TapLink)",
      linkgen_subtitle: "Generate high-converting links with 1-click",
      linkgen_tab_wa: "WhatsApp 💬",
      linkgen_tab_maps: "Google Review ⭐",
      linkgen_tab_phone: "Call / Email 📞",
      linkgen_wa_phone: "Phone Number (with Country Code)",
      linkgen_wa_phone_placeholder: "+1234567890 or 0501234567",
      linkgen_wa_msg: "Pre-filled Welcome Message",
      linkgen_wa_msg_placeholder: "Hello, I would like to inquire about your services...",
      linkgen_apply_wa: "Apply WhatsApp Link ✓",
      linkgen_maps_query: "Business Name or Google Maps Place Link",
      linkgen_maps_query_placeholder: "e.g. Ambassador Lounge Riyadh or Google Maps link",
      linkgen_apply_maps: "Apply Google Review Link ⭐",
      linkgen_direct_phone: "Direct Phone Number",
      linkgen_direct_phone_placeholder: "+1234567890",
      linkgen_apply_tel: "Apply Direct Call Link 📞",
      btn_smart_link_gen: "Smart Link Generator 🪄",
      btn_add_preset: "+ Add to Quick Presets",
      view_full_analytics: "View Full Analytics",
      btn_sync_now: "Sync Now",

      // Drawer Sub-Tabs Labels & Placeholders
      catalog_biz_name: "Business / Restaurant Name",
      catalog_biz_name_placeholder: "e.g. Ambassador Lounge & Restaurant",
      catalog_tagline: "Tagline / Category",
      catalog_tagline_placeholder: "e.g. Gourmet Dining & Specialty Coffee",
      catalog_wifi_ssid: "Wi-Fi Network Name (SSID)",
      catalog_wifi_ssid_placeholder: "e.g. Guest_WiFi",
      catalog_wifi_pass: "Wi-Fi Password",
      catalog_wifi_pass_placeholder: "Network password (optional)",
      catalog_google_review: "Google Maps 5-Star Review URL",
      catalog_google_review_placeholder: "https://maps.google.com/...",

      profile_fullname: "Full Name",
      profile_fullname_placeholder: "e.g. Alex Morgan",
      profile_job: "Job Title",
      profile_job_placeholder: "e.g. Chief Executive Officer",
      profile_company: "Company / Organization",
      profile_company_placeholder: "e.g. MUHAB Technologies",
      profile_avatar: "Avatar Image URL",
      profile_avatar_placeholder: "https://...",
      profile_bio: "Bio / Summary",
      profile_bio_placeholder: "Brief professional biography...",
      profile_vcard_phone: "Phone Number (vCard)",
      profile_vcard_phone_placeholder: "+1234567890",
      profile_whatsapp: "WhatsApp Number",
      profile_whatsapp_placeholder: "+1234567890",

      // Search & Presets Placeholders
      placeholder_search_leads: "Search leads by name, phone, note, or card...",
      nfc_guide_title: "NFC Chip Programming Guide",
      nfc_guide_sub: "Write the permanent URL into the NFC chip once and never touch it again!",
      copy_wifi_pass: "Copy Wi-Fi Password",
      share_gps_wa: "Send My GPS Location via WhatsApp",
      bulk_apply_btn: "Apply to All Selected ✓",
      bulk_cancel_btn: "Cancel",
      bulk_desc_hint: "All selected chips will redirect instantly to this new URL upon the next tap."
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
      red_not_found_badge: "البطاقة الذكية غير مفعلة",
      red_not_found_title: "البطاقة الذكية غير مفعلة حالياً",
      red_not_found_desc: "يرجى مراجعة مسؤول البطاقة أو نقطة الخدمة لتفعيل هذا الرابط.",
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
      toast_qr_svg_downloaded: "تم تنزيل ملف SVG المتجهي للطباعة البلاستيكية والليزر! 📐",

      // Enterprise Pro Edition - Leads CRM
      nav_leads: "سجل العملاء",
      section_leads_title: "سجل بيانات العملاء والزوار (CRM)",
      section_leads_subtitle: "قائمة الزوار والعملاء الذين سجلوا بياناتهم تلقائياً عبر مسح بطاقاتك الذكية",
      btn_export_csv: "تصدير إلى Excel (CSV) 📊",
      btn_export_vcf: "تنزيل الكل جهات اتصال (.vcf) 📇",
      btn_clear_leads: "مسح السجل 🗑️",
      leads_empty_title: "لم يتم تسجيل أي عملاء بعد",
      leads_empty_desc: "قم بتفعيل خيار 'جمع بيانات الزوار' داخل الإعدادات المتقدمة لأي بطاقة لبدء استقبال بيانات العملاء تلقائياً.",
      col_lead_name: "اسم العميل",
      col_lead_phone: "رقم الجوال / واتساب",
      col_lead_card: "البطاقة المصدر",
      col_lead_time: "وقت التسجيل",
      col_lead_note: "ملاحظة العميل",
      col_lead_actions: "إجراءات مباشرة",

      // Enterprise Pro Edition - New Smart Modes
      card_mode_wifi: "واي فاي ذكي 📶",
      card_mode_sos: "طوارئ ومفقودات 🆘",
      action_wifi_title: "5. شبكة واي فاي الذكية 📶",
      action_wifi_desc: "تتيح للزوار الاتصال بشبكة الواي فاي بلمسة واحدة أو عبر مسح رمز QR مخصص بكاميرا الجوال.",
      action_sos_title: "6. طوارئ ومفقودات (SOS) 🆘",
      action_sos_desc: "مخصصة للحقائب والمفاتيح والحيوانات الأليفة والأطفال، تتيح الاتصال المباشر وإرسال موقع الغرض عبر واتساب بضغطة واحدة.",

      // Smart Folders & Filters
      folder_all: "جميع البطاقات",
      folder_restaurant: "🍽️ قوائم ومطاعم",
      folder_personal: "👤 كروت شخصية",
      folder_wifi: "📶 شبكات واي فاي",
      folder_sos: "🆘 طوارئ ومفقودات",
      folder_vip: "⭐ VIP",

      // Bulk Actions
      btn_bulk_mode: "إجراءات جماعية ☑️",
      btn_bulk_cancel: "إلغاء التحديد ✕",
      btn_bulk_update_url: "تعديل الرابط جماعياً 🔗",
      btn_bulk_activate: "تفعيل المحدد 🟢",
      btn_bulk_pause: "إيقاف المحدد ⏸️",
      btn_bulk_delete: "حذف المحدد 🗑️",
      bulk_selected_count: "بطاقات محددة",

      // Quick Pass Show Mode
      btn_quick_pass: "وضع العرض السريع 📲",
      quick_pass_title: "بطاقة العرض السريع (Apple Wallet Style)",
      quick_pass_sub: "أظهر هذا الرمز بحجم كبير ليتمكن أي شخص من مسحه بكاميرا جواله مباشرة دون الحاجة للبطاقة البلاستيكية",
      quick_pass_brightness: "وضع السطوع الفائق",
      qp_title: "وضع العرض السريع (Apple Wallet)",
      qp_max_contrast: "أقصى سطوع",
      qp_copy_link: "نسخ رابط العرض المباشر",
      nav_stats: "الإحصائيات",

      // Advanced options & rules
      adv_accordion_title: "خيارات متقدمة وقواعد ذكية",
      label_category: "المجلد والتصنيف الذكي",
      folder_opt_all: "📁 عام (كافة البطاقات)",
      folder_opt_restaurant: "🍽️ مطاعم وقوائم طعام",
      folder_opt_personal: "👤 كروت شخصية وبطاقات أعمال",
      folder_opt_wifi: "📶 شبكات واي فاي",
      folder_opt_sos: "🆘 طوارئ ومفقودات",
      folder_opt_vip: "⭐ VIP وحصريات",

      // Lead capture settings
      label_lead_capture_enable: "جمع بيانات الزوار (Lead Capture)",
      desc_lead_capture: "نافذة تطلب من العميل تسجيل اسمه ورقم هاتفه قبل التحويل",
      label_lead_capture_req: "التسجيل إجباري للمتابعة للوجهة",
      placeholder_lead_title: "العنوان: اترك بياناتك للتواصل",
      placeholder_lead_sub: "الوصف: سنتواصل معك فوراً",

      // Limits & expiration
      label_limits_title: "صلاحية الرابط وحد المسحات (Limits & Expiration)",
      desc_limits: "تحديد تاريخ انتهاء أو حد أقصى لعدد مرات المسح",
      label_max_scans: "الحد الأقصى للمسحات (0 = غير محدود)",
      placeholder_max_scans: "0 = غير محدود",
      label_expires_at: "تاريخ ووقت الانتهاء",
      placeholder_fallback_url: "رابط بديل بعد الانتهاء: https://example.com/expired",
      placeholder_expired_msg: "رسالة مخصصة عند الانتهاء (اختياري)",

      // Security PIN & Standalone quick edit
      label_pins_title: "رموز الحماية والإدارة السريعة (PIN Codes)",
      desc_pins: "قفل البطاقة أو تمكين تعديلها دون لوحة التحكم",
      placeholder_pin_code: "مثال: 2026",
      placeholder_manage_pin: "1234",

      // Wi-Fi Drawer labels
      wifi_label_ssid: "اسم شبكة الواي فاي (SSID) *",
      wifi_label_pass: "كلمة مرور الواي فاي *",
      wifi_label_enc: "نوع التشفير والأمان",
      wifi_label_hidden: "شبكة مخفية (Hidden Network)",

      // SOS Drawer labels
      sos_label_owner: "اسم صاحب الغرض / الحيوان / الطفل *",
      sos_label_phone: "رقم هاتف الطوارئ *",
      sos_label_whatsapp: "رقم واتساب (لإرسال الموقع الجغرافي)",
      sos_label_reward: "مكافأة مالية أو ملاحظة للمكتشف",
      sos_label_msg: "تعليمات طبية أو طارئة للمكتشف",

      // Visitor Lead Capture Client Modal
      lc_visitor_title: "اترك بياناتك للتواصل",
      lc_visitor_subtitle: "سجل بياناتك للمتابعة وفتح الرابط فوراً",
      lc_name: "الاسم الكامل *",
      lc_name_placeholder: "مثال: محمد عبدالله",
      lc_phone: "رقم الجوال (واتساب) *",
      lc_phone_placeholder: "+966500000000",
      lc_note: "ملاحظة أو استفسار (اختياري)",
      lc_note_placeholder: "مهتم بالخدمة / موعد / استفسار...",
      lc_btn_submit: "إرسال ومتابعة 🚀",
      lc_btn_skip: "تخطي",

      // Bulk Actions & Modals
      bulk_url_title: "تحديث الرابط للبطاقات المحددة",
      bulk_new_url_label: "الرابط الهدف الجديد",
      bulk_selected_suffix: "بطاقات محددة",

      // Account cleanup & Demo Tags
      settings_cleanup_title: "تنظيف الحساب والبطاقات التجريبية",
      settings_cleanup_desc: "حذف البطاقات الافتراضية التجريبية بضغطة زر وبدء العمل بسجل نظيف",
      btn_clear_demo: "حذف البطاقات التجريبية",

      // Dynamic Toast & Confirmations
      toast_saved_sync: "✅ تم الحفظ والمزامنة الفورية لجميع الأجهزة",
      toast_demo_cleared: "✅ تم تنظيف كافة البطاقات التجريبية بنجاح 🧹",
      confirm_delete_card: "هل أنت متأكد من حذف هذه البطاقة نهائياً؟\n\nسيتم مسحها فوراً من هاتفك ومن السحابة المركزية ولا يمكن استرجاعها.",
      confirm_clear_demo: "هل تريد حذف كافة البطاقات الافتراضية التجريبية (Hoomi, ksnjv, cardtest) والبدء بسجل نظيف؟ بطاقاتك المخصصة ستظل آمنة.",
      btn_delete_card: "حذف البطاقة نهائياً",
      empty_leads_title: "لم يتم تسجيل أي عملاء بعد",
      empty_leads_desc: "قم بتفعيل خيار 'جمع بيانات الزوار' داخل إعدادات أي بطاقة لبدء استقبال بيانات العملاء تلقائياً.",
      leads_count_suffix: "عملاء",
      cloud_status_queued: "غير متصل (تم الحفظ محلياً وبانتظار المزامنة)",
      cloud_validation_failed: "صيغة بيانات السحابة غير صالحة، يرجى التحقق.",
      lock_attempts_left: "محاولات متبقية قبل الإغلاق الأمني",
      lock_bruteforce: "محاولات كثيرة خاطئة. تم قفل النظام لمدة 15 دقيقة.",
      lock_incorrect: "كلمة المرور غير صحيحة، يرجى المحاولة ثانية.",
      lock_locked: "النظام مقفل: أعد المحاولة بعد",
      lock_unlocked: "تم فتح القفل بنجاح! أهلاً بك ✨",
      session_expired: "انتهت الجلسة بعد 30 دقيقة من الخمول لأسباب أمنية.",
      toast_qr_downloaded: "تم تنزيل رمز QR الرقمي القياسي بنجاح! 🖼️",

      // Drawer Sub-Tabs
      ed_tab_basic: "الأساسي والأوضاع",
      ed_tab_wifi: "واي فاي ذكي 📶",
      ed_tab_sos: "طوارئ ومفقودات 🆘",
      ed_tab_presets: "وجهات محفوظة",
      ed_tab_conditional: "توجيه ذكي",
      ed_tab_catalog: "قائمة ومنتجات",
      ed_tab_profile: "الملف الرقمي",

      // Smart Link Generator Modal
      linkgen_title: "صانع الروابط الذكية (TapLink)",
      linkgen_subtitle: "توليد روابط تحويل احترافية بضغطة زر واحدة",
      linkgen_tab_wa: "واتساب 💬",
      linkgen_tab_maps: "تقييم جوجل ⭐",
      linkgen_tab_phone: "اتصال وإيميل 📞",
      linkgen_wa_phone: "رقم الهاتف (مع الرمز الدولي)",
      linkgen_wa_phone_placeholder: "+966500000000 أو 0501234567",
      linkgen_wa_msg: "رسالة الترحيب التلقائية",
      linkgen_wa_msg_placeholder: "مرحباً، أود الاستفسار عن خدماتكم...",
      linkgen_apply_wa: "تطبيق رابط الواتساب ✓",
      linkgen_maps_query: "اسم المنشأة أو رابط خرائط جوجل",
      linkgen_maps_query_placeholder: "مثال: مطعم السفير الرياض أو رابط الخرائط",
      linkgen_apply_maps: "تطبيق رابط التقييم ⭐",
      linkgen_direct_phone: "رقم الاتصال المباشر",
      linkgen_direct_phone_placeholder: "+966500000000",
      linkgen_apply_tel: "تطبيق رابط الاتصال 📞",
      btn_smart_link_gen: "صانع الروابط الذكية 🪄",
      btn_add_preset: "+ إضافة للوجهات السريعة",
      view_full_analytics: "عرض التحليلات الكاملة",
      btn_sync_now: "مزامنة فورية",

      // Drawer Sub-Tabs Labels & Placeholders
      catalog_biz_name: "اسم المتجر أو المطعم",
      catalog_biz_name_placeholder: "مثال: مطعم ولاونج السفير",
      catalog_tagline: "الوصف أو نوع النشاط",
      catalog_tagline_placeholder: "مثال: مأكولات راقية وقهوة مختصة",
      catalog_wifi_ssid: "اسم شبكة الواي فاي (SSID)",
      catalog_wifi_ssid_placeholder: "مثال: Guest_WiFi",
      catalog_wifi_pass: "كلمة مرور الواي فاي",
      catalog_wifi_pass_placeholder: "كلمة مرور الشبكة (اختياري)",
      catalog_google_review: "رابط التقييم 5 نجوم على خرائط جوجل",
      catalog_google_review_placeholder: "https://maps.google.com/...",

      profile_fullname: "الاسم الكامل",
      profile_fullname_placeholder: "مثال: محمد عبدالله",
      profile_job: "المسمى الوظيفي",
      profile_job_placeholder: "مثال: الرئيس التنفيذي",
      profile_company: "الشركة أو المؤسسة",
      profile_company_placeholder: "مثال: شركة مهاب للتقنية",
      profile_avatar: "رابط الصورة الشخصية",
      profile_avatar_placeholder: "https://...",
      profile_bio: "نبذة تعريفية سريعة",
      profile_bio_placeholder: "نبذة مهنية مختصرة...",
      profile_vcard_phone: "رقم الهاتف المباشر (vCard)",
      profile_vcard_phone_placeholder: "+966500000000",
      profile_whatsapp: "رقم الواتساب",
      profile_whatsapp_placeholder: "+966500000000",

      // Search & Presets Placeholders
      placeholder_search_leads: "ابحث بالاسم، رقم الهاتف، الملاحظة، أو البطاقة...",
      nfc_guide_title: "دليل برمجة شريحة NFC",
      nfc_guide_sub: "اكتب الرابط الثابت داخل الشريحة مرة واحدة ولن تحتاج لتغييرها أبداً!",
      copy_wifi_pass: "نسخ كلمة مرور الواي فاي",
      share_gps_wa: "إرسال موقعي الجغرافي عبر واتساب",
      bulk_apply_btn: "تطبيق على جميع البطاقات المحددة ✓",
      bulk_cancel_btn: "إلغاء",
      bulk_desc_hint: "ستتحول كافة البطاقات المحددة فوراً إلى هذا الرابط الجديد عند أول مسحة قادمة."
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
