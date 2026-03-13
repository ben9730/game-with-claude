"use strict";

import { PAL } from './config.js';
import { getRoomState } from './rooms.js';

export function updatePowerups(dt) {
  const { powerups } = getRoomState();
  for (const pu of powerups) {
    pu.bobTimer += dt;
  }
}

export function drawPowerups(ctx) {
  const { powerups } = getRoomState();
  for (const pu of powerups) {
    const bob = Math.sin(pu.bobTimer * 3) * 3;
    const px = Math.floor(pu.x);
    const py = Math.floor(pu.y + bob);
    const glow = 0.3 + Math.sin(pu.bobTimer * 4) * 0.15;

    let color;
    if (pu.type === "health") color = PAL.potionRed;
    else if (pu.type === "speed") color = PAL.speedBlue;
    else color = PAL.attackOrange;

    // Radial glow
    ctx.globalAlpha = glow * 0.4;
    const pg = ctx.createRadialGradient(px, py, 2, px, py, 18);
    pg.addColorStop(0, color);
    pg.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = pg;
    ctx.fillRect(px - 18, py - 18, 36, 36);
    ctx.globalAlpha = 1;

    // Sparkle ring
    const sparkleT = pu.bobTimer * 2;
    for (let i = 0; i < 4; i++) {
      const sa = sparkleT + i * Math.PI / 2;
      const sr = 9;
      const sx = px + Math.cos(sa) * sr;
      const sy = py + Math.sin(sa) * sr;
      ctx.globalAlpha = 0.5 + Math.sin(sparkleT * 3 + i) * 0.3;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(sx - 1, sy - 1, 2, 2);
    }
    ctx.globalAlpha = 1;

    // Potion bottle shape
    if (pu.type === "health") {
      // Bottle
      ctx.fillStyle = "#8a2222";
      ctx.fillRect(px - 4, py - 2, 8, 8);
      ctx.fillRect(px - 3, py - 6, 6, 4);
      // Liquid
      ctx.fillStyle = color;
      ctx.fillRect(px - 3, py, 6, 5);
      // Cork
      ctx.fillStyle = "#aa8844";
      ctx.fillRect(px - 2, py - 7, 4, 2);
      // Highlight
      ctx.fillStyle = "#ff8888";
      ctx.fillRect(px - 2, py + 1, 2, 2);
      // Cross on bottle
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(px - 1, py - 4, 2, 4);
      ctx.fillRect(px - 2, py - 3, 4, 1);
    } else if (pu.type === "speed") {
      // Boot shape
      ctx.fillStyle = "#224488";
      ctx.fillRect(px - 4, py - 4, 6, 10);
      ctx.fillRect(px - 4, py + 4, 8, 3);
      // Highlight
      ctx.fillStyle = color;
      ctx.fillRect(px - 3, py - 3, 4, 6);
      // Wing
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(px + 2, py - 4, 2, 2);
      ctx.fillRect(px + 3, py - 2, 2, 2);
      ctx.fillRect(px + 2, py, 2, 2);
    } else {
      // Sword icon
      ctx.fillStyle = "#884422";
      ctx.fillRect(px - 1, py - 6, 2, 10);
      // Blade
      ctx.fillStyle = color;
      ctx.fillRect(px - 1, py - 6, 2, 7);
      // Guard
      ctx.fillStyle = "#ffcc44";
      ctx.fillRect(px - 3, py + 1, 6, 2);
      // Handle
      ctx.fillStyle = "#664422";
      ctx.fillRect(px - 1, py + 3, 2, 3);
      // Tip glow
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(px - 1, py - 6, 2, 2);
    }
  }
}
