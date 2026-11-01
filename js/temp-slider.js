// Temperature slider — makes the front-page Color Temperature bar draggable.
// Before this, the bar was display-only: the knob only moved when the base
// color changed elsewhere. Dragging now warms/cools the base color itself:
// hue moves from blue (cool, 215 deg) to red-orange (warm, 20 deg) while the
// base color's saturation and lightness are kept, so the color shifts in
// temperature without jumping brighter or darker. Runs after js/app.js, so
// it can use the app's STATE, rgb2hsl, hsl2rgb and renderBaseColor globals.
(function(){
  var bar = document.getElementById('temp-bar');
  var knob = document.getElementById('temp-indicator');
  if(!bar || !knob) return;
  var dragging = false, sat = 60, light = 45;
  function apply(pct){
    pct = Math.max(0, Math.min(1, pct));
    var hue = 215 - pct * 195; // 0 = cool blue, 1 = warm red-orange
    var rgb = hsl2rgb(hue, sat, light);
    STATE.baseColor = rgb;
    var hex = rgb2hex(rgb.r, rgb.g, rgb.b);
    var swatch = document.getElementById('base-swatch');
    var hexEl = document.getElementById('base-hex');
    var rgbEl = document.getElementById('base-rgb');
    if(swatch) swatch.style.background = hex;
    if(hexEl) hexEl.textContent = hex;
    if(rgbEl) rgbEl.textContent = 'RGB ' + rgb.r + ', ' + rgb.g + ', ' + rgb.b;
    knob.style.left = Math.max(2, Math.min(98, pct * 100)) + '%';
    bar.setAttribute('aria-valuenow', Math.round(pct * 100));
  }
  function pctFromEvent(e){
    var r = bar.getBoundingClientRect();
    return (e.clientX - r.left) / r.width;
  }
  bar.addEventListener('pointerdown', function(e){
    var hsl = rgb2hsl(STATE.baseColor.r, STATE.baseColor.g, STATE.baseColor.b);
    sat = hsl.s; light = hsl.l;
    dragging = true;
    knob.classList.add('temp-dragging');
    bar.setPointerCapture(e.pointerId);
    apply(pctFromEvent(e));
    e.preventDefault();
  });
  bar.addEventListener('pointermove', function(e){
    if(!dragging) return;
    apply(pctFromEvent(e));
  });
  function end(){
    if(!dragging) return;
    dragging = false;
    knob.classList.remove('temp-dragging');
    // One full render on release: harmony schemes, palette, mentor tip.
    if(typeof renderBaseColor === 'function') renderBaseColor();
  }
  bar.addEventListener('pointerup', end);
  bar.addEventListener('pointercancel', end);
})();
