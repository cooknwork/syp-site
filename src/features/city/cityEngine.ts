// Night city behind the phone. Two canvases:
//  - `city`: static layers (sky, glows, buildings, windows, billboards, street), redrawn on theme change and window flicker;
//  - `life`: low-res living layer (stars, people, cars, plane), redrawn ~30 times per second.
// Everything is generated from a fixed seed, so every visitor sees the same city.

import { LOGO_H, LOGO_PATH, LOGO_W } from '@/components/logo';
import { hex2, mix, rng } from '@/lib/color';

type Rect = [number, number, number, number];
interface Win { x: number; y: number; on: boolean; c: number }
interface Sign { x: number; y: number; len: number; c: number }
interface Ant { x: number; y: number; len: number; on: boolean }
interface Board { x: number; y: number; w: number; h: number; roof: number; legs: number[]; on: boolean }
interface Car { dir: 1 | -1; x: number; v: number; c: number; len: number }
interface Person { x: number; v: number; c: number; ph: number }
interface Star { x: number; y: number; ph: number; sp: number }
interface Plane { x: number; y: number; v: number; ph: number }
interface Hit { r: Rect; go: () => void }

export interface BillboardEvent {
  slug: string;
  title: string;
  statusLabel: string;
  dateLabel: string;
  imageUrl: string | null; // «Картинка для билборда» — independent from the poster
}

export interface CityCallbacks {
  onBrand: () => void;
  onEvent: (slug: string) => void;
}

interface Scene {
  P: number; w: number; h: number; W: number; H: number; ground: number; mobile: boolean;
  far: Rect[]; mid: Rect[]; near: Rect[]; signs: Sign[]; ant: Ant[]; wins: Win[];
  board: Board | null; poster: Board | null; door: Rect | null;
  hits: Hit[];
  lanes: Record<number, number>;
  cars: Car[]; people: Person[]; queue: Person[]; stars: Star[];
  plane: Plane | null; nextPlane: number; clock: number;
}

const pick = <T,>(a: T[]): T => a[Math.floor(Math.random() * a.length)];

/** Phone width on desktop — must match `.phone` in globals.css. */
const phoneWidth = (W: number, H: number) => (Math.min(0.94 * H, 1000, (W - 32) * 2.1667) * 9) / 19.5;

export class CityEngine {
  private cx: CanvasRenderingContext2D;
  private fx: CanvasRenderingContext2D;
  private lo = document.createElement('canvas');
  private lx: CanvasRenderingContext2D;
  private logo = new Path2D(LOGO_PATH);
  private s!: Scene;
  private t: string[] = [];
  private event: BillboardEvent | null = null;
  private images: Record<string, HTMLImageElement> = {};
  private raf = 0;
  private last = 0;
  private flicker: ReturnType<typeof setInterval> | null = null;
  private running = false;
  private readonly reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  constructor(private city: HTMLCanvasElement, private life: HTMLCanvasElement, private cb: CityCallbacks) {
    this.cx = city.getContext('2d')!;
    this.fx = life.getContext('2d')!;
    this.lx = this.lo.getContext('2d')!;
    life.addEventListener('click', this.onClick);
    life.addEventListener('mousemove', this.onMove);
  }

  setTheme(tokens: string[]) {
    this.t = tokens;
    if (!this.s) this.layout();
    else { this.drawCity(); this.drawLife(); }
  }

  setEvent(ev: BillboardEvent | null) {
    this.event = ev;
    if (this.s) this.layout();
  }

  /** Rebuild for the current window size. */
  layout() {
    this.build();
    this.initLife();
    this.drawCity();
    this.drawLife();
  }

  start() {
    if (this.running || !this.s) return;
    this.running = true;
    if (this.reduce) { this.drawLife(); return; }
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.frame);
    this.flicker = setInterval(this.flickerTick, 1100);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    if (this.flicker) clearInterval(this.flicker);
    this.flicker = null;
  }

  destroy() {
    this.stop();
    this.life.removeEventListener('click', this.onClick);
    this.life.removeEventListener('mousemove', this.onMove);
  }

  // ---------- scene ----------
  private build() {
    const W = window.innerWidth, H = window.innerHeight, mobile = W < 768, P = mobile ? 3 : 4;
    const w = Math.ceil(W / P), h = Math.ceil(H / P), R = rng(1984);
    const ground = Math.round(h * (mobile ? 0.9 : 0.84));
    const s: Scene = {
      P, w, h, W, H, ground, mobile, far: [], mid: [], near: [], signs: [], ant: [], wins: [],
      board: null, poster: null, door: null, hits: [], lanes: {},
      cars: [], people: [], queue: [], stars: [], plane: null, nextPlane: 0, clock: 0,
    };
    const farH = mobile ? [0.18, 0.28] : [0.12, 0.24], midH = mobile ? [0.2, 0.32] : [0.16, 0.36];
    for (let x = -2; x < w; ) {
      const bw = 5 + Math.floor(R() * 9), bh = Math.round(h * (farH[0] + R() * farH[1]));
      s.far.push([x, ground - bh, bw, bh]);
      x += bw + (R() < 0.3 ? 1 : 0);
    }
    for (let x = -3; x < w; ) {
      const bw = 8 + Math.floor(R() * 12), bh = Math.round(h * (midH[0] + R() * midH[1]));
      const b: Rect = [x, ground - bh, bw, bh];
      s.mid.push(b);
      for (let wy = b[1] + 3; wy < ground - 3; wy += 3)
        for (let wx = x + 2; wx < x + bw - 2; wx += 2)
          if (R() < 0.3) s.wins.push({ x: wx, y: wy, on: R() < 0.55, c: R() < 0.25 ? 6 : R() < 0.5 ? 4 : 5 });
      if (R() < (mobile ? 0.15 : 0.32) && bh > h * 0.2)
        s.signs.push({ x: x + (R() < 0.5 ? 1 : bw - 2), y: b[1] + 4 + Math.floor(R() * 8), len: 6 + Math.floor(R() * 10), c: R() < 0.5 ? 7 : 8 });
      if (R() < 0.35) s.ant.push({ x: x + Math.floor(bw / 2), y: b[1], len: 3 + Math.floor(R() * 6), on: true });
      x += bw + 1 + Math.floor(R() * 3);
    }
    for (let x = -4; x < w; ) {
      const bw = 10 + Math.floor(R() * 14), bh = Math.round(h * (0.05 + R() * 0.12));
      if (R() < (mobile ? 0.35 : 0.55)) s.near.push([x, ground - bh, bw, bh]);
      x += bw + 4 + Math.floor(R() * 10);
    }

    // Billboards only where there is free space beside the phone.
    const side = (W - phoneWidth(W, H)) / 2;
    if (!mobile && side >= 210) {
      const target = (side * 0.48) / P, bw = Math.min(64, Math.round((side * 0.62) / P));
      const b = s.mid
        .filter((m) => m[2] >= 10 && m[0] + m[2] < side / P - 4)
        .sort((a, c) => Math.abs(a[0] + a[2] / 2 - target) - Math.abs(c[0] + c[2] / 2 - target))[0];
      if (b) {
        const bh = Math.round((bw * 267) / 830) + 5, cxm = Math.round(b[0] + b[2] / 2);
        const x = Math.max(2, Math.min(Math.round(cxm - bw / 2), Math.floor(side / P) - bw - 4));
        s.board = { x, y: Math.max(8, b[1] - bh - 5), w: bw, h: bh, roof: b[1], legs: [Math.max(b[0] + 1, x + 3), Math.min(b[0] + b[2] - 2, x + bw - 4)], on: true };
        s.door = [cxm - 3, ground - 8, 5, 8];
        s.signs = s.signs.filter((sg) => sg.x < b[0] - 1 || sg.x > b[0] + b[2]);
      }
      if (this.event) {
        const pw = Math.min(44, Math.round((side * 0.36) / P)), ph = Math.round(pw * 1.25) + 4;
        const left = Math.ceil((W - side) / P) + 4, tgt = (W - side * 0.5) / P;
        const rb = s.mid
          .filter((m) => m[2] >= 8 && m[0] > left && m[1] - ph - 6 >= 10)
          .sort((a, c) => Math.abs(a[0] + a[2] / 2 - tgt) - Math.abs(c[0] + c[2] / 2 - tgt))[0];
        if (rb) {
          const x = Math.max(left, Math.min(Math.round(rb[0] + rb[2] / 2 - pw / 2), w - pw - 3));
          s.poster = { x, y: rb[1] - ph - 6, w: pw, h: ph, roof: rb[1], legs: [Math.max(rb[0] + 1, x + 3), Math.min(rb[0] + rb[2] - 2, x + pw - 4)], on: true };
          s.signs = s.signs.filter((sg) => sg.x < rb[0] - 1 || sg.x > rb[0] + rb[2]);
        }
      }
    }
    this.s = s;
  }

  // ---------- static layers ----------
  private drawCity() {
    const s = this.s, t = this.t, P = s.P, cx = this.cx, lx = this.lx;
    if (!t.length) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.city.width = s.W * dpr;
    this.city.height = s.H * dpr;
    cx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.lo.width = s.w;
    this.lo.height = s.h;

    const g = cx.createLinearGradient(0, 0, 0, s.H);
    g.addColorStop(0, t[0]); g.addColorStop(0.62, mix(t[1], t[0], 0.2)); g.addColorStop(1, t[0]);
    cx.fillStyle = g; cx.fillRect(0, 0, s.W, s.H);
    ([[0.15, 0.5, t[7], 0.38], [0.85, 0.42, t[3], 0.55], [0.5, 0.78, t[8], 0.22], [0.7, 0.15, t[6], 0.08]] as [number, number, string, number][]).forEach(([x, y, c, a]) => {
      const r = Math.max(s.W, s.H) * 0.45, rg = cx.createRadialGradient(s.W * x, s.H * y, 0, s.W * x, s.H * y, r);
      rg.addColorStop(0, hex2(c, a)); rg.addColorStop(1, hex2(c, 0)); cx.fillStyle = rg; cx.fillRect(0, 0, s.W, s.H);
    });

    lx.clearRect(0, 0, s.w, s.h);
    lx.fillStyle = hex2(mix(t[0], t[1], 0.55), 0.9); s.far.forEach((b) => lx.fillRect(...b));
    const midC = mix(t[0], '#000000', 0.35);
    lx.fillStyle = midC; s.mid.forEach((b) => lx.fillRect(...b));
    s.wins.forEach((wn) => { if (!wn.on) return; lx.fillStyle = hex2(t[wn.c], wn.c === 4 ? 0.55 : 0.85); lx.fillRect(wn.x, wn.y, 1, 1); });
    s.signs.forEach((sg) => { lx.fillStyle = t[sg.c]; lx.fillRect(sg.x, sg.y, 1, sg.len); });
    s.ant.forEach((a) => {
      lx.fillStyle = midC; lx.fillRect(a.x, a.y - a.len, 1, a.len);
      if (a.on) { lx.fillStyle = t[7]; lx.fillRect(a.x, a.y - a.len - 1, 1, 1); }
    });
    lx.fillStyle = hex2(t[4], 0.18);
    for (let i = 0; i < s.mid.length - 1; i += 2) {
      const a = s.mid[i], b = s.mid[i + 1], x0 = a[0] + a[2] - 1, y0 = a[1] + 3, x1 = b[0], y1 = b[1] + 3;
      for (let k = 0; k <= 1; k += 1 / Math.max(4, x1 - x0)) {
        lx.fillRect(Math.round(x0 + (x1 - x0) * k), Math.round(y0 + (y1 - y0) * k + Math.sin(k * Math.PI) * 3), 1, 1);
      }
    }
    if (s.board) {
      const b = s.board;
      lx.fillStyle = midC; b.legs.forEach((l) => lx.fillRect(l, b.y + b.h, 1, b.roof - b.y - b.h)); lx.fillRect(b.x + 1, b.y + b.h, b.w - 2, 1);
      lx.fillStyle = mix(t[0], '#000000', 0.55); lx.fillRect(b.x, b.y, b.w, b.h);
      lx.fillStyle = hex2(t[7], b.on ? 0.75 : 0.25);
      lx.fillRect(b.x, b.y, b.w, 1); lx.fillRect(b.x, b.y + b.h - 1, b.w, 1); lx.fillRect(b.x, b.y, 1, b.h); lx.fillRect(b.x + b.w - 1, b.y, 1, b.h);
      for (let i = 2; i < b.w - 2; i += 4) { lx.fillStyle = hex2(t[6], b.on ? 0.9 : 0.2); lx.fillRect(b.x + i, b.y - 1, 1, 1); }
    }
    if (s.poster) {
      const b = s.poster;
      lx.fillStyle = midC; b.legs.forEach((l) => lx.fillRect(l, b.y + b.h, 1, b.roof - b.y - b.h)); lx.fillRect(b.x + 1, b.y + b.h, b.w - 2, 1);
      lx.fillStyle = mix(t[0], '#000000', 0.55); lx.fillRect(b.x, b.y, b.w, b.h);
      lx.fillStyle = midC; lx.fillRect(b.x + 3, b.y - 3, 1, 3); lx.fillRect(b.x + b.w - 4, b.y - 3, 1, 3); lx.fillRect(b.x + 2, b.y - 4, 3, 1); lx.fillRect(b.x + b.w - 5, b.y - 4, 3, 1);
      lx.fillStyle = t[4]; lx.fillRect(b.x + 3, b.y - 3, 1, 1); lx.fillRect(b.x + b.w - 4, b.y - 3, 1, 1);
    }
    if (s.door) {
      const [dx, dy, dw, dh] = s.door;
      lx.fillStyle = t[6]; lx.fillRect(dx, dy, dw, dh); lx.fillStyle = t[7]; lx.fillRect(dx - 1, dy - 2, dw + 2, 1);
    }
    lx.fillStyle = mix(t[0], '#000000', 0.55); s.near.forEach((b) => lx.fillRect(...b));
    lx.fillStyle = mix(t[0], '#000000', 0.6); lx.fillRect(0, s.ground, s.w, s.h - s.ground);
    lx.fillStyle = hex2(t[8], 0.55); lx.fillRect(0, s.ground, s.w, 1);
    lx.fillStyle = hex2(t[6], 0.35); for (let x = 2; x < s.w; x += 9) lx.fillRect(x, Math.round(s.ground + (s.h - s.ground) * 0.55), 4, 1);
    s.signs.forEach((sg) => { for (let k = 0; k < 6; k++) { lx.fillStyle = hex2(t[sg.c], 0.28 - k * 0.04); lx.fillRect(sg.x, s.ground + 2 + k * 2, 1, 1); } });
    cx.imageSmoothingEnabled = false;
    cx.drawImage(this.lo, 0, 0, s.w * P, s.h * P);

    const glow = (x: number, y: number, r: number, c: string, a: number) => {
      const rg = cx.createRadialGradient(x, y, 0, x, y, r);
      rg.addColorStop(0, hex2(c, a)); rg.addColorStop(1, hex2(c, 0)); cx.fillStyle = rg; cx.fillRect(x - r, y - r, r * 2, r * 2);
    };
    cx.globalCompositeOperation = 'lighter';
    s.signs.forEach((sg) => glow((sg.x + 0.5) * P, (sg.y + sg.len / 2) * P, sg.len * P * 1.1, t[sg.c], 0.32));
    if (s.door) glow((s.door[0] + 2.5) * P, (s.door[1] + 4) * P, ((26 * P) / 4) * 3, t[6], 0.28);
    if (s.board?.on) glow((s.board.x + s.board.w / 2) * P, (s.board.y + s.board.h / 2) * P, s.board.w * P * 0.85, t[6], 0.22);
    cx.globalCompositeOperation = 'source-over';

    if (s.board) {
      const b = s.board, sc = ((b.w - 6) * P) / LOGO_W, oy = b.y * P + (b.h * P - LOGO_H * sc) / 2;
      cx.save(); cx.translate((b.x + 3) * P, oy); cx.scale(sc, sc);
      cx.shadowColor = b.on ? t[6] : 'transparent'; cx.shadowBlur = b.on ? 22 : 0;
      cx.fillStyle = b.on ? t[6] : hex2(t[6], 0.18); cx.fill(this.logo); cx.restore();
    }
    if (s.poster && this.event) this.drawPoster(s.poster, this.event);

    s.hits = [];
    if (s.board) s.hits.push({ r: [s.board.x * P, s.board.y * P, s.board.w * P, s.board.h * P], go: () => this.cb.onBrand() });
    if (s.poster && this.event) {
      const slug = this.event.slug;
      s.hits.push({ r: [s.poster.x * P, s.poster.y * P, s.poster.w * P, s.poster.h * P], go: () => this.cb.onEvent(slug) });
    }
  }

  private drawPoster(b: Board, ev: BillboardEvent) {
    const P = this.s.P, t = this.t, cx = this.cx;
    const x = (b.x + 2) * P, y = (b.y + 2) * P, w = (b.w - 4) * P, hh = (b.h - 4) * P;
    const frame = () => {
      cx.fillStyle = hex2(t[7], 0.85);
      cx.fillRect(b.x * P, b.y * P, b.w * P, P); cx.fillRect(b.x * P, (b.y + b.h - 1) * P, b.w * P, P);
      cx.fillRect(b.x * P, b.y * P, P, b.h * P); cx.fillRect((b.x + b.w - 1) * P, b.y * P, P, b.h * P);
    };
    // light cones from the two lamps
    cx.save(); cx.globalCompositeOperation = 'lighter';
    [b.x + 3.5, b.x + b.w - 3.5].forEach((l) => {
      const g = cx.createLinearGradient(0, (b.y - 3) * P, 0, (b.y + b.h * 0.7) * P);
      g.addColorStop(0, hex2(t[4], 0.22)); g.addColorStop(1, hex2(t[4], 0));
      cx.fillStyle = g; cx.beginPath(); cx.moveTo(l * P, (b.y - 2.5) * P);
      cx.lineTo(l * P + (l < b.x + b.w / 2 ? -1 : 1) * w * 0.08, (b.y + b.h * 0.7) * P);
      cx.lineTo(b.x * P + (b.w * P) / 2, (b.y + b.h * 0.7) * P); cx.closePath(); cx.fill();
    });
    cx.restore();

    cx.save(); cx.beginPath(); cx.rect(x, y, w, hh); cx.clip();
    const img = ev.imageUrl ? this.image(ev.imageUrl) : null;
    if (img && img.complete && img.naturalWidth) {
      const k = Math.max(w / img.naturalWidth, hh / img.naturalHeight), iw = img.naturalWidth * k, ih = img.naturalHeight * k;
      cx.drawImage(img, x + (w - iw) / 2, y + (hh - ih) / 2, iw, ih);
      cx.restore(); frame(); return;
    }
    // No billboard image yet: the title in theme colours (the poster is never used here).
    let g = cx.createRadialGradient(x + w * 0.7, y + hh * 0.2, 0, x + w * 0.7, y + hh * 0.2, w * 1.1);
    g.addColorStop(0, t[7]); g.addColorStop(1, t[3]); cx.fillStyle = g; cx.fillRect(x, y, w, hh);
    g = cx.createRadialGradient(x + w * 0.1, y + hh * 0.95, 0, x + w * 0.1, y + hh * 0.95, w * 0.9);
    g.addColorStop(0, hex2(t[8], 0.9)); g.addColorStop(1, hex2(t[8], 0)); cx.fillStyle = g; cx.fillRect(x, y, w, hh);
    cx.fillStyle = hex2(t[0], 0.22);
    for (let k = x + 6; k < x + w; k += 7) cx.fillRect(k, y, 1, hh);
    for (let k = y + 6; k < y + hh; k += 7) cx.fillRect(x, k, w, 1);
    const pad = w * 0.09, fs = Math.round(w * 0.16), ff = getComputedStyle(document.body).fontFamily || 'system-ui, sans-serif';
    cx.fillStyle = hex2(t[4], 0.85); cx.font = `600 ${Math.round(fs * 0.36)}px ${ff}`; cx.textBaseline = 'top';
    cx.fillText(`${ev.statusLabel.toUpperCase()} · SYP`, x + pad, y + pad);
    cx.font = `700 ${fs}px ${ff}`;
    const lines: string[] = []; let cur = '';
    ev.title.split(' ').forEach((wd) => {
      const test = cur ? `${cur} ${wd}` : wd;
      if (cx.measureText(test).width > w - pad * 2 && cur) { lines.push(cur); cur = wd; } else cur = test;
    });
    lines.push(cur);
    const dateFs = Math.round(fs * 0.38), base = y + hh - pad - dateFs * 1.6;
    cx.shadowColor = '#00000088'; cx.shadowBlur = 12; cx.fillStyle = t[4]; cx.textBaseline = 'alphabetic';
    lines.forEach((ln, i) => cx.fillText(ln, x + pad, base - (lines.length - 1 - i) * fs * 0.98));
    cx.shadowBlur = 0; cx.font = `500 ${dateFs}px ${ff}`; cx.fillStyle = hex2(t[4], 0.8);
    cx.fillText(ev.dateLabel, x + pad, y + hh - pad);
    cx.restore(); frame();
  }

  private image(src: string) {
    if (!this.images[src]) {
      const im = new Image();
      im.onload = () => this.drawCity();
      im.src = src;
      this.images[src] = im;
    }
    return this.images[src];
  }

  // ---------- living layer ----------
  private newCar(dir: 1 | -1, x?: number): Car {
    return { dir, x: x ?? (dir > 0 ? -16 : this.s.w + 2), v: (16 + Math.random() * 18) * dir, c: pick([7, 8, 3, 4, 5]), len: Math.random() < 0.25 ? 15 : 11 };
  }

  private newPerson(x?: number, dir?: number): Person {
    const d = dir ?? (Math.random() < 0.5 ? -1 : 1);
    return { x: x ?? (d > 0 ? -2 : this.s.w + 2), v: d * (2.4 + Math.random() * 2.6), c: pick([7, 8, 5, 3, 6]), ph: Math.random() * 9 };
  }

  private initLife() {
    const s = this.s;
    this.life.width = s.w; this.life.height = s.h;
    this.life.style.width = `${s.w * s.P}px`; this.life.style.height = `${s.h * s.P}px`;
    const sh = s.h - s.ground;
    s.lanes = {};
    s.lanes[1] = s.ground + Math.max(7, Math.round(sh * 0.4));
    s.lanes[-1] = s.ground + Math.max(14, Math.round(sh * 0.8));
    for (let i = 0; i < (s.mobile ? 3 : 7); i++) s.cars.push(this.newCar(i % 2 ? 1 : -1, Math.random() * s.w));
    for (let i = 0; i < (s.mobile ? 8 : 18); i++) s.people.push(this.newPerson(Math.random() * s.w));
    if (s.door) for (let i = 0; i < 5; i++) s.queue.push({ x: s.door[0] + s.door[2] + 2 + i * 3 + (i > 2 ? 1 : 0), v: 0, c: pick([7, 8, 5, 3]), ph: Math.random() * 9 });
    s.nextPlane = 2 + Math.random() * 5;
    const want = s.mobile ? 26 : 70, blocks = s.mid.concat(s.far);
    for (let i = 0; i < want * 2 && s.stars.length < want; i++) {
      const x = Math.floor(Math.random() * s.w), y = Math.floor(Math.random() * s.h * 0.34) + 2;
      if (blocks.some((b) => x >= b[0] && x < b[0] + b[2] && y >= b[1] - 8)) continue;
      if ([s.board, s.poster].some((b) => b && x >= b.x - 2 && x < b.x + b.w + 2 && y >= b.y - 6)) continue;
      s.stars.push({ x, y, ph: Math.random() * 6.3, sp: 0.6 + Math.random() * 1.6 });
    }
  }

  private update(dt: number) {
    const s = this.s;
    s.cars.forEach((c, i) => { c.x += c.v * dt; if (c.dir > 0 ? c.x > s.w + 2 : c.x < -18) s.cars[i] = this.newCar(c.dir); });
    s.people.forEach((p, i) => { p.x += p.v * dt; p.ph += dt; if (p.x > s.w + 3 || p.x < -3) s.people[i] = this.newPerson(undefined, p.v > 0 ? 1 : -1); });
    s.queue.forEach((q) => (q.ph += dt));
    s.clock += dt;
    if (s.plane) {
      s.plane.x += s.plane.v * dt; s.plane.ph += dt;
      if (s.plane.x < -32 || s.plane.x > s.w + 32) { s.plane = null; s.nextPlane = 9 + Math.random() * 12; }
    } else if ((s.nextPlane -= dt) <= 0) {
      const d = Math.random() < 0.5 ? 1 : -1;
      s.plane = { x: d > 0 ? -30 : s.w + 30, y: Math.round(s.h * (0.06 + Math.random() * 0.14)), v: d * (11 + Math.random() * 5), ph: 0 };
    }
  }

  private person(x: number, y: number, c: number, frame: boolean) {
    const t = this.t, fx = this.fx;
    x = Math.round(x);
    fx.fillStyle = t[4]; fx.fillRect(x, y - 6, 2, 1);
    fx.fillStyle = t[c]; fx.fillRect(x, y - 5, 2, 3);
    fx.fillStyle = mix(t[4], t[0], 0.45);
    if (frame) { fx.fillRect(x, y - 2, 1, 1); fx.fillRect(x - 1, y - 1, 1, 1); fx.fillRect(x + 1, y - 2, 1, 1); fx.fillRect(x + 2, y - 1, 1, 1); }
    else fx.fillRect(x, y - 2, 2, 2);
  }

  private drawLife() {
    const s = this.s, t = this.t, fx = this.fx;
    if (!s || !t.length) return;
    const y0 = s.ground;
    fx.clearRect(0, 0, s.w, s.h);
    s.stars.forEach((st) => { fx.fillStyle = hex2(t[4], 0.18 + 0.32 * (0.5 + 0.5 * Math.sin(st.ph + s.clock * st.sp))); fx.fillRect(st.x, st.y, 1, 1); });
    s.queue.forEach((q) => this.person(q.x, y0, q.c, Math.floor(q.ph * 1.3) % 5 === 0));
    s.people.forEach((p) => this.person(p.x, y0, p.c, Math.floor(p.ph * 4) % 2 === 1));
    s.cars.forEach((c) => {
      const x = Math.round(c.x), y = s.lanes[c.dir], L = c.len, front = c.dir > 0 ? x + L - 1 : x, back = c.dir > 0 ? x : x + L - 1;
      fx.fillStyle = hex2(t[6], 0.14); for (let k = 1; k <= 9; k++) fx.fillRect(front + c.dir * k, y - 3, 1, k > 4 ? 3 : 2);
      fx.fillStyle = mix(t[c.c], '#000000', 0.3); fx.fillRect(x + 3, y - 5, L - 6, 2);
      fx.fillStyle = hex2(t[4], 0.6); fx.fillRect(c.dir > 0 ? x + L - 6 : x + 4, y - 5, 2, 1); fx.fillRect(c.dir > 0 ? x + 4 : x + L - 6, y - 5, 2, 1);
      fx.fillStyle = t[c.c]; fx.fillRect(x, y - 3, L, 3);
      fx.fillStyle = mix(t[c.c], '#000000', 0.35); fx.fillRect(x, y - 1, L, 1);
      fx.fillStyle = t[6]; fx.fillRect(front, y - 3, 1, 1);
      fx.fillStyle = t[7]; fx.fillRect(back, y - 3, 1, 1);
      fx.fillStyle = '#000000'; fx.fillRect(x + 2, y, 2, 1); fx.fillRect(x + L - 4, y, 2, 1);
    });
    if (s.plane) {
      const p = s.plane, x = Math.round(p.x), y = p.y, d = Math.sign(p.v);
      fx.fillStyle = hex2(t[4], 0.8);
      fx.fillRect(x - 4, y, 9, 1); fx.fillRect(x - d * 4, y - 1, 1, 1); fx.fillRect(x - d * 4, y - 2, 1, 1); fx.fillRect(x, y + 1, 2, 1); fx.fillRect(x - d, y - 1, 2, 1);
      fx.fillStyle = hex2(t[4], 0.14); for (let k = 6; k < 26; k++) if (k % 4) fx.fillRect(x - d * k, y, 1, 1);
      if (Math.floor(p.ph * 2.2) % 2) { fx.fillStyle = t[7]; fx.fillRect(x + d * 5, y, 1, 1); }
      else { fx.fillStyle = t[8]; fx.fillRect(x - d, y + 2, 1, 1); }
    }
  }

  // ---------- loop & input ----------
  private frame = (now: number) => {
    this.raf = requestAnimationFrame(this.frame);
    if (now - this.last < 33) return;
    const dt = Math.min(0.1, (now - this.last) / 1000);
    this.last = now;
    this.update(dt);
    this.drawLife();
  };

  private flickerTick = () => {
    const s = this.s;
    for (let i = 0; i < 4; i++) { const wn = s.wins[Math.floor(Math.random() * s.wins.length)]; if (wn) wn.on = !wn.on; }
    s.ant.forEach((a) => (a.on = !a.on));
    if (s.board && Math.random() < 0.12) {
      s.board.on = false; this.drawCity();
      setTimeout(() => { if (this.s.board) { this.s.board.on = true; this.drawCity(); } }, 160);
    } else this.drawCity();
  };

  private hitAt(x: number, y: number) {
    return this.s?.hits.find((o) => x >= o.r[0] && x <= o.r[0] + o.r[2] && y >= o.r[1] && y <= o.r[1] + o.r[3]);
  }
  private onClick = (e: MouseEvent) => this.hitAt(e.clientX, e.clientY)?.go();
  private onMove = (e: MouseEvent) => { this.life.style.cursor = this.hitAt(e.clientX, e.clientY) ? 'pointer' : ''; };
}
