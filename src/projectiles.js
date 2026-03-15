"use strict";

import { isWall, dist } from './utils.js';
import { spawnParticles } from './particles.js';
import { player, damagePlayer } from './player.js';
import { damageEnemy } from './enemies.js';
import { getRoomState } from './rooms.js';
import { triggerShake } from './camera.js';
import { triggerHitStop, spawnDamageNumber } from './effects.js';

export function updateProjectiles(dt) {
  const { projectiles, enemies } = getRoomState();
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
    if (p.fromPlayer) {
      // Player projectile hits enemies
      for (const e of enemies) {
        if (e.dead) continue;
        if (dist(p, e) < p.radius + e.radius) {
          damageEnemy(e, p.damage);
          triggerShake(3, 0.1);
          triggerHitStop(2);
          spawnParticles(p.x, p.y, 5, p.trailColor || p.color, 60, 0.3, 3);
          if (!p.pierce) {
            projectiles.splice(i, 1);
          }
          break;
        }
      }
    } else {
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

    if (p.style === 'magic') {
      // Magic bolt — glowing orb with trail
      ctx.globalAlpha = 0.15;
      ctx.fillStyle = p.trailColor || p.color;
      ctx.fillRect(-20, -3, 18, 6);
      ctx.globalAlpha = 0.3;
      ctx.fillRect(-14, -2, 14, 4);
      ctx.globalAlpha = 1;
      // Core orb
      const g = ctx.createRadialGradient(0, 0, 1, 0, 0, 6);
      g.addColorStop(0, "#ffffff");
      g.addColorStop(0.4, p.color);
      g.addColorStop(1, "rgba(0,0,0,0)");
      ctx.fillStyle = g;
      ctx.fillRect(-6, -6, 12, 12);
      // Bright center
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-1, -1, 3, 3);
    } else if (p.style === 'player_arrow') {
      // Player arrow — golden
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = p.trailColor || "#aa8833";
      ctx.fillRect(-18, -1, 14, 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = "#ddaa44";
      ctx.fillRect(-6, -1, 14, 2);
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(6, -2, 4, 4);
      ctx.fillRect(8, -1, 3, 2);
      ctx.fillStyle = "#44aa44";
      ctx.fillRect(-6, -2, 3, 1);
      ctx.fillRect(-6, 1, 3, 1);
    } else {
      // Default enemy arrow
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = p.color;
      ctx.fillRect(-16, -1, 12, 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = p.color;
      ctx.fillRect(-6, -1, 14, 2);
      ctx.fillStyle = "#cccccc";
      ctx.fillRect(6, -2, 5, 4);
      ctx.fillRect(9, -1, 3, 2);
      ctx.fillStyle = "#aa4444";
      ctx.fillRect(-6, -2, 3, 1);
      ctx.fillRect(-6, 1, 3, 1);
    }

    ctx.restore();
  }
}
