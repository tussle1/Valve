import { create } from "zustand";
import { persist, devtools } from "zustand/middleware";
import type {
  UIState,
  EditorTab,
  TerminalSession,
  Notification,
  Modal,
  FileTreeNode,
  ModelPickerModel,
  AgentTaskView,
  GitFileChange,
  GitBranch,
  GitCommit,
  SearchResult,
} from "../types";

// Re-export hooks from hooks module
export { useTabs, useTerminal, useFileTree, useAIChat, useNotifications, useAgents, useGit, useSettings, useLocalStorage, useMediaQuery, useOnClickOutside, useKeyPress, useResizeObserver } from "../hooks";

interface StoreState extends UIState {
  // Data
  workspaces: any[];
  currentWorkspace: string | null;
  projects: any[];
  currentProject: string | null;
  fileTree: FileTreeNode[];
  conversations: any[];
  currentConversation: string | null;
  models: ModelPickerModel[];
  providers: any[];
  agentTasks: AgentTaskView[];
  gitChanges: GitFileChange[];
  gitBranches: GitBranch[];
  gitCommits: GitCommit[];
  searchResults: SearchResult[];
  
  // Settings
  settings: Record<string, any>;
  theme: "dark" | "light" | "system";
  accentColor: string;
  density: "compact" | "comfortable" | "spacious";
  
  // Actions
  initialize: () => Promise<void>;
  
  // Layout actions
  setSidebarOpen: (open: boolean) => void;
  setSidebarWidth: (width: number) => void;
  setAIPanelOpen: (open: boolean) => void;
  setAIPanelWidth: (width: number) => void;
  setBottomPanelOpen: (open: boolean) => void;
  setBottomPanelHeight: (height: number) => void;
  setBottomPanelTab: (tab: UIState["bottomPanelTab"]) => void;
  setActiveActivity: (activity: UIState["activeActivity"]) => void;
  
  // Editor actions
  setActiveTab: (tabId: string | null) => void;
  addTab: (tab: EditorTab) => void;
  removeTab: (tabId: string) => void;
  updateTab: (tabId: string, updates: Partial<EditorTab>) => void;
  reorderTabs: (tabIds: string[]) => void;
  setSplitDirection: (direction: "vertical" | "horizontal" | null) => void;
  
  // AI actions
  setCurrentModel: (modelId: string | null) => void;
  setCurrentProvider: (providerId: string | null) => void;
  setModelPickerOpen: (open: boolean) => void;
  setModels: (models: ModelPickerModel[]) => void;
  setProviders: (providers: any[]) => void;
  toggleModelFavorite: (modelId: string) => void;
  
  // Terminal actions
  addTerminalSession: (session: TerminalSession) => void;
  removeTerminalSession: (sessionId: string) => void;
  updateTerminalSession: (sessionId: string, updates: Partial<TerminalSession>) => void;
  setActiveTerminal: (sessionId: string | null) => void;
  
  // Notification actions
  addNotification: (notification: Omit<Notification, "id" | "createdAt">) => string;
  removeNotification: (id: string) => void;
  clearNotifications: () => void;
  
  // Modal actions
  openModal: (modal: Omit<Modal, "id">) => string;
  closeModal: (id: string) => void;
  closeAllModals: () => void;
  
  // Data actions
  setWorkspaces: (workspaces: any[]) => void;
  setCurrentWorkspace: (id: string | null) => void;
  setProjects: (projects: any[]) => void;
  setCurrentProject: (id: string | null) => void;
  setFileTree: (tree: FileTreeNode[]) => void;
  updateFileTreeNode: (path: string, updates: Partial<FileTreeNode>) => void;
  setConversations: (conversations: any[]) => void;
  setCurrentConversation: (id: string | null) => void;
  setAgentTasks: (tasks: AgentTaskView[]) => void;
  updateAgentTask: (taskId: string, updates: Partial<AgentTaskView>) => void;
  setGitChanges: (changes: GitFileChange[]) => void;
  setGitBranches: (branches: GitBranch[]) => void;
  setGitCommits: (commits: GitCommit[]) => void;
  setSearchResults: (results: SearchResult[]) => void;
  
  // Settings actions
  setSettings: (settings: Record<string, any>) => void;
  updateSetting: (key: string, value: any) => void;
  setTheme: (theme: "dark" | "light" | "system") => void;
  setAccentColor: (color: string) => void;
  setDensity: (density: "compact" | "comfortable" | "spacious") => void;
  
  // Utility
  reset: () => void;
}

const defaultState: Omit<StoreState, keyof StoreState> = {
  // Layout
  sidebarOpen: true,
  sidebarWidth: 300,
  aiPanelOpen: true,
  aiPanelWidth: 400,
  bottomPanelOpen: false,
  bottomPanelHeight: 200,
  bottomPanelTab: "terminal",
  activeActivity: "explorer",
  
  // Editor
  activeTabId: null,
  tabs: [],
  splitDirection: null,
  
  // AI
  currentModel: null,
  currentProvider: null,
  modelPickerOpen: false,
  
  // Terminal
  terminalSessions: [],
  activeTerminalId: null,
  
  // Notifications
  notifications: [],
  
  // Modals
  modals: [],
  
  // Data
  workspaces: [],
  currentWorkspace: null,
  projects: [],
  currentProject: null,
  fileTree: [],
  conversations: [],
  currentConversation: null,
  models: [],
  providers: [],
  agentTasks: [],
  gitChanges: [],
  gitBranches: [],
  gitCommits: [],
  searchResults: [],
  
  // Settings
  settings: {},
  theme: "dark",
  accentColor: "violet",
  density: "comfortable",
};

export const useStore = create<StoreState>()(
  devtools(
    persist(
      (set, get) => ({
        ...defaultState,
        
        initialize: async () => {
          try {
            // Load settings from backend
            const settingsRes = await fetch("/api/settings");
            if (settingsRes.ok) {
              const settings = await settingsRes.json();
              set({ settings });
              
              // Apply theme
              if (settings.appearance?.theme) {
                set({ theme: settings.appearance.theme });
                document.documentElement.classList.toggle("dark", settings.appearance.theme === "dark");
              }
              if (settings.appearance?.accentColor) {
                set({ accentColor: settings.appearance.accentColor });
              }
              if (settings.appearance?.density) {
                set({ density: settings.appearance.density });
              }
            }
            
            // Load workspaces
            const workspacesRes = await fetch("/api/workspace/workspaces");
            if (workspacesRes.ok) {
              const workspaces = await workspacesRes.json();
              set({ workspaces });
              if (workspaces.length > 0 && !get().currentWorkspace) {
                set({ currentWorkspace: workspaces[0].id });
              }
            }
            
            // Load providers
            const providersRes = await fetch("/api/providers");
            if (providersRes.ok) {
              const providers = await providersRes.json();
              set({ providers });
            }
            
            // Load models
            const modelsRes = await fetch("/api/providers/models");
            if (modelsRes.ok) {
              const models = await modelsRes.json();
              const pickerModels: ModelPickerModel[] = models.map((m: any) => ({
                id: m.id,
                displayName: m.displayName,
                provider: m.provider,
                providerType: m.provider,
                capabilities: m.capabilities,
                contextWindow: m.contextWindow,
                pricing: m.pricing ? { input: m.pricing.inputPer1kTokens, output: m.pricing.outputPer1kTokens } : null,
                executionEnvironment: m.executionEnvironment,
                status: m.status,
                favorite: m.aliases?.includes("favorite") || false,
                recentlyUsed: false,
              }));
              set({ models: pickerModels });
            }
          } catch (error) {
            console.error("[Store] Initialize error:", error);
          }
        },
        
        // Layout actions
        setSidebarOpen: (open) => set({ sidebarOpen: open }),
        setSidebarWidth: (width) => set({ sidebarWidth: Math.max(200, Math.min(600, width)) }),
        setAIPanelOpen: (open) => set({ aiPanelOpen: open }),
        setAIPanelWidth: (width) => set({ aiPanelWidth: Math.max(300, Math.min(800, width)) }),
        setBottomPanelOpen: (open) => set({ bottomPanelOpen: open }),
        setBottomPanelHeight: (height) => set({ bottomPanelHeight: Math.max(100, Math.min(600, height)) }),
        setBottomPanelTab: (tab) => set({ bottomPanelTab: tab }),
        setActiveActivity: (activity) => set({ activeActivity: activity }),
        
        // Editor actions
        setActiveTab: (tabId) => set({ activeTabId: tabId }),
        addTab: (tab) => set((state) => {
          if (state.tabs.some(t => t.id === tab.id)) {
            return { activeTabId: tab.id };
          }
          return { tabs: [...state.tabs, tab], activeTabId: tab.id };
        }),
        removeTab: (tabId) => set((state) => {
          const tabs = state.tabs.filter(t => t.id !== tabId);
          let activeTabId = state.activeTabId;
          if (activeTabId === tabId) {
            activeTabId = tabs.length > 0 ? tabs[tabs.length - 1].id : null;
          }
          return { tabs, activeTabId };
        }),
        updateTab: (tabId, updates) => set((state) => ({
          tabs: state.tabs.map(t => t.id === tabId ? { ...t, ...updates } : t),
        })),
        reorderTabs: (tabIds) => set((state) => {
          const tabMap = new Map(state.tabs.map(t => [t.id, t]));
          const tabs = tabIds.map(id => tabMap.get(id)!).filter(Boolean);
          return { tabs };
        }),
        setSplitDirection: (direction) => set({ splitDirection: direction }),
        
        // AI actions
        setCurrentModel: (modelId) => set({ currentModel: modelId }),
        setCurrentProvider: (providerId) => set({ currentProvider: providerId }),
        setModelPickerOpen: (open) => set({ modelPickerOpen: open }),
        setModels: (models) => set({ models }),
        setProviders: (providers) => set({ providers }),
        toggleModelFavorite: (modelId) => set((state) => ({
          models: state.models.map(m => m.id === modelId ? { ...m, favorite: !m.favorite } : m),
        })),
        
        // Terminal actions
        addTerminalSession: (session) => set((state) => ({
          terminalSessions: [...state.terminalSessions, session],
          activeTerminalId: session.id,
        })),
        removeTerminalSession: (sessionId) => set((state) => {
          const sessions = state.terminalSessions.filter(s => s.id !== sessionId);
          let activeTerminalId = state.activeTerminalId;
          if (activeTerminalId === sessionId) {
            activeTerminalId = sessions.length > 0 ? sessions[sessions.length - 1].id : null;
          }
          return { terminalSessions: sessions, activeTerminalId };
        }),
        updateTerminalSession: (sessionId, updates) => set((state) => ({
          terminalSessions: state.terminalSessions.map(s => s.id === sessionId ? { ...s, ...updates } : s),
        })),
        setActiveTerminal: (sessionId) => set({ activeTerminalId: sessionId }),
        
        // Notification actions
        addNotification: (notification) => {
          const id = crypto.randomUUID();
          const newNotification: Notification = {
            ...notification,
            id,
            createdAt: new Date(),
          };
          set((state) => ({
            notifications: [...state.notifications, newNotification],
          }));
          
          // Auto-remove non-persistent notifications
          if (!notification.persistent) {
            setTimeout(() => {
              get().removeNotification(id);
            }, 5000);
          }
          
          return id;
        },
        removeNotification: (id) => set((state) => ({
          notifications: state.notifications.filter(n => n.id !== id),
        })),
        clearNotifications: () => set({ notifications: [] }),
        
        // Modal actions
        openModal: (modal) => {
          const id = crypto.randomUUID();
          const newModal: Modal = { ...modal, id };
          set((state) => ({ modals: [...state.modals, newModal] }));
          return id;
        },
        closeModal: (id) => set((state) => ({
          modals: state.modals.filter(m => m.id !== id),
        })),
        closeAllModals: () => set({ modals: [] }),
        
        // Data actions
        setWorkspaces: (workspaces) => set({ workspaces }),
        setCurrentWorkspace: (id) => set({ currentWorkspace: id }),
        setProjects: (projects) => set({ projects }),
        setCurrentProject: (id) => set({ currentProject: id }),
        setFileTree: (tree) => set({ fileTree: tree }),
        updateFileTreeNode: (path, updates) => set((state) => {
          const updateNode = (nodes: FileTreeNode[]): FileTreeNode[] =>
            nodes.map(node => {
              if (node.path === path) return { ...node, ...updates };
              if (node.children) return { ...node, children: updateNode(node.children) };
              return node;
            });
          return { fileTree: updateNode(state.fileTree) };
        }),
        setConversations: (conversations) => set({ conversations }),
        setCurrentConversation: (id) => set({ currentConversation: id }),
        setAgentTasks: (tasks) => set({ agentTasks: tasks }),
        updateAgentTask: (taskId, updates) => set((state) => ({
          agentTasks: state.agentTasks.map(t => t.id === taskId ? { ...t, ...updates } : t),
        })),
        setGitChanges: (changes) => set({ gitChanges: changes }),
        setGitBranches: (branches) => set({ gitBranches: branches }),
        setGitCommits: (commits) => set({ gitCommits: commits }),
        setSearchResults: (results) => set({ searchResults: results }),
        
        // Settings actions
        setSettings: (settings) => set({ settings }),
        updateSetting: (key, value) => set((state) => ({
          settings: { ...state.settings, [key]: value },
        })),
        setTheme: (theme) => {
          set({ theme });
          document.documentElement.classList.toggle("dark", theme === "dark");
        },
        setAccentColor: (color) => set({ accentColor: color }),
        setDensity: (density) => set({ density }),
        
        reset: () => set(defaultState),
      }),
      {
        name: "valve-store",
        partialize: (state) => ({
          sidebarWidth: state.sidebarWidth,
          aiPanelWidth: state.aiPanelWidth,
          bottomPanelHeight: state.bottomPanelHeight,
          activeActivity: state.activeActivity,
          theme: state.theme,
          accentColor: state.accentColor,
          density: state.density,
          settings: state.settings,
        }),
      }
    ),
    { name: "valve-store" }
  )
);

// Subscribe to theme changes
if (typeof window !== "undefined") {
  useStore.subscribe((state) => {
    if (state.theme) {
      document.documentElement.classList.toggle("dark", state.theme === "dark");
    }
  });
}