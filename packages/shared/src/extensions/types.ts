import { z } from "zod";
import { ProviderAdapter } from "../providers/types.js";
import { AgentTool } from "../agents/types.js";

/**
 * Extension and plugin system types.
 */

export type DocumentSelector = string | { pattern: string; scheme?: string } | { language: string; scheme?: string };

export const ExtensionKindSchema = z.enum([
  "theme",
  "language",
  "debugger",
  "formatter",
  "linter",
  "ai-provider",
  "ai-model",
  "tool",
  "command",
  "view",
  "keymap",
  "snippet",
  "template",
  "integration",
  "other",
]);

export type ExtensionKind = z.infer<typeof ExtensionKindSchema>;

export const ExtensionPermissionSchema = z.enum([
  "filesystem.read",
  "filesystem.write",
  "filesystem.delete",
  "process.execute",
  "network.request",
  "network.listen",
  "git.read",
  "git.write",
  "github.read",
  "github.write",
  "terminal.read",
  "terminal.write",
  "settings.read",
  "settings.write",
  "credentials.read",
  "credentials.write",
  "workspace.read",
  "workspace.write",
  "ai.providers",
  "ai.models",
  "ai.chat",
  "ai.agents",
  "notifications",
  "clipboard.read",
  "clipboard.write",
]);

export type ExtensionPermission = z.infer<typeof ExtensionPermissionSchema>;

export const ExtensionManifestSchema = z.object({
  name: z.string(),
  displayName: z.string(),
  description: z.string(),
  version: z.string(),
  publisher: z.string(),
  repository: z.string().url().optional(),
  license: z.string().optional(),
  categories: z.array(ExtensionKindSchema).default([]),
  keywords: z.array(z.string()).default([]),
  icon: z.string().optional(),
  galleryBanner: z.object({
    color: z.string(),
    theme: z.enum(["light", "dark"]),
  }).optional(),
  engines: z.object({
    valve: z.string().default("^0.1.0"),
  }).default({}),
  main: z.string().optional(),
  browser: z.string().optional(),
  contributes: z.object({
    configuration: z.object({
      title: z.string(),
      properties: z.record(z.object({
        type: z.enum(["string", "number", "boolean", "array", "object"]),
        default: z.unknown().optional(),
        description: z.string().optional(),
        enum: z.array(z.unknown()).optional(),
        enumDescriptions: z.array(z.string()).optional(),
      })),
    }).optional(),
    commands: z.array(z.object({
      command: z.string(),
      title: z.string(),
      category: z.string().optional(),
      icon: z.string().optional(),
      enablement: z.string().optional(),
    })).default([]),
    menus: z.record(z.array(z.object({
      command: z.string(),
      when: z.string().optional(),
      group: z.string().optional(),
      alt: z.string().optional(),
    }))).default({}),
    keybindings: z.array(z.object({
      key: z.string(),
      command: z.string(),
      when: z.string().optional(),
      mac: z.string().optional(),
      linux: z.string().optional(),
      win: z.string().optional(),
    })).default([]),
    languages: z.array(z.object({
      id: z.string(),
      aliases: z.array(z.string()),
      extensions: z.array(z.string()),
      filenames: z.array(z.string()).optional(),
      firstLine: z.string().optional(),
      configuration: z.string().optional(),
    })).default([]),
    grammars: z.array(z.object({
      language: z.string(),
      scopeName: z.string(),
      path: z.string(),
      embeddedLanguages: z.record(z.string()).optional(),
      tokenTypes: z.record(z.string()).optional(),
    })).default([]),
    themes: z.array(z.object({
      label: z.string(),
      uiTheme: z.enum(["vs", "vs-dark", "hc-black", "hc-light"]),
      path: z.string(),
    })).default([]),
    debuggers: z.array(z.object({
      type: z.string(),
      label: z.string(),
      languages: z.array(z.string()).optional(),
      configurationAttributes: z.object({
        launch: z.object({
          properties: z.record(z.unknown()),
        }),
        attach: z.object({
          properties: z.record(z.unknown()),
        }),
      }).optional(),
    })).default([]),
    aiProviders: z.array(z.object({
      id: z.string(),
      name: z.string(),
      type: z.string(),
      configSchema: z.record(z.unknown()),
    })).default([]),
    aiModels: z.array(z.object({
      id: z.string(),
      provider: z.string(),
      displayName: z.string(),
      capabilities: z.array(z.string()),
    })).default([]),
    agentTools: z.array(z.object({
      name: z.string(),
      description: z.string(),
      parameters: z.record(z.unknown()),
      requiredPermissions: z.array(ExtensionPermissionSchema),
    })).default([]),
    views: z.object({
      explorer: z.array(z.object({
        id: z.string(),
        name: z.string(),
        icon: z.string().optional(),
        when: z.string().optional(),
      })).default([]),
      ai: z.array(z.object({
        id: z.string(),
        name: z.string(),
        icon: z.string().optional(),
        when: z.string().optional(),
      })).default([]),
      debug: z.array(z.object({
        id: z.string(),
        name: z.string(),
        icon: z.string().optional(),
        when: z.string().optional(),
      })).default([]),
      panel: z.array(z.object({
        id: z.string(),
        name: z.string(),
        icon: z.string().optional(),
        when: z.string().optional(),
      })).default([]),
    }).optional(),
    viewsContainers: z.object({
      activitybar: z.array(z.object({
        id: z.string(),
        title: z.string(),
        icon: z.string(),
      })).default([]),
      panel: z.array(z.object({
        id: z.string(),
        title: z.string(),
        icon: z.string(),
      })).default([]),
    }).optional(),
    problemMatchers: z.array(z.object({
      name: z.string(),
      owner: z.string(),
      pattern: z.string(),
      regexp: z.string(),
      file: z.string().optional(),
      line: z.string().optional(),
      column: z.string().optional(),
      severity: z.string().optional(),
      message: z.string().optional(),
      code: z.string().optional(),
    })).default([]),
    taskDefinitions: z.array(z.object({
      type: z.string(),
      required: z.array(z.string()).optional(),
      properties: z.record(z.unknown()),
    })).default([]),
    snippets: z.array(z.object({
      language: z.string(),
      path: z.string(),
    })).default([]),
    projectTemplates: z.array(z.object({
      id: z.string(),
      name: z.string(),
      description: z.string(),
      path: z.string(),
      icon: z.string().optional(),
    })).default([]),
  }).optional(),
  activationEvents: z.array(z.string()).default(["*"]),
  capabilities: z.object({
    untrustedWorkspaces: z.object({
      supported: z.boolean().default(false),
    }).optional(),
    virtualWorkspaces: z.object({
      supported: z.boolean().default(false),
    }).optional(),
  }).optional(),
  scripts: z.object({
    vscode: z.string().optional(),
    compile: z.string().optional(),
    watch: z.string().optional(),
    test: z.string().optional(),
    lint: z.string().optional(),
    package: z.string().optional(),
  }).optional(),
  devDependencies: z.record(z.string()).default({}),
  dependencies: z.record(z.string()).default({}),
});

export type ExtensionManifest = z.infer<typeof ExtensionManifestSchema>;

export const ExtensionStateSchema = z.enum(["uninstalled", "installing", "installed", "activating", "active", "error", "disabled", "updating"]);
export type ExtensionState = z.infer<typeof ExtensionStateSchema>;

export const ExtensionInfoSchema = z.object({
  manifest: ExtensionManifestSchema,
  state: ExtensionStateSchema,
  path: z.string(),
  installPath: z.string(),
  isBuiltin: z.boolean().default(false),
  isLocal: z.boolean().default(false),
  enabled: z.boolean().default(true),
  error: z.string().optional(),
  activatedAt: z.string().datetime().optional(),
  lastError: z.string().optional(),
  exports: z.record(z.unknown()).default({}),
});

export type ExtensionInfo = z.infer<typeof ExtensionInfoSchema>;

export const ExtensionHostConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.enum(["node", "worker", "sandboxed"]),
  entryPoint: z.string(),
  permissions: z.array(ExtensionPermissionSchema).default([]),
  resourceLimits: z.object({
    maxMemoryMB: z.number().int().positive().default(512),
    maxCpuPercent: z.number().int().min(1).max(100).default(50),
    maxFileHandles: z.number().int().positive().default(1000),
  }).default({}),
  allowNetwork: z.boolean().default(false),
  allowedDomains: z.array(z.string()).default([]),
  allowedCommands: z.array(z.string()).default([]),
  env: z.record(z.string()).default({}),
});

export type ExtensionHostConfig = z.infer<typeof ExtensionHostConfigSchema>;

/**
 * Extension API - what extensions can access
 */
export interface ExtensionContext {
  readonly extensionId: string;
  readonly extensionPath: string;
  readonly storagePath: string;
  readonly globalStoragePath: string;
  readonly logPath: string;
  readonly subscriptions: { dispose(): void }[];
  readonly workspaceState: Memento;
  readonly globalState: Memento;
  readonly secrets: SecretStorage;
  readonly environmentVariableCollection: EnvironmentVariableCollection;
  readonly asAbsolutePath: (relativePath: string) => string;
}

export interface Memento {
  get<T>(key: string): T | undefined;
  get<T>(key: string, defaultValue: T): T;
  update(key: string, value: unknown): Promise<void>;
  keys(): string[];
}

export interface SecretStorage {
  get(key: string): Promise<string | undefined>;
  store(key: string, value: string): Promise<void>;
  delete(key: string): Promise<void>;
  onDidChange: (callback: (key: string) => void) => { dispose(): void };
}

export interface EnvironmentVariableCollection {
  get(name: string): string | undefined;
  forEach(callback: (name: string, value: string | undefined) => void): void;
  replace(variables: Record<string, string | undefined>): void;
  append(name: string, value: string): void;
  prepend(name: string, value: string): void;
  delete(name: string): void;
  persistent: boolean;
  description: string | undefined;
}

/**
 * Extension API surface
 */
export interface ExtensionAPI {
  // Workspace
  workspace: {
    readonly name: string | undefined;
    readonly workspaceFolders: readonly WorkspaceFolder[] | undefined;
    readonly rootPath: string | undefined;
    getConfiguration(section?: string): WorkspaceConfiguration;
    onDidChangeConfiguration: (callback: (e: ConfigurationChangeEvent) => void) => { dispose(): void };
    onDidChangeWorkspaceFolders: (callback: (e: WorkspaceFoldersChangeEvent) => void) => { dispose(): void };
    fs: FileSystem;
    findFiles(pattern: string, maxResults?: number): Promise<string[]>;
    saveAll(): Promise<boolean>;
  };
  
  // Window
  window: {
    activeTextEditor: TextEditor | undefined;
    visibleTextEditors: TextEditor[];
    activeTerminal: Terminal | undefined;
    terminals: Terminal[];
    createTerminal(options: TerminalOptions): Terminal;
    createOutputChannel(name: string, options?: { log: boolean }): OutputChannel;
    createStatusBarItem(alignment?: StatusBarAlignment, priority?: number): StatusBarItem;
    showInformationMessage(message: string, ...items: string[]): Promise<string | undefined>;
    showWarningMessage(message: string, ...items: string[]): Promise<string | undefined>;
    showErrorMessage(message: string, ...items: string[]): Promise<string | undefined>;
    showInputBox(options: InputBoxOptions): Promise<string | undefined>;
    showQuickPick<T extends QuickPickItem>(items: T[], options?: QuickPickOptions): Promise<T | undefined>;
    showOpenDialog(options: OpenDialogOptions): Promise<string[] | undefined>;
    showSaveDialog(options: SaveDialogOptions): Promise<string | undefined>;
    withProgress<R>(options: ProgressOptions, task: (progress: Progress<{ message?: string; increment?: number }>) => Promise<R>): Promise<R>;
    setStatusBarMessage(text: string, hideAfter?: number): { dispose(): void };
    registerTreeDataProvider(viewId: string, provider: TreeDataProvider<any>): { dispose(): void };
    registerWebviewViewProvider(viewId: string, provider: WebviewViewProvider): { dispose(): void };
  };
  
  // Commands
  commands: {
    executeCommand<T>(command: string, ...args: unknown[]): Promise<T | undefined>;
    registerCommand(command: string, callback: (...args: unknown[]) => unknown, thisArg?: unknown): { dispose(): void };
    getCommands(filterInternal?: boolean): Promise<string[]>;
  };
  
  // Languages
  languages: {
    registerCompletionItemProvider(selector: DocumentSelector, provider: CompletionItemProvider, ...triggerCharacters: string[]): { dispose(): void };
    registerHoverProvider(selector: DocumentSelector, provider: HoverProvider): { dispose(): void };
    registerDefinitionProvider(selector: DocumentSelector, provider: DefinitionProvider): { dispose(): void };
    registerDocumentFormattingEditProvider(selector: DocumentSelector, provider: DocumentFormattingEditProvider): { dispose(): void };
    registerCodeActionsProvider(selector: DocumentSelector, provider: CodeActionProvider): { dispose(): void };
    registerDocumentSymbolProvider(selector: DocumentSelector, provider: DocumentSymbolProvider): { dispose(): void };
    createDiagnosticCollection(name?: string): DiagnosticCollection;
    setLanguageConfiguration(language: string, configuration: LanguageConfiguration): { dispose(): void };
  };
  
  // Debug
  debug: {
    registerDebugConfigurationProvider(debugType: string, provider: DebugConfigurationProvider): { dispose(): void };
    registerDebugAdapterTrackerFactory(debugType: string, factory: DebugAdapterTrackerFactory): { dispose(): void };
    startDebugging(folder: WorkspaceFolder | undefined, nameOrConfig: string | DebugConfiguration): Promise<boolean>;
    onDidStartDebugSession: (callback: (session: DebugSession) => void) => { dispose(): void };
    onDidTerminateDebugSession: (callback: (session: DebugSession) => void) => { dispose(): void };
  };
  
  // Tasks
  tasks: {
    registerTaskProvider(type: string, provider: TaskProvider): { dispose(): void };
    executeTask(task: Task): Promise<TaskExecution>;
    onDidStartTask: (callback: (execution: TaskExecution) => void) => { dispose(): void };
    onDidEndTask: (callback: (execution: TaskExecution) => void) => { dispose(): void };
  };
  
  // Extensions
  extensions: {
    getExtension(extensionId: string): Extension<any> | undefined;
    all: Extension<any>[];
    onDidChange: (callback: (e: ExtensionChangeEvent) => void) => { dispose(): void };
  };
  
  // AI-specific APIs
  ai: {
    getModelRegistry(): ModelRegistryAPI;
    getProviderRegistry(): ProviderRegistryAPI;
    getAgentRuntime(): AgentRuntimeAPI;
    registerProvider(adapter: ProviderAdapter): { dispose(): void };
    registerTool(tool: AgentTool): { dispose(): void };
    registerAgent(config: any): { dispose(): void };
    onChatMessage: (callback: (message: any) => void) => { dispose(): void };
  };
  
  // Git
  git: {
    getRepository(path: string): Repository | undefined;
    repositories: Repository[];
    onDidOpenRepository: (callback: (repo: Repository) => void) => { dispose(): void };
    onDidCloseRepository: (callback: (repo: Repository) => void) => { dispose(): void };
  };
  
  // Terminal
  terminal: {
    createTerminal(options: TerminalOptions): Terminal;
    terminals: Terminal[];
    onDidOpenTerminal: (callback: (terminal: Terminal) => void) => { dispose(): void };
    onDidCloseTerminal: (callback: (terminal: Terminal) => void) => { dispose(): void };
  };
  
  // Utility
  env: NodeJS.ProcessEnv;
  uri: URI;
  Disposable: { new(): { dispose(): void } };
  EventEmitter: { new<T>(): { event: Event<T>; fire(data: T): void; dispose(): void } };
}

// Supporting types (simplified for brevity)
export interface WorkspaceFolder { uri: string; name: string; index: number; }
export interface WorkspaceConfiguration { get<T>(section: string): T | undefined; update(section: string, value: unknown, configurationTarget?: number): Promise<void>; }
export interface ConfigurationChangeEvent { affectsConfiguration(section: string): boolean; }
export interface WorkspaceFoldersChangeEvent { added: WorkspaceFolder[]; removed: WorkspaceFolder[]; changed: WorkspaceFolder[]; }
export interface FileSystem { readFile(uri: string): Promise<Uint8Array>; writeFile(uri: string, content: Uint8Array): Promise<void>; delete(uri: string, options?: { recursive?: boolean }): Promise<void>; createDirectory(uri: string): Promise<void>; stat(uri: string): Promise<FileStat>; readDirectory(uri: string): Promise<[string, FileType][]>; }
export interface FileStat { type: FileType; ctime: number; mtime: number; size: number; }
export type FileType = 1 | 2 | 4 | 8 | 16; // File, Directory, SymbolicLink, Unknown
export interface TextEditor { document: TextDocument; selection: Selection; selections: Selection[]; options: TextEditorOptions; edit(callback: (editBuilder: TextEditorEdit) => void): Promise<boolean>; }
export interface TextDocument { uri: string; fileName: string; isUntitled: boolean; languageId: string; version: number; lineCount: number; getText(range?: Range): string; lineAt(line: number): TextLine; }
export interface Selection { anchor: Position; active: Position; isEmpty: boolean; isReversed: boolean; }
export interface Position { line: number; character: number; }
export interface Range { start: Position; end: Position; }
export interface TextLine { lineNumber: number; text: string; range: Range; rangeIncludingLineBreak: Range; firstNonWhitespaceCharacterIndex: number; isEmptyOrWhitespace: boolean; }
export interface TextEditorOptions { tabSize: number; insertSpaces: boolean; cursorStyle: string; }
export interface TextEditorEdit { insert(position: Position, text: string): void; delete(range: Range): void; replace(range: Range, text: string): void; }
export interface Terminal { name: string; processId: Promise<number | null>; creationOptions: TerminalOptions; sendText(text: string, addNewLine?: boolean): void; show(preserveFocus?: boolean): void; hide(): void; dispose(): void; }
export interface TerminalOptions { name?: string; shellPath?: string; shellArgs?: string[]; env?: Record<string, string>; cwd?: string; }
export interface OutputChannel { name: string; append(value: string): void; appendLine(value: string): void; replace(value: string): void; show(preserveFocus?: boolean): void; hide(): void; dispose(): void; }
export type StatusBarAlignment = "left" | "right";
export interface StatusBarItem { alignment: StatusBarAlignment; priority: number; text: string; tooltip: string | undefined; color: string | undefined; command: string | undefined; show(): void; hide(): void; dispose(): void; }
export interface InputBoxOptions { prompt?: string; placeHolder?: string; value?: string; valueSelection?: [number, number]; password?: boolean; ignoreFocusOut?: boolean; validateInput?(value: string): string | undefined; }
export interface QuickPickItem { label: string; description?: string; detail?: string; picked?: boolean; alwaysShow?: boolean; }
export interface QuickPickOptions { canPickMany?: boolean; matchOnDescription?: boolean; matchOnDetail?: boolean; placeHolder?: string; onDidSelectItem?(item: QuickPickItem): void; }
export interface OpenDialogOptions { canSelectMany?: boolean; openLabel?: string; canSelectFiles?: boolean; canSelectFolders?: boolean; defaultUri?: string; filters?: Record<string, string[]>; }
export interface SaveDialogOptions { saveLabel?: string; defaultUri?: string; filters?: Record<string, string[]>; }
export interface ProgressOptions { location?: "window" | "notification" | "source"; title?: string; cancellable?: boolean; }
export interface Progress<T> { report(data: T): void; }
export interface TreeDataProvider<T> { getTreeItem(element: T): TreeItem | Promise<TreeItem>; getChildren(element?: T): ProviderResult<T[]>; }
export interface TreeItem { label: string; collapsibleState?: number; iconPath?: string | { light: string; dark: string }; command?: { command: string; title: string; arguments?: unknown[] }; contextValue?: string; }
export type ProviderResult<T> = T | Promise<T> | undefined | null;
export interface WebviewViewProvider { resolveWebviewView(webviewView: WebviewView, context: WebviewViewResolveContext): void; }
export interface WebviewView { webview: Webview; title: string; description: string; }
export interface WebviewViewResolveContext { }
export interface Webview { options: WebviewOptions; html: string; onDidReceiveMessage: (callback: (message: any) => void) => { dispose(): void }; postMessage(message: any): Promise<boolean>; asWebviewUri(localResource: string): string; }
export interface WebviewOptions { enableScripts?: boolean; localResourceRoots?: string[]; portMapping?: Record<string, string>; }
export interface CompletionItemProvider { provideCompletionItems(document: TextDocument, position: Position, token: CancellationToken, context: CompletionContext): ProviderResult<CompletionItem[]>; }
export interface CompletionItem { label: string; kind?: number; detail?: string; documentation?: string | { kind: string; value: string }; sortText?: string; filterText?: string; insertText?: string; range?: Range; command?: { command: string; title: string }; }
export interface CompletionContext { triggerKind: number; triggerCharacter?: string; }
export interface HoverProvider { provideHover(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Hover>; }
export interface Hover { contents: (string | { kind: string; value: string } | { language: string; value: string })[]; range?: Range; }
export interface DefinitionProvider { provideDefinition(document: TextDocument, position: Position, token: CancellationToken): ProviderResult<Definition>; }
export type Definition = Location | Location[];
export interface Location { uri: string; range: Range; }
export interface DocumentFormattingEditProvider { provideDocumentFormattingEdits(document: TextDocument, options: FormattingOptions, token: CancellationToken): ProviderResult<TextEdit[]>; }
export interface FormattingOptions { tabSize: number; insertSpaces: boolean; }
export interface TextEdit { range: Range; newText: string; }
export interface CodeActionProvider { provideCodeActions(document: TextDocument, range: Range, context: CodeActionContext, token: CancellationToken): ProviderResult<CodeAction[]>; }
export interface CodeActionContext { diagnostics: ExtensionDiagnostic[]; only?: number[]; triggerKind: number; }
export interface ExtensionDiagnostic { range: Range; message: string; severity: number; code?: string | number; source?: string; codeDescription?: { href: string }; relatedInformation?: DiagnosticRelatedInformation[]; }
export interface DiagnosticRelatedInformation { location: Location; message: string; }
export interface CodeAction { title: string; kind?: string; diagnostics?: ExtensionDiagnostic[]; edit?: WorkspaceEdit; command?: { command: string; title: string; arguments?: unknown[] }; isPreferred?: boolean; disabled?: boolean; }
export interface WorkspaceEdit { edits: Map<string, TextEdit[]>; }
export interface DocumentSymbolProvider { provideDocumentSymbols(document: TextDocument, token: CancellationToken): ProviderResult<SymbolInformation[]>; }
export interface SymbolInformation { name: string; kind: number; location: Location; containerName?: string; }
export interface DiagnosticCollection { name: string; set(uri: string, diagnostics: ExtensionDiagnostic[]): void; delete(uri: string): void; clear(): void; forEach(callback: (uri: string, diagnostics: ExtensionDiagnostic[], collection: DiagnosticCollection) => void): void; }
export interface LanguageConfiguration { comments?: { lineComment?: string; blockComment?: [string, string] }; brackets?: [string, string][]; wordPattern?: RegExp; indentationRules?: { increaseIndentPattern: RegExp; decreaseIndentPattern: RegExp }; onEnterRules?: { beforeText: RegExp; action: { indentAction: number; appendText?: string } }[]; }
export interface DebugConfigurationProvider { provideDebugConfigurations(folder: WorkspaceFolder | undefined, token: CancellationToken): ProviderResult<DebugConfiguration[]>; resolveDebugConfiguration(folder: WorkspaceFolder | undefined, config: DebugConfiguration, token: CancellationToken): ProviderResult<DebugConfiguration>; }
export interface DebugConfiguration { type: string; request: string; name: string; [key: string]: unknown; }
export interface DebugAdapterTrackerFactory { createDebugAdapterTracker(session: DebugSession): DebugAdapterTracker; }
export interface DebugAdapterTracker { onWillStartSession(): void; onWillStopSession(): void; onError(error: Error): void; onExit(code: number | undefined, signal: string | undefined): void; }
export interface DebugSession { id: string; name: string; type: string; configuration: DebugConfiguration; workspaceFolder: WorkspaceFolder | undefined; }
export interface TaskProvider { provideTasks(token: CancellationToken): ProviderResult<Task[]>; resolveTask(task: Task, token: CancellationToken): ProviderResult<Task>; }
export interface Task { type: string; label: string; command?: string; args?: string[]; options?: { cwd?: string; env?: Record<string, string> }; group?: { kind: "build" | "test"; isDefault?: boolean }; problemMatchers?: string[]; }
export interface TaskExecution { task: Task; processId: Promise<number | null>; terminate(): Promise<void>; }
export interface Extension<T> { id: string; extensionPath: string; isActive: boolean; packageJSON: any; exports: T; activate(): Promise<T>; }
export interface ExtensionChangeEvent { extension: Extension<any>; }
export interface Repository { rootUri: string; state: RepositoryState; }
export interface RepositoryState { HEAD: Branch | undefined; refs: Ref[]; remotes: Remote[]; workingTreeChanges: Change[]; indexChanges: Change[]; mergeChanges: Change[]; onDidChange: (callback: () => void) => { dispose(): void }; }
export interface Branch { name: string; upstream?: string; ahead?: number; behind?: number; }
export interface Ref { type: "head" | "remote-head" | "tag"; name: string; commit?: string; remote?: string; }
export interface Remote { name: string; fetchUrl?: string; pushUrl?: string; }
export interface Change { uri: string; originalUri?: string; status: number; renameUri?: string; }
export interface CancellationToken { isCancellationRequested: boolean; onCancellationRequested: (callback: () => void) => { dispose(): void }; }
export interface URI { fsPath: string; toString(): string; with(options: { scheme?: string; authority?: string; path?: string; query?: string; fragment?: string }): URI; }
export interface Event<T> { (listener: (e: T) => void, thisArgs?: unknown, disposables?: { dispose(): void }[]): { dispose(): void }; }
export interface ModelRegistryAPI { getModel(id: string): Promise<any>; getAllModels(): Promise<any[]>; search(query: string): Promise<any[]>; }
export interface ProviderRegistryAPI { getProvider(type: string): Promise<any>; getAllProviders(): Promise<any[]>; }
export interface AgentRuntimeAPI { startTask(task: any): Promise<any>; cancelTask(taskId: string): Promise<void>; }

/**
 * Extension host interface
 */
export interface ExtensionHost {
  start(config: ExtensionHostConfig): Promise<void>;
  stop(): Promise<void>;
  loadExtension(manifest: ExtensionManifest, path: string): Promise<ExtensionInfo>;
  unloadExtension(extensionId: string): Promise<void>;
  activateExtension(extensionId: string): Promise<void>;
  getExtension(extensionId: string): ExtensionInfo | undefined;
  getAllExtensions(): ExtensionInfo[];
  onExtensionChange(callback: (info: ExtensionInfo) => void): () => void;
}

/**
 * Extension manager interface
 */
export interface ExtensionManager {
  installFromVsix(vsixPath: string): Promise<ExtensionInfo>;
  installFromMarketplace(extensionId: string): Promise<ExtensionInfo>;
  uninstall(extensionId: string): Promise<void>;
  update(extensionId: string): Promise<ExtensionInfo>;
  enable(extensionId: string): Promise<void>;
  disable(extensionId: string): Promise<void>;
  getInstalled(): ExtensionInfo[];
  getUpdates(): Promise<ExtensionInfo[]>;
  checkForUpdates(): Promise<ExtensionInfo[]>;
}