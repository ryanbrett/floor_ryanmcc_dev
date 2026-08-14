export type FurnitureCategory = 'Bed' | 'Storage' | 'Desk' | 'Seating' | 'Custom';

export interface FurnitureItem {
  id: string;
  name: string;
  widthInches: number;      // e.g. 41"
  depthInches: number;      // e.g. 78" (or length)
  heightInches?: number;    // optional
  category: FurnitureCategory;
  notes?: string;
  createdAt: number;
}

export interface Room {
  id: string;
  name: string;
  widthInches: number;      // e.g. 144" (12 ft)
  lengthInches: number;     // e.g. 168" (14 ft)
  notes?: string;
  doorWindowDeductionPct?: number; // default 15-20% for doors/windows perimeter loss
  createdAt: number;
}

export interface RoomAssignment {
  roomId: string;
  furnitureId: string;
  quantity: number;
}

export interface PlacedItem {
  instanceId: string;
  furnitureId: string;
  roomId: string;
  xInches: number;
  yInches: number;
  rotation: 0 | 90 | 180 | 270;
}

export type ClearanceStatus = 'spacious' | 'comfortable' | 'moderate' | 'tight' | 'overcrowded';

export interface RoomAnalysis {
  room: Room;
  roomAreaSqFt: number;
  roomPerimeterFt: number;
  usablePerimeterFt: number;
  assignedItems: Array<{
    item: FurnitureItem;
    quantity: number;
    footprintSqFt: number;
    totalFootprintSqFt: number;
    totalWidthInches: number;
    fitsRoomDimensions: boolean;
  }>;
  totalItemsCount: number;
  totalFurnitureAreaSqFt: number;
  openFloorAreaSqFt: number;
  openFloorPercentage: number;
  furnitureOccupancyPct: number;
  totalFurnitureWidthFt: number;
  wallSpaceUsagePct: number;
  clearanceStatus: ClearanceStatus;
  clearanceLabel: string;
  warnings: string[];
}

export type ActiveTab = 'fit-analysis' | 'rooms' | 'inventory' | 'matrix';
