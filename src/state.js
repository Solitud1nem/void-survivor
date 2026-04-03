import { W, H, WSX, WSY, XP_BASE, SCAN_MAX, SHIPS } from './config.js';

// ── Meta-progression (localStorage) ───────────────────

function loadMeta() {
  try { const r=localStorage.getItem('vs_meta'); if(r) return JSON.parse(r); } catch(e) {}
  return { credits:0, ore:0, owned:['vanguard'], selected:'vanguard', hi:0 };
}

export let META = loadMeta();
if (!META.owned.includes('vanguard')) META.owned.push('vanguard');
if (!META.selected) META.selected='vanguard';
if (META.ore === undefined) META.ore = 0;

// w3Addr: функция, возвращающая текущий адрес кошелька (или null)
let _w3Addr = () => null;
export function bindW3Addr(fn) { _w3Addr = fn; }

export function saveMeta() {
  try {
    const d=JSON.stringify(META);
    localStorage.setItem('vs_meta',d);
    const addr = _w3Addr();
    if(addr) localStorage.setItem('vs_meta_'+addr.toLowerCase(),d);
  } catch(e) {}
}
saveMeta();

// ── Game-state factory ────────────────────────────────

export function mkG() {
  const ship = SHIPS.find(s=>s.id===META.selected)||SHIPS[0];
  return {
    ph:     'menu',
    score:  0, lvl:1, xp:0, xpMax:XP_BASE,
    gameT:0, banT:0,
    flT:0, shT:0, shX:0, shY:0,
    parts:[], gems:[], buls:[], ens:[], orbs:[],
    choices:[], chainFl:null,
    boss:null, bossCount:0, spawnT:0,
    obs:[], cam:{x:0,y:0},
    shipId: ship.id, earnedCredits:0, lostOre:0, location:null,

    ore:         0,
    shopFrom:    'menu',
    scanEnergy:  SCAN_MAX,
    scanRegen:   0,
    scanPulse:   0,
    scanPulseR:  0,
    revealedEns: [],

    mining: null,

    extraction: {
      zone: null,
      timer: 0,
      playerInZone: 0,
      active: false,
    },

    s: {
      x:WSX, y:WSY, vx:0, vy:0,
      hp:ship.mhp, mhp:ship.mhp,
      invT:0,
      ang:    -Math.PI/2,
      aimAng: -Math.PI/2,
      pT:0, oAng:0, cT:0, scT:0, rgT:0,
      passive: ship.passive, inNebula: false,
      u:{ pulse:1, orbit:0, chain:0, scatter:0, spd:0, armor:0, mag:0, regen:0 },
    },
  };
}
