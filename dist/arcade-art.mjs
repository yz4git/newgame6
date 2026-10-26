// Original generated production paintings and connected terrain materials, v3.
const names=['helios','nacre','prism','forge','citadel'];
const backdrops=[],terrain=[];let task;
export function preloadArcade(){
 if(task)return task;if(typeof Image==='undefined')return Promise.resolve(false);
 const load=(file,assign)=>new Promise(resolve=>{const img=new Image();img.decoding='async';img.onload=()=>{assign(img);resolve(true);};img.onerror=()=>resolve(false);img.src=new URL('./assets/'+file+'?v=lumen-4.0.0',import.meta.url).href;});
 task=Promise.all(names.flatMap((id,i)=>[load('arcade-'+id+'-v3.webp',img=>backdrops[i]=img),...Array.from({length:2},(_,v)=>load('terrain-'+id+'-'+v+'-v3.webp',img=>terrain[i*2+v]=img))]));return task;
}
export function arcadeArtStatus(){return {loaded:backdrops.filter(Boolean).length+terrain.filter(Boolean).length,total:15};}
function worldPlate(c,img,w,h,cam,factor,alpha=1){
 const scale=Math.max(w/img.width,h/img.height)*1.14,dw=img.width*scale,dh=img.height*scale;
 const x=(w-dw)*.5-Math.sin(cam.x*factor)*Math.max(0,(dw-w)*.45);
 const y=(h-dh)*.5-Math.sin(cam.y*factor*.8)*Math.max(0,(dh-h)*.45);
 c.save();c.globalAlpha=alpha;c.drawImage(img,x,y,dw,dh);c.restore();
}
export function paintArcadeBackdrop(c,w,h,cam,t,stageTime){
 const index=Math.max(0,Math.min(4,Math.floor(stageTime/30))),img=backdrops[index];if(!img)return false;
 c.fillStyle='#030813';c.fillRect(0,0,w,h);
 const blend=index?Math.min(1,(stageTime-index*30)/2.5):1;
 if(blend<1&&backdrops[index-1])worldPlate(c,backdrops[index-1],w,h,cam,.00024);
 worldPlate(c,img,w,h,cam,.00024,blend);
 // Depth cues use separate world-space objects and faster scroll, not a moving wallpaper.
 c.save();c.globalAlpha=.25;c.fillStyle=['#ffc995','#9bffe1','#ccd7ff','#ffaf74','#a1eaff'][index];
 for(let i=0;i<34;i++){
  const x=((i*193.71-cam.x*.22)%(w+70)+w+70)%(w+70)-35;
  const y=((i*i*83.19-cam.y*.17)%(h+70)+h+70)%(h+70)-35;
  c.fillRect(x,y,i%7===0?2:1,i%7===0?2:1);
 }
 c.restore();
 // Genuine midground masses with subdued contrast, visually separate from bright hazards.
 for(let j=0;j<4;j++){
  const art=terrain[index*2+j%2];if(!art)continue;
  const span=460,offset=cam.x*.35,cell=Math.floor(offset/span)+j-1;
  const x=cell*span-offset,y=(j%2?h+95:-95)-Math.sin(cam.y*.0004+j)*40;
  c.save();c.globalAlpha=.30;c.drawImage(art,x-200,y-160,400,320);c.restore();
 }
 return true;
}
export function paintArcadeTerrain(c,r){
 const img=terrain[(r.theme??0)*2+(r.variant??0)%2];if(!img)return;
 c.drawImage(img,r.x-r.rx,r.y-r.ry,r.rx*2,r.ry*2);
}
