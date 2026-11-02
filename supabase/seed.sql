-- SYP — starting content. Only what the brief gives us; everything else stays empty until it is filled in the admin panel.

insert into themes (slug, name, mood, tokens, is_default, sort_order, publication) values
('original', 'SYP Original', 'Ночной город, неон, клубная культура',
 '{"background":"#170F1A","background-secondary":"#212332","surface":"#212332","surface-secondary":"#5F01CB","text-primary":"#D7E2FF","text-secondary":"#D096FD","accent-primary":"#FEFE00","accent-secondary":"#D096FD","accent-tertiary":"#3DF3C2"}',
 true, 1, 'published'),
('acid', 'Acid Playground', 'Кислотный цифровой playground',
 '{"background":"#212320","background-secondary":"#3D5A00","surface":"#3D5A00","surface-secondary":"#212320","text-primary":"#F8CE92","text-secondary":"#3DF3C2","accent-primary":"#FEFE00","accent-secondary":"#FD6414","accent-tertiary":"#3DF3C2"}',
 false, 2, 'published'),
('blue', 'Blue Hour', 'Холодный город, синий свет',
 '{"background":"#1724AE","background-secondary":"#212332","surface":"#212332","surface-secondary":"#271ECF","text-primary":"#D7E2FF","text-secondary":"#3DF3C2","accent-primary":"#3DF3C2","accent-secondary":"#FBD745","accent-tertiary":"#271ECF"}',
 false, 3, 'published'),
('pink', 'Pink Noise', 'Фиолетовый свет, дерзкий клуб',
 '{"background":"#170F1A","background-secondary":"#42005A","surface":"#42005A","surface-secondary":"#960262","text-primary":"#F8CE92","text-secondary":"#D096FD","accent-primary":"#D096FD","accent-secondary":"#FEFE00","accent-tertiary":"#960262"}',
 false, 4, 'published'),
('heat', 'Heatwave', 'Оранжевое освещение, энергия',
 '{"background":"#212320","background-secondary":"#592C02","surface":"#592C02","surface-secondary":"#932C19","text-primary":"#F8CE92","text-secondary":"#FBD745","accent-primary":"#FBD745","accent-secondary":"#F34E16","accent-tertiary":"#D02700"}',
 false, 5, 'published');

-- The one event from the brief. Date, venue, artists, poster and ticket link are added later in the admin panel.
insert into events (slug, title, event_status, show_on_billboard, publication, published_at)
values ('slay-and-play', 'SLAY AND PLAY', 'announce', true, 'published', now());

-- Channels exist but stay hidden until a link is added.
insert into contacts (platform, label, sort_order, is_visible) values
  ('instagram', 'Instagram', 1, false),
  ('telegram',  'Telegram',  2, false);

-- Single-row settings
insert into brand_content (id, name, publication) values (1, 'SYP', 'published');
insert into home_screen   (id) values (1);
insert into city_settings (id) values (1);
insert into game_settings (id, description) values (1, 'Беги по ночному городу и перепрыгивай машины, барьеры и колонки.');
insert into site_settings (id, site_name, meta_title) values (1, 'SYP', 'SYP');

-- Legal drafts: hidden from the public until the operator details are filled in and a lawyer has checked them.
insert into legal_documents (slug, title, sort_order, publication) values
  ('privacy', 'Политика конфиденциальности', 1, 'draft'),
  ('cookies', 'Cookie и хранение данных',    2, 'draft'),
  ('legal',   'Правовая информация',         3, 'draft');
