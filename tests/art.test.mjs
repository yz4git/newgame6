import test from 'node:test';import assert from 'node:assert/strict';
import {Voyage,isDanger,predictRoute} from '../dist/model.mjs';import {makePrint,normalizePrint,sceneForPrint,compactPath} from '../dist/prints.mjs';import {Logbook,SAVE_KEY} from '../dist/storage.mjs';
function orbit(){const g=new Voyage();Object.assign(g.boat,{x:795,y:475});g.path=[{x:795,y:475,move:true}];g.safe={x:795,y:475};const dt=.35,factor=1.65/(1-Math.exp(-1.65*dt));for(let i=1;i<=16;i++){const a=i/16*Math.PI*2;g.launch({x:(630+165*Math.cos(a)-g.boat.x)*factor,y:(475+113*Math.sin(a)-g.boat.y)*factor});for(let k=0;k<42;k++)g.step(1/120);}return g;}
test('a real sixteen-flick orbit gilds the enclosed island once and opens a new passage',()=>{
 const g=orbit();assert.equal(g.tears,0);assert.deepEqual(g.stitched,[true,false]);assert.equal(g.drain().filter(e=>e.type==='weave').length,1);
 assert(isDanger(g.level,630,475,g.time));assert(!isDanger(g.level,630,475,g.time,13,g.stitched));const forecast=predictRoute(g,{x:-550,y:0});assert(!forecast.hit,'the visible gold island must not remain solid in the forecast');g.launch({x:-550,y:0});for(let i=0;i<180;i++)g.step(1/120);assert.equal(g.tears,0);assert(g.boat.x<630,'the boat passes through the gilded island');g.tear();assert(g.stitched[0],'a completed gilding survives a later spill');
});
test('backtracking and moving scenery do not count as drawing a loop',()=>{
 const g=new Voyage();Object.assign(g.boat,{x:465,y:350});g.path=[{x:465,y:350,move:true}];for(let i=0;i<12;i++){const target=i%2?465:795;g.launch({x:(target-g.boat.x)*2.4,y:(350-g.boat.y)*2.4});for(let k=0;k<42;k++)g.step(1/120);}assert(!g.stitched.some(Boolean));assert(!g.drain().some(e=>e.type==='weave'));
 const drifting=new Voyage(4);for(let i=0;i<2400;i++)drifting.step(1/120);assert(!drifting.stitched.some(Boolean));
});
test('paper records retain gilding, pigments, pressure and path breaks without connecting a respawn',()=>{
 const g=orbit();g.collected[0]=true;g.path.push({x:200,y:200,move:true,weight:.7},{x:250,y:240,weight:.4});const print=makePrint(g),restored=sceneForPrint(JSON.parse(JSON.stringify(print)));assert.deepEqual(restored.stitched,[true,false]);assert.deepEqual(restored.collected,[true,false,false]);assert(restored.path.some(p=>p.move&&p.x===200));assert(restored.path.some(p=>p.weight===.4));assert.equal(restored.boat.x,print.boat[0]);assert.equal(normalizePrint({...print,index:99}),null);assert.equal(normalizePrint({...print,path:[[Infinity,0],[0,0]]}),null);
});
test('long voyages keep their starting and ending strokes while compacting, with separate strokes preserved',()=>{
 const path=Array.from({length:2500},(_,i)=>({x:100+i*.4,y:300+Math.sin(i/60)*40,weight:.5,move:i===0||i===1200}));const compact=compactPath(path,850);assert(compact.length<=850);assert.equal(compact[0].x,path[0].x);assert.equal(compact.at(-1).x,path.at(-1).x);assert(compact.some(p=>p.move&&p.x===path[1200].x));
});
test('v1 journeys migrate intact and unfinished artworks can be kept without awarding a clear',()=>{
 const original={version:1,last:2,best:[{shots:4,tears:0,medals:3}],settings:{audio:false,motion:false}};const map=new Map([[SAVE_KEY,JSON.stringify(original)]]),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)},book=new Logbook(storage);assert.equal(book.data.best[0].medals,3);assert.equal(book.data.settings.audio,false);assert.equal(book.data.last,2);assert(book.data.prints.every(p=>p===null));const g=orbit();g.index=1;assert(book.keepPrint(makePrint(g)));assert.equal(book.data.best[1],null);const loaded=new Logbook(storage);assert.equal(loaded.data.prints[1].woven[0],0);assert.equal(loaded.data.best[0].shots,4);assert.equal(loaded.data.last,2);
});
