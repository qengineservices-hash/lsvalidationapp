const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
const SPREADSHEET_ID = '1Y6HWuxIBP0Cz9JFEHSKo850JxpyMVy18VPg0kvBZUno';
const TAB_NAME = 'PID_Governance_Report';

async function main() {
  console.log('🚀 Deploying Simplified Supply Tab to PID_Governance_Report...');
  const auth = google.auth.fromJSON(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
  const sheets = google.sheets({ version: 'v4', auth });

  const metaRes = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = metaRes.data.sheets.find(s => s.properties.title === TAB_NAME);
  if (!sheet) throw new Error(`Sheet ${TAB_NAME} not found!`);
  const sheetId = sheet.properties.sheetId;

  // Unmerge any old merges and clear
  console.log('Clearing old ranges...');
  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${TAB_NAME}'!A1:Z500`
  });

  // 1. Column Widths
  const colWidths = [
    { start: 0, end: 1, width: 25 },   // A: Spacing
    { start: 1, end: 2, width: 340 },  // B: SKU / Item Description / Trade
    { start: 2, end: 3, width: 150 },  // C: PID input / Super Category
    { start: 3, end: 4, width: 90 },   // D: UOM / Metadata
    { start: 4, end: 5, width: 120 },  // E: Consolidated Qty / Standard BoQ
    { start: 5, end: 6, width: 130 },  // F: Blended Rate / Spec BoQ
    { start: 6, end: 7, width: 150 },  // G: Total BoQ / Sourcing
    { start: 7, end: 8, width: 120 },  // H: Scope Tag
    { start: 8, end: 9, width: 160 },  // I: Rate Rule Flag
    { start: 9, end: 10, width: 320 }, // J: Supply Sourcing Allocation Pool
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: colWidths.map(c => ({
        updateDimensionProperties: {
          range: { sheetId, dimension: 'COLUMNS', startIndex: c.start, endIndex: c.end },
          properties: { pixelSize: c.width },
          fields: 'pixelSize'
        }
      }))
    }
  });

  // 2. Prepare Payload
  const valuesPayload = [
    // Row 1
    [],
    // Row 2: Header
    [
      '',
      'LIVSPACE SERVICES — SUPPLY OPERATIONS & CONTRACTOR ALLOCATION',
      '',
      '',
      '',
      '',
      '',
      '',
      'SYSTEM: SUPPLY ENGINE v2.5'
    ],
    // Row 3: Subtitle
    [
      '',
      'Consolidated Project Scope, Trade Allocation, and Subcontractor Routing'
    ],
    // Row 4: Interactive Input & Metadata
    [
      '',
      'SELECT / ENTER PID:',
      '4796410',
      'City:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$C$11:$C$619, "-"), "-")',
      'Business Unit:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$D$11:$D$619, "Vesta"), "Vesta")',
      'Order Status:',
      '=IFERROR(XLOOKUP($C$4, \'RFV_Dump-OND26\'!$B$3:$B, \'RFV_Dump-OND26\'!$P$3:$P, "CONVERTED"), "CONVERTED")',
      'Consolidated SKUs:',
      '=IFERROR(COUNTA(B27:B), 0)'
    ],
    // Row 5: Metadata Row 2
    [
      '',
      'Input Guidance:',
      'Pick dropdown or type PID',
      'Order Published:',
      '=IFERROR(XLOOKUP($C$4, \'RFV_Dump-OND26\'!$B$3:$B, \'RFV_Dump-OND26\'!$R$3:$R, "-"), "-")',
      'VL Lead Email:',
      '=IFERROR(XLOOKUP($C$4, \'RFV_Dump-OND26\'!$B$3:$B, \'RFV_Dump-OND26\'!$O$3:$O, "-"), "-")',
      'Sourcing Policy:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$P$11:$P$619, "General Contractor Pool"), "General Contractor Pool")'
    ],
    // Row 6: Blank
    [],
    // Row 7: TIER 1 Header
    [
      '',
      'TIER 1: SUPPLY SOURCING & FINANCIAL ALLOCATION'
    ],
    // Row 8: KPI Card Titles (4 Clean Cards: Total BoQ, Standard Scope, Specialised Scope, Rate > 2k Overrides)
    [
      '',
      'TOTAL SERVICES BOQ',
      '',
      'STANDARD SERVICES SCOPE',
      '',
      'SPECIALISED SERVICES SCOPE',
      '',
      'RATE > ₹2K OVERRIDES',
      ''
    ],
    // Row 9: KPI Card Values
    [
      '',
      '=IFERROR(SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4), 0)',
      '',
      '=IFERROR(SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$V$3:$V, "Standard"), 0)',
      '',
      '=IFERROR(SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$V$3:$V, "Specialised"), 0)',
      '',
      '=IFERROR(SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$W$3:$W, "Rate > ₹2k Override"), 0)',
      ''
    ],
    // Row 10: KPI Card Footers
    [
      '',
      'All Quoted Services Scope',
      '',
      'General Contractor Pool Scope',
      '',
      'Specialist Partner Pool Scope',
      '',
      'SqFt / RFt > ₹2,000 Threshold',
      ''
    ],
    // Row 11: Governance Controls Strip (Clean & Simple)
    [
      '',
      'Approval Authority Gate:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$O$11:$O$619, "Auto-Approve"), "Auto-Approve")',
      '',
      'Supply Sourcing Policy:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$P$11:$P$619, "General Contractor Pool"), "General Contractor Pool")',
      '',
      '',
      ''
    ],
    // Row 12: Blank
    [],
    // Row 13: TIER 2 Header
    [
      '',
      'TIER 2: TRADE-LEVEL SUPPLY ALLOCATION MATRIX (6 TRADES)'
    ],
    // Row 14: Tier 2 Headers
    [
      '',
      'Trade (Super Category)',
      'Lines',
      'Total Quoted BoQ (₹)',
      'Standard Scope (₹)',
      'Specialised Scope (₹)',
      'Supply Partner Pool Sourcing Strategy'
    ],
    // Row 15: Carpentry
    [
      '',
      'Carpentry',
      '=COUNTIFS(\'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B15)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B15)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B15, \'RFV_Dump-OND26\'!$V$3:$V, "Standard")',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B15, \'RFV_Dump-OND26\'!$V$3:$V, "Specialised")',
      '=IF(F15>0, "Specialist Carpentry Partner (Duco/PU/Veneer qualified)", IF(D15>0, "General Carpentry Contractor Pool", "No Scope"))'
    ],
    // Row 16: Civil
    [
      '',
      'Civil',
      '=COUNTIFS(\'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B16)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B16)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B16, \'RFV_Dump-OND26\'!$V$3:$V, "Standard")',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B16, \'RFV_Dump-OND26\'!$V$3:$V, "Specialised")',
      '=IF(F16>0, "Specialist Civil Contractor (Waterproofing / Precision Masonry)", IF(D16>0, "General Civil Contractor Pool", "No Scope"))'
    ],
    // Row 17: Electrical
    [
      '',
      'Electrical',
      '=COUNTIFS(\'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B17)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B17)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B17, \'RFV_Dump-OND26\'!$V$3:$V, "Standard")',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B17, \'RFV_Dump-OND26\'!$V$3:$V, "Specialised")',
      '=IF(F17>0, "Specialist Electrical Contractor (Automation / Heavy Load)", IF(D17>0, "Standard Electrician Pool", "No Scope"))'
    ],
    // Row 18: Plumbing
    [
      '',
      'Plumbing',
      '=COUNTIFS(\'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B18)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B18)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B18, \'RFV_Dump-OND26\'!$V$3:$V, "Standard")',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B18, \'RFV_Dump-OND26\'!$V$3:$V, "Specialised")',
      '=IF(F18>0, "Specialist Plumbing Partner (Thermostat / Concealed Loop)", IF(D18>0, "Standard Plumber Pool", "No Scope"))'
    ],
    // Row 19: False Ceiling
    [
      '',
      'False Ceiling',
      '=COUNTIFS(\'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B19)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B19)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B19, \'RFV_Dump-OND26\'!$V$3:$V, "Standard")',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B19, \'RFV_Dump-OND26\'!$V$3:$V, "Specialised")',
      '=IF(F19>0, "Specialist Ceiling Partner (Curved / Wooden / PVC)", IF(D19>0, "Standard False Ceiling Pool", "No Scope"))'
    ],
    // Row 20: Painting
    [
      '',
      'Painting',
      '=COUNTIFS(\'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B20)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B20)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B20, \'RFV_Dump-OND26\'!$V$3:$V, "Standard")',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$U$3:$U, B20, \'RFV_Dump-OND26\'!$V$3:$V, "Specialised")',
      '=IF(F20>0, "Specialist Texture Applicator (Asian Archi / Concrete qualified)", IF(D20>0, "Standard Painter Pool", "No Scope"))'
    ],
    // Row 21: Trade Total Rollup
    [
      '',
      'Total Project Scope',
      '=SUM(C15:C20)',
      '=SUM(D15:D20)',
      '=SUM(E15:E20)',
      '=SUM(F15:F20)',
      'Consolidated Supply Sourcing Allocation'
    ],
    // Row 22: Blank
    [],
    // Row 23: TIER 3 Header Banner
    [
      '',
      'TIER 3: CONSOLIDATED SKU ALLOCATION REGISTER (CLUBBED BY SKU)'
    ],
    // Row 24: Subtitle note
    [
      '',
      'Multiple quotation lines of identical SKUs across rooms/elevations are consolidated into single aggregated lines with summed quantities and blended rates.'
    ],
    // Row 25: Tier 3 Table Headers
    [
      '',
      'SKU / Item Description',
      'Trade (Super Category)',
      'UOM',
      'Consolidated Qty',
      'Blended Unit Rate (₹)',
      'Total Quoted BoQ (₹)',
      'Scope Tag',
      'Rate Rule Flag',
      'Supply Sourcing Allocation Pool'
    ],
    // Row 26: The Dynamic QUERY Formula (Clubbing identical SKUs!)
    [
      '',
      '=IFERROR(QUERY(\'RFV_Dump-OND26\'!A2:AA, "select Col20, Col21, Col6, sum(Col5), sum(Col9)/sum(Col5), sum(Col9), Col22, Col23, Col24 where Col2 = " & $C$4 & " group by Col20, Col21, Col6, Col22, Col23, Col24 label sum(Col5) \'\', sum(Col9)/sum(Col5) \'\', sum(Col9) \'\'", 0), {"No quotation lines found for this PID", "", "", "", "", "", "", "", ""})'
    ]
  ];

  console.log(`Writing ${valuesPayload.length} rows to "${TAB_NAME}"!A1:Z${valuesPayload.length}...`);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${TAB_NAME}'!A1:Z${valuesPayload.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: valuesPayload }
  });

  // 3. Dropdown on C4
  console.log('Setting Data Validation dropdown on cell C4...');
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          setDataValidation: {
            range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 2, endColumnIndex: 3 },
            rule: {
              condition: {
                type: 'ONE_OF_RANGE',
                values: [{ userEnteredValue: "='PID_Governance_Audit'!$B$11:$B$619" }]
              },
              inputMessage: 'Select a converted Project ID (PID) to inspect its Supply scope.',
              strict: false,
              showCustomUi: true
            }
          }
        }
      ]
    }
  });

  // 4. Formatting
  console.log('Applying Slate & Pearl Executive Styling...');
  const cardMerges = [
    // Banner 1: B7:I7
    { startRowIndex: 6, endRowIndex: 7, startColumnIndex: 1, endColumnIndex: 9 },
    // Card 1: B8:C8, B9:C9, B10:C10
    { startRowIndex: 7, endRowIndex: 8, startColumnIndex: 1, endColumnIndex: 3 },
    { startRowIndex: 8, endRowIndex: 9, startColumnIndex: 1, endColumnIndex: 3 },
    { startRowIndex: 9, endRowIndex: 10, startColumnIndex: 1, endColumnIndex: 3 },
    // Card 2: D8:E8, D9:E9, D10:E10
    { startRowIndex: 7, endRowIndex: 8, startColumnIndex: 3, endColumnIndex: 5 },
    { startRowIndex: 8, endRowIndex: 9, startColumnIndex: 3, endColumnIndex: 5 },
    { startRowIndex: 9, endRowIndex: 10, startColumnIndex: 3, endColumnIndex: 5 },
    // Card 3: F8:G8, F9:G9, F10:G10
    { startRowIndex: 7, endRowIndex: 8, startColumnIndex: 5, endColumnIndex: 7 },
    { startRowIndex: 8, endRowIndex: 9, startColumnIndex: 5, endColumnIndex: 7 },
    { startRowIndex: 9, endRowIndex: 10, startColumnIndex: 5, endColumnIndex: 7 },
    // Card 4: H8:I8, H9:I9, H10:I10
    { startRowIndex: 7, endRowIndex: 8, startColumnIndex: 7, endColumnIndex: 9 },
    { startRowIndex: 8, endRowIndex: 9, startColumnIndex: 7, endColumnIndex: 9 },
    { startRowIndex: 9, endRowIndex: 10, startColumnIndex: 7, endColumnIndex: 9 },
    // Control Strip Row 11:
    { startRowIndex: 10, endRowIndex: 11, startColumnIndex: 2, endColumnIndex: 4 },
    { startRowIndex: 10, endRowIndex: 11, startColumnIndex: 5, endColumnIndex: 9 }
  ];

  const formatRequests = [
    // Unmerge existing merges first
    {
      unmergeCells: {
        range: {
          sheetId,
          startRowIndex: 0,
          endRowIndex: 50,
          startColumnIndex: 0,
          endColumnIndex: 20
        }
      }
    },
    // Merges
    ...cardMerges.map(m => ({
      mergeCells: {
        range: { sheetId, startRowIndex: m.startRowIndex, endRowIndex: m.endRowIndex, startColumnIndex: m.startColumnIndex, endColumnIndex: m.endColumnIndex },
        mergeType: 'MERGE_ALL'
      }
    })),
    // Main Title
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 1, endColumnIndex: 8 },
        cell: { userEnteredFormat: { textFormat: { fontSize: 16, bold: true, foregroundColor: { red: 0.09, green: 0.12, blue: 0.17 } } } },
        fields: 'userEnteredFormat.textFormat'
      }
    },
    // Subtitle
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 1, endColumnIndex: 8 },
        cell: { userEnteredFormat: { textFormat: { fontSize: 10, italic: true, foregroundColor: { red: 0.39, green: 0.45, blue: 0.55 } } } },
        fields: 'userEnteredFormat.textFormat'
      }
    },
    // C4 Input Box
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 2, endColumnIndex: 3 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.88, green: 0.91, blue: 0.99 },
            textFormat: { fontSize: 14, bold: true, foregroundColor: { red: 0.12, green: 0.23, blue: 0.54 } },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            borders: {
              top: { style: 'SOLID_MEDIUM', color: { red: 0.12, green: 0.23, blue: 0.54 } },
              bottom: { style: 'SOLID_MEDIUM', color: { red: 0.12, green: 0.23, blue: 0.54 } },
              left: { style: 'SOLID_MEDIUM', color: { red: 0.12, green: 0.23, blue: 0.54 } },
              right: { style: 'SOLID_MEDIUM', color: { red: 0.12, green: 0.23, blue: 0.54 } }
            }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,borders)'
      }
    },
    // Tier 1 Banner
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 6, endRowIndex: 7, startColumnIndex: 1, endColumnIndex: 9 },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.12, green: 0.16, blue: 0.22 }, textFormat: { fontSize: 11, bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, verticalAlignment: 'MIDDLE' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)'
      }
    },
    // KPI Cards Header
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 7, endRowIndex: 8, startColumnIndex: 1, endColumnIndex: 9 },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.94, green: 0.96, blue: 0.98 }, textFormat: { fontSize: 9, bold: true, foregroundColor: { red: 0.30, green: 0.36, blue: 0.44 } }, horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    },
    // KPI Cards Values
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 8, endRowIndex: 9, startColumnIndex: 1, endColumnIndex: 9 },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.98, green: 0.99, blue: 1.0 }, textFormat: { fontSize: 15, bold: true, foregroundColor: { red: 0.09, green: 0.12, blue: 0.17 } }, horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE', numberFormat: { type: 'CURRENCY', pattern: '[$₹-3441] #,##0' } } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,numberFormat)'
      }
    },
    // KPI Cards Footers
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 9, endRowIndex: 10, startColumnIndex: 1, endColumnIndex: 9 },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.94, green: 0.96, blue: 0.98 }, textFormat: { fontSize: 9, italic: true, foregroundColor: { red: 0.39, green: 0.45, blue: 0.55 } }, horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    },
    // Governance Controls Strip
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 10, endRowIndex: 11, startColumnIndex: 1, endColumnIndex: 9 },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.91, green: 0.93, blue: 0.96 }, textFormat: { fontSize: 10, bold: true, foregroundColor: { red: 0.12, green: 0.16, blue: 0.22 } }, verticalAlignment: 'MIDDLE' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)'
      }
    },
    // Tier 2 Banner
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 12, endRowIndex: 13, startColumnIndex: 1, endColumnIndex: 7 },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.12, green: 0.16, blue: 0.22 }, textFormat: { fontSize: 11, bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, verticalAlignment: 'MIDDLE' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)'
      }
    },
    // Tier 2 Headers
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 13, endRowIndex: 14, startColumnIndex: 1, endColumnIndex: 7 },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.20, green: 0.26, blue: 0.34 }, textFormat: { fontSize: 10, bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    },
    // Tier 2 Numbers
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 14, endRowIndex: 21, startColumnIndex: 3, endColumnIndex: 6 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '[$₹-3441] #,##0' }, horizontalAlignment: 'RIGHT' } },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)'
      }
    },
    // Tier 2 Total Row
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 20, endRowIndex: 21, startColumnIndex: 1, endColumnIndex: 7 },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.94, green: 0.96, blue: 0.98 }, textFormat: { fontSize: 10, bold: true, foregroundColor: { red: 0.12, green: 0.16, blue: 0.22 } }, borders: { top: { style: 'SOLID_MEDIUM', color: { red: 0.20, green: 0.26, blue: 0.34 } }, bottom: { style: 'DOUBLE', color: { red: 0.20, green: 0.26, blue: 0.34 } } } } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,borders)'
      }
    },
    // Tier 3 Banner
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 22, endRowIndex: 23, startColumnIndex: 1, endColumnIndex: 10 },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.12, green: 0.16, blue: 0.22 }, textFormat: { fontSize: 11, bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, verticalAlignment: 'MIDDLE' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)'
      }
    },
    // Tier 3 Subtitle
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 23, endRowIndex: 24, startColumnIndex: 1, endColumnIndex: 10 },
        cell: { userEnteredFormat: { textFormat: { fontSize: 10, italic: true, foregroundColor: { red: 0.39, green: 0.45, blue: 0.55 } } } },
        fields: 'userEnteredFormat.textFormat'
      }
    },
    // Tier 3 Headers
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 24, endRowIndex: 25, startColumnIndex: 1, endColumnIndex: 10 },
        cell: { userEnteredFormat: { backgroundColor: { red: 0.20, green: 0.26, blue: 0.34 }, textFormat: { fontSize: 10, bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } }, horizontalAlignment: 'CENTER', verticalAlignment: 'MIDDLE' } },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    },
    // Tier 3 Numbers (Blended Rate on Col F / Total on Col G)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 25, endRowIndex: 500, startColumnIndex: 5, endColumnIndex: 7 },
        cell: { userEnteredFormat: { numberFormat: { type: 'CURRENCY', pattern: '[$₹-3441] #,##0' }, horizontalAlignment: 'RIGHT' } },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)'
      }
    },
    // Consolidated Qty on Col E
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 25, endRowIndex: 500, startColumnIndex: 4, endColumnIndex: 5 },
        cell: { userEnteredFormat: { numberFormat: { type: 'NUMBER', pattern: '#,##0.0' }, horizontalAlignment: 'RIGHT' } },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)'
      }
    },
    // Scope Tag on Col H
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 25, endRowIndex: 500, startColumnIndex: 7, endColumnIndex: 8 },
        cell: { userEnteredFormat: { horizontalAlignment: 'CENTER', textFormat: { bold: true } } },
        fields: 'userEnteredFormat(horizontalAlignment,textFormat)'
      }
    }
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: formatRequests }
  });

  console.log('✅ Simplified Supply Tab deployed successfully to PID_Governance_Report!');
}

main().catch(err => {
  console.error('❌ Error executing deployment:', err);
  process.exit(1);
});
