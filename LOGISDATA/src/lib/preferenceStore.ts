import { probeDevice, STATIC_PROFILE, type DeviceProfile } from "./device";
import type { Language, ThemeMode } from "./types";

/**
 * External preference store consumed through `useSyncExternalStore`.
 *
 * Reading `localStorage` inside `useState`/`useEffect` either produces a
 * hydration mismatch (lazy initial state) or a cascading extra render
 * (setState in an effect, which `react-hooks/set-state-in-effect` rejects).
 * `useSyncExternalStore` is the supported primitive for "browser-only state
 * that must differ between the server snapshot and the client snapshot".
 */

export const LANGUAGE_KEY = "logisdata.language";
export const THEME_KEY = "logisdata.theme";

export interface PreferenceSnapshot {
  language: Language;
  theme: ThemeMode;
  device: DeviceProfile;
  hydrated: boolean;
}

const SERVER_SNAPSHOT: PreferenceSnapshot = Object.freeze({
  language: "en" as Language,
  theme: "dark" as ThemeMode,
  device: STATIC_PROFILE,
  hydrated: false,
});

const listeners = new Set<() => void>();
let snapshot: PreferenceSnapshot = SERVER_SNAPSHOT;
let initialized = false;

function safeRead(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    // Private-mode Safari and hardened browsers throw on storage access.
    return null;
  }
}

function safeWrite(key: string, value: string): void {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* preference persistence is best-effort, never fatal */
  }
}

function readSystemTheme(): ThemeMode {
  return window.matchMedia?.("(prefers-color-scheme: light)").matches ? "light" : "dark";
}

function initialize(): void {
  if (initialized || typeof window === "undefined") return;
  initialized = true;
  const storedLanguage = safeRead(LANGUAGE_KEY);
  const storedTheme = safeRead(THEME_KEY);
  snapshot = {
    language: storedLanguage === "ar" || storedLanguage === "en" ? storedLanguage : "en",
    theme: storedTheme === "light" || storedTheme === "dark" ? storedTheme : readSystemTheme(),
    device: probeDevice(),
    hydrated: true,
  };
}

function emit(): void {
  for (const listener of listeners) listener();
}

function update(partial: Partial<PreferenceSnapshot>): void {
  snapshot = { ...snapshot, ...partial };
  emit();
}

export function subscribe(listener: () => void): () => void {
  initialize();
  listeners.add(listener);

  // Cross-tab sync and live capability changes.
  const onStorage = (event: StorageEvent) => {
    if (event.key !== LANGUAGE_KEY && event.key !== THEME_KEY) return;
    initialized = false;
    initialize();
    emit();
  };
  const onEnvironmentChange = () => update({ device: probeDevice() });

  const motionQuery = window.matchMedia?.("(prefers-reduced-motion: reduce)");
  window.addEventListener("storage", onStorage);
  window.addEventListener("resize", onEnvironmentChange, { passive: true });
  motionQuery?.addEventListener?.("change", onEnvironmentChange);

  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("resize", onEnvironmentChange);
    motionQuery?.removeEventListener?.("change", onEnvironmentChange);
  };
}

export function getSnapshot(): PreferenceSnapshot {
  initialize();
  return snapshot;
}

export function getServerSnapshot(): PreferenceSnapshot {
  return SERVER_SNAPSHOT;
}

export function setLanguage(language: Language): void {
  if (snapshot.language === language) return;
  safeWrite(LANGUAGE_KEY, language);
  update({ language });
}

export function setTheme(theme: ThemeMode): void {
  if (snapshot.theme === theme) return;
  safeWrite(THEME_KEY, theme);
  update({ theme });
}

/** Test-only: restores the module to its pre-hydration state. */
export function resetPreferenceStore(): void {
  initialized = false;
  snapshot = SERVER_SNAPSHOT;
  listeners.clear();
}
