import { FurnitureItem, Room, RoomAssignment, PlacedItem } from './types';

const STORAGE_KEYS = {
  ROOMS: 'floorplan_rooms_v1',
  INVENTORY: 'floorplan_inventory_v1',
  ASSIGNMENTS: 'floorplan_assignments_v1',
  PLACEMENTS: 'floorplan_placements_v1',
  ACTIVE_ROOM_ID: 'floorplan_active_room_id_v1',
};

export const INITIAL_FURNITURE: FurnitureItem[] = [
  {
    id: 'furn-bed-1',
    name: 'Bed',
    widthInches: 41,
    depthInches: 78,
    heightInches: 36,
    category: 'Bed',
    notes: 'Twin / Single mattress frame',
    createdAt: 1700000000000,
  },
  {
    id: 'furn-bedside-1',
    name: 'Bedside Table',
    widthInches: 22.75,
    depthInches: 17.25,
    heightInches: 24,
    category: 'Storage',
    notes: 'Nightstand with 2 drawers',
    createdAt: 1700000001000,
  },
  {
    id: 'furn-desk-1',
    name: 'Roll Top Desk',
    widthInches: 34.75,
    depthInches: 16.25,
    heightInches: 42,
    category: 'Desk',
    notes: 'Classic roll top workspace',
    createdAt: 1700000002000,
  },
  {
    id: 'furn-storage-1',
    name: 'Clothes Storage',
    widthInches: 34.75,
    depthInches: 18.5,
    heightInches: 48,
    category: 'Storage',
    notes: 'Dresser / wardrobe unit',
    createdAt: 1700000003000,
  },
  {
    id: 'furn-bookshelf-1',
    name: 'Bookshelf',
    widthInches: 29,
    depthInches: 12.25,
    heightInches: 72,
    category: 'Storage',
    notes: '5-tier vertical shelf',
    createdAt: 1700000004000,
  },
];

export const INITIAL_ROOMS: Room[] = [
  {
    id: 'room-master-bed',
    name: 'Master Bedroom',
    widthInches: 144, // 12' 0"
    lengthInches: 168, // 14' 0"
    doorWindowDeductionPct: 20,
    notes: 'Main bedroom with closet door and 1 window',
    createdAt: 1700000000000,
  },
  {
    id: 'room-home-office',
    name: 'Home Office / Study',
    widthInches: 126, // 10' 6"
    lengthInches: 132, // 11' 0"
    doorWindowDeductionPct: 15,
    notes: 'Work from home room with north window',
    createdAt: 1700000001000,
  },
  {
    id: 'room-living-room',
    name: 'Living Room',
    widthInches: 168, // 14' 0"
    lengthInches: 216, // 18' 0"
    doorWindowDeductionPct: 25,
    notes: 'Open layout seating and entertainment space',
    createdAt: 1700000002000,
  },
];

export const INITIAL_ASSIGNMENTS: RoomAssignment[] = [
  { roomId: 'room-master-bed', furnitureId: 'furn-bed-1', quantity: 1 },
  { roomId: 'room-master-bed', furnitureId: 'furn-bedside-1', quantity: 2 },
  { roomId: 'room-master-bed', furnitureId: 'furn-storage-1', quantity: 1 },
  { roomId: 'room-home-office', furnitureId: 'furn-desk-1', quantity: 1 },
  { roomId: 'room-home-office', furnitureId: 'furn-bookshelf-1', quantity: 1 },
];

export const INITIAL_PLACEMENTS: PlacedItem[] = [
  {
    instanceId: 'inst-bed-1',
    furnitureId: 'furn-bed-1',
    roomId: 'room-master-bed',
    xInches: 51.5,
    yInches: 12,
    rotation: 0,
  },
  {
    instanceId: 'inst-bedside-1',
    furnitureId: 'furn-bedside-1',
    roomId: 'room-master-bed',
    xInches: 20,
    yInches: 12,
    rotation: 0,
  },
  {
    instanceId: 'inst-bedside-2',
    furnitureId: 'furn-bedside-1',
    roomId: 'room-master-bed',
    xInches: 101.25,
    yInches: 12,
    rotation: 0,
  },
  {
    instanceId: 'inst-storage-1',
    furnitureId: 'furn-storage-1',
    roomId: 'room-master-bed',
    xInches: 110,
    yInches: 100,
    rotation: 270,
  },
  {
    instanceId: 'inst-desk-1',
    furnitureId: 'furn-desk-1',
    roomId: 'room-home-office',
    xInches: 16,
    yInches: 12,
    rotation: 0,
  },
  {
    instanceId: 'inst-bookshelf-1',
    furnitureId: 'furn-bookshelf-1',
    roomId: 'room-home-office',
    xInches: 85,
    yInches: 12,
    rotation: 0,
  },
];

export class AppStorage {
  static getRooms(): Room[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ROOMS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    this.saveRooms(INITIAL_ROOMS);
    return INITIAL_ROOMS;
  }

  static saveRooms(rooms: Room[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ROOMS, JSON.stringify(rooms));
    } catch (e) {
      console.error('Failed to save rooms to localStorage', e);
    }
  }

  static getInventory(): FurnitureItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {
      // fallback
    }
    this.saveInventory(INITIAL_FURNITURE);
    return INITIAL_FURNITURE;
  }

  static saveInventory(items: FurnitureItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
    } catch (e) {
      console.error('Failed to save inventory to localStorage', e);
    }
  }

  static getAssignments(): RoomAssignment[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.ASSIGNMENTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    this.saveAssignments(INITIAL_ASSIGNMENTS);
    return INITIAL_ASSIGNMENTS;
  }

  static saveAssignments(assignments: RoomAssignment[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ASSIGNMENTS, JSON.stringify(assignments));
    } catch (e) {
      console.error('Failed to save assignments to localStorage', e);
    }
  }

  static getPlacements(): PlacedItem[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.PLACEMENTS);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch {
      // fallback
    }
    this.savePlacements(INITIAL_PLACEMENTS);
    return INITIAL_PLACEMENTS;
  }

  static savePlacements(placements: PlacedItem[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.PLACEMENTS, JSON.stringify(placements));
    } catch (e) {
      console.error('Failed to save placements to localStorage', e);
    }
  }

  static getActiveRoomId(availableRooms: Room[]): string {
    try {
      const stored = localStorage.getItem(STORAGE_KEYS.ACTIVE_ROOM_ID);
      if (stored && availableRooms.some((r) => r.id === stored)) {
        return stored;
      }
    } catch {
      // fallback
    }
    const firstId = availableRooms[0]?.id || '';
    this.setActiveRoomId(firstId);
    return firstId;
  }

  static setActiveRoomId(id: string): void {
    try {
      localStorage.setItem(STORAGE_KEYS.ACTIVE_ROOM_ID, id);
    } catch (e) {
      console.error('Failed to save active room id', e);
    }
  }

  static resetToDefaults(): void {
    localStorage.removeItem(STORAGE_KEYS.ROOMS);
    localStorage.removeItem(STORAGE_KEYS.INVENTORY);
    localStorage.removeItem(STORAGE_KEYS.ASSIGNMENTS);
    localStorage.removeItem(STORAGE_KEYS.PLACEMENTS);
    localStorage.removeItem(STORAGE_KEYS.ACTIVE_ROOM_ID);
  }
}
