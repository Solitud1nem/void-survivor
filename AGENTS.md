# AGENTS.md — Void Survivor v6

> Этот файл читает Claude Code перед каждой сессией. Содержит всё необходимое для работы с проектом.

---

## Контекст проекта

Void Survivor — браузерная Web3 игра (extraction shooter, стиль Vampire Survivors).
Canvas 2D, 600×600px viewport, мир 2400×2400. Vanilla JS, переходим на Vite.
Контракт VoidOreMinter.sol задеплоен на Base Sepolia.
Бэкенд — Cloudflare Workers + D1 (в разработке).

**Живая версия:** https://solitud1nem.github.io/void-survivor/

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

```
src/
  main.js          — game loop, инит
  config.js        — константы (WORLD_W, WORLD_H, WAVE_ENEMY_BASE и т.д.)
  state.js         — объект G: { player, enemies, bosses, ores, bullets, ... }
  game/
    world.js       — genWorldForWave(w), препятствия, мини-карта
    enemies.js     — spawn, update, resetEnemyQueue(w)
    bosses.js      — BossManager, Harbinger, Colossus, PhantomWraith
    player.js      — движение, collision, smert
    weapons.js     — оружия, G.buls, G.eBuls (вражеские пули)
    mining.js      — scan, добыча, дроп руды
    extraction.js  — ExtractionZone, таймер, SUCCESS/FAILED
    upgrades.js    — levelup, пассивки
  render/
    renderer.js    — главный draw()
    hud.js         — HP bar, ore counter, таймер, стрелка
    effects.js     — damage numbers, trails, debris
    minimap.js     — мини-карта (правый верхний угол)
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
// state.js — глобальный объект игры
const G = {
  // Игрок
  player: { x, y, hp, maxHp, ang, ship, ore, credits, xp, wave, score },

  // Мир
  asts: [],      // астероиды { x, y, r, type: 'poor'|'medium'|'rich', hp }
  crystals: [],  // кристаллы { x, y, r, hp }
  nebs: [],      // туманности { x, y, rx, ry }

  // Враги и боссы
  enemies: [],   // { x, y, hp, type: 'seek'|'heavy'|'fast', ... }
  boss: null,    // текущий босс или null

  // Пули
  buls: [],      // пули игрока { x, y, vx, vy, dmg, col, trail:[] }
  eBuls: [],     // пули врагов { x, y, vx, vy, dmg }

  // Extraction
  extraction: {
    zone: null,       // { x, y, radius: 80 }
    timer: 0,         // секунды до конца рана (180-300)
    playerInZone: 0,  // секунды внутри зоны (нужно 3)
    active: false,
  },

  // Эффекты
  dmgNums: [],   // { x, y, val, life, col, vy }
  particles: [], // { x, y, vx, vy, life, col, r }

  // Мета
  phase: 'menu', // 'menu'|'hangar'|'playing'|'paused'|'gameover'|'success'|'failed'
  cam: { x: 0, y: 0 }, // смещение камеры
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

- **Не трогать `genWorldForWave()`** при level up — только `resetEnemyQueue()`
- Не добавлять глобальные переменные кроме `G` и `CV` (canvas)
- Не писать логику рендера в `game/` файлах — только `render/`
- Не изменять файлы `web3/` без явного указания задачи
- Не использовать `innerHTML` или DOM-манипуляции — только Canvas
- Не вызывать `fetch` из игровой логики — только через `web3/backend.js`

---

## Лимит размера файлов — КРИТИЧНО

**Перед каждой задачей:**
```bash
wc -l src/main.js src/render.js src/web3.js 2>/dev/null
```

**Правила:**
- Любой файл > 1500 строк → СТОП, сначала вынести следующий логический блок
- Не добавлять новую фичу в файл > 1500 строк — только рефакторинг
- main.js должен содержать только: game loop, логику обновления, input. Всё остальное — в модулях

**Целевая структура после рефакторинга:**
- `src/config.js`  — ~80 строк (все константы)
- `src/state.js`   — ~100 строк (mkG(), META)
- `src/world.js`   — ~200 строк (генерация карты, препятствия)
- `src/enemies.js` — ~250 строк (spawn, update, коллизии)
- `src/render.js`  — ~600 строк (все draw* функции, HUD, minimap)
- `src/web3.js`    — ~200 строк (wallet, contract, ethers.js)
- `src/main.js`    — ~600 строк (game loop, update, input handlers)

---

## Workflow-правила для Claude Code

1. **Перед началом**: прочитай PRD.md, PLANNING.md, текущую задачу из TASKS.md
2. **Один файл за раз**: изменяй только файлы, указанные в задаче
3. **После изменений**: скажи что изменил и как проверить в браузере
4. **Extraction timer**: всегда в секундах в `G.extraction.timer`, не мс
5. **Boss spawn**: через `BossManager.spawnIfNeeded(G.player.wave)` после каждой wavecomplete
6. **Коммиты**: `feat(extraction): add zone timer and HUD arrow` / `fix(world): separate genWorld from resetEnemyQueue`
7. **Если задача неясна** — спроси, не додумывай

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

- `tryUpgrade('levelup')` вызывает `spawnWave()` → карта пересоздаётся → **первая задача в TASKS.md**
- Weapons иногда стреляют по невидимым врагам (за экраном) — низкий приоритет после v5