'use client';
import { useState } from 'react';
import { ChatHeader } from './chat/ChatHeader';
import { Composer } from './chat/Composer';
import { EmptyState } from './chat/EmptyState';
import { MessageList } from './chat/MessageList';
import { useChatStore } from '@/store/chatStore';

/**
 * Top-level chat panel. Hosts the model-id state (shared by header and
 * composer) and composes the chat column from the decomposed pieces.
 *
 * Layout:
 *   ┌────────────────────────────────────────────┐
 *   │ ChatHeader                                 │
 *   ├────────────────────────────────────────────┤
 *   │  ┌─ max-w-3xl ─────────────────────────┐   │
 *   │  │ MessageList OR EmptyState          │   │
 *   │  │  …                                │   │
 *   │  └────────────────────────────────────┘   │
 *   ├────────────────────────────────────────────┤
 *   │ Composer (sticky)                          │
 *   └────────────────────────────────────────────┘
 */
export function ChatPanel() {
  const [modelId, setModelId] = useState<string | undefined>(undefined);
  const messages = useChatStore((s) => s.messages);

  return (
    <div className="flex-1 flex flex-col min-w-0 min-h-0">
      <ChatHeader onModelChange={setModelId} />
      <div className="flex-1 overflow-y-auto">
        {messages.length === 0 ? (
          <EmptyState
            onPick={(p) => {
              window.dispatchEvent(
                new CustomEvent('forge:set-composer', { detail: p })
              );
            }}
          />
        ) : (
          <MessageList />
        )}
      </div>
      <div className="border-t border-border/60 bg-background">
        <Composer modelId={modelId} />
      </div>
    </div>
  );
}
