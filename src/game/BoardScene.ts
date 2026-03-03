import Phaser from 'phaser';

/** Event types emitted by the board */
export const BOARD_EVENTS = {
  NUMBER_CLICKED: 'number-clicked',
} as const;

interface CellObjects {
  bg: Phaser.GameObjects.Graphics;
  text: Phaser.GameObjects.Text;
  overlay: Phaser.GameObjects.Graphics;
  container: Phaser.GameObjects.Container;
  taken: boolean;
  num: number;
}

export class BoardScene extends Phaser.Scene {
  private cells: Map<number, CellObjects> = new Map();
  private takenNumbers: Set<number> = new Set();
  private isAdmin = false;

  // Layout
  private COLS = 10;
  private ROWS = 10;
  private TOTAL_TICKETS = 100;
  private readonly MARGIN_TOP = 30;
  private readonly MARGIN_BOTTOM = 20;
  private readonly MARGIN_SIDE = 28;
  private readonly CELL_GAP = 6;

  private bgEmitter?: Phaser.GameObjects.Particles.ParticleEmitter;
  private frameGraphic?: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'BoardScene' });
  }

  create(): void {
    const { width, height } = this.scale;

    this.createTextures();
    this.drawBackground(width, height);
    this.createBackgroundParticles(width, height);
    this.buildGrid(width, height);
    this.animateEntrance();
  }

  /* ─── Texture Generation ─── */
  private createTextures(): void {
    // Soft glow circle
    if (!this.textures.exists('particle')) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(8, 8, 8);
      // Add a softer outer ring
      gfx.fillStyle(0xffffff, 0.3);
      gfx.fillCircle(8, 8, 12);
      gfx.generateTexture('particle', 24, 24);
      gfx.destroy();
    }

    // Gold star
    if (!this.textures.exists('star')) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0xffd700, 1);
      this.drawStar(gfx, 10, 10, 5, 10, 5);
      gfx.generateTexture('star', 20, 20);
      gfx.destroy();
    }

    // Confetti piece
    if (!this.textures.exists('confetti')) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0xffffff, 1);
      gfx.fillRect(0, 0, 8, 4);
      gfx.generateTexture('confetti', 8, 4);
      gfx.destroy();
    }

    // Soft glow for cells
    if (!this.textures.exists('glow')) {
      const gfx = this.add.graphics();
      gfx.fillStyle(0xffffff, 0.15);
      gfx.fillCircle(20, 20, 20);
      gfx.fillStyle(0xffffff, 0.08);
      gfx.fillCircle(20, 20, 30);
      gfx.generateTexture('glow', 60, 60);
      gfx.destroy();
    }
  }

  private drawStar(
    gfx: Phaser.GameObjects.Graphics,
    cx: number, cy: number,
    points: number, outerR: number, innerR: number,
  ): void {
    const path: { x: number; y: number }[] = [];
    for (let i = 0; i < points * 2; i++) {
      const r = i % 2 === 0 ? outerR : innerR;
      const angle = (Math.PI / points) * i - Math.PI / 2;
      path.push({ x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) });
    }
    gfx.beginPath();
    gfx.moveTo(path[0].x, path[0].y);
    for (let i = 1; i < path.length; i++) gfx.lineTo(path[i].x, path[i].y);
    gfx.closePath();
    gfx.fillPath();
  }

  /* ─── Background ─── */
  private drawBackground(w: number, h: number): void {
    const bg = this.add.graphics();

    // Rich deep blue gradient (darker, more contrast)
    const steps = 30;
    for (let i = 0; i < steps; i++) {
      const t = i / steps;
      const r = Math.round(Phaser.Math.Linear(0x08, 0x10, t));
      const g = Math.round(Phaser.Math.Linear(0x12, 0x22, t));
      const b = Math.round(Phaser.Math.Linear(0x25, 0x3a, t));
      const color = (r << 16) | (g << 8) | b;
      bg.fillStyle(color, 1);
      bg.fillRect(0, (h / steps) * i, w, h / steps + 1);
    }

    // Subtle radial vignette from center
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.max(w, h) * 0.6;
    for (let i = 10; i > 0; i--) {
      const radius = maxR * (i / 10);
      const alpha = 0.02 * (10 - i);
      bg.fillStyle(0x1a3a5c, alpha);
      bg.fillCircle(cx, cy, radius);
    }

    // Subtle gold ambient glow at top
    bg.fillStyle(0xffd700, 0.015);
    bg.fillCircle(cx, 0, w * 0.5);
  }

  /* ─── Background Particles ─── */
  private createBackgroundParticles(w: number, h: number): void {
    this.bgEmitter = this.add.particles(0, 0, 'particle', {
      x: { min: 0, max: w },
      y: { min: 0, max: h },
      scale: { start: 0.1, end: 0 },
      alpha: { start: 0.4, end: 0 },
      speed: { min: 3, max: 15 },
      angle: { min: 250, max: 290 },
      lifespan: { min: 4000, max: 8000 },
      frequency: 400,
      blendMode: Phaser.BlendModes.ADD,
      tint: [0xffd700, 0xffffff, 0x6db3f2, 0xffd700, 0xffffff],
    });
    this.bgEmitter.setDepth(0);
  }

  /* ─── Grid ─── */
  private buildGrid(sceneW: number, sceneH: number): void {
    const boardW = sceneW - this.MARGIN_SIDE * 2;
    const boardH = sceneH - this.MARGIN_TOP - this.MARGIN_BOTTOM;
    const cellW = (boardW - this.CELL_GAP * (this.COLS - 1)) / this.COLS;
    const cellH = (boardH - this.CELL_GAP * (this.ROWS - 1)) / this.ROWS;

    // Draw board background frame
    const frame = this.add.graphics();
    frame.fillStyle(0x0a1520, 0.5);
    frame.fillRoundedRect(
      this.MARGIN_SIDE - 10,
      this.MARGIN_TOP - 10,
      boardW + 20,
      boardH + 20,
      14,
    );
    // Gold border on the frame
    frame.lineStyle(1, 0xffd700, 0.12);
    frame.strokeRoundedRect(
      this.MARGIN_SIDE - 10,
      this.MARGIN_TOP - 10,
      boardW + 20,
      boardH + 20,
      14,
    );
    frame.setDepth(0.5);
    this.frameGraphic = frame;

    for (let row = 0; row < this.ROWS; row++) {
      for (let col = 0; col < this.COLS; col++) {
        const num = row * this.COLS + col;
        if (num >= this.TOTAL_TICKETS) continue;
        const x = this.MARGIN_SIDE + col * (cellW + this.CELL_GAP);
        const y = this.MARGIN_TOP + row * (cellH + this.CELL_GAP);
        this.createCell(num, x, y, cellW, cellH);
      }
    }
  }

  private createCell(num: number, x: number, y: number, w: number, h: number): void {
    const isTaken = this.takenNumbers.has(num);
    const container = this.add.container(x + w / 2, y + h / 2);
    container.setSize(w, h);
    container.setDepth(1);

    // Cell background
    const bg = this.add.graphics();
    this.drawCellBg(bg, w, h, isTaken);

    // Number text
    const label = num.toString().padStart(2, '0');
    const fontSize = Math.max(14, Math.min(w * 0.38, 26));
    const text = this.add.text(0, 0, label, {
      fontFamily: "'Righteous', 'Montserrat', sans-serif",
      fontSize: `${fontSize}px`,
      color: '#ffffff',
      align: 'center',
      fontStyle: 'bold',
    });
    text.setOrigin(0.5, 0.5);
    text.setShadow(0, 1, 'rgba(0,0,0,0.4)', 2);

    // Overlay for taken state (golden ring)
    const overlay = this.add.graphics();
    if (isTaken) {
      this.drawTakenOverlay(overlay, w, h);
      text.setColor('#fff8dc');
    }

    container.add([bg, overlay, text]);

    // Interactive
    container.setInteractive(
      new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
      Phaser.Geom.Rectangle.Contains,
    );

    // Hover
    container.on('pointerover', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1.12,
        scaleY: 1.12,
        duration: 180,
        ease: 'Back.easeOut',
      });
      const cell = this.cells.get(num);
      if (cell) {
        bg.clear();
        this.drawCellBg(bg, w, h, cell.taken, true);
      }
    });

    container.on('pointerout', () => {
      this.tweens.add({
        targets: container,
        scaleX: 1,
        scaleY: 1,
        duration: 180,
        ease: 'Sine.easeOut',
      });
      const cell = this.cells.get(num);
      if (cell) {
        bg.clear();
        this.drawCellBg(bg, w, h, cell.taken, false);
      }
    });

    // Click
    container.on('pointerdown', () => {
      this.tweens.add({
        targets: container,
        scaleX: 0.9,
        scaleY: 0.9,
        duration: 80,
        yoyo: true,
        ease: 'Sine.easeInOut',
      });
      this.events.emit(BOARD_EVENTS.NUMBER_CLICKED, num);
    });

    this.cells.set(num, { bg, text, overlay, container, taken: isTaken, num });
  }

  private drawCellBg(
    gfx: Phaser.GameObjects.Graphics,
    w: number, h: number,
    taken: boolean, hover = false,
  ): void {
    const hw = w / 2;
    const hh = h / 2;
    const r = 8;

    if (taken) {
      // Rich golden cell with layered depth
      gfx.fillStyle(0xb8860b, 1);
      gfx.fillRoundedRect(-hw, -hh, w, h, r);
      // Brighter inner area
      gfx.fillStyle(0xd4a017, 0.7);
      gfx.fillRoundedRect(-hw + 2, -hh + 2, w - 4, h - 4, r - 1);
      // Top highlight (gives 3D look)
      gfx.fillStyle(0xffd700, 0.25);
      gfx.fillRoundedRect(-hw + 2, -hh + 2, w - 4, (h - 4) * 0.4, { tl: r - 1, tr: r - 1, bl: 0, br: 0 });
      // Outer glow border
      gfx.lineStyle(1.5, 0xffd700, hover ? 0.7 : 0.4);
      gfx.strokeRoundedRect(-hw, -hh, w, h, r);
    } else {
      // Blue cell with modern depth
      const baseColor = hover ? 0x1e6090 : 0x162e4a;
      const borderColor = hover ? 0x4aa3df : 0x2a5070;
      const borderAlpha = hover ? 0.6 : 0.3;

      gfx.fillStyle(baseColor, 1);
      gfx.fillRoundedRect(-hw, -hh, w, h, r);
      // Top highlight strip (subtle 3D)
      gfx.fillStyle(0xffffff, hover ? 0.08 : 0.04);
      gfx.fillRoundedRect(-hw + 1, -hh + 1, w - 2, (h - 2) * 0.35, { tl: r - 1, tr: r - 1, bl: 0, br: 0 });
      // Border
      gfx.lineStyle(1, borderColor, borderAlpha);
      gfx.strokeRoundedRect(-hw, -hh, w, h, r);

      if (hover) {
        // Extra glow on hover
        gfx.lineStyle(1, 0x6db3f2, 0.15);
        gfx.strokeRoundedRect(-hw - 1, -hh - 1, w + 2, h + 2, r + 1);
      }
    }
  }

  private drawTakenOverlay(gfx: Phaser.GameObjects.Graphics, _w: number, _h: number): void {
    // No extra overlay needed — the golden cell bg already stands out
    // Just add a subtle inner glow ring
    const radius = Math.min(_w, _h) * 0.38;
    gfx.lineStyle(2, 0xffd700, 0.5);
    gfx.strokeCircle(0, 0, radius);
    gfx.lineStyle(1, 0xffffff, 0.15);
    gfx.strokeCircle(0, 0, radius + 2);
  }

  /* ─── Entrance Animation ─── */
  private animateEntrance(): void {
    this.cells.forEach((cell, num) => {
      const row = Math.floor(num / this.COLS);
      const col = num % this.COLS;
      const delay = (row * this.COLS + col) * 20;

      cell.container.setScale(0);
      cell.container.setAlpha(0);

      this.tweens.add({
        targets: cell.container,
        scaleX: 1,
        scaleY: 1,
        alpha: 1,
        delay,
        duration: 400,
        ease: 'Back.easeOut',
      });
    });
  }

  /* ─── Public Methods ─── */

  updateTakenNumbers(taken: Set<number>): void {
    const prevTaken = this.takenNumbers;
    this.takenNumbers = taken;

    this.cells.forEach((cell, num) => {
      const wasTaken = prevTaken.has(num);
      const isTaken = taken.has(num);

      if (wasTaken !== isTaken) {
        cell.taken = isTaken;
        const { bg, overlay, container, text } = cell;
        const cellW = container.width;
        const cellH = container.height;

        bg.clear();
        this.drawCellBg(bg, cellW, cellH, isTaken);

        overlay.clear();
        if (isTaken) {
          this.drawTakenOverlay(overlay, cellW, cellH);
          text.setColor('#fff8dc');
          this.playTakenAnimation(container);
          this.burstParticles(container.x, container.y);
        } else {
          text.setColor('#ffffff');
          this.playUntakenAnimation(container);
        }
      }
    });
  }

  setAdmin(admin: boolean): void {
    this.isAdmin = admin;
    this.cells.forEach((cell) => {
      if (admin) {
        cell.container.setInteractive({ cursor: 'pointer' });
      }
    });
  }

  getEventEmitter(): Phaser.Events.EventEmitter {
    return this.events;
  }

  rebuildGrid(totalTickets: number, rows: number, cols: number): void {
    // Destroy all existing cells
    this.cells.forEach((c) => c.container.destroy(true));
    this.cells.clear();

    // Destroy the frame graphic
    if (this.frameGraphic) {
      this.frameGraphic.destroy();
      this.frameGraphic = undefined;
    }

    // Update dimensions
    this.TOTAL_TICKETS = totalTickets;
    this.ROWS = rows;
    this.COLS = cols;

    // Rebuild
    const { width, height } = this.scale;
    this.buildGrid(width, height);
    this.animateEntrance();
  }

  /* ─── Animations ─── */

  private playTakenAnimation(container: Phaser.GameObjects.Container): void {
    this.tweens.add({
      targets: container,
      scaleX: 1.25,
      scaleY: 1.25,
      duration: 250,
      yoyo: true,
      ease: 'Back.easeOut',
    });

    // Golden flash ring
    const flash = this.add.graphics();
    flash.fillStyle(0xffd700, 0.5);
    flash.fillCircle(0, 0, container.width * 0.7);
    container.add(flash);
    container.sendToBack(flash);

    this.tweens.add({
      targets: flash,
      alpha: 0,
      scaleX: 2,
      scaleY: 2,
      duration: 600,
      ease: 'Sine.easeOut',
      onComplete: () => flash.destroy(),
    });
  }

  private playUntakenAnimation(container: Phaser.GameObjects.Container): void {
    this.tweens.add({
      targets: container,
      scaleX: 0.85,
      scaleY: 0.85,
      duration: 150,
      yoyo: true,
      ease: 'Sine.easeInOut',
    });
  }

  private burstParticles(worldX: number, worldY: number): void {
    const emitter = this.add.particles(worldX, worldY, 'star', {
      speed: { min: 100, max: 250 },
      scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 },
      lifespan: 900,
      quantity: 14,
      blendMode: Phaser.BlendModes.ADD,
      tint: [0xffd700, 0xffa500, 0xffff00, 0xffffff],
      emitting: false,
    });
    emitter.setDepth(10);
    emitter.explode(14);

    const confetti = this.add.particles(worldX, worldY, 'confetti', {
      speed: { min: 60, max: 200 },
      angle: { min: 0, max: 360 },
      scale: { start: 0.8, end: 0.1 },
      alpha: { start: 1, end: 0 },
      lifespan: 1300,
      quantity: 10,
      rotate: { min: 0, max: 360 },
      tint: [0xffd700, 0xe74c3c, 0x3498db, 0x2ecc71, 0xffffff, 0xff69b4],
      emitting: false,
    });
    confetti.setDepth(10);
    confetti.explode(10);

    this.time.delayedCall(1500, () => {
      emitter.destroy();
      confetti.destroy();
    });
  }

  /* ─── Idle sparkle effect ─── */
  update(): void {
    if (Math.random() < 0.004) {
      const takenArray = Array.from(this.takenNumbers);
      if (takenArray.length > 0) {
        const randomNum = takenArray[Math.floor(Math.random() * takenArray.length)];
        const cell = this.cells.get(randomNum);
        if (cell) {
          const emitter = this.add.particles(cell.container.x, cell.container.y, 'particle', {
            speed: { min: 8, max: 30 },
            scale: { start: 0.15, end: 0 },
            alpha: { start: 0.7, end: 0 },
            lifespan: 700,
            quantity: 3,
            blendMode: Phaser.BlendModes.ADD,
            tint: 0xffd700,
            emitting: false,
          });
          emitter.setDepth(5);
          emitter.explode(3);
          this.time.delayedCall(900, () => emitter.destroy());
        }
      }
    }
  }
}
