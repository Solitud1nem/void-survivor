# Void Survivor — PRD v6

## Описание

Void Survivor — браузерный extraction shooter. Игрок выбирает корабль, дропается на
процедурно сгенерированную карту, добывает руду, выживает против врагов и боссов,
эвакуируется через Extraction Zone. Прогресс хранится между сессиями. Web3 (Base)
опциональный — покупка руды за ETH, накопительный META.ore.

**Ветка:** vite-v6 | **Деплой:** Cloudflare Pages → voidsurvivor.xyz
**Контракт:** Base Sepolia 0x565176FAfB4046626C87982cae4a25ACa1dFCFdB → Base Mainnet (D4)
**Целевые платформы:** voidsurvivor.xyz + **Base App** (join.base.app)

---

## Статус реализации

### Готово
- Canvas 2D, 960×540 (16:9), мир 3600×3600
- 6 кораблей с уникальными пассивками и статами
- Extraction Mode: 4 локации, таймер, SUCCESS/FAILED экраны
- Система боссов: рандомный спавн, стрельба, дроп руды
- Враги стреляют (G.eBuls, 3 типа с разными параметрами)
- Weapon synergies: Bolt Arc, Nova Burst, Storm, Charged Orbs
- Damage numbers, weapon trails, цветные искры, анимация смерти
- Engine glow, анимированные туманности, параллакс
- META-прогресс: credits, ore, корабли — localStorage + wallet-binding
- Web3: connect wallet, buy ore, Base Sepolia — полностью опциональный
- Модульная архитектура: config / state / world / enemies / render / web3 / main
- Vite build pipeline

### В работе / планируется
- **S1-S3:** Стабилизация (game loop try/catch, autopause, canvas popup)
- **D1-D4:** Деплой (Cloudflare Pages, домен, Base Mainnet контракт)
- **B1:** base.dev регистрация (параллельно с D3)
- **B2:** Миграция web3.js: ethers.js v6 → viem
- **B3:** Touch controls: auto-aim + virtual joystick
- **B4:** CDP Paymaster (gasless транзакции)
- **M4:** Cloudflare Workers + D1 бэкенд (лидерборд, save-run)
- **GD1/G3-1:** Уникальные враги по локациям

---

## Целевые пользователи

- **Crypto-native геймеры на Base App** — основная новая аудитория
- **Casual Web3-геймеры** — знакомы с кошельками, ищут простую браузерную игру
- **Новые игроки без Web3** — игра полностью работает без кошелька, Web3 = бонус

---

## Ключевые функции MVP

### Gameplay
- Extraction loop: дроп → таймер → добывай/выживай → эвакуируйся
- 4 локации с разной сложностью
- Прокачка per-ран: 8 апгрейдов, weapon synergies
- Боссы: рандомный спавн, max 2 за ран

### Прогресс
- META.ore — накопительная руда между ранами
- META.credits — валюта для покупки кораблей
- Привязка к кошельку: `vs_meta_<address>` в localStorage

### Web3 (опциональный)
- Покупка руды за ETH: 3 пакета (1K / 5K / 15K ore)
- **Gasless транзакции** через CDP Paymaster (задача B4)
- Игра работает без кошелька — никакого блокирующего экрана
- Нет confirm()/alert() — только Canvas-нативные попапы

### Base App интеграция
- Standard web app: загружается в WebView Base App
- Wallet через viem + window.ethereum (EIP-1193)
- Зарегистрировано на base.dev
- Touch controls: auto-aim + virtual joystick для мобайла

---

## Критерии качества

### Стабильность (приоритет #1)
- [ ] Game loop обёрнут в try/catch — крэш не замораживает игру молча (S1)
- [ ] При ошибке показывается экран с кнопкой "Reload" вместо зависания (S1)
- [ ] `visibilitychange` → автопауза при переключении вкладки (S2)
- [ ] `dt` ограничен 60мс (уже реализовано)

### UX
- [ ] Игра полностью работает без подключённого кошелька
- [ ] Нет нативных `confirm()` / `alert()` — только Canvas-попапы (S3)
- [ ] Работает в мобильном браузере (WebView Base App)
- [ ] Touch controls не ломают desktop-режим (B3)

### Web3
- [ ] Wallet connection через viem (B2)
- [ ] Gasless покупка через Paymaster (B4)
- [ ] Контракт верифицирован на Base Mainnet (D4)

### Код
- [ ] Ни один файл не превышает 1200 строк
- [ ] G полностью сериализуем через JSON.stringify(G)

---

## Вне скоупа (текущий этап)

- Мультиплеер / WebSocket — после полировки одиночных механик
- ore→ETH пул обмена — после аудита экономики
- NFT корабли — после Mainnet стабилизации
- Сезонная система с призами
- PvP арены

---

## Технические ограничения

- Canvas 2D, 960×540 — без WebGL, без Three.js
- Vanilla JS + Vite (ES modules, без React/Vue/wagmi)
- Web3: **viem** (framework-agnostic, заменяет ethers.js)
- Cloudflare экосистема: Pages, Workers, D1
- Base Mainnet (chain ID 8453)
- Claude Code как основной агент — файлы < 1200 строк