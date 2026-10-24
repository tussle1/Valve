// Re-export shared types
export * from "@valve/shared";

// Frontend-specific types
export interface UIState {
  // Layout
  sidebarOpen: boolean;
  sidebarWidth: number;
  aiPanelOpen: boolean;
  aiPanelWidth: number;
  bottomPanelOpen: boolean;
  bottomPanelHeight: number;
  bottomPanelTab: "terminal" | "problems" | "output" | "debug" | "tests";
  
  // Activity bar
  activeActivity: "explorer" | "search" | "git" | "ai-chat" | "ai-agents" | "ai-arena" | "extensions" | "debug" | "test";
  
  // Editor
  activeTabId: string | null;
  tabs: EditorTab[];
  splitDirection: "vertical" | "horizontal" | null;
  
  // AI
  currentModel: string | null;
  currentProvider: string | null;
  modelPickerOpen: boolean;
  
  // Terminal
  terminalSessions: TerminalSession[];
  activeTerminalId: string | null;
  
  // Notifications
  notifications: Notification[];
  
  // Modals
  modals: Modal[];
}

export interface EditorTab {
  id: string;
  filePath: string;
  label: string;
  isDirty: boolean;
  language: string;
  encoding: string;
  lineEnding: "lf" | "crlf";
  cursorPosition?: { line: number; column: number };
  selection?: { startLine: number; startColumn: number; endLine: number; endColumn: number };
}

export interface TerminalSession {
  id: string;
  title: string;
  cwd: string;
  cols: number;
  rows: number;
  status: "starting" | "running" | "exited" | "error";
  pid?: number;
}

export interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error";
  title: string;
  message?: string;
  actions?: NotificationAction[];
  persistent?: boolean;
  createdAt: Date;
}

export interface NotificationAction {
  label: string;
  action: () => void;
  primary?: boolean;
}

export interface Modal {
  id: string;
  type: "confirm" | "input" | "select" | "custom";
  title: string;
  content: React.ReactNode;
  onConfirm?: (value?: any) => void;
  onCancel?: () => void;
  confirmLabel?: string;
  cancelLabel?: string;
}

export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  icon?: React.ReactNode;
  keywords?: string[];
  action: () => void;
  category?: string;
}

export interface SearchResult {
  file: string;
  line: number;
  column: number;
  match: string;
  contextBefore?: string;
  contextAfter?: string;
  language: string;
}

export interface FileTreeNode {
  path: string;
  name: string;
  type: "file" | "directory" | "symlink";
  children?: FileTreeNode[];
  expanded?: boolean;
  selected?: boolean;
  gitStatus?: "unmodified" | "modified" | "added" | "deleted" | "renamed" | "untracked" | "ignored" | "conflicted";
  isBinary?: boolean;
  language?: string;
}

export interface ModelPickerModel {
  id: string;
  displayName: string;
  provider: string;
  providerType: string;
  capabilities: string[];
  contextWindow: number | null;
  pricing: { input: number | null; output: number | null } | null;
  executionEnvironment: "cloud" | "local" | "hybrid";
  status: "available" | "deprecated" | "unavailable" | "unknown";
  favorite: boolean;
  recentlyUsed: boolean;
}

export interface ArenaComparison {
  id: string;
  prompt: string;
  models: string[];
  results: ArenaResult[];
  createdAt: Date;
  status: "pending" | "running" | "completed" | "error";
}

export interface ArenaResult {
  modelId: string;
  response: string;
  latencyMs: number;
  tokens: { input: number; output: number; total: number };
  cost: number | null;
  error?: string;
  status: "completed" | "error" | "cancelled";
}

export interface AgentTaskView {
  id: string;
  name: string;
  agentId: string;
  agentName: string;
  modelId: string;
  status: "queued" | "planning" | "running" | "awaiting_approval" | "completed" | "failed" | "cancelled" | "paused";
  currentStep: string;
  progress: number;
  filesAffected: string[];
  startedAt: Date | null;
  elapsedMs: number;
  approvalRequests: ApprovalRequestView[];
}

export interface ApprovalRequestView {
  id: string;
  category: string;
  description: string;
  details: Record<string, any>;
  status: "pending" | "approved" | "denied" | "expired";
  createdAt: Date;
}

export interface GitFileChange {
  path: string;
  status: "unmodified" | "modified" | "added" | "deleted" | "renamed" | "untracked" | "ignored" | "conflicted";
  staged: boolean;
  oldPath?: string;
  additions: number;
  deletions: number;
}

export interface GitBranch {
  name: string;
  isCurrent: boolean;
  isRemote: boolean;
  upstream?: string;
  ahead: number;
  behind: number;
}

export interface GitCommit {
  hash: string;
  shortHash: string;
  author: { name: string; email: string; date: Date };
  message: string;
  subject: string;
  body?: string;
}

export interface SettingsSection {
  id: string;
  label: string;
  icon: React.ReactNode;
  children: SettingsItem[];
}

export interface SettingsItem {
  id: string;
  label: string;
  description?: string;
  type: "toggle" | "select" | "input" | "number" | "color" | "keybinding" | "action";
  value: any;
  options?: { label: string; value: any }[];
  onChange: (value: any) => void;
  requiresRestart?: boolean;
}