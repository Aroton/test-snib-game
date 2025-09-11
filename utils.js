// Utility and constants module

const PlatformerConstants = {
    gravity: 0.5,
    moveSpeed: 4.2,
    jumpVelocity: 11,
    playerRadius: 26,
    enemyRadius: 23,
    platformHeight: 18,
    platformRadius: 14,
    bgParticleCount: 40,
    worldWidth: 2500,
    worldHeight: 1800,
    cameraEdgeMargin: 200,
    winScore: 3
};
window.PlatformerConstants = PlatformerConstants;

// Simple perlin-ish noise for background
function simpleNoise(x, y) {
    return Math.sin(x * 0.15 + Math.cos(y * 0.13)) * 0.3 + Math.cos(y * 0.11 + x * 0.07) * 0.7;
}
window.simpleNoise = simpleNoise;

// Platform generation
function generatePlatforms() {
    const platforms = [];
    let y = 430;
    let x = 80;
    let width = 150;
    for (let i = 0; i < 12; ++i) {
        platforms.push({
            x: x,
            y: y,
            width: width + Math.random() * 60,
            height: PlatformerConstants.platformHeight
        });
        x += 160 + Math.random() * 110;
        y -= 38 + Math.random() * 38;
        if (x > PlatformerConstants.worldWidth - 220) x = 120 + Math.random() * 80;
        if (y < 90) y = 430 - Math.random() * 90;
    }
    // Add ground
    platforms.push({
        x: 0,
        y: 462,
        width: PlatformerConstants.worldWidth,
        height: PlatformerConstants.platformHeight + 4
    });
    return platforms;
}
window.generatePlatforms = generatePlatforms;