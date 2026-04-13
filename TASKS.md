# TASKS.md — Void Survivor

> Одна задача = одна сессия Claude Code (~1-2 часа).
> Начинай: "Read AGENTS.md, PRD.md, PLANNING.md. Current task: [задача]"
> Проверяй размер файлов: `wc -l src/*.js` — перед каждой задачей.
> После завершения ставь [x].

---

## ✅ ЗАКРЫТО

- [x] Vite миграция (src/main.js, npm run dev)
- [x] Полная декомпозиция: config / state / world / enemies / render / web3 / main
- [x] Extraction Mode (зона, таймер, SUCCESS/FAILED, 4 типа локаций)
- [x] Система боссов (рандомный спавн, стрельба, дроп руды)
- [x] Баг map reset при level up (не воспроизводится)
- [x] G1-1 Враги стреляют (G.eBuls, cooldown/range/dmg по типу)
- [x] G1-2 Fullscreen (canvas + F key, ESC приоритет)
- [x] G2-1 Damage numbers
- [x] G2-2 Weapon trails (20-point fade)
- [x] G2-3 Цветные искры + анимация смерти (2.5s debris)
- [x] G3-2 Weapon synergies (Bolt Arc, Nova Burst, Storm, Charged Orbs)
- [x] G4-1 Engine glow
- [x] G4-2 Анимированные туманности
- [x] Landscape 960×540, мир 3600×3600, мини-карта 192×192

---

## 🔒 СТАБИЛИЗАЦИЯ — блокеры перед деплоем

> Без этих задач игра нестабильна в продакшне. Делать первыми.

- [x] **S1** (Simple) — Защита game loop
  - Обернуть тело `loop()` в try/catch в main.js
  - При поимке ошибки: `console.error('[VS crash]', e)` + `G.ph = 'error'`
  - Добавить фазу `'error'` в render.js: тёмный экран, текст "Something went wrong",
    кнопка "Reload" (`act:'reload'`, в click() вызывает `location.reload()`)
  - Проверка: вызвать `throw new Error('test')` в update() — игра показывает экран,
    не зависает

- [x] **S2** (Simple) — Автопауза при потере фокуса
  - Добавить в main.js:
    `document.addEventListener('visibilitychange', () => { if (document.hidden && G.ph==='play') G.ph='pause'; })`
  - Проверка: переключить вкладку во время игры → при возврате игра на паузе

- [x] **S3** (Simple) — Замена confirm() на Canvas-попап в web3.js
  - Убрать `confirm(...)` из `w3BuyOre()`
  - Заменить на Canvas-модал через bR: показать панель подтверждения с кнопками
    "Confirm" и "Cancel" (аналогично w3DrawShopPanel)
  - `G.ph` менять не нужно — попап рисуется поверх текущей фазы
  - Проверка: кнопка покупки → Canvas-попап с суммой, кнопки Confirm/Cancel

- [x] **S4** (Medium) — First-run onboarding: pre-game screen + contextual tooltips
  - **state.js:** добавить в META `firstTime: true`
    - Обратная совместимость: `META.firstTime === undefined` → считать как `true`
    - `saveMeta()` сохраняет флаг автоматически
  - **main.js:** после startRun() — если `META.firstTime`, установить `G.ph = 'tutorial'`
  - **render.js:** новая функция `drawTutorial()` (~70 строк) — Canvas-экран:
    ```
    ┌─────────────────────────────────────┐
    │         HOW TO SURVIVE              │
    │  [курсор]      [SPACE]     [зона]   │
    │  AIM & FLY   SCAN ORE    EXTRACT    │
    │  Move cursor  Press SPACE Reach the │
    │  to navigate  to reveal   green zone│
    │  [ PLAY FIRST RUN ]   [ SKIP ]      │
    └─────────────────────────────────────┘
    ```
    - Кнопки: `act:'firstRun'` и `act:'skipTutorial'`
    - Обе кнопки: `META.firstTime = false; saveMeta(); startRun()`
  - **main.js:** 3 контекстных тултипа в play-фазе по триггерам (не таймеру):
    - `G.tutStep = 0` при старте рана
    - Step 0 → сразу при старте: "Move cursor to fly" (исчезает через 4 сек)
    - Step 1 → при первом подлёте к астероиду d < 200: "SPACE — scan for ore"
    - Step 2 → при первом `G.ore > 0`: "Reach Extraction Zone →" + стрелка мигает ярче
    - `G.tutMsg` + `G.tutT` (таймер отображения) — рисуется в render.js drawHUD()
    - Тултипы только если `META.firstTime === false && G.tutStep < 3`
      (т.е. только в первом ране, уже после просмотра экрана)
  - **render.js:** в drawHUD() — если `G.tutMsg`, рисовать полупрозрачный баннер
    по центру нижней части экрана
  - **main.js:** кнопка "How to play" в главном меню → `G.ph = 'tutorial'`
    (для повторного просмотра; `firstTime` не сбрасывается)
  - Проверка:
    - Новый игрок (чистый localStorage): видит экран → жмёт Play → видит тултипы
    - Существующий игрок (есть META): экран не показывается, сразу в меню
    - Кнопка "How to play" в меню → показывает экран снова

---

## 🚀 DEPLOY SPRINT

- [x] **D1** (Simple) — Merge vite-v6 → main
  - `git checkout main && git merge vite-v6 && git push`
  - Проверка: ветка main содержит все src/ модули

- [x] **D2** (Simple) — Cloudflare Pages деплой
  - `wrangler pages project create void-survivor`
  - Build: `npm run build` / Output: `dist`
  - Подключить к ветке main → push = автодеплой
  - Проверка: игра открывается на `void-survivor.pages.dev`

- [ ] **D3 + B1** (Simple) — Домен + base.dev регистрация
  - D3: купить voidsurvivor.xyz → DNS → Cloudflare → SSL
  - B1: создать проект на https://base.dev:
    - name: "Void Survivor"
    - tagline: "Extract ore. Survive the void."
    - category: gaming
    - primary URL: https://voidsurvivor.xyz
    - icon 512×512, screenshots (portrait, для мобайла)
    - builder code (генерируется на base.dev)
  - Проверка: игра открывается по домену; проект виден на base.dev

- [ ] **D4** (Medium) — Base Mainnet деплой контракта
  - Slither: `slither contracts/VoidOreMinter.sol` → исправить critical findings
  - Деплой через Remix на Base Mainnet (chain ID 8453)
  - Верификация на basescan.org
  - Обновить в web3.js (временно, до миграции на viem):
    - `CHAIN_ID: 8453`
    - `CHAIN_NAME: 'Base'`
    - `CONTRACT: '<новый адрес>'`
    - `RPC: 'https://mainnet.base.org'`
    - `EXPLORER: 'https://basescan.org'`
  - Проверка: покупка ore на Mainnet проходит

---

## ⛓️ BASE APP SPRINT

> Делать после Deploy Sprint. Цель: игра доступна через Base App (join.base.app).
> После April 9, 2026 — Base App = стандартный web app, Farcaster не нужен.

- [x] **B2** (Medium) — Миграция web3.js: ethers.js v6 → viem
  - `npm install viem` / `npm uninstall ethers`
  - Переписать src/web3.js (~222 строки):
    - `BrowserProvider` → `createWalletClient({ chain: base, transport: custom(window.ethereum) })`
    - `provider.getSigner()` → walletClient
    - `new ethers.Contract(...)` → `getContract({ address, abi, client: walletClient })`
    - `ethers.parseEther(x)` → `parseEther(x)` из viem
    - `signer.getAddress()` → `walletClient.account.address`
    - EIP-191 подпись (для save-run): `walletClient.signMessage({ message })`
  - W3.address, W3.connected, w3Toast — интерфейс НЕ менять
  - Проверка: connect wallet → видим адрес; buy ore → транзакция проходит

- [ ] **B3** (Medium) — Touch controls (auto-aim + виртуальный джойстик)
  - Auto-aim: корабль автоматически целится в ближайшего врага (в play-фазе)
    - `G.s.aimAng = angle to nearest enemy (if exists, else keep manual)`
    - Desktop: мышь по-прежнему overrides aimAng (обратная совместимость)
  - Виртуальный джойстик движения (только если touch device):
    - Рисовать в render.js поверх игры: круглая база (r=50) + стик (r=20)
    - Позиция: левый нижний угол, отступ 20px
    - Touch events: `touchstart/touchmove/touchend` → vx/vy аналог WASD
    - Определение touch device: `('ontouchstart' in window)` → `G.touchMode = true`
  - На desktop: ничего не меняется
  - Проверка: открыть на мобильном браузере → джойстик виден, корабль движется,
    стреляет автоматически

- [ ] **B4** (Medium) — Paymaster (gasless транзакции)
  - Зарегистрироваться на https://coinbase.com/cloud → CDP
  - Создать Paymaster политику для VoidOreMinter на Base Mainnet
  - Добавить в web3.js Paymaster URL при создании walletClient:
    ```js
    import { http } from 'viem';
    // Paymaster sponsorUserOperation hook через viem paymasterClient
    ```
  - Проверка: buy ore → MetaMask не запрашивает ETH на газ

---

## 🎮 GAMEPLAY SPRINT 2 — дизайн-сессия

> G3-1 требует отдельной сессии геймдизайна перед кодингом.

- [ ] **GD1** (Design) — Дизайн уникальных врагов и боссов по локациям
  - Abandoned Field: дроны-собиратели, слабые но быстрые стаи
  - Contested Zone: патрульные дроиды, агрессивные, средние HP
  - Rich Vein: охранные турели (статичные), heavy-охранники
  - Void Storm: теневые твари (fast swarm) + Void Wraith boss
  - Для каждого типа: HP, spd, fire pattern, визуальный стиль
  - Результат: дизайн-документ в docs/enemy-design.md

- [ ] **G3-1** (Complex) — Реализация уникальных врагов по локациям
  - Только после завершения GD1

---

## 🏗️ INFRA SPRINT — после деплоя

- [ ] **M4-1** (Simple) — Cloudflare Workers + wrangler.toml
- [ ] **M4-2** (Simple) — D1 схема (players, runs)
- [ ] **M4-3** (Medium) — POST /api/save-run (EIP-191 верификация)
- [ ] **M4-4** (Simple) — GET /api/leaderboard (TOP-10)
- [ ] **M4-5** (Medium) — Интеграция save-run в игру (triggerSuccess)
- [ ] **M4-6** (Medium) — Экран лидерборда (G.ph = 'leaderboard')

---

## 🔧 RENDER РЕФАКТОРИНГ — когда render.js > 1200 строк

- [ ] **RR1** (Medium) — Вынести src/render/hud.js (~200 строк)
- [ ] **RR2** (Medium) — Вынести src/render/screens.js (~300 строк)
- [ ] **RR3** (Medium) — Вынести src/render/effects.js (~150 строк)

---

---

## 📋 BACKLOG

- [ ] WebSocket мультиплеер (Cloudflare Durable Objects)
- [ ] NFT корабли VoidShips.sol (ERC-721)
- [ ] Сезонная система VoidSeason.sol с призами
- [ ] PvP зоны
- [ ] ore→ETH пул обмена (после аудита экономики)
- [ ] Мобильный Capacitor wrapper (если нужен после B3)