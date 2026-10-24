import React from "react";
import { cn } from "../../utils";
import { useStore } from "../../stores/useStore";
import { useTabs } from "../../hooks";
import { Button } from "../ui/Button";
import { Dropdown } from "../ui/Dropdown";
import { Input } from "../ui/Input";
import { Tooltip } from "../ui/Tooltip";
import {
  Search,
  GitBranch,
  Zap,
  Bell,
  Settings,
  ChevronDown,
  MoreHorizontal,
  Sparkles,
  Copy,
  Check,
  X,
} from "lucide-react";

export function TopBar() {
  const { activeTab, openFile } = useTabs();
  const currentModel = useStore(state => state.currentModel);
  const currentProvider = useStore(state => state.currentProvider);
  const models = useStore(state => state.models);
  const setCurrentModel = useStore(state => state.setCurrentModel);
  const setModelPickerOpen = useStore(state => state.setModelPickerOpen);
  const modelPickerOpen = useStore(state => state.modelPickerOpen);
  const activeActivity = useStore(state => state.activeActivity);
  const notifications = useStore(state => state.notifications);
  const removeNotification = useStore(state => state.removeNotification);
  const addNotification = useStore(state => state.addNotification);
  
  const currentTab = activeTab;
  
  // Model picker items
  const modelItems = models.map(model => ({
    label: model.displayName,
    action: () => setCurrentModel(model.id),
    icon: model.favorite ? <span className="text-yellow-400">★</span> : undefined,
    shortcut: model.executionEnvironment === "local" ? "Local" : model.provider,
  }));
  
  const handleGlobalSearch = () => {
    // Open command palette
    addNotification({
      type: "info",
      title: "Command Palette",
      message: "Press Ctrl+Shift+P to open command palette",
    });
  };
  
  return (
    <header className="flex items-center h-10 bg-valve-panel/80 backdrop-blur-sm border-b border-valve-border px-4 gap-4">
      {/* Logo & Project Name */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <span className="text-lg font-semibold text-valve-text">Valve</span>
        <span className="valve-badge bg-valve-accent/10 text-valve-accent text-xs">IDE</span>
      </div>
      
      {/* Global Search / Command Palette */}
      <div className="flex-1 max-w-xl">
        <Tooltip content="Search / Command Palette (Ctrl+P)" position="bottom">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-valve-text-muted" />
            <input
              type="text"
              placeholder="Search files, commands, symbols... (Ctrl+P)"
              className="valve-input pl-10 py-1.5 text-sm bg-valve-bg border-valve-border/50 focus:border-valve-accent"
              onClick={handleGlobalSearch}
              readOnly
            />
            <kbd className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-valve-text-muted px-1.5 py-0.5 bg-valve-bg rounded">Ctrl+P</kbd>
          </div>
        </Tooltip>
      </div>
      
      {/* Git Branch */}
      <Tooltip content="Git Branch" position="bottom">
        <Button variant="ghost" size="sm" className="gap-1">
          <GitBranch className="w-4 h-4" />
          <span className="text-valve-text-secondary font-mono">main</span>
          <ChevronDown className="w-3 h-3" />
        </Button>
      </Tooltip>
      
      {/* Running Tasks Indicator */}
      <Tooltip content="Running Tasks" position="bottom">
        <Button variant="ghost" size="sm" className="gap-1 text-valve-accent">
          <Zap className="w-4 h-4 animate-pulse" />
          <span className="valve-badge-accent">2</span>
        </Button>
      </Tooltip>
      
      {/* Model Selector */}
      <Tooltip content="AI Model (Ctrl+Shift+M)" position="bottom">
        <Button
          variant="secondary"
          size="sm"
          className="gap-1 min-w-[180px] justify-between"
          onClick={() => setModelPickerOpen(!modelPickerOpen)}
        >
          <Sparkles className="w-4 h-4 text-valve-accent" />
          <span className="truncate text-valve-text font-mono text-xs flex-1">
            {currentModel ? models.find(m => m.id === currentModel)?.displayName : "Select Model"}
          </span>
          <ChevronDown className="w-3 h-3 flex-shrink-0" />
        </Button>
      </Tooltip>
      
      {/* Notifications */}
      <Tooltip content="Notifications" position="bottom">
        <Button variant="ghost" size="sm" className="relative">
          <Bell className="w-4 h-4" />
          {notifications.length > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-valve-error text-white text-xs font-medium rounded-full flex items-center justify-center">
              {notifications.length > 9 ? "9+" : notifications.length}
            </span>
          )}
        </Button>
      </Tooltip>
      
      {/* Settings */}
      <Tooltip content="Settings (Ctrl+,)" position="bottom">
        <Button variant="ghost" size="sm">
          <Settings className="w-4 h-4" />
        </Button>
      </Tooltip>
      
      {/* Window Controls (for desktop) */}
      <div className="flex items-center gap-1 ml-2 border-l border-valve-border pl-2">
        <Button variant="ghost" size="sm" className="p-1.5">
          <MoreHorizontal className="w-4 h-4" />
        </Button>
      </div>
    </header>
  );
}