/**
 * PID Governance & Complexity Calculation Engine
 * 
 * Implements 100% auditable formula parity with Master Q Engine and Scoring Master:
 * - 4-Tier Ingestion Cascade: Active Rubric -> Old MRC -> Regex Keyword Match -> Rate Override
 * - Manager Trade Criticality Weights: Carpentry 4.0, Civil 4.0, Electrical 5.0, Plumbing 5.0, False Ceiling 2.0, Painting 2.0
 * - UOM-Governed Rate > ₹2,000 Override Rule on Area UOMs (SqFt / RFt)
 * - Normalised Revenue Indicators (NRI) at Line, Trade, and Project level
 * - Dynamic Sourcing Strategy and Mandatory Execution Gates
 */

export interface TradeConfig {
  weight: number;
  specialistVendor: string;
  generalVendor: string;
  standardVendor: string;
  specialistGate: string;
  generalGate: string;
  standardGate: string;
}

export interface GovernanceRules {
  tradeWeights: Record<string, number>;
  tradeConfigs: Record<string, TradeConfig>;
  areaRateThreshold: number;
  areaUoms: string[];
  riskThresholds: {
    critical: number; // 0.30
    high: number;     // 0.15
    medium: number;   // 0.05
  };
  regexPatterns: {
    f1Craft: string;
    f2Tooling: string;
    f3Substrate: string;
  };
}

export const DEFAULT_GOVERNANCE_RULES: GovernanceRules = {
  tradeWeights: {
    Carpentry: 4.0,
    Civil: 4.0,
    Electrical: 5.0,
    Plumbing: 5.0,
    'False Ceiling': 2.0,
    Painting: 2.0,
  },
  tradeConfigs: {
    Carpentry: {
      weight: 4.0,
      specialistVendor: 'Specialist Carpentry Partner (Duco/PU/Veneer qualified)',
      generalVendor: 'General Carpentry Pool + Onsite QA checklist',
      standardVendor: 'Standard Carpentry Contractor Pool',
      specialistGate: 'Mandatory VL Sign-Off + Sample Approval Before Cutting',
      generalGate: 'Pre-10 Alert to VL',
      standardGate: 'Auto-Approve / Standard Dispatch',
    },
    Civil: {
      weight: 4.0,
      specialistVendor: 'Specialist Civil Contractor (Waterproofing / Precision Masonry)',
      generalVendor: 'General Contractor Pool with Onsite QA checklist',
      standardVendor: 'Standard Civil Contractor Pool',
      specialistGate: 'Mandatory Water-Ponding Test / Demolition Site Audit',
      generalGate: 'Pre-10 Alert to VL',
      standardGate: 'Auto-Approve / Standard Dispatch',
    },
    Electrical: {
      weight: 5.0,
      specialistVendor: 'Specialist Electrical Contractor (Heavy Load / Automation)',
      generalVendor: 'General Electrical Pool + SLD Checklist',
      standardVendor: 'Standard Electrician Pool',
      specialistGate: 'Mandatory Single-Line Diagram Sign-Off',
      generalGate: 'Pre-10 Alert to VL',
      standardGate: 'Auto-Approve / Standard Dispatch',
    },
    Plumbing: {
      weight: 5.0,
      specialistVendor: 'Specialist Plumbing Partner (Thermostat / Concealed Loop qualified)',
      generalVendor: 'General Plumber Pool + Pressure Checklist',
      standardVendor: 'Standard Plumber Pool',
      specialistGate: 'Mandatory Pressure-Testing Sign-Off Before Tiling',
      generalGate: 'Pre-10 Alert to VL',
      standardGate: 'Auto-Approve / Standard Dispatch',
    },
    'False Ceiling': {
      weight: 2.0,
      specialistVendor: 'Specialist Ceiling Partner (Curved / Wooden / Trap door)',
      generalVendor: 'General False Ceiling Pool + Level Checklist',
      standardVendor: 'Standard False Ceiling Pool',
      specialistGate: 'Mandatory Framing & Trap Door Location Audit',
      generalGate: 'Pre-10 Alert to VL',
      standardGate: 'Auto-Approve / Standard Dispatch',
    },
    Painting: {
      weight: 2.0,
      specialistVendor: 'Specialist Texture Applicator (Asian Archi / Concrete qualified)',
      generalVendor: 'General Painter Pool + Texture Sample Checklist',
      standardVendor: 'Standard Painter Pool',
      specialistGate: 'Mandatory 2ft x 2ft Onsite Swatch Sign-Off Before Application',
      generalGate: 'Pre-10 Alert to VL',
      standardGate: 'Auto-Approve / Standard Dispatch',
    },
  },
  areaRateThreshold: 2000,
  areaUoms: ['sqft', 'rft', 'sq ft', 'r ft', 'sq.ft', 'r.ft', 'sqft.'],
  riskThresholds: {
    critical: 0.30,
    high: 0.15,
    medium: 0.05,
  },
  regexPatterns: {
    f1Craft: 'duco|pu finish|\\bpu\\b|veneer|melamine|cnc|marble|polish|waterproof|thermostat|body jet|archi|texture|exterior|camouflage|inlay|epoxy|brickbat|coba|fluted|charcoal|acoustic|lacquered',
    f2Tooling: 'core cutting|polishing|chiselling|epoxy|gala cutting|profile light|track light|duco|booth|diamond|groov|router',
    f3Substrate: 'rcc|mivan|tight spaces|exterior|external|punning\\(with mesh\\)|complete toilet internal',
  },
};

export interface RawRfvRow {
  rfqId: string;
  projectId: string;
  orderId: string;
  productName: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  sellingUnitPrice: number;
  preTaxPrice: number;
  postTaxPrice: number;
  df: string;
  specifications: string;
  city: string;
  vlEmail: string;
  status: string;
  customerOrderRaisedAt: string;
  publishedAt: string;
  bu: string;
}

export interface AuditedLineItem {
  lineId: string;
  rfqId: string;
  projectId: string;
  rawName: string;
  cleanName: string;
  sku: string;
  trade: string;
  subCategory: string;
  unit: string;
  quantity: number;
  unitPrice: number;
  preTaxPrice: number;
  rateRuleFlag: 'Rate > ₹2k Override' | 'Standard Rate';
  matchOrigin: 'Active Rubric' | 'Old MRC' | 'Regex Match' | 'DF Metadata' | 'BoQ Package/Note';
  isNote: boolean;
  f1: number;
  f2: number;
  f3: number;
  scopeTag: 'Specialised' | 'Standard';
  complexityScore: number; // C_i: 1 to 5
  tradeWeight: number;     // W_t: 2.0 to 5.0
  lineNri: number;         // (C_i * PreTax) / W_t
  sourcingAction: string;
  priceBucket?: string;
}

export interface TradeSummary {
  trade: string;
  weight: number;
  itemCount: number;
  totalQuote: number;
  standardQuote: number;
  specialisedQuote: number;
  specialisedSharePct: number;
  standardNri: number;
  specialisedNri: number;
  totalNri: number;
  vendorPoolStrategy: string;
  mandatoryExecutionGate: string;
  priceBucket?: string;
  standardBucket?: string;
  specialisedBucket?: string;
}

export interface ClubbedLineItem {
  name: string;
  sku: string;
  trade: string;
  subCategory: string;
  unit: string;
  quantity: number;
  preTaxPrice: number;
  scopeTag: 'Specialised' | 'Standard';
  rateRuleFlag: 'Rate > ₹2k Override' | 'Standard Rate';
  sourcingAction: string;
  lineCount: number;
  unitPrice: number;
  priceBucket?: string;
}

export interface PidGovernanceSummary {
  projectId: string;
  city: string;
  bu: string;
  vlEmail: string;
  status: string;
  publishedAt: string;
  itemCount: number;
  consolidatedSkuCount?: number;
  totalServicesQuote: number;
  standardScopeQuote: number;
  standardScopeSharePct: number;
  specialisedScopeQuote: number;
  specialisedScopeSharePct: number;
  rateOverrideCount: number;
  rateOverrideQuote: number;
  projectWeightedComplexity: number; // bar{C}
  projectStandardNri: number;
  projectSpecialisedNri: number;
  projectTotalNri: number;
  nriRiskMultiplier: number;
  variationRiskClass: 'Critical Risk' | 'High Risk' | 'Medium Risk' | 'Low Risk';
  mandatoryApprovalGate: string;
  sourcingAllocationPolicy: string;
  timelineScheduleBuffer: string;
  commercialContingencyBuffer: string;
  trades: Record<string, TradeSummary>;
  lineItems: AuditedLineItem[];
  clubbedLineItems?: ClubbedLineItem[];
  priceBucket?: string;
  standardBucket?: string;
  specialisedBucket?: string;
}

export interface PortfolioGovernanceMetrics {
  totalProjects: number;
  totalConvertedBoQ: number;
  totalStandardBoQ: number;
  totalSpecialisedBoQ: number;
  totalBoqBucket?: string;
  totalStandardBucket?: string;
  totalSpecialisedBucket?: string;
  portfolioSpecialisedSharePct: number;
  portfolioTotalNri: number;
  portfolioRiskMultiplier: number;
  totalRateOverridesCount: number;
  totalRateOverridesValue: number;
  totalRateOverridesBucket?: string;
  riskClassCounts: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  cityCounts: Record<string, { count: number; totalBoQ: number }>;
  buCounts: Record<string, { count: number; totalBoQ: number }>;
  tradeTotals: Record<string, TradeSummary>;
}

/**
 * Normalizes raw trade name into one of 6 core trades
 */
export function normalizeTrade(rawTrade: string): string {
  if (!rawTrade) return 'Carpentry';
  const t = rawTrade.toLowerCase().trim();
  if (t.includes('civil') || t.includes('demolition') || t.includes('masonry') || t.includes('tiling') || t.includes('flooring')) return 'Civil';
  if (t.includes('carpentry') || t.includes('wood') || t.includes('modular') || t.includes('storage') || t.includes('furniture')) return 'Carpentry';
  if (t.includes('elect') || t.includes('wiring') || t.includes('light') || t.includes('fan') || t.includes('switch')) return 'Electrical';
  if (t.includes('plumb') || t.includes('sanitary') || t.includes('gas piping')) return 'Plumbing';
  if (t.includes('ceiling') || t.includes('pop') || t.includes('gypsum')) return 'False Ceiling';
  if (t.includes('paint') || t.includes('texture') || t.includes('polish') || t.includes('putty')) return 'Painting';
  return 'Civil';
}

/**
 * Audits a single raw RFV row through the 4-tier cascade
 */
export function auditLineItem(
  row: RawRfvRow,
  activeRubricMap: Map<string, { trade: string; scope: string; ci: number }>,
  oldMrcMap: Map<string, string>,
  rules: GovernanceRules = DEFAULT_GOVERNANCE_RULES
): AuditedLineItem {
  const rawName = row.productName || '';
  const skuMatch = rawName.match(/\[([A-Z0-9]+)\]/i);
  const sku = skuMatch ? skuMatch[1] : '';
  const cleanName = rawName.replace(/\[[A-Z0-9]+\]/gi, '').trim().replace(/\n/g, ' ');
  const cleanNameLower = cleanName.toLowerCase();

  // Check if non-billable note
  const isNote = cleanNameLower.includes('note') || cleanNameLower === 'notes' || (row.quantity === 0 && row.preTaxPrice === 0);

  // Extract Trade from df if available
  let dfTrade = '';
  let dfSubCat = '';
  if (row.df) {
    const tradeMatch = row.df.match(/Super Category\s*:\s*([^\r\n]+)/i);
    if (tradeMatch) dfTrade = tradeMatch[1].trim();
    const subMatch = row.df.match(/Sub Super Category\s*:\s*([^\r\n]+)/i);
    if (subMatch) dfSubCat = subMatch[1].trim();
  }

  // Regex compile
  const f1Regex = new RegExp(rules.regexPatterns.f1Craft, 'i');
  const f2Regex = new RegExp(rules.regexPatterns.f2Tooling, 'i');
  const f3Regex = new RegExp(rules.regexPatterns.f3Substrate, 'i');

  const fullText = `${cleanName} ${row.df || ''} ${row.specifications || ''}`;
  const f1 = f1Regex.test(fullText) ? 1 : 0;
  const f2 = f2Regex.test(fullText) ? 1 : 0;
  const f3 = f3Regex.test(fullText) ? 1 : 0;

  // Tier 1: Active Rubric match
  let matchOrigin: AuditedLineItem['matchOrigin'] = 'BoQ Package/Note';
  let trade = 'Civil';
  let subCategory = dfSubCat || 'General';
  let baseScope: 'Specialised' | 'Standard' = 'Standard';
  let complexityScore = 2;

  if (activeRubricMap.has(cleanNameLower)) {
    matchOrigin = 'Active Rubric';
    const entry = activeRubricMap.get(cleanNameLower)!;
    trade = normalizeTrade(entry.trade);
    baseScope = entry.scope.toLowerCase().includes('spec') ? 'Specialised' : 'Standard';
    complexityScore = entry.ci || 2;
  } else if (oldMrcMap.has(cleanNameLower)) {
    matchOrigin = 'Old MRC';
    trade = normalizeTrade(oldMrcMap.get(cleanNameLower)!);
    if (f1 === 1 || f1 + f2 + f3 >= 2) {
      baseScope = 'Specialised';
      complexityScore = Math.max(3, f1 + f2 + f3 + 1);
    } else {
      baseScope = 'Standard';
      complexityScore = 2;
    }
  } else if (dfTrade) {
    matchOrigin = 'DF Metadata';
    trade = normalizeTrade(dfTrade);
    if (f1 === 1 || f1 + f2 + f3 >= 2) {
      baseScope = 'Specialised';
      complexityScore = Math.max(3, f1 + f2 + f3 + 1);
    } else {
      baseScope = 'Standard';
      complexityScore = 2;
    }
  } else {
    matchOrigin = 'Regex Match';
    trade = normalizeTrade(cleanName);
    if (f1 === 1 || f1 + f2 + f3 >= 2) {
      baseScope = 'Specialised';
      complexityScore = Math.max(3, f1 + f2 + f3 + 1);
    } else {
      baseScope = 'Standard';
      complexityScore = 1;
    }
  }

  // Universal Rate > ₹2k Override on Area UOMs
  const unitLower = (row.unit || '').toLowerCase().trim();
  const isAreaUom = rules.areaUoms.some(u => unitLower === u || unitLower.startsWith(u));
  const isRateOverride = isAreaUom && row.unitPrice > rules.areaRateThreshold;

  let finalScope: 'Specialised' | 'Standard' = baseScope;
  let rateRuleFlag: 'Rate > ₹2k Override' | 'Standard Rate' = 'Standard Rate';

  if (isRateOverride) {
    finalScope = 'Specialised';
    rateRuleFlag = 'Rate > ₹2k Override';
    complexityScore = Math.max(complexityScore, 4);
  }

  // Cap complexity in [1, 5]
  complexityScore = Math.min(5, Math.max(1, complexityScore));

  const tradeWeight = rules.tradeWeights[trade] || 3.0;
  const lineNri = Math.round((complexityScore * row.preTaxPrice) / tradeWeight);

  let sourcingAction = 'Standard Vendor Pool';
  if (finalScope === 'Specialised') {
    sourcingAction = rules.tradeConfigs[trade]?.specialistVendor || 'Specialist Partner Pool';
  }

  return {
    lineId: `${row.projectId}-${row.rfqId || ''}-${row.orderId || ''}-${cleanName.slice(0, 15)}`,
    rfqId: row.rfqId,
    projectId: row.projectId,
    rawName,
    cleanName,
    sku,
    trade,
    subCategory,
    unit: row.unit,
    quantity: row.quantity,
    unitPrice: row.unitPrice,
    preTaxPrice: row.preTaxPrice,
    rateRuleFlag,
    matchOrigin,
    isNote,
    f1,
    f2,
    f3,
    scopeTag: finalScope,
    complexityScore,
    tradeWeight,
    lineNri,
    sourcingAction,
  };
}

/**
 * Aggregates audited line items for a single PID
 */
export function aggregatePid(
  projectId: string,
  lines: AuditedLineItem[],
  metadata: { city: string; bu: string; vlEmail: string; status: string; publishedAt: string },
  rules: GovernanceRules = DEFAULT_GOVERNANCE_RULES
): PidGovernanceSummary {
  const tradesList = ['Carpentry', 'Civil', 'Electrical', 'Plumbing', 'False Ceiling', 'Painting'];
  const tradesMap: Record<string, TradeSummary> = {};

  tradesList.forEach(t => {
    const cfg = rules.tradeConfigs[t];
    tradesMap[t] = {
      trade: t,
      weight: cfg?.weight || 3.0,
      itemCount: 0,
      totalQuote: 0,
      standardQuote: 0,
      specialisedQuote: 0,
      specialisedSharePct: 0,
      standardNri: 0,
      specialisedNri: 0,
      totalNri: 0,
      vendorPoolStrategy: '-',
      mandatoryExecutionGate: '-',
    };
  });

  let totalServicesQuote = 0;
  let standardScopeQuote = 0;
  let specialisedScopeQuote = 0;
  let rateOverrideCount = 0;
  let rateOverrideQuote = 0;
  let complexityWeightedSum = 0;

  lines.forEach(l => {
    totalServicesQuote += l.preTaxPrice;
    complexityWeightedSum += l.complexityScore * l.preTaxPrice;

    if (l.scopeTag === 'Specialised') {
      specialisedScopeQuote += l.preTaxPrice;
    } else {
      standardScopeQuote += l.preTaxPrice;
    }

    if (l.rateRuleFlag === 'Rate > ₹2k Override') {
      rateOverrideCount++;
      rateOverrideQuote += l.preTaxPrice;
    }

    // Trade summary
    const tr = tradesMap[l.trade] || tradesMap['Civil'];
    tr.itemCount++;
    tr.totalQuote += l.preTaxPrice;
    if (l.scopeTag === 'Specialised') {
      tr.specialisedQuote += l.preTaxPrice;
      tr.specialisedNri += l.lineNri;
    } else {
      tr.standardQuote += l.preTaxPrice;
      tr.standardNri += l.lineNri;
    }
    tr.totalNri += l.lineNri;
  });

  // Calculate trade shares and gates
  let projectTotalNri = 0;
  let projectStandardNri = 0;
  let projectSpecialisedNri = 0;

  tradesList.forEach(t => {
    const tr = tradesMap[t];
    const cfg = rules.tradeConfigs[t];
    if (tr.totalQuote > 0) {
      tr.specialisedSharePct = Math.round((tr.specialisedQuote / tr.totalQuote) * 1000) / 10;
      if (tr.specialisedSharePct >= 35) {
        tr.vendorPoolStrategy = cfg.specialistVendor;
        tr.mandatoryExecutionGate = cfg.specialistGate;
      } else if (tr.specialisedQuote > 0) {
        tr.vendorPoolStrategy = cfg.generalVendor;
        tr.mandatoryExecutionGate = cfg.generalGate;
      } else {
        tr.vendorPoolStrategy = cfg.standardVendor;
        tr.mandatoryExecutionGate = cfg.standardGate;
      }
    } else {
      tr.vendorPoolStrategy = '-';
      tr.mandatoryExecutionGate = '-';
    }
    projectTotalNri += tr.totalNri;
    projectStandardNri += tr.standardNri;
    projectSpecialisedNri += tr.specialisedNri;
  });

  const specialisedScopeSharePct = totalServicesQuote > 0
    ? Math.round((specialisedScopeQuote / totalServicesQuote) * 1000) / 10
    : 0;
  const standardScopeSharePct = totalServicesQuote > 0
    ? Math.round((standardScopeQuote / totalServicesQuote) * 1000) / 10
    : 0;

  const projectWeightedComplexity = totalServicesQuote > 0
    ? Math.round((complexityWeightedSum / totalServicesQuote) * 10) / 10
    : 1;

  const nriRiskMultiplier = totalServicesQuote > 0
    ? Math.round((projectTotalNri / totalServicesQuote) * 100) / 100
    : 1;

  // Project Risk Classification & Sourcing Strategy
  let variationRiskClass: PidGovernanceSummary['variationRiskClass'] = 'Low Risk';
  let mandatoryApprovalGate = 'Auto-Approve / Standard Dispatch';
  let sourcingAllocationPolicy = 'Standard General Contractor Pool';
  let timelineScheduleBuffer = 'Standard Timeline (0 Buffer)';
  let commercialContingencyBuffer = '0% Buffer';

  const shareRatio = specialisedScopeSharePct / 100;
  if (shareRatio >= rules.riskThresholds.critical) {
    variationRiskClass = 'Critical Risk';
    mandatoryApprovalGate = 'Mandatory VM Approval Required';
    sourcingAllocationPolicy = 'Split BoQ: Route Specialised to Specialist Partner Pool; Standard to General Pool';
    timelineScheduleBuffer = '+7 Days Schedule Buffer';
    commercialContingencyBuffer = '+5% Commercial Contingency';
  } else if (shareRatio >= rules.riskThresholds.high) {
    variationRiskClass = 'High Risk';
    mandatoryApprovalGate = 'Mandatory VL Sign-Off';
    sourcingAllocationPolicy = 'General Contractor Pool with Onsite QA checklist';
    timelineScheduleBuffer = '+3 Days Schedule Buffer';
    commercialContingencyBuffer = '+2% Commercial Contingency';
  } else if (shareRatio >= rules.riskThresholds.medium) {
    variationRiskClass = 'Medium Risk';
    mandatoryApprovalGate = 'Mandatory VL Sign-Off';
    sourcingAllocationPolicy = 'Standard Contractor Pool with Onsite QA checklist';
    timelineScheduleBuffer = 'Standard Timeline';
    commercialContingencyBuffer = '0% Buffer';
  }

  return {
    projectId,
    city: metadata.city || 'Unknown',
    bu: metadata.bu || 'Unknown',
    vlEmail: metadata.vlEmail || 'N/A',
    status: metadata.status || 'CONVERTED',
    publishedAt: metadata.publishedAt || '',
    itemCount: lines.length,
    totalServicesQuote,
    standardScopeQuote,
    standardScopeSharePct,
    specialisedScopeQuote,
    specialisedScopeSharePct,
    rateOverrideCount,
    rateOverrideQuote,
    projectWeightedComplexity,
    projectStandardNri,
    projectSpecialisedNri,
    projectTotalNri,
    nriRiskMultiplier,
    variationRiskClass,
    mandatoryApprovalGate,
    sourcingAllocationPolicy,
    timelineScheduleBuffer,
    commercialContingencyBuffer,
    trades: tradesMap,
    lineItems: lines,
  };
}

/**
 * Computes portfolio-wide aggregates across all PIDs
 */
export function aggregatePortfolio(pids: PidGovernanceSummary[]): PortfolioGovernanceMetrics {
  let totalConvertedBoQ = 0;
  let totalStandardBoQ = 0;
  let totalSpecialisedBoQ = 0;
  let portfolioTotalNri = 0;
  let totalRateOverridesCount = 0;
  let totalRateOverridesValue = 0;

  const riskClassCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  const cityCounts: Record<string, { count: number; totalBoQ: number }> = {};
  const buCounts: Record<string, { count: number; totalBoQ: number }> = {};
  const tradeTotalsMap: Record<string, TradeSummary> = {};

  ['Carpentry', 'Civil', 'Electrical', 'Plumbing', 'False Ceiling', 'Painting'].forEach(t => {
    tradeTotalsMap[t] = {
      trade: t,
      weight: DEFAULT_GOVERNANCE_RULES.tradeWeights[t],
      itemCount: 0,
      totalQuote: 0,
      standardQuote: 0,
      specialisedQuote: 0,
      specialisedSharePct: 0,
      standardNri: 0,
      specialisedNri: 0,
      totalNri: 0,
      vendorPoolStrategy: DEFAULT_GOVERNANCE_RULES.tradeConfigs[t].specialistVendor,
      mandatoryExecutionGate: DEFAULT_GOVERNANCE_RULES.tradeConfigs[t].specialistGate,
    };
  });

  pids.forEach(p => {
    totalConvertedBoQ += p.totalServicesQuote;
    totalStandardBoQ += p.standardScopeQuote;
    totalSpecialisedBoQ += p.specialisedScopeQuote;
    portfolioTotalNri += p.projectTotalNri;
    totalRateOverridesCount += p.rateOverrideCount;
    totalRateOverridesValue += p.rateOverrideQuote;

    if (p.variationRiskClass === 'Critical Risk') riskClassCounts.critical++;
    else if (p.variationRiskClass === 'High Risk') riskClassCounts.high++;
    else if (p.variationRiskClass === 'Medium Risk') riskClassCounts.medium++;
    else riskClassCounts.low++;

    // City & BU
    cityCounts[p.city] = cityCounts[p.city] || { count: 0, totalBoQ: 0 };
    cityCounts[p.city].count++;
    cityCounts[p.city].totalBoQ += p.totalServicesQuote;

    buCounts[p.bu] = buCounts[p.bu] || { count: 0, totalBoQ: 0 };
    buCounts[p.bu].count++;
    buCounts[p.bu].totalBoQ += p.totalServicesQuote;

    // Trades
    Object.entries(p.trades).forEach(([t, tSummary]) => {
      const target = tradeTotalsMap[t];
      if (target) {
        target.itemCount += tSummary.itemCount;
        target.totalQuote += tSummary.totalQuote;
        target.standardQuote += tSummary.standardQuote;
        target.specialisedQuote += tSummary.specialisedQuote;
        target.standardNri += tSummary.standardNri;
        target.specialisedNri += tSummary.specialisedNri;
        target.totalNri += tSummary.totalNri;
      }
    });
  });

  Object.values(tradeTotalsMap).forEach(t => {
    t.specialisedSharePct = t.totalQuote > 0
      ? Math.round((t.specialisedQuote / t.totalQuote) * 1000) / 10
      : 0;
  });

  const portfolioSpecialisedSharePct = totalConvertedBoQ > 0
    ? Math.round((totalSpecialisedBoQ / totalConvertedBoQ) * 1000) / 10
    : 0;

  const portfolioRiskMultiplier = totalConvertedBoQ > 0
    ? Math.round((portfolioTotalNri / totalConvertedBoQ) * 100) / 100
    : 1;

  return {
    totalProjects: pids.length,
    totalConvertedBoQ,
    totalStandardBoQ,
    totalSpecialisedBoQ,
    portfolioSpecialisedSharePct,
    portfolioTotalNri,
    portfolioRiskMultiplier,
    totalRateOverridesCount,
    totalRateOverridesValue,
    riskClassCounts,
    cityCounts,
    buCounts,
    tradeTotals: tradeTotalsMap,
  };
}
