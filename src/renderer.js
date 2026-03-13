"use strict";

import { PAL, W, H } from './config.js';
import { shakeX, shakeY } from './camera.js';
import { drawRoom, getRoomState } from './rooms.js';
import { drawPowerups } from './powerups.js';
import { drawProjectiles } from './projectiles.js';
import { drawEnemy } from './enemies.js';
import { player, drawPlayer } from './player.js';
import { drawParticles } from './particles.js';
import { drawHUD } from './hud.js';
import { drawTitle, drawGameOver, drawVictory } from './title.js';
import { transitionAlpha } from './transitions.js';

export function renderPlaying(ctx) {
  const { enemies, bossEntranceActive, bossEntranceTimer } = getRoomState();

  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawRoom(ctx);
  drawPowerups(ctx);
  drawProjectiles(ctx);
  // Draw enemies sorted by Y for depth
  const sorted = [...enemies].filter(e => !e.dead).sort((a, b) => a.y - b.y);
  // Draw player among enemies by Y
  let drawnPlayer = false;
  for (const e of sorted) {
    if (!drawnPlayer && player.y < e.y) {
      drawPlayer(ctx);
      drawnPlayer = true;
    }
    drawEnemy(ctx, e);
  }
  if (!drawnPlayer) drawPlayer(ctx);
  drawParticles(ctx);
  // Boss entrance effect
  if (bossEntranceActive && bossEntranceTimer > 0) {
    const bt = bossEntranceTimer;
    // Dark flash at start
    if (bt > 1.2) {
      ctx.globalAlpha = (bt - 1.2) / 0.3;
      ctx.fillStyle = "#000";
      ctx.fillRect(-W, -H, W * 3, H * 3);
      ctx.globalAlpha = 1;
    }
    // Red warning tint
    ctx.globalAlpha = Math.sin(bt * 8) * 0.1;
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(-W, -H, W * 3, H * 3);
    ctx.globalAlpha = 1;
    // Boss warning text
    if (bt < 1.0 && bt > 0.2) {
      ctx.globalAlpha = Math.min(1, (1.0 - bt) / 0.3) * Math.min(1, (bt - 0.2) / 0.2);
      ctx.fillStyle = "#cc2222";
      ctx.font = "bold 28px monospace";
      ctx.textAlign = "center";
      ctx.fillText("BOSS CHAMBER", W / 2 - shakeX, H / 2 - 60 - shakeY);
      ctx.globalAlpha = 1;
    }
  }
  ctx.restore();
  drawHUD(ctx);
  // Transition overlay
  if (transitionAlpha > 0) {
    ctx.fillStyle = `rgba(0,0,0,${transitionAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }
}

export function renderGameOver(ctx) {
  const { enemies } = getRoomState();

  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawRoom(ctx);
  drawPowerups(ctx);
  drawProjectiles(ctx);
  for (const e of enemies) drawEnemy(ctx, e);
  drawPlayer(ctx);
  drawParticles(ctx);
  ctx.restore();
  drawGameOver(ctx);
}

export function renderVictory(ctx) {
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawRoom(ctx);
  drawParticles(ctx);
  ctx.restore();
  drawVictory(ctx);
}

export function renderTitle(ctx) {
  drawTitle(ctx);
}
