// Optional visual QA renderer. The shipped game has no package dependencies.
import {createRequire} from 'node:module';import {mkdir,readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
const require=createRequire(import.meta.url);const canvasPackage=require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]});const {createCanvas,loadImage}=require(canvasPackage);
const root=resolve(new URL('..',import.meta.url).pathname);globalThis.devicePixelRatio=1;globalThis.innerWidth=1760;globalThis.innerHeight=740;globalThis.document={createElement:()=>createCanvas(128,128)};
const {Renderer}=await import('../dist/render.mjs');const {GameModel}=await import('../dist/model.mjs');const {heroPose,whipForPlayer}=await import('../dist/animation.mjs');
const assets={};await Promise.all(['cathedral','crypt','belfry','sanctum','hero','enemies','props','motion','hunters','attack'].map(async name=>{assets[name]=await loadImage(resolve(root,'dist/assets',name+'.webp'));}));const atlas=JSON.parse(await readFile(resolve(root,'dist/assets/atlas.json'),'utf8'));
const canvas=createCanvas(1760,740),r=new Renderer(canvas,assets,atlas),c=r.ctx,g=new GameModel();c.fillStyle='#101725';c.fillRect(0,0,1760,740);
const qs=[.035,.12,.23,.33,.46,.64,.81,.95];
for(let i=0;i<8;i++){const x=(i%4)*440,y=Math.floor(i/4)*370;c.save();c.beginPath();c.rect(x,y,440,370);c.clip();c.translate(x,y);c.strokeStyle='#35465a';c.beginPath();c.moveTo(0,310);c.lineTo(440,310);c.stroke();Object.assign(g.player,{x:190,y:310,attackTotal:.36,attack:.36*(1-qs[i]),combo:0,inv:0});r.hero(g,0);c.fillStyle='#cfbd98';c.font='17px sans-serif';c.fillText(`${i+1}   ${Math.round(qs[i]*100)}%`,16,30);const w=whipForPlayer(g.player);c.fillStyle=w.active?'#94ddc4':'#9cabc1';c.font='14px sans-serif';c.fillText(w.active?'STRIKE':'',16,345);c.restore();}
await writeFile(resolve(root,'docs/animation-v22-frames.png'),canvas.toBuffer('image/png'));
const folder=process.argv[2];if(folder){await mkdir(folder,{recursive:true});const cv=createCanvas(1000,420);r.ctx=cv.getContext('2d');const ctx=r.ctx;const game=new GameModel();game.enemies=[];game.breakables=[];game.player.inv=0;
 for(let frame=0;frame<174;frame++){const t=frame/30;for(let j=0;j<2;j++){const tt=t+j/60;game.update(1/60,{right:tt>.6&&tt<1.35,attack:tt>1.65&&tt<3.5,jump:tt>=3.85&&tt<4.04||tt>=4.12&&tt<4.35});game.drain();}
  ctx.setTransform(1,0,0,1,0,0);ctx.fillStyle='#101725';ctx.fillRect(0,0,1000,420);ctx.fillStyle='#cab98f';ctx.font='19px sans-serif';ctx.fillText('NOCTURNE  /  ANIMATION 2.2',28,32);ctx.fillStyle='#8295ad';ctx.font='14px sans-serif';ctx.fillText('Idle  ·  Run  ·  Whip combo  ·  Double jump',28,57);ctx.strokeStyle='#34455b';ctx.beginPath();ctx.moveTo(0,350);ctx.lineTo(1000,350);ctx.stroke();ctx.save();ctx.setTransform(1.1,0,0,1.1,0,350-590*1.1);r.hero(game,t);ctx.restore();await writeFile(resolve(folder,String(frame).padStart(4,'0')+'.png'),cv.toBuffer('image/png'));
 }
}
console.log('Rendered all attack keys and animation sequence using the game renderer.');
