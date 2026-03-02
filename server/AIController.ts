import type { Tank, InputState } from "../shared/types.js";
import type { GameEngine } from "./GameEngine.js";

export class AIController {
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
  }

  update(): void {
    for (const tank of this.engine.tanks.values()) {
      if (!tank.isBot || !tank.alive) continue;
      const input = this.decide(tank);
      this.engine.setInput(tank.id, input);
    }
  }

  private decide(bot: Tank): InputState {
    const target = this.findNearestEnemy(bot);
    if (!target) {
      return { up: true, down: false, left: false, right: false, shoot: false };
    }

    const dx = target.x - bot.x;
    const dy = target.y - bot.y;
    const targetAngle = Math.atan2(dy, dx);
    const dist = Math.sqrt(dx * dx + dy * dy);

    let angleDiff = targetAngle - bot.angle;
    // Normalize to [-PI, PI]
    while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
    while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

    const input: InputState = {
      up: false,
      down: false,
      left: false,
      right: false,
      shoot: false,
    };

    // Rotate toward target
    if (angleDiff > 0.1) {
      input.right = true;
    } else if (angleDiff < -0.1) {
      input.left = true;
    }

    // Move toward target if far
    if (dist > 150) {
      input.up = true;
    } else if (dist < 80) {
      input.down = true;
    }

    // Shoot if roughly aimed
    if (Math.abs(angleDiff) < 0.3) {
      input.shoot = true;
    }

    return input;
  }

  private findNearestEnemy(bot: Tank): Tank | null {
    let nearest: Tank | null = null;
    let nearestDist = Infinity;

    for (const tank of this.engine.tanks.values()) {
      if (tank.id === bot.id || !tank.alive) continue;
      const dx = tank.x - bot.x;
      const dy = tank.y - bot.y;
      const dist = dx * dx + dy * dy;
      if (dist < nearestDist) {
        nearestDist = dist;
        nearest = tank;
      }
    }

    return nearest;
  }
}
