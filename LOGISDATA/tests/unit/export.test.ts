import { describe, expect, it, vi } from "vitest";
import {
  DATASET_IDS,
  buildDataset,
  buildExecutiveReport,
  csvField,
  datasetFileName,
  datasetToCsv,
  downloadDataset,
  downloadExecutiveReportJson,
  toCsv,
} from "@/lib/export";
import { freightAuditRows } from "@/lib/data";

describe("csvField", () => {
  it("leaves safe values untouched", () => {
    expect(csvField("Ocean feeder")).toBe("Ocean feeder");
    expect(csvField(42)).toBe("42");
  });

  it("quotes and escapes per RFC 4180", () => {
    expect(csvField("a,b")).toBe('"a,b"');
    expect(csvField('say "hi"')).toBe('"say ""hi"""');
    expect(csvField("line\nbreak")).toBe('"line\nbreak"');
  });
});

describe("toCsv", () => {
  it("joins rows with CRLF", () => {
    expect(toCsv([["a", "b"], [1, 2]])).toBe("a,b\r\n1,2");
  });
});

describe("buildDataset", () => {
  it.each(DATASET_IDS)("builds a header plus one row per record for %s", (dataset) => {
    const rows = buildDataset(dataset, "en");
    expect(rows.length).toBeGreaterThan(1);
    const width = rows[0].length;
    expect(rows.every((row) => row.length === width)).toBe(true);
  });

  it("localizes labels", () => {
    const english = buildDataset("freight-audit", "en");
    const arabic = buildDataset("freight-audit", "ar");
    expect(english[1][1]).toBe(freightAuditRows[0].freightType.en);
    expect(arabic[1][1]).toBe(freightAuditRows[0].freightType.ar);
  });

  it("exports the selected scenario rather than the static active-audit rows", () => {
    const baselineFreight = buildDataset("freight-audit", "en", "baseline");
    const mitigatedFreight = buildDataset("freight-audit", "en", "mitigated");
    expect(baselineFreight[1][2]).toBeGreaterThan(freightAuditRows[0].billedMileage);
    expect(mitigatedFreight[1][2]).toBe(freightAuditRows[0].actualMileage);
    expect(mitigatedFreight[1][7]).toBe("passed");

    const baselineDemand = buildDataset("demand-signal", "en", "baseline");
    const mitigatedRoutes = buildDataset("route-intelligence", "en", "mitigated");
    expect(baselineDemand.at(-1)?.[3]).toBeGreaterThan(baselineDemand.at(-1)?.[2] as number);
    expect(mitigatedRoutes[1][5]).toBeGreaterThan(freightAuditRows[0].actualMileage);
  });

  it("throws on an unknown dataset", () => {
    // @ts-expect-error -- deliberately invalid input
    expect(() => buildDataset("nope", "en")).toThrow(/Unknown dataset/);
  });
});

describe("datasetToCsv", () => {
  it("emits one CRLF-separated line per record", () => {
    const csv = datasetToCsv("freight-audit", "en");
    expect(csv.split("\r\n")).toHaveLength(freightAuditRows.length + 1);
    expect(csv.startsWith("id,freight_type")).toBe(true);
  });
});

describe("datasetFileName", () => {
  it("is deterministic, dated, and labels non-default scenarios", () => {
    const date = new Date("2026-02-06T10:00:00Z");
    expect(datasetFileName("route-intelligence", "ar", date))
      .toBe("logisdata-route-intelligence-ar-2026-02-06.csv");
    expect(datasetFileName("route-intelligence", "en", date, "mitigated"))
      .toBe("logisdata-route-intelligence-mitigated-en-2026-02-06.csv");
  });
});

describe("executive report", () => {
  it("keeps summaries, rows, metadata, and disclosure on the selected scenario", () => {
    const report = buildExecutiveReport("ar", "mitigated", new Date("2026-02-06T10:00:00Z"));

    expect(report.metadata).toMatchObject({
      exportedAt: "2026-02-06T10:00:00.000Z",
      language: "ar",
      scenario: "mitigated",
      classification: "illustrative-simulation",
    });
    expect(report.metadata.disclosure).toMatch(/[\u0600-\u06FF]/);
    expect(report.theatres.freightAudit.every((row) => row.verdict === "passed")).toBe(true);
    expect(report.theatres.warehouseBins.every((bin) => bin.status === "audited")).toBe(true);
    expect(report.executiveSummary.auditSummary.flagged).toBe(0);
    expect(report.executiveSummary.warehouseSummary.accuracy).toBe(1);
  });

  it("returns false when an executive report cannot create an object URL", () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: undefined });
    expect(downloadExecutiveReportJson("en", "baseline")).toBe(false);
    vi.unstubAllGlobals();
  });
});

describe("downloadDataset", () => {
  it("creates, clicks and revokes an object URL", () => {
    const createObjectURL = vi.fn(() => "blob:mock");
    const revokeObjectURL = vi.fn();
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    expect(downloadDataset("warehouse-control", "en")).toBe(true);
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
    expect(document.querySelector("a[download]")).toBeNull();

    vi.unstubAllGlobals();
  });

  it("returns false when object URLs are unavailable", () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: undefined });
    expect(downloadDataset("warehouse-control", "en")).toBe(false);
    vi.unstubAllGlobals();
  });
});
