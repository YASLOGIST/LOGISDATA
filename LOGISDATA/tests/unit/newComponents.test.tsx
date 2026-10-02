import { useState } from "react";
import { act, cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScenarioSwitcher } from "@/components/ui/ScenarioSwitcher";
import { RecoveryCalculator } from "@/components/ui/RecoveryCalculator";
import { NodeInspectorModal } from "@/components/ui/NodeInspectorModal";
import { LiveTelemetryFeed } from "@/components/ui/LiveTelemetryFeed";
import { AudioToggle } from "@/components/ui/AudioToggle";
import { downloadExecutiveReportJson } from "@/lib/export";
import { sound } from "@/lib/sound";

afterEach(() => {
  cleanup();
  sound.setEnabled(false);
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe("ScenarioSwitcher", () => {
  it("renders all scenarios, changes selection, and ignores the active option", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    const { rerender } = render(
      <ScenarioSwitcher scenario="active-audit" onScenarioChange={onChange} language="en" />,
    );

    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    await user.click(screen.getByRole("radio", { name: /raw discrepancy/i }));
    expect(onChange).toHaveBeenCalledWith("baseline");

    rerender(<ScenarioSwitcher scenario="baseline" onScenarioChange={onChange} language="en" />);
    await user.click(screen.getByRole("radio", { name: /raw discrepancy/i }));
    expect(onChange).toHaveBeenCalledTimes(1);
  });

  it("supports roving focus and radio-group arrow navigation", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [scenario, setScenario] = useState<"baseline" | "active-audit" | "mitigated">("active-audit");
      return <ScenarioSwitcher scenario={scenario} onScenarioChange={setScenario} language="en" />;
    }

    render(<Harness />);
    const active = screen.getByRole("radio", { name: /active audit gate/i });
    const mitigated = screen.getByRole("radio", { name: /closed-loop optim/i });
    expect(active).toHaveAttribute("tabindex", "0");
    expect(mitigated).toHaveAttribute("tabindex", "-1");

    active.focus();
    await user.keyboard("{ArrowRight}");
    expect(mitigated).toHaveAttribute("aria-checked", "true");
    expect(mitigated).toHaveAttribute("tabindex", "0");
    expect(mitigated).toHaveFocus();

    await user.keyboard("{ArrowRight}");
    expect(screen.getByRole("radio", { name: /raw discrepancy/i })).toHaveFocus();
    await user.keyboard("{ArrowLeft}");
    expect(mitigated).toHaveFocus();
    await user.keyboard("{ArrowUp}");
    expect(active).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(mitigated).toHaveFocus();
    await user.keyboard("{Home}");
    expect(screen.getByRole("radio", { name: /raw discrepancy/i })).toHaveFocus();
    await user.keyboard("{End}");
    expect(mitigated).toHaveFocus();
    await user.keyboard("x");
    expect(mitigated).toHaveFocus();
  });

  it("renders Arabic labels", () => {
    render(<ScenarioSwitcher scenario="active-audit" onScenarioChange={() => {}} language="ar" />);
    expect(screen.getByText(/نمط التدقيق/i)).toBeInTheDocument();
  });
});

describe("RecoveryCalculator", () => {
  it("uses native modality, sets initial focus, and restores its invoker", async () => {
    const user = userEvent.setup();

    function Harness() {
      const [open, setOpen] = useState(false);
      return (
        <>
          <button type="button" onClick={() => setOpen(true)}>Open calculator</button>
          <RecoveryCalculator open={open} onClose={() => setOpen(false)} language="en" />
        </>
      );
    }

    render(<Harness />);
    const invoker = screen.getByRole("button", { name: "Open calculator" });
    await user.click(invoker);

    const dialog = screen.getByRole("dialog") as HTMLDialogElement;
    expect(dialog.tagName).toBe("DIALOG");
    expect(dialog.open).toBe(true);
    const closeButton = within(dialog).getByRole("button", { name: "Close" });
    expect(closeButton).toHaveFocus();

    await user.click(closeButton);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(invoker).toHaveFocus();
  });

  it("renders transparent assumptions and updates all three model inputs", () => {
    render(<RecoveryCalculator open onClose={() => {}} language="en" />);

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/Illustrative estimate, not a forecast/i)).toBeInTheDocument();
    const ranges = within(dialog).getAllByRole("slider");
    expect(ranges).toHaveLength(3);
    fireEvent.change(ranges[0], { target: { value: "30000000" } });
    fireEvent.change(ranges[1], { target: { value: "750000" } });
    fireEvent.change(ranges[2], { target: { value: "18000" } });
    expect(ranges[0]).toHaveValue("30000000");
    expect(ranges[1]).toHaveValue("750000");
    expect(ranges[2]).toHaveValue("18000");
  });

  it("does not render while closed", () => {
    render(<RecoveryCalculator open={false} onClose={() => {}} language="en" />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("localizes content and closes from its labelled control", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<RecoveryCalculator open onClose={onClose} language="ar" />);

    expect(screen.getByText(/تقدير توضيحي/)).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: /إغلاق/i }));
    expect(onClose).toHaveBeenCalledOnce();
  });
});

describe("NodeInspectorModal", () => {
  it.each([
    ["port", /Port Terminal Alpha/i, /Verified/i],
    ["yard", /Staging Yard Bravo/i, /Leak Risk/i],
    ["crossdock", /Cross-Dock Gateway/i, /Phantom/i],
  ])("renders the %s status without relying on color", (nodeId, label, status) => {
    render(<NodeInspectorModal nodeId={nodeId} onClose={() => {}} language="en" />);
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(label)).toBeInTheDocument();
    expect(within(dialog).getAllByText(status).length).toBeGreaterThan(0);
  });

  it("closes through the native dialog lifecycle and returns null for absent or unknown nodes", () => {
    const onClose = vi.fn();
    const { rerender } = render(<NodeInspectorModal nodeId="port" onClose={onClose} language="en" />);
    (screen.getByRole("dialog") as HTMLDialogElement).close();
    expect(onClose).toHaveBeenCalledOnce();

    rerender(<NodeInspectorModal nodeId={null} onClose={onClose} language="en" />);
    expect(screen.queryByRole("dialog")).toBeNull();
    rerender(<NodeInspectorModal nodeId="unknown" onClose={onClose} language="en" />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("LiveTelemetryFeed", () => {
  it("labels fixture replay honestly and supports filtering, pause, and close", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<LiveTelemetryFeed open onClose={onClose} language="en" />);

    expect(screen.getByText("Audit Telemetry Simulation")).toBeInTheDocument();
    expect(screen.getByText("SIMULATION RUNNING")).toBeInTheDocument();
    expect(screen.getByText(/not connected to operational systems/i)).toBeInTheDocument();
    expect(screen.getAllByText(/INV-DUP-CLAIM-884|WMS-BIN-MISMATCH-C05/).length).toBeGreaterThan(0);

    const warningFilter = screen.getByRole("button", { name: "Warning" });
    expect(warningFilter).toHaveAttribute("aria-pressed", "false");
    await user.click(warningFilter);
    expect(warningFilter).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("GPS-CORR-DEV-19")).toBeInTheDocument();
    expect(screen.queryByText("INV-DUP-CLAIM-884")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Pause" }));
    expect(screen.getByText("SIMULATION PAUSED")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Resume" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Resume" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("localizes severity controls in Arabic", () => {
    render(<LiveTelemetryFeed open onClose={() => {}} language="ar" />);
    expect(screen.getByRole("button", { name: "حرج" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "تحذير" })).toBeInTheDocument();
  });

  it("does not run the replay timer while hidden", () => {
    vi.useFakeTimers();
    const timer = vi.spyOn(globalThis, "setInterval");
    render(<LiveTelemetryFeed open={false} onClose={() => {}} language="en" />);
    expect(screen.queryByText("Audit Telemetry Simulation")).toBeNull();
    expect(timer).not.toHaveBeenCalled();
  });

  it.each([
    [0, "playAlert"],
    [0.7, "playSuccess"],
  ] as const)("routes generated fixture severity to %s audio", (random, method) => {
    vi.useFakeTimers();
    vi.spyOn(Math, "random").mockReturnValue(random);
    const audio = vi.spyOn(sound, method).mockImplementation(() => {});
    render(<LiveTelemetryFeed open onClose={() => {}} language="en" />);

    act(() => vi.advanceTimersByTime(4_500));
    expect(audio).toHaveBeenCalledOnce();
  });
});

describe("AudioToggle", () => {
  it("exposes and persists both muted and enabled states", async () => {
    const user = userEvent.setup();
    render(<AudioToggle language="en" />);
    const button = screen.getByRole("button", { name: /audio: muted/i });
    expect(button).toHaveAttribute("aria-pressed", "false");
    await user.click(button);
    expect(screen.getByRole("button", { name: /audio: on/i })).toHaveAttribute("aria-pressed", "true");
  });
});

describe("Executive Report JSON Export", () => {
  it("downloads a scenario-labelled JSON package without navigation", () => {
    const createObjectURL = vi.fn(() => "blob:mock-url");
    vi.stubGlobal("URL", { ...URL, createObjectURL, revokeObjectURL: vi.fn() });
    const click = vi.spyOn(HTMLAnchorElement.prototype, "click").mockImplementation(() => {});

    expect(downloadExecutiveReportJson("en", "mitigated")).toBe(true);
    expect(createObjectURL).toHaveBeenCalledOnce();
    expect(click).toHaveBeenCalledOnce();
  });
});
