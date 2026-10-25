import { clamp } from './model.mjs?v=lumen-1.0.0';
const TAU = Math.PI * 2;
const hash = (a, b = 0) => { const n = Math.sin(a * 127.1 + b * 311.7) * 43758.5453; return n - Math.floor(n); };
const oval = (c, x, y, rx, ry) => { c.beginPath(); c.ellipse(x, y, rx, ry, 0, 0, TAU); c.fill(); };
function glow(c, x, y, r, color) { const g = c.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, color); g.addColorStop(1, 'transparent'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
function makeCloud(warm = false) {
  const cv = document.createElement('canvas'); cv.width = 900; cv.height = 440; const c = cv.getContext('2d');
  for (let i = 0; i < 60; i++) { const x = 90 + hash(i, 2) * 720, y = 190 + Math.sin(x / 900 * Math.PI) * -80 + hash(i, 3) * 130, r = 50 + hash(i, 4) * 110; const g = c.createRadialGradient(x, y - 30, 0, x, y, r); g.addColorStop(0, warm ? 'rgba(186,124,145,.09)' : 'rgba(79,124,158,.16)'); g.addColorStop(.5, warm ? 'rgba(96,69,110,.12)' : 'rgba(42,74,117,.17)'); g.addColorStop(1, 'transparent'); c.fillStyle = g; c.fillRect(x - r, y - r, r * 2, r * 2); }
  return cv;
}
export class Painter {
  constructor(canvas) { this.canvas = canvas; this.c = canvas.getContext('2d', { alpha: false }); this.clouds = [makeCloud(), makeCloud(true)]; this.trail = []; this.lastTrail = 0; this.width = 1100; this.height = 640; this.dpr = 1; this.reduce = matchMedia('(prefers-reduced-motion: reduce)').matches; }
  resize(w, h) { this.dpr = Math.min(devicePixelRatio || 1, 2); this.canvas.width = Math.round(w * this.dpr); this.canvas.height = Math.round(h * this.dpr); this.width = w; this.height = h; this.h = w / h < .8 ? 840 : 640; this.w = this.h * w / h; }
  background(t, camera) {
    const c = this.c, w = this.w, h = this.h;
    const g = c.createLinearGradient(0, 0, w * .8, h); g.addColorStop(0, '#080e20'); g.addColorStop(.44, '#17203e'); g.addColorStop(1, '#2b213c'); c.fillStyle = g; c.fillRect(0, 0, w, h);
    glow(c, w * .78, h * .38, h * .8, '#5a486e20'); glow(c, w * .15, h * .7, h * .7, '#267e8a13');
    for (let layer = 0; layer < 2; layer++) {
      const parallax = layer ? .13 : .035, step = layer ? 340 : 220;
      const sx = Math.floor(camera.x * parallax / step), sy = Math.floor(camera.y * parallax / step);
      for (let ix = sx - 1; ix < sx + w / step + 2; ix++) for (let iy = sy - 1; iy < sy + h / step + 2; iy++) for (let k = 0; k < 7; k++) {
        const x = ix * step + hash(ix * 9 + k, iy) * step - camera.x * parallax, y = iy * step + hash(ix, iy * 8 + k) * step - camera.y * parallax;
        const a = .2 + hash(ix + k, iy) * .45 + Math.sin(t * .5 + k) * .08;
        c.fillStyle = `rgba(220,229,243,${a})`; const r = .5 + hash(ix * 5 + k, iy) * .9; oval(c, x, y, r, r);
        if (k === 1 && layer) { c.strokeStyle = `rgba(239,217,166,${a * .5})`; c.lineWidth = .6; c.beginPath(); c.moveTo(x - 4, y); c.lineTo(x + 4, y); c.moveTo(x, y - 4); c.lineTo(x, y + 4); c.stroke(); }
      }
    }
    const mx = w * .74 - Math.sin(camera.x * .00009) * 30, my = h * (w / h < .8 ? .13 : .24) - Math.sin(camera.y * .00012) * 38;
    glow(c, mx, my, 150, '#dfcda320'); c.strokeStyle = '#c6b18b17'; c.lineWidth = 1; c.beginPath(); c.arc(mx, my, 87, 0, TAU); c.stroke();
    c.save(); c.translate(mx, my); c.rotate(-.55); c.beginPath(); c.arc(0, 0, 38, 0, TAU); c.clip(); c.fillStyle = '#e9d6a0'; c.beginPath(); c.arc(0, 0, 38, 0, TAU); c.arc(13, -8, 37, 0, TAU, true); c.fill('evenodd'); c.restore();
    for (let layer = 0; layer < 2; layer++) {
      const speed = layer ? .24 : .09, tw = 750, th = 620, ox = camera.x * speed, oy = camera.y * speed;
      for (let ix = Math.floor(ox / tw) - 1; ix < (ox + w) / tw + 1; ix++) for (let iy = Math.floor(oy / th) - 1; iy < (oy + h) / th + 1; iy++) {
        const x = ix * tw - ox + hash(ix, iy) * 80, y = iy * th - oy + hash(ix + 1, iy) * 240;
        c.globalAlpha = layer ? .85 : .65; c.drawImage(this.clouds[(ix + iy) & 1], x - 50, y - 70, 930, 455);
      }
      c.globalAlpha = 1;
    }
    // Distant suspended architecture, continuous in both dimensions.
    const spacing = 570, farX = camera.x * .2, farY = camera.y * .2;
    for (let ix = Math.floor(farX / spacing) - 1; ix < (farX + w) / spacing + 1; ix++) {
      const by = Math.floor(farY / 780);
      for (let iy = by; iy <= by + 1; iy++) { const x = ix * spacing - farX + hash(ix, iy) * 150, y = iy * 780 - farY + 320 + hash(iy, ix) * 320; this.ruin(c, x, y, .5 + hash(ix, iy) * .7, ix); }
    }
    c.strokeStyle = '#c7d7e405'; c.lineWidth = 1;
    for (let y = 0; y < h; y += 5) { c.beginPath(); c.moveTo(0, y); c.lineTo(w, y); c.stroke(); }
  }
  ruin(c, x, y, scale, seed) {
    c.save(); c.translate(x, y); c.scale(scale, scale); c.fillStyle = '#0a12237a'; c.beginPath(); c.moveTo(-90, 0); c.lineTo(85, 0); c.lineTo(55, 32); c.lineTo(10, 120); c.lineTo(-35, 45); c.closePath(); c.fill();
    c.fillStyle = '#13213a99'; for (let i = 0; i < 4; i++) { const h = 40 + hash(seed, i) * 90; c.fillRect(-52 + i * 31, -h, 18, h); c.beginPath(); c.moveTo(-57 + i * 31, -h); c.lineTo(-43 + i * 31, -h - 25); c.lineTo(-29 + i * 31, -h); c.fill(); }
    c.strokeStyle = '#5f8c9725'; c.lineWidth = 2; c.beginPath(); c.moveTo(-90, 0); c.lineTo(85, 0); c.stroke(); c.restore();
  }
  ship(x, y, tilt, flap, t, size = 1, hurt = 0) {
    const c = this.c; c.save(); c.translate(x, y); c.rotate(tilt); c.scale(size, size); if (hurt > 0 && Math.sin(hurt * 35) < 0) c.globalAlpha = .5;
    glow(c, -8, 0, 70, '#6cddd529');
    for (const side of [-1, 1]) {
      c.save(); c.scale(1, side); c.translate(-5, -3); c.rotate(-.13 + Math.sin(t * 8) * .08 - flap * .45);
      const g = c.createLinearGradient(-30, 0, -10, -37); g.addColorStop(0, '#4b8fa0'); g.addColorStop(.5, '#a3d7cf'); g.addColorStop(1, '#e5e7bd'); c.fillStyle = g; c.strokeStyle = '#f0e4ba'; c.lineWidth = .8;
      c.beginPath(); c.moveTo(20, 0); c.bezierCurveTo(2, -10, -12, -42, -33, -34); c.bezierCurveTo(-29, -19, -41, -12, -29, -6); c.lineTo(-35, 3); c.bezierCurveTo(-17, 7, 2, 2, 20, 0); c.fill(); c.stroke();
      c.strokeStyle = '#244c61aa'; for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(12 - i * 7, -1); c.quadraticCurveTo(-14 - i * 3, -9 - i * 4, -28, -26 + i * 7); c.stroke(); }
      c.strokeStyle = '#d8eadb38'; c.lineWidth = .35; for (let i = 0; i < 9; i++) { c.beginPath(); c.moveTo(-27 + i * 3.6, -4); c.quadraticCurveTo(-25 + i * 2.8, -12, -28 + i * 3, -29 + i * 2); c.stroke(); } c.fillStyle = '#f5edbe80'; for (let i = 0; i < 14; i++) { const x = -27 + hash(i, 2) * 24, y = -5 - hash(i, 5) * 17; oval(c, x, y, .32, .22); } c.fillStyle = '#d8bd7a'; oval(c, -18, -15, 5, 8); c.fillStyle = '#275468'; oval(c, -18, -15, 3.4, 5.5); c.restore();
    }
    const body = c.createLinearGradient(0, -8, 0, 9); body.addColorStop(0, '#fff1b7'); body.addColorStop(.4, '#ddc385'); body.addColorStop(1, '#6a7e80'); c.fillStyle = body;
    c.beginPath(); c.moveTo(30, 0); c.quadraticCurveTo(10, -12, -12, -6); c.lineTo(-32, 0); c.lineTo(-12, 6); c.quadraticCurveTo(10, 11, 30, 0); c.fill();
    c.strokeStyle = '#fff2be'; c.lineWidth = 1; c.beginPath(); c.moveTo(18, -3); c.quadraticCurveTo(27, -16, 37, -12); c.moveTo(19, 3); c.quadraticCurveTo(28, 14, 37, 11); c.stroke();
    glow(c, 15, 0, 10, '#fff4bb99'); c.fillStyle = '#fff8d7'; oval(c, 15, 0, 3, 3); c.restore();
  }
  rock(r) {
    const c = this.c; c.save(); c.translate(r.x, r.y); const g = c.createLinearGradient(-r.rx, 0, r.rx, 0); g.addColorStop(0, '#101929'); g.addColorStop(.7, '#263448'); g.addColorStop(1, '#425262'); c.fillStyle = g; c.strokeStyle = '#8aa1a45c'; c.lineWidth = 1.3;
    c.beginPath(); for (let i = 0; i < 15; i++) { const a = i / 15 * TAU, n = .84 + hash(i, r.phase) * .18, x = Math.cos(a) * r.rx * n, y = Math.sin(a) * r.ry * n; if (i) c.lineTo(x, y); else c.moveTo(x, y); } c.closePath(); c.fill(); c.stroke();
    c.strokeStyle = '#9fd4cc46'; c.beginPath(); c.moveTo(r.rx * .4, -r.ry * .85); c.lineTo(-r.rx * .2, -r.ry * .1); c.lineTo(r.rx * .3, r.ry * .45); c.lineTo(0, r.ry * .85); c.stroke();
    for (let i = 0; i < 6; i++) { c.strokeStyle = '#121d32'; c.beginPath(); c.moveTo(-r.rx * .7, (i - 3) * r.ry / 4); c.lineTo(r.rx * .6, (i - 3) * r.ry / 4 + 14); c.stroke(); }
    c.fillStyle = '#a8d9c777'; for (let i = 0; i < 6; i++) oval(c, hash(i, r.phase) * r.rx * 1.4 - r.rx * .7, hash(i + 7, r.phase) * r.ry * 1.5 - r.ry * .75, 1.2, 1.2); c.restore();
  }
  enemy(e) {
    const c = this.c; c.save(); c.translate(e.x, e.y); c.rotate(Math.sin(e.age * 1.8 + e.phase) * .12); const s = e.r / 23; c.scale(s, s);
    const color = e.hit ? '#ffffff' : e.type === 'boss' || e.type === 'elite' ? '#d5a9cf' : '#ab9ecc';
    if (e.type === 'wisp') {
      glow(c, 0, 0, 43, '#b69ce335'); c.fillStyle = color; c.beginPath(); c.moveTo(-17, 2); c.bezierCurveTo(-18, -23, 18, -23, 19, 2); c.quadraticCurveTo(0, 11, -17, 2); c.fill(); c.strokeStyle = '#9d9ccd99'; c.lineWidth = 1.6;
      for (let i = 0; i < 4; i++) { c.beginPath(); c.moveTo(-12 + i * 8, 3); c.quadraticCurveTo(-18 + i * 8 + Math.sin(e.age * 5 + i) * 8, 17, -8 + i * 8, 28); c.stroke(); }
    } else if (e.type === 'thorn') {
      c.rotate(e.age * .5); c.fillStyle = '#565c84'; c.strokeStyle = color; c.lineWidth = 1;
      c.beginPath(); for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, r = i % 2 ? 14 : 27; c.lineTo(Math.cos(a) * r, Math.sin(a) * r); } c.closePath(); c.fill(); c.stroke();
    } else {
      glow(c, 0, 0, 60, '#ce88c820'); c.fillStyle = e.hit ? '#ffffff' : '#68608c'; c.strokeStyle = color; c.lineWidth = .9;
      c.beginPath(); c.moveTo(-28, 0); c.bezierCurveTo(-10, -14, 0, -28, 20, -33 - Math.sin(e.age * 6) * 7); c.quadraticCurveTo(11, -12, 34, -10); c.lineTo(17, 0); c.lineTo(34, 10); c.quadraticCurveTo(11, 12, 20, 33 + Math.sin(e.age * 6) * 7); c.bezierCurveTo(0, 28, -10, 14, -28, 0); c.fill(); c.stroke();
      c.strokeStyle = '#c7b5dc55'; for (const n of [-1, 1]) { c.beginPath(); c.moveTo(-20, 0); c.quadraticCurveTo(0, n * 5, 19, n * 28); c.stroke(); }
      if (e.type === 'boss') { c.strokeStyle = '#ddb777'; c.lineWidth = .7; c.beginPath(); c.arc(0, 0, 35, 0, TAU); c.stroke(); for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + e.age * .15; c.beginPath(); c.moveTo(Math.cos(a) * 39, Math.sin(a) * 39); c.lineTo(Math.cos(a) * 43, Math.sin(a) * 43); c.stroke(); } }
    }
    glow(c, -8, 0, 12, '#fa8c9a77'); c.fillStyle = '#ffd1c3'; oval(c, -8, 0, 3.4, 2.4); c.restore();
    if (e.hp < e.maxHP && e.type !== 'boss') { c.fillStyle = '#171d32'; c.fillRect(e.x - e.r, e.y - e.r - 14, e.r * 2, 2); c.fillStyle = '#d6a4c3'; c.fillRect(e.x - e.r, e.y - e.r - 14, e.r * 2 * Math.max(0, e.hp / e.maxHP), 2); }
  }
  draw(f, mode = 'playing', visualTime = 0) {
    const c = this.c; c.setTransform(this.canvas.width / this.w, 0, 0, this.canvas.height / this.h, 0, 0); const t = visualTime;
    this.background(t, f.camera); c.save(); c.translate(-f.camera.x, -f.camera.y);
    if (mode !== 'title' && mode !== 'guide') {
      for (const r of f.rocks) this.rock(r);
      for (const g of f.gems) { if (g.kind === 'heal') { glow(c,g.x,g.y,27,'#b5ffd34c'); c.strokeStyle='#d6f6ca'; c.lineWidth=2; c.beginPath(); c.moveTo(g.x-6,g.y); c.lineTo(g.x+6,g.y); c.moveTo(g.x,g.y-6); c.lineTo(g.x,g.y+6); c.stroke(); continue; } glow(c, g.x, g.y, 20, '#78e8d328'); c.save(); c.translate(g.x, g.y); c.rotate(Math.PI / 4); c.fillStyle = g.value > 3 ? '#f0d99a' : '#8fe3cf'; c.fillRect(-3.5, -3.5, 7, 7); c.strokeStyle = '#d7fff3'; c.lineWidth = .6; c.strokeRect(-3.5, -3.5, 7, 7); c.restore(); }
      for (const e of f.enemies) this.enemy(e);
      c.save(); c.globalCompositeOperation = 'lighter';
      for (const b of f.bullets) { c.strokeStyle = '#f2d79b77'; c.lineWidth = 2; c.beginPath(); c.moveTo(b.x - b.vx * .037, b.y - b.vy * .037); c.lineTo(b.x, b.y); c.stroke(); glow(c, b.x, b.y, 14, '#ffd89455'); c.fillStyle = '#fff1c3'; oval(c, b.x, b.y, 3, 2); }
      for (const b of f.hostiles) { glow(c, b.x, b.y, 20, '#fb8e9f66'); c.strokeStyle = '#ffb3b1'; c.lineWidth = 1.5; c.beginPath(); c.arc(b.x, b.y, b.r, 0, TAU); c.stroke(); c.fillStyle = '#ffc3bb'; oval(c, b.x, b.y, 2, 2); }
      c.restore();
      for (const e of f.effects) {
        const q = e.age / e.life; c.save(); c.globalAlpha = 1 - q;
        if (e.kind === 'lightning') { c.strokeStyle = '#d6c6ff'; c.lineWidth = 2; c.beginPath(); c.moveTo(e.ox, e.oy); for (let i = 1; i <= 8; i++) { const a = i / 8; c.lineTo(e.ox + (e.x - e.ox) * a + (i < 8 ? Math.sin(i * 32) * 13 : 0), e.oy + (e.y - e.oy) * a); } c.stroke(); }
        else { c.strokeStyle = e.kind === 'hurt' ? '#e79a9a' : e.color || '#e8d39b'; c.lineWidth = 1; c.beginPath(); c.arc(e.x, e.y, 12 + q * (e.radius || 60), 0, TAU); c.stroke(); for (let i = 0; i < 10; i++) { const a = i / 10 * TAU; c.fillStyle = c.strokeStyle; oval(c, e.x + Math.cos(a) * q * 55, e.y + Math.sin(a) * q * 55, 2 * (1 - q) + .5, 1); } }
        c.restore();
      }
      if (f.skills.orbit) {
        const n = 1 + Math.floor(f.skills.orbit / 2); c.strokeStyle = '#a6eee71a'; c.lineWidth = 1; c.beginPath(); c.arc(f.p.x, f.p.y, 69, 0, TAU); c.stroke();
        for (let i = 0; i < n; i++) { const a = f.time * 2.8 + i * TAU / n, x = f.p.x + Math.cos(a) * 69, y = f.p.y + Math.sin(a) * 69; glow(c, x, y, 25, '#85ebda55'); c.strokeStyle = '#b6f9ed'; c.lineWidth = 3; c.beginPath(); c.arc(x, y, 10, a, a + 4.4); c.stroke(); }
      }
      if (f.time - this.lastTrail > .025 && f.status === 'playing' && mode === 'playing') { this.trail.push({ x: f.p.x - 18, y: f.p.y, t: f.time }); this.lastTrail = f.time; }
      this.trail = this.trail.filter(p => f.time - p.t < .7); c.lineCap = 'round';
      for (let i = 1; i < this.trail.length; i++) { const p = this.trail[i], prev = this.trail[i - 1], q = 1 - (f.time - p.t) / .7; c.strokeStyle = `rgba(150,219,207,${q * .32})`; c.lineWidth = q * 4; c.beginPath(); c.moveTo(prev.x, prev.y); c.lineTo(p.x, p.y); c.stroke(); }
      this.ship(f.p.x, f.p.y, clamp(f.p.vy * .0011, -.3, .34), f.p.flap, t, 1, f.p.hurt);
    } else {
      const x = f.camera.x + this.w * (this.w / this.h < .8 ? .63 : .7), y = f.camera.y + this.h * (this.w / this.h < .8 ? .26 : .5) + Math.sin(t * .9) * 17;
      c.strokeStyle = '#e4d09e14'; c.lineWidth = 1; c.beginPath(); c.arc(x, y, 145, 0, TAU); c.stroke(); c.beginPath(); c.arc(x, y, 184, -.7, 1.6); c.stroke();
      for (let i = 0; i < 26; i++) { const a = i * .5 + t * .2, r = 90 + i * 6; c.fillStyle = `rgba(204,222,202,${(i % 4) * .08})`; oval(c, x + Math.cos(a) * r, y + Math.sin(a) * r * .7, 1.5, 1.5); }
      this.ship(x, y, -.1 + Math.sin(t) * .05, .3 + Math.sin(t * 2) * .18, t, this.w / this.h < .8 ? 2 : 3.4);
    }
    c.restore();
    const vg = c.createRadialGradient(this.w * .5, this.h * .5, this.h * .2, this.w * .5, this.h * .5, Math.max(this.w, this.h) * .75); vg.addColorStop(0, 'transparent'); vg.addColorStop(1, '#03071199'); c.fillStyle = vg; c.fillRect(0, 0, this.w, this.h);
    // World altitude markings make vertical camera motion readable.
    if (mode === 'playing') {
      c.fillStyle = '#c9e6dd44'; c.strokeStyle = '#b9d3ce24'; c.font = '9px ui-monospace, monospace';
      const start = Math.floor(f.camera.y / 100) * 100; for (let y = start; y < f.camera.y + this.h; y += 100) { const sy = y - f.camera.y; c.beginPath(); c.moveTo(this.w - 24, sy); c.lineTo(this.w - 14, sy); c.stroke(); c.textAlign = 'right'; c.fillText(`${-y}`, this.w - 29, sy + 3); }
      c.textAlign = 'left';
    }
  }
}
