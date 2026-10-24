import React, { useEffect, useRef, useState, useCallback } from "react";
import { cn } from "../../utils";
import { useStore, useTerminal } from "../../stores/useStore";
import { Button } from "../ui/Button";
import { Tooltip } from "../ui/Tooltip";
import { Dropdown } from "../ui/Dropdown";
import {
  Plus,
  X,
  ChevronDown,
  Square,
  Maximize2,
  Minimize2,
  Trash2,
  Copy,
  Search,
  Terminal as TerminalIcon,
  Zap,
  Settings,
  MoreHorizontal,
} from "lucide-react";
import { Terminal as XTermTerminal } from "xterm";
import "xterm/css/xterm.css";

export function TerminalPanel() {
  const { sessions, activeTerminalId, activeSession, createSession, closeSession, resizeSession, writeToSession, setActiveTerminal } = useTerminal();
  const bottomPanelOpen = useStore(state => state.bottomPanelOpen);
  const bottomPanelHeight = useStore(state => state.bottomPanelHeight);
  const setBottomPanelHeight = useStore(state => state.setBottomPanelHeight);
  const bottomPanelTab = useStore(state => state.bottomPanelTab);
  const setBottomPanelTab = useStore(state => state.setBottomPanelTab);
  const addNotification = useStore(state => state.addNotification);
  
  const terminalRefs = useRef<Map<string, XTermTerminal>>(new Map());
  const containerRefs = useRef<Map<string, HTMLDivElement>>(new Map());
  const [showNewTerminal, setShowNewTerminal] = useState(false);
  const splitterRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ y: 0, height: 0 });
  
  // Handle panel resize
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = { y: e.clientY, height: bottomPanelHeight };
    
    const handleMouseMove = (e: MouseEvent) => {
      const delta = dragStartRef.current.y - e.clientY;
      setBottomPanelHeight(Math.max(100, Math.min(600, dragStartRef.current.height + delta)));
    };
    
    const handleMouseUp = () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    document.body.style.cursor = "row-resize";
    document.body.style.userSelect = "none";
  };
  
  // Initialize terminal for a session
  const initializeTerminal = useCallback((sessionId: string) => {
    if (terminalRefs.current.has(sessionId)) return;
    
    const container = containerRefs.current.get(sessionId);
    if (!container) return;
    
    const term = new XTermTerminal({
      cursorBlink: true,
      fontSize: 13,
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
      theme: {
        background: "#101114",
        foreground: "#F1F2F5",
        cursor: "#8B5CF6",
        selection: "#8B5CF640",
        black: "#1E1E1E",
        red: "#EF4444",
        green: "#22C55E",
        yellow: "#F59E0B",
        blue: "#3B82F6",
        magenta: "#A855F7",
        cyan: "#06B6D4",
        white: "#E5E7EB",
        brightBlack: "#6B7280",
        brightRed: "#F87171",
        brightGreen: "#4ADE80",
        brightYellow: "#FBBF24",
        brightBlue: "#60A5FA",
        brightMagenta: "#C084FC",
        brightCyan: "#22D3EE",
        brightWhite: "#F9FAFB",
      },
      convertEol: true,
      scrollback: 10000,
    });
    
    term.open(container);
    
    // Handle input
    term.onData((data) => {
      writeToSession(sessionId, data);
    });
    
    // Handle resize
    const resizeObserver = new ResizeObserver(() => {
      // fit would go here
    });
    resizeObserver.observe(container);
    
    // Connect to WebSocket
    const ws = new WebSocket(`ws://localhost:3001/ws/terminal?sessionId=${sessionId}`);
    
    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === "output") {
          term.write(msg.data);
        } else if (msg.type === "error") {
          term.write(`\r\n\x1b[31m${msg.data}\x1b[0m\r\n`);
        }
      } catch {}
    };
    
    ws.onclose = () => {
      term.write("\r\n\x1b[90m[Connection closed]\x1b[0m\r\n");
    };
    
    terminalRefs.current.set(sessionId, { term, ws, resizeObserver });
  }, [writeToSession]);
  
  // Cleanup terminal
  const cleanupTerminal = useCallback((sessionId: string) => {
    const entry = terminalRefs.current.get(sessionId);
    if (entry) {
      entry.term.dispose();
      entry.ws?.close();
      entry.resizeObserver.disconnect();
      terminalRefs.current.delete(sessionId);
    }
    containerRefs.current.delete(sessionId);
  }, []);
  
  // Create new terminal
  const handleNewTerminal = async () => {
    try {
      const session = await createSession({});
      initializeTerminal(session.id);
      setShowNewTerminal(false);
    } catch (error) {
      addNotification({ type: "error", title: "Failed to create terminal", message: error instanceof Error ? error.message : "Unknown error" });
    }
  };
  
  // Handle tab change
  useEffect(() => {
    if (activeTerminalId) {
      initializeTerminal(activeTerminalId);
    }
    
    // Cleanup inactive terminals
    const activeIds = new Set(sessions.map(s => s.id));
    terminalRefs.current.forEach((_, id) => {
      if (!activeIds.has(id)) {
        cleanupTerminal(id);
      }
    });
  }, [activeTerminalId, sessions, initializeTerminal, cleanupTerminal]);
  
  // Fit terminal on resize
  useEffect(() => {
    if (activeTerminalId) {
      const entry = terminalRefs.current.get(activeTerminalId);
      if (entry) {
        setTimeout(() => {
          // fit would go here
        }, 0);
      }
    }
  }, [bottomPanelHeight, activeTerminalId]);
  
  if (!bottomPanelOpen || bottomPanelTab !== "terminal") return null;
  
  // Render terminal content separately to avoid JSX parsing issues
  const renderTerminalContent = () => {
    if (sessions.length === 0) {
      return (
        <div className="flex flex-col items-center justify-center h-full p-8 text-valve-text-muted">
          <TerminalIcon className="w-16 h-16 mb-4 opacity-30" />
          <p className="text-sm">No terminal sessions</p>
          <Button variant="primary" onClick={handleNewTerminal} className="mt-2">
            <Plus className="w-4 h-4 mr-1" />
            New Terminal
          </Button>
        </div>
      );
    }
    
    return sessions.map(session => (
      <div
        key={session.id}
        className={cn("absolute inset-0", activeTerminalId === session.id ? "block" : "hidden")}
        ref={(el) => {
          if (el) containerRefs.current.set(session.id, el);
        }}
      />
    ));
  };
  
  if (!bottomPanelOpen || bottomPanelTab !== "terminal") return null;
  
  return (
    <div className="fixed bottom-0 left-0 right-0 z-30 flex flex-col valve-bg border-t border-valve-border shadow-xl animate-in slide-in-from-bottom"
         style={{ height: bottomPanelHeight }}>
      {/* Resize Handle */}
      <div
        ref={splitterRef}
        className="valve-splitter-horizontal"
        onMouseDown={handleSplitterMouseDown}
        aria-label="Resize terminal panel"
      />
      
      {/* Header */}
      <div className="flex items-center justify-between h-8 px-3 border-b border-valve-border bg-valve-panel/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <TerminalIcon className="w-4 h-4 text-valve-accent" />
          <span className="font-medium text-sm text-valve-text">Terminal</span>
        </div>
        <div className="flex items-center gap-1">
          {/* Terminal Tabs */}
          <div className="flex items-center gap-1 border-r border-valve-border pr-2 mr-2">
            {sessions.map(session => (
              <button
                key={session.id}
                className={cn(
                  "valve-tab px-2 py-1 text-xs",
                  activeTerminalId === session.id ? "valve-tab-active" : "valve-tab-inactive"
                )}
                onClick={() => setActiveTerminal(session.id)}
              >
                <span className="flex items-center gap-1">
                  {session.status === "running" && <span className="w-1.5 h-1.5 rounded-full bg-valve-success" />}
                  {session.title}
                </span>
                <button
                  className="valve-icon-btn p-0.5 ml-1 opacity-0 group-hover:opacity-100"
                  onClick={(e) => { e.stopPropagation(); closeSession(session.id); }}
                >
                  <X className="w-3 h-3" />
                </button>
              </button>
            ))}
            <Tooltip content="New Terminal" position="bottom">
              <button className="valve-icon-btn p-1.5" onClick={handleNewTerminal}>
                <Plus className="w-3 h-3" />
              </button>
            </Tooltip>
          </div>
          
          <Tooltip content="Maximize/Minimize" position="bottom">
            <button className="valve-icon-btn p-1.5" onClick={() => setBottomPanelHeight(bottomPanelHeight > 300 ? 150 : 400)}>
              {bottomPanelHeight > 300 ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </Tooltip>
          <Tooltip content="Close Panel" position="bottom">
            <button className="valve-icon-btn p-1.5" onClick={() => setBottomPanelOpen(false)}>
              <X className="w-4 h-4" />
            </button>
          </Tooltip>
        </div>
      </div>
      
      {/* Terminal Content */}
      <div className="flex-1 overflow-hidden relative">
        {renderTerminalContent()}
      </div>
    </div>
  );
}
