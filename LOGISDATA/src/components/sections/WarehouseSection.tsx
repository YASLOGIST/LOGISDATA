"use client";

import { memo } from "react";

import { motion } from "framer-motion";
import { Boxes, CheckCircle2, ScanBarcode, TriangleAlert } from "lucide-react";
import { presentationCopy, warehouseSpecs } from "@/lib/data";
import { integer, percent, text } from "@/lib/i18n";
import { warehouseSummary } from "@/lib/metrics";
import { DURATION, staggerDelay, transition } from "@/lib/motion";
import { SECTIONS } from "@/lib/sections";
import { GlassCard } from "@/components/ui/GlassCard";
import { DatasetExport } from "@/components/ui/DatasetExport";
import type { SectionProps } from "./types";

function WarehouseSectionImpl({ language, active, reduced }: SectionProps) {
  const copy = presentationCopy.warehouse;
  const dim = (value: number) => (active ? 1 : value);

  return (
    <section
      id={SECTIONS[4].domId}
      className="presentation-section section-warehouse"
      aria-labelledby="warehouse-title"
    >
      <div className="section-inner warehouse-inner">
        <motion.div
          className="section-heading-row"
          initial={reduced ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: dim(0.76), y: active || reduced ? 0 : 8 }}
          transition={transition(DURATION.slow, { reduced })}
        >
          <div className="section-heading-copy">
            <div className="eyebrow-row"><span className="eyebrow-mark" aria-hidden="true" /><span className="eyebrow">{text(copy.eyebrow, language)}</span></div>
            <h2 id="warehouse-title" className="section-title">{text(copy.title, language)}</h2>
            <p className="section-description">{text(copy.description, language)}</p>
          </div>
          <GlassCard className="warehouse-status" tone="emerald">
            <div className="warehouse-status-icon" aria-hidden="true"><ScanBarcode size={17} /></div>
            <div>
              <span>{text(copy.scanLabel, language)}</span>
              <strong dir="ltr">
                {integer(warehouseSummary.audited, language)} / {integer(warehouseSummary.total, language)}
              </strong>
              <span className="warehouse-accuracy">{percent(warehouseSummary.accuracy, language, 1)}</span>
            </div>
            <span className="status-pulse pulse-green" aria-hidden="true" />
          </GlassCard>
        </motion.div>

        <ul className="warehouse-spec-grid">
          {warehouseSpecs.map((spec, index) => {
            const isWarning = spec.tone === "red" || spec.tone === "amber";
            return (
              <motion.li
                key={spec.id}
                initial={reduced ? false : { opacity: 0, y: 25 }}
                animate={{ opacity: dim(0.82), y: active || reduced ? 0 : 10 }}
                transition={transition(DURATION.base, {
                  reduced,
                  delay: active ? staggerDelay(index, { step: 0.08 }) : 0,
                })}
              >
                <GlassCard as="article" className="warehouse-spec-card" tone={spec.tone}>
                  <div className="spec-topline">
                    <span className={`spec-icon ${isWarning ? "spec-icon-warn" : "spec-icon-good"}`} aria-hidden="true">
                      {isWarning ? <TriangleAlert size={16} /> : <Boxes size={16} />}
                    </span>
                    <span className="spec-index" dir="ltr" aria-hidden="true">0{index + 1}</span>
                  </div>
                  <h3>{text(spec.title, language)}</h3>
                  <div className="spec-impact"><span>{text(copy.headers.impact, language)}</span><strong>{text(spec.impact, language)}</strong></div>
                  <div className="spec-detail"><span>{text(copy.headers.cause, language)}</span><p>{text(spec.cause, language)}</p></div>
                  <div className="spec-detail spec-fix">
                    <span><CheckCircle2 size={12} aria-hidden="true" /> {text(copy.headers.fix, language)}</span>
                    <p>{text(spec.fix, language)}</p>
                  </div>
                </GlassCard>
              </motion.li>
            );
          })}
        </ul>

        <motion.div
          className="warehouse-footer"
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: dim(0.74) }}
          transition={transition(DURATION.slow, { reduced, delay: 0.35 })}
        >
          <span><span className="legend-dot legend-mismatch" aria-hidden="true" />{text(copy.mismatch, language)} · {integer(warehouseSummary.mismatches, language)}</span>
          <span><span className="legend-dot legend-audited" aria-hidden="true" />{text(copy.audited, language)} · {integer(warehouseSummary.audited, language)}</span>
          <span className="warehouse-footer-note">{text(presentationCopy.footer.statement, language)}</span>
          <DatasetExport dataset="warehouse-control" language={language} />
        </motion.div>
        <p className="warehouse-illustrative">{text(presentationCopy.footer.illustrative, language)}</p>
      </div>
    </section>
  );
}

/**
 * PERF: memoised. Crossing a section boundary flips `active` on exactly
 * two of the five sections, but the parent re-render used to reconcile all
 * five full-viewport subtrees (cards, tables, counters, framer-motion
 * nodes) on that same frame. With `memo` only the leaving and entering
 * sections do any work.
 */
export const WarehouseSection = memo(WarehouseSectionImpl);
