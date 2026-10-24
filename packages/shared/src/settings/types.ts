import { z } from "zod";
import { ProviderConfig, ModelDefinition } from "../providers/types.js";
import { ProjectConfig, WorkspaceConfig } from "../workspace/types.js";
import { TerminalProfileSchema } from "../terminal/types.js";

/**
 * Settings and configuration types.
 */

export const ThemeSchema = z.enum(["dark", "light", "system", "high-contrast"]);
export type Theme = z.infer<typeof ThemeSchema>;

export const AccentColorSchema = z.enum(["violet", "blue", "green", "orange", "red", "pink", "cyan", "amber"]);
export type AccentColor = z.infer<typeof AccentColorSchema>;

export const DensitySchema = z.enum(["compact", "comfortable", "spacious"]);
export type Density = z.infer<typeof DensitySchema>;

export const EditorSettingsSchema = z.object({
  fontSize: z.number().int().positive().default(14),
  fontFamily: z.string().default("'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace"),
  fontWeight: z.number().int().min(100).max(900).default(400),
  lineHeight: z.number().min(1).max(3).default(1.6),
  letterSpacing: z.number().default(0),
  tabSize: z.number().int().positive().default(2),
  insertSpaces: z.boolean().default(true),
  detectIndentation: z.boolean().default(true),
  wordWrap: z.enum(["off", "on", "wordWrapColumn", "bounded"]).default("off"),
  wordWrapColumn: z.number().int().positive().default(120),
  minimap: z.boolean().default(true),
  lineNumbers: z.enum(["on", "off", "relative", "interval"]).default("on"),
  folding: z.boolean().default(true),
  matchBrackets: z.boolean().default(true),
  autoClosingBrackets: z.enum(["always", "languageDefined", "beforeWhitespace", "never"]).default("always"),
  autoClosingQuotes: z.enum(["always", "languageDefined", "beforeWhitespace", "never"]).default("always"),
  formatOnSave: z.boolean().default(false),
  formatOnPaste: z.boolean().default(false),
  formatOnType: z.boolean().default(false),
  cursorBlinking: z.enum(["blink", "smooth", "phase", "expand", "solid"]).default("blink"),
  cursorStyle: z.enum(["line", "block", "underline", "line-thin", "block-outline", "underline-thin"]).default("line"),
  smoothScrolling: z.boolean().default(true),
  scrollBeyondLastLine: z.boolean().default(true),
  renderWhitespace: z.enum(["none", "boundary", "selection", "trailing", "all"]).default("selection"),
  renderControlCharacters: z.boolean().default(false),
  glyphMargin: z.boolean().default(true),
  overviewRulerLanes: z.number().int().min(0).max(3).default(2),
  bracketPairColorization: z.boolean().default(true),
  guides: z.object({
    indentation: z.boolean().default(true),
    bracketPairs: z.boolean().default(true),
    bracketPairsHorizontal: z.boolean().default(false),
  }).default({}),
  hover: z.boolean().default(true),
  quickSuggestions: z.boolean().default(true),
  suggestOnTriggerCharacters: z.boolean().default(true),
  acceptSuggestionOnEnter: z.enum(["on", "smart", "off"]).default("on"),
  tabCompletion: z.enum(["on", "off", "onlySnippets"]).default("on"),
  parameterHints: z.boolean().default(true),
  inlineHints: z.boolean().default(true),
  codeLens: z.boolean().default(true),
  foldImportsByDefault: z.boolean().default(false),
  stickyScroll: z.boolean().default(true),
  experimental: z.record(z.unknown()).default({}),
});

export type EditorSettings = z.infer<typeof EditorSettingsSchema>;

export const AiSettingsSchema = z.object({
  defaultModel: z.string().optional(),
  defaultProvider: z.string().optional(),
  modelRoles: z.record(z.string()).default({}), // role -> modelId
  autoModelRouting: z.boolean().default(false),
  routingRules: z.array(z.object({
    name: z.string(),
    condition: z.string(), // Expression or natural language
    modelId: z.string(),
    priority: z.number().int().default(0),
    enabled: z.boolean().default(true),
  })).default([]),
  fallbackEnabled: z.boolean().default(true),
  fallbackModels: z.array(z.string()).default([]),
  contextInclusion: z.object({
    autoAttachOpenFiles: z.boolean().default(true),
    autoAttachGitDiff: z.boolean().default(true),
    autoAttachDiagnostics: z.boolean().default(true),
    autoAttachTerminalOutput: z.boolean().default(false),
    maxContextTokens: z.number().int().positive().default(100000),
    summarizeLongConversations: z.boolean().default(true),
    summaryThresholdTokens: z.number().int().positive().default(50000),
  }).default({}),
  agentPermissions: z.object({
    defaultPolicy: z.enum(["ask_every_time", "allow_workspace", "allow_specific", "deny"]).default("ask_every_time"),
    rules: z.array(z.object({
      category: z.string(),
      policy: z.enum(["ask_every_time", "allow_workspace", "allow_specific", "deny"]),
      allowedValues: z.array(z.string()).optional(),
    })).default([]),
  }).default({}),
  streamingEnabled: z.boolean().default(true),
  showTokenUsage: z.boolean().default(true),
  showCostEstimates: z.boolean().default(true),
  conversationHistoryLimit: z.number().int().positive().default(100),
  maxConversationTokens: z.number().int().positive().default(200000),
});

export type AiSettings = z.infer<typeof AiSettingsSchema>;

export const GitSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  autoFetch: z.boolean().default(true),
  autoFetchInterval: z.number().int().positive().default(180000), // 3 minutes
  signCommits: z.boolean().default(false),
  commitMessageTemplate: z.string().optional(),
  defaultBranch: z.string().default("main"),
  prDefaultBase: z.string().default("main"),
  rebaseOnPull: z.boolean().default(false),
  showInlineDiffs: z.boolean().default(true),
  maxDiffSize: z.number().int().positive().default(10000),
  blameAnnotation: z.boolean().default(false),
});

export type GitSettings = z.infer<typeof GitSettingsSchema>;

export const GitHubSettingsSchema = z.object({
  enabled: z.boolean().default(false),
  tokenRef: z.string().optional(), // Secure credential reference
  defaultOwner: z.string().optional(),
  defaultRepo: z.string().optional(),
  prReviewAutoAssign: z.boolean().default(false),
  issueAutoLink: z.boolean().default(true),
  notificationsEnabled: z.boolean().default(true),
});

export type GitHubSettings = z.infer<typeof GitHubSettingsSchema>;

export const TerminalSettingsSchema = z.object({
  defaultProfile: z.string().optional(),
  profiles: z.array(TerminalProfileSchema).default([]),
  copyOnSelect: z.boolean().default(true),
  rightClickBehavior: z.enum(["paste", "selectWord", "contextMenu"]).default("paste"),
  fastScrollSensitivity: z.number().default(5),
  scrollback: z.number().int().positive().default(10000),
  cursorBlink: z.boolean().default(true),
  cursorStyle: z.enum(["block", "underline", "bar"]).default("block"),
  fontSize: z.number().int().positive().default(13),
  fontFamily: z.string().default("'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace"),
  allowChords: z.boolean().default(true),
  windowsEnableConpty: z.boolean().default(true),
  macOptionIsMeta: z.boolean().default(false),
  linuxPty: z.boolean().default(true),
});

export type TerminalSettings = z.infer<typeof TerminalSettingsSchema>;

export const PrivacySettingsSchema = z.object({
  telemetryEnabled: z.boolean().default(false),
  crashReportsEnabled: z.boolean().default(true),
  usageStatsEnabled: z.boolean().default(false),
  aiDataRetentionDays: z.number().int().positive().default(30),
  conversationHistoryEnabled: z.boolean().default(true),
  localOnlyMode: z.boolean().default(false),
  excludePatterns: z.array(z.string()).default([".env*", "*.pem", "*.key", "secrets*", "credentials*", "*.secret"]),
  requireApprovalForExternalRequests: z.boolean().default(true),
  sanitizeLogs: z.boolean().default(true),
});

export type PrivacySettings = z.infer<typeof PrivacySettingsSchema>;

export const SecuritySettingsSchema = z.object({
  workspaceTrust: z.enum(["trust", "untrusted", "prompt"]).default("prompt"),
  allowedCommands: z.array(z.string()).default([]),
  deniedCommands: z.array(z.string()).default(["rm -rf /", "dd if=", "mkfs", "fdisk", "shutdown", "reboot", "passwd"]),
  requireApprovalFor: z.array(z.string()).default(["git push --force", "git push -f", "npm publish", "docker push", "kubectl apply", "terraform apply"]),
  secretDetectionEnabled: z.boolean().default(true),
  secretPatterns: z.array(z.string()).default([]),
  maxFileSizeForAi: z.number().int().positive().default(1000000), // 1MB
  sandboxAgentCommands: z.boolean().default(false),
});

export type SecuritySettings = z.infer<typeof SecuritySettingsSchema>;

export const KeyboardShortcutSchema = z.object({
  key: z.string(),
  command: z.string(),
  when: z.string().optional(),
  args: z.record(z.unknown()).optional(),
});

export type KeyboardShortcut = z.infer<typeof KeyboardShortcutSchema>;

export const KeybindingsSchema = z.object({
  shortcuts: z.array(KeyboardShortcutSchema).default([]),
  // Platform-specific overrides
  mac: z.array(KeyboardShortcutSchema).default([]),
  windows: z.array(KeyboardShortcutSchema).default([]),
  linux: z.array(KeyboardShortcutSchema).default([]),
});

export type Keybindings = z.infer<typeof KeybindingsSchema>;

export const AppearanceSettingsSchema = z.object({
  theme: ThemeSchema.default("dark"),
  accentColor: AccentColorSchema.default("violet"),
  density: DensitySchema.default("comfortable"),
  customCss: z.string().optional(),
  panelPositions: z.record(z.enum(["left", "right", "bottom", "hidden"])).default({
    explorer: "left",
    ai: "right",
    terminal: "bottom",
    git: "left",
    debug: "bottom",
    problems: "bottom",
    search: "left",
    extensions: "left",
  }),
  panelSizes: z.record(z.number().int().positive()).default({
    explorer: 300,
    ai: 400,
    terminal: 200,
    git: 300,
    debug: 300,
    problems: 200,
    search: 300,
    extensions: 300,
  }),
  showActivityBar: z.boolean().default(true),
  showStatusBar: z.boolean().default(true),
  showBreadcrumbs: z.boolean().default(true),
  showMinimap: z.boolean().default(true),
  tabStyle: z.enum(["default", "compact", "custom"]).default("default"),
  iconTheme: z.string().default("default"),
  windowControls: z.enum(["native", "custom", "hidden"]).default("native"),
  animationsEnabled: z.boolean().default(true),
  reducedMotion: z.boolean().default(false),
});

export type AppearanceSettings = z.infer<typeof AppearanceSettingsSchema>;

export const ExtensionsSettingsSchema = z.object({
  enabled: z.boolean().default(true),
  autoUpdate: z.boolean().default(true),
  installPath: z.string().optional(),
  enabledExtensions: z.array(z.string()).default([]),
  disabledExtensions: z.array(z.string()).default([]),
  trustedExtensions: z.array(z.string()).default([]),
  marketplaceUrl: z.string().url().default("https://marketplace.visualstudio.com/_apis/public/gallery"),
  galleryUrl: z.string().url().default("https://marketplace.visualstudio.com/_apis/public/gallery"),
});

export type ExtensionsSettings = z.infer<typeof ExtensionsSettingsSchema>;

export const UsageSettingsSchema = z.object({
  budgets: z.object({
    daily: z.number().positive().optional(),
    monthly: z.number().positive().optional(),
    perProvider: z.record(z.number().positive()).default({}),
    perProject: z.record(z.number().positive()).default({}),
    perAgent: z.record(z.number().positive()).default({}),
  }).default({}),
  alerts: z.object({
    dailyThreshold: z.number().min(0).max(1).default(0.8),
    monthlyThreshold: z.number().min(0).max(1).default(0.8),
    perRequestThreshold: z.number().positive().optional(),
    enabled: z.boolean().default(true),
  }).default({}),
  exportFormat: z.enum(["json", "csv", "xlsx"]).default("json"),
  retentionDays: z.number().int().positive().default(365),
});

export type UsageSettings = z.infer<typeof UsageSettingsSchema>;

export const ApplicationSettingsSchema = z.object({
  version: z.number().int().positive().default(1),
  editor: EditorSettingsSchema.default({}),
  ai: AiSettingsSchema.default({}),
  git: GitSettingsSchema.default({}),
  github: GitHubSettingsSchema.default({}),
  terminal: TerminalSettingsSchema.default({}),
  privacy: PrivacySettingsSchema.default({}),
  security: SecuritySettingsSchema.default({}),
  appearance: AppearanceSettingsSchema.default({}),
  extensions: ExtensionsSettingsSchema.default({}),
  usage: UsageSettingsSchema.default({}),
  keybindings: KeybindingsSchema.default({}),
  // Workspace-specific settings (merged with user settings)
  workspace: z.record(z.unknown()).default({}),
  // Project-specific settings (merged with workspace settings)
  project: z.record(z.unknown()).default({}),
});

export type ApplicationSettings = z.infer<typeof ApplicationSettingsSchema>;

export interface SettingsService {
  getSettings(): Promise<ApplicationSettings>;
  getSettingsForScope(scope: "user" | "workspace" | "project"): Promise<Partial<ApplicationSettings>>;
  updateSettings(updates: Partial<ApplicationSettings>, scope?: "user" | "workspace" | "project"): Promise<ApplicationSettings>;
  resetSettings(scope?: "user" | "workspace" | "project"): Promise<void>;
  importSettings(data: string, format: "json"): Promise<void>;
  exportSettings(format: "json"): Promise<string>;
  onSettingsChange(callback: (settings: ApplicationSettings) => void): () => void;
}

export interface CredentialStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  list(prefix?: string): Promise<string[]>;
  // For providers
  getProviderCredentials(providerId: string): Promise<Record<string, string> | null>;
  setProviderCredentials(providerId: string, credentials: Record<string, string>): Promise<void>;
  deleteProviderCredentials(providerId: string): Promise<void>;
}