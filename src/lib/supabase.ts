import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from './config';

let browserClient: SupabaseClient | null = null;

/** One client per browser tab; keeps the admin session in localStorage. */
export function supabase(): SupabaseClient {
  if (typeof window === 'undefined') return serverClient();
  if (!browserClient) {
    browserClient = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
      auth: { persistSession: true, autoRefreshToken: true, storageKey: 'syp-admin' },
    });
  }
  return browserClient;
}

/** Anonymous client for the build (reads only published rows). */
export function serverClient(): SupabaseClient {
  return createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const BUCKET = 'media-public';
export const publicUrl = (path: string) => `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
