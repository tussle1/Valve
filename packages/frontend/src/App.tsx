import { useEffect } from "react";
import { useStore } from "./stores/useStore";
import { ActivityBar } from "./components/layout/ActivityBar";
import { TopBar } from "./components/layout/TopBar";
import { FileExplorer } from "./components/explorer/FileExplorer";
import { CodeEditor } from "./components/editor/Editor";
import { AIChatPanel } from "./components/ai/AIChatPanel";
import { TerminalPanel } from "./components/terminal/Terminal";
import { GitPanel } from "./components/git/GitPanel";
import { cn } from "./utils";
import {
  LayoutDashboard,
  FileSearch,
  GitBranch,
  Plug,
} from "lucide-react";

function App() {
  const {
    sidebarOpen,
    sidebarWidth,
    aiPanelOpen,
    aiPanelWidth,
    bottomPanelOpen,
    bottomPanelHeight,
    activeActivity,
    setActiveActivity,
    theme,
    initialize,
  } = useStore();
  
  // Initialize store on mount
  useEffect(() => {
    initialize();
  }, [initialize]);
  
  // Handle keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl/Cmd + P - Command Palette
      if ((e.ctrlKey || e.metaKey) && e.key === "p") {
        e.preventDefault();
        // TODO: Open command palette
      }
      // Ctrl/Cmd + Shift + P - Command Palette
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === "P") {
        e.preventDefault();
        // TODO: Open command palette
      }
      // Ctrl/Cmd + ` - Toggle Terminal
      if ((e.ctrlKey || e.metaKey) && e.key === "`") {
        e.preventDefault();
        // TODO: Toggle terminal
      }
      // Ctrl/Cmd + B - Toggle Sidebar
      if ((e.ctrlKey || e.metaKey) && e.key === "b") {
        e.preventDefault();
        // TODO: Toggle sidebar
      }
      // Ctrl/Cmd + J - Toggle AI Panel
      if ((e.ctrlKey || e.metaKey) && e.key === "j") {
        e.preventDefault();
        // TODO: Toggle AI panel
      }
      // Escape - Close modals/panels
      if (e.key === "Escape") {
        // Handled by modals
      }
    };
    
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);
  
  // Apply theme
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);
  
  const sidebarStyle = {
    width: sidebarOpen ? sidebarWidth : 0,
    minWidth: sidebarOpen ? sidebarWidth : 0,
    maxWidth: sidebarOpen ? sidebarWidth : 0,
  };
  
  const editorMarginLeft = sidebarOpen ? sidebarWidth : 0;
  const editorMarginRight = aiPanelOpen ? aiPanelWidth : 0;
  const editorBottom = bottomPanelOpen ? bottomPanelHeight : 0;
  
  return (
    <div className="valve-bg flex h-screen w-screen overflow-hidden">
      {/* Activity Bar */}
      <ActivityBar />
      
      {/* Sidebar */}
      <div
        className={cn(
          "valve-sidebar flex flex-col transition-all duration-normal ease-out z-20",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
        style={sidebarStyle}
      >
        {/* Sidebar Tabs */}
        <div className="flex border-b border-valve-border bg-valve-panel/80 backdrop-blur-sm">
          {[
            { id: "explorer", label: "Explorer", icon: LayoutDashboard },
            { id: "search", label: "Search", icon: FileSearch },
            { id: "git", label: "Source Control", icon: GitBranch },
            { id: "extensions", label: "Extensions", icon: Plug },
          ].map(tab => (
            <button
              key={tab.id}
              className={cn(
                "valve-tab flex-1 py-2 text-center text-xs",
                activeActivity === tab.id ? "valve-tab-active" : "valve-tab-inactive"
              )}
              onClick={() => setActiveActivity(tab.id as any)}
            >
              <tab.icon className="w-4 h-4 mx-auto mb-1" />
              <span>{tab.label}</span>
            </button>
          ))}
        </div>
        
        {/* Sidebar Content */}
        <div className="flex-1 overflow-hidden">
          {activeActivity === "explorer" && <FileExplorer />}
          {activeActivity === "search" && <SearchPanel />}
          {activeActivity === "git" && <GitPanel />}
          {activeActivity === "extensions" && <ExtensionsPanel />}
        </div>
      </div>
      
      {/* Sidebar Resize Handle */}
      {sidebarOpen && (
        <div
          className="valve-splitter-vertical absolute z-10"
          style={{ left: sidebarWidth }}
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            
            const handleMouseMove = (e: MouseEvent) => {
              const delta = e.clientX - startX;
              // This would need a setSidebarWidth action
            };
            
            const handleMouseUp = () => {
              document.removeEventListener("mousemove", handleMouseMove);
              document.removeEventListener("mouseup", handleMouseUp);
            };
            
            document.addEventListener("mousemove", handleMouseMove);
            document.addEventListener("mouseup", handleMouseUp);
          }}
        />
      )}
      
      {/* Main Editor Area */}
      <main
        className="flex-1 flex flex-col overflow-hidden"
        style={{
          marginLeft: editorMarginLeft,
          marginRight: editorMarginRight,
          marginBottom: editorBottom,
        }}
      >
        <TopBar />
        <div className="flex-1 overflow-hidden">
          <CodeEditor />
        </div>
      </main>
      
      {/* AI Panel Resize Handle */}
      {aiPanelOpen && (
        <div
          className="valve-splitter-vertical absolute z-10"
          style={{ right: aiPanelWidth }}
          onMouseDown={(e) => {
            e.preventDefault();
            // Resize logic
          }}
        />
      )}
      
      {/* AI Chat Panel */}
      <AIChatPanel />
      
      {/* Bottom Panel */}
      <TerminalPanel />
      
      {/* Status Bar */}
      <StatusBar />
    </div>
  );
}

// Placeholder panels
function SearchPanel() {
  return (
    <div className="flex flex-col h-full p-4">
      <h3 className="font-medium text-sm text-valve-text-secondary mb-4">SEARCH</h3>
      <div className="flex-1 flex flex-col items-center justify-center text-valve-text-muted">
        <FileSearch className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-sm">Search functionality coming soon</p>
      </div>
    </div>
  );
}

function ExtensionsPanel() {
  return (
    <div className="flex flex-col h-full p-4">
      <h3 className="font-medium text-sm text-valve-text-secondary mb-4">EXTENSIONS</h3>
      <div className="flex-1 flex flex-col items-center justify-center text-valve-text-muted">
        <Plug className="w-16 h-16 mb-4 opacity-30" />
        <p className="text-sm">Extensions marketplace coming soon</p>
      </div>
    </div>
  );
}

function StatusBar() {
  const { activeTab } = useStore(state => ({
    activeTab: state.tabs.find(t => t.id === state.activeTabId),
  }));
  
  return (
    <footer className="flex items-center h-6 bg-valve-panel/80 backdrop-blur-sm border-t border-valve-border px-3 gap-4 text-xs text-valve-text-secondary">
      <div className="flex items-center gap-4 flex-1">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-valve-success" />
          Ready
        </span>
        {activeTab && (
          <span className="flex items-center gap-1">
            {activeTab.language}
          </span>
        )}
        <span className="flex items-center gap-1">
          UTF-8
        </span>
        <span className="flex items-center gap-1">
          LF
        </span>
        <span className="flex items-center gap-1">
          Spaces: 2
        </span>
      </div>
    </footer>
  );
}

export default App;