# PLANNING.md — Void Survivor v6

## Архитектура

Игра переходит с монолитного HTML на **Vite-based модульную структуру** с сохранением Canvas 2D рендера.
Бэкенд — Cloudflare Workers + D1 (serverless, бесплатный tier).
Блокчейн — ethers.js v6, Base Sepolia → Mainnet.

```
Браузер (Canvas 2D + Vite build)
    ↕ ethers.js v6
Base Blockchain (VoidOreMinter.sol)
    ↕ fetch API
Cloudflare Workers (REST API)
    ↕ D1 SQL
Cloudflare D1 (players, runs, purchases)
```

---

## Стек

| Слой | Технология | Статус |
|------|-----------|--------|
| Игровой движок | Vanilla JS + Canvas 2D | ✅ v5 готово |
| Сборка | Vite 5 | 📋 миграция |
| Хостинг | Cloudflare Pages | 📋 миграция |
| Бэкенд | Cloudflare Workers | 📋 |
| База данных | Cloudflare D1 (SQLite) | 📋 |
| Blockchain | Base Sepolia → Mainnet | Sepolia ✅ |
| Контракт ore | VoidOreMinter.sol | ✅ Sepolia |
| Web3 клиент | ethers.js v6 | ✅ |
| Деплой агент | Claude Code | основной |

**Ключевые зависимости:**
- `vite` — сборка, HMR в разработке, единый HTML на выходе
- `ethers` v6 — Web3 интеграция
- `wrangler` — деплой на Cloudflare Workers и Pages

---

## Структура директорий

```
void-survivor/
├── src/
│   ├── main.js              # Точка входа: инит игры, game loop
│   ├── config.js            # Константы: размеры мира, балансировка
│   ├── state.js             # Глобальный объект G (игровое состояние)
│   ├── game/
│   │   ├── world.js         # genWorldForWave(), препятствия, мини-карта
│   │   ├── enemies.js       # Враги: spawn, update, resetEnemyQueue()
│   │   ├── bosses.js        # Boss система: Harbinger, Colossus, Phantom
│   │   ├── player.js        # Движение, collision, смерть
│   │   ├── weapons.js       # Оружия, пули, вражеские пули (G.eBuls)
│   │   ├── mining.js        # Сканирование, добыча руды, дроп
│   │   ├── extraction.js    # ExtractionZone, таймер, SUCCESS/FAILED
│   │   └── upgrades.js      # Level up, пассивки, выбор апгрейда
│   ├── render/
│   │   ├── renderer.js      # Главный draw loop
│   │   ├── hud.js           # HUD: HP, ore, таймер, стрелка к Extraction
│   │   ├── effects.js       # Damage numbers, weapon trails, смерть-debris
│   │   └── minimap.js       # Мини-карта
│   ├── ui/
│   │   ├── screens.js       # Menu, Hangar, Game Over, SUCCESS/FAILED
│   │   └── shop.js          # Магазин кораблей
│   └── web3/
│       ├── wallet.js        # Подключение, EIP-1193, chain check
│       ├── contract.js      # VoidOreMinter ABI, buyOre(), getBalance()
│       └── backend.js       # fetch к Cloudflare Workers API
├── workers/
│   ├── api.js               # Cloudflare Worker: роутер
│   ├── routes/
│   │   ├── save-run.js      # POST /api/save-run
│   │   ├── leaderboard.js   # GET /api/leaderboard
│   │   └── player.js        # GET /api/player/:addr
│   └── schema.sql           # D1 схема
├── contracts/
│   └── VoidOreMinter.sol    # Уже задеплоен на Sepolia
├── index.html               # Точка входа Vite
├── vite.config.js
├── wrangler.toml
├── PRD.md
├── PLANNING.md
├── AGENTS.md
└── TASKS.md
```

---

## Ключевые компоненты

### world.js
- `genWorld()` — генерация карты (один раз при старте рана)
- `genObstacles(wave)` — создаёт астероиды, туманности, кристаллы с учётом локации

### enemies.js
- `trySpawnEnemies()` — каждые ~2 сек, если < 5 видимых врагов → шанс спавна
- `SPAWN_RATES`: seek 60%, fast 30%, heavy 15% (множитель от локации)
- Враги спавнятся непрерывно, волновой системы нет

### extraction.js
- `ExtractionZone` объект: `{ x, y, radius: 80, active: true }`
- `updateExtraction(dt)` — таймер, проверка коллизии с игроком
- `renderExtractionZone(ctx)` — пульсирующий зелёный круг
- `hudArrowToExtraction(ctx)` — стрелка на HUD

### bosses.js
- `trySpawnBoss()` — рандомный спавн (4% шанс за тик), max 2 за ран, max 1 одновременно
- Босс: HP 500, преследует игрока, стреляет в позицию игрока каждые 2 сек
- Дроп: 5-10 руды + XP gems
- `updateBoss(dt)`, `killBoss()`, `drawBoss(t)` — логика и рендер
- Boss HP bar — широкая полоска сверху экрана

### backend.js
- `saveRun(runData, signature)` → `POST /api/save-run`
- `getLeaderboard()` → `GET /api/leaderboard`
- Подпись: `ethers.signMessage(JSON.stringify(runData))`

---

## Модели данных (Cloudflare D1)

```sql
-- schema.sql
CREATE TABLE players (
  address TEXT PRIMARY KEY,
  ore_total INTEGER DEFAULT 0,
  runs_count INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  created_at INTEGER
);

CREATE TABLE runs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  address TEXT,
  score INTEGER,
  wave INTEGER,
  ore INTEGER,
  ship_id INTEGER,
  extracted INTEGER,  -- 1=success, 0=failed
  timestamp INTEGER
);
```

---

## API (Cloudflare Workers)

| Метод | Путь | Описание |
|-------|------|---------|
| POST | `/api/save-run` | Сохранить результат рана (с подписью) |
| GET | `/api/leaderboard` | Топ-10 по ore_total |
| GET | `/api/player/:addr` | Статистика одного игрока |

Аутентификация: `X-Signature` header = EIP-191 подпись тела запроса.

---

## Порядок реализации (Milestones)

1. ~~**Bugfix** — фикс map reset~~ ✅ ГОТОВО
2. ~~**Extraction Mode** — зона, таймер, SUCCESS/FAILED, локации~~ ✅ ГОТОВО
3. ~~**Враги и боссы** — убраны волны, непрерывный спавн, босс с пушкой~~ ✅ ГОТОВО
4. **Vite миграция** — разбить монолит на модули по структуре выше
5. **Cloudflare Workers + D1** — бэкенд API, лидерборд
6. **Cloudflare Pages деплой** — заменить GitHub Pages
