import test from 'node:test';
import assert from 'node:assert/strict';
import {Voyage,launchVector,predictRoute,isDanger,LEVELS,WORLD} from '../dist/model.mjs';
import {Logbook,normalize,SAVE_KEY} from '../dist/storage.mjs';
import {Inkscape} from '../dist/render.mjs';
const sail=(g,seconds)=>{for(let i=0;i<Math.round(seconds*120);i++)g.step(1/120);};
test('a four-flick voyage collects every light once, opens the port and completes the first sea',()=>{
 const g=new Voyage();let events=[];for(const target of [...g.level.lights,g.level.goal]){assert(g.launch({x:(target.x-g.boat.x)*1.72,y:(target.y-g.boat.y)*1.72}));sail(g,4);events.push(...g.drain());}
 assert.equal(g.state,'clear');assert.equal(g.lightCount,3);assert.equal(g.shots,4);assert.equal(g.tears,0);assert.equal(g.medals(),3);assert.equal(events.filter(e=>e.type==='light').length,3);assert.equal(events.filter(e=>e.type==='open').length,1);assert.equal(events.filter(e=>e.type==='clear').length,1);assert(!g.launch({x:500,y:0}));
});
test('touching ink returns to calm water without losing collected lights or repeating rewards',()=>{
 const g=new Voyage();g.launch({x:490,y:-34.4});sail(g,4);assert.equal(g.lightCount,1);g.drain();const safe={...g.boat};g.launch({x:(630-g.boat.x)*1.72,y:(475-g.boat.y)*1.72});sail(g,4);assert.equal(g.tears,1);assert.equal(g.lightCount,1);assert.equal(g.respawn,0);assert(!isDanger(g.level,g.boat.x,g.boat.y,g.time));assert(Math.hypot(g.boat.x-safe.x,g.boat.y-safe.y)<20);assert(!g.drain().some(e=>e.type==='light'));
});
test('aim strength is bounded, cancelled drags do not launch, and the paper edge softly reflects the boat',()=>{
 assert.equal(launchVector(3,2),null);const v=launchVector(999,-999);assert(Math.abs(Math.hypot(v.x,v.y)-1000)<1e-6);const g=new Voyage();assert(!g.launch(null));assert(!g.launch({x:NaN,y:0}));assert.equal(g.shots,0);g.launch({x:-1000,y:0});sail(g,4);assert(g.boat.x>=30);assert.equal(g.tears,0);assert.equal(g.state,'play');
});
test('a quick second flick is accepted immediately instead of silently dropping the new heading',()=>{
 const g=new Voyage();assert(g.launch({x:600,y:0}));g.step(1/120);assert(g.launch({x:0,y:-400}));assert.equal(g.shots,2);assert.equal(g.boat.vx,0);assert.equal(g.boat.vy,-400);
});
test('the dotted forecast stops at the same visible hazard as the simulation',()=>{
 const g=new Voyage(),v={x:800,y:250};const prediction=predictRoute(g,v);assert(prediction.hit);assert(prediction.points.at(-1).danger);g.launch(v);for(let i=0;i<600&&g.tears===0;i++)g.step(1/120);assert.equal(g.tears,1);const p=prediction.points.at(-1);assert(Math.hypot(g.boat.x-p.x,g.boat.y-p.y)<22);
});
test('all eight seas keep their lights and harbors reachable around the actual collision shapes',()=>{
 for(let index=0;index<LEVELS.length;index++)for(const time of [0,6,14]){
  const level=LEVELS[index],size=25,cols=Math.floor(WORLD.w/size)-1,rows=Math.floor(WORLD.h/size)-1;
  const point=(x,y)=>({x:25+x*size,y:25+y*size});const valid=(x,y)=>x>=0&&y>=0&&x<cols&&y<rows&&!isDanger(level,point(x,y).x,point(x,y).y,time,22);
  const sx=Math.round((level.start.x-25)/size),sy=Math.round((level.start.y-25)/size);assert(valid(sx,sy));const seen=new Set([sx+','+sy]),queue=[[sx,sy]];for(let at=0;at<queue.length;at++){const [x,y]=queue[at];for(const [dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy,key=nx+','+ny;if(!seen.has(key)&&valid(nx,ny)){seen.add(key);queue.push([nx,ny]);}}}
  for(const target of [...level.lights,level.goal])assert(queue.some(([x,y])=>Math.hypot(point(x,y).x-target.x,point(x,y).y-target.y)<32),`${index+1} at time ${time}: unreachable light/port ${target.x},${target.y}`);
 }
});
test('touch coordinates remain correct in landscape, portrait and iPhone safe areas',()=>{
 for(const [w,h,insets]of [[844,390,{}],[844,390,{left:44,right:44,bottom:21}],[390,844,{top:47,bottom:34}],[1363,936,{}]]){
  const r=Object.create(Inkscape.prototype);Object.assign(r,{w,h,insets});r.viewForGame();for(const p of [{x:0,y:0},{x:1440,y:620},{x:435,y:305}]){const s=r.screenPoint(p.x,p.y),q=r.worldPoint(s.x,s.y);assert(Math.abs(p.x-q.x)<1e-6);assert(Math.abs(p.y-q.y)<1e-6);assert(s.x>=0&&s.x<=w&&s.y>=0&&s.y<=h);}
 }
});
test('the new logbook keeps better voyages and never overwrites the old game save',()=>{
 const map=new Map([['nocturne-save','old journey']]),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v)};const b=new Logbook(storage);b.finish(0,{shots:4,tears:0,medals:3});b.finish(0,{shots:5,tears:0,medals:2});assert.equal(b.data.best[0].shots,4);b.finish(7,{shots:8,tears:0,medals:3});assert.equal(b.data.last,7);const reloaded=new Logbook(storage);assert.equal(reloaded.data.best[7].medals,3);assert.equal(map.get('nocturne-save'),'old journey');assert(map.has(SAVE_KEY));
});
test('corrupt or unavailable storage leaves a playable fresh logbook',()=>{
 const b=new Logbook({getItem:()=>'{broken',setItem:()=>{throw Error('blocked');}});assert(b.failed);assert.equal(b.data.last,0);assert(!b.save());assert.equal(normalize({last:99,best:[{shots:-1}]}).best[0],null);assert.equal(normalize({last:99}).last,7);
});
