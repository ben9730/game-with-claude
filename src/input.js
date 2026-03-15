"use strict";

import { W, H } from './config.js';
import { initTouch, joystick, touchButtons, isTouchDevice, consumeTouchTap, setTouchTapCallback, setTouchMouseCallback, setTouchGameplayMode } from './touch.js';

export const keys = {};
export const mouse = { x: W / 2, y: H / 2, left: false, right: false };
export let anyKeyPressed = false;
export let mouseClicked = false;

export { isTouchDevice, joystick, touchButtons, consumeTouchTap, setTouchGameplayMode } from './touch.js';

export function consumeMouseClick() {
  const was = mouseClicked;
  mouseClicked = false;
  return was;
}

export function resetAnyKeyPressed() {
  anyKeyPressed = false;
}

export function setAnyKeyPressed(val) {
  anyKeyPressed = val;
}

export function initInput(canvas) {
  document.addEventListener("keydown", e => {
    keys[e.key.toLowerCase()] = true;
    anyKeyPressed = true;
    if (e.key === " " || e.key.startsWith("Arrow")) e.preventDefault();
  });
  document.addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });
  canvas.addEventListener("mousemove", e => {
    const r = canvas.getBoundingClientRect();
    // Account for object-fit: contain (letterboxing/pillarboxing)
    const canvasAspect = W / H;
    const elemAspect = r.width / r.height;
    let renderW, renderH, offsetX, offsetY;
    if (elemAspect > canvasAspect) {
      renderH = r.height; renderW = r.height * canvasAspect;
      offsetX = (r.width - renderW) / 2; offsetY = 0;
    } else {
      renderW = r.width; renderH = r.width / canvasAspect;
      offsetX = 0; offsetY = (r.height - renderH) / 2;
    }
    mouse.x = ((e.clientX - r.left - offsetX) / renderW) * W;
    mouse.y = ((e.clientY - r.top - offsetY) / renderH) * H;
  });
  canvas.addEventListener("mousedown", e => {
    e.preventDefault();
    if (e.button === 0) { mouse.left = true; mouseClicked = true; anyKeyPressed = true; }
    if (e.button === 2) mouse.right = true;
  });
  canvas.addEventListener("mouseup", e => {
    if (e.button === 0) mouse.left = false;
    if (e.button === 2) mouse.right = false;
  });
  canvas.addEventListener("contextmenu", e => e.preventDefault());

  // Initialize touch controls
  initTouch(canvas);
  setTouchTapCallback(() => { anyKeyPressed = true; mouseClicked = true; });
  setTouchMouseCallback((x, y) => { mouse.x = x; mouse.y = y; });
}
