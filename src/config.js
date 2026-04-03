// ── Canvas ─────────────────────────────────────────────
export const W = 600, H = 600;

// ── World ──────────────────────────────────────────────
export const WW  = 2400, WH = 2400;
export const WSX = WW/2, WSY = WH/2;
export const SPAWN_RADIUS  = 380;
export const SCAN_RADIUS   = 420;
export const SCAN_MAX      = 50;
export const SCAN_COST     = 10;
export const SCAN_REGEN    = 3;
export const MINE_RANGE    = 75;
export const MINE_RANGE_SQ = MINE_RANGE * MINE_RANGE;
export const MINE_CONT     = 130;
export const MINE_TIME     = 3000;
export const ORE_VALUE     = { poor:2, medium:5, rich:10 };
export const ORE_PER_CREDIT = 2;

// ── Locations ──────────────────────────────────────────
export const LOCATIONS = [
  { id:'abandoned', name:'Abandoned Field',  dur:240, oreDistro:[0.45,0.85], asteroids:1.3, enemies:0.8, col:'#4488aa' },
  { id:'contested', name:'Contested Zone',   dur:180, oreDistro:[0.55,0.88], asteroids:1.0, enemies:1.2, col:'#ff8844' },
  { id:'richvein',  name:'Rich Vein',        dur:210, oreDistro:[0.30,0.65], asteroids:0.7, enemies:1.0, col:'#44ffaa' },
  { id:'voidstorm', name:'Void Storm',       dur:150, oreDistro:[0.40,0.78], asteroids:0.9, enemies:1.5, col:'#cc44ff' },
];

// ── Progression ────────────────────────────────────────
export const XP_BASE       = 85;
export const XP_GROWTH     = 1.32;
export const CREDITS_PER_SCORE = 0.04;

// ── Parallax stars ─────────────────────────────────────
export const STAR_LAYERS = [
  { count:120, factor:0.12, rMin:0.3, rMax:0.7,  alpha:0.45 },
  { count:80,  factor:0.35, rMin:0.5, rMax:1.1,  alpha:0.65 },
  { count:40,  factor:0.70, rMin:0.8, rMax:1.6,  alpha:0.85 },
];
export const STAR_DATA = STAR_LAYERS.map(layer =>
  Array.from({ length: layer.count }, () => ({
    px: Math.random(), py: Math.random(),
    r:  layer.rMin + Math.random()*(layer.rMax-layer.rMin),
    ph: Math.random()*Math.PI*2,
  }))
);
export const NEBS = Array.from({ length:8 }, () => ({
  x: Math.random()*WW, y: Math.random()*WH,
  r: 140+Math.random()*160, h: 180+Math.random()*120,
}));

// ── Ships ──────────────────────────────────────────────
export const SHIPS = [
  { id:'vanguard',  name:'Vanguard',  cost:0,    color:'#1d5e98', accent:'#88ccff', mhp:100, spdMul:1.00, passive:'pulseBonus', passiveDesc:'+10% Pulse damage',   statAtk:0.55, statSpd:0.55, statDef:0.55, lore:'Standard-issue interceptor' },
  { id:'bulwark',   name:'Bulwark',   cost:800,  color:'#3a3a6a', accent:'#ccccff', mhp:175, spdMul:0.72, passive:'block',      passiveDesc:'20% damage block',    statAtk:0.45, statSpd:0.30, statDef:0.92, lore:'Armored siege platform' },
  { id:'raider',    name:'Raider',    cost:600,  color:'#1a3a1a', accent:'#88ff88', mhp:65,  spdMul:1.48, passive:'dodge',      passiveDesc:'18% dodge chance',    statAtk:0.50, statSpd:0.96, statDef:0.32, lore:'Hit-and-run scout craft' },
  { id:'artillery', name:'Artillery', cost:1200, color:'#3a1a00', accent:'#ffcc66', mhp:80,  spdMul:0.85, passive:'dmgBonus',   passiveDesc:'+30% weapon damage',  statAtk:0.92, statSpd:0.40, statDef:0.45, lore:'Long-range fire support' },
  { id:'phantom',   name:'Phantom',   cost:1000, color:'#1a0a2a', accent:'#eeaaff', mhp:90,  spdMul:1.12, passive:'chainBonus', passiveDesc:'Chain Arc: +2 jumps', statAtk:0.70, statSpd:0.65, statDef:0.50, lore:'Void-phase ambush vessel' },
  { id:'sentinel',  name:'Sentinel',  cost:900,  color:'#002030', accent:'#88ffdd', mhp:95,  spdMul:1.00, passive:'freeOrb',    passiveDesc:'Orbit: +1 free orb',  statAtk:0.65, statSpd:0.50, statDef:0.55, lore:'Orbital defense specialist' },
];

// ── Upgrades ───────────────────────────────────────────
export const UPGRADES = [
  { k:'pulse',   name:'Pulse Cannon',  cat:'W', desc:'Energy bolts — +dmg & rate', max:5 },
  { k:'orbit',   name:'Orbit Shields', cat:'W', desc:'Rotating energy orbs',        max:4 },
  { k:'chain',   name:'Chain Arc',     cat:'W', desc:'Lightning jumps between foes',max:3 },
  { k:'scatter', name:'Scatter Shot',  cat:'W', desc:'Multi-bullet burst spread',   max:3 },
  { k:'spd',   name:'Thrusters',    cat:'P', desc:'+20% movement speed', max:4 },
  { k:'armor', name:'Hull Plating', cat:'P', desc:'+25 max HP per rank', max:4 },
  { k:'mag',   name:'Attractor',    cat:'P', desc:'Wider XP pickup radius', max:4 },
  { k:'regen', name:'Nanobots',     cat:'P', desc:'Passive HP regeneration', max:3 },
];

// ── Enemies ────────────────────────────────────────────
export const ENEMY_CFG = {
  seek:  { hp:42,  spd:1.4,  pts:10, xp:8,  r:12 },
  heavy: { hp:155, spd:0.62, pts:40, xp:28, r:19 },
  fast:  { hp:24,  spd:2.55, pts:18, xp:12, r:8  },
};

// ── Spawn / Boss ───────────────────────────────────────
export const SPAWN_RATES = { seek:0.6, fast:0.3, heavy:0.15 };
export const BOSS_CFG = {
  hp:500, spd:0.8, pts:200, xp:80, r:28,
  fireRate:2000, bulSpd:3.5, bulDmg:18,
  oreDrop:[5,10],
};
export const MAX_VISIBLE_ENEMIES = 5;
export const MAX_BOSSES_PER_RUN  = 2;
export const BOSS_SPAWN_CHANCE   = 0.04;
