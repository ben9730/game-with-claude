"use strict";

import { PAL, RAMP } from './config.js';
import { dist, angle, angleDiff, moveWithCollision } from './utils.js';
import { rand } from './utils.js';
import { triggerShake } from './camera.js';
import { spawnParticles, particles } from './particles.js';
import { player, damagePlayer } from './player.js';
import { getGlobalTime } from './main.js';

export function updateBoss(e, dt) {
  if (e.hp <= e.maxHp * 0.5 && e.phase === 1) {
    e.phase = 2;
    e.speed = 100;
    e.attackCooldownMax = 1.8;
    triggerShake(8, 0.3);
    spawnParticles(e.x, e.y, 20, PAL.bossEye, 120, 0.5, 5);
  }

  e.stateTimer -= dt;
  const d = dist(e, player);

  switch (e.state) {
    case "idle":
      moveWithCollision(e, Math.cos(e.angle) * e.speed * 0.5 * dt, Math.sin(e.angle) * e.speed * 0.5 * dt, e.radius);
      if (e.stateTimer <= 0 && e.attackCooldown <= 0) {
        if (e.phase === 2 && Math.random() < 0.4) {
          e.state = "slam_windup";
          e.stateTimer = 0.6;
        } else {
          e.state = "charge_windup";
          e.stateTimer = 0.5;
          e.chargeDir = e.angle;
        }
      }
      break;
    case "charge_windup":
      e.chargeDir = e.angle;
      if (e.stateTimer <= 0) {
        e.state = "charging";
        e.stateTimer = 0.4;
      }
      break;
    case "charging":
      moveWithCollision(e, Math.cos(e.chargeDir) * e.chargeSpeed * dt, Math.sin(e.chargeDir) * e.chargeSpeed * dt, e.radius);
      if (d < e.radius + player.radius + 10) {
        damagePlayer(e.damage);
      }
      if (e.stateTimer <= 0) {
        e.state = "swing";
        e.stateTimer = 0.3;
        performBossSwing(e);
      }
      break;
    case "swing":
      if (e.stateTimer <= 0) {
        e.state = "idle";
        e.stateTimer = rand(0.8, 1.5);
        e.attackCooldown = e.attackCooldownMax;
      }
      break;
    case "slam_windup":
      if (e.stateTimer <= 0) {
        e.state = "slamming";
        e.stateTimer = 0.15;
        performBossSlam(e);
      }
      break;
    case "slamming":
      if (e.stateTimer <= 0) {
        e.state = "idle";
        e.stateTimer = rand(1.0, 2.0);
        e.attackCooldown = e.attackCooldownMax;
      }
      break;
  }
}

function performBossSwing(e) {
  const halfArc = e.swingArc / 2;
  const a = e.angle;
  const d = dist(e, player);
  if (d < e.swingRange + player.radius) {
    const toPlayer = angle(e, player);
    if (Math.abs(angleDiff(a, toPlayer)) < halfArc) {
      damagePlayer(e.damage + 5);
    }
  }
  triggerShake(5, 0.2);
  spawnParticles(e.x + Math.cos(a) * 30, e.y + Math.sin(a) * 30, 8, PAL.bossSword, 80, 0.3, 4);
}

function performBossSlam(e) {
  const d = dist(e, player);
  if (d < e.slamRadius) {
    damagePlayer(e.damage + 10);
  }
  triggerShake(10, 0.3);
  for (let i = 0; i < 24; i++) {
    const a = (i / 24) * Math.PI * 2;
    particles.push({
      x: e.x + Math.cos(a) * 20, y: e.y + Math.sin(a) * 20,
      vx: Math.cos(a) * 120, vy: Math.sin(a) * 120,
      life: 0.4, maxLife: 0.4, color: "#ff6633", size: 5,
      ptype: "fragment", gravity: 0, rotation: rand(0, 6), rotSpeed: rand(-5, 5),
    });
  }
}

// Dithering for boss armor
function drawDithered2(ctx, x, y, w, h, color1, color2) {
  const s = 2;
  for (let dy = 0; dy < h; dy += s) {
    for (let dx = 0; dx < w; dx += s) {
      ctx.fillStyle = (((dx / s) + (dy / s)) % 2 === 0) ? color1 : color2;
      ctx.fillRect(x + dx, y + dy, s, s);
    }
  }
}

export function drawBoss(e, flash) {
  const globalTime = getGlobalTime();
  const isPhase2 = e.phase === 2;
  const glow = isPhase2 ? Math.sin(performance.now() / 200) * 0.3 + 0.7 : 0;
  const breathe = Math.sin(globalTime * 2) * 1;
  const capeWave = Math.sin(globalTime * 3) * 2;
  const ctx = _bossCtx;

  // Phase 2 aura glow
  if (isPhase2 && !flash) {
    ctx.globalAlpha = 0.08 + Math.sin(globalTime * 3) * 0.04;
    const auraGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 35);
    auraGrad.addColorStop(0, "#ff2222");
    auraGrad.addColorStop(1, "rgba(255,0,0,0)");
    ctx.fillStyle = auraGrad;
    ctx.fillRect(-35, -40, 70, 70);
    ctx.globalAlpha = 1;
  }

  // --- CAPE (behind body) with 2-3 frame sway ---
  const capeColor = isPhase2 ? PAL.bossCapeP2 : PAL.bossCape;
  const capeLightColor = isPhase2 ? PAL.bossCapeP2Light : PAL.bossCapeLight;
  const capeDarkColor = isPhase2 ? PAL.bossCapeP2Dark : PAL.bossCapeDark;

  ctx.fillStyle = flash ? "#fff" : capeColor;
  ctx.fillRect(-16, 8 + breathe, 32, 14);
  // Cape folds (3 panels with sway)
  if (!flash) {
    ctx.fillStyle = capeLightColor;
    ctx.fillRect(-12, 10 + breathe + capeWave * 0.3, 5, 10);
    ctx.fillRect(0, 10 + breathe - capeWave * 0.2, 5, 10);
    ctx.fillRect(8, 10 + breathe + capeWave * 0.4, 4, 10);
    // Cape deep shadow folds
    ctx.fillStyle = capeDarkColor;
    ctx.fillRect(-7, 10 + breathe, 2, 10);
    ctx.fillRect(5, 10 + breathe, 2, 10);
    // Cape tattered bottom edge
    ctx.fillRect(-14, 18 + breathe + capeWave * 0.3, 6, 4 + Math.sin(globalTime * 2) * 1);
    ctx.fillRect(-2, 20 + breathe - capeWave * 0.2, 5, 3);
    ctx.fillRect(8, 18 + breathe + capeWave * 0.4, 6, 4);
    // Cape highlight edge
    ctx.fillStyle = capeLightColor;
    ctx.fillRect(-16, 8 + breathe, 32, 1);
  }

  // --- LEGS with armored boots ---
  ctx.fillStyle = flash ? "#fff" : PAL.bossArmorShadow;
  ctx.fillRect(-10, 8, 8, 10);
  ctx.fillRect(2, 8, 8, 10);
  // Leg armor plates
  if (!flash) {
    ctx.fillStyle = PAL.bossArmor;
    ctx.fillRect(-9, 8, 6, 8);
    ctx.fillRect(3, 8, 6, 8);
    // Knee guard
    ctx.fillStyle = PAL.bossArmorLight;
    ctx.fillRect(-8, 10, 4, 2);
    ctx.fillRect(4, 10, 4, 2);
  }
  // Boots with plate detail
  ctx.fillStyle = flash ? "#fff" : PAL.bossArmor;
  ctx.fillRect(-11, 14, 10, 5);
  ctx.fillRect(1, 14, 10, 5);
  if (!flash) {
    ctx.fillStyle = PAL.bossArmorLight;
    ctx.fillRect(-11, 14, 10, 1);
    ctx.fillRect(1, 14, 10, 1);
    ctx.fillStyle = PAL.bossArmorDeep;
    ctx.fillRect(-11, 18, 10, 1);
    ctx.fillRect(1, 18, 10, 1);
  }

  // --- BODY ARMOR with plate segments ---
  // Base body
  ctx.fillStyle = flash ? "#fff" : PAL.bossArmorShadow;
  ctx.fillRect(-16, -18 + breathe, 32, 28);
  // Main armor plate
  ctx.fillStyle = flash ? "#fff" : PAL.bossArmor;
  ctx.fillRect(-14, -16 + breathe, 28, 24);
  // Form shading: top-left highlight
  if (!flash) {
    ctx.fillStyle = PAL.bossArmorLight;
    ctx.fillRect(-14, -16 + breathe, 10, 6);
    ctx.fillRect(-14, -16 + breathe, 4, 14);
  }
  // Inner armor plate (darker for depth)
  ctx.fillStyle = flash ? "#fff" : (isPhase2 ? "#4a1818" : "#3a3a4a");
  ctx.fillRect(-10, -10 + breathe, 20, 16);
  if (!flash) {
    // Dithered armor texture
    drawDithered2(ctx, -8, -8 + breathe, 16, 12,
      isPhase2 ? "#5a2222" : "#3a3a4a",
      isPhase2 ? "#4a1818" : "#2e2e3a"
    );
  }

  // Chest emblem (cross / dark sigil)
  if (!flash) {
    ctx.fillStyle = isPhase2 ? "#cc2222" : "#555566";
    ctx.fillRect(-4, -8 + breathe, 8, 8);
    ctx.fillStyle = isPhase2 ? "#ff4444" : "#6a6a7a";
    ctx.fillRect(-1, -7 + breathe, 2, 6);
    ctx.fillRect(-3, -5 + breathe, 6, 1);
    // Emblem glow (phase 2)
    if (isPhase2) {
      ctx.globalAlpha = 0.15 + Math.sin(globalTime * 4) * 0.1;
      ctx.fillStyle = "#ff0000";
      ctx.fillRect(-6, -10 + breathe, 12, 12);
      ctx.globalAlpha = 1;
    }
  }

  // Plate segment lines
  if (!flash) {
    ctx.fillStyle = PAL.bossArmorDeep;
    ctx.fillRect(-14, -6 + breathe, 28, 1);
    ctx.fillRect(-14, 2 + breathe, 28, 1);
    ctx.fillRect(0, -16 + breathe, 1, 24);
  }

  // --- SHOULDER PLATES with spikes ---
  ctx.fillStyle = flash ? "#fff" : PAL.bossArmor;
  ctx.fillRect(-18, -16 + breathe, 6, 9);
  ctx.fillRect(12, -16 + breathe, 6, 9);
  // Shoulder form shading
  if (!flash) {
    ctx.fillStyle = PAL.bossArmorLight;
    ctx.fillRect(-18, -16 + breathe, 6, 2);
    ctx.fillRect(-18, -16 + breathe, 2, 6);
    ctx.fillRect(12, -16 + breathe, 6, 2);
    ctx.fillStyle = PAL.bossArmorShadow;
    ctx.fillRect(16, -14 + breathe, 2, 7);
    ctx.fillRect(-14, -8 + breathe, 2, 1);
    ctx.fillRect(12, -8 + breathe, 6, 1);
  }
  // Shoulder spikes
  ctx.fillStyle = flash ? "#fff" : (isPhase2 ? "#882222" : PAL.bossArmorLight);
  ctx.fillRect(-19, -20 + breathe, 3, 6);
  ctx.fillRect(16, -20 + breathe, 3, 6);
  ctx.fillRect(-18, -22 + breathe, 2, 3);
  ctx.fillRect(16, -22 + breathe, 2, 3);
  // Spike tips
  if (!flash) {
    ctx.fillStyle = isPhase2 ? "#ff4444" : RAMP.steel[0];
    ctx.fillRect(-18, -22 + breathe, 1, 1);
    ctx.fillRect(17, -22 + breathe, 1, 1);
  }

  // Phase 2: armor cracks
  if (isPhase2 && !flash) {
    ctx.fillStyle = "#ff4422";
    ctx.globalAlpha = 0.4 + Math.sin(globalTime * 5) * 0.2;
    // Crack lines across armor
    ctx.fillRect(-8, -12 + breathe, 1, 8);
    ctx.fillRect(-7, -6 + breathe, 6, 1);
    ctx.fillRect(4, -14 + breathe, 1, 10);
    ctx.fillRect(4, -4 + breathe, 4, 1);
    ctx.fillRect(-2, 2 + breathe, 8, 1);
    ctx.fillRect(6, -2 + breathe, 1, 6);
    ctx.globalAlpha = 1;
  }

  // --- HELMET with visor ---
  ctx.fillStyle = flash ? "#fff" : PAL.bossArmor;
  ctx.fillRect(-12, -28 + breathe, 24, 14);
  // Helmet form shading
  if (!flash) {
    ctx.fillStyle = PAL.bossArmorLight;
    ctx.fillRect(-12, -28 + breathe, 8, 4);
    ctx.fillRect(-12, -28 + breathe, 3, 10);
    ctx.fillStyle = PAL.bossArmorShadow;
    ctx.fillRect(6, -24 + breathe, 6, 10);
  }
  // Helmet top
  ctx.fillStyle = flash ? "#fff" : PAL.bossArmorLight;
  ctx.fillRect(-8, -30 + breathe, 16, 4);
  // Crown / horns
  ctx.fillStyle = flash ? "#fff" : PAL.bossCrown;
  ctx.fillRect(-10, -32 + breathe, 4, 6);
  ctx.fillRect(6, -32 + breathe, 4, 6);
  ctx.fillRect(-4, -31 + breathe, 8, 3);
  // Crown highlight
  if (!flash) {
    ctx.fillStyle = PAL.bossCrownLight;
    ctx.fillRect(-10, -32 + breathe, 4, 1);
    ctx.fillRect(6, -32 + breathe, 4, 1);
    ctx.fillRect(-4, -31 + breathe, 8, 1);
    ctx.fillStyle = RAMP.gold[0];
    ctx.fillRect(-10, -32 + breathe, 1, 1);
    ctx.fillRect(6, -32 + breathe, 1, 1);
  }
  // Visor slit
  ctx.fillStyle = flash ? "#fff" : "#0a0a1a";
  ctx.fillRect(-8, -22 + breathe, 16, 5);
  // Visor rim
  if (!flash) {
    ctx.fillStyle = PAL.bossArmorLight;
    ctx.fillRect(-8, -22 + breathe, 16, 1);
    ctx.fillStyle = PAL.bossArmorDeep;
    ctx.fillRect(-8, -18 + breathe, 16, 1);
  }

  // --- GLOWING EYES through visor ---
  if (!flash) {
    const eyeIntensity = isPhase2 ? (glow + 0.3) : (0.5 + Math.sin(globalTime * 5) * 0.15);
    ctx.fillStyle = PAL.bossEye;
    ctx.globalAlpha = eyeIntensity;
    ctx.fillRect(-6, -21 + breathe, 4, 3);
    ctx.fillRect(3, -21 + breathe, 4, 3);
    // Bright eye center
    ctx.fillStyle = "#ff8888";
    ctx.fillRect(-5, -20 + breathe, 2, 1);
    ctx.fillRect(4, -20 + breathe, 2, 1);
    // Eye glow aura
    ctx.globalAlpha = (isPhase2 ? 0.25 : 0.1) + Math.sin(globalTime * 5) * 0.08;
    ctx.fillStyle = "#ff2222";
    ctx.fillRect(-8, -23 + breathe, 8, 7);
    ctx.fillRect(1, -23 + breathe, 8, 7);
    // Phase 2: intensified glow leaks from visor
    if (isPhase2) {
      ctx.globalAlpha = 0.1 + Math.sin(globalTime * 6) * 0.05;
      ctx.fillStyle = "#ff4444";
      ctx.fillRect(-10, -24 + breathe, 20, 9);
    }
    ctx.globalAlpha = 1;
  }

  // Colored outline (sel-out) for body
  if (!flash) {
    ctx.fillStyle = PAL.bossArmorDeep;
    // Body outline
    ctx.fillRect(-16, -19 + breathe, 32, 1);
    ctx.fillRect(-17, -16 + breathe, 1, 26);
    ctx.fillRect(16, -16 + breathe, 1, 26);
    // Helmet outline
    ctx.fillRect(-12, -29 + breathe, 24, 1);
    ctx.fillRect(-13, -28 + breathe, 1, 12);
    ctx.fillRect(12, -28 + breathe, 1, 12);
  }

  // --- GREATSWORD with blood groove and edge highlight ---
  ctx.save();
  ctx.rotate(e.angle);

  if (e.state === "swing") {
    const t = 1 - e.stateTimer / 0.3;
    ctx.rotate(-e.swingArc / 2 + e.swingArc * t);
    // Weapon trail
    ctx.globalAlpha = 0.12 * (1 - t);
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(18, -8, 36, 16);
    ctx.globalAlpha = 0.06 * (1 - t);
    ctx.fillStyle = "#ff8844";
    ctx.fillRect(18, -12, 36, 24);
    ctx.globalAlpha = 1;
  }

  // Blade body
  ctx.fillStyle = flash ? "#fff" : PAL.bossSword;
  ctx.fillRect(20, -3, 32, 6);
  // Blade edge highlight (top = light)
  ctx.fillStyle = flash ? "#fff" : PAL.bossSwordEdge;
  ctx.fillRect(20, -3, 32, 1);
  // Blade shadow (bottom)
  ctx.fillStyle = flash ? "#fff" : PAL.bossSwordDeep;
  ctx.fillRect(20, 2, 32, 1);
  // Tip with shaped point
  ctx.fillStyle = flash ? "#fff" : PAL.bossSwordEdge;
  ctx.fillRect(48, -4, 6, 8);
  ctx.fillRect(52, -3, 3, 6);
  ctx.fillRect(54, -2, 2, 4);
  // Blood groove (fuller)
  ctx.fillStyle = flash ? "#fff" : PAL.bossSwordDeep;
  ctx.fillRect(24, 0, 22, 1);
  // Groove highlight
  if (!flash) {
    ctx.fillStyle = PAL.bossSwordEdge;
    ctx.fillRect(24, -1, 22, 1);
    ctx.globalAlpha = 0.3;
    ctx.fillRect(24, -1, 22, 1);
    ctx.globalAlpha = 1;
  }

  // Guard with gems
  ctx.fillStyle = flash ? "#fff" : RAMP.gold[3];
  ctx.fillRect(16, -7, 6, 14);
  if (!flash) {
    ctx.fillStyle = RAMP.gold[1];
    ctx.fillRect(16, -7, 6, 2);
    ctx.fillRect(16, -7, 2, 14);
    ctx.fillStyle = RAMP.gold[4];
    ctx.fillRect(20, -3, 2, 10);
  }
  // Guard gems
  if (!flash) {
    ctx.fillStyle = isPhase2 ? "#ff2222" : "#4444aa";
    ctx.fillRect(17, -5, 3, 3);
    ctx.fillRect(17, 3, 3, 3);
    // Gem highlight
    ctx.fillStyle = isPhase2 ? "#ff8888" : "#8888ff";
    ctx.fillRect(17, -5, 1, 1);
    ctx.fillRect(17, 3, 1, 1);
  }

  // Handle with wrap
  ctx.fillStyle = flash ? "#fff" : RAMP.leather[3];
  ctx.fillRect(10, -3, 7, 6);
  if (!flash) {
    ctx.fillStyle = RAMP.leather[2];
    ctx.fillRect(11, -3, 2, 6);
    ctx.fillRect(14, -3, 2, 6);
    ctx.fillStyle = RAMP.leather[4];
    ctx.fillRect(12, -3, 1, 6);
    ctx.fillRect(15, -3, 1, 6);
  }
  // Pommel
  ctx.fillStyle = flash ? "#fff" : RAMP.gold[3];
  ctx.fillRect(8, -4, 4, 8);
  if (!flash) {
    ctx.fillStyle = RAMP.gold[1];
    ctx.fillRect(8, -4, 4, 1);
    ctx.fillRect(8, -4, 1, 8);
    ctx.fillStyle = RAMP.gold[4];
    ctx.fillRect(11, -1, 1, 5);
  }
  ctx.restore();

  // --- SLAM SHOCKWAVE EFFECT ---
  if (e.state === "slamming") {
    const t = 1 - e.stateTimer / 0.15;
    const r = e.slamRadius * t;
    const ringW = 6;
    ctx.globalAlpha = 0.35 * (1 - t);
    ctx.fillStyle = "#ff4422";
    // Ring (8 directions)
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rx = Math.cos(a) * r;
      const ry = Math.sin(a) * r;
      ctx.fillRect(rx - ringW / 2, ry - ringW / 2, ringW, ringW);
    }
    // Inner flash
    ctx.globalAlpha = 0.2 * (1 - t);
    ctx.fillStyle = "#ffaa44";
    ctx.fillRect(-r * 0.3, -r * 0.3, r * 0.6, r * 0.6);
    ctx.globalAlpha = 1;
  }

  // --- CHARGE WINDUP telegraph ---
  if (e.state === "charge_windup") {
    ctx.globalAlpha = 0.3 + Math.sin(performance.now() / 60) * 0.2;
    ctx.fillStyle = "#ff2222";
    const dx = Math.cos(e.chargeDir);
    const dy = Math.sin(e.chargeDir);
    for (let i = 1; i < 6; i++) {
      const s = 5 - i * 0.7;
      ctx.fillRect(dx * i * 18 - s / 2, dy * i * 18 - s / 2, s, s);
    }
    // Leaning forward visual cue
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(dx * 10 - 3, dy * 10 - 3, 6, 6);
    ctx.globalAlpha = 1;
  }

  // --- SLAM WINDUP warning ---
  if (e.state === "slam_windup") {
    const pulse = Math.sin(performance.now() / 50);
    const progress = 1 - e.stateTimer / 0.6;
    ctx.globalAlpha = 0.12 + pulse * 0.08;
    ctx.fillStyle = "#ff6622";
    const wr = e.slamRadius * (0.3 + progress * 0.7);
    // Warning ring
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rx = Math.cos(a) * wr;
      const ry = Math.sin(a) * wr;
      ctx.fillRect(rx - 3, ry - 3, 6, 6);
    }
    ctx.globalAlpha = 1;
  }
}

// Draw only boss effects (used when sprite replaces body rendering)
// Assumes ctx is already translated to boss position
export function drawBossEffects(e, flash) {
  const globalTime = getGlobalTime();
  const isPhase2 = e.phase === 2;
  const ctx = _bossCtx;

  // Phase 2 aura glow
  if (isPhase2 && !flash) {
    ctx.globalAlpha = 0.08 + Math.sin(globalTime * 3) * 0.04;
    const auraGrad = ctx.createRadialGradient(0, 0, 5, 0, 0, 35);
    auraGrad.addColorStop(0, "#ff2222");
    auraGrad.addColorStop(1, "rgba(255,0,0,0)");
    ctx.fillStyle = auraGrad;
    ctx.fillRect(-35, -40, 70, 70);
    ctx.globalAlpha = 1;
  }

  // Phase 2: armor cracks (drawn on top of sprite)
  if (isPhase2 && !flash) {
    const breathe = Math.sin(globalTime * 2) * 1;
    ctx.fillStyle = "#ff4422";
    ctx.globalAlpha = 0.4 + Math.sin(globalTime * 5) * 0.2;
    ctx.fillRect(-8, -12 + breathe, 1, 8);
    ctx.fillRect(-7, -6 + breathe, 6, 1);
    ctx.fillRect(4, -14 + breathe, 1, 10);
    ctx.fillRect(4, -4 + breathe, 4, 1);
    ctx.fillRect(-2, 2 + breathe, 8, 1);
    ctx.fillRect(6, -2 + breathe, 1, 6);
    ctx.globalAlpha = 1;
  }

  // Greatsword
  ctx.save();
  ctx.rotate(e.angle);

  if (e.state === "swing") {
    const t = 1 - e.stateTimer / 0.3;
    ctx.rotate(-e.swingArc / 2 + e.swingArc * t);
    ctx.globalAlpha = 0.12 * (1 - t);
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(18, -8, 36, 16);
    ctx.globalAlpha = 0.06 * (1 - t);
    ctx.fillStyle = "#ff8844";
    ctx.fillRect(18, -12, 36, 24);
    ctx.globalAlpha = 1;
  }

  // Blade
  ctx.fillStyle = flash ? "#fff" : PAL.bossSword;
  ctx.fillRect(20, -3, 32, 6);
  ctx.fillStyle = flash ? "#fff" : PAL.bossSwordEdge;
  ctx.fillRect(20, -3, 32, 1);
  ctx.fillStyle = flash ? "#fff" : PAL.bossSwordDeep;
  ctx.fillRect(20, 2, 32, 1);
  ctx.fillStyle = flash ? "#fff" : PAL.bossSwordEdge;
  ctx.fillRect(48, -4, 6, 8);
  ctx.fillRect(52, -3, 3, 6);
  ctx.fillRect(54, -2, 2, 4);
  ctx.fillStyle = flash ? "#fff" : PAL.bossSwordDeep;
  ctx.fillRect(24, 0, 22, 1);
  if (!flash) {
    ctx.fillStyle = PAL.bossSwordEdge;
    ctx.fillRect(24, -1, 22, 1);
    ctx.globalAlpha = 0.3;
    ctx.fillRect(24, -1, 22, 1);
    ctx.globalAlpha = 1;
  }
  // Guard
  ctx.fillStyle = flash ? "#fff" : RAMP.gold[3];
  ctx.fillRect(16, -7, 6, 14);
  if (!flash) {
    ctx.fillStyle = RAMP.gold[1];
    ctx.fillRect(16, -7, 6, 2);
    ctx.fillRect(16, -7, 2, 14);
    ctx.fillStyle = RAMP.gold[4];
    ctx.fillRect(20, -3, 2, 10);
  }
  if (!flash) {
    ctx.fillStyle = isPhase2 ? "#ff2222" : "#4444aa";
    ctx.fillRect(17, -5, 3, 3);
    ctx.fillRect(17, 3, 3, 3);
    ctx.fillStyle = isPhase2 ? "#ff8888" : "#8888ff";
    ctx.fillRect(17, -5, 1, 1);
    ctx.fillRect(17, 3, 1, 1);
  }
  // Handle
  ctx.fillStyle = flash ? "#fff" : RAMP.leather[3];
  ctx.fillRect(10, -3, 7, 6);
  if (!flash) {
    ctx.fillStyle = RAMP.leather[2];
    ctx.fillRect(11, -3, 2, 6);
    ctx.fillRect(14, -3, 2, 6);
    ctx.fillStyle = RAMP.leather[4];
    ctx.fillRect(12, -3, 1, 6);
    ctx.fillRect(15, -3, 1, 6);
  }
  // Pommel
  ctx.fillStyle = flash ? "#fff" : RAMP.gold[3];
  ctx.fillRect(8, -4, 4, 8);
  if (!flash) {
    ctx.fillStyle = RAMP.gold[1];
    ctx.fillRect(8, -4, 4, 1);
    ctx.fillRect(8, -4, 1, 8);
    ctx.fillStyle = RAMP.gold[4];
    ctx.fillRect(11, -1, 1, 5);
  }
  ctx.restore();

  // Slam shockwave
  if (e.state === "slamming") {
    const t = 1 - e.stateTimer / 0.15;
    const r = e.slamRadius * t;
    const ringW = 6;
    ctx.globalAlpha = 0.35 * (1 - t);
    ctx.fillStyle = "#ff4422";
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      const rx = Math.cos(a) * r;
      const ry = Math.sin(a) * r;
      ctx.fillRect(rx - ringW / 2, ry - ringW / 2, ringW, ringW);
    }
    ctx.globalAlpha = 0.2 * (1 - t);
    ctx.fillStyle = "#ffaa44";
    ctx.fillRect(-r * 0.3, -r * 0.3, r * 0.6, r * 0.6);
    ctx.globalAlpha = 1;
  }

  // Charge windup telegraph
  if (e.state === "charge_windup") {
    ctx.globalAlpha = 0.3 + Math.sin(performance.now() / 60) * 0.2;
    ctx.fillStyle = "#ff2222";
    const dx = Math.cos(e.chargeDir);
    const dy = Math.sin(e.chargeDir);
    for (let i = 1; i < 6; i++) {
      const s = 5 - i * 0.7;
      ctx.fillRect(dx * i * 18 - s / 2, dy * i * 18 - s / 2, s, s);
    }
    ctx.globalAlpha = 0.15;
    ctx.fillStyle = "#ff4444";
    ctx.fillRect(dx * 10 - 3, dy * 10 - 3, 6, 6);
    ctx.globalAlpha = 1;
  }

  // Slam windup warning
  if (e.state === "slam_windup") {
    const pulse = Math.sin(performance.now() / 50);
    const progress = 1 - e.stateTimer / 0.6;
    ctx.globalAlpha = 0.12 + pulse * 0.08;
    ctx.fillStyle = "#ff6622";
    const wr = e.slamRadius * (0.3 + progress * 0.7);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const rx = Math.cos(a) * wr;
      const ry = Math.sin(a) * wr;
      ctx.fillRect(rx - 3, ry - 3, 6, 6);
    }
    ctx.globalAlpha = 1;
  }
}

let _bossCtx = null;

export function setBossCtx(ctx) {
  _bossCtx = ctx;
}
