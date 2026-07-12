'use client';
import { useCallback, useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import {
  listConnectors,
  connectConnector,
  disconnectConnector,
} from '@/lib/api';
import type { Connector } from '@/lib/types';
import { cn } from '@/lib/cn';
import { PREDEFINED_CONNECTORS } from './connectors';
import { ConnectorRow } from './ConnectorRow';
import { AddCustomServerModal } from './AddCustomServerModal';

interface PluginsPopoverProps {
  onClose: () => void;
}

/**
 * Anchored under the PluginsButton. Owns the connector list, the connect/
 * disconnect mutations, and the AddCustomServerModal. Does not own the
 * open/closed state of the popover itself — the parent does.
 */
export function PluginsPopover({ onClose }: PluginsPopoverProps) {
  const [items, setItems] = useState<Connector[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const refetch = useCallback(async () => {
    try {
      setError(null);
      const list = await listConnectors();
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plugins');
      setItems(null);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleConnect = async (id: string) => {
    setBusyId(id);
    try {
      const res = await connectConnector(id);
      // Figma returns a stub URL in the dev environment; the dedicated
      // OAuth notice modal lives in the parent (PluginsButton) for v1.
      // For now, the row flips via refetch.
      void res;
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect');
    } finally {
      setBusyId(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    setBusyId(id);
    try {
      await disconnectConnector(id);
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disconnect');
    } finally {
      setBusyId(null);
    }
  };

  // Merge live statuses from the API onto the predefined list so the order
  // is stable even if the backend returns a different order.
  const liveById = new Map((items ?? []).map((c) => [c.id, c]));
  const merged: Connector[] = PREDEFINED_CONNECTORS.map((p) => {
    const live = liveById.get(p.id);
    return live ? { ...p, status: live.status, isCustom: p.isCustom } : p;
  });

  return (
    <div
      role="dialog"
      aria-label="Plugins"
      className={cn(
        'absolute right-0 top-full mt-2 w-[320px] z-20',
        'rounded-xl border border-border bg-background shadow-2xl overflow-hidden'
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="text-sm font-semibold">Plugins</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close plugins"
          className="p-1 rounded-md hover:bg-foreground/5 claude-focus-ring"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-2 max-h-[400px] overflow-y-auto">
        {error && (
          <div className="px-3 py-3 text-xs">
            <div className="text-destructive mb-2">{error}</div>
            <button
              type="button"
              onClick={refetch}
              className="text-xs underline text-foreground/80"
            >
              Retry
            </button>
          </div>
        )}

        {!error && items === null && (
          <>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 mx-1 my-1 rounded-lg bg-foreground/5 animate-pulse"
              />
            ))}
          </>
        )}

        {!error && items !== null && merged.length === 0 && (
          <div className="px-3 py-4 text-xs text-muted">
            No plugins available yet.
          </div>
        )}

        {!error &&
          items !== null &&
          merged.map((c) => (
            <ConnectorRow
              key={c.id}
              connector={c}
              busy={busyId === c.id}
              onConnect={() => handleConnect(c.id)}
              onDisconnect={() => handleDisconnect(c.id)}
            />
          ))}
      </div>

      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md',
            'text-xs text-muted hover:text-foreground hover:bg-foreground/5',
            'transition-colors claude-focus-ring'
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          Add custom server
        </button>
      </div>

      {addOpen && (
        <AddCustomServerModal
          onClose={() => setAddOpen(false)}
          onAdded={async () => {
            setAddOpen(false);
            await refetch();
          }}
        />
      )}
    </div>
  );
}
