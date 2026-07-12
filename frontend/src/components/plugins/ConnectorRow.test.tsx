import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ConnectorRow } from './ConnectorRow';
import type { Connector } from '@/lib/types';

const base: Connector = {
  id: 'figma',
  name: 'Figma',
  status: 'disconnected',
  transport: 'streamable_http',
};

describe('ConnectorRow', () => {
  it('renders the name and a Connect action when disconnected', () => {
    render(<ConnectorRow connector={base} busy={false} onConnect={() => {}} onDisconnect={() => {}} />);
    expect(screen.getByText('Figma')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^connect$/i })).toBeInTheDocument();
  });

  it('renders a Disconnect action and Connected status when connected', () => {
    render(
      <ConnectorRow
        connector={{ ...base, status: 'connected' }}
        busy={false}
        onConnect={() => {}}
        onDisconnect={() => {}}
      />
    );
    // Use exact match — "connected" is a substring of "Disconnected" and "disconnected"
    expect(screen.getByText('Connected')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^disconnect$/i })).toBeInTheDocument();
  });

  it('clicking Connect fires onConnect with no confirm', async () => {
    const onConnect = vi.fn();
    const onDisconnect = vi.fn();
    const user = userEvent.setup();
    render(
      <ConnectorRow
        connector={base}
        busy={false}
        onConnect={onConnect}
        onDisconnect={onDisconnect}
      />
    );
    await user.click(screen.getByRole('button', { name: /^connect$/i }));
    expect(onConnect).toHaveBeenCalledTimes(1);
    expect(onDisconnect).not.toHaveBeenCalled();
  });

  it('clicking Disconnect prompts confirm; cancelling does not call onDisconnect', async () => {
    const onDisconnect = vi.fn();
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    const user = userEvent.setup();
    render(
      <ConnectorRow
        connector={{ ...base, status: 'connected' }}
        busy={false}
        onConnect={() => {}}
        onDisconnect={onDisconnect}
      />
    );
    await user.click(screen.getByRole('button', { name: /^disconnect$/i }));
    expect(confirmSpy).toHaveBeenCalled();
    expect(onDisconnect).not.toHaveBeenCalled();
  });

  it('clicking Disconnect and confirming calls onDisconnect', async () => {
    const onDisconnect = vi.fn();
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    const user = userEvent.setup();
    render(
      <ConnectorRow
        connector={{ ...base, status: 'connected' }}
        busy={false}
        onConnect={() => {}}
        onDisconnect={onDisconnect}
      />
    );
    await user.click(screen.getByRole('button', { name: /^disconnect$/i }));
    expect(onDisconnect).toHaveBeenCalledTimes(1);
  });

  it('disables the action button while busy', () => {
    render(
      <ConnectorRow connector={base} busy={true} onConnect={() => {}} onDisconnect={() => {}} />
    );
    expect(screen.getByRole('button', { name: /^connect$/i })).toBeDisabled();
  });
});
