import { resolve } from "path";
import { mkdirSync, existsSync, readFileSync, writeFileSync } from "fs";
import type {
  Workspace, NewWorkspace,
  Project, NewProject,
  Provider, NewProvider,
  Model, NewModel,
  Conversation, NewConversation,
  Message, NewMessage,
  AgentTask, NewAgentTask,
  ToolCall, NewToolCall,
  ApprovalRequest, NewApprovalRequest,
  PromptTemplate, NewPromptTemplate,
  UsageRecord, NewUsageRecord,
  Setting, NewSetting,
  Credential, NewCredential,
  Extension, NewExtension,
  TerminalSession, NewTerminalSession,
  TerminalCommand, NewTerminalCommand,
} from "./schema.js";

/**
 * JSON file-based storage for development without native SQLite modules.
 * In production, this would be replaced with the Drizzle/SQLite implementation.
 */

const DATA_DIR = process.env.VALVE_DATA_DIR || resolve(process.cwd(), "data");
const DB_FILE = resolve(DATA_DIR, "valve.json");

interface Database {
  workspaces: Workspace[];
  projects: Project[];
  providers: Provider[];
  models: Model[];
  conversations: Conversation[];
  messages: Message[];
  agentTasks: AgentTask[];
  toolCalls: ToolCall[];
  approvalRequests: ApprovalRequest[];
  promptTemplates: PromptTemplate[];
  usageRecords: UsageRecord[];
  settings: Setting[];
  credentials: Credential[];
  extensions: Extension[];
  terminalSessions: TerminalSession[];
  terminalCommands: TerminalCommand[];
}

const defaultDb: Database = {
  workspaces: [],
  projects: [],
  providers: [],
  models: [],
  conversations: [],
  messages: [],
  agentTasks: [],
  toolCalls: [],
  approvalRequests: [],
  promptTemplates: [],
  usageRecords: [],
  settings: [],
  credentials: [],
  extensions: [],
  terminalSessions: [],
  terminalCommands: [],
};

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) {
    mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadDb(): Database {
  ensureDataDir();
  if (existsSync(DB_FILE)) {
    try {
      const data = readFileSync(DB_FILE, "utf-8");
      return JSON.parse(data) as Database;
    } catch {
      return { ...defaultDb };
    }
  }
  return { ...defaultDb };
}

function saveDb(db: Database) {
  ensureDataDir();
  writeFileSync(DB_FILE, JSON.stringify(db, null, 2));
}

function generateId(): string {
  return crypto.randomUUID();
}

function now(): string {
  return new Date().toISOString();
}

// Generic CRUD operations
function select<T extends { id: string }>(table: keyof Database): T[] {
  const db = loadDb();
  return db[table] as T[];
}

function selectWhere<T extends { id: string }>(
  table: keyof Database,
  predicate: (item: T) => boolean
): T[] {
  const db = loadDb();
  return (db[table] as T[]).filter(predicate);
}

function selectOne<T extends { id: string }>(
  table: keyof Database,
  predicate: (item: T) => boolean
): T | undefined {
  const db = loadDb();
  return (db[table] as T[]).find(predicate);
}

function insert<T extends { id: string }>(table: keyof Database, item: T): T {
  const db = loadDb();
  const newItem = { ...item, id: item.id || generateId() } as T;
  (db[table] as T[]).push(newItem);
  saveDb(db);
  return newItem;
}

function update<T extends { id: string }>(
  table: keyof Database,
  id: string,
  updates: Partial<T>
): T | undefined {
  const db = loadDb();
  const index = (db[table] as T[]).findIndex(item => item.id === id);
  if (index === -1) return undefined;
  const updated = { ...db[table][index], ...updates } as T;
  db[table][index] = updated;
  saveDb(db);
  return updated;
}

function remove(table: keyof Database, id: string): boolean {
  const db = loadDb();
  const index = (db[table] as any[]).findIndex(item => item.id === id);
  if (index === -1) return false;
  (db[table] as any[]).splice(index, 1);
  saveDb(db);
  return true;
}

// Specific table operations
export const jsonStorage = {
  // Workspaces
  getWorkspaces: () => select<Workspace>("workspaces"),
  getWorkspace: (id: string) => selectOne<Workspace>("workspaces", w => w.id === id),
  createWorkspace: (data: Omit<NewWorkspace, "id" | "createdAt" | "updatedAt">) =>
    insert("workspaces", { ...data, id: generateId(), createdAt: now(), updatedAt: now() }),
  updateWorkspace: (id: string, updates: Partial<Workspace>) =>
    update("workspaces", id, { ...updates, updatedAt: now() }),
  deleteWorkspace: (id: string) => remove("workspaces", id),

  // Projects
  getProjects: () => select<Project>("projects"),
  getProject: (id: string) => selectOne<Project>("projects", p => p.id === id),
  getProjectsByWorkspace: (workspaceId: string) =>
    selectWhere<Project>("projects", p => p.workspaceId === workspaceId),
  createProject: (data: Omit<NewProject, "id" | "createdAt" | "updatedAt">) =>
    insert("projects", { ...data, id: generateId(), createdAt: now(), updatedAt: now(), lastOpenedAt: now() }),
  updateProject: (id: string, updates: Partial<Project>) =>
    update("projects", id, { ...updates, updatedAt: now() }),
  deleteProject: (id: string) => remove("projects", id),

  // Providers
  getProviders: () => select<Provider>("providers"),
  getProvider: (id: string) => selectOne<Provider>("providers", p => p.id === id),
  getProviderByType: (type: string) => selectOne<Provider>("providers", p => p.type === type),
  createProvider: (data: Omit<NewProvider, "id" | "createdAt" | "updatedAt">) =>
    insert("providers", { ...data, id: generateId(), createdAt: now(), updatedAt: now() }),
  updateProvider: (id: string, updates: Partial<Provider>) =>
    update("providers", id, { ...updates, updatedAt: now() }),
  deleteProvider: (id: string) => remove("providers", id),

  // Models
  getModels: () => select<Model>("models"),
  getModel: (id: string) => selectOne<Model>("models", m => m.id === id),
  getModelsByProvider: (provider: string) =>
    selectWhere<Model>("models", m => m.provider === provider),
  upsertModel: (model: NewModel) => {
    const existing = selectOne<Model>("models", m => m.provider === model.provider && m.providerModelId === model.providerModelId);
    if (existing) {
      return update("models", existing.id, model);
    }
    return insert("models", { ...model, id: model.id || generateId(), lastRefreshedAt: now() });
  },

  // Conversations
  getConversations: (projectId?: string) =>
    projectId
      ? selectWhere<Conversation>("conversations", c => c.projectId === projectId)
      : select<Conversation>("conversations"),
  getConversation: (id: string) => selectOne<Conversation>("conversations", c => c.id === id),
  createConversation: (data: Omit<NewConversation, "id" | "createdAt" | "updatedAt">) =>
    insert("conversations", { ...data, id: generateId(), createdAt: now(), updatedAt: now() }),
  updateConversation: (id: string, updates: Partial<Conversation>) =>
    update("conversations", id, { ...updates, updatedAt: now() }),
  deleteConversation: (id: string) => remove("conversations", id),

  // Messages
  getMessages: (conversationId: string) =>
    selectWhere<Message>("messages", m => m.conversationId === conversationId).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()),
  createMessage: (data: Omit<NewMessage, "id" | "createdAt">) =>
    insert("messages", { ...data, id: generateId(), createdAt: now() }),

  // Agent Tasks
  getAgentTasks: (projectId?: string) =>
    projectId
      ? selectWhere<AgentTask>("agentTasks", t => t.projectId === projectId)
      : select<AgentTask>("agentTasks"),
  getAgentTask: (id: string) => selectOne<AgentTask>("agentTasks", t => t.id === id),
  createAgentTask: (data: Omit<NewAgentTask, "id" | "createdAt" | "updatedAt">) =>
    insert("agentTasks", { ...data, id: generateId(), createdAt: now(), updatedAt: now() }),
  updateAgentTask: (id: string, updates: Partial<AgentTask>) =>
    update("agentTasks", id, { ...updates, updatedAt: now() }),

  // Tool Calls
  getToolCalls: (taskId: string) =>
    selectWhere<ToolCall>("toolCalls", t => t.taskId === taskId).sort((a, b) => new Date(a.startedAt).getTime() - new Date(b.startedAt).getTime()),
  createToolCall: (data: Omit<NewToolCall, "id">) =>
    insert("toolCalls", { ...data, id: generateId() }),

  // Approval Requests
  getApprovalRequests: (taskId: string) =>
    selectWhere<ApprovalRequest>("approvalRequests", r => r.taskId === taskId),
  getApprovalRequest: (id: string) => selectOne<ApprovalRequest>("approvalRequests", r => r.id === id),
  createApprovalRequest: (data: Omit<NewApprovalRequest, "id" | "createdAt">) =>
    insert("approvalRequests", { ...data, id: generateId(), createdAt: now() }),
  updateApprovalRequest: (id: string, updates: Partial<ApprovalRequest>) =>
    update("approvalRequests", id, updates),

  // Prompt Templates
  getPromptTemplates: (projectId?: string) =>
    projectId
      ? selectWhere<PromptTemplate>("promptTemplates", t => t.projectId === projectId)
      : select<PromptTemplate>("promptTemplates"),
  createPromptTemplate: (data: Omit<NewPromptTemplate, "id" | "createdAt" | "updatedAt">) =>
    insert("promptTemplates", { ...data, id: generateId(), createdAt: now(), updatedAt: now() }),

  // Usage Records
  getUsageRecords: (filters?: { projectId?: string; providerId?: string; modelId?: string }) =>
    selectWhere<UsageRecord>("usageRecords", r => {
      if (filters?.projectId && r.projectId !== filters.projectId) return false;
      if (filters?.providerId && r.providerId !== filters.providerId) return false;
      if (filters?.modelId && r.modelId !== filters.modelId) return false;
      return true;
    }),
  createUsageRecord: (data: Omit<NewUsageRecord, "id" | "createdAt">) =>
    insert("usageRecords", { ...data, id: generateId(), createdAt: now() }),

  // Settings
  getSettings: (scope?: string, workspaceId?: string, projectId?: string) =>
    selectWhere<Setting>("settings", s => {
      if (scope && s.scope !== scope) return false;
      if (workspaceId && s.workspaceId !== workspaceId) return false;
      if (projectId && s.projectId !== projectId) return false;
      return true;
    }),
  getSetting: (key: string, scope?: string, workspaceId?: string, projectId?: string) =>
    selectOne<Setting>("settings", s => {
      if (s.key !== key) return false;
      if (scope && s.scope !== scope) return false;
      if (workspaceId && s.workspaceId !== workspaceId) return false;
      if (projectId && s.projectId !== projectId) return false;
      return true;
    }),
  setSetting: (data: Omit<NewSetting, "id" | "updatedAt">) => {
    const existing = selectOne<Setting>("settings", s => {
      if (s.key !== data.key) return false;
      if (data.scope && s.scope !== data.scope) return false;
      if (data.workspaceId && s.workspaceId !== data.workspaceId) return false;
      if (data.projectId && s.projectId !== data.projectId) return false;
      return true;
    });
    if (existing) {
      return update("settings", existing.id, { ...data, value: data.value, updatedAt: now() });
    }
    return insert("settings", { ...data, updatedAt: now() });
  },

  // Credentials
  getCredential: (key: string) => selectOne<Credential>("credentials", c => c.key === key),
  getProviderCredentials: (providerId: string) => selectWhere<Credential>("credentials", c => c.providerId === providerId),
  setCredential: (data: Omit<NewCredential, "id" | "createdAt" | "updatedAt">) => {
    const existing = selectOne<Credential>("credentials", c => c.key === data.key);
    if (existing) {
      return update("credentials", existing.id, { ...data, value: data.value, updatedAt: now() });
    }
    return insert("credentials", { ...data, id: generateId(), createdAt: now(), updatedAt: now() });
  },
  deleteCredential: (key: string) => remove("credentials", key),

  // Extensions
  getExtensions: () => select<Extension>("extensions"),
  createExtension: (data: Omit<NewExtension, "id" | "installedAt" | "updatedAt">) =>
    insert("extensions", { ...data, id: generateId(), installedAt: now(), updatedAt: now() }),
  updateExtension: (id: string, updates: Partial<Extension>) =>
    update("extensions", id, { ...updates, updatedAt: now() }),

  // Terminal Sessions
  getTerminalSessions: (projectId?: string) =>
    projectId
      ? selectWhere<TerminalSession>("terminalSessions", s => s.projectId === projectId)
      : select<TerminalSession>("terminalSessions"),
  createTerminalSession: (data: Omit<NewTerminalSession, "id" | "createdAt">) =>
    insert("terminalSessions", { ...data, id: generateId(), createdAt: now() }),
  updateTerminalSession: (id: string, updates: Partial<TerminalSession>) =>
    update("terminalSessions", id, updates),

  // Terminal Commands
  getTerminalCommands: (sessionId: string) =>
    selectWhere<TerminalCommand>("terminalCommands", c => c.sessionId === sessionId).sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()),
  createTerminalCommand: (data: Omit<NewTerminalCommand, "id">) =>
    insert("terminalCommands", { ...data, id: generateId() }),
};

export default jsonStorage;