"use client";

import { useId } from "react";
import { sound } from "@/lib/sound";
import { t } from "@/lib/i18n";
import type { AuditScenario, Language } from "@/lib/types";

interface ScenarioSwitcherProps {
  scenario: AuditScenario;
  onScenarioChange: (scenario: AuditScenario) => void;
  language: Language;
}

export function ScenarioSwitcher({ scenario, onScenarioChange, language }: ScenarioSwitcherProps) {
  const groupId = useId();

  const handleSelect = (next: AuditScenario) => {
    if (next !== scenario) {
      sound.playScenarioSwitch();
      onScenarioChange(next);
    }
  };

  return (
    <div className="scenario-switcher" role="radiogroup" aria-labelledby={`${groupId}-label`}>
      <span id={`${groupId}-label`} className="scenario-label">
        <span className="scenario-pulse-dot" aria-hidden="true" />
        {t("scenarioLabel", language)}:
      </span>
      <div className="scenario-buttons">
        <button
          type="button"
          role="radio"
          aria-checked={scenario === "baseline"}
          className={`scenario-btn ${scenario === "baseline" ? "scenario-active-baseline" : ""}`}
          onClick={() => handleSelect("baseline")}
        >
          {t("scenarioBaseline", language)}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={scenario === "active-audit"}
          className={`scenario-btn ${scenario === "active-audit" ? "scenario-active-audit" : ""}`}
          onClick={() => handleSelect("active-audit")}
        >
          {t("scenarioActive", language)}
        </button>
        <button
          type="button"
          role="radio"
          aria-checked={scenario === "mitigated"}
          className={`scenario-btn ${scenario === "mitigated" ? "scenario-active-mitigated" : ""}`}
          onClick={() => handleSelect("mitigated")}
        >
          {t("scenarioMitigated", language)}
        </button>
      </div>
    </div>
  );
}
