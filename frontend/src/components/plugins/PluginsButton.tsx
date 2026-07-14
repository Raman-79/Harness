'use client';
import { useState, useRef, useEffect } from 'react';
import { Blocks } from 'lucide-react';
import { PluginsPopover } from './PluginsPopover';
import { cn } from '@/lib/cn';

export function PluginsButton() {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleDocumentClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleDocumentClick);
    return () => document.removeEventListener('mousedown', handleDocumentClick);
  }, [open]);

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-sm',
          'hover:bg-foreground/5 transition-colors claude-focus-ring',
          open ? 'text-foreground bg-foreground/5' : 'text-foreground/80'
        )}
        aria-label="Plugins"
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <Blocks className="w-3.5 h-3.5 text-muted" />
        <span>Plugins</span>
      </button>
      {open && <PluginsPopover onClose={() => setOpen(false)} />}
    </div>
  );
}
