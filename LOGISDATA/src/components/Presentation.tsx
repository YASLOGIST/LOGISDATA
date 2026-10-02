"use client";

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { AdaptiveDpr, Preload, ScrollControls, useScroll } from "@react-three/drei";
import { motion } from "framer-motion";
import { ChevronDown, FileText, Keyboard, Languages, Moon, Sun } from "lucide-react";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState, type MutableRefObject } from "react";
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
  trackRef: MutableRefObject<HTMLDivElement | null>;
}

function ScrollBridge({ onReady, trackRef }: ScrollBridgeProps) {
  const scroll = useScroll();
  const viewport = useThree((state) => state.size);

  useEffect(() => {
    onReady(scroll.el);
  }, [onReady, scroll.el]);

  // Keep the readable layer on the same damped timeline as the camera and
  // the 3D labels. Using raw scrollTop here would make the prose jump ahead
  // while ScrollControls was still easing the scene toward it.
  useFrame(() => {
    const track = trackRef.current;
    if (!track) return;
    const travel = viewport.height * Math.max(0, scroll.pages - 1);
    track.style.transform = `translate3d(0, -${scroll.offset * travel}px, 0)`;
  });

  return null;
}

interface DeckOverlayProps {
  language: Language;
  reduced: boolean;
  activeSection: number;
  trackRef: MutableRefObject<HTMLDivElement | null>;
}

/**
 * Accessible content layer for the deck.
 *
 * This deliberately lives beside the canvas, not inside drei's `<Scroll
 * html>` helper. That helper portals its children into a second React root;
 * under React 19 the bridge can race the Canvas context and emit the fatal
 * "Hooks can only be used within the Canvas component" error. The scene still
 * uses ScrollControls for its normalized offset, while the in-canvas bridge
 * moves this fixed overlay with the same damped offset in one composited
 * transform. The result is one scroll source, two render layers, and no
 * cross-root React ownership or context leakage.
 */
function DeckOverlay({ language, reduced, activeSection, trackRef }: DeckOverlayProps) {
  return (
    <div className="html-deck-frame">
      <div ref={trackRef} className="html-deck-track">
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
      </div>
    </div>
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
  const htmlTrackRef = useRef<HTMLDivElement | null>(null);
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
    // ScrollControls can recreate its element after a Canvas remount. Tear
    // down the previous bridge before attaching a new one so duplicate scroll
    // listeners never accumulate across retries.
    scrollListener.current?.();
    scrollElement.current = element;

    /*
     * PERF: `scrollHeight` and `clientHeight` are layout-dependent reads.
     * Taking them inside the scroll handler forced a style+layout flush on
     * every single scroll event, interleaved with the framer-motion writes
     * the same event triggers -- a textbook layout-thrash that showed up as
     * stutter on trackpads (which fire scroll at display rate). Neither
     * value can change while scrolling: cache them and refresh only when
     * the box actually resizes.
     */
    let scrollHeight = element.scrollHeight;
    let clientHeight = element.clientHeight;
    const measure = () => {
      scrollHeight = element.scrollHeight;
      clientHeight = element.clientHeight;
    };

    const sync = () => {
      // This immediate write is also the pre-Canvas fallback for a deep link
      // while the 3D chunk is still loading. Once ScrollBridge mounts, its
      // useFrame callback replaces it with the damped position used by the
      // camera, so normal scrolling remains visually synchronized.
      const track = htmlTrackRef.current;
      const range = Math.max(0, scrollHeight - clientHeight);
      if (track && range > 0) {
        track.style.transform = `translate3d(0, -${element.scrollTop}px, 0)`;
      }
      setActiveSection(sectionFromScrollTop(element.scrollTop, scrollHeight, clientHeight));
    };

    const observer =
      typeof ResizeObserver === "function"
        ? new ResizeObserver(() => {
            measure();
            sync();
          })
        : null;
    observer?.observe(element);

    element.addEventListener("scroll", sync, { passive: true });

    /*
     * The element exists before it is scrollable.
     *
     * This callback fires from a child of `ScrollControls`, and React runs
     * child effects before parent effects -- so at this point drei has not
     * yet appended the fill element that gives the container its height.
     * `scrollHeight - clientHeight` is still 0, every computed target is 0,
     * and a deep link or an early key press silently did nothing. Wait for
     * the container to become scrollable, then flush whatever was asked for.
     */
    let frame = 0;
    let attempts = 0;
    const flushWhenScrollable = () => {
      measure();
      const scrollable = element.scrollHeight - element.clientHeight > 0;
      if (!scrollable && attempts < 180) {
        attempts += 1;
        frame = requestAnimationFrame(flushWhenScrollable);
        return;
      }
      const requested = pendingSection.current;
      if (requested !== null) {
        pendingSection.current = null;
        element.scrollTo({
          top: scrollTopForSection(requested, element.scrollHeight, element.clientHeight),
          behavior: "auto",
        });
        /*
         * drei ignores the very first scroll event it sees (it sets
         * `scrollTop = 1` on mount to allow upward scrolling, and suppresses
         * the event that causes). A deep link applied in that window moved
         * the container but left drei's own offset at 0, so the DOM said
         * "warehouse" while the camera and the translated HTML stayed on the
         * overview. Re-announce the position once that guard has cleared.
         */
        frame = requestAnimationFrame(() => {
          frame = requestAnimationFrame(() => {
            element.dispatchEvent(new Event("scroll"));
          });
        });
      }
      sync();
    };
    flushWhenScrollable();

    scrollListener.current = () => {
      cancelAnimationFrame(frame);
      observer?.disconnect();
      element.removeEventListener("scroll", sync);
      if (htmlTrackRef.current) htmlTrackRef.current.style.transform = "translate3d(0, 0, 0)";
      if (scrollElement.current === element) scrollElement.current = null;
    };
  }, []);

  useEffect(() => () => scrollListener.current?.(), []);

  const goToSection = useCallback((section: number) => {
    const target = clampSectionIndex(section);
    const element = scrollElement.current;
    // Not mounted yet, or mounted but not yet scrollable: queue it and let
    // `flushWhenScrollable` apply it as soon as the container has height.
    if (!element || element.scrollHeight - element.clientHeight <= 0) {
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
              // The text label is hidden below 1024px, and `nav-index` is
              // aria-hidden, so without this the accessible name would be
              // empty on tablets and phones.
              aria-label={text(section.label, language)}
              onClick={() => goToSection(section.index)}
              aria-current={activeSection === section.index ? "step" : undefined}
            >
              <span className="nav-index" dir="ltr" aria-hidden="true">0{section.index + 1}</span>
              <span>{text(section.label, language)}</span>
            </button>
          ))}
        </nav>

        <div className="navigation-actions">
          {/*
            A plain <a>, not next/link, on purpose. drei renders the scrolled
            HTML into a second React root; unmounting the deck client-side
            tears the two roots down out of order and the orphaned tree throws
            "R3F: Hooks can only be used within the Canvas component!". A full
            navigation avoids the race and releases the WebGL context too.
          */}
          <a className="control-button" href="/handout">
            <FileText size={15} aria-hidden="true" />
            <span>{t("openHandout", language)}</span>
          </a>
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
          /*
           * PERF: enables the adaptive-resolution path. `SceneRig` calls
           * `performance.regress()` on every scroll event, which drops
           * `state.performance.current` to `min`; `<AdaptiveDpr />` reads it
           * and re-renders the scene at 60% resolution *while the user is
           * scrolling*, then restores full resolution `debounce` ms after
           * the last event. Fill rate is the dominant cost on retina
           * panels, so this is where scroll-time frame budget is won.
           */
          performance={{ min: 0.6, max: 1, debounce: 220 }}
        >
          <AdaptiveDpr pixelated={false} />
          <ScrollControls
              pages={SECTION_COUNT}
              /*
               * `damping` is a smooth-time in seconds: drei eases its own
               * `offset` toward the raw scroll position over this window,
               * and BOTH the camera rig and the translated HTML follow the
               * eased value. At 0.25 the deck visibly trailed the wheel by
               * a quarter second -- which reads as "slow/laggy scrolling"
               * even at a perfect 60fps. 0.12 keeps the easing (no harsh
               * 1:1 snap, no judder on discrete wheel steps) while halving
               * the input-to-pixel delay.
               */
              damping={reduced ? 0 : 0.12}
              /*
               * `scrollSnapType: y mandatory` + `scrollSnapStop: always`
               * were removed. The readable deck now lives in a sibling
               * fixed track, so the sections are not in this container's
               * scrollable flow and were never valid snap targets -- the
               * only in-flow child is drei's empty fill div. The declaration
               * therefore snapped nothing while still making the compositor
               * run snap-target resolution on each scroll update, and
               * `overscroll-behavior` work on top.
               */
              style={{
                scrollbarWidth: "none",
                overscrollBehaviorY: "contain",
              }}
            >
            <ScrollBridge onReady={onScrollReady} trackRef={htmlTrackRef} />
            <Suspense fallback={null}>
              <IndustrialScene
                language={language}
                theme={theme}
                device={device}
              />
            </Suspense>
          </ScrollControls>
          <Preload all />
        </Canvas>
      </div>

      <DeckOverlay
        language={language}
        reduced={reduced}
        activeSection={activeSection}
        trackRef={htmlTrackRef}
      />

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
