(function(){
  window.Game = window.Game || {};
  const MathUtil = {
    circleRectCollide(cx, cy, cr, rx, ry, rw, rh) {
      const nx = Math.max(rx, Math.min(cx, rx + rw));
      const ny = Math.max(ry, Math.min(cy, ry + rh));
      const dx = cx - nx;
      const dy = cy - ny;
      return dx * dx + dy * dy <= cr * cr;
    },
    rand(min, max) { return min + Math.random() * (max - min); },
    lerp(a, b, t) { return a + (b - a) * t; },
    map(v, a, b, c, d) { return c + (v - a) * (d - c) / (b - a); }
  };
  window.Game.Math = MathUtil;
})();