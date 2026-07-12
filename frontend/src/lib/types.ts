export interface File {
  id: string;
  filename: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  size_bytes: number;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: any;
  created_at?: string;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
}
