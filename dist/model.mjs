import {expeditionMethods} from './expedition.mjs?v=lumen-4.2.0';
import {circleHitsTerrain} from './terrain.mjs?v=lumen-4.2.0';
import {gateHazard,hitsGateHazard,HAZARD_NAMES} from './hazards.mjs?v=lumen-4.2.0';
import {VERSION,BOSSES,CHASSIS,UPGRADES,EVOLUTIONS,META,evolutionReady} from './catalog.mjs?v=lumen-4.2.0';
export {VERSION,UPGRADES,EVOLUTIONS};
export const STEP=1/120;
export const clamp=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
export const clock=t=>`${String(Math.floor(t/60)).padStart(2,'0')}:${String(Math.floor(t%60)).padStart(2,'0')}`;
const TAU=Math.PI*2;
const names={guard:'盾装フリゲート',miner:'機雷敷設艇',mender:'修復艇',splitter:'分裂艇',sniper:'狙撃艦',wisp:'偵察ドローン',ray:'突撃艇',thorn:'狙撃砲台',elite:'重装母艦',boss:'星喰い'};
const segmentDistance=(px,py,ax,ay,bx,by)=>{const dx=bx-ax,dy=by-ay,t=clamp(((px-ax)*dx+(py-ay)*dy)/(dx*dx+dy*dy||1),0,1);return Math.hypot(px-ax-dx*t,py-ay-dy*t);};
let sequence=0;
export class Flight{
 constructor(seed=Date.now(),options={}){
  this.seed=seed>>>0||1;this.choiceSeed=(this.seed^0x9e3779b9)>>>0||17;this.time=0;this.status='playing';
  this.runId=`${Date.now().toString(36)}-${++sequence}-${this.seed}`;
  this.chassis=CHASSIS[options.chassis]?options.chassis:'lancer';this.heat=options.heat===2?2:1;
  this.meta=Object.fromEntries(Object.entries(META).map(([k,u])=>[k,clamp(Math.floor(Number(options.meta?.[k])||0),0,u.max)]));
  const hp=CHASSIS[this.chassis].hp+this.meta.hull*8;
  this.p={x:0,y:0,vy:0,pitch:0,r:12.5,hp,maxHP:hp,hurt:0,flap:0,shield:0};
  this.view={w:1100,h:640};this.camera={x:-319,y:-320};
  this.skills=Object.fromEntries(Object.keys(UPGRADES).map(k=>[k,0]));this.skills[CHASSIS[this.chassis].weapon]=1;
  this.evolutions=Object.fromEntries(Object.keys(EVOLUTIONS).map(k=>[k,false]));
  this.enemies=[];this.bullets=[];this.hostiles=[];this.gems=[];this.rocks=[];this.gates=[];this.gateDodges=0;this.gateStreak=0;this.bestGateStreak=0;this.flightBonusParts=0;this.effects=[];this.events=[];
  this.kills=0;this.eliteKills=0;this.level=1;this.xp=0;this.xpNeed=7;this.totalXP=0;this.choices=[];this.pendingChests=0;this.loot=null;
  this.rerolls=2+this.meta.analysis;this.revives=this.meta.rescue;this.revivesUsed=0;this.chestCount=0;
  this.damageStats={star:0,missile:0,beam:0,orbit:0,storm:0,drone:0};this.damageTaken=0;this.lastDamage='';
  this.timers={star:.1,missile:1,beam:1.5,storm:2,drone:.5,repair:8,shield:0};
  this.spawnTimer=.65;this.gateTimer=9;this.gateIndex=0;this.flapTimer=0;this.id=0;this.nextSwarm=18;this.nextElite=32;
  this.boss=null;this.bossSpawned=false;this.maxAltitude=0;this.currentPhase=0;
  this.initExpedition(options);
  this.spawn('wisp',370,-55);
 }
 rand(){let n=this.seed;n^=n<<13;n^=n>>>17;n^=n<<5;this.seed=n>>>0;return this.seed/4294967296;}
 choiceRand(){let n=this.choiceSeed;n^=n<<13;n^=n>>>17;n^=n<<5;this.choiceSeed=n>>>0;return this.choiceSeed/4294967296;}
 setView(w,h,snap=false){this.view={w,h};if(this.boss){this.boss.r=Math.min(88,Math.max(50,w*.16));this.boss.x=Math.min(this.boss.x,this.p.x+Math.min(430,Math.max(80,w*.71-this.boss.r*1.525-24)));}if(snap){this.camera.x=this.p.x-w*.29;this.camera.y=this.p.y-h*.5;}}
 emit(type,data={}){this.events.push({type,...data});}
 breakGateStreak(){if(this.gateStreak){this.gateStreak=0;this.emit('streakLost');}}
 flap(){if(this.status!=='playing'||this.flapTimer>0)return false;this.p.vy=-255;this.p.flap=1;this.flapTimer=.13;this.emit('flap');return true;}
 addEffect(kind,x,y,extra={}){this.effects.push({kind,x,y,age:0,life:.5,...extra});}
 get power(){return CHASSIS[this.chassis].damage*(1+this.skills.power*.28)*(1+this.meta.reactor*.05)*(this.mod==='glass'?1.3:this.mod==='recycler'?.88:this.mod==='rapid'?.85:this.mod==='thermal'?.92:1)*(this.p.hp<this.p.maxHP*.5?1+this.skills.focus*.18:1);}
 get cooldown(){return Math.pow(.90,this.skills.tempo)*(this.mod==='rapid'?.8:this.mod==='fortress'?1.15:this.mod==='battery'?1.12:1)*(this.hasRelic('clock')?.82:1)*(1-this.meta.capacitors*.02);}
 crit(damage){return damage*(this.rand()<.04+this.skills.critical*.10?2:1);}
 targets(range=700){return this.enemies.filter(e=>e.hp>0&&Math.hypot(e.x-this.p.x,e.y-this.p.y)<range&&e.x<this.camera.x+this.view.w+35&&e.x>this.camera.x-70&&e.y>this.camera.y-45&&e.y<this.camera.y+this.view.h+45).sort((a,b)=>Math.hypot(a.x-this.p.x,a.y-this.p.y)-Math.hypot(b.x-this.p.x,b.y-this.p.y));}
 spawn(type,x,y){
  const stats={guard:[28,160,45,22,5],miner:[24,85,48,18,4],mender:[21,60,55,14,4],splitter:[24,70,80,18,3],sniper:[27,95,35,20,5],wisp:[15,19,65,14,1],ray:[23,42,88,20,2],thorn:[21,75,26,18,3],elite:[43,500,30,26,20],boss:[88,16000,30,30,100]}[type];
  let [r,hp,speed,damage,xp]=stats;if(type==='boss')r=Math.min(88,Math.max(50,this.view.w*.16));const heat=this.heat===2?1.28:1;
  if(type!=='boss')hp*=(1+this.time/115)*(this.sectorMod==='fragile'?.7:this.sectorMod==='armada'?1.15:1);hp*=heat;damage*=(this.heat===2?1.12:1)*(this.sectorMod==='fragile'?1.2:1);
  const e={id:++this.id,type,x,y,r,hp,maxHP:hp,speed,damage:Math.round(damage),xp,age:0,timer:1.4+this.rand(),hit:0,orbitHit:0,phase:this.rand()*TAU,warn:0,dash:0,dx:0,dy:0,aim:0,reinforce:4,phaseIndex:0,bossVariant:this.bossVariant};
  this.enemies.push(e);return e;
 }
 spawnWave(){
  const {p,view:v}=this;const n=Math.max(1,2+Math.floor(this.time/27)+(this.heat===2?1:0)+(this.sectorMod==='fragile'?2:this.sectorMod==='rich'?1:this.sectorMod==='haven'?-2:0));
  for(let i=0;i<n;i++){
   const r=this.rand(),biome=this.getBiome(),pool=[['wisp','ray','miner','sniper'],['wisp','splitter','mender','thorn'],['ray','sniper','guard','wisp'],['miner','guard','ray','splitter'],['guard','mender','sniper','thorn']][biome];let type=this.time>18?pool[Math.floor(r*pool.length)]:r<.3&&this.time>7?'ray':'wisp';
   const quotas={sniper:2,mender:2,miner:3,guard:3,splitter:4};
   if(quotas[type]&&this.enemies.filter(e=>e.hp>0&&e.type===type).length>=quotas[type])type=r<.5?'wisp':'ray';
   let x=p.x+v.w*.76+70+this.rand()*110;
   let y=p.y+clamp(p.vy*.5,-140,140)+(this.rand()-.5)*Math.max(v.h*.9,560);
   if(this.rand()<.23){x=p.x+v.w*(.25+this.rand()*.4);y=p.y+(this.rand()<.5?-1:1)*(v.h*.6+65);}
   this.spawn(type,x,y);
  }
  this.spawnTimer+=Math.max(.34,.82-this.time/330)/(this.heat===2?1.12:1);
 }
 spawnGate(){
  const index=this.gateIndex++,theme=this.getBiome();
  const gap=clamp(this.view.h*.35-this.time*.12,238,300)-(this.sectorMod==='ruins'?18:0);
  const direction=index%2===0?-1:1;
  const base=this.p.y+direction*this.view.h*.17+(this.rand()-.5)*this.view.h*.08;
  const x=this.p.x+this.view.w*.8+180;
  // A readable entry, a committed climb/dive, then an open recovery section.
  const patterns=[[0,-60,30],[0,75,-25],[0,-85,0],[0,60,100],[0,-65,45]];
  const count=index===0?1:this.sectorMod==='ruins'?4:3,spacing=210;
  if(count===4)for(const row of patterns)if(row.length===3)row.push(row[0]+45);
  for(let j=0;j<count;j++){
   const center=base+patterns[theme][j]*direction,gateId=++this.id,gx=x+j*spacing;
   const variant=(index+j)%2;
   this.gates.push({id:gateId,x:gx,center,gap,theme,variant,failed:false,passed:false,exit:gx+95,hazard:this.expedition&&index>0,hazardPhase:this.rand()*3.6});
   for(const side of [-1,1]){
    const rx=86+(theme===4?20:0)+this.rand()*14,ry=220+this.rand()*24;
    this.rocks.push({id:++this.id,gateId,x:gx,y:center+side*(gap/2+ry),rx,ry,phase:this.rand()*10,side,center,gap,theme,variant,wall:this.expedition});
   }
  }
  for(const gate of this.gates.filter(g=>g.x>=x))gate.exit=gate.x+Math.max(...this.rocks.filter(r=>r.gateId===gate.id).map(r=>r.rx))+this.p.r+6;
  this.gateTimer+=count===1?7:this.sectorMod==='ruins'?9.8:10.8;
 }

 damage(amount,source='敵の攻撃'){
  const p=this.p;if(p.hurt>0||this.status!=='playing')return;
  this.breakGateStreak();
  if(p.shield){if(this.hasRelic('mirror'))this.explode(p.x,p.y,170,100*this.power,'pulse');p.shield=0;this.timers.shield=Math.max(3.8,9-this.skills.shield*.9);p.hurt=.32;this.addEffect('guard',p.x,p.y,{life:.5,radius:100});this.emit('guard');return;}
  const actual=Math.max(2,Math.round(amount)-this.skills.armor*2-this.meta.armor);p.hp=Math.max(0,p.hp-actual);p.hurt=.8;this.damageTaken+=actual;this.lastDamage=source;
  this.addEffect('hurt',p.x,p.y,{life:.7,amount:actual,source});this.emit('hurt');
  if(p.hp<=0){
   if(this.revives>0){this.revives--;this.revivesUsed++;p.hp=Math.ceil(p.maxHP*.5);p.hurt=2.2;this.hostiles=[];this.addEffect('reboot',p.x,p.y,{life:1.2,radius:260});this.emit('revive');}
   else{this.status='dead';this.emit('end',{won:false});}
  }
 }
 hit(e,damage,weapon='star'){
  if(e.hp<=0||this.status==='dead'||this.status==='won')return;if(e.type==='boss'&&e.phaseLock>0)damage*=.15;if(e.type==='guard'&&Math.sin(e.age*1.3)>-.3&&weapon!=='pulse'&&weapon!=='mine')damage*=.55;
  if(e.type==='elite'||e.type==='boss')damage*=(this.mod==='hunter'?1.35:1)*(this.hasRelic('fang')?1.3:1);else if(this.mod==='hunter')damage*=.9;
  if(this.skills.frost)e.slowUntil=this.time+2;
  const dealt=Math.min(e.hp,damage);e.hp-=damage;e.hit=.1;this.damageStats[weapon]=(this.damageStats[weapon]||0)+dealt;
  if(e.hp<=0)this.kill(e);
 }
 kill(e){
  this.kills++;this.addEffect('burst',e.x,e.y,{radius:e.r*2,life:.55,color:e.type==='boss'?'#ffdb9b':'#e9a791'});
  this.gems.push({x:e.x,y:e.y,value:e.xp*(1+this.skills.salvage*.12),kind:'xp',age:0,pull:false});this.emit('kill',{kind:e.type});
  if(this.skills.leech&&this.kills%12===0)this.p.hp=Math.min(this.p.maxHP,this.p.hp+this.skills.leech*3);
  if(e.type==='splitter')for(const side of [-1,1])this.spawn('wisp',e.x+25,e.y+side*30);
  if(this.kills%35===0)this.gems.push({x:e.x,y:e.y-16,kind:'heal',value:10,age:0,pull:false});
  if(e.type==='elite'){this.eliteKills++;this.gems.push({x:e.x,y:e.y,kind:'chest',value:1,age:0,pull:false});this.emit('elite');}
  if(e.type==='boss'){this.status='won';this.emit('end',{won:true});}
 }
 collect(value){this.xp+=value*(1+this.skills.magnet*.08+this.meta.recovery*.05+(this.hasRelic('courier')?.2:0))*(this.sectorMod==='rich'?1.35:this.sectorMod==='storm'?1.2:this.sectorMod==='armada'?1.25:1);this.totalXP+=value;this.emit('xp');if(this.xp>=this.xpNeed&&this.status==='playing')this.levelUp();}
 levelUp(){this.xp-=this.xpNeed;this.level++;this.xpNeed=Math.round(7+(this.level-1)*(this.expedition?3:3.7));this.status='upgrade';this.choices=this.rollUpgrades();this.emit('level');}
 rollUpgrades(){
  const slots=Object.keys(UPGRADES).filter(k=>UPGRADES[k].type==='weapon'&&this.skills[k]>0).length;
  const pool=Object.keys(UPGRADES).filter(k=>this.skills[k]<UPGRADES[k].max&&(UPGRADES[k].type!=='weapon'||this.skills[k]>0||slots<5)),result=[];
  if(!pool.length)return ['heart'];
  const weapons=pool.filter(k=>UPGRADES[k].type==='weapon'&&!this.skills[k]);
  if(weapons.length&&this.level<5)result.push(weapons[Math.floor(this.choiceRand()*weapons.length)]);
  while(result.length<3&&pool.some(k=>!result.includes(k))){
   const candidates=pool.filter(k=>!result.includes(k));const weighted=candidates.flatMap(k=>Array(this.skills[k]?3:1).fill(k));
   result.push(weighted[Math.floor(this.choiceRand()*weighted.length)]);
  }return result;
 }
 applyUpgrade(key){
  const u=UPGRADES[key];if(!u)return;if(u.type==='weapon'&&!this.skills[key]&&Object.keys(UPGRADES).filter(k=>UPGRADES[k].type==='weapon'&&this.skills[k]>0).length>=5)return;const old=this.skills[key];this.skills[key]=Math.min(u.max,old+1);
  if(key==='heart'){if(old<u.max)this.p.maxHP+=20;this.p.hp=Math.min(this.p.maxHP,this.p.hp+35);}
  if(key==='shield')this.p.shield=1;
 }
 continueRun(){this.status='playing';if(this.xp>=this.xpNeed)this.levelUp();else if(this.pendingChests>0)this.openChest();}
 choose(key){if(this.status!=='upgrade'||!this.choices.includes(key))return false;this.applyUpgrade(key);this.choices=[];this.emit('upgrade',{key});this.continueRun();return true;}
 reroll(){if(this.status!=='upgrade'||this.rerolls<=0)return false;this.rerolls--;this.choices=this.rollUpgrades();this.emit('reroll');return true;}
 openChest(){
  if(this.status!=='playing'){this.pendingChests++;return;}
  if(this.pendingChests>0)this.pendingChests--;this.chestCount++;
  const eligible=Object.keys(EVOLUTIONS).filter(k=>evolutionReady(this,k));
  if(eligible.length){const id=eligible[Math.floor(this.choiceRand()*eligible.length)];this.evolutions[id]=true;this.loot={kind:'evolution',id,name:EVOLUTIONS[id].name,text:EVOLUTIONS[id].text};this.emit('evolve',{id});}
  else{const options=Object.keys(UPGRADES).filter(k=>this.skills[k]>0&&this.skills[k]<UPGRADES[k].max);const key=options.length?options[Math.floor(this.choiceRand()*options.length)]:'heart';this.applyUpgrade(key);this.loot={kind:'supply',id:key,name:`${UPGRADES[key].name} +1`,text:'回収した補給箱から追加強化を獲得。体力も15修復。'};this.emit('loot');}
  this.p.hp=Math.min(this.p.maxHP,this.p.hp+15);this.status='loot';this.addEffect('evolve',this.p.x,this.p.y,{life:1.2,radius:250});
 }
 resumeLoot(){if(this.status!=='loot')return false;this.loot=null;this.p.hurt=Math.max(this.p.hurt,.8);this.continueRun();return true;}
 muzzle(index=0,beam=false){const point=beam?[45,index%2?17:-17]:this.chassis==='wraith'?[46,10]:[43,index%2?24:3],a=this.p.pitch;return {x:this.p.x+point[0]*Math.cos(a)-point[1]*Math.sin(a),y:this.p.y+point[0]*Math.sin(a)+point[1]*Math.cos(a)};}
 fire(){
  const targets=this.targets(750);if(!targets.length)return;
  const evo=this.evolutions.nova,n=2+this.skills.split+(evo?3:0)+(this.hasRelic('prism')?2:0);
  for(let i=0;i<n;i++){const e=targets[i%Math.min(targets.length,3)],m=this.muzzle(i),a=Math.atan2(e.y-m.y,e.x-m.x)+(i-(n-1)/2)*.08;
   if(i<2)this.addEffect('muzzle',m.x,m.y,{life:.08});this.projectile('star',m.x,m.y,a,810,this.crit((evo?15:9)*this.power),e.id,(evo?3:0)+this.skills.pierce);}
  this.emit('shot');
 }
 projectile(kind,x,y,a,speed,damage,target,penetration=0){this.bullets.push({kind,x,y,ox:x,oy:y,vx:Math.cos(a)*speed,vy:Math.sin(a)*speed,speed,damage,target,life:kind==='missile'?2.7:1.25,turn:kind==='missile'?5.2:4.6,penetration,hitIds:new Set()});}
 missiles(){
  if(!this.skills.missile)return;const targets=this.targets(850);if(!targets.length)return;
  const lv=this.skills.missile,evo=this.evolutions.ragnarok,n=Math.min(9,1+Math.ceil(lv/2)+this.skills.split+(evo?2:0));
  for(let i=0;i<n;i++){const e=targets[i%Math.min(targets.length,4)],a=Math.atan2(e.y-this.p.y,e.x-this.p.x)+(i-(n-1)/2)*.25;this.projectile('missile',this.p.x+5,this.p.y+(i%2?10:-10),a,420,this.crit((22+lv*10)*(evo?1.7:1)*this.power*(this.hasRelic('ember')?1.15:1)),e.id);}
  this.emit('missile');
 }
 beam(){
  if(!this.skills.beam)return;const targets=this.targets(920),lv=this.skills.beam,evo=this.evolutions.seraph,n=evo?3:lv>=4?2:1;
  for(const [index,e] of targets.slice(0,n).entries()){
   const m=this.muzzle(index,true);let dx=e.x-m.x,dy=e.y-m.y,d=Math.hypot(dx,dy)||1;const tx=m.x+dx/d*950,ty=m.y+dy/d*950;
   this.addEffect('beam',tx,ty,{ox:m.x,oy:m.y,life:evo?.4:.23,width:evo?13:5,color:evo?'#bdeeff':'#80cfff'});
   for(const enemy of this.enemies)if(enemy.hp>0&&segmentDistance(enemy.x,enemy.y,m.x,m.y,tx,ty)<enemy.r+(evo?14:7))this.hit(enemy,this.crit((28+lv*17)*(evo?1.65:1)*this.power*(this.hasRelic('prism')?1.25:1)),'beam');
  }if(targets.length)this.emit('beam');
 }
 lightning(){
  if(!this.skills.storm)return;const lv=this.skills.storm,evo=this.evolutions.tempest;
  const list=this.targets(evo?1050:680).slice(0,2+lv+(evo?4:0));let from=this.p;
  for(const e of list){this.addEffect('lightning',e.x,e.y,{ox:from.x,oy:from.y,life:.25});this.hit(e,this.crit((20+lv*11)*(evo?1.5:1)*this.power),'storm');from=e;}
  if(evo&&list.length){this.explode(this.p.x,this.p.y,190,28*this.power,'storm');this.hostiles=this.hostiles.filter(b=>Math.hypot(b.x-this.p.x,b.y-this.p.y)>190);}
  if(list.length)this.emit('storm');
 }
 dronePositions(){const lv=this.skills.drone;if(!lv)return [];const n=this.evolutions.swarm?4:1+Math.floor(lv/2);return Array.from({length:n},(_,i)=>{const a=this.time*1.2+i*TAU/n;return {x:this.p.x-20+Math.cos(a)*48,y:this.p.y+Math.sin(a)*65};});}
 drones(){if(!this.skills.drone)return;const targets=this.targets(800);if(!targets.length)return;this.dronePositions().forEach((d,i)=>{const e=targets[i%targets.length],a=Math.atan2(e.y-d.y,e.x-d.x);this.projectile('drone',d.x+12,d.y,a,780,this.crit((9+this.skills.drone*6)*this.power*(this.hasRelic('echo')?1.35:1)),e.id,this.evolutions.swarm?2:0);});}
 orbitPositions(){if(!this.skills.orbit)return [];const n=1+Math.floor(this.skills.orbit/2)+(this.evolutions.aegis?2:0),r=this.evolutions.aegis?105:75;return Array.from({length:n},(_,i)=>{const a=this.time*3.3+i*TAU/n;return {x:this.p.x+Math.cos(a)*r,y:this.p.y+Math.sin(a)*r};});}
 explode(x,y,radius,damage,weapon){this.addEffect('explosion',x,y,{life:.45,radius,color:weapon==='storm'?'#cab5ff':'#ffc08d'});for(const e of this.enemies)if(e.hp>0&&Math.hypot(e.x-x,e.y-y)<radius+e.r)this.hit(e,damage,weapon);}
 canThreaten(e){return e.x>this.camera.x-40&&e.x<this.camera.x+this.view.w+24&&e.y>this.camera.y-24&&e.y<this.camera.y+this.view.h+24;}
 enemyShot(e,angle,speed=190,n=1,spread=.18){
  if(!this.canThreaten(e))return;
  speed*=this.sectorMod==='storm'?1.2:1;
  for(let i=0;i<n;i++){const a=angle+(i-(n-1)/2)*spread;this.hostiles.push({x:e.x-e.r*.6,y:e.y,vx:Math.cos(a)*speed+45,vy:Math.sin(a)*speed,life:5,r:e.type==='boss'?6:5,damage:e.type==='boss'?22:16,source:`${e.type==='boss'?BOSSES[this.bossVariant].ja:names[e.type]}の砲撃`});}
 }
 updateEnemy(e,dt){
  if(e.hp<=0)return;if(this.updateSpecialEnemy(e,dt))return;const frameDT=dt;dt*=(e.slowUntil>this.time?1-this.skills.frost*.15:1)*(this.sectorMod==='gravity'?.85:1);const p=this.p;e.age+=dt;e.hit=Math.max(0,e.hit-dt);e.orbitHit=Math.max(0,e.orbitHit-dt);
  const dx=p.x-e.x,dy=p.y-e.y,d=Math.hypot(dx,dy)||1;
  if(e.type==='boss'||e.type==='elite'){
   const boss=e.type==='boss',phase=boss?(e.hp/e.maxHP<.33?2:e.hp/e.maxHP<.66?1:0):0;
   e.phaseLock=Math.max(0,(e.phaseLock||0)-dt);if(phase!==e.phaseIndex){e.phaseIndex=phase;e.phaseLock=1.3;this.emit('bossphase',{phase});}
   const desired=p.x+Math.min(boss?430:340,boss?Math.max(80,this.view.w*.71-e.r*1.525-24):this.view.w*.49);e.x+=(134.1+Math.min(24.8,this.time/9*1.24)+clamp((desired-e.x)*2,-340,160))*frameDT;e.y+=clamp((p.y+Math.sin(e.age*.9)*100-e.y)*2,-390,390)*dt;
   e.timer-=dt;if(e.timer<=0&&!e.warn&&this.canThreaten(e)){e.warn=.58;e.aim=Math.atan2(p.y+p.vy*.35-e.y,p.x+65-e.x);}
   if(e.warn>0){e.warn-=dt;if(e.warn<=0){e.warn=0;if(boss&&this.bossVariant===1){for(const side of [-1,1]){const gun={...e,y:e.y+side*55};this.enemyShot(gun,e.aim,190+phase*20,3+phase,.12);}}else if(boss&&this.bossVariant===2){for(let k=0;k<8+phase*2;k++)this.enemyShot(e,e.age*.65+k*TAU/(8+phase*2),145+phase*15,1);}else this.enemyShot(e,e.aim,boss?205+phase*25:180,boss?5+phase*2:3,.21);if(boss&&phase>0)for(let i=0;i<10;i++)this.enemyShot(e,e.age*.4+i*TAU/10,125,1);e.timer=boss?1.55-phase*.23:2.6;}}
   e.reinforce-=dt;if(e.reinforce<=0){if(boss?phase>0:true)for(let i=0;i<(boss?3:2);i++)this.spawn('wisp',e.x+30,e.y+(i-1)*55);e.reinforce=boss?4:5;}
  }else if(e.type==='thorn'){
   e.x+=30*dt;e.y+=Math.sin(e.age*1.5+e.phase)*15*dt;e.timer-=dt;
   if(e.timer<=0&&!e.warn&&d<900&&this.canThreaten(e)){e.warn=.6;e.aim=Math.atan2(p.y+p.vy*.45-e.y,p.x+70-e.x);}
   if(e.warn>0){e.warn-=dt;if(e.warn<=0){e.warn=0;this.enemyShot(e,e.aim,210,3,.16);e.timer=2.8;}}
  }else if(e.type==='ray'){
   e.timer-=dt;
   if(e.dash>0){e.dash-=dt;e.x+=e.dx*dt;e.y+=e.dy*dt;}
   else if(e.warn>0){e.warn-=dt;if(e.warn<=0){e.warn=0;e.dash=.65;e.dx=Math.cos(e.aim)*410+40;e.dy=Math.sin(e.aim)*410;e.timer=2.4;}}
   else{e.x+=(55+dx/d*e.speed)*dt;e.y+=dy/d*150*dt;if(e.timer<=0&&d<650&&this.canThreaten(e)){e.warn=.65;e.aim=Math.atan2(p.y+p.vy*.18-e.y,p.x+30-e.x);}}
  }else{e.x+=(60+dx/d*e.speed)*dt;e.y+=(dy/d*Math.min(190,e.speed*2)+Math.sin(e.age*2+e.phase)*12)*dt;}
  if(Math.hypot(e.x-p.x,e.y-p.y)<p.r+e.r*.76)this.damage(e.damage,`${e.type==='boss'?BOSSES[this.bossVariant].ja:names[e.type]}との接触`);
 }
 tick(dt=STEP){
  if(this.status!=='playing')return;dt=Math.min(.04,dt);this.time+=dt;const p=this.p;
  this.flapTimer=Math.max(0,this.flapTimer-dt);p.flap=Math.max(0,p.flap-dt*3.5);p.hurt=Math.max(0,p.hurt-dt);
  p.vy=Math.min(this.sectorMod==='gravity'?325:305,p.vy+(this.sectorMod==='gravity'?570:510)*dt);const targetPitch=clamp(p.vy*.00056,-.145,.165);p.pitch+=(targetPitch-p.pitch)*(1-Math.exp(-9*dt));p.y+=p.vy*dt;p.x+=(134.1+Math.min(24.8,this.time/9*1.24))*dt;
  this.maxAltitude=Math.max(this.maxAltitude,-p.y);this.camera.x=p.x-this.view.w*.29;const goal=p.y-this.view.h*.5+clamp(p.vy*.15,-45,45);this.camera.y+=(goal-this.camera.y)*(1-Math.exp(-3.8*dt));
  const phase=Math.min(4,Math.floor(this.time/30));if(phase!==this.currentPhase){this.currentPhase=phase;if(this.expedition){this.beginRoute();return;}this.emit('phase',{phase});}
  this.spawnTimer-=dt;if(this.spawnTimer<=0){if(!this.bossSpawned)this.spawnWave();else{if(this.enemies.filter(e=>e.type!=='boss').length<14)this.spawn('wisp',p.x+this.view.w*.72,p.y+(this.rand()-.5)*500);this.spawnTimer=1.2;}}
  this.gateTimer-=dt;if(this.gateTimer<=0&&!this.bossSpawned)this.spawnGate();
  if(this.time>=this.nextSwarm&&this.time<145){for(let i=0;i<8+Math.floor(this.time/22);i++)this.spawn(i%4===0&&this.time>40?'ray':'wisp',p.x+this.view.w*.7+i*20,p.y+Math.sin(i*.65)*180);this.nextSwarm+=22;this.emit('wave');}
  if(this.time>=this.nextElite&&this.time<140){this.spawn('elite',p.x+this.view.w*.78,p.y-60);this.nextElite+=40;this.emit('eliteIncoming');}
  if(this.time>=150&&!this.bossSpawned){this.bossSpawned=true;this.boss=this.spawn('boss',p.x+this.view.w*.78,p.y);this.emit('boss');}
  this.tickExpedition(dt);
  const periods={star:.44,missile:Math.max(.85,2.7-this.skills.missile*.2),beam:Math.max(.85,2.9-this.skills.beam*.23),storm:Math.max(.9,3.1-this.skills.storm*.25),drone:.52};
  for(const key of ['star','missile','beam','storm','drone']){this.timers[key]-=dt;if(this.timers[key]<=0){if(key==='star')this.fire();else if(key==='missile')this.missiles();else if(key==='beam')this.beam();else if(key==='storm')this.lightning();else this.drones();this.timers[key]=periods[key]*this.cooldown;}}
  this.timers.repair-=dt;if(this.timers.repair<=0){if(this.skills.regen)p.hp=Math.min(p.maxHP,p.hp+this.skills.regen*3);this.timers.repair=8;}
  this.timers.shield-=dt;if(this.skills.shield&&!p.shield&&this.timers.shield<=0){p.shield=1;this.timers.shield=Math.max(3.8,9-this.skills.shield*.9);}
  for(const e of this.enemies)this.updateEnemy(e,dt);
  const satellites=this.orbitPositions();
  for(const e of this.enemies)if(e.hp>0&&e.orbitHit<=0&&satellites.some(d=>Math.hypot(e.x-d.x,e.y-d.y)<e.r+16)){this.hit(e,(15+this.skills.orbit*9)*(this.evolutions.aegis?1.4:1)*this.power,'orbit');e.orbitHit=.25;}
  for(const b of this.bullets){
   b.ox=b.x;b.oy=b.y;b.life-=dt;let target=this.enemies.find(e=>e.id===b.target&&e.hp>0&&!b.hitIds.has(e.id));
   if(!target&&b.kind==='missile')target=this.targets(900).find(e=>!b.hitIds.has(e.id));
   if(target){const a=Math.atan2(target.y-b.y,target.x-b.x),old=Math.atan2(b.vy,b.vx),diff=Math.atan2(Math.sin(a-old),Math.cos(a-old));const angle=old+clamp(diff,-b.turn*dt,b.turn*dt);b.vx=Math.cos(angle)*b.speed;b.vy=Math.sin(angle)*b.speed;}
   b.x+=b.vx*dt;b.y+=b.vy*dt;
   for(const e of this.enemies)if(e.hp>0&&!b.hitIds.has(e.id)&&Math.hypot(e.x-b.x,e.y-b.y)<e.r+5){
    if(b.kind==='missile'){this.explode(b.x,b.y,(this.evolutions.ragnarok?118:65)*(this.hasRelic('ember')?1.35:1),b.damage,'missile');b.life=0;break;}
    this.hit(e,b.damage,['drone','scatter','blade'].includes(b.kind)?b.kind:'star');b.hitIds.add(e.id);if(b.penetration>0)b.penetration--;else{b.life=0;break;}
   }
  }
  for(const b of this.hostiles){b.x+=b.vx*dt;b.y+=b.vy*dt;b.life-=dt;if(this.evolutions.aegis&&Math.hypot(b.x-p.x,b.y-p.y)<95){b.life=0;continue;}b.arming=Math.max(0,(b.arming||0)-dt);if(!b.arming&&Math.hypot(b.x-p.x,b.y-p.y)<p.r+b.r){this.damage(b.damage,b.source);b.life=0;}}
  for(const r of this.rocks){if(circleHitsTerrain(p,r)){const gate=this.gates.find(g=>g.id===r.gateId);if(gate)gate.failed=true;this.damage(23,'浮遊装甲への接触');p.vy+=(p.y<r.y?-1:1)*dt*350;}}
  for(const gate of this.gates){const h=gateHazard(gate,this.time);if(!gate.passed&&hitsGateHazard(p,h)){gate.failed=true;this.damage(19,HAZARD_NAMES[gate.theme]+'への接触');}}
  for(const gate of this.gates)if(!gate.passed&&p.x>(gate.exit??gate.x+95)){
   gate.passed=true;
   if(!gate.failed&&Math.abs(p.y-gate.center)<gate.gap/2){
    this.gateDodges++;this.gateStreak++;this.bestGateStreak=Math.max(this.bestGateStreak,this.gateStreak);
    const multiplier=Math.min(5,this.gateStreak),xp=(this.sectorMod==='ruins'?4:2)*multiplier;
    this.flightBonusParts+=multiplier;this.collect(xp);
    this.addEffect('gateClear',p.x,p.y,{life:.8,radius:118,color:'#8be8d4'});
    this.emit('gatePass',{count:this.gateDodges,streak:this.gateStreak,multiplier,xp,parts:multiplier});
   }else this.breakGateStreak();
  }
  this.gates=this.gates.filter(g=>p.x<g.x+this.view.w*.75);
  for(const g of this.gems){
   g.age+=dt;const d=Math.hypot(g.x-p.x,g.y-p.y),range=150+this.skills.magnet*55+this.meta.recovery*12+(this.hasRelic('courier')?80:0)+(g.kind==='chest'?70:0);
   if(d<range||g.age>2.2||g.x<p.x-this.view.w*.22||Math.abs(g.y-p.y)>this.view.h*.65)g.pull=true;
   if(g.pull){const amount=Math.min(1,(Math.min(1500,780+Math.abs(p.vy)*.7+g.age*45))*dt/Math.max(d,1));g.x+=(p.x-g.x)*amount;g.y+=(p.y-g.y)*amount;}
   if(d<24&&!g.taken){g.taken=true;if(g.kind==='heal'){p.hp=Math.min(p.maxHP,p.hp+g.value);this.emit('heal',{amount:g.value});}else if(g.kind==='chest')this.pendingChests++;else this.collect(g.value);}
  }
  if(this.status==='playing'&&this.pendingChests)this.openChest();
  for(const e of this.effects)e.age+=dt;
  this.enemies=this.enemies.filter(e=>e.hp>0&&(e.type==='boss'||e.type==='elite'||(e.x>p.x-this.view.w*.6&&Math.abs(e.y-p.y)<this.view.h*2)));
  if(this.enemies.length>190)this.enemies=this.enemies.filter(e=>e.type==='boss'||e.type==='elite').concat(this.enemies.filter(e=>e.type!=='boss'&&e.type!=='elite').slice(-170));
  this.bullets=this.bullets.filter(b=>b.life>0).slice(-300);this.hostiles=this.hostiles.filter(b=>b.life>0&&b.x>p.x-this.view.w&&Math.abs(b.y-p.y)<this.view.h*1.6).slice(-350);
  this.gems=this.gems.filter(g=>!g.taken&&g.age<(g.kind==='chest'?90:25)).slice(-320);this.rocks=this.rocks.filter(r=>r.x>p.x-this.view.w*.5);this.effects=this.effects.filter(e=>e.age<e.life).slice(-180);
  if(this.events.length>100)this.events.splice(0,this.events.length-100);
 }
}

Object.assign(Flight.prototype,expeditionMethods);
