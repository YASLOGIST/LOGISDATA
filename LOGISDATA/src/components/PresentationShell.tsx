"use client";

import dynamic from "next/dynamic";
import { Component, type ErrorInfo, type ReactNode, useState } from "react";
import { IntroScreen } from "@/components/IntroScreen";

const Presentation = dynamic(
  () => import("@/components/Presentation").then((module) => module.Presentation),
  {
    ssr: false,
    loading: () => (
      <div className="experience-loader" role="status" aria-live="polite">
        <div className="loader-orbit"><span /></div>
        <strong>AAST / CONTROL ROOM</strong>
        <span>Initializing the audit engine</span>
      </div>
    ),
  },
);

interface BoundaryState {
  failed: boolean;
}

class ExperienceBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  state: BoundaryState = { failed: false };

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    // Keep the UI recoverable while still leaving a useful signal in browser telemetry.
    console.error("Presentation engine failed", error, info.componentStack);
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="experience-fallback">
          <span className="eyebrow">CONTROL ROOM / RECOVERY</span>
          <h1>The visualization engine could not start.</h1>
          <p>Check that hardware acceleration is enabled, then retry the experience.</p>
          <button type="button" className="intro-enter-btn" onClick={() => this.setState({ failed: false })}>
            Retry engine
          </button>
        </main>
      );
    }
    return this.props.children;
  }
}

/** Lightweight entry shell: the Three.js runtime is downloaded only after intent. */
export function PresentationShell() {
  const [entered, setEntered] = useState(false);

  if (!entered) return <IntroScreen onEnter={() => setEntered(true)} />;

  return (
    <ExperienceBoundary>
      <Presentation />
    </ExperienceBoundary>
  );
}
