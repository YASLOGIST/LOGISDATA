import type { Language, LocalizedText } from "./types";

export function text(value: LocalizedText, language: Language): string {
  return value[language];
}

export function number(value: number, language: Language, maximumFractionDigits = 1): string {
  return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US", {
    maximumFractionDigits,
    minimumFractionDigits: maximumFractionDigits,
  }).format(value);
}

export function integer(value: number, language: Language): string {
  return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US", {
    maximumFractionDigits: 0,
  }).format(value);
}

export function currency(value: number, language: Language): string {
  return new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: "compact",
  }).format(value);
}
