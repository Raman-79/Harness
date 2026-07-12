'use client';
import { useEffect, useMemo } from 'react';
import { MessageSquare, Star } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useConversations } from '@/hooks/useConversations';
import { cn } from '@/lib/cn';
import type { Conversation } from '@/lib/types';

const DAY = 86_400_000;

/**
 * Group conversations by recency: Today / Previous 7 days / Older.
 * Starred conversations get pinned at the top inside their bucket.
 */
function bucket(c: Conversation): 'today' | 'week' | 'older' {
  const ts = new Date(c.updated_at ?? c.created_at).getTime();
  if (Number.isNaN(ts)) return 'older';
  const delta = Date.now() - ts;
  if (delta < DAY) return 'today';
  if (delta < 7 * DAY) return 'week';
  return 'older';
}

const LABELS = {
  today: 'Today',
  week: 'Previous 7 days',
  older: 'Older',
} as const;

export function ConversationList() {
  const { conversations, isLoading } = useConversations();
  const activeId = useChatStore((s) => s.activeConversationId);
  const setActive = useChatStore((s) => s.setActiveConversationId);
  const setMessages = useChatStore((s) => s.setMessages);
  const loadConversation = useChatStore.getState; // not used; hook handles it

  // Group once per render. Empty array guard prevents the `buckets` useMemo
  // from being a no-op on a fresh empty store.
  const grouped = useMemo(() => {
    const groups: Record<'today' | 'week' | 'older', Conversation[]> = {
      today: [],
      week: [],
      older: [],
    };
    const sorted = [...conversations].sort((a, b) => {
      // Starred first within group
      const sa = a.starred ? 1 : 0;
      const sb = b.starred ? 1 : 0;
      if (sa !== sb) return sb - sa;
      const ta = new Date(a.updated_at ?? a.created_at).getTime();
      const tb = new Date(b.updated_at ?? b.created_at).getTime();
      return tb - ta;
    });
    for (const c of sorted) groups[bucket(c)].push(c);
    return groups;
  }, [conversations]);

  if (isLoading) {
    return (
      <div className="px-3 py-4 text-sm text-muted">Loading conversations…</div>
    );
  }

  if (conversations.length === 0) {
    return (
      <div className="px-3 py-4 text-sm text-muted">
        No chats yet. Start a new one above.
      </div>
    );
  }

  return (
    <div className="px-2 space-y-4 overflow-y-auto">
      {(['today', 'week', 'older'] as const).map((key) =>
        grouped[key].length === 0 ? null : (
          <div key={key}>
            <div className="px-2 mb-1 text-[11px] uppercase tracking-wider text-muted/70 font-medium">
              {LABELS[key]}
            </div>
            <ul className="space-y-0.5">
              {grouped[key].map((c) => (
                <li key={c.id}>
                  <button
                    onClick={async () => {
                      setActive(c.id);
                      // Lazy-load the conversation's messages
                      const { getConversation } = await import('@/lib/api');
                      const { messages } = await getConversation(c.id);
                      setMessages(
                        messages.map((m: any) => ({
                          id: m.id,
                          role: m.role,
                          content: m.content,
                          citations: m.citations,
                          created_at: m.created_at,
                        }))
                      );
                    }}
                    className={cn(
                      'w-full flex items-center gap-2 px-2 py-1.5 rounded-md text-sm',
                      'hover:bg-foreground/5 text-left transition-colors',
                      activeId === c.id && 'bg-foreground/8 font-medium'
                    )}
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-muted shrink-0" />
                    <span className="truncate flex-1 text-foreground/80">
                      {c.title || 'Untitled'}
                    </span>
                    {c.starred && (
                      <Star className="w-3 h-3 text-primary fill-primary shrink-0" />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )
      )}
    </div>
  );
}
