import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { Copy, ThumbsUp, ThumbsDown, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { SourceCitation } from './SourceCitation';
import { cn } from '@/lib/cn';
import type { Message } from '@/lib/types';

interface MessageBubbleProps {
  message: Message;
  isStreaming?: boolean;
  onRetry?: () => void;
}

/**
 * claude.ai message layout:
 *  - User: right-aligned warm gray pill, no avatar, no body chrome.
 *  - Assistant: full-width flat prose on the canvas, no bubble, no
 *    avatar. A small floating action bar appears on hover (copy,
 *    thumbs up/down, retry).
 *
 * The streaming cursor renders as a thin vertical bar after the last
 * token of an in-progress assistant message.
 */
export function ImprovedMessageBubble({
  message,
  isStreaming,
  onRetry,
}: MessageBubbleProps) {
  const isUser = message.role === 'user';
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!message.content) return;
    navigator.clipboard.writeText(message.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (isUser) {
    return (
      <div className="flex w-full justify-end mb-6">
        <div className="claude-message-user whitespace-pre-wrap break-words text-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="group w-full mb-8">
      <div className="claude-message-assistant relative">
        <div
          className={cn(
            'prose prose-sm max-w-none',
            // Tighter headings + slightly muted muted text to match claude.ai
            'prose-headings:font-semibold prose-headings:tracking-tight',
            'prose-p:leading-relaxed prose-pre:my-3',
            'prose-pre:bg-background-muted prose-pre:border prose-pre:border-border',
            'prose-code:before:hidden prose-code:after:hidden',
            'prose-code:bg-foreground/8 prose-code:px-1 prose-code:py-0.5 prose-code:rounded',
            'dark:prose-invert'
          )}
        >
          <ReactMarkdown
            rehypePlugins={[rehypeHighlight]}
            components={{
              pre({ children, className, ...props }: any) {
                return (
                  <pre className={cn("rounded-lg overflow-x-auto text-sm p-4 my-3 bg-background-muted border border-border", className)} {...props}>
                    {children}
                  </pre>
                );
              },
              code({ className, children, ...props }: any) {
                const isBlock = /language-(\w+)/.exec(className || '');
                if (isBlock) {
                  return (
                    <code className={className} {...props}>
                      {children}
                    </code>
                  );
                }
                return (
                  <code className={cn(className, "bg-foreground/8 px-1 py-0.5 rounded")} {...props}>
                    {children}
                  </code>
                );
              },
              blockquote({ children, ...props }: any) {
                return (
                  <blockquote
                    className="border-l-4 border-primary pl-4 italic text-foreground/80"
                    {...props}
                  >
                    {children}
                  </blockquote>
                );
              },
              a({ children, ...props }: any) {
                return (
                  <a
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary hover:underline"
                    {...props}
                  >
                    {children}
                  </a>
                );
              },
            }}
          >
            {message.content}
          </ReactMarkdown>
          {isStreaming && <span className="streaming-cursor" aria-hidden />}
        </div>

        {message.citations && message.citations.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {message.citations.map((c: any, i: number) => (
              <SourceCitation key={i} citation={c} />
            ))}
          </div>
        )}

        {/* Floating action bar — appears on hover */}
        <div
          className={cn(
            'absolute -bottom-2 left-0 flex items-center gap-1 px-1 py-0.5',
            'rounded-md bg-background/80 border border-border backdrop-blur-sm',
            'opacity-0 group-hover:opacity-100 transition-opacity'
          )}
        >
          <ActionButton
            label={copied ? 'Copied' : 'Copy'}
            onClick={handleCopy}
            icon={copied ? <span className="text-xs">✓</span> : <Copy className="w-3.5 h-3.5" />}
          />
          <ActionButton label="Good response" icon={<ThumbsUp className="w-3.5 h-3.5" />} />
          <ActionButton
            label="Bad response"
            icon={<ThumbsDown className="w-3.5 h-3.5" />}
          />
          {onRetry && (
            <ActionButton
              label="Retry"
              onClick={onRetry}
              icon={<RefreshCw className="w-3.5 h-3.5" />}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function ActionButton({
  icon,
  label,
  onClick,
}: {
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={label}
      title={label}
      className="p-1.5 rounded-md text-muted hover:text-foreground hover:bg-foreground/5 transition-colors"
    >
      {icon}
    </button>
  );
}
