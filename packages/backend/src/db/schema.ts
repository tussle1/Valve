import { sqliteTable, text, integer, real, index, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

/**
 * Database schema for Valve IDE backend.
 * Uses SQLite with Drizzle ORM for local-first persistence.
 */

export const workspaces = sqliteTable("workspaces", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  settings: text("settings", { mode: "json" }).notNull().default("{}"),
  layout: text("layout", { mode: "json" }).notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const projects = sqliteTable("projects", {
  id: text("id").primaryKey(),
  workspaceId: text("workspace_id").notNull().references(() => workspaces.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  rootPath: text("root_path").notNull(),
  type: text("type").notNull().default("generic"),
  buildCommand: text("build_command"),
  runCommand: text("run_command"),
  testCommand: text("test_command"),
  lintCommand: text("lint_command"),
  devCommand: text("dev_command"),
  installCommand: text("install_command"),
  envFile: text("env_file"),
  excludedPaths: text("excluded_paths", { mode: "json" }).notNull().default("[]"),
  includedPaths: text("included_paths", { mode: "json" }).notNull().default("[]"),
  settings: text("settings", { mode: "json" }).notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
  lastOpenedAt: text("last_opened_at"),
}, (table) => ({
  workspaceIdx: index("projects_workspace_idx").on(table.workspaceId),
  pathIdx: uniqueIndex("projects_path_unique_idx").on(table.rootPath),
}));

export const providers = sqliteTable("providers", {
  id: text("id").primaryKey(),
  type: text("type").notNull(),
  name: text("name").notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  apiKeyRef: text("api_key_ref"),
  baseUrl: text("base_url"),
  organizationId: text("organization_id"),
  projectId: text("project_id"),
  customHeaders: text("custom_headers", { mode: "json" }).notNull().default("{}"),
  timeoutMs: integer("timeout_ms").notNull().default(120000),
  retryPolicy: text("retry_policy", { mode: "json" }).notNull().default("{}"),
  rateLimits: text("rate_limits", { mode: "json" }),
  models: text("models", { mode: "json" }).notNull().default("[]"),
  metadata: text("metadata", { mode: "json" }).notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
});

export const models = sqliteTable("models", {
  id: text("id").primaryKey(),
  provider: text("provider").notNull(),
  providerModelId: text("provider_model_id").notNull(),
  displayName: text("display_name").notNull(),
  family: text("family").notNull(),
  capabilities: text("capabilities", { mode: "json" }).notNull().default("[]"),
  contextWindow: integer("context_window"),
  maxOutputTokens: integer("max_output_tokens"),
  pricing: text("pricing", { mode: "json" }),
  streaming: integer("streaming", { mode: "boolean" }).notNull().default(true),
  tools: integer("tools", { mode: "boolean" }).notNull().default(false),
  images: integer("images", { mode: "boolean" }).notNull().default(false),
  audioInput: integer("audio_input", { mode: "boolean" }).notNull().default(false),
  audioOutput: integer("audio_output", { mode: "boolean" }).notNull().default(false),
  structuredOutput: integer("structured_output", { mode: "boolean" }).notNull().default(false),
  reasoning: integer("reasoning", { mode: "boolean" }).notNull().default(false),
  executionEnvironment: text("execution_environment").notNull().default("cloud"),
  status: text("status").notNull().default("unknown"),
  aliases: text("aliases", { mode: "json" }).notNull().default("[]"),
  tags: text("tags", { mode: "json" }).notNull().default("[]"),
  description: text("description"),
  releaseDate: text("release_date"),
  deprecatedDate: text("deprecated_date"),
  metadata: text("metadata", { mode: "json" }).notNull().default("{}"),
  lastRefreshedAt: text("last_refreshed_at").notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  providerIdx: index("models_provider_idx").on(table.provider),
  familyIdx: index("models_family_idx").on(table.family),
  statusIdx: index("models_status_idx").on(table.status),
  providerModelIdx: uniqueIndex("models_provider_model_unique_idx").on(table.provider, table.providerModelId),
}));

export const conversations = sqliteTable("conversations", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  title: text("title").notNull(),
  modelId: text("model_id").notNull(),
  providerId: text("provider_id").notNull(),
  systemInstructions: text("system_instructions"),
  projectInstructions: text("project_instructions"),
  pinned: integer("pinned", { mode: "boolean" }).notNull().default(false),
  archived: integer("archived", { mode: "boolean" }).notNull().default(false),
  tokenCount: integer("token_count").notNull().default(0),
  messageCount: integer("message_count").notNull().default(0),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
  lastMessageAt: text("last_message_at"),
}, (table) => ({
  projectIdx: index("conversations_project_idx").on(table.projectId),
  modelIdx: index("conversations_model_idx").on(table.modelId),
  updatedIdx: index("conversations_updated_idx").on(table.updatedAt),
}));

export const messages = sqliteTable("messages", {
  id: text("id").primaryKey(),
  conversationId: text("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
  role: text("role").notNull(), // system, user, assistant, tool
  content: text("content"),
  name: text("name"),
  toolCalls: text("tool_calls", { mode: "json" }),
  toolCallId: text("tool_call_id"),
  metadata: text("metadata", { mode: "json" }).notNull().default("{}"),
  tokens: integer("tokens"),
  modelId: text("model_id"),
  providerId: text("provider_id"),
  status: text("status").notNull().default("completed"), // streaming, completed, error, cancelled
  error: text("error"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  conversationIdx: index("messages_conversation_idx").on(table.conversationId),
  createdIdx: index("messages_created_idx").on(table.createdAt),
}));

export const agentTasks = sqliteTable("agent_tasks", {
  id: text("id").primaryKey(),
  projectId: text("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
  agentId: text("agent_id").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  status: text("status").notNull().default("queued"),
  mode: text("mode").notNull().default("agent"),
  input: text("input").notNull(),
  plan: text("plan"),
  steps: text("steps", { mode: "json" }).notNull().default("[]"),
  filesAffected: text("files_affected", { mode: "json" }).notNull().default("[]"),
  error: text("error"),
  result: text("result", { mode: "json" }),
  metadata: text("metadata", { mode: "json" }).notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
  startedAt: text("started_at"),
  completedAt: text("completed_at"),
}, (table) => ({
  projectIdx: index("agent_tasks_project_idx").on(table.projectId),
  agentIdx: index("agent_tasks_agent_idx").on(table.agentId),
  statusIdx: index("agent_tasks_status_idx").on(table.status),
}));

export const toolCalls = sqliteTable("tool_calls", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => agentTasks.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  input: text("input", { mode: "json" }).notNull(),
  output: text("output", { mode: "json" }),
  error: text("error"),
  startedAt: text("started_at").notNull(),
  completedAt: text("completed_at"),
  durationMs: integer("duration_ms"),
  approved: integer("approved", { mode: "boolean" }),
  approvalRequestId: text("approval_request_id"),
}, (table) => ({
  taskIdx: index("tool_calls_task_idx").on(table.taskId),
}));

export const approvalRequests = sqliteTable("approval_requests", {
  id: text("id").primaryKey(),
  taskId: text("task_id").notNull().references(() => agentTasks.id, { onDelete: "cascade" }),
  toolCallId: text("tool_call_id").notNull().references(() => toolCalls.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  description: text("description").notNull(),
  details: text("details", { mode: "json" }).notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  resolvedAt: text("resolved_at"),
  resolvedBy: text("resolved_by"),
}, (table) => ({
  taskIdx: index("approval_requests_task_idx").on(table.taskId),
  statusIdx: index("approval_requests_status_idx").on(table.status),
}));

export const promptTemplates = sqliteTable("prompt_templates", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  content: text("content").notNull(),
  variables: text("variables", { mode: "json" }).notNull().default("[]"),
  tags: text("tags", { mode: "json" }).notNull().default("[]"),
  version: integer("version").notNull().default(1),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  projectIdx: index("prompt_templates_project_idx").on(table.projectId),
}));

export const usageRecords = sqliteTable("usage_records", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  providerId: text("provider_id").notNull(),
  modelId: text("model_id").notNull(),
  conversationId: text("conversation_id").references(() => conversations.id, { onDelete: "set null" }),
  agentTaskId: text("agent_task_id").references(() => agentTasks.id, { onDelete: "set null" }),
  requestType: text("request_type").notNull(), // chat, completion, embedding, etc.
  inputTokens: integer("input_tokens").notNull().default(0),
  outputTokens: integer("output_tokens").notNull().default(0),
  cachedTokens: integer("cached_tokens").notNull().default(0),
  totalTokens: integer("total_tokens").notNull().default(0),
  estimatedCost: real("estimated_cost"),
  actualCost: real("actual_cost"),
  currency: text("currency").notNull().default("USD"),
  latencyMs: integer("latency_ms"),
  status: text("status").notNull().default("success"), // success, error, cancelled
  error: text("error"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  projectIdx: index("usage_records_project_idx").on(table.projectId),
  providerIdx: index("usage_records_provider_idx").on(table.providerId),
  modelIdx: index("usage_records_model_idx").on(table.modelId),
  dateIdx: index("usage_records_date_idx").on(table.createdAt),
}));

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value", { mode: "json" }).notNull(),
  scope: text("scope").notNull().default("user"), // user, workspace, project
  workspaceId: text("workspace_id").references(() => workspaces.id, { onDelete: "cascade" }),
  projectId: text("project_id").references(() => projects.id, { onDelete: "cascade" }),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  scopeWorkspaceIdx: index("settings_scope_workspace_idx").on(table.scope, table.workspaceId),
  scopeProjectIdx: index("settings_scope_project_idx").on(table.scope, table.projectId),
}));

export const credentials = sqliteTable("credentials", {
  key: text("key").primaryKey(),
  value: text("value").notNull(), // Encrypted
  type: text("type").notNull(), // api_key, oauth_token, etc.
  providerId: text("provider_id"),
  metadata: text("metadata", { mode: "json" }).notNull().default("{}"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
  expiresAt: text("expires_at"),
});

export const extensions = sqliteTable("extensions", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  version: text("version").notNull(),
  publisher: text("publisher").notNull(),
  path: text("path").notNull(),
  installPath: text("install_path").notNull(),
  manifest: text("manifest", { mode: "json" }).notNull(),
  enabled: integer("enabled", { mode: "boolean" }).notNull().default(true),
  isBuiltin: integer("is_builtin", { mode: "boolean" }).notNull().default(false),
  isLocal: integer("is_local", { mode: "boolean" }).default(false),
  state: text("state").notNull().default("installed"),
  error: text("error"),
  installedAt: text("installed_at").notNull().default(sql`(datetime('now'))`),
  updatedAt: text("updated_at").notNull().default(sql`(datetime('now'))`),
}, (table) => ({
  nameIdx: uniqueIndex("extensions_name_unique_idx").on(table.name),
}));

export const terminalSessions = sqliteTable("terminal_sessions", {
  id: text("id").primaryKey(),
  projectId: text("project_id").references(() => projects.id, { onDelete: "set null" }),
  profileId: text("profile_id").notNull(),
  title: text("title").notNull(),
  cwd: text("cwd").notNull(),
  cols: integer("cols").notNull().default(80),
  rows: integer("rows").notNull().default(24),
  status: text("status").notNull().default("running"),
  exitCode: integer("exit_code"),
  createdAt: text("created_at").notNull().default(sql`(datetime('now'))`),
  closedAt: text("closed_at"),
}, (table) => ({
  projectIdx: index("terminal_sessions_project_idx").on(table.projectId),
}));

export const terminalCommands = sqliteTable("terminal_commands", {
  id: text("id").primaryKey(),
  sessionId: text("session_id").notNull().references(() => terminalSessions.id, { onDelete: "cascade" }),
  command: text("command").notNull(),
  cwd: text("cwd").notNull(),
  startTime: text("start_time").notNull(),
  endTime: text("end_time"),
  exitCode: integer("exit_code"),
  durationMs: integer("duration_ms"),
  source: text("source").notNull().default("user"),
  approved: integer("approved", { mode: "boolean" }),
  approvalRequestId: text("approval_request_id"),
}, (table) => ({
  sessionIdx: index("terminal_commands_session_idx").on(table.sessionId),
}));

// Type exports for Drizzle
export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;
export type Provider = typeof providers.$inferSelect;
export type NewProvider = typeof providers.$inferInsert;
export type Model = typeof models.$inferSelect;
export type NewModel = typeof models.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type NewConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type NewMessage = typeof messages.$inferInsert;
export type AgentTask = typeof agentTasks.$inferSelect;
export type NewAgentTask = typeof agentTasks.$inferInsert;
export type ToolCall = typeof toolCalls.$inferSelect;
export type NewToolCall = typeof toolCalls.$inferInsert;
export type ApprovalRequest = typeof approvalRequests.$inferSelect;
export type NewApprovalRequest = typeof approvalRequests.$inferInsert;
export type PromptTemplate = typeof promptTemplates.$inferSelect;
export type NewPromptTemplate = typeof promptTemplates.$inferInsert;
export type UsageRecord = typeof usageRecords.$inferSelect;
export type NewUsageRecord = typeof usageRecords.$inferInsert;
export type Setting = typeof settings.$inferSelect;
export type NewSetting = typeof settings.$inferInsert;
export type Credential = typeof credentials.$inferSelect;
export type NewCredential = typeof credentials.$inferInsert;
export type Extension = typeof extensions.$inferSelect;
export type NewExtension = typeof extensions.$inferInsert;
export type TerminalSession = typeof terminalSessions.$inferSelect;
export type NewTerminalSession = typeof terminalSessions.$inferInsert;
export type TerminalCommand = typeof terminalCommands.$inferSelect;
export type NewTerminalCommand = typeof terminalCommands.$inferInsert;