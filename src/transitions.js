"use strict";

import { STATE } from './config.js';
import { getGameState, setGameState } from './main.js';

export let transitionAlpha = 0;
export let transitionDir = 0; // 1 = fading out, -1 = fading in
let transitionCallback = null;

export function startTransition(callback) {
  setGameState(STATE.TRANSITION);
  transitionAlpha = 0;
  transitionDir = 1;
  transitionCallback = callback;
}

export function updateTransition(dt) {
  transitionAlpha += transitionDir * dt * 3;
  if (transitionDir === 1 && transitionAlpha >= 1) {
    transitionAlpha = 1;
    if (transitionCallback) transitionCallback();
    transitionCallback = null;
    transitionDir = -1;
  }
  if (transitionDir === -1) {
    if (transitionAlpha <= 0) {
      transitionAlpha = 0;
      transitionDir = 0;
      setGameState(STATE.PLAYING);
    }
  }
}
