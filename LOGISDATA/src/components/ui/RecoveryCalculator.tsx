"use client";

import { useId, useMemo, useState } from "react";
import { Calculator, DollarSign, Sparkles, TrendingUp, X } from "lucide-react";
import { calculateRecovery, DEFAULT_RECOVERY_PARAMS } from "@/lib/simulation";
import { currency, integer, number, t } from "@/lib/i18n";
import { sound } from "@/lib/sound";
import type { Language, RecoveryParameters } from "@/lib/types";

interface RecoveryCalculatorProps {
  open: boolean;
  onClose: () => void;
  language: Language;
}

export function RecoveryCalculator({ open, onClose, language }: RecoveryCalculatorProps) {
  const [params, setParams] = useState<RecoveryParameters>(DEFAULT_RECOVERY_PARAMS);
  const titleId = useId();

  const results = useMemo(() => calculateRecovery(params), [params]);

  const handleSliderChange = (key: keyof RecoveryParameters, val: number) => {
    sound.playHover();
    setParams((prev) => ({ ...prev, [key]: val }));
  };

  if (!open) return null;

  return (
    <div className="calculator-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <div className="calculator-modal">
        <div className="calculator-head">
          <div className="calculator-title-group">
            <Calculator size={18} className="calculator-icon" aria-hidden="true" />
            <h2 id={titleId} className="calculator-title">{t("calculatorTitle", language)}</h2>
          </div>
          <button
            type="button"
            className="control-button"
            onClick={onClose}
            aria-label={t("closeDialog", language)}
          >
            <X size={15} aria-hidden="true" />
          </button>
        </div>

        <div className="calculator-body">
          <div className="calculator-inputs">
            <div className="input-group">
              <div className="input-header">
                <label htmlFor="input-freight">{t("annualFreightSpend", language)}</label>
                <strong dir="ltr">{currency(params.annualFreightSpend, language)}</strong>
              </div>
              <input
                id="input-freight"
                type="range"
                min={2000000}
                max={100000000}
                step={1000000}
                value={params.annualFreightSpend}
                onChange={(e) => handleSliderChange("annualFreightSpend", Number(e.target.value))}
                className="range-slider"
              />
            </div>

            <div className="input-group">
              <div className="input-header">
                <label htmlFor="input-units">{t("annualOrderUnits", language)}</label>
                <strong dir="ltr">{integer(params.annualOrderUnits, language)}</strong>
              </div>
              <input
                id="input-units"
                type="range"
                min={50000}
                max={2500000}
                step={25000}
                value={params.annualOrderUnits}
                onChange={(e) => handleSliderChange("annualOrderUnits", Number(e.target.value))}
                className="range-slider"
              />
            </div>

            <div className="input-group">
              <div className="input-header">
                <label htmlFor="input-skus">{t("skuCatalogSize", language)}</label>
                <strong dir="ltr">{integer(params.skuCatalogSize, language)}</strong>
              </div>
              <input
                id="input-skus"
                type="range"
                min={1000}
                max={50000}
                step={1000}
                value={params.skuCatalogSize}
                onChange={(e) => handleSliderChange("skuCatalogSize", Number(e.target.value))}
                className="range-slider"
              />
            </div>
          </div>

          <div className="calculator-results">
            <div className="total-recovery-card">
              <span className="total-label">{t("totalAnnualRecovery", language)}</span>
              <strong className="total-value" dir="ltr">
                <DollarSign size={24} className="inline-icon" aria-hidden="true" />
                {currency(results.totalAnnualRecovery, language)}
              </strong>
              <div className="total-meta">
                <span>
                  <TrendingUp size={14} className="inline-icon" aria-hidden="true" />{" "}
                  +{number(results.marginImprovementBps, language, 0)} {t("basisPoints", language)}{" "}
                  {t("marginExpansion", language)}
                </span>
                <span>
                  <Sparkles size={14} className="inline-icon" aria-hidden="true" />{" "}
                  {number(results.paybackMonths, language, 1)} {t("months", language)}{" "}
                  {t("paybackPeriod", language)}
                </span>
              </div>
            </div>

            <div className="breakdown-grid">
              <div className="breakdown-card">
                <span className="breakdown-name">{t("freightRecovery", language)}</span>
                <strong dir="ltr">{currency(results.freightSavings, language)}</strong>
              </div>
              <div className="breakdown-card">
                <span className="breakdown-name">{t("bullwhipRecovery", language)}</span>
                <strong dir="ltr">{currency(results.bullwhipSavings, language)}</strong>
              </div>
              <div className="breakdown-card">
                <span className="breakdown-name">{t("routeRecovery", language)}</span>
                <strong dir="ltr">{currency(results.routeSavings, language)}</strong>
              </div>
              <div className="breakdown-card">
                <span className="breakdown-name">{t("warehouseRecovery", language)}</span>
                <strong dir="ltr">{currency(results.warehouseSavings, language)}</strong>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
