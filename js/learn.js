// ══════════════════════════════════════════════════════════════
//  LEARN TAB — teach as you touch. Original lessons, written for this app.
//  Self-contained: no dependency on prism-gauge1 globals. Progress lives
//  only on this device, in localStorage keys prism-gauge1-learn-*.
// ══════════════════════════════════════════════════════════════
(function () {
  var panel = document.getElementById('tab-learn');
  if (!panel) return;

  // ---------- colour helpers ----------
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    return { r: parseInt(hex.slice(0, 2), 16), g: parseInt(hex.slice(2, 4), 16), b: parseInt(hex.slice(4, 6), 16) };
  }
  function rgbToHex(r, g, b) {
    function h(v) { var s = Math.round(Math.max(0, Math.min(255, v))).toString(16); return s.length === 1 ? '0' + s : s; }
    return '#' + h(r) + h(g) + h(b);
  }
  function rgbToHsl(r, g, b) {
    r /= 255; g /= 255; b /= 255;
    var max = Math.max(r, g, b), min = Math.min(r, g, b), h = 0, s = 0, l = (max + min) / 2;
    if (max !== min) {
      var d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
      else if (max === g) h = (b - r) / d + 2;
      else h = (r - g) / d + 4;
      h *= 60;
    }
    return { h: h, s: s, l: l };
  }
  function hslToRgb(h, s, l) {
    h = ((h % 360) + 360) % 360;
    var c = (1 - Math.abs(2 * l - 1)) * s, x = c * (1 - Math.abs(((h / 60) % 2) - 1)), m = l - c / 2, r, g, b;
    if (h < 60) { r = c; g = x; b = 0; } else if (h < 120) { r = x; g = c; b = 0; }
    else if (h < 180) { r = 0; g = c; b = x; } else if (h < 240) { r = 0; g = x; b = c; }
    else if (h < 300) { r = x; g = 0; b = c; } else { r = c; g = 0; b = x; }
    return { r: (r + m) * 255, g: (g + m) * 255, b: (b + m) * 255 };
  }
  function setSwatch(el, hex, label) {
    if (!el) return;
    el.style.background = hex;
    el.innerHTML = '<span>' + label + '</span><span>' + hex.toUpperCase() + '</span>';
  }

  // ---------- Lesson 1: tint vs shade ----------
  var tintBase = document.getElementById('learn-tint-base');
  var tintSlider = document.getElementById('learn-tint-slider');
  var tintResult = document.getElementById('learn-tint-result');
  var tintExplain = document.getElementById('learn-tint-explain');
  function renderTint() {
    if (!tintBase || !tintSlider || !tintResult) return;
    var base = hexToRgb(tintBase.value), v = parseInt(tintSlider.value, 10), out;
    if (v >= 0) {
      // Tint: move toward white. White bounces more light back, so the
      // colour reads lighter and softer — and a little chalkier.
      var t = v / 100;
      out = { r: base.r + (255 - base.r) * t, g: base.g + (255 - base.g) * t, b: base.b + (255 - base.b) * t };
    } else {
      // Shade: move toward black. Black soaks light up, so the colour
      // reads darker and heavier — and a little duller.
      var s = -v / 100;
      out = { r: base.r * (1 - s), g: base.g * (1 - s), b: base.b * (1 - s) };
    }
    var hex = rgbToHex(out.r, out.g, out.b);
    setSwatch(tintResult, hex, v === 0 ? 'Your base colour' : (v > 0 ? 'Tint: +' + v + '% white' : 'Shade: ' + (-v) + '% black'));
    if (tintExplain) {
      tintExplain.textContent = v === 0 ? 'This is your base colour, untouched. Drag either way to see the why.'
        : v > 0 ? 'Tint: white bounces more light back, so the colour reads lighter and softer. Push it too far and it goes chalky and loses its punch.'
        : 'Shade: black soaks light up, so the colour reads darker and heavier. Push it too far and it goes dull and muddy.';
    }
  }
  if (tintBase) tintBase.addEventListener('input', renderTint);
  if (tintSlider) tintSlider.addEventListener('input', renderTint);
  renderTint();

  // ---------- Lesson 3: depth palette ----------
  var depthBase = document.getElementById('learn-depth-base');
  function renderDepth() {
    if (!depthBase) return;
    var base = hexToRgb(depthBase.value), hsl = rgbToHsl(base.r, base.g, base.b);
    // Near: the colour as it really is — full strength, warm, saturated.
    setSwatch(document.getElementById('learn-depth-near'), depthBase.value, 'NEAR — full & warm');
    // Mid: a step back — a little lighter, a little duller.
    var mid = hslToRgb(hsl.h, hsl.s * 0.7, Math.min(0.9, hsl.l + 0.12));
    setSwatch(document.getElementById('learn-depth-mid'), rgbToHex(mid.r, mid.g, mid.b), 'MID — softer');
    // Far: air gets in the way — lighter, cooler (shifted toward blue),
    // and much duller. That is atmospheric perspective as a colour choice.
    var farH = hsl.h + (220 - hsl.h) * 0.35;
    var far = hslToRgb(farH, hsl.s * 0.35, Math.min(0.92, hsl.l + 0.28));
    setSwatch(document.getElementById('learn-depth-far'), rgbToHex(far.r, far.g, far.b), 'FAR — light, cool, dull');
  }
  if (depthBase) depthBase.addEventListener('input', renderDepth);
  renderDepth();

  // ---------- Lesson 4: try it in Practice ----------
  var tryBtn = document.getElementById('learn-try-practice');
  if (tryBtn) {
    tryBtn.addEventListener('click', function () {
      var btn = document.querySelector('.tab-btn[data-tab="practice"], .nav-btn[data-tab="practice"]');
      if (btn) btn.click();
    });
  }

  // ---------- Progress: device only ----------
  var lessons = ['tint', 'acrylic', 'depth', 'horizon', 'where', 'truths'];
  var progressEl = document.getElementById('learn-progress');
  function key(id) { return 'prism-gauge1-learn-' + id; }
  function isDone(id) { try { return localStorage.getItem(key(id)) === '1'; } catch (e) { return false; } }
  function refreshProgress() {
    var done = lessons.filter(isDone).length;
    if (progressEl) progressEl.textContent = done + ' of ' + lessons.length + ' tried';
    lessons.forEach(function (id) {
      var card = document.getElementById('learn-card-' + id);
      var btn = document.getElementById('learn-done-' + id);
      if (card) card.classList.toggle('done', isDone(id));
      if (btn) { btn.textContent = isDone(id) ? '✓ Tried' : 'Mark as tried'; btn.classList.toggle('done', isDone(id)); }
    });
  }
  lessons.forEach(function (id) {
    var btn = document.getElementById('learn-done-' + id);
    if (btn) {
      btn.addEventListener('click', function () {
        try {
          if (isDone(id)) localStorage.removeItem(key(id));
          else localStorage.setItem(key(id), '1');
        } catch (e) { /* private mode: progress just won't stick */ }
        refreshProgress();
      });
    }
  });
  refreshProgress();
})();
