/* ============================================
   UI Module – Modals, WhatsApp, Payments
   ============================================ */

const WHATSAPP_NUMBER = '573103323904';
const WHATSAPP_MESSAGE = 'Hola quiero ganarme el premio y quiero jugar con este numero';
const PAYMENT_NUMBER = '3026323904';

/* ─── Helper: show/hide modal ─── */
function showModal(id: string): void {
  document.getElementById(id)?.classList.remove('hidden');
}

function hideModal(id: string): void {
  document.getElementById(id)?.classList.add('hidden');
}

function setupModalClose(modalId: string, closeBtnId: string): void {
  const closeBtn = document.getElementById(closeBtnId);
  const modal = document.getElementById(modalId);

  closeBtn?.addEventListener('click', () => hideModal(modalId));

  // Close on backdrop click
  modal?.querySelector('.modal-backdrop')?.addEventListener('click', () => {
    hideModal(modalId);
  });

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !modal?.classList.contains('hidden')) {
      hideModal(modalId);
    }
  });
}

/* ─── WhatsApp Link ─── */
export function setupWhatsAppLink(): void {
  const link = document.getElementById('whatsappLink');
  if (link) {
    const encoded = encodeURIComponent(WHATSAPP_MESSAGE);
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;
    link.setAttribute('href', url);
    link.setAttribute('target', '_blank');
    link.setAttribute('rel', 'noopener');
  }

  // Also setup the payment modal's WhatsApp link
  const payWa = document.getElementById('paymentWhatsapp');
  if (payWa) {
    const msg = encodeURIComponent('Hola, ya realicé el pago para la rifa. Adjunto comprobante.');
    const url = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
    payWa.setAttribute('href', url);
    payWa.setAttribute('target', '_blank');
    payWa.setAttribute('rel', 'noopener');
  }
}

/* ─── Payment Modal ─── */
export function setupPaymentModal(): void {
  const btn = document.getElementById('paymentBtn');
  btn?.addEventListener('click', () => showModal('paymentModal'));
  setupModalClose('paymentModal', 'paymentModalClose');

  // DaviPlata option — try to open app, fallback to Play Store
  const daviplataCard = document.getElementById('daviplataCard');
  if (daviplataCard) {
    daviplataCard.setAttribute(
      'href',
      `https://play.google.com/store/apps/details?id=com.davivienda.daviplataapp`,
    );
  }

  // Pre option — Movii / prepaid recharge
  const preCard = document.getElementById('preCard');
  if (preCard) {
    preCard.setAttribute('href', `https://www.movii.com.co/`);
  }
}

/* ─── Login Modal ─── */
export function setupLoginModal(
  onSubmit: (email: string, password: string) => Promise<void>,
): void {
  const loginBtn = document.getElementById('loginBtn');
  loginBtn?.addEventListener('click', () => showModal('loginModal'));
  setupModalClose('loginModal', 'loginModalClose');

  const form = document.getElementById('loginForm') as HTMLFormElement;
  const errorEl = document.getElementById('loginError');
  const spinner = document.getElementById('loginSpinner');

  // Password visibility toggle
  const pwToggle = document.getElementById('passwordToggle');
  const pwInput = document.getElementById('password') as HTMLInputElement;
  const eyeOpen = document.getElementById('eyeOpen');
  const eyeClosed = document.getElementById('eyeClosed');
  pwToggle?.addEventListener('click', () => {
    if (pwInput) {
      const showing = pwInput.type === 'text';
      pwInput.type = showing ? 'password' : 'text';
      if (eyeOpen) eyeOpen.style.display = showing ? '' : 'none';
      if (eyeClosed) eyeClosed.style.display = showing ? 'none' : '';
    }
  });

  form?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = (document.getElementById('email') as HTMLInputElement).value;
    const password = (document.getElementById('password') as HTMLInputElement).value;

    errorEl?.classList.add('hidden');
    spinner?.classList.remove('hidden');

    try {
      await onSubmit(email, password);
      hideModal('loginModal');
      form.reset();
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : 'Error al iniciar sesión';
      if (errorEl) {
        errorEl.textContent = translateFirebaseError(message);
        errorEl.classList.remove('hidden');
      }
    } finally {
      spinner?.classList.add('hidden');
    }
  });
}

function translateFirebaseError(msg: string): string {
  if (msg.includes('user-not-found') || msg.includes('wrong-password') || msg.includes('invalid-credential')) {
    return 'Correo o contraseña incorrectos';
  }
  if (msg.includes('too-many-requests')) {
    return 'Demasiados intentos. Intenta más tarde.';
  }
  if (msg.includes('network-request-failed')) {
    return 'Error de conexión. Verifica tu internet.';
  }
  return 'Error al iniciar sesión. Verifica tus datos.';
}

/* ─── Admin UI ─── */
export function showAdminUI(): void {
  const adminBar = document.getElementById('adminBar');
  const loginBtn = document.getElementById('loginBtn');
  const loginBtnText = document.getElementById('loginBtnText');

  adminBar?.classList.remove('hidden');
  loginBtn?.classList.add('logged-in');
  if (loginBtnText) loginBtnText.textContent = 'Admin ✓';
}

export function hideAdminUI(): void {
  const adminBar = document.getElementById('adminBar');
  const loginBtn = document.getElementById('loginBtn');
  const loginBtnText = document.getElementById('loginBtnText');

  adminBar?.classList.add('hidden');
  loginBtn?.classList.remove('logged-in');
  if (loginBtnText) loginBtnText.textContent = 'Admin';
}

export function setupLogoutButton(onLogout: () => Promise<void>): void {
  const btn = document.getElementById('logoutBtn');
  btn?.addEventListener('click', async () => {
    await onLogout();
  });
}

/* ─── Confirm Modal ─── */
// Track current confirm handlers so we can remove them before adding new ones
let _confirmYesHandler: (() => void) | null = null;
let _confirmNoHandler: (() => void) | null = null;

export function showConfirmModal(
  message: string,
  onConfirm: () => void,
): void {
  const textEl = document.getElementById('confirmText');
  if (textEl) textEl.textContent = message;

  const yesBtn = document.getElementById('confirmYes');
  const noBtn = document.getElementById('confirmNo');

  // Remove any stale listeners from a previous modal invocation
  if (_confirmYesHandler && yesBtn) {
    yesBtn.removeEventListener('click', _confirmYesHandler);
  }
  if (_confirmNoHandler && noBtn) {
    noBtn.removeEventListener('click', _confirmNoHandler);
  }

  const cleanup = () => {
    hideModal('confirmModal');
    if (yesBtn) yesBtn.removeEventListener('click', handleYes);
    if (noBtn) noBtn.removeEventListener('click', handleNo);
    _confirmYesHandler = null;
    _confirmNoHandler = null;
  };

  const handleYes = () => {
    onConfirm();
    cleanup();
  };

  const handleNo = () => {
    cleanup();
  };

  _confirmYesHandler = handleYes;
  _confirmNoHandler = handleNo;

  yesBtn?.addEventListener('click', handleYes);
  noBtn?.addEventListener('click', handleNo);

  showModal('confirmModal');
  setupModalClose('confirmModal', 'confirmModalClose');
}

/* ─── Number Info Modal (Public) ─── */
export function showNumberInfo(num: number, taken: boolean): void {
  const content = document.getElementById('numberInfoContent');
  if (!content) return;

  const label = num.toString().padStart(2, '0');

  if (taken) {
    content.innerHTML = `
      <div class="number-info-taken">
        <div class="number-display">${label}</div>
        <div class="status-text">Este número ya fue apartado</div>
      </div>
    `;
  } else {
    const encoded = encodeURIComponent(
      `Hola quiero ganarme el premio y quiero jugar con el número ${label}`,
    );
    const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`;

    content.innerHTML = `
      <div class="number-info-available">
        <div class="number-display">${label}</div>
        <div class="status-text">¡Disponible!</div>
        <div class="cta-text">¿Quieres apartar este número?</div>
        <a href="${waUrl}" target="_blank" rel="noopener" class="btn-whatsapp">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
          </svg>
          Apartar por WhatsApp
        </a>
      </div>
    `;
  }

  showModal('numberInfoModal');
  setupModalClose('numberInfoModal', 'numberInfoModalClose');
}

/* ─── Counter Update ─── */
/* ─── Prize Config Update ─── */
function formatCOP(amount: number): string {
  return '$' + amount.toLocaleString('es-CO');
}

export function updatePrizeDisplay(prizeAmount: number, ticketPrice: number): void {
  const prizeEl = document.getElementById('prizeAmount');
  const ticketEl = document.getElementById('ticketPrice');
  const investPrizeEl = document.getElementById('investPrize');

  if (prizeEl) prizeEl.textContent = formatCOP(prizeAmount);
  if (ticketEl) ticketEl.textContent = formatCOP(ticketPrice);
  if (investPrizeEl) investPrizeEl.textContent = formatCOP(prizeAmount);
}

/* ─── Counter + Scarcity Update ─── */
export function updateCounters(taken: number, totalTickets: number): void {
  const available = totalTickets - taken;
  const availEl = document.getElementById('availableCount');
  const takenEl = document.getElementById('takenCount');
  const scarcityFill = document.getElementById('scarcityFill');

  if (availEl) animateCounter(availEl, available);
  if (takenEl) takenEl.textContent = taken.toString();

  // Update scarcity progress bar (fills as numbers are taken)
  if (scarcityFill) {
    scarcityFill.style.width = `${(taken / totalTickets) * 100}%`;
  }
}

function animateCounter(el: HTMLElement, target: number): void {
  const current = parseInt(el.textContent || '0', 10);
  if (current === target) return;

  const diff = target - current;
  const steps = Math.abs(diff);
  const stepTime = Math.max(30, 300 / steps);
  let i = 0;

  const interval = setInterval(() => {
    i++;
    el.textContent = (current + Math.round((diff / steps) * i)).toString();
    if (i >= steps) {
      el.textContent = target.toString();
      clearInterval(interval);
    }
  }, stepTime);
}

/* ─── Sticky CTA Bar ─── */
let stickyTimeout: ReturnType<typeof setTimeout> | null = null;

export function showStickyCta(num: number): void {
  const bar = document.getElementById('stickyCta');
  const numberEl = document.getElementById('stickyNumber');
  const waLink = document.getElementById('stickyWhatsapp');
  const closeBtn = document.getElementById('stickyClose');
  if (!bar || !numberEl || !waLink) return;

  const label = num.toString().padStart(2, '0');
  numberEl.textContent = `#${label}`;

  const encoded = encodeURIComponent(
    `Hola quiero ganarme el premio y quiero jugar con el número ${label}`,
  );
  waLink.setAttribute('href', `https://wa.me/${WHATSAPP_NUMBER}?text=${encoded}`);

  bar.classList.remove('hidden');

  // Auto-hide after 8 seconds
  if (stickyTimeout) clearTimeout(stickyTimeout);
  stickyTimeout = setTimeout(() => hideStickyCta(), 8000);

  // Close button
  closeBtn?.addEventListener('click', hideStickyCta, { once: true });
}

export function hideStickyCta(): void {
  const bar = document.getElementById('stickyCta');
  bar?.classList.add('hidden');
  if (stickyTimeout) { clearTimeout(stickyTimeout); stickyTimeout = null; }
}

/* ─── Bottom Sheet Number Selector ─── */
let sheetSelectedNumber: number | null = null;
let sheetTakenNumbers: Set<number> = new Set();
let sheetTotalTickets = 100;
let magicAnimationRunning = false;
let sheetAdminMode = false;
let sheetAdminOnToggle: ((num: number) => Promise<void>) | null = null;
let sheetAdminOnBuyerForm: ((num: number) => void) | null = null;

export function setupNumberSheet(): void {
  const btn = document.getElementById('chooseNumberBtn');
  const closeBtn = document.getElementById('numberSheetClose');
  const sheet = document.getElementById('numberSheet');
  const backdrop = sheet?.querySelector('.number-sheet-backdrop');
  const searchInput = document.getElementById('numberSearch') as HTMLInputElement;

  btn?.addEventListener('click', () => openNumberSheet());
  closeBtn?.addEventListener('click', () => closeNumberSheet());
  backdrop?.addEventListener('click', () => closeNumberSheet());

  searchInput?.addEventListener('input', () => {
    filterSheetNumbers(searchInput.value);
  });

  // Magic lucky button
  const magicBtn = document.getElementById('magicLuckyBtn');
  magicBtn?.addEventListener('click', () => runMagicLuckyAnimation());

  // Close on Escape
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet?.classList.contains('hidden')) {
      closeNumberSheet();
    }
  });
}

function openNumberSheet(): void {
  const sheet = document.getElementById('numberSheet');
  sheet?.classList.remove('hidden');
  document.body.style.overflow = 'hidden';

  // Reset (don't reset admin mode — it's set before calling openNumberSheet)
  sheetSelectedNumber = null;
  updateSheetFooter();
  const search = document.getElementById('numberSearch') as HTMLInputElement;
  if (search) search.value = '';
  filterSheetNumbers('');

  // Restore title for non-admin
  if (!sheetAdminMode) {
    const title = document.querySelector('.number-sheet-title');
    if (title) title.textContent = 'Elige tu número';
    const magicBtn = document.getElementById('magicLuckyBtn');
    if (magicBtn) magicBtn.style.display = '';
  }

  // Show skeleton if grid hasn't been populated yet
  showSheetSkeleton();
}

function closeNumberSheet(): void {
  const sheet = document.getElementById('numberSheet');
  sheet?.classList.add('hidden');
  document.body.style.overflow = '';

  // Clean up admin mode
  sheetAdminMode = false;
  sheetAdminOnToggle = null;
  sheetAdminOnBuyerForm = null;
}

export function openNumberSheetWithSelection(num: number): void {
  openNumberSheet();
  sheetSelectedNumber = num;
  updateSheetCellHighlights();
  updateSheetFooter();
  // Scroll selected cell into view
  requestAnimationFrame(() => {
    const cell = document.querySelector(`.sheet-cell[data-num="${num}"]`) as HTMLElement;
    cell?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}

/* ─── Admin Sheet Mode ─── */
export function openAdminSheet(
  onToggle: (num: number) => Promise<void>,
  onBuyerForm: (num: number) => void,
): void {
  sheetAdminMode = true;
  sheetAdminOnToggle = onToggle;
  sheetAdminOnBuyerForm = onBuyerForm;
  openNumberSheet();

  // Update title for admin
  const title = document.querySelector('.number-sheet-title');
  if (title) title.textContent = 'Seleccionar número (Admin)';

  // Hide magic button in admin mode
  const magicBtn = document.getElementById('magicLuckyBtn');
  if (magicBtn) magicBtn.style.display = 'none';
}

export function openAdminSheetWithSelection(
  num: number,
  onToggle: (num: number) => Promise<void>,
  onBuyerForm: (num: number) => void,
): void {
  openAdminSheet(onToggle, onBuyerForm);
  sheetSelectedNumber = num;
  updateSheetCellHighlights();
  updateSheetFooter();
  requestAnimationFrame(() => {
    const cell = document.querySelector(`.sheet-cell[data-num="${num}"]`) as HTMLElement;
    cell?.scrollIntoView({ block: 'center', behavior: 'smooth' });
  });
}

export function updateSheetData(taken: Set<number>, total: number): void {
  const totalChanged = total !== sheetTotalTickets;
  sheetTakenNumbers = taken;
  sheetTotalTickets = total;

  if (totalChanged || !document.querySelector('.sheet-cell')) {
    renderSheetGrid();
  } else {
    // In-place update: just toggle classes, preserves scroll position
    updateSheetCellStates();
  }
}

function showSheetSkeleton(): void {
  const grid = document.getElementById('numberSheetGrid');
  if (!grid) return;
  // Only show skeleton if grid is genuinely empty (no real cells)
  if (grid.querySelector('.sheet-cell')) return;

  grid.innerHTML = '';
  const wrap = document.createElement('div');
  wrap.className = 'sheet-skeleton-wrap';
  // Show 20 skeleton placeholders (5 rows)
  for (let i = 0; i < 20; i++) {
    const skel = document.createElement('div');
    skel.className = 'sheet-skeleton';
    skel.style.animationDelay = `${i * 60}ms`;
    wrap.appendChild(skel);
  }
  grid.appendChild(wrap);
}

function renderSheetGrid(): void {
  const grid = document.getElementById('numberSheetGrid');
  if (!grid) return;

  grid.innerHTML = '';

  for (let i = 0; i < sheetTotalTickets; i++) {
    const cell = document.createElement('button');
    const label = i.toString().padStart(2, '0');
    const isTaken = sheetTakenNumbers.has(i);

    cell.className = `sheet-cell ${isTaken ? 'sheet-cell-taken' : 'sheet-cell-available'}`;
    if (i === sheetSelectedNumber && !isTaken) {
      cell.classList.add('sheet-cell-selected');
    }
    cell.textContent = label;
    cell.dataset.num = i.toString();
    cell.type = 'button';
    // Subtle staggered reveal (fast: 5ms per cell, max 200ms)
    cell.style.animationDelay = `${Math.min(i * 5, 200)}ms`;

    // Prevent focus-induced scroll on desktop (mousedown default = focus)
    cell.addEventListener('mousedown', (e) => e.preventDefault());

    // On click: lock scroll position so button focus can't jump the grid
    cell.addEventListener('click', () => {
      const g = document.getElementById('numberSheetGrid');
      const scrollPos = g?.scrollTop ?? 0;

      // In public mode, ignore taken numbers; in admin mode, allow selection
      if (sheetTakenNumbers.has(i) && !sheetAdminMode) return;
      sheetSelectedNumber = i;
      updateSheetCellHighlights();
      updateSheetFooter();

      // Restore scroll — catches any focus-induced or reflow shift
      if (g) {
        g.scrollTop = scrollPos;
        requestAnimationFrame(() => { g.scrollTop = scrollPos; });
      }
    });

    grid.appendChild(cell);
  }
}

function updateSheetCellStates(): void {
  const grid = document.getElementById('numberSheetGrid');
  if (!grid) return;

  for (let i = 0; i < grid.children.length; i++) {
    const cell = grid.children[i] as HTMLElement;
    const num = parseInt(cell.dataset.num || '-1', 10);
    const isTaken = sheetTakenNumbers.has(num);
    const isSelected = num === sheetSelectedNumber && !isTaken;

    cell.className = 'sheet-cell'
      + (isTaken ? ' sheet-cell-taken' : ' sheet-cell-available')
      + (isSelected ? ' sheet-cell-selected' : '');
  }

  // If selected number got taken by someone else, clear selection
  if (sheetSelectedNumber !== null && sheetTakenNumbers.has(sheetSelectedNumber)) {
    sheetSelectedNumber = null;
    updateSheetFooter();
  }
}

function updateSheetCellHighlights(): void {
  const cells = document.querySelectorAll('.sheet-cell');
  cells.forEach(cell => {
    const num = parseInt((cell as HTMLElement).dataset.num || '-1', 10);
    cell.classList.toggle('sheet-cell-selected', num === sheetSelectedNumber && !sheetTakenNumbers.has(num));
  });
}

function updateSheetFooter(): void {
  const footer = document.getElementById('numberSheetFooter');
  const numEl = document.getElementById('numberSheetSelectedNum');
  const labelEl = document.querySelector('.number-sheet-selected-label');
  const confirmLink = document.getElementById('numberSheetConfirm') as HTMLElement;
  const adminActions = document.getElementById('numberSheetAdminActions') as HTMLElement;
  const adminMark = document.getElementById('sheetAdminMark');
  const adminRelease = document.getElementById('sheetAdminRelease');

  if (sheetSelectedNumber === null) {
    footer?.classList.remove('active');
    return;
  }

  const isTaken = sheetTakenNumbers.has(sheetSelectedNumber);
  const label = sheetSelectedNumber.toString().padStart(2, '0');
  if (numEl) numEl.textContent = `#${label}`;

  if (sheetAdminMode) {
    // Admin mode: show admin buttons, hide WhatsApp CTA
    footer?.classList.add('active');
    if (confirmLink) confirmLink.style.display = 'none';
    if (adminActions) adminActions.style.display = '';

    if (labelEl) labelEl.textContent = isTaken ? 'apartado' : 'disponible';

    // Show appropriate button
    if (adminMark) adminMark.style.display = isTaken ? 'none' : '';
    if (adminRelease) adminRelease.style.display = isTaken ? '' : 'none';

    // Wire admin action handlers (clone to remove old listeners)
    const selectedNum = sheetSelectedNumber;

    if (adminMark && !isTaken) {
      const newMark = adminMark.cloneNode(true) as HTMLElement;
      adminMark.parentNode?.replaceChild(newMark, adminMark);
      newMark.addEventListener('click', async () => {
        if (sheetAdminOnToggle) {
          await sheetAdminOnToggle(selectedNum);
          if (sheetAdminOnBuyerForm) sheetAdminOnBuyerForm(selectedNum);
        }
        closeNumberSheet();
      });
    }

    if (adminRelease && isTaken) {
      const newRelease = adminRelease.cloneNode(true) as HTMLElement;
      adminRelease.parentNode?.replaceChild(newRelease, adminRelease);
      newRelease.addEventListener('click', async () => {
        if (sheetAdminOnToggle) {
          await sheetAdminOnToggle(selectedNum);
        }
        closeNumberSheet();
      });
    }
  } else {
    // Public mode: show WhatsApp CTA, hide admin buttons
    if (adminActions) adminActions.style.display = 'none';
    if (confirmLink) confirmLink.style.display = '';
    if (labelEl) labelEl.textContent = 'disponible';

    if (!isTaken) {
      footer?.classList.add('active');

      const msg = encodeURIComponent(
        `Hola quiero ganarme el premio y quiero jugar con el número ${label}`,
      );
      const waUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${msg}`;
      confirmLink?.setAttribute('href', waUrl);

      // Confetti + delayed WhatsApp open
      confirmLink?.addEventListener('click', (e) => {
        e.preventDefault();
        fireSheetConfetti();
        setTimeout(() => {
          window.open(waUrl, '_blank', 'noopener');
          closeNumberSheet();
        }, 1500);
      }, { once: true });
    } else {
      footer?.classList.remove('active');
    }
  }
}

/* ─── Magic Lucky Animation ─── */
function runMagicLuckyAnimation(): void {
  if (magicAnimationRunning) return;

  // Collect available numbers
  const available: number[] = [];
  for (let i = 0; i < sheetTotalTickets; i++) {
    if (!sheetTakenNumbers.has(i)) available.push(i);
  }
  if (available.length === 0) return;

  magicAnimationRunning = true;
  const magicBtn = document.getElementById('magicLuckyBtn') as HTMLButtonElement;
  if (magicBtn) magicBtn.disabled = true;

  // Pick the winner up front
  const winnerNum = available[Math.floor(Math.random() * available.length)];

  // Build 40-step sequence: 30 fast + 10 decelerating
  const totalSteps = 40;
  const fastSteps = 30;
  let prevCell: HTMLElement | null = null;

  let step = 0;
  function tick(): void {
    // Clear previous highlight
    if (prevCell) prevCell.classList.remove('sheet-cell-cycling');

    if (step >= totalSteps) {
      finishMagicAnimation(winnerNum);
      return;
    }

    // Pick which number to highlight this step
    let num: number;
    if (step < totalSteps - 1) {
      // Random available number
      num = available[Math.floor(Math.random() * available.length)];
    } else {
      // Final step: land on winner
      num = winnerNum;
    }

    const cell = document.querySelector(`.sheet-cell[data-num="${num}"]`) as HTMLElement;
    if (cell) {
      cell.classList.add('sheet-cell-cycling');
      // Auto-scroll grid to follow the cycling cell
      cell.scrollIntoView({ block: 'nearest', behavior: 'auto' });
      prevCell = cell;
    }

    // Calculate delay: fast for first 30, decelerating for last 10
    let delay: number;
    if (step < fastSteps) {
      delay = 60;
    } else {
      const decelStep = step - fastSteps;
      const t = decelStep / (totalSteps - fastSteps - 1); // 0..1
      delay = 80 + (250 - 80) * t * t; // quadratic easing
    }

    step++;
    setTimeout(tick, delay);
  }

  tick();
}

function finishMagicAnimation(winnerNum: number): void {
  sheetSelectedNumber = winnerNum;
  updateSheetCellHighlights();
  updateSheetFooter();

  // Add burst effect on the winning cell
  const winnerCell = document.querySelector(`.sheet-cell[data-num="${winnerNum}"]`) as HTMLElement;
  if (winnerCell) {
    winnerCell.classList.add('sheet-cell-burst');
    // Smooth-scroll winner into center view
    winnerCell.scrollIntoView({ block: 'center', behavior: 'smooth' });
    // Clean up burst class after animation
    setTimeout(() => winnerCell.classList.remove('sheet-cell-burst'), 700);
  }

  // Check if winner got taken during animation (Firebase race condition)
  if (sheetTakenNumbers.has(winnerNum)) {
    sheetSelectedNumber = null;
    updateSheetCellHighlights();
    updateSheetFooter();
  }

  // Re-enable button
  magicAnimationRunning = false;
  const magicBtn = document.getElementById('magicLuckyBtn') as HTMLButtonElement;
  if (magicBtn) magicBtn.disabled = false;
}

/* ─── Sheet Confetti ─── */
function fireSheetConfetti(): void {
  const container = document.getElementById('sheetConfettiContainer');
  if (!container) return;

  const colors = ['#ffd700', '#22c55e', '#3b82f6', '#ef4444', '#a855f7', '#f97316', '#ec4899'];
  const pieceCount = 40;

  for (let i = 0; i < pieceCount; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';

    const isCircle = Math.random() > 0.5;
    const size = 6 + Math.random() * 8;

    piece.style.setProperty('--cw', `${isCircle ? size : size * 0.6}px`);
    piece.style.setProperty('--ch', `${size}px`);
    piece.style.setProperty('--cr', isCircle ? '50%' : '2px');
    piece.style.setProperty('--cc', colors[Math.floor(Math.random() * colors.length)]);
    piece.style.setProperty('--cx', `${20 + Math.random() * 60}%`);
    piece.style.setProperty('--cy', '40px');
    piece.style.setProperty('--cdx', `${(Math.random() - 0.5) * 200}px`);
    piece.style.setProperty('--cdy', `${-200 - Math.random() * 300}px`);
    piece.style.setProperty('--crot', `${360 + Math.random() * 720}deg`);
    piece.style.setProperty('--cd', `${1.2 + Math.random() * 1}s`);
    piece.style.setProperty('--cdelay', `${Math.random() * 0.3}s`);

    container.appendChild(piece);
  }

  // Self-clean after 2.2s
  setTimeout(() => { container.innerHTML = ''; }, 2200);
}

function filterSheetNumbers(query: string): void {
  const cells = document.querySelectorAll('.sheet-cell') as NodeListOf<HTMLElement>;
  const q = query.trim();

  cells.forEach(cell => {
    const label = cell.textContent || '';
    if (!q || label.includes(q)) {
      cell.style.display = '';
    } else {
      cell.style.display = 'none';
    }
  });
}

/* ─── Draw Date Update ─── */
export function updateDrawDate(isoDate: string): void {
  const el = document.getElementById('drawDate');
  if (!el) return;
  const [year, month, day] = isoDate.split('-').map(Number);
  const date = new Date(year, month - 1, day);
  const formatted = date.toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  el.textContent = formatted;
}

/* ─── Dynamic Texts Update ─── */
export function updateDynamicTexts(totalTickets: number, ticketPrice: number): void {
  const ctaMain = document.getElementById('ctaMain');
  const scarcityTotal = document.getElementById('scarcityTotal');
  const stickyPrice = document.getElementById('stickyPrice');
  const paymentPrice = document.getElementById('paymentPrice');

  const formattedPrice = formatCOP(ticketPrice);

  if (ctaMain) ctaMain.textContent = `Son solo ${totalTickets} oportunidades.`;
  if (scarcityTotal) scarcityTotal.textContent = `disponibles de ${totalTickets}`;
  if (stickyPrice) stickyPrice.textContent = formattedPrice;
  if (paymentPrice) paymentPrice.textContent = formattedPrice;
}
