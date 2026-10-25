import test from 'node:test';import assert from 'node:assert/strict';import {readFile,readdir,access} from 'node:fs/promises';import {resolve} from 'node:path';
const root=resolve(new URL('../dist/',import.meta.url).pathname);
test('the offline release includes the full module graph, paper artwork, UI and PWA icons',async()=>{
 const sw=await readFile(resolve(root,'sw.js'),'utf8'),core=[...sw.match(/const CORE=\[([^;]+)\];/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
 for(const url of core)await access(resolve(root,url==='./'?'index.html':url.split('?')[0]));
 for(const file of (await readdir(root)).filter(n=>n.endsWith('.mjs'))){const source=await readFile(resolve(root,file),'utf8');assert(core.includes('./'+file+'?v=1.1.0'));for(const m of source.matchAll(/from\s+'(\.\/[^']+)'/g))assert(core.includes(m[1]),`missing cached dependency ${m[1]}`);}
 assert(core.includes('./assets/ink-atlas.webp'));assert(core.includes('./assets/pigments.webp'));assert(sw.includes("k.startsWith('nocturne-eclipse-')"));assert(!(await readdir(root)).some(n=>n.startsWith('_qa')),'temporary QA pages must not ship');
});
