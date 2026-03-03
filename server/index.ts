import { createServer } from "node:http";
import { parse } from "node:url";
import next from "next";
import { GameEngine } from "./GameEngine.js";
import { WsHandler } from "./ws-handler.js";
import { TICK_INTERVAL } from "../shared/constants.js";

const dev = process.env.NODE_ENV !== "production";
const hostname = process.env.HOSTNAME || "0.0.0.0";
const port = parseInt(process.env.PORT || "3001", 10);

const app = next({ dev, hostname, port });
const handle = app.getRequestHandler();

app.prepare().then(() => {
  const engine = new GameEngine();
  const wsHandler = new WsHandler(engine);

  const server = createServer((req, res) => {
    const parsedUrl = parse(req.url!, true);
    handle(req, res, parsedUrl);
  });

  server.on("upgrade", (req, socket, head) => {
    const { pathname } = parse(req.url!, true);

    if (pathname === "/g/tanki2/ws") {
      wsHandler.handleUpgrade(req, socket, head);
    }
    // Let Next.js handle /_next/webpack-hmr for HMR
  });

  // Game loop
  const tickInterval = setInterval(() => {
    engine.update();
    const state = engine.getState();
    wsHandler.broadcast({ type: "state", ...state });
  }, TICK_INTERVAL);

  server.listen(port, hostname, () => {
    console.log(`> Ready on http://${hostname}:${port}`);
    console.log(`> Game at http://${hostname}:${port}/g/tanki2`);
    console.log(`> WebSocket at ws://${hostname}:${port}/g/tanki2/ws`);
  });

  const shutdown = () => {
    clearInterval(tickInterval);
    server.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
});
