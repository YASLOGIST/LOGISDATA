import { describe, expect, it, vi } from "vitest";
import {
  DATASET_IDS,
  buildDataset,
  csvField,
  datasetFileName,
  datasetToCsv,
  downloadDataset,
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
  it("is deterministic and dated", () => {
    expect(datasetFileName("route-intelligence", "ar", new Date("2026-02-06T10:00:00Z")))
      .toBe("logisdata-route-intelligence-ar-2026-02-06.csv");
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
