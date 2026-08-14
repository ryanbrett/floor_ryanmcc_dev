import { appState } from '../state';
import { formatInchesToFtIn } from '../calculator';

export function renderMatrixView(): string {
  const roomsAnalysis = appState.getAllRoomsAnalysis();

  // Aggregate stats
  let totalHouseAreaSqFt = 0;
  let totalHouseFurnitureAreaSqFt = 0;
  let totalHouseItemsCount = 0;

  roomsAnalysis.forEach((a) => {
    totalHouseAreaSqFt += a.roomAreaSqFt;
    totalHouseFurnitureAreaSqFt += a.totalFurnitureAreaSqFt;
    totalHouseItemsCount += a.totalItemsCount;
  });

  totalHouseAreaSqFt = Math.round(totalHouseAreaSqFt * 100) / 100;
  totalHouseFurnitureAreaSqFt = Math.round(totalHouseFurnitureAreaSqFt * 100) / 100;
  const totalHouseOpenAreaSqFt = Math.round(Math.max(0, totalHouseAreaSqFt - totalHouseFurnitureAreaSqFt) * 100) / 100;
  const overallOpenPct = totalHouseAreaSqFt > 0 ? Math.round((totalHouseOpenAreaSqFt / totalHouseAreaSqFt) * 1000) / 10 : 0;

  const tableRowsHtml =
    roomsAnalysis.length > 0
      ? roomsAnalysis
          .map((a) => {
            const { room, roomAreaSqFt, totalItemsCount, totalFurnitureAreaSqFt, furnitureOccupancyPct, openFloorAreaSqFt, openFloorPercentage, totalFurnitureWidthFt, usablePerimeterFt, wallSpaceUsagePct, clearanceStatus, clearanceLabel } = a;

            return `
            <tr>
              <td>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <button class="text-bold" data-action="switch-to-fit" data-room-id="${room.id}" style="text-align: left; color: var(--brand-primary); text-decoration: underline;">
                    ${room.name}
                  </button>
                  <span class="text-muted" style="font-size: 0.75rem;">${formatInchesToFtIn(room.widthInches)} × ${formatInchesToFtIn(room.lengthInches)} (${room.widthInches}" × ${room.lengthInches}")</span>
                </div>
              </td>
              <td>
                <span class="font-mono text-bold">${roomAreaSqFt}</span> sq ft
              </td>
              <td>
                <span class="text-bold">${totalItemsCount}</span> pieces
              </td>
              <td>
                <span class="font-mono">${totalFurnitureAreaSqFt} sq ft</span>
                <div class="text-muted" style="font-size: 0.75rem;">${furnitureOccupancyPct}% coverage</div>
              </td>
              <td>
                <span class="font-mono text-bold" style="color: var(--status-${clearanceStatus}-text);">${openFloorAreaSqFt} sq ft</span>
                <div class="text-muted" style="font-size: 0.75rem;">${openFloorPercentage}% open</div>
              </td>
              <td>
                <span class="font-mono">${totalFurnitureWidthFt} / ${usablePerimeterFt} ft</span>
                <div class="text-muted" style="font-size: 0.75rem;">${wallSpaceUsagePct}% wall use</div>
              </td>
              <td>
                <span class="matrix-status-cell" style="background-color: var(--status-${clearanceStatus}-bg); color: var(--status-${clearanceStatus}-text); border: 1px solid var(--status-${clearanceStatus}-border);">
                  ${clearanceLabel.split(' ')[0]}
                </span>
              </td>
              <td style="text-align: right;">
                <button class="btn btn-secondary btn-sm" data-action="switch-to-fit" data-room-id="${room.id}">
                  Analyze Room
                </button>
              </td>
            </tr>
          `;
          })
          .join('')
      : `
        <tr>
          <td colspan="8">
            <div class="empty-state" style="padding: 24px 0;">
              <p class="empty-state-text">No rooms available for comparative analysis.</p>
            </div>
          </td>
        </tr>
      `;

  return `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      
      <!-- Aggregate Summary Cards -->
      <section class="metrics-grid">
        <div class="metric-card">
          <span class="metric-label">Total Floor Plan Area</span>
          <span class="metric-value">${totalHouseAreaSqFt} <span style="font-size: 0.9rem; font-weight: normal;">sq ft</span></span>
          <span class="metric-subtext">${roomsAnalysis.length} Saved Rooms</span>
        </div>

        <div class="metric-card">
          <span class="metric-label">Total Furniture Footprint</span>
          <span class="metric-value">${totalHouseFurnitureAreaSqFt} <span style="font-size: 0.9rem; font-weight: normal;">sq ft</span></span>
          <span class="metric-subtext">${totalHouseItemsCount} Total Placed Pieces</span>
        </div>

        <div class="metric-card">
          <span class="metric-label">Total Open Floor Area</span>
          <span class="metric-value" style="color: var(--status-spacious-text);">${totalHouseOpenAreaSqFt} <span style="font-size: 0.9rem; font-weight: normal;">sq ft</span></span>
          <span class="metric-subtext">${overallOpenPct}% Overall Open Space</span>
        </div>

        <div class="metric-card">
          <span class="metric-label">Overall Home Density</span>
          <span class="metric-value">${Math.round((totalHouseFurnitureAreaSqFt / (totalHouseAreaSqFt || 1)) * 100)}%</span>
          <span class="metric-subtext">Average Occupancy Rate</span>
        </div>
      </section>

      <!-- Matrix Comparison Table -->
      <section class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">Space Fit & Density Matrix</h2>
            <p class="card-subtitle">Side-by-side comparison of usable square footage, furniture footprint, and open floor ratios across all rooms.</p>
          </div>
        </div>

        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Room & Dimensions</th>
                <th>Total Area</th>
                <th>Items Placed</th>
                <th>Furniture Footprint</th>
                <th>Open Floor Area</th>
                <th>Wall Perimeter Line</th>
                <th>Clearance Rating</th>
                <th style="text-align: right;">Action</th>
              </tr>
            </thead>
            <tbody>
              ${tableRowsHtml}
            </tbody>
          </table>
        </div>
      </section>

    </div>
  `;
}
