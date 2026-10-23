const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
const SPREADSHEET_ID = '1Y6HWuxIBP0Cz9JFEHSKo850JxpyMVy18VPg0kvBZUno';
const SHEET_NAME = 'RFV_Dump-OND26';
const SCORING_MASTER_ID = '1oG4vMvJyZey0XlCOdqhreP4ki3fTUhpAdFLIFds2_Jo';

async function main() {
  console.log('🚀 Step 1: Connecting to Google Sheets API...');
  const auth = google.auth.fromJSON(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
  const sheets = google.sheets({ version: 'v4', auth });

  // 1. Get sheet info to find sheetId and current dimensions
  console.log('Fetching sheet metadata for', SHEET_NAME);
  const metaRes = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID
  });

  const sheet = metaRes.data.sheets.find(s => s.properties.title === SHEET_NAME);
  if (!sheet) {
    throw new Error(`Sheet ${SHEET_NAME} not found!`);
  }

  const sheetId = sheet.properties.sheetId;
  const currentCols = sheet.properties.gridProperties.columnCount;
  const currentRows = sheet.properties.gridProperties.rowCount;
  console.log(`Current grid: ${currentRows} rows x ${currentCols} columns (sheetId: ${sheetId})`);

  // If columnCount < 26, expand to 26 columns (A-Z)
  if (currentCols < 26) {
    const colsToAdd = 26 - currentCols;
    console.log(`Expanding grid by ${colsToAdd} columns to reach 26 columns (A to Z)...`);
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
    console.log('✅ Grid expanded successfully to 26 columns!');
  } else {
    console.log('Grid already has at least 26 columns.');
  }

  // 2. Fetch Active Rubric & Old MRC for 100% accurate classification
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
      const ci = parseFloat(r[13]) || 2; // Col O
      if (name && name.trim()) {
        activeRubricMap.set(name.trim().toLowerCase(), {
          trade: trade || 'Carpentry',
          scope: scope || 'Standard',
          ci
        });
      }
    });
  }
  console.log(`Loaded ${activeRubricMap.size} Active Rubric items.`);

  console.log('Fetching OLD MRC from Scoring Master...');
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
        oldMrcMap.set(name.trim().toLowerCase(), trade || 'Civil');
      }
    });
  }
  console.log(`Loaded ${oldMrcMap.size} OLD MRC items.`);

  // 3. Trade weights & configs
  const tradeWeights = {
    Carpentry: 4.0,
    Civil: 4.0,
    Electrical: 5.0,
    Plumbing: 5.0,
    'False Ceiling': 2.0,
    Painting: 2.0
  };

  const tradeConfigs = {
    Carpentry: {
      specialistVendor: 'Specialist Carpentry Partner (Duco/PU/Veneer qualified)',
    },
    Civil: {
      specialistVendor: 'Specialist Civil Contractor (Waterproofing / Precision Masonry)',
    },
    Electrical: {
      specialistVendor: 'Specialist Electrical Contractor (Heavy Load / Automation)',
    },
    Plumbing: {
      specialistVendor: 'Specialist Plumbing Partner (Thermostat / Concealed Loop qualified)',
    },
    'False Ceiling': {
      specialistVendor: 'Specialist Ceiling Partner (Curved / Wooden / Trap door)',
    },
    Painting: {
      specialistVendor: 'Specialist Texture Applicator (Asian Archi / Concrete qualified)',
    },
  };

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

  const f1Regex = new RegExp('duco|pu finish|\\bpu\\b|veneer|melamine|cnc|marble|polish|waterproof|thermostat|body jet|archi|texture|exterior|camouflage|inlay|epoxy|brickbat|coba|fluted|charcoal|acoustic|lacquered', 'i');
  const f2Regex = new RegExp('core cutting|polishing|chiselling|epoxy|gala cutting|profile light|track light|duco|booth|diamond|groov|router', 'i');
  const f3Regex = new RegExp('rcc|mivan|tight spaces|exterior|external|punning\\(with mesh\\)|complete toilet internal', 'i');

  const areaUoms = ['sqft', 'rft', 'sq ft', 'r ft', 'sq.ft', 'r.ft', 'sqft.'];
  const AREA_RATE_THRESHOLD = 2000;

  // 4. Fetch RFV Converted Quotes row-by-row
  console.log('Fetching RFV Converted Quotes (A2:S)...');
  const rfvRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A2:S`
  });

  const rfvRows = rfvRes.data.values || [];
  const dataRows = rfvRows.slice(1);
  console.log(`Retrieved ${dataRows.length} raw quote line items.`);

  // Headers for Row 2 (T2:Z2)
  const headerCols = [
    'Super Category',
    'Scope Tag',
    'Complexity (C_i)',
    'Trade Weight (W_t)',
    'Line NRI (₹)',
    'Rate Rule Flag',
    'Mandatory Sourcing Action'
  ];

  const writeRows = [headerCols];

  for (let idx = 0; idx < dataRows.length; idx++) {
    const r = dataRows[idx];
    const projectId = (r[1] || '').trim();
    const rawName = r[3] || '';
    const qty = parseFloat(r[4]) || 0;
    const unit = (r[5] || '').trim();
    const unitPrice = parseFloat(r[6]) || 0;
    const preTaxPrice = parseFloat(r[8]) || (qty * unitPrice);
    const df = r[10] || '';
    const specs = r[11] || '';

    const cleanName = rawName.replace(/\[[A-Z0-9]+\]/gi, '').trim().replace(/\n/g, ' ');
    const cleanNameLower = cleanName.toLowerCase();

    let dfTrade = '';
    let dfSubCat = '';
    if (df) {
      const tm = df.match(/Super Category\s*:\s*([^\r\n]+)/i);
      if (tm) dfTrade = tm[1].trim();
      const sc = df.match(/Sub Super Category\s*:\s*([^\r\n]+)/i);
      if (sc) dfSubCat = sc[1].trim();
    }

    const fullText = `${cleanName} ${df} ${specs}`;
    const f1 = f1Regex.test(fullText) ? 1 : 0;
    const f2 = f2Regex.test(fullText) ? 1 : 0;
    const f3 = f3Regex.test(fullText) ? 1 : 0;

    let trade = 'Civil';
    let baseScope = 'Standard';
    let complexityScore = 2;

    if (activeRubricMap.has(cleanNameLower)) {
      const entry = activeRubricMap.get(cleanNameLower);
      trade = normalizeTrade(entry.trade);
      baseScope = entry.scope.toLowerCase().includes('spec') ? 'Specialised' : 'Standard';
      complexityScore = entry.ci || 2;
    } else if (oldMrcMap.has(cleanNameLower)) {
      trade = normalizeTrade(oldMrcMap.get(cleanNameLower));
      if (f1 === 1 || f1 + f2 + f3 >= 2) {
        baseScope = 'Specialised';
        complexityScore = Math.max(3, f1 + f2 + f3 + 1);
      } else {
        baseScope = 'Standard';
        complexityScore = 2;
      }
    } else if (dfTrade) {
      trade = normalizeTrade(dfTrade);
      if (f1 === 1 || f1 + f2 + f3 >= 2) {
        baseScope = 'Specialised';
        complexityScore = Math.max(3, f1 + f2 + f3 + 1);
      } else {
        baseScope = 'Standard';
        complexityScore = 2;
      }
    } else {
      trade = normalizeTrade(cleanName);
      if (f1 === 1 || f1 + f2 + f3 >= 2) {
        baseScope = 'Specialised';
        complexityScore = Math.max(3, f1 + f2 + f3 + 1);
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

    writeRows.push([
      trade,
      finalScope,
      complexityScore,
      tradeWeight,
      lineNri,
      rateRuleFlag,
      sourcingAction
    ]);
  }

  console.log(`Generated ${writeRows.length} rows to write to T2:Z${writeRows.length + 1}...`);

  // Write in chunks of 4,000 rows
  const chunkSize = 4000;
  for (let i = 0; i < writeRows.length; i += chunkSize) {
    const chunk = writeRows.slice(i, i + chunkSize);
    const startRow = 2 + i;
    const endRow = startRow + chunk.length - 1;
    const range = `'${SHEET_NAME}'!T${startRow}:Z${endRow}`;
    console.log(`Writing chunk ${Math.floor(i / chunkSize) + 1}: ${range} (${chunk.length} rows)...`);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: chunk }
    });
  }

  console.log('🎨 Applying Slate & Pearl styling to headers and columns...');
  // Format T2:Z2 header
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 1, // Row 2
              endRowIndex: 2,
              startColumnIndex: 19, // Col T
              endColumnIndex: 26  // Col Z
            },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.12, green: 0.16, blue: 0.22 }, // Dark Slate #1e293b
                textFormat: {
                  foregroundColor: { red: 1, green: 1, blue: 1 },
                  bold: true,
                  fontSize: 10
                },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        },
        // Currency formatting on Col X (index 23)
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 2,
              endRowIndex: writeRows.length + 1,
              startColumnIndex: 23,
              endColumnIndex: 24
            },
            cell: {
              userEnteredFormat: {
                numberFormat: {
                  type: 'CURRENCY',
                  pattern: '[$₹-3441] #,##0'
                },
                horizontalAlignment: 'RIGHT'
              }
            },
            fields: 'userEnteredFormat(numberFormat,horizontalAlignment)'
          }
        },
        // Decimal / Center formatting on Col V & W (indices 21 & 22)
        {
          repeatCell: {
            range: {
              sheetId,
              startRowIndex: 2,
              endRowIndex: writeRows.length + 1,
              startColumnIndex: 21,
              endColumnIndex: 23
            },
            cell: {
              userEnteredFormat: {
                horizontalAlignment: 'CENTER'
              }
            },
            fields: 'userEnteredFormat(horizontalAlignment)'
          }
        }
      ]
    }
  });

  console.log('✅ ALL audited columns T:Z successfully added and formatted in RFV_Dump-OND26!');
}

main().catch(err => {
  console.error('❌ Error executing script:', err);
  process.exit(1);
});
