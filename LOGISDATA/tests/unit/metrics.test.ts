import { describe, expect, it } from "vitest";
import { auditSummary, demandSummary, routeSummary, selectors, warehouseSummary } from "@/lib/metrics";
import { freightAuditRows, routeRegions, warehouseBins } from "@/lib/data";

describe("auditSummary", () => {
  it("counts verdicts consistently with the raw rows", () => {
    expect(auditSummary.total).toBe(freightAuditRows.length);
    expect(auditSummary.flagged + auditSummary.passed).toBe(auditSummary.total);
    expect(auditSummary.flagged).toBe(freightAuditRows.filter((r) => r.verdict === "red-flag").length);
    expect(auditSummary.flaggedRate).toBeCloseTo(auditSummary.flagged / auditSummary.total, 10);
  });

  it("derives unverified kilometres from billed minus actual", () => {
    const expected = freightAuditRows.reduce((sum, r) => sum + r.billedMileage - r.actualMileage, 0);
    expect(auditSummary.unverifiedKm).toBe(expected);
    expect(auditSummary.unverifiedKm).toBeGreaterThan(0);
  });

  it("identifies the worst overcharging lane", () => {
    const worst = Math.max(...freightAuditRows.map((r) => r.overchargePct));
    expect(auditSummary.worstRow.overchargePct).toBe(worst);
  });

  it("rejects an empty dataset instead of producing NaN", () => {
    expect(() => selectors.summariseAudit([])).toThrow(/must not be empty/);
  });
});

describe("demandSummary", () => {
  it("quantifies amplification against the consumer baseline", () => {
    expect(demandSummary.peakAmplification).toBeGreaterThan(1);
    expect(demandSummary.auditedAmplification).toBeLessThan(demandSummary.peakAmplification);
    expect(demandSummary.distortionRemoved).toBeGreaterThan(0);
    expect(demandSummary.distortionRemoved).toBeLessThanOrEqual(1);
  });

  it("returns 0 distortion removed when there is no amplification", () => {
    const flat = selectors.summariseDemand([
      { id: "a", label: { en: "a", ar: "أ" }, actual: 10, distorted: 10, audited: 10 },
    ]);
    expect(flat.peakAmplification).toBe(1);
    expect(flat.distortionRemoved).toBe(0);
  });
});

describe("routeSummary", () => {
  it("totals savings across every region", () => {
    expect(routeSummary.totalSavings).toBe(routeRegions.reduce((s, r) => s + r.optimizedSavings, 0));
  });

  it("picks the best and worst regions by mileage waste", () => {
    expect(routeSummary.worstRegion.mileageWastePct).toBe(Math.max(...routeRegions.map((r) => r.mileageWastePct)));
    expect(routeSummary.bestRegion.mileageWastePct).toBe(Math.min(...routeRegions.map((r) => r.mileageWastePct)));
  });
});

describe("warehouseSummary", () => {
  it("splits bins into audited and mismatched with a consistent accuracy", () => {
    expect(warehouseSummary.total).toBe(warehouseBins.length);
    expect(warehouseSummary.audited + warehouseSummary.mismatches).toBe(warehouseSummary.total);
    expect(warehouseSummary.accuracy).toBeCloseTo(warehouseSummary.audited / warehouseSummary.total, 3);
    expect(warehouseSummary.accuracy).toBeGreaterThan(0.5);
  });

  it("accepts scenario-specific and empty bin sets", () => {
    const audited = selectors.summariseWarehouse(
      warehouseBins.map((bin) => ({ ...bin, status: "audited" as const })),
    );
    expect(audited).toMatchObject({ mismatches: 0, audited: warehouseBins.length, accuracy: 1 });
    expect(selectors.summariseWarehouse([])).toEqual({ total: 0, mismatches: 0, audited: 0, accuracy: 1 });
  });
});
