import {
  W, H, WW, WH, WSX, WSY, SPAWN_RADIUS, SCAN_RADIUS, SCAN_MAX, SCAN_COST, SCAN_REGEN,
  MINE_RANGE, MINE_RANGE_SQ, MINE_CONT, MINE_TIME, ORE_VALUE, ORE_PER_CREDIT,
  LOCATIONS, XP_BASE, XP_GROWTH, CREDITS_PER_SCORE,
  SHIPS, UPGRADES, ENEMY_CFG,
} from './config.js';
import { META, saveMeta, mkG, bindW3Addr } from './state.js';
import { genWorld, initExtraction } from './world.js';
import { trySpawnEnemies, trySpawnBoss, updateBoss, killBoss, killEn, spawnEn } from './enemies.js';
import { initRender, draw, rRect } from './render.js';
import {
  W3, w3Init, w3Connect, w3SwitchChain, w3BuyOre, w3Toast,
  w3DrawToast, w3DrawConnectBtn, w3DrawShopPanel, initW3,
} from './web3.js';

const CV = document.getElementById('cv');
const C  = CV.getContext('2d');


// ── Утилиты ────────────────────────────────────────────
const rn   = n => Math.random()*n;
const ri   = n => Math.floor(Math.random()*n);
const d2   = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
const d2sq = (a,b) => (a.x-b.x)**2+(a.y-b.y)**2;
const a2   = (a,b) => Math.atan2(b.y-a.y, b.x-a.x);
const clamp = (v,lo,hi) => Math.max(lo,Math.min(hi,v));
const lerp  = (a,b,t) => a+(b-a)*t;

// Нормализация угла в [-π, π]
function normAng(a) {
  while (a >  Math.PI) a -= 2*Math.PI;
  while (a < -Math.PI) a += 2*Math.PI;
  return a;
}



// ═══════════════════════════════════════════════════════
//  СОСТОЯНИЕ ИГРЫ
// ═══════════════════════════════════════════════════════

let G;
let mX=W/2, mY=H/2;
let ts0=0, bR=[], hovI=-1, shopSel=META.selected;

// ── Координаты ─────────────────────────────────────────
function wx(worldX) { return worldX-G.cam.x; }
function wy(worldY) { return worldY-G.cam.y; }
function isVis(worldX, worldY, margin=80) {
  return worldX>G.cam.x-margin && worldX<G.cam.x+W+margin &&
         worldY>G.cam.y-margin && worldY<G.cam.y+H+margin;
}

// ═══════════════════════════════════════════════════════
//  ЛОГИКА — ВСПОМОГАТЕЛЬНЫЕ
// ═══════════════════════════════════════════════════════

function ptcl(x,y,col,n,sp=2.5,sz=2) {
  for (let i=0;i<n;i++) {
    const a=rn(Math.PI*2), s=sp*0.4+rn(sp);
    G.parts.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:1,col,sz:0.7+rn(sz),tp:'sq'});
  }
}
function ring(x,y,col,mr=30) { G.parts.push({x,y,tp:'ring',r:2,mr,col,life:1}); }
function shk() { G.shT=210; G.shX=(rn(2)-1)*11; G.shY=(rn(2)-1)*11; }
function gem(x,y,v=10) {
  const a=rn(Math.PI*2),s=rn(2)+0.5;
  G.gems.push({x,y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,val:v,r:4+v/10,life:1,ph:rn(Math.PI*2)});
}
function getDmgMul()   { return G.s.passive==='dmgBonus'?1.3:G.s.passive==='pulseBonus'?1.1:1.0; }
function getChainBonus(){ return G.s.passive==='chainBonus'?2:0; }
function getFreeOrb()  { return G.s.passive==='freeOrb'?1:0; }

// ── Скан ───────────────────────────────────────────────
function doScan() {
  if (G.scanEnergy < SCAN_COST) return;
  G.scanEnergy -= SCAN_COST;
  G.scanPulse  = 1;
  G.scanPulseR = 0;

  // Помечаем астероиды в радиусе
  const s = G.s;
  for (const o of G.obs) {
    if (o.tp==='asteroid' && d2(s,o)<SCAN_RADIUS) {
      o.revealed = true;
    }
  }

  // Радарные метки врагов (исчезают через 8 сек)
  G.revealedEns = G.ens
    .filter(e=>d2(s,e)<SCAN_RADIUS)
    .map(e=>({x:e.x,y:e.y,tp:e.tp,life:1}));
}

// fx object для передачи в enemies.js
const fx = { shk, ptcl, ring, gem, updHUD };

// ── Апгрейды ───────────────────────────────────────────
function getChoices() {
  return [...UPGRADES.filter(u=>G.s.u[u.k]<u.max)].sort(()=>Math.random()-0.5).slice(0,3);
}
function tryUpgrade() {
  const ch=getChoices();
  if (ch.length===0) { G.ph='play'; updHUD(); return; }
  G.choices=ch; G.ph='upgrade'; hovI=-1;
}
function applyUpg(k) {
  G.s.u[k]++;
  if (k==='armor') { G.s.mhp+=25; G.s.hp=Math.min(G.s.mhp,G.s.hp+15); }
  ptcl(G.s.x,G.s.y,'#44ff88',18,5,3); ring(G.s.x,G.s.y,'#44ff88',45);
  G.ph='play'; updHUD();
}

// ═══════════════════════════════════════════════════════
//  ЛОГИКА — UPDATE
// ═══════════════════════════════════════════════════════

function update(dt) {
  if (G.ph!=='play') return;

  G.flT=Math.max(0,G.flT-dt); G.shT=Math.max(0,G.shT-dt);
  if (G.shT<=0) { G.shX=0; G.shY=0; }
  G.gameT+=dt; G.banT=Math.max(0,G.banT-dt);
  if (G.chainFl) { G.chainFl.life-=dt/280; if(G.chainFl.life<=0) G.chainFl=null; }

  // Скан пульс — анимация кольца
  if (G.scanPulse>0) {
    G.scanPulse=Math.max(0,G.scanPulse-dt/700);
    G.scanPulseR=SCAN_RADIUS*(1-G.scanPulse);
  }

  // Регенерация энергии скана
  G.scanRegen+=dt;
  if (G.scanRegen>=1000/SCAN_REGEN) {
    G.scanEnergy=Math.min(SCAN_MAX,G.scanEnergy+1);
    G.scanRegen=0;
  }

  // Радарные метки врагов — затухание
  G.revealedEns.forEach(e=>e.life-=dt/8000);
  G.revealedEns=G.revealedEns.filter(e=>e.life>0);

  // Extraction таймер (dt в мс, timer в секундах)
  if (G.extraction.active) {
    G.extraction.timer=Math.max(0,G.extraction.timer-dt/1000);
    // Проверка: игрок внутри зоны?
    if (G.extraction.zone) {
      const z=G.extraction.zone;
      const dist=Math.hypot(G.s.x-z.x,G.s.y-z.y);
      if (dist<=z.radius) {
        G.extraction.playerInZone+=dt/1000;
        if (G.extraction.playerInZone>=3) { triggerSuccess(); return; }
      } else {
        G.extraction.playerInZone=0;
      }
    }
    // Таймер истёк
    if (G.extraction.timer<=0) { triggerFailed(); return; }
  }

  // Continuous enemy spawn (каждые ~2 сек)
  G.spawnT+=dt;
  if (G.spawnT>=2000) {
    G.spawnT=0;
    trySpawnEnemies(G);
    trySpawnBoss(G);
  }

  // Boss update
  if (G.boss) updateBoss(G,dt,fx);

  // Препятствия: дрейф
  for (const o of G.obs) {
    if (o.tp==='asteroid'||o.tp==='nebula') {
      o.x+=Math.cos(o.driftAng)*o.driftSpd;
      o.y+=Math.sin(o.driftAng)*o.driftSpd;
      o.x=clamp(o.x,o.r,WW-o.r); o.y=clamp(o.y,o.r,WH-o.r);
    }
    if (o.tp==='asteroid') o.rot+=o.rotSpd*dt;
  }

  // ── Движение игрока ────────────────────────────────
  const ship=SHIPS.find(s=>s.id===G.shipId)||SHIPS[0];
  const s=G.s;

  s.inNebula=false;
  for (const o of G.obs) if(o.tp==='nebula'&&d2(s,o)<o.r*0.85){s.inNebula=true;break;}

  const nebulaSlowMul=s.inNebula?0.48:1.0;
  const spd=2.7*ship.spdMul*(1+0.22*s.u.spd)*nebulaSlowMul;

  const worldMX=mX+G.cam.x, worldMY=mY+G.cam.y;
  const dx=worldMX-s.x, dy=worldMY-s.y, md=Math.hypot(dx,dy);
  if (md>5) { s.vx+=(dx/md)*spd*0.15; s.vy+=(dy/md)*spd*0.15; }
  s.vx*=0.83; s.vy*=0.83;

  let nx=s.x+s.vx, ny=s.y+s.vy;
  nx=clamp(nx,20,WW-20); ny=clamp(ny,20,WH-20);

  for (const o of G.obs) {
    if (o.tp==='nebula') continue;
    const dd=Math.hypot(nx-o.x,ny-o.y), minD=o.r+16;
    if (dd<minD) {
      const ang=Math.atan2(ny-o.y,nx-o.x);
      nx=o.x+Math.cos(ang)*minD; ny=o.y+Math.sin(ang)*minD;
      s.vx*=0.3; s.vy*=0.3;
      if (s.invT<=0) {
        const dmgIn=o.tp==='asteroid'?10:7;
        let actual=dmgIn;
        if (s.passive==='block'&&Math.random()<0.20) actual=0;
        if (s.passive==='dodge'&&Math.random()<0.18) actual=0;
        if (actual>0) { s.hp=Math.max(0,s.hp-actual); shk(); G.flT=320; updHUD(); }
        s.invT=600;
        if (s.hp<=0) { endRun(); return; }
      }
    }
  }
  s.x=nx; s.y=ny;

  // Камера
  const tCamX=clamp(s.x-W/2,0,WW-W), tCamY=clamp(s.y-H/2,0,WH-H);
  G.cam.x=lerp(G.cam.x,tCamX,0.09); G.cam.y=lerp(G.cam.y,tCamY,0.09);

  // ── Видимые враги ──────────────────────────────────
  const visEns=G.ens.filter(e=>isVis(e.x,e.y,e.r));
  let near=visEns.reduce((b,e)=>(!b||d2(s,e)<d2(s,b))?e:b, null);
  // Босс тоже может быть ближайшей целью
  if (G.boss && isVis(G.boss.x,G.boss.y,G.boss.r) && (!near || d2(s,G.boss)<d2(s,near))) near=G.boss;

  // ── Плавный поворот корабля ─────────────────────────
  // Корабль ВСЕГДА развёрнут к ближайшему видимому врагу
  if (near) {
    s.aimAng = a2(s, near);
  }
  // Lerp текущего угла к целевому
  const angDiff = normAng(s.aimAng - s.ang);
  s.ang += angDiff * Math.min(1, dt*0.005); // ~165°/сек

  // Стрелять только когда смотрим примерно на цель (±20°)
  const facingTarget = near && Math.abs(angDiff) < 0.35;

  s.invT=Math.max(0,s.invT-dt);

  // Engine trail
  if (Math.hypot(s.vx,s.vy)>0.4) {
    const ta=s.ang+Math.PI, px=s.x+Math.cos(ta)*16, py=s.y+Math.sin(ta)*16;
    if (Math.random()<0.55)
      G.parts.push({x:px+(rn(5)-2.5),y:py+(rn(5)-2.5),
        vx:Math.cos(ta)*0.9,vy:Math.sin(ta)*0.9,
        life:0.45+rn(0.3),col:Math.random()<0.4?'#ffcc44':'#ff8822',sz:1.2+rn(2.2),tp:'sq'});
  }

  if (s.u.regen>0) {
    s.rgT+=dt; const rt=[2500,1600,1000][s.u.regen-1];
    if (s.rgT>=rt) { s.hp=Math.min(s.mhp,s.hp+1); s.rgT=0; updHUD(); }
  }

  // ── Добыча (Mining) ────────────────────────────────
  updateMining(dt);

  const dm=getDmgMul();

  // ── Оружия (только когда смотрим на цель) ──────────

  // 1. Pulse Cannon
  s.pT=Math.max(0,s.pT-dt);
  if (s.pT<=0 && facingTarget) {
    s.pT=Math.max(155,520-s.u.pulse*68);
    const dmg=(15+s.u.pulse*9)*dm, shots=1+Math.floor(s.u.pulse/3);
    for (let i=0;i<shots;i++) {
      const da=(i-(shots-1)/2)*0.2, ba=a2(s,near)+da;
      G.buls.push({x:s.x,y:s.y,vx:Math.cos(ba)*10,vy:Math.sin(ba)*10,dmg,life:1,tp:'pulse',r:5});
    }
  }

  // 2. Orbit Shields
  s.oAng+=dt*0.0025;
  if (s.u.orbit>0) {
    const cnt=s.u.orbit+1+getFreeOrb();
    G.orbs=Array.from({length:cnt},(_,i)=>{
      const oa=s.oAng+(i/cnt)*Math.PI*2;
      return {x:s.x+Math.cos(oa)*58,y:s.y+Math.sin(oa)*58,r:8+s.u.orbit*2.5};
    });
    for (const orb of G.orbs) {
      for (let j=G.ens.length-1;j>=0;j--) {
        const ej=G.ens[j];
        if (!isVis(ej.x,ej.y,ej.r)) continue;
        if (d2(orb,ej)<orb.r+ej.r) {
          ej.hp-=(5+s.u.orbit*3.5)*dm*dt/100;
          ptcl(orb.x,orb.y,'#55aaff',1,1.5,1.5);
          if (ej.hp<=0) killEn(G,j,fx);
        }
      }
      if (G.boss && d2(orb,G.boss)<orb.r+G.boss.r) {
        G.boss.hp-=(5+s.u.orbit*3.5)*dm*dt/100;
        ptcl(orb.x,orb.y,'#ffdd44',1,1.5,1.5);
        if (G.boss.hp<=0) killBoss(G,fx);
      }
    }
  } else G.orbs=[];

  // 3. Chain Arc (только видимые, только когда facingTarget)
  s.cT=Math.max(0,s.cT-dt);
  if (s.u.chain>0 && s.cT<=0 && facingTarget && visEns.length>0) {
    s.cT=820-s.u.chain*155;
    const targets=[...visEns].sort((a,b)=>d2(s,a)-d2(s,b)).slice(0,1+s.u.chain*2+getChainBonus());
    const segs=[{x:s.x,y:s.y}];
    targets.forEach(e=>{
      e.hp-=(22+s.u.chain*14)*dm; ptcl(e.x,e.y,'#aaccff',6,3,2); segs.push({x:e.x,y:e.y});
      if (e.hp<=0){const idx=G.ens.indexOf(e);if(idx>=0)killEn(G,idx,fx);}
    });
    G.chainFl={segs,life:1};
  }

  // 4. Scatter Shot
  s.scT=Math.max(0,s.scT-dt);
  if (s.u.scatter>0 && s.scT<=0 && facingTarget) {
    s.scT=700-s.u.scatter*105;
    const cnt=3+s.u.scatter*2, ba=a2(s,near);
    for (let i=0;i<cnt;i++) {
      const sa=ba+(i-(cnt-1)/2)*0.22;
      G.buls.push({x:s.x,y:s.y,vx:Math.cos(sa)*7.5,vy:Math.sin(sa)*7.5,dmg:(8+s.u.scatter*5)*dm,life:0.8,tp:'scatter',r:3.5});
    }
  }

  // ── Пули ────────────────────────────────────────────
  for (let i=G.buls.length-1;i>=0;i--) {
    const b=G.buls[i]; b.x+=b.vx; b.y+=b.vy;
    b.life-=dt/(b.tp==='pulse'?1100:b.tp==='enemy'?2000:850);
    if (b.life<=0||b.x<0||b.x>WW||b.y<0||b.y>WH){G.buls.splice(i,1);continue;}
    let blocked=false;
    for (let oi=G.obs.length-1;oi>=0;oi--) {
      const o=G.obs[oi];
      if (o.tp==='nebula') continue;
      if (d2(b,o)<o.r) {
        ptcl(b.x,b.y,'#aaaaaa',3,1.5,2); blocked=true;
        if (o.tp==='crystal') {
          o.hp-=b.dmg; ptcl(o.x,o.y,'#88ccff',4,2,2);
          if (o.hp<=0) {
            ptcl(o.x,o.y,'#88ffcc',16,4,3.5); ring(o.x,o.y,'#44ccff',o.r*2.2);
            const gc=3+ri(5);
            for (let gi=0;gi<gc;gi++) gem(o.x+rn(30)-15,o.y+rn(30)-15,10+ri(15));
            G.score+=25; updHUD(); G.obs.splice(oi,1);
          }
        }
        break;
      }
    }
    if (blocked){G.buls.splice(i,1);continue;}
    let hit=false;
    if (b.isEnemy) {
      // Вражеская пуля → проверяем попадание в игрока
      if (d2(b,s)<b.r+16 && s.invT<=0) {
        s.hp=Math.max(0,s.hp-b.dmg); s.invT=500;
        shk(); G.flT=300; ptcl(s.x,s.y,'#ff4444',10,3,2);
        updHUD(); hit=true;
        if (s.hp<=0){endRun();return;}
      }
    } else {
      // Пуля игрока → враги
      for (let j=G.ens.length-1;j>=0;j--) {
        if (d2(b,G.ens[j])<b.r+G.ens[j].r) {
          G.ens[j].hp-=b.dmg; ptcl(b.x,b.y,b.tp==='pulse'?'#55aaff':'#ffaa33',5,2,2);
          hit=true; if(G.ens[j].hp<=0)killEn(G,j,fx); break;
        }
      }
      // Пуля игрока → босс
      if (!hit && G.boss && d2(b,G.boss)<b.r+G.boss.r) {
        G.boss.hp-=b.dmg; ptcl(b.x,b.y,'#ffdd44',6,3,2);
        hit=true; if(G.boss.hp<=0) killBoss(G,fx);
      }
    }
    if (hit) G.buls.splice(i,1);
  }

  // ── Враги ────────────────────────────────────────────
  for (let i=G.ens.length-1;i>=0;i--) {
    const e=G.ens[i]; e.ph+=dt*0.002; e.invT=Math.max(0,e.invT-dt);
    let eSlow=1.0;
    for (const o of G.obs) if(o.tp==='nebula'&&d2(e,o)<o.r*0.85){eSlow=0.45;break;}
    const ea=a2(e,s); e.x+=Math.cos(ea)*e.spd*eSlow; e.y+=Math.sin(ea)*e.spd*eSlow;
    for (const o of G.obs) {
      if (o.tp==='nebula') continue;
      const od=d2(e,o);
      if (od<o.r+e.r+4){const oa=Math.atan2(e.y-o.y,e.x-o.x);e.x=o.x+Math.cos(oa)*(o.r+e.r+4);e.y=o.y+Math.sin(oa)*(o.r+e.r+4);}
    }
    if (d2(e,s)<e.r+17&&s.invT<=0) {
      let dmgIn={seek:12,heavy:20,fast:8}[e.tp];
      if (s.passive==='block'&&Math.random()<0.20) dmgIn=0;
      if (s.passive==='dodge'&&Math.random()<0.18){s.invT=900;continue;}
      s.hp=Math.max(0,s.hp-dmgIn); s.invT=900;
      if (dmgIn>0){shk();G.flT=420;ptcl(s.x,s.y,'#ff3344',15,3.5,3);ring(s.x,s.y,'#ff5566',26);}
      updHUD();
      if (s.hp<=0){endRun();return;}
    }
    if (d2(e,s)>900) G.ens.splice(i,1);
  }

  // ── XP Gems ──────────────────────────────────────────
  const magR=80+s.u.mag*32;
  for (let i=G.gems.length-1;i>=0;i--) {
    const g=G.gems[i]; g.life-=dt/18000; g.ph+=dt*0.003;
    if (g.life<=0){G.gems.splice(i,1);continue;}
    const gd=d2(g,s);
    if (gd<magR){const ga=a2(g,s),sp=Math.max(3,(magR-gd)/9);g.vx+=Math.cos(ga)*sp*0.2;g.vy+=Math.sin(ga)*sp*0.2;}
    g.vx*=0.88;g.vy*=0.88;g.x+=g.vx;g.y+=g.vy;
    g.x=clamp(g.x,0,WW);g.y=clamp(g.y,0,WH);
    if (gd<22) {
      G.xp+=g.val;G.score+=1;G.gems.splice(i,1);
      while (G.xp>=G.xpMax){
        G.xp-=G.xpMax;G.xpMax=Math.round(G.xpMax*XP_GROWTH);G.lvl++;
        ptcl(s.x,s.y,'#44ff88',22,5,3);ring(s.x,s.y,'#44ff88',42);
        tryUpgrade();if(G.ph!=='play')return;
      }
      updHUD();
    }
  }

  // Частицы
  for (let i=G.parts.length-1;i>=0;i--) {
    const p=G.parts[i];
    if (p.tp==='ring'){p.r+=88*dt/1000;p.life-=dt/420;}
    else{p.x+=p.vx;p.y+=p.vy;p.life-=dt/780;p.vx*=0.91;p.vy*=0.91;}
    if (p.life<=0)G.parts.splice(i,1);
  }
}

// ═══════════════════════════════════════════════════════
//  ЛОГИКА — ДОБЫЧА
// ═══════════════════════════════════════════════════════

function updateMining(dt) {
  const s=G.s;

  // Если активна добыча — проверяем дистанцию
  if (G.mining) {
    const o=G.mining.obs;
    // Проверяем что астероид ещё существует
    if (!G.obs.includes(o)) { G.mining=null; return; }
    const dist=d2sq(s,o);

    if (dist < MINE_CONT*MINE_CONT) {
      // Продолжаем добычу
      G.mining.t += dt;
      if (G.mining.t >= G.mining.maxT) {
        // Добыча завершена!
        const oreGain = o.oreValue || 2;
        G.ore += oreGain;
        ptcl(o.x,o.y,'#44ffaa',20,4,3.5);
        ring(o.x,o.y,'#44ffaa',o.r*2.5);
        ptcl(o.x,o.y,'#ffcc44',8,2.5,2);
        // Удаляем астероид
        const idx=G.obs.indexOf(o);
        if (idx>=0) G.obs.splice(idx,1);
        G.mining=null;
        updHUD();
      }
    } else {
      // Вышли из зоны — прерываем
      G.mining=null;
    }
    return;
  }

  // Нет активной добычи — ищем ближайший астероид в диапазоне
  for (const o of G.obs) {
    if (o.tp!=='asteroid') continue;
    if (d2sq(s,o) < MINE_RANGE_SQ) {
      // Начинаем добычу
      G.mining = { obs:o, t:0, maxT:MINE_TIME };
      return;
    }
  }
}

function triggerSuccess() {
  G.extraction.active=false;
  const credFromScore = Math.floor(G.score*CREDITS_PER_SCORE);
  const credFromOre   = Math.floor(G.ore*ORE_PER_CREDIT);
  const earned        = credFromScore+credFromOre;
  META.credits += earned;
  META.ore     += G.ore;
  if (G.score>META.hi) META.hi=G.score;
  saveMeta();
  G.earnedCredits=earned;
  G.ph='success';
}

function triggerFailed() {
  G.extraction.active=false;
  const credFromScore = Math.floor(G.score*CREDITS_PER_SCORE);
  const earned        = credFromScore; // ore теряется
  const xpPenalty     = Math.floor(G.xp*0.5);
  G.xp=Math.max(0,G.xp-xpPenalty);
  META.credits += earned;
  if (G.score>META.hi) META.hi=G.score;
  saveMeta();
  G.earnedCredits=earned;
  G.lostOre=G.ore;
  G.ph='failed';
}

function endRun() {
  const credFromScore = Math.floor(G.score*CREDITS_PER_SCORE);
  const credFromOre   = Math.floor(G.ore*ORE_PER_CREDIT);
  const earned        = credFromScore+credFromOre;
  META.credits += earned;
  META.ore     += G.ore;
  if (G.score>META.hi) META.hi=G.score;
  saveMeta();
  G.earnedCredits=earned;
  G.ph='over';
}

function loop(ts) {
  const dt=Math.min(ts-ts0,60);ts0=ts;
  update(dt);
  bR = draw(ts, { G, mX, mY, bR, hovI, shopSel, dt });
  requestAnimationFrame(loop);
}

// ═══════════════════════════════════════════════════════
//  ВВОД
// ═══════════════════════════════════════════════════════

function startGame() {
  G=mkG();
  G.location=LOCATIONS[Math.floor(Math.random()*LOCATIONS.length)];
  genWorld(G);initExtraction(G,G.location.dur);
  G.banT=3200;G.ph='play';updHUD();
}

function goBack() {
  if      (G.ph==='pause') G.ph='play';
  else if (G.ph==='shop')  G.ph=G.shopFrom==='pause'?'pause':'menu';
  else if (G.ph==='menu')  {} // нечего делать
}

function click(x,y) {
  for (const b of bR) {
    if (x>=b.x&&x<=b.x+b.w&&y>=b.y&&y<=b.y+b.h) {
      if      (b.act==='play')    startGame();
      else if (b.act==='shop')    { G.shopFrom=G.ph; shopSel=META.selected; G.ph='shop'; bR=[]; }
      else if (b.act==='back')    goBack();
      else if (b.act==='resume')  G.ph='play';
      else if (b.act==='newgame') startGame();
      else if (b.act==='select')  { META.selected=b.id;shopSel=b.id;saveMeta(); }
      else if (b.act==='buy') {
        if (META.credits>=b.cost&&!META.owned.includes(b.id)) {
          META.credits-=b.cost;META.owned.push(b.id);META.selected=b.id;shopSel=b.id;saveMeta();
        }
      }
      else if (b.act==='upgrade') { applyUpg(b.k);updHUD(); }
      else if (b.act==='skip') {
        G.ph='play';updHUD();
      }
      else if (b.act==='scan')    doScan();
      else if (b.act==='w3connect') w3Connect();
      else if (b.act==='w3switch')  w3SwitchChain();
      else if (b.act==='w3buyore')  w3BuyOre(b.ore);
      return;
    }
  }
}

function cvXY(e) {
  const r=CV.getBoundingClientRect(),s=W/r.width;
  return[(e.clientX-r.left)*s,(e.clientY-r.top)*s];
}

CV.addEventListener('mousemove',e=>{
  [mX,mY]=cvXY(e);
  if (G.ph==='upgrade'){hovI=-1;bR.forEach((b,i)=>{if(b.act==='upgrade'&&mX>=b.x&&mX<=b.x+b.w&&mY>=b.y&&mY<=b.y+b.h)hovI=i;});}
});
CV.addEventListener('click',e=>{const[x,y]=cvXY(e);click(x,y);});
CV.addEventListener('touchstart',e=>{e.preventDefault();[mX,mY]=cvXY(e.touches[0]);click(mX,mY);},{passive:false});
CV.addEventListener('touchmove',e=>{
  e.preventDefault();[mX,mY]=cvXY(e.touches[0]);
  if(G.ph==='upgrade'){hovI=-1;bR.forEach((b,i)=>{if(b.act==='upgrade'&&mX>=b.x&&mX<=b.x+b.w&&mY>=b.y&&mY<=b.y+b.h)hovI=i;});}
},{passive:false});

// ── Клавиатура ─────────────────────────────────────────
document.addEventListener('keydown',e=>{
  if (e.key==='Escape'||e.key==='Esc') {
    if      (G.ph==='play')  G.ph='pause';
    else if (G.ph==='pause') G.ph='play';
    else if (G.ph==='shop')  goBack();
  }
  if ((e.key===' '||e.code==='Space')&&G.ph==='play') {
    e.preventDefault();
    doScan();
  }
});

function updHUD() {
  document.getElementById('sv').textContent=G.score.toLocaleString();
  document.getElementById('wv').textContent=(G.ph==='menu'||G.ph==='shop')?'—':G.lvl;
  document.getElementById('lv').textContent=(G.ph==='menu'||G.ph==='shop')?'—':G.lvl;
  document.getElementById('orv').textContent=(G.ph==='menu'||G.ph==='shop')?META.ore:G.ore;
  document.getElementById('xpf').style.width=(G.xpMax>0?G.xp/G.xpMax*100:0)+'%';
}

G=mkG();updHUD();
bindW3Addr(() => W3.address);
initW3(C, { rRect, getApp: () => ({ G, mX, mY, updHUD, ptcl, ring }) });
initRender(C, { w3DrawToast, w3DrawConnectBtn, w3DrawShopPanel }, { ptcl });
w3Init();
requestAnimationFrame(ts=>{ts0=ts;loop(ts);});
