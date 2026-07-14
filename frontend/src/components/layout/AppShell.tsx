'use client';
import { useEffect } from 'react';
import { Sidebar } from './Sidebar';
import { useUIStore } from '@/store/chatStore';

interface AppShellProps {
  children: React.ReactNode;
}

/**
 * Three-region shell: sidebar + main + (optional) artifact panel.
 * Keyboard shortcuts:
 *   Cmd/Ctrl+Shift+O   toggle sidebar
 *   Cmd/Ctrl+K         open search (handled in SearchModal)
 *   Cmd/Ctrl+/         focus composer (Phase 6 — placeholder for now)
 */
export function AppShell({ children }: AppShellProps) {
  const sidebarOpen = useUIStore((s) => s.sidebarOpen);
  const toggleSidebar = useUIStore((s) => s.toggleSidebar);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.shiftKey && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        toggleSidebar();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [toggleSidebar]);

  return (
    <div className="h-screen w-screen flex bg-background text-foreground overflow-hidden">
      <Sidebar />
      <main className="flex-1 min-w-0 flex flex-col">{children}</main>
    </div>
  );
}
