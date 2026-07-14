# Design: Plugins (MCP Connectors) UI

**Date:** 2026-07-12
**Scope:** UI only. Backend OAuth, token storage, and the real `MultiServerMCPClient` wiring are explicit follow-ups (Phase 4 in `implementation_plan.md`).
**Status:** Approved by user 2026-07-12; ready for implementation plan.

---

## 1. Goal & Non-Goals

**Goal.** Expose the existing `/connectors` API through the chat UI: a plug icon in the chat header opens a popover that lists the predefined MCP servers, lets the user connect/disconnect them, and lets the user add a custom MCP server. This makes Phase 4 (MCP Connectors) visible in the product even before the real OAuth/token plumbing is built.

**Non-goals (this change).**
- Real OAuth redirects, token storage, or refresh — the backend remains the existing stub.
- Editing or removing a custom server from the UI. (Add only; remove is "edit `connectors.yaml` + restart" for v1.)
- Per-connector scopes UI.
- Wiring connected connectors into the agent's tool set.
- The next two picker-style icons in the header — design is intentionally narrow to two pickers today.

---

## 2. UX

### 2.1 Where it lives
The plug icon sits in the top-right of `ChatHeader`, immediately to the left of the model picker. The chat title remains on the left, unchanged.

```
┌────────────────────────────────────────────────┐
│  New chat                  [🔌 ¹]  [Kimi v]    │
└────────────────────────────────────────────────┘
```

The `¹` is a tiny badge showing the count of *connected* servers (omitted when 0).

### 2.2 Popover
Clicking the icon opens a 320px-wide popover anchored under the icon, with the same rounded-card styling as the existing model-picker dropdown.

```
┌──────────────────────────────┐
│ Plugins                  ⨯  │
├──────────────────────────────┤
│ [F]  Figma     ✓ Connected   │
│ [G]  Gmail       Connect     │
│ [S]  Slack       Connect     │
│ [C]  Canva       Connect     │
├──────────────────────────────┤
│ + Add custom server          │
└──────────────────────────────┘
```

States:
- **Loading:** three skeleton rows.
- **Error:** red inline text `"Couldn't load plugins"` + `Retry` button.
- **Empty (no connectors in the registry):** `"No plugins available yet."`

Click-outside or `Esc` closes the popover. Closing does not lose state — the list is refetched each time the popover reopens.

### 2.3 Add custom server modal
Clicking `+ Add custom server` opens a centered modal over the popover.

```
┌────────────────────────────────────┐
│ Add MCP server                ⨯  │
├────────────────────────────────────┤
│ Name      [                ]      │
│ Transport [stdio          ▼]      │
│ Command   [                ]      │
│ Args      [                ]      │
│ URL       [                ]      │
│ Token     [                ]      │
│ Env vars                           │
│   KEY  [        ]  VAL [        ]  │
│   [ + add variable ]               │
│            [Cancel]  [Add]        │
└────────────────────────────────────┘
```

Field visibility is driven by `Transport`:
- `stdio` → show `Command`, `Args`, `Token`, `Env vars`. Hide `URL`.
- `http` / `streamable_http` → show `URL`, `Token`, `Env vars`. Hide `Command`, `Args`.

Validation:
- `Name` required, ≤ 64 chars.
- `Command` required when transport is `stdio`.
- `URL` required and must be `http(s)://…` when transport is `http`/`streamable_http`.
- `Token` optional in both.
- `Env vars` rows: key and value must both be non-empty to count; empty rows are dropped on submit.

Submit is disabled until the form is valid. On success, the modal closes and the popover refetches.

### 2.4 Stub-honest OAuth
The existing backend returns `{ "url": "https://example.com/oauth" }` from `POST /connectors/{id}/connect`. For Figma specifically (the one OAuth-backed connector in the registry), the row's Connect action opens a small modal that shows the returned URL with text:

> **Figma would now open OAuth in a new tab:**
> `https://example.com/oauth`
>
> The real OAuth flow ships in the Phase 4 follow-up. For now, this server is marked as connected.

A "Mark as connected" button in that modal flips the row to Connected without leaving the app. The other predefined servers (Gmail, Slack, Canva) flip to Connected immediately on click — no modal — since the stub doesn't return a URL for them.

This is honest about the stub and still demos the end state of the UI.

---

## 3. Architecture

### 3.1 File layout

```
frontend/src/components/
├── chat/
│   ├── ChatHeader.tsx           MOD  — render <PluginsButton /> to the left of the model picker
│   └── PluginsButton.tsx        NEW  — icon + popover trigger
└── plugins/
    ├── PluginsPopover.tsx       NEW  — list of connectors, hosts the modal
    ├── ConnectorRow.tsx         NEW  — single row (icon, name, status, action)
    └── AddCustomServerModal.tsx NEW  — custom-server form

frontend/src/lib/
├── api.ts                       MOD  — listConnectors / connectConnector / disconnectConnector / addCustomServer
└── types.ts                     MOD  — Connector type
```

**Why a `plugins/` folder, not under `chat/`.** Plugins are a cross-cutting concern (skills, projects, settings will join them later), and the `chat/` folder is already specific to message composition. A sibling folder keeps the model picker, composer, and message list uncluttered.

**Why local state, not the store.** The popover is the only consumer. The chat store has no concept of "connected services" yet, and adding one for a single screen is premature. If a second screen (e.g. a `/connectors` page) needs the same list later, we promote to the store then.

### 3.2 Component contracts

**`PluginsButton`** — presentational, owns `open: boolean` state.
- Props: none.
- Renders the plug icon (with badge) and, when open, `<PluginsPopover />` positioned below the button.
- Adds a `mousedown` listener on `document` that calls `setOpen(false)` when the click is outside both the button and popover refs.
- `keydown` on `Escape` also closes.
- Closes on any successful or failed mutation triggered from inside the popover, *except* opening the Add modal (which stays open over a dimmed popover).

**`PluginsPopover`** — owns the connector list and the open/closed state of the Add modal.
- On mount: `listConnectors()` → set `items`, `loading`, `error`.
- Exposes a `refetch()` for after mutations.
- Renders header, `ConnectorRow[]`, footer with `+ Add custom server` button, and conditionally `AddCustomServerModal`.
- Error → inline message + Retry.

**`ConnectorRow`** — presentational + a couple of callbacks.
- Props: `connector: Connector`, `busy: boolean`, `onConnect()`, `onDisconnect()`.
- Renders: square color-block icon, name, status pill (`Connected` / `Disconnected` / `Error`), action button (`Connect` / `Disconnect`).
- Action button is disabled while `busy` is true.
- Disconnect prompts `window.confirm("Disconnect Figma?")` before firing.

**`AddCustomServerModal`** — controlled form.
- Props: `open: boolean`, `onClose()`, `onSubmit(payload)`.
- Local form state. Transport-driven field visibility. Submit disabled until valid.
- On submit success, calls `onSubmit(payload)`, then `onClose()`.

### 3.3 Types

```ts
// frontend/src/lib/types.ts (additions)
export type ConnectorTransport = 'stdio' | 'http' | 'streamable_http';
export type ConnectorStatus = 'connected' | 'disconnected' | 'error';

export interface Connector {
  id: string;
  name: string;
  status: ConnectorStatus;
  description?: string;
  transport?: ConnectorTransport;
  /** True for entries the user added via the UI (not from connectors.yaml). */
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
```

### 3.4 API surface (frontend ↔ backend)

The existing stub already exposes the right shape; we add one endpoint for the custom-server flow.

| Function in `api.ts` | Backend path | Notes |
|---|---|---|
| `listConnectors()` | `GET /connectors/` | Returns `Connector[]` |
| `connectConnector(id)` | `POST /connectors/{id}/connect` | Stub returns `{ url?: string }` |
| `disconnectConnector(id)` | `POST /connectors/{id}/disconnect` | Stub returns `{ status: "success" }` |
| `addCustomServer(payload)` | `POST /connectors/custom` | **New endpoint** — stub returns `{ id, ...payload, status: "disconnected" }` |

For the stub-honest Figma flow, the frontend checks if the connect response includes a `url`; if so it shows the OAuth-notice modal, otherwise it flips the row to Connected immediately.

### 3.5 Backend changes
None in this change. The new `POST /connectors/custom` endpoint is added to the **stub** (the `connectors.py` file in this repo) so the frontend can be developed against a real round-trip, but no real persistence happens — the stub returns a synthetic connector with a UUID id. Real wiring (`connectors.yaml` parsing, SQLite, Fernet-encrypted tokens) is the Phase 4 follow-up.

### 3.6 Predefined connector list
The frontend hardcodes the four expected names (Figma, Gmail, Slack, Canva) for v1, with stable display colors. The backend stub is updated to return all four (currently returns only Figma) so the popover shows a realistic list. The order is the same as the existing `connectors.yaml` ordering convention (Figma first).

| ID | Name | Color | Notes |
|---|---|---|---|
| `figma` | Figma | `#1ABCFE` | The only OAuth-backed one; the stub returns a URL for it. |
| `gmail` | Gmail | `#EA4335` | |
| `slack` | Slack | `#4A154B` | |
| `canva` | Canva | `#7D2AE8` | |

Custom servers get a neutral gray icon.

---

## 4. Error handling

| Failure | Surface |
|---|---|
| `listConnectors` rejects | Inline red text in popover + Retry button |
| `connectConnector` rejects | Inline error under the row, status flips to `error` for that row |
| `disconnectConnector` rejects | Inline error under the row, status remains `connected` |
| `addCustomServer` rejects | Banner at top of modal; modal stays open with the form intact |
| User clicks outside the popover | Popover closes; no data loss (form state is local to the popover, not preserved across opens — by design, "open = fresh") |
| Two popovers open at once (model picker + plugins) | Either's click-outside listener closes its own popover. Model picker is untouched, so this works automatically. |

---

## 5. Accessibility

- `PluginsButton` is a real `<button>` with `aria-haspopup="dialog"`, `aria-expanded`, `aria-label="Plugins"`.
- `PluginsPopover` has `role="dialog"` and `aria-label="Plugins"`.
- Focus management: opening moves focus to the first interactive element inside; `Esc` closes and returns focus to the button.
- The Add modal uses the same pattern (focus trap is out of scope for v1; we use `role="dialog"` + `aria-modal="true"` + `Esc` to close).
- Status pills use both color and text (no color-only signaling).
- All interactive elements have visible focus rings (reuses the existing `claude-focus-ring` utility).

---

## 6. Testing

Component tests with `@testing-library/react` (added as a dev dep if not present):

1. `PluginsPopover` renders 4 rows from a mocked list (1 connected, 3 disconnected) with correct action labels.
2. Clicking Connect on a disconnected row calls `connectConnector(id)`; on a successful resolve, the row flips to Connected.
3. Clicking Disconnect on a connected row triggers `window.confirm`; confirming calls `disconnectConnector(id)`; on resolve, the row flips to Disconnected.
4. Opening `AddCustomServerModal` from the popover, submitting a valid `stdio` form calls `addCustomServer` with the expected payload and closes the modal.
5. `AddCustomServerModal` shows/hides `Command` vs `URL` based on `Transport` selection.
6. `PluginsButton` closes its popover on a `mousedown` outside both the button and popover.
7. `Esc` closes the popover.
8. List error path: `listConnectors` rejects → red error text + Retry button visible; clicking Retry re-fetches.
9. Connect error path: `connectConnector` rejects → red text under the affected row.

Manual verification:
1. Open the dev server, click the plug icon → popover opens with 4 rows.
2. Click Connect on Figma → OAuth-notice modal appears; click "Mark as connected" → row flips.
3. Click `+ Add custom server` → modal opens; fill `Name=Test`, `Transport=stdio`, `Command=npx`, `Args=-y @x/mcp`; submit → modal closes, new row appears in the list.
4. Reload the page → custom server is gone (stub doesn't persist). Expected.
5. Tab through the header; verify focus order is Plugins → Model picker.

---

## 7. Open questions / Follow-ups

- **Real OAuth + token storage.** Phase 4. The stub-honest flow in §2.4 keeps the UI demoable in the meantime.
- **Edit / remove custom servers from the UI.** Add a "Manage" link in the popover footer that opens a per-server settings sheet. Deferred.
- **Per-connector scopes UI.** Deferred to Phase 4.
- **Auto-refetch on global events.** Today the popover refetches on open and after a mutation. If connectors can be added/removed from another tab or via the agent itself, we'll need an event channel. Out of scope for v1.
- **Real icon set.** Color blocks are placeholders. Replace with brand SVGs when we have a use for them.

---

## 8. Files touched (summary)

**New:**
- `frontend/src/components/chat/PluginsButton.tsx`
- `frontend/src/components/plugins/PluginsPopover.tsx`
- `frontend/src/components/plugins/ConnectorRow.tsx`
- `frontend/src/components/plugins/AddCustomServerModal.tsx`
- `docs/superpowers/specs/2026-07-12-plugins-connector-ui-design.md` (this file)

**Modified:**
- `frontend/src/components/chat/ChatHeader.tsx` — render `<PluginsButton />` to the left of the model picker
- `frontend/src/lib/api.ts` — add 4 connector functions
- `frontend/src/lib/types.ts` — add `Connector`, `ConnectorTransport`, `ConnectorStatus`, `CustomServerPayload`
- `backend/app/api/connectors.py` — extend the stub to list 4 servers and accept `POST /connectors/custom`

**Untouched (explicitly):**
- Model picker
- Composer
- Chat store
- `connectors.yaml` (the real wiring is Phase 4)
