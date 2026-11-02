// Loads site content from Supabase and maps database rows to the types the interface uses.
// Used at build time (anonymous: published rows only) and in the browser (refresh, admin preview).

import type { SupabaseClient } from '@supabase/supabase-js';
import { publicUrl } from '@/lib/supabase';
import { content as seed } from './seed';
import { ROLES, type EventStatus, type LegalDocument, type MediaRef, type SiteContent, type SypEvent, type Theme, type ThemeTokens } from './types';

/* eslint-disable @typescript-eslint/no-explicit-any */
type Row = Record<string, any>;

export interface LoadOptions {
  /** Admin preview: drafts are shown and unpublished edits (content_drafts) are applied. Needs an admin session. */
  preview: boolean;
}

const visible = (r: Row, preview: boolean) =>
  !r.deleted_at && (r.publication === 'published' || (preview && r.publication === 'draft'));

async function all(db: SupabaseClient, table: string, order?: string): Promise<Row[]> {
  let q = db.from(table).select('*');
  if (order) q = q.order(order, { ascending: true });
  const { data, error } = await q;
  if (error) throw new Error(`${table}: ${error.message}`);
  return data ?? [];
}

function toMedia(m: Row | undefined): MediaRef | null {
  if (!m) return null;
  const webp = (m.variants && m.variants.webp) || {};
  const big = webp['1600'] || webp['960'];
  const small = webp['640'] || webp['480'];
  return {
    id: m.id,
    kind: m.kind,
    url: publicUrl(big || m.path),
    thumbUrl: small ? publicUrl(small) : null,
    width: m.width ?? null,
    height: m.height ?? null,
  };
}

export async function loadContent(db: SupabaseClient, opts: LoadOptions): Promise<SiteContent> {
  const { preview } = opts;
  const [themes, events, contacts, brandRows, legal, gameRows, albums, items, homeRows, media, cityRows, drafts] = await Promise.all([
    all(db, 'themes', 'sort_order'),
    all(db, 'events', 'sort_order'),
    all(db, 'contacts', 'sort_order'),
    all(db, 'brand_content'),
    all(db, 'legal_documents', 'sort_order'),
    all(db, 'game_settings'),
    all(db, 'gallery_albums', 'sort_order'),
    all(db, 'gallery_items', 'sort_order'),
    all(db, 'home_screen'),
    all(db, 'media'),
    all(db, 'city_settings'),
    preview ? all(db, 'content_drafts').catch(() => [] as Row[]) : Promise.resolve([] as Row[]),
  ]);

  // In preview, unpublished edits of published rows are laid over the live values.
  const withDraft = (entity: string, r: Row): Row => {
    const d = drafts.find((x) => x.entity === entity && String(x.entity_id) === String(r.id));
    return d ? { ...r, ...d.data } : r;
  };
  const prep = (entity: string, rows: Row[], filter = true) =>
    rows.map((r) => withDraft(entity, r)).filter((r) => !filter || visible(r, preview));
  const mediaById = new Map(media.map((m) => [m.id, m]));
  const mediaOf = (id: string | null) => (id ? toMedia(mediaById.get(id)) : null);

  const themeList: Theme[] = prep('themes', themes).map((t) => ({
    slug: t.slug,
    name: t.name,
    mood: t.mood ?? '',
    isDefault: !!t.is_default,
    tokens: Object.fromEntries(ROLES.map((r) => [r, t.tokens?.[r] ?? seed.themes[0].tokens[r]])) as ThemeTokens,
  }));

  const eventList: SypEvent[] = prep('events', events).map((e) => ({
    slug: e.slug,
    title: e.title,
    shortDescription: e.short_description ?? null,
    description: e.description ?? null,
    posterUrl: mediaOf(e.poster_id)?.url ?? null,
    billboardImageUrl: mediaOf(e.billboard_image_id)?.url ?? null,
    showOnBillboard: !!e.show_on_billboard,
    startsAt: e.starts_at ?? null,
    timezone: e.timezone || 'Europe/Moscow',
    venue: e.venue ?? null,
    address: e.address ?? null,
    artists: Array.isArray(e.artists) ? e.artists.filter((a: Row) => a?.name) : [],
    infoBlocks: Array.isArray(e.info_blocks) ? e.info_blocks.filter((b: Row) => b?.title || b?.text) : [],
    ticketUrl: e.ticket_url ?? null,
    status: (e.event_status as EventStatus) ?? 'announce',
    priority: e.priority ?? 0,
    sortOrder: e.sort_order ?? 0,
  }));

  const brand = prep('brand_content', brandRows)[0];
  const game = prep('game_settings', gameRows)[0];
  const home = prep('home_screen', homeRows)[0];
  const city = prep('city_settings', cityRows)[0];
  const num = (v: unknown, d: number) => (v === null || v === undefined || Number.isNaN(Number(v)) ? d : Number(v));

  const legalList: LegalDocument[] = prep('legal_documents', legal)
    .filter((d) => (d.body ?? '').trim())
    .map((d) => ({ slug: d.slug, title: d.title, body: d.body, showInFooter: !!d.show_in_footer, isDraft: d.publication !== 'published' }));

  return {
    source: 'db',
    themes: themeList.length ? themeList : seed.themes,
    events: eventList,
    contacts: contacts
      .map((c) => withDraft('contacts', c))
      .filter((c) => c.is_visible && c.url)
      .map((c) => ({ platform: c.platform, label: c.label, caption: c.caption ?? null, url: c.url, isVisible: true })),
    brand: brand
      ? { name: brand.name || 'SYP', shortDescription: brand.short_description ?? null, description: brand.description ?? null, philosophy: brand.philosophy ?? null }
      : { ...seed.brand },
    legal: legalList,
    game: game
      ? {
          isVisible: !!game.is_visible, title: game.title || seed.game.title, description: game.description || seed.game.description,
          startSpeed: num(game.start_speed, 1), maxSpeed: num(game.max_speed, 2.3), gravity: num(game.gravity, 1), jumpForce: num(game.jump_force, 1),
        }
      : seed.game,
    city: city
      ? { brightness: num(city.brightness, 1), contrast: num(city.contrast, 1), glowIntensity: num(city.glow_intensity, 1), texture: num(city.texture, 0.2), animationSpeed: num(city.animation_speed, 1) }
      : seed.city,
    gallery: {
      albums: prep('gallery_albums', albums).map((a) => ({ id: a.id, slug: a.slug, title: a.title, cover: mediaOf(a.cover_id), sortOrder: a.sort_order ?? 0 })),
      items: prep('gallery_items', items)
        .map((i) => ({ id: i.id, albumId: i.album_id ?? null, media: mediaOf(i.media_id), caption: i.caption ?? null, takenAt: i.taken_at ?? null, sortOrder: i.sort_order ?? 0 }))
        .filter((i): i is SiteContent['gallery']['items'][number] => i.media !== null),
    },
    home: home && Array.isArray(home.apps) ? { apps: home.apps } : seed.home,
  };
}
