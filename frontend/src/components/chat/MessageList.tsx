'use client';
import { useEffect, useRef } from 'react';
import { useChatStore } from '@/store/chatStore';
import { ImprovedMessageBubble } from '@/components/ImprovedMessageBubble';
import type { Message } from '@/lib/types';

/**
 * Renders the message thread inside a centered `max-w-3xl` column —
 * the canonical claude.ai reading width. The component owns its own
 * scroll-end ref so callers don't need to thread it through.
 *
 * Streaming detection: the last assistant message with empty content
 * is considered "in flight" — the bubble renders a cursor and the
 * parent gets to skip showing its own skeleton.
 */
export function MessageList() {
  const messages = useChatStore((s) => s.messages);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {messages.map((m: Message, i: number) => {
        const isLastAssistant =
          i === messages.length - 1 && m.role === 'assistant';
        const isStreaming = isLastAssistant && m.content.length === 0;
        return (
          <ImprovedMessageBubble
            key={m.id}
            message={m}
            isStreaming={isStreaming}
          />
        );
      })}
      <div ref={endRef} />
    </div>
  );
}
