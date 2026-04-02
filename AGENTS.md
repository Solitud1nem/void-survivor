# AGENTS.md — Void Survivor v6

> Этот файл читает Claude Code перед каждой сессией. Содержит всё необходимое для работы с проектом.

---

## Контекст проекта

Void Survivor — браузерная Web3 игра (extraction shooter, стиль Vampire Survivors).
Canvas 2D, 600×600px viewport, мир 2400×2400. Vanilla JS, переходим на Vite.
Контракт VoidOreMinter.sol задеплоен на Base Sepolia.
Бэкенд — Cloudflare Workers + D1 (в разработке).

**Живая версия:** https://solitud1nem.github.io/void-survivor/

### Геймплей
- **Extraction loop**: дроп на карту → добыча руды → выживание → эвакуация через Extraction Zone
- **Враги**: спавнятся непрерывно (нет волн!), max 5 видимых одновременно
- **Боссы**: спавнятся рандомно, max 2 за вылазку, max 1 одновременно на экране
- **Локации**: 4 типа (Abandoned Field / Contested Zone / Rich Vein / Void Storm) с разной длительностью и сложностью
- **Level up**: при наборе XP показывается экран апгрейда, враги остаются как были

---

## Технический стек

- **Язык**: JavaScript (ES2022, ESModules)
- **Сборка**: Vite 5 (`npm run dev` / `npm run build`)
- **Рендер**: Canvas 2D API — без WebGL, без Three.js, без React
- **Web3**: ethers.js v6
- **Бэкенд**: Cloudflare Workers (wrangler), D1 (SQLite)
- **Деплой**: Cloudflare Pages (`wrangler pages deploy`)
- **Тесты**: нет (игровая логика — ручное тестирование через браузер)

---

## Структура кода

Сейчас весь код в **index.html** (монолит). Планируемая модульная структура (Milestone 3):

```
src/
  main.js          — game loop, инит
  config.js        — константы, LOCATIONS, ENEMY_CFG, BOSS_CFG, SPAWN_RATES
  state.js         — объект G
  game/
    world.js       — genWorld(), genObstacles(), препятствия
    enemies.js     — trySpawnEnemies(), spawnEn(), killEn()
    bosses.js      — trySpawnBoss(), updateBoss(), killBoss(), drawBoss()
    player.js      — движение, collision, смерть
    weapons.js     — оружия, G.buls (общий массив, isEnemy для вражеских)
    mining.js      — scan, добыча, дроп руды
    extraction.js  — initExtraction(), triggerSuccess(), triggerFailed()
    upgrades.js    — levelup, пассивки
  render/
    renderer.js    — главный draw()
    hud.js         — HP bar, ore counter, extraction timer, стрелка, boss HP bar
    effects.js     — damage numbers, trails, debris
    minimap.js     — мини-карта
  ui/
    screens.js     — Menu, Hangar, GameOver, Success, Failed
    shop.js        — покупка кораблей за кредиты
  web3/
    wallet.js      — connect(), switchChain(), getAddress()
    contract.js    — buyOre(), getOreBalance()
    backend.js     — saveRun(), getLeaderboard()
workers/
  api.js           — роутер Worker
  routes/          — save-run.js, leaderboard.js, player.js
  schema.sql       — D1 схема
```

---

## Ключевые переменные состояния (объект G)

```js
// Основные поля объекта G (создаётся в mkG())
const G = {
  ph: 'menu',      // 'menu'|'play'|'pause'|'upgrade'|'shop'|'over'|'success'|'failed'
  score: 0, lvl: 1, xp: 0, xpMax: XP_BASE,
  gameT: 0,        // общее время игры (мс)
  banT: 0,         // таймер баннера при старте

  // Игрок
  s: { x, y, hp, mhp, ang, invT, u:{...} },

  // Мир
  obs: [],          // препятствия { x, y, r, tp:'asteroid'|'nebula'|'crystal', ... }
  location: null,   // текущая локация { id, name, dur, oreDistro, asteroids, enemies, col }

  // Враги и боссы (непрерывный спавн, без волн!)
  ens: [],          // { x, y, hp, tp:'seek'|'heavy'|'fast', ... }
  boss: null,       // текущий босс или null
  bossCount: 0,     // сколько боссов было за ран (max 2)
  spawnT: 0,        // аккумулятор для спавн-тика (~2 сек)

  // Пули (общий массив для игрока и врагов)
  buls: [],         // { x, y, vx, vy, dmg, life, tp, r, isEnemy? }

  // Extraction
  extraction: {
    zone: null,       // { x, y, radius: 80 }
    timer: 0,         // секунды до конца рана
    playerInZone: 0,  // секунды внутри зоны (нужно 3)
    active: false,
  },

  // Эффекты
  parts: [],        // частицы
  gems: [],         // XP gems
  orbs: [],         // orbit shields

  cam: { x: 0, y: 0 },
};
```

---

## Правила стиля

- **Нет TypeScript** — чистый JS с JSDoc-комментариями для сложных функций
- **Нет классов** для игровых объектов — простые объекты `{}` и функции
- **Исключение**: боссы (`Harbinger`, `Colossus`, `PhantomWraith`) — классы с `update(dt)` и `render(ctx)`
- Константы — в `config.js`, не хардкодить в логике
- Все размеры и таймеры — через `config.js`
- Canvas `ctx` всегда передаётся как аргумент, не глобальная переменная
- Функции — максимум 40-50 строк, потом разбиваем

---

## Запрещённые паттерны

- **Нет волн** — враги спавнятся непрерывно, не использовать wave-логику
- **Level up НЕ сбрасывает врагов** — просто показывает экран апгрейда
- Не добавлять глобальные переменные кроме `G` и `CV` (canvas)
- Не писать логику рендера в `game/` файлах — только `render/`
- Не изменять файлы `web3/` без явного указания задачи
- Не использовать `innerHTML` или DOM-манипуляции — только Canvas
- Не вызывать `fetch` из игровой логики — только через `web3/backend.js`

---

## Workflow-правила для Claude Code

1. **Перед началом**: прочитай PRD.md, PLANNING.md, текущую задачу из TASKS.md
2. **Один файл за раз**: изменяй только файлы, указанные в задаче
3. **После изменений**: скажи что изменил и как проверить в браузере
4. **Extraction timer**: всегда в секундах в `G.extraction.timer`, не мс
5. **Boss spawn**: рандомный через `trySpawnBoss()`, каждые ~2 сек проверка
6. **Enemy spawn**: непрерывный через `trySpawnEnemies()`, max 5 видимых
7. **Коммиты**: `feat(extraction): add zone timer and HUD arrow` / `refactor: remove wave system`
8. **Если задача неясна** — спроси, не додумывай

---

## Как запустить локально

```bash
npm install
npm run dev        # Vite dev server на localhost:5173
npm run build      # Сборка в dist/
npm run preview    # Предпросмотр билда
```

## Как задеплоить

```bash
# Cloudflare Pages
wrangler pages deploy dist --project-name void-survivor

# Cloudflare Worker
wrangler deploy workers/api.js
```

---

## Известные баги (не трогай, пока не дойдёт очередь)

- ~~`tryUpgrade('levelup')` вызывает `spawnWave()` → карта пересоздаётся~~ — **ИСПРАВЛЕНО**, волны убраны
- Weapons иногда стреляют по невидимым врагам (за экраном) — низкий приоритет после v5
