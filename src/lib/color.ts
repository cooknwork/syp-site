// Small colour helpers shared by the theme system, the city and the game.

const parse = (h: string): [number, number, number] => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16)) as [number, number, number];

export const hex2 = (h: string, a: number): string => {
  const [r, g, b] = parse(h);
  return `rgba(${r},${g},${b},${a})`;
};

export const mix = (a: string, b: string, t: number): string => {
  const x = parse(a), y = parse(b);
  return '#' + x.map((v, i) => Math.round(v + (y[i] - v) * t).toString(16).padStart(2, '0')).join('');
};

export const luminance = (h: string): number => {
  const c = parse(h).map((v) => v / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
  return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
};

export const contrast = (a: string, b: string): number => {
  const x = luminance(a), y = luminance(b);
  return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05);
};

/** Seeded random generator: the same city for every visitor. */
export const rng = (seed: number) => () => {
  let s = (seed = (seed + 0x6d2b79f5) | 0);
  s = Math.imul(s ^ (s >>> 15), 1 | s);
  s = (s + Math.imul(s ^ (s >>> 7), 61 | s)) ^ s;
  return ((s ^ (s >>> 14)) >>> 0) / 4294967296;
};
