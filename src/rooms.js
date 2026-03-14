"use strict";

import { TILE, PAL, RAMP, W, H } from './config.js';
import { rand, randInt } from './utils.js';
import { createEnemy } from './enemies.js';
import { player } from './player.js';
import { generateTorches, initFog, drawTorches, drawFog, torches } from './lighting.js';
import { initEmbers } from './effects.js';
import { getTileImage, isTilesLoaded } from './sprites.js';

export let rooms = [];
export let currentRoom = 0;
export let roomGrid = [];
export let roomW = 0, roomH = 0;
export let roomPxW = 0, roomPxH = 0;
export let roomOffX = 0, roomOffY = 0;
export let doorOpen = false;
export let doorAnimTimer = 0;
export let doorAnimState = 0;
export let bossEntranceTimer = 0;
export let bossEntranceActive = false;

// Wall segments for shadow casting (computed once per room load)
let wallSegments = [];
export function getWallSegments() { return wallSegments; }

let floorDetails = [];
let wallDetails = [];
let _roomBgCanvas = null;

export let enemies = [];
export let projectiles = [];
export let powerups = [];

export function setDoorOpen(val) { doorOpen = val; }
export function setDoorAnimState(val) { doorAnimState = val; }
export function setDoorAnimTimer(val) { doorAnimTimer = val; }
export function setBossEntranceActive(val) { bossEntranceActive = val; }
export function setBossEntranceTimer(val) { bossEntranceTimer = val; }

export function getRoomState() {
  return {
    rooms, currentRoom, roomGrid, roomW, roomH, roomPxW, roomPxH,
    roomOffX, roomOffY, doorOpen, enemies, projectiles, powerups,
    doorAnimTimer, doorAnimState, bossEntranceTimer, bossEntranceActive,
  };
}

export function generateRooms() {
  rooms = [];
  const numRooms = randInt(4, 5);
  for (let i = 0; i < numRooms; i++) {
    const isBoss = i === numRooms - 1;
    const w = isBoss ? 21 : randInt(17, 23);
    const h = isBoss ? 17 : randInt(13, 17);
    const enemyList = [];
    if (isBoss) {
      enemyList.push({ type: "boss" });
    } else {
      const difficulty = i + 1;
      const numEnemies = randInt(2 + difficulty, 3 + difficulty * 2);
      for (let j = 0; j < numEnemies; j++) {
        const roll = Math.random();
        if (roll < 0.4) enemyList.push({ type: "slime" });
        else if (roll < 0.7) enemyList.push({ type: "bat" });
        else enemyList.push({ type: "skeleton" });
      }
    }
    rooms.push({ w, h, enemies: enemyList, isBoss });
  }
}

export function loadRoom(index) {
  currentRoom = index;
  const room = rooms[index];
  roomW = room.w;
  roomH = room.h;
  roomPxW = roomW * TILE;
  roomPxH = roomH * TILE;
  roomOffX = Math.floor((W - roomPxW) / 2);
  roomOffY = Math.floor((H - roomPxH) / 2);

  roomGrid = [];
  for (let y = 0; y < roomH; y++) {
    roomGrid[y] = [];
    for (let x = 0; x < roomW; x++) {
      if (y === 0 || y === roomH - 1 || x === 0 || x === roomW - 1) {
        roomGrid[y][x] = 1;
      } else {
        roomGrid[y][x] = 0;
      }
    }
  }

  if (!room.isBoss) {
    const patches = randInt(1, 3);
    for (let p = 0; p < patches; p++) {
      const px = randInt(3, roomW - 5);
      const py = randInt(3, roomH - 5);
      const pw = randInt(1, 3);
      const ph = randInt(1, 2);
      for (let dy = 0; dy < ph; dy++) {
        for (let dx = 0; dx < pw; dx++) {
          if (py + dy > 0 && py + dy < roomH - 1 && px + dx > 0 && px + dx < roomW - 1) {
            roomGrid[py + dy][px + dx] = 1;
          }
        }
      }
    }
  }

  const spawnTX = 2, spawnTY = Math.floor(roomH / 2);
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const ty = spawnTY + dy, tx = spawnTX + dx;
      if (ty > 0 && ty < roomH - 1 && tx > 0 && tx < roomW - 1) {
        roomGrid[ty][tx] = 0;
      }
    }
  }

  enemies = [];
  projectiles = [];
  powerups = [];
  for (const edef of room.enemies) {
    let ex, ey, attempts = 0;
    do {
      ex = randInt(4, roomW - 5);
      ey = randInt(3, roomH - 4);
      attempts++;
    } while ((roomGrid[ey][ex] === 1 || (Math.abs(ex - spawnTX) < 4 && Math.abs(ey - spawnTY) < 3)) && attempts < 50);
    const wx = roomOffX + ex * TILE + TILE / 2;
    const wy = roomOffY + ey * TILE + TILE / 2;
    enemies.push(createEnemy(edef.type, wx, wy));
  }

  doorOpen = false;
  doorAnimState = 0;
  doorAnimTimer = 0;

  generateTorches();
  generateFloorDetails();
  generateWallTileCache();
  initFog();
  initEmbers(torches);

  computeWallSegments();
  bakeRoomBackground();

  if (room.isBoss) {
    bossEntranceActive = true;
    bossEntranceTimer = 1.5;
  } else {
    bossEntranceActive = false;
    bossEntranceTimer = 0;
  }

  player.x = roomOffX + spawnTX * TILE + TILE / 2;
  player.y = roomOffY + spawnTY * TILE + TILE / 2;
}

// ============================================================
// PRE-CACHED WALL TILE VARIATIONS (offscreen canvas)
// ============================================================
let wallTileCache = [];
let floorTileCache = [];

function generateWallTileCache() {
  wallTileCache = [];
  floorTileCache = [];

  // Generate 3 wall tile variations
  for (let v = 0; v < 3; v++) {
    const c = document.createElement("canvas");
    c.width = TILE;
    c.height = TILE;
    const cx = c.getContext("2d");
    drawWallTileVariant(cx, v);
    wallTileCache.push(c);
  }

  // Generate 4 floor tile variations
  for (let v = 0; v < 4; v++) {
    const c = document.createElement("canvas");
    c.width = TILE;
    c.height = TILE;
    const cx = c.getContext("2d");
    drawFloorTileVariant(cx, v);
    floorTileCache.push(c);
  }
}

function drawWallTileVariant(cx, variant) {
  // Base wall color
  cx.fillStyle = RAMP.stone_wall[2];
  cx.fillRect(0, 0, TILE, TILE);

  // Stone brick pattern with 3 layout variations
  const brickH = 8;
  const brickOffsets = [0, TILE / 3, TILE / 2];
  const offset = brickOffsets[variant];

  for (let by = 0; by < TILE; by += brickH) {
    const rowOffset = (Math.floor(by / brickH) % 2 === 0) ? 0 : offset;
    // Mortar lines (horizontal)
    cx.fillStyle = RAMP.stone_wall[4];
    cx.fillRect(0, by, TILE, 1);
    // Vertical mortar with varied spacing
    const brickW = variant === 0 ? TILE / 2 : (variant === 1 ? TILE / 3 : TILE / 2);
    for (let bx = rowOffset; bx < TILE + brickW; bx += brickW) {
      cx.fillRect(bx % TILE, by, 1, brickH);
    }
  }

  // Brick face highlight (top-left light source)
  for (let by = 0; by < TILE; by += brickH) {
    cx.fillStyle = RAMP.stone_wall[1];
    cx.fillRect(1, by + 1, TILE - 2, 2);
    // Brick face shadow (bottom-right)
    cx.fillStyle = RAMP.stone_wall[3];
    cx.fillRect(1, by + brickH - 2, TILE - 2, 1);
  }

  // Top edge highlight (light from above)
  cx.fillStyle = RAMP.stone_wall[0];
  cx.fillRect(0, 0, TILE, 1);

  // Bottom shadow (ambient occlusion)
  cx.fillStyle = RAMP.stone_wall[4];
  cx.fillRect(0, TILE - 3, TILE, 3);
  cx.fillStyle = "rgba(0,0,0,0.3)";
  cx.fillRect(0, TILE - 2, TILE, 2);

  // Variant-specific detail
  if (variant === 2) {
    // Extra weathering
    cx.fillStyle = RAMP.stone_wall[3];
    cx.fillRect(4, 4, 3, 2);
    cx.fillRect(20, 14, 4, 2);
  }
}

function drawFloorTileVariant(cx, variant) {
  // Base floor
  const baseColors = [
    RAMP.stone_floor[1],
    RAMP.stone_floor[2],
    "#282838",
    "#24202e"
  ];
  cx.fillStyle = baseColors[variant];
  cx.fillRect(0, 0, TILE, TILE);

  // Stone tile pattern - subtle grid
  cx.fillStyle = "rgba(0,0,0,0.1)";
  cx.fillRect(0, 0, TILE, 1);
  cx.fillRect(0, 0, 1, TILE);
  // Inner highlight (top-left light)
  cx.fillStyle = "rgba(255,255,255,0.03)";
  cx.fillRect(1, 1, TILE - 2, 1);
  cx.fillRect(1, 1, 1, TILE - 2);

  // Per-variant detail
  switch (variant) {
    case 0:
      // Subtle stone grain
      cx.fillStyle = "rgba(255,255,255,0.02)";
      cx.fillRect(6, 8, 8, 1);
      cx.fillRect(14, 18, 10, 1);
      cx.fillRect(4, 24, 6, 1);
      break;
    case 1:
      // Slightly different grain
      cx.fillStyle = "rgba(0,0,0,0.04)";
      cx.fillRect(10, 4, 1, 12);
      cx.fillRect(22, 10, 1, 14);
      break;
    case 2:
      // Worn spot
      cx.fillStyle = "rgba(255,255,255,0.02)";
      cx.fillRect(8, 8, 14, 14);
      cx.fillStyle = "rgba(0,0,0,0.03)";
      cx.fillRect(10, 10, 10, 10);
      break;
    case 3:
      // Rough texture
      cx.fillStyle = "rgba(0,0,0,0.05)";
      cx.fillRect(4, 6, 2, 2);
      cx.fillRect(16, 12, 3, 2);
      cx.fillRect(24, 22, 2, 3);
      cx.fillRect(8, 20, 2, 2);
      break;
  }
}

function generateFloorDetails() {
  floorDetails = [];
  wallDetails = [];
  for (let y = 0; y < roomH; y++) {
    for (let x = 0; x < roomW; x++) {
      const seed = (x * 73 + y * 137 + currentRoom * 311) % 256;
      if (roomGrid[y][x] === 0) {
        if (seed < 25) {
          floorDetails.push({ x, y, type: "crack", variant: seed % 3 });
        } else if (seed < 35) {
          floorDetails.push({ x, y, type: "moss", variant: seed % 2 });
        } else if (seed < 42) {
          floorDetails.push({ x, y, type: "puddle", variant: seed % 2 });
        } else if (seed < 52) {
          floorDetails.push({ x, y, type: "pebbles", variant: seed % 3 });
        } else if (seed < 58) {
          floorDetails.push({ x, y, type: "bones", variant: seed % 2 });
        } else if (seed < 62) {
          floorDetails.push({ x, y, type: "blood", variant: seed % 3 });
        }
      } else {
        if (seed < 18) {
          wallDetails.push({ x, y, type: "skull" });
        } else if (seed < 45) {
          wallDetails.push({ x, y, type: "moss" });
        } else if (seed < 65) {
          wallDetails.push({ x, y, type: "vine" });
        }
      }
    }
  }
}

// Dithered drawing helper
function drawDithered2(ctx, x, y, w, h, color1, color2) {
  const s = 2;
  for (let dy = 0; dy < h; dy += s) {
    for (let dx = 0; dx < w; dx += s) {
      ctx.fillStyle = (((dx / s) + (dy / s)) % 2 === 0) ? color1 : color2;
      ctx.fillRect(x + dx, y + dy, s, s);
    }
  }
}

// ============================================================
// PRE-RENDERED ROOM BACKGROUND CACHE
// ============================================================
export function bakeRoomBackground() {
  // Guard: don't bake if no room is loaded yet
  if (roomH === 0 || roomW === 0) return;
  if (!_roomBgCanvas) {
    _roomBgCanvas = document.createElement("canvas");
  }
  _roomBgCanvas.width = W;
  _roomBgCanvas.height = H;
  const ctx = _roomBgCanvas.getContext("2d");

  // Fill entire canvas with background color
  ctx.fillStyle = PAL.bg;
  ctx.fillRect(0, 0, W, H);

  // Floor and wall tiles
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < roomH; y++) {
    for (let x = 0; x < roomW; x++) {
      const px = roomOffX + x * TILE;
      const py = roomOffY + y * TILE;
      const seed = (x * 73 + y * 137 + currentRoom * 47) % 8;

      if (roomGrid[y][x] === 0) {
        // Draw floor tile - prefer sprite atlas images
        const floorImg = isTilesLoaded() ? getTileImage('floor_' + (seed + 1)) : null;
        if (floorImg) {
          // Rotation/flip for variety (64 variations from 8 tiles)
          ctx.save();
          ctx.translate(px + TILE/2, py + TILE/2);
          const rotSeed = (x * 31 + y * 97 + currentRoom * 53) % 8;
          const rotation = (rotSeed % 4) * Math.PI / 2;
          const flipX = rotSeed >= 4 ? -1 : 1;
          ctx.rotate(rotation);
          ctx.scale(flipX, 1);
          ctx.imageSmoothingEnabled = false;
          ctx.drawImage(floorImg, -TILE/2, -TILE/2, TILE, TILE);
          ctx.restore();
        } else if (floorTileCache.length > 0) {
          ctx.drawImage(floorTileCache[seed % floorTileCache.length], px, py);
        } else {
          ctx.fillStyle = RAMP.stone_floor[1 + (seed % 2)];
          ctx.fillRect(px, py, TILE, TILE);
        }

        // Ambient occlusion: darken floor next to walls
        if (y > 0 && roomGrid[y - 1][x] === 1) {
          ctx.fillStyle = "rgba(0,0,0,0.2)";
          ctx.fillRect(px, py, TILE, 4);
          ctx.fillStyle = "rgba(0,0,0,0.1)";
          ctx.fillRect(px, py + 4, TILE, 3);
        }
        if (x > 0 && roomGrid[y][x - 1] === 1) {
          ctx.fillStyle = "rgba(0,0,0,0.15)";
          ctx.fillRect(px, py, 3, TILE);
        }
        if (y < roomH - 1 && roomGrid[y + 1][x] === 1) {
          ctx.fillStyle = "rgba(0,0,0,0.12)";
          ctx.fillRect(px, py + TILE - 3, TILE, 3);
        }
        if (x < roomW - 1 && roomGrid[y][x + 1] === 1) {
          ctx.fillStyle = "rgba(0,0,0,0.08)";
          ctx.fillRect(px + TILE - 3, py, 3, TILE);
        }
      } else {
        // Draw wall tile - prefer sprite atlas images
        if (isTilesLoaded()) {
          let tileImg = null;
          const hasFloorBelow = (y + 1 < roomH && roomGrid[y + 1][x] === 0);
          const hasFloorAbove = (y - 1 >= 0 && roomGrid[y - 1][x] === 0);
          const isLeftEdge = (x === 0 || (x > 0 && roomGrid[y][x - 1] === 0));
          const isRightEdge = (x === roomW - 1 || (x < roomW - 1 && roomGrid[y][x + 1] === 0));

          if (hasFloorBelow) {
            // Wall face visible from below - use wall_mid variants
            if (isLeftEdge) {
              tileImg = getTileImage('wall_left');
            } else if (isRightEdge) {
              tileImg = getTileImage('wall_right');
            } else {
              tileImg = getTileImage('wall_mid');
            }
          } else if (hasFloorAbove) {
            // Top of wall / edge facing down
            tileImg = getTileImage('edge_down');
          } else {
            // Wall top (not visible face)
            if (isLeftEdge) {
              tileImg = getTileImage('wall_top_left');
            } else if (isRightEdge) {
              tileImg = getTileImage('wall_top_right');
            } else {
              tileImg = getTileImage('wall_top_mid');
            }
          }

          if (tileImg) {
            ctx.drawImage(tileImg, px, py, TILE, TILE);
          } else {
            // Fallback to cached procedural wall
            const wallSeed = (x * 31 + y * 97 + currentRoom * 13) % 3;
            if (wallTileCache.length > 0) {
              ctx.drawImage(wallTileCache[wallSeed], px, py);
            }
          }
        } else {
          // Fallback: use procedural cache
          const wallSeed = (x * 31 + y * 97 + currentRoom * 13) % 3;
          if (wallTileCache.length > 0) {
            ctx.drawImage(wallTileCache[wallSeed], px, py);
          } else {
            ctx.fillStyle = RAMP.stone_wall[2];
            ctx.fillRect(px, py, TILE, TILE);
          }
        }
      }
    }
  }
  ctx.imageSmoothingEnabled = true;

  // --- FLOOR DETAILS ---
  for (const fd of floorDetails) {
    const px = roomOffX + fd.x * TILE;
    const py = roomOffY + fd.y * TILE;

    if (fd.type === "crack") {
      ctx.fillStyle = PAL.floorCrack;
      if (fd.variant === 0) {
        // Lightning-bolt crack
        ctx.fillRect(px + 8, py + 4, 1, 6);
        ctx.fillRect(px + 9, py + 8, 4, 1);
        ctx.fillRect(px + 12, py + 8, 1, 8);
        ctx.fillRect(px + 13, py + 14, 5, 1);
        ctx.fillRect(px + 17, py + 14, 1, 6);
        // Crack shadow
        ctx.fillStyle = "rgba(0,0,0,0.15)";
        ctx.fillRect(px + 9, py + 5, 1, 4);
        ctx.fillRect(px + 13, py + 9, 1, 6);
      } else if (fd.variant === 1) {
        // Branching crack
        ctx.fillRect(px + 4, py + 14, 16, 1);
        ctx.fillRect(px + 10, py + 8, 1, 6);
        ctx.fillRect(px + 18, py + 14, 1, 8);
        ctx.fillRect(px + 8, py + 14, 1, 5);
        // Shadow
        ctx.fillStyle = "rgba(0,0,0,0.12)";
        ctx.fillRect(px + 5, py + 15, 14, 1);
      } else {
        // Diagonal crack
        ctx.fillRect(px + 16, py + 4, 1, 6);
        ctx.fillRect(px + 15, py + 9, 1, 4);
        ctx.fillRect(px + 14, py + 12, 1, 6);
        ctx.fillRect(px + 12, py + 16, 3, 1);
        ctx.fillRect(px + 10, py + 17, 3, 1);
      }
    } else if (fd.type === "moss") {
      // Dithered green-to-stone transition
      const mossGreen1 = "#1e3a1e";
      const mossGreen2 = "#2a4a28";
      ctx.globalAlpha = 0.5;
      drawDithered2(ctx, px + 2, py + 20, 10, 6, mossGreen1, RAMP.stone_floor[2]);
      drawDithered2(ctx, px + 6, py + 18, 4, 2, mossGreen2, RAMP.stone_floor[1]);
      if (fd.variant === 1) {
        drawDithered2(ctx, px + 18, py + 4, 8, 5, mossGreen1, RAMP.stone_floor[2]);
      }
      // Moss highlight spots
      ctx.fillStyle = "#3a5a30";
      ctx.fillRect(px + 4, py + 21, 2, 1);
      ctx.fillRect(px + 8, py + 22, 1, 1);
      ctx.globalAlpha = 1;
    } else if (fd.type === "puddle") {
      ctx.globalAlpha = 0.4;
      // Puddle base (dark)
      ctx.fillStyle = "#141428";
      ctx.fillRect(px + 6, py + 8, 14, 10);
      ctx.fillRect(px + 10, py + 6, 8, 14);
      // Puddle body
      ctx.fillStyle = PAL.floorPuddle;
      ctx.fillRect(px + 7, py + 9, 12, 8);
      ctx.fillRect(px + 11, py + 7, 6, 12);
      // Reflection highlight streak
      ctx.fillStyle = "rgba(120,120,200,0.25)";
      ctx.fillRect(px + 10, py + 10, 5, 1);
      ctx.fillRect(px + 12, py + 12, 3, 1);
      // Edge highlight
      ctx.fillStyle = "rgba(80,80,160,0.15)";
      ctx.fillRect(px + 7, py + 9, 12, 1);
      ctx.globalAlpha = 1;
    } else if (fd.type === "pebbles") {
      ctx.fillStyle = "rgba(80,70,90,0.35)";
      ctx.fillRect(px + 5, py + 12, 2, 2);
      ctx.fillRect(px + 14, py + 8, 3, 2);
      ctx.fillRect(px + 22, py + 20, 2, 2);
      // Pebble highlight
      ctx.fillStyle = "rgba(120,110,130,0.2)";
      ctx.fillRect(px + 5, py + 12, 1, 1);
      ctx.fillRect(px + 14, py + 8, 1, 1);
      ctx.fillRect(px + 22, py + 20, 1, 1);
    } else if (fd.type === "bones") {
      // Scattered bone debris
      ctx.fillStyle = RAMP.bone[2];
      ctx.globalAlpha = 0.5;
      if (fd.variant === 0) {
        // Small bone
        ctx.fillRect(px + 8, py + 14, 6, 2);
        ctx.fillRect(px + 8, py + 13, 2, 1);
        ctx.fillRect(px + 12, py + 13, 2, 1);
        ctx.fillRect(px + 8, py + 16, 2, 1);
        ctx.fillRect(px + 12, py + 16, 2, 1);
      } else {
        // Skull fragment
        ctx.fillRect(px + 16, py + 10, 5, 4);
        ctx.fillRect(px + 17, py + 9, 3, 1);
        ctx.fillStyle = RAMP.bone[4];
        ctx.fillRect(px + 17, py + 11, 1, 1);
        ctx.fillRect(px + 19, py + 11, 1, 1);
      }
      ctx.globalAlpha = 1;
    } else if (fd.type === "blood") {
      // Blood stain
      ctx.globalAlpha = 0.25;
      ctx.fillStyle = RAMP.blood[3];
      if (fd.variant === 0) {
        ctx.fillRect(px + 10, py + 12, 8, 6);
        ctx.fillRect(px + 12, py + 10, 4, 10);
      } else if (fd.variant === 1) {
        ctx.fillRect(px + 6, py + 16, 10, 4);
        ctx.fillRect(px + 8, py + 14, 6, 8);
      } else {
        // Splatter pattern
        ctx.fillRect(px + 14, py + 8, 4, 3);
        ctx.fillRect(px + 18, py + 10, 3, 2);
        ctx.fillRect(px + 12, py + 12, 2, 2);
        ctx.fillRect(px + 20, py + 6, 2, 2);
      }
      // Darker center
      ctx.fillStyle = RAMP.blood[4];
      ctx.fillRect(px + 12, py + 13, 3, 3);
      ctx.globalAlpha = 1;
    }
  }

  // --- WALL DETAILS (skulls, moss, vines) ---
  for (const wd of wallDetails) {
    const px = roomOffX + wd.x * TILE;
    const py = roomOffY + wd.y * TILE;
    if (wd.type === "skull") {
      // Detailed skull decoration on wall
      ctx.fillStyle = "rgba(180,170,150,0.3)";
      ctx.fillRect(px + 10, py + 8, 10, 8);
      ctx.fillRect(px + 12, py + 6, 6, 2);
      // Skull top highlight
      ctx.fillStyle = "rgba(200,190,170,0.2)";
      ctx.fillRect(px + 12, py + 6, 6, 1);
      // Eye sockets (deep)
      ctx.fillStyle = "rgba(0,0,0,0.5)";
      ctx.fillRect(px + 12, py + 10, 2, 2);
      ctx.fillRect(px + 16, py + 10, 2, 2);
      // Faint eye glow
      ctx.fillStyle = "rgba(100,40,40,0.15)";
      ctx.fillRect(px + 12, py + 10, 2, 2);
      ctx.fillRect(px + 16, py + 10, 2, 2);
      // Nose
      ctx.fillStyle = "rgba(0,0,0,0.4)";
      ctx.fillRect(px + 14, py + 13, 2, 2);
      // Jaw
      ctx.fillStyle = "rgba(160,150,130,0.2)";
      ctx.fillRect(px + 11, py + 15, 8, 2);
      // Teeth
      ctx.fillStyle = "rgba(180,170,150,0.15)";
      ctx.fillRect(px + 12, py + 15, 1, 1);
      ctx.fillRect(px + 14, py + 15, 1, 1);
      ctx.fillRect(px + 16, py + 15, 1, 1);
    } else if (wd.type === "moss") {
      // Dithered moss growth patch
      ctx.globalAlpha = 0.35;
      drawDithered2(ctx, px + 2, py + TILE - 10, 12, 6, "#1e3a1e", RAMP.stone_wall[2]);
      drawDithered2(ctx, px + 4, py + TILE - 12, 6, 2, "#2a4a28", RAMP.stone_wall[1]);
      // Moss highlights
      ctx.fillStyle = "#3a5a30";
      ctx.fillRect(px + 4, py + TILE - 9, 2, 1);
      ctx.fillRect(px + 10, py + TILE - 7, 1, 1);
      ctx.globalAlpha = 1;
    } else if (wd.type === "vine") {
      ctx.globalAlpha = 0.3;
      const vx = px + 14;
      ctx.fillStyle = "#1e3a1e";
      ctx.fillRect(vx, py, 2, TILE);
      // Vine branches with leaves
      ctx.fillStyle = "#2a5a2a";
      ctx.fillRect(vx - 4, py + 6, 4, 2);
      ctx.fillRect(vx + 2, py + 14, 5, 2);
      ctx.fillRect(vx - 3, py + 22, 3, 2);
      // Leaf tips (brighter)
      ctx.fillStyle = "#3a6a3a";
      ctx.fillRect(vx - 4, py + 6, 1, 1);
      ctx.fillRect(vx + 6, py + 14, 1, 1);
      ctx.fillRect(vx - 3, py + 22, 1, 1);
      // Vine shadow
      ctx.fillStyle = "rgba(0,0,0,0.15)";
      ctx.fillRect(vx + 1, py, 1, TILE);
      ctx.globalAlpha = 1;
    }
  }

  // --- WALL DECORATIONS FROM SPRITE ATLAS ---
  if (isTilesLoaded()) {
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < roomH; y++) {
      for (let x = 0; x < roomW; x++) {
        if (roomGrid[y][x] !== 1) continue;
        const hasFloorBelow = (y + 1 < roomH && roomGrid[y + 1][x] === 0);
        if (!hasFloorBelow) continue;

        const px = roomOffX + x * TILE;
        const py = roomOffY + y * TILE;
        const decoSeed = (x * 73 + y * 137 + currentRoom * 311) % 100;

        if (decoSeed < 5) {
          // Banner red (5%)
          const img = getTileImage('wall_banner_red');
          if (img) ctx.drawImage(img, px, py, TILE, TILE);
        } else if (decoSeed < 8) {
          // Banner blue (3%)
          const img = getTileImage('wall_banner_blue');
          if (img) ctx.drawImage(img, px, py, TILE, TILE);
        } else if (decoSeed < 10) {
          // Banner green (2%)
          const img = getTileImage('wall_banner_green');
          if (img) ctx.drawImage(img, px, py, TILE, TILE);
        } else if (decoSeed < 15) {
          // Wall hole (5%)
          const holeImg = getTileImage(decoSeed % 2 === 0 ? 'wall_hole_1' : 'wall_hole_2');
          if (holeImg) ctx.drawImage(holeImg, px, py, TILE, TILE);
        } else if (decoSeed < 20) {
          // Wall goo (5%)
          const gooImg = getTileImage('wall_goo');
          if (gooImg) ctx.drawImage(gooImg, px, py, TILE, TILE);
        }
      }
    }
    ctx.imageSmoothingEnabled = true;
  }
}

export function drawRoom(ctx) {
  // Blit pre-rendered background (tiles, floor details, wall details)
  ctx.drawImage(_roomBgCanvas, 0, 0);

  // Door (dynamic - animated opening)
  drawDoor(ctx);

  // Torches (dynamic - flame animation)
  drawTorches(ctx);

  // Fog (dynamic - particles moving)
  drawFog(ctx);

  // NOTE: Lighting overlay, vignette, bloom, and color grading
  // are now applied in renderer.js AFTER entities and particles
  // for proper layering (darkness covers everything, not just tiles)
}

function drawDoor(ctx) {
  const doorTX = roomW - 1;
  const doorTY = Math.floor(roomH / 2);
  const doorPX = roomOffX + doorTX * TILE;
  const doorPY = roomOffY + doorTY * TILE;

  // Try sprite-based door first
  const useSprDoor = isTilesLoaded() && getTileImage('doors_frame_left');

  if (useSprDoor) {
    drawDoorSprite(ctx, doorPX, doorPY);
  } else {
    drawDoorProcedural(ctx, doorPX, doorPY);
  }
}

function drawDoorSprite(ctx, doorPX, doorPY) {
  ctx.imageSmoothingEnabled = false;
  const S = TILE; // draw at tile size

  // Draw door frame pieces
  const frameLeft = getTileImage('doors_frame_left');
  const frameRight = getTileImage('doors_frame_right');
  const frameTop = getTileImage('doors_frame_top');

  if (doorOpen && currentRoom < rooms.length - 1) {
    const openAmount = doorAnimState === 2 ? 1 : clamp01(doorAnimTimer / 0.5);

    // Dark interior behind door
    ctx.fillStyle = "#080606";
    ctx.fillRect(doorPX + 2, doorPY + 2, S - 4, S - 4);

    // Warm golden glow from threshold
    if (openAmount > 0.3) {
      const glowAlpha = (openAmount - 0.3) * 0.3;
      ctx.globalAlpha = glowAlpha;
      const doorGlow = ctx.createRadialGradient(
        doorPX + S / 2, doorPY + S / 2, 2,
        doorPX + S / 2, doorPY + S / 2, 40
      );
      doorGlow.addColorStop(0, "#ffcc66");
      doorGlow.addColorStop(0.5, "rgba(255,180,80,0.3)");
      doorGlow.addColorStop(1, "rgba(255,150,50,0)");
      ctx.fillStyle = doorGlow;
      ctx.fillRect(doorPX - 30, doorPY - 30, S + 60, S + 60);
      ctx.globalAlpha = 1;
    }

    // Open door leaf
    if (openAmount < 1) {
      const leafClosed = getTileImage('doors_leaf_closed');
      const leafOpen = getTileImage('doors_leaf_open');
      if (openAmount < 0.5 && leafClosed) {
        ctx.globalAlpha = 1 - openAmount * 2;
        ctx.drawImage(leafClosed, doorPX, doorPY, S, S);
        ctx.globalAlpha = 1;
      } else if (leafOpen) {
        ctx.globalAlpha = (openAmount - 0.5) * 2;
        ctx.drawImage(leafOpen, doorPX, doorPY, S, S);
        ctx.globalAlpha = 1;
      }
    } else {
      const leafOpen = getTileImage('doors_leaf_open');
      if (leafOpen) ctx.drawImage(leafOpen, doorPX, doorPY, S, S);
    }

    // Draw frame on top
    if (frameTop) ctx.drawImage(frameTop, doorPX, doorPY - S, S, S);
    if (frameLeft) ctx.drawImage(frameLeft, doorPX - S / 2, doorPY, S / 2 + 2, S);
    if (frameRight) ctx.drawImage(frameRight, doorPX + S - 2, doorPY, S / 2 + 2, S);

    // Arrow indicator when fully open
    if (openAmount >= 1) {
      ctx.fillStyle = PAL.textGold;
      const arrowBob = Math.sin(performance.now() / 300) * 3;
      const aa = 0.5 + Math.sin(performance.now() / 400) * 0.3;
      ctx.globalAlpha = aa;
      ctx.fillRect(doorPX + 10 + arrowBob, doorPY + 12, 12, 3);
      ctx.fillRect(doorPX + 18 + arrowBob, doorPY + 9, 3, 9);
      ctx.fillRect(doorPX + 21 + arrowBob, doorPY + 12, 3, 3);
      ctx.globalAlpha = 1;
    }
  } else {
    // Closed door with sprite
    const leafClosed = getTileImage('doors_leaf_closed');
    if (leafClosed) ctx.drawImage(leafClosed, doorPX, doorPY, S, S);

    // Draw frame on top
    if (frameTop) ctx.drawImage(frameTop, doorPX, doorPY - S, S, S);
    if (frameLeft) ctx.drawImage(frameLeft, doorPX - S / 2, doorPY, S / 2 + 2, S);
    if (frameRight) ctx.drawImage(frameRight, doorPX + S - 2, doorPY, S / 2 + 2, S);
  }
  ctx.imageSmoothingEnabled = true;
}

function drawDoorProcedural(ctx, doorPX, doorPY) {
  if (doorOpen && currentRoom < rooms.length - 1) {
    // Door frame with stone detail
    ctx.fillStyle = RAMP.stone_wall[1];
    ctx.fillRect(doorPX, doorPY - 3, TILE, TILE + 6);
    ctx.fillStyle = RAMP.stone_wall[0];
    ctx.fillRect(doorPX, doorPY - 3, TILE, 1);
    ctx.fillRect(doorPX, doorPY - 3, 1, TILE + 6);
    ctx.fillStyle = RAMP.stone_wall[3];
    ctx.fillRect(doorPX + TILE - 1, doorPY - 3, 1, TILE + 6);
    ctx.fillRect(doorPX, doorPY + TILE + 2, TILE, 1);

    const openAmount = doorAnimState === 2 ? 1 : clamp01(doorAnimTimer / 0.5);
    ctx.fillStyle = "#080606";
    ctx.fillRect(doorPX + 2, doorPY + 2, TILE - 4, TILE - 4);

    if (openAmount > 0.3) {
      const glowAlpha = (openAmount - 0.3) * 0.3;
      ctx.globalAlpha = glowAlpha;
      const doorGlow = ctx.createRadialGradient(
        doorPX + TILE / 2, doorPY + TILE / 2, 2,
        doorPX + TILE / 2, doorPY + TILE / 2, 40
      );
      doorGlow.addColorStop(0, "#ffcc66");
      doorGlow.addColorStop(0.5, "rgba(255,180,80,0.3)");
      doorGlow.addColorStop(1, "rgba(255,150,50,0)");
      ctx.fillStyle = doorGlow;
      ctx.fillRect(doorPX - 30, doorPY - 30, TILE + 60, TILE + 60);
      ctx.globalAlpha = 1;
    }

    const panelW = (TILE / 2 - 2) * (1 - openAmount);
    if (panelW > 0) {
      ctx.fillStyle = RAMP.wood[2];
      ctx.fillRect(doorPX + 2, doorPY + 2, panelW, TILE - 4);
      ctx.fillStyle = RAMP.wood[3];
      for (let i = 0; i < panelW; i += 3) {
        ctx.fillRect(doorPX + 2 + i, doorPY + 2, 1, TILE - 4);
      }
      const rightX = doorPX + TILE / 2 + (TILE / 2 - 2) * openAmount;
      ctx.fillStyle = RAMP.wood[2];
      ctx.fillRect(rightX, doorPY + 2, panelW, TILE - 4);
      ctx.fillStyle = RAMP.wood[3];
      for (let i = 0; i < panelW; i += 3) {
        ctx.fillRect(rightX + i, doorPY + 2, 1, TILE - 4);
      }
      ctx.fillStyle = PAL.doorIron;
      ctx.fillRect(doorPX + 2, doorPY + 8, panelW, 2);
      ctx.fillRect(doorPX + 2, doorPY + TILE - 10, panelW, 2);
      ctx.fillRect(rightX, doorPY + 8, panelW, 2);
      ctx.fillRect(rightX, doorPY + TILE - 10, panelW, 2);
    }

    ctx.fillStyle = PAL.doorIronLight;
    ctx.fillRect(doorPX, doorPY - 3, TILE, 2);
    ctx.fillRect(doorPX, doorPY + TILE + 1, TILE, 2);
    ctx.fillRect(doorPX, doorPY, 2, TILE);
    ctx.fillStyle = RAMP.steel[0];
    ctx.fillRect(doorPX + 1, doorPY, 1, 1);
    ctx.fillRect(doorPX + 1, doorPY + TILE - 1, 1, 1);

    if (openAmount >= 1) {
      ctx.fillStyle = PAL.textGold;
      const arrowBob = Math.sin(performance.now() / 300) * 3;
      const aa = 0.5 + Math.sin(performance.now() / 400) * 0.3;
      ctx.globalAlpha = aa;
      ctx.fillRect(doorPX + 10 + arrowBob, doorPY + 12, 12, 3);
      ctx.fillRect(doorPX + 18 + arrowBob, doorPY + 9, 3, 9);
      ctx.fillRect(doorPX + 21 + arrowBob, doorPY + 12, 3, 3);
      ctx.globalAlpha = 1;
    }
  } else {
    ctx.fillStyle = RAMP.stone_wall[1];
    ctx.fillRect(doorPX, doorPY - 3, TILE, TILE + 6);
    ctx.fillStyle = RAMP.stone_wall[0];
    ctx.fillRect(doorPX, doorPY - 3, TILE, 1);

    ctx.fillStyle = RAMP.wood[2];
    ctx.fillRect(doorPX + 2, doorPY + 2, TILE - 4, TILE - 4);
    ctx.fillStyle = RAMP.wood[3];
    for (let i = 3; i < TILE - 4; i += 4) {
      ctx.fillRect(doorPX + 2 + i, doorPY + 2, 1, TILE - 4);
    }
    ctx.fillStyle = RAMP.wood[0];
    ctx.fillRect(doorPX + 2, doorPY + 2, 1, TILE - 4);
    ctx.fillStyle = RAMP.wood[4];
    ctx.fillRect(doorPX + TILE - 3, doorPY + 2, 1, TILE - 4);

    ctx.fillStyle = PAL.doorIron;
    ctx.fillRect(doorPX + 2, doorPY + 6, TILE - 4, 2);
    ctx.fillRect(doorPX + 2, doorPY + TILE - 8, TILE - 4, 2);
    ctx.fillStyle = PAL.doorIronLight;
    ctx.fillRect(doorPX + 2, doorPY + 6, TILE - 4, 1);
    ctx.fillRect(doorPX + 2, doorPY + TILE - 8, TILE - 4, 1);
    ctx.fillStyle = RAMP.steel[0];
    ctx.fillRect(doorPX + 5, doorPY + 6, 1, 2);
    ctx.fillRect(doorPX + TILE - 6, doorPY + 6, 1, 2);
    ctx.fillRect(doorPX + 5, doorPY + TILE - 8, 1, 2);
    ctx.fillRect(doorPX + TILE - 6, doorPY + TILE - 8, 1, 2);

    ctx.fillStyle = "#000";
    ctx.fillRect(doorPX + TILE / 2 - 1, doorPY + TILE / 2 - 3, 3, 5);
    ctx.fillRect(doorPX + TILE / 2 - 2, doorPY + TILE / 2 + 1, 5, 3);
    ctx.fillStyle = PAL.doorIronDark;
    ctx.fillRect(doorPX + TILE / 2 - 2, doorPY + TILE / 2 - 4, 5, 1);
    ctx.fillRect(doorPX + TILE / 2 - 3, doorPY + TILE / 2 + 1, 1, 3);
    ctx.fillRect(doorPX + TILE / 2 + 3, doorPY + TILE / 2 + 1, 1, 3);
  }
}

function computeWallSegments() {
  wallSegments = [];
  // Add room boundary segments
  const rx = roomOffX, ry = roomOffY;
  const rw = roomPxW, rh = roomPxH;
  wallSegments.push({ax: rx, ay: ry, bx: rx + rw, by: ry});
  wallSegments.push({ax: rx + rw, ay: ry, bx: rx + rw, by: ry + rh});
  wallSegments.push({ax: rx + rw, ay: ry + rh, bx: rx, by: ry + rh});
  wallSegments.push({ax: rx, ay: ry + rh, bx: rx, by: ry});

  for (let y = 0; y < roomH; y++) {
    for (let x = 0; x < roomW; x++) {
      if (roomGrid[y][x] === 1) {
        const px = roomOffX + x * TILE;
        const py = roomOffY + y * TILE;
        // Only add edges that border non-wall tiles
        if (y > 0 && roomGrid[y-1][x] !== 1)
          wallSegments.push({ax: px, ay: py, bx: px + TILE, by: py});
        if (y < roomH-1 && roomGrid[y+1][x] !== 1)
          wallSegments.push({ax: px, ay: py + TILE, bx: px + TILE, by: py + TILE});
        if (x > 0 && roomGrid[y][x-1] !== 1)
          wallSegments.push({ax: px, ay: py, bx: px, by: py + TILE});
        if (x < roomW-1 && roomGrid[y][x+1] !== 1)
          wallSegments.push({ax: px + TILE, ay: py, bx: px + TILE, by: py + TILE});
      }
    }
  }
}

function clamp01(v) {
  return Math.max(0, Math.min(1, v));
}
