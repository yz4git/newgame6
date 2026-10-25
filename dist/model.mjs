import {LEVELS,WORLD,rockAt} from './levels.mjs?v=1.0.0';
export {LEVELS,WORLD,rockAt};
export const PHYSICS={drag:1.65,maxSpeed:1000,boatRadius:13};
export const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function launchVector(dx,dy){const length=Math.hypot(dx,dy);if(length<12)return null;const speed=clamp(length*5.4,105,PHYSICS.maxSpeed);return {x:dx/length*speed,y:dy/length*speed};}
export function touchesRock(x,y,r,time,padding=PHYSICS.boatRadius){const p=rockAt(r,time),cos=Math.cos(r.rotation),sin=Math.sin(r.rotation),dx=x-p.x,dy=y-p.y;return ((dx*cos+dy*sin)/(r.rx*.84+padding))**2+((-dx*sin+dy*cos)/(r.ry*.84+padding))**2<1;}
export function waterForce(level,x,y,time){let fx=0,fy=0;for(const a of level.currents){const q=((x-a.x)/a.rx)**2+((y-a.y)/a.ry)**2;if(q<1){const strength=Math.sin((1-q)*Math.PI/2);fx+=a.vx*strength;fy+=a.vy*strength;}}
 for(const a of level.vortices){const dx=x-a.x,dy=y-a.y,d=Math.hypot(dx,dy);if(d<a.r&&d>1){const strength=a.strength*(1-d/a.r);fx+=(-dx*.3-dy*a.spin)/d*strength;fy+=(-dy*.3+dx*a.spin)/d*strength;}}return {x:fx,y:fy};}
export function isDanger(level,x,y,time,padding=PHYSICS.boatRadius){return level.rocks.some(r=>touchesRock(x,y,r,time,padding))||level.vortices.some(v=>Math.hypot(x-v.x,y-v.y)<v.core+padding*.45);}
export function predictRoute(model,vector){let {x,y,vx,vy}=model.boat;vx=vector.x;vy=vector.y;const points=[{x,y}];let hit=false;for(let i=1;i<=180;i++){const dt=1/60,force=waterForce(model.level,x,y,model.time+i*dt);vx=(vx+force.x*dt)*Math.exp(-PHYSICS.drag*dt);vy=(vy+force.y*dt)*Math.exp(-PHYSICS.drag*dt);x+=vx*dt;y+=vy*dt;
 if(x<30||x>WORLD.w-30||y<30||y>WORLD.h-30||isDanger(model.level,x,y,model.time+i*dt)){hit=true;points.push({x,y,danger:true});break;}if(i%7===0)points.push({x,y});if(Math.hypot(vx,vy)<20)break;}return {points,hit};}
export class Voyage{
 constructor(index=0){this.events=[];this.load(index);}
 load(index){this.index=clamp(Math.round(index),0,LEVELS.length-1);this.level=LEVELS[this.index];this.boat={...this.level.start,vx:0,vy:0,angle:-Math.PI/2};this.safe={...this.level.start};this.time=0;this.shots=0;this.tears=0;this.collected=this.level.lights.map(()=>false);this.state='play';this.respawn=0;this.completeTime=0;this.path=[{x:this.boat.x,y:this.boat.y,move:true}];this.distance=0;this.stillTime=0;this.events=[];}
 get lightCount(){return this.collected.filter(Boolean).length;}
 get ready(){return this.lightCount===this.collected.length;}
 emit(type,data={}){this.events.push({type,...data});}
 drain(){const e=this.events;this.events=[];return e;}
 launch(vector){if(this.state!=='play'||this.respawn>0||!vector)return false;const speed=Math.hypot(vector.x,vector.y);if(!Number.isFinite(speed)||speed<1)return false;const k=Math.min(1,PHYSICS.maxSpeed/speed);this.boat.vx=vector.x*k;this.boat.vy=vector.y*k;this.shots++;this.stillTime=0;this.emit('launch',{x:this.boat.x,y:this.boat.y,speed});return true;}
 tear(){const b=this.boat;this.emit('tear',{x:b.x,y:b.y});this.tears++;this.respawn=.65;b.vx=0;b.vy=0;this.stillTime=0;}
 step(dt,input={}){if(this.state!=='play')return;this.time+=dt;
  const b=this.boat;if(this.respawn>0){this.respawn=Math.max(0,this.respawn-dt);if(this.respawn===0){const safe=isDanger(this.level,this.safe.x,this.safe.y,this.time,30)?this.level.start:this.safe;b.x=safe.x;b.y=safe.y;this.path.push({x:b.x,y:b.y,move:true});this.emit('return',{x:b.x,y:b.y});}return;}
  const force=waterForce(this.level,b.x,b.y,this.time);const steering=Math.hypot(input.x||0,input.y||0);if(steering){force.x+=(input.x||0)/Math.max(1,steering)*560;force.y+=(input.y||0)/Math.max(1,steering)*560;}
  b.vx=(b.vx+force.x*dt)*Math.exp(-PHYSICS.drag*dt);b.vy=(b.vy+force.y*dt)*Math.exp(-PHYSICS.drag*dt);const oldX=b.x,oldY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;const speed=Math.hypot(b.vx,b.vy);
  if(speed>15){const target=Math.atan2(b.vy,b.vx);let da=(target-b.angle+Math.PI*3)%(Math.PI*2)-Math.PI;b.angle+=da*(1-Math.exp(-10*dt));}
  // The edge of the sheet is a soft shoreline, never an invisible death wall.
  if(b.x<30||b.x>WORLD.w-30){b.x=clamp(b.x,30,WORLD.w-30);b.vx*=-.28;}if(b.y<30||b.y>WORLD.h-30){b.y=clamp(b.y,30,WORLD.h-30);b.vy*=-.28;}
  this.distance+=Math.hypot(b.x-oldX,b.y-oldY);const last=this.path.at(-1);if(Math.hypot(b.x-last.x,b.y-last.y)>11){this.path.push({x:b.x,y:b.y});if(this.path.length>1000)this.path.splice(0,1);}
  if(isDanger(this.level,b.x,b.y,this.time)){this.tear();return;}
  if(speed<18&&Math.hypot(force.x,force.y)<8){b.vx=0;b.vy=0;this.stillTime+=dt;if(this.stillTime>.35&&!isDanger(this.level,b.x,b.y,this.time,38))this.safe={x:b.x,y:b.y};}else this.stillTime=0;
  this.level.lights.forEach((p,i)=>{if(!this.collected[i]&&Math.hypot(b.x-p.x,b.y-p.y)<34){this.collected[i]=true;this.emit('light',{x:p.x,y:p.y,index:i});if(this.ready)this.emit('open',{...this.level.goal});}});
  if(this.ready&&Math.hypot(b.x-this.level.goal.x,b.y-this.level.goal.y)<48){this.state='clear';b.vx=0;b.vy=0;this.completeTime=this.time;this.emit('clear',{x:this.level.goal.x,y:this.level.goal.y,shots:this.shots,tears:this.tears,medals:this.medals()});}
 }
 medals(){return 1+(this.shots<=this.level.par?1:0)+(this.tears===0?1:0);}
}
