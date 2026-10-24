import { Router, Request, Response } from "express";
import { z } from "zod";
import { jsonStorage } from "../db/json-storage.js";
import { resolve } from "path";
import { execSync } from "child_process";

const router = Router();

function runGitCommand(cwd: string, args: string[]): { stdout: string; stderr: string; exitCode: number } {
  try {
    const result = execSync("git " + args.join(" "), {
      cwd,
      encoding: "utf-8",
      maxBuffer: 10 * 1024 * 1024,
      timeout: 30000,
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { stdout: result, stderr: "", exitCode: 0 };
  } catch (error: any) {
    return {
      stdout: error.stdout || "",
      stderr: error.stderr || error.message,
      exitCode: error.status || 1,
    };
  }
}

// GET /api/git/:id/status - Get git status
router.get("/:id/status", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const rootPath = project.rootPath;
    
    // Check if git repo
    const { stdout: isRepo } = runGitCommand(rootPath, ["rev-parse", "--git-dir"]);
    if (isRepo.trim() === "") {
      return res.json({ isRepo: false });
    }
    
    // Get current branch
    const { stdout: branch } = runGitCommand(rootPath, ["branch", "--show-current"]);
    
    // Get status
    const { stdout: statusOut } = runGitCommand(rootPath, ["status", "--porcelain=v1"]);
    
    // Get remotes
    const { stdout: remotesOut } = runGitCommand(rootPath, ["remote", "-v"]);
    
    // Get ahead/behind
    const { stdout: aheadBehind } = runGitCommand(rootPath, ["rev-list", "--left-right", "--count", "HEAD...@{u}"]);
    
    const files = statusOut.trim().split("\n").filter(Boolean).map(line => {
      const status = line.substring(0, 2);
      const path = line.substring(3);
      return {
        path,
        staged: status[0] !== " " && status[0] !== "?",
        unstaged: status[1] !== " " && status[1] !== "?",
        status: status[0] === "?" ? "untracked" : status[0] === " " ? "unmodified" : status[0].toLowerCase(),
      };
    });
    
    const remotes = remotesOut.trim().split("\n").filter(Boolean).map(line => {
      const parts = line.split(/\s+/);
      return { name: parts[0], url: parts[1], type: parts[2]?.replace(/[()]/g, "") };
    });
    
    let ahead = 0, behind = 0;
    if (aheadBehind.trim()) {
      const [a, b] = aheadBehind.trim().split(/\s+/).map(Number);
      ahead = a || 0;
      behind = b || 0;
    }
    
    res.json({
      isRepo: true,
      currentBranch: branch.trim(),
      files,
      remotes,
      ahead,
      behind,
      rootPath,
    });
  } catch (error) {
    console.error("[Git] Status error:", error);
    res.status(500).json({ error: "Failed to get git status" });
  }
});

// GET /api/git/:id/diff - Get git diff
router.get("/:id/diff", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const rootPath = project.rootPath;
    const file = req.query.file as string | undefined;
    const staged = req.query.staged === "true";
    
    const args = ["diff"];
    if (staged) args.push("--staged");
    if (file) args.push("--", file);
    
    const { stdout, stderr, exitCode } = runGitCommand(rootPath, args);
    
    if (exitCode !== 0) {
      return res.status(500).json({ error: stderr });
    }
    
    res.json({ diff: stdout });
  } catch (error) {
    console.error("[Git] Diff error:", error);
    res.status(500).json({ error: "Failed to get diff" });
  }
});

// GET /api/git/:id/log - Get commit history
router.get("/:id/log", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const rootPath = project.rootPath;
    const maxCount = parseInt(req.query.maxCount as string) || 50;
    const file = req.query.file as string | undefined;
    
    const args = ["log", `--max-count=${maxCount}`, "--pretty=format:%H|%h|%an|%ae|%at|%s|%b", "--date=iso"];
    if (file) args.push("--", file);
    
    const { stdout, stderr, exitCode } = runGitCommand(rootPath, args);
    
    if (exitCode !== 0) {
      return res.status(500).json({ error: stderr });
    }
    
    const commits = stdout.trim().split("\n").filter(Boolean).map(line => {
      const [hash, shortHash, authorName, authorEmail, authorDate, subject, body] = line.split("|");
      return {
        hash,
        shortHash,
        author: { name: authorName, email: authorEmail, date: new Date(parseInt(authorDate) * 1000).toISOString() },
        message: subject,
        body: body || undefined,
      };
    });
    
    res.json({ commits });
  } catch (error) {
    console.error("[Git] Log error:", error);
    res.status(500).json({ error: "Failed to get commit history" });
  }
});

// GET /api/git/:id/branches - Get branches
router.get("/:id/branches", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const rootPath = project.rootPath;
    
    const { stdout: localOut } = runGitCommand(rootPath, ["branch", "--format=%(refname:short)|%(upstream:short)|%(upstream:track)"]);
    const { stdout: remoteOut } = runGitCommand(rootPath, ["branch", "-r", "--format=%(refname:short)"]);
    
    const localBranches = localOut.trim().split("\n").filter(Boolean).map(line => {
      const [name, upstream, track] = line.split("|");
      const [ahead, behind] = (track || "").match(/ahead (\d+), behind (\d+)/)?.slice(1).map(Number) || [0, 0];
      return { name, isCurrent: false, isRemote: false, upstream: upstream || undefined, ahead: ahead || 0, behind: behind || 0 };
    });
    
    const remoteBranches = remoteOut.trim().split("\n").filter(Boolean).map(name => ({
      name: name.replace("origin/", ""),
      isCurrent: false,
      isRemote: true,
      upstream: name,
    }));
    
    // Mark current branch
    const { stdout: current } = runGitCommand(rootPath, ["branch", "--show-current"]);
    const currentBranch = current.trim();
    for (const b of localBranches) {
      if (b.name === currentBranch) b.isCurrent = true;
    }
    
    res.json({ branches: [...localBranches, ...remoteBranches] });
  } catch (error) {
    console.error("[Git] Branches error:", error);
    res.status(500).json({ error: "Failed to get branches" });
  }
});

// POST /api/git/:id/checkout - Checkout branch
router.post("/:id/checkout", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const rootPath = project.rootPath;
    const { branch, create } = req.body;
    
    if (!branch) {
      return res.status(400).json({ error: "Branch name required" });
    }
    
    const args = ["checkout"];
    if (create) args.push("-b");
    args.push(branch);
    
    const { stdout, stderr, exitCode } = runGitCommand(rootPath, args);
    
    if (exitCode !== 0) {
      return res.status(500).json({ error: stderr });
    }
    
    res.json({ success: true, output: stdout });
  } catch (error) {
    console.error("[Git] Checkout error:", error);
    res.status(500).json({ error: "Failed to checkout branch" });
  }
});

// POST /api/git/:id/stage - Stage files
router.post("/:id/stage", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const rootPath = project.rootPath;
    const { files } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "Files array required" });
    }
    
    const { stdout, stderr, exitCode } = runGitCommand(rootPath, ["add", ...files]);
    
    if (exitCode !== 0) {
      return res.status(500).json({ error: stderr });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("[Git] Stage error:", error);
    res.status(500).json({ error: "Failed to stage files" });
  }
});

// POST /api/git/:id/unstage - Unstage files
router.post("/:id/unstage", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const rootPath = project.rootPath;
    const { files } = req.body;
    
    if (!files || !Array.isArray(files) || files.length === 0) {
      return res.status(400).json({ error: "Files array required" });
    }
    
    const { stdout, stderr, exitCode } = runGitCommand(rootPath, ["reset", "HEAD", "--", ...files]);
    
    if (exitCode !== 0) {
      return res.status(500).json({ error: stderr });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("[Git] Unstage error:", error);
    res.status(500).json({ error: "Failed to unstage files" });
  }
});

// POST /api/git/:id/commit - Commit changes
router.post("/:id/commit", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const rootPath = project.rootPath;
    const { message, amend, noVerify } = req.body;
    
    if (!message) {
      return res.status(400).json({ error: "Commit message required" });
    }
    
    const args = ["commit", "-m", message];
    if (amend) args.push("--amend");
    if (noVerify) args.push("--no-verify");
    
    const { stdout, stderr, exitCode } = runGitCommand(rootPath, args);
    
    if (exitCode !== 0) {
      return res.status(500).json({ error: stderr });
    }
    
    // Get new commit hash
    const { stdout: hash } = runGitCommand(rootPath, ["rev-parse", "HEAD"]);
    
    res.json({ success: true, hash: hash.trim(), output: stdout });
  } catch (error) {
    console.error("[Git] Commit error:", error);
    res.status(500).json({ error: "Failed to commit" });
  }
});

// POST /api/git/:id/push - Push changes
router.post("/:id/push", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const rootPath = project.rootPath;
    const { remote, branch, force, setUpstream } = req.body;
    
    const args = ["push"];
    if (remote) args.push(remote);
    if (branch) args.push(branch);
    if (force) args.push("--force");
    if (setUpstream) args.push("--set-upstream");
    
    const { stdout, stderr, exitCode } = runGitCommand(rootPath, args);
    
    if (exitCode !== 0) {
      return res.status(500).json({ error: stderr });
    }
    
    res.json({ success: true, output: stdout });
  } catch (error) {
    console.error("[Git] Push error:", error);
    res.status(500).json({ error: "Failed to push" });
  }
});

// POST /api/git/:id/pull - Pull changes
router.post("/:id/pull", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const rootPath = project.rootPath;
    const { remote, branch, rebase } = req.body;
    
    const args = ["pull"];
    if (rebase) args.push("--rebase");
    if (remote) args.push(remote);
    if (branch) args.push(branch);
    
    const { stdout, stderr, exitCode } = runGitCommand(rootPath, args);
    
    if (exitCode !== 0) {
      return res.status(500).json({ error: stderr });
    }
    
    res.json({ success: true, output: stdout });
  } catch (error) {
    console.error("[Git] Pull error:", error);
    res.status(500).json({ error: "Failed to pull" });
  }
});

// POST /api/git/:id/fetch - Fetch changes
router.post("/:id/fetch", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const rootPath = project.rootPath;
    const { remote } = req.body;
    
    const args = ["fetch"];
    if (remote) args.push(remote);
    else args.push("--all");
    
    const { stdout, stderr, exitCode } = runGitCommand(rootPath, args);
    
    if (exitCode !== 0) {
      return res.status(500).json({ error: stderr });
    }
    
    res.json({ success: true, output: stdout });
  } catch (error) {
    console.error("[Git] Fetch error:", error);
    res.status(500).json({ error: "Failed to fetch" });
  }
});

// GET /api/git/:id/stashes - Get stashes
router.get("/:id/stashes", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(444).json({ error: "Project not found" });
    }
    
    const rootPath = project.rootPath;
    
    const { stdout } = runGitCommand(rootPath, ["stash", "list", "--format=%gd|%gs|%gD|%cr"]);
    
    const stashes = stdout.trim().split("\n").filter(Boolean).map((line, index) => {
      const [ref, message, hash, date] = line.split("|");
      return { index, message, hash, date, branch: "" };
    });
    
    res.json({ stashes });
  } catch (error) {
    console.error("[Git] Stashes error:", error);
    res.status(500).json({ error: "Failed to get stashes" });
  }
});

// POST /api/git/:id/stash - Create stash
router.post("/:id/stash", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const rootPath = project.rootPath;
    const { message, includeUntracked } = req.body;
    
    const args = ["stash", "push"];
    if (message) args.push("-m", message);
    if (includeUntracked) args.push("-u");
    
    const { stdout, stderr, exitCode } = runGitCommand(rootPath, args);
    
    if (exitCode !== 0) {
      return res.status(500).json({ error: stderr });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("[Git] Stash error:", error);
    res.status(500).json({ error: "Failed to stash" });
  }
});

// POST /api/git/:id/stash/pop - Pop stash
router.post("/:id/stash/pop", async (req: Request, res: Response) => {
  try {
    const project = jsonStorage.getProject(req.params.id);
    if (!project) {
      return res.status(404).json({ error: "Project not found" });
    }
    
    const rootPath = project.rootPath;
    const { index } = req.body;
    
    const args = ["stash", "pop"];
    if (index !== undefined) args.push(`stash@{${index}}`);
    
    const { stdout, stderr, exitCode } = runGitCommand(rootPath, args);
    
    if (exitCode !== 0) {
      return res.status(500).json({ error: stderr });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error("[Git] Stash pop error:", error);
    res.status(500).json({ error: "Failed to pop stash" });
  }
});

export default router;