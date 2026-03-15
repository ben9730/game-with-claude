# Performance Research: Canvas 2D Optimization for Depths of the Dark Keep

**Game:** 800x600 pixel art dungeon roguelike
**Target:** 60fps with heavy visual effects (particles, lighting, bloom, fog, color grading)
**Researched:** 2026-03-14
**Overall Confidence:** HIGH (well-documented domain, verified with MDN + official sources)

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Current Bottleneck Analysis](#current-bottleneck-analysis)
3. [Layered Canvas Architecture](#1-layered-canvas-architecture)
4. [OffscreenCanvas and Web Workers](#2-offscreencanvas-and-web-workers)
5. [Canvas State Management](#3-canvas-state-management)
6. [ImageData Manipulation](#4-imagedata-manipulation)
7. [Object Pooling for Particles](#5-object-pooling-for-particles)
8. [requestAnimationFrame Optimization](#6-requestanimationframe-optimization)
9. [Canvas Rendering Hints](#7-canvas-rendering-hints)
10. [Caching and Pre-rendering](#8-caching-and-pre-rendering)
11. [Priority Recommendations](#priority-recommendations)

---

## Executive Summary

At 800x600, the game's resolution is modest (480,000 pixels) -- most Canvas 2D operations are fast at this scale. The **real performance killers** in the current codebase are:

1. **Per-frame radial gradient creation** in `drawDarknessOverlay()` and `drawTorches()` -- creating `createRadialGradient()` objects every frame for every torch
2. **Redrawing static room geometry every frame** -- walls, floors, floor details, wall details all redrawn identically each frame
3. **Particle system using `Array.splice()`** for removal -- causes array reallocation and GC pressure
4. **Excessive `save()/restore()` calls** in particle drawing (per-particle for bone, fragment, slime_blob, wing_fragment types)
5. **`globalAlpha` changes on every particle** -- state change per draw call

The layered canvas approach and pre-rendering static content will deliver the largest gains. Object pooling and state batching are the next priority. OffscreenCanvas with Web Workers is overkill for 800x600 but worth understanding for future scaling.

---

## Current Bottleneck Analysis

Examining the existing codebase, here is what happens **every single frame** during gameplay:

```
renderPlaying(ctx)
  -> drawRoom(ctx)                    // EXPENSIVE: loops all tiles, draws walls/floors
     -> floor/wall tile grid loop     // ~300 tiles, each with drawImage + ambient occlusion
     -> floorDetails loop             // ~50-100 detail draws with alpha changes
     -> wallDetails loop              // ~30-60 detail draws with alpha changes
     -> drawDoor(ctx)                 // conditional, moderate cost
     -> drawTorches(ctx)              // EXPENSIVE: createRadialGradient per torch per frame
     -> drawFog(ctx)                  // 15 fog particles with alpha changes
     -> drawDarknessOverlay(ctx)      // EXPENSIVE: offscreen canvas + gradients per frame
     -> drawVignette(ctx)             // createRadialGradient per frame
  -> drawPowerups(ctx)
  -> drawProjectiles(ctx)
  -> sort enemies by Y               // Array spread + sort per frame
  -> drawPlayer(ctx) + drawEnemy(ctx) // Entity rendering
  -> drawParticles(ctx)               // EXPENSIVE: per-particle state changes, save/restore
  -> drawHUD(ctx)                     // drawHUDFrame x3, text rendering, icon drawing
```

**Already good practices in the codebase:**
- Wall/floor tile caching to offscreen canvases (rooms.js lines 157-180)
- Darkness overlay using a cached offscreen canvas (_darkCanvas)
- Integer pixel coordinates with Math.floor()
- Bloom effect using downscaled offscreen canvas

---

## 1. Layered Canvas Architecture

**Confidence: HIGH** (MDN, web.dev, widely documented)

### Concept

Stack multiple `<canvas>` elements with CSS `position: absolute` so each layer only redraws when its content changes.

### Recommended Layer Structure for This Game

```
Layer 5: UI Canvas        (redraws on HP/buff/room change only)
Layer 4: Effects Canvas   (every frame -- particles, bloom)
Layer 3: Lighting Canvas  (every frame -- darkness, vignette, color grading)
Layer 2: Entity Canvas    (every frame -- player, enemies, projectiles, powerups)
Layer 1: Background Canvas (redraws on room change ONLY)
```

### Implementation

```html
<div id="game-container" style="position:relative; width:800px; height:600px;">
  <canvas id="bg-layer"      width="800" height="600" style="position:absolute;"></canvas>
  <canvas id="entity-layer"  width="800" height="600" style="position:absolute;"></canvas>
  <canvas id="light-layer"   width="800" height="600" style="position:absolute;"></canvas>
  <canvas id="effects-layer" width="800" height="600" style="position:absolute;"></canvas>
  <canvas id="ui-layer"      width="800" height="600" style="position:absolute;"></canvas>
</div>
```

```javascript
// Initialize contexts with appropriate hints
const bgCtx = document.getElementById('bg-layer')
  .getContext('2d', { alpha: false }); // opaque background

const entityCtx = document.getElementById('entity-layer')
  .getContext('2d', { alpha: true });

const lightCtx = document.getElementById('light-layer')
  .getContext('2d', { alpha: true });

const effectsCtx = document.getElementById('effects-layer')
  .getContext('2d', { alpha: true });

const uiCtx = document.getElementById('ui-layer')
  .getContext('2d', { alpha: true });
```

### What Goes Where

| Layer | Content | Update Frequency | Estimated Savings |
|-------|---------|------------------|-------------------|
| Background | Room tiles, floor details, wall details, door, torches (static parts) | Room change only | **~60% of current draw calls eliminated per frame** |
| Entity | Player, enemies, projectiles, powerups, camera shake | Every frame | None (already per-frame) |
| Lighting | Darkness overlay, torch glow, vignette, fog | Every frame | Separate compositing context |
| Effects | Particles, bloom, boss entrance flash | Every frame | Can skip when no particles active |
| UI | HUD frames, HP bar, dash bar, buffs, room info | On state change | **~15% of draw calls eliminated per frame** |

### Worth It at 800x600?

**YES, absolutely.** The background layer alone eliminates ~300 tile draws + ~100 detail draws + torch bracket draws per frame. At 60fps, that is ~24,000 unnecessary draw calls per second eliminated. The HUD layer adds another savings since HUD frame borders are expensive (many fillRect calls) and only change on damage/buff/room events.

### Caveats

- Camera shake (`ctx.translate(shakeX, shakeY)`) must be applied to entity + lighting layers, NOT the background layer (which would need redraw). Alternative: apply CSS transform for shake, which is GPU-accelerated and free.
- Torch flames animate, so the flame portion must be on the entity or effects layer, while the torch bracket (static) stays on background.

```javascript
// GPU-accelerated camera shake via CSS transform (no canvas redraw needed)
const entityCanvas = document.getElementById('entity-layer');
entityCanvas.style.transform = `translate(${shakeX}px, ${shakeY}px)`;
// Apply same to lighting layer
```

---

## 2. OffscreenCanvas and Web Workers

**Confidence: HIGH** (web.dev, MDN, browser support confirmed)

### Concept

`OffscreenCanvas` can run in a Web Worker, allowing rendering to happen off the main thread. The canvas is transferred to the worker via `transferControlToOffscreen()`.

### Implementation

```javascript
// main.js
const offscreen = document.getElementById('effects-layer').transferControlToOffscreen();
const worker = new Worker('effects-worker.js');
worker.postMessage({ canvas: offscreen }, [offscreen]);

// effects-worker.js
self.onmessage = function(e) {
  const canvas = e.data.canvas;
  const ctx = canvas.getContext('2d');

  function renderFrame(particles) {
    ctx.clearRect(0, 0, 800, 600);
    for (const p of particles) {
      ctx.globalAlpha = p.alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(p.x, p.y, p.size, p.size);
    }
  }

  // Receive particle data each frame
  self.onmessage = function(e) {
    if (e.data.particles) {
      renderFrame(e.data.particles);
    }
  };
};
```

### Data Transfer Considerations

Transferring particle data to a worker has overhead. Options:

1. **postMessage with structured clone** -- copies data, ~0.1-0.5ms for hundreds of particles
2. **SharedArrayBuffer** -- zero-copy shared memory, but requires COOP/COEP headers
3. **Transferable ArrayBuffers** -- zero-copy transfer, but buffer becomes unusable in sender

```javascript
// SharedArrayBuffer approach (fastest, requires server headers)
const particleBuffer = new SharedArrayBuffer(MAX_PARTICLES * 7 * 4); // 7 floats per particle
const particleData = new Float32Array(particleBuffer);
// Both main thread and worker read/write directly -- no transfer cost
```

### Worth It at 800x600?

**NO for this game.** The overhead of serializing/transferring data between threads exceeds the rendering cost at this resolution. OffscreenCanvas shines when:
- Canvas is very large (4K+)
- Main thread is saturated with non-rendering work (physics, AI, networking)
- Rendering is computationally expensive (complex shaders, huge particle counts)

At 800x600 with ~100-200 particles max, the rendering work is trivially fast. The postMessage overhead would likely exceed the rendering time.

**Exception:** If you later add complex per-pixel effects (full-screen distortion, water simulation), a worker could help. But for current scope, skip it.

---

## 3. Canvas State Management

**Confidence: HIGH** (MDN, benchmarking community consensus)

### Cost of State Changes (Most to Least Expensive)

| Operation | Relative Cost | Notes |
|-----------|--------------|-------|
| `ctx.font = "..."` | **VERY HIGH** | Font parsing, glyph cache lookup. Change as rarely as possible |
| `ctx.createRadialGradient()` | **HIGH** | Creates new gradient object, calculates color stops |
| `ctx.createLinearGradient()` | **MODERATE-HIGH** | Cheaper than radial but still allocates |
| `globalCompositeOperation` | **MODERATE** | Changes GPU blend mode pipeline |
| `ctx.save()` / `ctx.restore()` | **LOW-MODERATE** | Pushes/pops full state stack. Cheap individually, expensive x100/frame |
| `ctx.globalAlpha` | **LOW** | Simple float assignment |
| `ctx.fillStyle` (solid color) | **LOW** | Color string parsing, but usually cached |
| `ctx.fillStyle` (gradient obj) | **LOW** | Just assigns reference, gradient already created |
| `ctx.fillRect()` | **VERY LOW** | One of the cheapest drawing operations |

### Current Problems in the Codebase

**Problem 1: Per-particle `save()/restore()` in drawParticles()**

```javascript
// CURRENT (particles.js) -- save/restore for EACH bone, fragment, slime_blob particle
if (p.ptype === "bone") {
  ctx.save();               // push state
  ctx.translate(p.x, p.y);  // modify transform
  ctx.rotate(p.rotation);   // modify transform
  // ... draw ...
  ctx.restore();            // pop state
}
```

At 40+ particles from a boss death explosion, that is 40+ save/restore pairs per frame.

**Fix: Use `setTransform()` instead of save/translate/rotate/restore:**

```javascript
// OPTIMIZED -- no save/restore needed
if (p.ptype === "bone") {
  const cos = Math.cos(p.rotation);
  const sin = Math.sin(p.rotation);
  ctx.setTransform(cos, sin, -sin, cos, p.x, p.y);
  ctx.fillRect(-s, -s * 0.3, s * 2, s * 0.6);
  ctx.fillRect(-s * 0.3, -s, s * 0.6, s * 2);
  // ... etc ...
}
// After all particles, reset transform once:
ctx.setTransform(1, 0, 0, 1, 0, 0);
```

This eliminates the state stack push/pop entirely. `setTransform()` directly sets the matrix without needing to save/restore the previous state.

**Problem 2: `globalAlpha` changed per particle**

```javascript
// CURRENT -- changes alpha for EVERY particle
for (const p of particles) {
  const alpha = clamp(p.life / p.maxLife, 0, 1);
  ctx.globalAlpha = alpha;  // state change per particle
```

**Fix: Sort particles by alpha bucket and batch:**

```javascript
// Group particles by approximate alpha (10 buckets)
// Only feasible if particle count is high enough to justify sorting overhead
// At <200 particles, the per-particle alpha change is acceptable
```

At the current particle count (<200 max), per-particle alpha changes are fine. The cost is negligible compared to the save/restore savings.

**Problem 3: `createRadialGradient()` called per torch per frame**

```javascript
// CURRENT (lighting.js) -- creates NEW gradient object per torch per frame
for (const torch of torches) {
  const glow = ctx.createRadialGradient(
    torch.x, torch.y - 4, 2,
    torch.x, torch.y - 4, glowR
  );
  glow.addColorStop(0, `rgba(255,170,70,${0.12 * intensity})`);
  // ... 3 more color stops ...
  ctx.fillStyle = glow;
}
```

With 6-10 torches, this is 6-10 gradient creations per frame (+ 4-5 gradient creations in `drawDarknessOverlay()`). **This is the single most impactful optimization target.**

**Fix: Pre-render torch glow as a cached radial gradient image:**

```javascript
// PRE-RENDER once at room load
let _torchGlowCanvas = null;

function createTorchGlowCache(maxRadius) {
  const size = maxRadius * 2;
  _torchGlowCanvas = document.createElement('canvas');
  _torchGlowCanvas.width = size;
  _torchGlowCanvas.height = size;
  const gctx = _torchGlowCanvas.getContext('2d');

  const glow = gctx.createRadialGradient(maxRadius, maxRadius, 2, maxRadius, maxRadius, maxRadius);
  glow.addColorStop(0, 'rgba(255,170,70,0.12)');
  glow.addColorStop(0.3, 'rgba(255,140,50,0.08)');
  glow.addColorStop(0.6, 'rgba(255,110,30,0.04)');
  glow.addColorStop(1, 'rgba(255,100,20,0)');
  gctx.fillStyle = glow;
  gctx.fillRect(0, 0, size, size);

  return _torchGlowCanvas;
}

// DRAW per frame -- just drawImage with varying alpha for flicker
function drawTorchGlow(ctx, torch, flicker, intensity) {
  const glowR = torch.baseRadius * (0.9 + flicker * 0.3);
  const scale = glowR / (torch.baseRadius); // relative scale
  ctx.globalAlpha = intensity;
  ctx.drawImage(
    _torchGlowCanvas,
    torch.x - glowR,
    torch.y - 4 - glowR,
    glowR * 2,
    glowR * 2
  );
  ctx.globalAlpha = 1;
}
```

This replaces gradient creation + color stop parsing with a single `drawImage()` call per torch.

### Batching Draw Calls

**Group by fillStyle to minimize color changes:**

```javascript
// BEFORE: alternating colors
ctx.fillStyle = 'red';   ctx.fillRect(0, 0, 10, 10);
ctx.fillStyle = 'blue';  ctx.fillRect(20, 0, 10, 10);
ctx.fillStyle = 'red';   ctx.fillRect(40, 0, 10, 10);  // 3 color changes

// AFTER: batch by color
ctx.fillStyle = 'red';
ctx.fillRect(0, 0, 10, 10);
ctx.fillRect(40, 0, 10, 10);  // 1 color change
ctx.fillStyle = 'blue';
ctx.fillRect(20, 0, 10, 10);  // 1 color change (total: 2)
```

For particles, this means sorting by color before drawing (only worthwhile at 200+ particles).

---

## 4. ImageData Manipulation

**Confidence: HIGH** (MDN, Mozilla Hacks)

### getImageData/putImageData vs drawImage

| Approach | Best For | Avoid When |
|----------|----------|------------|
| `drawImage()` | Blitting sprites, compositing layers, scaling | N/A -- always fast |
| `getImageData()/putImageData()` | Per-pixel effects, custom blending, color manipulation | Every frame on large areas |
| `Uint32Array` view | Fast per-pixel write (1 write per pixel vs 4) | Read-heavy operations |

### When getImageData is Faster

**Almost never for drawing.** `drawImage()` is GPU-accelerated; `getImageData()/putImageData()` forces CPU readback. Use pixel manipulation only for effects that Canvas 2D cannot express natively.

### Uint32Array for Fast Pixel Operations

```javascript
const imageData = ctx.getImageData(0, 0, 800, 600);
const buf = new ArrayBuffer(imageData.data.length);
const buf8 = new Uint8ClampedArray(buf);
const buf32 = new Uint32Array(buf);

// Write a pixel in ONE operation instead of four
// Note: byte order is platform-dependent (usually ABGR on little-endian)
const r = 255, g = 128, b = 0, a = 255;
buf32[y * 800 + x] = (a << 24) | (b << 16) | (g << 8) | r; // little-endian ABGR

// Copy back
imageData.data.set(buf8);
ctx.putImageData(imageData, 0, 0);
```

### createImageBitmap for Pre-processing

```javascript
// Convert ImageData or Image to an ImageBitmap (GPU-ready texture)
const bitmap = await createImageBitmap(imageData);
// OR from a canvas
const bitmap = await createImageBitmap(offscreenCanvas, 0, 0, 100, 100);

// Now drawImage uses the pre-processed bitmap -- avoids repeated decoding
ctx.drawImage(bitmap, x, y);
```

### Worth It at 800x600?

**SELECTIVE USE.** For specific effects:

- **Dithering** (currently `drawDithered2()` does individual `fillRect` per 2x2 pixel) -- could be faster with ImageData if the dithered area is large, but the current areas are small (10x6 pixels). Keep current approach.
- **Full-screen color grading** -- the current `drawColorGrading()` uses `fillRect` with rgba overlays, which is already efficient via compositing. No change needed.
- **Scanline/CRT effects** (if added later) -- would benefit from Uint32Array approach.
- **Custom lighting/shadow maps** -- if going beyond radial gradients, ImageData with Uint32Array would be the way.

**Verdict: Keep using drawImage/fillRect for current effects. Reserve ImageData for future per-pixel effects only.**

---

## 5. Object Pooling for Particles

**Confidence: HIGH** (well-established game dev pattern)

### Current Problem

```javascript
// particles.js -- TWO performance problems:

// 1. Dynamic object creation with many properties
particles.push({
  x, y, vx, vy, life, maxLife, color, size,
  ptype, gravity, rotation, rotSpeed
});

// 2. Array.splice() for removal -- O(n) shift of remaining elements
if (p.life <= 0) particles.splice(i, 1);
```

`Array.splice()` is the bigger problem. When a particle dies mid-array, all subsequent elements shift down. With 100 particles, removing particle #10 shifts 90 elements. When 20 particles die in one frame, the array is restructured 20 times.

### Solution A: Swap-and-Pop (Recommended)

Replace `splice()` with swap-and-pop. Order doesn't matter for particles.

```javascript
const MAX_PARTICLES = 512;
let particles = [];

function removeParticle(index) {
  // Swap with last element, then pop -- O(1)
  const last = particles.length - 1;
  if (index !== last) {
    particles[index] = particles[last];
  }
  particles.pop(); // O(1), no shift
}

function updateParticles(dt) {
  // Iterate backwards, swap-and-pop dead particles
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.gravity) p.vy += p.gravity * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    if (p.rotation !== undefined) p.rotation += (p.rotSpeed || 0) * dt;

    if (p.ptype === "bone" && !p.bounced && p.vy > 0 && p.life < p.maxLife * 0.5) {
      p.vy = -p.vy * 0.4;
      p.vx *= 0.6;
      p.bounced = true;
    }

    p.life -= dt;
    if (p.life <= 0) {
      removeParticle(i);
    }
  }
}
```

### Solution B: Pre-allocated Pool with TypedArrays (Maximum Performance)

For maximum performance and zero GC, use Structure-of-Arrays with TypedArrays:

```javascript
const MAX_PARTICLES = 512;

// Structure of Arrays -- contiguous memory, cache-friendly
const particlePool = {
  x:        new Float32Array(MAX_PARTICLES),
  y:        new Float32Array(MAX_PARTICLES),
  vx:       new Float32Array(MAX_PARTICLES),
  vy:       new Float32Array(MAX_PARTICLES),
  life:     new Float32Array(MAX_PARTICLES),
  maxLife:  new Float32Array(MAX_PARTICLES),
  size:     new Float32Array(MAX_PARTICLES),
  gravity:  new Float32Array(MAX_PARTICLES),
  rotation: new Float32Array(MAX_PARTICLES),
  rotSpeed: new Float32Array(MAX_PARTICLES),
  // For non-numeric data, use regular arrays or indices
  color:    new Array(MAX_PARTICLES),
  ptype:    new Uint8Array(MAX_PARTICLES),  // enum: 0=square, 1=spark, etc.
  active:   new Uint8Array(MAX_PARTICLES),  // 1=alive, 0=dead
  count: 0, // current active count
};

const PTYPE = {
  square: 0, spark: 1, sparkle: 2, fragment: 3,
  slime_blob: 4, dust: 5, wing_fragment: 6, flash: 7,
  blood: 8, bone: 9,
};

function spawnParticle(x, y, vx, vy, life, color, size, ptype, gravity, rotSpeed) {
  if (particlePool.count >= MAX_PARTICLES) return; // pool exhausted
  const i = particlePool.count++;
  particlePool.x[i] = x;
  particlePool.y[i] = y;
  particlePool.vx[i] = vx;
  particlePool.vy[i] = vy;
  particlePool.life[i] = life;
  particlePool.maxLife[i] = life;
  particlePool.size[i] = size;
  particlePool.color[i] = color;
  particlePool.ptype[i] = ptype;
  particlePool.gravity[i] = gravity;
  particlePool.rotation[i] = Math.random() * Math.PI * 2;
  particlePool.rotSpeed[i] = rotSpeed;
  particlePool.active[i] = 1;
}

function updateParticlePool(dt) {
  const p = particlePool;
  for (let i = p.count - 1; i >= 0; i--) {
    p.x[i] += p.vx[i] * dt;
    p.y[i] += p.vy[i] * dt;
    p.vy[i] += p.gravity[i] * dt;
    p.vx[i] *= 0.96;
    p.vy[i] *= 0.96;
    p.rotation[i] += p.rotSpeed[i] * dt;
    p.life[i] -= dt;

    if (p.life[i] <= 0) {
      // Swap with last active particle
      const last = p.count - 1;
      if (i !== last) {
        p.x[i] = p.x[last];
        p.y[i] = p.y[last];
        p.vx[i] = p.vx[last];
        p.vy[i] = p.vy[last];
        p.life[i] = p.life[last];
        p.maxLife[i] = p.maxLife[last];
        p.size[i] = p.size[last];
        p.color[i] = p.color[last];
        p.ptype[i] = p.ptype[last];
        p.gravity[i] = p.gravity[last];
        p.rotation[i] = p.rotation[last];
        p.rotSpeed[i] = p.rotSpeed[last];
      }
      p.count--;
    }
  }
}
```

### Solution C: Ring Buffer (Fixed-size, No Removal)

```javascript
const MAX_PARTICLES = 512;
let ringHead = 0; // next write position

function spawnParticle(/* ... */) {
  const i = ringHead;
  ringHead = (ringHead + 1) % MAX_PARTICLES;
  // Write to position i -- oldest particle gets overwritten automatically
  particlePool.x[i] = x;
  // ... etc
}
```

Ring buffers are simpler but particles can be cut short if spawn rate exceeds pool size. Best for effects where exact lifetime isn't critical (embers, dust).

### Worth It at 800x600?

**Solution A (swap-and-pop): YES, implement immediately.** It is a one-line change from `splice()` to swap-and-pop with zero downside. Eliminates the biggest GC and array-shift cost.

**Solution B (TypedArray pool): MAYBE later.** The current game peaks at ~60 particles (boss death = 54). The overhead of object-per-particle is negligible at this count. TypedArrays become worthwhile at 500+ particles. If you add ambient effects (rain, snow, screen-wide sparkles), implement this.

**Solution C (ring buffer): Good for embers/smoke.** The current `embers` array in effects.js and `smokeParticles` in lighting.js already do manual splice removal. These are perfect ring buffer candidates since they respawn continuously anyway.

---

## 6. requestAnimationFrame Optimization

**Confidence: HIGH** (MDN, established patterns)

### Avoiding Layout Thrashing

Canvas operations do NOT cause layout thrashing (unlike DOM manipulation). The current game is canvas-only, so this is not a concern. However, reading layout properties (offsetWidth, getBoundingClientRect) between canvas draws WOULD cause thrashing.

```javascript
// BAD: reading layout between draws forces synchronous layout
ctx.fillRect(0, 0, 10, 10);
const width = canvas.offsetWidth; // FORCES LAYOUT RECALCULATION
ctx.fillRect(20, 0, 10, 10);

// GOOD: read layout once before rendering
const width = canvas.offsetWidth;
ctx.fillRect(0, 0, 10, 10);
ctx.fillRect(20, 0, 10, 10);
```

### Minimizing GC Pressure

**Current GC triggers in the codebase:**

1. **`particles.push({...})` creates new objects** -- each particle is a fresh object with 12 properties
2. **`particles.splice()` restructures array** -- creates garbage from shifted references
3. **`[...enemies].filter().sort()` in renderer.js** -- creates THREE temporary arrays per frame
4. **Template literals for rgba colors** -- `rgba(0,0,0,${alpha})` creates new strings per frame
5. **`enemies.filter(e => !e.dead)` in hud.js** -- creates temporary array per frame

**Fixes:**

```javascript
// FIX 1: Reuse enemy sort array
let _sortBuf = [];
function getSortedEnemies(enemies) {
  _sortBuf.length = 0;
  for (let i = 0; i < enemies.length; i++) {
    if (!enemies[i].dead) _sortBuf.push(enemies[i]);
  }
  _sortBuf.sort((a, b) => a.y - b.y);
  return _sortBuf;
}

// FIX 2: Pre-compute common rgba strings or use hex with globalAlpha
// Instead of: ctx.fillStyle = `rgba(0,0,0,${alpha})`;
// Use: ctx.globalAlpha = alpha; ctx.fillStyle = '#000000';

// FIX 3: Count alive enemies without filter()
let aliveCount = 0;
for (let i = 0; i < enemies.length; i++) {
  if (!enemies[i].dead) aliveCount++;
}
```

### Delta Time Capping

The current game already caps dt at 50ms (`Math.min((timestamp - lastTime) / 1000, 0.05)`), which is correct. This prevents physics explosions on tab-switch or lag spikes.

### Worth It at 800x600?

**YES for GC fixes (items 1-5 above).** These are tiny code changes with measurable impact on frame consistency. GC pauses of 5-10ms cause visible stutters at 60fps (16.6ms budget). The enemy sort array allocation is the most impactful since it runs every frame.

---

## 7. Canvas Rendering Hints

**Confidence: HIGH** (MDN, Chrome DevBlog, tested benchmarks)

### `alpha: false`

```javascript
const ctx = canvas.getContext('2d', { alpha: false });
```

Tells the browser the canvas is always opaque. Eliminates alpha compositing between the canvas and elements behind it.

**Use for:** The bottom-most background layer canvas.
**Do NOT use for:** Entity, lighting, effects, UI layers (they need transparency).

**Performance gain:** Small but free. Browser skips blending canvas with page background.

### `desynchronized: true`

```javascript
const ctx = canvas.getContext('2d', { desynchronized: true });
```

Bypasses the DOM compositor queue, sending canvas buffer directly to display. Reduces latency by 1-2 frames.

**Use for:** The main game canvas or the entity layer -- reduces input-to-display latency.
**Caveats:**
- May cause tearing on some devices (ChromeOS especially)
- Cannot have translucent canvas with DOM elements above it
- Not all browsers/hardware support it (check `ctx.getContextAttributes().desynchronized`)

```javascript
// Safe usage with fallback
const ctx = canvas.getContext('2d', { desynchronized: true });
if (!ctx.getContextAttributes().desynchronized) {
  console.log('desynchronized not supported, using standard rendering');
}
```

**Worth it:** YES for the background layer. Adds perceived responsiveness. May cause issues with layered canvases (test carefully).

### `willReadFrequently: true`

```javascript
const ctx = canvas.getContext('2d', { willReadFrequently: true });
```

Forces CPU-side rendering, makes `getImageData()` faster but `drawImage()/fillRect()` much slower.

**Benchmarks (from research):**
- Read performance: 9-15ms vs 25-35ms (~40-50% faster reads)
- Write performance: commit time jumps from ~0.1ms to **47ms** (470x slower!)

**Use for:** ONLY the darkness overlay offscreen canvas IF you use `getImageData()` on it. Currently you do NOT read pixel data from it, so **DO NOT USE THIS**.

**IMPORTANT:** Chrome auto-enables this if it detects 2+ `getImageData()` calls on a canvas. If you later add getImageData for effects, explicitly set `willReadFrequently: false` on your main canvases to prevent Chrome from auto-disabling GPU acceleration.

```javascript
// Explicitly opt out of willReadFrequently on all main canvases
const ctx = canvas.getContext('2d', { willReadFrequently: false });
```

### Summary Table

| Hint | Background Layer | Entity Layer | Lighting Layer | Effects Layer | UI Layer |
|------|:---:|:---:|:---:|:---:|:---:|
| `alpha: false` | YES | no | no | no | no |
| `desynchronized` | MAYBE | MAYBE | no | no | no |
| `willReadFrequently` | no | no | no | no | no |

---

## 8. Caching and Pre-rendering

**Confidence: HIGH** (MDN, widely used pattern)

### What to Cache (Specific to This Game)

| Item | Current State | Cache Strategy | Impact |
|------|--------------|----------------|--------|
| Wall tiles | Already cached (3 variants) | DONE | -- |
| Floor tiles | Already cached (4 variants) | DONE | -- |
| Torch glow gradient | Created per torch per frame | Pre-render to offscreen canvas | **HIGH** |
| Darkness overlay gradients | Created per frame | Pre-render player light + torch lights | **HIGH** |
| Vignette gradient | Created per frame | Pre-render once (static) | **MEDIUM** |
| HUD frames | Drawn with many fillRects per frame | Pre-render to offscreen canvas | **MEDIUM** |
| Pixel art sprites (heart, icons) | Drawn from array data per frame | Pre-render to offscreen canvases | **LOW-MEDIUM** |
| Floor/wall details | Drawn per frame via fillRect | Bake into background layer at room load | **HIGH** (eliminates 60-160 draws/frame) |

### Pre-rendering the Vignette

The vignette never changes. Pre-render once:

```javascript
let _vignetteCanvas = null;

function initVignette() {
  _vignetteCanvas = document.createElement('canvas');
  _vignetteCanvas.width = W;
  _vignetteCanvas.height = H;
  const vctx = _vignetteCanvas.getContext('2d');

  const vg = vctx.createRadialGradient(W / 2, H / 2, 150, W / 2, H / 2, 450);
  vg.addColorStop(0, 'rgba(0,0,0,0)');
  vg.addColorStop(0.7, 'rgba(0,0,0,0.15)');
  vg.addColorStop(1, 'rgba(0,0,0,0.45)');
  vctx.fillStyle = vg;
  vctx.fillRect(0, 0, W, H);
}

function drawVignette(ctx) {
  ctx.drawImage(_vignetteCanvas, 0, 0);
}
```

**Saves:** 1 `createRadialGradient()` + 3 `addColorStop()` + 1 gradient fill per frame.

### Pre-rendering the Complete Background

At room load, render the entire static background once:

```javascript
let _roomBgCanvas = null;

function bakeRoomBackground() {
  if (!_roomBgCanvas) {
    _roomBgCanvas = document.createElement('canvas');
    _roomBgCanvas.width = W;
    _roomBgCanvas.height = H;
  }
  const bgCtx = _roomBgCanvas.getContext('2d');
  bgCtx.fillStyle = PAL.bg;
  bgCtx.fillRect(0, 0, W, H);

  // Draw all floor and wall tiles
  for (let y = 0; y < roomH; y++) {
    for (let x = 0; x < roomW; x++) {
      // ... existing tile drawing code ...
    }
  }

  // Draw all floor details (cracks, moss, puddles, etc.)
  for (const fd of floorDetails) {
    // ... existing floor detail code ...
  }

  // Draw all wall details (skulls, moss, vines)
  for (const wd of wallDetails) {
    // ... existing wall detail code ...
  }

  // Draw static parts of torches (brackets, sticks) -- NOT flames
  for (const torch of torches) {
    drawTorchBracket(bgCtx, torch);
  }

  // Draw closed door frame (the stone frame, not the animated parts)
}

// Per frame: just blit the pre-rendered background
function drawRoom(ctx) {
  ctx.drawImage(_roomBgCanvas, 0, 0);

  // Then draw only dynamic elements:
  drawTorchFlames(ctx);  // animated flames
  drawDoor(ctx);          // animated door (if opening)
}
```

**Saves:** ~400-500 `fillRect()` calls per frame, eliminated entirely.

### Sprite Atlas Pattern

For pixel art sprites defined as 2D arrays (HEART_SPRITE, SWORD_ICON, BOOT_ICON, etc.), pre-render to small canvases:

```javascript
// Pre-render a pixel art sprite to an offscreen canvas
function prerenderSprite(spriteData, pixelSize, colorMap) {
  const rows = spriteData.length;
  const cols = typeof spriteData[0] === 'string' ? spriteData[0].length : spriteData[0].length;
  const canvas = document.createElement('canvas');
  canvas.width = cols * pixelSize;
  canvas.height = rows * pixelSize;
  const ctx = canvas.getContext('2d');

  for (let r = 0; r < rows; r++) {
    const row = spriteData[r];
    for (let c = 0; c < cols; c++) {
      const val = typeof row === 'string' ? row[c] : row[c];
      if (val === '0' || val === 0) continue;
      ctx.fillStyle = colorMap[val] || '#ff00ff';
      ctx.fillRect(c * pixelSize, r * pixelSize, pixelSize, pixelSize);
    }
  }

  return canvas;
}

// Usage:
const heartNormal = prerenderSprite(HEART_SPRITE, 2, {
  1: PAL.hpBar,
  2: '#ff6666'
});
const heartLow = prerenderSprite(HEART_SPRITE, 2, {
  1: '#ff3333',
  2: '#ff8888'
});

// In drawHUD: ctx.drawImage(heartNormal, 15, 15);
```

### Pre-rendered Lighting Gradient Cache

For the darkness overlay, pre-render the gradient "stamp" at different sizes:

```javascript
// Cache gradient stamps at common radii
const LIGHT_STAMPS = {};

function getLightStamp(radius) {
  const key = Math.round(radius / 5) * 5; // quantize to 5px increments
  if (LIGHT_STAMPS[key]) return LIGHT_STAMPS[key];

  const size = key * 2;
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');

  const grad = ctx.createRadialGradient(key, key, key * 0.05, key, key, key);
  grad.addColorStop(0, 'rgba(0,0,0,1)');
  grad.addColorStop(0.4, 'rgba(0,0,0,0.8)');
  grad.addColorStop(0.7, 'rgba(0,0,0,0.4)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, size, size);

  LIGHT_STAMPS[key] = c;
  return c;
}

// In drawDarknessOverlay:
// Instead of creating a new gradient per light source:
const stamp = getLightStamp(radius);
dctx.drawImage(stamp, x - radius, y - radius, radius * 2, radius * 2);
```

**Saves:** All `createRadialGradient()` calls in the darkness overlay, replaced with `drawImage()` lookups.

### Worth It at 800x600?

**ABSOLUTELY YES.** This is the highest-impact optimization category for this game. The background pre-rendering alone eliminates the majority of per-frame draw calls. The gradient caching eliminates the most expensive operations (gradient creation).

---

## Priority Recommendations

### Tier 1: Implement Now (Highest Impact, Lowest Effort)

| Optimization | Effort | Impact | Description |
|-------------|--------|--------|-------------|
| Swap-and-pop for particles | 5 min | Medium | Replace `splice()` with swap-and-pop in `updateParticles()` |
| Pre-render vignette | 10 min | Medium | Cache vignette gradient once, drawImage per frame |
| Pre-render torch glow | 20 min | High | Cache radial gradient as image, drawImage per torch |
| Cache light stamps | 30 min | High | Pre-render gradient circles for darkness overlay |
| `setTransform()` for particles | 15 min | Medium | Eliminate save/restore in rotated particle drawing |
| `alpha: false` on main canvas | 1 min | Low | Free performance -- no transparency compositing needed |

### Tier 2: Implement for Visual Upgrade (Medium Effort)

| Optimization | Effort | Impact | Description |
|-------------|--------|--------|-------------|
| Bake room background | 1-2 hr | **Very High** | Pre-render all static room content at room load |
| Layered canvas (bg + game) | 2-3 hr | **Very High** | Separate static background from dynamic content |
| Pre-render HUD frames | 30 min | Medium | Cache the stone/metal border art |
| Pre-render sprite icons | 30 min | Low-Med | Cache heart, sword, boot, shield, dungeon icons |
| Reuse sort buffer | 5 min | Low | Avoid array allocation per frame for enemy sorting |
| Eliminate rgba template strings | 15 min | Low | Use globalAlpha + hex colors instead |

### Tier 3: Implement If Needed (Higher Effort)

| Optimization | Effort | Impact | Description |
|-------------|--------|--------|-------------|
| Full 5-layer canvas system | 4-6 hr | High | Complete layer separation with dedicated update logic |
| TypedArray particle pool | 2-3 hr | Medium | Structure-of-Arrays with Float32Array for particles |
| Ring buffer for embers/smoke | 1 hr | Low | Fixed-size circular buffer for ambient particles |
| CSS transform for camera shake | 30 min | Low | GPU-accelerated shake without redrawing |
| `desynchronized` hint | 10 min | Low | Reduced input latency (test for tearing) |

### Tier 4: Skip Unless Scaling Up

| Optimization | Why Skip |
|-------------|----------|
| OffscreenCanvas + Web Workers | Overhead exceeds benefit at 800x600 |
| Full TypedArray everything | Current object counts too small |
| ImageData pixel manipulation | No per-pixel effects currently needed |
| willReadFrequently | No getImageData on main canvases |

---

## Estimated Performance Budget

At 800x600 @ 60fps, the frame budget is **16.6ms**.

| Phase | Current Est. | After Tier 1 | After Tier 2 |
|-------|-------------|--------------|--------------|
| Room drawing (tiles + details) | ~4-6ms | ~3-4ms | ~0.5ms (pre-baked) |
| Torch glow + darkness overlay | ~2-4ms | ~0.5-1ms | ~0.5ms |
| Particle update + draw | ~1-2ms | ~0.5-1ms | ~0.5ms |
| Entity drawing | ~1-2ms | ~1-2ms | ~1-2ms |
| HUD | ~1-2ms | ~1-2ms | ~0.3ms |
| Effects (bloom, vignette, etc.) | ~1-2ms | ~0.5-1ms | ~0.5ms |
| **Total** | **~10-18ms** | **~6-10ms** | **~3-5ms** |

After Tier 2 optimizations, you would have **11-13ms of headroom** per frame for additional visual effects (more particles, screen-space effects, additional post-processing).

---

## Sources

- [MDN: Optimizing Canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Optimizing_canvas)
- [web.dev: Improving HTML5 Canvas Performance](https://web.dev/articles/canvas-performance)
- [web.dev: OffscreenCanvas](https://web.dev/articles/offscreen-canvas)
- [Chrome DevBlog: Low-latency rendering with desynchronized hint](https://developer.chrome.com/blog/desynchronized)
- [Chrome DevBlog: It's always been you, Canvas2D](https://developer.chrome.com/blog/canvas2d)
- [Kevin Schiener: Canvas willReadFrequently](https://www.schiener.io/2024-08-02/canvas-willreadfrequently)
- [Mozilla Hacks: Faster Canvas Pixel Manipulation with Typed Arrays](https://hacks.mozilla.org/2011/12/faster-canvas-pixel-manipulation-with-typed-arrays/)
- [MDN: Pixel manipulation with canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas)
- [How fast is JavaScript? Simulating 20M particles](https://dgerrells.com/blog/how-fast-is-javascript-simulating-20-000-000-particles)
- [ag-Grid: Optimising HTML5 Canvas Rendering](https://blog.ag-grid.com/optimising-html5-canvas-rendering-best-practices-and-techniques/)
