window.addEventListener("DOMContentLoaded", function() {
    window.game = new PlatformerGame();
});

class PlatformerGame {
    constructor() {
        this.canvas = document.getElementById("game-canvas");
        this.ctx = this.canvas.getContext("2d");
        this.width = this.canvas.width;
        this.height = this.canvas.height;
        this.cameraX = 0;

        // Game state
        this.inputState = { left: false, right: false, up: false, jump: false };
        this.running = true;
        this.showMessage = "";
        this.messageTimer = 0;

        // Level
        const generatePlatforms = window.generatePlatforms;
        this.platforms = generatePlatforms();

        // Entities
        const PlayerEntity = window.PlayerEntity;
        const EnemyEntity = window.EnemyEntity;
        this.player = new PlayerEntity(this.platforms);

        // Enemies
        this.enemies = [];
        for (let i = 0; i < 3; ++i) {
            this.enemies.push(new EnemyEntity(this.platforms, i));
        }

        // Bind input
        this.setupInput();

        // HUD
        this.setupHUD();

        // Focus canvas for keyboard
        setTimeout(() => { this.canvas.focus(); }, 100);

        // Start loop
        this.lastTime = performance.now();
        this.render();
    }

    setupInput() {
        const input = this.inputState;
        const canvas = this.canvas;

        window.addEventListener("keydown", (e) => {
            switch (e.code) {
                case "ArrowLeft":
                case "KeyA": input.left = true; break;
                case "ArrowRight":
                case "KeyD": input.right = true; break;
                case "ArrowUp":
                case "KeyW":
                case "Space": input.up = input.jump = true; break;
            }
        });
        window.addEventListener("keyup", (e) => {
            switch (e.code) {
                case "ArrowLeft":
                case "KeyA": input.left = false; break;
                case "ArrowRight":
                case "KeyD": input.right = false; break;
                case "ArrowUp":
                case "KeyW":
                case "Space": input.up = input.jump = false; break;
            }
        });
        // Canvas focus for accessibility
        canvas.addEventListener("mousedown", () => { canvas.focus(); });
        canvas.addEventListener("touchstart", () => { canvas.focus(); });
    }

    setupHUD() {
        this.ui = document.getElementById("ui-overlay");
        this.hud = document.createElement("div");
        this.hud.id = "hud";
        this.ui.appendChild(this.hud);
    }

    updateGameLogic() {
        // Player
        this.player.update(this.inputState);

        // Respawn if dead
        if (!this.player.alive) {
            if (typeof this.player.respawnTimeout === "number") {
                this.player.respawnTimeout--;
                if (this.player.respawnTimeout <= 0) {
                    this.player.respawn();
                }
            }
        }

        // Enemies
        for (const enemy of this.enemies) {
            enemy.update();
        }

        // Player-enemy collisions
        if (this.player.alive && this.player.invuln === 0) {
            for (const enemy of this.enemies) {
                if (!enemy.alive) continue;
                const dx = this.player.position.x - enemy.position.x;
                const dy = this.player.position.y - enemy.position.y;
                const dist = Math.sqrt(dx*dx + dy*dy);
                if (dist < this.player.radius + enemy.radius - 4) {
                    // If player is falling, defeat enemy
                    if (this.player.velocity.y > 1 && dy > 0) {
                        if (enemy.hit()) {
                            this.player.velocity.y = -window.PlatformerConstants.jumpVelocity * 0.7;
                            this.player.score++;
                            this.flashMessage("+1! Enemy defeated!", 1.1);
                        }
                    } else {
                        this.player.die();
                        this.flashMessage("Ouch! Respawn...", 1.5);
                        break;
                    }
                }
            }
        }

        // Win condition
        if (this.player.score >= window.PlatformerConstants.winScore && !this.showMessage) {
            this.running = false;
            this.flashMessage("You win! 🎉", 3, true);
        }
    }

    flashMessage(msg, dur, stopGame) {
        this.showMessage = msg;
        this.messageTimer = (dur || 1.2) * 60;
        if (stopGame) {
            this.running = false;
            setTimeout(() => {
                this.resetGame();
            }, (dur || 2.2) * 1000);
        }
    }

    resetGame() {
        // Reset everything
        this.platforms = window.generatePlatforms();
        this.player = new window.PlayerEntity(this.platforms);
        this.enemies = [];
        for (let i = 0; i < 3; ++i) {
            this.enemies.push(new window.EnemyEntity(this.platforms, i));
        }
        this.cameraX = 0;
        this.running = true;
        this.showMessage = "";
        this.messageTimer = 0;
    }

    renderBackground(ctx) {
        // Procedural sky gradient and clouds
        ctx.save();
        ctx.clearRect(0, 0, this.width, this.height);

        // Distant "parallax" gradient sky
        const grad = ctx.createLinearGradient(0, 0, 0, this.height);
        grad.addColorStop(0, "hsl(210,80%,76%)");
        grad.addColorStop(0.45, "hsl(210,80%,60%)");
        grad.addColorStop(0.7, "hsl(210,70%,50%)");
        grad.addColorStop(1, "hsl(210,60%,30%)");
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.width, this.height);

        // Floating clouds
        for (let i = 0; i < 7; ++i) {
            const t = performance.now() / (11000 + i*3000);
            const cx = (i*380 + 120 + 330 * Math.sin(t + i*0.8)) - this.cameraX*0.2;
            const cy = 56 + 42 * Math.cos(t * 0.8 + i);
            ctx.save();
            ctx.globalAlpha = 0.25 + 0.16 * Math.sin(t + i*1.2);
            ctx.beginPath();
            ctx.ellipse(cx, cy, 65 + 14*i, 24 + 6*i, 0, 0, Math.PI*2);
            ctx.fillStyle = "hsl(210,90%,97%)";
            ctx.shadowColor = "hsl(210,80%,90%)";
            ctx.shadowBlur = 32;
            ctx.fill();
            ctx.restore();
        }

        // Parallax hills
        for (let i = 0; i < 2; ++i) {
            ctx.save();
            ctx.globalAlpha = 0.34 + 0.13*i;
            ctx.beginPath();
            ctx.moveTo(0, this.height - 120 - 40*i);
            for (let x = 0; x <= this.width; x += 24) {
                const y = this.height - 120 - 40*i - 20*Math.sin((x + this.cameraX*0.19 + i*200) / (110 + 40*i));
                ctx.lineTo(x, y);
            }
            ctx.lineTo(this.width, this.height);
            ctx.lineTo(0, this.height);
            ctx.closePath();
            ctx.fillStyle = i === 0 ? "hsl(130,40%,62%)" : "hsl(110,30%,50%)";
            ctx.fill();
            ctx.restore();
        }
        ctx.restore();
    }

    renderPlatforms(ctx) {
        // Platforms with gradients and rounded corners
        for (const plat of this.platforms) {
            ctx.save();
            ctx.beginPath();
            ctx.moveTo(plat.x - this.cameraX + window.PlatformerConstants.platformRadius, plat.y);
            ctx.lineTo(plat.x - this.cameraX + plat.width - window.PlatformerConstants.platformRadius, plat.y);
            ctx.quadraticCurveTo(
                plat.x - this.cameraX + plat.width, plat.y,
                plat.x - this.cameraX + plat.width, plat.y + window.PlatformerConstants.platformRadius
            );
            ctx.lineTo(plat.x - this.cameraX + plat.width, plat.y + plat.height - window.PlatformerConstants.platformRadius);
            ctx.quadraticCurveTo(
                plat.x - this.cameraX + plat.width, plat.y + plat.height,
                plat.x - this.cameraX + plat.width - window.PlatformerConstants.platformRadius, plat.y + plat.height
            );
            ctx.lineTo(plat.x - this.cameraX + window.PlatformerConstants.platformRadius, plat.y + plat.height);
            ctx.quadraticCurveTo(
                plat.x - this.cameraX, plat.y + plat.height,
                plat.x - this.cameraX, plat.y + plat.height - window.PlatformerConstants.platformRadius
            );
            ctx.lineTo(plat.x - this.cameraX, plat.y + window.PlatformerConstants.platformRadius);
            ctx.quadraticCurveTo(
                plat.x - this.cameraX, plat.y,
                plat.x - this.cameraX + window.PlatformerConstants.platformRadius, plat.y
            );
            ctx.closePath();
            // Gradient fill
            const grad = ctx.createLinearGradient(plat.x - this.cameraX, plat.y, plat.x - this.cameraX, plat.y + plat.height);
            grad.addColorStop(0, "hsl(32,60%,72%)");
            grad.addColorStop(0.55, "hsl(32,60%,57%)");
            grad.addColorStop(1, "hsl(32,45%,35%)");
            ctx.fillStyle = grad;
            ctx.shadowColor = "rgba(80,40,10,0.12)";
            ctx.shadowBlur = 18;
            ctx.fill();
            // Top highlight
            ctx.save();
            ctx.globalAlpha = 0.18;
            ctx.beginPath();
            ctx.moveTo(plat.x - this.cameraX + 6, plat.y + 3);
            ctx.lineTo(plat.x - this.cameraX + plat.width - 6, plat.y + 3);
            ctx.lineWidth = 6;
            ctx.strokeStyle = "#fff";
            ctx.stroke();
            ctx.restore();

            ctx.restore();
        }
    }

    renderEnemies(ctx) {
        for (const enemy of this.enemies) {
            enemy.render(ctx, this.cameraX);
        }
    }

    renderHUD() {
        this.hud.innerHTML =
            `<span>Score: <b>${this.player.score}</b></span> &nbsp;` +
            `<span>Enemies: <b>${this.enemies.filter(e=>e.alive).length}</b></span>`;
    }

    renderMessage() {
        if (this.showMessage) {
            if (!this.uiMessageEl) {
                this.uiMessageEl = document.createElement("div");
                this.uiMessageEl.className = "ui-message";
                this.ui.appendChild(this.uiMessageEl);
            }
            this.uiMessageEl.innerText = this.showMessage;
            this.uiMessageEl.style.display = "inline-block";
        } else if (this.uiMessageEl) {
            this.uiMessageEl.style.display = "none";
        }
    }

    updateCamera() {
        // Camera follows player, limited by world bounds
        const Constants = window.PlatformerConstants;
        let targetCam = this.player.position.x - this.width/2;
        // Clamp
        targetCam = Math.max(0, Math.min(Constants.worldWidth - this.width, targetCam));
        // Smooth
        this.cameraX += (targetCam - this.cameraX) * 0.13;
    }

    render = () => {
        // Time step
        const now = performance.now();
        const dt = Math.min((now - this.lastTime) / 16.666, 2.5);
        this.lastTime = now;

        // Logic
        if (this.running) this.updateGameLogic();

        // Camera
        this.updateCamera();

        // Draw
        this.renderBackground(this.ctx);
        this.renderPlatforms(this.ctx);
        this.player.render(this.ctx, this.cameraX);
        this.renderEnemies(this.ctx);

        this.renderHUD();
        this.renderMessage();

        if (this.messageTimer > 0) {
            this.messageTimer--;
            if (this.messageTimer <= 0) {
                this.showMessage = "";
            }
        }

        // Next frame
        requestAnimationFrame(this.render);
    }
}

window.PlatformerGame = PlatformerGame;