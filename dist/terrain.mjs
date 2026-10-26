import {SHAPES} from './terrain-shapes.mjs?v=lumen-4.2.0';
// A common silhouette drives both painting and collision. Coordinates are normalized.
export function terrainPoints(r){return SHAPES[(r.theme??0)*2+(r.variant??0)%2].map(([x,y])=>[r.x+x*r.rx,r.y+y*r.ry]);}
// Only the few tiles intersecting the viewport/circle are generated, at any altitude.
export function terrainTiles(r,minY,maxY){
 if(!r.wall)return [r];
 const step=r.ry*1.1,side=r.side||1;
 const from=Math.max(0,Math.ceil((side>0?minY-r.ry-r.y:r.y-maxY-r.ry)/step));
 const to=Math.max(-1,Math.floor((side>0?maxY+r.ry-r.y:r.y-minY+r.ry)/step));
 const tiles=[];for(let j=from;j<=to;j++)tiles.push({...r,wall:false,y:r.y+side*j*step,variant:((r.variant||0)+j)%2});return tiles;
}
export function circleHitsTerrain(p,r){
 if(Math.abs(p.x-r.x)>r.rx+p.r)return false;
 return terrainTiles(r,p.y-p.r,p.y+p.r).some(tile=>circleHitsPolygon(p,tile));
}
function circleHitsPolygon(p,r){
 const pts=terrainPoints(r);let inside=false;
 for(let i=0,j=pts.length-1;i<pts.length;j=i++){
  const [ax,ay]=pts[j],[bx,by]=pts[i];
  if((ay>p.y)!==(by>p.y)&&p.x<(bx-ax)*(p.y-ay)/(by-ay)+ax)inside=!inside;
  const dx=bx-ax,dy=by-ay,q=Math.max(0,Math.min(1,((p.x-ax)*dx+(p.y-ay)*dy)/(dx*dx+dy*dy)));
  if(Math.hypot(p.x-ax-q*dx,p.y-ay-q*dy)<p.r)return true;
 }
 return inside;
}
