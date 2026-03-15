# Bright Visual Upgrade Research

**Project:** Depths of the Dark Keep
**Context:** Game now runs in FULL BRIGHTNESS (no darkness overlay). All imperfections visible.
**Researched:** 2026-03-14
**Overall Confidence:** MEDIUM-HIGH

---

## 1. Pixel Art Upscaling Tools

### Recommendation: Use hqx at build time, NOT runtime

**js-hqx** is a JavaScript port of the hqx pixel art scaling algorithm that works directly with Canvas.

```javascript
// Usage is dead simple
var scaledCanvas = hqx(originalImage, 3); // 2x, 3x, or 4x
```

- GitHub: https://github.com/phoboslab/js-hqx
- ~400kb uncompressed, ~27kb gzipped
- Supports alpha transparency
- Returns a new Canvas element with the scaled result
- **Confidence: HIGH** (verified, working JS implementation exists)

**Runtime vs Offline:**
- **Do NOT use at runtime.** hqx inspects a 5x5 pixel neighborhood for every output pixel. At 3x scale, that is significant per-frame cost.
- **Use as a build-time preprocessing step.** Scale all 16x16 sprites to 48x48 (3x) or 64x64 (4x) once, save the results, load pre-scaled sprites.
- Alternatively, since you already render at 3x via Canvas scaling with `imageSmoothingEnabled = false`, hqx would give you SMOOTHER edges than nearest-neighbor scaling. The sprites would look more refined at full brightness.

**xBRZ** is 40-60% faster than hqx and preserves finer details, but no ready-made JS port exists. Stick with hqx.

### AI Upscaling Tools (Offline, Free)

| Tool | Best For | Notes |
|------|----------|-------|
| **Upscayl** (desktop app) | Batch upscaling sprites offline | Open source, multiple AI models, preserves pixel art style |
| **Upscale.media** | Quick online upscaling | Free tier, has pixel art mode |
| **OpenArt Pixel Art Upscaler** | AI-enhanced upscaling | "Creative" vs "Precise" modes |

**Recommendation:** Use **Upscayl** (desktop, open source) for batch preprocessing all sprite sheets. It supports dedicated pixel art models that preserve the blocky aesthetic while adding sub-pixel detail.

### Depixelization (Vector Art from Pixel Art)

The Kopf-Lischinski "Depixelizing Pixel Art" algorithm converts pixel art to smooth SVG vectors. **Divisio Depixelizer** (https://divis.io/en/depixelizer/) implements this for free online.

**Verdict: Skip this.** Depixelized art loses the pixel art charm. It is better suited for logos or marketing materials, not in-game sprites. The game's identity IS pixel art.

---

## 2. Free Complementary Sprite Packs

### 0x72 DungeonTileset II Extension Packs

A curated collection exists: https://itch.io/c/3613378/0x72s-dungeontileset-and-extension-packs-from-others

| Pack | Author | What It Adds | Free? |
|------|--------|--------------|-------|
| **DungeonTileset II Extended** | nijikokun | More tiles, items, props | Yes |
| **16x16 Dungeon Autotile Remix** | safwyl | Autotile-format walls | Yes |
| **16x16 Dungeon Walls Reconfig** | s17 | Autotiles, wall decor, recoloring | Yes |
| **16x16 Fantasy RPG Characters** | Superdark | More character sprites, same style | Yes |
| **16x16 Enchanted Forest Characters** | Superdark | Forest-themed characters | Yes |
| **16x16 Dark Dungeon Tileset** | Zoltan Kosina | Darker dungeon variant | Yes |
| **Stairs Extension** | keymaster777 | Staircase tiles | Yes |

**Confidence: HIGH** (verified on itch.io, all free)

### VFX Sprite Sheets (Explosions, Magic, Effects)

| Pack | Source | Contents | License |
|------|--------|----------|---------|
| **Free VFX Asset Pack** | OpenGameArt.org | 22 effects, 30fps + 60fps, PNG sheets + GIFs | Public Domain |
| **Free Pixel Magic Sprite Effects** | CraftPix / itch.io | Healing, blink, roots, aura, laser, spark, charm, starfall, petrification | Free |
| **Explosions, Bullets, Fire** | OpenGameArt.org | Pixel art explosions, projectiles, fire | CC0 |
| **CC0 Special Effects** | OpenGameArt.org | Various CC0 VFX | CC0 |

**Key Sources:**
- https://opengameart.org/content/free-vfx-asset-pack
- https://free-game-assets.itch.io/free-pixel-magic-sprite-effects-pack
- https://craftpix.net/freebies/11-free-pixel-art-explosion-sprites/
- https://itch.io/game-assets/free/tag-cc0/tag-pixel-art

**Recommendation:** Grab the **Free VFX Asset Pack** (22 effects, public domain) and the **CraftPix Magic Effects Pack** first. These cover slash effects, magic circles, explosions, and healing -- exactly what a dungeon game needs.

---

## 3. Visual Techniques for BRIGHT Pixel Art Games

### What Bright Games Do Differently

With no darkness to hide behind, bright pixel art games rely on these pillars:

#### A. Strong Color Identity Per Biome/Area

Celeste's approach (HIGH confidence -- well documented):
- Each area has a distinct color mood: cold blues (summit), warm pinks (dream), oppressive purple (mirror temple)
- Background layers use **desaturated, less vibrant colors** to push them back
- Foreground gameplay elements are **more saturated** for readability
- Hue-shifting in shadows (Madeline's red hair becomes maroon in shadow, orange in highlights)

**Implementation for your game:**
```javascript
// Per-floor color palette shift
const FLOOR_PALETTES = {
  1: { bg: '#2a1a3a', accent: '#8b4513', mood: 'warm dungeon' },
  2: { bg: '#1a2a3a', accent: '#4a6b8a', mood: 'cold crypt' },
  3: { bg: '#3a1a1a', accent: '#8b1313', mood: 'blood halls' },
  4: { bg: '#1a3a2a', accent: '#2a8b4a', mood: 'toxic depths' },
};
```

#### B. Layered Parallax Backgrounds

Even for top-down dungeon games, parallax creates depth:
- **Layer 0 (deepest):** Subtle texture/pattern that scrolls at 0.1x camera speed
- **Layer 1:** Distant wall details, pillars fading into darkness at edges
- **Layer 2:** Main dungeon floor and walls (1:1 with camera)
- **Layer 3:** Foreground overlays (dust particles, hanging chains)

Celeste splits rendering into multiple game canvases at the same resolution, then slides layers using screen resolution to avoid pixel-grid jitter.

**For a top-down dungeon:** Use parallax on decorative layers AROUND the room (visible through doorways, at room edges) rather than within the room itself.

#### C. Rich Environmental Animation

Without darkness hiding static elements, EVERYTHING needs to feel alive:
- **Water tiles:** Animated 3-4 frame shimmer using palette cycling
- **Torch flames:** 4-frame animation on wall torches (you already have embers)
- **Hanging chains/banners:** Gentle 2-frame sway
- **Floor cracks:** Occasionally emit tiny dust particles
- **Moss/vines:** Subtle color pulse (lighter/darker green)

#### D. Atmospheric Particles for Bright Scenes

Dark games use glowing particles. Bright games use:

| Particle Type | Visual | When to Use |
|---------------|--------|-------------|
| **Dust motes** | Small white/tan dots, slow drift | Always, everywhere |
| **Falling debris** | Tiny dark specs falling | Near damaged walls |
| **Water droplets** | Blue-white, fast fall | Near water tiles |
| **Pollen/spores** | Yellow-green, floating up | Moss/nature areas |
| **Sparks** | Orange, fast + gravity | Near forges, torches |
| **Floating embers** | Orange-red, slow rise | Fire areas |
| **Dust clouds** | Gray puffs on movement | When entities walk |

**Key insight:** In bright scenes, particles should be DARKER than the background (subtract mode) or use contrast colors, not additive blend which disappears against bright backgrounds.

---

## 4. Advanced Sprite Rendering Techniques

### A. Sprite-Shaped Drop Shadows

Instead of generic ellipses, use the actual sprite silhouette as a shadow:

```javascript
function drawSpriteShadow(ctx, sprite, x, y, width, height) {
  const shadowCanvas = document.createElement('canvas');
  shadowCanvas.width = width;
  shadowCanvas.height = height;
  const sCtx = shadowCanvas.getContext('2d');

  // Draw the sprite
  sCtx.drawImage(sprite, 0, 0, width, height);

  // Turn it into a solid dark silhouette
  sCtx.globalCompositeOperation = 'source-in';
  sCtx.fillStyle = 'rgba(0, 0, 0, 0.3)';
  sCtx.fillRect(0, 0, width, height);

  // Draw shadow offset + squished vertically for ground projection
  ctx.save();
  ctx.translate(x + 4, y + height * 0.7);
  ctx.scale(1, 0.4); // Flatten for ground perspective
  ctx.drawImage(shadowCanvas, 0, 0);
  ctx.restore();
}
```

**Performance tip:** Pre-render shadow silhouettes for each sprite frame at load time. Cache them. Draw cached shadows each frame -- no compositing cost per frame.

**Confidence: HIGH** (source-in compositing is well-supported across all browsers)

### B. Outline Effects (Better Than Current Glow)

For bright games, colored outlines are more visible than glow halos:

```javascript
function drawOutlinedSprite(ctx, sprite, x, y, w, h, color) {
  // Draw sprite at 8 offset positions in the outline color
  ctx.globalCompositeOperation = 'source-over';
  const offsets = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[1,-1],[-1,1],[1,1]];

  // Draw colored silhouette at each offset
  for (const [ox, oy] of offsets) {
    // Use an offscreen canvas with source-in to create colored silhouette
    ctx.drawImage(coloredSilhouette, x + ox, y + oy, w, h);
  }
  // Draw original sprite on top
  ctx.drawImage(sprite, x, y, w, h);
}
```

**Color coding convention:**
- White outline: Player
- Red outline: Enemies
- Yellow outline: Interactable objects
- Green outline: Power-ups
- Purple outline: Boss

**Recommendation:** Use 1px outlines (which become 3px at your 3x scale). At full brightness, outlines provide better entity-vs-background separation than glows.

### C. Sprite Stacking for Pseudo-3D

Sprite stacking draws horizontal "slices" of an object with vertical offsets to create a 3D look:

```javascript
for (let i = 0; i < slices.length; i++) {
  ctx.drawImage(slices[i], x, y - i * 1); // 1px offset per slice
}
```

**Verdict: Skip for this project.** Sprite stacking requires remaking all sprites as slice sets. It is a massive art investment and does not match the 0x72 tileset style. Better suited for voxel-style games (like Wee Boats). The cost-to-benefit ratio is terrible for your use case.

### D. Color Palette Harmonization

The 0x72 tileset uses its own palette. Mixed-in VFX sprites may clash.

**Runtime palette mapping technique:**

```javascript
function remapToPalette(spriteCanvas, targetPalette) {
  const imageData = ctx.getImageData(0, 0, w, h);
  const data = imageData.data;
  for (let i = 0; i < data.length; i += 4) {
    const nearest = findNearestColor(data[i], data[i+1], data[i+2], targetPalette);
    data[i] = nearest.r;
    data[i+1] = nearest.g;
    data[i+2] = nearest.b;
  }
  ctx.putImageData(imageData, 0, 0);
}
```

**Better approach:** Do palette remapping OFFLINE. Use Lospec palette list (https://lospec.com/palette-list) to find a palette close to 0x72's colors, then remap all third-party sprites to that palette before adding them to the game.

**Key palette techniques:**
- **Hue-shifting:** Shift hue across ramps (e.g., shadows trend toward blue/purple, highlights toward yellow)
- **Master palette:** Define 16-32 core colors. All sprites must use only these.
- **Gamut masking:** Pick 3-4 primary hues, only use colors within that gamut

**Confidence: HIGH** (well-established pixel art technique)

### E. Dynamic Palette Shifting Per Biome

Use `globalCompositeOperation = 'multiply'` to tint the entire scene:

```javascript
// After drawing all entities
ctx.globalCompositeOperation = 'multiply';
ctx.fillStyle = biomeColor; // e.g., 'rgba(255, 220, 200, 1)' for warm
ctx.fillRect(0, 0, canvas.width, canvas.height);
ctx.globalCompositeOperation = 'source-over';
```

Or use `ctx.filter` for more subtle shifts:
```javascript
ctx.filter = 'hue-rotate(20deg) saturate(1.2)';
ctx.drawImage(sceneCanvas, 0, 0);
ctx.filter = 'none';
```

---

## 5. Environment & Level Design Visual Tricks

### A. Procedural Decoration System

The single biggest impact for visual variety with NO new art assets:

```javascript
const ROOM_DECORATIONS = {
  floor: [
    { type: 'crack', probability: 0.03, variants: 4 },
    { type: 'moss_patch', probability: 0.02, variants: 3 },
    { type: 'blood_stain', probability: 0.01, variants: 5 },
    { type: 'bone_pile', probability: 0.005, variants: 2 },
    { type: 'puddle', probability: 0.01, variants: 3 },
  ],
  wall_adjacent: [
    { type: 'cobweb', probability: 0.04, corners_only: true },
    { type: 'wall_chains', probability: 0.02 },
    { type: 'torch_sconce', probability: 0.03 },
    { type: 'crack', probability: 0.03, variants: 3 },
  ],
  room_center: [
    { type: 'rug', probability: 0.1 },
    { type: 'table', probability: 0.05 },
    { type: 'pillar', probability: 0.08 },
  ],
};
```

Use room seed (room index) as RNG seed so decorations are deterministic per room but varied across rooms.

**The 0x72 DungeonTileset II already includes:** Bones, skulls, chains, cobwebs, barrels, crates, candles, flags, banners, chests. Many of these may not be rendered yet. Check the full sprite sheet.

### B. Floor Variation Without New Art

```javascript
// Rotate and flip existing floor tiles randomly (seeded)
function drawFloorTile(ctx, tile, x, y, seed) {
  const rng = mulberry32(seed + x * 7 + y * 13);
  ctx.save();
  ctx.translate(x + TILE_SIZE/2, y + TILE_SIZE/2);

  // Random rotation (0, 90, 180, 270)
  ctx.rotate(Math.floor(rng() * 4) * Math.PI / 2);

  // Random horizontal flip
  if (rng() > 0.5) ctx.scale(-1, 1);

  ctx.drawImage(tile, -TILE_SIZE/2, -TILE_SIZE/2);
  ctx.restore();
}
```

With 8 floor tile variants x 4 rotations x 2 flip states = **64 visual variations** from existing art.

### C. Wall Variety

- **Damaged walls:** Slightly different sprite for walls adjacent to doors
- **Moss-covered walls:** Tint green using multiply composite on walls near water
- **Bloody walls:** Red tint on walls in rooms with many enemies
- **Cracked walls:** Visual hint for (future) secret rooms

### D. Transition Tiles

For transitions between floor types (e.g., stone to dirt):
- Use **dithering patterns** at borders (checkerboard mix of two tile types)
- Or alpha-blend the edge tiles using a gradient mask

### E. Room Type Visual Identity

Give each procedurally generated room a "type" that affects decoration:

| Room Type | Floor Color | Decorations | Particles |
|-----------|------------|-------------|-----------|
| Crypt | Gray stone | Coffins, bones, cobwebs | Dust |
| Library | Dark wood | Bookshelves, candles | Floating pages |
| Torture | Dark stone | Chains, blood stains | Dripping |
| Treasure | Golden tint | Chests, gold piles, rugs | Sparkles |
| Flooded | Blue tint | Puddles, moss | Water drops |

---

## 6. HUD & UI Improvements

### A. Free UI Asset Packs

| Pack | Source | Contents |
|------|--------|----------|
| **Free Basic Pixel UI for RPG** | free-game-assets.itch.io | Buttons, sword/potion icons, HP/MP/XP bars |
| **Pixel Health Bar Asset Pack** | adwitr on itch.io | Multiple health bar styles |
| Various tagged packs | itch.io/game-assets/free/tag-gui/tag-pixel-art | Large collection browsable by tag |

### B. Boss HP Bar with Nameplate

Design pattern used by most pixel art games:

```
+--[SKULL ICON]-- THE DARK KNIGHT --[SKULL ICON]--+
|[==================== HP BAR ====================]|
+--------------------------------------------------+
```

Implementation:
```javascript
function drawBossBar(ctx, boss) {
  const barWidth = 400;
  const barHeight = 16;
  const x = (canvas.width - barWidth) / 2;
  const y = canvas.height - 60;

  // Name plate background
  ctx.fillStyle = '#1a1a2e';
  ctx.fillRect(x - 20, y - 24, barWidth + 40, 20);

  // Boss name (centered)
  ctx.fillStyle = '#e0c060';
  ctx.font = '14px monospace';
  ctx.textAlign = 'center';
  ctx.fillText(boss.name, canvas.width / 2, y - 10);

  // Bar background
  ctx.fillStyle = '#2a0a0a';
  ctx.fillRect(x, y, barWidth, barHeight);

  // Bar fill with gradient
  const pct = boss.hp / boss.maxHp;
  const grad = ctx.createLinearGradient(x, y, x + barWidth * pct, y);
  grad.addColorStop(0, '#cc2222');
  grad.addColorStop(1, '#ff4444');
  ctx.fillStyle = grad;
  ctx.fillRect(x + 2, y + 2, (barWidth - 4) * pct, barHeight - 4);

  // Ornate border (pixel art frame)
  drawPixelBorder(ctx, x - 2, y - 2, barWidth + 4, barHeight + 4);
}
```

### C. Minimap

For a roguelike dungeon, a simple minimap showing room layout:

```javascript
function drawMinimap(ctx, rooms, currentRoom) {
  const mapX = canvas.width - 120;
  const mapY = 10;
  const roomSize = 12;
  const padding = 4;

  // Background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(mapX - 5, mapY - 5, 115, 115);

  rooms.forEach((room, i) => {
    const rx = mapX + room.gridX * (roomSize + padding);
    const ry = mapY + room.gridY * (roomSize + padding);

    // Room color by type
    if (i === currentRoom) {
      ctx.fillStyle = '#ffffff'; // Current room
    } else if (room.visited) {
      ctx.fillStyle = '#666666'; // Visited
    } else if (room.discovered) {
      ctx.fillStyle = '#333333'; // Adjacent to visited
    } else {
      continue; // Hidden
    }

    ctx.fillRect(rx, ry, roomSize, roomSize);

    // Boss room indicator
    if (room.isBoss) {
      ctx.fillStyle = '#ff0000';
      ctx.fillRect(rx + 3, ry + 3, 6, 6);
    }
  });
}
```

### D. Better Player Health Bar

Replace simple bar with a segmented heart/orb system or a styled bar:

**Segmented bar** (like Hollow Knight):
- Each segment = 1 HP
- Segments have individual fill animations
- Damage causes segment to flash white then deplete
- Low HP segments pulse red

**Ornate frame:**
- Draw a pixel art border sprite around the bar
- Add small icon (shield, skull) at the left end
- Show numerical HP: "12/20"

---

## 7. Priority-Ranked Implementation Plan

### Tier 1: MASSIVE Impact, Low-Medium Effort

| Technique | Why | Effort |
|-----------|-----|--------|
| **Procedural room decorations** | Instant visual variety, uses existing sprites | Medium |
| **Floor tile rotation/flip** | 64 variations from 8 tiles, nearly free | Low |
| **Sprite-shaped drop shadows** (cached) | Grounds entities in the world | Medium |
| **Per-biome color tinting** | Each floor feels different | Low |
| **Boss HP bar with nameplate** | Missing table-stakes feature | Low |
| **Minimap** | Missing table-stakes feature | Medium |

### Tier 2: HIGH Impact, Medium Effort

| Technique | Why | Effort |
|-----------|-----|--------|
| **VFX sprite sheets** (slash, magic, explosions) | Combat feels more impactful | Medium |
| **Bright-scene particles** (dust clouds on movement, debris) | World feels alive without darkness | Medium |
| **Room type system** (crypt, library, flooded, etc.) | Variety without new tilesets | Medium |
| **Animated tile effects** (water shimmer, torch flicker) | Static tiles feel dead at full brightness | Medium |
| **1px colored outlines** on all entities | Better than glow for bright scenes | Low |

### Tier 3: GOOD Impact, Higher Effort

| Technique | Why | Effort |
|-----------|-----|--------|
| **hqx upscaled sprites** (offline preprocess) | Smoother look at full brightness | Medium |
| **Palette harmonization** for mixed sprite packs | Visual coherence | Medium |
| **Parallax background** visible through doorways | Depth without WebGL | High |
| **Segmented health bar** with animations | Polish | Medium |
| **Inventory/item display UI** | Feature completeness | High |

### Tier 4: Nice-to-Have

| Technique | Why | Effort |
|-----------|-----|--------|
| **CRT/scanline refinement** | Already have this, just tune | Low |
| **Color LUT per biome** | Subtle, hard to notice | Medium |
| **Depixelization** | Doesn't match game style | Skip |
| **Sprite stacking** | Requires all new art | Skip |

---

## 8. Bright Game Visual Reference Analysis

### What Makes Bright Pixel Art Games Look Professional

Studied: Celeste, Shovel Knight, Cadence of Hyrule, Dead Cells (bright areas)

**Common patterns:**

1. **Strong silhouette readability** -- Every entity has a clear outline/contrast against any background
2. **Layered depth** -- At least 3 visual depth layers even in simple scenes
3. **Constant subtle animation** -- Nothing is ever truly static (even "idle" things sway/pulse/shimmer)
4. **Unified color palette** -- All elements feel like they belong together
5. **Desaturation for distance** -- Background elements are less saturated than foreground
6. **Consistent pixel density** -- Everything at the same pixel resolution (Celeste uses larger pixels for distant mountains, but that is intentional atmospheric perspective)

**Your biggest gap for bright gameplay:**
Without darkness, the current glow/halo effects on entities will look WRONG against a bright background. They will appear as colored blobs rather than atmospheric lighting. **Replace glows with clean outlines.** Use entity coloring (tinting the sprite itself) rather than surrounding auras.

---

## Sources

### Upscaling Tools
- [js-hqx GitHub](https://github.com/phoboslab/js-hqx) -- JavaScript hqx implementation
- [Upscayl](https://upscayl.org/) -- Free desktop AI upscaler
- [Divisio Depixelizer](https://divis.io/en/depixelizer/) -- Pixel art to SVG
- [hqx algorithm analysis](https://every-algorithm.github.io/2024/10/30/hqx.html)

### Sprite Packs
- [0x72 DungeonTileset II Extensions Collection](https://itch.io/c/3613378/0x72s-dungeontileset-and-extension-packs-from-others)
- [Free VFX Asset Pack (OpenGameArt)](https://opengameart.org/content/free-vfx-asset-pack)
- [Free Pixel Magic Effects (CraftPix)](https://craftpix.net/freebies/free-pixel-magic-sprite-effects-pack/)
- [Free Pixel Art Explosions (CraftPix)](https://craftpix.net/freebies/11-free-pixel-art-explosion-sprites/)
- [CC0 Pixel Art on itch.io](https://itch.io/game-assets/free/tag-cc0/tag-pixel-art)
- [Free Pixel UI for RPG (itch.io)](https://free-game-assets.itch.io/free-basic-pixel-art-ui-for-rpg)

### Visual Techniques
- [Celeste Tileset Breakdown](https://aran.ink/posts/celeste-tilesets)
- [Pixel Art Color Palettes (Slynyrd)](https://www.slynyrd.com/blog/2018/1/10/pixelblog-1-color-palettes)
- [Lospec Palette List](https://lospec.com/palette-list)
- [Canvas globalCompositeOperation (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation)
- [Sprite Colorising in Canvas](https://www.mrspeaker.net/2012/02/02/colorising-sprites-2/)
- [Canvas Shadows (W3Schools)](https://www.w3schools.com/graphics/canvas_shadows.asp)
- [Sprite Stacking Explained](https://jamespoole.itch.io/wee-boats/devlog/685630/using-sprite-stacking-for-pseudo-3d-in-wee-boats)
