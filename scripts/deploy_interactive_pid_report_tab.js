const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
const SPREADSHEET_ID = '1Y6HWuxIBP0Cz9JFEHSKo850JxpyMVy18VPg0kvBZUno';
const TAB_NAME = 'PID_Governance_Report';

async function main() {
  console.log('🚀 Step 2: Deploying Interactive Single PID Governance Report Tab...');
  const auth = google.auth.fromJSON(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
  const sheets = google.sheets({ version: 'v4', auth });

  // 1. Check existing sheets
  const metaRes = await sheets.spreadsheets.get({
    spreadsheetId: SPREADSHEET_ID
  });

  let existingSheet = metaRes.data.sheets.find(s => s.properties.title === TAB_NAME);
  let sheetId;

  if (existingSheet) {
    console.log(`Sheet "${TAB_NAME}" already exists (id: ${existingSheet.properties.sheetId}). Re-using and clearing...`);
    sheetId = existingSheet.properties.sheetId;
    // Clear all contents
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${TAB_NAME}'!A1:Z500`
    });
  } else {
    console.log(`Creating new sheet "${TAB_NAME}" at index 0 (first tab)...`);
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: TAB_NAME,
                index: 0,
                gridProperties: {
                  rowCount: 500,
                  columnCount: 20,
                  frozenRowCount: 5
                },
                tabColor: { red: 0.12, green: 0.16, blue: 0.22 } // Slate
              }
            }
          }
        ]
      }
    });
    sheetId = addRes.data.replies[0].addSheet.properties.sheetId;
    console.log(`✅ Created "${TAB_NAME}" with sheetId: ${sheetId}`);
  }

  // Ensure index 0 and frozen rows
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          updateSheetProperties: {
            properties: {
              sheetId,
              index: 0,
              gridProperties: {
                frozenRowCount: 5,
                hideGridlines: false
              }
            },
            fields: 'index,gridProperties.frozenRowCount,gridProperties.hideGridlines'
          }
        }
      ]
    }
  });

  // 2. Set Column Widths
  console.log('Setting optimal column widths...');
  const colWidths = [
    { start: 0, end: 1, width: 30 },   // A: Spacing
    { start: 1, end: 2, width: 260 },  // B: Description / Label / Trade
    { start: 2, end: 3, width: 140 },  // C: PID Input / Super Category
    { start: 3, end: 4, width: 110 },  // D: UOM / Total BoQ
    { start: 4, end: 5, width: 90 },   // E: Qty / Standard BoQ
    { start: 5, end: 6, width: 120 },  // F: Unit Rate / Spec BoQ
    { start: 6, end: 7, width: 130 },  // G: Pre-Tax / Spec %
    { start: 7, end: 8, width: 100 },  // H: Scope Tag / Trade Wt
    { start: 8, end: 9, width: 120 },  // I: Ci / Trade NRI
    { start: 9, end: 10, width: 250 }, // J: Wt / Sourcing Strategy
    { start: 10, end: 11, width: 280 },// K: NRI / Execution Gate
    { start: 11, end: 12, width: 150 },// L: Rate Rule Flag
    { start: 12, end: 13, width: 280 },// M: Mandatory Sourcing Action
  ];

  const colWidthRequests = colWidths.map(c => ({
    updateDimensionProperties: {
      range: {
        sheetId,
        dimension: 'COLUMNS',
        startIndex: c.start,
        endIndex: c.end
      },
      properties: { pixelSize: c.width },
      fields: 'pixelSize'
    }
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: colWidthRequests }
  });

  // 3. Populate Sheet Cells & Formulas
  console.log('Writing executive formulas and structure...');

  const valuesPayload = [
    // Row 1: Empty spacing
    [],
    // Row 2: Title
    [
      '',
      'LIVSPACE SERVICES COMPLEXITY & GOVERNANCE REPORT',
      '',
      '',
      '',
      '',
      '',
      '',
      '',
      'SYSTEM VERSION: v2.4 (LIVE SYNC)',
      'AUDIT DATE: 22-OCT-2026'
    ],
    // Row 3: Subtitle
    [
      '',
      'Interactive Single Project ID (PID) Governance Scorecard, Trade Matrix, and BoQ Execution Controls'
    ],
    // Row 4: Core Interactive Input & Metadata Row 1
    [
      '',
      'SELECT / ENTER PID:',
      '5137927', // Cell C4 - The interactive user input cell!
      'City:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$C$11:$C$619, "-"), "-")',
      'Business Unit:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$P$11:$P$619, "Vesta"), "Vesta")',
      'Order Status:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$Q$11:$Q$619, "CONVERTED"), "CONVERTED")',
      'Quoted Scope Lines:',
      '=IFERROR(COUNTIF(\'RFV_Dump-OND26\'!$B$3:$B, $C$4), 0)'
    ],
    // Row 5: Metadata Row 2
    [
      '',
      'Input Guidance:',
      'Pick from dropdown or type PID',
      'Order Published:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$R$11:$R$619, "-"), "-")',
      'VL Lead Email:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$S$11:$S$619, "-"), "-")',
      'Governance Protocol:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$L$11:$L$619, "-"), "-")',
      'Audit Hash:',
      '=IFERROR("PID-" & $C$4 & "-AUDITED", "-")'
    ],
    // Row 6: Blank spacing
    [],
    // Row 7: TIER 1 Header Banner
    [
      '',
      'TIER 1: EXECUTIVE GOVERNANCE SCORECARD (DECK A & DECK B ALIGNED)'
    ],
    // Row 8: KPI Card Titles
    [
      '',
      'TOTAL SERVICES BOQ',
      '',
      'STANDARD SCOPE',
      '',
      'SPECIALISED SCOPE',
      '',
      'RATE > ₹2K OVERRIDES',
      '',
      'NET RISK INDEX (NRI)',
      ''
    ],
    // Row 9: KPI Card Values
    [
      '',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$D$11:$D$619, 0), 0)',
      '',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$E$11:$E$619, 0), 0)',
      '',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$G$11:$G$619, 0), 0)',
      '',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$I$11:$I$619, 0), 0)',
      '',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$J$11:$J$619, 0), 0)',
      ''
    ],
    // Row 10: KPI Card Footers / Ratios
    [
      '',
      '100.0% of Services Scope',
      '',
      '=IFERROR(TEXT(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$F$11:$F$619, 0), "0.0%") & " Share", "0.0% Share")',
      '',
      '=IFERROR(TEXT(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$H$11:$H$619, 0), "0.0%") & " Share", "0.0% Share")',
      '',
      'SqFt / RFt Threshold',
      '',
      '=IFERROR("Risk Multiplier: " & TEXT(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$K$11:$K$619, 0), "0.00") & "x", "0.00x")',
      ''
    ],
    // Row 11: Governance Controls Summary Strip
    [
      '',
      'Risk Classification:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$L$11:$L$619, "-"), "-")',
      'Approval Gate Authority:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$M$11:$M$619, "-"), "-")',
      'Sourcing Policy:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$N$11:$N$619, "-"), "-")',
      'Contingency Buffer:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$O$11:$O$619, "-"), "-")',
      ''
    ],
    // Row 12: Blank spacing
    [],
    // Row 13: TIER 2 Header Banner
    [
      '',
      'TIER 2: TRADE-LEVEL BREAKDOWN & MANDATORY EXECUTION HOLD-POINTS (6 CORE TRADES)'
    ],
    // Row 14: Tier 2 Table Headers
    [
      '',
      'Trade (Super Category)',
      'Lines',
      'Total Quoted BoQ (₹)',
      'Standard Scope (₹)',
      'Specialised Scope (₹)',
      'Spec Share (%)',
      'Trade Weight (W_t)',
      'Trade NRI (₹)',
      'Vendor Pool Sourcing Strategy',
      'Mandatory Trade Execution Gate'
    ],
    // Row 15: Carpentry
    [
      '',
      'Carpentry',
      '=COUNTIFS(\'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B15)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B15)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B15, \'RFV_Dump-OND26\'!$U$3:$U, "Standard")',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B15, \'RFV_Dump-OND26\'!$U$3:$U, "Specialised")',
      '=IF(D15>0, F15/D15, 0)',
      4.0,
      '=SUMIFS(\'RFV_Dump-OND26\'!$X$3:$X, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B15)',
      '=IF(F15>0, "Specialist Carpentry Partner (Duco/PU/Veneer qualified)", IF(D15>0, "Standard Carpentry Contractor Pool", "No Carpentry Scope"))',
      '=IF(F15>0, "Mandatory VL Sign-Off + Sample Approval Before Cutting", IF(D15>0, "Auto-Approve / Standard Dispatch", "-"))'
    ],
    // Row 16: Civil
    [
      '',
      'Civil',
      '=COUNTIFS(\'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B16)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B16)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B16, \'RFV_Dump-OND26\'!$U$3:$U, "Standard")',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B16, \'RFV_Dump-OND26\'!$U$3:$U, "Specialised")',
      '=IF(D16>0, F16/D16, 0)',
      4.0,
      '=SUMIFS(\'RFV_Dump-OND26\'!$X$3:$X, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B16)',
      '=IF(F16>0, "Specialist Civil Contractor (Waterproofing / Precision Masonry)", IF(D16>0, "Standard Civil Contractor Pool", "No Civil Scope"))',
      '=IF(F16>0, "Mandatory Water-Ponding Test / Demolition Site Audit", IF(D16>0, "Auto-Approve / Standard Dispatch", "-"))'
    ],
    // Row 17: Electrical
    [
      '',
      'Electrical',
      '=COUNTIFS(\'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B17)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B17)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B17, \'RFV_Dump-OND26\'!$U$3:$U, "Standard")',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B17, \'RFV_Dump-OND26\'!$U$3:$U, "Specialised")',
      '=IF(D17>0, F17/D17, 0)',
      5.0,
      '=SUMIFS(\'RFV_Dump-OND26\'!$X$3:$X, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B17)',
      '=IF(F17>0, "Specialist Electrical Contractor (Heavy Load / Automation)", IF(D17>0, "Standard Electrician Pool", "No Electrical Scope"))',
      '=IF(F17>0, "Mandatory Single-Line Diagram Sign-Off", IF(D17>0, "Auto-Approve / Standard Dispatch", "-"))'
    ],
    // Row 18: Plumbing
    [
      '',
      'Plumbing',
      '=COUNTIFS(\'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B18)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B18)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B18, \'RFV_Dump-OND26\'!$U$3:$U, "Standard")',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B18, \'RFV_Dump-OND26\'!$U$3:$U, "Specialised")',
      '=IF(D18>0, F18/D18, 0)',
      5.0,
      '=SUMIFS(\'RFV_Dump-OND26\'!$X$3:$X, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B18)',
      '=IF(F18>0, "Specialist Plumbing Partner (Thermostat / Concealed Loop qualified)", IF(D18>0, "Standard Plumber Pool", "No Plumbing Scope"))',
      '=IF(F18>0, "Mandatory Pressure-Testing Sign-Off Before Tiling", IF(D18>0, "Auto-Approve / Standard Dispatch", "-"))'
    ],
    // Row 19: False Ceiling
    [
      '',
      'False Ceiling',
      '=COUNTIFS(\'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B19)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B19)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B19, \'RFV_Dump-OND26\'!$U$3:$U, "Standard")',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B19, \'RFV_Dump-OND26\'!$U$3:$U, "Specialised")',
      '=IF(D19>0, F19/D19, 0)',
      2.0,
      '=SUMIFS(\'RFV_Dump-OND26\'!$X$3:$X, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B19)',
      '=IF(F19>0, "Specialist Ceiling Partner (Curved / Wooden / Trap door)", IF(D19>0, "Standard False Ceiling Pool", "No Ceiling Scope"))',
      '=IF(F19>0, "Mandatory Framing & Trap Door Location Audit", IF(D19>0, "Auto-Approve / Standard Dispatch", "-"))'
    ],
    // Row 20: Painting
    [
      '',
      'Painting',
      '=COUNTIFS(\'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B20)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B20)',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B20, \'RFV_Dump-OND26\'!$U$3:$U, "Standard")',
      '=SUMIFS(\'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B20, \'RFV_Dump-OND26\'!$U$3:$U, "Specialised")',
      '=IF(D20>0, F20/D20, 0)',
      2.0,
      '=SUMIFS(\'RFV_Dump-OND26\'!$X$3:$X, \'RFV_Dump-OND26\'!$B$3:$B, $C$4, \'RFV_Dump-OND26\'!$T$3:$T, B20)',
      '=IF(F20>0, "Specialist Texture Applicator (Asian Archi / Concrete qualified)", IF(D20>0, "Standard Painter Pool", "No Painting Scope"))',
      '=IF(F20>0, "Mandatory 2ft x 2ft Onsite Swatch Sign-Off Before Application", IF(D20>0, "Auto-Approve / Standard Dispatch", "-"))'
    ],
    // Row 21: Trade Total Rollup
    [
      '',
      'Project Trade Total',
      '=SUM(C15:C20)',
      '=SUM(D15:D20)',
      '=SUM(E15:E20)',
      '=SUM(F15:F20)',
      '=IF(D21>0, F21/D21, 0)',
      '-',
      '=SUM(I15:I20)',
      'Aggregated Trade Strategy',
      'Consolidated Governance Hold-Points'
    ],
    // Row 22: Blank spacing
    [],
    // Row 23: TIER 3 Header Banner
    [
      '',
      'TIER 3: QUOTATION BOQ LINE-ITEM AUDIT REGISTER (DYNAMIC FILTER)'
    ],
    // Row 24: Subtitle note
    [
      '',
      'All quotation line items for the selected Project ID ($C$4) with trade classification, complexity (C_i), weight (W_t), line NRI (₹), and vendor sourcing action.'
    ],
    // Row 25: Tier 3 Table Headers
    [
      '',
      'Item Description',
      'Super Category',
      'UOM',
      'Qty',
      'Unit Rate (₹)',
      'Pre-Tax Total (₹)',
      'Scope Tag',
      'Complexity (C_i)',
      'Trade Weight (W_t)',
      'Line NRI (₹)',
      'Rate Rule Flag',
      'Mandatory Sourcing Action'
    ],
    // Row 26: The Dynamic FILTER Formula
    [
      '',
      '=IFERROR(FILTER(HSTACK(\'RFV_Dump-OND26\'!$D$3:$D, \'RFV_Dump-OND26\'!$T$3:$T, \'RFV_Dump-OND26\'!$F$3:$F, \'RFV_Dump-OND26\'!$E$3:$E, \'RFV_Dump-OND26\'!$G$3:$G, \'RFV_Dump-OND26\'!$I$3:$I, \'RFV_Dump-OND26\'!$U$3:$U, \'RFV_Dump-OND26\'!$V$3:$V, \'RFV_Dump-OND26\'!$W$3:$W, \'RFV_Dump-OND26\'!$X$3:$X, \'RFV_Dump-OND26\'!$Y$3:$Y, \'RFV_Dump-OND26\'!$Z$3:$Z), \'RFV_Dump-OND26\'!$B$3:$B = $C$4), {"No quotation lines found for this PID", "", "", "", "", "", "", "", "", "", "", ""})'
    ]
  ];

  console.log(`Writing ${valuesPayload.length} rows to "${TAB_NAME}"!A1:M${valuesPayload.length}...`);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${TAB_NAME}'!A1:M${valuesPayload.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: valuesPayload }
  });

  // 4. Set Dropdown Data Validation on C4 from PID_Governance_Audit!$B$11:$B$619
  console.log('Setting Data Validation dropdown on cell C4...');
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        {
          setDataValidation: {
            range: {
              sheetId,
              startRowIndex: 3, // Row 4 (0-indexed: 3)
              endRowIndex: 4,
              startColumnIndex: 2, // Col C (0-indexed: 2)
              endColumnIndex: 3
            },
            rule: {
              condition: {
                type: 'ONE_OF_RANGE',
                values: [
                  {
                    userEnteredValue: "='PID_Governance_Audit'!$B$11:$B$619"
                  }
                ]
              },
              inputMessage: 'Select a converted Project ID (PID) to inspect its full governance breakdown.',
              strict: false,
              showCustomUi: true
            }
          }
        }
      ]
    }
  });

  // 5. Apply Slate & Pearl High-Contrast Formatting
  console.log('Applying Slate & Pearl Executive Styling...');
  const formatRequests = [
    // A. Main Title (B2)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 1, endColumnIndex: 8 },
        cell: {
          userEnteredFormat: {
            textFormat: { fontSize: 16, bold: true, foregroundColor: { red: 0.09, green: 0.12, blue: 0.17 } } // Slate-900
          }
        },
        fields: 'userEnteredFormat.textFormat'
      }
    },
    // B. Subtitle (B3)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 1, endColumnIndex: 10 },
        cell: {
          userEnteredFormat: {
            textFormat: { fontSize: 10, italic: true, foregroundColor: { red: 0.39, green: 0.45, blue: 0.55 } } // Slate-500
          }
        },
        fields: 'userEnteredFormat.textFormat'
      }
    },
    // C. The Interactive PID Input Box (C4)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 2, endColumnIndex: 3 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.88, green: 0.91, blue: 0.99 }, // Soft indigo #e0e7ff
            textFormat: { fontSize: 14, bold: true, foregroundColor: { red: 0.12, green: 0.23, blue: 0.54 } }, // Deep indigo #1e3a8a
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
    // Label for C4 (B4)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 3, endRowIndex: 4, startColumnIndex: 1, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            textFormat: { fontSize: 11, bold: true, foregroundColor: { red: 0.12, green: 0.16, blue: 0.22 } },
            horizontalAlignment: 'RIGHT',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(textFormat,horizontalAlignment,verticalAlignment)'
      }
    },
    // Metadata Labels & Values (Row 4 & 5)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 3, endRowIndex: 5, startColumnIndex: 3, endColumnIndex: 11 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.97, green: 0.98, blue: 0.99 }, // Pearl
            textFormat: { fontSize: 10, bold: false, foregroundColor: { red: 0.15, green: 0.20, blue: 0.25 } },
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)'
      }
    },
    // D. Tier 1 Banner (Row 7)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 6, endRowIndex: 7, startColumnIndex: 1, endColumnIndex: 11 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.12, green: 0.16, blue: 0.22 }, // Dark Slate #1e293b
            textFormat: { fontSize: 11, bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)'
      }
    },
    // E. KPI Cards Header (Row 8)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 7, endRowIndex: 8, startColumnIndex: 1, endColumnIndex: 11 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.94, green: 0.96, blue: 0.98 },
            textFormat: { fontSize: 9, bold: true, foregroundColor: { red: 0.30, green: 0.36, blue: 0.44 } },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    },
    // F. KPI Cards Values (Row 9)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 8, endRowIndex: 9, startColumnIndex: 1, endColumnIndex: 11 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.98, green: 0.99, blue: 1.0 },
            textFormat: { fontSize: 15, bold: true, foregroundColor: { red: 0.09, green: 0.12, blue: 0.17 } },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE',
            numberFormat: { type: 'CURRENCY', pattern: '[$₹-3441] #,##0' }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment,numberFormat)'
      }
    },
    // G. KPI Cards Footers (Row 10)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 9, endRowIndex: 10, startColumnIndex: 1, endColumnIndex: 11 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.94, green: 0.96, blue: 0.98 },
            textFormat: { fontSize: 9, italic: true, foregroundColor: { red: 0.39, green: 0.45, blue: 0.55 } },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    },
    // H. Governance Controls Strip (Row 11)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 10, endRowIndex: 11, startColumnIndex: 1, endColumnIndex: 11 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.91, green: 0.93, blue: 0.96 },
            textFormat: { fontSize: 10, bold: true, foregroundColor: { red: 0.12, green: 0.16, blue: 0.22 } },
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)'
      }
    },
    // I. Tier 2 Banner (Row 13)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 12, endRowIndex: 13, startColumnIndex: 1, endColumnIndex: 11 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.12, green: 0.16, blue: 0.22 },
            textFormat: { fontSize: 11, bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)'
      }
    },
    // J. Tier 2 Table Headers (Row 14)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 13, endRowIndex: 14, startColumnIndex: 1, endColumnIndex: 11 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.20, green: 0.26, blue: 0.34 }, // Slate-700
            textFormat: { fontSize: 10, bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    },
    // K. Tier 2 Data Rows (Rows 15-20)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 14, endRowIndex: 20, startColumnIndex: 1, endColumnIndex: 2 },
        cell: {
          userEnteredFormat: {
            textFormat: { fontSize: 10, bold: true, foregroundColor: { red: 0.12, green: 0.16, blue: 0.22 } },
            horizontalAlignment: 'LEFT'
          }
        },
        fields: 'userEnteredFormat(textFormat,horizontalAlignment)'
      }
    },
    // Tier 2 Number Formats (Currency on D, E, F, I)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 14, endRowIndex: 21, startColumnIndex: 3, endColumnIndex: 6 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'CURRENCY', pattern: '[$₹-3441] #,##0' },
            horizontalAlignment: 'RIGHT'
          }
        },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)'
      }
    },
    // Spec % on Col G (index 6)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 14, endRowIndex: 21, startColumnIndex: 6, endColumnIndex: 7 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'PERCENT', pattern: '0.0%' },
            horizontalAlignment: 'RIGHT'
          }
        },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)'
      }
    },
    // Trade Weight on Col H (index 7)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 14, endRowIndex: 20, startColumnIndex: 7, endColumnIndex: 8 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'NUMBER', pattern: '0.0' },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)'
      }
    },
    // Trade NRI on Col I (index 8)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 14, endRowIndex: 21, startColumnIndex: 8, endColumnIndex: 9 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'CURRENCY', pattern: '[$₹-3441] #,##0' },
            horizontalAlignment: 'RIGHT'
          }
        },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)'
      }
    },
    // L. Tier 2 Total Row (Row 21)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 20, endRowIndex: 21, startColumnIndex: 1, endColumnIndex: 11 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.94, green: 0.96, blue: 0.98 },
            textFormat: { fontSize: 10, bold: true, foregroundColor: { red: 0.12, green: 0.16, blue: 0.22 } },
            borders: {
              top: { style: 'SOLID_MEDIUM', color: { red: 0.20, green: 0.26, blue: 0.34 } },
              bottom: { style: 'DOUBLE', color: { red: 0.20, green: 0.26, blue: 0.34 } }
            }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,borders)'
      }
    },
    // M. Tier 3 Banner (Row 23)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 22, endRowIndex: 23, startColumnIndex: 1, endColumnIndex: 13 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.12, green: 0.16, blue: 0.22 },
            textFormat: { fontSize: 11, bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)'
      }
    },
    // Tier 3 Subtitle (Row 24)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 23, endRowIndex: 24, startColumnIndex: 1, endColumnIndex: 13 },
        cell: {
          userEnteredFormat: {
            textFormat: { fontSize: 10, italic: true, foregroundColor: { red: 0.39, green: 0.45, blue: 0.55 } }
          }
        },
        fields: 'userEnteredFormat.textFormat'
      }
    },
    // N. Tier 3 Table Headers (Row 25)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 24, endRowIndex: 25, startColumnIndex: 1, endColumnIndex: 13 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.20, green: 0.26, blue: 0.34 },
            textFormat: { fontSize: 10, bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    },
    // O. Tier 3 Dynamic Line Data Formatting (Rows 26-500)
    // Unit Price (Col F / index 5)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 25, endRowIndex: 500, startColumnIndex: 5, endColumnIndex: 6 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'CURRENCY', pattern: '[$₹-3441] #,##0' },
            horizontalAlignment: 'RIGHT'
          }
        },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)'
      }
    },
    // Pre-Tax Total (Col G / index 6)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 25, endRowIndex: 500, startColumnIndex: 6, endColumnIndex: 7 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'CURRENCY', pattern: '[$₹-3441] #,##0' },
            horizontalAlignment: 'RIGHT'
          }
        },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)'
      }
    },
    // Complexity & Weight (Cols I, J / indices 8, 9)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 25, endRowIndex: 500, startColumnIndex: 8, endColumnIndex: 10 },
        cell: {
          userEnteredFormat: {
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(horizontalAlignment)'
      }
    },
    // Line NRI (Col K / index 10)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 25, endRowIndex: 500, startColumnIndex: 10, endColumnIndex: 11 },
        cell: {
          userEnteredFormat: {
            numberFormat: { type: 'CURRENCY', pattern: '[$₹-3441] #,##0' },
            horizontalAlignment: 'RIGHT'
          }
        },
        fields: 'userEnteredFormat(numberFormat,horizontalAlignment)'
      }
    }
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: formatRequests }
  });

  console.log('✅ Interactive PID Governance Report successfully deployed as Tab 1 in Google Sheets!');
  console.log(`URL: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=${sheetId}`);
}

main().catch(err => {
  console.error('❌ Error executing deployment:', err);
  process.exit(1);
});
