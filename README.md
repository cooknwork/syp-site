# SYP — сайт в формате смартфона

Интерактивный сайт бренда SYP: ночной пиксельный город, в центре — смартфон с приложениями (SYP, Мероприятия, Галерея, Билеты, Настройки, Сообщения), пять цветовых тем, мини-игра в городе и простая админка на `/admin`.

## Документы

- Архитектура и план (Этап 1): https://claude.ai/artifact/9q3ubDDXK1q2yEY4tTZv3A
- Правовые документы, черновик: https://claude.ai/artifact/6WKzdPqq89RpQN6CLx33xc
- Кликабельный прототип: https://claude.ai/artifact/JSsabfpTnhvPQ1R4Cfgz7h (копия — `prototype/index.html`)

## Стек

Next.js (App Router) · React · TypeScript · CSS Modules · Supabase (PostgreSQL, Storage, Auth) · своя простая админка.
Хостинг для разработки — Vercel; хостинг для запуска (РФ) выбирается позже, код от этого не меняется.

## Структура

```text
prototype/            эталонный прототип Этапа 1 (один HTML-файл)
supabase/migrations/  схема базы данных и правила доступа (RLS)
supabase/seed.sql     стартовые данные: 5 тем, SLAY AND PLAY, контакты, настройки
docs/logo.svg         логотип SYP
```

Код Next.js-приложения появляется на Этапе 2.

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
