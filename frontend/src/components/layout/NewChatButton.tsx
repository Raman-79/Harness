'use client';
import { Plus } from 'lucide-react';
import { useChatStore, useUIStore } from '@/store/chatStore';
import { cn } from '@/lib/cn';

/**
 * Resets the active chat so the next user message starts a fresh
 * conversation. The backend creates the new Conversation row on the
 * first message (POST /conversations/ on done).
 */
export function NewChatButton() {
  const reset = useChatStore((s) => s.reset);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);

  const handleNew = () => {
    reset();
    // On mobile the sidebar may be open; the composer is what we want visible.
    setSidebarOpen(false);
  };

  return (
    <button
      onClick={handleNew}
      className={cn(
        'w-full flex items-center gap-2 px-3 py-2 rounded-lg',
        'bg-primary text-on-primary hover:opacity-90',
        'transition-colors claude-focus-ring text-sm font-medium'
      )}
    >
      <Plus className="w-4 h-4" />
      <span>New chat</span>
    </button>
  );
}
