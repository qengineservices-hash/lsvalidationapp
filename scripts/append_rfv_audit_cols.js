const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const SPREADSHEET_ID = '1Y6HWuxIBP0Cz9JFEHSKo850JxpyMVy18VPg0kvBZUno';
const SHEET_NAME = 'RFV_Dump-OND26';
const DATA_PATH = path.join(__dirname, '..', 'lib', 'data', 'pid_governance_data.json');
const TOKEN_PATH = path.join(__dirname, '..', 'token.json');

async function main() {
  console.log('🚀 Starting append of audited columns T:Z to', SHEET_NAME);
  const auth = google.auth.fromJSON(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
  const sheets = google.sheets({ version: 'v4', auth });

  const payload = JSON.parse(fs.readFileSync(DATA_PATH, 'utf8'));
  
  // Create lookup by rfqId + lineId or index
  // Note: we processed dataRows in exact order
  console.log('Building audit rows from cached dataset...');
  
  // Headers for Row 2 (T2:Z2)
  const headerCols = [
    'Trade (Super Category)',
    'Scope Tag',
    'Complexity (C_i)',
    'Trade Weight (W_t)',
    'Line NRI (₹)',
    'Rate Rule Flag',
    'Mandatory Sourcing Action'
  ];

  // We can flatten all lines in the exact order they appeared
  const allLines = [];
  payload.pids.forEach(p => {
    p.lineItems.forEach(l => {
      allLines.push(l);
    });
  });

  console.log(`Total audited lines to write: ${allLines.length}`);

  // Fetch raw row count to verify alignment
  const rawRes = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${SHEET_NAME}'!B2:B`
  });
  const rawPids = rawRes.data.values.slice(1).map(r => (r[0] || '').trim()).filter(Boolean);
  console.log(`Total raw PIDs in sheet: ${rawPids.length}`);

  // Map each line to row values
  // We write in chunks of 5000 rows to avoid request size limits
  const writeRows = [headerCols];
  allLines.forEach(l => {
    writeRows.push([
      l.trade,
      l.scopeTag,
      l.complexityScore,
      l.tradeWeight,
      l.lineNri,
      l.rateRuleFlag,
      l.sourcingAction
    ]);
  });

  const chunkSize = 4000;
  for (let i = 0; i < writeRows.length; i += chunkSize) {
    const chunk = writeRows.slice(i, i + chunkSize);
    const startRow = 2 + i;
    const endRow = startRow + chunk.length - 1;
    const range = `'${SHEET_NAME}'!T${startRow}:Z${endRow}`;
    console.log(`Writing chunk ${i / chunkSize + 1}: ${range} (${chunk.length} rows)...`);
    await sheets.spreadsheets.values.update({
      spreadsheetId: SPREADSHEET_ID,
      range,
      valueInputOption: 'USER_ENTERED',
      requestBody: { values: chunk }
    });
  }

  console.log('✅ Successfully appended audited columns T:Z to RFV_Dump-OND26!');
}

main().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
