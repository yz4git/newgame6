import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

test('offline installation caches every asset in small batches before activation',async()=>{
 const handlers={},batches=[];let skipped=false,install;
 const self={addEventListener(type,handler){handlers[type]=handler;},skipWaiting(){skipped=true;}};
 const caches={open:async()=>({addAll:async urls=>batches.push(urls)})};
 vm.runInNewContext(readFileSync('dist/sw.js','utf8'),{self,caches,URL});
 handlers.install({waitUntil(p){install=p;}});await install;
 assert.equal(skipped,true);assert.ok(batches.length>10);
 assert.ok(batches.every(urls=>urls.length>0&&urls.length<=3));
 const urls=batches.flat();assert.ok(urls.includes('./index.html'));
 for(const theme of ['helios','nacre','prism','forge','citadel'])
  for(const kind of ['fleet','scenery'])for(const pack of ['a','b','c'])
   assert.ok(urls.includes(`./assets/${kind}-${theme}-${pack}-v6.webp?v=lumen-4.5.1`));
});
