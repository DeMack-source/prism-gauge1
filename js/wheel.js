// ═══════════════════════════════════════════════════════════════
// PRISM-GAUGE — wheel.js
// Color wheel rendering + harmony dot overlay + mentor hook
// ═══════════════════════════════════════════════════════════════

// ── DRAW BASE WHEEL ───────────────────────────────────────────
function drawColorWheel() {
  var canvas = document.getElementById('color-wheel-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var size = canvas.width;
  var cx = size / 2, cy = size / 2, r = size / 2 - 4;

  // Clear first
  ctx.clearRect(0, 0, size, size);

  // Draw hue/saturation wheel
  for (var angle = 0; angle < 360; angle += 0.5) {
    var startAngle = (angle - 0.25) * Math.PI / 180;
    var endAngle   = (angle + 0.25) * Math.PI / 180;
    var grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0,   'white');
    grad.addColorStop(0.5, 'hsl(' + angle + ',100%,50%)');
    grad.addColorStop(1,   'hsl(' + angle + ',100%,20%)');
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, r, startAngle, endAngle);
    ctx.closePath();
    ctx.fillStyle = grad;
    ctx.fill();
  }
}

// ── PLACE A COLOR ON THE WHEEL ────────────────────────────────
// Returns {x, y} pixel position for an rgb color on the wheel canvas
function colorToWheelXY(rgb, canvas) {
  var size   = canvas.width;
  var cx     = size / 2, cy = size / 2;
  var r      = size / 2 - 4;
  var hsl    = rgb2hsl(rgb.r, rgb.g, rgb.b);

  // Hue → angle (wheel starts at right = 0°, goes clockwise)
  // Our wheel renders hue 0 at right, increasing clockwise
  var angleRad = (hsl.h) * Math.PI / 180;

  // Saturation → radius (0% sat = center, 100% sat = edge)
  // We map sat 0–100 → 0 to r*0.95 so dots don't fall off edge
  var dotR = (hsl.s / 100) * r * 0.92;

  var x = cx + dotR * Math.cos(angleRad);
  var y = cy + dotR * Math.sin(angleRad);

  return { x: x, y: y };
}

// ── DRAW HARMONY DOTS ─────────────────────────────────────────
// Dots move in tandem with the base color: getHarmonyColors() keeps every
// scheme color at the base's saturation and lightness, offset only in hue,
// so dragging the base rotates the whole scheme and changing saturation
// moves every dot in or out together. Hidden only when the user taps
// "Hide harmony" on the Wheel tab.
function drawHarmonyDots() {
  if (typeof window !== 'undefined' && window.__showHarmony === false) return;
  var canvas = document.getElementById('color-wheel-canvas');
  if (!canvas) return;

  // Need STATE and getHarmonyColors — both available from app.js / color-math.js
  if (typeof STATE === 'undefined' || typeof getHarmonyColors === 'undefined') return;

  var ctx    = canvas.getContext('2d');
  var colors = getHarmonyColors(STATE.baseColor, STATE.activeScheme);
  var size   = canvas.width;
  var cx     = size / 2, cy = size / 2;

  colors.forEach(function(c, i) {
    var pos    = colorToWheelXY(c, canvas);
    var isBase = (i === 0);
    var hex    = rgb2hex(c.r, c.g, c.b);

    // Determine if dot is light or dark for outline contrast
    var brightness = (c.r * 299 + c.g * 587 + c.b * 114) / 1000;
    var outlineColor = brightness > 140 ? 'rgba(0,0,0,0.75)' : 'rgba(255,255,255,0.9)';

    if (isBase) {
      // Base color — larger ring with double outline
      var dotSize = 14;

      // Outer shadow ring
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, dotSize + 3, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.fill();

      // White outer ring
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, dotSize + 1.5, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';
      ctx.fill();

      // Color fill
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = hex;
      ctx.fill();

      // Inner ring indicator
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, dotSize - 5, 0, Math.PI * 2);
      ctx.strokeStyle = outlineColor;
      ctx.lineWidth = 1.5;
      ctx.stroke();

    } else {
      // Harmony colors — smaller solid dots
      var dotSize = 9;

      // Shadow
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, dotSize + 2, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(0,0,0,0.3)';
      ctx.fill();

      // White outline
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, dotSize + 1, 0, Math.PI * 2);
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.fill();

      // Color fill
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, dotSize, 0, Math.PI * 2);
      ctx.fillStyle = hex;
      ctx.fill();
    }
  });

  // Draw connecting lines between dots (subtle)
  if (colors.length > 1) {
    var positions = colors.map(function(c) { return colorToWheelXY(c, canvas); });

    ctx.beginPath();
    ctx.setLineDash([3, 4]);
    ctx.lineWidth = 1;
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';

    // Connect all dots back to base
    positions.forEach(function(pos, i) {
      if (i === 0) return;
      ctx.moveTo(positions[0].x, positions[0].y);
      ctx.lineTo(pos.x, pos.y);
    });
    ctx.stroke();
    ctx.setLineDash([]); // reset dash
  }
}

// ── FULL WHEEL RENDER ─────────────────────────────────────────
// Call this instead of drawColorWheel() alone — draws wheel + dots
function renderWheel() {
  drawColorWheel();
  drawHarmonyDots();
}

// ── PICK COLOR FROM WHEEL (geometric, so the dot follows your finger) ──
// Angle from the center = hue, distance from the center = saturation.
// This replaces the old pixel-reading pick: the old one read the painted
// pixel under your finger, so the dot never landed exactly where you put
// it and the harmony dots (which come from the base color, not the picked
// color) never moved. Here dragging sets the BASE color live, so every
// scheme dot rotates with it, in tandem, by construction.
var _wheelDrag = { dragging: false, light: 50, raf: 0 };
function _wheelRing(){
  var ring = document.getElementById('wheel-picker-ring');
  if(!ring){
    var canvas = document.getElementById('color-wheel-canvas');
    var parent = canvas && canvas.parentElement;
    if(parent && getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
    ring = document.createElement('div');
    ring.id = 'wheel-picker-ring';
    ring.style.cssText = 'position:absolute;width:40px;height:40px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 12px rgba(0,0,0,.7);transform:translate(-50%,-50%);pointer-events:none;z-index:5;display:none;';
    if(parent) parent.appendChild(ring);
  }
  return ring;
}
function pickWheelColor(e) {
  var canvas = document.getElementById('color-wheel-canvas');
  if (!canvas) return;
  var rect = canvas.getBoundingClientRect();
  var cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
  var dx = e.clientX - cx, dy = e.clientY - cy;
  var r = Math.min(rect.width, rect.height) / 2;
  var dist = Math.sqrt(dx * dx + dy * dy);
  if (dist > r) { dx = dx / dist * r; dy = dy / dist * r; dist = r; }
  var hue = (Math.atan2(dy, dx) * 180 / Math.PI + 360) % 360;
  var sat = Math.round(dist / (r * 0.92) * 100);
  sat = Math.max(0, Math.min(100, sat));
  var c = hsl2rgb(hue, sat, _wheelDrag.light);
  STATE.baseColor = c;
  STATE.wheelColor = c;
  var hex = rgb2hex(c.r, c.g, c.b);
  var sw = document.getElementById('wheel-swatch');
  if (sw) sw.style.background = hex;
  var hx = document.getElementById('wheel-hex');
  if (hx) hx.textContent = hex;
  var rg = document.getElementById('wheel-rgb');
  if (rg) rg.textContent = 'RGB ' + c.r + ', ' + c.g + ', ' + c.b;
  var spread = document.getElementById('wheel-spread');
  if (spread) spread.value = sat;
  var ring = _wheelRing();
  ring.style.left = (canvas.offsetLeft + (dx + rect.width / 2)) + 'px';
  ring.style.top = (canvas.offsetTop + (dy + rect.height / 2)) + 'px';
  ring.style.background = hex;
  ring.style.display = 'block';
  if (typeof onWheelColorPicked === 'function') onWheelColorPicked(c);
  // Redraw (wheel + tandem harmony dots) once per animation frame, not
  // once per pointer event, so a fast drag stays smooth.
  if (!_wheelDrag.raf) {
    _wheelDrag.raf = requestAnimationFrame(function(){ _wheelDrag.raf = 0; renderWheel(); });
  }
}

// ── INIT WHEEL ────────────────────────────────────────────────
function initWheel() {
  var canvas = document.getElementById('color-wheel-canvas');
  if (!canvas) return;

  // Full render — wheel + harmony dots
  renderWheel();

  // Only add event listeners once
  if (!canvas._wheelListenersAdded) {
    canvas.style.touchAction = 'none';
    canvas.addEventListener('pointerdown', function(e){
      var hsl = rgb2hsl(STATE.baseColor.r, STATE.baseColor.g, STATE.baseColor.b);
      _wheelDrag.light = hsl.l;
      _wheelDrag.dragging = true;
      canvas.setPointerCapture(e.pointerId);
      pickWheelColor(e);
      e.preventDefault();
    });
    canvas.addEventListener('pointermove', function(e){
      if (!_wheelDrag.dragging) return;
      pickWheelColor(e);
    });
    function wheelEnd(){
      if (!_wheelDrag.dragging) return;
      _wheelDrag.dragging = false;
      // Sync the Color tab, scheme grid, temperature and mentor on release.
      if (typeof renderBaseColor === 'function') renderBaseColor();
    }
    canvas.addEventListener('pointerup', wheelEnd);
    canvas.addEventListener('pointercancel', wheelEnd);
    canvas._wheelListenersAdded = true;
  }
  // Scheme buttons + spread slider + harmony toggle (bound once).
  if (!canvas._wheelControlsAdded) {
    document.querySelectorAll('.wheel-scheme-btn').forEach(function(b){
      b.addEventListener('click', function(){
        STATE.activeScheme = b.getAttribute('data-scheme');
        document.querySelectorAll('.wheel-scheme-btn').forEach(function(x){ x.classList.toggle('active', x === b); });
        renderWheel();
        if (typeof renderBaseColor === 'function') renderBaseColor();
      });
    });
    var spread = document.getElementById('wheel-spread');
    if (spread) {
      spread.addEventListener('input', function(){
        var hsl = rgb2hsl(STATE.baseColor.r, STATE.baseColor.g, STATE.baseColor.b);
        var c = hsl2rgb(hsl.h, parseInt(spread.value, 10), hsl.l);
        STATE.baseColor = c; STATE.wheelColor = c;
        var hex = rgb2hex(c.r, c.g, c.b);
        var sw = document.getElementById('wheel-swatch');
        if (sw) sw.style.background = hex;
        var hx = document.getElementById('wheel-hex');
        if (hx) hx.textContent = hex;
        renderWheel();
      });
      spread.addEventListener('change', function(){
        if (typeof renderBaseColor === 'function') renderBaseColor();
      });
    }
    var toggle = document.getElementById('wheel-harmony-toggle');
    if (toggle) {
      window.__showHarmony = true;
      toggle.textContent = 'Hide harmony';
      toggle.addEventListener('click', function(){
        window.__showHarmony = !window.__showHarmony;
        toggle.textContent = window.__showHarmony ? 'Hide harmony' : 'Show harmony';
        renderWheel();
      });
    }
    canvas._wheelControlsAdded = true;
  }
  // Keep the scheme buttons in sync with the active scheme.
  document.querySelectorAll('.wheel-scheme-btn').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-scheme') === STATE.activeScheme);
  });
}
