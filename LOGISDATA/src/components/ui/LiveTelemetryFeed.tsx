"use client";

import { useEffect, useState } from "react";
import { Activity, AlertOctagon, CheckCircle2, Pause, Play, ShieldAlert, Sparkles, X } from "lucide-react";
import { SAMPLE_TELEMETRY_EVENTS } from "@/lib/simulation";
import { text, t } from "@/lib/i18n";
import { sound } from "@/lib/sound";
import type { Language, TelemetryEvent, TelemetrySeverity } from "@/lib/types";

interface LiveTelemetryFeedProps {
  open: boolean;
  onClose: () => void;
  language: Language;
}

export function LiveTelemetryFeed({ open, onClose, language }: LiveTelemetryFeedProps) {
  const [events, setEvents] = useState<TelemetryEvent[]>(SAMPLE_TELEMETRY_EVENTS);
  const [isPaused, setIsPaused] = useState(false);
  const [filterSeverity, setFilterSeverity] = useState<string>("all");

  useEffect(() => {
    if (isPaused) return;

    const interval = setInterval(() => {
      const randomIdx = Math.floor(Math.random() * SAMPLE_TELEMETRY_EVENTS.length);
      const base = SAMPLE_TELEMETRY_EVENTS[randomIdx];
      const now = new Date();
      const timeStr = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}:${String(now.getSeconds()).padStart(2, "0")}`;

      const newEvent: TelemetryEvent = {
        ...base,
        id: `evt-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
        timestamp: timeStr,
      };

      setEvents((prev) => [newEvent, ...prev.slice(0, 19)]);

      if (newEvent.severity === "critical") {
        sound.playAlert();
      } else if (newEvent.severity === "optimized") {
        sound.playSuccess();
      }
    }, 4500);

    return () => clearInterval(interval);
  }, [isPaused]);

  if (!open) return null;

  const filteredEvents =
    filterSeverity === "all" ? events : events.filter((e) => e.severity === filterSeverity);

  const getSeverityIcon = (sev: TelemetrySeverity) => {
    switch (sev) {
      case "critical":
        return <AlertOctagon size={14} className="text-red" aria-hidden="true" />;
      case "warning":
        return <ShieldAlert size={14} className="text-amber" aria-hidden="true" />;
      case "reconciled":
        return <CheckCircle2 size={14} className="text-cyan" aria-hidden="true" />;
      case "optimized":
        return <Sparkles size={14} className="text-emerald" aria-hidden="true" />;
    }
  };

  return (
    <div className="telemetry-panel" role="region" aria-labelledby="telemetry-panel-title">
      <div className="telemetry-header">
        <div className="telemetry-title-group">
          <Activity size={16} className="telemetry-pulse-icon" aria-hidden="true" />
          <h2 id="telemetry-panel-title" className="telemetry-title">
            {t("telemetryTitle", language)}
          </h2>
          <span className="telemetry-live-badge">{t("livePulse", language)}</span>
        </div>
        <div className="telemetry-controls">
          <button
            type="button"
            className="control-button telemetry-btn"
            onClick={() => setIsPaused((p) => !p)}
            aria-label={isPaused ? t("telemetryResume", language) : t("telemetryPause", language)}
          >
            {isPaused ? <Play size={13} aria-hidden="true" /> : <Pause size={13} aria-hidden="true" />}
            <span>{isPaused ? t("telemetryResume", language) : t("telemetryPause", language)}</span>
          </button>
          <button
            type="button"
            className="control-button telemetry-btn"
            onClick={onClose}
            aria-label={t("closeDialog", language)}
          >
            <X size={14} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div className="telemetry-filters">
        <span className="filter-label">{t("filter", language)}:</span>
        {(["all", "critical", "warning", "reconciled", "optimized"] as const).map((sev) => (
          <button
            key={sev}
            type="button"
            className={`filter-chip ${filterSeverity === sev ? "filter-chip-active" : ""}`}
            onClick={() => setFilterSeverity(sev)}
          >
            {sev.toUpperCase()}
          </button>
        ))}
      </div>

      <div className="telemetry-stream" role="log" aria-live="polite">
        {filteredEvents.map((evt) => (
          <div key={evt.id} className={`telemetry-row severity-${evt.severity}`}>
            <span className="telemetry-time" dir="ltr">
              {evt.timestamp}
            </span>
            <span className="telemetry-badge">
              {getSeverityIcon(evt.severity)}
              <span>{evt.code}</span>
            </span>
            <p className="telemetry-msg">{text(evt.message, language)}</p>
            {evt.deltaValue && (
              <span className="telemetry-delta" dir="ltr">
                {evt.deltaValue}
              </span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
