import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  listConnectors,
  connectConnector,
  disconnectConnector,
  addCustomServer,
} from './api';

describe('connectors api', () => {
  const originalFetch = global.fetch;

  beforeEach(() => {
    global.fetch = vi.fn();
  });
  afterEach(() => {
    global.fetch = originalFetch;
    vi.restoreAllMocks();
  });

  it('listConnectors GETs /connectors/ and returns the array', async () => {
    const payload = [
      { id: 'figma', name: 'Figma', status: 'disconnected' },
    ];
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => payload,
    });
    const result = await listConnectors();
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/connectors\/$/)
    );
    expect(result).toEqual(payload);
  });

  it('connectConnector POSTs to /connectors/{id}/connect and returns the body', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'pending', url: 'https://example.com/oauth' }),
    });
    const result = await connectConnector('figma');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/connectors\/figma\/connect$/),
      expect.objectContaining({ method: 'POST' })
    );
    expect(result).toEqual({ status: 'pending', url: 'https://example.com/oauth' });
  });

  it('disconnectConnector POSTs to /connectors/{id}/disconnect', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ status: 'success' }),
    });
    const result = await disconnectConnector('figma');
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/connectors\/figma\/disconnect$/),
      expect.objectContaining({ method: 'POST' })
    );
    expect(result).toEqual({ status: 'success' });
  });

  it('addCustomServer POSTs to /connectors/custom with the payload', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ id: 'custom-1', name: 'X', status: 'disconnected' }),
    });
    const result = await addCustomServer({
      name: 'X',
      transport: 'stdio',
      command: 'npx',
      args: ['-y', '@x/mcp'],
    });
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringMatching(/\/connectors\/custom$/),
      expect.objectContaining({
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'X',
          transport: 'stdio',
          command: 'npx',
          args: ['-y', '@x/mcp'],
        }),
      })
    );
    expect(result).toEqual({ id: 'custom-1', name: 'X', status: 'disconnected' });
  });

  it('throws on non-2xx with the backend detail message', async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ detail: 'boom' }),
    });
    await expect(listConnectors()).rejects.toThrow('boom');
  });
});
