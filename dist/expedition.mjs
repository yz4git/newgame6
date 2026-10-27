import {CHASSIS,MODS,RELICS,SECTOR_MODS,CONTRACTS} from './catalog.mjs?v=lumen-4.4.0';
const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export const expeditionMethods={
 initExpedition(options){
  this.expedition=options.routes===true;this.mod=MODS[options.mod]?options.mod:'standard';this.contract=CONTRACTS[options.contract]?options.contract:'survey';
  this.biomeIndex=0;this.visited=[0];this.sectorMod='clear';this.routeChoices=[];this.relicChoices=[];this.relics=[];this.mines=[];
  this.sectorRewards=1;this.sectorCount=1;this.sectorTimer=15;this.bossVariant=Math.floor(this.choiceRand()*3);
  this.extraTimers={scatter:.5,mine:1,blade:1.2,pulse:2};this.contractPaid=false;
  if(this.chassis==='alchemist')this.skills.magnet=1;
  if(this.chassis==='tempest')this.skills.armor=1;
  if(this.chassis==='echo')this.skills.tempo=1;
  if(this.mod==='glass')this.p.maxHP=Math.round(this.p.maxHP*.75);
  if(this.mod==='battery'){this.skills.shield=1;this.p.shield=1;}
  if(this.mod==='recycler'){this.skills.magnet=2;this.skills.salvage=1;}
  if(this.mod==='fortress'){this.p.maxHP+=35;this.skills.armor=1;}
  if(this.mod==='thermal')this.skills.frost=2;
  this.p.hp=this.p.maxHP;if(this.meta.capacitors)this.p.shield=1;
 },
 getBiome(){return this.expedition?this.biomeIndex:Math.min(4,Math.floor(this.time/30));},
 hasRelic(key){return this.relics.includes(key);},
 beginRoute(){
  const unused=[0,1,2,3,4].filter(n=>!this.visited.includes(n));
  const mods=Object.keys(SECTOR_MODS);this.routeChoices=[];
  const biomes=unused.length?[...unused]:[0,1,2,3,4].filter(n=>n!==this.biomeIndex);
  for(let i=biomes.length-1;i>0;i--){const j=Math.floor(this.choiceRand()*(i+1));[biomes[i],biomes[j]]=[biomes[j],biomes[i]];}
  for(let i=0;i<3;i++){
   const biome=biomes[i%biomes.length];
   let mod=mods[Math.floor(this.choiceRand()*mods.length)];while(this.routeChoices.some(r=>r.mod===mod))mod=mods[(mods.indexOf(mod)+1)%mods.length];
   this.routeChoices.push({biome,mod});
  }
  this.status='route';this.emit('route');
 },
 chooseRoute(index){
  if(this.status!=='route'||!this.routeChoices[index])return false;
  const route=this.routeChoices[index];this.biomeIndex=route.biome;this.visited.push(route.biome);this.sectorMod=route.mod;
  this.sectorRewards+=SECTOR_MODS[route.mod].reward;this.sectorCount++;this.routeChoices=[];
  this.enemies=[];this.hostiles=[];this.rocks=[];this.gates=[];this.mines=[];this.gateTimer=3;this.spawnTimer=1;this.sectorTimer=14;
  this.p.hp=Math.min(this.p.maxHP,this.p.hp+this.meta.logistics*4+(this.hasRelic('pearl')?12:0)+(route.mod==='haven'?20:0));
  this.p.hurt=1.5;this.emit('sectorChosen',{biome:route.biome,mod:route.mod});
  const pool=Object.keys(RELICS).filter(k=>!this.hasRelic(k));this.relicChoices=[];
  while(this.relicChoices.length<3&&pool.length)this.relicChoices.push(pool.splice(Math.floor(this.choiceRand()*pool.length),1)[0]);
  if(this.relicChoices.length)this.status='relic';else this.continueRun();return true;
 },
 chooseRelic(key){
  if(this.status!=='relic'||!this.relicChoices.includes(key))return false;
  this.relics.push(key);this.relicChoices=[];if(key==='pearl'){this.p.maxHP+=25;this.p.hp=Math.min(this.p.maxHP,this.p.hp+25);}
  this.emit('relicChosen',{key});this.continueRun();return true;
 },
 fireExtra(kind){
  const lv=this.skills[kind];if(!lv)return;const targets=this.targets(850),p=this.p;
  if(kind==='mine'){
   const evo=this.evolutions.singularity;
   this.mines.push({x:p.x-24,y:p.y,age:0,life:evo?7:5,radius:(evo?150:75+lv*9)*(this.hasRelic('ember')?1.35:1),damage:(25+lv*16)*this.power*(this.hasRelic('ember')?1.15:1),evo});
   return;
  }
  if(kind==='pulse'){
   const evo=this.evolutions.eventhorizon,r=(100+lv*18+(evo?100:0))*(this.hasRelic('echo')?1.25:1);
   this.explode(p.x,p.y,r,(15+lv*13)*(evo?1.6:1)*this.power,'pulse');
   this.hostiles=this.hostiles.filter(b=>Math.hypot(b.x-p.x,b.y-p.y)>r);
   if(evo)p.hp=Math.min(p.maxHP,p.hp+2);this.emit('guard');return;
  }
  if(!targets.length)return;const e=targets[0],a=Math.atan2(e.y-p.y,e.x-p.x);
  if(kind==='scatter'){
   const evo=this.evolutions.supernova,n=4+lv+(evo?5:0)+(this.hasRelic('prism')?2:0);
   for(let i=0;i<n;i++)this.projectile('scatter',p.x+35,p.y,a+(i-(n-1)/2)*.09,680,(7+lv*3)*(evo?1.5:1)*this.power,null,this.skills.pierce+(evo?2:0));
   this.emit('shot');
  }
  if(kind==='blade'){
   const evo=this.evolutions.ouroboros,n=evo?3:1+Math.floor(lv/3);
   for(let i=0;i<n;i++){
    this.projectile('blade',p.x+20,p.y,a+(i-(n-1)/2)*.3,430,(12+lv*6)*this.power*(this.hasRelic('echo')?1.35:1),null,99);
    const b=this.bullets.at(-1);b.life=2.3;b.returning=false;b.turn=0;
   }
  }
 },
 tickExpedition(dt){
  for(const kind of ['scatter','mine','blade','pulse']){
   this.extraTimers[kind]-=dt;
   if(this.extraTimers[kind]<=0){this.fireExtra(kind);this.extraTimers[kind]=({scatter:1.1,mine:1.5,blade:1.7,pulse:3.8}[kind])*(1-this.skills[kind]*.055)*this.cooldown;}
  }
  for(const m of this.mines){
   m.age+=dt;m.life-=dt;
   if(m.evo)for(const e of this.enemies)if(e.hp>0&&e.type!=='boss'&&e.type!=='elite'&&Math.hypot(e.x-m.x,e.y-m.y)<m.radius*1.6){e.x+=(m.x-e.x)*dt*.8;e.y+=(m.y-e.y)*dt*.8;}
   if(m.age>.4&&this.enemies.some(e=>e.hp>0&&Math.hypot(e.x-m.x,e.y-m.y)<m.radius*.65)){this.explode(m.x,m.y,m.radius,m.damage,'mine');m.life=0;}
  }
  this.mines=this.mines.filter(m=>m.life>0&&m.x>this.p.x-this.view.w*.6).slice(-18);
  for(const b of this.bullets)if(b.kind==='blade'){
   if(b.life<1.25){if(!b.returning){b.returning=true;b.hitIds.clear();}const a=Math.atan2(this.p.y-b.y,this.p.x-b.x);b.vx=Math.cos(a)*510;b.vy=Math.sin(a)*510;if(Math.hypot(b.x-this.p.x,b.y-this.p.y)<22)b.life=0;}
  }
  if(this.expedition&&this.sectorMod==='armada'&&!this.bossSpawned){this.sectorTimer-=dt;if(this.sectorTimer<=0){this.spawn('elite',this.p.x+this.view.w*.7,this.p.y-100);this.sectorTimer=20;this.emit('eliteIncoming');}}
 },
 updateSpecialEnemy(e,dt){
  if(!['guard','miner','mender','splitter','sniper'].includes(e.type))return false;
  const p=this.p,dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;
  e.age+=dt;e.hit=Math.max(0,e.hit-dt);e.orbitHit=Math.max(0,e.orbitHit-dt);e.timer-=dt;
  const slow=(e.slowUntil>this.time?1-this.skills.frost*.15:1)*(this.sectorMod==='gravity'?.85:1);
  e.x+=(e.type==='sniper'?70:(60+dx/d*e.speed))*dt*slow;
  e.y+=(e.type==='splitter'?Math.sin(e.age*3+e.phase)*95:clamp(dy*.45,-80,80))*dt*slow;
  if(e.type==='mender'&&e.timer<=0){
   for(const ally of this.enemies)if(ally!==e&&ally.hp>0&&ally.type!=='boss'&&Math.hypot(ally.x-e.x,ally.y-e.y)<200)ally.hp=Math.min(ally.maxHP,ally.hp+ally.maxHP*.08);
   e.timer=2;this.addEffect('repairAura',e.x,e.y,{life:.5,radius:200,color:'#7fffc1'});
  }
  if(e.type==='miner'&&e.timer<=0&&this.canThreaten(e)){this.hostiles.push({x:e.x-15,y:e.y,vx:35,vy:0,life:5,r:9,damage:18,source:'機雷敷設艇の砲撃',arming:.8,mine:true});e.timer=2.6;}
  if(['sniper','guard'].includes(e.type)){
   if(e.timer<=0&&!e.warn&&this.canThreaten(e)){e.warn=e.type==='sniper'?.95:.65;e.aim=Math.atan2(p.y+p.vy*.15-e.y,p.x-e.x);}
   if(e.warn>0){e.warn-=dt;if(e.warn<=0){e.warn=0;this.enemyShot(e,e.aim,e.type==='sniper'?340:155,e.type==='sniper'?1:3,.24);e.timer=e.type==='sniper'?3.6:3.2;}}
  }
  if(d<p.r+e.r*.76)this.damage(e.damage,'新型機との接触');return true;
 }
};
