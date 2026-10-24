import test from 'node:test';import assert from 'node:assert/strict';import {GameModel} from '../dist/model.mjs';import {heroPose,posePoint,whipForPlayer,whipHitsBox} from '../dist/animation.mjs';
function player(q,combo=0,dir=1){const p={...new GameModel().player,x:400,y:590,attackTotal:.36,attack:.36*(1-q),combo,dir};return p;}
test('the chain is attached to the displayed grip in every attack frame and facing direction',()=>{
 const frames=new Set();for(const dir of [-1,1])for(let i=1;i<100;i++){const p=player(i/100,0,dir),pose=heroPose(p),whip=whipForPlayer(p),grip=posePoint(pose,pose.source.grip);frames.add(pose.frame);assert.equal(whip.points[0].x,grip.x);assert.equal(whip.points[0].y,grip.y);}
 assert.equal(frames.size,8);
});
test('chain length remains consistent through anticipation, crack and recovery, without passing through the floor',()=>{
 for(const combo of [0,1,2])for(let i=1;i<100;i++){const p=player(i/100,combo),w=whipForPlayer(p,true);let length=0;for(let j=1;j<w.points.length;j++)length+=Math.hypot(w.points[j].x-w.points[j-1].x,w.points[j].y-w.points[j-1].y);assert(Math.abs(length-w.length)<w.length*.015,'material length at '+i);for(const point of w.points)assert(point.y<=p.y+1,'chain below floor at '+i);}
});
test('damage follows the visible stroke and is disabled during windup and return',()=>{
 for(const q of [.08,.23,.8,.95]){const w=whipForPlayer(player(q));assert(!whipHitsBox(w,{x:w.tip.x-10,y:w.tip.y-10,w:20,h:20}));}
 const w=whipForPlayer(player(.48));assert(whipHitsBox(w,{x:w.tip.x-8,y:w.tip.y-8,w:16,h:16}));assert(!whipHitsBox(w,{x:w.tip.x+50,y:w.tip.y+100,w:16,h:16}));
 const left=whipForPlayer(player(.48,0,-1));assert(Math.abs(left.tip.x-400+(w.tip.x-400))<1e-7);assert.equal(left.tip.y,w.tip.y);
});
test('locomotion is registered to a stable foot root and idle uses a single coherent pose',()=>{
 const g=new GameModel(),p=g.player;let top=[];for(let frame=0;frame<8;frame++){Object.assign(p,{vx:300,run:frame+.2});const pose=heroPose(p),src=pose.source;top.push(posePoint(pose,[src.origin[0],Math.min(...src.rects.map(r=>r[1]))]).y);assert.equal(posePoint(pose,src.origin).y,p.y);}
 assert(Math.max(...top)-Math.min(...top)<3);Object.assign(p,{vx:0,attack:0});const frame=heroPose(p).frame;for(const t of [0,.3,.9,1.3]){p.anim=t;assert.equal(heroPose(p).frame,frame);}
});
test('grounded strikes settle the planted feet while airborne strikes retain movement and can dodge cancel',()=>{
 const g=new GameModel();g.enemies=[];g.breakables=[];const p=g.player;p.x=400;p.vx=300;
 const x=p.x;for(let i=0;i<16;i++)g.update(1/60,{right:true,attack:true});
 assert(p.x-x<16,'planted strike must not skate across the floor');assert.equal(p.vx,0);
 g.update(1/60,{right:true,jump:true,attack:true});const airborneX=p.x;for(let i=0;i<6;i++)g.update(1/60,{right:true,jump:true,attack:true});assert(p.x-airborneX>20,'air strike keeps lateral control');
 g.update(1/60,{left:true,dash:true});assert.equal(p.attack,0);assert(p.vx<0);assert(p.dash>0);
});
