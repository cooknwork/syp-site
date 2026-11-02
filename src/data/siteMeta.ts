// «Общие настройки» from the admin panel → <title>, description, social preview image and favicon.
// Read at build time: messengers and search engines read the static HTML and do not run scripts.
import { publicUrl, serverClient } from '@/lib/supabase';

export interface SiteMeta {
  title: string;
  description: string;
  siteName: string;
  ogImage: { url: string; width?: number; height?: number } | null;
  favicon: { url: string; type: string } | null;
}

export const DEFAULT_META: SiteMeta = {
  title: 'SYP',
  description: 'SYP — цифровой мир бренда: мероприятия, билеты, галерея и мини-игра.',
  siteName: 'SYP',
  ogImage: null,
  favicon: null,
};

export async function loadSiteMeta(): Promise<SiteMeta> {
  try {
    const db = serverClient();
    const { data: s, error } = await db.from('site_settings').select('*').eq('id', 1).maybeSingle();
    if (error || !s || s.publication !== 'published') return DEFAULT_META;
    const ids = [s.og_image_id, s.favicon_id].filter(Boolean);
    const { data: media } = ids.length ? await db.from('media').select('id,path,mime,width,height').in('id', ids) : { data: [] };
    const m = (id: string | null) => (id ? (media ?? []).find((x) => x.id === id) : undefined);
    const og = m(s.og_image_id), fav = m(s.favicon_id);
    return {
      siteName: s.site_name || DEFAULT_META.siteName,
      title: s.meta_title || s.site_name || DEFAULT_META.title,
      description: s.meta_description || DEFAULT_META.description,
      // originals (JPG/PNG): messengers handle them more reliably than WebP
      ogImage: og ? { url: publicUrl(og.path), width: og.width ?? undefined, height: og.height ?? undefined } : null,
      favicon: fav ? { url: publicUrl(fav.path), type: fav.mime } : null,
    };
  } catch {
    return DEFAULT_META;
  }
}
