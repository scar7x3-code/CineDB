/**
 * CineDB header logo — simplified cartoon popcorn bucket (canvas).
 * Colors read from :root CSS variables (--accent, --surface, --text).
 */
(function () {
  'use strict';

  const LOGICAL = 48;
  const OUTLINE = 2.15;
  const JOIN = 'round';

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function roundRect(ctx, x, y, w, h, r) {
    const rr = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + rr, y);
    ctx.arcTo(x + w, y, x + w, y + h, rr);
    ctx.arcTo(x + w, y + h, x, y + h, rr);
    ctx.arcTo(x, y + h, x, y, rr);
    ctx.arcTo(x, y, x + w, y, rr);
    ctx.closePath();
  }

  function bucketPath(ctx) {
    const yTop = 25.1;
    const yBot = 39.2;
    ctx.beginPath();
    ctx.moveTo(9.2, yTop);
    ctx.lineTo(38.8, yTop);
    ctx.lineTo(35.6, yBot);
    ctx.quadraticCurveTo(24, 41.8, 12.4, yBot);
    ctx.closePath();
  }

  function popcornPath(ctx) {
    ctx.beginPath();
    ctx.moveTo(11, 21.5);
    ctx.quadraticCurveTo(8.5, 17, 11.5, 13.5);
    ctx.quadraticCurveTo(12, 9, 17, 10);
    ctx.quadraticCurveTo(20, 6.5, 24, 7.2);
    ctx.quadraticCurveTo(28, 6.2, 32, 9.5);
    ctx.quadraticCurveTo(36.5, 10.5, 37.5, 15);
    ctx.quadraticCurveTo(39, 18.5, 36.5, 22);
    ctx.quadraticCurveTo(37, 24.5, 33, 24.2);
    ctx.quadraticCurveTo(28.5, 25.8, 24, 24.5);
    ctx.quadraticCurveTo(19.5, 26, 15, 24.5);
    ctx.quadraticCurveTo(10.5, 24.8, 11, 21.5);
    ctx.closePath();
  }

  function drawStripes(ctx, accent, centerLight, gutter) {
    const x0 = 9.2;
    const x1 = 38.8;
    const y0 = 25.4;
    const y1 = 39;
    const w = x1 - x0;
    const n = 5;
    const sw = w / n;
    const dark = 'rgba(0,0,0,0.38)';
    const light = 'rgba(255,255,255,0.22)';

    for (let i = 0; i < n; i++) {
      const x = x0 + i * sw;
      ctx.beginPath();
      ctx.rect(x, y0, sw + 0.55, y1 - y0);

      if (i === 0 || i === 4) {
        ctx.fillStyle = gutter;
        ctx.fill();
      } else if (i === 2) {
        ctx.fillStyle = centerLight;
        ctx.fill();
      } else if (i === 1) {
        ctx.fillStyle = accent;
        ctx.fill();
        ctx.beginPath();
        ctx.rect(x + sw * 0.48, y0, sw * 0.52 + 0.2, y1 - y0);
        ctx.fillStyle = dark;
        ctx.fill();
      } else if (i === 3) {
        ctx.fillStyle = accent;
        ctx.fill();
        ctx.beginPath();
        ctx.rect(x, y0, sw * 0.52, y1 - y0);
        ctx.fillStyle = light;
        ctx.fill();
      }
    }
  }

  function draw(ctx) {
    const accent = cssVar('--accent', '#00e64d');
    const surface = cssVar('--surface', '#101010');

    const gutter = surface;
    const centerLight = '#cae5d4';

    ctx.lineJoin = JOIN;
    ctx.lineCap = 'round';

    ctx.save();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath();
    ctx.ellipse(24, 41.2, 11, 2.2, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    bucketPath(ctx);
    ctx.save();
    ctx.clip();
    ctx.fillStyle = gutter;
    ctx.fill();
    drawStripes(ctx, accent, centerLight, gutter);
    ctx.restore();

    bucketPath(ctx);
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = OUTLINE;
    ctx.stroke();

    ctx.save();
    roundRect(ctx, 6.8, 21.8, 34.4, 4.2, 1.4);
    ctx.fillStyle = centerLight;
    ctx.fill();
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = OUTLINE;
    ctx.stroke();
    ctx.restore();

    ctx.save();
    popcornPath(ctx);
    ctx.clip();
    ctx.fillStyle = '#ffcf33';
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(31, 15, 5.5, 7, 0.35, 0, Math.PI * 2);
    ctx.fillStyle = '#e6a010';
    ctx.globalAlpha = 0.55;
    ctx.fill();
    ctx.globalAlpha = 1;
    ctx.restore();

    popcornPath(ctx);
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = OUTLINE;
    ctx.stroke();

    ctx.save();
    ctx.strokeStyle = '#0a0a0a';
    ctx.lineWidth = 1.35;
    ctx.lineCap = 'round';
    [[17, 16, 0.9], [24, 14, 1], [29, 15.5, 0.85]].forEach(([x, y, s]) => {
      ctx.beginPath();
      ctx.arc(x, y, 1.8 * s, Math.PI * 0.15, Math.PI * 0.85, false);
      ctx.stroke();
    });
    ctx.restore();
  }

  function paint(canvas) {
    const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    canvas.width = Math.round(LOGICAL * dpr);
    canvas.height = Math.round(LOGICAL * dpr);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, LOGICAL, LOGICAL);
    draw(ctx);
  }

  function updateFavicon() {
    const favicon = document.querySelector('link[rel~="icon"]') || document.createElement('link');
    favicon.rel = 'icon';
    const canvas = document.createElement('canvas');
    paint(canvas);
    favicon.href = canvas.toDataURL('image/png');
    if (!favicon.parentNode) {
      document.head.appendChild(favicon);
    }
  }

  function init() {
    document.querySelectorAll('canvas.logo-popcorn').forEach(paint);
    updateFavicon();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  let t;
  window.addEventListener(
    'resize',
    function () {
      clearTimeout(t);
      t = setTimeout(init, 120);
    },
    { passive: true }
  );
})();
