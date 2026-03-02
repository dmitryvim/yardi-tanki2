import { WebSocketServer, WebSocket } from "ws";
import type { IncomingMessage } from "node:http";
import type { Duplex } from "node:stream";
import { decryptSessionToken, parseCookies } from "./auth.js";
import type { GameEngine } from "./GameEngine.js";
import type { ClientMessage, ServerMessage } from "../shared/types.js";

interface ConnectedClient {
  ws: WebSocket;
  playerId: string;
  name: string;
}

let guestCounter = 0;

export class WsHandler {
  private wss: WebSocketServer;
  private clients = new Map<string, ConnectedClient>();
  private engine: GameEngine;

  constructor(engine: GameEngine) {
    this.engine = engine;
    this.wss = new WebSocketServer({ noServer: true });
  }

  async handleUpgrade(req: IncomingMessage, socket: Duplex, head: Buffer): Promise<void> {
    const token = await decryptSessionToken(req.headers.cookie);

    let playerId: string;
    let name: string;

    if (token?.telegramId) {
      playerId = token.telegramId;
      name = token.name || token.username || "Player";
    } else {
      // Dev fallback: guest player
      guestCounter++;
      playerId = `guest-${guestCounter}-${Math.random().toString(36).slice(2, 6)}`;
      name = `Guest-${playerId.slice(6, 10).toUpperCase()}`;
    }

    this.wss.handleUpgrade(req, socket, head, (ws) => {
      this.onConnection(ws, playerId, name);
    });
  }

  private onConnection(ws: WebSocket, playerId: string, name: string): void {
    // Disconnect existing connection for same user
    const existing = this.clients.get(playerId);
    if (existing) {
      existing.ws.close(1000, "Replaced by new connection");
      this.engine.removeTank(playerId);
    }

    const tank = this.engine.addTank(playerId, name);

    const client: ConnectedClient = { ws, playerId, name };
    this.clients.set(playerId, client);

    // Send welcome
    this.send(ws, { type: "welcome", playerId, colorIndex: tank.colorIndex });

    ws.on("message", (data) => {
      try {
        const msg: ClientMessage = JSON.parse(data.toString());
        this.handleMessage(playerId, msg);
      } catch {
        // Ignore malformed messages
      }
    });

    ws.on("close", () => {
      this.clients.delete(playerId);
      this.engine.removeTank(playerId);
    });

    ws.on("error", () => {
      ws.close();
    });
  }

  private handleMessage(playerId: string, msg: ClientMessage): void {
    switch (msg.type) {
      case "input":
        this.engine.setInput(playerId, msg.keys);
        break;
      case "ping": {
        const client = this.clients.get(playerId);
        if (client) {
          this.send(client.ws, { type: "pong", t: msg.t, serverTime: Date.now() });
        }
        break;
      }
    }
  }

  broadcast(msg: ServerMessage): void {
    const data = JSON.stringify(msg);
    for (const client of this.clients.values()) {
      if (client.ws.readyState === WebSocket.OPEN) {
        client.ws.send(data);
      }
    }
  }

  private send(ws: WebSocket, msg: ServerMessage): void {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(msg));
    }
  }
}
