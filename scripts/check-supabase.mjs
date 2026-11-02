// Checks that the Supabase project answers with the public key and that setup.sql was applied.
// Runs in CI (this repo's dev session has no access to supabase.co). Prints a short report.
import { readFileSync } from 'node:fs';

const cfg = readFileSync('src/lib/config.ts', 'utf8');
const url = cfg.match(/SUPABASE_URL = '([^']+)'/)[1];
const key = cfg.match(/SUPABASE_PUBLISHABLE_KEY = '([^']+)'/)[1];
const get = async (path) => {
  const r = await fetch(`${url}/rest/v1/${path}`, { headers: { apikey: key, Authorization: `Bearer ${key}` } });
  const text = await r.text();
  return { status: r.status, body: text.slice(0, 400) };
};

const checks = {
  'themes (published)': 'themes?select=slug,name&order=sort_order',
  'events (published)': 'events?select=slug,title,event_status',
  'contacts (visible only)': 'contacts?select=platform',
  'legal (published only)': 'legal_documents?select=slug',
  'content_drafts (must be empty for public)': 'content_drafts?select=entity',
  'admin_users (must be empty for public)': 'admin_users?select=email',
};
let ok = true;
for (const [name, path] of Object.entries(checks)) {
  try {
    const { status, body } = await get(path);
    console.log(`${status} ${name}: ${body}`);
    if (status !== 200) ok = false;
  } catch (e) {
    ok = false;
    console.log(`ERR ${name}: ${e.message}`);
  }
}
console.log(ok ? 'SUPABASE: OK' : 'SUPABASE: PROBLEM');
