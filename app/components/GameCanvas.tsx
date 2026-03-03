"use client";

import { useEffect, useRef, useCallback } from "react";
import type { Tank, Bullet, Wall, KillEvent, InputState, ServerMessage } from "../../shared/types";
import {
  MAP_WIDTH, MAP_HEIGHT, TANK_SIZE, BULLET_RADIUS,
  TANK_COLORS, WALL_COLOR, BACKGROUND_COLOR, GRID_COLOR,
} from "../../shared/constants";

interface GameState {
  tanks: Tank[];
  bullets: Bullet[];
  walls: Wall[];
  kills: KillEvent[];
}

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const stateRef = useRef<GameState>({ tanks: [], bullets: [], walls: [], kills: [] });
  const myIdRef = useRef<string>("");
  const inputRef = useRef<InputState>({ up: false, down: false, left: false, right: false, shoot: false });
  const keysDown = useRef(new Set<string>());

  const sendInput = useCallback(() => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) return;

    const keys = keysDown.current;
    const input: InputState = {
      up: keys.has("KeyW") || keys.has("ArrowUp"),
      down: keys.has("KeyS") || keys.has("ArrowDown"),
      left: keys.has("KeyA") || keys.has("ArrowLeft"),
      right: keys.has("KeyD") || keys.has("ArrowRight"),
      shoot: keys.has("Space"),
    };

    // Only send if changed
    const prev = inputRef.current;
    if (
      input.up !== prev.up || input.down !== prev.down ||
      input.left !== prev.left || input.right !== prev.right ||
      input.shoot !== prev.shoot
    ) {
      inputRef.current = input;
      ws.send(JSON.stringify({ type: "input", keys: input }));
    }
  }, []);

  // WebSocket connection
  useEffect(() => {
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/g/tanki2/ws`;
    let ws: WebSocket;
    let reconnectTimeout: ReturnType<typeof setTimeout>;

    function connect() {
      ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onmessage = (event) => {
        const msg: ServerMessage = JSON.parse(event.data);
        switch (msg.type) {
          case "welcome":
            myIdRef.current = msg.playerId;
            break;
          case "state":
            stateRef.current = {
              tanks: msg.tanks,
              bullets: msg.bullets,
              walls: msg.walls,
              kills: msg.kills,
            };
            break;
        }
      };

      ws.onclose = () => {
        reconnectTimeout = setTimeout(connect, 2000);
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      clearTimeout(reconnectTimeout);
      ws?.close();
    };
  }, []);

  // Keyboard handlers
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].includes(e.code)) {
        e.preventDefault();
        keysDown.current.add(e.code);
        sendInput();
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keysDown.current.delete(e.code);
      sendInput();
    };

    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("keyup", onKeyUp);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
    };
  }, [sendInput]);

  // Rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d")!;
    let animId: number;

    function render() {
      const { tanks, bullets, walls, kills } = stateRef.current;

      // Scale canvas to fit viewport
      const vw = window.innerWidth;
      const vh = window.innerHeight;
      const scale = Math.min(vw / MAP_WIDTH, vh / MAP_HEIGHT);
      const scaledW = MAP_WIDTH * scale;
      const scaledH = MAP_HEIGHT * scale;

      canvas!.width = scaledW;
      canvas!.height = scaledH;
      canvas!.style.position = "absolute";
      canvas!.style.left = `${(vw - scaledW) / 2}px`;
      canvas!.style.top = `${(vh - scaledH) / 2}px`;

      ctx.save();
      ctx.scale(scale, scale);

      // Background
      ctx.fillStyle = BACKGROUND_COLOR;
      ctx.fillRect(0, 0, MAP_WIDTH, MAP_HEIGHT);

      // Grid
      ctx.strokeStyle = GRID_COLOR;
      ctx.lineWidth = 0.5;
      for (let x = 0; x < MAP_WIDTH; x += 50) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, MAP_HEIGHT);
        ctx.stroke();
      }
      for (let y = 0; y < MAP_HEIGHT; y += 50) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(MAP_WIDTH, y);
        ctx.stroke();
      }

      // Walls
      ctx.fillStyle = WALL_COLOR;
      for (const wall of walls) {
        ctx.fillRect(wall.x, wall.y, wall.w, wall.h);
      }

      // Bullets
      for (const bullet of bullets) {
        ctx.fillStyle = "#FFD700";
        ctx.beginPath();
        ctx.arc(bullet.x, bullet.y, BULLET_RADIUS, 0, Math.PI * 2);
        ctx.fill();
      }

      // Tanks
      for (const tank of tanks) {
        if (!tank.alive) continue;
        const color = TANK_COLORS[tank.colorIndex % TANK_COLORS.length];
        drawTank(ctx, tank, color, tank.id === myIdRef.current);
      }

      // HUD: Leaderboard
      drawLeaderboard(ctx, tanks);

      // HUD: Kill feed
      drawKillFeed(ctx, kills);

      // HUD: Respawn message
      const me = tanks.find(t => t.id === myIdRef.current);
      if (me && !me.alive) {
        ctx.fillStyle = "rgba(0,0,0,0.5)";
        ctx.fillRect(MAP_WIDTH / 2 - 150, MAP_HEIGHT / 2 - 30, 300, 60);
        ctx.fillStyle = "#fff";
        ctx.font = "bold 20px Arial";
        ctx.textAlign = "center";
        ctx.fillText("Respawning...", MAP_WIDTH / 2, MAP_HEIGHT / 2 + 7);
      }

      ctx.restore();
      animId = requestAnimationFrame(render);
    }

    animId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animId);
  }, []);

  return <canvas ref={canvasRef} />;
}

function drawTank(ctx: CanvasRenderingContext2D, tank: Tank, color: string, isMe: boolean) {
  ctx.save();
  ctx.translate(tank.x, tank.y);
  ctx.rotate(tank.angle);

  // Tank body
  ctx.fillStyle = color;
  ctx.fillRect(-TANK_SIZE * 0.7, -TANK_SIZE * 0.5, TANK_SIZE * 1.4, TANK_SIZE);

  // Tank turret/barrel
  ctx.fillStyle = darken(color, 0.3);
  ctx.fillRect(0, -3, TANK_SIZE * 0.9, 6);

  // Tank center dot
  ctx.fillStyle = darken(color, 0.5);
  ctx.beginPath();
  ctx.arc(0, 0, 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();

  // Health bar
  const barWidth = TANK_SIZE * 1.4;
  const barHeight = 4;
  const barY = tank.y - TANK_SIZE * 0.5 - 12;
  const barX = tank.x - barWidth / 2;

  ctx.fillStyle = "#333";
  ctx.fillRect(barX, barY, barWidth, barHeight);

  const healthPct = tank.health / tank.maxHealth;
  ctx.fillStyle = healthPct > 0.5 ? "#4CAF50" : healthPct > 0.25 ? "#FF9800" : "#F44336";
  ctx.fillRect(barX, barY, barWidth * healthPct, barHeight);

  // Name
  ctx.fillStyle = isMe ? "#FFD700" : "#fff";
  ctx.font = "bold 11px Arial";
  ctx.textAlign = "center";
  ctx.fillText(tank.name, tank.x, barY - 3);
}

function drawLeaderboard(ctx: CanvasRenderingContext2D, tanks: Tank[]) {
  const sorted = [...tanks].sort((a, b) => b.kills - a.kills || a.deaths - b.deaths);
  const x = MAP_WIDTH - 10;
  const y = 15;

  ctx.fillStyle = "rgba(0,0,0,0.6)";
  ctx.fillRect(x - 160, y - 12, 170, 20 + sorted.length * 18);

  ctx.fillStyle = "#fff";
  ctx.font = "bold 13px Arial";
  ctx.textAlign = "right";
  ctx.fillText("Leaderboard", x - 5, y + 2);

  ctx.font = "12px Arial";
  sorted.forEach((tank, i) => {
    const color = TANK_COLORS[tank.colorIndex % TANK_COLORS.length];
    ctx.fillStyle = color;
    ctx.fillText(`${tank.name}: ${tank.kills}K / ${tank.deaths}D`, x - 5, y + 20 + i * 18);
  });
}

function drawKillFeed(ctx: CanvasRenderingContext2D, kills: KillEvent[]) {
  const recent = kills.slice(-5);
  ctx.font = "12px Arial";
  ctx.textAlign = "left";

  recent.forEach((kill, i) => {
    const y = 20 + i * 18;
    ctx.fillStyle = "rgba(0,0,0,0.5)";
    ctx.fillRect(8, y - 12, 250, 16);
    ctx.fillStyle = "#fff";
    ctx.fillText(`${kill.killerName} killed ${kill.victimName}`, 12, y);
  });
}

function darken(hex: string, amount: number): string {
  const num = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((num >> 16) & 0xFF) * (1 - amount));
  const g = Math.max(0, ((num >> 8) & 0xFF) * (1 - amount));
  const b = Math.max(0, (num & 0xFF) * (1 - amount));
  return `rgb(${Math.round(r)},${Math.round(g)},${Math.round(b)})`;
}
