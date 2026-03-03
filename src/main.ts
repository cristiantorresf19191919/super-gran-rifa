/* ============================================
   SUPER GRAN RIFA — Main Entry Point
   ============================================ */

import Phaser from 'phaser';
import { BoardScene, BOARD_EVENTS } from './game/BoardScene';
import { onAuthChange, login, logout } from './auth';
import { subscribeToRaffle, subscribeToConfig, toggleNumber, type RaffleData, type RaffleConfig } from './database';
import {
  setupAdminDashboard,
  showDashboard,
  showBuyerForm,
  updateDashboardData,
  updateDashboardConfig,
} from './adminDashboard';
import {
  setupWhatsAppLink,
  setupPaymentModal,
  setupLoginModal,
  setupLogoutButton,
  showAdminUI,
  hideAdminUI,
  showConfirmModal,
  showNumberInfo,
  showStickyCta,
  updateCounters,
  updatePrizeDisplay,
  updateDrawDate,
  updateDynamicTexts,
  setupNumberSheet,
  updateSheetData,
  openNumberSheetWithSelection,
  openAdminSheetWithSelection,
} from './ui';

/* ─── State ─── */
let isAdmin = false;
let boardScene: BoardScene | null = null;
let currentTaken: Set<number> = new Set();
let currentRaffleData: RaffleData = { takenNumbers: {} };
let isToggling = false; // Lock to prevent overlapping toggle operations
let currentTotalTickets = 100;

/* ─── Phaser Game Setup ─── */
function initGame(): Phaser.Game {
  const container = document.getElementById('game-container');
  if (!container) throw new Error('Game container not found');

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game-container',
    width: 900,
    height: 750,
    backgroundColor: '#0d2137',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: [BoardScene],
    audio: { disableWebAudio: true },
    banner: false,
    antialias: true,
    roundPixels: true,
  };

  const game = new Phaser.Game(config);

  game.events.on('ready', () => {
    boardScene = game.scene.getScene('BoardScene') as BoardScene;
    if (boardScene) {
      setupBoardEvents(boardScene);
      // Apply any already-loaded data
      boardScene.updateTakenNumbers(currentTaken);
      boardScene.setAdmin(isAdmin);
    }
  });

  return game;
}

/* ─── Board Event Handlers ─── */
function setupBoardEvents(scene: BoardScene): void {
  scene.events.on(BOARD_EVENTS.NUMBER_CLICKED, (num: number) => {
    if (isAdmin) {
      handleAdminClick(num);
    } else {
      handlePublicClick(num);
    }
  });
}

function handleAdminClick(num: number): void {
  // Ignore clicks while a toggle operation is in progress
  if (isToggling) return;

  // Open bottom sheet with admin controls for the selected number
  openAdminSheetWithSelection(
    num,
    async (selectedNum: number) => {
      if (isToggling) return;
      isToggling = true;
      try {
        await toggleNumber(selectedNum);
      } catch (err) {
        console.error('Error toggling number:', err);
      } finally {
        isToggling = false;
      }
    },
    (selectedNum: number) => {
      showBuyerForm(selectedNum);
    },
  );
}

function handlePublicClick(num: number): void {
  const taken = currentTaken.has(num);
  if (taken) {
    showNumberInfo(num, true);
  } else {
    // On mobile, open bottom sheet with pre-selected number for confirmation
    if (window.innerWidth <= 768) {
      openNumberSheetWithSelection(num);
    } else {
      showStickyCta(num);
    }
  }
}

/* ─── Firebase Data Listener ─── */
function setupDataListener(): void {
  subscribeToRaffle((data: RaffleData) => {
    currentRaffleData = data;
    const taken = new Set<number>();
    for (const [key, value] of Object.entries(data.takenNumbers || {})) {
      if (value) taken.add(parseInt(key, 10));
    }
    currentTaken = taken;

    // Update the Phaser board
    if (boardScene) {
      boardScene.updateTakenNumbers(taken);
    }

    // Update counter UI
    updateCounters(taken.size, currentTotalTickets);

    // Update bottom sheet grid
    updateSheetData(taken, currentTotalTickets);

    // Pipe data to admin dashboard
    updateDashboardData(data.buyers || {}, data.takenNumbers || {});
  });
}

/* ─── Auth Setup ─── */
function setupAuth(): void {
  // Login form handler
  setupLoginModal(async (email: string, password: string) => {
    await login(email, password);
  });

  // Logout handler
  setupLogoutButton(async () => {
    await logout();
  });

  // Auth state listener
  onAuthChange((user) => {
    isAdmin = user !== null;

    if (isAdmin) {
      showAdminUI();
    } else {
      hideAdminUI();
    }

    if (boardScene) {
      boardScene.setAdmin(isAdmin);
    }
  });
}

/* ─── Rebuild Board on totalTickets Change ─── */
function rebuildBoard(totalTickets: number): void {
  if (!boardScene) return;
  const cols = 10;
  const rows = Math.ceil(totalTickets / cols);
  boardScene.rebuildGrid(totalTickets, rows, cols);

  // Reapply taken numbers and admin state
  boardScene.updateTakenNumbers(currentTaken);
  boardScene.setAdmin(isAdmin);

  // Update container aspect ratio
  const container = document.getElementById('game-container');
  if (container) {
    container.style.aspectRatio = `${cols} / ${rows * 0.85}`;
  }
}

/* ─── Initialize Everything ─── */
function init(): void {
  // Setup static UI
  setupWhatsAppLink();
  setupPaymentModal();
  setupNumberSheet();

  // Setup admin dashboard (creates DOM elements)
  setupAdminDashboard();

  // Wire dashboard button
  const dashboardBtn = document.getElementById('dashboardBtn');
  if (dashboardBtn) {
    dashboardBtn.addEventListener('click', showDashboard);
  }

  // Setup auth
  setupAuth();

  // Start Firebase data listener
  setupDataListener();

  // Start Firebase config listener (prize amount, ticket price, draw date, totalTickets)
  subscribeToConfig((config: RaffleConfig) => {
    updatePrizeDisplay(config.prizeAmount, config.ticketPrice);
    updateDrawDate(config.drawDate);
    updateDynamicTexts(config.totalTickets, config.ticketPrice);
    updateDashboardConfig(config);

    if (config.totalTickets !== currentTotalTickets) {
      currentTotalTickets = config.totalTickets;
      rebuildBoard(config.totalTickets);
      updateCounters(currentTaken.size, currentTotalTickets);
      updateSheetData(currentTaken, currentTotalTickets);
    } else {
      currentTotalTickets = config.totalTickets;
    }
  });

  // Initialize Phaser game
  initGame();
}

// Wait for DOM
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
