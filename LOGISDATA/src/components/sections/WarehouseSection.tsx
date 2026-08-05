"use client";

import { motion } from "framer-motion";
import { Boxes, CheckCircle2, ScanBarcode, TriangleAlert } from "lucide-react";
import { presentationCopy, warehouseBins, warehouseSpecs } from "@/lib/data";
import { integer, text } from "@/lib/i18n";
import type { Language } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";

interface WarehouseSectionProps {
  language: Language;
  active: boolean;
}

const ease = [0.22, 1, 0.36, 1] as const;

export function WarehouseSection({ language, active }: WarehouseSectionProps) {
  const copy = presentationCopy.warehouse;
  const mismatches = warehouseBins.filter((bin) => bin.status === "mismatch").length;
  const audited = warehouseBins.length - mismatches;

  return (
    <section id="section-5" className="presentation-section section-warehouse snap-start" aria-labelledby="warehouse-title">
      <div className="section-inner warehouse-inner">
        <motion.div
          className="section-heading-row"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: active ? 1 : 0.76, y: active ? 0 : 8 }}
          transition={{ duration: 0.7, ease }}
        >
          <div className="section-heading-copy">
            <div className="eyebrow-row"><span className="eyebrow-mark" /><span className="eyebrow">{text(copy.eyebrow, language)}</span></div>
            <h2 id="warehouse-title" className="section-title">{text(copy.title, language)}</h2>
            <p className="section-description">{text(copy.description, language)}</p>
          </div>
          <GlassCard className="warehouse-status" tone="emerald">
            <div className="warehouse-status-icon"><ScanBarcode size={17} /></div>
            <div><span>{text(copy.scanLabel, language)}</span><strong dir="ltr">{integer(audited, language)} / {integer(warehouseBins.length, language)}</strong></div>
            <span className="status-pulse pulse-green" />
          </GlassCard>
        </motion.div>

        <div className="warehouse-spec-grid">
          {warehouseSpecs.map((spec, index) => {
            const isWarning = spec.tone === "red" || spec.tone === "amber";
            return (
              <motion.div
                key={spec.id}
                initial={{ opacity: 0, y: 25 }}
                animate={{ opacity: active ? 1 : 0.82, y: active ? 0 : 10 }}
                transition={{ duration: 0.55, delay: active ? index * 0.08 : 0, ease }}
              >
                <GlassCard as="article" className="warehouse-spec-card" tone={spec.tone}>
                  <div className="spec-topline">
                    <span className={`spec-icon ${isWarning ? "spec-icon-warn" : "spec-icon-good"}`}>
                      {isWarning ? <TriangleAlert size={16} /> : <Boxes size={16} />}
                    </span>
                    <span className="spec-index" dir="ltr">0{index + 1}</span>
                  </div>
                  <h3>{text(spec.title, language)}</h3>
                  <div className="spec-impact"><span>{text(copy.headers.impact, language)}</span><strong>{text(spec.impact, language)}</strong></div>
                  <div className="spec-detail"><span>{text(copy.headers.cause, language)}</span><p>{text(spec.cause, language)}</p></div>
                  <div className="spec-detail spec-fix"><span><CheckCircle2 size={12} /> {text(copy.headers.fix, language)}</span><p>{text(spec.fix, language)}</p></div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>

        <motion.div
          className="warehouse-footer"
          initial={{ opacity: 0 }}
          animate={{ opacity: active ? 1 : 0.74 }}
          transition={{ duration: 0.8, delay: 0.35, ease }}
        >
          <span><span className="legend-dot legend-mismatch" />{text(copy.mismatch, language)} · {integer(mismatches, language)}</span>
          <span><span className="legend-dot legend-audited" />{text(copy.audited, language)} · {integer(audited, language)}</span>
          <span className="warehouse-footer-note">{text(presentationCopy.footer.statement, language)}</span>
        </motion.div>
        <p className="warehouse-illustrative">{text(presentationCopy.footer.illustrative, language)}</p>
      </div>
    </section>
  );
}
