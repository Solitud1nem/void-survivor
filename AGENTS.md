# AGENTS.md — Void Survivor

> Читай этот файл ПЕРВЫМ перед каждой сессией. Он содержит всё необходимое.

---

## Контекст проекта

Void Survivor — браузерный extraction shooter. Canvas 2D, 960×540, мир 3600×3600.
Vanilla JS + Vite. Web3 опциональный (**viem**, Base Mainnet, chain ID 8453).
Целевая платформа: voidsurvivor.xyz + **Base App** (join.base.app).

**Текущая ветка:** vite-v6
**Запуск:** `npm install && npm run dev` → localhost:5173
**Билд:** `npm run build` → dist/

---

## Структура файлов

```
src/
  config.js   103 строки  — ВСЕ константы: размеры, балансировка, корабли, апгрейды
  state.js     73 строки  — META (localStorage), mkG() — фабрика состояния
  world.js     90 строк   — genWorld(), initExtraction() — генерация карты
  enemies.js  160 строк   — spawn, update, boss, killEn, updateEBuls
  render.js   985 строк   — ВСЁ рендерение: draw(), HUD, экраны, эффекты
  web3.js     222 строки  — wallet, contract, buyOre, toast, shop panel
                            СТЕК: viem (после задачи B2, до — ethers.js v6)
  main.js     715 строк   — game loop, update(), input, координация модулей
```

**Зависимости модулей (не нарушать):**
```
config.js  ← никого не импортирует
state.js   ← config.js
world.js   ← config.js
enemies.js ← config.js
render.js  ← config.js, state.js
web3.js    ← config.js, state.js
main.js    ← всё остальное
```

---

## Ключевые объекты

### G — игровое состояние (из mkG() в state.js)
```js
G = {
  ph: 'menu',           // фаза: menu|play|pause|upgrade|shop|success|failed|over|error
  score, lvl, xp, xpMax, gameT, banT,
  parts[], gems[], buls[], eBuls[], ens[], orbs[], dmgNums[], debris[],
  deathAnim,
  choices[], chainFl, boss, bossCount, spawnT, synergy,
  obs[], cam:{x,y},
  ore, scanEnergy, scanRegen, scanPulse, scanPulseR, revealedEns[],
  mining,               // null или { obs, t, maxT }
  extraction: { zone, timer, playerInZone, active },
  s: { x, y, vx, vy, hp, mhp, ang, aimAng, invT, passive, u:{} },
  location,             // объект из LOCATIONS[]
  shopFrom, earnedCredits, lostOre,
  touchMode,            // bool: true если touch-устройство (задача B3)
  joystick: { dx, dy }, // -1..1 от виртуального джойстика (задача B3)
}
```

### META — мета-прогресс (localStorage, из state.js)
```js
META = { credits, ore, owned:[], selected:'vanguard', hi }
// Сохраняется через saveMeta() — всегда вызывать после изменений
```

### bR — кнопки (возвращается из draw(), используется в click())
```js
// Каждый элемент: { x, y, w, h, act, ...доп. поля }
// act: 'play'|'shop'|'back'|'upgrade'|'buy'|'select'|'w3connect'|...
```

---

## КРИТИЧЕСКИЕ ПРАВИЛА

### 1. Game loop — всегда в try/catch
```js
function loop(ts) {
  try {
    const dt = Math.min(ts-ts0, 60); ts0=ts;
    update(dt);
    bR = draw(ts, { G, mX, mY, bR, hovI, shopSel, dt });
  } catch(e) {
    console.error('[VS crash]', e);
    G.ph = 'error';
  }
  requestAnimationFrame(loop);
}
```

### 2. Лимит строк — СТОП если файл > 1200 строк
```bash
wc -l src/*.js
```
- Если `render.js` > 1200 → сначала вынести один блок, потом добавлять фичу

### 3. Никаких confirm() / alert()
```js
// ЗАПРЕЩЕНО: confirm(...), alert(...)
// ПРАВИЛЬНО: Canvas-попап через bR + rRect (см. w3DrawShopPanel в web3.js)
```

### 4. visibilitychange — обязательно
```js
document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.ph === 'play') G.ph = 'pause';
});
```

### 5. G должен быть сериализуем
```js
// Не добавлять функции внутрь G или G.s
// Проверка: JSON.stringify(G) не должна бросать ошибку
```

### 6. saveMeta() после каждого изменения META
```js
META.credits += earned;
saveMeta(); // обязательно
```

---

## Правила стиля

- Чистый ES2022, без TypeScript
- Утилиты (`rn`, `ri`, `d2`, `a2`, `clamp`, `lerp`) — определены в main.js, не дублировать
- Константы — только в config.js, не хардкодить в логике
- Canvas ctx `C` — глобальный в render.js, передаётся через initRender()
- Функции — не длиннее 50 строк без крайней необходимости
- Комментарии секций: `// ── Название ──────────────`

---

## Web3 — viem (актуально после задачи B2)

```js
import { createWalletClient, createPublicClient, custom, http, parseEther, getContract } from 'viem';
import { base } from 'viem/chains';

// Wallet connection
const walletClient = createWalletClient({ chain: base, transport: custom(window.ethereum) });
const publicClient = createPublicClient({ chain: base, transport: http() });
const [address] = await walletClient.requestAddresses();

// Contract call
const contract = getContract({ address: CONTRACT_ADDR, abi: ABI, client: walletClient });
const hash = await contract.write.buyOre([pkgIndex], { value: parseEther('0.01') });

// EIP-191 подпись (для save-run API)
const sig = await walletClient.signMessage({ message: JSON.stringify(runData) });
```

**Публичный интерфейс web3.js не меняется:** `W3.address`, `W3.connected`, `w3Toast(msg, col)`, `w3BuyOre(pkg)`, `w3DrawShopPanel()`, `w3Migrate()`.

### Base App — важные детали
- Base App инжектирует `window.ethereum` (EIP-1193) в WebView — viem работает как обычно
- Chain ID: 8453 (Base Mainnet)
- Игра зарегистрирована на base.dev → `https://voidsurvivor.xyz`
- Paymaster (после B4): CDP Paymaster URL настраивается в walletClient transport

---

## Touch controls (актуально после задачи B3)

```js
// Определение в main.js при инициализации:
G.touchMode = ('ontouchstart' in window);
G.joystick = { dx: 0, dy: 0 };

// В update(): если G.touchMode — движение от джойстика
if (G.touchMode) {
  G.s.vx += G.joystick.dx * SHIP.spd;
  G.s.vy += G.joystick.dy * SHIP.spd;
}

// Auto-aim: в play-фазе aimAng → ближайший враг
// Desktop: мышь overrides aimAng (обратная совместимость)
```

Джойстик рисуется в render.js ТОЛЬКО если `G.touchMode === true`.

---

## Workflow для Claude Code

1. **Перед задачей:** прочитай PRD.md, PLANNING.md, TASKS.md
2. **Проверь размер файлов:** `wc -l src/*.js`
3. **Изменяй только файлы из задачи**
4. **После изменений:** скажи что изменил и как проверить в браузере (`npm run dev`)
5. **Коммит:** `feat(web3): migrate to viem`
6. **Если задача неясна** — спроси, не додумывай

---

## Частые ошибки — НЕ ДЕЛАЙ

- Не вызывать `genWorld()` при level up — только при старте рана
- Не добавлять render-логику в game-модули (world/enemies/main)
- Не вызывать `fetch()` из игровой логики — только через web3.js
- Не изменять структуру `bR` — это контракт между draw() и click()
- Не ставить `async` на `loop()` — requestAnimationFrame не ждёт промисов
- Не использовать DOM-манипуляции кроме `updHUD()` — только Canvas
- Не импортировать React/wagmi — проект vanilla JS, web3 через viem напрямую

---

## Запуск и деплой

```bash
# Разработка
npm install
npm run dev          # localhost:5173, HMR

# Продакшн
npm run build        # → dist/
npm run preview      # предпросмотр dist/

# Деплой (Cloudflare Pages)
wrangler pages deploy dist --project-name void-survivor
```