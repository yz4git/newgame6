// Explicit, local-only fixtures. No QA controls are shipped in dist.
import { start } from './app.mjs?v=lumen-4.3.0';
import { Flight } from './model.mjs?v=lumen-4.3.0';
document.body.dataset.qaReady='yes';
addEventListener('message', e => {
  document.body.dataset.qaMessage=JSON.stringify({origin:e.origin,here:location.origin,data:e.data});
  if (e.origin !== location.origin || !e.data.wingQA) return;
  if(e.data.wingQA==='reset'){try{localStorage.removeItem('lumen-wing-v1');}catch{}location.reload();return;}
  const f = new Flight(51); f.setView(innerWidth / innerHeight * (innerWidth < innerHeight ? 840 : 640), innerWidth < innerHeight ? 840 : 640, true);
  if(e.data.wingQA==='corridor'){
    f.expedition=true;f.enemies=[];f.time=20;f.gateIndex=2;f.spawnGate();
    const first=f.gates[0],shift=first.x-f.p.x-f.view.w*.38;
    for(const g of f.gates){g.x-=shift;g.exit-=shift;}
    for(const r of f.rocks)r.x-=shift;
    f.p.y=first.center;f.skills.shield=1;f.p.shield=1;f.spawnTimer=f.gateTimer=f.nextElite=f.nextSwarm=1000;f.setView(f.view.w,f.view.h,true);start(f);return;
  }
  if(['route','relic','arsenal','newboss'].includes(e.data.wingQA)){
    f.expedition=true;f.p.hp=f.p.maxHP=200;f.enemies=[];
    if(e.data.wingQA==='route'||e.data.wingQA==='relic'){f.time=30;f.currentPhase=1;f.beginRoute();if(e.data.wingQA==='relic')f.chooseRoute(0);}
    else{
      Object.assign(f.skills,{power:3,tempo:3,scatter:4,mine:4,blade:4,pulse:4,missile:3,beam:3,drone:3,shield:2,armor:2});
      f.relics=['prism','ember','echo'];f.level=12;f.xpNeed=300;f.time=75;f.currentPhase=2;f.biomeIndex=2;
      for(let i=0;i<9;i++)f.spawn(['guard','miner','mender','splitter','sniper'][i%5],180+i*45,(i%3-1)*100);
      if(e.data.wingQA==='newboss'){f.time=150;f.currentPhase=4;f.bossVariant=1;f.tick();}
    }
    start(f);return;
  }
  if(e.data.wingQA.startsWith('art-')){
    const stage=Number(e.data.wingQA.slice(4));f.time=stage*30+12;f.gateIndex=2;f.expedition=true;f.biomeIndex=stage;f.enemies=[];f.spawnGate();
    const base=f.gates[0];const shift=base.x-f.p.x-f.view.w*.43;
    for(const g of f.gates)g.hazardPhase=1.7-(f.time%3.6);
    for(const g of f.gates)g.x-=shift;for(const r of f.rocks)r.x-=shift;
    f.p.y=base.center;f.setView(f.view.w,f.view.h,true);
    for(let i=0;i<5;i++)f.spawn(['wisp','ray','thorn','elite','wisp'][i],f.p.x+f.view.w*(.13+i*.095),f.p.y-45+(i%2)*95);
    start(f);f.status='qaStill';return;
  }
  if(e.data.wingQA.startsWith('impact-')){
    f.expedition=true;f.time=17;f.gateIndex=2;f.biomeIndex=0;f.enemies=[];f.spawnGate();
    const gate=f.gates[0],shift=gate.x-f.p.x-f.view.w*.48;
    for(const g of f.gates){g.x-=shift;g.hazardPhase=1.7-(f.time%3.6);}
    for(const r of f.rocks)r.x-=shift;
    f.p.y=gate.center;f.setView(f.view.w,f.view.h,true);
    start(f);
    if(e.data.wingQA==='impact-shield'){f.p.shield=1;f.damage(23,'浮遊装甲への接触');}
    else if(e.data.wingQA==='impact-hazard')f.damage(19,'恒星噴出口への接触');
    else f.damage(23,'浮遊装甲への接触');
    f.status='qaStill';
    return;
  }
  if(['gate','gate2','gate3'].includes(e.data.wingQA)){f.time=e.data.wingQA==='gate'?74:e.data.wingQA==='gate2'?94:134;f.nextSwarm=200;f.nextElite=200;f.enemies=[];f.spawnGate();const gate=f.gates.at(-1);gate.x=f.p.x+f.view.w*.65;f.p.y=gate.center;for(const r of f.rocks.filter(r=>r.gateId===gate.id)){r.x=gate.x;r.y=gate.center+r.side*(gate.gap/2+r.ry+16);}f.setView(f.view.w,f.view.h,true);}
  else if(e.data.wingQA==='evolve'){f.skills.missile=4;f.skills.split=2;f.openChest();}
  else if (e.data.wingQA === 'upgrade') { f.collect(7); }
  else if (['boss','won'].includes(e.data.wingQA)) { f.time = 149.95; f.nextSwarm = 200; f.nextElite=200; Object.assign(f.skills,{power:4,tempo:3,split:3,orbit:3,storm:3,magnet:2,heart:2,missile:4,beam:3,drone:2,armor:2,shield:2}); f.p.hp=140; f.p.maxHP=140; f.level=16; f.xpNeed=82; }
  else {
    f.time = 60; f.nextSwarm = 84; f.nextElite=72; f.level = 8; Object.assign(f.skills,{power:3,tempo:3,split:2,orbit:3,storm:3,magnet:2,heart:1,missile:4,beam:3,drone:2,armor:2,shield:1});f.evolutions.ragnarok=true;f.evolutions.aegis=true; f.xpNeed=42; f.p.maxHP=120; f.p.hp=100; f.p.y=-240;
    f.enemies=[];for(let i=0;i<14;i++)f.spawn(i%4===0?'thorn':i%3===0?'ray':'wisp',120+(i%5)*125,-440+Math.floor(i/5)*160);
    f.spawn('elite',500,-190);f.rocks.push({id:200,x:730,y:-650,rx:50,ry:210,phase:4});f.rocks.push({id:201,x:730,y:40,rx:50,ry:210,phase:9});
    for(let i=0;i<9;i++)f.gems.push({x:150+i*34,y:-250+Math.sin(i)*60,value:1,age:0,pull:false});
  }
  start(f);
  if (e.data.wingQA === 'dead') {f.time=95;f.kills=100;f.eliteKills=1;f.evolutions.ragnarok=true;f.damage(1000);}
  if (e.data.wingQA === 'won') { f.tick(.04); f.tick(.04); f.hit(f.boss,100000); }
});
