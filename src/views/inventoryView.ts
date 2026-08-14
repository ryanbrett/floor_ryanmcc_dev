import { appState } from '../state';
import { formatInchesToFtIn } from '../calculator';
import { FurnitureCategory } from '../types';

export function renderInventoryView(): string {
  const inventory = appState.getInventory();
  const rooms = appState.getRooms();
  const assignments = appState.getAssignments();
  const activeRoomId = appState.getActiveRoomId();
  const activeRoom = appState.getActiveRoom();
  const { category: selectedCategory, search } = appState.getInventoryFilter();

  const categories: Array<FurnitureCategory | 'All'> = ['All', 'Bed', 'Storage', 'Desk', 'Seating', 'Custom'];

  // Filter items
  const filteredItems = inventory.filter((item) => {
    const matchesCategory = selectedCategory === 'All' || item.category === selectedCategory;
    const matchesSearch =
      !search ||
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      (item.notes && item.notes.toLowerCase().includes(search.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  const categoryPillsHtml = categories
    .map((cat) => {
      const isSelected = selectedCategory === cat;
      const count =
        cat === 'All'
          ? inventory.length
          : inventory.filter((i) => i.category === cat).length;
      return `
        <button class="btn btn-sm ${isSelected ? 'btn-primary' : 'btn-secondary'}" data-action="filter-category" data-category="${cat}">
          ${cat} (${count})
        </button>
      `;
    })
    .join('');

  const itemsGridHtml =
    filteredItems.length > 0
      ? filteredItems
          .map((item) => {
            const footprintSqFt = Math.round(((item.widthInches * item.depthInches) / 144) * 100) / 100;
            const categoryClass = `badge-${item.category.toLowerCase()}`;

            // Find where this item is currently assigned
            const itemAssignments = assignments.filter((a) => a.furnitureId === item.id && a.quantity > 0);
            const totalAssignedQty = itemAssignments.reduce((acc, a) => acc + a.quantity, 0);

            const placementsHtml =
              itemAssignments.length > 0
                ? itemAssignments
                    .map((a) => {
                      const r = rooms.find((room) => room.id === a.roomId);
                      return `<span>${r ? r.name : 'Unknown Room'}: <strong>${a.quantity}x</strong></span>`;
                    })
                    .join(' · ')
                : '<span class="text-muted">Unassigned / in storage</span>';

            return `
            <div class="furniture-card">
              <div>
                <div class="furniture-card-header">
                  <div>
                    <h3 class="furniture-name">${item.name}</h3>
                    <div class="text-muted" style="font-size: 0.8rem; margin-top: 2px;">
                      ${item.notes || 'Standard item'}
                    </div>
                  </div>
                  <span class="badge ${categoryClass}">${item.category}</span>
                </div>

                <div class="dimension-row mt-12">
                  <span class="dim-pill text-bold">${item.widthInches}" W × ${item.depthInches}" D</span>
                  ${item.heightInches ? `<span class="dim-pill">${item.heightInches}" H</span>` : ''}
                  <span class="dim-pill" style="background-color: var(--bg-subtle);">${footprintSqFt} sq ft</span>
                </div>

                <div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 4px;">
                  Equivalent: ${formatInchesToFtIn(item.widthInches)} × ${formatInchesToFtIn(item.depthInches)}
                </div>

                <div style="margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--border-subtle); font-size: 0.825rem;">
                  <span class="text-muted">Current Placements (${totalAssignedQty} total):</span>
                  <div style="margin-top: 2px;">${placementsHtml}</div>
                </div>
              </div>

              <div style="display: flex; gap: 6px; margin-top: 8px; flex-wrap: wrap;">
                ${
                  activeRoom
                    ? `
                  <button class="btn btn-secondary btn-sm" style="flex: 1;" data-action="assign-to-active" data-furniture-id="${item.id}">
                    + Add to ${activeRoom.name.split(' ')[0]}
                  </button>
                `
                    : ''
                }
                <button class="btn btn-secondary btn-sm" data-action="edit-furniture" data-furniture-id="${item.id}" title="Edit item">
                  Edit
                </button>
                <button class="btn btn-danger btn-sm" data-action="delete-furniture" data-furniture-id="${item.id}" title="Delete item">
                  Delete
                </button>
              </div>
            </div>
          `;
          })
          .join('')
      : `
        <div class="card empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🪑</div>
          <h3>No Matching Furniture</h3>
          <p class="empty-state-text">No items found matching the selected category or search keyword.</p>
        </div>
      `;

  return `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <section class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Global Furniture Inventory</h2>
            <p class="card-subtitle">Manage all catalog pieces, custom dimensions, and room assignments.</p>
          </div>
          <button id="btn-add-furniture-modal" class="btn btn-primary">
            + Add Furniture Piece
          </button>
        </div>

        <!-- Filter & Search Controls -->
        <div style="display: flex; flex-direction: column; gap: 12px; margin-bottom: 20px;">
          <div style="display: flex; gap: 8px; flex-wrap: wrap;">
            ${categoryPillsHtml}
          </div>

          <div style="display: flex; gap: 8px;">
            <input
              type="text"
              id="inventory-search-input"
              class="form-input"
              style="flex: 1;"
              placeholder="Search furniture items by name or notes..."
              value="${search}"
            />
            ${search ? `<button id="btn-clear-search" class="btn btn-secondary btn-sm">Clear</button>` : ''}
          </div>
        </div>

        <!-- Items Grid -->
        <div class="furniture-grid">
          ${itemsGridHtml}
        </div>

      </section>
    </div>
  `;
}
