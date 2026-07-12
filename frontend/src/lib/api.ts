import { File as AppFile, Conversation } from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export async function uploadFile(file: File): Promise<{file_id: string, status: string}> {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await fetch(`${API_URL}/files/`, {
    method: 'POST',
    body: formData,
  });
  
  if (!response.ok) throw new Error('Upload failed');
  return response.json();
}

export async function getFile(id: string): Promise<AppFile> {
  const response = await fetch(`${API_URL}/files/${id}`);
  if (!response.ok) throw new Error('Failed to fetch file');
  return response.json();
}

export async function getConversations(): Promise<Conversation[]> {
  const response = await fetch(`${API_URL}/conversations/`);
  if (!response.ok) throw new Error('Failed to fetch conversations');
  return response.json();
}

export async function getConversation(id: string): Promise<{conversation: Conversation, messages: any[]}> {
  const response = await fetch(`${API_URL}/conversations/${id}`);
  if (!response.ok) throw new Error('Failed to fetch conversation');
  return response.json();
}
