export type Language = "en" | "ar";
export type ThemeMode = "dark" | "light";
export type AccentTone = "amber" | "emerald" | "cyan" | "red";
export type AuditVerdict = "red-flag" | "passed";

export interface LocalizedText {
  en: string;
  ar: string;
}

export interface AuditMetric {
  id: string;
  value: number;
  prefix: string;
  suffix: string;
  decimals: number;
  label: LocalizedText;
  note: LocalizedText;
  tone: AccentTone;
}

export interface FreightAuditRow {
  id: string;
  freightType: LocalizedText;
  billedMileage: number;
  actualMileage: number;
  duplicateBillingPct: number;
  overchargePct: number;
  verdict: AuditVerdict;
}

export interface DemandTier {
  id: string;
  label: LocalizedText;
  actual: number;
  distorted: number;
  audited: number;
}

export interface RouteRegion {
  id: string;
  region: LocalizedText;
  mileageWastePct: number;
  fuelLossPct: number;
  gpsDeviationPct: number;
  optimizedSavings: number;
}

export interface WarehouseSpec {
  id: string;
  title: LocalizedText;
  impact: LocalizedText;
  cause: LocalizedText;
  fix: LocalizedText;
  tone: AccentTone;
}

export interface WarehouseBin {
  id: string;
  x: number;
  y: number;
  z: number;
  sku: LocalizedText;
  status: "mismatch" | "audited";
}

export interface SupplyNode {
  id: string;
  label: LocalizedText;
  position: [number, number, number];
  status: "verified" | "leak" | "phantom";
}

export interface PresentationCopy {
  nav: {
    eyebrow: LocalizedText;
    sections: LocalizedText[];
    theme: LocalizedText;
    language: LocalizedText;
    scrollHint: LocalizedText;
  };
  hero: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    subhead: LocalizedText;
    byline: LocalizedText;
    presenter: string;
    registration: string;
    registrationLabel: LocalizedText;
    date: LocalizedText;
    modelNote: LocalizedText;
    networkLabel: LocalizedText;
    metricSource: LocalizedText;
    logoSpace: LocalizedText;
    controlLabel: LocalizedText;
    labLabel: LocalizedText;
    verifiedLabel: LocalizedText;
  };
  audit: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    description: LocalizedText;
    tableHeaders: {
      freight: LocalizedText;
      billed: LocalizedText;
      actual: LocalizedText;
      duplicate: LocalizedText;
      overcharge: LocalizedText;
      verdict: LocalizedText;
    };
    redFlag: LocalizedText;
    passed: LocalizedText;
    scannerLabel: LocalizedText;
    scannerSubLabel: LocalizedText;
    verified: LocalizedText;
    warning: LocalizedText;
  };
  demand: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    description: LocalizedText;
    chartActual: LocalizedText;
    chartDistorted: LocalizedText;
    chartAudited: LocalizedText;
    dragTitle: LocalizedText;
    dragValue: LocalizedText;
    stockTitle: LocalizedText;
    stockValue: LocalizedText;
    smoothingLabel: LocalizedText;
    amplificationLabel: LocalizedText;
    supplierUnitsLabel: LocalizedText;
  };
  routes: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    description: LocalizedText;
    headers: {
      region: LocalizedText;
      waste: LocalizedText;
      fuel: LocalizedText;
      gps: LocalizedText;
      savings: LocalizedText;
    };
    optimized: LocalizedText;
    detour: LocalizedText;
    terrainLabel: LocalizedText;
  };
  warehouse: {
    eyebrow: LocalizedText;
    title: LocalizedText;
    description: LocalizedText;
    headers: {
      impact: LocalizedText;
      cause: LocalizedText;
      fix: LocalizedText;
    };
    mismatch: LocalizedText;
    audited: LocalizedText;
    scanLabel: LocalizedText;
    callout: LocalizedText;
  };
  footer: {
    statement: LocalizedText;
    prompt: LocalizedText;
    illustrative: LocalizedText;
  };
}
