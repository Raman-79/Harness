'use client';
import { useState, useRef, useEffect } from 'react';
import { useChat } from '@/hooks/useChat';
import { useChatStore } from '@/store/chatStore';
import { MessageBubble } from './MessageBubble';
import { FileUpload } from './FileUpload';
import { Send } from 'lucide-react';

export function ChatPanel() {
  const [input, setInput] = useState('');
  const { messages, uploadedFiles } = useChatStore();
  const { sendMessage, isStreaming } = useChat();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    const fileIds = uploadedFiles.filter(f => f.status === 'ready').map(f => f.id);
    sendMessage(input, fileIds);
    setInput('');
  };

  return (
    <div className="flex flex-col h-full bg-white relative">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            <div className="text-center max-w-md">
              <h2 className="text-2xl font-bold text-gray-800 mb-2">Welcome to Forge</h2>
              <p>Upload a file or send a message to get started.</p>
            </div>
          </div>
        ) : (
          messages.map(m => <MessageBubble key={m.id} message={m} />)
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t bg-gray-50 flex flex-col gap-3">
        <FileUpload />
        <div className="flex items-center gap-2">
          <input
            type="text"
            className="flex-1 rounded-full border border-gray-300 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Type your message..."
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSend()}
            disabled={isStreaming}
            suppressHydrationWarning
          />
          <button
            onClick={handleSend}
            disabled={isStreaming || !input.trim()}
            className="rounded-full bg-blue-600 p-3 text-white hover:bg-blue-700 disabled:opacity-50"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
}