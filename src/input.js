"use strict";

import { W, H } from './config.js';

export const keys = {};
export const mouse = { x: W / 2, y: H / 2, left: false, right: false };
export let anyKeyPressed = false;

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
    if (e.key === " ") e.preventDefault();
  });
  document.addEventListener("keyup", e => { keys[e.key.toLowerCase()] = false; });
  canvas.addEventListener("mousemove", e => {
    const r = canvas.getBoundingClientRect();
    mouse.x = (e.clientX - r.left) * (W / r.width);
    mouse.y = (e.clientY - r.top) * (H / r.height);
  });
  canvas.addEventListener("mousedown", e => {
    e.preventDefault();
    if (e.button === 0) mouse.left = true;
    if (e.button === 2) mouse.right = true;
  });
  canvas.addEventListener("mouseup", e => {
    if (e.button === 0) mouse.left = false;
    if (e.button === 2) mouse.right = false;
  });
  canvas.addEventListener("contextmenu", e => e.preventDefault());
}
