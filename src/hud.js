"use strict";

import { PAL, RAMP, W, H } from './config.js';
import { player } from './player.js';
import { getRoomState } from './rooms.js';
import { getGlobalTime } from './main.js';

// ============================================================
// PIXEL ART HEART (7x6 grid for more detail, 3-frame pulse)
// ============================================================
const HEART_SPRITE = [
  [0,1,1,0,1,1,0],
  [1,2,1,1,1,2,1],
  [1,1,1,1,1,1,1],
  [0,1,1,1,1,1,0],
  [0,0,1,1,1,0,0],
  [0,0,0,1,0,0,0],
];

function drawPixelHeart(ctx, x, y, s, color, highlightColor) {
  for (let r = 0; r < 6; r++) {
    for (let c = 0; c < 7; c++) {
      const v = HEART_SPRITE[r][c];
      if (v === 0) continue;
      if (v === 2) {
        ctx.fillStyle = highlightColor || "#ff8888";
      } else {
        ctx.fillStyle = color;
      }
      ctx.fillRect(x + c * s, y + r * s, s, s);
    }
  }
}

// ============================================================
// PIXEL ART BUFF ICONS
// ============================================================
// Sword icon (attack buff) - 12x12
const SWORD_ICON = [
  "000000110000",
  "000001110000",
  "000011100000",
  "000111000000",
  "001110000000",
  "011100000000",
  "011000022000",
  "010000022000",
  "000000330000",
  "000000330000",
  "000003300000",
  "000003000000",
];

// Boot icon (speed buff) - 12x12
const BOOT_ICON = [
  "001100000000",
  "001100000000",
  "001100000000",
  "001100000000",
  "001100000000",
  "001111000000",
  "001111100000",
  "011111110000",
  "011111111000",
  "011111111000",
  "000000000000",
  "000000000000",
];

// Shield icon (block) - 12x12
const SHIELD_ICON = [
  "011111111110",
  "011111111110",
  "011122211110",
  "011122211110",
  "011111211110",
  "011111211110",
  "001111111100",
  "001111111100",
  "000111111000",
  "000011110000",
  "000001100000",
  "000000000000",
];

// Dungeon icon for floor display - 8x8
const DUNGEON_ICON = [
  "11111111",
  "10000001",
  "10111101",
  "10100001",
  "10101111",
  "10100001",
  "10000001",
  "11111111",
];

function drawIconFromData(ctx, data, x, y, s, color1, color2, color3) {
  for (let r = 0; r < data.length; r++) {
    const row = data[r];
    for (let c = 0; c < row.length; c++) {
      const ch = row[c];
      if (ch === '0') continue;
      if (ch === '1') ctx.fillStyle = color1;
      else if (ch === '2') ctx.fillStyle = color2 || color1;
      else if (ch === '3') ctx.fillStyle = color3 || color1;
      ctx.fillRect(x + c * s, y + r * s, s, s);
    }
  }
}

// ============================================================
// HUD FRAME: stone/metal pixel art border
// ============================================================
export function drawHUDFrame(ctx, x, y, w, h) {
  // Stone border
  ctx.fillStyle = RAMP.stone_wall[3];
  ctx.fillRect(x - 3, y - 3, w + 6, h + 6);
  // Inner metal border
  ctx.fillStyle = RAMP.steel[3];
  ctx.fillRect(x - 2, y - 2, w + 4, h + 4);
  // Inner face
  ctx.fillStyle = RAMP.stone_wall[4];
  ctx.fillRect(x - 1, y - 1, w + 2, h + 2);
  // Highlight edges (top-left light)
  ctx.fillStyle = RAMP.steel[1];
  ctx.fillRect(x - 3, y - 3, w + 6, 1);
  ctx.fillRect(x - 3, y - 3, 1, h + 6);
  // Shadow edges (bottom-right)
  ctx.fillStyle = RAMP.steel[4];
  ctx.fillRect(x - 3, y + h + 2, w + 6, 1);
  ctx.fillRect(x + w + 2, y - 3, 1, h + 6);
  // Corner rivets
  ctx.fillStyle = RAMP.gold[2];
  ctx.fillRect(x - 2, y - 2, 2, 2);
  ctx.fillRect(x + w, y - 2, 2, 2);
  ctx.fillRect(x - 2, y + h, 2, 2);
  ctx.fillRect(x + w, y + h, 2, 2);
  // Rivet highlights
  ctx.fillStyle = RAMP.gold[0];
  ctx.fillRect(x - 2, y - 2, 1, 1);
  ctx.fillRect(x + w, y - 2, 1, 1);
  ctx.fillRect(x - 2, y + h, 1, 1);
  ctx.fillRect(x + w, y + h, 1, 1);
}

export function drawHUD(ctx) {
  const globalTime = getGlobalTime();
  const { rooms, currentRoom, enemies } = getRoomState();

  // ---- HP SECTION ----
  drawHUDFrame(ctx, 12, 10, 216, 30);
  ctx.fillStyle = "rgba(10,5,15,0.75)";
  ctx.fillRect(12, 10, 216, 30);

  // Heart icon with 3-frame pulse animation at low HP
  const lowHp = player.hp / player.maxHp < 0.3;
  const pulsePhase = Math.floor(globalTime * 4) % 3;
  let heartScale = 2;
  if (lowHp) {
    if (pulsePhase === 0) heartScale = 2.3;
    else if (pulsePhase === 1) heartScale = 1.8;
    else heartScale = 2.0;
  }
  const heartColor = lowHp ? "#ff3333" : PAL.hpBar;
  const heartHighlight = lowHp ? "#ff8888" : "#ff6666";
  drawPixelHeart(ctx, 15, 15, heartScale, heartColor, heartHighlight);
  // Low HP glow
  if (lowHp) {
    ctx.globalAlpha = 0.2 + Math.sin(globalTime * 6) * 0.15;
    drawPixelHeart(ctx, 15, 15, heartScale, "#ff6666", "#ffaaaa");
    ctx.globalAlpha = 1;
  }

  // Health bar: segmented with shine highlight strip
  const hpW = 178, hpH = 14, hpX = 34, hpY = 16;
  // Bar background
  ctx.fillStyle = PAL.hpBarBg;
  ctx.fillRect(hpX, hpY, hpW, hpH);
  const hpFill = player.hp / player.maxHp;
  // HP bar with color
  ctx.fillStyle = hpFill > 0.3 ? PAL.hpBar : "#ff3333";
  ctx.fillRect(hpX, hpY, hpW * hpFill, hpH);
  // Shine highlight strip (moving)
  if (hpFill > 0) {
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(hpX, hpY, hpW * hpFill, 2);
    ctx.fillStyle = "rgba(255,255,255,0.08)";
    ctx.fillRect(hpX, hpY + 2, hpW * hpFill, 2);
    // Moving shine
    const shinePos = ((globalTime * 30) % (hpW + 20)) - 10;
    if (shinePos < hpW * hpFill) {
      ctx.fillStyle = "rgba(255,255,255,0.15)";
      ctx.fillRect(hpX + shinePos, hpY, 6, hpH);
      ctx.fillStyle = "rgba(255,255,255,0.25)";
      ctx.fillRect(hpX + shinePos + 2, hpY, 2, hpH);
    }
  }
  // Segments
  ctx.fillStyle = "rgba(0,0,0,0.2)";
  for (let i = 1; i < 4; i++) {
    ctx.fillRect(hpX + hpW * i / 4, hpY, 1, hpH);
  }
  // Border with detail
  ctx.fillStyle = RAMP.blood[3];
  ctx.fillRect(hpX, hpY, hpW, 1);
  ctx.fillRect(hpX, hpY, 1, hpH);
  ctx.fillRect(hpX, hpY + hpH - 1, hpW, 1);
  ctx.fillRect(hpX + hpW - 1, hpY, 1, hpH);
  // Border highlight
  ctx.fillStyle = RAMP.blood[1];
  ctx.fillRect(hpX + 1, hpY + hpH, hpW - 1, 1);
  ctx.fillRect(hpX + hpW, hpY + 1, 1, hpH - 1);

  // HP text
  ctx.fillStyle = PAL.textWhite;
  ctx.font = "bold 10px monospace";
  ctx.textAlign = "center";
  ctx.fillText(`${Math.ceil(player.hp)} / ${player.maxHp}`, hpX + hpW / 2, hpY + 11);

  // ---- ROOM INDICATOR with dungeon icon ----
  drawHUDFrame(ctx, W - 164, 10, 150, 42);
  ctx.fillStyle = "rgba(10,5,15,0.75)";
  ctx.fillRect(W - 164, 10, 150, 42);

  // Dungeon icon
  drawIconFromData(ctx, DUNGEON_ICON, W - 160, 14, 2, RAMP.stone_wall[1], null, null);

  ctx.textAlign = "right";
  ctx.fillStyle = PAL.textGold;
  ctx.font = "bold 13px monospace";
  ctx.fillText(`Floor ${currentRoom + 1} / ${rooms.length}`, W - 20, 28);

  // Enemies remaining
  const alive = enemies.filter(e => !e.dead).length;
  ctx.fillStyle = alive > 0 ? "#aa6666" : "#66aa66";
  ctx.font = "11px monospace";
  ctx.fillText(`Enemies: ${alive}`, W - 20, 46);
  // Skull icon next to enemy count
  if (alive > 0) {
    ctx.fillStyle = "#aa6666";
    ctx.fillRect(W - 100, 39, 5, 4);
    ctx.fillRect(W - 99, 37, 3, 2);
    ctx.fillStyle = "#552222";
    ctx.fillRect(W - 99, 40, 1, 1);
    ctx.fillRect(W - 97, 40, 1, 1);
  }

  // ---- DASH COOLDOWN ----
  ctx.textAlign = "left";
  drawHUDFrame(ctx, 12, 44, 100, 14);
  ctx.fillStyle = "rgba(10,5,15,0.75)";
  ctx.fillRect(12, 44, 100, 14);

  const dashW = 96, dashH = 10, dashX = 14, dashY = 46;
  ctx.fillStyle = PAL.dashCooldown;
  ctx.fillRect(dashX, dashY, dashW, dashH);
  const dashFill = player.dashCooldown <= 0 ? 1 : 1 - player.dashCooldown / player.dashCooldownMax;
  ctx.fillStyle = PAL.dashReady;
  ctx.fillRect(dashX, dashY, dashW * dashFill, dashH);
  // Dash bar highlight
  ctx.fillStyle = "rgba(255,255,255,0.12)";
  ctx.fillRect(dashX, dashY, dashW * dashFill, 2);
  // Ready flash
  if (player.dashCooldown <= 0) {
    ctx.fillStyle = "rgba(100,200,255,0.08)";
    ctx.fillRect(dashX, dashY, dashW, dashH);
  }
  ctx.fillStyle = PAL.textWhite;
  ctx.font = "bold 8px monospace";
  ctx.fillText(player.dashCooldown <= 0 ? "DASH [SPACE]" : "DASH ...", dashX + 4, dashY + 8);

  // ---- BUFF ICONS with pixel art ----
  let buffX = 14, buffY = 66;
  const hasBuffs = player.speedBuff > 0 || player.attackBuff > 0;
  if (hasBuffs) {
    const buffW = (player.speedBuff > 0 && player.attackBuff > 0) ? 120 : 65;
    drawHUDFrame(ctx, 12, 62, buffW, 22);
    ctx.fillStyle = "rgba(10,5,15,0.75)";
    ctx.fillRect(12, 62, buffW, 22);
  }

  if (player.speedBuff > 0) {
    // Speed buff: boot icon
    drawIconFromData(ctx, BOOT_ICON, buffX, buffY, 1.3,
      PAL.speedBlue, "#aaddff", "#88bbff");
    // Timer
    ctx.fillStyle = PAL.textWhite;
    ctx.font = "bold 9px monospace";
    ctx.fillText(Math.ceil(player.speedBuff) + "s", buffX + 20, buffY + 12);
    buffX += 55;
  }
  if (player.attackBuff > 0) {
    // Attack buff: sword icon
    drawIconFromData(ctx, SWORD_ICON, buffX, buffY, 1.3,
      PAL.attackOrange, RAMP.gold[1], RAMP.leather[2]);
    // Timer
    ctx.fillStyle = PAL.textWhite;
    ctx.font = "bold 9px monospace";
    ctx.fillText(Math.ceil(player.attackBuff) + "s", buffX + 20, buffY + 12);
  }

  // ---- BLOCK EFFECT ----
  if (player.blocking) {
    ctx.fillStyle = "rgba(80,130,200,0.12)";
    ctx.fillRect(0, 0, W, H);
    // Shield flash border
    ctx.fillStyle = "rgba(100,160,220,0.08)";
    ctx.fillRect(0, 0, 3, H);
    ctx.fillRect(W - 3, 0, 3, H);
    ctx.fillRect(0, 0, W, 3);
    ctx.fillRect(0, H - 3, W, 3);
  }
}
