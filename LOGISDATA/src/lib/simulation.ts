import {
  auditMetrics,
  demandTiers,
  freightAuditRows,
  routeRegions,
  warehouseBins,
} from "./data";
import type {
  AuditMetric,
  AuditScenario,
  DemandTier,
  FreightAuditRow,
  RecoveryBreakdown,
  RecoveryParameters,
  RouteRegion,
  SupplyNodeDetail,
  TelemetryEvent,
  WarehouseBin,
} from "./types";

/**
 * Node detailed operational metrics and telemetry profile
 */
export const supplyNodeDetails: Record<string, SupplyNodeDetail> = {
  port: {
    id: "port",
    label: { en: "Port Terminal Alpha", ar: "محطة الميناء الرئيسية" },
    role: { en: "Maritime Container Ingress", ar: "منفذ دخول الحاويات البحرية" },
    throughputTons: 142000,
    transitVarianceHours: 3.4,
    activeCarriers: 12,
    leakageRiskPct: 1.2,
    status: "verified",
    telemetryStream: {
      en: "Automated berth sync · GPS geofencing confirmed · Zero billing mismatch",
      ar: "مزامنة آلية للأرصفة · تأكيد النطاق الجغرافي لـ GPS · لا توجد فروقات فوترة",
    },
    anomalies: [
      { en: "Accessorial dwell time within 4h standard SLA", ar: "وقت الانتظار ضمن معيار اتفاقية الخدمة ٤ ساعات" },
      { en: "Automated optical container scan 100% matched", ar: "مسح بصري آلي للحاويات متطابق بنسبة ١٠٠٪" },
    ],
  },
  yard: {
    id: "yard",
    label: { en: "Staging Yard Bravo", ar: "ساحة التجميع برافو" },
    role: { en: "Intermodal Container Buffer", ar: "منطقة عزل ونقل الحاويات المشتركة" },
    throughputTons: 68400,
    transitVarianceHours: 14.8,
    activeCarriers: 26,
    leakageRiskPct: 8.7,
    status: "leak",
    telemetryStream: {
      en: "Manual chassis assignment · Duplicate accessorial claims detected · GPS drift",
      ar: "تخصيص يدوي للهياكل · اكتشاف مطالبات إضافية مكررة · انحراف في تتبع GPS",
    },
    anomalies: [
      { en: "18 unverified chassis detention invoices ($42.8k value)", ar: "١٨ فاتورة حجز هيكل غير موثقة (بقيمة ٤٢٫٨ ألف دولار)" },
      { en: "Discrepancy between gate log and carrier telematics (+11.2 km)", ar: "فرق بين سجل البوابة وتليماتكس الناقل (+١١٫٢ كم)" },
    ],
  },
  factory: {
    id: "factory",
    label: { en: "Manufacturing Plant 01", ar: "المصنع الرئيسي ٠١" },
    role: { en: "Production & Assembly Center", ar: "مركز الإنتاج والتجميع" },
    throughputTons: 98000,
    transitVarianceHours: 2.1,
    activeCarriers: 8,
    leakageRiskPct: 1.8,
    status: "verified",
    telemetryStream: {
      en: "ERP batch integration · Real-time bill of lading reconciliation",
      ar: "ربط فوري بدفعات ERP · مطابقة لحظية لبوالص الشحن",
    },
    anomalies: [
      { en: "Assembly line batch telemetry verified against ERP master", ar: "توثيق بيانات خط التجميع مقابل النظام الرئيسي" },
    ],
  },
  crossdock: {
    id: "crossdock",
    label: { en: "Cross-Dock Gateway", ar: "بوابة التخزين العابر" },
    role: { en: "Rapid Pallet Consolidation", ar: "تجميع وتوزيع الطبالي السريع" },
    throughputTons: 54100,
    transitVarianceHours: 9.6,
    activeCarriers: 18,
    leakageRiskPct: 6.4,
    status: "phantom",
    telemetryStream: {
      en: "Phantom pallet transfers · WMS staging time override in place",
      ar: "نقل طبالي وهمي · تجاوز يدوي لأوقات التجهيز في WMS",
    },
    anomalies: [
      { en: "Unreported 2.8% freight split across regional feeder runs", ar: "تجزئة غير معلنة لشحنات بنسبة ٢٫٨٪ عبر الخطوط المغذية" },
      { en: "Safety buffer overrides adding $310k unneeded inventory", ar: "تجاوزات المخزون الآمن تضيف ٣١٠ ألف دولار مخزون فائض" },
    ],
  },
  hub: {
    id: "hub",
    label: { en: "Regional Central Hub", ar: "المركز اللوجستي الإقليمي" },
    role: { en: "Primary Distribution Nexus", ar: "نقطة التوزيع المركزية الرئيسية" },
    throughputTons: 185000,
    transitVarianceHours: 1.8,
    activeCarriers: 34,
    leakageRiskPct: 2.1,
    status: "verified",
    telemetryStream: {
      en: "Automated sortation telemetry active · Rate contract auto-cleared",
      ar: "تفعيل فرز آلي للمسارات · تصفية تلقائية لعقود الأسعار",
    },
    anomalies: [
      { en: "Linehaul rates 99.4% compliant with master freight agreements", ar: "عقود النقل البري متوافقة بنسبة ٩٩٫٤٪ مع الاتفاقيات" },
    ],
  },
  store: {
    id: "store",
    label: { en: "Retail Network Outlets", ar: "منافذ شبكة التجزئة" },
    role: { en: "Consumer Fulfillment Points", ar: "نقاط التوزيع والبيع للمستهلك" },
    throughputTons: 72000,
    transitVarianceHours: 8.2,
    activeCarriers: 42,
    leakageRiskPct: 7.9,
    status: "leak",
    telemetryStream: {
      en: "Last-mile route drift · Unverified delivery confirmation scans",
      ar: "انحراف مسارات الميل الأخير · مسح تأكيد تسليم غير موثق",
    },
    anomalies: [
      { en: "14.2% mileage waste identified in urban last-mile cluster", ar: "هدر مسافة بنسبة ١٤٫٢٪ في قطاع التوصيل الحضري" },
      { en: "Duplicate delivery surcharge applied to 12% of route batches", ar: "رسوم تسليم إضافية مكررة على ١٢٪ من دفعات الشحن" },
    ],
  },
  returns: {
    id: "returns",
    label: { en: "Reverse Logistics Depot", ar: "مركز الخدمات اللوجستية العكسية" },
    role: { en: "Returns & Quality Triage", ar: "معالجة المرتجعات وتقييم الجودة" },
    throughputTons: 16400,
    transitVarianceHours: 18.5,
    activeCarriers: 14,
    leakageRiskPct: 9.1,
    status: "phantom",
    telemetryStream: {
      en: "Unreconciled return authorizations · Delayed WMS stock write-in",
      ar: "تصاريح مرتجعات غير مطابقة · تأخير قيد المخزون في WMS",
    },
    anomalies: [
      { en: "$1.24M tied in slow-moving unreviewed quarantine pallets", ar: "١٫٢٤ مليون دولار عالقة في طبالي العزل غير المراجعة" },
      { en: "31-day average delay in SKU salvage status resolution", ar: "متوسط تأخير ٣١ يومًا في تسوية تصنيف الأصناف" },
    ],
  },
  data: {
    id: "data",
    label: { en: "Control Telemetry Core", ar: "نواة التليماتكس والرقابة" },
    role: { en: "Live Data Lake & Audit Gate", ar: "بحيرة البيانات اللحظية وبوابة التدقيق" },
    throughputTons: 0,
    transitVarianceHours: 0.1,
    activeCarriers: 0,
    leakageRiskPct: 0.4,
    status: "verified",
    telemetryStream: {
      en: "Continuous 5-theatre audit synchronization · 100% telemetry integrity",
      ar: "مزامنة مستمرة لمسارح التدقيق الخمسة · تكامل تليماتكس ١٠٠٪",
    },
    anomalies: [
      { en: "Continuous cryptographic verification against telematics stream", ar: "توثيق مستمر مقابل تدفق بيانات التليماتكس" },
    ],
  },
};

/**
 * Scenario-derived calculations for metrics and data
 */
export function getScenarioMetrics(scenario: AuditScenario): AuditMetric[] {
  switch (scenario) {
    case "baseline":
      return [
        {
          id: "global-waste",
          value: 2.8,
          prefix: "$",
          suffix: "T",
          decimals: 1,
          label: { en: "Unmonitored Supply Waste", ar: "الهدر غير الخاضع للرقابة" },
          note: { en: "total estimated friction without audit", ar: "إجمالي الاحتكاك التقديري دون تدقيق" },
          tone: "red",
        },
        {
          id: "invoice-discrepancy",
          value: 6.9,
          prefix: "",
          suffix: "%",
          decimals: 1,
          label: { en: "Unchecked Invoice Discrepancy", ar: "فروقات الفواتير غير المكتشفة" },
          note: { en: "raw telematics vs invoice gap", ar: "فجوة التليماتكس مقابل الفاتورة" },
          tone: "red",
        },
        {
          id: "audit-roi",
          value: 1.0,
          prefix: "",
          suffix: "x",
          decimals: 1,
          label: { en: "Passive Audit Baseline", ar: "خط أساس التدقيق الساكن" },
          note: { en: "no real-time automated recovery", ar: "دون استرداد آلي لحظي" },
          tone: "amber",
        },
      ];
    case "active-audit":
      return auditMetrics;
    case "mitigated":
      return [
        {
          id: "global-waste",
          value: 0.3,
          prefix: "$",
          suffix: "T",
          decimals: 1,
          label: { en: "Residual Operational Friction", ar: "الاحتكاك التشغيلي المتبقي" },
          note: { en: "post-optimization controlled waste", ar: "الهدر المضبوط بعد التحسين الكامل" },
          tone: "emerald",
        },
        {
          id: "invoice-discrepancy",
          value: 0.2,
          prefix: "",
          suffix: "%",
          decimals: 1,
          label: { en: "Audited Invoice Error Rate", ar: "معدل خطأ الفواتير بعد التدقيق" },
          note: { en: "continuous closed-loop settlement", ar: "تسوية مغلقة ومستمرة" },
          tone: "emerald",
        },
        {
          id: "audit-roi",
          value: 14.8,
          prefix: "",
          suffix: "x",
          decimals: 1,
          label: { en: "Full-Loop Recovery ROI", ar: "عائد الاسترداد الكامل للحلقة" },
          note: { en: "multi-tier synchronized value recovery", ar: "استرداد متعدد المستويات للقيمة" },
          tone: "emerald",
        },
      ];
  }
}

export function getScenarioFreightRows(scenario: AuditScenario): FreightAuditRow[] {
  if (scenario === "mitigated") {
    return freightAuditRows.map((row) => ({
      ...row,
      billedMileage: row.actualMileage,
      duplicateBillingPct: 0.0,
      overchargePct: 0.1,
      verdict: "passed",
    }));
  }
  if (scenario === "baseline") {
    return freightAuditRows.map((row) => ({
      ...row,
      billedMileage: Math.round(row.billedMileage * 1.08),
      duplicateBillingPct: Number((row.duplicateBillingPct * 1.8 + 1.2).toFixed(1)),
      overchargePct: Number((row.overchargePct * 1.6 + 1.5).toFixed(1)),
      verdict: "red-flag",
    }));
  }
  return freightAuditRows;
}

export function getScenarioDemandTiers(scenario: AuditScenario): DemandTier[] {
  if (scenario === "mitigated") {
    return demandTiers.map((tier) => ({
      ...tier,
      distorted: tier.actual + Math.round((tier.audited - tier.actual) * 0.3),
      audited: tier.actual + 2,
    }));
  }
  if (scenario === "baseline") {
    return demandTiers.map((tier, idx) => ({
      ...tier,
      distorted: Math.round(tier.actual * (1 + idx * 0.75)),
      audited: Math.round(tier.actual * (1 + idx * 0.75)),
    }));
  }
  return demandTiers;
}

export function getScenarioRouteRegions(scenario: AuditScenario): RouteRegion[] {
  if (scenario === "mitigated") {
    return routeRegions.map((r) => ({
      ...r,
      mileageWastePct: Number((r.mileageWastePct * 0.18).toFixed(1)),
      fuelLossPct: Number((r.fuelLossPct * 0.15).toFixed(1)),
      gpsDeviationPct: Number((r.gpsDeviationPct * 0.12).toFixed(1)),
      optimizedSavings: Math.round(r.optimizedSavings * 1.45),
    }));
  }
  if (scenario === "baseline") {
    return routeRegions.map((r) => ({
      ...r,
      mileageWastePct: Number((r.mileageWastePct * 1.5).toFixed(1)),
      fuelLossPct: Number((r.fuelLossPct * 1.6).toFixed(1)),
      gpsDeviationPct: Number((r.gpsDeviationPct * 1.7).toFixed(1)),
      optimizedSavings: 0,
    }));
  }
  return routeRegions;
}

export function getScenarioWarehouseBins(scenario: AuditScenario): WarehouseBin[] {
  if (scenario === "mitigated") {
    return warehouseBins.map((bin) => ({ ...bin, status: "audited" }));
  }
  if (scenario === "baseline") {
    return warehouseBins.map((bin, idx) => ({
      ...bin,
      status: idx % 2 === 0 ? "mismatch" : "audited",
    }));
  }
  return warehouseBins;
}

/**
 * Real-time synthetic telemetry events generator for live feed
 */
export const SAMPLE_TELEMETRY_EVENTS: TelemetryEvent[] = [
  {
    id: "evt-01",
    timestamp: "14:32:08",
    gateId: "invoice",
    severity: "critical",
    code: "INV-DUP-CLAIM-884",
    message: {
      en: "Ocean Feeder accessorial surcharge duplicated across Bol 48821",
      ar: "تكرار رسوم إضافية للناقلة البحرية عبر بوليصة الشحن ٤٨٨٢١",
    },
    deltaValue: "+$4,820",
    metricImpact: { en: "Discrepancy blocked", ar: "تم حظر الفارق" },
  },
  {
    id: "evt-02",
    timestamp: "14:31:45",
    gateId: "fleet",
    severity: "warning",
    code: "GPS-CORR-DEV-19",
    message: {
      en: "Gulf Linehaul Truck #419 deviated +14.2 km from authorized corridor",
      ar: "انحراف شاحنة النقل البري بالخليج رقم ٤١٩ بمقدار +١٤٫٢ كم عن المسار",
    },
    deltaValue: "14.2 km detour",
    metricImpact: { en: "Rerouted to highway", ar: "تمت إعادة التوجيه للطريق السريع" },
  },
  {
    id: "evt-03",
    timestamp: "14:31:12",
    gateId: "warehouse",
    severity: "critical",
    code: "WMS-BIN-MISMATCH-C05",
    message: {
      en: "RFID scan mismatch at Bin C05: SKU 4324 physically absent",
      ar: "عدم تطابق مسح RFID في الرف C05: الصنف ٤٣٢٤ غير موجود فعليًا",
    },
    deltaValue: "Variance flag",
    metricImpact: { en: "Directed cycle count", ar: "تم توجيه جرد دوري" },
  },
  {
    id: "evt-04",
    timestamp: "14:30:50",
    gateId: "demand",
    severity: "reconciled",
    code: "BW-FILTER-APPLIED-T4",
    message: {
      en: "Supplier tier demand signal smoothed: 145 units dampened to 61 units",
      ar: "تمت تسوية إشارة طلب المورد: تخفيض ١٤٥ وحدة إلى ٦١ وحدة مدققة",
    },
    deltaValue: "-58% inventory drag",
    metricImpact: { en: "$3.4M buffer avoided", ar: "تجنب مخزون زائد بقيمة ٣٫٤M$" },
  },
  {
    id: "evt-05",
    timestamp: "14:30:19",
    gateId: "network",
    severity: "optimized",
    code: "GATE-SYNC-PASS-ALL",
    message: {
      en: "Port Alpha ↔ Regional Hub telematics contract 100% reconciled",
      ar: "مطابقة تليماتكس ميناء ألفا ↔ المركز الإقليمي بنسبة ١٠٠٪ بنجاح",
    },
    deltaValue: "0.0% variance",
    metricImpact: { en: "Auto-cleared to ERP", ar: "ترحيل تلقائي إلى ERP" },
  },
  {
    id: "evt-06",
    timestamp: "14:29:40",
    gateId: "fleet",
    severity: "optimized",
    code: "FLEET-IDLE-RESOLVED",
    message: {
      en: "Red Sea corridor fleet idle time cut by 34 minutes via live slotting",
      ar: "خفض وقت توقف أسطول ممر البحر الأحمر ٣٤ دقيقة عبر الجدولة الحية",
    },
    deltaValue: "-$12,400 fuel waste",
    metricImpact: { en: "Fuel saved", ar: "تم توفير الوقود" },
  },
];

/**
 * Financial Recovery and ROI Calculator model
 */
export const DEFAULT_RECOVERY_PARAMS: RecoveryParameters = {
  annualFreightSpend: 25000000, // $25M
  annualOrderUnits: 500000,    // 500k units
  skuCatalogSize: 12000,       // 12k SKUs
  averageMarginPct: 8.5,       // 8.5%
};

export function calculateRecovery(params: RecoveryParameters): RecoveryBreakdown {
  const freight = Math.max(0, params.annualFreightSpend);
  const units = Math.max(0, params.annualOrderUnits);
  const skus = Math.max(0, params.skuCatalogSize);

  // Freight audit: 3.8% invoice discrepancy & duplicate billing recovered
  const freightSavings = Math.round(freight * 0.038);

  // Bullwhip inventory drag reduction: carrying cost savings
  const bullwhipSavings = Math.round((units / 500000) * 1250000);

  // Route & telematics fuel/mileage waste recovery: approx 4.2% of freight spend
  const routeSavings = Math.round(freight * 0.042);

  // Warehouse misplacement & dead stock disposition: scaled to SKU volume
  const warehouseSavings = Math.round((skus / 1000) * 45000);

  const totalAnnualRecovery = freightSavings + bullwhipSavings + routeSavings + warehouseSavings;

  const estimatedRevenue = freight / 0.06;
  const marginImprovementBps = Math.round((totalAnnualRecovery / estimatedRevenue) * 10000);

  const auditSystemCost = 280000;
  const paybackMonths = Number(((auditSystemCost / totalAnnualRecovery) * 12).toFixed(1));

  return {
    freightSavings,
    bullwhipSavings,
    routeSavings,
    warehouseSavings,
    totalAnnualRecovery,
    marginImprovementBps: Math.max(10, marginImprovementBps),
    paybackMonths: Math.max(0.8, paybackMonths),
  };
}
