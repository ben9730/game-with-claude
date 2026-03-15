"use strict";

import { W, H, RAMP } from './config.js';
import { rand } from './utils.js';

// ============================================================
// HIT STOP — freeze frames on big impacts
// ============================================================
let hitStopFrames = 0;

export function triggerHitStop(frames) {
  hitStopFrames = Math.max(hitStopFrames, frames);
}
export function getHitStopFrames() { return hitStopFrames; }
export function consumeHitStop() { if (hitStopFrames > 0) hitStopFrames--; }

// ============================================================
// GAME SPEED — slow-motion system
// ============================================================
let gameSpeed = 1.0;
let gameSpeedTarget = 1.0;
let gameSpeedTimer = 0;

export function triggerSlowMo(speed, duration) {
  gameSpeed = speed;
  gameSpeedTarget = 1.0;
  gameSpeedTimer = duration;
}

export function getGameSpeed() { return gameSpeed; }

export function updateGameSpeed(dt) {
  if (gameSpeedTimer > 0) {
    gameSpeedTimer -= dt;
    if (gameSpeedTimer <= 0) {
      gameSpeed = 1.0;
    }
  } else if (gameSpeed < 1.0) {
    gameSpeed = Math.min(1.0, gameSpeed + dt * 3);
  }
}

// ============================================================
// SCREEN FLASH — brief full-screen color overlay
// ============================================================
let screenFlashAlpha = 0;
let screenFlashColor = "#ffffff";

export function triggerScreenFlash(color, alpha) {
  screenFlashColor = color || "#ffffff";
  screenFlashAlpha = alpha || 0.3;
}

export function drawScreenFlash(ctx) {
  if (screenFlashAlpha > 0.005) {
    ctx.fillStyle = screenFlashColor;
    ctx.globalAlpha = screenFlashAlpha;
    ctx.fillRect(0, 0, W, H);
    ctx.globalAlpha = 1;
    screenFlashAlpha *= 0.75;
  }
}

// ============================================================
// CHROMATIC ABERRATION — RGB split on big hits
// ============================================================
let chromaFrames = 0;
let chromaIntensity = 0;
let _redCanvas = null, _blueCanvas = null;

export function triggerChroma(frames, intensity) {
  chromaFrames = frames;
  chromaIntensity = intensity || 3;
}

export function drawChroma(ctx) {
  if (chromaFrames <= 0) return;
  chromaFrames--;

  if (!_redCanvas) {
    _redCanvas = document.createElement("canvas");
    _redCanvas.width = W; _redCanvas.height = H;
    _blueCanvas = document.createElement("canvas");
    _blueCanvas.width = W; _blueCanvas.height = H;
  }

  const offset = Math.ceil(chromaIntensity * (chromaFrames / 5));
  if (offset < 1) return;

  const rCtx = _redCanvas.getContext("2d");
  const bCtx = _blueCanvas.getContext("2d");

  // Red channel
  rCtx.clearRect(0, 0, W, H);
  rCtx.drawImage(ctx.canvas, 0, 0);
  rCtx.globalCompositeOperation = "multiply";
  rCtx.fillStyle = "#ff0000";
  rCtx.fillRect(0, 0, W, H);
  rCtx.globalCompositeOperation = "source-over";

  // Blue channel
  bCtx.clearRect(0, 0, W, H);
  bCtx.drawImage(ctx.canvas, 0, 0);
  bCtx.globalCompositeOperation = "multiply";
  bCtx.fillStyle = "#0000ff";
  bCtx.fillRect(0, 0, W, H);
  bCtx.globalCompositeOperation = "source-over";

  // Composite with offsets
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.35;
  ctx.drawImage(_redCanvas, offset, 0);
  ctx.drawImage(_blueCanvas, -offset, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

// ============================================================
// BLOOM — ctx.filter blur + additive composite
// ============================================================
let _bloomCanvas = null;
let _bloomCtx = null;

export function drawBloom(ctx) {
  if (!_bloomCanvas) {
    _bloomCanvas = document.createElement("canvas");
    _bloomCanvas.width = W;
    _bloomCanvas.height = H;
    _bloomCtx = _bloomCanvas.getContext("2d");
  }

  // Copy scene to bloom canvas
  _bloomCtx.clearRect(0, 0, W, H);
  _bloomCtx.drawImage(ctx.canvas, 0, 0);

  // Apply GPU-accelerated blur
  _bloomCtx.filter = "blur(6px)";
  _bloomCtx.drawImage(_bloomCanvas, 0, 0);
  _bloomCtx.filter = "blur(4px)";
  _bloomCtx.drawImage(_bloomCanvas, 0, 0);
  _bloomCtx.filter = "none";

  // Composite with additive blend
  ctx.globalCompositeOperation = "lighter";
  ctx.globalAlpha = 0.08; // Reduced for bright scenes (was 0.25)
  ctx.drawImage(_bloomCanvas, 0, 0);
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
}

// ============================================================
// FILM GRAIN — pre-generated noise overlay
// ============================================================
const GRAIN_SIZE = 128;
let _grainCanvas = null;
let _grainData = null;
let _grainFrame = 0;

function initGrain() {
  _grainCanvas = document.createElement("canvas");
  _grainCanvas.width = GRAIN_SIZE;
  _grainCanvas.height = GRAIN_SIZE;
  const gctx = _grainCanvas.getContext("2d");
  _grainData = gctx.createImageData(GRAIN_SIZE, GRAIN_SIZE);
  regenerateGrain();
}

function regenerateGrain() {
  const d = _grainData.data;
  for (let i = 0; i < d.length; i += 4) {
    const v = Math.random() * 255;
    d[i] = d[i + 1] = d[i + 2] = v;
    d[i + 3] = 14;
  }
  _grainCanvas.getContext("2d").putImageData(_grainData, 0, 0);
}

export function drawFilmGrain(ctx) {
  if (!_grainCanvas) initGrain();
  if (++_grainFrame % 3 === 0) regenerateGrain();

  ctx.globalCompositeOperation = "overlay";
  const pattern = ctx.createPattern(_grainCanvas, "repeat");
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, W, H);
  ctx.globalCompositeOperation = "source-over";
}

// ============================================================
// AMBIENT MOTES — floating dust particles
// ============================================================
let ambientMotes = [];

export function initAmbientMotes() {
  ambientMotes = [];
  for (let i = 0; i < 35; i++) {
    ambientMotes.push({
      x: rand(0, W), y: rand(0, H),
      vx: rand(-6, 6), vy: rand(-4, 4),
      size: rand(1, 2.5),
      alpha: rand(0.08, 0.25),
      phase: rand(0, Math.PI * 2),
      color: i % 3 === 0 ? "#8899bb" : i % 2 === 0 ? "#aabbcc" : "#7788aa",
    });
  }
}

export function updateAmbientMotes(dt) {
  for (const m of ambientMotes) {
    m.x += m.vx * dt + Math.sin(m.phase) * 0.3;
    m.y += m.vy * dt;
    m.phase += dt * 1.5;
    if (m.y < -10) { m.y = H + 10; m.x = rand(0, W); }
    if (m.y > H + 10) { m.y = -10; m.x = rand(0, W); }
    if (m.x < -10) m.x = W + 10;
    if (m.x > W + 10) m.x = -10;
  }
}

export function drawAmbientMotes(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const m of ambientMotes) {
    const twinkle = 0.4 + Math.sin(m.phase) * 0.4;
    ctx.globalAlpha = m.alpha * twinkle;
    ctx.fillStyle = m.color;
    ctx.fillRect(m.x | 0, m.y | 0, m.size, m.size);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

// ============================================================
// TORCH EMBERS — rising warm particles near torches
// ============================================================
let embers = [];
let _torchRefs = [];

export function initEmbers(torches) {
  embers = [];
  _torchRefs = torches;
  for (const torch of torches) {
    for (let i = 0; i < 3 + (rand(0, 3) | 0); i++) {
      embers.push(createEmber(torch));
    }
  }
}

function createEmber(torch) {
  return {
    x: torch.x + rand(-15, 15), y: torch.y + rand(-20, 5),
    vx: rand(-10, 10), vy: rand(-25, -8),
    size: rand(1, 2.5), alpha: rand(0.3, 0.7),
    life: rand(1.0, 3.0), maxLife: 3.0,
    phase: rand(0, Math.PI * 2),
    tx: torch.x, ty: torch.y,
    color: Math.random() < 0.4 ? "#ffdd44" : Math.random() < 0.6 ? "#ff8833" : "#ffaa44",
  };
}

export function updateEmbers(dt) {
  for (let i = embers.length - 1; i >= 0; i--) {
    const e = embers[i];
    e.x += e.vx * dt + Math.sin(e.phase) * 0.5;
    e.y += e.vy * dt;
    e.phase += dt * 3;
    e.life -= dt;
    e.alpha *= 0.995;
    if (e.life <= 0 || e.alpha < 0.01) {
      const torch = _torchRefs.find(t => t.x === e.tx && t.y === e.ty);
      if (torch) { embers[i] = createEmber(torch); }
      else { embers.splice(i, 1); }
    }
  }
}

export function drawEmbers(ctx) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";
  for (const e of embers) {
    const lifeRatio = Math.max(0, e.life / e.maxLife);
    const flicker = 0.6 + Math.sin(e.phase) * 0.4;
    ctx.globalAlpha = e.alpha * lifeRatio * flicker;
    ctx.fillStyle = e.color;
    const s = e.size * (0.5 + lifeRatio * 0.5);
    ctx.fillRect(e.x, e.y, s, s);
    // Tiny glow
    ctx.globalAlpha *= 0.2;
    ctx.fillRect(e.x - 1, e.y - 1, s + 2, s + 2);
  }
  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

// ============================================================
// COLOR GRADING — floor depth tint + low HP danger pulse
// ============================================================
export function drawColorGrading(ctx, currentRoom, totalRooms, hpRatio, globalTime) {
  // Deeper = colder blue tint
  const depth = currentRoom / Math.max(1, totalRooms - 1);
  const coldAlpha = depth * 0.07;
  if (coldAlpha > 0.005) {
    ctx.fillStyle = `rgba(15,20,50,${coldAlpha})`;
    ctx.fillRect(0, 0, W, H);
  }

  // Low HP red danger pulse
  if (hpRatio < 0.3) {
    const urgency = 1 - hpRatio / 0.3;
    const pulse = 0.5 + Math.sin(globalTime * 4) * 0.5;
    ctx.fillStyle = `rgba(60,0,0,${urgency * pulse * 0.12})`;
    ctx.fillRect(0, 0, W, H);
    // Pulsing red border
    const bw = 3 + urgency * 3;
    const ba = urgency * pulse * 0.25;
    ctx.fillStyle = `rgba(120,10,10,${ba})`;
    ctx.fillRect(0, 0, W, bw);
    ctx.fillRect(0, H - bw, W, bw);
    ctx.fillRect(0, 0, bw, H);
    ctx.fillRect(W - bw, 0, bw, H);
  }
}

// ============================================================
// DAMAGE NUMBERS — floating damage popups
// ============================================================
let damageNumbers = [];

export function spawnDamageNumber(x, y, amount, color) {
  damageNumbers.push({
    x: x + rand(-8, 8), y,
    vy: -60, amount: Math.ceil(amount),
    life: 0.8, maxLife: 0.8,
    color: color || "#ffffff",
    scale: 1.5,
  });
}

export function updateDamageNumbers(dt) {
  for (let i = damageNumbers.length - 1; i >= 0; i--) {
    const d = damageNumbers[i];
    d.y += d.vy * dt;
    d.vy *= 0.96;
    d.life -= dt;
    d.scale = Math.max(1.0, d.scale - dt * 3);
    if (d.life <= 0) damageNumbers.splice(i, 1);
  }
}

export function drawDamageNumbers(ctx) {
  ctx.textAlign = "center";
  ctx.font = "bold 14px monospace";
  for (const d of damageNumbers) {
    const alpha = Math.min(1, d.life / (d.maxLife * 0.3));
    ctx.globalAlpha = alpha;
    // Shadow
    ctx.fillStyle = "#000000";
    ctx.fillText(d.amount, d.x + 1, d.y + 1);
    // Number
    ctx.fillStyle = d.color;
    ctx.fillText(d.amount, d.x, d.y);
  }
  ctx.globalAlpha = 1;
}

// ============================================================
// GOD RAYS — simplified radial lines from torches
// ============================================================
export function drawGodRays(ctx, torchList, globalTime) {
  ctx.save();
  ctx.globalCompositeOperation = "lighter";

  for (const torch of torchList) {
    const t = globalTime + torch.flicker;
    const flicker = Math.sin(t * 12) * 0.1 + Math.sin(t * 7.3) * 0.06;
    const intensity = (torch.intensity + flicker) * 0.03;
    const rayCount = 12;
    const rayLen = torch.baseRadius * 0.8;

    ctx.globalAlpha = intensity;
    ctx.strokeStyle = "rgba(255,180,80,1)";

    for (let i = 0; i < rayCount; i++) {
      const angle = (i / rayCount) * Math.PI * 2 + t * 0.15;
      const width = 1.5 + Math.sin(i * 2.3 + t * 2) * 0.8;
      const len = rayLen * (0.6 + Math.sin(i * 1.7 + t * 1.5) * 0.4);

      ctx.lineWidth = width;
      ctx.beginPath();
      ctx.moveTo(torch.x, torch.y - 4);
      ctx.lineTo(
        torch.x + Math.cos(angle) * len,
        torch.y - 4 + Math.sin(angle) * len
      );
      ctx.stroke();
    }
  }

  ctx.globalAlpha = 1;
  ctx.globalCompositeOperation = "source-over";
  ctx.restore();
}

// ============================================================
// SCANLINES — subtle horizontal lines for retro feel
// ============================================================
let _scanlineCanvas = null;

export function drawScanlines(ctx) {
  if (!_scanlineCanvas) {
    _scanlineCanvas = document.createElement("canvas");
    _scanlineCanvas.width = W;
    _scanlineCanvas.height = H;
    const sctx = _scanlineCanvas.getContext("2d");
    sctx.fillStyle = "rgba(0,0,0,0.025)";
    for (let y = 0; y < H; y += 3) {
      sctx.fillRect(0, y, W, 1);
    }
  }
  ctx.drawImage(_scanlineCanvas, 0, 0);
}

// ============================================================
// CACHED VIGNETTE — pre-rendered, never changes
// ============================================================
let _vignetteCanvas = null;

export function drawVignette(ctx) {
  if (!_vignetteCanvas) {
    _vignetteCanvas = document.createElement("canvas");
    _vignetteCanvas.width = W;
    _vignetteCanvas.height = H;
    const vctx = _vignetteCanvas.getContext("2d");
    const vg = vctx.createRadialGradient(W / 2, H / 2, 120, W / 2, H / 2, 450);
    vg.addColorStop(0, "rgba(0,0,0,0)");
    vg.addColorStop(0.6, "rgba(0,0,0,0.15)");
    vg.addColorStop(0.85, "rgba(0,0,0,0.35)");
    vg.addColorStop(1, "rgba(0,0,0,0.55)");
    vctx.fillStyle = vg;
    vctx.fillRect(0, 0, W, H);
  }
  ctx.drawImage(_vignetteCanvas, 0, 0);
}

// ============================================================
// SCREEN-SPACE RAIN — atmospheric dripping water in dungeon
// ============================================================
const rainDrops = [];
const RAIN_COUNT = 50;
let rainInited = false;

function initRain() {
  for (let i = 0; i < RAIN_COUNT; i++) {
    rainDrops.push({
      x: Math.random() * W,
      y: Math.random() * H,
      speed: 250 + Math.random() * 350,
      length: 6 + Math.random() * 12,
      alpha: 0.08 + Math.random() * 0.12,
      drift: -15 + Math.random() * 30,
    });
  }
  rainInited = true;
}

export function updateRain(dt) {
  if (!rainInited) initRain();
  for (const d of rainDrops) {
    d.y += d.speed * dt;
    d.x += d.drift * dt;
    if (d.y > H) {
      d.y = -d.length;
      d.x = Math.random() * W;
    }
    if (d.x < 0) d.x = W;
    if (d.x > W) d.x = 0;
  }
}

export function drawRain(ctx) {
  if (!rainInited) return;
  // Batch all rain into a single path for performance
  ctx.save();
  ctx.globalAlpha = 0.1;
  ctx.strokeStyle = "#8899bb";
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const d of rainDrops) {
    ctx.moveTo(d.x, d.y);
    ctx.lineTo(d.x + d.drift * 0.02, d.y + d.length);
  }
  ctx.stroke();
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ============================================================
// SCROLLING FOG LAYERS — parallax atmospheric fog
// ============================================================
let _fogCanvas1 = null;
let _fogCanvas2 = null;
let fogOffset1 = 0;
let fogOffset2 = 0;

function buildFogLayer(alpha, scale) {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const cx = c.getContext("2d");
  // Soft blob-based fog — denser, more visible
  for (let i = 0; i < 18; i++) {
    const bx = Math.random() * W;
    const by = Math.random() * H;
    const br = 80 + Math.random() * 160;
    const g = cx.createRadialGradient(bx, by, 0, bx, by, br * scale);
    g.addColorStop(0, `rgba(90,80,120,${alpha * 2.5})`);
    g.addColorStop(0.5, `rgba(90,80,120,${alpha * 1.2})`);
    g.addColorStop(1, "rgba(90,80,120,0)");
    cx.fillStyle = g;
    cx.fillRect(bx - br, by - br, br * 2, br * 2);
  }
  return c;
}

export function updateFogLayers(dt) {
  fogOffset1 = (fogOffset1 + dt * 6) % W;
}

export function drawFogLayers(ctx) {
  if (!_fogCanvas1) _fogCanvas1 = buildFogLayer(0.03, 1.2);
  ctx.drawImage(_fogCanvas1, fogOffset1, 0);
  ctx.drawImage(_fogCanvas1, fogOffset1 - W, 0);
}

// ============================================================
// DITHERED TRANSITION — Bayer matrix dissolve instead of fade
// ============================================================
const BAYER_4x4 = [
  [ 0/16,  8/16,  2/16, 10/16],
  [12/16,  4/16, 14/16,  6/16],
  [ 3/16, 11/16,  1/16,  9/16],
  [15/16,  7/16, 13/16,  5/16],
];

export function drawDitherTransition(ctx, progress) {
  if (progress <= 0) return;
  const pixelSize = 4; // Size of each dither cell
  ctx.fillStyle = "#000000";
  for (let y = 0; y < H; y += pixelSize) {
    for (let x = 0; x < W; x += pixelSize) {
      const bx = (x / pixelSize) % 4;
      const by = (y / pixelSize) % 4;
      const threshold = BAYER_4x4[by][bx];
      if (progress > threshold) {
        ctx.fillRect(x, y, pixelSize, pixelSize);
      }
    }
  }
}

// ============================================================
// FREEZE FRAME — brief white flash + pause on significant kills
// ============================================================
let freezeTimer = 0;
let freezeFlash = false;

export function triggerFreezeFrame(duration, flash) {
  freezeTimer = duration || 0.08;
  freezeFlash = flash !== false;
  if (freezeFlash) {
    triggerScreenFlash("#ffffff", 0.4);
  }
}

export function getFreezeTimer() { return freezeTimer; }
export function updateFreezeTimer(dt) {
  if (freezeTimer > 0) freezeTimer -= dt;
}

// ============================================================
// SPEED LINES — radial lines during dash for motion feel
// ============================================================
export function drawSpeedLines(ctx, playerX, playerY, dashDir, intensity) {
  if (intensity <= 0) return;
  ctx.save();
  ctx.globalAlpha = intensity * 0.25;
  ctx.strokeStyle = "#aaccff";
  ctx.lineWidth = 1.5;
  const count = 18;
  for (let i = 0; i < count; i++) {
    const angle = dashDir + Math.PI + (Math.random() - 0.5) * 1.2;
    const dist = 40 + Math.random() * 80;
    const len = 15 + Math.random() * 30;
    const sx = playerX + Math.cos(angle) * dist;
    const sy = playerY + Math.sin(angle) * dist;
    ctx.beginPath();
    ctx.moveTo(sx, sy);
    ctx.lineTo(sx + Math.cos(angle) * len, sy + Math.sin(angle) * len);
    ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
