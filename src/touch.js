"use strict";

import { W, H } from './config.js';

// Callbacks to avoid circular imports with input.js
let _onTouchTap = null;
let _onTouchUpdateMouse = null;
export function setTouchTapCallback(cb) { _onTouchTap = cb; }
export function setTouchMouseCallback(cb) { _onTouchUpdateMouse = cb; }

// ============================================================
// MOBILE TOUCH CONTROLS
// Virtual joystick (left) + action buttons (right)
// ============================================================

export let isTouchDevice = false;

// Joystick state
export const joystick = {
  active: false,
  startX: 0, startY: 0,  // center of joystick (where touch began)
  currentX: 0, currentY: 0,
  dx: 0, dy: 0,           // normalized -1..1
  touchId: null,
};

// Button state
export const touchButtons = {
  attack: false,
  dash: false,
  block: false,
  attackTouchId: null,
  dashTouchId: null,
  blockTouchId: null,
};

// Touch tap for menus
export let touchTap = null;
export function consumeTouchTap() {
  const t = touchTap;
  touchTap = null;
  return t;
}

const JOYSTICK_RADIUS = 50;
const JOYSTICK_DEAD_ZONE = 8;
const BUTTON_RADIUS = 32;

// Button positions (in canvas coordinates, computed relative to W/H)
function getButtonPositions(hasShield) {
  const attackX = W - 70;
  const attackY = H - 100;
  const dashX = W - 140;
  const dashY = H - 70;
  const blockX = W - 70;
  const blockY = H - 180;
  return { attackX, attackY, dashX, dashY, blockX, blockY };
}

let _canvas = null;

export function initTouch(canvas) {
  _canvas = canvas;

  // Detect touch capability
  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    isTouchDevice = true;
  }

  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });
}

function canvasCoords(touch) {
  const r = _canvas.getBoundingClientRect();
  return {
    x: (touch.clientX - r.left) * (W / r.width),
    y: (touch.clientY - r.top) * (H / r.height),
  };
}

function onTouchStart(e) {
  e.preventDefault();
  isTouchDevice = true;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    const pos = canvasCoords(touch);

    // Check if touch hits a button (right side)
    const btns = getButtonPositions();

    const distAttack = Math.hypot(pos.x - btns.attackX, pos.y - btns.attackY);
    const distDash = Math.hypot(pos.x - btns.dashX, pos.y - btns.dashY);
    const distBlock = Math.hypot(pos.x - btns.blockX, pos.y - btns.blockY);

    if (distAttack < BUTTON_RADIUS + 10) {
      touchButtons.attack = true;
      touchButtons.attackTouchId = touch.identifier;
      if (_onTouchTap) _onTouchTap();
      continue;
    }
    if (distDash < BUTTON_RADIUS + 5) {
      touchButtons.dash = true;
      touchButtons.dashTouchId = touch.identifier;
      continue;
    }
    if (distBlock < BUTTON_RADIUS + 5) {
      touchButtons.block = true;
      touchButtons.blockTouchId = touch.identifier;
      continue;
    }

    // Left half of screen = joystick
    if (pos.x < W * 0.5 && joystick.touchId === null) {
      joystick.active = true;
      joystick.touchId = touch.identifier;
      joystick.startX = pos.x;
      joystick.startY = pos.y;
      joystick.currentX = pos.x;
      joystick.currentY = pos.y;
      joystick.dx = 0;
      joystick.dy = 0;
      continue;
    }

    // Any other tap (for menus) — also update mouse pos for hover detection
    touchTap = pos;
    if (_onTouchUpdateMouse) _onTouchUpdateMouse(pos.x, pos.y);
    if (_onTouchTap) _onTouchTap();
  }
}

function onTouchMove(e) {
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    const pos = canvasCoords(touch);

    if (touch.identifier === joystick.touchId) {
      joystick.currentX = pos.x;
      joystick.currentY = pos.y;
      let dx = pos.x - joystick.startX;
      let dy = pos.y - joystick.startY;
      const dist = Math.hypot(dx, dy);
      if (dist < JOYSTICK_DEAD_ZONE) {
        joystick.dx = 0;
        joystick.dy = 0;
      } else {
        // Clamp to joystick radius
        if (dist > JOYSTICK_RADIUS) {
          dx = (dx / dist) * JOYSTICK_RADIUS;
          dy = (dy / dist) * JOYSTICK_RADIUS;
        }
        joystick.dx = dx / JOYSTICK_RADIUS;
        joystick.dy = dy / JOYSTICK_RADIUS;
      }
    }
  }
}

function onTouchEnd(e) {
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];

    if (touch.identifier === joystick.touchId) {
      joystick.active = false;
      joystick.touchId = null;
      joystick.dx = 0;
      joystick.dy = 0;
    }
    if (touch.identifier === touchButtons.attackTouchId) {
      touchButtons.attack = false;
      touchButtons.attackTouchId = null;
    }
    if (touch.identifier === touchButtons.dashTouchId) {
      touchButtons.dash = false;
      touchButtons.dashTouchId = null;
    }
    if (touch.identifier === touchButtons.blockTouchId) {
      touchButtons.block = false;
      touchButtons.blockTouchId = null;
    }
  }
}

// ============================================================
// DRAW TOUCH CONTROLS OVERLAY
// ============================================================
export function drawTouchControls(ctx, hasShield) {
  if (!isTouchDevice) return;

  const btns = getButtonPositions(hasShield);

  // --- JOYSTICK ---
  if (joystick.active) {
    // Outer ring
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(joystick.startX, joystick.startY, JOYSTICK_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    // Inner thumb
    const thumbX = joystick.startX + joystick.dx * JOYSTICK_RADIUS;
    const thumbY = joystick.startY + joystick.dy * JOYSTICK_RADIUS;
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(thumbX, thumbY, 18, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    // Hint: show faded joystick area
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(120, H - 120, JOYSTICK_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(120, H - 120, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // --- ACTION BUTTONS ---
  // Attack button (large, red tint)
  drawActionButton(ctx, btns.attackX, btns.attackY, BUTTON_RADIUS, touchButtons.attack, "#ff4444", "ATK");

  // Dash button (blue)
  drawActionButton(ctx, btns.dashX, btns.dashY, BUTTON_RADIUS * 0.75, touchButtons.dash, "#4488ff", "DASH");

  // Block button (only show for shield characters)
  if (hasShield) {
    drawActionButton(ctx, btns.blockX, btns.blockY, BUTTON_RADIUS * 0.75, touchButtons.block, "#44bbff", "BLK");
  }
}

function drawActionButton(ctx, x, y, radius, pressed, color, label) {
  ctx.globalAlpha = pressed ? 0.5 : 0.15;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = pressed ? 0.8 : 0.3;
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.globalAlpha = pressed ? 0.9 : 0.4;
  ctx.fillStyle = "#ffffff";
  ctx.font = `bold ${Math.floor(radius * 0.45)}px monospace`;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(label, x, y);
  ctx.textBaseline = "alphabetic";
  ctx.globalAlpha = 1;
}
