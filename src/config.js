"use strict";

export const TILE = 32;
export const W = 800;
export const H = 600;

export const STATE = { TITLE: 0, PLAYING: 1, GAMEOVER: 2, VICTORY: 3, TRANSITION: 4 };

// ============================================================
// PROFESSIONAL COLOR RAMPS (hue-shifted: shadows→cool, highlights→warm)
// Each ramp: [highlight, light, mid, shadow, deepShadow]
// ============================================================
export const RAMP = {
  skin:       ["#f5d8b0", "#d4a574", "#b87a50", "#8a5535", "#5c3322"],
  armor:      ["#8ab8d8", "#5588aa", "#446688", "#2e4a66", "#1a2e44"],
  leather:    ["#c0a070", "#8a6a40", "#6a5030", "#4a3520", "#2a1a10"],
  slime:      ["#bbffbb", "#66dd66", "#44aa44", "#228822", "#105510"],
  bone:       ["#f0e8d8", "#ccbbaa", "#aa9988", "#887766", "#5a4a3a"],
  purple:     ["#cc88ee", "#9955cc", "#7744aa", "#553388", "#331a55"],
  fire:       ["#ffffcc", "#ffdd44", "#ff8833", "#cc4400", "#881100"],
  blood:      ["#ff6666", "#cc2222", "#991111", "#660808", "#330404"],
  stone_wall: ["#6a5858", "#4d3535", "#3a2a2a", "#2a1e1e", "#1a1010"],
  stone_floor:["#3a3048", "#2a2035", "#262030", "#1e1828", "#141018"],
  wood:       ["#c09060", "#8a6a40", "#6a5030", "#4a3520", "#2a1a10"],
  gold:       ["#fff0a0", "#e8d080", "#c0a050", "#8a7030", "#5a4a18"],
  steel:      ["#e0e0f0", "#c0c0d0", "#9090aa", "#606080", "#3a3a55"],
};

export const PAL = {
  bg: "#0d0814",
  // Walls
  wall: RAMP.stone_wall[2],
  wallTop: RAMP.stone_wall[1],
  wallBrick: RAMP.stone_wall[1],
  wallMortar: RAMP.stone_wall[4],
  wallMoss: "#2a5a2a",
  wallHighlight: RAMP.stone_wall[0],
  wallDeepShadow: RAMP.stone_wall[4],
  // Floors
  floor1: RAMP.stone_floor[1],
  floor2: RAMP.stone_floor[2],
  floor3: "#282838",
  floor4: "#24202e",
  floorCrack: RAMP.stone_floor[4],
  floorMoss: "#1e3020",
  floorPuddle: "#1a1a3a",
  // Doors
  doorOpen: RAMP.wood[1],
  doorClosed: RAMP.wood[2],
  doorFrame: RAMP.wood[1],
  doorIron: "#4a4a55",
  doorIronLight: "#6a6a7a",
  doorIronDark: "#2a2a35",
  // Player
  playerBody: RAMP.armor[1],
  playerSkin: RAMP.skin[1],
  playerSkinLight: RAMP.skin[0],
  playerSkinShadow: RAMP.skin[2],
  playerHair: "#4a3020",
  playerArmor: RAMP.armor[2],
  playerArmorLight: RAMP.armor[0],
  playerArmorMid: RAMP.armor[1],
  playerArmorShadow: RAMP.armor[3],
  playerArmorDeep: RAMP.armor[4],
  playerBelt: RAMP.leather[2],
  playerBeltBuckle: RAMP.gold[2],
  playerBoots: RAMP.leather[3],
  playerBootsLight: RAMP.leather[2],
  playerBootsShadow: RAMP.leather[4],
  // Sword
  sword: RAMP.steel[1],
  swordGlow: RAMP.steel[0],
  swordEdge: "#ffffff",
  swordShadow: RAMP.steel[3],
  swordGroove: RAMP.steel[2],
  // Shield
  shield: RAMP.leather[1],
  shieldFace: RAMP.leather[0],
  shieldEmblem: RAMP.gold[1],
  shieldRim: RAMP.steel[0],
  shieldShadow: RAMP.leather[3],
  // Slime
  slime: RAMP.slime[2],
  slimeDark: RAMP.slime[3],
  slimeLight: RAMP.slime[1],
  slimeCore: RAMP.slime[0],
  slimeDeep: RAMP.slime[4],
  // Bat
  bat: RAMP.purple[2],
  batWing: RAMP.purple[1],
  batWingMembrane: RAMP.purple[3],
  batWingDeep: RAMP.purple[4],
  batEye: "#ff3333",
  batFur: RAMP.purple[1],
  // Skeleton
  skeleton: RAMP.bone[1],
  skeletonLight: RAMP.bone[0],
  skeletonDark: RAMP.bone[2],
  skeletonJoint: RAMP.bone[3],
  skeletonDeep: RAMP.bone[4],
  arrow: RAMP.wood[1],
  // Boss
  bossBody: "#2a2a3a",
  bossArmor: "#4a4a5a",
  bossArmorLight: "#6a6a7a",
  bossArmorShadow: "#2a2a35",
  bossArmorDeep: "#1a1a22",
  bossEye: "#ff2222",
  bossSword: "#aa3333",
  bossSwordEdge: "#dd5555",
  bossSwordDeep: "#771a1a",
  bossCrown: RAMP.gold[3],
  bossCrownLight: RAMP.gold[1],
  bossCape: "#2a1533",
  bossCapeLight: "#3a2044",
  bossCapeDark: "#1a1020",
  bossCapeP2: "#551122",
  bossCapeP2Light: "#661133",
  bossCapeP2Dark: "#441122",
  // HUD
  hpBar: "#cc2222",
  hpBarBg: "#441111",
  hpBarBorder: "#882222",
  manaBar: "#2244cc",
  dashReady: "#44aaff",
  dashCooldown: "#223355",
  // Pickups
  potionRed: "#ee3333",
  speedBlue: "#3388ff",
  attackOrange: "#ff8833",
  // Text
  textGold: RAMP.gold[1],
  textWhite: "#e0d8d0",
  textDim: "#706060",
  // Particles
  particle: "#ffaa33",
  particleHit: "#ffffff",
  shadow: "rgba(0,0,0,0.5)",
  // Lighting
  torchFlame: RAMP.fire[2],
  torchGlow: RAMP.fire[1],
  torchBase: RAMP.wood[2],
  torchBracket: RAMP.steel[3],
  torchBracketLight: RAMP.steel[2],
  // Effects
  blood: RAMP.blood[2],
  slashTrail: "#aaccff",
  fogColor: "rgba(60,50,80,0.03)",
};
