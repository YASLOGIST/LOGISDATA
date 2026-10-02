import type { Language, LocalizedText } from "./types";

export const LANGUAGES: readonly Language[] = ["en", "ar"];

export const LOCALES: Record<Language, string> = { en: "en-US", ar: "ar-EG" };

export function isLanguage(value: unknown): value is Language {
  return value === "en" || value === "ar";
}

export function text(value: LocalizedText, language: Language): string {
  return value[language];
}

export function isRtl(language: Language): boolean {
  return language === "ar";
}

/**
 * `Intl.NumberFormat` construction is one of the most expensive calls in
 * the browser's i18n layer. The formatters are cached by locale + option signature.
 */
const formatterCache = new Map<string, Intl.NumberFormat>();

function formatter(language: Language, options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = `${language}|${JSON.stringify(options)}`;
  let cached = formatterCache.get(key);
  if (!cached) {
    cached = new Intl.NumberFormat(LOCALES[language], options);
    formatterCache.set(key, cached);
  }
  return cached;
}

export function number(value: number, language: Language, maximumFractionDigits = 1): string {
  return formatter(language, {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits,
  }).format(value);
}

export function integer(value: number, language: Language): string {
  return formatter(language, { maximumFractionDigits: 0 }).format(value);
}

export function currency(value: number, language: Language): string {
  return formatter(language, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);
}

export function percent(value: number, language: Language, maximumFractionDigits = 1): string {
  return formatter(language, {
    style: "percent",
    maximumFractionDigits,
  }).format(value);
}

export function decimals(value: number, language: Language, digits: number): string {
  return formatter(language, {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(value);
}

/**
 * UI chrome strings. Full parity across English and Arabic.
 */
export const ui = {
  presentationLandmark: {
    en: "Supply chain audit presentation",
    ar: "عرض تدقيق سلسلة الإمداد",
  },
  skipToContent: { en: "Skip to presentation content", ar: "تخطَّ إلى محتوى العرض" },
  enterControlRoom: { en: "Enter Control Room", ar: "ادخل غرفة التحكم" },
  introSubtitle: {
    en: "Executive Supply Chain & Data Audit Presentation",
    ar: "عرض تنفيذي لتدقيق سلسلة الإمداد والبيانات",
  },
  introFooter: {
    en: "AAST // EXECUTIVE DATA LAB — CONTROL ROOM ACCESS",
    ar: "AAST // مختبر البيانات التنفيذي — الدخول إلى غرفة التحكم",
  },
  universityAr: { en: "الأكاديمية العربية للعلوم والتكنولوجيا والنقل البحري", ar: "الأكاديمية العربية للعلوم والتكنولوجيا والنقل البحري" },
  universityEn: {
    en: "Arab Academy for Science, Technology & Maritime Transport",
    ar: "Arab Academy for Science, Technology & Maritime Transport",
  },
  by: { en: "BY", ar: "إعداد" },
  reg: { en: "REG", ar: "القيد" },
  loadingEngine: { en: "Initializing the audit engine", ar: "جارٍ تشغيل محرك التدقيق" },
  loadingModel: { en: "Loading audit model", ar: "جارٍ تحميل نموذج التدقيق" },
  engineFailedTitle: { en: "The visualization engine could not start.", ar: "تعذر تشغيل محرك العرض المرئي." },
  engineFailedBody: {
    en: "Check that hardware acceleration is enabled, then retry — or open the text-only briefing.",
    ar: "تأكد من تفعيل تسريع العتاد ثم أعد المحاولة، أو افتح الإحاطة النصية.",
  },
  retryEngine: { en: "Retry engine", ar: "إعادة تشغيل المحرك" },
  openHandout: { en: "Open text briefing", ar: "فتح الإحاطة النصية" },
  recovery: { en: "CONTROL ROOM / RECOVERY", ar: "غرفة التحكم / الاستعادة" },
  noWebglTitle: { en: "3D rendering is unavailable on this device.", ar: "العرض ثلاثي الأبعاد غير متاح على هذا الجهاز." },
  noWebglBody: {
    en: "The full audit — every table, metric and finding — is available as an accessible text briefing.",
    ar: "التدقيق الكامل بكل الجداول والمؤشرات والنتائج متاح كإحاطة نصية يسهل الوصول إليها.",
  },
  progress: { en: "Presentation progress", ar: "تقدم العرض" },
  sections: { en: "Presentation sections", ar: "أقسام العرض" },
  goToStart: { en: "Go to presentation start", ar: "الانتقال إلى بداية العرض" },
  exportCsv: { en: "Export CSV", ar: "تصدير CSV" },
  exportJson: { en: "Export JSON Audit", ar: "تصدير تدقيق JSON" },
  exportedToast: { en: "Dataset downloaded", ar: "تم تنزيل مجموعة البيانات" },
  shortcuts: { en: "Keyboard shortcuts", ar: "اختصارات لوحة المفاتيح" },
  closeDialog: { en: "Close", ar: "إغلاق" },
  shortcutNext: { en: "Next section", ar: "القسم التالي" },
  shortcutPrev: { en: "Previous section", ar: "القسم السابق" },
  shortcutFirst: { en: "First section", ar: "القسم الأول" },
  shortcutLast: { en: "Last section", ar: "القسم الأخير" },
  shortcutJump: { en: "Jump to section 1–5", ar: "الانتقال إلى القسم ١-٥" },
  shortcutTheme: { en: "Toggle theme", ar: "تبديل المظهر" },
  shortcutLanguage: { en: "Toggle language", ar: "تبديل اللغة" },
  shortcutHelp: { en: "Open this help", ar: "فتح هذه المساعدة" },
  nowViewing: { en: "Now viewing", ar: "المعروض الآن" },
  handoutTitle: { en: "Text briefing", ar: "الإحاطة النصية" },
  handoutLead: {
    en: "A complete, printable, screen-reader-first version of the control room audit. No WebGL required.",
    ar: "نسخة كاملة قابلة للطباعة ومهيأة لقارئات الشاشة من تدقيق غرفة التحكم. لا تتطلب WebGL.",
  },
  backToControlRoom: { en: "Open the 3D control room", ar: "افتح غرفة التحكم ثلاثية الأبعاد" },
  print: { en: "Print / save as PDF", ar: "طباعة / حفظ PDF" },
  quality: { en: "Visual quality", ar: "جودة العرض" },
  qualityHigh: { en: "High", ar: "عالية" },
  qualityMedium: { en: "Balanced", ar: "متوازنة" },
  qualityLow: { en: "Calm", ar: "هادئة" },

  // Scenario engine strings
  scenarioLabel: { en: "Audit Mode", ar: "نمط التدقيق" },
  scenarioBaseline: { en: "01 Raw Discrepancy", ar: "٠١ فروقات غير مدققة" },
  scenarioActive: { en: "02 Active Audit Gate", ar: "٠٢ بوابة تدقيق نشطة" },
  scenarioMitigated: { en: "03 Closed-Loop Optim", ar: "٠٣ حلقة تحسين كاملة" },

  // Live Telemetry
  telemetryTitle: { en: "Live Audit Telemetry Stream", ar: "تدفق تليماتكس التدقيق اللحظي" },
  telemetryToggle: { en: "Live Telemetry", ar: "التليماتكس المباشر" },
  telemetryPause: { en: "Pause", ar: "إيقاف مؤقت" },
  telemetryResume: { en: "Resume", ar: "استئناف" },
  livePulse: { en: "STREAM ACTIVE", ar: "البث نشط" },

  // Recovery Calculator
  calculatorTitle: { en: "Executive Margin Recovery Calculator", ar: "حاسبة استرداد الهامش التنفيذية" },
  calculatorOpen: { en: "ROI Calculator", ar: "حاسبة العائد" },
  annualFreightSpend: { en: "Annual Freight Spend", ar: "الإنفاق السنوي على الشحن" },
  annualOrderUnits: { en: "Annual Order Volume", ar: "حجم الطلبات السنوي" },
  skuCatalogSize: { en: "Catalog SKU Count", ar: "عدد أصناف الكتالوج" },
  freightRecovery: { en: "Freight & Billing Audit", ar: "تدقيق الشحن والفوترة" },
  bullwhipRecovery: { en: "Bullwhip Buffer Release", ar: "تحرير مخزون التضخيم" },
  routeRecovery: { en: "Route & Fuel Efficiency", ar: "كفاءة المسارات والوقود" },
  warehouseRecovery: { en: "Warehouse Variance Rectification", ar: "تصحيح فروقات المستودع" },
  totalAnnualRecovery: { en: "Total Annual Recovered Value", ar: "إجمالي القيمة المستردة سنويًا" },
  marginExpansion: { en: "EBITDA Margin Expansion", ar: "تحسن هامش الأرباح" },
  paybackPeriod: { en: "Payback Period", ar: "فترة الاسترداد" },
  months: { en: "months", ar: "أشهر" },
  basisPoints: { en: "bps", ar: "نقطة أساس" },

  // Sound FX
  soundOn: { en: "AUDIO: ON", ar: "الصوت: مفعّل" },
  soundOff: { en: "AUDIO: MUTED", ar: "الصوت: صامت" },

  // Node Inspector & Table Filters
  nodeInspection: { en: "Node Telemetry", ar: "تليماتكس العقدة" },
  allRecords: { en: "All", ar: "الكل" },
  search: { en: "Search...", ar: "بحث..." },
  filter: { en: "Filter", ar: "تصفية" },
  status: { en: "Status", ar: "الحالة" },
  verified: { en: "Verified", ar: "موثق" },
  leakRisk: { en: "Leak Risk", ar: "مخاطر تسرب" },
  phantom: { en: "Phantom Signal", ar: "إشارة وهمية" },
  anomalies: { en: "Detected Anomalies", ar: "الانحرافات المكتشفة" },
  throughput: { en: "Throughput (Tons)", ar: "معدل التدفق (طن)" },
  carriers: { en: "Active Carriers", ar: "الناقلون النشطون" },
  transitVariance: { en: "Transit Variance", ar: "تباين وقت النقل" },
  hours: { en: "hrs", ar: "ساعة" },
} satisfies Record<string, LocalizedText>;

export type UiKey = keyof typeof ui;

export function t(key: UiKey, language: Language): string {
  return ui[key][language];
}
