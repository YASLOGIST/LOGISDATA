import { demandTiers, freightAuditRows, routeRegions, warehouseBins } from "./data";
import type { DemandTier, FreightAuditRow, RouteRegion } from "./types";

/**
 * Derived, memoisable analytics selectors.
 *
 * The section components previously recomputed these on every React render
 * (five `Array.prototype.filter`/`reduce` passes per frame of a
 * framer-motion transition). They are pure functions of module-level
 * constant data, so they are computed exactly once here and the section
 * components just read the result.
 */

export interface AuditSummary {
  total: number;
  flagged: number;
  passed: number;
  flaggedRate: number;
  totalOverchargePct: number;
  billedKm: number;
  actualKm: number;
  /** Billed kilometres that telematics could not corroborate. */
  unverifiedKm: number;
  worstRow: FreightAuditRow;
}

function summariseAudit(rows: readonly FreightAuditRow[]): AuditSummary {
  if (rows.length === 0) throw new Error("freightAuditRows must not be empty");
  const flaggedRows = rows.filter((row) => row.verdict === "red-flag");
  const billedKm = rows.reduce((sum, row) => sum + row.billedMileage, 0);
  const actualKm = rows.reduce((sum, row) => sum + row.actualMileage, 0);
  const worstRow = rows.reduce((worst, row) => (row.overchargePct > worst.overchargePct ? row : worst), rows[0]);
  return {
    total: rows.length,
    flagged: flaggedRows.length,
    passed: rows.length - flaggedRows.length,
    flaggedRate: flaggedRows.length / rows.length,
    totalOverchargePct: round(flaggedRows.reduce((sum, row) => sum + row.overchargePct, 0)),
    billedKm,
    actualKm,
    unverifiedKm: billedKm - actualKm,
    worstRow,
  };
}

export interface DemandSummary {
  maxSignal: number;
  /** Highest distortion ratio across the chain (`distorted / actual`). */
  peakAmplification: number;
  /** Amplification remaining after the audited signal is applied. */
  auditedAmplification: number;
  /** Share of the distortion the audit removes, 0..1. */
  distortionRemoved: number;
  deepestTier: DemandTier;
}

function summariseDemand(tiers: readonly DemandTier[]): DemandSummary {
  if (tiers.length === 0) throw new Error("demandTiers must not be empty");
  const deepestTier = tiers.reduce((deepest, tier) => (tier.distorted > deepest.distorted ? tier : deepest), tiers[0]);
  const baseline = tiers[0].actual || 1;
  const peakAmplification = deepestTier.distorted / baseline;
  const auditedAmplification = deepestTier.audited / baseline;
  return {
    maxSignal: Math.max(...tiers.map((tier) => tier.distorted)),
    peakAmplification: round(peakAmplification, 2),
    auditedAmplification: round(auditedAmplification, 2),
    distortionRemoved:
      peakAmplification > 1 ? round((peakAmplification - auditedAmplification) / (peakAmplification - 1), 3) : 0,
    deepestTier,
  };
}

export interface RouteSummary {
  totalSavings: number;
  averageWastePct: number;
  worstRegion: RouteRegion;
  bestRegion: RouteRegion;
}

function summariseRoutes(regions: readonly RouteRegion[]): RouteSummary {
  if (regions.length === 0) throw new Error("routeRegions must not be empty");
  return {
    totalSavings: regions.reduce((sum, region) => sum + region.optimizedSavings, 0),
    averageWastePct: round(regions.reduce((sum, region) => sum + region.mileageWastePct, 0) / regions.length),
    worstRegion: regions.reduce((worst, region) => (region.mileageWastePct > worst.mileageWastePct ? region : worst), regions[0]),
    bestRegion: regions.reduce((best, region) => (region.mileageWastePct < best.mileageWastePct ? region : best), regions[0]),
  };
}

export interface WarehouseSummary {
  total: number;
  mismatches: number;
  audited: number;
  accuracy: number;
}

function summariseWarehouse(): WarehouseSummary {
  const mismatches = warehouseBins.filter((bin) => bin.status === "mismatch").length;
  return {
    total: warehouseBins.length,
    mismatches,
    audited: warehouseBins.length - mismatches,
    accuracy: warehouseBins.length === 0 ? 1 : round((warehouseBins.length - mismatches) / warehouseBins.length, 4),
  };
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export const auditSummary: AuditSummary = summariseAudit(freightAuditRows);
export const demandSummary: DemandSummary = summariseDemand(demandTiers);
export const routeSummary: RouteSummary = summariseRoutes(routeRegions);
export const warehouseSummary: WarehouseSummary = summariseWarehouse();

export const selectors = { summariseAudit, summariseDemand, summariseRoutes, summariseWarehouse };
