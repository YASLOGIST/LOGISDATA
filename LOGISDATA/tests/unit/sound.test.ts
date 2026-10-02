import { describe, expect, it } from "vitest";
import { sound } from "@/lib/sound";

describe("sound synthesizer engine", () => {
  it("initializes safely without crashing in test environment", () => {
    expect(sound).toBeDefined();
    expect(typeof sound.isEnabled).toBe("function");
  });

  it("toggles enabled state and persists", () => {
    const initial = sound.isEnabled();
    const toggled = sound.toggle();
    expect(toggled).toBe(!initial);
    expect(sound.isEnabled()).toBe(!initial);

    // Toggle back
    const restored = sound.toggle();
    expect(restored).toBe(initial);
  });

  it("allows setting enabled state directly", () => {
    sound.setEnabled(true);
    expect(sound.isEnabled()).toBe(true);
    sound.setEnabled(false);
    expect(sound.isEnabled()).toBe(false);
  });

  it("executes audio trigger methods without throwing exceptions", () => {
    sound.setEnabled(false); // Muted
    expect(() => sound.playClick()).not.toThrow();
    expect(() => sound.playHover()).not.toThrow();
    expect(() => sound.playScenarioSwitch()).not.toThrow();
    expect(() => sound.playAuditScan()).not.toThrow();
    expect(() => sound.playAlert()).not.toThrow();
    expect(() => sound.playSuccess()).not.toThrow();
  });
});
