"use strict";

import { PAL, RAMP } from './config.js';
import { rand, clamp } from './utils.js';

export let particles = [];

export function clearParticles() {
  particles = [];
}

export function spawnParticles(x, y, count, color, speed, life, size, ptype) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(speed * 0.3, speed);
    particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: rand(life * 0.5, life), maxLife: life,
      color, size: rand(size * 0.5, size * 1.5),
      ptype: ptype || "square",
      gravity: (ptype === "fragment" || ptype === "blood") ? 200 : 0,
      rotation: rand(0, Math.PI * 2),
      rotSpeed: rand(-5, 5),
    });
  }
}

export function spawnSlashTrail(x, y, angle, arc) {
  const count = 16;
  // Arc of white -> blue -> purple fading sparks
  for (let i = 0; i < count; i++) {
    const t = i / count;
    const a = angle - arc / 2 + (arc * i / count);
    const r = rand(20, 38);
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    // Color gradient along arc: white -> blue -> purple
    let color;
    if (t < 0.33) color = "#ffffff";
    else if (t < 0.66) color = "#8899ff";
    else color = "#9955cc";

    particles.push({
      x: px, y: py,
      vx: Math.cos(a) * rand(30, 70),
      vy: Math.sin(a) * rand(30, 70),
      life: rand(0.1, 0.3), maxLife: 0.3,
      color, size: rand(2, 4),
      ptype: "spark", gravity: 0, rotation: a, rotSpeed: 0,
    });
  }
  // Extra bright sparks at the swing path
  for (let i = 0; i < 4; i++) {
    const a = angle - arc / 4 + (arc / 2 * i / 4);
    const r = rand(18, 34);
    particles.push({
      x: x + Math.cos(a) * r,
      y: y + Math.sin(a) * r,
      vx: Math.cos(a) * rand(10, 30),
      vy: Math.sin(a) * rand(10, 30),
      life: rand(0.15, 0.35), maxLife: 0.35,
      color: "#ffffff", size: rand(1, 2),
      ptype: "sparkle", gravity: 0, rotation: 0, rotSpeed: 0,
    });
  }
}

export function spawnDeathExplosion(x, y, type) {
  if (type === "slime") {
    // Green blobs with gravity that splat
    for (let i = 0; i < 14; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(40, 130);
      const colorPool = [RAMP.slime[0], RAMP.slime[1], RAMP.slime[2], RAMP.slime[3]];
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 40,
        life: rand(0.5, 1.0), maxLife: 1.0,
        color: colorPool[i % colorPool.length],
        size: rand(3, 8), ptype: "slime_blob",
        gravity: 280, rotation: rand(0, 6), rotSpeed: rand(-6, 6),
      });
    }
    // Puddle drips
    for (let i = 0; i < 6; i++) {
      const a = rand(0, Math.PI * 2);
      particles.push({
        x: x + Math.cos(a) * rand(3, 10),
        y: y + Math.sin(a) * rand(3, 10),
        vx: Math.cos(a) * rand(5, 20),
        vy: -rand(20, 50),
        life: rand(0.8, 1.5), maxLife: 1.5,
        color: RAMP.slime[3],
        size: rand(2, 4), ptype: "blood",
        gravity: 150, rotation: 0, rotSpeed: 0,
      });
    }
  } else if (type === "bat") {
    // Purple dust cloud
    for (let i = 0; i < 12; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(20, 70);
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 30,
        life: rand(0.4, 0.8), maxLife: 0.8,
        color: i % 3 === 0 ? RAMP.purple[0] : i % 2 === 0 ? RAMP.purple[1] : RAMP.purple[2],
        size: rand(3, 6), ptype: "dust",
        gravity: -20, rotation: rand(0, 6), rotSpeed: rand(-3, 3),
      });
    }
    // Wing fragment flutter
    for (let i = 0; i < 4; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(30, 90);
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 50,
        life: rand(0.5, 1.0), maxLife: 1.0,
        color: RAMP.purple[3],
        size: rand(4, 7), ptype: "wing_fragment",
        gravity: 120, rotation: rand(0, 6), rotSpeed: rand(-12, 12),
      });
    }
  } else if (type === "skeleton") {
    // Bone chunks that bounce
    for (let i = 0; i < 16; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(60, 150);
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 70,
        life: rand(0.6, 1.2), maxLife: 1.2,
        color: i % 4 === 0 ? RAMP.bone[0] : i % 3 === 0 ? RAMP.bone[1] : RAMP.bone[2],
        size: rand(2, 5), ptype: "bone",
        gravity: 350, rotation: rand(0, 6), rotSpeed: rand(-14, 14),
        bounced: false,
      });
    }
    // Skull fragment
    particles.push({
      x, y,
      vx: rand(-30, 30),
      vy: -rand(80, 120),
      life: 1.0, maxLife: 1.0,
      color: RAMP.bone[1],
      size: 6, ptype: "bone",
      gravity: 300, rotation: rand(0, 6), rotSpeed: rand(-8, 8),
    });
  } else if (type === "boss") {
    // Massive explosion
    for (let i = 0; i < 40; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(60, 200);
      let color;
      if (i % 5 === 0) color = "#ffffff";
      else if (i % 4 === 0) color = PAL.bossEye;
      else if (i % 3 === 0) color = RAMP.fire[2];
      else color = PAL.bossArmor;
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 60,
        life: rand(0.7, 1.5), maxLife: 1.5,
        color,
        size: rand(3, 10), ptype: "fragment",
        gravity: 280, rotation: rand(0, 6), rotSpeed: rand(-10, 10),
      });
    }
    // Armor pieces breaking off (larger fragments)
    for (let i = 0; i < 8; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(40, 120);
      particles.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: -rand(80, 140),
        life: rand(1.0, 2.0), maxLife: 2.0,
        color: i % 2 === 0 ? PAL.bossArmor : PAL.bossArmorLight,
        size: rand(6, 12), ptype: "fragment",
        gravity: 250, rotation: rand(0, 6), rotSpeed: rand(-6, 6),
      });
    }
    // Screen flash particles (bright)
    for (let i = 0; i < 6; i++) {
      particles.push({
        x, y,
        vx: rand(-20, 20),
        vy: rand(-20, 20),
        life: 0.3, maxLife: 0.3,
        color: "#ffffff",
        size: rand(30, 60), ptype: "flash",
        gravity: 0, rotation: 0, rotSpeed: 0,
      });
    }
  }
}

export function spawnBlood(x, y, count) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(20, 70);
    particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 30,
      life: rand(0.3, 0.6), maxLife: 0.6,
      color: i % 3 === 0 ? RAMP.blood[0] : i % 2 === 0 ? RAMP.blood[1] : RAMP.blood[2],
      size: rand(2, 4), ptype: "blood",
      gravity: 200, rotation: 0, rotSpeed: 0,
    });
  }
}

export function spawnMagicSparkle(x, y, color) {
  // Themed color starburst with rising sparkles
  for (let i = 0; i < 12; i++) {
    const a = (i / 12) * Math.PI * 2;
    const s = rand(20, 60);
    particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s - 25,
      life: rand(0.3, 0.8), maxLife: 0.8,
      color: i % 3 === 0 ? "#ffffff" : color,
      size: rand(1, 3), ptype: "sparkle",
      gravity: -40, rotation: 0, rotSpeed: 0,
    });
  }
  // Rising sparkle trail
  for (let i = 0; i < 5; i++) {
    particles.push({
      x: x + rand(-8, 8),
      y: y + rand(-4, 4),
      vx: rand(-10, 10),
      vy: rand(-40, -80),
      life: rand(0.5, 1.0), maxLife: 1.0,
      color: "#ffffff",
      size: rand(1, 2), ptype: "sparkle",
      gravity: -20, rotation: 0, rotSpeed: 0,
    });
  }
}

// Hit sparks: directional burst away from hit
export function spawnDirectionalSparks(x, y, angle, count, color) {
  for (let i = 0; i < count; i++) {
    const spread = rand(-0.5, 0.5);
    const a = angle + spread;
    const s = rand(60, 140);
    particles.push({
      x, y,
      vx: Math.cos(a) * s,
      vy: Math.sin(a) * s,
      life: rand(0.1, 0.25), maxLife: 0.25,
      color: i % 2 === 0 ? "#ffffff" : color,
      size: rand(1, 3), ptype: "spark",
      gravity: 0, rotation: a, rotSpeed: 0,
    });
  }
}

export function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    if (p.gravity) p.vy += p.gravity * dt;
    p.vx *= 0.96;
    p.vy *= 0.96;
    if (p.rotation !== undefined) p.rotation += (p.rotSpeed || 0) * dt;

    // Bone bounce effect
    if (p.ptype === "bone" && !p.bounced && p.vy > 0 && p.life < p.maxLife * 0.5) {
      p.vy = -p.vy * 0.4;
      p.vx *= 0.6;
      p.bounced = true;
    }

    p.life -= dt;
    if (p.life <= 0) {
      // Swap-and-pop: O(1) removal instead of O(n) splice
      const last = particles.length - 1;
      if (i !== last) particles[i] = particles[last];
      particles.pop();
    }
  }
}

// Types that use additive blend for glow-through-darkness effect
const ADDITIVE_TYPES = { spark: 1, sparkle: 1, flash: 1 };

export function drawParticles(ctx) {
  // First pass: normal blend particles
  for (const p of particles) {
    if (ADDITIVE_TYPES[p.ptype]) continue;
    drawSingleParticle(ctx, p);
  }
  // Second pass: additive blend particles (glow)
  ctx.globalCompositeOperation = "lighter";
  for (const p of particles) {
    if (!ADDITIVE_TYPES[p.ptype]) continue;
    drawSingleParticle(ctx, p);
  }
  ctx.globalCompositeOperation = "source-over";
  ctx.globalAlpha = 1;
}

function drawSingleParticle(ctx, p) {
    const alpha = clamp(p.life / p.maxLife, 0, 1);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    const s = p.size * (p.ptype === "spark" ? 1 : (p.ptype === "flash" ? (1 - alpha) * 2 + 0.5 : alpha));
    // Sub-pixel rendering for smooth motion (no Math.floor for particles)
    const px = p.x - s / 2;
    const py = p.y - s / 2;

    if (p.ptype === "bone") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation || 0);
      // Cross-shaped bone
      ctx.fillRect(-s, -s * 0.3, s * 2, s * 0.6);
      ctx.fillRect(-s * 0.3, -s, s * 0.6, s * 2);
      // Bone joint dots
      ctx.fillStyle = RAMP.bone[3];
      ctx.fillRect(-s - 1, -s * 0.3 - 1, 2, 2);
      ctx.fillRect(s - 1, -s * 0.3 - 1, 2, 2);
      ctx.restore();
    } else if (p.ptype === "spark") {
      // Bright center pixel with glow
      ctx.fillRect(px, py, Math.ceil(s), Math.ceil(s));
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillRect(px - 1, py - 1, Math.ceil(s) + 2, Math.ceil(s) + 2);
      // Trail behind spark
      ctx.globalAlpha = alpha * 0.15;
      const tx = -p.vx * 0.02;
      const ty = -p.vy * 0.02;
      ctx.fillRect(px + tx, py + ty, Math.ceil(s), Math.ceil(s));
    } else if (p.ptype === "sparkle") {
      const t = performance.now() / 200 + p.x;
      const twinkle = Math.sin(t * 3) * 0.5 + 0.5;
      ctx.globalAlpha = alpha * twinkle;
      // Star shape: + pattern
      ctx.fillRect(px - 1, py, s + 2, 1);
      ctx.fillRect(px, py - 1, 1, s + 2);
      // Diagonal arms
      ctx.globalAlpha = alpha * twinkle * 0.5;
      ctx.fillRect(px - 1, py - 1, 1, 1);
      ctx.fillRect(px + 1, py - 1, 1, 1);
      ctx.fillRect(px - 1, py + 1, 1, 1);
      ctx.fillRect(px + 1, py + 1, 1, 1);
    } else if (p.ptype === "fragment") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation || 0);
      ctx.fillRect(-s / 2, -s / 2, s, s);
      // Fragment shading
      if (s > 4) {
        ctx.fillStyle = "rgba(255,255,255,0.15)";
        ctx.fillRect(-s / 2, -s / 2, s / 2, s / 2);
        ctx.fillStyle = "rgba(0,0,0,0.2)";
        ctx.fillRect(0, 0, s / 2, s / 2);
      }
      ctx.restore();
    } else if (p.ptype === "slime_blob") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation || 0);
      // Blobby shape
      ctx.fillRect(-s / 2, -s / 3, s, s * 0.6);
      ctx.fillRect(-s / 3, -s / 2, s * 0.6, s);
      // Highlight
      ctx.fillStyle = RAMP.slime[0];
      ctx.globalAlpha = alpha * 0.4;
      ctx.fillRect(-s / 4, -s / 4, 2, 2);
      ctx.restore();
    } else if (p.ptype === "dust") {
      // Soft dust puff
      ctx.globalAlpha = alpha * 0.6;
      ctx.fillRect(px - 1, py - 1, s + 2, s + 2);
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillRect(px - 2, py - 2, s + 4, s + 4);
    } else if (p.ptype === "wing_fragment") {
      ctx.save();
      ctx.translate(p.x, p.y);
      ctx.rotate(p.rotation || 0);
      // Triangular wing shape
      ctx.fillRect(-s / 2, -s / 4, s, s / 2);
      ctx.fillRect(-s / 3, -s / 3, s / 2, s * 0.6);
      ctx.restore();
    } else if (p.ptype === "flash") {
      // Screen flash effect
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillRect(px, py, s, s);
    } else if (p.ptype === "blood") {
      // Blood droplet with trail
      ctx.fillRect(px, py, Math.ceil(s), Math.ceil(s));
      ctx.globalAlpha = alpha * 0.3;
      ctx.fillRect(px, py - 2, Math.ceil(s * 0.6), 2);
    } else {
      ctx.fillRect(px, py, Math.ceil(s), Math.ceil(s));
    }
}
