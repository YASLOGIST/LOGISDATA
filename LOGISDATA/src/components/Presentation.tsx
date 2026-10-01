"use client";

import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, Html, Preload, Scroll, ScrollControls, useScroll } from "@react-three/drei";
import { motion } from "framer-motion";
import { ChevronDown, Keyboard, Languages, Moon, Sun } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { presentationCopy } from "@/lib/data";
import { t, text } from "@/lib/i18n";
import { DURATION, transition } from "@/lib/motion";
import {
  SECTIONS,
  SECTION_COUNT,
  clampSectionIndex,
  hashFromSectionIndex,
  sectionIndexFromHash,
  scrollTopForSection,
  sectionFromScrollTop,
} from "@/lib/sections";
import type { Language } from "@/lib/types";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import { AuditSection } from "@/components/sections/AuditSection";
import { DemandSection } from "@/components/sections/DemandSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { RoutesSection } from "@/components/sections/RoutesSection";
import { WarehouseSection } from "@/components/sections/WarehouseSection";
import { IndustrialScene } from "@/components/three/IndustrialScene";
import { KeyboardHelp } from "@/components/ui/KeyboardHelp";

const NEXT_KEYS = new Set(["ArrowDown", "ArrowRight", "PageDown", " ", "Spacebar"]);
const PREV_KEYS = new Set(["ArrowUp", "ArrowLeft", "PageUp"]);
const EDITABLE = "input, textarea, select, [contenteditable='true']";

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
        <div className="loader-orbit" aria-hidden="true"><span /></div>
        <strong>AAST / CONTROL ROOM</strong>
        <span>{t("loadingModel", language)}</span>
      </div>
    </Html>
  );
}

export function Presentation() {
  const { language, theme, rtl, device, toggleLanguage, toggleTheme } = usePreferences();
  const reduced = device.reducedMotion;
  // Resolve the deep link during the initial render. `Presentation` is
  // loaded with `ssr: false`, so `window` always exists here, and a lazy
  // initialiser avoids a setState-in-effect cascade on first paint.
  const [activeSection, setActiveSection] = useState(() =>
    sectionIndexFromHash(typeof window === "undefined" ? null : window.location.hash) ?? 0,
  );
  const [pageVisible, setPageVisible] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const scrollElement = useRef<HTMLDivElement | null>(null);
  const scrollListener = useRef<(() => void) | null>(null);
  const pendingSection = useRef<number | null>(
    sectionIndexFromHash(typeof window === "undefined" ? null : window.location.hash),
  );

  /**
   * The active section is derived from the scroll container's native
   * `scroll` event, not from the 3D render loop.
   *
   * It used to be reported from `useFrame`, which coupled the URL hash, the
   * nav highlight and the screen-reader announcement to GPU frames: under
   * `frameloop="demand"` (reduced motion) or a backgrounded tab those frames
   * stop, and the announced state froze mid-travel. Reading the DOM makes it
   * exact and immediate, and the 3D scene is still free to ease toward it.
   */
  const onScrollReady = useCallback((element: HTMLDivElement) => {
    scrollElement.current = element;

    const sync = () =>
      setActiveSection(
        sectionFromScrollTop(element.scrollTop, element.scrollHeight, element.clientHeight),
      );

    element.addEventListener("scroll", sync, { passive: true });
    scrollListener.current = () => element.removeEventListener("scroll", sync);

    // Honour a deep link such as /#routes once the scroller exists.
    const requested = pendingSection.current;
    if (requested !== null) {
      element.scrollTo({
        top: scrollTopForSection(requested, element.scrollHeight, element.clientHeight),
        behavior: "auto",
      });
      pendingSection.current = null;
    }
    sync();
  }, []);

  useEffect(() => () => scrollListener.current?.(), []);

  const goToSection = useCallback((section: number) => {
    const target = clampSectionIndex(section);
    const element = scrollElement.current;
    if (!element) {
      pendingSection.current = target;
      return;
    }
    // Deliberately an instant scroll: drei damps its own offset, and both
    // the camera and the translated HTML follow that damped value, so the
    // visible transition is still smooth. Native smooth scrolling would
    // additionally fight the damping and can be interrupted mid-flight.
    element.scrollTo({ top: scrollTopForSection(target, element.scrollHeight, element.clientHeight), behavior: "auto" });
  }, []);

  // --- Deep linking -------------------------------------------------------
  // Each section is addressable (`/#warehouse`), so a presenter can link
  // straight to a finding and the browser Back button walks the deck.
  useEffect(() => {
    const onHashChange = () => {
      const next = sectionIndexFromHash(window.location.hash);
      if (next !== null) goToSection(next);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [goToSection]);

  useEffect(() => {
    const hash = hashFromSectionIndex(activeSection);
    if (window.location.hash !== hash) {
      // replaceState keeps the deck out of the history stack for scroll
      // changes; explicit navigation still works through hashchange.
      window.history.replaceState(null, "", hash);
    }
  }, [activeSection]);

  // --- Global controls ----------------------------------------------------
  useEffect(() => {
    const onVisibilityChange = () => setPageVisible(document.visibilityState === "visible");
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest?.(EDITABLE)) return;
      if (target?.closest?.("dialog")) return;

      if (event.key === "?" || (event.key === "/" && event.shiftKey)) {
        event.preventDefault();
        setHelpOpen(true);
        return;
      }
      if (event.key.toLowerCase() === "t") {
        event.preventDefault();
        toggleTheme();
        return;
      }
      if (event.key.toLowerCase() === "l") {
        event.preventDefault();
        toggleLanguage();
        return;
      }

      // Relative moves start from where the scroller actually is. Reading
      // `activeSection` instead would lag: it is fed back from the damped
      // render loop, so rapid arrow presses re-targeted a section the deck
      // had already been told to leave.
      let destination: number | null = null;
      const element = scrollElement.current;
      const from = element ? sectionFromScrollTop(element.scrollTop, element.scrollHeight, element.clientHeight) : (pendingSection.current ?? activeSection);
      if (NEXT_KEYS.has(event.key)) destination = from + 1;
      else if (PREV_KEYS.has(event.key)) destination = from - 1;
      else if (event.key === "Home") destination = 0;
      else if (event.key === "End") destination = SECTION_COUNT - 1;
      else if (/^[1-9]$/.test(event.key)) {
        const requested = Number.parseInt(event.key, 10) - 1;
        if (requested < SECTION_COUNT) destination = requested;
      }

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
  }, [activeSection, goToSection, toggleLanguage, toggleTheme]);

  /**
   * Frame loop policy.
   * - hidden tab        -> "never"  (zero GPU/CPU while backgrounded)
   * - prefers-reduced-motion -> "demand" (render only when state changes)
   * - otherwise         -> "always"
   */
  const frameloop = !pageVisible ? "never" : reduced ? "demand" : "always";

  const progress = SECTION_COUNT > 1 ? activeSection / (SECTION_COUNT - 1) : 1;
  const activeLabel = useMemo(
    () => text(SECTIONS[activeSection]?.label ?? SECTIONS[0].label, language),
    [activeSection, language],
  );

  return (
    <motion.div
      className="presentation-root"
      data-theme={theme}
      data-tier={device.tier}
      dir={rtl ? "rtl" : "ltr"}
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={transition(DURATION.slow, { reduced })}
    >
      <a className="skip-link" href="#presentation-content">
        {t("skipToContent", language)}
      </a>

      <header className="top-navigation">
        <button
          className="brand-lockup"
          type="button"
          onClick={() => goToSection(0)}
          aria-label={t("goToStart", language)}
        >
          <span className="brand-square" aria-hidden="true">A</span>
          <span className="brand-text"><strong>AAST</strong><small>{text(presentationCopy.nav.eyebrow, language)}</small></span>
        </button>

        <nav className="section-nav" aria-label={t("sections", language)}>
          {SECTIONS.map((section) => (
            <button
              key={section.slug}
              type="button"
              className={`section-nav-button ${activeSection === section.index ? "nav-active" : ""}`}
              onClick={() => goToSection(section.index)}
              aria-current={activeSection === section.index ? "step" : undefined}
            >
              <span className="nav-index" dir="ltr" aria-hidden="true">0{section.index + 1}</span>
              <span>{text(section.label, language)}</span>
            </button>
          ))}
        </nav>

        <div className="navigation-actions">
          <button
            className="control-button"
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label={t("shortcuts", language)}
          >
            <Keyboard size={15} aria-hidden="true" />
            <span aria-hidden="true">?</span>
          </button>
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
      </header>

      {/* Scroll progress: a single GPU-composited scaleX transform. */}
      <div
        className="scroll-progress"
        role="progressbar"
        aria-label={t("progress", language)}
        aria-valuemin={1}
        aria-valuemax={SECTION_COUNT}
        aria-valuenow={activeSection + 1}
        aria-valuetext={activeLabel}
      >
        <span style={{ transform: `scaleX(${progress})` }} />
      </div>

      {/* Announces section changes to assistive technology, which cannot
          observe the WebGL camera move. */}
      <p className="visually-hidden" role="status" aria-live="polite">
        {t("nowViewing", language)}: {activeLabel} ({activeSection + 1}/{SECTION_COUNT})
      </p>

      <div className="canvas-frame">
        <Canvas
          dpr={device.dpr}
          camera={{ fov: 42, near: 0.1, far: 100, position: [0, 1.25, 10.5] }}
          gl={{ antialias: device.antialias, alpha: false, powerPreference: "high-performance" }}
          frameloop={frameloop}
        >
          <Suspense fallback={<SceneLoader language={language} />}>
            <AdaptiveDpr pixelated={false} />
            <ScrollControls
              pages={SECTION_COUNT}
              damping={reduced ? 0 : 0.25}
              style={{
                scrollSnapType: "y mandatory",
                scrollSnapStop: "always",
                scrollbarWidth: "none",
                overscrollBehaviorY: "contain",
              }}
            >
              <ScrollBridge onReady={onScrollReady} />
              <IndustrialScene
                language={language}
                theme={theme}
                device={device}
              />
              <Scroll html style={{ width: "100%" }}>
                <main
                  id="presentation-content"
                  className="presentation-scroll"
                  aria-label={t("presentationLandmark", language)}
                  tabIndex={-1}
                >
                  <HeroSection language={language} active={activeSection === 0} reduced={reduced} />
                  <AuditSection language={language} active={activeSection === 1} reduced={reduced} />
                  <DemandSection language={language} active={activeSection === 2} reduced={reduced} />
                  <RoutesSection language={language} active={activeSection === 3} reduced={reduced} />
                  <WarehouseSection language={language} active={activeSection === 4} reduced={reduced} />
                </main>
              </Scroll>
            </ScrollControls>
            <Preload all />
          </Suspense>
        </Canvas>
      </div>

      <nav className="presentation-progress" aria-label={t("progress", language)}>
        {SECTIONS.map((section) => (
          <button
            key={section.slug}
            type="button"
            className={`progress-dot ${activeSection === section.index ? "progress-dot-active" : ""}`}
            onClick={() => goToSection(section.index)}
            aria-label={text(section.label, language)}
            aria-current={activeSection === section.index ? "step" : undefined}
          >
            <span aria-hidden="true" />
          </button>
        ))}
      </nav>

      <div className="bottom-scroll-hint" aria-hidden="true">
        <ChevronDown size={14} />
        <span>{text(presentationCopy.nav.scrollHint, language)}</span>
      </div>

      <KeyboardHelp open={helpOpen} language={language} onClose={() => setHelpOpen(false)} />
    </motion.div>
  );
}
