import { Router, Request, Response } from "express";
import { z } from "zod";
import { jsonStorage } from "../db/json-storage.js";
import { v4 as uuidv4 } from "uuid";
import { resolve } from "path";
import { spawn, SpawnOptions } from "child_process";
import { WebSocketServer, WebSocket } from "ws";

const router = Router();

// Store active terminal processes
const terminalProcesses = new Map<string, { process: any; ws: WebSocket | null; cols: number; rows: number }>();

// Validation schemas
const CreateTerminalSchema = z.object({
  projectId: z.string().optional(),
  profileId: z.string().default("default"),
  cwd: z.string().optional(),
  cols: z.number().int().positive().default(80),
  rows: z.number().int().positive().default(24),
  env: z.record(z.string()).default({}),
});

// GET /api/terminal/sessions - List terminal sessions
router.get("/sessions", async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string | undefined;
    
    let sessions;
    if (projectId) {
      sessions = jsonStorage.getTerminalSessions(projectId);
    } else {
      sessions = jsonStorage.getTerminalSessions();
    }
    
    // Sort by createdAt descending
    sessions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    res.json(sessions.slice(0, 50));
  } catch (error) {
    console.error("[Terminal] List sessions error:", error);
    res.status(500).json({ error: "Failed to list terminal sessions" });
  }
});

// POST /api/terminal/sessions - Create terminal session
router.post("/sessions", async (req: Request, res: Response) => {
  try {
    const parsed = CreateTerminalSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid terminal config", details: parsed.error.flatten() });
    }
    
    const { projectId, profileId, cwd, cols, rows, env } = parsed.data;
    
    let workingDir = cwd || process.cwd();
    if (projectId) {
      const project = jsonStorage.getProject(projectId);
      if (project) {
        workingDir = project.rootPath;
      }
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const session = jsonStorage.createTerminalSession({
      id,
      projectId,
      profileId,
      title: `Terminal ${id.slice(0, 8)}`,
      cwd: workingDir,
      cols,
      rows,
      status: "starting",
      createdAt: now,
    });
    
    // Determine shell
    const shell = process.platform === "win32" ? "powershell.exe" : process.env.SHELL || "/bin/bash";
    const shellArgs = process.platform === "win32" ? ["-NoLogo", "-NoProfile"] : ["-l"];
    
    // Spawn process
    const proc = spawn(shell, shellArgs, {
      cwd: workingDir,
      env: { ...process.env, ...env, TERM: "xterm-256color", COLUMNS: String(cols), LINES: String(rows) },
      stdio: ["pipe", "pipe", "pipe"],
    } as SpawnOptions);
    
    if (proc.pid) {
      jsonStorage.updateTerminalSession(id, { status: "running" });
    }
    
    // Store process (WebSocket will connect later)
    terminalProcesses.set(id, { process: proc, ws: null, cols, rows });
    
    // Handle process exit
    proc.on("exit", async (code, signal) => {
      await jsonStorage.updateTerminalSession(id, { status: "exited", exitCode: code, closedAt: new Date().toISOString() });
      terminalProcesses.delete(id);
    });
    
    proc.on("error", async (err) => {
      await jsonStorage.updateTerminalSession(id, { status: "error", closedAt: new Date().toISOString() });
      terminalProcesses.delete(id);
    });
    
    // Pipe stdout/stderr to WebSocket when connected
    proc.stdout?.on("data", (data: Buffer) => {
      const entry = terminalProcesses.get(id);
      if (entry?.ws && entry.ws.readyState === WebSocket.OPEN) {
        entry.ws.send(JSON.stringify({ type: "output", data: data.toString() }));
      }
    });
    
    proc.stderr?.on("data", (data: Buffer) => {
      const entry = terminalProcesses.get(id);
      if (entry?.ws && entry.ws.readyState === WebSocket.OPEN) {
        entry.ws.send(JSON.stringify({ type: "error", data: data.toString() }));
      }
    });
    
    res.status(201).json(session);
  } catch (error) {
    console.error("[Terminal] Create session error:", error);
    res.status(500).json({ error: "Failed to create terminal session" });
  }
});

// GET /api/terminal/sessions/:id - Get terminal session
router.get("/sessions/:id", async (req: Request, res: Response) => {
  try {
    const sessions = jsonStorage.getTerminalSessions();
    const session = sessions.find(s => s.id === req.params.id);
    if (!session) {
      return res.status(404).json({ error: "Terminal session not found" });
    }
    res.json(session);
  } catch (error) {
    console.error("[Terminal] Get session error:", error);
    res.status(500).json({ error: "Failed to get terminal session" });
  }
});

// DELETE /api/terminal/sessions/:id - Close terminal session
router.delete("/sessions/:id", async (req: Request, res: Response) => {
  try {
    const entry = terminalProcesses.get(req.params.id);
    if (entry) {
      entry.process.kill("SIGTERM");
      setTimeout(() => {
        if (!entry.process.killed) entry.process.kill("SIGKILL");
      }, 1000);
      terminalProcesses.delete(req.params.id);
    }
    
    jsonStorage.updateTerminalSession(req.params.id, { status: "exited", closedAt: new Date().toISOString() });
    res.status(204).send();
  } catch (error) {
    console.error("[Terminal] Close session error:", error);
    res.status(500).json({ error: "Failed to close terminal session" });
  }
});

// POST /api/terminal/sessions/:id/resize - Resize terminal
router.post("/sessions/:id/resize", async (req: Request, res: Response) => {
  try {
    const { cols, rows } = req.body;
    if (!cols || !rows) {
      return res.status(400).json({ error: "cols and rows required" });
    }
    
    const entry = terminalProcesses.get(req.params.id);
    if (entry) {
      entry.process.stdout?.write(`\x1b[8;${rows};${cols}t`);
      entry.cols = cols;
      entry.rows = rows;
    }
    
    jsonStorage.updateTerminalSession(req.params.id, { cols, rows });
    res.json({ success: true });
  } catch (error) {
    console.error("[Terminal] Resize error:", error);
    res.status(500).json({ error: "Failed to resize terminal" });
  }
});

// POST /api/terminal/sessions/:id/write - Write to terminal
router.post("/sessions/:id/write", async (req: Request, res: Response) => {
  try {
    const { data } = req.body;
    if (!data) {
      return res.status(400).json({ error: "data required" });
    }
    
    const entry = terminalProcesses.get(req.params.id);
    if (!entry) {
      return res.status(404).json({ error: "Terminal session not found" });
    }
    
    entry.process.stdin?.write(data);
    res.json({ success: true });
  } catch (error) {
    console.error("[Terminal] Write error:", error);
    res.status(500).json({ error: "Failed to write to terminal" });
  }
});

// GET /api/terminal/sessions/:id/commands - Get command history
router.get("/sessions/:id/commands", async (req: Request, res: Response) => {
  try {
    const commands = jsonStorage.getTerminalCommands(req.params.id);
    res.json(commands);
  } catch (error) {
    console.error("[Terminal] Commands error:", error);
    res.status(500).json({ error: "Failed to get command history" });
  }
});

// WebSocket upgrade handler for terminal
export function handleTerminalWebSocket(wss: WebSocketServer) {
  wss.on("connection", (ws: WebSocket, req) => {
    const url = new URL(req.url || "", `http://${req.headers.host}`);
    const sessionId = url.searchParams.get("sessionId");
    
    if (!sessionId) {
      ws.close(4000, "sessionId required");
      return;
    }
    
    const entry = terminalProcesses.get(sessionId);
    if (!entry) {
      ws.close(4004, "Terminal session not found");
      return;
    }
    
    entry.ws = ws;
    
    ws.on("message", (data: Buffer) => {
      try {
        const msg = JSON.parse(data.toString());
        
        switch (msg.type) {
          case "input":
            entry.process.stdin?.write(msg.data);
            break;
          case "resize":
            if (msg.cols && msg.rows) {
              entry.process.stdout?.write(`\x1b[8;${msg.rows};${msg.cols}t`);
              entry.cols = msg.cols;
              entry.rows = msg.rows;
            }
            break;
          case "ping":
            ws.send(JSON.stringify({ type: "pong" }));
            break;
        }
      } catch (e) {
        // Ignore parse errors
      }
    });
    
    ws.on("close", () => {
      entry.ws = null;
    });
    
    ws.on("error", (err) => {
      console.error("[Terminal WS] Error:", err);
      entry.ws = null;
    });
    
    // Send initial connection confirmation
    ws.send(JSON.stringify({ type: "connected", sessionId }));
  });
}

export default router;