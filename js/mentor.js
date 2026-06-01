// ═══════════════════════════════════════════════════════════════
// PRISM-GAUGE MENTOR SYSTEM
// Offline-first adaptive art education engine
// AI "Go Deeper" available when connected
// ═══════════════════════════════════════════════════════════════

const MENTOR = {

  // ── ADAPTIVE STATE ────────────────────────────────────────────
  level: 'beginner',        // beginner | intermediate | advanced
  interactions: 0,          // total interactions tracked
  seenTips: new Set(),      // avoid repeating tips
  currentTip: null,         // active tip object
  lessonActive: false,      // lesson mode on/off
  currentLesson: null,      // active lesson object
  currentLessonStep: 0,     // step index in lesson
  isOnline: navigator.onLine,

  // ── LEVEL THRESHOLDS ─────────────────────────────────────────
  levelUp() {
    if (this.interactions >= 30) this.level = 'advanced';
    else if (this.interactions >= 12) this.level = 'intermediate';
    else this.level = 'beginner';
  },

  // ── CONTEXTUAL TIP LIBRARY ───────────────────────────────────
  // Each tip: { id, trigger, level[], short, deeper_context }
  // trigger maps to interaction events fired from app.js
  TIPS: {

    // ── COLOR THEORY TIPS ──────────────────────────────────────

    color_warm_selected: {
      id: 'color_warm_selected',
      levels: ['beginner', 'intermediate', 'advanced'],
      beginner: `Warm colors — reds, oranges, yellows — advance toward the viewer. They feel closer, heavier, more urgent. Use them where you want the eye to land first.`,
      intermediate: `Warm colors carry visual weight and create tension against cool passages. In acrylic painting, warming your shadows slightly prevents them from going dead — try a touch of burnt sienna in your dark mixes.`,
      advanced: `Temperature contrast drives spatial recession more reliably than value alone. Push your lights warm and your shadows cool (or vice versa) to create luminosity. Zorn limited his entire palette to yellow ochre, cadmium red, ivory black, and white — and achieved full temperature range.`,
      deeper_context: `The user selected a warm color (high red, low blue). Explain color temperature in painting — warm vs cool, how temperature contrast creates depth and mood, and give a practical tip for using this specific warm hue in an acrylic painting.`
    },

    color_cool_selected: {
      id: 'color_cool_selected',
      levels: ['beginner', 'intermediate', 'advanced'],
      beginner: `Cool colors — blues, purples, blue-greens — recede away from the viewer. They feel distant, lighter, calmer. Use them in backgrounds and shadows to create depth.`,
      intermediate: `Cool colors in shadows make them feel atmospheric rather than just dark. Try ultramarine or dioxazine purple in your dark passages instead of black — your shadows will breathe.`,
      advanced: `Optical color mixing exploits cool-warm tension. Lay cool glazes over warm underlayers — the eye blends them into vibrating neutrals that feel alive compared to anything you could mix on the palette. This is the foundation of the Impressionist luminosity effect.`,
      deeper_context: `The user selected a cool color (high blue, low red). Explain cool color psychology and usage in painting — recession, shadow painting, atmospheric perspective, and how to use this specific cool hue effectively in acrylic work.`
    },

    color_neutral_selected: {
      id: 'color_neutral_selected',
      levels: ['beginner', 'intermediate', 'advanced'],
      beginner: `Neutral colors — grays, browns, muted tones — are your resting places. Every painting needs areas where the eye can pause before moving to the next point of interest.`,
      intermediate: `Neutrals are rarely truly neutral in great paintings. Push them slightly warm or cool to make them participate in the temperature story. A "gray" wall in sunlight leans warm; in shadow it leans cool.`,
      advanced: `Chromatic neutrals — mixed from complements rather than black and white — have a richness that tube grays can't touch. Your neutral here could be mixed from its complement. Try it in the Mixer tab and observe how alive the result feels versus a manufactured gray.`,
      deeper_context: `The user selected a neutral or desaturated color. Explain the role of neutrals in composition and color harmony — how to make neutrals feel rich and intentional rather than dead, and how chromatic grays are mixed from complements.`
    },

    // ── HARMONY SCHEME TIPS ────────────────────────────────────

    scheme_complementary: {
      id: 'scheme_complementary',
      levels: ['beginner', 'intermediate', 'advanced'],
      beginner: `Complementary colors sit directly opposite each other on the wheel. Together they create maximum contrast — one makes the other pop. But mix them on the palette and they neutralize each other into gray.`,
      intermediate: `The 80/20 rule: let one complement dominate 80% of the canvas, use the other as a 20% accent. Equal amounts fight each other. A red painting with blue-green accents sings. Equal red and blue-green screams.`,
      advanced: `Split the difference between complements using a narrow value range to unify them. Delacroix built his whole color system on complementary vibration — notice how he keeps values close while letting temperature opposites do the work. The eye does the mixing.`,
      deeper_context: `The user selected complementary color harmony. Explain how to actually use complementary colors in an acrylic painting — the dominant/accent ratio, avoiding muddy mixes, and how the visual vibration between complements can be exploited for energy or controlled for sophistication.`
    },

    scheme_analogous: {
      id: 'scheme_analogous',
      levels: ['beginner', 'intermediate', 'advanced'],
      beginner: `Analogous colors are neighbors on the wheel — they naturally harmonize like colors in a sunset or a forest. Paintings using analogous schemes feel unified and calm. Add one small accent of the opposite color to prevent it feeling flat.`,
      intermediate: `Analogous schemes excel when you vary value aggressively. The colors are already harmonious so the value structure becomes the drama. Push lights very light and darks very dark — let the analogous colors ride that value skeleton.`,
      advanced: `Monet's water lily series is a masterclass in analogous painting. Notice how he shifts temperature within a narrow hue range — warm greens into cool greens into blue-greens — to create movement without disrupting harmony. Try shifting saturation as you move through your analogous range rather than hue.`,
      deeper_context: `The user selected analogous color harmony. Explain how to build a full painting around analogous colors — value structure, when to add a complementary accent, and how masters like Monet used analogous schemes to create unity with visual interest.`
    },

    scheme_triadic: {
      id: 'scheme_triadic',
      levels: ['beginner', 'intermediate', 'advanced'],
      beginner: `Triadic colors are three hues equally spaced around the wheel. They're vibrant and balanced — think primary colors (red, yellow, blue). Let one dominate, use one to support, and one as a small accent.`,
      intermediate: `The rule of three made visual: 60% dominant, 30% supporting, 10% accent. If all three compete equally the painting feels chaotic. Desaturate two of them slightly and let the third carry full saturation — that's your focal point.`,
      advanced: `Mute your triadic palette by mixing each color with a touch of its complement. This creates a unified chromatic temperature across all three hues — they'll feel like they belong to the same light source, which is the quiet secret behind paintings that look "professional."`,
      deeper_context: `The user selected triadic color harmony. Explain the 60-30-10 rule in painting, how to balance three strong hues without chaos, and the technique of muting triadic colors to create cohesion while maintaining the vibrancy of the scheme.`
    },

    scheme_splitComp: {
      id: 'scheme_splitComp',
      levels: ['beginner', 'intermediate', 'advanced'],
      beginner: `Split-complementary uses your color plus the two colors next to its complement. You get high contrast without the tension of true complementary. It's sophisticated and easier to balance — a great scheme for portraits and figurative work.`,
      intermediate: `The softer contrast in split-comp lets you work with three colors without any two fighting directly. Use the main color for your subject, the two flanking colors for environment and light — they'll harmonize with each other while contrasting with your focal color.`,
      advanced: `Split-comp is the scheme closest to how natural light actually behaves. Your subject in direct warm light, cool shadows pulling toward the complement's neighbors — this is why portrait painters gravitate here intuitively. The indirect complements give you richness without the harshness of pure complementary.`,
      deeper_context: `The user selected split-complementary harmony. Explain why this scheme works so well for portraiture and figurative painting, how the softer contrast compares to true complementary, and how to distribute the three colors across a canvas compositionally.`
    },

    scheme_tetradic: {
      id: 'scheme_tetradic',
      levels: ['intermediate', 'advanced'],
      beginner: `Four colors, two complementary pairs. This is a rich, complex scheme. The key: one color must clearly dominate or the painting becomes visual noise. Try desaturating three and letting one sing.`,
      intermediate: `Tetradic schemes work best when you treat them as two complementary pairs rather than four independent colors. Warm pair dominates, cool pair supports — or vice versa. Never let all four compete at full saturation.`,
      advanced: `Tetradic is the scheme closest to full-spectrum painting. Sargent used tetradic relationships in his watercolors — note how he pushes temperature across all four quadrants of the wheel while unifying with a narrow value range in the lights. The complexity reads as richness, not chaos, because value does the organizing work.`,
      deeper_context: `The user selected tetradic (double-complementary) color harmony. Explain strategies for managing four competing colors — dominance hierarchy, treating it as two comp pairs, and how value structure holds a complex palette together.`
    },

    scheme_monochromatic: {
      id: 'scheme_monochromatic',
      levels: ['beginner', 'intermediate', 'advanced'],
      beginner: `Monochromatic means one hue, varied in lightness and saturation. This is where masters live — it forces you to master value, which is the real foundation of all painting. Everything else is decoration.`,
      intermediate: `A monochromatic painting with a strong value structure reads clearly at any distance. This is the test: squint at your reference — if the lights and darks still read clearly, your composition works. Color is the last layer; value is the structure.`,
      advanced: `Notan — the Japanese concept of light-dark harmony — is most purely expressed in monochromatic work. Before starting any complex painting, doing a monochromatic value study first will reveal compositional weaknesses that color would otherwise camouflage. Value mistakes hide in color; they're naked in mono.`,
      deeper_context: `The user selected monochromatic harmony. Explain the primacy of value in painting, how to create a full range of visual interest with one hue, the concept of notan, and why monochromatic studies are essential practice for serious painters.`
    },

    // ── MIXER TAB TIPS ─────────────────────────────────────────

    mixer_opened: {
      id: 'mixer_opened',
      levels: ['beginner', 'intermediate', 'advanced'],
      beginner: `This mixer simulates subtractive color mixing — how real paint behaves. Unlike screen colors, physical pigments absorb light rather than emit it. Mix red and blue paint and you don't get the same purple your screen does. This engine predicts what you'll actually get on your palette.`,
      intermediate: `The Kubelka-Munk model powering this mixer accounts for how pigments scatter and absorb light. It's why mixing cadmium red and phthalo blue gives a dirty purple while mixing quinacridone red and ultramarine gives a clean violet — pigment chemistry matters, not just hue.`,
      advanced: `Use this to pre-mix before committing paint. When mixing dark colors especially — dark mixes get muddy fast because you're stacking absorption layers. If your predicted result looks duller than expected, that's the physics. Add white to your lighter color first to see how the mix reads in a tint.`,
      deeper_context: `The user opened the mixer tab. Explain subtractive color mixing for acrylic painters — why physical pigments behave differently from screen colors, the Kubelka-Munk model in practical terms, and strategies for predicting and avoiding muddy mixes.`
    },

    mixer_complements_mixed: {
      id: 'mixer_complements_mixed',
      levels: ['beginner', 'intermediate', 'advanced'],
      beginner: `You're mixing near-complementary colors — they'll neutralize each other. This isn't bad! Controlled neutralization is how you create chromatic grays and earthy tones. Try a 70/30 ratio to keep some color identity in the mix.`,
      intermediate: `Mixing complements is how painters create the richest neutrals. Tube grays are flat and dead — a gray mixed from ultramarine and burnt sienna has warmth, depth, and life. The ratio controls whether it leans warm or cool. This is a fundamental technique.`,
      advanced: `Chromatic neutrals from complements respond to light in ways tube neutrals don't. Because they contain both warm and cool pigments, they shift under different light temperatures — warm light pulls them warm, cool light pulls them cool. This is the secret behind naturalistic shadow painting.`,
      deeper_context: `The user is mixing two colors that are near-complements on the color wheel. Explain how complementary mixing creates chromatic neutrals, why these are superior to tube grays in painting, and how to control the warm/cool lean of the resulting neutral.`
    },

    mixer_ratio_extreme: {
      id: 'mixer_ratio_extreme',
      levels: ['beginner', 'intermediate', 'advanced'],
      beginner: `You've pushed the ratio far toward one color. This is tinting — adding a small amount of another color to shift the dominant one. A tiny touch of a second color changes character without changing identity. It's one of the most useful moves in painting.`,
      intermediate: `Tinting with a complement is how you push a color toward earthy, natural tones without reaching for brown. Add a touch of your color's complement to lower its saturation while keeping it alive — more interesting than mixing with white or black alone.`,
      advanced: `This ratio range — 90/10 or greater — is where you adjust a color's temperature without changing its identity. A touch of yellow into red shifts it toward orange warmth. A touch of blue into red cools it toward violet. Sargent's palette was famous for this — small additions that shifted temperature while keeping colors clean.`,
      deeper_context: `The user has pushed the mix ratio to an extreme (heavily favoring one color). Explain tinting, glazing, and how small additions of a second color can shift temperature, saturation, or earthy quality without losing the dominant color's identity.`
    },

    // ── WHEEL TAB TIPS ─────────────────────────────────────────

    wheel_opened: {
      id: 'wheel_opened',
      levels: ['beginner', 'intermediate', 'advanced'],
      beginner: `The color wheel shows three properties: Hue (which color, around the edge), Saturation (how pure, toward the center), and Brightness (how light, radiating outward). Artists who understand all three stop guessing and start navigating.`,
      intermediate: `Most color mistakes are saturation mistakes, not hue mistakes. Beginners grab colors at full saturation — but real-world colors are almost never fully saturated. Flowers are the exception, not the rule. Train yourself to reach toward center before you reach for a tube.`,
      advanced: `Munsell understood that equal saturation steps aren't perceptually equal across different hues. Yellow at high saturation looks garish fast; blue can handle high saturation gracefully. This is why calibrating your eye on the wheel — not just the tube — matters for consistent results.`,
      deeper_context: `The user is exploring the color wheel. Explain HSB (Hue, Saturation, Brightness) as a navigational tool for painters — why understanding these three axes makes color decisions more intentional, and the common mistake of over-saturating colors in painting.`
    },

    wheel_color_picked: {
      id: 'wheel_color_picked',
      levels: ['beginner', 'intermediate', 'advanced'],
      beginner: `You picked a color from the wheel. Notice where it sits — edge means pure, center means muted. Try picking the same hue but closer to center for a version that reads better in a painting context. Pure colors are accent colors, not field colors.`,
      intermediate: `The color you picked has a complement directly across the wheel. Find it and look at the tension between them — that tension is energy you can use or resolve. Resolving it slightly (moving each toward center) gives you a sophisticated near-complement pair.`,
      advanced: `What's the value of this color at full saturation? Every hue has a natural value — yellow is inherently light, violet is inherently dark. When you fight a color's natural value (dark yellow, light violet) you create either striking contrast or muddy mess depending on context. Know your color's natural home.`,
      deeper_context: `The user picked a specific color from the interactive wheel. Explain that color's position in terms of hue, saturation, and value — what its natural value is, where its complement sits, and how to use this specific color effectively in a painting composition.`
    },

    // ── GRID / PERSPECTIVE TIPS ────────────────────────────────

    grid_perspective: {
      id: 'grid_perspective',
      levels: ['beginner', 'intermediate', 'advanced'],
      beginner: `Perspective grid shows how parallel lines converge to a vanishing point. Everything above your eye level angles down toward it; everything below angles up. One-point perspective is the foundation of all spatial painting — master this before anything else.`,
      intermediate: `Use this grid to check your intuitive perspective. Place it over your reference or working surface and verify your angles. Common mistake: objects at the same height in real life should sit at the same height on the horizon — your eye level, not the painting's center.`,
      advanced: `Perspective is about observation, not rule-following. The grid gives you a correction framework — if something feels spatially wrong in a composition, lay the grid over it and find the vanishing point. Often the problem is a single edge that's off-angle, pulling the whole space into question.`,
      deeper_context: `The user is using the perspective grid tool. Explain linear perspective for painters — the horizon line, vanishing points, how to use a perspective grid as a correction tool rather than a rigid rule, and common perspective mistakes in observational painting.`
    },

    grid_golden: {
      id: 'grid_golden',
      levels: ['beginner', 'intermediate', 'advanced'],
      beginner: `The golden ratio (φ ≈ 1.618) appears throughout nature and creates proportions the eye finds naturally harmonious. Place your focal point where the spiral's center lands — not in the corner, not dead center, but in that naturally satisfying sweet spot.`,
      intermediate: `The golden ratio isn't a magic formula — it's a starting point for compositional thinking. What it actually trains is sensitivity to asymmetric balance. Place your horizon line, your focal element, and your major value breaks using its proportions and see how much more interesting the result feels than thirds or center placement.`,
      advanced: `Da Vinci and Vermeer used golden ratio proportions as compositional scaffolding, not rigid grids. The power is in the recursive quality — the same ratio appears at every scale. A composition that honors this creates a sense of harmony the viewer feels without being able to name. It works because it's the geometry of natural growth.`,
      deeper_context: `The user selected the golden ratio grid. Explain the golden ratio's role in art composition — where to place focal points, horizon lines, and major elements, how it differs from the rule of thirds, and why this proportion feels harmonious to the human eye.`
    },

    grid_isometric: {
      id: 'grid_isometric',
      levels: ['beginner', 'intermediate', 'advanced'],
      beginner: `Isometric perspective shows three faces of an object equally — no vanishing points, all parallel lines stay parallel. It's used in technical illustration and certain painting styles. Great for understanding the three planes (top, front, side) that define any three-dimensional form.`,
      intermediate: `Isometric thinking is valuable for form analysis even if you paint in traditional perspective. Every object has a top plane, a front plane, and a side plane — and each one receives light differently. Understanding this three-plane breakdown is the foundation of realistic form painting.`,
      advanced: `The three-plane analysis from isometric thinking maps directly to light and shadow. Top plane catches direct light, front plane catches angled light, side plane goes into shadow. Simplify any complex form into these three planes first, then add detail. This is how illustrators block in before rendering.`,
      deeper_context: `The user selected the isometric grid. Explain three-plane form analysis for painters — how every object can be broken into top, front, and side planes, how light behaves differently across each plane, and how this thinking applies to realistic form and shadow painting.`
    },

    grid_organic: {
      id: 'grid_organic',
      levels: ['beginner', 'intermediate', 'advanced'],
      beginner: `Organic composition uses curves and natural rhythms rather than rigid geometry. The eye follows S-curves and C-curves naturally — they feel like movement and life. Use this grid to find flowing lines that guide the viewer through your painting.`,
      intermediate: `The S-curve is the spine of organic composition. In figurative painting, the gesture line — the single curve that captures the body's movement — is almost always a modified S. In landscape, use it for rivers, paths, and tree lines. It creates movement without tension.`,
      advanced: `Edgar Degas built his compositional genius on the tension between organic curves and hard geometric edges. Diagonal thrust against a stabilizing curve creates dynamic balance. Use this grid not as a template but as a rhythm finder — lay it over your composition sketch and ask: where are my curves, and where are my countering edges?`,
      deeper_context: `The user selected the organic/curve grid. Explain S-curve and C-curve composition in painting — how organic lines guide the eye, the concept of gesture in figurative and landscape work, and how to use flowing compositional lines to create movement and rhythm.`
    },

    // ── SAVE / PALETTE TIPS ────────────────────────────────────

    palette_saved: {
      id: 'palette_saved',
      levels: ['beginner', 'intermediate', 'advanced'],
      beginner: `You saved a palette — good habit. Before starting a painting, having your palette committed prevents decision fatigue mid-session. Painters like Zorn worked from a limited, memorized palette so their brain was free to focus on seeing.`,
      intermediate: `A saved palette is a commitment. Try painting a full study using only these colors — the constraint forces creativity. The most interesting color decisions come from limitation, not from infinite options. What can these colors do that you haven't tried yet?`,
      advanced: `Master painters often worked with palettes of 6 colors or fewer. The constraint forces you to find temperatures, values, and neutrals through mixing rather than reaching for convenience tubes. What's the most muted, most warm, most cool version of each color in this palette? Know your tools before you paint.`,
      deeper_context: `The user saved a color palette. Explain the value of a limited palette in painting — how color constraints drive better decisions, how to systematically learn a new palette before applying it, and historical examples of painters who mastered limited palettes.`
    },

  },

  // ── LESSON PATHS ──────────────────────────────────────────────
  LESSONS: {

    value_foundation: {
      id: 'value_foundation',
      title: 'The Value Foundation',
      icon: '◐',
      description: 'Why value beats color every time — the single most important thing in painting.',
      steps: [
        {
          title: 'What is Value?',
          content: `Value is how light or dark something is, independent of its color. A red and a green can have the same value. Squint at anything — when colors blur into gray, what you see is pure value. This is the skeleton of every painting.`,
          action: 'Go to the Color tab and select a red. Now select a green at the same brightness. They have the same value — value is independent of hue.',
          tab: 'color'
        },
        {
          title: 'The Squint Test',
          content: `Squinting reduces your visual information to pure value structure. If your composition still reads clearly when squinted, it works. If it dissolves into confusion, your values are too close. This is the most important self-critique tool you have.`,
          action: 'Look at the monochromatic scheme — this is what your painting looks like to a squinting eye. Is there enough contrast?',
          tab: 'color'
        },
        {
          title: 'Value Scales',
          content: `Professional painters typically work with a 9-value scale from pure white to pure black. Beginners tend to cluster in the middle, avoiding both extremes. Your lightest lights and darkest darks create the punch. Without them, the painting feels gray and flat.`,
          action: 'Open the Mixer tab. Look at the Value Scale at the bottom — that full range from white to black is your full tool set. Are you using the whole scale?',
          tab: 'mixer'
        },
        {
          title: 'Value Creates Depth',
          content: `Light values advance, dark values recede — but only when handled consistently. Objects in light come forward. Objects in shadow fall back. Atmospheric perspective makes distant objects lighter and lower in contrast. Value is how you create three-dimensional space on a flat surface.`,
          action: 'Select a blue in the Color tab. Notice the value scale shows light blues advancing and dark blues receding — the same hue creates different spatial positions through value alone.',
          tab: 'color'
        },
        {
          title: 'Color Serves Value',
          content: `Here is the hierarchy: Value structure first. Temperature relationships second. Color identity third. When these are in conflict, value wins. A painting with weak values and beautiful colors still fails. A painting with strong values and limited color succeeds. Master value and color becomes decoration.`,
          action: 'Set your base to monochromatic scheme and study the value distribution. This is your painting stripped to its bones. Is the structure strong?',
          tab: 'color'
        }
      ]
    },

    temperature_mood: {
      id: 'temperature_mood',
      title: 'Temperature & Mood',
      icon: '◑',
      description: 'How warm and cool create depth, atmosphere, and emotional resonance.',
      steps: [
        {
          title: 'The Temperature Scale',
          content: `Every color sits somewhere on a warm-cool axis. Reds, oranges, and yellows are warm — they carry the energy of fire and sun. Blues, violets, and blue-greens are cool — they carry the energy of water, sky, and shadow. The temperature gauge at the top of your color card shows exactly where your color sits.`,
          action: 'Pick a bright red and watch the temperature gauge move to warm. Then pick a cobalt blue and watch it swing cool. Feel the difference.',
          tab: 'color'
        },
        {
          title: 'Warm Light, Cool Shadow',
          content: `The most natural temperature relationship in painting: warm light source, cool shadows. Sunlight is warm — it pushes red and yellow into lit surfaces. The sky fills shadows with cool blue light. Painting this relationship — even subtly — immediately makes a painting feel more real and atmospheric.`,
          action: 'Select an orange (warm light). Now find its split-complement scheme — notice the cool blue-greens in the harmony. Those are your shadow colors.',
          tab: 'color'
        },
        {
          title: 'Cool Light, Warm Shadow',
          content: `The reverse relationship creates drama and artificial light. Indoor electric lighting, moonlight, overcast northern light — all cooler. Under cool light, shadows pick up warmth from reflected ground and warm surfaces. This relationship feels more interior, more intimate, more psychological.`,
          action: 'Select a cool blue-violet. Switch to complementary scheme — the orange-red is your warm shadow. This is the relationship for interior or artificial light scenes.',
          tab: 'color'
        },
        {
          title: 'Temperature Contrast = Depth',
          content: `Place a warm color next to a cool color and the warm advances, the cool recedes. This creates spatial depth without perspective. Impressionists exploited this — warm foreground passages against cool backgrounds push depth without any perspective drawing. Temperature does the spatial work.`,
          action: 'In the Mixer tab, mix a warm and a cool at 50/50. Notice how the result sits "back" in space compared to either pure color. Neutrals recede.',
          tab: 'mixer'
        },
        {
          title: 'Emotional Temperature',
          content: `Beyond space, temperature carries emotion. Warm paintings feel energetic, passionate, dangerous, joyful, or aggressive depending on context. Cool paintings feel calm, melancholic, intellectual, mysterious, or cold. The temperature of your dominant color sets the emotional temperature of your entire painting before a single subject is established.`,
          action: 'Look at the temperature gauge. Where does your current base color sit emotionally? What story does that temperature tell?',
          tab: 'color'
        }
      ]
    },

    mixing_without_mud: {
      id: 'mixing_without_mud',
      title: 'Mixing Without Mud',
      icon: '⚗',
      description: 'The physics of pigment — why colors go muddy and how to stay clean.',
      steps: [
        {
          title: 'Why Paint Goes Muddy',
          content: `Mud happens when too many pigments compete. Each pigment absorbs certain wavelengths of light. Stack too many absorbers and you've absorbed most of the spectrum — what reflects back is near-gray. The fewer pigments in a mix, the cleaner the result. This is why limited palettes stay clean.`,
          action: 'In the Mixer tab, try mixing two colors that are far apart on the wheel. Watch how the result loses saturation as they neutralize each other.',
          tab: 'mixer'
        },
        {
          title: 'The Three-Pigment Rule',
          content: `Most professional painters work by a simple rule: no mix should contain more than three pigments. Check your tube labels — many "convenience" colors already contain two or three pigments. Mix two of these and you potentially have six pigments fighting each other. Single-pigment paints stay cleaner.`,
          action: 'Try mixing two very different colors in the Mixer. Now set that result as base and look at its value scale — the neutralization is visible across the whole scale.',
          tab: 'mixer'
        },
        {
          title: 'Mix Toward the Light',
          content: `When mixing tints (adding white), always add color to white — not white to color. A tiny bit of color into white goes a long way and keeps the mix clean. Adding white to a dark color requires large amounts of white and often loses the color's transparency and vitality.`,
          action: 'In the Mixer, set Color A to a dark saturated color and Color B to white. Push the ratio to 90% white, 10% color. This is the right tinting direction — light and clean.',
          tab: 'mixer'
        },
        {
          title: 'Chromatic Neutrals',
          content: `Mix your grays and browns from complements rather than from black. Ultramarine + burnt sienna = rich, living gray-brown that shifts temperature with the ratio. Phthalo green + cadmium red = deep chromatic dark. These neutrals respond to light. Tube grays are dead by comparison.`,
          action: 'In the Mixer, try two complementary colors — check the scheme tab to find your complement first. Push to 50/50. That chromatic neutral is richer than any gray tube.',
          tab: 'mixer'
        },
        {
          title: 'The Clean Brush Rule',
          content: `Between mixes, cleaning your brush is the single most practical mud-prevention tool. Contamination builds invisibly — three mixes in, your "clean" brush is carrying remnants of everything. In acrylic, water and a wipe. Keep the mixing area of your palette clean. Mud accumulates at the brush, not the palette.`,
          action: 'Notice the value scale in the Mixer — if your mix result is grayer than expected, that is the physics of pigment contamination. In real painting, that is a dirty brush.',
          tab: 'mixer'
        }
      ]
    },

    composition_essentials: {
      id: 'composition_essentials',
      title: 'Composition Essentials',
      icon: '⊞',
      description: 'How to arrange elements so the eye moves where you want it to go.',
      steps: [
        {
          title: 'The Eye Needs a Path',
          content: `A composition is a controlled journey. You decide where the eye enters, where it goes, and where it rests. Without a designed path, the eye wanders randomly and the painting feels uncomfortable. Every compositional tool — line, value, color, edge — is about guiding that journey.`,
          action: 'Go to the Grid tab and select Perspective. Notice how all lines converge — that convergence is the strongest eye-magnet in the composition. The eye follows lines to their destination.',
          tab: 'grid'
        },
        {
          title: 'The Rule of Odds',
          content: `Odd numbers of elements feel more dynamic than even numbers. Three focal points read better than two or four. Two objects feel like a standoff — the eye bounces between them. Three create a relationship and a visual triangle that the eye travels. This is why landscape painters often use three value zones.`,
          action: 'Look at your triadic color scheme — three colors create a visual triangle. The eye travels between them. That same triangular movement works in composition with three focal areas.',
          tab: 'color'
        },
        {
          title: 'Avoid the Center',
          content: `Dead center placement feels static and literal. The sweet spot for a focal point is approximately one-third in from any edge — the rule of thirds approximates the golden ratio. Off-center placement creates tension that makes the eye want to explore the rest of the canvas.`,
          action: 'Switch to the Golden grid in the Grid tab. See where the spiral center lands — that is your natural focal point. Not center. Not corner. That particular sweet spot.',
          tab: 'grid'
        },
        {
          title: 'Value Creates Focus',
          content: `The highest contrast area in a painting is where the eye goes first — every time, without exception. This is your focal point. If you have high contrast everywhere, the eye panics and doesn't know where to look. Lower the contrast everywhere except your focal point and the composition organizes itself.`,
          action: 'In the Color tab, select complementary scheme. Maximum contrast lives there. That contrast level should appear only at your focal point — everywhere else, step it down.',
          tab: 'color'
        },
        {
          title: 'Edges Are Sentences',
          content: `Hard edges say "look here." Soft edges say "keep moving." Lost edges (where an object disappears into its background) say "rest." Master painters vary their edges constantly — crisp at the focal point, softening progressively outward. Your sharpest edge should be at your focal point. Soften everything else.`,
          action: 'Look at the organic grid — those soft curves represent soft edges, the kind that let the eye glide through a composition. The perspective grid represents hard edges that stop and direct the eye.',
          tab: 'grid'
        }
      ]
    }

  },

  // ── TRIGGER → TIP MAPPING ─────────────────────────────────────
  // Called from app.js on every significant interaction
  fire(trigger, context) {
    this.interactions++;
    this.levelUp();

    const tip = this.TIPS[trigger];
    if (!tip) return;

    // Don't repeat tips too soon
    if (this.seenTips.has(trigger) && this.seenTips.size < Object.keys(this.TIPS).length) return;

    this.seenTips.add(trigger);
    this.currentTip = { ...tip, trigger, context };

    const text = tip[this.level] || tip['beginner'];
    this._renderTip(text, trigger, context);
  },

  // ── RENDER TIP TO UI ──────────────────────────────────────────
  _renderTip(text, trigger, context) {
    const card = document.getElementById('mentor-tip-card');
    const textEl = document.getElementById('mentor-tip-text');
    const levelEl = document.getElementById('mentor-level-badge');
    const deepBtn = document.getElementById('mentor-deep-btn');

    if (!card || !textEl) return;

    textEl.innerHTML = text;

    if (levelEl) {
      levelEl.textContent = this.level.toUpperCase();
      levelEl.className = 'mentor-level-badge mentor-level-' + this.level;
    }

    // Pulse the card
    card.classList.remove('mentor-pulse');
    void card.offsetWidth; // reflow
    card.classList.add('mentor-pulse');

    // Deep button state
    if (deepBtn) {
      if (this.isOnline) {
        deepBtn.classList.remove('mentor-deep-offline');
        deepBtn.title = 'Get an AI-powered deep dive on this topic';
      } else {
        deepBtn.classList.add('mentor-deep-offline');
        deepBtn.title = 'Connect to internet for AI deep dive';
      }
    }
  },

  // ── AI DEEP DIVE ──────────────────────────────────────────────
  async goDeeper() {
    if (!this.isOnline) {
      this._showDeepResult('Connect to the internet to unlock AI-powered lessons. All core tips work offline.', true);
      return;
    }

    if (!this.currentTip) return;

    const deepBtn = document.getElementById('mentor-deep-btn');
    const resultEl = document.getElementById('mentor-deep-result');

    if (deepBtn) {
      deepBtn.textContent = '⟳ Thinking...';
      deepBtn.disabled = true;
    }
    if (resultEl) {
      resultEl.style.display = 'block';
      resultEl.innerHTML = '<span class="mentor-thinking">Consulting the mentor...</span>';
    }

    // Build context-aware prompt
    const tip = this.currentTip;
    const prompt = `You are PRISM-GAUGE, an expert art mentor specializing in color theory, composition, and acrylic painting technique. The artist is at ${this.level} level and has made ${this.interactions} interactions with the app.

${tip.deeper_context}

Respond in 3-4 short paragraphs. Be specific, practical, and inspiring. Use painter's language. Reference real artists or techniques where relevant. Address the artist directly. Do not use bullet points — write in flowing, mentor-style prose.`;

    try {
      const response = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'claude-sonnet-4-20250514',
          max_tokens: 1000,
          messages: [{ role: 'user', content: prompt }]
        })
      });

      const data = await response.json();
      const text = data.content?.[0]?.text || 'Could not load deep dive. Try again.';
      this._showDeepResult(text, false);
    } catch (e) {
      this._showDeepResult('Connection issue. Check your internet and try again.', true);
    }

    if (deepBtn) {
      deepBtn.textContent = '✦ Go Deeper';
      deepBtn.disabled = false;
    }
  },

  _showDeepResult(text, isError) {
    const resultEl = document.getElementById('mentor-deep-result');
    if (!resultEl) return;
    resultEl.style.display = 'block';
    resultEl.innerHTML = isError
      ? `<span class="mentor-error">${text}</span>`
      : text.split('\n\n').map(p => `<p>${p}</p>`).join('');
  },

  // ── LESSON MODE ───────────────────────────────────────────────
  startLesson(lessonId) {
    const lesson = this.LESSONS[lessonId];
    if (!lesson) return;
    this.lessonActive = true;
    this.currentLesson = lesson;
    this.currentLessonStep = 0;
    this._renderLesson();
  },

  nextLessonStep() {
    if (!this.currentLesson) return;
    if (this.currentLessonStep < this.currentLesson.steps.length - 1) {
      this.currentLessonStep++;
      this._renderLesson();
    } else {
      this.endLesson();
    }
  },

  prevLessonStep() {
    if (this.currentLessonStep > 0) {
      this.currentLessonStep--;
      this._renderLesson();
    }
  },

  endLesson() {
    this.lessonActive = false;
    this.currentLesson = null;
    this.currentLessonStep = 0;
    const overlay = document.getElementById('lesson-overlay');
    if (overlay) overlay.classList.remove('open');
  },

  _renderLesson() {
    const overlay = document.getElementById('lesson-overlay');
    const titleEl = document.getElementById('lesson-title');
    const stepTitleEl = document.getElementById('lesson-step-title');
    const stepContentEl = document.getElementById('lesson-step-content');
    const stepActionEl = document.getElementById('lesson-step-action');
    const progressEl = document.getElementById('lesson-progress');
    const nextBtn = document.getElementById('lesson-next-btn');

    if (!overlay) return;

    const step = this.currentLesson.steps[this.currentLessonStep];
    const total = this.currentLesson.steps.length;
    const current = this.currentLessonStep + 1;

    if (titleEl) titleEl.textContent = this.currentLesson.title;
    if (stepTitleEl) stepTitleEl.textContent = `${current}. ${step.title}`;
    if (stepContentEl) stepContentEl.textContent = step.content;
    if (stepActionEl) stepActionEl.innerHTML = `<span class="lesson-action-icon">→</span> ${step.action}`;
    if (progressEl) {
      progressEl.innerHTML = Array.from({ length: total }, (_, i) =>
        `<div class="lesson-dot ${i < current ? 'done' : ''} ${i === this.currentLessonStep ? 'active' : ''}"></div>`
      ).join('');
    }
    if (nextBtn) {
      nextBtn.textContent = current === total ? 'Finish ✓' : 'Next →';
    }

    // Navigate to suggested tab
    if (step.tab && typeof switchTab === 'function') {
      switchTab(step.tab);
    }

    overlay.classList.add('open');
  },

  // ── LESSON PICKER ─────────────────────────────────────────────
  showLessonPicker() {
    const picker = document.getElementById('lesson-picker');
    if (picker) picker.classList.add('open');
  },

  hideLessonPicker() {
    const picker = document.getElementById('lesson-picker');
    if (picker) picker.classList.remove('open');
  },

  // ── ONLINE STATUS ─────────────────────────────────────────────
  initOnlineWatcher() {
    window.addEventListener('online', () => {
      this.isOnline = true;
      const deepBtn = document.getElementById('mentor-deep-btn');
      if (deepBtn) deepBtn.classList.remove('mentor-deep-offline');
    });
    window.addEventListener('offline', () => {
      this.isOnline = false;
      const deepBtn = document.getElementById('mentor-deep-btn');
      if (deepBtn) deepBtn.classList.add('mentor-deep-offline');
    });
  },

  // ── INIT ──────────────────────────────────────────────────────
  init() {
    this.initOnlineWatcher();
    // Wire deep dive button
    const deepBtn = document.getElementById('mentor-deep-btn');
    if (deepBtn) deepBtn.addEventListener('click', () => this.goDeeper());
    // Wire lesson next/prev
    const nextBtn = document.getElementById('lesson-next-btn');
    if (nextBtn) nextBtn.addEventListener('click', () => this.nextLessonStep());
    const prevBtn = document.getElementById('lesson-prev-btn');
    if (prevBtn) prevBtn.addEventListener('click', () => this.prevLessonStep());
    const closeBtn = document.getElementById('lesson-close-btn');
    if (closeBtn) closeBtn.addEventListener('click', () => this.endLesson());
    // Wire lesson picker
    const lessonBtn = document.getElementById('mentor-lesson-btn');
    if (lessonBtn) lessonBtn.addEventListener('click', () => this.showLessonPicker());
    const pickerClose = document.getElementById('lesson-picker-close');
    if (pickerClose) pickerClose.addEventListener('click', () => this.hideLessonPicker());
    // Wire lesson cards
    document.querySelectorAll('[data-lesson]').forEach(btn => {
      btn.addEventListener('click', () => {
        this.hideLessonPicker();
        this.startLesson(btn.dataset.lesson);
      });
    });
    // Fire first tip
    this.fire('color_warm_selected');
  }

};
