import React, { useEffect, useRef, useCallback, useState } from "react";
import Editor from "@monaco-editor/react";
import { cn } from "../../utils";
import { useStore, useTabs } from "../../stores/useStore";
import { Button } from "../ui/Button";
import { Tooltip } from "../ui/Tooltip";
import { Dropdown } from "../ui/Dropdown";
import {
  X,
  ChevronDown,
  Split,
  Search,
  Replace,
  Minimize2,
  Maximize2,
  Copy,
  Save,
  GitBranch,
  Zap,
  Sparkles,
  MoreHorizontal,
} from "lucide-react";
import { getFileLanguage } from "../../utils";
import { marked } from "marked";
import DOMPurify from "dompurify";

interface EditorProps {
  onSplit?: () => void;
  onCloseTab?: (tabId: string) => void;
}

export function CodeEditor({ onSplit, onCloseTab }: EditorProps) {
  const { tabs, activeTabId, activeTab, setActiveTab, updateTab, markDirty, updateCursorPosition, closeTab } = useTabs();
  const splitDirection = useStore(state => state.splitDirection);
  const setSplitDirection = useStore(state => state.setSplitDirection);
  const aiPanelOpen = useStore(state => state.aiPanelOpen);
  const currentModel = useStore(state => state.currentModel);
  const models = useStore(state => state.models);
  const setCurrentModel = useStore(state => state.setCurrentModel);
  const addNotification = useStore(state => state.addNotification);
  
  const editorRef = useRef<any>(null);
  const [content, setContent] = useState("");
  const [language, setLanguage] = useState("plaintext");
  const [dirty, setDirty] = useState(false);
  const [cursorPosition, setCursorPosition] = useState({ line: 1, column: 1 });
  const [selection, setSelection] = useState<{ startLine: number; startColumn: number; endLine: number; endColumn: number } | null>(null);
  const [minimap, setMinimap] = useState(true);
  const [wordWrap, setWordWrap] = useState(false);
  
  // Load file content when tab changes
  useEffect(() => {
    if (activeTab) {
      // In a real implementation, load from backend
      // For now, use placeholder content
      setContent(`// ${activeTab.label}\n// File: ${activeTab.filePath}\n\nfunction hello() {\n  console.log("Hello, Valve IDE!");\n}\n\nhello();`);
      setLanguage(getFileLanguage(activeTab.label));
      setDirty(activeTab.isDirty);
    } else {
      setContent("");
      setLanguage("plaintext");
      setDirty(false);
    }
  }, [activeTab]);
  
  const handleEditorMount = (editor: any, monaco: any) => {
    editorRef.current = editor;
    
    // Set up change listener
    editor.onDidChangeModelContent(() => {
      if (!dirty) {
        setDirty(true);
        markDirty(activeTabId!, true);
      }
    });
    
    // Set up cursor position listener
    editor.onDidChangeCursorPosition((e: any) => {
      const pos = e.position;
      setCursorPosition({ line: pos.lineNumber, column: pos.column });
      updateCursorPosition(activeTabId!, { line: pos.lineNumber, column: pos.column });
    });
    
    // Set up selection listener
    editor.onDidChangeCursorSelection((e: any) => {
      const sel = e.selection;
      if (sel.startLineNumber !== sel.endLineNumber || sel.startColumn !== sel.endColumn) {
        setSelection({
          startLine: sel.startLineNumber,
          startColumn: sel.startColumn,
          endLine: sel.endLineNumber,
          endColumn: sel.endColumn,
        });
      } else {
        setSelection(null);
      }
    });
  };
  
  const handleSave = async () => {
    if (!activeTab) return;
    // In real implementation, save to backend
    setDirty(false);
    markDirty(activeTabId!, false);
    addNotification({ type: "success", title: "Saved", message: `${activeTab.label} saved` });
  };
  
  const handleClose = () => {
    if (activeTabId) {
      if (dirty) {
        if (!confirm(`${activeTab?.label} has unsaved changes. Close anyway?`)) return;
      }
      closeTab(activeTabId);
      onCloseTab?.(activeTabId);
    }
  };
  
  const handleSplit = () => {
    setSplitDirection(splitDirection === "vertical" ? "horizontal" : "vertical");
    onSplit?.();
  };
  
  const tabsWithIndex = tabs.map((tab, index) => ({
    ...tab,
    index,
    isActive: tab.id === activeTabId,
  }));
  
  return (
    <div className="flex flex-col flex-1 h-full valve-bg">
      {/* Tab Bar */}
      <div className="flex items-center h-8 bg-valve-panel/80 backdrop-blur-sm border-b border-valve-border px-2 gap-1 overflow-x-auto valve-scrollbar-thin">
        {tabsWithIndex.map((tab) => (
          <button
            key={tab.id}
            className={cn(
              "valve-tab relative flex-shrink-0 min-w-[120px] max-w-[200px]",
              tab.isActive ? "valve-tab-active" : "valve-tab-inactive"
            )}
            onClick={() => setActiveTab(tab.id)}
            onMouseDown={(e) => {
              if (e.button === 1) { // Middle click to close
                e.preventDefault();
                closeTab(tab.id);
              }
            }}
            title={tab.filePath}
          >
            <span className="flex items-center gap-1.5 truncate">
              {tab.isDirty && <span className="text-valve-accent">●</span>}
              <span className="truncate">{tab.label}</span>
            </span>
            <button
              className="valve-icon-btn p-0.5 ml-1 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => {
                e.stopPropagation();
                closeTab(tab.id);
              }}
              aria-label="Close tab"
            >
              <X className="w-3 h-3" />
            </button>
          </button>
        ))}
        
        {/* New Tab Button */}
        <button className="valve-btn-ghost p-1.5 ml-1" aria-label="New File">
          <Plus className="w-4 h-4" />
        </button>
        
        {/* Tab Actions */}
        <div className="flex items-center gap-1 ml-auto">
          <Tooltip content="Split Editor" position="bottom">
            <button className="valve-icon-btn p-1.5" onClick={handleSplit}>
              <Split className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Minimize/Maximize" position="bottom">
            <button className="valve-icon-btn p-1.5">
              {splitDirection ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
            </button>
          </Tooltip>
        </div>
      </div>
      
      {/* Editor Area */}
      <div className="flex-1 relative overflow-hidden">
        {activeTab ? (
          <Editor
            height="100%"
            language={language}
            value={content}
            onChange={(value) => {
              if (value !== undefined) {
                setContent(value);
              }
            }}
            onMount={handleEditorMount}
            options={{
              minimap: { enabled: minimap },
              wordWrap: wordWrap ? "on" : "off",
              lineNumbers: "on",
              fontSize: 14,
              fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', monospace",
              tabSize: 2,
              insertSpaces: true,
              scrollBeyondLastLine: true,
              smoothScrolling: true,
              cursorBlinking: "blink",
              cursorSmoothCaretAnimation: "on",
              renderWhitespace: "selection",
              bracketPairColorization: { enabled: true },
              guides: {
                indentation: true,
                bracketPairs: true,
              },
              hover: true,
              quickSuggestions: true,
              suggestOnTriggerCharacters: true,
              acceptSuggestionOnEnter: "on",
              tabCompletion: "on",
              parameterHints: { enabled: true },
              inlineHints: { enabled: true },
              codeLens: true,
              folding: true,
              matchBrackets: "always",
              autoClosingBrackets: "always",
              autoClosingQuotes: "always",
              formatOnPaste: true,
              formatOnType: true,
              lightbulb: { enabled: true },
              stickyScroll: { enabled: true },
            }}
            theme="vs-dark"
            defaultValue={content}
          />
        ) : (
          // Welcome Screen
          <div className="flex flex-col items-center justify-center h-full p-8 text-valve-text-secondary">
            <div className="w-24 h-24 mb-6 text-valve-accent/20">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-full h-full">
                <path d="M12 2L2 7v10l10 5 10-5V7L12 2zm0 2.5L19.5 9 12 14.5 4.5 9 12 4.5zM4.5 9l7.5 5 7.5-5v7.5L12 21.5 4.5 16.5V9z"/>
              </svg>
            </div>
            <h2 className="text-2xl font-semibold text-valve-text mb-2">Welcome to Valve IDE</h2>
            <p className="text-valve-text-muted mb-6 max-w-md text-center">
              Open a file or create a new one to start coding with AI assistance.
            </p>
            <div className="flex gap-3">
              <Button variant="primary" onClick={() => addNotification({ type: "info", title: "New File", message: "Create a new file" })}>
                New File
              </Button>
              <Button variant="secondary" onClick={() => addNotification({ type: "info", title: "Open Folder", message: "Open a project folder" })}>
                Open Folder
              </Button>
              <Button variant="secondary" onClick={() => addNotification({ type: "info", title: "Clone Repository", message: "Clone a Git repository" })}>
                Clone Repository
              </Button>
            </div>
          </div>
        )}
        
        {/* AI Inline Suggestions Overlay (placeholder) */}
        {false && (
          <div className="absolute bottom-4 right-4 valve-panel p-2 rounded shadow-lg z-10 max-w-md">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-valve-accent" />
              <span className="text-sm font-medium">AI Suggestion</span>
            </div>
            <pre className="text-xs bg-valve-bg p-2 rounded overflow-x-auto"><code>const result = await fetchData();\nreturn result.json();</code></pre>
            <div className="flex gap-2 mt-2">
              <Button variant="primary" size="sm">Accept</Button>
              <Button variant="ghost" size="sm">Dismiss</Button>
            </div>
          </div>
        )}
      </div>
      
      {/* Status Bar */}
      <div className="flex items-center h-6 bg-valve-panel/80 backdrop-blur-sm border-t border-valve-border px-3 gap-4 text-xs text-valve-text-secondary">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1">
            <GitBranch className="w-3 h-3" />
            main
          </span>
          <span className="flex items-center gap-1">
            <span>{cursorPosition.line}:{cursorPosition.column}</span>
            {selection && (
              <span className="ml-2">Sel: {selection.endLine - selection.startLine + 1} lines</span>
            )}
          </span>
          <span className="flex items-center gap-1">
            {language}
          </span>
          <span className="flex items-center gap-1">
            UTF-8
          </span>
          <span className="flex items-center gap-1">
            LF
          </span>
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          <Tooltip content="Word Wrap" position="top">
            <button className={cn("valve-icon-btn p-1", wordWrap && "text-valve-accent")} onClick={() => setWordWrap(!wordWrap)}>
              <span className="text-[10px] font-mono">{wordWrap ? "⟳" : "⟳"}</span>
            </button>
          </Tooltip>
          <Tooltip content="Minimap" position="top">
            <button className={cn("valve-icon-btn p-1", minimap && "text-valve-accent")} onClick={() => setMinimap(!minimap)}>
              <span className="text-[10px]">▣</span>
            </button>
          </Tooltip>
          <Tooltip content="AI Model" position="top">
            <Dropdown
              trigger={
                <button className="valve-btn-ghost p-1.5 gap-1">
                  <Sparkles className="w-3 h-3 text-valve-accent" />
                  <span className="truncate max-w-[120px] font-mono">
                    {currentModel ? models.find(m => m.id === currentModel)?.displayName : "Select Model"}
                  </span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              }
              items={models.slice(0, 10).map(m => ({
                label: m.displayName,
                action: () => setCurrentModel(m.id),
              }))}
            />
          </Tooltip>
        </div>
      </div>
    </div>
  );
}