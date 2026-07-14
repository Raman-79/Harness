'use client';
import { cn } from '@/lib/cn';
import type { Connector } from '@/lib/types';
import { getConnectorColor } from './connectors';

interface ConnectorRowProps {
  connector: Connector;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

const STATUS_LABEL: Record<Connector['status'], string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  error: 'Error',
};

const STATUS_CLASS: Record<Connector['status'], string> = {
  connected: 'bg-foreground/10 text-foreground',
  disconnected: 'bg-foreground/5 text-muted',
  error: 'bg-destructive/10 text-destructive',
};

export function ConnectorRow({
  connector,
  busy,
  onConnect,
  onDisconnect,
}: ConnectorRowProps) {
  const isConnected = connector.status === 'connected';
  const color = getConnectorColor(connector.id, connector.isCustom);

  const handleAction = () => {
    if (isConnected) {
      const ok = window.confirm(`Disconnect ${connector.name}?`);
      if (ok) onDisconnect();
    } else {
      onConnect();
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg',
        'hover:bg-foreground/5 transition-colors'
      )}
    >
      <div
        aria-hidden
        className="w-7 h-7 rounded-md shrink-0 flex items-center justify-center text-xs font-semibold text-white"
        style={{ backgroundColor: color }}
      >
        {connector.name.slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{connector.name}</div>
        <div
          className={cn(
            'inline-block text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded mt-0.5',
            STATUS_CLASS[connector.status]
          )}
        >
          {STATUS_LABEL[connector.status]}
        </div>
      </div>
      <button
        type="button"
        onClick={handleAction}
        disabled={busy}
        className={cn(
          'text-xs px-2.5 py-1 rounded-md transition-colors claude-focus-ring',
          isConnected
            ? 'border border-border hover:bg-foreground/5'
            : 'bg-foreground text-background hover:bg-foreground/90',
          busy && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isConnected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}
