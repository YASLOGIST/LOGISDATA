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
 * the browser's i18n layer. The previous implementation built a fresh
 * formatter for every number rendered -- in the audit table alone that is
 * 20 constructions per render, re-run on every framer-motion frame. The
 * formatters are now cached by locale + option signature.
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
 * UI chrome strings. Previously the intro screen, the engine error
 * boundary and several aria-labels were hard-coded English, so an Arabic
 * visitor hit three untranslated screens before reaching localized content.
 */
export const ui = {
  presentationLandmark: {
    en: "Supply chain audit presentation",
    ar: "\u0639\u0631\u0636 \u062a\u062f\u0642\u064a\u0642 \u0633\u0644\u0633\u0644\u0629 \u0627\u0644\u0625\u0645\u062f\u0627\u062f",
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
} satisfies Record<string, LocalizedText>;

export type UiKey = keyof typeof ui;

export function t(key: UiKey, language: Language): string {
  return ui[key][language];
}
