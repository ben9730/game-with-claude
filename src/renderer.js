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
import { drawLightingOverlay, torches } from './lighting.js';
import {
  drawBloom, drawVignette, drawColorGrading,
  drawFilmGrain, drawScreenFlash, drawChroma,
  drawAmbientMotes, drawEmbers, drawDamageNumbers,
  drawGodRays, drawScanlines,
} from './effects.js';
import { getGlobalTime } from './main.js';

// Reusable sort buffer to avoid per-frame allocation
let _sortBuf = [];

export function renderPlaying(ctx) {
  const { enemies, bossEntranceActive, bossEntranceTimer, currentRoom, rooms } = getRoomState();
  const globalTime = getGlobalTime();

  ctx.save();
  ctx.translate(shakeX, shakeY);

  // === SCENE LAYER ===
  drawRoom(ctx);
  drawPowerups(ctx);
  drawProjectiles(ctx);

  // === ENTITY LAYER — depth sorted by Y ===
  _sortBuf.length = 0;
  for (let i = 0; i < enemies.length; i++) {
    if (!enemies[i].dead) _sortBuf.push(enemies[i]);
  }
  _sortBuf.sort((a, b) => a.y - b.y);

  let drawnPlayer = false;
  for (const e of _sortBuf) {
    if (!drawnPlayer && player.y < e.y) {
      drawPlayer(ctx);
      drawnPlayer = true;
    }
    drawEnemy(ctx, e);
  }
  if (!drawnPlayer) drawPlayer(ctx);

  // === PARTICLE LAYER ===
  drawParticles(ctx);

  // === LIGHTING LAYER — multiplicative colored lighting ===
  drawLightingOverlay(ctx);

  // === GOD RAYS — radial light shafts from torches ===
  drawGodRays(ctx, torches, globalTime);

  // === ATMOSPHERIC LAYER — additive motes & embers (glow through darkness) ===
  drawAmbientMotes(ctx);
  drawEmbers(ctx);

  // === BOSS ENTRANCE EFFECTS (world-space) ===
  if (bossEntranceActive && bossEntranceTimer > 0) {
    const bt = bossEntranceTimer;
    if (bt > 1.2) {
      ctx.globalAlpha = (bt - 1.2) / 0.3;
      ctx.fillStyle = "#000";
      ctx.fillRect(-W, -H, W * 3, H * 3);
      ctx.globalAlpha = 1;
    }
    ctx.globalAlpha = Math.sin(bt * 8) * 0.1;
    ctx.fillStyle = "#ff0000";
    ctx.fillRect(-W, -H, W * 3, H * 3);
    ctx.globalAlpha = 1;
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

  // === POST-PROCESSING (screen-space, after shake) ===
  drawVignette(ctx);
  drawBloom(ctx);
  drawColorGrading(ctx, currentRoom, rooms.length, player.hp / player.maxHp, globalTime);
  drawFilmGrain(ctx);
  drawScanlines(ctx);
  drawScreenFlash(ctx);
  drawChroma(ctx);

  // === DAMAGE NUMBERS (screen-space but world-positioned) ===
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawDamageNumbers(ctx);
  ctx.restore();

  // === UI LAYER ===
  drawHUD(ctx);

  // === TRANSITION FADE ===
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
  drawLightingOverlay(ctx);
  ctx.restore();
  drawVignette(ctx);
  drawGameOver(ctx);
}

export function renderVictory(ctx) {
  ctx.save();
  ctx.translate(shakeX, shakeY);
  drawRoom(ctx);
  drawParticles(ctx);
  drawLightingOverlay(ctx);
  drawAmbientMotes(ctx);
  drawEmbers(ctx);
  ctx.restore();
  drawVignette(ctx);
  drawBloom(ctx);
  drawVictory(ctx);
}

export function renderTitle(ctx) {
  drawTitle(ctx);
}
