'use client';
import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { getModels, type ModelInfo } from '@/lib/api';
import { cn } from '@/lib/cn';

const FALLBACK: ModelInfo[] = [
  { id: 'default', label: 'Default model', description: 'Configured in settings' },
];

/**
 * Top-of-chat header. Hosts the model picker and a static "New chat"
 * anchor (claude.ai's "Today" header treatment). The model selection
 * is held in local component state and passed up via `onModelChange`
 * so the chat composer can include it in the next send.
 */
export function ChatHeader({
  title,
  onModelChange,
}: {
  title?: string;
  onModelChange?: (modelId: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [models, setModels] = useState<ModelInfo[]>(FALLBACK);
  const [active, setActive] = useState<ModelInfo>(FALLBACK[0]);

  useEffect(() => {
    getModels()
      .then((list) => {
        if (list && list.length) {
          setModels(list);
          setActive(list[0]);
          onModelChange?.(list[0].id);
        }
      })
      .catch(() => {
        /* keep fallback */
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <header className="h-12 flex items-center justify-between px-4 border-b border-border/60 bg-background">
      <div className="text-sm font-medium text-foreground/80 truncate">
        {title || 'New chat'}
      </div>
      <div className="relative">
        <button
          onClick={() => setOpen((o) => !o)}
          className={cn(
            'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm',
            'hover:bg-foreground/5 transition-colors claude-focus-ring'
          )}
          aria-haspopup="listbox"
          aria-expanded={open}
        >
          <span className="text-foreground/80">{active.label}</span>
          <ChevronDown className="w-3.5 h-3.5 text-muted" />
        </button>
        {open && (
          <ul
            role="listbox"
            className="absolute right-0 top-full mt-1 w-64 rounded-lg border border-border bg-background shadow-lg z-10 overflow-hidden"
          >
            {models.map((m) => (
              <li key={m.id}>
                <button
                  role="option"
                  aria-selected={m.id === active.id}
                  onClick={() => {
                    setActive(m);
                    onModelChange?.(m.id);
                    setOpen(false);
                  }}
                  className={cn(
                    'w-full text-left px-3 py-2 hover:bg-foreground/5 transition-colors',
                    m.id === active.id && 'bg-foreground/5'
                  )}
                >
                  <div className="text-sm font-medium">{m.label}</div>
                  {m.description && (
                    <div className="text-xs text-muted mt-0.5">{m.description}</div>
                  )}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </header>
  );
}
