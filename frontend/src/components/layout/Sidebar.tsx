'use client';
import { Search, Sidebar as SidebarIcon, Settings } from 'lucide-react';
import { useUIStore } from '@/store/chatStore';
import { NewChatButton } from './NewChatButton';
import { ConversationList } from './ConversationList';
import { ThemeToggle } from './ThemeToggle';
import { SearchModal } from './SearchModal';
import { cn } from '@/lib/cn';

/**
 * 260px collapsible sidebar. On mobile (<sm) the parent AppShell slides
 * it in over the main area; on desktop it just toggles width.
 */
export function Sidebar() {
  const open = useUIStore((s) => s.sidebarOpen);
  const setOpen = useUIStore((s) => s.setSidebarOpen);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);

  return (
    <>
      <aside
        className={cn(
          'h-full flex flex-col bg-background-muted border-r border-border',
          'transition-[width,transform] duration-200 ease-out',
          // Desktop: collapse to icon rail; mobile: slide in/out
          'w-[260px] shrink-0',
          !open && 'sm:w-0 sm:overflow-hidden -ml-[260px] sm:ml-0'
        )}
        aria-label="Sidebar"
      >
        <div className="p-3 flex items-center gap-2 border-b border-border">
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md hover:bg-foreground/5 claude-focus-ring"
            aria-label="Close sidebar"
            title="Close sidebar (Cmd+Shift+O)"
          >
            <SidebarIcon className="w-4 h-4" />
          </button>
          <span className="text-sm font-semibold">Forge</span>
        </div>

        <div className="p-3 space-y-3">
          <NewChatButton />
          <button
            onClick={() => setSearchOpen(true)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg',
              'border border-border bg-background hover:bg-foreground/5',
              'transition-colors claude-focus-ring text-sm text-muted'
            )}
          >
            <Search className="w-4 h-4" />
            <span className="flex-1 text-left">Search…</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted/70 font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        <div className="flex-1 min-h-0">
          <ConversationList />
        </div>

        <div className="p-3 border-t border-border flex items-center gap-2">
          <Settings className="w-4 h-4 text-muted" />
          <span className="text-xs text-muted flex-1">Forge</span>
          <ThemeToggle />
        </div>
      </aside>
      <SearchModal />
    </>
  );
}
