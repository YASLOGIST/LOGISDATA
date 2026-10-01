"use client";

import dynamic from "next/dynamic";
import Link from "next/link";
import { Component, useCallback, useState, type ErrorInfo, type ReactNode } from "react";
import { FileText, RotateCcw } from "lucide-react";
import { IntroScreen } from "@/components/IntroScreen";
import { PreferencesProvider, usePreferences } from "@/components/providers/PreferencesProvider";
import { t } from "@/lib/i18n";
import type { Language } from "@/lib/types";

const Presentation = dynamic(
  () => import("@/components/Presentation").then((module) => module.Presentation),
  {
    ssr: false,
    loading: () => <EngineLoader />,
  },
);

function EngineLoader() {
  const { language } = usePreferences();
  return (
    <div className="experience-loader" role="status" aria-live="polite">
      <div className="loader-orbit" aria-hidden="true"><span /></div>
      <strong>AAST / CONTROL ROOM</strong>
      <span>{t("loadingEngine", language)}</span>
    </div>
  );
}

interface BoundaryState {
  failed: boolean;
}

interface BoundaryProps {
  children: ReactNode;
  language: Language;
  onReset: () => void;
}

/**
 * Recovers from a WebGL/runtime failure inside the deferred 3D bundle.
 *
 * Upgrades over v2: the copy is localized, resetting also remounts the
 * subtree (a bare `setState` previously re-rendered the same failed tree
 * with the same props and usually failed again immediately), and the user
 * is always offered the no-WebGL text briefing as an escape hatch.
 */
class ExperienceBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the UI recoverable while still leaving a useful signal in browser telemetry.
    console.error("Presentation engine failed", error, info.componentStack);
  }

  private retry = () => {
    this.setState({ failed: false });
    this.props.onReset();
  };

  render() {
    const { language } = this.props;
    if (this.state.failed) {
      return (
        <main className="experience-fallback">
          <span className="eyebrow">{t("recovery", language)}</span>
          <h1>{t("engineFailedTitle", language)}</h1>
          <p>{t("engineFailedBody", language)}</p>
          <div className="fallback-actions">
            <button type="button" className="intro-enter-btn" onClick={this.retry}>
              <RotateCcw size={15} aria-hidden="true" />
              <span>{t("retryEngine", language)}</span>
            </button>
            <Link className="intro-secondary-btn" href="/handout" prefetch={false}>
              <FileText size={14} aria-hidden="true" />
              <span>{t("openHandout", language)}</span>
            </Link>
          </div>
        </main>
      );
    }
    return this.props.children;
  }
}

/** Shown when the device cannot create a WebGL context at all. */
function NoWebglNotice() {
  const { language } = usePreferences();
  return (
    <main className="experience-fallback">
      <span className="eyebrow">{t("recovery", language)}</span>
      <h1>{t("noWebglTitle", language)}</h1>
      <p>{t("noWebglBody", language)}</p>
      <div className="fallback-actions">
        <Link className="intro-enter-btn" href="/handout" prefetch={false}>
          <FileText size={15} aria-hidden="true" />
          <span>{t("openHandout", language)}</span>
        </Link>
      </div>
    </main>
  );
}

function ShellBody() {
  const { language, device, hydrated } = usePreferences();
  const [entered, setEntered] = useState(false);
  const [generation, setGeneration] = useState(0);
  const reset = useCallback(() => setGeneration((value) => value + 1), []);

  if (!entered) return <IntroScreen onEnter={() => setEntered(true)} />;
  // `hydrated` guards against rendering the fallback before the capability
  // probe has run on the client.
  if (hydrated && device.tier === "none") return <NoWebglNotice />;

  return (
    <ExperienceBoundary key={generation} language={language} onReset={reset}>
      <Presentation />
    </ExperienceBoundary>
  );
}

/** Lightweight entry shell: the Three.js runtime is downloaded only after intent. */
export function PresentationShell() {
  return (
    <PreferencesProvider>
      <ShellBody />
    </PreferencesProvider>
  );
}
