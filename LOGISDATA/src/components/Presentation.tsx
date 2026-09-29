"use client";

import { Canvas } from "@react-three/fiber";
import { Html, Scroll, ScrollControls, useScroll } from "@react-three/drei";
import { motion, useReducedMotion } from "framer-motion";
import { Languages, Moon, Sun, ChevronDown } from "lucide-react";
import { Suspense, useCallback, useEffect, useRef, useState } from "react";
import { presentationCopy } from "@/lib/data";
import { text } from "@/lib/i18n";
import type { Language, ThemeMode } from "@/lib/types";
import { AuditSection } from "@/components/sections/AuditSection";
import { DemandSection } from "@/components/sections/DemandSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { RoutesSection } from "@/components/sections/RoutesSection";
import { WarehouseSection } from "@/components/sections/WarehouseSection";
import { IndustrialScene } from "@/components/three/IndustrialScene";

const SECTION_COUNT = presentationCopy.nav.sections.length;
const LANGUAGE_KEY = "logisdata.language";
const THEME_KEY = "logisdata.theme";

function storedPreference<T extends string>(key: string, allowed: readonly T[], fallback: T): T {
  if (typeof window === "undefined") return fallback;
  const value = window.localStorage.getItem(key);
  return allowed.includes(value as T) ? value as T : fallback;
}

interface ScrollBridgeProps {
  onReady: (element: HTMLDivElement) => void;
}

function ScrollBridge({ onReady }: ScrollBridgeProps) {
  const scroll = useScroll();
  useEffect(() => {
    onReady(scroll.el);
  }, [onReady, scroll.el]);
  return null;
}

function SceneLoader({ language }: { language: Language }) {
  return (
    <Html center>
      <div className="scene-loader">
        <div className="loader-orbit"><span /></div>
        <strong>AAST / CONTROL ROOM</strong>
        <span>{language === "ar" ? "جارٍ تحميل نموذج التدقيق" : "Loading audit model"}</span>
      </div>
    </Html>
  );
}

export function Presentation() {
  const [language, setLanguage] = useState<Language>(() => storedPreference(LANGUAGE_KEY, ["en", "ar"], "en"));
  const [theme, setTheme] = useState<ThemeMode>(() => storedPreference(THEME_KEY, ["dark", "light"], "dark"));
  const [activeSection, setActiveSection] = useState(0);
  const [pageVisible, setPageVisible] = useState(true);
  const reduceMotion = useReducedMotion();
  const scrollElement = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement>(null);
  const onSectionChange = useCallback((section: number) => setActiveSection(section), []);
  const onScrollReady = useCallback((element: HTMLDivElement) => {
    scrollElement.current = element;
  }, []);

  const goToSection = useCallback((section: number) => {
    const element = scrollElement.current;
    if (!element) return;
    element.scrollTo({
      top: section * element.clientHeight,
      behavior: reduceMotion ? "auto" : "smooth",
    });
  }, [reduceMotion]);

  const toggleLanguage = () => setLanguage((current) => current === "en" ? "ar" : "en");
  const toggleTheme = () => setTheme((current) => current === "dark" ? "light" : "dark");

  useEffect(() => {
    window.localStorage.setItem(LANGUAGE_KEY, language);
    document.documentElement.lang = language;
    document.documentElement.dir = language === "ar" ? "rtl" : "ltr";
  }, [language]);

  useEffect(() => {
    window.localStorage.setItem(THEME_KEY, theme);
    document.documentElement.style.colorScheme = theme;
  }, [theme]);

  useEffect(() => {
    const onVisibilityChange = () => setPageVisible(document.visibilityState === "visible");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.matches("input, textarea, select, [contenteditable='true']")) return;

      let destination: number | null = null;
      if (["ArrowDown", "ArrowRight", "PageDown"].includes(event.key)) destination = Math.min(SECTION_COUNT - 1, activeSection + 1);
      if (["ArrowUp", "ArrowLeft", "PageUp"].includes(event.key)) destination = Math.max(0, activeSection - 1);
      if (event.key === "Home") destination = 0;
      if (event.key === "End") destination = SECTION_COUNT - 1;
      if (destination !== null) {
        event.preventDefault();
        goToSection(destination);
      }
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeSection, goToSection]);

  return (
    <motion.div
      ref={rootRef}
      className="presentation-root"
      data-theme={theme}
      dir={language === "ar" ? "rtl" : "ltr"}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
    >
      <header className="top-navigation">
        <button className="brand-lockup" type="button" onClick={() => goToSection(0)} aria-label="Go to presentation start">
          <span className="brand-square">A</span>
          <span className="brand-text"><strong>AAST</strong><small>{text(presentationCopy.nav.eyebrow, language)}</small></span>
        </button>
        <nav className="section-nav" aria-label="Presentation sections">
          {presentationCopy.nav.sections.map((section, index) => (
            <button key={index} type="button" className={`section-nav-button ${activeSection === index ? "nav-active" : ""}`} onClick={() => goToSection(index)} aria-current={activeSection === index ? "step" : undefined}>
              <span className="nav-index" dir="ltr">0{index + 1}</span>
              <span>{text(section, language)}</span>
            </button>
          ))}
        </nav>
        <div className="navigation-actions">
          <button className="control-button" type="button" onClick={toggleLanguage} aria-label={text(presentationCopy.nav.language, language)}>
            <Languages size={15} />
            <span>{language === "en" ? "AR" : "EN"}</span>
          </button>
          <button className="control-button" type="button" onClick={toggleTheme} aria-label={text(presentationCopy.nav.theme, language)}>
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
            <span>{theme === "dark" ? "LIGHT" : "DARK"}</span>
          </button>
        </div>
      </header>

      <div className="canvas-frame">
        <Canvas
          dpr={1}
          camera={{ fov: 42, near: 0.1, far: 100, position: [0, 1.25, 10.5] }}
          gl={{ antialias: true, alpha: false, powerPreference: "high-performance" }}
          frameloop={pageVisible ? "always" : "never"}
        >
          <Suspense fallback={<SceneLoader language={language} />}>
            <ScrollControls
              pages={SECTION_COUNT}
              damping={0.25}
              style={{ scrollSnapType: "y mandatory", scrollSnapStop: "always", scrollbarWidth: "none", overscrollBehaviorY: "contain" }}
            >
              <ScrollBridge onReady={onScrollReady} />
              <IndustrialScene language={language} theme={theme} onSectionChange={onSectionChange} />
              <Scroll html style={{ width: "100%" }}>
                <main className="presentation-scroll" aria-label="Supply chain audit presentation">
                  <HeroSection language={language} active={activeSection === 0} />
                  <AuditSection language={language} active={activeSection === 1} />
                  <DemandSection language={language} active={activeSection === 2} />
                  <RoutesSection language={language} active={activeSection === 3} />
                  <WarehouseSection language={language} active={activeSection === 4} />
                </main>
              </Scroll>
            </ScrollControls>
          </Suspense>
        </Canvas>
      </div>

      <nav className="presentation-progress" aria-label={language === "ar" ? "تقدم العرض" : "Presentation progress"}>
        {presentationCopy.nav.sections.map((section, index) => (
          <button key={index} type="button" className={`progress-dot ${activeSection === index ? "progress-dot-active" : ""}`} onClick={() => goToSection(index)} aria-label={text(section, language)} aria-current={activeSection === index ? "step" : undefined}>
            <span />
          </button>
        ))}
      </nav>
      <div className="bottom-scroll-hint"><ChevronDown size={14} /><span>{text(presentationCopy.nav.scrollHint, language)}</span></div>
    </motion.div>
  );
}
