import { WW, WH, WSX, WSY, W, H, ORE_VALUE } from './config.js';

// ── Утилиты (локальные, чтобы не тянуть зависимость) ──
const rn = n => Math.random() * n;
const ri = n => Math.floor(Math.random() * n);

// ── Генерация вершин астероида ─────────────────────────
function genAsteroidVerts(r, n = 8) {
  return Array.from({ length: n }, (_, i) => {
    const a = (i / n) * Math.PI * 2;
    const rr = r * (0.65 + Math.random() * 0.55);
    return { x: Math.cos(a) * rr, y: Math.sin(a) * rr };
  });
}

// ── Генерация препятствий ─────────────────────────────
export function genObstacles(G, wave) {
  const obs = [];
  const safeR = 200;

  function canPlace(x, y, r) {
    if (Math.hypot(x - WSX, y - WSY) < safeR + r) return false;
    for (const o of obs) if (Math.hypot(x - o.x, y - o.y) < o.r + r + 30) return false;
    return true;
  }

  function tryPlace(type, attempts = 40) {
    for (let a = 0; a < attempts; a++) {
      const x = 80 + rn(WW - 160), y = 80 + rn(WH - 160);
      let r;
      if (type === 'asteroid') r = 22 + rn(40);
      else if (type === 'nebula') r = 110 + rn(110);
      else r = 14 + rn(20);
      if (!canPlace(x, y, r)) continue;
      const o = { x, y, r, tp: type };
      if (type === 'asteroid') {
        const rnd = Math.random();
        const od = G.location ? G.location.oreDistro : [0.60, 0.90];
        o.subtype  = rnd < od[0] ? 'poor' : rnd < od[1] ? 'medium' : 'rich';
        o.oreValue = ORE_VALUE[o.subtype];
        o.verts    = genAsteroidVerts(r, 7 + ri(4));
        o.rot      = rn(Math.PI * 2);
        o.rotSpd   = (rn(2) - 1) * 0.0004;
        o.driftAng = rn(Math.PI * 2);
        o.driftSpd = rn(0.18);
        o.shade    = ri(3);
        o.revealed = false;
      } else if (type === 'nebula') {
        o.hue      = 180 + ri(120);
        o.driftAng = rn(Math.PI * 2);
        o.driftSpd = rn(0.06);
      } else {
        o.hp  = 40 + wave * 12 + rn(40);
        o.mhp = o.hp;
        o.rot = rn(Math.PI * 2);
        o.hue = 160 + ri(120);
      }
      obs.push(o);
      return true;
    }
    return false;
  }

  const am = G.location ? G.location.asteroids : 1;
  const aCount = Math.round((28 + wave * 2) * am);
  const nCount = 6 + wave;
  const cCount = Math.round((18 + wave * 3) * am);
  for (let i = 0; i < aCount; i++) tryPlace('asteroid');
  for (let i = 0; i < nCount; i++) tryPlace('nebula');
  for (let i = 0; i < cCount; i++) tryPlace('crystal');
  return obs;
}

// ── Создание мира (один раз при старте рана) ──────────
export function genWorld(G) {
  G.obs = genObstacles(G, 1);
  G.s.x = WSX; G.s.y = WSY; G.s.vx = 0; G.s.vy = 0;
  G.cam.x = WSX - W / 2; G.cam.y = WSY - H / 2;
}

// ── Extraction Zone ───────────────────────────────────
export function initExtraction(G, waveDuration) {
  const margin = 120;
  const ex = margin + Math.random() * (WW - margin * 2);
  const ey = margin + Math.random() * (WH - margin * 2);
  G.extraction.zone = { x: ex, y: ey, radius: 80 };
  G.extraction.timer = waveDuration;
  G.extraction.playerInZone = 0;
  G.extraction.active = true;
}
