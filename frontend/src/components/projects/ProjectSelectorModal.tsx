'use client';
import { useState, useEffect } from 'react';
import { FolderPlus, Folder, Trash2, Check, X, Sparkles } from 'lucide-react';
import { getProjects, createProject, deleteProject } from '@/lib/api';
import { useChatStore, useUIStore } from '@/store/chatStore';
import { Project } from '@/lib/types';
import { cn } from '@/lib/cn';

export function ProjectSelectorModal() {
  const open = useUIStore((s) => s.projectModalOpen);
  const setOpen = useUIStore((s) => s.setProjectModalOpen);

  const projects = useChatStore((s) => s.projects);
  const setProjects = useChatStore((s) => s.setProjects);
  const activeProjectId = useChatStore((s) => s.activeProjectId);
  const setActiveProjectId = useChatStore((s) => s.setActiveProjectId);

  const [creating, setCreating] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [customInstructions, setCustomInstructions] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      getProjects().then(setProjects).catch(console.error);
    }
  }, [open, setProjects]);

  if (!open) return null;

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setLoading(true);
    try {
      const created = await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        custom_instructions: customInstructions.trim() || undefined,
      });
      setProjects([created, ...projects]);
      setActiveProjectId(created.id);
      setName('');
      setDescription('');
      setCustomInstructions('');
      setCreating(false);
    } catch (err) {
      console.error('Failed to create project', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: string, e: React.MouseEvent) {
    e.stopPropagation();
    try {
      await deleteProject(id);
      setProjects(projects.filter((p) => p.id !== id));
      if (activeProjectId === id) setActiveProjectId(null);
    } catch (err) {
      console.error('Failed to delete project', err);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="w-full max-w-lg rounded-xl border border-border bg-background shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/80 bg-background-muted/50">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-primary/10 text-primary">
              <Folder className="w-4 h-4" />
            </div>
            <h2 className="font-semibold text-foreground text-base">Projects Context</h2>
          </div>
          <button
            onClick={() => {
              setCreating(false);
              setOpen(false);
            }}
            className="p-1 rounded-md text-muted hover:text-foreground hover:bg-foreground/5 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-4">
          {!creating ? (
            <>
              <div className="flex items-center justify-between mb-1">
                <p className="text-xs font-medium text-muted uppercase tracking-wider">
                  Active Workspaces
                </p>
                <button
                  onClick={() => setCreating(true)}
                  className="flex items-center gap-1.5 text-xs font-medium text-primary hover:text-accent transition-colors"
                >
                  <FolderPlus className="w-3.5 h-3.5" />
                  New Project
                </button>
              </div>

              {/* All Conversations (No Project) */}
              <button
                onClick={() => {
                  setActiveProjectId(null);
                  setOpen(false);
                }}
                className={cn(
                  'w-full text-left p-3.5 rounded-lg border transition-all flex items-center justify-between',
                  activeProjectId === null
                    ? 'border-primary/50 bg-primary/10 text-foreground'
                    : 'border-border/60 hover:bg-foreground/5 text-foreground/80'
                )}
              >
                <div>
                  <div className="font-medium text-sm">All Workspaces</div>
                  <div className="text-xs text-muted mt-0.5">Global view (no project filter)</div>
                </div>
                {activeProjectId === null && <Check className="w-4 h-4 text-primary" />}
              </button>

              {/* List Projects */}
              {projects.length === 0 ? (
                <div className="py-8 text-center border border-dashed border-border/60 rounded-lg">
                  <Folder className="w-8 h-8 text-muted mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium text-foreground/70">No projects yet</p>
                  <p className="text-xs text-muted mt-1">Create a project to ground custom instructions & context.</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {projects.map((p) => {
                    const isSelected = p.id === activeProjectId;
                    return (
                      <div
                        key={p.id}
                        onClick={() => {
                          setActiveProjectId(p.id);
                          setOpen(false);
                        }}
                        className={cn(
                          'p-3.5 rounded-lg border transition-all cursor-pointer flex items-start justify-between group',
                          isSelected
                            ? 'border-primary/50 bg-primary/10 text-foreground'
                            : 'border-border/60 hover:bg-foreground/5 text-foreground/80'
                        )}
                      >
                        <div className="flex-1 pr-3">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-sm text-foreground">{p.name}</span>
                            {isSelected && (
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/20 text-primary font-mono font-medium">
                                ACTIVE
                              </span>
                            )}
                          </div>
                          {p.description && (
                            <p className="text-xs text-muted mt-1 line-clamp-2">{p.description}</p>
                          )}
                          {p.custom_instructions && (
                            <div className="mt-2 flex items-center gap-1 text-[11px] text-accent/90">
                              <Sparkles className="w-3 h-3" />
                              <span className="truncate max-w-xs">{p.custom_instructions}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={(e) => handleDelete(p.id, e)}
                            className="p-1 rounded text-muted opacity-0 group-hover:opacity-100 hover:text-destructive hover:bg-destructive/10 transition-all"
                            title="Delete project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          ) : (
            <form onSubmit={handleCreate} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-foreground/90 mb-1">
                  Project Name *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g., E-Commerce Redesign"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/90 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  placeholder="Brief summary of goals or architecture"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-foreground/90 mb-1">
                  Custom Instructions for Agent
                </label>
                <textarea
                  rows={3}
                  placeholder="e.g., Always use TypeScript strict mode and Tailwind CSS variables..."
                  value={customInstructions}
                  onChange={(e) => setCustomInstructions(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-border bg-background text-sm text-foreground focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setCreating(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-border text-foreground hover:bg-foreground/5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-primary text-white hover:opacity-90 disabled:opacity-50"
                >
                  {loading ? 'Creating…' : 'Create Project'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
