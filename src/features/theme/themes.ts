import { ROLES, type Theme } from '@/data/types';
import { contrast } from '@/lib/color';

export const STORAGE_KEY = 'syp-theme';

/** Theme tokens as an array in ROLES order — what the canvas engines use. */
export const tokenList = (theme: Theme): string[] => ROLES.map((r) => theme.tokens[r]);

/** Text colour that reads best on a given fill: the theme's dark background or its light text. */
const onColor = (fill: string, theme: Theme): string => {
  const dark = theme.tokens.background, light = theme.tokens['text-primary'];
  return contrast(fill, dark) >= contrast(fill, light) ? dark : light;
};

const declarations = (theme: Theme): string => {
  const t = theme.tokens;
  const vars: Record<string, string> = { ...t };
  vars['on-a1'] = onColor(t['accent-primary'], theme);
  vars['on-a2'] = onColor(t['accent-secondary'], theme);
  vars['on-a3'] = onColor(t['accent-tertiary'], theme);
  vars['on-s2'] = onColor(t['surface-secondary'], theme);
  return Object.entries(vars).map(([k, v]) => `--${k}:${v}`).join(';');
};

/** All published themes as CSS: the default on :root, every theme under [data-theme]. Rendered on the server. */
export const themesCss = (themes: Theme[]): string => {
  const def = themes.find((t) => t.isDefault) ?? themes[0];
  return [`:root{${declarations(def)}}`, ...themes.map((t) => `:root[data-theme="${t.slug}"]{${declarations(t)}}`)].join('\n');
};

/** Runs in <head> before the first paint, so the saved theme never flashes. */
export const themeBootScript = (slugs: string[]): string =>
  `(function(){try{var s=localStorage.getItem('${STORAGE_KEY}');if(s&&${JSON.stringify(slugs)}.indexOf(s)>-1)document.documentElement.dataset.theme=s;}catch(e){}})();`;
