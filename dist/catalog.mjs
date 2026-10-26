export const VERSION='3.0.0';
export const CHASSIS={
 lancer:{name:'LANCER',ja:'ランサー',tag:'誘導斉射 / 万能型',frame:'lancer',color:'#edb689',hp:100,damage:1,weapon:'missile',text:'誘導ミサイルを初期装備。火力を重ねて突破する。'},
 bastion:{name:'BASTION',ja:'バスティオン',tag:'装甲衛星 / 重装型',frame:'bastion',color:'#98c9ed',hp:135,damage:.95,weapon:'orbit',text:'衛星光輪と厚い装甲。累計60撃破で解放。'},
 wraith:{name:'WRAITH',ja:'レイス',tag:'荷電砲 / 狙撃型',frame:'wraith',color:'#9ae1c5',hp:85,damage:1.16,weapon:'beam',text:'高出力の荷電砲。90秒生存で解放。'}
};
export const UPGRADES={
 power:{name:'リアクター増幅',sub:'REACTOR',icon:'✦',text:'すべての兵装の威力 +28%',max:6,type:'passive',color:'#f6c57d'},
 tempo:{name:'高速装填',sub:'OVERCLOCK',icon:'»',text:'すべての兵装の再装填 −10%',max:5,type:'passive',color:'#f6c57d'},
 split:{name:'多連装ハードポイント',sub:'MULTISHOT',icon:'⋈',text:'星弾とミサイルの発射数 +1',max:4,type:'passive',color:'#f6c57d'},
 orbit:{name:'衛星ブレード',sub:'SATELLITE',icon:'◎',text:'周囲を巡る攻撃衛星を追加・強化',max:5,type:'weapon',color:'#98ece0',evo:'aegis'},
 storm:{name:'アーク放電',sub:'ARC DISCHARGE',icon:'ϟ',text:'近くの複数の敵へ自動で連鎖雷撃',max:5,type:'weapon',color:'#c6b2ff',evo:'tempest'},
 missile:{name:'誘導ミサイル',sub:'HOMING SALVO',icon:'↗',text:'誘導弾を斉射。着弾地点で範囲爆発',max:5,type:'weapon',color:'#ffa179',evo:'ragnarok'},
 beam:{name:'荷電ランス',sub:'CHARGE LANCE',icon:'═',text:'敵を貫く長射程の荷電ビーム',max:5,type:'weapon',color:'#99dbff',evo:'seraph'},
 drone:{name:'僚機ユニット',sub:'WINGMEN',icon:'⟐',text:'自律僚機が追尾弾で援護する',max:4,type:'weapon',color:'#94e7b7',evo:'swarm'},
 magnet:{name:'回収フィールド',sub:'RECOVERY',icon:'◇',text:'吸引範囲 +55、経験値 +8%',max:4,type:'passive',color:'#98ece0'},
 heart:{name:'拡張装甲',sub:'HULL EXTENSION',icon:'♡',text:'最大体力 +20、体力を35回復',max:5,type:'passive',color:'#f3acaa'},
 armor:{name:'積層防壁',sub:'LAMINATE',icon:'⬡',text:'受けるダメージを2軽減',max:4,type:'passive',color:'#b6ccdf'},
 regen:{name:'ナノリペア',sub:'NANOREPAIR',icon:'+',text:'8秒ごとに体力を3修復',max:3,type:'passive',color:'#98e0b0'},
 critical:{name:'弱点解析',sub:'CRITICAL LINK',icon:'⌖',text:'クリティカル率 +10%（威力2倍）',max:4,type:'passive',color:'#f5d391'},
 shield:{name:'パルスシールド',sub:'PULSE GUARD',icon:'◈',text:'定期的に被弾を1回防ぐシールド',max:4,type:'passive',color:'#9ad8ee'}
};
export const EVOLUTIONS={
 nova:{name:'ヘリオス・バースト',icon:'✺',weapon:'star',need:{power:4,tempo:3},hint:'リアクター4 + 高速装填3',text:'星弾が多重貫通弾へ進化。発射数と威力が大きく増す。',color:'#ffd483'},
 ragnarok:{name:'ラグナロク斉射',icon:'✹',weapon:'missile',need:{missile:4,split:2},hint:'ミサイル4 + 多連装2',text:'大型誘導弾を一斉発射。広域爆発が敵群を巻き込む。',color:'#ffa178'},
 seraph:{name:'セラフ・レイ',icon:'╋',weapon:'beam',need:{beam:4,power:3},hint:'荷電ランス4 + リアクター3',text:'複数の標的を同時に貫く超高出力の連装ビーム。',color:'#b0eaff'},
 aegis:{name:'アイギス環',icon:'◉',weapon:'orbit',need:{orbit:4,armor:2},hint:'衛星ブレード4 + 積層防壁2',text:'大型衛星が攻撃しながら周囲の敵弾を迎撃する。',color:'#a7ffea'},
 tempest:{name:'トール・テンペスト',icon:'ϟ',weapon:'storm',need:{storm:4,magnet:2},hint:'アーク放電4 + 回収2',text:'長射程の多重雷撃と衝撃波が敵の群れを断つ。',color:'#d8c1ff'},
 swarm:{name:'オービタル・スウォーム',icon:'❖',weapon:'drone',need:{drone:3,tempo:3},hint:'僚機3 + 高速装填3',text:'4機の自律僚機が高密度の貫通弾を放つ。',color:'#b1ffd2'}
};
export const META={
 reactor:{name:'主機チューン',icon:'✦',text:'全兵装の威力 +5% / 段階',max:5,cost:18},
 hull:{name:'強化フレーム',icon:'⬡',text:'最大体力 +8 / 段階',max:5,cost:15},
 armor:{name:'防弾コーティング',icon:'▱',text:'被ダメージ −1 / 段階',max:4,cost:24},
 recovery:{name:'回収ドライブ',icon:'◇',text:'経験値 +5%、吸引 +12 / 段階',max:4,cost:18},
 analysis:{name:'作戦データ',icon:'⟳',text:'各出撃の再抽選 +1 / 段階',max:3,cost:22},
 rescue:{name:'リブートコア',icon:'↻',text:'各出撃で1回、体力50%で再起動',max:1,cost:100}
};
export const metaCost=(key,rank)=>META[key].cost*(rank+1);
export const metaSpent=meta=>Object.entries(META).reduce((sum,[k,u])=>sum+u.cost*(meta[k]||0)*((meta[k]||0)+1)/2,0);
export const chassisUnlocked=(r,key)=>key==='lancer'||(key==='bastion'&&r.totalKills>=60)||(key==='wraith'&&r.bestTime>=90);
export const OBJECTIVES=[
 {id:'bastion',name:'バスティオン解放',text:'累計60機撃破',field:'totalKills',goal:60,reward:15},
 {id:'wraith',name:'レイス解放',text:'90秒生存',field:'bestTime',goal:90,reward:20},
 {id:'evolution',name:'限界突破',text:'兵装を1回進化',field:'totalEvolutions',goal:1,reward:30},
 {id:'hunters',name:'母艦ハンター',text:'エリートを累計3機撃破',field:'totalElites',goal:3,reward:25},
 {id:'eclipse',name:'深層侵攻を解放',text:'星喰いを撃破',field:'wins',goal:1,reward:40}
];
export function evolutionReady(f,id){const e=EVOLUTIONS[id];return !f.evolutions[id]&&Object.entries(e.need).every(([k,n])=>f.skills[k]>=n);}
