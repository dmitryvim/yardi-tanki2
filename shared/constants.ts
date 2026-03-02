export const MAP_WIDTH = 1200;
export const MAP_HEIGHT = 800;

export const TANK_SIZE = 30; // px, half-extent of tank sprite
export const TANK_SPEED = 3; // px per tick
export const TANK_ROTATION_SPEED = 0.06; // radians per tick
export const TANK_MAX_HEALTH = 100;

export const BULLET_SPEED = 8; // px per tick
export const BULLET_RADIUS = 4;
export const BULLET_DAMAGE = 25;
export const SHOOT_COOLDOWN = 15; // ticks between shots

export const RESPAWN_TICKS = 60; // 3 seconds at 20 tps

export const TICK_RATE = 20; // ticks per second
export const TICK_INTERVAL = 1000 / TICK_RATE;

export const BOT_COUNT = 3;

export const TANK_COLORS = [
  "#4CAF50", // green
  "#2196F3", // blue
  "#F44336", // red
  "#FF9800", // orange
  "#9C27B0", // purple
  "#00BCD4", // cyan
  "#FFEB3B", // yellow
  "#E91E63", // pink
];

export const WALL_COLOR = "#555";
export const BACKGROUND_COLOR = "#2a2a2a";
export const GRID_COLOR = "#333";

export const KILL_FEED_DURATION = 100; // ticks to show kill event (~5s)
