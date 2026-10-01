"use client";

import Image from "next/image";
import Link from "next/link";
import { ArrowLeft, ArrowRight, FileText, Languages, Moon, ShieldCheck, Sun } from "lucide-react";
import { presentationCopy } from "@/lib/data";
import { t, text } from "@/lib/i18n";
import { usePreferences } from "@/components/providers/PreferencesProvider";

interface IntroScreenProps {
  onEnter: () => void;
}

export function IntroScreen({ onEnter }: IntroScreenProps) {
  const { language, theme, rtl, toggleLanguage, toggleTheme } = usePreferences();
  const Arrow = rtl ? ArrowLeft : ArrowRight;

  // The cover deliberately uses CSS keyframes instead of framer-motion:
  // the animation engine is ~45 kB gzipped and the cover only needs two
  // fades, so loading it here would make every visitor pay for the deck's
  // animation runtime before deciding to enter. `prefers-reduced-motion`
  // is handled by the stylesheet, not by JavaScript.
  return (
    <div className="intro-screen intro-enter" dir={rtl ? "rtl" : "ltr"}>
      <div className="intro-grid" aria-hidden="true" />
      <div className="intro-glow intro-glow-a" aria-hidden="true" />
      <div className="intro-glow intro-glow-b" aria-hidden="true" />

      <div className="intro-controls">
        <button
          className="control-button"
          type="button"
          onClick={toggleLanguage}
          aria-label={text(presentationCopy.nav.language, language)}
        >
          <Languages size={15} aria-hidden="true" />
          <span>{language === "en" ? "AR" : "EN"}</span>
        </button>
        <button
          className="control-button"
          type="button"
          onClick={toggleTheme}
          aria-label={text(presentationCopy.nav.theme, language)}
          aria-pressed={theme === "light"}
        >
          {theme === "dark" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
          <span>{theme === "dark" ? "LIGHT" : "DARK"}</span>
        </button>
      </div>

      <main className="intro-card intro-rise">
        <div className="intro-logo-frame">
          <Image
            src="/aast-logo.png"
            alt={t("universityEn", language)}
            width={104}
            height={103}
            className="intro-logo"
            priority
            sizes="104px"
          />
        </div>

        <p className="intro-university-ar" lang="ar" dir="rtl">
          {t("universityAr", language)}
        </p>
        <p className="intro-university-en" lang="en" dir="ltr">
          {t("universityEn", language)}
        </p>

        <span className="intro-divider" aria-hidden="true" />

        <h1 className="intro-eyebrow">
          <ShieldCheck size={13} aria-hidden="true" />
          <span>{t("introSubtitle", language)}</span>
        </h1>

        <div className="intro-credit">
          <p className="intro-credit-line">
            <span className="intro-credit-key">{t("by", language)}</span>
            <span className="intro-credit-colon" aria-hidden="true">:</span>
            <span className="intro-credit-value">{presentationCopy.hero.presenter}</span>
          </p>
          <p className="intro-credit-line">
            <span className="intro-credit-key">{t("reg", language)}</span>
            <span className="intro-credit-colon" aria-hidden="true">:</span>
            <span className="intro-credit-value" dir="ltr">{presentationCopy.hero.registration}</span>
          </p>
        </div>

        <div className="intro-actions">
          <button type="button" className="intro-enter-btn" onClick={onEnter}>
            <span>{t("enterControlRoom", language)}</span>
            <Arrow size={16} aria-hidden="true" />
          </button>
          <Link className="intro-secondary-btn" href="/handout" prefetch={false}>
            <FileText size={14} aria-hidden="true" />
            <span>{t("openHandout", language)}</span>
          </Link>
        </div>
      </main>

      <p className="intro-footer-note">{t("introFooter", language)}</p>
    </div>
  );
}
