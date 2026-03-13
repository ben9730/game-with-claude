"use strict";

import { W, H, PAL, STATE } from './config.js';
import { keys, anyKeyPressed, setAnyKeyPressed, initInput } from './input.js';
import { updateShake } from './camera.js';
import { updateParticles, clearParticles } from './particles.js';
import { generateRooms, loadRoom, getRoomState, setDoorAnimTimer, setDoorAnimState, setBossEntranceTimer, setBossEntranceActive } from './rooms.js';
import { updateFog } from './lighting.js';
import { player, resetPlayer, updatePlayer, setLoadRoom } from './player.js';
import { updateEnemies } from './enemies.js';
import { updateProjectiles } from './projectiles.js';
import { updatePowerups } from './powerups.js';
import { updateTransition } from './transitions.js';
import { renderPlaying, renderGameOver, renderVictory, renderTitle } from './renderer.js';

// ============================================================
// CANVAS SETUP
// ============================================================
const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");
canvas.width = W;
canvas.height = H;

// ============================================================
// GAME STATE
// ============================================================
let gameState = STATE.TITLE;
let globalTime = 0;
let stats = { enemiesKilled: 0, startTime: 0, roomsCleared: 0 };

export function getGameState() { return gameState; }
export function setGameState(s) { gameState = s; }
export function getGlobalTime() { return globalTime; }
export function getStats() { return stats; }

// ============================================================
// Initialize input
// ============================================================
initInput(canvas);

// Wire up loadRoom for player.js (avoids circular import issue)
setLoadRoom(loadRoom);

// ============================================================
// GAME INIT
// ============================================================
function startGame() {
  generateRooms();
  resetPlayer();
  stats = { enemiesKilled: 0, startTime: performance.now(), roomsCleared: 0 };
  clearParticles();
  loadRoom(0);
  gameState = STATE.PLAYING;
  setAnyKeyPressed(false);
}

// ============================================================
// GAME LOOP
// ============================================================
let lastTime = 0;
function gameLoop(timestamp) {
  const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
  lastTime = timestamp;

  globalTime += dt;

  // Update
  switch (gameState) {
    case STATE.TITLE:
      if (anyKeyPressed) {
        startGame();
        setAnyKeyPressed(false);
      }
      break;
    case STATE.PLAYING: {
      updatePlayer(dt);
      updateEnemies(dt);
      updateProjectiles(dt);
      updatePowerups(dt);
      updateParticles(dt);
      updateShake(dt);
      updateFog(dt);
      // Door opening animation
      const rs = getRoomState();
      if (rs.doorAnimState === 1) {
        const newDoorTimer = rs.doorAnimTimer + dt;
        setDoorAnimTimer(newDoorTimer);
        if (newDoorTimer >= 0.5) {
          setDoorAnimState(2);
        }
      }
      // Boss entrance
      if (rs.bossEntranceActive) {
        const newTimer = rs.bossEntranceTimer - dt;
        setBossEntranceTimer(newTimer);
        if (newTimer <= 0) {
          setBossEntranceActive(false);
        }
      }
      break;
    }
    case STATE.TRANSITION:
      updateTransition(dt);
      updateParticles(dt);
      updateShake(dt);
      break;
    case STATE.GAMEOVER:
    case STATE.VICTORY:
      updateParticles(dt);
      if (keys["r"]) {
        keys["r"] = false;
        startGame();
      }
      break;
  }

  // Draw
  ctx.fillStyle = PAL.bg;
  ctx.fillRect(0, 0, W, H);

  switch (gameState) {
    case STATE.TITLE:
      renderTitle(ctx);
      break;
    case STATE.PLAYING:
    case STATE.TRANSITION:
      renderPlaying(ctx);
      break;
    case STATE.GAMEOVER:
      renderGameOver(ctx);
      break;
    case STATE.VICTORY:
      renderVictory(ctx);
      break;
  }

  requestAnimationFrame(gameLoop);
}

// Start
requestAnimationFrame((t) => {
  lastTime = t;
  gameLoop(t);
});
