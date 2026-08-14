import { appState } from '../state';
import { formatInchesToFtIn } from '../calculator';

interface DragState {
  instanceId: string;
  element: HTMLElement;
  stageElement: HTMLElement;
  roomWidthInches: number;
  roomLengthInches: number;
  startPointerX: number;
  startPointerY: number;
  startItemXInches: number;
  startItemYInches: number;
  effectiveWInches: number;
  effectiveHInches: number;
  stageRect: DOMRect;
  hasMoved: boolean;
}

let activeDrag: DragState | null = null;
let activeMoveHandler: ((e: PointerEvent) => void) | null = null;
let activeUpHandler: ((e: PointerEvent) => void) | null = null;

export function attachFloorPlanInteractions(): void {
  const stage = document.getElementById('room-blueprint-stage');
  if (!stage) return;

  const room = appState.getActiveRoom();
  if (!room) return;

  const roomW = room.widthInches;
  const roomL = room.lengthInches;
  const snapGrid = appState.getSnapGridInches();

  // Click on background stage deselects item
  stage.addEventListener('pointerdown', (e) => {
    const target = e.target as HTMLElement;
    if (
      target === stage ||
      target.classList.contains('blueprint-grid-lines') ||
      target.classList.contains('furniture-canvas-layer')
    ) {
      appState.setSelectedPlacementId(null);
    }
  });

  // Attach pointer handlers to all furniture items in the stage
  const furnitureElements = stage.querySelectorAll<HTMLElement>('.floor-furniture-item');
  furnitureElements.forEach((el) => {
    el.addEventListener('pointerdown', (e: PointerEvent) => {
      // Don't drag if clicking a button inside the element (like rotate button)
      if ((e.target as HTMLElement).closest('button')) return;

      e.preventDefault();
      e.stopPropagation();

      const instanceId = el.getAttribute('data-instance-id');
      if (!instanceId) return;

      // Update selection styling directly in DOM without destroying the element
      furnitureElements.forEach((other) => other.classList.remove('selected'));
      el.classList.add('selected');
      appState.setSelectedPlacementId(instanceId, true);

      const stageRect = stage.getBoundingClientRect();
      const currentX = parseFloat(el.getAttribute('data-x') || '0');
      const currentY = parseFloat(el.getAttribute('data-y') || '0');
      const effectiveW = parseFloat(el.getAttribute('data-w') || '20');
      const effectiveH = parseFloat(el.getAttribute('data-h') || '20');

      activeDrag = {
        instanceId,
        element: el,
        stageElement: stage,
        roomWidthInches: roomW,
        roomLengthInches: roomL,
        startPointerX: e.clientX,
        startPointerY: e.clientY,
        startItemXInches: currentX,
        startItemYInches: currentY,
        effectiveWInches: effectiveW,
        effectiveHInches: effectiveH,
        stageRect,
        hasMoved: false,
      };

      el.classList.add('dragging');

      try {
        if (el.setPointerCapture && typeof e.pointerId === 'number') {
          el.setPointerCapture(e.pointerId);
        }
      } catch {
        // Safe fallback in sandboxed iframes
      }

      updateHudCoords(currentX, currentY, effectiveW, effectiveH);

      // Clean up previous window listeners if any
      if (activeMoveHandler) window.removeEventListener('pointermove', activeMoveHandler);
      if (activeUpHandler) window.removeEventListener('pointerup', activeUpHandler);

      // Global window pointermove handler for smooth tracking
      activeMoveHandler = (moveEvent: PointerEvent) => {
        if (!activeDrag) return;

        const dxPx = moveEvent.clientX - activeDrag.startPointerX;
        const dyPx = moveEvent.clientY - activeDrag.startPointerY;

        if (Math.abs(dxPx) > 3 || Math.abs(dyPx) > 3) {
          activeDrag.hasMoved = true;
        }

        // Convert pixel delta to room inches
        const pxPerInchX = activeDrag.stageRect.width / activeDrag.roomWidthInches;
        const pxPerInchY = activeDrag.stageRect.height / activeDrag.roomLengthInches;

        let newXInches = activeDrag.startItemXInches + (dxPx / pxPerInchX);
        let newYInches = activeDrag.startItemYInches + (dyPx / pxPerInchY);

        // Snap to Grid if enabled
        if (snapGrid > 0) {
          newXInches = Math.round(newXInches / snapGrid) * snapGrid;
          newYInches = Math.round(newYInches / snapGrid) * snapGrid;
        }

        // Wall Snapping (Snap within 5 inches of wall)
        const wallSnapThreshold = 5;
        if (newXInches < wallSnapThreshold) newXInches = 0;
        if (newYInches < wallSnapThreshold) newYInches = 0;

        const maxX = activeDrag.roomWidthInches - activeDrag.effectiveWInches;
        const maxY = activeDrag.roomLengthInches - activeDrag.effectiveHInches;

        if (Math.abs(newXInches - maxX) < wallSnapThreshold) newXInches = Math.max(0, maxX);
        if (Math.abs(newYInches - maxY) < wallSnapThreshold) newYInches = Math.max(0, maxY);

        // Clamp inside room
        newXInches = Math.max(0, Math.min(maxX, newXInches));
        newYInches = Math.max(0, Math.min(maxY, newYInches));

        // Round to 1 decimal place
        newXInches = Math.round(newXInches * 10) / 10;
        newYInches = Math.round(newYInches * 10) / 10;

        // Update element position live visually
        const leftPct = (newXInches / activeDrag.roomWidthInches) * 100;
        const topPct = (newYInches / activeDrag.roomLengthInches) * 100;

        activeDrag.element.style.left = `${leftPct}%`;
        activeDrag.element.style.top = `${topPct}%`;
        activeDrag.element.setAttribute('data-x', `${newXInches}`);
        activeDrag.element.setAttribute('data-y', `${newYInches}`);

        updateHudCoords(newXInches, newYInches, activeDrag.effectiveWInches, activeDrag.effectiveHInches);
      };

      activeUpHandler = (upEvent: PointerEvent) => {
        if (!activeDrag) return;

        const dragInfo = activeDrag;
        dragInfo.element.classList.remove('dragging');

        try {
          if (dragInfo.element.releasePointerCapture && typeof upEvent.pointerId === 'number') {
            dragInfo.element.releasePointerCapture(upEvent.pointerId);
          }
        } catch {
          // Safe fallback
        }

        if (activeMoveHandler) {
          window.removeEventListener('pointermove', activeMoveHandler);
          activeMoveHandler = null;
        }
        if (activeUpHandler) {
          window.removeEventListener('pointerup', activeUpHandler);
          activeUpHandler = null;
        }

        const finalX = parseFloat(dragInfo.element.getAttribute('data-x') || '0');
        const finalY = parseFloat(dragInfo.element.getAttribute('data-y') || '0');
        const instId = dragInfo.instanceId;
        const didMove = dragInfo.hasMoved;

        activeDrag = null;

        if (didMove) {
          // Save final placement and refresh UI
          appState.updatePlacement(instId, {
            xInches: finalX,
            yInches: finalY,
          });
        } else {
          // Pure click/tap without movement: show inspector bar
          appState.setSelectedPlacementId(instId, false);
        }
      };

      window.addEventListener('pointermove', activeMoveHandler);
      window.addEventListener('pointerup', activeUpHandler, { once: true });
    });
  });

  // Action Buttons inside Floor Plan view
  document.querySelectorAll<HTMLElement>('[data-action]').forEach((btn) => {
    const action = btn.getAttribute('data-action');

    switch (action) {
      case 'rotate-instance': {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const instanceId = btn.getAttribute('data-instance-id');
          if (instanceId) {
            appState.rotatePlacement(instanceId);
          }
        });
        break;
      }

      case 'snap-wall-top': {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const instanceId = btn.getAttribute('data-instance-id');
          if (instanceId) {
            appState.updatePlacement(instanceId, { yInches: 0 });
          }
        });
        break;
      }

      case 'snap-wall-left': {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const instanceId = btn.getAttribute('data-instance-id');
          if (instanceId) {
            appState.updatePlacement(instanceId, { xInches: 0 });
          }
        });
        break;
      }

      case 'center-instance': {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const instanceId = btn.getAttribute('data-instance-id');
          if (instanceId && room) {
            const placement = appState.getPlacements().find((p) => p.instanceId === instanceId);
            const item = placement ? appState.getInventory().find((i) => i.id === placement.furnitureId) : null;
            if (placement && item) {
              const isRot = placement.rotation === 90 || placement.rotation === 270;
              const w = isRot ? item.depthInches : item.widthInches;
              const h = isRot ? item.widthInches : item.depthInches;
              const centerX = Math.max(0, Math.round((room.widthInches - w) / 2));
              const centerY = Math.max(0, Math.round((room.lengthInches - h) / 2));
              appState.updatePlacement(instanceId, { xInches: centerX, yInches: centerY });
            }
          }
        });
        break;
      }

      case 'duplicate-instance': {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const instanceId = btn.getAttribute('data-instance-id');
          if (instanceId) {
            appState.duplicatePlacementInstance(instanceId);
          }
        });
        break;
      }

      case 'remove-instance': {
        btn.addEventListener('click', (e) => {
          e.stopPropagation();
          const instanceId = btn.getAttribute('data-instance-id');
          if (instanceId) {
            appState.removePlacementInstance(instanceId);
          }
        });
        break;
      }

      case 'auto-arrange': {
        btn.addEventListener('click', () => {
          const roomId = btn.getAttribute('data-room-id');
          if (roomId) {
            appState.autoArrangeRoom(roomId);
          }
        });
        break;
      }

      case 'toggle-clearance': {
        btn.addEventListener('click', () => {
          appState.setShowClearanceOverlay(!appState.getShowClearanceOverlay());
        });
        break;
      }

      case 'change-snap-grid': {
        btn.addEventListener('change', (e) => {
          const val = parseInt((e.target as HTMLSelectElement).value, 10);
          appState.setSnapGridInches(val);
        });
        break;
      }

      case 'quick-drop-furniture': {
        btn.addEventListener('click', () => {
          const furnId = btn.getAttribute('data-furniture-id');
          if (furnId && room) {
            appState.assignItemToRoom(room.id, furnId, 1);
          }
        });
        break;
      }

      case 'fit-canvas': {
        btn.addEventListener('click', () => {
          const outer = document.getElementById('floor-canvas-outer');
          if (outer) {
            outer.scrollIntoView({ behavior: 'smooth', block: 'center' });
          }
        });
        break;
      }
    }
  });
}

function updateHudCoords(x: number, y: number, w: number, h: number): void {
  const hud = document.getElementById('hud-coords');
  if (hud) {
    hud.textContent = `Selected: Pos (${formatInchesToFtIn(x)}, ${formatInchesToFtIn(y)}) · Size ${formatInchesToFtIn(w)} × ${formatInchesToFtIn(h)}`;
  }
}
