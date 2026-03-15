# Visual Gaps Research: Depths of the Dark Keep

**Domain:** Canvas 2D dungeon roguelike visual improvements
**Researched:** 2026-03-14
**Overall confidence:** HIGH (based on direct asset inspection + code analysis)

---

## Executive Summary

The game already has excellent post-processing (bloom, god rays, shadow casting, chromatic aberration, color grading). However, it has a massive visual gap: **the dungeon itself is entirely code-drawn with fillRect calls**, while the tileset pack includes professionally hand-drawn pixel art floors, walls, doors, decorations, and props that go completely unused. Additionally, only 6 of the 30+ available character/enemy sprites are used, powerups are code-drawn instead of using the pack's flask sprites, and the HUD draws hearts procedurally instead of using the included `ui_heart` sprites.

The single biggest visual improvement would be **replacing code-drawn tiles with the atlas sprites**. This alone would transform the game from "programmer art with great lighting" to "pixel art game with great lighting."

---

## 1. UNUSED ASSETS IN THE PACK (370 frames available, ~30 used)

### Currently Used (6 entity types + 1 weapon = ~30 frames)

| Entity | Sprite Used | Frames |
|--------|------------|--------|
| Player (knight) | `knight_m_idle/run/hit` | 9 |
| Slime | `muddy_anim` | 4 |
| Bat | `imp_idle/run` | 8 |
| Skeleton | `necromancer_anim` | 4 |
| Boss | `big_demon_idle/run` | 8 |
| Weapon | `weapon_knight_sword` | 1 |

### UNUSED Characters (22 character types, ~200 frames)

**Heroes (could be player class options or NPCs):**

| Sprite | Frames | Visual Description | Best Use |
|--------|--------|--------------------|----------|
| `knight_f_idle/run/hit` | 9 | Female knight, blue armor | Alt player skin |
| `elf_f_idle/run/hit` | 9 | Female elf, green clothes | Ranger class |
| `elf_m_idle/run/hit` | 9 | Male elf, green clothes | Ranger class |
| `wizzard_f_idle/run/hit` | 9 | Female wizard, blue robe | Mage class |
| `wizzard_m_idle/run/hit` | 9 | Male wizard, blue robe | Mage class |
| `lizard_f_idle/run/hit` | 9 | Female lizard, green skin | Alt player |
| `lizard_m_idle/run/hit` | 9 | Male lizard, green skin | Alt player |
| `dwarf_f_idle/run/hit` | 9 | Female dwarf, brown clothes | Alt player |
| `dwarf_m_idle/run/hit` | 9 | Male dwarf, brown clothes | Alt player |

**Enemies (could diversify enemy roster):**

| Sprite | Frames | Size | Best Use |
|--------|--------|------|----------|
| `goblin_idle/run` | 8 | 16x16 (small) | Weak melee enemy |
| `tiny_zombie_idle/run` | 8 | 16x16 (small) | Weak swarm enemy |
| `skelet_idle/run` | 8 | 16x16 (small) | ACTUAL skeleton (current "skeleton" uses necromancer!) |
| `zombie_anim` | 4 | 16x16 | Slow tanky enemy |
| `ice_zombie_anim` | 4 | 16x16 | Ice variant, could slow player |
| `swampy_anim` | 4 | 16x16 | Poison variant |
| `masked_orc_idle/run` | 8 | 16x23 (medium) | Armored melee |
| `orc_warrior_idle/run` | 8 | 16x23 (medium) | Strong melee |
| `orc_shaman_idle/run` | 8 | 16x23 (medium) | Ranged caster |
| `wogol_idle/run` | 8 | 16x23 (medium) | Beast enemy |
| `chort_idle/run` | 8 | 16x23 (medium) | Demon, could be mini-boss |
| `slug_anim` | 4 | 16x23 (medium) | Crawling enemy |
| `tiny_slug_anim` | 4 | 16x16 (small) | Weak crawling enemy |
| `pumpkin_dude_idle/run` | 8 | 16x23 (medium) | Seasonal/special enemy |
| `angel_idle/run` | 8 | 16x16 (small) | Could be a rare friendly NPC or boss phase |
| `doc_idle/run` | 8 | 16x23 (medium) | NPC doctor/shop? |

**Big enemies (32x36, could be additional boss types):**

| Sprite | Frames | Best Use |
|--------|--------|----------|
| `big_zombie_idle/run` | 8 | Alt boss or sub-boss |
| `ogre_idle/run` | 8 | Alt boss or sub-boss |

### UNUSED Weapons (26 weapons, 0 used except knight_sword)

All at `frames/weapon_*.png`:

| Weapon | File | Best Use |
|--------|------|----------|
| `weapon_regular_sword` | 10x21 | Default weapon |
| `weapon_rusty_sword` | 10x21 | Starting weapon |
| `weapon_anime_sword` | 12x30 | Rare drop, large |
| `weapon_golden_sword` | 10x22 | Upgraded weapon |
| `weapon_red_gem_sword` | 10x21 | Magic weapon |
| `weapon_lavish_sword` | 10x30 | Boss drop |
| `weapon_katana` | 6x29 | Fast weapon |
| `weapon_duel_sword` | 9x30 | Long weapon |
| `weapon_saw_sword` | 10x25 | Brutal weapon |
| `weapon_cleaver` | 9x19 | Short range |
| `weapon_machete` | 5x22 | Medium weapon |
| `weapon_knife` | 6x13 | Fast, short range |
| `weapon_axe` | 9x21 | Standard axe |
| `weapon_waraxe` | 12x23 | Heavy axe |
| `weapon_double_axe` | 16x24 | Very heavy |
| `weapon_big_hammer` | 10x37 | Slow, powerful |
| `weapon_hammer` | 10x24 | Medium hammer |
| `weapon_mace` | 10x24 | Medium blunt |
| `weapon_baton_with_spikes` | 10x22 | Blunt + pierce |
| `weapon_spear` | 6x30 | Long range poke |
| `weapon_bow` | 14x26 | Ranged |
| `weapon_bow_2` | 14x26 | Alt ranged |
| `weapon_arrow` | 7x21 | Projectile visual |
| `weapon_throwing_axe` | 10x14 | Thrown projectile |
| `weapon_red_magic_staff` | 8x30 | Magic ranged |
| `weapon_green_magic_staff` | 8x30 | Magic ranged |

### UNUSED Items & Props

| Asset | File(s) | Impact |
|-------|---------|--------|
| `flask_red`, `flask_big_red` | 16x16 each | **Replace code-drawn health potions** |
| `flask_blue`, `flask_big_blue` | 16x16 each | **Replace code-drawn speed potions** |
| `flask_green`, `flask_big_green` | 16x16 each | Could be poison/regen potion |
| `flask_yellow`, `flask_big_yellow` | 16x16 each | Could be mana/special potion |
| `coin_anim_f0-f3` | 6x7, 4 frames | **Animated coin drops** |
| `chest_full_open_anim_f0-f2` | 16x16, 3 frames | **Animated treasure chests** |
| `chest_empty_open_anim_f0-f2` | 16x16, 3 frames | Empty chest variant |
| `chest_mimic_open_anim_f0-f2` | 16x16, 3 frames | **Mimic enemy (surprise!)** |
| `bomb_f0-f2` | 16x16, 3 frames | Throwable bomb item |
| `crate` | 16x24 | Destructible environment |
| `skull` | 16x16 | Floor decoration |

### UNUSED UI Elements

| Asset | File | Impact |
|-------|------|--------|
| `ui_heart_full` | 13x12 | **Replace procedural heart drawing** |
| `ui_heart_half` | 13x12 | **Half-heart for granular HP** |
| `ui_heart_empty` | 13x12 | **Empty heart background** |
| `button_red_up/down` | 16x16 | Interactive buttons |
| `button_blue_up/down` | 16x16 | Interactive buttons |
| `lever_left/right` | 16x16 | Puzzle mechanic |

### UNUSED Wall Decorations (HIGH IMPACT -- these exist in the pack!)

| Asset | File(s) | Impact |
|-------|---------|--------|
| `wall_banner_red` | 16x16 | **Wall decoration, adds visual variety** |
| `wall_banner_blue` | 16x16 | **Wall decoration** |
| `wall_banner_green` | 16x16 | **Wall decoration** |
| `wall_banner_yellow` | 16x16 | **Wall decoration** |
| `wall_fountain_top_1/2/3` | 16x16 each | **Animated fountain top** |
| `wall_fountain_mid_red_anim_f0-f2` | 16x16, 3 frames | **Animated red fountain** |
| `wall_fountain_mid_blue_anim_f0-f2` | 16x16, 3 frames | **Animated blue fountain** |
| `wall_fountain_basin_red_anim_f0-f0-f2` | 16x16, 3 frames | **Fountain basin** |
| `wall_fountain_basin_blue_anim_f0-f2` | 16x16, 3 frames | **Fountain basin** |
| `wall_goo` | 16x16 | Wall goo drip |
| `wall_goo_base` | 16x16 | Wall goo pool |
| `wall_hole_1` | 16x16 | Wall damage |
| `wall_hole_2` | 16x16 | Wall damage |
| `column` | 16x48 | **Freestanding pillar prop** |
| `column_wall` | 16x48 | **Wall-attached pillar** |

### UNUSED Doors (the pack has actual door sprites!)

| Asset | File | Impact |
|-------|------|--------|
| `doors_frame_left` | 16x32 | **Replace code-drawn door frame** |
| `doors_frame_right` | 16x32 | **Replace code-drawn door frame** |
| `doors_frame_top` | 32x16 | **Replace code-drawn door top** |
| `doors_leaf_closed` | 32x32 | **Replace code-drawn closed door** |
| `doors_leaf_open` | 32x32 | **Replace code-drawn open door** |

### UNUSED Floor Tiles (8 variants!)

| Asset | File | Impact |
|-------|------|--------|
| `floor_1` through `floor_8` | 16x16 each | **Replace ALL code-drawn floor tiles** |
| `floor_ladder` | 16x16 | Level exit marker |
| `floor_stairs` | 16x16 | Level transition |
| `floor_spikes_anim_f0-f3` | 16x16, 4 frames | **Animated spike trap** |
| `hole` | 16x16 | Pit/gap tile |

### UNUSED Wall Tiles

| Asset | File | Impact |
|-------|------|--------|
| `wall_left`, `wall_mid`, `wall_right` | 16x16 each | **Replace code-drawn wall face** |
| `wall_top_left/mid/right` | 16x16 each | **Wall top cap** |
| `edge_down` | 16x16 | Floor-to-void edge |
| `wall_edge_*` (12 variants) | 16x16 each | **Proper wall edge transitions** |
| `wall_outer_*` (6 variants) | 16x16 each | **Outer wall corners** |

---

## 2. TILE REPLACEMENT ANALYSIS: Code-Drawn vs Atlas Sprites

### Current State (code-drawn)

The game currently draws tiles with `fillRect` calls in `rooms.js`:
- **Floor tiles:** 4 color variants (`drawFloorTileVariant`), each is a flat color fill with subtle 1px grid lines and microscopic detail pixels. At 32x32 pixels rendered, these look like **colored rectangles with faint lines**.
- **Wall tiles:** 3 variants (`drawWallTileVariant`), drawn as colored rectangles with thin mortar lines in a brick pattern. Functional but very geometric and uniform.
- **Floor details:** Code-drawn cracks, moss, puddles, pebbles, bones, blood. These use individual `fillRect` calls to approximate organic shapes -- clever but visibly "code art."
- **Wall details:** Code-drawn skulls, moss, vines on walls. Same approach.
- **Doors:** Entirely code-drawn with ~80 lines of fillRect calls for wood planks, iron bands, rivets, keyholes.

### What the Atlas Contains

**`atlas_floor-16x16.png`** (viewed directly):
- 8 floor tile variants with hand-drawn stone textures
- Spike trap animation frames (4 frames)
- Ladder and stairs tiles
- Hole/pit tile
- Button and lever interactive tiles
- **Quality:** Professional pixel art with natural stone grain, subtle color variation, organic cracks built into the art. Each 16x16 tile has ~20-30 distinct shading details that no amount of fillRect calls can replicate.

**`atlas_walls_high-16x32.png`** (viewed directly):
- Tall wall tiles (16x32) providing visual DEPTH -- the wall face AND the top cap in one piece
- Multiple wall configurations: front-facing, left-facing, right-facing
- **Animated wall fountains** (red and blue, 3 frames each) with water basins
- Wall banners (4 colors)
- Columns and pillar tiles
- **Door frame and door leaf sprites** (closed + open)
- **Quality:** These tall walls create a 3/4 perspective illusion that makes the dungeon feel like it has HEIGHT. The current code-drawn walls are flat 16x16 squares with no depth impression.

**`atlas_walls_low-16x16.png`** (viewed directly):
- Low wall variants for different configurations
- Wall edge tiles for proper transitions

### Impact Assessment: TRANSFORMATIVE

| Aspect | Current (code) | With Atlas Sprites | Improvement |
|--------|---------------|-------------------|-------------|
| Floor texture | Flat color + 1px lines | Hand-drawn stone grain | MASSIVE |
| Wall appearance | Flat brick pattern | 3/4 perspective depth | MASSIVE |
| Visual consistency | Mixed (sprites on code bg) | Sprites on sprite bg | HIGH |
| Door quality | ~80 lines of fillRect | 2 professional sprites | HIGH |
| Performance | Similar (both cached) | Similar (both cached) | NEUTRAL |
| Tile variety | 4 floor, 3 wall variants | 8 floor + edges + tops | HIGH |

**Verdict: This is the #1 priority upgrade. The floor/wall atlas sprites would single-handedly make the game look 3x more professional.**

### Implementation Approach

The game already uses 32px TILE size but the sprites are 16x16. Draw them at 2x scale (`ctx.imageSmoothingEnabled = false` for crisp scaling). The `bakeRoomBackground()` function already caches tiles to an offscreen canvas, so you just need to replace the fillRect calls with `ctx.drawImage()` calls pulling from the atlas.

For walls, use the 16x32 tall wall tiles at 2x = 32x64. The top 16px is the wall cap (visible from above) and the bottom 16px is the wall face. This means wall tiles in the top row of the room should show the full 32x64 tall tile, while wall tiles adjacent to floor tiles below them show the face portion.

---

## 3. COMPLEMENTARY FREE SPRITE PACKS

### What the 0x72 Pack Already Covers (No External Pack Needed)

After full asset audit, the 0x72 pack already includes:
- Door sprites (frame + leaves, open/close)
- Chest sprites (full, empty, mimic -- all animated)
- Flask/potion sprites (4 colors, 2 sizes)
- Wall fountain animations (replaces need for animated torch wall decor)
- Wall banners (4 colors)
- Column/pillar props
- Spike trap animation
- Coin animation
- Bomb animation
- UI hearts (full, half, empty)
- Skull prop
- Crate prop
- Lever interaction sprites

**The pack is far more complete than currently being used. The priority should be using what you HAVE before adding external packs.**

### Complementary Packs Worth Considering (after using existing assets)

| Pack | Author | Price | What It Adds | Link |
|------|--------|-------|-------------|------|
| Dungeon Tileset II Extended | Niji | Free | Extended tiles compatible with 0x72 | [itch.io](https://itch.io/c/3613378/0x72s-dungeontileset-and-extension-packs-from-others) |
| 16x16 Dark Dungeon Tileset | Zoltan Kosina | Free | Additional dungeon tiles | Same collection |
| 16x16 Dungeon Walls Reconfig | s17 | Free | Autotile-ready wall configurations | Same collection |
| Pixel Torches | GIANMANSUPER | Free | Animated torch sprites (3 frames, big/small) | [itch.io](https://gianmansuper.itch.io/pixel-torches) |
| DungeonTileset II Sewers | 0x72 | $2 | Official extension: new biome, 4 characters, autotile walls | [itch.io](https://0x72.itch.io/16x16-dungeontileset-ii-sewers) |

### Particle Effect Sprites

The 0x72 pack does NOT include particle effect sprites (fire, magic, explosion). For these:
- **Continue using code-drawn particles.** Your current particle system with the lighting engine looks good. Pixel art particle sprites would actually look WORSE because they wouldn't integrate with your multiplicative lighting as well as the code-drawn radial gradients.
- If you want sprite-based effects later, [Pixel Poem's Dungeon Asset Pack](https://pixel-poem.itch.io/dungeon-assetpuck) includes effect sprites.

---

## 4. ADVANCED CANVAS 2D TECHNIQUES NOT YET IMPLEMENTED

### Priority 1: Atlas Tile Rendering (BIGGEST IMPACT)

Replace all `fillRect` tile drawing with atlas sprite rendering:

```
1. Load atlas PNGs as Image objects
2. Define source rectangles for each tile type (from tile_list_v1.7)
3. In bakeRoomBackground(), use ctx.drawImage(atlas, sx, sy, sw, sh, dx, dy, dw, dh)
4. Scale 16x16 source to 32x32 destination with imageSmoothingEnabled = false
```

The tile_list_v1.7 file already provides exact coordinates for every sprite in the main atlas. Key coordinates:
- `floor_1` through `floor_8`: positions at (16,64), (32,64), (48,64), (16,80), (32,80), (48,80), (16,96), (32,96) -- all 16x16
- `wall_left/mid/right`: (16,16), (32,16), (48,16) -- all 16x16
- `wall_top_left/mid/right`: (16,0), (32,0), (48,0) -- all 16x16

### Priority 2: Proper Wall Edge Autotiling

The pack includes 12+ wall edge tiles for proper transitions:
- `wall_edge_bottom_left/right` -- inner corners
- `wall_edge_mid_left/right` -- side edges
- `wall_edge_top_left/right` -- top corners
- `wall_edge_tshape_*` -- T-intersections
- `wall_outer_*` -- outer corners and edges

Implementation: Use a 4-bit bitmask checking N/E/S/W neighbors to select the correct edge tile. With 16 possible combinations and the available edge sprites, this creates natural-looking wall boundaries instead of the current uniform wall blocks.

### Priority 3: Animated Wall Decorations

The pack includes animated wall fountains (3-frame cycle each):
- Red fountain: `wall_fountain_mid_red_anim_f0-f2` + `wall_fountain_basin_red_anim_f0-f2`
- Blue fountain: `wall_fountain_mid_blue_anim_f0-f2` + `wall_fountain_basin_blue_anim_f0-f2`
- Fountain tops: `wall_fountain_top_1/2/3`

These should be placed on south-facing walls (walls with floor below them) as animated decorations. They would add **living environment** elements beyond just torches.

### Priority 4: Water/Lava via Palette Cycling

Canvas 2D can simulate palette cycling for animated water/lava:

```javascript
// Palette cycling approach:
// 1. Define a color ramp (e.g., 8 water blues)
// 2. Each frame, shift the palette index by 1
// 3. Redraw water tiles using shifted palette
// This creates flowing water illusion with zero sprite overhead
```

Reference implementation: [canvascycle by jhuckaby](https://github.com/jhuckaby/canvascycle) demonstrates full 8-bit color cycling in HTML5 Canvas.

For this game, simpler approach: use 3-4 pre-drawn water tile frames and cycle through them on a timer (similar to how the spike trap animation already works in the tileset).

### Priority 5: Environmental Props for Storytelling

Using existing pack assets to add environmental storytelling:

| Prop | Placement | Effect |
|------|-----------|--------|
| `column` / `column_wall` | Room interiors | Obstruction + visual depth |
| `crate` | Room corners | Destructible environment |
| `skull` | Floor detail | Atmosphere |
| Banners (`wall_banner_*`) | South-facing walls | Color-coded room identity |
| `wall_goo` + `wall_goo_base` | Random walls | Decay/corruption atmosphere |
| `wall_hole_1/2` | Random walls | Damage/age atmosphere |

### Priority 6: Sprite-Based Powerups

Replace the code-drawn powerup rendering in `powerups.js` with the pack's flask sprites:

| Current | Replace With | Visual Improvement |
|---------|-------------|-------------------|
| Code-drawn red bottle (~15 fillRect calls) | `flask_big_red` or `flask_red` | Professional pixel art |
| Code-drawn blue boot (~10 fillRect calls) | `flask_big_blue` or `flask_blue` | Consistent art style |
| Code-drawn orange sword (~8 fillRect calls) | `flask_big_yellow` or `flask_yellow` | Consistent art style |

### Priority 7: Sprite-Based HUD Hearts

Replace procedural heart drawing with `ui_heart_full`, `ui_heart_half`, `ui_heart_empty`:
- Switch from HP bar to heart-based display (more roguelike-traditional)
- Or keep HP bar but use heart icon from sprite instead of procedural

---

## 5. TITLE SCREEN & MENU IMPROVEMENTS

### Current State

The title screen draws:
- Code-drawn brick background (fillRect-based mortar pattern)
- Procedural torches (code-drawn flame frames)
- Hand-coded sword pixel art (TITLE_SWORD array)
- Text-based title with metallic gradient simulation
- Drifting fog rectangles
- Radial vignette

### Improvements Using Tileset Assets

**Background:**
Replace the code-drawn brick pattern with actual wall tiles from the atlas. Tile the entire background with `wall_mid` sprites at 2x scale, then apply the existing vignette on top. This instantly looks more professional.

**Decorations:**
- Place `wall_banner_red` sprites flanking the title (in the style of a castle entrance)
- Use `column` sprites on either side as pillars
- Place `wall_fountain_mid_blue_anim` as animated centerpiece below the title
- Use the `doors_leaf_closed` sprite at the bottom as "enter the dungeon" imagery

**Character showcase:**
Draw the `knight_m_idle_anim` sprite below the title (animated idle) as a hero preview. This immediately communicates "you play as this character."

**Sword replacement:**
Replace the hand-coded TITLE_SWORD pixel array with one of the actual weapon sprites (e.g., `weapon_lavish_sword` or `weapon_anime_sword`) rendered at 4-6x scale. These are professionally drawn and will look better than the hand-coded array.

**Title screen torches:**
The code-drawn torches work well with the lighting system. Could optionally add `wall_fountain_mid_red_anim` as additional animated elements.

---

## PRIORITY-ORDERED IMPLEMENTATION PLAN

### Tier 1: BIGGEST VISUAL IMPACT (do these first)

| # | Change | Effort | Impact | Description |
|---|--------|--------|--------|-------------|
| 1 | Floor tiles from atlas | Medium | MASSIVE | Replace `drawFloorTileVariant()` with atlas floor_1 through floor_8 sprites |
| 2 | Wall tiles from atlas | Medium | MASSIVE | Replace `drawWallTileVariant()` with wall_mid, wall_top_mid, wall edge sprites |
| 3 | Door sprites from pack | Low | HIGH | Replace 80+ lines of door fillRect code with doors_leaf_closed/open + frame sprites |
| 4 | Fix skeleton sprite | Trivial | MEDIUM | Current "skeleton" uses necromancer sprite. Change to `skelet_idle/run` |

### Tier 2: HIGH IMPACT, MODERATE EFFORT

| # | Change | Effort | Impact | Description |
|---|--------|--------|--------|-------------|
| 5 | Wall decorations | Low | HIGH | Add wall_banner, wall_fountain_anim, wall_hole, wall_goo as random decorations |
| 6 | Flask powerup sprites | Low | MEDIUM | Replace code-drawn potions with flask_big_red/blue/yellow sprites |
| 7 | Chest drops | Medium | HIGH | Add chest_full_open_anim as loot containers, chest_mimic as surprise enemy |
| 8 | UI heart sprites | Low | MEDIUM | Use ui_heart_full/half/empty instead of procedural heart |
| 9 | Column props | Low | MEDIUM | Place column sprites in rooms as visual obstacles |
| 10 | Floor props | Low | MEDIUM | Use skull, floor_ladder, floor_stairs sprites as floor detail |

### Tier 3: GAMEPLAY VISUAL VARIETY

| # | Change | Effort | Impact | Description |
|---|--------|--------|--------|-------------|
| 11 | More enemy types | Medium | HIGH | Add goblin, orc_warrior, chort, skelet as enemy variety |
| 12 | Weapon variety | Medium | HIGH | Drop different weapon sprites as visual-only upgrades |
| 13 | Spike traps | Medium | HIGH | Use floor_spikes_anim as environmental hazard |
| 14 | Animated coins | Low | MEDIUM | Use coin_anim for pickup drops |
| 15 | Title screen sprites | Low | MEDIUM | Replace code-drawn title elements with atlas sprites |

### Tier 4: ADVANCED TECHNIQUES

| # | Change | Effort | Impact | Description |
|---|--------|--------|--------|-------------|
| 16 | Wall autotiling | High | HIGH | Full bitmask-based edge tile selection |
| 17 | Water/lava tiles | High | MEDIUM | Palette cycling animated floor hazards |
| 18 | Destructible crates | Medium | MEDIUM | Breakable crate props with particle effects |
| 19 | Lever puzzles | High | LOW | Interactive lever_left/right + button sprites |

---

## TECHNICAL NOTES

### Atlas Loading Strategy

The main spritesheet (`0x72_DungeonTilesetII_v1.7.png`) contains ALL sprites. The `tile_list_v1.7` file provides exact coordinates:

```
Format: sprite_name X Y WIDTH HEIGHT
Example: floor_1 16 64 16 16
```

Load the single main atlas and use `ctx.drawImage(atlas, sx, sy, sw, sh, dx, dy, dw, dh)` to draw any sprite. This is more efficient than loading 370 individual PNG files.

However, the separate atlas files (`atlas_floor-16x16.png`, `atlas_walls_high-16x32.png`) can also be used directly and are organized by category.

### Scaling

- Source sprites: 16x16 (standard) or 16x28/16x32 (tall characters/walls)
- Game TILE size: 32px
- Scale factor: 2x for tiles, 3x for characters (already set as SPRITE_SCALE)
- Always set `ctx.imageSmoothingEnabled = false` before drawing

### Performance Consideration

The current `bakeRoomBackground()` function pre-renders tiles to an offscreen canvas. This approach should be maintained -- just swap fillRect calls for drawImage calls. The baked canvas is drawn once per room load, so there is zero per-frame cost difference.

Animated elements (wall fountains, spike traps) should NOT be baked -- they need to be drawn per-frame like the torches already are.

---

## Sources

- Direct asset inspection of `D:/claude code/game with claude/assets/0x72_DungeonTilesetII_v1.7/`
- Direct code analysis of all source files in `D:/claude code/game with claude/src/`
- [0x72 DungeonTileset II](https://0x72.itch.io/dungeontileset-ii) -- official asset page
- [Community extension packs collection](https://itch.io/c/3613378/0x72s-dungeontileset-and-extension-packs-from-others) -- complementary free packs
- [Pixel Torches by GIANMANSUPER](https://gianmansuper.itch.io/pixel-torches) -- animated torch sprites
- [DungeonTileset II Sewers by 0x72](https://0x72.itch.io/16x16-dungeontileset-ii-sewers) -- official paid extension
- [canvascycle](https://github.com/jhuckaby/canvascycle) -- HTML5 Canvas color cycling reference
- [Excalibur.js Autotiling](https://excaliburjs.com/blog/Autotiling%20Technique/) -- autotiling technique reference
- [MDN Tilemaps](https://developer.mozilla.org/en-US/docs/Games/Techniques/Tilemaps) -- tiles and tilemaps overview
