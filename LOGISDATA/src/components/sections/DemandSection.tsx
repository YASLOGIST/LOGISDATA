"use client";

import { motion } from "framer-motion";
import { Activity, ArrowDownRight, TrendingDown } from "lucide-react";
import { demandTiers, presentationCopy } from "@/lib/data";
import { number, text } from "@/lib/i18n";
import type { Language } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";

interface DemandSectionProps {
  language: Language;
  active: boolean;
}

const ease = [0.22, 1, 0.36, 1] as const;

export function DemandSection({ language, active }: DemandSectionProps) {
  const copy = presentationCopy.demand;
  const maxSignal = Math.max(...demandTiers.map((tier) => tier.distorted));

  return (
    <section id="section-3" className="presentation-section section-demand snap-start" aria-labelledby="demand-title">
      <div className="section-inner">
        <motion.div
          className="section-heading-row"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: active ? 1 : 0.76, y: active ? 0 : 8 }}
          transition={{ duration: 0.7, ease }}
        >
          <div className="section-heading-copy">
            <div className="eyebrow-row"><span className="eyebrow-mark" /><span className="eyebrow">{text(copy.eyebrow, language)}</span></div>
            <h2 id="demand-title" className="section-title">{text(copy.title, language)}</h2>
            <p className="section-description">{text(copy.description, language)}</p>
          </div>
          <div className="section-index">03 <span>/ 05</span></div>
        </motion.div>

        <div className="demand-layout">
          <motion.div
            className="demand-chart-card"
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: active ? 1 : 0.82, y: active ? 0 : 10 }}
            transition={{ duration: 0.8, delay: 0.1, ease }}
          >
            <div className="chart-topline">
              <div className="chart-title"><Activity size={16} /> <span>{text(copy.smoothingLabel, language)}</span></div>
              <div className="chart-legend">
                <span><i className="legend-dot legend-actual" />{text(copy.chartActual, language)}</span>
                <span><i className="legend-dot legend-distorted" />{text(copy.chartDistorted, language)}</span>
                <span><i className="legend-dot legend-audited" />{text(copy.chartAudited, language)}</span>
              </div>
            </div>
            <div className="demand-chart" aria-label={text(copy.title, language)}>
              <div className="chart-y-axis"><span dir="ltr">{number(maxSignal, language, 0)}</span><span dir="ltr">{number(maxSignal / 2, language, 0)}</span><span dir="ltr">0</span></div>
              <div className="chart-plot">
                <div className="chart-gridline grid-top" />
                <div className="chart-gridline grid-middle" />
                <div className="chart-gridline grid-bottom" />
                <div className="chart-groups">
                  {demandTiers.map((tier, index) => (
                    <div className="chart-group" key={tier.id}>
                      <div className="chart-bars">
                        <motion.span className="chart-bar bar-actual" initial={{ height: 0 }} animate={{ height: active ? `${(tier.actual / maxSignal) * 100}%` : "8%" }} transition={{ duration: 0.75, delay: index * 0.06, ease }} title={text(copy.chartActual, language)} />
                        <motion.span className="chart-bar bar-distorted" initial={{ height: 0 }} animate={{ height: active ? `${(tier.distorted / maxSignal) * 100}%` : "8%" }} transition={{ duration: 0.85, delay: index * 0.08, ease }} title={text(copy.chartDistorted, language)} />
                        <motion.span className="chart-bar bar-audited" initial={{ height: 0 }} animate={{ height: active ? `${(tier.audited / maxSignal) * 100}%` : "8%" }} transition={{ duration: 0.85, delay: index * 0.1, ease }} title={text(copy.chartAudited, language)} />
                      </div>
                      <span className="chart-label">{text(tier.label, language)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </motion.div>

          <div className="demand-callouts">
            <motion.div initial={{ opacity: 0, x: language === "ar" ? 18 : -18 }} animate={{ opacity: active ? 1 : 0.82, x: active ? 0 : 5 }} transition={{ duration: 0.7, delay: 0.16, ease }}>
              <GlassCard className="demand-callout" tone="amber">
                <div className="callout-icon amber-icon"><ArrowDownRight size={17} /></div>
                <div className="callout-content">
                  <span className="callout-kicker">{text(copy.dragTitle, language)}</span>
                  <strong>{text(copy.dragValue, language)}</strong>
                  <span className="callout-detail">{text(copy.chartDistorted, language)} × {number(demandTiers[demandTiers.length - 1].distorted / demandTiers[0].actual, language, 1)} signal amplitude</span>
                </div>
              </GlassCard>
            </motion.div>
            <motion.div initial={{ opacity: 0, x: language === "ar" ? 18 : -18 }} animate={{ opacity: active ? 1 : 0.82, x: active ? 0 : 5 }} transition={{ duration: 0.7, delay: 0.24, ease }}>
              <GlassCard className="demand-callout" tone="emerald">
                <div className="callout-icon green-icon"><TrendingDown size={17} /></div>
                <div className="callout-content">
                  <span className="callout-kicker">{text(copy.stockTitle, language)}</span>
                  <strong>{text(copy.stockValue, language)}</strong>
                  <span className="callout-detail">{text(copy.chartAudited, language)} → {number(demandTiers[demandTiers.length - 1].audited, language, 0)} units at supplier tier</span>
                </div>
              </GlassCard>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
