import {FLOOR,clamp} from './model.mjs?v=2.1.0';
const TAU=Math.PI*2;
export class Renderer{
 constructor(canvas,assets,atlas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.assets=assets;this.atlas=atlas;this.camera=0;this.cameraBias=.38;this.width=1280;this.shake=0;this.clock=0;this.lastRoom=-1;this.fade=0;this.options={shake:true,reducedMotion:false,quality:'auto',contrast:false};this.glows=new Map();this.autoDpr=1.75;this.resize();}
 resize(){const cap=this.options.quality==='battery'?1:this.options.quality==='high'?2:this.autoDpr;const dpr=Math.min(devicePixelRatio||1,cap);this.canvas.width=Math.round(innerWidth*dpr);this.canvas.height=Math.round(innerHeight*dpr);this.width=Math.max(800,720*innerWidth/innerHeight);this.height=720;this.scale=this.canvas.width/this.width;this.height=this.canvas.height/this.scale;this.portrait=innerHeight>innerWidth;}
 setOptions(options){this.options={...this.options,...options};this.resize();}
 glow(x,y,r,color,alpha=1){const c=this.ctx;let light=this.glows.get(color);if(!light){light=document.createElement('canvas');light.width=light.height=128;const g=light.getContext('2d'),gradient=g.createRadialGradient(64,64,0,64,64,64);gradient.addColorStop(0,color);gradient.addColorStop(.2,color+'70');gradient.addColorStop(1,color+'00');g.fillStyle=gradient;g.fillRect(0,0,128,128);this.glows.set(color,light);}c.save();c.globalAlpha=alpha;c.globalCompositeOperation='screen';c.drawImage(light,x-r,y-r,r*2,r*2);c.restore();}
 draw(model,dt,title=false){
 const c=this.ctx;this.clock+=dt;const t=this.options.reducedMotion?this.clock*.3:this.clock,r=model.room,p=model.player,V=this.width,H=this.height;
 if(r.id!==this.lastRoom){this.cameraBias=p.dir===1?.38:.62;this.camera=clamp(p.x-V*this.cameraBias,0,Math.max(0,r.width-V));this.lastRoom=r.id;this.fade=.45;}
 this.cameraBias+=((p.dir===1?.38:.62)-this.cameraBias)*(1-Math.exp(-dt*2.5));
 const target=title?clamp(430+Math.sin(t*.04)*150,0,r.width-V):clamp(p.x-V*this.cameraBias+clamp(p.vx*.1,-45,45),0,Math.max(0,r.width-V));this.camera+=(target-this.camera)*(1-Math.exp(-dt*5));
 this.shake=Math.max(0,this.shake-dt*24);c.setTransform(this.scale,0,0,this.scale,0,0);c.clearRect(0,0,V,H);c.fillStyle='#090d18';c.fillRect(0,0,V,H);c.save();
 // Portrait preserves the full gameplay height in the central section instead of stretching art.
 const vertical=this.portrait?(H-720)*.38:0;const shake=this.options.shake&&!this.options.reducedMotion?this.shake:0;c.translate((Math.random()-.5)*shake,vertical+(Math.random()-.5)*shake);
 this.background(r,t,V);
 const cam=this.camera;c.save();c.translate(-cam,0);
 this.drawArchitecture(r,t);if(model.bossActive)this.arenaBarrier(700,FLOOR,t);
 for(const pl of r.platforms)this.platform(pl.x,pl.y,pl.w,false,r.theme);
 this.platform(0,FLOOR,r.width,true,r.theme);
 for(const b of model.breakables)if(!b.broken)this.candle(b.x,FLOOR,t+b.x,false);
 for(const h of model.hazards)this.hazard(h,t);
 for(const e of model.effects)if(e.type==='eruption')this.eruption(e,t);
 if(r.shrine!==null)this.shrine(r.shrine,FLOOR,t);
 for(const d of r.portals)this.portal(d.x,d.y,t,d.label);
 if(r.right===4)this.gate(r.width-55,FLOOR,model.sealed,t);
 for(const item of model.items)if(!item.taken)this.item({...item,locked:item.type==='seal'&&!model.progress.wardens.includes(item.id)},t);
 // A restrained light pool separates moving actors from the detailed architecture.
 this.glow(p.x,p.y-60,105,'#6c8aaf',.13);
 for(const e of model.enemies)if(Math.abs(e.x-cam-V/2)<V/2+220)this.enemy(e,t);
 for(const s of model.shots){c.save();c.globalCompositeOperation='screen';c.strokeStyle=s.enemy?'#f2a2a8':'#a6e1ff';c.lineWidth=3;c.beginPath();c.moveTo(s.x-s.vx*.055,s.y-s.vy*.055);c.lineTo(s.x,s.y);c.stroke();this.glow(s.x,s.y,33,s.enemy?'#cf567d':'#68bdff',.8);c.fillStyle='#fff0db';c.beginPath();if(s.enemy){const size=s.kind==='ember'?7:9;c.moveTo(s.x,s.y-size);c.lineTo(s.x+size,s.y);c.lineTo(s.x,s.y+size);c.lineTo(s.x-size,s.y);c.closePath();}else c.arc(s.x,s.y,8,0,TAU);c.fill();c.restore();}
 this.hero(model,t);
 for(const par of model.particles){c.globalAlpha=clamp(par.life/.35,0,1);c.fillStyle=par.color;c.fillRect(par.x,par.y,par.size,par.size);}c.globalAlpha=1;
 for(const e of model.effects)this.effect(e,t);
 if(r.left!==null){c.fillStyle='#d1bd8b88';c.font='22px Georgia';c.fillText('‹',40,535);}
 if(r.right!==null&&r.right!==4){c.fillStyle='#d1bd8b88';c.font='22px Georgia';c.fillText('›',r.width-45,535);}
 c.restore();
 this.atmosphere(r,t,V,cam);
 c.restore();
 const v=c.createLinearGradient(0,0,0,H);v.addColorStop(0,'#05071390');v.addColorStop(.2,'#00000000');v.addColorStop(.78,'#00000000');v.addColorStop(1,'#050711b0');c.fillStyle=v;c.fillRect(0,0,V,H);
 if(p.hurt>0&&!this.options.reducedMotion){c.fillStyle='#9c314c';c.globalAlpha=p.hurt*.3;c.fillRect(0,0,V,H);c.globalAlpha=1;}
 this.fade=Math.max(0,this.fade-dt);if(this.fade>0&&!title){c.fillStyle='#080b14';c.globalAlpha=this.fade/.45*.8;c.fillRect(0,0,V,H);c.globalAlpha=1;}
 }
 background(r,t,V){
 const c=this.ctx,im=this.assets[r.theme],bw=r.theme==='sanctum'?Math.max(V+150,1536):Math.max(V+400,2000),bh=bw*im.height/im.width;
 const camRange=Math.max(1,r.width-V);const bx=-(this.camera/camRange)*(bw-V);const floorFrac=r.theme==='crypt'?.655:r.theme==='sanctum'?.65:.605;const by=FLOOR-bh*floorFrac;
 c.drawImage(im,bx,by,bw,bh);
 if(this.options.contrast){c.fillStyle='#090f2833';c.fillRect(0,0,V,720);}
 if(r.id===1){c.fillStyle='#3f13251c';c.fillRect(0,0,V,720);}else if(r.id===3){c.fillStyle='#15366820';c.fillRect(0,0,V,720);}else if(r.id===4){c.fillStyle='#35152730';c.fillRect(0,0,V,720);this.glow(V*.69,190,240,'#a65f8b',.15);}
 const g=c.createLinearGradient(0,410,0,720);g.addColorStop(0,'#070e1900');g.addColorStop(1,'#080b1670');c.fillStyle=g;c.fillRect(0,410,V,310);
 // Thin moonbeams move independently from the scenery.
 c.save();c.globalCompositeOperation='screen';for(let i=0;i<3;i++){const x=V*.3+i*310-this.camera*.07+Math.sin(t*.15+i)*12;c.fillStyle=`rgba(131,170,220,${.018+i*.004})`;c.beginPath();c.moveTo(x,0);c.lineTo(x+35,0);c.lineTo(x+330,590);c.lineTo(x+210,590);c.fill();}c.restore();
 }
 prop(frame,x,y,width,anchor='bottom') {const b=this.atlas.props.frames[frame],h=b.h/b.w*width;this.ctx.drawImage(this.assets.props,b.x,b.y,b.w,b.h,x-width/2,anchor==='top'?y:y-h,width,h);return h;}
 platform(x,y,w,ground,theme){const c=this.ctx;if(x+w<this.camera-100||x>this.camera+this.width+100)return;
  if(!ground){this.prop(0,x+w/2,y,w,'top');const c=this.ctx;c.strokeStyle=this.options.contrast?'#d9ecff':'#a4b9cf88';c.lineWidth=this.options.contrast?3:1;c.beginPath();c.moveTo(x+8,y+2);c.lineTo(x+w-8,y+2);c.stroke();return;}
  c.fillStyle='#0c111c';c.fillRect(x,y,w,140);
  const start=Math.max(x,Math.floor(this.camera/300)*300);for(let tx=start;tx<Math.min(x+w,this.camera+this.width+300);tx+=300)this.prop(1,tx+150,y,302,'top');
 }
 drawArchitecture(r,t){const c=this.ctx;for(const x of [640,1540,2250]){if(x-this.camera<-200||x-this.camera>this.width+200)continue;c.save();c.translate(x,0);c.rotate(Math.sin(t*.65+x)*.014);c.strokeStyle='#15161e';c.lineWidth=4;c.beginPath();c.moveTo(0,0);c.lineTo(0,42);c.stroke();this.prop(2,0,40,170,'top');this.glow(0,150,110,'#f8ac6e',.08+.015*Math.sin(t*4));c.restore();}}
 flame(x,y,t,blue){const c=this.ctx;const col=blue?'#60cbe9':'#ff9b44';this.glow(x,y-7,40,col,.16+.025*Math.sin(t*8));c.save();c.globalCompositeOperation='screen';c.fillStyle=col;c.beginPath();c.moveTo(x-3,y+2);c.quadraticCurveTo(x-6,y-5,x+Math.sin(t*9)*3,y-17-Math.sin(t*12)*2);c.quadraticCurveTo(x+8,y-3,x+3,y+2);c.fill();c.fillStyle='#fff3bf';c.beginPath();c.ellipse(x,y-3,1.6,5,0,0,TAU);c.fill();c.restore();}
 candle(x,y,t,blue){this.prop(blue?3:4,x,y,blue?62:55);this.glow(x,y-110,70,blue?'#71d6ef':'#f8bd7a',.10+.025*Math.sin(t*7));}
 shrine(x,y,t){this.glow(x,y-60,100,'#7ccfe3',.21);this.candle(x,y,t,true);const c=this.ctx;c.save();c.font='10px Georgia';c.textAlign='center';c.fillStyle='#c0d8e0';c.fillText('祈りの燭台',x,y-175);c.restore();}
 portal(x,y,t,label){const c=this.ctx;this.glow(x,y-70,95,'#7198c7',.16);c.save();c.strokeStyle='#9c8c6b99';c.lineWidth=3;c.fillStyle='#090d1bcc';c.beginPath();c.moveTo(x-37,y);c.lineTo(x-37,y-82);c.quadraticCurveTo(x-36,y-110,x,y-132);c.quadraticCurveTo(x+36,y-110,x+37,y-82);c.lineTo(x+37,y);c.closePath();c.fill();c.stroke();c.strokeStyle='#859db455';c.lineWidth=1;c.beginPath();c.moveTo(x-30,y-2);c.lineTo(x-30,y-80);c.quadraticCurveTo(x-27,y-105,x,y-122);c.quadraticCurveTo(x+27,y-105,x+30,y-80);c.lineTo(x+30,y);c.stroke();c.fillStyle='#cbb88f';c.textAlign='center';c.font='11px Georgia';c.fillText(label.replace('へ戻る','').replace('へ',''),x,y-147);c.globalAlpha=.55+Math.sin(t*2)*.2;c.fillStyle='#bad3ec';c.font='21px Georgia';c.fillText('↑',x,y-58);c.restore();}
 gate(x,y,sealed,t){const c=this.ctx;for(let i=-2;i<=2;i++){c.fillStyle=sealed?'#302d3c':'#6b66534d';c.fillRect(x+i*18,y-220,6,220);c.fillStyle='#ae9776';c.fillRect(x+i*18,y-215,1,210);}c.fillStyle='#0c1019';c.fillRect(x-60,y-228,120,12);if(sealed){this.glow(x,y-115,90,'#c76999',.23);c.save();c.translate(x,y-115);c.rotate(t*.4);c.strokeStyle='#d99ab880';c.strokeRect(-24,-24,48,48);c.rotate(Math.PI/4);c.strokeRect(-24,-24,48,48);c.restore();}c.font='12px Georgia';c.textAlign='center';c.fillStyle='#ddc89f';c.fillText(sealed?'二つの月印':'聖域へ',x-30,y-245);}
 item(item,t){const c=this.ctx,{x,y,type}=item;const yy=y+Math.sin(t*2.5+x)*5;this.glow(x,yy,50,type==='seal'?'#d0b77b':'#7fbcda',item.locked?.1:.24);
 c.save();c.translate(x,yy);if(type==='lore'){c.fillStyle='#332f2c';c.strokeStyle='#d6c5a0';c.lineWidth=1.5;c.fillRect(-14,-14,28,22);c.strokeRect(-14,-14,28,22);c.beginPath();c.moveTo(0,-14);c.lineTo(0,8);c.stroke();c.fillStyle='#e6d8ae';c.font='16px Georgia';c.textAlign='center';c.fillText('✧',0,-23);}else if(type==='chest'){this.prop(5,0,18,65);}else if(type==='seal'||type==='relic'){c.rotate(t*.65);c.strokeStyle=item.locked?'#8e6d89':'#e5ce92';c.lineWidth=2;c.strokeRect(-12,-12,24,24);c.rotate(Math.PI/4);c.strokeStyle='#a5946d';c.strokeRect(-17,-17,34,34);c.fillStyle='#e8dcaf';c.beginPath();c.arc(0,0,5,0,TAU);c.fill();}else{c.fillStyle='#dc8994';c.beginPath();c.moveTo(0,13);c.bezierCurveTo(-25,-5,-5,-17,0,-5);c.bezierCurveTo(5,-17,25,-5,0,13);c.fill();}if(item.locked){c.strokeStyle='#cc78a9';c.lineWidth=2;c.beginPath();c.arc(0,0,27,0,TAU);c.stroke();}c.restore();}
 sprite(key,frame,x,y,height,dir=1,alpha=1,flash=0,rotation=0){
 const c=this.ctx,b=this.atlas[key].frames[frame],im=this.assets[key];let scale=height/320,ax;
 if(key==='motion'){scale=height/(frame<8?300:350);ax=[235,245,235,255,230,235,235,230,220,220,220,220][frame];}
 else if(key==='hero')ax=[245,245,245,245,215,215,245,245,205,225,215,230][frame];
 else if(key==='hunters'){ax=frame<4?175:frame<8?[185,210,265,235][frame-4]:200;scale=height/310;}
 else ax=[205,205,205,205,192,192,192,192,192,192,192,192][frame];
 c.save();c.translate(x,y);c.scale(dir,1);c.rotate(rotation);c.globalAlpha=clamp(alpha,0,1);
 const draw=()=>c.drawImage(im,b.x,b.y,b.w,b.h,(b.cellX-ax)*scale,-b.h*scale,b.w*scale,b.h*scale);draw();
 if(flash>0){c.globalAlpha=clamp(flash*3,0,.65);c.globalCompositeOperation='screen';draw();}c.restore();
 }
 hero(model,t){
 const p=model.player,c=this.ctx;let key='motion',frame=8+Math.floor(p.anim*4)%4,y=p.y,rotation=0;
 if(!p.grounded){key='hero';frame=p.vy<0?6:7;}else if(Math.abs(p.vx)>15){frame=Math.floor(p.run)%8;y+=Math.sin(p.run*Math.PI/2)*1.2;}
 if(p.attack>0){key='hero';const q=1-p.attack/p.attackTotal;frame=q<.25?8:q<.68?9:10;rotation=Math.sin(q*Math.PI)*(p.combo===1?-.05:.04);}
 if(p.cast>0&&p.attack<=0){key='hero';frame=9;this.glow(p.x+p.dir*45,p.y-82,50,'#a3dcff',.35);}
 if(p.dash>0){key='hero';frame=11;}if(p.land>0)y+=p.land*18;
 c.save();c.globalAlpha=.32;c.fillStyle='#000';c.beginPath();c.ellipse(p.x,p.grounded?p.y+3:FLOOR+3,p.grounded?30:23,5,0,0,TAU);c.fill();c.restore();
 if(!this.options.reducedMotion)for(const a of p.trail)this.sprite('hero',11,a.x,a.y,150,a.dir,a.life*.9);
 const alpha=p.inv>0&&p.dash<=0?.88+Math.sin(t*22)*.09:1;
 this.glow(p.x,p.y-68,70,'#aac4e6',.08);
 if(this.options.contrast)this.glow(p.x,p.y-68,75,'#b9dbff',.17);
 this.sprite(key,frame,p.x,y,150,p.dir,alpha,p.hurt,rotation);
 if(p.attack>0)this.whip(model,t);
 }
 whip(model,t){
 const p=model.player,q=1-p.attack/p.attackTotal;if(q<.13||q>.94)return;
 const c=this.ctx,progress=clamp((q-.13)/.7,0,1),length=162+p.combo*34+(model.progress.relic?28:0),stretch=Math.sin(progress*Math.PI*.86);
 const ex=length*stretch,ey=p.combo===1?36-progress*115:p.combo===2?-110+progress*190:-30+progress*75;
 const cx1=ex*.32,cy1=p.combo===1?75:-95+progress*45,cx2=ex*.86,cy2=p.combo===2?-115:cy1-30;
 c.save();c.translate(p.x+p.dir*22,p.y-85);c.scale(p.dir,1);
 const path=()=>{c.beginPath();c.moveTo(0,0);c.bezierCurveTo(cx1,cy1,cx2,cy2,ex,ey);};
 path();c.strokeStyle='#1b1720';c.lineWidth=6;c.stroke();c.strokeStyle='#e5c38a';c.lineWidth=2.3;c.stroke();
 if(!this.options.reducedMotion){c.save();c.globalCompositeOperation='screen';c.strokeStyle=p.combo===2?'#ffc79280':'#c0d6f033';c.lineWidth=p.combo===2?8:5;path();c.stroke();c.restore();}
 c.fillStyle='#fff4cf';for(let i=1;i<=22;i++){const u=i/22,v=1-u,xx=3*v*v*u*cx1+3*v*u*u*cx2+u*u*u*ex,yy=3*v*v*u*cy1+3*v*u*u*cy2+u*u*u*ey;c.fillRect(xx-1,yy-1,2.2,2.2);}
 this.glow(ex,ey,p.combo===2?34:20,'#ffd7a1',.5);c.beginPath();c.arc(ex,ey,p.combo===2?4:2.5,0,TAU);c.fill();c.restore();
 }
 enemy(e,t){
 if(e.hp<=0&&e.dead<=0)return;const c=this.ctx;let key='enemies',frame=0,height=149,y=e.y,rotation=0;let alpha=e.hp<=0?e.dead/.8:1;
 if(e.hp<=0){y+=(.8-e.dead)*30;rotation=(.8-e.dead)*.22;}
 if(e.type==='bat'){frame=4+Math.floor(e.anim*11)%4;height=100;y+=40;}
 else if(e.type==='boss'){frame=8+(['chant','summon','transform'].includes(e.state)?1:e.state==='strike'?2:e.flash>0?3:0);height=245;y+=Math.sin(t*1.6)*3;if(e.state==='transform')this.glow(e.x,e.y-120,180,'#dd7db4',.3);}
 else if(e.type==='wraith'){key='hunters';frame=Math.floor(e.anim*5)%4;height=165;y+=45;alpha*=e.state==='windup'?.55:.9;this.glow(e.x,e.y-35,65,'#81b7ce',.12);}
 else if(e.type==='lancer'){key='hunters';frame=4+(e.state==='windup'?1:e.state==='strike'?2:e.state==='recover'||e.state==='stun'?3:0);height=e.warden?190:170;}
 else if(e.type==='acolyte'){key='hunters';frame=8+(e.state==='windup'?1:e.state==='cast'?2:e.state==='recover'||e.state==='stun'?3:0);height=160;}
 else frame=e.state==='strike'?3:e.state==='windup'?0:Math.floor(e.anim*5)%3;
 c.save();c.globalAlpha=alpha*.27;c.fillStyle='#000';c.beginPath();c.ellipse(e.x,e.type==='bat'||e.type==='wraith'?FLOOR:e.y,32,5,0,0,TAU);c.fill();c.restore();
 const flip=e.dir===1?-1:1;this.sprite(key,frame,e.x,y,height,flip,alpha,e.flash,rotation);
 if(e.hp>0&&['windup','chant','summon'].includes(e.state)){
   const yy=e.y-(e.type==='boss'?225:e.type==='bat'?65:e.type==='wraith'?145:160);this.glow(e.x,yy,25,'#ef8693',.35);c.save();c.fillStyle='#121421ee';c.fillRect(e.x-12,yy-19,24,29);c.strokeStyle='#e5a0ae';c.lineWidth=1.5;c.strokeRect(e.x-12,yy-19,24,29);c.fillStyle='#ffe1cf';c.font='bold 25px Georgia';c.textAlign='center';c.fillText('!',e.x,yy+4);const duration=e.type==='boss'?(e.phase===2?.95:1.2):e.type==='acolyte'?1.15:e.type==='wraith'?.9:e.type==='lancer'?.86:.6;c.fillStyle='#f1a0b0';c.fillRect(e.x-12,yy+13,24*clamp(1-e.timer/duration,0,1),3);c.restore();
   if(e.type==='boss'&&e.state==='windup'){c.fillStyle='#d2627445';c.fillRect(e.x+(e.swingDir<0?-380:0),FLOOR-6,380,6);}
   if(e.type==='lancer'){c.strokeStyle='#da879488';c.lineWidth=2;c.beginPath();c.moveTo(e.x,e.y-10);c.lineTo(e.x+e.dir*190,e.y-10);c.stroke();}
   if(e.type==='acolyte'){c.save();c.setLineDash([3,10]);c.strokeStyle='#efb16a77';c.lineWidth=1.5;c.beginPath();c.moveTo(e.x,e.y-97);c.lineTo(e.x+Math.cos(e.aim)*500,e.y-97+Math.sin(e.aim)*500);c.stroke();c.restore();this.glow(e.x+e.dir*40,e.y-100,35,'#efaf6f',.45);}
 }
 if(e.state==='transform'){c.save();c.font='16px Georgia';c.textAlign='center';c.fillStyle='#e5bad8';c.fillText('祈りの結界',e.x,e.y-255);c.restore();}
 if(e.type!=='boss'&&e.hp>0&&(e.hp<e.maxHp||e.warden||this.options.contrast)){
   const yy=e.y-(e.type==='bat'?54:e.type==='wraith'?150:e.warden?205:165),w=e.warden?85:48;c.fillStyle='#10131e';c.fillRect(e.x-w/2,yy,w,5);c.fillStyle=e.warden?'#d6b67b':'#b86570';c.fillRect(e.x-w/2+1,yy+1,(w-2)*e.hp/e.maxHp,3);
   if(e.warden){c.font='11px Georgia';c.textAlign='center';c.fillStyle='#ddc79f';c.fillText(e.warden==='tide'?'潮の守り人':'鐘の守り人',e.x,yy-8);}
 }
 }
 arenaBarrier(x,y,t){
 const c=this.ctx;c.save();const g=c.createLinearGradient(x-34,0,x+34,0);g.addColorStop(0,'#9ba9e700');g.addColorStop(.5,'#a2acd640');g.addColorStop(1,'#9ba9e700');c.fillStyle=g;c.fillRect(x-34,y-280,68,280);
 for(let i=0;i<4;i++){c.strokeStyle=i%2?'#b9c3e675':'#5f739677';c.lineWidth=i%2?1:2;c.beginPath();c.moveTo(x-10+i*6,y);c.bezierCurveTo(x+Math.sin(t+i)*13,y-80,x+Math.cos(t*.7+i)*18,y-190,x-12+i*7,y-270);c.stroke();}
 c.font='15px Georgia';c.fillStyle='#c9c5e3';c.textAlign='center';c.fillText('聖域の封鎖',x,y-292);this.glow(x,y-110,85,'#a8acdd',.14);c.restore();
 }
 hazard(h,t){
 const c=this.ctx;c.save();c.strokeStyle=h.active?'#f2b2c2':h.warn>0?'#e9a3b5':'#796579aa';c.lineWidth=2;c.beginPath();c.moveTo(h.x,FLOOR-2);c.lineTo(h.x+h.w,FLOOR-2);c.stroke();
 for(let x=h.x+12;x<h.x+h.w;x+=24){c.beginPath();c.moveTo(x-4,FLOOR-4);c.lineTo(x,FLOOR-10);c.lineTo(x+4,FLOOR-4);c.stroke();}
 if(h.warn>0){this.glow(h.x+h.w/2,FLOOR-5,h.w*.7,'#c66891',h.warn*.3);c.fillStyle='#e9a3b5';c.font='16px Georgia';c.textAlign='center';c.fillText('!',h.x+h.w/2,FLOOR-28);}
 if(h.active){for(let x=h.x+7;x<h.x+h.w;x+=16){const height=65+Math.sin(t*19+x)*25;c.fillStyle='#c77aad66';c.beginPath();c.moveTo(x-9,FLOOR);c.quadraticCurveTo(x-12,FLOOR-35,x+Math.sin(t*8)*6,FLOOR-height);c.quadraticCurveTo(x+9,FLOOR-30,x+10,FLOOR);c.fill();}this.glow(h.x+h.w/2,FLOOR-25,h.w,'#e194be',.25);}c.restore();
 }
 eruption(e,t){
 const c=this.ctx,active=e.life<=.55;c.save();c.strokeStyle=active?'#ffc8bd':'#da8298';c.lineWidth=2;c.beginPath();c.ellipse(e.x,FLOOR-2,e.w/2,7,0,0,TAU);c.stroke();
 if(active){const g=c.createLinearGradient(0,FLOOR,0,FLOOR-180);g.addColorStop(0,'#e9a3b5aa');g.addColorStop(1,'#a8579a00');c.fillStyle=g;c.fillRect(e.x-e.w/2,FLOOR-180,e.w,180);this.glow(e.x,FLOOR-65,115,'#de82a1',.3);}
 else{c.globalAlpha=.5;c.fillStyle='#bb628546';c.fillRect(e.x-e.w/2,FLOOR-8,e.w,8);c.fillStyle='#f8bac2';c.font='19px Georgia';c.textAlign='center';c.fillText('!',e.x,FLOOR-38);}c.restore();
 }
 effect(e,t){
 const c=this.ctx;c.save();
 if(e.type==='number'||e.type==='dodge'){c.globalAlpha=clamp(e.life*3,0,1);c.font=e.type==='dodge'?'15px Georgia':e.finisher?'bold 24px Georgia':'bold 18px Georgia';c.textAlign='center';c.shadowColor='#000';c.shadowBlur=5;c.fillStyle=e.type==='dodge'?'#b9e9ff':e.guarded?'#a0afc1':e.finisher?'#ffe5a8':'#f4e4ba';c.fillText(e.type==='dodge'?'月影回避  +15 MP':e.value,e.x,e.y);}
 else if(e.type==='impact'){const life=e.life/.2;c.translate(e.x,e.y);c.globalAlpha=life;c.strokeStyle=e.magic?'#aee9ff':'#ffe4be';c.lineWidth=e.finisher?3:2;for(let i=0;i<5;i++){const a=i*TAU/5+t*3;c.beginPath();c.moveTo(Math.cos(a)*8,Math.sin(a)*8);c.lineTo(Math.cos(a)*(12+(1-life)*40),Math.sin(a)*(12+(1-life)*40));c.stroke();}}
 else if(e.type==='jumpRing'){c.globalAlpha=e.life/.35;c.strokeStyle='#adccf5';c.lineWidth=1.5;c.beginPath();c.ellipse(e.x,e.y,35+(1-e.life/.35)*16,7,0,0,TAU);c.stroke();}
 else if(e.type==='victory')this.glow(1420,420,300,'#b9d3fc',this.options.reducedMotion?.12:Math.max(0,e.life/7));
 c.restore();
 }
 atmosphere(r,t,V,cam){const c=this.ctx;
 c.save();for(let i=0;i<(this.options.quality==='battery'?18:40);i++){const x=((i*127.7+t*(i%2?5:-8)-cam*.35)%(V+100)+V+100)%(V+100)-50;const y=(i*83.13+Math.sin(t*.7+i)*14)%590;const a=.10+.16*(.5+.5*Math.sin(t+i));c.globalAlpha=a;c.fillStyle=i%5===0?'#ffd3a2':'#b7c6e4';c.fillRect(x,y,i%4===0?2:1,i%4===0?2:1);}c.globalAlpha=1;
 const fog=c.createLinearGradient(0,515,0,665);fog.addColorStop(0,'#7795c000');fog.addColorStop(.6,r.theme==='crypt'?'#7fb8cd12':'#a0bce313');fog.addColorStop(1,'#7795c000');c.fillStyle=fog;c.fillRect(0,515,V,150);
 // Sparse out-of-focus ironwork stays beneath the actor's playable space.
 c.fillStyle='#050811d9';for(let i=0;i<5;i++){const x=((i*520-cam*1.15)%(V+550)+V+550)%(V+550)-250;c.fillRect(x,655,9,65);c.beginPath();c.moveTo(x-8,662);c.lineTo(x+4,640);c.lineTo(x+17,662);c.fill();}c.strokeStyle='#070a11c9';c.lineWidth=6;c.beginPath();c.moveTo(0,680);c.lineTo(V,680);c.stroke();c.restore();}
}
