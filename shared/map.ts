import { MAP_WIDTH, MAP_HEIGHT } from "./constants.js";
import type { Wall, GameMap } from "./types.js";

const BORDER_THICKNESS = 10;

const borderWalls: Wall[] = [
  { x: 0, y: 0, w: MAP_WIDTH, h: BORDER_THICKNESS }, // top
  { x: 0, y: MAP_HEIGHT - BORDER_THICKNESS, w: MAP_WIDTH, h: BORDER_THICKNESS }, // bottom
  { x: 0, y: 0, w: BORDER_THICKNESS, h: MAP_HEIGHT }, // left
  { x: MAP_WIDTH - BORDER_THICKNESS, y: 0, w: BORDER_THICKNESS, h: MAP_HEIGHT }, // right
];

const interiorWalls: Wall[] = [
  // Center cross
  { x: 550, y: 350, w: 100, h: 20 },
  { x: 590, y: 310, w: 20, h: 100 },

  // Top-left block
  { x: 150, y: 150, w: 80, h: 20 },
  { x: 150, y: 150, w: 20, h: 80 },

  // Top-right block
  { x: 970, y: 150, w: 80, h: 20 },
  { x: 1030, y: 150, w: 20, h: 80 },

  // Bottom-left block
  { x: 150, y: 600, w: 80, h: 20 },
  { x: 150, y: 600, w: 20, h: 80 },

  // Bottom-right block
  { x: 970, y: 600, w: 80, h: 20 },
  { x: 1030, y: 600, w: 20, h: 80 },

  // Mid-left horizontal
  { x: 300, y: 380, w: 120, h: 20 },

  // Mid-right horizontal
  { x: 780, y: 380, w: 120, h: 20 },

  // Top-center vertical
  { x: 590, y: 100, w: 20, h: 80 },

  // Bottom-center vertical
  { x: 590, y: 620, w: 20, h: 80 },
];

export const gameMap: GameMap = {
  width: MAP_WIDTH,
  height: MAP_HEIGHT,
  walls: [...borderWalls, ...interiorWalls],
};
