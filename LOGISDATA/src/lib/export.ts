import { presentationCopy, warehouseSpecs } from "./data";
import { selectors } from "./metrics";
import {
  getScenarioDemandTiers,
  getScenarioFreightRows,
  getScenarioMetrics,
  getScenarioRouteRegions,
  getScenarioWarehouseBins,
} from "./simulation";
import type { AuditScenario, Language } from "./types";

/**
 * Dataset export. An executive audit deck whose numbers cannot leave the
 * screen forces the audience to re-key figures by hand; every table in the
 * presentation is now exportable as RFC 4180 CSV or executive JSON.
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

export function buildDataset(
  dataset: DatasetId,
  language: Language,
  scenario: AuditScenario = "active-audit",
): Array<Array<string | number>> {
  switch (dataset) {
    case "freight-audit":
      return [
        ["id", "freight_type", "billed_km", "actual_km", "variance_km", "duplicate_billing_pct", "overcharge_pct", "verdict"],
        ...getScenarioFreightRows(scenario).map((row) => [
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
    case "demand-signal": {
      const tiers = getScenarioDemandTiers(scenario);
      return [
        ["id", "tier", "consumer_demand", "unaudited_signal", "audited_signal", "amplification_x"],
        ...tiers.map((tier) => [
          tier.id,
          tier.label[language],
          tier.actual,
          tier.distorted,
          tier.audited,
          Math.round((tier.distorted / (tiers[0]?.actual || 1)) * 100) / 100,
        ]),
      ];
    }
    case "route-intelligence":
      return [
        ["id", "region", "mileage_waste_pct", "fuel_loss_pct", "gps_deviation_pct", "optimized_savings_usd"],
        ...getScenarioRouteRegions(scenario).map((region) => [
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

export function datasetToCsv(
  dataset: DatasetId,
  language: Language,
  scenario: AuditScenario = "active-audit",
): string {
  return toCsv(buildDataset(dataset, language, scenario));
}

export function datasetFileName(
  dataset: DatasetId,
  language: Language,
  now: Date = new Date(),
  scenario: AuditScenario = "active-audit",
): string {
  const scenarioSuffix = scenario === "active-audit" ? "" : `-${scenario}`;
  return `logisdata-${dataset}${scenarioSuffix}-${language}-${now.toISOString().slice(0, 10)}.csv`;
}

/**
 * Triggers a client-side download. Returns false when the environment
 * cannot download (SSR, locked-down browser) so callers can fall back.
 */
export function downloadDataset(
  dataset: DatasetId,
  language: Language,
  scenario: AuditScenario = "active-audit",
): boolean {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") return false;
  // The BOM keeps Excel from mangling Arabic labels.
  const blob = new Blob(["\uFEFF", datasetToCsv(dataset, language, scenario)], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = datasetFileName(dataset, language, new Date(), scenario);
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}

/** Builds the complete, scenario-consistent executive audit package. */
export function buildExecutiveReport(
  language: Language,
  scenario: AuditScenario = "active-audit",
  exportedAt: Date = new Date(),
) {
  const metrics = getScenarioMetrics(scenario);
  const freightRows = getScenarioFreightRows(scenario);
  const tiers = getScenarioDemandTiers(scenario);
  const regions = getScenarioRouteRegions(scenario);
  const bins = getScenarioWarehouseBins(scenario);

  return {
    metadata: {
      project: "LOGISDATA Control Room",
      organization: "AAST Executive Data Lab",
      presenter: presentationCopy.hero.presenter,
      registration: presentationCopy.hero.registration,
      exportedAt: exportedAt.toISOString(),
      language,
      scenario,
      classification: "illustrative-simulation" as const,
      disclosure: presentationCopy.footer.illustrative[language],
    },
    executiveSummary: {
      metrics: metrics.map((metric) => ({
        id: metric.id,
        label: metric.label[language],
        formattedValue: `${metric.prefix}${metric.value}${metric.suffix}`,
        note: metric.note[language],
      })),
      auditSummary: selectors.summariseAudit(freightRows),
      demandSummary: selectors.summariseDemand(tiers),
      routeSummary: selectors.summariseRoutes(regions),
      warehouseSummary: selectors.summariseWarehouse(bins),
    },
    theatres: {
      freightAudit: freightRows.map((row) => ({
        ...row,
        freightType: row.freightType[language],
      })),
      demandTiers: tiers.map((tier) => ({
        ...tier,
        label: tier.label[language],
      })),
      routeRegions: regions.map((region) => ({
        ...region,
        region: region.region[language],
      })),
      warehouseBins: bins.map((bin) => ({
        ...bin,
        sku: bin.sku[language],
      })),
      warehouseSpecs: warehouseSpecs.map((spec) => ({
        ...spec,
        title: spec.title[language],
        impact: spec.impact[language],
        cause: spec.cause[language],
        fix: spec.fix[language],
      })),
    },
  };
}

/** Exports the complete executive audit package as JSON. */
export function downloadExecutiveReportJson(
  language: Language,
  scenario: AuditScenario = "active-audit",
): boolean {
  if (typeof document === "undefined" || typeof URL.createObjectURL !== "function") return false;
  const data = buildExecutiveReport(language, scenario);
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  const scenarioSuffix = scenario === "active-audit" ? "" : `-${scenario}`;
  anchor.href = url;
  anchor.download = `logisdata-executive-audit${scenarioSuffix}-${language}-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.rel = "noopener";
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 0);
  return true;
}
