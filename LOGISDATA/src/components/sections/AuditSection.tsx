"use client";

import { motion } from "framer-motion";
import { AlertTriangle, Check, FileCheck2, ScanLine } from "lucide-react";
import { freightAuditRows, presentationCopy } from "@/lib/data";
import { integer, number, text } from "@/lib/i18n";
import type { Language } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";

interface AuditSectionProps {
  language: Language;
  active: boolean;
}

const ease = [0.22, 1, 0.36, 1] as const;

export function AuditSection({ language, active }: AuditSectionProps) {
  const copy = presentationCopy.audit;
  const flaggedRows = freightAuditRows.filter((row) => row.verdict === "red-flag");
  const totalOvercharge = flaggedRows.reduce((sum, row) => sum + row.overchargePct, 0);

  return (
    <section id="section-2" className="presentation-section section-audit snap-start" aria-labelledby="audit-title">
      <div className="section-inner">
        <motion.div
          className="section-heading-row"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: active ? 1 : 0.76, y: active ? 0 : 8 }}
          transition={{ duration: 0.7, ease }}
        >
          <div className="section-heading-copy">
            <div className="eyebrow-row"><span className="eyebrow-mark" /><span className="eyebrow">{text(copy.eyebrow, language)}</span></div>
            <h2 id="audit-title" className="section-title">{text(copy.title, language)}</h2>
            <p className="section-description">{text(copy.description, language)}</p>
          </div>
          <GlassCard className="scanner-summary" tone="amber">
            <div className="scanner-summary-icon"><ScanLine size={19} /></div>
            <div>
              <p className="summary-number" dir="ltr">{integer(flaggedRows.length, language)} / {integer(freightAuditRows.length, language)}</p>
              <p className="summary-label">{text(copy.redFlag, language)} · {number(totalOvercharge, language, 1)}% {text(copy.tableHeaders.overcharge, language)}</p>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          className="audit-table-shell"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: active ? 1 : 0.82, y: active ? 0 : 10 }}
          transition={{ duration: 0.8, delay: 0.1, ease }}
        >
          <div className="table-toolbar">
            <div className="toolbar-title"><FileCheck2 size={16} /><span>{text(copy.scannerLabel, language)}</span></div>
            <span className="toolbar-subtitle">{text(copy.scannerSubLabel, language)}</span>
          </div>
          <div className="table-overflow">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>{text(copy.tableHeaders.freight, language)}</th>
                  <th>{text(copy.tableHeaders.billed, language)}</th>
                  <th>{text(copy.tableHeaders.actual, language)}</th>
                  <th>{text(copy.tableHeaders.duplicate, language)}</th>
                  <th>{text(copy.tableHeaders.overcharge, language)}</th>
                  <th>{text(copy.tableHeaders.verdict, language)}</th>
                </tr>
              </thead>
              <tbody>
                {freightAuditRows.map((row, index) => {
                  const isFlagged = row.verdict === "red-flag";
                  return (
                    <motion.tr
                      key={row.id}
                      initial={{ opacity: 0, x: language === "ar" ? 12 : -12 }}
                      animate={{ opacity: active ? 1 : 0.84, x: active ? 0 : 4 }}
                      transition={{ duration: 0.45, delay: active ? index * 0.06 : 0, ease }}
                    >
                      <td className="freight-name"><span className={`row-status-dot ${isFlagged ? "dot-red" : "dot-green"}`} />{text(row.freightType, language)}</td>
                      <td className="tabular" dir="ltr">{integer(row.billedMileage, language)}</td>
                      <td className="tabular" dir="ltr">{integer(row.actualMileage, language)}</td>
                      <td className={`tabular ${isFlagged ? "cell-warning" : "cell-good"}`} dir="ltr">{number(row.duplicateBillingPct, language, 1)}%</td>
                      <td className={`tabular ${row.overchargePct > 2 ? "cell-warning" : "cell-good"}`} dir="ltr">{number(row.overchargePct, language, 1)}%</td>
                      <td>
                        <span className={`verdict-chip ${isFlagged ? "verdict-red" : "verdict-green"}`}>
                          {isFlagged ? <AlertTriangle size={13} /> : <Check size={13} />}
                          {text(isFlagged ? copy.redFlag : copy.passed, language)}
                        </span>
                      </td>
                    </motion.tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div className="table-footnote"><span className="footnote-marker">●</span> {text(presentationCopy.hero.modelNote, language)}</div>
        </motion.div>
      </div>
    </section>
  );
}
