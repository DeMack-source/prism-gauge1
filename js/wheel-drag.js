// Wheel drag — makes the color wheel draggable, not tap-only.
// Before this, the wheel only listened for click + touchstart, so the dot
// sat still and a user had to lift and re-tap a small spot to try a new
// color. Now: put a finger anywhere on the wheel and drag — the picked
// color, swatch and hex update live, and a large ring follows your finger
// so you can see exactly where you are. Runs after js/wheel.js and reuses
// its pickWheelColor(); it does not redraw the wheel while dragging.
(function(){
  var canvas = document.getElementById('color-wheel-canvas');
  if(!canvas) return;
  // Harmony dots off by default: the wheel shows only YOUR picked dot.
  // The other dots were the current scheme's harmony colors for the base
  // color — useful, but they cluttered the wheel when you just want to pick.
  // They come back only when you tap "Show harmony" on the Wheel tab, which
  // is exactly the on-demand triad/analogous view Kip described.
  if(typeof drawHarmonyDots === 'function' && !window._origDrawHarmonyDots){
    window._origDrawHarmonyDots = drawHarmonyDots;
    drawHarmonyDots = function(){
      if(window.__showHarmony){ return window._origDrawHarmonyDots(); }
    };
    var toggle = document.getElementById('wheel-harmony-toggle');
    if(toggle){
      toggle.addEventListener('click', function(){
        window.__showHarmony = !window.__showHarmony;
        toggle.textContent = window.__showHarmony ? 'Hide harmony' : 'Show harmony';
        toggle.classList.toggle('active', !!window.__showHarmony);
        if(typeof renderWheel === 'function') renderWheel();
      });
    }
  }
  // Bigger touch target + no page-scroll fighting while dragging.
  var style = document.createElement('style');
  style.textContent = '#color-wheel-canvas{width:min(92vw,420px)!important;height:auto!important;touch-action:none!important;display:block;margin:0 auto;}'
    + '#wheel-picker-ring{position:absolute;width:40px;height:40px;border-radius:50%;border:3px solid #fff;box-shadow:0 0 12px rgba(0,0,0,.7);transform:translate(-50%,-50%);pointer-events:none;z-index:5;display:none;}';
  document.head.appendChild(style);
  var parent = canvas.parentElement;
  if(parent && getComputedStyle(parent).position === 'static') parent.style.position = 'relative';
  var ring = document.createElement('div');
  ring.id = 'wheel-picker-ring';
  if(parent) parent.appendChild(ring);
  var dragging = false;
  function placeRing(e){
    var rect = canvas.getBoundingClientRect();
    var x = e.clientX - rect.left, y = e.clientY - rect.top;
    // Clamp to the wheel circle so the ring never runs off the edge.
    var cx = rect.width / 2, cy = rect.height / 2, r = Math.min(cx, cy);
    var dx = x - cx, dy = y - cy, d = Math.sqrt(dx * dx + dy * dy);
    if(d > r){ x = cx + dx / d * r; y = cy + dy / d * r; }
    // Ring lives in the parent, so add the canvas's own offset in the parent.
    ring.style.left = (canvas.offsetLeft + x) + 'px'; ring.style.top = (canvas.offsetTop + y) + 'px';
    ring.style.display = 'block';
  }
  function pick(e){
    if(typeof pickWheelColor === 'function') pickWheelColor(e);
    var swatch = document.getElementById('wheel-swatch');
    if(swatch && swatch.style.background) ring.style.background = swatch.style.background;
    placeRing(e);
  }
  canvas.addEventListener('pointerdown', function(e){
    dragging = true;
    canvas.setPointerCapture(e.pointerId);
    pick(e);
    e.preventDefault();
  });
  canvas.addEventListener('pointermove', function(e){
    if(!dragging) return;
    pick(e);
  });
  function end(){
    dragging = false;
    // Ring stays at the last picked color, so the dot now marks your pick.
  }
  canvas.addEventListener('pointerup', end);
  canvas.addEventListener('pointercancel', end);
})();
