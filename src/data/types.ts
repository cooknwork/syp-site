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
}

export interface SiteContent {
  themes: Theme[];
  events: SypEvent[];
  contacts: Contact[];
  brand: Brand;
  legal: LegalDocument[];
  game: GameSettings;
}
