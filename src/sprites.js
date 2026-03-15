"use strict";

const SPRITE_BASE = 'assets/0x72_DungeonTilesetII_v1.7/frames/';
const SPRITE_SCALE = 3; // Draw 16x16 sprites at 3x = 48x48 on screen

// Sprite definitions - maps game entities to sprite frames
const SPRITE_DEFS = {
  knight: {
    idle: { frames: 4, prefix: 'knight_m_idle_anim_f', speed: 0.15 },
    run: { frames: 4, prefix: 'knight_m_run_anim_f', speed: 0.1 },
    hit: { frames: 1, prefix: 'knight_m_hit_anim_f', speed: 0.1 },
  },
  slime: {
    idle: { frames: 4, prefix: 'muddy_anim_f', speed: 0.2 },
  },
  bat: {
    idle: { frames: 4, prefix: 'imp_idle_anim_f', speed: 0.12 },
    run: { frames: 4, prefix: 'imp_run_anim_f', speed: 0.1 },
  },
  skeleton: {
    idle: { frames: 4, prefix: 'skelet_idle_anim_f', speed: 0.2 },
    run: { frames: 4, prefix: 'skelet_run_anim_f', speed: 0.12 },
  },
  boss: {
    idle: { frames: 4, prefix: 'big_demon_idle_anim_f', speed: 0.15 },
    run: { frames: 4, prefix: 'big_demon_run_anim_f', speed: 0.1 },
  },
  wizard: {
    idle: { frames: 4, prefix: 'wizzard_m_idle_anim_f', speed: 0.15 },
    run: { frames: 4, prefix: 'wizzard_m_run_anim_f', speed: 0.1 },
    hit: { frames: 1, prefix: 'wizzard_m_hit_anim_f', speed: 0.1 },
  },
  elf: {
    idle: { frames: 4, prefix: 'elf_m_idle_anim_f', speed: 0.15 },
    run: { frames: 4, prefix: 'elf_m_run_anim_f', speed: 0.1 },
    hit: { frames: 1, prefix: 'elf_m_hit_anim_f', speed: 0.1 },
  },
  lizard: {
    idle: { frames: 4, prefix: 'lizard_m_idle_anim_f', speed: 0.15 },
    run: { frames: 4, prefix: 'lizard_m_run_anim_f', speed: 0.1 },
    hit: { frames: 1, prefix: 'lizard_m_hit_anim_f', speed: 0.1 },
  },
  weapon_sword: {
    idle: { frames: 1, prefix: 'weapon_knight_sword', speed: 1, noIndex: true },
  },
  weapon_green_magic_staff: {
    idle: { frames: 1, prefix: 'weapon_green_magic_staff', speed: 1, noIndex: true },
  },
  weapon_bow: {
    idle: { frames: 1, prefix: 'weapon_bow', speed: 1, noIndex: true },
  },
  weapon_axe: {
    idle: { frames: 1, prefix: 'weapon_axe', speed: 1, noIndex: true },
  },
  flask_red: {
    idle: { frames: 1, prefix: 'flask_big_red', speed: 1, noIndex: true },
  },
  flask_blue: {
    idle: { frames: 1, prefix: 'flask_big_blue', speed: 1, noIndex: true },
  },
  flask_yellow: {
    idle: { frames: 1, prefix: 'flask_big_yellow', speed: 1, noIndex: true },
  },
  ui_heart_full: {
    idle: { frames: 1, prefix: 'ui_heart_full', speed: 1, noIndex: true },
  },
  ui_heart_half: {
    idle: { frames: 1, prefix: 'ui_heart_half', speed: 1, noIndex: true },
  },
  ui_heart_empty: {
    idle: { frames: 1, prefix: 'ui_heart_empty', speed: 1, noIndex: true },
  },
};

// Image cache
const imageCache = new Map();
let loadedCount = 0;
let totalCount = 0;
let allLoaded = false;

export function isSpritesLoaded() { return allLoaded; }

// Load all sprites
export function loadAllSprites() {
  const promises = [];
  for (const [name, anims] of Object.entries(SPRITE_DEFS)) {
    for (const [animName, anim] of Object.entries(anims)) {
      for (let i = 0; i < anim.frames; i++) {
        const filename = anim.noIndex ? `${anim.prefix}.png` : `${anim.prefix}${i}.png`;
        const key = `${name}_${animName}_${i}`;
        totalCount++;
        const img = new Image();
        img.src = SPRITE_BASE + filename;
        const p = new Promise((resolve) => {
          img.onload = () => {
            imageCache.set(key, img);
            // Also create flipped version
            const flipped = document.createElement('canvas');
            flipped.width = img.width;
            flipped.height = img.height;
            const fctx = flipped.getContext('2d');
            fctx.scale(-1, 1);
            fctx.drawImage(img, -img.width, 0);
            imageCache.set(key + '_flip', flipped);
            loadedCount++;
            if (loadedCount >= totalCount) allLoaded = true;
            resolve();
          };
          img.onerror = () => {
            console.warn('Failed to load sprite:', SPRITE_BASE + filename);
            loadedCount++;
            if (loadedCount >= totalCount) allLoaded = true;
            resolve();
          };
        });
        promises.push(p);
      }
    }
  }
  // Also load tile images
  promises.push(loadTileImages());

  return Promise.all(promises);
}

// Get animation frame key for an entity
export function getSpriteFrame(spriteName, animName, time) {
  const def = SPRITE_DEFS[spriteName]?.[animName];
  if (!def) return null;
  const frameIndex = Math.floor(time / def.speed) % def.frames;
  return `${spriteName}_${animName}_${frameIndex}`;
}

// Draw a sprite centered on (x, y) with optional horizontal flip
export function drawSprite(ctx, spriteName, animName, time, x, y, flipH, scale) {
  if (!allLoaded) return false;
  const key = getSpriteFrame(spriteName, animName, time);
  if (!key) return false;
  const img = imageCache.get(flipH ? key + '_flip' : key);
  if (!img) return false;

  const s = (scale || SPRITE_SCALE);
  const w = (img.width || 16) * s;
  const h = (img.height || 16) * s;

  ctx.imageSmoothingEnabled = false; // Keep pixel art crisp
  ctx.drawImage(img, Math.floor(x - w / 2), Math.floor(y - h / 2), w, h);
  ctx.imageSmoothingEnabled = true;
  return true;
}

// Draw a colored glow halo underneath an entity
export function drawEntityGlow(ctx, x, y, radius, color, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = alpha || 0.15;
  const g = ctx.createRadialGradient(x, y, 2, x, y, radius);
  g.addColorStop(0, color);
  g.addColorStop(0.5, color);
  g.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = g;
  ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

// Draw sprite with colored outline glow (rim light effect)
export function drawSpriteWithGlow(ctx, spriteName, animName, time, x, y, flipH, scale, glowColor) {
  if (!allLoaded) return false;
  const key = getSpriteFrame(spriteName, animName, time);
  if (!key) return false;
  const img = imageCache.get(flipH ? key + '_flip' : key);
  if (!img) return false;

  const s = (scale || SPRITE_SCALE);
  const w = (img.width || 16) * s;
  const h = (img.height || 16) * s;
  const dx = Math.floor(x - w / 2);
  const dy = Math.floor(y - h / 2);

  ctx.imageSmoothingEnabled = false;

  // Draw glow outline: sprite drawn at 4 offsets in glow color
  if (glowColor) {
    // Create tinted version for glow
    const tmp = document.createElement('canvas');
    tmp.width = w + 4;
    tmp.height = h + 4;
    const tctx = tmp.getContext('2d');
    tctx.imageSmoothingEnabled = false;
    tctx.drawImage(img, 2, 2, w, h);
    tctx.globalCompositeOperation = 'source-atop';
    tctx.fillStyle = glowColor;
    tctx.fillRect(0, 0, tmp.width, tmp.height);
    tctx.globalCompositeOperation = 'source-over';

    ctx.globalAlpha = 0.5;
    ctx.drawImage(tmp, dx - 2 - 1, dy - 2);
    ctx.drawImage(tmp, dx - 2 + 1, dy - 2);
    ctx.drawImage(tmp, dx - 2, dy - 2 - 1);
    ctx.drawImage(tmp, dx - 2, dy - 2 + 1);
    ctx.globalAlpha = 1;
  }

  // Draw main sprite
  ctx.drawImage(img, dx, dy, w, h);
  ctx.imageSmoothingEnabled = true;
  return true;
}

// ============================================================
// TILE IMAGE LOADING (floor, wall, door, decoration tiles)
// ============================================================
const TILE_FILES = {
  floors: ['floor_1.png', 'floor_2.png', 'floor_3.png', 'floor_4.png', 'floor_5.png', 'floor_6.png', 'floor_7.png', 'floor_8.png'],
  wall_mid: 'wall_mid.png',
  wall_left: 'wall_left.png',
  wall_right: 'wall_right.png',
  wall_top_mid: 'wall_top_mid.png',
  wall_top_left: 'wall_top_left.png',
  wall_top_right: 'wall_top_right.png',
  edge_down: 'edge_down.png',
  // Wall decorations
  wall_banner_red: 'wall_banner_red.png',
  wall_banner_blue: 'wall_banner_blue.png',
  wall_banner_green: 'wall_banner_green.png',
  wall_hole_1: 'wall_hole_1.png',
  wall_hole_2: 'wall_hole_2.png',
  wall_goo: 'wall_goo.png',
  wall_goo_base: 'wall_goo_base.png',
  // Props
  column: 'column.png',
  skull: 'skull.png',
  crate: 'crate.png',
  // Door
  doors_leaf_closed: 'doors_leaf_closed.png',
  doors_leaf_open: 'doors_leaf_open.png',
  doors_frame_left: 'doors_frame_left.png',
  doors_frame_right: 'doors_frame_right.png',
  doors_frame_top: 'doors_frame_top.png',
};

const tileImageCache = new Map();
let tilesLoaded = false;

export function isTilesLoaded() { return tilesLoaded; }

export function getTileImage(name) {
  return tileImageCache.get(name) || null;
}

export function loadTileImages() {
  const promises = [];
  const allFiles = {};

  // Collect floor files
  for (const floorFile of TILE_FILES.floors) {
    const name = floorFile.replace('.png', '');
    allFiles[name] = floorFile;
  }

  // Collect all other tile files
  for (const [key, val] of Object.entries(TILE_FILES)) {
    if (key === 'floors') continue;
    allFiles[key] = val;
  }

  for (const [name, filename] of Object.entries(allFiles)) {
    const img = new Image();
    img.src = SPRITE_BASE + filename;
    const p = new Promise((resolve) => {
      img.onload = () => {
        tileImageCache.set(name, img);
        resolve();
      };
      img.onerror = () => {
        console.warn('Failed to load tile:', SPRITE_BASE + filename);
        resolve();
      };
    });
    promises.push(p);
  }

  return Promise.all(promises).then(() => {
    tilesLoaded = true;
    console.log('Tile images loaded:', tileImageCache.size);
  });
}

// Draw sprite with white flash (damage effect)
export function drawSpriteFlash(ctx, spriteName, animName, time, x, y, flipH, scale) {
  if (!allLoaded) return false;
  const key = getSpriteFrame(spriteName, animName, time);
  if (!key) return false;
  const img = imageCache.get(flipH ? key + '_flip' : key);
  if (!img) return false;

  const s = (scale || SPRITE_SCALE);
  const w = (img.width || 16) * s;
  const h = (img.height || 16) * s;
  const dx = Math.floor(x - w / 2);
  const dy = Math.floor(y - h / 2);

  ctx.imageSmoothingEnabled = false;

  // Draw to a temporary canvas to apply white flash via compositing
  const tmp = document.createElement('canvas');
  tmp.width = w;
  tmp.height = h;
  const tctx = tmp.getContext('2d');
  tctx.imageSmoothingEnabled = false;
  // Draw the sprite
  tctx.drawImage(img, 0, 0, w, h);
  // Flash white: fill white only where sprite pixels exist
  tctx.globalCompositeOperation = 'source-atop';
  tctx.fillStyle = '#ffffff';
  tctx.fillRect(0, 0, w, h);
  tctx.globalCompositeOperation = 'source-over';

  ctx.drawImage(tmp, dx, dy);
  ctx.imageSmoothingEnabled = true;
  return true;
}
