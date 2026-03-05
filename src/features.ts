/* ============================================
   ENGAGEMENT FEATURES MODULE
   Live countdown, social proof, birthday picker,
   ROI display, milestones, testimonials, share card,
   how-it-works steps, number personality
   ============================================ */

const WHATSAPP_NUMBER = '573103323904';

/* ═══════════════════════════════════════════
   1. LIVE COUNTDOWN TIMER
   Dramatic real-time countdown to draw date
   ═══════════════════════════════════════════ */
let countdownInterval: ReturnType<typeof setInterval> | null = null;
let countdownTargetDate: Date = new Date('2026-06-02T18:00:00-05:00'); // Colombia time

export function setupCountdown(): void {
  updateCountdown();
  countdownInterval = setInterval(updateCountdown, 1000);
}

export function updateCountdownTarget(isoDate: string): void {
  const [y, m, d] = isoDate.split('-').map(Number);
  countdownTargetDate = new Date(y, m - 1, d, 18, 0, 0);
}

function updateCountdown(): void {
  const now = new Date().getTime();
  const target = countdownTargetDate.getTime();
  const diff = target - now;

  const days = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
  const hours = Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
  const minutes = Math.max(0, Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)));
  const seconds = Math.max(0, Math.floor((diff % (1000 * 60)) / 1000));

  setCountdownDigit('countDays', days);
  setCountdownDigit('countHours', hours);
  setCountdownDigit('countMinutes', minutes);
  setCountdownDigit('countSeconds', seconds);

  // Pulse effect on seconds
  const secEl = document.getElementById('countSeconds');
  if (secEl) {
    secEl.classList.remove('cd-pulse');
    void secEl.offsetWidth; // force reflow
    secEl.classList.add('cd-pulse');
  }
}

function setCountdownDigit(id: string, value: number): void {
  const el = document.getElementById(id);
  if (el) {
    const str = value.toString().padStart(2, '0');
    if (el.textContent !== str) {
      el.textContent = str;
      el.classList.add('cd-flip');
      setTimeout(() => el.classList.remove('cd-flip'), 300);
    }
  }
}

/* ═══════════════════════════════════════════
   2. SOCIAL PROOF TOAST NOTIFICATIONS
   Simulated "someone just bought" toasts
   ═══════════════════════════════════════════ */
const NAMES = [
  'María', 'Carlos', 'Andrea', 'Juan', 'Luisa', 'Diego', 'Paola', 'Andrés',
  'Camila', 'Sergio', 'Valentina', 'Felipe', 'Laura', 'Daniel', 'Natalia',
  'Alejandro', 'Daniela', 'Santiago', 'Marcela', 'Julián', 'Carolina', 'Óscar',
];

const CITIES = [
  'Bogotá', 'Medellín', 'Cali', 'Barranquilla', 'Bucaramanga',
  'Cartagena', 'Pereira', 'Manizales', 'Villavicencio', 'Ibagué',
];

let toastQueue: HTMLElement[] = [];
let toastInterval: ReturnType<typeof setInterval> | null = null;
let proofTakenNumbers: Set<number> = new Set();

export function setupSocialProof(): void {
  // Start showing toasts after 8 seconds, then every 15-30s
  setTimeout(() => {
    showRandomToast();
    toastInterval = setInterval(() => {
      showRandomToast();
    }, 15000 + Math.random() * 15000);
  }, 8000);
}

export function updateProofTakenNumbers(taken: Set<number>): void {
  proofTakenNumbers = taken;
}

function showRandomToast(): void {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  // Don't show if too many toasts
  if (toastQueue.length >= 2) return;

  const name = NAMES[Math.floor(Math.random() * NAMES.length)];
  const city = CITIES[Math.floor(Math.random() * CITIES.length)];

  // Pick a taken number to show (more realistic)
  let numLabel = Math.floor(Math.random() * 100).toString().padStart(2, '0');
  const takenArr = Array.from(proofTakenNumbers);
  if (takenArr.length > 0) {
    numLabel = takenArr[Math.floor(Math.random() * takenArr.length)].toString().padStart(2, '0');
  }

  const minutesAgo = Math.floor(1 + Math.random() * 45);

  const toast = document.createElement('div');
  toast.className = 'social-toast';
  toast.innerHTML = `
    <div class="toast-avatar">${name[0]}</div>
    <div class="toast-body">
      <strong>${name}</strong> de ${city}
      <span class="toast-action">apartó el <span class="toast-number">#${numLabel}</span></span>
      <span class="toast-time">hace ${minutesAgo} min</span>
    </div>
  `;

  container.appendChild(toast);
  toastQueue.push(toast);

  // Animate in
  requestAnimationFrame(() => toast.classList.add('toast-visible'));

  // Auto dismiss
  setTimeout(() => {
    toast.classList.remove('toast-visible');
    toast.classList.add('toast-exit');
    setTimeout(() => {
      toast.remove();
      toastQueue = toastQueue.filter(t => t !== toast);
    }, 400);
  }, 5000);
}

/* ═══════════════════════════════════════════
   3. BIRTHDAY LUCKY NUMBER
   Numerology-style number from birthday
   ═══════════════════════════════════════════ */
export function setupBirthdayPicker(totalTickets: number, takenNumbers: Set<number>): void {
  const btn = document.getElementById('birthdayRevealBtn');
  const input = document.getElementById('birthdayInput') as HTMLInputElement;
  const resultEl = document.getElementById('birthdayResult');

  btn?.addEventListener('click', () => {
    if (!input?.value) {
      input?.focus();
      input?.classList.add('shake');
      setTimeout(() => input?.classList.remove('shake'), 500);
      return;
    }

    const date = new Date(input.value);
    const luckyNum = calculateBirthdayNumber(date, totalTickets, takenNumbers);
    showBirthdayResult(luckyNum, resultEl);
  });
}

function calculateBirthdayNumber(date: Date, total: number, taken: Set<number>): number {
  const day = date.getDate();
  const month = date.getMonth() + 1;
  const year = date.getFullYear();

  // Numerology: sum all digits repeatedly until < total
  let sum = (day + month + year) % total;
  // If that number is taken, find the nearest available
  if (taken.has(sum)) {
    for (let offset = 1; offset < total; offset++) {
      if (!taken.has((sum + offset) % total)) { sum = (sum + offset) % total; break; }
      if (!taken.has((sum - offset + total) % total)) { sum = (sum - offset + total) % total; break; }
    }
  }
  return sum;
}

function showBirthdayResult(num: number, container: HTMLElement | null): void {
  if (!container) return;
  const label = num.toString().padStart(2, '0');
  container.innerHTML = `
    <div class="birthday-reveal">
      <div class="birthday-stars">&#10024;</div>
      <div class="birthday-num">${label}</div>
      <div class="birthday-msg">Tu número del destino</div>
      <a href="https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(`Hola quiero ganarme el premio y quiero jugar con el número ${label}`)}"
         target="_blank" rel="noopener" class="birthday-cta">
        Apartar #${label} por WhatsApp
      </a>
    </div>
  `;
  container.classList.add('birthday-result-visible');
}

/* ═══════════════════════════════════════════
   4. ROI MULTIPLIER DISPLAY
   Animated "40x your investment" visual
   ═══════════════════════════════════════════ */
export function updateROIDisplay(prizeAmount: number, ticketPrice: number): void {
  const multiplier = Math.floor(prizeAmount / ticketPrice);
  const el = document.getElementById('roiMultiplier');
  if (el) el.textContent = `${multiplier}x`;

  const barEl = document.getElementById('roiBar');
  if (barEl) {
    // Animate width to represent the multiplier visually
    const pct = Math.min(100, (multiplier / 50) * 100);
    setTimeout(() => { barEl.style.width = `${pct}%`; }, 500);
  }
}

/* ═══════════════════════════════════════════
   5. MILESTONE CELEBRATIONS
   Celebrate when 25%, 50%, 75%, 90% sold
   ═══════════════════════════════════════════ */
const MILESTONE_THRESHOLDS = [25, 50, 75, 90];
let reachedMilestones: Set<number> = new Set();

export function checkMilestones(takenCount: number, total: number): void {
  const pct = Math.round((takenCount / total) * 100);

  for (const threshold of MILESTONE_THRESHOLDS) {
    if (pct >= threshold && !reachedMilestones.has(threshold)) {
      reachedMilestones.add(threshold);
      showMilestoneCelebration(threshold, total - takenCount);
    }
  }
}

function showMilestoneCelebration(pct: number, remaining: number): void {
  const container = document.getElementById('milestoneContainer');
  if (!container) return;

  const messages: Record<number, string> = {
    25: `Ya se vendió el 25%`,
    50: `¡Mitad vendida!`,
    75: `¡75% vendido! Quedan ${remaining}`,
    90: `¡CASI AGOTADO! Solo ${remaining}`,
  };

  const emojis: Record<number, string> = {
    25: '🎉', 50: '🔥', 75: '⚡', 90: '🚨',
  };

  const banner = document.createElement('div');
  banner.className = `milestone-banner milestone-${pct}`;
  banner.innerHTML = `
    <span class="milestone-emoji">${emojis[pct]}</span>
    <span class="milestone-text">${messages[pct]}</span>
    <span class="milestone-emoji">${emojis[pct]}</span>
  `;

  container.appendChild(banner);
  requestAnimationFrame(() => banner.classList.add('milestone-visible'));

  // Dismiss after 5s
  setTimeout(() => {
    banner.classList.remove('milestone-visible');
    banner.classList.add('milestone-exit');
    setTimeout(() => banner.remove(), 500);
  }, 5000);
}

/* ═══════════════════════════════════════════
   6. TESTIMONIALS CAROUSEL
   Auto-rotating social proof quotes
   ═══════════════════════════════════════════ */
const TESTIMONIALS = [
  { name: 'María P.', city: 'Bogotá', text: 'Aparté mi número en 2 minutos, ¡súper fácil! Ahora solo queda esperar el sorteo.' },
  { name: 'Carlos R.', city: 'Medellín', text: 'Me encantó la onda del número de la suerte. Mi fecha de nacimiento me dio el 42.' },
  { name: 'Luisa M.', city: 'Cali', text: 'Solo $20.000 para ganar $800.000, vale totalmente la pena. Ya les dije a mis amigos.' },
  { name: 'Andrés G.', city: 'Barranquilla', text: 'Sonia es muy cumplida, ya participé en la rifa anterior. 100% confiable.' },
  { name: 'Valentina S.', city: 'Bucaramanga', text: 'El mejor regalo que le puedo dar a mi mamá: una oportunidad de ganar.' },
];

let testimonialIndex = 0;
let testimonialTimer: ReturnType<typeof setInterval> | null = null;

export function setupTestimonials(): void {
  renderTestimonial(0);
  testimonialTimer = setInterval(() => {
    testimonialIndex = (testimonialIndex + 1) % TESTIMONIALS.length;
    renderTestimonial(testimonialIndex);
  }, 6000);

  // Navigation dots
  const dotsContainer = document.getElementById('testimonialDots');
  if (dotsContainer) {
    TESTIMONIALS.forEach((_, i) => {
      const dot = document.createElement('button');
      dot.className = `testimonial-dot ${i === 0 ? 'active' : ''}`;
      dot.addEventListener('click', () => {
        testimonialIndex = i;
        renderTestimonial(i);
        // Reset auto-advance timer
        if (testimonialTimer) clearInterval(testimonialTimer);
        testimonialTimer = setInterval(() => {
          testimonialIndex = (testimonialIndex + 1) % TESTIMONIALS.length;
          renderTestimonial(testimonialIndex);
        }, 6000);
      });
      dotsContainer.appendChild(dot);
    });
  }
}

function renderTestimonial(index: number): void {
  const t = TESTIMONIALS[index];
  const textEl = document.getElementById('testimonialText');
  const authorEl = document.getElementById('testimonialAuthor');

  if (textEl) {
    textEl.classList.remove('testimonial-fade-in');
    void textEl.offsetWidth;
    textEl.textContent = `"${t.text}"`;
    textEl.classList.add('testimonial-fade-in');
  }

  if (authorEl) {
    authorEl.textContent = `— ${t.name}, ${t.city}`;
  }

  // Update dots
  document.querySelectorAll('.testimonial-dot').forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });
}

/* ═══════════════════════════════════════════
   7. SHARE YOUR NUMBER CARD
   Generates a shareable card for social media
   ═══════════════════════════════════════════ */
export function setupShareCard(): void {
  // Share button appears in sticky CTA and bottom sheet
  document.addEventListener('click', (e) => {
    const target = e.target as HTMLElement;
    if (target.closest('.share-btn')) {
      const numEl = target.closest('[data-share-num]') as HTMLElement;
      if (numEl) {
        const num = parseInt(numEl.dataset.shareNum || '0', 10);
        showShareModal(num);
      }
    }
  });
}

function showShareModal(num: number): void {
  const modal = document.getElementById('shareModal');
  const card = document.getElementById('shareCard');
  if (!modal || !card) return;

  const label = num.toString().padStart(2, '0');

  card.innerHTML = `
    <div class="share-card-inner">
      <div class="share-card-glow"></div>
      <div class="share-card-brand">SUPER GRAN RIFA</div>
      <div class="share-card-number">#${label}</div>
      <div class="share-card-message">¡Este es mi número de la suerte!</div>
      <div class="share-card-prize">Premio: $800.000</div>
      <div class="share-card-url">super-gran-rifa.netlify.app</div>
    </div>
  `;

  // Share buttons
  const shareWA = document.getElementById('shareWhatsApp');
  const shareCopy = document.getElementById('shareCopyLink');
  const shareX = document.getElementById('shareTwitter');

  const url = 'https://super-gran-rifa.netlify.app';
  const text = `¡Aparté el número #${label} en la Super Gran Rifa! 🎰 Premio de $800.000. ¿Te animas? 👉`;

  if (shareWA) {
    shareWA.onclick = () => {
      window.open(`https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`, '_blank');
    };
  }

  if (shareX) {
    shareX.onclick = () => {
      window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(url)}`, '_blank');
    };
  }

  if (shareCopy) {
    shareCopy.onclick = () => {
      navigator.clipboard.writeText(`${text} ${url}`).then(() => {
        shareCopy.textContent = '¡Copiado!';
        setTimeout(() => { shareCopy.textContent = 'Copiar enlace'; }, 2000);
      });
    };
  }

  modal.classList.remove('hidden');
}

export function setupShareModalClose(): void {
  const modal = document.getElementById('shareModal');
  const closeBtn = document.getElementById('shareModalClose');
  closeBtn?.addEventListener('click', () => modal?.classList.add('hidden'));
  modal?.querySelector('.modal-backdrop')?.addEventListener('click', () => modal?.classList.add('hidden'));
}

/* ═══════════════════════════════════════════
   8. HOW IT WORKS - STEPS
   Clear 3-step process for new users
   ═══════════════════════════════════════════ */
export function setupHowItWorks(): void {
  // Intersection observer for step animation
  const steps = document.querySelectorAll('.step-card');
  if (!steps.length) return;

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('step-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.3 });

  steps.forEach(step => observer.observe(step));
}

/* ═══════════════════════════════════════════
   9. NUMBER PERSONALITY QUIZ
   Fun quiz that assigns a "personality" to
   your chosen number
   ═══════════════════════════════════════════ */
const PERSONALITIES: Record<string, { emoji: string; title: string; desc: string }> = {
  fire: { emoji: '🔥', title: 'Número de Fuego', desc: 'Energía pura. Los que eligen este número son líderes natos y atraen la suerte.' },
  water: { emoji: '🌊', title: 'Número de Agua', desc: 'Fluyes con la corriente. Este número trae calma y fortuna inesperada.' },
  earth: { emoji: '🌿', title: 'Número de Tierra', desc: 'Estable y poderoso. La prosperidad viene paso a paso con este número.' },
  star: { emoji: '⭐', title: 'Número Estelar', desc: 'Brillante y especial. Este número está alineado con las estrellas.' },
  thunder: { emoji: '⚡', title: 'Número del Trueno', desc: '¡Impactante! Este número llega con fuerza para cambiar tu vida.' },
};

export function getNumberPersonality(num: number): { emoji: string; title: string; desc: string } {
  const keys = Object.keys(PERSONALITIES);
  const index = num % keys.length;
  return PERSONALITIES[keys[index]];
}

/* ═══════════════════════════════════════════
   10. URGENCY PULSE ANIMATION
   Makes available numbers near taken ones "glow"
   to create psychological proximity urgency
   ═══════════════════════════════════════════ */
export function getHotNumbers(taken: Set<number>, total: number): Set<number> {
  const hot = new Set<number>();
  taken.forEach(t => {
    // Numbers adjacent to taken ones are "hot"
    if (t > 0 && !taken.has(t - 1)) hot.add(t - 1);
    if (t < total - 1 && !taken.has(t + 1)) hot.add(t + 1);
    if (t >= 10 && !taken.has(t - 10)) hot.add(t - 10);
    if (t < total - 10 && !taken.has(t + 10)) hot.add(t + 10);
  });
  return hot;
}

/* ═══════════════════════════════════════════
   11. FLOATING LIVE STATS
   Real-time stats strip: viewers, last purchase, etc.
   ═══════════════════════════════════════════ */
let liveViewers = 0;

export function setupLiveStats(): void {
  // Simulate live viewers (between 3-12)
  liveViewers = 3 + Math.floor(Math.random() * 10);
  updateLiveViewers();

  setInterval(() => {
    // Fluctuate viewers slightly
    const delta = Math.random() > 0.5 ? 1 : -1;
    liveViewers = Math.max(2, Math.min(18, liveViewers + delta));
    updateLiveViewers();
  }, 8000 + Math.random() * 7000);
}

function updateLiveViewers(): void {
  const el = document.getElementById('liveViewers');
  if (el) el.textContent = liveViewers.toString();
}
