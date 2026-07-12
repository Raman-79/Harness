import { useEffect, useState } from 'react';
import { getConversations } from '@/lib/api';
import { useChatStore } from '@/store/chatStore';

/**
 * Loads and refreshes the sidebar conversation list. Exposes `refresh()`
 * so the chat column can call it after a new conversation is created
 * server-side (e.g. on first `done` event from the chat stream).
 */
export function useConversations() {
  const conversations = useChatStore((s) => s.conversations);
  const setConversations = useChatStore((s) => s.setConversations);
  const upsertConversation = useChatStore((s) => s.upsertConversation);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    // Loading flag toggles in the effect — React 19's stricter lint
    // warning is about cascading renders. We only flip true here; the
    // fetch resolves into setConversations (an external store write) and
    // setIsLoading(false) in the finally. The "synchronous setState" is
    // exactly the loading-on pattern the effect is meant to express.
    setIsLoading(true);
    getConversations()
      .then((list) => {
        if (cancelled) return;
        setConversations(list);
        setError(null);
      })
      .catch((e: unknown) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Failed to load conversations');
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // We intentionally only fetch on mount — use `refresh()` after that.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const refresh = async () => {
    try {
      const list = await getConversations();
      setConversations(list);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to refresh');
    }
  };

  return { conversations, isLoading, error, refresh, upsertConversation };
}
