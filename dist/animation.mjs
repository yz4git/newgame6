import {HERO_FRAMES} from './pose-data.mjs?v=2.2.0';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=v=>{const x=clamp(v,0,1);return x*x*(3-2*x);};
const mix=(a,b,t)=>a+(b-a)*t;
export const ATTACK_DURATIONS=[.36,.38,.52];
const ATTACK_KEYS=[0,.08,.18,.28,.38,.58,.74,.90];
export function attackProgress(p){return p.attack>0?clamp(1-p.attack/p.attackTotal,0,1):1;}
export function heroPose(p){
 let key='attack',frame=0,state='idle',sy=1;
 if(!p.grounded){key='hero';frame=p.vy<0?6:7;state='jump';}
 else if(Math.abs(p.vx)>15){key='motion';frame=Math.floor(p.run)%8;state='run';sy=1-.012*(.5+.5*Math.cos(p.run*Math.PI/2));}
 else sy=1+Math.sin(p.anim*2.8)*.004;
 if(p.attack>0){key='attack';const q=attackProgress(p);frame=ATTACK_KEYS.findLastIndex(v=>q>=v);state='attack';sy=1;}
 if(p.cast>0&&p.attack<=0){key='attack';frame=4;state='cast';sy=1;}
 if(p.dash>0){key='hero';frame=11;state='dash';sy=1;}
 const source=HERO_FRAMES[key][frame];
 // Feet remain on the floor during the landing compression.
 if(p.grounded&&p.land>0&&state!=='dash')sy*=1-.035*clamp(p.land/.12,0,1);
 return {key,frame,state,source,scaleX:source.scale,scaleY:source.scale*sy,x:p.x,y:p.y,dir:p.dir};
}
export function posePoint(pose,point){return {x:pose.x+(point[0]-pose.source.origin[0])*pose.scaleX*pose.dir,y:pose.y+(point[1]-pose.source.origin[1])*pose.scaleY};}
export function castingHand(p){const source=HERO_FRAMES.attack[4];return posePoint({x:p.x,y:p.y,dir:p.dir,source,scaleX:source.scale,scaleY:source.scale},source.grip);}
function cubic(a,b,c,d,t){const u=1-t;return {x:u*u*u*a.x+3*u*u*t*b.x+3*u*t*t*c.x+t*t*t*d.x,y:u*u*u*a.y+3*u*u*t*b.y+3*u*t*t*c.y+t*t*t*d.y};}
export function whipForPlayer(p,relic=false){
 if(p.attack<=0)return null;
 const pose=heroPose(p),hand=posePoint(pose,pose.source.grip),q=attackProgress(p),length=142+(p.combo||0)*32+(relic?28:0),dir=p.dir;
 let controls;
 if(q<.4){
  // Slack behind the shoulder accelerates overhead into the forward crack.
  const turn=smooth((q-.17)/.23),angle=mix(3.05,Math.PI*2+.035,turn);
  const curl=.62*(1-turn);
  controls=[[0,0],[Math.cos(angle-curl)*length*.32,Math.sin(angle-curl)*length*.32],[Math.cos(angle-curl*.45)*length*.76,Math.sin(angle-curl*.45)*length*.76],[Math.cos(angle)*length,Math.sin(angle)*length]];
 }else{
  const angle=[.035,-.055,.14][p.combo||0],fold=smooth((q-.65)/.35);
  const straight=[[0,0],[length*.32,0],[length*.73,length*.025],[length*Math.cos(angle),length*Math.sin(angle)]];
  const coiled=[[0,0],[length*.42,-length*.18],[-length*.05,-length*.65],[-length*.32,-length*.28]];
  controls=straight.map((a,i)=>[mix(a[0],coiled[i][0],fold),mix(a[1],coiled[i][1],fold)]);
 }
 const raw=[];for(let i=0;i<=64;i++)raw.push(cubic(...controls.map(([x,y])=>({x,y})),i/64));
 let arc=0;const distance=[0];for(let i=1;i<raw.length;i++){arc+=Math.hypot(raw[i].x-raw[i-1].x,raw[i].y-raw[i-1].y);distance.push(arc);}
 // Equal-length links, rather than a curve that grows and shrinks each frame.
 const points=[];let j=1;for(let i=0;i<=26;i++){const at=arc*i/26;while(j<distance.length-1&&distance[j]<at)j++;const u=(at-distance[j-1])/(distance[j]-distance[j-1]||1),scale=length/(arc||1);points.push({x:hand.x+mix(raw[j-1].x,raw[j].x,u)*scale*dir,y:hand.y+mix(raw[j-1].y,raw[j].y,u)*scale});}
 let material=0;for(let i=1;i<points.length;i++)material+=Math.hypot(points[i].x-points[i-1].x,points[i].y-points[i-1].y);const correction=length/(material||1);for(const point of points){point.x=hand.x+(point.x-hand.x)*correction;point.y=hand.y+(point.y-hand.y)*correction;}points[0]=hand;
 return {pose,hand,points,tip:points.at(-1),length,active:q>=.40&&q<=.64,alpha:Math.min(1,q/.075,(1-q)/.12),shoulder:{x:p.x+p.dir*9,y:p.y-108}};
}
export function segmentHitsBox(a,b,box,padding=0){
 const minX=box.x-padding,maxX=box.x+box.w+padding,minY=box.y-padding,maxY=box.y+box.h+padding,dx=b.x-a.x,dy=b.y-a.y;let lo=0,hi=1;
 for(const [p,q]of [[-dx,a.x-minX],[dx,maxX-a.x],[-dy,a.y-minY],[dy,maxY-a.y]]){if(Math.abs(p)<1e-9){if(q<0)return false;}else{const t=q/p;if(p<0)lo=Math.max(lo,t);else hi=Math.min(hi,t);if(lo>hi)return false;}}
 return true;
}
export function whipHitsBox(whip,box){if(!whip?.active)return false;const points=[whip.shoulder,...whip.points];for(let i=1;i<points.length;i++)if(segmentHitsBox(points[i-1],points[i],box,7))return true;return false;}
export function enemyHurtBox(e){const flying=e.type==='bat',ghost=e.type==='wraith',boss=e.type==='boss';return {x:e.x-(boss?50:flying?27:23),y:e.y-(boss?240:flying?48:ghost?125:145),w:boss?100:flying?54:46,h:boss?240:flying?55:ghost?165:145};}
