import { z } from "zod";

/**
 * Integrated terminal types.
 */

export const ShellTypeSchema = z.enum(["bash", "zsh", "fish", "powershell", "cmd", "pwsh", "nu", "elvish"]);
export type ShellType = z.infer<typeof ShellTypeSchema>;

export const TerminalProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  shell: ShellTypeSchema,
  command: z.string().optional(),
  args: z.array(z.string()).default([]),
  env: z.record(z.string()).default({}),
  cwd: z.string().optional(),
  icon: z.string().optional(),
  color: z.string().optional(),
  fontSize: z.number().int().positive().optional(),
  fontFamily: z.string().optional(),
  cursorStyle: z.enum(["block", "underline", "bar"]).default("block"),
  cursorBlink: z.boolean().default(true),
  scrollback: z.number().int().positive().default(10000),
  bellStyle: z.enum(["none", "visual", "sound", "both"]).default("visual"),
  default: z.boolean().default(false),
});

export type TerminalProfile = z.infer<typeof TerminalProfileSchema>;

export const TerminalInstanceSchema = z.object({
  id: z.string(),
  profileId: z.string(),
  title: z.string(),
  cwd: z.string(),
  pid: z.number().int().positive().optional(),
  status: z.enum(["starting", "running", "exited", "error"]).default("starting"),
  exitCode: z.number().int().nullable(),
  createdAt: z.string().datetime(),
  lastActivityAt: z.string().datetime(),
  cols: z.number().int().positive().default(80),
  rows: z.number().int().positive().default(24),
  scrollPosition: z.number().int().nonnegative().default(0),
  metadata: z.record(z.unknown()).default({}),
});

export type TerminalInstance = z.infer<typeof TerminalInstanceSchema>;

export const TerminalOutputSchema = z.object({
  instanceId: z.string(),
  data: z.string(),
  timestamp: z.string().datetime(),
  type: z.enum(["stdout", "stderr", "system", "prompt"]).default("stdout"),
});

export type TerminalOutput = z.infer<typeof TerminalOutputSchema>;

export const TerminalCommandSchema = z.object({
  id: z.string(),
  instanceId: z.string(),
  command: z.string(),
  cwd: z.string(),
  startTime: z.string().datetime(),
  endTime: z.string().datetime().optional(),
  exitCode: z.number().int().nullable(),
  durationMs: z.number().int().nullable(),
  source: z.enum(["user", "agent", "task", "system"]).default("user"),
  approved: z.boolean().nullable(),
  approvalRequestId: z.string().optional(),
});

export type TerminalCommand = z.infer<typeof TerminalCommandSchema>;

export const TerminalTaskSchema = z.object({
  id: z.string(),
  name: z.string(),
  command: z.string(),
  args: z.array(z.string()).default([]),
  cwd: z.string(),
  env: z.record(z.string()).default({}),
  profileId: z.string().optional(),
  dependsOn: z.array(z.string()).default([]),
  problemMatcher: z.array(z.object({
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
  group: z.enum(["build", "test", "none"]).default("none"),
  presentation: z.object({
    echo: z.boolean().default(true),
    reveal: z.enum(["always", "silent", "never"]).default("always"),
    focus: z.boolean().default(false),
    panel: z.enum(["shared", "dedicated", "new"]).default("shared"),
    showReuseMessage: z.boolean().default(true),
    clear: z.boolean().default(false),
  }).default({}),
  runOptions: z.object({
    reevaluateOnRerun: z.boolean().default(false),
    instanceLimit: z.number().int().positive().optional(),
  }).default({}),
});

export type TerminalTask = z.infer<typeof TerminalTaskSchema>;

export interface TerminalService {
  createInstance(profileId: string, options?: { cwd?: string; env?: Record<string, string>; cols?: number; rows?: number }): Promise<TerminalInstance>;
  getInstance(id: string): TerminalInstance | undefined;
  getInstances(): TerminalInstance[];
  resizeInstance(id: string, cols: number, rows: number): Promise<void>;
  writeToInstance(id: string, data: string): Promise<void>;
  killInstance(id: string, signal?: string): Promise<void>;
  closeInstance(id: string): Promise<void>;
  
  // Profiles
  getProfiles(): TerminalProfile[];
  getDefaultProfile(): TerminalProfile | undefined;
  createProfile(profile: Omit<TerminalProfile, "id">): TerminalProfile;
  updateProfile(id: string, updates: Partial<TerminalProfile>): TerminalProfile;
  deleteProfile(id: string): void;
  
  // Tasks
  getTasks(): TerminalTask[];
  runTask(taskId: string, instanceId?: string): Promise<TerminalInstance>;
  
  // Events
  onOutput(callback: (output: TerminalOutput) => void): () => void;
  onInstanceChange(callback: (instance: TerminalInstance) => void): () => void;
  onCommandComplete(callback: (command: TerminalCommand) => void): () => void;
}

export interface TerminalProcess {
  readonly id: string;
  readonly pid: number;
  readonly cwd: string;
  
  write(data: string): void;
  resize(cols: number, rows: number): void;
  kill(signal?: string): Promise<void>;
  onExit(callback: (code: number | null, signal: string | null) => void): void;
  onData(callback: (data: string) => void): void;
}