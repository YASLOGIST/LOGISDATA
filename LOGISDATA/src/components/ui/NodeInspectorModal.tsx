"use client";

import { useEffect, useId } from "react";
import { AlertTriangle, CheckCircle, Network, Radio, Shield, Truck, X } from "lucide-react";
import { supplyNodeDetails } from "@/lib/simulation";
import { integer, number, percent, text, t } from "@/lib/i18n";
import type { Language } from "@/lib/types";

interface NodeInspectorModalProps {
  nodeId: string | null;
  onClose: () => void;
  language: Language;
}

export function NodeInspectorModal({ nodeId, onClose, language }: NodeInspectorModalProps) {
  const titleId = useId();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!nodeId) return null;
  const node = supplyNodeDetails[nodeId];
  if (!node) return null;

  const isLeak = node.status === "leak";
  const isPhantom = node.status === "phantom";

  return (
    <div className="inspector-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="inspector-modal">
        <div className="inspector-head">
          <div className="inspector-title-group">
            <Network size={18} className="inspector-icon" aria-hidden="true" />
            <div>
              <h2 id={titleId} className="inspector-title">{text(node.label, language)}</h2>
              <span className="inspector-role">{text(node.role, language)}</span>
            </div>
          </div>
          <button
            type="button"
            className="control-button"
            onClick={onClose}
            aria-label={t("closeDialog", language)}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        <div className="inspector-body">
          <div className="inspector-status-banner">
            <span className={`status-badge status-${node.status}`}>
              {isLeak ? <AlertTriangle size={14} /> : isPhantom ? <Radio size={14} /> : <CheckCircle size={14} />}
              <span>{isLeak ? t("leakRisk", language) : isPhantom ? t("phantom", language) : t("verified", language)}</span>
            </span>
            <p className="status-stream">{text(node.telemetryStream, language)}</p>
          </div>

          <div className="inspector-metrics-grid">
            <div className="inspector-metric-card">
              <span className="inspector-metric-label">{t("throughput", language)}</span>
              <strong dir="ltr">{integer(node.throughputTons, language)}</strong>
            </div>
            <div className="inspector-metric-card">
              <span className="inspector-metric-label">{t("carriers", language)}</span>
              <strong dir="ltr">
                <Truck size={14} className="inline-icon" aria-hidden="true" />
                {integer(node.activeCarriers, language)}
              </strong>
            </div>
            <div className="inspector-metric-card">
              <span className="inspector-metric-label">{t("transitVariance", language)}</span>
              <strong dir="ltr">±{number(node.transitVarianceHours, language, 1)} {t("hours", language)}</strong>
            </div>
            <div className="inspector-metric-card">
              <span className="inspector-metric-label">{t("leakRisk", language)}</span>
              <strong dir="ltr" className={isLeak ? "text-red" : "text-emerald"}>
                <Shield size={14} className="inline-icon" aria-hidden="true" />
                {percent(node.leakageRiskPct / 100, language, 1)}
              </strong>
            </div>
          </div>

          <div className="inspector-anomalies">
            <h3>{t("anomalies", language)}</h3>
            <ul>
              {node.anomalies.map((anom, i) => (
                <li key={i}>
                  <span className="anomaly-dot" aria-hidden="true" />
                  <span>{text(anom, language)}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
