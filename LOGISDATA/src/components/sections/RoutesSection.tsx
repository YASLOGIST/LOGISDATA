"use client";

import { motion } from "framer-motion";
import { Fuel, Map, Route, TrendingUp } from "lucide-react";
import { presentationCopy, routeRegions } from "@/lib/data";
import { currency, number, text } from "@/lib/i18n";
import type { Language } from "@/lib/types";
import { GlassCard } from "@/components/ui/GlassCard";

interface RoutesSectionProps {
  language: Language;
  active: boolean;
}

const ease = [0.22, 1, 0.36, 1] as const;

export function RoutesSection({ language, active }: RoutesSectionProps) {
  const copy = presentationCopy.routes;
  const totalSavings = routeRegions.reduce((sum, row) => sum + row.optimizedSavings, 0);

  return (
    <section id="section-4" className="presentation-section section-routes snap-start" aria-labelledby="routes-title">
      <div className="section-inner">
        <motion.div
          className="section-heading-row"
          initial={{ opacity: 0, y: 22 }}
          animate={{ opacity: active ? 1 : 0.76, y: active ? 0 : 8 }}
          transition={{ duration: 0.7, ease }}
        >
          <div className="section-heading-copy">
            <div className="eyebrow-row"><span className="eyebrow-mark" /><span className="eyebrow">{text(copy.eyebrow, language)}</span></div>
            <h2 id="routes-title" className="section-title">{text(copy.title, language)}</h2>
            <p className="section-description">{text(copy.description, language)}</p>
          </div>
          <GlassCard className="route-total" tone="emerald">
            <div className="route-total-icon"><TrendingUp size={17} /></div>
            <div><span className="route-total-label">{text(copy.headers.savings, language)}</span><strong dir="ltr">{currency(totalSavings, language)}</strong></div>
          </GlassCard>
        </motion.div>

        <motion.div
          className="route-table-card"
          initial={{ opacity: 0, y: 28 }}
          animate={{ opacity: active ? 1 : 0.82, y: active ? 0 : 10 }}
          transition={{ duration: 0.8, delay: 0.1, ease }}
        >
          <div className="route-card-header">
            <div className="toolbar-title"><Map size={16} /><span>{text(copy.terrainLabel, language)}</span></div>
            <div className="route-legend"><span><i className="route-line route-line-green" />{text(copy.optimized, language)}</span><span><i className="route-line route-line-red" />{text(copy.detour, language)}</span></div>
          </div>
          <div className="route-list-header route-grid">
            <span>#</span><span>{text(copy.headers.region, language)}</span><span>{text(copy.headers.waste, language)}</span><span>{text(copy.headers.fuel, language)}</span><span>{text(copy.headers.gps, language)}</span><span>{text(copy.headers.savings, language)}</span>
          </div>
          <div className="route-rows">
            {routeRegions.map((route, index) => (
              <motion.div
                className="route-row route-grid"
                key={route.id}
                initial={{ opacity: 0, x: language === "ar" ? 14 : -14 }}
                animate={{ opacity: active ? 1 : 0.84, x: active ? 0 : 4 }}
                transition={{ duration: 0.45, delay: active ? index * 0.07 : 0, ease }}
              >
                <span className="route-rank" dir="ltr">0{index + 1}</span>
                <span className="route-region"><span className="route-region-dot" />{text(route.region, language)}</span>
                <span className="tabular cell-warning" dir="ltr">{number(route.mileageWastePct, language, 1)}%</span>
                <span className="tabular" dir="ltr"><Fuel size={13} className="inline-icon" />{number(route.fuelLossPct, language, 1)}%</span>
                <span className="tabular" dir="ltr"><Route size={13} className="inline-icon" />{number(route.gpsDeviationPct, language, 1)}%</span>
                <span className="route-savings tabular" dir="ltr">{currency(route.optimizedSavings, language)}</span>
              </motion.div>
            ))}
          </div>
          <div className="route-card-footer"><span><span className="route-line route-line-green" />{text(copy.optimized, language)} <span className="separator">{"//"}</span> <span className="route-line route-line-red" />{text(copy.detour, language)}</span><span>{text(copy.terrainLabel, language)} / 04</span></div>
        </motion.div>
      </div>
    </section>
  );
}
