export interface Tank {
  id: string;
  name: string;
  x: number;
  y: number;
  angle: number; // radians, 0 = right
  health: number;
  maxHealth: number;
  colorIndex: number;
  alive: boolean;
  respawnTimer: number; // ticks until respawn, 0 = alive
  isBot: boolean;
  kills: number;
  deaths: number;
}

export interface Bullet {
  id: string;
  ownerId: string;
  x: number;
  y: number;
  angle: number;
  speed: number;
}

export interface Wall {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface GameMap {
  width: number;
  height: number;
  walls: Wall[];
}

export interface InputState {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  shoot: boolean;
}

export interface KillEvent {
  killerId: string;
  killerName: string;
  victimId: string;
  victimName: string;
  tick: number;
}

// Client -> Server
export type ClientMessage =
  | { type: "input"; keys: InputState }
  | { type: "ping"; t: number };

// Server -> Client
export type ServerMessage =
  | { type: "welcome"; playerId: string; colorIndex: number }
  | { type: "state"; tanks: Tank[]; bullets: Bullet[]; walls: Wall[]; kills: KillEvent[] }
  | { type: "pong"; t: number; serverTime: number };
