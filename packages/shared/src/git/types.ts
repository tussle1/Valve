import { z } from "zod";

/**
 * Git and GitHub integration types.
 */

export const GitStatusSchema = z.enum([
  "unmodified",
  "modified",
  "added",
  "deleted",
  "renamed",
  "copied",
  "untracked",
  "ignored",
  "conflicted",
  "submodule",
]);

export type GitStatus = z.infer<typeof GitStatusSchema>;

export const GitFileChangeSchema = z.object({
  path: z.string(),
  status: GitStatusSchema,
  staged: z.boolean(),
  oldPath: z.string().optional(), // For renames
  additions: z.number().int().nonnegative().default(0),
  deletions: z.number().int().nonnegative().default(0),
  binary: z.boolean().default(false),
});

export type GitFileChange = z.infer<typeof GitFileChangeSchema>;

export const GitCommitSchema = z.object({
  hash: z.string(),
  shortHash: z.string(),
  author: z.object({
    name: z.string(),
    email: z.string(),
    date: z.string().datetime(),
  }),
  committer: z.object({
    name: z.string(),
    email: z.string(),
    date: z.string().datetime(),
  }).optional(),
  message: z.string(),
  subject: z.string(),
  body: z.string().optional(),
  parents: z.array(z.string()).default([]),
  refs: z.array(z.string()).default([]),
});

export type GitCommit = z.infer<typeof GitCommitSchema>;

export const GitBranchSchema = z.object({
  name: z.string(),
  isCurrent: z.boolean().default(false),
  isRemote: z.boolean().default(false),
  upstream: z.string().optional(),
  ahead: z.number().int().nonnegative().default(0),
  behind: z.number().int().nonnegative().default(0),
  lastCommit: GitCommitSchema.optional(),
});

export type GitBranch = z.infer<typeof GitBranchSchema>;

export const GitRemoteSchema = z.object({
  name: z.string(),
  url: z.string(),
  fetchUrl: z.string().optional(),
  pushUrl: z.string().optional(),
});

export type GitRemote = z.infer<typeof GitRemoteSchema>;

export const GitStashSchema = z.object({
  index: z.number().int().nonnegative(),
  message: z.string(),
  branch: z.string(),
  hash: z.string(),
  date: z.string().datetime(),
  files: z.array(z.string()).default([]),
});

export type GitStash = z.infer<typeof GitStashSchema>;

export const GitDiffHunkSchema = z.object({
  oldStart: z.number().int().positive(),
  oldLines: z.number().int().nonnegative(),
  newStart: z.number().int().positive(),
  newLines: z.number().int().nonnegative(),
  lines: z.array(z.object({
    type: z.enum(["context", "add", "remove"]),
    content: z.string(),
    oldLineNumber: z.number().int().positive().optional(),
    newLineNumber: z.number().int().positive().optional(),
  })),
});

export type GitDiffHunk = z.infer<typeof GitDiffHunkSchema>;

export const GitFileDiffSchema = z.object({
  path: z.string(),
  oldPath: z.string().optional(),
  status: GitStatusSchema,
  hunks: z.array(GitDiffHunkSchema),
  binary: z.boolean().default(false),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
});

export type GitFileDiff = z.infer<typeof GitFileDiffSchema>;

export const GitRepoInfoSchema = z.object({
  rootPath: z.string(),
  currentBranch: z.string(),
  headCommit: GitCommitSchema.optional(),
  remotes: z.array(GitRemoteSchema).default([]),
  branches: z.array(GitBranchSchema).default([]),
  status: z.array(GitFileChangeSchema).default([]),
  stashes: z.array(GitStashSchema).default([]),
  isBare: z.boolean().default(false),
  isShallow: z.boolean().default(false),
});

export type GitRepoInfo = z.infer<typeof GitRepoInfoSchema>;

// GitHub-specific types
export const GitHubUserSchema = z.object({
  login: z.string(),
  id: z.number().int(),
  avatarUrl: z.string().url(),
  type: z.enum(["User", "Organization", "Bot"]),
  htmlUrl: z.string().url(),
});

export type GitHubUser = z.infer<typeof GitHubUserSchema>;

export const GitHubRepositorySchema = z.object({
  id: z.number().int(),
  name: z.string(),
  fullName: z.string(),
  description: z.string().nullable(),
  private: z.boolean(),
  htmlUrl: z.string().url(),
  cloneUrl: z.string().url(),
  sshUrl: z.string(),
  defaultBranch: z.string(),
  stars: z.number().int().nonnegative(),
  forks: z.number().int().nonnegative(),
  language: z.string().nullable(),
  topics: z.array(z.string()).default([]),
  owner: GitHubUserSchema,
  permissions: z.object({
    admin: z.boolean(),
    maintain: z.boolean(),
    push: z.boolean(),
    triage: z.boolean(),
    pull: z.boolean(),
  }).optional(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  pushedAt: z.string().datetime().nullable(),
});

export type GitHubRepository = z.infer<typeof GitHubRepositorySchema>;

export const GitHubIssueSchema = z.object({
  id: z.number().int(),
  number: z.number().int(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.enum(["open", "closed"]),
  labels: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
    color: z.string(),
    description: z.string().nullable(),
  })).default([]),
  assignees: z.array(GitHubUserSchema).default([]),
  milestone: z.object({
    id: z.number().int(),
    title: z.string(),
    description: z.string().nullable(),
    dueOn: z.string().datetime().nullable(),
    state: z.enum(["open", "closed"]),
  }).nullable(),
  comments: z.number().int().nonnegative(),
  author: GitHubUserSchema,
  repository: GitHubRepositorySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  closedAt: z.string().datetime().nullable(),
  htmlUrl: z.string().url(),
});

export type GitHubIssue = z.infer<typeof GitHubIssueSchema>;

export const GitHubPullRequestSchema = z.object({
  id: z.number().int(),
  number: z.number().int(),
  title: z.string(),
  body: z.string().nullable(),
  state: z.enum(["open", "closed", "merged"]),
  draft: z.boolean(),
  head: z.object({
    ref: z.string(),
    sha: z.string(),
    repo: GitHubRepositorySchema.nullable(),
  }),
  base: z.object({
    ref: z.string(),
    sha: z.string(),
    repo: GitHubRepositorySchema,
  }),
  author: GitHubUserSchema,
  assignees: z.array(GitHubUserSchema).default([]),
  reviewers: z.array(GitHubUserSchema).default([]),
  labels: z.array(z.object({
    id: z.number().int(),
    name: z.string(),
    color: z.string(),
    description: z.string().nullable(),
  })).default([]),
  milestone: z.object({
    id: z.number().int(),
    title: z.string(),
    description: z.string().nullable(),
    dueOn: z.string().datetime().nullable(),
    state: z.enum(["open", "closed"]),
  }).nullable(),
  mergeable: z.boolean().nullable(),
  mergeableState: z.enum(["clean", "dirty", "blocked", "behind", "unknown"]).nullable(),
  merged: z.boolean(),
  mergedAt: z.string().datetime().nullable(),
  mergedBy: GitHubUserSchema.nullable(),
  comments: z.number().int().nonnegative(),
  reviewComments: z.number().int().nonnegative(),
  commits: z.number().int().nonnegative(),
  additions: z.number().int().nonnegative(),
  deletions: z.number().int().nonnegative(),
  changedFiles: z.number().int().nonnegative(),
  repository: GitHubRepositorySchema,
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  closedAt: z.string().datetime().nullable(),
  htmlUrl: z.string().url(),
  diffUrl: z.string().url(),
  patchUrl: z.string().url(),
});

export type GitHubPullRequest = z.infer<typeof GitHubPullRequestSchema>;

export const GitHubReviewSchema = z.object({
  id: z.number().int(),
  author: GitHubUserSchema,
  body: z.string().nullable(),
  state: z.enum(["approved", "changes_requested", "commented", "dismissed", "pending"]),
  htmlUrl: z.string().url(),
  submittedAt: z.string().datetime().nullable(),
  commitId: z.string(),
});

export type GitHubReview = z.infer<typeof GitHubReviewSchema>;

export const GitHubCheckRunSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  status: z.enum(["queued", "in_progress", "completed"]),
  conclusion: z.enum(["success", "failure", "neutral", "cancelled", "skipped", "timed_out", "action_required"]).nullable(),
  htmlUrl: z.string().url(),
  startedAt: z.string().datetime().nullable(),
  completedAt: z.string().datetime().nullable(),
  output: z.object({
    title: z.string(),
    summary: z.string(),
    text: z.string().nullable(),
    annotationsCount: z.number().int().nonnegative(),
  }).nullable(),
});

export type GitHubCheckRun = z.infer<typeof GitHubCheckRunSchema>;

export const GitHubWorkflowRunSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  headBranch: z.string(),
  headSha: z.string(),
  runNumber: z.number().int(),
  event: z.string(),
  status: z.enum(["queued", "in_progress", "completed"]),
  conclusion: z.enum(["success", "failure", "neutral", "cancelled", "skipped", "timed_out", "action_required"]).nullable(),
  workflowId: z.number().int(),
  htmlUrl: z.string().url(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  runStartedAt: z.string().datetime(),
  jobsUrl: z.string().url(),
  logsUrl: z.string().url(),
});

export type GitHubWorkflowRun = z.infer<typeof GitHubWorkflowRunSchema>;

export interface GitService {
  getRepoInfo(rootPath: string): Promise<GitRepoInfo>;
  getStatus(rootPath: string): Promise<GitFileChange[]>;
  getDiff(rootPath: string, options?: { staged?: boolean; file?: string }): Promise<GitFileDiff[]>;
  getCommits(rootPath: string, options?: { maxCount?: number; since?: string; until?: string; path?: string }): Promise<GitCommit[]>;
  getBranches(rootPath: string): Promise<GitBranch[]>;
  getRemotes(rootPath: string): Promise<GitRemote[]>;
  getStashes(rootPath: string): Promise<GitStash[]>;
  
  // Write operations
  init(rootPath: string): Promise<void>;
  clone(url: string, targetPath: string, options?: { branch?: string; depth?: number }): Promise<void>;
  fetch(rootPath: string, remote?: string): Promise<void>;
  pull(rootPath: string, remote?: string, branch?: string): Promise<void>;
  push(rootPath: string, remote?: string, branch?: string, options?: { force?: boolean; setUpstream?: boolean }): Promise<void>;
  
  // Branch operations
  createBranch(rootPath: string, name: string, startPoint?: string): Promise<void>;
  checkout(rootPath: string, branch: string, options?: { create?: boolean }): Promise<void>;
  deleteBranch(rootPath: string, name: string, options?: { force?: boolean }): Promise<void>;
  merge(rootPath: string, branch: string, options?: { noFastForward?: boolean; noCommit?: boolean }): Promise<void>;
  rebase(rootPath: string, branch: string): Promise<void>;
  
  // Commit operations
  stage(rootPath: string, files: string[]): Promise<void>;
  unstage(rootPath: string, files: string[]): Promise<void>;
  commit(rootPath: string, message: string, options?: { amend?: boolean; noVerify?: boolean }): Promise<string>;
  amendCommit(rootPath: string, message: string): Promise<void>;
  
  // Stash operations
  stash(rootPath: string, message?: string, options?: { includeUntracked?: boolean }): Promise<void>;
  stashPop(rootPath: string, index?: number): Promise<void>;
  stashDrop(rootPath: string, index: number): Promise<void>;
  
  // Remote operations
  addRemote(rootPath: string, name: string, url: string): Promise<void>;
  removeRemote(rootPath: string, name: string): Promise<void>;
  setRemoteUrl(rootPath: string, name: string, url: string): Promise<void>;
}

export interface GitHubService {
  // Authentication
  authenticate(token: string): Promise<GitHubUser>;
  getAuthenticatedUser(): Promise<GitHubUser>;
  
  // Repositories
  getRepositories(options?: { affiliation?: string; type?: string; sort?: string; perPage?: number }): Promise<GitHubRepository[]>;
  getRepository(owner: string, repo: string): Promise<GitHubRepository>;
  createRepository(options: { name: string; description?: string; private?: boolean; autoInit?: boolean }): Promise<GitHubRepository>;
  forkRepository(owner: string, repo: string, organization?: string): Promise<GitHubRepository>;
  
  // Issues
  getIssues(owner: string, repo: string, options?: { state?: string; labels?: string[]; assignee?: string; perPage?: number }): Promise<GitHubIssue[]>;
  getIssue(owner: string, repo: string, number: number): Promise<GitHubIssue>;
  createIssue(owner: string, repo: string, options: { title: string; body?: string; labels?: string[]; assignees?: string[] }): Promise<GitHubIssue>;
  updateIssue(owner: string, repo: string, number: number, updates: Partial<GitHubIssue>): Promise<GitHubIssue>;
  addIssueComment(owner: string, repo: string, number: number, body: string): Promise<void>;
  
  // Pull Requests
  getPullRequests(owner: string, repo: string, options?: { state?: string; head?: string; base?: string; perPage?: number }): Promise<GitHubPullRequest[]>;
  getPullRequest(owner: string, repo: string, number: number): Promise<GitHubPullRequest>;
  createPullRequest(owner: string, repo: string, options: { title: string; body?: string; head: string; base: string; draft?: boolean }): Promise<GitHubPullRequest>;
  updatePullRequest(owner: string, repo: string, number: number, updates: Partial<GitHubPullRequest>): Promise<GitHubPullRequest>;
  mergePullRequest(owner: string, repo: string, number: number, options?: { mergeMethod?: "merge" | "squash" | "rebase" }): Promise<void>;
  getPullRequestReviews(owner: string, repo: string, number: number): Promise<GitHubReview[]>;
  createPullRequestReview(owner: string, repo: string, number: number, options: { event: "approve" | "request_changes" | "comment"; body?: string; commitId?: string }): Promise<GitHubReview>;
  getPullRequestFiles(owner: string, repo: string, number: number): Promise<GitFileDiff[]>;
  
  // Checks and Actions
  getCheckRuns(owner: string, repo: string, ref: string): Promise<GitHubCheckRun[]>;
  getWorkflowRuns(owner: string, repo: string, options?: { branch?: string; status?: string; perPage?: number }): Promise<GitHubWorkflowRun[]>;
  triggerWorkflow(owner: string, repo: string, workflowId: number | string, ref: string, inputs?: Record<string, string>): Promise<void>;
  
  // Branches and Refs
  getBranches(owner: string, repo: string, options?: { perPage?: number }): Promise<GitBranch[]>;
  createBranch(owner: string, repo: string, name: string, sha: string): Promise<void>;
  deleteBranch(owner: string, repo: string, name: string): Promise<void>;
}