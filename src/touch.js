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

// Controls only active during gameplay
let _gameplayMode = false;
export function setTouchGameplayMode(active) { _gameplayMode = active; }

// Joystick state
export const joystick = {
  active: false,
  startX: 0, startY: 0,
  currentX: 0, currentY: 0,
  dx: 0, dy: 0,
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

const JOYSTICK_RADIUS = 55;
const JOYSTICK_DEAD_ZONE = 8;
const BUTTON_RADIUS = 36;

// Button positions (in canvas coordinates)
function getButtonPositions() {
  return {
    attackX: W - 75,
    attackY: H - 110,
    dashX: W - 150,
    dashY: H - 75,
    blockX: W - 75,
    blockY: H - 195,
  };
}

let _canvas = null;

export function initTouch(canvas) {
  _canvas = canvas;

  if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
    isTouchDevice = true;
  }

  canvas.addEventListener("touchstart", onTouchStart, { passive: false });
  canvas.addEventListener("touchmove", onTouchMove, { passive: false });
  canvas.addEventListener("touchend", onTouchEnd, { passive: false });
  canvas.addEventListener("touchcancel", onTouchEnd, { passive: false });
}

// Correct coordinate mapping that accounts for object-fit: contain
function canvasCoords(touch) {
  const r = _canvas.getBoundingClientRect();
  const canvasAspect = W / H;
  const elemAspect = r.width / r.height;
  let renderW, renderH, offsetX, offsetY;

  if (elemAspect > canvasAspect) {
    // Pillarboxed (black bars on sides)
    renderH = r.height;
    renderW = r.height * canvasAspect;
    offsetX = (r.width - renderW) / 2;
    offsetY = 0;
  } else {
    // Letterboxed (black bars top/bottom)
    renderW = r.width;
    renderH = r.width / canvasAspect;
    offsetX = 0;
    offsetY = (r.height - renderH) / 2;
  }

  return {
    x: ((touch.clientX - r.left - offsetX) / renderW) * W,
    y: ((touch.clientY - r.top - offsetY) / renderH) * H,
  };
}

function onTouchStart(e) {
  e.preventDefault();
  isTouchDevice = true;

  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];
    const pos = canvasCoords(touch);

    // During gameplay: check buttons and joystick
    if (_gameplayMode) {
      const btns = getButtonPositions();

      const distAttack = Math.hypot(pos.x - btns.attackX, pos.y - btns.attackY);
      const distDash = Math.hypot(pos.x - btns.dashX, pos.y - btns.dashY);
      const distBlock = Math.hypot(pos.x - btns.blockX, pos.y - btns.blockY);

      if (distAttack < BUTTON_RADIUS + 14) {
        touchButtons.attack = true;
        touchButtons.attackTouchId = touch.identifier;
        continue;
      }
      if (distDash < BUTTON_RADIUS + 8) {
        touchButtons.dash = true;
        touchButtons.dashTouchId = touch.identifier;
        continue;
      }
      if (distBlock < BUTTON_RADIUS + 8) {
        touchButtons.block = true;
        touchButtons.blockTouchId = touch.identifier;
        continue;
      }

      // Left ~60% of screen = joystick
      if (pos.x < W * 0.6 && joystick.touchId === null) {
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
    }

    // Menu mode or unhandled touch: register as tap
    touchTap = pos;
    if (_onTouchUpdateMouse) _onTouchUpdateMouse(pos.x, pos.y);
    if (_onTouchTap) _onTouchTap();
  }
}

function onTouchMove(e) {
  e.preventDefault();
  for (let i = 0; i < e.changedTouches.length; i++) {
    const touch = e.changedTouches[i];

    if (touch.identifier === joystick.touchId) {
      const pos = canvasCoords(touch);
      joystick.currentX = pos.x;
      joystick.currentY = pos.y;
      let dx = pos.x - joystick.startX;
      let dy = pos.y - joystick.startY;
      const dist = Math.hypot(dx, dy);
      if (dist < JOYSTICK_DEAD_ZONE) {
        joystick.dx = 0;
        joystick.dy = 0;
      } else {
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

  const btns = getButtonPositions();

  // --- JOYSTICK ---
  if (joystick.active) {
    ctx.globalAlpha = 0.2;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(joystick.startX, joystick.startY, JOYSTICK_RADIUS, 0, Math.PI * 2);
    ctx.stroke();

    const thumbX = joystick.startX + joystick.dx * JOYSTICK_RADIUS;
    const thumbY = joystick.startY + joystick.dy * JOYSTICK_RADIUS;
    ctx.globalAlpha = 0.35;
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(thumbX, thumbY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  } else {
    // Hint: faded joystick
    ctx.globalAlpha = 0.08;
    ctx.strokeStyle = "#ffffff";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(120, H - 130, JOYSTICK_RADIUS, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = "#ffffff";
    ctx.beginPath();
    ctx.arc(120, H - 130, 14, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  // --- ACTION BUTTONS ---
  drawActionButton(ctx, btns.attackX, btns.attackY, BUTTON_RADIUS, touchButtons.attack, "#ff4444", "ATK");
  drawActionButton(ctx, btns.dashX, btns.dashY, BUTTON_RADIUS * 0.78, touchButtons.dash, "#4488ff", "DASH");

  if (hasShield) {
    drawActionButton(ctx, btns.blockX, btns.blockY, BUTTON_RADIUS * 0.78, touchButtons.block, "#44bbff", "BLK");
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
