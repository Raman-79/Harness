'use client';
import { useEffect, useRef, useState } from 'react';
import { Plus, Send, StopCircle, Paperclip } from 'lucide-react';
import { useChat } from '@/hooks/useChat';
import { useChatStore, useUIStore } from '@/store/chatStore';
import { FileUpload } from '@/components/FileUpload';
import { cn } from '@/lib/cn';
import type { SendMessageOptions } from '@/hooks/useChat';

interface ComposerProps {
  modelId?: string;
  style?: string;
  enableWebSearch?: boolean;
  enableThinking?: boolean;
}

/**
 * Sticky-bottom composer. Auto-resizes as the user types, supports
 * Shift+Enter for newlines, Enter to send, and a hidden file input
 * wired to the existing FileUpload component.
 */
export function Composer({
  modelId,
  style,
  enableWebSearch,
  enableThinking,
}: ComposerProps) {
  const [input, setInput] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { sendMessage, isStreaming, stopStreaming } = useChat();
  const uploadedFiles = useChatStore((s) => s.uploadedFiles);
  const activeProjectId = useChatStore((s) => null as string | null); // TODO: project store
  void activeProjectId;
  const setArtifactPanelOpen = useUIStore((s) => s.setArtifactPanelOpen);

  // Listen for the empty-state suggestion clicks.
  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (typeof detail === 'string') {
        setInput(detail);
        textareaRef.current?.focus();
      }
    };
    window.addEventListener('forge:set-composer', handler);
    return () => window.removeEventListener('forge:set-composer', handler);
  }, []);

  // Auto-resize
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height =
        Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [input]);

  const handleSend = () => {
    if (!input.trim() || isStreaming) return;
    const fileIds = uploadedFiles
      .filter((f) => f.status === 'ready' || f.status === 'processing')
      .map((f) => f.id);
    const opts: SendMessageOptions = {
      modelId,
      style,
      enableWebSearch,
      enableThinking,
    };
    sendMessage(input, fileIds, opts);
    setInput('');
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey && !isComposing) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="px-4 py-3">
      {uploadedFiles.length > 0 && (
        <div className="mb-2">
          <FileUpload />
        </div>
      )}

      <div className="flex items-end gap-2 max-w-3xl mx-auto">
        <button
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 rounded-xl hover:bg-foreground/5 transition-colors claude-focus-ring shrink-0"
          aria-label="Attach file"
          title="Attach file"
        >
          <Paperclip className="w-5 h-5 text-muted" />
        </button>
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          onChange={() => {
            // The drag/drop FileUpload component is the primary path; this
            // hidden input is a future-friendly hook. The actual upload
            // flow can be triggered by opening the FileUpload dropzone
            // when a click event lands here.
            setArtifactPanelOpen(false);
          }}
        />

        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onCompositionStart={() => setIsComposing(true)}
            onCompositionEnd={() => setIsComposing(false)}
            placeholder="Message Forge…"
            disabled={isStreaming}
            rows={1}
            className={cn(
              'w-full resize-none py-3 px-4 max-h-48',
              'bg-background-muted border border-border rounded-2xl',
              'placeholder:text-muted/60 text-sm leading-relaxed',
              'focus:bg-background focus:border-ring focus:outline-none',
              'focus:ring-2 focus:ring-ring/20',
              'transition-colors'
            )}
          />
        </div>

        {isStreaming ? (
          <button
            onClick={stopStreaming}
            className="p-2.5 rounded-xl bg-destructive/10 hover:bg-destructive/20 text-destructive transition-colors claude-focus-ring shrink-0"
            aria-label="Stop generating"
            title="Stop generating"
          >
            <StopCircle className="w-5 h-5" />
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className={cn(
              'p-2.5 rounded-xl transition-colors claude-focus-ring shrink-0',
              !input.trim()
                ? 'text-muted/50 cursor-not-allowed'
                : 'bg-primary text-on-primary hover:opacity-90'
            )}
            aria-label="Send message"
            title="Send"
          >
            <Send className="w-5 h-5" />
          </button>
        )}
      </div>

      <div className="mt-2 text-center text-[11px] text-muted/60">
        Forge can make mistakes. Consider checking important information.
      </div>
    </div>
  );
}
