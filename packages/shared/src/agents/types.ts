import { z } from "zod";
import { ModelDefinition, ChatMessage, ToolDefinition } from "../providers/types.js";

/**
 * Agent types for the AI Coding Agent and Multi-Agent Collaboration systems.
 */

export const AgentRoleSchema = z.enum([
  "primary",
  "reasoning",
  "fast",
  "code-review",
  "documentation",
  "test-generation",
  "debugging",
  "architecture",
  "architect",
  "frontend",
  "backend",
  "database",
  "testing",
  "security",
  "docs",
  "reviewer",
  "researcher",
  "custom",
]);

export type AgentRole = z.infer<typeof AgentRoleSchema>;

export const AgentModeSchema = z.enum([
  "ask",
  "plan",
  "edit",
  "agent",
  "review",
  "autonomous",
]);

export type AgentMode = z.infer<typeof AgentModeSchema>;

export const AgentStatusSchema = z.enum([
  "idle",
  "queued",
  "planning",
  "running",
  "awaiting_approval",
  "completed",
  "failed",
  "cancelled",
  "paused",
]);

export type AgentStatus = z.infer<typeof AgentStatusSchema>;

export const PermissionCategorySchema = z.enum([
  "read_files",
  "write_files",
  "create_files",
  "delete_files",
  "execute_commands",
  "install_dependencies",
  "network_access",
  "git_read",
  "git_write",
  "git_push",
  "github_pr",
  "github_issues",
  "external_services",
  "env_vars",
  "credentials",
]);

export type PermissionCategory = z.infer<typeof PermissionCategorySchema>;

export const ApprovalPolicySchema = z.enum([
  "ask_every_time",
  "allow_workspace",
  "allow_specific",
  "deny",
]);

export type ApprovalPolicy = z.infer<typeof ApprovalPolicySchema>;

export const PermissionRuleSchema = z.object({
  category: PermissionCategorySchema,
  policy: ApprovalPolicySchema,
  allowedValues: z.array(z.string()).optional(), // Specific commands, paths, etc.
  deniedValues: z.array(z.string()).optional(),
});

export type PermissionRule = z.infer<typeof PermissionRuleSchema>;

export const AgentConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  role: AgentRoleSchema,
  description: z.string().optional(),
  modelId: z.string(), // References ModelDefinition.id
  instructions: z.string(),
  mode: AgentModeSchema,
  permissions: z.array(PermissionRuleSchema).default([]),
  tools: z.array(z.string()).default([]), // Tool names this agent can use
  maxSteps: z.number().int().positive().default(50),
  maxTokens: z.number().int().positive().optional(),
  temperature: z.number().min(0).max(2).optional(),
  enabled: z.boolean().default(true),
  metadata: z.record(z.unknown()).default({}),
});

export type AgentConfig = z.infer<typeof AgentConfigSchema>;

export const AgentTaskSchema = z.object({
  id: z.string(),
  agentId: z.string(),
  name: z.string(),
  description: z.string(),
  status: AgentStatusSchema,
  mode: AgentModeSchema,
  input: z.string(), // User's request
  plan: z.string().optional(),
  steps: z.array(z.object({
    id: z.string(),
    description: z.string(),
    tool: z.string().optional(),
    input: z.unknown().optional(),
    output: z.unknown().optional(),
    status: z.enum(["pending", "running", "completed", "failed", "skipped"]),
    startedAt: z.string().datetime().optional(),
    completedAt: z.string().datetime().optional(),
    error: z.string().optional(),
  })).default([]),
  filesAffected: z.array(z.string()).default([]),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  startedAt: z.string().datetime().optional(),
  completedAt: z.string().datetime().optional(),
  error: z.string().optional(),
  result: z.unknown().optional(),
  metadata: z.record(z.unknown()).default({}),
});

export type AgentTask = z.infer<typeof AgentTaskSchema>;

export const ToolCallSchema = z.object({
  id: z.string(),
  name: z.string(),
  input: z.unknown(),
  output: z.unknown().optional(),
  error: z.string().optional(),
  startedAt: z.string().datetime(),
  completedAt: z.string().datetime().optional(),
  durationMs: z.number().int().optional(),
  approved: z.boolean().optional(),
  approvalRequestId: z.string().optional(),
});

export type ToolCall = z.infer<typeof ToolCallSchema>;

export const ApprovalRequestSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  toolCallId: z.string(),
  category: PermissionCategorySchema,
  description: z.string(),
  details: z.record(z.unknown()),
  status: z.enum(["pending", "approved", "denied", "expired"]),
  createdAt: z.string().datetime(),
  resolvedAt: z.string().datetime().optional(),
  resolvedBy: z.string().optional(),
});

export type ApprovalRequest = z.infer<typeof ApprovalRequestSchema>;

/**
 * Tool definitions for agent capabilities
 */
export interface AgentTool {
  readonly name: string;
  readonly description: string;
  readonly parameters: z.ZodSchema<any>;
  readonly requiredPermissions: PermissionCategory[];
  readonly idempotent: boolean;
  
  execute(input: unknown, context: ToolExecutionContext): Promise<ToolResult>;
}

export interface ToolExecutionContext {
  workspaceRoot: string;
  agentId: string;
  taskId: string;
  approvalRequest: (request: Omit<ApprovalRequest, "id" | "createdAt" | "status">) => Promise<ApprovalRequest>;
  getFileContent: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  deleteFile: (path: string) => Promise<void>;
  listFiles: (path: string) => Promise<string[]>;
  runCommand: (command: string, options: { cwd?: string; timeout?: number }) => Promise<CommandResult>;
  searchCode: (query: string, options: { path?: string; pattern?: string }) => Promise<SearchResult[]>;
  getSymbols: (path: string) => Promise<SymbolInfo[]>;
  getDiagnostics: (path?: string) => Promise<Diagnostic[]>;
}

export interface ToolResult {
  success: boolean;
  output?: unknown;
  error?: string;
  filesChanged?: string[];
  metadata?: Record<string, unknown>;
}

export interface CommandResult {
  stdout: string;
  stderr: string;
  exitCode: number;
  durationMs: number;
}

export interface SearchResult {
  file: string;
  line: number;
  column: number;
  match: string;
  context: string;
}

export interface SymbolInfo {
  name: string;
  kind: "function" | "class" | "interface" | "type" | "variable" | "constant" | "method" | "property";
  location: { file: string; line: number; column: number };
  signature: string;
  documentation?: string;
}

export interface Diagnostic {
  file: string;
  line: number;
  column: number;
  severity: "error" | "warning" | "info" | "hint";
  message: string;
  code?: string;
  source?: string;
}

/**
 * Multi-agent collaboration types
 */
export const CollaborationMessageSchema = z.object({
  id: z.string(),
  fromAgentId: z.string(),
  toAgentId: z.string().optional(), // undefined = broadcast
  taskId: z.string(),
  type: z.enum(["request", "response", "notification", "artifact", "conflict"]),
  content: z.unknown(),
  timestamp: z.string().datetime(),
});

export type CollaborationMessage = z.infer<typeof CollaborationMessageSchema>;

export const SharedArtifactSchema = z.object({
  id: z.string(),
  taskId: z.string(),
  createdByAgentId: z.string(),
  type: z.enum(["file", "analysis", "plan", "test", "documentation", "code", "other"]),
  path: z.string().optional(),
  content: z.unknown(),
  version: z.number().int().positive(),
  metadata: z.record(z.unknown()).default({}),
});

export type SharedArtifact = z.infer<typeof SharedArtifactSchema>;

export const FileLockSchema = z.object({
  path: z.string(),
  agentId: z.string(),
  taskId: z.string(),
  acquiredAt: z.string().datetime(),
  expiresAt: z.string().datetime().optional(),
});

export type FileLock = z.infer<typeof FileLockSchema>;

/**
 * Agent runtime interface
 */
export interface AgentRuntime {
  startTask(task: Omit<AgentTask, "id" | "createdAt" | "updatedAt" | "status" | "steps">): Promise<AgentTask>;
  pauseTask(taskId: string): Promise<void>;
  resumeTask(taskId: string): Promise<void>;
  cancelTask(taskId: string): Promise<void>;
  getTask(taskId: string): AgentTask | undefined;
  getTasks(agentId?: string): AgentTask[];
  onTaskUpdate(callback: (task: AgentTask) => void): () => void;
  onApprovalRequest(callback: (request: ApprovalRequest) => void): () => void;
}