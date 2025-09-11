class EnemyEntity {
    constructor(platforms, idx) {
        const Constants = window.PlatformerConstants;
        // Place on a random platform
        const plat = platforms[Math.floor(Math.random() * (platforms.length - 1))];
        this.position = {
            x: plat.x + 50 + Math.random() * (plat.width - 100),
            y: plat.y - Constants.enemyRadius
        };
        this.platform = plat;
        this.radius = Constants.enemyRadius;
        this.color = [0, 88, 60 + idx * 70]; // HSL
        this.velocity = { x: (Math.random() > 0.5 ? 1 : -1) * (1.1 + Math.random() * 0.6), y: 0 };
        this.state = "patrol"; // Could expand for more AI
        this.direction = this.velocity.x > 0 ? 1 : -1;
        this.alive = true;
        this.frameOffset = Math.random() * 1000;
        this.hitCooldown = 0;
    }

    update() {
        if (!this.alive) return;
        const Constants = window.PlatformerConstants;

        // Patrol logic
        this.position.x += this.velocity.x;
        // Bounce at edge of platform
        if (this.position.x < this.platform.x + this.radius) {
            this.position.x = this.platform.x + this.radius;
            this.velocity.x *= -1;
        }
        if (this.position.x > this.platform.x + this.platform.width - this.radius) {
            this.position.x = this.platform.x + this.platform.width - this.radius;
            this.velocity.x *= -1;
        }
        this.direction = this.velocity.x > 0 ? 1 : -1;

        // Animation
        if (this.hitCooldown > 0) this.hitCooldown--;
    }

    render(ctx, cameraX) {
        if (!this.alive) return;
        // Spiky ball with gradient
        const { x, y } = this.position;
        ctx.save();
        ctx.translate(x - cameraX, y);

        // Pulsate
        const pulse = 1 + 0.12 * Math.sin((performance.now() + this.frameOffset) / 230);

        // Glow
        ctx.save();
        ctx.globalAlpha = 0.26 + 0.18 * Math.sin((performance.now() + this.frameOffset) / 180);
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * 1.23 * pulse, 0, Math.PI * 2);
        ctx.fillStyle = "hsl(0,88%,88%)";
        ctx.shadowColor = "hsl(0,98%,80%)";
        ctx.shadowBlur = 16;
        ctx.fill();
        ctx.restore();

        // Spikes
        ctx.save();
        for (let i = 0; i < 10; ++i) {
            ctx.save();
            ctx.rotate((Math.PI * 2 / 10) * i + Math.sin(performance.now() / 600 + i));
            ctx.beginPath();
            ctx.moveTo(0, -this.radius * 0.92 * pulse);
            ctx.lineTo(0, -this.radius * 1.34 * pulse);
            ctx.lineWidth = 4;
            ctx.strokeStyle = "hsl(0,70%,70%)";
            ctx.shadowColor = "hsl(0,98%,80%)";
            ctx.shadowBlur = 7;
            ctx.stroke();
            ctx.restore();
        }
        ctx.restore();

        // Body
        ctx.beginPath();
        ctx.arc(0, 0, this.radius * pulse, 0, Math.PI * 2);
        const grad = ctx.createRadialGradient(0, 0, this.radius * 0.18, 0, 0, this.radius * pulse);
        grad.addColorStop(0, "hsl(0,96%,99%)");
        grad.addColorStop(0.22, "hsl(0,90%,89%)");
        grad.addColorStop(0.65, "hsl(0,80%,61%)");
        grad.addColorStop(1, "hsl(0,80%,41%)");
        ctx.fillStyle = grad;
        ctx.shadowColor = "hsl(0,98%,74%)";
        ctx.shadowBlur = 10;
        ctx.fill();

        // Face (angry eyes)
        ctx.save();
        ctx.rotate(this.direction * 0.1);
        ctx.beginPath();
        ctx.arc(-7, -8, 2.3, 0, Math.PI * 2);
        ctx.arc(7, -8, 2.3, 0, Math.PI * 2);
        ctx.fillStyle = "#fff";
        ctx.fill();
        ctx.beginPath();
        ctx.arc(-7, -8, 1.1, 0, Math.PI * 2);
        ctx.arc(7, -8, 1.1, 0, Math.PI * 2);
        ctx.fillStyle = "#a00";
        ctx.fill();
        // Frown
        ctx.beginPath();
        ctx.moveTo(-6, 5);
        ctx.quadraticCurveTo(0, -1, 7, 5);
        ctx.lineWidth = 1.2;
        ctx.strokeStyle = "#222";
        ctx.stroke();
        ctx.restore();

        ctx.restore();
    }

    hit() {
        if (this.hitCooldown > 0) return false;
        this.alive = false;
        this.hitCooldown = 40;
        return true;
    }
}
window.EnemyEntity = EnemyEntity;