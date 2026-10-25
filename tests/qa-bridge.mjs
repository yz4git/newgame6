// Explicit, local-only fixtures. No QA controls are shipped in dist.
import { start } from './app.mjs?v=lumen-1.0.0';
import { Flight } from './model.mjs?v=lumen-1.0.0';
document.body.dataset.qaReady='yes';
addEventListener('message', e => {
  document.body.dataset.qaMessage=JSON.stringify({origin:e.origin,here:location.origin,data:e.data});
  if (e.origin !== location.origin || !e.data.wingQA) return;
  if(e.data.wingQA==='reset'){try{localStorage.removeItem('lumen-wing-v1');}catch{}location.reload();return;}
  const f = new Flight(51); f.setView(innerWidth / innerHeight * (innerWidth < innerHeight ? 840 : 640), innerWidth < innerHeight ? 840 : 640, true);
  if (e.data.wingQA === 'upgrade') { f.collect(7); }
  else if (['boss','won'].includes(e.data.wingQA)) { f.time = 149.95; f.nextSwarm = 200; f.skills = {power:3,tempo:3,split:2,orbit:2,storm:2,magnet:1,heart:2}; f.p.hp=140; f.p.maxHP=140; f.level=16; f.xpNeed=82; }
  else {
    f.time = 60; f.level = 8; f.skills = {power:2,tempo:2,split:1,orbit:2,storm:2,magnet:1,heart:1}; f.xpNeed=42; f.p.maxHP=120; f.p.hp=100; f.p.y=-240;
    f.enemies=[];for(let i=0;i<14;i++)f.spawn(i%4===0?'thorn':i%3===0?'ray':'wisp',120+(i%5)*125,-440+Math.floor(i/5)*160);
    f.spawn('elite',500,-190);f.rocks.push({id:200,x:730,y:-650,rx:50,ry:210,phase:4});f.rocks.push({id:201,x:730,y:40,rx:50,ry:210,phase:9});
    for(let i=0;i<9;i++)f.gems.push({x:150+i*34,y:-250+Math.sin(i)*60,value:1,age:0,pull:false});
  }
  start(f);
  if (e.data.wingQA === 'dead') f.damage(1000);
  if (e.data.wingQA === 'won') { f.tick(.04); f.tick(.04); f.hit(f.boss,100000); }
});
