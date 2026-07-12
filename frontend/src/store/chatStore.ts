import { create } from 'zustand';
import { Conversation, Message, File as AppFile } from '@/lib/types';

interface ChatState {
  activeConversationId: string | null;
  conversations: Conversation[];
  messages: Message[];
  uploadedFiles: AppFile[];
  setActiveConversationId: (id: string | null) => void;
  setConversations: (conversations: Conversation[]) => void;
  setMessages: (messages: Message[]) => void;
  addMessage: (message: Message) => void;
  updateLastMessage: (content: string) => void;
  addUploadedFile: (file: AppFile) => void;
  updateUploadedFileStatus: (id: string, status: AppFile['status']) => void;
}

export const useChatStore = create<ChatState>((set) => ({
  activeConversationId: null,
  conversations: [],
  messages: [],
  uploadedFiles: [],
  setActiveConversationId: (id) => set({ activeConversationId: id }),
  setConversations: (conversations) => set({ conversations }),
  setMessages: (messages) => set({ messages }),
  addMessage: (message) => set((state) => ({ messages: [...state.messages, message] })),
  updateLastMessage: (content) => set((state) => {
    const messages = [...state.messages];
    if (messages.length > 0 && messages[messages.length - 1].role === 'assistant') {
      messages[messages.length - 1].content = content;
    }
    return { messages };
  }),
  addUploadedFile: (file) => set((state) => ({ uploadedFiles: [...state.uploadedFiles, file] })),
  updateUploadedFileStatus: (id, status) => set((state) => ({
    uploadedFiles: state.uploadedFiles.map(f => f.id === id ? { ...f, status } : f)
  }))
}));
