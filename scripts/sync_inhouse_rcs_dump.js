const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const token = JSON.parse(fs.readFileSync('token.json', 'utf8'));
const credentials = JSON.parse(fs.readFileSync('credentials.json', 'utf8'));
const { client_secret, client_id, redirect_uris } = credentials.installed || credentials.web;
const oAuth2Client = new google.auth.OAuth2(client_id, client_secret, redirect_uris[0]);
oAuth2Client.setCredentials(token);
const sheets = google.sheets({ version: 'v4', auth: oAuth2Client });

const SOURCE_SHEET_ID = '1YqzdQi9v_yFeM8cbguU-chIlvSbsN8Swp48DdvUDIx4'; // Inhouse - RCS
const SOURCE_TAB = 'Inhouse_dump';
const TARGET_SHEET_ID = '1Y6HWuxIBP0Cz9JFEHSKo850JxpyMVy18VPg0kvBZUno'; // Target Workbook
const STAGING_TAB = 'Inhouse_Clean_Staging';
const SCORING_SHEET_ID = '1oG4vMvJyZey0XlCOdqhreP4ki3fTUhpAdFLIFds2_Jo'; // Scoring Master

function toPriceBucket(val) {
  const n = Number(val) || 0;
  if (n < 25000) return 'Less than 25K';
  if (n < 50000) return '25-50K';
  if (n < 100000) return '50K-1L';
  if (n < 200000) return '1-2L';
  if (n < 300000) return '2-3L';
  if (n < 400000) return '3-4L';
  if (n < 500000) return '4-5L';
  return '5L+';
}

function normalizeTrade(name, productType) {
  const text = ((name || '') + ' ' + (productType || '')).toLowerCase();
  if (text.includes('civil') || text.includes('demolition') || text.includes('masonry') || text.includes('tiling') || text.includes('flooring') || text.includes('plaster') || text.includes('granite') || text.includes('marble') || text.includes('waterproof')) return 'Civil';
  if (text.includes('carpentry') || text.includes('wood') || text.includes('modular') || text.includes('storage') || text.includes('furniture') || text.includes('panel') || text.includes('pelmet') || text.includes('door') || text.includes('ply')) return 'Carpentry';
  if (text.includes('elect') || text.includes('wiring') || text.includes('light') || text.includes('fan') || text.includes('switch') || text.includes('inverter') || text.includes('mcb')) return 'Electrical';
  if (text.includes('plumb') || text.includes('sanitary') || text.includes('cp fitting') || text.includes('drain') || text.includes('pipe') || text.includes('toilet') || text.includes('basin') || text.includes('sink')) return 'Plumbing';
  if (text.includes('ceiling') || text.includes('pop') || text.includes('gypsum') || text.includes('grid')) return 'False Ceiling';
  if (text.includes('paint') || text.includes('polish') || text.includes('texture') || text.includes('putty') || text.includes('primer') || text.includes('duco') || text.includes('pu finish') || text.includes('emulsion')) return 'Painting';
  return 'Civil';
}

function classifyScope(cleanName, trade, unitPrice) {
  const lower = cleanName.toLowerCase();
  
  // Clean laminate panelling rule (Never Specialised unless premium finish or rate > 2k)
  if (lower.includes('laminate') && lower.includes('panel') && !lower.includes('duco') && !lower.includes('pu') && !lower.includes('veneer') && !lower.includes('fluted') && !lower.includes('inlay')) {
    if (unitPrice > 2000) {
      return { scopeTag: 'Specialised', rateRule: 'Rate > ₹2k Override', pool: 'Specialist Carpentry Contractor Pool' };
    }
    return { scopeTag: 'Standard', rateRule: 'Standard Rate', pool: 'Standard Carpentry Contractor Pool' };
  }

  // Specialty Keywords
  const isSpec = /duco|pu finish|\bpu\b|veneer|melamine|cnc|marble|polish|waterproof|thermostat|body jet|archi|texture|inlay|epoxy|brickbat|coba|fluted|charcoal|acoustic|lacquered|core cutting|profile light|track light|automation|pressure test|curved|wooden ceiling|baffle/i.test(lower);
  const isRateOverride = unitPrice > 2000 && (lower.includes('sqft') || lower.includes('rft') || lower.includes('sq ft') || lower.includes('r ft'));

  if (isSpec || isRateOverride) {
    return {
      scopeTag: 'Specialised',
      rateRule: isRateOverride ? 'Rate > ₹2k Override' : 'Standard Rate',
      pool: `Specialist ${trade} Contractor Pool`
    };
  }

  return {
    scopeTag: 'Standard',
    rateRule: 'Standard Rate',
    pool: `Standard ${trade} Contractor Pool`
  };
}

async function run() {
  console.log('--- Step 1: Connecting to Source Workbook (Inhouse - RCS) ---');
  const sourceMeta = await sheets.spreadsheets.get({ spreadsheetId: SOURCE_SHEET_ID });
  const inhouseSheet = sourceMeta.data.sheets.find(s => s.properties.title === SOURCE_TAB);
  const totalRowsInSource = inhouseSheet.properties.gridProperties.rowCount || 442204;
  console.log(`Source sheet has ${totalRowsInSource} total rows.`);

  console.log('--- Step 2: Streaming and Filtering 2026 Rows (Exclusion == "Include") ---');
  const cleanRows = [];
  const chunkSize = 50000;

  for (let start = 2; start <= totalRowsInSource; start += chunkSize) {
    const end = Math.min(start + chunkSize - 1, totalRowsInSource);
    console.log(`Fetching rows ${start} to ${end}...`);
    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SOURCE_SHEET_ID,
      range: `${SOURCE_TAB}!A${start}:M${end}`
    });
    const rows = res.data.values || [];

    for (const r of rows) {
      const pid = (r[0] || '').trim();
      const createdAt = (r[1] || '').trim();
      const skuCode = (r[2] || '').trim();
      const productType = (r[3] || '').trim();
      const preTax = parseFloat(r[4]) || 0;
      const city = (r[5] || '').trim();
      const bu = (r[6] || '').trim();
      const rawName = (r[7] || '').trim();
      const vendor = (r[10] || '').trim();
      const qty = parseFloat(r[11]) || 1;
      const exclusion = (r[12] || '').trim().toLowerCase();

      // Filter: 2026 only, Exclusion == "include" only, valid PID
      if (!createdAt.startsWith('2026') || exclusion !== 'include' || !pid) {
        continue;
      }

      const cleanName = rawName.split('\n[')[0].split('[')[0].trim() || skuCode;
      const trade = normalizeTrade(cleanName, productType);
      const unitRate = qty > 0 ? preTax / qty : preTax;
      const { scopeTag, rateRule, pool } = classifyScope(cleanName, trade, unitRate);
      const priceBucket = toPriceBucket(preTax);

      // 16 Target Staging Columns
      cleanRows.push([
        pid,             // Col A (1): PID
        createdAt,       // Col B (2): Created Date
        skuCode,         // Col C (3): SKU Code
        cleanName,       // Col D (4): Clean SKU Name
        qty,             // Col E (5): Quantity
        preTax,          // Col F (6): PreTax Price
        Math.round(unitRate * 100) / 100, // Col G (7): Unit Rate
        trade,           // Col H (8): Trade
        scopeTag,        // Col I (9): Scope Tag
        rateRule,        // Col J (10): Rate Rule Flag
        pool,            // Col K (11): Supply Sourcing Allocation Pool
        city,            // Col L (12): City
        bu,              // Col M (13): BU
        vendor,          // Col N (14): Vendor Name
        rawName.replace(/\n/g, ' '), // Col O (15): Raw Product Name
        priceBucket      // Col P (16): Price Bucket
      ]);
    }
    console.log(`Progress: Found ${cleanRows.length} valid 2026 Include rows so far.`);
  }

  console.log(`\nFiltered total: ${cleanRows.length} clean 2026 rows across Inhouse Services.`);

  console.log(`--- Step 3: Ensuring ${STAGING_TAB} exists in Target Workbook ---`);
  const targetMeta = await sheets.spreadsheets.get({ spreadsheetId: TARGET_SHEET_ID });
  let stagingSheet = targetMeta.data.sheets.find(s => s.properties.title === STAGING_TAB);

  if (!stagingSheet) {
    console.log(`Creating tab ${STAGING_TAB}...`);
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: TARGET_SHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: STAGING_TAB,
                gridProperties: {
                  rowCount: cleanRows.length + 100,
                  columnCount: 18,
                  frozenRowCount: 1
                }
              }
            }
          }
        ]
      }
    });
    stagingSheet = addRes.data.replies[0].addSheet;
    console.log(`Created ${STAGING_TAB} with id ${stagingSheet.properties.sheetId}`);
  } else {
    // Ensure sufficient rows
    if (stagingSheet.properties.gridProperties.rowCount < cleanRows.length + 100) {
      console.log(`Resizing ${STAGING_TAB} to ${cleanRows.length + 100} rows...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: TARGET_SHEET_ID,
        requestBody: {
          requests: [
            {
              updateSheetProperties: {
                properties: {
                  sheetId: stagingSheet.properties.sheetId,
                  gridProperties: {
                    rowCount: cleanRows.length + 100,
                    columnCount: 18,
                    frozenRowCount: 1
                  }
                },
                fields: 'gridProperties(rowCount,columnCount,frozenRowCount)'
              }
            }
          ]
        }
      });
    }
  }

  console.log('--- Step 4: Writing Headers and Batches to Google Sheet ---');
  const headers = [
    'PID',
    'Created Date',
    'SKU Code',
    'Clean SKU Name',
    'Quantity',
    'PreTax Price',
    'Unit Rate',
    'Trade',
    'Scope Tag',
    'Rate Rule Flag',
    'Supply Sourcing Allocation Pool',
    'City',
    'BU',
    'Vendor Name',
    'Raw Product Name',
    'Price Bucket'
  ];

  // Write Header
  await sheets.spreadsheets.values.update({
    spreadsheetId: TARGET_SHEET_ID,
    range: `${STAGING_TAB}!A1:P1`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: [headers] }
  });

  // Write rows in batches of 25,000
  const writeBatchSize = 25000;
  for (let i = 0; i < cleanRows.length; i += writeBatchSize) {
    const chunk = cleanRows.slice(i, i + writeBatchSize);
    const startRow = i + 2;
    const endRow = i + 1 + chunk.length;
    console.log(`Writing batch ${i / writeBatchSize + 1}: rows ${startRow} to ${endRow}...`);
    await sheets.spreadsheets.values.update({
      spreadsheetId: TARGET_SHEET_ID,
      range: `${STAGING_TAB}!A${startRow}:P${endRow}`,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: chunk }
    });
  }

  console.log('--- Step 5: Aggregating Local PID Cache for Web App & Artifact ---');
  // Aggregate by PID
  const pidMap = new Map();

  cleanRows.forEach(r => {
    const [pid, createdAt, sku, cleanName, qty, preTax, unitRate, trade, scopeTag, rateRule, pool, city, bu, vendor, rawName, bucket] = r;

    if (!pidMap.has(pid)) {
      pidMap.set(pid, {
        projectId: pid,
        city: city || 'Unknown',
        bu: bu || 'Select',
        vlEmail: vendor || 'Inhouse Operations',
        publishedAt: createdAt,
        itemCount: 0,
        totalServicesQuote: 0,
        standardScopeQuote: 0,
        specialisedScopeQuote: 0,
        rateOverrideCount: 0,
        rateOverrideQuote: 0,
        trades: {
          Carpentry: { trade: 'Carpentry', itemCount: 0, totalQuote: 0, standardQuote: 0, specialisedQuote: 0, vendorPoolStrategy: 'Standard Carpentry Pool' },
          Civil: { trade: 'Civil', itemCount: 0, totalQuote: 0, standardQuote: 0, specialisedQuote: 0, vendorPoolStrategy: 'Standard Civil Pool' },
          Electrical: { trade: 'Electrical', itemCount: 0, totalQuote: 0, standardQuote: 0, specialisedQuote: 0, vendorPoolStrategy: 'Standard Electrician Pool' },
          Plumbing: { trade: 'Plumbing', itemCount: 0, totalQuote: 0, standardQuote: 0, specialisedQuote: 0, vendorPoolStrategy: 'Standard Plumber Pool' },
          'False Ceiling': { trade: 'False Ceiling', itemCount: 0, totalQuote: 0, standardQuote: 0, specialisedQuote: 0, vendorPoolStrategy: 'Standard False Ceiling Pool' },
          Painting: { trade: 'Painting', itemCount: 0, totalQuote: 0, standardQuote: 0, specialisedQuote: 0, vendorPoolStrategy: 'Standard Painter Pool' }
        },
        rawLines: []
      });
    }

    const p = pidMap.get(pid);
    p.itemCount++;
    p.totalServicesQuote += preTax;
    if (scopeTag === 'Specialised') {
      p.specialisedScopeQuote += preTax;
    } else {
      p.standardScopeQuote += preTax;
    }

    if (rateRule === 'Rate > ₹2k Override') {
      p.rateOverrideCount++;
      p.rateOverrideQuote += preTax;
    }

    if (p.trades[trade]) {
      p.trades[trade].itemCount++;
      p.trades[trade].totalQuote += preTax;
      if (scopeTag === 'Specialised') {
        p.trades[trade].specialisedQuote += preTax;
        p.trades[trade].vendorPoolStrategy = `Specialist ${trade} Partner Allocation Required`;
      } else {
        p.trades[trade].standardQuote += preTax;
      }
    }

    p.rawLines.push({
      cleanName,
      sku,
      trade,
      unit: 'Qty',
      quantity: qty,
      unitPrice: unitRate,
      preTaxPrice: preTax,
      scopeTag,
      rateRuleFlag: rateRule,
      sourcingAction: pool,
      priceBucket: bucket
    });
  });

  // Club SKUs and format PID summaries
  const pidsArray = [];
  pidMap.forEach(p => {
    // Clubbing
    const clubMap = new Map();
    p.rawLines.forEach(l => {
      const key = `${l.cleanName}||${l.trade}`;
      if (!clubMap.has(key)) {
        clubMap.set(key, {
          name: l.cleanName,
          sku: l.sku,
          trade: l.trade,
          subCategory: l.trade,
          unit: 'Qty',
          quantity: 0,
          preTaxPrice: 0,
          scopeTag: l.scopeTag,
          rateRuleFlag: l.rateRuleFlag,
          sourcingAction: l.sourcingAction,
          lineCount: 0,
          priceBucket: ''
        });
      }
      const c = clubMap.get(key);
      c.quantity += l.quantity;
      c.preTaxPrice += l.preTaxPrice;
      c.lineCount++;
      if (l.scopeTag === 'Specialised') c.scopeTag = 'Specialised';
      if (l.rateRuleFlag === 'Rate > ₹2k Override') c.rateRuleFlag = 'Rate > ₹2k Override';
    });

    const clubbedLineItems = Array.from(clubMap.values()).map(c => {
      c.unitPrice = c.quantity > 0 ? c.preTaxPrice / c.quantity : c.preTaxPrice;
      c.priceBucket = toPriceBucket(c.preTaxPrice);
      return c;
    });

    const hasSpecialist = p.specialisedScopeQuote > 0 || p.rateOverrideCount > 0;
    const policy = hasSpecialist ? 'Specialist Trade Vendor Allocation Required' : 'Standard Contractor Pool Dispatch';
    const gate = hasSpecialist ? 'Pre-10 Dispatch Sign-Off Required' : 'Auto-Approve / Standard Dispatch';

    pidsArray.push({
      projectId: p.projectId,
      city: p.city,
      bu: p.bu,
      vlEmail: p.vlEmail,
      publishedAt: p.publishedAt,
      itemCount: p.itemCount,
      consolidatedSkuCount: clubbedLineItems.length,
      totalServicesQuote: Math.round(p.totalServicesQuote),
      totalBoqBucket: toPriceBucket(p.totalServicesQuote),
      standardScopeQuote: Math.round(p.standardScopeQuote),
      standardScopeBucket: toPriceBucket(p.standardScopeQuote),
      specialisedScopeQuote: Math.round(p.specialisedScopeQuote),
      specialisedScopeBucket: toPriceBucket(p.specialisedScopeQuote),
      rateOverrideCount: p.rateOverrideCount,
      rateOverrideQuote: Math.round(p.rateOverrideQuote),
      rateOverrideBucket: toPriceBucket(p.rateOverrideQuote),
      sourcingAllocationPolicy: policy,
      mandatoryApprovalGate: gate,
      trades: p.trades,
      lineItems: p.rawLines,
      clubbedLineItems
    });
  });

  // Sort by Total Services Quote descending
  pidsArray.sort((a, b) => b.totalServicesQuote - a.totalServicesQuote);

  console.log(`Generated ${pidsArray.length} PIDs with clubbed SKUs and price buckets.`);

  // Portfolio Totals
  const totalConvertedBoQ = pidsArray.reduce((acc, p) => acc + p.totalServicesQuote, 0);
  const totalStandardBoQ = pidsArray.reduce((acc, p) => acc + p.standardScopeQuote, 0);
  const totalSpecialisedBoQ = pidsArray.reduce((acc, p) => acc + p.specialisedScopeQuote, 0);
  const totalRateOverridesCount = pidsArray.reduce((acc, p) => acc + p.rateOverrideCount, 0);
  const totalRateOverridesValue = pidsArray.reduce((acc, p) => acc + p.rateOverrideQuote, 0);

  const cityCounts = {};
  const buCounts = {};
  const tradeTotals = {
    Carpentry: { trade: 'Carpentry', totalQuote: 0, standardQuote: 0, specialisedQuote: 0, vendorPoolStrategy: 'Standard Carpentry Pool' },
    Civil: { trade: 'Civil', totalQuote: 0, standardQuote: 0, specialisedQuote: 0, vendorPoolStrategy: 'Standard Civil Pool' },
    Electrical: { trade: 'Electrical', totalQuote: 0, standardQuote: 0, specialisedQuote: 0, vendorPoolStrategy: 'Standard Electrician Pool' },
    Plumbing: { trade: 'Plumbing', totalQuote: 0, standardQuote: 0, specialisedQuote: 0, vendorPoolStrategy: 'Standard Plumber Pool' },
    'False Ceiling': { trade: 'False Ceiling', totalQuote: 0, standardQuote: 0, specialisedQuote: 0, vendorPoolStrategy: 'Standard False Ceiling Pool' },
    Painting: { trade: 'Painting', totalQuote: 0, standardQuote: 0, specialisedQuote: 0, vendorPoolStrategy: 'Standard Painter Pool' }
  };

  pidsArray.forEach(p => {
    cityCounts[p.city] = cityCounts[p.city] || { count: 0, totalBoQ: 0 };
    cityCounts[p.city].count++;
    cityCounts[p.city].totalBoQ += p.totalServicesQuote;

    buCounts[p.bu] = buCounts[p.bu] || { count: 0, totalBoQ: 0 };
    buCounts[p.bu].count++;
    buCounts[p.bu].totalBoQ += p.totalServicesQuote;

    Object.entries(p.trades).forEach(([t, td]) => {
      if (tradeTotals[t]) {
        tradeTotals[t].totalQuote += td.totalQuote;
        tradeTotals[t].standardQuote += td.standardQuote;
        tradeTotals[t].specialisedQuote += td.specialisedQuote;
        if (td.specialisedQuote > 0) {
          tradeTotals[t].vendorPoolStrategy = `Specialist ${t} Partner Allocation Required`;
        }
      }
    });
  });

  const payload = {
    syncMetadata: {
      syncedAt: new Date().toISOString(),
      sourceSpreadsheetId: SOURCE_SHEET_ID,
      sourceSheetTab: SOURCE_TAB,
      totalSourceRows: cleanRows.length,
      totalPids: pidsArray.length,
      rulesMasterId: SCORING_SHEET_ID,
      priceBuckets: ['Less than 25K', '25-50K', '50K-1L', '1-2L', '2-3L', '3-4L', '4-5L', '5L+']
    },
    portfolio: {
      totalProjects: pidsArray.length,
      totalConvertedBoQ,
      totalBoqBucket: toPriceBucket(totalConvertedBoQ),
      totalStandardBoQ,
      totalStandardBucket: toPriceBucket(totalStandardBoQ),
      totalSpecialisedBoQ,
      totalSpecialisedBucket: toPriceBucket(totalSpecialisedBoQ),
      totalRateOverridesCount,
      totalRateOverridesValue,
      totalRateOverridesBucket: toPriceBucket(totalRateOverridesValue),
      cityCounts,
      buCounts,
      tradeTotals
    },
    pids: pidsArray
  };

  const dataPath = path.join(__dirname, '..', 'lib', 'data', 'pid_governance_data.json');
  fs.writeFileSync(dataPath, JSON.stringify(payload), 'utf8');
  console.log(`Saved clean cache to ${dataPath} (${pidsArray.length} PIDs).`);
  console.log('--- SYNC COMPLETE! ---');
}

run().catch(err => {
  console.error('Fatal error during Inhouse sync:', err);
  process.exit(1);
});
