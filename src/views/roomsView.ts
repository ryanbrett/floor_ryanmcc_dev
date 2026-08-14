import { appState } from '../state';
import { formatInchesToFtIn } from '../calculator';

export function renderRoomsView(): string {
  const roomsAnalysis = appState.getAllRoomsAnalysis();
  const activeRoomId = appState.getActiveRoomId();

  const roomsCardsHtml =
    roomsAnalysis.length > 0
      ? roomsAnalysis
          .map((analysis) => {
            const { room, roomAreaSqFt, roomPerimeterFt, usablePerimeterFt, totalItemsCount, totalFurnitureAreaSqFt, openFloorPercentage, clearanceStatus, clearanceLabel } = analysis;
            const isActive = room.id === activeRoomId;

            return `
            <div class="furniture-card" style="border: ${isActive ? '2px solid var(--brand-primary)' : '1px solid var(--border-subtle)'}; background-color: ${isActive ? 'var(--bg-surface)' : 'var(--bg-surface)'};">
              <div>
                <div class="furniture-card-header">
                  <div>
                    <h3 class="furniture-name">${room.name}</h3>
                    <div class="text-muted" style="font-size: 0.8rem; margin-top: 2px;">
                      ${room.notes || 'No description provided'}
                    </div>
                  </div>
                  ${isActive ? `<span class="badge badge-active-room">Active Room</span>` : ''}
                </div>

                <div class="dimension-row mt-12">
                  <span class="dim-pill text-bold">${formatInchesToFtIn(room.widthInches)} × ${formatInchesToFtIn(room.lengthInches)}</span>
                  <span class="dim-pill">${room.widthInches}" × ${room.lengthInches}"</span>
                  <span class="dim-pill" style="background-color: var(--bg-subtle);">${roomAreaSqFt} sq ft</span>
                </div>

                <div style="margin-top: 14px; display: flex; flex-direction: column; gap: 8px; font-size: 0.85rem;">
                  <div class="flex-between">
                    <span class="text-muted">Total Perimeter:</span>
                    <span class="font-mono">${roomPerimeterFt} ft (Usable: ${usablePerimeterFt} ft)</span>
                  </div>
                  <div class="flex-between">
                    <span class="text-muted">Assigned Items:</span>
                    <span class="text-bold">${totalItemsCount} pieces (${totalFurnitureAreaSqFt} sq ft)</span>
                  </div>
                  <div class="flex-between">
                    <span class="text-muted">Space Clearance:</span>
                    <span class="matrix-status-cell" style="background-color: var(--status-${clearanceStatus}-bg); color: var(--status-${clearanceStatus}-text); border: 1px solid var(--status-${clearanceStatus}-border);">
                      ${openFloorPercentage}% Open (${clearanceLabel.split(' ')[0]})
                    </span>
                  </div>
                </div>
              </div>

              <div style="display: flex; gap: 8px; margin-top: 8px; flex-wrap: wrap;">
                <button class="btn btn-primary btn-sm" style="flex: 1;" data-action="switch-to-fit" data-room-id="${room.id}">
                  Analyze Fit & Furniture
                </button>
                <button class="btn btn-secondary btn-sm" data-action="edit-room" data-room-id="${room.id}" title="Edit dimensions">
                  Edit
                </button>
                <button class="btn btn-danger btn-sm" data-action="delete-room" data-room-id="${room.id}" title="Delete room">
                  Delete
                </button>
              </div>
            </div>
          `;
          })
          .join('')
      : `
        <div class="card empty-state" style="grid-column: 1 / -1;">
          <div class="empty-state-icon">🏠</div>
          <h3>No Rooms Created</h3>
          <p class="empty-state-text">Add your first room dimensions to begin planning furniture arrangements.</p>
        </div>
      `;

  return `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      <section class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Saved Rooms Directory</h2>
            <p class="card-subtitle">Manage room boundaries, dimensions, and usable square footage calculations.</p>
          </div>
          <button id="btn-add-room-modal" class="btn btn-primary">
            + Add New Room
          </button>
        </div>

        <div class="furniture-grid">
          ${roomsCardsHtml}
        </div>
      </section>
    </div>
  `;
}
