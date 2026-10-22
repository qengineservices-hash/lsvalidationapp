const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
const SPREADSHEET_ID = '1Y6HWuxIBP0Cz9JFEHSKo850JxpyMVy18VPg0kvBZUno';
const TAB_NAME = 'PID_Governance_Report';

async function main() {
  console.log('🚀 Updating PID_Governance_Report with exact column mappings & card merges...');
  const auth = google.auth.fromJSON(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
  const sheets = google.sheets({ version: 'v4', auth });

  const metaRes = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = metaRes.data.sheets.find(s => s.properties.title === TAB_NAME);
  if (!sheet) throw new Error(`Sheet ${TAB_NAME} not found!`);
  const sheetId = sheet.properties.sheetId;

  // 1. Update Values for Rows 4-11
  const rowsPayload = [
    // Row 4: Interactive Input & Metadata 1
    [
      '',
      'SELECT / ENTER PID:',
      '5137927',
      'City:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$C$11:$C$619, "-"), "-")',
      'Business Unit:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$D$11:$D$619, "Vesta"), "Vesta")',
      'Order Status:',
      '=IFERROR(XLOOKUP($C$4, \'RFV_Dump-OND26\'!$B$3:$B, \'RFV_Dump-OND26\'!$P$3:$P, "CONVERTED"), "CONVERTED")',
      'Quoted Scope Lines:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$E$11:$E$619, 0), 0)'
    ],
    // Row 5: Metadata 2
    [
      '',
      'Input Guidance:',
      'Pick dropdown or type PID',
      'Order Published:',
      '=IFERROR(XLOOKUP($C$4, \'RFV_Dump-OND26\'!$B$3:$B, \'RFV_Dump-OND26\'!$R$3:$R, "-"), "-")',
      'VL Lead Email:',
      '=IFERROR(XLOOKUP($C$4, \'RFV_Dump-OND26\'!$B$3:$B, \'RFV_Dump-OND26\'!$O$3:$O, "-"), "-")',
      'Risk Classification:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$N$11:$N$619, "-"), "-")',
      'Avg Complexity (C̄):',
      '=IFERROR(TEXT(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$L$11:$L$619, 0), "0.0") & " / 5.0", "-")'
    ],
    // Row 6: Blank
    [],
    // Row 7: Banner
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
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$F$11:$F$619, 0), 0)',
      '',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$G$11:$G$619, 0), 0)',
      '',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$H$11:$H$619, 0), 0)',
      '',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$K$11:$K$619, 0), 0)',
      '',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$M$11:$M$619, 0), 0)',
      ''
    ],
    // Row 10: KPI Card Footers
    [
      '',
      '100.0% of Services Scope',
      '',
      '=IFERROR(TEXT(1 - XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$I$11:$I$619, 0), "0.0%") & " Share", "0.0% Share")',
      '',
      '=IFERROR(TEXT(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$I$11:$I$619, 0), "0.0%") & " Share", "0.0% Share")',
      '',
      '=IFERROR(TEXT(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$J$11:$J$619, 0), "#,##0") & " items > ₹2k/sqft", "0 items")',
      '',
      '=IFERROR("Multiplier: " & TEXT(IF(B9>0, J9/B9, 0), "0.00") & "x", "0.00x")',
      ''
    ],
    // Row 11: Governance Controls Summary Strip
    [
      '',
      'Mandatory Approval Gate:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$O$11:$O$619, "-"), "-")',
      '',
      'Sourcing Policy:',
      '=IFERROR(XLOOKUP($C$4, PID_Governance_Audit!$B$11:$B$619, PID_Governance_Audit!$P$11:$P$619, "-"), "-")',
      '',
      '',
      'Contingency Buffer:',
      '=IF(F9>0, "+3 to 7 Days Buffer | 10% Reserve", "Standard Schedule | 0% Buffer")',
      ''
    ]
  ];

  console.log('Writing updated rows 4 to 11...');
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${TAB_NAME}'!A4:K11`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: rowsPayload }
  });

  // 2. Card merges for clean presentation
  console.log('Merging card cells and formatting control strip...');
  const cardMerges = [
    // Banner 1: B7:K7
    { startRowIndex: 6, endRowIndex: 7, startColumnIndex: 1, endColumnIndex: 11 },
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
    // Card 5: J8:K8, J9:K9, J10:K10
    { startRowIndex: 7, endRowIndex: 8, startColumnIndex: 9, endColumnIndex: 11 },
    { startRowIndex: 8, endRowIndex: 9, startColumnIndex: 9, endColumnIndex: 11 },
    { startRowIndex: 9, endRowIndex: 10, startColumnIndex: 9, endColumnIndex: 11 },
    // Control Strip Row 11:
    // C11:D11 (Approval Gate value)
    { startRowIndex: 10, endRowIndex: 11, startColumnIndex: 2, endColumnIndex: 4 },
    // F11:H11 (Sourcing Policy value)
    { startRowIndex: 10, endRowIndex: 11, startColumnIndex: 5, endColumnIndex: 8 },
    // J11:K11 (Buffer value)
    { startRowIndex: 10, endRowIndex: 11, startColumnIndex: 9, endColumnIndex: 11 }
  ];

  const mergeRequests = cardMerges.map(m => ({
    mergeCells: {
      range: {
        sheetId,
        startRowIndex: m.startRowIndex,
        endRowIndex: m.endRowIndex,
        startColumnIndex: m.startColumnIndex,
        endColumnIndex: m.endColumnIndex
      },
      mergeType: 'MERGE_ALL'
    }
  }));

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: mergeRequests }
  });

  console.log('✅ Updated PID_Governance_Report with precision card lookups & formatting!');
}

main().catch(err => {
  console.error('❌ Error executing update:', err);
  process.exit(1);
});
