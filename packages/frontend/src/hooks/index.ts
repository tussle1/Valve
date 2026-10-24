import { useCallback, useEffect, useRef, useState } from "react";
import { useStore } from "../stores/useStore";
import type { EditorTab, TerminalSession, Notification, Modal, FileTreeNode } from "../types";

export function useTabs() {
  const tabs = useStore(state => state.tabs);
  const activeTabId = useStore(state => state.activeTabId);
  const addTab = useStore(state => state.addTab);
  const removeTab = useStore(state => state.removeTab);
  const updateTab = useStore(state => state.updateTab);
  const setActiveTab = useStore(state => state.setActiveTab);
  const reorderTabs = useStore(state => state.reorderTabs);
  
  const activeTab = tabs.find(t => t.id === activeTabId);
  
  const openFile = useCallback((filePath: string, label: string, language: string) => {
    const existingTab = tabs.find(t => t.filePath === filePath);
    if (existingTab) {
      setActiveTab(existingTab.id);
      return existingTab.id;
    }
    
    const newTab: EditorTab = {
      id: crypto.randomUUID(),
      filePath,
      label,
      isDirty: false,
      language,
      encoding: "utf-8",
      lineEnding: "lf",
    };
    
    addTab(newTab);
    return newTab.id;
  }, [tabs, addTab, setActiveTab]);
  
  const closeTab = useCallback((tabId: string) => {
    removeTab(tabId);
  }, [removeTab]);
  
  const markDirty = useCallback((tabId: string, dirty: boolean) => {
    updateTab(tabId, { isDirty: dirty });
  }, [updateTab]);
  
  const updateCursorPosition = useCallback((tabId: string, position: { line: number; column: number }) => {
    updateTab(tabId, { cursorPosition: position });
  }, [updateTab]);
  
  return {
    tabs,
    activeTabId,
    activeTab,
    openFile,
    closeTab,
    setActiveTab,
    markDirty,
    updateCursorPosition,
    reorderTabs,
  };
}

export function useTerminal() {
  const sessions = useStore(state => state.terminalSessions);
  const activeTerminalId = useStore(state => state.activeTerminalId);
  const addTerminalSession = useStore(state => state.addTerminalSession);
  const removeTerminalSession = useStore(state => state.removeTerminalSession);
  const updateTerminalSession = useStore(state => state.updateTerminalSession);
  const setActiveTerminal = useStore(state => state.setActiveTerminal);
  
  const activeSession = sessions.find(s => s.id === activeTerminalId);
  
  const createSession = useCallback(async (options?: {
    projectId?: string;
    cwd?: string;
    cols?: number;
    rows?: number;
  }) => {
    const response = await fetch("/api/terminal/sessions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(options || {}),
    });
    
    if (!response.ok) {
      throw new Error("Failed to create terminal session");
    }
    
    const session = await response.json();
    addTerminalSession(session);
    return session;
  }, [addTerminalSession]);
  
  const closeSession = useCallback(async (sessionId: string) => {
    await fetch(`/api/terminal/sessions/${sessionId}`, { method: "DELETE" });
    removeTerminalSession(sessionId);
  }, [removeTerminalSession]);
  
  const resizeSession = useCallback(async (sessionId: string, cols: number, rows: number) => {
    await fetch(`/api/terminal/sessions/${sessionId}/resize`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cols, rows }),
    });
    updateTerminalSession(sessionId, { cols, rows });
  }, [updateTerminalSession]);
  
  const writeToSession = useCallback(async (sessionId: string, data: string) => {
    await fetch(`/api/terminal/sessions/${sessionId}/write`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ data }),
    });
  }, []);
  
  return {
    sessions,
    activeTerminalId,
    activeSession,
    createSession,
    closeSession,
    resizeSession,
    writeToSession,
    setActiveTerminal,
  };
}

export function useNotifications() {
  const notifications = useStore(state => state.notifications);
  const addNotification = useStore(state => state.addNotification);
  const removeNotification = useStore(state => state.removeNotification);
  const clearNotifications = useStore(state => state.clearNotifications);
  
  const notify = useCallback((
    type: Notification["type"],
    title: string,
    message?: string,
    options?: { actions?: Notification["actions"]; persistent?: boolean }
  ) => {
    return addNotification({ type, title, message, ...options });
  }, [addNotification]);
  
  return {
    notifications,
    notify,
    removeNotification,
    clearNotifications,
    info: (title: string, message?: string, options?: any) => notify("info", title, message, options),
    success: (title: string, message?: string, options?: any) => notify("success", title, message, options),
    warning: (title: string, message?: string, options?: any) => notify("warning", title, message, options),
    error: (title: string, message?: string, options?: any) => notify("error", title, message, options),
  };
}

export function useModals() {
  const modals = useStore(state => state.modals);
  const openModal = useStore(state => state.openModal);
  const closeModal = useStore(state => state.closeModal);
  const closeAllModals = useStore(state => state.closeAllModals);
  
  const confirm = useCallback((
    title: string,
    content: React.ReactNode,
    onConfirm: () => void,
    onCancel?: () => void,
    confirmLabel = "Confirm",
    cancelLabel = "Cancel"
  ) => {
    return openModal({
      type: "confirm",
      title,
      content,
      onConfirm,
      onCancel,
      confirmLabel,
      cancelLabel,
    });
  }, [openModal]);
  
  const prompt = useCallback((
    title: string,
    content: React.ReactNode,
    onConfirm: (value: string) => void,
    onCancel?: () => void,
    confirmLabel = "OK",
    cancelLabel = "Cancel"
  ) => {
    return openModal({
      type: "input",
      title,
      content,
      onConfirm,
      onCancel,
      confirmLabel,
      cancelLabel,
    });
  }, [openModal]);
  
  return {
    modals,
    openModal,
    closeModal,
    closeAllModals,
    confirm,
    prompt,
  };
}

export function useFileTree() {
  const fileTree = useStore(state => state.fileTree);
  const currentProject = useStore(state => state.currentProject);
  const setFileTree = useStore(state => state.setFileTree);
  const updateFileTreeNode = useStore(state => state.updateFileTreeNode);
  
  const loadTree = useCallback(async (projectId: string, path = "") => {
    const response = await fetch(`/api/workspace/projects/${projectId}/files?path=${encodeURIComponent(path)}`);
    if (!response.ok) return;
    const tree = await response.json();
    setFileTree(tree);
  }, [setFileTree]);
  
  const refresh = useCallback(() => {
    if (currentProject) {
      loadTree(currentProject);
    }
  }, [currentProject, loadTree]);
  
  const toggleNode = useCallback((path: string, expanded: boolean) => {
    updateFileTreeNode(path, { expanded });
  }, [updateFileTreeNode]);
  
  const selectNode = useCallback((path: string, selected: boolean) => {
    updateFileTreeNode(path, { selected });
  }, [updateFileTreeNode]);
  
  const createFile = useCallback(async (projectId: string, path: string, isDirectory: boolean) => {
    const response = await fetch(`/api/workspace/projects/${projectId}/files`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, isDirectory }),
    });
    if (response.ok) {
      refresh();
    }
    return response.ok;
  }, [refresh]);
  
  const deleteFile = useCallback(async (projectId: string, path: string) => {
    const response = await fetch(`/api/workspace/projects/${projectId}/files?path=${encodeURIComponent(path)}`, {
      method: "DELETE",
    });
    if (response.ok) {
      refresh();
    }
    return response.ok;
  }, [refresh]);
  
  const renameFile = useCallback(async (projectId: string, oldPath: string, newPath: string) => {
    const response = await fetch(`/api/workspace/projects/${projectId}/files/rename`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ oldPath, newPath }),
    });
    if (response.ok) {
      refresh();
    }
    return response.ok;
  }, [refresh]);
  
  const readFile = useCallback(async (projectId: string, path: string) => {
    const response = await fetch(`/api/workspace/projects/${projectId}/files/content?path=${encodeURIComponent(path)}`);
    if (!response.ok) return null;
    const data = await response.json();
    return data.content;
  }, []);
  
  const writeFile = useCallback(async (projectId: string, path: string, content: string) => {
    const response = await fetch(`/api/workspace/projects/${projectId}/files/content`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ path, content }),
    });
    return response.ok;
  }, []);
  
  const searchFiles = useCallback(async (projectId: string, query: string) => {
    const response = await fetch(`/api/workspace/projects/${projectId}/search?q=${encodeURIComponent(query)}`);
    if (!response.ok) return [];
    return response.json();
  }, []);
  
  return {
    fileTree,
    currentProject,
    loadTree,
    refresh,
    toggleNode,
    selectNode,
    createFile,
    deleteFile,
    renameFile,
    readFile,
    writeFile,
    searchFiles,
  };
}

export function useAIChat() {
  const currentModel = useStore(state => state.currentModel);
  const currentProvider = useStore(state => state.currentProvider);
  const models = useStore(state => state.models);
  const providers = useStore(state => state.providers);
  const setCurrentModel = useStore(state => state.setCurrentModel);
  const setCurrentProvider = useStore(state => state.setCurrentProvider);
  const setModels = useStore(state => state.setModels);
  const setProviders = useStore(state => state.setProviders);
  
  const createConversation = useCallback(async (data: {
    projectId?: string;
    title: string;
    modelId: string;
    providerId: string;
    systemInstructions?: string;
    projectInstructions?: string;
  }) => {
    const response = await fetch("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create conversation");
    return response.json();
  }, []);
  
  const sendMessage = useCallback(async (conversationId: string, data: {
    content: string;
    modelId?: string;
    attachments?: any[];
    stream?: boolean;
    temperature?: number;
    maxTokens?: number;
  }) => {
    const response = await fetch(`/api/chat/conversations/${conversationId}/messages`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to send message");
    return response;
  }, []);
  
  const loadModels = useCallback(async () => {
    const [modelsRes, providersRes] = await Promise.all([
      fetch("/api/providers/models"),
      fetch("/api/providers"),
    ]);
    if (modelsRes.ok) setModels(await modelsRes.json());
    if (providersRes.ok) setProviders(await providersRes.json());
  }, [setModels, setProviders]);
  
  const testProvider = useCallback(async (configId: string) => {
    const response = await fetch("/api/providers/test", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ configId }),
    });
    return response.json();
  }, []);
  
  return {
    currentModel,
    currentProvider,
    models,
    providers,
    setCurrentModel,
    setCurrentProvider,
    createConversation,
    sendMessage,
    loadModels,
    testProvider,
  };
}

export function useAgents() {
  const agentTasks = useStore(state => state.agentTasks);
  const setAgentTasks = useStore(state => state.setAgentTasks);
  const updateAgentTask = useStore(state => state.updateAgentTask);
  
  const loadTasks = useCallback(async (projectId?: string) => {
    const url = projectId 
      ? `/api/agents/tasks?projectId=${projectId}`
      : "/api/agents/tasks";
    const response = await fetch(url);
    if (response.ok) {
      const tasks = await response.json();
      setAgentTasks(tasks);
    }
  }, [setAgentTasks]);
  
  const createTask = useCallback(async (data: {
    projectId: string;
    agentId: string;
    name: string;
    description: string;
    mode: string;
    input: string;
    modelId?: string;
  }) => {
    const response = await fetch("/api/agents/tasks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    if (!response.ok) throw new Error("Failed to create task");
    const task = await response.json();
    loadTasks(data.projectId);
    return task;
  }, [loadTasks]);
  
  const controlTask = useCallback(async (taskId: string, action: "pause" | "resume" | "cancel") => {
    const response = await fetch(`/api/agents/tasks/${taskId}/action`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    if (response.ok) {
      loadTasks();
    }
    return response.ok;
  }, [loadTasks]);
  
  const respondToApproval = useCallback(async (requestId: string, action: "approve" | "deny") => {
    const response = await fetch("/api/agents/approvals", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ requestId, action }),
    });
    if (response.ok) {
      loadTasks();
    }
    return response.ok;
  }, [loadTasks]);
  
  return {
    agentTasks,
    loadTasks,
    createTask,
    controlTask,
    respondToApproval,
  };
}

export function useGit(projectId?: string) {
  const gitChanges = useStore(state => state.gitChanges);
  const gitBranches = useStore(state => state.gitBranches);
  const gitCommits = useStore(state => state.gitCommits);
  const setGitChanges = useStore(state => state.setGitChanges);
  const setGitBranches = useStore(state => state.setGitBranches);
  const setGitCommits = useStore(state => state.setGitCommits);
  
  const loadStatus = useCallback(async () => {
    if (!projectId) return;
    const response = await fetch(`/api/git/${projectId}/status`);
    if (response.ok) {
      const data = await response.json();
      setGitChanges(data.files || []);
      setGitBranches(data.branches || []);
    }
  }, [projectId, setGitChanges, setGitBranches]);
  
  const loadLog = useCallback(async (maxCount = 50) => {
    if (!projectId) return;
    const response = await fetch(`/api/git/${projectId}/log?maxCount=${maxCount}`);
    if (response.ok) {
      const data = await response.json();
      setGitCommits(data.commits || []);
    }
  }, [projectId, setGitCommits]);
  
  const getDiff = useCallback(async (file?: string, staged = false) => {
    if (!projectId) return "";
    const params = new URLSearchParams();
    if (file) params.set("file", file);
    if (staged) params.set("staged", "true");
    const response = await fetch(`/api/git/${projectId}/diff?${params}`);
    if (response.ok) {
      const data = await response.json();
      return data.diff;
    }
    return "";
  }, [projectId]);
  
  const checkout = useCallback(async (branch: string, create = false) => {
    if (!projectId) return false;
    const response = await fetch(`/api/git/${projectId}/checkout`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ branch, create }),
    });
    if (response.ok) {
      loadStatus();
    }
    return response.ok;
  }, [projectId, loadStatus]);
  
  const stage = useCallback(async (files: string[]) => {
    if (!projectId) return false;
    const response = await fetch(`/api/git/${projectId}/stage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });
    if (response.ok) {
      loadStatus();
    }
    return response.ok;
  }, [projectId, loadStatus]);
  
  const unstage = useCallback(async (files: string[]) => {
    if (!projectId) return false;
    const response = await fetch(`/api/git/${projectId}/unstage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ files }),
    });
    if (response.ok) {
      loadStatus();
    }
    return response.ok;
  }, [projectId, loadStatus]);
  
  const commit = useCallback(async (message: string, amend = false) => {
    if (!projectId) return false;
    const response = await fetch(`/api/git/${projectId}/commit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, amend }),
    });
    if (response.ok) {
      loadStatus();
      loadLog();
    }
    return response.ok;
  }, [projectId, loadStatus, loadLog]);
  
  const push = useCallback(async (remote?: string, branch?: string, force = false) => {
    if (!projectId) return false;
    const response = await fetch(`/api/git/${projectId}/push`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remote, branch, force }),
    });
    return response.ok;
  }, [projectId]);
  
  const pull = useCallback(async (remote?: string, branch?: string, rebase = false) => {
    if (!projectId) return false;
    const response = await fetch(`/api/git/${projectId}/pull`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remote, branch, rebase }),
    });
    if (response.ok) {
      loadStatus();
      loadLog();
    }
    return response.ok;
  }, [projectId, loadStatus, loadLog]);
  
  const fetchRemote = useCallback(async (remote?: string) => {
    if (!projectId) return false;
    const response = await fetch(`/api/git/${projectId}/fetch`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ remote }),
    });
    if (response.ok) {
      loadStatus();
    }
    return response.ok;
  }, [projectId, loadStatus]);
  
  return {
    gitChanges,
    gitBranches,
    gitCommits,
    loadStatus,
    loadLog,
    getDiff,
    checkout,
  };
}

export function useSettings() {
  const settings = useStore(state => state.settings);
  const theme = useStore(state => state.theme);
  const accentColor = useStore(state => state.accentColor);
  const density = useStore(state => state.density);
  const setSettings = useStore(state => state.setSettings);
  const updateSetting = useStore(state => state.updateSetting);
  const setTheme = useStore(state => state.setTheme);
  const setAccentColor = useStore(state => state.setAccentColor);
  const setDensity = useStore(state => state.setDensity);
  
  const loadSettings = useCallback(async () => {
    const response = await fetch("/api/settings");
    if (response.ok) {
      const data = await response.json();
      setSettings(data);
    }
  }, [setSettings]);
  
  const saveSetting = useCallback(async (key: string, value: any, scope = "user") => {
    const response = await fetch(`/api/settings/${key}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ value, scope }),
    });
    if (response.ok) {
      updateSetting(key, value);
    }
    return response.ok;
  }, [updateSetting]);
  
  return {
    settings,
    theme,
    accentColor,
    density,
    loadSettings,
    saveSetting,
    setTheme,
    setAccentColor,
    setDensity,
  };
}

export function useLocalStorage<T>(key: string, initialValue: T) {
  const [storedValue, setStoredValue] = useState<T>(() => {
    if (typeof window === "undefined") return initialValue;
    try {
      const item = window.localStorage.getItem(key);
      return item ? JSON.parse(item) : initialValue;
    } catch {
      return initialValue;
    }
  });
  
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      setStoredValue(valueToStore);
      if (typeof window !== "undefined") {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
      }
    } catch (error) {
      console.error(`Error saving to localStorage:`, error);
    }
  }, [key, storedValue]);
  
  return [storedValue, setValue] as const;
}

export function useMediaQuery(query: string) {
  const [matches, setMatches] = useState(false);
  
  useEffect(() => {
    if (typeof window === "undefined") return;
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);
  
  return matches;
}

export function useOnClickOutside(ref: React.RefObject<HTMLElement>, handler: (event: MouseEvent | TouchEvent) => void) {
  useEffect(() => {
    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler(event);
    };
    
    document.addEventListener("mousedown", listener);
    document.addEventListener("touchstart", listener);
    
    return () => {
      document.removeEventListener("mousedown", listener);
      document.removeEventListener("touchstart", listener);
    };
  }, [ref, handler]);
}

export function useKeyPress(targetKey: string, handler: (event: KeyboardEvent) => void) {
  useEffect(() => {
    const listener = (event: KeyboardEvent) => {
      if (event.key === targetKey) {
        handler(event);
      }
    };
    
    window.addEventListener("keydown", listener);
    return () => window.removeEventListener("keydown", listener);
  }, [targetKey, handler]);
}

export function useResizeObserver(ref: React.RefObject<HTMLElement>) {
  const [dimensions, setDimensions] = useState({ width: 0, height: 0 });
  
  useEffect(() => {
    if (!ref.current) return;
    
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setDimensions({
          width: entry.contentRect.width,
          height: entry.contentRect.height,
        });
      }
    });
    
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, [ref]);
  
  return dimensions;
}