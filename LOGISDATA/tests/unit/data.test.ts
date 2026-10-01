import { describe, expect, it } from "vitest";
import {
  auditMetrics,
  demandTiers,
  freightAuditRows,
  presentationCopy,
  routeRegions,
  supplyEdges,
  supplyNodes,
  warehouseBins,
  warehouseSpecs,
} from "@/lib/data";
import type { LocalizedText } from "@/lib/types";

/**
 * Data-integrity characterization tests. These lock the domain invariants
 * the UI silently assumes (unique ids, both translations present, verdicts
 * consistent with the underlying numbers) so a future data edit cannot
 * break a chart or a table without failing CI first.
 */

function isLocalized(value: unknown): value is LocalizedText {
  return (
    typeof value === "object" &&
    value !== null &&
    typeof (value as LocalizedText).en === "string" &&
    typeof (value as LocalizedText).ar === "string" &&
    (value as LocalizedText).en.length > 0 &&
    (value as LocalizedText).ar.length > 0
  );
}

function collectLocalized(node: unknown, found: LocalizedText[] = []): LocalizedText[] {
  if (Array.isArray(node)) {
    node.forEach((child) => collectLocalized(child, found));
    return found;
  }
  if (typeof node === "object" && node !== null) {
    if (isLocalized(node)) {
      found.push(node as LocalizedText);
      return found;
    }
    Object.values(node).forEach((child) => collectLocalized(child, found));
  }
  return found;
}

const uniqueIds = (rows: ReadonlyArray<{ id: string }>) => new Set(rows.map((row) => row.id)).size;

describe("identifier uniqueness", () => {
  it.each([
    ["auditMetrics", auditMetrics],
    ["freightAuditRows", freightAuditRows],
    ["demandTiers", demandTiers],
    ["routeRegions", routeRegions],
    ["warehouseSpecs", warehouseSpecs],
    ["supplyNodes", supplyNodes],
    ["warehouseBins", warehouseBins],
  ])("%s has unique, non-empty ids", (_name, rows) => {
    expect(uniqueIds(rows)).toBe(rows.length);
    expect(rows.every((row) => row.id.trim().length > 0)).toBe(true);
  });
});

describe("localization completeness", () => {
  it("every localized string in the copy deck has both languages", () => {
    const strings = collectLocalized(presentationCopy);
    expect(strings.length).toBeGreaterThan(60);
    expect(strings.every(isLocalized)).toBe(true);
  });

  it("the nav exposes exactly one label per section", () => {
    expect(presentationCopy.nav.sections).toHaveLength(5);
  });
});

describe("freight audit invariants", () => {
  it("never bills fewer kilometres than were actually driven", () => {
    for (const row of freightAuditRows) {
      expect(row.billedMileage).toBeGreaterThanOrEqual(row.actualMileage);
    }
  });

  it("flags exactly the rows with material overcharge or duplicate billing", () => {
    for (const row of freightAuditRows) {
      const material = row.overchargePct > 1.5 || row.duplicateBillingPct > 1;
      expect(row.verdict === "red-flag").toBe(material);
    }
  });

  it("keeps percentages within a sane range", () => {
    for (const row of freightAuditRows) {
      expect(row.duplicateBillingPct).toBeGreaterThanOrEqual(0);
      expect(row.overchargePct).toBeGreaterThanOrEqual(0);
      expect(row.overchargePct).toBeLessThan(100);
    }
  });
});

describe("demand tiers", () => {
  it("models monotonically increasing bullwhip distortion upstream", () => {
    for (let index = 1; index < demandTiers.length; index += 1) {
      expect(demandTiers[index].distorted).toBeGreaterThanOrEqual(demandTiers[index - 1].distorted);
      expect(demandTiers[index].audited).toBeGreaterThanOrEqual(demandTiers[index - 1].audited);
    }
  });

  it("always places the audited signal between the real and distorted signals", () => {
    for (const tier of demandTiers) {
      expect(tier.audited).toBeGreaterThanOrEqual(tier.actual);
      expect(tier.audited).toBeLessThanOrEqual(tier.distorted);
    }
  });
});

describe("supply network graph", () => {
  it("only references nodes that exist", () => {
    const ids = new Set(supplyNodes.map((node) => node.id));
    for (const [from, to] of supplyEdges) {
      expect(ids.has(from), `edge source ${from}`).toBe(true);
      expect(ids.has(to), `edge target ${to}`).toBe(true);
      expect(from).not.toBe(to);
    }
  });

  it("has no duplicate edges", () => {
    const keys = supplyEdges.map(([from, to]) => [from, to].sort().join("->"));
    expect(new Set(keys).size).toBe(keys.length);
  });
});

describe("warehouse bins", () => {
  it("uses only known statuses and distinct grid coordinates", () => {
    const coordinates = new Set(warehouseBins.map((bin) => `${bin.x}|${bin.y}|${bin.z}`));
    expect(coordinates.size).toBe(warehouseBins.length);
    expect(warehouseBins.every((bin) => bin.status === "audited" || bin.status === "mismatch")).toBe(true);
  });
});

describe("route regions", () => {
  it("keeps fuel loss below mileage waste and savings positive", () => {
    for (const region of routeRegions) {
      expect(region.fuelLossPct).toBeLessThan(region.mileageWastePct);
      expect(region.optimizedSavings).toBeGreaterThan(0);
    }
  });
});
