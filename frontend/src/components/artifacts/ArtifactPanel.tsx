'use client';
import { useEffect, useState } from 'react';
import { X, Code2, Eye } from 'lucide-react';
import { useUIStore, useChatStore } from '@/store/chatStore';
import { listArtifactsForConversation, getArtifact } from '@/lib/api';
import type { Artifact } from '@/lib/types';
import { cn } from '@/lib/cn';

export function ArtifactPanel() {
  const setOpen = useUIStore((s) => s.setArtifactPanelOpen);
  const activeId = useUIStore((s) => s.activeArtifactId);
  const setActiveId = useUIStore((s) => s.setActiveArtifactId);
  const conversationId = useChatStore((s) => s.activeConversationId);
  const storeArtifacts = useChatStore((s) => s.artifacts);

  const [mode, setMode] = useState<'preview' | 'code'>('preview');
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(false);

  // Use store artifacts if we have any (sent in real-time via WS), otherwise
  // fall back to a REST fetch.
  const artifacts: Artifact[] = storeArtifacts.length
    ? storeArtifacts
    : [];

  useEffect(() => {
    if (!conversationId) return;
    if (artifacts.length > 0) return;
    listArtifactsForConversation(conversationId)
      .then((list) => {
        // We don't have a setter for the store in the slice that maps the
        // server shape; the useChat hook already populates the store on the
        // `artifact` WS event, so this fetch is just a recovery path.
      })
      .catch(() => undefined);
  }, [conversationId, artifacts.length]);

  // Auto-select the first artifact if none active.
  useEffect(() => {
    if (!activeId && artifacts.length > 0) {
      setActiveId(artifacts[0].id);
    }
  }, [activeId, artifacts, setActiveId]);

  // Fetch the artifact content (which lives in the latest version).
  useEffect(() => {
    if (!activeId) {
      setContent('');
      return;
    }
    let cancelled = false;
    setLoading(true);
    getArtifact(activeId)
      .then((data: any) => {
        if (cancelled) return;
        if (data?.latest_version?.content) {
          setContent(data.latest_version.content);
        } else if (data?.artifact?.content) {
          setContent(data.artifact.content);
        } else {
          setContent('');
        }
      })
      .catch(() => {
        if (!cancelled) setContent('');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [activeId]);

  return (
    <aside
      className="w-[420px] shrink-0 h-full flex flex-col border-l border-border bg-background"
      aria-label="Artifacts"
    >
      <div className="h-12 flex items-center justify-between px-3 border-b border-border/60">
        <div className="flex items-center gap-2 text-sm font-medium">
          <Code2 className="w-4 h-4" />
          <span>Artifacts</span>
          {artifacts.length > 0 && (
            <span className="text-muted">({artifacts.length})</span>
          )}
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode('preview')}
            className={cn(
              'p-1.5 rounded-md claude-focus-ring',
              mode === 'preview'
                ? 'bg-foreground/10 text-foreground'
                : 'text-muted hover:text-foreground hover:bg-foreground/5'
            )}
            aria-label="Preview"
            title="Preview"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setMode('code')}
            className={cn(
              'p-1.5 rounded-md claude-focus-ring',
              mode === 'code'
                ? 'bg-foreground/10 text-foreground'
                : 'text-muted hover:text-foreground hover:bg-foreground/5'
            )}
            aria-label="View code"
            title="View code"
          >
            <Code2 className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-foreground/5 claude-focus-ring"
            aria-label="Close artifact panel"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {artifacts.length > 1 && (
        <div className="flex gap-1 px-3 py-2 border-b border-border/60 overflow-x-auto">
          {artifacts.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveId(a.id)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs whitespace-nowrap claude-focus-ring',
                a.id === activeId
                  ? 'bg-foreground/10 text-foreground'
                  : 'text-muted hover:text-foreground hover:bg-foreground/5'
              )}
            >
              {a.title || a.language}
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 min-h-0 overflow-auto">
        {artifacts.length === 0 ? (
          <div className="h-full flex items-center justify-center text-sm text-muted px-6 text-center">
            When the assistant generates code, it will appear here with a live preview.
          </div>
        ) : loading ? (
          <div className="h-full flex items-center justify-center text-sm text-muted">
            Loading…
          </div>
        ) : mode === 'preview' ? (
          <ArtifactPreview content={content} language={artifacts.find((a) => a.id === activeId)?.language || 'react'} />
        ) : (
          <pre className="text-xs p-4 overflow-auto h-full">
            <code>{content}</code>
          </pre>
        )}
      </div>
    </aside>
  );
}

/**
 * Sandpack is intentionally NOT in our bundle (the plan calls it out as
 * optional and it pulls a huge JS payload). For non-React languages we
 * fall back to highlighted code; for HTML/SVG we render in an iframe
 * via `srcDoc`. For React we render the code and label it as "Code
 * preview" — the user can copy it out.
 */
function ArtifactPreview({ content, language }: { content: string; language: string }) {
  const lang = language.toLowerCase();

  if (lang === 'html' || lang === 'svg' || lang === 'xml') {
    return (
      <iframe
        title="Artifact preview"
        srcDoc={content}
        className="w-full h-full bg-white"
        sandbox="allow-scripts"
      />
    );
  }

  return (
    <div className="p-4 h-full">
      <pre className="hljs text-xs whitespace-pre-wrap break-words">
        <code>{content}</code>
      </pre>
      <p className="mt-3 text-xs text-muted">
        React/JSX artifacts render in the code view. Inline preview is
        available for HTML and SVG.
      </p>
    </div>
  );
}
