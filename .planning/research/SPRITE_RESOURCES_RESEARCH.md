# Sprite Resources Research: Depths of the Dark Keep

**Domain:** Free pixel art sprites for top-down dungeon roguelike
**Researched:** 2026-03-14
**Overall confidence:** HIGH (verified across multiple sources)

---

## IMPORTANT: Current Game Context

The game currently uses **code-defined pixel sprites** -- 16x16 grids stored as string arrays in JavaScript (e.g., `PLAYER_SPRITE_IDLE` in `player.js`), rendered at 2x scale (32x32 on screen). The game does NOT load PNG sprite sheets. Any integration of external sprite resources will require either:

1. **Converting PNG sprite sheets to code arrays** (maintaining current approach)
2. **Adding an image loading system** (new infrastructure, bigger visual payoff)

Option 2 is strongly recommended for any serious visual upgrade -- it unlocks animated sprite sheets with far more detail than hand-coded arrays can practically achieve.

---

## TIER 1: Best-in-Class Free Resources (Use These)

### 1. 0x72's 16x16 DungeonTileset II [TOP RECOMMENDATION]

| Attribute | Detail |
|-----------|--------|
| **URL** | https://0x72.itch.io/dungeontileset-ii |
| **License** | CC0 (public domain) + MIT for code |
| **Resolution** | 16x16 base tiles |
| **What's Included** | Animated characters (knight, wizard, archer, dwarf, lizard hero), enemies (goblins, demons, undead, orcs, slugs), dungeon walls (high/low), floors, weapons, chests, doors, decorations |
| **Animations** | Walk cycles, idle, attack for characters |
| **Quality Rating** | 9/10 |
| **Dark Dungeon Fit** | 10/10 -- literally designed for dungeon crawlers |
| **Confidence** | HIGH -- verified directly, 400+ community comments, most popular free dungeon tileset on itch.io |

**Why this is #1:** Perfect resolution match (game already uses 16x16 at 2x), CC0 license means zero restrictions, includes exactly the enemy types the game needs (slimes, skeletons, flying enemies, boss-viable demons), and has a cohesive dark dungeon art style. The community has validated this pack across hundreds of game jam entries.

**Extended Version Available:**
| Attribute | Detail |
|-----------|--------|
| **URL** | https://nijikokun.itch.io/dungeontileset-ii-extended |
| **License** | CC0 |
| **Adds** | 24 staircase variations, potions (8 recolors), keys/keyholes, animated torches (floor + wall), bombs, signs, doors, ladders, carpet tiles, color palette file |
| **Quality Rating** | 9/10 (matches original perfectly) |

**Recommendation:** Use both the original AND extended pack together. The extended pack includes all original assets bundled in, so one download gets everything.

---

### 2. Dungeon Crawl Stone Soup 32x32 Tiles

| Attribute | Detail |
|-----------|--------|
| **URL** | https://opengameart.org/content/dungeon-crawl-32x32-tiles |
| **Supplemental** | https://opengameart.org/content/dungeon-crawl-32x32-tiles-supplemental |
| **License** | CC0 (public domain) |
| **Resolution** | 32x32 |
| **What's Included** | 3,000+ base tiles + 3,000+ supplemental: terrain, walls, decorative features, monsters (hundreds of unique designs), spell effects, items, weapons, armor, GUI elements, player avatars |
| **Quality Rating** | 7/10 (functional but varied quality -- collaborative effort from many artists) |
| **Dark Dungeon Fit** | 8/10 |
| **Confidence** | HIGH -- verified on OpenGameArt, from actual shipped game (Dungeon Crawl Stone Soup) |

**Why it matters:** Sheer volume is unmatched -- 6,000+ tiles means you will never run out of monster variety, item icons, or spell effects. The 32x32 resolution works well as-is since the game renders 16x16 sprites at 2x (32x32 on screen). Drawback: inconsistent art style since many artists contributed. Best used as a supplement for specific sprites (unique boss designs, rare items, spell effects) rather than as the primary tileset.

---

### 3. Anokolisa's Dungeon Crawler Pack

| Attribute | Detail |
|-----------|--------|
| **URL** | https://anokolisa.itch.io/dungeon-crawler-pixel-art-asset-pack |
| **License** | Custom (free, check terms doc) |
| **Resolution** | 16x16 |
| **What's Included** | 500+ sprites: 1 hero (4-directional with run/walk/idle/hit/death/attack animations), 8 enemies (4 skeleton variants: base/mage/warrior/rogue + 4 orc variants), 50 weapons (axes, swords, hammers, daggers, shields, bows, staffs, wands), dungeon/forest/cave tilesets, structures (workbench, furnace, alchemy table, anvil) |
| **Quality Rating** | 8/10 |
| **Dark Dungeon Fit** | 8/10 |
| **Confidence** | HIGH -- verified on itch.io page |

**Why it's great:** The hero character has the most complete animation set of any free pack found -- 12+ animation states including collect, fishing, carry. The skeleton variants (base/mage/warrior/rogue) are perfect for adding enemy diversity to the game. However, license requires checking the specific terms document (linked on the page).

**Companion Pack:**
| Attribute | Detail |
|-----------|--------|
| **URL** | https://anokolisa.itch.io/free-pixel-art-asset-pack-topdown-tileset-rpg-16x16-sprites |
| **What's Included** | Additional environment tiles, more character options |

---

## TIER 2: Strong Supplementary Resources

### 4. Kenney's Roguelike Caves & Dungeons

| Attribute | Detail |
|-----------|--------|
| **URL** | https://kenney.nl/assets/roguelike-caves-dungeons |
| **License** | CC0 |
| **Resolution** | 16x16 (Kenney standard) |
| **What's Included** | 520 assets: cave tiles, dungeon tiles, mine tiles |
| **Quality Rating** | 7/10 (clean and functional, slightly cartoonish) |
| **Dark Dungeon Fit** | 6/10 -- Kenney's style is cleaner/friendlier than "dark keep" aesthetic |
| **Confidence** | HIGH -- Kenney is an established, trusted source |

**Best for:** Supplementary floor/wall tile variety. Not ideal as primary art due to lighter style. Kenney's assets are bulletproof from a licensing perspective (CC0, well-documented).

### 5. Kenney's Tiny Dungeon

| Attribute | Detail |
|-----------|--------|
| **URL** | https://kenney.nl/assets/tiny-dungeon |
| **License** | CC0 |
| **Resolution** | 16x16 |
| **What's Included** | 130 assets: dungeon/sewer/RPG themed tiles |
| **Quality Rating** | 7/10 |
| **Dark Dungeon Fit** | 7/10 -- sewer tag suggests darker themes |

### 6. 32rogues by Seth

| Attribute | Detail |
|-----------|--------|
| **URL** | https://sethbb.itch.io/32rogues |
| **License** | Free (check page for specifics) |
| **Resolution** | 32x32 |
| **What's Included** | 50+ humanoid/monster sprites, 80+ animal sprites, animated water/fire, weapons, items |
| **Quality Rating** | 7/10 |
| **Dark Dungeon Fit** | 7/10 |
| **Note** | Still a work in progress, being actively updated |

### 7. CraftPix Free Dungeon Packs

| Attribute | Detail |
|-----------|--------|
| **URL (tiles)** | https://craftpix.net/freebies/free-2d-top-down-pixel-dungeon-asset-pack/ |
| **URL (objects)** | https://craftpix.net/freebies/free-pixel-art-dungeon-objects-asset-pack/ |
| **URL (props)** | https://craftpix.net/freebies/free-pixel-dungeon-props-and-objects-asset-pack/ |
| **License** | CraftPix free license (free for personal and commercial, check terms) |
| **What's Included** | Animated objects (water, traps, torches, chests), level tiles, decorations (gold piles, shields, barrels, ladders), furniture, interactive props (cannons, guillotines, traps) |
| **Quality Rating** | 8/10 (polished look) |
| **Dark Dungeon Fit** | 9/10 |

**Best for:** Environmental detail and interactive objects. CraftPix packs focus on props/environment rather than characters. Great complement to 0x72 for characters + CraftPix for environment richness.

### 8. Roguelike/RPG Pack (1,700+ tiles) on OpenGameArt

| Attribute | Detail |
|-----------|--------|
| **URL** | https://opengameart.org/content/roguelikerpg-pack-1700-tiles |
| **License** | Check OpenGameArt page |
| **Resolution** | 16x16 |
| **What's Included** | 1,700+ tiles for various environments, UI elements |
| **Quality Rating** | 7/10 |
| **Dark Dungeon Fit** | 7/10 |

---

## TIER 3: Pixel Art Creation Tools

### Free Sprite Editors (for custom sprites)

| Tool | URL | Platform | Best For |
|------|-----|----------|----------|
| **Piskel** | https://www.piskelapp.com/ | Browser (free) | Quick sprite edits, animation preview, export to sprite sheets. Easiest to start with. |
| **Pixelorama** | https://orama-interactive.itch.io/pixelorama | Desktop (free, open source) | Full-featured editor built on Godot. Onion skinning, layers, frame tags. Best free Aseprite alternative. |
| **LibreSprite** | https://libresprite.github.io/ | Desktop (free, open source) | Fork of old Aseprite. Real-time preview, multi-sprite editing. |

**Recommendation:** Use **Piskel** for quick edits and previews (zero setup, runs in browser). Use **Pixelorama** for serious sprite creation work.

### AI Sprite Generators

| Tool | URL | Free Tier | Quality | Notes |
|------|-----|-----------|---------|-------|
| **Perchance AI Pixel Art** | https://perchance.org/ai-pixel-art-generator | Unlimited, no signup | 5/10 | Fun for ideation, not production-ready. Results need heavy cleanup. |
| **PixelLab** | https://www.pixellab.ai/ | 40 generations free | 7/10 | Best AI tool for sprites. Generates animations, directional variants. Aseprite plugin. $12/mo after trial. |
| **PixelBox (LlamaGen)** | https://llamagen.ai/ai-pixel-art-generator | Free | 5/10 | Walk/run/idle/attack animations from text. Output needs cleanup. |
| **SEELE AI** | https://www.seeles.ai/features/tools/sprite.html | Free, no login | 5/10 | Quick generation, royalty-free output. |

**Honest assessment:** AI generators are useful for concept exploration and generating base sprites to manually refine. None produce game-ready sprites without manual cleanup. For a polished game, hand-crafted or pre-made asset packs will always look better.

### Character Generators (Non-AI)

| Tool | URL | Notes |
|------|-----|-------|
| **Universal LPC Spritesheet Generator** | https://sanderfrenken.github.io/Universal-LPC-Spritesheet-Character-Generator/ | Build characters from parts (body, armor, weapons). Great for RPG NPCs. Side-view focus, not ideal for top-down. |
| **Avatars In Pixels** | https://www.avatarsinpixels.com/ | Simple avatar maker. More for profile pictures than game sprites. |

---

## TIER 4: Learning Resources

### Lospec Tutorials (Best Source)

| Tutorial | URL | Relevance |
|----------|-----|-----------|
| **Dungeon Basics** | https://lospec.com/pixel-art-tutorials/dungeon-basics-by-luke-sadface | How to draw dungeon tiles from scratch |
| **Character Creation Guide** | https://lospec.com/pixel-art-tutorials/character-creation-guide-by-luke-sadface | How to design pixel art characters |
| **Draw 16x16 Character** | https://lospec.com/pixel-art-tutorials/how-to-pixel-art-tutorials-6-draw-16x16-character-by-dual-core-studio | Exactly the resolution our game uses |
| **Pixel Art Where to Start** | https://lospec.com/pixel-art-where-to-start | Complete beginner guide |
| **All Tutorials** | https://lospec.com/pixel-art-tutorials | Searchable by tag |

### Lospec Palettes

| Resource | URL | Notes |
|----------|-----|-------|
| **Palette List** | https://lospec.com/palette-list | Find palettes that match the game's existing dark purple/warm orange scheme |

---

## RECOMMENDED INTEGRATION STRATEGY

### Phase 1: Quick Win with 0x72 DungeonTileset II

**Effort:** Medium (need to add image loading system)
**Impact:** Massive visual upgrade

1. Download 0x72 DungeonTileset II Extended
2. Add a simple sprite sheet loader to the game:
   ```javascript
   // New file: src/sprites.js
   const spriteSheet = new Image();
   spriteSheet.src = 'assets/tileset.png';

   function drawSprite(ctx, sx, sy, sw, sh, dx, dy, dw, dh) {
     ctx.drawImage(spriteSheet, sx, sy, sw, sh, dx, dy, dw, dh);
   }
   ```
3. Replace procedural enemy/player rendering with sprite sheet draws
4. Keep the existing lighting/effects pipeline (it works on any rendered content)

### Phase 2: Animation System

1. Define animation frames as sprite sheet coordinates
2. Add frame-based animation to player and enemies
3. Replace the current `walkFrame`/`wingFrame` counters with proper sprite animation states

### Phase 3: Environment Polish

1. Replace code-drawn floor/wall tiles with tileset tiles
2. Add environmental props from CraftPix packs
3. Add door/chest/trap animations

### What NOT to Change

- Keep the lighting system (multiplicative colored lighting, shadow casting)
- Keep the post-processing pipeline (bloom, god rays, film grain, etc.)
- Keep the particle system
- Keep camera shake, hit stop, slow-mo

These systems are render-pipeline effects that work equally well on sprite-based or procedurally-drawn content. They are what make the game visually distinctive.

---

## SPECIFIC SPRITE MAPPING TO GAME ENTITIES

| Game Entity | Current Rendering | Best Sprite Source | Specific Sprite |
|-------------|-------------------|-------------------|-----------------|
| **Player (Knight)** | 16x16 code array | 0x72 DungeonTileset II | Knight character (animated walk, idle) |
| **Slime** | Procedural circles | 0x72 DungeonTileset II | Slug/slime enemy (animated) |
| **Bat** | Procedural with wingFrame | 0x72 DungeonTileset II | Flying demon/bat (animated wings) |
| **Skeleton Archer** | Procedural | 0x72 DungeonTileset II OR Anokolisa | Skeleton variants (Anokolisa has archer-specific) |
| **Dark Knight Boss** | Procedural | 0x72 DungeonTileset II | Demon/orc warrior (larger sprite, 32x32) |
| **Dungeon Floors** | Code-drawn tiles cached | 0x72 DungeonTileset II | Floor tile variations |
| **Dungeon Walls** | Code-drawn tiles cached | 0x72 DungeonTileset II | High/low wall tiles |
| **Doors** | Procedural | 0x72 Extended | 3 door variants |
| **Chests** | Procedural | 0x72 DungeonTileset II | Chest (open/closed) |
| **Torches** | Procedural with particles | 0x72 Extended | Animated wall/floor torches |
| **Potions** | Procedural | 0x72 Extended | 8 potion color variants |
| **Weapons** | Not shown (attack arc) | Anokolisa | 50 weapon sprites |

---

## LICENSE SUMMARY

| Resource | License | Attribution Required | Commercial Use |
|----------|---------|---------------------|----------------|
| 0x72 DungeonTileset II | CC0 | No | Yes |
| 0x72 Extended (Niji) | CC0 | No | Yes |
| Dungeon Crawl Tiles | CC0 | No (appreciated) | Yes |
| Kenney Assets | CC0 | No | Yes |
| Anokolisa Pack | Custom free | Check terms doc | Check terms |
| CraftPix Free Packs | CraftPix free license | Check terms | Yes (with terms) |

**Safest picks (zero legal risk):** 0x72, Kenney, Dungeon Crawl -- all CC0.

---

## FINAL RECOMMENDATION

**For maximum visual impact with minimum effort:**

Use **0x72 DungeonTileset II Extended** as the primary art source. It is:
- The exact resolution the game uses (16x16)
- CC0 licensed (zero restrictions)
- The single most popular free dungeon tileset in the indie game community
- Cohesive dark dungeon art style matching "Depths of the Dark Keep"
- Contains all entity types the game already has (knight, slimes, skeletons, bats, boss-viable enemies)
- Actively maintained and extended

Supplement with **Dungeon Crawl Stone Soup tiles** for additional monster variety and item icons, and **CraftPix packs** for environmental props and interactive objects.

The biggest engineering task is not finding sprites -- it is adding an image loading and sprite animation system to replace the current code-array rendering approach. Once that infrastructure exists, swapping in any of these resources becomes trivial.

---

## Sources

- [0x72 DungeonTileset II](https://0x72.itch.io/dungeontileset-ii)
- [DungeonTileset II Extended by Niji](https://nijikokun.itch.io/dungeontileset-ii-extended)
- [Anokolisa Dungeon Crawler Pack](https://anokolisa.itch.io/dungeon-crawler-pixel-art-asset-pack)
- [Dungeon Crawl 32x32 Tiles](https://opengameart.org/content/dungeon-crawl-32x32-tiles)
- [Dungeon Crawl Supplemental](https://opengameart.org/content/dungeon-crawl-32x32-tiles-supplemental)
- [Kenney Roguelike Caves & Dungeons](https://kenney.nl/assets/roguelike-caves-dungeons)
- [Kenney Tiny Dungeon](https://kenney.nl/assets/tiny-dungeon)
- [32rogues by Seth](https://sethbb.itch.io/32rogues)
- [CraftPix Dungeon Pack](https://craftpix.net/freebies/free-2d-top-down-pixel-dungeon-asset-pack/)
- [CraftPix Dungeon Objects](https://craftpix.net/freebies/free-pixel-art-dungeon-objects-asset-pack/)
- [CraftPix Dungeon Props](https://craftpix.net/freebies/free-pixel-dungeon-props-and-objects-asset-pack/)
- [Roguelike/RPG 1700+ Tiles](https://opengameart.org/content/roguelikerpg-pack-1700-tiles)
- [itch.io Free Dungeon + Pixel Art](https://itch.io/game-assets/free/tag-dungeon/tag-pixel-art)
- [itch.io Free Roguelike + Pixel Art](https://itch.io/game-assets/free/tag-pixel-art/tag-roguelike)
- [Piskel](https://www.piskelapp.com/)
- [Pixelorama](https://orama-interactive.itch.io/pixelorama)
- [LibreSprite](https://libresprite.github.io/)
- [PixelLab](https://www.pixellab.ai/)
- [Perchance AI Pixel Art](https://perchance.org/ai-pixel-art-generator)
- [Lospec Tutorials](https://lospec.com/pixel-art-tutorials)
- [Lospec Dungeon Tutorials](https://lospec.com/pixel-art-tutorials/tags/dungeon)
- [Lospec Character Tutorials](https://lospec.com/pixel-art-tutorials/tags/character)
- [Universal LPC Spritesheet Generator](https://sanderfrenken.github.io/Universal-LPC-Spritesheet-Character-Generator/)
