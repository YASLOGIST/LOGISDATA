import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IntroScreen } from "@/components/IntroScreen";
import { HandoutView } from "@/components/HandoutView";
import { MetricCounter } from "@/components/MetricCounter";
import { KeyboardHelp } from "@/components/ui/KeyboardHelp";
import { DatasetExport } from "@/components/ui/DatasetExport";
import { PreferencesProvider } from "@/components/providers/PreferencesProvider";
import { resetPreferenceStore } from "@/lib/preferenceStore";
import { auditMetrics } from "@/lib/data";

vi.mock("next/image", () => ({
  default: ({ alt, ...props }: { alt: string }) => <img alt={alt} {...props} />,
}));
vi.mock("next/link", () => ({
  default: ({ href, children, ...props }: { href: string; children: React.ReactNode }) => (
    <a href={href} {...props}>{children}</a>
  ),
}));

beforeEach(() => {
  resetPreferenceStore();
  window.localStorage.clear();
  vi.stubGlobal("matchMedia", () => ({
    matches: false,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
  }));
});

afterEach(() => {
  vi.unstubAllGlobals();
  resetPreferenceStore();
  document.documentElement.removeAttribute("dir");
  document.documentElement.removeAttribute("data-theme");
});

const withPreferences = (node: React.ReactNode) => <PreferencesProvider>{node}</PreferencesProvider>;

describe("IntroScreen", () => {
  it("renders the cover with a single h1 and an entry action", () => {
    render(withPreferences(<IntroScreen onEnter={vi.fn()} />));
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getByRole("button", { name: /Enter Control Room/i })).toBeInTheDocument();
  });

  it("calls onEnter when the control room is entered", async () => {
    const onEnter = vi.fn();
    render(withPreferences(<IntroScreen onEnter={onEnter} />));
    await userEvent.click(screen.getByRole("button", { name: /Enter Control Room/i }));
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it("switches the cover to Arabic and flips the document direction", async () => {
    render(withPreferences(<IntroScreen onEnter={vi.fn()} />));
    await userEvent.click(screen.getByRole("button", { name: "Language" }));
    expect(await screen.findByRole("button", { name: /ادخل غرفة التحكم/ })).toBeInTheDocument();
    await waitFor(() => expect(document.documentElement.dir).toBe("rtl"));
    expect(document.documentElement.lang).toBe("ar");
  });

  it("switches the cover theme and records it on <html>", async () => {
    render(withPreferences(<IntroScreen onEnter={vi.fn()} />));
    await userEvent.click(screen.getByRole("button", { name: "Theme" }));
    await waitFor(() => expect(document.documentElement.dataset.theme).toBe("light"));
  });

  it("always offers the no-WebGL text briefing", () => {
    render(withPreferences(<IntroScreen onEnter={vi.fn()} />));
    expect(screen.getByRole("link", { name: /text briefing/i })).toHaveAttribute("href", "/handout");
  });
});

describe("MetricCounter", () => {
  it("exposes the final value to assistive technology immediately", () => {
    render(<MetricCounter metric={auditMetrics[0]} language="en" reduced />);
    expect(screen.getByText(/\$2\.1T/)).toBeInTheDocument();
  });

  it("renders the final figure without animation under reduced motion", () => {
    const { container } = render(<MetricCounter metric={auditMetrics[1]} language="en" reduced />);
    expect(container.querySelector(".metric-counter-value")?.textContent).toBe("3.8%");
  });

  it("animates up to the final value when motion is allowed", async () => {
    const { container } = render(<MetricCounter metric={auditMetrics[2]} language="en" />);
    await waitFor(
      () => expect(container.querySelector(".metric-counter-value")?.textContent).toBe("6.4x"),
      { timeout: 4000 },
    );
  });
});

describe("KeyboardHelp", () => {
  it("is closed until opened and lists every shortcut", async () => {
    const onClose = vi.fn();
    const { rerender } = render(<KeyboardHelp open={false} language="en" onClose={onClose} />);
    const dialog = document.querySelector("dialog") as HTMLDialogElement;
    expect(dialog.open).toBe(false);

    rerender(<KeyboardHelp open language="en" onClose={onClose} />);
    expect(dialog.open).toBe(true);
    expect(within(dialog).getAllByRole("listitem")).toHaveLength(8);

    await userEvent.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalled();
  });

  it("is localized", () => {
    render(<KeyboardHelp open language="ar" onClose={vi.fn()} />);
    expect(screen.getByText("اختصارات لوحة المفاتيح")).toBeInTheDocument();
  });
});

describe("DatasetExport", () => {
  it("downloads a CSV and announces completion", async () => {
    const createObjectURL = vi.fn(() => "blob:mock");
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    render(<DatasetExport dataset="freight-audit" language="en" />);
    await userEvent.click(screen.getByRole("button", { name: /export csv/i }));

    expect(click).toHaveBeenCalledOnce();
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(await screen.findByText("Dataset downloaded")).toBeInTheDocument();
  });
});

describe("Handout (no-WebGL briefing)", () => {
  it("renders all five findings as semantic, crawlable content", () => {
    render(<HandoutView />);
    expect(screen.getAllByRole("heading", { level: 1 })).toHaveLength(1);
    expect(screen.getAllByRole("heading", { level: 2 })).toHaveLength(5);
    // Freight audit, demand signal and route intelligence are tables; the
    // warehouse findings are an ordered list of prose cards.
    expect(screen.getAllByRole("table")).toHaveLength(3);
    expect(document.querySelectorAll(".handout-specs > li")).toHaveLength(4);
  });

  it("gives every table a caption and row headers", () => {
    render(<HandoutView />);
    for (const table of screen.getAllByRole("table")) {
      expect(table.querySelector("caption")).not.toBeNull();
      expect(table.querySelectorAll("tbody th[scope='row']").length).toBeGreaterThan(0);
    }
  });

  it("offers a route back to the 3D control room", () => {
    render(<HandoutView />);
    expect(screen.getByRole("link", { name: /3D control room/i })).toHaveAttribute("href", "/");
  });

  it("translates the whole briefing into Arabic", async () => {
    render(<HandoutView />);
    await userEvent.click(screen.getByRole("button", { name: "Language" }));
    expect(await screen.findByText("رقابة المستودع")).toBeInTheDocument();
    await waitFor(() => expect(document.documentElement.dir).toBe("rtl"));
  });

  it("exposes a table of contents linking to every section", () => {
    render(<HandoutView />);
    const toc = screen.getByRole("navigation", { name: /presentation sections/i });
    expect(within(toc).getAllByRole("link")).toHaveLength(5);
  });
});

describe("PresentationShell", () => {
  it("shows the cover first, then the no-WebGL notice when WebGL is missing", async () => {
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(null);
    const { PresentationShell } = await import("@/components/PresentationShell");
    render(<PresentationShell />);

    expect(screen.getByRole("button", { name: /Enter Control Room/i })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: /Enter Control Room/i }));

    expect(await screen.findByText(/3D rendering is unavailable/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /text briefing/i })).toHaveAttribute("href", "/handout");
  });
});
