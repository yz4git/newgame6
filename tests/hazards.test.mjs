import test from 'node:test';
import assert from 'node:assert/strict';
import {Flight} from '../dist/model.mjs';
import {gateHazard,hitsGateHazard,HAZARD_NAMES} from '../dist/hazards.mjs';
import {runReward} from '../dist/storage.mjs';
const gate=(theme)=>({id:theme+1,x:300,center:0,gap:238,theme,hazard:true,hazardPhase:0,failed:false,passed:false,exit:400});
test('five sector hazards have distinct silhouettes, telegraphs and a safe lane in both orientations',()=>{
 assert.equal(new Set(HAZARD_NAMES).size,5);
 for(const theme of [0,1,2,3,4])for(const size of [[844,390],[390,844]]){
  const f=new Flight(100+theme,{routes:true});f.setView(...size,true);f.biomeIndex=theme;f.gateIndex=2;f.spawnGate();
  const g=f.gates[0];g.hazardPhase=0;const h=gateHazard(g,1.7);assert.equal(h.active,true);
  assert.ok(hitsGateHazard({x:h.x,y:h.y,r:12.5},h));
  assert.ok(!hitsGateHazard({x:h.x,y:g.center+(theme===3?-80:85),r:12.5},h));
  if(theme!==1){const early=gateHazard(g,.5);assert.equal(early.active,false);assert.equal(early.warning,true);assert.ok(!hitsGateHazard({x:early.x,y:early.y,r:12.5},early));}
  assert.ok(g.gap>2*(f.p.r+h.r),'the remaining passage fits the ship');
 }
});
test('clean passage grows XP and part streak up to x5; shielded hits and missed gates break it',()=>{
 const f=new Flight(31,{routes:true});f.enemies=[];f.spawnTimer=f.gateTimer=f.nextSwarm=f.nextElite=1e6;f.xpNeed=999;
 for(let i=0;i<7;i++){const g=gate(0);g.id=100+i;g.hazard=false;g.x=f.p.x-200;g.exit=f.p.x-1;f.gates=[g];f.tick();}
 assert.equal(f.gateDodges,7);assert.equal(f.gateStreak,7);assert.equal(f.bestGateStreak,7);assert.equal(f.flightBonusParts,25);assert.equal(f.totalXP,50);
 assert.ok(runReward(f)>=f.flightBonusParts);
 f.p.shield=1;f.damage(20,'弾');assert.equal(f.gateStreak,0);assert.equal(f.p.hp,f.p.maxHP);
 const bad=gate(2);bad.id=200;bad.hazard=false;bad.x=f.p.x-200;bad.exit=f.p.x-1;bad.failed=true;f.gates=[bad];f.tick();assert.equal(f.gateStreak,0);assert.equal(f.gateDodges,7);
});
test('active stage hazard damages the ship and invalidates its gate; warning never damages',()=>{
 const f=new Flight(32,{routes:true});f.enemies=[];f.spawnTimer=f.gateTimer=f.nextSwarm=f.nextElite=1e6;
 const g=gate(3);g.x=f.p.x;g.exit=f.p.x+100;g.hazardPhase=1.7;f.gates=[g];
 let h=gateHazard(g,f.time);f.p.y=h.y;f.tick();assert.equal(g.failed,true);assert.ok(f.p.hp<f.p.maxHP);
 const other=new Flight(33,{routes:true});other.enemies=[];other.spawnTimer=other.gateTimer=other.nextSwarm=other.nextElite=1e6;
 const w=gate(3);w.x=other.p.x;w.exit=other.p.x+100;w.hazardPhase=.2;other.gates=[w];other.p.y=gateHazard(w,other.time).y;other.tick();assert.equal(w.failed,false);assert.equal(other.p.hp,other.p.maxHP);
});
test('terrain and hazard hits report real HP loss, while shield defense reports no damage',()=>{
 const f=new Flight(84,{routes:true});f.enemies=[];f.p.hurt=0;
 f.damage(23,'浮遊装甲への接触');
 assert.equal(f.p.hp,f.p.maxHP-23);assert.deepEqual(f.events.find(e=>e.type==='hurt'),{type:'hurt',amount:23,source:'浮遊装甲への接触',hp:f.p.hp,maxHP:f.p.maxHP});
 assert.equal(f.effects.at(-1).kind,'hurt');
 f.p.hurt=0;f.p.shield=1;const hp=f.p.hp;
 f.damage(19,'溶岩噴出への接触');
 assert.equal(f.p.hp,hp);assert.ok(f.events.some(e=>e.type==='guard'&&e.source==='溶岩噴出への接触'));
 assert.equal(f.effects.at(-1).kind,'guard');
});
