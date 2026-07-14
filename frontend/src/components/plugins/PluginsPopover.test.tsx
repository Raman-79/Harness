import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/api', () => ({
  listConnectors: vi.fn(),
  connectConnector: vi.fn(),
  disconnectConnector: vi.fn(),
  addCustomServer: vi.fn(),
}));

import { listConnectors, connectConnector, disconnectConnector } from '@/lib/api';
import { PluginsPopover } from './PluginsPopover';
import type { Connector } from '@/lib/types';

const ITEMS: Connector[] = [
  { id: 'figma', name: 'Figma', status: 'connected' },
  { id: 'gmail', name: 'Gmail', status: 'disconnected' },
  { id: 'slack', name: 'Slack', status: 'disconnected' },
  { id: 'canva', name: 'Canva', status: 'disconnected' },
];

describe('PluginsPopover', () => {
  it('renders the four predefined rows from the api', async () => {
    (listConnectors as any).mockResolvedValue(ITEMS);
    render(<PluginsPopover onClose={() => {}} />);
    expect(await screen.findByText('Figma')).toBeInTheDocument();
    expect(screen.getByText('Gmail')).toBeInTheDocument();
    expect(screen.getByText('Slack')).toBeInTheDocument();
    expect(screen.getByText('Canva')).toBeInTheDocument();
  });

  it('shows an error with a Retry button when listConnectors rejects', async () => {
    (listConnectors as any).mockRejectedValueOnce(new Error('boom'));
    render(<PluginsPopover onClose={() => {}} />);
    const retry = await screen.findByRole('button', { name: /retry/i });
    expect(retry).toBeInTheDocument();
  });

  it('clicking Connect on a row calls connectConnector and refetches on success', async () => {
    (listConnectors as any)
      .mockResolvedValueOnce(ITEMS)
      .mockResolvedValueOnce(ITEMS.map((i) => (i.id === 'figma' ? { ...i, status: 'connected' as const } : i)));
    (connectConnector as any).mockResolvedValue({ status: 'connected' });
    const user = userEvent.setup();
    render(<PluginsPopover onClose={() => {}} />);
    await screen.findByText('Figma');
    const gmailRow = screen.getByText('Gmail').closest('div.flex.items-center')!;
    await user.click(within(gmailRow).getByRole('button', { name: /^connect$/i }));
    await waitFor(() => expect(connectConnector).toHaveBeenCalledWith('gmail'));
    expect(listConnectors).toHaveBeenCalledTimes(2);
  });

  it('clicking Disconnect confirms then calls disconnectConnector', async () => {
    (listConnectors as any).mockResolvedValue(ITEMS);
    (disconnectConnector as any).mockResolvedValue({ status: 'success' });
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(<PluginsPopover onClose={() => {}} />);
    await screen.findByText('Figma');
    const figmaRow = screen.getByText('Figma').closest('div.flex.items-center')!;
    await user.click(within(figmaRow).getByRole('button', { name: /^disconnect$/i }));
    await waitFor(() => expect(disconnectConnector).toHaveBeenCalledWith('figma'));
  });
});
