export const VERSION = '1.0.0';
export const STEP = 1 / 120;
export const clamp = (v, lo, hi) => Math.max(lo, Math.min(hi, v));
export const UPGRADES = {
  power: { name: '星弾の研磨', sub: 'STARFIRE', icon: '✦', text: '星弾の威力 +35%', max: 8, color: '#f5d58d' },
  tempo: { name: '鼓動の加速', sub: 'QUICKENING', icon: '»', text: '自動射撃の間隔 −14%', max: 6, color: '#f5d58d' },
  split: { name: '双子の星', sub: 'TWIN STARS', icon: '⋈', text: '同時に放つ星弾 +1', max: 3, color: '#f5d58d' },
  orbit: { name: '月の光輪', sub: 'LUNAR HALO', icon: '◎', text: '周囲を巡る光輪を追加・強化', max: 5, color: '#9be8de' },
  storm: { name: '天の雷針', sub: 'SKY NEEDLE', icon: 'ϟ', text: '近くの敵へ自動で連鎖雷撃', max: 5, color: '#bdb2ff' },
  magnet: { name: '灯を呼ぶ翼', sub: 'LIGHTKEEPER', icon: '◇', text: '経験値の吸引範囲 +55', max: 4, color: '#9be8de' },
  heart: { name: '再生する羽根', sub: 'SECOND WIND', icon: '♡', text: '最大体力 +20、体力を40回復', max: 5, color: '#efa8a2' },
};
export const clock = t => `${String(Math.floor(t / 60)).padStart(2, '0')}:${String(Math.floor(t % 60)).padStart(2, '0')}`;
export class Flight {
  constructor(seed = Date.now()) {
    this.seed = seed >>> 0 || 1; this.time = 0; this.status = 'playing';
    this.p = { x: 0, y: 0, vy: 0, r: 15, hp: 100, maxHP: 100, hurt: 0, flap: 0 };
    this.view = { w: 1100, h: 640 }; this.camera = { x: -330, y: -320 };
    this.skills = { power: 0, tempo: 0, split: 0, orbit: 0, storm: 0, magnet: 0, heart: 0 };
    this.enemies = []; this.bullets = []; this.hostiles = []; this.gems = []; this.rocks = []; this.effects = []; this.events = [];
    this.kills = 0; this.level = 1; this.xp = 0; this.xpNeed = 7; this.totalXP = 0; this.choices = [];
    this.shotTimer = .1; this.spawnTimer = .8; this.gateTimer = 8; this.stormTimer = 2; this.flapTimer = 0;
    this.id = 0; this.boss = null; this.bossSpawned = false; this.maxAltitude = 0; this.nextSwarm = 28;
    this.spawn('wisp', 460, -55);
  }
  rand() { let n = this.seed; n ^= n << 13; n ^= n >>> 17; n ^= n << 5; this.seed = n >>> 0; return this.seed / 4294967296; }
  setView(w, h, snap = false) { this.view = { w, h }; if (snap) { this.camera.x = this.p.x - w * .29; this.camera.y = this.p.y - h * .5; } }
  emit(type, data = {}) { this.events.push({ type, ...data }); }
  flap() {
    if (this.status !== 'playing' || this.flapTimer > 0) return false;
    this.p.vy = -255; this.p.flap = 1; this.flapTimer = .13; this.emit('flap'); return true;
  }
  addEffect(kind, x, y, extra = {}) { this.effects.push({ kind, x, y, age: 0, life: .55, ...extra }); }
  spawn(type, x, y) {
    const stats = { wisp: [15, 9, 38, 8, 1], ray: [23, 22, 46, 12, 2], thorn: [20, 32, 25, 10, 3], elite: [40, 260, 25, 22, 20], boss: [75, 2100, 25, 28, 70] }[type];
    let [r, hp, speed, damage, xp] = stats; if (type !== 'boss') hp *= 1 + this.time / 230;
    const e = { id: ++this.id, type, x, y, r, hp, maxHP: hp, speed, damage, xp, age: 0, timer: 1 + this.rand() * 2, hit: 0, orbitHit: 0, phase: this.rand() * 6.28 };
    this.enemies.push(e); return e;
  }
  spawnWave() {
    const { p, view: v } = this;
    for (let i = 0, n = 1 + Math.floor(this.time / 35); i < n; i++) {
      const type = this.time > 20 && this.rand() < .2 ? 'thorn' : this.time > 8 && this.rand() < .37 ? 'ray' : 'wisp';
      const side = this.rand(); let x = p.x + v.w * .77 + 45 + this.rand() * 120, y = p.y + (this.rand() - .5) * Math.max(v.h * 1.1, 650);
      if (side < .2) { x = p.x + this.rand() * v.w * .6; y = p.y + (this.rand() < .5 ? -1 : 1) * (v.h * .65 + 50); }
      this.spawn(type, x, y);
    }
    this.spawnTimer += Math.max(.46, 1.1 - this.time / 250);
  }
  spawnGate() {
    const x = this.p.x + this.view.w * .77 + 180, center = this.p.y + (this.rand() - .5) * 145, gap = Math.max(245, 310 - this.time * .28);
    for (const sign of [-1, 1]) this.rocks.push({ id: ++this.id, x, y: center + sign * (gap / 2 + 210), rx: 50 + this.rand() * 14, ry: 210, phase: this.rand() * 10 });
    this.gateTimer += 10.5;
  }
  damage(amount) {
    if (this.p.hurt > 0 || this.status !== 'playing') return;
    this.p.hp = Math.max(0, this.p.hp - amount); this.p.hurt = 1.1;
    this.addEffect('hurt', this.p.x, this.p.y, { life: .6 }); this.emit('hurt');
    if (this.p.hp <= 0) { this.status = 'dead'; this.emit('end', { won: false }); }
  }
  hit(e, damage) { if (e.hp <= 0) return; e.hp -= damage; e.hit = .12; if (e.hp <= 0) this.kill(e); }
  kill(e) {
    this.kills++; this.addEffect('burst', e.x, e.y, { radius: e.r * 1.8, life: .65, color: e.type === 'boss' ? '#e9cc92' : '#9ae5de' });
    this.gems.push({ x: e.x, y: e.y, value: e.xp, age: 0, pull: false }); this.emit('kill', { type: e.type });
    if (this.kills % 25 === 0) this.gems.push({ x:e.x, y:e.y-16, kind:'heal', value:12, age:0, pull:false });
    if (e.type === 'elite') { this.p.hp = Math.min(this.p.maxHP, this.p.hp + 20); this.emit('heal', { amount:20 }); }
    if (e.type === 'boss') { this.status = 'won'; this.emit('end', { won: true }); }
  }
  collect(value) { this.xp += value; this.totalXP += value; this.emit('xp'); if (this.xp >= this.xpNeed && this.status === 'playing') this.levelUp(); }
  levelUp() { this.xp -= this.xpNeed; this.level++; this.xpNeed = 7 + (this.level - 1) * 5; this.status = 'upgrade'; this.choices = this.rollUpgrades(); this.emit('level'); }
  rollUpgrades() {
    const pool = Object.keys(UPGRADES).filter(k => this.skills[k] < UPGRADES[k].max), result = [];
    while (result.length < 3 && pool.length) result.push(pool.splice(Math.floor(this.rand() * pool.length), 1)[0]);
    if (!result.length) result.push('heart'); return result;
  }
  choose(key) {
    if (this.status !== 'upgrade' || !this.choices.includes(key)) return false;
    this.skills[key] = Math.min(UPGRADES[key].max, this.skills[key] + 1);
    if (key === 'heart') { this.p.maxHP += 20; this.p.hp = Math.min(this.p.maxHP, this.p.hp + 40); }
    this.choices = []; this.status = 'playing'; this.emit('upgrade', { key }); if (this.xp >= this.xpNeed) this.levelUp(); return true;
  }
  fire() {
    const candidates = this.enemies.filter(e => e.hp > 0 && Math.hypot(e.x - this.p.x, e.y - this.p.y) < 680 && e.x < this.camera.x + this.view.w + 24 && e.y > this.camera.y - 24 && e.y < this.camera.y + this.view.h + 24);
    candidates.sort((a, b) => Math.hypot(a.x - this.p.x, a.y - this.p.y) - Math.hypot(b.x - this.p.x, b.y - this.p.y));
    const target = candidates[0]; if (!target) return;
    const n = 1 + this.skills.split, angle = Math.atan2(target.y - this.p.y, target.x - this.p.x);
    for (let i = 0; i < n; i++) { const a = angle + (i - (n - 1) / 2) * .13; this.bullets.push({ x: this.p.x + 14, y: this.p.y, ox: this.p.x, oy: this.p.y, vx: Math.cos(a) * 585 + 70, vy: Math.sin(a) * 585, life: 1.45, damage: 11 * (1 + this.skills.power * .35), target: target.id, turn: 4.5 }); }
    this.emit('shot');
  }
  lightning() {
    if (!this.skills.storm) return;
    const list = this.enemies.filter(e => e.hp > 0 && Math.hypot(e.x - this.p.x, e.y - this.p.y) < 600).sort((a, b) => a.hp - b.hp).slice(0, 1 + this.skills.storm); let from = this.p;
    for (const e of list) { this.addEffect('lightning', e.x, e.y, { ox: from.x, oy: from.y, life: .3 }); this.hit(e, 23 + this.skills.storm * 13); from = e; } if (list.length) this.emit('storm');
  }
  tick(dt = STEP) {
    if (this.status !== 'playing') return;
    dt = Math.min(.04, dt); this.time += dt; const p = this.p;
    this.flapTimer = Math.max(0, this.flapTimer - dt); p.flap = Math.max(0, p.flap - dt * 3.5); p.hurt = Math.max(0, p.hurt - dt);
    p.vy = Math.min(305, p.vy + 510 * dt); p.y += p.vy * dt; p.x += (108 + Math.min(20, this.time / 9)) * dt;
    this.maxAltitude = Math.max(this.maxAltitude, -p.y); this.camera.x = p.x - this.view.w * .29;
    const goal = p.y - this.view.h * .5 + clamp(p.vy * .15, -45, 45); this.camera.y += (goal - this.camera.y) * (1 - Math.exp(-3.8 * dt));
    this.spawnTimer -= dt; if (this.spawnTimer <= 0 && !this.bossSpawned) this.spawnWave();
    this.gateTimer -= dt; if (this.gateTimer <= 0 && !this.bossSpawned) this.spawnGate();
    if (this.time >= this.nextSwarm && this.time < 145) { this.emit('wave', { elite: this.nextSwarm % 56 === 0 }); if (this.nextSwarm % 56 === 0) this.spawn('elite', p.x + this.view.w * .75, p.y - 80); else for (let i = 0; i < 8; i++) this.spawn('wisp', p.x + this.view.w * .7 + i * 28, p.y + Math.sin(i) * 130); this.nextSwarm += 28; }
    if (this.time >= 150 && !this.bossSpawned) { this.bossSpawned = true; this.boss = this.spawn('boss', p.x + this.view.w * .76, p.y); this.emit('boss'); }
    this.shotTimer -= dt; if (this.shotTimer <= 0) { this.fire(); this.shotTimer += .58 * Math.pow(.86, this.skills.tempo); }
    this.stormTimer -= dt; if (this.stormTimer <= 0) { this.lightning(); this.stormTimer = Math.max(1.1, 3.4 - this.skills.storm * .3); }
    for (const e of this.enemies) {
      if (e.hp <= 0) continue; e.age += dt; e.hit = Math.max(0, e.hit - dt); e.orbitHit = Math.max(0, e.orbitHit - dt);
      const dx = p.x - e.x, dy = p.y - e.y, d = Math.hypot(dx, dy) || 1;
      if (e.type === 'boss' || e.type === 'elite') {
        const targetX = p.x + Math.min(340, this.view.w * .48); e.x += clamp((targetX - e.x) * 2, -80, 180) * dt; e.y += clamp((p.y + Math.sin(e.age * .8) * 95 - e.y) * 2, -360, 360) * dt; e.timer -= dt;
        if (e.timer <= 0) { const a = Math.atan2(dy, dx), n = e.type === 'boss' ? 5 : 3; for (let i = 0; i < n; i++) { const angle = a + (i - (n - 1) / 2) * .24; this.hostiles.push({ x: e.x, y: e.y, vx: Math.cos(angle) * 175 + 50, vy: Math.sin(angle) * 175, life: 5, r: 6 }); } e.timer = e.type === 'boss' ? 1.65 : 3; }
      } else if (e.type === 'thorn') {
        e.x += (64 - e.speed) * dt; e.y += Math.sin(e.age * 1.4 + e.phase) * 20 * dt; e.timer -= dt;
        if (e.timer <= 0 && d < 650) { this.hostiles.push({ x: e.x, y: e.y, vx: dx / d * 150 + 35, vy: dy / d * 150, life: 4, r: 5 }); e.timer = 3; }
      } else { e.x += (64 + dx / d * e.speed) * dt; e.y += (dy / d * e.speed + Math.sin(e.age * 2 + e.phase) * 12) * dt; }
      if (d < p.r + e.r * .8) this.damage(e.damage);
      if (this.skills.orbit && e.orbitHit <= 0) for (let i = 0, n = 1 + Math.floor(this.skills.orbit / 2); i < n; i++) { const a = this.time * 2.8 + i * Math.PI * 2 / n; if (Math.hypot(e.x - p.x - Math.cos(a) * 69, e.y - p.y - Math.sin(a) * 69) < e.r + 15) { this.hit(e, 14 + this.skills.orbit * 7); e.orbitHit = .36; break; } }
    }
    for (const b of this.bullets) {
      b.ox = b.x; b.oy = b.y; b.life -= dt; const target = this.enemies.find(e => e.id === b.target && e.hp > 0);
      if (target) { const a = Math.atan2(target.y - b.y, target.x - b.x); let diff = a - Math.atan2(b.vy, b.vx); diff = Math.atan2(Math.sin(diff), Math.cos(diff)); const angle = Math.atan2(b.vy, b.vx) + clamp(diff, -b.turn * dt, b.turn * dt); b.vx = Math.cos(angle) * 620; b.vy = Math.sin(angle) * 620; }
      b.x += b.vx * dt; b.y += b.vy * dt; for (const e of this.enemies) if (e.hp > 0 && Math.hypot(e.x - b.x, e.y - b.y) < e.r + 6) { this.hit(e, b.damage); b.life = 0; break; }
    }
    for (const b of this.hostiles) { b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt; if (Math.hypot(b.x - p.x, b.y - p.y) < p.r + b.r) { this.damage(12); b.life = 0; } }
    for (const r of this.rocks) { const qx = (p.x - r.x) / (r.rx + p.r), qy = (p.y - r.y) / (r.ry + p.r); if (qx * qx + qy * qy < 1) { this.damage(18); p.vy += (p.y < r.y ? -1 : 1) * dt * 350; } }
    for (const g of this.gems) {
      g.age += dt; const d = Math.hypot(g.x - p.x, g.y - p.y);
      if (d < 160 + this.skills.magnet * 55 || g.x < p.x - this.view.w * .24) g.pull = true;
      if (g.pull) { const amount = Math.min(1, (350 + g.age * 50) * dt / Math.max(d, 1)); g.x += (p.x - g.x) * amount; g.y += (p.y - g.y) * amount; }
      if (d < 24 && !g.taken) { g.taken = true; if (g.kind === 'heal') { this.p.hp = Math.min(this.p.maxHP, this.p.hp + g.value); this.emit('heal', { amount:g.value }); } else this.collect(g.value); }
    }
    for (const e of this.effects) e.age += dt;
    this.enemies = this.enemies.filter(e => e.hp > 0 && (e.type === 'boss' || (e.x > p.x - this.view.w * .6 && Math.abs(e.y - p.y) < this.view.h * 2.5)));
    this.bullets = this.bullets.filter(b => b.life > 0); this.hostiles = this.hostiles.filter(b => b.life > 0 && b.x > p.x - this.view.w);
    this.gems = this.gems.filter(g => !g.taken && g.age < 25); this.rocks = this.rocks.filter(r => r.x > p.x - this.view.w * .5); this.effects = this.effects.filter(e => e.age < e.life);
    if (this.events.length > 100) this.events.splice(0, this.events.length - 100);
  }
}
