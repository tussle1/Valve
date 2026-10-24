import express from "express";
import { createServer } from "http";
import { WebSocketServer } from "ws";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import { resolve } from "path";
import { fileURLToPath } from "url";

import providersRouter from "./routes/providers.js";
import chatRouter from "./routes/chat.js";
import workspaceRouter from "./routes/workspace.js";
import gitRouter from "./routes/git.js";
import terminalRouter, { handleTerminalWebSocket } from "./routes/terminal.js";
import settingsRouter from "./routes/settings.js";
import agentsRouter from "./routes/agents.js";
import { getDatabase } from "./db/index.js";
import { providerRegistry, modelRegistry } from "./providers/registry.js";

const __dirname = resolve(fileURLToPath(import.meta.url), "..");
const PORT = parseInt(process.env.PORT || "3001", 10);
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const app = express();
const server = createServer(app);
const wss = new WebSocketServer({ server, path: "/ws" });

// Middleware
app.use(helmet({
  crossOriginEmbedderPolicy: false,
  contentSecurityPolicy: false,
}));
app.use(cors({
  origin: FRONTEND_URL,
  credentials: true,
}));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

// API routes
app.use("/api/providers", providersRouter);
app.use("/api/chat", chatRouter);
app.use("/api/workspace", workspaceRouter);
app.use("/api/git", gitRouter);
app.use("/api/terminal", terminalRouter);
app.use("/api/settings", settingsRouter);
app.use("/api/agents", agentsRouter);

// WebSocket handling
wss.on("connection", (ws, req) => {
  const url = new URL(req.url || "", `http://${req.headers.host}`);
  const path = url.pathname;
  
  if (path === "/terminal") {
    handleTerminalWebSocket(wss);
    // Re-handle this connection
    wss.emit("connection", ws, req);
  }
});

// Initialize database and registries
async function initialize() {
  try {
    // Initialize database
    getDatabase();
    console.log("[Server] Database initialized");
    
    // Load models from database into registry
    await modelRegistry.getAll();
    console.log("[Server] Model registry loaded");
    
    // Log registered providers
    const adapters = providerRegistry.getAll();
    console.log(`[Server] Registered ${adapters.length} provider adapters:`, adapters.map(a => a.type));
    
  } catch (error) {
    console.error("[Server] Initialization error:", error);
  }
}

// Start server
server.listen(PORT, async () => {
  await initialize();
  console.log(`[Server] Backend running on http://localhost:${PORT}`);
  console.log(`[Server] WebSocket server on ws://localhost:${PORT}/ws`);
});

// Graceful shutdown
process.on("SIGTERM", () => {
  console.log("[Server] SIGTERM received, shutting down...");
  server.close(() => {
    console.log("[Server] Closed");
    process.exit(0);
  });
});

process.on("SIGINT", () => {
  console.log("[Server] SIGINT received, shutting down...");
  server.close(() => {
    console.log("[Server] Closed");
    process.exit(0);
  });
});

export { app, server, wss };