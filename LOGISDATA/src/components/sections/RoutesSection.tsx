"use client";

import { memo, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUpDown, Fuel, Map, Route, TrendingUp } from "lucide-react";
import { presentationCopy } from "@/lib/data";
import { getScenarioRouteRegions } from "@/lib/simulation";
import { currency, number, text } from "@/lib/i18n";
import { DURATION, staggerDelay, transition } from "@/lib/motion";
import { SECTIONS } from "@/lib/sections";
import { GlassCard } from "@/components/ui/GlassCard";
import { DatasetExport } from "@/components/ui/DatasetExport";
import type { SectionProps } from "./types";

type RouteSortField = "rank" | "waste" | "fuel" | "gps" | "savings";

function RoutesSectionImpl({ language, active, reduced, scenario = "active-audit" }: SectionProps) {
  const copy = presentationCopy.routes;
  const dim = (value: number) => (active ? 1 : value);
  const rtl = language === "ar";

  const [sortField, setSortField] = useState<RouteSortField>("rank");
  const [sortAsc, setSortAsc] = useState(false);

  const rawRegions = useMemo(() => getScenarioRouteRegions(scenario), [scenario]);

  const totalSavings = useMemo(
    () => rawRegions.reduce((sum, r) => sum + r.optimizedSavings, 0),
    [rawRegions],
  );

  const sortedRegions = useMemo(() => {
    const list = [...rawRegions];
    if (sortField === "waste") {
      list.sort((a, b) =>
        sortAsc ? a.mileageWastePct - b.mileageWastePct : b.mileageWastePct - a.mileageWastePct,
      );
    } else if (sortField === "fuel") {
      list.sort((a, b) =>
        sortAsc ? a.fuelLossPct - b.fuelLossPct : b.fuelLossPct - a.fuelLossPct,
      );
    } else if (sortField === "gps") {
      list.sort((a, b) =>
        sortAsc ? a.gpsDeviationPct - b.gpsDeviationPct : b.gpsDeviationPct - a.gpsDeviationPct,
      );
    } else if (sortField === "savings") {
      list.sort((a, b) =>
        sortAsc ? a.optimizedSavings - b.optimizedSavings : b.optimizedSavings - a.optimizedSavings,
      );
    }
    return list;
  }, [rawRegions, sortField, sortAsc]);

  const toggleSort = (field: RouteSortField) => {
    if (sortField === field) {
      setSortAsc((prev) => !prev);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };

  const sortDirection = (field: RouteSortField): "ascending" | "descending" | "none" =>
    sortField === field ? (sortAsc ? "ascending" : "descending") : "none";

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
            <div className="eyebrow-row">
              <span className="eyebrow-mark" aria-hidden="true" />
              <span className="eyebrow">{text(copy.eyebrow, language)}</span>
            </div>
            <h2 id="routes-title" className="section-title">{text(copy.title, language)}</h2>
            <p className="section-description">{text(copy.description, language)}</p>
          </div>
          <GlassCard className="route-total" tone="emerald">
            <div className="route-total-icon" aria-hidden="true">
              <TrendingUp size={17} />
            </div>
            <div>
              <span className="route-total-label">{text(copy.headers.savings, language)}</span>
              <strong dir="ltr">{currency(totalSavings, language)}</strong>
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
            <div className="toolbar-title">
              <Map size={16} aria-hidden="true" />
              <span>{text(copy.terrainLabel, language)}</span>
            </div>
            <div className="route-legend">
              <span>
                <i className="route-line route-line-green" aria-hidden="true" />
                {text(copy.optimized, language)}
              </span>
              <span>
                <i className="route-line route-line-red" aria-hidden="true" />
                {text(copy.detour, language)}
              </span>
              <DatasetExport dataset="route-intelligence" language={language} scenario={scenario} />
            </div>
          </div>

          <div className="table-overflow" tabIndex={0} role="region" aria-labelledby="routes-title">
            <table className="route-table">
              <caption className="visually-hidden">{text(copy.description, language)}</caption>
              <thead>
                <tr>
                  <th scope="col" aria-label="#">#</th>
                  <th scope="col">{text(copy.headers.region, language)}</th>
                  <th scope="col" aria-sort={sortDirection("waste")}>
                    <button type="button" className="sort-th-btn" onClick={() => toggleSort("waste")}>
                      <span>{text(copy.headers.waste, language)}</span>
                      <ArrowUpDown size={12} aria-hidden="true" />
                    </button>
                  </th>
                  <th scope="col" aria-sort={sortDirection("fuel")}>
                    <button type="button" className="sort-th-btn" onClick={() => toggleSort("fuel")}>
                      <span>{text(copy.headers.fuel, language)}</span>
                      <ArrowUpDown size={12} aria-hidden="true" />
                    </button>
                  </th>
                  <th scope="col" aria-sort={sortDirection("gps")}>
                    <button type="button" className="sort-th-btn" onClick={() => toggleSort("gps")}>
                      <span>{text(copy.headers.gps, language)}</span>
                      <ArrowUpDown size={12} aria-hidden="true" />
                    </button>
                  </th>
                  <th scope="col" aria-sort={sortDirection("savings")}>
                    <button type="button" className="sort-th-btn" onClick={() => toggleSort("savings")}>
                      <span>{text(copy.headers.savings, language)}</span>
                      <ArrowUpDown size={12} aria-hidden="true" />
                    </button>
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedRegions.map((route, index) => (
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
                      <span className="route-region-dot" aria-hidden="true" />
                      {text(route.region, language)}
                    </th>
                    <td className="tabular cell-warning" dir="ltr">
                      {number(route.mileageWastePct, language, 1)}%
                    </td>
                    <td className="tabular" dir="ltr">
                      <Fuel size={13} className="inline-icon" aria-hidden="true" />
                      {number(route.fuelLossPct, language, 1)}%
                    </td>
                    <td className="tabular" dir="ltr">
                      <Route size={13} className="inline-icon" aria-hidden="true" />
                      {number(route.gpsDeviationPct, language, 1)}%
                    </td>
                    <td className="route-savings tabular" dir="ltr">
                      {currency(route.optimizedSavings, language)}
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="route-card-footer">
            <span>
              <span className="route-line route-line-green" aria-hidden="true" />
              {text(copy.optimized, language)}{" "}
              <span className="separator" aria-hidden="true">{"//"}</span>{" "}
              <span className="route-line route-line-red" aria-hidden="true" />
              {text(copy.detour, language)}
            </span>
            <span>{text(copy.terrainLabel, language)} / 04</span>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

export const RoutesSection = memo(RoutesSectionImpl);
