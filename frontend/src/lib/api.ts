import {
  File as AppFile,
  Conversation,
  Message,
  Artifact,
  Project,
  Connector,
  CustomServerPayload,
  ConnectResponse,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

async function jsonOrThrow<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let detail = `Request failed (${res.status})`;
    try {
      const body = await res.json();
      if (body?.detail) detail = body.detail;
    } catch {
      /* no body */
    }
    throw new Error(detail);
  }
  return res.json();
}

export async function uploadFile(file: File): Promise<{ file_id: string; status: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_URL}/files/`, {
    method: 'POST',
    body: formData,
  });
  return jsonOrThrow(response);
}

export async function getFile(id: string): Promise<AppFile> {
  const response = await fetch(`${API_URL}/files/${id}`);
  return jsonOrThrow(response);
}

// ----------------------------------------------------------------------------
// Conversations
// ----------------------------------------------------------------------------

export async function getConversations(): Promise<Conversation[]> {
  const response = await fetch(`${API_URL}/conversations/`);
  return jsonOrThrow(response);
}

export async function getConversation(
  id: string
): Promise<{ conversation: Conversation; messages: Message[] }> {
  const response = await fetch(`${API_URL}/conversations/${id}`);
  return jsonOrThrow(response);
}

export async function createConversation(title = 'New chat'): Promise<Conversation> {
  const response = await fetch(`${API_URL}/conversations/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  return jsonOrThrow(response);
}

export async function renameConversation(id: string, title: string): Promise<Conversation> {
  const response = await fetch(`${API_URL}/conversations/${id}`, {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });
  return jsonOrThrow(response);
}

export async function deleteConversation(id: string): Promise<void> {
  const response = await fetch(`${API_URL}/conversations/${id}`, { method: 'DELETE' });
  if (!response.ok && response.status !== 204) {
    throw new Error(`Failed to delete (${response.status})`);
  }
}

export async function starConversation(id: string, starred: boolean): Promise<Conversation> {
  const response = await fetch(`${API_URL}/conversations/${id}/star`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ starred }),
  });
  return jsonOrThrow(response);
}

export async function searchConversations(q: string): Promise<
  Array<{ conversation: Conversation; snippet: string }>
> {
  const url = new URL(`${API_URL}/conversations/search`);
  url.searchParams.set('q', q);
  const response = await fetch(url.toString());
  return jsonOrThrow(response);
}

// ----------------------------------------------------------------------------
// Artifacts
// ----------------------------------------------------------------------------

export async function listArtifactsForConversation(
  conversationId: string
): Promise<Artifact[]> {
  const response = await fetch(`${API_URL}/artifacts/?conversation_id=${conversationId}`);
  return jsonOrThrow(response);
}

export interface ArtifactWithVersions {
  artifact: Artifact;
  latest_version?: {
    id: string;
    content: string;
    language: string;
    version_number: number;
    created_at: string;
  };
  history: Array<{
    id: string;
    version_number: number;
    language: string;
    created_at: string;
  }>;
}

export async function getArtifact(artifactId: string): Promise<ArtifactWithVersions> {
  const response = await fetch(`${API_URL}/artifacts/${artifactId}`);
  return jsonOrThrow(response);
}

export async function getArtifactVersion(
  artifactId: string,
  versionNumber: number
): Promise<{
  id: string;
  artifact_id: string;
  content: string;
  language: string;
  version_number: number;
  created_at: string;
}> {
  const response = await fetch(`${API_URL}/artifacts/${artifactId}/versions/${versionNumber}`);
  return jsonOrThrow(response);
}

// ----------------------------------------------------------------------------
// Projects
// ----------------------------------------------------------------------------

export async function getProjects(): Promise<Project[]> {
  const response = await fetch(`${API_URL}/projects/`);
  return jsonOrThrow(response);
}

export async function createProject(data: Partial<Project>): Promise<Project> {
  const response = await fetch(`${API_URL}/projects/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  return jsonOrThrow(response);
}

export async function deleteProject(id: string): Promise<void> {
  await fetch(`${API_URL}/projects/${id}`, { method: 'DELETE' });
}

// ----------------------------------------------------------------------------
// Models
// ----------------------------------------------------------------------------

export interface ModelInfo {
  id: string;
  label: string;
  description?: string;
}

export async function getModels(): Promise<ModelInfo[]> {
  const response = await fetch(`${API_URL}/models`);
  if (!response.ok) return [];
  return jsonOrThrow(response);
}

// ----------------------------------------------------------------------------
// Connectors
// ----------------------------------------------------------------------------

export async function listConnectors(): Promise<Connector[]> {
  const response = await fetch(`${API_URL}/connectors/`);
  return jsonOrThrow(response);
}

export async function connectConnector(id: string): Promise<ConnectResponse> {
  const response = await fetch(`${API_URL}/connectors/${id}/connect`, {
    method: 'POST',
  });
  return jsonOrThrow(response);
}

export async function disconnectConnector(id: string): Promise<{ status: string }> {
  const response = await fetch(`${API_URL}/connectors/${id}/disconnect`, {
    method: 'POST',
  });
  return jsonOrThrow(response);
}

export async function addCustomServer(
  payload: CustomServerPayload
): Promise<Connector> {
  const response = await fetch(`${API_URL}/connectors/custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow(response);
}

export { API_URL };
