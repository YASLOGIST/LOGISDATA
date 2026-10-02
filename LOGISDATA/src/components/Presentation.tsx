"use client";

import { Canvas } from "@react-three/fiber";
import { AdaptiveDpr, Preload, ScrollControls, useScroll } from "@react-three/drei";
import { motion } from "framer-motion";
import {
  Activity,
  Calculator,
  ChevronDown,
  Download,
  FileText,
  Keyboard,
  Languages,
  Moon,
  RotateCcw,
  Sun,
} from "lucide-react";
import { createPortal } from "react-dom";
import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { WebGLRenderer } from "three";
import { presentationCopy } from "@/lib/data";
import { downloadExecutiveReportJson } from "@/lib/export";
import { t, text } from "@/lib/i18n";
import { shouldIgnorePresentationShortcut } from "@/lib/keyboard";
import { DURATION, transition } from "@/lib/motion";
import { sound } from "@/lib/sound";
import {
  SECTIONS,
  SECTION_COUNT,
  clampSectionIndex,
  hashFromSectionIndex,
  sectionIndexFromHash,
  scrollTopForSection,
  sectionFromScrollTop,
} from "@/lib/sections";
import type { AuditScenario, Language } from "@/lib/types";
import { usePreferences } from "@/components/providers/PreferencesProvider";
import { AuditSection } from "@/components/sections/AuditSection";
import { DemandSection } from "@/components/sections/DemandSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { RoutesSection } from "@/components/sections/RoutesSection";
import { WarehouseSection } from "@/components/sections/WarehouseSection";
import { IndustrialScene } from "@/components/three/IndustrialScene";
import { AudioToggle } from "@/components/ui/AudioToggle";
import { KeyboardHelp } from "@/components/ui/KeyboardHelp";
import { LiveTelemetryFeed } from "@/components/ui/LiveTelemetryFeed";
import { NodeInspectorModal } from "@/components/ui/NodeInspectorModal";
import { RecoveryCalculator } from "@/components/ui/RecoveryCalculator";
import { ScenarioSwitcher } from "@/components/ui/ScenarioSwitcher";

const NEXT_KEYS = new Set(["ArrowDown", "ArrowRight", "PageDown", " ", "Spacebar"]);
const PREV_KEYS = new Set(["ArrowUp", "ArrowLeft", "PageUp"]);

interface ScrollBridgeProps {
  onReady: (element: HTMLDivElement, fill: HTMLDivElement, fixed: HTMLDivElement) => void;
}

function ScrollBridge({ onReady }: ScrollBridgeProps) {
  const scroll = useScroll();
  useEffect(() => {
    onReady(scroll.el, scroll.fill, scroll.fixed);
  }, [onReady, scroll.el, scroll.fill, scroll.fixed]);
  return null;
}

interface DeckOverlayProps {
  language: Language;
  reduced: boolean;
  activeSection: number;
  scenario: AuditScenario;
  host: HTMLElement | null;
  onSelectNode: (nodeId: string) => void;
  onOpenCalculator: () => void;
}

function DeckOverlay({
  language,
  reduced,
  activeSection,
  scenario,
  host,
  onSelectNode,
  onOpenCalculator,
}: DeckOverlayProps) {
  if (!host) return null;

  return createPortal(
    <main
      id="presentation-content"
      className="presentation-scroll"
      aria-label={t("presentationLandmark", language)}
      tabIndex={-1}
    >
      <HeroSection
        language={language}
        active={activeSection === 0}
        reduced={reduced}
        scenario={scenario}
        onSelectNode={onSelectNode}
        onOpenCalculator={onOpenCalculator}
      />
      <AuditSection
        language={language}
        active={activeSection === 1}
        reduced={reduced}
        scenario={scenario}
      />
      <DemandSection
        language={language}
        active={activeSection === 2}
        reduced={reduced}
        scenario={scenario}
      />
      <RoutesSection
        language={language}
        active={activeSection === 3}
        reduced={reduced}
        scenario={scenario}
      />
      <WarehouseSection
        language={language}
        active={activeSection === 4}
        reduced={reduced}
        scenario={scenario}
      />
    </main>,
    host,
  );
}

export function Presentation() {
  const { language, theme, rtl, device, toggleLanguage, toggleTheme } = usePreferences();
  const reduced = device.reducedMotion;

  const [activeSection, setActiveSection] = useState(() =>
    sectionIndexFromHash(typeof window === "undefined" ? null : window.location.hash) ?? 0,
  );
  const [scenario, setScenario] = useState<AuditScenario>("active-audit");
  const [telemetryOpen, setTelemetryOpen] = useState(false);
  const [calculatorOpen, setCalculatorOpen] = useState(false);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [pageVisible, setPageVisible] = useState(true);
  const [helpOpen, setHelpOpen] = useState(false);
  const [contextLost, setContextLost] = useState(false);
  const [canvasGeneration, setCanvasGeneration] = useState(0);
  const [scrollHost, setScrollHost] = useState<HTMLElement | null>(null);
  const contextCleanupRef = useRef<(() => void) | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);

  const scrollElement = useRef<HTMLDivElement | null>(null);
  const scrollHostRef = useRef<HTMLElement | null>(null);
  const scrollMetricsRef = useRef({ scrollHeight: 0, clientHeight: 0 });
  const scrollListener = useRef<(() => void) | null>(null);
  const pendingSection = useRef<number | null>(
    sectionIndexFromHash(typeof window === "undefined" ? null : window.location.hash),
  );

  const onScrollReady = useCallback(
    (element: HTMLDivElement, fill: HTMLDivElement, fixed: HTMLDivElement) => {
      scrollListener.current?.();
      scrollElement.current = element;

      const host = document.createElement("div");
      host.className = "html-deck-host";
      element.appendChild(host);
      scrollHostRef.current = host;
      setScrollHost(host);

      const fillFrame = requestAnimationFrame(() => {
        fill.style.height = "0px";
        fixed.style.display = "none";
      });

      let scrollHeight = element.scrollHeight;
      let clientHeight = element.clientHeight;
      const measure = () => {
        scrollHeight = element.scrollHeight;
        clientHeight = element.clientHeight;
        scrollMetricsRef.current = { scrollHeight, clientHeight };
      };

      const sync = () => {
        // Content can expand without resizing the scroll viewport, so refresh
        // scrollHeight on every native scroll rather than trusting an earlier
        // ResizeObserver snapshot.
        measure();
        const metrics = scrollMetricsRef.current;
        setActiveSection(
          sectionFromScrollTop(element.scrollTop, metrics.scrollHeight, metrics.clientHeight),
        );
      };

      const observer =
        typeof ResizeObserver === "function"
          ? new ResizeObserver(() => {
              sync();
            })
          : null;
      observer?.observe(element);

      element.addEventListener("scroll", sync, { passive: true });

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
          const targetTop = scrollTopForSection(
            requested,
            element.scrollHeight,
            element.clientHeight,
          );
          element.scrollTo({ top: targetTop, behavior: "auto" });
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
        cancelAnimationFrame(fillFrame);
        observer?.disconnect();
        element.removeEventListener("scroll", sync);
        if (scrollHostRef.current === host) scrollHostRef.current = null;
        if (scrollElement.current === element) scrollElement.current = null;
      };
    },
    [],
  );

  const goToSection = useCallback((targetIndex: number) => {
    sound.playClick();
    const index = clampSectionIndex(targetIndex);
    const element = scrollElement.current;
    if (!element) {
      pendingSection.current = index;
      return;
    }
    const metrics = {
      scrollHeight: element.scrollHeight,
      clientHeight: element.clientHeight,
    };
    scrollMetricsRef.current = metrics;
    const targetTop = scrollTopForSection(index, metrics.scrollHeight, metrics.clientHeight);
    element.scrollTo({ top: targetTop, behavior: "smooth" });
    const targetHash = hashFromSectionIndex(index);
    if (window.location.hash !== targetHash) {
      window.history.replaceState(null, "", targetHash);
    }
  }, []);

  useEffect(() => {
    const onHashChange = () => {
      const target = sectionIndexFromHash(window.location.hash);
      if (target !== null) goToSection(target);
    };
    window.addEventListener("hashchange", onHashChange);
    return () => window.removeEventListener("hashchange", onHashChange);
  }, [goToSection]);

  useEffect(() => {
    const onVisibilityChange = () => {
      setPageVisible(document.visibilityState === "visible");
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (shouldIgnorePresentationShortcut(
        event,
        document.activeElement,
        Boolean(document.querySelector("dialog[open]")),
      )) return;

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

      let destination: number | null = null;
      const element = scrollElement.current;
      // The hash records the latest requested destination synchronously,
      // while smooth scrolling may still be moving through intermediate
      // offsets. Prefer that intent so rapid repeated arrows advance once per
      // press instead of requesting the same section again.
      const requestedSection = sectionIndexFromHash(window.location.hash);
      const from = requestedSection ?? (element
        ? sectionFromScrollTop(element.scrollTop, element.scrollHeight, element.clientHeight)
        : (pendingSection.current ?? activeSection));

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

    const root = rootRef.current;
    document.addEventListener("visibilitychange", onVisibilityChange);
    window.addEventListener("keydown", onKeyDown);
    root?.setAttribute("data-interactive", "true");
    return () => {
      root?.removeAttribute("data-interactive");
      document.removeEventListener("visibilitychange", onVisibilityChange);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [activeSection, goToSection, toggleLanguage, toggleTheme]);

  const frameloop = !pageVisible ? "never" : reduced ? "demand" : "always";
  const progress = SECTION_COUNT > 1 ? activeSection / (SECTION_COUNT - 1) : 1;
  const activeLabel = useMemo(
    () => text(SECTIONS[activeSection]?.label ?? SECTIONS[0].label, language),
    [activeSection, language],
  );

  // WebGL context loss is recoverable in modern browsers, but the renderer
  // can remain black while it is being restored. Own the DOM listeners here
  // so the UI never leaves the operator staring at an unresponsive canvas.
  const handleCanvasCreated = useCallback(({ gl }: { gl: WebGLRenderer }) => {
    contextCleanupRef.current?.();
    const canvas = gl.domElement;
    const onContextLost = (event: Event) => {
      event.preventDefault();
      setContextLost(true);
    };
    const onContextRestored = () => setContextLost(false);
    canvas.addEventListener("webglcontextlost", onContextLost, false);
    canvas.addEventListener("webglcontextrestored", onContextRestored, false);
    contextCleanupRef.current = () => {
      canvas.removeEventListener("webglcontextlost", onContextLost);
      canvas.removeEventListener("webglcontextrestored", onContextRestored);
    };
    setContextLost(false);
  }, []);

  useEffect(() => () => contextCleanupRef.current?.(), []);

  const recoverCanvas = useCallback(() => {
    contextCleanupRef.current?.();
    contextCleanupRef.current = null;
    setContextLost(false);
    setCanvasGeneration((generation) => generation + 1);
  }, []);

  return (
    <motion.div
      ref={rootRef}
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
          <span className="brand-text">
            <strong>AAST</strong>
            <small>{text(presentationCopy.nav.eyebrow, language)}</small>
          </span>
        </button>

        <nav className="section-nav" aria-label={t("sections", language)}>
          {SECTIONS.map((section) => (
            <button
              key={section.slug}
              type="button"
              className={`section-nav-button ${activeSection === section.index ? "nav-active" : ""}`}
              aria-label={text(section.label, language)}
              onClick={() => goToSection(section.index)}
              aria-current={activeSection === section.index ? "step" : undefined}
            >
              <span className="nav-index" dir="ltr" aria-hidden="true">
                0{section.index + 1}
              </span>
              <span>{text(section.label, language)}</span>
            </button>
          ))}
        </nav>

        {/* Operating Scenario Mode Switcher */}
        <ScenarioSwitcher
          scenario={scenario}
          onScenarioChange={setScenario}
          language={language}
        />

        <div className="navigation-actions">
          {/* Live Telemetry Drawer Toggle */}
          <button
            type="button"
            className={`control-button ${telemetryOpen ? "btn-active-glow" : ""}`}
            onClick={() => setTelemetryOpen((v) => !v)}
            aria-label={t("telemetryToggle", language)}
            title={t("telemetryToggle", language)}
            aria-controls="telemetry-panel"
            aria-expanded={telemetryOpen}
          >
            <Activity size={15} aria-hidden="true" />
            <span>{t("telemetryToggle", language)}</span>
          </button>

          {/* Executive Recovery Calculator Modal Button */}
          <button
            type="button"
            className="control-button"
            onClick={() => setCalculatorOpen(true)}
            aria-label={t("calculatorOpen", language)}
            title={t("calculatorOpen", language)}
            aria-haspopup="dialog"
          >
            <Calculator size={15} aria-hidden="true" />
            <span>{t("calculatorOpen", language)}</span>
          </button>

          {/* JSON Executive Report Export */}
          <button
            type="button"
            className="control-button"
            onClick={() => downloadExecutiveReportJson(language, scenario)}
            aria-label={t("exportJson", language)}
            title={t("exportJson", language)}
          >
            <Download size={15} aria-hidden="true" />
            <span>JSON</span>
          </button>

          {/* Audio Synthesizer SFX Toggle */}
          <AudioToggle language={language} />

          {/* Handout View Link */}
          <a
            className="control-button"
            href="/handout"
            aria-label={t("openHandout", language)}
            title={t("openHandout", language)}
          >
            <FileText size={15} aria-hidden="true" />
            <span>{t("openHandout", language)}</span>
          </a>

          {/* Shortcuts Help Modal */}
          <button
            className="control-button"
            type="button"
            onClick={() => setHelpOpen(true)}
            aria-label={t("shortcuts", language)}
            title={t("shortcuts", language)}
            aria-haspopup="dialog"
          >
            <Keyboard size={15} aria-hidden="true" />
            <span aria-hidden="true">?</span>
          </button>

          {/* Language Toggle */}
          <button
            className="control-button"
            type="button"
            onClick={toggleLanguage}
            aria-label={text(presentationCopy.nav.language, language)}
            title={text(presentationCopy.nav.language, language)}
          >
            <Languages size={15} aria-hidden="true" />
            <span>{language === "en" ? "AR" : "EN"}</span>
          </button>

          {/* Theme Toggle */}
          <button
            className="control-button"
            type="button"
            onClick={toggleTheme}
            aria-label={text(presentationCopy.nav.theme, language)}
            title={text(presentationCopy.nav.theme, language)}
            aria-pressed={theme === "light"}
          >
            {theme === "dark" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
            <span>{t(theme === "dark" ? "themeLight" : "themeDark", language)}</span>
          </button>
        </div>
      </header>

      {/* Scroll progress bar */}
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

      <p className="visually-hidden" role="status" aria-live="polite">
        {t("nowViewing", language)}: {activeLabel} ({activeSection + 1}/{SECTION_COUNT})
      </p>

      <div className="canvas-frame">
        <Canvas
          key={canvasGeneration}
          onCreated={handleCanvasCreated}
          dpr={device.dpr}
          camera={{ fov: 42, near: 0.1, far: 100, position: [0, 1.25, 10.5] }}
          gl={{ antialias: device.antialias, alpha: false, powerPreference: "high-performance" }}
          frameloop={frameloop}
          performance={{ min: 0.6, max: 1, debounce: 220 }}
        >
          <AdaptiveDpr pixelated={false} />
          <ScrollControls
            pages={SECTION_COUNT}
            damping={reduced ? 0 : 0.12}
            style={{
              scrollbarWidth: "none",
              overscrollBehaviorY: "contain",
            }}
          >
            <ScrollBridge onReady={onScrollReady} />
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

      {contextLost && (
        <div className="canvas-recovery" role="alert" aria-live="assertive">
          <div className="canvas-recovery-card">
            <span className="eyebrow">{t("recovery", language)}</span>
            <strong>{language === "en" ? "3D renderer paused" : "تم إيقاف العارض ثلاثي الأبعاد"}</strong>
            <p>{language === "en" ? "The graphics context was interrupted. The briefing data is safe." : "تمت مقاطعة سياق الرسومات. بيانات الإحاطة محفوظة."}</p>
            <button type="button" className="intro-enter-btn" onClick={recoverCanvas}>
              <RotateCcw size={14} aria-hidden="true" />
              <span>{t("retryEngine", language)}</span>
            </button>
          </div>
        </div>
      )}

      <DeckOverlay
        language={language}
        reduced={reduced}
        activeSection={activeSection}
        scenario={scenario}
        host={scrollHost}
        onSelectNode={setSelectedNodeId}
        onOpenCalculator={() => setCalculatorOpen(true)}
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

      {/* Floating HUD Panels & Modals */}
      <LiveTelemetryFeed
        open={telemetryOpen}
        onClose={() => setTelemetryOpen(false)}
        language={language}
      />

      <RecoveryCalculator
        open={calculatorOpen}
        onClose={() => setCalculatorOpen(false)}
        language={language}
      />

      <NodeInspectorModal
        nodeId={selectedNodeId}
        onClose={() => setSelectedNodeId(null)}
        language={language}
      />

      <KeyboardHelp open={helpOpen} language={language} onClose={() => setHelpOpen(false)} />
    </motion.div>
  );
}
