import {
  W, H, WW, WH, STAR_LAYERS, STAR_DATA, NEBS, SHIPS, UPGRADES,
  SCAN_MAX, SCAN_COST, SCAN_RADIUS, MINE_RANGE_SQ,
} from './config.js';
import { META, saveMeta } from './state.js';

// ── Module-level refs ─────────────────────────────────
let C;
let G, mX, mY, bR, hovI, shopSel, _dt;
let w3DrawToast, w3DrawConnectBtn, w3DrawShopPanel;
let ptcl;

const rn = n => Math.random() * n;
const ri = n => Math.floor(Math.random() * n);
const d2   = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const d2sq = (a, b) => (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
const a2 = (a, b) => Math.atan2(b.y - a.y, b.x - a.x);

export function initRender(ctx, w3fns, fxfns) {
  C = ctx;
  w3DrawToast = w3fns.w3DrawToast;
  w3DrawConnectBtn = w3fns.w3DrawConnectBtn;
  w3DrawShopPanel = w3fns.w3DrawShopPanel;
  ptcl = fxfns.ptcl;
}

function wx(worldX) { return worldX - G.cam.x; }
function wy(worldY) { return worldY - G.cam.y; }
function isVis(worldX, worldY, margin = 80) {
  return worldX > G.cam.x - margin && worldX < G.cam.x + W + margin &&
         worldY > G.cam.y - margin && worldY < G.cam.y + H + margin;
}

export function rRect(x,y,w,h,r) {
  C.beginPath();C.moveTo(x+r,y);C.lineTo(x+w-r,y);C.quadraticCurveTo(x+w,y,x+w,y+r);
  C.lineTo(x+w,y+h-r);C.quadraticCurveTo(x+w,y+h,x+w-r,y+h);
  C.lineTo(x+r,y+h);C.quadraticCurveTo(x,y+h,x,y+h-r);
  C.lineTo(x,y+r);C.quadraticCurveTo(x,y,x+r,y);C.closePath();
}

function drawBGPlay(t) {
  C.fillStyle='#030810';C.fillRect(0,0,W,H);
  const nebFactor=0.6;
  NEBS.forEach(n=>{
    const sx=((n.x-G.cam.x*nebFactor)%WW+WW)%WW-WW/2;
    const sy=((n.y-G.cam.y*nebFactor)%WH+WH)%WH-WH/2;
    C.fillStyle=`hsla(${n.h},55%,22%,0.08)`;C.beginPath();C.arc(sx,sy,n.r,0,Math.PI*2);C.fill();
    C.fillStyle=`hsla(${n.h},55%,38%,0.05)`;C.beginPath();C.arc(sx,sy,n.r*0.55,0,Math.PI*2);C.fill();
  });
  STAR_LAYERS.forEach((layer,li)=>{
    STAR_DATA[li].forEach(s=>{
      const sx=((s.px*W-G.cam.x*layer.factor)%W+W)%W;
      const sy=((s.py*H-G.cam.y*layer.factor)%H+H)%H;
      C.globalAlpha=layer.alpha*(0.5+0.5*Math.sin(s.ph+t*0.0009));
      C.fillStyle='#fff';C.beginPath();C.arc(sx,sy,s.r,0,Math.PI*2);C.fill();
    });
  });
  C.globalAlpha=1;
}

function drawBGStatic(t) {
  C.fillStyle='#030810';C.fillRect(0,0,W,H);
  NEBS.slice(0,5).forEach(n=>{
    C.fillStyle=`hsla(${n.h},55%,22%,0.08)`;C.beginPath();C.arc(n.x*W/WW,n.y*H/WH,n.r*W/WW,0,Math.PI*2);C.fill();
  });
  STAR_DATA[0].forEach(s=>{
    C.globalAlpha=0.2+0.5*(0.5+0.5*Math.sin(s.ph+t*0.0007));
    C.fillStyle='#fff';C.beginPath();C.arc(s.px*W,s.py*H,s.r,0,Math.PI*2);C.fill();
  });
  C.globalAlpha=1;
}

// ═══════════════════════════════════════════════════════
//  РЕНДЕР — ПРЕПЯТСТВИЯ
// ═══════════════════════════════════════════════════════

function drawObstacles(t) {
  for (const o of G.obs) {
    if (!isVis(o.x,o.y,o.r+20)) continue;
    const sx=wx(o.x),sy=wy(o.y);
    if (o.tp==='asteroid') {
      C.save();C.translate(sx,sy);C.rotate(o.rot);
      const shades=[['#1a1a24','#2a2a38','#3a3a50'],['#1c1810','#2e2618','#403620'],['#141c10','#20300c','#304420']];
      const sh=shades[o.shade||0];
      C.globalAlpha=0.07;C.fillStyle=sh[2];C.beginPath();
      o.verts.forEach((v,i)=>i?C.lineTo(v.x*1.25,v.y*1.25):C.moveTo(v.x*1.25,v.y*1.25));
      C.closePath();C.fill();C.globalAlpha=1;
      C.fillStyle=sh[0];C.beginPath();
      o.verts.forEach((v,i)=>i?C.lineTo(v.x,v.y):C.moveTo(v.x,v.y));
      C.closePath();C.fill();
      C.fillStyle=sh[1];C.beginPath();
      o.verts.forEach((v,i)=>i?C.lineTo(v.x*0.78,v.y*0.78):C.moveTo(v.x*0.78,v.y*0.78));
      C.closePath();C.fill();
      C.fillStyle=sh[2];C.beginPath();
      o.verts.forEach((v,i)=>i?C.lineTo(v.x*0.4+1,v.y*0.4-1):C.moveTo(v.x*0.4+1,v.y*0.4-1));
      C.closePath();C.fill();
      C.strokeStyle=sh[0];C.lineWidth=0.8;
      C.beginPath();C.moveTo(-o.r*0.25,-o.r*0.2);C.lineTo(o.r*0.1,o.r*0.18);C.lineTo(-o.r*0.05,o.r*0.3);C.stroke();
      C.beginPath();C.moveTo(o.r*0.15,-o.r*0.3);C.lineTo(o.r*0.28,o.r*0.06);C.stroke();
      C.strokeStyle=sh[2]+'55';C.lineWidth=1;C.beginPath();
      o.verts.forEach((v,i)=>i?C.lineTo(v.x,v.y):C.moveTo(v.x,v.y));C.closePath();C.stroke();

      // Цветной ореол по типу (виден в игре)
      const oreColor={poor:'#888899',medium:'#ffaa44',rich:'#44ffaa'}[o.subtype];
      C.globalAlpha=0.18;C.strokeStyle=oreColor;C.lineWidth=1.5;
      C.beginPath();C.arc(0,0,o.r*1.1,0,Math.PI*2);C.stroke();
      C.globalAlpha=1;

      // Иконка типа (маленький значок)
      const iconCol={poor:'#888899',medium:'#ffaa44',rich:'#44ffaa'}[o.subtype];
      C.fillStyle=iconCol;C.font=`${Math.max(8,o.r*0.35)}px system-ui`;
      C.textAlign='center';C.textBaseline='middle';
      C.fillText({poor:'◆',medium:'◆',rich:'◆'}[o.subtype]||'◆',0,0);

      // Mining активен — пульсирующий ореол
      if (G.mining&&G.mining.obs===o) {
        const prog=G.mining.t/G.mining.maxT;
        C.globalAlpha=0.25+0.15*Math.sin(t*0.012);C.strokeStyle='#44ffaa';C.lineWidth=2.5;
        C.beginPath();C.arc(0,0,o.r*1.25,0,Math.PI*2);C.stroke();
        // Прогресс-дуга
        C.globalAlpha=0.9;C.strokeStyle='#44ffaa';C.lineWidth=3;
        C.beginPath();C.arc(0,0,o.r+10,-Math.PI/2,-Math.PI/2+Math.PI*2*prog);C.stroke();
        C.globalAlpha=1;
      }

      // В радиусе добычи (но не добываем)
      else if (!G.mining && d2sq(G.s,o)<MINE_RANGE_SQ) {
        C.globalAlpha=0.12+0.06*Math.sin(t*0.006);C.strokeStyle='#44ffaa';C.lineWidth=1.5;
        C.beginPath();C.arc(0,0,o.r*1.2,0,Math.PI*2);C.stroke();C.globalAlpha=1;
      }
      C.restore();

    } else if (o.tp==='nebula') {
      const pulse=o.pulse||0;
      const scale=1+0.05*Math.sin(pulse);
      const nr=o.r*scale;
      C.save();C.translate(sx,sy);
      C.globalAlpha=0.05+0.015*Math.sin(pulse*1.3);C.fillStyle=`hsl(${o.hue},60%,35%)`;C.beginPath();C.arc(0,0,nr,0,Math.PI*2);C.fill();
      C.globalAlpha=0.08+0.02*Math.sin(pulse*0.7);C.fillStyle=`hsl(${o.hue},55%,45%)`;C.beginPath();C.ellipse(-nr*0.12,nr*0.08,nr*0.7,nr*0.62,0.4,0,Math.PI*2);C.fill();
      C.globalAlpha=0.12;C.strokeStyle=`hsl(${o.hue},50%,55%)`;C.lineWidth=2;C.setLineDash([8,12]);
      C.beginPath();C.arc(0,0,nr*0.9,0,Math.PI*2);C.stroke();C.setLineDash([]);
      if (d2(G.s,o)<o.r){C.globalAlpha=0.18+0.08*Math.sin(pulse*2);C.strokeStyle=`hsl(${o.hue},70%,65%)`;C.lineWidth=2;C.beginPath();C.arc(0,0,nr*0.88,0,Math.PI*2);C.stroke();}
      C.globalAlpha=1;C.restore();

    } else { // crystal
      C.save();C.translate(sx,sy);C.rotate(o.rot+t*0.0005);
      const hp_pct=o.hp/o.mhp,h=o.hue,r=o.r;
      C.globalAlpha=0.1*hp_pct;C.fillStyle=`hsl(${h},70%,60%)`;C.beginPath();C.arc(0,0,r+8,0,Math.PI*2);C.fill();
      C.globalAlpha=hp_pct;
      C.fillStyle=`hsl(${h},55%,15%)`;C.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/6;i?C.lineTo(Math.cos(a)*r,Math.sin(a)*r):C.moveTo(Math.cos(a)*r,Math.sin(a)*r);}C.closePath();C.fill();
      C.fillStyle=`hsl(${h},60%,28%)`;C.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/6,rr=r*0.72;i?C.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):C.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}C.closePath();C.fill();
      C.fillStyle=`hsl(${h},65%,42%)`;C.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/6,rr=r*0.42;i?C.lineTo(Math.cos(a)*rr,Math.sin(a)*rr):C.moveTo(Math.cos(a)*rr,Math.sin(a)*rr);}C.closePath();C.fill();
      C.fillStyle=`hsl(${h},80%,65%)`;C.beginPath();C.arc(0,0,r*0.2,0,Math.PI*2);C.fill();
      C.fillStyle='rgba(255,255,255,0.5)';C.beginPath();C.arc(-r*0.06,-r*0.08,r*0.08,0,Math.PI*2);C.fill();
      if (hp_pct<0.5){C.globalAlpha=(1-hp_pct)*0.6;C.strokeStyle='#fff';C.lineWidth=0.6;C.beginPath();C.moveTo(-r*0.2,-r*0.3);C.lineTo(r*0.1,r*0.2);C.stroke();}
      C.globalAlpha=1;C.restore();
    }
  }
}

// ─── Mining beam ───────────────────────────────────────
function drawMiningBeam(t) {
  if (!G.mining) return;
  const o=G.mining.obs;
  if (!G.obs.includes(o)) return;
  const sx=wx(G.s.x), sy=wy(G.s.y);
  const ex=wx(o.x), ey=wy(o.y);

  // Силовой луч
  const flicker=0.7+0.3*Math.sin(t*0.025);
  C.save();
  C.strokeStyle=`rgba(68,255,170,${0.5*flicker})`;C.lineWidth=3;
  C.shadowColor='#44ffaa';C.shadowBlur=8;
  C.setLineDash([8,4]);C.beginPath();C.moveTo(sx,sy);C.lineTo(ex,ey);C.stroke();
  C.setLineDash([]);
  C.strokeStyle=`rgba(180,255,230,${0.3*flicker})`;C.lineWidth=1;
  C.beginPath();C.moveTo(sx,sy);C.lineTo(ex,ey);C.stroke();
  C.shadowBlur=0;

  // Частицы вдоль луча
  if (Math.random()<0.25) {
    const prog=Math.random();
    ptcl(G.s.x+(o.x-G.s.x)*prog+(rn(6)-3), G.s.y+(o.y-G.s.y)*prog+(rn(6)-3), '#44ffaa',1,1,1.5);
  }

  // Ore label
  const oreColor={poor:'#888899',medium:'#ffaa44',rich:'#44ffaa'}[o.subtype]||'#44ffaa';
  const prog=G.mining.t/G.mining.maxT;
  C.font='10px system-ui,sans-serif';C.fillStyle=oreColor;C.textAlign='center';C.textBaseline='bottom';
  const lx=wx(o.x),ly=wy(o.y)-o.r-16;
  C.fillText(`+${o.oreValue} ore`,lx,ly);
  C.restore();
}

// ─── Scan pulse ────────────────────────────────────────
function drawScanPulse() {
  if (G.scanPulse<=0) return;
  C.save();
  C.globalAlpha=G.scanPulse*0.35;
  C.strokeStyle='#44aaff';C.lineWidth=2;
  C.beginPath();C.arc(wx(G.s.x),wy(G.s.y),G.scanPulseR,0,Math.PI*2);C.stroke();
  C.globalAlpha=G.scanPulse*0.06;
  C.fillStyle='#44aaff';C.beginPath();C.arc(wx(G.s.x),wy(G.s.y),G.scanPulseR,0,Math.PI*2);C.fill();
  C.globalAlpha=1;C.restore();
}

// ─── Scan UI ───────────────────────────────────────────
function drawScanUI() {
  const pips=SCAN_MAX/SCAN_COST; // 5
  const filled=Math.floor(G.scanEnergy/SCAN_COST);
  const canScan=G.scanEnergy>=SCAN_COST;
  const bx=W-130, by=8, bw=122, bh=22;

  // Фон
  rRect(bx-2,by-2,bw+4,bh+4,4);
  C.fillStyle='rgba(3,8,16,0.7)';C.fill();

  // Кнопка-лейбл
  C.font='9px system-ui,sans-serif';
  C.fillStyle=canScan?'#44aaff':'#224466';
  C.textAlign='left';C.textBaseline='middle';
  C.fillText('SCAN',bx+4,by+bh/2);

  // Пипки энергии
  for (let i=0;i<pips;i++) {
    const full=i<filled;
    const px=bx+42+i*15;
    rRect(px,by+5,12,10,2);
    C.fillStyle=full?'#44aaff':'#0a1828';C.fill();
    if (full){C.fillStyle='rgba(100,200,255,0.3)';C.fill();}
  }

  // Кнопка для клика
  bR.push({x:bx-2,y:by-2,w:bw+4,h:bh+4,act:'scan'});
}

// ─── Мини-карта ────────────────────────────────────────
function drawMinimap() {
  const mw=192, mh=192, mx=W-mw-10, my=H-mh-10;
  const sx=WW/mw, sy=WH/mh;

  rRect(mx-2,my-2,mw+4,mh+4,4);
  C.fillStyle='rgba(3,8,16,0.75)';C.fill();
  C.strokeStyle='#ffffff12';C.lineWidth=0.5;C.stroke();

  // Viewport
  C.strokeStyle='#ffffff18';C.lineWidth=0.8;
  C.strokeRect(mx+G.cam.x/sx,my+G.cam.y/sy,W/sx,H/sy);

  // Revealed туманности
  for (const o of G.obs) {
    if (o.tp!=='nebula') continue;
    C.globalAlpha=0.25;C.fillStyle=`hsl(${o.hue},50%,35%)`;
    C.beginPath();C.arc(mx+o.x/sx,my+o.y/sy,o.r/sx,0,Math.PI*2);C.fill();
  }
  C.globalAlpha=1;

  // Revealed астероиды — с цветом по типу
  const asteroidColors={poor:'#888899',medium:'#ffaa44',rich:'#44ffaa'};
  for (const o of G.obs) {
    if (o.tp!=='asteroid'||!o.revealed) continue;
    C.fillStyle=asteroidColors[o.subtype]||'#888899';
    C.globalAlpha=0.7;
    C.beginPath();C.arc(mx+o.x/sx,my+o.y/sy,Math.max(1.5,o.r/sx),0,Math.PI*2);C.fill();
    C.globalAlpha=1;
  }

  // Кристаллы (всегда видны)
  for (const o of G.obs) {
    if (o.tp!=='crystal') continue;
    C.fillStyle=`hsl(${o.hue},60%,50%)`;C.globalAlpha=0.55;
    C.beginPath();C.arc(mx+o.x/sx,my+o.y/sy,Math.max(1,o.r/sx),0,Math.PI*2);C.fill();
    C.globalAlpha=1;
  }

  // Radar-метки врагов (из скана, затухают)
  const enColors={seek:'#ee4444',heavy:'#ff8800',fast:'#cc44ff'};
  G.revealedEns.forEach(e=>{
    C.globalAlpha=e.life*0.8;
    C.fillStyle=enColors[e.tp]||'#ff4444';
    C.beginPath();C.arc(mx+e.x/sx,my+e.y/sy,2.5,0,Math.PI*2);C.fill();
  });
  C.globalAlpha=1;

  // Враги в viewport (всегда)
  for (const e of G.ens) {
    if (!isVis(e.x,e.y,e.r)) continue;
    C.fillStyle=enColors[e.tp]||'#ff4444';
    C.beginPath();C.arc(mx+e.x/sx,my+e.y/sy,2,0,Math.PI*2);C.fill();
  }

  // Gems
  C.fillStyle='#44ff88';
  for (const g of G.gems) {C.beginPath();C.arc(mx+g.x/sx,my+g.y/sy,1,0,Math.PI*2);C.fill();}

  // Добываемый астероид — мигает
  if (G.mining&&G.obs.includes(G.mining.obs)) {
    const o=G.mining.obs;
    C.fillStyle='#44ffaa';C.globalAlpha=0.9+0.1*Math.sin(Date.now()*0.01);
    C.beginPath();C.arc(mx+o.x/sx,my+o.y/sy,3,0,Math.PI*2);C.fill();
    C.globalAlpha=1;
  }

  // Extraction zone
  if (G.extraction.active&&G.extraction.zone) {
    const ez=G.extraction.zone;
    C.fillStyle='#44ff88';C.globalAlpha=0.7+0.3*Math.sin(Date.now()*0.004);
    C.beginPath();C.arc(mx+ez.x/sx,my+ez.y/sy,3.5,0,Math.PI*2);C.fill();
    C.globalAlpha=1;
  }

  // Boss
  if (G.boss) {
    C.fillStyle='#ff4444';C.globalAlpha=0.8+0.2*Math.sin(Date.now()*0.005);
    C.beginPath();C.arc(mx+G.boss.x/sx,my+G.boss.y/sy,4,0,Math.PI*2);C.fill();
    C.globalAlpha=1;
  }

  // Игрок
  C.fillStyle='#fff';C.beginPath();C.arc(mx+G.s.x/sx,my+G.s.y/sy,2.5,0,Math.PI*2);C.fill();

  // Граница карты
  C.strokeStyle='#ffffff15';C.lineWidth=0.5;rRect(mx,my,mw,mh,3);C.stroke();
}

// ─── Extraction Zone ───────────────────────────────────
function drawExtraction(t) {
  if (!G.extraction.active||!G.extraction.zone) return;
  const z=G.extraction.zone;
  if (!isVis(z.x,z.y,z.radius+20)) return;
  const sx=wx(z.x), sy=wy(z.y);
  const pulse=1+0.12*Math.sin(t/500);
  const r=z.radius*pulse;

  // Внешний круг
  C.strokeStyle='rgba(68,255,136,0.35)';C.lineWidth=2;
  C.beginPath();C.arc(sx,sy,r,0,Math.PI*2);C.stroke();

  // Заливка
  C.fillStyle='rgba(68,255,136,0.06)';
  C.beginPath();C.arc(sx,sy,r,0,Math.PI*2);C.fill();

  // Внутренний пунктирный круг
  C.setLineDash([8,6]);C.strokeStyle='rgba(68,255,136,0.5)';C.lineWidth=1;
  C.beginPath();C.arc(sx,sy,z.radius*0.5,0,Math.PI*2);C.stroke();
  C.setLineDash([]);

  // Надпись EXTRACT
  C.textAlign='center';C.textBaseline='bottom';
  C.font='bold 13px system-ui,sans-serif';
  C.fillStyle=`rgba(68,255,136,${0.6+0.2*Math.sin(t/400)})`;
  C.fillText('EXTRACT',sx,sy-r-6);

  // Прогресс-бар EXTRACTING когда игрок внутри
  if (G.extraction.playerInZone>0) {
    const prog=Math.min(1,G.extraction.playerInZone/3);
    const remaining=Math.ceil(3-G.extraction.playerInZone);
    const bw=100, bh=8, bx=sx-bw/2, by=sy+r+12;
    C.fillStyle='rgba(0,0,0,0.5)';C.fillRect(bx-1,by-1,bw+2,bh+2);
    C.fillStyle='#44ff88';C.fillRect(bx,by,bw*prog,bh);
    C.textAlign='center';C.textBaseline='top';
    C.font='bold 11px system-ui,sans-serif';C.fillStyle='#44ff88';
    C.fillText('EXTRACTING '+remaining+'...',sx,by+bh+4);
  }
}

// ─── Граница мира ──────────────────────────────────────
function drawWorldBorder() {
  C.strokeStyle='rgba(68,100,170,0.22)';C.lineWidth=3;
  C.setLineDash([15,20]);C.strokeRect(wx(0),wy(0),WW,WH);C.setLineDash([]);
}

// ═══════════════════════════════════════════════════════
//  РЕНДЕР — СПРАЙТЫ КОРАБЛЕЙ
// ═══════════════════════════════════════════════════════

function drawShipSprite(id,x,y,ang,t,u,isPlay) {
  const fl=0.55+0.45*Math.sin(t*0.018);
  C.save();C.translate(x,y);C.rotate(ang);
  if      (id==='vanguard')  _drawVanguard(fl,t,u,isPlay);
  else if (id==='bulwark')   _drawBulwark(fl,t,u,isPlay);
  else if (id==='raider')    _drawRaider(fl,t,u,isPlay);
  else if (id==='artillery') _drawArtillery(fl,t,u,isPlay);
  else if (id==='phantom')   _drawPhantom(fl,t,u,isPlay);
  else if (id==='sentinel')  _drawSentinel(fl,t,u,isPlay);
  if (u&&u.orbit>0){C.globalAlpha=0.1+0.07*Math.sin(t*0.005);C.strokeStyle='#44aaff';C.lineWidth=1.5;C.beginPath();C.arc(0,0,22,0,Math.PI*2);C.stroke();C.globalAlpha=1;}
  if (isPlay&&G.s.invT>0&&Math.floor(G.s.invT/75)%2===0){C.globalAlpha=0.4;C.fillStyle='#fff';C.beginPath();C.moveTo(19,0);C.lineTo(-3,-11);C.lineTo(-17,-6.5);C.lineTo(-17,6.5);C.lineTo(-3,11);C.closePath();C.fill();C.globalAlpha=1;}
  C.restore();
}

function _drawVanguard(fl,t) {
  C.fillStyle=`rgba(255,175,35,${0.09*fl})`;C.beginPath();C.ellipse(-24,0,18*fl,7,0,0,Math.PI*2);C.fill();
  C.fillStyle=`rgba(255,210,75,${0.48*fl})`;C.beginPath();C.ellipse(-18,0,9*fl,4.5,0,0,Math.PI*2);C.fill();
  C.fillStyle='rgba(255,245,180,.88)';C.beginPath();C.arc(-14,0,3,0,Math.PI*2);C.fill();
  C.fillStyle='#0c2035';C.beginPath();C.moveTo(4,-11);C.lineTo(-18,-25);C.lineTo(-23,-16);C.lineTo(-5,-7);C.closePath();C.fill();
  C.beginPath();C.moveTo(4,11);C.lineTo(-18,25);C.lineTo(-23,16);C.lineTo(-5,7);C.closePath();C.fill();
  C.fillStyle='#184e7e';C.beginPath();C.moveTo(6,-9);C.lineTo(-16,-22);C.lineTo(-19,-15);C.lineTo(-3,-5);C.closePath();C.fill();
  C.beginPath();C.moveTo(6,9);C.lineTo(-16,22);C.lineTo(-19,15);C.lineTo(-3,5);C.closePath();C.fill();
  C.fillStyle='#2c78b5';C.beginPath();C.moveTo(6,-8);C.lineTo(-13,-19);C.lineTo(-15,-13);C.lineTo(-1,-4);C.closePath();C.fill();
  C.beginPath();C.moveTo(6,8);C.lineTo(-13,19);C.lineTo(-15,13);C.lineTo(-1,4);C.closePath();C.fill();
  C.strokeStyle='#44aadd';C.lineWidth=0.8;C.beginPath();C.moveTo(4,-8);C.lineTo(-10,-17);C.stroke();C.beginPath();C.moveTo(4,8);C.lineTo(-10,17);C.stroke();
  C.fillStyle='#0d2035';C.beginPath();C.moveTo(21,0);C.lineTo(-4,-13);C.lineTo(-19,-8);C.lineTo(-19,8);C.lineTo(-4,13);C.closePath();C.fill();
  C.fillStyle='#1d5e98';C.beginPath();C.moveTo(19,0);C.lineTo(-3,-11);C.lineTo(-17,-6.5);C.lineTo(-17,6.5);C.lineTo(-3,11);C.closePath();C.fill();
  C.fillStyle='#3888cc';C.beginPath();C.moveTo(17,0);C.lineTo(2,-5.5);C.lineTo(-9,-3.5);C.lineTo(-9,1);C.lineTo(2,3);C.closePath();C.fill();
  C.fillStyle='#66aaee';C.beginPath();C.moveTo(13,0);C.lineTo(5,-2.5);C.lineTo(-4,-1.5);C.lineTo(-4,.5);C.lineTo(5,1.5);C.closePath();C.fill();
  C.fillStyle='#071626';C.beginPath();C.ellipse(-17,0,4,6,0,0,Math.PI*2);C.fill();
  C.fillStyle='#0f2f50';C.beginPath();C.ellipse(-16,0,2.8,4.5,0,0,Math.PI*2);C.fill();
  C.fillStyle='#040d1c';C.beginPath();C.ellipse(6,0,8,6,0,0,Math.PI*2);C.fill();
  C.fillStyle='#2064a8';C.beginPath();C.ellipse(5.5,-.3,6.5,4.8,0,0,Math.PI*2);C.fill();
  C.fillStyle='#4ea8dd';C.beginPath();C.ellipse(4.5,-1,5,3.5,0,0,Math.PI*2);C.fill();
  C.fillStyle='#88ccff';C.beginPath();C.ellipse(3,-2,2.8,1.8,-.25,0,Math.PI*2);C.fill();
  C.fillStyle='#cceeffe0';C.beginPath();C.arc(2.2,-2.8,.8,0,Math.PI*2);C.fill();
}
function _drawBulwark(fl,t) {
  for (const sy of [-6,6]){C.fillStyle=`rgba(160,120,255,${0.07*fl})`;C.beginPath();C.ellipse(-22,sy,14*fl,5,0,0,Math.PI*2);C.fill();C.fillStyle=`rgba(200,160,255,${0.42*fl})`;C.beginPath();C.ellipse(-17,sy,7*fl,3.2,0,0,Math.PI*2);C.fill();C.fillStyle='rgba(240,220,255,.85)';C.beginPath();C.arc(-13,sy,2.2,0,Math.PI*2);C.fill();}
  C.fillStyle='#151530';C.beginPath();C.moveTo(8,-10);C.lineTo(-20,-30);C.lineTo(-26,-18);C.lineTo(-4,-7);C.closePath();C.fill();C.beginPath();C.moveTo(8,10);C.lineTo(-20,30);C.lineTo(-26,18);C.lineTo(-4,7);C.closePath();C.fill();
  C.fillStyle='#2a2a6a';C.beginPath();C.moveTo(8,-9);C.lineTo(-18,-26);C.lineTo(-22,-16);C.lineTo(-2,-6);C.closePath();C.fill();C.beginPath();C.moveTo(8,9);C.lineTo(-18,26);C.lineTo(-22,16);C.lineTo(-2,6);C.closePath();C.fill();
  C.fillStyle='#3a3a8a';C.beginPath();C.moveTo(0,-8);C.lineTo(-12,-20);C.lineTo(-14,-14);C.lineTo(-2,-5);C.closePath();C.fill();C.beginPath();C.moveTo(0,8);C.lineTo(-12,20);C.lineTo(-14,14);C.lineTo(-2,5);C.closePath();C.fill();
  C.strokeStyle='#6666cc';C.lineWidth=0.9;C.beginPath();C.moveTo(4,-8);C.lineTo(-10,-18);C.stroke();C.beginPath();C.moveTo(4,8);C.lineTo(-10,18);C.stroke();
  C.fillStyle='#0e0e28';C.beginPath();C.moveTo(20,0);C.lineTo(-2,-15);C.lineTo(-20,-10);C.lineTo(-20,10);C.lineTo(-2,15);C.closePath();C.fill();
  C.fillStyle='#1e1e58';C.beginPath();C.moveTo(18,0);C.lineTo(-1,-13);C.lineTo(-18,-8);C.lineTo(-18,8);C.lineTo(-1,13);C.closePath();C.fill();
  C.fillStyle='#3030a0';C.beginPath();C.moveTo(15,0);C.lineTo(2,-8);C.lineTo(-10,-5);C.lineTo(-10,5);C.lineTo(2,8);C.closePath();C.fill();
  C.fillStyle='#5050cc';C.beginPath();C.moveTo(11,0);C.lineTo(4,-4);C.lineTo(-6,-2.5);C.lineTo(-6,2.5);C.lineTo(4,4);C.closePath();C.fill();
  C.globalAlpha=0.15+0.08*Math.sin(t*0.003);C.strokeStyle='#9999ff';C.lineWidth=2;C.beginPath();C.arc(0,0,26,0,Math.PI*2);C.stroke();C.globalAlpha=1;
  C.fillStyle='#07071a';C.beginPath();C.ellipse(-18,-6,3.5,5,0,0,Math.PI*2);C.fill();C.beginPath();C.ellipse(-18,6,3.5,5,0,0,Math.PI*2);C.fill();
  C.fillStyle='#040410';C.beginPath();C.ellipse(5,0,9,7,0,0,Math.PI*2);C.fill();C.fillStyle='#181870';C.beginPath();C.ellipse(4.5,-.3,7,5.5,0,0,Math.PI*2);C.fill();C.fillStyle='#4040bb';C.beginPath();C.ellipse(3.5,-1,5.5,4,0,0,Math.PI*2);C.fill();C.fillStyle='#9999ee';C.beginPath();C.ellipse(2,-2,3,2,-.2,0,Math.PI*2);C.fill();C.fillStyle='#ccccff';C.beginPath();C.arc(1.5,-2.5,.9,0,Math.PI*2);C.fill();
}
function _drawRaider(fl,t) {
  C.fillStyle=`rgba(50,255,100,${0.08*fl})`;C.beginPath();C.ellipse(-26,0,22*fl,5,0,0,Math.PI*2);C.fill();C.fillStyle=`rgba(100,255,130,${0.5*fl})`;C.beginPath();C.ellipse(-20,0,11*fl,3.5,0,0,Math.PI*2);C.fill();C.fillStyle='rgba(200,255,200,.9)';C.beginPath();C.arc(-15,0,2.5,0,Math.PI*2);C.fill();
  C.fillStyle='#0a1a0a';C.beginPath();C.moveTo(10,-5);C.lineTo(-14,-18);C.lineTo(-22,-10);C.lineTo(-2,-3);C.closePath();C.fill();C.beginPath();C.moveTo(10,5);C.lineTo(-14,18);C.lineTo(-22,10);C.lineTo(-2,3);C.closePath();C.fill();
  C.fillStyle='#1a3a1a';C.beginPath();C.moveTo(9,-4);C.lineTo(-12,-15);C.lineTo(-18,-9);C.lineTo(-1,-2.5);C.closePath();C.fill();C.beginPath();C.moveTo(9,4);C.lineTo(-12,15);C.lineTo(-18,9);C.lineTo(-1,2.5);C.closePath();C.fill();
  C.strokeStyle='#44ff88';C.lineWidth=0.8;C.beginPath();C.moveTo(6,-4);C.lineTo(-8,-14);C.stroke();C.beginPath();C.moveTo(6,4);C.lineTo(-8,14);C.stroke();
  C.fillStyle='#0c1c0c';C.beginPath();C.moveTo(24,0);C.lineTo(-2,-8);C.lineTo(-20,-5);C.lineTo(-20,5);C.lineTo(-2,8);C.closePath();C.fill();C.fillStyle='#1a3a1a';C.beginPath();C.moveTo(22,0);C.lineTo(-1,-6.5);C.lineTo(-18,-4);C.lineTo(-18,4);C.lineTo(-1,6.5);C.closePath();C.fill();C.fillStyle='#226622';C.beginPath();C.moveTo(20,0);C.lineTo(3,-4);C.lineTo(-10,-2.5);C.lineTo(-10,2.5);C.lineTo(3,4);C.closePath();C.fill();C.fillStyle='#44aa44';C.beginPath();C.moveTo(16,0);C.lineTo(6,-2);C.lineTo(-5,-1.2);C.lineTo(-5,1.2);C.lineTo(6,2);C.closePath();C.fill();
  C.fillStyle='#051005';C.beginPath();C.ellipse(-18,0,3.5,4.5,0,0,Math.PI*2);C.fill();
  C.globalAlpha=0.12+0.06*Math.sin(t*0.008);C.fillStyle='#44ff88';C.beginPath();C.moveTo(-10,0);C.lineTo(-28,-4);C.lineTo(-28,4);C.closePath();C.fill();C.globalAlpha=1;
  C.fillStyle='#030d03';C.beginPath();C.ellipse(7,0,7,5,0,0,Math.PI*2);C.fill();C.fillStyle='#0a3010';C.beginPath();C.ellipse(6.5,-.2,5.5,3.8,0,0,Math.PI*2);C.fill();C.fillStyle='#1a7a2a';C.beginPath();C.ellipse(5.5,-.8,4.2,2.8,0,0,Math.PI*2);C.fill();C.fillStyle='#55cc66';C.beginPath();C.ellipse(3.5,-1.5,2.5,1.5,-.2,0,Math.PI*2);C.fill();C.fillStyle='#aaffaa';C.beginPath();C.arc(2.5,-2,.8,0,Math.PI*2);C.fill();
}
function _drawArtillery(fl,t) {
  for (const sy of [-9,9]){C.fillStyle=`rgba(255,140,20,${0.08*fl})`;C.beginPath();C.ellipse(-20,sy,16*fl,5,0,0,Math.PI*2);C.fill();C.fillStyle=`rgba(255,180,50,${0.5*fl})`;C.beginPath();C.ellipse(-15,sy,8*fl,3,0,0,Math.PI*2);C.fill();C.fillStyle='rgba(255,240,160,.9)';C.beginPath();C.arc(-11,sy,2,0,Math.PI*2);C.fill();}
  C.fillStyle='#1a0800';C.beginPath();C.moveTo(5,-8);C.lineTo(-16,-24);C.lineTo(-22,-14);C.lineTo(-3,-5);C.closePath();C.fill();C.beginPath();C.moveTo(5,8);C.lineTo(-16,24);C.lineTo(-22,14);C.lineTo(-3,5);C.closePath();C.fill();
  C.fillStyle='#3a1800';C.beginPath();C.moveTo(5,-7);C.lineTo(-13,-20);C.lineTo(-18,-12);C.lineTo(-1,-4);C.closePath();C.fill();C.beginPath();C.moveTo(5,7);C.lineTo(-13,20);C.lineTo(-18,12);C.lineTo(-1,4);C.closePath();C.fill();
  C.strokeStyle='#ffaa33';C.lineWidth=1;C.beginPath();C.moveTo(3,-7);C.lineTo(-9,-18);C.stroke();C.beginPath();C.moveTo(3,7);C.lineTo(-9,18);C.stroke();
  C.fillStyle='#1a0800';C.beginPath();C.moveTo(20,0);C.lineTo(-2,-13);C.lineTo(-18,-9);C.lineTo(-18,9);C.lineTo(-2,13);C.closePath();C.fill();C.fillStyle='#5a2800';C.beginPath();C.moveTo(18,0);C.lineTo(-1,-11);C.lineTo(-16,-7);C.lineTo(-16,7);C.lineTo(-1,11);C.closePath();C.fill();C.fillStyle='#883a00';C.beginPath();C.moveTo(16,0);C.lineTo(2,-6);C.lineTo(-9,-4);C.lineTo(-9,4);C.lineTo(2,6);C.closePath();C.fill();C.fillStyle='#cc6600';C.beginPath();C.moveTo(12,0);C.lineTo(4,-3);C.lineTo(-5,-2);C.lineTo(-5,2);C.lineTo(4,3);C.closePath();C.fill();
  [-6,0,6].forEach(by=>{C.fillStyle='#2a1000';C.fillRect(8,by-1.5,20,3);C.fillStyle='#994400';C.fillRect(9,by-1.2,18,2.4);C.fillStyle='#ffaa33';C.fillRect(22,by-0.8,8,1.6);C.fillStyle='#ffe080';C.fillRect(28,by-0.4,3,0.8);});
  C.fillStyle='#140800';C.beginPath();C.ellipse(-16,-9,3,4.5,0,0,Math.PI*2);C.fill();C.beginPath();C.ellipse(-16,9,3,4.5,0,0,Math.PI*2);C.fill();
  C.fillStyle='#080300';C.beginPath();C.ellipse(4,0,8,6.5,0,0,Math.PI*2);C.fill();C.fillStyle='#3a1800';C.beginPath();C.ellipse(3.5,-.3,6.5,5,0,0,Math.PI*2);C.fill();C.fillStyle='#885500';C.beginPath();C.ellipse(2.5,-1,5,3.8,0,0,Math.PI*2);C.fill();C.fillStyle='#ffcc44';C.beginPath();C.ellipse(1,-1.8,2.8,1.8,-.25,0,Math.PI*2);C.fill();C.fillStyle='#ffe8a0';C.beginPath();C.arc(.5,-2.5,.85,0,Math.PI*2);C.fill();
}
function _drawPhantom(fl,t) {
  C.fillStyle=`rgba(180,50,255,${0.08*fl})`;C.beginPath();C.ellipse(-24,0,20*fl,6,0,0,Math.PI*2);C.fill();C.fillStyle=`rgba(200,100,255,${0.45*fl})`;C.beginPath();C.ellipse(-18,0,10*fl,3.5,0,0,Math.PI*2);C.fill();C.fillStyle='rgba(230,180,255,.85)';C.beginPath();C.arc(-13,0,2.5,0,Math.PI*2);C.fill();
  C.fillStyle='#100018';C.beginPath();C.moveTo(5,-8);C.lineTo(-18,-22);C.lineTo(-22,-14);C.lineTo(-2,-5);C.closePath();C.fill();C.beginPath();C.moveTo(5,8);C.lineTo(-18,22);C.lineTo(-22,14);C.lineTo(-2,5);C.closePath();C.fill();
  C.fillStyle='#22003a';C.beginPath();C.moveTo(5,-7);C.lineTo(-15,-18);C.lineTo(-18,-12);C.lineTo(-1,-4);C.closePath();C.fill();C.beginPath();C.moveTo(5,7);C.lineTo(-15,18);C.lineTo(-18,12);C.lineTo(-1,4);C.closePath();C.fill();
  C.globalAlpha=0.25+0.15*Math.sin(t*0.004);C.fillStyle='#9922ff';C.beginPath();C.moveTo(0,-6);C.lineTo(-10,-14);C.lineTo(-12,-10);C.lineTo(-2,-3);C.closePath();C.fill();C.beginPath();C.moveTo(0,6);C.lineTo(-10,14);C.lineTo(-12,10);C.lineTo(-2,3);C.closePath();C.fill();C.globalAlpha=1;
  C.strokeStyle='#cc44ff';C.lineWidth=0.8;C.beginPath();C.moveTo(3,-7);C.lineTo(-10,-16);C.stroke();C.beginPath();C.moveTo(3,7);C.lineTo(-10,16);C.stroke();
  C.fillStyle='#0c0015';C.beginPath();C.moveTo(22,0);C.lineTo(-2,-12);C.lineTo(-18,-7.5);C.lineTo(-18,7.5);C.lineTo(-2,12);C.closePath();C.fill();C.fillStyle='#280050';C.beginPath();C.moveTo(20,0);C.lineTo(-1,-10);C.lineTo(-16,-6);C.lineTo(-16,6);C.lineTo(-1,10);C.closePath();C.fill();C.fillStyle='#5500aa';C.beginPath();C.moveTo(18,0);C.lineTo(2,-5.5);C.lineTo(-9,-3.5);C.lineTo(-9,3.5);C.lineTo(2,5.5);C.closePath();C.fill();C.fillStyle='#9922ee';C.beginPath();C.moveTo(13,0);C.lineTo(5,-2.5);C.lineTo(-4,-1.5);C.lineTo(-4,1.5);C.lineTo(5,2.5);C.closePath();C.fill();
  C.globalAlpha=0.1+0.07*Math.sin(t*0.006);C.strokeStyle='#cc44ff';C.lineWidth=2;C.beginPath();C.arc(0,0,24,0,Math.PI*2);C.stroke();C.globalAlpha=1;
  C.fillStyle='#07001a';C.beginPath();C.ellipse(-16,0,3.5,5.5,0,0,Math.PI*2);C.fill();C.fillStyle='#14003a';C.beginPath();C.ellipse(-15,0,2.5,4,0,0,Math.PI*2);C.fill();
  C.fillStyle='#040010';C.beginPath();C.ellipse(6,0,8,6,0,0,Math.PI*2);C.fill();C.fillStyle='#1a0040';C.beginPath();C.ellipse(5.5,-.3,6.5,4.8,0,0,Math.PI*2);C.fill();C.fillStyle='#6600cc';C.beginPath();C.ellipse(4.5,-1,5,3.5,0,0,Math.PI*2);C.fill();C.fillStyle='#cc55ff';C.beginPath();C.ellipse(3,-2,2.8,1.8,-.25,0,Math.PI*2);C.fill();C.fillStyle='#eeaaffe0';C.beginPath();C.arc(2.2,-2.8,.8,0,Math.PI*2);C.fill();
}
function _drawSentinel(fl,t) {
  C.fillStyle=`rgba(0,255,190,${0.08*fl})`;C.beginPath();C.ellipse(-24,0,19*fl,6.5,0,0,Math.PI*2);C.fill();C.fillStyle=`rgba(50,255,200,${0.45*fl})`;C.beginPath();C.ellipse(-18,0,9.5*fl,4,0,0,Math.PI*2);C.fill();C.fillStyle='rgba(180,255,240,.88)';C.beginPath();C.arc(-13,0,2.8,0,Math.PI*2);C.fill();
  C.fillStyle='#001818';C.beginPath();C.moveTo(5,-9);C.lineTo(-17,-23);C.lineTo(-22,-15);C.lineTo(-3,-6);C.closePath();C.fill();C.beginPath();C.moveTo(5,9);C.lineTo(-17,23);C.lineTo(-22,15);C.lineTo(-3,6);C.closePath();C.fill();
  C.fillStyle='#003030';C.beginPath();C.moveTo(5,-8);C.lineTo(-14,-19);C.lineTo(-18,-13);C.lineTo(-1,-5);C.closePath();C.fill();C.beginPath();C.moveTo(5,8);C.lineTo(-14,19);C.lineTo(-18,13);C.lineTo(-1,5);C.closePath();C.fill();
  C.strokeStyle='#00ffcc';C.lineWidth=0.9;C.beginPath();C.moveTo(3,-8);C.lineTo(-10,-17);C.stroke();C.beginPath();C.moveTo(3,8);C.lineTo(-10,17);C.stroke();
  for (let i=0;i<2;i++){C.globalAlpha=(0.12+0.06*Math.sin(t*0.005+i*1.5))*(i===0?1:0.6);C.strokeStyle='#00ffcc';C.lineWidth=1.5-i*0.5;C.beginPath();C.arc(0,0,20+i*8,0,Math.PI*2);C.stroke();}C.globalAlpha=1;
  C.fillStyle='#001010';C.beginPath();C.moveTo(21,0);C.lineTo(-3,-12);C.lineTo(-18,-8);C.lineTo(-18,8);C.lineTo(-3,12);C.closePath();C.fill();C.fillStyle='#005544';C.beginPath();C.moveTo(19,0);C.lineTo(-2,-10);C.lineTo(-16,-6.5);C.lineTo(-16,6.5);C.lineTo(-2,10);C.closePath();C.fill();C.fillStyle='#00aa88';C.beginPath();C.moveTo(17,0);C.lineTo(2,-5.5);C.lineTo(-9,-3.5);C.lineTo(-9,3.5);C.lineTo(2,5.5);C.closePath();C.fill();C.fillStyle='#00ddaa';C.beginPath();C.moveTo(13,0);C.lineTo(5,-2.5);C.lineTo(-4,-1.5);C.lineTo(-4,1.5);C.lineTo(5,2.5);C.closePath();C.fill();
  C.fillStyle='#001008';C.beginPath();C.ellipse(-16,0,3.8,5.5,0,0,Math.PI*2);C.fill();C.fillStyle='#003020';C.beginPath();C.ellipse(-15,0,2.8,4,0,0,Math.PI*2);C.fill();
  C.fillStyle='#000c0a';C.beginPath();C.ellipse(6,0,8,6,0,0,Math.PI*2);C.fill();C.fillStyle='#006655';C.beginPath();C.ellipse(5.5,-.3,6.5,4.8,0,0,Math.PI*2);C.fill();C.fillStyle='#00aa99';C.beginPath();C.ellipse(4.5,-1,5,3.5,0,0,Math.PI*2);C.fill();C.fillStyle='#44ffdd';C.beginPath();C.ellipse(3,-2,2.8,1.8,-.25,0,Math.PI*2);C.fill();C.fillStyle='#aafff0e0';C.beginPath();C.arc(2.2,-2.8,.8,0,Math.PI*2);C.fill();
}

function drawShip(x,y,ang,u,t,isPreview) {
  drawShipSprite(G.shipId||'vanguard',x,y,ang,t,u,!isPreview&&G.ph==='play');
}

// ─── Враги ─────────────────────────────────────────────
function drawEn(e,t,sx,sy) {
  C.save();C.translate(sx,sy);
  if (e.tp==='seek') {
    C.rotate(t*0.005+e.ph);
    C.fillStyle='rgba(220,40,40,.1)';C.beginPath();C.arc(0,0,17,0,Math.PI*2);C.fill();
    for (let i=0;i<3;i++){C.save();C.rotate(i*Math.PI*2/3);C.fillStyle='#881010';C.beginPath();C.moveTo(0,-5);C.lineTo(4.5,-17);C.lineTo(0,-15);C.lineTo(-4.5,-17);C.closePath();C.fill();C.fillStyle='#cc2222';C.beginPath();C.moveTo(0,-5);C.lineTo(3,-14);C.lineTo(0,-12.5);C.lineTo(-3,-14);C.closePath();C.fill();C.fillStyle='#ee4444';C.beginPath();C.moveTo(0,-5);C.lineTo(1.5,-10);C.lineTo(0,-9.5);C.lineTo(-1.5,-10);C.closePath();C.fill();C.restore();}
    C.fillStyle='#cc2020';C.beginPath();C.arc(0,0,8,0,Math.PI*2);C.fill();C.fillStyle='#ee4040';C.beginPath();C.arc(-.8,-.8,5.2,0,Math.PI*2);C.fill();C.fillStyle='#111';C.beginPath();C.arc(0,0,3.5,0,Math.PI*2);C.fill();C.fillStyle='#ff5566';C.beginPath();C.arc(-.5,-.5,2.2,0,Math.PI*2);C.fill();C.fillStyle='#ffaaaa';C.beginPath();C.arc(-1,-1,1,0,Math.PI*2);C.fill();
  } else if (e.tp==='heavy') {
    C.save();C.rotate(t*0.0009+e.ph);C.fillStyle='rgba(175,65,0,.1)';C.beginPath();C.arc(0,0,25,0,Math.PI*2);C.fill();
    [[20,'#6a2800'],[15,'#aa4300'],[10.5,'#cc5500'],[6.5,'#ee8833']].forEach(([r,f])=>{C.fillStyle=f;C.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3-Math.PI/6;i?C.lineTo(Math.cos(a)*r,Math.sin(a)*r):C.moveTo(Math.cos(a)*r,Math.sin(a)*r);}C.closePath();C.fill();});
    C.restore();C.fillStyle='#ffcc44';C.beginPath();C.moveTo(0,-6);C.lineTo(5.5,0);C.lineTo(0,6);C.lineTo(-5.5,0);C.closePath();C.fill();C.fillStyle='#111';C.beginPath();C.arc(0,0,2.8,0,Math.PI*2);C.fill();C.fillStyle='#ffaa00';C.beginPath();C.arc(-.5,-.5,1.7,0,Math.PI*2);C.fill();C.fillStyle='#fff8cc';C.beginPath();C.arc(-1,-1,.7,0,Math.PI*2);C.fill();
  } else {
    const fa=a2({x:0,y:0},{x:G.s.x-e.x,y:G.s.y-e.y});
    C.save();C.rotate(fa);C.fillStyle='rgba(115,20,195,.12)';C.beginPath();C.ellipse(-14,0,13,5.5,0,0,Math.PI*2);C.fill();C.fillStyle='#3e0c78';C.beginPath();C.moveTo(16,0);C.lineTo(-3,-6);C.lineTo(-15,-3);C.lineTo(-15,3);C.lineTo(-3,6);C.closePath();C.fill();C.fillStyle='#7722bb';C.beginPath();C.moveTo(14,0);C.lineTo(0,-4.5);C.lineTo(-12,-2.5);C.lineTo(-12,2.5);C.lineTo(0,4.5);C.closePath();C.fill();C.fillStyle='#5511aa';C.beginPath();C.moveTo(3,-4);C.lineTo(-9,-12);C.lineTo(-13,-7.5);C.lineTo(-3,-2);C.closePath();C.fill();C.beginPath();C.moveTo(3,4);C.lineTo(-9,12);C.lineTo(-13,7.5);C.lineTo(-3,2);C.closePath();C.fill();C.fillStyle='#9944dd';C.beginPath();C.moveTo(3,-3);C.lineTo(-7,-9.5);C.lineTo(-10,-6);C.lineTo(-2,-1.5);C.closePath();C.fill();C.beginPath();C.moveTo(3,3);C.lineTo(-7,9.5);C.lineTo(-10,6);C.lineTo(-2,1.5);C.closePath();C.fill();C.fillStyle='#bb55ff';C.beginPath();C.arc(4,0,4.8,0,Math.PI*2);C.fill();C.fillStyle='#dd88ff';C.beginPath();C.arc(3,-1,3,0,Math.PI*2);C.fill();C.fillStyle='#f5ccff';C.beginPath();C.arc(2.5,-1.8,1.4,0,Math.PI*2);C.fill();C.restore();
  }
  if (e.hp<e.mhp){const bw=e.r*2.5,bx=-bw/2,by=-e.r-11;C.fillStyle='#1a0800';C.fillRect(bx,by,bw,3.5);C.fillStyle=e.hp/e.mhp>0.5?'#44dd44':e.hp/e.mhp>0.25?'#ddaa00':'#dd2222';C.fillRect(bx,by,bw*(e.hp/e.mhp),3.5);}
  C.restore();
}

function drawBoss(t) {
  const b=G.boss; if(!b) return;
  const sx=wx(b.x), sy=wy(b.y);
  C.save();C.translate(sx,sy);
  // Вращающийся шестиугольник
  C.rotate(t*0.002+b.ph);
  // Внешнее свечение
  C.fillStyle='rgba(255,40,40,0.08)';C.beginPath();C.arc(0,0,b.r+12,0,Math.PI*2);C.fill();
  // Основной корпус
  for (const [r,col] of [[b.r,'#661111'],[b.r*0.82,'#aa2222'],[b.r*0.6,'#dd3333']]) {
    C.fillStyle=col;C.beginPath();
    for (let i=0;i<6;i++){const a=i*Math.PI/3;i?C.lineTo(Math.cos(a)*r,Math.sin(a)*r):C.moveTo(Math.cos(a)*r,Math.sin(a)*r);}
    C.closePath();C.fill();
  }
  // Ядро
  C.fillStyle='#ff6666';C.beginPath();C.arc(0,0,b.r*0.3,0,Math.PI*2);C.fill();
  C.fillStyle='#ffaaaa';C.beginPath();C.arc(-2,-2,b.r*0.15,0,Math.PI*2);C.fill();
  C.restore();
}

// ─── Игровые объекты ───────────────────────────────────
function drawOrbs() {
  G.orbs.forEach(o=>{const sx2=wx(o.x),sy2=wy(o.y);C.fillStyle='rgba(55,155,255,.14)';C.beginPath();C.arc(sx2,sy2,o.r+6,0,Math.PI*2);C.fill();C.fillStyle='#0e4285';C.beginPath();C.arc(sx2,sy2,o.r,0,Math.PI*2);C.fill();C.fillStyle='#2266cc';C.beginPath();C.arc(sx2,sy2,o.r*.75,0,Math.PI*2);C.fill();C.fillStyle='#44aaff';C.beginPath();C.arc(sx2,sy2,o.r*.48,0,Math.PI*2);C.fill();C.fillStyle='#99ddff';C.beginPath();C.arc(sx2-o.r*.2,sy2-o.r*.25,o.r*.3,0,Math.PI*2);C.fill();});
}
function drawGems(t) {
  G.gems.forEach(g=>{if(!isVis(g.x,g.y))return;C.save();C.translate(wx(g.x),wy(g.y));C.rotate(t*0.002+g.ph);C.globalAlpha=Math.min(1,g.life*5);const s=g.r;C.fillStyle='rgba(40,200,110,.18)';C.beginPath();C.arc(0,0,s+3,0,Math.PI*2);C.fill();C.fillStyle=g.val>20?'#44ffaa':g.val>10?'#22ee66':'#11cc44';C.beginPath();C.moveTo(0,-s);C.lineTo(s*.68,0);C.lineTo(0,s);C.lineTo(-s*.68,0);C.closePath();C.fill();C.fillStyle=g.val>20?'#99ffdd':g.val>10?'#77ffaa':'#55ff88';C.beginPath();C.moveTo(0,-s*.55);C.lineTo(s*.4,0);C.lineTo(0,s*.55);C.lineTo(-s*.4,0);C.closePath();C.fill();C.fillStyle='rgba(255,255,255,.55)';C.beginPath();C.ellipse(-s*.1,-s*.22,s*.22,s*.13,-.3,0,Math.PI*2);C.fill();C.globalAlpha=1;C.restore();});
}
function drawDebris() {
  if (!G.debris||G.debris.length===0) return;
  G.debris.forEach(d=>{
    if (!isVis(d.x,d.y,20)) return;
    C.save();C.translate(wx(d.x),wy(d.y));C.rotate(d.rot);
    C.globalAlpha=d.life;C.fillStyle=d.col;
    C.fillRect(-d.sz/2,-d.sz/2,d.sz,d.sz*0.6);
    C.restore();
  });
  C.globalAlpha=1;
}

function drawTrails() {
  const cols={pulse:'#55aaff',scatter:'#ffaa33'};
  G.buls.forEach(b=>{
    if (!b.trail||b.trail.length<2) return;
    const col=cols[b.tp]||'#ffffff';
    for (let i=1;i<b.trail.length;i++) {
      const p0=b.trail[i-1], p1=b.trail[i];
      if (!isVis(p1.x,p1.y,20)) continue;
      C.globalAlpha=(i/b.trail.length)*0.35;
      C.strokeStyle=col;C.lineWidth=1+i/b.trail.length*2;
      C.beginPath();C.moveTo(wx(p0.x),wy(p0.y));C.lineTo(wx(p1.x),wy(p1.y));C.stroke();
    }
  });
  C.globalAlpha=1;
}

function drawBuls() {
  G.buls.forEach(b=>{if(!isVis(b.x,b.y,20))return;C.save();C.translate(wx(b.x),wy(b.y));C.rotate(Math.atan2(b.vy,b.vx));C.globalAlpha=Math.min(1,b.life*3);if(b.tp==='pulse'){C.fillStyle='rgba(75,155,255,.22)';C.beginPath();C.ellipse(0,0,14,6.5,0,0,Math.PI*2);C.fill();C.fillStyle='#1855aa';C.beginPath();C.ellipse(0,0,11,3.8,0,0,Math.PI*2);C.fill();C.fillStyle='#55aaff';C.beginPath();C.ellipse(2,0,7,2.5,0,0,Math.PI*2);C.fill();C.fillStyle='#aadfff';C.beginPath();C.ellipse(4.5,-.5,3.5,1.3,0,0,Math.PI*2);C.fill();C.fillStyle='#fff';C.beginPath();C.arc(5.5,0,1.2,0,Math.PI*2);C.fill();}else{C.fillStyle='rgba(250,155,25,.2)';C.beginPath();C.ellipse(0,0,9,4.5,0,0,Math.PI*2);C.fill();C.fillStyle='#bb5500';C.beginPath();C.ellipse(0,0,7,3,0,0,Math.PI*2);C.fill();C.fillStyle='#ffaa33';C.beginPath();C.ellipse(1.5,0,4.5,2,0,0,Math.PI*2);C.fill();C.fillStyle='#ffdd88';C.beginPath();C.arc(2.5,0,1.1,0,Math.PI*2);C.fill();}C.globalAlpha=1;C.restore();});
}
function drawEBuls() {
  G.eBuls.forEach(b=>{
    if(!isVis(b.x,b.y,20))return;
    const sx=wx(b.x),sy=wy(b.y);
    C.globalAlpha=Math.min(1,b.life*3);
    // Glow
    C.fillStyle=b.col+'22';C.beginPath();C.arc(sx,sy,b.r+4,0,Math.PI*2);C.fill();
    // Core
    C.fillStyle=b.col;C.beginPath();C.arc(sx,sy,b.r,0,Math.PI*2);C.fill();
    // Bright center
    C.fillStyle='#ffffff88';C.beginPath();C.arc(sx,sy,b.r*0.4,0,Math.PI*2);C.fill();
    C.globalAlpha=1;
  });
}
function drawChain() {
  if(!G.chainFl||G.chainFl.life<=0)return;
  C.globalAlpha=G.chainFl.life;
  const segs=G.chainFl.segs;
  for(let i=1;i<segs.length;i++){const ax=wx(segs[i-1].x),ay=wy(segs[i-1].y),bx2=wx(segs[i].x),by2=wy(segs[i].y),mx=(ax+bx2)/2+(rn(2)-1)*28,my=(ay+by2)/2+(rn(2)-1)*28;C.strokeStyle='#88bbff';C.lineWidth=2.2;C.beginPath();C.moveTo(ax,ay);C.quadraticCurveTo(mx,my,bx2,by2);C.stroke();C.strokeStyle='#cce4ff';C.lineWidth=0.9;C.beginPath();C.moveTo(ax,ay);C.quadraticCurveTo(mx-5,my-5,bx2,by2);C.stroke();}
  C.globalAlpha=1;
}
function drawParts() {
  G.parts.forEach(p=>{if(!isVis(p.x,p.y,20))return;C.globalAlpha=Math.max(0,p.life);if(p.tp==='ring'){C.strokeStyle=p.col;C.lineWidth=2;C.beginPath();C.arc(wx(p.x),wy(p.y),p.r,0,Math.PI*2);C.stroke();}else{const sx2=wx(p.x),sy2=wy(p.y);C.fillStyle=p.col;C.fillRect(sx2-p.sz/2,sy2-p.sz/2,p.sz,p.sz);}});
  C.globalAlpha=1;
}
function drawDmgNums(dt) {
  for (let i=G.dmgNums.length-1;i>=0;i--) {
    const n=G.dmgNums[i];
    n.y-=n.vy; n.life-=dt/800;
    if (n.life<=0) { G.dmgNums.splice(i,1); continue; }
    if (!isVis(n.x,n.y,20)) continue;
    C.globalAlpha=n.life;
    C.font=`bold ${Math.round(10+n.val/10)}px system-ui,sans-serif`;
    C.fillStyle='#fff';C.textAlign='center';C.textBaseline='middle';
    C.fillText(n.val,wx(n.x),wy(n.y));
  }
  C.globalAlpha=1;
}

function drawFullscreenBtn() {
  // Слева от мини-карты (mw=192, mx=W-mw-10)
  const mmx=W-192-10; // левый край мини-карты
  const bx=mmx-30, by=H-30, bs=22;
  const hv=mX>=bx&&mX<=bx+bs&&mY>=by&&mY<=by+bs;
  C.globalAlpha=hv?0.6:0.25;
  C.strokeStyle='#fff';C.lineWidth=1.5;
  const m=3, s2=bs-m*2, cx=bx+m, cy=by+m, cl=6;
  C.beginPath();
  C.moveTo(cx,cy+cl);C.lineTo(cx,cy);C.lineTo(cx+cl,cy);
  C.moveTo(cx+s2-cl,cy);C.lineTo(cx+s2,cy);C.lineTo(cx+s2,cy+cl);
  C.moveTo(cx+s2,cy+s2-cl);C.lineTo(cx+s2,cy+s2);C.lineTo(cx+s2-cl,cy+s2);
  C.moveTo(cx+cl,cy+s2);C.lineTo(cx,cy+s2);C.lineTo(cx,cy+s2-cl);
  C.stroke();
  C.globalAlpha=1;
  bR.push({x:bx,y:by,w:bs,h:bs,act:'fullscreen'});
}

function drawHPBar() {
  const s=G.s,bw=200,bh=6,bx=W/2-100,by=H-18;
  C.fillStyle='rgba(10,20,40,.7)';C.fillRect(bx-2,by-2,bw+4,bh+4);
  C.fillStyle='#0a1520';C.fillRect(bx,by,bw,bh);
  const pct=s.hp/s.mhp;
  C.fillStyle=pct>0.5?'#33dd55':pct>0.25?'#ddaa00':'#dd2222';
  C.fillRect(bx,by,bw*pct,bh);
  C.font='10px system-ui,sans-serif';C.fillStyle='#ffffff55';C.textAlign='center';
  C.fillText(Math.ceil(s.hp)+'/'+s.mhp,W/2,by-4);
  if (G.s.inNebula){C.textAlign='left';C.fillStyle='#88aaff88';C.fillText('⋯ nebula slow',bx,by-4);}
}

// ═══════════════════════════════════════════════════════
//  ЭКРАНЫ
// ═══════════════════════════════════════════════════════

// ─── Back button helper ────────────────────────────────
function drawBackBtn(t) {
  const bx=14,by=14,bw=80,bh=28;
  const hv=mX>=bx&&mX<=bx+bw&&mY>=by&&mY<=by+bh;
  rRect(bx,by,bw,bh,6);
  C.fillStyle=hv?'#0d1a2a':'#06101a';C.fill();
  C.strokeStyle='#1a3040';C.lineWidth=1;C.stroke();
  C.font='11px system-ui,sans-serif';C.fillStyle=hv?'#88ccff':'#446688';
  C.textAlign='center';C.textBaseline='middle';
  C.fillText('← BACK',bx+bw/2,by+bh/2);
  return {x:bx,y:by,w:bw,h:bh,act:'back'};
}

function drawMenu(t) {
  drawBGStatic(t);
  const cy=H/2; // центр по вертикали
  const selShip=SHIPS.find(s=>s.id===META.selected)||SHIPS[0];
  drawShipSprite(META.selected,W/2,cy-80,-Math.PI/2,t,{orbit:META.selected==='sentinel'?1:0},false);
  C.textAlign='center';C.textBaseline='middle';
  C.font='500 40px system-ui,sans-serif';C.fillStyle='#ffffff';C.fillText('VOID SURVIVOR',W/2,cy-155);
  C.font='11px system-ui,sans-serif';C.fillStyle='#ffffff40';
  C.fillText('move cursor to fly  ·  auto-shoot  ·  SPACE to scan  ·  F fullscreen',W/2,cy-128);
  C.font='500 13px system-ui,sans-serif';C.fillStyle=selShip.accent;C.fillText(selShip.name.toUpperCase(),W/2,cy-20);
  C.font='11px system-ui,sans-serif';C.fillStyle='#ffffff30';C.fillText(selShip.passiveDesc,W/2,cy-4);
  const demos=[{tp:'seek',x:W/2-108,y:cy+60,r:12,mhp:42,hp:42,ph:0},{tp:'heavy',x:W/2,y:cy+62,r:19,mhp:155,hp:155,ph:0},{tp:'fast',x:W/2+108,y:cy+56,r:8,mhp:24,hp:24,ph:0}];
  demos.forEach(e=>drawEn(e,t,e.x,e.y));
  C.font='10px system-ui,sans-serif';C.fillStyle='#ffffff1e';
  ['seeker','heavy','speeder'].forEach((l,i)=>C.fillText(l,W/2+[-108,0,108][i],cy+90));
  C.textAlign='left';C.font='500 14px system-ui,sans-serif';C.fillStyle='#ffdd44';
  C.fillText('⬡ '+META.credits.toLocaleString(),18,22);
  C.fillStyle='#44ffaa';C.fillText('◆ '+META.ore,18,42);
  const pw=185,ph2=52,px=W/2-pw/2,py=cy+110;
  const phv=mX>=px&&mX<=px+pw&&mY>=py&&mY<=py+ph2;
  rRect(px,py,pw,ph2,9);C.fillStyle=phv?'#2277cc':'#1155aa';C.fill();
  C.font='500 17px system-ui,sans-serif';C.fillStyle='#fff';C.textAlign='center';C.fillText('PLAY',W/2,py+ph2/2);
  const hw=185,hh=40,hx=W/2-hw/2,hy=py+ph2+12;
  const hhv=mX>=hx&&mX<=hx+hw&&mY>=hy&&mY<=hy+hh;
  rRect(hx,hy,hw,hh,9);C.fillStyle=hhv?'#1a2a3a':'#0d1824';C.fill();C.strokeStyle='#1e3a5a';C.lineWidth=1;C.stroke();
  C.font='500 14px system-ui,sans-serif';C.fillStyle=hhv?'#88ccff':'#4488aa';C.fillText('HANGAR',W/2,hy+hh/2);
  if (META.hi>0){C.font='12px system-ui,sans-serif';C.fillStyle='#ffdd44';C.fillText('best: '+META.hi.toLocaleString(),W/2,hy+hh+22);}
  const htw=120,hth=28,htx=W/2-htw/2,hty=hy+hh+(META.hi>0?36:16);
  const hthv=mX>=htx&&mX<=htx+htw&&mY>=hty&&mY<=hty+hth;
  C.font='11px system-ui,sans-serif';C.fillStyle=hthv?'#88ccff':'#335566';
  C.fillText('How to play',W/2,hty+hth/2);
  bR=[{x:px,y:py,w:pw,h:ph2,act:'play'},{x:hx,y:hy,w:hw,h:hh,act:'shop'},{x:htx,y:hty,w:htw,h:hth,act:'howtoplay'}];
  // Web3 кнопка
  bR.push(w3DrawConnectBtn());
}

function drawPlay(t) {
  bR=[];
  drawBGPlay(t);
  if (G.flT>0){C.fillStyle=`rgba(195,18,18,${G.flT/980})`;C.fillRect(0,0,W,H);}
  drawWorldBorder();
  drawObstacles(t);
  drawParts();drawGems(t);drawTrails();drawBuls();drawEBuls();drawChain();drawOrbs();drawDmgNums(_dt);
  G.ens.forEach(e=>{if(isVis(e.x,e.y,30))drawEn(e,t,wx(e.x),wy(e.y));});
  if (G.boss && isVis(G.boss.x,G.boss.y,G.boss.r+20)) drawBoss(t);

  drawExtraction(t);

  // Mining beam (под кораблём)
  drawMiningBeam(t);
  if (G.deathAnim<=0) drawShip(wx(G.s.x),wy(G.s.y),G.s.ang,G.s.u,t,false);
  drawDebris();
  drawScanPulse();

  // Курсор
  C.fillStyle='rgba(255,255,255,.38)';C.beginPath();C.arc(mX,mY,2.8,0,Math.PI*2);C.fill();
  drawHPBar();

  // Location banner (при старте рана)
  if (G.banT>0 && G.location){
    C.globalAlpha=Math.min(1,G.banT/380)**2;C.textAlign='center';C.textBaseline='middle';
    C.font='bold 13px system-ui,sans-serif';C.fillStyle=G.location.col;
    C.fillText(G.location.name.toUpperCase(),W/2,34);
    C.font='500 22px system-ui,sans-serif';C.fillStyle='#fff';C.fillText('DEPLOY',W/2,58);
    const mm=Math.floor(G.location.dur/60), ss=G.location.dur%60;
    C.font='11px system-ui,sans-serif';C.fillStyle='#ffffff60';
    C.fillText('time limit: '+mm+':'+(ss<10?'0':'')+ss+' · explore & extract',W/2,78);
    C.globalAlpha=1;
  }

  // Boss HP bar (сверху экрана)
  if (G.boss) {
    const bw2=280,bh2=10,bx2=W/2-bw2/2,by2=10;
    C.fillStyle='rgba(10,20,40,.8)';C.fillRect(bx2-2,by2-2,bw2+4,bh2+4);
    C.fillStyle='#1a0800';C.fillRect(bx2,by2,bw2,bh2);
    const pct2=G.boss.hp/G.boss.mhp;
    C.fillStyle=pct2>0.5?'#dd2222':pct2>0.25?'#ff6600':'#ff0000';
    C.fillRect(bx2,by2,bw2*pct2,bh2);
    C.font='bold 10px system-ui,sans-serif';C.fillStyle='#fff';C.textAlign='center';
    C.fillText('VOID BOSS',W/2,by2+bh2+14);
  }

  const ship=SHIPS.find(s=>s.id===G.shipId)||SHIPS[0];
  C.textAlign='left';C.font='10px system-ui,sans-serif';C.fillStyle=ship.accent+'88';
  C.fillText(ship.passiveDesc,16,20);

  // Ore HUD
  C.fillStyle='#44ffaa';C.font='500 12px system-ui,sans-serif';
  C.fillText('◆ '+G.ore,16,36);

  // Synergy indicator
  if (G.synergy) {
    C.font='bold 10px system-ui,sans-serif';C.fillStyle='#ffdd44';
    C.fillText('⚡ '+G.synergy.name,16,50);
  }

  // Extraction timer HUD
  if (G.extraction.active) {
    const secs=Math.ceil(G.extraction.timer);
    const mm=Math.floor(secs/60), ss=secs%60;
    const timeStr=mm+':'+(ss<10?'0':'')+ss;
    const col=secs>60?'#ffffff':secs>30?'#ff8800':'#ff2222';
    C.textAlign='right';C.font='bold 14px system-ui,sans-serif';C.fillStyle=col;
    C.fillText(timeStr,W-16,50);
    C.font='9px system-ui,sans-serif';C.fillStyle=col+'88';
    C.fillText('EXTRACTION',W-16,62);

    // Стрелка к Extraction Zone
    if (G.extraction.zone) {
      const z=G.extraction.zone;
      const dx=z.x-G.s.x, dy=z.y-G.s.y;
      const dist=Math.hypot(dx,dy);
      if (dist>z.radius) {
        const ang=Math.atan2(dy,dx);
        const arrowR=42;
        const ax=W/2+Math.cos(ang)*arrowR, ay=H/2+Math.sin(ang)*arrowR;
        C.save();C.translate(ax,ay);C.rotate(ang);
        C.fillStyle='rgba(68,255,136,0.7)';
        C.beginPath();C.moveTo(8,0);C.lineTo(-4,-5);C.lineTo(-4,5);C.closePath();C.fill();
        C.restore();
        // Дистанция
        C.textAlign='center';C.font='9px system-ui,sans-serif';C.fillStyle='#44ff8888';
        C.fillText(Math.round(dist)+'m',ax+Math.cos(ang)*14,ay+Math.sin(ang)*14+3);
      }
    }

    // WARNING баннер при < 60 сек
    if (secs<=60 && secs>0) {
      const blink=Math.sin(t/150)>0?1:0.3;
      C.globalAlpha=blink;C.textAlign='center';C.textBaseline='middle';
      C.font='bold 18px system-ui,sans-serif';C.fillStyle='#ff2222';
      C.fillText('⚠ WARNING: EVACUATE NOW ⚠',W/2,H/2-80);
      C.globalAlpha=1;
    }
  }

  drawScanUI();
  drawMinimap();
  drawFullscreenBtn();

  // ESC hint (fade после 3 сек)
  if (G.gameT<3000){C.globalAlpha=(3000-G.gameT)/3000*0.4;C.font='10px system-ui,sans-serif';C.fillStyle='#fff';C.textAlign='center';C.fillText('ESC — pause',W/2,H-26);C.globalAlpha=1;}

  // Tutorial tooltip
  if (G.tutMsg&&G.tutT>0){
    const a=Math.min(1,G.tutT/400);
    C.globalAlpha=a;
    rRect(W/2-140,H-60,280,32,8);C.fillStyle='rgba(4,12,24,0.85)';C.fill();
    C.strokeStyle='#44aaff';C.lineWidth=1;C.stroke();
    C.font='500 13px system-ui,sans-serif';C.fillStyle='#fff';
    C.textAlign='center';C.textBaseline='middle';C.fillText(G.tutMsg,W/2,H-44);
    C.globalAlpha=1;
  }
}

// ─── PAUSE ─────────────────────────────────────────────
function drawPause(t) {
  // Замороженная игра под оверлеем
  drawBGPlay(t);
  drawWorldBorder();
  drawObstacles(t);
  drawParts();drawGems(t);drawTrails();drawBuls();drawEBuls();drawChain();drawOrbs();drawDmgNums(_dt);
  G.ens.forEach(e=>{if(isVis(e.x,e.y,30))drawEn(e,t,wx(e.x),wy(e.y));});
  if (G.boss && isVis(G.boss.x,G.boss.y,G.boss.r+20)) drawBoss(t);
  drawShip(wx(G.s.x),wy(G.s.y),G.s.ang,G.s.u,t,false);
  drawMinimap();

  // Тёмный оверлей
  C.fillStyle='rgba(3,8,16,0.78)';C.fillRect(0,0,W,H);

  C.textAlign='center';C.textBaseline='middle';
  C.font='500 34px system-ui,sans-serif';C.fillStyle='#fff';C.fillText('PAUSED',W/2,H/2-118);
  C.font='11px system-ui,sans-serif';C.fillStyle='#ffffff30';
  C.fillText('level '+G.lvl+' · score '+G.score.toLocaleString(),W/2,H/2-90);

  const buttons=[
    {label:'RESUME',     act:'resume',  col:'#1155aa', hov:'#2277cc', tc:'#fff'},
    {label:'NEW GAME',   act:'newgame', col:'#0d1824', hov:'#1a2a3a', tc:'#88ccff'},
    {label:'HANGAR',     act:'shop',    col:'#0d1824', hov:'#1a2a3a', tc:'#88ccff'},
  ];
  bR=[];
  const bw=200,bh=48;
  buttons.forEach((b,i)=>{
    const bx=W/2-bw/2, by=H/2-52+i*60;
    const hv=mX>=bx&&mX<=bx+bw&&mY>=by&&mY<=by+bh;
    rRect(bx,by,bw,bh,9);C.fillStyle=hv?b.hov:b.col;C.fill();
    C.strokeStyle='#1e3a5a';C.lineWidth=1;C.stroke();
    C.font='500 15px system-ui,sans-serif';C.fillStyle=b.tc;C.fillText(b.label,W/2,by+bh/2);
    bR.push({x:bx,y:by,w:bw,h:bh,act:b.act});
  });

  C.font='10px system-ui,sans-serif';C.fillStyle='#ffffff20';
  C.fillText('ESC to resume',W/2,H/2+136);
}

function drawUpgrade(t) {
  drawBGStatic(t);
  drawShipSprite(G.shipId||'vanguard',W/2,68,-Math.PI/2,t,G.s.u,false);
  C.textAlign='center';C.textBaseline='middle';
  C.font='500 21px system-ui,sans-serif';C.fillStyle='#fff';
  C.fillText('LEVEL UP',W/2,118);
  C.font='11px system-ui,sans-serif';C.fillStyle='#44aaff';
  C.fillText('level '+G.lvl,W/2,138);
  const ch=G.choices,nc=ch.length;
  const cw=168,ch2=218,gap=9,totW=nc*cw+(nc-1)*gap,sx=W/2-totW/2,sy=155;
  bR=[];
  ch.forEach((u,i)=>{
    const lv=G.s.u[u.k],hv=hovI===i,cx2=sx+i*(cw+gap);
    rRect(cx2,sy,cw,ch2,9);C.fillStyle=hv?(u.cat==='W'?'#0c2244':'#0b3020'):(u.cat==='W'?'#06101f':'#05100e');C.fill();
    C.strokeStyle=hv?(u.cat==='W'?'#3366ee':'#22dd66'):(u.cat==='W'?'#12204e':'#112e18');C.lineWidth=hv?2:1;C.stroke();
    rRect(cx2+8,sy+8,u.cat==='W'?64:68,17,4);C.fillStyle=u.cat==='W'?'rgba(38,78,200,.38)':'rgba(18,138,55,.38)';C.fill();
    C.font='9px system-ui,sans-serif';C.fillStyle=u.cat==='W'?'#7799ff':'#44ee88';C.fillText(u.cat==='W'?'WEAPON':'PASSIVE',cx2+8+(u.cat==='W'?32:34),sy+17);
    for(let l=0;l<u.max;l++){C.fillStyle=l<lv+1?'#44aaff':'#18304a';C.beginPath();C.arc(cx2+cw/2+(l-(u.max-1)/2)*11,sy+42,4,0,Math.PI*2);C.fill();}
    C.font='500 13px system-ui,sans-serif';C.fillStyle=hv?'#eef5ff':'#aabccc';C.fillText(u.name,cx2+cw/2,sy+64);
    C.font='11px system-ui,sans-serif';C.fillStyle='#506070';C.fillText(u.desc,cx2+cw/2,sy+82);
    const eff={pulse:[`DMG: ${15+lv*9}→${15+(lv+1)*9}`,`rate +${Math.round((1-(Math.max(155,520-(lv+1)*68)/Math.max(155,520-lv*68)))*100)}%`],orbit:[`orbs: ${lv}→${lv+1}`,'rotating dmg'],chain:[`targets: ${1+lv*2}→${1+(lv+1)*2}`,`DMG: ${22+lv*14}→${22+(lv+1)*14}`],scatter:[`shots: ${3+lv*2}→${3+(lv+1)*2}`,'spread burst'],spd:[`speed +${(lv+1)*22}%`,'move faster'],armor:[`HP: ${G.s.mhp}→${G.s.mhp+25}`,'more hull'],mag:[`range: ${80+lv*32}→${80+(lv+1)*32}px`,'collect XP further'],regen:[`regen: ${['off→slow','slow→fast','fast→rapid'][lv]}`,'passive heal']}[u.k]||[''];
    eff.forEach((ef,ei)=>{if(!ef)return;C.font='11px system-ui,sans-serif';C.fillStyle=hv?'#66ccff':'#33566a';C.fillText(ef,cx2+cw/2,sy+100+ei*17);});
    const bb=sy+ch2-49;rRect(cx2+10,bb,cw-20,41,7);C.fillStyle=hv?(u.cat==='W'?'#1e44a0':'#1a6633'):(u.cat==='W'?'#0c1e38':'#0a1e14');C.fill();
    C.font='500 12px system-ui,sans-serif';C.fillStyle=hv?(u.cat==='W'?'#88aaff':'#66ff88'):(u.cat==='W'?'#33448a':'#224435');C.fillText('SELECT',cx2+cw/2,bb+21);
    bR.push({x:cx2,y:sy,w:cw,h:ch2,act:'upgrade',k:u.k});
  });
  const sk={x:W/2-68,y:sy+ch2+14,w:136,h:35};
  rRect(sk.x,sk.y,sk.w,sk.h,6);C.fillStyle=mX>=sk.x&&mX<=sk.x+sk.w&&mY>=sk.y&&mY<=sk.y+sk.h?'#0d1a2a':'#060f1a';C.fill();
  C.strokeStyle='#0d1a2a';C.lineWidth=1;C.stroke();
  C.font='11px system-ui,sans-serif';C.fillStyle='#2f4455';C.fillText('skip →',W/2,sk.y+sk.h/2);
  bR.push({...sk,act:'skip'});
}

function drawStatBar(x,y,w,val,col){C.fillStyle='#ffffff10';C.fillRect(x,y,w,4);C.fillStyle=col;C.fillRect(x,y,w*val,4);}

function drawShop(t) {
  drawBGStatic(t);
  C.textAlign='center';C.textBaseline='middle';
  C.font='500 24px system-ui,sans-serif';C.fillStyle='#fff';C.fillText('HANGAR',W/2,36);
  C.font='500 15px system-ui,sans-serif';C.fillStyle='#ffdd44';C.fillText('⬡ '+META.credits.toLocaleString(),W/2,62);
  C.fillStyle='#44ffaa';C.font='12px system-ui,sans-serif';C.fillText('◆ '+META.ore+' ore stored',W/2,80);
  bR=[];
  const cols=6,cw2=140,ch3=168,gx=6,gy=6,totalW=cols*cw2+(cols-1)*gx,sx2=(W-totalW)/2,sy=94;
  SHIPS.forEach((ship,i)=>{
    const col2=i%cols,row=Math.floor(i/cols),cx3=sx2+col2*(cw2+gx),cy=sy+row*(ch3+gy);
    const owned=META.owned.includes(ship.id),isSel=shopSel===ship.id,isAct=META.selected===ship.id;
    const hov=mX>=cx3&&mX<=cx3+cw2&&mY>=cy&&mY<=cy+ch3;
    rRect(cx3,cy,cw2,ch3,8);C.fillStyle=isSel?'#0a1e30':hov?'#081522':'#040e18';C.fill();
    C.strokeStyle=isAct?'#44aaff':isSel?'#225588':hov&&owned?'#1a3a55':'#0e1e2a';C.lineWidth=isAct?2:1;C.stroke();
    drawShipSprite(ship.id,cx3+cw2/2,cy+42,-Math.PI/2,t,{orbit:0},false);
    C.textAlign='center';C.font='500 11px system-ui,sans-serif';C.fillStyle=isAct?ship.accent:owned?'#aabbcc':'#445566';C.fillText(ship.name,cx3+cw2/2,cy+82);
    const bx2=cx3+10,bw3=cw2-20;
    [{label:'ATK',val:ship.statAtk,col:'#ff8844'},{label:'SPD',val:ship.statSpd,col:'#44ff88'},{label:'DEF',val:ship.statDef,col:'#44aaff'}].forEach((b,bi)=>{C.font='8px system-ui,sans-serif';C.fillStyle='#ffffff35';C.textAlign='left';C.fillText(b.label,bx2,cy+98+bi*12);drawStatBar(bx2+22,cy+95+bi*12,bw3-22,b.val,b.col);});
    C.textAlign='center';C.font='8px system-ui,sans-serif';C.fillStyle=owned?ship.accent+'88':'#223344';C.fillText(ship.passiveDesc,cx3+cw2/2,cy+138);
    const btnY=cy+ch3-26,btnH=20;rRect(cx3+8,btnY,cw2-16,btnH,5);
    let btnCol,btnTxt;
    if(isAct){btnCol='#0d2a40';btnTxt='ACTIVE';}
    else if(owned){const bHov=mX>=cx3+8&&mX<=cx3+cw2-8&&mY>=btnY&&mY<=btnY+btnH;btnCol=bHov?'#1155aa':'#0a2040';btnTxt='SELECT';}
    else{const canBuy=META.credits>=ship.cost,bHov=mX>=cx3+8&&mX<=cx3+cw2-8&&mY>=btnY&&mY<=btnY+btnH&&canBuy;btnCol=canBuy?(bHov?'#1a5522':'#0d3316'):'#0c1510';btnTxt=canBuy?('⬡ '+ship.cost):'⬡ '+ship.cost;}
    C.fillStyle=btnCol;C.fill();C.font='500 10px system-ui,sans-serif';
    C.fillStyle=isAct?'#44aaff':owned?'#66bbee':META.credits>=ship.cost?'#44ee66':'#2a5533';C.fillText(btnTxt,cx3+cw2/2,btnY+btnH/2);
    bR.push({x:cx3,y:cy,w:cw2,h:ch3,act:owned?'select':'buy',id:ship.id,cost:ship.cost});
  });
  // Back button
  const bb=drawBackBtn(t);bR.push(bb);
  // Web3 Buy Ore панель
  const w3btns=w3DrawShopPanel();
  bR.push(...w3btns);
}

function drawOver(t) {
  drawBGStatic(t);
  C.textAlign='center';C.textBaseline='middle';
  C.font='500 28px system-ui,sans-serif';C.fillStyle='#ee3344';C.fillText('HULL DESTROYED',W/2,H/2-140);
  C.font='500 60px system-ui,sans-serif';C.fillStyle='#fff';C.fillText(G.score.toLocaleString(),W/2,H/2-85);
  C.font='13px system-ui,sans-serif';C.fillStyle='#ffffff44';C.fillText((G.location?G.location.name+' · ':'')+'level '+G.lvl,W/2,H/2-44);
  // Ore summary
  if (G.ore>0){
    C.font='500 13px system-ui,sans-serif';C.fillStyle='#44ffaa';C.fillText('◆ '+G.ore+' ore collected',W/2,H/2-22);
  }
  if (G.earnedCredits>0){
    C.font='500 14px system-ui,sans-serif';C.fillStyle='#ffdd44';C.fillText('+⬡ '+G.earnedCredits+' earned',W/2,H/2+2);
    C.font='11px system-ui,sans-serif';C.fillStyle='#ffdd4466';C.fillText('total: ⬡ '+META.credits.toLocaleString(),W/2,H/2+20);
  }
  if (G.score>0&&G.score>=META.hi){C.font='500 13px system-ui,sans-serif';C.fillStyle='#ffdd44';C.fillText('new best!',W/2,H/2+40);}
  const bw=185,bh=52,bx=W/2-bw/2,by=H/2+60;
  const hv=mX>=bx&&mX<=bx+bw&&mY>=by&&mY<=by+bh;
  rRect(bx,by,bw,bh,9);C.fillStyle=hv?'#2277cc':'#1155aa';C.fill();
  C.font='500 16px system-ui,sans-serif';C.fillStyle='#fff';C.fillText('PLAY AGAIN',W/2,by+bh/2);
  const hx=W/2-88,hy=by+bh+12,hw=176,hh=36;
  const hhv=mX>=hx&&mX<=hx+hw&&mY>=hy&&mY<=hy+hh;
  rRect(hx,hy,hw,hh,8);C.fillStyle=hhv?'#1a2a3a':'#0a1420';C.fill();C.strokeStyle='#1e3a5a';C.lineWidth=1;C.stroke();
  C.font='500 13px system-ui,sans-serif';C.fillStyle=hhv?'#88ccff':'#4488aa';C.fillText('HANGAR',W/2,hy+hh/2);
  bR=[{x:bx,y:by,w:bw,h:bh,act:'play'},{x:hx,y:hy,w:hw,h:hh,act:'shop'}];
}

// ─── SUCCESS ──────────────────────────────────────────
function drawSuccess(t) {
  drawBGStatic(t);
  C.textAlign='center';C.textBaseline='middle';
  C.font='500 28px system-ui,sans-serif';C.fillStyle='#44ff88';C.fillText('EXTRACTION SUCCESSFUL',W/2,H/2-140);
  C.font='500 60px system-ui,sans-serif';C.fillStyle='#fff';C.fillText(G.score.toLocaleString(),W/2,H/2-85);
  C.font='13px system-ui,sans-serif';C.fillStyle='#ffffff44';C.fillText((G.location?G.location.name+' · ':'')+'level '+G.lvl,W/2,H/2-44);
  C.font='500 13px system-ui,sans-serif';C.fillStyle='#44ffaa';C.fillText('◆ '+G.ore+' ore extracted',W/2,H/2-22);
  if (G.earnedCredits>0){
    C.font='500 14px system-ui,sans-serif';C.fillStyle='#ffdd44';C.fillText('+⬡ '+G.earnedCredits+' earned',W/2,H/2+2);
    C.font='11px system-ui,sans-serif';C.fillStyle='#ffdd4466';C.fillText('total: ⬡ '+META.credits.toLocaleString(),W/2,H/2+20);
  }
  const bw=185,bh=52,bx=W/2-bw/2,by=H/2+60;
  const hv=mX>=bx&&mX<=bx+bw&&mY>=by&&mY<=by+bh;
  rRect(bx,by,bw,bh,9);C.fillStyle=hv?'#228844':'#116633';C.fill();
  C.font='500 16px system-ui,sans-serif';C.fillStyle='#fff';C.fillText('PLAY AGAIN',W/2,by+bh/2);
  const hx=W/2-88,hy=by+bh+12,hw=176,hh=36;
  const hhv=mX>=hx&&mX<=hx+hw&&mY>=hy&&mY<=hy+hh;
  rRect(hx,hy,hw,hh,8);C.fillStyle=hhv?'#1a2a3a':'#0a1420';C.fill();C.strokeStyle='#1e3a5a';C.lineWidth=1;C.stroke();
  C.font='500 13px system-ui,sans-serif';C.fillStyle=hhv?'#88ccff':'#4488aa';C.fillText('HANGAR',W/2,hy+hh/2);
  bR=[{x:bx,y:by,w:bw,h:bh,act:'play'},{x:hx,y:hy,w:hw,h:hh,act:'shop'}];
}

// ─── FAILED ───────────────────────────────────────────
function drawFailed(t) {
  drawBGStatic(t);
  C.textAlign='center';C.textBaseline='middle';
  C.font='500 28px system-ui,sans-serif';C.fillStyle='#ff4444';C.fillText('EXTRACTION FAILED',W/2,H/2-140);
  C.font='500 60px system-ui,sans-serif';C.fillStyle='#fff';C.fillText(G.score.toLocaleString(),W/2,H/2-85);
  C.font='13px system-ui,sans-serif';C.fillStyle='#ffffff44';C.fillText((G.location?G.location.name+' · ':'')+'level '+G.lvl,W/2,H/2-44);
  C.font='500 13px system-ui,sans-serif';C.fillStyle='#ff4444';C.fillText('◆ '+G.lostOre+' ore lost',W/2,H/2-22);
  C.font='11px system-ui,sans-serif';C.fillStyle='#ff444466';C.fillText('XP penalty: -50%',W/2,H/2-6);
  if (G.earnedCredits>0){
    C.font='500 14px system-ui,sans-serif';C.fillStyle='#ffdd44';C.fillText('+⬡ '+G.earnedCredits+' earned',W/2,H/2+16);
    C.font='11px system-ui,sans-serif';C.fillStyle='#ffdd4466';C.fillText('total: ⬡ '+META.credits.toLocaleString(),W/2,H/2+34);
  }
  const bw=185,bh=52,bx=W/2-bw/2,by=H/2+60;
  const hv=mX>=bx&&mX<=bx+bw&&mY>=by&&mY<=by+bh;
  rRect(bx,by,bw,bh,9);C.fillStyle=hv?'#882222':'#661111';C.fill();
  C.font='500 16px system-ui,sans-serif';C.fillStyle='#fff';C.fillText('PLAY AGAIN',W/2,by+bh/2);
  const hx=W/2-88,hy=by+bh+12,hw=176,hh=36;
  const hhv=mX>=hx&&mX<=hx+hw&&mY>=hy&&mY<=hy+hh;
  rRect(hx,hy,hw,hh,8);C.fillStyle=hhv?'#1a2a3a':'#0a1420';C.fill();C.strokeStyle='#1e3a5a';C.lineWidth=1;C.stroke();
  C.font='500 13px system-ui,sans-serif';C.fillStyle=hhv?'#88ccff':'#4488aa';C.fillText('HANGAR',W/2,hy+hh/2);
  bR=[{x:bx,y:by,w:bw,h:bh,act:'play'},{x:hx,y:hy,w:hw,h:hh,act:'shop'}];
}

// ── Tutorial screen ──────────────────────────────────
function drawTutorial() {
  drawBGStatic(0);
  C.textAlign='center';C.textBaseline='middle';

  C.font='500 28px system-ui,sans-serif';C.fillStyle='#fff';
  C.fillText('HOW TO SURVIVE',W/2,H/2-120);

  // 3 columns
  const cols=[
    {icon:'\u{1F5B1}',title:'AIM & FLY',desc:'Move cursor','desc2':'to navigate'},
    {icon:'SPACE',title:'SCAN ORE',desc:'Press SPACE','desc2':'to reveal ore'},
    {icon:'\u{1F7E2}',title:'EXTRACT',desc:'Reach the','desc2':'green zone'},
  ];
  const cw=200,cx0=W/2-cw*1.5+cw/2;
  cols.forEach((c,i)=>{
    const x=cx0+i*cw*1.05;
    C.font='32px system-ui,sans-serif';C.fillStyle='#ffffff88';
    C.fillText(c.icon,x,H/2-55);
    C.font='500 14px system-ui,sans-serif';C.fillStyle='#44aaff';
    C.fillText(c.title,x,H/2-18);
    C.font='12px system-ui,sans-serif';C.fillStyle='#ffffff66';
    C.fillText(c.desc,x,H/2+4);
    C.fillText(c.desc2,x,H/2+20);
  });

  // Buttons
  const bw=170,bh=46,gap=20;
  const bx1=W/2-bw-gap/2,bx2=W/2+gap/2,by=H/2+60;
  const hv1=mX>=bx1&&mX<=bx1+bw&&mY>=by&&mY<=by+bh;
  const hv2=mX>=bx2&&mX<=bx2+bw&&mY>=by&&mY<=by+bh;
  rRect(bx1,by,bw,bh,9);C.fillStyle=hv1?'#2277cc':'#1155aa';C.fill();
  C.font='500 15px system-ui,sans-serif';C.fillStyle='#fff';
  C.fillText('PLAY',bx1+bw/2,by+bh/2);
  rRect(bx2,by,bw,bh,9);C.fillStyle=hv2?'#1a2a3a':'#0d1824';C.fill();
  C.strokeStyle='#1e3a5a';C.lineWidth=1;C.stroke();
  C.font='500 15px system-ui,sans-serif';C.fillStyle=hv2?'#88ccff':'#4488aa';
  C.fillText('SKIP',bx2+bw/2,by+bh/2);
  bR=[{x:bx1,y:by,w:bw,h:bh,act:'firstRun'},{x:bx2,y:by,w:bw,h:bh,act:'skipTutorial'}];
}

// ── Error screen ─────────────────────────────────────
function drawError() {
  C.fillStyle='#0a0a12';C.fillRect(0,0,W,H);
  C.textAlign='center';C.textBaseline='middle';
  C.font='500 28px system-ui,sans-serif';C.fillStyle='#ff4444';
  C.fillText('Something went wrong',W/2,H/2-40);
  C.font='13px system-ui,sans-serif';C.fillStyle='#ffffff66';
  C.fillText('The game crashed. Click below to reload.',W/2,H/2-8);
  const bw=180,bh=48,bx=W/2-bw/2,by=H/2+30;
  const hv=mX>=bx&&mX<=bx+bw&&mY>=by&&mY<=by+bh;
  rRect(bx,by,bw,bh,9);C.fillStyle=hv?'#882222':'#661111';C.fill();
  C.font='500 16px system-ui,sans-serif';C.fillStyle='#fff';
  C.fillText('RELOAD',W/2,by+bh/2);
  bR=[{x:bx,y:by,w:bw,h:bh,act:'reload'}];
}

// ═══════════════════════════════════════════════════════
//  GAME LOOP
// ═══════════════════════════════════════════════════════

// app = { G, mX, mY, bR, hovI, shopSel, dt }
export function draw(ts, app) {
  G = app.G; mX = app.mX; mY = app.mY;
  bR = app.bR; hovI = app.hovI; shopSel = app.shopSel; _dt = app.dt;

  C.save();
  if (G.shT>0)C.translate(G.shX,G.shY);
  if      (G.ph==='menu')     drawMenu(ts);
  else if (G.ph==='tutorial') drawTutorial();
  else if (G.ph==='play')    drawPlay(ts);
  else if (G.ph==='pause')   drawPause(ts);
  else if (G.ph==='upgrade') drawUpgrade(ts);
  else if (G.ph==='shop')    drawShop(ts);
  else if (G.ph==='success') drawSuccess(ts);
  else if (G.ph==='failed')  drawFailed(ts);
  else if (G.ph==='error')   drawError();
  else                       drawOver(ts);
  // Toast поверх всего
  w3DrawToast(app.dt);
  C.restore();
  return bR; // возвращаем обновлённые кнопки в main.js
}
