# Fantasy Dungeon Roguelike — MVP Design Spec

## Overview
Top-down pixel-art roguelike in a single HTML file. Player controls a sword & shield warrior navigating procedurally generated dungeon rooms, fighting monsters, collecting power-ups, and defeating a boss.

## Tech Stack
- Single `index.html` file
- HTML5 Canvas for rendering
- Vanilla JavaScript, no dependencies
- Pixel art drawn with canvas primitives (rectangles, simple shapes)

## Controls
- **WASD** — movement
- **Mouse** — aim direction
- **Left click** — sword slash (arc attack in aim direction)
- **Right click** — shield block (reduces incoming damage for ~0.5s)
- **Spacebar** — dash (short burst of speed, brief cooldown)

## Player Character
- Sword & shield warrior rendered as pixel-art sprite
- Stats: HP (100), speed, attack damage, attack cooldown
- Sword slash: arc-shaped hitbox in front of player toward mouse
- Shield block: brief damage reduction on right-click
- Dash: quick movement burst with ~2s cooldown

## Room System
- 3-5 rooms in linear sequence, final room is boss
- Each room is a rectangular arena with wall tiles
- Room locks (doors close) when player enters, unlocks when all enemies defeated
- Procedural generation: random enemy placement, random room size variations
- Transition: door appears on room clear, click/walk to enter next room

## Enemy Types (3)
1. **Slime** — slow, moves toward player, melee damage on contact. Low HP.
2. **Bat** — fast, erratic movement pattern, melee damage. Low HP.
3. **Skeleton Archer** — stationary/slow, fires projectiles at player. Medium HP.

## Boss
- **Dark Knight** — large sprite, appears in final room
- Phase 1: Charges at player, wide sword swing
- Phase 2 (below 50% HP): Faster, adds a ground slam attack
- Defeating boss = win screen with stats

## Power-ups (dropped by enemies, random chance)
- **Health Potion** (red) — restores 25 HP
- **Speed Boost** (blue) — increases move speed for 10 seconds
- **Attack Boost** (orange) — increases damage for 10 seconds

## HUD
- Health bar (top-left)
- Current room indicator (e.g., "Room 2/5")
- Dash cooldown indicator
- Active buff icons

## Game States
1. **Title Screen** — game name, "Press any key to start"
2. **Playing** — main gameplay
3. **Game Over** — death screen, "Press R to restart"
4. **Victory** — boss defeated, show stats (rooms cleared, time, enemies killed)

## Visual Style
- Dark color palette: deep purples, dark grays, stone browns
- Pixel-art sprites using canvas rectangles (no external images)
- Simple particle effects: hit sparks, death poof, blood splatter
- Screen shake on heavy hits
- Minimal lighting: slightly lighter area around player

## Scope Boundaries (MVP)
- No save system
- No progression between runs
- No inventory
- No multiple character classes
- No sound (can add later)
- No minimap (rooms are single-screen arenas)

## Future Expansion Path
1. Split into modules (player.js, enemy.js, room.js, etc.)
2. Add more enemy types, room layouts, items
3. Meta-progression: gold collected persists, unlock upgrades between runs
4. Multiple character classes
5. Sound effects and music
6. Larger rooms with camera scrolling
