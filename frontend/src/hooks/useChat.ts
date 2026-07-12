import { useState, useCallback, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { v4 as uuidv4 } from 'uuid';

export function useChat() {
  const { activeConversationId, addMessage, updateLastMessage } = useChatStore();
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const wsRef = useRef<WebSocket | null>(null);
  
  const sendMessage = useCallback((text: string, fileIds: string[]) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.close();
    }
    
    addMessage({ id: uuidv4(), role: 'user', content: text });
    addMessage({ id: uuidv4(), role: 'assistant', content: '' });
    
    const ws = new WebSocket(`ws://localhost:8000/chat/stream`);
    wsRef.current = ws;
    setIsStreaming(true);
    setError(null);
    
    let currentContent = '';
    
    ws.onopen = () => {
      ws.send(JSON.stringify({
        conversation_id: activeConversationId,
        text,
        file_ids: fileIds
      }));
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'token') {
        currentContent += data.data;
        updateLastMessage(currentContent);
      } else if (data.type === 'done') {
        setIsStreaming(false);
        ws.close();
      }
    };
    
    ws.onerror = (e) => {
      console.error('WebSocket error', e);
      setError('Connection error');
      setIsStreaming(false);
    };
    
  }, [activeConversationId, addMessage, updateLastMessage]);
  
  return { sendMessage, isStreaming, error };
}
