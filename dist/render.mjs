import {preloadMaterials,materialImage} from './stage-materials.mjs?v=lumen-2.4.0';
import { clamp } from './model.mjs?v=lumen-2.4.0';
import { paintStageBackdrop, preloadStageArt } from './stage-art.mjs?v=lumen-2.4.0';
const TAU = Math.PI * 2;
const hash = (a, b = 0) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
const oval = (c, x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); };
function glow(c, x, y, r, color) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'transparent'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
function plate(c, points) { c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath(); c.fill(); c.stroke(); }
const rgba = (hex, a) => { const n=parseInt(hex.slice(1),16); return `rgba(${n>>16},${n>>8&255},${n&255},${a})`; };
const mixHex = (a,b,t) => { const x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16),part=(shift)=>Math.round((x>>shift&255)*(1-t)+(y>>shift&255)*t); return `#${[16,8,0].map(s=>part(s).toString(16).padStart(2,'0')).join('')}`; };
const smooth = t => t*t*(3-2*t);
const ZONES=[
{hazard:'#ffd08a',accent:'#ffb370',rock:['#1b1a28','#665042','#c68a62']},
{hazard:'#a1ffe0',accent:'#76e8d4',rock:['#0c222d','#2d6a69','#83bcac']},
{hazard:'#ced3ff',accent:'#92beff',rock:['#131f42','#465d92','#a9bfff']},
{hazard:'#ffd091',accent:'#ff976a',rock:['#261c2a','#803b3b','#e6a16b']},
{hazard:'#9becf5',accent:'#77c6e3',rock:['#0a1b2c','#35577a','#8dcbd7']}
];
export class Painter {
  constructor(canvas) { this.canvas = canvas; this.c = canvas.getContext('2d', { alpha: false }); this.atlas=null; this.frames=null; this.flashes={}; this.trail = []; this.lastTrail = 0; this.width = 1100; this.height = 640; this.dpr = 1; this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; preloadStageArt().catch(()=>{}); preloadMaterials().catch(()=>{}); }
  async loadAssets() {
    const [data,img]=await Promise.all([fetch(new URL('./assets/mech-atlas-v2.json?v=lumen-2.4.0',import.meta.url).href).then(r=>{if(!r.ok)throw Error('atlas metadata');return r.json();}),new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src=new URL('./assets/mech-atlas-v2.webp?v=lumen-2.4.0',import.meta.url).href;})]);
    this.atlas=img;this.frames=data.frames;
    for(const [key,[x,y,w,h]] of Object.entries(this.frames)){const cv=document.createElement('canvas');cv.width=w;cv.height=h;const ctx=cv.getContext('2d');ctx.drawImage(img,x,y,w,h,0,0,w,h);ctx.globalCompositeOperation='source-in';ctx.fillStyle='#fff1dc';ctx.fillRect(0,0,w,h);this.flashes[key]=cv;}
  }
  sprite(frame,width,hit=0){
    if(!this.atlas||!this.frames?.[frame])return;const c=this.c,[sx,sy,sw,sh]=this.frames[frame],h=width*sh/sw;
    c.drawImage(this.atlas,sx,sy,sw,sh,-width/2,-h/2,width,h);
    if(hit>0){c.save();c.globalAlpha=Math.min(.7,hit*6);c.drawImage(this.flashes[frame],-width/2,-h/2,width,h);c.restore();}
  }
  ship(x,y,tilt,boost,t,size=1,hurt=0,frame='lancer',rig=null){
    if(!this.atlas)return this.legacyShip(x,y,tilt,boost,t,size,hurt);
    const c=this.c;c.save();c.translate(x,y);c.rotate(tilt);c.scale(size,size);if(hurt>0&&Math.sin(hurt*36)<0)c.globalAlpha=.55;
    const color=frame==='bastion'?'#8cceff':frame==='wraith'?'#85f5cb':'#ffbf86';
    for(const y0 of [-15,14]){const l=27+boost*17+Math.sin(t*8)*2;const g=c.createLinearGradient(-37-l,0,-28,0);g.addColorStop(0,'transparent');g.addColorStop(.6,'#6ddfff90');g.addColorStop(1,'#d2f8ff');c.fillStyle=g;c.beginPath();c.moveTo(-29,y0-5);c.lineTo(-36-l,y0);c.lineTo(-29,y0+5);c.fill();}
    glow(c,-23,0,47,'#70d9ff1a');this.sprite(frame,96);
    if(rig){
      c.strokeStyle='#d2dbe0';c.lineWidth=2;
      if(rig.skills.beam)for(const side of [-1,1]){c.beginPath();c.moveTo(8,side*17);c.lineTo(43,side*17);c.stroke();c.strokeStyle='#a3e9ff';c.beginPath();c.moveTo(29,side*17);c.lineTo(46,side*17);c.stroke();c.strokeStyle='#d2dbe0';}
      if(rig.skills.missile)for(const side of [-1,1]){c.fillStyle='#596273';c.strokeStyle='#acb7c0';c.lineWidth=.65;plate(c,[[-15,side*18],[2,side*20],[4,side*27],[-17,side*25]]);c.fillStyle='#f0b184';for(let i=0;i<3;i++)c.fillRect(-12+i*5,side*21-1,2,2);}
    }
    if(boost>.02){c.fillStyle=`rgba(121,224,255,${boost*.7})`;for(const px of [-10,14]){c.beginPath();c.moveTo(px-3,15);c.lineTo(px+2,15);c.lineTo(px,25+boost*18);c.fill();}}
    c.fillStyle=color;c.fillRect(10,7,3,.8);c.restore();
  }
  thumbnail(canvas,frame){const old=this.c;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);this.c=ctx;this.ship(canvas.width*.53,canvas.height*.5,-.05,.1,0,canvas.width/125,0,frame);this.c=old;}
  enemy(e){
    if(!this.atlas)return this.legacyEnemy(e);
    const c=this.c,frame={wisp:'scout',ray:'interceptor',thorn:'turret',elite:'carrier',boss:'boss'}[e.type];
    const angle=e.type==='ray'&&e.dash>0?e.aim-Math.PI:Math.sin(e.age*1.7+e.phase)*.04;
    if(e.warn>0){c.save();c.globalAlpha=.45+.3*Math.sin(e.age*35);c.strokeStyle='#ff819d';c.lineWidth=1;c.setLineDash([7,7]);c.beginPath();c.moveTo(e.x,e.y);c.lineTo(e.x+Math.cos(e.aim)*700,e.y+Math.sin(e.aim)*700);c.stroke();c.setLineDash([]);c.strokeRect(e.x-8,e.y-8,16,16);c.restore();}
    c.save();c.translate(e.x,e.y);c.rotate(angle);
    if(e.type==='boss'||e.type==='elite')glow(c,15,0,e.r*1.5,'#e5a68712');
    const width=e.r*(e.type==='boss'?3.05:e.type==='elite'?3.1:2.65);
    this.sprite(frame,width,e.hit);
    if(e.type==='boss'&&e.phaseLock>0){c.strokeStyle='#b8e6fc99';c.lineWidth=2;c.beginPath();c.arc(0,0,e.r*1.5,0,TAU);c.stroke();}if(e.type==='boss'){c.strokeStyle='#efb27566';c.lineWidth=1;for(const side of [-1,1]){c.beginPath();c.moveTo(-30,side*35);c.lineTo(-48,side*52);c.lineTo(-63,side*52);c.stroke();}if(e.phaseIndex>0){c.fillStyle='#ffb097';for(let i=0;i<e.phaseIndex+1;i++)oval(c,-38+i*20,-18,2,2);}}
    c.restore();
    if(e.hp<e.maxHP&&e.type!=='boss'){c.fillStyle='#121b2e';c.fillRect(e.x-e.r,e.y-e.r-16,e.r*2,2);c.fillStyle='#efa99e';c.fillRect(e.x-e.r,e.y-e.r-16,e.r*2*Math.max(0,e.hp/e.maxHP),2);}
  }
  resize(w, h) { this.dpr = Math.min(devicePixelRatio || 1, 2); this.canvas.width = Math.round(w * this.dpr); this.canvas.height = Math.round(h * this.dpr); this.width = w; this.height = h; this.h = w / h < .8 ? 840 : 640; this.w = this.h * w / h; }
  background(t, camera, stageTime=t) {
    paintStageBackdrop(this.c,this.w,this.h,camera,t,stageTime,this.reduce);
  }
  legacyShip(x, y, tilt, boost, t, size = 1, hurt = 0) {
    const c = this.c;
    c.save(); c.translate(x,y); c.rotate(tilt); c.scale(size,size);
    if (hurt > 0 && Math.sin(hurt*35) < 0) c.globalAlpha = .5;
    const pulse = .85 + Math.sin(t*32)*.12;
    // Fixed hull and attached engine pods. Only the exhaust responds to thrust.
    glow(c,-33,0,50,'#6bd9ff26');
    for (const side of [-1,1]) {
      c.save(); c.scale(1,side);
      const exhaust = c.createLinearGradient(-72,0,-28,0);
      exhaust.addColorStop(0,'#56befe00'); exhaust.addColorStop(.55,'#68d6ff88'); exhaust.addColorStop(1,'#ddfcff');
      c.fillStyle=exhaust;
      c.beginPath(); c.moveTo(-31,-10); c.lineTo(-31,-17); c.quadraticCurveTo(-52,-17,-69-pulse*6-boost*13,-14); c.quadraticCurveTo(-49,-10,-31,-10); c.fill();
      c.fillStyle='#ddfaff'; c.beginPath(); c.moveTo(-31,-12); c.lineTo(-48-boost*7,-14); c.lineTo(-31,-15); c.fill();
      c.fillStyle='#526b83'; c.strokeStyle='#c9dbe3'; c.lineWidth=.65;
      plate(c,[[-22,-7],[-29,-22],[-12,-23],[10,-7]]);
      c.fillStyle='#a8bfc9'; plate(c,[[-23,-11],[-29,-22],[-17,-22],[-8,-11]]);
      c.fillStyle='#263b53'; c.strokeStyle='#86acbf';
      plate(c,[[-36,-10],[-36,-17],[-30,-20],[-15,-18],[-11,-13],[-17,-10]]);
      c.fillStyle='#d8dfd6'; c.strokeStyle='#778fa1';
      plate(c,[[-33,-16],[-28,-18],[-17,-17],[-14,-14],[-28,-13]]);
      c.fillStyle='#94edff'; c.fillRect(-35,-16,2,5);
      c.strokeStyle='#b89860'; c.lineWidth=.8; c.beginPath(); c.moveTo(-22,-20); c.lineTo(-12,-12); c.lineTo(0,-9); c.stroke();
      c.fillStyle='#1c334c'; c.fillRect(-25,-18,5,1); c.fillRect(-22,-15,5,1);
      c.restore();
    }
    const hull = c.createLinearGradient(0,-12,0,12);
    hull.addColorStop(0,'#f0eee2'); hull.addColorStop(.4,'#b9cdd3'); hull.addColorStop(.53,'#e4e8dd'); hull.addColorStop(1,'#536c86');
    c.fillStyle=hull; c.strokeStyle='#d7e4e2'; c.lineWidth=.65;
    plate(c,[[43,0],[18,-9],[-9,-11],[-29,-6],[-23,0],[-29,6],[-9,11],[18,9]]);
    c.fillStyle='#f1e8cb'; c.strokeStyle='#a7b1af';
    plate(c,[[43,0],[18,-4],[-17,0],[18,4]]);
    c.fillStyle='#2a5270'; c.strokeStyle='#badce2'; c.lineWidth=.55;
    plate(c,[[23,-3],[5,-8],[-7,-5],[0,0],[12,2]]);
    const glass=c.createLinearGradient(-7,-8,20,4); glass.addColorStop(0,'#8ce4f5'); glass.addColorStop(.45,'#266384'); glass.addColorStop(1,'#112b49');
    c.fillStyle=glass; plate(c,[[19,-3],[5,-6],[-4,-4],[2,-1],[12,0]]);
    c.strokeStyle='#d9ceab'; c.lineWidth=.8; c.beginPath(); c.moveTo(-18,-7); c.lineTo(-10,-3); c.moveTo(-18,7); c.lineTo(-10,3); c.moveTo(27,-3); c.lineTo(36,0); c.stroke();
    c.fillStyle='#728d9e'; c.fillRect(-21,-3,6,6);
    c.fillStyle='#b1eeef'; c.fillRect(-21,-2,3,1); c.fillRect(-21,1,3,1);
    c.fillStyle='#f3b477'; c.fillRect(4,6,8,1.3);
    // Vertical boost nozzles visibly fire downward when the one-button lift is used.
    if (boost > .02) for (const px of [-15,9]) {
      c.fillStyle=`rgba(112,220,255,${boost*.7})`;
      c.beginPath(); c.moveTo(px-2,9); c.lineTo(px+2,9); c.lineTo(px+1,15+boost*16*pulse); c.lineTo(px-1,12+boost*18*pulse); c.fill();
      c.fillStyle=`rgba(225,252,255,${boost})`; c.fillRect(px-1,9,2,6+boost*5);
    }
    c.restore();
  }
  gateMarker(r,t){
    if(!r.gateId)return;const c=this.c,z=ZONES[r.theme??0],warning=z.hazard,half=146,pulse=.58+.18*Math.sin(t*3.4+r.phase),top=r.center-r.gap/2,bottom=r.center+r.gap/2;
    c.save();const g=c.createLinearGradient(r.x-half,0,r.x+half,0);g.addColorStop(0,rgba(warning,.015));g.addColorStop(.5,rgba(warning,.075));g.addColorStop(1,rgba(warning,.015));c.fillStyle=g;c.fillRect(r.x-half,top,half*2,r.gap);
    c.strokeStyle=rgba(warning,pulse*.52);c.lineWidth=1.2;c.setLineDash([12,11]);c.lineDashOffset=-t*24;
    for(const y of [top,bottom]){c.beginPath();c.moveTo(r.x-half,y);c.lineTo(r.x+half,y);c.stroke();}
    c.setLineDash([]);c.strokeStyle=rgba(warning,pulse*.38);c.lineWidth=1;
    for(const x of [r.x-half+10,r.x+half-10]){c.beginPath();c.moveTo(x-7,r.center-8);c.lineTo(x,r.center);c.lineTo(x-7,r.center+8);c.stroke();}
    c.restore();
  }
  rock(r,t=0){
    const c=this.c,theme=Math.max(0,Math.min(4,r.theme??0)),z=ZONES[theme],tones=z.rock;
    const pulse=.68+.23*Math.sin(t*3.5+r.phase),edge=r.side<0?r.ry*.86:-r.ry*.86;
    c.save();c.translate(r.x,r.y);
    const grad=c.createLinearGradient(-r.rx,-r.ry,r.rx,r.ry);grad.addColorStop(0,tones[0]);grad.addColorStop(.54,tones[1]);grad.addColorStop(1,tones[2]);
    c.fillStyle=grad;c.strokeStyle=rgba(z.hazard,.5);c.lineWidth=1.8;
    const body=()=>{c.beginPath();for(let i=0;i<22;i++){
      const a=i/22*TAU,v=.87+.11*hash(i,r.phase+theme*2);
      i?c.lineTo(Math.cos(a)*r.rx*v,Math.sin(a)*r.ry*v):c.moveTo(Math.cos(a)*r.rx*v,Math.sin(a)*r.ry*v);
    }c.closePath();};
    body();c.fill();c.save();body();c.clip();
    const material=materialImage(theme===0?5:theme);
    if(material&&material.complete&&material.naturalWidth){
      c.save();c.globalAlpha=.64;
      c.drawImage(material,-r.rx,-r.ry,r.rx*2,r.ry*2);
      c.restore();
    }
    c.fillStyle=rgba('#030a16',.29);plate(c,[[r.rx*.08,-r.ry*.82],[r.rx,-r.ry*.68],[r.rx*.69,r.ry*.94],[r.rx*.08,r.ry*.67]]);
    if(theme===0){ // Heat-glazed orbital wreck.
      for(let i=0;i<7;i++){const y=-r.ry*.76+i*r.ry*.26;
        c.strokeStyle='#ffb48270';c.lineWidth=2;c.beginPath();c.moveTo(-r.rx*.8,y);c.lineTo(r.rx*.55,y+14);c.stroke();
        c.fillStyle='#e9ab7f55';c.fillRect(-r.rx*.59,y+5,r.rx*.92,2.8);
      }
    }else if(theme===1){ // Bioluminescent nacre ribs.
      for(let i=0;i<8;i++){const y=-r.ry*.9+i*r.ry*.26;
        c.strokeStyle='#a3ffe29e';c.lineWidth=2.5;c.beginPath();c.moveTo(-r.rx*.68,y+8);
        c.bezierCurveTo(-r.rx*.18,y-24,r.rx*.67,y+27,r.rx*.39,y+53);c.stroke();
      }
    }else if(theme===2){ // Prismatic facets.
      for(let i=0;i<7;i++){const y=-r.ry*.92+i*r.ry*.31;
        c.fillStyle='#b0ddff30';plate(c,[[-r.rx*.75,y],[r.rx*.53,y-r.ry*.09],[r.rx*.22,y+r.ry*.22]]);
        c.strokeStyle='#d5eaff9a';c.lineWidth=1;c.beginPath();c.moveTo(-r.rx*.75,y);c.lineTo(r.rx*.53,y-r.ry*.09);c.stroke();
      }
    }else if(theme===3){ // Molten slag.
      for(let i=0;i<5;i++){const y=-r.ry*.8+i*r.ry*.37;
        c.strokeStyle='#ff9f5cb8';c.lineWidth=2.2;c.beginPath();c.moveTo(-r.rx*.8,y);
        c.lineTo(-r.rx*.2,y+19);c.lineTo(r.rx*.19,y-4);c.lineTo(r.rx*.78,y+30);c.stroke();
      }
    }else{ // Machined armor and warning lamps.
      for(let i=0;i<7;i++){const y=-r.ry*.8+i*r.ry*.26;
        c.fillStyle=i%2?'#32546a99':'#111e3699';c.fillRect(-r.rx*.79,y,r.rx*1.55,r.ry*.21);
        c.strokeStyle='#91dbef77';c.lineWidth=1;c.strokeRect(-r.rx*.79,y,r.rx*1.55,r.ry*.21);
        c.fillStyle='#8df6ec99';c.fillRect(-r.rx*.55,y+5,10,2);
      }
    }
    c.restore();body();c.strokeStyle=rgba(z.hazard,.42+pulse*.15);c.lineWidth=1.9;c.stroke();
    glow(c,0,edge,35,rgba(z.hazard,.18));
    c.strokeStyle=rgba(z.hazard,pulse);c.lineWidth=2.4;c.beginPath();c.moveTo(-r.rx*.56,edge);c.lineTo(r.rx*.56,edge);c.stroke();
    c.fillStyle=rgba(z.hazard,pulse);for(let k=0;k<4;k++)oval(c,-r.rx*.39+k*r.rx*.26,edge,1.65,1.65);
    c.restore();
  }
  legacyEnemy(e) {
    const c=this.c; c.save(); c.translate(e.x,e.y);
    c.rotate(Math.sin(e.age*1.8+e.phase)*.035); const s=e.r/23; c.scale(s,s);
    const edge=e.hit?'#ffffff':'#b8b3ca', fill=e.hit?'#ffffff':'#4c5975';
    c.lineWidth=.8; c.strokeStyle=edge; c.fillStyle=fill;
    if (e.type==='wisp') {
      // Recon drone: enclosed sensor, rigid armor and rear ion drive.
      glow(c,15,0,35,'#d390c225');
      c.fillStyle='#c495b4'; c.fillRect(16,-5,16+Math.sin(e.age*25)*3,10);
      c.fillStyle=fill; plate(c,[[-21,-7],[-12,-15],[12,-12],[21,-5],[21,5],[12,12],[-12,15],[-21,7]]);
      c.fillStyle='#8a91aa'; plate(c,[[-13,-12],[7,-10],[13,-5],[-15,-5]]);
      c.fillStyle='#293b54'; c.strokeStyle='#cdb3c6'; plate(c,[[-12,-6],[3,-6],[8,0],[3,6],[-12,6],[-16,0]]);
      c.fillStyle='#ffc1c4'; c.fillRect(-12,-2,13,4); c.fillStyle='#fff2da'; c.fillRect(-12,-1,3,2);
      c.fillStyle='#283b53'; c.fillRect(6,-13,8,3); c.fillRect(6,10,8,3);
    } else if (e.type==='thorn') {
      // Four-square turret with a rotating mechanical cannon cradle.
      c.fillStyle='#53617d'; c.strokeStyle=edge;
      for (let i=0;i<4;i++) { c.save(); c.rotate(i*Math.PI/2); plate(c,[[-5,-10],[-7,-25],[5,-25],[6,-11]]); c.fillStyle='#d3afbd'; c.fillRect(-3,-23,5,2); c.restore(); }
      c.fillStyle=fill; plate(c,[[-13,-9],[-6,-14],[8,-12],[14,-5],[12,9],[5,14],[-9,12],[-14,5]]);
      c.save(); c.rotate(e.age*.6+e.phase); c.fillStyle='#b5b6bf'; c.strokeStyle='#d6c9c9';
      plate(c,[[-8,-5],[-8,5],[8,5],[8,-5]]);
      c.fillStyle='#252e45'; c.fillRect(-22,-3,15,6); c.fillStyle='#eab2bc'; c.fillRect(-23,-3,2,6); c.restore();
      c.fillStyle='#eabec9'; oval(c,0,0,3,3);
    } else if (e.type==='ray') {
      // Raider with two connected missile pods; there is no wingbeat animation.
      c.fillStyle='#bd93ac'; c.fillRect(26,-6,20+Math.sin(e.age*24)*3,12);
      c.fillStyle='#323e59'; c.strokeStyle=edge; c.fillRect(-2,-18,7,36);
      for (const side of [-1,1]) { c.save(); c.scale(1,side);
        c.fillStyle='#7d829c'; plate(c,[[-12,-14],[-6,-23],[22,-23],[29,-16],[23,-12]]);
        c.fillStyle='#353f59'; c.strokeStyle='#a8a7bd'; plate(c,[[-8,-16],[-5,-20],[20,-20],[23,-16]]);
        c.fillStyle='#e6b5bc'; c.fillRect(-7,-19,3,3); c.fillRect(2,-19,3,3); c.fillRect(11,-19,3,3); c.restore(); }
      c.fillStyle=fill; c.strokeStyle=edge; plate(c,[[-30,0],[-10,-10],[22,-10],[31,-5],[31,5],[22,10],[-10,10]]);
      c.fillStyle='#aeb6c4'; plate(c,[[-30,0],[-9,-6],[18,-6],[25,0]]);
      c.fillStyle='#282b45'; c.strokeStyle='#d1aebc'; plate(c,[[-17,-3],[1,-4],[7,0],[1,4],[-17,3]]);
      c.fillStyle='#ffbbc3'; c.fillRect(-17,-1,12,2);
    } else if (e.type==='elite') {
      // Armored carrier: flat deck, launch bays and twin forward railguns.
      glow(c,26,0,45,'#c8a0cb25');
      for (const side of [-1,1]) { c.save(); c.scale(1,side);
        c.fillStyle='#2c3d58'; c.strokeStyle=edge; plate(c,[[-19,-14],[-12,-25],[26,-25],[32,-16],[24,-11]]);
        c.fillStyle='#c7a9bd'; c.fillRect(29,-22,12,5); c.fillStyle='#53647a'; c.fillRect(-29,-17,19,5); c.fillStyle='#ffc7b0'; c.fillRect(-30,-16,3,3);
        c.fillStyle='#a9a4ad'; c.fillRect(-8,-23,25,3); c.fillStyle='#dfb98b'; for (let i=0;i<4;i++) c.fillRect(-5+i*6,-17,3,2); c.restore(); }
      const armor=c.createLinearGradient(0,-18,0,18); armor.addColorStop(0,'#a1a7b7'); armor.addColorStop(.4,fill); armor.addColorStop(1,'#293c56');
      c.fillStyle=armor; c.strokeStyle=edge; plate(c,[[-31,-7],[-16,-17],[20,-17],[31,-8],[31,8],[20,17],[-16,17],[-31,7]]);
      c.fillStyle='#303e55'; plate(c,[[-22,-5],[-6,-8],[12,-8],[18,0],[12,8],[-6,8],[-22,5]]);
      c.fillStyle='#e9bd98'; c.fillRect(-13,-2,22,4); c.fillStyle='#4c7185'; c.fillRect(15,-7,7,14);
    } else {
      // Eclipse: a reactor fortress in a segmented weapons ring.
      glow(c,0,0,50,'#a281bd30');
      c.save(); c.rotate(e.age*.11); c.lineWidth=1; c.strokeStyle='#d4b485';
      for (let i=0;i<8;i++) { const a=i*TAU/8; c.beginPath(); c.arc(0,0,34,a+.04,a+.61); c.stroke(); c.save(); c.rotate(a); c.fillStyle='#5e647e'; c.strokeStyle='#c8b2bd'; plate(c,[[29,-3],[39,-3],[41,0],[39,3],[29,3]]); c.fillStyle='#efb5c2'; c.fillRect(37,-1,3,2); c.restore(); }
      c.restore();
      c.fillStyle='#3e4e6c'; c.strokeStyle=edge; c.lineWidth=.8;
      for (const side of [-1,1]) { c.save(); c.scale(1,side);
        plate(c,[[-18,-10],[-14,-25],[18,-25],[24,-17],[23,-10]]);
        c.fillStyle='#b0a4b9'; c.fillRect(-8,-24,22,3); c.fillStyle='#ddb38f'; for (let i=0;i<4;i++) c.fillRect(-11+i*7,-18,4,2);
        c.fillStyle='#465671'; c.strokeStyle='#cdb4c4'; plate(c,[[-34,-12],[-34,-7],[-17,-7],[-13,-12]]);
        c.fillStyle='#ffb5bf'; c.fillRect(-35,-11,3,3); c.restore(); }
      const armor=c.createLinearGradient(0,-18,0,18); armor.addColorStop(0,'#c2b9c9'); armor.addColorStop(.42,'#53627f'); armor.addColorStop(1,'#2d405f');
      c.fillStyle=armor; c.strokeStyle=edge; plate(c,[[-27,-9],[-15,-18],[16,-18],[28,-9],[28,9],[16,18],[-15,18],[-27,9]]);
      c.fillStyle='#172b47'; c.strokeStyle='#b1c6d4'; plate(c,[[-15,-6],[-7,-12],[9,-12],[17,-6],[17,6],[9,12],[-7,12],[-15,6]]);
      c.save(); c.rotate(-e.age*.35); c.strokeStyle='#dfb8ca'; c.beginPath(); c.arc(1,0,9,0,TAU); c.stroke(); c.fillStyle='#edc2d4'; c.fillRect(-1,-7,4,14); c.fillStyle='#fff1d5'; c.fillRect(0,-4,2,8); c.restore();
      c.strokeStyle='#edc499'; c.beginPath(); c.moveTo(-25,-5); c.lineTo(-20,-10); c.moveTo(-25,5); c.lineTo(-20,10); c.stroke();
    }
    c.restore();
    if (e.hp<e.maxHP && e.type!=='boss') { c.fillStyle='#171d32'; c.fillRect(e.x-e.r,e.y-e.r-14,e.r*2,2); c.fillStyle='#d6a4c3'; c.fillRect(e.x-e.r,e.y-e.r-14,e.r*2*Math.max(0,e.hp/e.maxHP),2); }
  }
  draw(f, mode = 'playing', visualTime = 0) {
    const c = this.c; c.setTransform(this.canvas.width / this.w, 0, 0, this.canvas.height / this.h, 0, 0); const t = visualTime;
    this.background(t, f.camera,mode==='title'||mode==='guide'?t:f.time); c.save(); c.translate(-f.camera.x, -f.camera.y);
    if (mode !== 'title' && mode !== 'guide') {
      for(const r of f.rocks)if(r.side===-1)this.gateMarker(r,t);
      for (const r of f.rocks) this.rock(r,t);
      for (const g of f.gems) { if(g.kind==='chest'){glow(c,g.x,g.y,32,'#ffd28736');c.save();c.translate(g.x,g.y);c.fillStyle='#786343';c.strokeStyle='#f5d498';c.lineWidth=1.5;c.fillRect(-9,-7,18,14);c.strokeRect(-9,-7,18,14);c.fillStyle='#ffefb3';c.fillRect(-2,-9,4,18);c.restore();continue;} if (g.kind === 'heal') { glow(c,g.x,g.y,27,'#b5ffd34c'); c.strokeStyle='#d6f6ca'; c.lineWidth=2; c.beginPath(); c.moveTo(g.x-6,g.y); c.lineTo(g.x+6,g.y); c.moveTo(g.x,g.y-6); c.lineTo(g.x,g.y+6); c.stroke(); continue; } glow(c, g.x, g.y, 20, '#78e8d328'); c.save(); c.translate(g.x, g.y); c.rotate(Math.PI / 4); c.fillStyle = g.value > 3 ? '#f0d99a' : '#8fe3cf'; c.fillRect(-3.5, -3.5, 7, 7); c.strokeStyle = '#d7fff3'; c.lineWidth = .6; c.strokeRect(-3.5, -3.5, 7, 7); c.restore(); }
      for (const e of f.enemies) this.enemy(e);
      c.save(); c.globalCompositeOperation = 'lighter';
      for(const b of f.bullets){
        const missile=b.kind==='missile',drone=b.kind==='drone';c.strokeStyle=missile?'#ffb77e77':drone?'#98f4bb66':'#f2d79b66';c.lineWidth=missile?2.6:1.6;c.beginPath();c.moveTo(b.x-b.vx*.043,b.y-b.vy*.043);c.lineTo(b.x,b.y);c.stroke();
        if(missile){c.save();c.translate(b.x,b.y);c.rotate(Math.atan2(b.vy,b.vx));c.fillStyle='#d6d4b9';c.fillRect(-5,-2.4,10,4.8);c.fillStyle='#ffbf83';c.fillRect(-7,-1.5,3,3);c.restore();}else{c.fillStyle=drone?'#c8ffda':'#fff1c3';oval(c,b.x,b.y,f.evolutions.nova&&!drone?3.5:2.3,1.6);}
      }
      for (const b of f.hostiles) { glow(c, b.x, b.y, 20, '#fb8e9f66'); c.strokeStyle = '#ffb3b1'; c.lineWidth = 1.5; c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.stroke(); c.fillStyle = '#ffc3bb'; oval(c, b.x, b.y, 2, 2); }
      c.restore();
      for (const e of f.effects) {
        const q = e.age / e.life; c.save(); c.globalAlpha = 1 - q;
        if(e.kind==='muzzle'){glow(c,e.x,e.y,14,'#ffe3ad88');c.fillStyle='#fff3ce';c.fillRect(e.x-1,e.y-1,7,2);}
        else if(e.kind==='beam'){c.strokeStyle='#8bd4ff2d';c.lineWidth=e.width*3;c.beginPath();c.moveTo(e.ox,e.oy);c.lineTo(e.x,e.y);c.stroke();c.strokeStyle='#a6e4ffaa';c.lineWidth=e.width;c.stroke();c.strokeStyle='#f0fcff';c.lineWidth=Math.max(1,e.width*.2);c.stroke();}
        else if(e.kind==='explosion'){glow(c,e.x,e.y,e.radius*(.3+q*.7),e.color+'35');c.strokeStyle=e.color;c.lineWidth=2*(1-q)+.5;c.beginPath();c.arc(e.x,e.y,8+e.radius*q,0,TAU);c.stroke();}
        else if(e.kind==='gateClear'){const radius=18+q*e.radius;glow(c,e.x,e.y,radius*.75,`${e.color}3a`);c.strokeStyle=e.color;c.lineWidth=2*(1-q)+.6;c.beginPath();c.arc(e.x,e.y,radius,0,TAU);c.stroke();for(let i=0;i<8;i++){const a=i/8*TAU,r=radius*.72;c.fillStyle=e.color;oval(c,e.x+Math.cos(a)*r,e.y+Math.sin(a)*r,2*(1-q)+.5,2*(1-q)+.5);}}
        else if (e.kind === 'lightning') { c.strokeStyle = '#d6c6ff'; c.lineWidth = 2; c.beginPath(); c.moveTo(e.ox, e.oy); for (let i = 1; i <= 8; i++) { const a = i / 8; c.lineTo(e.ox + (e.x - e.ox) * a + (i < 8 ? Math.sin(i * 32) * 13 : 0), e.oy + (e.y - e.oy) * a); } c.stroke(); }
        else { c.strokeStyle = e.kind === 'hurt' ? '#e79a9a' : e.color || '#e8d39b'; c.lineWidth = 1; c.beginPath(); c.arc(e.x, e.y, 12 + q * (e.radius || 60), 0, TAU); c.stroke(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; c.fillStyle = c.strokeStyle; oval(c, e.x + Math.cos(a) * q * 55, e.y + Math.sin(a) * q * 55, 2 * (1 - q) + .5, 1); } }
        c.restore();
      }
      if(f.skills.orbit){
        const radius=f.evolutions.aegis?105:75;c.strokeStyle=f.evolutions.aegis?'#a6eee737':'#a6eee715';c.lineWidth=1;c.beginPath();c.arc(f.p.x,f.p.y,radius,0,TAU);c.stroke();
        for(const d of f.orbitPositions()){c.save();c.translate(d.x,d.y);c.rotate(f.time*5);glow(c,0,0,22,'#7ce5d73a');c.fillStyle='#cffcef';c.strokeStyle='#59bcb4';c.lineWidth=1;plate(c,[[-15,0],[5,-5],[14,0],[5,5]]);c.restore();}
      }
      for(const d of f.dronePositions()){c.save();c.translate(d.x,d.y);this.sprite('wraith',26);glow(c,-10,0,14,'#8cddce26');c.restore();}
      if(f.p.shield){c.strokeStyle='#9ceaff77';c.lineWidth=1.3;c.beginPath();c.arc(f.p.x,f.p.y,34,-1.3,1.3);c.stroke();c.strokeStyle='#9ceaff24';c.beginPath();c.arc(f.p.x,f.p.y,34,1.3,5);c.stroke();}
      if (f.time - this.lastTrail > .025 && f.status === 'playing' && mode === 'playing') { this.trail.push({ x: f.p.x - 30, y: f.p.y, t: f.time }); this.lastTrail = f.time; }
      this.trail = this.trail.filter(p => f.time - p.t < .7); c.lineCap = 'round';
      for (let i = 1; i < this.trail.length; i++) { const p = this.trail[i], prev = this.trail[i - 1], q = 1 - (f.time - p.t) / .7; c.strokeStyle = `rgba(150,219,207,${q * .32})`; c.lineWidth = q * 4; c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(p.x, p.y); c.stroke(); }
      this.ship(f.p.x, f.p.y, f.p.pitch, f.p.flap, t, .84, f.p.hurt, f.chassis, f);
    } else {
      const x = f.camera.x + this.w * (this.w / this.h < .8 ? .63 : .7), y = f.camera.y + this.h * (this.w / this.h < .8 ? .26 : .5) + Math.sin(t * .9) * 17;
      c.strokeStyle = '#e4d09e14'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, 145, 0, TAU); c.stroke(); c.beginPath(); c.arc(x, y, 184, -.7, 1.6); c.stroke();
      for (let i = 0; i < 26; i++) { const a = i * .5 + t * .2, r = 90 + i * 6; c.fillStyle = `rgba(204,222,202,${(i % 4) * .08})`; oval(c, x + Math.cos(a) * r, y + Math.sin(a) * r * .7, 1.5, 1.5); }
      this.ship(x, y, -.04 + Math.sin(t) * .018, .15, t, this.w / this.h < .8 ? 2 : 3.4, 0, f.chassis);
    }
    c.restore();
    const vg = c.createRadialGradient(this.w * .5, this.h * .5, this.h * .2, this.w * .5, this.h * .5, Math.max(this.w, this.h) * .75); vg.addColorStop(0, 'transparent'); vg.addColorStop(1, '#03071199'); c.fillStyle = vg; c.fillRect(0, 0, this.w, this.h);
    // World altitude markings make vertical camera motion readable.
    if (mode === 'playing') {
      c.fillStyle = '#c9e6dd44'; c.strokeStyle = '#b9d3ce24'; c.font = '9px ui-monospace, monospace';
      const start = Math.floor(f.camera.y / 100) * 100; for (let y = start; y < f.camera.y + this.h; y += 100) { const sy = y - f.camera.y; c.beginPath(); c.moveTo(this.w - 24, sy); c.lineTo(this.w - 14, sy); c.stroke(); c.textAlign = 'right'; c.fillText(`${-y}`, this.w - 29, sy + 3); }
      c.textAlign = 'left';
    }
  }
}
