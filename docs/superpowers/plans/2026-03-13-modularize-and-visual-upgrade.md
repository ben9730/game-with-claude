# Modularize & Visual Upgrade Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Split the single-file game into ES modules and dramatically upgrade pixel art visuals using professional techniques (hue-shifted color ramps, form shading, dithering, animation frames, manual AA).

**Architecture:** Vanilla JS ES modules served via a local dev server (no build tools). Each game system becomes its own module. A sprite rendering system uses pre-computed pixel data arrays for all characters/enemies/items. Lighting, particles, and effects get dedicated modules.

**Tech Stack:** Vanilla JS ES modules, HTML5 Canvas 2D, no external dependencies. Local dev server via `npx serve` or Python's `http.server` (both free).

---

## File Structure

```
game with claude/
├── index.html              # Entry point, canvas, loads main.js
├── src/
│   ├── main.js             # Game loop, state machine, init
│   ├── config.js           # Constants, palette (color ramps), tile size
│   ├── input.js            # Keyboard + mouse input handling
│   ├── utils.js            # Math helpers, collision, RNG
│   ├── camera.js           # Screen shake, future camera scrolling
│   ├── sprites.js          # Pixel art sprite data arrays + rendering helpers
│   ├── player.js           # Player state, update logic, abilities
│   ├── enemies.js          # Enemy types, AI, spawning
│   ├── boss.js             # Boss logic, phases, attacks
│   ├── rooms.js            # Room generation, grid, doors, floor/wall details
│   ├── projectiles.js      # Arrow/projectile logic
│   ├── powerups.js         # Power-up drops, effects
│   ├── particles.js        # Particle system (typed: slash, death, blood, sparkle)
│   ├── lighting.js         # Torch system, darkness overlay, player light
│   ├── hud.js              # Health bar, room indicator, buffs, HUD frame
│   ├── transitions.js      # Room transition fade, boss entrance
│   ├── renderer.js         # Main draw orchestrator, vignette, fog, depth sort
│   └── title.js            # Title screen, game over, victory screens
```

---

## Chunk 1: Module Split (preserve current visuals)

### Task 1: Create project structure and dev server script

**Files:**
- Create: `src/` directory
- Create: `serve.bat` (Windows quick-start)
- Modify: `index.html` (strip inline JS, add module script tag)

- [ ] **Step 1: Create directory and serve script**

Create `src/` folder and a simple `serve.bat`:
```bat
@echo off
echo Starting dev server on http://localhost:8080
echo Press Ctrl+C to stop
npx serve -l 8080 .
```

- [ ] **Step 2: Update index.html to use ES module**

Strip all `<script>` content, replace with:
```html
<script type="module" src="src/main.js"></script>
```

- [ ] **Step 3: Commit**
```bash
git add index.html serve.bat src/
git commit -m "chore: prepare module structure"
```

### Task 2: Extract config.js and utils.js

**Files:**
- Create: `src/config.js` — PAL, TILE, W, H constants
- Create: `src/utils.js` — randInt, rand, dist, lerp, clamp, moveWithCollision

- [ ] **Step 1: Create config.js with all constants and palette**
- [ ] **Step 2: Create utils.js with all utility functions**
- [ ] **Step 3: Verify imports resolve correctly**
- [ ] **Step 4: Commit**

### Task 3: Extract input.js

**Files:**
- Create: `src/input.js` — keys, mouse, anyKeyPressed, event listeners

- [ ] **Step 1: Create input.js exporting keys, mouse, anyKeyPressed state**
- [ ] **Step 2: Commit**

### Task 4: Extract camera.js (screen shake)

**Files:**
- Create: `src/camera.js` — shake state, startShake, updateShake, shakeX/Y

- [ ] **Step 1: Create camera.js with shake system**
- [ ] **Step 2: Commit**

### Task 5: Extract particles.js

**Files:**
- Create: `src/particles.js` — particle array, spawn functions, update, draw

- [ ] **Step 1: Create particles.js with full particle system**
- [ ] **Step 2: Commit**

### Task 6: Extract rooms.js

**Files:**
- Create: `src/rooms.js` — room generation, grid, floor/wall detail generation, door state

- [ ] **Step 1: Create rooms.js exporting generateRooms, loadRoom, room state, drawRoom, drawDoor**
- [ ] **Step 2: Commit**

### Task 7: Extract lighting.js

**Files:**
- Create: `src/lighting.js` — torch generation, torch update, darkness overlay rendering

- [ ] **Step 1: Create lighting.js with torch system and darkness canvas**
- [ ] **Step 2: Commit**

### Task 8: Extract player.js

**Files:**
- Create: `src/player.js` — player state, updatePlayer, drawPlayer

- [ ] **Step 1: Create player.js with all player logic and rendering**
- [ ] **Step 2: Commit**

### Task 9: Extract enemies.js and boss.js

**Files:**
- Create: `src/enemies.js` — createEnemy, updateEnemies, drawEnemy for slime/bat/skeleton
- Create: `src/boss.js` — boss-specific AI, phases, attacks, draw

- [ ] **Step 1: Create enemies.js with standard enemy types**
- [ ] **Step 2: Create boss.js with Dark Knight logic**
- [ ] **Step 3: Commit**

### Task 10: Extract projectiles.js, powerups.js

**Files:**
- Create: `src/projectiles.js` — projectile array, update, draw
- Create: `src/powerups.js` — powerup array, update, draw, drop logic

- [ ] **Step 1: Create projectiles.js**
- [ ] **Step 2: Create powerups.js**
- [ ] **Step 3: Commit**

### Task 11: Extract transitions.js, hud.js, title.js

**Files:**
- Create: `src/transitions.js` — transition state, startTransition, updateTransition
- Create: `src/hud.js` — drawHUD with ornate frame, health, buffs
- Create: `src/title.js` — drawTitle, drawGameOver, drawVictory

- [ ] **Step 1: Create transitions.js**
- [ ] **Step 2: Create hud.js**
- [ ] **Step 3: Create title.js**
- [ ] **Step 4: Commit**

### Task 12: Create renderer.js and main.js

**Files:**
- Create: `src/renderer.js` — main draw orchestrator (depth sorting, vignette, fog)
- Create: `src/main.js` — game loop, state machine, startGame, init

- [ ] **Step 1: Create renderer.js that imports and calls all draw functions**
- [ ] **Step 2: Create main.js with game loop and state machine**
- [ ] **Step 3: Test full game works via dev server**
- [ ] **Step 4: Commit**

---

## Chunk 2: Professional Pixel Art Upgrade

Using pixel-art-professional techniques: hue-shifted color ramps, form shading, consistent top-left light source, dithering for textures, manual AA on silhouettes, animation frames.

### Task 13: Create sprites.js with pixel data system

**Files:**
- Create: `src/sprites.js` — sprite data arrays, palette ramps, rendering helpers

- [ ] **Step 1: Define color ramps with hue shifting**

Each ramp has 5 shades: highlight → light → mid → shadow → deep shadow.
Shadows shift toward blue/purple, highlights shift toward yellow/white.

```js
export const RAMPS = {
  skin:    ['#ffe0c0', '#d4a574', '#b07850', '#7a5030', '#4a2818'],
  armor:   ['#88bbdd', '#5577aa', '#446688', '#2a4460', '#1a2a40'],
  steel:   ['#ffffff', '#d0d0e0', '#a0a0b8', '#707088', '#404058'],
  leather: ['#c0a060', '#8a7040', '#6a5030', '#4a3020', '#2a1810'],
  slime:   ['#bbff88', '#66cc44', '#44aa44', '#228822', '#105510'],
  bone:    ['#eee8dd', '#ccbbaa', '#aa9988', '#887766', '#665544'],
  purple:  ['#cc88ff', '#9955dd', '#7744aa', '#552288', '#331166'],
  fire:    ['#ffff88', '#ffaa33', '#ee5511', '#aa2200', '#551100'],
  blood:   ['#ff4444', '#cc2222', '#881111', '#550808', '#330404'],
};
```

- [ ] **Step 2: Build sprite data as 2D pixel arrays**

Each sprite is a 2D array referencing palette indices. Example for player (16x16):
```js
export const PLAYER_IDLE = [
  // 16 rows of 16 values each, using palette indices
  // 0=transparent, 1-5=skin ramp, 6-10=armor ramp, etc.
];
```

- [ ] **Step 3: Create drawSprite helper that renders pixel arrays**

```js
export function drawSprite(ctx, sprite, x, y, scale, palette, flip) {
  // Renders 2D array at position with given scale
  // flip=true mirrors horizontally for left-facing
}
```

- [ ] **Step 4: Commit**

### Task 14: Player sprite upgrade

**Files:**
- Modify: `src/sprites.js` — add detailed player sprite frames
- Modify: `src/player.js` — use new sprite system

- [ ] **Step 1: Design player sprites (16x16 each)**

Create frames using pixel-art-professional principles:
- **Idle** (4 frames): subtle breathing, cape sway
- **Walk** (6 frames): proper walk cycle with contact/passing/up/down poses
- **Slash** (4 frames): anticipation → swing → follow-through → recover
- **Block** (2 frames): shield raised, shield impact
- **Dash** (2 frames): smear frame + trail
- **Hit** (2 frames): knockback pose

Apply: form shading from top-left light source, colored outlines (sel-out), hue-shifted shadows (armor shadows go blue-purple, skin shadows go red-brown).

- [ ] **Step 2: Update player.js to use sprite animation system**
- [ ] **Step 3: Commit**

### Task 15: Enemy sprite upgrade

**Files:**
- Modify: `src/sprites.js` — add enemy sprite frames
- Modify: `src/enemies.js` — use new sprites

- [ ] **Step 1: Design Slime sprites (12x12)**
- Idle (3 frames): squish bounce cycle
- Move (4 frames): stretch and squash locomotion
- Death (3 frames): splat and dissolve
- Apply: translucent core glow, dithered shading, manual AA on curves

- [ ] **Step 2: Design Bat sprites (14x14)**
- Fly (4 frames): wing flap cycle with membrane stretch
- Dive (2 frames): folded wings attack
- Death (2 frames): spin and poof
- Apply: wing membrane dithering, rim lighting on body

- [ ] **Step 3: Design Skeleton Archer sprites (16x16)**
- Idle (3 frames): subtle sway, jaw movement
- Shoot (3 frames): draw → aim → release
- Death (3 frames): collapse into bones
- Apply: bone texture dithering, ambient occlusion at joints

- [ ] **Step 4: Update enemies.js to use sprite system**
- [ ] **Step 5: Commit**

### Task 16: Boss sprite upgrade

**Files:**
- Modify: `src/sprites.js` — add boss sprite frames (24x24 or 32x32)
- Modify: `src/boss.js` — use new sprites

- [ ] **Step 1: Design Dark Knight boss sprites (24x24)**
- Idle (4 frames): menacing stance, cape billow, eye pulse
- Charge (3 frames): windup → lunge → skid
- Swing (4 frames): overhead → slash → impact → recover
- Slam (3 frames): leap up → impact → shockwave
- Phase 2 transformation: armor cracks, red glow intensifies
- Death (5 frames): dramatic collapse, armor breaks apart

Apply: selective outlines, multiple color ramps (dark steel, blood red, eye glow), rim lighting, detailed armor plates with form shading.

- [ ] **Step 2: Update boss.js to use sprite system**
- [ ] **Step 3: Commit**

### Task 17: Environment visual upgrade

**Files:**
- Modify: `src/rooms.js` — enhanced tile rendering
- Modify: `src/config.js` — add tile palette ramps

- [ ] **Step 1: Upgrade wall tiles**
- Stone brick pattern with mortar line variation (3 brick layouts)
- Moss growth using dithering (checkerboard green-to-stone transition)
- Skull wall decoration sprites
- Torch bracket details
- Wall top edge highlight (light source from above)
- Ambient occlusion where walls meet floor

- [ ] **Step 2: Upgrade floor tiles**
- 4+ floor tile variations with subtle stone pattern differences
- Crack details (3 crack patterns, randomly placed)
- Puddle tiles with dithered reflection
- Moss patches with color ramp (dark → bright green)
- Bone scatter decorations
- Bloodstain details near enemy spawn points

- [ ] **Step 3: Upgrade door rendering**
- Wooden plank texture with grain lines
- Iron band details with rivets
- Keyhole with depth shading
- Opening animation: planks split, hinges visible
- Glowing threshold when open (inviting warm light)

- [ ] **Step 4: Commit**

### Task 18: Lighting system upgrade

**Files:**
- Modify: `src/lighting.js` — enhanced torch and lighting effects

- [ ] **Step 1: Upgrade torch rendering**
- Multi-frame flame animation (4 frames) with hue-shifted fire ramp
- Smoke particles rising from torches
- Warm light pool with proper falloff (not just radial gradient)
- Light flicker varies per-torch (seeded randomness)

- [ ] **Step 2: Upgrade darkness system**
- Use multiply blend mode for more natural darkness
- Player light has slight warm tint
- Torch lights create overlapping warm pools
- Darkness at room edges is deeper

- [ ] **Step 3: Commit**

### Task 19: Particle & effect upgrade

**Files:**
- Modify: `src/particles.js` — enhanced particle types

- [ ] **Step 1: Upgrade slash effect**
- Arc trail with fading white-blue-purple gradient
- Sparks fly off in slash direction
- Screen-space slash line that fades

- [ ] **Step 2: Upgrade death effects per enemy type**
- Slime: green blobs that splat on floor and persist briefly
- Bat: wing fragments flutter down, poof of purple dust
- Skeleton: bones scatter with physics (bounce on floor)
- Boss: massive explosion, armor pieces fly, screen flash

- [ ] **Step 3: Upgrade power-up visuals**
- Floating bob with pixel sparkle halo
- Pickup burst with themed color particles
- Active buff: subtle aura around player matching buff color

- [ ] **Step 4: Commit**

### Task 20: HUD and UI polish

**Files:**
- Modify: `src/hud.js` — pixel-art styled HUD

- [ ] **Step 1: Redesign HUD with pixel art frame**
- Stone/metal border around HUD area drawn with pixel patterns
- Pixel heart icon (animated pulse at low HP)
- Health bar with per-segment markers and shine highlight
- Room indicator with dungeon floor icon
- Buff icons: pixel art sword (attack), boot (speed), shield (block)
- Timer display for active buffs

- [ ] **Step 2: Upgrade title screen**
- Detailed dungeon brick background
- Animated torch pair flanking title
- Large ornate sword pixel art centerpiece
- Title with drop shadow and warm glow
- "Press any key" with torch-flicker animation
- Subtle fog scrolling across background

- [ ] **Step 3: Upgrade game over / victory screens**
- Game over: red tint, "death" particle rain, skull icon
- Victory: gold particle burst, trophy/crown icon, stat display with pixel frames

- [ ] **Step 4: Commit**

---

## Chunk 3: Final integration and polish

### Task 21: Performance optimization

- [ ] **Step 1: Pre-render static sprites to offscreen canvases**
Cache rendered sprites at startup so pixel arrays aren't re-drawn each frame.

- [ ] **Step 2: Use layered canvases**
Static floor/wall layer renders only on room load. Dynamic layer for entities/effects.

- [ ] **Step 3: Profile and verify 60fps**
- [ ] **Step 4: Commit**

### Task 22: Final testing and cleanup

- [ ] **Step 1: Playtest full game loop (title → rooms → boss → victory)**
- [ ] **Step 2: Playtest death → game over → restart**
- [ ] **Step 3: Verify all visual effects render correctly**
- [ ] **Step 4: Final commit**
