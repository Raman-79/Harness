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
        "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
        isUser ? "bg-blue-600 text-white" : "bg-gray-100 text-gray-900"
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
