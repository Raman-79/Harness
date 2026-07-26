'use client';
import { Cpu, Terminal, Code, Sparkles, Zap, FileCode2 } from 'lucide-react';
import { useChatStore } from '@/store/chatStore';

const ACTION_STARTERS = [
  {
    icon: Code,
    title: 'Build React Sandpack Artifact',
    prompt: 'Create a responsive React dashboard component with live interactive charts and Tailwind styling.',
  },
  {
    icon: Terminal,
    title: 'MCP Connector Integration',
    prompt: 'List available MCP tools and demonstrate how to query external APIs or design files.',
  },
  {
    icon: FileCode2,
    title: 'File RAG Synthesis',
    prompt: 'Upload project documentation or code files to analyze architecture and dependencies.',
  },
  {
    icon: Zap,
    title: 'Algorithm & Code Refactor',
    prompt: 'Write a high-performance Python async worker pool with retry logic and error telemetry.',
  },
];

export function EmptyState({
  onPick,
}: {
  onPick: (prompt: string) => void;
}) {
  const projects = useChatStore((s) => s.projects);
  const activeProjectId = useChatStore((s) => s.activeProjectId);
  const activeProject = projects.find((p) => p.id === activeProjectId);

  return (
    <div className="flex h-full items-center justify-center p-6 bg-gradient-to-b from-background to-background-muted/40 overflow-y-auto">
      <div className="text-center max-w-2xl space-y-8 animate-in fade-in zoom-in-95 duration-200">
        
        {/* Cyber Hero Badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-primary text-xs font-mono font-medium shadow-xs">
          <Cpu className="w-3.5 h-3.5 animate-pulse" />
          <span>FORGE AGENTIC HARNESS v0.6</span>
          {activeProject && (
            <span className="border-l border-primary/30 pl-2 text-foreground/80 font-sans">
              Project: {activeProject.name}
            </span>
          )}
        </div>

        {/* Hero Thesis */}
        <div className="space-y-3">
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-foreground font-heading">
            Pair program with autonomous AI intelligence.
          </h1>
          <p className="text-muted text-sm sm:text-base max-w-xl mx-auto leading-relaxed">
            Forge streams reasoning live, executes code in Sandpack artifacts, inspects MCP tools, and grounds context in your uploaded project files.
          </p>
        </div>

        {/* Quick Action Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-left">
          {ACTION_STARTERS.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.title}
                onClick={() => onPick(item.prompt)}
                className="group p-4 rounded-xl border border-border/80 bg-background/90 hover:bg-foreground/5 hover:border-primary/50 transition-all duration-150 shadow-xs flex flex-col justify-between space-y-2"
              >
                <div className="flex items-center justify-between w-full">
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 rounded-lg bg-primary/10 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
                      <Icon className="w-4 h-4" />
                    </div>
                    <span className="font-semibold text-xs text-foreground group-hover:text-primary transition-colors font-heading">
                      {item.title}
                    </span>
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
                </div>
                <p className="text-xs text-muted line-clamp-2 leading-relaxed">
                  {item.prompt}
                </p>
              </button>
            );
          })}
        </div>

        {/* System Capabilities Footer */}
        <div className="pt-4 border-t border-border/40 flex items-center justify-center gap-6 text-[11px] font-mono text-muted/70">
          <span>• DeepAgents Engine</span>
          <span>• MCP Protocol</span>
          <span>• Sandpack Sandbox</span>
          <span>• Vector RAG</span>
        </div>
      </div>
    </div>
  );
}
