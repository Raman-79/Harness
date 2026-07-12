import { useState, useCallback, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { v4 as uuidv4 } from 'uuid';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';
// Derive ws/wss scheme from the api base.
const WS_URL = API_URL.replace(/^http/, 'ws') + '/chat/stream';

export interface SendMessageOptions {
  modelId?: string;
  style?: string;
  enableWebSearch?: boolean;
  enableThinking?: boolean;
  projectId?: string | null;
}

export function useChat() {
  const {
    activeConversationId,
    setActiveConversationId,
    addMessage,
    updateLastMessage,
    addArtifact,
  } = useChatStore();
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const stopStreaming = useCallback(() => {
    if (wsRef.current) {
      // Tell the server to stop, then close.
      try {
        wsRef.current.send(JSON.stringify({ action: 'stop' }));
      } catch {
        // ignore — may already be closing
      }
      wsRef.current.close();
      wsRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  const sendMessage = useCallback(
    (text: string, fileIds: string[], opts: SendMessageOptions = {}) => {
      // Close any in-flight connection before starting a new turn.
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }

      addMessage({ id: uuidv4(), role: 'user', content: text });
      addMessage({ id: uuidv4(), role: 'assistant', content: '' });

      const ws = new WebSocket(WS_URL);
      wsRef.current = ws;
      setIsStreaming(true);
      setError(null);

      let currentContent = '';
      const seenArtifacts = new Set<string>();

      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            conversation_id: activeConversationId,
            text,
            file_ids: fileIds,
            model_id: opts.modelId,
            style: opts.style,
            enable_web_search: opts.enableWebSearch,
            enable_thinking: opts.enableThinking,
            project_id: opts.projectId,
          })
        );
      };

      ws.onmessage = (event) => {
        type IncomingPayload = {
          type: string;
          data?: string | { id?: string; [k: string]: unknown };
          conversation_id?: string;
        };
        let data: IncomingPayload;
        try {
          data = JSON.parse(event.data) as IncomingPayload;
        } catch {
          return;
        }

        switch (data.type) {
          case 'token':
            if (typeof data.data === 'string') {
              currentContent += data.data;
              updateLastMessage(currentContent);
            }
            break;
          case 'artifact': {
            const a = data.data as { id?: string } | undefined;
            if (a && a.id && !seenArtifacts.has(a.id)) {
              seenArtifacts.add(a.id);
              addArtifact({
                id: a.id,
                conversation_id: '',
                title: '',
                language: '',
              });
              // Auto-open the artifact panel on the first artifact of a turn.
              if (seenArtifacts.size === 1) {
                import('@/store/chatStore').then(({ useUIStore }) => {
                  useUIStore.getState().setArtifactPanelOpen(true);
                  useUIStore.getState().setActiveArtifactId(a.id as string);
                });
              }
            }
            break;
          }
          case 'citation':
            // Stored on the message when it lands; the chat store can extend later.
            break;
          case 'thinking':
            // Surfaced in a future "thinking" expansion block.
            break;
          case 'done':
            if (data.conversation_id && data.conversation_id !== activeConversationId) {
              setActiveConversationId(data.conversation_id);
            }
            setIsStreaming(false);
            ws.close();
            wsRef.current = null;
            break;
          case 'error':
            setError(typeof data.data === 'string' ? data.data : 'Unknown error');
            setIsStreaming(false);
            break;
        }
      };

      ws.onerror = (e) => {
        console.error('WebSocket error', e);
        setError('Connection error');
        setIsStreaming(false);
      };

      ws.onclose = () => {
        setIsStreaming(false);
        if (wsRef.current === ws) {
          wsRef.current = null;
        }
      };
    },
    [activeConversationId, addMessage, updateLastMessage, setActiveConversationId, addArtifact]
  );

  return { sendMessage, stopStreaming, isStreaming, error };
}
