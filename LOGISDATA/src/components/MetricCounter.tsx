"use client";

import { useEffect, useRef, useState } from "react";
import type { AuditMetric, Language } from "@/lib/types";
import { text } from "@/lib/i18n";

interface MetricCounterProps {
  metric: AuditMetric;
  language: Language;
}

export function MetricCounter({ metric, language }: MetricCounterProps) {
  const [hasEntered, setHasEntered] = useState(false);
  const [current, setCurrent] = useState(0);
  const counterRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = counterRef.current;
    if (!node) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setHasEntered(true);
      },
      { threshold: 0.35 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!hasEntered) return;
    const startedAt = performance.now();
    const duration = 1250;
    let frameId = 0;
    const tick = (now: number) => {
      const progress = Math.min((now - startedAt) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setCurrent(metric.value * eased);
      if (progress < 1) frameId = requestAnimationFrame(tick);
    };
    frameId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frameId);
  }, [hasEntered, metric.value]);

  const formatted = new Intl.NumberFormat(language === "ar" ? "ar-EG" : "en-US", {
    minimumFractionDigits: metric.decimals,
    maximumFractionDigits: metric.decimals,
  }).format(current);

  return (
    <div ref={counterRef} className="metric-counter">
      <div className="metric-counter-value" dir="ltr">
        <span className="metric-prefix">{metric.prefix}</span>
        <span>{formatted}</span>
        <span className="metric-suffix">{metric.suffix}</span>
      </div>
      <div className="metric-counter-label">{text(metric.label, language)}</div>
      <div className="metric-counter-note">{text(metric.note, language)}</div>
    </div>
  );
}
