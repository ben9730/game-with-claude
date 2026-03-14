"use strict";

import { PAL, RAMP, STATE } from './config.js';
import { rand, dist, angle, angleDiff, lerp, moveWithCollision } from './utils.js';
import { triggerShake } from './camera.js';
import { spawnParticles, spawnDeathExplosion } from './particles.js';
import { triggerHitStop, triggerSlowMo, triggerScreenFlash, triggerChroma, spawnDamageNumber } from './effects.js';
import { player, damagePlayer } from './player.js';
import { getRoomState, setDoorOpen, setDoorAnimState, setDoorAnimTimer } from './rooms.js';
import { getGlobalTime, getStats, setGameState } from './main.js';
import { updateBoss, drawBoss, drawBossEffects, setBossCtx } from './boss.js';
import { drawSprite, drawSpriteFlash, drawSpriteWithGlow, drawEntityGlow, isSpritesLoaded } from './sprites.js';

export function createEnemy(type, x, y) {
  const base = {
    type, x, y, dead: false, hp: 0, maxHp: 0,
    radius: 12, speed: 0, damage: 10,
    attackCooldown: 0, attackCooldownMax: 1,
    stateTimer: 0, state: "idle",
    flashTimer: 0, angle: 0,
    vx: 0, vy: 0,
  };
  switch (type) {
    case "slime":
      base.hp = base.maxHp = 40;
      base.speed = 45;
      base.damage = 12;
      base.radius = 14;
      base.attackCooldownMax = 1.0;
      base.bounceTimer = 0;
      break;
    case "bat":
      base.hp = base.maxHp = 25;
      base.speed = 110;
      base.damage = 8;
      base.radius = 10;
      base.attackCooldownMax = 0.5;
      base.dirChangeTimer = 0;
      base.erraticAngle = rand(0, Math.PI * 2);
      base.wingFrame = 0;
      break;
    case "skeleton":
      base.hp = base.maxHp = 55;
      base.speed = 25;
      base.damage = 15;
      base.radius = 13;
      base.attackCooldownMax = 2.0;
      base.shootCooldown = 1.5;
      base.shootAnim = 0;
      break;
    case "boss":
      base.hp = base.maxHp = 350;
      base.speed = 70;
      base.damage = 20;
      base.radius = 22;
      base.attackCooldownMax = 2.5;
      base.phase = 1;
      base.state = "idle";
      base.chargeDir = 0;
      base.chargeSpeed = 250;
      base.slamRadius = 80;
      base.swingArc = Math.PI * 0.9;
      base.swingRange = 55;
      break;
  }
  return base;
}

export function damageEnemy(e, amount) {
  const { enemies, powerups } = getRoomState();
  e.hp -= amount;
  e.flashTimer = 0.1;
  spawnParticles(e.x, e.y, 5, PAL.particleHit, 70, 0.2, 3);
  // Damage number popup
  spawnDamageNumber(e.x, e.y - e.radius - 5, amount, e.type === "boss" ? "#ff6644" : "#ffffff");
  if (e.hp <= 0) {
    e.dead = true;
    const stats = getStats();
    stats.enemiesKilled++;
    spawnDeathExplosion(e.x, e.y, e.type);
    triggerShake(e.type === "boss" ? 12 : 5, e.type === "boss" ? 0.4 : 0.15);
    triggerHitStop(e.type === "boss" ? 8 : 5);
    triggerScreenFlash(e.type === "boss" ? "#ffffff" : "#ffddaa", e.type === "boss" ? 0.4 : 0.15);
    if (e.type === "boss") {
      triggerSlowMo(0.2, 0.6);
      triggerChroma(6, 4);
    }
    if (e.type !== "boss" && Math.random() < 0.3) {
      const roll = Math.random();
      let puType = "health";
      if (roll > 0.6) puType = "speed";
      else if (roll > 0.3) puType = "attack";
      powerups.push({ x: e.x, y: e.y, type: puType, radius: 8, bobTimer: 0 });
    }
    if (enemies.every(en => en.dead)) {
      setDoorOpen(true);
      setDoorAnimState(1);
      setDoorAnimTimer(0);
      if (e.type === "boss") {
        setGameState(STATE.VICTORY);
      }
    }
  }
}

export function updateEnemies(dt) {
  const { enemies } = getRoomState();
  for (const e of enemies) {
    if (e.dead) continue;
    if (e.flashTimer > 0) e.flashTimer -= dt;
    if (e.attackCooldown > 0) e.attackCooldown -= dt;
    e.angle = angle(e, player);

    switch (e.type) {
      case "slime": updateSlime(e, dt); break;
      case "bat": updateBat(e, dt); break;
      case "skeleton": updateSkeleton(e, dt); break;
      case "boss": updateBoss(e, dt); break;
    }
  }
}

function updateSlime(e, dt) {
  const d = dist(e, player);
  e.bounceTimer = (e.bounceTimer || 0) + dt;
  const moveAngle = e.angle;
  const speedMod = 0.6 + Math.abs(Math.sin(e.bounceTimer * 3)) * 0.6;
  const vx = Math.cos(moveAngle) * e.speed * speedMod;
  const vy = Math.sin(moveAngle) * e.speed * speedMod;
  moveWithCollision(e, vx * dt, vy * dt, e.radius);
  if (d < e.radius + player.radius && e.attackCooldown <= 0) {
    damagePlayer(e.damage);
    e.attackCooldown = e.attackCooldownMax;
  }
}

function updateBat(e, dt) {
  e.dirChangeTimer = (e.dirChangeTimer || 0) - dt;
  if (e.dirChangeTimer <= 0) {
    e.erraticAngle = e.angle + rand(-1.0, 1.0);
    e.dirChangeTimer = rand(0.3, 0.8);
  }
  const targetAngle = lerp(e.erraticAngle, e.angle, 0.5);
  const vx = Math.cos(targetAngle) * e.speed;
  const vy = Math.sin(targetAngle) * e.speed;
  moveWithCollision(e, vx * dt, vy * dt, e.radius);
  const d = dist(e, player);
  if (d < e.radius + player.radius && e.attackCooldown <= 0) {
    damagePlayer(e.damage);
    e.attackCooldown = e.attackCooldownMax;
  }
}

function updateSkeleton(e, dt) {
  const { projectiles } = getRoomState();
  e.shootCooldown = (e.shootCooldown || 0) - dt;
  if (e.shootAnim > 0) e.shootAnim -= dt;
  const d = dist(e, player);
  if (d < 100) {
    const flee = e.angle + Math.PI;
    moveWithCollision(e, Math.cos(flee) * e.speed * dt, Math.sin(flee) * e.speed * dt, e.radius);
  } else if (d > 200) {
    moveWithCollision(e, Math.cos(e.angle) * e.speed * dt, Math.sin(e.angle) * e.speed * dt, e.radius);
  }
  if (e.shootCooldown <= 0) {
    e.shootCooldown = e.attackCooldownMax;
    e.shootAnim = 0.3;
    const a = angle(e, player);
    projectiles.push({
      x: e.x, y: e.y, vx: Math.cos(a) * 180, vy: Math.sin(a) * 180,
      radius: 4, damage: e.damage, life: 3, fromPlayer: false,
      color: PAL.arrow,
    });
  }
}

// ============================================================
// DITHERING HELPER: checkerboard blend of two colors
// ============================================================
function drawDithered(ctx, x, y, w, h, color1, color2) {
  for (let dy = 0; dy < h; dy++) {
    for (let dx = 0; dx < w; dx++) {
      ctx.fillStyle = ((dx + dy) % 2 === 0) ? color1 : color2;
      ctx.fillRect(x + dx, y + dy, 1, 1);
    }
  }
}

// Small dithered region (scaled by 2 for pixel density)
function drawDithered2(ctx, x, y, w, h, color1, color2) {
  const s = 2;
  for (let dy = 0; dy < h; dy += s) {
    for (let dx = 0; dx < w; dx += s) {
      ctx.fillStyle = (((dx / s) + (dy / s)) % 2 === 0) ? color1 : color2;
      ctx.fillRect(x + dx, y + dy, s, s);
    }
  }
}

export function drawEnemy(ctx, e) {
  if (e.dead) return;
  const globalTime = getGlobalTime();
  const px = Math.floor(e.x);
  const py = Math.floor(e.y);
  const flash = e.flashTimer > 0;

  // ========== SPRITE-BASED RENDERING ==========
  if (isSpritesLoaded()) {
    const spriteMap = { slime: 'slime', bat: 'bat', skeleton: 'skeleton', boss: 'boss' };
    const spriteName = spriteMap[e.type];
    if (spriteName) {
      // Determine animation: moving enemies use 'run' if available, otherwise 'idle'
      let isMoving = false;
      if (e.type === 'boss') {
        isMoving = e.state === 'charging' || e.state === 'charge_windup';
      } else if (e.type === 'bat') {
        isMoving = true; // bats are always flying
      } else {
        isMoving = (e.vx !== 0 || e.vy !== 0);
      }
      const hasRunAnim = e.type === 'bat' || e.type === 'boss' || e.type === 'skeleton';
      let animName = 'idle';
      if (isMoving && hasRunAnim) {
        animName = 'run';
      }
      const flipH = Math.cos(e.angle) < 0;
      const animTime = globalTime + e.x * 0.01; // offset so enemies aren't in sync

      // Entity glow halo — colored per enemy type
      const glowColors = { slime: "#44ff44", bat: "#ff4444", skeleton: "#ff6644", boss: "#ff2222" };
      const glowRadii = { slime: 22, bat: 20, skeleton: 24, boss: 45 };
      drawEntityGlow(ctx, px, py + 4, glowRadii[e.type] || 20, glowColors[e.type] || "#ff8844", 0.12);

      // Shadow
      ctx.fillStyle = PAL.shadow;
      ctx.beginPath();
      const sr = e.type === 'boss' ? 22 : 14;
      ctx.ellipse(px, py + sr * 0.8, sr, sr * 0.3, 0, 0, Math.PI * 2);
      ctx.fill();

      // Idle breathing
      const breathe = 1 + Math.sin(globalTime * 2 + e.x * 0.1 + e.y * 0.07) * 0.02;
      ctx.save();
      ctx.translate(px, py);
      ctx.scale(breathe, 1 / breathe);
      ctx.translate(-px, -py);

      const scale = e.type === 'boss' ? 4.5 : 3;
      const rimColors = { slime: "#66ff66", bat: "#ff6666", skeleton: "#ffaa66", boss: "#ff4444" };

      if (flash) {
        drawSpriteFlash(ctx, spriteName, animName, animTime, px, py, flipH, scale);
      } else {
        drawSpriteWithGlow(ctx, spriteName, animName, animTime, px, py, flipH, scale, rimColors[e.type]);
      }

      ctx.restore();

      // For boss: draw special effects (slam shockwave, charge telegraph, etc.)
      if (e.type === 'boss') {
        ctx.save();
        ctx.translate(px, py);
        setBossCtx(ctx);
        drawBossEffects(e, flash);
        ctx.restore();
      }

      // For skeleton: draw the bow on top (it rotates toward player)
      if (e.type === 'skeleton') {
        const isDrawing = e.shootAnim > 0;
        const drawProgress = isDrawing ? 1 - e.shootAnim / 0.3 : 0;
        ctx.save();
        ctx.translate(px, py);
        ctx.rotate(e.angle);
        // Bow limbs
        ctx.fillStyle = flash ? "#fff" : RAMP.wood[2];
        ctx.fillRect(10, -9, 3, 4);
        ctx.fillRect(11, -6, 3, 12);
        ctx.fillRect(10, 5, 3, 4);
        ctx.fillStyle = flash ? "#fff" : RAMP.wood[0];
        ctx.fillRect(10, -8, 1, 3);
        ctx.fillRect(10, 5, 1, 3);
        ctx.fillStyle = flash ? "#fff" : RAMP.wood[4];
        ctx.fillRect(13, -5, 1, 10);
        if (!flash) {
          // Bowstring
          ctx.fillStyle = "#ccc";
          const stringPull = isDrawing ? drawProgress * 3 : 0;
          ctx.fillRect(10, -9, 1, 1);
          ctx.fillRect(10, 8, 1, 1);
          ctx.fillRect(10 - stringPull, -1, 1 + stringPull, 2);
          // Arrow nocked
          ctx.fillStyle = RAMP.wood[1];
          ctx.fillRect(10 - stringPull, -1, 10 + stringPull, 1);
          // Arrowhead
          ctx.fillStyle = RAMP.steel[1];
          ctx.fillRect(18, -2, 4, 3);
          ctx.fillRect(20, -1, 2, 1);
          // Fletching
          ctx.fillStyle = "#aa4444";
          ctx.fillRect(10 - stringPull, -2, 2, 1);
          ctx.fillRect(10 - stringPull, 1, 2, 1);
        }
        ctx.restore();
      }

      // HP bar
      if (e.hp < e.maxHp) {
        const barW = e.radius * 2 + 10;
        const barH = 4;
        const bx = px - barW / 2;
        const by = py - e.radius - 16;
        ctx.fillStyle = "#000";
        ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
        ctx.fillStyle = PAL.hpBarBg;
        ctx.fillRect(bx, by, barW, barH);
        const hpCol = e.type === "boss" ? "#cc33cc" : PAL.hpBar;
        ctx.fillStyle = hpCol;
        ctx.fillRect(bx, by, barW * (e.hp / e.maxHp), barH);
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        const segs = e.type === "boss" ? 10 : 4;
        for (let i = 1; i < segs; i++) {
          ctx.fillRect(bx + barW * i / segs, by, 1, barH);
        }
        ctx.fillStyle = "rgba(255,255,255,0.2)";
        ctx.fillRect(bx, by, barW * (e.hp / e.maxHp), 1);
      }

      return; // Skip procedural drawing
    }
  }

  // ========== PROCEDURAL FALLBACK BELOW ==========
  ctx.save();
  ctx.translate(px, py);

  // Idle breathing — subtle sine-wave scale (each enemy has unique phase from position)
  const breathe = 1 + Math.sin(globalTime * 2 + e.x * 0.1 + e.y * 0.07) * 0.02;
  ctx.scale(breathe, 1 / breathe); // conserve volume

  // Shadow
  ctx.fillStyle = PAL.shadow;
  ctx.beginPath();
  ctx.ellipse(0, e.radius * 0.7, e.radius, e.radius * 0.3, 0, 0, Math.PI * 2);
  ctx.fill();

  switch (e.type) {
    case "slime": {
      const bt = (e.bounceTimer || 0);
      const squish = 1 + Math.sin(bt * 6) * 0.2;
      const sw = e.radius * 2 * (1 / squish);
      const sh = e.radius * 1.6 * squish;
      const yoff = (1 - squish) * 4;

      // --- Translucent body with dithered shading ---
      // Deep shadow base
      ctx.fillStyle = flash ? "#fff" : RAMP.slime[4];
      ctx.fillRect(-sw / 2, -sh / 2 + 3 + yoff, sw, sh - 1);
      // Rounded edges (manual AA): cut corners
      ctx.fillStyle = flash ? "#fff" : RAMP.slime[3];
      ctx.fillRect(-sw / 2 + 1, -sh / 2 + 1 + yoff, sw - 2, sh);
      // Main body with dithering for translucency
      if (!flash) {
        drawDithered2(ctx,
          Math.floor(-sw / 2 + 2), Math.floor(-sh / 2 + 2 + yoff),
          Math.floor(sw - 4), Math.floor(sh - 4),
          RAMP.slime[2], RAMP.slime[1]
        );
      } else {
        ctx.fillStyle = "#fff";
        ctx.fillRect(-sw / 2 + 2, -sh / 2 + 2 + yoff, sw - 4, sh - 4);
      }
      // Highlight blob (top-left light)
      ctx.fillStyle = flash ? "#fff" : RAMP.slime[1];
      ctx.fillRect(-sw / 4, -sh / 2 + 2 + yoff, sw / 3, sh / 4);
      // Bright highlight
      ctx.fillStyle = flash ? "#fff" : RAMP.slime[0];
      ctx.fillRect(-sw / 4 + 1, -sh / 2 + 3 + yoff, 3, 2);

      // Core glow center
      ctx.globalAlpha = 0.4 + Math.sin(bt * 4) * 0.15;
      ctx.fillStyle = flash ? "#fff" : RAMP.slime[0];
      ctx.fillRect(-3, -2 + yoff, 6, 4);
      ctx.globalAlpha = 0.2;
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(-1, -1 + yoff, 2, 2);
      ctx.globalAlpha = 1;

      // Shadow side (right)
      if (!flash) {
        ctx.fillStyle = RAMP.slime[4];
        ctx.globalAlpha = 0.3;
        ctx.fillRect(sw / 4, -sh / 4 + yoff, sw / 4, sh / 2);
        ctx.globalAlpha = 1;
      }

      // Drip details
      if (!flash) {
        const dripOff = Math.sin(bt * 3) * 2;
        ctx.fillStyle = RAMP.slime[2];
        ctx.fillRect(-sw / 2 + 4, sh / 2 + yoff - 2, 3, 3 + dripOff);
        ctx.fillRect(sw / 2 - 7, sh / 2 + yoff - 2, 3, 2 + Math.sin(bt * 2.5) * 2);
        // Drip highlight
        ctx.fillStyle = RAMP.slime[1];
        ctx.fillRect(-sw / 2 + 4, sh / 2 + yoff - 2, 1, 1);
      }

      // Eyes that track player
      if (!flash) {
        const eyeY = -4 + Math.sin(bt * 3) * 1 + yoff;
        const lookX = Math.cos(e.angle) * 1.5;
        const lookY = Math.sin(e.angle) * 1;
        // Eye whites
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-6, eyeY, 5, 5);
        ctx.fillRect(2, eyeY, 5, 5);
        // Pupils tracking player
        ctx.fillStyle = "#111";
        ctx.fillRect(-5 + lookX, eyeY + 1 + lookY, 3, 3);
        ctx.fillRect(3 + lookX, eyeY + 1 + lookY, 3, 3);
        // Pupil highlight
        ctx.fillStyle = RAMP.slime[0];
        ctx.fillRect(-5 + lookX, eyeY + 1 + lookY, 1, 1);
        ctx.fillRect(3 + lookX, eyeY + 1 + lookY, 1, 1);
        // Mouth
        ctx.fillStyle = RAMP.slime[4];
        ctx.fillRect(-3, eyeY + 7, 6, 2);
        ctx.fillStyle = RAMP.slime[3];
        ctx.fillRect(-2, eyeY + 7, 4, 1);
      }

      // Colored outline (sel-out)
      if (!flash) {
        ctx.fillStyle = RAMP.slime[4];
        // Top
        ctx.fillRect(-sw / 2 + 2, -sh / 2 + yoff, sw - 4, 1);
        // Bottom
        ctx.fillRect(-sw / 2 + 1, sh / 2 + yoff - 1, sw - 2, 1);
        // Left
        ctx.fillRect(-sw / 2, -sh / 2 + 2 + yoff, 1, sh - 3);
        // Right
        ctx.fillRect(sw / 2 - 1, -sh / 2 + 2 + yoff, 1, sh - 3);
      }
      break;
    }
    case "bat": {
      const t = globalTime * 10;
      // 4-state wing flap: 0=up, 1=mid-up, 2=mid-down, 3=down
      const wingState = Math.floor(t % 4);
      const wingAngles = [-10, -4, 2, 8];
      const lWingY = wingAngles[wingState];
      const rWingY = wingAngles[(wingState + 2) % 4];
      const bodyBob = Math.sin(t * 0.7) * 2;

      // --- Wing membrane with dithered texture ---
      // Left wing (3 segments)
      ctx.fillStyle = flash ? "#fff" : RAMP.purple[4];
      ctx.fillRect(-17, lWingY - 1, 6, 10);
      if (!flash) {
        drawDithered2(ctx, -16, lWingY, 5, 8, RAMP.purple[3], RAMP.purple[2]);
      }
      ctx.fillStyle = flash ? "#fff" : RAMP.purple[3];
      ctx.fillRect(-12, lWingY + 1, 5, 8);
      if (!flash) {
        drawDithered2(ctx, -11, lWingY + 2, 3, 5, RAMP.purple[2], RAMP.purple[1]);
      }
      // Wing bone
      if (!flash) {
        ctx.fillStyle = RAMP.purple[1];
        ctx.fillRect(-15, lWingY + 3, 9, 1);
        ctx.fillRect(-13, lWingY + 1, 1, 6);
      }

      // Right wing
      ctx.fillStyle = flash ? "#fff" : RAMP.purple[4];
      ctx.fillRect(11, rWingY - 1, 6, 10);
      if (!flash) {
        drawDithered2(ctx, 12, rWingY, 5, 8, RAMP.purple[3], RAMP.purple[2]);
      }
      ctx.fillStyle = flash ? "#fff" : RAMP.purple[3];
      ctx.fillRect(7, rWingY + 1, 5, 8);
      if (!flash) {
        drawDithered2(ctx, 8, rWingY + 2, 3, 5, RAMP.purple[2], RAMP.purple[1]);
      }
      // Wing bone
      if (!flash) {
        ctx.fillStyle = RAMP.purple[1];
        ctx.fillRect(7, rWingY + 3, 9, 1);
        ctx.fillRect(12, rWingY + 1, 1, 6);
      }

      // --- Body with fur texture ---
      ctx.fillStyle = flash ? "#fff" : RAMP.purple[2];
      ctx.fillRect(-5, -6 + bodyBob, 10, 12);
      // Fur dithering
      if (!flash) {
        drawDithered2(ctx, -4, -5 + bodyBob, 8, 4, RAMP.purple[1], RAMP.purple[2]);
        // Body shadow (bottom)
        ctx.fillStyle = RAMP.purple[3];
        ctx.fillRect(-4, 2 + bodyBob, 8, 3);
        // Body highlight (top-left)
        ctx.fillStyle = RAMP.purple[0];
        ctx.fillRect(-4, -5 + bodyBob, 3, 2);
      }

      // Ears
      ctx.fillStyle = flash ? "#fff" : RAMP.purple[2];
      ctx.fillRect(-4, -9 + bodyBob, 3, 4);
      ctx.fillRect(2, -9 + bodyBob, 3, 4);
      // Ear tips
      if (!flash) {
        ctx.fillStyle = RAMP.purple[3];
        ctx.fillRect(-4, -9 + bodyBob, 1, 2);
        ctx.fillRect(4, -9 + bodyBob, 1, 2);
      }

      // Red glowing eyes
      if (!flash) {
        const eyeGlow = 0.6 + Math.sin(globalTime * 8) * 0.2;
        // Eye socket
        ctx.fillStyle = "#110000";
        ctx.fillRect(-4, -4 + bodyBob, 3, 3);
        ctx.fillRect(1, -4 + bodyBob, 3, 3);
        // Glowing eye
        ctx.fillStyle = PAL.batEye;
        ctx.fillRect(-3, -3 + bodyBob, 2, 2);
        ctx.fillRect(2, -3 + bodyBob, 2, 2);
        // Eye glow aura
        ctx.globalAlpha = eyeGlow * 0.3;
        ctx.fillStyle = "#ff4444";
        ctx.fillRect(-5, -5 + bodyBob, 5, 5);
        ctx.fillRect(0, -5 + bodyBob, 5, 5);
        ctx.globalAlpha = 1;
        // Bright center
        ctx.fillStyle = "#ff8888";
        ctx.fillRect(-3, -3 + bodyBob, 1, 1);
        ctx.fillRect(2, -3 + bodyBob, 1, 1);
      }

      // Small fangs
      if (!flash) {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(-2, 3 + bodyBob, 1, 3);
        ctx.fillRect(2, 3 + bodyBob, 1, 3);
        // Fang shadow
        ctx.fillStyle = RAMP.bone[2];
        ctx.fillRect(-2, 5 + bodyBob, 1, 1);
        ctx.fillRect(2, 5 + bodyBob, 1, 1);
      }

      // Colored outline (sel-out)
      if (!flash) {
        ctx.fillStyle = RAMP.purple[4];
        // Body outline
        ctx.fillRect(-5, -7 + bodyBob, 10, 1);
        ctx.fillRect(-5, 5 + bodyBob, 10, 1);
        ctx.fillRect(-6, -5 + bodyBob, 1, 10);
        ctx.fillRect(5, -5 + bodyBob, 1, 10);
      }
      break;
    }
    case "skeleton": {
      const idleBob = Math.sin(globalTime * 2) * 1;
      const jawMove = Math.sin(globalTime * 3) * 0.5;
      const isDrawing = e.shootAnim > 0;
      const drawProgress = isDrawing ? 1 - e.shootAnim / 0.3 : 0;

      // --- LEG BONES with joint dots ---
      // Left leg segments
      ctx.fillStyle = flash ? "#fff" : RAMP.bone[1];
      ctx.fillRect(-5, 6, 3, 4);
      ctx.fillRect(-4, 10, 2, 4);
      // Right leg segments
      ctx.fillRect(3, 6, 3, 4);
      ctx.fillRect(3, 10, 2, 4);
      // Joint dots (darker)
      ctx.fillStyle = flash ? "#fff" : RAMP.bone[3];
      ctx.fillRect(-4, 6, 2, 2);
      ctx.fillRect(3, 6, 2, 2);
      ctx.fillRect(-4, 10, 2, 1);
      ctx.fillRect(3, 10, 2, 1);
      // Foot bones
      ctx.fillStyle = flash ? "#fff" : RAMP.bone[2];
      ctx.fillRect(-6, 13, 4, 2);
      ctx.fillRect(2, 13, 4, 2);

      // --- RIBCAGE with depth ---
      ctx.fillStyle = flash ? "#fff" : RAMP.bone[1];
      ctx.fillRect(-7, -8 + idleBob, 14, 14);
      // Dithered bone texture
      if (!flash) {
        drawDithered2(ctx, -6, -6 + idleBob, 12, 10, RAMP.bone[1], RAMP.bone[0]);
      }
      // Rib lines with depth (dark gaps between ribs)
      if (!flash) {
        ctx.fillStyle = RAMP.bone[3];
        ctx.fillRect(-6, -5 + idleBob, 12, 1);
        ctx.fillRect(-6, -2 + idleBob, 12, 1);
        ctx.fillRect(-6, 1 + idleBob, 12, 1);
        // Shadow between ribs
        ctx.fillStyle = RAMP.bone[4];
        ctx.fillRect(-5, -4 + idleBob, 10, 1);
        ctx.fillRect(-5, -1 + idleBob, 10, 1);
        ctx.fillRect(-5, 2 + idleBob, 10, 1);
        // Spine (center)
        ctx.fillStyle = RAMP.bone[2];
        ctx.fillRect(-1, -7 + idleBob, 2, 14);
        ctx.fillStyle = RAMP.bone[3];
        ctx.fillRect(0, -7 + idleBob, 1, 14);
      }
      // Ribcage highlight (top-left)
      if (!flash) {
        ctx.fillStyle = RAMP.bone[0];
        ctx.fillRect(-6, -7 + idleBob, 4, 2);
      }

      // --- ARM BONES ---
      ctx.fillStyle = flash ? "#fff" : RAMP.bone[1];
      ctx.fillRect(-10, -6 + idleBob, 3, 5);
      ctx.fillRect(-9, -1 + idleBob, 2, 5);
      ctx.fillRect(7, -6 + idleBob, 3, 5);
      ctx.fillRect(8, -1 + idleBob, 2, 5);
      // Arm joints
      ctx.fillStyle = flash ? "#fff" : RAMP.bone[3];
      ctx.fillRect(-9, -1 + idleBob, 2, 1);
      ctx.fillRect(8, -1 + idleBob, 2, 1);

      // --- QUIVER on back ---
      if (!flash) {
        ctx.fillStyle = RAMP.leather[2];
        ctx.fillRect(5, -8 + idleBob, 3, 10);
        ctx.fillStyle = RAMP.leather[1];
        ctx.fillRect(5, -8 + idleBob, 1, 10);
        // Arrow shafts sticking out
        ctx.fillStyle = RAMP.wood[1];
        ctx.fillRect(5, -10 + idleBob, 1, 3);
        ctx.fillRect(7, -11 + idleBob, 1, 4);
        // Arrow tips
        ctx.fillStyle = RAMP.steel[2];
        ctx.fillRect(5, -11 + idleBob, 1, 1);
        ctx.fillRect(7, -12 + idleBob, 1, 1);
      }

      // --- SKULL with eye socket glow ---
      ctx.fillStyle = flash ? "#fff" : RAMP.bone[1];
      ctx.fillRect(-6, -16 + idleBob, 12, 10);
      ctx.fillRect(-5, -17 + idleBob, 10, 2);
      // Skull bone texture (dithered)
      if (!flash) {
        drawDithered2(ctx, -5, -15 + idleBob, 10, 6, RAMP.bone[0], RAMP.bone[1]);
        // Skull highlight (top-left light)
        ctx.fillStyle = RAMP.bone[0];
        ctx.fillRect(-5, -16 + idleBob, 4, 2);
        // Skull shadow (bottom-right)
        ctx.fillStyle = RAMP.bone[2];
        ctx.fillRect(2, -10 + idleBob, 4, 3);
      }
      // Jaw with animation
      ctx.fillStyle = flash ? "#fff" : RAMP.bone[2];
      ctx.fillRect(-4, -7 + idleBob + jawMove, 8, 3);
      if (!flash) {
        // Eye sockets (deep dark)
        ctx.fillStyle = "#080808";
        ctx.fillRect(-4, -14 + idleBob, 3, 3);
        ctx.fillRect(2, -14 + idleBob, 3, 3);
        // Glowing red eyes
        const eyeGlow = 0.5 + Math.sin(globalTime * 4) * 0.2;
        ctx.fillStyle = "#ff2222";
        ctx.globalAlpha = eyeGlow;
        ctx.fillRect(-3, -13 + idleBob, 2, 2);
        ctx.fillRect(3, -13 + idleBob, 2, 2);
        ctx.globalAlpha = eyeGlow * 0.4;
        ctx.fillStyle = "#ff4444";
        ctx.fillRect(-5, -15 + idleBob, 5, 5);
        ctx.fillRect(1, -15 + idleBob, 5, 5);
        ctx.globalAlpha = 1;
        // Bright eye center
        ctx.fillStyle = "#ff6666";
        ctx.fillRect(-3, -13 + idleBob, 1, 1);
        ctx.fillRect(3, -13 + idleBob, 1, 1);
        // Nose hole
        ctx.fillStyle = "#111";
        ctx.fillRect(-1, -10 + idleBob, 2, 2);
        // Teeth
        ctx.fillStyle = RAMP.bone[0];
        ctx.fillRect(-3, -7 + idleBob, 1, 1);
        ctx.fillRect(-1, -7 + idleBob, 1, 1);
        ctx.fillRect(1, -7 + idleBob, 1, 1);
        ctx.fillRect(3, -7 + idleBob, 1, 1);
      }

      // Colored outline (sel-out)
      if (!flash) {
        ctx.fillStyle = RAMP.bone[4];
        // Skull outline
        ctx.fillRect(-6, -17 + idleBob, 12, 1);
        ctx.fillRect(-7, -15 + idleBob, 1, 8);
        ctx.fillRect(6, -15 + idleBob, 1, 8);
      }

      // --- BOW with drawn arrow ---
      ctx.save();
      ctx.rotate(e.angle);
      // Bow limbs with curvature
      ctx.fillStyle = flash ? "#fff" : RAMP.wood[2];
      ctx.fillRect(10, -9, 3, 4);
      ctx.fillRect(11, -6, 3, 12);
      ctx.fillRect(10, 5, 3, 4);
      // Bow limb highlight
      ctx.fillStyle = flash ? "#fff" : RAMP.wood[0];
      ctx.fillRect(10, -8, 1, 3);
      ctx.fillRect(10, 5, 1, 3);
      // Bow limb shadow
      ctx.fillStyle = flash ? "#fff" : RAMP.wood[4];
      ctx.fillRect(13, -5, 1, 10);

      if (!flash) {
        // Bowstring
        ctx.fillStyle = "#ccc";
        const stringPull = isDrawing ? drawProgress * 3 : 0;
        ctx.fillRect(10, -9, 1, 1);
        ctx.fillRect(10, 8, 1, 1);
        ctx.fillRect(10 - stringPull, -1, 1 + stringPull, 2);
        // Arrow nocked
        ctx.fillStyle = RAMP.wood[1];
        ctx.fillRect(10 - stringPull, -1, 10 + stringPull, 1);
        // Arrowhead
        ctx.fillStyle = RAMP.steel[1];
        ctx.fillRect(18, -2, 4, 3);
        ctx.fillRect(20, -1, 2, 1);
        // Fletching
        ctx.fillStyle = "#aa4444";
        ctx.fillRect(10 - stringPull, -2, 2, 1);
        ctx.fillRect(10 - stringPull, 1, 2, 1);
      }
      ctx.restore();
      break;
    }
    case "boss": {
      setBossCtx(ctx);
      drawBoss(e, flash);
      break;
    }
  }

  ctx.restore();

  // HP bar
  if (e.hp < e.maxHp) {
    const barW = e.radius * 2 + 10;
    const barH = 4;
    const bx = px - barW / 2;
    const by = py - e.radius - 16;
    ctx.fillStyle = "#000";
    ctx.fillRect(bx - 1, by - 1, barW + 2, barH + 2);
    ctx.fillStyle = PAL.hpBarBg;
    ctx.fillRect(bx, by, barW, barH);
    const hpCol = e.type === "boss" ? "#cc33cc" : PAL.hpBar;
    ctx.fillStyle = hpCol;
    ctx.fillRect(bx, by, barW * (e.hp / e.maxHp), barH);
    // Segmented look
    ctx.fillStyle = "rgba(0,0,0,0.2)";
    const segs = e.type === "boss" ? 10 : 4;
    for (let i = 1; i < segs; i++) {
      ctx.fillRect(bx + barW * i / segs, by, 1, barH);
    }
    // Shine highlight
    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.fillRect(bx, by, barW * (e.hp / e.maxHp), 1);
  }
}
