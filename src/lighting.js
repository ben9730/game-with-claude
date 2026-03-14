"use strict";

import { TILE, PAL, RAMP, W, H } from './config.js';
import { rand } from './utils.js';
import { getRoomState, getWallSegments } from './rooms.js';
import { getGlobalTime } from './main.js';
import { player } from './player.js';

export let torches = [];
export let fogParticles = [];

// Smoke particles rising from torches
let smokeParticles = [];

export function generateTorches() {
  torches = [];
  smokeParticles = [];
  const { roomGrid, roomW, roomH, roomOffX, roomOffY } = getRoomState();
  for (let y = 1; y < roomH - 1; y++) {
    for (let x = 0; x < roomW; x++) {
      if (roomGrid[y][x] === 1) {
        if (y + 1 < roomH && roomGrid[y + 1][x] === 0) {
          if ((x * 3 + y * 7) % 5 === 0) {
            torches.push({
              x: roomOffX + x * TILE + TILE / 2,
              y: roomOffY + y * TILE + TILE - 2,
              flicker: rand(0, 10),
              intensity: rand(0.7, 1.0),
              baseRadius: rand(70, 100),
              flameFrame: rand(0, 4) | 0,
              frameTimer: 0,
            });
          }
        }
        if (x + 1 < roomW && roomGrid[y][x + 1] === 0) {
          if ((x * 11 + y * 3) % 7 === 0) {
            torches.push({
              x: roomOffX + x * TILE + TILE - 2,
              y: roomOffY + y * TILE + TILE / 2,
              flicker: rand(0, 10),
              intensity: rand(0.7, 1.0),
              baseRadius: rand(60, 90),
              flameFrame: rand(0, 4) | 0,
              frameTimer: 0,
            });
          }
        }
      }
    }
  }
}

export function initFog() {
  fogParticles = [];
  const { roomOffX, roomOffY, roomPxW, roomPxH } = getRoomState();
  for (let i = 0; i < 15; i++) {
    fogParticles.push({
      x: rand(roomOffX, roomOffX + roomPxW),
      y: rand(roomOffY, roomOffY + roomPxH),
      vx: rand(-8, 8),
      vy: rand(-3, 3),
      size: rand(40, 100),
      alpha: rand(0.01, 0.04),
      phase: rand(0, Math.PI * 2),
    });
  }
}

export function updateFog(dt) {
  const { roomOffX, roomOffY, roomPxW, roomPxH } = getRoomState();
  for (const f of fogParticles) {
    f.x += f.vx * dt;
    f.y += f.vy * dt;
    f.phase += dt * 0.5;
    if (f.x < roomOffX - f.size) f.x = roomOffX + roomPxW;
    if (f.x > roomOffX + roomPxW + f.size) f.x = roomOffX - f.size;
    if (f.y < roomOffY - f.size) f.y = roomOffY + roomPxH;
    if (f.y > roomOffY + roomPxH + f.size) f.y = roomOffY - f.size;
  }

  // Update smoke
  for (let i = smokeParticles.length - 1; i >= 0; i--) {
    const s = smokeParticles[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    s.alpha *= 0.97;
    if (s.life <= 0) smokeParticles.splice(i, 1);
  }

  // Spawn smoke from torches
  for (const torch of torches) {
    if (Math.random() < dt * 3) {
      smokeParticles.push({
        x: torch.x + rand(-2, 2),
        y: torch.y - 10,
        vx: rand(-5, 5),
        vy: rand(-15, -25),
        life: rand(0.5, 1.2),
        size: rand(2, 5),
        alpha: rand(0.08, 0.15),
      });
    }
  }
}

// ============================================================
// MULTI-FRAME TORCH FLAME (4 frames cycling)
// ============================================================
const FLAME_FRAMES = [
  ["00100", "01210", "12321", "12321", "01210"],
  ["01000", "01210", "12321", "12321", "01210"],
  ["00010", "01210", "13231", "12321", "01210"],
  ["00100", "01310", "12321", "13231", "01210"],
];

const FIRE_COLORS = [
  "transparent",
  RAMP.fire[2],
  RAMP.fire[1],
  RAMP.fire[0],
];

export function drawTorches(ctx) {
  const globalTime = getGlobalTime();
  for (const torch of torches) {
    const t = globalTime + torch.flicker;
    const flicker = Math.sin(t * 12) * 0.15 + Math.sin(t * 7.3) * 0.1 + Math.cos(t * 19) * 0.05;

    // Torch bracket
    ctx.fillStyle = PAL.torchBracket;
    ctx.fillRect(torch.x - 4, torch.y + 1, 8, 3);
    ctx.fillRect(torch.x - 2, torch.y - 1, 4, 2);
    ctx.fillStyle = PAL.torchBracketLight;
    ctx.fillRect(torch.x - 4, torch.y + 1, 8, 1);
    ctx.fillStyle = RAMP.steel[4];
    ctx.fillRect(torch.x - 4, torch.y + 3, 8, 1);
    ctx.fillStyle = RAMP.steel[0];
    ctx.fillRect(torch.x - 3, torch.y + 2, 1, 1);
    ctx.fillRect(torch.x + 3, torch.y + 2, 1, 1);

    // Torch stick
    ctx.fillStyle = RAMP.wood[2];
    ctx.fillRect(torch.x - 2, torch.y - 4, 4, 6);
    ctx.fillStyle = RAMP.wood[1];
    ctx.fillRect(torch.x - 2, torch.y - 4, 1, 6);
    ctx.fillStyle = RAMP.wood[3];
    ctx.fillRect(torch.x + 1, torch.y - 4, 1, 6);

    // Multi-frame animated flame
    const frameIndex = Math.floor(t * 6) % 4;
    const frame = FLAME_FRAMES[frameIndex];
    const flameScale = 2;
    const fh = 6 + flicker * 3;
    const flameX = torch.x - Math.floor(5 * flameScale / 2);
    const flameY = torch.y - 4 - fh;

    for (let fy = 0; fy < 5; fy++) {
      for (let fx = 0; fx < 5; fx++) {
        const ci = parseInt(frame[fy][fx]);
        if (ci === 0) continue;
        ctx.fillStyle = FIRE_COLORS[ci];
        ctx.fillRect(flameX + fx * flameScale, flameY + fy * flameScale, flameScale, flameScale);
      }
    }

    // Flame tip
    ctx.fillStyle = RAMP.fire[0];
    ctx.fillRect(torch.x - 1, flameY - 1, 2, 2);
    // Flame base glow
    ctx.fillStyle = RAMP.fire[3];
    ctx.fillRect(torch.x - 2, torch.y - 5, 4, 2);

    // Warm glow on nearby surfaces (subtle, before lighting pass)
    const intensity = torch.intensity + flicker;
    const glowR = torch.baseRadius * (0.9 + flicker * 0.3);
    const glow = ctx.createRadialGradient(torch.x, torch.y - 4, 2, torch.x, torch.y - 4, glowR * 0.5);
    glow.addColorStop(0, `rgba(255,170,70,${0.08 * intensity})`);
    glow.addColorStop(0.5, `rgba(255,140,50,${0.04 * intensity})`);
    glow.addColorStop(1, "rgba(255,100,20,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(torch.x - glowR * 0.5, torch.y - 4 - glowR * 0.5, glowR, glowR);
  }

  // Smoke
  for (const s of smokeParticles) {
    ctx.globalAlpha = s.alpha;
    ctx.fillStyle = "rgba(80,70,90,0.8)";
    ctx.fillRect(s.x - s.size / 2, s.y - s.size / 2, s.size, s.size);
  }
  ctx.globalAlpha = 1;
}

export function drawFog(ctx) {
  for (const f of fogParticles) {
    const a = f.alpha * (0.7 + Math.sin(f.phase) * 0.3);
    ctx.globalAlpha = a;
    const r = f.size;
    ctx.fillStyle = "rgba(60,50,80,0.6)";
    ctx.fillRect(f.x - r / 2, f.y - r / 2, r, r);
  }
  ctx.globalAlpha = 1;
}

// ============================================================
// SHADOW CASTING — visibility polygon
// ============================================================

// Ray-segment intersection
function rayIntersect(rx, ry, rdx, rdy, seg) {
  const sdx = seg.bx - seg.ax;
  const sdy = seg.by - seg.ay;
  const denom = sdx * rdy - sdy * rdx;
  if (Math.abs(denom) < 0.0001) return null;
  const t2 = (rdx * (seg.ay - ry) + rdy * (rx - seg.ax)) / denom;
  const t1 = (sdx !== 0) ? (seg.ax + sdx * t2 - rx) / rdx : (seg.ay + sdy * t2 - ry) / rdy;
  if (t1 < 0 || t2 < 0 || t2 > 1) return null;
  return { x: rx + rdx * t1, y: ry + rdy * t1, t1 };
}

// Compute visibility polygon for a light source
function getVisibilityPolygon(lx, ly, maxRadius) {
  const segments = getWallSegments();
  // Collect unique endpoints within range
  const seen = new Set();
  const angles = [];

  for (const seg of segments) {
    const dx1 = seg.ax - lx, dy1 = seg.ay - ly;
    const dx2 = seg.bx - lx, dy2 = seg.by - ly;
    // Only consider endpoints within radius
    if (dx1*dx1 + dy1*dy1 < maxRadius * maxRadius * 1.5) {
      const key1 = `${seg.ax},${seg.ay}`;
      if (!seen.has(key1)) {
        seen.add(key1);
        const a = Math.atan2(dy1, dx1);
        angles.push(a - 0.0001, a, a + 0.0001);
      }
    }
    if (dx2*dx2 + dy2*dy2 < maxRadius * maxRadius * 1.5) {
      const key2 = `${seg.bx},${seg.by}`;
      if (!seen.has(key2)) {
        seen.add(key2);
        const a = Math.atan2(dy2, dx2);
        angles.push(a - 0.0001, a, a + 0.0001);
      }
    }
  }

  // Cast rays and find closest intersection
  const intersections = [];
  for (const angle of angles) {
    const dx = Math.cos(angle);
    const dy = Math.sin(angle);
    let closest = null;
    let closestT1 = Infinity;

    for (const seg of segments) {
      const hit = rayIntersect(lx, ly, dx, dy, seg);
      if (hit && hit.t1 < closestT1) {
        closestT1 = hit.t1;
        closest = { x: hit.x, y: hit.y, angle };
      }
    }
    if (closest) intersections.push(closest);
  }

  // Sort by angle
  intersections.sort((a, b) => a.angle - b.angle);
  return intersections;
}

// ============================================================
// MULTIPLICATIVE LIGHTING — colored light, dark atmosphere
// ============================================================
let _lightCanvas = null;

export function drawLightingOverlay(ctx) {
  const globalTime = getGlobalTime();
  if (!_lightCanvas) {
    _lightCanvas = document.createElement("canvas");
    _lightCanvas.width = W;
    _lightCanvas.height = H;
  }
  const lctx = _lightCanvas.getContext("2d");

  // Fill with ambient darkness — dark purple for atmosphere
  lctx.globalCompositeOperation = "source-over";
  lctx.fillStyle = "rgb(16, 10, 26)";
  lctx.fillRect(0, 0, W, H);

  // Additive: punch light sources into the dark
  lctx.globalCompositeOperation = "lighter";

  // Player light with shadow casting
  const playerPoly = getVisibilityPolygon(player.x, player.y, 160);
  if (playerPoly.length > 2) {
    lctx.save();
    lctx.beginPath();
    lctx.moveTo(playerPoly[0].x, playerPoly[0].y);
    for (let i = 1; i < playerPoly.length; i++) {
      lctx.lineTo(playerPoly[i].x, playerPoly[i].y);
    }
    lctx.closePath();
    lctx.clip();

    // Draw player light gradient (only in visible areas)
    const plGrad = lctx.createRadialGradient(player.x, player.y, 4, player.x, player.y, 155);
    plGrad.addColorStop(0, "rgb(190, 170, 145)");
    plGrad.addColorStop(0.25, "rgb(140, 120, 100)");
    plGrad.addColorStop(0.5, "rgb(80, 65, 50)");
    plGrad.addColorStop(0.75, "rgb(30, 22, 16)");
    plGrad.addColorStop(1, "rgb(0, 0, 0)");
    lctx.fillStyle = plGrad;
    lctx.fillRect(0, 0, W, H);

    lctx.restore();
  }

  // Torch lights — warm orange with flicker
  for (const torch of torches) {
    const t = globalTime + torch.flicker;
    const flicker = Math.sin(t * 12) * 0.12 + Math.sin(t * 7.3) * 0.08;
    const r = torch.baseRadius * (0.85 + flicker * 0.25);
    const intensity = torch.intensity + flicker;

    // Warm orange-yellow light
    const ri = Math.min(255, (200 * intensity) | 0);
    const gi = Math.min(255, (130 * intensity) | 0);
    const bi = Math.min(255, (55 * intensity) | 0);

    const tGrad = lctx.createRadialGradient(torch.x, torch.y - 4, 2, torch.x, torch.y - 4, r);
    tGrad.addColorStop(0, `rgb(${ri}, ${gi}, ${bi})`);
    tGrad.addColorStop(0.35, `rgb(${ri >> 1}, ${gi >> 1}, ${bi >> 1})`);
    tGrad.addColorStop(0.65, `rgb(${ri >> 2}, ${gi >> 2}, ${bi >> 2})`);
    tGrad.addColorStop(1, "rgb(0, 0, 0)");
    lctx.fillStyle = tGrad;
    lctx.fillRect(torch.x - r, torch.y - 4 - r, r * 2, r * 2);
  }

  // Reset composite mode
  lctx.globalCompositeOperation = "source-over";

  // Composite light map onto main canvas with MULTIPLY
  ctx.globalCompositeOperation = "multiply";
  ctx.drawImage(_lightCanvas, 0, 0);
  ctx.globalCompositeOperation = "source-over";
}
