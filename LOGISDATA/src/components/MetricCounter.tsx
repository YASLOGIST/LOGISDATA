"use client";

import { useEffect, useRef, useState } from "react";
import type { AuditMetric, Language } from "@/lib/types";
import { decimals, text } from "@/lib/i18n";

interface MetricCounterProps {
  metric: AuditMetric;
  language: Language;
  /** When true the final value is rendered immediately, with no count-up. */
  reduced?: boolean;
}

const DURATION_MS = 1250;

export function MetricCounter({ metric, language, reduced = false }: MetricCounterProps) {
  const [animated, setAnimated] = useState(0);
  const counterRef = useRef<HTMLDivElement>(null);
  // Derived, not stored: under reduced motion the final value is simply
  // rendered, with no state write and therefore no cascading render.
  const current = reduced ? metric.value : animated;

  useEffect(() => {
    if (reduced) return;
    const node = counterRef.current;
    if (!node) return;

    let frameId = 0;
    let cancelled = false;

    const run = () => {
      const startedAt = performance.now();
      const tick = (now: number) => {
        if (cancelled) return;
        const progress = Math.min((now - startedAt) / DURATION_MS, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setAnimated(metric.value * eased);
        if (progress < 1) frameId = requestAnimationFrame(tick);
      };
      frameId = requestAnimationFrame(tick);
    };

    // `IntersectionObserver` is unavailable in some embedded webviews and in
    // jsdom; degrade to animating immediately rather than showing a zero.
    if (typeof IntersectionObserver !== "function") {
      run();
      return () => {
        cancelled = true;
        cancelAnimationFrame(frameId);
      };
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return;
        observer.disconnect();
        run();
      },
      { threshold: 0.35 },
    );
    observer.observe(node);

    return () => {
      cancelled = true;
      observer.disconnect();
      cancelAnimationFrame(frameId);
    };
  }, [metric.value, reduced]);

  const formatted = decimals(current, language, metric.decimals);
  const finalValue = decimals(metric.value, language, metric.decimals);

  return (
    <div ref={counterRef} className="metric-counter">
      {/* The animated figure is hidden from assistive tech so a screen reader
          is not read a stream of intermediate numbers; the final value is
          exposed once, statically. */}
      <div className="metric-counter-value" dir="ltr" aria-hidden="true">
        <span className="metric-prefix">{metric.prefix}</span>
        <span>{formatted}</span>
        <span className="metric-suffix">{metric.suffix}</span>
      </div>
      <span className="visually-hidden">
        {metric.prefix}{finalValue}{metric.suffix} — {text(metric.label, language)}
      </span>
      <div className="metric-counter-label" aria-hidden="true">{text(metric.label, language)}</div>
      <div className="metric-counter-note">{text(metric.note, language)}</div>
    </div>
  );
}
