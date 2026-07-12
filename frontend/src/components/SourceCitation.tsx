import { BookOpen } from 'lucide-react';

interface Citation {
  id: number;
  document_id: string;
  filename: string;
  excerpt?: string;
  score?: number;
}

export function SourceCitation({ citation }: { citation: Citation }) {
  return (
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs bg-background-muted border border-border/30">
      <BookOpen className="h-3 w-3 text-muted/60" />
      <div className="flex flex-col">
        <span className="text-muted/80 font-medium">{citation.filename}</span>
        {citation.excerpt && (
          <p className="line-clamp-1 text-xs text-muted/60 max-w-[200px]">
            {citation.excerpt}
          </p>
        )}
      </div>
    </div>
  );
}