import {SHAPES} from './terrain-shapes.mjs?v=lumen-3.0.0';
// A common silhouette drives both painting and collision. Coordinates are normalized.
export function terrainPoints(r){return SHAPES[(r.theme??0)*2+(r.variant??0)%2].map(([x,y])=>[r.x+x*r.rx,r.y+y*r.ry]);}
export function circleHitsTerrain(p,r){
 const pts=terrainPoints(r);let inside=false;
 for(let i=0,j=pts.length-1;i<pts.length;j=i++){
  const [ax,ay]=pts[j],[bx,by]=pts[i];
  if((ay>p.y)!==(by>p.y)&&p.x<(bx-ax)*(p.y-ay)/(by-ay)+ax)inside=!inside;
  const dx=bx-ax,dy=by-ay,q=Math.max(0,Math.min(1,((p.x-ax)*dx+(p.y-ay)*dy)/(dx*dx+dy*dy)));
  if(Math.hypot(p.x-ax-q*dx,p.y-ay-q*dy)<p.r)return true;
 }
 return inside;
}
