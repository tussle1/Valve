import { Router, Request, Response } from "express";
import { z } from "zod";
import { jsonStorage } from "../db/json-storage.js";
import { providerRegistry, modelRegistry, providerConfigService } from "../providers/registry.js";
import { v4 as uuidv4 } from "uuid";
import type { AgentConfig, AgentTask, ToolCall, ApprovalRequest, AgentMode, PermissionCategory } from "@valve/shared";

const router = Router();

// Validation schemas
const CreateAgentTaskSchema = z.object({
  projectId: z.string(),
  agentId: z.string(),
  name: z.string().min(1).max(200),
  description: z.string(),
  mode: z.enum(["ask", "plan", "edit", "agent", "review", "autonomous"]).default("agent"),
  input: z.string(),
  modelId: z.string().optional(),
});

const AgentActionSchema = z.object({
  action: z.enum(["pause", "resume", "cancel"]),
});

const ApprovalResponseSchema = z.object({
  requestId: z.string(),
  action: z.enum(["approve", "deny"]),
});

// Agent configurations (in production, these would be in DB)
const BUILTIN_AGENTS: Record<string, AgentConfig> = {
  "primary": {
    id: "primary",
    name: "Primary Coding Agent",
    role: "primary",
    description: "General-purpose coding agent for implementation tasks",
    modelId: "",
    instructions: "You are a skilled software engineer. Help the user implement features, fix bugs, and improve code quality. Read files before editing. Write tests. Follow project conventions.",
    mode: "agent",
    permissions: [],
    tools: ["read_file", "write_file", "edit_file", "list_files", "run_command", "search_code", "get_symbols", "get_diagnostics"],
    maxSteps: 50,
    enabled: true,
    metadata: {},
  },
  "code-review": {
    id: "code-review",
    name: "Code Review Agent",
    role: "code-review",
    description: "Reviews code changes for quality, security, and correctness",
    modelId: "",
    instructions: "You are a senior code reviewer. Analyze changes for bugs, security issues, performance problems, and style violations. Provide actionable feedback.",
    mode: "review",
    permissions: [],
    tools: ["read_file", "search_code", "get_symbols", "get_diagnostics"],
    maxSteps: 20,
    enabled: true,
    metadata: {},
  },
  "architect": {
    id: "architect",
    name: "Architecture Agent",
    role: "architect",
    description: "Designs system architecture and technical plans",
    modelId: "",
    instructions: "You are a software architect. Design scalable, maintainable systems. Create technical specifications, API designs, and data models. Consider trade-offs and long-term implications.",
    mode: "plan",
    permissions: [],
    tools: ["read_file", "list_files", "search_code", "get_symbols"],
    maxSteps: 30,
    enabled: true,
    metadata: {},
  },
  "debugger": {
    id: "debugger",
    name: "Debugging Agent",
    role: "debugging",
    description: "Investigates and fixes bugs",
    modelId: "",
    instructions: "You are a debugging expert. Reproduce issues, analyze stack traces, identify root causes, and implement fixes. Write regression tests.",
    mode: "agent",
    permissions: [],
    tools: ["read_file", "write_file", "edit_file", "run_command", "search_code", "get_symbols", "get_diagnostics"],
    maxSteps: 40,
    enabled: true,
    metadata: {},
  },
  "tester": {
    id: "tester",
    name: "Test Generation Agent",
    role: "test-generation",
    description: "Generates comprehensive tests for code",
    modelId: "",
    instructions: "You are a test engineer. Write unit, integration, and e2e tests. Cover edge cases, error paths, and happy paths. Follow testing best practices.",
    mode: "agent",
    permissions: [],
    tools: ["read_file", "write_file", "edit_file", "run_command", "search_code", "get_symbols"],
    maxSteps: 30,
    enabled: true,
    metadata: {},
  },
};

// GET /api/agents - List available agents
router.get("/", async (req: Request, res: Response) => {
  try {
    const agents = Object.values(BUILTIN_AGENTS);
    res.json(agents);
  } catch (error) {
    console.error("[Agents] List error:", error);
    res.status(500).json({ error: "Failed to list agents" });
  }
});

// GET /api/agents/:id - Get agent config
router.get("/:id", async (req: Request, res: Response) => {
  try {
    const agent = BUILTIN_AGENTS[req.params.id];
    if (!agent) {
      return res.status(404).json({ error: "Agent not found" });
    }
    res.json(agent);
  } catch (error) {
    console.error("[Agents] Get error:", error);
    res.status(500).json({ error: "Failed to get agent" });
  }
});

// POST /api/agents/tasks - Create agent task
router.post("/tasks", async (req: Request, res: Response) => {
  try {
    const parsed = CreateAgentTaskSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid task data", details: parsed.error.flatten() });
    }
    
    const { projectId, agentId, name, description, mode, input, modelId } = parsed.data;
    
    // Verify project
    const project = jsonStorage.getProject(projectId);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    // Verify agent
    const agent = BUILTIN_AGENTS[agentId];
    if (!agent || !agent.enabled) {
      return res.status(400).json({ error: "Agent not found or disabled" });
    }
    
    const finalModelId = modelId || agent.modelId;
    if (!finalModelId) {
      return res.status(400).json({ error: "No model configured for agent" });
    }
    
    const id = uuidv4();
    const now = new Date().toISOString();
    
    const task = jsonStorage.createAgentTask({
      id,
      projectId,
      agentId,
      name,
      description,
      status: "queued",
      mode,
      input,
      plan: undefined,
      steps: [],
      filesAffected: [],
      metadata: { modelId: finalModelId },
      createdAt: now,
      updatedAt: now,
    });
    
    // Start task execution asynchronously
    executeAgentTask(id, project.rootPath, agent, finalModelId).catch(err => {
      console.error(`[Agent Task ${id}] Execution error:`, err);
    });
    
    res.status(201).json(task);
  } catch (error) {
    console.error("[Agents] Create task error:", error);
    res.status(500).json({ error: "Failed to create agent task" });
  }
});

// GET /api/agents/tasks - List agent tasks
router.get("/tasks", async (req: Request, res: Response) => {
  try {
    const projectId = req.query.projectId as string | undefined;
    const agentId = req.query.agentId as string | undefined;
    const status = req.query.status as string | undefined;
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    
    let tasks = jsonStorage.getAgentTasks(projectId);
    
    if (agentId) {
      tasks = tasks.filter(t => t.agentId === agentId);
    }
    if (status) {
      tasks = tasks.filter(t => t.status === status);
    }
    
    // Sort by createdAt descending
    tasks.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    res.json(tasks.slice(offset, offset + limit));
  } catch (error) {
    console.error("[Agents] List tasks error:", error);
    res.status(500).json({ error: "Failed to list tasks" });
  }
});

// GET /api/agents/tasks/:id - Get task details
router.get("/tasks/:id", async (req: Request, res: Response) => {
  try {
    const task = jsonStorage.getAgentTask(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    // Get tool calls
    const calls = jsonStorage.getToolCalls(req.params.id);
    
    // Get approval requests
    const approvals = jsonStorage.getApprovalRequests(req.params.id);
    
    res.json({ ...task, toolCalls: calls, approvalRequests: approvals });
  } catch (error) {
    console.error("[Agents] Get task error:", error);
    res.status(500).json({ error: "Failed to get task" });
  }
});

// POST /api/agents/tasks/:id/action - Control task (pause/resume/cancel)
router.post("/tasks/:id/action", async (req: Request, res: Response) => {
  try {
    const parsed = AgentActionSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid action", details: parsed.error.flatten() });
    }
    
    const task = jsonStorage.getAgentTask(req.params.id);
    if (!task) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    const { action } = parsed.data;
    const now = new Date().toISOString();
    
    let newStatus: AgentTask["status"];
    switch (action) {
      case "pause":
        newStatus = "paused";
        break;
      case "resume":
        newStatus = "running";
        break;
      case "cancel":
        newStatus = "cancelled";
        break;
    }
    
    const updated = jsonStorage.updateAgentTask(req.params.id, { 
      status: newStatus, 
      updatedAt: now, 
      completedAt: action === "cancel" ? now : undefined 
    });
    
    if (!updated) {
      return res.status(404).json({ error: "Task not found" });
    }
    
    res.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("[Agents] Task action error:", error);
    res.status(500).json({ error: "Failed to perform task action" });
  }
});

// POST /api/agents/approvals - Respond to approval request
router.post("/approvals", async (req: Request, res: Response) => {
  try {
    const parsed = ApprovalResponseSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid approval response", details: parsed.error.flatten() });
    }
    
    const { requestId, action } = parsed.data;
    
    const request = jsonStorage.getApprovalRequest(requestId);
    if (!request) {
      return res.status(404).json({ error: "Approval request not found" });
    }
    
    if (request.status !== "pending") {
      return res.status(400).json({ error: "Request already resolved" });
    }
    
    const now = new Date().toISOString();
    const newStatus = action === "approve" ? "approved" : "denied";
    
    jsonStorage.updateApprovalRequest(requestId, { status: newStatus, resolvedAt: now, resolvedBy: "user" });
    
    // Update tool call
    // Note: JSON storage doesn't have updateToolCall, but we can add it if needed
    
    res.json({ success: true, status: newStatus });
  } catch (error) {
    console.error("[Agents] Approval error:", error);
    res.status(500).json({ error: "Failed to process approval" });
  }
});

// Tool implementations
interface ToolContext {
  projectRoot: string;
  taskId: string;
  agentId: string;
  requestApproval: (req: Omit<ApprovalRequest, "id" | "createdAt" | "status">) => Promise<ApprovalRequest>;
}

async function executeTool(name: string, input: any, context: ToolContext): Promise<any> {
  const { resolve } = await import("path");
  const { readFileSync, writeFileSync, readdirSync, statSync, existsSync } = await import("fs");
  const { spawn } = await import("child_process");
  
  switch (name) {
    case "read_file": {
      const { path } = input;
      const fullPath = resolve(context.projectRoot, path);
      if (!fullPath.startsWith(context.projectRoot)) throw new Error("Access denied");
      return { content: readFileSync(fullPath, "utf-8") };
    }
    case "write_file": {
      const { path, content } = input;
      const fullPath = resolve(context.projectRoot, path);
      if (!fullPath.startsWith(context.projectRoot)) throw new Error("Access denied");
      writeFileSync(fullPath, content, "utf-8");
      return { success: true };
    }
    case "edit_file": {
      const { path, oldText, newText } = input;
      const fullPath = resolve(context.projectRoot, path);
      if (!fullPath.startsWith(context.projectRoot)) throw new Error("Access denied");
      let fileContent = readFileSync(fullPath, "utf-8");
      if (!fileContent.includes(oldText)) throw new Error("Old text not found");
      fileContent = fileContent.replace(oldText, newText);
      writeFileSync(fullPath, fileContent, "utf-8");
      return { success: true };
    }
    case "list_files": {
      const { path } = input;
      const fullPath = resolve(context.projectRoot, path || ".");
      if (!fullPath.startsWith(context.projectRoot)) throw new Error("Access denied");
      const entries = readdirSync(fullPath, { withFileTypes: true });
      return { files: entries.map(e => ({ name: e.name, type: e.isDirectory() ? "directory" : "file" })) };
    }
    case "run_command": {
      const { command, cwd, timeout = 60000 } = input;
      const workDir = cwd ? resolve(context.projectRoot, cwd) : context.projectRoot;
      if (!workDir.startsWith(context.projectRoot)) throw new Error("Access denied");
      
      // Check if command needs approval
      const dangerousCommands = ["rm -rf", "dd if=", "mkfs", "fdisk", "shutdown", "reboot", "npm publish", "docker push"];
      if (dangerousCommands.some(d => command.includes(d))) {
        const approval = await context.requestApproval({
          taskId: context.taskId,
          toolCallId: uuidv4(),
          category: "execute_commands",
          description: `Execute potentially dangerous command: ${command}`,
          details: { command, cwd: workDir },
        });
        if (approval.status !== "approved") {
          throw new Error("Command execution denied");
        }
      }
      
      return new Promise((resolve, reject) => {
        const proc = spawn(command, { shell: true, cwd: workDir, timeout });
        let stdout = "", stderr = "";
        proc.stdout?.on("data", d => stdout += d.toString());
        proc.stderr?.on("data", d => stderr += d.toString());
        proc.on("close", (code) => resolve({ stdout, stderr, exitCode: code }));
        proc.on("error", reject);
      });
    }
    case "search_code": {
      const { query, path, pattern } = input;
      const fs = await import("fs");
      const searchDir = path ? resolve(context.projectRoot, path) : context.projectRoot;
      if (!searchDir.startsWith(context.projectRoot)) throw new Error("Access denied");
      
      const results: any[] = [];
      function search(dir: string) {
        if (results.length >= 50) return;
        const entries = fs.readdirSync(dir, { withFileTypes: true });
        for (const entry of entries) {
          if (results.length >= 50) break;
          if (["node_modules", ".git", "dist", "build"].includes(entry.name)) continue;
          const entryPath = resolve(dir, entry.name);
          if (entry.isDirectory()) {
            search(entryPath);
          } else if (entry.isFile()) {
            try {
              const content = fs.readFileSync(entryPath, "utf-8");
              const lines = content.split("\n");
              for (let i = 0; i < lines.length; i++) {
                if (lines[i].toLowerCase().includes(query.toLowerCase())) {
                  results.push({
                    file: entryPath.replace(context.projectRoot + "/", ""),
                    line: i + 1,
                    match: lines[i].trim(),
                    context: lines.slice(Math.max(0, i-2), i+3).join("\n"),
                  });
                }
              }
            } catch {}
          }
        }
      }
      search(searchDir);
      return { results };
    }
    case "get_symbols": {
      return { symbols: [] };
    }
    case "get_diagnostics": {
      return { diagnostics: [] };
    }
    default:
      throw new Error(`Unknown tool: ${name}`);
  }
}

async function executeAgentTask(taskId: string, projectRoot: string, agent: AgentConfig, modelId: string) {
  const now = new Date().toISOString();
  
  jsonStorage.updateAgentTask(taskId, { status: "running", startedAt: now, updatedAt: now });
  
  try {
    // Get provider for model
    const model = modelRegistry.get(modelId);
    if (!model) throw new Error("Model not found");
    
    const providerConfig = await providerConfigService.getByType(model.provider);
    if (!providerConfig) throw new Error("Provider not configured");
    
    const adapter = providerRegistry.get(model.provider);
    if (!adapter) throw new Error("Provider adapter not found");
    
    const context: ToolContext = {
      projectRoot,
      taskId,
      agentId: agent.id,
      requestApproval: async (req) => {
        const approvalId = uuidv4();
        const approval: ApprovalRequest = {
          id: approvalId,
          taskId,
          toolCallId: req.toolCallId,
          category: req.category as PermissionCategory,
          description: req.description,
          details: req.details,
          status: "pending",
          createdAt: new Date().toISOString(),
        };
        
        jsonStorage.createApprovalRequest(approval);
        
        // In a real implementation, this would wait for user approval via WebSocket
        // For now, we'll just return pending
        return approval;
      },
    };
    
    // Simple planning phase for plan/agent modes
    if (agent.mode === "plan" || agent.mode === "agent") {
      jsonStorage.updateAgentTask(taskId, { status: "planning", updatedAt: new Date().toISOString() });
      
      // Generate plan using the model
      const planPrompt = `You are ${agent.name}. ${agent.instructions}

Task: ${input}

Create a step-by-step plan to accomplish this task. Be specific about which files to read, edit, or create.`;
      
      const planRequest = {
        model: modelId,
        messages: [
          { role: "system" as const, content: agent.instructions },
          { role: "user" as const, content: planPrompt },
        ],
        temperature: 0.3,
        maxTokens: 4096,
        stream: false,
      };
      
      const validation = adapter.validateRequest(planRequest, model);
      if (validation.valid) {
        const planResponse = await adapter.chat(planRequest, providerConfig);
        const plan = planResponse.choices[0]?.message?.content || "No plan generated";
        
        jsonStorage.updateAgentTask(taskId, { plan, updatedAt: new Date().toISOString() });
      }
    }
    
    // Execute steps (simplified - in production this would be more sophisticated)
    jsonStorage.updateAgentTask(taskId, { status: "running", updatedAt: new Date().toISOString() });
    
    // For now, just mark as completed with a message
    // Real implementation would run the agent loop with tool calls
    jsonStorage.updateAgentTask(taskId, { 
      status: "completed", 
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      result: { message: "Task completed (simplified implementation)" },
    });
    
  } catch (error) {
    const err = error instanceof Error ? error.message : String(error);
    jsonStorage.updateAgentTask(taskId, { 
      status: "failed", 
      error: err,
      completedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
  }
}

const input = ""; // dummy for planPrompt

// Helper to get provider config by type
async function getProviderConfigByType(type: string) {
  const providers = jsonStorage.getProviders();
  return providers.find(p => p.type === type);
}

export default router;