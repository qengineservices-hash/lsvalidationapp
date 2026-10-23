const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

const TOKEN_PATH = path.join(__dirname, '..', 'token.json');
const SPREADSHEET_ID = '1oG4vMvJyZey0XlCOdqhreP4ki3fTUhpAdFLIFds2_Jo';
const TAB_NAME = 'Keyword Mapping Master';

async function main() {
  console.log('🚀 Creating Keyword Mapping Master tab in Scoring Master sheet...');
  const auth = google.auth.fromJSON(JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf8')));
  const sheets = google.sheets({ version: 'v4', auth });

  // 1. Check existing sheets
  const metaRes = await sheets.spreadsheets.get({ spreadsheetId: SPREADSHEET_ID });
  let existingSheet = metaRes.data.sheets.find(s => s.properties.title === TAB_NAME);
  let sheetId;

  if (existingSheet) {
    console.log(`Sheet "${TAB_NAME}" already exists (id: ${existingSheet.properties.sheetId}). Clearing contents...`);
    sheetId = existingSheet.properties.sheetId;
    await sheets.spreadsheets.values.clear({
      spreadsheetId: SPREADSHEET_ID,
      range: `'${TAB_NAME}'!A1:Z500`
    });
  } else {
    console.log(`Creating new sheet "${TAB_NAME}"...`);
    const addRes = await sheets.spreadsheets.batchUpdate({
      spreadsheetId: SPREADSHEET_ID,
      requestBody: {
        requests: [
          {
            addSheet: {
              properties: {
                title: TAB_NAME,
                gridProperties: {
                  rowCount: 200,
                  columnCount: 10,
                  frozenRowCount: 5
                },
                tabColor: { red: 0.12, green: 0.16, blue: 0.22 }
              }
            }
          }
        ]
      }
    });
    sheetId = addRes.data.replies[0].addSheet.properties.sheetId;
    console.log(`✅ Created "${TAB_NAME}" with sheetId: ${sheetId}`);
  }

  // 2. Set Column Widths
  const colWidths = [
    { start: 0, end: 1, width: 140 }, // A: Trade
    { start: 1, end: 2, width: 220 }, // B: Keyword / Pattern
    { start: 2, end: 3, width: 140 }, // C: Scope Classification
    { start: 3, end: 4, width: 240 }, // D: Match Rule & Target
    { start: 4, end: 5, width: 300 }, // E: Supply Sourcing Allocation Pool
    { start: 5, end: 6, width: 340 }, // F: Technical Rationale / Execution Complexity
    { start: 6, end: 7, width: 200 }  // G: Area Rate Threshold Rule
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

  // 3. Define the comprehensive keyword dictionary across 6 trades
  const keywordsData = [
    // Carpentry Specialised
    ['Carpentry', 'Duco / Duco Finish', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Carpentry Partner (Duco/PU qualified)', 'High-precision spray booth application, irreversible scrap liability', 'Standard override applies if rate > ₹2k'],
    ['Carpentry', 'PU / Polyurethane Finish', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Carpentry Partner (Duco/PU qualified)', 'Multi-coat automated sanding & polishing requirement', 'Standard override applies if rate > ₹2k'],
    ['Carpentry', 'Veneer / Veneer Finish', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Carpentry Partner (Veneer qualified)', 'Natural wood grain book-matching, high-cost sheet scrap liability', 'Standard override applies if rate > ₹2k'],
    ['Carpentry', 'Melamine Finish', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Carpentry Partner (Polish qualified)', 'Chemical sealing and high-gloss buffing craft requirement', 'Standard override applies if rate > ₹2k'],
    ['Carpentry', 'Lacquered Glass', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Carpentry Partner Pool', 'Specialty glass bonding and fragile panel handling', 'Standard override applies if rate > ₹2k'],
    ['Carpentry', 'Tinted Glass / Bevelled Mirror', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Carpentry Partner Pool', 'Diamond bevel edge cutting & fragile glass fixing', 'Standard override applies if rate > ₹2k'],
    ['Carpentry', 'Fluted Panel / Fluted MDF', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Carpentry Partner Pool', 'Precision CNC groove alignment and edge-sealing', 'Standard override applies if rate > ₹2k'],
    ['Carpentry', 'CNC / Jali Cutting', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Carpentry Partner Pool', 'Machine-cut intricate patterns requiring precision fitting', 'Standard override applies if rate > ₹2k'],
    ['Carpentry', 'Metallic / Brass Inlay / T-Patti', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Carpentry Partner Pool', 'Precision router channel embedding and metallic finishing', 'Standard override applies if rate > ₹2k'],
    ['Carpentry', 'Charcoal / Louvers Panel', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Carpentry Partner Pool', 'Specialty polymer interlocking slats and adhesive bonding', 'Standard override applies if rate > ₹2k'],
    ['Carpentry', 'Acoustic / Slat Panelling', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Carpentry Partner Pool', 'Acoustic absorption backing and precision spacing', 'Standard override applies if rate > ₹2k'],
    ['Carpentry', 'Curved Panelling / Camouflage Door', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Carpentry Partner Pool', 'Bending ply framing and hidden hardware alignment', 'Standard override applies if rate > ₹2k'],

    // Carpentry Standard
    ['Carpentry', 'Laminate / Matt Laminate', 'Standard', 'Item Title / Inclusions Only', 'General Carpentry Contractor Pool', 'Routine 1mm/0.8mm pre-laminated surface bonding', 'Auto-upgrade to Specialised ONLY if unit rate > ₹2k/SqFt'],
    ['Carpentry', 'Laminate Wall Panelling', 'Standard', 'Item Title / Inclusions Only (Ignore Exclusions)', 'General Carpentry Contractor Pool', 'Routine ply framing with standard laminate finish', 'Auto-upgrade to Specialised ONLY if unit rate > ₹2k/SqFt'],
    ['Carpentry', 'Base Work / Framing', 'Standard', 'Item Title / Inclusions Only', 'General Carpentry Contractor Pool', 'Standard 18mm/12mm MR ply framing assembly', 'Standard rate baseline'],
    ['Carpentry', 'Ply Packing / MDF Plain', 'Standard', 'Item Title / Inclusions Only', 'General Carpentry Contractor Pool', 'Raw substrate leveling and packing work', 'Standard rate baseline'],
    ['Carpentry', 'Bison Board / Cement Board', 'Standard', 'Item Title / Inclusions Only', 'General Carpentry Contractor Pool', 'Standard rigid board wall cladding', 'Standard rate baseline'],
    ['Carpentry', 'Wardrobe Carcass / Loft', 'Standard', 'Item Title / Inclusions Only', 'General Carpentry Contractor Pool', 'Linear modular box storage construction', 'Standard rate baseline'],
    ['Carpentry', 'Shelf / Drawer / Shutter Unit', 'Standard', 'Item Title / Inclusions Only', 'General Carpentry Contractor Pool', 'Commodity storage hardware & linear assembly', 'Standard rate baseline'],
    ['Carpentry', 'Pelmet / Trims / Edge Banding', 'Standard', 'Item Title / Inclusions Only', 'General Carpentry Contractor Pool', 'Standard linear finishing trims and PVC edge tape', 'Standard rate baseline'],
    ['Carpentry', 'Plain Mirror Fixing', 'Standard', 'Item Title / Inclusions Only', 'General Carpentry Contractor Pool', 'Standard silicone/tape adhesive mirror installation', 'Standard rate baseline'],

    // Civil Specialised
    ['Civil', 'Waterproofing / Water Repellent', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Civil Contractor (Waterproofing qualified)', 'Critical structural water ingress risk; requires chemical barrier warranty', 'Standard override applies if rate > ₹2k'],
    ['Civil', 'Brickbat Coba / Terrace Waterproofing', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Civil Contractor (Waterproofing qualified)', 'Heavy multi-layer structural slope and chemical slurry application', 'Standard override applies if rate > ₹2k'],
    ['Civil', 'Epoxy Grouting / Epoxy Screed', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Civil Contractor Pool', 'Two-component chemical mix requiring rapid pot-life application', 'Standard override applies if rate > ₹2k'],
    ['Civil', 'Core Cutting (>4" / >6" dia)', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Civil Contractor (Core cutting qualified)', 'Heavy diamond rotary equipment cutting through reinforced concrete', 'Standard override applies if rate > ₹2k'],
    ['Civil', 'Diamond Floor Polishing', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Civil Contractor (Stonework qualified)', 'Heavy motorized planetary grinders with diamond resin pads', 'Standard override applies if rate > ₹2k'],
    ['Civil', 'Italian Marble / Granite Moulding', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Civil Contractor (Precision Stonework)', 'High-value stone cutting, bullnosing, and chamfering craft', 'Standard override applies if rate > ₹2k'],
    ['Civil', 'RCC Chiselling / Mivan Demolition', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Civil Contractor Pool', 'Heavy pneumatic jackhammer work on shear walls', 'Standard override applies if rate > ₹2k'],

    // Civil Standard
    ['Civil', 'Floor Tiling / Vitrified Tile', 'Standard', 'Item Title / Inclusions Only', 'General Civil Contractor Pool', 'Routine adhesive/mortar tile laying', 'Auto-upgrade to Specialised ONLY if unit rate > ₹2k/SqFt'],
    ['Civil', 'Wall Tiling / Ceramic / Dado', 'Standard', 'Item Title / Inclusions Only', 'General Civil Contractor Pool', 'Routine vertical tile installation in kitchens/toilets', 'Auto-upgrade to Specialised ONLY if unit rate > ₹2k/SqFt'],
    ['Civil', 'Cement Plaster / Surface Screed', 'Standard', 'Item Title / Inclusions Only', 'General Civil Contractor Pool', 'Routine 1:4 / 1:6 sand cement wall plastering', 'Standard rate baseline'],
    ['Civil', 'POP Punning / Gypsum Punning (w/o mesh)', 'Standard', 'Item Title / Inclusions Only', 'General Civil Contractor Pool', 'Surface smoothing on masonry prior to painting', 'Standard rate baseline'],
    ['Civil', 'Demolition (Tiles, Plaster, Kitchen Counter)', 'Standard', 'Item Title / Inclusions Only', 'General Civil Contractor Pool', 'Standard manual hammer chipping and surface removal', 'Standard rate baseline'],
    ['Civil', 'Debris Disposal / Material Lifting', 'Standard', 'Item Title / Inclusions Only', 'General Civil Contractor Pool', 'Logistical labor support; non-technical', 'Standard rate baseline'],
    ['Civil', 'Floor Protection / Deep Cleaning', 'Standard', 'Item Title / Inclusions Only', 'General Civil Contractor Pool', 'Non-technical site prep and post-handover cleaning', 'Standard rate baseline'],

    // Electrical Specialised
    ['Electrical', 'Home Automation / Smart Switch', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Electrical Contractor (Automation qualified)', 'Low-voltage digital protocols, gateway setup, and sensor integration', 'Standard override applies if rate > ₹2k'],
    ['Electrical', 'Heavy Load (32A / 25A) Point', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Electrical Contractor Pool', 'High amperage industrial cabling, dedicated MCB/ELCB breaker routing', 'Standard override applies if rate > ₹2k'],
    ['Electrical', 'AC Piping (Copper Drain Loop)', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Electrical Contractor Pool', 'Concealed copper line brazing and pressure testing through walls', 'Standard override applies if rate > ₹2k'],
    ['Electrical', 'Distribution Board (DB) Replacement', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Electrical Contractor Pool', 'Mains power phase balancing and isolator reconfiguration', 'Standard override applies if rate > ₹2k'],
    ['Electrical', 'Single Line Diagram (SLD) Circuit', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Electrical Contractor Pool', 'Engineered electrical schematic compliance and heavy submetering', 'Standard override applies if rate > ₹2k'],
    ['Electrical', 'Chandelier / Heavy Pendant Assembly', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Electrical Contractor Pool', 'Ceiling structural weight load testing and multi-tier circuiting', 'Standard override applies if rate > ₹2k'],

    // Electrical Standard
    ['Electrical', 'Light Point (Primary / Secondary)', 'Standard', 'Item Title / Inclusions Only', 'Standard Electrician Pool', 'Standard 1.5 sqmm conduit wiring for ceiling/wall lighting', 'Standard rate baseline'],
    ['Electrical', 'Modular Switchboard (5A / 15A)', 'Standard', 'Item Title / Inclusions Only', 'Standard Electrician Pool', 'Routine 2/4/6/8-module plate and socket fitting', 'Standard rate baseline'],
    ['Electrical', 'Fan Fixing / Relocation', 'Standard', 'Item Title / Inclusions Only', 'Standard Electrician Pool', 'Standard hook mounting and regulator wiring', 'Standard rate baseline'],
    ['Electrical', 'Panel / Spot / Strip Light Fixing', 'Standard', 'Item Title / Inclusions Only', 'Standard Electrician Pool', 'Routine false ceiling cutout insertion and driver connection', 'Standard rate baseline'],
    ['Electrical', 'Wiring Relocation / Point Shifting', 'Standard', 'Item Title / Inclusions Only', 'Standard Electrician Pool', 'Pulling wires through existing PVC conduits', 'Standard rate baseline'],
    ['Electrical', 'Dummy Plate / Point Closing', 'Standard', 'Item Title / Inclusions Only', 'Standard Electrician Pool', 'Surface cover plate installation', 'Standard rate baseline'],

    // Plumbing Specialised
    ['Plumbing', 'Thermostat / Thermostatic Diverter', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Plumbing Partner Pool', 'Dual-inlet hot/cold temperature cartridge calibration in concealed walls', 'Standard override applies if rate > ₹2k'],
    ['Plumbing', 'Concealed Diverter / Body Jet', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Plumbing Partner Pool', 'High-pressure concealed manifold loop and multi-outlet alignment', 'Standard override applies if rate > ₹2k'],
    ['Plumbing', 'Rain Shower (Ceiling Suspended)', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Plumbing Partner Pool', 'Concealed overhead drop pipe anchoring and leak-proof jointing', 'Standard override applies if rate > ₹2k'],
    ['Plumbing', 'Wall-Hung Concealed Tank (Geberit/Grohe)', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Plumbing Partner Pool', 'In-wall frame bolting, flush pipe alignment, and dual-flush actuator', 'Standard override applies if rate > ₹2k'],
    ['Plumbing', 'Gas Geyser / Pressurized Piping', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Plumbing Partner Pool', 'Combustion/gas line code compliance and pressure bar certification', 'Standard override applies if rate > ₹2k'],

    // Plumbing Standard
    ['Plumbing', 'Sink & Tap Fixing / Replacement', 'Standard', 'Item Title / Inclusions Only', 'Standard Plumber Pool', 'Routine deck-mounted faucet and drain basket fitting', 'Standard rate baseline'],
    ['Plumbing', 'Bib Cock / Angle Valve / Health Faucet', 'Standard', 'Item Title / Inclusions Only', 'Standard Plumber Pool', 'Standard external CP fitting threading with Teflon tape', 'Standard rate baseline'],
    ['Plumbing', 'Bottle Trap / Waste Pipe', 'Standard', 'Item Title / Inclusions Only', 'Standard Plumber Pool', 'Standard PVC/brass drainage connection under basins', 'Standard rate baseline'],
    ['Plumbing', 'Standard Water Inlet / Drain Point', 'Standard', 'Item Title / Inclusions Only', 'Standard Plumber Pool', 'Routine CPVC/UPVC pipe run within 10–15 feet', 'Standard rate baseline'],
    ['Plumbing', 'RO Point / Geyser Inlet Connection', 'Standard', 'Item Title / Inclusions Only', 'Standard Plumber Pool', 'Standard angle valve tapping for domestic appliances', 'Standard rate baseline'],
    ['Plumbing', 'Dummy Plug / Closing of Point', 'Standard', 'Item Title / Inclusions Only', 'Standard Plumber Pool', 'Brass/CP threaded plug insertion', 'Standard rate baseline'],

    // False Ceiling Specialised
    ['False Ceiling', 'Curved / Vaulted Ceiling', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Ceiling Partner Pool', 'Complex radius metal bending and flexible board shaping', 'Standard override applies if rate > ₹2k'],
    ['False Ceiling', 'Wooden / Baffle Ceiling', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Ceiling Partner Pool', 'Precision wood veneer slat suspension and spacing alignment', 'Standard override applies if rate > ₹2k'],
    ['False Ceiling', 'PVC Ceiling Panel', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Ceiling Partner Pool', 'Interlocking hollow plastic panel tongue-and-groove assembly', 'Standard override applies if rate > ₹2k'],
    ['False Ceiling', 'Acoustic / Perforated Grid Ceiling', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Ceiling Partner Pool', 'Specialty mineral fiber tiles and exposed T-grid leveling', 'Standard override applies if rate > ₹2k'],
    ['False Ceiling', 'Cove with Profile Light Gala', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Ceiling Partner Pool', 'Integrated aluminum profile light recess channel routing', 'Standard override applies if rate > ₹2k'],

    // False Ceiling Standard
    ['False Ceiling', 'Plain Gypsum False Ceiling', 'Standard', 'Item Title / Inclusions Only', 'Standard False Ceiling Pool', 'Standard 12.5mm gypsum board suspended on GI perimeter framework', 'Standard rate baseline'],
    ['False Ceiling', 'Peripheral Ceiling (Without Cove)', 'Standard', 'Item Title / Inclusions Only', 'Standard False Ceiling Pool', 'Linear perimeter soffit drop framing', 'Standard rate baseline'],
    ['False Ceiling', 'Standard Gypsum Cove', 'Standard', 'Item Title / Inclusions Only', 'Standard False Ceiling Pool', 'Routine light upstand cove lip construction', 'Standard rate baseline'],
    ['False Ceiling', 'Gala Cutting (Spot Light Cutout)', 'Standard', 'Item Title / Inclusions Only', 'Standard False Ceiling Pool', 'Routine circular hole-saw cutting for recessed downlights', 'Standard rate baseline'],
    ['False Ceiling', 'Trap Door in Ceiling', 'Standard', 'Item Title / Inclusions Only', 'Standard False Ceiling Pool', 'Standard hinged access hatch for AC/geyser maintenance', 'Standard rate baseline'],

    // Painting Specialised
    ['Painting', 'Texture Paint (Archi / Rustic / Stucco)', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Texture Applicator Pool', 'Handcrafted trowel/roller textural relief patterns (Asian Archi, Concrete, Stucco)', 'Standard override applies if rate > ₹2k'],
    ['Painting', 'Metallic Texture / Velvet Finish', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Texture Applicator Pool', 'Specialty reflective multi-directional glaze application', 'Standard override applies if rate > ₹2k'],
    ['Painting', 'Exterior Apex / Ace (Facade Painting)', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Painter Pool (Scaffolding qualified)', 'High-rise scaffolding access, weather-shield silicone primer & exterior emulsion', 'Standard override applies if rate > ₹2k'],
    ['Painting', 'Wood Polish (PU / Melamine / Lamination)', 'Specialised', 'Item Title / Inclusions Only', 'Specialist Wood Polisher Pool', 'Multi-stage stain application, grain filler buffing, and solvent-based topcoat', 'Standard override applies if rate > ₹2k'],

    // Painting Standard
    ['Painting', 'Premium Emulsion (Apcolite / Tractor)', 'Standard', 'Item Title / Inclusions Only', 'Standard Painter Pool', 'Routine 2 coats interior water-based wall emulsion rolling', 'Standard rate baseline'],
    ['Painting', 'Royale / Royale Shyne Emulsion', 'Standard', 'Item Title / Inclusions Only', 'Standard Painter Pool', 'Standard luxury smooth finish roller application', 'Standard rate baseline'],
    ['Painting', 'Fresh Painting (Putty + Primer + Paint)', 'Standard', 'Item Title / Inclusions Only', 'Standard Painter Pool', 'Standard 3-stage wall prep and 2-coat painting', 'Standard rate baseline'],
    ['Painting', 'Repainting (Touch-up / 1 Pr + 2 Pa)', 'Standard', 'Item Title / Inclusions Only', 'Standard Painter Pool', 'Routine surface cleaning and maintenance coat rolling', 'Standard rate baseline'],
    ['Painting', 'Base Preparation / Putty Application', 'Standard', 'Item Title / Inclusions Only', 'Standard Painter Pool', 'Routine wall sanding and skim-coat putty application', 'Standard rate baseline'],
    ['Painting', 'Primer Coat / Sanding', 'Standard', 'Item Title / Inclusions Only', 'Standard Painter Pool', 'Routine preparatory sealing and smoothing', 'Standard rate baseline']
  ];

  const fullPayload = [
    ['LIVSPACE SERVICES — KEYWORD MAPPING MASTER (SPECIALISED VS STANDARD)'],
    ['Comprehensive Trade-by-Trade Keyword Dictionary for Scope Classification and Supply Partner Pool Routing.'],
    ['STRICT GOVERNANCE RULE: Keywords match against Item Title & Inclusions ONLY. Terms appearing inside "Exclusions" or "NA" metadata must NEVER trigger Specialised classification.'],
    [],
    [
      'Trade (Super Category)',
      'Keyword / Pattern Phrase',
      'Scope Classification',
      'Match Rule & Target',
      'Supply Sourcing Allocation Pool',
      'Technical Rationale / Execution Complexity',
      'Area Rate Threshold Rule'
    ],
    ...keywordsData
  ];

  console.log(`Writing ${fullPayload.length} rows to "${TAB_NAME}"...`);
  await sheets.spreadsheets.values.update({
    spreadsheetId: SPREADSHEET_ID,
    range: `'${TAB_NAME}'!A1:G${fullPayload.length}`,
    valueInputOption: 'USER_ENTERED',
    requestBody: { values: fullPayload }
  });

  // 4. Format tab with Slate & Pearl High-Contrast Styling
  console.log('Applying Slate & Pearl Executive Styling...');
  const formatRequests = [
    // Title (Row 1)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 0, endRowIndex: 1, startColumnIndex: 0, endColumnIndex: 7 },
        cell: {
          userEnteredFormat: {
            textFormat: { fontSize: 14, bold: true, foregroundColor: { red: 0.09, green: 0.12, blue: 0.17 } }
          }
        },
        fields: 'userEnteredFormat.textFormat'
      }
    },
    // Subtitle (Row 2)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 1, endRowIndex: 2, startColumnIndex: 0, endColumnIndex: 7 },
        cell: {
          userEnteredFormat: {
            textFormat: { fontSize: 10, italic: true, foregroundColor: { red: 0.39, green: 0.45, blue: 0.55 } }
          }
        },
        fields: 'userEnteredFormat.textFormat'
      }
    },
    // Policy Note (Row 3)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 2, endRowIndex: 3, startColumnIndex: 0, endColumnIndex: 7 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.99, green: 0.95, blue: 0.90 }, // Soft Amber warning #fef3c7
            textFormat: { fontSize: 10, bold: true, foregroundColor: { red: 0.57, green: 0.25, blue: 0.05 } }
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat)'
      }
    },
    // Table Header (Row 5 / index 4)
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 4, endRowIndex: 5, startColumnIndex: 0, endColumnIndex: 7 },
        cell: {
          userEnteredFormat: {
            backgroundColor: { red: 0.12, green: 0.16, blue: 0.22 }, // Dark Slate #1e293b
            textFormat: { fontSize: 10, bold: true, foregroundColor: { red: 1, green: 1, blue: 1 } },
            horizontalAlignment: 'CENTER',
            verticalAlignment: 'MIDDLE'
          }
        },
        fields: 'userEnteredFormat(backgroundColor,textFormat,horizontalAlignment,verticalAlignment)'
      }
    },
    // Scope Tag Column (Col C / index 2) - Center aligned & bold
    {
      repeatCell: {
        range: { sheetId, startRowIndex: 5, endRowIndex: fullPayload.length, startColumnIndex: 2, endColumnIndex: 3 },
        cell: {
          userEnteredFormat: {
            textFormat: { fontSize: 10, bold: true },
            horizontalAlignment: 'CENTER'
          }
        },
        fields: 'userEnteredFormat(textFormat,horizontalAlignment)'
      }
    }
  ];

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: SPREADSHEET_ID,
    requestBody: { requests: formatRequests }
  });

  console.log(`✅ Tab "${TAB_NAME}" successfully created and formatted!`);
  console.log(`URL: https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/edit#gid=${sheetId}`);
}

main().catch(err => {
  console.error('❌ Error creating keyword sheet:', err);
  process.exit(1);
});
