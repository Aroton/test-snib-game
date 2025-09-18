/* Simple procedural sound effects using Web Audio API */
(function(){
  class SFX {
    constructor() {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      this.ctx = AudioCtx ? new AudioCtx() : null;
      this.master = this.ctx ? this.ctx.createGain() : null;
      if (this.master) {
        this.master.gain.value = 0.22; // overall volume cap
        this.master.connect(this.ctx.destination);
      }
      this.enabled = true;
    }

    get available() { return !!this.ctx; }

    async resume() {
      if (!this.ctx) return;
      if (this.ctx.state !== 'running') {
        try { await this.ctx.resume(); } catch (_) {}
      }
    }

    // Generic tone with simple envelope and optional frequency sweep
    tone({ type = 'sine', fStart = 440, fEnd = 440, duration = 0.12, attack = 0.005, release = 0.1, gain = 0.25, when = 0 } = {}) {
      if (!this.enabled || !this.available) return;
      const ctx = this.ctx;
      const now = ctx.currentTime + Math.max(0, when);

      const osc = ctx.createOscillator();
      const g = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(Math.max(1, fStart), now);
      if (fEnd !== fStart) {
        // Exponential ramp sounds more natural for sweeps; guard against non-positive values
        const safeEnd = Math.max(1, fEnd);
        try { osc.frequency.exponentialRampToValueAtTime(safeEnd, now + duration); }
        catch { osc.frequency.linearRampToValueAtTime(safeEnd, now + duration); }
      }

      // Envelope
      const peak = Math.max(0, Math.min(1, gain));
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(peak, now + Math.max(0.001, attack));
      g.gain.linearRampToValueAtTime(0, now + Math.max(0.002, duration));

      osc.connect(g);
      g.connect(this.master);
      osc.start(now);
      osc.stop(now + duration + 0.02);
    }

    // Optional white noise burst (for hits)
    noise({ duration = 0.2, cutoff = 1200, gain = 0.2, when = 0 } = {}) {
      if (!this.enabled || !this.available) return;
      const ctx = this.ctx;
      const now = ctx.currentTime + Math.max(0, when);
      const bufferSize = Math.max(1, Math.floor(ctx.sampleRate * duration));
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) data[i] = (Math.random() * 2 - 1) * 0.8;
      const src = ctx.createBufferSource();
      src.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(cutoff, now);

      const g = ctx.createGain();
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(Math.max(0, Math.min(1, gain)), now + 0.008);
      g.gain.linearRampToValueAtTime(0, now + duration);

      src.connect(filter);
      filter.connect(g);
      g.connect(this.master);
      src.start(now);
      src.stop(now + duration + 0.02);
    }

    async playFlap() {
      await this.resume();
      // Upward chirp, short and snappy
      this.tone({ type: 'square', fStart: 380, fEnd: 680, duration: 0.11, attack: 0.005, release: 0.1, gain: 0.22 });
    }

    async playScore() {
      await this.resume();
      // Two quick ascending beeps
      this.tone({ type: 'sine', fStart: 700, fEnd: 700, duration: 0.07, attack: 0.002, release: 0.06, gain: 0.2, when: 0 });
      this.tone({ type: 'sine', fStart: 900, fEnd: 900, duration: 0.07, attack: 0.002, release: 0.06, gain: 0.2, when: 0.08 });
    }

    async playHit() {
      await this.resume();
      // Low thud + very short noise tick
      this.tone({ type: 'triangle', fStart: 240, fEnd: 90, duration: 0.26, attack: 0.002, release: 0.25, gain: 0.28 });
      this.noise({ duration: 0.08, cutoff: 1500, gain: 0.12, when: 0 });
    }

    setMuted(m) { this.enabled = !m; }
  }

  // Expose globally
  window.SFX = new SFX();
})();