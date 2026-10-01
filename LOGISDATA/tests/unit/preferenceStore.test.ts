import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  LANGUAGE_KEY,
  THEME_KEY,
  getServerSnapshot,
  getSnapshot,
  resetPreferenceStore,
  setLanguage,
  setTheme,
  subscribe,
} from "@/lib/preferenceStore";

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
});

describe("preference store", () => {
  it("serves a stable, non-hydrated snapshot for the server render", () => {
    const snapshot = getServerSnapshot();
    expect(snapshot.hydrated).toBe(false);
    expect(snapshot.language).toBe("en");
    expect(snapshot.theme).toBe("dark");
    expect(getServerSnapshot()).toBe(snapshot);
  });

  it("hydrates from localStorage on first client read", () => {
    window.localStorage.setItem(LANGUAGE_KEY, "ar");
    window.localStorage.setItem(THEME_KEY, "light");
    const snapshot = getSnapshot();
    expect(snapshot).toMatchObject({ language: "ar", theme: "light", hydrated: true });
  });

  it("ignores corrupted persisted values", () => {
    window.localStorage.setItem(LANGUAGE_KEY, "klingon");
    window.localStorage.setItem(THEME_KEY, "neon");
    expect(getSnapshot()).toMatchObject({ language: "en", theme: "dark" });
  });

  it("falls back to the OS colour scheme when nothing is stored", () => {
    vi.stubGlobal("matchMedia", () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
    expect(getSnapshot().theme).toBe("light");
  });

  it("returns an identical snapshot reference until something changes", () => {
    const first = getSnapshot();
    expect(getSnapshot()).toBe(first);
    setLanguage("ar");
    expect(getSnapshot()).not.toBe(first);
  });

  it("notifies subscribers and persists on change", () => {
    const listener = vi.fn();
    const unsubscribe = subscribe(listener);
    setTheme("light");
    expect(listener).toHaveBeenCalledOnce();
    expect(window.localStorage.getItem(THEME_KEY)).toBe("light");
    setTheme("light");
    expect(listener).toHaveBeenCalledOnce(); // no-op writes do not notify
    unsubscribe();
    setTheme("dark");
    expect(listener).toHaveBeenCalledOnce();
  });

  it("survives a localStorage that throws (private browsing)", () => {
    const getItem = vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("denied");
    });
    const setItem = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("denied");
    });
    expect(() => getSnapshot()).not.toThrow();
    expect(() => setLanguage("ar")).not.toThrow();
    expect(getSnapshot().language).toBe("ar");
    getItem.mockRestore();
    setItem.mockRestore();
  });
});
