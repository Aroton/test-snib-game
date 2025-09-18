# test-snib-game
Game project created in Snib AI Studio

## Overview
Simple Flappy-style game with lightweight, procedural sound effects (Web Audio API). No external dependencies.

## Sound System
- sounds.js exposes a global SFX object:
  - Methods: playFlap(), playScore(), playHit(), setMuted(boolean)
  - Internals: tone() and noise() generators with ADSR-like envelopes and frequency sweeps
- index.html includes sounds.js before game.js so SFX is available when the game starts.
- Audio begins after the first user interaction due to browser autoplay policies.

## Integration Points (game.js)
- Flap: calls SFX.playFlap() in flap()
- Score: calls SFX.playScore() when a pipe is passed
- Game Over: calls SFX.playHit() in gameOver()
- HUD: top-right shows 🔊/🔇 with an “M” hint

## Controls
- Space / ArrowUp / W / Click / Tap: flap (starts game from ready; restarts from game over)
- M: toggle mute/unmute (HUD icon updates)

## Customization
- Master volume: in sounds.js, adjust this.master.gain.value (default 0.22)
- Tweak sound character: edit parameters in playFlap, playScore, and playHit (waveform, frequency, duration, envelope)
- Programmatic mute: SFX.setMuted(true|false)