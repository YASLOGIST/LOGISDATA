import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { ScenarioSwitcher } from "@/components/ui/ScenarioSwitcher";
import { RecoveryCalculator } from "@/components/ui/RecoveryCalculator";
import { NodeInspectorModal } from "@/components/ui/NodeInspectorModal";
import { LiveTelemetryFeed } from "@/components/ui/LiveTelemetryFeed";
import { AudioToggle } from "@/components/ui/AudioToggle";
import { downloadExecutiveReportJson } from "@/lib/export";

afterEach(() => {
  cleanup();
});

describe("ScenarioSwitcher", () => {
  it("renders all three scenario options and handles selection", async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<ScenarioSwitcher scenario="active-audit" onScenarioChange={onChange} language="en" />);

    expect(screen.getByRole("radiogroup")).toBeInTheDocument();
    const baselineBtn = screen.getByRole("radio", { name: /raw discrepancy/i });
    expect(baselineBtn).toBeInTheDocument();

    await user.click(baselineBtn);
    expect(onChange).toHaveBeenCalledWith("baseline");
  });

  it("renders Arabic labels when language is ar", () => {
    render(<ScenarioSwitcher scenario="active-audit" onScenarioChange={() => {}} language="ar" />);
    expect(screen.getByText(/نمط التدقيق/i)).toBeInTheDocument();
  });
});

describe("RecoveryCalculator", () => {
  it("renders calculator modal when open is true", () => {
    render(<RecoveryCalculator open={true} onClose={() => {}} language="en" />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Executive Margin Recovery Calculator/i)).toBeInTheDocument();
  });

  it("does not render when open is false", () => {
    render(<RecoveryCalculator open={false} onClose={() => {}} language="en" />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("calls onClose when close button is clicked", async () => {
    const user = userEvent.setup();
    const onClose = vi.fn();
    render(<RecoveryCalculator open={true} onClose={onClose} language="en" />);

    const closeBtn = screen.getByRole("button", { name: /close/i });
    await user.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });
});

describe("NodeInspectorModal", () => {
  it("renders node details for a valid nodeId", () => {
    render(<NodeInspectorModal nodeId="port" onClose={() => {}} language="en" />);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Port Terminal Alpha/i)).toBeInTheDocument();
    expect(screen.getByText(/Maritime Container Ingress/i)).toBeInTheDocument();
  });

  it("returns null when nodeId is null", () => {
    render(<NodeInspectorModal nodeId={null} onClose={() => {}} language="en" />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("LiveTelemetryFeed", () => {
  it("renders live telemetry events when open", () => {
    render(<LiveTelemetryFeed open={true} onClose={() => {}} language="en" />);
    expect(screen.getByText(/Live Audit Telemetry Stream/i)).toBeInTheDocument();
    expect(screen.getByText(/STREAM ACTIVE/i)).toBeInTheDocument();
  });

  it("returns null when open is false", () => {
    render(<LiveTelemetryFeed open={false} onClose={() => {}} language="en" />);
    expect(screen.queryByText(/Live Audit Telemetry Stream/i)).toBeNull();
  });
});

describe("AudioToggle", () => {
  it("renders audio toggle button and handles click", async () => {
    const user = userEvent.setup();
    render(<AudioToggle language="en" />);
    const btn = screen.getByRole("button", { name: /audio/i });
    expect(btn).toBeInTheDocument();
    await user.click(btn);
  });
});

describe("Executive Report JSON Export", () => {
  it("exports JSON package without error in browser-like environment", () => {
    // In jsdom document and URL.createObjectURL mock may need verification
    const originalCreateObjectURL = globalThis.URL.createObjectURL;
    globalThis.URL.createObjectURL = vi.fn(() => "blob:mock-url");

    const result = downloadExecutiveReportJson("en");
    expect(result).toBe(true);

    globalThis.URL.createObjectURL = originalCreateObjectURL;
  });
});
