// Admin data helpers: rows, drafts of published rows, publishing, uploads.
/* eslint-disable @typescript-eslint/no-explicit-any */
import { BUCKET, publicUrl, supabase } from '@/lib/supabase';
import type { Section } from './schema';

export type Row = Record<string, any>;

const db = () => supabase();
const fail = (e: { message: string } | null, what: string) => { if (e) throw new Error(`${what}: ${e.message}`); };

// ---------- reading ----------
export async function listRows(s: Section): Promise<Row[]> {
  let q = db().from(s.table).select('*');
  if (s.softDelete) q = q.is('deleted_at', null);
  const { data, error } = await q.order(s.table === 'events' ? 'priority' : 'sort_order', { ascending: s.table !== 'events' }).order('created_at', { ascending: true });
  fail(error, 'Не удалось загрузить список');
  return data ?? [];
}

export async function getSingle(s: Section): Promise<Row> {
  const { data, error } = await db().from(s.table).select('*').eq('id', 1).maybeSingle();
  fail(error, 'Не удалось загрузить настройки');
  return data ?? { id: 1 };
}

export async function getDraft(table: string, id: string | number): Promise<Row | null> {
  const { data, error } = await db().from('content_drafts').select('data, updated_at').eq('entity', table).eq('entity_id', String(id)).maybeSingle();
  fail(error, 'Не удалось загрузить черновик');
  return data ? data.data : null;
}

export async function draftIds(table: string): Promise<Set<string>> {
  const { data } = await db().from('content_drafts').select('entity_id').eq('entity', table);
  return new Set((data ?? []).map((d: Row) => String(d.entity_id)));
}

// ---------- writing ----------
const translit: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ё: 'e', ж: 'zh', з: 'z', и: 'i', й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p',
  р: 'r', с: 's', т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch', ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya',
};
export const slugify = (s: string) =>
  s.toLowerCase().split('').map((c) => translit[c] ?? c).join('').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60) || `item-${Date.now().toString(36)}`;

/** Columns the form edits — never id/created_at/updated_at/publication. */
export function pickFields(s: Section, form: Row): Row {
  const out: Row = {};
  for (const f of s.fields) out[f.key] = form[f.key] === '' ? null : form[f.key];
  if (s.fields.some((f) => f.key === 'slug') && !out.slug) {
    const base = form.title || form.name || '';
    out.slug = slugify(String(base));
  }
  return out;
}

export function validate(s: Section, form: Row): string | null {
  for (const f of s.fields) {
    const v = form[f.key];
    if (f.required && (v === null || v === undefined || v === '')) return `Заполните поле «${f.label}»`;
    if (f.type === 'url' && v && !/^https:\/\//.test(String(v))) return `«${f.label}»: ссылка должна начинаться с https://`;
    if (f.key === 'slug' && v && !/^[a-z0-9-]+$/.test(String(v))) return '«Адрес в ссылке»: только латиница, цифры и дефис';
  }
  return null;
}

/** Only one event on the billboard and only one default theme. */
async function keepUnique(s: Section, id: string | number | null, values: Row) {
  if (s.table === 'events' && values.show_on_billboard) {
    let q = db().from('events').update({ show_on_billboard: false }).eq('show_on_billboard', true);
    if (id) q = q.neq('id', id);
    fail((await q).error, 'Не удалось снять флажок билборда с другого мероприятия');
  }
  if (s.table === 'themes' && values.is_default) {
    let q = db().from('themes').update({ is_default: false }).eq('is_default', true);
    if (id) q = q.neq('id', id);
    fail((await q).error, 'Не удалось сменить тему по умолчанию');
  }
}

export type Action = 'draft' | 'publish' | 'hide' | 'save';

/**
 * Saves a record.
 *  - new record: inserted as draft or published;
 *  - published record + «Сохранить черновик»: changes go to content_drafts, the live site is untouched;
 *  - «Опубликовать»: values go live, any pending draft is removed;
 *  - «Скрыть»: record disappears from the site.
 */
export async function save(s: Section, current: Row | null, form: Row, action: Action): Promise<Row> {
  const values = pickFields(s, form);
  const id = s.kind === 'single' ? 1 : current?.id ?? null;
  const live = current?.publication === 'published';

  if (!s.publication || action === 'save') {
    await keepUnique(s, id, values);
    const q = id ? db().from(s.table).update(values).eq('id', id).select().single() : db().from(s.table).insert(values).select().single();
    const { data, error } = await q;
    fail(error, 'Не удалось сохранить');
    return data;
  }

  if (action === 'draft' && live && id) {
    const { error } = await db().from('content_drafts').upsert({ entity: s.table, entity_id: String(id), data: values, updated_at: new Date().toISOString() });
    fail(error, 'Не удалось сохранить черновик');
    return current!;
  }

  const publication = action === 'publish' ? 'published' : action === 'hide' ? 'hidden' : 'draft';
  const row: Row = { ...values, publication };
  if (s.table === 'events' && publication === 'published' && !current?.published_at) row.published_at = new Date().toISOString();
  if (publication === 'published') await keepUnique(s, id, values);
  let result: Row;
  if (id && (current || s.kind === 'single')) {
    const { data, error } = s.kind === 'single'
      ? await db().from(s.table).upsert({ id: 1, ...row }).select().single()
      : await db().from(s.table).update(row).eq('id', id).select().single();
    fail(error, 'Не удалось сохранить');
    result = data;
  } else {
    const { data, error } = await db().from(s.table).insert(row).select().single();
    fail(error, 'Не удалось создать запись');
    result = data;
  }
  if (action === 'publish' || action === 'hide') await discardDraft(s.table, result.id);
  return result;
}

export async function discardDraft(table: string, id: string | number) {
  const { error } = await db().from('content_drafts').delete().eq('entity', table).eq('entity_id', String(id));
  fail(error, 'Не удалось удалить черновик');
}

export async function remove(s: Section, row: Row) {
  const { error } = s.softDelete
    ? await db().from(s.table).update({ deleted_at: new Date().toISOString(), publication: 'hidden', ...(s.table === 'events' ? { show_on_billboard: false } : {}) }).eq('id', row.id)
    : await db().from(s.table).delete().eq('id', row.id);
  fail(error, 'Не удалось удалить');
  await discardDraft(s.table, row.id).catch(() => {});
}

// ---------- media ----------
export interface MediaInfo { id: string; kind: string; url: string; thumb: string | null; mime: string }

export async function getMedia(id: string): Promise<MediaInfo | null> {
  const { data } = await db().from('media').select('*').eq('id', id).maybeSingle();
  if (!data) return null;
  const small = data.variants?.webp?.['640'];
  return { id: data.id, kind: data.kind, mime: data.mime, url: publicUrl(data.path), thumb: small ? publicUrl(small) : null };
}

const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const VIDEO_TYPES = ['video/mp4'];
const MB = 1024 * 1024;

/** Smaller WebP copies made in the browser, so the site never loads full-size originals in lists. */
async function webpCopies(file: File): Promise<{ width: number; height: number; copies: { w: number; blob: Blob }[] }> {
  const bmp = await createImageBitmap(file);
  const copies: { w: number; blob: Blob }[] = [];
  for (const w of [1600, 640]) {
    const k = Math.min(1, w / bmp.width);
    const cv = document.createElement('canvas');
    cv.width = Math.round(bmp.width * k);
    cv.height = Math.round(bmp.height * k);
    cv.getContext('2d')!.drawImage(bmp, 0, 0, cv.width, cv.height);
    const blob = await new Promise<Blob | null>((r) => cv.toBlob(r, 'image/webp', 0.85));
    if (blob) copies.push({ w, blob });
  }
  const size = { width: bmp.width, height: bmp.height };
  bmp.close();
  return { ...size, copies };
}

async function videoSize(file: File): Promise<{ width: number; height: number; duration: number }> {
  return new Promise((resolve) => {
    const v = document.createElement('video');
    v.preload = 'metadata';
    v.onloadedmetadata = () => { resolve({ width: v.videoWidth, height: v.videoHeight, duration: v.duration }); URL.revokeObjectURL(v.src); };
    v.onerror = () => resolve({ width: 0, height: 0, duration: 0 });
    v.src = URL.createObjectURL(file);
  });
}

export async function upload(file: File, accept: 'image' | 'media', onStep?: (s: string) => void): Promise<MediaInfo> {
  const isImage = IMAGE_TYPES.includes(file.type), isVideo = VIDEO_TYPES.includes(file.type);
  if (!isImage && !(accept === 'media' && isVideo)) throw new Error(accept === 'image' ? 'Нужна картинка: JPG, PNG или WebP' : 'Нужно фото (JPG, PNG, WebP) или видео MP4');
  if (isImage && file.size > 20 * MB) throw new Error('Фото больше 20 МБ — уменьшите его перед загрузкой');
  if (isVideo && file.size > 100 * MB) throw new Error('Видео больше 100 МБ — сожмите его перед загрузкой');

  const d = new Date(), folder = `uploads/${d.getFullYear()}/${String(d.getMonth() + 1).padStart(2, '0')}`;
  const id = crypto.randomUUID();
  const ext = file.type === 'video/mp4' ? 'mp4' : file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
  const path = `${folder}/${id}.${ext}`;
  const store = db().storage.from(BUCKET);

  onStep?.('Загружаю файл…');
  fail((await store.upload(path, file, { contentType: file.type, upsert: false, cacheControl: '31536000' })).error, 'Не удалось загрузить файл');

  const row: Row = { id, kind: isVideo ? 'video' : 'image', bucket: BUCKET, path, mime: file.type, size_bytes: file.size, variants: {} };
  if (isImage) {
    onStep?.('Готовлю уменьшенные копии…');
    const { width, height, copies } = await webpCopies(file);
    row.width = width; row.height = height;
    const webp: Row = {};
    for (const c of copies) {
      const p = `${folder}/${id}-${c.w}.webp`;
      const { error } = await store.upload(p, c.blob, { contentType: 'image/webp', upsert: false, cacheControl: '31536000' });
      if (!error) webp[String(c.w)] = p;
    }
    row.variants = { webp };
  } else {
    const v = await videoSize(file);
    row.width = v.width || null; row.height = v.height || null; row.duration_s = v.duration ? Math.round(v.duration * 100) / 100 : null;
  }
  const { error } = await db().from('media').insert(row);
  fail(error, 'Файл загружен, но не записан в базу');
  return { id, kind: row.kind, mime: file.type, url: publicUrl(path), thumb: row.variants.webp?.['640'] ? publicUrl(row.variants.webp['640']) : null };
}
