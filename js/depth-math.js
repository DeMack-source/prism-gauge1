// ── DEPTH MATH ────────────────────────────────────────
// Deterministic colour-for-distance.
//
// One question lives here: given a colour that is right up close, what should it
// become one plane and two planes further away? Pure functions — no state, no
// network, no randomness. Depends on color-math.js for rgb2hsl / hsl2rgb /
// toLinear / colorTemp.
//
// PLANES  1 = near   2 = middle   3 = far
//
// The four recession dials these numbers encode:
//   1. chroma falls with distance — faster than value does
//   2. value compresses toward the atmosphere's value (darks lift, lights hold)
//   3. hue drifts toward the hue of the air, not the object's local hue
//   4. contrast and edge fall away (see localContrast below)
//
// VALUE AND CHROMA ARE CONTROLLED IN CIE L*/C*, NOT HSL.
// HSL lightness and saturation are convenient but not perceptual: HSL saturation
// stays high in near-black and near-white, where real chroma collapses. The dials
// below promise "keeps 42% of its chroma", so chroma has to be the quantity being
// measured. Hue stays in HSL, because the colour wheel in this app is HSL and the
// numbers the learner sees on that wheel must keep meaning the same thing.

const DEPTH_PLANES = {
  1: { label: 'Near',   valueMove: 0.00, chromaKeep: 1.00, hueDriftDeg: 0  },
  2: { label: 'Middle', valueMove: 0.18, chromaKeep: 0.72, hueDriftDeg: 8  },
  3: { label: 'Far',    valueMove: 0.45, chromaKeep: 0.42, hueDriftDeg: 22 }
};

// A colour darker than the air lifts toward it faster than a lighter one falls:
// outdoors, haze lifts darks and barely touches lights.
const LIFT_BIAS = 1.25;
const HOLD_BIAS = 0.85;

// Target hue a warm (1) or cool (0) light pulls toward, in degrees.
const WARM_HUE = 40;
const COOL_HUE = 220;
// Maximum hue rotation caused by light temperature alone, at strength 1.
const TEMP_MAX_DEG = 6;

function _clamp(v, lo, hi){ return Math.max(lo, Math.min(hi, v)); }
function _normHue(h){ h = h % 360; return h < 0 ? h + 360 : h; }
function _round(v, dp){ const m = Math.pow(10, dp || 0); return Math.round(v * m) / m; }

// ── CIE L* / C* ───────────────────────────────────
// L* is perceptual lightness (0 black, 100 white) — what a painter means by
// "value". C* is chroma — what they mean by "how saturated is it really".
function _lab(rgb){
  const r = toLinear(rgb.r), g = toLinear(rgb.g), b = toLinear(rgb.b);
  const X = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047;
  const Y = (0.2126 * r + 0.7152 * g + 0.0722 * b);
  const Z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883;
  const f = t => t > 0.008856 ? Math.cbrt(t) : (7.787 * t + 16 / 116);
  const fx = f(X), fy = f(Y), fz = f(Z);
  return { L: 116 * fy - 16, a: 500 * (fx - fy), b: 200 * (fy - fz) };
}

function valueOf(rgb){
  return _clamp(_lab(rgb).L, 0, 100);
}

function chromaOf(rgb){
  const lab = _lab(rgb);
  return Math.sqrt(lab.a * lab.a + lab.b * lab.b);
}

// ── CONTRAST ──────────────────────────────────────
// WCAG-style relative luminance, 0..1. Used for honest local-contrast scores:
// a "high contrast" pair sitting in the middle of the value scale is not high
// contrast, and this is the number that shows it.
function relativeLuminance(rgb){
  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
}

// Ratio of 1 (identical) upward. WCAG calls 4.5 the normal-text threshold, which
// is a useful anchor: below it, two shapes will not separate at a glance.
function localContrast(c1, c2){
  const a = relativeLuminance(c1), b = relativeLuminance(c2);
  const hi = Math.max(a, b), lo = Math.min(a, b);
  return (hi + 0.05) / (lo + 0.05);
}

// ── HUE / TEMPERATURE DELTAS ─────────────────────────
// Shortest arc between two hues, -180..180. Positive = b sits clockwise of a.
function hueDelta(a, b){
  let d = (_normHue(b) - _normHue(a)) % 360;
  if (d > 180) d -= 360;
  if (d < -180) d += 360;
  return d;
}

// Signed warm/cool difference on the app's existing 0..1 scale, reported in
// points. Positive = a is warmer than b.
function tempDelta(a, b){
  return (colorTemp(a.r, a.g, a.b) - colorTemp(b.r, b.g, b.b)) * 100;
}

// ── SOLVER: hit a target L* and C* at a fixed HSL hue ────────
// HSL lightness and CIE L* disagree, and HSL saturation and C* disagree more, so
// asking for "L 78, 42% chroma" needs a search rather than a formula. Both are
// monotonic enough for bisection, and 16 steps puts the result within a rounding
// step of the target. Deterministic, ~300 cheap conversions, no allocation of
// anything the caller sees.
function _solveValue(h, s, targetL){
  let lo = 0, hi = 100;
  for (let i = 0; i < 18; i++){
    const mid = (lo + hi) / 2;
    if (valueOf(hsl2rgb(h, s, mid)) < targetL) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

function _solveChroma(h, targetL, targetC){
  let lo = 0, hi = 100, s = 0, l = _solveValue(h, 0, targetL);
  for (let i = 0; i < 16; i++){
    const mid = (lo + hi) / 2;
    const ml = _solveValue(h, mid, targetL);
    if (chromaOf(hsl2rgb(h, mid, ml)) < targetC){ lo = mid; s = mid; l = ml; }
    else hi = mid;
  }
  return hsl2rgb(h, s, l);
}

// ── THE SHIFT ────────────────────────────────────
// depthShift(rgb, opts) -> new rgb
//
//   plane      1 | 2 | 3      which depth plane this colour sits in
//   atmHue     0..360         hue of the air / light filling the distance
//   atmValue   0..100         L* of that air
//   lightTemp  0..1           the scene light's temperature (0.5 = neutral)
//   strength   0..1           how far toward the far plane to push (default 1)
//
// At strength 1 the far plane keeps 42% of its C*, closes 45% of the gap to the
// atmosphere's L*, and drifts up to 22 degrees toward the atmosphere's hue.
// Strength exists so a learner can watch one dial move instead of being handed a
// finished colour they cannot account for.
function depthShift(rgb, opts){
  opts = opts || {};
  const planeKey = DEPTH_PLANES[opts.plane] ? opts.plane : 1;
  const P = DEPTH_PLANES[planeKey];
  const strength = opts.strength == null ? 1 : _clamp(opts.strength, 0, 1);
  const hsl = rgb2hsl(rgb.r, rgb.g, rgb.b);

  const atmHue = opts.atmHue == null ? hsl.h : _normHue(opts.atmHue);
  const atmValue = opts.atmValue == null ? valueOf(rgb) : _clamp(opts.atmValue, 0, 100);
  const lightTemp = opts.lightTemp == null ? 0.5 : _clamp(opts.lightTemp, 0, 1);

  const startL = valueOf(rgb);
  const startC = chromaOf(rgb);

  // 1. VALUE — close part of the gap to the atmosphere's L*, with darks moving
  //    further than lights. The +C hold keeps a light near-white from going dead.
  let valueMove = P.valueMove * strength;
  let valueBias = 1;
  if (atmValue > startL){ valueBias = LIFT_BIAS; }
  else if (atmValue < startL){ valueBias = HOLD_BIAS; }
  const targetL = _clamp(startL + (atmValue - startL) * valueMove * valueBias, 2, 98);

  // 2. CHROMA — falls faster than value does. This is the dial that carries
  //    distance more than anything else a beginner can actually see.
  const targetC = startC * (1 - (1 - P.chromaKeep) * strength);

  // 3. HUE — drift toward the air's hue, never past it.
  let h = hsl.h;
  const drift = P.hueDriftDeg * strength;
  if (drift > 0){
    const d = hueDelta(h, atmHue);
    h = _normHue(h + Math.sign(d) * Math.min(Math.abs(d), drift));
  }

  // 4. TEMPERATURE — the light's temperature tips every plane a few degrees
  //    toward warm or cool. Small on purpose: a nudge, not a repaint.
  if (lightTemp !== 0.5){
    const target = lightTemp > 0.5 ? WARM_HUE : COOL_HUE;
    const maxDeg = Math.abs(lightTemp - 0.5) * 2 * TEMP_MAX_DEG * strength;
    const d = hueDelta(h, target);
    h = _normHue(h + Math.sign(d) * Math.min(Math.abs(d), maxDeg));
  }

  // Nothing to change: hand back a copy so callers can rely on identity.
  if (targetL === startL && targetC === startC && h === hsl.h){
    return { r: rgb.r, g: rgb.g, b: rgb.b };
  }

  return _solveChroma(h, targetL, targetC);
}

// Convenience: the same colour pushed through all three planes.
function depthFamily(rgb, opts){
  return [1, 2, 3].map(plane => depthShift(rgb, Object.assign({}, opts || {}, { plane: plane })));
}

// ── THE AUDIT ────────────────────────────────────
// auditDepthPalette(planes, opts) -> { planes, separation, coach }
//
// planes = [[near...], [middle...], [far...]] — any number of colours per plane.
// Returns the measured numbers plus exactly three coach sentences, each naming a
// number. Never adjectives alone: "lift one to 90" teaches, "good contrast" does
// not. Advice is also bounded by what the dials can actually achieve, so it never
// asks for a hue drift the app cannot perform.
function _planeStats(colors){
  const n = colors.length;
  if (!n) return null;
  const chromas = colors.map(chromaOf);
  const values = colors.map(valueOf);
  // Circular mean hue — plain averaging breaks across the 0/360 seam.
  let sx = 0, sy = 0;
  colors.forEach(c => {
    const h = rgb2hsl(c.r, c.g, c.b).h * Math.PI / 180;
    sx += Math.cos(h); sy += Math.sin(h);
  });
  const hue = _normHue(Math.atan2(sy / n, sx / n) * 180 / Math.PI);
  const mean = arr => arr.reduce((a, b) => a + b, 0) / arr.length;
  const maxV = Math.max.apply(null, values), minV = Math.min.apply(null, values);
  return {
    count: n,
    chroma: _round(mean(chromas), 1),
    valueMin: _round(minV, 1),
    valueMax: _round(maxV, 1),
    valueSpan: _round(maxV - minV, 1),
    valueMean: _round(mean(values), 1),
    hue: _round(hue, 0)
  };
}

function auditDepthPalette(planes, opts){
  opts = opts || {};
  const stats = (planes || []).map(p => _planeStats(p || []));
  const near = stats[0], far = stats[2];

  if (!near || !far){
    return {
      planes: stats,
      separation: null,
      coach: [
        'Nothing to audit yet — the near plane and the far plane both need at least one colour.',
        'Add a colour to each plane, then audit again.',
        'Three planes, one rule: only one of them gets full chroma and the full value range.'
      ]
    };
  }

  const chromaFall = near.chroma > 0 ? 1 - far.chroma / near.chroma : 0;
  const spanRatio = near.valueSpan > 0 ? far.valueSpan / near.valueSpan : 1;
  const hueDrift = Math.abs(hueDelta(near.hue, far.hue));
  const atmHue = opts.atmHue == null ? null : _normHue(opts.atmHue);
  const hueToAir = atmHue == null ? null : Math.abs(hueDelta(far.hue, atmHue));

  const coach = [];

  // Dial 1 — chroma.
  if (chromaFall < 0.25){
    coach.push(
      'Plane 3 is holding ' + far.chroma + ' chroma against ' + near.chroma +
      ' at the front — only a ' + _round(chromaFall * 100, 0) + '% drop. Take it to about ' +
      _round(near.chroma * DEPTH_PLANES[3].chromaKeep, 0) +
      ' and the distance will start to read.'
    );
  } else {
    coach.push(
      'Chroma falls ' + _round(chromaFall * 100, 0) + '% from front to back (' +
      near.chroma + ' to ' + far.chroma + '), which is doing real work.'
    );
  }

  // Dial 2 — value compression. A single colour per plane has no span to
  // compress, so measuring it would produce confident nonsense.
  if (near.count < 2 || far.count < 2){
    coach.push(
      'One colour per plane cannot show a span — the far plane is a single L ' +
      far.valueMean + ' against ' + near.count + ' at the front. Add a second colour to each and the compression becomes measurable; it should land near ' +
      _round(100 * DEPTH_PLANES[3].valueMove, 0) + "% of the front's span."
    );
  } else if (spanRatio > 0.6){
    coach.push(
      'Your far plane spans ' + far.valueSpan + ' value steps against ' +
      near.valueSpan + ' at the front. Squeeze it into a band of about ' +
      _round(near.valueSpan * DEPTH_PLANES[3].valueMove, 0) + ' around L ' +
      far.valueMean + '.'
    );
  } else {
    coach.push(
      'Value span compresses to ' + _round(spanRatio * 100, 0) + '% of the front (' +
      far.valueSpan + ' steps against ' + near.valueSpan + '), so the planes do not compete.'
    );
  }

  // Dial 3 — hue drift toward the air, bounded by what the dial can reach.
  const reach = DEPTH_PLANES[3].hueDriftDeg;
  if (hueToAir != null){
    if (hueToAir > reach + 8){
      coach.push(
        'The far plane sits ' + _round(hueToAir, 0) + ' degrees off the atmosphere at ' +
        atmHue + ', and full drift only closes ' + reach +
        ' of that. Move the atmosphere toward the local hue, or start the far plane from a shifted local colour.'
      );
    } else if (hueToAir > 8){
      coach.push(
        'The far plane sits ' + _round(hueToAir, 0) + ' degrees off the atmosphere at ' +
        atmHue + ' — within reach. Pull it to about ' + _round(Math.max(hueToAir - reach, 0), 0) +
        ' and the air will start to show.'
      );
    } else if (hueToAir < 1){
      coach.push(
        'Far hue sits on the atmosphere at ' + atmHue + ' degrees, so the haze is coherent.'
      );
    } else {
      coach.push(
        'Far hue is within ' + _round(hueToAir, 0) + ' degrees of the atmosphere at ' +
        atmHue + ', so the haze is coherent.'
      );
    }
  } else if (hueDrift < 5){
    coach.push(
      'Front and back share a hue within ' + _round(hueDrift, 0) +
      ' degrees. Set an atmosphere hue and drift the far plane about ' +
      reach + ' degrees toward it.'
    );
  } else {
    coach.push(
      'Hue drifts ' + _round(hueDrift, 0) +
      ' degrees from front to back, which separates the planes by colour rather than by value.'
    );
  }

  return {
    planes: stats,
    separation: {
      chromaFall: _round(chromaFall, 3),
      spanRatio: _round(spanRatio, 3),
      hueDrift: _round(hueDrift, 0),
      hueToAir: hueToAir == null ? null : _round(hueToAir, 0)
    },
    coach: coach
  };
}
