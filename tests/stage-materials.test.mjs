import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,statSync,readFileSync} from 'node:fs';
import {MATERIALS,preloadMaterials,materialImage,materialStatus,paintRichScenery} from '../dist/stage-materials.mjs';
test('all six source art materials are bundled and large enough to be actual imagery',()=>{
  assert.deepEqual(MATERIALS.map(x=>x.id),['helios','nacre','prism','forge','citadel','rock']);
  for(const item of MATERIALS){
    const file='dist/assets/'+item.file;
    assert.ok(existsSync(file),file);
    assert.ok(statSync(file).size>250000,file+' is not the HD texture');
    assert.equal(readFileSync(file).toString('ascii',0,4),'RIFF');
  }
});
test('actual material layers render in five biomes under responsive cameras',async()=>{
  const Original=globalThis.Image;
  const count={draw:0,stroke:0};
  class ImageStub {
    constructor(){this.complete=false;this.naturalWidth=0;this.width=1024;this.height=1024;}
    set src(v){assert.ok(v.endsWith('.webp?v=lumen-4.2.0'));this.complete=true;this.naturalWidth=1024;this.onload?.();}
  }
  const context=()=>new Proxy({globalAlpha:1,filter:'none',createRadialGradient(){return {addColorStop(){}}}},{
    get(obj,k){
      if(k in obj)return obj[k];
      if(k==='drawImage')return (...a)=>{count.draw++;for(const x of a)if(typeof x==='number')assert.ok(Number.isFinite(x));};
      if(['fillRect','beginPath','ellipse','arc','moveTo','lineTo','bezierCurveTo','quadraticCurveTo','stroke','fill','save','restore','translate','rotate','scale','clip','closePath','rect','strokeRect'].includes(k))
        return (...a)=>{if(k==='stroke')count.stroke++;for(const x of a)if(typeof x==='number')assert.ok(Number.isFinite(x),k);};
      return undefined;
    },
    set(obj,k,v){obj[k]=v;return true;}
  });
  try{
    globalThis.Image=ImageStub;
    await preloadMaterials();
    assert.equal(materialStatus().loaded,6);
    for(let i=0;i<6;i++)assert.ok(materialImage(i));
    for(const [w,h] of [[1100,640],[390,844]])
      for(let i=0;i<5;i++)paintRichScenery(context(),w,h,{x:i*530,y:i*-640},i*30,i);
    assert.ok(count.draw>40,'textures not drawn: '+count.draw);
    assert.ok(count.stroke>2,'crystal/industrial boundaries missing');
  }finally{globalThis.Image=Original;}
});
