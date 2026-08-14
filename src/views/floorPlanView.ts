import { appState } from '../state';
import { FurnitureItem, PlacedItem, Room } from '../types';
import { formatInchesToFtIn } from '../calculator';

export function renderFloorPlanView(): string {
  const room = appState.getActiveRoom();
  if (!room) return '';

  const inventory = appState.getInventory();
  const placements = appState.getPlacementsForRoom(room.id);
  const selectedPlacementId = appState.getSelectedPlacementId();
  const showClearance = appState.getShowClearanceOverlay();
  const snapGrid = appState.getSnapGridInches();

  const selectedPlacement = placements.find((p) => p.instanceId === selectedPlacementId);
  const selectedItem = selectedPlacement
    ? inventory.find((i) => i.id === selectedPlacement.furnitureId)
    : null;

  // Compute bounding box and rotation of selected item
  let selectedEffectiveW = 0;
  let selectedEffectiveH = 0;
  if (selectedPlacement && selectedItem) {
    const isRotated = selectedPlacement.rotation === 90 || selectedPlacement.rotation === 270;
    selectedEffectiveW = isRotated ? selectedItem.depthInches : selectedItem.widthInches;
    selectedEffectiveH = isRotated ? selectedItem.widthInches : selectedItem.depthInches;
  }

  // Calculate collisions
  const collidingInstances = new Set<string>();
  for (let i = 0; i < placements.length; i++) {
    for (let j = i + 1; j < placements.length; j++) {
      const p1 = placements[i];
      const p2 = placements[j];
      const item1 = inventory.find((it) => it.id === p1.furnitureId);
      const item2 = inventory.find((it) => it.id === p2.furnitureId);
      if (!item1 || !item2) continue;

      const w1 = p1.rotation === 90 || p1.rotation === 270 ? item1.depthInches : item1.widthInches;
      const h1 = p1.rotation === 90 || p1.rotation === 270 ? item1.widthInches : item1.depthInches;
      const w2 = p2.rotation === 90 || p2.rotation === 270 ? item2.depthInches : item2.widthInches;
      const h2 = p2.rotation === 90 || p2.rotation === 270 ? item2.widthInches : item2.depthInches;

      // Check AABB overlap with 1-inch tolerance
      const overlap = !(
        p1.xInches + w1 - 1 <= p2.xInches ||
        p1.xInches + 1 >= p2.xInches + w2 ||
        p1.yInches + h1 - 1 <= p2.yInches ||
        p1.yInches + 1 >= p2.yInches + h2
      );

      if (overlap) {
        collidingInstances.add(p1.instanceId);
        collidingInstances.add(p2.instanceId);
      }
    }
  }

  // Render items inside the room
  const itemsHtml = placements
    .map((p) => {
      const item = inventory.find((it) => it.id === p.furnitureId);
      if (!item) return '';

      const isRotated = p.rotation === 90 || p.rotation === 270;
      const effectiveW = isRotated ? item.depthInches : item.widthInches;
      const effectiveH = isRotated ? item.widthInches : item.depthInches;
      const isSelected = p.instanceId === selectedPlacementId;
      const isColliding = collidingInstances.has(p.instanceId);

      // Percentage-based coordinates for responsive SVG/HTML layout
      const leftPct = (p.xInches / room.widthInches) * 100;
      const topPct = (p.yInches / room.lengthInches) * 100;
      const widthPct = (effectiveW / room.widthInches) * 100;
      const heightPct = (effectiveH / room.lengthInches) * 100;

      const categoryClass = `furn-item-${item.category.toLowerCase()}`;

      return `
        <div 
          class="floor-furniture-item ${categoryClass} ${isSelected ? 'selected' : ''} ${isColliding ? 'colliding' : ''}"
          id="furn-instance-${p.instanceId}"
          data-instance-id="${p.instanceId}"
          data-furniture-id="${p.furnitureId}"
          data-x="${p.xInches}"
          data-y="${p.yInches}"
          data-w="${effectiveW}"
          data-h="${effectiveH}"
          data-rot="${p.rotation || 0}"
          style="
            left: ${leftPct}%;
            top: ${topPct}%;
            width: ${widthPct}%;
            height: ${heightPct}%;
          "
          tabindex="0"
          title="${item.name} (${effectiveW}\" × ${effectiveH}\") - Drag to move or click to select"
        >
          <!-- 30-inch Circulation Guideline Buffer Zone -->
          ${
            showClearance
              ? `<div class="clearance-buffer-halo" style="
                  inset: -${(30 / effectiveH) * 100}% -${(30 / effectiveW) * 100}%;
                "></div>`
              : ''
          }

          <!-- Visual Graphic Elements based on Category -->
          <div class="furn-content">
            <div class="furn-icon-label">
              <span class="furn-badge-cat">${item.name}</span>
              <span class="furn-dim-tag">${effectiveW}" × ${effectiveH}"</span>
            </div>

            ${
              item.category === 'Bed'
                ? `<div class="bed-pillows"><span class="pillow"></span><span class="pillow"></span></div><div class="bed-blanket"></div>`
                : item.category === 'Desk'
                ? `<div class="desk-work-indicator"><div class="laptop-icon"></div><div class="chair-indicator"></div></div>`
                : item.category === 'Storage'
                ? `<div class="storage-handles"><div class="handle"></div><div class="handle"></div></div>`
                : `<div class="generic-accent"></div>`
            }

            ${
              isColliding
                ? `<div class="collision-pill" title="Overlapping with another item!">⚠ Collision</div>`
                : ''
            }
          </div>

          <!-- Selection Border and Rotate Handle -->
          ${
            isSelected
              ? `
              <div class="selection-handles">
                <button class="handle-btn btn-rotate-quick" data-action="rotate-instance" data-instance-id="${p.instanceId}" title="Rotate 90°">↻</button>
                <div class="selection-corner tl"></div>
                <div class="selection-corner tr"></div>
                <div class="selection-corner bl"></div>
                <div class="selection-corner br"></div>
              </div>
            `
              : ''
          }
        </div>
      `;
    })
    .join('');

  return `
    <div class="floor-plan-card">
      
      <!-- Top Floor Plan Toolbar -->
      <div class="floor-plan-toolbar">
        <div class="toolbar-left">
          <div class="toolbar-title-group">
            <span class="toolbar-badge">2D Layout</span>
            <span class="toolbar-title">${room.name}</span>
            <span class="toolbar-dimensions">${formatInchesToFtIn(room.widthInches)} W × ${formatInchesToFtIn(room.lengthInches)} L (${room.widthInches}" × ${room.lengthInches}")</span>
          </div>
        </div>

        <div class="toolbar-actions">
          <!-- Snap to Grid Selector -->
          <div class="toolbar-control-group">
            <label class="control-label" for="snap-grid-select">Snap Grid:</label>
            <select id="snap-grid-select" class="toolbar-select" data-action="change-snap-grid">
              <option value="0" ${snapGrid === 0 ? 'selected' : ''}>Freeform (None)</option>
              <option value="6" ${snapGrid === 6 ? 'selected' : ''}>6" Grid (Half-Foot)</option>
              <option value="12" ${snapGrid === 12 ? 'selected' : ''}>12" Grid (1 Foot)</option>
            </select>
          </div>

          <!-- 30" Walking Clearances Toggle -->
          <button 
            id="btn-toggle-clearance" 
            class="btn btn-secondary btn-sm ${showClearance ? 'btn-active-toggle' : ''}" 
            data-action="toggle-clearance"
            title="Toggle 30-inch walking pathway guidelines around furniture"
          >
            <span>${showClearance ? '✓ 30" Clearances On' : '30" Walkways'}</span>
          </button>

          <!-- Auto-Arrange Button -->
          <button 
            id="btn-auto-arrange" 
            class="btn btn-secondary btn-sm" 
            data-action="auto-arrange" 
            data-room-id="${room.id}"
            title="Automatically distribute furniture along perimeter walls"
          >
            <span>✨ Auto-Arrange</span>
          </button>

          <!-- Reset Zoom / Fit -->
          <button 
            id="btn-fit-canvas" 
            class="btn btn-secondary btn-sm" 
            data-action="fit-canvas"
            title="Fit floor plan canvas to viewport"
          >
            <span>🔍 Fit View</span>
          </button>
        </div>
      </div>

      <!-- Main Floor Plan Interactive Canvas Area -->
      <div class="floor-canvas-outer" id="floor-canvas-outer">
        
        <!-- Dimension Annotations: Top Width -->
        <div class="dimension-annotation top-dim">
          <div class="dim-line"></div>
          <span class="dim-badge">WIDTH: ${formatInchesToFtIn(room.widthInches)} (${room.widthInches}")</span>
          <div class="dim-line"></div>
        </div>

        <div class="floor-canvas-middle">
          
          <!-- Dimension Annotations: Left Length -->
          <div class="dimension-annotation left-dim">
            <div class="dim-line"></div>
            <span class="dim-badge">LENGTH: ${formatInchesToFtIn(room.lengthInches)} (${room.lengthInches}")</span>
            <div class="dim-line"></div>
          </div>

          <!-- The Scaled Room Container -->
          <div 
            class="room-blueprint-stage" 
            id="room-blueprint-stage"
            data-room-width="${room.widthInches}"
            data-room-length="${room.lengthInches}"
            style="aspect-ratio: ${room.widthInches} / ${room.lengthInches};"
          >
            <!-- Blueprint Architectural Grid Lines -->
            <div class="blueprint-grid-lines"></div>

            <!-- Wall Thickness Outlines -->
            <div class="room-wall-north">
              <div class="wall-window-indicator" title="Window">
                <span class="window-glass"></span>
              </div>
            </div>
            <div class="room-wall-south">
              <div class="wall-door-indicator" title="Entry Door (36&quot; Swing)">
                <div class="door-leaf"></div>
                <div class="door-swing-arc"></div>
              </div>
            </div>
            <div class="room-wall-west"></div>
            <div class="room-wall-east"></div>

            <!-- Placed Furniture Layer -->
            <div class="furniture-canvas-layer" id="furniture-canvas-layer">
              ${
                placements.length > 0
                  ? itemsHtml
                  : `
                  <div class="canvas-empty-prompt">
                    <span style="font-size: 1.8rem;">📦</span>
                    <span style="font-weight: 700; font-size: 0.95rem; color: var(--text-secondary);">Room is Empty</span>
                    <span style="font-size: 0.8rem; color: var(--text-muted); text-align: center; max-width: 260px;">
                      Click items in the inventory tray below to drop and arrange them in this room.
                    </span>
                  </div>
                `
              }
            </div>

            <!-- Coordinate HUD Overlay -->
            <div class="canvas-hud" id="canvas-hud">
              <span id="hud-coords">${placements.length} ${placements.length === 1 ? 'piece' : 'pieces'} placed · Drag pieces to move</span>
            </div>
          </div>

        </div>
      </div>

      <!-- Selected Item Floating Inspector & Quick Action Bar -->
      ${
        selectedPlacement && selectedItem
          ? `
          <div class="selected-inspector-bar">
            <div class="inspector-info">
              <span class="badge badge-${selectedItem.category.toLowerCase()}">${selectedItem.category}</span>
              <strong style="color: var(--text-primary); font-size: 0.9rem;">${selectedItem.name}</strong>
              <span class="font-mono text-muted" style="font-size: 0.8rem;">
                Pos: (${selectedPlacement.xInches}", ${selectedPlacement.yInches}") · Size: ${selectedEffectiveW}" W × ${selectedEffectiveH}" D · Angle: ${selectedPlacement.rotation || 0}°
              </span>
            </div>

            <div class="inspector-actions">
              <button class="btn btn-secondary btn-sm" data-action="rotate-instance" data-instance-id="${selectedPlacement.instanceId}" title="Rotate 90 degrees">
                ↻ Rotate 90°
              </button>

              <button class="btn btn-secondary btn-sm" data-action="snap-wall-top" data-instance-id="${selectedPlacement.instanceId}" title="Snap against Top Wall">
                ↑ Top Wall
              </button>

              <button class="btn btn-secondary btn-sm" data-action="snap-wall-left" data-instance-id="${selectedPlacement.instanceId}" title="Snap against Left Wall">
                ← Left Wall
              </button>

              <button class="btn btn-secondary btn-sm" data-action="center-instance" data-instance-id="${selectedPlacement.instanceId}" title="Center piece in room">
                ✛ Center
              </button>

              <button class="btn btn-secondary btn-sm" data-action="duplicate-instance" data-instance-id="${selectedPlacement.instanceId}" title="Add another copy">
                +1 Duplicate
              </button>

              <button class="btn btn-danger btn-sm" data-action="remove-instance" data-instance-id="${selectedPlacement.instanceId}" title="Remove this piece from room">
                ✕ Remove
              </button>
            </div>
          </div>
        `
          : ''
      }

      <!-- Bottom Quick-Add Tray: Click or Drag directly into room -->
      <div class="canvas-inventory-tray">
        <div class="tray-header">
          <span style="font-size: 0.75rem; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; color: var(--text-muted);">
            Quick Add to Layout:
          </span>
          <button class="btn btn-secondary btn-sm" data-action="open-add-furniture-modal" style="font-size: 0.75rem; padding: 4px 10px; min-height: 28px;">
            + Create New Furniture
          </button>
        </div>

        <div class="tray-items-scroll">
          ${inventory
            .map((item) => {
              const assignedCount = placements.filter((p) => p.furnitureId === item.id).length;
              return `
                <button 
                  class="tray-item-pill" 
                  data-action="quick-drop-furniture" 
                  data-furniture-id="${item.id}"
                  title="Click to add ${item.name} (${item.widthInches}\" × ${item.depthInches}\") to this room"
                >
                  <span class="tray-pill-icon badge-${item.category.toLowerCase()}">${item.name.charAt(0)}</span>
                  <div class="tray-pill-details">
                    <span class="tray-pill-name">${item.name}</span>
                    <span class="tray-pill-dim">${item.widthInches}" × ${item.depthInches}"</span>
                  </div>
                  ${assignedCount > 0 ? `<span class="tray-pill-count">${assignedCount} in room</span>` : `<span class="tray-pill-add">+ Add</span>`}
                </button>
              `;
            })
            .join('')}
        </div>
      </div>

    </div>
  `;
}
