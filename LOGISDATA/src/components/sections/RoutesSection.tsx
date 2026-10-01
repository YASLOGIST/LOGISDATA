"use client";

import { memo } from "react";

import { motion } from "framer-motion";
import { Fuel, Map, Route, TrendingUp } from "lucide-react";
import { presentationCopy, routeRegions } from "@/lib/data";
import { currency, number, text } from "@/lib/i18n";
import { routeSummary } from "@/lib/metrics";
import { DURATION, staggerDelay, transition } from "@/lib/motion";
import { SECTIONS } from "@/lib/sections";
import { GlassCard } from "@/components/ui/GlassCard";
import { DatasetExport } from "@/components/ui/DatasetExport";
import type { SectionProps } from "./types";

function RoutesSectionImpl({ language, active, reduced }: SectionProps) {
  const copy = presentationCopy.routes;
  const dim = (value: number) => (active ? 1 : value);
  const rtl = language === "ar";

  return (
    <section
      id={SECTIONS[3].domId}
      className="presentation-section section-routes"
      aria-labelledby="routes-title"
    >
      <div className="section-inner">
        <motion.div
          className="section-heading-row"
          initial={reduced ? false : { opacity: 0, y: 22 }}
          animate={{ opacity: dim(0.76), y: active || reduced ? 0 : 8 }}
          transition={transition(DURATION.slow, { reduced })}
        >
          <div className="section-heading-copy">
            <div className="eyebrow-row"><span className="eyebrow-mark" aria-hidden="true" /><span className="eyebrow">{text(copy.eyebrow, language)}</span></div>
            <h2 id="routes-title" className="section-title">{text(copy.title, language)}</h2>
            <p className="section-description">{text(copy.description, language)}</p>
          </div>
          <GlassCard className="route-total" tone="emerald">
            <div className="route-total-icon" aria-hidden="true"><TrendingUp size={17} /></div>
            <div>
              <span className="route-total-label">{text(copy.headers.savings, language)}</span>
              <strong dir="ltr">{currency(routeSummary.totalSavings, language)}</strong>
            </div>
          </GlassCard>
        </motion.div>

        <motion.div
          className="route-table-card"
          initial={reduced ? false : { opacity: 0, y: 28 }}
          animate={{ opacity: dim(0.82), y: active || reduced ? 0 : 10 }}
          transition={transition(DURATION.slow, { reduced, delay: 0.1 })}
        >
          <div className="route-card-header">
            <div className="toolbar-title"><Map size={16} aria-hidden="true" /><span>{text(copy.terrainLabel, language)}</span></div>
            <div className="route-legend">
              <span><i className="route-line route-line-green" aria-hidden="true" />{text(copy.optimized, language)}</span>
              <span><i className="route-line route-line-red" aria-hidden="true" />{text(copy.detour, language)}</span>
              <DatasetExport dataset="route-intelligence" language={language} />
            </div>
          </div>

          <div className="table-overflow" tabIndex={0} role="region" aria-labelledby="routes-title">
            <table className="route-table">
              <caption className="visually-hidden">{text(copy.description, language)}</caption>
              <thead>
                <tr>
                  <th scope="col" aria-label="#">#</th>
                  <th scope="col">{text(copy.headers.region, language)}</th>
                  <th scope="col">{text(copy.headers.waste, language)}</th>
                  <th scope="col">{text(copy.headers.fuel, language)}</th>
                  <th scope="col">{text(copy.headers.gps, language)}</th>
                  <th scope="col">{text(copy.headers.savings, language)}</th>
                </tr>
              </thead>
              <tbody>
                {routeRegions.map((route, index) => (
                  <motion.tr
                    key={route.id}
                    initial={reduced ? false : { opacity: 0, x: rtl ? 14 : -14 }}
                    animate={{ opacity: dim(0.84), x: active || reduced ? 0 : 4 }}
                    transition={transition(DURATION.base, {
                      reduced,
                      delay: active ? staggerDelay(index, { step: 0.07 }) : 0,
                    })}
                  >
                    <td className="route-rank" dir="ltr">0{index + 1}</td>
                    <th scope="row" className="route-region">
                      <span className="route-region-dot" aria-hidden="true" />{text(route.region, language)}
                    </th>
                    <td className="tabular cell-warning" dir="ltr">{number(route.mileageWastePct, language, 1)}%</td>
                    <td className="tabular" dir="ltr"><Fuel size={13} className="inline-icon" aria-hidden="true" />{number(route.fuelLossPct, language, 1)}%</td>
                    <td className="tabular" dir="ltr"><Route size={13} className="inline-icon" aria-hidden="true" />{number(route.gpsDeviationPct, language, 1)}%</td>
                    <td className="route-savings tabular" dir="ltr">{currency(route.optimizedSavings, language)}</td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="route-card-footer">
            <span>
              <span className="route-line route-line-green" aria-hidden="true" />{text(copy.optimized, language)}{" "}
              <span className="separator" aria-hidden="true">{"//"}</span>{" "}
              <span className="route-line route-line-red" aria-hidden="true" />{text(copy.detour, language)}
            </span>
            <span>{text(copy.terrainLabel, language)} / 04</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

/**
 * PERF: memoised. Crossing a section boundary flips `active` on exactly
 * two of the five sections, but the parent re-render used to reconcile all
 * five full-viewport subtrees (cards, tables, counters, framer-motion
 * nodes) on that same frame. With `memo` only the leaving and entering
 * sections do any work.
 */
export const RoutesSection = memo(RoutesSectionImpl);
