# Sprite Upgrade Research: Dramatically Better Character & Enemy Art

**Domain:** Pixel art sprite rendering for Canvas 2D dungeon roguelike
**Researched:** 2026-03-14
**Overall Confidence:** HIGH (techniques well-established, resources verified)

---

## Executive Summary

The current sprites are built with ~30-80 `fillRect()` calls each, using color ramps, sel-out outlines, dithered shading, and form highlights. They are already above average for procedurally drawn sprites. The path to "dramatically better" has three tiers, ordered by impact-to-effort ratio:

1. **Tier 1 (Highest Impact):** Switch to palette-indexed pixel data arrays rendered to offscreen canvases via `ImageData` + `putImageData()`. This unlocks 32x32 or 48x48 detail with 1,024-2,304 individually placed pixels per frame, enabling proper anti-aliasing clusters, sub-pixel animation, and clean silhouettes. The player sprite already has a partial 16x16 array system (`PLAYER_SPRITE_IDLE`) -- expand this to all characters at higher resolution with multiple animation frames.

2. **Tier 2 (Medium Impact):** Add multi-frame animation (idle 2-4 frames, walk 4 frames, attack 3-4 frames) using the pixel data system. Animate with sub-pixel techniques (shifting highlight/shadow zones rather than moving outlines) for smoother motion at low frame counts.

3. **Tier 3 (Polish):** Palette swapping via `globalCompositeOperation: "multiply"` for enemy variants, horizontal flipping via `ctx.scale(-1, 1)` for directional facing, and optional use of free external sprite sheets for reference or direct inclusion.

---

## 1. Programmatic Pixel Art Techniques

### Best Data Format: Palette-Indexed String Arrays (Current Approach, Expanded)

**Recommendation:** Keep the string-array format already used for `PLAYER_SPRITE_IDLE`, but scale up to 32x32 with hex indices (0-F = 16 colors per sprite, which is the professional standard).

**Confidence:** HIGH -- this is the established pattern for code-defined pixel art.

```javascript
// 32x32 sprite with hex palette indices (0=transparent, 1-F=colors)
const KNIGHT_IDLE_0 = [
  "00000000000011111100000000000000",
  "00000000001122222211000000000000",
  "00000000012233333322100000000000",
  // ... 29 more rows
];

// Palette: array of [r, g, b] for each index 1-F
const KNIGHT_PALETTE = [
  null,                    // 0 = transparent
  [138, 184, 216],         // 1 = armor highlight
  [85, 136, 170],          // 2 = armor light
  [68, 102, 136],          // 3 = armor mid
  [46, 74, 102],           // 4 = armor shadow
  [26, 46, 68],            // 5 = armor deep shadow
  [212, 165, 116],         // 6 = skin
  [245, 216, 176],         // 7 = skin highlight
  [184, 122, 80],          // 8 = skin shadow
  [255, 255, 255],         // 9 = eye white
  [17, 17, 17],            // A = pupil
  [192, 160, 112],         // B = belt/leather
  [138, 106, 64],          // C = leather shadow
  [255, 240, 160],         // D = gold highlight
  [192, 160, 80],          // E = gold mid
  [74, 48, 32],            // F = boots
];
```

### Why Not Other Formats?

| Format | Pros | Cons | Verdict |
|--------|------|------|---------|
| String arrays (hex) | Human-readable, easy to edit, git-diffable | Slightly more parsing overhead | **USE THIS** |
| 2D number arrays | Type-safe | Verbose, hard to visually read | Skip |
| Uint8Array flat | Fastest parsing | Unreadable, hard to author/edit | Only for generated data |
| RLE encoding | Compact | Complex parsing, hard to edit | Overkill for 32x32 |
| ImageData directly | Fastest render path | Cannot be authored by hand | Use for the render cache only |

### Rendering Pipeline: ImageData for Speed

The fastest approach for rendering pixel data arrays to canvas:

```javascript
function buildSpriteCanvas(spriteRows, palette, scale = 2) {
  const size = spriteRows.length; // 32 for 32x32
  const w = size * scale;
  const h = size * scale;
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d');

  // Build ImageData for maximum speed
  const imgData = ctx.createImageData(w, h);
  const data = imgData.data; // Uint8ClampedArray

  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const ch = spriteRows[row][col];
      const idx = parseInt(ch, 16);
      if (idx === 0) continue; // transparent

      const [r, g, b] = palette[idx];

      // Fill scale x scale block
      for (let dy = 0; dy < scale; dy++) {
        for (let dx = 0; dx < scale; dx++) {
          const px = (col * scale + dx);
          const py = (row * scale + dy);
          const i = (py * w + px) * 4;
          data[i] = r;
          data[i + 1] = g;
          data[i + 2] = b;
          data[i + 3] = 255;
        }
      }
    }
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas; // Cache this! Draw with drawImage()
}
```

**Performance benchmarks** (from MeasureThat.net):
- `drawImage()` from cached canvas: **fastest** (GPU-accelerated)
- `putImageData()` per frame: ~5x slower (CPU-to-GPU transfer each frame)
- Individual `fillRect()` calls: ~10-50x slower for 32x32 sprites (current approach)

**Key insight:** Build sprites to offscreen canvases ONCE at load time (or when palette changes), then use `ctx.drawImage(cachedCanvas, x, y)` every frame. The current code already does this for the player (`buildPlayerSprite()`) but not for enemies.

### Multi-Frame Animation System

```javascript
// Animation definition
const KNIGHT_ANIMS = {
  idle: {
    frames: [KNIGHT_IDLE_0, KNIGHT_IDLE_1, KNIGHT_IDLE_2, KNIGHT_IDLE_3],
    frameDuration: 0.2,  // seconds per frame
    loop: true,
  },
  walk: {
    frames: [KNIGHT_WALK_0, KNIGHT_WALK_1, KNIGHT_WALK_2, KNIGHT_WALK_3],
    frameDuration: 0.12,
    loop: true,
  },
  attack: {
    frames: [KNIGHT_ATK_0, KNIGHT_ATK_1, KNIGHT_ATK_2],
    frameDuration: 0.08,
    loop: false,
  },
};

// Cache all frames at load time
const spriteCache = new Map(); // key: "knight_idle_0" -> offscreen canvas

function cacheAllFrames(name, anims, palette, scale) {
  for (const [animName, anim] of Object.entries(anims)) {
    anim.frames.forEach((frame, i) => {
      const key = `${name}_${animName}_${i}`;
      spriteCache.set(key, buildSpriteCanvas(frame, palette, scale));
      // Also cache flipped version
      const flipped = buildFlippedCanvas(spriteCache.get(key));
      spriteCache.set(key + '_flip', flipped);
    });
  }
}

// Flip for directional facing
function buildFlippedCanvas(source) {
  const c = document.createElement('canvas');
  c.width = source.width;
  c.height = source.height;
  const ctx = c.getContext('2d');
  ctx.scale(-1, 1);
  ctx.drawImage(source, -c.width, 0);
  return c;
}
```

### Palette Swapping for Enemy Variants

Use `globalCompositeOperation: "multiply"` for fast GPU-accelerated tinting:

```javascript
function createTintedSprite(sourceCanvas, tintColor) {
  const c = document.createElement('canvas');
  c.width = sourceCanvas.width;
  c.height = sourceCanvas.height;
  const ctx = c.getContext('2d');

  // Draw original sprite
  ctx.drawImage(sourceCanvas, 0, 0);

  // Multiply tint (preserves luminance, shifts hue)
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = tintColor;
  ctx.fillRect(0, 0, c.width, c.height);

  // Restore alpha from original (multiply fills transparent areas)
  ctx.globalCompositeOperation = 'destination-in';
  ctx.drawImage(sourceCanvas, 0, 0);

  return c;
}

// Example: red slime variant from green slime base
const redSlimeSprite = createTintedSprite(greenSlimeSprite, '#ff8888');
```

For more precise palette swaps (changing specific colors), use alternate palettes:

```javascript
const SLIME_PALETTE_GREEN = [null, [187,255,187], [102,221,102], [68,170,68], [34,136,34], [16,85,16]];
const SLIME_PALETTE_RED   = [null, [255,187,187], [221,102,102], [170,68,68], [136,34,34], [85,16,16]];
const SLIME_PALETTE_ICE   = [null, [200,220,255], [120,160,220], [80,120,180], [50,80,140], [20,40,80]];

// Just rebuild the cached canvas with a different palette - instant variant
```

---

## 2. Free Pixel Art Resources & Generators

### Best Free Sprite Sheets for Dungeon Roguelikes

**Confidence:** HIGH -- all verified as free/CC0.

| Resource | What You Get | License | Best For | URL |
|----------|-------------|---------|----------|-----|
| **0x72 DungeonTileset II** | 16x16 animated characters, enemies, weapons, tiles | CC0 | Reference art, direct use if scaling to 32x32 | [itch.io](https://0x72.itch.io/dungeontileset-ii) |
| **Dungeon Crawl 32x32 Tiles** | 3000+ tiles: monsters, terrain, items, GUI, player avatars | CC0 | Direct use -- already 32x32, massive variety | [OpenGameArt](https://opengameart.org/content/dungeon-crawl-32x32-tiles) |
| **Kenney Tiny Dungeon** | 130 assets: dungeon tiles, characters, weapons, items | CC0 | Clean reference for tile design | [kenney.nl](https://kenney.nl/assets/tiny-dungeon) |
| **Kenney Roguelike Caves & Dungeons** | 520 assets for caves/dungeons | CC0 | Supplementary tiles and props | [kenney.nl](https://kenney.nl/assets/roguelike-caves-dungeons) |
| **Anokolisa RPG Pack** | 500+ sprites: 3 heroes, 8 enemies, 50 weapons, 16x16 | CC0 | Character variety reference | [itch.io](https://anokolisa.itch.io/free-pixel-art-asset-pack-topdown-tileset-rpg-16x16-sprites) |
| **Pixel_Poem Dungeon Pack** | Dungeon asset pack with characters | Free | Atmospheric dungeon assets | [itch.io](https://pixel-poem.itch.io/dungeon-assetpuck) |

**Top recommendation:** Use **Dungeon Crawl 32x32 Tiles** from OpenGameArt as primary reference for hand-coding sprite data. It contains slimes, skeletons, bats, knights, and bosses at exactly the resolution you want. Study these sprites pixel-by-pixel to understand professional color placement, then recreate similar quality in your data arrays.

### Best Free Pixel Art Editors (Web-Based)

| Tool | Best For | URL |
|------|----------|-----|
| **Piskel** | Designing sprites with animation preview, export to sprite sheet | [piskelapp.com](https://www.piskelapp.com/) |
| **pixeldudesmaker** | Instant procedural character generation for reference | [0x72 itch.io](https://0x72.itch.io/pixeldudesmaker) |
| **Avatars in Pixels** | Quick character concept exploration | [avatarsinpixels.com](https://www.avatarsinpixels.com/) |
| **Universal LPC Spritesheet Generator** | Full character sprite sheets with equipment variants | [GitHub](https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/) |

**Workflow recommendation:** Design sprites in Piskel (has animation timeline + onion skinning), then manually transcribe to hex string arrays in code. A 32x32 sprite takes ~15-20 minutes to transcribe.

### AI Pixel Art Generation

**Confidence:** MEDIUM -- tools exist but quality varies.

| Tool | Cost | Quality | Best For |
|------|------|---------|----------|
| **Retro Diffusion** | Free tier | High (artist-designed for games) | Game-ready pixel sprites at specific sizes |
| **Perchance AI Pixel Art Generator** | Free, no signup | Medium | Quick concept exploration |
| **Sprite-AI** | Free tier | High | Specific pixel sizes (16x16 to 128x128) |
| **PixelAI (Aseprite plugin)** | Free (local SD) | Variable | Integration with professional editor |

**Caveat:** AI-generated sprites often need cleanup -- they tend to have inconsistent pixel grids, anti-aliasing artifacts, and broken silhouettes. Use for inspiration/reference, not direct code transcription.

---

## 3. Sprite Design Principles for Maximum Visual Impact

### What Makes 32x32 Pixel Art Look Professional vs Amateur

**Confidence:** HIGH -- based on Derek Yu's canonical pixel art tutorial and industry best practices.

#### The 5 Key Differences

| Principle | Amateur | Professional |
|-----------|---------|--------------|
| **Outlines** | Black outline everywhere (looks flat) | Sel-out colored outlines: outline color = darker shade of adjacent fill |
| **Shadows** | Just add black (muddy, lifeless) | Hue-shift shadows toward blue/purple; highlights toward yellow/orange |
| **Color count** | Too many colors OR too few | 4-16 colors per sprite, each serving a purpose |
| **Silhouette** | Blobby, ambiguous shape | Instantly readable at thumbnail size -- unique pose/shape per character |
| **Anti-aliasing** | None (jaggy) or too much (blurry) | Manual AA clusters: 2-3 transition pixels at curves |

#### Sel-Out Colored Outlines (Already Partially Implemented)

The current code already does sel-out for some sprites. To improve: ensure EVERY sprite edge uses a darkened version of the adjacent fill color, never pure black. The outline color should be roughly `(r-60, g-60, b-60)` clamped to 0 (current `getOutlineColor()` function does this correctly).

**Improvement:** Apply sel-out to the outline itself in the pixel data, not as a post-process. This gives pixel-perfect control over which edge pixels get which outline color.

#### Hue-Shifted Shadows (Critical Upgrade)

The current `RAMP` system already provides 5-stop color ramps, but they are mostly value ramps (same hue, different brightness). Professional pixel art shifts the hue:

```
Highlight:  Warmer (shift toward yellow/orange)
Mid:        Base color
Shadow:     Cooler (shift toward blue/purple)
Deep Shadow: Even cooler + darker
```

**Current armor ramp:** `["#8ab8d8", "#5588aa", "#446688", "#2e4a66", "#1a2e44"]`
This is already good -- it shifts from light blue-white to deep navy. But the slime ramp `["#bbffbb", "#66dd66", "#44aa44", "#228822", "#105510"]` is pure value (same green hue throughout).

**Improved slime ramp with hue shift:**
```javascript
slime: ["#ddffcc", "#88ee66", "#44bb44", "#227733", "#0a4422"],
//       yellow-green  bright green  mid green  blue-green  deep teal
```

#### Sub-Pixel Animation

Instead of moving a limb's outline by 1 pixel (which at 32x32 is a big jump), shift the internal shading to create the illusion of motion without moving the silhouette:

```
Frame 1: Dark-Light-Light  (arm appears left)
Frame 2: Light-Dark-Light  (arm appears centered)
Frame 3: Light-Light-Dark  (arm appears right)
```

This is ideal for idle breathing, subtle head bobs, and cape flutter -- exactly the small-scale animations this game needs.

#### Readable Enemy Silhouettes

At 32x32, silhouette is everything. Each enemy should have a unique "shape language":

| Character | Shape Language | Silhouette Rule |
|-----------|---------------|-----------------|
| Knight (Player) | Square + triangle (broad shoulders + helmet point) | Widest at shoulders, tapers at head |
| Slime | Circle/blob (organic, amorphous) | Round, no hard edges, drips extend downward |
| Bat | Wide horizontal (wings) + small body | 3:1 width:height ratio when wings spread |
| Skeleton | Tall narrow (bones are thin) | Vertical emphasis, gaps between ribs visible |
| Dark Knight Boss | Extra-large square (massive armor) | 1.5-2x player size, spikes break outline |

### Animation Keyframes for Maximum Impact

**Confidence:** MEDIUM -- based on game animation principles, adapted for low frame count.

| Animation | Frames | Key Principle | Duration |
|-----------|--------|---------------|----------|
| **Idle** | 2-4 | Breathing: sub-pixel shadow shifts on torso | 0.2s per frame |
| **Walk** | 4 | Alternating leg positions + slight body bob | 0.12s per frame |
| **Attack anticipation** | 1 | Windup pose: body leans back, weapon pulled back | 0.08s hold |
| **Attack** | 2-3 | Weapon swings forward, body lunges | 0.06s per frame |
| **Hit/Damage** | 2 | Squash frame (wide/short) + recovery | 0.1s per frame |
| **Death** | 3-4 | Collapse + fade/dissolve | 0.15s per frame |

**Dead Cells insight:** Dead Cells uses 3D models rendered to pixel art for animation, but the key takeaway is their animation principle: "the least amount of keyframes possible, with interpolation frames added before/after." For our game, 2-4 frames per animation is the sweet spot -- more frames don't add much at 32x32.

---

## 4. Canvas 2D Sprite Rendering Optimization

### Performance Architecture

**Confidence:** HIGH -- based on established Canvas 2D best practices.

```
LOAD TIME                          RUNTIME (every frame)
-----------                        ---------------------
Pixel data arrays                  ctx.drawImage(cachedCanvas, x, y)
  |                                  ^
  v                                  |
buildSpriteCanvas()                spriteCache.get(key)
  |                                  ^
  v                                  |
ImageData + putImageData()         Animation frame lookup
  |                                  (name + anim + frameIndex)
  v
Offscreen canvas (cached)
  |
  v
spriteCache Map
```

### Pre-Rendering All Sprites at Load Time

```javascript
// Initialization (run once)
const SPRITE_SCALE = 2; // Each pixel data pixel = 2x2 canvas pixels
// 32x32 data * 2 scale = 64x64 pixel canvas = good size for the game

function initAllSprites() {
  // Player: 4 idle + 4 walk + 3 attack = 11 frames
  cacheAllFrames('knight', KNIGHT_ANIMS, KNIGHT_PALETTE, SPRITE_SCALE);

  // Slime: 4 idle + 2 squish = 6 frames
  cacheAllFrames('slime', SLIME_ANIMS, SLIME_PALETTE_GREEN, SPRITE_SCALE);
  // Variant palettes
  cacheAllFrames('slime_red', SLIME_ANIMS, SLIME_PALETTE_RED, SPRITE_SCALE);

  // Bat: 4 wing flap = 4 frames
  cacheAllFrames('bat', BAT_ANIMS, BAT_PALETTE, SPRITE_SCALE);

  // Skeleton: 2 idle + 2 draw bow = 4 frames
  cacheAllFrames('skeleton', SKELETON_ANIMS, SKELETON_PALETTE, SPRITE_SCALE);

  // Boss: 2 idle + 2 attack + 2 phase2 idle = 6 frames
  cacheAllFrames('boss', BOSS_ANIMS, BOSS_PALETTE, SPRITE_SCALE);
  cacheAllFrames('boss_p2', BOSS_ANIMS, BOSS_PALETTE_P2, SPRITE_SCALE);
}
```

### Horizontal Flipping

```javascript
function drawSprite(ctx, spriteName, animName, frameIndex, x, y, flipH) {
  const key = `${spriteName}_${animName}_${frameIndex}${flipH ? '_flip' : ''}`;
  const cached = spriteCache.get(key);
  if (!cached) return;

  // Center the sprite on the entity position
  ctx.drawImage(cached,
    Math.floor(x - cached.width / 2),
    Math.floor(y - cached.height / 2)
  );
}
```

### Palette Swap with Multiply Blend (for tinting variants)

```javascript
// GPU-accelerated tint via composite operations
function drawTintedSprite(ctx, cached, x, y, tintColor, tintAmount) {
  // Draw at half-opacity base
  ctx.globalAlpha = 1 - tintAmount * 0.5;
  ctx.drawImage(cached, x, y);

  // Additive tint overlay
  ctx.globalAlpha = tintAmount;
  ctx.globalCompositeOperation = 'multiply';
  ctx.fillStyle = tintColor;
  ctx.fillRect(x, y, cached.width, cached.height);

  // Restore
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
}
```

### Damage Flash (White Flash)

The current system draws everything white when `flash = true`. With cached sprites, use `source-atop` to paint the sprite entirely white:

```javascript
function drawFlashedSprite(ctx, cached, x, y) {
  // Draw normal sprite
  ctx.drawImage(cached, x, y);
  // Overlay white using source-atop (only paints where sprite pixels exist)
  ctx.globalCompositeOperation = 'source-atop';
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(x, y, cached.width, cached.height);
  ctx.globalCompositeOperation = 'source-over';
}
```

**Alternative (pre-cached):** Build a white version of each sprite at load time (set all non-transparent pixels to white). This avoids the composite operation per frame. The current `buildPlayerSprite(flash)` already does this -- extend to all sprites.

---

## 5. Specific Improvement Ideas Per Character

### Player Knight

**Current state:** ~50 fillRect calls for body, separate fillRect-based sword/shield drawn in world space with rotation. 16x16 pixel data array exists but is not used for the main render (the fillRect version is used instead).

**Recommended upgrades:**

1. **32x32 pixel data sprite** with proper helmet, chest plate segments, pauldron rivets, belt buckle detail, and boot lacing. Use the full 16-color palette.

2. **4-frame idle animation** using sub-pixel technique:
   - Frame 0-1: Chest shadow band shifts down 1px (inhale)
   - Frame 2-3: Shadow band shifts up 1px (exhale)
   - Cloak/cape edge shifts 1px left/right

3. **4-frame walk cycle** with proper leg alternation:
   - Frame 0: Right leg forward, left back
   - Frame 1: Passing position (legs together)
   - Frame 2: Left leg forward, right back
   - Frame 3: Passing position
   - Body bobs 1px up on passing frames

4. **Sword and shield:** Keep as separate fillRect-drawn elements (they rotate to face the mouse, so pixel data sprites would need rotation which is expensive). But improve the sword with more detailed pixel data for the blade.

5. **Eye tracking:** Keep the current approach (drawing eyes based on facing angle) but apply it on top of the cached sprite body using a few fillRect calls for just the eye whites + pupils.

### Slime

**Current state:** ~40 fillRect calls with dithered body, tracking eyes, drip details, colored outline. Already looks quite good.

**Recommended upgrades:**

1. **32x32 pixel data sprite** with proper blob shape using manual anti-aliasing clusters at the edges (transition pixels between body and transparent). This will make the rounded shape look dramatically smoother than the current rectangular approximation.

2. **Translucency effect:** Use two layers:
   - Layer 1: A slightly larger, darker, lower-opacity body (drawn with `globalAlpha = 0.4`)
   - Layer 2: The main body sprite on top
   - This creates a convincing gel/translucent look

3. **4-frame squish animation:**
   - Frame 0: Neutral round shape
   - Frame 1: Stretched tall (moving upward in hop)
   - Frame 2: Compressed flat (landing)
   - Frame 3: Wide wobble (settling)

4. **Internal glow:** Draw a small bright green circle in the center with additive blend (`ctx.globalCompositeOperation = 'lighter'`). Already partially implemented -- make it brighter and pulse with the bounce.

5. **Bubble/particle details:** Add 2-3 lighter circles inside the body that slowly drift upward (drawn as 2x2 pixel blocks in the sprite data), giving the impression of bubbles inside the gel.

### Bat

**Current state:** ~35 fillRect calls with 4-state wing flap, dithered wing membrane, fur texture, glowing red eyes, fangs. Good silhouette.

**Recommended upgrades:**

1. **32x32 pixel data with 4 wing frames** as separate sprite data arrays:
   - Frame 0: Wings fully up (body highest)
   - Frame 1: Wings mid-up (body lowering)
   - Frame 2: Wings mid-down (body at lowest)
   - Frame 3: Wings fully down (body rising)

2. **Wing membrane detail:** In the pixel data, add visible bone/finger structure within the wing membrane using darker lines, with lighter membrane color between them. Add 1-2 small holes (transparent pixels) in the membrane for a tattered look.

3. **Ear detail:** Pointed ears with inner ear color (slightly pink/lighter purple).

4. **Eye glow trail:** When the bat moves, leave a 2-3 frame fading red glow behind the eye position (drawn as particles, not sprite data). Already has eye glow aura -- extend with motion trailing.

5. **Body fluff:** Use dithering at the body outline to suggest fur. The current dithering is internal -- move some to the edges where body meets transparency.

### Skeleton Archer

**Current state:** ~60 fillRect calls with ribcage detail, skull with glowing eyes, jaw animation, quiver, bow with draw animation. Most detailed enemy currently.

**Recommended upgrades:**

1. **32x32 pixel data sprite** will massively improve the ribcage (individual rib bones curving around the torso), skull shape (proper cranium curve, cheekbones, temporal ridges), and individual finger bones on the hands.

2. **Skull improvement:** The skull at 32x32 can have:
   - Proper cranium dome shape (rounded top with AA clusters)
   - Deep eye sockets with slight rim highlight
   - Nasal cavity (inverted triangle, not just 2 pixels)
   - Visible teeth along the jaw line (alternating bone/dark pixels)
   - Jaw that opens wider during shoot animation

3. **Bow as separate element:** Keep the bow drawn separately (it rotates to face player) but improve it with more detail -- curved limbs (not rectangular), visible nocking point, more detailed arrowhead.

4. **Idle sway:** 2-frame idle where the skeleton rocks slightly side-to-side (bones should look like they're barely held together).

5. **Bone color variation:** Use 2-3 slightly different bone tones across different body parts (skull slightly yellower than ribs, arm bones slightly greyer) to break up the uniform look.

### Dark Knight Boss

**Current state:** ~80 fillRect calls with cape, plate armor segments, shoulder spikes, helmet with visor, glowing eyes, greatsword, phase 2 cracks/aura. Very detailed already.

**Recommended upgrades:**

1. **48x48 pixel data sprite** (boss deserves to be bigger and more detailed). At 48x48 with 2x scale = 96x96 pixel canvas, the boss will be imposing. This gives 2,304 pixels to work with.

2. **Armor plate detail:** Individual rivets along plate edges, visible chainmail texture (2x2 dithering pattern) at joints, heraldic design on chest plate.

3. **Cape with pixel-level animation:** 3-4 frames of cape sway, each a separate sprite data array. The cape should billow more dramatically in Phase 2.

4. **Phase 2 transformation:** Instead of just adding cracks and a red aura, use an entirely different palette for Phase 2:
   - Armor shifts from grey to dark crimson
   - Eyes become brighter (add white pixel in center)
   - Cape becomes tattered (add transparent pixels at edges)
   - Shoulder spikes get longer (different sprite frame)

5. **Greatsword detail at pixel level:** The blade should have visible edge beveling (3-4 shade gradient across the width), blood groove (darker line), and in Phase 2, a glowing red edge (brightest red pixels along the cutting edge).

---

## 6. Implementation Plan: Prioritized Steps

### Phase A: Sprite Data System (Foundation) -- 2-3 hours

1. Create `src/sprites.js` module with:
   - `buildSpriteCanvas(rows, palette, scale)` using ImageData
   - `buildFlippedCanvas(source)`
   - `spriteCache` Map with `initAllSprites()`
   - `drawSprite(ctx, name, anim, frame, x, y, flip)` helper
   - `createTintedSprite(source, tint)` for variants

2. Design the player knight at 32x32 in hex string format (4 idle frames)
3. Replace `drawPlayer()` body rendering with cached sprite draw
4. Keep sword/shield as fillRect (they rotate independently)

### Phase B: Enemy Sprite Data (Each Enemy) -- 1-2 hours each

1. Design slime at 32x32 (4 squish frames)
2. Design bat at 32x32 (4 wing frames)
3. Design skeleton at 32x32 (2 idle + 2 draw frames)
4. Design boss at 48x48 (2 idle frames + phase 2 variants)
5. Replace each enemy's draw function with cached sprite draw

### Phase C: Animation System -- 1 hour

1. Add animation state tracking to entities (currentAnim, frameTimer, frameIndex)
2. Wire up animation transitions (idle -> walk -> attack)
3. Add sub-pixel idle breathing via frame alternation instead of sine-wave scale

### Phase D: Variants & Polish -- 1 hour

1. Generate palette-swapped slime variants (red, ice, poison)
2. Add pre-cached flash (white) versions of all sprites
3. Horizontal flip based on facing direction for all entities
4. Optional: Import reference sprites from OpenGameArt to study/trace

---

## 7. Key Technique: What Current Sprites Already Do Well

The codebase already implements several professional techniques. Do not regress on these:

- **Sel-out colored outlines** -- Keep, but move into pixel data
- **Hue-shifted color ramps** -- Keep `RAMP` system, improve slime/bone ramps
- **Dithered shading** -- Keep for translucent effects (slime, bat wings)
- **Eye tracking** -- Keep as overlay on top of cached sprites
- **Form shading** (highlight top-left, shadow bottom-right) -- Keep in pixel data design
- **Idle breathing** -- Replace sine-wave scale with sub-pixel frame animation
- **Squash/stretch** -- Keep the transform-based approach (works with cached sprites via `ctx.scale()`)
- **Hit flash** -- Keep, use pre-cached white version

---

## Sources

### Techniques & Tutorials
- [Derek Yu's Pixel Art Tutorial (canonical reference)](https://www.derekyu.com/makegames/pixelart.html)
- [Sub-pixel animation tutorial - 2D Will Never Die](https://2dwillneverdie.com/tutorial/give-your-sprites-depth-with-sub-pixel-animation/)
- [Pixel Art Complete Guide 2025](https://generalistprogrammer.com/tutorials/pixel-art-complete-tutorial-beginner-to-pro)
- [Sprite-AI Pixel Art Fundamentals](https://www.sprite-ai.art/guides/pixel-art-fundamentals)
- [Sprite-AI 2D Style Guide](https://www.sprite-ai.art/blog/2d-pixel-art-style-guide)
- [Dead Cells 3D-to-Pixel Pipeline](https://www.gamedeveloper.com/production/art-design-deep-dive-using-a-3d-pipeline-for-2d-animation-in-i-dead-cells-i-)

### Canvas Performance
- [MDN: Pixel manipulation with canvas](https://developer.mozilla.org/en-US/docs/Web/API/Canvas_API/Tutorial/Pixel_manipulation_with_canvas)
- [MDN: Crisp pixel art rendering](https://developer.mozilla.org/en-US/docs/Games/Techniques/Crisp_pixel_art_look)
- [Mozilla Hacks: Faster Canvas Pixel Manipulation with Typed Arrays](https://hacks.mozilla.org/2011/12/faster-canvas-pixel-manipulation-with-typed-arrays/)
- [MDN: globalCompositeOperation](https://developer.mozilla.org/en-US/docs/Web/API/CanvasRenderingContext2D/globalCompositeOperation)
- [Benchmark: putImageData vs drawImage vs fillRect](https://www.measurethat.net/Benchmarks/Show/17589/0/putimagedata-vs-drawimage-vs-fillrect)

### Free Sprite Assets
- [0x72 DungeonTileset II (CC0)](https://0x72.itch.io/dungeontileset-ii)
- [Dungeon Crawl 32x32 Tiles (CC0)](https://opengameart.org/content/dungeon-crawl-32x32-tiles)
- [Kenney Tiny Dungeon (CC0)](https://kenney.nl/assets/tiny-dungeon)
- [Kenney Roguelike Caves & Dungeons (CC0)](https://kenney.nl/assets/roguelike-caves-dungeons)
- [Anokolisa RPG Pack (CC0)](https://anokolisa.itch.io/free-pixel-art-asset-pack-topdown-tileset-rpg-16x16-sprites)
- [itch.io Free Roguelike Pixel Art](https://itch.io/game-assets/free/tag-pixel-art/tag-roguelike)

### Tools
- [Piskel - Free online sprite editor](https://www.piskelapp.com/)
- [pixeldudesmaker by 0x72](https://0x72.itch.io/pixeldudesmaker)
- [Universal LPC Spritesheet Generator](https://liberatedpixelcup.github.io/Universal-LPC-Spritesheet-Character-Generator/)
- [Retro Diffusion - AI pixel art for games](https://retrodiffusion.ai/)
- [Perchance AI Pixel Art Generator (free, no signup)](https://perchance.org/ai-pixel-art-generator)
- [Sprite-AI pixel art generators ranking 2026](https://www.sprite-ai.art/blog/best-pixel-art-generators-2026)

### Pixel Art Sprite Medium Articles
- [Pixel Art with JavaScript Canvas 2D API](https://jasonsturges.medium.com/pixel-art-with-javascript-9e2db3088cb0)
- [Creating and Animating Pixel Art in JavaScript](https://medium.com/geekculture/creating-and-animating-pixel-art-in-javascript-phaser-54b18699442d)
