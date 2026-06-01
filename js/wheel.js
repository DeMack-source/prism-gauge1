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
function drawHarmonyDots() {
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

// ── PICK COLOR FROM WHEEL ─────────────────────────────────────
function pickWheelColor(e) {
  var canvas = document.getElementById('color-wheel-canvas');
  var rect   = canvas.getBoundingClientRect();
  var scaleX = canvas.width  / rect.width;
  var scaleY = canvas.height / rect.height;
  var touch  = e.touches ? e.touches[0] : e;
  var x = (touch.clientX - rect.left) * scaleX;
  var y = (touch.clientY - rect.top)  * scaleY;
  var ctx = canvas.getContext('2d');
  var px  = ctx.getImageData(Math.round(x), Math.round(y), 1, 1).data;
  if (px[3] === 0) return;

  var c   = { r: px[0], g: px[1], b: px[2] };
  STATE.wheelColor = c;

  var hex = rgb2hex(c.r, c.g, c.b);
  document.getElementById('wheel-swatch').style.background = hex;
  document.getElementById('wheel-hex').textContent         = hex;
  document.getElementById('wheel-rgb').textContent         = 'RGB ' + c.r + ', ' + c.g + ', ' + c.b;

  // Mentor hook
  if (typeof onWheelColorPicked === 'function') onWheelColorPicked(c);
}

// ── INIT WHEEL ────────────────────────────────────────────────
function initWheel() {
  var canvas = document.getElementById('color-wheel-canvas');
  if (!canvas) return;

  // Full render — wheel + harmony dots
  renderWheel();

  // Only add event listeners once
  if (!canvas._wheelListenersAdded) {
    canvas.addEventListener('click', pickWheelColor);
    canvas.addEventListener('touchstart', function(e) {
      e.preventDefault();
      pickWheelColor(e);
    }, { passive: false });
    canvas._wheelListenersAdded = true;
  }
}
