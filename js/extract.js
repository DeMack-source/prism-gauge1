// ── PRISM-GAUGE — extract.js ─────────────────────────────
// F1 Color Extraction: pull a palette straight out of a photo the user
// picks from their phone. Everything runs on the device — the image is
// read with FileReader, drawn to a small offscreen canvas, and the
// palette comes from a median-cut pass over the pixels. Nothing is
// uploaded, nothing needs the network. The algorithm is the classic
// median-cut quantizer (same idea as the color-thief library, MIT,
// written here from scratch so there is no extra file to vendor).
// ────────────────────────────────────────────────────────────
(function(){
  var btn = document.getElementById('pg-photo-btn');
  var input = document.getElementById('pg-photo-input');
  var countSel = document.getElementById('pg-extract-count');
  var preview = document.getElementById('pg-extract-preview');
  var imgEl = document.getElementById('pg-extract-img');
  var swatchesEl = document.getElementById('pg-extract-swatches');
  var useBtn = document.getElementById('pg-extract-use');
  if (!btn || !input) return;

  var extracted = []; // [{r,g,b}] — the last extracted palette

  btn.addEventListener('click', function(){ input.click(); });
  if (countSel) countSel.addEventListener('change', function(){
    if (extracted.length) renderSwatches();
  });
  input.addEventListener('change', function(){
    var file = input.files && input.files[0];
    if (!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      var img = new Image();
      img.onload = function(){
        extracted = extractPalette(img, parseInt(countSel ? countSel.value : '6', 10) || 6);
        if (imgEl) imgEl.src = reader.result;
        if (preview) preview.style.display = 'block';
        renderSwatches();
        if (typeof showToast === 'function') showToast(extracted.length + ' colors pulled from your photo');
      };
      img.onerror = function(){
        if (typeof showToast === 'function') showToast('Could not read that photo — try another one');
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });

  if (useBtn) useBtn.addEventListener('click', function(){
    if (!extracted.length) return;
    if (typeof loadColorsToStudio === 'function') {
      loadColorsToStudio(extracted);
      if (typeof showToast === 'function') showToast('Loaded into the Palette Studio');
      var studio = document.getElementById('palette-studio-card');
      if (studio) studio.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  });

  function renderSwatches(){
    var count = parseInt(countSel ? countSel.value : '6', 10) || 6;
    var colors = extracted.slice(0, count);
    if (!swatchesEl) return;
    swatchesEl.innerHTML = '';
    colors.forEach(function(c){
      var hex = rgb2hex(c.r, c.g, c.b);
      var d = document.createElement('button');
      d.type = 'button';
      d.className = 'pg-extract-swatch';
      d.style.background = hex;
      d.title = hex + ' — tap to make it your base color';
      d.addEventListener('click', function(){
        // Tap a color: it becomes the base color everywhere, and its
        // codes show in the Color Codes card.
        if (typeof STATE !== 'undefined') {
          STATE.baseColor = { r: c.r, g: c.g, b: c.b };
          STATE.tempPct = null;
          if (typeof renderBaseColor === 'function') renderBaseColor();
        }
        if (typeof copyToClipboard === 'function') copyToClipboard(hex);
      });
      swatchesEl.appendChild(d);
    });
  }

  // ── Median-cut quantization ──────────────────────────────
  // Split the pixel cloud into boxes along its widest color channel
  // until there are `count` boxes, then average each box. Simple,
  // fast on a phone, and the result reads like the photo.
  function extractPalette(img, count){
    var MAX = 200; // work small — a 200px image is plenty for a palette
    var scale = Math.min(1, MAX / Math.max(img.width, img.height));
    var w = Math.max(1, Math.round(img.width * scale));
    var h = Math.max(1, Math.round(img.height * scale));
    var canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    var ctx = canvas.getContext('2d');
    ctx.drawImage(img, 0, 0, w, h);
    var data;
    try { data = ctx.getImageData(0, 0, w, h).data; }
    catch (e) { return []; }
    var pixels = [];
    // Sample every 2nd pixel: faster, same palette.
    for (var i = 0; i < data.length; i += 8) {
      if (data[i + 3] < 128) continue; // skip transparent pixels
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }
    if (!pixels.length) return [];
    var boxes = medianCut(pixels, count);
    // Biggest boxes first, so the first swatches are the photo's main colors.
    boxes.sort(function(a, b){ return b.length - a.length; });
    var out = boxes.map(function(box){
      var r = 0, g = 0, b = 0;
      box.forEach(function(p){ r += p[0]; g += p[1]; b += p[2]; });
      var n = box.length || 1;
      return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
    });
    return out;
  }

  function medianCut(pixels, count){
    var boxes = [pixels];
    while (boxes.length < count) {
      // Split the box with the widest color range.
      var splitIdx = -1, widest = -1;
      boxes.forEach(function(box, i){
        if (box.length < 2) return;
        var range = channelRange(box);
        if (range > widest) { widest = range; splitIdx = i; }
      });
      if (splitIdx < 0) break;
      var box = boxes[splitIdx];
      var ch = widestChannel(box);
      box.sort(function(a, b){ return a[ch] - b[ch]; });
      var mid = Math.floor(box.length / 2);
      boxes.splice(splitIdx, 1, box.slice(0, mid), box.slice(mid));
    }
    return boxes;
  }
  function channelRange(box){
    var min = [255, 255, 255], max = [0, 0, 0];
    box.forEach(function(p){
      for (var i = 0; i < 3; i++) {
        if (p[i] < min[i]) min[i] = p[i];
        if (p[i] > max[i]) max[i] = p[i];
      }
    });
    return Math.max(max[0] - min[0], max[1] - min[1], max[2] - min[2]);
  }
  function widestChannel(box){
    var min = [255, 255, 255], max = [0, 0, 0];
    box.forEach(function(p){
      for (var i = 0; i < 3; i++) {
        if (p[i] < min[i]) min[i] = p[i];
        if (p[i] > max[i]) max[i] = p[i];
      }
    });
    var r0 = max[0] - min[0], r1 = max[1] - min[1], r2 = max[2] - min[2];
    return r0 >= r1 && r0 >= r2 ? 0 : (r1 >= r2 ? 1 : 2);
  }

  // Node test hook (no-op in the browser: `module` is undefined there).
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { extractPalette: extractPalette, medianCut: medianCut };
  }
})();
