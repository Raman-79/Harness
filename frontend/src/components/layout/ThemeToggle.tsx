'use client';
import { Sun, Moon } from 'lucide-react';
import { useUIStore, type Theme } from '@/store/chatStore';
import { cn } from '@/lib/cn';

const ORDER: Theme[] = ['system', 'light', 'dark'];

/**
 * Three-state theme toggle. Persists to localStorage; the inline bootstrap
 * script in layout.tsx reads that key on first paint to avoid a flash of
 * the wrong theme.
 */
export function ThemeToggle() {
  const theme = useUIStore((s) => s.theme);
  const setTheme = useUIStore((s) => s.setTheme);

  const cycle = () => {
    const next = ORDER[(ORDER.indexOf(theme) + 1) % ORDER.length];
    setTheme(next);
  };

  const label = `Theme: ${theme}`;
  // The icon is purely cosmetic — system is shown as the OS-current value.
  // We can't reliably detect the system pref at render time without a
  // mount effect, so we just show the moon (dark) as a neutral choice.
  return (
    <button
      onClick={cycle}
      title={label}
      aria-label={label}
      className={cn(
        'p-2 rounded-lg text-muted hover:text-foreground hover:bg-foreground/5',
        'transition-colors claude-focus-ring'
      )}
    >
      {theme === 'light' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
    </button>
  );
}
