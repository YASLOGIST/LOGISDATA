"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { isRtl } from "@/lib/i18n";
import {
  getServerSnapshot,
  getSnapshot,
  setLanguage as persistLanguage,
  setTheme as persistTheme,
  subscribe,
} from "@/lib/preferenceStore";
import type { DeviceProfile } from "@/lib/device";
import type { Language, ThemeMode } from "@/lib/types";

/**
 * Shared language / theme / capability state.
 *
 * Previously `Presentation` owned both preferences, which meant the intro
 * screen (the first thing every visitor sees) was permanently English and
 * permanently dark, and nothing outside the deferred 3D bundle could read
 * the user's choices.
 */
export interface PreferencesValue {
  language: Language;
  theme: ThemeMode;
  rtl: boolean;
  device: DeviceProfile;
  /** False until the client store has read persisted preferences. */
  hydrated: boolean;
  setLanguage: (language: Language) => void;
  setTheme: (theme: ThemeMode) => void;
  toggleLanguage: () => void;
  toggleTheme: () => void;
}

const PreferencesContext = createContext<PreferencesValue | null>(null);

export function PreferencesProvider({ children }: { children: ReactNode }) {
  const { language, theme, device, hydrated } = useSyncExternalStore(
    subscribe,
    getSnapshot,
    getServerSnapshot,
  );

  // Mirror preferences onto <html> so CSS, the browser UI and assistive
  // tech all agree with React state.
  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.lang = language;
    root.dir = isRtl(language) ? "rtl" : "ltr";
  }, [hydrated, language]);

  useEffect(() => {
    if (!hydrated) return;
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.style.colorScheme = theme;
  }, [hydrated, theme]);

  const toggleLanguage = useCallback(() => persistLanguage(language === "en" ? "ar" : "en"), [language]);
  const toggleTheme = useCallback(() => persistTheme(theme === "dark" ? "light" : "dark"), [theme]);

  const value = useMemo<PreferencesValue>(
    () => ({
      language,
      theme,
      rtl: isRtl(language),
      device,
      hydrated,
      setLanguage: persistLanguage,
      setTheme: persistTheme,
      toggleLanguage,
      toggleTheme,
    }),
    [language, theme, device, hydrated, toggleLanguage, toggleTheme],
  );

  return <PreferencesContext.Provider value={value}>{children}</PreferencesContext.Provider>;
}

export function usePreferences(): PreferencesValue {
  const value = useContext(PreferencesContext);
  if (!value) throw new Error("usePreferences must be used inside <PreferencesProvider>");
  return value;
}
