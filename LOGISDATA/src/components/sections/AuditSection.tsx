"use client";

import { memo } from "react";

import { motion } from "framer-motion";
import { AlertTriangle, Check, FileCheck2, ScanLine } from "lucide-react";
import { freightAuditRows, presentationCopy } from "@/lib/data";
import { integer, number, text } from "@/lib/i18n";
import { auditSummary } from "@/lib/metrics";
import { DURATION, STAGGER, staggerDelay, transition } from "@/lib/motion";
import { SECTIONS } from "@/lib/sections";
import { GlassCard } from "@/components/ui/GlassCard";
import { DatasetExport } from "@/components/ui/DatasetExport";
import type { SectionProps } from "./types";

function AuditSectionImpl({ language, active, reduced }: SectionProps) {
  const copy = presentationCopy.audit;
  const dim = (value: number) => (active ? 1 : value);
  const rtl = language === "ar";

  return (
    <section
      id={SECTIONS[1].domId}
      className="presentation-section section-audit"
      aria-labelledby="audit-title"
    >
      <div className="section-inner">
        <motion.div
          className="section-heading-row"
          initial={reduced ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: dim(0.76), y: active || reduced ? 0 : 8 }}
          transition={transition(DURATION.slow, { reduced })}
        >
          <div className="section-heading-copy">
            <div className="eyebrow-row"><span className="eyebrow-mark" aria-hidden="true" /><span className="eyebrow">{text(copy.eyebrow, language)}</span></div>
            <h2 id="audit-title" className="section-title">{text(copy.title, language)}</h2>
            <p className="section-description">{text(copy.description, language)}</p>
          </div>
          <GlassCard className="scanner-summary" tone="amber">
            <div className="scanner-summary-icon" aria-hidden="true"><ScanLine size={19} /></div>
            <div>
              <p className="summary-number" dir="ltr">
                {integer(auditSummary.flagged, language)} / {integer(auditSummary.total, language)}
              </p>
              <p className="summary-label">
                {text(copy.redFlag, language)} · {number(auditSummary.totalOverchargePct, language, 1)}%{" "}
                {text(copy.tableHeaders.overcharge, language)}
              </p>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          className="audit-table-shell"
          initial={reduced ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: dim(0.82), y: active || reduced ? 0 : 10 }}
          transition={transition(DURATION.slow, { reduced, delay: 0.1 })}
        >
          <div className="table-toolbar">
            <div className="toolbar-title"><FileCheck2 size={16} aria-hidden="true" /><span>{text(copy.scannerLabel, language)}</span></div>
            <span className="toolbar-subtitle">{text(copy.scannerSubLabel, language)}</span>
            <DatasetExport dataset="freight-audit" language={language} />
          </div>
          <div className="table-overflow" tabIndex={0} role="region" aria-labelledby="audit-title">
            <table className="audit-table">
              <caption className="visually-hidden">{text(copy.description, language)}</caption>
              <thead>
                <tr>
                  <th scope="col">{text(copy.tableHeaders.freight, language)}</th>
                  <th scope="col">{text(copy.tableHeaders.billed, language)}</th>
                  <th scope="col">{text(copy.tableHeaders.actual, language)}</th>
                  <th scope="col">{text(copy.tableHeaders.duplicate, language)}</th>
                  <th scope="col">{text(copy.tableHeaders.overcharge, language)}</th>
                  <th scope="col">{text(copy.tableHeaders.verdict, language)}</th>
                </tr>
              </thead>
              <tbody>
                {freightAuditRows.map((row, index) => {
                  const isFlagged = row.verdict === "red-flag";
                  return (
                    <motion.tr
                      key={row.id}
                      initial={reduced ? false : { opacity: 0, x: rtl ? 12 : -12 }}
                      animate={{ opacity: dim(0.84), x: active || reduced ? 0 : 4 }}
                      transition={transition(DURATION.base, {
                        reduced,
                        delay: active ? staggerDelay(index, { step: STAGGER.base }) : 0,
                      })}
                    >
                      <th scope="row" className="freight-name">
                        <span className={`row-status-dot ${isFlagged ? "dot-red" : "dot-green"}`} aria-hidden="true" />
                        {text(row.freightType, language)}
                      </th>
                      <td className="tabular" dir="ltr">{integer(row.billedMileage, language)}</td>
                      <td className="tabular" dir="ltr">{integer(row.actualMileage, language)}</td>
                      <td className={`tabular ${isFlagged ? "cell-warning" : "cell-good"}`} dir="ltr">{number(row.duplicateBillingPct, language, 1)}%</td>
                      <td className={`tabular ${row.overchargePct > 2 ? "cell-warning" : "cell-good"}`} dir="ltr">{number(row.overchargePct, language, 1)}%</td>
                      <td>
                        <span className={`verdict-chip ${isFlagged ? "verdict-red" : "verdict-green"}`}>
                          {isFlagged ? <AlertTriangle size={13} aria-hidden="true" /> : <Check size={13} aria-hidden="true" />}
                          {text(isFlagged ? copy.redFlag : copy.passed, language)}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="table-footnote">
            <span className="footnote-marker" aria-hidden="true">●</span> {text(presentationCopy.hero.modelNote, language)}
          </div>
        </motion.div>
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
export const AuditSection = memo(AuditSectionImpl);
