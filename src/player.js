"use strict";

import { PAL, RAMP, STATE } from './config.js';
import { angle, angleDiff, dist, moveWithCollision } from './utils.js';
import { keys, mouse } from './input.js';
import { triggerShake } from './camera.js';
import { spawnParticles, spawnBlood, spawnSlashTrail, spawnMagicSparkle } from './particles.js';
import { triggerHitStop, triggerSlowMo, triggerScreenFlash, spawnDamageNumber } from './effects.js';
import { getRoomState } from './rooms.js';
import { damageEnemy } from './enemies.js';
import { startTransition } from './transitions.js';
import { getGameState, setGameState, getStats, getGlobalTime } from './main.js';
import { TILE } from './config.js';
import { drawSprite, drawSpriteFlash, drawSpriteWithGlow, drawEntityGlow, isSpritesLoaded } from './sprites.js';

export const player = {
  x: 0, y: 0, radius: 12,
  hp: 100, maxHp: 100,
  speed: 150, baseSpeed: 150,
  damage: 25, baseDamage: 25,
  facing: 0,
  attacking: false, attackTimer: 0, attackDuration: 0.25, attackCooldown: 0, attackCooldownMax: 0.4,
  attackArc: Math.PI * 0.8, attackRange: 38,
  blocking: false, blockTimer: 0, blockDuration: 0.5, blockCooldown: 0, blockCooldownMax: 0.8,
  dashing: false, dashTimer: 0, dashDuration: 0.15, dashCooldown: 0, dashCooldownMax: 2.0,
  dashSpeed: 500, dashDir: 0,
  iFrames: 0,
  speedBuff: 0,
  attackBuff: 0,
  hurtFlash: 0,
  walkFrame: 0,
  walkTimer: 0,
  isMoving: false,
  // Squash/stretch
  scaleX: 1, scaleY: 1,
  squashTimer: 0,
  // Afterimage trail
  trail: [],
};

export function resetPlayer() {
  player.hp = player.maxHp;
  player.speed = player.baseSpeed;
  player.damage = player.baseDamage;
  player.attacking = false;
  player.attackTimer = 0;
  player.attackCooldown = 0;
  player.blocking = false;
  player.blockTimer = 0;
  player.blockCooldown = 0;
  player.dashing = false;
  player.dashTimer = 0;
  player.dashCooldown = 0;
  player.iFrames = 0;
  player.speedBuff = 0;
  player.attackBuff = 0;
  player.hurtFlash = 0;
}

export function damagePlayer(amount) {
  if (player.iFrames > 0) return;
  if (player.blocking) amount = Math.floor(amount * 0.2);
  player.hp -= amount;
  player.iFrames = 0.5;
  player.hurtFlash = 0.2;
  player.squashTimer = 0.15;
  player.scaleX = 1.3;
  player.scaleY = 0.7;
  triggerShake(amount > 15 ? 8 : 4, 0.18);
  triggerHitStop(amount > 15 ? 4 : 2);
  triggerScreenFlash("#ff2222", 0.15);
  spawnBlood(player.x, player.y, 8);
  spawnParticles(player.x, player.y, 4, "#ff4444", 80, 0.3, 3);
  if (player.hp <= 0) {
    player.hp = 0;
    setGameState(STATE.GAMEOVER);
  }
}

function performSlash() {
  const { enemies } = getRoomState();
  const slashAngle = player.facing;
  const halfArc = player.attackArc / 2;
  let hitSomething = false;
  for (const e of enemies) {
    if (e.dead) continue;
    const d = dist(player, e);
    if (d < player.attackRange + e.radius) {
      const a = angle(player, e);
      const diff = Math.abs(angleDiff(slashAngle, a));
      if (diff < halfArc) {
        damageEnemy(e, player.damage);
        hitSomething = true;
        const kb = 100;
        e.x += Math.cos(a) * kb * 0.1;
        e.y += Math.sin(a) * kb * 0.1;
      }
    }
  }
  if (hitSomething) {
    triggerShake(4, 0.12);
    triggerHitStop(3);
    spawnBlood(player.x + Math.cos(slashAngle) * 25, player.y + Math.sin(slashAngle) * 25, 5);
  }
  spawnSlashTrail(player.x, player.y, slashAngle, player.attackArc);
}

export function updatePlayer(dt) {
  const { rooms, currentRoom, roomW, roomH, roomOffX, roomOffY, doorOpen, powerups } = getRoomState();
  const stats = getStats();

  player.facing = angle(player, mouse);

  if (player.speedBuff > 0) {
    player.speedBuff -= dt;
    player.speed = player.baseSpeed * 1.5;
  } else {
    player.speed = player.baseSpeed;
  }
  if (player.attackBuff > 0) {
    player.attackBuff -= dt;
    player.damage = player.baseDamage * 1.75;
  } else {
    player.damage = player.baseDamage;
  }

  if (player.attackCooldown > 0) player.attackCooldown -= dt;
  if (player.blockCooldown > 0) player.blockCooldown -= dt;
  if (player.dashCooldown > 0) player.dashCooldown -= dt;
  if (player.iFrames > 0) player.iFrames -= dt;
  if (player.hurtFlash > 0) player.hurtFlash -= dt;

  if (player.attacking) {
    player.attackTimer -= dt;
    if (player.attackTimer <= 0) {
      player.attacking = false;
    }
  }
  if (mouse.left && !player.attacking && player.attackCooldown <= 0 && !player.dashing) {
    player.attacking = true;
    player.attackTimer = player.attackDuration;
    player.attackCooldown = player.attackCooldownMax;
    // Attack stretch
    player.scaleX = 1.2;
    player.scaleY = 0.85;
    player.squashTimer = 0.05;
    performSlash();
  }

  if (mouse.right && player.blockCooldown <= 0 && !player.blocking && !player.dashing) {
    player.blocking = true;
    player.blockTimer = player.blockDuration;
    player.blockCooldown = player.blockCooldownMax + player.blockDuration;
  }
  if (player.blocking) {
    player.blockTimer -= dt;
    if (player.blockTimer <= 0) player.blocking = false;
  }

  if (keys[" "] && player.dashCooldown <= 0 && !player.dashing) {
    player.dashing = true;
    player.dashTimer = player.dashDuration;
    player.dashCooldown = player.dashCooldownMax;
    player.trail = [];
    // Stretch in dash direction
    player.scaleX = 1.4;
    player.scaleY = 0.7;
    let dx = 0, dy = 0;
    if (keys["w"]) dy -= 1;
    if (keys["s"]) dy += 1;
    if (keys["a"]) dx -= 1;
    if (keys["d"]) dx += 1;
    if (dx === 0 && dy === 0) {
      player.dashDir = player.facing;
    } else {
      player.dashDir = Math.atan2(dy, dx);
    }
    player.iFrames = player.dashDuration + 0.05;
    spawnParticles(player.x, player.y, 6, "#4488cc", 80, 0.3, 4);
  }

  let vx = 0, vy = 0;
  if (player.dashing) {
    player.dashTimer -= dt;
    vx = Math.cos(player.dashDir) * player.dashSpeed;
    vy = Math.sin(player.dashDir) * player.dashSpeed;
    if (player.dashTimer <= 0) player.dashing = false;
  } else {
    if (keys["w"]) vy -= 1;
    if (keys["s"]) vy += 1;
    if (keys["a"]) vx -= 1;
    if (keys["d"]) vx += 1;
    const len = Math.hypot(vx, vy);
    if (len > 0) { vx /= len; vy /= len; }
    vx *= player.speed;
    vy *= player.speed;
  }

  // Record afterimage trail during dash
  if (player.dashing) {
    player.trail.push({ x: player.x, y: player.y });
    if (player.trail.length > 6) player.trail.shift();
  } else if (player.trail.length > 0) {
    // Fade out trail after dash ends
    if (player.trail.length > 0) player.trail.shift();
  }

  // Squash/stretch spring back
  if (player.squashTimer > 0) {
    player.squashTimer -= dt;
  } else {
    player.scaleX += (1 - player.scaleX) * 0.15;
    player.scaleY += (1 - player.scaleY) * 0.15;
  }

  player.isMoving = (vx !== 0 || vy !== 0);
  if (player.isMoving) {
    player.walkTimer += dt;
    player.walkFrame = Math.floor(player.walkTimer * 8) % 4;
  } else {
    player.walkTimer = 0;
    player.walkFrame = 0;
  }

  moveWithCollision(player, vx * dt, vy * dt, player.radius);

  if (doorOpen) {
    const doorX = roomOffX + (roomW - 1) * TILE + TILE / 2;
    const doorY = roomOffY + Math.floor(roomH / 2) * TILE + TILE / 2;
    if (dist(player, { x: doorX, y: doorY }) < 30) {
      if (currentRoom < rooms.length - 1) {
        startTransition(() => {
          const { loadRoom } = require_loadRoom();
          const rs = getRoomState();
          loadRoom(rs.currentRoom + 1);
          getStats().roomsCleared++;
        });
      }
    }
  }

  for (let i = powerups.length - 1; i >= 0; i--) {
    const pu = powerups[i];
    if (dist(player, pu) < player.radius + pu.radius) {
      if (pu.type === "health") {
        player.hp = Math.min(player.maxHp, player.hp + 25);
        spawnMagicSparkle(pu.x, pu.y, PAL.potionRed);
      } else if (pu.type === "speed") {
        player.speedBuff = 10;
        spawnMagicSparkle(pu.x, pu.y, PAL.speedBlue);
      } else if (pu.type === "attack") {
        player.attackBuff = 10;
        spawnMagicSparkle(pu.x, pu.y, PAL.attackOrange);
      }
      powerups.splice(i, 1);
    }
  }
}

let _loadRoom = null;
function require_loadRoom() {
  if (!_loadRoom) {
    throw new Error("loadRoom not initialized");
  }
  return { loadRoom: _loadRoom };
}

export function setLoadRoom(fn) {
  _loadRoom = fn;
}

// ============================================================
// PIXEL ART SPRITE DATA (16x16) - indices into color tables
// ============================================================
// 0=transparent, 1-9=color indices mapped per-context

// Player body sprite (facing down/neutral) — 16x16
// Built as pixel array for sel-out colored outline rendering
const PLAYER_SPRITE_IDLE = [
  "0000011111100000",
  "0000111111110000",
  "0001122332211000",
  "0001122332211000",
  "0001133333311000",
  "0000133333310000",
  "0004444444444000",
  "0044455544455400",
  "0044455544455400",
  "0044444664444400",
  "0044444664444400",
  "0000446664440000",
  "0000047774700000",
  "0000477007740000",
  "0000880000880000",
  "0000880000880000",
];

// Color maps: each entry maps sprite digit to a PAL/RAMP color
const PLAYER_COLORS = {
  '1': () => PAL.playerSkin,
  '2': () => "#ffffff",          // eyes white
  '3': () => "#111111",          // pupil
  '4': () => PAL.playerArmor,
  '5': () => PAL.playerArmorLight,
  '6': () => PAL.playerBeltBuckle,
  '7': () => PAL.playerBody,
  '8': () => PAL.playerBoots,
  '9': () => PAL.playerBootsLight,
};

// Pre-cached offscreen canvases for sprites
let _playerCache = null;
let _playerCacheFlash = null;

function getOutlineColor(fillColor) {
  // Darken a color for sel-out outline
  const c = parseColor(fillColor);
  return `rgb(${Math.max(0,c.r-60)},${Math.max(0,c.g-60)},${Math.max(0,c.b-60)})`;
}

function parseColor(hex) {
  if (hex.startsWith("rgb")) {
    const m = hex.match(/(\d+)/g);
    return { r: +m[0], g: +m[1], b: +m[2] };
  }
  const h = hex.replace("#", "");
  return {
    r: parseInt(h.substring(0, 2), 16),
    g: parseInt(h.substring(2, 4), 16),
    b: parseInt(h.substring(4, 6), 16),
  };
}

function buildPlayerSprite(flash) {
  const size = 16;
  const scale = 2; // Each pixel = 2x2 canvas pixels
  const w = size * scale;
  const h = size * scale;
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const cx = c.getContext("2d");

  const sprite = PLAYER_SPRITE_IDLE;

  // First pass: fill pixels
  for (let row = 0; row < size; row++) {
    for (let col = 0; col < size; col++) {
      const ch = sprite[row][col];
      if (ch === '0') continue;
      const color = flash ? "#ffffff" : (PLAYER_COLORS[ch] ? PLAYER_COLORS[ch]() : "#ff00ff");
      cx.fillStyle = color;
      cx.fillRect(col * scale, row * scale, scale, scale);
    }
  }

  // Second pass: sel-out colored outlines
  if (!flash) {
    for (let row = 0; row < size; row++) {
      for (let col = 0; col < size; col++) {
        const ch = sprite[row][col];
        if (ch === '0') continue;
        // Check 4-connected neighbors for transparent
        const neighbors = [
          [row - 1, col], [row + 1, col], [row, col - 1], [row, col + 1],
        ];
        for (const [nr, nc] of neighbors) {
          if (nr < 0 || nr >= size || nc < 0 || nc >= size || sprite[nr][nc] === '0') {
            const color = PLAYER_COLORS[ch] ? PLAYER_COLORS[ch]() : "#ff00ff";
            cx.fillStyle = getOutlineColor(color);
            // Draw outline pixel in the transparent neighbor's position
            const or = nr < 0 || nr >= size ? nr : nr;
            const oc = nc < 0 || nc >= size ? nc : nc;
            if (or >= 0 && or < size && oc >= 0 && oc < size) {
              cx.fillStyle = getOutlineColor(color);
              cx.fillRect(oc * scale, or * scale, scale, scale);
            }
          }
        }
      }
    }
  }

  return c;
}

// Detailed player draw with pixel art techniques
export function drawPlayer(ctx) {
  const px = Math.floor(player.x);
  const py = Math.floor(player.y);
  const a = player.facing;
  const globalTime = getGlobalTime();
  const walkBob = player.isMoving ? Math.sin(player.walkTimer * 10) * 2 : 0;
  const legOffset = player.isMoving ? Math.sin(player.walkTimer * 10) * 3 : 0;

  const flash = player.hurtFlash > 0;
  const iframeFlicker = player.iFrames > 0 && Math.floor(player.iFrames * 20) % 2 === 0;

  // ========== SPRITE-BASED RENDERING ==========
  if (isSpritesLoaded()) {
    const animName = player.attacking ? 'hit' : (player.isMoving ? 'run' : 'idle');
    const flipH = Math.cos(player.facing) < 0;
    const animTime = player.isMoving ? player.walkTimer : globalTime;

    // Afterimage trail (dash ghost copies)
    if (player.trail.length > 0) {
      for (let i = 0; i < player.trail.length; i++) {
        const t = player.trail[i];
        const trailAlpha = 0.3 * (1 - i / player.trail.length);
        ctx.globalAlpha = trailAlpha;
        drawSprite(ctx, 'knight', animName, animTime, t.x, t.y, flipH);
      }
      ctx.globalAlpha = 1;
    }

    // Shadow (bigger, softer for bright scene)
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.beginPath();
    ctx.ellipse(px, py + 16, 18, 6, 0, 0, Math.PI * 2);
    ctx.fill();

    if (iframeFlicker) ctx.globalAlpha = 0.4;

    ctx.save();
    ctx.translate(px, py + walkBob * 0.3);
    ctx.scale(player.scaleX, player.scaleY);
    ctx.translate(-(px), -(py + walkBob * 0.3));

    if (flash) {
      drawSpriteFlash(ctx, 'knight', animName, animTime, px, py + walkBob * 0.3, flipH);
    } else {
      // Draw with colored rim glow for visibility
      drawSpriteWithGlow(ctx, 'knight', animName, animTime, px, py + walkBob * 0.3, flipH, null, "#ffffff");
    }

    // Buff aura
    if (!flash && !iframeFlicker) {
      if (player.speedBuff > 0) {
        ctx.globalAlpha = 0.12 + Math.sin(globalTime * 6) * 0.05;
        ctx.strokeStyle = PAL.speedBlue;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(px, py, 16, 14, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = iframeFlicker ? 0.4 : 1;
      }
      if (player.attackBuff > 0) {
        ctx.globalAlpha = 0.12 + Math.sin(globalTime * 5) * 0.05;
        ctx.strokeStyle = PAL.attackOrange;
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.ellipse(px, py, 18, 16, 0, 0, Math.PI * 2);
        ctx.stroke();
        ctx.globalAlpha = iframeFlicker ? 0.4 : 1;
      }
    }

    ctx.globalAlpha = 1;
    ctx.restore();

    // Sword (world-space, rotated to facing)
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a);

    if (player.attacking) {
      const swingT = 1 - player.attackTimer / player.attackDuration;
      const swingAngle = -player.attackArc / 2 + player.attackArc * swingT;
      ctx.rotate(swingAngle);
      ctx.fillStyle = flash ? "#fff" : RAMP.steel[1];
      ctx.fillRect(14, -2, 24, 4);
      ctx.fillStyle = flash ? "#fff" : RAMP.steel[0];
      ctx.fillRect(14, -2, 24, 1);
      ctx.fillStyle = flash ? "#fff" : RAMP.steel[3];
      ctx.fillRect(14, 1, 24, 1);
      ctx.fillStyle = flash ? "#fff" : "#ffffff";
      ctx.fillRect(36, -3, 3, 6);
      ctx.fillStyle = flash ? "#fff" : RAMP.steel[0];
      ctx.fillRect(37, -2, 2, 4);
      ctx.fillStyle = flash ? "#fff" : RAMP.steel[2];
      ctx.fillRect(18, 0, 14, 1);
      ctx.fillStyle = flash ? "#fff" : RAMP.gold[3];
      ctx.fillRect(12, -5, 4, 10);
      ctx.fillStyle = flash ? "#fff" : RAMP.gold[1];
      ctx.fillRect(12, -5, 4, 1);
      if (!flash) {
        ctx.fillStyle = "#4466cc";
        ctx.fillRect(13, -2, 2, 2);
      }
      ctx.fillStyle = flash ? "#fff" : RAMP.gold[2];
      ctx.fillRect(10, -3, 3, 6);
      ctx.fillStyle = flash ? "#fff" : RAMP.gold[0];
      ctx.fillRect(10, -3, 3, 1);
      ctx.fillStyle = flash ? "#fff" : RAMP.leather[2];
      ctx.fillRect(12, -4, 1, 2);
      ctx.fillRect(12, 2, 1, 2);
      ctx.globalAlpha = 0.25 * (1 - swingT);
      ctx.fillStyle = PAL.slashTrail;
      ctx.fillRect(14, -4, 26, 8);
      ctx.globalAlpha = 0.1 * (1 - swingT);
      ctx.fillStyle = "#8844cc";
      ctx.fillRect(14, -6, 26, 12);
      ctx.globalAlpha = 1;
    } else {
      ctx.fillStyle = flash ? "#fff" : RAMP.steel[1];
      ctx.fillRect(14, -2, 22, 4);
      ctx.fillStyle = flash ? "#fff" : RAMP.steel[0];
      ctx.fillRect(14, -2, 22, 1);
      ctx.fillStyle = flash ? "#fff" : RAMP.steel[3];
      ctx.fillRect(14, 1, 22, 1);
      ctx.fillStyle = flash ? "#fff" : "#ffffff";
      ctx.fillRect(34, -3, 2, 6);
      ctx.fillStyle = flash ? "#fff" : RAMP.steel[0];
      ctx.fillRect(34, -2, 2, 4);
      ctx.fillStyle = flash ? "#fff" : RAMP.steel[2];
      ctx.fillRect(18, 0, 12, 1);
      ctx.fillStyle = flash ? "#fff" : RAMP.gold[3];
      ctx.fillRect(12, -5, 4, 10);
      ctx.fillStyle = flash ? "#fff" : RAMP.gold[1];
      ctx.fillRect(12, -5, 4, 1);
      ctx.fillStyle = flash ? "#fff" : RAMP.gold[2];
      ctx.fillRect(10, -3, 3, 6);
      ctx.fillStyle = flash ? "#fff" : RAMP.gold[0];
      ctx.fillRect(10, -3, 3, 1);
    }
    ctx.restore();

    // Shield
    if (player.blocking) {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a);
      ctx.fillStyle = flash ? "#fff" : PAL.shieldShadow;
      ctx.fillRect(10, -12, 7, 24);
      ctx.fillStyle = flash ? "#fff" : PAL.shield;
      ctx.fillRect(11, -10, 5, 20);
      ctx.fillStyle = flash ? "#fff" : PAL.shieldFace;
      ctx.fillRect(11, -10, 2, 12);
      ctx.fillStyle = flash ? "#fff" : RAMP.gold[1];
      ctx.fillRect(12, -4, 3, 3);
      ctx.fillRect(13, -6, 1, 7);
      ctx.fillRect(11, -3, 5, 1);
      if (!flash) {
        ctx.fillStyle = RAMP.gold[0];
        ctx.fillRect(13, -6, 1, 1);
      }
      ctx.fillStyle = flash ? "#fff" : PAL.shieldRim;
      ctx.fillRect(10, -12, 1, 24);
      ctx.fillRect(10, -12, 7, 1);
      ctx.fillStyle = flash ? "#fff" : PAL.shieldShadow;
      ctx.fillRect(16, -12, 1, 24);
      ctx.fillRect(10, 11, 7, 1);
      ctx.fillStyle = "rgba(100,180,240,0.2)";
      ctx.fillRect(6, -16, 16, 32);
      ctx.globalAlpha = 0.15 + Math.sin(globalTime * 12) * 0.1;
      ctx.fillStyle = "#aaddff";
      ctx.fillRect(10, -12, 7, 24);
      ctx.globalAlpha = 1;
      ctx.restore();
    } else {
      ctx.save();
      ctx.translate(px, py);
      ctx.rotate(a + 0.5);
      ctx.fillStyle = flash ? "#fff" : PAL.shieldShadow;
      ctx.fillRect(10, -7, 5, 14);
      ctx.fillStyle = flash ? "#fff" : PAL.shield;
      ctx.fillRect(11, -5, 3, 10);
      ctx.fillStyle = flash ? "#fff" : PAL.shieldFace;
      ctx.fillRect(11, -5, 1, 5);
      ctx.fillStyle = flash ? "#fff" : PAL.shieldEmblem;
      ctx.fillRect(12, -1, 1, 2);
      ctx.restore();
    }

    // Player warm light glow
    if (!iframeFlicker) {
      ctx.globalAlpha = 0.06;
      const plG = ctx.createRadialGradient(px, py, 5, px, py, 50);
      plG.addColorStop(0, "#ffcc88");
      plG.addColorStop(1, "rgba(255,200,120,0)");
      ctx.fillStyle = plG;
      ctx.fillRect(px - 50, py - 50, 100, 100);
      ctx.globalAlpha = 1;
    }

    return; // Skip procedural drawing
  }

  // ========== PROCEDURAL FALLBACK BELOW ==========

  // --- AFTERIMAGE TRAIL (dash ghost copies) ---
  if (player.trail.length > 0) {
    for (let i = 0; i < player.trail.length; i++) {
      const t = player.trail[i];
      const trailAlpha = 0.3 * (1 - i / player.trail.length);
      ctx.globalAlpha = trailAlpha;
      ctx.fillStyle = "#4488cc";
      ctx.fillRect(t.x - 8, t.y - 12, 16, 24);
      ctx.fillRect(t.x - 6, t.y - 16, 12, 8);
    }
    ctx.globalAlpha = 1;
  }

  ctx.save();
  ctx.translate(px, py + walkBob * 0.3);

  // Apply squash/stretch
  ctx.scale(player.scaleX, player.scaleY);

  // Shadow
  ctx.fillStyle = PAL.shadow;
  ctx.beginPath();
  ctx.ellipse(0, 9, 11, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  // flash and iframeFlicker already declared above
  if (iframeFlicker) ctx.globalAlpha = 0.4;

  // --- BOOTS with detailed pixel art ---
  // Left boot
  const lby = 4 + legOffset;
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerBootsShadow;
  ctx.fillRect(-7, lby, 6, 6);
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerBoots;
  ctx.fillRect(-6, lby, 5, 5);
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerBootsLight;
  ctx.fillRect(-6, lby, 3, 2);
  // Right boot
  const rby = 4 - legOffset;
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerBootsShadow;
  ctx.fillRect(1, rby, 6, 6);
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerBoots;
  ctx.fillRect(2, rby, 5, 5);
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerBootsLight;
  ctx.fillRect(2, rby, 3, 2);

  // --- BODY (tunic) with form shading ---
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerBody;
  ctx.fillRect(-8, -10, 16, 16);
  // Shadow side (right)
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerArmorShadow;
  ctx.fillRect(4, -10, 4, 16);
  // Top-left highlight
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerArmorLight;
  ctx.fillRect(-8, -10, 4, 3);

  // --- ARMOR CHEST PLATE with plate segments ---
  // Base armor
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerArmor;
  ctx.fillRect(-7, -8, 14, 10);
  // Highlight (top-left light)
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerArmorLight;
  ctx.fillRect(-6, -8, 5, 3);
  ctx.fillRect(-7, -8, 1, 6);
  // Mid tone
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerArmorMid;
  ctx.fillRect(-2, -6, 6, 5);
  // Shadow (bottom right)
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerArmorShadow;
  ctx.fillRect(3, -4, 4, 6);
  ctx.fillRect(-7, 0, 14, 2);
  // Plate segment lines
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerArmorDeep;
  ctx.fillRect(-7, -2, 14, 1);
  ctx.fillRect(0, -8, 1, 10);
  // Armor edge highlight (sel-out)
  if (!flash) {
    ctx.fillStyle = RAMP.armor[0];
    ctx.fillRect(-7, -8, 14, 1);
    ctx.fillStyle = PAL.playerArmorDeep;
    ctx.fillRect(-7, 1, 14, 1);
  }

  // --- BELT with buckle ---
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerBelt;
  ctx.fillRect(-7, 2, 14, 3);
  // Belt highlight
  ctx.fillStyle = flash ? "#ffffff" : RAMP.leather[0];
  ctx.fillRect(-7, 2, 14, 1);
  // Belt buckle
  ctx.fillStyle = flash ? "#ffffff" : RAMP.gold[0];
  ctx.fillRect(-1, 2, 3, 3);
  ctx.fillStyle = flash ? "#ffffff" : RAMP.gold[2];
  ctx.fillRect(0, 3, 1, 1);

  // --- SHOULDER PAULDRONS with form shading ---
  // Left pauldron
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerArmorMid;
  ctx.fillRect(-10, -9, 5, 6);
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerArmorLight;
  ctx.fillRect(-10, -9, 5, 2);
  ctx.fillRect(-10, -9, 2, 4);
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerArmorShadow;
  ctx.fillRect(-6, -5, 1, 2);
  // Right pauldron
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerArmorMid;
  ctx.fillRect(5, -9, 5, 6);
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerArmorLight;
  ctx.fillRect(5, -9, 5, 1);
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerArmorShadow;
  ctx.fillRect(8, -7, 2, 4);
  // Pauldron colored outlines (sel-out)
  if (!flash) {
    ctx.fillStyle = PAL.playerArmorDeep;
    ctx.fillRect(-10, -4, 5, 1);
    ctx.fillRect(5, -4, 5, 1);
  }

  // --- HEAD with helmet ---
  // Skin
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerSkin;
  ctx.fillRect(-5, -16, 10, 8);
  // Skin highlight (top-left light)
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerSkinLight;
  ctx.fillRect(-5, -16, 4, 3);
  // Skin shadow
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerSkinShadow;
  ctx.fillRect(3, -14, 2, 5);

  // Hair
  ctx.fillStyle = flash ? "#ffffff" : PAL.playerHair;
  ctx.fillRect(-6, -18, 12, 4);
  ctx.fillRect(-6, -16, 2, 3);
  ctx.fillRect(4, -16, 2, 3);

  // Helmet brim with detail
  ctx.fillStyle = flash ? "#ffffff" : RAMP.steel[3];
  ctx.fillRect(-6, -14, 12, 3);
  // Brim highlight
  ctx.fillStyle = flash ? "#ffffff" : RAMP.steel[1];
  ctx.fillRect(-6, -14, 12, 1);
  // Brim rivet dots
  if (!flash) {
    ctx.fillStyle = RAMP.steel[0];
    ctx.fillRect(-5, -13, 1, 1);
    ctx.fillRect(0, -13, 1, 1);
    ctx.fillRect(4, -13, 1, 1);
  }

  // Eyes (tracking mouse)
  if (!flash) {
    const eyeOffX = Math.cos(a) * 2;
    const eyeOffY = Math.sin(a) * 1;
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(-4 + eyeOffX, -12 + eyeOffY, 3, 3);
    ctx.fillRect(1 + eyeOffX, -12 + eyeOffY, 3, 3);
    ctx.fillStyle = "#111";
    ctx.fillRect(-3 + eyeOffX, -11 + eyeOffY, 2, 2);
    ctx.fillRect(2 + eyeOffX, -11 + eyeOffY, 2, 2);
  }

  // --- BUFF AURA ---
  if (!flash && !iframeFlicker) {
    if (player.speedBuff > 0) {
      ctx.globalAlpha = 0.12 + Math.sin(globalTime * 6) * 0.05;
      ctx.strokeStyle = PAL.speedBlue;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 16, 14, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = iframeFlicker ? 0.4 : 1;
    }
    if (player.attackBuff > 0) {
      ctx.globalAlpha = 0.12 + Math.sin(globalTime * 5) * 0.05;
      ctx.strokeStyle = PAL.attackOrange;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, 0, 18, 16, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.globalAlpha = iframeFlicker ? 0.4 : 1;
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();

  // ---- SWORD (world-space, rotated to facing) ----
  ctx.save();
  ctx.translate(px, py);
  ctx.rotate(a);

  if (player.attacking) {
    const swingT = 1 - player.attackTimer / player.attackDuration;
    const swingAngle = -player.attackArc / 2 + player.attackArc * swingT;
    ctx.rotate(swingAngle);
    // Blade body
    ctx.fillStyle = flash ? "#fff" : RAMP.steel[1];
    ctx.fillRect(14, -2, 24, 4);
    // Edge highlight (top = light side)
    ctx.fillStyle = flash ? "#fff" : RAMP.steel[0];
    ctx.fillRect(14, -2, 24, 1);
    // Blade shadow (bottom)
    ctx.fillStyle = flash ? "#fff" : RAMP.steel[3];
    ctx.fillRect(14, 1, 24, 1);
    // Tip with glow
    ctx.fillStyle = flash ? "#fff" : "#ffffff";
    ctx.fillRect(36, -3, 3, 6);
    ctx.fillStyle = flash ? "#fff" : RAMP.steel[0];
    ctx.fillRect(37, -2, 2, 4);
    // Blood groove (fuller)
    ctx.fillStyle = flash ? "#fff" : RAMP.steel[2];
    ctx.fillRect(18, 0, 14, 1);
    // Guard with gem
    ctx.fillStyle = flash ? "#fff" : RAMP.gold[3];
    ctx.fillRect(12, -5, 4, 10);
    ctx.fillStyle = flash ? "#fff" : RAMP.gold[1];
    ctx.fillRect(12, -5, 4, 1);
    if (!flash) {
      ctx.fillStyle = "#4466cc";
      ctx.fillRect(13, -2, 2, 2);
    }
    // Pommel
    ctx.fillStyle = flash ? "#fff" : RAMP.gold[2];
    ctx.fillRect(10, -3, 3, 6);
    ctx.fillStyle = flash ? "#fff" : RAMP.gold[0];
    ctx.fillRect(10, -3, 3, 1);
    // Grip wrap
    ctx.fillStyle = flash ? "#fff" : RAMP.leather[2];
    ctx.fillRect(12, -4, 1, 2);
    ctx.fillRect(12, 2, 1, 2);
    // Swing trail glow
    ctx.globalAlpha = 0.25 * (1 - swingT);
    ctx.fillStyle = PAL.slashTrail;
    ctx.fillRect(14, -4, 26, 8);
    ctx.globalAlpha = 0.1 * (1 - swingT);
    ctx.fillStyle = "#8844cc";
    ctx.fillRect(14, -6, 26, 12);
    ctx.globalAlpha = 1;
  } else {
    // Idle sword
    ctx.fillStyle = flash ? "#fff" : RAMP.steel[1];
    ctx.fillRect(14, -2, 22, 4);
    ctx.fillStyle = flash ? "#fff" : RAMP.steel[0];
    ctx.fillRect(14, -2, 22, 1);
    ctx.fillStyle = flash ? "#fff" : RAMP.steel[3];
    ctx.fillRect(14, 1, 22, 1);
    // Tip
    ctx.fillStyle = flash ? "#fff" : "#ffffff";
    ctx.fillRect(34, -3, 2, 6);
    ctx.fillStyle = flash ? "#fff" : RAMP.steel[0];
    ctx.fillRect(34, -2, 2, 4);
    // Blood groove
    ctx.fillStyle = flash ? "#fff" : RAMP.steel[2];
    ctx.fillRect(18, 0, 12, 1);
    // Guard
    ctx.fillStyle = flash ? "#fff" : RAMP.gold[3];
    ctx.fillRect(12, -5, 4, 10);
    ctx.fillStyle = flash ? "#fff" : RAMP.gold[1];
    ctx.fillRect(12, -5, 4, 1);
    // Pommel
    ctx.fillStyle = flash ? "#fff" : RAMP.gold[2];
    ctx.fillRect(10, -3, 3, 6);
    ctx.fillStyle = flash ? "#fff" : RAMP.gold[0];
    ctx.fillRect(10, -3, 3, 1);
  }
  ctx.restore();

  // ---- SHIELD ----
  if (player.blocking) {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a);
    // Shield body with form shading
    ctx.fillStyle = flash ? "#fff" : PAL.shieldShadow;
    ctx.fillRect(10, -12, 7, 24);
    ctx.fillStyle = flash ? "#fff" : PAL.shield;
    ctx.fillRect(11, -10, 5, 20);
    // Highlight (light side)
    ctx.fillStyle = flash ? "#fff" : PAL.shieldFace;
    ctx.fillRect(11, -10, 2, 12);
    // Shield emblem (cross)
    ctx.fillStyle = flash ? "#fff" : RAMP.gold[1];
    ctx.fillRect(12, -4, 3, 3);
    ctx.fillRect(13, -6, 1, 7);
    ctx.fillRect(11, -3, 5, 1);
    // Emblem highlight
    if (!flash) {
      ctx.fillStyle = RAMP.gold[0];
      ctx.fillRect(13, -6, 1, 1);
    }
    // Rim highlight (sel-out)
    ctx.fillStyle = flash ? "#fff" : PAL.shieldRim;
    ctx.fillRect(10, -12, 1, 24);
    ctx.fillRect(10, -12, 7, 1);
    // Rim shadow
    ctx.fillStyle = flash ? "#fff" : PAL.shieldShadow;
    ctx.fillRect(16, -12, 1, 24);
    ctx.fillRect(10, 11, 7, 1);
    // Block flash glow
    ctx.fillStyle = "rgba(100,180,240,0.2)";
    ctx.fillRect(6, -16, 16, 32);
    ctx.globalAlpha = 0.15 + Math.sin(globalTime * 12) * 0.1;
    ctx.fillStyle = "#aaddff";
    ctx.fillRect(10, -12, 7, 24);
    ctx.globalAlpha = 1;
    ctx.restore();
  } else {
    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(a + 0.5);
    // Small shield at side
    ctx.fillStyle = flash ? "#fff" : PAL.shieldShadow;
    ctx.fillRect(10, -7, 5, 14);
    ctx.fillStyle = flash ? "#fff" : PAL.shield;
    ctx.fillRect(11, -5, 3, 10);
    ctx.fillStyle = flash ? "#fff" : PAL.shieldFace;
    ctx.fillRect(11, -5, 1, 5);
    // Tiny emblem
    ctx.fillStyle = flash ? "#fff" : PAL.shieldEmblem;
    ctx.fillRect(12, -1, 1, 2);
    ctx.restore();
  }

  // Player warm light glow
  if (!iframeFlicker) {
    ctx.globalAlpha = 0.06;
    const plG = ctx.createRadialGradient(px, py, 5, px, py, 50);
    plG.addColorStop(0, "#ffcc88");
    plG.addColorStop(1, "rgba(255,200,120,0)");
    ctx.fillStyle = plG;
    ctx.fillRect(px - 50, py - 50, 100, 100);
    ctx.globalAlpha = 1;
  }
}
