import { FurnitureCategory, FurnitureItem, Room, RoomAssignment, PlacedItem, ActiveTab, RoomAnalysis } from './types';
import { AppStorage } from './storage';
import { analyzeRoomSpace } from './calculator';

export type ModalType = 
  | null
  | { type: 'add-room' }
  | { type: 'edit-room'; room: Room }
  | { type: 'add-furniture' }
  | { type: 'edit-furniture'; item: FurnitureItem }
  | { type: 'move-furniture'; furnitureId: string; fromRoomId: string }
  | { type: 'backup-settings' }
  | { type: 'confirm-delete-room'; room: Room }
  | { type: 'confirm-delete-furniture'; item: FurnitureItem };

class AppStateManager {
  private rooms: Room[] = [];
  private inventory: FurnitureItem[] = [];
  private assignments: RoomAssignment[] = [];
  private placements: PlacedItem[] = [];
  private activeRoomId: string = '';
  private activeTab: ActiveTab = 'fit-analysis';
  private currentModal: ModalType = null;
  private inventoryCategoryFilter: string = 'All';
  private inventorySearchQuery: string = '';
  private selectedPlacementId: string | null = null;
  private showClearanceOverlay: boolean = false;
  private snapGridInches: number = 6; // 0 for freeform, 6 or 12
  private listeners: Array<() => void> = [];

  constructor() {
    this.loadFromStorage();
  }

  public loadFromStorage(): void {
    this.rooms = AppStorage.getRooms();
    this.inventory = AppStorage.getInventory();
    this.assignments = AppStorage.getAssignments();
    this.placements = AppStorage.getPlacements();
    this.activeRoomId = AppStorage.getActiveRoomId(this.rooms);
    this.ensurePlacementsSynchronized();
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter((l) => l !== listener);
    };
  }

  private notify(): void {
    this.listeners.forEach((l) => l());
  }

  // Getters
  public getRooms(): Room[] {
    return [...this.rooms];
  }

  public getInventory(): FurnitureItem[] {
    return [...this.inventory];
  }

  public getAssignments(): RoomAssignment[] {
    return [...this.assignments];
  }

  public getPlacements(): PlacedItem[] {
    return [...this.placements];
  }

  public getPlacementsForRoom(roomId: string): PlacedItem[] {
    return this.placements.filter((p) => p.roomId === roomId);
  }

  public getSelectedPlacementId(): string | null {
    return this.selectedPlacementId;
  }

  public setSelectedPlacementId(instanceId: string | null, silent = false): void {
    this.selectedPlacementId = instanceId;
    if (!silent) {
      this.notify();
    }
  }

  public getShowClearanceOverlay(): boolean {
    return this.showClearanceOverlay;
  }

  public setShowClearanceOverlay(show: boolean): void {
    this.showClearanceOverlay = show;
    this.notify();
  }

  public getSnapGridInches(): number {
    return this.snapGridInches;
  }

  public setSnapGridInches(inches: number): void {
    this.snapGridInches = inches;
    this.notify();
  }

  public getActiveRoom(): Room | undefined {
    return this.rooms.find((r) => r.id === this.activeRoomId) || this.rooms[0];
  }

  public getActiveRoomId(): string {
    return this.activeRoomId;
  }

  public getActiveTab(): ActiveTab {
    return this.activeTab;
  }

  public getModal(): ModalType {
    return this.currentModal;
  }

  public getInventoryFilter(): { category: string; search: string } {
    return {
      category: this.inventoryCategoryFilter,
      search: this.inventorySearchQuery,
    };
  }

  public getActiveRoomAnalysis(): RoomAnalysis | null {
    const activeRoom = this.getActiveRoom();
    if (!activeRoom) return null;
    return analyzeRoomSpace(activeRoom, this.assignments, this.inventory);
  }

  public getAllRoomsAnalysis(): RoomAnalysis[] {
    return this.rooms.map((room) => analyzeRoomSpace(room, this.assignments, this.inventory));
  }

  // Navigation & Modals
  public setActiveTab(tab: ActiveTab): void {
    this.activeTab = tab;
    this.notify();
  }

  public setActiveRoomId(roomId: string): void {
    this.activeRoomId = roomId;
    AppStorage.setActiveRoomId(roomId);
    this.selectedPlacementId = null;
    this.ensurePlacementsSynchronized();
    this.notify();
  }

  public openModal(modal: ModalType): void {
    this.currentModal = modal;
    this.notify();
  }

  public closeModal(): void {
    this.currentModal = null;
    this.notify();
  }

  public setInventoryFilter(category: string, search: string): void {
    this.inventoryCategoryFilter = category;
    this.inventorySearchQuery = search;
    this.notify();
  }

  // Room Actions
  public addRoom(roomData: Omit<Room, 'id' | 'createdAt'>): void {
    const newRoom: Room = {
      ...roomData,
      id: `room-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
    };
    this.rooms.push(newRoom);
    AppStorage.saveRooms(this.rooms);
    this.setActiveRoomId(newRoom.id);
    this.closeModal();
  }

  public updateRoom(roomId: string, updates: Partial<Omit<Room, 'id' | 'createdAt'>>): void {
    this.rooms = this.rooms.map((r) => (r.id === roomId ? { ...r, ...updates } : r));
    AppStorage.saveRooms(this.rooms);
    this.closeModal();
    this.notify();
  }

  public deleteRoom(roomId: string): void {
    this.rooms = this.rooms.filter((r) => r.id !== roomId);
    this.assignments = this.assignments.filter((a) => a.roomId !== roomId);
    this.placements = this.placements.filter((p) => p.roomId !== roomId);
    AppStorage.saveRooms(this.rooms);
    AppStorage.saveAssignments(this.assignments);
    AppStorage.savePlacements(this.placements);
    
    if (this.activeRoomId === roomId) {
      this.activeRoomId = this.rooms[0]?.id || '';
      AppStorage.setActiveRoomId(this.activeRoomId);
    }
    this.closeModal();
    this.notify();
  }

  // Furniture Actions
  public addFurniture(itemData: Omit<FurnitureItem, 'id' | 'createdAt'>): void {
    const newItem: FurnitureItem = {
      ...itemData,
      id: `furn-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      createdAt: Date.now(),
    };
    this.inventory.push(newItem);
    AppStorage.saveInventory(this.inventory);
    this.closeModal();
    this.notify();
  }

  public updateFurniture(itemId: string, updates: Partial<Omit<FurnitureItem, 'id' | 'createdAt'>>): void {
    this.inventory = this.inventory.map((item) => (item.id === itemId ? { ...item, ...updates } : item));
    AppStorage.saveInventory(this.inventory);
    this.closeModal();
    this.notify();
  }

  public deleteFurniture(itemId: string): void {
    this.inventory = this.inventory.filter((item) => item.id !== itemId);
    this.assignments = this.assignments.filter((a) => a.furnitureId !== itemId);
    this.placements = this.placements.filter((p) => p.furnitureId !== itemId);
    AppStorage.saveInventory(this.inventory);
    AppStorage.saveAssignments(this.assignments);
    AppStorage.savePlacements(this.placements);
    this.closeModal();
    this.notify();
  }

  // Assignment & Placement Synchronization
  private ensurePlacementsSynchronized(): void {
    const room = this.getActiveRoom();
    if (!room) return;

    let modified = false;
    const roomAssignments = this.assignments.filter((a) => a.roomId === room.id);

    roomAssignments.forEach((assignment) => {
      const existingPlacements = this.placements.filter(
        (p) => p.roomId === room.id && p.furnitureId === assignment.furnitureId
      );
      const item = this.inventory.find((i) => i.id === assignment.furnitureId);
      if (!item) return;

      if (existingPlacements.length < assignment.quantity) {
        const needed = assignment.quantity - existingPlacements.length;
        for (let i = 0; i < needed; i++) {
          const smartPos = this.calculateSmartPosition(room, item, this.placements.filter((p) => p.roomId === room.id));
          const newPlacement: PlacedItem = {
            instanceId: `inst-${Date.now()}-${Math.random().toString(36).substr(2, 6)}`,
            furnitureId: item.id,
            roomId: room.id,
            xInches: smartPos.x,
            yInches: smartPos.y,
            rotation: smartPos.rotation,
          };
          this.placements.push(newPlacement);
          modified = true;
        }
      } else if (existingPlacements.length > assignment.quantity) {
        const excessCount = existingPlacements.length - assignment.quantity;
        const toRemove = existingPlacements.slice(-excessCount);
        const toRemoveIds = new Set(toRemove.map((p) => p.instanceId));
        this.placements = this.placements.filter((p) => !toRemoveIds.has(p.instanceId));
        modified = true;
      }
    });

    // Remove any orphaned placements where assignment is 0
    const validFurnIds = new Set(roomAssignments.map((a) => a.furnitureId));
    const initialPlacementsCount = this.placements.length;
    this.placements = this.placements.filter(
      (p) => p.roomId !== room.id || validFurnIds.has(p.furnitureId)
    );
    if (this.placements.length !== initialPlacementsCount) {
      modified = true;
    }

    if (modified) {
      AppStorage.savePlacements(this.placements);
    }
  }

  private calculateSmartPosition(
    room: Room,
    item: FurnitureItem,
    roomPlacements: PlacedItem[]
  ): { x: number; y: number; rotation: 0 | 90 | 180 | 270 } {
    const margin = 12; // 1 ft from wall
    const w = item.widthInches;
    const d = item.depthInches;

    // Try arranging in open spots
    const step = 24;
    for (let y = margin; y <= room.lengthInches - d - margin; y += step) {
      for (let x = margin; x <= room.widthInches - w - margin; x += step) {
        const overlap = roomPlacements.some((p) => {
          const otherItem = this.inventory.find((i) => i.id === p.furnitureId);
          if (!otherItem) return false;
          const otherW = p.rotation === 90 || p.rotation === 270 ? otherItem.depthInches : otherItem.widthInches;
          const otherH = p.rotation === 90 || p.rotation === 270 ? otherItem.widthInches : otherItem.depthInches;
          return !(
            x + w + 6 <= p.xInches ||
            x >= p.xInches + otherW + 6 ||
            y + d + 6 <= p.yInches ||
            y >= p.yInches + otherH + 6
          );
        });

        if (!overlap) {
          return { x, y, rotation: 0 };
        }
      }
    }

    // Default fallback near center
    const fallbackX = Math.max(6, Math.min(room.widthInches - w - 6, (room.widthInches - w) / 2));
    const fallbackY = Math.max(6, Math.min(room.lengthInches - d - 6, (room.lengthInches - d) / 2));
    return { x: fallbackX, y: fallbackY, rotation: 0 };
  }

  // Assignment Actions
  public assignItemToRoom(roomId: string, furnitureId: string, quantity: number = 1): void {
    const existing = this.assignments.find((a) => a.roomId === roomId && a.furnitureId === furnitureId);
    if (existing) {
      existing.quantity += quantity;
    } else {
      this.assignments.push({ roomId, furnitureId, quantity });
    }
    AppStorage.saveAssignments(this.assignments);
    this.ensurePlacementsSynchronized();
    this.notify();
  }

  public setItemQuantityInRoom(roomId: string, furnitureId: string, quantity: number): void {
    if (quantity <= 0) {
      this.unassignItemFromRoom(roomId, furnitureId);
      return;
    }
    const existing = this.assignments.find((a) => a.roomId === roomId && a.furnitureId === furnitureId);
    if (existing) {
      existing.quantity = quantity;
    } else {
      this.assignments.push({ roomId, furnitureId, quantity });
    }
    AppStorage.saveAssignments(this.assignments);
    this.ensurePlacementsSynchronized();
    this.notify();
  }

  public unassignItemFromRoom(roomId: string, furnitureId: string): void {
    this.assignments = this.assignments.filter(
      (a) => !(a.roomId === roomId && a.furnitureId === furnitureId)
    );
    this.placements = this.placements.filter(
      (p) => !(p.roomId === roomId && p.furnitureId === furnitureId)
    );
    AppStorage.saveAssignments(this.assignments);
    AppStorage.savePlacements(this.placements);
    if (this.selectedPlacementId) {
      const stillExists = this.placements.some((p) => p.instanceId === this.selectedPlacementId);
      if (!stillExists) this.selectedPlacementId = null;
    }
    this.notify();
  }

  public moveItem(furnitureId: string, fromRoomId: string, toRoomId: string, quantity: number = 1): void {
    const fromAssignment = this.assignments.find(
      (a) => a.roomId === fromRoomId && a.furnitureId === furnitureId
    );
    if (!fromAssignment) return;

    const moveQty = Math.min(fromAssignment.quantity, quantity);
    fromAssignment.quantity -= moveQty;

    if (fromAssignment.quantity <= 0) {
      this.assignments = this.assignments.filter((a) => a !== fromAssignment);
    }

    const toAssignment = this.assignments.find(
      (a) => a.roomId === toRoomId && a.furnitureId === furnitureId
    );
    if (toAssignment) {
      toAssignment.quantity += moveQty;
    } else {
      this.assignments.push({ roomId: toRoomId, furnitureId, quantity: moveQty });
    }

    // Move placement instances
    const fromPlacements = this.placements.filter(
      (p) => p.roomId === fromRoomId && p.furnitureId === furnitureId
    );
    const toMove = fromPlacements.slice(0, moveQty);
    const targetRoom = this.rooms.find((r) => r.id === toRoomId);
    const item = this.inventory.find((i) => i.id === furnitureId);

    toMove.forEach((p) => {
      p.roomId = toRoomId;
      if (targetRoom && item) {
        const smart = this.calculateSmartPosition(targetRoom, item, this.placements.filter((pl) => pl.roomId === toRoomId));
        p.xInches = smart.x;
        p.yInches = smart.y;
        p.rotation = smart.rotation;
      }
    });

    AppStorage.saveAssignments(this.assignments);
    AppStorage.savePlacements(this.placements);
    this.closeModal();
    this.notify();
  }

  // Interactive Placement Actions
  public updatePlacement(instanceId: string, updates: Partial<PlacedItem>): void {
    const idx = this.placements.findIndex((p) => p.instanceId === instanceId);
    if (idx !== -1) {
      this.placements[idx] = { ...this.placements[idx], ...updates };
      AppStorage.savePlacements(this.placements);
      this.notify();
    }
  }

  public rotatePlacement(instanceId: string): void {
    const placement = this.placements.find((p) => p.instanceId === instanceId);
    if (!placement) return;

    const currentRotation = placement.rotation || 0;
    const nextRotation = ((currentRotation + 90) % 360) as 0 | 90 | 180 | 270;
    
    // Check if new bounds fit inside room
    const room = this.rooms.find((r) => r.id === placement.roomId);
    const item = this.inventory.find((i) => i.id === placement.furnitureId);
    
    if (room && item) {
      const newW = nextRotation === 90 || nextRotation === 270 ? item.depthInches : item.widthInches;
      const newH = nextRotation === 90 || nextRotation === 270 ? item.widthInches : item.depthInches;
      
      let x = placement.xInches;
      let y = placement.yInches;
      if (x + newW > room.widthInches) x = Math.max(0, room.widthInches - newW);
      if (y + newH > room.lengthInches) y = Math.max(0, room.lengthInches - newH);

      this.updatePlacement(instanceId, { rotation: nextRotation, xInches: x, yInches: y });
    } else {
      this.updatePlacement(instanceId, { rotation: nextRotation });
    }
  }

  public removePlacementInstance(instanceId: string): void {
    const placement = this.placements.find((p) => p.instanceId === instanceId);
    if (!placement) return;

    const roomId = placement.roomId;
    const furnId = placement.furnitureId;

    this.placements = this.placements.filter((p) => p.instanceId !== instanceId);
    AppStorage.savePlacements(this.placements);

    // Update assignment quantity
    const remainingCount = this.placements.filter((p) => p.roomId === roomId && p.furnitureId === furnId).length;
    if (remainingCount <= 0) {
      this.assignments = this.assignments.filter((a) => !(a.roomId === roomId && a.furnitureId === furnId));
    } else {
      const assignment = this.assignments.find((a) => a.roomId === roomId && a.furnitureId === furnId);
      if (assignment) assignment.quantity = remainingCount;
    }
    AppStorage.saveAssignments(this.assignments);

    if (this.selectedPlacementId === instanceId) {
      this.selectedPlacementId = null;
    }
    this.notify();
  }

  public duplicatePlacementInstance(instanceId: string): void {
    const placement = this.placements.find((p) => p.instanceId === instanceId);
    if (!placement) return;

    const room = this.rooms.find((r) => r.id === placement.roomId);
    const item = this.inventory.find((i) => i.id === placement.furnitureId);
    if (!room || !item) return;

    // Increase assignment
    this.assignItemToRoom(placement.roomId, placement.furnitureId, 1);
  }

  public autoArrangeRoom(roomId: string): void {
    const room = this.rooms.find((r) => r.id === roomId);
    if (!room) return;

    const roomPlacements = this.placements.filter((p) => p.roomId === roomId);
    if (roomPlacements.length === 0) return;

    // Perimeter wall arrangement algorithm
    let currentWall = 0; // 0: Top, 1: Right, 2: Bottom, 3: Left
    let topX = 12;
    let rightY = 12;
    let bottomX = 12;
    let leftY = 12;

    roomPlacements.forEach((p) => {
      const item = this.inventory.find((i) => i.id === p.furnitureId);
      if (!item) return;

      const w = item.widthInches;
      const d = item.depthInches;

      if (currentWall === 0) {
        // Place on top wall
        if (topX + w + 12 <= room.widthInches) {
          p.xInches = topX;
          p.yInches = 6;
          p.rotation = 0;
          topX += w + 12;
        } else {
          currentWall = 1;
        }
      }

      if (currentWall === 1) {
        // Place on right wall
        if (rightY + w + 12 <= room.lengthInches) {
          p.xInches = Math.max(6, room.widthInches - d - 6);
          p.yInches = rightY;
          p.rotation = 270;
          rightY += w + 12;
        } else {
          currentWall = 2;
        }
      }

      if (currentWall === 2) {
        // Place on bottom wall
        if (bottomX + w + 12 <= room.widthInches) {
          p.xInches = bottomX;
          p.yInches = Math.max(6, room.lengthInches - d - 6);
          p.rotation = 180;
          bottomX += w + 12;
        } else {
          currentWall = 3;
        }
      }

      if (currentWall === 3) {
        // Place on left wall
        if (leftY + w + 12 <= room.lengthInches) {
          p.xInches = 6;
          p.yInches = leftY;
          p.rotation = 90;
          leftY += w + 12;
        } else {
          // fallback to center
          p.xInches = Math.max(6, (room.widthInches - w) / 2);
          p.yInches = Math.max(6, (room.lengthInches - d) / 2);
          p.rotation = 0;
        }
      }
    });

    AppStorage.savePlacements(this.placements);
    this.notify();
  }

  // Backup & Import
  public resetToDefaults(): void {
    AppStorage.resetToDefaults();
    this.loadFromStorage();
    this.closeModal();
    this.notify();
  }

  public exportDataJSON(): string {
    const data = {
      rooms: this.rooms,
      inventory: this.inventory,
      assignments: this.assignments,
      placements: this.placements,
      version: 2,
      exportedAt: new Date().toISOString(),
    };
    return JSON.stringify(data, null, 2);
  }

  public importDataJSON(jsonStr: string): boolean {
    try {
      const data = JSON.parse(jsonStr);
      if (Array.isArray(data.rooms) && Array.isArray(data.inventory)) {
        this.rooms = data.rooms;
        this.inventory = data.inventory;
        this.assignments = Array.isArray(data.assignments) ? data.assignments : [];
        this.placements = Array.isArray(data.placements) ? data.placements : [];
        AppStorage.saveRooms(this.rooms);
        AppStorage.saveInventory(this.inventory);
        AppStorage.saveAssignments(this.assignments);
        AppStorage.savePlacements(this.placements);
        this.activeRoomId = this.rooms[0]?.id || '';
        AppStorage.setActiveRoomId(this.activeRoomId);
        this.ensurePlacementsSynchronized();
        this.closeModal();
        this.notify();
        return true;
      }
    } catch (e) {
      console.error('Import error', e);
    }
    return false;
  }
}

export const appState = new AppStateManager();
