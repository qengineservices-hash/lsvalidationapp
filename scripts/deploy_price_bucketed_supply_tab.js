const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
const SPREADSHEET_ID = '1Y6HWuxIBP0Cz9JFEHSKo850JxpyMVy18VPg0kvBZUno';
const TAB_NAME = 'PID_Governance_Report';
const STAGING_TAB = 'Inhouse_Clean_Staging';

async function main() {
  console.log('🚀 Deploying Price-Bucketed Supply Tab to PID_Governance_Report...');
  const auth = google.auth.fromJSON(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
  const sheets = google.sheets({ version: 'v4', auth });

  const metaRes = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  const sheet = metaRes.data.sheets.find(s => s.properties.title === TAB_NAME);
  if (!sheet) throw new Error(`Sheet ${TAB_NAME} not found!`);
  const sheetId = sheet.properties.sheetId;

  // Unmerge any old merges and clear
  console.log('Clearing old ranges...');
  try {
    await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            unmergeCells: {
              range: { sheetId, startRowIndex: 0, endRowIndex: 100, startColumnIndex: 0, endColumnIndex: 26 }
            }
          }
        ]
      }
    });
  } catch (e) {
    console.log('Unmerge notice:', e.message);
  }

  await sheets.spreadsheets.values.clear({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${TAB_NAME}'!A1:Z500`
  });

  // 1. Column Widths
  const colWidths = [
    { start: 0, end: 1, width: 25 },   // A: Spacing
    { start: 1, end: 2, width: 340 },  // B: SKU / Item Description / Trade
    { start: 2, end: 3, width: 150 },  // C: PID input / Super Category
    { start: 3, end: 4, width: 110 },  // D: Consolidated Qty
    { start: 4, end: 5, width: 140 },  // E: Blended Unit Rate (₹/Qty)
    { start: 5, end: 6, width: 160 },  // F: Total Value (Bucket)
    { start: 6, end: 7, width: 120 },  // G: Scope Tag
    { start: 7, end: 8, width: 160 },  // H: Rate Rule Flag
    { start: 8, end: 9, width: 320 },  // I: Supply Sourcing Allocation Pool
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
      'SYSTEM: SUPPLY ENGINE v3.0'
    ],
    // Row 3: Subtitle
    [
      '',
      'Consolidated Project Scope, Trade Allocation, and Subcontractor Routing (Discrete Price Buckets)'
    ],
    // Row 4: Interactive Input & Metadata
    [
      '',
      'SELECT / ENTER PID:',
      '4019066',
      'City:',
      `=IFERROR(XLOOKUP($C$4, '${STAGING_TAB}'!$A$2:$A, '${STAGING_TAB}'!$L$2:$L, "-"), "-")`,
      'Business Unit:',
      `=IFERROR(XLOOKUP($C$4, '${STAGING_TAB}'!$A$2:$A, '${STAGING_TAB}'!$M$2:$M, "-"), "-")`,
      'Fulfillment Vendor:',
      `=IFERROR(XLOOKUP($C$4, '${STAGING_TAB}'!$A$2:$A, '${STAGING_TAB}'!$N$2:$N, "Inhouse Operations"), "Inhouse Operations")`,
      'Consolidated SKUs:',
      '=IFERROR(COUNTA(B27:B), 0)'
    ],
    // Row 5: Metadata Row 2
    [
      '',
      'Input Guidance:',
      'Type or select 2026 PID',
      'Created Date:',
      `=IFERROR(TEXT(XLOOKUP($C$4, '${STAGING_TAB}'!$A$2:$A, '${STAGING_TAB}'!$B$2:$B, "-"), "yyyy-mm-dd"), "-")`,
      'Quotation Lines:',
      `=COUNTIF('${STAGING_TAB}'!$A$2:$A, $C$4)`,
      'Sourcing Policy:',
      `=IF(SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$I$2:$I, "Specialised")>0, "Specialist Trade Vendor Allocation Required", "Standard Contractor Pool Dispatch")`
    ],
    // Row 6: Blank
    [],
    // Row 7: TIER 1 Header
    [
      '',
      'TIER 1: SUPPLY SOURCING & FINANCIAL ALLOCATION (DISCRETE PRICE BUCKETS)'
    ],
    // Row 8: KPI Card Titles (4 Clean Cards)
    [
      '',
      'TOTAL SERVICES BOQ (BUCKET)',
      '',
      'STANDARD SERVICES SCOPE (BUCKET)',
      '',
      'SPECIALISED SERVICES SCOPE (BUCKET)',
      '',
      'RATE > ₹2K OVERRIDES',
      ''
    ],
    // Row 9: KPI Card Values (Bucket Mapped)
    [
      '',
      `=LET(v, IFERROR(SUMIF('${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$F$2:$F), 0), IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+"))`,
      '',
      `=LET(v, IFERROR(SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$I$2:$I, "Standard"), 0), IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+"))`,
      '',
      `=LET(v, IFERROR(SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$I$2:$I, "Specialised"), 0), IF(v=0, "None", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
      '',
      `=LET(c, COUNTIFS('${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$J$2:$J, "Rate > ₹2k Override"), v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$J$2:$J, "Rate > ₹2k Override"), IF(c=0, "0 items", c & " items (" & IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+") & ")"))`,
      ''
    ],
    // Row 10: KPI Card Footers
    [
      '',
      'Total Value Band across Project',
      '',
      'Standard Contractor Pool Band',
      '',
      'Specialist Partner Pool Band',
      '',
      'Area Rates > ₹2,000 Threshold',
      ''
    ],
    // Row 11: Governance Controls Strip (Clean & Simple)
    [
      '',
      'Approval Authority Gate:',
      `=IF(SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$I$2:$I, "Specialised")>0, "Pre-10 Dispatch Sign-Off Required", "Auto-Approve / Standard Dispatch")`,
      '',
      'Supply Sourcing Policy:',
      `=IF(SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$I$2:$I, "Specialised")>0, "Specialist Trade Vendor Allocation Required", "Standard Contractor Pool Dispatch")`,
      '',
      '',
      ''
    ],
    // Row 12: Blank
    [],
    // Row 13: TIER 2 Header
    [
      '',
      'TIER 2: TRADE-LEVEL SUPPLY ALLOCATION MATRIX (DISCRETE PRICE BUCKETS)'
    ],
    // Row 14: Tier 2 Headers
    [
      '',
      'Trade (Super Category)',
      'Lines',
      'Total Quoted Value (Bucket)',
      'Standard Scope (Bucket)',
      'Specialised Scope (Bucket)',
      'Supply Partner Pool Sourcing Strategy'
    ],
    // Row 15: Carpentry
    [
      '',
      'Carpentry',
      `=COUNTIFS('${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B15)`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B15), IF(v=0, "—", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B15, '${STAGING_TAB}'!$I$2:$I, "Standard"), IF(v=0, "—", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B15, '${STAGING_TAB}'!$I$2:$I, "Specialised"), IF(v=0, "—", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
      `=IF(COUNTIFS('${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B15, '${STAGING_TAB}'!$I$2:$I, "Specialised")>0, "Specialist Carpentry Partner (Duco/PU/Veneer)", IF(C15>0, "Standard Carpentry Contractor Pool", "No Scope"))`
    ],
    // Row 16: Civil
    [
      '',
      'Civil',
      `=COUNTIFS('${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B16)`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B16), IF(v=0, "—", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B16, '${STAGING_TAB}'!$I$2:$I, "Standard"), IF(v=0, "—", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B16, '${STAGING_TAB}'!$I$2:$I, "Specialised"), IF(v=0, "—", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
      `=IF(COUNTIFS('${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B16, '${STAGING_TAB}'!$I$2:$I, "Specialised")>0, "Specialist Civil Contractor (Waterproofing / Precision)", IF(C16>0, "Standard Civil Contractor Pool", "No Scope"))`
    ],
    // Row 17: Electrical
    [
      '',
      'Electrical',
      `=COUNTIFS('${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B17)`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B17), IF(v=0, "—", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B17, '${STAGING_TAB}'!$I$2:$I, "Standard"), IF(v=0, "—", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B17, '${STAGING_TAB}'!$I$2:$I, "Specialised"), IF(v=0, "—", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
      `=IF(COUNTIFS('${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B17, '${STAGING_TAB}'!$I$2:$I, "Specialised")>0, "Specialist Electrical Contractor (Automation / Heavy Load)", IF(C17>0, "Standard Electrician Pool", "No Scope"))`
    ],
    // Row 18: Plumbing
    [
      '',
      'Plumbing',
      `=COUNTIFS('${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B18)`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B18), IF(v=0, "—", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B18, '${STAGING_TAB}'!$I$2:$I, "Standard"), IF(v=0, "—", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B18, '${STAGING_TAB}'!$I$2:$I, "Specialised"), IF(v=0, "—", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
      `=IF(COUNTIFS('${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B18, '${STAGING_TAB}'!$I$2:$I, "Specialised")>0, "Specialist Plumbing Partner (Thermostat / Concealed Loop)", IF(C18>0, "Standard Plumber Pool", "No Scope"))`
    ],
    // Row 19: False Ceiling
    [
      '',
      'False Ceiling',
      `=COUNTIFS('${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B19)`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B19), IF(v=0, "—", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B19, '${STAGING_TAB}'!$I$2:$I, "Standard"), IF(v=0, "—", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B19, '${STAGING_TAB}'!$I$2:$I, "Specialised"), IF(v=0, "—", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
      `=IF(COUNTIFS('${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B19, '${STAGING_TAB}'!$I$2:$I, "Specialised")>0, "Specialist Ceiling Partner (Curved / Wooden / PVC)", IF(C19>0, "Standard False Ceiling Pool", "No Scope"))`
    ],
    // Row 20: Painting
    [
      '',
      'Painting',
      `=COUNTIFS('${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B20)`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B20), IF(v=0, "—", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B20, '${STAGING_TAB}'!$I$2:$I, "Standard"), IF(v=0, "—", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B20, '${STAGING_TAB}'!$I$2:$I, "Specialised"), IF(v=0, "—", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
      `=IF(COUNTIFS('${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$H$2:$H, B20, '${STAGING_TAB}'!$I$2:$I, "Specialised")>0, "Specialist Texture Applicator (Asian Archi / Concrete)", IF(C20>0, "Standard Painter Pool", "No Scope"))`
    ],
    // Row 21: Trade Total Rollup
    [
      '',
      'Total Project Scope',
      '=SUM(C15:C20)',
      `=LET(v, SUMIF('${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$F$2:$F), IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+"))`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$I$2:$I, "Standard"), IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+"))`,
      `=LET(v, SUMIFS('${STAGING_TAB}'!$F$2:$F, '${STAGING_TAB}'!$A$2:$A, $C$4, '${STAGING_TAB}'!$I$2:$I, "Specialised"), IF(v=0, "None", IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+")))`,
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
      'Identical SKUs across rooms/elevations are clubbed into single aggregated lines. Prices are classified into discrete value bands (not per-sqft rates).'
    ],
    // Row 25: Tier 3 Table Headers (Notice Total Value (Bucket) explicitly stated!)
    [
      '',
      'SKU / Item Description',
      'Trade (Super Category)',
      'Consolidated Qty',
      'Blended Unit Rate (₹/Qty)',
      'Total Value (Bucket)',
      'Scope Tag',
      'Rate Rule Flag',
      'Supply Sourcing Allocation Pool'
    ],
    // Row 26: The Dynamic QUERY Formula (Clubbing SKUs & Mapping to Price Buckets)
    [
      '',
      `=LET(q, IFERROR(QUERY('${STAGING_TAB}'!A2:P, "select Col4, Col8, sum(Col5), sum(Col6)/sum(Col5), sum(Col6), Col9, Col10, Col11 where Col1 = " & $C$4 & " group by Col4, Col8, Col9, Col10, Col11 label sum(Col5) '', sum(Col6)/sum(Col5) '', sum(Col6) ''", 0), ""), IF(INDEX(q, 1, 1) = "", {"No in-house quotation lines found for this PID", "", "", "", "", "", "", ""}, HSTACK(CHOOSECOLS(q, 1, 2, 3), MAP(CHOOSECOLS(q, 4), LAMBDA(r, ROUND(r, 2))), MAP(CHOOSECOLS(q, 5), LAMBDA(v, IFS(v<25000, "Less than 25K", v<50000, "25-50K", v<100000, "50K-1L", v<200000, "1-2L", v<300000, "2-3L", v<400000, "3-4L", v<500000, "4-5L", TRUE, "5L+"))), CHOOSECOLS(q, 6, 7, 8))))`
    ]
  ];

  console.log(`Writing ${valuesPayload.length} rows to "${TAB_NAME}"!A1:Z${valuesPayload.length}...`);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${TAB_NAME}'!A1:Z${valuesPayload.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: valuesPayload }
  });

  // 3. Merges and Formats
  console.log('Applying professional slate styling, borders, and alignments...');
  const merges = [
    // Top banner
    { startRowIndex: 1, endRowIndex: 2, startColumnIndex: 1, endColumnIndex: 8 },
    { startRowIndex: 2, endRowIndex: 3, startColumnIndex: 1, endColumnIndex: 9 },
    // Tier 1 banner
    { startRowIndex: 6, endRowIndex: 7, startColumnIndex: 1, endColumnIndex: 9 },
    // KPI cards (each 2 cols wide)
    { startRowIndex: 7, endRowIndex: 8, startColumnIndex: 1, endColumnIndex: 3 },
    { startRowIndex: 8, endRowIndex: 9, startColumnIndex: 1, endColumnIndex: 3 },
    { startRowIndex: 9, endRowIndex: 10, startColumnIndex: 1, endColumnIndex: 3 },
    { startRowIndex: 7, endRowIndex: 8, startColumnIndex: 3, endColumnIndex: 5 },
    { startRowIndex: 8, endRowIndex: 9, startColumnIndex: 3, endColumnIndex: 5 },
    { startRowIndex: 9, endRowIndex: 10, startColumnIndex: 3, endColumnIndex: 5 },
    { startRowIndex: 7, endRowIndex: 8, startColumnIndex: 5, endColumnIndex: 7 },
    { startRowIndex: 8, endRowIndex: 9, startColumnIndex: 5, endColumnIndex: 7 },
    { startRowIndex: 9, endRowIndex: 10, startColumnIndex: 5, endColumnIndex: 7 },
    { startRowIndex: 7, endRowIndex: 8, startColumnIndex: 7, endColumnIndex: 9 },
    { startRowIndex: 8, endRowIndex: 9, startColumnIndex: 7, endColumnIndex: 9 },
    { startRowIndex: 9, endRowIndex: 10, startColumnIndex: 7, endColumnIndex: 9 },
    // Governance strip
    { startRowIndex: 10, endRowIndex: 11, startColumnIndex: 2, endColumnIndex: 4 },
    { startRowIndex: 10, endRowIndex: 11, startColumnIndex: 5, endColumnIndex: 9 },
    // Tier 2 banner
    { startRowIndex: 12, endRowIndex: 13, startColumnIndex: 1, endColumnIndex: 7 },
    // Tier 3 banner
    { startRowIndex: 22, endRowIndex: 23, startColumnIndex: 1, endColumnIndex: 9 },
    { startRowIndex: 23, endRowIndex: 24, startColumnIndex: 1, endColumnIndex: 9 }
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: {
      requests: [
        ...merges.map(m => ({
          mergeCells: {
            range: { sheetId, ...m },
            mergeType: 'MERGE_ALL'
          }
        })),
        // Style Top Banner
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 1, endColumnIndex: 9 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.08, green: 0.12, blue: 0.18 },
                textFormat: { bold: true, fontSize: 13, foregroundColor: { red: 1, green: 1, blue: 1 } },
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)'
          }
        },
        // Style Tier 1 Cards
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 7, endRowIndex: 8, startColumnIndex: 1, endColumnIndex: 9 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.94, green: 0.96, blue: 0.98 },
                textFormat: { bold: true, fontSize: 9, foregroundColor: { red: 0.28, green: 0.35, blue: 0.44 } },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        },
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 8, endRowIndex: 9, startColumnIndex: 1, endColumnIndex: 9 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 1, green: 1, blue: 1 },
                textFormat: { bold: true, fontSize: 15, foregroundColor: { red: 0.08, green: 0.12, blue: 0.18 } },
                horizontalAlignment: 'CENTER',
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
          }
        },
        // Tier 2 Table Header
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 13, endRowIndex: 14, startColumnIndex: 1, endColumnIndex: 7 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.08, green: 0.12, blue: 0.18 },
                textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 1, green: 1, blue: 1 } },
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)'
          }
        },
        // Tier 3 Table Header
        {
          repeatCell: {
            range: { sheetId, startRowIndex: 24, endRowIndex: 25, startColumnIndex: 1, endColumnIndex: 9 },
            cell: {
              userEnteredFormat: {
                backgroundColor: { red: 0.08, green: 0.12, blue: 0.18 },
                textFormat: { bold: true, fontSize: 10, foregroundColor: { red: 1, green: 1, blue: 1 } },
                verticalAlignment: 'MIDDLE'
              }
            },
            fields: 'userEnteredFormat(backgroundColor,textFormat,verticalAlignment)'
          }
        }
      ]
    }
  });

  console.log('✅ PID_Governance_Report deployed successfully with discrete price buckets and Inhouse_Clean_Staging link!');
}

main().catch(err => {
  console.error('Fatal error deploying sheet tab:', err);
  process.exit(1);
});
