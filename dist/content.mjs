export const FLOOR = 590;
const p = (x,y,w) => ({x,y,w});
const e = (type,x,y=FLOOR,extra={}) => ({type,x,y,...extra});
export const ROOMS = [
  {id:0,name:'月下の回廊',en:'MOONLIT CLOISTER',theme:'cathedral',width:2600,left:null,right:1,spawn:220,shrine:240,
    platforms:[p(580,475,250),p(980,390,260),p(1370,470,280),p(1920,440,280)],
    enemies:[e('knight',790),e('bat',1130,330),e('knight',1510),e('acolyte',1970),e('knight',2290)],
    items:[{type:'health',x:1090,y:350},{type:'chest',id:'cloister',x:2030,y:400},{type:'lore',id:'arrival',x:610,y:435}],portals:[],hazards:[],breakables:[470,1280,1810]},
  {id:1,name:'紅の礼拝堂',en:'THE CRIMSON CHAPEL',theme:'cathedral',width:2450,left:0,right:4,spawn:180,shrine:340,
    platforms:[p(660,480,260),p(1070,390,260),p(1460,315,300),p(1840,450,250)],
    enemies:[e('knight',720),e('wraith',1230,295),e('lancer',1910),e('acolyte',2160)],
    items:[{type:'lore',id:'covenant',x:1190,y:350}],portals:[{x:1000,y:FLOOR,to:2,label:'水没書庫へ',en:'DROWNED ARCHIVE'},{x:1600,y:315,to:3,label:'鐘楼へ',en:'THE SILENT BELFRY'}],hazards:[],breakables:[560,1370,2260]},
  {id:2,name:'水没書庫',en:'THE DROWNED ARCHIVE',theme:'crypt',width:2550,left:1,right:null,spawn:190,shrine:270,
    platforms:[p(590,470,260),p(1020,385,270),p(1460,450,250),p(1790,340,260),p(2140,260,270)],
    enemies:[e('knight',740),e('acolyte',1150,385),e('wraith',1500,350),e('bat',1860,250),e('lancer',2260,260,{warden:'tide'})],
    items:[{type:'seal',id:'tide',x:2270,y:215},{type:'chest',id:'archive',x:1140,y:340},{type:'lore',id:'tide',x:1570,y:410}],
    portals:[{x:2370,y:FLOOR,to:1,returnX:1000,label:'礼拝堂へ戻る',en:'RETURN TO THE CHAPEL'}],hazards:[{x:920,w:145,period:4.7,offset:.6},{x:1620,w:170,period:5.2,offset:2}],breakables:[500,1350,2020]},
  {id:3,name:'沈黙の鐘楼',en:'THE SILENT BELFRY',theme:'belfry',width:2450,left:1,right:null,spawn:180,shrine:250,
    platforms:[p(560,470,240),p(940,365,250),p(1330,270,270),p(1750,360,260),p(2110,260,250)],
    enemies:[e('bat',700,340),e('lancer',1060,365),e('wraith',1400,185),e('acolyte',1840,360),e('lancer',2220,260,{warden:'bell'})],
    items:[{type:'seal',id:'bell',x:2235,y:215},{type:'relic',id:'moonchain',x:1465,y:230},{type:'lore',id:'bell',x:1880,y:320}],
    portals:[{x:2250,y:FLOOR,to:1,returnX:1600,returnY:315,label:'礼拝堂へ戻る',en:'RETURN TO THE CHAPEL'}],hazards:[{x:820,w:120,period:4.6,offset:.3},{x:1520,w:190,period:5.7,offset:1.7}],breakables:[450,1230,2050]},
  {id:4,name:'月蝕の聖域',en:'SANCTUM OF THE ECLIPSE',theme:'sanctum',width:2000,left:1,right:null,spawn:240,shrine:270,
    platforms:[p(600,455,230),p(1200,455,230)],enemies:[e('boss',1420)],items:[{type:'lore',id:'vesper',x:420,y:545}],portals:[],hazards:[],breakables:[]}
];
export const UPGRADES = {
  edge:{name:'銀鎖の鍛錬',en:'SILVER CHAIN',desc:'鞭の威力 +5 ／ よろめき強化',icon:'⚔',max:3,cost:[100,200,320]},
  vitality:{name:'生命の器',en:'VESSEL OF LIFE',desc:'最大体力 +20 ／ 購入時に全回復',icon:'♡',max:3,cost:[90,180,280]},
  focus:{name:'月の祈り',en:'LUNAR DEVOTION',desc:'最大魔力 +20 ／ 魔法の威力 +6',icon:'☾',max:3,cost:[90,180,280]}
};
export const LORE = {
 arrival:{title:'帰らぬ巡礼',chapter:'I',text:'最後の巡礼が聖堂の扉を閉じてから、百年が過ぎた。夜ごと鳴り続ける弔鐘に導かれ、エリアスは故郷へ帰ってきた。ポケットには、母が遺した一本の銀鎖だけがあった。'},
 covenant:{title:'月を繋いだ誓い',chapter:'II',text:'聖堂を守るため、大司教は月を二つの印へ封じた。ひとつは水の記憶に。もうひとつは鐘の沈黙に。守り人が倒れるまで、印に触れることはかなわない。'},
 tide:{title:'沈んだ声',chapter:'III',text:'書庫の水底で、名を失った祈りが揺れる。「夜を閉じ込めれば、誰も朝を恐れずに済む」──その言葉が、祝福ではなく呪いだと知る者はいなかった。'},
 bell:{title:'最後の鐘守',chapter:'IV',text:'鐘守は百年、ひとりで階を昇り続けた。鐘が鳴れば大司教は目覚める。鳴らさなければ夜は終わらない。その矛盾を解く者を、錆びた鎧はいまも待っている。'},
 vesper:{title:'夜を抱く者',chapter:'V',text:'ヴェスパーは死者を呼び戻そうとしたのではない。残された者が別れを受け入れられるまで、夜を引き延ばしたのだ。銀鎖は、祈りを断ち切るためにある。'}
};
export const ENEMY_INFO = {
 knight:{name:'亡骸の剣士',hp:76,xp:20,gold:15,tip:'赤い予兆のあとに斬りかかる。三連撃で崩す。'},
 bat:{name:'夜翼',hp:37,xp:12,gold:10,tip:'翼を止めたら急降下。跳躍か魔法で迎え撃つ。'},
 wraith:{name:'薄衣の亡霊',hp:58,xp:25,gold:22,tip:'姿を薄くして接近する。月光魔法に弱い。'},
 lancer:{name:'黒鉄の槍衛',hp:132,xp:35,gold:30,tip:'正面の盾は通常攻撃を軽減。背後、三撃目、魔法が有効。'},
 acolyte:{name:'灰の侍祭',hp:64,xp:25,gold:22,tip:'遠くから狙いを定める。発射前に接近して止める。'},
 boss:{name:'弔鐘の大司教 ヴェスパー',hp:940,xp:120,gold:300,tip:'扇状弾、突進、足元の月炎。半分まで削ると夜が深まる。'}
};
