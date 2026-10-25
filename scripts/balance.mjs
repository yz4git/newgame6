import { Flight } from '../dist/model.mjs';
for (const view of [[1100,640],[390,840]]) {
 for (const seed of [17,104,302]) {
  const f=new Flight(seed); f.setView(...view,true); let previousFlap=-1,steps=0;
  for(;steps<120*250 && !['dead','won'].includes(f.status);steps++) {
   if(f.status==='upgrade') { const order=['storm','split','tempo','orbit','power','heart','magnet']; f.choose([...f.choices].sort((a,b)=>order.indexOf(a)-order.indexOf(b))[0]); }
   if(f.time-previousFlap>=.97) {f.flap();previousFlap=f.time;}
   f.tick(); f.events=[];
  }
  console.log(JSON.stringify({view,seed,status:f.status,time:Math.round(f.time),kills:f.kills,level:f.level,hp:f.p.hp,boss:f.boss?.hp,skills:f.skills}));
 }
}
