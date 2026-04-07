# PLANNING.md — Void Survivor v6

## Архитектура

Игра переходит с монолитного HTML на **Vite-based модульную структуру** с сохранением Canvas 2D рендера.
Бэкенд — Cloudflare Workers + D1 (serverless, бесплатный tier).
Блокчейн — **viem** (заменяет ethers.js v6), Base Mainnet.
Дистрибуция — voidsurvivor.xyz + **Base App** (join.base.app, standard web app).

```
Браузер (Canvas 2D + Vite build)
    ↕ viem (EIP-1193 / window.ethereum)
Base Blockchain (VoidOreMinter.sol, chain ID 8453)
    ↕ CDP Paymaster (gasless транзакции)
    ↕ fetch API
Cloudflare Workers (REST API)
    ↕ D1 SQL
Cloudflare D1 (players, runs, purchases)
```

---

## Стек

| Слой | Технология | Статус |
|------|-----------|--------|
| Игровой движок | Vanilla JS + Canvas 2D | ✅ готово |
| Сборка | Vite 5 | ✅ готово |
| Хостинг | Cloudflare Pages (voidsurvivor.xyz) | 📋 деплой |
| Бэкенд | Cloudflare Workers | 📋 |
| База данных | Cloudflare D1 (SQLite) | 📋 |
| Blockchain | Base Mainnet (chain ID 8453) | Sepolia ✅ |
| Контракт ore | VoidOreMinter.sol | ✅ Sepolia |
| Web3 клиент | **viem** (заменяет ethers.js v6) | 📋 миграция B2 |
| Paymaster | CDP Paymaster (gasless) | 📋 задача B4 |
| Мобайл | Touch: auto-aim + virtual joystick | 📋 задача B3 |
| Дистрибуция | Base App (standard web app) | 📋 задача B1 |
| Деплой агент | Claude Code | основной |

**Ключевые зависимости:**
- `vite` — сборка, HMR в разработке
- `viem` — Web3: wallet connection, contract calls, EIP-191 signing
- `wrangler` — деплой на Cloudflare Workers и Pages

---

## Base App интеграция

> После April 9, 2026 Base App = стандартный web app + кошелёк.
> Farcaster манифест НЕ нужен. MiniKit НЕ нужен. Next.js НЕ нужен.

**Минимальные требования:**
1. Игра загружается в мобильном браузере (WebView) ✅
2. Wallet connection через viem (EIP-1193) 📋 задача B2
3. Зарегистрировано на base.dev с метаданными 📋 задача B1

**Не требуется:** Vercel, Farcaster аккаунт, React, Next.js.

---

## Структура файлов (текущая)

```
void-survivor/
├── src/
│   ├── config.js            # Константы: размеры мира, балансировка
│   ├── state.js             # META (localStorage), mkG()
│   ├── world.js             # genWorld(), препятствия
│   ├── enemies.js           # spawn, update, boss, killEn, updateEBuls
│   ├── render.js            # ВСЁ рендерение (~985 строк)
│   ├── web3.js              # wallet, contract, buyOre — мигрируем на viem (B2)
│   └── main.js              # game loop, update(), input
├── workers/                 # Cloudflare Workers (INFRA SPRINT)
│   ├── api.js
│   └── routes/
├── contracts/
│   └── VoidOreMinter.sol    # Base Sepolia → Mainnet (D4)
├── index.html
├── vite.config.js
├── wrangler.toml
└── SDD: PRD.md, PLANNING.md, AGENTS.md, TASKS.md
```

---

## Миграция viem (задача B2)

Замена ethers.js v6 на viem в src/web3.js:

```js
// ДО (ethers.js v6)
import { ethers } from 'ethers';
const provider = new ethers.BrowserProvider(window.ethereum);
const signer = await provider.getSigner();
const contract = new ethers.Contract(addr, abi, signer);
const tx = await contract.buyOre(pkg, { value: ethers.parseEther('0.01') });

// ПОСЛЕ (viem)
import { createWalletClient, createPublicClient, custom, http, parseEther, getContract } from 'viem';
import { base } from 'viem/chains';

const walletClient = createWalletClient({ chain: base, transport: custom(window.ethereum) });
const publicClient = createPublicClient({ chain: base, transport: http() });
const [address] = await walletClient.requestAddresses();
const contract = getContract({ address: addr, abi, client: walletClient });
const tx = await contract.write.buyOre([pkg], { value: parseEther('0.01') });
```

**Публичный интерфейс web3.js НЕ меняется:** `W3.address`, `W3.connected`, `w3Toast`, `w3BuyOre`, `w3DrawShopPanel` — остаются прежними. Меняется только внутренняя реализация.

---

## Touch controls (задача B3)

**Auto-aim:** в play-фазе `G.s.aimAng` автоматически направляется к ближайшему врагу.
- На desktop: мышь override aimAng (обратная совместимость сохраняется)
- На мобайле: без мыши — работает только auto-aim

**Виртуальный джойстик:** рисуется в render.js поверх игры ТОЛЬКО если `G.touchMode = true`.
- Определение: `G.touchMode = ('ontouchstart' in window)`
- Позиция: левый нижний угол, 20px отступ
- Touch events в main.js → обновляют `G.joystick: { dx, dy }` (-1..1)
- В update(): если `G.touchMode`, движение от `G.joystick` вместо WASD

---

## Порядок реализации (Milestones)

1. ~~Bugfix — фикс map reset~~ ✅
2. ~~Extraction Mode~~ ✅
3. ~~Враги и боссы~~ ✅
4. ~~Vite миграция~~ ✅
5. **Стабилизация** — S1, S2, S3
6. **Deploy** — D1, D2, D3+B1, D4
7. **Base App** — B2 (viem), B4 (Paymaster), B3 (touch)
8. **Infra** — M4-1 ... M4-6 (Cloudflare Workers + D1)
9. **Gameplay Sprint 2** — GD1, G3-1