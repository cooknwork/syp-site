# SYP — сайт в формате смартфона

Интерактивный сайт бренда SYP: ночной пиксельный город, в центре — смартфон с приложениями (SYP, Мероприятия, Галерея, Билеты, Настройки, Сообщения), пять цветовых тем, мини-игра в городе и простая админка на `/admin`.

## Документы

- Архитектура и план (Этап 1): https://claude.ai/artifact/9q3ubDDXK1q2yEY4tTZv3A
- Правовые документы, черновик: https://claude.ai/artifact/6WKzdPqq89RpQN6CLx33xc
- Кликабельный прототип: https://claude.ai/artifact/JSsabfpTnhvPQ1R4Cfgz7h (копия — `prototype/index.html`)
- Тестовая сборка из этого репозитория: https://claude.ai/artifact/2JfAXtACGeAf68c2PsCZK9

## Стек

Next.js (App Router) · React · TypeScript · CSS · Supabase (PostgreSQL, Storage, Auth) · своя простая админка.
Сборка — GitHub Actions; хостинг для запуска (РФ) выбирается позже, код от этого не меняется.

## Структура

```text
prototype/            эталонный прототип Этапа 1 (один HTML-файл)
supabase/migrations/  схема базы данных и правила доступа (RLS)
supabase/seed.sql     стартовые данные: 5 тем, SLAY AND PLAY, контакты, настройки
docs/logo.svg         логотип SYP
```

```text
src/app/              страница и layout (шрифт Inter, темы до первой отрисовки)
src/data/             типы (как в БД) и стартовые данные; на Этапе 5 заменяются запросами к базе
src/features/city/    движок города на canvas: слои, люди, машины, билборды
src/features/phone/   телефон: статус-бар, домашний экран, Dock
src/features/window/  универсальное окно приложения
src/features/apps/    приложения SYP, Мероприятия, Билеты, Галерея, Настройки, Сообщения, документы
src/features/game/    игра SYP Run в городе
src/features/theme/   система тем (CSS-переменные из таблицы тем)
src/styles/           глобальные стили
scripts/              подготовка сборки для тестовой ссылки
```

## Сборка и тестовая ссылка

Каждый push в `main` собирается в GitHub Actions (`.github/workflows/preview.yml`): проверка типов, `next build`
(статический экспорт), затем результат — или лог ошибки — кладётся в ветку `preview` (см. `STATUS.txt` там).
Из ветки `preview` сборка публикуется тестовой ссылкой в Claude. Vercel и другие аккаунты не нужны.

Локально: `npm install && npm run dev`.

## База данных

- Публичный сайт читает только опубликованные записи; черновики правок хранятся в `content_drafts` и видны только админу.
- «Мероприятия» и «Билеты» читают одну таблицу `events`.
- У мероприятия две независимые картинки: `poster_id` (афиша в приложениях) и `billboard_image_id` (билборд в городе, 4:5). На билборде — мероприятие с `show_on_billboard`.
- Администратор — строка в `admin_users`; добавляется владельцем проекта через Supabase, не с сайта.

Применить к проекту Supabase:

```bash
supabase db push            # миграции
psql "$DATABASE_URL" -f supabase/seed.sql
```
