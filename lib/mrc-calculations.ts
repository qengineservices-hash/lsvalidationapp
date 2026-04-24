/**
 * MRC Engine Calculations Logic
 * 
 * This module contains the business rules for converting site validation
 * measurement values to quantifiable amounts for MRC items based on properties
 * such as service_on, unit type, and room type.
 */

export interface RoomMeasurements {
  roomLength?: number;
  roomWidth?: number;
  ceilingHeight?: number;
  skirtingHeight?: number; // optional, default 0.4 ft
}

export interface RoomData {
  id: string;
  name: string;
  measurements: RoomMeasurements;
}

export interface MRCItem {
  id: string;
  sku_code: string;
  sku_name: string;
  category_id: string;
  sub_category_id: string;
  city_id?: string | null;
  unit: string;
  rate: number;
  service_on?: string | null;
  // Optional relations useful for rules engine
  category_name?: string;
  sub_category_name?: string;
}

const round2 = (num: number): number => {
  return Math.round(num * 100) / 100;
};

/**
 * Returns: roomLength × roomWidth (in SqFt)
 * Used for: False Ceiling SKUs, Ceiling Painting
 */
export function calculateCeilingArea(room: RoomMeasurements): number {
  const l = room.roomLength || 0;
  const w = room.roomWidth || 0;
  return round2(l * w);
}

/**
 * Returns: 2 × (roomLength + roomWidth) × ceilingHeight (in SqFt)
 * Used for: Wall Painting (gross area, no deductions — editable by VL)
 * 
 * Note: Deductions strictly for doors/windows are intentionally excluded 
 * for MVP and will be managed through a future CRM integration or manual editing.
 */
export function calculateWallArea(room: RoomMeasurements): number {
  const l = room.roomLength || 0;
  const w = room.roomWidth || 0;
  const h = room.ceilingHeight || 0;
  return round2(2 * (l + w) * h);
}

/**
 * Returns: roomLength × roomWidth (in SqFt)
 * Used for: Flooring, Floor tile SKUs
 */
export function calculateFloorArea(room: RoomMeasurements): number {
  const l = room.roomLength || 0;
  const w = room.roomWidth || 0;
  return round2(l * w);
}

/**
 * Returns: 2 × (roomLength + roomWidth) (in Running Feet)
 * Used for: Skirting SKUs
 */
export function calculateSkirtingLength(room: RoomMeasurements): number {
  const l = room.roomLength || 0;
  const w = room.roomWidth || 0;
  return round2(2 * (l + w));
}

/**
 * Returns: 2 × (roomLength + roomWidth) (in Running Feet)
 * Used for: Gypsum Cove SKUs
 */
export function calculateCoveLength(room: RoomMeasurements): number {
  const l = room.roomLength || 0;
  const w = room.roomWidth || 0;
  return round2(2 * (l + w));
}

export interface AutoQuantityResult {
  quantity: number;
  basis: string;
  isAutoCalculated: boolean;
}

/**
 * Based on the SKU's service_on field and category name, 
 * returns the appropriate auto-calculated quantity.
 */
export function getAutoQuantity(
  skuItem: MRCItem,
  room: RoomMeasurements
): AutoQuantityResult | null {
  if (!room) return null;

  const serviceOn = skuItem.service_on || "";
  const catName = skuItem.category_name || "";
  const subCatName = skuItem.sub_category_name || "";
  const skuName = skuItem.sku_name || "";
  const unit = skuItem.unit || "";

  // Manual Entry Check
  if (
    serviceOn === "Nos" ||
    serviceOn === "Wall-N" ||
    serviceOn === "Wall-S" ||
    unit === "Nos"
  ) {
    return null;
  }

  // Ceiling Painting
  if (serviceOn === "Ceiling" && catName.includes("Painting")) {
    return {
      quantity: calculateCeilingArea(room),
      basis: "Ceiling area (L×W)",
      isAutoCalculated: true,
    };
  }

  // False Ceiling
  if (serviceOn === "Ceiling" && catName.includes("False Ceiling")) {
    return {
      quantity: calculateCeilingArea(room),
      basis: "Ceiling area (L×W)",
      isAutoCalculated: true,
    };
  }

  // Wall Painting
  if (serviceOn === "Walls" && catName.includes("Painting")) {
    return {
      quantity: calculateWallArea(room),
      basis: "Wall area 2(L+W)×H — no deductions",
      isAutoCalculated: true,
    };
  }

  // Floor
  if (serviceOn === "Floor") {
    return {
      quantity: calculateFloorArea(room),
      basis: "Floor area (L×W)",
      isAutoCalculated: true,
    };
  }

  // Cove
  if (serviceOn === "Ceiling" && subCatName.includes("Cove")) {
    return {
      quantity: calculateCoveLength(room),
      basis: "Cove perimeter 2(L+W)",
      isAutoCalculated: true,
    };
  }

  // Skirting
  if (skuName.includes("Skirting")) {
    return {
      quantity: calculateSkirtingLength(room),
      basis: "Skirting perimeter 2(L+W)",
      isAutoCalculated: true,
    };
  }

  // Default fallback
  return null;
}

/**
 * Runs getAutoQuantity across a collection of rooms and returns a map.
 */
export function getAutoQuantityForAllRooms(
  rooms: Record<string, RoomData>,
  skuItem: MRCItem
): Record<string, AutoQuantityResult | null> {
  const result: Record<string, AutoQuantityResult | null> = {};

  if (!rooms) return result;

  for (const [roomId, roomData] of Object.entries(rooms)) {
    if (roomData && roomData.measurements) {
      result[roomId] = getAutoQuantity(skuItem, roomData.measurements);
    } else {
      result[roomId] = null;
    }
  }

  return result;
}

/**
 * Maps common unit strings to the type of calculation applied (useful for UI hints)
 */
export const UNIT_TO_CALCULATION_MAP: Record<string, string> = {
  SqFt: "Area Calculation (L×W or 2(L+W)×H)",
  SqM: "Area Calculation (Converted from SqFt)",
  RFt: "Perimeter Calculation (2(L+W))",
  RMt: "Perimeter Calculation (Converted from RFt)",
  Nos: "Manual Entry Required",
  Lumpsum: "Manual Entry Required",
  Trip: "Manual Entry Required",
  Package: "Manual Entry Required"
};
