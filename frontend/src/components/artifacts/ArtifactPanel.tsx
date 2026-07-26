'use client';
import { useEffect, useState } from 'react';
import { X, Code2, Eye, Copy, Download, History, Check } from 'lucide-react';
import { useUIStore, useChatStore } from '@/store/chatStore';
import { listArtifactsForConversation, getArtifact, getArtifactVersion } from '@/lib/api';
import type { Artifact, ArtifactVersion } from '@/lib/types';
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
  const [copied, setCopied] = useState(false);

  // Version history state
  const [versions, setVersions] = useState<ArtifactVersion[]>([]);
  const [selectedVersionNum, setSelectedVersionNum] = useState<number | null>(null);

  const artifacts: Artifact[] = storeArtifacts.length ? storeArtifacts : [];

  useEffect(() => {
    if (!conversationId) return;
    if (artifacts.length > 0) return;
    listArtifactsForConversation(conversationId)
      .catch(() => undefined);
  }, [conversationId, artifacts.length]);

  useEffect(() => {
    if (!activeId && artifacts.length > 0) {
      setActiveId(artifacts[0].id);
    }
  }, [activeId, artifacts, setActiveId]);

  // Fetch artifact & versions
  useEffect(() => {
    if (!activeId) {
      setContent('');
      setVersions([]);
      setSelectedVersionNum(null);
      return;
    }
    let cancelled = false;
    setLoading(true);

    getArtifact(activeId)
      .then((data: any) => {
        if (cancelled) return;
        if (data?.history && Array.isArray(data.history)) {
          setVersions(data.history);
        }
        if (data?.latest_version) {
          setContent(data.latest_version.content || '');
          setSelectedVersionNum(data.latest_version.version_number);
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

  async function handleVersionSelect(verNum: number) {
    if (!activeId) return;
    setSelectedVersionNum(verNum);
    setLoading(true);
    try {
      const verData = await getArtifactVersion(activeId, verNum);
      if (verData?.content) {
        setContent(verData.content);
      }
    } catch (err) {
      console.error('Failed to load version', err);
    } finally {
      setLoading(false);
    }
  }

  function handleCopy() {
    if (!content) return;
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  function handleDownload() {
    if (!content) return;
    const activeArtifact = artifacts.find((a) => a.id === activeId);
    const filename = `${activeArtifact?.title || 'artifact'}.${activeArtifact?.language || 'txt'}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  }

  const currentArtifact = artifacts.find((a) => a.id === activeId);

  return (
    <aside
      className="w-[440px] shrink-0 h-full flex flex-col border-l border-border bg-background shadow-2xl z-10"
      aria-label="Artifacts"
    >
      {/* Header Bar */}
      <div className="h-13 flex items-center justify-between px-3 border-b border-border/80 bg-background-muted/70">
        <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
          <Code2 className="w-4 h-4 text-primary" />
          <span className="font-heading text-sm">Artifact Workbench</span>
          {artifacts.length > 0 && (
            <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-mono font-medium">
              {artifacts.length}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={() => setMode('preview')}
            className={cn(
              'p-1.5 rounded-lg text-xs flex items-center gap-1 font-medium transition-all',
              mode === 'preview'
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-muted hover:text-foreground hover:bg-foreground/5'
            )}
            title="Preview"
          >
            <Eye className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Preview</span>
          </button>

          <button
            onClick={() => setMode('code')}
            className={cn(
              'p-1.5 rounded-lg text-xs flex items-center gap-1 font-medium transition-all',
              mode === 'code'
                ? 'bg-primary/20 text-primary border border-primary/30'
                : 'text-muted hover:text-foreground hover:bg-foreground/5'
            )}
            title="View Source Code"
          >
            <Code2 className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Code</span>
          </button>

          <button
            onClick={() => setOpen(false)}
            className="p-1.5 rounded-lg text-muted hover:text-foreground hover:bg-foreground/5 transition-colors"
            title="Close Panel"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Artifact Selector Rail */}
      {artifacts.length > 1 && (
        <div className="flex gap-1 px-3 py-2 border-b border-border/60 overflow-x-auto bg-background-muted/30">
          {artifacts.map((a) => (
            <button
              key={a.id}
              onClick={() => setActiveId(a.id)}
              className={cn(
                'px-2.5 py-1 rounded-md text-xs font-mono whitespace-nowrap transition-all',
                a.id === activeId
                  ? 'bg-primary text-white font-medium shadow-xs'
                  : 'text-muted hover:text-foreground hover:bg-foreground/5 border border-border/50'
              )}
            >
              {a.title || a.language}
            </button>
          ))}
        </div>
      )}

      {/* Version Switcher Bar */}
      {versions.length > 0 && (
        <div className="px-3 py-1.5 border-b border-border/40 bg-background/50 flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 text-muted font-mono text-[11px]">
            <History className="w-3 h-3 text-accent" />
            <span>Version History:</span>
          </div>

          <div className="flex items-center gap-1 overflow-x-auto">
            {versions.map((v) => (
              <button
                key={v.id}
                onClick={() => handleVersionSelect(v.version_number)}
                className={cn(
                  'px-2 py-0.5 rounded text-[11px] font-mono transition-all',
                  v.version_number === selectedVersionNum
                    ? 'bg-accent/20 text-accent border border-accent/40 font-bold'
                    : 'text-muted hover:text-foreground hover:bg-foreground/5'
                )}
              >
                v{v.version_number}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-h-0 relative overflow-hidden bg-background">
        {artifacts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center p-6 text-center text-muted space-y-3">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary">
              <Code2 className="w-8 h-8" />
            </div>
            <p className="text-xs max-w-xs leading-relaxed">
              Code artifacts generated by the agent will automatically stream into this panel with live execution.
            </p>
          </div>
        ) : loading ? (
          <div className="h-full flex items-center justify-center text-xs text-muted font-mono animate-pulse">
            Loading artifact content…
          </div>
        ) : mode === 'preview' ? (
          <ArtifactPreview content={content} language={currentArtifact?.language || 'react'} />
        ) : (
          <div className="h-full flex flex-col">
            <pre className="text-xs p-4 overflow-auto flex-1 font-mono text-foreground/90 leading-relaxed">
              <code>{content}</code>
            </pre>
          </div>
        )}
      </div>

      {/* Action Footer Bar */}
      {artifacts.length > 0 && content && (
        <div className="p-2.5 border-t border-border/80 bg-background-muted/50 flex items-center justify-between">
          <div className="text-[11px] font-mono text-muted truncate max-w-[200px]">
            {currentArtifact?.title || 'artifact'} ({currentArtifact?.language})
          </div>
          <div className="flex items-center gap-1.5">
            <button
              onClick={handleCopy}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border/80 text-xs font-medium text-foreground hover:bg-foreground/5 transition-all"
              title="Copy source code"
            >
              {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 text-muted" />}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>
            <button
              onClick={handleDownload}
              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-border/80 text-xs font-medium text-foreground hover:bg-foreground/5 transition-all"
              title="Download file"
            >
              <Download className="w-3 h-3 text-muted" />
              <span>Download</span>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}

function ArtifactPreview({ content, language }: { content: string; language: string }) {
  const lang = language.toLowerCase();

  if (lang === 'html' || lang === 'svg' || lang === 'xml') {
    return (
      <iframe
        title="Artifact preview"
        srcDoc={content}
        className="w-full h-full bg-white border-0"
        sandbox="allow-scripts"
      />
    );
  }

  return (
    <div className="p-4 h-full overflow-auto font-mono">
      <pre className="text-xs whitespace-pre-wrap break-words text-foreground/90 leading-relaxed">
        <code>{content}</code>
      </pre>
    </div>
  );
}
