import { describe, expect, it } from "vitest";
import {
  calculateRecovery,
  DEFAULT_RECOVERY_PARAMS,
  getScenarioDemandTiers,
  getScenarioFreightRows,
  getScenarioMetrics,
  getScenarioRouteRegions,
  getScenarioWarehouseBins,
  SAMPLE_TELEMETRY_EVENTS,
  supplyNodeDetails,
} from "@/lib/simulation";

describe("simulation domain model", () => {
  it("calculates positive financial recovery for default parameters", () => {
    const recovery = calculateRecovery(DEFAULT_RECOVERY_PARAMS);
    expect(recovery.totalAnnualRecovery).toBeGreaterThan(1000000);
    expect(recovery.freightSavings).toBeGreaterThan(0);
    expect(recovery.bullwhipSavings).toBeGreaterThan(0);
    expect(recovery.routeSavings).toBeGreaterThan(0);
    expect(recovery.warehouseSavings).toBeGreaterThan(0);
    expect(recovery.marginImprovementBps).toBeGreaterThan(0);
    expect(recovery.paybackMonths).toBeGreaterThan(0);
  });

  it("scales recovery linearly with freight spend", () => {
    const r1 = calculateRecovery({ ...DEFAULT_RECOVERY_PARAMS, annualFreightSpend: 10000000 });
    const r2 = calculateRecovery({ ...DEFAULT_RECOVERY_PARAMS, annualFreightSpend: 20000000 });
    expect(r2.freightSavings).toBe(r1.freightSavings * 2);
    expect(r2.routeSavings).toBe(r1.routeSavings * 2);
  });

  it("returns distinct scenario metrics across baseline, active-audit, and mitigated", () => {
    const baselineMetrics = getScenarioMetrics("baseline");
    const activeMetrics = getScenarioMetrics("active-audit");
    const mitigatedMetrics = getScenarioMetrics("mitigated");

    expect(baselineMetrics.length).toBe(3);
    expect(activeMetrics.length).toBe(3);
    expect(mitigatedMetrics.length).toBe(3);

    expect(baselineMetrics[0].value).toBeGreaterThan(activeMetrics[0].value);
    expect(mitigatedMetrics[0].value).toBeLessThan(activeMetrics[0].value);
  });

  it("adjusts freight rows according to scenario", () => {
    const baselineRows = getScenarioFreightRows("baseline");
    const mitigatedRows = getScenarioFreightRows("mitigated");

    expect(baselineRows.every((r) => r.verdict === "red-flag")).toBe(true);
    expect(mitigatedRows.every((r) => r.verdict === "passed")).toBe(true);
  });

  it("smooths demand tiers in mitigated scenario", () => {
    const tiers = getScenarioDemandTiers("mitigated");
    expect(tiers[tiers.length - 1].distorted).toBeLessThan(145);
  });

  it("reduces route waste and increases savings in mitigated scenario", () => {
    const regions = getScenarioRouteRegions("mitigated");
    expect(regions[0].mileageWastePct).toBeLessThan(5);
    expect(regions[0].optimizedSavings).toBeGreaterThan(428000);
  });

  it("resolves all warehouse bins to audited status in mitigated scenario", () => {
    const bins = getScenarioWarehouseBins("mitigated");
    expect(bins.every((b) => b.status === "audited")).toBe(true);
  });

  it("contains rich supply node details for all 8 nodes", () => {
    const nodeIds = ["port", "yard", "factory", "crossdock", "hub", "store", "returns", "data"];
    nodeIds.forEach((id) => {
      const node = supplyNodeDetails[id];
      expect(node).toBeDefined();
      expect(node.label.en).toBeTruthy();
      expect(node.label.ar).toBeTruthy();
      expect(node.anomalies.length).toBeGreaterThan(0);
    });
  });

  it("provides synthetic telemetry events with valid codes and severities", () => {
    expect(SAMPLE_TELEMETRY_EVENTS.length).toBeGreaterThanOrEqual(5);
    SAMPLE_TELEMETRY_EVENTS.forEach((evt) => {
      expect(["critical", "warning", "reconciled", "optimized"]).toContain(evt.severity);
      expect(evt.message.en).toBeTruthy();
      expect(evt.message.ar).toBeTruthy();
    });
  });
});
