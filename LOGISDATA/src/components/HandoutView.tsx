"use client";

import Link from "next/link";
import Image from "next/image";
import { useMemo, useState } from "react";
import {
  ArrowUpRight,
  Calculator,
  DollarSign,
  Download,
  Languages,
  Moon,
  Printer,
  Sparkles,
  Sun,
  TrendingUp,
} from "lucide-react";
import {
  auditMetrics,
  demandTiers,
  freightAuditRows,
  presentationCopy,
  routeRegions,
  warehouseSpecs,
} from "@/lib/data";
import { calculateRecovery, DEFAULT_RECOVERY_PARAMS } from "@/lib/simulation";
import { currency, decimals, integer, number, percent, t, text } from "@/lib/i18n";
import { downloadExecutiveReportJson } from "@/lib/export";
import { auditSummary, demandSummary, routeSummary, warehouseSummary } from "@/lib/metrics";
import { SECTIONS } from "@/lib/sections";
import { PreferencesProvider, usePreferences } from "@/components/providers/PreferencesProvider";
import { DatasetExport } from "@/components/ui/DatasetExport";
import type { RecoveryParameters } from "@/lib/types";

function Handout() {
  const { language, theme, rtl, toggleLanguage, toggleTheme } = usePreferences();
  const copy = presentationCopy;
  const [calcParams, setCalcParams] = useState<RecoveryParameters>(DEFAULT_RECOVERY_PARAMS);

  const recovery = useMemo(() => calculateRecovery(calcParams), [calcParams]);

  return (
    <div className="handout" data-theme={theme} dir={rtl ? "rtl" : "ltr"}>
      <a className="skip-link" href="#handout-main">
        {t("skipToContent", language)}
      </a>

      <header className="handout-header">
        <div className="handout-brand">
          <Image src="/aast-logo.png" alt="" width={44} height={43} sizes="44px" aria-hidden="true" />
          <div>
            <strong>AAST</strong>
            <small>{text(copy.nav.eyebrow, language)}</small>
          </div>
        </div>
        <div className="handout-actions no-print">
          <button
            type="button"
            className="control-button"
            onClick={() => downloadExecutiveReportJson(language)}
            aria-label={t("exportJson", language)}
          >
            <Download size={15} aria-hidden="true" />
            <span>JSON</span>
          </button>
          <button
            type="button"
            className="control-button"
            onClick={toggleLanguage}
            aria-label={text(copy.nav.language, language)}
          >
            <Languages size={15} aria-hidden="true" />
            <span>{language === "en" ? "AR" : "EN"}</span>
          </button>
          <button
            type="button"
            className="control-button"
            onClick={toggleTheme}
            aria-label={text(copy.nav.theme, language)}
            aria-pressed={theme === "light"}
          >
            {theme === "dark" ? <Sun size={15} aria-hidden="true" /> : <Moon size={15} aria-hidden="true" />}
            <span>{theme === "dark" ? "LIGHT" : "DARK"}</span>
          </button>
          <button type="button" className="control-button" onClick={() => window.print()}>
            <Printer size={15} aria-hidden="true" />
            <span>{t("print", language)}</span>
          </button>
          <Link className="control-button" href="/" prefetch={false}>
            <ArrowUpRight size={15} aria-hidden="true" />
            <span>{t("backToControlRoom", language)}</span>
          </Link>
        </div>
      </header>

      <main id="handout-main" className="handout-main" tabIndex={-1}>
        <p className="eyebrow">{t("handoutTitle", language)}</p>
        <h1>{text(copy.hero.title, language)}</h1>
        <p className="handout-lead">{text(copy.hero.subhead, language)}</p>
        <p className="handout-meta">
          {copy.hero.presenter} · {text(copy.hero.registrationLabel, language)} {copy.hero.registration} ·{" "}
          {text(copy.hero.date, language)}
        </p>
        <p className="handout-note no-print">{t("handoutLead", language)}</p>

        <nav className="handout-toc" aria-label={t("sections", language)}>
          <ol>
            {SECTIONS.map((section) => (
              <li key={section.slug}>
                <a href={`#handout-${section.slug}`}>{text(section.label, language)}</a>
              </li>
            ))}
          </ol>
        </nav>

        {/* 01 — headline metrics */}
        <section id={`handout-${SECTIONS[0].slug}`} aria-labelledby="handout-overview-title">
          <h2 id="handout-overview-title">{text(SECTIONS[0].label, language)}</h2>
          <ul className="handout-metrics">
            {auditMetrics.map((metric) => (
              <li key={metric.id}>
                <strong dir="ltr">
                  {metric.prefix}
                  {decimals(metric.value, language, metric.decimals)}
                  {metric.suffix}
                </strong>
                <span>{text(metric.label, language)}</span>
                <small>{text(metric.note, language)}</small>
              </li>
            ))}
          </ul>
          <p className="handout-source">{text(copy.hero.modelNote, language)}</p>
        </section>

        {/* 02 — freight audit */}
        <section id={`handout-${SECTIONS[1].slug}`} aria-labelledby="handout-audit-title">
          <h2 id="handout-audit-title">{text(copy.audit.title, language)}</h2>
          <p>{text(copy.audit.description, language)}</p>
          <p className="handout-kpi">
            {integer(auditSummary.flagged, language)}/{integer(auditSummary.total, language)}{" "}
            {text(copy.audit.redFlag, language)} · {integer(auditSummary.unverifiedKm, language)} km{" "}
            {text(copy.audit.tableHeaders.duplicate, language)}
          </p>
          <div className="handout-table-wrap">
            <table>
              <caption>{text(copy.audit.scannerLabel, language)}</caption>
              <thead>
                <tr>
                  <th scope="col">{text(copy.audit.tableHeaders.freight, language)}</th>
                  <th scope="col">{text(copy.audit.tableHeaders.billed, language)}</th>
                  <th scope="col">{text(copy.audit.tableHeaders.actual, language)}</th>
                  <th scope="col">{text(copy.audit.tableHeaders.duplicate, language)}</th>
                  <th scope="col">{text(copy.audit.tableHeaders.overcharge, language)}</th>
                  <th scope="col">{text(copy.audit.tableHeaders.verdict, language)}</th>
                </tr>
              </thead>
              <tbody>
                {freightAuditRows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row">{text(row.freightType, language)}</th>
                    <td dir="ltr">{integer(row.billedMileage, language)}</td>
                    <td dir="ltr">{integer(row.actualMileage, language)}</td>
                    <td dir="ltr">{number(row.duplicateBillingPct, language, 1)}%</td>
                    <td dir="ltr">{number(row.overchargePct, language, 1)}%</td>
                    <td>{text(row.verdict === "red-flag" ? copy.audit.redFlag : copy.audit.passed, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="no-print">
            <DatasetExport dataset="freight-audit" language={language} />
          </div>
        </section>

        {/* 03 — demand distortion */}
        <section id={`handout-${SECTIONS[2].slug}`} aria-labelledby="handout-demand-title">
          <h2 id="handout-demand-title">{text(copy.demand.title, language)}</h2>
          <p>{text(copy.demand.description, language)}</p>
          <p className="handout-kpi">
            ×{number(demandSummary.peakAmplification, language, 2)} → ×
            {number(demandSummary.auditedAmplification, language, 2)} ·{" "}
            {percent(demandSummary.distortionRemoved, language, 0)} {text(copy.demand.smoothingLabel, language)}
          </p>
          <div className="handout-table-wrap">
            <table>
              <caption>{text(copy.demand.smoothingLabel, language)}</caption>
              <thead>
                <tr>
                  <th scope="col">{text(copy.demand.smoothingLabel, language)}</th>
                  <th scope="col">{text(copy.demand.chartActual, language)}</th>
                  <th scope="col">{text(copy.demand.chartDistorted, language)}</th>
                  <th scope="col">{text(copy.demand.chartAudited, language)}</th>
                </tr>
              </thead>
              <tbody>
                {demandTiers.map((tier) => (
                  <tr key={tier.id}>
                    <th scope="row">{text(tier.label, language)}</th>
                    <td dir="ltr">{number(tier.actual, language, 0)}</td>
                    <td dir="ltr">{number(tier.distorted, language, 0)}</td>
                    <td dir="ltr">{number(tier.audited, language, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="no-print">
            <DatasetExport dataset="demand-signal" language={language} />
          </div>
        </section>

        {/* 04 — route intelligence */}
        <section id={`handout-${SECTIONS[3].slug}`} aria-labelledby="handout-routes-title">
          <h2 id="handout-routes-title">{text(copy.routes.title, language)}</h2>
          <p>{text(copy.routes.description, language)}</p>
          <p className="handout-kpi">
            {currency(routeSummary.totalSavings, language)} {text(copy.routes.headers.savings, language)} ·{" "}
            {number(routeSummary.averageWastePct, language, 1)}% {text(copy.routes.headers.waste, language)}
          </p>
          <div className="handout-table-wrap">
            <table>
              <caption>{text(copy.routes.terrainLabel, language)}</caption>
              <thead>
                <tr>
                  <th scope="col">{text(copy.routes.headers.region, language)}</th>
                  <th scope="col">{text(copy.routes.headers.waste, language)}</th>
                  <th scope="col">{text(copy.routes.headers.fuel, language)}</th>
                  <th scope="col">{text(copy.routes.headers.gps, language)}</th>
                  <th scope="col">{text(copy.routes.headers.savings, language)}</th>
                </tr>
              </thead>
              <tbody>
                {routeRegions.map((region) => (
                  <tr key={region.id}>
                    <th scope="row">{text(region.region, language)}</th>
                    <td dir="ltr">{number(region.mileageWastePct, language, 1)}%</td>
                    <td dir="ltr">{number(region.fuelLossPct, language, 1)}%</td>
                    <td dir="ltr">{number(region.gpsDeviationPct, language, 1)}%</td>
                    <td dir="ltr">{currency(region.optimizedSavings, language)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="no-print">
            <DatasetExport dataset="route-intelligence" language={language} />
          </div>
        </section>

        {/* 05 — warehouse control */}
        <section id={`handout-${SECTIONS[4].slug}`} aria-labelledby="handout-warehouse-title">
          <h2 id="handout-warehouse-title">{text(copy.warehouse.title, language)}</h2>
          <p>{text(copy.warehouse.description, language)}</p>
          <p className="handout-kpi">
            {integer(warehouseSummary.audited, language)}/{integer(warehouseSummary.total, language)}{" "}
            {text(copy.warehouse.audited, language)} · {percent(warehouseSummary.accuracy, language, 1)}
          </p>
          <ol className="handout-specs">
            {warehouseSpecs.map((spec) => (
              <li key={spec.id}>
                <h3>{text(spec.title, language)}</h3>
                <p>
                  <strong>{text(copy.warehouse.headers.impact, language)}:</strong> {text(spec.impact, language)}
                </p>
                <p>
                  <strong>{text(copy.warehouse.headers.cause, language)}:</strong> {text(spec.cause, language)}
                </p>
                <p>
                  <strong>{text(copy.warehouse.headers.fix, language)}:</strong> {text(spec.fix, language)}
                </p>
              </li>
            ))}
          </ol>
          <div className="no-print">
            <DatasetExport dataset="warehouse-control" language={language} />
          </div>
        </section>

        {/* 06 — Interactive Executive Recovery Simulator (embedded in Handout) */}
        <section
          id="handout-recovery"
          className="handout-recovery-section no-print"
          aria-label={t("calculatorTitle", language)}
        >
          <div className="handout-recovery-head">
            <Calculator size={20} className="inline-icon" aria-hidden="true" />
            <strong className="handout-recovery-heading">{t("calculatorTitle", language)}</strong>
          </div>
          <div className="handout-recovery-grid">
            <div className="handout-recovery-controls">
              <div className="input-group">
                <div className="input-header">
                  <label htmlFor="h-input-freight">{t("annualFreightSpend", language)}</label>
                  <strong dir="ltr">{currency(calcParams.annualFreightSpend, language)}</strong>
                </div>
                <input
                  id="h-input-freight"
                  type="range"
                  min={2000000}
                  max={100000000}
                  step={1000000}
                  value={calcParams.annualFreightSpend}
                  onChange={(e) =>
                    setCalcParams((p) => ({ ...p, annualFreightSpend: Number(e.target.value) }))
                  }
                  className="range-slider"
                />
              </div>

              <div className="input-group">
                <div className="input-header">
                  <label htmlFor="h-input-units">{t("annualOrderUnits", language)}</label>
                  <strong dir="ltr">{integer(calcParams.annualOrderUnits, language)}</strong>
                </div>
                <input
                  id="h-input-units"
                  type="range"
                  min={50000}
                  max={2500000}
                  step={25000}
                  value={calcParams.annualOrderUnits}
                  onChange={(e) =>
                    setCalcParams((p) => ({ ...p, annualOrderUnits: Number(e.target.value) }))
                  }
                  className="range-slider"
                />
              </div>

              <div className="input-group">
                <div className="input-header">
                  <label htmlFor="h-input-skus">{t("skuCatalogSize", language)}</label>
                  <strong dir="ltr">{integer(calcParams.skuCatalogSize, language)}</strong>
                </div>
                <input
                  id="h-input-skus"
                  type="range"
                  min={1000}
                  max={50000}
                  step={1000}
                  value={calcParams.skuCatalogSize}
                  onChange={(e) =>
                    setCalcParams((p) => ({ ...p, skuCatalogSize: Number(e.target.value) }))
                  }
                  className="range-slider"
                />
              </div>
            </div>

            <div className="handout-recovery-results">
              <div className="handout-recovery-total">
                <span>{t("totalAnnualRecovery", language)}</span>
                <strong dir="ltr">
                  <DollarSign size={20} className="inline-icon" aria-hidden="true" />
                  {currency(recovery.totalAnnualRecovery, language)}
                </strong>
                <p>
                  <TrendingUp size={14} className="inline-icon" aria-hidden="true" /> +
                  {number(recovery.marginImprovementBps, language, 0)} {t("basisPoints", language)}{" "}
                  {t("marginExpansion", language)} ·{" "}
                  <Sparkles size={14} className="inline-icon" aria-hidden="true" />{" "}
                  {number(recovery.paybackMonths, language, 1)} {t("months", language)}{" "}
                  {t("paybackPeriod", language)}
                </p>
              </div>
              <ul className="handout-recovery-breakdown">
                <li>
                  <span>{t("freightRecovery", language)}</span>
                  <strong dir="ltr">{currency(recovery.freightSavings, language)}</strong>
                </li>
                <li>
                  <span>{t("bullwhipRecovery", language)}</span>
                  <strong dir="ltr">{currency(recovery.bullwhipSavings, language)}</strong>
                </li>
                <li>
                  <span>{t("routeRecovery", language)}</span>
                  <strong dir="ltr">{currency(recovery.routeSavings, language)}</strong>
                </li>
                <li>
                  <span>{t("warehouseRecovery", language)}</span>
                  <strong dir="ltr">{currency(recovery.warehouseSavings, language)}</strong>
                </li>
              </ul>
            </div>
          </div>
        </section>

        <footer className="handout-footer">
          <p>{text(copy.footer.statement, language)}</p>
          <p className="handout-source">{text(copy.footer.illustrative, language)}</p>
        </footer>
      </main>
    </div>
  );
}

export function HandoutView() {
  return (
    <PreferencesProvider>
      <Handout />
    </PreferencesProvider>
  );
}
