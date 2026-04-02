# TASKS.md — Void Survivor v6

> Используй как очередь для Claude Code.  
> Одна задача = одна сессия Claude Code (~1-2 часа).  
> Начинай каждую сессию: "Read AGENTS.md, PRD.md, PLANNING.md. Current task: [задача]"  
> После завершения ставь [x].

---

## Milestone 0: Критический баг — карта сбрасывается при level up

- [x] **M0-1** (Simple) — ~~Разделить `spawnWave(w)` на две функции~~ → Волны полностью убраны, непрерывный спавн

---

## Milestone 1: Extraction Mode

- [x] **M1-1** — `initExtraction()`, зона с `{ x, y, radius: 80 }`
- [x] **M1-2** — Рендер: пульсирующий зелёный круг, надпись "EXTRACT", точка на мини-карте
- [x] **M1-3** — HUD: таймер (белый→оранжевый→красный), стрелка к зоне, WARNING при < 60 сек
- [x] **M1-4** — Логика зоны: прогресс-бар "EXTRACTING", triggerSuccess/triggerFailed
- [x] **M1-5** — Экраны SUCCESS (зелёный) и FAILED (красный, ore lost, XP -50%)
- [x] **M1-6** — 4 типа локаций: Abandoned Field / Contested Zone / Rich Vein / Void Storm

---

## Milestone 2: Система боссов

- [x] **M2-base** — Базовая система боссов:
  - Рандомный спавн (4% шанс за тик), max 2 за вылазку, max 1 одновременно
  - Красный вращающийся шестиугольник, HP 500, преследует игрока
  - Стреляет красными пулями в позицию игрока каждые 2 сек
  - Boss HP bar сверху экрана
  - Дроп: 5-10 руды + XP gems
  - Красная точка на мини-карте

- [ ] **M2-next** — Расширение боссов (backlog):
  - Разные типы боссов с уникальными атаками
  - Расширенный набор оружия у боссов
  - Уникальные спрайты для каждого типа

---

## Milestone 3: Vite миграция

- [ ] **M3-1** (Simple) — Инициализировать Vite проект:
  - `npm create vite@latest void-survivor -- --template vanilla`
  - Скопировать текущий `index.html` как отправную точку
  - Убедиться что `npm run dev` запускается

- [ ] **M3-2** (Medium) — Создать `src/config.js` и `src/state.js`:
  - Вынести все константы из монолита в `config.js`
  - Вынести объект `G` в `state.js`
  - Убедиться что игра запускается после

- [ ] **M3-3** (Medium) — Вынести `src/game/world.js`:
  - `genWorld()`, `genObstacles()`, логика препятствий

- [ ] **M3-4** (Medium) — Вынести `src/game/enemies.js`, `src/game/bosses.js` и `src/game/player.js`

- [ ] **M3-5** (Medium) — Вынести `src/render/renderer.js`, `src/render/hud.js`, `src/render/minimap.js`

- [ ] **M3-6** (Medium) — Вынести `src/web3/wallet.js`, `src/web3/contract.js`

- [ ] **M3-7** (Simple) — Проверить финальный билд:
  - `npm run build` → `dist/index.html` работает без сервера
  - Все фичи работают: web3, mining, extraction, боссы

---

## Milestone 4: Cloudflare Workers + D1 Бэкенд

- [ ] **M4-1** (Simple) — Создать Cloudflare Workers проект:
  - `wrangler init workers`
  - Создать `wrangler.toml` с D1 binding

- [ ] **M4-2** (Simple) — Применить D1 схему:
  - `wrangler d1 create void-survivor-db`
  - `wrangler d1 execute void-survivor-db --file workers/schema.sql`

- [ ] **M4-3** (Medium) — Реализовать `POST /api/save-run`:
  - Принять `{ run, signature }`, верифицировать EIP-191 подпись
  - Записать в таблицу `runs`, обновить `players`
  - Вернуть `{ ok: true, rank }`

- [ ] **M4-4** (Simple) — Реализовать `GET /api/leaderboard`:
  - TOP-10 по `ore_total` из таблицы `players`
  - Кэшировать 60 сек (`Cache-Control: max-age=60`)

- [ ] **M4-5** (Medium) — Интеграция в игру:
  - `src/web3/backend.js`: `saveRun()` вызывается при SUCCESS
  - Подпись: `await wallet.signMessage(JSON.stringify(runData))`
  - При ошибке — тихо пропускаем (не блокируем геймплей)

- [ ] **M4-6** (Medium) — Экран лидерборда в игре:
  - Новый экран `phase = 'leaderboard'`
  - Кнопка "Leaderboard" в главном меню
  - Загрузка из API, отображение топ-10 (адрес сокращённый + ore)

---

## Milestone 5: Cloudflare Pages деплой

- [ ] **M5-1** (Simple) — Создать Cloudflare Pages проект:
  - `wrangler pages project create void-survivor`
  - Настроить: Build command `npm run build`, Output dir `dist`

- [ ] **M5-2** (Simple) — Настроить CI: push to `main` → автодеплой

- [ ] **M5-3** (Simple) — Обновить ссылки в README, Twitter (после домена)

---

## Backlog (не в этом спринте)

- [ ] Вражеские пули (`G.eBuls` система) — из PRD v1.2 UX
- [ ] Damage numbers + weapon trails
- [ ] Анимация смерти (debris particles)
- [ ] Base Mainnet деплой VoidOreMinter
- [ ] Fullscreen кнопка
- [ ] Twitter/devlog автоматизация
