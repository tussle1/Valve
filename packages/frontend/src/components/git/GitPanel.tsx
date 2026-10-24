import React, { useState, useEffect, useCallback } from "react";
import { cn } from "../../utils";
import { useStore, useGit } from "../../stores/useStore";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Tooltip } from "../ui/Tooltip";
import { Dropdown } from "../ui/Dropdown";
import {
  GitBranch,
  GitCommit,
  GitPullRequest,
  Plus,
  ArrowUp,
  ArrowDown,
  RotateCw,
  RefreshCw,
  ChevronDown,
  ChevronRight,
  FileText,
  Minus,
  Check,
  X,
  MoreHorizontal,
  Copy,
  Zap,
  MessageSquare,
} from "lucide-react";
import { formatRelativeTime } from "../../utils";

export function GitPanel() {
  const { gitChanges, gitBranches, gitCommits, loadStatus, loadLog, getDiff, checkout, stage, unstage, commit, push, pull, fetchRemote } = useGit();
  const sidebarOpen = useStore(state => state.sidebarOpen);
  const activeActivity = useStore(state => state.activeActivity);
  const setActiveActivity = useStore(state => state.setActiveActivity);
  const [commitMessage, setCommitMessage] = useState("");
  const [showBranches, setShowBranches] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showStaged, setShowStaged] = useState(true);
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [diffContent, setDiffContent] = useState("");
  const [loadingDiff, setLoadingDiff] = useState(false);
  const [creatingBranch, setCreatingBranch] = useState(false);
  const [newBranchName, setNewBranchName] = useState("");
  
  // Load git status when panel opens
  useEffect(() => {
    if (sidebarOpen && activeActivity === "git") {
      loadStatus();
      loadLog();
    }
  }, [sidebarOpen, activeActivity, loadStatus, loadLog]);
  
  const handleStage = async (file: string) => {
    await stage([file]);
    loadStatus();
  };
  
  const handleUnstage = async (file: string) => {
    await unstage([file]);
    loadStatus();
  };
  
  const handleStageAll = async () => {
    const files = gitChanges.filter(f => !f.staged).map(f => f.path);
    if (files.length > 0) {
      await stage(files);
      loadStatus();
    }
  };
  
  const handleUnstageAll = async () => {
    const files = gitChanges.filter(f => f.staged).map(f => f.path);
    if (files.length > 0) {
      await unstage(files);
      loadStatus();
    }
  };
  
  const handleCommit = async () => {
    if (!commitMessage.trim()) return;
    await commit(commitMessage);
    setCommitMessage("");
    loadStatus();
    loadLog();
  };
  
  const handlePush = async () => {
    await push();
    addNotification({ type: "success", title: "Push successful" });
  };
  
  const handlePull = async () => {
    await pull();
    loadStatus();
    loadLog();
  };
  
  const handleFetch = async () => {
    await fetchRemote();
    loadStatus();
  };
  
  const handleCheckout = async (branch: string) => {
    await checkout(branch);
    loadStatus();
    setShowBranches(false);
  };
  
  const handleNewBranch = async () => {
    if (!newBranchName.trim()) return;
    await checkout(newBranchName, true);
    setNewBranchName("");
    setCreatingBranch(false);
    loadStatus();
  };
  
  const handleFileClick = async (file: string) => {
    setSelectedFile(file === selectedFile ? null : file);
    if (file !== selectedFile) {
      setLoadingDiff(true);
      const diff = await getDiff(file);
      setDiffContent(diff);
      setLoadingDiff(false);
    }
  };
  
  const getStatusIcon = (status: string, staged: boolean) => {
    const icons: Record<string, React.ReactNode> = {
      modified: <FileText className="w-3 h-3" />,
      added: <Plus className="w-3 h-3" />,
      deleted: <Minus className="w-3 h-3" />,
      renamed: <GitBranch className="w-3 h-3" />,
      untracked: <FileText className="w-3 h-3" />,
      ignored: <X className="w-3 h-3" />,
      conflicted: <MessageSquare className="w-3 h-3" />,
    };
    return icons[status] || <FileText className="w-3 h-3" />;
  };
  
  const getStatusColor = (status: string, staged: boolean) => {
    const colors: Record<string, string> = {
      modified: staged ? "text-valve-accent" : "text-valve-warning",
      added: "text-valve-success",
      deleted: "text-valve-error",
      renamed: "text-valve-accent",
      untracked: "text-valve-text-muted",
      ignored: "text-valve-text-muted",
      conflicted: "text-valve-error",
    };
    return colors[status] || "text-valve-text";
  };
  
  const stagedFiles = gitChanges.filter(f => f.staged);
  const unstagedFiles = gitChanges.filter(f => !f.staged);
  
  return (
    <div className="valve-sidebar flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center justify-between p-2 border-b border-valve-border">
        <h3 className="font-medium text-sm text-valve-text-secondary">SOURCE CONTROL</h3>
        <div className="flex items-center gap-1">
          <Tooltip content="Refresh" position="bottom">
            <button className="valve-icon-btn p-1.5" onClick={loadStatus}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Branches" position="bottom">
            <button className="valve-icon-btn p-1.5" onClick={() => setShowBranches(!showBranches)}>
              <GitBranch className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="History" position="bottom">
            <button className="valve-icon-btn p-1.5" onClick={() => setShowHistory(!showHistory)}>
              <GitCommit className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="More" position="bottom">
            <Dropdown
              trigger={<MoreHorizontal className="w-4 h-4" />}
              items={[
                { label: "Pull", action: handlePull, icon: <ArrowDown className="w-3 h-3" /> },
                { label: "Push", action: handlePush, icon: <ArrowUp className="w-3 h-3" /> },
                { label: "Fetch", action: handleFetch, icon: <RotateCw className="w-3 h-3" /> },
                { divider: true },
                { label: "New Branch", action: () => setCreatingBranch(true), icon: <Plus className="w-3 h-3" /> },
              ]}
            />
          </Tooltip>
        </div>
      </div>
      
      {/* Branch Info */}
      <div className="px-2 py-2 border-b border-valve-border bg-valve-panel/50">
        <div className="flex items-center gap-2 text-sm">
          <GitBranch className="w-4 h-4 text-valve-accent" />
          <span className="font-mono text-valve-text truncate flex-1">
            {gitBranches.find(b => b.isCurrent)?.name || "main"}
          </span>
          {gitBranches.find(b => b.isCurrent)?.ahead && (
            <span className="valve-badge bg-valve-success/10 text-valve-success">
              ↑{gitBranches.find(b => b.isCurrent)?.ahead}
            </span>
          )}
          {gitBranches.find(b => b.isCurrent)?.behind && (
            <span className="valve-badge bg-valve-warning/10 text-valve-warning">
              ↓{gitBranches.find(b => b.isCurrent)?.behind}
            </span>
          )}
        </div>
      </div>
      
      {/* Branch Dropdown */}
      {showBranches && (
        <div className="p-2 border-b border-valve-border max-h-60 overflow-auto">
          <div className="flex items-center gap-1 mb-2">
            <input
              type="text"
              placeholder="New branch name..."
              value={newBranchName}
              onChange={(e) => setNewBranchName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleNewBranch()}
              className="valve-input flex-1 text-xs py-1"
              autoFocus
            />
            <Button size="sm" onClick={handleNewBranch} variant="primary">Create</Button>
            <button className="valve-icon-btn p-1.5" onClick={() => setCreatingBranch(false)}>
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="space-y-1">
            {gitBranches.map(branch => (
              <button
                key={branch.name}
                className={cn(
                  "w-full text-left p-2 rounded text-xs valve-btn-ghost",
                  branch.isCurrent && "bg-valve-accent/10 text-valve-accent"
                )}
                onClick={() => handleCheckout(branch.name)}
              >
                <div className="flex items-center gap-2">
                  {branch.isCurrent && <Check className="w-3 h-3" />}
                  <span className={cn("truncate flex-1 font-mono", branch.isRemote && "text-valve-text-muted")}>
                    {branch.name}
                  </span>
                  {branch.ahead && <span className="valve-badge-success text-xs">↑{branch.ahead}</span>}
                  {branch.behind && <span className="valve-badge-warning text-xs">↓{branch.behind}</span>}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Commit Message */}
      <div className="p-2 border-b border-valve-border">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message..."
          className="valve-input text-sm py-2 min-h-[60px] resize-none"
          rows={3}
        />
        <div className="flex items-center justify-between mt-2">
          <div className="flex items-center gap-2">
            <Button size="sm" variant={stagedFiles.length > 0 ? "primary" : "secondary"} onClick={handleCommit} disabled={!commitMessage.trim() || stagedFiles.length === 0}>
              <Check className="w-3 h-3 mr-1" />
              Commit
            </Button>
            {stagedFiles.length > 0 && unstagedFiles.length > 0 && (
              <Tooltip content="Commit All" position="top">
                <Button size="sm" variant="ghost" onClick={() => { handleStageAll(); handleCommit(); }}>
                  <GitCommit className="w-3 h-3 mr-1" />
                  Commit All
                </Button>
              </Tooltip>
            )}
          </div>
          <div className="flex items-center gap-1">
            <Tooltip content="Push" position="top">
              <button className="valve-icon-btn p-1.5" onClick={handlePush} disabled={gitCommits.length === 0}>
                <ArrowUp className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Pull" position="top">
              <button className="valve-icon-btn p-1.5" onClick={handlePull}>
                <ArrowDown className="w-4 h-4" />
              </button>
            </Tooltip>
            <Tooltip content="Fetch" position="top">
              <button className="valve-icon-btn p-1.5" onClick={handleFetch}>
                <RotateCw className="w-4 h-4" />
              </button>
            </Tooltip>
          </div>
        </div>
      </div>
      
      {/* Changes */}
      <div className="flex-1 overflow-auto">
        {/* Staged Changes */}
        {stagedFiles.length > 0 && (
          <div className="border-b border-valve-border">
            <div className="flex items-center justify-between px-2 py-1.5 bg-valve-panel/50">
              <span className="text-xs font-medium text-valve-text-secondary uppercase tracking-wider flex items-center gap-1">
                <Check className="w-3 h-3 text-valve-success" />
                Staged Changes ({stagedFiles.length})
              </span>
              <button className="valve-icon-btn p-1 text-xs" onClick={handleUnstageAll}>
                <X className="w-3 h-3" />
                Unstage All
              </button>
            </div>
            <div className="p-1 space-y-1">
              {stagedFiles.map(change => (
                <button
                  key={change.path}
                  className={cn(
                    "w-full text-left p-2 rounded text-sm valve-btn-ghost flex items-center gap-2",
                    selectedFile === change.path && "bg-valve-accent/10 text-valve-accent"
                  )}
                  onClick={() => handleFileClick(change.path)}
                >
                  {getStatusIcon(change.status, true)}
                  <span className={cn("truncate flex-1 font-mono", getStatusColor(change.status, true))}>
                    {change.path}
                  </span>
                  <span className="text-xs text-valve-text-muted">
                    +{change.additions} -{change.deletions}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Unstaged Changes */}
        {unstagedFiles.length > 0 && (
          <div className="border-b border-valve-border">
            <div className="flex items-center justify-between px-2 py-1.5 bg-valve-panel/50">
              <span className="text-xs font-medium text-valve-text-secondary uppercase tracking-wider flex items-center gap-1">
                <FileText className="w-3 h-3 text-valve-warning" />
                Changes ({unstagedFiles.length})
              </span>
              <button className="valve-icon-btn p-1 text-xs" onClick={handleStageAll}>
                <Plus className="w-3 h-3" />
                Stage All
              </button>
            </div>
            <div className="p-1 space-y-1">
              {unstagedFiles.map(change => (
                <button
                  key={change.path}
                  className={cn(
                    "w-full text-left p-2 rounded text-sm valve-btn-ghost flex items-center gap-2",
                    selectedFile === change.path && "bg-valve-accent/10 text-valve-accent"
                  )}
                  onClick={() => handleFileClick(change.path)}
                >
                  {getStatusIcon(change.status, false)}
                  <span className={cn("truncate flex-1 font-mono", getStatusColor(change.status, false))}>
                    {change.path}
                  </span>
                  <span className="text-xs text-valve-text-muted">
                    +{change.additions} -{change.deletions}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        
        {/* Empty State */}
        {gitChanges.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full p-8 text-valve-text-muted">
            <GitCommit className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-sm">No changes</p>
            <p className="text-xs">Working tree clean</p>
          </div>
        )}
      </div>
      
      {/* Diff View */}
      {selectedFile && (
        <div className="border-t border-valve-border bg-valve-panel/50 max-h-64 overflow-auto">
          <div className="flex items-center justify-between px-2 py-1.5">
            <span className="text-xs font-medium text-valve-text-secondary truncate flex-1">
              {selectedFile}
            </span>
            <button className="valve-icon-btn p-1" onClick={() => setSelectedFile(null)}>
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="p-2 font-mono text-xs overflow-x-auto">
            {loadingDiff ? (
              <div className="flex items-center justify-center h-32 text-valve-text-muted">
                <RotateCw className="w-5 h-5 animate-spin" />
              </div>
            ) : (
              <pre className="whitespace-pre-wrap">{diffContent || "No changes"}</pre>
            )}
          </div>
        </div>
      )}
    </div>
  );
}