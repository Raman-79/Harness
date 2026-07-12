'use client';
import { Sparkles } from 'lucide-react';

const SUGGESTIONS = [
  'Explain quantum computing in simple terms',
  'How do I make an HTTP request in JavaScript?',
  'Write a Python function to calculate factorial',
  'Summarize the latest research on fusion energy',
];

/**
 * Centered empty state shown when the active conversation has no
 * messages yet. Includes a few starter prompts the user can click to
 * populate the composer.
 */
export function EmptyState({
  onPick,
}: {
  onPick: (prompt: string) => void;
}) {
  return (
    <div className="flex h-full items-center justify-center px-4">
      <div className="text-center max-w-xl">
        <div className="mx-auto mb-6 w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
          <Sparkles className="w-7 h-7 text-primary" />
        </div>
        <h2 className="text-2xl font-semibold tracking-tight text-foreground">
          How can I help you today?
        </h2>
        <p className="mt-2 text-muted text-sm">
          Ask anything or attach a file. Forge streams answers live and can
          generate code artifacts in the right panel.
        </p>

        <div className="mt-8 grid grid-cols-1 sm:grid-cols-2 gap-2">
          {SUGGESTIONS.map((s) => (
            <button
              key={s}
              onClick={() => onPick(s)}
              className="text-left p-3 rounded-xl bg-background-muted border border-border/50 hover:bg-foreground/5 transition-colors text-sm"
            >
              {s}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
