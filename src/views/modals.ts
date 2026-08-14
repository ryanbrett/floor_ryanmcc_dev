import { appState } from '../state';
import { formatInchesToFtIn, calculateSquareFootage, calculatePerimeterFt } from '../calculator';
import { FurnitureCategory } from '../types';

export function renderModal(): string {
  const modal = appState.getModal();
  if (!modal) return '';

  switch (modal.type) {
    case 'add-room':
    case 'edit-room': {
      const isEdit = modal.type === 'edit-room';
      const room = isEdit ? modal.room : null;

      const initialWidth = room ? room.widthInches : 144;
      const initialLength = room ? room.lengthInches : 168;
      const initialWidthFt = Math.floor(initialWidth / 12);
      const initialWidthIn = Math.round((initialWidth % 12) * 100) / 100;
      const initialLengthFt = Math.floor(initialLength / 12);
      const initialLengthIn = Math.round((initialLength % 12) * 100) / 100;
      const initialDeduction = room?.doorWindowDeductionPct ?? 20;

      const previewArea = calculateSquareFootage(initialWidth, initialLength);
      const previewPerimeter = calculatePerimeterFt(initialWidth, initialLength);

      return `
        <div class="modal-overlay" id="modal-backdrop">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">${isEdit ? 'Edit Room Dimensions' : 'Add New Room'}</h3>
              <button class="modal-close-btn" data-action="close-modal">✕</button>
            </div>

            <form id="form-room" style="display: flex; flex-direction: column; gap: 14px;">
              <input type="hidden" id="room-id" value="${room ? room.id : ''}" />

              <div class="form-group">
                <label for="room-name" class="form-label">Room Name *</label>
                <input
                  type="text"
                  id="room-name"
                  class="form-input"
                  required
                  placeholder="e.g. Master Bedroom, Living Room, Guest Room"
                  value="${room ? room.name : ''}"
                />
              </div>

              <!-- Dimensions in Feet & Inches -->
              <div class="form-group">
                <label class="form-label">Room Width (Feet & Inches)</label>
                <div class="form-row-2">
                  <div>
                    <input type="number" id="room-width-ft" class="form-input" min="1" max="100" placeholder="Feet" value="${initialWidthFt}" />
                    <span class="form-hint">Feet (ft)</span>
                  </div>
                  <div>
                    <input type="number" id="room-width-in" class="form-input" min="0" max="11.9" step="0.25" placeholder="Inches" value="${initialWidthIn}" />
                    <span class="form-hint">Inches (in)</span>
                  </div>
                </div>
              </div>

              <div class="form-group">
                <label class="form-label">Room Length (Feet & Inches)</label>
                <div class="form-row-2">
                  <div>
                    <input type="number" id="room-length-ft" class="form-input" min="1" max="100" placeholder="Feet" value="${initialLengthFt}" />
                    <span class="form-hint">Feet (ft)</span>
                  </div>
                  <div>
                    <input type="number" id="room-length-in" class="form-input" min="0" max="11.9" step="0.25" placeholder="Inches" value="${initialLengthIn}" />
                    <span class="form-hint">Inches (in)</span>
                  </div>
                </div>
              </div>

              <!-- Live Calculation Preview Card -->
              <div style="background-color: var(--bg-surface-raised); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px 14px;">
                <span class="form-hint" style="font-weight: 700; text-transform: uppercase;">Calculated Space Preview:</span>
                <div style="display: flex; justify-content: space-between; margin-top: 6px; font-size: 0.9rem;">
                  <span>Total Area: <strong id="preview-room-area" class="font-mono">${previewArea}</strong> sq ft</span>
                  <span>Perimeter: <strong id="preview-room-perimeter" class="font-mono">${previewPerimeter}</strong> ft</span>
                </div>
                <div id="preview-room-inches" style="font-size: 0.75rem; color: var(--text-muted); margin-top: 4px;">
                  Raw: ${initialWidth}" W × ${initialLength}" L
                </div>
              </div>

              <div class="form-group">
                <label for="room-deduction" class="form-label">Door & Window Wall Perimeter Deduction (%)</label>
                <input
                  type="number"
                  id="room-deduction"
                  class="form-input"
                  min="0"
                  max="50"
                  step="5"
                  value="${initialDeduction}"
                />
                <span class="form-hint">Typical 15-25% to account for doorways, closets, and window clearances.</span>
              </div>

              <div class="form-group">
                <label for="room-notes" class="form-label">Notes & Description (Optional)</label>
                <input
                  type="text"
                  id="room-notes"
                  class="form-input"
                  placeholder="e.g. North window, double closet doors"
                  value="${room?.notes || ''}"
                />
              </div>

              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Create Room'}</button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    case 'add-furniture':
    case 'edit-furniture': {
      const isEdit = modal.type === 'edit-furniture';
      const item = isEdit ? modal.item : null;

      const categories: FurnitureCategory[] = ['Bed', 'Storage', 'Desk', 'Seating', 'Custom'];
      const initialWidth = item ? item.widthInches : 36;
      const initialDepth = item ? item.depthInches : 24;
      const previewFootprint = calculateSquareFootage(initialWidth, initialDepth);

      const categoryOptionsHtml = categories
        .map(
          (cat) =>
            `<option value="${cat}" ${item?.category === cat ? 'selected' : ''}>${cat}</option>`
        )
        .join('');

      return `
        <div class="modal-overlay" id="modal-backdrop">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">${isEdit ? 'Edit Furniture Piece' : 'Add Furniture Piece'}</h3>
              <button class="modal-close-btn" data-action="close-modal">✕</button>
            </div>

            <form id="form-furniture" style="display: flex; flex-direction: column; gap: 14px;">
              <input type="hidden" id="furniture-id" value="${item ? item.id : ''}" />

              <div class="form-group">
                <label for="furn-name" class="form-label">Item Name *</label>
                <input
                  type="text"
                  id="furn-name"
                  class="form-input"
                  required
                  placeholder="e.g. Queen Bed, Writing Desk, 3-Drawer Dresser"
                  value="${item ? item.name : ''}"
                />
              </div>

              <div class="form-group">
                <label for="furn-category" class="form-label">Category *</label>
                <select id="furn-category" class="select-control" style="width: 100%;">
                  ${categoryOptionsHtml}
                </select>
              </div>

              <div class="form-group">
                <label class="form-label">Dimensions (Inches) *</label>
                <div class="form-row-3">
                  <div>
                    <input
                      type="number"
                      id="furn-width"
                      class="form-input"
                      required
                      min="1"
                      step="0.25"
                      placeholder="Width"
                      value="${initialWidth}"
                    />
                    <span class="form-hint">Width (in)</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      id="furn-depth"
                      class="form-input"
                      required
                      min="1"
                      step="0.25"
                      placeholder="Depth / Length"
                      value="${initialDepth}"
                    />
                    <span class="form-hint">Depth / Length (in)</span>
                  </div>
                  <div>
                    <input
                      type="number"
                      id="furn-height"
                      class="form-input"
                      min="1"
                      step="0.25"
                      placeholder="Height"
                      value="${item?.heightInches || ''}"
                    />
                    <span class="form-hint">Height (in, opt)</span>
                  </div>
                </div>
              </div>

              <!-- Live Footprint Calculation Preview -->
              <div style="background-color: var(--bg-surface-raised); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px 14px;">
                <span class="form-hint" style="font-weight: 700; text-transform: uppercase;">Calculated Footprint Area:</span>
                <div style="display: flex; justify-content: space-between; margin-top: 4px; font-size: 0.95rem;">
                  <span>Floor Footprint: <strong id="preview-furn-footprint" class="font-mono text-bold">${previewFootprint}</strong> sq ft</span>
                  <span id="preview-furn-ft-in" class="text-muted" style="font-size: 0.8rem;">${formatInchesToFtIn(initialWidth)} × ${formatInchesToFtIn(initialDepth)}</span>
                </div>
              </div>

              <div class="form-group">
                <label for="furn-notes" class="form-label">Notes & Details (Optional)</label>
                <input
                  type="text"
                  id="furn-notes"
                  class="form-input"
                  placeholder="e.g. Solid oak, modular assembly"
                  value="${item?.notes || ''}"
                />
              </div>

              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary">${isEdit ? 'Save Changes' : 'Add to Inventory'}</button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    case 'move-furniture': {
      const { furnitureId, fromRoomId } = modal;
      const item = appState.getInventory().find((i) => i.id === furnitureId);
      const fromRoom = appState.getRooms().find((r) => r.id === fromRoomId);
      const availableRooms = appState.getRooms().filter((r) => r.id !== fromRoomId);
      const currentAssignment = appState.getAssignments().find((a) => a.roomId === fromRoomId && a.furnitureId === furnitureId);
      const currentQty = currentAssignment ? currentAssignment.quantity : 1;

      if (!item || !fromRoom || availableRooms.length === 0) {
        return `
          <div class="modal-overlay" id="modal-backdrop">
            <div class="modal-content">
              <div class="modal-header">
                <h3 class="modal-title">Cannot Move Furniture</h3>
                <button class="modal-close-btn" data-action="close-modal">✕</button>
              </div>
              <p>You need at least 2 rooms created to move furniture between spaces.</p>
              <div class="modal-footer">
                <button type="button" class="btn btn-primary" data-action="close-modal">Close</button>
              </div>
            </div>
          </div>
        `;
      }

      const targetOptionsHtml = availableRooms
        .map((r) => `<option value="${r.id}">${r.name} (${formatInchesToFtIn(r.widthInches)} × ${formatInchesToFtIn(r.lengthInches)})</option>`)
        .join('');

      return `
        <div class="modal-overlay" id="modal-backdrop">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">Move Furniture Between Rooms</h3>
              <button class="modal-close-btn" data-action="close-modal">✕</button>
            </div>

            <form id="form-move-furniture" style="display: flex; flex-direction: column; gap: 14px;">
              <input type="hidden" id="move-furn-id" value="${furnitureId}" />
              <input type="hidden" id="move-from-room-id" value="${fromRoomId}" />

              <div style="background-color: var(--bg-surface-raised); border: 1px solid var(--border-subtle); border-radius: var(--radius-md); padding: 12px 14px;">
                <div class="text-bold">${item.name}</div>
                <div class="text-muted" style="font-size: 0.85rem;">
                  ${item.widthInches}" W × ${item.depthInches}" D (${Math.round(((item.widthInches * item.depthInches) / 144) * 100) / 100} sq ft)
                </div>
                <div style="font-size: 0.85rem; margin-top: 4px;">
                  Currently in: <strong>${fromRoom.name}</strong> (${currentQty} assigned)
                </div>
              </div>

              <div class="form-group">
                <label for="move-target-room" class="form-label">Destination Room *</label>
                <select id="move-target-room" class="select-control" style="width: 100%;">
                  ${targetOptionsHtml}
                </select>
              </div>

              <div class="form-group">
                <label for="move-quantity" class="form-label">Quantity to Move</label>
                <input
                  type="number"
                  id="move-quantity"
                  class="form-input"
                  min="1"
                  max="${currentQty}"
                  value="${currentQty}"
                />
              </div>

              <div class="modal-footer">
                <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
                <button type="submit" class="btn btn-primary">Move Piece</button>
              </div>
            </form>
          </div>
        </div>
      `;
    }

    case 'backup-settings': {
      const jsonExport = appState.exportDataJSON();
      return `
        <div class="modal-overlay" id="modal-backdrop">
          <div class="modal-content" style="max-width: 600px;">
            <div class="modal-header">
              <h3 class="modal-title">Data Backup & Export / Import</h3>
              <button class="modal-close-btn" data-action="close-modal">✕</button>
            </div>

            <div style="display: flex; flex-direction: column; gap: 16px;">
              <div>
                <label class="form-label">Export Data (JSON)</label>
                <p class="form-hint" style="margin-bottom: 8px;">Copy this JSON code to back up your rooms, custom furniture catalogue, and active assignments.</p>
                <textarea id="export-json-text" class="form-input font-mono" style="width: 100%; height: 120px; font-size: 0.8rem;" readonly>${jsonExport}</textarea>
                <button id="btn-copy-export" class="btn btn-secondary btn-sm mt-12">Copy to Clipboard</button>
              </div>

              <div style="border-top: 1px solid var(--border-subtle); padding-top: 16px;">
                <label class="form-label">Import Data (JSON)</label>
                <p class="form-hint" style="margin-bottom: 8px;">Paste previously exported JSON data to restore your floor plan and inventory.</p>
                <textarea id="import-json-text" class="form-input font-mono" style="width: 100%; height: 100px; font-size: 0.8rem;" placeholder="Paste JSON here..."></textarea>
                <button id="btn-execute-import" class="btn btn-primary btn-sm mt-12">Restore from JSON</button>
              </div>

              <div style="border-top: 1px solid var(--border-subtle); padding-top: 16px;">
                <label class="form-label" style="color: var(--status-overcrowded-text);">Reset Sample State</label>
                <p class="form-hint" style="margin-bottom: 8px;">Revert back to original sample rooms (Master Bedroom, Office, Living Room) and pre-loaded furniture items.</p>
                <button id="btn-reset-defaults" class="btn btn-danger btn-sm">Reset to Default Data</button>
              </div>
            </div>

            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-action="close-modal">Close</button>
            </div>
          </div>
        </div>
      `;
    }

    case 'confirm-delete-room': {
      const { room } = modal;
      return `
        <div class="modal-overlay" id="modal-backdrop">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">Delete Room?</h3>
              <button class="modal-close-btn" data-action="close-modal">✕</button>
            </div>
            <p>Are you sure you want to delete <strong>${room.name}</strong> (${formatInchesToFtIn(room.widthInches)} × ${formatInchesToFtIn(room.lengthInches)})? All furniture assignments in this room will be unassigned.</p>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
              <button type="button" id="btn-confirm-delete-room-btn" class="btn btn-danger" data-room-id="${room.id}">Delete Room</button>
            </div>
          </div>
        </div>
      `;
    }

    case 'confirm-delete-furniture': {
      const { item } = modal;
      return `
        <div class="modal-overlay" id="modal-backdrop">
          <div class="modal-content">
            <div class="modal-header">
              <h3 class="modal-title">Delete Furniture Item?</h3>
              <button class="modal-close-btn" data-action="close-modal">✕</button>
            </div>
            <p>Are you sure you want to remove <strong>${item.name}</strong> (${item.widthInches}" W × ${item.depthInches}" D) from your global catalog? It will be removed from all room assignments.</p>
            <div class="modal-footer">
              <button type="button" class="btn btn-secondary" data-action="close-modal">Cancel</button>
              <button type="button" id="btn-confirm-delete-furn-btn" class="btn btn-danger" data-furniture-id="${item.id}">Delete Item</button>
            </div>
          </div>
        </div>
      `;
    }

    default:
      return '';
  }
}
