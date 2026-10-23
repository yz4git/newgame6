import {FLOOR,clamp} from './model.mjs';
const TAU=Math.PI*2;
export class Renderer{
 constructor(canvas,assets,atlas){this.canvas=canvas;this.ctx=canvas.getContext('2d',{alpha:false});this.assets=assets;this.atlas=atlas;this.camera=0;this.width=1280;this.shake=0;this.clock=0;this.lastRoom=-1;this.resize();}
 resize(){const dpr=Math.min(devicePixelRatio||1,1.75);this.canvas.width=Math.round(innerWidth*dpr);this.canvas.height=Math.round(innerHeight*dpr);this.width=Math.max(800,720*innerWidth/innerHeight);this.height=720;this.scale=this.canvas.width/this.width;this.height=this.canvas.height/this.scale;this.portrait=innerHeight>innerWidth;}
 glow(x,y,r,color,alpha=1){const c=this.ctx;c.save();c.globalAlpha=alpha;c.globalCompositeOperation='screen';const g=c.createRadialGradient(x,y,0,x,y,r);g.addColorStop(0,color);g.addColorStop(.2,color+'70');g.addColorStop(1,color+'00');c.fillStyle=g;c.fillRect(x-r,y-r,r*2,r*2);c.restore();}
 draw(model,dt,title=false){
 const c=this.ctx;this.clock+=dt;const t=this.clock,r=model.room,p=model.player,V=this.width,H=this.height;
 if(r.id!==this.lastRoom){this.camera=clamp(p.x-V*.34,0,Math.max(0,r.width-V));this.lastRoom=r.id;}
 const target=title?clamp(430+Math.sin(t*.04)*150,0,r.width-V):clamp(p.x-V*.36+p.vx*.13,0,Math.max(0,r.width-V));this.camera+=(target-this.camera)*(1-Math.exp(-dt*5));
 this.shake=Math.max(0,this.shake-dt*24);c.setTransform(this.scale,0,0,this.scale,0,0);c.clearRect(0,0,V,H);c.fillStyle='#090d18';c.fillRect(0,0,V,H);c.save();
 // Portrait preserves the full gameplay height in the central section instead of stretching art.
 const vertical=this.portrait?(H-720)*.38:0;c.translate((Math.random()-.5)*this.shake,vertical+(Math.random()-.5)*this.shake);
 this.background(r,t,V);
 const cam=this.camera;c.save();c.translate(-cam,0);
 this.drawArchitecture(r,t);
 for(const pl of r.platforms)this.platform(pl.x,pl.y,pl.w,false,r.theme);
 this.platform(0,FLOOR,r.width,true,r.theme);
 for(const x of [410,900,1410,1940,2330])if(x<r.width-80)this.candle(x,FLOOR, t+x,false);
 if(r.shrine!==null)this.shrine(r.shrine,FLOOR,t);
 for(const d of r.portals)this.portal(d.x,d.y,t,d.label);
 if(r.right===4)this.gate(r.width-55,FLOOR,model.sealed,t);
 for(const item of model.items)if(!item.taken)this.item(item,t);
 // A restrained light pool separates moving actors from the detailed architecture.
 this.glow(p.x,p.y-60,105,'#6c8aaf',.13);
 for(const e of model.enemies)this.enemy(e,t);
 for(const s of model.shots){c.save();c.globalCompositeOperation='screen';c.strokeStyle=s.enemy?'#f2a2a8':'#a6e1ff';c.lineWidth=3;c.beginPath();c.moveTo(s.x-s.vx*.055,s.y-s.vy*.055);c.lineTo(s.x,s.y);c.stroke();this.glow(s.x,s.y,33,s.enemy?'#cf567d':'#68bdff',.8);c.fillStyle='#fff0db';c.beginPath();c.arc(s.x,s.y,s.enemy?5:6,0,TAU);c.fill();c.restore();}
 this.hero(model,t);
 for(const par of model.particles){c.globalAlpha=clamp(par.life/.35,0,1);c.fillStyle=par.color;c.fillRect(par.x,par.y,par.size,par.size);}c.globalAlpha=1;
 for(const e of model.effects){if(e.type==='number'){c.save();c.globalAlpha=clamp(e.life*3,0,1);c.font='bold 19px Georgia';c.textAlign='center';c.shadowColor='#000';c.shadowBlur=5;c.fillStyle='#f4e4ba';c.fillText(e.value,e.x,e.y);c.restore();}else if(e.type==='victory'){this.glow(1420,420,300,'#b9d3fc',Math.max(0,e.life/5));}}
 if(r.left!==null){c.fillStyle='#d1bd8b88';c.font='22px Georgia';c.fillText('‹',40,535);}
 if(r.right!==null&&r.right!==4){c.fillStyle='#d1bd8b88';c.font='22px Georgia';c.fillText('›',r.width-45,535);}
 c.restore();
 this.atmosphere(r,t,V,cam);
 c.restore();
 const v=c.createLinearGradient(0,0,0,H);v.addColorStop(0,'#05071390');v.addColorStop(.2,'#00000000');v.addColorStop(.78,'#00000000');v.addColorStop(1,'#050711b0');c.fillStyle=v;c.fillRect(0,0,V,H);
 if(p.hurt>0){c.fillStyle='#9c314c';c.globalAlpha=p.hurt*.3;c.fillRect(0,0,V,H);c.globalAlpha=1;}
 }
 background(r,t,V){
 const c=this.ctx,im=this.assets[r.theme],bw=Math.max(V+400,2000),bh=bw*im.height/im.width;
 const camRange=Math.max(1,r.width-V);const bx=-(this.camera/camRange)*(bw-V);const floorFrac=r.theme==='crypt'?.655:.605;const by=FLOOR-bh*floorFrac;
 c.drawImage(im,bx,by,bw,bh);
 if(r.id===1){c.fillStyle='#3f13251c';c.fillRect(0,0,V,720);}else if(r.id===3){c.fillStyle='#15366820';c.fillRect(0,0,V,720);}else if(r.id===4){c.fillStyle='#35152730';c.fillRect(0,0,V,720);this.glow(V*.69,190,240,'#a65f8b',.15);}
 const g=c.createLinearGradient(0,410,0,720);g.addColorStop(0,'#070e1900');g.addColorStop(1,'#080b1670');c.fillStyle=g;c.fillRect(0,410,V,310);
 // Thin moonbeams move independently from the scenery.
 c.save();c.globalCompositeOperation='screen';for(let i=0;i<3;i++){const x=V*.3+i*310-this.camera*.07+Math.sin(t*.15+i)*12;c.fillStyle=`rgba(131,170,220,${.018+i*.004})`;c.beginPath();c.moveTo(x,0);c.lineTo(x+35,0);c.lineTo(x+330,590);c.lineTo(x+210,590);c.fill();}c.restore();
 }
 prop(frame,x,y,width,anchor='bottom') {const b=this.atlas.props.frames[frame],h=b.h/b.w*width;this.ctx.drawImage(this.assets.props,b.x,b.y,b.w,b.h,x-width/2,anchor==='top'?y:y-h,width,h);return h;}
 platform(x,y,w,ground,theme){const c=this.ctx;if(x+w<this.camera-100||x>this.camera+this.width+100)return;
  if(!ground){this.prop(0,x+w/2,y,w,'top');return;}
  c.fillStyle='#0c111c';c.fillRect(x,y,w,140);
  const start=Math.max(x,Math.floor(this.camera/300)*300);for(let tx=start;tx<Math.min(x+w,this.camera+this.width+300);tx+=300)this.prop(1,tx+150,y,302,'top');
 }
 drawArchitecture(r,t){const c=this.ctx;for(const x of [640,1540,2250]){if(x-this.camera<-200||x-this.camera>this.width+200)continue;c.save();c.translate(x,0);c.rotate(Math.sin(t*.65+x)*.014);c.strokeStyle='#15161e';c.lineWidth=4;c.beginPath();c.moveTo(0,0);c.lineTo(0,42);c.stroke();this.prop(2,0,40,170,'top');this.glow(0,150,110,'#f8ac6e',.08+.015*Math.sin(t*4));c.restore();}}
 flame(x,y,t,blue){const c=this.ctx;const col=blue?'#60cbe9':'#ff9b44';this.glow(x,y-7,40,col,.16+.025*Math.sin(t*8));c.save();c.globalCompositeOperation='screen';c.fillStyle=col;c.beginPath();c.moveTo(x-3,y+2);c.quadraticCurveTo(x-6,y-5,x+Math.sin(t*9)*3,y-17-Math.sin(t*12)*2);c.quadraticCurveTo(x+8,y-3,x+3,y+2);c.fill();c.fillStyle='#fff3bf';c.beginPath();c.ellipse(x,y-3,1.6,5,0,0,TAU);c.fill();c.restore();}
 candle(x,y,t,blue){this.prop(blue?3:4,x,y,blue?62:55);this.glow(x,y-110,70,blue?'#71d6ef':'#f8bd7a',.10+.025*Math.sin(t*7));}
 shrine(x,y,t){this.glow(x,y-60,100,'#7ccfe3',.21);this.candle(x,y,t,true);const c=this.ctx;c.save();c.font='10px Georgia';c.textAlign='center';c.fillStyle='#c0d8e0';c.fillText('祈りの燭台',x,y-175);c.restore();}
 portal(x,y,t,label){const c=this.ctx;this.glow(x,y-70,95,'#7198c7',.16);c.save();c.strokeStyle='#9c8c6b99';c.lineWidth=3;c.fillStyle='#090d1bcc';c.beginPath();c.moveTo(x-37,y);c.lineTo(x-37,y-82);c.quadraticCurveTo(x-36,y-110,x,y-132);c.quadraticCurveTo(x+36,y-110,x+37,y-82);c.lineTo(x+37,y);c.closePath();c.fill();c.stroke();c.strokeStyle='#859db455';c.lineWidth=1;c.beginPath();c.moveTo(x-30,y-2);c.lineTo(x-30,y-80);c.quadraticCurveTo(x-27,y-105,x,y-122);c.quadraticCurveTo(x+27,y-105,x+30,y-80);c.lineTo(x+30,y);c.stroke();c.fillStyle='#cbb88f';c.textAlign='center';c.font='11px Georgia';c.fillText(label.replace('へ戻る','').replace('へ',''),x,y-147);c.globalAlpha=.55+Math.sin(t*2)*.2;c.fillStyle='#bad3ec';c.font='21px Georgia';c.fillText('↑',x,y-58);c.restore();}
 gate(x,y,sealed,t){const c=this.ctx;for(let i=-2;i<=2;i++){c.fillStyle=sealed?'#302d3c':'#6b66534d';c.fillRect(x+i*18,y-220,6,220);c.fillStyle='#ae9776';c.fillRect(x+i*18,y-215,1,210);}c.fillStyle='#0c1019';c.fillRect(x-60,y-228,120,12);if(sealed){this.glow(x,y-115,90,'#c76999',.23);c.save();c.translate(x,y-115);c.rotate(t*.4);c.strokeStyle='#d99ab880';c.strokeRect(-24,-24,48,48);c.rotate(Math.PI/4);c.strokeRect(-24,-24,48,48);c.restore();}c.font='12px Georgia';c.textAlign='center';c.fillStyle='#ddc89f';c.fillText(sealed?'二つの月印':'聖域へ',x-30,y-245);}
 item(item,t){const c=this.ctx,{x,y,type}=item;const yy=y+Math.sin(t*2.5+x)*5;this.glow(x,yy,50,type==='seal'?'#d0b77b':'#7fbcda',.24);
 c.save();c.translate(x,yy);if(type==='chest'){this.prop(5,0,18,65);}else if(type==='seal'||type==='relic'){c.rotate(t*.65);c.strokeStyle='#e5ce92';c.lineWidth=2;c.strokeRect(-12,-12,24,24);c.rotate(Math.PI/4);c.strokeStyle='#a5946d';c.strokeRect(-17,-17,34,34);c.fillStyle='#e8dcaf';c.beginPath();c.arc(0,0,5,0,TAU);c.fill();}else{c.fillStyle='#dc8994';c.beginPath();c.moveTo(0,13);c.bezierCurveTo(-25,-5,-5,-17,0,-5);c.bezierCurveTo(5,-17,25,-5,0,13);c.fill();}c.restore();}
 sprite(key,frame,x,y,height,dir=1,alpha=1,flash=0){const c=this.ctx,b=this.atlas[key].frames[frame],im=this.assets[key];const scale=height/320;c.save();c.translate(x,y);c.scale(dir,1);c.globalAlpha=alpha;
 const anchors=key==='hero'?[245,245,245,245,215,215,245,245,205,225,215,230]:[205,205,205,205,192,192,192,192,192,192,192,192];
 const ax=anchors[frame];c.drawImage(im,b.x,b.y,b.w,b.h,(b.cellX-ax)*scale,-b.h*scale,b.w*scale,b.h*scale);
 if(flash>0){c.globalAlpha=flash*.9;c.globalCompositeOperation='screen';c.drawImage(im,b.x,b.y,b.w,b.h,(b.cellX-ax)*scale,-b.h*scale,b.w*scale,b.h*scale);}c.restore();}
 hero(model,t){const p=model.player,c=this.ctx;let frame=4+(Math.floor(t*2)%2);if(!p.grounded)frame=p.vy<0?6:7;else if(Math.abs(p.vx)>10)frame=Math.floor(p.anim*12)%4;if(p.attack>0){const progress=1-p.attack/p.attackTotal;frame=progress<.25?8:progress<.66?9:10;}if(p.dash>0)frame=11;
 c.save();c.globalAlpha=.3;c.fillStyle='#000';c.beginPath();c.ellipse(p.x,p.y+3,29,5,0,0,TAU);c.fill();c.restore();
 if(p.dash>0){for(let i=3;i>=1;i--)this.sprite('hero',11,p.x-p.dir*i*27,p.y,150,p.dir,.12*(4-i));}
 const alpha=p.inv>0&&p.dash<=0?.65+Math.sin(t*35)*.22:1;this.sprite('hero',frame,p.x,p.y,150,p.dir,alpha,p.hurt);
 if(p.attack>0){const q=1-p.attack/p.attackTotal;if(q>.13&&q<.88){const len=(155+p.combo*35+(model.progress.relic?28:0))*Math.sin(Math.min(1,q*1.6)*Math.PI*.78);const sx=p.x+p.dir*24,sy=p.y-87;c.save();c.translate(sx,sy);c.scale(p.dir,1);const endY=-40+q*98;const ctrl=-75+q*60;c.strokeStyle='#21181a';c.lineWidth=7;c.beginPath();c.moveTo(0,0);c.bezierCurveTo(len*.35,ctrl,len*.85,ctrl-35,len,endY);c.stroke();c.strokeStyle=p.combo===2?'#f6dca1':'#c7a87c';c.lineWidth=2.5;c.setLineDash([6,3]);c.stroke();c.setLineDash([]);c.globalCompositeOperation='screen';c.strokeStyle=p.combo===2?'#ffe5ad88':'#d3d5e366';c.lineWidth=6;c.stroke();this.glow(len,endY,25,'#ffd7a1',.45);c.fillStyle='#fff2d7';c.beginPath();c.arc(len,endY,3,0,TAU);c.fill();c.restore();}}
 }
 enemy(e,t){if(e.hp<=0&&e.dead<=0)return;const c=this.ctx;let frame=0,height=149;const alpha=e.hp<=0?e.dead/.7:1;let y=e.y;
 if(e.type==='bat'){frame=4+Math.floor(e.anim*10)%4;height=105;y+=40;}else if(e.type==='boss'){frame=8+(e.state==='chant'?1:e.state==='strike'?2:e.flash>0?3:0);height=255;y+=Math.sin(t*1.6)*3;}else frame=e.state==='strike'?3:e.state==='windup'?0:Math.floor(e.anim*5)%3;
 const flip=e.dir===1?-1:1;this.sprite('enemies',frame,e.x,y,height,flip,alpha,e.flash);
 if(e.hp>0&&(e.state==='windup'||e.state==='chant')){const yy=e.y-(e.type==='boss'?240:e.type==='bat'?60:160);this.glow(e.x,yy,24,'#ef8693',.4);c.fillStyle='#f6b7ae';c.font='bold 23px Georgia';c.textAlign='center';c.fillText('!',e.x,yy+6);if(e.type==='boss'&&e.state==='windup'){c.fillStyle='#d2627430';c.fillRect(e.x+(e.swingDir<0?-380:0),FLOOR-7,380,7);}}
 if(e.type!=='boss'&&e.hp>0&&e.hp<e.maxHp){c.fillStyle='#10131e';c.fillRect(e.x-24,e.y-(e.type==='bat'?54:160),48,4);c.fillStyle='#b86570';c.fillRect(e.x-23,e.y-(e.type==='bat'?53:159),46*e.hp/e.maxHp,2);}
 }
 atmosphere(r,t,V,cam){const c=this.ctx;
 c.save();for(let i=0;i<47;i++){const x=((i*127.7+t*(i%2?5:-8)-cam*.35)%(V+100)+V+100)%(V+100)-50;const y=(i*83.13+Math.sin(t*.7+i)*14)%590;const a=.10+.16*(.5+.5*Math.sin(t+i));c.globalAlpha=a;c.fillStyle=i%5===0?'#ffd3a2':'#b7c6e4';c.fillRect(x,y,i%4===0?2:1,i%4===0?2:1);}c.globalAlpha=1;
 const fog=c.createLinearGradient(0,515,0,665);fog.addColorStop(0,'#7795c000');fog.addColorStop(.6,r.theme==='crypt'?'#7fb8cd12':'#a0bce313');fog.addColorStop(1,'#7795c000');c.fillStyle=fog;c.fillRect(0,515,V,150);
 // Sparse out-of-focus ironwork stays beneath the actor's playable space.
 c.fillStyle='#050811d9';for(let i=0;i<5;i++){const x=((i*520-cam*1.15)%(V+550)+V+550)%(V+550)-250;c.fillRect(x,655,9,65);c.beginPath();c.moveTo(x-8,662);c.lineTo(x+4,640);c.lineTo(x+17,662);c.fill();}c.strokeStyle='#070a11c9';c.lineWidth=6;c.beginPath();c.moveTo(0,680);c.lineTo(V,680);c.stroke();c.restore();}
}
