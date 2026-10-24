import { Router, Request, Response } from "express";
import { z } from "zod";
import { jsonStorage } from "../db/json-storage.js";
import { v4 as uuidv4 } from "uuid";
import { resolve, relative, sep } from "path";
import { readdirSync, statSync, existsSync, readFileSync, writeFileSync, mkdirSync, rmSync, renameSync, copyFileSync } from "fs";

const router = Router();

// Validation schemas
const CreateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100),
  settings: z.record(z.unknown()).default({}),
  layout: z.record(z.unknown()).default({}),
});

const UpdateWorkspaceSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  settings: z.record(z.unknown()).optional(),
  layout: z.record(z.unknown()).optional(),
  activeProjectId: z.string().optional(),
});

const CreateProjectSchema = z.object({
  workspaceId: z.string(),
  name: z.string().min(1).max(100),
  rootPath: z.string().min(1),
  type: z.string().default("generic"),
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
});

const UpdateProjectSchema = CreateProjectSchema.partial().omit({ workspaceId: true });

// Workspace routes
router.get("/workspaces", async (req: Request, res: Response) => {
  try {
    const workspaces = jsonStorage.getWorkspaces();
    res.json(workspaces);
  } catch (error) {
    console.error("[Workspace] List error:", error);
    res.status(500).json({ error: "Failed to list workspaces" });
  }
});

router.post("/workspaces", async (req: Request, res: Response) => {
  try {
    const parsed = CreateWorkspaceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid workspace data", details: parsed.error.flatten() });
    }
    
    const workspace = jsonStorage.createWorkspace(parsed.data);
    res.status(201).json(workspace);
  } catch (error) {
    console.error("[Workspace] Create error:", error);
    res.status(500).json({ error: "Failed to create workspace" });
  }
});

router.get("/workspaces/:id", async (req: Request, res: Response) => {
  try {
    const workspace = jsonStorage.getWorkspace(req.params.id);
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    
    const projects = jsonStorage.getProjectsByWorkspace(req.params.id);
    res.json({ ...workspace, projects });
  } catch (error) {
    console.error("[Workspace] Get error:", error);
    res.status(500).json({ error: "Failed to get workspace" });
  }
});

router.put("/workspaces/:id", async (req: Request, res: Response) => {
  try {
    const parsed = UpdateWorkspaceSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
    }
    
    const workspace = jsonStorage.updateWorkspace(req.params.id, parsed.data);
    if (!workspace) {
      return res.status(404).json({ error: "Workspace not found" });
    }
    
    res.json(workspace);
  } catch (error) {
    console.error("[Workspace] Update error:", error);
    res.status(500).json({ error: "Failed to update workspace" });
  }
});

router.delete("/workspaces/:id", async (req: Request, res: Response) => {
  try {
    jsonStorage.deleteWorkspace(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("[Workspace] Delete error:", error);
    res.status(500).json({ error: "Failed to delete workspace" });
  }
});

// Project routes
router.get("/projects", async (req: Request, res: Response) => {
  try {
    const workspaceId = req.query.workspaceId as string | undefined;
    
    let projects;
    if (workspaceId) {
      projects = jsonStorage.getProjectsByWorkspace(workspaceId);
    } else {
      projects = jsonStorage.getProjects();
    }
    
    res.json(projects);
  } catch (error) {
    console.error("[Projects] List error:", error);
    res.status(500).json({ error: "Failed to list projects" });
  }
});

router.post("/projects", async (req: Request, res: Response) => {
  try {
    const parsed = CreateProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid project data", details: parsed.error.flatten() });
    }
    
    const { workspaceId, rootPath, ...rest } = parsed.data;
    
    // Verify workspace exists
    const workspace = jsonStorage.getWorkspace(workspaceId);
    if (!workspace) {
      return res.status(400).json({ error: "Workspace not found" });
    }
    
    // Verify path exists
    const fullPath = resolve(rootPath);
    if (!existsSync(fullPath)) {
      return res.status(400).json({ error: "Project path does not exist" });
    }
    
    const project = jsonStorage.createProject({
      workspaceId,
      rootPath: fullPath,
      ...rest,
    });
    
    res.status(201).json(project);
  } catch (error) {
    console.error("[Projects] Create error:", error);
    res.status(500).json({ error: "Failed to create project" });
  }
});

router.get("/projects/:id", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    res.json(project);
  } catch (error) {
    console.error("[Projects] Get error:", error);
    res.status(500).json({ error: "Failed to get project" });
  }
});

router.put("/projects/:id", async (req: Request, res: Response) => {
  try {
    const parsed = UpdateProjectSchema.safeParse(req.body);
    if (!parsed.success) {
      return res.status(400).json({ error: "Invalid data", details: parsed.error.flatten() });
    }
    
    const updates = { ...parsed.data };
    if (updates.rootPath) {
      updates.rootPath = resolve(updates.rootPath);
    }
    
    const project = jsonStorage.updateProject(req.params.id, updates);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    res.json(project);
  } catch (error) {
    console.error("[Projects] Update error:", error);
    res.status(500).json({ error: "Failed to update project" });
  }
});

router.delete("/projects/:id", async (req: Request, res: Response) => {
  try {
    jsonStorage.deleteProject(req.params.id);
    res.status(204).send();
  } catch (error) {
    console.error("[Projects] Delete error:", error);
    res.status(500).json({ error: "Failed to delete project" });
  }
});

// File system routes
const FILE_EXCLUDE_PATTERNS = [
  "node_modules", ".git", "dist", "build", ".next", ".nuxt", "target", 
  ".cache", "coverage", ".turbo", ".vercel", ".netlify",
  "*.log", "*.tmp", "*.temp", ".DS_Store", "Thumbs.db",
];

function shouldExclude(name: string, excludePatterns: string[]): boolean {
  return excludePatterns.some(pattern => {
    if (pattern.includes("*")) {
      const regex = new RegExp("^" + pattern.replace(/\*/g, ".*") + "$");
      return regex.test(name);
    }
    return name === pattern;
  });
}

function getFileTypeIcon(name: string, isDir: boolean): string {
  if (isDir) return "folder";
  const ext = name.split(".").pop()?.toLowerCase();
  const icons: Record<string, string> = {
    ts: "typescript", tsx: "react", js: "javascript", jsx: "react",
    json: "json", html: "html", css: "css", scss: "scss", sass: "scss",
    py: "python", rs: "rust", go: "go", java: "java", kt: "kotlin",
    cpp: "cpp", c: "c", h: "c", hpp: "cpp", cs: "csharp",
    php: "php", rb: "ruby", swift: "swift", lua: "lua",
    md: "markdown", txt: "text", yml: "yaml", yaml: "yaml",
    toml: "toml", ini: "ini", cfg: "ini", conf: "config",
    sh: "shell", bash: "shell", zsh: "shell", fish: "shell",
    sql: "sql", dockerfile: "docker", gitignore: "git",
  };
  return icons[ext || ""] || "file";
}

router.get("/projects/:id/files", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const path = req.query.path as string || "";
    const depth = parseInt(req.query.depth as string) || 1;
    const excludePatterns = [...FILE_EXCLUDE_PATTERNS, ...(project.excludedPaths || [])];
    
    const fullPath = resolve(project.rootPath, path);
    
    // Security: ensure path is within project root
    if (!fullPath.startsWith(project.rootPath)) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    if (!existsSync(fullPath)) {
      return res.status(404).json({ error: "Path not found" });
    }
    
    function scanDir(dir: string, currentDepth: number): any[] {
      if (currentDepth > depth) return [];
      
      const entries = readdirSync(dir, { withFileTypes: true });
      const results: any[] = [];
      
      for (const entry of entries) {
        if (shouldExclude(entry.name, excludePatterns)) continue;
        
        const entryPath = resolve(dir, entry.name);
        const relPath = relative(project.rootPath, entryPath);
        const stats = statSync(entryPath);
        
        const item: any = {
          path: relPath.replace(/\\/g, "/"),
          name: entry.name,
          type: entry.isDirectory() ? "directory" : entry.isSymbolicLink() ? "symlink" : "file",
          size: entry.isFile() ? stats.size : undefined,
          modifiedAt: stats.mtime.toISOString(),
          isHidden: entry.name.startsWith("."),
          isBinary: false,
          language: getFileTypeIcon(entry.name, entry.isDirectory()),
        };
        
        if (entry.isDirectory() && currentDepth < depth) {
          item.children = scanDir(entryPath, currentDepth + 1);
        }
        
        results.push(item);
      }
      
      return results.sort((a, b) => {
        if (a.type === "directory" && b.type !== "directory") return -1;
        if (a.type !== "directory" && b.type === "directory") return 1;
        return a.name.localeCompare(b.name);
      });
    }
    
    const tree = scanDir(fullPath, 1);
    res.json(tree);
  } catch (error) {
    console.error("[Files] Tree error:", error);
    res.status(500).json({ error: "Failed to get file tree" });
  }
});

router.get("/projects/:id/files/content", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const filePath = req.query.path as string;
    if (!filePath) {
      return res.status(400).json({ error: "Path parameter required" });
    }
    
    const fullPath = resolve(project.rootPath, filePath);
    if (!fullPath.startsWith(project.rootPath)) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    if (!existsSync(fullPath)) {
      return res.status(404).json({ error: "File not found" });
    }
    
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      return res.status(400).json({ error: "Path is a directory" });
    }
    
    // Check file size (limit to 10MB for direct read)
    if (stats.size > 10 * 1024 * 1024) {
      return res.status(413).json({ error: "File too large" });
    }
    
    const content = readFileSync(fullPath, "utf-8");
    res.json({ path: filePath, content, encoding: "utf-8" });
  } catch (error) {
    console.error("[Files] Read error:", error);
    res.status(500).json({ error: "Failed to read file" });
  }
});

router.put("/projects/:id/files/content", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const { path, content, encoding = "utf-8" } = req.body;
    if (!path || content === undefined) {
      return res.status(400).json({ error: "Path and content required" });
    }
    
    const fullPath = resolve(project.rootPath, path);
    if (!fullPath.startsWith(project.rootPath)) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    // Ensure directory exists
    const dir = fullPath.substring(0, fullPath.lastIndexOf(sep));
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    
    writeFileSync(fullPath, content, encoding);
    
    res.json({ path, success: true });
  } catch (error) {
    console.error("[Files] Write error:", error);
    res.status(500).json({ error: "Failed to write file" });
  }
});

router.post("/projects/:id/files", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const { path, isDirectory } = req.body;
    if (!path) {
      return res.status(400).json({ error: "Path required" });
    }
    
    const fullPath = resolve(project.rootPath, path);
    if (!fullPath.startsWith(project.rootPath)) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    if (existsSync(fullPath)) {
      return res.status(409).json({ error: "Already exists" });
    }
    
    if (isDirectory) {
      mkdirSync(fullPath, { recursive: true });
    } else {
      const dir = fullPath.substring(0, fullPath.lastIndexOf(sep));
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(fullPath, "");
    }
    
    res.status(201).json({ path, success: true });
  } catch (error) {
    console.error("[Files] Create error:", error);
    res.status(500).json({ error: "Failed to create file/folder" });
  }
});

router.delete("/projects/:id/files", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const path = req.query.path as string;
    if (!path) {
      return res.status(400).json({ error: "Path required" });
    }
    
    const fullPath = resolve(project.rootPath, path);
    if (!fullPath.startsWith(project.rootPath)) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    if (!existsSync(fullPath)) {
      return res.status(404).json({ error: "Not found" });
    }
    
    const stats = statSync(fullPath);
    if (stats.isDirectory()) {
      rmSync(fullPath, { recursive: true });
    } else {
      rmSync(fullPath);
    }
    
    res.json({ path, success: true });
  } catch (error) {
    console.error("[Files] Delete error:", error);
    res.status(500).json({ error: "Failed to delete" });
  }
});

router.post("/projects/:id/files/rename", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const { oldPath, newPath } = req.body;
    if (!oldPath || !newPath) {
      return res.status(400).json({ error: "Old and new paths required" });
    }
    
    const fullOldPath = resolve(project.rootPath, oldPath);
    const fullNewPath = resolve(project.rootPath, newPath);
    
    if (!fullOldPath.startsWith(project.rootPath) || !fullNewPath.startsWith(project.rootPath)) {
      return res.status(403).json({ error: "Access denied" });
    }
    
    if (!existsSync(fullOldPath)) {
      return res.status(404).json({ error: "Source not found" });
    }
    
    if (existsSync(fullNewPath)) {
      return res.status(409).json({ error: "Destination exists" });
    }
    
    const newDir = fullNewPath.substring(0, fullNewPath.lastIndexOf(sep));
    if (!existsSync(newDir)) {
      mkdirSync(newDir, { recursive: true });
    }
    
    renameSync(fullOldPath, fullNewPath);
    
    res.json({ oldPath, newPath, success: true });
  } catch (error) {
    console.error("[Files] Rename error:", error);
    res.status(500).json({ error: "Failed to rename" });
  }
});

// Search files
router.get("/projects/:id/search", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const query = req.query.q as string;
    const pattern = req.query.pattern as string;
    const maxResults = parseInt(req.query.maxResults as string) || 100;
    
    if (!query || query.length < 2) {
      return res.status(400).json({ error: "Query too short" });
    }
    
    const excludePatterns = [...FILE_EXCLUDE_PATTERNS, ...(project.excludedPaths || [])];
    const results: any[] = [];
    
    function searchDir(dir: string) {
      if (results.length >= maxResults) return;
      
      const entries = readdirSync(dir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (results.length >= maxResults) break;
        if (shouldExclude(entry.name, excludePatterns)) continue;
        
        const entryPath = resolve(dir, entry.name);
        const relPath = relative(project.rootPath, entryPath).replace(/\\/g, "/");
        
        if (entry.isDirectory()) {
          searchDir(entryPath);
        } else if (entry.isFile()) {
          try {
            const stats = statSync(entryPath);
            if (stats.size > 1024 * 1024) continue; // Skip large files
            
            const content = readFileSync(entryPath, "utf-8");
            const lines = content.split("\n");
            
            for (let i = 0; i < lines.length; i++) {
              if (lines[i].toLowerCase().includes(query.toLowerCase())) {
                results.push({
                  file: relPath,
                  line: i + 1,
                  column: lines[i].toLowerCase().indexOf(query.toLowerCase()) + 1,
                  match: lines[i].trim(),
                  contextBefore: lines[i - 1]?.trim(),
                  contextAfter: lines[i + 1]?.trim(),
                  language: getFileTypeIcon(entry.name, false),
                });
                if (results.length >= maxResults) break;
              }
            }
          } catch {
            // Skip binary/unreadable files
          }
        }
      }
    }
    
    searchDir(project.rootPath);
    res.json(results);
  } catch (error) {
    console.error("[Files] Search error:", error);
    res.status(500).json({ error: "Failed to search" });
  }
});

export default router;