import { describe, expect, it, vi } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AuditSection } from "@/components/sections/AuditSection";
import { DemandSection } from "@/components/sections/DemandSection";
import { HeroSection } from "@/components/sections/HeroSection";
import { RoutesSection } from "@/components/sections/RoutesSection";
import { WarehouseSection } from "@/components/sections/WarehouseSection";
import { GlassCard } from "@/components/ui/GlassCard";
import { demandTiers, freightAuditRows, routeRegions, warehouseSpecs } from "@/lib/data";
import { currency } from "@/lib/i18n";
import { auditSummary, routeSummary, warehouseSummary } from "@/lib/metrics";
import { SECTIONS } from "@/lib/sections";

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string }) => <img alt={alt} {...props} />,
}));

const SECTION_CASES = [
  { name: "hero", Component: HeroSection, headingId: "hero-title", level: 1 },
  { name: "audit", Component: AuditSection, headingId: "audit-title", level: 2 },
  { name: "demand", Component: DemandSection, headingId: "demand-title", level: 2 },
  { name: "routes", Component: RoutesSection, headingId: "routes-title", level: 2 },
  { name: "warehouse", Component: WarehouseSection, headingId: "warehouse-title", level: 2 },
] as const;

describe.each(SECTION_CASES)("$name section", ({ Component, headingId, level }) => {
  it("renders a labelled landmark with a heading", () => {
    const { container } = render(<Component language="en" active reduced={false} />);
    const section = container.querySelector("section");
    expect(section).not.toBeNull();
    expect(section?.getAttribute("aria-labelledby")).toBe(headingId);
    expect(screen.getByRole("heading", { level })).toHaveAttribute("id", headingId);
  });

  it("uses the shared section id registry", () => {
    const { container } = render(<Component language="en" active reduced={false} />);
    expect(SECTIONS.some((s) => s.domId === container.querySelector("section")?.id)).toBe(true);
  });

  it("renders in Arabic without losing content", () => {
    const { container } = render(<Component language="ar" active reduced={false} />);
    expect(container.textContent?.length ?? 0).toBeGreaterThan(80);
    expect(container.textContent).toMatch(/[\u0600-\u06FF]/);
  });

  it("renders without animation when reduced motion is requested", () => {
    expect(() => render(<Component language="en" active={false} reduced />)).not.toThrow();
  });
});

describe("HeroSection", () => {
  it("opens the inspector for the selected network node", async () => {
    const user = userEvent.setup();
    const onSelectNode = vi.fn();
    render(
      <HeroSection
        language="en"
        active
        reduced
        scenario="mitigated"
        onSelectNode={onSelectNode}
      />,
    );
    await user.click(screen.getByRole("button", { name: /Inspect Port/i }));
    expect(onSelectNode).toHaveBeenCalledWith("port");
  });
});

describe("AuditSection", () => {
  it("renders every freight row with a row header and a verdict", () => {
    render(<AuditSection language="en" active reduced={false} />);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("row")).toHaveLength(freightAuditRows.length + 1);
    expect(within(table).getAllByRole("rowheader")).toHaveLength(freightAuditRows.length);
  });

  it("shows the flagged-vs-total summary derived from the data", () => {
    render(<AuditSection language="en" active reduced={false} />);
    expect(screen.getByText(`${auditSummary.flagged} / ${auditSummary.total}`)).toBeInTheDocument();
  });

  it("offers a CSV export of the freight dataset", () => {
    render(<AuditSection language="en" active reduced={false} />);
    expect(screen.getByRole("button", { name: /export csv/i })).toHaveAttribute("data-dataset", "freight-audit");
  });

  it("filters by text and verdict and exposes a localized empty state", async () => {
    const user = userEvent.setup();
    render(<AuditSection language="en" active reduced scenario="baseline" />);

    const search = screen.getByRole("textbox", { name: /search/i });
    await user.type(search, "not-a-freight-type");
    expect(screen.getByText("No records match the current filters.")).toBeInTheDocument();
    expect(within(screen.getByRole("table")).getAllByRole("row")).toHaveLength(2);

    await user.clear(search);
    await user.click(screen.getByRole("button", { name: /passed/i }));
    expect(screen.getByText("No records match the current filters.")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /^all$/i }));
    expect(screen.queryByText("No records match the current filters.")).toBeNull();
  });
});

describe("DemandSection", () => {
  it("mirrors the decorative bar chart as an accessible table", () => {
    render(<DemandSection language="en" active reduced={false} />);
    const table = screen.getByRole("table");
    expect(within(table).getAllByRole("rowheader")).toHaveLength(demandTiers.length);
  });
});

describe("RoutesSection", () => {
  it("renders one row per region and the aggregate savings", () => {
    render(<RoutesSection language="en" active reduced={false} />);
    expect(within(screen.getByRole("table")).getAllByRole("rowheader")).toHaveLength(routeRegions.length);
    expect(screen.getByText(currency(routeSummary.totalSavings, "en"))).toBeInTheDocument();
  });

  it("sorts every numeric column and announces direction", async () => {
    const user = userEvent.setup();
    render(<RoutesSection language="en" active reduced />);

    for (const name of [/mileage waste/i, /fuel loss/i, /gps deviation/i, /optimized savings/i]) {
      const header = screen.getByRole("columnheader", { name });
      await user.click(within(header).getByRole("button"));
      expect(screen.getByRole("columnheader", { name })).toHaveAttribute("aria-sort", "descending");
    }

    const savingsHeader = screen.getByRole("columnheader", { name: /optimized savings/i });
    await user.click(within(savingsHeader).getByRole("button"));
    expect(screen.getByRole("columnheader", { name: /optimized savings/i }))
      .toHaveAttribute("aria-sort", "ascending");
  });
});

describe("WarehouseSection", () => {
  it("lists every control finding with impact, cause and fix", () => {
    render(<WarehouseSection language="en" active reduced={false} />);
    expect(screen.getAllByRole("article")).toHaveLength(warehouseSpecs.length);
    expect(screen.getByText(`${warehouseSummary.audited} / ${warehouseSummary.total}`)).toBeInTheDocument();
  });
});

describe("GlassCard", () => {
  it("applies the tone modifier and renders as the requested element", () => {
    const { container, rerender } = render(<GlassCard tone="red">x</GlassCard>);
    expect(container.firstElementChild).toHaveClass("glass-card", "glass-card-red");
    rerender(<GlassCard as="article" tone="cyan" className="extra">x</GlassCard>);
    expect(container.firstElementChild?.tagName).toBe("ARTICLE");
    expect(container.firstElementChild).toHaveClass("extra");
  });
});

describe("export controls across sections", () => {
  it("every exportable section exposes a distinct dataset", async () => {
    render(
      <>
        <AuditSection language="en" active reduced />
        <DemandSection language="en" active reduced />
        <RoutesSection language="en" active reduced />
        <WarehouseSection language="en" active reduced />
      </>,
    );
    const datasets = screen.getAllByRole("button", { name: /export csv/i }).map((b) => b.dataset.dataset);
    expect(new Set(datasets)).toEqual(
      new Set(["freight-audit", "demand-signal", "route-intelligence", "warehouse-control"]),
    );
  });

  it("an export click produces a downloadable blob", async () => {
    const createObjectURL = vi.fn(() => "blob:mock");
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});
    render(<RoutesSection language="ar" active reduced />);
    await userEvent.click(screen.getByRole("button", { name: /تصدير/i }));
    expect(createObjectURL).toHaveBeenCalledOnce();
    vi.unstubAllGlobals();
  });
});
