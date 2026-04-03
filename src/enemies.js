import {
  WW, WH, W, H, SPAWN_RADIUS, ENEMY_CFG,
  SPAWN_RATES, BOSS_CFG, MAX_VISIBLE_ENEMIES, MAX_BOSSES_PER_RUN, BOSS_SPAWN_CHANCE,
} from './config.js';

const rn   = n => Math.random() * n;
const ri   = n => Math.floor(Math.random() * n);
const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
const d2   = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const a2   = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

function isVis(G, worldX, worldY, margin = 80) {
  return worldX > G.cam.x - margin && worldX < G.cam.x + W + margin &&
         worldY > G.cam.y - margin && worldY < G.cam.y + H + margin;
}

// ── Spawn ─────────────────────────────────────────────

export function spawnEn(G, tp) {
  const a = rn(Math.PI * 2), d = SPAWN_RADIUS + rn(120);
  const x = clamp(G.s.x + Math.cos(a) * d, 60, WW - 60);
  const y = clamp(G.s.y + Math.sin(a) * d, 60, WH - 60);
  const cc = ENEMY_CFG[tp];
  G.ens.push({ x, y, vx: 0, vy: 0, tp, ...cc, mhp: cc.hp, invT: 0, ph: rn(Math.PI * 2) });
}

export function trySpawnEnemies(G) {
  const visible = G.ens.filter(e => isVis(G, e.x, e.y, e.r));
  if (visible.length >= MAX_VISIBLE_ENEMIES) return;

  const em = G.location ? G.location.enemies : 1;
  for (const tp of ['seek', 'fast', 'heavy']) {
    if (Math.random() < SPAWN_RATES[tp] * em) {
      spawnEn(G, tp); return;
    }
  }
}

export function trySpawnBoss(G) {
  if (G.boss) return;
  if (G.bossCount >= MAX_BOSSES_PER_RUN) return;
  if (Math.random() >= BOSS_SPAWN_CHANCE) return;

  const a = rn(Math.PI * 2), d = SPAWN_RADIUS + rn(120);
  const x = clamp(G.s.x + Math.cos(a) * d, 80, WW - 80);
  const y = clamp(G.s.y + Math.sin(a) * d, 80, WH - 80);
  G.boss = {
    x, y, vx: 0, vy: 0, tp: 'boss',
    hp: BOSS_CFG.hp, mhp: BOSS_CFG.hp, spd: BOSS_CFG.spd,
    pts: BOSS_CFG.pts, xp: BOSS_CFG.xp, r: BOSS_CFG.r,
    fireT: 0, invT: 0, ph: 0,
  };
  G.bossCount++;
}

// fx = { shk, ptcl }
export function updateBoss(G, dt, fx) {
  const b = G.boss, s = G.s;
  if (!b) return;
  b.ph += dt * 0.001; b.invT = Math.max(0, b.invT - dt);

  const ang = a2(b, s);
  b.x += Math.cos(ang) * b.spd; b.y += Math.sin(ang) * b.spd;
  b.x = clamp(b.x, b.r, WW - b.r); b.y = clamp(b.y, b.r, WH - b.r);

  b.fireT += dt;
  if (b.fireT >= BOSS_CFG.fireRate) {
    b.fireT = 0;
    const ba = a2(b, s);
    G.buls.push({
      x: b.x, y: b.y,
      vx: Math.cos(ba) * BOSS_CFG.bulSpd, vy: Math.sin(ba) * BOSS_CFG.bulSpd,
      dmg: BOSS_CFG.bulDmg, col: '#ff4444', trail: [], isEnemy: true, r: 5, life: 1, tp: 'enemy',
    });
  }

  if (d2(b, s) < b.r + 16 && s.invT <= 0) {
    s.hp -= BOSS_CFG.bulDmg; s.invT = 500;
    fx.shk(); G.flT = 300;
    fx.ptcl(s.x, s.y, '#ff4444', 10, 3, 2);
  }
}

// fx = { ptcl, ring, gem, updHUD }
export function killBoss(G, fx) {
  const b = G.boss;
  if (!b) return;
  fx.ptcl(b.x, b.y, '#ffdd44', 25, 6, 4);
  fx.ring(b.x, b.y, '#ffdd44', b.r * 3);
  G.score += b.pts;
  const oreAmt = BOSS_CFG.oreDrop[0] + ri(BOSS_CFG.oreDrop[1] - BOSS_CFG.oreDrop[0] + 1);
  G.ore += oreAmt;
  const gc = 4;
  for (let j = 0; j < gc; j++) fx.gem(b.x + rn(24) - 12, b.y + rn(24) - 12, Math.ceil(b.xp / gc));
  fx.updHUD();
  G.boss = null;
}

// fx = { ptcl, ring, gem, updHUD }
export function killEn(G, i, fx) {
  if (i < 0 || i >= G.ens.length) return;
  const e = G.ens[i];
  const col = { seek: '#ee4444', heavy: '#ff8800', fast: '#cc44ff' }[e.tp];
  fx.ptcl(e.x, e.y, col, 13, 4, 3.5);
  fx.ring(e.x, e.y, col, e.r * 2.6);
  const gc = 1 + Math.floor(e.xp / 10);
  for (let j = 0; j < gc; j++) fx.gem(e.x + rn(16) - 8, e.y + rn(16) - 8, Math.ceil(e.xp / gc));
  G.score += e.pts; fx.updHUD(); G.ens.splice(i, 1);
}
