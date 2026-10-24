import test from 'node:test';import assert from 'node:assert/strict';import {readFile,access} from 'node:fs/promises';import {runInNewContext} from 'node:vm';
test('the offline release contains every module dependency, UI file and required asset',async()=>{
 const sw=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');const core=runInNewContext(sw+';CORE;',{self:{addEventListener(){}}});
 for(const url of core)await access(new URL('../dist/'+(url==='./'?'index.html':url.slice(2).split('?')[0]),import.meta.url));
 for(const file of ['main.mjs','model.mjs','render.mjs','storage.mjs']){const source=await readFile(new URL('../dist/'+file,import.meta.url),'utf8');for(const [,dependency]of source.matchAll(/from\s+['"]([^'"]+)['"]/g))assert(core.includes(dependency),file+' offline dependency '+dependency);}
 for(const file of ['motion','hunters','sanctum'])assert(core.includes('./assets/'+file+'.webp'));
});
