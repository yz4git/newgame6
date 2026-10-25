import { clamp } from './model.mjs?v=lumen-2.1.0';
const TAU = Math.PI * 2;
const hash = (a, b = 0) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
const oval = (c, x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); };
function glow(c, x, y, r, color) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'transparent'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
function plate(c, points) { c.beginPath(); points.forEach(([x,y],i) => i ? c.lineTo(x,y) : c.moveTo(x,y)); c.closePath(); c.fill(); c.stroke(); }
const rgba = (hex, a) => { const n=parseInt(hex.slice(1),16); return `rgba(${n>>16},${n>>8&255},${n&255},${a})`; };
const mixHex = (a,b,t) => { const x=parseInt(a.slice(1),16),y=parseInt(b.slice(1),16),part=(shift)=>Math.round((x>>shift&255)*(1-t)+(y>>shift&255)*t); return `#${[16,8,0].map(s=>part(s).toString(16).padStart(2,'0')).join('')}`; };
const smooth = t => t*t*(3-2*t);
const ZONES = [
  {sky:['#070d1e','#172642','#30243c'],stars:'#dcebf1',haze:'#6488b5',planet:'#9aa8bc',accent:'#81d2d6',hazard:'#ffc17a',structure:'#779aae',rock:['#101a2b','#334459','#8293a1'],cloud:[['rgba(99,151,206,.18)','rgba(62,79,135,.16)'],['rgba(205,151,153,.12)','rgba(87,69,122,.15)']]},
  {sky:['#100d1a','#301d2a','#4d292d'],stars:'#ffe4c9',haze:'#a7575a',planet:'#bb8067',accent:'#ffad6b',hazard:'#7de1df',structure:'#a66059',rock:['#211620','#53333a','#d2936b'],cloud:[['rgba(228,126,96,.17)','rgba(105,46,60,.18)'],['rgba(184,102,122,.14)','rgba(78,44,79,.17)']]},
  {sky:['#061219','#102b36','#1d3542'],stars:'#d8f3e8',haze:'#388596',planet:'#769d99',accent:'#6de2d1',hazard:'#ffb27e',structure:'#5e9a9b',rock:['#141b27','#344553','#d6a27b'],cloud:[['rgba(74,174,165,.18)','rgba(33,76,91,.18)'],['rgba(90,138,175,.15)','rgba(34,56,87,.18)']]},
  {sky:['#0b091b','#211638','#40213c'],stars:'#fff0d4',haze:'#775095',planet:'#a58a9f',accent:'#ffba91',hazard:'#f4d18c',structure:'#8c6b9b',rock:['#171323','#40304a','#b08a78'],cloud:[['rgba(171,106,188,.17)','rgba(65,45,102,.19)'],['rgba(224,133,144,.13)','rgba(77,44,84,.17)']]}
];
function makeCloud(inner = 'rgba(79,124,158,.16)', middle = 'rgba(42,74,117,.17)', variant = 0) {
  const cv = document.createElement('canvas'); cv.width = 900; cv.height = 440; const c = cv.getContext('2d');
  for (let i = 0; i < 60; i++) { const x = 90 + hash(i+variant*7, 2) * 720, y = 190 + Math.sin(x / 900 * Math.PI) * -80 + hash(i, 3+variant) * 130, r = 50 + hash(i, 4+variant) * 110; const g = c.createRadialGradient(x, y - 30, 0, x, y, r); g.addColorStop(0, inner); g.addColorStop(.52, middle); g.addColorStop(1, 'transparent'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
  return cv;
}
export class Painter {
  constructor(canvas) { this.canvas = canvas; this.c = canvas.getContext('2d', { alpha: false }); this.clouds = ZONES.map(z=>z.cloud.map((pair,i)=>makeCloud(pair[0],pair[1],i))); this.atlas=null; this.frames=null; this.flashes={}; this.trail = []; this.lastTrail = 0; this.width = 1100; this.height = 640; this.dpr = 1; this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; }
  async loadAssets() {
    const [data,img]=await Promise.all([fetch('./assets/mech-atlas-v2.json?v=lumen-2.1.0').then(r=>{if(!r.ok)throw Error('atlas metadata');return r.json();}),new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src='./assets/mech-atlas-v2.webp?v=lumen-2.1.0';})]);
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
    const c = this.c, w = this.w, h = this.h;
    const phase=Math.min(3,Math.floor(stageTime/40)),progress=phase?smooth(Math.max(0,Math.min(1,(stageTime-phase*40)/8))):1,previous=ZONES[Math.max(0,phase-1)],zone=ZONES[phase];
    const tone=(key,i=0)=>{const a=Array.isArray(previous[key])?previous[key][i]:previous[key],b=Array.isArray(zone[key])?zone[key][i]:zone[key];return phase?mixHex(a,b,progress):b;};
    const sky0=tone('sky',0),sky1=tone('sky',1),sky2=tone('sky',2),accent=tone('accent'),structure=tone('structure'),planet=tone('planet'),stars=tone('stars'),haze=tone('haze');
    const g = c.createLinearGradient(0, 0, w * .8, h); g.addColorStop(0, sky0); g.addColorStop(.44, sky1); g.addColorStop(1, sky2); c.fillStyle = g; c.fillRect(0, 0, w, h);
    glow(c, w * .78, h * .38, h * .8, rgba(haze,.13)); glow(c, w * .15, h * .7, h * .7, rgba(accent,.075));
    for (let layer = 0; layer < 2; layer++) {
      const parallax = layer ? .13 : .035, step = layer ? 340 : 220;
      const sx = Math.floor(camera.x * parallax / step), sy = Math.floor(camera.y * parallax / step);
      for (let ix = sx - 1; ix < sx + w / step + 2; ix++) for (let iy = sy - 1; iy < sy + h / step + 2; iy++) for (let k = 0; k < 7; k++) {
        const x = ix * step + hash(ix * 9 + k, iy) * step - camera.x * parallax, y = iy * step + hash(ix, iy * 8 + k) * step - camera.y * parallax;
        const a = .2 + hash(ix + k, iy) * .45 + Math.sin(t * .5 + k) * .08;
        c.fillStyle = rgba(stars,a); const r = .5 + hash(ix * 5 + k, iy) * .9; oval(c, x, y, r, r);
        if (k === 1 && layer) { c.strokeStyle = rgba(accent,a*.55); c.lineWidth = .6; c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x + 4, y); c.moveTo(x, y - 4); c.lineTo(x, y + 4); c.stroke(); }
      }
    }
    const mx = w * .76 - Math.sin(camera.x * .00009) * 34, my = h * (w / h < .8 ? .14 : .23) - Math.sin(camera.y * .00012) * 42, radius=Math.min(205,h*.235);
    c.save(); c.translate(mx,my); c.rotate(-.18);
    c.strokeStyle=rgba(accent,.16);c.lineWidth=8;c.beginPath();c.ellipse(0,0,radius*1.42,radius*.56,0,Math.PI*1.08,Math.PI*1.92);c.stroke();
    glow(c,0,0,radius*1.55,rgba(planet,.10));
    const pg=c.createLinearGradient(-radius,-radius,radius,radius);pg.addColorStop(0,rgba(planet,.35));pg.addColorStop(.5,rgba(planet,.17));pg.addColorStop(1,rgba(sky0,.55));
    c.fillStyle=pg;c.strokeStyle=rgba(planet,.28);c.lineWidth=1.2;c.beginPath();c.ellipse(0,0,radius*1.08,radius*.72,0,0,TAU);c.fill();c.stroke();
    c.save();c.beginPath();c.ellipse(0,0,radius*1.08,radius*.72,0,0,TAU);c.clip();
    for(let i=0;i<5;i++){const yy=(i-2)*radius*.22;c.strokeStyle=rgba(i%2?accent:stars,.045+i*.009);c.lineWidth=3+i%2;c.beginPath();c.ellipse(0,yy,radius*1.04,radius*.62,0,Math.PI*.08,Math.PI*.94);c.stroke();}
    c.restore();c.strokeStyle=rgba(accent,.22);c.lineWidth=1.2;c.beginPath();c.ellipse(0,0,radius*1.08,radius*.72,0,Math.PI*.03,Math.PI*.94);c.stroke();c.restore();
    for (let layer = 0; layer < 2; layer++) {
      const speed = layer ? .24 : .09, tw = 750, th = 620, ox = camera.x * speed, oy = camera.y * speed;
      for (let ix = Math.floor(ox / tw) - 1; ix < (ox + w) / tw + 1; ix++) for (let iy = Math.floor(oy / th) - 1; iy < (oy + h) / th + 1; iy++) {
        const x = ix * tw - ox + hash(ix, iy) * 80, y = iy * th - oy + hash(ix + 1, iy) * 240;
        const cloud=this.clouds[phase][(ix+iy)&1],oldCloud=this.clouds[Math.max(0,phase-1)][(ix+iy)&1],opacity=layer?.76:.48;
        if(phase){c.globalAlpha=opacity*(1-progress);c.drawImage(oldCloud,x-50,y-70,930,455);}
        c.globalAlpha=opacity*(phase?progress:1);c.drawImage(cloud,x-50,y-70,930,455);
      }
      c.globalAlpha = 1;
    }
    // Huge stage silhouettes scroll more slowly than the flight lane, like a painted arcade backdrop.
    const spacing = 600, farX = camera.x * .19, farY = camera.y * .18;
    for (let ix = Math.floor(farX / spacing) - 1; ix < (farX + w) / spacing + 1; ix++) {
      const by = Math.floor(farY / 620);
      for (let iy = by; iy <= by + 1; iy++) { const x = ix * spacing - farX + hash(ix, iy) * 160, y = iy * 620 - farY + 230 + hash(iy, ix) * 360; this.ruin(c, x, y, .88 + hash(ix, iy) * .54, ix*13+iy, structure, phase); }
    }
    for(let i=0;i<18;i++){const x=((hash(i,phase+2)*w-camera.x*.43+t*(15+i%4*5))%(w+50)+w+50)%(w+50)-25,y=hash(i,phase+7)*h-camera.y*.14%h;c.strokeStyle=rgba(i%3?stars:accent,.12);c.lineWidth=.6+hash(i,4);c.beginPath();c.moveTo(x,y);c.lineTo(x-11-hash(i,5)*20,y+2);c.stroke();}
    c.strokeStyle = '#c7d7e406'; c.lineWidth = 1;
    for (let y = 0; y < h; y += 6) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  }
  ruin(c,x,y,scale,seed,accent='#779aae',phase=0){
    c.save();c.translate(x,y);c.scale(scale,scale);const kind=Math.floor(hash(seed,phase+17)*3),body='#070d18d6',energy=ZONES[phase]?.accent||accent;c.fillStyle=body;c.strokeStyle=rgba(accent,.44);c.lineWidth=1.15;
    if(phase===1){
      plate(c,[[-256,28],[-215,-18],[-174,1],[-148,-182],[-120,-216],[-87,-11],[-28,-31],[-3,-270],[24,-307],[61,-9],[117,-37],[151,-171],[181,-199],[207,3],[257,30],[178,52],[-187,48]]);
      c.strokeStyle=rgba(energy,.3);c.lineWidth=1.3;
      for(const [sx,top,dx]of[[-151,-168,15],[-104,-2,-24],[-1,-242,19],[43,-44,-26],[157,-151,19]]){c.beginPath();c.moveTo(sx,top);c.lineTo(sx+dx,top+48);c.lineTo(sx-dx*.4,top+89);c.lineTo(sx+dx*.7,top+142);c.lineTo(sx+dx*.2,17);c.stroke();}
      c.strokeStyle=rgba(energy,.22);c.lineWidth=7;c.beginPath();c.moveTo(-215,20);c.lineTo(-164,3);c.lineTo(-127,16);c.lineTo(-80,0);c.moveTo(76,18);c.lineTo(123,3);c.lineTo(167,18);c.lineTo(208,1);c.stroke();
    }else if(phase===2){
      plate(c,[[-250,14],[-185,-24],[-82,-25],[-43,-53],[55,-53],[92,-20],[196,-22],[255,14],[204,42],[-200,42]]);
      c.strokeStyle=rgba(accent,.5);c.lineWidth=6;c.beginPath();c.ellipse(0,-90,151,78,-.06,Math.PI*1.04,Math.PI*1.98);c.stroke();c.lineWidth=2;c.beginPath();c.ellipse(0,-90,119,60,-.06,Math.PI*1.04,Math.PI*1.98);c.stroke();
      for(let i=-3;i<=3;i++){const px=i*43;c.fillStyle=rgba(energy,.48);c.fillRect(px-4,-18-Math.abs(i)*4,8,7);c.strokeStyle=rgba(accent,.28);c.beginPath();c.moveTo(px,-24);c.lineTo(px,-105-Math.abs(i)*8);c.stroke();}
      c.strokeStyle=rgba(accent,.34);c.lineWidth=1.3;c.beginPath();c.moveTo(-232,4);c.lineTo(-172,-105);c.lineTo(-96,-105);c.moveTo(231,6);c.lineTo(171,-105);c.lineTo(96,-105);c.stroke();
    }else if(phase===3){
      plate(c,[[-260,24],[-219,-15],[-165,7],[-145,-216],[-115,-238],[-82,-12],[-46,-48],[-17,-315],[12,-342],[44,-40],[78,-14],[110,-218],[140,-240],[169,5],[219,-16],[259,23],[180,45],[-193,47]]);
      c.strokeStyle=rgba(accent,.46);c.lineWidth=3;c.beginPath();c.ellipse(0,-118,107,83,0,Math.PI*1.04,Math.PI*1.96);c.stroke();c.lineWidth=1.3;c.beginPath();c.ellipse(0,-118,79,62,0,Math.PI*1.04,Math.PI*1.96);c.stroke();
      c.strokeStyle=rgba(energy,.24);c.lineWidth=1.5;for(const sx of [-188,-128,-65,65,128,188]){c.beginPath();c.moveTo(sx,22);c.lineTo(sx*.76,-115);c.lineTo(sx*.62,-220);c.stroke();}
    }else if(kind===0){
      plate(c,[[-210,-10],[-132,-44],[130,-38],[214,5],[164,30],[-165,28]]);
      for(const [px,top,width] of [[-142,-168,27],[-66,-115,32],[48,-194,36],[132,-126,28]]){c.fillRect(px,top,width,top*-1-18);c.strokeRect(px,top,width,top*-1-18);c.fillRect(px-9,top,width+18,6);}
      c.beginPath();c.ellipse(0,-62,95,43,-.09,Math.PI,TAU);c.stroke();c.beginPath();c.ellipse(0,-62,78,31,-.09,Math.PI,TAU);c.stroke();
      c.beginPath();c.moveTo(-182,8);c.lineTo(-135,-82);c.lineTo(-65,-82);c.moveTo(183,8);c.lineTo(129,-91);c.lineTo(71,-91);c.stroke();
    }else if(kind===1){
      plate(c,[[-172,12],[-106,-14],[-50,-6],[4,-42],[85,-40],[174,13],[124,39],[-138,35]]);
      for(const [px,top,width] of [[-132,-117,32],[-47,-205,40],[76,-146,36],[132,-95,24]]){c.fillRect(px,top,width,-top+5);c.strokeRect(px,top,width,-top+5);c.beginPath();c.moveTo(px-13,top+13);c.lineTo(px+width/2,top-14);c.lineTo(px+width+13,top+13);c.stroke();}
      c.beginPath();c.ellipse(14,-82,84,34,.13,Math.PI*1.03,Math.PI*1.98);c.stroke();
    }else{
      plate(c,[[-190,10],[-108,-36],[-38,-22],[0,-56],[76,-24],[155,-38],[204,13],[128,36],[-148,31]]);
      for(let i=0;i<7;i++){const px=-135+i*42,top=-65-hash(i,seed)*110;c.beginPath();c.moveTo(px-18,-20);c.lineTo(px,top);c.lineTo(px+19,-20);c.closePath();c.fill();c.stroke();}
      c.beginPath();c.moveTo(-184,4);c.lineTo(-72,-93);c.lineTo(14,-24);c.lineTo(116,-114);c.lineTo(190,9);c.stroke();
    }
    c.strokeStyle=rgba(energy,.64);c.lineWidth=1.4;
    for(let i=0;i<8;i++){const px=-112+i*32,py=12-hash(i,seed+3)*5;c.fillStyle=rgba(energy,.48+hash(i,seed+4)*.34);c.fillRect(px,py,8,2);}
    c.strokeStyle=rgba(accent,.26);c.lineWidth=.9;
    for(let side of [-1,1]){c.beginPath();c.moveTo(side*195,10);c.lineTo(side*236,26);c.lineTo(side*270,18);c.stroke();}
    c.restore();
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
  rock(r,t=0) {
    const c=this.c,z=ZONES[r.theme??0],warning=z.hazard,tones=z.rock,pulse=.58+.2*Math.sin(t*3.2+r.phase);c.save();c.translate(r.x,r.y);
    const inner=r.side<0?r.ry*.88:-r.ry*.88;glow(c,0,inner,46,rgba(warning,.2));
    const g=c.createLinearGradient(-r.rx,0,r.rx,0);g.addColorStop(0,tones[0]);g.addColorStop(.38,tones[1]);g.addColorStop(1,tones[2]);c.fillStyle=g;c.strokeStyle=rgba(warning,.38);c.lineWidth=1.4;
    const points=Array.from({length:18},(_,i)=>{const a=i/18*TAU,n=.9+hash(i,r.phase)*.1;return [Math.cos(a)*r.rx*n,Math.sin(a)*r.ry*n];});
    const trace=()=>{c.beginPath();points.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();};
    trace();c.fill();c.save();c.clip();c.strokeStyle=rgba(warning,.08);
    c.fillStyle=rgba('#e3e4d2',.085);plate(c,[[-r.rx*.9,-r.ry*.76],[-r.rx*.34,-r.ry*.94],[r.rx*.08,-r.ry*.2],[-r.rx*.28,r.ry*.1]]);
    c.fillStyle=rgba('#030812',.21);plate(c,[[r.rx*.1,-r.ry*.12],[r.rx*.9,-r.ry*.7],[r.rx*.82,r.ry*.54],[r.rx*.28,r.ry*.88],[-r.rx*.04,r.ry*.25]]);
    c.strokeStyle=rgba(warning,.23);c.lineWidth=1.2;c.beginPath();c.moveTo(-r.rx*.72,-r.ry*.42);c.lineTo(-r.rx*.1,-r.ry*.08);c.lineTo(-r.rx*.33,r.ry*.36);c.lineTo(r.rx*.36,r.ry*.56);c.moveTo(r.rx*.5,-r.ry*.76);c.lineTo(r.rx*.08,-r.ry*.3);c.lineTo(r.rx*.28,r.ry*.08);c.stroke();
    for(let i=0;i<7;i++){const yy=(i-3)*r.ry*.22,xx=-r.rx*.72+hash(i,r.phase+2)*r.rx*1.35;c.fillStyle=rgba(i%2?warning:'#f5c883',.24+hash(i,r.phase+3)*.26);c.fillRect(xx,yy,4+hash(i,8)*5,1.6);}
    if(r.variant===1){c.strokeStyle=rgba('#d8fff6',.2);c.lineWidth=2;c.beginPath();c.moveTo(-r.rx*.5,-r.ry*.15);c.lineTo(-r.rx*.08,-r.ry*.74);c.lineTo(r.rx*.48,-r.ry*.3);c.stroke();}
    if(r.variant===2){c.strokeStyle=rgba(warning,.28);c.lineWidth=3;c.beginPath();c.moveTo(-r.rx*.8,r.ry*.12);c.lineTo(r.rx*.66,-r.ry*.52);c.stroke();}
    c.restore();trace();c.strokeStyle=rgba(warning,.43+pulse*.18);c.lineWidth=1.8;c.stroke();
    c.strokeStyle=rgba(warning,pulse*.9);c.lineWidth=2.2;c.beginPath();c.moveTo(-r.rx*.58,inner);c.lineTo(r.rx*.58,inner);c.stroke();
    c.fillStyle=rgba('#ffe2a5',pulse*.9);for(let i=0;i<4;i++)oval(c,-r.rx*.42+i*r.rx*.28,inner,1.7,1.7);
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
