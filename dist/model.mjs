import {ROOMS,FLOOR,UPGRADES,LORE,ENEMY_INFO} from './content.mjs?v=2.1.0';
export {ROOMS,FLOOR,UPGRADES,LORE,ENEMY_INFO};
export const GRAVITY=1900;
export const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const approach=(v,target,amount)=>v<target?Math.min(v+amount,target):Math.max(v-amount,target);
const number=(v,fallback,min,max)=>Number.isFinite(Number(v))?clamp(Number(v),min,max):fallback;
const unique=(v,allowed)=>Array.isArray(v)?[...new Set(v.filter(x=>allowed.includes(x)))]:[];
const checkpoint=c=>{
  if(!c||!Number.isInteger(c.room)||!ROOMS[c.room])return {room:0,x:240,y:FLOOR};
  const room=c.room;let x=number(c.x,ROOMS[room].spawn,80,ROOMS[room].width-80),y=number(c.y,FLOOR,180,FLOOR);
  if(room===4&&x>650)return {room:4,x:270,y:FLOOR};
  return {room,x,y};
};
export function freshProgress(){
  return {version:2,room:0,x:220,y:FLOOR,checkpoint:{room:0,x:240,y:FLOOR},seals:[],chests:[],lore:[],wardens:[],shrines:[0],upgrades:{edge:0,vitality:0,focus:0},relic:false,gold:0,xp:0,level:1,bossDefeated:false,visited:[0],bestiary:[],time:0,kills:0,deaths:0};
}
export function validateSave(raw){
  if(!raw||![1,2].includes(raw.version)||!Number.isInteger(raw.room)||!ROOMS[raw.room])return null;
  const p=freshProgress();const c=checkpoint({room:raw.room,x:raw.x,y:raw.y});
  Object.assign(p,c,{checkpoint:c});
  p.seals=unique(raw.seals,['tide','bell']);p.wardens=unique(raw.wardens||p.seals,['tide','bell']);
  p.chests=unique(raw.chests,['cloister','archive']);p.lore=unique(raw.lore,Object.keys(LORE));
  p.visited=unique(raw.visited,ROOMS.map(r=>r.id));if(!p.visited.includes(p.room))p.visited.push(p.room);
  p.shrines=unique(raw.shrines||[0],ROOMS.map(r=>r.id));if(!p.shrines.includes(0))p.shrines.unshift(0);
  p.bestiary=unique(raw.bestiary,Object.keys(ENEMY_INFO));
  for(const k of Object.keys(UPGRADES))p.upgrades[k]=Math.floor(number(raw.upgrades?.[k],0,0,UPGRADES[k].max));
  for(const [k,hi] of Object.entries({gold:999999,xp:99999,time:999999,kills:99999,deaths:99999}))p[k]=number(raw[k],0,0,hi);
  p.level=Math.floor(number(raw.level,1,1,12));p.relic=raw.relic===true;p.bossDefeated=raw.bossDefeated===true;
  return p;
}
export class GameModel{
  constructor(progress=null,options={}){
    this.progress=validateSave(progress)||freshProgress();this.options={difficulty:'standard',...options};
    this.events=[];this.particles=[];this.shots=[];this.effects=[];this.time=0;this.freeze=0;this.state='play';this.prev={};this.pending={};this.transitionCooldown=1;this.bossActive=false;this.bossPhase=1;
    this.player={x:200,y:FLOOR,vx:0,vy:0,dir:1,hp:100,mp:100,potions:3,inv:0,dash:0,dashCd:0,magicCd:0,cast:0,dashBuffer:0,magicBuffer:0,attack:0,attackId:0,attackBuffer:0,combo:0,comboWindow:0,jumpBuffer:0,coyote:0,jumps:0,grounded:true,anim:0,hurt:0,land:0,drop:0,run:0,trail:[],dashReward:false};
    this.enter(this.progress.room,this.progress.x,this.progress.y,false);this.player.hp=this.maxHp;this.player.mp=this.maxMp;
  }
  get room(){return ROOMS[this.progress.room];}
  get maxHp(){return 100+(this.progress.level-1)*10+this.progress.upgrades.vitality*20;}
  get maxMp(){return 100+this.progress.upgrades.focus*20;}
  get damage(){return 25+(this.progress.level-1)*3+this.progress.upgrades.edge*5+(this.progress.relic?12:0);}
  get magicDamage(){return 46+(this.progress.level-1)*4+this.progress.upgrades.focus*6;}
  get sealed(){return this.progress.seals.length<2;}
  get completion(){return Math.round((this.progress.visited.length+this.progress.seals.length+this.progress.chests.length+this.progress.lore.length+Number(this.progress.relic)+Number(this.progress.bossDefeated))/16*100);}
  emit(type,data={}){this.events.push({type,...data});}
  drain(){return this.events.splice(0);}
  enter(id,x=180,y=FLOOR,save=true){
    const r=ROOMS[id];if(!r)return false;this.progress.room=id;
    Object.assign(this.player,{x:clamp(x,70,r.width-70),y,vx:0,vy:0,grounded:true,jumps:0,attack:0,attackBuffer:0,dashBuffer:0,magicBuffer:0,dash:0,cast:0,inv:1.3,trail:[]});
    this.enemies=r.enemies.filter(e=>(e.type!=='boss'||!this.progress.bossDefeated)&&(!e.warden||!this.progress.wardens.includes(e.warden))).map((e,i)=>{
      const hp=ENEMY_INFO[e.type].hp*(e.warden?1.65:1);
      return {...e,id:i,homeX:e.x,homeY:e.y,vx:0,vy:0,dir:-1,hp,maxHp:hp,state:'idle',timer:0,cool:1+i*.23,anim:i,flash:0,lastHit:-1,cycle:0,dead:0,phase:1};
    });
    this.items=r.items.map(i=>({...i,taken:i.type==='seal'?this.progress.seals.includes(i.id):i.type==='chest'?this.progress.chests.includes(i.id):i.type==='lore'?this.progress.lore.includes(i.id):i.type==='relic'?this.progress.relic:false}));
    this.hazards=r.hazards.map(h=>({...h,active:false,warn:0}));this.breakables=r.breakables.map((x,id)=>({id,x,y:FLOOR,broken:false}));
    this.shots=[];this.effects=[];this.particles=[];this.transitionCooldown=.8;this.bossActive=false;this.bossPhase=1;this.activeInteract=null;this.gateNotice=0;this.prev={};this.pending={};this.freeze=0;
    if(!this.progress.visited.includes(id))this.progress.visited.push(id);this.emit('room',{room:r});
    if(save){this.progress.checkpoint={room:id,x:this.player.x,y:this.player.y};this.emit('save');}
    return true;
  }
  saveData(){const c=checkpoint(this.progress.checkpoint);return {...this.progress,version:2,room:c.room,x:c.x,y:c.y,checkpoint:c};}
  rest(){
    if(this.bossActive)return false;const p=this.player;p.hp=this.maxHp;p.mp=this.maxMp;p.potions=3;p.inv=Math.max(p.inv,1.5);
    this.progress.checkpoint={room:this.progress.room,x:this.room.shrine,y:FLOOR};
    if(!this.progress.shrines.includes(this.room.id))this.progress.shrines.push(this.room.id);
    this.emit('save');this.emit('sound',{name:'rest'});this.spark(p.x,p.y-60,26,'#7be8f0');this.emit('shrine');return true;
  }
  purchase(key){
    if(this.bossActive||!this.activeInteract||this.activeInteract.kind!=='shrine')return false;
    const def=UPGRADES[key],level=this.progress.upgrades[key];if(!def||level>=def.max||this.progress.gold<def.cost[level])return false;
    this.progress.gold-=def.cost[level];this.progress.upgrades[key]++;this.player.hp=this.maxHp;this.player.mp=this.maxMp;
    this.emit('save');this.emit('sound',{name:'rest'});this.emit('toast',{text:def.name+'を強化しました'});return true;
  }
  travel(id){
    if(this.bossActive||!this.activeInteract||this.activeInteract.kind!=='shrine'||!this.progress.shrines.includes(id)||id===this.room.id)return false;
    this.enter(id,ROOMS[id].shrine,FLOOR);this.player.hp=this.maxHp;this.player.mp=this.maxMp;this.player.potions=3;this.emit('sound',{name:'rest'});return true;
  }
  heal(){const p=this.player;if(p.potions&&p.hp<this.maxHp){p.potions--;p.hp=Math.min(this.maxHp,p.hp+Math.max(65,this.maxHp*.55));this.spark(p.x,p.y-65,25,'#90efc9');this.emit('sound',{name:'heal'});}else this.emit('toast',{text:p.potions?'体力は満タンです':'燭台で回復薬を補充できます'});}
  retry(){const c=this.progress.checkpoint;this.state='play';this.enter(c.room,c.x,c.y,false);Object.assign(this.player,{hp:this.maxHp,mp:this.maxMp,potions:3,inv:2});}
  spark(x,y,n,color,force=170){
    for(let i=0;i<n;i++){const a=Math.random()*Math.PI*2,v=force*(.25+Math.random());this.particles.push({x,y,vx:Math.cos(a)*v,vy:Math.sin(a)*v,life:.3+Math.random()*.5,max:.8,color,size:1+Math.random()*3});}
    if(this.particles.length>220)this.particles.splice(0,this.particles.length-220);
  }
  hurt(amount,dir){
    const p=this.player;if(this.state!=='play')return;
    if(p.dash>0){if(p.dash>.10&&!p.dashReward){p.dashReward=true;p.mp=Math.min(this.maxMp,p.mp+15);this.effects.push({type:'dodge',x:p.x,y:p.y-140,life:.85});this.emit('sound',{name:'parry'});this.emit('haptic',{kind:'light'});}return;}
    if(p.inv>0)return;
    const damage=Math.round(amount*(this.options.difficulty==='story'?.6:1));
    p.hp=Math.max(0,p.hp-damage);p.inv=1.05;p.hurt=.24;p.attack=0;p.vx=dir*220;p.vy=-160;p.grounded=false;
    this.spark(p.x,p.y-65,17,'#e58c97');this.emit('shake',{amount:5});this.emit('sound',{name:'hurt'});this.emit('haptic',{kind:'hurt'});
    if(p.hp<=0){this.state='dead';this.progress.deaths++;this.emit('save');this.emit('dead');}
  }
  moveEnemy(e,dx){
    const support=e.homeY<FLOOR&&e.type!=='bat'&&e.type!=='wraith'?this.room.platforms.find(s=>Math.abs(s.y-e.homeY)<3&&e.homeX>=s.x&&e.homeX<=s.x+s.w):null;
    e.x=support?clamp(e.x+dx,support.x+15,support.x+support.w-15):clamp(e.x+dx,Math.max(60,e.homeX-320),Math.min(this.room.width-60,e.homeX+320));
  }
  hit(e,amount,dir,magic=false,finisher=false){
    if(e.hp<=0||e.state==='transform')return;
    const guarded=e.type==='lancer'&&!magic&&!finisher&&e.dir===-dir&&['idle','windup'].includes(e.state);
    const dmg=Math.round(amount*(guarded?.35:magic&&e.type==='wraith'?1.5:1));e.hp=Math.max(0,e.hp-dmg);e.flash=.17;
    if(e.type!=='boss')this.moveEnemy(e,dir*(guarded?3:finisher?40:16));
    this.spark(e.x,e.y-(e.type==='boss'?110:e.type==='bat'?25:65),guarded?8:magic?20:14,guarded?'#b5cfed':magic?'#9bd9ff':'#e7c18d');
    this.effects.push({type:'number',x:e.x,y:e.y-110,value:dmg,life:.7,guarded,finisher});this.effects.push({type:'impact',x:e.x,y:e.y-65,life:.2,magic,finisher});
    this.emit('sound',{name:guarded?'guard':'hit'});if(!guarded&&e.type!=='boss'){e.state='stun';e.timer=.24+this.progress.upgrades.edge*.035+(finisher?.15:0);}
    if(e.hp>0)return;
    e.dead=.8;this.progress.kills++;const info=ENEMY_INFO[e.type];this.progress.gold+=info.gold*(e.warden?3:1);this.progress.xp+=info.xp*(e.warden?2:1);
    if(!this.progress.bestiary.includes(e.type))this.progress.bestiary.push(e.type);
    this.emit('sound',{name:'kill'});this.spark(e.x,e.y-60,32,'#b7a7eb',250);this.player.hp=Math.min(this.maxHp,this.player.hp+5);this.player.mp=Math.min(this.maxMp,this.player.mp+8);
    while(this.progress.level<12&&this.progress.xp>=this.progress.level*75){this.progress.xp-=this.progress.level*75;this.progress.level++;this.player.hp=this.maxHp;this.emit('toast',{text:'LEVEL UP — 体力・攻撃力が上昇'});this.emit('sound',{name:'rest'});}
    if(e.warden){this.progress.wardens.push(e.warden);this.emit('toast',{text:'守り人を撃破 — 月印の封印が解けた'});this.emit('save');}
    if(e.type==='boss'){
      this.progress.bossDefeated=true;this.bossActive=false;this.shots=[];this.emit('save');this.effects.push({type:'victory',life:3.2});this.emit('shake',{amount:10});
    }
  }
  startAttack(){const p=this.player;p.combo=p.comboWindow>0?(p.combo+1)%3:0;p.comboWindow=.9;p.attackTotal=[.36,.38,.52][p.combo];p.attack=p.attackTotal;p.attackBuffer=0;p.attackId++;this.emit('sound',{name:p.combo===2?'whipHeavy':'whip'});}
  update(dt,input={}){
    this.time+=dt;this.animateEffects(dt);if(this.state!=='play'){this.prev={...input};return;}
    // Latch short action presses even when an impact has briefly stopped simulation.
    if(this.freeze>0){this.freeze-=dt;for(const k of ['jump','attack','dash','magic','heal','interact','down'])if(input[k]&&!this.prev[k])this.pending[k]=true;return;}
    input={...input,...this.pending};this.pending={};
    this.progress.time+=dt;const p=this.player,r=this.room,pressed=k=>!!input[k]&&!this.prev[k];this.transitionCooldown-=dt;this.gateNotice=Math.max(0,this.gateNotice-dt);const wasDashing=p.dash>0;
    for(const key of ['inv','dash','dashCd','magicCd','comboWindow','jumpBuffer','attackBuffer','dashBuffer','magicBuffer','cast','coyote','hurt','land','drop'])p[key]=Math.max(0,p[key]-dt);
    p.mp=Math.min(this.maxMp,p.mp+(5.5+this.progress.upgrades.focus*.8)*dt);p.anim+=dt;
    if(pressed('heal'))this.heal();if(pressed('jump'))p.jumpBuffer=.14;if(pressed('attack'))p.attackBuffer=.18;if(pressed('dash'))p.dashBuffer=.15;if(pressed('magic')){if(p.mp>=25)p.magicBuffer=.24;else this.emit('toast',{text:'魔力が足りません — 回避を成功させると回復'});}
    if(p.grounded)p.coyote=.12;
    const axis=(input.right?1:0)-(input.left?1:0);
    if(axis&&p.dash<=0&&p.hurt<=0&&(p.attack<=0||p.attackTotal-p.attack<.08))p.dir=axis;
    if((pressed('down')||input.down&&pressed('jump'))&&p.grounded&&p.y<FLOOR){p.drop=.22;p.y+=5;p.vy=80;p.jumpBuffer=0;p.coyote=0;p.grounded=false;}
    if(p.dashBuffer>0&&p.dashCd<=0&&p.hurt<=0){if(axis)p.dir=axis;p.dashBuffer=0;p.dash=.22;p.dashCd=.78;p.inv=Math.max(p.inv,.25);p.vy=0;p.attack=0;p.dashReward=false;this.emit('sound',{name:'dash'});this.spark(p.x,p.y-45,12,'#9aaad0');}
    if(p.jumpBuffer>0&&(p.coyote>0||p.jumps<2)&&p.dash<=0&&p.hurt<=0){
      p.vy=-680;p.grounded=false;p.jumps=p.coyote>0?1:p.jumps+1;p.coyote=0;p.jumpBuffer=0;this.emit('sound',{name:'jump'});this.spark(p.x,p.y,10,p.jumps===2?'#9dcdfc':'#c2b7a0');if(p.jumps===2)this.effects.push({type:'jumpRing',x:p.x,y:p.y+4,life:.35});
    }
    if(!input.jump&&p.vy< -280)p.vy+=dt*1000;
    if((input.attack||p.attackBuffer>0)&&p.attack<=0&&p.dash<=0&&p.hurt<=0)this.startAttack();
    if(p.magicBuffer>0&&p.magicCd<=0&&p.dash<=0&&p.hurt<=0&&p.mp>=25){
      p.magicBuffer=0;p.mp-=25;p.magicCd=.48;p.cast=.20;this.shots.push({x:p.x+p.dir*35,y:p.y-65,vx:p.dir*720,vy:0,life:2.3,enemy:false,hits:[]});this.spark(p.x+p.dir*40,p.y-65,12,'#afdfff');this.emit('sound',{name:'magic'});
    }
    // End a dodge at walking speed instead of carrying its 820px/s speed into a long slide.
    if(wasDashing&&p.dash<=0)p.vx=axis*300;
    if(p.hurt<=0)p.vx=p.dash>0?p.dir*820:approach(p.vx,axis*300*(p.attack>0?.7:1),(axis?2900:3500)*dt);else p.vx*=Math.pow(.025,dt);
    const prevY=p.y,wasGrounded=p.grounded,fallSpeed=p.vy;p.x+=p.vx*dt;if(p.dash<=0)p.vy+=GRAVITY*dt;p.y+=p.vy*dt;p.grounded=false;
    const surfaces=[{x:0,y:FLOOR,w:r.width},...(p.drop>0?[]:r.platforms)].sort((a,b)=>a.y-b.y);
    if(p.vy>=0)for(const s of surfaces){if(p.x+16>s.x&&p.x-16<s.x+s.w&&prevY<=s.y+3&&p.y>=s.y){p.y=s.y;p.vy=0;p.grounded=true;p.jumps=0;break;}}
    if(p.y>FLOOR){p.y=FLOOR;p.vy=0;p.grounded=true;p.jumps=0;}
    if(!wasGrounded&&p.grounded&&fallSpeed>180){p.land=.12;this.spark(p.x,p.y,fallSpeed>550?12:6,'#a0a8b7',90);this.emit('sound',{name:'land'});}
    p.x=clamp(p.x,28,r.width-28);p.run+=Math.abs(p.vx)*dt/28;
    if(p.dash>0&&Math.floor(p.anim*60)%2===0){p.trail.push({x:p.x,y:p.y,dir:p.dir,life:.24});}for(const a of p.trail)a.life-=dt;p.trail=p.trail.filter(a=>a.life>0).slice(-7);
    this.updateAttack(dt);
    for(const e of this.enemies)this.updateEnemy(e,dt);
    this.updateShots(dt);this.updateHazards();if(this.state!=='play'){this.prev={...input};return;}this.collectItems();this.updateInteractions(pressed);
    if(this.room!==r){this.prev={...input};return;}
    if(r.id===4&&p.x>700&&!this.progress.bossDefeated){if(!this.bossActive){this.bossActive=true;this.emit('toast',{text:'弔鐘の大司教 — ヴェスパー'});this.emit('sound',{name:'boss'});}p.x=Math.max(700,p.x);}
    if(this.bossActive)p.x=Math.max(700,p.x);
    if(this.transitionCooldown<=0){
      if(p.x<45&&r.left!==null){const old=r.id;this.enter(r.left,old===2?1000:old===3?1600:ROOMS[r.left].width-100,old===3?315:FLOOR);this.prev={...input};return;}
      if(p.x>r.width-48&&r.right!==null){if(r.right===4&&this.sealed){p.x=r.width-55;if(this.gateNotice<=0){this.emit('toast',{text:'封印扉 — 書庫と鐘楼の二つの月印が必要'});this.gateNotice=3;}}else{this.enter(r.right);this.prev={...input};return;}}
    }
    this.prev={...input};
  }
  updateAttack(dt){
    const p=this.player;if(p.attack<=0)return;p.attack-=dt;const elapsed=p.attackTotal-p.attack;
    if(elapsed<.095||elapsed>(p.combo===2?.39:.27))return;
    const range=162+p.combo*34+(this.progress.relic?28:0);
    for(const e of this.enemies){const dx=(e.x-p.x)*p.dir,dy=Math.abs((e.y-(e.type==='bat'?25:e.type==='boss'?100:65))-(p.y-65));
      if(e.hp>0&&e.lastHit!==p.attackId&&dx>-30&&dx<range+25&&dy<(e.type==='boss'?120:p.combo===2?120:94)){
        e.lastHit=p.attackId;this.hit(e,Math.round(this.damage*(p.combo===2?1.5:1)),p.dir,false,p.combo===2);this.freeze=p.combo===2?.055:.028;this.emit('shake',{amount:p.combo===2?4:2});this.emit('haptic',{kind:'light'});
      }
    }
    for(const b of this.breakables){const dx=(b.x-p.x)*p.dir;if(!b.broken&&dx> -20&&dx<range&&Math.abs(b.y-p.y)<110){b.broken=true;this.progress.gold+=8;this.player.mp=Math.min(this.maxMp,this.player.mp+6);this.spark(b.x,b.y-70,16,'#d7af68');this.effects.push({type:'number',x:b.x,y:b.y-105,value:'+8',life:.8});this.emit('sound',{name:'break'});}}
  }
  updateShots(dt){
    const p=this.player;
    for(const s of this.shots){s.x+=s.vx*dt;s.y+=s.vy*dt;s.life-=dt;
      if(s.enemy){if(Math.abs(s.x-p.x)<26&&Math.abs(s.y-(p.y-60))<51){this.hurt(s.damage||15,Math.sign(s.vx)||1);s.life=0;}}
      else for(const e of this.enemies){if(e.hp>0&&!s.hits.includes(e.id)&&Math.abs(e.x-s.x)<(e.type==='boss'?60:40)&&Math.abs((e.y-(e.type==='boss'?100:e.type==='bat'?25:65))-s.y)<(e.type==='boss'?120:65)){s.hits.push(e.id);this.hit(e,this.magicDamage,Math.sign(s.vx),true);}}
    }
    this.shots=this.shots.filter(s=>s.life>0&&s.x>-100&&s.x<this.room.width+100&&s.y<760&&s.y> -80);
  }
  updateHazards(){
    const p=this.player;
    for(const h of this.hazards){const cycle=(this.time+h.offset)%h.period;h.active=cycle>h.period-.55;h.warn=cycle>h.period-1.5&&!h.active?(cycle-(h.period-1.5))/.95:0;
      if(h.active&&p.x>h.x-12&&p.x<h.x+h.w+12&&p.y>FLOOR-110)this.hurt(14,p.x<h.x+h.w/2?-1:1);
    }
    for(const e of this.effects){if(e.type==='eruption'&&e.life<.55&&e.life>0&&Math.abs(p.x-e.x)<e.w/2+15&&p.y>FLOOR-175)this.hurt(19,p.x<e.x?-1:1);}
  }
  collectItems(){
    const p=this.player;
    for(const item of this.items){if(item.taken||item.type==='lore'||Math.abs(item.x-p.x)>46||Math.abs(item.y-(p.y-55))>68)continue;
      if(item.type==='seal'&&!this.progress.wardens.includes(item.id)){if(this.gateNotice<=0){this.emit('toast',{text:'月印は守り人に封じられている'});this.gateNotice=4;}continue;}
      item.taken=true;this.spark(item.x,item.y,32,'#f8dda0');this.emit('sound',{name:'rest'});
      if(item.type==='seal'){this.progress.seals.push(item.id);this.emit('discovery',{title:item.id==='tide'?'潮の月印':'鐘の月印',text:this.progress.seals.length===2?'二つの月印が揃った。礼拝堂の封印扉へ。':'もう一つの印を探そう。燭台から旅を続けられる。',icon:'seal'});this.emit('save');}
      else if(item.type==='relic'){this.progress.relic=true;this.emit('discovery',{title:'月銀の鎖',text:'鞭の威力 +12 ／ 射程 +28。月光を帯びた銀鎖が目を覚ます。',icon:'relic'});this.emit('save');}
      else if(item.type==='chest'){this.progress.chests.push(item.id);this.progress.gold+=100;p.potions=Math.min(5,p.potions+1);this.emit('toast',{text:'宝箱 — 100ソウル・回復薬 +1'});this.emit('save');}
      else{p.hp=Math.min(this.maxHp,p.hp+35);this.emit('toast',{text:'生命の欠片 — 体力回復'});}
    }
  }
  updateInteractions(pressed){
    const p=this.player,r=this.room;this.activeInteract=null;
    if(r.shrine!==null&&!this.bossActive&&Math.abs(p.x-r.shrine)<72&&Math.abs(p.y-FLOOR)<30)this.activeInteract={kind:'shrine',label:'祈る・強化・転移'};
    for(const door of r.portals)if(Math.abs(p.x-door.x)<70&&Math.abs(p.y-door.y)<38)this.activeInteract={kind:'portal',label:door.label,door};
    for(const item of this.items)if(item.type==='lore'&&!item.taken&&Math.abs(p.x-item.x)<60&&Math.abs(item.y-(p.y-50))<55)this.activeInteract={kind:'lore',label:'残された手記を読む',item};
    if(!pressed('interact')||!this.activeInteract)return;const a=this.activeInteract;
    if(a.kind==='shrine')this.rest();
    else if(a.kind==='lore'){a.item.taken=true;this.progress.lore.push(a.item.id);this.emit('save');this.emit('lore',{id:a.item.id});this.emit('sound',{name:'page'});}
    else{const d=a.door;this.enter(d.to,d.returnX||180,d.returnY||FLOOR);}
  }
  updateEnemy(e,dt){
    const p=this.player;e.anim+=dt;e.flash=Math.max(0,e.flash-dt);if(e.hp<=0){e.dead=Math.max(0,e.dead-dt);return;}e.cool-=dt;e.timer-=dt;
    const dx=p.x-e.x,dy=p.y-e.y,dist=Math.abs(dx);if(dist>1100)return;
    if(e.type==='boss'){if(this.bossActive)this.updateBoss(e,dt);return;}
    if(e.state==='stun'){if(e.timer<=0){e.state='idle';e.cool=.4;}return;}
    if(e.type==='bat'||e.type==='wraith'){
      const wraith=e.type==='wraith';
      if(e.state==='windup'){if(e.timer<=0){e.state='dive';e.timer=wraith?.85:.6;const len=Math.hypot(dx,p.y-55-e.y)||1;e.vx=dx/len*(wraith?320:290);e.vy=(p.y-55-e.y)/len*(wraith?320:290);}}
      else if(e.state==='dive'){e.x+=e.vx*dt;e.y+=e.vy*dt;if(Math.abs(e.x-p.x)<40&&Math.abs(e.y-(p.y-55))<48)this.hurt(wraith?13:9,Math.sign(e.vx));if(e.timer<=0){e.state='recover';e.timer=.8;}}
      else if(e.state==='recover'){e.y+=(e.homeY-e.y)*dt;if(e.timer<=0){e.state='idle';e.cool=1.2;}}
      else{e.y+=(e.homeY+Math.sin(e.anim*2.5)*25-e.y)*dt*2;e.x+=clamp(dx,-1,1)*(wraith?32:22)*dt;if(dist<440&&e.cool<=0){e.state='windup';e.timer=wraith?.9:.65;}}
      e.x=clamp(e.x,e.homeX-360,e.homeX+360);e.dir=dx>0?1:-1;return;
    }
    if(e.type==='acolyte'){
      if(e.state==='windup'&&e.timer<=0){e.state='cast';e.timer=.35;for(const spread of (e.warden?[-.15,0,.15]:[0])){const a=e.aim+spread;this.shots.push({x:e.x+e.dir*24,y:e.y-97,vx:Math.cos(a)*310,vy:Math.sin(a)*310,life:3.5,enemy:true,kind:'ember',damage:12});}this.emit('sound',{name:'enemyMagic'});}
      else if(e.state==='cast'&&e.timer<=0){e.state='recover';e.timer=.9;}
      else if(e.state==='recover'&&e.timer<=0){e.state='idle';e.cool=.9;}
      else if(e.state==='idle'){e.dir=dx>0?1:-1;if(dist<650&&e.cool<=0){e.state='windup';e.timer=1.15;e.aim=Math.atan2(p.y-60-(e.y-97),dx);}else if(dist<175&&Math.abs(dy)<100)this.moveEnemy(e,-e.dir*40*dt);}
      return;
    }
    const lance=e.type==='lancer',range=lance?190:126;
    if(e.state==='windup'){if(e.timer<=0){e.state='strike';e.timer=lance?.30:.22;e.swingDir=e.dir;this.emit('sound',{name:'swing'});}}
    else if(e.state==='strike'){
      if(lance)this.moveEnemy(e,e.swingDir*130*dt);
      if(dist<range&&Math.abs(dy)<100&&dx*e.swingDir> -15)this.hurt(lance?(e.warden?19:16):12,e.swingDir);
      if(e.timer<=0){e.state='recover';e.timer=lance?.85:.65;}
    }
    else if(e.state==='recover'){if(e.timer<=0){e.state='idle';e.cool=.45;}}
    else{e.dir=dx>0?1:-1;if(dist<range-10&&Math.abs(dy)<95&&e.cool<=0){e.state='windup';e.timer=lance?.86:.6;}else if(dist<540&&dist>range-30)this.moveEnemy(e,e.dir*(lance?50:64)*dt);}
  }
  updateBoss(e,dt){
    const p=this.player,dx=p.x-e.x;
    if(e.phase===1&&e.hp<=e.maxHp*.5){e.phase=2;this.bossPhase=2;e.state='transform';e.timer=1.6;this.shots=[];this.emit('toast',{text:'第二楽章 — 月は、まだ沈まない'});this.emit('sound',{name:'boss'});this.emit('shake',{amount:7});this.spark(e.x,e.y-110,65,'#ed82ac',280);return;}
    if(e.state==='transform'){if(e.timer<=0){e.state='idle';e.cool=.2;}return;}
    const phase=e.phase;
    if(e.state==='idle'){
      e.dir=dx>0?1:-1;e.x=clamp(e.x+Math.sign(dx)*32*dt,800,this.room.width-120);
      if(e.cool<=0){e.cycle++;const move=e.cycle%3;e.state=move===1?'chant':move===2?'windup':'summon';e.timer=phase===2?.95:1.2;e.swingDir=e.dir;this.emit('sound',{name:'charge'});
        if(e.state==='summon'){const xs=phase===2?[p.x-150,p.x,p.x+150]:[p.x-110,p.x+110];for(const x of xs)this.effects.push({type:'eruption',x:clamp(x,750,1880),w:phase===2?90:100,life:1.75,total:1.75});}
      }
    }
    else if(e.state==='chant'&&e.timer<=0){
      const aim=Math.atan2(p.y-60-(e.y-150),p.x-e.x);for(let i=-phase;i<=phase;i++){const a=aim+i*.24;this.shots.push({x:e.x,y:e.y-150,vx:Math.cos(a)*(phase===2?265:235),vy:Math.sin(a)*(phase===2?265:235),life:4,enemy:true});}e.state='recover';e.timer=1.05;this.emit('sound',{name:'enemyMagic'});
    }
    else if(e.state==='windup'&&e.timer<=0){e.state='strike';e.timer=.5;}
    else if(e.state==='strike'){
      e.x=clamp(e.x+e.swingDir*(phase===2?590:510)*dt,760,this.room.width-120);if(Math.abs(p.x-e.x)<145&&Math.abs(p.y-e.y)<115)this.hurt(21,e.swingDir);
      if(e.timer<=0){e.state='recover';e.timer=1.15;}
    }
    else if(e.state==='summon'&&e.timer<=0){e.state='recover';e.timer=1.15;this.emit('sound',{name:'eruption'});}
    else if(e.state==='recover'&&e.timer<=0){e.state='idle';e.cool=phase===2?.45:.7;}
  }
  animateEffects(dt){
    for(const p of this.particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=220*dt;p.life-=dt;}this.particles=this.particles.filter(p=>p.life>0);
    for(const e of this.effects){e.life-=dt;if(e.type==='number'||e.type==='dodge')e.y-=dt*38;if(e.type==='victory'&&e.life<=0){this.state='victory';this.emit('victory');}}
    this.effects=this.effects.filter(e=>e.life>0);
  }
}
