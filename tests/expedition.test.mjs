import test from 'node:test';
import assert from 'node:assert/strict';
import {Flight,STEP} from '../dist/model.mjs';
import {CHASSIS,MODS,RELICS,SECTOR_MODS,META,contractProgress} from '../dist/catalog.mjs';
import {flightOptions,normalizeRecord,settleRun,runReward} from '../dist/storage.mjs';
const peaceful=f=>{f.enemies=[];f.spawnTimer=f.gateTimer=f.nextSwarm=f.nextElite=1e6;return f;};
const step=(f,n)=>{for(let i=0;i<n;i++)f.tick();};
test('normal saved games enable expeditions; old progress migrates and invalid loadouts are rejected',()=>{
 const r=normalizeRecord({runs:3,totalKills:200,selected:'alchemist',mod:'bad',contract:'bad',relics:['clock','clock','bad']});
 assert.equal(r.selected,'alchemist');assert.equal(r.mod,'standard');assert.equal(r.contract,'survey');assert.deepEqual(r.relics,['clock']);assert.equal(r.relicCount,1);
 assert.equal(flightOptions(r).routes,true);assert.equal(new Flight(1,flightOptions(r)).skills.mine,1);
});
test('route and relic decisions stop simulation, consume only offered options, and resume queued upgrades',()=>{
 const f=peaceful(new Flight(55,{routes:true}));f.time=29.999;f.tick();assert.equal(f.status,'route');assert.equal(f.routeChoices.length,3);assert.equal(new Set(f.routeChoices.map(r=>r.mod)).size,3);assert.ok(f.routeChoices.every(r=>r.biome!==0));
 const snap=[f.time,f.p.x,f.p.y,f.enemies.length];step(f,300);assert.deepEqual([f.time,f.p.x,f.p.y,f.enemies.length],snap);assert.equal(f.chooseRoute(4),false);
 const route=f.routeChoices[0];f.xp=f.xpNeed;assert.ok(f.chooseRoute(0));assert.equal(f.getBiome(),route.biome);assert.equal(f.status,'relic');assert.equal(f.chooseRelic('invalid'),false);
 const key=f.relicChoices[0];assert.ok(f.chooseRelic(key));assert.equal(f.status,'upgrade');assert.ok(f.relics.includes(key));f.choose(f.choices[0]);assert.equal(f.status,'playing');
});
test('four route transitions offer distinct relics and seed produces reproducible alternatives',()=>{
 const a=new Flight(83,{routes:true}),b=new Flight(83,{routes:true});
 for(let phase=1;phase<5;phase++){
  for(const f of [a,b]){f.currentPhase=phase;f.beginRoute();}
  assert.deepEqual(a.routeChoices,b.routeChoices);
  for(const f of [a,b]){f.chooseRoute(phase%3);assert.ok(f.relicChoices.every(k=>!f.relics.includes(k)));f.chooseRelic(f.relicChoices[0]);}
 }
 assert.equal(a.relics.length,4);assert.equal(new Set(a.visited).size,5);assert.equal(a.sectorCount,5);
});
test('all eight modification sidegrades alter their described combat mechanics',()=>{
 const base=new Flight(1),glass=new Flight(1,{mod:'glass'}),rapid=new Flight(1,{mod:'rapid'}),fortress=new Flight(1,{mod:'fortress'});
 assert.equal(Object.keys(MODS).length,8);assert.equal(Object.keys(CHASSIS).length,6);assert.equal(glass.p.maxHP,75);assert.ok(glass.power>base.power);assert.ok(rapid.cooldown<base.cooldown&&rapid.power<base.power);assert.equal(fortress.p.maxHP,135);assert.equal(fortress.skills.armor,1);
 assert.equal(new Flight(1,{mod:'battery'}).p.shield,1);assert.equal(new Flight(1,{mod:'recycler'}).skills.magnet,2);assert.equal(new Flight(1,{mod:'thermal'}).skills.frost,2);
 const f=peaceful(new Flight(1,{mod:'hunter'})),e=f.spawn('elite',200,0);f.hit(e,100);assert.equal(e.maxHP-e.hp,135);
});
test('new scatter, mine, returning blade and pulse weapons deal damage and pulse clears bullets',()=>{
 for(const kind of ['scatter','mine','blade','pulse']){
  const f=peaceful(new Flight(44));f.p.hp=1e6;f.skills[kind]=4;f.timers.star=f.timers.missile=1e6;const e=f.spawn('thorn',kind==='mine'?5:100,0);e.hp=e.maxHP=1e6;e.timer=e.reinforce=1e6;
  f.hostiles=[{x:5,y:0,vx:0,vy:0,life:5,r:4,damage:1}];f.fireExtra(kind);
  if(kind==='pulse')assert.equal(f.hostiles.length,0);
  for(let i=0;i<240;i++){if(i%100===0)f.flap();f.tick();}
  assert.ok(f.damageStats[kind]>0,kind+' did no damage');
 }
 const f=peaceful(new Flight(8));f.skills.blade=1;f.spawn('elite',100,0);f.fireExtra('blade');f.bullets[0].life=1.1;f.bullets[0].hitIds.add(123);f.tickExpedition(.01);assert.equal(f.bullets[0].returning,true);assert.equal(f.bullets[0].hitIds.size,0);
});
test('relic combinations modify weapons, reward and defense, without double acquisition',()=>{
 const f=peaceful(new Flight(3));f.relics=['clock','prism','courier','fang'];f.skills.scatter=1;f.spawn('elite',250,0);
 assert.ok(f.cooldown<1);f.fireExtra('scatter');assert.equal(f.bullets.length,7);const before=f.xp;f.collect(1);assert.ok(f.xp-before>=1.2);
 f.relics=['mirror'];f.p.shield=1;const e=f.enemies[0];e.x=100;const hp=e.hp;f.damage(10);assert.ok(e.hp<hp);assert.equal(f.p.hp,f.p.maxHP);
});
test('new enemies heal allies, absorb shots, drop armed mines, split, and telegraph sniper fire',()=>{
 const f=peaceful(new Flight(2));f.p.hp=1e6;const guard=f.spawn('guard',250,0);guard.age=1;let hp=guard.hp;f.hit(guard,10);assert.ok(hp-guard.hp<10);
 const mender=f.spawn('mender',250,0);guard.hp=40;mender.timer=0;f.updateEnemy(mender,.01);assert.ok(guard.hp>40);
 const miner=f.spawn('miner',300,0);miner.timer=0;f.updateEnemy(miner,.01);assert.ok(f.hostiles.some(b=>b.mine&&b.arming>0));
 const splitter=f.spawn('splitter',200,0),count=f.enemies.length;f.hit(splitter,1e5);assert.equal(f.enemies.length,count+2);
 const sniper=f.spawn('sniper',300,0);sniper.timer=0;f.updateEnemy(sniper,.01);assert.ok(sniper.warn>.8);for(let i=0;i<110;i++)f.updateEnemy(sniper,.01);assert.ok(f.hostiles.some(b=>Math.hypot(b.vx,b.vy)>280));
});
test('sector modifiers affect density, gravity, terrain, repairs and reward',()=>{
 const f=new Flight(6,{routes:true});f.sectorMod='ruins';f.gateIndex=2;f.spawnGate();assert.equal(f.gates.length,4);assert.ok(f.gates[0].gap<238);
 const a=peaceful(new Flight(7)),b=peaceful(new Flight(7));b.sectorMod='gravity';a.tick();b.tick();assert.ok(b.p.vy>a.p.vy);
 f.p.hp=10;f.status='route';f.routeChoices=[{biome:1,mod:'haven'}];f.chooseRoute(0);assert.equal(f.p.hp,30);
 assert.equal(Object.keys(SECTOR_MODS).length,8);
});
test('contract bonus and relic discovery settle once and persist through normalization',()=>{
 const f=new Flight(5,{routes:true,contract:'hunt'});f.kills=120;f.time=60;f.status='dead';f.relics=['clock','pearl'];assert.equal(contractProgress(f),120);
 const tx=settleRun(normalizeRecord(),f);assert.equal(tx.contractBonus,25);assert.equal(tx.record.totalContracts,1);assert.equal(tx.record.relicCount,2);const again=settleRun(tx.record,f);assert.equal(again.reward,0);assert.equal(again.record.credits,tx.record.credits);
 const base=runReward(f);f.skills.salvage=3;f.relics.push('courier');assert.ok(runReward(f)>base*1.4);
});
test('expedition campaign can resolve all decisions and defeat each boss pattern in both orientations',()=>{
 const meta=Object.fromEntries(Object.entries(META).map(([k,u])=>[k,u.max]));
 const score=(f,k)=>k==='heart'?(f.p.hp<f.p.maxHP*.6?100:1):k==='shield'?(f.skills.shield?5:95):k==='armor'?(f.skills.armor<2?65:5):k==='missile'?(f.skills.missile<4?90:50):k==='split'?(f.skills.split<2?88:35):k==='beam'?(f.skills.beam<4?80:45):k==='power'?(f.skills.power<4?82:40):k==='tempo'?(f.skills.tempo<3?78:45):k==='magnet'?(f.skills.magnet<2?60:10):k==='orbit'?(f.skills.orbit<4?55:30):k==='storm'?50:k==='drone'?45:15;
 for(const view of [[1100,640],[390,840]])for(let variant=0;variant<3;variant++){
  const f=new Flight(17+variant,{chassis:'bastion',meta,routes:true});f.bossVariant=variant;f.setView(...view,true);let last=-1;
  for(let i=0;i<120*260&&!['dead','won'].includes(f.status);i++){
   if(f.status==='route'){let index=f.routeChoices.findIndex(r=>r.mod==='haven'||r.mod==='clear');f.chooseRoute(index<0?0:index);}
   if(f.status==='relic')f.chooseRelic(f.relicChoices[0]);
   if(f.status==='upgrade')f.choose([...f.choices].sort((a,b)=>score(f,b)-score(f,a))[0]);
   if(f.status==='loot')f.resumeLoot();
   if(f.time-last>.97){f.flap();last=f.time;}f.tick();f.events=[];
  }
  assert.equal(f.status,'won',JSON.stringify({view,variant,time:f.time,hp:f.p.hp,kills:f.kills,level:f.level,cause:f.lastDamage}));
  assert.equal(f.relics.length,4);assert.ok(f.hostiles.length<=350&&f.enemies.length<=190&&f.mines.length<=18);
 }
});

test('five optional weapon slots force a build choice while existing weapons remain upgradeable',()=>{
 const f=new Flight(3);for(const k of ['beam','orbit','storm','drone'])f.skills[k]=1;
 for(let i=0;i<30;i++)assert.ok(f.rollUpgrades().every(k=>!['scatter','mine','blade','pulse'].includes(k)));
 f.applyUpgrade('scatter');assert.equal(f.skills.scatter,0);f.applyUpgrade('beam');assert.equal(f.skills.beam,2);
});

test('specialist spawn caps prevent stacked sniper and repair formations',()=>{
 for(const biome of [0,1,2,3,4]){
  const f=new Flight(19,{routes:true});f.time=80;f.biomeIndex=biome;f.enemies=[];
  for(let i=0;i<25;i++)f.spawnWave();
  for(const [type,cap]of Object.entries({sniper:2,mender:2,miner:3,guard:3,splitter:4}))assert.ok(f.enemies.filter(e=>e.type===type).length<=cap,type);
 }
});
