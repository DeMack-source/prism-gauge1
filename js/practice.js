// Practice tab — photo + grid + perspective + sketch + export.
// Self-contained IIFE ported from the single-file PRISM-GAUGE build (2026-11-01,
// including the Android picker fix: real buttons trigger the file inputs).
// No references to prism-gauge1 globals; tab switching is handled by js/app.js
// switchTab() via data-tab="practice" buttons, plus the resize-on-tab-click
// handler at the end of this file.
// ══════════════════════════════════════════════════════════════
//  PRACTICE TAB — photo + grid + perspective + sketch + export
//  Added 2026-11-01, local build only. All IDs prefixed prac-.
//  No existing tab code is modified; this block is self-contained.
// ══════════════════════════════════════════════════════════════
(function(){
  var frame = document.getElementById('prac-frame');
  if(!frame) return;
  var photoCanvas = document.getElementById('prac-photo-canvas');
  var overlayCanvas = document.getElementById('prac-overlay-canvas');
  var sketchCanvas = document.getElementById('prac-sketch-canvas');
  var vpLayer = document.getElementById('prac-vp-layer');
  var panel = document.getElementById('tab-practice');
  var statusEl = document.getElementById('prac-status');

  // World coordinates: frame left=0, right=1; top=0, bottom=1.
  // Vanishing points may live outside that range (extended space).
  var S = {
    photo: null, divisions: 6, labels: true, gridColor: '#ffffff', gridOpacity: 0.7,
    guides: true, guideColor: '#00f2ff', mode: 1, horizon: 0.5,
    vps: [{x:0.5, y:0.5, kind:'h'}],
    locked: false, zen: false, sketchColor: '#ff3ca0',
    orientation: 'portrait', aspect: 0.5625, tool: 'move'
  };
  function setStatus(t){ if(statusEl) statusEl.textContent = t; }
  function frameW(){ return frame.clientWidth || 300; }
  function frameH(){ return frame.clientHeight || 300; }
  function worldToPx(v){ return { x: v.x * frameW(), y: v.y * frameH() }; }
  function syncModeVPs(){
    if(S.mode === 1){ S.vps = [{x:0.5, y:S.horizon, kind:'h'}]; }
    else if(S.mode === 2){ S.vps = [{x:-0.25, y:S.horizon, kind:'h'}, {x:1.25, y:S.horizon, kind:'h'}]; }
    else { S.vps = [{x:-0.25, y:S.horizon, kind:'h'}, {x:1.25, y:S.horizon, kind:'h'}, {x:0.5, y:-0.6, kind:'v'}]; }
  }
  function applyAspect(){
    var a = S.aspect;
    if(S.orientation === 'landscape' && a < 1) a = 1 / a;
    if(S.orientation === 'portrait' && a > 1) a = 1 / a;
    frame.style.aspectRatio = a.toFixed(4) + ' / 1';
    pracResize();
  }
  function sizeCanvas(c){
    var dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.max(1, Math.round(frameW() * dpr));
    c.height = Math.max(1, Math.round(frameH() * dpr));
  }
  function drawPhoto(){
    var ctx = photoCanvas.getContext('2d');
    ctx.clearRect(0, 0, photoCanvas.width, photoCanvas.height);
    ctx.fillStyle = '#05050a'; ctx.fillRect(0, 0, photoCanvas.width, photoCanvas.height);
    if(!S.photo) return;
    // Fit inside (contain) — never stretch the photo.
    var s = Math.min(photoCanvas.width / S.photo.width, photoCanvas.height / S.photo.height);
    var w = S.photo.width * s, h = S.photo.height * s;
    ctx.drawImage(S.photo, (photoCanvas.width - w) / 2, (photoCanvas.height - h) / 2, w, h);
  }
  function drawOverlay(){
    var ctx = overlayCanvas.getContext('2d');
    var W = overlayCanvas.width, H = overlayCanvas.height;
    ctx.clearRect(0, 0, W, H);
    // Grid
    ctx.save();
    ctx.globalAlpha = S.gridOpacity;
    ctx.strokeStyle = S.gridColor; ctx.fillStyle = S.gridColor; ctx.lineWidth = Math.max(1, W / 600);
    for(var i = 1; i < S.divisions; i++){
      var x = (i / S.divisions) * W;
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke();
    }
    for(var j = 1; j < S.divisions; j++){
      var y = (j / S.divisions) * H;
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
    }
    if(S.labels){
      ctx.font = Math.max(12, Math.round(W / 45)) + 'px monospace';
      for(var c = 0; c < S.divisions; c++){
        var label = String.fromCharCode(65 + c);
        ctx.fillText(label, (c / S.divisions) * W + 6, 18);
      }
      for(var r = 0; r < S.divisions; r++){
        ctx.fillText(String(r + 1), 6, (r / S.divisions) * H + 18);
      }
    }
    ctx.restore();
    if(!S.guides) return;
    // Horizon line
    var hy = S.horizon * H;
    ctx.save();
    ctx.strokeStyle = '#39ff85'; ctx.lineWidth = Math.max(1, W / 500);
    ctx.setLineDash([8, 6]);
    ctx.beginPath(); ctx.moveTo(0, hy); ctx.lineTo(W, hy); ctx.stroke();
    ctx.setLineDash([]);
    // Guide lines: VP -> corners and edge midpoints (canvas clips off-frame VPs).
    ctx.strokeStyle = S.guideColor; ctx.globalAlpha = 0.9; ctx.lineWidth = Math.max(1, W / 700);
    var targets = [[0,0],[W,0],[0,H],[W,H],[W/2,0],[W/2,H],[0,H/2],[W,H/2]];
    S.vps.forEach(function(v){
      var p = { x: v.x * W, y: v.y * H };
      targets.forEach(function(t){
        ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(t[0], t[1]); ctx.stroke();
      });
    });
    ctx.restore();
  }
  function renderHandles(){
    vpLayer.innerHTML = '';
    if(S.locked) return;
    // Horizon handle (left edge, draggable vertically)
    var hh = document.createElement('div');
    hh.className = 'prac-handle horizon'; hh.style.pointerEvents = 'auto';
    hh.style.left = '0px'; hh.style.top = (S.horizon * 100) + '%';
    hh.innerHTML = '<span class="prac-handle-label">Horizon</span>';
    makeDraggable(hh, 'horizon');
    vpLayer.appendChild(hh);
    S.vps.forEach(function(v, idx){
      var p = worldToPx(v);
      var h = document.createElement('div');
      h.className = 'prac-handle vp'; h.style.pointerEvents = 'auto';
      // Handles beyond the frame are still reachable: they sit in the
      // overflow-visible layer, positioned by world coordinates.
      h.style.left = p.x + 'px'; h.style.top = p.y + 'px';
      h.innerHTML = '<span class="prac-handle-label">VP ' + (idx + 1) + '</span>';
      makeDraggable(h, 'vp', idx);
      vpLayer.appendChild(h);
    });
  }
  function redraw(){
    drawPhoto(); drawOverlay(); renderHandles();
  }
  function pracResize(){
    // Preserve the sketch across resizes (canvas resizing normally wipes it).
    var keep = document.createElement('canvas');
    keep.width = sketchCanvas.width; keep.height = sketchCanvas.height;
    if(keep.width > 0 && keep.height > 0) keep.getContext('2d').drawImage(sketchCanvas, 0, 0);
    sizeCanvas(photoCanvas); sizeCanvas(overlayCanvas); sizeCanvas(sketchCanvas);
    if(keep.width > 0 && keep.height > 0) sketchCanvas.getContext('2d').drawImage(keep, 0, 0, sketchCanvas.width, sketchCanvas.height);
    redraw();
  }
  function makeDraggable(el, kind, idx){
    el.addEventListener('pointerdown', function(e){
      if(S.locked) return;
      e.preventDefault(); e.stopPropagation();
      el.setPointerCapture(e.pointerId);
      var rect = frame.getBoundingClientRect();
      function move(ev){
        var x = (ev.clientX - rect.left) / rect.width;
        var y = (ev.clientY - rect.top) / rect.height;
        if(kind === 'horizon'){
          S.horizon = Math.max(0, Math.min(1, y));
          document.getElementById('prac-horizon-slider').value = Math.round(S.horizon * 100);
          document.getElementById('prac-horizon-val').textContent = Math.round(S.horizon * 100) + '%';
          S.vps.forEach(function(v){ if(v.kind === 'h') v.y = S.horizon; });
          el.style.top = (S.horizon * 100) + '%';
        } else {
          // Deliberately NOT clamped to [0,1]: VPs may live off-frame.
          S.vps[idx].x = Math.max(-1.5, Math.min(2.5, x));
          S.vps[idx].y = Math.max(-1.5, Math.min(2.5, y));
          // Move only THIS handle element. Never call redraw() mid-drag:
          // renderHandles() rebuilds the layer and destroys the handle
          // being dragged, which is what made a drag stick after one step.
          el.style.left = (S.vps[idx].x * rect.width) + 'px';
          el.style.top = (S.vps[idx].y * rect.height) + 'px';
        }
        drawOverlay();
      }
      function up(){ el.removeEventListener('pointermove', move); el.removeEventListener('pointerup', up); redraw(); }
      el.addEventListener('pointermove', move);
      el.addEventListener('pointerup', up);
    });
  }
  function loadPhotoFile(file){
    if(!file) return;
    var url = URL.createObjectURL(file);
    var img = new Image();
    img.onload = function(){
      S.photo = img; pracResize(); setStatus('Photo loaded. Drag the horizon and vanishing points.');
    };
    img.onerror = function(){ setStatus('Could not load that photo. Try another image.'); };
    img.src = url;
  }
  document.getElementById('prac-photo-input').addEventListener('change', function(e){ loadPhotoFile(e.target.files[0]); });
  document.getElementById('prac-camera-input').addEventListener('change', function(e){ loadPhotoFile(e.target.files[0]); });
  // Buttons trigger the picker directly: a label wrapping a display:none
  // input does not reliably open the picker on Android Chrome/WebView.
  document.getElementById('prac-photo-btn').addEventListener('click', function(){ document.getElementById('prac-photo-input').click(); });
  document.getElementById('prac-camera-btn').addEventListener('click', function(){ document.getElementById('prac-camera-input').click(); });
  document.getElementById('prac-orient-portrait').addEventListener('click', function(){
    S.orientation = 'portrait';
    document.getElementById('prac-orient-portrait').classList.add('active');
    document.getElementById('prac-orient-landscape').classList.remove('active');
    applyAspect();
  });
  document.getElementById('prac-orient-landscape').addEventListener('click', function(){
    S.orientation = 'landscape';
    document.getElementById('prac-orient-landscape').classList.add('active');
    document.getElementById('prac-orient-portrait').classList.remove('active');
    applyAspect();
  });
  document.querySelectorAll('.prac-size-btn').forEach(function(b){
    b.addEventListener('click', function(){
      document.querySelectorAll('.prac-size-btn').forEach(function(x){ x.classList.remove('active'); });
      b.classList.add('active');
      S.aspect = parseFloat(b.getAttribute('data-prac-aspect'));
      applyAspect();
    });
  });
  document.getElementById('prac-divisions').addEventListener('input', function(e){
    S.divisions = parseInt(e.target.value, 10);
    document.getElementById('prac-divisions-val').textContent = S.divisions;
    drawOverlay();
  });
  document.getElementById('prac-labels-toggle').addEventListener('change', function(e){ S.labels = e.target.checked; drawOverlay(); });
  document.getElementById('prac-grid-color').addEventListener('change', function(e){ S.gridColor = e.target.value; drawOverlay(); });
  document.getElementById('prac-grid-opacity').addEventListener('input', function(e){
    S.gridOpacity = parseInt(e.target.value, 10) / 100;
    document.getElementById('prac-grid-opacity-val').textContent = e.target.value + '%';
    drawOverlay();
  });
  document.getElementById('prac-guide-mode').addEventListener('change', function(e){
    S.mode = parseInt(e.target.value, 10); syncModeVPs(); redraw();
  });
  document.getElementById('prac-guide-color').addEventListener('change', function(e){ S.guideColor = e.target.value; drawOverlay(); });
  document.getElementById('prac-guides-toggle').addEventListener('change', function(e){ S.guides = e.target.checked; drawOverlay(); });
  document.getElementById('prac-horizon-slider').addEventListener('input', function(e){
    S.horizon = parseInt(e.target.value, 10) / 100;
    document.getElementById('prac-horizon-val').textContent = e.target.value + '%';
    S.vps.forEach(function(v){ if(v.kind === 'h') v.y = S.horizon; });
    redraw();
  });
  document.getElementById('prac-sketch-color').addEventListener('change', function(e){ S.sketchColor = e.target.value; });
  document.getElementById('prac-sketch-clear').addEventListener('click', function(){
    var ctx = sketchCanvas.getContext('2d');
    ctx.clearRect(0, 0, sketchCanvas.width, sketchCanvas.height);
    setStatus('Sketch cleared.');
  });
  function setTool(tool){
    S.tool = tool;
    panel.classList.toggle('prac-tool-move', tool === 'move');
    panel.classList.toggle('prac-tool-sketch', tool === 'sketch');
    document.querySelectorAll('[data-prac-tool]').forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-prac-tool') === tool);
    });
    setStatus(tool === 'move'
      ? 'Move mode — drag the horizon and vanishing points. A finger on the photo scrolls the page to the controls.'
      : 'Sketch mode — draw on the photo. Switch back to Move to drag the horizon and vanishing points.');
  }
  document.querySelectorAll('[data-prac-tool]').forEach(function(b){
    b.addEventListener('click', function(){ setTool(b.getAttribute('data-prac-tool')); });
  });
  document.getElementById('prac-lock-btn').addEventListener('click', function(e){
    S.locked = !S.locked;
    e.target.textContent = S.locked ? '🔒 Locked' : '🔓 Unlock';
    e.target.classList.toggle('locked', S.locked);
    var quick = document.getElementById('prac-lock-btn2');
    if(quick){ quick.textContent = e.target.textContent; quick.classList.toggle('locked', S.locked); }
    setStatus(S.locked ? 'Locked — photo, grid and guides cannot be moved.' : 'Unlocked.');
    renderHandles();
  });
  // Quick controls below the frame, so the user never has to scroll back
  // up past the photo to reach Lock, Zen, or Export after sketching.
  document.getElementById('prac-lock-btn2').addEventListener('click', function(){ document.getElementById('prac-lock-btn').click(); });
  document.getElementById('prac-zen-btn2').addEventListener('click', function(){ document.getElementById('prac-zen-btn').click(); });
  document.getElementById('prac-export-btn2').addEventListener('click', function(){ document.getElementById('prac-export-btn').click(); });
  function setZen(on){
    S.zen = on;
    panel.classList.toggle('prac-zen-mode', on);
    setStatus(on ? 'Zen mode — tap the button above the photo to exit.' : 'Zen mode off.');
  }
  document.getElementById('prac-zen-btn').addEventListener('click', function(){ setZen(true); });
  document.getElementById('prac-zen-exit').addEventListener('click', function(){ setZen(false); });
  document.getElementById('prac-export-btn').addEventListener('click', function(){
    var ex = document.createElement('canvas');
    ex.width = photoCanvas.width; ex.height = photoCanvas.height;
    var ctx = ex.getContext('2d');
    ctx.drawImage(photoCanvas, 0, 0);
    ctx.drawImage(overlayCanvas, 0, 0);
    ctx.drawImage(sketchCanvas, 0, 0);
    var a = document.createElement('a');
    a.download = 'prism-practice.png';
    a.href = ex.toDataURL('image/png');
    a.click();
    setStatus('Exported PNG.');
  });
  // Sketch drawing (pointer events, touch-friendly)
  (function(){
    var drawing = false, last = null;
    function pos(e){
      var r = sketchCanvas.getBoundingClientRect();
      return { x: (e.clientX - r.left) / r.width * sketchCanvas.width, y: (e.clientY - r.top) / r.height * sketchCanvas.height };
    }
    sketchCanvas.addEventListener('pointerdown', function(e){
      if(S.locked || S.tool !== 'sketch') return;
      drawing = true; last = pos(e);
      sketchCanvas.setPointerCapture(e.pointerId);
    });
    sketchCanvas.addEventListener('pointermove', function(e){
      if(!drawing || S.locked) return;
      var p = pos(e), ctx = sketchCanvas.getContext('2d');
      ctx.strokeStyle = S.sketchColor; ctx.lineWidth = Math.max(2, sketchCanvas.width / 300);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.beginPath(); ctx.moveTo(last.x, last.y); ctx.lineTo(p.x, p.y); ctx.stroke();
      last = p;
    });
    function end(){ drawing = false; last = null; }
    sketchCanvas.addEventListener('pointerup', end);
    sketchCanvas.addEventListener('pointercancel', end);
  })();
  setTool('move');
  // Resize after the tab becomes visible (frame has no size while hidden).
  document.querySelectorAll('[data-tab="practice"]').forEach(function(b){
    b.addEventListener('click', function(){ setTimeout(pracResize, 80); });
  });
  window.addEventListener('resize', pracResize);
  // Expose only for debugging from the console; not used by other tabs.
  window.pracResize = pracResize;
})();
