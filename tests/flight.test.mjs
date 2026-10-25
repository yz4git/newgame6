import test from 'node:test';
import assert from 'node:assert/strict';
import { Flight, STEP, UPGRADES } from '../dist/model.mjs';
import { loadRecord, finishRecord, saveRecord } from '../dist/storage.mjs';
const advance = (f, seconds) => { for (let i = 0; i < Math.round(seconds / STEP); i++) f.tick(STEP); };
test('one press climbs, gravity makes the same pilot fall, camera follows both directions', () => {
  const f = new Flight(4); f.spawnTimer = 100; f.gateTimer = 100; f.setView(1000, 640, true);
  assert.equal(f.flap(), true); advance(f, .4); assert.ok(f.p.y < -45); const high = f.camera.y;
  assert.ok(high < -330); advance(f, 2); assert.ok(f.p.y > 300); assert.ok(f.camera.y > high + 200);
  const before = f.camera.y; for (let i = 0; i < 7; i++) { f.flap(); advance(f, .23); } assert.ok(f.camera.y < before - 130);
});
test('flaps have a short debounce; simulation pauses during a level choice', () => {
  const f = new Flight(1); assert.ok(f.flap()); assert.equal(f.flap(), false); advance(f, .2); assert.ok(f.flap());
  f.collect(7); assert.equal(f.status, 'upgrade'); const { x, y } = f.p, t = f.time; advance(f, 4); assert.deepEqual([f.p.x, f.p.y, f.time], [x, y, t]);
  assert.equal(f.choices.length, 3); assert.equal(new Set(f.choices).size, 3); assert.equal(f.choose('invalid'), false); const key = f.choices[0]; assert.ok(f.choose(key)); assert.equal(f.skills[key], 1); assert.equal(f.status, 'playing');
});
test('automatic starfire kills without any attack input and its light grants XP', () => {
  const f = new Flight(3); f.spawnTimer = 100; f.gateTimer = 100; f.spawn('wisp', 150, 0);
  for (let i = 0; i < 600; i++) { if (i % 112 === 0) f.flap(); f.tick(); }
  assert.ok(f.kills >= 1); assert.ok(f.totalXP >= 1); assert.ok(f.events.some(e => e.type === 'shot'));
});
test('orbit and lightning cause damage independently of starfire', () => {
  const f = new Flight(5); f.spawnTimer = 100; f.shotTimer = 100; f.skills.orbit = 2;
  const e = f.spawn('elite', 68, 0); const hp = e.hp; advance(f, .05); assert.ok(e.hp < hp);
  const g = new Flight(6); g.enemies = []; g.skills.storm = 2; g.spawn('ray', 180, 0); g.spawn('ray', 220, 40); g.lightning(); assert.equal(g.kills, 2); assert.equal(g.effects.filter(e => e.kind === 'lightning').length, 2);
});
test('damage has invulnerability, rocks hurt, and zero HP ends the flight once', () => {
  const f = new Flight(7); f.damage(12); f.damage(12); assert.equal(f.p.hp, 88); advance(f, 1.2); f.rocks.push({ x: f.p.x, y: f.p.y, rx: 80, ry: 100 }); f.tick(); assert.equal(f.p.hp, 70);
  f.p.hurt = 0; f.damage(1000); f.damage(1000); assert.equal(f.status, 'dead'); assert.equal(f.events.filter(e => e.type === 'end').length, 1);
});
test('health and capped skills upgrade correctly, surplus XP queues a second selection', () => {
  const f = new Flight(8); f.p.hp = 20; f.collect(40); f.choices = ['heart']; f.choose('heart'); assert.equal(f.p.maxHP, 120); assert.equal(f.p.hp, 60); assert.equal(f.status, 'upgrade'); assert.equal(f.level, 3);
  for (const [key, u] of Object.entries(UPGRADES)) f.skills[key] = u.max; assert.deepEqual(f.rollUpgrades(), ['heart']);
});
test('boss arrives at 150s, tracks held ascent, survives culling, defeat wins', () => {
  const f = new Flight(9); f.time = 149.99; f.spawnTimer = 100; f.gateTimer = 100; f.nextSwarm = 200; advance(f, .03); assert.ok(f.bossSpawned); assert.ok(f.boss);
  f.shotTimer = 100; f.p.hp = 10000; for (let i = 0; i < 1200; i++) { if (i % 28 === 0) f.flap(); f.tick(); }
  assert.ok(f.enemies.includes(f.boss)); assert.ok(Math.abs(f.boss.y - f.p.y) < 220); f.hit(f.boss, 100000); assert.equal(f.status, 'won'); assert.equal(f.events.at(-1).won, true);
});
test('portrait resize retains world positions and camera anchor; long runs remain bounded', () => {
  const f = new Flight(11); f.p.y = -1200; f.setView(390, 840, true); assert.equal(f.p.y, -1200); assert.equal(f.camera.y, -1620); assert.equal(f.camera.x, -390 * .29);
  f.p.hp = 10000; for (let i = 0; i < 120 * 90; i++) { if (i % 112 === 0) f.flap(); if (f.status === 'upgrade') f.choose(f.choices[0]); f.tick(); }
  assert.ok(Number.isFinite(f.p.x)); assert.ok(f.enemies.length < 150); assert.ok(f.bullets.length < 100); assert.ok(f.effects.length < 200); assert.ok(f.gems.length < 150);
});
test('records tolerate corrupt or unavailable storage and keep bests across flights', () => {
  const memory = new Map(); const storage = { getItem: k => memory.get(k), setItem: (k, v) => memory.set(k, v) };
  memory.set('lumen-wing-v1', '{broken'); let r = loadRecord(storage); assert.equal(r.runs, 0);
  r = finishRecord(r, { time: 86, kills: 45, status: 'dead' }); r = finishRecord(r, { time: 153, kills: 120, status: 'won' }); saveRecord(r, storage); const loaded = loadRecord(storage); assert.equal(loaded.wins, 1); assert.equal(loaded.bestKills, 120); assert.equal(loaded.runs, 2);
  assert.equal(saveRecord(r, { setItem() { throw Error('quota'); } }), false);
});
test('every 25 kills yields a healing light; recovery caps at max HP without granting XP', () => {
  const f = new Flight(22); f.enemies=[]; f.kills=24; f.p.hp=95; const e=f.spawn('wisp',f.p.x,f.p.y); f.hit(e,1000);
  const heal=f.gems.find(g=>g.kind==='heal'); assert.ok(heal); assert.equal(heal.value,12); f.gems=[heal]; heal.y=f.p.y; heal.x=f.p.x; f.tick(); assert.equal(f.p.hp,100); assert.equal(f.totalXP,0);
});
test('a full unassisted-damage run can earn upgrades, survive and defeat the boss in both orientations', () => {
  for (const view of [[1100,640],[390,840]]) {
    const f=new Flight(17);f.setView(...view,true);let lastFlap=-1;
    for(let i=0;i<120*210&&!['dead','won'].includes(f.status);i++) {
      if(f.status==='upgrade') {const priority=['storm','split','tempo','orbit','power','heart','magnet'];f.choose([...f.choices].sort((a,b)=>priority.indexOf(a)-priority.indexOf(b))[0]);}
      if(f.time-lastFlap>=.97){f.flap();lastFlap=f.time;}f.tick();f.events=[];
    }
    assert.equal(f.status,'won',`No complete route for ${view}`); assert.ok(f.time>150&&f.time<190); assert.ok(f.level>=12); assert.ok(f.kills>300); assert.ok(f.p.hp>0);
  }
});
