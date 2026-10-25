import { Flight, STEP, UPGRADES, clock, clamp } from './model.mjs?v=lumen-1.0.0';
import { Painter } from './render.mjs?v=lumen-1.0.0';
import { Sound } from './audio.mjs?v=lumen-1.0.0';
import { loadRecord, saveRecord, finishRecord } from './storage.mjs?v=lumen-1.0.0';
const $ = id => document.getElementById(id);
const painter = new Painter($('sky'));
let record = loadRecord(); const sound = new Sound(record.sound);
let renderCost = 0, rawFrame = 0;
let f = new Flight(), mode = 'title', accumulator = 0, last = performance.now(), visualTime = 0, hudTime = 0, repeatTimer = 0, toastUntil = 0, armoryKey = '', ended = false;
const held = new Set();
function clearInput() { held.clear(); $('rise').classList.remove('held'); repeatTimer = 0; }
function setMode(next) {
  mode = next; clearInput(); accumulator = 0;
  $('titleScreen').hidden = next !== 'title'; $('hud').hidden = !['playing', 'paused', 'upgrade'].includes(next);
  $('pauseScreen').hidden = next !== 'paused'; $('upgradeScreen').hidden = next !== 'upgrade'; $('resultScreen').hidden = next !== 'result'; $('guideScreen').hidden = next !== 'guide';
}
function resize() { painter.resize(innerWidth, innerHeight); f.setView(painter.w, painter.h, true); }
window.addEventListener('resize', resize); resize();
function updateBest() { $('best').textContent = record.runs ? `BEST ${clock(record.bestTime)} / ${record.bestKills} KILLS${record.wins ? ` / ${record.wins} CLEAR` : ''}` : 'FIRST FLIGHT / まだ見ぬ空へ'; }
function syncSound() { for (const button of document.querySelectorAll('.sound-toggle')) { button.setAttribute('aria-pressed', String(sound.enabled)); button.setAttribute('aria-label', sound.enabled ? 'サウンドをオフ' : 'サウンドをオン'); const txt = button.querySelector('.sound-text'); if (txt) txt.textContent = sound.enabled ? 'SOUND ON' : 'SOUND OFF'; button.style.opacity = sound.enabled ? '1' : '.65'; } }
export function start(initialFlight) { sound.unlock(); f = initialFlight instanceof Flight ? initialFlight : new Flight(); f.setView(painter.w, painter.h, true); painter.trail = []; painter.lastTrail = 0; ended = false; armoryKey = ''; $('toast').hidden = true; $('flightTip').style.opacity = '1'; setMode('playing'); f.flap(); updateHUD(); $('sky').focus?.({ preventScroll: true }); }
function home() { setMode('title'); f = new Flight(); f.setView(painter.w, painter.h, true); painter.trail = []; updateBest(); $('start').focus({ preventScroll: true }); }
function pause() { if (mode !== 'playing') return; setMode('paused'); $('resume').focus({ preventScroll: true }); }
function resume() { if (mode !== 'paused') return; setMode('playing'); f.p.hurt = Math.max(f.p.hurt, .5); last = performance.now(); }
function toast(text, seconds = 3) { $('toast').textContent = text; $('toast').hidden = false; toastUntil = f.time + seconds; }
function showChoices() {
  setMode('upgrade'); $('upgradeLevel').textContent = `LEVEL ${String(f.level).padStart(2, '0')}`;
  $('choices').replaceChildren();
  f.choices.forEach((key, index) => {
    const u = UPGRADES[key], button = document.createElement('button'); button.className = 'choice'; button.style.setProperty('--choice-color', u.color);
    button.innerHTML = `<span class="choice-number">0${index + 1}</span><span class="choice-icon">${u.icon}</span><span class="choice-sub">${u.sub}</span><h3>${u.name}</h3><p>${u.text}</p><span class="choice-level">${f.skills[key] ? `LV. ${f.skills[key]} → ${Math.min(u.max, f.skills[key] + 1)}` : 'NEW ABILITY'} <span>↗</span></span>`;
    button.setAttribute('aria-label', `${index + 1} ${u.name} ${u.text}`); button.addEventListener('click', () => choose(key)); $('choices').append(button);
  });
  $('choices').querySelector('button')?.focus({ preventScroll: true });
}
function choose(key) {
  if (mode !== 'upgrade' || !f.choose(key)) return;
  sound.play('upgrade'); f.events = []; f.p.hurt = Math.max(f.p.hurt, .7);
  if (f.status === 'upgrade') showChoices(); else { setMode('playing'); toast(`${UPGRADES[key].name} — LV. ${f.skills[key]}`, 2); }
  updateHUD(); last = performance.now();
}
function finish() {
  if (ended) return; ended = true; sound.play(f.status); record = finishRecord(record, f); saveRecord(record);
  const won = f.status === 'won'; setMode('result');
  $('resultEyebrow').textContent = won ? 'DAWN HAS A NEW NAME' : 'FLIGHT RECORDED'; $('resultTitle').textContent = won ? '夜を越えた、その翼。' : '光は、次の翼へ。';
  $('resultCopy').textContent = won ? '星喰いを撃破。あなたの光が、空を取り戻した。' : '落ちた星の数だけ、次の飛び方が見えてくる。';
  $('resultSeal').textContent = won ? '☼' : '✧'; $('resultTime').textContent = clock(f.time); $('resultKills').textContent = f.kills; $('resultLevel').textContent = f.level;
  $('resultBuild').textContent = Object.entries(f.skills).filter(([, n]) => n).map(([key, n]) => `${UPGRADES[key].icon} ${n}`).join('　'); $('retry').focus({ preventScroll: true });
}
function handleEvents() {
  const events = f.events.splice(0);
  for (const e of events) {
    if (e.type === 'end') { finish(); return; }
    sound.play(e.type);
    if (e.type === 'boss') toast('THE ECLIPSE / 星喰い、来襲', 4);
    if (e.type === 'wave') toast(e.elite ? '大きな影が、近づいている' : '星の群れが、目を覚ます', 3);
    if (e.type === 'heal') toast(`羽根が再生した / +${e.amount || 20} HP`, 2);
  }
  if (f.status === 'upgrade' && mode === 'playing') showChoices();
}
function updateHUD() {
  $('sky').dataset.renderMs = renderCost.toFixed(1); $('sky').dataset.frameMs = rawFrame.toFixed(1);
  $('sky').dataset.worldY = f.p.y.toFixed(1); $('sky').dataset.velocity = f.p.vy.toFixed(1); $('sky').dataset.cameraY = f.camera.y.toFixed(1);
  $('hpText').textContent = `${Math.ceil(f.p.hp)} / ${f.p.maxHP}`; $('hpFill').style.width = `${f.p.hp / f.p.maxHP * 100}%`; $('level').textContent = `LV. ${f.level}`;
  $('kills').textContent = f.kills; $('xpFill').style.width = `${clamp(f.xp / f.xpNeed * 100, 0, 100)}%`;
  $('timer').textContent = f.bossSpawned ? clock(f.time) : clock(Math.max(0, 150 - f.time)); $('phase').textContent = f.bossSpawned ? '星喰いを倒せ' : '星喰い到来まで';
  $('altitude').textContent = `${-f.p.y >= 0 ? '+' : '−'}${Math.abs(Math.round(f.p.y))} m`;
  $('bossHUD').hidden = !f.bossSpawned || !f.boss || f.boss.hp <= 0; if (f.boss) $('bossFill').style.width = `${Math.max(0, f.boss.hp / f.boss.maxHP * 100)}%`;
  if (f.time > 11) $('flightTip').style.opacity = '0';
  if (f.time > toastUntil) $('toast').hidden = true;
  const key = JSON.stringify(f.skills); if (key !== armoryKey) { armoryKey = key; $('armory').innerHTML = `<span title="星弾">✦ <b>${1 + f.skills.power}</b></span>` + Object.entries(f.skills).filter(([k, n]) => n && k !== 'power').map(([k, n]) => `<span title="${UPGRADES[k].name}">${UPGRADES[k].icon}<b>${n}</b></span>`).join(''); }
}
function beginInput(source) { if (mode !== 'playing') return; sound.unlock(); held.add(source); f.flap(); repeatTimer = .23; $('rise').classList.add('held'); }
function endInput(source) { held.delete(source); if (!held.size) $('rise').classList.remove('held'); }
window.addEventListener('pointerdown', e => {
  if (mode !== 'playing' || (e.button !== undefined && e.button !== 0)) return;
  if (e.target.closest('button,a') && !e.target.closest('#rise')) return;
  e.preventDefault(); beginInput(`p${e.pointerId}`);
}, { passive: false });
window.addEventListener('pointerup', e => endInput(`p${e.pointerId}`)); window.addEventListener('pointercancel', e => endInput(`p${e.pointerId}`));
window.addEventListener('blur', () => { clearInput(); pause(); });
window.addEventListener('keydown', e => {
  if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) {
    if (e.code === 'Space' && !['title', 'playing'].includes(mode)) return;
    e.preventDefault(); if (e.repeat) return; if (mode === 'title') { start(); beginInput('key'); } else if (mode === 'playing') beginInput('key');
  } else if (e.code === 'Escape' || e.code === 'KeyP') { e.preventDefault(); if (mode === 'playing') pause(); else if (mode === 'paused') resume(); else if (mode === 'guide') home(); }
  else if (mode === 'upgrade' && ['Digit1', 'Digit2', 'Digit3'].includes(e.code)) { e.preventDefault(); const key = f.choices[Number(e.code.slice(-1)) - 1]; if (key) choose(key); }
});
window.addEventListener('keyup', e => { if (['Space', 'ArrowUp', 'KeyW'].includes(e.code)) { e.preventDefault(); endInput('key'); } });
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearInput(); pause(); } });
$('start').onclick = start; $('retry').onclick = start; $('resultHome').onclick = home; $('pause').onclick = pause; $('resume').onclick = resume; $('quit').onclick = home;
$('howto').onclick = () => { setMode('guide'); $('guideClose').focus({ preventScroll: true }); }; $('guideClose').onclick = home;
for (const button of document.querySelectorAll('.sound-toggle')) button.onclick = () => { record.sound = sound.toggle(); saveRecord(record); syncSound(); };
function frame(now) {
  rawFrame = now - last; const elapsed = Math.min(.075, Math.max(0, rawFrame / 1000)); last = now; visualTime += painter.reduce && mode !== 'playing' ? 0 : elapsed;
  if (mode === 'playing') {
    accumulator += elapsed;
    for (let steps = 0; accumulator >= STEP && mode === 'playing' && steps < 10; steps++) {
      if (held.size) { repeatTimer -= STEP; if (repeatTimer <= 0) { f.flap(); repeatTimer = .23; } }
      f.tick(STEP); accumulator -= STEP; handleEvents();
    }
    hudTime += elapsed; if (hudTime > .09) { updateHUD(); hudTime = 0; }
  } else if (mode === 'title' || mode === 'guide') { f.camera.x += elapsed * (painter.reduce ? 0 : 8); f.camera.y = -painter.h / 2 + Math.sin(visualTime * .1) * 35; }
  const drawStart = performance.now(); painter.draw(f, mode, visualTime); renderCost = performance.now() - drawStart; requestAnimationFrame(frame);
}
updateBest(); syncSound(); requestAnimationFrame(frame);
if ('serviceWorker' in navigator && !['localhost', 'terminal.local', '127.0.0.1'].includes(location.hostname)) navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' }).catch(() => {});
