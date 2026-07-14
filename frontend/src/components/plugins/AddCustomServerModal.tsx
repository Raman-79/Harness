'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { addCustomServer } from '@/lib/api';
import type { ConnectorTransport } from '@/lib/types';
import { cn } from '@/lib/cn';

interface Props {
  onClose: () => void;
  onAdded: () => void;
}

export function AddCustomServerModal({ onClose, onAdded }: Props) {
  const [name, setName] = useState('');
  const [transport, setTransport] = useState<ConnectorTransport>('stdio');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      await addCustomServer({
        name,
        transport,
        command: transport === 'stdio' ? command : undefined,
        args: transport === 'stdio' ? args.split(',').map(s => s.trim()).filter(Boolean) : undefined,
        url: transport === 'http' || transport === 'streamable_http' ? url : undefined,
      });
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add custom server');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <div className="w-[400px] rounded-xl border border-border bg-background shadow-2xl overflow-hidden animate-in fade-in zoom-in-95">
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <div className="font-semibold text-sm">Add Custom Server</div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md hover:bg-foreground/5"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && <div className="text-xs text-destructive">{error}</div>}
          
          <div className="space-y-1.5">
            <label className="text-xs font-medium">Name</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-1.5 text-sm rounded-md border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
              placeholder="e.g. my-local-db"
            />
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-medium">Transport</label>
            <select
              value={transport}
              onChange={(e) => setTransport(e.target.value as ConnectorTransport)}
              className="w-full px-3 py-1.5 text-sm rounded-md border border-input bg-background focus:outline-none focus:ring-1 focus:ring-ring"
            >
              <option value="stdio">stdio (Local Command)</option>
              <option value="http">http (Remote URL)</option>
            </select>
          </div>

          {transport === 'stdio' ? (
            <>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Command</label>
                <input
                  type="text"
                  required
                  value={command}
                  onChange={(e) => setCommand(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="e.g. npx"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium">Arguments (comma separated)</label>
                <input
                  type="text"
                  value={args}
                  onChange={(e) => setArgs(e.target.value)}
                  className="w-full px-3 py-1.5 text-sm rounded-md border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                  placeholder="e.g. -y, @modelcontextprotocol/server-postgres, postgresql://..."
                />
              </div>
            </>
          ) : (
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Server URL</label>
              <input
                type="url"
                required
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="w-full px-3 py-1.5 text-sm rounded-md border border-input bg-transparent focus:outline-none focus:ring-1 focus:ring-ring"
                placeholder="https://example.com/mcp"
              />
            </div>
          )}

          <div className="pt-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-sm font-medium rounded-md hover:bg-foreground/5"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
            >
              {loading ? 'Adding...' : 'Add Server'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
