import { describe, expect, it } from "vitest";
import { currency, decimals, integer, isLanguage, isRtl, number, percent, t, text, ui } from "@/lib/i18n";
import { presentationCopy } from "@/lib/data";

describe("language guards", () => {
  it("accepts only supported languages", () => {
    expect(isLanguage("en")).toBe(true);
    expect(isLanguage("ar")).toBe(true);
    expect(isLanguage("fr")).toBe(false);
    expect(isLanguage(undefined)).toBe(false);
  });

  it("marks Arabic as RTL", () => {
    expect(isRtl("ar")).toBe(true);
    expect(isRtl("en")).toBe(false);
  });
});

describe("text", () => {
  it("selects the requested locale", () => {
    expect(text(presentationCopy.nav.theme, "en")).toBe("Theme");
    expect(text(presentationCopy.nav.theme, "ar")).toBe("المظهر");
  });
});

describe("number formatting", () => {
  it("formats with the locale's numerals", () => {
    expect(number(1234.56, "en", 1)).toBe("1,234.6");
    expect(integer(1234, "en")).toBe("1,234");
    // Arabic-Indic digits, not Latin digits.
    expect(integer(1234, "ar")).toMatch(/[٠-٩]/);
  });

  it("formats compact USD currency", () => {
    expect(currency(428_000, "en")).toBe("$428K");
  });

  it("formats percentages and fixed decimals", () => {
    expect(percent(0.9048, "en", 1)).toBe("90.5%");
    expect(decimals(2, "en", 1)).toBe("2.0");
    expect(decimals(2, "en", 0)).toBe("2");
  });

  it("returns a stable result when called repeatedly (formatter cache)", () => {
    const first = number(9876.54, "en", 2);
    const second = number(9876.54, "en", 2);
    expect(first).toBe(second);
    expect(first).toBe("9,876.54");
  });
});

describe("ui chrome strings", () => {
  it("has a non-empty translation for both languages for every key", () => {
    for (const [key, value] of Object.entries(ui)) {
      expect(value.en, `${key}.en`).toBeTruthy();
      expect(value.ar, `${key}.ar`).toBeTruthy();
    }
  });

  it("resolves through t()", () => {
    expect(t("retryEngine", "en")).toBe("Retry engine");
    expect(t("retryEngine", "ar")).toBe("إعادة تشغيل المحرك");
  });
});
