import { ethers } from 'ethers';
import { W, H } from './config.js';
import { META, saveMeta } from './state.js';

// ── Late-binding refs ─────────────────────────────────
let C, _getApp, rRect;

export function initW3(ctx, refs) {
  C = ctx;
  rRect = refs.rRect;
  _getApp = refs.getApp;
}

// ── Config ────────────────────────────────────────────
export const W3_CFG = {
  CONTRACT: '0x565176FAfB4046626C87982cae4a25ACa1dFCFdB',
  ABI: [
    'function buyOre(uint256 amount) payable',
    'function priceFor(uint256 amount) view returns (uint256)',
    'function pricePerOre() view returns (uint256)',
    'function paused() view returns (bool)',
    'event OrePurchased(address indexed buyer,uint256 amount,uint256 ethPaid,uint256 timestamp)',
  ],
  CHAIN_ID:   84532,
  CHAIN_NAME: 'Base Sepolia',
  RPC:        'https://sepolia.base.org',
  EXPLORER:   'https://sepolia.basescan.org',
  CURRENCY:   { name:'Ether', symbol:'ETH', decimals:18 },
  PKGS: [
    { ore:1000,  label:'1 000 ore',  sub:'0.0001 ETH' },
    { ore:5000,  label:'5 000 ore',  sub:'0.0005 ETH' },
    { ore:15000, label:'15 000 ore', sub:'0.0015 ETH' },
  ],
};

// ── State ─────────────────────────────────────────────
export const W3 = { provider:null, signer:null, contract:null, address:null, connected:false, chainOk:false };
let _toast='', _toastCol='#44aaff', _toastLife=0;

// ── Functions ─────────────────────────────────────────
export function w3Toast(msg,col='#44aaff'){ _toast=msg; _toastCol=col; _toastLife=3200; }

export async function w3Init(){
  if(typeof window.ethereum==='undefined') return;
  window.ethereum.on('accountsChanged',a=>a.length?w3Connect(true):w3Reset());
  window.ethereum.on('chainChanged',()=>location.reload());
  try{const a=await window.ethereum.request({method:'eth_accounts'});if(a.length)await w3Connect(true);}catch(e){}
}

function w3Reset(){ W3.provider=W3.signer=W3.contract=W3.address=null; W3.connected=W3.chainOk=false; }

export async function w3Connect(silent=false){
  if(typeof window.ethereum==='undefined'){ if(!silent)alert('Install MetaMask or Rabby'); return; }
  try{
    const accs=await window.ethereum.request({method:silent?'eth_accounts':'eth_requestAccounts'});
    if(!accs.length) return;
    W3.provider=new ethers.BrowserProvider(window.ethereum);
    W3.signer=await W3.provider.getSigner();
    W3.address=await W3.signer.getAddress();
    W3.contract=new ethers.Contract(W3_CFG.CONTRACT,W3_CFG.ABI,W3.signer);
    W3.connected=true;
    const net=await W3.provider.getNetwork();
    W3.chainOk=Number(net.chainId)===W3_CFG.CHAIN_ID;
    if(!W3.chainOk&&!silent) await w3SwitchChain();
    w3Migrate();
    if(!silent) w3Toast('Connected: '+w3Short(W3.address),'#44ffaa');
  }catch(e){ if(!silent)w3Toast('Connect failed','#ff4444'); }
}

export async function w3SwitchChain(){
  const hex='0x'+W3_CFG.CHAIN_ID.toString(16);
  try{ await window.ethereum.request({method:'wallet_switchEthereumChain',params:[{chainId:hex}]}); W3.chainOk=true; }
  catch(e){
    if(e.code===4902){
      try{
        await window.ethereum.request({method:'wallet_addEthereumChain',params:[{
          chainId:hex, chainName:W3_CFG.CHAIN_NAME,
          rpcUrls:[W3_CFG.RPC], blockExplorerUrls:[W3_CFG.EXPLORER],
          nativeCurrency:W3_CFG.CURRENCY,
        }]}); W3.chainOk=true;
      }catch(_){}
    }
  }
}

export async function w3BuyOre(oreAmount){
  if(!W3.connected){ w3Connect(); return; }
  if(!W3.chainOk){ await w3SwitchChain(); return; }
  try{
    const cost=await W3.contract.priceFor(oreAmount);
    const ethStr=Number(ethers.formatEther(cost)).toFixed(6);
    const ok=confirm(`Buy ${oreAmount.toLocaleString()} ore?\n\nCost: ${ethStr} ETH\nNetwork: ${W3_CFG.CHAIN_NAME}`);
    if(!ok) return;
    w3Toast('Sending…','#44aaff');
    const tx=await W3.contract.buyOre(oreAmount,{value:cost});
    w3Toast('Confirming…','#44aaff');
    const receipt=await tx.wait();
    const iface=new ethers.Interface(W3_CFG.ABI);
    let got=0n;
    for(const log of receipt.logs){try{const p=iface.parseLog(log);if(p?.name==='OrePurchased'){got=p.args.amount;break;}}catch{}}
    w3Credit(got>0n?Number(got):oreAmount);
  }catch(e){
    if(e.code===4001||e.code==='ACTION_REJECTED') w3Toast('Cancelled','#ffaa44');
    else w3Toast('Error: '+(e.shortMessage||e.message||'').slice(0,48),'#ff4444');
  }
}

function w3Credit(n){
  const app = _getApp();
  META.ore+=n; META.credits+=n; saveMeta(); app.updHUD();
  if(app.G&&app.G.ph==='play'){app.ptcl(app.G.s.x,app.G.s.y,'#44ffaa',30,5,4);app.ring(app.G.s.x,app.G.s.y,'#44ffaa',60);}
  w3Toast('+'+n.toLocaleString()+' ore!','#44ffaa');
}

export function w3Short(a){ return a?a.slice(0,6)+'…'+a.slice(-4):''; }

function w3Migrate(){
  if(!W3.address) return;
  const app = _getApp();
  const key='vs_meta_'+W3.address.toLowerCase();
  try{const ex=localStorage.getItem(key);if(ex){Object.assign(META,JSON.parse(ex));if(!META.owned.includes('vanguard'))META.owned.push('vanguard');if(!META.ore)META.ore=0;app.updHUD();return;}}catch{}
  localStorage.setItem(key,JSON.stringify(META));
}

// ─── Draw functions ───────────────────────────────────

export function w3DrawToast(dt){
  if(_toastLife<=0) return;
  _toastLife=Math.max(0,_toastLife-dt);
  const a=Math.min(1,_toastLife/400);
  C.save(); C.globalAlpha=a;
  rRect(W/2-155,10,310,30,8); C.fillStyle='rgba(4,12,24,0.92)'; C.fill();
  C.strokeStyle=_toastCol; C.lineWidth=1; C.stroke();
  C.font='11px system-ui,sans-serif'; C.fillStyle=_toastCol;
  C.textAlign='center'; C.textBaseline='middle';
  C.fillText(_toast,W/2,25);
  C.restore();
}

export function w3DrawConnectBtn(){
  const app = _getApp();
  const mX=app.mX, mY=app.mY;
  const bw=136,bh=26,bx=W-bw-10,by=10;
  const hv=mX>=bx&&mX<=bx+bw&&mY>=by&&mY<=by+bh;
  rRect(bx,by,bw,bh,6);
  if(W3.connected&&W3.chainOk){
    C.fillStyle=hv?'#0d2a1a':'#060f12'; C.fill();
    C.strokeStyle='#22aa55'; C.lineWidth=1; C.stroke();
    C.font='10px system-ui,sans-serif'; C.fillStyle='#44ee88';
    C.textAlign='center'; C.textBaseline='middle';
    C.fillText('● '+w3Short(W3.address),bx+bw/2,by+bh/2);
  } else if(W3.connected&&!W3.chainOk){
    C.fillStyle=hv?'#2a1800':'#160c00'; C.fill();
    C.strokeStyle='#aa6600'; C.lineWidth=1; C.stroke();
    C.font='10px system-ui,sans-serif'; C.fillStyle='#ffaa44';
    C.textAlign='center'; C.textBaseline='middle';
    C.fillText('⚠ Switch to '+W3_CFG.CHAIN_NAME,bx+bw/2,by+bh/2);
  } else {
    C.fillStyle=hv?'#0e1e36':'#060e1a'; C.fill();
    C.strokeStyle='#1e3a6a'; C.lineWidth=1; C.stroke();
    C.font='10px system-ui,sans-serif'; C.fillStyle=hv?'#88aadd':'#4466aa';
    C.textAlign='center'; C.textBaseline='middle';
    C.fillText('Connect Wallet',bx+bw/2,by+bh/2);
  }
  return {x:bx,y:by,w:bw,h:bh,act:'w3connect'};
}

export function w3DrawShopPanel(){
  const app = _getApp();
  const mX=app.mX, mY=app.mY;
  const px=20,py=H-110,pw=W-40,ph=100;
  rRect(px,py,pw,ph,8);
  C.fillStyle='#040e1a'; C.fill();
  C.strokeStyle='#0d2840'; C.lineWidth=1; C.stroke();

  C.font='500 11px system-ui,sans-serif'; C.fillStyle='#44aaff';
  C.textAlign='left'; C.textBaseline='middle';
  C.fillText('BUY ORE  ·  '+W3_CFG.CHAIN_NAME, px+12, py+16);

  if(!W3.connected){
    C.font='11px system-ui,sans-serif'; C.fillStyle='#334455';
    C.fillText('Connect wallet to buy ore with ETH', px+12, py+44);
    const bw2=148,bh2=28,bx2=pw-bw2+px-8,by2=py+30;
    rRect(bx2,by2,bw2,bh2,6);
    const hv=mX>=bx2&&mX<=bx2+bw2&&mY>=by2&&mY<=by2+bh2;
    C.fillStyle=hv?'#1a3a6a':'#0d2040'; C.fill();
    C.strokeStyle='#2a5a9a'; C.lineWidth=1; C.stroke();
    C.font='500 11px system-ui,sans-serif'; C.fillStyle='#4488cc';
    C.textAlign='center'; C.fillText('Connect Wallet',bx2+bw2/2,by2+bh2/2);
    return [{x:bx2,y:by2,w:bw2,h:bh2,act:'w3connect'}];
  }
  if(!W3.chainOk){
    C.font='11px system-ui,sans-serif'; C.fillStyle='#aa6600';
    C.fillText('Switch to '+W3_CFG.CHAIN_NAME+' to purchase', px+12, py+44);
    const bw2=148,bh2=28,bx2=pw-bw2+px-8,by2=py+30;
    rRect(bx2,by2,bw2,bh2,6);
    C.fillStyle='#2a1800'; C.fill(); C.strokeStyle='#aa6600'; C.stroke();
    C.font='500 11px system-ui,sans-serif'; C.fillStyle='#ffaa44';
    C.textAlign='center'; C.fillText('Switch Network',bx2+bw2/2,by2+bh2/2);
    return [{x:bx2,y:by2,w:bw2,h:bh2,act:'w3switch'}];
  }

  const btns=[];
  const pkgs=W3_CFG.PKGS;
  const gx2=8, bw3=(pw-gx2*(pkgs.length+1))/pkgs.length;
  pkgs.forEach((pkg,i)=>{
    const bx2=px+gx2+i*(bw3+gx2), by2=py+28, bh2=ph-38;
    rRect(bx2,by2,bw3,bh2,7);
    const hv=mX>=bx2&&mX<=bx2+bw3&&mY>=by2&&mY<=by2+bh2;
    C.fillStyle=hv?'#0d2240':'#060e1c'; C.fill();
    C.strokeStyle=hv?'#1e4a8a':'#0d2030'; C.lineWidth=hv?1.5:1; C.stroke();
    C.textAlign='center'; C.textBaseline='middle';
    C.font='500 12px system-ui,sans-serif'; C.fillStyle='#44ffaa';
    C.fillText('◆ '+pkg.ore.toLocaleString(),bx2+bw3/2,by2+16);
    C.font='500 11px system-ui,sans-serif'; C.fillStyle='#ffdd44';
    C.fillText(pkg.sub,bx2+bw3/2,by2+32);
    C.font='9px system-ui,sans-serif'; C.fillStyle='#446688';
    C.fillText(pkg.label,bx2+bw3/2,by2+44);
    btns.push({x:bx2,y:by2,w:bw3,h:bh2,act:'w3buyore',ore:pkg.ore});
  });
  return btns;
}
