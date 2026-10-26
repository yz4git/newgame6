// One geometry definition drives the warning, painting and collision.
export const HAZARD_NAMES=['恒星フレア','珊瑚核','結晶光線','溶岩噴出','要塞シャッター'];
export const HAZARD_COLORS=['#ffdd87','#70f5d2','#a7c9ff','#ff9b67','#f5b5d1'];
const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
export function gateHazard(g,time){
 if(!g.hazard)return null;
 const theme=g.theme,cycle=((time+g.hazardPhase)%3.6+3.6)%3.6;
 // The forecast is visible for 1.1 seconds before an active pulse.
 const active=theme===1||cycle>=1.1&&cycle<2.35;
 const warning=theme===1||cycle<2.35;
 const top=g.center-g.gap/2,bottom=g.center+g.gap/2;
 const x=g.x+(theme===1?Math.sin(time*1.9+g.hazardPhase)*18:0);
 if(theme===0)return {theme,x,y:top+48,r:27,active,warning,shape:'orb'};
 if(theme===1)return {theme,x,y:g.center+Math.sin(time*1.55+g.hazardPhase)*43,r:23,active,warning,shape:'orb'};
 if(theme===2)return {theme,x,y:top+53,from:top+9,to:top+99,r:10,active,warning,shape:'beam'};
 if(theme===3)return {theme,x,y:bottom-51,from:bottom-98,to:bottom-9,r:16,active,warning,shape:'beam'};
 return {theme,x,y:top+60,from:top+8,to:top+111,r:18,active,warning,shape:'beam'};
}
export function hitsGateHazard(p,h){
 if(!h?.active||Math.abs(p.x-h.x)>p.r+h.r)return false;
 const y=h.shape==='orb'?h.y:clamp(p.y,h.from,h.to);
 return Math.hypot(p.x-h.x,p.y-y)<p.r+h.r;
}
