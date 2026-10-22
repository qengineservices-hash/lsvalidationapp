import mrcData from './mrc_data.json';

export interface RoomParams {
  id: string;
  name: string;
  length: number; // in feet
  width: number; // in feet
  height: number; // in feet
  
  // Painting parameters
  paintingEnabled: boolean;
  wallCondition: 'smooth' | 'chipped' | 'undulated' | 'seepage' | 'non_plastered';
  paintQuality: 'tractor' | 'premium' | 'royale' | 'texture';
  applicablePaintArea: 'walls_ceiling' | 'walls' | 'ceiling';
  
  doorDeductionsList: { length: number; width: number }[];
  windowDeductionsList: { length: number; width: number }[];
  wardrobeDeductionsList: { length: number; width: number }[];
  
  includeWoodworkEnamel: boolean;
  woodworkEnamelArea: number;
  
  workingHeightMultiplier: 1 | 1.5 | 2;
  
  // Specific Add-ons
  wallpaperAddon: { enabled: boolean; sku: string; walls: string[]; customArea: number };
  textureAddon: { enabled: boolean; walls: string[]; customArea: number };
  enamelAddon: { enabled: boolean; customArea: number };
  multiColorAddon: { enabled: boolean; walls: string[]; customArea: number };
  paintableTrims: { enabled: boolean; rft: number };
  groovesPainting: { enabled: boolean; rft: number };
  
  darkShadeWalls: string[]; // e.g., ["A", "B"]

  // False Ceiling parameters
  fcEnabled: boolean;
  fcType: 'none' | 'peripheral' | 'full' | 'l_band' | 'u_band' | 'box';
  fcWidth: number; // width in feet (1, 1.5, 2)
  fcMaterial: 'standard_gypsum' | 'premium_gypsum' | 'pop';
  fcElectricalIncluded: boolean;
  lightsSuppliedByUs: boolean; // New Contextual Prompt
  fcCoveEnabled: boolean;
  fcGalaCutouts: number;
  fcCurtainPelmetLength: number;
  fcCurvedDesignLength: number;
  fcAddOns: string[]; // e.g., ["PVC Trims", "Grooves / Borders"]

  // Electrical parameters
  electricalEnabled: boolean;
  electricalPackage: 'none' | 'pkg_25' | 'pkg_30';
  newPrimaryPoints: number;
  newSecondaryPoints: number;
  wallPrimaryPoints: number;
  wallSecondaryPoints: number;
  relocationsCount: number;
  acPointsCount: number;
  conduitLayingLength: number;
  wallType: 'brick' | 'concrete';
  electricalAddOns: string[]; // e.g., ["Fan Fixing", "Chandelier Fixing", "Tube Light Fixing"]

  // Plumbing parameters
  plumbingEnabled: boolean;
  plumbingPackage: 'none' | 'toilet_pkg' | 'kitchen_pkg';
  internalPlumbingLine: 'none' | 'cold' | 'cold_hot';
  plumbingWaterproofing: boolean;
  wcType: 'none' | 'floor' | 'wall';
  washBasinsCount: number;
  tapsCount: number;
  geysersCount: number;
  kitchenSinksCount: number;
  plumbingAddOns: string[]; // e.g., ["Mixer Installation", "Shower Panel Installation"]
}

export interface GlobalParams {
  city: string;
  floorNumber: number;
  liftAvailable: boolean;
  workingHoursRestricted: boolean;
  // Site-level constraints (designer toggles)
  waterAvailable: boolean;
  powerAvailable: boolean;
  nocRequired: boolean;
  debrisRemovalByVendor: boolean;
  vehicleEntryRestricted: boolean;
  societyWorkingHours: number;
}

export interface CatalogItem {
  skuCode: string;
  itemName: string;
  description: string;
  uom: string;
  unitRate: number;
}

export interface SkuMappingRule {
  category: string;
  conditions: Record<string, string | boolean>;
  mappedSkuCode: string;
}

export interface BusinessRules {
  // Painting rules
  paintingMoqArea: number;
  premiumMaterialMinArea: number; // New minimum area for premium materials
  waterproofingRatePerSqft: number;
  punningRatePerSqft: number;
  conditionScopeMap: {
    smooth: 'repaint' | 'fresh';
    chipped: 'repaint' | 'fresh';
    undulated: 'repaint' | 'fresh';
    seepage: 'repaint' | 'fresh';
    non_plastered: 'repaint' | 'fresh';
  };
  // False Ceiling rules
  fcMoqArea: number;
  coveRatePerRft: number;
  pelmetRatePerRft: number;
  curveSurchargePerRft: number;
  // Electrical rules
  acConduitLengthPerPoint: number;
  concreteChiselMultiplier: number;
  // Plumbing rules
  wetAreaWaterproofRate: number;
  // Global rules
  noLiftCarrySurchargeFloorStart: number;
  noLiftCarrySurchargePerFloor: number;
  restrictedHoursFee: number;
  // Site constraint surcharges (configurable by category team)
  waterTankerSurcharge: number;
  generatorSurcharge: number;
  debrisRemovalSurcharge: number;
  vehicleEntryManualCarry: number;
  // Phase 3: Catalog and Mappings
  catalog: CatalogItem[];
  skuMappings: SkuMappingRule[];
}

export const DEFAULT_BUSINESS_RULES: BusinessRules = {
  paintingMoqArea: 300,
  premiumMaterialMinArea: 100,
  waterproofingRatePerSqft: 45,
  punningRatePerSqft: 35,
  conditionScopeMap: {
    smooth: 'repaint',
    chipped: 'fresh',
    undulated: 'fresh',
    seepage: 'fresh',
    non_plastered: 'fresh'
  },
  fcMoqArea: 200,
  coveRatePerRft: 180,
  pelmetRatePerRft: 120,
  curveSurchargePerRft: 150,
  acConduitLengthPerPoint: 30,
  concreteChiselMultiplier: 1.5,
  wetAreaWaterproofRate: 60,
  noLiftCarrySurchargeFloorStart: 2,
  noLiftCarrySurchargePerFloor: 1200,
  restrictedHoursFee: 2500,
  // Site constraint surcharges
  waterTankerSurcharge: 3500,
  generatorSurcharge: 4000,
  debrisRemovalSurcharge: 3000,
  vehicleEntryManualCarry: 1500,
  
  // Phase 3: Catalog and Mappings
  catalog: [
    { skuCode: "SKU-PNT-TRAC-FRSH", itemName: "Asian Tractor Emulsion Fresh Painting", description: "2 coats Putty + 1 coat Primer + 2 coats Paint", uom: "Sqft", unitRate: 28 },
    { skuCode: "SKU-PNT-TRAC-REP", itemName: "Asian Tractor Emulsion Re Painting", description: "1 coat Primer + 2 coats Paint", uom: "Sqft", unitRate: 18 },
    { skuCode: "SKU-PNT-PREM-FRSH", itemName: "Asian Apcolite Premium Fresh Painting", description: "2 coats Putty + 1 coat Primer + 2 coats Paint", uom: "Sqft", unitRate: 35 },
    { skuCode: "SKU-PNT-PREM-REP", itemName: "Asian Apcolite Premium Re Painting", description: "1 coat Primer + 2 coats Paint", uom: "Sqft", unitRate: 22 },
    { skuCode: "SKU-PNT-ROYL-FRSH", itemName: "Asian Royale luxury Fresh Painting", description: "2 coats Putty + 1 coat Primer + 2 coats Paint", uom: "Sqft", unitRate: 45 },
    { skuCode: "SKU-PNT-ROYL-REP", itemName: "Asian Royale luxury Re Painting", description: "1 coat Primer + 2 coats Paint", uom: "Sqft", unitRate: 30 },
    { skuCode: "SKU-PNT-TEXT-FRSH", itemName: "Texture Finish Fresh Painting", description: "Base Coat + Texture Pattern + Top Coat", uom: "Sqft", unitRate: 85 },
    { skuCode: "SKU-PNT-TEXT-REP", itemName: "Texture Finish Re Painting", description: "Base Coat + Texture Pattern", uom: "Sqft", unitRate: 65 },
    { skuCode: "SKU-PNT-WALLPAPER", itemName: "Standard Wallpaper Installation", description: "Adhesive + Wallpaper application", uom: "Sqft", unitRate: 55 },
    { skuCode: "SKU-WP-PREMIUM", itemName: "Premium Wallpaper Collection", description: "Premium Vinyl Wallpaper", uom: "Sqft", unitRate: 85 },
    { skuCode: "SKU-WP-LUXURY", itemName: "Luxury Custom Wallpaper", description: "Designer luxury wallpaper", uom: "Sqft", unitRate: 150 },
    { skuCode: "SKU-WP-BASEPREP", itemName: "Wallpaper Base Preparation", description: "Putty and primer specifically for wallpaper", uom: "Sqft", unitRate: 15 },
    { skuCode: "SKU-TEX-BASEPREP", itemName: "Texture Base Preparation", description: "Base levelling for texture paint", uom: "Sqft", unitRate: 12 },
    { skuCode: "SKU-PNT-TRIMS", itemName: "Paintable Trims / Moldings", description: "Enamel/PU paint on trims", uom: "Rft", unitRate: 45 },
    { skuCode: "SKU-PNT-GROOVES", itemName: "Grooves Painting", description: "Precision painting inside wall grooves", uom: "Rft", unitRate: 25 },
    { skuCode: "SKU-CIVIL-PLASTERING", itemName: "Wall Plastering (Civil)", description: "Cement sand plastering", uom: "Sqft", unitRate: 40 },
    { skuCode: "SKU-SCAFFOLDING", itemName: "Scaffolding Surcharge", description: "Double height working scaffolding", uom: "Sqft", unitRate: 25 },
    { skuCode: "SKU-MASKING-TAPE", itemName: "Design Masking Surcharge", description: "Labor and masking tape for multi-color blocks", uom: "Lumpsum", unitRate: 850 },
    
    { skuCode: "SKU-FC-GYP-STD-FULL", itemName: "Standard Gypsum False Ceiling", description: "Full Ceiling Raft", uom: "Sqft", unitRate: 110 },
    { skuCode: "SKU-FC-GYP-STD-PERI", itemName: "Standard Gypsum Peripheral Without Cov", description: "Peripheral Band", uom: "Sqft", unitRate: 95 },
    
    { skuCode: "SKU-ELEC-PKG-25", itemName: "Electrical Installation Package (25 Points)", description: "Complete package for 25 points", uom: "Package", unitRate: 14500 },
    { skuCode: "SKU-ELEC-PKG-30", itemName: "Electrical Installation Package (30 Points)", description: "Complete package for 30 points", uom: "Package", unitRate: 17500 },
    { skuCode: "SKU-ELEC-PT-PRIM", itemName: "False ceiling Primary Light Point", description: "Wiring, looping and conduiting", uom: "Nos", unitRate: 750 },
    { skuCode: "SKU-ELEC-PT-SEC", itemName: "False ceiling Secondary Light Point", description: "Wiring and looping", uom: "Nos", unitRate: 450 },
    { skuCode: "SKU-ELEC-PT-WALL", itemName: "Wall Primary Point", description: "Wiring, looping and conduiting", uom: "Nos", unitRate: 750 },
    { skuCode: "SKU-ELEC-PT-WALL-SEC", itemName: "Wall Secondary point", description: "Wiring and looping", uom: "Nos", unitRate: 450 },
    { skuCode: "SKU-ELEC-FAN-FIX", itemName: "Fan Fixing", description: "Manpower and material for fixing fan", uom: "Nos", unitRate: 250 },
    { skuCode: "SKU-ELEC-SHIFT", itemName: "Fan Shifting", description: "Relocation of existing fan", uom: "Nos", unitRate: 350 },
    { skuCode: "SKU-ELEC-RELOC", itemName: "Relocation of Existing Point", description: "Relocate switchboard", uom: "Nos", unitRate: 350 },
    { skuCode: "SKU-ELEC-CIRCUIT", itemName: "Circuit wiring 4 sqmm", description: "Power run circuit wiring", uom: "Rft", unitRate: 95 },
    { skuCode: "SKU-ELEC-AC-BOX", itemName: "3 Module AC Switchboard", description: "AC Switchboard", uom: "Nos", unitRate: 1200 },
    { skuCode: "SKU-ELEC-COND", itemName: "Conduiting of Electrical", description: "Conduit laying", uom: "Rft", unitRate: 85 },
    
    { skuCode: "SKU-PLM-PKG-TOILET", itemName: "Complete Toilet Package", description: "Full toilet remodeling plumbing package", uom: "Package", unitRate: 14500 },
    { skuCode: "SKU-PLM-PKG-KITCHEN", itemName: "Kitchen Plumbing Package", description: "Complete kitchen plumbing works", uom: "Package", unitRate: 9500 },
    { skuCode: "SKU-PLM-LINE-COLD", itemName: "Cold water Plumbing line", description: "Single supply line", uom: "Nos", unitRate: 2500 },
    { skuCode: "SKU-PLM-LINE-HOT", itemName: "Cold and Hot water Plumbing line", description: "Dual supply lines", uom: "Nos", unitRate: 3500 },
    { skuCode: "SKU-PLM-WC-FLR", itemName: "Western WC - Floor Mounted", description: "Floor mounted WC installation", uom: "Nos", unitRate: 2200 },
    { skuCode: "SKU-PLM-WC-WALL", itemName: "Western WC - Wall Mounted", description: "Concealed wall mounted WC", uom: "Nos", unitRate: 2800 },
    { skuCode: "SKU-PLM-WB", itemName: "Wash Basin Installation", description: "Wash basin fixing", uom: "Nos", unitRate: 950 },
    { skuCode: "SKU-PLM-GEYSER", itemName: "Geyser Installation", description: "Geyser fixing", uom: "Nos", unitRate: 850 },
    { skuCode: "SKU-PLM-SINK", itemName: "Kitchen Sink Installation", description: "Kitchen sink fixing", uom: "Nos", unitRate: 1200 },
    { skuCode: "SKU-PLM-MIXER", itemName: "Mixer Tap Installation", description: "Hot/Cold mixer tap", uom: "Nos", unitRate: 750 }
  ],
  skuMappings: [
    // Painting Mappings
    { category: "painting", conditions: { paintQuality: "tractor", scope: "fresh" }, mappedSkuCode: "SKU-PNT-TRAC-FRSH" },
    { category: "painting", conditions: { paintQuality: "tractor", scope: "repaint" }, mappedSkuCode: "SKU-PNT-TRAC-REP" },
    { category: "painting", conditions: { paintQuality: "premium", scope: "fresh" }, mappedSkuCode: "SKU-PNT-PREM-FRSH" },
    { category: "painting", conditions: { paintQuality: "premium", scope: "repaint" }, mappedSkuCode: "SKU-PNT-PREM-REP" },
    { category: "painting", conditions: { paintQuality: "royale", scope: "fresh" }, mappedSkuCode: "SKU-PNT-ROYL-FRSH" },
    { category: "painting", conditions: { paintQuality: "royale", scope: "repaint" }, mappedSkuCode: "SKU-PNT-ROYL-REP" },
    { category: "painting", conditions: { paintQuality: "texture", scope: "fresh" }, mappedSkuCode: "SKU-PNT-TEXT-FRSH" },
    { category: "painting", conditions: { paintQuality: "texture", scope: "repaint" }, mappedSkuCode: "SKU-PNT-TEXT-REP" },
    
    // False Ceiling Mappings
    { category: "false_ceiling", conditions: { fcMaterial: "standard_gypsum", fcType: "full" }, mappedSkuCode: "SKU-FC-GYP-STD-FULL" },
    { category: "false_ceiling", conditions: { fcMaterial: "standard_gypsum", fcType: "peripheral" }, mappedSkuCode: "SKU-FC-GYP-STD-PERI" },
    { category: "false_ceiling", conditions: { fcMaterial: "standard_gypsum", fcType: "l_band" }, mappedSkuCode: "SKU-FC-GYP-STD-PERI" },
    { category: "false_ceiling", conditions: { fcMaterial: "standard_gypsum", fcType: "u_band" }, mappedSkuCode: "SKU-FC-GYP-STD-PERI" },
    
    // Electrical Package Mappings
    { category: "electrical_package", conditions: { electricalPackage: "pkg_25" }, mappedSkuCode: "SKU-ELEC-PKG-25" },
    { category: "electrical_package", conditions: { electricalPackage: "pkg_30" }, mappedSkuCode: "SKU-ELEC-PKG-30" },
    
    // Plumbing Package Mappings
    { category: "plumbing_package", conditions: { plumbingPackage: "toilet_pkg" }, mappedSkuCode: "SKU-PLM-PKG-TOILET" },
    { category: "plumbing_package", conditions: { plumbingPackage: "kitchen_pkg" }, mappedSkuCode: "SKU-PLM-PKG-KITCHEN" },
    
    // Plumbing WC Mappings
    { category: "plumbing_wc", conditions: { wcType: "floor" }, mappedSkuCode: "SKU-PLM-WC-FLR" },
    { category: "plumbing_wc", conditions: { wcType: "wall" }, mappedSkuCode: "SKU-PLM-WC-WALL" }
  ]
};

export interface BOMItem {
  id: string;
  skuCode?: string;
  superCategory: string;
  subSuperCategory: string;
  itemName: string;
  description: string;
  specification: string;
  brand: string;
  unit: string;
  quantity: number;
  rate: number;
  total: number;
  source: 'derived' | 'add-on' | 'global_constraint';
  decisionTrigger?: string;
}

export interface AuditLog {
  timestamp: string;
  category: 'painting' | 'false_ceiling' | 'electrical' | 'plumbing' | 'global';
  type: 'info' | 'warning' | 'auto_override' | 'constraint';
  message: string;
}

export interface CalculationResult {
  bom: BOMItem[];
  auditLogs: AuditLog[];
  totals: {
    painting: number;
    falseCeiling: number;
    electrical: number;
    plumbing: number;
    globalConstraints: number;
    grandTotal: number;
  };
  roomBreakdowns: Record<string, {
    paintingArea: number;
    fcArea: number;
    roomTotal: number;
  }>;
}

// Find item in rate card
function findRateCardItem(superCat: string, itemName: string) {
  return mrcData.find(item => 
    item.super_category.toLowerCase() === superCat.toLowerCase() && 
    item.item_name.toLowerCase().trim() === itemName.toLowerCase().trim()
  );
}

// Helper to get city rate with fallback
function getCityRate(item: any, city: string) {
  if (!item || !item.city_rates) return { unit: 'Sqft', rate: 0, minQty: 0, minVal: 0 };
  
  let rates = item.city_rates[city];
  
  // If rates are missing or rate is zero, look for any city with a valid non-zero rate
  if (!rates || !rates.cx_price) {
    const nonZeroCity = Object.keys(item.city_rates).find(
      c => item.city_rates[c] && item.city_rates[c].cx_price > 0
    );
    if (nonZeroCity) {
      rates = item.city_rates[nonZeroCity];
    } else {
      rates = item.city_rates['Bangalore'];
    }
  }

  if (!rates) {
    return { unit: 'Sqft', rate: 0, minQty: 0, minVal: 0 };
  }

  let rate = rates.cx_price || 0;
  if (rate === 0) {
    const name = (item.item_name || '').toLowerCase();
    if (name.includes('primary light point') || name.includes('primary point')) {
      rate = 750;
    } else if (name.includes('secondary light point') || name.includes('secondary point')) {
      rate = 450;
    } else if (name.includes('relocation of existing')) {
      rate = 350;
    } else if (name.includes('circuit wiring')) {
      rate = 95;
    } else if (name.includes('conduiting')) {
      rate = 85;
    } else if (name.includes('standard gypsum false ceiling') || name.includes('plain')) {
      rate = 110;
    } else if (name.includes('peripheral without cov')) {
      rate = 95;
    } else if (name.includes('peripheral + central drop')) {
      rate = 125;
    } else if (name.includes('toilet plumbing') || name.includes('toilet package')) {
      rate = 14500;
    } else if (name.includes('kitchen plumbing')) {
      rate = 9500;
    } else if (name.includes('western wc')) {
      rate = 2200;
    } else if (name.includes('wash basin')) {
      rate = 950;
    } else if (name.includes('geyser')) {
      rate = 850;
    } else if (name.includes('kitchen sink')) {
      rate = 1200;
    } else if (name.includes('mixer')) {
      rate = 750;
    } else if (name.includes('fan fixing')) {
      rate = 250;
    } else if (name.includes('fresh painting')) {
      rate = 28;
    } else if (name.includes('re painting') || name.includes('repainting')) {
      rate = 18;
    }
  }

  return {
    unit: rates.unit || 'Sqft',
    rate: rate,
    minQty: rates.min_qty || 0,
    minVal: rates.min_order_value || 0
  };
}

// Phase 3: Helper to resolve SKU from mappings
function resolveSku(category: string, conditions: Record<string, string | boolean>, rules: BusinessRules): CatalogItem | null {
  const mapping = rules.skuMappings.find(m => {
    if (m.category !== category) return false;
    for (const [key, value] of Object.entries(m.conditions)) {
      if (conditions[key] !== value) return false;
    }
    return true;
  });

  if (mapping) {
    return rules.catalog.find(c => c.skuCode === mapping.mappedSkuCode) || null;
  }
  return null;
}

export function calculateQuote(
  rooms: RoomParams[], 
  global: GlobalParams,
  rules: BusinessRules = DEFAULT_BUSINESS_RULES
): CalculationResult {
  const bom: BOMItem[] = [];
  const auditLogs: AuditLog[] = [];
  const roomBreakdowns: Record<string, { paintingArea: number; fcArea: number; roomTotal: number }> = {};
  
  let totalPaintingAreaHome = 0;
  let totalFCAreaHome = 0;
  let hasSeepageInHome = false;

  let paintingSubtotal = 0;
  let fcSubtotal = 0;
  let electricalSubtotal = 0;
  let plumbingSubtotal = 0;
  let globalSubtotal = 0;

  // Track room breakdowns first
  rooms.forEach(room => {
    roomBreakdowns[room.id] = { paintingArea: 0, fcArea: 0, roomTotal: 0 };
  });

  // 1. PROCESS EACH ROOM
  rooms.forEach(room => {
    let roomTotal = 0;
    const timestamp = new Date().toISOString();

    // ==========================================
    // A. FALSE CEILING CALCULATIONS
    // ==========================================
    let roomFCArea = 0;
    let roomFCPerimeter = 0;
    
    if (room.fcEnabled && room.fcType !== 'none') {
      const L = room.length;
      const W = room.width;
      const w = room.fcWidth || 2; // default 2ft

      // Calculate area and perimeter based on shapes with corner deductions
      switch (room.fcType) {
        case 'full':
          roomFCArea = L * W;
          roomFCPerimeter = 2 * (L + W);
          auditLogs.push({
            timestamp,
            category: 'false_ceiling',
            type: 'info',
            message: `[${room.name}] Calculated Full Raft FC area: ${roomFCArea} sqft (L:${L} x W:${W}).`
          });
          break;
        case 'peripheral':
          // Corner deduction logic: 4 corners of overlap (w * w)
          roomFCArea = 2 * (L + W) * w - 4 * (w * w);
          roomFCPerimeter = 2 * ((L - 2 * w) + (W - 2 * w));
          auditLogs.push({
            timestamp,
            category: 'false_ceiling',
            type: 'info',
            message: `[${room.name}] Calculated Peripheral FC area: ${roomFCArea} sqft. Perimeter: ${roomFCPerimeter} RFT. Corner overlap deducted: ${4 * (w * w)} sqft.`
          });
          break;
        case 'l_band':
          // 2 adjacent walls band, 1 corner overlap
          roomFCArea = (L * w) + (W * w) - (w * w);
          roomFCPerimeter = L + W - w;
          auditLogs.push({
            timestamp,
            category: 'false_ceiling',
            type: 'info',
            message: `[${room.name}] Calculated L-Band FC area: ${roomFCArea} sqft. Corner overlap deducted: ${w * w} sqft.`
          });
          break;
        case 'u_band':
          // 3 walls band, 2 corner overlaps
          roomFCArea = (2 * W + L) * w - 2 * (w * w);
          roomFCPerimeter = (L - 2 * w) + 2 * (W - w);
          auditLogs.push({
            timestamp,
            category: 'false_ceiling',
            type: 'info',
            message: `[${room.name}] Calculated U-Band FC area: ${roomFCArea} sqft. Corner overlap deducted: ${2 * w * w} sqft.`
          });
          break;
        case 'box':
          // floating box
          roomFCArea = Math.min(L * W, 24); // mock floating box size 4x6=24 or smaller
          roomFCPerimeter = 2 * (4 + 6);
          auditLogs.push({
            timestamp,
            category: 'false_ceiling',
            type: 'info',
            message: `[${room.name}] Calculated Box/Island FC area: ${roomFCArea} sqft.`
          });
          break;
      }

      totalFCAreaHome += roomFCArea;
      roomBreakdowns[room.id].fcArea = roomFCArea;

      // Feasibility checks
      if (room.height < 9) {
        auditLogs.push({
          timestamp,
          category: 'false_ceiling',
          type: 'warning',
          message: `[${room.name}] Ceiling height is low (${room.height} ft). False Ceiling drop will reduce final height below 8.2 ft.`
        });
      }

      // Map FC SKU using Phase 3 mappings
      // For peripheral bands (l_band, u_band, peripheral), map to 'peripheral'
      const mappedType = ['peripheral', 'l_band', 'u_band'].includes(room.fcType) ? 'peripheral' : room.fcType;
      const resolvedFcSku = resolveSku('false_ceiling', { fcMaterial: room.fcMaterial, fcType: mappedType }, rules);

      if (resolvedFcSku) {
        const itemTotal = roomFCArea * resolvedFcSku.unitRate;
        bom.push({
          id: `${room.id}-fc-base`,
          skuCode: resolvedFcSku.skuCode,
          superCategory: 'False Ceiling',
          subSuperCategory: 'Gypsum_False Ceiling',
          itemName: resolvedFcSku.itemName,
          description: resolvedFcSku.description,
          specification: 'System derived',
          brand: 'Saint Gobain / Gyproc',
          unit: resolvedFcSku.uom,
          quantity: roomFCArea,
          rate: resolvedFcSku.unitRate,
          total: itemTotal,
          source: 'derived',
          decisionTrigger: `FC shape: ${room.fcType}, width: ${w} ft, material: ${room.fcMaterial}`
        });
        roomTotal += itemTotal;
        fcSubtotal += itemTotal;
      }


      // Add-ons: Cove Lighting structure (Uses dynamic rate from BusinessRules)
      if (room.fcCoveEnabled) {
        const coveItem = findRateCardItem('False Ceiling', 'Gypsum Cove - Gypsum_Cove_False Ceiling') || 
                         findRateCardItem('False Ceiling', 'Gypsum Cove - POP/Gypsum');
        
        const rateVal = rules.coveRatePerRft;
        const qty = roomFCPerimeter;
        const itemTotal = qty * rateVal;
        bom.push({
          id: `${room.id}-fc-cove`,
          superCategory: 'False Ceiling',
          subSuperCategory: coveItem ? coveItem.sub_super_category : 'Gypsum_Cove_False Ceiling',
          itemName: coveItem ? coveItem.item_name : 'Gypsum Cove - Gypsum_Cove_False Ceiling',
          description: coveItem ? coveItem.description : 'Light cove detail along FC perimeter',
          specification: 'NA',
          brand: 'Saint Gobain / Gyproc',
          unit: 'Rft',
          quantity: qty,
          rate: rateVal,
          total: itemTotal,
          source: 'derived',
          decisionTrigger: `Cove requested along FC perimeter (${qty} RFT). Rate from Business Rules: ₹${rateVal}/RFT`
        });
        roomTotal += itemTotal;
        fcSubtotal += itemTotal;
      }

      // Curtain Pelmet (Uses dynamic rate from BusinessRules)
      if (room.fcCurtainPelmetLength > 0) {
        const pelmetItem = findRateCardItem('False Ceiling', 'Groove Rate');
        const rateVal = rules.pelmetRatePerRft;
        const qty = room.fcCurtainPelmetLength;
        const itemTotal = qty * rateVal;
        bom.push({
          id: `${room.id}-fc-pelmet`,
          superCategory: 'False Ceiling',
          subSuperCategory: 'Groove',
          itemName: pelmetItem ? pelmetItem.item_name : 'Curtain Pelmet (Running Foot)',
          description: 'Construction of vertical drop pelmet for curtains',
          specification: 'NA',
          brand: 'Local',
          unit: 'Rft',
          quantity: qty,
          rate: rateVal,
          total: itemTotal,
          source: 'derived',
          decisionTrigger: `Curtain pelmet requested along window wall (${qty} RFT). Rate from Business Rules: ₹${rateVal}/RFT`
        });
        roomTotal += itemTotal;
        fcSubtotal += itemTotal;
      }

      // Curved design length (Uses dynamic rate from BusinessRules)
      if (room.fcCurvedDesignLength > 0) {
        const qty = room.fcCurvedDesignLength;
        const rateVal = rules.curveSurchargePerRft;
        const itemTotal = qty * rateVal;
        bom.push({
          id: `${room.id}-fc-curve`,
          superCategory: 'False Ceiling',
          subSuperCategory: 'Labour Surcharge',
          itemName: 'Curved False Ceiling Design Surcharge',
          description: 'Surcharge for complexity in forming curved borders and circles',
          specification: 'Extra labour',
          brand: 'NA',
          unit: 'Rft',
          quantity: qty,
          rate: rateVal,
          total: itemTotal,
          source: 'derived',
          decisionTrigger: `Curved design complexity: ${qty} RFT. Rate from Business Rules: ₹${rateVal}/RFT`
        });
        roomTotal += itemTotal;
        fcSubtotal += itemTotal;
      }

      // Optional Add-ons: PVC Trims
      if (room.fcAddOns.includes('PVC Trims')) {
        const rate = 95; // RFT rate
        const qty = roomFCPerimeter;
        const itemTotal = qty * rate;
        bom.push({
          id: `${room.id}-fc-trim`,
          superCategory: 'False Ceiling',
          subSuperCategory: 'Decoration',
          itemName: 'PVC Decorative Trims (Material + Installation)',
          description: 'PVC profile trims added along border edges of false ceiling',
          specification: 'PVC profile',
          brand: 'Euro / Local',
          unit: 'Rft',
          quantity: qty,
          rate: rate,
          total: itemTotal,
          source: 'add-on',
          decisionTrigger: 'Optional add-on PVC Trims selected'
        });
        roomTotal += itemTotal;
        fcSubtotal += itemTotal;
      }
      // Auto-inject Primary Light Points if Livspace is supplying lights
      if (room.lightsSuppliedByUs && roomFCArea > 0) {
        const qty = Math.max(1, Math.ceil(roomFCArea / 20)); // 1 light point per 20 sqft
        const item = rules.catalog.find(c => c.skuCode === 'SKU-ELEC-PT-PRIM');
        if (item && qty > 0) {
          const itemTotal = qty * item.unitRate;
          bom.push({
            id: `${room.id}-fc-auto-lights`,
            skuCode: item.skuCode,
            superCategory: 'Electrical',
            subSuperCategory: 'Primary Point',
            itemName: item.itemName,
            description: item.description,
            specification: 'Auto-calculated based on FC area (1 per 20 sqft)',
            brand: 'Havells/Polycab',
            unit: item.uom,
            quantity: qty,
            rate: item.unitRate,
            total: itemTotal,
            source: 'derived',
            decisionTrigger: `Lights supplied by Livspace. Auto-calculated ${qty} points for ${roomFCArea} sqft ceiling.`
          });
          roomTotal += itemTotal;
          fcSubtotal += itemTotal;
        }
      }
    }

    // ==========================================
    // B. PAINTING CALCULATIONS
    // ==========================================
    if (room.paintingEnabled) {
      const L = room.length;
      const W = room.width;
      const H = room.height;

      // 1. Gross Wall Area = 2 * (L + W) * H
      const grossWallArea = 2 * (L + W) * H;
      
      // 2. Deductions
      const doorDeductions = room.doorDeductionsList ? room.doorDeductionsList.reduce((sum, item) => sum + (item.length * item.width), 0) : 0;
      const windowDeductions = room.windowDeductionsList ? room.windowDeductionsList.reduce((sum, item) => sum + (item.length * item.width), 0) : 0;
      const wardrobeDeductions = room.wardrobeDeductionsList ? room.wardrobeDeductionsList.reduce((sum, item) => sum + (item.length * item.width), 0) : 0;
      const totalDeductions = doorDeductions + windowDeductions + wardrobeDeductions;
      
      // 3. Net Wall Area
      let netWallArea = 0;
      if (room.applicablePaintArea === 'walls_ceiling' || room.applicablePaintArea === 'walls') {
        netWallArea = Math.max(0, grossWallArea - totalDeductions);
      }

      // 4. Ceiling Area
      let ceilingArea = 0;
      if (room.applicablePaintArea === 'walls_ceiling' || room.applicablePaintArea === 'ceiling') {
        if (room.fcEnabled && room.fcType === 'full') {
          ceilingArea = L * W; 
        } else if (room.fcEnabled && room.fcType !== 'none') {
          ceilingArea = (L * W) - roomFCArea + roomFCArea; // Bottom surface of FC also needs painting
        } else {
          ceilingArea = L * W;
        }
      }

      // 5. Additional False Ceiling Painting
      let additionalFCPainting = 0;
      if (room.fcEnabled && room.fcType !== 'none') {
        const dropHeight = 1.0; // 1ft drop
        const verticalDropArea = roomFCPerimeter * dropHeight;
        const coveArea = room.fcCoveEnabled ? roomFCPerimeter * 0.5 : 0;
        additionalFCPainting = verticalDropArea + coveArea;
      }

      const singleWallArea = netWallArea / 4;
      let wallpaperArea = 0;
      let darkShadeArea = 0;

      // Calculate Wallpaper Area from addon
      if (room.wallpaperAddon?.enabled) {
        if (room.wallpaperAddon.walls.length > 0) {
          wallpaperArea = room.wallpaperAddon.walls.length * singleWallArea;
        } else if (room.wallpaperAddon.customArea > 0) {
          wallpaperArea = room.wallpaperAddon.customArea;
        }
      }

      // Calculate Texture Area from addon
      let textureArea = 0;
      if (room.textureAddon?.enabled) {
        if (room.textureAddon.walls.length > 0) {
          textureArea = room.textureAddon.walls.length * singleWallArea;
        } else if (room.textureAddon.customArea > 0) {
          textureArea = room.textureAddon.customArea;
        }
      }

      if (room.darkShadeWalls?.length > 0) {
        darkShadeArea = room.darkShadeWalls.length * singleWallArea;
      }

      const standardPaintWallArea = Math.max(0, netWallArea - wallpaperArea - textureArea - darkShadeArea);
      const standardPaintingArea = standardPaintWallArea + ceilingArea + additionalFCPainting;

      totalPaintingAreaHome += (standardPaintingArea + darkShadeArea);
      roomBreakdowns[room.id].paintingArea = standardPaintingArea + darkShadeArea;

      // DERIVE REPAINT SCOPE MODE FROM WALL CONDITION MAP
      let derivedScope = rules.conditionScopeMap[room.wallCondition] || 'repaint';
      
      // Cross-trade electrical logic
      if (room.electricalEnabled && room.wallPrimaryPoints > 0) {
        derivedScope = 'fresh';
        auditLogs.push({
          timestamp,
          category: 'painting',
          type: 'auto_override',
          message: `[${room.name}] Scope upgraded to FRESH painting because Electrical wall chiseling was detected.`
        });
      } else if (room.wallCondition !== 'smooth') {
        auditLogs.push({
          timestamp,
          category: 'painting',
          type: 'auto_override',
          message: `[${room.name}] Scope derived as ${derivedScope.toUpperCase()} based on Wall Condition: '${room.wallCondition}'. User selection disabled.`
        });
      }

      // Map Paint Quality to SKU using new Phase 3 mappings
      const resolvedSku = resolveSku('painting', { paintQuality: room.paintQuality, scope: derivedScope }, rules);
      
      if (resolvedSku && standardPaintingArea > 0) {
        const itemTotal = standardPaintingArea * resolvedSku.unitRate;
        bom.push({
          id: `${room.id}-paint-base`,
          skuCode: resolvedSku.skuCode,
          superCategory: 'Painting',
          subSuperCategory: 'Interior Paint',
          itemName: resolvedSku.itemName,
          description: resolvedSku.description,
          specification: 'System derived',
          brand: 'Asian Paints',
          unit: resolvedSku.uom,
          quantity: standardPaintingArea,
          rate: resolvedSku.unitRate,
          total: itemTotal,
          source: 'derived',
          decisionTrigger: `Wall Area: ${standardPaintWallArea.toFixed(1)} + Ceiling: ${ceilingArea.toFixed(1)} + FC: ${additionalFCPainting.toFixed(1)} sqft. Scope: ${derivedScope.toUpperCase()}.`
        });
        roomTotal += itemTotal;
        paintingSubtotal += itemTotal;
      }

      // Dark Shade Enforcement
      if (darkShadeArea > 0) {
        const darkSku = resolveSku('painting', { paintQuality: room.paintQuality, scope: 'fresh' }, rules);
        if (darkSku) {
          const itemTotal = darkShadeArea * darkSku.unitRate;
          bom.push({
            id: `${room.id}-paint-dark-shade`,
            skuCode: darkSku.skuCode,
            superCategory: 'Painting',
            subSuperCategory: 'Interior Paint',
            itemName: `${darkSku.itemName} (Dark Wall Coverage)`,
            description: `${darkSku.description} - Enforced fresh paint for dark shade coverage`,
            specification: 'Dark wall system derived',
            brand: 'Asian Paints',
            unit: darkSku.uom,
            quantity: darkShadeArea,
            rate: darkSku.unitRate,
            total: itemTotal,
            source: 'derived',
            decisionTrigger: `Enforced 'fresh' scope on ${darkShadeArea.toFixed(1)} sqft due to Dark Shade selection.`
          });
          roomTotal += itemTotal;
          paintingSubtotal += itemTotal;
        }
      }

      // Wallpaper Subtraction & SKU
      if (wallpaperArea > 0 && room.wallpaperAddon?.sku) {
        const wpSku = rules.catalog.find(c => c.skuCode === room.wallpaperAddon.sku);
        if (wpSku) {
          const itemTotal = wallpaperArea * wpSku.unitRate;
          bom.push({
            id: `${room.id}-wallpaper`,
            skuCode: wpSku.skuCode,
            superCategory: 'Painting',
            subSuperCategory: 'Wallpaper',
            itemName: wpSku.itemName,
            description: wpSku.description,
            specification: 'Custom roll',
            brand: 'Livspace Catalog',
            unit: wpSku.uom,
            quantity: wallpaperArea,
            rate: wpSku.unitRate,
            total: itemTotal,
            source: 'add-on',
            decisionTrigger: `Subtracted from paint area. Installed wallpaper on ${wallpaperArea.toFixed(1)} sqft.`
          });
          roomTotal += itemTotal;
          paintingSubtotal += itemTotal;

          // Base Prep for Wallpaper
          const prepSku = rules.catalog.find(c => c.skuCode === 'SKU-WP-BASEPREP');
          if (prepSku) {
            const prepTotal = wallpaperArea * prepSku.unitRate;
            bom.push({
              id: `${room.id}-wp-prep`,
              skuCode: prepSku.skuCode,
              superCategory: 'Painting',
              subSuperCategory: 'Wall Preparation',
              itemName: prepSku.itemName,
              description: prepSku.description,
              specification: 'Base prep for wallpaper',
              brand: 'Asian Paints',
              unit: prepSku.uom,
              quantity: wallpaperArea,
              rate: prepSku.unitRate,
              total: prepTotal,
              source: 'derived',
              decisionTrigger: `Base preparation added specifically for wallpaper area.`
            });
            roomTotal += prepTotal;
            paintingSubtotal += prepTotal;
          }
        }
      }

      // Texture Paint Addon
      if (textureArea > 0) {
        const texSku = rules.catalog.find(c => c.skuCode === 'SKU-PNT-TEXTURE');
        if (texSku) {
          const itemTotal = textureArea * texSku.unitRate;
          bom.push({
            id: `${room.id}-texture`,
            skuCode: texSku.skuCode,
            superCategory: 'Painting',
            subSuperCategory: 'Texture',
            itemName: texSku.itemName,
            description: texSku.description,
            specification: 'Custom Texture',
            brand: 'Asian Paints',
            unit: texSku.uom,
            quantity: textureArea,
            rate: texSku.unitRate,
            total: itemTotal,
            source: 'add-on',
            decisionTrigger: `Texture paint applied on ${textureArea.toFixed(1)} sqft.`
          });
          roomTotal += itemTotal;
          paintingSubtotal += itemTotal;

          // Base Prep for Texture
          const prepSku = rules.catalog.find(c => c.skuCode === 'SKU-TEX-BASEPREP');
          if (prepSku) {
            const prepTotal = textureArea * prepSku.unitRate;
            bom.push({
              id: `${room.id}-tex-prep`,
              skuCode: prepSku.skuCode,
              superCategory: 'Painting',
              subSuperCategory: 'Wall Preparation',
              itemName: prepSku.itemName,
              description: prepSku.description,
              specification: 'Base prep for texture',
              brand: 'Asian Paints',
              unit: prepSku.uom,
              quantity: textureArea,
              rate: prepSku.unitRate,
              total: prepTotal,
              source: 'derived',
              decisionTrigger: `Base preparation added specifically for texture area.`
            });
            roomTotal += prepTotal;
            paintingSubtotal += prepTotal;
          }
        }
      }

      // Auto-injected surface treatment items (rates driven by BusinessRules)
      if (room.wallCondition === 'seepage') {
        hasSeepageInHome = true;
        const dampArea = room.width * room.height;
        const rateVal = rules.waterproofingRatePerSqft;
        const itemTotal = dampArea * rateVal;
        bom.push({
          id: `${room.id}-paint-waterproofing`,
          superCategory: 'Painting',
          subSuperCategory: 'Waterproofing',
          itemName: 'Waterproofing Dampness Treatment (Dr. Fixit/Sika)',
          description: 'Anti-seepage coating, wall dampness chemical injection treatment, and fiber mesh application on cracked cement plaster.',
          specification: 'Double coat polymer brush + fiber grid mesh',
          brand: 'Dr. Fixit / Sika',
          unit: 'Sqft',
          quantity: dampArea,
          rate: rateVal,
          total: itemTotal,
          source: 'derived',
          decisionTrigger: `Auto-injected due to Seepage. Rate from Business Rules: ₹${rateVal}/sqft.`
        });
        roomTotal += itemTotal;
        paintingSubtotal += itemTotal;
        auditLogs.push({
          timestamp,
          category: 'painting',
          type: 'constraint',
          message: `[${room.name}] Auto-added Waterproofing Treatment for ${dampArea} sqft due to damp walls.`
        });
      }

      if (room.wallCondition === 'undulated') {
        const punningArea = netWallArea;
        const rateVal = rules.punningRatePerSqft;
        const itemTotal = punningArea * rateVal;
        bom.push({
          id: `${room.id}-paint-punning`,
          superCategory: 'Painting',
          subSuperCategory: 'Wall Preparation',
          itemName: 'POP Wall Punning (Plaster of Paris Treatment)',
          description: 'POP surface paste coating (3-6mm thickness) to correct wall undulations before painting.',
          specification: 'Gypsum/POP paste leveling',
          brand: 'Gyproc / Local',
          unit: 'Sqft',
          quantity: punningArea,
          rate: rateVal,
          total: itemTotal,
          source: 'derived',
          decisionTrigger: `Auto-injected due to Undulated walls. Rate from Business Rules: ₹${rateVal}/sqft.`
        });
        roomTotal += itemTotal;
        paintingSubtotal += itemTotal;
        auditLogs.push({
          timestamp,
          category: 'painting',
          type: 'constraint',
          message: `[${room.name}] Auto-added POP Wall Punning for ${punningArea.toFixed(1)} sqft to correct wall undulations.`
        });
      }

      // Enamel woodwork
      if (room.includeWoodworkEnamel && room.woodworkEnamelArea > 0) {
        const enamelItem = findRateCardItem('Painting', 'Asian Apcolite Premium Enamel Re Painting (1 Pr + 2 Pa) - Brush/Roller finish -  Large Scale_Wood/Metal paint_Painting');
        const rates = enamelItem ? getCityRate(enamelItem, global.city) : { unit: 'Sqft', rate: 45 };
        const qty = room.woodworkEnamelArea;
        const itemTotal = qty * rates.rate;
        bom.push({
          id: `${room.id}-paint-enamel`,
          superCategory: 'Painting',
          subSuperCategory: 'Wood/Metal paint',
          itemName: enamelItem ? enamelItem.item_name : 'Asian Apcolite Premium Enamel Painting',
          description: enamelItem ? enamelItem.description : 'Enamel coat finish for wooden doors, frames, or railings',
          specification: 'Brush/Roller finish',
          brand: 'Asian Paints',
          unit: rates.unit,
          quantity: qty,
          rate: rates.rate,
          total: itemTotal,
          source: 'derived',
          decisionTrigger: `Woodwork Enamel selected for area: ${qty} sqft`
        });
        roomTotal += itemTotal;
        paintingSubtotal += itemTotal;
      }

      // Optional Add-on: Paintable Trims
      if (room.paintableTrims?.enabled && room.paintableTrims.rft > 0) {
        const trimsSku = rules.catalog.find(c => c.skuCode === 'SKU-PNT-TRIMS');
        if (trimsSku) {
          const qty = room.paintableTrims.rft;
          const itemTotal = qty * trimsSku.unitRate;
          bom.push({
            id: `${room.id}-paint-trims`,
            skuCode: trimsSku.skuCode,
            superCategory: 'Painting',
            subSuperCategory: 'Design Factor',
            itemName: trimsSku.itemName,
            description: trimsSku.description,
            specification: 'Enamel/PU on trims',
            brand: 'Asian Paints',
            unit: trimsSku.uom,
            quantity: qty,
            rate: trimsSku.unitRate,
            total: itemTotal,
            source: 'add-on',
            decisionTrigger: `Paintable trims selected for ${qty} RFT`
          });
          roomTotal += itemTotal;
          paintingSubtotal += itemTotal;
        }
      }

      // Optional Add-on: Grooves Painting
      if (room.groovesPainting?.enabled && room.groovesPainting.rft > 0) {
        const groovesSku = rules.catalog.find(c => c.skuCode === 'SKU-PNT-GROOVES');
        if (groovesSku) {
          const qty = room.groovesPainting.rft;
          const itemTotal = qty * groovesSku.unitRate;
          bom.push({
            id: `${room.id}-paint-grooves`,
            skuCode: groovesSku.skuCode,
            superCategory: 'Painting',
            subSuperCategory: 'Design Factor',
            itemName: groovesSku.itemName,
            description: groovesSku.description,
            specification: 'Precision groove painting',
            brand: 'Asian Paints',
            unit: groovesSku.uom,
            quantity: qty,
            rate: groovesSku.unitRate,
            total: itemTotal,
            source: 'add-on',
            decisionTrigger: `Grooves painting selected for ${qty} RFT`
          });
          roomTotal += itemTotal;
          paintingSubtotal += itemTotal;
        }
      }

      // Non-Plastered Condition -> Civil Plastering Surcharge
      if (room.wallCondition === 'non_plastered') {
        const civilSku = rules.catalog.find(c => c.skuCode === 'SKU-CIVIL-PLASTERING');
        if (civilSku) {
          const itemTotal = netWallArea * civilSku.unitRate;
          bom.push({
            id: `${room.id}-paint-civil-plaster`,
            skuCode: civilSku.skuCode,
            superCategory: 'Civil',
            subSuperCategory: 'Plastering',
            itemName: civilSku.itemName,
            description: civilSku.description,
            specification: 'Cement plastering (1:4 ratio) 12-15mm thickness',
            brand: 'UltraTech/Ambuja',
            unit: civilSku.uom,
            quantity: netWallArea,
            rate: civilSku.unitRate,
            total: itemTotal,
            source: 'derived',
            decisionTrigger: `Non-Plastered condition selected. Enforcing structural civil plastering on ${netWallArea.toFixed(1)} sqft.`
          });
          roomTotal += itemTotal;
          // Note: Add to global civil/painting subtotal if tracking
        }
      }

      // Scaffolding Surcharge for high ceilings
      if (room.workingHeightMultiplier > 1) {
        const scaffoldSku = rules.catalog.find(c => c.skuCode === 'SKU-SCAFFOLDING');
        if (scaffoldSku) {
          const affectedArea = standardPaintingArea;
          const qty = affectedArea * (room.workingHeightMultiplier - 1);
          const itemTotal = qty * scaffoldSku.unitRate;
          bom.push({
            id: `${room.id}-paint-scaffold`,
            skuCode: scaffoldSku.skuCode,
            superCategory: 'Logistics',
            subSuperCategory: 'Scaffolding',
            itemName: scaffoldSku.itemName,
            description: scaffoldSku.description,
            specification: 'Double height scaffolding / H-Frame rental & setup',
            brand: 'Local Vendor',
            unit: scaffoldSku.uom,
            quantity: qty,
            rate: scaffoldSku.unitRate,
            total: itemTotal,
            source: 'derived',
            decisionTrigger: `Working height multiplier is ${room.workingHeightMultiplier}x. Added scaffolding surcharge for ${qty.toFixed(1)} sqft equivalent.`
          });
          roomTotal += itemTotal;
        }
      }

      // Multi-color Design Masking Surcharge
      if (room.multiColorAddon?.enabled) {
        let multiColorArea = 0;
        if (room.multiColorAddon.walls.length > 0) {
          multiColorArea = room.multiColorAddon.walls.length * singleWallArea;
        } else if (room.multiColorAddon.customArea > 0) {
          multiColorArea = room.multiColorAddon.customArea;
        }
        
        if (multiColorArea > 0) {
          const maskingSku = rules.catalog.find(c => c.skuCode === 'SKU-MASKING-TAPE');
          if (maskingSku) {
            // Masking tape is lumpsum in the dummy DB, but user wants it calculated. 
            // We'll calculate it based on area. If rate is 850, we might just use 1 quantity.
            // Let's use area * a small factor, or just rate directly if area > 0.
            const itemTotal = maskingSku.unitRate;
            bom.push({
              id: `${room.id}-paint-masking`,
              skuCode: maskingSku.skuCode,
              superCategory: 'Painting',
              subSuperCategory: 'Design Factor',
              itemName: maskingSku.itemName,
              description: maskingSku.description,
              specification: 'Premium Masking tape / pattern block work',
              brand: '3M / Abro',
              unit: maskingSku.uom,
              quantity: 1, // Lumpsum rate
              rate: maskingSku.unitRate,
              total: itemTotal,
              source: 'derived',
              decisionTrigger: `Multi-color/Block design enabled for ${multiColorArea.toFixed(1)} sqft. Added masking tape surcharge.`
            });
            roomTotal += itemTotal;
            paintingSubtotal += itemTotal;
          }
        }
      }
    }

    // ==========================================
    // C. ELECTRICAL CALCULATIONS
    // ==========================================
    if (room.electricalEnabled) {
      if (room.newPrimaryPoints > 0) {
        const item = rules.catalog.find(c => c.skuCode === 'SKU-ELEC-PT-PRIM');
        if (item) {
          const qty = room.newPrimaryPoints;
          const itemTotal = qty * item.unitRate;
          bom.push({
            id: `${room.id}-elec-primary`,
            skuCode: item.skuCode,
            superCategory: 'Electrical',
            subSuperCategory: 'Primary Point',
            itemName: item.itemName,
            description: item.description,
            specification: 'System derived',
            brand: 'Havells/Polycab',
            unit: item.uom,
            quantity: qty,
            rate: item.unitRate,
            total: itemTotal,
            source: 'derived',
            decisionTrigger: `${qty} Primary Ceiling Light points defined`
          });
          roomTotal += itemTotal;
          electricalSubtotal += itemTotal;
        }
      }

      if (room.newSecondaryPoints > 0) {
        const item = rules.catalog.find(c => c.skuCode === 'SKU-ELEC-PT-SEC');
        if (item) {
          const qty = room.newSecondaryPoints;
          const itemTotal = qty * item.unitRate;
          bom.push({
            id: `${room.id}-elec-secondary`,
            skuCode: item.skuCode,
            superCategory: 'Electrical',
            subSuperCategory: 'Secondary Point',
            itemName: item.itemName,
            description: item.description,
            specification: 'System derived',
            brand: 'Havells/Polycab',
            unit: item.uom,
            quantity: qty,
            rate: item.unitRate,
            total: itemTotal,
            source: 'derived',
            decisionTrigger: `${qty} Secondary Ceiling Light points defined`
          });
          roomTotal += itemTotal;
          electricalSubtotal += itemTotal;
        }
      }

      if (room.wallPrimaryPoints > 0) {
        const item = rules.catalog.find(c => c.skuCode === 'SKU-ELEC-PT-WALL');
        if (item) {
          const qty = room.wallPrimaryPoints;
          const itemTotal = qty * item.unitRate;
          bom.push({
            id: `${room.id}-elec-wall-primary`,
            skuCode: item.skuCode,
            superCategory: 'Electrical',
            subSuperCategory: 'Primary Point',
            itemName: item.itemName,
            description: item.description,
            specification: 'System derived',
            brand: 'Havells/Polycab',
            unit: item.uom,
            quantity: qty,
            rate: item.unitRate,
            total: itemTotal,
            source: 'derived',
            decisionTrigger: `${qty} Wall Primary Points defined`
          });
          roomTotal += itemTotal;
          electricalSubtotal += itemTotal;
        }
      }

      if (room.relocationsCount > 0) {
        const item = rules.catalog.find(c => c.skuCode === 'SKU-ELEC-RELOC');
        if (item) {
          const qty = room.relocationsCount;
          const itemTotal = qty * item.unitRate;
          bom.push({
            id: `${room.id}-elec-relocate`,
            skuCode: item.skuCode,
            superCategory: 'Electrical',
            subSuperCategory: 'Relocation',
            itemName: item.itemName,
            description: item.description,
            specification: 'System derived',
            brand: 'Havells/Polycab',
            unit: item.uom,
            quantity: qty,
            rate: item.unitRate,
            total: itemTotal,
            source: 'derived',
            decisionTrigger: `${qty} Switchboard/Point relocations requested`
          });
          roomTotal += itemTotal;
          electricalSubtotal += itemTotal;
        }
      }

      // Dedicated AC point: auto-inject circuit wiring (Length per point driven by BusinessRules)
      if (room.acPointsCount > 0) {
        const qty = room.acPointsCount;
        const circuitItem = rules.catalog.find(c => c.skuCode === 'SKU-ELEC-CIRCUIT');
        
        if (circuitItem) {
          // Dynamic length
          const circuitQty = qty * rules.acConduitLengthPerPoint;
          const circuitTotal = circuitQty * circuitItem.unitRate;
          bom.push({
            id: `${room.id}-elec-ac-circuit`,
            skuCode: circuitItem.skuCode,
            superCategory: 'Electrical',
            subSuperCategory: 'Wiring',
            itemName: circuitItem.itemName,
            description: circuitItem.description,
            specification: '3-core 4 sqmm wire',
            brand: 'Havells / Polycab',
            unit: circuitItem.uom,
            quantity: circuitQty,
            rate: circuitItem.unitRate,
            total: circuitTotal,
            source: 'derived',
            decisionTrigger: `Auto-injected: AC Power circuit wiring (${circuitQty} RFT) for ${qty} AC points.`
          });
          roomTotal += circuitTotal;
          electricalSubtotal += circuitTotal;
        }

        const acBoardItem = rules.catalog.find(c => c.skuCode === 'SKU-ELEC-AC-BOX');
        if (acBoardItem) {
          const acBoardTotal = qty * acBoardItem.unitRate;
          bom.push({
            id: `${room.id}-elec-ac-box`,
            skuCode: acBoardItem.skuCode,
            superCategory: 'Electrical',
            subSuperCategory: 'New Board',
            itemName: acBoardItem.itemName,
            description: acBoardItem.description,
            specification: '15A Switch Socket combo box',
            brand: 'Legrand / Anchor',
            unit: acBoardItem.uom,
            quantity: qty,
            rate: acBoardItem.unitRate,
            total: acBoardTotal,
            source: 'derived',
            decisionTrigger: `Auto-injected AC board.`
          });
          roomTotal += acBoardTotal;
          electricalSubtotal += acBoardTotal;
        }

        auditLogs.push({
          timestamp,
          category: 'electrical',
          type: 'constraint',
          message: `[${room.name}] Auto-added AC Circuit Wiring (4 sqmm) (Rule: ${rules.acConduitLengthPerPoint} RFT/point).`
        });
      }

      // Conduit laying (Concrete wall multiplier driven by BusinessRules)
      if (room.conduitLayingLength > 0) {
        const item = rules.catalog.find(c => c.skuCode === 'SKU-ELEC-COND');
        if (item) {
          const qty = room.conduitLayingLength;
          let rateValue = item.unitRate;
          
          let isConcreteMultiplier = false;
          if (room.wallType === 'concrete') {
            rateValue = rateValue * rules.concreteChiselMultiplier;
            isConcreteMultiplier = true;
          }

          const itemTotal = qty * rateValue;
          bom.push({
            id: `${room.id}-elec-conduit`,
            skuCode: item.skuCode,
            superCategory: 'Electrical',
            subSuperCategory: 'Conduting',
            itemName: item.itemName + (isConcreteMultiplier ? ' (Chiseling in Concrete Wall)' : ''),
            description: item.description + (isConcreteMultiplier ? ' [Surcharge for concrete wall cutting included]' : ''),
            specification: 'System derived',
            brand: 'Polycab/Finolex',
            unit: item.uom,
            quantity: qty,
            rate: rateValue,
            total: itemTotal,
            source: 'derived',
            decisionTrigger: `Conduit laying: ${qty} RFT. Wall type: ${room.wallType}. Chisel multiplier: ${rules.concreteChiselMultiplier}x.`
          });
          roomTotal += itemTotal;
          electricalSubtotal += itemTotal;

          if (isConcreteMultiplier) {
            auditLogs.push({
              timestamp,
              category: 'electrical',
              type: 'constraint',
              message: `[${room.name}] Applied ${rules.concreteChiselMultiplier}x chiseling surcharge on conduit laying due to Concrete Wall type.`
            });
          }
        }
      }

      if (room.electricalPackage !== 'none') {
        const pkgItem = resolveSku('electrical_package', { electricalPackage: room.electricalPackage }, rules);
        if (pkgItem) {
          const qty = 1;
          const itemTotal = qty * pkgItem.unitRate;
          bom.push({
            id: `${room.id}-elec-pkg`,
            skuCode: pkgItem.skuCode,
            superCategory: 'Electrical',
            subSuperCategory: 'Electrical Package',
            itemName: pkgItem.itemName,
            description: pkgItem.description,
            specification: 'System derived',
            brand: 'Livspace',
            unit: pkgItem.uom,
            quantity: qty,
            rate: pkgItem.unitRate,
            total: itemTotal,
            source: 'derived',
            decisionTrigger: `Electrical package selected: ${pkgItem.itemName}`
          });
          roomTotal += itemTotal;
          electricalSubtotal += itemTotal;
        }
      }

      // Add-ons
      if (room.electricalAddOns.includes('Fan Fixing')) {
        const fanItem = rules.catalog.find(c => c.skuCode === 'SKU-ELEC-FAN-FIX');
        if (fanItem) {
          const qty = 1;
          const itemTotal = qty * fanItem.unitRate;
          bom.push({
            id: `${room.id}-elec-addon-fan`,
            skuCode: fanItem.skuCode,
            superCategory: 'Electrical',
            subSuperCategory: 'Fixture Fixing',
            itemName: fanItem.itemName,
            description: fanItem.description,
            specification: 'Anchor bolt installation',
            brand: 'NA',
            unit: fanItem.uom,
            quantity: qty,
            rate: fanItem.unitRate,
            total: itemTotal,
            source: 'add-on',
            decisionTrigger: 'Optional Fan Fixing selected'
          });
          roomTotal += itemTotal;
          electricalSubtotal += itemTotal;
        }
      }
    }

    // ==========================================
    // D. PLUMBING CALCULATIONS
    // ==========================================
    if (room.plumbingEnabled) {
      if (room.plumbingPackage !== 'none') {
        const pkgItem = resolveSku('plumbing_package', { plumbingPackage: room.plumbingPackage }, rules);
        
        if (pkgItem) {
          const qty = 1;
          const itemTotal = qty * pkgItem.unitRate;
          bom.push({
            id: `${room.id}-plumb-pkg`,
            skuCode: pkgItem.skuCode,
            superCategory: 'Plumbing',
            subSuperCategory: 'Plumbing Package',
            itemName: pkgItem.itemName,
            description: pkgItem.description,
            specification: 'System derived',
            brand: 'Livspace',
            unit: pkgItem.uom,
            quantity: qty,
            rate: pkgItem.unitRate,
            total: itemTotal,
            source: 'derived',
            decisionTrigger: `Plumbing package: ${pkgItem.itemName}`
          });
          roomTotal += itemTotal;
          plumbingSubtotal += itemTotal;
        }

        // Waterproofing is MANDATORY for toilet package remodeling (Rate driven by BusinessRules)
        if (room.plumbingPackage === 'toilet_pkg') {
          const wetAreaWaterproofRate = rules.wetAreaWaterproofRate;
          const floorArea = room.length * room.width;
          const itemTotal = floorArea * wetAreaWaterproofRate;
          bom.push({
            id: `${room.id}-plumb-waterproofing`,
            superCategory: 'Plumbing',
            subSuperCategory: 'Waterproofing',
            itemName: 'Toilet Floor Wet Area Waterproofing (Epoxy/Polymer barrier)',
            description: 'Epoxy resin water barrier applied on raw concrete floor base including wall lining border raising up to 1 foot height.',
            specification: 'Chemical polymer base + vertical joint band coating',
            brand: 'Dr. Fixit / Fosroc',
            unit: 'Sqft',
            quantity: floorArea,
            rate: wetAreaWaterproofRate,
            total: itemTotal,
            source: 'derived',
            decisionTrigger: `Auto-injected: Bathroom remodeling requires wet area floor waterproofing (${floorArea} sqft). Rate from Business Rules: ₹${wetAreaWaterproofRate}/sqft.`
          });
          roomTotal += itemTotal;
          plumbingSubtotal += itemTotal;
          auditLogs.push({
            timestamp,
            category: 'plumbing',
            type: 'constraint',
            message: `[${room.name}] Auto-added Toilet floor waterproofing (${floorArea} sqft) due to Bathroom remodeling. Rate: ₹${wetAreaWaterproofRate}/sqft.`
          });
        }
      }

      if (room.internalPlumbingLine !== 'none') {
        const targetSku = room.internalPlumbingLine === 'cold' ? 'SKU-PLM-LINE-COLD' : 'SKU-PLM-LINE-HOT';
        const lineItem = rules.catalog.find(c => c.skuCode === targetSku);
        if (lineItem) {
          const qty = 1;
          const itemTotal = qty * lineItem.unitRate;
          bom.push({
            id: `${room.id}-plumb-line`,
            skuCode: lineItem.skuCode,
            superCategory: 'Plumbing',
            subSuperCategory: 'Internal Line',
            itemName: lineItem.itemName,
            description: lineItem.description,
            specification: 'System derived',
            brand: 'Ashirvad / Supreme',
            unit: lineItem.uom,
            quantity: qty,
            rate: lineItem.unitRate,
            total: itemTotal,
            source: 'derived',
            decisionTrigger: `Supply lines: ${room.internalPlumbingLine}`
          });
          roomTotal += itemTotal;
          plumbingSubtotal += itemTotal;
        }
      }

      if (room.wcType !== 'none') {
        const wcItem = resolveSku('plumbing_wc', { wcType: room.wcType }, rules);
        if (wcItem) {
          const qty = 1;
          const itemTotal = qty * wcItem.unitRate;
          bom.push({
            id: `${room.id}-plumb-wc`,
            skuCode: wcItem.skuCode,
            superCategory: 'Plumbing',
            subSuperCategory: 'WC Installation',
            itemName: wcItem.itemName,
            description: wcItem.description,
            specification: 'System derived',
            brand: 'Hindware / Jaguar',
            unit: wcItem.uom,
            quantity: qty,
            rate: wcItem.unitRate,
            total: itemTotal,
            source: 'derived',
            decisionTrigger: `WC Installation: ${room.wcType}-mounted WC`
          });
          roomTotal += itemTotal;
          plumbingSubtotal += itemTotal;
        }
      }

      if (room.washBasinsCount > 0) {
        const basinItem = rules.catalog.find(c => c.skuCode === 'SKU-PLM-WB');
        if (basinItem) {
          const qty = room.washBasinsCount;
          const itemTotal = qty * basinItem.unitRate;
          bom.push({
            id: `${room.id}-plumb-basin`,
            skuCode: basinItem.skuCode,
            superCategory: 'Plumbing',
            subSuperCategory: 'Fixture Installation',
            itemName: basinItem.itemName,
            description: basinItem.description,
            specification: 'System derived',
            brand: 'Hindware / Jaguar',
            unit: basinItem.uom,
            quantity: qty,
            rate: basinItem.unitRate,
            total: itemTotal,
            source: 'derived',
            decisionTrigger: `${qty} Wash basins installation`
          });
          roomTotal += itemTotal;
          plumbingSubtotal += itemTotal;
        }
      }

      if (room.geysersCount > 0) {
        const geyserItem = rules.catalog.find(c => c.skuCode === 'SKU-PLM-GEYSER');
        if (geyserItem) {
          const qty = room.geysersCount;
          const itemTotal = qty * geyserItem.unitRate;
          bom.push({
            id: `${room.id}-plumb-geyser`,
            skuCode: geyserItem.skuCode,
            superCategory: 'Plumbing',
            subSuperCategory: 'Fixture Installation',
            itemName: geyserItem.itemName,
            description: geyserItem.description,
            specification: 'System derived',
            brand: 'AO Smith / Racold',
            unit: geyserItem.uom,
            quantity: qty,
            rate: geyserItem.unitRate,
            total: itemTotal,
            source: 'derived',
            decisionTrigger: `${qty} Geyser installations`
          });
          roomTotal += itemTotal;
          plumbingSubtotal += itemTotal;
        }
      }

      if (room.kitchenSinksCount > 0) {
        const sinkItem = rules.catalog.find(c => c.skuCode === 'SKU-PLM-SINK');
        if (sinkItem) {
          const qty = room.kitchenSinksCount;
          const itemTotal = qty * sinkItem.unitRate;
          bom.push({
            id: `${room.id}-plumb-sink`,
            skuCode: sinkItem.skuCode,
            superCategory: 'Plumbing',
            subSuperCategory: 'Fixture Installation',
            itemName: sinkItem.itemName,
            description: sinkItem.description,
            specification: 'System derived',
            brand: 'Franke / Nirali',
            unit: sinkItem.uom,
            quantity: qty,
            rate: sinkItem.unitRate,
            total: itemTotal,
            source: 'derived',
            decisionTrigger: `${qty} Kitchen sink installations`
          });
          roomTotal += itemTotal;
          plumbingSubtotal += itemTotal;
        }
      }

      // Add-ons
      if (room.plumbingAddOns.includes('Mixer Installation')) {
        const mixerItem = rules.catalog.find(c => c.skuCode === 'SKU-PLM-MIXER');
        if (mixerItem) {
          const qty = 1;
          const itemTotal = qty * mixerItem.unitRate;
          bom.push({
            id: `${room.id}-plumb-addon-mixer`,
            skuCode: mixerItem.skuCode,
            superCategory: 'Plumbing',
            subSuperCategory: 'Fixture Installation',
            itemName: mixerItem.itemName,
            description: mixerItem.description,
            specification: 'Wall/Counter mount Mixer assembly',
            brand: 'Jaguar / Cera',
            unit: mixerItem.uom,
            quantity: qty,
            rate: mixerItem.unitRate,
            total: itemTotal,
            source: 'add-on',
            decisionTrigger: 'Optional Hot & Cold Mixer installation selected'
          });
          roomTotal += itemTotal;
          plumbingSubtotal += itemTotal;
        }
      }
    }

    roomBreakdowns[room.id].roomTotal = roomTotal;
  });

  // ==========================================
  // E. GLOBAL CONSTRAINTS & MOQS
  // ==========================================
  const timestamp = new Date().toISOString();

  // 1. False Ceiling MOQ (Enforced value from BusinessRules)
  if (totalFCAreaHome > 0 && totalFCAreaHome < rules.fcMoqArea) {
    const deficit = rules.fcMoqArea - totalFCAreaHome;
    const stdFCItem = findRateCardItem('False Ceiling', 'Standard Gypsum False Ceiling_Gypsum_False Ceiling');
    const fcRates = stdFCItem ? getCityRate(stdFCItem, global.city) : { rate: 120 };
    const moqCharge = deficit * fcRates.rate;
    
    bom.push({
      id: 'global-fc-moq-surcharge',
      superCategory: 'False Ceiling',
      subSuperCategory: 'MOQ Constraint',
      itemName: 'False Ceiling MOQ Adjustment Charge',
      description: `Surcharge for project false ceiling area falling below ${rules.fcMoqArea} sqft MOQ. Deficit: ${deficit.toFixed(1)} sqft billed.`,
      specification: 'MOQ Policy surcharge',
      brand: 'NA',
      unit: 'Sqft',
      quantity: deficit,
      rate: fcRates.rate,
      total: moqCharge,
      source: 'global_constraint',
      decisionTrigger: `Total home FC area is ${totalFCAreaHome.toFixed(1)} sqft, falling below the MOQ limit of ${rules.fcMoqArea} sqft.`
    });
    fcSubtotal += moqCharge;
    auditLogs.push({
      timestamp,
      category: 'false_ceiling',
      type: 'constraint',
      message: `False Ceiling MOQ surcharge applied! Home total was ${totalFCAreaHome.toFixed(1)} sqft. Charged extra for ${deficit.toFixed(1)} sqft to reach ${rules.fcMoqArea} sqft MOQ limit.`
    });
  }

  // 1b. Premium Material Check (Warning)
  const usesPremiumPaint = rooms.some(r => r.paintingEnabled && (r.paintQuality === 'premium' || r.paintQuality === 'royale'));
  if (usesPremiumPaint && totalPaintingAreaHome > 0 && totalPaintingAreaHome < rules.premiumMaterialMinArea) {
    auditLogs.push({
      timestamp,
      category: 'painting',
      type: 'warning',
      message: `Premium/Luxury paint selected but total home painting area (${totalPaintingAreaHome.toFixed(1)} sqft) is below the minimum viability area (${rules.premiumMaterialMinArea} sqft). Labor setup may be cost-inefficient.`
    });
  }

  // 2. Painting MOQ (Enforced value from BusinessRules)
  if (totalPaintingAreaHome > 0 && totalPaintingAreaHome < rules.paintingMoqArea) {
    const deficit = rules.paintingMoqArea - totalPaintingAreaHome;
    const stdPaintItem = findRateCardItem('Painting', 'Asian Tractor Emulsion Fresh Painting (2 Pu + 1 Pr + 2 Pa)_Interior Paint_Painting');
    const paintRates = stdPaintItem ? getCityRate(stdPaintItem, global.city) : { rate: 20 };
    const moqCharge = deficit * paintRates.rate;
    
    bom.push({
      id: 'global-paint-moq-surcharge',
      superCategory: 'Painting',
      subSuperCategory: 'MOQ Constraint',
      itemName: 'Painting MOQ Adjustment Charge',
      description: `Surcharge for project painting area falling below ${rules.paintingMoqArea} sqft MOQ. Deficit: ${deficit.toFixed(1)} sqft billed.`,
      specification: 'MOQ Policy surcharge',
      brand: 'NA',
      unit: 'Sqft',
      quantity: deficit,
      rate: paintRates.rate,
      total: moqCharge,
      source: 'global_constraint',
      decisionTrigger: `Total home painting area is ${totalPaintingAreaHome.toFixed(1)} sqft, falling below the MOQ limit of ${rules.paintingMoqArea} sqft.`
    });
    paintingSubtotal += moqCharge;
    auditLogs.push({
      timestamp,
      category: 'painting',
      type: 'constraint',
      message: `Painting MOQ surcharge applied! Home total was ${totalPaintingAreaHome.toFixed(1)} sqft. Charged extra for ${deficit.toFixed(1)} sqft to reach ${rules.paintingMoqArea} sqft MOQ limit.`
    });
  }

  // 3. No Lift Material Carrying Charge (Enforced starting floor and rate per floor from BusinessRules)
  if (global.floorNumber > rules.noLiftCarrySurchargeFloorStart && !global.liftAvailable) {
    const penaltyFloorCount = global.floorNumber - rules.noLiftCarrySurchargeFloorStart;
    const ratePerFloor = rules.noLiftCarrySurchargePerFloor;
    const itemTotal = penaltyFloorCount * ratePerFloor;
    bom.push({
      id: 'global-carry-surcharge',
      superCategory: 'General Surcharge',
      subSuperCategory: 'Logistics Surcharge',
      itemName: 'Manual Material Carrying Surcharge (No Service Lift)',
      description: `Surcharge for carrying construction bags up to Floor ${global.floorNumber} without service lift access. Charged per floor above Floor ${rules.noLiftCarrySurchargeFloorStart}.`,
      specification: 'Logistics Surcharge',
      brand: 'NA',
      unit: 'Floors',
      quantity: penaltyFloorCount,
      rate: ratePerFloor,
      total: itemTotal,
      source: 'global_constraint',
      decisionTrigger: `Floor: ${global.floorNumber}, Lift: Not Available. Charged for ${penaltyFloorCount} floors above Floor ${rules.noLiftCarrySurchargeFloorStart} (₹${ratePerFloor}/floor).`
    });
    globalSubtotal += itemTotal;
    auditLogs.push({
      timestamp,
      category: 'global',
      type: 'constraint',
      message: `Added material manual carriage logistics charge (₹${itemTotal}) because site is on floor ${global.floorNumber} with no service lift access. Starts from Floor ${rules.noLiftCarrySurchargeFloorStart}.`
    });
  }

  // 4. Restricted Working Hours Surcharge (Enforced fee from BusinessRules)
  if (global.workingHoursRestricted) {
    const flatSurcharge = rules.restrictedHoursFee;
    bom.push({
      id: 'global-restricted-hours-surcharge',
      superCategory: 'General Surcharge',
      subSuperCategory: 'Society Penalty Surcharge',
      itemName: 'Society Restricted Working Hours Surcharge',
      description: 'Adjustment for short society working windows (extended silent hours timeline penalty). Covered under site constraints.',
      specification: 'Timeline extension buffer',
      brand: 'NA',
      unit: 'Flat Surcharge',
      quantity: 1,
      rate: flatSurcharge,
      total: flatSurcharge,
      source: 'global_constraint',
      decisionTrigger: `Society restricted working hours toggled. Rate: ₹${flatSurcharge}.`
    });
    globalSubtotal += flatSurcharge;
    auditLogs.push({
      timestamp,
      category: 'global',
      type: 'warning',
      message: `Added Restricted Working Hours Surcharge (₹${flatSurcharge}) due to strict society timing constraints.`
    });
  }

  // 5. Water Tanker Surcharge (rate from BusinessRules)
  if (!global.waterAvailable) {
    const surcharge = rules.waterTankerSurcharge;
    bom.push({
      id: 'global-water-tanker-surcharge',
      superCategory: 'General Surcharge',
      subSuperCategory: 'Site Constraint Surcharge',
      itemName: 'Water Tanker Delivery Surcharge',
      description: 'Site does not have running water access. Water tanker delivery arranged for construction use.',
      specification: 'Logistics Surcharge',
      brand: 'NA',
      unit: 'Flat Surcharge',
      quantity: 1,
      rate: surcharge,
      total: surcharge,
      source: 'global_constraint',
      decisionTrigger: `No running water on site. Rate from Business Rules: ₹${surcharge}.`
    });
    globalSubtotal += surcharge;
    auditLogs.push({
      timestamp,
      category: 'global',
      type: 'constraint',
      message: `Added Water Tanker Surcharge (₹${surcharge}) — site has no running water supply.`
    });
  }

  // 6. Diesel Generator Surcharge (rate from BusinessRules)
  if (!global.powerAvailable) {
    const surcharge = rules.generatorSurcharge;
    bom.push({
      id: 'global-generator-surcharge',
      superCategory: 'General Surcharge',
      subSuperCategory: 'Site Constraint Surcharge',
      itemName: 'Diesel Generator Surcharge',
      description: 'Site does not have electricity. Portable diesel generator arranged for power tools and lighting.',
      specification: 'Logistics Surcharge',
      brand: 'NA',
      unit: 'Flat Surcharge',
      quantity: 1,
      rate: surcharge,
      total: surcharge,
      source: 'global_constraint',
      decisionTrigger: `No electricity on site. Rate from Business Rules: ₹${surcharge}.`
    });
    globalSubtotal += surcharge;
    auditLogs.push({
      timestamp,
      category: 'global',
      type: 'constraint',
      message: `Added Diesel Generator Surcharge (₹${surcharge}) — site has no electricity supply.`
    });
  }

  // 7. Debris Removal Surcharge (rate from BusinessRules)
  if (global.debrisRemovalByVendor) {
    const surcharge = rules.debrisRemovalSurcharge;
    bom.push({
      id: 'global-debris-removal-surcharge',
      superCategory: 'General Surcharge',
      subSuperCategory: 'Site Constraint Surcharge',
      itemName: 'Demolition Debris Removal & Cartage Surcharge',
      description: 'Vendor will handle removal of demolition waste and construction debris from site.',
      specification: 'Logistics Surcharge',
      brand: 'NA',
      unit: 'Flat Surcharge',
      quantity: 1,
      rate: surcharge,
      total: surcharge,
      source: 'global_constraint',
      decisionTrigger: `Debris removal by vendor selected. Rate from Business Rules: ₹${surcharge}.`
    });
    globalSubtotal += surcharge;
    auditLogs.push({
      timestamp,
      category: 'global',
      type: 'constraint',
      message: `Added Debris Removal Surcharge (₹${surcharge}) — vendor handles demolition waste disposal.`
    });
  }

  // 8. Vehicle Entry Restriction Surcharge (rate from BusinessRules)
  if (global.vehicleEntryRestricted) {
    const surcharge = rules.vehicleEntryManualCarry;
    bom.push({
      id: 'global-vehicle-entry-surcharge',
      superCategory: 'General Surcharge',
      subSuperCategory: 'Site Constraint Surcharge',
      itemName: 'Transit / Loading Manual Carry Surcharge',
      description: 'Delivery vehicles cannot enter the society premises. Material must be manually carried from gate to site.',
      specification: 'Logistics Surcharge',
      brand: 'NA',
      unit: 'Flat Surcharge',
      quantity: 1,
      rate: surcharge,
      total: surcharge,
      source: 'global_constraint',
      decisionTrigger: `Vehicle entry restricted in society. Rate from Business Rules: ₹${surcharge}.`
    });
    globalSubtotal += surcharge;
    auditLogs.push({
      timestamp,
      category: 'global',
      type: 'constraint',
      message: `Added Vehicle Entry Surcharge (₹${surcharge}) — vehicles cannot enter society for delivery.`
    });
  }

  return {
    bom,
    auditLogs,
    totals: {
      painting: paintingSubtotal,
      falseCeiling: fcSubtotal,
      electrical: electricalSubtotal,
      plumbing: plumbingSubtotal,
      globalConstraints: globalSubtotal,
      grandTotal: paintingSubtotal + fcSubtotal + electricalSubtotal + plumbingSubtotal + globalSubtotal
    },
    roomBreakdowns
  };
}
