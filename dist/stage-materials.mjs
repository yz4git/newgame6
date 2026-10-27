// High-detail image-backed biomes. Art comes from the original NewGame3 textures.
// Decoration has no collision; gameplay hazards are drawn by render.mjs.
export const MATERIALS=Object.freeze([
  {id:'helios',file:'rich-helios.webp'},
  {id:'nacre',file:'rich-nacre.webp'},
  {id:'prism',file:'rich-prism.webp'},
  {id:'forge',file:'rich-forge.webp'},
  {id:'citadel',file:'rich-citadel.webp'},
  {id:'rock',file:'rich-rock.webp'}
]);
const cache=Array(MATERIALS.length).fill(null);
let job=null;
export function materialImage(index){return cache[index]||null;}
export function materialStatus(){return {loaded:cache.filter(i=>i?.complete&&i.naturalWidth).length,total:MATERIALS.length};}
export function preloadMaterials(){
  if(job)return job;
  if(typeof Image==='undefined')return Promise.resolve(false);
  job=Promise.all(MATERIALS.map((asset,index)=>new Promise(resolve=>{
    const img=new Image();img.decoding='async';
    img.onload=()=>{cache[index]=img;resolve(true);};
    img.onerror=()=>resolve(false);
    img.src=new URL('./assets/'+asset.file+'?v=lumen-4.4.1',import.meta.url).href;
  })));
  return job;
}
const PI=Math.PI,TAU=PI*2;
const frac=v=>v-Math.floor(v);
const hash=(a,b=0)=>frac(Math.sin(a*127.1+b*311.7)*43758.5453123);
const alpha=(c,a,fn)=>{c.save();c.globalAlpha*=a;try{fn();}finally{c.restore();}};
const radiance=(c,x,y,r,rgb,amount=.2)=>{
  const g=c.createRadialGradient(x,y,0,x,y,r);
  g.addColorStop(0,rgb);g.addColorStop(1,'transparent');
  alpha(c,amount,()=>{c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);});
};
function scenery(c,img,x,y,size,opacity,filter='none',rotation=0){
  if(!img)return;
  alpha(c,opacity,()=>{
    c.translate(x,y);c.rotate(rotation);
    if(filter!=='none'&&'filter'in c)c.filter=filter;
    c.drawImage(img,-size/2,-size/2,size,size);
  });
}
function helios(c,w,h,cam,t){
  const img=cache[0];if(!img)return;
  const x=w*.78-Math.sin(cam.x*.00013)*w*.11,y=h*.46-Math.sin(cam.y*.00019)*h*.11;
  radiance(c,x,y,h*.72,'#ffbb65',.15);
  // An illuminated orbital shipyard with distinct near/far scale.
  scenery(c,img,x,y,h*.96,.93,'brightness(.85) saturate(1.05)',t*.002);
  scenery(c,img,w*.13+Math.sin(cam.x*.0002)*w*.11,h*.9-cam.y*.009,h*.44,.29,'brightness(.45) saturate(.5)',-.22);
  c.strokeStyle='#ffc38d56';c.lineWidth=Math.max(2,h*.003);
  c.beginPath();c.ellipse(x,y,h*.41,h*.18,-.25,0,TAU);c.stroke();
}
function nacre(c,w,h,cam,t){
  const img=cache[1];if(!img)return;
  const x=w*.79-Math.sin(cam.x*.00022)*w*.12,y=h*.62-cam.y*.012;
  radiance(c,x,y,h*.64,'#78eed8',.18);
  scenery(c,img,x,y,h*1.08,.86,'hue-rotate(91deg) saturate(.8) brightness(.83)',-.04);
  scenery(c,img,w*.2+Math.cos(cam.x*.0003)*w*.07,h*.87-cam.y*.025,h*.54,.38,'hue-rotate(108deg) brightness(.44) saturate(.75)',.08);
  // The living habitat pulses softly instead of imitating rigid scaffolding.
  for(let j=0;j<10;j++){
    const sx=hash(j,13)*w,sy=(hash(j,16)*h+Math.sin(t*.5+j)*4-cam.y*.008);
    radiance(c,sx,sy,13+hash(j,22)*15,j%2?'#5af5d0':'#a5f6ff',.13);
  }
}
function crystal(c,img,x,y,rx,ry,flip,seed,t){
  c.save();c.translate(x,y);c.scale(1,flip);
  const left=-rx*.76,tip=-ry*.96+Math.sin(seed)*ry*.05,right=rx*.68;
  c.beginPath();c.moveTo(-rx,ry*.13);c.lineTo(left,-ry*.38);
  c.lineTo(0,tip);c.lineTo(right,-ry*.24);c.lineTo(rx,ry*.17);c.closePath();
  c.clip();
  c.fillStyle='#3a67b6';c.fill();
  c.globalAlpha=.83;
  c.drawImage(img,-rx,-ry,2*rx,2*ry);
  c.globalAlpha=1;
  c.fillStyle='#bed6ff27';c.beginPath();c.moveTo(0,tip);c.lineTo(right,-ry*.24);c.lineTo(rx,ry*.17);c.lineTo(0,ry*.15);c.fill();
  c.strokeStyle='#e2ebff99';c.lineWidth=2.1;c.beginPath();c.moveTo(0,tip);c.lineTo(0,ry*.17);c.stroke();
  c.restore();
  c.strokeStyle='#9dd5ffaa';c.lineWidth=1.2;
  c.beginPath();c.moveTo(x-rx,y+ry*.13*flip);c.lineTo(x-rx*.76,y-ry*.38*flip);
  c.lineTo(x,y-ry*.96*flip);c.lineTo(x+rx*.68,y-ry*.24*flip);c.lineTo(x+rx,y+ry*.17*flip);c.stroke();
}
function prism(c,w,h,cam,t){
  const img=cache[2];if(!img)return;
  const step=Math.max(195,w*.22),scroll=cam.x*.17,topY=cam.y*.105;
  const start=Math.floor(scroll/step)-1,end=start+Math.ceil(w/step)+3;
  for(let i=start;i<end;i++){
    const x=i*step-scroll+step*.43,seed=i*17;
    const rx=45+hash(i,3)*57,ry=h*(.2+hash(i,7)*.26);
    crystal(c,img,x,h*.12-topY%150,rx,ry,-1,seed,t);
    crystal(c,img,x+step*.35,h*.93-(topY*.77)%120,rx*.89,ry*1.12,1,seed+4,t);
  }
  radiance(c,w*.77,h*.33,h*.65,'#8cb6ff',.08);
}
function forge(c,w,h,cam,t){
  const img=cache[3];if(!img)return;
  // Molten material occupies the lower edge only; the flying lane stays readable.
  const y=h*.66+Math.sin(cam.y*.00027)*h*.045;
  c.save();c.beginPath();c.moveTo(-10,h+10);
  for(let x=-10;x<=w+40;x+=30){const m=Math.sin(x*.014+cam.x*.0006)*h*.02;c.lineTo(x,y+m);}
  c.lineTo(w+10,h+10);c.closePath();c.clip();
  c.globalAlpha=.62;
  const drift=Math.sin(cam.x*.0005)*120;
  c.drawImage(img,drift-50,y-30,w+100,h-y+100);
  c.globalAlpha=1;c.restore();
  c.strokeStyle='#ffac6870';c.lineWidth=3;c.beginPath();
  for(let x=0;x<=w;x+=25){const yy=y+Math.sin(x*.014+cam.x*.0006)*h*.02;x?c.lineTo(x,yy):c.moveTo(x,yy);}c.stroke();
  radiance(c,w*.77,y,h*.58,'#fe7135',.12);
  for(let i=0;i<25;i++){
    const x=hash(i,4)*w,y0=h*hash(i,9)-(t*(12+hash(i,6)*12))%h;
    const yy=(y0+h)%h;c.fillStyle=i%3?'#ffab747a':'#ffe1a483';c.fillRect(x,yy,1.2,2.8+hash(i,8)*4);
  }
}
function metalPanel(c,img,x,y,w,h,seed){
  c.save();
  c.beginPath();const corner=Math.min(w*.25,18);
  c.moveTo(x+corner,y);c.lineTo(x+w-corner,y);c.lineTo(x+w,y+corner);
  c.lineTo(x+w,y+h-corner);c.lineTo(x+w-corner,y+h);c.lineTo(x+corner,y+h);
  c.lineTo(x,y+h-corner);c.lineTo(x,y+corner);c.closePath();
  c.clip();c.globalAlpha=.8;
  const sx=(hash(seed,4)*.32)*img.width,sy=hash(seed,9)*img.height*.25;
  c.drawImage(img,sx,sy,img.width*.65,img.height*.68,x,y,w,h);
  c.restore();
  c.strokeStyle='#7acde95d';c.lineWidth=1.2;c.stroke();
  c.fillStyle='#90e8ff72';c.fillRect(x+corner+7,y+8,Math.min(20,w*.26),2);
}
function citadel(c,w,h,cam,t){
  const img=cache[4];if(!img)return;
  const far=cam.x*.12,dy=cam.y*.09,span=Math.max(205,w*.2);
  for(let i=Math.floor(far/span)-1;i<=Math.floor((far+w)/span)+2;i++){
    const x=i*span-far,y=h*.8-dy%120;
    const height=h*(.21+hash(i,5)*.32),pw=span*(.65+hash(i,2)*.22);
    metalPanel(c,img,x,y-height,pw,height+130,i);
    if(i%3===0)metalPanel(c,img,x+pw*.21,-95-dy*.12,pw*.4,h*.26,i+14);
  }
  // A high-definition orbital core anchors the stage perspective.
  const x=w*.82-Math.sin(cam.x*.00013)*w*.11,y=h*.39-Math.cos(cam.y*.00024)*h*.07;
  radiance(c,x,y,h*.52,'#7de4ff',.15);
  scenery(c,cache[0],x,y,h*.75,.40,'hue-rotate(165deg) saturate(.75) brightness(.58)',t*.002);
}
export function paintRichScenery(c,w,h,cam,t,index){
  if(!cache[index])return;
  c.save();
  switch(index){
    case 0:helios(c,w,h,cam,t);break;
    case 1:nacre(c,w,h,cam,t);break;
    case 2:prism(c,w,h,cam,t);break;
    case 3:forge(c,w,h,cam,t);break;
    case 4:citadel(c,w,h,cam,t);break;
  }
  c.restore();
}
