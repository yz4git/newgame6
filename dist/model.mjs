export const FLOOR=590, GRAVITY=1900;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const platform=(x,y,w)=>({x,y,w});
const enemy=(type,x,y=FLOOR)=>({type,x,y});
export const ROOMS=[
 {id:0,name:'月下の回廊',en:'MOONLIT CLOISTER',theme:'cathedral',width:2600,left:null,right:1,spawn:220,shrine:240,platforms:[platform(580,475,250),platform(980,390,260),platform(1370,470,280),platform(1920,440,280)],enemies:[enemy('knight',790),enemy('bat',1130,330),enemy('knight',1510),enemy('bat',1900,350),enemy('knight',2210)],items:[{type:'health',x:1090,y:350},{type:'chest',id:'cloister',x:2030,y:400}],portals:[]},
 {id:1,name:'紅の礼拝堂',en:'THE CRIMSON CHAPEL',theme:'cathedral',width:2450,left:0,right:4,spawn:180,shrine:340,platforms:[platform(660,480,260),platform(1070,390,260),platform(1460,315,300),platform(1840,450,250)],enemies:[enemy('knight',670),enemy('bat',1200,300),enemy('knight',1610),enemy('knight',2080)],items:[],portals:[{x:1000,y:FLOOR,to:2,label:'水没書庫へ',en:'DROWNED ARCHIVE'},{x:1600,y:315,to:3,label:'鐘楼へ',en:'THE SILENT BELFRY'}]},
 {id:2,name:'水没書庫',en:'THE DROWNED ARCHIVE',theme:'crypt',width:2550,left:1,right:null,spawn:190,shrine:270,platforms:[platform(590,470,260),platform(1020,385,270),platform(1460,450,250),platform(1790,340,260),platform(2140,260,270)],enemies:[enemy('knight',740),enemy('bat',1120,300),enemy('knight',1420),enemy('bat',1850,260),enemy('knight',2180)],items:[{type:'seal',id:'tide',x:2270,y:215},{type:'chest',id:'archive',x:1140,y:340}],portals:[{x:2370,y:FLOOR,to:1,returnX:1000,label:'礼拝堂へ戻る',en:'RETURN TO THE CHAPEL'}]},
 {id:3,name:'沈黙の鐘楼',en:'THE SILENT BELFRY',theme:'belfry',width:2450,left:1,right:null,spawn:180,shrine:250,platforms:[platform(560,470,240),platform(940,365,250),platform(1330,270,270),platform(1750,360,260),platform(2110,260,250)],enemies:[enemy('bat',700,340),enemy('knight',1020,365),enemy('bat',1400,190),enemy('bat',1800,270),enemy('knight',2200,260)],items:[{type:'seal',id:'bell',x:2235,y:215},{type:'relic',id:'moonchain',x:1465,y:230}],portals:[{x:2250,y:FLOOR,to:1,returnX:1600,returnY:315,label:'礼拝堂へ戻る',en:'RETURN TO THE CHAPEL'}]},
 {id:4,name:'月蝕の聖域',en:'SANCTUM OF THE ECLIPSE',theme:'cathedral',width:2000,left:1,right:null,spawn:240,shrine:null,platforms:[platform(600,455,230),platform(1200,455,230)],enemies:[enemy('boss',1420)],items:[],portals:[]}
];
export function freshProgress(){return{version:1,room:0,x:220,y:FLOOR,checkpoint:{room:0,x:240,y:FLOOR},seals:[],chests:[],relic:false,gold:0,xp:0,level:1,bossDefeated:false,visited:[0],time:0,kills:0};}
export function validateSave(raw){
 if(!raw||raw.version!==1||!Number.isInteger(raw.room)||!ROOMS[raw.room])return null;
 const p={...freshProgress(),...raw};
 p.seals=Array.isArray(raw.seals)?raw.seals.filter(x=>['tide','bell'].includes(x)):[];
 p.seals=[...new Set(p.seals)];p.chests=Array.isArray(raw.chests)?raw.chests.filter(x=>typeof x==='string').slice(0,20):[];
 p.level=clamp(Number(raw.level)||1,1,12);p.gold=clamp(Number(raw.gold)||0,0,999999);p.xp=clamp(Number(raw.xp)||0,0,99999);p.time=clamp(Number(raw.time)||0,0,999999);p.kills=clamp(Number(raw.kills)||0,0,99999);
 p.visited=Array.isArray(raw.visited)?[...new Set(raw.visited.filter(x=>Number.isInteger(x)&&ROOMS[x]))]:[0];
 p.x=clamp(Number(raw.x)||200,80,ROOMS[p.room].width-80);p.y=clamp(Number(raw.y)||FLOOR,180,FLOOR);
 if(p.room===4&&!p.bossDefeated){p.room=1;p.x=2100;p.y=FLOOR;}
 p.checkpoint={room:p.room,x:p.x,y:p.y};return p;
}
export class GameModel{
 constructor(progress=null){this.progress=validateSave(progress)||freshProgress();this.events=[];this.particles=[];this.shots=[];this.effects=[];this.time=0;this.freeze=0;this.state='play';this.prev={};this.transitionCooldown=1;this.bossActive=false;this.player={x:200,y:FLOOR,vx:0,vy:0,dir:1,hp:100,mp:100,potions:3,inv:0,dash:0,dashCd:0,magicCd:0,attack:0,attackId:0,combo:0,comboWindow:0,jumpBuffer:0,coyote:0,jumps:0,grounded:true,anim:0,hurt:0};this.enter(this.progress.room,this.progress.x,this.progress.y,false);this.player.hp=this.maxHp;}
 get room(){return ROOMS[this.progress.room];}get maxHp(){return 100+(this.progress.level-1)*12;}get damage(){return 25+(this.progress.level-1)*4+(this.progress.relic?12:0);}get sealed(){return this.progress.seals.length<2;}
 emit(type,data={}){this.events.push({type,...data});}drain(){return this.events.splice(0);}
 enter(id,x=180,y=FLOOR,save=true){
  const r=ROOMS[id];this.progress.room=id;this.player.x=clamp(x,70,r.width-70);this.player.y=y;Object.assign(this.player,{vx:0,vy:0,grounded:true,jumps:0,attack:0,dash:0,inv:1});
  this.enemies=r.enemies.filter(e=>e.type!=='boss'||!this.progress.bossDefeated).map((e,i)=>({...e,id:i,homeX:e.x,homeY:e.y,vx:0,dir:-1,hp:e.type==='boss'?680:e.type==='bat'?37:76,maxHp:e.type==='boss'?680:e.type==='bat'?37:76,state:'idle',timer:0,cool:1+i*.23,anim:i,flash:0,lastHit:-1,cycle:0,dead:0}));
  this.items=r.items.map(i=>({...i,taken:i.type==='seal'?this.progress.seals.includes(i.id):i.type==='chest'?this.progress.chests.includes(i.id):i.type==='relic'?this.progress.relic:false}));
  this.shots=[];this.effects=[];this.transitionCooldown=.8;this.bossActive=false;this.activeInteract=null;this.gateNotice=0;
  if(!this.progress.visited.includes(id))this.progress.visited.push(id);this.emit('room',{room:r});
  if(save&&id!==4){this.progress.checkpoint={room:id,x:this.player.x,y:this.player.y};this.emit('save');}
 }
 saveData(){return{...this.progress,room:this.progress.checkpoint.room,x:this.progress.checkpoint.x,y:this.progress.checkpoint.y};}
 rest(){const p=this.player;p.hp=this.maxHp;p.mp=100;p.potions=3;p.inv=Math.max(p.inv,1.5);this.progress.checkpoint={room:this.progress.room,x:p.x,y:p.y};this.emit('save');this.emit('toast',{text:'燭台の加護 — 全回復・保存'});this.emit('sound',{name:'rest'});this.spark(p.x,p.y-60,22,'#7be8f0');}
 heal(){const p=this.player;if(p.potions&&p.hp<this.maxHp){p.potions--;p.hp=Math.min(this.maxHp,p.hp+65);this.spark(p.x,p.y-65,25,'#90efc9');this.emit('sound',{name:'heal'});}else this.emit('toast',{text:p.potions?'体力は満タンです':'燭台で回復薬を補充できます'});}
 retry(){const c=this.progress.checkpoint;this.state='play';this.enter(c.room,c.x,c.y,false);Object.assign(this.player,{hp:this.maxHp,mp:100,potions:3,inv:2});}
 spark(x,y,n,color,force=170){for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=force*(.25+Math.random());this.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.3+Math.random()*.5,max:.8,color,size:1+Math.random()*3});}if(this.particles.length>220)this.particles.splice(0,this.particles.length-220);}
 hurt(amount,dir){const p=this.player;if(p.inv>0||p.dash>0||this.state!=='play')return;p.hp=Math.max(0,p.hp-amount);p.inv=1.15;p.hurt=.25;p.vx=dir*200;p.vy=-160;this.spark(p.x,p.y-65,17,'#e58c97');this.emit('shake',{amount:5});this.emit('sound',{name:'hurt'});if(p.hp<=0){this.state='dead';this.emit('dead');}}
 hit(e,dmg,dir,magic=false){if(e.hp<=0)return;e.hp-=dmg;e.flash=.16;e.x=clamp(e.x+dir*(e.type==='boss'?5:21),50,this.room.width-50);this.spark(e.x,e.y-(e.type==='boss'?110:e.type==='bat'?25:65),magic?18:12,magic?'#9bd9ff':'#e7c18d');this.effects.push({type:'number',x:e.x,y:e.y-110,value:dmg,life:.7});this.emit('sound',{name:'hit'});if(e.type!=='boss'){e.state='stun';e.timer=.28;}if(e.hp<=0){e.dead=.7;this.progress.kills++;this.progress.gold+=e.type==='boss'?250:15;this.progress.xp+=e.type==='boss'?90:20;this.emit('sound',{name:'kill'});this.spark(e.x,e.y-60,30,'#b7a7eb',250);this.player.hp=Math.min(this.maxHp,this.player.hp+5);this.player.mp=Math.min(100,this.player.mp+8);if(this.progress.xp>=this.progress.level*60){this.progress.xp-=this.progress.level*60;this.progress.level++;this.player.hp=this.maxHp;this.emit('toast',{text:'LEVEL UP — 体力・攻撃力が上昇'});this.emit('sound',{name:'rest'});}if(e.type==='boss'){this.progress.bossDefeated=true;this.bossActive=false;this.emit('save');this.effects.push({type:'victory',life:2.8});this.emit('shake',{amount:9});}}}
 update(dt,input={}){
  this.time+=dt;this.animateEffects(dt);if(this.state!=='play'){this.prev={...input};return;}
  if(this.freeze>0){this.freeze-=dt;return;}this.progress.time+=dt;
  const p=this.player,r=this.room,pressed=k=>!!input[k]&&!this.prev[k];this.transitionCooldown-=dt;this.gateNotice=Math.max(0,this.gateNotice-dt);
  for(const key of ['inv','dash','dashCd','magicCd','comboWindow','jumpBuffer','coyote','hurt'])p[key]=Math.max(0,p[key]-dt);
  p.mp=Math.min(100,p.mp+5.5*dt);p.anim+=dt;
  if(pressed('heal'))this.heal();if(pressed('jump'))p.jumpBuffer=.14;if(p.grounded)p.coyote=.12;
  const axis=(input.right?1:0)-(input.left?1:0);
  if(axis&&p.dash<=0&&p.attack<.12&&p.hurt<=0)p.dir=axis;
  if(pressed('dash')&&p.dashCd<=0){p.dash=.25;p.dashCd=.8;p.inv=Math.max(p.inv,.28);p.vy=Math.min(0,p.vy);this.emit('sound',{name:'dash'});this.spark(p.x,p.y-45,12,'#9aaad0');}
  if(p.jumpBuffer>0&&(p.coyote>0||p.jumps<2)&&p.dash<=0){p.vy=-680;p.grounded=false;p.jumps=p.coyote>0?1:p.jumps+1;p.coyote=0;p.jumpBuffer=0;this.emit('sound',{name:'jump'});this.spark(p.x,p.y,10,p.jumps===2?'#9dcdfc':'#c2b7a0');}
  // Releasing jump early controls its height; the second press always starts a new jump.
  if(!input.jump&&p.vy< -280)p.vy+=dt*1000;
  if(input.attack&&p.attack<=0&&p.dash<=0&&p.hurt<=0){p.combo=p.comboWindow>0?(p.combo+1)%3:0;p.comboWindow=.95;p.attack=.43+(p.combo===2?.1:0);p.attackTotal=p.attack;p.attackId++;this.emit('sound',{name:'whip'});}
  if(pressed('magic')&&p.magicCd<=0&&p.mp>=25){p.mp-=25;p.magicCd=.48;this.shots.push({x:p.x+p.dir*35,y:p.y-65,vx:p.dir*660,vy:0,life:2.3,enemy:false,hits:[]});this.spark(p.x+p.dir*40,p.y-65,12,'#afdfff');this.emit('sound',{name:'magic'});}
  if(p.hurt<=0)p.vx=p.dash>0?p.dir*780:axis*280*(p.attack>0?.62:1);else p.vx*=Math.pow(.03,dt);
  const prevY=p.y;p.x+=p.vx*dt;if(p.dash<=0)p.vy+=GRAVITY*dt;p.y+=p.vy*dt;p.grounded=false;
  const surfaces=[{x:0,y:FLOOR,w:r.width},...r.platforms];
  if(p.vy>=0)for(const s of surfaces){if(p.x+16>s.x&&p.x-16<s.x+s.w&&prevY<=s.y+3&&p.y>=s.y){p.y=s.y;p.vy=0;p.grounded=true;p.jumps=0;}}
  if(p.y>FLOOR){p.y=FLOOR;p.vy=0;p.grounded=true;p.jumps=0;}
  p.x=clamp(p.x,28,r.width-28);
  if(p.attack>0){p.attack-=dt;const elapsed=p.attackTotal-p.attack;if(elapsed>.10&&elapsed<.30+(p.combo===2?.08:0)){const range=160+p.combo*35+(this.progress.relic?28:0);for(const e of this.enemies){const dx=(e.x-p.x)*p.dir,dy=Math.abs((e.y-(e.type==='bat'?25:e.type==='boss'?100:65))-(p.y-65));if(e.hp>0&&e.lastHit!==p.attackId&&dx>-30&&dx<range+25&&dy<(e.type==='boss'?120:95)){e.lastHit=p.attackId;this.hit(e,Math.round(this.damage*(p.combo===2?1.45:1)),p.dir);this.freeze=.035;this.emit('shake',{amount:p.combo===2?4:2});}}}}
  for(const e of this.enemies)this.updateEnemy(e,dt);
  for(const s of this.shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;if(s.enemy){if(Math.abs(s.x-p.x)<25&&Math.abs(s.y-(p.y-60))<54){this.hurt(15,Math.sign(s.vx));s.life=0;}}else for(const e of this.enemies){if(e.hp>0&&!s.hits.includes(e.id)&&Math.abs(e.x-s.x)<(e.type==='boss'?60:35)&&Math.abs((e.y-(e.type==='boss'?100:e.type==='bat'?25:65))-s.y)<(e.type==='boss'?120:62)){s.hits.push(e.id);this.hit(e,46+(this.progress.level-1)*5,Math.sign(s.vx),true);}}}this.shots=this.shots.filter(s=>s.life>0&&s.x>-100&&s.x<r.width+100);
  for(const item of this.items){if(item.taken||Math.abs(item.x-p.x)>47||Math.abs(item.y-(p.y-55))>70)continue;item.taken=true;this.spark(item.x,item.y,32,'#f8dda0');this.emit('sound',{name:'rest'});if(item.type==='seal'){this.progress.seals.push(item.id);this.emit('toast',{text:(item.id==='tide'?'潮の月印':'鐘の月印')+'を入手 — '+this.progress.seals.length+' / 2'});this.emit('save');}else if(item.type==='relic'){this.progress.relic=true;this.emit('toast',{text:'月銀の鎖 — 鞭の威力と射程が上昇'});this.emit('save');}else if(item.type==='chest'){this.progress.chests.push(item.id);this.progress.gold+=100;p.potions=Math.min(5,p.potions+1);this.emit('toast',{text:'宝箱 — 100ソウル・回復薬 +1'});this.emit('save');}else{p.hp=Math.min(this.maxHp,p.hp+35);this.emit('toast',{text:'生命の欠片 — 体力回復'});}}
  this.activeInteract=null;
  if(r.shrine!==null&&Math.abs(p.x-r.shrine)<70&&Math.abs(p.y-FLOOR)<30)this.activeInteract={kind:'shrine',label:'祈る・保存'};
  for(const door of r.portals)if(Math.abs(p.x-door.x)<70&&Math.abs(p.y-door.y)<38)this.activeInteract={kind:'portal',label:door.label,door};
  if(pressed('interact')&&this.activeInteract){if(this.activeInteract.kind==='shrine')this.rest();else{const d=this.activeInteract.door;this.enter(d.to,d.returnX||180,d.returnY||FLOOR);this.prev={...input};return;}}
  if(r.id===4&&p.x>700&&!this.progress.bossDefeated){if(!this.bossActive){this.bossActive=true;this.emit('toast',{text:'弔鐘の大司教 — ヴェスパー'});this.emit('sound',{name:'boss'});}p.x=Math.max(700,p.x);}
  if(this.bossActive)p.x=Math.max(700,p.x);
  if(this.transitionCooldown<=0){if(p.x<45&&r.left!==null){const old=r.id;const xx=old===2?1000:old===3?1600:ROOMS[r.left].width-100;this.enter(r.left,xx,old===3?315:FLOOR);this.prev={...input};return;}if(p.x>r.width-48&&r.right!==null){if(r.right===4&&this.sealed){p.x=r.width-55;if(this.gateNotice<=0){this.emit('toast',{text:'封印扉 — 書庫と鐘楼の二つの月印が必要'});this.gateNotice=3;}}else{this.enter(r.right);this.prev={...input};return;}}}
  this.prev={...input};
 }
 updateEnemy(e,dt){
  const p=this.player;e.anim+=dt;e.flash=Math.max(0,e.flash-dt);if(e.hp<=0){e.dead=Math.max(0,e.dead-dt);return;}e.cool-=dt;e.timer-=dt;const dx=p.x-e.x,dy=p.y-e.y,dist=Math.abs(dx);if(dist>1000)return;
  if(e.type==='boss'){if(!this.bossActive)return;this.updateBoss(e,dt);return;}
  if(e.state==='stun'){if(e.timer<=0)e.state='idle';return;}
  if(e.type==='bat'){
   if(e.state==='windup'){if(e.timer<=0){e.state='dive';e.timer=.6;const len=Math.hypot(dx,p.y-55-e.y)||1;e.vx=dx/len*280;e.vy=(p.y-55-e.y)/len*280;}}
   else if(e.state==='dive'){e.x+=e.vx*dt;e.y+=e.vy*dt;if(Math.abs(e.x-p.x)<38&&Math.abs(e.y-(p.y-55))<45)this.hurt(9,Math.sign(e.vx));if(e.timer<=0){e.state='idle';e.cool=1.8;}}
   else{e.y+=(e.homeY+Math.sin(e.anim*3)*28-e.y)*dt*2;e.x+=clamp(dx,-1,1)*24*dt;if(dist<420&&e.cool<=0){e.state='windup';e.timer=.65;}}
   e.x=clamp(e.x,e.homeX-360,e.homeX+360);e.dir=dx>0?1:-1;return;
  }
  if(e.state==='windup'){if(e.timer<=0){e.state='strike';e.timer=.22;e.swingDir=e.dir;this.emit('sound',{name:'swing'});}}
  else if(e.state==='strike'){if(dist<135&&Math.abs(dy)<100&&(dx*e.swingDir)>-15)this.hurt(12,e.swingDir);if(e.timer<=0){e.state='recover';e.timer=.65;}}
  else if(e.state==='recover'){if(e.timer<=0){e.state='idle';e.cool=.45;}}
  else{e.dir=dx>0?1:-1;if(dist<120&&Math.abs(dy)<95&&e.cool<=0){e.state='windup';e.timer=.6;}else if(dist<540&&dist>95){const nx=e.x+e.dir*65*dt;const support=e.homeY<FLOOR?this.room.platforms.find(s=>Math.abs(s.y-e.homeY)<3&&e.x>=s.x&&e.x<=s.x+s.w):null;e.x=support?clamp(nx,support.x+25,support.x+support.w-25):clamp(nx,Math.max(70,e.homeX-240),Math.min(this.room.width-70,e.homeX+240));}}
 }
 updateBoss(e,dt){const p=this.player,dx=p.x-e.x;const phase=e.hp<e.maxHp*.5?2:1;
  if(e.state==='idle'){e.dir=dx>0?1:-1;e.x+=Math.sign(dx)*34*dt;if(e.cool<=0){e.cycle++;e.state=e.cycle%2?'chant':'windup';e.timer=phase===2?.82:1.1;e.swingDir=e.dir;this.emit('sound',{name:'charge'});}}
  else if(e.state==='chant'&&e.timer<=0){const aim=Math.atan2(p.y-60-(e.y-150),p.x-e.x);for(let i=-phase;i<=phase;i++){const a=aim+i*.22;this.shots.push({x:e.x,y:e.y-150,vx:Math.cos(a)*230,vy:Math.sin(a)*230,life:4,enemy:true});}e.state='recover';e.timer=1.0;this.emit('sound',{name:'magic'});}
  else if(e.state==='windup'&&e.timer<=0){e.state='strike';e.timer=.45;}
  else if(e.state==='strike'){e.x=clamp(e.x+e.swingDir*510*dt,750,this.room.width-120);if(Math.abs(p.x-e.x)<155&&Math.abs(p.y-e.y)<115)this.hurt(20,e.swingDir);if(e.timer<=0){e.state='recover';e.timer=1.2;}}
  else if(e.state==='recover'&&e.timer<=0){e.state='idle';e.cool=phase===2?.5:.8;}
 }
 animateEffects(dt){for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=220*dt;p.life-=dt;}this.particles=this.particles.filter(p=>p.life>0);for(const e of this.effects){e.life-=dt;if(e.type==='number')e.y-=dt*45;if(e.type==='victory'&&e.life<=0){this.state='victory';this.emit('victory');}}this.effects=this.effects.filter(e=>e.life>0);}
}
