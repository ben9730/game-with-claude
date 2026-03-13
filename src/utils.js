"use strict";

import { TILE } from './config.js';
import { getRoomState } from './rooms.js';

export function rand(a, b) { return Math.random() * (b - a) + a; }
export function randInt(a, b) { return Math.floor(rand(a, b + 1)); }
export function dist(a, b) { return Math.hypot(a.x - b.x, a.y - b.y); }
export function angle(a, b) { return Math.atan2(b.y - a.y, b.x - a.x); }
export function clamp(v, lo, hi) { return Math.max(lo, Math.min(hi, v)); }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function angleDiff(a, b) {
  let d = ((b - a + Math.PI * 3) % (Math.PI * 2)) - Math.PI;
  return d;
}

export function moveWithCollision(entity, dx, dy, radius) {
  // Move X
  entity.x += dx;
  resolveWallCollision(entity, radius);
  // Move Y
  entity.y += dy;
  resolveWallCollision(entity, radius);
}

function resolveWallCollision(entity, radius) {
  const { roomGrid, roomW, roomH, roomOffX, roomOffY, roomPxW, roomPxH, doorOpen } = getRoomState();
  // Check tiles around entity
  const margin = radius + 2;
  const left = Math.floor((entity.x - margin - roomOffX) / TILE);
  const right = Math.floor((entity.x + margin - roomOffX) / TILE);
  const top = Math.floor((entity.y - margin - roomOffY) / TILE);
  const bottom = Math.floor((entity.y + margin - roomOffY) / TILE);

  for (let ty = top; ty <= bottom; ty++) {
    for (let tx = left; tx <= right; tx++) {
      if (tx < 0 || tx >= roomW || ty < 0 || ty >= roomH) continue;
      // Door tile exception
      if (doorOpen && tx === roomW - 1 && ty === Math.floor(roomH / 2)) continue;
      if (roomGrid[ty][tx] === 1) {
        // Tile rect
        const tileX = roomOffX + tx * TILE;
        const tileY = roomOffY + ty * TILE;
        // Circle vs AABB
        const closestX = clamp(entity.x, tileX, tileX + TILE);
        const closestY = clamp(entity.y, tileY, tileY + TILE);
        const distX = entity.x - closestX;
        const distY = entity.y - closestY;
        const d2 = distX * distX + distY * distY;
        if (d2 < radius * radius && d2 > 0) {
          const d = Math.sqrt(d2);
          const overlap = radius - d;
          entity.x += (distX / d) * overlap;
          entity.y += (distY / d) * overlap;
        }
      }
    }
  }

  // Also clamp to room bounds
  entity.x = clamp(entity.x, roomOffX + radius, roomOffX + roomPxW - radius);
  entity.y = clamp(entity.y, roomOffY + radius, roomOffY + roomPxH - radius);
}

export function isWall(px, py) {
  const { roomGrid, roomW, roomH, roomOffX, roomOffY } = getRoomState();
  const tx = Math.floor((px - roomOffX) / TILE);
  const ty = Math.floor((py - roomOffY) / TILE);
  if (tx < 0 || tx >= roomW || ty < 0 || ty >= roomH) return true;
  return roomGrid[ty][tx] === 1;
}
