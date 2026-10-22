const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1Y6HWuxIBP0Cz9JFEHSKo850JxpyMVy18VPg0kvBZUno';
const SHEET_NAME = 'PID_Governance_Audit';
const DATA_PATH = path.join(__dirname, '..', 'lib', 'data', 'pid_governance_data.json');
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');

async function main() {
  console.log('🚀 Starting deployment to Google Sheet tab:', SHEET_NAME);
  const auth = google.auth.fromJSON(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
  const sheets = google.sheets({ version: 'v4', auth });

  const payload = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  const pids = payload.pids;
  console.log(`Loaded ${pids.length} PIDs for sheet deployment.`);

  // 1. Get Sheet ID
  const meta = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheetObj = meta.data.sheets.find(s => s.properties.title === SHEET_NAME);
  const sheetId = sheetObj.properties.sheetId;

  // 2. Build rows data
  const grid = [];

  // Row 1: Main Title
  const r1 = new Array(21).fill('');
  r1[0] = 'LIVSPACE SERVICES — PID GOVERNANCE & VARIATION RISK AUDIT REGISTER';
  grid.push(r1);

  // Row 2: Subtitle
  const r2 = new Array(21).fill('');
  r2[0] = `Audited Baseline: 609 Converted Projects | 12,966 Quote Lines | Source: RFV_Dump-OND26 | Manager Scale [4, 4, 5, 5, 2, 2] | Rate > ₹2k Override Active`;
  grid.push(r2);

  // Row 3: Spacing
  grid.push(new Array(21).fill(''));

  // Rows 4-5: KPI Deck
  const r4 = new Array(21).fill('');
  r4[1] = 'TOTAL CONVERTED SERVICES BOQ';
  r4[4] = 'STANDARD COMMODITY SCOPE';
  r4[7] = 'SPECIALISED ARTISAN SCOPE';
  r4[10] = 'PORTFOLIO TOTAL NRI';
  r4[13] = 'RATE > ₹2k OVERRIDES';
  r4[16] = 'CRITICAL & HIGH RISK PROJECTS';
  grid.push(r4);

  const r5 = new Array(21).fill('');
  r5[1] = '=SUM(F11:F619)';
  r5[4] = '=SUM(G11:G619)';
  r5[7] = '=SUM(H11:H619)';
  r5[10] = '=SUM(M11:M619)';
  r5[13] = '=SUM(J11:J619) & " Items"';
  r5[16] = '=(COUNTIF(N11:N619, "Critical Risk") + COUNTIF(N11:N619, "High Risk")) & " PIDs"';
  grid.push(r5);

  const r6 = new Array(21).fill('');
  r6[1] = 'Across 609 Converted PIDs';
  r6[4] = '=TEXT(E5/B5, "0.0%") & " of total portfolio"';
  r6[7] = '=TEXT(H5/B5, "0.0%") & " of total portfolio"';
  r6[10] = '=TEXT(K5/B5, "0.00") & "x Portfolio Multiplier"';
  r6[13] = '="Total " & TEXT(SUM(K11:K619), "₹#,##0")';
  r6[16] = '=COUNTIF(N11:N619, "Critical Risk") & " Critical | " & COUNTIF(N11:N619, "High Risk") & " High"';
  grid.push(r6);

  // Rows 7-9: Spacing
  grid.push(new Array(21).fill(''));
  grid.push(new Array(21).fill(''));
  grid.push(new Array(21).fill(''));

  // Row 10: Table Headers
  const headers = [
    'Sl.',
    'Project ID (PID)',
    'City',
    'Business Unit (BU)',
    'Item Count',
    'Total Services BoQ (₹)',
    'Standard Scope (₹)',
    'Specialised Scope (₹)',
    'Specialised Share (%)',
    'Rate > ₹2k Count',
    'Rate > ₹2k Value (₹)',
    'Complexity (C̄)',
    'Project Total NRI (₹)',
    'Project Risk Class',
    'Mandatory Approval Gate',
    'Sourcing Allocation Policy',
    'Carpentry NRI (₹)',
    'Civil NRI (₹)',
    'Electrical NRI (₹)',
    'Plumbing NRI (₹)',
    'Ceiling & Paint NRI (₹)'
  ];
  grid.push(headers);

  // Rows 11+: Data
  pids.forEach((p, idx) => {
    const rowNum = 11 + idx;
    const ceilingPaintNri = (p.trades['False Ceiling']?.totalNri || 0) + (p.trades['Painting']?.totalNri || 0);

    const row = [
      idx + 1,
      p.projectId,
      p.city,
      p.bu,
      p.itemCount,
      p.totalServicesQuote,
      p.standardScopeQuote,
      p.specialisedScopeQuote,
      `=IF(F${rowNum}>0, H${rowNum}/F${rowNum}, 0)`,
      p.rateOverrideCount,
      p.rateOverrideQuote,
      p.projectWeightedComplexity,
      p.projectTotalNri,
      `=IF(I${rowNum}>=0.3, "Critical Risk", IF(I${rowNum}>=0.15, "High Risk", IF(I${rowNum}>=0.05, "Medium Risk", "Low Risk")))`,
      `=IF(I${rowNum}>=0.3, "Mandatory VM Approval Required", IF(I${rowNum}>=0.15, "Mandatory VL Sign-Off", "Auto-Approve / Standard Dispatch"))`,
      `=IF(I${rowNum}>=0.3, "Split BoQ: Route Specialised to Specialist Partner Pool; Standard to General Pool", IF(I${rowNum}>=0.15, "General Contractor Pool with Onsite QA checklist", "Standard General Contractor Pool"))`,
      p.trades['Carpentry']?.totalNri || 0,
      p.trades['Civil']?.totalNri || 0,
      p.trades['Electrical']?.totalNri || 0,
      p.trades['Plumbing']?.totalNri || 0,
      ceilingPaintNri
    ];
    grid.push(row);
  });

  // 3. Write data to sheet
  console.log(`Writing ${grid.length} rows to ${SHEET_NAME}!A1:U${grid.length}...`);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!A1:U${grid.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: grid }
  });
  console.log('✅ Grid data written.');

  // 4. Batch format styling
  console.log('Applying Slate & Pearl styling, borders, colors, column widths...');
  const requests = [
    // Ensure grid size
    {
      updateSheetProperties: {
        properties: {
          sheetId,
          gridProperties: {
            rowCount: Math.max(grid.length + 50, 700),
            columnCount: 25,
            frozenRowCount: 10
          }
        },
        fields: 'gridProperties.rowCount,gridProperties.columnCount,gridProperties.frozenRowCount'
      }
    },
    // Merges for Row 1 & 2
    {
      mergeCells: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 21 },
        mergeType: 'MERGE_ALL'
      }
    },
    {
      mergeCells: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 21 },
        mergeType: 'MERGE_ALL'
      }
    },
    // Format Row 1 Title
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 21 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 15/255, green: 23/255, blue: 42/255 }, // #0F172A
            horizontalAlignment: 'LEFT',
            verticalAlignment: 'MIDDLE',
            textFormat: { foregroundColor: { red: 1, green: 1, blue: 1 }, fontSize: 13, bold: true }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    },
    // Format Row 2 Subtitle
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 21 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 30/255, green: 41/255, blue: 59/255 }, // #1E293B
            horizontalAlignment: 'LEFT',
            verticalAlignment: 'MIDDLE',
            textFormat: { foregroundColor: { red: 226/255, green: 232/255, blue: 240/255 }, fontSize: 9 }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    },
    // Merges for KPI Cards (Row 4 to 6)
    // Card 1: B-D
    { mergeCells: { range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 1, endColumnIndex: 4 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 1, endColumnIndex: 4 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 1, endColumnIndex: 4 }, mergeType: 'MERGE_ALL' } },
    // Card 2: E-G
    { mergeCells: { range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 4, endColumnIndex: 7 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 4, endColumnIndex: 7 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 4, endColumnIndex: 7 }, mergeType: 'MERGE_ALL' } },
    // Card 3: H-J
    { mergeCells: { range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 7, endColumnIndex: 10 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 7, endColumnIndex: 10 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 7, endColumnIndex: 10 }, mergeType: 'MERGE_ALL' } },
    // Card 4: K-M
    { mergeCells: { range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 10, endColumnIndex: 13 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 10, endColumnIndex: 13 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 10, endColumnIndex: 13 }, mergeType: 'MERGE_ALL' } },
    // Card 5: N-P
    { mergeCells: { range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 13, endColumnIndex: 16 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 13, endColumnIndex: 16 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 13, endColumnIndex: 16 }, mergeType: 'MERGE_ALL' } },
    // Card 6: Q-S
    { mergeCells: { range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 16, endColumnIndex: 19 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 16, endColumnIndex: 19 }, mergeType: 'MERGE_ALL' } },
    { mergeCells: { range: { sheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 16, endColumnIndex: 19 }, mergeType: 'MERGE_ALL' } },

    // Style Card Titles (Row 4)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 1, endColumnIndex: 19 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 248/255, green: 250/255, blue: 252/255 },
            textFormat: { fontSize: 8, bold: true, foregroundColor: { red: 100/255, green: 116/255, blue: 139/255 } },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    },
    // Style Card Values (Row 5)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 1, endColumnIndex: 19 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 255/255, green: 255/255, blue: 255/255 },
            textFormat: { fontSize: 13, bold: true, foregroundColor: { red: 15/255, green: 23/255, blue: 42/255 } },
            numberFormat: { type: 'CURRENCY', pattern: '₹#,##0' },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,numberFormat,horizontalAlignment,verticalAlignment)'
      }
    },
    // Style Card Subtext (Row 6)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 5, endRowIndex: 6, startColumnIndex: 1, endColumnIndex: 19 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 255/255, green: 255/255, blue: 255/255 },
            textFormat: { fontSize: 8, italic: true, foregroundColor: { red: 100/255, green: 116/255, blue: 139/255 } },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    },

    // Row 10: Table Headers
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 9, endRowIndex: 10, startColumnIndex: 0, endColumnIndex: 21 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 15/255, green: 23/255, blue: 42/255 }, // #0F172A
            textFormat: { foregroundColor: { red: 255/255, green: 255/255, blue: 255/255 }, bold: true, fontSize: 9 },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            wrapStrategy: 'WRAP'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,wrapStrategy)'
      }
    },

    // Data Rows (Row 11 to 619): Alternate shading & alignments
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 10, endRowIndex: grid.length, startColumnIndex: 0, endColumnIndex: 21 },
        cell: {
          userEnteredFormat: {
            textFormat: { fontSize: 9 },
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(textFormat,verticalAlignment)'
      }
    },

    // Number formats for Currency columns (Cols F, G, H, K, M, Q, R, S, T, U)
    ...[5, 6, 7, 10, 12, 16, 17, 18, 19, 20].map(cIdx => ({
      repeatCell: {
        range: { sheetId, startRowIndex: 10, endRowIndex: grid.length, startColumnIndex: cIdx, endColumnIndex: cIdx + 1 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'CURRENCY', pattern: '₹#,##0' },
            horizontalAlignment: 'RIGHT'
          }
        },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)'
      }
    })),

    // Percentage format for Col I (Spec %)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 10, endRowIndex: grid.length, startColumnIndex: 8, endColumnIndex: 9 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'PERCENT', pattern: '0.0%' },
            horizontalAlignment: 'CENTER',
            textFormat: { bold: true }
          }
        },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment,textFormat)'
      }
    },

    // Complexity format for Col L
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 10, endRowIndex: grid.length, startColumnIndex: 11, endColumnIndex: 12 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'NUMBER', pattern: '0.0' },
            horizontalAlignment: 'CENTER',
            textFormat: { bold: true }
          }
        },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment,textFormat)'
      }
    },

    // Alignments for Sl (0), PID (1), BU (3), Risk Class (13)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 10, endRowIndex: grid.length, startColumnIndex: 0, endColumnIndex: 2 },
        cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat(horizontalAlignment)'
      }
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 10, endRowIndex: grid.length, startColumnIndex: 3, endColumnIndex: 4 },
        cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat(horizontalAlignment)'
      }
    },
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 10, endRowIndex: grid.length, startColumnIndex: 13, endColumnIndex: 14 },
        cell: { userEnteredFormat: { horizontalAlignment: 'CENTER' } },
        fields: 'userEnteredFormat(horizontalAlignment)'
      }
    },

    // Conditional formatting for Risk Class in Col N
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 10, endRowIndex: grid.length, startColumnIndex: 13, endColumnIndex: 14 }],
          booleanRule: {
            condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Critical Risk' }] },
            format: {
              backgroundColor: { red: 254/255, green: 226/255, blue: 226/255 },
              textFormat: { foregroundColor: { red: 153/255, green: 27/255, blue: 27/255 }, bold: true }
            }
          }
        },
        index: 0
      }
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 10, endRowIndex: grid.length, startColumnIndex: 13, endColumnIndex: 14 }],
          booleanRule: {
            condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'High Risk' }] },
            format: {
              backgroundColor: { red: 254/255, green: 243/255, blue: 199/255 },
              textFormat: { foregroundColor: { red: 146/255, green: 64/255, blue: 14/255 }, bold: true }
            }
          }
        },
        index: 1
      }
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 10, endRowIndex: grid.length, startColumnIndex: 13, endColumnIndex: 14 }],
          booleanRule: {
            condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Medium Risk' }] },
            format: {
              backgroundColor: { red: 219/255, green: 234/255, blue: 254/255 },
              textFormat: { foregroundColor: { red: 30/255, green: 64/255, blue: 175/255 }, bold: true }
            }
          }
        },
        index: 2
      }
    },
    {
      addConditionalFormatRule: {
        rule: {
          ranges: [{ sheetId, startRowIndex: 10, endRowIndex: grid.length, startColumnIndex: 13, endColumnIndex: 14 }],
          booleanRule: {
            condition: { type: 'TEXT_EQ', values: [{ userEnteredValue: 'Low Risk' }] },
            format: {
              backgroundColor: { red: 220/255, green: 252/255, blue: 231/255 },
              textFormat: { foregroundColor: { red: 22/255, green: 101/255, blue: 52/255 }, bold: true }
            }
          }
        },
        index: 3
      }
    },

    // Column widths
    ...[
      { c: 0, w: 45 },  // Sl
      { c: 1, w: 90 },  // PID
      { c: 2, w: 105 }, // City
      { c: 3, w: 90 },  // BU
      { c: 4, w: 65 },  // Items
      { c: 5, w: 125 }, // Total BoQ
      { c: 6, w: 120 }, // Standard
      { c: 7, w: 120 }, // Spec
      { c: 8, w: 85 },  // Spec %
      { c: 9, w: 80 },  // Rate>2k count
      { c: 10, w: 110 },// Rate>2k value
      { c: 11, w: 85 }, // Complexity
      { c: 12, w: 125 },// Total NRI
      { c: 13, w: 115 },// Risk Class
      { c: 14, w: 220 },// Gate
      { c: 15, w: 260 },// Sourcing
      { c: 16, w: 105 },// Carpentry NRI
      { c: 17, w: 105 },// Civil NRI
      { c: 18, w: 105 },// Electrical NRI
      { c: 19, w: 105 },// Plumbing NRI
      { c: 20, w: 120 } // Ceiling & Paint NRI
    ].map(item => ({
      updateDimensionProperties: {
        range: { sheetId, dimension: 'COLUMNS', startIndex: item.c, endIndex: item.c + 1 },
        properties: { pixelSize: item.w },
        fields: 'pixelSize'
      }
    }))
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests }
  });
  console.log('✅ Google Sheets Tab Deployment Complete!');
}

main().catch(err => {
  console.error('❌ Deployment error:', err);
  process.exit(1);
});
