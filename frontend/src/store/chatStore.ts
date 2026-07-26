import { create } from 'zustand';
import { Conversation, Message, File as AppFile, Artifact, Project } from '@/lib/types';

export type Theme = 'system' | 'light' | 'dark';
export type WorkspaceMode = 'chat' | 'split' | 'artifact';

interface ChatState {
  activeConversationId: string | null;
  conversations: Conversation[];
  messages: Message[];
  uploadedFiles: AppFile[];
  artifacts: Artifact[];
  projects: Project[];
  activeProjectId: string | null;

  // Projects
  setProjects: (projects: Project[]) => void;
  setActiveProjectId: (id: string | null) => void;
  addProject: (project: Project) => void;

  // Conversation lifecycle
  setActiveConversationId: (id: string | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  upsertConversation: (conversation: Conversation) => void;
  removeConversation: (id: string) => void;
  toggleStarConversation: (id: string, starred: boolean) => void;

  // Messages
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  replaceMessage: (id: string, content: string) => void;

  // Files
  addUploadedFile: (file: AppFile) => void;
  updateUploadedFile: (id: string, patch: Partial<AppFile>) => void;
  updateUploadedFileStatus: (id: string, status: AppFile['status']) => void;
  removeUploadedFile: (id: string) => void;
  clearUploadedFiles: () => void;

  // Artifacts
  addArtifact: (artifact: Artifact) => void;
  setArtifacts: (artifacts: Artifact[]) => void;
  clearArtifacts: () => void;

  // New chat
  reset: () => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  conversations: [],
  messages: [],
  uploadedFiles: [],
  artifacts: [],
  projects: [],
  activeProjectId: null,

  setProjects: (projects) => set({ projects }),
  setActiveProjectId: (id) => set({ activeProjectId: id }),
  addProject: (project) => set((state) => ({ projects: [project, ...state.projects] })),

  setActiveConversationId: (id) => set({ activeConversationId: id }),

  setConversations: (conversations) => set({ conversations }),

  upsertConversation: (conversation) =>
    set((state) => {
      const idx = state.conversations.findIndex((c) => c.id === conversation.id);
      if (idx === -1) return { conversations: [conversation, ...state.conversations] };
      const next = [...state.conversations];
      next[idx] = { ...next[idx], ...conversation };
      return { conversations: next };
    }),

  removeConversation: (id) =>
    set((state) => ({
      conversations: state.conversations.filter((c) => c.id !== id),
      ...(state.activeConversationId === id
        ? { activeConversationId: null, messages: [] }
        : {}),
    })),

  toggleStarConversation: (id, starred) =>
    set((state) => ({
      conversations: state.conversations.map((c) =>
        c.id === id ? { ...c, starred } : c
      ),
    })),

  setMessages: (messages) => set({ messages }),

  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),

  updateLastMessage: (content) =>
    set((state) => {
      const messages = [...state.messages];
      if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
        messages[messages.length - 1] = { ...messages[messages.length - 1], content };
      }
      return { messages };
    }),

  replaceMessage: (id, content) =>
    set((state) => ({
      messages: state.messages.map((m) => (m.id === id ? { ...m, content } : m)),
    })),

  addUploadedFile: (file) => set((state) => ({ uploadedFiles: [...state.uploadedFiles, file] })),

  updateUploadedFile: (id, patch) =>
    set((state) => ({
      uploadedFiles: state.uploadedFiles.map((f) => (f.id === id ? { ...f, ...patch } : f)),
    })),

  updateUploadedFileStatus: (id, status) =>
    set((state) => ({
      uploadedFiles: state.uploadedFiles.map((f) => (f.id === id ? { ...f, status } : f)),
    })),

  removeUploadedFile: (id) =>
    set((state) => ({ uploadedFiles: state.uploadedFiles.filter((f) => f.id !== id) })),

  clearUploadedFiles: () => set({ uploadedFiles: [] }),

  addArtifact: (artifact) =>
    set((state) => {
      if (state.artifacts.some((a) => a.id === artifact.id)) return state;
      return { artifacts: [...state.artifacts, artifact] };
    }),

  setArtifacts: (artifacts) => set({ artifacts }),

  clearArtifacts: () => set({ artifacts: [] }),

  reset: () =>
    set({
      activeConversationId: null,
      messages: [],
      uploadedFiles: [],
      artifacts: [],
    }),
}));

// ----------------------------------------------------------------------------
// UI store — sidebar/panel/search/artifact panel state.
// ----------------------------------------------------------------------------

interface UIState {
  theme: Theme;
  sidebarOpen: boolean;
  searchOpen: boolean;
  artifactPanelOpen: boolean;
  activeArtifactId: string | null;
  projectModalOpen: boolean;
  workspaceMode: WorkspaceMode;

  setTheme: (theme: Theme) => void;
  setSidebarOpen: (open: boolean) => void;
  toggleSidebar: () => void;
  setSearchOpen: (open: boolean) => void;
  setArtifactPanelOpen: (open: boolean) => void;
  setActiveArtifactId: (id: string | null) => void;
  setProjectModalOpen: (open: boolean) => void;
  setWorkspaceMode: (mode: WorkspaceMode) => void;
}

const THEME_KEY = 'forge-theme';

function readInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'system';
  const stored = window.localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark') return stored;
  return 'system';
}

function applyTheme(theme: Theme) {
  if (typeof document === 'undefined') return;
  if (theme === 'system') {
    document.documentElement.removeAttribute('data-theme');
  } else {
    document.documentElement.setAttribute('data-theme', theme);
  }
}

export const useUIStore = create<UIState>((set, get) => ({
  theme: 'system',
  sidebarOpen: true,
  searchOpen: false,
  artifactPanelOpen: false,
  activeArtifactId: null,
  projectModalOpen: false,
  workspaceMode: 'split',

  setTheme: (theme) => {
    applyTheme(theme);
    if (typeof window !== 'undefined') {
      if (theme === 'system') window.localStorage.removeItem(THEME_KEY);
      else window.localStorage.setItem(THEME_KEY, theme);
    }
    set({ theme });
  },

  setSidebarOpen: (open) => set({ sidebarOpen: open }),
  toggleSidebar: () => set({ sidebarOpen: !get().sidebarOpen }),
  setSearchOpen: (open) => set({ searchOpen: open }),
  setArtifactPanelOpen: (open) => set({ artifactPanelOpen: open }),
  setActiveArtifactId: (id) => set({ activeArtifactId: id }),
  setProjectModalOpen: (open) => set({ projectModalOpen: open }),
  setWorkspaceMode: (workspaceMode) => set({ workspaceMode }),
}));

if (typeof window !== 'undefined') {
  useUIStore.setState({ theme: readInitialTheme() });
}
