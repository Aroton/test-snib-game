class PlayerEntity {
    constructor(platforms) {
        const Constants = window.PlatformerConstants;
        this.spawnPoint = { x: 70, y: 350 };
        this.position = { x: this.spawnPoint.x, y: this.spawnPoint.y };
        this.velocity = { x: 0, y: 0 };
        this.radius = Constants.playerRadius;
        this.color = [110, 220, 120]; // HSL
        this.onGround = false;
        this.jumpQueued = false;
        this.platforms = platforms;
        this.score = 0;
        this.alive = true;
        this.jumpCooldown = 0;
        this.invuln = 0;
        this.facing = 1;
        this.trail = [];

        // Sprite image setup (Clay Golem)
        if (!window._playerClayGolemImg) {
            const img = new window.Image();
            img.src = "https://dcnmwoxzefwqmvvkpqap.supabase.co/storage/v1/object/public/sprite-studio-exports/e40b3d0f-9890-47e4-a303-4557665bbfa8/library/Clay_Golem_1757468694982.png";
            window._playerClayGolemImg = img;
        }
        this.spriteImg = window._playerClayGolemImg;
        // Sprite size (from image: 64x64, but we can scale to fit radius)
        this.spriteWidth = 64;
        this.spriteHeight = 64;
    }

    update(inputState) {
        const Constants = window.PlatformerConstants;
        if (!this.alive) return;
        // Movement
        let move = 0;
        if (inputState.left) move -= 1;
        if (inputState.right) move += 1;
        this.velocity.x = move * Constants.moveSpeed;

        // Facing
        if (move !== 0) this.facing = move;

        // Gravity
        this.velocity.y += Constants.gravity;
        if (this.velocity.y > 15) this.velocity.y = 15;

        // Jumping
        if (this.onGround && (inputState.up || inputState.jump) && this.jumpCooldown <= 0) {
            this.velocity.y = -Constants.jumpVelocity;
            this.onGround = false;
            this.jumpCooldown = 10;
        }
        if (this.jumpCooldown > 0) this.jumpCooldown--;

        // Position update
        this.position.x += this.velocity.x;
        this.position.y += this.velocity.y;

        // Collision with platforms
        this.handlePlatformCollision();

        // Trail update for motion effect
        this.trail.push({
            x: this.position.x, y: this.position.y,
            frame: performance.now() + Math.random() * 20
        });
        if (this.trail.length > 16) this.trail.shift();

        // Invulnerability after hit
        if (this.invuln > 0) this.invuln--;
    }

    handlePlatformCollision() {
        const Constants = window.PlatformerConstants;
        this.onGround = false;
        for (const plat of this.platforms) {
            // Only check if falling
            if (this.velocity.y >= 0) {
                const px = this.position.x;
                const py = this.position.y + this.radius;
                if (
                    px > plat.x - this.radius &&
                    px < plat.x + plat.width + this.radius &&
                    py > plat.y - 2 &&
                    py < plat.y + plat.height
                ) {
                    // Landed on platform
                    this.position.y = plat.y - this.radius;
                    this.velocity.y = 0;
                    this.onGround = true;
                }
            }
            // Horizontal collision (simple)
            if (
                this.position.x + this.radius > plat.x &&
                this.position.x - this.radius < plat.x + plat.width &&
                this.position.y + this.radius > plat.y &&
                this.position.y - this.radius < plat.y + plat.height
            ) {
                // Prevent going through from sides
                if (this.velocity.x > 0) {
                    this.position.x = plat.x - this.radius - 1;
                } else if (this.velocity.x < 0) {
                    this.position.x = plat.x + plat.width + this.radius + 1;
                }
            }
        }
        // World bounds
        if (this.position.x < this.radius) this.position.x = this.radius;
        if (this.position.x > Constants.worldWidth - this.radius) this.position.x = Constants.worldWidth - this.radius;
        if (this.position.y > 600) this.die();
    }

    die() {
        this.alive = false;
        this.respawnTimeout = 60;
    }

    respawn() {
        this.position = { x: this.spawnPoint.x, y: this.spawnPoint.y };
        this.velocity = { x: 0, y: 0 };
        this.alive = true;
        this.invuln = 40;
    }

    render(ctx, cameraX) {
        const Constants = window.PlatformerConstants;
        // Trail (keep as glowing effect)
        ctx.save();
        this.trail.forEach((t, i) => {
            const alpha = (i + 1) / this.trail.length * 0.32;
            ctx.beginPath();
            ctx.arc(t.x - cameraX, t.y, this.radius * 0.85, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(120, 235, 145, ${alpha})`;
            ctx.shadowColor = "rgba(120,250,170,0.16)";
            ctx.shadowBlur = 8;
            ctx.fill();
        });
        ctx.restore();

        // Main sprite
        ctx.save();
        ctx.translate(this.position.x - cameraX, this.position.y);

        // Blink effect for invulnerability (like original)
        let doDraw = true;
        if (this.invuln > 0 && this.alive) {
            if (Math.floor(this.invuln / 2) % 2 === 0) doDraw = false;
        }

        if (doDraw) {
            // Facing: flip horizontally if facing left
            ctx.scale(this.facing, 1);

            // Scale sprite to fit the player radius
            // The sprite is 64x64, we want it to fit in a circle of radius this.radius
            // So, scale to 2*radius for both width and height
            const drawW = this.radius * 2;
            const drawH = this.radius * 2;
            ctx.drawImage(
                this.spriteImg,
                -drawW / 2,
                -drawH / 2,
                drawW,
                drawH
            );
        }
        ctx.restore();

        // Glow when invuln
        if (this.invuln > 0 && this.alive) {
            ctx.save();
            ctx.globalAlpha = 0.45 * (0.5 + 0.5 * Math.sin(performance.now() / 80));
            ctx.beginPath();
            ctx.arc(this.position.x - cameraX, this.position.y, this.radius + 7, 0, Math.PI * 2);
            ctx.fillStyle = "rgba(210,255,200,0.67)";
            ctx.shadowColor = "rgba(120,255,120,0.85)";
            ctx.shadowBlur = 35;
            ctx.fill();
            ctx.restore();
        }
    }
}
window.PlayerEntity = PlayerEntity;