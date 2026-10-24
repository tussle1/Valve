import React, { useState, useCallback, useRef, useEffect } from "react";
import { cn } from "../../utils";
import { useStore, useFileTree } from "../../stores/useStore";
import { useTabs } from "../../hooks";
import { Button } from "../ui/Button";
import { Dropdown } from "../ui/Dropdown";
import { Input } from "../ui/Input";
import { Tooltip } from "../ui/Tooltip";
import {
  Folder,
  File,
  FileText,
  Search,
  Plus,
  FolderPlus,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  MoreHorizontal,
  Eye,
  EyeOff,
  GitBranch,
  Zap,
  Settings,
  Copy,
  Trash2,
  Edit2,
} from "lucide-react";
import { getFileIcon, getFileLanguage } from "../../utils";

interface FileTreeNode {
  path: string;
  name: string;
  type: "file" | "directory" | "symlink";
  children?: FileTreeNode[];
  expanded?: boolean;
  selected?: boolean;
  gitStatus?: string;
  isBinary?: boolean;
  language?: string;
}

export function FileExplorer() {
  const { fileTree, currentProject, loadTree, refresh, toggleNode, selectNode, createFile, deleteFile, renameFile, readFile, writeFile } = useFileTree();
  const { openFile } = useTabs();
  const sidebarWidth = useStore(state => state.sidebarWidth);
  const setSidebarWidth = useStore(state => state.setSidebarWidth);
  const activeActivity = useStore(state => state.activeActivity);
  const [filter, setFilter] = useState("");
  const [showHidden, setShowHidden] = useState(false);
  const [renamingPath, setRenamingPath] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const renameInputRef = useRef<HTMLInputElement>(null);
  const splitterRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, width: 0 });
  
  // Load tree when project changes
  useEffect(() => {
    if (currentProject) {
      loadTree(currentProject);
    }
  }, [currentProject, loadTree]);
  
  // Focus rename input
  useEffect(() => {
    if (renamingPath) {
      setTimeout(() => renameInputRef.current?.focus(), 0);
    }
  }, [renamingPath]);
  
  const filteredTree = React.useMemo(() => {
    if (!filter) return fileTree;
    
    const filterNodes = (nodes: FileTreeNode[]): FileTreeNode[] => {
      return nodes
        .map(node => {
          const matches = node.name.toLowerCase().includes(filter.toLowerCase());
          const filteredChildren = node.children ? filterNodes(node.children) : [];
          const hasMatchingChildren = filteredChildren.length > 0;
          
          if (matches || hasMatchingChildren) {
            return {
              ...node,
              expanded: hasMatchingChildren || node.expanded,
              children: filteredChildren,
            };
          }
          return null;
        })
        .filter(Boolean) as FileTreeNode[];
    };
    
    return filterNodes(fileTree);
  }, [fileTree, filter]);
  
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = { x: e.clientX, width: sidebarWidth };
    
    const handleMouseMove = (e: MouseEvent) => {
      const delta = e.clientX - dragStartRef.current.x;
      setSidebarWidth(dragStartRef.current.width + delta);
    };
    
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";
  };
  
  const renderNode = (node: FileTreeNode, depth = 0): React.ReactElement => {
    const isDirectory = node.type === "directory";
    const isExpanded = node.expanded || false;
    const isSelected = node.selected;
    const isRenaming = renamingPath === node.path;
    const hasChildren = isDirectory && node.children && node.children.length > 0;
    const icon = getFileIcon(node.name, isDirectory);
    
    const gitStatusColors: Record<string, string> = {
      modified: "text-valve-warning",
      added: "text-valve-success",
      deleted: "text-valve-error",
      renamed: "text-valve-accent",
      untracked: "text-valve-text-muted",
      ignored: "text-valve-text-muted",
      conflicted: "text-valve-error",
    };
    
    const gitStatusIcon = node.gitStatus ? (
      <span className={cn("ml-1 w-3 h-3 flex-shrink-0", gitStatusColors[node.gitStatus] || "")}>
        {node.gitStatus === "modified" && <span>●</span>}
        {node.gitStatus === "added" && <span>+</span>}
        {node.gitStatus === "deleted" && <span>−</span>}
        {node.gitStatus === "renamed" && <span>→</span>}
        {node.gitStatus === "untracked" && <span>?</span>}
        {node.gitStatus === "ignored" && <span>🚫</span>}
        {node.gitStatus === "conflicted" && <span>!</span>}
      </span>
    ) : null;
    
    const handleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isDirectory) {
        toggleNode(node.path, !isExpanded);
      } else {
        selectNode(node.path, true);
        if (currentProject) {
          openFile(node.path, node.name, getFileLanguage(node.name));
        }
      }
    };
    
    const handleDoubleClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      if (isDirectory) {
        toggleNode(node.path, !isExpanded);
      }
    };
    
    const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      e.stopPropagation();
      selectNode(node.path, true);
      // Context menu would go here
    };
    
    const startRename = () => {
      setRenamingPath(node.path);
      setRenameValue(node.name);
    };
    
    const handleRenameSubmit = async () => {
      if (!currentProject || renameValue === node.name || !renameValue.trim()) {
        setRenamingPath(null);
        return;
      }
      
      const newPath = node.path.replace(node.name, renameValue.trim());
      await renameFile(currentProject, node.path, newPath);
      setRenamingPath(null);
    };
    
    const handleRenameKeyDown = (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleRenameSubmit();
      if (e.key === "Escape") setRenamingPath(null);
    };
    
    const handleDelete = async () => {
      if (!currentProject) return;
      if (confirm(`Delete ${node.name}?`)) {
        await deleteFile(currentProject, node.path);
      }
    };
    
    const handleNewFile = async () => {
      if (!currentProject || !isDirectory) return;
      const name = prompt("File name:");
      if (name) {
        await createFile(currentProject, `${node.path}/${name}`, false);
      }
    };
    
    const handleNewFolder = async () => {
      if (!currentProject || !isDirectory) return;
      const name = prompt("Folder name:");
      if (name) {
        await createFile(currentProject, `${node.path}/${name}`, true);
      }
    };
    
    const contextMenuItems = [
      { label: "New File", action: handleNewFile, icon: <FileText className="w-4 h-4" /> },
      { label: "New Folder", action: handleNewFolder, icon: <FolderPlus className="w-4 h-4" /> },
      { divider: true },
      { label: "Rename", action: startRename, icon: <Edit2 className="w-4 h-4" /> },
      { label: "Delete", action: handleDelete, icon: <Trash2 className="w-4 h-4" />, danger: true },
      { divider: true },
      { label: "Copy Path", action: () => navigator.clipboard.writeText(node.path), icon: <Copy className="w-4 h-4" /> },
    ];
    
    return (
      <div className="select-none" onContextMenu={handleContextMenu}>
        {/* Node */}
        <div
          className={cn(
            "flex items-center px-2 py-1.5 rounded-md transition-colors duration-fast",
            "hover:bg-valve-hover",
            isSelected && "bg-valve-accent/10 text-valve-accent",
            isRenaming && "bg-valve-accent/10"
          )}
          style={{ paddingLeft: `${8 + depth * 12}px` }}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
        >
          {hasChildren && (
            <button
              className="valve-icon-btn p-0.5 w-5 h-5 flex-shrink-0"
              onClick={(e) => {
                e.stopPropagation();
                toggleNode(node.path, !isExpanded);
              }}
              aria-label={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
          )}
          {!hasChildren && <div className="w-5 h-5 flex-shrink-0" />}
          
          {isRenaming ? (
            <input
              ref={renameInputRef}
              type="text"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              onKeyDown={handleRenameKeyDown}
              onBlur={handleRenameSubmit}
              className="valve-input flex-1 min-w-0 py-0.5 text-sm"
              autoFocus
            />
          ) : (
            <>
              <span className={cn("flex-shrink-0", isDirectory ? "text-valve-accent" : "")}>
                {isDirectory ? (
                  <Folder className="w-4 h-4" />
                ) : (
                  <File className="w-4 h-4" />
                )}
              </span>
              <span className="flex-1 min-w-0 truncate text-sm">{node.name}</span>
              {gitStatusIcon}
            </>
          )}
        </div>
        
        {/* Children */}
        {hasChildren && isExpanded && (
          <div className="overflow-hidden animate-in slide-in-from-top">
            {node.children!.map(child => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };
  
  if (!currentProject) {
    return (
      <div className="valve-sidebar flex flex-col h-full p-4 text-center text-valve-text-muted">
        <Folder className="w-12 h-12 mx-auto mb-4 opacity-50" />
        <p className="text-sm">No project open</p>
        <p className="text-xs mt-1">Open a folder to get started</p>
      </div>
    );
  }
  
  return (
    <div className="valve-sidebar flex flex-col h-full">
      {/* Explorer Header */}
      <div className="flex items-center justify-between p-2 border-b border-valve-border">
        <h3 className="font-medium text-sm text-valve-text-secondary">EXPLORER</h3>
        <div className="flex items-center gap-1">
          <Tooltip content="New File" position="bottom">
            <button className="valve-icon-btn p-1.5" onClick={() => currentProject && createFile(currentProject, "", false)}>
              <FileText className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="New Folder" position="bottom">
            <button className="valve-icon-btn p-1.5" onClick={() => currentProject && createFile(currentProject, "", true)}>
              <FolderPlus className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Refresh" position="bottom">
            <button className="valve-icon-btn p-1.5" onClick={refresh}>
              <RefreshCw className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Collapse All" position="bottom">
            <button className="valve-icon-btn p-1.5">
              <ChevronDown className="w-4 h-4 rotate-90" />
            </button>
          </Tooltip>
          <Tooltip content="More" position="bottom">
            <Dropdown
              trigger={<MoreHorizontal className="w-4 h-4" />}
              items={[
                { label: "Show Hidden Files", action: () => setShowHidden(!showHidden) },
                { label: "Settings", action: () => {} },
              ]}
            />
          </Tooltip>
        </div>
      </div>
      
      {/* Search/Filter */}
      <div className="p-2 border-b border-valve-border">
        <Input
          placeholder="Filter files..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          leftIcon={<Search className="w-4 h-4" />}
          className="text-sm"
        />
      </div>
      
      {/* File Tree */}
      <div className="flex-1 overflow-auto valve-scrollbar-thin p-1">
        {filteredTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-valve-text-muted">
            <FileText className="w-12 h-12 mb-4 opacity-50" />
            <p className="text-sm">No files found</p>
            {filter && <p className="text-xs">Try adjusting your filter</p>}
          </div>
        ) : (
          filteredTree.map(node => renderNode(node))
        )}
      </div>
      
      {/* Resize Handle */}
      <div
        ref={splitterRef}
        className="valve-splitter-vertical"
        onMouseDown={handleSplitterMouseDown}
        aria-label="Resize sidebar"
      />
    </div>
  );
}