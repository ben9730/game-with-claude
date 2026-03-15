"use strict";

import { player } from './player.js';
import { W, H } from './config.js';

// Trauma-based camera shake — trauma² gives organic feel
// Small hits barely shake, big hits shake violently

export let shakeX = 0;
export let shakeY = 0;

// Smooth camera follow (lerp)
export let camX = 0;
export let camY = 0;
const CAM_LERP = 6.0; // Higher = snappier follow

let trauma = 0;
const MAX_SHAKE = 12;
const TRAUMA_DECAY = 2.0; // per second

export function addTrauma(amount) {
  trauma = Math.min(1, trauma + amount);
}

// Legacy compat — old code calls triggerShake(intensity, duration)
export function triggerShake(intensity, _duration) {
  // Map old intensity to trauma: intensity 4 → 0.25, 8 → 0.5, 12 → 0.75
  addTrauma(intensity / 16);
}

export function resetCamera() {
  camX = 0;
  camY = 0;
}

export function updateShake(dt) {
  // Smooth camera follow — lerp toward player offset from center
  const targetX = 0; // Player is already centered by room layout
  const targetY = 0;
  camX += (targetX - camX) * CAM_LERP * dt;
  camY += (targetY - camY) * CAM_LERP * dt;
  // Round to avoid sub-pixel jitter on pixel art
  camX = Math.round(camX * 2) / 2;
  camY = Math.round(camY * 2) / 2;

  if (trauma > 0.001) {
    const t = performance.now() * 0.001;
    const shake = trauma * trauma * MAX_SHAKE;
    // Multiple sine waves at different frequencies = organic noise
    shakeX = shake * (Math.sin(t * 25.7) * 0.5 + Math.sin(t * 42.3) * 0.3 + Math.cos(t * 67.1) * 0.2);
    shakeY = shake * (Math.cos(t * 31.3) * 0.5 + Math.sin(t * 53.7) * 0.3 + Math.cos(t * 79.9) * 0.2);
    trauma = Math.max(0, trauma - TRAUMA_DECAY * dt);
  } else {
    shakeX = shakeY = 0;
    trauma = 0;
  }
}
