import test from 'node:test';
import assert from 'node:assert/strict';
import {Flight} from '../dist/model.mjs';
import {terrainPoints,circleHitsTerrain} from '../dist/terrain.mjs';
test('all five terrain silhouettes collide on the drawn body and leave their flight lane clear',()=>{
 for(let theme=0;theme<5;theme++)for(const [w,h] of [[1100,640],[390,840]]){
  const f=new Flight(71);f.setView(w,h,true);f.time=theme*30+5;f.gateIndex=2;f.spawnGate();
  assert.equal(f.gates.length,3);
  for(const g of f.gates){
   const rocks=f.rocks.filter(r=>r.gateId===g.id);
   for(const r of rocks){
    assert.ok(circleHitsTerrain({x:r.x,y:r.y,r:12.5},r));
    assert.ok(!circleHitsTerrain({x:g.x,y:g.center,r:12.5},r));
    assert.ok(terrainPoints(r).every(v=>v.every(Number.isFinite)));
   }
  }
  for(let i=0;i<f.gates.length-1;i++){
   const a=f.gates[i],b=f.gates[i+1];
   assert.ok(Math.abs(b.center-a.center)<a.gap-70,'adjacent lanes retain a wide common route');
  }
 }
});
