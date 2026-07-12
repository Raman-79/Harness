import type { Connector } from '@/lib/types';

/**
 * Predefined connector registry. Mirrors the backend stub's REGISTRY in
 * backend/app/api/connectors.py. Real wiring (connectors.yaml + OAuth) is
 * the Phase 4 follow-up — these values are spec data, not configuration.
 */
export const PREDEFINED_CONNECTORS: readonly Connector[] = Object.freeze([
  Object.freeze({
    id: 'figma',
    name: 'Figma',
    status: 'disconnected' as const,
    transport: 'streamable_http' as const,
  }),
  Object.freeze({
    id: 'gmail',
    name: 'Gmail',
    status: 'disconnected' as const,
    transport: 'http' as const,
  }),
  Object.freeze({
    id: 'slack',
    name: 'Slack',
    status: 'disconnected' as const,
    transport: 'http' as const,
  }),
  Object.freeze({
    id: 'canva',
    name: 'Canva',
    status: 'disconnected' as const,
    transport: 'http' as const,
  }),
]);

/**
 * Stable per-service brand color used for the icon tile in the popover.
 * Color-only signaling is paired with a text status pill in the row, so
 * color is decorative, not load-bearing.
 */
const COLOR_BY_ID: Record<string, string> = {
  figma: '#1ABCFE',
  gmail: '#EA4335',
  slack: '#4A154B',
  canva: '#7D2AE8',
};

const NEUTRAL = '#6B7280';

export function getConnectorColor(id: string, isCustom?: boolean): string {
  if (isCustom) return NEUTRAL;
  return COLOR_BY_ID[id] ?? NEUTRAL;
}
