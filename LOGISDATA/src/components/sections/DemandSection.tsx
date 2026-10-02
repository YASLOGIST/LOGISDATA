"use client";

import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { Activity, ArrowDownRight, TrendingDown } from "lucide-react";
import { presentationCopy } from "@/lib/data";
import { getScenarioDemandTiers } from "@/lib/simulation";
import { number, text } from "@/lib/i18n";
import { DURATION, STAGGER, staggerDelay, transition } from "@/lib/motion";
import { SECTIONS } from "@/lib/sections";
import { GlassCard } from "@/components/ui/GlassCard";
import { DatasetExport } from "@/components/ui/DatasetExport";
import type { SectionProps } from "./types";

function DemandSectionImpl({ language, active, reduced, scenario = "active-audit" }: SectionProps) {
  const copy = presentationCopy.demand;
  const tiers = useMemo(() => getScenarioDemandTiers(scenario), [scenario]);
  const maxSignal = useMemo(
    () => Math.max(...tiers.map((t) => Math.max(t.actual, t.distorted, t.audited))),
    [tiers],
  );

  const peakAmplification =
    tiers.length > 0 ? tiers[tiers.length - 1].distorted / (tiers[0].actual || 1) : 1;
  const supplierAudited = tiers.length > 0 ? tiers[tiers.length - 1].audited : 0;

  const dim = (value: number) => (active ? 1 : value);
  const rtl = language === "ar";
  const barHeight = (value: number) => (active || reduced ? `${(value / maxSignal) * 100}%` : "8%");

  return (
    <section
      id={SECTIONS[2].domId}
      className="presentation-section section-demand"
      aria-labelledby="demand-title"
    >
      <div className="section-inner">
        <motion.div
          className="section-heading-row"
          initial={reduced ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: dim(0.76), y: active || reduced ? 0 : 8 }}
          transition={transition(DURATION.slow, { reduced })}
        >
          <div className="section-heading-copy">
            <div className="eyebrow-row">
              <span className="eyebrow-mark" aria-hidden="true" />
              <span className="eyebrow">{text(copy.eyebrow, language)}</span>
            </div>
            <h2 id="demand-title" className="section-title">{text(copy.title, language)}</h2>
            <p className="section-description">{text(copy.description, language)}</p>
          </div>
          <div className="section-index" aria-hidden="true">
            03 <span>/ 05</span>
          </div>
        </motion.div>

        <div className="demand-layout">
          <motion.figure
            className="demand-chart-card"
            initial={reduced ? false : { opacity: 0, y: 28 }}
            animate={{ opacity: dim(0.82), y: active || reduced ? 0 : 10 }}
            transition={transition(DURATION.slow, { reduced, delay: 0.1 })}
          >
            <div className="chart-topline">
              <div className="chart-title">
                <Activity size={16} aria-hidden="true" />
                <span>{text(copy.smoothingLabel, language)}</span>
              </div>
              <div className="chart-legend">
                <span>
                  <i className="legend-dot legend-actual" aria-hidden="true" />
                  {text(copy.chartActual, language)}
                </span>
                <span>
                  <i className="legend-dot legend-distorted" aria-hidden="true" />
                  {text(copy.chartDistorted, language)}
                </span>
                <span>
                  <i className="legend-dot legend-audited" aria-hidden="true" />
                  {text(copy.chartAudited, language)}
                </span>
                <DatasetExport dataset="demand-signal" language={language} />
              </div>
            </div>

            <div className="demand-chart">
              <div className="chart-y-axis" aria-hidden="true">
                <span dir="ltr">{number(maxSignal, language, 0)}</span>
                <span dir="ltr">{number(maxSignal / 2, language, 0)}</span>
                <span dir="ltr">0</span>
              </div>
              <div className="chart-plot">
                <div className="chart-gridline grid-top" aria-hidden="true" />
                <div className="chart-gridline grid-middle" aria-hidden="true" />
                <div className="chart-gridline grid-bottom" aria-hidden="true" />
                <div className="chart-groups">
                  {tiers.map((tier, index) => (
                    <div className="chart-group" key={tier.id}>
                      <div className="chart-bars">
                        <motion.span
                          className="chart-bar bar-actual"
                          initial={reduced ? false : { height: 0 }}
                          animate={{ height: barHeight(tier.actual) }}
                          transition={transition(DURATION.slow, {
                            reduced,
                            delay: staggerDelay(index, { step: STAGGER.base }),
                          })}
                        />
                        <motion.span
                          className="chart-bar bar-distorted"
                          initial={reduced ? false : { height: 0 }}
                          animate={{ height: barHeight(tier.distorted) }}
                          transition={transition(DURATION.slow, {
                            reduced,
                            delay: staggerDelay(index, { step: 0.08 }),
                          })}
                        />
                        <motion.span
                          className="chart-bar bar-audited"
                          initial={reduced ? false : { height: 0 }}
                          animate={{ height: barHeight(tier.audited) }}
                          transition={transition(DURATION.slow, {
                            reduced,
                            delay: staggerDelay(index, { step: STAGGER.loose }),
                          })}
                        />
                      </div>
                      <span className="chart-label">{text(tier.label, language)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <table className="visually-hidden">
              <caption>{text(copy.title, language)}</caption>
              <thead>
                <tr>
                  <th scope="col">{text(copy.smoothingLabel, language)}</th>
                  <th scope="col">{text(copy.chartActual, language)}</th>
                  <th scope="col">{text(copy.chartDistorted, language)}</th>
                  <th scope="col">{text(copy.chartAudited, language)}</th>
                </tr>
              </thead>
              <tbody>
                {tiers.map((tier) => (
                  <tr key={tier.id}>
                    <th scope="row">{text(tier.label, language)}</th>
                    <td>{number(tier.actual, language, 0)}</td>
                    <td>{number(tier.distorted, language, 0)}</td>
                    <td>{number(tier.audited, language, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </motion.figure>

          <div className="demand-callouts">
            <motion.div
              initial={reduced ? false : { opacity: 0, x: rtl ? 18 : -18 }}
              animate={{ opacity: dim(0.82), x: active || reduced ? 0 : 5 }}
              transition={transition(DURATION.slow, { reduced, delay: 0.16 })}
            >
              <GlassCard className="demand-callout" tone="amber">
                <div className="callout-icon amber-icon" aria-hidden="true">
                  <ArrowDownRight size={17} />
                </div>
                <div className="callout-content">
                  <span className="callout-kicker">{text(copy.dragTitle, language)}</span>
                  <strong>{text(copy.dragValue, language)}</strong>
                  <span className="callout-detail">
                    {text(copy.chartDistorted, language)} → ×{number(peakAmplification, language, 2)}{" "}
                    {text(copy.amplificationLabel, language)}
                  </span>
                </div>
              </GlassCard>
            </motion.div>

            <motion.div
              initial={reduced ? false : { opacity: 0, x: rtl ? 18 : -18 }}
              animate={{ opacity: dim(0.82), x: active || reduced ? 0 : 5 }}
              transition={transition(DURATION.slow, { reduced, delay: 0.24 })}
            >
              <GlassCard className="demand-callout" tone="emerald">
                <div className="callout-icon green-icon" aria-hidden="true">
                  <TrendingDown size={17} />
                </div>
                <div className="callout-content">
                  <span className="callout-kicker">{text(copy.stockTitle, language)}</span>
                  <strong>{text(copy.stockValue, language)}</strong>
                  <span className="callout-detail">
                    {text(copy.chartAudited, language)} → {number(supplierAudited, language, 0)}{" "}
                    {text(copy.supplierUnitsLabel, language)}
                  </span>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

export const DemandSection = memo(DemandSectionImpl);
