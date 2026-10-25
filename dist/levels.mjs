export const WORLD={w:1440,h:620};
const rock=(x,y,rx,ry,art=0,rotation=0,extra={})=>({x,y,rx,ry,art,rotation,...extra});
const light=(x,y)=>({x,y});
export const LEVELS=[
 {name:'はじまりの波',en:'A FIRST RIPPLE',note:'指を引いて、放す。灯を集めて港へ。',palette:'paper',par:4,start:{x:150,y:325},goal:{x:1300,y:300},lights:[light(435,305),light(800,245),light(1080,355)],rocks:[rock(630,475,112,86,1,-.2),rock(1000,100,83,67,2,.2)],currents:[],vortices:[]},
 {name:'墨の群島',en:'THE INK ARCHIPELAGO',note:'引いているあいだは、海がゆっくり動く。',palette:'paper',par:5,start:{x:145,y:430},goal:{x:1300,y:350},lights:[light(400,145),light(745,445),light(1100,180)],rocks:[rock(525,320,90,123,0,.3),rock(850,123,105,76,4,-.2),rock(1000,450,98,92,3,.35)],currents:[],vortices:[]},
 {name:'風の通り道',en:'A WIND BETWEEN',note:'細い流れに乗れば、ひと漕ぎは遠くまで。',palette:'sage',par:6,start:{x:130,y:390},goal:{x:1300,y:225},lights:[light(415,450),light(800,275),light(1120,160)],rocks:[rock(440,180,119,103,3,.2),rock(1060,450,122,95,1,-.2)],currents:[{x:720,y:350,rx:575,ry:155,vx:115,vy:-26}],vortices:[]},
 {name:'めぐりあう渦',en:'THE TURNING SEA',note:'渦の縁には、もうひとつの進み方がある。',palette:'paper',par:6,start:{x:140,y:300},goal:{x:1300,y:300},lights:[light(405,130),light(690,510),light(1000,120),light(1160,450)],rocks:[rock(730,105,65,55,2,.1)],currents:[],vortices:[{x:520,y:330,r:145,core:29,spin:1,strength:105},{x:950,y:355,r:150,core:29,spin:-1,strength:105}]},
 {name:'漂う庭',en:'THE DRIFTING GARDEN',note:'島の行方を見てから、帆を張る。',palette:'rose',par:6,start:{x:130,y:310},goal:{x:1310,y:300},lights:[light(390,180),light(740,465),light(1110,170)],rocks:[rock(530,290,85,101,5,.1,{drift:{dx:0,dy:125,speed:.52,phase:0}}),rock(920,300,100,79,1,-.3,{drift:{dx:0,dy:135,speed:.45,phase:2.3}})],currents:[],vortices:[]},
 {name:'ひとすじの水路',en:'A THREAD OF WATER',note:'短く引いて、小さな航路を重ねる。',palette:'sage',par:7,start:{x:125,y:305},goal:{x:1305,y:300},lights:[light(450,125),light(745,465),light(1100,165)],rocks:[rock(420,410,146,124,4,.15),rock(760,166,132,124,0,.05),rock(1065,425,136,121,3,-.2)],currents:[{x:750,y:310,rx:540,ry:210,vx:25,vy:0}],vortices:[]},
 {name:'青い余白',en:'THE BLUE HOUR',note:'暗い海でも、灯は航路を覚えている。',palette:'night',par:7,start:{x:130,y:390},goal:{x:1300,y:260},lights:[light(405,140),light(740,475),light(1115,140)],rocks:[rock(550,305,92,108,1,.2),rock(1010,360,88,93,5,-.4)],currents:[{x:760,y:300,rx:490,ry:215,vx:56,vy:-14}],vortices:[{x:810,y:240,r:125,core:26,spin:1,strength:80}]},
 {name:'帰りの灯',en:'A HARBOR OF LIGHT',note:'集めた灯で、この海を縫いとめる。',palette:'gold',par:8,start:{x:135,y:310},goal:{x:1290,y:300},lights:[light(365,125),light(610,490),light(930,125),light(1145,455)],rocks:[rock(530,260,79,83,2,-.1,{drift:{dx:0,dy:85,speed:.4,phase:2}}),rock(1030,320,77,91,4,.2)],currents:[{x:810,y:390,rx:420,ry:170,vx:35,vy:-12}],vortices:[{x:790,y:310,r:133,core:27,spin:-1,strength:85}]}
];
export const PALETTES={
 paper:{paper:'#efe9dc',ink:'#203b43',muted:'#7e8983',line:'#b6b6a5',gold:'#a9823e',light:'#c69338',wash:'#879e9b',wake:'#a37d38'},
 sage:{paper:'#e5e9df',ink:'#214638',muted:'#799185',line:'#a7b8a6',gold:'#a48036',light:'#b98c37',wash:'#7d9c8a',wake:'#93752f'},
 rose:{paper:'#eee4de',ink:'#493e4b',muted:'#a18b8e',line:'#c4b1ae',gold:'#ae7f46',light:'#bd8550',wash:'#b09091',wake:'#aa7343'},
 night:{paper:'#142b38',ink:'#d5dfd6',muted:'#7c9ca6',line:'#47616c',gold:'#dcc291',light:'#f1d39a',wash:'#446d7a',wake:'#d2b580'},
 gold:{paper:'#eee8d4',ink:'#3f4b40',muted:'#8b9178',line:'#b9b79e',gold:'#a17c32',light:'#b8892e',wash:'#a4aa85',wake:'#a17c32'}
};
export function rockAt(r,time){const d=r.drift;return {x:r.x+(d?Math.sin(time*d.speed+d.phase)*d.dx:0),y:r.y+(d?Math.sin(time*d.speed+d.phase)*d.dy:0)};}
