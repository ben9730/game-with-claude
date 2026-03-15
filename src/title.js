"use strict";

import { TILE, PAL, RAMP, W, H, CHARACTERS, CHARACTER_ORDER } from './config.js';
import { player } from './player.js';
import { getRoomState } from './rooms.js';
import { getGlobalTime, getStats, getSelectedChar } from './main.js';
import { drawHUDFrame } from './hud.js';
import { drawSprite, drawSpriteWithGlow, isSpritesLoaded } from './sprites.js';
import { mouse, isTouchDevice } from './input.js';

// ============================================================
// PRE-CACHED TITLE BACKGROUND (brick pattern)
// ============================================================
let _titleBgCache = null;

function buildTitleBg() {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const cx = c.getContext("2d");

  cx.fillStyle = "#0a0610";
  cx.fillRect(0, 0, W, H);

  // Dungeon brick background with full pattern
  for (let y = 0; y < H; y += TILE) {
    for (let x = 0; x < W; x += TILE) {
      const brightness = Math.sin(x * 0.03) * Math.cos(y * 0.04) * 5;
      const r = Math.max(0, Math.min(255, 16 + brightness));
      const g = Math.max(0, Math.min(255, 12 + brightness));
      const b = Math.max(0, Math.min(255, 20 + brightness));
      cx.fillStyle = `rgb(${r|0},${g|0},${b|0})`;
      cx.fillRect(x, y, TILE, TILE);

      // Brick pattern with 3 layouts
      const brickH = 8;
      const variant = ((x / TILE + y / TILE) | 0) % 3;
      const offsets = [TILE / 2, TILE / 3, TILE / 2];

      for (let by = 0; by < TILE; by += brickH) {
        const rowOffset = (Math.floor(by / brickH) % 2 === 0) ? 0 : offsets[variant];
        // Mortar
        cx.fillStyle = "rgba(0,0,0,0.18)";
        cx.fillRect(x, y + by, TILE, 1);
        const brickW = variant === 1 ? TILE / 3 : TILE / 2;
        for (let bx = rowOffset; bx < TILE + brickW; bx += brickW) {
          cx.fillRect(x + (bx % TILE), y + by, 1, brickH);
        }
        // Brick highlight
        cx.fillStyle = "rgba(255,255,255,0.02)";
        cx.fillRect(x + 1, y + by + 1, TILE - 2, 1);
      }

      // Random moss/detail
      const seed = (x * 73 + y * 137) % 256;
      if (seed < 8) {
        cx.fillStyle = "rgba(30,60,30,0.15)";
        cx.fillRect(x + 4, y + TILE - 8, 10, 6);
        cx.fillRect(x + 6, y + TILE - 10, 4, 2);
      }
      if (seed > 240) {
        // Small skull decoration
        cx.fillStyle = "rgba(150,140,120,0.06)";
        cx.fillRect(x + 8, y + 6, 8, 6);
        cx.fillRect(x + 10, y + 4, 4, 2);
        cx.fillStyle = "rgba(0,0,0,0.06)";
        cx.fillRect(x + 10, y + 8, 2, 2);
        cx.fillRect(x + 13, y + 8, 2, 2);
        cx.fillRect(x + 11, y + 11, 2, 1);
      }
    }
  }

  _titleBgCache = c;
}

// ============================================================
// LARGE ORNATE SWORD CENTERPIECE (pixel data, ~12x48)
// ============================================================
const TITLE_SWORD = [
  "000001100000",
  "000011110000",
  "000011110000",
  "000011110000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "000021120000",
  "034444444430",
  "034444444430",
  "005333333500",
  "000033300000",
  "000033300000",
  "000033300000",
  "000033300000",
  "000033300000",
  "000033300000",
  "000044400000",
  "000444440000",
  "000444440000",
  "000044400000",
];

const TITLE_SWORD_COLORS = {
  '1': RAMP.steel[0],
  '2': RAMP.steel[2],
  '3': RAMP.leather[2],
  '4': RAMP.gold[2],
  '5': RAMP.gold[0],
};

// ============================================================
// ANIMATED TITLE TORCH
// ============================================================
const FLAME_FRAMES_TITLE = [
  ["00100", "01210", "12321", "12321", "01210"],
  ["01000", "01210", "12321", "12321", "01210"],
  ["00010", "01210", "13231", "12321", "01210"],
  ["00100", "01310", "12321", "13231", "01210"],
];

const FIRE_COLORS = [null, RAMP.fire[2], RAMP.fire[1], RAMP.fire[0]];

function drawTitleTorch(ctx, x, y) {
  const t = getGlobalTime();
  const flicker = Math.sin(t * 12 + x) * 0.15 + Math.sin(t * 7.3 + y) * 0.1 + Math.cos(t * 19 + x * 0.5) * 0.05;

  // Metal bracket with detail
  ctx.fillStyle = RAMP.steel[3];
  ctx.fillRect(x - 5, y + 2, 10, 4);
  ctx.fillStyle = RAMP.steel[2];
  ctx.fillRect(x - 5, y + 2, 10, 1);
  ctx.fillStyle = RAMP.steel[4];
  ctx.fillRect(x - 5, y + 5, 10, 1);
  // Rivets
  ctx.fillStyle = RAMP.steel[0];
  ctx.fillRect(x - 4, y + 3, 1, 1);
  ctx.fillRect(x + 4, y + 3, 1, 1);

  // Torch stick
  ctx.fillStyle = RAMP.wood[2];
  ctx.fillRect(x - 3, y - 2, 6, 6);
  ctx.fillStyle = RAMP.wood[1];
  ctx.fillRect(x - 3, y - 2, 2, 6);
  ctx.fillStyle = RAMP.wood[3];
  ctx.fillRect(x + 1, y - 2, 2, 6);

  // Multi-frame flame
  const frameIndex = Math.floor((t * 7 + x * 0.1) % 4);
  const frame = FLAME_FRAMES_TITLE[frameIndex];
  const fh = 12 + flicker * 6;
  const scale = 3;
  const flameX = x - Math.floor(5 * scale / 2);
  const flameY = y - fh - 4;

  for (let fy = 0; fy < 5; fy++) {
    for (let fx = 0; fx < 5; fx++) {
      const ci = parseInt(frame[fy][fx]);
      if (ci === 0) continue;
      ctx.fillStyle = FIRE_COLORS[ci];
      ctx.fillRect(flameX + fx * scale, flameY + fy * scale, scale, scale);
    }
  }

  // Flame tip (brightest)
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(x - 1, flameY - 2, 2, 3);
  ctx.fillStyle = RAMP.fire[0];
  ctx.fillRect(x - 2, flameY, 4, 2);

  // Smoke (rising pixels)
  const smokePhase = t * 3 + x;
  for (let i = 0; i < 3; i++) {
    const sy = flameY - 6 - i * 8 - Math.sin(smokePhase + i * 2) * 3;
    const sx = x + Math.sin(smokePhase * 0.7 + i * 1.5) * 4;
    ctx.globalAlpha = 0.06 - i * 0.015;
    ctx.fillStyle = "#8877aa";
    ctx.fillRect(sx - 2, sy, 4, 4);
  }
  ctx.globalAlpha = 1;

  // Glow
  const glowR = 90 + flicker * 25;
  const glow = ctx.createRadialGradient(x, y - fh / 2, 3, x, y - fh / 2, glowR);
  glow.addColorStop(0, `rgba(255,150,50,${0.15 + flicker * 0.05})`);
  glow.addColorStop(0.4, `rgba(255,110,30,${0.07 + flicker * 0.02})`);
  glow.addColorStop(1, "rgba(255,80,10,0)");
  ctx.fillStyle = glow;
  ctx.fillRect(x - glowR, y - fh / 2 - glowR, glowR * 2, glowR * 2);
}

export function drawTitle(ctx) {
  const globalTime = getGlobalTime();

  // Draw cached background
  if (!_titleBgCache) buildTitleBg();
  ctx.drawImage(_titleBgCache, 0, 0);

  // Animated torches flanking the title
  drawTitleTorch(ctx, 100, 220);
  drawTitleTorch(ctx, W - 100, 220);
  drawTitleTorch(ctx, 180, 360);
  drawTitleTorch(ctx, W - 180, 360);

  // Subtle fog drifting across
  for (let i = 0; i < 5; i++) {
    const fogX = ((globalTime * 15 + i * 200) % (W + 200)) - 100;
    const fogY = 180 + i * 60 + Math.sin(globalTime * 0.5 + i) * 20;
    ctx.globalAlpha = 0.02 + Math.sin(globalTime * 0.3 + i * 1.5) * 0.01;
    ctx.fillStyle = "#6a5a8a";
    ctx.fillRect(fogX, fogY, 120 + i * 20, 30 + i * 10);
    ctx.fillRect(fogX + 20, fogY - 10, 80, 50);
  }
  ctx.globalAlpha = 1;

  // Heavy vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2 - 40, 80, W / 2, H / 2, 420);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(0.5, "rgba(0,0,0,0.3)");
  vg.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  const t = globalTime;

  // ---- TITLE TEXT with metallic gradient effect ----
  ctx.textAlign = "center";
  // Drop shadow (deep)
  ctx.fillStyle = "#000000";
  ctx.font = "bold 40px monospace";
  ctx.fillText("DEPTHS OF THE", W / 2 + 3, 183);
  ctx.font = "bold 52px monospace";
  ctx.fillText("DARK KEEP", W / 2 + 3, 245);
  // Second shadow layer
  ctx.fillStyle = "#1a0a00";
  ctx.font = "bold 40px monospace";
  ctx.fillText("DEPTHS OF THE", W / 2 + 1, 181);
  ctx.font = "bold 52px monospace";
  ctx.fillText("DARK KEEP", W / 2 + 1, 243);
  // Glow layer
  ctx.globalAlpha = 0.25 + Math.sin(t * 2) * 0.1;
  ctx.fillStyle = "#ffcc66";
  ctx.font = "bold 40px monospace";
  ctx.fillText("DEPTHS OF THE", W / 2, 180);
  ctx.font = "bold 52px monospace";
  ctx.fillText("DARK KEEP", W / 2, 242);
  ctx.globalAlpha = 1;
  // Main title text (warm gold)
  ctx.fillStyle = RAMP.gold[1];
  ctx.font = "bold 40px monospace";
  ctx.fillText("DEPTHS OF THE", W / 2, 180);
  ctx.font = "bold 52px monospace";
  ctx.fillText("DARK KEEP", W / 2, 240);
  // Metallic highlight on top portion
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = RAMP.gold[0];
  ctx.font = "bold 40px monospace";
  // Use clip to only show top half highlight
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 155, W, 15);
  ctx.clip();
  ctx.fillText("DEPTHS OF THE", W / 2, 180);
  ctx.restore();
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 218, W, 15);
  ctx.clip();
  ctx.font = "bold 52px monospace";
  ctx.fillText("DARK KEEP", W / 2, 240);
  ctx.restore();
  ctx.globalAlpha = 1;

  // Subtitle
  ctx.fillStyle = PAL.textDim;
  ctx.font = "14px monospace";
  ctx.fillText("A Dungeon Roguelike", W / 2, 280);

  // ---- LARGE ORNATE SWORD CENTERPIECE ----
  const bob = Math.sin(t * 2) * 4;
  const swordScale = 2;
  const swordX = W / 2 - (12 * swordScale) / 2;
  const swordY = 290 + bob;

  for (let row = 0; row < TITLE_SWORD.length; row++) {
    for (let col = 0; col < 12; col++) {
      const ch = TITLE_SWORD[row][col];
      if (ch === '0') continue;
      ctx.fillStyle = TITLE_SWORD_COLORS[ch] || "#ff00ff";
      ctx.fillRect(swordX + col * swordScale, swordY + row * swordScale, swordScale, swordScale);
    }
  }

  // Sword glow aura
  ctx.globalAlpha = 0.12 + Math.sin(t * 3) * 0.06;
  const sGlow = ctx.createRadialGradient(
    W / 2, swordY + TITLE_SWORD.length * swordScale / 2, 3,
    W / 2, swordY + TITLE_SWORD.length * swordScale / 2, 50
  );
  sGlow.addColorStop(0, "#aaccff");
  sGlow.addColorStop(1, "rgba(170,200,255,0)");
  ctx.fillStyle = sGlow;
  ctx.fillRect(W / 2 - 50, swordY - 10, 100, TITLE_SWORD.length * swordScale + 20);
  ctx.globalAlpha = 1;

  // ---- "PRESS ANY KEY" with torch-flicker opacity ----
  const flicker = 0.5 + Math.sin(t * 3) * 0.15 + Math.sin(t * 7.1) * 0.08 + Math.cos(t * 11) * 0.05;
  ctx.globalAlpha = flicker;
  ctx.fillStyle = PAL.textWhite;
  ctx.font = "16px monospace";
  ctx.fillText(isTouchDevice ? "Tap to begin" : "Click or press any key to begin", W / 2, 420);
  ctx.globalAlpha = 1;

  // Controls
  ctx.fillStyle = PAL.textDim;
  ctx.font = "12px monospace";
  if (isTouchDevice) {
    ctx.fillText("Left Thumb - Move  |  ATK - Attack  |  DASH - Dodge", W / 2, 480);
    ctx.fillText("BLK - Block (Knight)", W / 2, 500);
  } else {
    ctx.fillText("WASD/Arrows - Move  |  Mouse - Aim  |  LClick - Attack", W / 2, 480);
    ctx.fillText("RClick - Block  |  Space - Dash", W / 2, 500);
  }

  ctx.fillStyle = RAMP.stone_wall[1];
  ctx.font = "12px monospace";
  ctx.fillText("Survive the dungeon. Slay the Dark Knight.", W / 2, 540);
}

export function drawGameOver(ctx) {
  const globalTime = getGlobalTime();
  const { rooms, currentRoom } = getRoomState();
  const stats = getStats();

  ctx.fillStyle = "rgba(10,0,0,0.88)";
  ctx.fillRect(0, 0, W, H);

  // Blood vignette
  const bv = ctx.createRadialGradient(W / 2, H / 2, 50, W / 2, H / 2, 400);
  bv.addColorStop(0, "rgba(80,0,0,0)");
  bv.addColorStop(1, "rgba(60,0,0,0.3)");
  ctx.fillStyle = bv;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  // Shadow
  ctx.fillStyle = "#220000";
  ctx.font = "bold 48px monospace";
  ctx.fillText("YOU HAVE FALLEN", W / 2 + 3, 223);
  // Blood red text
  ctx.fillStyle = RAMP.blood[1];
  ctx.fillText("YOU HAVE FALLEN", W / 2, 220);
  // Highlight
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = RAMP.blood[0];
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 195, W, 12);
  ctx.clip();
  ctx.fillText("YOU HAVE FALLEN", W / 2, 220);
  ctx.restore();
  ctx.globalAlpha = 1;

  // Stats with frame
  drawHUDFrame(ctx, W / 2 - 120, 260, 240, 90);
  ctx.fillStyle = "rgba(10,5,15,0.6)";
  ctx.fillRect(W / 2 - 120, 260, 240, 90);

  ctx.fillStyle = PAL.textDim;
  ctx.font = "16px monospace";
  ctx.fillText(`Reached Floor ${currentRoom + 1} of ${rooms.length}`, W / 2, 290);
  ctx.fillText(`Enemies Slain: ${stats.enemiesKilled}`, W / 2, 316);
  const elapsed = Math.floor((performance.now() - stats.startTime) / 1000);
  ctx.fillText(`Time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`, W / 2, 342);

  // Skull decoration (larger, more detailed)
  const skullX = W / 2;
  const skullY = 380;
  ctx.fillStyle = RAMP.bone[2];
  ctx.fillRect(skullX - 8, skullY, 16, 12);
  ctx.fillRect(skullX - 6, skullY - 2, 12, 4);
  ctx.fillRect(skullX - 7, skullY - 4, 14, 3);
  // Skull highlight
  ctx.fillStyle = RAMP.bone[0];
  ctx.fillRect(skullX - 6, skullY - 3, 6, 2);
  // Eye sockets
  ctx.fillStyle = "#1a0808";
  ctx.fillRect(skullX - 5, skullY + 2, 3, 3);
  ctx.fillRect(skullX + 2, skullY + 2, 3, 3);
  // Faint red glow
  ctx.fillStyle = "rgba(200,40,40,0.2)";
  ctx.fillRect(skullX - 5, skullY + 2, 3, 3);
  ctx.fillRect(skullX + 2, skullY + 2, 3, 3);
  // Nose
  ctx.fillStyle = "#2a1a1a";
  ctx.fillRect(skullX - 1, skullY + 6, 2, 2);
  // Teeth
  ctx.fillStyle = RAMP.bone[1];
  ctx.fillRect(skullX - 4, skullY + 9, 1, 2);
  ctx.fillRect(skullX - 2, skullY + 9, 1, 2);
  ctx.fillRect(skullX, skullY + 9, 1, 2);
  ctx.fillRect(skullX + 2, skullY + 9, 1, 2);
  ctx.fillRect(skullX + 4, skullY + 9, 1, 2);

  const alpha = 0.5 + Math.sin(globalTime * 3) * 0.3;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PAL.textWhite;
  ctx.font = "18px monospace";
  ctx.fillText(isTouchDevice ? "Tap to return to the depths" : "Press R to return to the depths", W / 2, 420);
  ctx.globalAlpha = 1;
  ctx.fillStyle = PAL.textDim;
  ctx.font = "12px monospace";
  ctx.fillText("(returns to character select)", W / 2, 442);
  ctx.globalAlpha = 1;
}

export function drawVictory(ctx) {
  const globalTime = getGlobalTime();
  const { rooms } = getRoomState();
  const stats = getStats();

  ctx.fillStyle = "rgba(10,5,20,0.88)";
  ctx.fillRect(0, 0, W, H);

  // Gold glow vignette
  const gv = ctx.createRadialGradient(W / 2, 180, 30, W / 2, H / 2, 350);
  gv.addColorStop(0, "rgba(200,170,80,0.1)");
  gv.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = gv;
  ctx.fillRect(0, 0, W, H);

  ctx.textAlign = "center";
  // Title glow
  ctx.globalAlpha = 0.25 + Math.sin(globalTime * 2) * 0.1;
  ctx.fillStyle = "#ffdd88";
  ctx.font = "bold 44px monospace";
  ctx.fillText("VICTORY!", W / 2, 180);
  ctx.globalAlpha = 1;
  // Title shadow
  ctx.fillStyle = "#4a3a10";
  ctx.fillText("VICTORY!", W / 2 + 2, 182);
  // Title
  ctx.fillStyle = RAMP.gold[1];
  ctx.fillText("VICTORY!", W / 2, 180);
  // Metallic highlight
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = RAMP.gold[0];
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 158, W, 12);
  ctx.clip();
  ctx.fillText("VICTORY!", W / 2, 180);
  ctx.restore();
  ctx.globalAlpha = 1;

  ctx.fillStyle = PAL.textWhite;
  ctx.font = "20px monospace";
  ctx.fillText("The Dark Knight has been vanquished!", W / 2, 240);

  // Stats frame
  drawHUDFrame(ctx, W / 2 - 130, 270, 260, 120);
  ctx.fillStyle = "rgba(10,5,15,0.5)";
  ctx.fillRect(W / 2 - 130, 270, 260, 120);

  ctx.fillStyle = RAMP.gold[1];
  ctx.font = "16px monospace";
  ctx.fillText(`Rooms Cleared: ${rooms.length}`, W / 2, 300);
  ctx.fillText(`Enemies Slain: ${stats.enemiesKilled}`, W / 2, 326);
  const elapsed = Math.floor((performance.now() - stats.startTime) / 1000);
  ctx.fillText(`Time: ${Math.floor(elapsed / 60)}m ${elapsed % 60}s`, W / 2, 352);
  ctx.fillText(`HP Remaining: ${Math.ceil(player.hp)}`, W / 2, 378);

  // Rating with ornate frame
  let rating = "Squire";
  if (elapsed < 120 && player.hp > 50) rating = "Champion";
  else if (elapsed < 180) rating = "Knight";
  else if (player.hp > 30) rating = "Warrior";

  drawHUDFrame(ctx, W / 2 - 100, 405, 200, 30);
  ctx.fillStyle = "rgba(10,5,15,0.5)";
  ctx.fillRect(W / 2 - 100, 405, 200, 30);
  ctx.fillStyle = "#cc88ff";
  ctx.font = "bold 20px monospace";
  ctx.fillText(`Rank: ${rating}`, W / 2, 425);

  // Crown decoration flanking rank
  ctx.fillStyle = RAMP.gold[2];
  ctx.fillRect(W / 2 - 85, 412, 4, 6);
  ctx.fillRect(W / 2 - 80, 414, 4, 4);
  ctx.fillRect(W / 2 - 75, 412, 4, 6);
  ctx.fillRect(W / 2 + 71, 412, 4, 6);
  ctx.fillRect(W / 2 + 76, 414, 4, 4);
  ctx.fillRect(W / 2 + 81, 412, 4, 6);
  // Crown highlights
  ctx.fillStyle = RAMP.gold[0];
  ctx.fillRect(W / 2 - 85, 412, 1, 1);
  ctx.fillRect(W / 2 - 75, 412, 1, 1);
  ctx.fillRect(W / 2 + 71, 412, 1, 1);
  ctx.fillRect(W / 2 + 81, 412, 1, 1);

  const alpha = 0.5 + Math.sin(globalTime * 3) * 0.3;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = PAL.textWhite;
  ctx.font = "16px monospace";
  ctx.fillText(isTouchDevice ? "Tap to play again" : "Press R to play again", W / 2, 480);
  ctx.globalAlpha = 1;
}

// ============================================================
// CHARACTER SELECT SCREEN
// ============================================================
let _charSelectBgCache = null;

function buildCharSelectBg() {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const cx = c.getContext("2d");

  // Dark dungeon background
  cx.fillStyle = "#0a0610";
  cx.fillRect(0, 0, W, H);

  // Stone floor pattern
  for (let y = 0; y < H; y += TILE) {
    for (let x = 0; x < W; x += TILE) {
      const brightness = Math.sin(x * 0.02 + y * 0.01) * 4;
      const r = Math.max(0, Math.min(255, 14 + brightness));
      const g = Math.max(0, Math.min(255, 10 + brightness));
      const b = Math.max(0, Math.min(255, 18 + brightness));
      cx.fillStyle = `rgb(${r|0},${g|0},${b|0})`;
      cx.fillRect(x, y, TILE, TILE);

      // Subtle tile grid
      cx.fillStyle = "rgba(255,255,255,0.01)";
      cx.fillRect(x, y, TILE, 1);
      cx.fillRect(x, y, 1, TILE);
    }
  }

  _charSelectBgCache = c;
}

export function drawCharSelect(ctx) {
  const globalTime = getGlobalTime();
  const selected = getSelectedChar();

  // Draw cached background
  if (!_charSelectBgCache) buildCharSelectBg();
  ctx.drawImage(_charSelectBgCache, 0, 0);

  // Vignette
  const vg = ctx.createRadialGradient(W / 2, H / 2, 100, W / 2, H / 2, 420);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(0.6, "rgba(0,0,0,0.3)");
  vg.addColorStop(1, "rgba(0,0,0,0.85)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);

  // Title
  ctx.textAlign = "center";
  ctx.fillStyle = "#000000";
  ctx.font = "bold 36px monospace";
  ctx.fillText("CHOOSE YOUR HERO", W / 2 + 2, 82);
  ctx.fillStyle = RAMP.gold[1];
  ctx.fillText("CHOOSE YOUR HERO", W / 2, 80);
  // Metallic highlight
  ctx.globalAlpha = 0.3;
  ctx.fillStyle = RAMP.gold[0];
  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 60, W, 12);
  ctx.clip();
  ctx.fillText("CHOOSE YOUR HERO", W / 2, 80);
  ctx.restore();
  ctx.globalAlpha = 1;

  // Decorative line
  ctx.fillStyle = RAMP.gold[3];
  ctx.fillRect(W / 2 - 180, 95, 360, 2);
  ctx.fillStyle = RAMP.gold[0];
  ctx.fillRect(W / 2 - 180, 95, 360, 1);

  // Character cards
  const cardW = 140, cardH = 200, gap = 20;
  const totalW = CHARACTER_ORDER.length * cardW + (CHARACTER_ORDER.length - 1) * gap;
  const startX = (W - totalW) / 2;
  const cardY = 130;

  for (let i = 0; i < CHARACTER_ORDER.length; i++) {
    const charKey = CHARACTER_ORDER[i];
    const charDef = CHARACTERS[charKey];
    const cx = startX + i * (cardW + gap);
    const isSelected = charKey === selected;
    const isHovered = mouse.x >= cx && mouse.x <= cx + cardW && mouse.y >= cardY && mouse.y <= cardY + cardH;

    // Card background
    const cardAlpha = isSelected ? 0.8 : (isHovered ? 0.5 : 0.3);
    ctx.fillStyle = `rgba(20,15,30,${cardAlpha})`;
    ctx.fillRect(cx, cardY, cardW, cardH);

    // Card border
    if (isSelected) {
      // Glowing animated border
      const pulse = 0.6 + Math.sin(globalTime * 4) * 0.2;
      ctx.strokeStyle = charDef.glowColor;
      ctx.lineWidth = 3;
      ctx.globalAlpha = pulse;
      ctx.strokeRect(cx - 1, cardY - 1, cardW + 2, cardH + 2);
      ctx.globalAlpha = 1;

      // Glow behind card
      ctx.globalAlpha = 0.12;
      const glow = ctx.createRadialGradient(cx + cardW / 2, cardY + 80, 10, cx + cardW / 2, cardY + 80, 80);
      glow.addColorStop(0, charDef.glowColor);
      glow.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = glow;
      ctx.fillRect(cx - 20, cardY - 20, cardW + 40, cardH + 40);
      ctx.globalAlpha = 1;
    } else if (isHovered) {
      ctx.strokeStyle = "rgba(255,255,255,0.3)";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, cardY, cardW, cardH);
    } else {
      ctx.strokeStyle = "rgba(255,255,255,0.1)";
      ctx.lineWidth = 1;
      ctx.strokeRect(cx, cardY, cardW, cardH);
    }

    // Character sprite (animated)
    const spriteX = cx + cardW / 2;
    const spriteY = cardY + 65;
    const bob = isSelected ? Math.sin(globalTime * 3) * 3 : 0;

    if (isSpritesLoaded()) {
      const animName = isSelected ? 'run' : 'idle';
      if (isSelected) {
        drawSpriteWithGlow(ctx, charDef.sprite, animName, globalTime, spriteX, spriteY + bob, false, null, charDef.glowColor);
      } else {
        drawSprite(ctx, charDef.sprite, animName, globalTime, spriteX, spriteY, false);
      }
    }

    // Shadow under sprite
    ctx.fillStyle = "rgba(0,0,0,0.3)";
    ctx.beginPath();
    ctx.ellipse(spriteX, spriteY + 22, 16, 5, 0, 0, Math.PI * 2);
    ctx.fill();

    // Character name
    ctx.fillStyle = isSelected ? charDef.glowColor : PAL.textWhite;
    ctx.font = isSelected ? "bold 14px monospace" : "14px monospace";
    ctx.fillText(charDef.name, spriteX, cardY + 115);

    // Weapon type
    ctx.fillStyle = PAL.textDim;
    ctx.font = "11px monospace";
    ctx.fillText(charDef.weapon.toUpperCase(), spriteX, cardY + 132);

    // Stat bars
    const barX = cx + 15;
    const barW = cardW - 30;
    const barH = 6;
    let barY = cardY + 145;

    // HP bar
    drawStatBar(ctx, barX, barY, barW, barH, charDef.hp / 140, "#cc3333", "HP");
    barY += 16;
    // Speed bar
    drawStatBar(ctx, barX, barY, barW, barH, charDef.speed / 185, "#3388ff", "SPD");
    barY += 16;
    // Damage bar
    drawStatBar(ctx, barX, barY, barW, barH, charDef.damage / 40, "#ffaa33", "ATK");
  }

  // Description of selected character
  const selDef = CHARACTERS[selected];
  ctx.fillStyle = PAL.textDim;
  ctx.font = "13px monospace";
  ctx.textAlign = "center";
  ctx.fillText(selDef.desc, W / 2, cardY + cardH + 30);

  // Special ability hint
  const abilityHints = {
    knight: "Shield blocks 80% damage (Right Click)",
    wizard: "Fires magic bolts that pierce through (Left Click)",
    elf: "Rapid arrows with long range (Left Click)",
    lizard: "Wide axe sweep hits all nearby (Left Click)",
  };
  ctx.fillStyle = selDef.glowColor;
  ctx.font = "12px monospace";
  ctx.fillText(abilityHints[selected], W / 2, cardY + cardH + 52);

  // Instructions
  const flicker = 0.5 + Math.sin(globalTime * 3) * 0.15;
  ctx.globalAlpha = flicker;
  ctx.fillStyle = PAL.textWhite;
  ctx.font = "16px monospace";
  ctx.fillText(isTouchDevice ? "Tap a hero to begin" : "Click a hero or press Enter to begin", W / 2, 530);
  ctx.globalAlpha = 1;

  if (!isTouchDevice) {
    ctx.fillStyle = PAL.textDim;
    ctx.font = "11px monospace";
    ctx.fillText("A/D or Arrow Keys to browse", W / 2, 555);
  }
}

function drawStatBar(ctx, x, y, w, h, pct, color, label) {
  ctx.textAlign = "left";
  ctx.fillStyle = PAL.textDim;
  ctx.font = "9px monospace";
  ctx.fillText(label, x, y - 1);

  // Background
  ctx.fillStyle = "rgba(255,255,255,0.06)";
  ctx.fillRect(x, y, w, h);

  // Fill
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.min(1, pct), h);

  // Highlight
  ctx.fillStyle = "rgba(255,255,255,0.2)";
  ctx.fillRect(x, y, w * Math.min(1, pct), 1);

  ctx.textAlign = "center";
}
