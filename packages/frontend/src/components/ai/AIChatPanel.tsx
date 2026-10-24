import React, { useState, useRef, useEffect, useCallback } from "react";
import { cn } from "../../utils";
import { useStore } from "../../stores/useStore";
import { useAIChat, useNotifications } from "../../hooks";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Dropdown } from "../ui/Dropdown";
import { Tooltip } from "../ui/Tooltip";
import { Modal } from "../ui/Modal";
import { marked } from "marked";
import DOMPurify from "dompurify";
import {
  Send,
  X,
  Plus,
  Paperclip,
  Sparkles,
  ChevronDown,
  Copy,
  Check,
  RotateCw,
  MoreHorizontal,
  FileText,
  FolderOpen,
  Terminal,
  GitBranch,
  Zap,
  Settings,
} from "lucide-react";
import { formatRelativeTime } from "../../utils";

export function AIChatPanel() {
  const { currentModel, currentProvider, models, providers, createConversation, sendMessage, loadModels, setCurrentModel, setModelPickerOpen, modelPickerOpen } = useAIChat();
  const { addNotification, notify } = useNotifications();
  const aiPanelOpen = useStore(state => state.aiPanelOpen);
  const setAIPanelOpen = useStore(state => state.setAIPanelOpen);
  const aiPanelWidth = useStore(state => state.aiPanelWidth);
  const setAIPanelWidth = useStore(state => state.setAIPanelWidth);
  const conversations = useStore(state => state.conversations);
  const currentConversation = useStore(state => state.currentConversation);
  const setCurrentConversation = useStore(state => state.setCurrentConversation);
  
  const [input, setInput] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [messages, setMessages] = useState<Array<{
    id: string;
    role: "user" | "assistant" | "system";
    content: string;
    timestamp: Date;
    modelId?: string;
    providerId?: string;
    tokens?: number;
    streaming?: boolean;
    error?: string;
  }>>([]);
  const [showAttachments, setShowAttachments] = useState(false);
  const [attachments, setAttachments] = useState<Array<{ type: string; path: string; content: string }>>([]);
  const [showModelPicker, setShowModelPicker] = useState(false);
  const [newConversationTitle, setNewConversationTitle] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const splitterRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef({ x: 0, width: 0 });
  
  // Scroll to bottom
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);
  
  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);
  
  // Handle splitter drag
  const handleSplitterMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    dragStartRef.current = { x: e.clientX, width: aiPanelWidth };
    
    const handleMouseMove = (e: MouseEvent) => {
      const delta = dragStartRef.current.x - e.clientX; // Reverse for right panel
      setAIPanelWidth(Math.max(300, Math.min(800, dragStartRef.current.width + delta)));
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
  
  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!input.trim() && attachments.length === 0) return;
    if (!currentConversation) return;
    
    const userMessage = {
      id: crypto.randomUUID(),
      role: "user" as const,
      content: input,
      timestamp: new Date(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    
    setMessages(prev => [...prev, userMessage]);
    const assistantMessageId = crypto.randomUUID();
    const assistantMessage = {
      id: assistantMessageId,
      role: "assistant" as const,
      content: "",
      timestamp: new Date(),
      streaming: true,
    };
    setMessages(prev => [...prev, assistantMessage]);
    
    const currentInput = input;
    const currentAttachments = attachments;
    setInput("");
    setAttachments([]);
    setStreaming(true);
    
    try {
      const response = await sendMessage(currentConversation, {
        content: currentInput,
        attachments: currentAttachments,
        stream: true,
      });
      
      if (!response.ok) throw new Error("Failed to send message");
      
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let fullContent = "";
      
      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");
          
          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;
              
              try {
                const parsed = JSON.parse(data);
                const delta = parsed.choices?.[0]?.delta?.content;
                if (delta) {
                  fullContent += delta;
                  setMessages(prev => prev.map(m => 
                    m.id === assistantMessageId ? { ...m, content: fullContent } : m
                  ));
                }
                
                if (parsed.choices?.[0]?.finish_reason) {
                  setMessages(prev => prev.map(m => 
                    m.id === assistantMessageId ? { ...m, streaming: false, tokens: parsed.usage?.total_tokens } : m
                  ));
                }
              } catch {}
            }
          }
        }
      }
    } catch (error) {
      setMessages(prev => prev.map(m => 
        m.id === assistantMessageId ? { ...m, streaming: false, error: error instanceof Error ? error.message : "Error" } : m
      ));
      notify("error", "Failed to send message", error instanceof Error ? error.message : "Unknown error");
    } finally {
      setStreaming(false);
    }
  };
  
  const handleNewConversation = () => {
    if (!newConversationTitle.trim()) return;
    createConversation({
      title: newConversationTitle,
      modelId: currentModel || models[0]?.id || "",
      providerId: currentProvider || providers[0]?.id || "",
    }).then(conv => {
      setCurrentConversation(conv.id);
      setMessages([]);
      setNewConversationTitle("");
    }).catch(err => {
      notify("error", "Failed to create conversation", err.message);
    });
  };
  
  const renderMessage = (msg: typeof messages[0]) => {
    const isUser = msg.role === "user";
    const isError = msg.error;
    
    return (
      <div key={msg.id} className={cn("flex gap-3 animate-in slide-in-from-bottom", isUser && "flex-row-reverse")}>
        <div className={cn("flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium", isUser ? "bg-valve-accent/20 text-valve-accent" : "bg-valve-panel border border-valve-border")}>
          {isUser ? "U" : <Sparkles className="w-4 h-4 text-valve-accent" />}
        </div>
        <div className={cn("flex-1 min-w-0", isUser ? "text-right" : "")}>
          <div className={cn("valve-panel p-3 rounded-lg max-w-full", isUser ? "bg-valve-accent/10 border-valve-accent/20" : "")}>
            {msg.attachments && msg.attachments.length > 0 && (
              <div className="mb-2 flex flex-wrap gap-1">
                {msg.attachments.map((att, i) => (
                  <span key={i} className="valve-badge bg-valve-panel border border-valve-border text-xs">
                    {att.path}
                  </span>
                ))}
              </div>
            )}
            <div className={cn("prose prose-sm prose-invert max-w-none markdown-content", isError && "text-valve-error")}>
              {msg.streaming ? (
                <span>{DOMPurify.sanitize(marked.parse(msg.content || ""))}█</span>
              ) : (
                DOMPurify.sanitize(marked.parse(msg.content || ""))
              )}
            </div>
            {isError && (
              <div className="mt-2 p-2 bg-valve-error/10 border border-valve-error/30 rounded text-valve-error text-sm">
                Error: {msg.error}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 mt-1 text-xs text-valve-text-muted">
            <span>{formatRelativeTime(msg.timestamp)}</span>
            {msg.modelId && (
              <>
                <span>•</span>
                <span className="font-mono">{models.find(m => m.id === msg.modelId)?.displayName || msg.modelId}</span>
              </>
            )}
            {msg.tokens && (
              <>
                <span>•</span>
                <span>{formatTokenCount(msg.tokens)} tokens</span>
              </>
            )}
            {!isUser && !msg.streaming && (
              <div className="flex items-center gap-1 ml-auto">
                <Tooltip content="Copy" position="top">
                  <button className="valve-icon-btn p-1" onClick={() => navigator.clipboard.writeText(msg.content)}>
                    <Copy className="w-3 h-3" />
                  </button>
                </Tooltip>
                <Tooltip content="Regenerate" position="top">
                  <button className="valve-icon-btn p-1" onClick={() => handleSend()}>
                    <RotateCw className="w-3 h-3" />
                  </button>
                </Tooltip>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
  
  if (!aiPanelOpen) return null;
  
  return (
    <div className="fixed right-0 top-10 bottom-6 z-40 flex flex-col valve-bg border-l border-valve-border shadow-xl animate-in slide-in-from-right"
         style={{ width: aiPanelWidth }}>
      {/* Resize Handle */}
      <div
        ref={splitterRef}
        className="valve-splitter-vertical"
        onMouseDown={handleSplitterMouseDown}
        aria-label="Resize AI panel"
      />
      
      {/* Header */}
      <div className="flex items-center justify-between p-3 border-b border-valve-border bg-valve-panel/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-sm text-valve-text">AI Assistant</h3>
          {currentConversation && (
            <span className="valve-badge bg-valve-accent/10 text-valve-accent text-xs">
              {conversations.find(c => c.id === currentConversation)?.title || "New Chat"}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <Tooltip content="New Conversation" position="bottom">
            <button className="valve-icon-btn p-1.5" onClick={() => setCurrentConversation(null)}>
              <Plus className="w-4 h-4" />
            </button>
          </Tooltip>
          <Tooltip content="Model" position="bottom">
            <Dropdown
              trigger={
                <button className={cn("valve-btn-ghost p-1.5 gap-1", currentModel && "text-valve-accent")}>
                  <Sparkles className="w-4 h-4" />
                  {currentModel ? models.find(m => m.id === currentModel)?.displayName : "Select Model"}
                  <ChevronDown className="w-3 h-3" />
                </button>
              }
              items={models.slice(0, 15).map(m => ({
                label: m.displayName,
                action: () => setCurrentModel(m.id),
                shortcut: m.executionEnvironment === "local" ? "Local" : m.provider,
              }))}
              align="right"
            />
          </Tooltip>
          <button className="valve-icon-btn p-1.5" onClick={() => setAIPanelOpen(false)} aria-label="Close">
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>
      
      {/* Conversation List (when no active conversation) */}
      {!currentConversation && conversations.length > 0 && (
        <div className="p-3 border-b border-valve-border">
          <h4 className="text-xs font-medium text-valve-text-secondary uppercase tracking-wider mb-2">Recent Conversations</h4>
          <div className="space-y-1 max-h-40 overflow-auto">
            {conversations.slice(0, 10).map(conv => (
              <button
                key={conv.id}
                className="w-full text-left p-2 rounded valve-btn-ghost text-xs hover:bg-valve-hover"
                onClick={() => setCurrentConversation(conv.id)}
              >
                <div className="font-medium truncate">{conv.title}</div>
                <div className="flex items-center gap-2 text-valve-text-muted">
                  <span className="font-mono">{models.find(m => m.id === conv.modelId)?.displayName || conv.modelId}</span>
                  <span>{formatRelativeTime(conv.updatedAt)}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
      
      {/* Messages */}
      <div className="flex-1 overflow-auto p-3 space-y-4" role="log" aria-live="polite">
        {messages.length === 0 && currentConversation ? (
          <div className="flex flex-col items-center justify-center h-full text-valve-text-muted">
            <MessageSquare className="w-16 h-16 mb-4 opacity-30" />
            <p className="text-sm">Start a conversation</p>
            <p className="text-xs">Ask questions, get code help, or use AI agents</p>
          </div>
        ) : (
          messages.map(renderMessage)
        )}
        <div ref={messagesEndRef} />
      </div>
      
      {/* Attachments */}
      {attachments.length > 0 && (
        <div className="p-3 border-t border-valve-border bg-valve-panel/50">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-valve-text-secondary">Attachments</span>
            <button className="valve-icon-btn p-1" onClick={() => setAttachments([])}>
              <X className="w-3 h-3" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1">
            {attachments.map((att, i) => (
              <span key={i} className="valve-badge bg-valve-panel border border-valve-border text-xs flex items-center gap-1">
                <FileText className="w-3 h-3" />
                {att.path}
                <button className="valve-icon-btn p-0.5" onClick={() => setAttachments(prev => prev.filter((_, idx) => idx !== i))}>
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
      
      {/* Input Area */}
      <div className="p-3 border-t border-valve-border bg-valve-panel/80 backdrop-blur-sm">
        <div className="flex items-start gap-2 mb-2">
          <button className="valve-icon-btn p-1.5 mt-0.5" onClick={() => setShowAttachments(!showAttachments)} aria-label="Attach">
            <Paperclip className="w-4 h-4" />
          </button>
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Message AI... (Shift+Enter for new line)"
            className="valve-input flex-1 min-h-[44px] max-h-48 resize-none text-sm"
            rows={1}
            style={{ height: "auto" }}
          />
          <button
            className="valve-btn-primary p-2 mt-0.5 flex-shrink-0"
            onClick={handleSend}
            disabled={streaming || (!input.trim() && attachments.length === 0)}
            aria-label={streaming ? "Stop" : "Send"}
          >
            {streaming ? <X className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
          </button>
        </div>
        
        {/* Quick Actions */}
        <div className="flex items-center gap-1 text-xs text-valve-text-muted">
          <span>Ctrl+Enter to send</span>
          <Tooltip content="Attach File" position="top">
            <button className="valve-icon-btn p-1" onClick={() => {}}>
              <FileText className="w-3 h-3" />
            </button>
          </Tooltip>
          <Tooltip content="Attach Folder" position="top">
            <button className="valve-icon-btn p-1">
              <FolderOpen className="w-3 h-3" />
            </button>
          </Tooltip>
          <Tooltip content="Attach Terminal Output" position="top">
            <button className="valve-icon-btn p-1">
              <Terminal className="w-3 h-3" />
            </button>
          </Tooltip>
          <Tooltip content="Attach Git Diff" position="top">
            <button className="valve-icon-btn p-1">
              <GitBranch className="w-3 h-3" />
            </button>
          </Tooltip>
          <Tooltip content="Agent Mode" position="top">
            <Dropdown
              trigger={
                <button className="valve-btn-ghost p-1 gap-1 text-xs">
                  <Bot className="w-3 h-3" />
                  <span>Agent</span>
                  <ChevronDown className="w-3 h-3" />
                </button>
              }
              items={[
                { label: "Ask", action: () => {} },
                { label: "Plan", action: () => {} },
                { label: "Edit", action: () => {} },
                { label: "Agent", action: () => {} },
                { label: "Review", action: () => {} },
              ]}
            />
          </Tooltip>
        </div>
      </div>
    </div>
  );
}