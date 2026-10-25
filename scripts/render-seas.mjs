// Optional art review; the shipped game has no dependencies.
import {createRequire} from 'node:module';import {readFile,writeFile} from 'node:fs/promises';import {resolve} from 'node:path';
const require=createRequire(import.meta.url),{createCanvas,loadImage}=require(require.resolve('@napi-rs/canvas',{paths:[process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||process.cwd()]}));
globalThis.document={createElement:()=>createCanvas(256,256)};
const {Inkscape}=await import('../dist/render.mjs');const {Voyage,LEVELS}=await import('../dist/model.mjs');const {PALETTES}=await import('../dist/levels.mjs');
const root=resolve(new URL('..',import.meta.url).pathname),atlas=await loadImage(await readFile(resolve(root,'dist/assets/ink-atlas.webp'))),sheet=createCanvas(1688,1560),out=sheet.getContext('2d');
for(let i=0;i<8;i++){const c=createCanvas(844,390),r=new Inkscape(c,atlas),g=new Voyage(i);r.resize(844,390);r.draw(g,{motion:false});const ctx=c.getContext('2d');ctx.textAlign='left';ctx.fillStyle=PALETTES[g.level.palette].gold;ctx.font='20px serif';ctx.fillText(String(i+1).padStart(2,'0'),22,32);ctx.fillStyle=PALETTES[g.level.palette].ink;ctx.font='10px serif';ctx.fillText(LEVELS[i].en,58,29);out.drawImage(c,(i%2)*844,Math.floor(i/2)*390);}
await writeFile(resolve(root,'docs/eight-seas.jpg'),sheet.toBuffer('image/jpeg',87));console.log('Eight seas drawn with the shipped renderer.');
