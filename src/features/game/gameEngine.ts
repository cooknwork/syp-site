// SYP Run — the phone slides away and the character runs through the city.
// Canvas 2D in low resolution (pixel size 3–4), fixed physics step, endless parallax skyline.

import { LOGO_H, LOGO_PATH, LOGO_W } from '@/components/logo';
import { hex2, mix } from '@/lib/color';

export type GameState = 'menu' | 'run' | 'paused' | 'over';

export interface GameCallbacks {
  onState: (state: GameState, info: { score: number; best: number; isRecord: boolean }) => void;
  onScore: (score: number, best: number) => void;
}

const HI_KEY = 'syp-hi';

// Original SYP character: a little steaming bowl of soup.
const SPRITE = {
  body: ['rrrrrrrrrrrr', 'bbbbbbbbbbbb', 'bbbddbbddbbb', 'bbbddbbddbbb', '.bbbbbbbbbb.', '.bbbbddbbbb.', '..bbbbbbbb..', '...bbbbbb...'],
  dead: ['rrrrrrrrrrrr', 'bbbbbbbbbbbb', 'bbdbdbbdbdbb', 'bbbdbbbbdbbb', '.bbbbbbbbbb.', '.bbbddddbbb.', '..bbbbbbbb..', '...bbbbbb...'],
  legs: {
    run1: ['...l....l...', '..l......l..'],
    run2: ['....l..l....', '....l..l....'],
    idle: ['...l....l...', '...l....l...'],
    jump: ['..l......l..', '.l........l.'],
    land: ['..ll....ll..', '............'],
  },
};

interface Building { x: number; w: number; h: number; wins: [number, number, number][]; sign: { x: number; y: number; len: number; c: number } | null; logo: boolean; gap: number }
interface Layer { f: number; off: number; items: Building[] }
interface Obstacle { k: 'car' | 'bar' | 'spk'; w: number; h: number; x: number; v: number }

export class GameEngine {
  private g: CanvasRenderingContext2D;
  private logo = new Path2D(LOGO_PATH);
  private t: string[] = [];
  private W = 0; private H = 0; private P = 4; private ground = 0; private horizon = 0; private base = 80;
  private layers: Layer[] = [];
  private state: GameState = 'menu';
  private p = { x: 0, y: 0, vy: 0, onGround: true };
  private obs: Obstacle[] = [];
  private speed = 0; private dist = 0; private nextGap = 0;
  private raf = 0; private last = 0; private acc = 0; private hold = false; private time = 0; private landT = -1; private overAt = 0;
  private best = 0;
  private active = false;
  private readonly reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private cv: HTMLCanvasElement, private cb: GameCallbacks) {
    this.g = cv.getContext('2d')!;
    try { this.best = Number(localStorage.getItem(HI_KEY)) || 0; } catch { /* storage unavailable */ }
  }

  get score() { return Math.floor(this.dist / 10); }

  setTheme(tokens: string[]) { this.t = tokens; if (this.active) this.draw(); }

  enter() {
    if (this.active) return;
    this.active = true;
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onUp);
    window.addEventListener('pointerup', this.onUp);
    window.addEventListener('resize', this.onResize);
    document.addEventListener('visibilitychange', this.onVisibility);
    this.cv.addEventListener('pointerdown', this.onPointerDown);
    this.setup();
    this.setState('menu');
    this.draw();
  }

  exit() {
    if (!this.active) return;
    this.active = false;
    cancelAnimationFrame(this.raf);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onUp);
    window.removeEventListener('pointerup', this.onUp);
    window.removeEventListener('resize', this.onResize);
    document.removeEventListener('visibilitychange', this.onVisibility);
    this.cv.removeEventListener('pointerdown', this.onPointerDown);
  }

  start() {
    this.reset();
    this.setState('run');
    this.loopFrom(performance.now());
  }

  resume() {
    if (this.state !== 'paused') return;
    this.setState('run');
    this.loopFrom(performance.now());
  }

  // ---------- world ----------
  private setup() {
    const vw = window.innerWidth, vh = window.innerHeight;
    this.P = vw < 768 ? 3 : 4;
    this.W = Math.ceil(vw / this.P); this.H = Math.ceil(vh / this.P);
    this.cv.width = this.W; this.cv.height = this.H;
    this.cv.style.width = `${this.W * this.P}px`; this.cv.style.height = `${this.H * this.P}px`;
    this.ground = Math.round(this.H * (vw < 768 ? 0.8 : 0.84));
    this.horizon = this.ground - 7;
    this.base = Math.max(62, Math.min(110, this.W * 0.3));
    this.layers = [{ f: 0.18, off: 0, items: [] }, { f: 0.5, off: 0, items: [] }];
    this.layers.forEach((l) => this.fill(l));
    this.reset();
  }

  private reset() {
    this.p = { x: Math.round(Math.max(18, this.W * 0.16)), y: this.ground, vy: 0, onGround: true };
    this.obs = []; this.speed = this.base; this.dist = 0; this.nextGap = this.W * 0.7; this.time = 0; this.landT = -1;
  }

  private building(layer: Layer, x: number): Building {
    const R = Math.random, far = layer.f < 0.3;
    const w = (far ? 6 : 10) + Math.floor(R() * (far ? 12 : 16));
    const h = Math.round(this.H * (far ? 0.2 + R() * 0.26 : 0.1 + R() * 0.26));
    const b: Building = { x, w, h, wins: [], sign: null, logo: false, gap: !far && R() < 0.3 ? 4 + Math.floor(R() * 10) : 0 };
    if (!far) {
      for (let wy = 4; wy < h - 3; wy += 3) for (let wx = 2; wx < w - 2; wx += 2) if (R() < 0.17) b.wins.push([wx, wy, R() < 0.3 ? 6 : R() < 0.5 ? 4 : 5]);
      if (R() < 0.25) b.sign = { x: R() < 0.5 ? 1 : w - 2, y: 4 + Math.floor(R() * 6), len: 5 + Math.floor(R() * 8), c: R() < 0.5 ? 7 : 8 };
      if (R() < 0.07 && w >= 16) b.logo = true;
    }
    return b;
  }

  private fill(l: Layer) {
    const lastEnd = () => { const b = l.items.at(-1); return b ? b.x + b.w + b.gap : -4; };
    while (lastEnd() - l.off < this.W + 30) {
      const b = this.building(l, lastEnd() + (l.f < 0.3 ? 0 : 1 + Math.floor(Math.random() * 3)));
      l.items.push(b);
    }
    while (l.items.length && l.items[0].x + l.items[0].w - l.off < -30) l.items.shift();
  }

  private spawn() {
    const k = Math.random(), x = this.W + 4;
    this.obs.push(k < 0.38 ? { k: 'car', w: 15, h: 5, x, v: this.base * 0.35 } : k < 0.7 ? { k: 'bar', w: 9, h: 6, x, v: 0 } : { k: 'spk', w: 7, h: 11, x, v: 0 });
  }

  private step(dt: number) {
    this.time += dt;
    this.speed = Math.min(this.base * 2.3, this.speed + this.base * 0.028 * dt);
    this.dist += this.speed * dt;
    const p = this.p;
    p.vy += (this.hold && p.vy < 0 ? 560 : 1150) * dt;
    p.y += p.vy * dt;
    if (p.y >= this.ground) { if (!p.onGround) this.landT = this.time; p.y = this.ground; p.vy = 0; p.onGround = true; }
    if (!this.reduce) this.layers.forEach((l) => { l.off += this.speed * l.f * dt; this.fill(l); });
    this.nextGap -= this.speed * dt;
    if (this.nextGap <= 0) { this.spawn(); this.nextGap = this.speed * 0.62 + this.W * 0.12 + Math.random() * this.W * 0.42; }
    this.obs.forEach((o) => (o.x -= (this.speed + o.v) * dt));
    this.obs = this.obs.filter((o) => o.x + o.w > -4);
    const px = p.x + 2, pw = 8, py = p.y - 10, ph = 9;
    for (const o of this.obs) {
      const ox = o.x + 1, ow = o.w - 2, oy = this.ground - o.h + 1, oh = o.h - 1;
      if (px < ox + ow && px + pw > ox && py < oy + oh && py + ph > oy) { this.over(); break; }
    }
  }

  private over() {
    const score = this.score, isRecord = score > this.best;
    if (isRecord) { this.best = score; try { localStorage.setItem(HI_KEY, String(score)); } catch { /* ignore */ } }
    this.overAt = performance.now();
    this.setState('over', isRecord);
    this.draw();
  }

  private setState(s: GameState, isRecord = false) {
    this.state = s;
    this.cb.onState(s, { score: this.score, best: this.best, isRecord });
    this.cb.onScore(this.score, this.best);
  }

  // ---------- drawing ----------
  private sprite(rows: string[], x: number, y: number, map: Record<string, string>) {
    rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const c = map[r[i]]; if (c) { this.g.fillStyle = c; this.g.fillRect(x + i, y + j, 1, 1); } } });
  }

  private draw() {
    const g = this.g, c = this.t, W = this.W, H = this.H;
    if (!c.length || !W) return;
    const sky = g.createLinearGradient(0, 0, 0, H);
    sky.addColorStop(0, c[0]); sky.addColorStop(0.7, mix(c[1], c[0], 0.2)); sky.addColorStop(1, c[0]);
    g.fillStyle = sky; g.fillRect(0, 0, W, H);
    ([[0.2, 0.45, c[7], 0.35], [0.8, 0.35, c[3], 0.5], [0.55, 0.8, c[8], 0.18]] as [number, number, string, number][]).forEach(([x, y, col, a]) => {
      const r = Math.max(W, H) * 0.5, rg = g.createRadialGradient(W * x, H * y, 0, W * x, H * y, r);
      rg.addColorStop(0, hex2(col, a)); rg.addColorStop(1, hex2(col, 0)); g.fillStyle = rg; g.fillRect(0, 0, W, H);
    });
    this.layers.forEach((l, li) => {
      const col = li ? mix(c[0], '#000000', 0.35) : hex2(mix(c[0], c[1], 0.55), 0.9);
      l.items.forEach((b) => {
        const X = Math.round(b.x - l.off), Y = this.horizon - b.h;
        if (X > W || X + b.w < 0) return;
        g.fillStyle = col; g.fillRect(X, Y, b.w, b.h);
        b.wins.forEach(([wx, wy, wc]) => { g.fillStyle = hex2(c[wc], wc === 4 ? 0.5 : 0.85); g.fillRect(X + wx, Y + wy, 1, 1); });
        if (b.sign) {
          g.fillStyle = hex2(c[b.sign.c], 0.25); g.fillRect(X + b.sign.x - 1, Y + b.sign.y - 1, 3, b.sign.len + 2);
          g.fillStyle = c[b.sign.c]; g.fillRect(X + b.sign.x, Y + b.sign.y, 1, b.sign.len);
        }
        if (b.logo) {
          const lw = b.w + 6, lh = Math.round(lw * 0.32) + 3, lx0 = X - 3, ly = Y - lh - 4;
          g.fillStyle = col; g.fillRect(X + 3, ly + lh, 1, 4); g.fillRect(X + b.w - 4, ly + lh, 1, 4);
          g.fillStyle = mix(c[0], '#000000', 0.55); g.fillRect(lx0, ly, lw, lh);
          g.save(); const sc = (lw - 4) / LOGO_W; g.translate(lx0 + 2, ly + (lh - LOGO_H * sc) / 2); g.scale(sc, sc);
          g.fillStyle = c[6]; g.fill(this.logo); g.restore();
        }
      });
    });
    g.fillStyle = mix(c[0], '#000000', 0.45); g.fillRect(0, this.horizon, W, this.ground - this.horizon);
    g.fillStyle = mix(c[0], '#000000', 0.6); g.fillRect(0, this.ground, W, H - this.ground);
    g.fillStyle = hex2(c[8], 0.6); g.fillRect(0, this.ground, W, 1);
    const d = this.reduce ? 0 : this.dist % 14;
    g.fillStyle = hex2(c[6], 0.35);
    for (let x = -d; x < W; x += 14) g.fillRect(Math.round(x), Math.round(this.ground + (H - this.ground) * 0.5), 6, 1);
    const d2 = this.reduce ? 0 : (this.dist * 0.9) % 5;
    g.fillStyle = hex2(c[4], 0.12);
    for (let x = -d2; x < W; x += 5) g.fillRect(Math.round(x), this.horizon + 3, 2, 1);

    this.obs.forEach((o) => {
      const X = Math.round(o.x), Y = this.ground - o.h;
      if (o.k === 'car') {
        g.fillStyle = hex2(c[6], 0.16); for (let k = 1; k <= 7; k++) g.fillRect(X - k, Y + 2, 1, k > 3 ? 3 : 2);
        g.fillStyle = mix(c[7], '#000000', 0.3); g.fillRect(X + 3, Y, o.w - 6, 2);
        g.fillStyle = hex2(c[4], 0.6); g.fillRect(X + 4, Y, 2, 1);
        g.fillStyle = c[7]; g.fillRect(X, Y + 2, o.w, 2);
        g.fillStyle = c[6]; g.fillRect(X, Y + 2, 1, 1);
        g.fillStyle = '#000000'; g.fillRect(X + 2, Y + 4, 2, 1); g.fillRect(X + o.w - 4, Y + 4, 2, 1);
      } else if (o.k === 'bar') {
        for (let i = 0; i < o.w; i += 3) { g.fillStyle = (i / 3) % 2 ? c[0] : c[6]; g.fillRect(X + i, Y, Math.min(3, o.w - i), 3); }
        g.fillStyle = c[4]; g.fillRect(X + 1, Y + 3, 1, 3); g.fillRect(X + o.w - 2, Y + 3, 1, 3);
      } else {
        g.fillStyle = c[3]; g.fillRect(X, Y, o.w, o.h);
        g.fillStyle = c[8]; g.fillRect(X + 2, Y + 2, 3, 3); g.fillRect(X + 1, Y + 6, 5, 4);
        g.fillStyle = c[0]; g.fillRect(X + 3, Y + 7, 1, 2);
      }
    });

    const map: Record<string, string> = { r: c[4], b: c[6], d: c[0], l: c[4] };
    const X = Math.round(this.p.x), Y = Math.round(this.p.y) - 10, so = Math.floor(this.time * 6) % 2;
    g.fillStyle = hex2(c[5], 0.85);
    [2, 6, 10].forEach((sx, i) => g.fillRect(X + sx + ((so + i) % 2), Y - 4, 1, 2));
    this.sprite(this.state === 'over' ? SPRITE.dead : SPRITE.body, X, Y, map);
    const L = SPRITE.legs;
    const legs = this.state === 'over' ? L.idle
      : !this.p.onGround ? L.jump
      : this.landT >= 0 && this.time - this.landT < 0.08 ? L.land
      : this.state === 'run' ? (Math.floor(this.time * 12) % 2 ? L.run1 : L.run2)
      : L.idle;
    this.sprite(legs, X, Y + 8, map);
  }

  // ---------- loop & input ----------
  private loopFrom(now: number) {
    this.last = now; this.acc = 0;
    cancelAnimationFrame(this.raf);
    this.raf = requestAnimationFrame(this.loop);
  }

  private loop = (now: number) => {
    if (this.state !== 'run') return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now; this.acc += dt;
    let lastScore = this.score;
    while (this.acc >= 1 / 60 && this.state === 'run') { this.step(1 / 60); this.acc -= 1 / 60; }
    this.draw();
    if (this.score !== lastScore) { lastScore = this.score; this.cb.onScore(this.score, this.best); }
    if (this.state === 'run') this.raf = requestAnimationFrame(this.loop);
  };

  private jump() {
    if (this.state === 'menu' || (this.state === 'over' && performance.now() - this.overAt > 400)) { this.start(); return; }
    if (this.state === 'run' && this.p.onGround) { this.p.vy = -290; this.p.onGround = false; }
  }

  private onKeyDown = (e: KeyboardEvent) => {
    if (!(e.code === 'Space' || e.code === 'ArrowUp') || e.repeat) return;
    const onButton = (e.target as HTMLElement | null)?.closest?.('button');
    if (onButton && this.state !== 'run') return; // let the focused button handle it
    e.preventDefault();
    this.hold = true;
    this.jump();
  };

  private onPointerDown = () => { this.hold = true; this.jump(); };
  private onUp = () => { this.hold = false; };
  private onResize = () => { this.setup(); if (this.state !== 'run') this.draw(); };
  private onVisibility = () => {
    if (document.hidden && this.state === 'run') { cancelAnimationFrame(this.raf); this.setState('paused'); }
  };
}
