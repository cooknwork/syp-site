import { content as seed } from '@/data/seed';
import { loadContent } from '@/data/remote';
import { serverClient } from '@/lib/supabase';
import { SypWorld } from '@/features/world/SypWorld';

// Content is read from the database at build time (published rows only), so the first paint already
// shows real data; the browser then re-reads the database, so new publications appear without a rebuild.
// If the database is unreachable during the build, the built-in starting content is used.
export default async function Home() {
  let content = seed;
  try {
    content = await loadContent(serverClient(), { preview: false });
  } catch (e) {
    console.warn('[build] database not reachable, using starting content:', (e as Error).message);
  }
  return <SypWorld content={content} />;
}
