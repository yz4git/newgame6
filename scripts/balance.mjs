import {Flight} from '../dist/model.mjs';
import {META} from '../dist/catalog.mjs';
const meta=Object.fromEntries(Object.entries(META).map(([k,u])=>[k,u.max]));
function pick(f){return [...f.choices].sort((a,b)=>score(f,b)-score(f,a))[0];}
function score(f,k){if(k==='heart')return f.p.hp<f.p.maxHP*.6?100:1;if(k==='shield')return f.skills.shield?5:95;if(k==='armor')return f.skills.armor<2?65:5;if(k==='missile')return f.skills.missile<4?90:50;if(k==='split')return f.skills.split<2?88:35;if(k==='beam')return f.skills.beam<4?80:45;if(k==='power')return f.skills.power<4?82:40;if(k==='tempo')return f.skills.tempo<3?78:45;if(k==='magnet')return f.skills.magnet<2?60:10;if(k==='orbit')return f.skills.orbit<4?55:30;if(k==='storm')return 50;if(k==='drone')return 45;return 15;}
for(const view of [[1100,640],[390,840]])for(const campaign of [false,true])for(const seed of [17,104,302]){
 const f=new Flight(seed,{chassis:campaign?'bastion':'lancer',meta:campaign?meta:{}});f.setView(...view,true);let lastFlap=-1;
 for(let step=0;step<120*245&&!['dead','won'].includes(f.status);step++){
  if(f.status==='upgrade')f.choose(pick(f));if(f.status==='loot')f.resumeLoot();
  if(f.time-lastFlap>=.97){f.flap();lastFlap=f.time;}f.tick();f.events=[];
 }
 console.log(JSON.stringify({view,campaign,seed,status:f.status,time:Math.round(f.time),kills:f.kills,level:f.level,hp:f.p.hp,bossHP:f.boss?Math.round(f.boss.hp):null,revives:f.revivesUsed,chests:f.chestCount,evo:Object.keys(f.evolutions).filter(k=>f.evolutions[k]),damage:f.damageTaken}));
}
