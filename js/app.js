// ═══════════════════════════════════════════════════════════════
// PRISM-GAUGE — app.js
// Core app logic + Mentor system trigger hooks
// ═══════════════════════════════════════════════════════════════

const STATE = {
  activeTab: 'color',
  activeScheme: 'complementary',
  activeGrid: 'perspective',
  pickerTarget: 'base',
  isCameraOn: false,
  isGyroOn: false,
  isFrozen: false,
  baseColor: { r: 201, g: 64, b: 64 },
  mixA: { r: 201, g: 64, b: 64 },
  mixB: { r: 64, g: 128, b: 201 },
  wheelColor: null,
  savedPalettes: []
};

const $ = id => document.getElementById(id);
const $$ = sel => document.querySelectorAll(sel);

// ── TAB SWITCHING ─────────────────────────────────────────────
function switchTab(tab) {
  STATE.activeTab = tab;
  document.querySelectorAll('.tab-panel').forEach(function(p) {
    p.classList.toggle('active', p.id === 'tab-' + tab);
  });
  document.querySelectorAll('.tab-btn,.nav-btn').forEach(function(b) {
    b.classList.toggle('active', b.dataset.tab === tab);
  });
  if (tab === 'mixer') {
    updateMix();
    MENTOR.fire('mixer_opened');
  }
  if (tab === 'wheel') {
    initWheel();
    MENTOR.fire('wheel_opened');
  }
  if (tab === 'grid') {
    MENTOR.fire('grid_' + STATE.activeGrid);
  }
}

// ── TOAST ─────────────────────────────────────────────────────
function showToast(msg, duration) {
  if (!duration) duration = 1800;
  var t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(function() { t.classList.remove('show'); }, duration);
}

// ── CLIPBOARD ─────────────────────────────────────────────────
function copyToClipboard(text) {
  if (navigator.clipboard) navigator.clipboard.writeText(text).catch(function() {});
  showToast('Copied ' + text);
}

// ── COLOR PICKER ──────────────────────────────────────────────
function openPicker(target) {
  STATE.pickerTarget = target;
  var labels = { base: 'Set Base Color', mixA: 'Set Color A', mixB: 'Set Color B' };
  document.getElementById('picker-title').textContent = labels[target] || 'Pick a Color';
  var cur = target === 'base' ? STATE.baseColor : target === 'mixA' ? STATE.mixA : STATE.mixB;
  document.getElementById('native-picker').value = rgb2hex(cur.r, cur.g, cur.b);
  document.getElementById('picker-hex-display').textContent = rgb2hex(cur.r, cur.g, cur.b);
  document.getElementById('color-picker-popup').classList.add('open');
}

function closePicker() {
  document.getElementById('color-picker-popup').classList.remove('open');
}

function onPickerChange(hex) {
  document.getElementById('picker-hex-display').textContent = hex.toUpperCase();
  var rgb = hex2rgb(hex);
  if (STATE.pickerTarget === 'base') {
    STATE.baseColor = rgb;
    renderBaseColor();
  } else if (STATE.pickerTarget === 'mixA') {
    STATE.mixA = rgb;
    document.getElementById('mix-a-swatch').style.background = hex;
    updateMix();
  } else if (STATE.pickerTarget === 'mixB') {
    STATE.mixB = rgb;
    document.getElementById('mix-b-swatch').style.background = hex;
    updateMix();
  }
}

// ── STATUS ────────────────────────────────────────────────────
function setStatus(mode) {
  var dot = document.getElementById('status-dot');
  var ind = document.getElementById('mode-indicator');
  var modes = {
    offline: { text: 'STUDIO MODE - OFFLINE', cls: [] },
    live: { text: 'AR LENS + GYRO ACTIVE', cls: ['live'] },
    frozen: { text: 'GRID LOCKED - SKETCH MODE', cls: ['frozen'] }
  };
  var m = modes[mode] || modes.offline;
  ind.textContent = m.text;
  dot.className = 'status-dot ' + m.cls.join(' ');
}

// ── MENTOR TEMPERATURE HELPER ─────────────────────────────────
// Fires the right temperature tip based on current base color
function fireTempTip(r, g, b) {
  var temp = colorTemp(r, g, b);
  if (temp > 0.62) {
    MENTOR.fire('color_warm_selected', { r, g, b, temp });
  } else if (temp < 0.38) {
    MENTOR.fire('color_cool_selected', { r, g, b, temp });
  } else {
    MENTOR.fire('color_neutral_selected', { r, g, b, temp });
  }
}

// ── MENTOR MIXER HELPER ───────────────────────────────────────
// Detects complement mixing and extreme ratios
function fireMixTip() {
  var ratio = parseInt(document.getElementById('mix-ratio').value);

  // Extreme ratio — heavy tint
  if (ratio <= 10 || ratio >= 90) {
    MENTOR.fire('mixer_ratio_extreme', { ratio });
    return;
  }

  // Near-complementary mix detection
  var hslA = rgb2hsl(STATE.mixA.r, STATE.mixA.g, STATE.mixA.b);
  var hslB = rgb2hsl(STATE.mixB.r, STATE.mixB.g, STATE.mixB.b);
  var hueDiff = Math.abs(hslA.h - hslB.h);
  if (hueDiff > 180) hueDiff = 360 - hueDiff;

  if (hueDiff >= 140) {
    MENTOR.fire('mixer_complements_mixed', { hslA, hslB, hueDiff });
  }
}

// ── RENDER BASE COLOR ─────────────────────────────────────────
function renderBaseColor() {
  var r = STATE.baseColor.r, g = STATE.baseColor.g, b = STATE.baseColor.b;
  var hex = rgb2hex(r, g, b);

  var swatch = document.getElementById('base-swatch');
  var hexEl = document.getElementById('base-hex');
  var rgbEl = document.getElementById('base-rgb');

  if (swatch) swatch.style.background = hex;
  if (hexEl) hexEl.textContent = hex;
  if (rgbEl) rgbEl.textContent = 'RGB ' + r + ', ' + g + ', ' + b;

  // Temperature gauge
  var temp = colorTemp(r, g, b);
  var pct = Math.max(2, Math.min(98, temp * 100));
  var indicator = document.getElementById('temp-indicator');
  if (indicator) {
    indicator.style.left = pct + '%';
    indicator.style.display = 'block';
  }

  var debug = document.getElementById('temp-debug');
  if (debug) {
    debug.textContent = 'TEMP DEBUG: rgb=' + r + ',' + g + ',' + b + ' temp=' + temp.toFixed(3) + ' pct=' + pct.toFixed(1) + ' indicator=' + (indicator ? 'yes' : 'no');
  }

  // Fire mentor tip based on temperature
  fireTempTip(r, g, b);

  renderSchemeGrid();
  renderActivePalette();
  renderTheory();
}

// ── MENTOR SCHEME TIP HELPER ──────────────────────────────────
// Updates the secondary mentor cards on non-color tabs too
function updateTabMentorCard(slot, tipId, context) {
  var textEl = document.getElementById('mentor-tip-text-' + slot);
  var levelEl = document.getElementById('mentor-level-badge-' + slot);
  var card = document.getElementById('mentor-tip-card-' + slot);
  var deepBtn = document.getElementById('mentor-deep-btn-' + slot);
  var resultEl = document.getElementById('mentor-deep-result-' + slot);

  if (!textEl) return;

  var tip = MENTOR.TIPS[tipId];
  if (!tip) return;

  var text = tip[MENTOR.level] || tip['beginner'];
  textEl.innerHTML = text;

  if (levelEl) {
    levelEl.textContent = MENTOR.level.toUpperCase();
    levelEl.className = 'mentor-level-badge mentor-level-' + MENTOR.level;
  }
  if (resultEl) {
    resultEl.style.display = 'none';
    resultEl.innerHTML = '';
  }
  if (deepBtn) {
    deepBtn.disabled = false;
    deepBtn.textContent = '✦ Go Deeper';
    if (MENTOR.isOnline) {
      deepBtn.classList.remove('mentor-deep-offline');
    } else {
      deepBtn.classList.add('mentor-deep-offline');
    }
    // Store current tip on the button for goDeeper to use
    deepBtn.dataset.tipId = tipId;
  }
  if (card) {
    card.classList.remove('mentor-pulse');
    void card.offsetWidth;
    card.classList.add('mentor-pulse');
  }
}

// ── SCHEME GRID ───────────────────────────────────────────────
function renderSchemeGrid() {
  var grid = document.getElementById('scheme-grid');
  grid.innerHTML = '';
  Object.keys(SCHEMES).forEach(function(key) {
    var scheme = SCHEMES[key];
    var colors = getHarmonyColors(STATE.baseColor, key);
    var div = document.createElement('div');
    div.className = 'scheme-card' + (key === STATE.activeScheme ? ' active' : '');
    div.onclick = function() {
      STATE.activeScheme = key;
      renderSchemeGrid();
      renderActivePalette();
      renderTheory();
      // Fire mentor tip for scheme
      MENTOR.fire('scheme_' + key);
    };
    var swatches = colors.map(function(c) {
      return '<div class="swatch" style="background:' + rgb2hex(c.r, c.g, c.b) + '"></div>';
    }).join('');
    div.innerHTML = '<div class="scheme-name">' + scheme.name + '</div><div class="scheme-swatches">' + swatches + '</div>';
    grid.appendChild(div);
  });
}

// ── ACTIVE PALETTE ────────────────────────────────────────────
function renderActivePalette() {
  var strip = document.getElementById('palette-strip');
  var colors = getHarmonyColors(STATE.baseColor, STATE.activeScheme);
  strip.innerHTML = colors.map(function(c) {
    var hex = rgb2hex(c.r, c.g, c.b);
    return '<div class="palette-chip" style="background:' + hex + '" onclick="copyToClipboard(' + JSON.stringify(hex) + ')"></div>';
  }).join('');
}

// ── THEORY TEXT ───────────────────────────────────────────────
function renderTheory() {
  var scheme = SCHEMES[STATE.activeScheme];
  document.getElementById('theory-text').innerHTML = scheme.desc;
}

// ── VALUE SCALE ───────────────────────────────────────────────
function renderValueScale(rgb) {
  var scale = document.getElementById('value-scale');
  if (!scale) return;
  var steps = getValueScale(rgb, 11);
  scale.innerHTML = steps.map(function(c) {
    var hex = rgb2hex(c.r, c.g, c.b);
    return '<div style="flex:1;background:' + hex + ';cursor:pointer" onclick="copyToClipboard(' + JSON.stringify(hex) + ')" title="' + hex + '"></div>';
  }).join('');
}

// ── MIXER ─────────────────────────────────────────────────────
function updateMix() {
  var t = parseInt(document.getElementById('mix-ratio').value) / 100;
  var mix = mixPigments(STATE.mixA, STATE.mixB, t);
  var hex = rgb2hex(mix.r, mix.g, mix.b);
  document.getElementById('mix-result-swatch').style.background = hex;
  document.getElementById('mix-result-hex').textContent = hex;
  document.getElementById('mix-result-rgb').textContent = 'RGB ' + mix.r + ', ' + mix.g + ', ' + mix.b;
  document.getElementById('ratio-a-label').textContent = 'A ' + (100 - Math.round(t * 100)) + '%';
  document.getElementById('ratio-b-label').textContent = 'B ' + Math.round(t * 100) + '%';
  renderValueScale(mix);
  STATE._mixResult = mix;

  // Throttle mentor tips on slider drag
  clearTimeout(STATE._mixTipTimer);
  STATE._mixTipTimer = setTimeout(function() {
    fireMixTip();
    updateTabMentorCard('mixer', _getActiveMixTipId(), {});
  }, 600);
}

function _getActiveMixTipId() {
  var ratio = parseInt(document.getElementById('mix-ratio').value);
  if (ratio <= 10 || ratio >= 90) return 'mixer_ratio_extreme';
  var hslA = rgb2hsl(STATE.mixA.r, STATE.mixA.g, STATE.mixA.b);
  var hslB = rgb2hsl(STATE.mixB.r, STATE.mixB.g, STATE.mixB.b);
  var hueDiff = Math.abs(hslA.h - hslB.h);
  if (hueDiff > 180) hueDiff = 360 - hueDiff;
  if (hueDiff >= 140) return 'mixer_complements_mixed';
  return 'mixer_opened';
}

// ── SAVE PALETTE ──────────────────────────────────────────────
function savePalette() {
  var colors = getHarmonyColors(STATE.baseColor, STATE.activeScheme);
  var hexes = colors.map(function(c) { return rgb2hex(c.r, c.g, c.b); });
  STATE.savedPalettes.unshift({ scheme: SCHEMES[STATE.activeScheme].name, colors: hexes, ts: Date.now() });
  if (STATE.savedPalettes.length > 10) STATE.savedPalettes.pop();
  try { localStorage.setItem('pg_palettes', JSON.stringify(STATE.savedPalettes)); } catch (e) {}
  renderSaved();
  showToast('Palette saved!');
  MENTOR.fire('palette_saved');
}

// ── SAVED PALETTES ────────────────────────────────────────────
function renderSaved() {
  var list = document.getElementById('saved-list');
  var card = document.getElementById('saved-palettes-card');
  if (!STATE.savedPalettes.length) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  list.innerHTML = STATE.savedPalettes.map(function(p, i) {
    var chips = p.colors.map(function(h) {
      return '<div style="flex:1;border-radius:4px;background:' + h + ';cursor:pointer" onclick="copyToClipboard(' + JSON.stringify(h) + ')"></div>';
    }).join('');
    return '<div style="display:flex;gap:6px;align-items:center"><div style="flex:1"><div style="font-family:var(--font-mono);font-size:0.58rem;color:var(--muted);margin-bottom:4px">' + p.scheme + '</div><div style="display:flex;gap:3px;height:24px">' + chips + '</div></div><button onclick="deletePalette(' + i + ')" style="font-size:0.8rem;color:var(--muted);padding:4px">x</button></div>';
  }).join('');
}

function deletePalette(i) {
  STATE.savedPalettes.splice(i, 1);
  try { localStorage.setItem('pg_palettes', JSON.stringify(STATE.savedPalettes)); } catch (e) {}
  renderSaved();
}

// ── WIRE EVENTS ───────────────────────────────────────────────
function wireEvents() {
  // Tab navigation
  document.querySelectorAll('.tab-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { switchTab(btn.dataset.tab); });
  });
  document.querySelectorAll('.nav-btn').forEach(function(btn) {
    btn.addEventListener('click', function() { switchTab(btn.dataset.tab); });
  });

  // Top bar
  document.getElementById('ar-btn').addEventListener('click', function() { showToast('AR loads in Phase 6'); });
  document.getElementById('save-btn').addEventListener('click', savePalette);

  // Base color
  document.getElementById('edit-base-btn').addEventListener('click', function() { openPicker('base'); });
  document.getElementById('base-swatch').addEventListener('click', function() { openPicker('base'); });

  // Picker
  document.getElementById('picker-close-btn').addEventListener('click', closePicker);
  document.getElementById('native-picker').addEventListener('input', function(e) { onPickerChange(e.target.value); });

  // Mixer swatches
  document.getElementById('mix-a-swatch').addEventListener('click', function() { openPicker('mixA'); });
  document.getElementById('mix-b-swatch').addEventListener('click', function() { openPicker('mixB'); });

  // Wheel → set base
  document.getElementById('set-base-wheel-btn').addEventListener('click', function() {
    if (STATE.wheelColor) {
      STATE.baseColor = { r: STATE.wheelColor.r, g: STATE.wheelColor.g, b: STATE.wheelColor.b };
      renderBaseColor();
      showToast('Base color updated!');
    }
  });

  // Mix → set base
  document.getElementById('set-base-mix-btn').addEventListener('click', function() {
    if (STATE._mixResult) {
      STATE.baseColor = { r: STATE._mixResult.r, g: STATE._mixResult.g, b: STATE._mixResult.b };
      renderBaseColor();
      showToast('Base set from mix!');
    }
  });

  // AR / freeze stubs
  document.getElementById('ar-toggle-btn').addEventListener('click', function() { showToast('AR loads in Phase 6'); });
  document.getElementById('freeze-btn').addEventListener('click', function() { showToast('AR loads in Phase 6'); });

  // Mix ratio
  document.getElementById('mix-ratio').addEventListener('input', updateMix);

  // Grid buttons — fire mentor tip on switch
  document.querySelectorAll('.grid-tool-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.grid-tool-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
      STATE.activeGrid = btn.dataset.grid;
      showToast(btn.dataset.grid + ' grid selected');
      // Fire grid mentor tip
      var tipId = 'grid_' + btn.dataset.grid;
      MENTOR.fire(tipId);
      updateTabMentorCard('grid', tipId, {});
    });
  });

  // Grid controls
  document.getElementById('grid-opacity').addEventListener('input', function(e) {
    document.getElementById('opac-val').textContent = e.target.value + '%';
  });
  document.getElementById('grid-scale').addEventListener('input', function(e) {
    document.getElementById('scale-val').textContent = (e.target.value / 10).toFixed(1) + 'x';
  });

  // ── MENTOR deep dive buttons on tab cards ──────────────────
  // Wheel deep dive
  var deepWheel = document.getElementById('mentor-deep-btn-wheel');
  if (deepWheel) {
    deepWheel.addEventListener('click', function() {
      var tipId = deepWheel.dataset.tipId || 'wheel_opened';
      _goDepperForSlot('wheel', tipId);
    });
  }

  // Mixer deep dive
  var deepMixer = document.getElementById('mentor-deep-btn-mixer');
  if (deepMixer) {
    deepMixer.addEventListener('click', function() {
      var tipId = deepMixer.dataset.tipId || 'mixer_opened';
      _goDepperForSlot('mixer', tipId);
    });
  }

  // Grid deep dive
  var deepGrid = document.getElementById('mentor-deep-btn-grid');
  if (deepGrid) {
    deepGrid.addEventListener('click', function() {
      var tipId = deepGrid.dataset.tipId || 'grid_perspective';
      _goDepperForSlot('grid', tipId);
    });
  }
}

// ── GO DEEPER FOR TAB CARDS ───────────────────────────────────
async function _goDepperForSlot(slot, tipId) {
  if (!MENTOR.isOnline) {
    var resultEl = document.getElementById('mentor-deep-result-' + slot);
    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = '<span class="mentor-error">Connect to the internet to unlock AI-powered lessons.</span>';
    }
    return;
  }

  var deepBtn = document.getElementById('mentor-deep-btn-' + slot);
  var resultEl = document.getElementById('mentor-deep-result-' + slot);

  if (deepBtn) { deepBtn.textContent = '⟳ Thinking...'; deepBtn.disabled = true; }
  if (resultEl) { resultEl.style.display = 'block'; resultEl.innerHTML = '<span class="mentor-thinking">Consulting the mentor...</span>'; }

  var tip = MENTOR.TIPS[tipId];
  if (!tip) return;

  var prompt = 'You are PRISM-GAUGE, an expert art mentor specializing in color theory, composition, and acrylic painting technique. The artist is at ' + MENTOR.level + ' level and has made ' + MENTOR.interactions + ' interactions with the app.\n\n' + tip.deeper_context + '\n\nRespond in 3-4 short paragraphs. Be specific, practical, and inspiring. Use painter\'s language. Reference real artists or techniques where relevant. Address the artist directly. Do not use bullet points — write in flowing, mentor-style prose.';

  try {
    var response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: 'claude-sonnet-4-20250514',
        max_tokens: 1000,
        messages: [{ role: 'user', content: prompt }]
      })
    });
    var data = await response.json();
    var text = data.content?.[0]?.text || 'Could not load. Try again.';
    if (resultEl) {
      resultEl.innerHTML = text.split('\n\n').map(function(p) { return '<p>' + p + '</p>'; }).join('');
    }
  } catch (e) {
    if (resultEl) {
      resultEl.innerHTML = '<span class="mentor-error">Connection issue. Try again.</span>';
    }
  }

  if (deepBtn) { deepBtn.textContent = '✦ Go Deeper'; deepBtn.disabled = false; }
}

// ── WHEEL COLOR PICK HOOK ─────────────────────────────────────
// Called from wheel.js when user taps the wheel
function onWheelColorPicked(rgb) {
  STATE.wheelColor = rgb;

  var hex = rgb2hex(rgb.r, rgb.g, rgb.b);
  var swatchEl = document.getElementById('wheel-swatch');
  var hexEl = document.getElementById('wheel-hex');
  var rgbEl = document.getElementById('wheel-rgb');

  if (swatchEl) swatchEl.style.background = hex;
  if (hexEl) hexEl.textContent = hex;
  if (rgbEl) rgbEl.textContent = 'RGB ' + rgb.r + ', ' + rgb.g + ', ' + rgb.b;

  // Fire wheel mentor tip
  MENTOR.fire('wheel_color_picked', rgb);
  updateTabMentorCard('wheel', 'wheel_color_picked', rgb);
}

// ── INIT ──────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', function() {
  // Load saved palettes
  try { STATE.savedPalettes = JSON.parse(localStorage.getItem('pg_palettes') || '[]'); } catch (e) { STATE.savedPalettes = []; }

  // Init mixer swatches
  document.getElementById('mix-a-swatch').style.background = rgb2hex(STATE.mixA.r, STATE.mixA.g, STATE.mixA.b);
  document.getElementById('mix-b-swatch').style.background = rgb2hex(STATE.mixB.r, STATE.mixB.g, STATE.mixB.b);

  // Wire all events
  wireEvents();

  // Render initial state
  renderBaseColor();
  renderSaved();
  updateMix();
  setStatus('offline');

  // Init mentor system
  MENTOR.init();

  // Fire initial grid tip
  updateTabMentorCard('grid', 'grid_perspective', {});

  // Fire initial mixer tip
  updateTabMentorCard('mixer', 'mixer_opened', {});

  // Fire initial wheel tip
  updateTabMentorCard('wheel', 'wheel_opened', {});

  showToast('PRISM-GAUGE initialized', 2200);
});
