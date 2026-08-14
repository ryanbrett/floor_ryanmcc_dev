import { appState } from '../state';
import { formatInchesToFtIn } from '../calculator';
import { renderFloorPlanView } from './floorPlanView';

export function renderFitAnalysisView(): string {
  const analysis = appState.getActiveRoomAnalysis();
  const rooms = appState.getRooms();
  const inventory = appState.getInventory();

  if (!analysis) {
    return `
      <div class="card empty-state">
        <div class="empty-state-icon">📐</div>
        <h3>No Room Selected</h3>
        <p class="empty-state-text">Create or select a room to calculate furniture fit and square footage.</p>
        <button id="btn-create-first-room" class="btn btn-primary mt-12">Create a Room</button>
      </div>
    `;
  }

  const {
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
  } = analysis;

  const roomOptionsHtml = rooms
    .map(
      (r) =>
        `<option value="${r.id}" ${r.id === room.id ? 'selected' : ''}>${r.name} (${formatInchesToFtIn(r.widthInches)} × ${formatInchesToFtIn(r.lengthInches)} · ${Math.round((r.widthInches * r.lengthInches) / 144)} sq ft)</option>`
    )
    .join('');

  // Clearance status description
  let clearanceDetails = '';
  switch (clearanceStatus) {
    case 'spacious':
      clearanceDetails = 'Optimal traffic flow with plenty of walking clearance (>70% open floor area).';
      break;
    case 'comfortable':
      clearanceDetails = 'Balanced furniture arrangement with comfortable walkways and functional layout.';
      break;
    case 'moderate':
      clearanceDetails = 'Moderate density. Suitable for cozy bedrooms or focused office setups.';
      break;
    case 'tight':
      clearanceDetails = 'Restricted circulation paths. Check door swings, drawer clearance, and walkways.';
      break;
    case 'overcrowded':
      clearanceDetails = 'Overcrowded! Total furniture exceeds or severely limits habitable open floor area.';
      break;
  }

  // Assigned items rows
  const assignedRowsHtml =
    assignedItems.length > 0
      ? assignedItems
          .map(({ item, quantity, footprintSqFt, totalFootprintSqFt, fitsRoomDimensions }) => {
            const categoryClass = `badge-${item.category.toLowerCase()}`;
            return `
            <tr>
              <td>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                  <span class="text-bold">${item.name}</span>
                  <span class="text-muted" style="font-size: 0.75rem;">${item.notes || 'No notes'}</span>
                </div>
              </td>
              <td><span class="badge ${categoryClass}">${item.category}</span></td>
              <td>
                <span class="font-mono">${item.widthInches}" W × ${item.depthInches}" D ${item.heightInches ? `× ${item.heightInches}" H` : ''}</span>
                <div class="text-muted" style="font-size: 0.75rem;">${formatInchesToFtIn(item.widthInches)} × ${formatInchesToFtIn(item.depthInches)}</div>
              </td>
              <td>
                <span class="font-mono text-bold">${totalFootprintSqFt}</span>
                <span class="text-muted" style="font-size: 0.75rem;"> sq ft (${footprintSqFt} ea)</span>
              </td>
              <td>
                <div class="qty-stepper">
                  <button class="qty-btn" data-action="decrease-qty" data-furniture-id="${item.id}" title="Decrease quantity">−</button>
                  <span class="qty-value">${quantity}</span>
                  <button class="qty-btn" data-action="increase-qty" data-furniture-id="${item.id}" title="Increase quantity">+</button>
                </div>
              </td>
              <td>
                ${
                  fitsRoomDimensions
                    ? `<span style="color: var(--status-spacious-text); font-size: 0.8rem; font-weight: 600;">✓ Fits Bounds</span>`
                    : `<span style="color: var(--status-overcrowded-text); font-size: 0.8rem; font-weight: 700;">⚠ Exceeds Dim</span>`
                }
              </td>
              <td>
                <div style="display: flex; gap: 6px; justify-content: flex-end;">
                  <button class="btn btn-secondary btn-sm" data-action="open-move-modal" data-furniture-id="${item.id}" title="Move to another room">
                    Move
                  </button>
                  <button class="btn btn-danger btn-sm" data-action="unassign-item" data-furniture-id="${item.id}" title="Remove from room">
                    Remove
                  </button>
                </div>
              </td>
            </tr>
          `;
          })
          .join('')
      : `
        <tr>
          <td colspan="7">
            <div class="empty-state" style="padding: 24px 0;">
              <p class="empty-state-text">No furniture assigned to this room yet. Select items from the Quick-Add Inventory below.</p>
            </div>
          </td>
        </tr>
      `;

  // Quick Add Inventory List (items in global catalog)
  const quickAddItemsHtml = inventory
    .map((item) => {
      const assigned = assignedItems.find((a) => a.item.id === item.id);
      const currentQty = assigned ? assigned.quantity : 0;
      const categoryClass = `badge-${item.category.toLowerCase()}`;
      const itemAreaSqFt = Math.round(((item.widthInches * item.depthInches) / 144) * 100) / 100;

      return `
        <div class="quick-item-row">
          <div style="display: flex; align-items: center; gap: 12px; flex: 1; flex-wrap: wrap;">
            <span class="badge ${categoryClass}">${item.category}</span>
            <span class="text-bold">${item.name}</span>
            <span class="dim-pill">${item.widthInches}" W × ${item.depthInches}" D</span>
            <span class="text-muted" style="font-size: 0.8rem;">(${itemAreaSqFt} sq ft)</span>
            ${currentQty > 0 ? `<span class="badge" style="background-color: var(--bg-subtle); color: var(--text-secondary);">${currentQty} in room</span>` : ''}
          </div>
          <button class="btn btn-secondary btn-sm" data-action="quick-assign" data-furniture-id="${item.id}">
            + Add to Room
          </button>
        </div>
      `;
    })
    .join('');

  return `
    <div style="display: flex; flex-direction: column; gap: 20px;">
      
      <!-- Quick Room Switcher Bar -->
      <section class="room-selector-bar">
        <div class="room-selector-group">
          <label for="active-room-select" class="room-selector-label">Active Room Space:</label>
          <select id="active-room-select" class="select-control">
            ${roomOptionsHtml}
          </select>
          <button id="btn-open-edit-current-room" class="btn btn-secondary btn-sm" title="Edit room dimensions">
            ⚙ Dimensions
          </button>
        </div>
        <div style="display: flex; gap: 8px;">
          <button id="btn-quick-new-room" class="btn btn-primary btn-sm">
            + New Room
          </button>
        </div>
      </section>

      <!-- Interactive 2D Visual Floor Plan & Drag/Arrange Canvas -->
      <section>
        ${renderFloorPlanView()}
      </section>

      <!-- Active Room Header Card -->
      <section class="card">
        <div class="card-header">
          <div>
            <h2 class="card-title">
              ${room.name}
              <span class="badge" style="background-color: var(--bg-subtle); color: var(--text-secondary); font-size: 0.8rem;">
                ${formatInchesToFtIn(room.widthInches)} × ${formatInchesToFtIn(room.lengthInches)}
              </span>
            </h2>
            <p class="card-subtitle">
              Raw Dimensions: ${room.widthInches}" W × ${room.lengthInches}" L · Total Perimeter: ${roomPerimeterFt} ft · Usable Wall Line: ${usablePerimeterFt} ft (${room.doorWindowDeductionPct ?? 20}% door/window deduction)
            </p>
          </div>
        </div>

        <!-- 4 Key Metrics Cards -->
        <div class="metrics-grid">
          <div class="metric-card">
            <span class="metric-label">Total Room Area</span>
            <span class="metric-value">${roomAreaSqFt} <span style="font-size: 0.9rem; font-weight: normal;">sq ft</span></span>
            <span class="metric-subtext">${room.widthInches}" × ${room.lengthInches}"</span>
          </div>

          <div class="metric-card">
            <span class="metric-label">Furniture Footprint</span>
            <span class="metric-value" style="color: ${furnitureOccupancyPct > 70 ? 'var(--status-overcrowded-text)' : 'inherit'};">
              ${totalFurnitureAreaSqFt} <span style="font-size: 0.9rem; font-weight: normal;">sq ft</span>
            </span>
            <span class="metric-subtext">${furnitureOccupancyPct}% total floor coverage</span>
          </div>

          <div class="metric-card">
            <span class="metric-label">Open Floor Clearance</span>
            <span class="metric-value" style="color: var(--status-${clearanceStatus}-text);">
              ${openFloorAreaSqFt} <span style="font-size: 0.9rem; font-weight: normal;">sq ft</span>
            </span>
            <span class="metric-subtext">${openFloorPercentage}% usable open space</span>
          </div>

          <div class="metric-card">
            <span class="metric-label">Wall Space Usage</span>
            <span class="metric-value" style="color: ${wallSpaceUsagePct > 80 ? 'var(--status-tight-text)' : 'inherit'};">
              ${totalFurnitureWidthFt} <span style="font-size: 0.9rem; font-weight: normal;">ft</span>
            </span>
            <span class="metric-subtext">${wallSpaceUsagePct}% of usable wall length</span>
          </div>
        </div>

        <!-- Dark Telemetry Space Utilization Panel (Professional Polish theme) -->
        <div class="dark-telemetry-panel">
          <div class="dark-telemetry-header">
            <span>SPACE OCCUPANCY & DENSITY TELEMETRY</span>
            <span class="telemetry-status-pill" style="color: ${clearanceStatus === 'spacious' ? '#34d399' : clearanceStatus === 'comfortable' ? '#818cf8' : clearanceStatus === 'moderate' ? '#fbbf24' : '#f87171'};">
              <span class="status-dot" style="background-color: ${clearanceStatus === 'spacious' ? '#10b981' : clearanceStatus === 'comfortable' ? '#6366f1' : clearanceStatus === 'moderate' ? '#f59e0b' : '#ef4444'};"></span>
              ${clearanceLabel}
            </span>
          </div>

          <div class="telemetry-row">
            <div class="telemetry-label-row">
              <span>Floor Space Distribution</span>
              <span>${furnitureOccupancyPct}% Occupied · ${openFloorPercentage}% Open Floor</span>
            </div>
            <div class="telemetry-track">
              <div class="telemetry-fill ${furnitureOccupancyPct > 70 ? 'telemetry-fill-red' : furnitureOccupancyPct > 45 ? 'telemetry-fill-amber' : furnitureOccupancyPct > 25 ? 'telemetry-fill-indigo' : 'telemetry-fill-emerald'}" style="width: ${Math.min(100, furnitureOccupancyPct)}%;"></div>
            </div>
          </div>

          <div class="telemetry-row">
            <div class="telemetry-label-row">
              <span>Linear Wall Space Usage (Furniture Width vs Usable Wall Perimeter)</span>
              <span>${totalFurnitureWidthFt} ft / ${usablePerimeterFt} ft (${wallSpaceUsagePct}%)</span>
            </div>
            <div class="telemetry-track">
              <div class="telemetry-fill ${wallSpaceUsagePct > 85 ? 'telemetry-fill-red' : wallSpaceUsagePct > 65 ? 'telemetry-fill-amber' : 'telemetry-fill-emerald'}" style="width: ${Math.min(100, wallSpaceUsagePct)}%;"></div>
            </div>
          </div>

          <div class="telemetry-footer">
            <div style="font-size: 0.8rem; color: var(--dark-widget-muted);">
              Room Usable Boundary: <strong style="color: #f8fafc;">${roomAreaSqFt} sq ft</strong> (${usablePerimeterFt} ft usable perimeter line)
            </div>
            <div style="font-size: 0.8rem; color: var(--dark-widget-muted);">
              Total Assigned: <strong style="color: #f8fafc;">${totalItemsCount} ${totalItemsCount === 1 ? 'piece' : 'pieces'}</strong> (${totalFurnitureAreaSqFt} sq ft)
            </div>
          </div>
        </div>

        <!-- Clearance Circulation Status Banner -->
        <div class="clearance-banner ${clearanceStatus}">
          <div>
            <div class="clearance-heading">
              <span>Circulation Assessment: ${clearanceLabel}</span>
            </div>
            <div class="clearance-desc">${clearanceDetails}</div>
          </div>
          <div style="font-weight: 700; font-size: 0.9rem; white-space: nowrap;">
            ${openFloorPercentage}% Open Floor Area
          </div>
        </div>

        <!-- Warnings Alert (if any) -->
        ${
          warnings.length > 0
            ? `
          <div class="warnings-box mt-16">
            <strong>⚠ Space Clearance Alerts:</strong>
            <ul>
              ${warnings.map((w) => `<li>${w}</li>`).join('')}
            </ul>
          </div>
        `
            : ''
        }

      </section>

      <!-- Assigned Furniture Table Section -->
      <section class="card">
        <div class="card-header">
          <div>
            <h3 class="card-title">Assigned Furniture in ${room.name}</h3>
            <p class="card-subtitle">Adjust quantities, evaluate physical dimensions, or move pieces between rooms.</p>
          </div>
          <button id="btn-open-add-furniture-modal" class="btn btn-secondary btn-sm">
            + New Furniture Catalog Item
          </button>
        </div>

        <div class="data-table-wrapper">
          <table class="data-table">
            <thead>
              <tr>
                <th>Item Name</th>
                <th>Category</th>
                <th>Dimensions (W × D × H)</th>
                <th>Total Footprint</th>
                <th>Quantity</th>
                <th>Fit Check</th>
                <th style="text-align: right;">Actions</th>
              </tr>
            </thead>
            <tbody>
              ${assignedRowsHtml}
            </tbody>
          </table>
        </div>

        <!-- Quick Add Section from Inventory -->
        <div class="quick-add-panel">
          <div class="quick-add-header">
            <div>
              <h4 style="font-weight: 700; font-size: 0.95rem;">Quick-Assign from Global Catalog</h4>
              <p class="text-muted" style="font-size: 0.8rem;">Tap "+ Add to Room" to place any catalog item directly into ${room.name}.</p>
            </div>
          </div>
          <div style="max-height: 260px; overflow-y: auto; padding-right: 4px;">
            ${quickAddItemsHtml}
          </div>
        </div>

      </section>

    </div>
  `;
}
