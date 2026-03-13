"use strict";

import { TILE, PAL, RAMP, W, H } from './config.js';
import { rand } from './utils.js';
import { getRoomState } from './rooms.js';
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

  // Update smoke particles
  for (let i = smokeParticles.length - 1; i >= 0; i--) {
    const s = smokeParticles[i];
    s.x += s.vx * dt;
    s.y += s.vy * dt;
    s.life -= dt;
    s.alpha *= 0.97;
    if (s.life <= 0) smokeParticles.splice(i, 1);
  }

  // Spawn new smoke from torches
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
// Each flame frame is a small pixel pattern using fire color ramp
const FLAME_FRAMES = [
  // Frame 0
  [
    "00100",
    "01210",
    "12321",
    "12321",
    "01210",
  ],
  // Frame 1
  [
    "01000",
    "01210",
    "12321",
    "12321",
    "01210",
  ],
  // Frame 2
  [
    "00010",
    "01210",
    "13231",
    "12321",
    "01210",
  ],
  // Frame 3
  [
    "00100",
    "01310",
    "12321",
    "13231",
    "01210",
  ],
];

const FIRE_COLORS = [
  "transparent",      // 0
  RAMP.fire[2],       // 1 - orange
  RAMP.fire[1],       // 2 - yellow
  RAMP.fire[0],       // 3 - white-yellow
];

export function drawTorches(ctx) {
  const globalTime = getGlobalTime();
  for (const torch of torches) {
    const t = globalTime + torch.flicker;
    const flicker = Math.sin(t * 12) * 0.15 + Math.sin(t * 7.3) * 0.1 + Math.cos(t * 19) * 0.05;
    const intensity = torch.intensity + flicker;

    // Torch bracket (metal detail)
    // Bracket arm
    ctx.fillStyle = PAL.torchBracket;
    ctx.fillRect(torch.x - 4, torch.y + 1, 8, 3);
    ctx.fillRect(torch.x - 2, torch.y - 1, 4, 2);
    // Bracket highlight
    ctx.fillStyle = PAL.torchBracketLight;
    ctx.fillRect(torch.x - 4, torch.y + 1, 8, 1);
    // Bracket shadow
    ctx.fillStyle = RAMP.steel[4];
    ctx.fillRect(torch.x - 4, torch.y + 3, 8, 1);
    // Bracket rivets
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
    const flameW = 5;
    const flameH = 5;
    const fh = 6 + flicker * 3;
    const flameX = torch.x - Math.floor(flameW * flameScale / 2);
    const flameY = torch.y - 4 - fh;

    for (let fy = 0; fy < flameH; fy++) {
      for (let fx = 0; fx < flameW; fx++) {
        const ci = parseInt(frame[fy][fx]);
        if (ci === 0) continue;
        ctx.fillStyle = FIRE_COLORS[ci];
        ctx.fillRect(flameX + fx * flameScale, flameY + fy * flameScale, flameScale, flameScale);
      }
    }

    // Flame tip (extra bright)
    ctx.fillStyle = RAMP.fire[0];
    ctx.fillRect(torch.x - 1, flameY - 1, 2, 2);
    // Flame base glow
    ctx.fillStyle = RAMP.fire[3];
    ctx.fillRect(torch.x - 2, torch.y - 5, 4, 2);

    // Light glow (warm tint)
    const glowR = torch.baseRadius * (0.9 + flicker * 0.3);
    const glow = ctx.createRadialGradient(torch.x, torch.y - 4, 2, torch.x, torch.y - 4, glowR);
    glow.addColorStop(0, `rgba(255,170,70,${0.12 * intensity})`);
    glow.addColorStop(0.3, `rgba(255,140,50,${0.08 * intensity})`);
    glow.addColorStop(0.6, `rgba(255,110,30,${0.04 * intensity})`);
    glow.addColorStop(1, "rgba(255,100,20,0)");
    ctx.fillStyle = glow;
    ctx.fillRect(torch.x - glowR, torch.y - 4 - glowR, glowR * 2, glowR * 2);
  }

  // Draw smoke particles
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

let _darkCanvas = null;

export function drawDarknessOverlay(ctx) {
  const globalTime = getGlobalTime();
  if (!_darkCanvas) {
    _darkCanvas = document.createElement("canvas");
    _darkCanvas.width = W;
    _darkCanvas.height = H;
  }
  const darkCanvas = _darkCanvas;
  const dctx = darkCanvas.getContext("2d");

  // Use multiply blend for more natural darkness
  dctx.clearRect(0, 0, W, H);

  // Base darkness layer
  dctx.fillStyle = "rgba(5,3,15,0.55)";
  dctx.fillRect(0, 0, W, H);

  dctx.globalCompositeOperation = "destination-out";

  // Player light with warm tint
  const plGrad = dctx.createRadialGradient(player.x, player.y, 8, player.x, player.y, 145);
  plGrad.addColorStop(0, "rgba(0,0,0,1)");
  plGrad.addColorStop(0.4, "rgba(0,0,0,0.8)");
  plGrad.addColorStop(0.7, "rgba(0,0,0,0.4)");
  plGrad.addColorStop(1, "rgba(0,0,0,0)");
  dctx.fillStyle = plGrad;
  dctx.fillRect(0, 0, W, H);

  // Torch lights
  for (const torch of torches) {
    const t = globalTime + torch.flicker;
    const flicker = Math.sin(t * 12) * 0.1 + Math.sin(t * 7.3) * 0.05;
    const r = torch.baseRadius * (0.8 + flicker * 0.2);
    const tGrad = dctx.createRadialGradient(torch.x, torch.y - 4, 3, torch.x, torch.y - 4, r);
    tGrad.addColorStop(0, "rgba(0,0,0,0.9)");
    tGrad.addColorStop(0.5, "rgba(0,0,0,0.5)");
    tGrad.addColorStop(0.8, "rgba(0,0,0,0.2)");
    tGrad.addColorStop(1, "rgba(0,0,0,0)");
    dctx.fillStyle = tGrad;
    dctx.fillRect(torch.x - r, torch.y - 4 - r, r * 2, r * 2);
  }

  dctx.globalCompositeOperation = "source-over";

  // Add warm tint to the darkness (not pure black)
  dctx.globalCompositeOperation = "source-atop";
  dctx.fillStyle = "rgba(10,5,20,0.15)";
  dctx.fillRect(0, 0, W, H);
  dctx.globalCompositeOperation = "source-over";

  ctx.drawImage(darkCanvas, 0, 0);
}

export function drawVignette(ctx) {
  const vg = ctx.createRadialGradient(W / 2, H / 2, 150, W / 2, H / 2, 450);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(0.7, "rgba(0,0,0,0.15)");
  vg.addColorStop(1, "rgba(0,0,0,0.45)");
  ctx.fillStyle = vg;
  ctx.fillRect(0, 0, W, H);
}
