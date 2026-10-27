export const VERSION='4.4.1';
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
export const chassisUnlocked=(r,key)=>key==='lancer'||(key==='bastion'&&r.totalKills>=60)||(key==='wraith'&&r.bestTime>=90)||(key==='alchemist'&&r.totalKills>=180)||(key==='tempest'&&r.totalElites>=5)||(key==='echo'&&r.totalEvolutions>=3);
export const OBJECTIVES=[
 {id:'bastion',name:'バスティオン解放',text:'累計60機撃破',field:'totalKills',goal:60,reward:15},
 {id:'wraith',name:'レイス解放',text:'90秒生存',field:'bestTime',goal:90,reward:20},
 {id:'evolution',name:'限界突破',text:'兵装を1回進化',field:'totalEvolutions',goal:1,reward:30},
 {id:'hunters',name:'母艦ハンター',text:'エリートを累計3機撃破',field:'totalElites',goal:3,reward:25},
 {id:'eclipse',name:'深層侵攻を解放',text:'星喰いを撃破',field:'wins',goal:1,reward:40}
];
export function evolutionReady(f,id){const e=EVOLUTIONS[id];return !f.evolutions[id]&&Object.entries(e.need).every(([k,n])=>f.skills[k]>=n);}

// Expedition v4 — sidegrades change the build rather than only raising numbers.
Object.assign(CHASSIS,{
 alchemist:{name:'ALCHEMIST',ja:'アルケミスト',tag:'機雷＋回収 / 資源特化',frame:'bastion',color:'#9ce9cc',hp:95,damage:1,weapon:'mine',unlock:'累計180撃破',text:'機雷を散布。最初から回収フィールド1。'},
 tempest:{name:'TEMPEST',ja:'テンペスト',tag:'散弾＋装甲 / 近接強襲',frame:'lancer',color:'#e5a3ff',hp:110,damage:1.05,weapon:'scatter',unlock:'エリート累計5機撃破',text:'扇状の散弾。最初から積層防壁1。'},
 echo:{name:'ECHO',ja:'エコー',tag:'旋回刃＋高速装填',frame:'wraith',color:'#a8e9ff',hp:80,damage:1.1,weapon:'blade',unlock:'兵装を累計3回進化',text:'戻ってくる旋回刃。最初から高速装填1。'}
});
Object.assign(UPGRADES,{
 scatter:{name:'フラック散弾砲',sub:'FLAK FAN',icon:'⋔',text:'前方へ広角の徹甲散弾。近い敵に複数命中',max:5,type:'weapon',color:'#ffb89f',evo:'supernova'},
 mine:{name:'グラビティ機雷',sub:'GRAVITY MINE',icon:'✥',text:'航跡に自動機雷を残し、接近した敵を爆破',max:5,type:'weapon',color:'#c2a8ff',evo:'singularity'},
 blade:{name:'リターンブレード',sub:'RETURN BLADE',icon:'↶',text:'旋回刃が敵を貫いて機体へ戻る。往復で命中',max:5,type:'weapon',color:'#a4ffde',evo:'ouroboros'},
 pulse:{name:'反応パルス',sub:'REACTIVE PULSE',icon:'◌',text:'周囲へ衝撃波。敵弾も消して進路を開く',max:5,type:'weapon',color:'#a3ddff',evo:'eventhorizon'},
 pierce:{name:'徹甲チャンバー',sub:'PENETRATOR',icon:'⇥',text:'星弾・散弾の貫通数 +1',max:3,type:'passive',color:'#f4cc8b'},
 frost:{name:'冷却弾頭',sub:'CRYO LINK',icon:'❄',text:'命中した敵を2秒減速。段階ごとに減速強化',max:3,type:'passive',color:'#a3ddff'},
 salvage:{name:'資源分解',sub:'SALVAGER',icon:'♢',text:'撃破経験値 +12%、帰還パーツ +10% / 段階',max:3,type:'passive',color:'#e7d5a1'},
 focus:{name:'背水リアクター',sub:'LAST STAND',icon:'△',text:'体力50%未満で全兵装の威力 +18% / 段階',max:3,type:'passive',color:'#ffa1a1'},
 leech:{name:'修復コンバーター',sub:'LIFE LINK',icon:'♥',text:'12機撃破ごとに体力を3修復 / 段階',max:3,type:'passive',color:'#a4e8b3'}
});
Object.assign(EVOLUTIONS,{
 supernova:{name:'スーパーノヴァ砲',icon:'✶',weapon:'scatter',need:{scatter:4,pierce:2},hint:'散弾4 + 徹甲2',text:'広角の貫通散弾を大量発射。発射数と威力が増す。',color:'#ffc99c'},
 singularity:{name:'シンギュラリティ',icon:'✥',weapon:'mine',need:{mine:4,magnet:2},hint:'機雷4 + 回収2',text:'機雷が周囲を吸引する広域重力爆弾に進化。',color:'#d1afff'},
 ouroboros:{name:'ウロボロス',icon:'∞',weapon:'blade',need:{blade:4,tempo:2},hint:'旋回刃4 + 高速装填2',text:'三枚の大型旋回刃が往復し、周囲を切り裂く。',color:'#aeffd8'},
 eventhorizon:{name:'イベントホライズン',icon:'◉',weapon:'pulse',need:{pulse:4,shield:2},hint:'パルス4 + シールド2',text:'広域パルスが連鎖し敵弾を一掃。発動時に装甲も修復。',color:'#b3ebff'}
});
Object.assign(META,{
 capacitors:{name:'予備コンデンサー',icon:'◈',text:'初期シールド、再装填 −2% / 段階',max:3,cost:32},
 logistics:{name:'補給ネットワーク',icon:'+',text:'宙域突破時の体力修復 +4 / 段階',max:3,cost:26}
});
export const MODS={
 standard:{name:'標準機構',icon:'⬡',text:'補正なし。初期兵装の特性を活かす。'},
 glass:{name:'硝子の炉心',icon:'△',text:'全兵装の威力 +30% / 最大体力 −25%'},
 battery:{name:'蓄電外殻',icon:'◈',text:'初期シールドとシールド1 / 再装填 +12%'},
 recycler:{name:'廃材回収機',icon:'♢',text:'初期回収2・資源分解1 / 威力 −12%'},
 rapid:{name:'高回転機関',icon:'»',text:'再装填 −20% / 発射ダメージ −15%'},
 fortress:{name:'要塞フレーム',icon:'▱',text:'最大体力 +35・装甲1 / 再装填 +15%'},
 thermal:{name:'熱交換翼',icon:'❄',text:'冷却弾頭2 / 全兵装の威力 −8%'},
 hunter:{name:'対大型照準器',icon:'⌖',text:'母艦・ボスへの威力 +35% / その他 −10%'}
};
export const RELICS={
 ember:{name:'残火の核',icon:'✹',text:'ミサイルと機雷の爆発半径 +35% / 威力 +15%'},
 prism:{name:'七彩レンズ',icon:'◇',text:'星弾と散弾の発射数 +2、ビーム威力 +25%'},
 clock:{name:'時環ギア',icon:'»',text:'すべての兵装の再装填 −18%'},
 pearl:{name:'真珠の心臓',icon:'♡',text:'最大体力 +25、宙域突破時に追加で12修復'},
 mirror:{name:'反射外殻',icon:'◈',text:'シールドで防ぐと近くの敵へ100ダメージの反撃'},
 courier:{name:'回収ビーコン',icon:'♢',text:'経験値と帰還パーツ +20%、吸引範囲 +80'},
 fang:{name:'星喰いの牙',icon:'⋔',text:'エリート・ボスへの威力 +30%'},
 echo:{name:'共鳴回路',icon:'∞',text:'ブレードと僚機の威力 +35%、パルス範囲 +25%'}
};
export const SECTOR_MODS={
 clear:{name:'静穏航路',text:'標準の敵編成と地形。安定した航路。',reward:1},
 rich:{name:'資源帯',text:'敵が少し増加。経験値 +35%、報酬 +20%。',reward:1.2},
 storm:{name:'弾幕前線',text:'敵弾が20%高速化。経験値・報酬 +20%。',reward:1.2},
 armada:{name:'艦隊封鎖',text:'重装敵と追加母艦が出現。経験値・報酬 +25%。',reward:1.25},
 ruins:{name:'遺跡回廊',text:'4連続地形と狭い通路。突破経験値 +2、報酬 +20%。',reward:1.2},
 gravity:{name:'重力嵐',text:'重力が強くなる。敵は遅くなり、報酬 +15%。',reward:1.15},
 fragile:{name:'過熱戦域',text:'敵の体力 −30%、数が増え攻撃力 +20%。報酬 +20%。',reward:1.2},
 haven:{name:'補給航路',text:'敵が減少し、進入時に体力を20修復。報酬 −10%。',reward:.9}
};
export const CONTRACTS={
 survey:{name:'宙域調査',text:'90秒生存 / +18パーツ',field:'time',goal:90,reward:18},
 hunt:{name:'群体掃討',text:'120機撃破 / +25パーツ',field:'kills',goal:120,reward:25},
 ace:{name:'母艦狩り',text:'母艦を3機撃破 / +30パーツ',field:'eliteKills',goal:3,reward:30},
 diver:{name:'航路開拓',text:'地形ゲートを8回突破 / +25パーツ',field:'gateDodges',goal:8,reward:25},
 engineer:{name:'限界試験',text:'兵装を2回進化 / +35パーツ',field:'evolutionCount',goal:2,reward:35},
 conquer:{name:'星喰い討伐',text:'ボスを撃破 / +40パーツ',field:'wonCount',goal:1,reward:40}
};
OBJECTIVES.push(
 {id:'alchemist',name:'アルケミスト解放',text:'累計180機撃破',field:'totalKills',goal:180,reward:25},
 {id:'tempest',name:'テンペスト解放',text:'母艦を累計5機撃破',field:'totalElites',goal:5,reward:30},
 {id:'echo',name:'エコー解放',text:'兵装を累計3回進化',field:'totalEvolutions',goal:3,reward:35},
 {id:'veteran',name:'遠征のベテラン',text:'10回出撃',field:'runs',goal:10,reward:40},
 {id:'collector',name:'遺物収集家',text:'異なる遺物を8種類発見',field:'relicCount',goal:8,reward:50}
);
export function contractProgress(f){const c=CONTRACTS[f.contract];if(!c)return 0;const value=c.field==='evolutionCount'?Object.values(f.evolutions).filter(Boolean).length:c.field==='wonCount'?Number(f.status==='won'):f[c.field]||0;return Math.min(c.goal,value);}

export const BOSSES=[{en:'THE ECLIPSE',ja:'星喰い'},{en:'SIEGE REGENT',ja:'重砲王'},{en:'SPIRAL CROWN',ja:'螺旋冠'}];
