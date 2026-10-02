import {
  auditMetrics,
  demandTiers,
  freightAuditRows,
  presentationCopy,
  routeRegions,
  warehouseSpecs,
} from "./data";
import { auditSummary, demandSummary, routeSummary, warehouseSummary } from "./metrics";
import type { Language } from "./types";

/**
 * Dataset export. An executive audit deck whose numbers cannot leave the
 * screen forces the audience to re-key figures by hand; every table in the
 * presentation is now exportable as RFC 4180 CSV, JSON, or Executive Markdown.
 */

export type DatasetId = "freight-audit" | "demand-signal" | "route-intelligence" | "warehouse-control";

export const DATASET_IDS: readonly DatasetId[] = [
  "freight-audit",
  "demand-signal",
  "route-intelligence",
  "warehouse-control",
];

/** Escapes a single CSV field per RFC 4180 (quote wrapping + quote doubling). */
export function csvField(value: string | number): string {
  const raw = typeof value === "number" ? String(value) : value;
  return /[",\r\n]/.test(raw) ? `"${raw.replace(/"/g, '""')}"` : raw;
}

export function toCsv(rows: ReadonlyArray<ReadonlyArray<string | number>>): string {
  return rows.map((row) => row.map(csvField).join(",")).join("\r\n");
}

export function buildDataset(dataset: DatasetId, language: Language): Array<Array<string | number>> {
  switch (dataset) {
    case "freight-audit":
      return [
        ["id", "freight_type", "billed_km", "actual_km", "variance_km", "duplicate_billing_pct", "overcharge_pct", "verdict"],
        ...freightAuditRows.map((row) => [
          row.id,
          row.freightType[language],
          row.billedMileage,
          row.actualMileage,
          row.billedMileage - row.actualMileage,
          row.duplicateBillingPct,
          row.overchargePct,
          row.verdict,
        ]),
      ];
    case "demand-signal":
      return [
        ["id", "tier", "consumer_demand", "unaudited_signal", "audited_signal", "amplification_x"],
        ...demandTiers.map((tier) => [
          tier.id,
          tier.label[language],
          tier.actual,
          tier.distorted,
          tier.audited,
          Math.round((tier.distorted / (demandTiers[0].actual || 1)) * 100) / 100,
        ]),
      ];
    case "route-intelligence":
      return [
        ["id", "region", "mileage_waste_pct", "fuel_loss_pct", "gps_deviation_pct", "optimized_savings_usd"],
        ...routeRegions.map((region) => [
          region.id,
          region.region[language],
          region.mileageWastePct,
          region.fuelLossPct,
          region.gpsDeviationPct,
          region.optimizedSavings,
        ]),
      ];
    case "warehouse-control":
      return [
        ["id", "control", "impact", "root_cause", "corrective_action"],
        ...warehouseSpecs.map((spec) => [
          spec.id,
          spec.title[language],
          spec.impact[language],
          spec.cause[language],
          spec.fix[language],
        ]),
      ];
    default: {
      const exhaustive: never = dataset;
      throw new Error(`Unknown dataset: ${String(exhaustive)}`);
    }
  }
}

export function datasetToCsv(dataset: DatasetId, language: Language): string {
  return toCsv(buildDataset(dataset, language));
}

export function datasetFileName(dataset: DatasetId, language: Language, now: Date = new Date()): string {
  return `logisdata-${dataset}-${language}-${now.toISOString().slice(0, 10)}.csv`;
}

/**
 * Triggers a client-side download. Returns false when the environment
 * cannot download (SSR, locked-down browser) so callers can fall back.
 */
export function downloadDataset(dataset: DatasetId, language: Language): boolean {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") return false;
  // The BOM keeps Excel from mangling Arabic labels.
  const blob = new Blob(["\uFEFF", datasetToCsv(dataset, language)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = datasetFileName(dataset, language);
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

/**
 * Exports complete executive audit package as JSON
 */
export function downloadExecutiveReportJson(language: Language): boolean {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") return false;
  const data = {
    metadata: {
      project: "LOGISDATA Control Room",
      organization: "AAST Executive Data Lab",
      presenter: presentationCopy.hero.presenter,
      registration: presentationCopy.hero.registration,
      exportedAt: new Date().toISOString(),
      language,
    },
    executiveSummary: {
      metrics: auditMetrics.map((m) => ({
        id: m.id,
        label: m.label[language],
        formattedValue: `${m.prefix}${m.value}${m.suffix}`,
        note: m.note[language],
      })),
      auditSummary,
      demandSummary,
      routeSummary,
      warehouseSummary,
    },
    theatres: {
      freightAudit: freightAuditRows.map((r) => ({
        ...r,
        freightType: r.freightType[language],
      })),
      demandTiers: demandTiers.map((t) => ({
        ...t,
        label: t.label[language],
      })),
      routeRegions: routeRegions.map((r) => ({
        ...r,
        region: r.region[language],
      })),
      warehouseSpecs: warehouseSpecs.map((s) => ({
        ...s,
        title: s.title[language],
        impact: s.impact[language],
        cause: s.cause[language],
        fix: s.fix[language],
      })),
    },
  };

  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `logisdata-executive-audit-${language}-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}
