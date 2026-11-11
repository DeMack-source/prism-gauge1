// ── PRISM-GAUGE — palette.js ─────────────────────────────
// F2 Palette Studio (up to six colors, wheel-rule harmonies),
// F3 Color Codes (HEX / RGB / LAB — view and copy),
// F4 Saving & Sharing (personal gallery in localStorage,
// export as text or as a PNG image file).
// Everything runs on the device. No network, no library.
// Harmony logic follows the app's own SCHEMES in color-math.js,
// extended so any rule can fill up to six slots.
// ────────────────────────────────────────────────────────────

// ── Harmony builder: base color + rule + count ───────────────
// Offsets are hue steps from the base. Rules with fewer natural
// colors than the count asked for get extra hues (triadic gains the
// in-between hues; complementary gains lighter/darker versions).
var PG_HARMONY_EXT = {
  complementary: { offsets: [0, 180], lightSteps: [0, 0, 22, -22, 38, -38] },
  analogous:     { offsets: [0, 30, 60, 90, 120, 150], lightSteps: [0, 0, 0, 0, 0, 0] },
  triadic:       { offsets: [0, 120, 240, 60, 180, 300], lightSteps: [0, 0, 0, 0, 0, 0] },
  splitComp:     { offsets: [0, 150, 210, 30, 180, 330], lightSteps: [0, 0, 0, 0, 0, 0] },
  tetradic:      { offsets: [0, 90, 180, 270, 45, 225], lightSteps: [0, 0, 0, 0, 0, 0] },
  monochromatic: null // lightness ladder, handled separately
};

function buildHarmonyPalette(baseRgb, schemeKey, count) {
  var hsl = rgb2hsl(baseRgb.r, baseRgb.g, baseRgb.b);
  count = Math.max(2, Math.min(6, count || 5));
  if (schemeKey === 'monochromatic') {
    var ladder = [15, 28, 42, 58, 72, 86];
    return ladder.slice(0, count).map(function(l){
      return hsl2rgb(hsl.h, Math.max(15, hsl.s - 10), l);
    });
  }
  var ext = PG_HARMONY_EXT[schemeKey] || PG_HARMONY_EXT.triadic;
  var out = [];
  for (var i = 0; i < count; i++) {
    var off = ext.offsets[i % ext.offsets.length];
    var dl = ext.lightSteps[i] || 0;
    var l = Math.max(5, Math.min(95, hsl.l + dl));
    out.push(hsl2rgb((hsl.h + off) % 360, hsl.s, l));
  }
  return out;
}

// ── Palette Studio state ─────────────────────────────────────
var PG_STUDIO = {
  slots: [],      // [{r,g,b}] — up to 6
  count: 5,
  locked: [false, false, false, false, false, false],
  scheme: 'triadic'
};

function pgStudioInit() {
  var base = (typeof STATE !== 'undefined') ? STATE.baseColor : { r: 201, g: 64, b: 64 };
  var scheme = (typeof STATE !== 'undefined' && STATE.activeScheme) ? STATE.activeScheme : 'triadic';
  PG_STUDIO.scheme = scheme;
  PG_STUDIO.slots = buildHarmonyPalette(base, scheme, PG_STUDIO.count);
  renderStudioSlots();
  var sel = document.getElementById('pg-studio-count');
  if (sel) sel.addEventListener('change', function(){
    PG_STUDIO.count = parseInt(sel.value, 10) || 5;
    // Growing the palette rebuilds from the base; shrinking just hides.
    var baseRgb = PG_STUDIO.slots[0] || base;
    PG_STUDIO.slots = buildHarmonyPalette(baseRgb, PG_STUDIO.scheme, PG_STUDIO.count);
    renderStudioSlots();
  });
  document.querySelectorAll('.pg-harmony-btn').forEach(function(b){
    b.addEventListener('click', function(){ pgApplyHarmony(b.getAttribute('data-scheme')); });
  });
  var applyBtn = document.getElementById('pg-studio-apply');
  if (applyBtn) applyBtn.addEventListener('click', pgUseAsActivePalette);
  var saveBtn = document.getElementById('pg-studio-save');
  if (saveBtn) saveBtn.addEventListener('click', pgSaveStudioPalette);
  pgMarkHarmonyButtons();
}

function pgMarkHarmonyButtons() {
  document.querySelectorAll('.pg-harmony-btn').forEach(function(b){
    b.classList.toggle('active', b.getAttribute('data-scheme') === PG_STUDIO.scheme);
  });
}

function renderStudioSlots() {
  var wrap = document.getElementById('pg-studio-slots');
  if (!wrap) return;
  wrap.innerHTML = '';
  for (var i = 0; i < PG_STUDIO.count; i++) {
    (function(i){
      var c = PG_STUDIO.slots[i] || { r: 128, g: 128, b: 128 };
      var hex = rgb2hex(c.r, c.g, c.b);
      var slot = document.createElement('div');
      slot.className = 'pg-slot';
      // Swatch: tap to see this color's codes.
      var sw = document.createElement('button');
      sw.type = 'button';
      sw.className = 'pg-slot-swatch';
      sw.style.background = hex;
      var bright = (c.r * 299 + c.g * 587 + c.b * 114) / 1000;
      sw.style.color = bright > 140 ? '#111111' : '#ffffff';
      sw.innerHTML = '<span>' + hex + '</span>';
      sw.title = hex + ' — tap for codes';
      sw.addEventListener('click', function(){ showColorCodes(c.r, c.g, c.b); });
      slot.appendChild(sw);
      // Change: native color picker (works offline, phone-friendly).
      var change = document.createElement('label');
      change.className = 'pg-slot-change';
      change.textContent = 'Change ';
      var input = document.createElement('input');
      input.type = 'color';
      input.value = hex.toLowerCase();
      input.setAttribute('aria-label', 'Change color ' + (i + 1));
      input.addEventListener('input', function(){
        var rgb = hex2rgb(input.value);
        PG_STUDIO.slots[i] = rgb;
        sw.style.background = input.value.toUpperCase();
        sw.innerHTML = '<span>' + input.value.toUpperCase() + '</span>';
        var b2 = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
        sw.style.color = b2 > 140 ? '#111111' : '#ffffff';
        showColorCodes(rgb.r, rgb.g, rgb.b);
      });
      change.appendChild(input);
      slot.appendChild(change);
      // Lock: locked colors survive a harmony rebuild.
      var lock = document.createElement('button');
      lock.type = 'button';
      lock.className = 'pg-slot-lock' + (PG_STUDIO.locked[i] ? ' locked' : '');
      lock.textContent = PG_STUDIO.locked[i] ? '🔒 Locked' : '🔓 Free';
      lock.setAttribute('aria-label', 'Lock color ' + (i + 1));
      lock.addEventListener('click', function(){
        PG_STUDIO.locked[i] = !PG_STUDIO.locked[i];
        lock.textContent = PG_STUDIO.locked[i] ? '🔒 Locked' : '🔓 Free';
        lock.classList.toggle('locked', PG_STUDIO.locked[i]);
      });
      slot.appendChild(lock);
      wrap.appendChild(slot);
    })(i);
  }
}

function pgApplyHarmony(schemeKey) {
  PG_STUDIO.scheme = schemeKey;
  var base = PG_STUDIO.slots[0] || { r: 201, g: 64, b: 64 };
  var colors = buildHarmonyPalette(base, schemeKey, PG_STUDIO.count);
  for (var i = 1; i < PG_STUDIO.count; i++) {
    if (!PG_STUDIO.locked[i]) PG_STUDIO.slots[i] = colors[i];
  }
  pgMarkHarmonyButtons();
  renderStudioSlots();
  if (typeof showToast === 'function') {
    var name = (typeof SCHEMES !== 'undefined' && SCHEMES[schemeKey]) ? SCHEMES[schemeKey].name : schemeKey;
    showToast(name + ' applied — locked colors kept');
  }
}

// Load any color list (hex strings or {r,g,b}) into the Studio.
function loadColorsToStudio(colors) {
  if (!colors || !colors.length) return;
  PG_STUDIO.count = Math.max(2, Math.min(6, colors.length));
  var sel = document.getElementById('pg-studio-count');
  if (sel) sel.value = String(PG_STUDIO.count);
  PG_STUDIO.slots = colors.slice(0, 6).map(function(c){
    return (typeof c === 'string') ? hex2rgb(c) : { r: c.r, g: c.g, b: c.b };
  });
  PG_STUDIO.locked = [false, false, false, false, false, false];
  renderStudioSlots();
}

function pgUseAsActivePalette() {
  if (typeof STATE === 'undefined' || !PG_STUDIO.slots.length) return;
  STATE.baseColor = { r: PG_STUDIO.slots[0].r, g: PG_STUDIO.slots[0].g, b: PG_STUDIO.slots[0].b };
  STATE.activeScheme = PG_STUDIO.scheme;
  STATE.tempPct = null;
  if (typeof renderBaseColor === 'function') renderBaseColor();
  if (typeof showToast === 'function') showToast('Studio palette is now your active palette');
}

function pgSaveStudioPalette() {
  if (typeof STATE === 'undefined' || !PG_STUDIO.slots.length) return;
  var hexes = PG_STUDIO.slots.slice(0, PG_STUDIO.count).map(function(c){ return rgb2hex(c.r, c.g, c.b); });
  var name = (typeof SCHEMES !== 'undefined' && SCHEMES[PG_STUDIO.scheme]) ? SCHEMES[PG_STUDIO.scheme].name : 'Studio';
  STATE.savedPalettes.unshift({ scheme: name + ' (Studio)', colors: hexes, ts: Date.now() });
  if (STATE.savedPalettes.length > 10) STATE.savedPalettes.pop();
  try { localStorage.setItem('pg_palettes', JSON.stringify(STATE.savedPalettes)); } catch (e) {}
  if (typeof renderSaved === 'function') renderSaved();
  if (typeof showToast === 'function') showToast('Palette saved to your gallery!');
  if (typeof MENTOR !== 'undefined') MENTOR.fire('palette_saved');
}

// ── Color Codes (F3) ─────────────────────────────────────────
var PG_CODES = { r: 201, g: 64, b: 64 };

function renderColorCodes(rgb, label) {
  if (!rgb) return;
  PG_CODES = { r: rgb.r, g: rgb.g, b: rgb.b };
  var hex = rgb2hex(rgb.r, rgb.g, rgb.b);
  var sw = document.getElementById('pg-codes-swatch');
  if (sw) sw.style.background = hex;
  var nm = document.getElementById('pg-codes-name');
  if (nm) nm.textContent = label || 'Color';
  var hx = document.getElementById('pg-code-hex-val');
  if (hx) hx.textContent = hex;
  var rg = document.getElementById('pg-code-rgb-val');
  if (rg) rg.textContent = rgbText(rgb.r, rgb.g, rgb.b);
  var lb = document.getElementById('pg-code-lab-val');
  if (lb) lb.textContent = labText(rgb.r, rgb.g, rgb.b);
}

function showColorCodes(r, g, b) {
  renderColorCodes({ r: r, g: g, b: b }, 'Picked color');
}

function pgWireCodeButtons() {
  function bind(id, getText) {
    var el = document.getElementById(id);
    if (!el) return;
    el.addEventListener('click', function(){
      if (typeof copyToClipboard === 'function') copyToClipboard(getText());
    });
  }
  bind('pg-code-hex', function(){ return rgb2hex(PG_CODES.r, PG_CODES.g, PG_CODES.b); });
  bind('pg-code-rgb', function(){ return 'RGB ' + rgbText(PG_CODES.r, PG_CODES.g, PG_CODES.b); });
  bind('pg-code-lab', function(){ return labText(PG_CODES.r, PG_CODES.g, PG_CODES.b); });
}

// ── Gallery export (F4) ──────────────────────────────────────
function pgPaletteText(p) {
  var lines = [];
  lines.push('PRISM-GAUGE palette — ' + (p.scheme || 'Palette'));
  lines.push('Saved: ' + new Date(p.ts || Date.now()).toLocaleDateString());
  lines.push('Colors: ' + p.colors.length);
  p.colors.forEach(function(h, i){
    var rgb = hex2rgb(h);
    lines.push((i + 1) + '. ' + h + ' — RGB ' + rgbText(rgb.r, rgb.g, rgb.b) + ' — ' + labText(rgb.r, rgb.g, rgb.b));
  });
  return lines.join('\n');
}

function downloadFile(name, blob) {
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url; a.download = name;
  document.body.appendChild(a);
  a.click();
  setTimeout(function(){ document.body.removeChild(a); URL.revokeObjectURL(url); }, 500);
}

function exportPaletteTxt(i) {
  if (typeof STATE === 'undefined' || !STATE.savedPalettes[i]) return;
  var p = STATE.savedPalettes[i];
  downloadFile('prism-palette-' + (i + 1) + '.txt', new Blob([pgPaletteText(p)], { type: 'text/plain' }));
  if (typeof showToast === 'function') showToast('Palette exported as text');
}

function exportPalettePng(i) {
  if (typeof STATE === 'undefined' || !STATE.savedPalettes[i]) return;
  var p = STATE.savedPalettes[i];
  var W = 480, ROW = 58, HEAD = 48, FOOT = 32;
  var H = HEAD + p.colors.length * ROW + FOOT;
  var canvas = document.createElement('canvas');
  canvas.width = W; canvas.height = H;
  var ctx = canvas.getContext('2d');
  ctx.fillStyle = '#10101a'; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#e8e8f0';
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('PRISM-GAUGE — ' + (p.scheme || 'Palette'), 16, HEAD / 2);
  p.colors.forEach(function(h, n){
    var y = HEAD + n * ROW;
    ctx.fillStyle = h; ctx.fillRect(0, y, W, ROW);
    var rgb = hex2rgb(h);
    var bright = (rgb.r * 299 + rgb.g * 587 + rgb.b * 114) / 1000;
    ctx.fillStyle = bright > 140 ? '#111111' : '#ffffff';
    ctx.font = 'bold 18px system-ui, sans-serif';
    ctx.fillText(h, 16, y + ROW / 2);
    ctx.font = '15px system-ui, sans-serif';
    ctx.fillText('RGB ' + rgbText(rgb.r, rgb.g, rgb.b) + '   ' + labText(rgb.r, rgb.g, rgb.b), 150, y + ROW / 2);
  });
  ctx.fillStyle = '#6a6a8a';
  ctx.font = '13px system-ui, sans-serif';
  ctx.fillText('Saved ' + new Date(p.ts || Date.now()).toLocaleDateString() + ' — Leave more light than you found.', 16, H - FOOT / 2);
  if (canvas.toBlob) {
    canvas.toBlob(function(blob){
      if (!blob) return;
      downloadFile('prism-palette-' + (i + 1) + '.png', blob);
      if (typeof showToast === 'function') showToast('Palette exported as an image');
    }, 'image/png');
  }
}

function loadPaletteToStudio(i) {
  if (typeof STATE === 'undefined' || !STATE.savedPalettes[i]) return;
  var p = STATE.savedPalettes[i];
  loadColorsToStudio(p.colors);
  var studio = document.getElementById('palette-studio-card');
  if (studio) studio.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (typeof showToast === 'function') showToast('Opened in the Palette Studio');
}

// ── Init ─────────────────────────────────────────────────────
pgStudioInit();
pgWireCodeButtons();
