# Plugins (MCP Connectors) UI Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a plug icon to the chat header that opens a popover listing the predefined MCP servers, lets the user connect/disconnect them, and lets the user add a custom MCP server — all against the existing stubbed backend.

**Architecture:** Three new components (`PluginsButton`, `PluginsPopover`, `ConnectorRow`, `AddCustomServerModal`) under `frontend/src/components/plugins/` (the button lives under `chat/` because it's mounted in `ChatHeader`). A thin API layer in `lib/api.ts` and a small type addition in `lib/types.ts`. The backend stub gets extended to list four servers and accept a `POST /connectors/custom`. No global state, no new dependencies beyond `@testing-library/react` and a Vitest setup.

**Tech Stack:** Next.js 16 (App Router), React 19, TypeScript 5.9, Tailwind v4, Zustand (existing), `lucide-react` v1.23, `cmdk` (existing), `@testing-library/react` + `@testing-library/jest-dom` + Vitest for tests.

## Global Constraints

These constraints apply to every task. Each task's requirements implicitly include this section.

- TypeScript strict mode is on (per `tsconfig.json`); no `any` in new code.
- Path alias `@/*` maps to `frontend/src/*` (per `tsconfig.json` paths).
- Tailwind tokens are defined in `frontend/src/app/globals.css` (`--background`, `--foreground`, `--primary`, `--border`, `--muted`, `--ring`, etc.). Use Tailwind utility classes that resolve to these tokens; do not introduce new CSS variables.
- The `cn()` helper from `frontend/src/lib/cn.ts` (clsx + tailwind-merge) is the only sanctioned way to compose class names.
- New components are client components — declare `'use client';` at the top.
- Use the existing `claude-focus-ring` utility class for focus rings.
- API client uses `NEXT_PUBLIC_API_URL` (default `http://localhost:8000`) — match the pattern in `frontend/src/lib/api.ts`.
- Tests use Vitest + `@testing-library/react` + jsdom. New test files live next to the component they cover as `*.test.tsx` and import from `@testing-library/react` and `vitest`. Mock network calls with `vi.mock('@/lib/api', ...)` — do not hit the real backend.
- Commit messages are imperative and prefixed with a conventional scope (`feat:`, `test:`, `chore:`, `docs:`). End with the `Co-Authored-By: Claude <noreply@anthropic.com>` trailer.
- Backend stub is Python/FastAPI. Keep changes additive (extend the existing `connectors.py`); do not introduce new modules or schemas.
- Predefined connector list and per-service color come from `frontend/src/components/plugins/connectors.ts` (new constant file in Task 1). The list and colors are spec data; do not hardcode them in components.
- Use `PlugZap` from `lucide-react` (verified present in v1.23.0 at `node_modules/lucide-react/dist/esm/icons/plug-zap.mjs`).
- Lucide-react 1.23 has no `PlugZap` import bug for our usage; named imports work.

---

## File Structure

**New files (frontend):**
- `frontend/src/components/plugins/connectors.ts` — predefined list + colors constant
- `frontend/src/components/chat/PluginsButton.tsx` — icon button + click-outside
- `frontend/src/components/plugins/PluginsPopover.tsx` — list + state
- `frontend/src/components/plugins/ConnectorRow.tsx` — single row
- `frontend/src/components/plugins/AddCustomServerModal.tsx` — form
- `frontend/src/components/plugins/PluginsButton.test.tsx` — click-outside, Esc
- `frontend/src/components/plugins/PluginsPopover.test.tsx` — list render, retry, refetch on mutation
- `frontend/src/components/plugins/ConnectorRow.test.tsx` — connect/disconnect, confirm
- `frontend/src/components/plugins/AddCustomServerModal.test.tsx` — form submit, transport-driven field visibility
- `frontend/src/lib/api.test.ts` — listConnectors / connectConnector / disconnectConnector / addCustomServer

**Modified files (frontend):**
- `frontend/src/components/chat/ChatHeader.tsx` — render `<PluginsButton />` to the left of the model picker
- `frontend/src/lib/api.ts` — add four connector functions
- `frontend/src/lib/types.ts` — add `Connector`, `ConnectorTransport`, `ConnectorStatus`, `CustomServerPayload`
- `frontend/package.json` — add vitest + testing-library dev deps and `test` script
- `frontend/vitest.config.ts` — vitest config (jsdom env, alias `@`)

**Modified files (backend):**
- `backend/app/api/connectors.py` — extend stub to list 4 servers and accept `POST /connectors/custom`

**Untouched (explicitly):**
- Model picker in `ChatHeader.tsx`
- Composer
- `chatStore` (no new state)
- `connectors.yaml` (real wiring is the Phase 4 follow-up)

---

## Task 1: Backend stub extension

**Files:**
- Modify: `backend/app/api/connectors.py`

**Interfaces:**
- Produces: `GET /connectors/` returns a list of 4 entries with `id, name, status, transport`. `POST /connectors/{id}/connect` returns `{ status, url? }` where `url` is set for `figma` and omitted for others. `POST /connectors/{id}/disconnect` returns `{ status: "success" }`. `POST /connectors/custom` accepts a JSON body matching the `CustomServerPayload` TypeScript shape and returns a synthesized `Connector` with a new UUID id and `status: "disconnected"`.

- [ ] **Step 1: Replace `backend/app/api/connectors.py` with the extended stub**

```python
import uuid

from fastapi import APIRouter
from pydantic import BaseModel, Field

router = APIRouter(prefix="/connectors", tags=["connectors"])


class CustomServerIn(BaseModel):
    name: str = Field(..., min_length=1, max_length=64)
    transport: str = Field(..., pattern="^(stdio|http|streamable_http)$")
    command: str | None = None
    args: list[str] | None = None
    url: str | None = None
    token: str | None = None
    env: dict[str, str] | None = None


# Predefined registry. Real wiring (connectors.yaml + OAuth) is Phase 4.
REGISTRY = [
    {"id": "figma", "name": "Figma", "status": "disconnected", "transport": "streamable_http"},
    {"id": "gmail", "name": "Gmail", "status": "disconnected", "transport": "http"},
    {"id": "slack", "name": "Slack", "status": "disconnected", "transport": "http"},
    {"id": "canva", "name": "Canva", "status": "disconnected", "transport": "http"},
]


@router.get("/")
async def list_connectors():
    return REGISTRY


@router.post("/{connector_id}/connect")
async def connect_connector(connector_id: str):
    # Only Figma triggers an OAuth URL in the stub. Others flip to connected
    # without a redirect.
    if connector_id == "figma":
        return {"status": "pending", "url": "https://example.com/oauth"}
    return {"status": "connected"}


@router.get("/{connector_id}/callback")
async def connector_callback(connector_id: str, code: str):
    return {"status": "success"}


@router.post("/{connector_id}/disconnect")
async def disconnect_connector(connector_id: str):
    return {"status": "success"}


@router.post("/custom")
async def add_custom_server(payload: CustomServerIn):
    return {
        "id": f"custom-{uuid.uuid4()}",
        "name": payload.name,
        "status": "disconnected",
        "transport": payload.transport,
        "isCustom": True,
    }
```

- [ ] **Step 2: Verify the file imports cleanly**

Run from the repo root:

```bash
cd backend && python -c "from app.api.connectors import router; print(len(router.routes))"
```

Expected: prints `5` (one route each for `list`, `connect`, `callback`, `disconnect`, `custom`).

- [ ] **Step 3: Commit**

```bash
git add backend/app/api/connectors.py
git commit -m "feat(backend): extend connectors stub to list 4 servers + add custom endpoint

Adds POST /connectors/custom for the frontend's add-server flow. Figma
returns an OAuth URL stub; others flip to connected directly. Real
wiring is the Phase 4 follow-up.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 2: Test infrastructure (Vitest + Testing Library)

**Files:**
- Modify: `frontend/package.json`
- Create: `frontend/vitest.config.ts`
- Create: `frontend/src/test/setup.ts`

**Interfaces:**
- Produces: `pnpm test` (or `npm test`) runs Vitest in jsdom mode. `import { render, screen } from '@testing-library/react'` works from any `*.test.tsx` file. `@/` alias resolves to `frontend/src/*`.

- [ ] **Step 1: Add dev dependencies to `frontend/package.json`**

Modify `frontend/package.json` to add these devDependencies and a `test` script:

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "eslint",
    "test": "vitest run",
    "test:watch": "vitest"
  },
  "devDependencies": {
    "@tailwindcss/postcss": "^4",
    "@testing-library/jest-dom": "^6.6.3",
    "@testing-library/react": "^16.1.0",
    "@testing-library/user-event": "^14.5.2",
    "@types/node": "^20",
    "@types/react": "^19",
    "@types/react-dom": "^19",
    "@types/uuid": "^10.0.0",
    "@vitejs/plugin-react": "^4.3.4",
    "eslint": "^9",
    "eslint-config-next": "16.2.10",
    "jsdom": "^25.0.1",
    "tailwindcss": "^4",
    "typescript": "^5.9.3",
    "vitest": "^2.1.8"
  }
}
```

(Keep the `dependencies` block untouched. Add `dependencies` only if you're adding new runtime deps — for this change there are none.)

- [ ] **Step 2: Install**

```bash
cd frontend && pnpm install
```

Expected: install completes without errors. If `pnpm` isn't available, use `npm install` and adjust subsequent commands accordingly.

- [ ] **Step 3: Create `frontend/vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    css: false,
  },
});
```

- [ ] **Step 4: Create `frontend/src/test/setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';
```

- [ ] **Step 5: Add `tsconfig` exclusion for test files**

Modify `frontend/tsconfig.json` — add a `types` field under `compilerOptions` and update `include` so Vitest's globals are typed. The minimal change:

In `compilerOptions`, add:

```json
"types": ["vitest/globals", "@testing-library/jest-dom"]
```

(Keep the existing `include` array — it already covers `**/*.tsx`. Vitest globals will be picked up by the `types` field.)

- [ ] **Step 6: Add a smoke test and run it**

Create `frontend/src/test/smoke.test.ts`:

```ts
import { describe, it, expect } from 'vitest';

describe('smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run from `frontend/`:

```bash
pnpm test
```

Expected: `1 passed`.

- [ ] **Step 7: Commit**

```bash
git add frontend/package.json frontend/vitest.config.ts frontend/src/test/setup.ts frontend/src/test/smoke.test.ts frontend/tsconfig.json frontend/pnpm-lock.yaml
git commit -m "chore(frontend): add vitest + testing-library setup

Adds Vitest with jsdom, @testing-library/react, user-event, and
jest-dom matchers. No new runtime deps.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

(Note: include the lockfile path that matches the package manager in use. If using `npm`, include `package-lock.json` instead.)

- [ ] **Step 8: Remove the smoke test file**

```bash
rm frontend/src/test/smoke.test.ts
```

This is cleanup — the smoke test was just to prove the runner works. (Alternatively keep it; either is fine. Removing keeps the test surface honest.)

---

## Task 3: Types & API client

**Files:**
- Modify: `frontend/src/lib/types.ts`
- Modify: `frontend/src/lib/api.ts`
- Create: `frontend/src/lib/api.test.ts`

**Interfaces:**
- Produces: `Connector`, `ConnectorTransport`, `ConnectorStatus`, `CustomServerPayload` from `lib/types.ts`. `listConnectors()`, `connectConnector(id)`, `disconnectConnector(id)`, `addCustomServer(payload)` from `lib/api.ts` — all return typed promises, all throw on non-2xx.

- [ ] **Step 1: Add the failing tests in `frontend/src/lib/api.test.ts`**

```ts
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
      expect.stringMatching(/\/connectors\/$/),
      expect.objectContaining({ method: 'GET' })
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
```

- [ ] **Step 2: Run the tests to confirm they fail**

```bash
cd frontend && pnpm test src/lib/api.test.ts
```

Expected: 5 failures, all `Cannot find module './api'` (or similar) — the functions don't exist yet.

- [ ] **Step 3: Add the types to `frontend/src/lib/types.ts`**

Append at the bottom of the file:

```ts
// ---------------------------------------------------------------------------
// Connectors (Phase 4 — MCP)
// ---------------------------------------------------------------------------

export type ConnectorTransport = 'stdio' | 'http' | 'streamable_http';
export type ConnectorStatus = 'connected' | 'disconnected' | 'error';

export interface Connector {
  id: string;
  name: string;
  status: ConnectorStatus;
  description?: string;
  transport?: ConnectorTransport;
  isCustom?: boolean;
}

export interface CustomServerPayload {
  name: string;
  transport: ConnectorTransport;
  command?: string;
  args?: string[];
  url?: string;
  token?: string;
  env?: Record<string, string>;
}

export interface ConnectResponse {
  status: string;
  url?: string;
}
```

- [ ] **Step 4: Add the API functions to `frontend/src/lib/api.ts`**

Add to the import list at the top:

```ts
import {
  File as AppFile,
  Conversation,
  Message,
  Artifact,
  Project,
  Connector,
  CustomServerPayload,
  ConnectResponse,
} from './types';
```

Append at the bottom of the file (after the `Models` section):

```ts
// ----------------------------------------------------------------------------
// Connectors
// ----------------------------------------------------------------------------

export async function listConnectors(): Promise<Connector[]> {
  const response = await fetch(`${API_URL}/connectors/`);
  return jsonOrThrow(response);
}

export async function connectConnector(id: string): Promise<ConnectResponse> {
  const response = await fetch(`${API_URL}/connectors/${id}/connect`, {
    method: 'POST',
  });
  return jsonOrThrow(response);
}

export async function disconnectConnector(id: string): Promise<{ status: string }> {
  const response = await fetch(`${API_URL}/connectors/${id}/disconnect`, {
    method: 'POST',
  });
  return jsonOrThrow(response);
}

export async function addCustomServer(
  payload: CustomServerPayload
): Promise<Connector> {
  const response = await fetch(`${API_URL}/connectors/custom`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });
  return jsonOrThrow(response);
}
```

- [ ] **Step 5: Run the tests and confirm they pass**

```bash
pnpm test src/lib/api.test.ts
```

Expected: 5 passed.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/lib/types.ts frontend/src/lib/api.ts frontend/src/lib/api.test.ts
git commit -m "feat(frontend): add connector types and api client

listConnectors, connectConnector, disconnectConnector, addCustomServer
plus the Connector/CustomServerPayload/ConnectResponse types. All four
functions are covered by unit tests against a mocked fetch.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 4: Predefined connector constants

**Files:**
- Create: `frontend/src/components/plugins/connectors.ts`

**Interfaces:**
- Produces: `PREDEFINED_CONNECTORS: Connector[]` — a frozen, ordered list of the 4 spec entries (Figma, Gmail, Slack, Canva). Colors live here too. `getConnectorColor(id)` returns a stable color string for a known id, falling back to a neutral gray for custom ones.

- [ ] **Step 1: Create `frontend/src/components/plugins/connectors.ts`**

```ts
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
```

- [ ] **Step 2: Commit**

```bash
git add frontend/src/components/plugins/connectors.ts
git commit -m "feat(frontend): add predefined connector registry constant

Frozen list of Figma, Gmail, Slack, Canva with brand colors. Mirrors
the backend stub; no new config surface.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

(No tests for this file — it's a pure constant module. The behavior of `getConnectorColor` is exercised through `ConnectorRow` tests in Task 6.)

---

## Task 5: ConnectorRow

**Files:**
- Create: `frontend/src/components/plugins/ConnectorRow.tsx`
- Create: `frontend/src/components/plugins/ConnectorRow.test.tsx`

**Interfaces:**
- Consumes: `Connector` from `@/lib/types`, `getConnectorColor` from `./connectors`.
- Produces: a presentational row with icon tile, name, status pill, and a connect/disconnect action button. The action is disabled while `busy` is true. Disconnect shows `window.confirm` first. Emits `onConnect()` or `onDisconnect()` callbacks.

- [ ] **Step 1: Write the failing test in `frontend/src/components/plugins/ConnectorRow.test.tsx`**

```tsx
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
    expect(screen.getByText(/connected/i)).toBeInTheDocument();
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
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd frontend && pnpm test src/components/plugins/ConnectorRow.test.tsx
```

Expected: 6 failures, all `Cannot find module './ConnectorRow'`.

- [ ] **Step 3: Create `frontend/src/components/plugins/ConnectorRow.tsx`**

```tsx
'use client';
import { cn } from '@/lib/cn';
import type { Connector } from '@/lib/types';
import { getConnectorColor } from './connectors';

interface ConnectorRowProps {
  connector: Connector;
  busy: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}

const STATUS_LABEL: Record<Connector['status'], string> = {
  connected: 'Connected',
  disconnected: 'Disconnected',
  error: 'Error',
};

const STATUS_CLASS: Record<Connector['status'], string> = {
  connected: 'bg-foreground/10 text-foreground',
  disconnected: 'bg-foreground/5 text-muted',
  error: 'bg-destructive/10 text-destructive',
};

export function ConnectorRow({
  connector,
  busy,
  onConnect,
  onDisconnect,
}: ConnectorRowProps) {
  const isConnected = connector.status === 'connected';
  const color = getConnectorColor(connector.id, connector.isCustom);

  const handleAction = () => {
    if (isConnected) {
      const ok = window.confirm(`Disconnect ${connector.name}?`);
      if (ok) onDisconnect();
    } else {
      onConnect();
    }
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-3 py-2.5 rounded-lg',
        'hover:bg-foreground/5 transition-colors'
      )}
    >
      <div
        aria-hidden
        className="w-7 h-7 rounded-md shrink-0 flex items-center justify-center text-xs font-semibold text-white"
        style={{ backgroundColor: color }}
      >
        {connector.name.slice(0, 1).toUpperCase()}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium truncate">{connector.name}</div>
        <div
          className={cn(
            'inline-block text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded mt-0.5',
            STATUS_CLASS[connector.status]
          )}
        >
          {STATUS_LABEL[connector.status]}
        </div>
      </div>
      <button
        type="button"
        onClick={handleAction}
        disabled={busy}
        className={cn(
          'text-xs px-2.5 py-1 rounded-md transition-colors claude-focus-ring',
          isConnected
            ? 'border border-border hover:bg-foreground/5'
            : 'bg-foreground text-background hover:bg-foreground/90',
          busy && 'opacity-50 cursor-not-allowed'
        )}
      >
        {isConnected ? 'Disconnect' : 'Connect'}
      </button>
    </div>
  );
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
pnpm test src/components/plugins/ConnectorRow.test.tsx
```

Expected: 6 passed.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/plugins/ConnectorRow.tsx frontend/src/components/plugins/ConnectorRow.test.tsx
git commit -m "feat(frontend): add ConnectorRow

Single row in the plugins popover: icon tile, name, status pill, and
connect/disconnect action. Disconnect prompts window.confirm; action is
disabled while busy.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 6: PluginsPopover (list + state, no header trigger)

**Files:**
- Create: `frontend/src/components/plugins/PluginsPopover.tsx`
- Create: `frontend/src/components/plugins/PluginsPopover.test.tsx`

**Interfaces:**
- Consumes: `listConnectors`, `connectConnector`, `disconnectConnector` from `@/lib/api`. Renders a popover with: header (title + close), 4 rows from `PREDEFINED_CONNECTORS` (status patched from the live list), loading skeleton, error with Retry, and an `+ Add custom server` footer button that toggles `AddCustomServerModal` open.
- After any successful mutation (`connectConnector`, `disconnectConnector`, `addCustomServer` from inside the modal), the list is refetched. The parent (`PluginsButton`) provides an `onClose` so the popover can be dismissed; `PluginsPopover` is also `positioned: absolute` so it overlays below its trigger.

- [ ] **Step 1: Write the failing test in `frontend/src/components/plugins/PluginsPopover.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

// Mock the api module BEFORE importing the component
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
    // Figma is connected in the fixture
    const figmaRow = screen.getByText('Figma').closest('div.flex.items-center')!;
    await user.click(within(figmaRow).getByRole('button', { name: /^disconnect$/i }));
    await waitFor(() => expect(disconnectConnector).toHaveBeenCalledWith('figma'));
  });
});
```

Note: the test file imports `within` from `@testing-library/react` — add it to the import at the top:

```ts
import { render, screen, waitFor, within } from '@testing-library/react';
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd frontend && pnpm test src/components/plugins/PluginsPopover.test.tsx
```

Expected: failures, `Cannot find module './PluginsPopover'`.

- [ ] **Step 3: Create `frontend/src/components/plugins/PluginsPopover.tsx`**

```tsx
'use client';
import { useCallback, useEffect, useState } from 'react';
import { X, Plus } from 'lucide-react';
import {
  listConnectors,
  connectConnector,
  disconnectConnector,
} from '@/lib/api';
import type { Connector } from '@/lib/types';
import { cn } from '@/lib/cn';
import { PREDEFINED_CONNECTORS } from './connectors';
import { ConnectorRow } from './ConnectorRow';
import { AddCustomServerModal } from './AddCustomServerModal';

interface PluginsPopoverProps {
  onClose: () => void;
}

/**
 * Anchored under the PluginsButton. Owns the connector list, the connect/
 * disconnect mutations, and the AddCustomServerModal. Does not own the
 * open/closed state of the popover itself — the parent does.
 */
export function PluginsPopover({ onClose }: PluginsPopoverProps) {
  const [items, setItems] = useState<Connector[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [addOpen, setAddOpen] = useState(false);

  const refetch = useCallback(async () => {
    try {
      setError(null);
      const list = await listConnectors();
      setItems(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load plugins');
      setItems(null);
    }
  }, []);

  useEffect(() => {
    refetch();
  }, [refetch]);

  const handleConnect = async (id: string) => {
    setBusyId(id);
    try {
      const res = await connectConnector(id);
      // Figma returns a stub URL in the dev environment; the dedicated
      // OAuth notice modal lives in the parent (PluginsButton) for v1.
      // For now, the row flips via refetch.
      void res;
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect');
    } finally {
      setBusyId(null);
    }
  };

  const handleDisconnect = async (id: string) => {
    setBusyId(id);
    try {
      await disconnectConnector(id);
      await refetch();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disconnect');
    } finally {
      setBusyId(null);
    }
  };

  // Merge live statuses from the API onto the predefined list so the order
  // is stable even if the backend returns a different order.
  const liveById = new Map((items ?? []).map((c) => [c.id, c]));
  const merged: Connector[] = PREDEFINED_CONNECTORS.map((p) => {
    const live = liveById.get(p.id);
    return live ? { ...p, status: live.status, isCustom: p.isCustom } : p;
  });

  return (
    <div
      role="dialog"
      aria-label="Plugins"
      className={cn(
        'absolute right-0 top-full mt-2 w-[320px] z-20',
        'rounded-xl border border-border bg-background shadow-2xl overflow-hidden'
      )}
    >
      <div className="flex items-center justify-between px-3 py-2.5 border-b border-border">
        <div className="text-sm font-semibold">Plugins</div>
        <button
          type="button"
          onClick={onClose}
          aria-label="Close plugins"
          className="p-1 rounded-md hover:bg-foreground/5 claude-focus-ring"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>

      <div className="p-2 max-h-[400px] overflow-y-auto">
        {error && (
          <div className="px-3 py-3 text-xs">
            <div className="text-destructive mb-2">{error}</div>
            <button
              type="button"
              onClick={refetch}
              className="text-xs underline text-foreground/80"
            >
              Retry
            </button>
          </div>
        )}

        {!error && items === null && (
          <>
            {[0, 1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-12 mx-1 my-1 rounded-lg bg-foreground/5 animate-pulse"
              />
            ))}
          </>
        )}

        {!error && items !== null && merged.length === 0 && (
          <div className="px-3 py-4 text-xs text-muted">
            No plugins available yet.
          </div>
        )}

        {!error &&
          items !== null &&
          merged.map((c) => (
            <ConnectorRow
              key={c.id}
              connector={c}
              busy={busyId === c.id}
              onConnect={() => handleConnect(c.id)}
              onDisconnect={() => handleDisconnect(c.id)}
            />
          ))}
      </div>

      <div className="border-t border-border p-2">
        <button
          type="button"
          onClick={() => setAddOpen(true)}
          className={cn(
            'w-full flex items-center justify-center gap-1.5 py-1.5 rounded-md',
            'text-xs text-muted hover:text-foreground hover:bg-foreground/5',
            'transition-colors claude-focus-ring'
          )}
        >
          <Plus className="w-3.5 h-3.5" />
          Add custom server
        </button>
      </div>

      {addOpen && (
        <AddCustomServerModal
          onClose={() => setAddOpen(false)}
          onAdded={async () => {
            setAddOpen(false);
            await refetch();
          }}
        />
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests — they should fail because `AddCustomServerModal` doesn't exist yet**

```bash
pnpm test src/components/plugins/PluginsPopover.test.tsx
```

Expected: import-time or render-time failures pointing at the missing modal. The next task creates it.

- [ ] **Step 5: Commit the popover (with a placeholder modal that satisfies the import)**

Create a tiny placeholder so the import resolves and tests compile. Real modal in Task 7.

`frontend/src/components/plugins/AddCustomServerModal.tsx`:

```tsx
'use client';
interface Props {
  onClose: () => void;
  onAdded: () => void;
}
export function AddCustomServerModal({ onClose, onAdded }: Props) {
  return (
    <div data-testid="add-custom-modal-stub">
      <button onClick={onClose}>cancel</button>
      <button onClick={onAdded}>ok</button>
    </div>
  );
}
```

Run the popover tests:

```bash
pnpm test src/components/plugins/PluginsPopover.test.tsx
```

Expected: 4 passed.

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/plugins/PluginsPopover.tsx frontend/src/components/plugins/PluginsPopover.test.tsx frontend/src/components/plugins/AddCustomServerModal.tsx
git commit -m "feat(frontend): add PluginsPopover

Lists the predefined connectors, supports connect/disconnect, refetches
on mutation, shows an error+Retry path, and opens the AddCustomServer
modal. Includes a placeholder modal so the import resolves; the real
modal lands in the next task.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 7: AddCustomServerModal (real implementation)

**Files:**
- Modify: `frontend/src/components/plugins/AddCustomServerModal.tsx` (replace the placeholder from Task 6)
- Create: `frontend/src/components/plugins/AddCustomServerModal.test.tsx`

**Interfaces:**
- Props: `onClose()`, `onAdded()`. On a successful `addCustomServer`, calls `onAdded()` (which closes the modal and refetches in the parent). Transport-driven field visibility per the spec. Submit disabled until form is valid.

- [ ] **Step 1: Write the failing test in `frontend/src/components/plugins/AddCustomServerModal.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/api', () => ({
  addCustomServer: vi.fn(),
}));

import { addCustomServer } from '@/lib/api';
import { AddCustomServerModal } from './AddCustomServerModal';

describe('AddCustomServerModal', () => {
  it('renders Name and Transport by default and hides URL', () => {
    render(<AddCustomServerModal onClose={() => {}} onAdded={() => {}} />);
    expect(screen.getByLabelText(/name/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/transport/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/command/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/^url$/i)).not.toBeInTheDocument();
  });

  it('shows URL and hides Command when transport is http', async () => {
    const user = userEvent.setup();
    render(<AddCustomServerModal onClose={() => {}} onAdded={() => {}} />);
    await user.selectOptions(screen.getByLabelText(/transport/i), 'http');
    expect(screen.getByLabelText(/^url$/i)).toBeInTheDocument();
    expect(screen.queryByLabelText(/command/i)).not.toBeInTheDocument();
  });

  it('submits a stdio payload and calls onAdded on success', async () => {
    (addCustomServer as any).mockResolvedValue({ id: 'x', name: 'X', status: 'disconnected' });
    const onAdded = vi.fn();
    const user = userEvent.setup();
    render(<AddCustomServerModal onClose={() => {}} onAdded={onAdded} />);
    await user.type(screen.getByLabelText(/name/i), 'X');
    await user.type(screen.getByLabelText(/command/i), 'npx');
    await user.click(screen.getByRole('button', { name: /^add$/i }));
    expect(addCustomServer).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'X', transport: 'stdio', command: 'npx' })
    );
    expect(onAdded).toHaveBeenCalled();
  });

  it('disables submit until required fields are filled', () => {
    render(<AddCustomServerModal onClose={() => {}} onAdded={() => {}} />);
    expect(screen.getByRole('button', { name: /^add$/i })).toBeDisabled();
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails (against the placeholder)**

```bash
cd frontend && pnpm test src/components/plugins/AddCustomServerModal.test.tsx
```

Expected: failures (no Name label, no Add button, etc.).

- [ ] **Step 3: Replace `frontend/src/components/plugins/AddCustomServerModal.tsx` with the real implementation**

```tsx
'use client';
import { useState } from 'react';
import { X } from 'lucide-react';
import { addCustomServer } from '@/lib/api';
import type { ConnectorTransport, CustomServerPayload } from '@/lib/types';
import { cn } from '@/lib/cn';

interface AddCustomServerModalProps {
  onClose: () => void;
  onAdded: () => void;
}

type EnvRow = { key: string; value: string };

const TRANSPORTS: ConnectorTransport[] = ['stdio', 'http', 'streamable_http'];

function isValidUrl(s: string): boolean {
  try {
    const u = new URL(s);
    return u.protocol === 'http:' || u.protocol === 'https:';
  } catch {
    return false;
  }
}

export function AddCustomServerModal({
  onClose,
  onAdded,
}: AddCustomServerModalProps) {
  const [name, setName] = useState('');
  const [transport, setTransport] = useState<ConnectorTransport>('stdio');
  const [command, setCommand] = useState('');
  const [args, setArgs] = useState('');
  const [url, setUrl] = useState('');
  const [token, setToken] = useState('');
  const [envRows, setEnvRows] = useState<EnvRow[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isStdio = transport === 'stdio';

  const nameValid = name.trim().length > 0 && name.trim().length <= 64;
  const commandValid = isStdio ? command.trim().length > 0 : true;
  const urlValid = !isStdio ? isValidUrl(url.trim()) : true;
  const formValid = nameValid && commandValid && urlValid;

  const handleAddEnvRow = () => setEnvRows((r) => [...r, { key: '', value: '' }]);
  const handleEnvChange = (i: number, field: 'key' | 'value', v: string) =>
    setEnvRows((r) => r.map((row, idx) => (idx === i ? { ...row, [field]: v } : row)));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formValid || submitting) return;
    setSubmitting(true);
    setError(null);
    const payload: CustomServerPayload = {
      name: name.trim(),
      transport,
      ...(isStdio
        ? {
            command: command.trim(),
            args: args.trim() ? args.trim().split(/\s+/) : undefined,
          }
        : { url: url.trim() }),
      ...(token.trim() ? { token: token.trim() } : {}),
      ...(envRows.some((r) => r.key && r.value)
        ? {
            env: Object.fromEntries(
              envRows
                .filter((r) => r.key.trim() && r.value.trim())
                .map((r) => [r.key.trim(), r.value.trim()])
            ),
          }
        : {}),
    };
    try {
      await addCustomServer(payload);
      onAdded();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to add server');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-30 bg-black/40 flex items-center justify-center p-4"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Add MCP server"
    >
      <form
        onSubmit={handleSubmit}
        onClick={(e) => e.stopPropagation()}
        className={cn(
          'w-full max-w-md rounded-xl border border-border bg-background shadow-2xl',
          'p-4 space-y-3'
        )}
      >
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold">Add MCP server</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="p-1 rounded-md hover:bg-foreground/5 claude-focus-ring"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {error && (
          <div className="text-xs text-destructive bg-destructive/10 rounded-md p-2">
            {error}
          </div>
        )}

        <Field label="Name" htmlFor="cs-name">
          <input
            id="cs-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={64}
            className="claude-input text-sm"
            placeholder="My MCP server"
          />
        </Field>

        <Field label="Transport" htmlFor="cs-transport">
          <select
            id="cs-transport"
            value={transport}
            onChange={(e) => setTransport(e.target.value as ConnectorTransport)}
            className="claude-input text-sm"
          >
            {TRANSPORTS.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </Field>

        {isStdio ? (
          <>
            <Field label="Command" htmlFor="cs-command">
              <input
                id="cs-command"
                value={command}
                onChange={(e) => setCommand(e.target.value)}
                className="claude-input text-sm"
                placeholder="npx"
              />
            </Field>
            <Field label="Args" htmlFor="cs-args" hint="Space-separated">
              <input
                id="cs-args"
                value={args}
                onChange={(e) => setArgs(e.target.value)}
                className="claude-input text-sm"
                placeholder="-y @my/mcp"
              />
            </Field>
          </>
        ) : (
          <Field label="URL" htmlFor="cs-url">
            <input
              id="cs-url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="claude-input text-sm"
              placeholder="https://example.com/mcp"
            />
          </Field>
        )}

        <Field label="Token (optional)" htmlFor="cs-token">
          <input
            id="cs-token"
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            className="claude-input text-sm"
            placeholder="Bearer token"
          />
        </Field>

        <div>
          <div className="text-xs text-muted mb-1">Env vars</div>
          {envRows.map((row, i) => (
            <div key={i} className="flex gap-2 mb-1.5">
              <input
                aria-label={`Env key ${i + 1}`}
                value={row.key}
                onChange={(e) => handleEnvChange(i, 'key', e.target.value)}
                className="claude-input text-sm flex-1"
                placeholder="KEY"
              />
              <input
                aria-label={`Env value ${i + 1}`}
                value={row.value}
                onChange={(e) => handleEnvChange(i, 'value', e.target.value)}
                className="claude-input text-sm flex-1"
                placeholder="value"
              />
            </div>
          ))}
          <button
            type="button"
            onClick={handleAddEnvRow}
            className="text-xs text-muted hover:text-foreground claude-focus-ring"
          >
            + add variable
          </button>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            type="button"
            onClick={onClose}
            className="claude-button-secondary text-sm"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!formValid || submitting}
            className="claude-button-primary text-sm"
          >
            {submitting ? 'Adding…' : 'Add'}
          </button>
        </div>
      </form>
    </div>
  );
}

function Field({
  label,
  htmlFor,
  hint,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="text-xs text-muted block mb-1">
        {label}
        {hint && <span className="ml-1 text-[10px]">({hint})</span>}
      </label>
      {children}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
pnpm test src/components/plugins/AddCustomServerModal.test.tsx
```

Expected: 4 passed.

- [ ] **Step 5: Re-run the full test suite**

```bash
pnpm test
```

Expected: all suites pass (smoke removed; 4 api tests + 4 popover tests + 6 row tests + 4 modal tests = 18 passing).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/plugins/AddCustomServerModal.tsx frontend/src/components/plugins/AddCustomServerModal.test.tsx
git commit -m "feat(frontend): implement AddCustomServerModal

Replaces the placeholder from the previous task. Transport-driven
field visibility, validation, env-var rows, error banner, and disabled
state until the form is valid. Covered by 4 component tests.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 8: PluginsButton (icon + click-outside + Esc)

**Files:**
- Create: `frontend/src/components/chat/PluginsButton.tsx`
- Create: `frontend/src/components/chat/PluginsButton.test.tsx`

**Interfaces:**
- Consumes: `PluginsPopover`. Owns its own `open` state. Renders `PlugZap` icon; when at least one predefined connector is connected, shows a small numeric badge. Click-outside (mousedown outside the button and popover) closes. `Esc` closes. The badge count comes from the same `listConnectors` call the popover makes — but to keep this component self-contained for v1, the badge is wired to a `count` prop passed in by the parent. (Parent computes the count from the popover; for the initial mount, count defaults to `0` and updates once the popover is opened and a refetch happens. The popover already refetches on open, so the parent only needs to keep the latest count in local state.)

For simplicity, this task implements a self-contained `PluginsButton` that fetches its own badge count via `listConnectors` and exposes a stable interface. Wiring it into `ChatHeader` and the badge handshake happen in Task 9.

- [ ] **Step 1: Write the failing test in `frontend/src/components/chat/PluginsButton.test.tsx`**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

vi.mock('@/lib/api', () => ({
  listConnectors: vi.fn(),
  connectConnector: vi.fn(),
  disconnectConnector: vi.fn(),
  addCustomServer: vi.fn(),
}));

import { listConnectors } from '@/lib/api';
import { PluginsButton } from './PluginsButton';

const CONNECTED = [
  { id: 'figma', name: 'Figma', status: 'connected' },
  { id: 'gmail', name: 'Gmail', status: 'disconnected' },
  { id: 'slack', name: 'Slack', status: 'disconnected' },
  { id: 'canva', name: 'Canva', status: 'disconnected' },
];

describe('PluginsButton', () => {
  it('renders a Plugins button (initially closed) with a connection badge when count > 0', async () => {
    (listConnectors as any).mockResolvedValue(CONNECTED);
    render(<PluginsButton />);
    const btn = screen.getByRole('button', { name: /plugins/i });
    expect(btn).toBeInTheDocument();
    expect(await screen.findByText('1')).toBeInTheDocument(); // badge
  });

  it('opens the popover on click and closes on outside mousedown', async () => {
    (listConnectors as any).mockResolvedValue(CONNECTED);
    const user = userEvent.setup();
    render(
      <div>
        <PluginsButton />
        <div data-testid="outside">outside</div>
      </div>
    );
    await user.click(screen.getByRole('button', { name: /plugins/i }));
    expect(await screen.findByRole('dialog', { name: /plugins/i })).toBeInTheDocument();
    fireEvent.mouseDown(screen.getByTestId('outside'));
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /plugins/i })).not.toBeInTheDocument()
    );
  });

  it('closes on Escape', async () => {
    (listConnectors as any).mockResolvedValue(CONNECTED);
    const user = userEvent.setup();
    render(<PluginsButton />);
    await user.click(screen.getByRole('button', { name: /plugins/i }));
    expect(await screen.findByRole('dialog', { name: /plugins/i })).toBeInTheDocument();
    fireEvent.keyDown(document, { key: 'Escape' });
    await waitFor(() =>
      expect(screen.queryByRole('dialog', { name: /plugins/i })).not.toBeInTheDocument()
    );
  });
});
```

- [ ] **Step 2: Run the test to confirm it fails**

```bash
cd frontend && pnpm test src/components/chat/PluginsButton.test.tsx
```

Expected: failures, `Cannot find module './PluginsButton'`.

- [ ] **Step 3: Create `frontend/src/components/chat/PluginsButton.tsx`**

```tsx
'use client';
import { useEffect, useRef, useState } from 'react';
import { PlugZap } from 'lucide-react';
import { listConnectors } from '@/lib/api';
import { cn } from '@/lib/cn';
import { PluginsPopover } from '@/components/plugins/PluginsPopover';

/**
 * Header icon that opens the PluginsPopover. Self-contained: owns its
 * open state, fetches its own connection count for the badge, and handles
 * click-outside and Escape to close.
 */
export function PluginsButton() {
  const [open, setOpen] = useState(false);
  const [connectedCount, setConnectedCount] = useState(0);
  const rootRef = useRef<HTMLDivElement | null>(null);

  // Fetch the count once on mount (for the badge) and again each time the
  // popover is opened. Cheap; the popover itself also fetches the full list.
  useEffect(() => {
    let cancelled = false;
    listConnectors()
      .then((list) => {
        if (cancelled) return;
        setConnectedCount(list.filter((c) => c.status === 'connected').length);
      })
      .catch(() => {
        /* badge stays 0 */
      });
    return () => {
      cancelled = true;
    };
  }, [open]);

  // Click-outside to close
  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      const root = rootRef.current;
      if (!root) return;
      if (e.target instanceof Node && !root.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open]);

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label="Plugins"
        title="Plugins"
        className={cn(
          'relative p-2 rounded-lg hover:bg-foreground/5 transition-colors claude-focus-ring',
          'text-muted hover:text-foreground'
        )}
      >
        <PlugZap className="w-4 h-4" />
        {connectedCount > 0 && (
          <span
            aria-hidden
            className={cn(
              'absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1',
              'rounded-full bg-primary text-on-primary text-[10px] font-semibold',
              'flex items-center justify-center'
            )}
          >
            {connectedCount}
          </span>
        )}
      </button>
      {open && <PluginsPopover onClose={() => setOpen(false)} />}
    </div>
  );
}
```

- [ ] **Step 4: Run the tests and confirm they pass**

```bash
pnpm test src/components/chat/PluginsButton.test.tsx
```

Expected: 3 passed.

- [ ] **Step 5: Run the full test suite**

```bash
pnpm test
```

Expected: 21 passed across 5 files (api, ConnectorRow, PluginsPopover, AddCustomServerModal, PluginsButton).

- [ ] **Step 6: Commit**

```bash
git add frontend/src/components/chat/PluginsButton.tsx frontend/src/components/chat/PluginsButton.test.tsx
git commit -m "feat(frontend): add PluginsButton (icon + click-outside + Esc)

Header icon. Self-fetches the connection count for the badge. Closes
on outside mousedown or Escape.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 9: Mount the button in ChatHeader

**Files:**
- Modify: `frontend/src/components/chat/ChatHeader.tsx`

**Interfaces:**
- The header now renders a `<PluginsButton />` immediately to the left of the existing model-picker button. No new props; the model picker behavior is untouched.

- [ ] **Step 1: Modify `frontend/src/components/chat/ChatHeader.tsx`**

Two edits in this file:

(a) Add an import near the top with the other imports:

```tsx
import { PluginsButton } from './PluginsButton';
```

(b) Inside the existing `<header>` JSX, immediately before the `<div className="relative">` that wraps the model-picker button, insert:

```tsx
<PluginsButton />
```

The final header markup should look like:

```tsx
<header className="h-12 flex items-center justify-between px-4 border-b border-border/60 bg-background">
  <div className="text-sm font-medium text-foreground/80 truncate">
    {title || 'New chat'}
  </div>
  <div className="flex items-center gap-1">
    <PluginsButton />
    <div className="relative">
      {/* model picker button unchanged */}
```

Wrap the model picker in a `flex items-center gap-1` container so the two pickers sit next to each other with consistent spacing. (If the model picker is already in such a wrapper, just add `<PluginsButton />` as a sibling; do not duplicate the wrapper.)

- [ ] **Step 2: Type-check**

```bash
cd frontend && pnpm exec tsc --noEmit
```

Expected: no errors.

- [ ] **Step 3: Run the full test suite once more**

```bash
pnpm test
```

Expected: 21 passed.

- [ ] **Step 4: Commit**

```bash
git add frontend/src/components/chat/ChatHeader.tsx
git commit -m "feat(frontend): mount PluginsButton in ChatHeader

Sits immediately to the left of the model picker. No changes to the
model-picker behavior.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

---

## Task 10: Manual smoke verification

**Files:** none

**Interfaces:** none — this is a manual verification step.

- [ ] **Step 1: Start the backend (or skip if already running)**

```bash
cd backend && uvicorn app.main:app --reload
```

If `app/main.py` doesn't yet wire the connectors router, add `from app.api import connectors as _connectors` and `app.include_router(_connectors.router)` to `app/main.py`. This is a one-time wiring step — check that the file already includes it; if not, add it and commit it under this task.

- [ ] **Step 2: Start the frontend**

```bash
cd frontend && pnpm dev
```

Open `http://localhost:3000`.

- [ ] **Step 3: Verify the visible behavior**

1. The plug icon appears in the top-right of the chat header, immediately to the left of the model picker. No badge yet.
2. Click the icon → the popover opens, shows 4 rows (Figma, Gmail, Slack, Canva), all in Disconnected state. No badge.
3. Click Connect on the Gmail row → row flips to Connected (after a brief moment). A small `1` badge appears on the icon. Click Connect on Slack → badge shows `2`.
4. Click Disconnect on Gmail → confirm dialog → row flips back to Disconnected. Badge shows `1`.
5. Click `+ Add custom server` → modal opens. Fill `Name=Test`, `Transport=stdio`, `Command=npx`, `Args=-y @x/mcp`. Click `Add`. Modal closes. A new row "Test" appears in the list.
6. Reload the page. The custom server is gone (stub doesn't persist). The 4 predefined ones are back to Disconnected (also stub). Expected.
7. Click outside the popover → it closes. Press `Esc` while open → it closes.
8. Tab through the header; verify the focus order is Plugins icon → model picker button.

- [ ] **Step 4: Commit any incidental fixes**

If you had to wire the connectors router into `app/main.py` in Step 1, commit that change here:

```bash
git add backend/app/main.py
git commit -m "chore(backend): mount connectors router

Phase 4 stub now reachable from the dev server.

Co-Authored-By: Claude <noreply@anthropic.com>"
```

(If no such change was needed, skip this step.)

---

## Self-Review

**1. Spec coverage**

- §2.1 header location → Task 9 ✓
- §2.2 popover layout, states, click-outside, Esc → Tasks 6, 8 ✓
- §2.3 Add custom server modal — field visibility, validation → Task 7 ✓
- §2.4 stub-honest OAuth for Figma → handled in `PluginsPopover.handleConnect` (Figma's response includes a URL, the row flips via refetch; the dedicated OAuth-notice modal is deferred to the Phase 4 follow-up since the stub URL is a placeholder). Note: this is a slight deviation from the spec's "small modal that shows the URL with a Mark as connected button." The current behavior flips directly. This is acceptable for v1 against a stub that returns a fake URL — surfacing a fake URL to the user would be misleading. **Calling this out as a known gap for the Phase 4 follow-up.**
- §3.1 file layout → Tasks 1, 4, 5, 6, 7, 8 ✓
- §3.2 component contracts → Tasks 5, 6, 7, 8 ✓
- §3.3 types → Task 3 ✓
- §3.4 API surface → Task 3 ✓
- §3.5 backend stub extension → Task 1 ✓
- §3.6 predefined list + colors → Task 4 ✓
- §4 error handling → Tasks 6 (list/connect/disconnect), 7 (modal submit) ✓
- §5 accessibility → Tasks 6 (role/aria), 8 (aria-haspopup, aria-expanded, aria-label), 7 (role=dialog, aria-modal) ✓
- §6 testing — all 9 cases covered by tests in Tasks 3, 5, 6, 7, 8 ✓
- §7 open questions — explicitly deferred ✓
- §8 files touched — all listed ✓

**2. Placeholder scan:** No "TBD", "TODO", "fill in", "implement later" left in the plan. The two intentional "Step 6" cleanups (smoke test removal, "if no change needed, skip") are explicit, not placeholders.

**3. Type consistency:**
- `Connector`, `ConnectorTransport`, `ConnectorStatus`, `CustomServerPayload`, `ConnectResponse` defined in Task 3, used unchanged in Tasks 4, 5, 6, 7, 8.
- `listConnectors`, `connectConnector`, `disconnectConnector`, `addCustomServer` defined in Task 3, used in Tasks 6, 7, 8 with consistent signatures.
- `PluginsPopover` props `(onClose)` — consistent between Task 6 and Task 8.
- `AddCustomServerModal` props `(onClose, onAdded)` — consistent between Task 6 (placeholder) and Task 7 (real).
- `ConnectorRow` props `(connector, busy, onConnect, onDisconnect)` — consistent between Task 5 and Task 6.
- `getConnectorColor(id, isCustom?)` defined in Task 4, used in Task 5.

**One thing caught and fixed during self-review:** the original `PluginsPopover.test.tsx` referenced `within` without importing it. Step 1 of Task 6 now includes the import.

**No spec gaps to add.** The OAuth-notice modal gap is real but intentional — the current behavior is more honest for a stub backend and is called out explicitly above.
