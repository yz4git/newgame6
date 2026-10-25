import {readFile,readdir,access} from 'node:fs/promises';import {execFileSync} from 'node:child_process';import {resolve} from 'node:path';
const root=resolve(new URL('..',import.meta.url).pathname),dist=resolve(root,'dist');
for(const file of await readdir(dist))if(/\.(mjs|js)$/.test(file))execFileSync(process.execPath,['--check',resolve(dist,file)]);
const html=await readFile(resolve(dist,'index.html'),'utf8');for(const m of html.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g))await access(resolve(dist,m[1].split('?')[0]));
const app=await readFile(resolve(dist,'app.mjs'),'utf8');const ids=new Set([...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]));for(const m of app.matchAll(/\$\('#([^']+)'\)/g))if(!ids.has(m[1]))throw Error('Missing UI element '+m[1]);
for(const asset of ['ink-atlas.webp','pigments.webp'])await access(resolve(dist,'assets',asset));const manifest=JSON.parse(await readFile(resolve(dist,'manifest.webmanifest'),'utf8'));for(const icon of manifest.icons)await access(resolve(dist,icon.src));
console.log('Module syntax, UI references, artwork and PWA assets verified.');
