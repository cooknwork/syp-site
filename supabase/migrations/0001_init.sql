-- SYP — initial schema
-- Public site reads only published rows. Unpublished edits of published rows live in content_drafts (admin only).
-- One role: admin (listed in admin_users). Everything else is anonymous read-only.

create extension if not exists pgcrypto;

-- ---------- Types ----------
create type publication_status as enum ('draft', 'published', 'hidden');
create type event_status as enum ('announce', 'on_sale', 'sold_out', 'cancelled', 'past');
create type media_kind as enum ('image', 'video', 'svg');

-- ---------- Helpers ----------
create or replace function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ---------- Admins ----------
create table admin_users (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  email      text not null,
  created_at timestamptz not null default now()
);

create or replace function is_admin() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$;

-- ---------- Media ----------
create table media (
  id          uuid primary key default gen_random_uuid(),
  kind        media_kind not null,
  bucket      text not null default 'media-public',
  path        text not null unique,
  mime        text not null,
  size_bytes  integer not null check (size_bytes > 0),
  width       integer,
  height      integer,
  duration_s  numeric(8,2),
  alt         text,
  blur_data   text,                       -- tiny placeholder shown while loading
  variants    jsonb not null default '{}',-- {"webp":{"480":"path",...},"avif":{...}}
  created_at  timestamptz not null default now(),
  check (
    (kind = 'image' and size_bytes <= 20 * 1024 * 1024) or
    (kind = 'video' and size_bytes <= 100 * 1024 * 1024) or
    (kind = 'svg'   and size_bytes <= 1024 * 1024)
  )
);

-- ---------- Events (one entity for «Мероприятия» and «Билеты») ----------
create table events (
  id                 uuid primary key default gen_random_uuid(),
  slug               text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title              text not null,
  short_description  text,
  description        text,
  poster_id          uuid references media (id) on delete set null,   -- афиша в приложениях
  billboard_image_id uuid references media (id) on delete set null,   -- картинка для билборда в городе (4:5)
  show_on_billboard  boolean not null default false,
  starts_at          timestamptz,
  ends_at            timestamptz,
  timezone           text not null default 'Europe/Moscow',
  venue              text,
  address            text,
  artists            jsonb not null default '[]',  -- [{"name":"","role":"","url":""}]
  info_blocks        jsonb not null default '[]',  -- [{"title":"","text":""}]
  ticket_url         text check (ticket_url is null or ticket_url ~ '^https://'),
  event_status       event_status not null default 'announce',
  priority           integer not null default 0,
  sort_order         integer not null default 0,
  publication        publication_status not null default 'draft',
  published_at       timestamptz,
  deleted_at         timestamptz,                  -- soft delete, purged after 30 days
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  check (ends_at is null or starts_at is null or ends_at >= starts_at)
);
create index events_public_idx on events (publication, deleted_at, priority desc, sort_order, starts_at);
-- at most one event pinned to the billboard
create unique index events_one_billboard on events (show_on_billboard) where show_on_billboard and deleted_at is null;

-- ---------- Gallery ----------
create table gallery_albums (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title       text not null,
  cover_id    uuid references media (id) on delete set null,
  event_id    uuid references events (id) on delete set null,
  sort_order  integer not null default 0,
  publication publication_status not null default 'draft',
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create table gallery_items (
  id          uuid primary key default gen_random_uuid(),
  album_id    uuid references gallery_albums (id) on delete set null,
  media_id    uuid not null references media (id) on delete cascade,
  caption     text,
  taken_at    date,
  sort_order  integer not null default 0,
  publication publication_status not null default 'draft',
  deleted_at  timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index gallery_items_album_idx on gallery_items (album_id, sort_order);

-- ---------- Contacts («Сообщения») ----------
create table contacts (
  id          uuid primary key default gen_random_uuid(),
  platform    text not null,                 -- instagram | telegram | ...
  label       text not null,
  caption     text,
  url         text check (url is null or url ~ '^https://'),
  sort_order  integer not null default 0,
  is_visible  boolean not null default false,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ---------- Themes ----------
create table themes (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique check (slug ~ '^[a-z0-9-]+$'),
  name        text not null,
  mood        text,
  tokens      jsonb not null,               -- the 9 roles from the brief, hex values
  extra       jsonb not null default '{}',  -- optional overrides: glows, gradients, window colours
  is_default  boolean not null default false,
  sort_order  integer not null default 0,
  publication publication_status not null default 'draft',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  check (tokens ?& array['background','background-secondary','surface','surface-secondary',
                         'text-primary','text-secondary','accent-primary','accent-secondary','accent-tertiary'])
);
create unique index themes_one_default on themes (is_default) where is_default;

-- ---------- Legal documents ----------
create table legal_documents (
  id             uuid primary key default gen_random_uuid(),
  slug           text not null unique check (slug ~ '^[a-z0-9-]+$'),
  title          text not null,
  body           text not null default '',
  show_in_footer boolean not null default true,
  sort_order     integer not null default 0,
  publication    publication_status not null default 'draft',
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------- Single-row settings ----------
-- Each has exactly one row (id = 1). Public reads only when published.
create table brand_content (
  id          smallint primary key default 1 check (id = 1),
  name        text not null default 'SYP',
  short_description text,
  description text,
  philosophy  text,
  blocks      jsonb not null default '[]',   -- [{"type":"text","text":""},{"type":"image","media_id":""}]
  logo_id     uuid references media (id) on delete set null,
  publication publication_status not null default 'draft',
  updated_at  timestamptz not null default now()
);

create table home_screen (
  id          smallint primary key default 1 check (id = 1),
  logo_id     uuid references media (id) on delete set null,
  wallpaper   jsonb not null default '{"glow":0.55,"grain":0.22}',
  status_bar  jsonb not null default '{"visible":true}',
  apps        jsonb not null default '[{"key":"syp","visible":true},{"key":"events","visible":true},{"key":"gallery","visible":true},{"key":"tickets","visible":true}]',
  publication publication_status not null default 'published',
  updated_at  timestamptz not null default now()
);

create table city_settings (
  id              smallint primary key default 1 check (id = 1),
  glow_intensity  numeric(3,2) not null default 1 check (glow_intensity between 0 and 2),
  contrast        numeric(3,2) not null default 1 check (contrast between 0.5 and 1.5),
  brightness      numeric(3,2) not null default 1 check (brightness between 0.5 and 1.5),
  texture         numeric(3,2) not null default 0.2 check (texture between 0 and 1),
  animation_speed numeric(3,2) not null default 1 check (animation_speed between 0 and 2),
  layers          jsonb not null default '{"glows":true,"far":true,"mid":true,"signs":true,"near":true,"street":true,"life":true,"billboards":true}',
  overrides       jsonb not null default '{}',   -- optional colour overrides per theme
  publication     publication_status not null default 'published',
  updated_at      timestamptz not null default now()
);

create table game_settings (
  id           smallint primary key default 1 check (id = 1),
  is_visible   boolean not null default true,
  title        text not null default 'SYP Run',
  description  text,
  start_speed  numeric(5,2) not null default 1 check (start_speed between 0.5 and 2),
  max_speed    numeric(5,2) not null default 2.3 check (max_speed between 1 and 4),
  gravity      numeric(5,2) not null default 1 check (gravity between 0.5 and 2),
  jump_force   numeric(5,2) not null default 1 check (jump_force between 0.5 and 2),
  sprite_sheet_id uuid references media (id) on delete set null,
  publication  publication_status not null default 'published',
  updated_at   timestamptz not null default now()
);

create table site_settings (
  id               smallint primary key default 1 check (id = 1),
  site_name        text not null default 'SYP',
  meta_title       text,
  meta_description text,
  og_image_id      uuid references media (id) on delete set null,
  favicon_id       uuid references media (id) on delete set null,
  external_links   jsonb not null default '[]',
  publication      publication_status not null default 'published',
  updated_at       timestamptz not null default now()
);

-- ---------- Drafts of already-published content (admin only) ----------
create table content_drafts (
  entity     text not null,       -- table name, e.g. 'events'
  entity_id  text not null,       -- row id ('1' for single-row tables)
  data       jsonb not null,
  updated_by uuid references auth.users (id) on delete set null,
  updated_at timestamptz not null default now(),
  primary key (entity, entity_id)
);

-- ---------- updated_at triggers ----------
do $$
declare t text;
begin
  foreach t in array array['events','gallery_albums','gallery_items','contacts','themes','legal_documents',
                           'brand_content','home_screen','city_settings','game_settings','site_settings']
  loop
    execute format('create trigger %I before update on %I for each row execute function set_updated_at()', t || '_updated_at', t);
  end loop;
end $$;

-- ---------- Row Level Security ----------
do $$
declare t text;
begin
  -- content with publication + soft delete
  foreach t in array array['events','gallery_albums','gallery_items']
  loop
    execute format('alter table %I enable row level security', t);
    execute format($p$create policy %I on %I for select to anon, authenticated
                     using (publication = 'published' and deleted_at is null)$p$, t || '_public_read', t);
    execute format('create policy %I on %I for all to authenticated using (is_admin()) with check (is_admin())', t || '_admin_all', t);
  end loop;
  -- content with publication only
  foreach t in array array['themes','legal_documents','brand_content','home_screen','city_settings','game_settings','site_settings']
  loop
    execute format('alter table %I enable row level security', t);
    execute format($p$create policy %I on %I for select to anon, authenticated
                     using (publication = 'published')$p$, t || '_public_read', t);
    execute format('create policy %I on %I for all to authenticated using (is_admin()) with check (is_admin())', t || '_admin_all', t);
  end loop;
end $$;

alter table contacts enable row level security;
create policy contacts_public_read on contacts for select to anon, authenticated using (is_visible and url is not null);
create policy contacts_admin_all on contacts for all to authenticated using (is_admin()) with check (is_admin());

alter table media enable row level security;
create policy media_public_read on media for select to anon, authenticated using (bucket = 'media-public');
create policy media_admin_all on media for all to authenticated using (is_admin()) with check (is_admin());

alter table content_drafts enable row level security;
create policy content_drafts_admin_all on content_drafts for all to authenticated using (is_admin()) with check (is_admin());

alter table admin_users enable row level security;
create policy admin_users_self_read on admin_users for select to authenticated using (user_id = auth.uid());
-- admins are added by the project owner in the Supabase dashboard / SQL, never from the site

-- ---------- Storage ----------
-- media-public: optimised copies, readable by everyone. media-originals: untouched uploads, admin only.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types) values
  ('media-public',    'media-public',    true,  104857600,
     array['image/jpeg','image/png','image/webp','image/avif','image/svg+xml','video/mp4']),
  ('media-originals', 'media-originals', false, 104857600,
     array['image/jpeg','image/png','image/webp','image/svg+xml','video/mp4'])
on conflict (id) do nothing;

create policy storage_public_read on storage.objects for select to anon, authenticated
  using (bucket_id = 'media-public');
create policy storage_admin_write on storage.objects for all to authenticated
  using (bucket_id in ('media-public','media-originals') and is_admin())
  with check (bucket_id in ('media-public','media-originals') and is_admin());
