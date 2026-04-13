import {
  W, H, WW, WH, WSX, WSY, SPAWN_RADIUS, SCAN_RADIUS, SCAN_MAX, SCAN_COST, SCAN_REGEN,
  MINE_RANGE, MINE_RANGE_SQ, MINE_CONT, MINE_TIME, ORE_VALUE, ORE_PER_CREDIT,
  LOCATIONS, XP_BASE, XP_GROWTH, CREDITS_PER_SCORE,
  SHIPS, UPGRADES, ENEMY_CFG, SYNERGIES,
} from './config.js';
import { META, saveMeta, mkG, bindW3Addr } from './state.js';
import { genWorld, initExtraction } from './world.js';
import { trySpawnEnemies, trySpawnBoss, updateBoss, killBoss, killEn, spawnEn, updateEnemyFire, updateEBuls } from './enemies.js';
import { initRender, draw, rRect } from './render.js';
import {
  W3, w3Init, w3Connect, w3SwitchChain, w3BuyOre, w3ConfirmBuy, w3CancelBuy, w3Toast,
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

function dmgNum(x,y,val) {
  G.dmgNums.push({ x, y, val:Math.round(val), life:1, vy:1.5+Math.random()*0.5 });
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
function checkSynergy() {
  const u=G.s.u;
  G.synergy=null;
  for (const syn of SYNERGIES) {
    if (syn.needs.every(k=>u[k]>0)) { G.synergy=syn; return; }
  }
}

function applyUpg(k) {
  G.s.u[k]++;
  if (k==='armor') { G.s.mhp+=25; G.s.hp=Math.min(G.s.mhp,G.s.hp+15); }
  checkSynergy();
  ptcl(G.s.x,G.s.y,'#44ff88',18,5,3); ring(G.s.x,G.s.y,'#44ff88',45);
  G.ph='play'; updHUD();
}

// ═══════════════════════════════════════════════════════
//  ЛОГИКА — UPDATE
// ═══════════════════════════════════════════════════════

function update(dt) {
  if (G.ph!=='play') return;

  // Death animation
  if (G.deathAnim>0) {
    G.deathAnim-=dt/1000;
    for (const d of G.debris) {
      d.x+=d.vx; d.y+=d.vy; d.rot+=d.rotSpd;
      d.vx*=0.98; d.vy*=0.98; d.life=Math.max(0,G.deathAnim/2.5);
    }
    // Обновляем частицы во время анимации
    for (let i=G.parts.length-1;i>=0;i--) {
      const p=G.parts[i]; p.x+=p.vx; p.y+=p.vy; p.life-=dt/350;
      if (p.tp==='ring'){p.r+=dt*0.15;} else {p.vx*=0.96;p.vy*=0.96;}
      if (p.life<=0) G.parts.splice(i,1);
    }
    if (G.deathAnim<=0) { endRun(); }
    return;
  }

  G.flT=Math.max(0,G.flT-dt); G.shT=Math.max(0,G.shT-dt);
  if (G.shT<=0) { G.shX=0; G.shY=0; }
  G.gameT+=dt; G.banT=Math.max(0,G.banT-dt);

  // ── Tutorial tooltips ──
  if(G.tutStep<3){
    if(G.tutT>0) G.tutT=Math.max(0,G.tutT-dt);
    if(G.tutT<=0) G.tutMsg=null;
    if(G.tutStep===0&&G.gameT>500){
      G.tutMsg='Move cursor to fly';G.tutT=4000;G.tutStep=1;
    }
    if(G.tutStep===1){
      const near=G.obs.some(o=>d2(G.s,o)<200);
      if(near){G.tutMsg='SPACE \u2014 scan for ore';G.tutT=4000;G.tutStep=2;}
    }
    if(G.tutStep===2&&G.ore>0){
      G.tutMsg='Reach Extraction Zone \u2192';G.tutT=5000;G.tutStep=3;
    }
  }
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
  if (G.boss && updateBoss(G,dt,fx)) { startDeathAnim(); return; }

  // Enemy fire + enemy bullets
  updateEnemyFire(G,dt);
  if (updateEBuls(G,dt,fx)) { startDeathAnim(); return; }

  // Препятствия: дрейф + nebula pulse
  for (const o of G.obs) {
    if (o.tp==='asteroid'||o.tp==='nebula') {
      o.x+=Math.cos(o.driftAng)*o.driftSpd;
      o.y+=Math.sin(o.driftAng)*o.driftSpd;
      o.x=clamp(o.x,o.r,WW-o.r); o.y=clamp(o.y,o.r,WH-o.r);
    }
    if (o.tp==='asteroid') o.rot+=o.rotSpd*dt;
    if (o.tp==='nebula') {
      if (o.pulse===undefined) o.pulse=rn(Math.PI*2);
      o.pulse+=dt*0.0005;
    }
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

  // Engine trail (intensity scales with speed)
  const vel=Math.hypot(s.vx,s.vy);
  if (vel>0.4) {
    const fl=0.3+Math.min(0.7,vel/4); // 0.3..1.0
    const ta=s.ang+Math.PI, px=s.x+Math.cos(ta)*16, py=s.y+Math.sin(ta)*16;
    const spawnChance=0.3+fl*0.5; // 0.6..0.8
    if (Math.random()<spawnChance)
      G.parts.push({x:px+(rn(5)-2.5),y:py+(rn(5)-2.5),
        vx:Math.cos(ta)*(0.5+fl*0.8),vy:Math.sin(ta)*(0.5+fl*0.8),
        life:(0.3+fl*0.4)+rn(0.2),col:Math.random()<0.4?'#ffcc44':'#ff8822',sz:(1+fl*2)+rn(1.5),tp:'sq'});
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
      G.buls.push({x:s.x,y:s.y,vx:Math.cos(ba)*10,vy:Math.sin(ba)*10,dmg,life:1,tp:'pulse',r:5,trail:[]});
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
    // Synergy: Charged Orbs — orbs fire pulse bolts at nearest
    if (G.synergy?.id==='chargedorbs' && near) {
      if (!s._orbFireT) s._orbFireT=0;
      s._orbFireT+=dt;
      if (s._orbFireT>=1200) {
        s._orbFireT=0;
        const orb=G.orbs[Math.floor(G.orbs.length*Math.random())];
        if (orb) {
          const oa=a2(orb,near);
          G.buls.push({x:orb.x,y:orb.y,vx:Math.cos(oa)*9,vy:Math.sin(oa)*9,dmg:12*dm,life:0.8,tp:'pulse',r:4,trail:[]});
        }
      }
    }
    // Synergy: Nova Burst — orbs fire scatter bursts
    if (G.synergy?.id==='novaburst') {
      if (!s._novaT) s._novaT=0;
      s._novaT+=dt;
      if (s._novaT>=1500) {
        s._novaT=0;
        for (const orb of G.orbs) {
          for (let si=0;si<3;si++) {
            const sa=rn(Math.PI*2);
            G.buls.push({x:orb.x,y:orb.y,vx:Math.cos(sa)*6,vy:Math.sin(sa)*6,dmg:6*dm,life:0.5,tp:'scatter',r:3,trail:[]});
          }
        }
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
      const cd=(22+s.u.chain*14)*dm; e.hp-=cd; dmgNum(e.x,e.y,cd);
      ptcl(e.x,e.y,'#aaccff',6,3,2); segs.push({x:e.x,y:e.y});
      // Synergy: Storm — chain hits spawn scatter shards
      if (G.synergy?.id==='storm') {
        for (let si=0;si<2;si++) {
          const sa=rn(Math.PI*2);
          G.buls.push({x:e.x,y:e.y,vx:Math.cos(sa)*5,vy:Math.sin(sa)*5,dmg:5*dm,life:0.4,tp:'scatter',r:2.5,trail:[]});
        }
      }
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
      G.buls.push({x:s.x,y:s.y,vx:Math.cos(sa)*7.5,vy:Math.sin(sa)*7.5,dmg:(8+s.u.scatter*5)*dm,life:0.8,tp:'scatter',r:3.5,trail:[]});
    }
  }

  // ── Пули ────────────────────────────────────────────
  for (let i=G.buls.length-1;i>=0;i--) {
    const b=G.buls[i]; b.x+=b.vx; b.y+=b.vy;
    if (b.trail) { b.trail.push({x:b.x,y:b.y}); if(b.trail.length>20) b.trail.shift(); }
    b.life-=dt/(b.tp==='pulse'?1100:850);
    if (b.life<=0||b.x<0||b.x>WW||b.y<0||b.y>WH){G.buls.splice(i,1);continue;}
    let blocked=false;
    for (let oi=G.obs.length-1;oi>=0;oi--) {
      const o=G.obs[oi];
      if (o.tp==='nebula') continue;
      if (d2(b,o)<o.r) {
        const sparkCol=o.tp==='asteroid'?{poor:'#888899',medium:'#ffaa44',rich:'#44ffaa'}[o.subtype]||'#aaaaaa':'#aaaaaa';
        ptcl(b.x,b.y,sparkCol,4,2,2); blocked=true;
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
    // Пуля игрока → враги
    for (let j=G.ens.length-1;j>=0;j--) {
      if (d2(b,G.ens[j])<b.r+G.ens[j].r) {
        G.ens[j].hp-=b.dmg; dmgNum(b.x,b.y,b.dmg);
        ptcl(b.x,b.y,b.tp==='pulse'?'#55aaff':'#ffaa33',5,2,2);
        // Synergy: Bolt Arc — pulse hit chains to 1 nearby
        if (G.synergy?.id==='boltarc' && b.tp==='pulse') {
          const nearby=G.ens.filter((e2,k)=>k!==j&&d2(b,e2)<150).sort((a2,b2)=>d2(b,a2)-d2(b,b2))[0];
          if (nearby) { const cd=b.dmg*0.5; nearby.hp-=cd; dmgNum(nearby.x,nearby.y,cd); ptcl(nearby.x,nearby.y,'#aaccff',4,2,2);
            G.chainFl={segs:[{x:b.x,y:b.y},{x:nearby.x,y:nearby.y}],life:0.5};
            if(nearby.hp<=0){const idx=G.ens.indexOf(nearby);if(idx>=0)killEn(G,idx,fx);}
          }
        }
        hit=true; if(G.ens[j].hp<=0)killEn(G,j,fx); break;
      }
    }
    // Пуля игрока → босс
    if (!hit && G.boss && d2(b,G.boss)<b.r+G.boss.r) {
      G.boss.hp-=b.dmg; dmgNum(b.x,b.y,b.dmg);
      ptcl(b.x,b.y,'#ffdd44',6,3,2);
      hit=true; if(G.boss.hp<=0) killBoss(G,fx);
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
      if (s.hp<=0){startDeathAnim();return;}
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

function startDeathAnim() {
  G.deathAnim=2.5;
  G.debris=[];
  for (let i=0;i<18;i++) {
    const a=rn(Math.PI*2), spd=1.5+rn(3);
    G.debris.push({
      x:G.s.x, y:G.s.y,
      vx:Math.cos(a)*spd, vy:Math.sin(a)*spd,
      rot:rn(Math.PI*2), rotSpd:(rn(2)-1)*0.08,
      sz:3+rn(5), life:1,
      col:['#88ccff','#1d5e98','#55aaff','#ffffff'][ri(4)],
    });
  }
  ptcl(G.s.x,G.s.y,'#ffdd44',30,6,4);
  ring(G.s.x,G.s.y,'#ff6644',60);
  shk();
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
  try {
    const dt=Math.min(ts-ts0,60);ts0=ts;
    update(dt);
    bR = draw(ts, { G, mX, mY, bR, hovI, shopSel, dt });
  } catch(e) {
    console.error('[VS crash]', e);
    G.ph = 'error';
  }
  requestAnimationFrame(loop);
}

// ═══════════════════════════════════════════════════════
//  ВВОД
// ═══════════════════════════════════════════════════════

function startGame() {
  G=mkG();
  G.location=LOCATIONS[Math.floor(Math.random()*LOCATIONS.length)];
  genWorld(G);initExtraction(G,G.location.dur);
  G.banT=3200;updHUD();
  if(META.firstTime){ G.ph='tutorial'; }
  else { G.ph='play'; }
}

function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen();
  } else {
    document.getElementById('game').requestFullscreen().catch(()=>{});
  }
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
      else if (b.act==='firstRun'||b.act==='skipTutorial'){
        if(META.firstTime){ META.firstTime=false;saveMeta();G.tutStep=0;G.ph='play'; }
        else { G.ph='menu'; }
      }
      else if (b.act==='howtoplay')   { G.ph='tutorial'; }
      else if (b.act==='fullscreen') toggleFullscreen();
      else if (b.act==='w3connect') w3Connect();
      else if (b.act==='w3switch')  w3SwitchChain();
      else if (b.act==='w3buyore')  w3BuyOre(b.ore);
      else if (b.act==='w3confirm') w3ConfirmBuy();
      else if (b.act==='w3cancel')  w3CancelBuy();
      else if (b.act==='reload')   location.reload();
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

// ── Автопауза ─────────────────────────────────────────
document.addEventListener('visibilitychange', () => {
  if (document.hidden && G.ph==='play') G.ph='pause';
});

// ── Клавиатура ─────────────────────────────────────────
document.addEventListener('keydown',e=>{
  if (e.code==='Escape') {
    if (document.fullscreenElement) { document.exitFullscreen(); return; }
    if      (G.ph==='play')  G.ph='pause';
    else if (G.ph==='pause') G.ph='play';
    else if (G.ph==='shop')  goBack();
  }
  if (e.code==='KeyF') { toggleFullscreen(); return; }
  if (e.code==='Space'&&G.ph==='play') {
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
