"use strict";

import { isWall, dist } from './utils.js';
import { spawnParticles } from './particles.js';
import { player, damagePlayer } from './player.js';
import { getRoomState } from './rooms.js';

export function updateProjectiles(dt) {
  const { projectiles } = getRoomState();
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.life -= dt;
    if (p.life <= 0 || isWall(p.x, p.y)) {
      spawnParticles(p.x, p.y, 3, p.color, 40, 0.2, 2);
      projectiles.splice(i, 1);
      continue;
    }
    if (!p.fromPlayer) {
      if (dist(p, player) < p.radius + player.radius) {
        damagePlayer(p.damage);
        spawnParticles(p.x, p.y, 4, "#ff4444", 50, 0.2, 2);
        projectiles.splice(i, 1);
      }
    }
  }
}

export function drawProjectiles(ctx) {
  const { projectiles } = getRoomState();
  for (const p of projectiles) {
    ctx.save();
    ctx.translate(Math.floor(p.x), Math.floor(p.y));
    const a = Math.atan2(p.vy, p.vx);
    ctx.rotate(a);
    // Trail
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = p.color;
    ctx.fillRect(-16, -1, 12, 2);
    ctx.globalAlpha = 1;
    // Shaft
    ctx.fillStyle = p.color;
    ctx.fillRect(-6, -1, 14, 2);
    // Arrowhead
    ctx.fillStyle = "#cccccc";
    ctx.fillRect(6, -2, 5, 4);
    ctx.fillRect(9, -1, 3, 2);
    // Fletching
    ctx.fillStyle = "#aa4444";
    ctx.fillRect(-6, -2, 3, 1);
    ctx.fillRect(-6, 1, 3, 1);
    ctx.restore();
  }
}
