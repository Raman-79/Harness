'use client';
import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Command } from 'cmdk';
import { useUIStore, useChatStore } from '@/store/chatStore';
import { searchConversations, getConversation } from '@/lib/api';
import { cn } from '@/lib/cn';

interface SearchResult {
  conversation: {
    id: string;
    title: string;
    starred?: boolean;
    created_at?: string;
  };
  snippet: string;
}

/**
 * Cmd+K palette. Performs a substring search over conversation titles and
 * message bodies, then switches to the chosen chat on click.
 */
export function SearchModal() {
  const open = useUIStore((s) => s.searchOpen);
  const setOpen = useUIStore((s) => s.setSearchOpen);
  const setActive = useChatStore((s) => s.setActiveConversationId);
  const setMessages = useChatStore((s) => s.setMessages);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Reset query when closing
  useEffect(() => {
    if (!open) {
      setQuery('');
      setResults([]);
    }
  }, [open]);

  // Global Cmd/Ctrl+K toggle
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setOpen(!useUIStore.getState().searchOpen);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setOpen]);

  // Debounced fetch
  useEffect(() => {
    if (!open) return;
    if (!query.trim()) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    const id = setTimeout(async () => {
      try {
        const data = await searchConversations(query);
        if (!cancelled) setResults(data);
      } catch {
        if (!cancelled) setResults([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(id);
    };
  }, [query, open]);

  if (!open) return null;

  const handleSelect = async (id: string) => {
    setActive(id);
    try {
      const { messages } = await getConversation(id);
      setMessages(
        messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          citations: m.citations,
          created_at: m.created_at,
        }))
      );
    } catch {
      /* keep going — the messages will be empty if the fetch fails */
    }
    setOpen(false);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-start justify-center pt-24 px-4"
      onClick={() => setOpen(false)}
    >
      <div
        className="w-full max-w-xl rounded-xl border border-border bg-background shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <Command label="Search conversations" className="flex flex-col">
          <div className="flex items-center gap-2 px-4 border-b border-border">
            <Search className="w-4 h-4 text-muted" />
            <Command.Input
              value={query}
              onValueChange={setQuery}
              placeholder="Search conversations…"
              className="flex-1 bg-transparent py-3 outline-none text-sm placeholder:text-muted/60"
            />
          </div>
          <Command.List className="max-h-80 overflow-y-auto p-2">
            {loading && (
              <div className="px-3 py-2 text-sm text-muted">Searching…</div>
            )}
            {!loading && query && results.length === 0 && (
              <div className="px-3 py-2 text-sm text-muted">No matches.</div>
            )}
            {!loading && !query && (
              <div className="px-3 py-2 text-sm text-muted">
                Type to search.
              </div>
            )}
            {results.map((r) => (
              <Command.Item
                key={r.conversation.id}
                value={r.conversation.id}
                onSelect={() => handleSelect(r.conversation.id)}
                className={cn(
                  'flex flex-col gap-0.5 px-3 py-2 rounded-md cursor-pointer',
                  'data-[selected=true]:bg-foreground/8'
                )}
              >
                <span className="text-sm font-medium truncate">
                  {r.conversation.title || 'Untitled'}
                </span>
                {r.snippet && (
                  <span className="text-xs text-muted truncate">{r.snippet}</span>
                )}
              </Command.Item>
            ))}
          </Command.List>
        </Command>
      </div>
    </div>
  );
}
