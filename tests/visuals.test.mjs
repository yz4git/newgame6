import test from 'node:test';
import assert from 'node:assert/strict';
import {Flight} from '../dist/model.mjs?v=lumen-4.4.1';
import {preloadVisuals,paintFleet,paintScenerySprite,visualSelection,fleetDesignIndex,VISUAL_ART_COUNT,VISUAL_COMBINATIONS} from '../dist/visuals.mjs?v=lumen-4.4.1';

test('sprite sets load per biome, animate, and preserve each spawned enemy’s biome',async()=>{
 const oldImage=globalThis.Image,oldDocument=globalThis.document,loaded=[];
 class FakeImage {constructor(){this.width=960;this.height=960;this.naturalWidth=960;this.naturalHeight=960;}
  set src(value){this.url=value;loaded.push(value);queueMicrotask(()=>this.onload());}}
 const canvasContext={drawImage(){},fillRect(){}};
 globalThis.Image=FakeImage;globalThis.document={createElement(){return {width:0,height:0,getContext(){return canvasContext;}};}};
 try{
  await preloadVisuals(2);
  assert.equal(loaded.length,8);assert.ok(loaded.every(x=>x.includes('-prism')));
  const calls=[],c=new Proxy({globalAlpha:1,createRadialGradient(){return {addColorStop(){}};}},{get(target,key){return key in target?target[key]:(...args)=>calls.push([key,...args]);},set(target,key,value){target[key]=value;return true;}});
  const enemy={type:'ray',visualBiome:2,id:19,age:2,phase:1,r:23,hit:0};
  assert.equal(paintFleet(c,enemy),true);assert.ok(calls.some(x=>x[0]==='drawImage'));
  assert.ok(calls.some(x=>x[0]==='rotate')&&calls.some(x=>x[0]==='scale'));
  assert.equal(paintScenerySprite(c,2,51,3,100,1),true);
  const f=new Flight(12,{routes:true});f.biomeIndex=3;const spawned=f.spawn('ray',100,0);f.biomeIndex=1;
  assert.equal(spawned.visualBiome,3);
  assert.equal(VISUAL_ART_COUNT,570);assert.equal(VISUAL_COMBINATIONS,2850);
  assert.deepEqual(visualSelection('fleet',-1,-1,-1),{kind:'fleet',theme:4,index:56,variant:4});
  const reachable=new Set();for(const type of ['wisp','ray','thorn','guard','miner','mender','splitter','sniper','elite'])for(let id=0;id<35;id++)reachable.add(fleetDesignIndex(type,id,2));
  assert.equal(reachable.size,57);
  await preloadVisuals(3);await preloadVisuals(4);assert.equal(loaded.length,24);
  await preloadVisuals(2);assert.equal(loaded.length,32); // The oldest biome can be loaded again after eviction.
 }finally{globalThis.Image=oldImage;globalThis.document=oldDocument;}
});
