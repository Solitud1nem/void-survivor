# TASKS.md — Void Survivor v6

> Одна задача = одна сессия Claude Code.
> Начинай: "Read AGENTS.md, PRD.md, PLANNING.md. Current task: [задача]"
> После завершения ставь [x].

---

## ✅ ЗАКРЫТО

- [x] M0-1 — Баг map reset при level up → волны полностью убраны, непрерывный спавн
- [x] M1-1..M1-6 — Extraction Mode (зона, таймер, SUCCESS/FAILED, 4 типа локаций)
- [x] M2-base — Система боссов (рандомный спавн, стрельба, дроп руды)
- [x] M3-1 — Vite инициализирован (src/main.js, npm run dev работает)
- [x] R1 — config.js (88 строк, все константы)
- [x] R2 — state.js (72 строки, META, mkG)
- [x] R3 — world.js (90 строк, genObstacles, genWorld, initExtraction)
- [x] R4 — enemies.js (109 строк, spawn, kill, boss)
- [x] R5 — render.js (~900 строк, все draw-функции)
- [x] R6 — web3.js (222 строки, wallet, contract, buy ore)
- [x] G1-1 — Враги стреляют (G.eBuls, cooldown/range/dmg по типу)
- [x] G1-2 — Fullscreen кнопка (canvas + F key, ESC приоритет)
- [x] G2-1 — Damage numbers (цифры урона при попадании)
- [x] G2-2 — Weapon trails (20-point fade за пулями)
- [x] G2-3 — Цветные искры + анимация смерти (2.5s debris)
- [x] G3-2 — Weapon synergies (Bolt Arc, Nova Burst, Storm, Charged Orbs)
- [x] G4-1 — Engine glow (интенсивность от скорости)
- [x] G4-2 — Анимированные туманности (pulse дыхание)

### Также выполнено (вне плана):
- [x] Landscape viewport 960x540 (16:9)
- [x] Мир увеличен до 3600x3600
- [x] Мини-карта увеличена до 192x192
- [x] Hangar: 6-col layout для landscape
- [x] Keyboard: e.code для независимости от раскладки
- [x] Видимый курсор мыши над canvas

---

## 🔜 ОТЛОЖЕНО (дизайн-сессия)

- [ ] **G3-1** — Уникальные враги и боссы под каждую локацию
  - Разные типы врагов с уникальным поведением
  - Уникальные боссы для каждой локации
  - Требует отдельной сессии фокуса на геймдизайн

---

## 🏗️ INFRA SPRINT — следующий

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
