const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
const OUTPUT_DATA_PATH = path.join(__dirname, '..', 'lib', 'data', 'pid_governance_data.json');
const SCRATCH_DATA_PATH = '/Users/ankur.kumar/.gemini/antigravity/brain/b53385fd-9cb1-4b45-bb65-f8dda109f687/scratch/pid_audit_data.json';

const SCORING_MASTER_ID = '1oG4vMvJyZey0XlCOdqhreP4ki3fTUhpAdFLIFds2_Jo';
const RFV_DUMP_ID = '1Y6HWuxIBP0Cz9JFEHSKo850JxpyMVy18VPg0kvBZUno';

async function main() {
  console.log('🚀 Starting PID Governance Live Sync...');
  const auth = google.auth.fromJSON(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
  const sheets = google.sheets({ version: 'v4', auth });

  // 1. Fetch Rules & Formulas
  console.log('📥 1/4 Fetching Rules & Formulas...');
  const rulesRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SCORING_MASTER_ID,
    range: "'Rules & Formulas'!A30:F35"
  });
  
  const tradeWeights = {
    Carpentry: 4.0,
    Civil: 4.0,
    Electrical: 5.0,
    Plumbing: 5.0,
    'False Ceiling': 2.0,
    Painting: 2.0
  };

  if (rulesRes.data.values) {
    rulesRes.data.values.forEach(r => {
      const trade = r[0];
      const weight = parseFloat(r[1]);
      if (trade && !isNaN(weight)) {
        if (trade.includes('Carpentry')) tradeWeights['Carpentry'] = weight;
        else if (trade.includes('Civil')) tradeWeights['Civil'] = weight;
        else if (trade.includes('Electrical')) tradeWeights['Electrical'] = weight;
        else if (trade.includes('Plumbing')) tradeWeights['Plumbing'] = weight;
        else if (trade.includes('Ceiling')) tradeWeights['False Ceiling'] = weight;
        else if (trade.includes('Painting')) tradeWeights['Painting'] = weight;
      }
    });
  }
  console.log('Active Trade Weights from Sheet:', tradeWeights);

  // 2. Fetch Active Rubric (Scoring Sheet 2)
  console.log('📥 2/4 Fetching Active Rubric (Scoring Sheet 2)...');
  const rubricRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SCORING_MASTER_ID,
    range: "'Scoring Sheet 2'!B3:T"
  });
  const activeRubricMap = new Map();
  if (rubricRes.data.values) {
    rubricRes.data.values.forEach(r => {
      const trade = r[0];
      const name = r[2]; // Col D
      const scope = r[11]; // Col M
      const ci = parseFloat(r[13]) || 2; // Col O
      if (name && name.trim()) {
        const cleanK = name.trim().toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
        activeRubricMap.set(cleanK, { trade: trade || 'Carpentry', scope: scope || 'Standard', ci });
        activeRubricMap.set(name.trim().toLowerCase(), {
          trade: trade || 'Carpentry',
          scope: scope || 'Standard',
          ci
        });
      }
    });
  }
  console.log(`Loaded ${activeRubricMap.size} Active Rubric items.`);

  // 3. Fetch OLD MRC
  console.log('📥 3/4 Fetching OLD MRC Catalog...');
  const oldMrcRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SCORING_MASTER_ID,
    range: "'OLD MRC'!F5:J"
  });
  const oldMrcMap = new Map();
  if (oldMrcRes.data.values) {
    oldMrcRes.data.values.forEach(r => {
      const trade = r[0];
      const name = r[4]; // Col J
      if (name && name.trim()) {
        const cleanK = name.trim().toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
        oldMrcMap.set(cleanK, trade || 'Civil');
        oldMrcMap.set(name.trim().toLowerCase(), trade || 'Civil');
      }
    });
  }
  console.log(`Loaded ${oldMrcMap.size} OLD MRC distinct items.`);

  // 4. Fetch RFV Dump OND26
  console.log('📥 4/4 Fetching RFV Converted Quotes (RFV_Dump-OND26)...');
  const rfvRes = await sheets.spreadsheets.values.get({
    spreadsheetId: RFV_DUMP_ID,
    range: "'RFV_Dump-OND26'!A2:S20000"
  });

  const rfvRows = rfvRes.data.values || [];
  const headers = rfvRows[0];
  const dataRows = rfvRows.slice(1);
  console.log(`Retrieved ${dataRows.length} raw quote line items.`);

  // Regex setup
  const f1Pattern = 'duco|pu finish|\\bpu\\b|veneer|melamine|cnc|marble|polish|waterproof|thermostat|body jet|archi|texture|exterior|camouflage|inlay|epoxy|brickbat|coba|fluted|charcoal|acoustic|lacquered';
  const f2Pattern = 'core cutting|polishing|chiselling|epoxy|gala cutting|profile light|track light|duco|booth|diamond|groov|router';
  const f3Pattern = 'rcc|mivan|tight spaces|exterior|external|punning\\(with mesh\\)|complete toilet internal';

  const f1Regex = new RegExp(f1Pattern, 'i');
  const f2Regex = new RegExp(f2Pattern, 'i');
  const f3Regex = new RegExp(f3Pattern, 'i');

  const areaUoms = ['sqft', 'rft', 'sq ft', 'r ft', 'sq.ft', 'r.ft', 'sqft.'];
  const AREA_RATE_THRESHOLD = 2000;

  function normalizeTrade(rawTrade) {
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

  const tradeConfigs = {
    Carpentry: {
      weight: tradeWeights.Carpentry,
      specialistVendor: 'Specialist Carpentry Partner (Duco/PU/Veneer qualified)',
      generalVendor: 'General Carpentry Pool + Onsite QA checklist',
      standardVendor: 'Standard Carpentry Contractor Pool',
      specialistGate: 'Mandatory VL Sign-Off + Sample Approval Before Cutting',
      generalGate: 'Pre-10 Alert to VL',
      standardGate: 'Auto-Approve / Standard Dispatch',
    },
    Civil: {
      weight: tradeWeights.Civil,
      specialistVendor: 'Specialist Civil Contractor (Waterproofing / Precision Masonry)',
      generalVendor: 'General Contractor Pool with Onsite QA checklist',
      standardVendor: 'Standard Civil Contractor Pool',
      specialistGate: 'Mandatory Water-Ponding Test / Demolition Site Audit',
      generalGate: 'Pre-10 Alert to VL',
      standardGate: 'Auto-Approve / Standard Dispatch',
    },
    Electrical: {
      weight: tradeWeights.Electrical,
      specialistVendor: 'Specialist Electrical Contractor (Heavy Load / Automation)',
      generalVendor: 'General Electrical Pool + SLD Checklist',
      standardVendor: 'Standard Electrician Pool',
      specialistGate: 'Mandatory Single-Line Diagram Sign-Off',
      generalGate: 'Pre-10 Alert to VL',
      standardGate: 'Auto-Approve / Standard Dispatch',
    },
    Plumbing: {
      weight: tradeWeights.Plumbing,
      specialistVendor: 'Specialist Plumbing Partner (Thermostat / Concealed Loop qualified)',
      generalVendor: 'General Plumber Pool + Pressure Checklist',
      standardVendor: 'Standard Plumber Pool',
      specialistGate: 'Mandatory Pressure-Testing Sign-Off Before Tiling',
      generalGate: 'Pre-10 Alert to VL',
      standardGate: 'Auto-Approve / Standard Dispatch',
    },
    'False Ceiling': {
      weight: tradeWeights['False Ceiling'],
      specialistVendor: 'Specialist Ceiling Partner (Curved / Wooden / Trap door)',
      generalVendor: 'General False Ceiling Pool + Level Checklist',
      standardVendor: 'Standard False Ceiling Pool',
      specialistGate: 'Mandatory Framing & Trap Door Location Audit',
      generalGate: 'Pre-10 Alert to VL',
      standardGate: 'Auto-Approve / Standard Dispatch',
    },
    Painting: {
      weight: tradeWeights.Painting,
      specialistVendor: 'Specialist Texture Applicator (Asian Archi / Concrete qualified)',
      generalVendor: 'General Painter Pool + Texture Sample Checklist',
      standardVendor: 'Standard Painter Pool',
      specialistGate: 'Mandatory 2ft x 2ft Onsite Swatch Sign-Off Before Application',
      generalGate: 'Pre-10 Alert to VL',
      standardGate: 'Auto-Approve / Standard Dispatch',
    },
  };

  // Group by PID
  const pidGroups = new Map();
  let totalProcessedRows = 0;
  let matchOriginStats = {
    activeRubric: 0,
    oldMrc: 0,
    dfMetadata: 0,
    regexMatch: 0,
    packageNote: 0
  };

  dataRows.forEach((r, idx) => {
    const rfqId = r[0] || '';
    const projectId = (r[1] || '').trim();
    if (!projectId) return;

    totalProcessedRows++;
    const orderId = r[2] || '';
    const rawName = r[3] || '';
    const qty = parseFloat(r[4]) || 0;
    const unit = (r[5] || '').trim();
    const unitPrice = parseFloat(r[6]) || 0;
    const sellingPrice = parseFloat(r[7]) || 0;
    const preTaxPrice = parseFloat(r[8]) || (qty * unitPrice);
    const postTaxPrice = parseFloat(r[9]) || preTaxPrice;
    const df = r[10] || '';
    const specs = r[11] || '';
    const city = r[13] || 'Unknown';
    const vlEmail = r[14] || 'N/A';
    const status = r[15] || 'CONVERTED';
    const orderRaisedAt = r[16] || '';
    const publishedAt = r[17] || '';
    const bu = r[18] || 'Vesta';

    const skuMatch = rawName.match(/\[([A-Z0-9]+)\]/i);
    const sku = skuMatch ? skuMatch[1] : '';
    const cleanName = rawName.replace(/\[[A-Z0-9]+\]/gi, '').trim().replace(/\n/g, ' ');
    const cleanNameLower = cleanName.toLowerCase();

    // Notes check
    const isNote = cleanNameLower.includes('note') || cleanNameLower === 'notes' || (qty === 0 && preTaxPrice === 0);

    // Extract trade from df
    let dfTrade = '';
    let dfSubCat = '';
    if (df) {
      const tm = df.match(/Super Category\s*:\s*([^\r\n]+)/i);
      if (tm) dfTrade = tm[1].trim();
      const sc = df.match(/Sub Super Category\s*:\s*([^\r\n]+)/i);
      if (sc) dfSubCat = sc[1].trim();
    }

    const cleanKey = cleanNameLower.replace(/[-_]/g, ' ').replace(/\s+/g, ' ');

    let matchOrigin = 'Regex Match';
    let trade = 'Civil';
    let subCategory = dfSubCat || 'General';
    let baseScope = 'Standard';
    let complexityScore = 2;

    const f1SpecialisedTitleRegex = new RegExp(
      'duco|pu finish|\\bpu\\b|veneer|melamine|cnc|marble|polish|waterproof|thermostat|body jet|archi|texture|exterior|camouflage|inlay|epoxy|brickbat|coba|fluted|charcoal|acoustic|lacquered|bevelled|tinted glass|smart switch|heavy load|ac piping|chandel',
      'i'
    );

    if (activeRubricMap.has(cleanKey) || activeRubricMap.has(cleanNameLower)) {
      matchOrigin = 'Active Rubric';
      matchOriginStats.activeRubric++;
      const entry = activeRubricMap.get(cleanKey) || activeRubricMap.get(cleanNameLower);
      trade = normalizeTrade(entry.trade);
      baseScope = entry.scope.toLowerCase().includes('spec') ? 'Specialised' : 'Standard';
      complexityScore = entry.ci || 2;
    } else if (oldMrcMap.has(cleanKey) || oldMrcMap.has(cleanNameLower)) {
      matchOrigin = 'Old MRC';
      matchOriginStats.oldMrc++;
      trade = normalizeTrade(oldMrcMap.get(cleanKey) || oldMrcMap.get(cleanNameLower));
      if (f1SpecialisedTitleRegex.test(cleanName)) {
        baseScope = 'Specialised';
        complexityScore = 3;
      } else {
        baseScope = 'Standard';
        complexityScore = 2;
      }
    } else if (dfTrade) {
      matchOrigin = 'DF Metadata';
      matchOriginStats.dfMetadata++;
      trade = normalizeTrade(dfTrade);
      if (f1SpecialisedTitleRegex.test(cleanName)) {
        baseScope = 'Specialised';
        complexityScore = 3;
      } else {
        baseScope = 'Standard';
        complexityScore = 2;
      }
    } else {
      matchOriginStats.regexMatch++;
      trade = normalizeTrade(cleanName);
      if (f1SpecialisedTitleRegex.test(cleanName)) {
        baseScope = 'Specialised';
        complexityScore = 3;
      } else {
        baseScope = 'Standard';
        complexityScore = 1;
      }
    }

    // Rate > ₹2k Override on Area UOMs
    const unitLower = unit.toLowerCase().trim();
    const isAreaUom = areaUoms.some(u => unitLower === u || unitLower.startsWith(u));
    const isRateOverride = isAreaUom && unitPrice > AREA_RATE_THRESHOLD;

    let finalScope = baseScope;
    let rateRuleFlag = 'Standard Rate';
    if (isRateOverride) {
      finalScope = 'Specialised';
      rateRuleFlag = 'Rate > ₹2k Override';
      complexityScore = Math.max(complexityScore, 4);
    }
    complexityScore = Math.min(5, Math.max(1, complexityScore));

    const tradeWeight = tradeWeights[trade] || 3.0;
    const lineNri = Math.round((complexityScore * preTaxPrice) / tradeWeight);

    let sourcingAction = 'Standard Vendor Pool';
    if (finalScope === 'Specialised') {
      sourcingAction = tradeConfigs[trade]?.specialistVendor || 'Specialist Partner Pool';
    }

    const f1 = f1SpecialisedTitleRegex.test(cleanName) ? 1 : 0;
    const f2 = 0;
    const f3 = 0;

    const auditedItem = {
      lineId: `${projectId}-${idx+1}`,
      rfqId,
      projectId,
      rawName,
      cleanName,
      sku,
      trade,
      subCategory,
      unit,
      quantity: qty,
      unitPrice,
      preTaxPrice,
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
      sourcingAction
    };

    if (!pidGroups.has(projectId)) {
      pidGroups.set(projectId, {
        metadata: { city, bu, vlEmail, status, publishedAt },
        lines: []
      });
    }
    pidGroups.get(projectId).lines.push(auditedItem);
  });

  console.log(`Processed ${totalProcessedRows} rows across ${pidGroups.size} unique PIDs.`);
  console.log('Match Origin Breakdown:', matchOriginStats);

  // Aggregate PIDs
  const pidsSummaryList = [];
  const tradesList = ['Carpentry', 'Civil', 'Electrical', 'Plumbing', 'False Ceiling', 'Painting'];

  for (const [projectId, group] of pidGroups.entries()) {
    const lines = group.lines;
    const meta = group.metadata;

    const tradesMap = {};
    tradesList.forEach(t => {
      const cfg = tradeConfigs[t];
      tradesMap[t] = {
        trade: t,
        weight: cfg.weight,
        itemCount: 0,
        totalQuote: 0,
        standardQuote: 0,
        specialisedQuote: 0,
        specialisedSharePct: 0,
        standardNri: 0,
        specialisedNri: 0,
        totalNri: 0,
        vendorPoolStrategy: '-',
        mandatoryExecutionGate: '-'
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

    let projectTotalNri = 0;
    let projectStandardNri = 0;
    let projectSpecialisedNri = 0;

    tradesList.forEach(t => {
      const tr = tradesMap[t];
      const cfg = tradeConfigs[t];
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

    let variationRiskClass = 'Low Risk';
    let mandatoryApprovalGate = 'Auto-Approve / Standard Dispatch';
    let sourcingAllocationPolicy = 'Standard General Contractor Pool';
    let timelineScheduleBuffer = 'Standard Timeline (0 Buffer)';
    let commercialContingencyBuffer = '0% Buffer';

    const ratio = specialisedScopeSharePct / 100;
    if (ratio >= 0.30) {
      variationRiskClass = 'Critical Risk';
      mandatoryApprovalGate = 'Mandatory VM Approval Required';
      sourcingAllocationPolicy = 'Split BoQ: Route Specialised to Specialist Partner Pool; Standard to General Pool';
      timelineScheduleBuffer = '+7 Days Schedule Buffer';
      commercialContingencyBuffer = '+5% Commercial Contingency';
    } else if (ratio >= 0.15) {
      variationRiskClass = 'High Risk';
      mandatoryApprovalGate = 'Mandatory VL Sign-Off';
      sourcingAllocationPolicy = 'General Contractor Pool with Onsite QA checklist';
      timelineScheduleBuffer = '+3 Days Schedule Buffer';
      commercialContingencyBuffer = '+2% Commercial Contingency';
    } else if (ratio >= 0.05) {
      variationRiskClass = 'Medium Risk';
      mandatoryApprovalGate = 'Mandatory VL Sign-Off';
      sourcingAllocationPolicy = 'Standard Contractor Pool with Onsite QA checklist';
      timelineScheduleBuffer = 'Standard Timeline';
      commercialContingencyBuffer = '0% Buffer';
    }

    const clubbedMap = new Map();
    lines.forEach(l => {
      const key = l.cleanName.trim();
      if (!clubbedMap.has(key)) {
        clubbedMap.set(key, {
          name: l.cleanName,
          sku: l.sku,
          trade: l.trade,
          subCategory: l.subCategory,
          unit: l.unit,
          quantity: 0,
          preTaxPrice: 0,
          scopeTag: l.scopeTag,
          rateRuleFlag: l.rateRuleFlag,
          sourcingAction: l.sourcingAction,
          lineCount: 0
        });
      }
      const entry = clubbedMap.get(key);
      entry.quantity += l.quantity;
      entry.preTaxPrice += l.preTaxPrice;
      entry.lineCount += 1;
      if (l.scopeTag === 'Specialised') {
        entry.scopeTag = 'Specialised';
        entry.sourcingAction = l.sourcingAction;
        entry.rateRuleFlag = l.rateRuleFlag;
      }
    });

    const clubbedLineItems = Array.from(clubbedMap.values()).map(c => ({
      ...c,
      quantity: Math.round(c.quantity * 100) / 100,
      preTaxPrice: Math.round(c.preTaxPrice),
      unitPrice: c.quantity > 0 ? Math.round(c.preTaxPrice / c.quantity) : 0
    }));

    pidsSummaryList.push({
      projectId,
      city: meta.city || 'Unknown',
      bu: meta.bu || 'Unknown',
      vlEmail: meta.vlEmail || 'N/A',
      status: meta.status || 'CONVERTED',
      publishedAt: meta.publishedAt || '',
      itemCount: lines.length,
      consolidatedSkuCount: clubbedLineItems.length,
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
      clubbedLineItems
    });
  }

  // Portfolio level metrics
  let totalConvertedBoQ = 0;
  let totalStandardBoQ = 0;
  let totalSpecialisedBoQ = 0;
  let portfolioTotalNri = 0;
  let totalRateOverridesCount = 0;
  let totalRateOverridesValue = 0;

  const riskClassCounts = { critical: 0, high: 0, medium: 0, low: 0 };
  const cityCounts = {};
  const buCounts = {};
  const tradeTotalsMap = {};

  tradesList.forEach(t => {
    tradeTotalsMap[t] = {
      trade: t,
      weight: tradeWeights[t],
      itemCount: 0,
      totalQuote: 0,
      standardQuote: 0,
      specialisedQuote: 0,
      specialisedSharePct: 0,
      standardNri: 0,
      specialisedNri: 0,
      totalNri: 0,
      vendorPoolStrategy: tradeConfigs[t].specialistVendor,
      mandatoryExecutionGate: tradeConfigs[t].specialistGate
    };
  });

  pidsSummaryList.forEach(p => {
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

    cityCounts[p.city] = cityCounts[p.city] || { count: 0, totalBoQ: 0 };
    cityCounts[p.city].count++;
    cityCounts[p.city].totalBoQ += p.totalServicesQuote;

    buCounts[p.bu] = buCounts[p.bu] || { count: 0, totalBoQ: 0 };
    buCounts[p.bu].count++;
    buCounts[p.bu].totalBoQ += p.totalServicesQuote;

    Object.entries(p.trades).forEach(([t, tSummary]) => {
      const tgt = tradeTotalsMap[t];
      if (tgt) {
        tgt.itemCount += tSummary.itemCount;
        tgt.totalQuote += tSummary.totalQuote;
        tgt.standardQuote += tSummary.standardQuote;
        tgt.specialisedQuote += tSummary.specialisedQuote;
        tgt.standardNri += tSummary.standardNri;
        tgt.specialisedNri += tSummary.specialisedNri;
        tgt.totalNri += tSummary.totalNri;
      }
    });
  });

  tradesList.forEach(t => {
    const tgt = tradeTotalsMap[t];
    tgt.specialisedSharePct = tgt.totalQuote > 0
      ? Math.round((tgt.specialisedQuote / tgt.totalQuote) * 1000) / 10
      : 0;
  });

  const portfolioSpecialisedSharePct = totalConvertedBoQ > 0
    ? Math.round((totalSpecialisedBoQ / totalConvertedBoQ) * 1000) / 10
    : 0;

  const portfolioRiskMultiplier = totalConvertedBoQ > 0
    ? Math.round((portfolioTotalNri / totalConvertedBoQ) * 100) / 100
    : 1;

  const finalPayload = {
    syncMetadata: {
      syncedAt: new Date().toISOString(),
      sourceSpreadsheetId: RFV_DUMP_ID,
      sourceSheetTab: 'RFV_Dump-OND26',
      totalConvertedRows: totalProcessedRows,
      totalPids: pidsSummaryList.length,
      rulesMasterId: SCORING_MASTER_ID,
      activeTradeWeights: tradeWeights,
      areaRateThreshold: AREA_RATE_THRESHOLD,
      regexRules: {
        f1Craft: f1Pattern,
        f2Tooling: f2Pattern,
        f3Substrate: f3Pattern
      }
    },
    portfolio: {
      totalProjects: pidsSummaryList.length,
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
      tradeTotals: tradeTotalsMap
    },
    pids: pidsSummaryList
  };

  // Ensure lib/data directory
  fs.mkdirSync(path.dirname(OUTPUT_DATA_PATH), { recursive: true });
  fs.writeFileSync(OUTPUT_DATA_PATH, JSON.stringify(finalPayload, null, 2));
  console.log(`✅ Saved app data cache to ${OUTPUT_DATA_PATH} (${(fs.statSync(OUTPUT_DATA_PATH).size / (1024*1024)).toFixed(2)} MB)`);

  // Ensure scratch dir
  fs.mkdirSync(path.dirname(SCRATCH_DATA_PATH), { recursive: true });
  fs.writeFileSync(SCRATCH_DATA_PATH, JSON.stringify(finalPayload, null, 2));
  console.log(`✅ Saved scratch backup to ${SCRATCH_DATA_PATH}`);

  console.log('\n================ PORTFOLIO SUMMARY ================');
  console.log(`Total Projects Audited: ${finalPayload.portfolio.totalProjects}`);
  console.log(`Total Services BoQ: ₹${Math.round(finalPayload.portfolio.totalConvertedBoQ).toLocaleString('en-IN')}`);
  console.log(`Specialised Scope: ₹${Math.round(finalPayload.portfolio.totalSpecialisedBoQ).toLocaleString('en-IN')} (${finalPayload.portfolio.portfolioSpecialisedSharePct}%)`);
  console.log(`Portfolio Total NRI: ₹${Math.round(finalPayload.portfolio.portfolioTotalNri).toLocaleString('en-IN')} (Risk Multiplier: ${finalPayload.portfolio.portfolioRiskMultiplier}x)`);
  console.log(`Rate > ₹2k Overrides: ${finalPayload.portfolio.totalRateOverridesCount} items (₹${Math.round(finalPayload.portfolio.totalRateOverridesValue).toLocaleString('en-IN')})`);
  console.log('Risk Classes:', finalPayload.portfolio.riskClassCounts);
  console.log('====================================================\n');
}

main().catch(err => {
  console.error('❌ Sync failed:', err);
  process.exit(1);
});
