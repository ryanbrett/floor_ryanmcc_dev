import { FurnitureItem, Room, RoomAssignment, RoomAnalysis, ClearanceStatus } from './types';

/**
 * Format total inches into a readable "X' Y\"" string
 */
export function formatInchesToFtIn(totalInches: number): string {
  if (isNaN(totalInches) || totalInches <= 0) return "0'";
  const feet = Math.floor(totalInches / 12);
  const inches = Math.round((totalInches % 12) * 100) / 100;
  
  if (inches === 0) {
    return `${feet}'`;
  }
  return `${feet}' ${inches}"`;
}

/**
 * Parse feet and inches into total inches
 */
export function parseFtInToInches(feet: number, inches: number = 0): number {
  const safeFt = isNaN(feet) ? 0 : Math.max(0, feet);
  const safeIn = isNaN(inches) ? 0 : Math.max(0, inches);
  return safeFt * 12 + safeIn;
}

/**
 * Calculate square footage from width & length in inches (W * L / 144)
 */
export function calculateSquareFootage(widthInches: number, lengthInches: number): number {
  if (widthInches <= 0 || lengthInches <= 0) return 0;
  return Math.round(((widthInches * lengthInches) / 144) * 100) / 100;
}

/**
 * Calculate linear perimeter in feet: 2 * (W + L) / 12
 */
export function calculatePerimeterFt(widthInches: number, lengthInches: number): number {
  if (widthInches <= 0 || lengthInches <= 0) return 0;
  return Math.round(((2 * (widthInches + lengthInches)) / 12) * 100) / 100;
}

/**
 * Full space fitting analysis for a room given current assignments and inventory
 */
export function analyzeRoomSpace(
  room: Room,
  assignments: RoomAssignment[],
  inventory: FurnitureItem[]
): RoomAnalysis {
  const roomAreaSqFt = calculateSquareFootage(room.widthInches, room.lengthInches);
  const roomPerimeterFt = calculatePerimeterFt(room.widthInches, room.lengthInches);
  
  // Usable wall perimeter (accounting for door/closet/window clearance, typically 20%)
  const deductionPct = room.doorWindowDeductionPct ?? 20;
  const usablePerimeterFt = Math.round(roomPerimeterFt * (1 - deductionPct / 100) * 100) / 100;

  const roomAssignments = assignments.filter((a) => a.roomId === room.id && a.quantity > 0);
  
  let totalFurnitureAreaSqFt = 0;
  let totalFurnitureWidthInches = 0;
  let totalItemsCount = 0;
  const warnings: string[] = [];

  const inventoryMap = new Map<string, FurnitureItem>(inventory.map((item) => [item.id, item]));

  const assignedItems = roomAssignments.map((assignment) => {
    const item = inventoryMap.get(assignment.furnitureId);
    if (!item) return null;

    const footprintSqFt = calculateSquareFootage(item.widthInches, item.depthInches);
    const totalFootprintSqFt = Math.round(footprintSqFt * assignment.quantity * 100) / 100;
    const totalWidthInches = item.widthInches * assignment.quantity;

    totalFurnitureAreaSqFt += totalFootprintSqFt;
    totalFurnitureWidthInches += totalWidthInches;
    totalItemsCount += assignment.quantity;

    // Check if the single item physical dimensions physically exceed room bounds
    const maxRoomDim = Math.max(room.widthInches, room.lengthInches);
    const minRoomDim = Math.min(room.widthInches, room.lengthInches);
    const maxItemDim = Math.max(item.widthInches, item.depthInches);
    const minItemDim = Math.min(item.widthInches, item.depthInches);

    const fitsRoomDimensions = maxItemDim <= maxRoomDim && minItemDim <= minRoomDim;

    if (!fitsRoomDimensions) {
      warnings.push(`"${item.name}" (${item.widthInches}" × ${item.depthInches}") is larger than the room dimensions (${room.widthInches}" × ${room.lengthInches}")!`);
    }

    return {
      item,
      quantity: assignment.quantity,
      footprintSqFt,
      totalFootprintSqFt,
      totalWidthInches,
      fitsRoomDimensions,
    };
  }).filter((x): x is NonNullable<typeof x> => x !== null);

  totalFurnitureAreaSqFt = Math.round(totalFurnitureAreaSqFt * 100) / 100;
  const openFloorAreaSqFt = Math.round(Math.max(0, roomAreaSqFt - totalFurnitureAreaSqFt) * 100) / 100;
  
  const openFloorPercentage = roomAreaSqFt > 0
    ? Math.max(0, Math.round(((roomAreaSqFt - totalFurnitureAreaSqFt) / roomAreaSqFt) * 1000) / 10)
    : 0;

  const furnitureOccupancyPct = roomAreaSqFt > 0
    ? Math.min(100, Math.round((totalFurnitureAreaSqFt / roomAreaSqFt) * 1000) / 10)
    : 0;

  const totalFurnitureWidthFt = Math.round((totalFurnitureWidthInches / 12) * 100) / 100;
  const wallSpaceUsagePct = usablePerimeterFt > 0
    ? Math.round((totalFurnitureWidthFt / usablePerimeterFt) * 1000) / 10
    : 0;

  // Wall perimeter warning checks
  if (totalFurnitureWidthFt > roomPerimeterFt) {
    warnings.push(`Total furniture perimeter length (${totalFurnitureWidthFt} ft) exceeds 100% of entire room perimeter (${roomPerimeterFt} ft)!`);
  } else if (totalFurnitureWidthFt > usablePerimeterFt) {
    warnings.push(`Furniture wall-space (${totalFurnitureWidthFt} ft) exceeds estimated usable wall space (${usablePerimeterFt} ft), factoring in doors & windows.`);
  }

  // Determine Clearance & Traffic Circulation status
  let clearanceStatus: ClearanceStatus = 'spacious';
  let clearanceLabel = 'Spacious & Open';

  if (totalFurnitureAreaSqFt > roomAreaSqFt) {
    clearanceStatus = 'overcrowded';
    clearanceLabel = 'Critical Overcrowding (Exceeds Floor Area)';
    warnings.push(`Furniture footprint (${totalFurnitureAreaSqFt} sq ft) exceeds total room area (${roomAreaSqFt} sq ft)!`);
  } else if (openFloorPercentage < 25 || wallSpaceUsagePct > 90) {
    clearanceStatus = 'overcrowded';
    clearanceLabel = 'Severely Constrained (< 25% Open Floor)';
    warnings.push(`Low floor clearance! Less than 25% open space available for comfortable walking paths.`);
  } else if (openFloorPercentage < 40 || wallSpaceUsagePct > 75) {
    clearanceStatus = 'tight';
    clearanceLabel = 'Tight Fit (40% or less Open Floor)';
  } else if (openFloorPercentage < 55) {
    clearanceStatus = 'moderate';
    clearanceLabel = 'Moderate / Cozy (50% Open Floor)';
  } else if (openFloorPercentage < 70) {
    clearanceStatus = 'comfortable';
    clearanceLabel = 'Comfortable Layout (55-70% Open Floor)';
  } else {
    clearanceStatus = 'spacious';
    clearanceLabel = 'Spacious & Open (> 70% Open Floor)';
  }

  return {
    room,
    roomAreaSqFt,
    roomPerimeterFt,
    usablePerimeterFt,
    assignedItems,
    totalItemsCount,
    totalFurnitureAreaSqFt,
    openFloorAreaSqFt,
    openFloorPercentage,
    furnitureOccupancyPct,
    totalFurnitureWidthFt,
    wallSpaceUsagePct,
    clearanceStatus,
    clearanceLabel,
    warnings,
  };
}
