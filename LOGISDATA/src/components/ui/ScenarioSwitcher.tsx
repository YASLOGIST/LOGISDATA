"use client";

import { useId, type KeyboardEvent } from "react";
import { sound } from "@/lib/sound";
import { t } from "@/lib/i18n";
import type { AuditScenario, Language } from "@/lib/types";

interface ScenarioSwitcherProps {
  scenario: AuditScenario;
  onScenarioChange: (scenario: AuditScenario) => void;
  language: Language;
}

const SCENARIOS = [
  { value: "baseline", label: "scenarioBaseline", activeClass: "scenario-active-baseline" },
  { value: "active-audit", label: "scenarioActive", activeClass: "scenario-active-audit" },
  { value: "mitigated", label: "scenarioMitigated", activeClass: "scenario-active-mitigated" },
] as const;

export function ScenarioSwitcher({ scenario, onScenarioChange, language }: ScenarioSwitcherProps) {
  const groupId = useId();

  const handleSelect = (next: AuditScenario) => {
    if (next !== scenario) {
      sound.playScenarioSwitch();
      onScenarioChange(next);
    }
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, currentIndex: number) => {
    let nextIndex: number | null = null;
    if (event.key === "ArrowRight" || event.key === "ArrowDown") {
      nextIndex = (currentIndex + 1) % SCENARIOS.length;
    } else if (event.key === "ArrowLeft" || event.key === "ArrowUp") {
      nextIndex = (currentIndex - 1 + SCENARIOS.length) % SCENARIOS.length;
    } else if (event.key === "Home") {
      nextIndex = 0;
    } else if (event.key === "End") {
      nextIndex = SCENARIOS.length - 1;
    }

    if (nextIndex === null) return;
    event.preventDefault();
    const next = SCENARIOS[nextIndex];
    handleSelect(next.value);
    event.currentTarget.parentElement
      ?.querySelector<HTMLButtonElement>(`[data-scenario="${next.value}"]`)
      ?.focus();
  };

  return (
    <div className="scenario-switcher" role="radiogroup" aria-labelledby={`${groupId}-label`}>
      <span id={`${groupId}-label`} className="scenario-label">
        <span className="scenario-pulse-dot" aria-hidden="true" />
        {t("scenarioLabel", language)}:
      </span>
      <div className="scenario-buttons">
        {SCENARIOS.map((option, index) => {
          const selected = scenario === option.value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              tabIndex={selected ? 0 : -1}
              data-scenario={option.value}
              className={`scenario-btn ${selected ? option.activeClass : ""}`}
              onClick={() => handleSelect(option.value)}
              onKeyDown={(event) => handleKeyDown(event, index)}
            >
              {t(option.label, language)}
            </button>
          );
        })}
      </div>
    </div>
  );
}
