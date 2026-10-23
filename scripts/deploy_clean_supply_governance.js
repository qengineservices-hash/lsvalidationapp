const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
const SPREADSHEET_ID = '1Y6HWuxIBP0Cz9JFEHSKo850JxpyMVy18VPg0kvBZUno';
const SHEET_NAME = 'RFV_Dump-OND26';
const SCORING_MASTER_ID = '1oG4vMvJyZey0XlCOdqhreP4ki3fTUhpAdFLIFds2_Jo';

async function main() {
  console.log('🚀 Step 1: Upgrading RFV_Dump-OND26 to 27 columns with Clean SKU names and Scope...');
  const auth = google.auth.fromJSON(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
  const sheets = google.sheets({ version: 'v4', auth });

  // 1. Get sheet metadata
  const metaRes = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = metaRes.data.sheets.find(s => s.properties.title === SHEET_NAME);
  if (!sheet) throw new Error(`Sheet ${SHEET_NAME} not found!`);
  const sheetId = sheet.properties.sheetId;
  const currentCols = sheet.properties.gridProperties.columnCount;
  console.log(`Current grid: ${sheet.properties.gridProperties.rowCount} rows x ${currentCols} columns`);

  // Ensure grid has 27 columns (A to AA)
  if (currentCols < 27) {
    const colsToAdd = 27 - currentCols;
    console.log(`Adding ${colsToAdd} columns to reach 27 columns (A to AA)...`);
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            appendDimension: {
              sheetId,
              dimension: 'COLUMNS',
              length: colsToAdd
            }
          }
        ]
      }
    });
    console.log('✅ Grid expanded to 27 columns!');
  }

  // 2. Fetch Active Rubric & Old MRC
  console.log('Fetching Active Rubric from Scoring Master...');
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
      const ci = parseFloat(r[13]) || 2;
      if (name && name.trim()) {
        const cleanK = name.trim().toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
        activeRubricMap.set(cleanK, { trade: trade || 'Carpentry', scope: scope || 'Standard', ci });
        activeRubricMap.set(name.trim().toLowerCase(), { trade: trade || 'Carpentry', scope: scope || 'Standard', ci });
      }
    });
  }

  console.log('Fetching OLD MRC from Scoring Master...');
  const oldMrcRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SCORING_MASTER_ID,
    range: "'OLD MRC'!F5:J"
  });
  const oldMrcMap = new Map();
  if (oldMrcRes.data.values) {
    oldMrcRes.data.values.forEach(r => {
      const trade = r[0];
      const name = r[4];
      if (name && name.trim()) {
        const cleanK = name.trim().toLowerCase().replace(/[-_]/g, ' ').replace(/\s+/g, ' ');
        oldMrcMap.set(cleanK, trade || 'Civil');
        oldMrcMap.set(name.trim().toLowerCase(), trade || 'Civil');
      }
    });
  }

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

  const tradeWeights = {
    Carpentry: 4.0,
    Civil: 4.0,
    Electrical: 5.0,
    Plumbing: 5.0,
    'False Ceiling': 2.0,
    Painting: 2.0
  };

  const tradeSourcing = {
    Carpentry: {
      specialist: 'Specialist Carpentry Partner (Duco/PU/Veneer qualified)',
      standard: 'General Carpentry Contractor Pool'
    },
    Civil: {
      specialist: 'Specialist Civil Contractor (Waterproofing / Precision Masonry)',
      standard: 'General Civil Contractor Pool'
    },
    Electrical: {
      specialist: 'Specialist Electrical Contractor (Automation / Heavy Load)',
      standard: 'Standard Electrician Pool'
    },
    Plumbing: {
      specialist: 'Specialist Plumbing Partner (Thermostat / Concealed Loop)',
      standard: 'Standard Plumber Pool'
    },
    'False Ceiling': {
      specialist: 'Specialist Ceiling Partner (Curved / Wooden / PVC)',
      standard: 'Standard False Ceiling Pool'
    },
    Painting: {
      specialist: 'Specialist Texture Applicator (Asian Archi / Concrete qualified)',
      standard: 'Standard Painter Pool'
    }
  };

  // Precise Specialised Keywords (inspected on Item Title / Inclusions only)
  const f1SpecialisedTitleRegex = new RegExp(
    'duco|pu finish|\\bpu\\b|veneer|melamine|cnc|marble|polish|waterproof|thermostat|body jet|archi|texture|exterior|camouflage|inlay|epoxy|brickbat|coba|fluted|charcoal|acoustic|lacquered|bevelled|tinted glass|smart switch|heavy load|ac piping|chandel',
    'i'
  );

  const areaUoms = ['sqft', 'rft', 'sq ft', 'r ft', 'sq.ft', 'r.ft', 'sqft.'];
  const AREA_RATE_THRESHOLD = 2000;

  // 3. Fetch RFV Converted Quotes row-by-row
  console.log('Fetching raw quotes (A2:S)...');
  const rfvRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:S`
  });

  const rfvRows = rfvRes.data.values || [];
  const dataRows = rfvRows.slice(1);
  console.log(`Retrieved ${dataRows.length} raw quote line items.`);

  // Headers for Row 2 (T2:AA2)
  const headerCols = [
    'Clean SKU Name',               // Col T (Col20)
    'Trade (Super Category)',        // Col U (Col21)
    'Scope Tag',                    // Col V (Col22)
    'Rate Rule Flag',               // Col W (Col23)
    'Supply Sourcing Allocation Pool',// Col X (Col24)
    'Trade Weight (W_t)',           // Col Y (Col25)
    'Line NRI (₹)',                 // Col Z (Col26)
    'Complexity (C_i)'              // Col AA (Col27)
  ];

  const writeRows = [headerCols];

  for (let idx = 0; idx < dataRows.length; idx++) {
    const r = dataRows[idx];
    const rawName = r[3] || '';
    const qty = parseFloat(r[4]) || 0;
    const unit = (r[5] || '').trim();
    const unitPrice = parseFloat(r[6]) || 0;
    const preTaxPrice = parseFloat(r[8]) || (qty * unitPrice);
    const df = r[10] || '';

    // Strip [SKU] tag and newlines to get clean item name
    const cleanName = rawName.replace(/\[[A-Z0-9]+\]/gi, '').trim().replace(/\n/g, ' ');
    const cleanNameLower = cleanName.toLowerCase();
    const cleanKey = cleanNameLower.replace(/[-_]/g, ' ').replace(/\s+/g, ' ');

    let dfTrade = '';
    if (df) {
      const tm = df.match(/Super Category\s*:\s*([^\r\n]+)/i);
      if (tm) dfTrade = tm[1].trim();
    }

    let trade = 'Civil';
    let baseScope = 'Standard';
    let complexityScore = 2;

    if (activeRubricMap.has(cleanKey) || activeRubricMap.has(cleanNameLower)) {
      const entry = activeRubricMap.get(cleanKey) || activeRubricMap.get(cleanNameLower);
      trade = normalizeTrade(entry.trade);
      baseScope = entry.scope.toLowerCase().includes('spec') ? 'Specialised' : 'Standard';
      complexityScore = entry.ci || 2;
    } else if (oldMrcMap.has(cleanKey) || oldMrcMap.has(cleanNameLower)) {
      trade = normalizeTrade(oldMrcMap.get(cleanKey) || oldMrcMap.get(cleanNameLower));
      // Keyword matching on Item Title ONLY (ignoring exclusions)
      if (f1SpecialisedTitleRegex.test(cleanName)) {
        baseScope = 'Specialised';
        complexityScore = 3;
      } else {
        baseScope = 'Standard';
        complexityScore = 2;
      }
    } else if (dfTrade) {
      trade = normalizeTrade(dfTrade);
      if (f1SpecialisedTitleRegex.test(cleanName)) {
        baseScope = 'Specialised';
        complexityScore = 3;
      } else {
        baseScope = 'Standard';
        complexityScore = 2;
      }
    } else {
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

    let sourcingPool = tradeSourcing[trade]?.standard || 'General Contractor Pool';
    if (finalScope === 'Specialised') {
      sourcingPool = tradeSourcing[trade]?.specialist || 'Specialist Partner Pool';
    }

    writeRows.push([
      cleanName,
      trade,
      finalScope,
      rateRuleFlag,
      sourcingPool,
      tradeWeight,
      lineNri,
      complexityScore
    ]);
  }

  console.log(`Writing ${writeRows.length} rows to T2:AA${writeRows.length + 1}...`);
  const chunkSize = 4000;
  for (let i = 0; i < writeRows.length; i += chunkSize) {
    const chunk = writeRows.slice(i, i + chunkSize);
    const startRow = 2 + i;
    const endRow = startRow + chunk.length - 1;
    const range = `'${SHEET_NAME}'!T${startRow}:AA${endRow}`;
    console.log(`Writing chunk ${Math.floor(i / chunkSize) + 1}: ${range} (${chunk.length} rows)...`);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: chunk }
    });
  }

  // Format headers
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 19, endColumnIndex: 27 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.12, green: 0.16, blue: 0.22 },
                textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, bold: true, fontSize: 10 },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        }
      ]
    }
  });

  console.log('✅ RFV_Dump-OND26 successfully updated with Clean SKU names and Title-only Scope!');
}

main().catch(err => {
  console.error('❌ Error executing update:', err);
  process.exit(1);
});
