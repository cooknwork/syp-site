// Shapes mirror the tables in supabase/migrations/0001_init.sql.
// Stages 2–4 read them from seed.ts; Stage 5 replaces seed.ts with database queries.

export const ROLES = [
  'background',
  'background-secondary',
  'surface',
  'surface-secondary',
  'text-primary',
  'text-secondary',
  'accent-primary',
  'accent-secondary',
  'accent-tertiary',
] as const;
export type Role = (typeof ROLES)[number];
export type ThemeTokens = Record<Role, string>;

export interface Theme {
  slug: string;
  name: string;
  mood: string;
  tokens: ThemeTokens;
  isDefault: boolean;
}

export type EventStatus = 'announce' | 'on_sale' | 'sold_out' | 'cancelled' | 'past';

export interface Artist {
  name: string;
  role?: string;
  url?: string;
}

export interface InfoBlock {
  title: string;
  text: string;
}

export interface SypEvent {
  slug: string;
  title: string;
  shortDescription: string | null;
  description: string | null;
  posterUrl: string | null; // афиша в приложениях
  billboardImageUrl: string | null; // картинка для билборда в городе (4:5)
  showOnBillboard: boolean;
  startsAt: string | null; // ISO
  timezone: string;
  venue: string | null;
  address: string | null;
  artists: Artist[];
  infoBlocks: InfoBlock[];
  ticketUrl: string | null;
  status: EventStatus;
  priority: number;
  sortOrder: number;
}

export interface Contact {
  platform: 'instagram' | 'telegram' | string;
  label: string;
  caption: string | null;
  url: string | null;
  isVisible: boolean;
}

export interface Brand {
  name: string;
  shortDescription: string | null;
  description: string | null;
  philosophy: string | null;
}

export interface LegalDocument {
  slug: 'privacy' | 'cookies' | 'legal' | string;
  title: string;
  body: string; // paragraphs separated by a blank line
  showInFooter: boolean;
  isDraft: boolean;
}

export interface GameSettings {
  isVisible: boolean;
  title: string;
  description: string;
  /** multipliers from the admin panel, 1 = as designed */
  startSpeed: number;
  maxSpeed: number;
  gravity: number;
  jumpForce: number;
}

export interface CitySettings {
  brightness: number;
  contrast: number;
  glowIntensity: number;
  texture: number;
  animationSpeed: number;
}

export interface MediaRef {
  id: string;
  url: string;
  kind: 'image' | 'video' | 'svg';
  width: number | null;
  height: number | null;
  /** smaller WebP copy for lists and previews, if one was made on upload */
  thumbUrl: string | null;
}

export interface GalleryAlbum {
  id: string;
  slug: string;
  title: string;
  cover: MediaRef | null;
  sortOrder: number;
}

export interface GalleryItem {
  id: string;
  albumId: string | null;
  media: MediaRef;
  caption: string | null;
  takenAt: string | null;
  sortOrder: number;
}

export interface HomeScreen {
  /** visible home-screen apps in order; the Dock is fixed */
  apps: { key: string; visible: boolean }[];
}

export interface SiteContent {
  themes: Theme[];
  events: SypEvent[];
  contacts: Contact[];
  brand: Brand;
  legal: LegalDocument[];
  game: GameSettings;
  gallery: { albums: GalleryAlbum[]; items: GalleryItem[] };
  home: HomeScreen;
  city: CitySettings;
  /** 'seed' — built-in starting content; 'db' — loaded from the database */
  source: 'seed' | 'db';
}
