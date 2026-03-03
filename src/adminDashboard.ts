/* ============================================
   Admin Dashboard — Slide-in Panel
   ============================================ */

import type { BuyerInfo, RaffleConfig } from './database';
import { saveBuyerInfo, updateRaffleConfig } from './database';

/* ─── State ─── */
let currentBuyers: Record<string, BuyerInfo> = {};
let currentTakenNumbers: Record<string, boolean> = {};
let currentConfig: RaffleConfig = {
  prizeAmount: 800000,
  ticketPrice: 20000,
  ticketCostForUs: 0,
  totalTickets: 100,
  drawDate: '2026-06-02',
};

/* ─── Metrics ─── */
export interface DashboardMetrics {
  totalRecaudado: number;
  costoBoletas: number;
  premio: number;
  costoTotal: number;
  ganancia: number;
  faltaEquilibrio: number;
  gananciaProyectada: number;
  vendidos: number;
  totalBoletas: number;
}

export function computeMetrics(
  buyers: Record<string, BuyerInfo>,
  config: RaffleConfig,
): DashboardMetrics {
  const totalRecaudado = Object.values(buyers).reduce(
    (sum, b) => sum + (b.amountPaid || 0),
    0,
  );
  const costoBoletas = config.ticketCostForUs * config.totalTickets;
  const premio = config.prizeAmount;
  const costoTotal = costoBoletas + premio;
  const ganancia = totalRecaudado - costoTotal;
  const faltaEquilibrio = Math.max(0, costoTotal - totalRecaudado);
  const gananciaProyectada = config.ticketPrice * config.totalTickets - costoTotal;
  const vendidos = Object.keys(buyers).length;

  return {
    totalRecaudado,
    costoBoletas,
    premio,
    costoTotal,
    ganancia,
    faltaEquilibrio,
    gananciaProyectada,
    vendidos,
    totalBoletas: config.totalTickets,
  };
}

/* ─── Formatting ─── */
function formatCOP(amount: number): string {
  const abs = Math.abs(amount);
  const formatted = abs >= 1000
    ? '$' + abs.toLocaleString('es-CO')
    : '$' + abs;
  return amount < 0 ? '-' + formatted : formatted;
}

/* ─── DOM Helpers ─── */
function $(selector: string): HTMLElement | null {
  return document.querySelector(selector);
}

/* ─── Setup ─── */
export function setupAdminDashboard(): void {
  createDashboardHTML();
  wireEvents();
}

function createDashboardHTML(): void {
  // Dashboard overlay
  const overlay = document.createElement('div');
  overlay.id = 'adminDashboard';
  overlay.className = 'dashboard-overlay hidden';
  overlay.innerHTML = `
    <div class="dashboard-panel">
      <div class="dashboard-header">
        <h2 class="dashboard-title">Panel de Administración</h2>
        <button class="dashboard-close" id="dashboardClose">&times;</button>
      </div>

      <div class="dashboard-body">
        <!-- Metrics Grid -->
        <div class="metrics-grid">
          <div class="metric-card">
            <span class="metric-label">Recaudado</span>
            <span class="metric-value" id="metricRecaudado">$0</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Costo Boletas</span>
            <span class="metric-value" id="metricCostoBoletas">$0</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Premio</span>
            <span class="metric-value" id="metricPremio">$0</span>
          </div>
          <div class="metric-card" id="metricGananciaCard">
            <span class="metric-label">Ganancia</span>
            <span class="metric-value" id="metricGanancia">$0</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Falta p/ Equilibrio</span>
            <span class="metric-value" id="metricFalta">$0</span>
          </div>
          <div class="metric-card">
            <span class="metric-label">Proyectada (100%)</span>
            <span class="metric-value" id="metricProyectada">$0</span>
          </div>
          <div class="metric-card metric-card-wide">
            <span class="metric-label">Vendidos</span>
            <span class="metric-value" id="metricVendidos">0 / 100</span>
          </div>
        </div>

        <!-- Config Editors -->
        <div class="config-editors">
          <div class="config-row">
            <label for="cfgPrizeInput">Premio Gordo ($)</label>
            <div class="config-input-wrap">
              <span class="config-prefix">$</span>
              <input type="number" id="cfgPrizeInput" min="0" step="10000" value="800000" />
              <button id="cfgPrizeSave" class="config-btn">Guardar</button>
            </div>
          </div>
          <div class="config-row">
            <label for="cfgPriceInput">Precio Boleta ($)</label>
            <div class="config-input-wrap">
              <span class="config-prefix">$</span>
              <input type="number" id="cfgPriceInput" min="0" step="1000" value="20000" />
              <button id="cfgPriceSave" class="config-btn">Guardar</button>
            </div>
          </div>
          <div class="config-row">
            <label for="ticketCostInput">Costo Boleta nosotros ($)</label>
            <div class="config-input-wrap">
              <span class="config-prefix">$</span>
              <input type="number" id="ticketCostInput" min="0" step="100" value="0" />
              <button id="ticketCostSave" class="config-btn">Guardar</button>
            </div>
          </div>
          <div class="config-row">
            <label for="cfgDateInput">Fecha Sorteo</label>
            <div class="config-input-wrap">
              <input type="date" id="cfgDateInput" value="2026-06-02" />
              <button id="cfgDateSave" class="config-btn">Guardar</button>
            </div>
          </div>
          <div class="config-row">
            <label for="cfgTicketsInput">Total Boletas</label>
            <div class="config-input-wrap">
              <input type="number" id="cfgTicketsInput" min="1" max="500" step="1" value="100" />
              <button id="cfgTicketsSave" class="config-btn">Guardar</button>
            </div>
          </div>
        </div>

        <!-- Buyers Table -->
        <div class="buyers-section">
          <h3 class="buyers-title">Números Vendidos (<span id="buyersCount">0</span>)</h3>
          <div class="buyers-table-wrap">
            <table class="buyers-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Nombre</th>
                  <th>Pago</th>
                  <th>Tel</th>
                  <th></th>
                </tr>
              </thead>
              <tbody id="buyersTableBody">
                <tr class="buyers-empty"><td colspan="5">No hay compradores registrados</td></tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(overlay);

  // Buyer form modal
  const buyerModal = document.createElement('div');
  buyerModal.id = 'buyerFormModal';
  buyerModal.className = 'modal hidden';
  buyerModal.innerHTML = `
    <div class="modal-backdrop"></div>
    <div class="modal-content buyer-form-modal">
      <button class="modal-close" id="buyerFormClose">&times;</button>
      <h2 class="modal-title">Registrar Comprador</h2>
      <p class="buyer-form-number" id="buyerFormNumber">#00</p>
      <form id="buyerForm" class="login-form">
        <div class="form-group">
          <label for="buyerFirstName">Nombre</label>
          <input type="text" id="buyerFirstName" placeholder="María" required />
        </div>
        <div class="form-group">
          <label for="buyerLastName">Apellido</label>
          <input type="text" id="buyerLastName" placeholder="López" required />
        </div>
        <div class="form-group">
          <label for="buyerPhone">Teléfono (con indicativo)</label>
          <input type="tel" id="buyerPhone" placeholder="573009876543" required />
        </div>
        <div class="form-group">
          <label for="buyerAmount">Monto pagado ($)</label>
          <input type="number" id="buyerAmount" min="0" step="1000" placeholder="20000" required />
        </div>
        <button type="submit" class="btn-submit">
          <span id="buyerSpinner" class="spinner hidden"></span>
          Guardar
        </button>
      </form>
    </div>
  `;
  document.body.appendChild(buyerModal);
}

function wireEvents(): void {
  // Close dashboard
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.id === 'dashboardClose' || target.id === 'adminDashboard') {
      hideDashboard();
    }
  });

  // Prevent clicks inside panel from closing
  const panel = $('.dashboard-panel');
  if (panel) {
    panel.addEventListener('click', (e) => e.stopPropagation());
  }

  // Config save buttons
  $('#cfgPrizeSave')?.addEventListener('click', async () => {
    const val = parseInt((document.getElementById('cfgPrizeInput') as HTMLInputElement).value, 10) || 0;
    await updateRaffleConfig({ prizeAmount: val });
  });
  $('#cfgPriceSave')?.addEventListener('click', async () => {
    const val = parseInt((document.getElementById('cfgPriceInput') as HTMLInputElement).value, 10) || 0;
    await updateRaffleConfig({ ticketPrice: val });
  });
  $('#ticketCostSave')?.addEventListener('click', async () => {
    const val = parseInt((document.getElementById('ticketCostInput') as HTMLInputElement).value, 10) || 0;
    await updateRaffleConfig({ ticketCostForUs: val });
  });
  $('#cfgDateSave')?.addEventListener('click', async () => {
    const val = (document.getElementById('cfgDateInput') as HTMLInputElement).value;
    if (val) await updateRaffleConfig({ drawDate: val });
  });
  $('#cfgTicketsSave')?.addEventListener('click', async () => {
    const val = parseInt((document.getElementById('cfgTicketsInput') as HTMLInputElement).value, 10) || 100;
    await updateRaffleConfig({ totalTickets: val });
  });

  // Buyer form close
  document.getElementById('buyerFormClose')?.addEventListener('click', hideBuyerForm);
  const buyerFormBackdrop = document.querySelector('#buyerFormModal .modal-backdrop');
  if (buyerFormBackdrop) {
    buyerFormBackdrop.addEventListener('click', hideBuyerForm);
  }

  // Buyer form submit
  const buyerForm = document.getElementById('buyerForm') as HTMLFormElement | null;
  if (buyerForm) {
    buyerForm.addEventListener('submit', handleBuyerFormSubmit);
  }

  // Buyers table — delegate click for edit/whatsapp
  const tableBody = document.getElementById('buyersTableBody');
  if (tableBody) {
    tableBody.addEventListener('click', (e) => {
      const target = e.target as HTMLElement;
      const btn = target.closest('[data-action]') as HTMLElement | null;
      if (!btn) return;
      const action = btn.dataset.action;
      const num = parseInt(btn.dataset.num || '0', 10);
      if (action === 'edit') {
        const key = num.toString().padStart(2, '0');
        showBuyerForm(num, currentBuyers[key]);
      }
    });
  }
}

/* ─── Buyer Form ─── */
let currentFormNum: number = 0;

export function showBuyerForm(num: number, existingBuyer?: BuyerInfo): void {
  currentFormNum = num;
  const modal = document.getElementById('buyerFormModal');
  if (!modal) return;

  const label = num.toString().padStart(2, '0');
  const numDisplay = document.getElementById('buyerFormNumber');
  if (numDisplay) numDisplay.textContent = `#${label}`;

  const firstName = document.getElementById('buyerFirstName') as HTMLInputElement;
  const lastName = document.getElementById('buyerLastName') as HTMLInputElement;
  const phone = document.getElementById('buyerPhone') as HTMLInputElement;
  const amount = document.getElementById('buyerAmount') as HTMLInputElement;

  if (existingBuyer) {
    firstName.value = existingBuyer.firstName;
    lastName.value = existingBuyer.lastName;
    phone.value = existingBuyer.phone;
    amount.value = existingBuyer.amountPaid.toString();
  } else {
    firstName.value = '';
    lastName.value = '';
    phone.value = '';
    amount.value = currentConfig.ticketPrice.toString();
  }

  modal.classList.remove('hidden');
  firstName.focus();
}

function hideBuyerForm(): void {
  const modal = document.getElementById('buyerFormModal');
  if (modal) modal.classList.add('hidden');
}

async function handleBuyerFormSubmit(e: Event): Promise<void> {
  e.preventDefault();

  const spinner = document.getElementById('buyerSpinner');
  const submitBtn = (e.target as HTMLFormElement).querySelector('.btn-submit') as HTMLButtonElement;

  const buyer: BuyerInfo = {
    firstName: (document.getElementById('buyerFirstName') as HTMLInputElement).value.trim(),
    lastName: (document.getElementById('buyerLastName') as HTMLInputElement).value.trim(),
    phone: (document.getElementById('buyerPhone') as HTMLInputElement).value.trim(),
    amountPaid: parseInt(
      (document.getElementById('buyerAmount') as HTMLInputElement).value,
      10,
    ) || 0,
  };

  if (spinner) spinner.classList.remove('hidden');
  submitBtn.disabled = true;

  try {
    await saveBuyerInfo(currentFormNum, buyer);
    hideBuyerForm();
  } catch (err) {
    console.error('Error saving buyer info:', err);
  } finally {
    if (spinner) spinner.classList.add('hidden');
    submitBtn.disabled = false;
  }
}

/* ─── Dashboard Show/Hide ─── */
export function showDashboard(): void {
  const overlay = document.getElementById('adminDashboard');
  if (overlay) {
    overlay.classList.remove('hidden');
    // Force reflow then add open class for animation
    overlay.offsetHeight;
    overlay.classList.add('open');
  }
  renderMetrics();
  renderBuyersTable();
}

export function hideDashboard(): void {
  const overlay = document.getElementById('adminDashboard');
  if (overlay) {
    overlay.classList.remove('open');
    setTimeout(() => overlay.classList.add('hidden'), 300);
  }
}

/* ─── Real-time Update Hooks ─── */
export function updateDashboardData(
  buyers: Record<string, BuyerInfo>,
  takenNumbers: Record<string, boolean>,
): void {
  currentBuyers = buyers || {};
  currentTakenNumbers = takenNumbers || {};

  // Re-render only if dashboard is visible
  const overlay = document.getElementById('adminDashboard');
  if (overlay && overlay.classList.contains('open')) {
    renderMetrics();
    renderBuyersTable();
  }
}

export function updateDashboardConfig(config: RaffleConfig): void {
  currentConfig = config;

  // Hydrate config inputs (skip focused to avoid clobbering user typing)
  const inputs: [string, string][] = [
    ['cfgPrizeInput', config.prizeAmount.toString()],
    ['cfgPriceInput', config.ticketPrice.toString()],
    ['ticketCostInput', config.ticketCostForUs.toString()],
    ['cfgDateInput', config.drawDate],
    ['cfgTicketsInput', config.totalTickets.toString()],
  ];
  for (const [id, val] of inputs) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    if (el && document.activeElement !== el) {
      el.value = val;
    }
  }

  const overlay = document.getElementById('adminDashboard');
  if (overlay && overlay.classList.contains('open')) {
    renderMetrics();
  }
}

/* ─── Render Metrics ─── */
function renderMetrics(): void {
  const m = computeMetrics(currentBuyers, currentConfig);

  setMetric('metricRecaudado', formatCOP(m.totalRecaudado));
  setMetric('metricCostoBoletas', formatCOP(m.costoBoletas));
  setMetric('metricPremio', formatCOP(m.premio));
  setMetric('metricGanancia', formatCOP(m.ganancia));
  setMetric('metricFalta', formatCOP(m.faltaEquilibrio));
  setMetric('metricProyectada', formatCOP(m.gananciaProyectada));
  setMetric('metricVendidos', `${m.vendidos} / ${m.totalBoletas}`);

  // Color-code ganancia card
  const gananciaCard = document.getElementById('metricGananciaCard');
  if (gananciaCard) {
    gananciaCard.classList.remove('metric-positive', 'metric-negative');
    gananciaCard.classList.add(m.ganancia >= 0 ? 'metric-positive' : 'metric-negative');
  }
}

function setMetric(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

/* ─── Render Buyers Table ─── */
function renderBuyersTable(): void {
  const tbody = document.getElementById('buyersTableBody');
  const countEl = document.getElementById('buyersCount');
  if (!tbody) return;

  // Collect sold numbers: numbers that are taken (union with buyers for safety)
  const soldKeys = new Set<string>();
  for (const [key, val] of Object.entries(currentTakenNumbers)) {
    if (val) soldKeys.add(key);
  }
  for (const key of Object.keys(currentBuyers)) {
    soldKeys.add(key);
  }

  const sortedKeys = Array.from(soldKeys).sort((a, b) => a.localeCompare(b));

  if (countEl) countEl.textContent = sortedKeys.length.toString();

  if (sortedKeys.length === 0) {
    tbody.innerHTML =
      '<tr class="buyers-empty"><td colspan="5">No hay compradores registrados</td></tr>';
    return;
  }

  tbody.innerHTML = sortedKeys
    .map((key) => {
      const buyer = currentBuyers[key];
      if (buyer) {
        const name = `${buyer.firstName} ${buyer.lastName.charAt(0)}.`;
        const paid = formatCOP(buyer.amountPaid);
        const waLink = `https://wa.me/${buyer.phone.replace(/\D/g, '')}`;
        return `<tr>
          <td class="cell-num">${key}</td>
          <td>${escapeHtml(name)}</td>
          <td>${paid}</td>
          <td><a href="${waLink}" target="_blank" rel="noopener" class="wa-table-link" title="${escapeHtml(buyer.phone)}">📱</a></td>
          <td><button class="btn-table-edit" data-action="edit" data-num="${parseInt(key, 10)}">Editar</button></td>
        </tr>`;
      } else {
        // Taken but no buyer info
        return `<tr class="buyer-missing">
          <td class="cell-num">${key}</td>
          <td class="text-muted">Sin registro</td>
          <td>—</td>
          <td>—</td>
          <td><button class="btn-table-edit" data-action="edit" data-num="${parseInt(key, 10)}">Agregar</button></td>
        </tr>`;
      }
    })
    .join('');
}

function escapeHtml(str: string): string {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
