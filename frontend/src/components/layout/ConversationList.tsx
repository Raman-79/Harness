'use client';
import { useMemo } from 'react';
import { MessageSquare, Star } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';
import { useConversations } from '@/hooks/useConversations';
import { starConversation } from '@/lib/api';
import { cn } from '@/lib/cn';
import type { Conversation } from '@/lib/types';

const DAY = 86_400_000;

function bucket(c: Conversation): 'today' | 'week' | 'older' {
  const ts = new Date(c.updated_at ?? c.created_at).getTime();
  if (Number.isNaN(ts)) return 'older';
  const delta = Date.now() - ts;
  if (delta < DAY) return 'today';
  if (delta < 7 * DAY) return 'week';
  return 'older';
}

const LABELS = {
  starred: 'Starred',
  today: 'Today',
  week: 'Previous 7 days',
  older: 'Older',
} as const;

export function ConversationList() {
  const { conversations, isLoading } = useConversations();
  const activeId = useChatStore((s) => s.activeConversationId);
  const activeProjectId = useChatStore((s) => s.activeProjectId);
  const setActive = useChatStore((s) => s.setActiveConversationId);
  const setMessages = useChatStore((s) => s.setMessages);
  const toggleStar = useChatStore((s) => s.toggleStarConversation);

  // Filter by active project if one is selected
  const filteredConversations = useMemo(() => {
    if (!activeProjectId) return conversations;
    return conversations.filter((c) => c.project_id === activeProjectId);
  }, [conversations, activeProjectId]);

  const { starred, timeGrouped } = useMemo(() => {
    const starredList: Conversation[] = [];
    const timeGroups: Record<'today' | 'week' | 'older', Conversation[]> = {
      today: [],
      week: [],
      older: [],
    };

    const sorted = [...filteredConversations].sort((a, b) => {
      const ta = new Date(a.updated_at ?? a.created_at).getTime();
      const tb = new Date(b.updated_at ?? b.created_at).getTime();
      return tb - ta;
    });

    for (const c of sorted) {
      if (c.starred) {
        starredList.push(c);
      } else {
        timeGroups[bucket(c)].push(c);
      }
    }

    return { starred: starredList, timeGrouped: timeGroups };
  }, [filteredConversations]);

  async function handleToggleStar(c: Conversation, e: React.MouseEvent) {
    e.stopPropagation();
    const newStarred = !c.starred;
    toggleStar(c.id, newStarred);
    try {
      await starConversation(c.id, newStarred);
    } catch (err) {
      console.error('Failed to star conversation', err);
      toggleStar(c.id, !newStarred); // revert
    }
  }

  if (isLoading) {
    return (
      <div className="px-3 py-4 text-xs text-muted font-mono animate-pulse">Loading workspace chats…</div>
    );
  }

  if (filteredConversations.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-xs text-muted border border-dashed border-border/40 rounded-lg mx-2 my-2">
        {activeProjectId ? 'No chats in this project.' : 'No chats yet. Start one above.'}
      </div>
    );
  }

  const renderItem = (c: Conversation) => {
    const isSelected = activeId === c.id;
    return (
      <li key={c.id}>
        <button
          onClick={async () => {
            setActive(c.id);
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
            'w-full flex items-center gap-2 px-2.5 py-1.5 rounded-lg text-sm group transition-all',
            'hover:bg-foreground/5 text-left',
            isSelected
              ? 'bg-primary/10 border border-primary/20 text-foreground font-medium shadow-xs'
              : 'text-foreground/80 border border-transparent'
          )}
        >
          <MessageSquare className={cn('w-3.5 h-3.5 shrink-0', isSelected ? 'text-primary' : 'text-muted')} />
          <span className="truncate flex-1 text-xs">
            {c.title || 'Untitled Chat'}
          </span>
          <button
            onClick={(e) => handleToggleStar(c, e)}
            className={cn(
              'p-0.5 rounded transition-opacity',
              c.starred ? 'opacity-100 text-amber-400' : 'opacity-0 group-hover:opacity-100 text-muted hover:text-amber-400'
            )}
            title={c.starred ? 'Unstar' : 'Star conversation'}
          >
            <Star className={cn('w-3.5 h-3.5', c.starred && 'fill-amber-400')} />
          </button>
        </button>
      </li>
    );
  };

  return (
    <div className="px-2 space-y-4 overflow-y-auto">
      {/* Starred section */}
      {starred.length > 0 && (
        <div>
          <div className="px-2.5 mb-1.5 flex items-center gap-1 text-[10px] uppercase tracking-wider text-amber-400/90 font-mono font-semibold">
            <Star className="w-3 h-3 fill-amber-400" />
            <span>{LABELS.starred}</span>
          </div>
          <ul className="space-y-0.5">{starred.map(renderItem)}</ul>
        </div>
      )}

      {/* Recency Buckets */}
      {(['today', 'week', 'older'] as const).map((key) =>
        timeGrouped[key].length === 0 ? null : (
          <div key={key}>
            <div className="px-2.5 mb-1 text-[10px] uppercase tracking-wider text-muted/70 font-mono font-medium">
              {LABELS[key]}
            </div>
            <ul className="space-y-0.5">{timeGrouped[key].map(renderItem)}</ul>
          </div>
        )
      )}
    </div>
  );
}
