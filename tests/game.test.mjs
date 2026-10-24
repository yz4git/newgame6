import test from 'node:test';
import assert from 'node:assert/strict';
import {GameModel,ROOMS,FLOOR,validateSave,freshProgress} from '../dist/model.mjs';
const step=(g,seconds,input={})=>{for(let i=0;i<Math.round(seconds*60);i++)g.update(1/60,input);};
test('double jump, one-way landing, coyote time and drop-through keep the route playable',()=>{
 const g=new GameModel();step(g,.1,{jump:true});const first=g.player.y;assert(first<FLOOR-30);step(g,.12,{});step(g,.1,{jump:true});assert.equal(g.player.jumps,2);assert(g.player.y<first);step(g,2,{});assert.equal(g.player.y,FLOOR);assert.equal(g.player.jumps,0);
 g.player.x=650;g.player.y=440;g.player.vy=150;step(g,.3,{});assert.equal(g.player.y,475);assert(g.player.grounded);step(g,.35,{down:true});assert(g.player.y>480);
});
test('attacks hit once per swing; buffered dodge survives hit-stop and cancels an attack',()=>{
 const g=new GameModel();g.player.x=690;g.player.inv=0;const e=g.enemies[0];e.x=800;e.cool=99;step(g,.24,{attack:true});assert.equal(e.hp,51);step(g,.05,{attack:true});assert.equal(e.hp,51);
 g.freeze=.05;step(g,1/60,{dash:true});step(g,.09,{});assert(g.player.dash>0);assert.equal(g.player.attack,0);const hp=g.player.hp;g.hurt(30,1);assert.equal(g.player.hp,hp);
});
test('perfect dodge grants mana once per dash; difficulty changes received damage',()=>{
 const g=new GameModel();g.player.mp=20;g.player.inv=0;step(g,1/60,{dash:true});g.hurt(30,1);const mp=g.player.mp;assert(mp>34);g.hurt(30,1);assert.equal(g.player.mp,mp);
 g.player.dash=0;g.player.inv=0;g.options.difficulty='story';g.hurt(30,1);assert.equal(g.player.hp,82);
});
test('lancer shields have counterplay through rear hits, combo finishers, and magic',()=>{
 const g=new GameModel();g.enter(1);const e=g.enemies.find(e=>e.type==='lancer');e.dir=-1;g.hit(e,30,1);assert.equal(e.hp,e.maxHp-11);e.hp=e.maxHp;e.state='idle';g.hit(e,30,-1);assert.equal(e.hp,e.maxHp-30);
 e.hp=e.maxHp;e.state='idle';g.hit(e,30,1,false,true);assert.equal(e.hp,e.maxHp-30);e.hp=e.maxHp;e.state='idle';g.hit(e,30,1,true);assert.equal(e.hp,e.maxHp-30);
});
test('both seals gate the sanctum; a new approach checkpoint makes boss retries safe',()=>{
 const g=new GameModel();g.enter(1,2395);step(g,1,{right:true});assert.equal(g.room.id,1);g.progress.seals=['tide','bell'];step(g,.2,{right:true});assert.equal(g.room.id,4);
 g.player.inv=0;g.hurt(999,1);assert.equal(g.state,'dead');g.retry();assert.equal(g.room.id,4);assert(g.player.x<700);assert.equal(g.progress.deaths,1);assert.deepEqual(g.progress.seals,['tide','bell']);assert.equal(g.player.hp,g.maxHp);
});
test('all raised paths remain reachable through actual jumps and lateral movement',()=>{
 for(const id of [1,2,3]){const g=new GameModel();g.enter(id);g.enemies=[];g.hazards=[];g.progress.wardens=['tide','bell'];let previous=null;
  for(const plat of g.room.platforms){g.player.x=previous?previous.x+previous.w-30:plat.x-90;g.player.y=previous?previous.y:FLOOR;g.player.vy=0;g.player.jumps=0;g.player.grounded=true;g.prev={};const target=plat.x+plat.w/2;
   for(let frame=0;frame<120;frame++){const jump=frame<19||(frame>=20&&frame<48);g.update(1/60,{right:g.player.x<target,jump});}
   assert.equal(g.player.y,plat.y,`room ${id} ledge ${plat.x},${plat.y}`);previous=plat;
  }
  const seal=g.items.find(i=>i.type==='seal');if(seal)assert(g.progress.seals.includes(seal.id));
 }
});
test('a warden unlocks its seal and does not respawn after save and reload',()=>{
 const g=new GameModel();g.enter(2,2270,260);g.player.inv=100;step(g,.1);assert.equal(g.progress.seals.length,0);const w=g.enemies.find(e=>e.warden==='tide');g.hit(w,1000,1,true);step(g,.1);assert.deepEqual(g.progress.seals,['tide']);
 const loaded=new GameModel(g.saveData());assert(!loaded.enemies.some(e=>e.warden));assert(loaded.items.find(i=>i.type==='seal').taken);
});
test('shrine economy cannot overspend or upgrade remotely, and travel requires an unlocked shrine',()=>{
 const g=new GameModel();g.progress.gold=100;assert(!g.purchase('edge'));step(g,.1);g.rest();assert(g.purchase('edge'));assert.equal(g.progress.gold,0);assert.equal(g.damage,30);assert(!g.purchase('edge'));assert(!g.travel(3));g.progress.shrines.push(3);assert(g.travel(3));assert.equal(g.room.id,3);assert.equal(g.player.hp,g.maxHp);assert.equal(g.player.mp,g.maxMp);
});
test('old saves migrate with inventory intact and malformed fields are bounded',()=>{
 assert.equal(validateSave({version:1,room:99}),null);const save=validateSave({version:1,room:2,x:200,y:590,seals:['tide','tide','bad'],gold:200,relic:true,bossDefeated:'false',level:3.5,upgrades:{edge:999}});
 assert.equal(save.version,2);assert.deepEqual(save.seals,['tide']);assert.deepEqual(save.wardens,['tide']);assert.equal(save.gold,200);assert.equal(save.level,3);assert.equal(save.upgrades.edge,3);assert.equal(save.bossDefeated,false);
 const approach=validateSave({...freshProgress(),room:4,x:1200});assert.equal(approach.room,4);assert.equal(approach.x,270);
});
test('new enemy attacks have a visible windup and can damage the player',()=>{
 for(const type of ['wraith','acolyte','lancer']){const g=new GameModel();g.enter(type==='acolyte'?0:1);const e=g.enemies.find(e=>e.type===type);assert(e);g.enemies=[e];g.player.x=e.x-100;g.player.y=e.y;g.player.inv=0;e.cool=0;step(g,.05);assert.equal(e.state,'windup',type);assert.equal(g.player.hp,g.maxHp,type);step(g,1.8);assert(g.player.hp<g.maxHp,type+' eventually attacks');}
});
test('hazards warn before activation and dash invulnerability applies to them',()=>{
 const g=new GameModel();g.enter(2);g.enemies=[];const h=g.hazards[0];g.hazards=[h];g.player.x=h.x+40;g.player.inv=0;g.time=h.period-1-h.offset;g.updateHazards();assert(h.warn>0);assert(!h.active);assert.equal(g.player.hp,g.maxHp);
 g.time=h.period-.2-h.offset;g.updateHazards();assert(h.active);assert(g.player.hp<g.maxHp);g.player.inv=0;g.player.dash=.2;const hp=g.player.hp;g.updateHazards();assert.equal(g.player.hp,hp);
});
test('boss runs all three attacks, transitions phase, and victory stays saved',()=>{
 const g=new GameModel();g.progress.seals=['tide','bell'];g.enter(4,800);g.player.inv=100;const boss=g.enemies[0],states=new Set();for(let i=0;i<1100;i++){g.update(1/60,{});states.add(boss.state);}for(const state of ['chant','strike','summon','recover'])assert(states.has(state),state);
 g.hit(boss,500,1,true);step(g,.05);assert.equal(boss.state,'transform');assert.equal(g.bossPhase,2);step(g,2);assert.notEqual(boss.state,'transform');g.hit(boss,1000,1,true);step(g,3.5);assert.equal(g.state,'victory');assert(g.progress.bossDefeated);const loaded=new GameModel(g.saveData());loaded.enter(4);assert.equal(loaded.enemies.length,0);
});

test('dodge stops without an extra slide and can turn out of an attack',()=>{
 const g=new GameModel();g.enemies=[];const x=g.player.x;step(g,.02,{dash:true});step(g,.7,{});const distance=g.player.x-x;assert(distance>160&&distance<205,'dodge distance '+distance);
 g.player.dir=1;g.player.attack=.2;g.player.attackTotal=.36;g.player.dashCd=0;g.prev={};step(g,.02,{left:true,dash:true});assert.equal(g.player.dir,-1);assert(g.player.vx<0);assert.equal(g.player.attack,0);
});
test('late dodge inputs and magic pressed during dodge are buffered rather than lost',()=>{
 const g=new GameModel();g.enemies=[];g.player.dashCd=.1;step(g,.02,{dash:true});step(g,.12,{});assert(g.player.dash>0);
 g.prev={};step(g,.02,{magic:true});assert(g.player.magicBuffer>0);step(g,.3,{});assert(g.player.mp<90);assert(g.shots.some(s=>!s.enemy));
});
