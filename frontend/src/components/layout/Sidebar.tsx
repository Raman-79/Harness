'use client';
import { Search, Sidebar as SidebarIcon, Settings, Folder, ChevronDown } from 'lucide-react';
import { useChatStore, useUIStore } from '@/store/chatStore';
import { NewChatButton } from './NewChatButton';
import { ConversationList } from './ConversationList';
import { ThemeToggle } from './ThemeToggle';
import { SearchModal } from './SearchModal';
import { ProjectSelectorModal } from '@/components/projects/ProjectSelectorModal';
import { cn } from '@/lib/cn';

export function Sidebar() {
  const open = useUIStore((s) => s.sidebarOpen);
  const setOpen = useUIStore((s) => s.setSidebarOpen);
  const setSearchOpen = useUIStore((s) => s.setSearchOpen);
  const setProjectModalOpen = useUIStore((s) => s.setProjectModalOpen);

  const projects = useChatStore((s) => s.projects);
  const activeProjectId = useChatStore((s) => s.activeProjectId);
  const activeProject = projects.find((p) => p.id === activeProjectId);

  return (
    <>
      <aside
        className={cn(
          'h-full flex flex-col bg-background-muted border-r border-border',
          'transition-[width,transform] duration-200 ease-out',
          'w-[260px] shrink-0',
          !open && 'sm:w-0 sm:overflow-hidden -ml-[260px] sm:ml-0'
        )}
        aria-label="Sidebar"
      >
        {/* Sidebar Header with App Title & Collapse Icon */}
        <div className="p-3 flex items-center justify-between border-b border-border/70">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-gradient-to-tr from-primary to-accent flex items-center justify-center text-white font-bold text-xs shadow-xs">
              F
            </div>
            <span className="text-sm font-semibold tracking-tight text-foreground font-heading">
              Forge
            </span>
            <span className="text-[10px] font-mono px-1.5 py-0.2 rounded border border-border text-muted">
              v0.6
            </span>
          </div>

          <button
            onClick={() => setOpen(false)}
            className="p-1 rounded-md text-muted hover:text-foreground hover:bg-foreground/5 transition-colors"
            aria-label="Close sidebar"
            title="Close sidebar (Cmd+Shift+O)"
          >
            <SidebarIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Project Context Badge */}
        <div className="p-2.5 border-b border-border/40">
          <button
            onClick={() => setProjectModalOpen(true)}
            className={cn(
              'w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all',
              activeProject
                ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/15'
                : 'border-border/60 bg-background/50 text-foreground/80 hover:bg-foreground/5'
            )}
            title="Switch or manage workspace projects"
          >
            <div className="flex items-center gap-2 truncate">
              <Folder className="w-3.5 h-3.5 shrink-0 text-primary" />
              <span className="truncate">
                {activeProject ? activeProject.name : 'All Workspaces'}
              </span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 shrink-0 text-muted" />
          </button>
        </div>

        {/* Action Controls */}
        <div className="p-3 space-y-2.5">
          <NewChatButton />
          <button
            onClick={() => setSearchOpen(true)}
            className={cn(
              'w-full flex items-center gap-2 px-3 py-2 rounded-lg',
              'border border-border/70 bg-background/80 hover:bg-foreground/5',
              'transition-colors text-xs text-muted'
            )}
          >
            <Search className="w-3.5 h-3.5" />
            <span className="flex-1 text-left">Search chats…</span>
            <kbd className="text-[10px] px-1.5 py-0.5 rounded border border-border text-muted/70 font-mono">
              ⌘K
            </kbd>
          </button>
        </div>

        {/* Conversation List */}
        <div className="flex-1 min-h-0">
          <ConversationList />
        </div>

        {/* Sidebar Footer */}
        <div className="p-3 border-t border-border/80 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-muted">
            <Settings className="w-3.5 h-3.5" />
            <span className="font-mono text-[11px]">Cyber Workbench</span>
          </div>
          <ThemeToggle />
        </div>
      </aside>
      <SearchModal />
      <ProjectSelectorModal />
    </>
  );
}
