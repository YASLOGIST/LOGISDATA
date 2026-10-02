"use client";

import { memo, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { AlertTriangle, Check, FileCheck2, Filter, ScanLine, Search } from "lucide-react";
import { presentationCopy } from "@/lib/data";
import { getScenarioFreightRows } from "@/lib/simulation";
import { integer, number, text, t } from "@/lib/i18n";
import { DURATION, STAGGER, staggerDelay, transition } from "@/lib/motion";
import { SECTIONS } from "@/lib/sections";
import { GlassCard } from "@/components/ui/GlassCard";
import { DatasetExport } from "@/components/ui/DatasetExport";
import type { SectionProps } from "./types";

function AuditSectionImpl({ language, active, reduced, scenario = "active-audit" }: SectionProps) {
  const copy = presentationCopy.audit;
  const dim = (value: number) => (active ? 1 : value);
  const rtl = language === "ar";

  const [searchQuery, setSearchQuery] = useState("");
  const [verdictFilter, setVerdictFilter] = useState<"all" | "red-flag" | "passed">("all");

  const rows = useMemo(() => {
    const raw = getScenarioFreightRows(scenario);
    return raw.filter((row) => {
      const matchesSearch = text(row.freightType, language)
        .toLowerCase()
        .includes(searchQuery.toLowerCase());
      const matchesVerdict = verdictFilter === "all" || row.verdict === verdictFilter;
      return matchesSearch && matchesVerdict;
    });
  }, [scenario, language, searchQuery, verdictFilter]);

  const flaggedCount = rows.filter((row) => row.verdict === "red-flag").length;
  const totalOverchargePct = rows
    .filter((row) => row.verdict === "red-flag")
    .reduce((sum, row) => sum + row.overchargePct, 0);

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
            <div className="eyebrow-row">
              <span className="eyebrow-mark" aria-hidden="true" />
              <span className="eyebrow">{text(copy.eyebrow, language)}</span>
            </div>
            <h2 id="audit-title" className="section-title">{text(copy.title, language)}</h2>
            <p className="section-description">{text(copy.description, language)}</p>
          </div>
          <GlassCard className="scanner-summary" tone="amber">
            <div className="scanner-summary-icon" aria-hidden="true">
              <ScanLine size={19} />
            </div>
            <div>
              <p className="summary-number" dir="ltr">
                {integer(flaggedCount, language)} / {integer(rows.length, language)}
              </p>
              <p className="summary-label">
                {text(copy.redFlag, language)} · {number(totalOverchargePct, language, 1)}%{" "}
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
            <div className="toolbar-title">
              <FileCheck2 size={16} aria-hidden="true" />
              <span>{text(copy.scannerLabel, language)}</span>
            </div>

            {/* Interactive Search & Filter Controls */}
            <div className="table-filter-group">
              <div className="table-search-box">
                <Search size={13} aria-hidden="true" />
                <input
                  type="text"
                  placeholder={t("search", language)}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  aria-label={t("search", language)}
                />
              </div>
              <div className="table-verdict-filters" role="group" aria-label={t("filter", language)}>
                <Filter size={13} aria-hidden="true" className="filter-icon" />
                {(["all", "red-flag", "passed"] as const).map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`filter-btn ${verdictFilter === v ? "filter-btn-active" : ""}`}
                    onClick={() => setVerdictFilter(v)}
                  >
                    {v === "all"
                      ? t("allRecords", language)
                      : v === "red-flag"
                        ? text(copy.redFlag, language)
                        : text(copy.passed, language)}
                  </button>
                ))}
              </div>
            </div>

            <div className="toolbar-actions">
              <DatasetExport dataset="freight-audit" language={language} scenario={scenario} />
            </div>
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
                {rows.length === 0 ? (
                  <tr>
                    <td className="table-empty-state" colSpan={6}>
                      {t("noRecords", language)}
                    </td>
                  </tr>
                ) : rows.map((row, index) => {
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
                        <span
                          className={`row-status-dot ${isFlagged ? "dot-red" : "dot-green"}`}
                          aria-hidden="true"
                        />
                        {text(row.freightType, language)}
                      </th>
                      <td className="tabular" dir="ltr">{integer(row.billedMileage, language)}</td>
                      <td className="tabular" dir="ltr">{integer(row.actualMileage, language)}</td>
                      <td className={`tabular ${isFlagged ? "cell-warning" : "cell-good"}`} dir="ltr">
                        {number(row.duplicateBillingPct, language, 1)}%
                      </td>
                      <td className={`tabular ${row.overchargePct > 2 ? "cell-warning" : "cell-good"}`} dir="ltr">
                        {number(row.overchargePct, language, 1)}%
                      </td>
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
            <span className="footnote-marker" aria-hidden="true">●</span>{" "}
            {text(presentationCopy.hero.modelNote, language)}
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export const AuditSection = memo(AuditSectionImpl);
