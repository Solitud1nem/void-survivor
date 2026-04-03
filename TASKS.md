# TASKS.md — Void Survivor v6

> Одна задача = одна сессия Claude Code.
> Начинай: "Read AGENTS.md, PRD.md, PLANNING.md. Current task: [задача]"
> После завершения ставь [x].

---

## ✅ ЗАКРЫТО

- [x] M3-1 — Vite инициализирован (src/main.js, npm run dev работает)
- [x] Extraction Mode (зона, таймер, SUCCESS/FAILED, 4 типа локаций)
- [x] Система боссов (Harbinger, Colossus, Phantom Wraith)
- [x] Баг map reset при level up (не воспроизводится в v6)

---

## 🔧 REFACTOR SPRINT — сначала это

> Цель: разбить src/main.js (~2000 строк) на модули.
> После каждого шага: npm run dev, проверить что игра работает.
> Не переходить к следующему шагу если предыдущий сломал что-то.

- [ ] **R1** (Simple) — Вынести `src/config.js`
  - Все константы верхнего уровня: WW, WH, SPAWN_RADIUS, SCAN_MAX, ORE_VALUE, LOCATIONS и т.д.
  - Экспортировать: `export const WW = 2400` и т.д. (named exports)
  - В main.js: `import { WW, WH, SCAN_MAX, ... } from './config.js'`
  - Проверка: npm run dev, игра запускается, константы работают

- [ ] **R2** (Simple) — Вынести `src/state.js`
  - Функция `mkG()` — создаёт и возвращает начальное состояние G
  - Экспортировать: `export { mkG }`
  - META объект (накопительный прогресс) — тоже сюда
  - В main.js: `import { mkG } from './state.js'; let G = mkG()`
  - Проверка: npm run dev, новая игра стартует корректно

- [ ] **R3** (Medium) — Вынести `src/world.js`
  - Функции генерации мира: `genWorldForWave()`, `genObstacles()`, `genNebulae()`
  - Принимают `(G, config)` как параметры — не используют глобалы
  - Экспортировать: `export { genWorldForWave }`
  - Проверка: npm run dev, карта генерируется при старте рана

- [ ] **R4** (Medium) — Вынести `src/enemies.js`
  - `spawnEnemies()`, `updateEnemies()`, `resetEnemyQueue()`
  - Принимают `(G, dt, config)` как параметры
  - Экспортировать: `export { spawnEnemies, updateEnemies, resetEnemyQueue }`
  - Проверка: враги спавнятся и двигаются корректно

- [ ] **R5** (Medium) — Вынести `src/render.js`
  - Все функции: `draw*()`, `_draw*()`, `renderHUD()`, `renderMinimap()`, `renderEffects()`
  - Главная точка входа: `export function drawFrame(G, C, cam, config)`
  - Не трогает G напрямую — только читает для рендера
  - Проверка: npm run dev, вся графика работает как прежде

- [ ] **R6** (Medium) — Вынести `src/web3.js`
  - `w3Init()`, `connectWallet()`, `buyOre()`, `getOreBalance()`, W3_CFG, ABI
  - Не знает об объекте G — только принимает параметры, возвращает результаты
  - Экспортировать: `export { w3Init, connectWallet, buyOre, W3_CFG }`
  - В main.js: `import { w3Init, connectWallet } from './web3.js'`
  - Проверка: Connect Wallet работает, покупка ore работает на Sepolia

  > После R1–R6 main.js должен содержать только:
  > game loop, update логику, input handlers — ~600–800 строк.
  > Целевая структура:
  > src/config.js  ~80 строк
  > src/state.js   ~100 строк
  > src/world.js   ~200 строк
  > src/enemies.js ~250 строк
  > src/render.js  ~600 строк
  > src/web3.js    ~200 строк
  > src/main.js    ~600 строк (game loop + input)

---

## 🎮 GAMEPLAY SPRINT — после рефакторинга

> Цель: довести геймплей до уровня когда не стыдно показать людям.
> Инфра (Workers, D1, Mainnet) — после этого спринта.

### Milestone G1: Tension (игрок должен уворачиваться)

- [ ] **G1-1** (Medium) — Враги стреляют: система G.eBuls
  - Отдельный массив вражеских пуль: `G.eBuls = []`
  - Каждый враг стреляет в позицию игрока В МОМЕНТ выстрела (не leading)
  - seek: cooldown 2500мс, дальность 300, урон 8, цвет #ff4444
  - heavy: cooldown 1800мс, дальность 250, урон 14, цвет #ff8800
  - fast: cooldown 3500мс, дальность 200, урон 5, цвет #cc44ff
  - Рендер в render.js: маленькие кружки в цвете врага, лёгкий glow
  - Коллизия с игроком в enemies.js: стандартная
  - Проверка: враги стреляют, игрок получает урон от их пуль

- [ ] **G1-2** (Simple) — Fullscreen кнопка
  - Кнопка ⛶ рисуется на Canvas в правом нижнем углу (в render.js)
  - CV.requestFullscreen() по клику на эту область (в main.js input handler)
  - При fullscreenchange: Canvas 100vw/100vh, maxWidth: none
  - Escape: приоритет — сначала fullscreen, потом пауза
  - Проверка: кнопка разворачивает и сворачивает, пауза работает независимо

---

### Milestone G2: Feel (каждое действие ощущается)

- [ ] **G2-1** (Simple) — Damage numbers
  - `G.dmgNums = []` — массив `{ x, y, val, life, vy }` — в state.js
  - При попадании: push в enemies.js
  - Рендер и update в render.js: `n.y -= n.vy; n.life -= dt/800`
  - Размер: `10 + val/10`px, globalAlpha = n.life, цвет белый
  - Проверка: цифры вылетают вверх и исчезают при попадании

- [ ] **G2-2** (Medium) — Weapon trails
  - Каждая пуля хранит `b.trail = []` — последние 20 позиций
  - Обновление в main.js (game loop): `b.trail.push({x,y}); if > 20 shift()`
  - Рендер в render.js: gradient fade, `globalAlpha = (i/trail.length)*0.4`
  - Цвет по типу оружия
  - Проверка: за пулями тянется светящийся след

- [ ] **G2-3** (Medium) — Цветные искры + экран смерти
  - Искры при ударе об астероид (enemies.js): poor=#888899, medium=#ffaa44, rich=#44ffaa
  - Смерть: `G.debris = []` — 18 обломков, 2.5 сек анимация + camera zoom out
  - Game Over экран — только после окончания анимации
  - Проверка: искры работают; корабль красиво разлетается при гибели

---

### Milestone G3: Depth (реиграбельность)

- [ ] **G3-1** (Medium) — Биомы волн
  - 4 типа в config.js: asteroid_belt / void_storm / siege_wave / swarm
  - Влияет на spawnEnemies() в enemies.js и genWorldForWave() в world.js
  - `G.biome` — текущий биом, устанавливается в начале каждой волны
  - Баннер в render.js: название биома по центру, 2 сек
  - Проверка: волны ощутимо разные по составу врагов и окружению

- [ ] **G3-2** (Medium) — Weapon synergies
  - Логика синергий в main.js (при подборе оружия): `G.synergy = checkSynergy(G.weapons)`
  - 4 комбинации: Pulse+Chain, Orbit+Scatter, Chain+Scatter, Pulse+Orbit
  - Эффекты применяются в game loop при стрельбе/попадании
  - Индикатор в render.js: небольшой текст на HUD под оружиями
  - Проверка: Pulse + Chain → Bolt Arc активируется и работает

---

### Milestone G4: Polish (лоск)

- [ ] **G4-1** (Simple) — Engine glow
  - `vel = Math.hypot(s.vx, s.vy); fl = 0.3 + min(0.7, vel/4)`
  - Передаётся в функцию рисования корабля в render.js
  - Проверка: при быстром движении выхлоп заметно ярче

- [ ] **G4-2** (Simple) — Анимированные туманности
  - В world.js или render.js: `n.pulse += dt * 0.0005`
  - scale = `1 + 0.05 * sin(n.pulse)`, лёгкий drift позиции
  - Проверка: туманности дышат, не дёргаются

---

## 🏗️ INFRA SPRINT — после геймплей-спринта

- [ ] M4-1 — Cloudflare Workers + wrangler.toml
- [ ] M4-2 — D1 схема (players, runs)
- [ ] M4-3 — POST /api/save-run с EIP-191 верификацией
- [ ] M4-4 — GET /api/leaderboard
- [ ] M4-5 — Интеграция save-run в игру (при SUCCESS)
- [ ] M4-6 — Экран лидерборда в игре
- [ ] M5-1 — Cloudflare Pages деплой
- [ ] M5-2 — CI: push to main → автодеплой

---

## 📋 BACKLOG

- [ ] Base Mainnet деплой VoidOreMinter (после Slither)
- [ ] NFT корабли VoidShips.sol (ERC-721)
- [ ] WebSocket мультиплеер (Durable Objects)
- [ ] Сезонная система VoidSeason.sol
- [ ] Мобильный Capacitor wrapper
- [ ] PvP арены с entry fee