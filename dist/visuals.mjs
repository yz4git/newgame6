// One nine-piece atlas and three sixteen-piece atlases per category and biome.
// The physical simulation never depends on these decorative visuals.
export const VISUAL_THEMES=['helios','nacre','prism','forge','citadel'];
export const VISUAL_ART_COUNT=570;
export const VISUAL_VARIANTS=5;
export const VISUAL_COMBINATIONS=VISUAL_ART_COUNT*VISUAL_VARIANTS;
const palettes=['#ffbe71','#8fffe1','#a6cbff','#ff9761','#c5a8ff'];
const atlasRecords=new Map();
const enemyArtwork=new WeakMap();
let recent=[];
const mod=(n,m)=>(n%m+m)%m;
export function preloadVisuals(theme=0){
 if(typeof Image==='undefined')return Promise.resolve([]);
 theme=mod(theme,5);
 if(atlasRecords.has(theme)){recent=recent.filter(n=>n!==theme);recent.push(theme);return atlasRecords.get(theme).loading;}
 const record={fleet:[],scenery:[],outlines:[],loading:null};atlasRecords.set(theme,record);
 recent.push(theme);
 while(recent.length>2){const old=recent.shift();atlasRecords.delete(old);}
 record.loading=Promise.all(['fleet','scenery'].flatMap(kind=>['','-a','-b','-c'].map((pack,i)=>new Promise(resolve=>{
  const im=new Image();im.decoding='async';im.onload=()=>{
   if(atlasRecords.get(theme)!==record){resolve(false);return;}
   record[kind][i]=im;
   if(kind==='fleet'&&typeof document!=='undefined')try{
    const cv=document.createElement('canvas'),scale=Math.min(1,512/Math.max(im.naturalWidth||im.width,im.naturalHeight||im.height));
    cv.width=Math.round((im.naturalWidth||im.width)*scale);cv.height=Math.round((im.naturalHeight||im.height)*scale);
    const ctx=cv.getContext('2d');if(ctx){ctx.drawImage(im,0,0,cv.width,cv.height);ctx.globalCompositeOperation='source-in';ctx.fillStyle='#07111d';ctx.fillRect(0,0,cv.width,cv.height);record.outlines[i]=cv;}
   }catch{} // Art still renders if an outline canvas cannot be allocated.
   resolve(true);
  };im.onerror=()=>resolve(false);
  im.src=new URL(`./assets/${kind}-${VISUAL_THEMES[theme]}${pack}-v6.webp?v=lumen-4.5.1`,import.meta.url).href;
 }))));
 return record.loading;
}
export function visualSelection(kind,theme,index,variant){
 return {kind,theme:mod(theme,5),index:mod(index,57),variant:mod(variant,5)};
}
function sprite(c,kind,theme,index,size,outline=false){
 const record=atlasRecords.get(mod(theme,5));if(!record)return false;
 index=mod(index,57);const pack=index<9?0:1+Math.floor((index-9)/16),grid=pack?4:3,cell=pack?(index-9)%16:index;
 const im=outline?record.outlines[pack]:record[kind]?.[pack];if(!im)return false;
 const w=im.naturalWidth||im.width,h=im.naturalHeight||im.height;
 if(!w||!h)return false;
 const sw=w/grid,sh=h/grid,fit=size/Math.max(sw,sh),dw=sw*fit,dh=sh*fit;
 c.drawImage(im,(cell%grid)*sw,Math.floor(cell/grid)*sh,sw,sh,-dw/2,-dh/2,dw,dh);return true;
}
function bloom(c,x,y,r,color,alpha){
 const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(1,'transparent');
 c.save();c.globalAlpha*=alpha;c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();
}
const slots={wisp:0,ray:1,thorn:2,guard:3,miner:4,mender:5,splitter:6,sniper:7,elite:8};
const families={wisp:[0,0],ray:[0,1],splitter:[0,2],guard:[1,0],miner:[1,1],sniper:[1,2],thorn:[2,0],mender:[2,1],elite:[2,2]};
export function fleetDesignIndex(type,id,theme){
 const slot=slots[type]??0,group=mod(Math.floor(id/5)+theme,7);
 if(!group)return slot;
 const [pack,within]=families[type]??families.wisp;
 const cell=within+3*mod(group-1,within===0?6:5);
 return 9+pack*16+cell;
}
export function paintFleet(c,e,reduce=false){
 if(e.type==='boss'||!atlasRecords.get(mod(e.visualBiome??0,5))?.fleet[0])return false;
 const theme=mod(e.visualBiome??0,5),slot=slots[e.type]??0,seed=e.visualSeed??0,index=fleetDesignIndex(e.type,e.id+mod(seed,7)*5,theme),variant=mod(e.id*7+theme+seed,5),t=e.age+e.phase*.2;
 const size=e.r*(e.type==='elite'?3.1:2.8),color=palettes[theme];
 c.save();
 // Animated thrust and core light remain attached to the silhouette.
 const pulse=reduce?1:.7+.3*Math.sin(t*(5+variant));
 if(variant===0||variant===1){
  const count=variant===1?2:1;
  for(let i=0;i<count;i++){
   const y=count===1?0:(i?1:-1)*size*.17;
   bloom(c,size*.33,y,size*.30,color,.30+.15*pulse);
   c.fillStyle=color;c.globalAlpha=.55+.22*pulse;c.beginPath();
   c.moveTo(size*.31,y-size*.025);c.lineTo(size*(.42+.12*pulse),y);c.lineTo(size*.31,y+size*.025);c.fill();c.globalAlpha=1;
  }
 }else bloom(c,0,0,size*(.32+variant*.025),color,.16+.10*pulse);
 if(!reduce){
  c.rotate(Math.sin(t*(1.3+variant*.17))*.035);
  const breathe=Math.sin(t*(2.4+variant*.35));
  c.scale(1+breathe*.018,1-breathe*.035);
 }
 let chosen=enemyArtwork.get(e);
 if(chosen===undefined){chosen=atlasRecords.get(theme).fleet[index<9?0:1+Math.floor((index-9)/16)]?index:slot;enemyArtwork.set(e,chosen);}
 sprite(c,'fleet',theme,chosen,size+8,true);
 if(theme===4){c.shadowColor='#bcb9ff';c.shadowBlur=6;}
 const drawn=sprite(c,'fleet',theme,chosen,size);
 c.shadowBlur=0;
 c.globalCompositeOperation='screen';c.globalAlpha=theme===4?.28:.16;sprite(c,'fleet',theme,chosen,size);c.globalCompositeOperation='source-over';c.globalAlpha=1;
 if(e.hit>0){c.globalCompositeOperation='lighter';c.globalAlpha=Math.min(.45,e.hit*3);sprite(c,'fleet',theme,chosen,size);}
 c.restore();return drawn;
}
export function paintScenerySprite(c,theme,index,variant,size,t,alpha=1,reduce=false){
 const sel=visualSelection('scenery',theme,index,variant);if(!atlasRecords.get(sel.theme)?.scenery[0])return false;
 c.save();c.globalAlpha*=alpha;
 if(!reduce)c.rotate(Math.sin(t*(.25+sel.variant*.08)+sel.index)*(.025+sel.variant*.009));
 const scale=reduce?1:1+Math.sin(t*(.65+sel.variant*.25)+sel.index)*.025;
 c.scale(scale,scale);
 if(sel.variant>=3)bloom(c,0,0,size*.5,palettes[sel.theme],.12);
 const chosen=atlasRecords.get(sel.theme).scenery[sel.index<9?0:1+Math.floor((sel.index-9)/16)]?sel.index:sel.index%9;
 const drawn=sprite(c,'scenery',sel.theme,chosen,size);c.restore();return drawn;
}
export function paintSceneryDepth(c,w,h,camera,t,theme,reduce=false,runSeed=0){
 const span=400,offset=camera.x*.24,first=Math.floor(offset/span)-1,last=Math.ceil((offset+w)/span)+1;
 for(let cell=first;cell<=last;cell++)for(let side=0;side<2;side++){
  const seed=cell*17+side*31+theme*47+mod(runSeed,285),idx=mod(seed,57),variant=mod(Math.floor(seed/57),5);
  const x=cell*span-offset+mod(seed*83,140),edge=side?h*.87:h*.13;
  const y=edge-Math.sin(camera.y*.0003+seed)*26+(reduce?0:Math.sin(t*.4+seed)*5);
  c.save();c.translate(x,y);paintScenerySprite(c,theme,idx,variant,115+mod(seed*13,55),t,.24,reduce);c.restore();
 }
}
