# Advanced Visual Techniques Research for Depths of the Dark Keep

> Research date: 2026-03-15
> Target: Canvas 2D / JavaScript browser roguelike
> Existing effects: sel-out outlines, hit stop, squash/stretch, screen shake, chromatic aberration, bloom, vignette, scanlines, color grading, per-biome tinting, damage popups, screen flash, dust motes, torch embers, drop shadows, afterimage trails

---

## Table of Contents

1. [Sub-Pixel Animation / Smooth Pixel Movement](#1-sub-pixel-animation--smooth-pixel-movement)
2. [Sprite Stacking (Fake 3D)](#2-sprite-stacking-fake-3d)
3. [Palette Cycling / Color Rotation](#3-palette-cycling--color-rotation)
4. [Particle Sprite Sheets](#4-particle-sprite-sheets)
5. [Dynamic 2D Shadows](#5-dynamic-2d-shadows)
6. [Screen-Space Effects](#6-screen-space-effects)
7. [Sprite Decomposition](#7-sprite-decomposition)
8. [Advanced Dithering in Real-Time](#8-advanced-dithering-in-real-time)
9. [Juice Techniques (Beyond Current)](#9-juice-techniques-beyond-current)
10. [Visually Stunning Pixel Art Roguelikes](#10-visually-stunning-pixel-art-roguelikes)

---

## 1. Sub-Pixel Animation / Smooth Pixel Movement

### What It Does Visually
Sub-pixel animation creates the illusion of movement smaller than one pixel by shifting colors between adjacent pixels rather than moving the sprite itself. This gives pixel art a sense of smoothness and "breathing" life that pure integer-position movement cannot achieve. Characters appear to sway, bob, or shift weight with remarkable subtlety even at low resolutions.

### How to Implement in Canvas 2D

**Approach A: Render-target upscale with fractional positions**
```javascript
// Render at native pixel art resolution to offscreen canvas
const gameCanvas = document.createElement('canvas');
gameCanvas.width = 320;  // native resolution
gameCanvas.height = 180;
const gameCtx = gameCanvas.getContext('2d');

// Track positions as floats
entity.x += velocity.x * dt; // e.g., 100.37
entity.y += velocity.y * dt;

// Option 1: Snap to integers (crisp but jittery)
gameCtx.drawImage(sprite, Math.round(entity.x), Math.round(entity.y));

// Option 2: Allow fractional positions (smooth but slightly soft)
// Keep imageSmoothingEnabled = false on the DISPLAY canvas
// but use true on the game canvas for sub-pixel blending
gameCtx.imageSmoothingEnabled = true;
gameCtx.drawImage(sprite, entity.x, entity.y);

// Scale up to display with nearest-neighbor
displayCtx.imageSmoothingEnabled = false;
displayCtx.drawImage(gameCanvas, 0, 0, displayCanvas.width, displayCanvas.height);
```

**Approach B: Pre-rendered sub-pixel frames**
Create 2-4 sub-pixel offset versions of key sprites at art time. For a 1-pixel shift, draw the sprite with colors anti-aliased at half-pixel offsets. Cycle through these frames for smooth idle breathing or subtle weight shifts.

```javascript
// Pre-render sub-pixel offsets at load time
const subPixelFrames = []; // 4 frames at 0.0, 0.25, 0.5, 0.75 pixel offset
for (let i = 0; i < 4; i++) {
    const offsetCanvas = document.createElement('canvas');
    const octx = offsetCanvas.getContext('2d');
    offsetCanvas.width = sprite.width + 1;
    offsetCanvas.height = sprite.height + 1;
    octx.imageSmoothingEnabled = true;
    octx.drawImage(sprite, i * 0.25, 0); // fractional offset
    subPixelFrames.push(offsetCanvas);
}
// Select frame based on fractional position
const fracX = entity.x - Math.floor(entity.x);
const frameIdx = Math.floor(fracX * 4) % 4;
gameCtx.drawImage(subPixelFrames[frameIdx], Math.floor(entity.x), Math.floor(entity.y));
```

**Approach C: Dual-canvas trick for camera smoothing**
Render sprites snapped to integer positions on the game canvas, but allow the camera offset to be fractional on the display canvas. This gives smooth scrolling while keeping sprite pixels crisp.

### Performance Considerations
- Approach A is cheapest: just allow fractional drawImage coords (slight blur acceptable at small scale)
- Approach B costs memory (4x sprite variants) but zero runtime cost beyond frame selection
- Approach C is best balance: camera smoothness with no per-sprite overhead
- **Key pitfall**: `ctx.translate(-0.5, -0.5)` may be needed since browsers treat integer coords as pixel centers

### Priority: **HIGH**
Smooth camera movement alone is a massive visual upgrade for almost no code. Sub-pixel idle animations add polish that players feel subconsciously. Very high impact, very low effort.

### Sources
- [2D Will Never Die: Sub-pixel animation tutorial](https://2dwillneverdie.com/tutorial/give-your-sprites-depth-with-sub-pixel-animation/)
- [MDN: imageSmoothingEnabled](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/imageSmoothingEnabled)
- [MDN: Crisp pixel art look](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)
- [Casual Effects: Pixel Art Tech Tips](http://casual-effects.blogspot.com/2016/03/pixel-art-tech-tips.html)

---

## 2. Sprite Stacking (Fake 3D)

### What It Does Visually
Sprite stacking layers multiple 2D horizontal cross-section slices of an object vertically with small pixel offsets, creating the illusion of 3D volume. Objects appear to have height and depth. When rotated, the effect is striking — a flat 2D sprite suddenly looks like a voxel model. Used famously in games like NIUM and Magicavoxel-based projects.

### How to Implement in Canvas 2D

```javascript
// A sprite stack is an array of image slices (bottom to top)
// Each slice is a horizontal cross-section of the 3D object
class SpriteStack {
    constructor(slices, layerHeight = 1) {
        this.slices = slices; // Array of Image/Canvas objects
        this.layerHeight = layerHeight; // pixels between layers
    }

    draw(ctx, x, y, rotation = 0) {
        ctx.save();
        ctx.translate(x, y);

        for (let i = 0; i < this.slices.length; i++) {
            ctx.save();

            // Each layer is offset upward
            const offsetY = -i * this.layerHeight;

            // Optional rotation for fake 3D spin
            if (rotation !== 0) {
                ctx.rotate(rotation);
            }

            ctx.drawImage(
                this.slices[i],
                -this.slices[i].width / 2,
                -this.slices[i].height / 2 + offsetY
            );

            ctx.restore();
        }

        ctx.restore();
    }
}

// Loading from a single vertical sprite sheet
function loadSpriteStack(spriteSheet, sliceWidth, sliceHeight, numSlices) {
    const slices = [];
    for (let i = 0; i < numSlices; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = sliceWidth;
        canvas.height = sliceHeight;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(spriteSheet,
            0, i * sliceHeight, sliceWidth, sliceHeight,
            0, 0, sliceWidth, sliceHeight
        );
        slices.push(canvas);
    }
    return new SpriteStack(slices);
}

// For pre-rendered rotation: render all angles at load time
function prerenderRotations(stack, numAngles = 16) {
    const frames = [];
    for (let a = 0; a < numAngles; a++) {
        const angle = (a / numAngles) * Math.PI * 2;
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64 + stack.slices.length * stack.layerHeight;
        const ctx = canvas.getContext('2d');
        stack.draw(ctx, canvas.width / 2, canvas.height - 16, angle);
        frames.push(canvas);
    }
    return frames;
}
```

### Performance Considerations
- Each stacked object draws N layers (typically 8-16 slices), so 50 objects = 400-800 draw calls
- **Pre-render rotated views** at load time to reduce to 1 draw call per object at runtime
- Without pre-rendering, limit to key objects (treasure chests, pillars, boss enemies)
- Modern CPUs can handle thousands of stacked sprites without FPS drops
- Use `SpriteStack.io` tool to create the slice art from voxel models

### Priority: **LOW**
Visually impressive but requires new art assets (slice sheets) and the top-down perspective of a dungeon crawler limits the dramatic rotation effect. Better suited for overworld or specific boss encounters. Consider for treasure chests, altars, or boss pedestals only.

### Sources
- [Creative Bloq: Sprite stacking technique](https://www.creativebloq.com/3d/video-game-design/this-technique-for-making-2d-pixel-art-look-3d-is-blowing-peoples-minds)
- [80.lv: How to make 2D look 3D with sprite stacking](https://80.lv/articles/developer-shows-how-to-make-2d-game-look-3d-with-sprite-stacking)
- [SpriteStack.io: Voxel-to-slice editor](https://spritestack.io/)
- [dev_dwarf: Intermediate guide to sprite stacking](https://medium.com/@dev_dwarf/intermediate-guide-to-sprite-stacking-using-gamemaker-studio-2-26f1e9101371)

---

## 3. Palette Cycling / Color Rotation

### What It Does Visually
Palette cycling creates the illusion of animation without changing any pixels — instead, the color palette itself is rotated. This creates mesmerizing effects: flowing water, bubbling lava, glowing runes, shimmering metals, pulsing magic auras, and flickering torchlight. Mark Ferrari pioneered incredible environmental effects (rain, waterfalls, ocean waves, clouds) using nothing but palette shifts on single flat images.

### How to Implement in Canvas 2D

**Approach A: ImageData pixel manipulation (classic method)**
```javascript
class PaletteCycler {
    constructor(imageData, palette, cycles) {
        this.originalPixels = new Uint8ClampedArray(imageData.data);
        this.imageData = imageData;
        this.palette = palette; // Array of {r, g, b} objects (256 entries)
        this.cycles = cycles;  // Array of {start, end, speed, direction}
    }

    // Map each pixel to its palette index (do once at init)
    buildIndexMap() {
        this.indexMap = new Uint8Array(this.originalPixels.length / 4);
        for (let i = 0; i < this.indexMap.length; i++) {
            const r = this.originalPixels[i * 4];
            const g = this.originalPixels[i * 4 + 1];
            const b = this.originalPixels[i * 4 + 2];
            this.indexMap[i] = this.findPaletteIndex(r, g, b);
        }
    }

    update(time) {
        // Rotate palette entries for each cycle
        const currentPalette = [...this.palette];
        for (const cycle of this.cycles) {
            const range = cycle.end - cycle.start + 1;
            const shift = Math.floor(time * cycle.speed) % range;
            for (let i = 0; i < range; i++) {
                const srcIdx = cycle.start + ((i + shift * cycle.direction) % range);
                currentPalette[cycle.start + i] = this.palette[srcIdx];
            }
        }

        // Remap pixels using shifted palette
        const data = this.imageData.data;
        for (let i = 0; i < this.indexMap.length; i++) {
            const color = currentPalette[this.indexMap[i]];
            data[i * 4] = color.r;
            data[i * 4 + 1] = color.g;
            data[i * 4 + 2] = color.b;
        }
    }
}
```

**Approach B: Shader-like tinting for specific color ranges**
```javascript
// Simpler approach: identify "magic colors" in sprites and cycle them
function cycleMagicColors(ctx, width, height, time) {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const r = data[i], g = data[i+1], b = data[i+2];

        // Detect "lava" colors (bright reds/oranges in a specific range)
        if (r > 200 && g > 50 && g < 150 && b < 50) {
            const shift = Math.sin(time * 3 + i * 0.001) * 30;
            data[i] = Math.min(255, r + shift);
            data[i+1] = Math.max(0, g + shift * 0.5);
        }

        // Detect "water" colors (blues in a specific range)
        if (b > 150 && r < 80 && g < 120) {
            const shift = Math.sin(time * 2 + i * 0.002) * 20;
            data[i+2] = Math.min(255, b + shift);
            data[i+1] = Math.max(0, g + shift * 0.3);
        }

        // Detect "rune glow" (specific purple/cyan accent colors)
        if (r > 100 && b > 200 && g < 80) {
            const pulse = (Math.sin(time * 4) + 1) * 0.5;
            data[i] = Math.floor(r * (0.7 + 0.3 * pulse));
            data[i+2] = Math.floor(b * (0.7 + 0.3 * pulse));
        }
    }

    ctx.putImageData(imageData, 0, 0);
}
```

**Approach C: Pre-rendered palette-cycled tiles**
```javascript
// At load time, generate N frames of each cycling tile
function generateCycledTileFrames(tileCanvas, numFrames, cycleColors) {
    const frames = [];
    for (let f = 0; f < numFrames; f++) {
        const frame = document.createElement('canvas');
        frame.width = tileCanvas.width;
        frame.height = tileCanvas.height;
        const fCtx = frame.getContext('2d');
        fCtx.drawImage(tileCanvas, 0, 0);

        const imageData = fCtx.getImageData(0, 0, frame.width, frame.height);
        // Shift cycleColors by f positions
        const shifted = cycleColors.map((_, i, arr) =>
            arr[(i + f) % arr.length]
        );
        // Replace matching pixels
        remapColors(imageData, cycleColors, shifted);
        fCtx.putImageData(imageData, 0, 0);
        frames.push(frame);
    }
    return frames; // Animate by cycling through frames
}
```

### Performance Considerations
- **Full-screen ImageData manipulation**: Expensive at large resolutions. Keep game canvas at native pixel-art res (320x180 or similar)
- **Pre-rendered frames** (Approach C): Best performance — zero runtime cost, just swap tile index. Memory cost is N frames per cycling tile
- **Selective cycling** on small areas (water tiles, lava tiles, rune overlays) is much cheaper than full-screen
- Target 8-16 cycle frames at 100-200ms intervals for smooth-looking flow
- The original canvascycle demo runs full 8-bit cycling at 60fps in canvas, proving viability

### Priority: **HIGH**
Palette cycling is one of the highest visual-impact, lowest-effort techniques available. Flowing water, glowing runes, pulsing magic portals, and shimmering lava can all be achieved with pre-rendered cycle frames for specific tiles. The dungeon setting has perfect use cases: torch flames, magic circles, water pools, lava pits, enchanted weapons.

### Sources
- [EffectGames: Old School Color Cycling with HTML5](http://www.effectgames.com/effect/article-Old_School_Color_Cycling_with_HTML5.html)
- [jhuckaby/canvascycle: HTML5 Canvas palette cycling](https://github.com/jhuckaby/canvascycle)
- [Canvas Cycle Live Demo](http://www.effectgames.com/demos/canvascycle/)
- [Stephen Schroeder: Color Cycling in Pixel Art](https://blog.prototypr.io/color-cycling-in-pixel-art-c8f20e61b4c4)
- [Wikipedia: Color cycling](https://en.wikipedia.org/wiki/Color_cycling)

---

## 4. Particle Sprite Sheets

### What It Does Visually
Instead of rendering particles as plain colored rectangles or circles, use tiny pixel-art sprite frames. This makes fire look like actual flames, smoke like wisps, magic like sparkles, and blood like droplets. The visual coherence with the rest of the pixel art style is dramatically improved.

### How to Implement in Canvas 2D

```javascript
class SpriteParticle {
    constructor(x, y, spriteSheet, config) {
        this.x = x;
        this.y = y;
        this.vx = config.vx || 0;
        this.vy = config.vy || 0;
        this.life = config.life || 1.0;
        this.decay = config.decay || 0.02;
        this.spriteSheet = spriteSheet;
        this.frameWidth = config.frameWidth || 8;
        this.frameHeight = config.frameHeight || 8;
        this.totalFrames = config.totalFrames || 4;
        this.frame = 0;
        this.animSpeed = config.animSpeed || 0.15;
        this.animTimer = 0;
        this.gravity = config.gravity || 0;
        this.rotation = config.rotation || 0;
        this.rotSpeed = config.rotSpeed || 0;
        this.scale = config.scale || 1;
    }

    update(dt) {
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        this.vy += this.gravity * dt;
        this.life -= this.decay * dt;
        this.rotation += this.rotSpeed * dt;

        // Animate through sprite frames
        this.animTimer += dt;
        if (this.animTimer >= this.animSpeed) {
            this.animTimer = 0;
            this.frame = (this.frame + 1) % this.totalFrames;
        }
    }

    draw(ctx) {
        if (this.life <= 0) return;

        ctx.save();
        ctx.globalAlpha = Math.min(1, this.life);
        ctx.translate(Math.round(this.x), Math.round(this.y));

        if (this.rotation !== 0) {
            ctx.rotate(this.rotation);
        }
        if (this.scale !== 1) {
            ctx.scale(this.scale, this.scale);
        }

        ctx.drawImage(
            this.spriteSheet,
            this.frame * this.frameWidth, 0,
            this.frameWidth, this.frameHeight,
            -this.frameWidth / 2, -this.frameHeight / 2,
            this.frameWidth, this.frameHeight
        );

        ctx.restore();
    }
}

// Particle effect presets
const PARTICLE_PRESETS = {
    fire: {
        frameWidth: 8, frameHeight: 8, totalFrames: 4,
        vx: () => (Math.random() - 0.5) * 20,
        vy: () => -30 - Math.random() * 20,
        life: 0.8, decay: 1.0, gravity: -10,
        animSpeed: 0.08
    },
    blood: {
        frameWidth: 4, frameHeight: 4, totalFrames: 3,
        vx: () => (Math.random() - 0.5) * 80,
        vy: () => -40 - Math.random() * 30,
        life: 0.6, decay: 0.8, gravity: 200,
        animSpeed: 0.1
    },
    magic: {
        frameWidth: 6, frameHeight: 6, totalFrames: 6,
        vx: () => (Math.random() - 0.5) * 40,
        vy: () => (Math.random() - 0.5) * 40,
        life: 1.0, decay: 0.5, gravity: 0,
        animSpeed: 0.06, rotSpeed: () => (Math.random() - 0.5) * 4
    }
};
```

### Particle Sprite Sheet Sources (Free)
- **OpenGameArt Particle Pack**: 80+ sprites (fire, smoke, magic, sparks, electricity) — https://opengameart.org/content/particle-pack-80-sprites
- **itch.io pixel particles**: Multiple free packs tagged "particles" + "pixel-art"
- **Pixel FX Designer**: Tool to design pixel-art particle effects and export as sprite sheets — https://codemanu.itch.io/particle-fx-designer

### Performance Considerations
- Sprite particles are slightly more expensive than rectangle particles due to drawImage overhead vs fillRect
- Keep particle sprites small (4x4 to 8x8 pixels) and pool aggressively
- Object pooling eliminates GC pressure: pre-allocate 500-1000 particles, reuse dead ones
- At native resolution (320x180), even 500 sprite particles render well under 2ms
- Batch particles by sprite sheet to minimize texture switches

### Priority: **HIGH**
This is a direct upgrade to existing particle systems with dramatic visual improvement. Replacing rectangles with tiny pixel-art sprites immediately makes effects look "designed" rather than "programmed." Minimal code change (just swap fillRect for drawImage in particle renderer), huge visual payoff.

### Sources
- [OpenGameArt: Particle Pack 80+ sprites](https://opengameart.org/content/particle-pack-80-sprites)
- [Pixel FX Designer](https://codemanu.itch.io/particle-fx-designer)
- [itch.io: Pixel art particle assets](https://itch.io/game-assets/tag-particles/tag-pixel-art)
- [nintervik: 2D Particle System](https://nintervik.github.io/2D-Particle-System/)

---

## 5. Dynamic 2D Shadows

### What It Does Visually
Real-time shadow casting creates visibility polygons from light sources, darkening areas occluded by walls and obstacles. Torches cast warm pools of light with sharp shadow edges. Players moving through corridors see shadows sweep dramatically as light sources shift. This transforms flat dungeon floors into atmospheric, moody environments.

### How to Implement in Canvas 2D

**Algorithm: Ray casting to wall endpoints (Nicky Case / Red Blob Games method)**

```javascript
class ShadowCaster {
    constructor() {
        this.segments = []; // Wall segments: [{ax, ay, bx, by}, ...]
    }

    // Add wall segments from tilemap
    addWallSegments(tilemap) {
        // Extract edge segments from solid tiles
        // Merge collinear segments for performance
        for (let y = 0; y < tilemap.height; y++) {
            for (let x = 0; x < tilemap.width; x++) {
                if (tilemap.isSolid(x, y)) {
                    // Add edges that border non-solid tiles
                    if (!tilemap.isSolid(x, y - 1))
                        this.segments.push({ax: x*16, ay: y*16, bx: (x+1)*16, by: y*16});
                    if (!tilemap.isSolid(x, y + 1))
                        this.segments.push({ax: x*16, ay: (y+1)*16, bx: (x+1)*16, by: (y+1)*16});
                    if (!tilemap.isSolid(x - 1, y))
                        this.segments.push({ax: x*16, ay: y*16, bx: x*16, by: (y+1)*16});
                    if (!tilemap.isSolid(x + 1, y))
                        this.segments.push({ax: (x+1)*16, ay: y*16, bx: (x+1)*16, by: (y+1)*16});
                }
            }
        }
    }

    // Cast ray, find closest intersection
    castRay(ox, oy, angle) {
        const dx = Math.cos(angle);
        const dy = Math.sin(angle);
        let closestT = Infinity;
        let closestPoint = null;

        for (const seg of this.segments) {
            const sdx = seg.bx - seg.ax;
            const sdy = seg.by - seg.ay;
            const denom = sdx * dy - sdy * dx;
            if (Math.abs(denom) < 0.0001) continue;

            const t2 = (dx * (seg.ay - oy) + dy * (ox - seg.ax)) / denom;
            if (t2 < 0 || t2 > 1) continue;

            const t1 = (seg.ax + sdx * t2 - ox) / dx;
            if (t1 > 0 && t1 < closestT) {
                closestT = t1;
                closestPoint = {
                    x: ox + dx * t1,
                    y: oy + dy * t1
                };
            }
        }
        return closestPoint;
    }

    // Generate visibility polygon
    getVisibilityPolygon(ox, oy, maxRadius) {
        // Collect unique angles to all segment endpoints
        const angles = new Set();
        for (const seg of this.segments) {
            for (const [px, py] of [[seg.ax, seg.ay], [seg.bx, seg.by]]) {
                const angle = Math.atan2(py - oy, px - ox);
                // Cast 3 rays per endpoint: direct, +epsilon, -epsilon
                angles.add(angle - 0.0001);
                angles.add(angle);
                angles.add(angle + 0.0001);
            }
        }

        // Sort angles and cast rays
        const sortedAngles = [...angles].sort((a, b) => a - b);
        const points = [];
        for (const angle of sortedAngles) {
            const hit = this.castRay(ox, oy, angle);
            if (hit) {
                const dist = Math.hypot(hit.x - ox, hit.y - oy);
                if (dist <= maxRadius) {
                    points.push(hit);
                } else {
                    points.push({
                        x: ox + Math.cos(angle) * maxRadius,
                        y: oy + Math.sin(angle) * maxRadius
                    });
                }
            }
        }
        return points;
    }

    // Render light with soft falloff
    renderLight(ctx, ox, oy, radius, color = 'rgba(255,200,100,') {
        const polygon = this.getVisibilityPolygon(ox, oy, radius);
        if (polygon.length < 3) return;

        // Draw to offscreen canvas for compositing
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(polygon[0].x, polygon[0].y);
        for (let i = 1; i < polygon.length; i++) {
            ctx.lineTo(polygon[i].x, polygon[i].y);
        }
        ctx.closePath();

        // Radial gradient for soft falloff
        const gradient = ctx.createRadialGradient(ox, oy, 0, ox, oy, radius);
        gradient.addColorStop(0, color + '0.8)');
        gradient.addColorStop(0.5, color + '0.4)');
        gradient.addColorStop(1, color + '0.0)');
        ctx.fillStyle = gradient;
        ctx.fill();
        ctx.restore();
    }
}

// Compositing: render all lights to a separate canvas, then multiply
function renderLighting(displayCtx, lightCanvas, lights, shadowCaster) {
    const lctx = lightCanvas.getContext('2d');

    // Start with darkness
    lctx.fillStyle = 'rgba(0,0,0,0.85)';
    lctx.fillRect(0, 0, lightCanvas.width, lightCanvas.height);

    // Add each light with 'lighter' blending
    lctx.globalCompositeOperation = 'lighter';
    for (const light of lights) {
        shadowCaster.renderLight(lctx, light.x, light.y, light.radius, light.color);
    }
    lctx.globalCompositeOperation = 'source-over';

    // Multiply lighting onto the scene
    displayCtx.globalCompositeOperation = 'multiply';
    displayCtx.drawImage(lightCanvas, 0, 0);
    displayCtx.globalCompositeOperation = 'source-over';
}
```

### Performance Considerations
- Ray casting to all segments is O(rays * segments). Optimize with spatial hashing / grid lookup
- Only recompute visibility when light source or nearby walls change
- Cache visibility polygons for static lights (torches on walls)
- Limit active dynamic lights to 3-5 (player torch + nearby enemies/effects)
- At 320x180 native resolution, even unoptimized raycasting runs fine with ~200 segments
- **Biggest optimization**: only process wall segments within light radius (spatial partitioning)

### Priority: **HIGH**
Dynamic shadows are arguably the single highest-impact visual upgrade for a dungeon game. The interplay of light and shadow defines the atmosphere of a dungeon crawler. Combined with existing torch ember particles, this creates truly immersive environments. The Nicky Case / Red Blob Games algorithm is well-proven and has multiple JavaScript reference implementations.

### Sources
- [Nicky Case: SIGHT & LIGHT](https://ncase.me/sight-and-light/)
- [Red Blob Games: 2D Visibility](https://www.redblobgames.com/articles/visibility/)
- [Illuminated.js: 2D lights and shadows for HTML5](https://greweb.me/2012/05/illuminated-js-2d-lights-and-shadows-rendering-engine-for-html5-applications)
- [Albert Ford: Recursive shadowcasting](https://www.albertford.com/shadowcasting/)
- [RogueBasin: Field of Vision algorithms](https://www.roguebasin.com/index.php?title=Field_of_Vision)

---

## 6. Screen-Space Effects

### What It Does Visually
Full-screen post-processing effects that overlay the rendered scene: rain streaking down, fog rolling across floors, heat shimmer rising from lava, underwater distortion when submerged. These effects exist in "screen space" — they modify pixels after the scene is drawn, adding atmosphere without modifying individual sprites.

### How to Implement in Canvas 2D

**Rain Effect**
```javascript
class RainEffect {
    constructor(width, height, density = 100) {
        this.drops = [];
        for (let i = 0; i < density; i++) {
            this.drops.push({
                x: Math.random() * width,
                y: Math.random() * height,
                length: 4 + Math.random() * 8,
                speed: 200 + Math.random() * 300,
                opacity: 0.1 + Math.random() * 0.3
            });
        }
        this.width = width;
        this.height = height;
    }

    update(dt) {
        for (const drop of this.drops) {
            drop.y += drop.speed * dt;
            drop.x += drop.speed * 0.1 * dt; // slight wind
            if (drop.y > this.height) {
                drop.y = -drop.length;
                drop.x = Math.random() * this.width;
            }
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.strokeStyle = 'rgba(180,200,255,0.4)';
        ctx.lineWidth = 1;
        for (const drop of this.drops) {
            ctx.globalAlpha = drop.opacity;
            ctx.beginPath();
            ctx.moveTo(Math.round(drop.x), Math.round(drop.y));
            ctx.lineTo(
                Math.round(drop.x + drop.length * 0.1),
                Math.round(drop.y + drop.length)
            );
            ctx.stroke();
        }
        ctx.restore();
    }
}
```

**Fog Layer (Scrolling noise texture)**
```javascript
class FogLayer {
    constructor(width, height) {
        // Pre-render a tileable noise texture
        this.fogCanvas = document.createElement('canvas');
        this.fogCanvas.width = width * 2;
        this.fogCanvas.height = height * 2;
        this.generateNoise();
        this.scrollX = 0;
        this.scrollY = 0;
    }

    generateNoise() {
        const ctx = this.fogCanvas.getContext('2d');
        const imageData = ctx.createImageData(this.fogCanvas.width, this.fogCanvas.height);
        const data = imageData.data;

        // Simple value noise
        for (let i = 0; i < data.length; i += 4) {
            const val = Math.floor(Math.random() * 40); // subtle
            data[i] = 255;
            data[i+1] = 255;
            data[i+2] = 255;
            data[i+3] = val;
        }
        ctx.putImageData(imageData, 0, 0);

        // Blur it for softness (draw at half size, then back)
        const temp = document.createElement('canvas');
        temp.width = this.fogCanvas.width / 4;
        temp.height = this.fogCanvas.height / 4;
        const tctx = temp.getContext('2d');
        tctx.drawImage(this.fogCanvas, 0, 0, temp.width, temp.height);
        ctx.clearRect(0, 0, this.fogCanvas.width, this.fogCanvas.height);
        ctx.imageSmoothingEnabled = true;
        ctx.drawImage(temp, 0, 0, this.fogCanvas.width, this.fogCanvas.height);
    }

    update(dt) {
        this.scrollX += 8 * dt; // slow drift
        this.scrollY += 3 * dt;
    }

    draw(ctx, viewWidth, viewHeight) {
        ctx.save();
        ctx.globalCompositeOperation = 'screen';
        ctx.globalAlpha = 0.3;
        const sx = this.scrollX % this.fogCanvas.width;
        const sy = this.scrollY % this.fogCanvas.height;
        // Tile the fog
        ctx.drawImage(this.fogCanvas, -sx, -sy);
        ctx.drawImage(this.fogCanvas, -sx + this.fogCanvas.width, -sy);
        ctx.drawImage(this.fogCanvas, -sx, -sy + this.fogCanvas.height);
        ctx.restore();
    }
}
```

**Heat Distortion (pixel displacement)**
```javascript
function applyHeatDistortion(ctx, x, y, width, height, time, intensity = 2) {
    // Read the region to distort
    const imageData = ctx.getImageData(x, y, width, height);
    const copy = new Uint8ClampedArray(imageData.data);
    const data = imageData.data;

    for (let py = 0; py < height; py++) {
        // Horizontal displacement based on sine wave
        const offset = Math.sin(py * 0.3 + time * 5) * intensity;
        const intOffset = Math.round(offset);

        for (let px = 0; px < width; px++) {
            const srcX = Math.max(0, Math.min(width - 1, px + intOffset));
            const dstIdx = (py * width + px) * 4;
            const srcIdx = (py * width + srcX) * 4;
            data[dstIdx] = copy[srcIdx];
            data[dstIdx+1] = copy[srcIdx+1];
            data[dstIdx+2] = copy[srcIdx+2];
        }
    }

    ctx.putImageData(imageData, x, y);
}
```

### Performance Considerations
- Rain: very cheap, just line draws (100 drops < 0.5ms)
- Fog: single drawImage per layer, extremely cheap if pre-rendered
- Heat distortion: getImageData/putImageData is expensive — limit to small regions (above lava tiles only)
- **Key optimization**: render effects to the small game canvas (320x180), not the upscaled display
- Layer multiple effects using composite operations instead of pixel manipulation when possible
- Pre-render fog textures once at load time

### Priority: **MEDIUM-HIGH**
Rain and fog are high-impact and trivially cheap. Heat distortion is situational but extremely cool over lava. These effects layer on top of existing rendering with minimal integration effort. Fog especially enhances dungeon atmosphere enormously.

### Sources
- [Codrops: Rain & Water Effect Experiments](https://tympanus.net/codrops/2015/11/04/rain-water-effect-experiments/)
- [ariya.io: Underwater effect with HTML5 Canvas](https://ariya.io/2012/03/underwater-effect-with-html5-canvas)
- [Codrops: Animated Heat Distortion Effects](https://tympanus.net/codrops/2016/05/03/animated-heat-distortion-effects-webgl/)
- [Daniel Ilett: Underwater sinking effect](https://danielilett.com/2019-10-22-tut3-2-sinking-feeling/)

---

## 7. Sprite Decomposition

### What It Does Visually
Instead of animating a character as a single sprite, break it into separate parts: head, torso, arms, legs, weapon, shield, cape, etc. Each part can be independently positioned, rotated, and scaled. This enables procedural animation (weapons swinging on arcs, capes flowing with physics, heads turning to look at threats), equipment visualization (swapping weapon sprites), and death animations (body parts flying apart).

### How to Implement in Canvas 2D

```javascript
class CompositeSprite {
    constructor() {
        this.parts = []; // Ordered bottom-to-top for draw order
    }

    addPart(name, sprite, config) {
        this.parts.push({
            name,
            sprite,             // Image or Canvas
            anchorX: config.anchorX || 0, // pivot point relative to part
            anchorY: config.anchorY || 0,
            offsetX: config.offsetX || 0, // offset from entity origin
            offsetY: config.offsetY || 0,
            rotation: 0,
            scaleX: 1,
            scaleY: 1,
            visible: true
        });
    }

    getPart(name) {
        return this.parts.find(p => p.name === name);
    }

    draw(ctx, x, y, flipX = false) {
        ctx.save();
        ctx.translate(Math.round(x), Math.round(y));
        if (flipX) ctx.scale(-1, 1);

        for (const part of this.parts) {
            if (!part.visible) continue;

            ctx.save();
            ctx.translate(part.offsetX, part.offsetY);
            ctx.rotate(part.rotation);
            ctx.scale(part.scaleX, part.scaleY);
            ctx.drawImage(
                part.sprite,
                -part.anchorX,
                -part.anchorY
            );
            ctx.restore();
        }

        ctx.restore();
    }
}

// Procedural weapon swing animation
function animateWeaponSwing(weaponPart, progress) {
    // progress: 0.0 to 1.0
    // Anticipation (0-0.2): wind up
    // Strike (0.2-0.5): fast swing
    // Follow-through (0.5-1.0): recovery

    let angle;
    if (progress < 0.2) {
        // Wind up: rotate backward
        angle = lerp(0, -0.8, progress / 0.2);
    } else if (progress < 0.5) {
        // Strike: fast forward swing
        const t = (progress - 0.2) / 0.3;
        angle = lerp(-0.8, 2.0, easeOutQuad(t));
    } else {
        // Recovery: slow return
        const t = (progress - 0.5) / 0.5;
        angle = lerp(2.0, 0, easeInOutQuad(t));
    }
    weaponPart.rotation = angle;
}

// Simple cape physics
function updateCape(capePart, entityVelocityX, dt) {
    const targetRotation = -entityVelocityX * 0.02; // flow opposite to movement
    capePart.rotation += (targetRotation - capePart.rotation) * 3 * dt;
}

// Death explosion — scatter parts
function explodeParts(composite, centerX, centerY) {
    for (const part of composite.parts) {
        part.velX = (Math.random() - 0.5) * 200;
        part.velY = -100 - Math.random() * 150;
        part.rotVel = (Math.random() - 0.5) * 10;
        part.gravity = 400;
    }
}
```

### Art Pipeline
The existing DungeonTileset II sprites would need to be decomposed into parts:
1. Extract weapon sprites separately (swords, axes, staffs)
2. Create overlay sprites for armor/equipment slots
3. Keep the base body animation as-is; layer equipment on top
4. This can be done incrementally — start with just weapon separation

### Performance Considerations
- Each composite entity draws 3-8 sprites instead of 1 — moderate overhead
- For crowds, use pre-rendered composites (bake common combinations into sprite sheets)
- Canvas save/restore + translate/rotate per part adds up — batch similar entities
- Only decompose player + bosses; regular enemies stay as single sprites
- 10-20 composite entities on screen is very manageable

### Priority: **MEDIUM**
High visual payoff for the player character (visible equipment, procedural weapon swings, death effects), but requires new art assets and significant refactoring of the entity rendering pipeline. Best implemented incrementally: start with weapon separation for the player, expand later.

### Sources
- [Rain World Procedural Animation Recreation](https://medium.com/@merxon22/recreating-rainworlds-2d-procedural-animation-part-1-4d882f947e9f)
- [derlin.ch: Revolutionized 2D pixel animation](https://blog.derlin.ch/this-guy-may-just-have-revolutionized-2d-pixel-animation)

---

## 8. Advanced Dithering in Real-Time

### What It Does Visually
Dithering creates the illusion of gradients and transparency using only binary (on/off) pixel patterns. In a pixel art game, this can be used for: fog of war that dissolves at edges with a retro pattern, stealth/invisibility that makes characters appear to phase in/out, smooth transitions between lit and dark areas, and distance fog that gives depth. The retro-aesthetic dithering is immediately recognizable and stylish.

### How to Implement in Canvas 2D

**Bayer Matrix Dithering (ordered dithering)**
```javascript
// 4x4 Bayer matrix (threshold values 0-15, normalized to 0-1)
const BAYER_4x4 = [
    [ 0/16,  8/16,  2/16, 10/16],
    [12/16,  4/16, 14/16,  6/16],
    [ 3/16, 11/16,  1/16,  9/16],
    [15/16,  7/16, 13/16,  5/16]
];

// Apply dithered transparency to a region
function ditherFogOfWar(ctx, fogMap, tileSize, cameraX, cameraY) {
    // fogMap[y][x] = 0.0 (fully visible) to 1.0 (fully hidden)
    const imageData = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    const data = imageData.data;
    const w = ctx.canvas.width;

    for (let py = 0; py < ctx.canvas.height; py++) {
        for (let px = 0; px < w; px++) {
            // Get fog value for this pixel's tile
            const tileX = Math.floor((px + cameraX) / tileSize);
            const tileY = Math.floor((py + cameraY) / tileSize);
            const fog = fogMap[tileY]?.[tileX] ?? 1.0;

            if (fog <= 0) continue; // Fully visible

            // Bayer threshold test
            const threshold = BAYER_4x4[py % 4][px % 4];

            if (fog > threshold) {
                // Darken this pixel
                const idx = (py * w + px) * 4;
                data[idx] = Math.floor(data[idx] * 0.15);     // R
                data[idx+1] = Math.floor(data[idx+1] * 0.15); // G
                data[idx+2] = Math.floor(data[idx+2] * 0.2);  // B (slightly blue)
            }
        }
    }
    ctx.putImageData(imageData, 0, 0);
}
```

**Dithered Stealth/Invisibility Effect**
```javascript
function ditherEntity(ctx, entityCanvas, x, y, visibility) {
    // visibility: 0.0 (invisible) to 1.0 (fully visible)
    const imgData = entityCanvas.getContext('2d')
        .getImageData(0, 0, entityCanvas.width, entityCanvas.height);
    const data = imgData.data;

    for (let py = 0; py < entityCanvas.height; py++) {
        for (let px = 0; px < entityCanvas.width; px++) {
            const idx = (py * entityCanvas.width + px) * 4;
            if (data[idx + 3] === 0) continue; // skip transparent

            const threshold = BAYER_4x4[py % 4][px % 4];
            if (visibility < threshold) {
                data[idx + 3] = 0; // make this pixel transparent
            }
        }
    }

    const temp = document.createElement('canvas');
    temp.width = entityCanvas.width;
    temp.height = entityCanvas.height;
    temp.getContext('2d').putImageData(imgData, 0, 0);
    ctx.drawImage(temp, Math.round(x), Math.round(y));
}
```

**Dithered Screen Transitions (wipe in/out)**
```javascript
function ditherTransition(ctx, progress, width, height) {
    // progress: 0.0 (clear) to 1.0 (fully black)
    ctx.fillStyle = '#000';

    // 8x8 Bayer for smoother transition
    const BAYER_8x8 = generateBayer(8); // pre-computed

    for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
            const threshold = BAYER_8x8[py % 8][px % 8];
            if (progress > threshold) {
                ctx.fillRect(px, py, 1, 1);
            }
        }
    }
}

// Optimization: pre-render dither patterns as images
function prerenderDitherMasks(width, height, steps = 16) {
    const masks = [];
    for (let i = 0; i <= steps; i++) {
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ditherTransition(ctx, i / steps, width, height);
        masks.push(canvas);
    }
    return masks;
}
```

### Performance Considerations
- Per-pixel ImageData manipulation is expensive at high resolutions — **always work at native pixel-art resolution**
- Pre-render dither masks at load time (16 levels = 16 small canvases) for instant screen transitions
- Fog of war dithering can be done once per tile change, cached until map updates
- Stealth dithering on individual entities (small sprites) is very cheap
- For the 320x180 game canvas, even real-time full-screen dithering runs at 60fps

### Priority: **MEDIUM-HIGH**
Dithered fog of war and screen transitions are both high-impact and very "pixel art authentic." Stealth/invisibility dithering is a gameplay feature enabler. The retro aesthetic perfectly matches the dungeon tileset style. Pre-rendered dither masks make all of these essentially free at runtime.

### Sources
- [Codrops: Real-Time ASCII and Dithering Effects with WebGL](https://tympanus.net/codrops/2026/01/04/efecto-building-real-time-ascii-and-dithering-effects-with-webgl-shaders/)
- [Giant Bomb: Dithering concept](https://www.giantbomb.com/dithering/3015-8564/)
- [OpenGameArt: Chapter 7 — Textures and Dithering](https://opengameart.org/content/chapter-7-textures-and-dithering)
- [Offscreen Canvas: GLSL Dithering](https://offscreencanvas.com/issues/glsl-dithering/)

---

## 9. Juice Techniques (Beyond Current)

### What the Game Already Has
Hit stop, squash/stretch, screen shake, chromatic aberration, bloom, vignette, screen flash, damage popups, afterimage trails.

### New Techniques to Add

**A. Anticipation Frames**
```javascript
// Before a heavy attack, pull back briefly
function anticipationTween(entity, attackDir, duration = 0.12) {
    return {
        update(t) {
            if (t < 0.3) {
                // Pull back (opposite of attack direction)
                const pullback = easeOutQuad(t / 0.3);
                entity.renderOffsetX = -attackDir.x * 3 * pullback;
                entity.renderOffsetY = -attackDir.y * 3 * pullback;
                entity.scaleX = 1.0 - 0.05 * pullback; // slight squish
            } else {
                // Snap forward
                const strike = easeOutQuad((t - 0.3) / 0.7);
                entity.renderOffsetX = attackDir.x * 6 * (1 - strike);
                entity.renderOffsetY = attackDir.y * 6 * (1 - strike);
                entity.scaleX = 1.0 + 0.1 * (1 - strike); // stretch
            }
        }
    };
}
```

**B. Overshoot / Elastic Easing**
```javascript
function easeOutElastic(t) {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 :
        Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
}

function easeOutBack(t) {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

// Use for: UI popups, damage numbers, pickup collection, level-up effects
// Damage number with overshoot
class DamageNumber {
    constructor(x, y, value) {
        this.x = x;
        this.y = y;
        this.value = value;
        this.life = 1.0;
        this.startY = y;
    }

    update(dt) {
        this.life -= dt * 1.5;
        const t = 1 - this.life;
        // Rise with elastic overshoot
        this.y = this.startY - 20 * easeOutBack(Math.min(t * 2, 1));
        // Scale pop
        this.scale = t < 0.15 ? easeOutElastic(t / 0.15) : 1.0;
    }
}
```

**C. Impact Freeze Frames (enhanced hit stop)**
```javascript
// Freeze the ATTACKER for 2 frames, then the VICTIM for 3 frames
// Different from uniform hit stop — creates a "one-two punch" feel
function impactFreeze(attacker, victim) {
    attacker.freezeFrames = 2;
    setTimeout(() => { victim.freezeFrames = 3; }, 33); // 2 frames later at 60fps

    // Flash the victim white for 1 frame
    victim.flashWhite = true;
    setTimeout(() => { victim.flashWhite = false; }, 50);

    // Knockback with deceleration
    victim.knockbackVel = normalize(sub(victim.pos, attacker.pos));
    victim.knockbackVel.x *= 120;
    victim.knockbackVel.y *= 120;
    victim.knockbackDecay = 0.85;
}
```

**D. Rhythm/Timing Variation**
```javascript
// Don't use uniform timings — vary based on impact strength
function getHitStopDuration(damage, isCritical) {
    const base = Math.min(damage * 0.01, 0.08); // 10-80ms based on damage
    const critMultiplier = isCritical ? 2.5 : 1.0;
    return base * critMultiplier;
}

function getShakeIntensity(damage, isCritical) {
    return {
        amplitude: Math.min(damage * 0.3, 8) * (isCritical ? 1.5 : 1.0),
        duration: 0.1 + damage * 0.005,
        frequency: isCritical ? 30 : 20 // faster shake for crits
    };
}
```

**E. Motion Smear (between-frame interpolation)**
```javascript
// Draw a stretched version of the sprite between previous and current position
function drawMotionSmear(ctx, sprite, prevX, prevY, currX, currY, alpha = 0.4) {
    const dx = currX - prevX;
    const dy = currY - prevY;
    const dist = Math.hypot(dx, dy);
    if (dist < 2) return; // No smear needed for slow movement

    ctx.save();
    ctx.globalAlpha = alpha;

    // Draw stretched sprite between positions
    const angle = Math.atan2(dy, dx);
    const midX = (prevX + currX) / 2;
    const midY = (prevY + currY) / 2;

    ctx.translate(midX, midY);
    ctx.rotate(angle);
    ctx.scale(dist / sprite.width, 0.7); // stretch along motion axis
    ctx.drawImage(sprite, -sprite.width/2, -sprite.height/2);

    ctx.restore();
}
```

**F. Additive Flash on Hit (white sprite overlay)**
```javascript
// Pre-render white silhouette of each sprite
function createWhiteSilhouette(sprite) {
    const canvas = document.createElement('canvas');
    canvas.width = sprite.width;
    canvas.height = sprite.height;
    const ctx = canvas.getContext('2d');
    ctx.drawImage(sprite, 0, 0);
    ctx.globalCompositeOperation = 'source-atop';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    return canvas;
}

// Flash effect: draw normal sprite then overlay white version
function drawWithFlash(ctx, entity, flashProgress) {
    ctx.drawImage(entity.sprite, entity.x, entity.y);
    if (flashProgress > 0) {
        ctx.save();
        ctx.globalAlpha = flashProgress;
        ctx.globalCompositeOperation = 'lighter';
        ctx.drawImage(entity.whiteSilhouette, entity.x, entity.y);
        ctx.restore();
    }
}
```

**G. Landing Dust / Step Puffs**
```javascript
// Spawn small dust particles when landing or turning sharply
function spawnLandingDust(x, y, particleSystem) {
    for (let i = 0; i < 5; i++) {
        particleSystem.emit({
            x: x + (Math.random() - 0.5) * 8,
            y: y,
            vx: (Math.random() - 0.5) * 30,
            vy: -5 - Math.random() * 15,
            life: 0.3 + Math.random() * 0.2,
            size: 2 + Math.random() * 2,
            color: 'rgba(180,170,160,',
            gravity: 0
        });
    }
}
```

### Performance Considerations
- All these are tiny per-entity calculations — negligible cost
- Pre-render white silhouettes at load time
- Motion smear adds 1 extra drawImage per fast-moving entity
- The biggest cost is cognitive: tuning timings until they "feel" right

### Priority: **HIGH**
These are the highest ROI changes in the entire list. They require no new art assets, no heavy algorithms, and no architectural changes. Just tweaking numbers and adding small behavioral code to existing systems. Anticipation + overshoot + impact freeze variation will make combat feel dramatically more satisfying.

### Sources
- [Blood Peace: The Art of Game Juice](https://blood-peace.com/the-art-of-game-juice-making-games-feel-juicy-and-satisfying/)
- [GameDev Academy: Game Feel Tutorial](https://gamedevacademy.org/game-feel-tutorial/)
- [GameAnalytics: Squeezing More Juice](https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design)
- [Blood Moon Interactive: Juice in Game Design](https://www.bloodmooninteractive.com/articles/juice.html)
- [The Inspired Animator: Adding Juice to Animations](https://medium.com/the-inspired-animator/adding-the-juice-to-animations-how-to-bring-life-and-delight-to-animations-3f6d5fdf3f27)

---

## 10. Visually Stunning Pixel Art Roguelikes

### Standout Games and Their Techniques

#### Dead Cells (Motion Twin)
- **3D models rendered as pixel art**: Characters are actually 3D models rendered into 2D sprite sheets. This gives impossibly smooth animations with perfect rotation, squash/stretch, and secondary motion
- **Aggressive use of motion blur and trails**: Every fast action has exaggerated motion trails, making combat feel blazingly fast
- **Layered parallax backgrounds**: Multiple depth layers scroll at different speeds, creating depth in a 2D sidescroller
- **Particle density**: Explosions of particles on every hit — sparks, blood, debris, light flashes
- **Color contrast**: Vibrant character colors against muted, atmospheric backgrounds
- **Key takeaway**: Volume of particles + animation smoothness + color contrast = perceived quality

#### Noita (Nolla Games)
- **Every pixel is physically simulated**: The entire world is a physics sandbox — fire spreads, water flows, explosions deform terrain, liquids mix
- **Emergent visual effects**: Visual spectacle comes from systems interacting, not hand-crafted animations
- **Falling sand simulation**: Materials (sand, water, oil, acid, lava, blood) all interact with realistic physics
- **Dynamic lighting**: Light interacts with the physically simulated world in real-time
- **Key takeaway**: Systemic simulation creates visual variety that hand-crafted content cannot match

#### Hades (Supergiant Games)
- **Hand-painted sprite art at high resolution**: Not traditional pixel art, but the quality bar is relevant
- **Isometric perspective with depth**: Characters cast real shadows, effects have depth layering
- **VFX layering**: Every ability has 3-4 layered effects (anticipation flash, projectile, impact, lingering particles)
- **Color-coded visual language**: Each god's boons have a distinct color palette, making effects instantly readable
- **Key takeaway**: Readability through color coding + layered VFX = both beautiful AND functional

#### Spelunky 2 (Mossmouth)
- **Fluid animation with exaggerated squash/stretch**: Characters feel rubbery and alive
- **Dynamic lighting from multiple sources**: Torches, lava, fireflies all contribute to atmosphere
- **Destructible terrain with particle effects**: Breaking blocks showers debris particles
- **Key takeaway**: Responsive animation + interactive environment = high game feel

#### Caves of Qud (Freehold Games)
- **Stylized minimal pixel art with rich UI**: Proves that atmosphere comes from consistency and mood, not just technical effects
- **Text and UI as visual identity**: The ASCII-influenced aesthetic IS the art style
- **Key takeaway**: A strong, consistent aesthetic identity matters more than technical complexity

### Common Patterns Across Successful Pixel Art Roguelikes

| Technique | Dead Cells | Noita | Hades | Spelunky 2 |
|-----------|:----------:|:-----:|:-----:|:----------:|
| Layered VFX | YES | YES | YES | YES |
| Dynamic lighting | YES | YES | YES | YES |
| Particle-heavy combat | YES | YES | YES | Moderate |
| Screen shake / hitstop | YES | Moderate | YES | YES |
| Color-coded effects | Moderate | Moderate | YES | Moderate |
| Destructible environment | No | YES | No | YES |
| Smooth animation | YES | N/A | YES | YES |
| Atmospheric post-processing | YES | YES | YES | Moderate |

### Priority: **N/A (Reference)**
This section is for inspiration rather than direct implementation. The key pattern is: **layer multiple simple effects** rather than relying on one complex technique. Every action should have anticipation, action, impact, and aftermath — each rendered with its own visual layer.

### Sources
- [Oreate AI: Deep Review of Dead Cells](https://www.oreateai.com/blog/deep-review-of-dead-cells-a-perfect-fusion-of-pixel-art-and-roguelike-gameplay/ff0cc824843151c28b5ebdf53db09aaa)
- [Noita on Steam](https://store.steampowered.com/app/881100/Noita/)
- [GamesRadar: Best Roguelikes 2026](https://www.gamesradar.com/best-roguelikes-roguelites/)

---

## Implementation Priority Summary

| # | Technique | Priority | Impact | Effort | Recommended Order |
|---|-----------|----------|--------|--------|-------------------|
| 9 | Advanced Juice Techniques | **HIGH** | Very High | Very Low | 1st — immediate wins |
| 1 | Sub-Pixel / Smooth Movement | **HIGH** | High | Low | 2nd — camera smoothing |
| 4 | Particle Sprite Sheets | **HIGH** | High | Low-Med | 3rd — upgrade existing particles |
| 3 | Palette Cycling | **HIGH** | High | Medium | 4th — animate environment tiles |
| 5 | Dynamic 2D Shadows | **HIGH** | Very High | Medium-High | 5th — biggest single atmosphere upgrade |
| 8 | Dithered Fog of War / Transitions | **MED-HIGH** | High | Medium | 6th — retro-authentic fog/transitions |
| 6 | Screen-Space Effects (Rain/Fog) | **MED-HIGH** | Medium-High | Low-Med | 7th — atmospheric layers |
| 7 | Sprite Decomposition | **MEDIUM** | Medium-High | High | 8th — player equipment rendering |
| 2 | Sprite Stacking | **LOW** | Medium | High | 9th — only for special objects |

### Quick Win Checklist (Can be done in a single session each)

- [ ] Add anticipation frames to player attacks
- [ ] Implement elastic/overshoot easing for damage numbers and UI popups
- [ ] Vary hit stop duration by damage amount
- [ ] Add motion smear to fast-moving projectiles
- [ ] White flash on hit (pre-render silhouettes)
- [ ] Landing dust puffs on player movement state changes
- [ ] Smooth camera with fractional offset (sub-pixel scrolling)
- [ ] Replace rectangle particles with 4x4 pixel sprites for fire/magic
- [ ] Add scrolling fog layer (pre-rendered noise texture)
- [ ] Add 8-frame palette cycling to water/lava tiles

---

*Research compiled from web sources, game development communities, and reference implementations. All code examples target vanilla Canvas 2D API with no external dependencies.*
