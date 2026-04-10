/**
 * LS Services Business Logic Rules
 * Extracted from legacy HTML PoCs.
 */

export const MEASUREMENT_RULES = {
  ceiling_height: { min: 2000, max: 5000, unit: "mm" },
  diagonal: { min: 1000, max: 20000, unit: "mm" },
  wall_distance: { min: 500, max: 15000, unit: "mm" },
};

/**
 * Checks for large diagonal variance in a room.
 * @returns description of the issue or null if OK
 */
export function checkDiagonalVariance(diag1: number, diag2: number): string | null {
  if (!diag1 || !diag2) return null;
  const diff = Math.abs(diag1 - diag2);
  if (diff > 20) {
    return `Room walls are not in level. Room diagonal deviation > 20 mm so plastering will be required`;
  }
  if (diff >= 10) {
    return `Room walls are not in level. Room diagonal deviation < 20 mm so punning will be required`;
  }
  return null;
}

/**
 * Checks for true ceiling level deviation.
 */
export function checkCeilingVariation(heights: number[]): string | null {
  const validHeights = heights.filter((h) => h > 0);
  if (validHeights.length < 2) return null;
  const diff = Math.max(...validHeights) - Math.min(...validHeights);
  if (diff > 20) {
    return `True ceiling level (corners and center) deviation of > 20 mm observed. Only flat false ceiling is suggested. No peripheral ceiling to be done.`;
  }
  return null;
}

/**
 * Checks for AC space constraints based on soffit height.
 */
export function checkACConstraint(soffits: { wall: string; value: number }[]): string | null {
  const constrainedWalls = soffits
    .filter((s) => s.value > 0 && s.value < 800)
    .map((s) => s.wall);
  
  if (constrainedWalls.length === 0) return null;
  return `AC space constraint on walls ${constrainedWalls.join(", ")}. False ceiling pocket required for installation.`;
}
