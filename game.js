window.addEventListener('DOMContentLoaded', () => { window.game = new FlappyGame(); });

class FlappyGame {
  constructor() {
    this.canvas = document.getElementById('game-canvas');
    this.ctx = this.canvas.getContext('2d');
    this.width = this.canvas.width;
    this.height = this.canvas.height;

    // Config
    this.cfg = {
      gravity: 0.45,
      flapStrength: 8.8,
      pipeSpeed: 2.6,
      pipeWidth: 80,
      pipeGap: { min: 135, max: 170 },
      spawnInterval: 1500, // ms
      groundHeight: 72,
      birdRadius: 18
    };

    // State
    this.state = 'ready'; // ready | playing | gameover
    this.score = 0;
    this.best = 0;

    // Entities
    this.bird = { x: this.width * 0.28, y: this.height * 0.5, vy: 0, r: this.cfg.birdRadius, rot: 0 };
    this.pipes = []; // { x, gapY, gapH, passed }
    this.spawnTimer = 0;

    // Timing
    this.lastTs = performance.now();

    // Input
    this._bindInput();

    // Focus for keyboard
    setTimeout(() => this.canvas && this.canvas.focus(), 50);

    // Loop
    this.render = this.render.bind(this);
    requestAnimationFrame(this.render);
  }

  // Input handling for keyboard/mouse/touch
  _bindInput() {
    const flapHandler = (e) => {
      if (e && (e.code === 'Tab' || e.ctrlKey || e.metaKey)) return; // ignore combos
      if (e && (e.code === 'Space' || e.code === 'ArrowUp')) e.preventDefault();
      if (this.state === 'ready') {
        this.startGame();
        this.flap();
      } else if (this.state === 'playing') {
        this.flap();
      } else if (this.state === 'gameover') {
        this.reset();
      }
    };

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' || e.code === 'ArrowUp' || e.code === 'KeyW') {
        flapHandler(e);
      } else if (e.code === 'KeyM') {
        // Toggle mute/unmute
        if (window.SFX) {
          window.SFX.setMuted(window.SFX.enabled);
        }
      }
    });

    this.canvas.addEventListener('mousedown', flapHandler);
    this.canvas.addEventListener('touchstart', (e) => { e.preventDefault(); flapHandler(e); }, { passive: false });
  }

  startGame() {
    if (this.state !== 'ready') return;
    this.state = 'playing';
    this.spawnTimer = 0;
    this.pipes = [];
  }

  reset() {
    this.state = 'ready';
    this.score = 0;
    this.bird.x = this.width * 0.28;
    this.bird.y = this.height * 0.5;
    this.bird.vy = 0;
    this.bird.rot = 0;
    this.pipes = [];
    this.spawnTimer = 0;
  }

  gameOver() {
    if (this.state !== 'playing') return;
    this.state = 'gameover';
    if (this.score > this.best) {
      this.best = this.score;      
    }
    // Hit sound
    if (window.SFX) window.SFX.playHit();
  }

  flap() {
    // Give an upward impulse
    this.bird.vy = -this.cfg.flapStrength;
    // Flap sound
    if (window.SFX) window.SFX.playFlap();
  }

  spawnPipe() {
    const groundY = this.height - this.cfg.groundHeight;
    const gapH = this._rand(this.cfg.pipeGap.min, this.cfg.pipeGap.max);
    const margin = 30;
    const minY = margin + gapH * 0.5;
    const maxY = groundY - margin - gapH * 0.5;
    const gapY = this._rand(minY, maxY);
    this.pipes.push({ x: this.width + 10, gapY, gapH, passed: false });
  }

  update(dtMs) {
    const dt = Math.min(dtMs, 40); // clamp delta for stability
    const groundY = this.height - this.cfg.groundHeight;

    if (this.state === 'playing') {
      // Bird physics
      this.bird.vy += this.cfg.gravity;
      if (this.bird.vy > 12) this.bird.vy = 12;
      this.bird.y += this.bird.vy;

      // Bird rotation based on velocity
      const t = Math.max(-10, Math.min(10, this.bird.vy));
      this.bird.rot = this._lerp(this.bird.rot, this._map(t, -10, 10, -0.6, 1.2), 0.15);

      // Pipes spawn/move
      this.spawnTimer += dt;
      if (this.spawnTimer >= this.cfg.spawnInterval) {
        this.spawnTimer = 0;
        this.spawnPipe();
      }
      for (let i = this.pipes.length - 1; i >= 0; --i) {
        const p = this.pipes[i];
        p.x -= this.cfg.pipeSpeed;
        // Scoring when pipe passes bird
        if (!p.passed && p.x + this.cfg.pipeWidth < this.bird.x) {
          p.passed = true;
          this.score++;
          // Score sound
          if (window.SFX) window.SFX.playScore();
        }
        // Despawn off-screen
        if (p.x + this.cfg.pipeWidth < -20) this.pipes.splice(i, 1);
      }

      // Collision with ground/ceiling
      if (this.bird.y + this.bird.r >= groundY || this.bird.y - this.bird.r <= 0) {
        this.gameOver();
      }

      // Collision with pipes (AABB with gap test)
      for (const p of this.pipes) {
        if (this._circleRectCollide(this.bird.x, this.bird.y, this.bird.r, p.x, 0, this.cfg.pipeWidth, p.gapY - p.gapH * 0.5) ||
            this._circleRectCollide(this.bird.x, this.bird.y, this.bird.r, p.x, p.gapY + p.gapH * 0.5, this.cfg.pipeWidth, groundY - (p.gapY + p.gapH * 0.5))) {
          this.gameOver();
          break;
        }
      }
    } else if (this.state === 'ready') {
      // Gentle bobbing animation on the spot
      this.bird.y = this.height * 0.5 + Math.sin(performance.now() / 500) * 6;
      this.bird.rot = Math.sin(performance.now() / 700) * 0.15 - 0.15;
    } else if (this.state === 'gameover') {
      // Let bird fall and tilt on game over for a short while
      if (this.bird.y + this.bird.r < groundY) {
        this.bird.vy += this.cfg.gravity;
        this.bird.y += this.bird.vy;
        this.bird.rot = Math.min(1.5, this.bird.rot + 0.06);
      }
    }
  }

  render() {
    const now = performance.now();
    const dt = now - this.lastTs;
    this.lastTs = now;

    // Update
    this.update(dt);

    // Draw
    const ctx = this.ctx;
    ctx.save();
    ctx.clearRect(0, 0, this.width, this.height);

    this._drawBackground(ctx);
    this._drawPipes(ctx);
    this._drawGround(ctx);
    this._drawBird(ctx);
    this._drawHUD(ctx);

    ctx.restore();

    requestAnimationFrame(this.render);
  }

  // Drawing helpers
  _drawBackground(ctx) {
    // Sky gradient
    const sky = ctx.createLinearGradient(0, 0, 0, this.height);
    sky.addColorStop(0, 'hsl(200,90%,76%)');
    sky.addColorStop(0.6, 'hsl(200,80%,62%)');
    sky.addColorStop(1, 'hsl(200,70%,52%)');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, this.width, this.height);

    // Simple clouds
    for (let i = 0; i < 6; i++) {
      const t = (performance.now() / (9000 + i * 1200));
      const cx = (i * 220 + 50 + 240 * Math.sin(t + i)) % (this.width + 300) - 150;
      const cy = 60 + 30 * Math.cos(t * 0.7 + i * 0.6);
      ctx.save();
      ctx.globalAlpha = 0.22 + 0.15 * Math.sin(t + i * 0.8);
      ctx.beginPath();
      ctx.ellipse(cx, cy, 70 + i * 8, 26 + i * 3, 0, 0, Math.PI * 2);
      ctx.fillStyle = '#fff';
      ctx.shadowColor = 'rgba(255,255,255,0.6)';
      ctx.shadowBlur = 20;
      ctx.fill();
      ctx.restore();
    }
  }

  _drawPipes(ctx) {
    const groundY = this.height - this.cfg.groundHeight;
    for (const p of this.pipes) {
      const x = Math.floor(p.x) + 0.5; // crisp lines
      const w = this.cfg.pipeWidth;
      const topH = Math.max(0, p.gapY - p.gapH * 0.5);
      const botY = Math.min(groundY, p.gapY + p.gapH * 0.5);
      const botH = Math.max(0, groundY - botY);

      const gradTop = ctx.createLinearGradient(x, 0, x + w, 0);
      gradTop.addColorStop(0, 'hsl(120,45%,36%)');
      gradTop.addColorStop(1, 'hsl(120,55%,42%)');
      const gradBot = ctx.createLinearGradient(x, botY, x + w, botY);
      gradBot.addColorStop(0, 'hsl(120,45%,36%)');
      gradBot.addColorStop(1, 'hsl(120,55%,42%)');

      // Top pipe
      ctx.fillStyle = gradTop;
      ctx.fillRect(x, 0, w, topH);
      // Bottom pipe
      ctx.fillStyle = gradBot;
      ctx.fillRect(x, botY, w, botH);

      // Edge highlights
      ctx.strokeStyle = 'rgba(255,255,255,0.18)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(x + 3, 0);
      ctx.lineTo(x + 3, topH);
      ctx.moveTo(x + 3, botY);
      ctx.lineTo(x + 3, botY + botH);
      ctx.stroke();
    }
  }

  _drawGround(ctx) {
    const y = this.height - this.cfg.groundHeight;
    // Dirt gradient
    const g = ctx.createLinearGradient(0, y, 0, this.height);
    g.addColorStop(0, 'hsl(32,60%,60%)');
    g.addColorStop(1, 'hsl(32,45%,40%)');
    ctx.fillStyle = g;
    ctx.fillRect(0, y, this.width, this.cfg.groundHeight);

    // Grass top
    ctx.fillStyle = 'hsl(120,45%,45%)';
    ctx.fillRect(0, y - 6, this.width, 8);
  }

  _drawBird(ctx) {
    ctx.save();
    ctx.translate(this.bird.x, this.bird.y);
    ctx.rotate(this.bird.rot);

    // Body
    const r = this.bird.r;
    const bodyGrad = ctx.createRadialGradient(-r * 0.2, -r * 0.2, r * 0.2, 0, 0, r);
    bodyGrad.addColorStop(0, 'hsl(45,100%,85%)');
    bodyGrad.addColorStop(1, 'hsl(35,100%,55%)');
    ctx.fillStyle = bodyGrad;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();

    // Wing
    ctx.save();
    ctx.translate(-r * 0.1, 0);
    ctx.rotate(Math.sin(performance.now() / 100) * 0.2);
    ctx.fillStyle = 'hsl(35,100%,65%)';
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.7, r * 0.45, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Eye
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(r * 0.35, -r * 0.2, r * 0.28, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(r * 0.42, -r * 0.18, r * 0.12, 0, Math.PI * 2);
    ctx.fill();

    // Beak
    ctx.fillStyle = 'hsl(40,100%,45%)';
    ctx.beginPath();
    ctx.moveTo(r * 0.9, 0);
    ctx.lineTo(r * 0.55, r * 0.12);
    ctx.lineTo(r * 0.55, -r * 0.12);
    ctx.closePath();
    ctx.fill();

    // Subtle glow
    ctx.globalAlpha = 0.25;
    ctx.shadowColor = 'rgba(255,220,100,0.6)';
    ctx.shadowBlur = 20;
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.2, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  _drawHUD(ctx) {
    ctx.save();
    // Left: best score
    ctx.fillStyle = 'rgba(0,0,0,0.25)';
    ctx.font = 'bold 28px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    ctx.fillText(`Best: ${this.best}`, 16, 12);

    // Right: sound indicator and hint
    ctx.textAlign = 'right';
    ctx.font = 'bold 20px system-ui, -apple-system, Segoe UI, Roboto, Arial';
    const soundIcon = (window.SFX && window.SFX.enabled) ? '🔊' : '🔇';
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillText(`${soundIcon} M`, this.width - 16, 14);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    if (this.state === 'playing') {
      ctx.fillStyle = 'rgba(255,255,255,0.92)';
      ctx.strokeStyle = 'rgba(0,0,0,0.35)';
      ctx.lineWidth = 6;
      ctx.font = 'bold 64px system-ui, -apple-system, Segoe UI, Roboto, Arial';
      ctx.strokeText(String(this.score), this.width / 2, 70);
      ctx.fillText(String(this.score), this.width / 2, 70);
    } else if (this.state === 'ready') {
      this._drawCenteredText(ctx, 'Flappy Clone', this.width / 2, this.height * 0.35, 46);
      this._drawCenteredText(ctx, 'Press Space / Click / Tap to start', this.width / 2, this.height * 0.55, 22);
    } else if (this.state === 'gameover') {
      this._drawCenteredText(ctx, 'Game Over', this.width / 2, this.height * 0.35, 46);
      this._drawCenteredText(ctx, `Score: ${this.score}  •  Best: ${this.best}`, this.width / 2, this.height * 0.5, 26);
      this._drawCenteredText(ctx, 'Press Space / Click / Tap to restart', this.width / 2, this.height * 0.62, 20);
    }

    ctx.restore();
  }

  _drawCenteredText(ctx, text, x, y, size) {
    ctx.save();
    ctx.font = `bold ${size}px system-ui, -apple-system, Segoe UI, Roboto, Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineWidth = Math.max(2, Math.floor(size / 10));
    ctx.strokeStyle = 'rgba(0,0,0,0.35)';
    ctx.fillStyle = '#fff';
    ctx.strokeText(text, x, y);
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  // Geometry helpers
  _circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
    // clamp point on rect to circle center
    const nx = Math.max(rx, Math.min(cx, rx + rw));
    const ny = Math.max(ry, Math.min(cy, ry + rh));
    const dx = cx - nx;
    const dy = cy - ny;
    return dx * dx + dy * dy <= cr * cr;
  }
  _rand(min, max) { return min + Math.random() * (max - min); }
  _lerp(a, b, t) { return a + (b - a) * t; }
  _map(v, a, b, c, d) { return c + (v - a) * (d - c) / (b - a); }
}

window.FlappyGame = FlappyGame;