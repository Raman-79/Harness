export interface File {
  id: string;
  filename: string;
  status: 'uploading' | 'processing' | 'ready' | 'error';
  size_bytes: number;
  mime_type?: string;
  conversation_id?: string | null;
  created_at?: string;
}

export interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  citations?: Citation[];
  created_at?: string;
  parent_message_id?: string | null;
  branch_id?: string | null;
}

export interface Citation {
  id: number;
  document_id: string;
  filename: string;
  excerpt?: string;
  score?: number;
  page?: number;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at?: string;
  starred?: boolean;
  project_id?: string | null;
}

export interface Artifact {
  id: string;
  conversation_id: string;
  message_id?: string | null;
  title: string;
  language: string;
  content?: string;
  created_at?: string;
  updated_at?: string;
}

export interface Project {
  id: string;
  name: string;
  description?: string;
  custom_instructions?: string;
  created_at: string;
}

// ---------------------------------------------------------------------------
// Connectors (Phase 4 — MCP)
// ---------------------------------------------------------------------------

export type ConnectorTransport = 'stdio' | 'http' | 'streamable_http';
export type ConnectorStatus = 'connected' | 'disconnected' | 'error';

export interface Connector {
  id: string;
  name: string;
  status: ConnectorStatus;
  description?: string;
  transport?: ConnectorTransport;
  isCustom?: boolean;
}

export interface CustomServerPayload {
  name: string;
  transport: ConnectorTransport;
  command?: string;
  args?: string[];
  url?: string;
  token?: string;
  env?: Record<string, string>;
}

export interface ConnectResponse {
  status: string;
  url?: string;
}
