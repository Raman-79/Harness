import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';
import { Message } from '@/lib/types';
import { SourceCitation } from './SourceCitation';
import clsx from 'clsx';

export function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === 'user';

  return (
    <div className={clsx("flex w-full mb-4", isUser ? "justify-end" : "justify-start")}>
      <div className={clsx(
        "max-w-[80%] rounded-xl px-4 py-3",
        isUser ? "claude-message-user" :
        "claude-message-assistant"
      )}>
        <div className="prose prose-sm max-w-none">
          <ReactMarkdown rehypePlugins={[rehypeHighlight]}>
            {message.content}
          </ReactMarkdown>
        </div>
        {message.citations && message.citations.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-2">
            {message.citations.map((c: any, i: number) => (
              <SourceCitation key={i} citation={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}