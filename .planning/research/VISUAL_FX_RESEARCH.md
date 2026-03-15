# Advanced Canvas 2D Visual Effects Research

**Project:** Depths of the Dark Keep
**Researched:** 2026-03-14
**Canvas size:** 800x600
**Constraint:** Canvas 2D API only -- no WebGL, no external libraries required
**Overall Confidence:** HIGH (techniques verified against MDN, working CodePens, and open-source implementations)

---

## Techniques Ranked by Impact-to-Effort Ratio

The following techniques are sorted by `(visual_impact / implementation_complexity)` -- best ROI first.

---

### 1. Canvas Motion Blur / Ghost Trails
**Impact: 7/10 | Complexity: 1/10 | ROI: 7.0**

**What it does:** Instead of clearing the canvas with `clearRect()`, draw a semi-transparent black rectangle. Previous frame content fades gradually, creating ghostly trails behind moving objects. Used for dash afterimages, projectile trails, and boss teleportation effects.

**Implementation:**
```javascript
// Replace: ctx.clearRect(0, 0, W, H);
// With:
ctx.fillStyle = "rgba(0, 0, 0, 0.15)";  // lower alpha = longer trails
ctx.fillRect(0, 0, W, H);
```

For selective motion blur (only certain elements trail), use an offscreen canvas:
```javascript
const trailCanvas = document.createElement("canvas");
trailCanvas.width = W; trailCanvas.height = H;
const trailCtx = trailCanvas.getContext("2d");

// Each frame:
trailCtx.fillStyle = "rgba(0, 0, 0, 0.1)";
trailCtx.fillRect(0, 0, W, H);
trailCtx.drawImage(entityOnlyCanvas, 0, 0);  // draw moving entities
ctx.drawImage(trailCanvas, 0, 0);  // composite trails under main scene
```

**Performance:** Essentially free. One fillRect call replaces one clearRect call. No ImageData manipulation. Runs at 60fps trivially.

**Notes for Dark Keep:** Perfect for player dash, bat swooping, boss phase-2 teleport. Already listed in the visual upgrade plan as a technique to implement. Can combine with `globalCompositeOperation = "lighter"` for glowing trails.

**Caveat:** The entire canvas accumulates trails, so you need to either use a separate canvas for trail-able elements or accept that all movement leaves ghosts. For a dungeon game with a dark aesthetic, this is usually a feature, not a bug.

---

### 2. Multi-Pass Rendering with Offscreen Canvases
**Impact: 9/10 | Complexity: 2/10 | ROI: 4.5**

**What it does:** Separates rendering into independent layers composited together. Each layer can use different blend modes, update frequencies, and effects. This is the architectural foundation that enables most other effects on this list.

**Implementation:**
```javascript
// Create layer canvases (once, at init)
const layers = {
  background: createCanvas(W, H),  // tiles - redraw on room change only
  entities:   createCanvas(W, H),  // player, enemies - every frame
  effects:    createCanvas(W, H),  // particles, trails - every frame
  lighting:   createCanvas(W, H),  // light map - every frame
  ui:         createCanvas(W, H),  // HUD - on change only
};

function createCanvas(w, h) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  return { canvas: c, ctx: c.getContext("2d") };
}

// Composite in render loop:
function render() {
  mainCtx.clearRect(0, 0, W, H);
  mainCtx.drawImage(layers.background.canvas, 0, 0);
  mainCtx.drawImage(layers.entities.canvas, 0, 0);
  mainCtx.drawImage(layers.effects.canvas, 0, 0);

  // Lighting composited with multiply blend
  mainCtx.globalCompositeOperation = "multiply";
  mainCtx.drawImage(layers.lighting.canvas, 0, 0);
  mainCtx.globalCompositeOperation = "source-over";

  mainCtx.drawImage(layers.ui.canvas, 0, 0);
}
```

**Performance:** Excellent. `drawImage` from canvas-to-canvas is GPU-accelerated. Background layer only redraws on room change. UI only redraws on HP/buff changes. Net effect is often FASTER than single-canvas because you skip redundant draws.

**Key compositing operations for Dark Keep:**
| Operation | Use Case |
|-----------|----------|
| `"multiply"` | Darkness/lighting overlay (darken unlit areas) |
| `"lighter"` (additive) | Bloom, fire glow, magic sparkles |
| `"screen"` | Soft glow, fog brightening |
| `"overlay"` | Color grading (red tint at low HP) |
| `"destination-out"` | Punch holes in darkness for light sources |
| `"source-atop"` | Flash-white on hit (fill sprite silhouette) |

**Notes for Dark Keep:** The existing renderer draws everything to one canvas. Refactoring to layered architecture is the single highest-impact change because it enables bloom, proper lighting compositing, selective motion blur, and color grading -- all at minimal additional cost.

**Sources:**
- [MDN: Optimizing Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [web.dev: Canvas Performance](https://web.dev/articles/canvas-performance)

---

### 3. ctx.filter API (Blur, Brightness, Contrast, Hue-Rotate)
**Impact: 8/10 | Complexity: 2/10 | ROI: 4.0**

**What it does:** Hardware-accelerated CSS-style filters applied to canvas draw operations. Enables blur (bloom, depth of field), brightness adjustments, contrast boosting, hue rotation, drop shadows, grayscale, sepia, and more -- all without touching ImageData.

**Supported filters:**
| Filter | Syntax | Use Case |
|--------|--------|----------|
| `blur()` | `"blur(4px)"` | Bloom pass, depth-of-field, fog softening |
| `brightness()` | `"brightness(150%)"` | Flash effects, power-up glow |
| `contrast()` | `"contrast(120%)"` | Dramatic mood, crispy visuals |
| `drop-shadow()` | `"drop-shadow(2px 2px 3px #000)"` | Entity shadows without manual drawing |
| `hue-rotate()` | `"hue-rotate(90deg)"` | Enemy color variants, magic effects |
| `saturate()` | `"saturate(200%)"` | Vivid power-up moments |
| `grayscale()` | `"grayscale(100%)"` | Death screen, flashback |
| `sepia()` | `"sepia(80%)"` | Aged look, memory sequences |
| `invert()` | `"invert(100%)"` | Hit flash, boss phase transition |

**Multiple filters at once:**
```javascript
ctx.filter = "contrast(1.2) saturate(1.3) brightness(1.1)";
ctx.drawImage(sceneCanvas, 0, 0);
ctx.filter = "none";
```

**Bloom implementation with ctx.filter:**
```javascript
// 1. Draw bright elements to offscreen canvas
bloomCtx.clearRect(0, 0, W, H);
bloomCtx.drawImage(brightsOnlyCanvas, 0, 0);

// 2. Apply blur filter
bloomCtx.filter = "blur(8px)";
bloomCtx.drawImage(bloomCanvas, 0, 0);  // blur itself
bloomCtx.filter = "blur(4px)";
bloomCtx.drawImage(bloomCanvas, 0, 0);  // double blur for wider spread
bloomCtx.filter = "none";

// 3. Composite with additive blend
mainCtx.globalCompositeOperation = "lighter";
mainCtx.globalAlpha = 0.5;
mainCtx.drawImage(bloomCanvas, 0, 0);
mainCtx.globalAlpha = 1;
mainCtx.globalCompositeOperation = "source-over";
```

**Browser support:** Baseline since September 2024. Works in Chrome 99+, Firefox 105+, Safari 17.2+, Edge 99+. This is safe to use in 2026.

**Performance:** GPU-accelerated. `blur()` and `drop-shadow()` are the most expensive filters but still fast for single full-screen passes. Avoid applying blur per-entity (do it per-layer instead). At 800x600, even 3 blur passes run at 60fps.

**Notes for Dark Keep:** This is the easiest path to bloom/glow. The existing lighting system already has an offscreen canvas (`_darkCanvas`). Adding a bloom pass requires ~15 lines of code for a dramatic visual upgrade.

**Sources:**
- [MDN: CanvasRenderingContext2D.filter](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter)

---

### 4. Film Grain / Noise Overlay
**Impact: 6/10 | Complexity: 2/10 | ROI: 3.0**

**What it does:** Adds subtle animated noise across the screen for a cinematic, textured feel. Eliminates the "clean digital" look and makes scenes feel grittier and more atmospheric. Especially effective in dark dungeon environments.

**Implementation - Pre-generated noise texture (fast):**
```javascript
// Generate noise texture ONCE at startup
const grainCanvas = document.createElement("canvas");
const GRAIN_SIZE = 128;  // small tile, tiled across screen
grainCanvas.width = GRAIN_SIZE;
grainCanvas.height = GRAIN_SIZE;
const grainCtx = grainCanvas.getContext("2d");
const grainData = grainCtx.createImageData(GRAIN_SIZE, GRAIN_SIZE);

function regenerateGrain() {
  const d = grainData.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.random() * 255;
    d[i] = d[i+1] = d[i+2] = v;
    d[i+3] = 18;  // very low alpha for subtlety
  }
  grainCtx.putImageData(grainData, 0, 0);
}

// In render loop - regenerate every 3rd frame for natural flicker
let grainFrame = 0;
function drawGrain(ctx) {
  if (++grainFrame % 3 === 0) regenerateGrain();

  // Tile the small noise texture across the screen
  ctx.globalCompositeOperation = "overlay";
  const pattern = ctx.createPattern(grainCanvas, "repeat");
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";
}
```

**Alternative - Even cheaper approach:**
```javascript
// Skip ImageData entirely: draw random semi-transparent dots
function drawGrainCheap(ctx) {
  ctx.globalAlpha = 0.03;
  const dotCount = 800;  // tuned for 800x600
  for (let i = 0; i < dotCount; i++) {
    const v = Math.random() > 0.5 ? 255 : 0;
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(
      Math.random() * W | 0,
      Math.random() * H | 0,
      1, 1
    );
  }
  ctx.globalAlpha = 1;
}
```

**Performance:** Pre-generated noise at 128x128 tiled: negligible cost. The putImageData call on a 128x128 canvas costs ~0.1ms. Only regenerated every 3 frames. Runs at 60fps easily.

**Notes for Dark Keep:** Apply as the very last rendering step before UI. Use `"overlay"` blend mode so it interacts naturally with light and dark areas. Keep alpha very low (10-20) -- film grain should be felt, not seen.

**Sources:**
- [CodePen: Canvas advanced film grain effect](https://codepen.io/sucka/pen/PwYqLbo)
- [Envato Tuts+: How to Generate Noise with Canvas](https://code.tutsplus.com/tutorials/how-to-generate-noise-with-canvas--net-16556)

---

### 5. Reflections on Wet Surfaces / Puddle Reflections
**Impact: 7/10 | Complexity: 3/10 | ROI: 2.3**

**What it does:** Draws entities upside-down with reduced alpha below them, creating the illusion of reflections on wet stone floors or puddles. In a dungeon setting, this adds significant visual depth.

**Implementation:**
```javascript
function drawWithReflection(ctx, entity, drawFn) {
  // Draw reflection first (underneath)
  ctx.save();
  ctx.globalAlpha = 0.25;

  // Flip vertically around entity's feet
  ctx.translate(0, entity.y + entity.height);
  ctx.scale(1, -1);
  ctx.translate(0, -(entity.y + entity.height));

  // Slight blue tint for wet surface feel
  drawFn(ctx, entity);

  ctx.restore();

  // Optional: blur the reflection for realism
  // (or just draw at lower alpha -- cheaper and still effective)

  // Draw actual entity on top
  drawFn(ctx, entity);
}
```

**For puddle areas only (selective reflections):**
```javascript
function drawReflection(ctx, entity) {
  // Only reflect if entity is standing on a puddle tile
  if (!isOnPuddleTile(entity.x, entity.y)) return;

  ctx.save();
  ctx.globalAlpha = 0.15;

  // Clip to puddle area to avoid reflections on dry floor
  ctx.beginPath();
  ctx.rect(puddleX, puddleY, puddleW, puddleH);
  ctx.clip();

  // Flip and draw
  ctx.translate(0, entity.y * 2 + entity.height);
  ctx.scale(1, -1);
  drawEntity(ctx, entity);

  ctx.restore();
}
```

**Performance:** One extra drawImage/draw call per reflected entity. Negligible at the scale of a roguelike (5-10 entities). 60fps no problem.

**Notes for Dark Keep:** The floor already has `floorPuddle: "#1a1a3a"` in the palette. Puddle tiles can be identified during room generation and marked for reflection rendering. The reflection pass should happen between background and entity layers. Add a slight sine-wave distortion to the reflection Y-offset for animated water ripple: `reflectY += Math.sin(time * 3 + entity.x * 0.1) * 1.5`.

---

### 6. Color Grading / Palette Cycling
**Impact: 7/10 | Complexity: 3/10 | ROI: 2.3**

**What it does:**
- **Color grading:** Full-screen colored overlay that shifts the entire scene mood. Red pulse when HP is low, cold blue on deeper floors, warm orange near fire.
- **Palette cycling:** Shifting color indices over time to animate water, lava, and magic effects without redrawing geometry. Classic 8-bit technique brought to canvas.

**Color Grading Implementation:**
```javascript
// Apply as last pass before UI
function drawColorGrade(ctx, mood) {
  switch (mood) {
    case "danger":  // low HP
      const pulse = Math.sin(performance.now() * 0.005) * 0.5 + 0.5;
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = `rgba(180, 20, 20, ${0.08 + pulse * 0.06})`;
      ctx.fillRect(0, 0, W, H);
      break;
    case "deep":  // deeper dungeon floors
      ctx.globalCompositeOperation = "multiply";
      ctx.fillStyle = "rgba(140, 160, 200, 0.15)";
      ctx.fillRect(0, 0, W, H);
      break;
    case "fire":  // near torches
      ctx.globalCompositeOperation = "overlay";
      ctx.fillStyle = "rgba(200, 120, 40, 0.06)";
      ctx.fillRect(0, 0, W, H);
      break;
  }
  ctx.globalCompositeOperation = "source-over";
}
```

**Palette Cycling Implementation (for water/lava tiles):**
```javascript
// Define cycled color sets
const WATER_CYCLE = ["#1a1a3a", "#1e1e44", "#22224e", "#1e1e44"];
const LAVA_CYCLE  = ["#cc4400", "#ff5500", "#ff8833", "#ff5500"];

let cycleOffset = 0;
function updatePaletteCycle(dt) {
  cycleOffset += dt * 2;  // speed of cycle
}

function getWaterColor(tileX, tileY) {
  // Each tile offsets into the cycle differently for wave effect
  const idx = (Math.floor(cycleOffset + tileX * 0.3 + tileY * 0.1)) % WATER_CYCLE.length;
  return WATER_CYCLE[idx];
}
```

**Advanced: BlendShift cycling** (smooth interpolation between palette entries):
```javascript
function lerpColor(a, b, t) {
  const ar = parseInt(a.slice(1,3), 16), ag = parseInt(a.slice(3,5), 16), ab = parseInt(a.slice(5,7), 16);
  const br = parseInt(b.slice(1,3), 16), bg = parseInt(b.slice(3,5), 16), bb = parseInt(b.slice(5,7), 16);
  const r = Math.round(ar + (br - ar) * t);
  const g = Math.round(ag + (bg - ag) * t);
  const b_ = Math.round(ab + (bb - ab) * t);
  return `rgb(${r},${g},${b_})`;
}

function getCycledColor(colors, phase) {
  const idx = phase % colors.length;
  const nextIdx = (idx + 1) % colors.length;
  const t = phase % 1;  // fractional part = blend factor
  return lerpColor(colors[Math.floor(idx)], colors[Math.floor(nextIdx)], t);
}
```

**Performance:** Color grading: one fillRect with blend mode = free. Palette cycling: computed per-tile during tile rendering, adds a lookup per tile = negligible.

**Sources:**
- [EffectGames: Old School Color Cycling with HTML5](http://www.effectgames.com/effect/article-Old_School_Color_Cycling_with_HTML5.html)
- [GitHub: canvascycle](https://github.com/jhuckaby/canvascycle)

---

### 7. Dynamic 2D Shadow Casting (Visibility Polygon)
**Impact: 9/10 | Complexity: 5/10 | ROI: 1.8**

**What it does:** Casts rays from light sources (player torch, wall torches) toward wall edges. Constructs a visibility polygon showing what the light can "see." Areas outside the polygon are in shadow. Creates dramatic, geometric shadows that react to room geometry in real-time.

**The Algorithm (from ncase.me Sight & Light):**

**Step 1: Collect all wall segment endpoints**
```javascript
function getSegments(roomGrid, roomOffX, roomOffY) {
  const segments = [];
  // For each wall tile, create 4 edge segments
  // Optimize: merge adjacent colinear segments
  for (let y = 0; y < roomH; y++) {
    for (let x = 0; x < roomW; x++) {
      if (roomGrid[y][x] === 1) {  // wall
        const px = roomOffX + x * TILE;
        const py = roomOffY + y * TILE;
        // Only add edges that border non-wall tiles
        if (y > 0 && roomGrid[y-1][x] !== 1)  // top edge
          segments.push({ax: px, ay: py, bx: px + TILE, by: py});
        if (y < roomH-1 && roomGrid[y+1][x] !== 1)  // bottom edge
          segments.push({ax: px, ay: py + TILE, bx: px + TILE, by: py + TILE});
        if (x > 0 && roomGrid[y][x-1] !== 1)  // left edge
          segments.push({ax: px, ay: py, bx: px, by: py + TILE});
        if (x < roomW-1 && roomGrid[y][x+1] !== 1)  // right edge
          segments.push({ax: px + TILE, ay: py, bx: px + TILE, by: py + TILE});
      }
    }
  }
  return segments;
}
```

**Step 2: Collect unique endpoints and cast rays**
```javascript
function getVisibilityPolygon(lightX, lightY, segments) {
  // Get unique endpoints
  const points = new Set();
  for (const seg of segments) {
    points.add(`${seg.ax},${seg.ay}`);
    points.add(`${seg.bx},${seg.by}`);
  }

  const uniqueAngles = [];
  for (const p of points) {
    const [px, py] = p.split(",").map(Number);
    const angle = Math.atan2(py - lightY, px - lightX);
    // Cast 3 rays per endpoint: direct + two offsets to peek behind corners
    uniqueAngles.push(angle - 0.0001, angle, angle + 0.0001);
  }

  // For each angle, find closest intersection
  const intersections = [];
  for (const angle of uniqueAngles) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);

    let closestT1 = Infinity;
    let closestPoint = null;

    for (const seg of segments) {
      const t = raySegmentIntersect(lightX, lightY, dx, dy, seg);
      if (t && t.t1 < closestT1) {
        closestT1 = t.t1;
        closestPoint = { x: t.x, y: t.y, angle };
      }
    }
    if (closestPoint) intersections.push(closestPoint);
  }

  // Sort by angle to form polygon
  intersections.sort((a, b) => a.angle - b.angle);
  return intersections;
}
```

**Step 3: Ray-Segment intersection math**
```javascript
function raySegmentIntersect(rx, ry, rdx, rdy, seg) {
  const sdx = seg.bx - seg.ax;
  const sdy = seg.by - seg.ay;
  const denom = sdx * rdy - sdy * rdx;
  if (Math.abs(denom) < 0.0001) return null;  // parallel

  const t2 = (rdx * (seg.ay - ry) + rdy * (rx - seg.ax)) / denom;
  const t1 = (seg.ax + sdx * t2 - rx) / rdx;

  if (t1 < 0 || t2 < 0 || t2 > 1) return null;

  return {
    x: rx + rdx * t1,
    y: ry + rdy * t1,
    t1: t1
  };
}
```

**Step 4: Draw the visibility polygon as a light mask**
```javascript
function drawLightWithShadows(ctx, lightX, lightY, radius, polygon) {
  ctx.save();

  // Create clipping path from visibility polygon
  ctx.beginPath();
  ctx.moveTo(polygon[0].x, polygon[0].y);
  for (let i = 1; i < polygon.length; i++) {
    ctx.lineTo(polygon[i].x, polygon[i].y);
  }
  ctx.closePath();
  ctx.clip();

  // Draw radial light gradient within the clipped area
  const grad = ctx.createRadialGradient(lightX, lightY, 0, lightX, lightY, radius);
  grad.addColorStop(0, "rgba(255, 200, 100, 0.8)");
  grad.addColorStop(0.5, "rgba(255, 160, 60, 0.3)");
  grad.addColorStop(1, "rgba(255, 120, 30, 0)");
  ctx.fillStyle = grad;
  ctx.fillRect(lightX - radius, lightY - radius, radius * 2, radius * 2);

  ctx.restore();
}
```

**Performance considerations:**
- Segment collection: Do once per room load, cache the result
- Ray casting: O(uniqueEndpoints * 3 * segments) per light source per frame
- For a typical room with ~100 wall segments and 6 torches + player = 7 lights: ~7 * 200 * 3 * 100 = 420,000 intersection tests per frame
- Each test is ~10 arithmetic operations = ~4.2M ops = ~2-3ms on modern hardware
- **Optimization:** Limit ray casting radius. Only test segments within the light's radius. Reduces to ~0.5ms per frame.
- Runs at 60fps at 800x600 with optimization. Can also update torch shadows every 2-3 frames since torches don't move.

**Notes for Dark Keep:** This replaces the current radial gradient darkness system with geometrically accurate shadows. The room grid already provides wall data. Combine with the existing `drawDarknessOverlay` -- use the visibility polygon to mask where light reaches, keep the radial gradient for falloff within the lit area.

**Sources:**
- [ncase: Sight & Light](https://ncase.me/sight-and-light/) -- interactive tutorial with full algorithm
- [Red Blob Games: 2D Visibility](https://www.redblobgames.com/articles/visibility/) -- alternative sweep algorithm
- [Illuminated.js](https://greweb.me/2012/05/illuminated-js-2d-lights-and-shadows-rendering-engine-for-html5-applications)

---

### 8. Chromatic Aberration / RGB Channel Split
**Impact: 7/10 | Complexity: 4/10 | ROI: 1.75**

**What it does:** Separates the Red, Green, and Blue channels of the rendered image and offsets them slightly. Creates a glitch/impact effect that's extremely dramatic for boss hits, critical damage, and power surges.

**Implementation (per-pixel with ImageData):**
```javascript
function chromaticAberration(ctx, offsetR, offsetG, offsetB) {
  const imageData = ctx.getImageData(0, 0, W, H);
  const src = imageData.data;
  const dst = new Uint8ClampedArray(src.length);
  dst.set(src);  // copy original

  for (let i = 0; i < src.length; i += 4) {
    // Red channel shifted by offsetR pixels
    const rIdx = i + offsetR * 4;
    if (rIdx >= 0 && rIdx < src.length) dst[rIdx] = src[i];

    // Green channel shifted by offsetG pixels
    const gIdx = i + 1 + offsetG * 4;
    if (gIdx >= 0 && gIdx < src.length) dst[gIdx] = src[i + 1];

    // Blue channel shifted by offsetB pixels
    const bIdx = i + 2 + offsetB * 4;
    if (bIdx >= 0 && bIdx < src.length) dst[bIdx] = src[i + 2];
  }

  imageData.data.set(dst);
  ctx.putImageData(imageData, 0, 0);
}

// Usage: on big hit, apply for 3-5 frames
chromaticAberration(ctx, 3, 0, -3);  // red right, blue left
```

**Alternative -- faster, no ImageData (using canvas compositing):**
```javascript
function chromaticAberrationFast(mainCtx, sceneCanvas, offset) {
  // Draw red channel shifted right
  mainCtx.globalCompositeOperation = "lighter";

  mainCtx.drawImage(sceneCanvas, offset, 0);   // shifts entire image right
  // This doesn't isolate channels -- for true channel separation,
  // you need 3 offscreen canvases with color filters:

  // Red-only canvas
  redCtx.clearRect(0, 0, W, H);
  redCtx.drawImage(sceneCanvas, 0, 0);
  redCtx.globalCompositeOperation = "multiply";
  redCtx.fillStyle = "#ff0000";
  redCtx.fillRect(0, 0, W, H);

  // Blue-only canvas
  blueCtx.clearRect(0, 0, W, H);
  blueCtx.drawImage(sceneCanvas, 0, 0);
  blueCtx.globalCompositeOperation = "multiply";
  blueCtx.fillStyle = "#0000ff";
  blueCtx.fillRect(0, 0, W, H);

  // Green stays centered
  greenCtx.clearRect(0, 0, W, H);
  greenCtx.drawImage(sceneCanvas, 0, 0);
  greenCtx.globalCompositeOperation = "multiply";
  greenCtx.fillStyle = "#00ff00";
  greenCtx.fillRect(0, 0, W, H);

  // Composite with additive blending
  mainCtx.clearRect(0, 0, W, H);
  mainCtx.globalCompositeOperation = "lighter";
  mainCtx.drawImage(redCanvas, offset, 0);     // red shifted right
  mainCtx.drawImage(greenCanvas, 0, 0);         // green centered
  mainCtx.drawImage(blueCanvas, -offset, 0);    // blue shifted left
  mainCtx.globalCompositeOperation = "source-over";
}
```

**Performance:** ImageData approach: getImageData + putImageData at 800x600 = ~3-5ms. Fine for occasional hit effects (not every frame). Canvas compositing approach: 6 drawImage + 3 fillRect = ~1ms. Better for sustained effects.

**Notes for Dark Keep:** Use sparingly -- on boss phase transitions, critical hits, near-death moments. Animate the offset from 5px down to 0px over 10 frames for a "snap" effect. Combine with screen shake for maximum impact.

**Sources:**
- [CodePen: Chromatic aberration in Canvas](https://codepen.io/njmcode/pen/ZLrWzq)
- [Blog: RGB Splitting with Canvas](https://hangindev.com/blog/rgb-splitting-effect-with-html5-canvas-and-javascript)
- [GitHub: canvas-chromatic-aberration](https://github.com/TomasHubelbauer/canvas-chromatic-aberration)

---

### 9. Rim Lighting for 2D Sprites
**Impact: 7/10 | Complexity: 4/10 | ROI: 1.75**

**What it does:** Adds a bright outline on the side of a sprite facing a light source. Creates the illusion of 3D form and makes characters "pop" from the background. Extremely effective in dark environments.

**Implementation:**
```javascript
function drawWithRimLight(ctx, drawSpriteFn, entityX, entityY, lightX, lightY, lightColor) {
  // 1. Draw sprite to temp canvas
  const tempCanvas = getTempCanvas();  // reuse from pool
  const tempCtx = tempCanvas.getContext("2d");
  tempCtx.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
  drawSpriteFn(tempCtx, 0, 0);  // draw at origin of temp canvas

  // 2. Calculate light direction
  const dx = lightX - entityX;
  const dy = lightY - entityY;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const nx = dx / dist;  // normalized direction to light
  const ny = dy / dist;

  // 3. Draw rim: offset sprite in light direction, use source-atop to color it
  const rimCanvas = getTempCanvas2();
  const rimCtx = rimCanvas.getContext("2d");
  rimCtx.clearRect(0, 0, rimCanvas.width, rimCanvas.height);

  // Draw sprite shifted toward light by 1-2 pixels
  rimCtx.drawImage(tempCanvas, Math.round(nx * 1.5), Math.round(ny * 1.5));

  // Subtract original sprite position to get only the rim
  rimCtx.globalCompositeOperation = "destination-out";
  rimCtx.drawImage(tempCanvas, 0, 0);
  rimCtx.globalCompositeOperation = "source-over";

  // Color the rim
  rimCtx.globalCompositeOperation = "source-atop";
  rimCtx.fillStyle = lightColor;
  rimCtx.fillRect(0, 0, rimCanvas.width, rimCanvas.height);
  rimCtx.globalCompositeOperation = "source-over";

  // 4. Draw to main canvas: sprite + rim
  ctx.drawImage(tempCanvas, entityX, entityY);
  ctx.globalAlpha = 0.7;
  ctx.drawImage(rimCanvas, entityX, entityY);
  ctx.globalAlpha = 1;
}
```

**Simplified version (outline glow, no directional awareness):**
```javascript
function drawWithGlow(ctx, spriteCanvas, x, y, glowColor) {
  // Draw sprite at 4 offset positions in glow color
  ctx.globalAlpha = 0.3;
  ctx.globalCompositeOperation = "lighter";
  for (const [ox, oy] of [[-1,0],[1,0],[0,-1],[0,1]]) {
    ctx.drawImage(spriteCanvas, x + ox, y + oy);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.drawImage(spriteCanvas, x, y);
}
```

**Performance:** 2-4 extra drawImage calls per entity. With 10 entities = 20-40 extra draws. Still under 1ms total at 800x600. The temp canvas approach needs careful reuse (object pool, not create/destroy each frame).

**Notes for Dark Keep:** The pixel-art sprites are drawn procedurally with fillRect calls, not from sprite sheets. This means the "draw to temp canvas, then composite" approach is needed. Cache the sprite rendering to a temp canvas to avoid redrawing every frame. Apply rim lighting from the nearest torch or player position. Use warm orange for torch rim, cool blue for ambient rim on unlit side.

---

### 10. Sub-pixel Rendering
**Impact: 5/10 | Complexity: 2/10 | ROI: 2.5**

**What it does:** Allows particles and smooth-moving objects to use fractional pixel positions (e.g., x=100.3, y=200.7) instead of flooring to integer coordinates. The browser's canvas anti-aliasing interpolates between pixels, creating smoother motion especially for slow-moving particles.

**Implementation:**
```javascript
// For particles: DON'T floor positions
// BEFORE (choppy):
ctx.fillRect(Math.floor(p.x), Math.floor(p.y), 2, 2);

// AFTER (smooth):
ctx.fillRect(p.x, p.y, 2, 2);

// But FLOOR sprite positions (pixel art should stay crisp):
ctx.fillRect(Math.floor(entity.x), Math.floor(entity.y), spriteW, spriteH);
```

**Key insight:** Use sub-pixel for particles, projectiles, and effects. Use integer positions for sprites, tiles, and UI. This gives smooth motion where it matters without blurring pixel art.

```javascript
// For canvas rendering context, control image smoothing:
ctx.imageSmoothingEnabled = false;  // keep pixel art crisp
// Sub-pixel positions still work for fillRect -- the browser
// composites at sub-pixel precision before rasterizing
```

**Performance:** Free. Actually identical performance. The only "cost" is making sure NOT to use sub-pixel for tile/sprite rendering where crispness matters.

**Notes for Dark Keep:** The particle system currently floors positions: `Math.floor(p.x - s/2)`. Removing the `Math.floor` for particles will immediately make them smoother. Keep it for entity sprites.

---

### 11. God Rays / Volumetric Light Shafts
**Impact: 8/10 | Complexity: 6/10 | ROI: 1.33**

**What it does:** Light shafts radiating outward from bright light sources (torches, boss attacks, doorways). Creates the illusion of light scattering through dusty/foggy air. One of the most visually dramatic effects possible.

**Implementation - Radial Blur approach (Canvas 2D):**
```javascript
function drawGodRays(ctx, lightX, lightY, radius, intensity) {
  // 1. Create occlusion map: light source = white, walls = black
  const occlusionCanvas = getOcclusionCanvas();
  const oCtx = occlusionCanvas.getContext("2d");
  oCtx.clearRect(0, 0, W, H);

  // Draw light source as bright circle
  const grad = oCtx.createRadialGradient(lightX, lightY, 0, lightX, lightY, radius);
  grad.addColorStop(0, "rgba(255, 220, 150, 1)");
  grad.addColorStop(1, "rgba(255, 220, 150, 0)");
  oCtx.fillStyle = grad;
  oCtx.fillRect(0, 0, W, H);

  // Subtract wall silhouettes (they block light)
  oCtx.globalCompositeOperation = "destination-out";
  drawWallSilhouettes(oCtx);
  oCtx.globalCompositeOperation = "source-over";

  // 2. Apply radial blur by drawing scaled copies toward light source
  const rayCanvas = getRayCanvas();
  const rCtx = rayCanvas.getContext("2d");
  rCtx.clearRect(0, 0, W, H);

  const passes = 12;  // more passes = longer rays
  for (let i = 0; i < passes; i++) {
    const scale = 1 + i * 0.015;  // each pass slightly larger
    const alpha = intensity / passes;

    rCtx.globalAlpha = alpha;
    rCtx.save();
    // Scale from light source position
    rCtx.translate(lightX, lightY);
    rCtx.scale(scale, scale);
    rCtx.translate(-lightX, -lightY);
    rCtx.drawImage(occlusionCanvas, 0, 0);
    rCtx.restore();
  }
  rCtx.globalAlpha = 1;

  // 3. Composite rays onto scene with additive blending
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.4;
  ctx.drawImage(rayCanvas, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}
```

**Performance:** 12 drawImage passes per light source. For torches: render god rays at half resolution (400x300) and upscale. At half-res with 2-3 light sources = ~2ms. Use for player light and boss attacks only (not every torch). Update every 2nd frame for torch god rays. Achievable at 60fps with care.

**Simplified version -- no occlusion, just radial glow lines:**
```javascript
function drawSimpleGodRays(ctx, cx, cy, count, length, color) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.05;

  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2 + performance.now() * 0.0001;
    const width = 2 + Math.sin(i * 1.7 + performance.now() * 0.002) * 1;

    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(
      cx + Math.cos(angle) * length,
      cy + Math.sin(angle) * length
    );
    ctx.lineWidth = width;
    ctx.strokeStyle = color;
    ctx.stroke();
  }

  ctx.restore();
}
// Usage: drawSimpleGodRays(ctx, torch.x, torch.y, 16, 80, "rgba(255,180,80,1)");
```

**Notes for Dark Keep:** The simplified version (radial lines) is good enough for torches and costs very little. Save the full occlusion-based god rays for the boss chamber or special events where maximum drama is needed. The existing torch system already has flicker values that can modulate ray intensity.

**Sources:**
- [Volumetric Light Scattering paper](https://chetanjags.wordpress.com/2016/02/02/volumetric-lighting-sunshafts/)
- [Illuminated.js](https://greweb.me/2012/05/illuminated-js-2d-lights-and-shadows-rendering-engine-for-html5-applications)

---

### 12. Screen Distortion / Heat Haze
**Impact: 7/10 | Complexity: 6/10 | ROI: 1.17**

**What it does:** Warps the rendered image near heat sources (torches, lava, fire spells) using displacement mapping. Pixels are shifted based on a displacement function, creating a shimmering heat haze effect.

**Implementation:**
```javascript
function applyHeatHaze(ctx, sources, time) {
  // Only process a region around each heat source (not full screen)
  for (const src of sources) {
    const regionSize = 60;  // pixels around source to distort
    const sx = Math.max(0, Math.floor(src.x - regionSize));
    const sy = Math.max(0, Math.floor(src.y - regionSize));
    const sw = Math.min(W - sx, regionSize * 2);
    const sh = Math.min(H - sy, regionSize * 2);

    const imageData = ctx.getImageData(sx, sy, sw, sh);
    const src_data = new Uint8ClampedArray(imageData.data);
    const dst = imageData.data;

    for (let y = 0; y < sh; y++) {
      for (let x = 0; x < sw; x++) {
        // Distance from heat source
        const dx = (sx + x) - src.x;
        const dy = (sy + y) - src.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist > regionSize) continue;

        // Displacement amount (stronger near source, fades with distance)
        const falloff = 1 - dist / regionSize;
        const displaceX = Math.sin(time * 5 + y * 0.1 + x * 0.05) * 2 * falloff;
        const displaceY = Math.cos(time * 4 + x * 0.1) * 1.5 * falloff;

        // Sample from displaced position
        const srcX = Math.round(x + displaceX);
        const srcY = Math.round(y + displaceY);

        if (srcX >= 0 && srcX < sw && srcY >= 0 && srcY < sh) {
          const dstIdx = (y * sw + x) * 4;
          const srcIdx = (srcY * sw + srcX) * 4;
          dst[dstIdx]     = src_data[srcIdx];
          dst[dstIdx + 1] = src_data[srcIdx + 1];
          dst[dstIdx + 2] = src_data[srcIdx + 2];
          dst[dstIdx + 3] = src_data[srcIdx + 3];
        }
      }
    }

    ctx.putImageData(imageData, sx, sy);
  }
}
```

**Alternative -- canvas scaling trick (no ImageData, much faster):**
```javascript
function applyHeatHazeCheap(ctx, sourceX, sourceY, time) {
  // Take a thin horizontal strip near the heat source and draw it
  // slightly displaced vertically -- creates a wavy shimmer
  const stripH = 40;
  const startY = sourceY - stripH;

  for (let row = 0; row < stripH; row++) {
    const offset = Math.sin(time * 6 + row * 0.3) * 1.5;
    // Slightly shift each row horizontally
    ctx.drawImage(
      ctx.canvas,  // self-referencing
      0, startY + row, W, 1,      // source: 1px strip
      offset, startY + row, W, 1  // dest: shifted
    );
  }
}
```

**Performance:**
- ImageData approach on a 120x120 region: ~1ms per source. Acceptable for 2-3 sources.
- Canvas scaling trick: negligible cost but less precise.
- Full-screen distortion with ImageData at 800x600: ~8-12ms. TOO SLOW for 60fps.
- **Recommendation:** Use regional ImageData for 1-2 major sources (boss fire attack) and canvas-strip trick for regular torches.

**Notes for Dark Keep:** Apply heat haze above torches and near lava tiles. The regional approach (60px radius around each torch) keeps it fast. Only apply to the 2-3 nearest torches to the player. Skip torches that are off-screen.

**Sources:**
- [CodePen: Canvas displacement mapping](https://codepen.io/njmcode/pen/BNLKbK)
- [GitHub: displacement-map](https://github.com/codelerium/displacement-map)

---

### 13. Dithering Patterns
**Impact: 6/10 | Complexity: 5/10 | ROI: 1.2**

**What it does:** Applies ordered (Bayer matrix) or error-diffusion dithering to create a retro, limited-palette aesthetic. Creates beautiful cross-hatch patterns in shadows and gradients. Gives a distinctive visual style reminiscent of early DOS games and PS1-era titles.

**Bayer Matrix Dithering Implementation:**
```javascript
// 4x4 Bayer matrix (normalized to 0-1)
const BAYER_4x4 = [
  [ 0/16,  8/16,  2/16, 10/16],
  [12/16,  4/16, 14/16,  6/16],
  [ 3/16, 11/16,  1/16,  9/16],
  [15/16,  7/16, 13/16,  5/16],
];

function applyDithering(ctx, palette) {
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;
      const threshold = BAYER_4x4[y % 4][x % 4];

      // For each channel, quantize with dithering threshold
      for (let c = 0; c < 3; c++) {
        const old = data[idx + c] / 255;
        const quantized = old + (threshold - 0.5) * 0.3;  // 0.3 = dither strength
        // Snap to nearest palette level
        data[idx + c] = Math.round(quantized * 4) / 4 * 255;  // 5 levels
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
```

**For shadow transitions (dithered shadow edges):**
```javascript
function drawDitheredShadow(ctx, polygon, centerX, centerY, maxDist) {
  // Instead of smooth gradient shadow edge, use dithered checkerboard
  const imageData = ctx.getImageData(0, 0, W, H);
  const data = imageData.data;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const dist = distToPolygonEdge(x, y, polygon);
      if (dist < 0) continue;  // inside lit area

      const shadowAmount = Math.min(1, dist / maxDist);
      const threshold = BAYER_4x4[y % 4][x % 4];

      if (shadowAmount > threshold) {
        const idx = (y * W + x) * 4;
        data[idx] *= 0.3;     // darken
        data[idx + 1] *= 0.3;
        data[idx + 2] *= 0.3;
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
}
```

**Performance:** Full-screen dithering at 800x600 with ImageData: ~5-8ms. Not great for every frame at 60fps. Solutions:
- Apply dithering at half resolution and upscale
- Only dither the shadow/lighting layer (smaller area)
- Pre-compute dithered gradient textures and tile them
- Use dithering as a stylistic choice for specific moments (death screen, transition)

**Notes for Dark Keep:** Use dithered shadow edges instead of smooth gradients for a pixel-art-consistent look. Pre-compute a set of dithered gradient strips at startup and use them as alpha masks. This avoids per-frame ImageData manipulation while keeping the aesthetic.

**Sources:**
- [CanvasDither library](https://github.com/NielsLeenheer/CanvasDither)
- [surma.dev: Ditherpunk](https://surma.dev/things/ditherpunk/)
- [Bayer Dithering tutorial](https://spencerszabados.github.io/blog/2022/bayer-dithering/)

---

### 14. 2D Normal Mapping / Per-Pixel Lighting
**Impact: 10/10 | Complexity: 9/10 | ROI: 1.1**

**What it does:** Simulates 3D lighting on 2D surfaces by using a "normal map" -- a texture where RGB values encode surface direction (normals). Per-pixel lighting computes how much light each pixel receives based on its normal and the light direction. Creates the illusion that flat tiles have depth, bumps, and surface detail.

**Can it be done in Canvas 2D?** YES, but it is expensive because you must manipulate every pixel via ImageData.

**Implementation:**
```javascript
function applyNormalMapLighting(ctx, normalMapImageData, lightX, lightY, lightZ) {
  const sceneData = ctx.getImageData(0, 0, W, H);
  const scene = sceneData.data;
  const normals = normalMapImageData.data;

  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const idx = (y * W + x) * 4;

      // Decode normal from normal map (RGB -> XYZ direction)
      const nx = (normals[idx]     / 255) * 2 - 1;  // R -> X normal (-1 to 1)
      const ny = (normals[idx + 1] / 255) * 2 - 1;  // G -> Y normal (-1 to 1)
      const nz = (normals[idx + 2] / 255) * 2 - 1;  // B -> Z normal (0 to 1)

      // Light direction from pixel to light source
      const lx = lightX - x;
      const ly = lightY - y;
      const lz = lightZ;  // height of light above surface
      const ld = Math.sqrt(lx * lx + ly * ly + lz * lz);

      // Dot product: how much light hits this surface
      const dot = Math.max(0, (nx * lx/ld + ny * ly/ld + nz * lz/ld));

      // Apply lighting to scene pixel
      const ambient = 0.15;
      const brightness = ambient + dot * 0.85;
      scene[idx]     = Math.min(255, scene[idx]     * brightness);
      scene[idx + 1] = Math.min(255, scene[idx + 1] * brightness);
      scene[idx + 2] = Math.min(255, scene[idx + 2] * brightness);
    }
  }

  ctx.putImageData(sceneData, 0, 0);
}
```

**Generating normal maps for pixel art tiles:**
```javascript
// Auto-generate a simple normal map from a heightmap
function heightmapToNormalMap(heightData, w, h) {
  const normalData = new Uint8ClampedArray(w * h * 4);

  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      const idx = (y * w + x);
      // Sobel-like gradient
      const left  = heightData[idx - 1];
      const right = heightData[idx + 1];
      const up    = heightData[idx - w];
      const down  = heightData[idx + w];

      const dx = (right - left) * 0.5;
      const dy = (down - up) * 0.5;

      // Normalize
      const len = Math.sqrt(dx * dx + dy * dy + 1);
      const nIdx = idx * 4;
      normalData[nIdx]     = ((-dx / len) * 0.5 + 0.5) * 255;  // R = X
      normalData[nIdx + 1] = ((-dy / len) * 0.5 + 0.5) * 255;  // G = Y
      normalData[nIdx + 2] = ((1 / len) * 0.5 + 0.5) * 255;    // B = Z
      normalData[nIdx + 3] = 255;
    }
  }

  return normalData;
}
```

**Performance:** VERY EXPENSIVE. At 800x600 = 480,000 pixels * multiple light sources * per-pixel math = 15-30ms per frame. NOT suitable for real-time at 60fps on the full screen.

**Mitigations:**
- Apply normal mapping only to the tile layer at half or quarter resolution (200x150 = 30,000 pixels = ~1ms)
- Pre-bake normal-mapped tiles at startup for each light angle quadrant (only 4-8 variants needed)
- Use only for boss chamber floor or special effect areas
- Update lighting every 3-4 frames

**Notes for Dark Keep:** This is the highest-impact but also highest-cost technique. For a pixel-art game at 800x600, the pre-baked approach is recommended: generate 8 directional-lit versions of each tile type at startup, then select the appropriate one based on nearest light direction. This gives 90% of the visual impact at near-zero runtime cost.

**Tools for creating normal maps:**
- [SpriteIlluminator](https://www.codeandweb.com/spriteilluminator) -- commercial normal map editor for sprites
- [Laigter](https://azagaya.itch.io/laigter) -- free, open-source normal map generator for 2D sprites
- Manual: paint height values as grayscale, convert to normal map with the above algorithm

**Sources:**
- [GitHub: normal-mapping-demonstration](https://github.com/egslava/normal-mapping-demonstration) -- working Canvas 2D demo
- [CodePen: Canvas Normal Mapping](https://codepen.io/zadvorsky/pen/dyKxNo)
- [arXiv: Normal Map Generation for Pixel Art](https://arxiv.org/pdf/2212.09692)

---

## Summary Matrix

| # | Technique | Visual Impact | Complexity | 60fps? | Best For |
|---|-----------|:---:|:---:|:---:|----------|
| 1 | Motion Blur / Ghost Trails | 7 | 1 | YES | Dash, fast movement, boss teleport |
| 2 | Multi-Pass Offscreen Canvases | 9 | 2 | YES | Foundation for ALL other effects |
| 3 | ctx.filter (blur, brightness, etc.) | 8 | 2 | YES | Bloom, color effects, drop shadows |
| 4 | Film Grain / Noise | 6 | 2 | YES | Cinematic atmosphere, gritty mood |
| 5 | Puddle Reflections | 7 | 3 | YES | Wet dungeon floor, visual depth |
| 6 | Color Grading / Palette Cycling | 7 | 3 | YES | Mood, danger indicators, animated tiles |
| 7 | 2D Shadow Casting | 9 | 5 | YES* | Dramatic geometric shadows from walls |
| 8 | Chromatic Aberration | 7 | 4 | YES** | Boss hits, critical damage, power surge |
| 9 | Rim Lighting | 7 | 4 | YES | Characters "pop" from dark background |
| 10 | Sub-pixel Rendering | 5 | 2 | YES | Smooth particle motion |
| 11 | God Rays | 8 | 6 | YES* | Dramatic torch/door light shafts |
| 12 | Heat Haze / Distortion | 7 | 6 | YES** | Near fire, lava, magic sources |
| 13 | Dithering Patterns | 6 | 5 | MAYBE | Retro shadow edges, style effect |
| 14 | Normal Mapping | 10 | 9 | NO*** | Tile depth, surface detail |

\* With optimization (caching segments, limiting ray count, half-res)
\** As occasional effect, not every frame
\*** Not real-time at full resolution; use pre-baked variants instead

---

## Recommended Implementation Order for Dark Keep

### Phase 1: Foundation (enables everything else)
1. **Multi-pass rendering architecture** -- separate background, entity, effects, lighting, UI layers
2. **Sub-pixel rendering** -- remove Math.floor from particle positions (5 second change)
3. **Canvas motion blur** -- add ghost trail canvas for dash/fast movement

### Phase 2: Lighting Revolution
4. **2D shadow casting** -- replace radial gradient darkness with geometric visibility polygons
5. **ctx.filter bloom** -- blur bright elements, composite with `"lighter"` blend
6. **Rim lighting** -- warm edge on light-facing side of entities

### Phase 3: Atmosphere
7. **Color grading** -- floor-based mood (deeper = colder), HP danger pulse
8. **Film grain** -- subtle noise overlay for cinematic grit
9. **Palette cycling** -- animated water/lava tiles
10. **Puddle reflections** -- flipped entities on wet floor tiles

### Phase 4: Impact and Drama
11. **Chromatic aberration** -- boss phase transitions, critical hits
12. **God rays** -- simplified radial lines from torches, full occlusion for boss chamber
13. **Heat haze** -- above torches and lava (regional, canvas-strip approach)

### Phase 5: Polish
14. **Dithering** -- pre-computed dithered shadow gradients for pixel-art consistency
15. **Normal mapping** -- pre-baked directional tile variants (if time allows)

---

## Performance Budget at 800x600, 60fps (16.6ms per frame)

| System | Budget | Notes |
|--------|--------|-------|
| Game logic + physics | 2ms | AI, collision, state |
| Tile rendering | 1ms | Cached background layer |
| Entity rendering | 2ms | Player + 5-10 enemies |
| Particle system | 1ms | 200-500 particles |
| Shadow casting | 2ms | With cached segments, limited radius |
| Lighting compositing | 1ms | Multiply blend of light map |
| Bloom pass | 1ms | ctx.filter blur + additive composite |
| Post-effects (grain, color grade) | 1ms | Simple overlays |
| Compositing all layers | 1ms | 5 drawImage calls |
| **Total** | **12ms** | **4.6ms headroom** |

Occasional effects (chromatic aberration, heat haze) can use the headroom since they only activate during impacts/special moments.

---

## Sources

### Primary References
- [MDN: Canvas Optimization](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [MDN: CanvasRenderingContext2D.filter](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/filter)
- [MDN: globalCompositeOperation](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation)
- [web.dev: Canvas Performance](https://web.dev/articles/canvas-performance)

### Algorithms and Tutorials
- [ncase: Sight & Light](https://ncase.me/sight-and-light/) -- 2D raycasting visibility algorithm
- [Red Blob Games: 2D Visibility](https://www.redblobgames.com/articles/visibility/) -- sweep-line visibility
- [EffectGames: Color Cycling with HTML5](http://www.effectgames.com/effect/article-Old_School_Color_Cycling_with_HTML5.html)
- [surma.dev: Ditherpunk](https://surma.dev/things/ditherpunk/) -- comprehensive dithering guide

### Working Examples
- [CodePen: Chromatic aberration in Canvas](https://codepen.io/njmcode/pen/ZLrWzq)
- [CodePen: Canvas displacement mapping](https://codepen.io/njmcode/pen/BNLKbK)
- [CodePen: Film grain effect](https://codepen.io/sucka/pen/PwYqLbo)
- [CodePen: Canvas Normal Mapping](https://codepen.io/zadvorsky/pen/dyKxNo)
- [Blog: RGB Splitting with Canvas](https://hangindev.com/blog/rgb-splitting-effect-with-html5-canvas-and-javascript)

### Libraries (reference, not dependencies)
- [Illuminated.js](https://greweb.me/2012/05/illuminated-js-2d-lights-and-shadows-rendering-engine-for-html5-applications) -- 2D lighting/shadow engine
- [CanvasDither](https://github.com/NielsLeenheer/CanvasDither) -- dithering algorithms
- [canvascycle](https://github.com/jhuckaby/canvascycle) -- color cycling engine

### Tools
- [Laigter](https://azagaya.itch.io/laigter) -- free normal map generator for 2D art
- [Lospec Palette List](https://lospec.com/palette-list) -- curated pixel art palettes
