export class Sound {
  constructor(enabled = false) { this.enabled = enabled; this.ctx = null; this.lastShot = 0; }
  unlock() { if (!this.ctx) { const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return; this.ctx = new AC(); this.master = this.ctx.createGain(); this.master.gain.value = .16; this.master.connect(this.ctx.destination); } if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {}); }
  toggle() { this.enabled = !this.enabled; this.unlock(); if (this.enabled) this.play('level'); return this.enabled; }
  tone(freq, start, duration, volume, type = 'sine', end = freq) {
    const c = this.ctx; const osc = c.createOscillator(), g = c.createGain(); osc.type = type; osc.frequency.setValueAtTime(freq, start); osc.frequency.exponentialRampToValueAtTime(Math.max(30, end), start + duration); g.gain.setValueAtTime(.0001, start); g.gain.exponentialRampToValueAtTime(volume, start + .008); g.gain.exponentialRampToValueAtTime(.0001, start + duration); osc.connect(g); g.connect(this.master); osc.start(start); osc.stop(start + duration + .02);
  }
  play(kind) {
    if (!this.enabled || !this.ctx || this.ctx.state !== 'running') return; const t = this.ctx.currentTime;
    if (kind === 'shot') { if (t - this.lastShot < .15) return; this.lastShot = t; this.tone(750, t, .08, .09, 'sine', 1350); }
    else if (kind === 'flap') this.tone(190, t, .15, .16, 'sine', 350);
    else if (kind === 'xp') this.tone(990, t, .12, .1, 'sine', 1485);
    else if (kind === 'kill') this.tone(290, t, .12, .1, 'triangle', 80);
    else if (kind === 'hurt') { this.tone(135, t, .25, .4, 'sawtooth', 60); }
    else if (kind === 'level' || kind === 'upgrade' || kind === 'won') [523, 659, 784, 1047].forEach((n, i) => this.tone(n, t + i * .09, .45, .19));
    else if (kind === 'boss' || kind === 'wave') [110, 146.8, 164.8].forEach((n, i) => this.tone(n, t + i * .12, .8, .13, 'triangle'));
    else if (kind === 'storm') this.tone(1100, t, .22, .2, 'triangle', 120);
    else if (kind === 'dead') this.tone(220, t, 1, .3, 'sine', 55);
  }
}
