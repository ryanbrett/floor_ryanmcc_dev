import { appState } from './state';
import { ActiveTab, FurnitureCategory } from './types';
import { renderFitAnalysisView } from './views/fitAnalysisView';
import { renderRoomsView } from './views/roomsView';
import { renderInventoryView } from './views/inventoryView';
import { renderMatrixView } from './views/matrixView';
import { renderModal } from './views/modals';
import { attachFloorPlanInteractions } from './views/floorPlanInteractions';
import { parseFtInToInches, calculateSquareFootage, calculatePerimeterFt, formatInchesToFtIn } from './calculator';

function renderApp(): void {
  const appRoot = document.getElementById('app');
  if (!appRoot) return;

  const activeTab = appState.getActiveTab();
  const rooms = appState.getRooms();
  const inventory = appState.getInventory();
  const activeRoom = appState.getActiveRoom();

  let activeViewHtml = '';
  switch (activeTab) {
    case 'fit-analysis':
      activeViewHtml = renderFitAnalysisView();
      break;
    case 'rooms':
      activeViewHtml = renderRoomsView();
      break;
    case 'inventory':
      activeViewHtml = renderInventoryView();
      break;
    case 'matrix':
      activeViewHtml = renderMatrixView();
      break;
  }

  const modalHtml = renderModal();

  appRoot.innerHTML = `
    <div class="app-container">
      
      <!-- Top Brand Header -->
      <header class="app-header">
        <div class="brand-wrapper">
          <div class="brand-icon">F</div>
          <div>
            <h1 class="brand-title">
              <span>Floor Plan & Furniture Fit</span>
              <span class="brand-version">v2.4 PRO</span>
            </h1>
            <p class="text-muted" style="font-size: 0.82rem; margin-top: 2px;">
              Form-based space clearance, usable square footage, and linear wall fit calculations.
            </p>
          </div>
        </div>

        <div class="header-actions">
          <button id="btn-open-backup" class="btn btn-secondary btn-sm" title="Export / Import or Reset">
            Backup / Reset
          </button>
        </div>
      </header>

      <!-- Primary Navigation Tabs -->
      <nav class="tab-nav" aria-label="Main Navigation">
        <button class="tab-btn ${activeTab === 'fit-analysis' ? 'active' : ''}" data-tab="fit-analysis">
          <span>🎯 Active Room Fit</span>
          ${activeRoom ? `<span class="tab-badge">${activeRoom.name.split(' ')[0]}</span>` : ''}
        </button>

        <button class="tab-btn ${activeTab === 'rooms' ? 'active' : ''}" data-tab="rooms">
          <span>🏠 Rooms Directory</span>
          <span class="tab-badge">${rooms.length}</span>
        </button>

        <button class="tab-btn ${activeTab === 'inventory' ? 'active' : ''}" data-tab="inventory">
          <span>🪑 Global Inventory</span>
          <span class="tab-badge">${inventory.length}</span>
        </button>

        <button class="tab-btn ${activeTab === 'matrix' ? 'active' : ''}" data-tab="matrix">
          <span>📊 Fit Matrix & Compare</span>
        </button>
      </nav>

      <!-- Active Content View -->
      <main id="main-content">
        ${activeViewHtml}
      </main>

      <!-- Modal Container -->
      <div id="modal-root">
        ${modalHtml}
      </div>

    </div>
  `;

  attachEventHandlers();
}

function attachEventHandlers(): void {
  // Attach interactive 2D floor plan drag, rotate, snap and selection events
  attachFloorPlanInteractions();

  // Navigation Tabs
  document.querySelectorAll<HTMLButtonElement>('.tab-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const tab = btn.getAttribute('data-tab') as ActiveTab;
      if (tab) {
        appState.setActiveTab(tab);
      }
    });
  });

  // Top Header Backup Button
  document.getElementById('btn-open-backup')?.addEventListener('click', () => {
    appState.openModal({ type: 'backup-settings' });
  });

  // Active Room Selector Dropdown
  const roomSelect = document.getElementById('active-room-select') as HTMLSelectElement | null;
  if (roomSelect) {
    roomSelect.addEventListener('change', (e) => {
      const target = e.target as HTMLSelectElement;
      if (target.value) {
        appState.setActiveRoomId(target.value);
      }
    });
  }

  // Edit current active room button
  document.getElementById('btn-open-edit-current-room')?.addEventListener('click', () => {
    const current = appState.getActiveRoom();
    if (current) {
      appState.openModal({ type: 'edit-room', room: current });
    }
  });

  // Quick New Room buttons
  document.getElementById('btn-quick-new-room')?.addEventListener('click', () => {
    appState.openModal({ type: 'add-room' });
  });
  document.getElementById('btn-create-first-room')?.addEventListener('click', () => {
    appState.openModal({ type: 'add-room' });
  });
  document.getElementById('btn-add-room-modal')?.addEventListener('click', () => {
    appState.openModal({ type: 'add-room' });
  });

  // Add Furniture buttons
  document.getElementById('btn-open-add-furniture-modal')?.addEventListener('click', () => {
    appState.openModal({ type: 'add-furniture' });
  });
  document.getElementById('btn-add-furniture-modal')?.addEventListener('click', () => {
    appState.openModal({ type: 'add-furniture' });
  });

  // Inventory Filter & Search
  document.querySelectorAll<HTMLButtonElement>('[data-action="filter-category"]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const cat = btn.getAttribute('data-category') || 'All';
      const search = appState.getInventoryFilter().search;
      appState.setInventoryFilter(cat, search);
    });
  });

  const searchInput = document.getElementById('inventory-search-input') as HTMLInputElement | null;
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const val = (e.target as HTMLInputElement).value;
      const cat = appState.getInventoryFilter().category;
      appState.setInventoryFilter(cat, val);
    });
  }

  document.getElementById('btn-clear-search')?.addEventListener('click', () => {
    const cat = appState.getInventoryFilter().category;
    appState.setInventoryFilter(cat, '');
  });

  // Action Delegation
  document.querySelectorAll<HTMLElement>('[data-action]').forEach((el) => {
    const action = el.getAttribute('data-action');

    el.addEventListener('click', (e) => {
      const activeRoomId = appState.getActiveRoomId();

      switch (action) {
        case 'switch-to-fit': {
          const roomId = el.getAttribute('data-room-id');
          if (roomId) {
            appState.setActiveRoomId(roomId);
            appState.setActiveTab('fit-analysis');
          }
          break;
        }

        case 'edit-room': {
          const roomId = el.getAttribute('data-room-id');
          const room = appState.getRooms().find((r) => r.id === roomId);
          if (room) {
            appState.openModal({ type: 'edit-room', room });
          }
          break;
        }

        case 'delete-room': {
          const roomId = el.getAttribute('data-room-id');
          const room = appState.getRooms().find((r) => r.id === roomId);
          if (room) {
            appState.openModal({ type: 'confirm-delete-room', room });
          }
          break;
        }

        case 'edit-furniture': {
          const furnId = el.getAttribute('data-furniture-id');
          const item = appState.getInventory().find((i) => i.id === furnId);
          if (item) {
            appState.openModal({ type: 'edit-furniture', item });
          }
          break;
        }

        case 'delete-furniture': {
          const furnId = el.getAttribute('data-furniture-id');
          const item = appState.getInventory().find((i) => i.id === furnId);
          if (item) {
            appState.openModal({ type: 'confirm-delete-furniture', item });
          }
          break;
        }

        case 'quick-assign':
        case 'assign-to-active': {
          const furnId = el.getAttribute('data-furniture-id');
          if (furnId && activeRoomId) {
            appState.assignItemToRoom(activeRoomId, furnId, 1);
          }
          break;
        }

        case 'increase-qty': {
          const furnId = el.getAttribute('data-furniture-id');
          if (furnId && activeRoomId) {
            const current = appState.getAssignments().find((a) => a.roomId === activeRoomId && a.furnitureId === furnId);
            appState.setItemQuantityInRoom(activeRoomId, furnId, (current?.quantity || 0) + 1);
          }
          break;
        }

        case 'decrease-qty': {
          const furnId = el.getAttribute('data-furniture-id');
          if (furnId && activeRoomId) {
            const current = appState.getAssignments().find((a) => a.roomId === activeRoomId && a.furnitureId === furnId);
            if (current) {
              appState.setItemQuantityInRoom(activeRoomId, furnId, current.quantity - 1);
            }
          }
          break;
        }

        case 'unassign-item': {
          const furnId = el.getAttribute('data-furniture-id');
          if (furnId && activeRoomId) {
            appState.unassignItemFromRoom(activeRoomId, furnId);
          }
          break;
        }

        case 'open-move-modal': {
          const furnId = el.getAttribute('data-furniture-id');
          if (furnId && activeRoomId) {
            appState.openModal({ type: 'move-furniture', furnitureId: furnId, fromRoomId: activeRoomId });
          }
          break;
        }

        case 'close-modal': {
          appState.closeModal();
          break;
        }
      }
    });
  });

  // Modal Backdrop click to close
  const backdrop = document.getElementById('modal-backdrop');
  backdrop?.addEventListener('click', (e) => {
    if (e.target === backdrop) {
      appState.closeModal();
    }
  });

  // Room Form Submit & Live Calculations
  const roomForm = document.getElementById('form-room') as HTMLFormElement | null;
  if (roomForm) {
    const nameInput = document.getElementById('room-name') as HTMLInputElement;
    const wFtInput = document.getElementById('room-width-ft') as HTMLInputElement;
    const wInInput = document.getElementById('room-width-in') as HTMLInputElement;
    const lFtInput = document.getElementById('room-length-ft') as HTMLInputElement;
    const lInInput = document.getElementById('room-length-in') as HTMLInputElement;
    const dedInput = document.getElementById('room-deduction') as HTMLInputElement;
    const notesInput = document.getElementById('room-notes') as HTMLInputElement;
    const roomIdInput = document.getElementById('room-id') as HTMLInputElement;

    const previewArea = document.getElementById('preview-room-area');
    const previewPerimeter = document.getElementById('preview-room-perimeter');
    const previewInches = document.getElementById('preview-room-inches');

    const updateRoomPreview = () => {
      const wFt = parseFloat(wFtInput?.value || '0');
      const wIn = parseFloat(wInInput?.value || '0');
      const lFt = parseFloat(lFtInput?.value || '0');
      const lIn = parseFloat(lInInput?.value || '0');

      const totalW = parseFtInToInches(wFt, wIn);
      const totalL = parseFtInToInches(lFt, lIn);

      const area = calculateSquareFootage(totalW, totalL);
      const perimeter = calculatePerimeterFt(totalW, totalL);

      if (previewArea) previewArea.textContent = `${area}`;
      if (previewPerimeter) previewPerimeter.textContent = `${perimeter}`;
      if (previewInches) previewInches.textContent = `Raw: ${totalW}" W × ${totalL}" L`;
    };

    [wFtInput, wInInput, lFtInput, lInInput].forEach((input) => {
      input?.addEventListener('input', updateRoomPreview);
    });

    roomForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      const totalW = parseFtInToInches(parseFloat(wFtInput.value || '0'), parseFloat(wInInput.value || '0'));
      const totalL = parseFtInToInches(parseFloat(lFtInput.value || '0'), parseFloat(lInInput.value || '0'));
      const deduction = parseFloat(dedInput?.value || '20');
      const notes = notesInput?.value.trim();
      const roomId = roomIdInput?.value;

      if (!name || totalW <= 0 || totalL <= 0) return;

      if (roomId) {
        appState.updateRoom(roomId, {
          name,
          widthInches: totalW,
          lengthInches: totalL,
          doorWindowDeductionPct: deduction,
          notes,
        });
      } else {
        appState.addRoom({
          name,
          widthInches: totalW,
          lengthInches: totalL,
          doorWindowDeductionPct: deduction,
          notes,
        });
      }
    });
  }

  // Furniture Form Submit & Live Calculations
  const furnForm = document.getElementById('form-furniture') as HTMLFormElement | null;
  if (furnForm) {
    const nameInput = document.getElementById('furn-name') as HTMLInputElement;
    const catSelect = document.getElementById('furn-category') as HTMLSelectElement;
    const wInput = document.getElementById('furn-width') as HTMLInputElement;
    const dInput = document.getElementById('furn-depth') as HTMLInputElement;
    const hInput = document.getElementById('furn-height') as HTMLInputElement;
    const notesInput = document.getElementById('furn-notes') as HTMLInputElement;
    const idInput = document.getElementById('furniture-id') as HTMLInputElement;

    const previewFootprint = document.getElementById('preview-furn-footprint');
    const previewFtIn = document.getElementById('preview-furn-ft-in');

    const updateFurnPreview = () => {
      const w = parseFloat(wInput?.value || '0');
      const d = parseFloat(dInput?.value || '0');
      const footprint = calculateSquareFootage(w, d);

      if (previewFootprint) previewFootprint.textContent = `${footprint}`;
      if (previewFtIn) previewFtIn.textContent = `${formatInchesToFtIn(w)} × ${formatInchesToFtIn(d)}`;
    };

    [wInput, dInput].forEach((input) => {
      input?.addEventListener('input', updateFurnPreview);
    });

    furnForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const name = nameInput.value.trim();
      const category = catSelect.value as FurnitureCategory;
      const widthInches = parseFloat(wInput.value || '0');
      const depthInches = parseFloat(dInput.value || '0');
      const heightInches = hInput.value ? parseFloat(hInput.value) : undefined;
      const notes = notesInput.value.trim();
      const itemId = idInput.value;

      if (!name || widthInches <= 0 || depthInches <= 0) return;

      if (itemId) {
        appState.updateFurniture(itemId, {
          name,
          category,
          widthInches,
          depthInches,
          heightInches,
          notes,
        });
      } else {
        appState.addFurniture({
          name,
          category,
          widthInches,
          depthInches,
          heightInches,
          notes,
        });
      }
    });
  }

  // Move Furniture Form Submit
  const moveForm = document.getElementById('form-move-furniture') as HTMLFormElement | null;
  if (moveForm) {
    moveForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const furnId = (document.getElementById('move-furn-id') as HTMLInputElement).value;
      const fromRoomId = (document.getElementById('move-from-room-id') as HTMLInputElement).value;
      const toRoomId = (document.getElementById('move-target-room') as HTMLSelectElement).value;
      const qty = parseInt((document.getElementById('move-quantity') as HTMLInputElement).value, 10);

      if (furnId && fromRoomId && toRoomId && qty > 0) {
        appState.moveItem(furnId, fromRoomId, toRoomId, qty);
      }
    });
  }

  // Confirm Delete Room & Furniture Handlers
  document.getElementById('btn-confirm-delete-room-btn')?.addEventListener('click', (e) => {
    const target = e.currentTarget as HTMLElement;
    const roomId = target.getAttribute('data-room-id');
    if (roomId) {
      appState.deleteRoom(roomId);
    }
  });

  document.getElementById('btn-confirm-delete-furn-btn')?.addEventListener('click', (e) => {
    const target = e.currentTarget as HTMLElement;
    const furnId = target.getAttribute('data-furniture-id');
    if (furnId) {
      appState.deleteFurniture(furnId);
    }
  });

  // Backup / Export / Import / Reset Handlers
  document.getElementById('btn-copy-export')?.addEventListener('click', () => {
    const exportTextarea = document.getElementById('export-json-text') as HTMLTextAreaElement | null;
    if (exportTextarea) {
      exportTextarea.select();
      navigator.clipboard.writeText(exportTextarea.value);
      alert('Data JSON copied to clipboard!');
    }
  });

  document.getElementById('btn-execute-import')?.addEventListener('click', () => {
    const importTextarea = document.getElementById('import-json-text') as HTMLTextAreaElement | null;
    if (importTextarea && importTextarea.value.trim()) {
      const success = appState.importDataJSON(importTextarea.value.trim());
      if (success) {
        alert('Data successfully restored!');
      } else {
        alert('Failed to import JSON. Please check formatting.');
      }
    }
  });

  document.getElementById('btn-reset-defaults')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to reset all rooms and furniture back to original defaults?')) {
      appState.resetToDefaults();
    }
  });
}

// Global Keyboard Listener for Escape key
window.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && appState.getModal()) {
    appState.closeModal();
  }
});

// Initialize and subscribe
appState.subscribe(renderApp);
renderApp();
