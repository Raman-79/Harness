'use client';
import { useEffect, useState } from 'react';
import { ChevronDown, PanelLeft, Star, Folder, Layout, Code2, MessageSquare } from 'lucide-react';
import { getModels, starConversation, type ModelInfo } from '@/lib/api';
import { useChatStore, useUIStore } from '@/store/chatStore';
import { PluginsButton } from '@/components/plugins/PluginsButton';
import { cn } from '@/lib/cn';

const FALLBACK: ModelInfo[] = [
  { id: 'default', label: '@cf/moonshotai/kimi-k2.6', description: 'Cloudflare Workers AI' },
];

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

  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const setSidebarOpen = useUIStore((s) => s.setSidebarOpen);
  const setProjectModalOpen = useUIStore((s) => s.setProjectModalOpen);
  const workspaceMode = useUIStore((s) => s.workspaceMode);
  const setWorkspaceMode = useUIStore((s) => s.setWorkspaceMode);

  const activeConversationId = useChatStore((s) => s.activeConversationId);
  const conversations = useChatStore((s) => s.conversations);
  const toggleStar = useChatStore((s) => s.toggleStarConversation);
  const projects = useChatStore((s) => s.projects);
  const activeProjectId = useChatStore((s) => s.activeProjectId);

  const activeConv = conversations.find((c) => c.id === activeConversationId);
  const activeProject = projects.find((p) => p.id === activeProjectId);

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
  }, [onModelChange]);

  async function handleStarToggle() {
    if (!activeConv) return;
    const newStarred = !activeConv.starred;
    toggleStar(activeConv.id, newStarred);
    try {
      await starConversation(activeConv.id, newStarred);
    } catch (err) {
      console.error('Failed to star chat', err);
      toggleStar(activeConv.id, !newStarred);
    }
  }

  return (
    <header className="h-13 flex items-center justify-between px-4 border-b border-border/80 bg-background/90 backdrop-blur-md z-20 shrink-0">
      <div className="flex items-center gap-3 overflow-hidden">
        {!sidebarOpen && (
          <button
            onClick={() => setSidebarOpen(true)}
            className="p-1.5 rounded-lg border border-border/60 text-muted hover:text-foreground hover:bg-foreground/5 transition-all"
            aria-label="Open sidebar"
          >
            <PanelLeft className="w-4 h-4" />
          </button>
        )}

        {/* Conversation Title & Star Toggle */}
        <div className="flex items-center gap-2 truncate">
          <span className="text-sm font-semibold text-foreground truncate font-heading">
            {title || activeConv?.title || 'New Session'}
          </span>
          {activeConv && (
            <button
              onClick={handleStarToggle}
              className="p-1 rounded text-muted hover:text-amber-400 transition-colors"
              title={activeConv.starred ? 'Unstar session' : 'Star session'}
            >
              <Star
                className={cn(
                  'w-3.5 h-3.5',
                  activeConv.starred ? 'fill-amber-400 text-amber-400' : 'text-muted/60'
                )}
              />
            </button>
          )}
        </div>

        {/* Active Project Pill */}
        <button
          onClick={() => setProjectModalOpen(true)}
          className={cn(
            'hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all',
            activeProject
              ? 'border-primary/40 bg-primary/10 text-primary hover:bg-primary/20'
              : 'border-border/60 bg-background-muted text-muted hover:text-foreground'
          )}
        >
          <Folder className="w-3 h-3 text-primary" />
          <span className="truncate max-w-[120px]">{activeProject ? activeProject.name : 'All Workspaces'}</span>
        </button>
      </div>

      {/* Telemetry & Workspace Bar */}
      <div className="flex items-center gap-2">
        {/* MCP Plugins Inspector */}
        <PluginsButton />

        {/* Model Picker */}
        <div className="relative">
          <button
            onClick={() => setOpen((o) => !o)}
            className={cn(
              'flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-mono border border-border/70 bg-background-muted/80',
              'hover:bg-foreground/5 transition-all'
            )}
            aria-haspopup="listbox"
            aria-expanded={open}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-foreground/90 font-medium">{active.label}</span>
            <ChevronDown className="w-3.5 h-3.5 text-muted" />
          </button>
          {open && (
            <ul
              role="listbox"
              className="absolute right-0 top-full mt-1 w-64 rounded-xl border border-border bg-background shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100"
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
                      'w-full text-left px-3 py-2.5 hover:bg-foreground/5 transition-colors',
                      m.id === active.id && 'bg-primary/10 border-l-2 border-primary'
                    )}
                  >
                    <div className="text-xs font-medium font-mono">{m.label}</div>
                    {m.description && (
                      <div className="text-[11px] text-muted mt-0.5">{m.description}</div>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Workspace Layout Selector */}
        <div className="hidden lg:flex items-center p-0.5 rounded-lg border border-border/70 bg-background-muted">
          <button
            onClick={() => setWorkspaceMode('chat')}
            className={cn(
              'p-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1',
              workspaceMode === 'chat'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted hover:text-foreground'
            )}
            title="Chat focus view"
          >
            <MessageSquare className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setWorkspaceMode('split')}
            className={cn(
              'p-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1',
              workspaceMode === 'split'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted hover:text-foreground'
            )}
            title="Split workspace view"
          >
            <Layout className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setWorkspaceMode('artifact')}
            className={cn(
              'p-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-1',
              workspaceMode === 'artifact'
                ? 'bg-background text-foreground shadow-xs'
                : 'text-muted hover:text-foreground'
            )}
            title="Artifact full focus view"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </header>
  );
}
