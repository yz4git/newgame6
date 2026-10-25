import {Flight,STEP,clock,clamp} from './model.mjs?v=lumen-2.0.1';
import {CHASSIS,UPGRADES,EVOLUTIONS,META,OBJECTIVES,chassisUnlocked,metaCost,metaSpent,evolutionReady} from './catalog.mjs?v=lumen-2.0.1';
import {Painter} from './render.mjs?v=lumen-2.0.1';
import {Sound} from './audio.mjs?v=lumen-2.0.1';
import {loadRecord,saveRecord,settleRun,purchaseUpgrade,refundUpgrades,selectChassis,flightOptions} from './storage.mjs?v=lumen-2.0.1';
import {installTouchGuards} from './touch.mjs?v=lumen-2.0.1';
installTouchGuards();
const $=id=>document.getElementById(id),painter=new Painter($('sky'));
let record=loadRecord(),saveFailed=false,ready=false;const sound=new Sound(record.sound);
let f=new Flight(),preview=new Flight(7,flightOptions(record)),mode='title',hangarBack='title',accumulator=0,last=performance.now(),visualTime=0,hudTime=0,repeatTimer=0,toastUntil=0,armoryKey='',ended=false,renderCost=0,rawFrame=0;
const held=new Set();
const weaponKeys=['star','missile','beam','orbit','storm','drone'];const weaponIcons={star:'✦',missile:'↗',beam:'═',orbit:'◎',storm:'ϟ',drone:'⟐'};
const weaponName=k=>k==='star'?'星弾':UPGRADES[k].name;
const evolutionFor=k=>Object.keys(EVOLUTIONS).find(id=>EVOLUTIONS[id].weapon===k);
function clearInput(){held.clear();$('rise').classList.remove('held');repeatTimer=0;}
function setMode(next){mode=next;clearInput();accumulator=0;const screens={title:'titleScreen',paused:'pauseScreen',upgrade:'upgradeScreen',loot:'lootScreen',result:'resultScreen',guide:'guideScreen',hangar:'hangarScreen'};for(const [key,id]of Object.entries(screens))$(id).hidden=next!==key;$('hud').hidden=!['playing','paused','upgrade','loot'].includes(next);}
function resize(){painter.resize(innerWidth,innerHeight);f.setView(painter.w,painter.h,true);preview.setView(painter.w,painter.h,true);}
window.addEventListener('resize',resize);resize();
function persist(next){record=next;if(!saveRecord(record))saveFailed=true;updateTitle();}
function updateTitle(){
 $('best').textContent=record.runs?`BEST ${clock(record.bestTime)} / ${record.bestKills} KILLS / ${record.wins} CLEAR`:'FIRST SORTIE / 最初の一機から';
 $('titleCraft').textContent=CHASSIS[record.selected].name;$('titleCredits').textContent=`PARTS ${record.credits}`;$('shipLabel').textContent=`${CHASSIS[record.selected].name} / ${CHASSIS[record.selected].ja}`;
}
function syncSound(){for(const b of document.querySelectorAll('.sound-toggle')){b.setAttribute('aria-pressed',String(sound.enabled));b.setAttribute('aria-label',sound.enabled?'サウンドをオフ':'サウンドをオン');const t=b.querySelector('.sound-text');if(t)t.textContent=sound.enabled?'SOUND ON':'SOUND OFF';b.style.opacity=sound.enabled?'1':'.65';}}
function refreshPreview(){preview=new Flight(7,flightOptions(record));preview.setView(painter.w,painter.h,true);}
export function start(initialFlight){
 if(!ready)return false;sound.unlock();f=initialFlight instanceof Flight?initialFlight:new Flight(Date.now(),flightOptions(record));f.setView(painter.w,painter.h,true);painter.trail=[];painter.lastTrail=0;ended=false;armoryKey='';$('toast').hidden=true;$('flightTip').style.opacity='1';setMode('playing');f.flap();updateHUD();last=performance.now();return true;
}
function home(){setMode('title');refreshPreview();updateTitle();$('start').focus({preventScroll:true});}
function pause(){if(mode!=='playing')return;setMode('paused');$('pauseBuild').innerHTML=weaponKeys.filter(k=>k==='star'||f.skills[k]).map(k=>{const id=evolutionFor(k);return f.evolutions[id]?`<span class="evo-text">${EVOLUTIONS[id].name}</span>`:`${weaponName(k)} LV.${k==='star'?1+f.skills.power:f.skills[k]}`;}).join(' / ')+`<br>威力 ${Math.round(f.power*100)}%　軽減 ${f.skills.armor*2+f.meta.armor}　再抽選 ${f.rerolls}`;$('resume').focus({preventScroll:true});}
function resume(){if(mode!=='paused')return;setMode('playing');f.p.hurt=Math.max(f.p.hurt,.5);last=performance.now();}
function toast(text,seconds=2.7){$('toast').textContent=text;$('toast').hidden=false;toastUntil=f.time+seconds;}
function showChoices(){
 setMode('upgrade');$('upgradeLevel').textContent=`LEVEL ${String(f.level).padStart(2,'0')}`;$('choices').replaceChildren();
 f.choices.forEach((key,index)=>{
  const u=UPGRADES[key],rank=f.skills[key],capped=rank>=u.max,button=document.createElement('button');button.className='choice';button.style.setProperty('--choice-color',u.color);
  const name=capped?'緊急補給':u.name,text=capped?'体力を35修復':u.text,evo=key==='power'||key==='tempo'?'nova':u.evo;
  let hint='';if(evo&&!f.evolutions[evo]){const can=evolutionReady(f,evo);hint=`<div class="evo-hint${can?' ready':''}">${can?'進化準備完了 / 補給箱を回収':`進化：${EVOLUTIONS[evo].hint}`}</div>`;}
  button.innerHTML=`<span class="choice-number">0${index+1}</span><span class="choice-icon">${u.icon}</span><span class="choice-sub">${u.sub}</span><span class="choice-type">${u.type==='weapon'?'兵装':'支援'}</span><h3>${name}</h3><p>${text}</p><span class="choice-level">${capped?'FIELD REPAIR':rank?`LV. ${rank} → ${rank+1}`:'NEW SYSTEM'} ↗</span>${hint}`;
  button.setAttribute('aria-label',`${index+1} ${name} ${text}`);button.onclick=()=>choose(key);$('choices').append(button);
 });
 $('reroll').textContent=`再抽選 ×${f.rerolls}`;$('reroll').disabled=f.rerolls<=0;$('choices').querySelector('button')?.focus({preventScroll:true});
}
function showLoot(){
 setMode('loot');const loot=f.loot;if(!loot)return;const u=loot.kind==='evolution'?EVOLUTIONS[loot.id]:UPGRADES[loot.id];
 $('lootEyebrow').textContent=loot.kind==='evolution'?'EVOLUTION / LIMIT BREAK':'SUPPLY / FIELD UPGRADE';$('lootIcon').textContent=u.icon;$('lootTitle').textContent=loot.name;$('lootDescription').textContent=loot.text;$('lootContinue').focus({preventScroll:true});
}
function syncFlow(refresh=false){
 if(f.status==='dead'||f.status==='won'){finish();return;}
 if(f.status==='upgrade'){if(mode!=='upgrade'||refresh)showChoices();}
 else if(f.status==='loot'){if(mode!=='loot'||refresh)showLoot();}
 else if(mode==='upgrade'||mode==='loot')setMode('playing');
}
function choose(key){if(mode!=='upgrade'||!f.choose(key))return;f.p.hurt=Math.max(f.p.hurt,.65);handleEvents();syncFlow(true);updateHUD();last=performance.now();}
function reroll(){if(mode!=='upgrade'||!f.reroll())return;handleEvents();showChoices();}
function goalCard(o,r){const value=r[o.field],q=Math.min(1,value/o.goal),done=value>=o.goal;const n=o.field==='bestTime'?`${clock(value)} / ${clock(o.goal)}`:`${Math.min(value,o.goal)} / ${o.goal}`;return `<div class="objective${done?' complete':''}"><b>${done?'✓ ':''}${o.name}</b><p>${o.text}</p><div class="goal-track"><div style="width:${q*100}%"></div></div><div class="objective-foot"><span>${n}</span><span>+${o.reward} PARTS</span></div></div>`;}
function nextObjective(){return OBJECTIVES.filter(o=>!record.claimed.includes(o.id)).sort((a,b)=>record[b.field]/b.goal-record[a.field]/a.goal)[0];}
function finish(){
 if(ended)return;ended=true;sound.play(f.status);const transaction=settleRun(record,f);persist(transaction.record);setMode('result');const won=f.status==='won';
 $('resultEyebrow').textContent=won?'ECLIPSE DESTROYED / RETURN TO BASE':'RECOVER / REBUILD / RETURN';$('resultTitle').textContent=won?'夜を越えた、その翼。':'再起動は、ここから。';
 $('resultTime').textContent=clock(f.time);$('resultKills').textContent=f.kills;$('resultLevel').textContent=f.level;
 const advice=f.lastDamage.includes('砲撃')?'予告線の後に高度を変えるか、シールドで防御を。':f.lastDamage.includes('接触')?'短い噴射で間合いを作り、衛星や装甲を重ねよう。':'回収したパーツで恒久強化。別の機体と進化構成も試せます。';
 $('resultCause').textContent=won?'星喰いを撃破。侵攻Ⅱで次の限界へ。':`${f.lastDamage||'機体損失'} / ${advice}`;
 $('resultBuild').textContent=weaponKeys.filter(k=>k==='star'||f.skills[k]).map(k=>{const id=evolutionFor(k);return f.evolutions[id]?`${EVOLUTIONS[id].icon} ${EVOLUTIONS[id].name}`:`${weaponIcons[k]} LV.${k==='star'?1+f.skills.power:f.skills[k]}`;}).join('　');
 const rows=Object.entries(f.damageStats).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]).slice(0,3),total=Object.values(f.damageStats).reduce((s,n)=>s+n,0)||1;
 $('damageSummary').innerHTML=rows.map(([key,n])=>`<div class="damage-row"><span>${weaponName(key)}</span><span>${Math.round(n/total*100)}% / ${Math.round(n).toLocaleString()} DMG</span></div>`).join('');
 $('resultReward').textContent=`+${transaction.reward+transaction.bonus}`;$('resultWallet').textContent=`所持 ${record.credits}`;
 $('resultUnlocks').textContent=transaction.unlocks.length?`NEW / ${transaction.unlocks.map(k=>k==='heat'?'深層侵攻':CHASSIS[k].name).join('・')} 解放`:(transaction.bonus?`達成ボーナス +${transaction.bonus} PARTS`:'強化パーツは次の出撃にも引き継ぎます');
 const goal=nextObjective();$('nextGoal').innerHTML=goal?`<b>NEXT / ${goal.name}</b>${goal.text}　${Math.min(record[goal.field],goal.goal)} / ${goal.goal}`:'<b>全機体を解放済み</b>侵攻Ⅱと新しい兵装進化で、さらに深い宙域へ。';
 $('retry').focus({preventScroll:true});
}
function openHangar(){hangarBack=mode==='result'?'result':'title';setMode('hangar');refreshPreview();renderHangar();$('hangarClose').focus({preventScroll:true});}
function closeHangar(){if(hangarBack==='result'){setMode('result');$('resultHangar').focus({preventScroll:true});}else home();}
function renderHangar(notice=''){
 $('hangarCredits').textContent=record.credits;$('chassisList').replaceChildren();
 for(const [key,u]of Object.entries(CHASSIS)){
  const unlocked=chassisUnlocked(record,key),selected=record.selected===key,button=document.createElement('button');button.className=`chassis-card${selected?' selected':''}`;button.disabled=!unlocked;button.style.setProperty('--craft-color',u.color);button.setAttribute('aria-pressed',String(selected));button.setAttribute('aria-label',`${u.name} ${u.ja}${unlocked?' を選択':' 未解放'}`);
  const progress=key==='bastion'?`累計撃破 ${Math.min(60,record.totalKills)} / 60`:key==='wraith'?`生存 ${clock(Math.min(90,record.bestTime))} / 01:30`:'初期解放';
  button.innerHTML=`<canvas class="mech-thumb" width="280" height="170" aria-hidden="true"></canvas><h3>${u.name}</h3><div class="chassis-tag">${u.tag}</div><div class="chassis-stats">HP ${u.hp+record.meta.hull*8} / 初期 ${UPGRADES[u.weapon].name}</div><div class="chassis-lock${unlocked?' unlocked':''}">${selected?'✓ 選択中':unlocked?'搭乗可能':progress}</div>`;
  button.onclick=()=>{persist(selectChassis(record,key));refreshPreview();renderHangar(`${u.name}を選択しました`);};$('chassisList').append(button);painter.thumbnail(button.querySelector('canvas'),key);
 }
 $('heatOne').setAttribute('aria-pressed',String(record.heat===1));$('heatTwo').setAttribute('aria-pressed',String(record.heat===2));$('heatTwo').disabled=!record.wins;$('heatLock').textContent=record.wins?'':'星喰い撃破で侵攻Ⅱを解放';
 $('workshop').replaceChildren();for(const [key,u]of Object.entries(META)){
  const rank=record.meta[key],cost=metaCost(key,rank),maxed=rank>=u.max,el=document.createElement('div');el.className='meta-card';
  el.innerHTML=`<span class="meta-icon">${u.icon}</span><div><h3>${u.name}</h3><p>${u.text}</p><div class="meta-rank">${'▰'.repeat(rank)}${'▱'.repeat(u.max-rank)} ${rank}/${u.max}</div></div>`;
  const button=document.createElement('button');button.textContent=maxed?'MAX':cost;button.disabled=maxed||record.credits<cost;button.setAttribute('aria-label',maxed?`${u.name} 最大強化`:`${u.name}を強化 ${cost}パーツ`);button.onclick=()=>{const next=purchaseUpgrade(record,key);if(next.ok){persist(next.record);refreshPreview();renderHangar(`${u.name}を強化 / LV.${record.meta[key]}`);sound.play('upgrade');}};el.append(button);$('workshop').append(el);
 }
 $('refund').disabled=metaSpent(record.meta)<=0;$('objectives').innerHTML=OBJECTIVES.map(o=>goalCard(o,record)).join('');
 $('evoRecipes').innerHTML=Object.values(EVOLUTIONS).map(e=>`<div class="evo-recipe" style="--recipe-color:${e.color}"><h3>${e.icon} ${e.name}</h3><p>${e.hint}<br>＋ 補給箱を回収</p></div>`).join('');
 $('deploySummary').textContent=`${CHASSIS[record.selected].name} / 侵攻${record.heat===2?'Ⅱ':'Ⅰ'}`;$('hangarNotice').textContent=notice;$('saveWarning').hidden=!saveFailed;$('saveWarning').textContent='この環境では進行を保存できません。再読み込みすると今回の強化が失われます。';
}
function handleEvents(){
 for(const e of f.events.splice(0)){
  if(e.type==='end'){finish();return;}sound.play(e.type);
  if(e.type==='boss')toast('THE ECLIPSE / 星喰い、来襲',3.6);
  else if(e.type==='bossphase')toast(e.phase===2?'星喰い / 全砲門解放':'星喰い / 反撃フェーズ',2.3);
  else if(e.type==='eliteIncoming')toast('敵重装母艦 / 補給箱を狙え',2.7);
  else if(e.type==='phase')toast(['','迎撃網が拡大 / 機影増加','重武装宙域 / 敵群接近','最終防衛線 / 火力を集中'][e.phase],2.6);
  else if(e.type==='heal')toast(`機体を修復 / +${e.amount} HP`,1.5);
  else if(e.type==='revive')toast('REBOOT / コア再起動',2.6);
  else if(e.type==='upgrade')toast(`${UPGRADES[e.key].name} / LV.${f.skills[e.key]}`,1.6);
 }
 syncFlow();
}
function updateHUD(){
 $('sky').dataset.worldY=f.p.y.toFixed(1);$('sky').dataset.velocity=f.p.vy.toFixed(1);$('sky').dataset.cameraY=f.camera.y.toFixed(1);$('sky').dataset.frameMs=rawFrame.toFixed(1);$('sky').dataset.renderMs=renderCost.toFixed(1);
 $('hpText').textContent=`${Math.ceil(f.p.hp)} / ${f.p.maxHP}`;$('hpFill').style.width=`${f.p.hp/f.p.maxHP*100}%`;$('level').textContent=`LV. ${f.level}`;$('kills').textContent=f.kills;$('xpFill').style.width=`${clamp(f.xp/f.xpNeed*100,0,100)}%`;
 $('timer').textContent=f.bossSpawned?clock(f.time):clock(Math.max(0,150-f.time));$('phase').textContent=f.bossSpawned?'星喰いを倒せ':`侵攻${f.heat===2?'Ⅱ':'Ⅰ'} / 星喰い到来まで`;
 $('altitude').textContent=`${f.p.y<=0?'+':'−'}${Math.abs(Math.round(f.p.y))} m`;$('bossHUD').hidden=!f.bossSpawned||!f.boss||f.boss.hp<=0;if(f.boss)$('bossFill').style.width=`${Math.max(0,f.boss.hp/f.boss.maxHP*100)}%`;
 if(f.time>10)$('flightTip').style.opacity='0';if(f.time>toastUntil)$('toast').hidden=true;
 const key=JSON.stringify([f.skills,f.evolutions,f.rerolls]);if(key!==armoryKey){armoryKey=key;$('armory').innerHTML=weaponKeys.map(k=>{const rank=k==='star'?1+f.skills.power:f.skills[k],id=evolutionFor(k),evolved=f.evolutions[id];return `<span class="weapon-slot${!rank?' empty':''}${evolved?' evolved':''}" title="${evolved?EVOLUTIONS[id].name:weaponName(k)}">${evolved?EVOLUTIONS[id].icon:weaponIcons[k]}<b>${evolved?'EX':rank||'−'}</b></span>`;}).join('');$('buildInfo').textContent=`威力 ${Math.round(f.power*100)}% / 装甲 ${f.skills.armor*2+f.meta.armor} / 再抽選 ${f.rerolls}`;}
}
function beginInput(source){if(mode!=='playing')return;sound.unlock();held.add(source);f.flap();repeatTimer=.23;$('rise').classList.add('held');}
function endInput(source){held.delete(source);if(!held.size)$('rise').classList.remove('held');}
window.addEventListener('pointerdown',e=>{if(mode!=='playing'||e.button!==0)return;if(e.target.closest('button,a')&&!e.target.closest('#rise'))return;e.preventDefault();beginInput(`p${e.pointerId}`);},{passive:false});
window.addEventListener('pointerup',e=>endInput(`p${e.pointerId}`));window.addEventListener('pointercancel',e=>endInput(`p${e.pointerId}`));window.addEventListener('blur',()=>{clearInput();pause();});
window.addEventListener('keydown',e=>{
 if(['Space','ArrowUp','KeyW'].includes(e.code)){if(e.code==='Space'&&!['title','playing'].includes(mode))return;e.preventDefault();if(e.repeat)return;if(mode==='title'){if(start())beginInput(e.code);}else if(mode==='playing')beginInput(e.code);}
 else if(e.code==='Escape'||e.code==='KeyP'){e.preventDefault();if(mode==='playing')pause();else if(mode==='paused')resume();else if(mode==='guide')home();else if(mode==='hangar')closeHangar();}
 else if(mode==='upgrade'&&['Digit1','Digit2','Digit3'].includes(e.code)){e.preventDefault();const key=f.choices[Number(e.code.slice(-1))-1];if(key)choose(key);}
 else if(mode==='upgrade'&&e.code==='KeyR'){e.preventDefault();reroll();}
});
window.addEventListener('keyup',e=>{if(['Space','ArrowUp','KeyW'].includes(e.code)){e.preventDefault();endInput(e.code);}});document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();pause();}});
$('start').onclick=()=>start();$('retry').onclick=()=>start();$('deploy').onclick=()=>start();$('resultHome').onclick=home;$('pause').onclick=pause;$('resume').onclick=resume;
$('quit').onclick=()=>{if(mode!=='paused')return;f.lastDamage='自主撤退';f.status='dead';finish();};$('howto').onclick=()=>{setMode('guide');$('guideClose').focus({preventScroll:true});};$('guideClose').onclick=home;
$('hangar').onclick=openHangar;$('resultHangar').onclick=openHangar;$('hangarClose').onclick=closeHangar;$('reroll').onclick=reroll;
$('lootContinue').onclick=()=>{if(f.resumeLoot()){handleEvents();syncFlow(true);updateHUD();last=performance.now();}};
$('heatOne').onclick=()=>{persist({...record,heat:1});refreshPreview();renderHangar();};$('heatTwo').onclick=()=>{if(record.wins){persist({...record,heat:2});refreshPreview();renderHangar();}};
$('refund').onclick=()=>{const result=refundUpgrades(record);persist(result.record);refreshPreview();renderHangar(`強化を初期化 / ${result.refund}パーツを返還しました`);};
for(const b of document.querySelectorAll('.sound-toggle'))b.onclick=()=>{record.sound=sound.toggle();persist(record);syncSound();};
function frame(now){
 rawFrame=now-last;const elapsed=Math.min(.075,Math.max(0,rawFrame/1000));last=now;visualTime+=painter.reduce&&mode!=='playing'?0:elapsed;
 if(mode==='playing'){accumulator+=elapsed;for(let step=0;accumulator>=STEP&&mode==='playing'&&step<10;step++){if(held.size){repeatTimer-=STEP;if(repeatTimer<=0){f.flap();repeatTimer=.23;}}f.tick(STEP);accumulator-=STEP;handleEvents();}hudTime+=elapsed;if(hudTime>.09){updateHUD();hudTime=0;}}
 else if(['title','hangar','guide'].includes(mode)){preview.camera.x+=elapsed*(painter.reduce?0:8);preview.camera.y=-painter.h/2+Math.sin(visualTime*.1)*35;}
 const menu=['title','hangar','guide'].includes(mode),startDraw=performance.now();painter.draw(menu?preview:f,mode==='hangar'?'title':mode,visualTime);renderCost=performance.now()-startDraw;requestAnimationFrame(frame);
}
updateTitle();syncSound();requestAnimationFrame(frame);
painter.loadAssets().then(()=>{ready=true;$('assetStatus').hidden=true;$('start').disabled=false;$('deploy').disabled=false;if(mode==='hangar')renderHangar();}).catch(error=>{console.warn('機体素材を読み込めませんでした',error);ready=true;$('assetStatus').textContent='機体画像を読み込めませんでした。再読み込みしてください。';$('start').disabled=false;$('deploy').disabled=false;});
if('serviceWorker'in navigator&&!['localhost','terminal.local','127.0.0.1'].includes(location.hostname))navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).catch(()=>{});
