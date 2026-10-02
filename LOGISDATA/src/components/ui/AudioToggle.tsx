"use client";

import { useState } from "react";
import { Volume2, VolumeX } from "lucide-react";
import { sound } from "@/lib/sound";
import { t } from "@/lib/i18n";
import type { Language } from "@/lib/types";

interface AudioToggleProps {
  language: Language;
}

export function AudioToggle({ language }: AudioToggleProps) {
  const [enabled, setEnabled] = useState(() => sound.isEnabled());

  const handleToggle = () => {
    const next = sound.toggle();
    setEnabled(next);
  };

  return (
    <button
      type="button"
      className={`control-button audio-toggle-btn ${enabled ? "audio-on" : ""}`}
      onClick={handleToggle}
      aria-label={enabled ? t("soundOn", language) : t("soundOff", language)}
      aria-pressed={enabled}
    >
      {enabled ? <Volume2 size={15} aria-hidden="true" /> : <VolumeX size={15} aria-hidden="true" />}
      <span>{t(enabled ? "soundShortOn" : "soundShortOff", language)}</span>
    </button>
  );
}
