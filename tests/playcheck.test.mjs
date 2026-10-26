import test from 'node:test';
import assert from 'node:assert/strict';
import {Flight} from '../dist/model.mjs';
import {terrainTiles,circleHitsTerrain} from '../dist/terrain.mjs';
const peaceful=f=>{f.spawnTimer=f.gateTimer=f.nextSwarm=f.nextElite=1e6;f.enemies=[];return f;};
test('continuous walls retain a real collision thousands of units above and below the opening',()=>{
 for(let theme=0;theme<5;theme++){
  const f=new Flight(12,{routes:true});f.biomeIndex=theme;f.spawnGate();const gate=f.gates[0];
  for(const side of [-1,1]){
   const wall=f.rocks.find(r=>r.side===side);assert.equal(wall.wall,true);
   for(const offset of [0,1000,5000,20000]){
    const y=wall.y+side*offset;
    assert.ok(circleHitsTerrain({x:wall.x,y,r:12.5},wall),'wall gap at '+theme+'/'+offset);
    const tiles=terrainTiles(wall,y-420,y+420);assert.ok(tiles.length<=7,'unbounded geometry');
   }
   assert.ok(!circleHitsTerrain({x:gate.x,y:gate.center,r:12.5},wall));
  }
 }
});
test('gate reward waits for the entire ship to clear the widest terrain',()=>{
 const f=peaceful(new Flight(30,{routes:true}));f.biomeIndex=4;f.spawnGate();const gate=f.gates[0];f.p.y=gate.center;
 f.p.x=gate.x+96;f.tick();assert.equal(f.gateDodges,0);
 f.p.x=gate.exit+1;f.tick();assert.equal(f.gateDodges,1);
});
test('offscreen snipers cannot start warning or fire; entering view permits a full telegraph',()=>{
 const f=peaceful(new Flight(4));const sniper=f.spawn('sniper',f.camera.x+f.view.w+150,0);sniper.timer=0;
 f.updateEnemy(sniper,.01);assert.equal(sniper.warn,0);f.enemyShot(sniper,Math.PI);assert.equal(f.hostiles.length,0);
 sniper.x=300;sniper.y=0;f.updateEnemy(sniper,.01);assert.ok(sniper.warn>.9);assert.equal(f.hostiles.length,0);
 for(let i=0;i<100;i++)f.updateEnemy(sniper,.01);assert.equal(f.hostiles.length,1);
});
test('experience follows sustained vertical flight and reaches the player before expiring',()=>{
 const f=peaceful(new Flight(42));f.gems=[{x:600,y:-350,value:2,kind:'xp',age:0,pull:false}];
 for(let i=0;i<120*5;i++){f.tick();f.events=[];}
 assert.equal(f.totalXP,2);assert.equal(f.gems.length,0);
});

test('boss hull fits beside the player in portrait and relayouts safely after rotation',()=>{
 const f=peaceful(new Flight(6));f.setView(1100,640,true);f.bossSpawned=true;f.boss=f.spawn('boss',430,0);f.setView(390,840,true);
 assert.ok(f.boss.r<88);const half=f.boss.r*1.525;
 assert.ok(f.boss.x-f.camera.x+half<=f.view.w-20);
 assert.ok(f.boss.x-half>f.p.x+43);
 for(let i=0;i<240;i++)f.tick();
 assert.ok(f.boss.x-half>f.p.x+43,'forward scrolling must not drag the boss into the player');
 assert.ok(f.boss.x-f.camera.x+half<=f.view.w-20);
 f.setView(1100,640,true);assert.equal(f.boss.r,88);
});
