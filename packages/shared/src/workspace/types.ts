import { z } from "zod";

/**
 * Workspace and project management types.
 */

export const ProjectTypeSchema = z.enum([
  "node",
  "python",
  "java",
  "go",
  "rust",
  "cpp",
  "csharp",
  "php",
  "ruby",
  "swift",
  "kotlin",
  "typescript",
  "generic",
]);

export type ProjectType = z.infer<typeof ProjectTypeSchema>;

export const ProjectConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  rootPath: z.string(),
  type: ProjectTypeSchema,
  buildCommand: z.string().optional(),
  runCommand: z.string().optional(),
  testCommand: z.string().optional(),
  lintCommand: z.string().optional(),
  devCommand: z.string().optional(),
  installCommand: z.string().optional(),
  envFile: z.string().optional(),
  excludedPaths: z.array(z.string()).default(["node_modules", ".git", "dist", "build", ".next", "target"]),
  includedPaths: z.array(z.string()).default([]),
  settings: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  lastOpenedAt: z.string().datetime().optional(),
});

export type ProjectConfig = z.infer<typeof ProjectConfigSchema>;

export const WorkspaceConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  projects: z.array(z.string()).default([]), // Project IDs
  activeProjectId: z.string().optional(),
  settings: z.record(z.unknown()).default({}),
  layout: z.record(z.unknown()).default({}),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

export type WorkspaceConfig = z.infer<typeof WorkspaceConfigSchema>;

export const FileSystemEntrySchema = z.object({
  path: z.string(),
  name: z.string(),
  type: z.enum(["file", "directory", "symlink"]),
  size: z.number().int().nonnegative().optional(),
  modifiedAt: z.string().datetime().optional(),
  isHidden: z.boolean().default(false),
  isBinary: z.boolean().default(false),
  language: z.string().optional(),
  gitStatus: z.enum(["unmodified", "modified", "added", "deleted", "renamed", "untracked", "ignored", "conflicted"]).optional(),
});

export type FileSystemEntry = z.infer<typeof FileSystemEntrySchema>;

export const EditorTabSchema = z.object({
  id: z.string(),
  filePath: z.string(),
  label: z.string(),
  isDirty: z.boolean().default(false),
  isActive: z.boolean().default(false),
  language: z.string().optional(),
  encoding: z.string().default("utf-8"),
  lineEnding: z.enum(["lf", "crlf"]).default("lf"),
  cursorPosition: z.object({
    line: z.number().int().positive(),
    column: z.number().int().positive(),
  }).optional(),
  selection: z.object({
    startLine: z.number().int().positive(),
    startColumn: z.number().int().positive(),
    endLine: z.number().int().positive(),
    endColumn: z.number().int().positive(),
  }).optional(),
  scrollPosition: z.object({
    top: z.number().int().nonnegative(),
    left: z.number().int().nonnegative(),
  }).optional(),
});

export type EditorTab = z.infer<typeof EditorTabSchema>;

export const SearchResultSchema = z.object({
  file: z.string(),
  line: z.number().int().positive(),
  column: z.number().int().positive(),
  match: z.string(),
  contextBefore: z.string().optional(),
  contextAfter: z.string().optional(),
  language: z.string().optional(),
});

export type SearchResult = z.infer<typeof SearchResultSchema>;

export const SymbolIndexEntrySchema = z.object({
  name: z.string(),
  kind: z.enum(["function", "class", "interface", "type", "variable", "constant", "method", "property", "module", "namespace", "enum", "struct", "trait", "protocol"]),
  file: z.string(),
  line: z.number().int().positive(),
  column: z.number().int().positive(),
  signature: z.string(),
  documentation: z.string().optional(),
  container: z.string().optional(), // Class/namespace containing this symbol
  references: z.number().int().nonnegative().default(0),
});

export type SymbolIndexEntry = z.infer<typeof SymbolIndexEntrySchema>;

export const ProjectIndexSchema = z.object({
  projectId: z.string(),
  version: z.number().int().positive(),
  files: z.array(z.object({
    path: z.string(),
    hash: z.string(),
    language: z.string(),
    size: z.number().int().nonnegative(),
    symbols: z.array(SymbolIndexEntrySchema),
    imports: z.array(z.string()),
    exports: z.array(z.string()),
    modifiedAt: z.string().datetime(),
  })),
  dependencies: z.record(z.array(z.string())), // file -> imported files
  entryPoints: z.array(z.string()),
  lastIndexedAt: z.string().datetime(),
});

export type ProjectIndex = z.infer<typeof ProjectIndexSchema>;

export const ContextItemSchema = z.object({
  id: z.string(),
  type: z.enum(["file", "folder", "selection", "git-diff", "terminal-output", "diagnostics", "symbol", "summary", "custom"]),
  label: z.string(),
  description: z.string().optional(),
  content: z.string().optional(),
  path: z.string().optional(),
  lineRange: z.object({ start: z.number().int().positive(), end: z.number().int().positive() }).optional(),
  tokens: z.number().int().nonnegative().optional(),
  priority: z.number().int().default(0), // Higher = more important
  included: z.boolean().default(true),
  metadata: z.record(z.unknown()).default({}),
});

export type ContextItem = z.infer<typeof ContextItemSchema>;

export const ContextBundleSchema = z.object({
  id: z.string(),
  items: z.array(ContextItemSchema),
  totalTokens: z.number().int().nonnegative(),
  maxTokens: z.number().int().positive(),
  modelId: z.string().optional(),
  createdAt: z.string().datetime(),
});

export type ContextBundle = z.infer<typeof ContextBundleSchema>;

export interface WorkspaceService {
  getWorkspaces(): Promise<WorkspaceConfig[]>;
  createWorkspace(config: Omit<WorkspaceConfig, "id" | "createdAt" | "updatedAt">): Promise<WorkspaceConfig>;
  updateWorkspace(id: string, updates: Partial<WorkspaceConfig>): Promise<WorkspaceConfig>;
  deleteWorkspace(id: string): Promise<void>;
  getProjects(workspaceId: string): Promise<ProjectConfig[]>;
  addProject(workspaceId: string, config: Omit<ProjectConfig, "id" | "createdAt" | "updatedAt">): Promise<ProjectConfig>;
  removeProject(workspaceId: string, projectId: string): Promise<void>;
  setActiveProject(workspaceId: string, projectId: string): Promise<void>;
}

export interface ProjectService {
  getProject(id: string): Promise<ProjectConfig | undefined>;
  updateProject(id: string, updates: Partial<ProjectConfig>): Promise<ProjectConfig>;
  detectProjectType(rootPath: string): Promise<ProjectType>;
  getFileTree(rootPath: string, options?: { depth?: number; ignore?: string[] }): Promise<FileSystemEntry[]>;
  readFile(path: string): Promise<string>;
  writeFile(path: string, content: string): Promise<void>;
  deleteFile(path: string): Promise<void>;
  renameFile(oldPath: string, newPath: string): Promise<void>;
  createDirectory(path: string): Promise<void>;
  searchFiles(rootPath: string, query: string, options?: { pattern?: string; maxResults?: number }): Promise<SearchResult[]>;
  getSymbols(rootPath: string, query?: string): Promise<SymbolIndexEntry[]>;
}

export interface IndexingService {
  indexProject(projectId: string): Promise<ProjectIndex>;
  getIndex(projectId: string): Promise<ProjectIndex | undefined>;
  updateFile(projectId: string, filePath: string): Promise<void>;
  removeFile(projectId: string, filePath: string): Promise<void>;
  searchSymbols(projectId: string, query: string): Promise<SymbolIndexEntry[]>;
  findReferences(projectId: string, symbolName: string, filePath?: string): Promise<SymbolIndexEntry[]>;
}

export interface ContextService {
  createBundle(items: ContextItem[], modelId?: string): Promise<ContextBundle>;
  estimateTokens(text: string, modelId?: string): number;
  pruneBundle(bundle: ContextBundle, maxTokens: number): ContextBundle;
  summarizeBundle(bundle: ContextBundle, modelId: string): Promise<ContextBundle>;
}