"use strict";

import { rand } from './utils.js';
import { getGlobalTime } from './main.js';

export let shakeX = 0;
export let shakeY = 0;
let shakeIntensity = 0;
let shakeDuration = 0;

export function triggerShake(intensity, duration) {
  shakeIntensity = intensity;
  shakeDuration = duration;
}

export function updateShake(dt) {
  if (shakeDuration > 0) {
    shakeDuration -= dt;
    const globalTime = getGlobalTime();
    // Enhanced shake with high-frequency noise
    const freq = globalTime * 40;
    shakeX = Math.sin(freq) * shakeIntensity * rand(0.6, 1.0);
    shakeY = Math.cos(freq * 1.3) * shakeIntensity * rand(0.6, 1.0);
    shakeIntensity *= 0.90;
  } else {
    shakeX = shakeY = 0;
  }
}
