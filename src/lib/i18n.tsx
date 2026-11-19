import React, { createContext, useContext, useEffect, useState, type ReactNode } from "react";

export type Language = "en" | "hi";

type Translations = Record<string, { en: string; hi: string }>;

export const translations: Translations = {
  // Navigation & Header
  nav_brand: { en: "InfraTrack", hi: "इन्फ्राट्रैक" },
  nav_home: { en: "Home", hi: "होम" },
  nav_map: { en: "City Map", hi: "शहर का नक्शा" },
  nav_about: { en: "About", hi: "परिचय" },
  nav_dashboard: { en: "Dashboard", hi: "डैशबोर्ड" },
  nav_report: { en: "Report Issue", hi: "समस्या दर्ज करें" },
  nav_my_complaints: { en: "My Complaints", hi: "मेरी शिकायतें" },
  nav_notifications: { en: "Notifications", hi: "सूचनाएं" },
  nav_profile: { en: "Profile", hi: "प्रोफ़ाइल" },
  nav_admin_dashboard: { en: "Admin Dashboard", hi: "प्रशासन डैशबोर्ड" },
  nav_manage_complaints: { en: "Manage Complaints", hi: "शिकायत प्रबंधन" },
  nav_analytics: { en: "Analytics", hi: "विश्लेषण" },
  nav_departments: { en: "Departments", hi: "विभाग" },
  nav_signin: { en: "Sign in", hi: "लॉग इन" },
  nav_signup: { en: "Create account", hi: "खाता बनाएं" },
  nav_signout: { en: "Sign out", hi: "लॉग आउट" },
  nav_godashboard: { en: "Go to dashboard", hi: "डैशबोर्ड पर जाएं" },
  role_citizen: { en: "Citizen", hi: "नागरिक" },
  role_authority: { en: "Authority", hi: "प्राधिकरण" },

  // Hero Section
  hero_badge: { en: "Civic Infrastructure Platform", hi: "नागरिक बुनियादी ढांचा मंच" },
  hero_title: {
    en: "Report city issues. Watch them get fixed.",
    hi: "शहर की समस्याएं दर्ज करें। समाधान लाइव देखें।",
  },
  hero_subtitle: {
    en: "Potholes, broken streetlights, blocked drains, garbage and water leaks — pin the exact location, dispatch to municipal authorities, and follow every status update in real time.",
    hi: "सड़क के गड्ढे, टूटी स्ट्रीटलाइट, बंद नालियां, कचरा और पानी का रिसाव — सटीक स्थान चिह्नित करें, नगर निगम को भेजें और रीयल-टाइम में समाधान देखें।",
  },
  hero_btn_report: { en: "Report an Issue", hi: "समस्या दर्ज करें" },
  hero_btn_map: { en: "Explore Live Map", hi: "लाइव नक्शा देखें" },
  stat_total_complaints: { en: "Total Complaints", hi: "कुल शिकायतें" },
  stat_resolved: { en: "Resolved", hi: "समाधान हुआ" },
  stat_in_queue: { en: "In Queue", hi: "प्रक्रियाधीन" },
  stat_resolution_rate: { en: "Resolution Rate", hi: "समाधान दर" },
  stat_active_wards: { en: "Covered Zones", hi: "सक्रिय क्षेत्र" },
  stat_avg_response: { en: "Avg. Response", hi: "औसत प्रतिक्रिया" },

  // Features
  feat_pinpoint_title: { en: "Pin-point GIS Mapping", hi: "सटीक जीआईएस मैपिंग" },
  feat_pinpoint_desc: {
    en: "Drop a marker on the map or use GPS auto-location with address auto-fill.",
    hi: "नक्शे पर मार्कर लगाएं या पते के साथ त्वरित जीपीएस स्थान का उपयोग करें।",
  },
  feat_routing_title: { en: "Intelligent Department Routing", hi: "स्मार्ट विभाग आवंटन" },
  feat_routing_desc: {
    en: "Each issue is automatically routed to Roads, Drainage, Sanitation or Water boards.",
    hi: "सड़क, जल निकासी, स्वच्छता या जल बोर्ड को स्वचालित रूप से शिकायत अग्रेषित होती है।",
  },
  feat_status_title: { en: "Live Status Trail", hi: "लाइव स्टेटस ट्रेल" },
  feat_status_desc: {
    en: "Pending, Assigned, In Progress, and Resolved with remarks and timestamps at each step.",
    hi: "लंबित, आवंटित, प्रगति में और समाधान — प्रत्येक चरण पर स्पष्ट टिप्पणियों सहित।",
  },
  feat_analytics_title: { en: "Open Civic Analytics", hi: "पारदर्शी नागरिक विश्लेषण" },
  feat_analytics_desc: {
    en: "Category trends, department load and resolution rates open to all citizens.",
    hi: "श्रेणी रुझान, विभाग का कार्यभार और समाधान दर सभी नागरिकों के लिए खुली है।",
  },

  // How It Works
  how_it_works_title: { en: "How InfraTrack Works", hi: "इन्फ्राट्रैक कैसे काम करता है" },
  how_it_works_subtitle: {
    en: "A clear, 4-step transparent workflow connecting citizens directly with city response teams.",
    hi: "नागरिकों को शहर के प्रतिक्रिया दलों से सीधे जोड़ने वाली 4-चरणीय पारदर्शी प्रक्रिया।",
  },
  step1_title: { en: "1. Spot & Pin", hi: "1. पहचानें और पिन करें" },
  step1_desc: {
    en: "Select category, describe the issue, and pin the location on our interactive map.",
    hi: "समस्या की श्रेणी चुनें, विवरण दें और इंटरैक्टिव नक्शे पर स्थान चिह्नित करें।",
  },
  step2_title: { en: "2. Auto Dispatch", hi: "2. त्वरित आवंटन" },
  step2_desc: {
    en: "The complaint is immediately assigned to the municipal department and field officer.",
    hi: "शिकायत तुरंत संबंधित नगरपालिका विभाग और फील्ड अधिकारी को भेजी जाती है।",
  },
  step3_title: { en: "3. Field Repair", hi: "3. फील्ड मरम्मत" },
  step3_desc: {
    en: "City crews inspect on-site, post progress remarks, and execute required work.",
    hi: "नगर निगम की टीम मौके पर निरीक्षण करती है, प्रगति दर्ज करती है और मरम्मत करती है।",
  },
  step4_title: { en: "4. Verified Fix", hi: "4. सत्यापित समाधान" },
  step4_desc: {
    en: "The ticket is resolved, logged in the public ledger, and notified to citizens.",
    hi: "शिकायत हल की जाती है, सार्वजनिक बहीखाते में दर्ज होती है और नागरिक को सूचना मिलती है।",
  },

  // Live Civic Activity
  live_activity_title: { en: "Live Civic Activity", hi: "लाइव नागरिक गतिविधि" },
  live_activity_subtitle: {
    en: "Recent public infrastructure reports and resolution updates.",
    hi: "हाल की सार्वजनिक बुनियादी ढांचा रिपोर्ट और समाधान अपडेट।",
  },
  view_all_map: { en: "View All on Map", hi: "नक्शे पर सभी देखें" },
  no_complaints: { en: "No complaints found.", hi: "कोई शिकायत नहीं मिली।" },

  // Profile Page
  profile_title: { en: "Account Profile", hi: "खाता प्रोफ़ाइल" },
  profile_subtitle: {
    en: "Manage your personal information, profile photo, authority access, and notification settings.",
    hi: "अपनी व्यक्तिगत जानकारी, प्रोफ़ाइल फ़ोटो, प्राधिकरण एक्सेस और सूचनाएं प्रबंधित करें।",
  },
  profile_photo_title: { en: "Profile Photo", hi: "प्रोफ़ाइल फ़ोटो" },
  profile_photo_desc: {
    en: "Upload a personalized photo for your citizen and authority ID badge.",
    hi: "अपने नागरिक और प्राधिकरण पहचान बैज के लिए व्यक्तिगत फ़ोटो अपलोड करें।",
  },
  upload_photo: { en: "Upload Photo", hi: "फ़ोटो अपलोड करें" },
  change_photo: { en: "Change Photo", hi: "फ़ोटो बदलें" },
  remove_photo: { en: "Remove", hi: "हटाएं" },
  photo_requirements: {
    en: "PNG, JPG or WebP up to 5MB. Stored with instant live sync.",
    hi: "PNG, JPG या WebP (अधिकतम 5MB)। रीयल-टाइम सिंक के साथ सुरक्षित।",
  },
  account_details_title: { en: "Personal Details", hi: "व्यक्तिगत विवरण" },
  full_name_label: { en: "Full Name", hi: "पूरा नाम" },
  email_label: { en: "Email Address", hi: "ईमेल पता" },
  phone_label: { en: "Phone Number", hi: "फ़ोन नंबर" },
  member_since: { en: "Member since", hi: "सदस्यता तिथि" },
  save_changes: { en: "Save Changes", hi: "बदलाव सहेजें" },
  saving: { en: "Saving…", hi: "सहेजा जा रहा है…" },
  access_level_title: { en: "Role & Authority Access", hi: "भूमिका और प्राधिकरण पहुंच" },
  signed_in_as: { en: "You are signed in as", hi: "आप इस रूप में साइन इन हैं:" },
  authority_privileges: {
    en: "You hold administrative access to manage complaints, reassign departments, and view analytics.",
    hi: "आपके पास शिकायतों का प्रबंधन, विभाग पुनरावंटन और शहर विश्लेषण देखने का प्रशासनिक अधिकार है।",
  },
  citizen_privileges: {
    en: "Standard citizen access. To unlock municipal authority tools, enter your department code below.",
    hi: "मानक नागरिक पहुंच। नगर निगम प्राधिकरण उपकरण सक्रिय करने के लिए अपना कोड दर्ज करें।",
  },
  authority_code_label: { en: "Authority Access Code", hi: "प्राधिकरण एक्सेस कोड" },
  authority_code_placeholder: {
    en: "Enter the code given by your department",
    hi: "अपने विभाग द्वारा दिया गया कोड दर्ज करें",
  },
  unlock_authority_btn: { en: "Unlock Authority Access", hi: "प्राधिकरण पहुंच अनलॉक करें" },
  demo_code_hint: { en: "Demo code", hi: "डेमो कोड" },
  notifications_title: { en: "Notification Preferences", hi: "सूचना प्राथमिकताएं" },
  notifications_desc: {
    en: "Choose how and when InfraTrack alerts you about civic updates.",
    hi: "चुनें कि इन्फ्राट्रैक आपको नागरिक अपडेट के बारे में कब और कैसे सूचित करे।",
  },
  notify_status: { en: "Status updates on my complaints", hi: "मेरी शिकायतों पर स्थिति अपडेट" },
  notify_status_sub: {
    en: "Instant alert when department takes action or resolves",
    hi: "विभाग द्वारा कार्रवाई करने या समाधान करने पर तुरंत अलर्ट",
  },
  notify_nearby: { en: "Neighborhood civic alerts", hi: "आस-पड़ोस के नागरिक अलर्ट" },
  notify_nearby_sub: {
    en: "Alerts for major road work and water shutdowns in your ward",
    hi: "आपके वार्ड में प्रमुख सड़क कार्य और पानी कटौती की सूचना",
  },
  notify_email: { en: "Weekly municipal digest", hi: "साप्ताहिक नगरपालिका सारांश" },
  notify_email_sub: {
    en: "Summary of resolved civic issues in your municipality",
    hi: "आपकी नगरपालिका में हल की गई नागरिक समस्याओं का सारांश",
  },
  saved_prefs: { en: "Preferences saved", hi: "प्राथमिकताएं सहेजी गईं" },

  // Categories
  cat_road_pothole: { en: "Road / Pothole", hi: "सड़क / गड्ढा" },
  cat_streetlight: { en: "Streetlight", hi: "स्ट्रीटलाइट" },
  cat_drainage: { en: "Drainage", hi: "जल निकासी" },
  cat_garbage: { en: "Garbage / Sanitation", hi: "कचरा / स्वच्छता" },
  cat_water_leakage: { en: "Water Leakage", hi: "पानी का रिसाव" },
  cat_traffic_signage: { en: "Traffic / Signage", hi: "यातायात / संकेत" },
  cat_public_property: { en: "Public Property", hi: "सार्वजनिक संपत्ति" },
  cat_other: { en: "Other", hi: "अन्य" },

  // Statuses
  status_pending: { en: "Pending", hi: "लंबित" },
  status_assigned: { en: "Assigned", hi: "आवंटित" },
  status_in_progress: { en: "In Progress", hi: "प्रगति में" },
  status_resolved: { en: "Resolved", hi: "समाधान हुआ" },
  status_rejected: { en: "Rejected", hi: "अस्वीकृत" },

  // Priorities
  prio_low: { en: "Low", hi: "कम" },
  prio_medium: { en: "Medium", hi: "मध्यम" },
  prio_high: { en: "High", hi: "उच्च" },

  // Footer
  footer_tagline: {
    en: "Empowering citizens and municipal authorities with transparent, real-time infrastructure maintenance.",
    hi: "पारदर्शी और रीयल-टाइम बुनियादी ढांचा रखरखाव के साथ नागरिकों और नगर पालिकाओं को सशक्त बनाना।",
  },
  footer_quick_links: { en: "Quick Links", hi: "त्वरित लिंक" },
  footer_departments: { en: "Municipal Departments", hi: "नगर निगम विभाग" },
  footer_helplines: { en: "Civic Helplines", hi: "नागरिक हेल्पलाइन" },
  footer_emergency: { en: "Emergency Control: 112", hi: "आपातकालीन नियंत्रण: 112" },
  footer_civic_call: { en: "Municipal Helpline: 1916", hi: "नगर निगम हेल्पलाइन: 1916" },
  footer_water_board: { en: "Water & Sewage Board: 1913", hi: "जल एवं सीवेज बोर्ड: 1913" },
  footer_power_board: { en: "Electricity Grievance: 1912", hi: "विद्युत शिकायत: 1912" },
  footer_rights: {
    en: "All rights reserved. Dedicated to clean, safe, and transparent Indian cities.",
    hi: "सर्वाधिकार सुरक्षित। स्वच्छ, सुरक्षित और पारदर्शी भारतीय शहरों को समर्पित।",
  },

  // Community Upvoting
  confirm_issue: { en: "+1 Confirm Issue", hi: "+1 समस्या की पुष्टि करें" },
  confirmed_issue: { en: "Confirmed", hi: "पुष्टि की गई" },
  upvotes_count: { en: "confirmations", hi: "पुष्टियां" },
  prio_community_verified: {
    en: "High Priority (Community Verified)",
    hi: "उच्च प्राथमिकता (समुदाय द्वारा सत्यापित)",
  },
  sort_upvoted: { en: "Most Upvoted", hi: "सर्वाधिक पुष्ट" },
  sort_newest: { en: "Newest First", hi: "नवीनतम पहले" },
  sort_by: { en: "Sort by", hi: "क्रमबद्ध करें" },

  // Leaderboard
  leaderboard_title: {
    en: "Top Performing Departments & Wards",
    hi: "शीर्ष प्रदर्शन करने वाले विभाग और वार्ड",
  },
  leaderboard_subtitle: {
    en: "Live municipal accountability index based on resolution rate, speed, and volume.",
    hi: "समाधान दर, गति और संख्या पर आधारित लाइव नगरपालिका जवाबदेही सूचकांक।",
  },
  leaderboard_preview_title: {
    en: "Top Performing Municipal Departments",
    hi: "शीर्ष प्रदर्शन करने वाले नगर निगम विभाग",
  },
  avg_fix_time: { en: "Avg. Fix Time", hi: "औसत समाधान समय" },
  active_cases: { en: "Active", hi: "सक्रिय" },
  resolved_cases: { en: "Resolved", hi: "समाधान हुआ" },
  rank_badge: { en: "Rank", hi: "रैंक" },
  view_full_leaderboard: { en: "View Full Leaderboard", hi: "पूरा लीडरबोर्ड देखें" },

  // Photo Uploads & Proof
  attach_photo_label: {
    en: "Attach Issue Photo",
    hi: "समस्या की फोटो संलग्न करें",
  },
  attach_photo_hint: {
    en: "Upload on-site evidence (JPG/PNG). Client-compressed for instant upload.",
    hi: "मौके का फोटो अपलोड करें (JPG/PNG)। त्वरित अपलोड हेतु स्वतः संपीड़ित।",
  },
  resolution_photo_label: {
    en: "Resolution Proof Photo",
    hi: "समाधान की फोटो अपलोड करें",
  },
  resolution_photo_hint: {
    en: "Attach a photo verifying repair or resolution completion.",
    hi: "मरम्मत या समाधान पूर्ण होने का सत्यापन फोटो संलग्न करें।",
  },
  before_photo_label: { en: "Before (Reported)", hi: "पहले (दर्ज शिकायत)" },
  after_photo_label: { en: "After (Resolved)", hi: "बाद में (समाधान उपरांत)" },
  side_by_side_title: {
    en: "Before & After Resolution Verification",
    hi: "समाधान सत्यापन: पहले और बाद की तुलना",
  },
  resolution_photo_pending: {
    en: "Official resolution photo will be uploaded once repairs are completed by the field crew.",
    hi: "फील्ड टीम द्वारा मरम्मत पूरी होने पर आधिकारिक समाधान फोटो अपलोड की जाएगी।",
  },
  click_to_enlarge: { en: "Click to inspect full photo", hi: "बड़ा करके देखने के लिए क्लिक करें" },
  close_lightbox: { en: "Close Preview", hi: "पूर्वावलोकन बंद करें" },
};

type LanguageContextType = {
  lang: Language;
  setLang: (lang: Language) => void;
  toggleLang: () => void;
  t: (key: string, defaultVal?: string) => string;
};

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
  toggleLang: () => {},
  t: (k, d) => d ?? k,
});

const STORAGE_KEY = "infratrack_lang";

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Language>("en");

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as Language | null;
      if (saved === "en" || saved === "hi") {
        setLangState(saved);
      }
    } catch {
      // ignore
    }
  }, []);

  const setLang = (next: Language) => {
    setLangState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // ignore
    }
  };

  const toggleLang = () => {
    setLang(lang === "en" ? "hi" : "en");
  };

  const t = (key: string, defaultVal?: string): string => {
    const entry = translations[key];
    if (entry && entry[lang]) {
      return entry[lang];
    }
    return defaultVal ?? entry?.en ?? key;
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang, toggleLang, t }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);

export function LanguageToggle({ className }: { className?: string }) {
  const { lang, setLang } = useLanguage();

  return (
    <div
      role="group"
      aria-label="Language selection"
      className={`inline-flex items-center rounded-lg border border-border/80 bg-background/80 p-0.5 text-xs font-medium shadow-xs backdrop-blur-xs ${
        className ?? ""
      }`}
    >
      <button
        type="button"
        onClick={() => setLang("en")}
        className={`rounded-md px-2.5 py-1 transition-all ${
          lang === "en"
            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => setLang("hi")}
        className={`rounded-md px-2.5 py-1 transition-all ${
          lang === "hi"
            ? "bg-primary text-primary-foreground font-semibold shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        हिंदी
      </button>
    </div>
  );
}
