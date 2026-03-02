import type { Tank, Bullet, InputState, KillEvent } from "../shared/types.js";
import {
  MAP_WIDTH, MAP_HEIGHT, TANK_SIZE, TANK_SPEED, TANK_ROTATION_SPEED,
  TANK_MAX_HEALTH, BULLET_SPEED, BULLET_RADIUS, BULLET_DAMAGE,
  SHOOT_COOLDOWN, RESPAWN_TICKS, BOT_COUNT, KILL_FEED_DURATION,
} from "../shared/constants.js";
import { gameMap } from "../shared/map.js";
import { AIController } from "./AIController.js";

let nextBulletId = 0;

export class GameEngine {
  tanks = new Map<string, Tank>();
  bullets: Bullet[] = [];
  inputs = new Map<string, InputState>();
  cooldowns = new Map<string, number>(); // ticks until can shoot
  kills: KillEvent[] = [];
  tick = 0;

  private ai: AIController;
  private nextColorIndex = 0;

  constructor() {
    this.ai = new AIController(this);
    this.spawnBots();
  }

  private spawnBots(): void {
    for (let i = 0; i < BOT_COUNT; i++) {
      const id = `bot-${i}`;
      const name = `Bot ${i + 1}`;
      this.addTank(id, name, true);
    }
  }

  addTank(id: string, name: string, isBot = false): Tank {
    const pos = this.findSpawnPosition();
    const tank: Tank = {
      id,
      name,
      x: pos.x,
      y: pos.y,
      angle: Math.random() * Math.PI * 2,
      health: TANK_MAX_HEALTH,
      maxHealth: TANK_MAX_HEALTH,
      colorIndex: this.nextColorIndex++,
      alive: true,
      respawnTimer: 0,
      isBot,
      kills: 0,
      deaths: 0,
    };
    this.tanks.set(id, tank);
    this.inputs.set(id, { up: false, down: false, left: false, right: false, shoot: false });
    this.cooldowns.set(id, 0);
    return tank;
  }

  removeTank(id: string): void {
    this.tanks.delete(id);
    this.inputs.delete(id);
    this.cooldowns.delete(id);
  }

  setInput(id: string, input: InputState): void {
    this.inputs.set(id, input);
  }

  update(): void {
    this.tick++;

    // AI decisions
    this.ai.update();

    // Process each tank
    for (const tank of this.tanks.values()) {
      if (!tank.alive) {
        tank.respawnTimer--;
        if (tank.respawnTimer <= 0) {
          this.respawn(tank);
        }
        continue;
      }

      const input = this.inputs.get(tank.id);
      if (!input) continue;

      // Rotation
      if (input.left) tank.angle -= TANK_ROTATION_SPEED;
      if (input.right) tank.angle += TANK_ROTATION_SPEED;

      // Movement
      let dx = 0, dy = 0;
      if (input.up) {
        dx = Math.cos(tank.angle) * TANK_SPEED;
        dy = Math.sin(tank.angle) * TANK_SPEED;
      }
      if (input.down) {
        dx = -Math.cos(tank.angle) * TANK_SPEED * 0.6;
        dy = -Math.sin(tank.angle) * TANK_SPEED * 0.6;
      }

      if (dx !== 0 || dy !== 0) {
        const newX = tank.x + dx;
        const newY = tank.y + dy;
        if (!this.collidesWithWall(newX, newY, TANK_SIZE)) {
          tank.x = newX;
          tank.y = newY;
        } else {
          // Try sliding along axes
          if (!this.collidesWithWall(newX, tank.y, TANK_SIZE)) {
            tank.x = newX;
          } else if (!this.collidesWithWall(tank.x, newY, TANK_SIZE)) {
            tank.y = newY;
          }
        }
      }

      // Shooting
      const cd = this.cooldowns.get(tank.id) || 0;
      if (cd > 0) {
        this.cooldowns.set(tank.id, cd - 1);
      }
      if (input.shoot && cd <= 0) {
        this.spawnBullet(tank);
        this.cooldowns.set(tank.id, SHOOT_COOLDOWN);
      }
    }

    // Update bullets
    this.updateBullets();

    // Prune old kill events
    this.kills = this.kills.filter(k => this.tick - k.tick < KILL_FEED_DURATION);
  }

  private spawnBullet(tank: Tank): void {
    const bullet: Bullet = {
      id: `b${nextBulletId++}`,
      ownerId: tank.id,
      x: tank.x + Math.cos(tank.angle) * (TANK_SIZE + BULLET_RADIUS + 2),
      y: tank.y + Math.sin(tank.angle) * (TANK_SIZE + BULLET_RADIUS + 2),
      angle: tank.angle,
      speed: BULLET_SPEED,
    };
    this.bullets.push(bullet);
  }

  private updateBullets(): void {
    const toRemove = new Set<string>();

    for (const bullet of this.bullets) {
      bullet.x += Math.cos(bullet.angle) * bullet.speed;
      bullet.y += Math.sin(bullet.angle) * bullet.speed;

      // Check wall collision
      if (this.pointCollidesWithWall(bullet.x, bullet.y)) {
        toRemove.add(bullet.id);
        continue;
      }

      // Check out of bounds
      if (bullet.x < 0 || bullet.x > MAP_WIDTH || bullet.y < 0 || bullet.y > MAP_HEIGHT) {
        toRemove.add(bullet.id);
        continue;
      }

      // Check tank collision
      for (const tank of this.tanks.values()) {
        if (!tank.alive) continue;
        if (tank.id === bullet.ownerId) continue;

        const dx = bullet.x - tank.x;
        const dy = bullet.y - tank.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < TANK_SIZE + BULLET_RADIUS) {
          toRemove.add(bullet.id);
          tank.health -= BULLET_DAMAGE;

          if (tank.health <= 0) {
            tank.health = 0;
            tank.alive = false;
            tank.respawnTimer = RESPAWN_TICKS;
            tank.deaths++;

            const killer = this.tanks.get(bullet.ownerId);
            if (killer) {
              killer.kills++;
              this.kills.push({
                killerId: killer.id,
                killerName: killer.name,
                victimId: tank.id,
                victimName: tank.name,
                tick: this.tick,
              });
            }
          }
          break;
        }
      }
    }

    this.bullets = this.bullets.filter(b => !toRemove.has(b.id));
  }

  private respawn(tank: Tank): void {
    const pos = this.findSpawnPosition();
    tank.x = pos.x;
    tank.y = pos.y;
    tank.angle = Math.random() * Math.PI * 2;
    tank.health = TANK_MAX_HEALTH;
    tank.alive = true;
    tank.respawnTimer = 0;
  }

  private findSpawnPosition(): { x: number; y: number } {
    for (let attempts = 0; attempts < 100; attempts++) {
      const x = TANK_SIZE + 20 + Math.random() * (MAP_WIDTH - TANK_SIZE * 2 - 40);
      const y = TANK_SIZE + 20 + Math.random() * (MAP_HEIGHT - TANK_SIZE * 2 - 40);
      if (!this.collidesWithWall(x, y, TANK_SIZE + 5)) {
        return { x, y };
      }
    }
    return { x: MAP_WIDTH / 2, y: MAP_HEIGHT / 2 };
  }

  private collidesWithWall(x: number, y: number, halfSize: number): boolean {
    for (const wall of gameMap.walls) {
      if (
        x + halfSize > wall.x &&
        x - halfSize < wall.x + wall.w &&
        y + halfSize > wall.y &&
        y - halfSize < wall.y + wall.h
      ) {
        return true;
      }
    }
    return false;
  }

  private pointCollidesWithWall(x: number, y: number): boolean {
    for (const wall of gameMap.walls) {
      if (x >= wall.x && x <= wall.x + wall.w && y >= wall.y && y <= wall.y + wall.h) {
        return true;
      }
    }
    return false;
  }

  getState() {
    return {
      tanks: Array.from(this.tanks.values()),
      bullets: this.bullets,
      walls: gameMap.walls,
      kills: this.kills,
    };
  }
}
