import {GameModel,ROOMS,FLOOR,UPGRADES,LORE,ENEMY_INFO} from './model.mjs?v=2.1.0';
import {Renderer} from './render.mjs?v=2.1.0';
import {Soundscape} from './audio.mjs?v=2.1.0';
import {SaveStore,JourneySession,packSave,unpackSave} from './storage.mjs?v=2.1.0';
const $=id=>document.getElementById(id),show=(id,on=true)=>$(id).classList.toggle('hidden',!on);
let storage;try{storage=localStorage;}catch{}const saves=new SaveStore(storage),session=new JourneySession(saves);let stored=saves.load(),settings=saves.readSettings();
if(matchMedia('(prefers-reduced-motion: reduce)').matches)settings.reducedMotion=true;
const audio=new Soundscape();let model=new GameModel(null,settings),renderer,mode='title',returnMode='title',helpReturn='title',journalReturn='pause',journalTab='lore',toastTimeout,bannerTimeout,saveTimeout,acc=0,last=0,hudTimer=0,slowFrames=0,gamepadPrev={},tutorialDismissed=false,tutorialStep=-1,pendingImport=null;
const panels=['title','pause','help','map','death','victory','shrine','settings','journal','discovery','newGameConfirm','importConfirm'];
const keys={},pulses={},pointers=new Map();let padInput={};
function clearInputs(){for(const k of Object.keys(keys))delete keys[k];for(const k of Object.keys(pulses))delete pulses[k];pointers.clear();padInput={};document.querySelectorAll('[data-action]').forEach(b=>b.classList.remove('held'));if(model)model.prev={};}
function input(){const out={...keys,...pulses};for(const [k,v] of Object.entries(padInput))if(v)out[k]=true;for(const action of pointers.values())out[action]=true;return out;}
function notify(text){show('tutorial',false);show('roomBanner',false);$('toast').textContent=text;$('toast').classList.add('visible');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('toast').classList.remove('visible'),3200);}
function save(){const result=session.save();if(!result)return;stored=result.data;if(result.ok){$('saveIndicator').textContent='✧ 保存しました';$('saveIndicator').classList.add('visible');clearTimeout(saveTimeout);saveTimeout=setTimeout(()=>$('saveIndicator').classList.remove('visible'),2000);}else notify('保存できません。設定からセーブを書き出せます');}
function setMode(next){
 const old=mode;mode=next;if(next==='title')session.stop();clearInputs();acc=0;for(const id of panels)if($(id))show(id,id===next);
 const titleRelated=next==='title'||next==='newGameConfirm'||next==='importConfirm'||['help','settings'].includes(next)&&returnMode==='title';
 show('hud',!titleRelated);show('objective',next==='play');show('touch',next==='play');show('tutorial',false);show('roomBanner',false);show('bossHUD',next==='play'&&model.bossActive);audio.paused=next!=='play';
 if(next==='title'){show('continue',!!stored);$('start').textContent=stored?'はじめから':'聖堂へ入る →';$('continueInfo').textContent=stored?`${ROOMS[stored.room].name} · Lv.${stored.level} · 月印 ${stored.seals.length}/2`:'';}
 if(next==='pause')$('saveStatus').textContent=saves.ok?'進行は保存済み。燭台から旅を再開できます。':'保存できません。設定からセーブを書き出してください。';
 if(next!=='play'&&next!=='title'&&old!==next)requestAnimationFrame(()=>$(next)?.querySelector('button:not([disabled]),select')?.focus({preventScroll:true}));
 updateHUD();
}
function banner(room){$('bannerEnglish').textContent=room.en;$('bannerName').textContent=room.name;show('roomBanner',false);requestAnimationFrame(()=>{if(mode==='play')show('roomBanner');});clearTimeout(bannerTimeout);bannerTimeout=setTimeout(()=>show('roomBanner',false),3000);}
function applySettings(){
 model.options={...settings};audio.setMix(settings.music,settings.effects);renderer?.setOptions(settings);
 document.documentElement.style.setProperty('--control-scale',settings.touchScale);document.documentElement.style.setProperty('--control-opacity',settings.touchOpacity);
 document.body.classList.toggle('left-handed',settings.leftHanded);document.body.classList.toggle('high-contrast',settings.contrast);document.body.classList.toggle('low-motion',settings.reducedMotion);
}
async function begin(resume){
 await audio.start().catch(()=>{});model=new GameModel(resume?stored:null,settings);session.start(model);renderer.lastRoom=-1;tutorialDismissed=!!resume;tutorialStep=-1;setMode('play');handleEvents();save();updateHUD();
}
function discovery(title,text,eyebrow='RELIC DISCOVERED',icon='◇'){$('discoveryTitle').textContent=title;$('discoveryText').textContent=text;$('discoveryEyebrow').textContent=eyebrow;$('discoveryIcon').textContent=icon;setMode('discovery');}
function handleEvents(){
 for(const e of model.drain())switch(e.type){
  case'room':banner(e.room);audio.room=e.room.id;audio.boss=false;break;
  case'save':save();break;case'toast':notify(e.text);break;case'sound':audio.play(e.name);break;
  case'shake':renderer.shake=Math.max(renderer.shake,e.amount);break;
  case'dead':setMode('death');break;
  case'shrine':setMode('shrine');renderShrine();break;
  case'discovery':discovery(e.title,e.text,'RELIC DISCOVERED',e.icon==='relic'?'∞':'◇');break;
  case'lore':{const l=LORE[e.id];discovery(l.title,l.text,'MEMORY '+l.chapter,'✧');break;}
  case'victory':save();$('resultStats').textContent=`探索 ${Math.floor(model.progress.time/60)}分 · 討伐 ${model.progress.kills}体 · 発見率 ${model.completion}%`;setMode('victory');audio.play('rest');break;
 }
}
function updateHUD(){
 const p=model.player,r=model.room,pr=model.progress;$('hpbar').style.width=(p.hp/model.maxHp*100)+'%';$('hptext').textContent=Math.ceil(p.hp)+' / '+model.maxHp;$('mpbar').style.width=(p.mp/model.maxMp*100)+'%';$('mpbar').parentElement.setAttribute('aria-label',`魔力 ${Math.floor(p.mp)} / ${model.maxMp}`);$('xpbar').style.width=Math.min(100,pr.xp/(pr.level*75)*100)+'%';$('potions').textContent=p.potions;$('heal').disabled=p.potions===0||mode!=='play';$('seals').textContent=(pr.seals.includes('tide')?'◆':'◇')+' '+(pr.seals.includes('bell')?'◆':'◇');$('gold').textContent='✦ '+pr.gold;$('level').textContent='Lv. '+pr.level;$('areaEnglish').textContent=r.en;$('areaName').textContent=r.name;
 $('objective').textContent=pr.bossDefeated?'夜明けの聖堂 — 残された記憶を探そう':r.id===4?(model.bossActive?'赤い予兆を見て回避。月炎は跳躍で越えよう。':'燭台で旅の準備を整え、聖域の奥へ'):r.id===2&&!pr.seals.includes('tide')?'書庫の高所へ — 潮の守り人を倒す':r.id===3&&!pr.seals.includes('bell')?'鐘楼を昇る — 鐘の守り人を倒す':pr.seals.length<2?'書庫と鐘楼の守り人を倒す　'+pr.seals.length+' / 2':'紅の礼拝堂の奥へ — 封印扉が開いた';
 $('mapDot').setAttribute('cx',[15,55,55,55,105][r.id]);$('mapDot').setAttribute('cy',[26,26,44,8,26][r.id]);show('interact',!!model.activeInteract&&mode==='play');if(model.activeInteract)$('interact').querySelector('span').textContent=model.activeInteract.label;
 const boss=model.enemies.find(e=>e.type==='boss'&&e.hp>0);show('bossHUD',!!boss&&model.bossActive&&mode==='play');if(boss){$('bossbar').style.width=Math.max(0,boss.hp/boss.maxHp*100)+'%';$('bossPhase').textContent=model.bossPhase===2?'II · THE MOON WILL NOT SET':'I · VESPER, THE HOLLOW SAINT';}audio.boss=model.bossActive;
 const magic=document.querySelector('[data-action="magic"]'),dash=document.querySelector('[data-action="dash"]');magic.dataset.cooling=p.mp<25;magic.querySelector('small').textContent=p.mp<25?'MP不足':'魔法';dash.dataset.cooling=p.dashCd>0;dash.querySelector('small').textContent=p.dashCd>0?(Math.ceil(p.dashCd*10)/10).toFixed(1):'回避';document.querySelector('[data-action="down"]').disabled=!p.grounded||p.y>=FLOOR;
 $('game').setAttribute('aria-label',`${r.name}。体力 ${Math.ceil(p.hp)}。魔力 ${Math.floor(p.mp)}。月印 ${pr.seals.length}。ソウル ${pr.gold}。位置 ${Math.round(p.x)}, ${Math.round(p.y)}。${mode==='play'?'探索中':mode}`);
 if(mode==='play'&&!tutorialDismissed&&r.id===0){const step=p.x<420?0:p.x<650?1:p.x<950?2:3;if(step!==tutorialStep){tutorialStep=step;$('tutorialText').textContent=['左右で移動。青い燭台で ↑ を押すと、保存・強化できます。','跳躍をもう一度押すと二段ジャンプ。高い足場を目指そう。','攻撃は長押しで三連撃。赤い予兆を見たら回避。','燭台を壊すとソウル。使い道は青い燭台の「強化」。'][step];}show('tutorial',model.progress.time<55&&!$('toast').classList.contains('visible')&&$('roomBanner').classList.contains('hidden'));}else show('tutorial',false);
}
function renderRouteMap(){
 const svg=$('routeMap'),r=model.room,p=model.player;svg.replaceChildren();$('routeName').textContent=r.name+' — 現在の領域';
 svg.setAttribute('aria-label',r.name+'。現在地、足場、燭台、扉と未収集の品を表示');
 const node=(tag,attrs,text)=>{const el=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v]of Object.entries(attrs))el.setAttribute(k,v);if(text!==undefined)el.textContent=text;svg.append(el);return el;};
 const sx=x=>36+x/r.width*648,sy=y=>40+(y-160)/(FLOOR-160)*122;
 node('rect',{x:1,y:1,width:718,height:208,rx:8,fill:'#0c1421',stroke:'#52627c66'});
 node('path',{d:`M36 ${sy(FLOOR)}H684`,stroke:'#8f9cb3','stroke-width':5});
 for(const pl of r.platforms)node('path',{d:`M${sx(pl.x)} ${sy(pl.y)}h${pl.w/r.width*648}`,stroke:'#aec0d9','stroke-width':5,'stroke-linecap':'round'});
 if(r.shrine!==null){node('circle',{cx:sx(r.shrine),cy:sy(FLOOR)-13,r:8,fill:'#75cedf'});node('text',{x:sx(r.shrine),y:sy(FLOOR)+28,fill:'#abdce4','text-anchor':'middle','font-size':19},'燭台');}
 for(const door of r.portals){node('path',{d:`M${sx(door.x)-7} ${sy(door.y)-3}v-20h14v20`,fill:'none',stroke:'#c2a980','stroke-width':3});node('text',{x:sx(door.x),y:sy(door.y)-31,fill:'#d6c7a7','text-anchor':'middle','font-size':18},door.label.replace('へ戻る','').replace('へ',''));}
 for(const item of model.items){if(item.taken||item.type==='health')continue;const x=sx(item.x),y=sy(item.y);node('text',{x,y:y+5,fill:item.type==='seal'?'#edbbd1':'#c9c8b3','text-anchor':'middle','font-size':25},item.type==='seal'?'◇':item.type==='relic'?'∞':'□');}
 if(model.bossActive){const x=sx(700);node('path',{d:`M${x} ${sy(FLOOR)}v-58`,stroke:'#dfabc9','stroke-width':4});node('text',{x,y:sy(FLOOR)-69,fill:'#dfabc9','text-anchor':'middle','font-size':18},'封鎖');}
 if(r.left!==null)node('text',{x:19,y:sy(FLOOR)+5,fill:'#c9b384','text-anchor':'middle','font-size':27},'‹');
 if(r.right!==null)node('text',{x:702,y:sy(FLOOR)+5,fill:model.sealed&&r.right===4?'#d9a4be':'#c9b384','text-anchor':'middle','font-size':27},r.right===4&&model.sealed?'✧':'›');
 const x=sx(p.x),y=sy(p.y);node('path',{d:`M${x} ${y-14}l8 8-8 8-8-8Z`,fill:'#ffe0a0',stroke:'#181b27','stroke-width':2});
}
function mapOpen(){setMode('map');renderRouteMap();$('mapRooms').replaceChildren();for(const r of ROOMS){const cell=document.createElement('div'),visited=model.progress.visited.includes(r.id);cell.className='map-cell '+(visited?'visited ':'')+(r.id===model.room.id?'current':'');cell.style.gridColumn=[1,2,2,2,3][r.id];cell.style.gridRow=[2,2,3,1,2][r.id];cell.textContent=(r.id===model.room.id?'◆ ':'')+(visited?r.name:'未踏の領域');const small=document.createElement('small');small.textContent=r.id===2?(model.progress.seals.includes('tide')?'潮の月印 ✓':'◇ 潮の月印'):r.id===3?(model.progress.seals.includes('bell')?'鐘の月印 ✓':'◇ 鐘の月印'):r.id===4?(model.progress.bossDefeated?'夜明け':model.sealed?'✧ 二つの月印が必要':'封印解除'):model.progress.shrines.includes(r.id)?'燭台 点灯済み':'祈りの燭台';cell.append(small);$('mapRooms').append(cell);}$('mapProgress').textContent=`発見率 ${model.completion}%　手記 ${model.progress.lore.length}/5　宝箱 ${model.progress.chests.length}/2`;$('mapLegend').textContent='◆ 現在地　◇ 月印　✧ 封印扉　｜　転移は青い燭台から';}
function renderShrine(){
 $('shrineGold').textContent='✦ '+model.progress.gold;$('upgrades').replaceChildren();$('travelRooms').replaceChildren();
 for(const [key,def] of Object.entries(UPGRADES)){const level=model.progress.upgrades[key],maxed=level>=def.max,cost=def.cost[level];const b=document.createElement('button');b.className='upgrade-card';b.disabled=maxed||model.progress.gold<cost;b.setAttribute('aria-label',`${def.name} ${maxed?'最大強化':cost+'ソウルで強化'}`);b.innerHTML=`<span class="upgrade-icon">${def.icon}</span><span class="upgrade-copy"><b>${def.name}</b><small>${def.desc}</small><span class="upgrade-level">${'◆'.repeat(level)}${'◇'.repeat(def.max-level)}</span></span><span class="upgrade-price">${maxed?'MAX':'✦ '+cost}</span>`;b.onclick=()=>{if(model.purchase(key)){handleEvents();renderShrine();updateHUD();}};$('upgrades').append(b);}
 for(const r of ROOMS){const b=document.createElement('button'),unlocked=model.progress.shrines.includes(r.id);b.className='travel-card'+(r.id===model.room.id?' current':'');b.disabled=!unlocked||r.id===model.room.id;b.innerHTML=`<b>${unlocked?r.name:'未点灯の燭台'}</b><small>${r.id===model.room.id?'現在地':unlocked?'転移 →':'◇'}</small>`;b.onclick=()=>{if(model.travel(r.id)){setMode('play');handleEvents();}};$('travelRooms').append(b);}
}
function journalOpen(from='pause',tab='lore'){journalReturn=from;journalTab=tab;setMode('journal');renderJournal();}
function renderJournal(){
 $('loreTab').classList.toggle('selected',journalTab==='lore');$('bestiaryTab').classList.toggle('selected',journalTab==='bestiary');$('journalEntries').replaceChildren();
 const entries=journalTab==='lore'?Object.entries(LORE):Object.entries(ENEMY_INFO);
 for(const [id,entry] of entries){const known=(journalTab==='lore'?model.progress.lore:model.progress.bestiary).includes(id),el=document.createElement('article');el.className='journal-entry'+(known?'':' locked');const h=document.createElement('h3'),p=document.createElement('p');h.textContent=known?(entry.title||entry.name):journalTab==='lore'?'未発見の手記':'未記録の魔物';p.textContent=known?(entry.text||entry.tip):journalTab==='lore'?'聖堂に残された頁を探そう。':'倒した魔物の特徴が記録されます。';el.append(h,p);$('journalEntries').append(el);}
}
function openSettings(from){returnMode=from;setMode('settings');$('settingDifficulty').value=settings.difficulty;$('settingQuality').value=settings.quality;for(const [id,key] of [['Music','music'],['Effects','effects'],['Scale','touchScale'],['Opacity','touchOpacity']])$('setting'+id).value=Math.round(settings[key]*100);for(const [id,key] of [['Shake','shake'],['Motion','reducedMotion'],['Contrast','contrast'],['Handed','leftHanded']])$('setting'+id).checked=settings[key];settingsLabels();$('exportSave').disabled=!stored&&from==='title';$('restoreBackup').disabled=!saves.readBackup();$('settingsStatus').textContent='設定は自動保存されます。進行はこのブラウザーに保存されます。';}
function settingsLabels(){for(const [id,key] of [['music','music'],['effects','effects'],['scale','touchScale'],['opacity','touchOpacity']])$(id+'Value').textContent=Math.round(settings[key]*100)+'%';}
for(const [id,key] of [['Music','music'],['Effects','effects'],['Scale','touchScale'],['Opacity','touchOpacity']])$('setting'+id).oninput=e=>{settings[key]=Number(e.target.value)/100;settingsLabels();applySettings();saves.writeSettings(settings);if(key==='effects')audio.play('page');};
for(const [id,key] of [['Shake','shake'],['Motion','reducedMotion'],['Contrast','contrast'],['Handed','leftHanded']])$('setting'+id).onchange=e=>{settings[key]=e.target.checked;applySettings();saves.writeSettings(settings);};
for(const [id,key] of [['Difficulty','difficulty'],['Quality','quality']])$('setting'+id).onchange=e=>{settings[key]=e.target.value;applySettings();saves.writeSettings(settings);};
function confirmPanel(id,title,description,positive,cancel,onConfirm,onCancel){const panel=document.createElement('section');panel.id=id;panel.className='panel hidden';panel.innerHTML=`<div class="modal"><h2>${title}</h2><p>${description}</p>${id==='importConfirm'?'<p id="importSummary" class="muted"></p>':''}<button class="primary" data-confirm>${positive}</button><button class="secondary" data-cancel>${cancel}</button></div>`;$('app').append(panel);panel.querySelector('[data-confirm]').onclick=onConfirm;panel.querySelector('[data-cancel]').onclick=onCancel;}
confirmPanel('newGameConfirm','新しい旅を始める','現在の進行は新しい旅で上書きされます。必要なら設定からセーブを書き出してください。','はじめから遊ぶ','今の旅を残す',()=>begin(false),()=>setMode('title'));
confirmPanel('importConfirm','旅の記録を読み込む','現在の進行を、選んだセーブデータで置き換えます。','この記録で続ける','戻る',()=>{stored=pendingImport;const persisted=saves.save(stored);model=new GameModel(stored,settings);renderer.lastRoom=-1;pendingImport=null;setMode('title');notify(persisted?'旅の記録を読み込みました':'記録を読み込みましたが、端末への保存はできません');},()=>{pendingImport=null;openSettings(returnMode);});
$('exportSave').onclick=()=>{const data=returnMode==='title'?stored:model.saveData();if(!data){notify('保存された旅がありません');return;}const blob=new Blob([packSave(data)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='nocturne-save.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),5000);};
function prepareImport(data){pendingImport=data;$('importSummary').textContent=`${ROOMS[data.room].name} · Lv.${data.level} · 月印 ${data.seals.length}/2 · ${data.gold}ソウル`;setMode('importConfirm');}
$('restoreBackup').onclick=()=>{const data=saves.readBackup();if(data)prepareImport(data);};
$('importSave').onclick=()=>$('saveFile').click();$('saveFile').onchange=async e=>{const file=e.target.files?.[0];e.target.value='';if(!file)return;try{if(file.size>100000)throw new Error('ファイルが大きすぎます');prepareImport(unpackSave(await file.text()));}catch(error){$('settingsStatus').textContent='読み込めませんでした：'+error.message;}};
$('start').onclick=()=>stored?setMode('newGameConfirm'):begin(false);$('continue').onclick=()=>begin(true);
$('pauseButton').onclick=()=>{save();setMode('pause');};$('resume').onclick=()=>{audio.start().catch(()=>{});setMode('play');};$('backTitle').onclick=()=>{save();setMode('title');};$('victoryTitle').onclick=()=>{save();setMode('title');};$('retry').onclick=()=>{model.retry();setMode('play');handleEvents();};$('explore').onclick=()=>{model.state='play';setMode('play');};$('heal').onclick=()=>{if(mode==='play'){model.heal();handleEvents();updateHUD();}};
$('mapButton').onclick=mapOpen;$('closeMap').onclick=()=>setMode('play');$('closeShrine').onclick=()=>setMode('play');$('closeDiscovery').onclick=()=>setMode('play');$('dismissTutorial').onclick=()=>{tutorialDismissed=true;show('tutorial',false);};
function openHelp(from){helpReturn=from;returnMode=from;setMode('help');}$('titleHelp').onclick=()=>openHelp('title');$('helpButton').onclick=()=>openHelp('pause');$('closeHelp').onclick=()=>setMode(helpReturn);
$('titleSettings').onclick=()=>openSettings('title');$('settingsButton').onclick=()=>openSettings('pause');$('closeSettings').onclick=()=>setMode(returnMode);$('journalButton').onclick=()=>journalOpen();$('closeJournal').onclick=()=>setMode(journalReturn);$('loreTab').onclick=()=>{journalTab='lore';renderJournal();};$('bestiaryTab').onclick=()=>{journalTab='bestiary';renderJournal();};
if(document.fullscreenEnabled){show('fullscreen');$('fullscreen').onclick=()=>document.documentElement.requestFullscreen().catch(()=>{});}
const keyMap={ArrowLeft:'left',KeyA:'left',ArrowRight:'right',KeyD:'right',Space:'jump',KeyZ:'jump',KeyJ:'attack',KeyX:'attack',KeyK:'dash',ShiftLeft:'dash',ShiftRight:'dash',KeyL:'magic',KeyC:'magic',ArrowUp:'interact',KeyW:'interact',KeyE:'interact',KeyH:'heal',ArrowDown:'down',KeyS:'down'};
function escape(){if(mode==='play'){save();setMode('pause');}else if(['pause','map','shrine','discovery'].includes(mode))setMode('play');else if(mode==='help')setMode(helpReturn);else if(mode==='settings')setMode(returnMode);else if(mode==='journal')setMode(journalReturn);else if(mode==='newGameConfirm')setMode('title');}
window.addEventListener('keydown',e=>{
 if(e.target instanceof HTMLInputElement||e.target instanceof HTMLSelectElement)return;
 if(e.code==='Escape'){e.preventDefault();if(!e.repeat)escape();return;}if(e.code==='KeyM'&&!e.repeat&&mode==='play'){mapOpen();return;}
 // Keep keyboard focus inside the active modal without trapping gameplay controls.
 if(e.code==='Tab'&&mode!=='play'){const focusables=[...($(mode)?.querySelectorAll('button:not([disabled]),select,input:not([type=file])')||[])].filter(el=>!el.closest('.hidden'));if(focusables.length){const index=focusables.indexOf(document.activeElement);if(e.shiftKey&&index<=0){e.preventDefault();focusables.at(-1).focus();}else if(!e.shiftKey&&index===focusables.length-1){e.preventDefault();focusables[0].focus();}}return;}
 const action=keyMap[e.code];if(action&&mode==='play'){e.preventDefault();keys[action]=true;if(!e.repeat&&!['left','right'].includes(action))pulses[action]=true;}
},{passive:false});
window.addEventListener('keyup',e=>{const action=keyMap[e.code];if(action){if(mode==='play')e.preventDefault();keys[action]=false;}},{passive:false});
function syncHeld(){for(const b of document.querySelectorAll('[data-action]'))b.classList.toggle('held',[...pointers.values()].includes(b.dataset.action));}
for(const b of document.querySelectorAll('[data-action]')){
 b.addEventListener('click',e=>{if(mode==='play'&&e.detail===0)pulses[b.dataset.action]=true;});
 b.addEventListener('pointerdown',e=>{if(mode!=='play')return;e.preventDefault();b.setPointerCapture(e.pointerId);pointers.set(e.pointerId,b.dataset.action);if(!['left','right'].includes(b.dataset.action))pulses[b.dataset.action]=true;syncHeld();audio.start().catch(()=>{});},{passive:false});
 b.addEventListener('pointermove',e=>{if(!pointers.has(e.pointerId)||!['left','right'].includes(pointers.get(e.pointerId)))return;const left=document.querySelector('[data-action="left"]').getBoundingClientRect(),right=document.querySelector('[data-action="right"]').getBoundingClientRect();if(e.clientY>Math.min(left.top,right.top)-30&&e.clientY<Math.max(left.bottom,right.bottom)+30){pointers.set(e.pointerId,e.clientX<(left.right+right.left)/2?'left':'right');syncHeld();}});
 const release=e=>{pointers.delete(e.pointerId);syncHeld();};b.addEventListener('pointerup',release);b.addEventListener('pointercancel',release);b.addEventListener('lostpointercapture',release);b.addEventListener('contextmenu',e=>e.preventDefault());
}
function gamepad(){
 let pad;try{pad=Array.from(navigator.getGamepads?.()||[]).find(p=>p?.connected);}catch{}if(!pad){padInput={};gamepadPrev={};return;}
 const button=i=>!!pad.buttons[i]?.pressed,start=button(9);if(start&&!gamepadPrev.start)escape();
 if(mode==='play'){padInput={left:pad.axes[0]<-.25||button(14),right:pad.axes[0]>.25||button(15),jump:button(0),attack:button(2),dash:button(1),magic:button(5),interact:button(3),heal:button(4),down:button(13)||pad.axes[1]>.65};}
 else{padInput={};const up=pad.axes[1]<-.5||button(12),down=pad.axes[1]>.5||button(13),accept=button(0),back=button(1);const els=[...($(mode)?.querySelectorAll('button:not([disabled]),select')||[])];if((up&&!gamepadPrev.up||down&&!gamepadPrev.down)&&els.length){let i=els.indexOf(document.activeElement);els[(i+(up?-1:1)+els.length)%els.length].focus();}if(accept&&!gamepadPrev.accept&&document.activeElement instanceof HTMLButtonElement)document.activeElement.click();if(back&&!gamepadPrev.back)escape();gamepadPrev={up,down,accept,back};}if(mode==='play'){gamepadPrev.accept=button(0);gamepadPrev.back=button(1);}gamepadPrev.start=start;
}
window.addEventListener('blur',()=>{clearInputs();if(mode==='play'){save();setMode('pause');}});document.addEventListener('visibilitychange',()=>{clearInputs();if(document.hidden&&mode==='play'){save();setMode('pause');}last=performance.now();acc=0;});window.addEventListener('pagehide',()=>{if(session.active)save();});
window.addEventListener('resize',()=>renderer?.resize());window.visualViewport?.addEventListener('resize',()=>renderer?.resize());for(const name of ['gesturestart','gesturechange','gestureend'])document.addEventListener(name,e=>e.preventDefault(),{passive:false});document.addEventListener('contextmenu',e=>{if(mode==='play')e.preventDefault();});document.addEventListener('dblclick',e=>{if(mode==='play')e.preventDefault();},{passive:false});
function frame(now){
 const dt=Math.min((now-last)/1000||0,.1);last=now;gamepad();
 if(mode==='play'){acc+=dt;let steps=0;while(acc>=1/60&&steps++<6){model.update(1/60,input());for(const k of Object.keys(pulses))delete pulses[k];acc-=1/60;handleEvents();if(mode!=='play')break;}}
 else if(mode==='title'){model.player.anim+=dt;}
 renderer.draw(model,dt,mode==='title');hudTimer+=dt;if(hudTimer>.1){updateHUD();hudTimer=0;}
 if(mode==='play'&&settings.quality==='auto'){slowFrames=dt>.027?slowFrames+1:Math.max(0,slowFrames-.5);if(slowFrames>120&&renderer.autoDpr>1.25){renderer.autoDpr=1.25;renderer.resize();slowFrames=0;}}
 requestAnimationFrame(frame);
}
async function boot(){
 const names=['cathedral','crypt','belfry','sanctum','hero','enemies','props','motion','hunters'],assets={};let completed=0;
 await Promise.all(names.map(name=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>{assets[name]=im;completed++;$('loadbar').style.width=(completed/10*100)+'%';$('loadText').textContent=`聖堂の扉を開いています… ${completed}/10`;resolve();};im.onerror=()=>reject(new Error(name+' の画像を読み込めませんでした'));im.src='./assets/'+name+'.webp';})));
 const res=await fetch('./assets/atlas.json?v=2.1.0');if(!res.ok)throw new Error('アニメーションデータを読み込めませんでした');const atlas=await res.json();renderer=new Renderer($('game'),assets,atlas);applySettings();$('loadbar').style.width='100%';show('loading',false);model.drain();setMode('title');last=performance.now();requestAnimationFrame(frame);if(saves.recovered)notify('バックアップから旅の記録を復元しました');
 if('serviceWorker'in navigator&&location.hostname!=='terminal.local')navigator.serviceWorker.register('./sw.js',{updateViaCache:'none'}).then(reg=>reg.update()).catch(()=>{});
}
boot().catch(e=>{show('loading',false);show('fatal');$('fatal').replaceChildren();const text=document.createElement('p');text.textContent='読み込みを完了できませんでした。'+e.message;const retry=document.createElement('button');retry.className='primary';retry.textContent='もう一度読み込む';retry.onclick=()=>location.reload();$('fatal').append(text,retry);});
