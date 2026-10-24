import {readdir,readFile,access} from 'node:fs/promises';import {spawnSync} from 'node:child_process';
const files=(await readdir('dist')).filter(f=>/\.(mjs|js)$/.test(f));
for(const file of files){const p=spawnSync(process.execPath,['--check','dist/'+file],{stdio:'inherit'});if(p.status)process.exit(p.status);}
const html=await readFile('dist/index.html','utf8'),main=await readFile('dist/main.mjs','utf8');const ids=new Set([...html.matchAll(/id="([^"]+)"/g)].map(m=>m[1]));for(const id of ['newGameConfirm','importConfirm'])ids.add(id);
for(const [,id]of main.matchAll(/\$\('([^']+)'\)/g)){if(!ids.has(id))throw new Error('Missing UI element: '+id);}
const assets=['cathedral','crypt','belfry','sanctum','hero','enemies','props','motion','hunters'];for(const a of assets)await access('dist/assets/'+a+'.webp');
for(const icon of ['180','192','512'])await access('dist/icon-'+icon+'.png');
const atlas=JSON.parse(await readFile('dist/assets/atlas.json','utf8'));for(const [name,sheet]of Object.entries(atlas))for(const b of sheet.frames)if(b.x<0||b.y<0||b.x+b.w>sheet.width||b.y+b.h>sheet.height||b.w<=0||b.h<=0)throw new Error('Invalid sprite crop: '+name);
console.log('JavaScript, UI references, assets and sprite bounds verified.');
