import {arcadeArtStatus} from './arcade-art.mjs?v=lumen-4.2.0';
import {paintRichScenery,materialStatus} from './stage-materials.mjs?v=lumen-4.2.0';
// LUMEN WING v2.2 — deterministic, asset-free five-sector scenic renderer.
// All visual geometry is screen-space and non-colliding; Flight remains authoritative.
export const STAGES = Object.freeze([
  {id:'helios',name:'HELIOS RELIC',ja:'人工恒星の残骸',sky:['#090d1c','#1d2338','#433041'],ink:'#101827',light:'#ffba6f',accent:'#ffd18d'},
  {id:'nacre',name:'NACRE GARDEN',ja:'星海の珊瑚庭園',sky:['#061c22','#12323e','#193f47'],ink:'#092329',light:'#72eadb',accent:'#b3f8e5'},
  {id:'prism',name:'PRISM GRAVE',ja:'結晶の墓標',sky:['#0c102b','#18274c','#38284f'],ink:'#101b35',light:'#94baff',accent:'#d4baff'},
  {id:'forge',name:'EMBER FORGE',ja:'星火の溶鉱炉',sky:['#140d18','#402029','#4a2831'],ink:'#1d151d',light:'#ff9464',accent:'#ffd29d'},
  {id:'citadel',name:'IRON CHOIR',ja:'機械聖堂',sky:['#050d1c','#16223a','#1d3444'],ink:'#0a1424',light:'#65cce4',accent:'#a8eaff'}
]);
export const SECTOR_SECONDS=30;
// Product-art backdrops: 1800x1000 self-contained scene paintings, no CDN or fonts.
const artImages = Array(STAGES.length).fill(null);
const artFailures = new Set();
export const stageArtStatus=()=>{const mats=arcadeArtStatus();return {loaded:mats.loaded,total:mats.total,failed:artFailures.size,legacy:artImages.filter(img=>img?.complete&&img?.naturalWidth>0).length};};
let artLoad = null;
export function preloadStageArt(){
  if(typeof Image==='undefined')return Promise.resolve(false);
  if(artLoad)return artLoad;
  artLoad=Promise.all(STAGES.map((stage,i)=>new Promise(resolve=>{
    const img=new Image();img.decoding='async';
    img.onload=()=>{artImages[i]=img;artFailures.delete(stage.id);resolve(true);};
    img.onerror=()=>{artFailures.add(stage.id);resolve(false);}; // Canvas fallback.
    img.src=new URL('./assets/scene-'+stage.id+'.svg?v=lumen-4.2.0',import.meta.url).href;
  })));
  return artLoad;
}
function paintArtPlate(c,w,h,cam,sector){
  const img=artImages[sector];if(!img||!img.complete||!img.naturalWidth)return false;
  const scale=Math.max(w/1800,h/1000)*1.07,dw=1800*scale,dh=1000*scale;
  const dx=(w-dw)*.5+Math.sin(cam.x*.00036)*Math.min(22,w*.025);
  const dy=(h-dh)*.5+Math.sin(cam.y*.00028)*Math.min(20,h*.027);
  c.save();c.globalAlpha=.32;
  let rendered=true;
  try{c.drawImage(img,dx,dy,dw,dh);}
  catch(error){artFailures.add(STAGES[sector].id);artImages[sector]=null;rendered=false;}
  finally{c.restore();}
  return rendered;
}

export const stageIndex=t=>Math.max(0,Math.min(STAGES.length-1,Math.floor(Math.max(0,t)/SECTOR_SECONDS)));
const TAU=Math.PI*2;
const fract=x=>x-Math.floor(x);
const rnd=(a,b=0)=>fract(Math.sin(a*127.1+b*311.7)*43758.5453123);
const lerp=(a,b,t)=>a+(b-a)*t;
const smooth=t=>{t=Math.max(0,Math.min(1,t));return t*t*(3-2*t);};
const path=(c,p,closed=true)=>{c.beginPath();p.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));if(closed)c.closePath();};
const ellipse=(c,x,y,rx,ry)=>{c.beginPath();c.ellipse(x,y,Math.max(.1,rx),Math.max(.1,ry),0,0,TAU);};
const flare=(c,x,y,r,color,strength=.2)=>{
  const g=c.createRadialGradient(x,y,0,x,y,Math.max(2,r));
  g.addColorStop(0,color);g.addColorStop(.14,color);g.addColorStop(1,'transparent');
  c.save();c.globalAlpha=strength;c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();
};
function starfield(c,w,h,cam,t,theme){
  for(const [factor,cell,count,size] of [[.018,190,5,.95],[.084,245,5,1.3]]){
    const bx=cam.x*factor,by=cam.y*factor,sx=Math.floor(bx/cell),sy=Math.floor(by/cell);
    for(let ix=sx-1;ix<=sx+Math.ceil(w/cell)+1;ix++)for(let iy=sy-1;iy<=sy+Math.ceil(h/cell)+1;iy++)
      for(let k=0;k<count;k++){
        const key=ix*79+iy*103+k*19;
        const x=ix*cell+rnd(key,3)*cell-bx,y=iy*cell+rnd(key,7)*cell-by;
        const a=.23+rnd(key,13)*.48+.11*Math.sin(t*.95+key);
        c.globalAlpha=Math.max(.08,a);c.fillStyle=(k===0?theme.accent:'#dae9fb');
        const r=(.35+rnd(key,1)*size);c.fillRect(x,y,r,r);
        if(k===0&&rnd(key,4)>.76){c.globalAlpha=a*.38;c.fillRect(x-3,y,7,.6);c.fillRect(x,y-3,.6,7);}
      }
  }
  c.globalAlpha=1;
}
function ambience(c,w,h,cam,t,theme){
  const sky=c.createLinearGradient(0,0,w*.85,h);theme.sky.forEach((s,i)=>sky.addColorStop(i/2,s));c.fillStyle=sky;c.fillRect(0,0,w,h);
  for(let i=0;i<5;i++){
    const x=w*(.12+.18*i)+Math.sin(t*.09+i)*27-cam.x*.005;
    const y=h*(.15+.18*(i%3))-cam.y*.004;
    flare(c,x,y,h*(.42+(i%3)*.13),i%2?theme.accent:theme.light,.065);
  }
  starfield(c,w,h,cam,t,theme);
}
function repeatLandmarks(c,w,h,cam,spacing,velocity,vertical,draw){
  const ox=cam.x*velocity,oy=cam.y*vertical,cellY=h*.83;
  const rowStart=Math.floor(oy/cellY);
  for(let ix=Math.floor(ox/spacing)-1;ix<=Math.floor((ox+w)/spacing)+1;ix++){
    const x=ix*spacing-ox;
    for(let row=rowStart-1;row<=rowStart+2;row++) {
      const y=row*cellY-oy;
      draw(x+rnd(ix,row)*spacing*.32,y,ix*7+row*11,ix,row);
    }
  }
}
function sun(c,x,y,r,t){
  flare(c,x,y,r*2.7,'#ff7d32',.16);
  for(let i=0;i<24;i++){
    const a=i*TAU/24+t*.006+Math.sin(i*3)*.13;
    const r1=r*(1.02+rnd(i,3)*.07),r2=r*(1.2+rnd(i,9)*.55);
    c.strokeStyle=i%3===0?'#ff9b5980':'#c95c4c40';c.lineWidth=1+i%3;
    c.beginPath();c.moveTo(x+Math.cos(a)*r1,y+Math.sin(a)*r1);
    c.quadraticCurveTo(x+Math.cos(a+.1)*r2,y+Math.sin(a+.1)*r2,
      x+Math.cos(a+.22)*r1,y+Math.sin(a+.22)*r1);c.stroke();
  }
  const disc=c.createRadialGradient(x-r*.18,y-r*.22,r*.06,x,y,r);
  disc.addColorStop(0,'#fff1bc');disc.addColorStop(.38,'#ffcb73');disc.addColorStop(.76,'#dc754e');disc.addColorStop(1,'#612d3d');
  c.fillStyle=disc;ellipse(c,x,y,r,r);c.fill();
  c.save();ellipse(c,x,y,r,r);c.clip();
  for(let i=0;i<26;i++){
    const px=x+(rnd(i,2)-.5)*r*1.8,py=y+(rnd(i,6)-.5)*r*1.8;
    c.strokeStyle='rgba(255,249,194,'+(.13+rnd(i,7)*.2)+')';c.lineWidth=1+rnd(i,9)*3;
    c.beginPath();c.arc(px,py,r*(.08+rnd(i,4)*.23),rnd(i,8)*3,3.8+rnd(i,2)*2);c.stroke();
  }
  c.restore();
  c.strokeStyle='#ffe9a54a';c.lineWidth=Math.max(1,r*.025);c.beginPath();c.arc(x,y,r*1.12,t*.015,t*.015+4.7);c.stroke();
}
function solar(c,w,h,cam,t,reduce){
  const r=Math.min(h*.3,w*.24),x=w*.78-cam.x*.013,y=h*.27-cam.y*.009;
  sun(c,x,y,r,t);
  const fl=c.createLinearGradient(0,h*.2,0,h);fl.addColorStop(0,'#ffad4b00');fl.addColorStop(1,'#ee69301d');c.fillStyle=fl;c.fillRect(0,0,w,h);
  repeatLandmarks(c,w,h,cam,550,.14,.08,(x,y,seed)=>{
    const scale=.67+rnd(seed,2)*.45,py=y+h*.55;
    c.save();c.translate(x,py);c.scale(scale,scale);
    c.fillStyle='#111a2bdc';c.strokeStyle='#d7a07277';c.lineWidth=2;
    path(c,[[-190,28],[-149,-33],[-66,-60],[-40,-30],[68,-46],[151,-16],[204,39],[115,67],[-128,67]]);c.fill();c.stroke();
    c.strokeStyle='#f6b77e44';c.lineWidth=6;c.beginPath();c.ellipse(0,-42,149,56,-.17,Math.PI,TAU);c.stroke();
    for(let i=-3;i<=3;i++){
      const bx=i*43,top=-87-Math.abs(i)*12-rnd(seed,i)*30;
      c.fillStyle=i%2?'#293244':'#1c2739';c.fillRect(bx-14,top,28,-top+38);
      c.strokeStyle='#dfa66b77';c.strokeRect(bx-14,top,28,-top+38);
      c.fillStyle='#ffca8b90';c.fillRect(bx-7,top+12,14,3);
    }
    c.restore();
  });
  for(let i=0;i<9;i++){
    const xx=fract(rnd(i,3)+t*(.004+rnd(i,5)*.008))*w;
    const yy=fract(rnd(i,4)+t*.005)*h;
    flare(c,xx,yy,10+rnd(i,8)*17,'#ffb36e',.1);
  }
}
function coralShape(c,x,y,size,flip,seed,t,theme){
  c.save();c.translate(x,y);c.scale(size,flip*size);
  const arms=5+seed%3,ang=Math.sin(t*.35+seed)*.05;
  c.fillStyle='#102f38d9';c.strokeStyle='#4da69d88';c.lineWidth=2;
  c.beginPath();c.moveTo(-72,110);
  for(let j=0;j<arms;j++){
    const px=-95+j*37,yy=-74-rnd(seed,j)*150;
    c.lineTo(px-21,12);c.quadraticCurveTo(px-19,yy+54,px+Math.sin(ang+j)*22,yy);
    c.quadraticCurveTo(px+28,yy-18,px+24,yy+37);c.lineTo(px+26,5);
  }
  c.lineTo(106,110);c.closePath();c.fill();c.stroke();
  c.strokeStyle='#87e9ca88';c.lineWidth=2;
  for(let k=0;k<arms;k++){
    const xx=-79+k*37,ty=-55-rnd(seed,k)*145;
    c.beginPath();c.moveTo(xx,54);c.bezierCurveTo(xx+22,ty*.55,xx-20,ty*.8,xx+12,ty+18);c.stroke();
    flare(c,xx+12,ty+18,14,'#b8ffe3',.09);
  }
  c.restore();
}
function nacre(c,w,h,cam,t,reduce){
  flare(c,w*.65,h*.45,h*.68,'#51cfb6',.13);
  // An ancient illuminated membrane, not the same skyline as the solar relic.
  c.save();c.translate(w*.67-cam.x*.015,h*.3-cam.y*.014);
  for(let j=0;j<7;j++){
    const r=74+j*29;c.strokeStyle='rgba(137,239,211,'+(.19-j*.022)+')';c.lineWidth=2+j*.7;
    c.beginPath();c.ellipse(0,0,r,r*.48,.3,Math.PI*.1,Math.PI*1.9);c.stroke();
  }
  c.fillStyle='#23505b9b';ellipse(c,0,0,78,49);c.fill();
  flare(c,0,0,95,'#bbfff1',.12);
  c.restore();
  repeatLandmarks(c,w,h,cam,320,.17,.16,(x,y,seed,ix,row)=>{
    const flip=((row+Math.floor(cam.y*.16/(h*.83)))%2===0)?1:-1;
    coralShape(c,x,y+(flip>0?h*.65:h*.18),.55+rnd(seed,4)*.49,flip,seed,t,STAGES[1]);
  });
  repeatLandmarks(c,w,h,cam,510,.28,.19,(x,y,seed)=>{
    const xx=x+120,cy=y+h*.41,rr=22+rnd(seed,3)*25;
    c.fillStyle='#142d3c8c';ellipse(c,xx,cy,rr,rr*.7);c.fill();
    c.strokeStyle='#8beaca6b';c.lineWidth=1.8;ellipse(c,xx,cy,rr*1.14,rr*.86);c.stroke();
    for(let j=0;j<6;j++){const angle=j*TAU/6+t*.12;c.beginPath();c.moveTo(xx,cy);c.lineTo(xx+Math.cos(angle)*rr*.85,cy+Math.sin(angle)*rr*.58);c.stroke();}
    flare(c,xx,cy,rr*1.4,'#97ffe0',.09);
  });
}
function shard(c,x,y,r,angle,seed,alpha=1){
  c.save();c.translate(x,y);c.rotate(angle);c.globalAlpha*=alpha;
  const tip=-r,base=r*.62,wide=r*(.2+rnd(seed,4)*.13);
  c.fillStyle='#1d355a';c.strokeStyle='#a0dbff88';c.lineWidth=1.3;
  path(c,[[0,tip],[wide,-r*.17],[wide*.43,base],[0,r*.84],[-wide*.9,r*.43],[-wide*.67,-r*.3]]);c.fill();c.stroke();
  c.fillStyle='#779efc48';path(c,[[0,tip],[wide,-r*.17],[wide*.43,base],[0,r*.84]]);c.fill();
  c.fillStyle='#d3e4ff24';path(c,[[0,tip],[-wide*.67,-r*.3],[0,r*.84]]);c.fill();
  c.strokeStyle='#dbdcffb0';c.lineWidth=1;c.beginPath();c.moveTo(0,tip);c.lineTo(0,r*.84);c.stroke();
  flare(c,0,-r*.38,r*.17,'#c2dfff',.11);
  c.restore();
}
function prism(c,w,h,cam,t,reduce){
  const bx=w*.73-cam.x*.011,by=h*.24-cam.y*.011;
  flare(c,bx,by,h*.62,'#7789ed',.18);
  c.save();c.translate(bx,by);c.rotate(.24);
  c.strokeStyle='#acbaff43';c.lineWidth=4;for(let i=0;i<4;i++){c.beginPath();c.ellipse(0,0,85+i*39,49+i*21,0,Math.PI*.1,Math.PI*1.88);c.stroke();}
  shard(c,0,0,105,.35,42,.65);c.restore();
  repeatLandmarks(c,w,h,cam,340,.16,.13,(x,y,seed,ix,row)=>{
    const yy=y+h*.39;for(let j=0;j<4;j++){
      const size=54+rnd(seed,j)*104,angle=(rnd(seed,j+10)-.5)*1.6+(j%2?.8:0);
      shard(c,x+j*43,yy+(j%2?80:-65),size,angle,seed*7+j,.45+j*.1);
    }
  });
  // Refraction streaks make this scene optically distinct.
  c.lineWidth=1;for(let j=0;j<11;j++){
    const xx=fract(rnd(j,7)-cam.x*(.00006+j*.000006))*w;
    const yy=fract(rnd(j,9)-cam.y*.00007)*h;
    c.strokeStyle=j%2?'#8bb9fb35':'#b9a7ff30';
    c.beginPath();c.moveTo(xx-35,yy+75);c.lineTo(xx+7,yy-65);c.stroke();
    if(!reduce&&j%3===0)flare(c,xx,yy,18,'#d7e6ff',.12+.04*Math.sin(t*2+j));
  }
}
function chimney(c,x,y,size,seed){
  c.save();c.translate(x,y);c.scale(size,size);
  c.fillStyle='#181b28';c.strokeStyle='#b36e587a';c.lineWidth=1.5;
  path(c,[[-140,115],[-134,-88],[-95,-117],[-71,-32],[-26,-53],[-19,-205],[25,-227],[40,-55],[95,-72],[127,0],[150,115]]);c.fill();c.stroke();
  for(let k=0;k<4;k++){
    const px=-118+k*67,hh=65+Math.abs(k-1.5)*24;
    c.fillStyle='#2b2731';c.fillRect(px,-hh,29,hh+105);
    c.strokeStyle='#be795fa0';c.strokeRect(px,-hh,29,hh+105);
    c.fillStyle='#e4896685';c.fillRect(px+6,-hh+10,18,4);
    c.strokeStyle='#efc09057';c.beginPath();c.moveTo(px+7,22);c.lineTo(px+22,22);c.stroke();
  }
  c.strokeStyle='#ef9c5e5a';c.lineWidth=8;c.beginPath();c.moveTo(-146,72);c.lineTo(-69,72);c.lineTo(-34,45);c.lineTo(29,45);c.lineTo(94,72);c.lineTo(154,72);c.stroke();
  c.restore();
}
function forge(c,w,h,cam,t,reduce){
  const fx=w*.77-cam.x*.014,fy=h*.39-cam.y*.01;
  flare(c,fx,fy,h*.7,'#ff6f3b',.16);
  c.fillStyle='#ff764c18';const gg=c.createLinearGradient(0,h*.38,0,h);gg.addColorStop(0,'#e35b2500');gg.addColorStop(1,'#d65f3d29');c.fillStyle=gg;c.fillRect(0,0,w,h);
  c.save();c.translate(fx,fy);
  for(let r=195;r>35;r-=27){
    c.lineWidth=r%2?7:4;c.strokeStyle='rgba(255,148,86,'+(.12+(195-r)/900)+')';
    c.beginPath();c.arc(0,0,r,t*.032+r*.009,t*.032+r*.009+Math.PI*1.46);c.stroke();
  }
  c.fillStyle='#211924';ellipse(c,0,0,73,73);c.fill();flare(c,0,0,72,'#ffca93',.12);
  c.restore();
  repeatLandmarks(c,w,h,cam,365,.2,.13,(x,y,seed)=>{
    chimney(c,x+110,y+h*.56,.7+rnd(seed,2)*.35,seed);
  });
  for(let j=0;j<34;j++){
    const xx=fract(rnd(j,7)+t*(.005+rnd(j,2)*.005)-cam.x*.0001)*w;
    const yy=fract(rnd(j,1)-t*(.03+rnd(j,4)*.04)-cam.y*.00008)*h;
    c.fillStyle=j%3?'#ffbc7e66':'#ff785b80';c.fillRect(xx,yy,1.2+rnd(j,9)*2,2+rnd(j,8)*5);
  }
}
function modulePanel(c,x,y,scale,seed,t){
  c.save();c.translate(x,y);c.scale(scale,scale);
  c.fillStyle='#102035e8';c.strokeStyle='#4e94b3aa';c.lineWidth=2;
  path(c,[[-160,112],[-142,-113],[-103,-153],[-72,-152],[-60,-52],[52,-52],[63,-184],[110,-184],[143,-63],[157,112]]);c.fill();c.stroke();
  c.fillStyle='#28364d';c.fillRect(-130,-28,265,14);
  c.strokeStyle='#8bd6e46b';c.strokeRect(-131,-29,267,16);
  for(let k=0;k<6;k++){
    const xx=-104+k*42,yy=-90-(k%3)*24;
    c.fillStyle='#162941';c.fillRect(xx,yy,30,86);
    c.strokeStyle='#5cb5ce77';c.strokeRect(xx,yy,30,86);
    c.fillStyle=(k+seed)%3?'#61c6dd79':'#d2e7d666';c.fillRect(xx+5,yy+10,20,3);
    c.fillStyle='#aeeaff80';c.fillRect(xx+4,yy+51,3,9);
  }
  c.strokeStyle='#7fcce6a0';c.lineWidth=1;
  for(let k=0;k<4;k++){const xx=-96+k*64;c.beginPath();c.moveTo(xx,88);c.lineTo(xx+21,40);c.lineTo(xx+16,-12);c.stroke();}
  c.restore();
}
function citadel(c,w,h,cam,t,reduce){
  const cx=w*.72-cam.x*.009,cy=h*.25-cam.y*.009;
  flare(c,cx,cy,h*.53,'#58b8f4',.16);
  c.save();c.translate(cx,cy);c.rotate(-.17);
  for(let r=90;r<=250;r+=27){
    c.strokeStyle='rgba(116,204,232,'+(.26-(r-90)*.0007)+')';c.lineWidth=r%2?3:5;
    c.beginPath();c.arc(0,0,r,t*.025+r*.006,t*.025+r*.006+4.9);c.stroke();
  }
  for(let j=0;j<12;j++){const a=j*TAU/12+t*.03,r=150;c.fillStyle='#b9f4e59e';c.fillRect(Math.cos(a)*r,Math.sin(a)*r,5,3);}
  c.fillStyle='#1c3754';ellipse(c,0,0,62,62);c.fill();flare(c,0,0,62,'#8cecf0',.2);c.restore();
  repeatLandmarks(c,w,h,cam,300,.12,.13,(x,y,seed)=>modulePanel(c,x+110,y+h*.54,.7+rnd(seed,4)*.3,seed,t));
  c.strokeStyle='#87cce43a';c.lineWidth=2;
  for(let j=0;j<4;j++){
    const y=fract(rnd(j,2)-cam.y*.00005)*h;
    c.beginPath();c.moveTo(0,y);c.lineTo(w,y+Math.sin(j)*10);c.stroke();
  }
}
const paintKinds=[solar,nacre,prism,forge,citadel];
function paintSector(c,w,h,cam,t,sector,reduce){
  const theme=STAGES[sector];ambience(c,w,h,cam,t,theme);
  const painted=paintArtPlate(c,w,h,cam,sector);
  c.save();
  if(painted)c.globalAlpha=.24;
  paintKinds[sector](c,w,h,cam,t,reduce);
  c.restore();
  paintRichScenery(c,w,h,cam,t,sector);
  // Near-camera motes are slow, sparse, and never masquerade as enemy bullets.
  c.save();c.globalAlpha=.2;c.fillStyle=theme.accent;
  for(let j=0;j<15;j++){
    const xx=fract(rnd(j,sector+30)-cam.x*(.00032+j*.000008))*w;
    const yy=fract(rnd(j,sector+71)-cam.y*.00029)*h;
    c.fillRect(xx,yy,.8+rnd(j,6)*1.5,.8+rnd(j,4)*1.5);
  }
  c.restore();
}
// One reusable buffer allows a true crossfade despite per-layer alpha in starfields.
// Only used for 3.8 seconds around scene transitions; not allocated in steady play.
let transitionCanvas=null;
export function paintStageBackdrop(c,w,h,cam,t,stageTime=t,reduce=false){
  const sector=stageIndex(stageTime),blend=sector?smooth((stageTime-sector*SECTOR_SECONDS)/3.8):1;
  c.save();
  if(blend<1 && typeof document!=='undefined'){
    paintSector(c,w,h,cam,t,sector-1,reduce);
    const bw=Math.ceil(w),bh=Math.ceil(h);
    if(!transitionCanvas)transitionCanvas=document.createElement('canvas');
    if(transitionCanvas.width!==bw)transitionCanvas.width=bw;
    if(transitionCanvas.height!==bh)transitionCanvas.height=bh;
    const layer=transitionCanvas.getContext('2d',{alpha:false});
    if(layer){
      paintSector(layer,bw,bh,cam,t,sector,reduce);
      c.globalAlpha=blend;
      c.drawImage(transitionCanvas,0,0,w,h);
      c.globalAlpha=1;
    }else paintSector(c,w,h,cam,t,sector,reduce);
  }else{
    paintSector(c,w,h,cam,t,sector,reduce);
  }
  c.restore();
  const vignette=c.createRadialGradient(w*.52,h*.48,h*.11,w*.52,h*.48,Math.max(w,h)*.81);
  vignette.addColorStop(0,'#03061000');vignette.addColorStop(1,'#03061084');
  c.fillStyle=vignette;c.fillRect(0,0,w,h);
}
