import test from 'node:test';
import assert from 'node:assert/strict';
import {STAGES,SECTOR_SECONDS,stageIndex,paintStageBackdrop} from '../dist/stage-art.mjs';

function mockContext(){
  const log={};
  const ctx=new Proxy({globalAlpha:1,createLinearGradient(){return {addColorStop(){}}},createRadialGradient(){return {addColorStop(){}}}},{
    get(target,key){
      if(key in target)return target[key];
      if(['fillRect','strokeRect','beginPath','ellipse','arc','moveTo','lineTo','quadraticCurveTo','bezierCurveTo','stroke','fill','save','restore','translate','rotate','scale','clip','closePath'].includes(key))
        return (...args)=>{log[key]=(log[key]||0)+1;for(const n of args)if(typeof n==='number')assert.ok(Number.isFinite(n),key+' received non-finite value');};
      return undefined;
    },
    set(target,key,value){target[key]=value;return true;}
  });
  return {ctx,log};
}
test('five different named sectors with exact temporal bounds',()=>{
  assert.equal(STAGES.length,5);assert.equal(SECTOR_SECONDS,30);
  assert.equal(new Set(STAGES.map(s=>s.id)).size,5);
  for(let i=0;i<5;i++){assert.equal(stageIndex(i*30),i);assert.equal(stageIndex(i*30+29.99),i);}
  assert.equal(stageIndex(150),4);assert.equal(stageIndex(-50),0);
});
test('all sectors draw in landscape and portrait, at different altitudes and during transitions',()=>{
  const {ctx,log}=mockContext();
  for(const [w,h] of [[1130,640],[390,844]]){
    for(const t of [0,15,30,31,60,62,90,92,120,121,150]){
      for(const y of [-3500,-350,2500]){
        paintStageBackdrop(ctx,w,h,{x:t*155,y},t,t,false);
      }
    }
  }
  assert.ok(log.fillRect>200,'painted layered environments');
  assert.ok(log.stroke>100,'painted structures');
  assert.ok(log.bezierCurveTo>10,'painted nacre coral');
  assert.ok(log.ellipse>10,'painted orbital and stellar shapes');
});
