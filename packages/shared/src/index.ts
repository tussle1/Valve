/**
 * Valve IDE - Shared Types
 * 
 * Core type definitions shared across frontend, backend, and extensions.
 * This package contains all the TypeScript interfaces and Zod schemas
 * for the Universal AI Provider system, Agent runtime, Workspace management,
 * Git integration, Terminal, Settings, and Extension system.
 */

// Provider types
export * from "./providers/types.js";

// Agent types
export * from "./agents/types.js";

// Workspace types (excluding SearchResult which is also in agents)
export type { 
  WorkspaceConfig,
  ProjectConfig,
  FileSystemEntry,
  EditorTab,
  SymbolIndexEntry,
  ProjectIndex,
  ContextItem,
  ContextBundle,
  WorkspaceService,
  ProjectService,
  IndexingService,
  ContextService,
} from "./workspace/types.js";

export { 
  WorkspaceConfigSchema,
  ProjectConfigSchema,
  FileSystemEntrySchema,
  EditorTabSchema,
  SearchResultSchema,
  SymbolIndexEntrySchema,
  ProjectIndexSchema,
  ContextItemSchema,
  ContextBundleSchema,
} from "./workspace/types.js";

// Git types
export * from "./git/types.js";

// Terminal types
export * from "./terminal/types.js";

// Settings types
export * from "./settings/types.js";

// Extension types
export * from "./extensions/types.js";

// Re-export commonly used Zod for validation
export { z } from "zod";

// Resolve duplicate exports by re-exporting with explicit types
export type { SearchResult as AgentSearchResult } from "./agents/types.js";
export type { Diagnostic as AgentDiagnostic } from "./agents/types.js";