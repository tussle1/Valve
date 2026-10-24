import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatBytes(bytes: number, decimals = 2): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ["Bytes", "KB", "MB", "GB", "TB", "PB", "EB", "ZB", "YB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + " " + sizes[i];
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  return `${Math.floor(ms / 3600000)}h ${Math.floor((ms % 3600000) / 60000)}m`;
}

export function formatDate(date: Date | string, options?: Intl.DateTimeFormatOptions): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    ...options,
  });
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const now = new Date();
  const diffMs = now.getTime() - d.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);
  
  if (diffSecs < 60) return "just now";
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return formatDate(d);
}

export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 3) + "...";
}

export function getFileLanguage(filename: string): string {
  const ext = filename.split(".").pop()?.toLowerCase();
  const languages: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    json: "json",
    html: "html",
    css: "css",
    scss: "scss",
    sass: "scss",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    kt: "kotlin",
    cpp: "cpp",
    c: "c",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    swift: "swift",
    lua: "lua",
    md: "markdown",
    txt: "plaintext",
    yml: "yaml",
    yaml: "yaml",
    toml: "toml",
    ini: "ini",
    cfg: "ini",
    conf: "ini",
    sh: "shell",
    bash: "shell",
    zsh: "shell",
    fish: "shell",
    sql: "sql",
    dockerfile: "dockerfile",
    gitignore: "gitignore",
  };
  return languages[ext || ""] || "plaintext";
}

export function getFileIcon(filename: string, isDirectory: boolean): string {
  if (isDirectory) return "folder";
  const ext = filename.split(".").pop()?.toLowerCase();
  const icons: Record<string, string> = {
    ts: "typescript",
    tsx: "react",
    js: "javascript",
    jsx: "react",
    json: "json",
    html: "html",
    css: "css",
    scss: "scss",
    sass: "scss",
    py: "python",
    rs: "rust",
    go: "go",
    java: "java",
    kt: "kotlin",
    cpp: "cpp",
    c: "c",
    h: "c",
    hpp: "cpp",
    cs: "csharp",
    php: "php",
    rb: "ruby",
    swift: "swift",
    lua: "lua",
    md: "markdown",
    txt: "file-text",
    yml: "yaml",
    yaml: "yaml",
    toml: "toml",
    ini: "config",
    cfg: "config",
    conf: "config",
    sh: "terminal",
    bash: "terminal",
    zsh: "terminal",
    fish: "terminal",
    sql: "database",
    dockerfile: "docker",
    gitignore: "git-branch",
  };
  return icons[ext || ""] || "file";
}

export function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null;
  return (...args: Parameters<T>) => {
    if (timeout) clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export function throttle<T extends (...args: any[]) => any>(
  func: T,
  limit: number
): (...args: Parameters<T>) => void {
  let inThrottle = false;
  return (...args: Parameters<T>) => {
    if (!inThrottle) {
      func(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

export function generateId(): string {
  return crypto.randomUUID();
}

export function parseGitStatus(status: string): {
  staged: string;
  unstaged: string;
} {
  return {
    staged: status[0] === " " ? "unmodified" : status[0],
    unstaged: status[1] === " " ? "unmodified" : status[1],
  };
}

export function getGitStatusLabel(status: string): string {
  const labels: Record<string, string> = {
    " ": "unmodified",
    M: "modified",
    A: "added",
    D: "deleted",
    R: "renamed",
    C: "copied",
    "?": "untracked",
    "!": "ignored",
    U: "conflicted",
  };
  return labels[status] || "unknown";
}

export function getLanguageColor(language: string): string {
  const colors: Record<string, string> = {
    typescript: "#3178C6",
    javascript: "#F7DF1E",
    python: "#3776AB",
    rust: "#DEA584",
    go: "#00ADD8",
    java: "#ED8B00",
    cpp: "#00599C",
    c: "#A8B9CC",
    csharp: "#239120",
    php: "#777BB4",
    ruby: "#CC342D",
    swift: "#FA7343",
    lua: "#000080",
    html: "#E34F26",
    css: "#1572B6",
    scss: "#CC6699",
    json: "#000000",
    markdown: "#083FA1",
    yaml: "#CB171E",
    toml: "#9C4221",
    shell: "#89E051",
    sql: "#E38C00",
    dockerfile: "#2496ED",
  };
  return colors[language] || "#64748B";
}

export function estimateTokens(text: string): number {
  // Rough estimation: ~4 characters per token for English
  return Math.ceil(text.length / 4);
}

export function formatTokenCount(count: number): string {
  if (count < 1000) return `${count}`;
  if (count < 1000000) return `${(count / 1000).toFixed(1)}K`;
  return `${(count / 1000000).toFixed(1)}M`;
}

export function formatCost(cost: number | null, currency = "USD"): string {
  if (cost === null || cost === undefined) return "—";
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  if (cost < 1) return `$${cost.toFixed(4)}`;
  return `$${cost.toFixed(2)}`;
}

export function getModelCapabilityBadge(capability: string): { label: string; color: string } {
  const badges: Record<string, { label: string; color: string }> = {
    chat: { label: "Chat", color: "bg-blue-500/20 text-blue-400" },
    streaming: { label: "Stream", color: "bg-green-500/20 text-green-400" },
    tools: { label: "Tools", color: "bg-purple-500/20 text-purple-400" },
    images: { label: "Vision", color: "bg-pink-500/20 text-pink-400" },
    "structured-output": { label: "JSON", color: "bg-amber-500/20 text-amber-400" },
    reasoning: { label: "Reasoning", color: "bg-indigo-500/20 text-indigo-400" },
    "audio-input": { label: "Audio In", color: "bg-orange-500/20 text-orange-400" },
    "audio-output": { label: "Audio Out", color: "bg-red-500/20 text-red-400" },
    vision: { label: "Vision", color: "bg-pink-500/20 text-pink-400" },
    embeddings: { label: "Embeddings", color: "bg-teal-500/20 text-teal-400" },
  };
  return badges[capability] || { label: capability, color: "bg-gray-500/20 text-gray-400" };
}

export function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export function retry<T>(
  fn: () => Promise<T>,
  retries = 3,
  delay = 1000
): Promise<T> {
  return fn().catch(async (error) => {
    if (retries <= 0) throw error;
    await sleep(delay);
    return retry(fn, retries - 1, delay * 2);
  });
}

export function groupBy<T>(array: T[], key: keyof T | ((item: T) => string)): Record<string, T[]> {
  return array.reduce((groups, item) => {
    const groupKey = typeof key === "function" ? key(item) : String(item[key]);
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(item);
    return groups;
  }, {} as Record<string, T[]>);
}

export function sortBy<T>(array: T[], key: keyof T | ((item: T) => any), direction: "asc" | "desc" = "asc"): T[] {
  return [...array].sort((a, b) => {
    const aVal = typeof key === "function" ? key(a) : a[key];
    const bVal = typeof key === "function" ? key(b) : b[key];
    if (aVal < bVal) return direction === "asc" ? -1 : 1;
    if (aVal > bVal) return direction === "asc" ? 1 : -1;
    return 0;
  });
}

export function uniqueBy<T>(array: T[], key: keyof T | ((item: T) => any)): T[] {
  const seen = new Set();
  return array.filter(item => {
    const val = typeof key === "function" ? key(item) : item[key];
    if (seen.has(val)) return false;
    seen.add(val);
    return true;
  });
}