import React from "react";
import { cn } from "../../utils";
import { useStore } from "../../stores/useStore";
import {
  LayoutDashboard,
  FileSearch,
  GitBranch,
  MessageSquare,
  Bot,
  LayoutGrid,
  Bug,
  TestTube,
  Plug,
  Settings,
  ChevronDown,
} from "lucide-react";
import { Tooltip } from "../ui/Tooltip";

const ACTIVITY_ITEMS = [
  { id: "explorer", label: "Explorer", icon: LayoutDashboard, shortcut: "Ctrl+Shift+E" },
  { id: "search", label: "Search", icon: FileSearch, shortcut: "Ctrl+Shift+F" },
  { id: "git", label: "Source Control", icon: GitBranch, shortcut: "Ctrl+Shift+G" },
  { id: "ai-chat", label: "AI Chat", icon: MessageSquare, shortcut: "Ctrl+Shift+A" },
  { id: "ai-agents", label: "AI Agents", icon: Bot, shortcut: "Ctrl+Shift+J" },
  { id: "ai-arena", label: "Model Arena", icon: LayoutGrid, shortcut: "Ctrl+Shift+M" },
  { id: "debug", label: "Debug", icon: Bug, shortcut: "Ctrl+Shift+D" },
  { id: "test", label: "Testing", icon: TestTube, shortcut: "Ctrl+Shift+T" },
  { id: "extensions", label: "Extensions", icon: Plug, shortcut: "Ctrl+Shift+X" },
] as const;

export function ActivityBar() {
  const activeActivity = useStore(state => state.activeActivity);
  const setActiveActivity = useStore(state => state.setActiveActivity);
  const sidebarOpen = useStore(state => state.sidebarOpen);
  const setSidebarOpen = useStore(state => state.setSidebarOpen);
  const aiPanelOpen = useStore(state => state.aiPanelOpen);
  const setAIPanelOpen = useStore(state => state.setAIPanelOpen);
  
  const getPanelOpen = (activity: string) => {
    if (["explorer", "search", "git", "extensions"].includes(activity)) return sidebarOpen;
    if (["ai-chat", "ai-agents", "ai-arena"].includes(activity)) return aiPanelOpen;
    return true;
  };
  
  const handleClick = (id: typeof ACTIVITY_ITEMS[0]["id"]) => {
    const currentlyOpen = getPanelOpen(id);
    if (currentlyOpen && activeActivity === id) {
      // Toggle panel
      if (["explorer", "search", "git", "extensions"].includes(id)) {
        setSidebarOpen(false);
      } else {
        setAIPanelOpen(false);
      }
      setActiveActivity("explorer"); // Default
    } else {
      setActiveActivity(id);
      if (["explorer", "search", "git", "extensions"].includes(id)) {
        setSidebarOpen(true);
      } else if (["ai-chat", "ai-agents", "ai-arena"].includes(id)) {
        setAIPanelOpen(true);
      }
    }
  };
  
  return (
    <div className="valve-sidebar flex flex-col h-full w-12 border-r border-valve-border bg-valve-sidebar/80 backdrop-blur-sm">
      <div className="flex flex-col items-center pt-3 pb-2 space-y-1">
        {/* Valve Logo */}
        <button
          className="valve-icon-btn w-10 h-10 rounded-lg"
          aria-label="Valve IDE"
          title="Valve IDE"
        >
          <svg className="w-6 h-6 text-valve-accent" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.5L19.5 9 12 14.5 4.5 9 12 4.5zM4.5 9l7.5 5 7.5-5v7.5L12 21.5 4.5 16.5V9z"/>
          </svg>
        </button>
        
        {/* Activity Items */}
        <div className="flex flex-col items-center space-y-1 flex-1">
          {ACTIVITY_ITEMS.map(({ id, label, icon: Icon, shortcut }) => {
            const isActive = activeActivity === id;
            const isOpen = getPanelOpen(id);
            
            return (
              <Tooltip key={id} content={`${label}${shortcut ? ` (${shortcut})` : ""}`} position="right" delay={500}>
                <button
                  className={cn(
                    "valve-icon-btn w-10 h-10 rounded-lg relative",
                    isActive && "bg-valve-accent/10 text-valve-accent",
                    !isActive && "text-valve-text-muted hover:text-valve-text hover:bg-valve-hover",
                    isOpen && "bg-valve-panel/50"
                  )}
                  onClick={() => handleClick(id)}
                  aria-label={label}
                  aria-pressed={isActive}
                  role="tab"
                >
                  <Icon className="w-5 h-5" />
                  {isActive && !isOpen && (
                    <span className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-valve-accent rounded-r-lg" />
                  )}
                </button>
              </Tooltip>
            );
          })}
        </div>
        
        {/* Settings */}
        <Tooltip content="Settings (Ctrl+,)" position="right" delay={500}>
          <button
            className="valve-icon-btn w-10 h-10 rounded-lg text-valve-text-muted hover:text-valve-text hover:bg-valve-hover"
            aria-label="Settings"
          >
            <Settings className="w-5 h-5" />
          </button>
        </Tooltip>
      </div>
      
      {/* Panel Toggle */}
      <div className="p-2 border-t border-valve-border">
        <button
          className="valve-icon-btn w-full justify-center"
          onClick={() => {
            if (["explorer", "search", "git", "extensions"].includes(activeActivity)) {
              setSidebarOpen(!sidebarOpen);
            } else {
              setAIPanelOpen(!aiPanelOpen);
            }
          }}
          aria-label={sidebarOpen || aiPanelOpen ? "Hide panel" : "Show panel"}
          title={sidebarOpen || aiPanelOpen ? "Hide panel" : "Show panel"}
        >
          <ChevronDown 
            className={cn(
              "w-5 h-5 transition-transform duration-fast",
              (sidebarOpen || aiPanelOpen) && "rotate-180"
            )} 
          />
        </button>
      </div>
    </div>
  );
}