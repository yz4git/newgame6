import test from 'node:test';import assert from 'node:assert/strict';import {readFile,access} from 'node:fs/promises';import {runInNewContext} from 'node:vm';
test('the offline release contains every module dependency, UI file and required asset',async()=>{
 const sw=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8');const core=runInNewContext(sw+';CORE;',{self:{addEventListener(){}}});
 for(const url of core)await access(new URL('../dist/'+(url==='./'?'index.html':url.slice(2).split('?')[0]),import.meta.url));
 for(const file of ['main.mjs','model.mjs','render.mjs','storage.mjs','animation.mjs']){const source=await readFile(new URL('../dist/'+file,import.meta.url),'utf8');for(const [,dependency]of source.matchAll(/from\s+['"]([^'"]+)['"]/g))assert(core.includes(dependency),file+' offline dependency '+dependency);}
 for(const file of ['motion','hunters','sanctum','attack'])assert(core.includes('./assets/'+file+'.webp'));
});

test('online navigation cannot replace the complete offline release with a newer HTML shell',async()=>{
 const sw=await readFile(new URL('../dist/sw.js',import.meta.url),'utf8'),handlers={};let writes=0;
 const context={URL,Response,self:{location:{origin:'https://game.test'},addEventListener:(name,fn)=>handlers[name]=fn},caches:{open:async()=>({put(){writes++;},match:async()=>new Response('complete-cached-release')})},fetch:async()=>new Response('new-online-shell')};
 runInNewContext(sw,context);let response;const event={request:{method:'GET',url:'https://game.test/',mode:'navigate'},respondWith:p=>response=p};
 handlers.fetch(event);assert.equal(await(await response).text(),'new-online-shell');assert.equal(writes,0);
 context.fetch=async()=>{throw Error('offline');};handlers.fetch(event);assert.equal(await(await response).text(),'complete-cached-release');
});
